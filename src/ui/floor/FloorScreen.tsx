// The Floor on screen (round 39): the last six minutes of a game that can end his team's series,
// played on a high three-quarter court (owner: "I actually want a high three quarter view", "can we
// go pseudo 3d?"). The engine (engine/floor/sim.ts) ticks twenty times a real second; between ticks
// the screen slides everyone along, so the picture moves at the screen's own rate. He is steered
// with the keyboard on both ends (owner: "defence too"); the score bug sits above the court, his own
// strip (stamina, fouls, momentum) below it. Step 2 (controls and feel): the pass he aims, the open
// man (seen sooner the higher his Basketball IQ), the man he guards, tags for his moves, screens,
// switches and help, and free throws on his touch. Step 3 (animation): a frame for each part of a
// play, in steps, and the close-up after a big play (owner: "after a play is determined ... a short
// 2~3 second animation plays of the player pulling up, and the ball swishing in"), on the action cam.

import { useEffect, useRef, useState } from 'react';
import { FLOOR } from '../../engine/balance';
import { COURT, RIM_Y, zoneOf } from '../../engine/floor/court';
import { floorHash, floorResult, freshEvents, isOpen, meterWindow, mirrorFloor, openMan, ratingK, releaseQuality, skipFloor, startFloor, stepFloor, type FloorEvent, type FloorInput, type FloorSetup, type FloorState } from '../../engine/floor/sim';
import type { DramaPlay } from '../../engine/story/drama';
import type { Kit } from '../../content/teamStyle';
import { lookOf, shoeOf, type KitName } from '../art/Player';
import type { Look } from '../art/sprite';
import { ActionCam } from '../art/ActionCam';
import { ink } from '../art/color';
import { t, tx } from '../../i18n';
import { setSfx, sfx, soundSettings } from '../sound';
import { announce, announcerOn, setAnnouncer } from '../announcer';
import { Backdrop, CAM_RANGE, VIEW, drawBasket, drawFrontRow, drawShadow, pixel, project, type ArenaLook } from './view';
import { MID_X, SpriteBook, type Frame } from './sprites';
import type { NetGame } from './net';
import { Bench, BoxScore } from './BoxScore';

export interface FloorTeamLook {
  kit: Kit;
  which: KitName;
}

type FloorOutcome = ReturnType<typeof floorResult>;

interface Props {
  setup: FloorSetup;
  /** His team's arena colours. */
  arena: ArenaLook;
  looks: [FloorTeamLook, FloorTeamLook];
  /** The series so far, as the score bug shows it ("3–3"). */
  series?: string;
  onAgain?: () => void;
  onDone: (r: FloorOutcome) => void;
  /** Against a friend online (round 39): the game's keys both ways, the friend's name, and what
   * leaving does. Team 1's friend sees the game turned round, his team on the left of the bug. */
  net?: { link: NetGame; friend: string; onLeave: () => void };
  /** The end card's title for a loss (a career's playoff game: the season is over). */
  lose?: string;
}

const KEY = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  a: ['KeyJ'],
  b: ['KeyK'],
  c: ['KeyL'],
  d: ['Space'],
  e: ['KeyU'],
  f: ['KeyI'],
  timeout: ['KeyT'],
} as const;
type KeyName = keyof typeof KEY;
const GAME_KEYS = new Set<string>(Object.values(KEY).flat());

const PACE = FLOOR.ticksPerSec;
/** Against a friend: the most real time one frame may make up (seconds). */
const NET_CATCH = 1;
/** The announcer waits at least this long between calls (ms). */
const CALL_GAP = 3500;
/** How long the action keys rest after the ball changes hands (ms). */
const LOCK_MS = 350;
/** The close-up's length (ms): the action cam's play, and a beat to see it land. */
const CLOSE_MS = 2300;
/** Against a friend: a correction to where a player stands slides in over about this long (seconds),
 * and one larger than this many feet is shown at once (he was somewhere else entirely). */
const SLIDE_S = 0.07;
const SLIDE_MAX = 10;
/** How long each move's frames last (ms). */
const ACT_MS = { cross: 300, spin: 400, step: 300, reach: 260, land: 220, cheer: 650 } as const;
type Act = keyof typeof ACT_MS;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const last = (name: string) => name.split(' ').slice(-1)[0];

const clockText = (c: number) => (c >= 60 ? `${Math.floor(c / 60)}:${String(Math.floor(c % 60)).padStart(2, '0')}` : Math.max(0, c).toFixed(1));
const QUARTER_NAME = [tx('1st'), tx('2nd'), tx('3rd'), tx('4th')];
const periodText = (s: FloorState) => (s.periods === 0 ? t(QUARTER_NAME[Math.min(4, Math.max(1, s.quarter)) - 1]) : s.periods === 1 ? t('OT') : t('OT{n}', { n: s.periods }));

interface Hud {
  score: [number, number];
  clock: string;
  shot: string | null;
  period: string;
  fouls: [number, number];
  timeouts: [number, number];
  poss: 0 | 1;
  /** His legs, his fouls, and the game's momentum, in tenths (so the strip draws again only on a change). */
  legs: number;
  mine: number;
  mo: number;
  /** His free throw is up. */
  line: boolean;
}
const hudOf = (s: FloorState): Hud => {
  const u = s.players[s.user];
  return {
    score: [...s.score] as [number, number],
    clock: clockText(s.clock),
    // the shot clock is off once the quarter has less left than it does (the game clock may run faster: s.rate)
    shot: s.phase === 'live' && s.shot < s.clock / s.rate ? String(Math.max(0, Math.ceil(s.shot))) : null,
    period: periodText(s),
    fouls: [...s.teamFouls] as [number, number],
    timeouts: [...s.timeouts] as [number, number],
    poss: s.poss,
    legs: Math.round(u.stamina * 10),
    mine: u.fouls,
    mo: Math.round(s.momentum * 10),
    line: s.phase === 'ft' && s.ft?.by === s.user,
  };
};

/** The words over the court after a play (round 28's big pixel words, in the player's language). */
function wordFor(s: FloorState, e: FloorEvent): string | null {
  switch (e.kind) {
    case 'make':
      return e.and ? t('And one') : e.dunk ? t('Dunk') : e.hook ? t('Hook shot') : `+${e.pts}`;
    case 'quarter':
      return e.q === 2 ? t('Half time') : t('End of the {q}', { q: t(QUARTER_NAME[(e.q ?? 1) - 1]) });
    case 'break':
      return t('Fast break');
    case 'charge':
      return t('Charge');
    case 'call':
      return e.call === 'iso' ? t('Isolation') : e.call === 'give' ? t('Give and go') : t('Double team');
    case 'block':
      return t('Blocked');
    case 'steal':
      return t('Steal');
    case 'turnover':
      return t('Turnover');
    case 'shotclock':
      return t('Shot clock');
    case 'timeout':
      return t('Timeout');
    case 'overtime':
      return t('Overtime');
    case 'out':
      return t('{name} fouls out', { name: last(s.players[e.by!].name) });
    case 'ft':
      return e.good ? '+1' : null;
    case 'end':
      return t('Final');
    default:
      return null;
  }
}

/** The small tags over a player after something smaller: his moves, a screen, a switch, the help, a foul. */
function tagFor(e: FloorEvent): { text: string; at: number } | null {
  switch (e.kind) {
    case 'beat':
      return { text: e.move === 'spin' ? t('Spun past him') : e.move === 'step' ? t('Step-back') : e.move === 'drop' ? t('Drop step') : t('Crossed up'), at: e.on! };
    case 'post':
      return { text: t('Posting up'), at: e.by! };
    case 'sub':
      return { text: t('Coming on'), at: e.by! };
    case 'screen':
      return { text: t('Screen'), at: e.by! };
    case 'switch':
      return { text: t('Switch'), at: e.on! };
    case 'help':
      return { text: t('Help'), at: e.by! };
    case 'foul':
      return { text: t('Foul'), at: e.by! };
    default:
      return null;
  }
}

/** The pass he aims with the arrows: the teammate most in that direction, else the open man. */
function aimPass(s: FloorState, dx: number, dy: number): number | 'auto' {
  const u = s.players[s.user];
  const len = Math.hypot(dx, dy);
  if (len < 0.1) return 'auto';
  let best = -1;
  let bc = 0.35;
  s.players.forEach((q, i) => {
    if (i === s.user || !q.on || q.team !== u.team) return;
    const vx = q.x - u.x;
    const vy = q.y - u.y;
    const c = (vx * dx + vy * dy) / ((Math.hypot(vx, vy) || 1) * len);
    if (c > bc) {
      bc = c;
      best = i;
    }
  });
  return best >= 0 ? best : 'auto';
}

/** The close-up's play, in the words the action cam acts out (art/ActionCam.tsx). */
function closeUpOf(s: FloorState, e: FloorEvent, before: [number, number]): { play: DramaPlay; winner: 'us' | 'them' } | null {
  const me = s.user;
  const name = (i: number) => last(s.players[i].name);
  const side = e.team === 0 ? 'us' : 'them';
  if (e.kind === 'block' && (e.by === me || e.on === me)) {
    const text = e.on === me ? `${name(e.by!)} blocks your layup! A game-changing block.` : `${name(e.by!)} blocks ${name(e.on!)}'s layup! A game-changing block.`;
    return { play: { clock: clockText(s.clock), side: 'none', pts: 0, text, tag: 'BLOCK', mine: e.by === me }, winner: side };
  }
  if (e.kind !== 'make') return null;
  const lead = (x: [number, number], team: 0 | 1) => x[team] - x[team === 0 ? 1 : 0];
  const late = s.clock <= 60;
  const goAhead = late && lead(before, e.team) <= 0 && lead(s.score, e.team) > 0;
  const ties = late && lead(before, e.team) < 0 && lead(s.score, e.team) === 0;
  const buzzer = s.clock <= 1;
  const his = e.by === me && (e.pts === 3 || !!e.dunk);
  if (!his && !goAhead && !ties && !buzzer) return null;
  const verb = e.dunk ? 'throws it down' : e.pts === 3 ? 'pulls up from deep' : e.zone === 'mid' ? 'hits the turnaround' : e.zone === 'paint' ? 'hits the floater' : 'drives and scores';
  const tag = buzzer && (goAhead || ties) ? 'BUZZER' : goAhead ? 'LEAD' : ties ? 'TIE' : '';
  return { play: { clock: clockText(s.clock), side, pts: e.pts ?? 2, text: `${name(e.by!)} ${verb}`, tag, mine: e.by === me }, winner: side };
}

/** Step 4: the court's sounds for what just happened, and the announcer's call for his team's big
 * plays (the calls the rest of the game already makes, ui/announcer.ts). */
function hear(s: FloorState, e: FloorEvent, before: [number, number]): string | null {
  const ours = e.team === 0;
  const lead = (x: [number, number]) => x[e.team] - x[e.team === 0 ? 1 : 0];
  switch (e.kind) {
    case 'make': {
      sfx(e.dunk ? 'slam' : e.zone === 'rim' ? 'rimin' : 'swish');
      const swing = lead(before) <= 0 && lead(s.score) >= 0;
      if (e.pts === 3 || e.dunk || e.and || (s.clock <= 60 && swing)) sfx('roar');
      if (!ours) return null;
      if (s.clock <= 3 && swing) return 'Buzzer beater!';
      if (e.and) return 'And one!';
      if (e.dunk) return 'Slam dunk!';
      return e.pts === 3 ? 'From downtown!' : null;
    }
    case 'miss':
      sfx(e.zone === 'three' ? 'brick' : 'rim');
      return null;
    case 'block':
      sfx('block');
      if (!ours) return null;
      sfx('roar');
      return s.clock <= 10 ? 'What a stop!' : 'Rejected!';
    case 'steal':
      sfx('squeak');
      return ours ? (s.clock <= 10 ? 'What a stop!' : 'Stolen!') : null;
    case 'beat':
      sfx('squeak');
      return null;
    case 'foul':
    case 'turnover':
    case 'out':
    case 'sub':
      sfx('whistle');
      return null;
    case 'charge':
      sfx('whistle');
      if (ours) sfx('roar');
      return ours ? 'He took the charge!' : null;
    case 'break':
      return ours ? 'Fast break!' : null;
    case 'ft':
      sfx(e.good ? 'net' : 'rim');
      return null;
    case 'timeout':
    case 'shotclock':
    case 'overtime':
    case 'quarter':
    case 'end':
      sfx('buzzer');
      return null;
    default:
      return null;
  }
}

/** A bar of ten pixel squares (his legs). */
function Legs({ n }: { n: number }) {
  return (
    <span className="floor-legs" role="meter" aria-valuemin={0} aria-valuemax={10} aria-valuenow={n} aria-label={t('Stamina')}>
      {Array.from({ length: 10 }, (_, k) => (
        <i key={k} className={k < n ? (n <= 3 ? 'on low' : 'on') : ''} />
      ))}
    </span>
  );
}

/** The momentum bar: his team's colour filling right from the middle, theirs left. */
function Momentum({ mo, us, them }: { mo: number; us: string; them: string }) {
  return (
    <span className="floor-mo" role="meter" aria-valuemin={-10} aria-valuemax={10} aria-valuenow={mo} aria-label={t('Momentum')}>
      {Array.from({ length: 20 }, (_, k) => {
        const v = k - 10;
        const on = mo > 0 ? v >= 0 && v < mo : mo < 0 ? v < 0 && v >= mo : false;
        return <i key={k} style={on ? { background: v >= 0 ? us : them } : undefined} className={on ? 'on' : ''} />;
      })}
    </span>
  );
}

interface Tag {
  id: number;
  text: string;
  x: number;
  y: number;
  us: boolean;
}

export function FloorScreen({ setup: given, arena, looks: givenLooks, series, onAgain, onDone, net, lose }: Props) {
  const link = net?.link ?? null;
  const flip = link?.side === 1;
  // what this screen shows: his own team first (the friend's, against a friend on team 1)
  const setup = flip ? { ...given, us: given.them, them: given.us } : given;
  const looks: [FloorTeamLook, FloorTeamLook] = flip ? [givenLooks[1], givenLooks[0]] : givenLooks;
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2);
  const [hud, setHud] = useState<Hud>(() => {
    const s0 = startFloor(given);
    return hudOf(flip ? mirrorFloor(s0) : s0);
  });
  // against a friend: his keys are late (waiting), or he is gone
  const [wait, setWait] = useState<'' | 'late' | 'gone'>('');
  // against a friend: which line the keys take and how long the trip there and back is
  const [line, setLine] = useState<{ direct: boolean; ms: number | null } | null>(null);
  const [word, setWord] = useState<{ text: string; team: 0 | 1; id: number } | null>(null);
  // after the first play (owner: "it's a bit hard to know if we scored or not. make the number
  // appear larger"): the points a basket brings, big over the court
  const [pop, setPop] = useState<{ pts: number; team: 0 | 1; id: number } | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [close, setClose] = useState<{ id: number; play: DramaPlay; winner: 'us' | 'them' } | null>(null);
  const [paused, setPaused] = useState(false);
  // step 4: the sound and the announcer, switched in the pause menu as in Settings
  const [snd, setSnd] = useState(soundSettings);
  const [voice, setVoice] = useState(announcerOn);
  const [over, setOver] = useState<FloorOutcome | null>(null);
  const pausedRef = useRef(false);
  const closeRef = useRef(false);
  const game = useRef<FloorState | null>(null);
  const skip = useRef(false);
  const callTimeout = useRef(false);
  // a substitution picked in the pause menu, sent with his next keys
  const askSub = useRef<{ out: number; in: number } | null>(null);

  // the biggest whole-number scale the page has room for
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    // the room left for the court: the window's height less everything above and below it
    const fit = () => {
      const parts = [...el.children] as HTMLElement[];
      const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
      const around = parts.filter((c) => !c.classList.contains('floor-stage')).reduce((h, c) => h + c.offsetHeight, 0) + gap * (parts.length - 1);
      const room = window.innerHeight - Math.max(0, el.getBoundingClientRect().top + window.scrollY) - around - 4;
      setScale(clamp(Math.floor(Math.min(el.clientWidth / VIEW.w, room / VIEW.h)), 1, 4));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    closeRef.current = !!close;
    if (!close) return;
    const id = window.setTimeout(() => setClose(null), CLOSE_MS);
    return () => clearTimeout(id);
  }, [close]);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    // the game itself, and the one this screen reads: the same, or (team 1 against a friend) turned round
    // (against a friend the link holds it: the game on screen is played again from the one both agree on)
    let real = link ? link.now : startFloor(given);
    let s = flip ? mirrorFloor(real) : real;
    const look = () => {
      s = flip ? mirrorFloor(real) : real;
      game.current = s;
      // the dev server lets a test script read the game it is playing
      if (import.meta.env.DEV) (window as unknown as { __floor?: FloorState }).__floor = real;
    };
    look();
    const back = new Backdrop(ctx, arena);
    const book = new SpriteBook();
    const lookFor: Look[] = s.players.map((p) => lookOf(p.name, shoeOf(looks[p.team].kit, looks[p.team].which)));
    const prev = s.players.map((p) => ({ x: p.x, y: p.y }));
    const face = s.players.map((p) => (p.team === 0 ? 1 : -1));
    const stride = s.players.map(() => 0);
    // what each player is in the middle of (a move, a reach, a landing) and since when (real ms)
    const act: ({ kind: Act; t0: number } | null)[] = s.players.map(() => null);
    // how many ticks each teammate has stood open: the open man's mark shows once it is long enough
    const openFor = s.players.map(() => 0);
    const seeOpen = Math.round(lerp(1.4, 0.2, ratingK(s.players[s.user].r.IQ)) / FLOOR.tick);
    const held = new Set<string>();
    const pressed = new Set<string>();
    // after the ball changes hands the action keys rest a moment, and one still held from the other
    // end must be pressed again (owner: "after a steal, oftentimes i end up shooting the ball right
    // away from half court")
    const stale = new Set<string>();
    let lockUntil = 0;
    let lastPoss = s.poss;
    const ACTION = new Set<string>([...KEY.a, ...KEY.b, ...KEY.c, ...KEY.d]);
    const live = (c: string) => !ACTION.has(c) || (!stale.has(c) && performance.now() >= lockUntil);
    const on = (k: KeyName) => KEY[k].some((c) => held.has(c) && live(c));
    const hit = (k: KeyName) => KEY[k].some((c) => pressed.has(c) && live(c));
    /** He has the ball at the rim: one tap lays it in or dunks it. */
    const atRim = () => s.ball.holder === s.user && s.poss === 0 && s.phase === 'live' && zoneOf(0, s.players[s.user]) === 'rim';
    // his shot, timed by the screen to the millisecond: when the key went down, and the hold to send
    let shootFrom: number | null = null;
    let release: number | null = null;
    let flash: { q: number; until: number } | null = null;
    let cam = clamp(s.ball.x, CAM_RANGE[0], CAM_RANGE[1]);
    let acc = 0;
    let lastT = performance.now();
    let raf = 0;
    let lastHud = '';
    let tagId = 0;
    let lastCall = 0;
    let prevHolder = s.ball.holder;
    let lastSec = Math.ceil(s.clock);
    const gameSecs = (ms: number) => (ms / 1000) * FLOOR.tick * PACE;

    const shooting = () => {
      const mine = s.ball.holder === s.user && s.poss === 0;
      const ft = s.phase === 'ft' && s.ft?.by === s.user;
      return mine || ft;
    };

    const inputFor = (): FloorInput => {
      if (s.poss !== lastPoss) {
        lastPoss = s.poss;
        lockUntil = performance.now() + LOCK_MS;
        for (const c of held) if (ACTION.has(c)) stale.add(c);
        shootFrom = null;
        release = null;
      }
      const dx = (on('right') ? 1 : 0) - (on('left') ? 1 : 0);
      const dy = (on('down') ? 1 : 0) - (on('up') ? 1 : 0);
      const inp: FloorInput = { dx, dy, sprint: on('sprint') };
      const mine = s.ball.holder === s.user;
      if (s.poss === 0 || s.phase === 'ft') {
        if (hit('a') && atRim() && s.load < 0) {
          inp.finish = true;
          shootFrom = null;
          release = null;
        } else if (shooting()) {
          if (on('a')) {
            inp.shoot = true;
            if (shootFrom === null) shootFrom = performance.now();
          } else if (release !== null) {
            // a tap shorter than a tick still loads first, then lets go on the next one
            if (s.load < 0) inp.shoot = true;
            else {
              inp.load = release;
              flash = { q: releaseQuality(s, s.players[s.user], release), until: performance.now() + 700 };
              if (flash.q >= 0.95) sfx('perfect');
              else if (flash.q <= 0) sfx('nope');
              release = null;
            }
          }
        } else release = null;
        if (hit('b')) inp.pass = mine ? aimPass(s, dx, dy) : 'auto';
        if (hit('c') && mine) {
          // in the paint with no direction held it is the hook (round 42)
          const me = s.players[s.user];
          const post = dx === 0 && dy === 0 && zoneOf(0, me) === 'paint';
          inp.move = post ? 'hook' : dx * face[s.user] < 0 ? 'step' : dy !== 0 ? 'spin' : 'cross';
          // the move plays whether it beats his man or not
          if (inp.move !== 'hook') act[s.user] = { kind: inp.move, t0: performance.now() };
        }
        if (hit('d')) inp.pick = true;
        // the calls (round 42): one key each
        if (hit('e') && mine) inp.call = 'iso';
        if (hit('f') && mine) {
          inp.call = 'give';
          inp.pass = aimPass(s, dx, dy);
        }
      } else {
        release = null;
        if (hit('a')) inp.steal = true;
        if (hit('b')) inp.block = true;
        if (hit('c')) inp.swap = true;
        if (hit('d')) inp.help = true;
        if (hit('e')) inp.call = 'double';
      }
      if (askSub.current) {
        inp.sub = askSub.current;
        askSub.current = null;
      }
      if (hit('timeout') || callTimeout.current) inp.timeout = true;
      callTimeout.current = false;
      pressed.clear();
      return inp;
    };

    const tagAt = (i: number, text: string) => {
      const p = s.players[i];
      const pt = project(cam, p.x, p.y);
      const tag = { id: ++tagId, text, x: Math.round(pt.x), y: Math.round(pt.y) - 40, us: p.team === 0 };
      setTags((ts) => [...ts.slice(-3), tag]);
      window.setTimeout(() => setTags((ts) => ts.filter((x) => x.id !== tag.id)), 900);
    };

    /** What a tick set off, said and shown: `v` is the game it happened in (the one on screen; against
     * a friend, the one both computers agree on, so nothing said is ever taken back). */
    const onEvents = (evs: FloorEvent[], before: [number, number], v: FloorState = s) => {
      const now = performance.now();
      for (const e of evs) {
        const call = hear(v, e, before);
        if (call && now - lastCall > CALL_GAP) {
          lastCall = now;
          announce(call);
        }
        if ((e.kind === 'make' && e.pts) || (e.kind === 'ft' && e.good)) setPop({ pts: e.kind === 'ft' ? 1 : e.pts!, team: e.team, id: now + Math.random() });
        const w = wordFor(v, e);
        if (w) setWord({ text: w, team: e.kind === 'turnover' || e.kind === 'shotclock' ? (e.team === 0 ? 1 : 0) : e.team, id: now + Math.random() });
        const tg = tagFor(e);
        if (tg) tagAt(tg.at, tg.text);
        // the frames a play sets off
        if ((e.kind === 'reach' || e.kind === 'steal') && e.by !== undefined) act[e.by] = { kind: 'reach', t0: now };
        if ((e.kind === 'make' || e.kind === 'miss') && e.by !== undefined) act[e.by] = { kind: e.kind === 'make' && e.by === v.user ? 'cheer' : 'land', t0: now };
        // no close-ups against a friend: one would stop this screen and the other would wait for it
        const cu = link ? null : closeUpOf(v, e, before);
        if (cu && !closeRef.current) {
          closeRef.current = true;
          setClose({ id: now, ...cu });
        }
      }
    };

    const finish = () => {
      setHud(hudOf(s));
      setOver(floorResult(s));
    };
    // a key's direction on the court: turned round for team 1 against a friend
    const toReal = (inp: FloorInput): FloorInput => (flip && inp.dx ? { ...inp, dx: -inp.dx } : inp);
    let lateSince: number | null = null;
    let waitShown: '' | 'late' | 'gone' = '';
    if (link && import.meta.env.DEV) (window as unknown as { __floorNet?: NetGame }).__floorNet = link;
    // against a friend: how far each player is drawn from where the game now has him. When the
    // friend's real keys come in and his man turns out to be somewhere else, the picture slides
    // there over a few frames instead of jumping.
    const slide = s.players.map(() => ({ x: 0, y: 0 }));
    /** What every new tick on screen brings, whoever played it. */
    const afterTick = () => {
      s.players.forEach((p, i) => (openFor[i] = p.team === 0 && p.on && isOpen(s, i) ? openFor[i] + 1 : 0));
      // the dribble as the ball comes to him, the clock's last seconds in a close one
      if (s.ball.holder === s.user && prevHolder !== s.user && s.poss === 0 && s.phase === 'live') sfx('bounce');
      prevHolder = s.ball.holder;
      const sec = Math.ceil(s.clock / s.rate);
      if (sec !== lastSec && s.quarter >= 4 && s.clock <= 5 * s.rate && s.phase === 'live' && Math.abs(s.score[0] - s.score[1]) <= 3) sfx('tick');
      lastSec = sec;
    };
    /** Against a friend: this screen's ticks that are due, then both games brought up to date. */
    const netFrame = (now: number, tl: number) => {
      const net = link!;
      while (acc >= tl && !net.over) {
        // his keys count at once; the screen waits only when the friend has gone quiet
        if (!net.step(() => toReal(inputFor()))) {
          lateSince ??= now;
          acc = Math.min(acc, tl * 2);
          break;
        }
        lateSince = null;
        acc -= tl;
      }
      const was = real.tick;
      const old = s.players.map((p) => ({ x: p.x, y: p.y }));
      const changed = net.settle((c, before) => {
        const v = flip ? mirrorFloor(c) : c;
        // the dev server keeps the game's fingerprints, so a test can check two screens agree
        if (import.meta.env.DEV && c.tick % 40 === 0) ((window as unknown as { __floorHashes?: Record<number, string> }).__floorHashes ??= {})[c.tick] = floorHash(c);
        onEvents(freshEvents(v), flip ? [before[1], before[0]] : before, v);
      });
      if (net.over) {
        real = net.conf;
        look();
        finish();
        return;
      }
      if (!changed) return;
      real = net.now;
      look();
      net.prev.forEach((p, i) => {
        prev[i].x = flip ? COURT.w - p.x : p.x;
        prev[i].y = p.y;
      });
      if (real.tick === was) {
        // the same tick, played again on the friend's real keys: slide to where it puts everyone
        s.players.forEach((p, i) => {
          const dx = slide[i].x + old[i].x - p.x;
          const dy = slide[i].y + old[i].y - p.y;
          const far = Math.hypot(dx, dy) > SLIDE_MAX;
          slide[i].x = far ? 0 : dx;
          slide[i].y = far ? 0 : dy;
        });
      } else afterTick();
    };
    /** One tick: the positions before it, the step, and what it set off. */
    const tick = (a: FloorInput | null, b: FloorInput | null) => {
      s.players.forEach((p, i) => {
        prev[i].x = p.x;
        prev[i].y = p.y;
      });
      const before: [number, number] = [...s.score];
      stepFloor(real, a, b);
      look();
      onEvents(freshEvents(s), before);
      afterTick();
    };

    // ---- drawing ----
    const interp = (i: number, a: number) => ({ x: lerp(prev[i].x, s.players[i].x, a) + slide[i].x, y: lerp(prev[i].y, s.players[i].y, a) + slide[i].y });
    const actOf = (i: number, now: number) => {
      const x = act[i];
      if (!x) return null;
      const k = (now - x.t0) / ACT_MS[x.kind];
      if (k >= 1) {
        act[i] = null;
        return null;
      }
      return { kind: x.kind, k };
    };
    const loadShare = (now: number) => (shootFrom !== null && shooting() ? gameSecs(now - shootFrom) / FLOOR.meter.load : -1);

    const ballAt = (a: number, now: number): { x: number; y: number; h: number } => {
      const tr = now / 1000;
      const f = s.ball.flight;
      if (f) {
        const k = clamp(1 - (f.t - a) / f.total, 0, 1);
        const x = lerp(f.from.x, f.to.x, k);
        const y = lerp(f.from.y, f.to.y, k);
        if (f.kind === 'shot') {
          const d = Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y);
          const h0 = f.dunk ? 9.2 : 7.6;
          const arc = f.dunk ? 0.4 : Math.min(7.5, 1.8 + d * 0.2);
          return { x, y, h: h0 * (1 - k) + 10 * k + 4 * k * (1 - k) * arc };
        }
        if (f.kind === 'pass') return { x, y, h: 4.6 + 4 * k * (1 - k) * 1.4 };
        return { x, y, h: 9 * (1 - k) * (1 - k) + 4 * k * (1 - k) * 2.5 + 0.8 * k };
      }
      if (s.phase === 'ft' && s.ft) {
        const p = interp(s.ft.by, a);
        const up = s.ft.by === s.user && loadShare(now) >= 0;
        return { x: p.x + face[s.ft.by] * 0.3, y: p.y + 0.3, h: up ? 7.2 : 4.8 };
      }
      if (s.ball.holder !== null) {
        const i = s.ball.holder;
        const p = interp(i, a);
        const load = i === s.user ? loadShare(now) : -1;
        if (load >= 0 || s.gather?.by === i) return { x: p.x + face[i] * 0.2, y: p.y + 0.2, h: load >= 0 && load < 0.5 ? 4.6 : 7.2 };
        const m = actOf(i, now);
        // the crossover sweeps the ball low across him, the spin keeps it at his hip
        if (m?.kind === 'cross') return { x: p.x + face[i] * (1 - 2 * m.k), y: p.y + 0.8, h: 1 + Math.abs(Math.sin(m.k * Math.PI)) * 1.2 };
        if (m?.kind === 'spin') return { x: p.x + face[i] * 0.6 * Math.cos(m.k * Math.PI * 2), y: p.y + 0.5, h: 3 };
        return { x: p.x + face[i] * 1.0, y: p.y + 0.7, h: 2.9 * Math.abs(Math.sin(tr * Math.PI * 2.4)) + 0.3 };
      }
      return { x: s.ball.x, y: s.ball.y, h: 1 };
    };

    // after the first play: a bigger ball, easy to follow (owner: "it's hard to see the ball because
    // it's too small", then "like 0.75 player head size": nine pixels to a face's twelve): a round
    // pixel ball with a dark rim, a seam and a highlight
    const BALL_NEAR = ['...###...', '.##ooo##.', '.#oHooo#.', '#ooHoooo#', '#sssssss#', '#oooooSS#', '.#ooooS#.', '.##ooo##.', '...###...'];
    const BALL_FAR = ['..####..', '.#oHoo#.', '#oHoooo#', '#ssssss#', '#ooooSo#', '#oooSSo#', '.#oooo#.', '..####..'];
    const BALL_INK: Record<string, string> = { '#': '#1B1820', o: '#E8782A', H: '#FFB26B', S: '#B4531A', s: '#8A3A12' };
    const drawBall = (b: { x: number; y: number; h: number }) => {
      const p = project(cam, b.x, b.y, b.h);
      const rows = p.s >= 0.84 ? BALL_NEAR : BALL_FAR;
      const x0 = Math.round(p.x) - Math.floor(rows[0].length / 2);
      const y0 = Math.round(p.y) - Math.floor(rows.length / 2);
      rows.forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c === '.') return;
          ctx.fillStyle = BALL_INK[c];
          ctx.fillRect(x0 + x, y0 + y, 1, 1);
        }),
      );
    };

    /** The frame for a player now, how high he is off the floor (feet), and whether it turns him round. */
    const frameOf = (i: number, a: number, speed: number, now: number): { frame: Frame; lift: number; turn?: boolean } => {
      const p = s.players[i];
      const f = s.ball.flight;
      // the shooter: up on the release, the ball off his fingertips, then coming down
      if (f && f.kind === 'shot' && f.by === i) {
        const k = clamp(1 - (f.t - a) / f.total, 0, 1);
        if (k < 0.6) return { frame: f.dunk ? 'dunk' : 'shoot', lift: Math.sin(Math.PI * Math.min(1, k / 0.6)) * (f.dunk ? 3.8 : 2.6) };
        return { frame: 'low', lift: 0 };
      }
      // the gather: low with the ball first, then rising into the shot
      const load = i === s.user && s.ball.holder === i ? loadShare(now) : -1;
      if (load >= 0) return load < 0.5 ? { frame: 'gather', lift: 0 } : { frame: 'shoot', lift: Math.min(1, (load - 0.5) * 2) * 1.2 };
      if (s.gather?.by === i) return { frame: 'gather', lift: 0 };
      if (s.phase === 'ft' && s.ft?.by === i) return { frame: i === s.user && loadShare(now) >= 0.5 ? 'shoot' : 'gather', lift: 0 };
      if (p.air > 0) {
        const air = Math.max(0, p.air - a * FLOOR.tick);
        return { frame: 'jump', lift: Math.sin(Math.PI * (1 - air / 0.6)) * 3.2 };
      }
      const m = actOf(i, now);
      if (m) {
        if (m.kind === 'reach') return { frame: 'reach', lift: 0 };
        if (m.kind === 'cross' || m.kind === 'land') return { frame: 'low', lift: 0 };
        if (m.kind === 'step') return { frame: m.k < 0.5 ? 'low' : 'gather', lift: m.k < 0.5 ? 0.6 : 0 };
        if (m.kind === 'cheer') return { frame: speed > 9 ? (Math.floor(stride[i] / 2.4) % 2 ? 'runA' : 'runB') : 'jump', lift: 0 };
        // the spin, in four steps: facing, his back, turned round, facing again
        const q = Math.floor(m.k * 4);
        return q === 1 ? { frame: 'back', lift: 0 } : { frame: 'dribble', lift: 0, turn: q === 2 };
      }
      if (speed > 9) return { frame: Math.floor(stride[i] / 2.4) % 2 ? 'runA' : 'runB', lift: 0 };
      if (p.team !== s.poss && speed > 2.5) return { frame: Math.floor(stride[i] / 1.6) % 2 ? 'slide' : 'guard', lift: 0 };
      if (speed > 2.5) return { frame: Math.floor(stride[i] / 2.4) % 2 ? 'runA' : 'runB', lift: 0 };
      if (s.ball.holder === i) return { frame: 'dribble', lift: 0 };
      return { frame: p.team !== s.poss ? 'guard' : 'stand', lift: 0 };
    };

    /** A flat pixel ring on the floor under a player. */
    const ring = (x: number, y: number, col: string, dashed: boolean) => {
      const c = project(cam, x, y);
      ctx.fillStyle = col;
      for (let k = 0; k < 24; k++) {
        if (dashed && k % 3 === 2) continue;
        const an = (k / 24) * Math.PI * 2;
        pixel(ctx, c.x + Math.cos(an) * 7 * c.s, c.y + Math.sin(an) * 2.4 * c.s);
      }
    };

    /** The open man's mark: a small white bubble with a "!" over his head. */
    const openMark = (x: number, y: number) => {
      const c = project(cam, x, y);
      const bx = Math.round(c.x) - 3;
      const by = Math.round(c.y) - 46;
      ctx.fillStyle = '#1B1820';
      ctx.fillRect(bx - 1, by - 1, 9, 10);
      ctx.fillRect(bx + 2, by + 9, 3, 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(bx, by, 7, 8);
      ctx.fillRect(bx + 3, by + 8, 1, 1);
      ctx.fillStyle = '#1B1820';
      ctx.fillRect(bx + 3, by + 1, 1, 4);
      ctx.fillRect(bx + 3, by + 6, 1, 1);
    };

    const render = (now: number, a: number, dt: number) => {
      const tr = now / 1000;
      const ball = ballAt(a, now);
      const target = clamp(ball.x + (s.poss === 0 ? 7 : -7), CAM_RANGE[0], CAM_RANGE[1]);
      cam += (target - cam) * (1 - Math.exp(-dt * 4));
      const tight = Math.abs(s.score[0] - s.score[1]) <= 6;
      const hype = clamp(0.25 + Math.abs(s.momentum) * 0.6 + (s.clock < 90 && tight ? 0.35 : 0), 0, 1);
      back.draw(ctx, cam, tr, hype);

      // everyone where they are between the last tick and this one
      const at = s.players.map((_, i) => interp(i, a));
      const speed = s.players.map((p, i) => Math.hypot(p.x - prev[i].x, p.y - prev[i].y) / FLOOR.tick);
      s.players.forEach((p, i) => {
        if (!p.on) return;
        const vx = (p.x - prev[i].x) / FLOOR.tick;
        if (Math.abs(vx) > 2.5) face[i] = vx > 0 ? 1 : -1;
        else if (s.ball.holder === i) face[i] = p.team === 0 ? 1 : -1;
        else if (Math.abs(ball.x - at[i].x) > 1.5) face[i] = ball.x > at[i].x ? 1 : -1;
        stride[i] += speed[i] * dt * FLOOR.tick * PACE;
      });

      // on the floor: the shadows, the ring under him, the man he guards, the pass he would make
      s.players.forEach((p, i) => p.on && drawShadow(ctx, project(cam, at[i].x, at[i].y), 12));
      drawShadow(ctx, project(cam, ball.x, ball.y), 4);
      const me = s.players[s.user];
      const mine = s.ball.holder === s.user;
      if (me.on) {
        ring(at[s.user].x, at[s.user].y, '#FFD23F', false);
        const man = s.guard[s.user];
        if (s.poss === 1 && man >= 0 && s.players[man]?.on) ring(at[man].x, at[man].y, '#FF6B5E', false);
        if (mine && s.phase === 'live') {
          const dx = (on('right') ? 1 : 0) - (on('left') ? 1 : 0);
          const dy = (on('down') ? 1 : 0) - (on('up') ? 1 : 0);
          const aim = dx || dy ? aimPass(s, dx, dy) : 'auto';
          const to = aim === 'auto' ? openMan(s) : aim;
          if (to !== null && to !== s.user) ring(at[to].x, at[to].y, dx || dy ? '#FFFFFF' : 'rgba(255,255,255,0.55)', true);
        }
      }

      // the players, the baskets and the ball, far to near
      type Item = { y: number; draw: () => void };
      const items: Item[] = [
        { y: RIM_Y, draw: () => drawBasket(ctx, cam, 0, arena.c1) },
        { y: RIM_Y, draw: () => drawBasket(ctx, cam, 1, arena.c1) },
        { y: ball.y + 0.05 + (ball.h > 9 ? 1 : 0), draw: () => drawBall(ball) },
      ];
      s.players.forEach((p, i) => {
        if (!p.on) return;
        items.push({
          y: at[i].y,
          draw: () => {
            const { frame, lift, turn } = frameOf(i, a, speed[i], now);
            const pt = project(cam, at[i].x, at[i].y, lift);
            // drawn at their own size, a sprite pixel to a canvas pixel: scaled down, the hand-drawn
            // faces and numbers lose columns (a 23 read as 21), so the court's perspective carries the depth
            const spr = book.get(p.id, frame, turn ? face[i] > 0 : face[i] < 0, looks[p.team].kit, lookFor[i], p.number);
            ctx.drawImage(spr.canvas, Math.round(pt.x) - MID_X, Math.round(pt.y) - spr.foot);
          },
        });
      });
      items.sort((p, q) => p.y - q.y).forEach((it) => it.draw());
      drawFrontRow(ctx, cam, tr, hype);

      // the man he guards: a small red marker over his head too
      const man = s.guard[s.user];
      if (me.on && s.poss === 1 && man >= 0 && s.players[man]?.on) {
        const c = project(cam, at[man].x, at[man].y);
        const mx = Math.round(c.x);
        const my = Math.round(c.y) - 41;
        ctx.fillStyle = '#1B1820';
        for (let r = 0; r < 4; r++) ctx.fillRect(mx - 3 + r, my + r, 7 - r * 2, 1);
        ctx.fillRect(mx - 3, my - 1, 7, 1);
        ctx.fillStyle = '#FF6B5E';
        for (let r = 0; r < 3; r++) ctx.fillRect(mx - 2 + r, my + r, 5 - r * 2, 1);
      }

      // the open man's mark, once he has stood open long enough for him to see it (his Basketball IQ)
      if (mine && s.phase === 'live')
        s.players.forEach((p, i) => {
          if (p.on && p.team === 0 && i !== s.user && openFor[i] >= seeOpen) openMark(at[i].x, at[i].y);
        });

      // his marker over his head, and the meter beside him
      if (me.on) {
        const top = project(cam, at[s.user].x, at[s.user].y);
        const hx = Math.round(top.x);
        // the arrow over him (owner: "make the arrow ... a bit larger"): eleven pixels wide, outlined,
        // bobbing a pixel in steps
        const hy = Math.round(top.y) - 43 - (Math.floor(now / 300) % 2);
        ctx.fillStyle = '#1B1820';
        for (let r = 0; r < 7; r++) ctx.fillRect(hx - 5 + r, hy + r, 11 - r * 2, 1);
        ctx.fillRect(hx - 5, hy - 1, 11, 1);
        ctx.fillStyle = '#FFD23F';
        for (let r = 0; r < 5; r++) ctx.fillRect(hx - 4 + r, hy + r, 9 - r * 2, 1);
        ctx.fillStyle = '#FFF3BF';
        ctx.fillRect(hx - 4, hy, 3, 1);
        const load = loadShare(now);
        const showFlash = flash && now < flash.until;
        const atLine = s.phase === 'ft' && s.ft?.by === s.user;
        if ((load >= 0 || showFlash) && !atLine) {
          const win = meterWindow(s, me);
          const fill = load >= 0 ? load : 1;
          const H = 18;
          const x0 = hx + 10;
          const y0 = Math.round(top.y) - 30;
          const rowOf = (v: number) => y0 + H - Math.round(clamp(v / 1.35, 0, 1) * H);
          ctx.fillStyle = '#1B1820';
          ctx.fillRect(x0 - 1, y0 - 1, 5, H + 2);
          ctx.fillStyle = '#3A3E48';
          ctx.fillRect(x0, y0, 3, H);
          ctx.fillStyle = '#2E7D46';
          ctx.fillRect(x0, rowOf(1 + win), 3, Math.max(1, rowOf(1 - win) - rowOf(1 + win)));
          const good = Math.abs(fill - 1) <= win;
          ctx.fillStyle = showFlash && load < 0 ? (flash!.q >= 0.75 ? '#7CFF9B' : flash!.q > 0 ? '#FFD23F' : '#FF5A4E') : good ? '#7CFF9B' : fill > 1 + win ? '#FF5A4E' : '#FFD23F';
          const fr = showFlash && load < 0 ? y0 : rowOf(fill);
          ctx.fillRect(x0, fr, 3, y0 + H - fr);
        }
        // at the line: a long meter across the foot of the court, his touch setting the window
        if (atLine || (showFlash && s.phase === 'ft')) {
          const win = meterWindow(s, me);
          const W = 120;
          const x0 = Math.round(VIEW.w / 2 - W / 2);
          const y0 = VIEW.h - 16;
          const colOf = (v: number) => x0 + Math.round(clamp(v / 1.35, 0, 1) * W);
          ctx.fillStyle = '#1B1820';
          ctx.fillRect(x0 - 2, y0 - 2, W + 4, 9);
          ctx.fillStyle = '#3A3E48';
          ctx.fillRect(x0, y0, W, 5);
          ctx.fillStyle = '#2E7D46';
          ctx.fillRect(colOf(1 - win), y0, Math.max(1, colOf(1 + win) - colOf(1 - win)), 5);
          const fill = load >= 0 ? load : showFlash ? 1 : 0;
          const good = Math.abs(fill - 1) <= win;
          ctx.fillStyle = showFlash && load < 0 ? (flash!.q >= 0.75 ? '#7CFF9B' : flash!.q > 0 ? '#FFD23F' : '#FF5A4E') : good ? '#7CFF9B' : fill > 1 + win ? '#FF5A4E' : '#FFD23F';
          ctx.fillRect(x0, y0 + 1, colOf(fill) - x0, 3);
        }
      }
    };

    let lineShown = '';
    const loop = (now: number) => {
      const raw = (now - lastT) / 1000;
      const dt = Math.min(0.1, raw);
      lastT = now;
      if (skip.current && !link) {
        skip.current = false;
        skipFloor(real);
        look();
        finish();
      }
      // against a friend the menu leaves the game running (it does not stop for one screen)
      const live = link ? !link.over : !pausedRef.current && !closeRef.current && s.phase !== 'over';
      if (link) {
        const gone = link.gone || now - link.heard > 10000;
        const w = gone ? 'gone' : lateSince !== null && now - lateSince > 700 ? 'late' : '';
        if (w !== waitShown) {
          waitShown = w;
          setWait(w);
        }
        const ms = link.ping === null ? null : Math.round(link.ping / 5) * 5;
        const l = `${link.direct}|${ms}`;
        if (l !== lineShown) {
          lineShown = l;
          setLine({ direct: link.direct, ms });
        }
      }
      if (live) {
        // against a friend the game keeps to the real clock: a screen that stuttered makes the time up
        // at once, so it never drags the other one back (alone, a stutter just pauses the game)
        acc += link ? Math.min(NET_CATCH, raw) : dt;
        // one pace from the tip to the horn (round 42, owner: "get rid of clutch time (the game speed
        // suddenly drops too much, making the pace slow)")
        const tl = 1 / PACE;
        if (link) {
          // (the screen that is ahead of the friend's runs a touch slower until they are level)
          netFrame(now, tl * link.stretch());
          const fade = Math.exp(-dt / SLIDE_S);
          for (const o of slide) {
            o.x *= fade;
            o.y *= fade;
          }
        } else
          while (acc >= tl && !closeRef.current) {
            tick(inputFor(), null);
            acc -= tl;
            if (s.phase === 'over') {
              finish();
              break;
            }
          }
      } else acc = 0;
      render(now, live ? clamp(acc * PACE, 0, 1) : 1, dt);
      const h = hudOf(s);
      const key = JSON.stringify(h);
      if (key !== lastHud) {
        lastHud = key;
        setHud(h);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // Against a friend the game must go on while this tab is out of sight (another tab, a minimised
    // window): a browser stops drawing a hidden page, and the friend's screen would stand still
    // waiting for keys that never come. A worker's timer is not slowed down as a page's is, so it
    // plays the ticks (no keys held) until the page is seen again.
    let ticker: Worker | null = null;
    let tickerTimer = 0;
    if (link) {
      const unseen = () => {
        if (!document.hidden || link.over) return;
        const now = performance.now();
        acc += Math.min(NET_CATCH, (now - lastT) / 1000);
        lastT = now;
        netFrame(now, (1 / PACE) * link.stretch());
      };
      try {
        const url = URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),50)'], { type: 'text/javascript' }));
        ticker = new Worker(url);
        URL.revokeObjectURL(url);
        ticker.onmessage = unseen;
      } catch {
        tickerTimer = window.setInterval(unseen, 250);
      }
    }

    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      // the close-up: Enter, Space or Esc moves on from it
      if (closeRef.current) {
        if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
          e.preventDefault();
          setClose(null);
        }
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (s.phase === 'over' || waitShown === 'gone') return;
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (pausedRef.current || s.phase === 'over' || !GAME_KEYS.has(e.code)) return;
      e.preventDefault();
      // a key held over from the other end only counts once it is pressed again
      if (stale.has(e.code) && e.repeat) return;
      if (!e.repeat) stale.delete(e.code);
      if (!e.repeat) pressed.add(e.code);
      held.add(e.code);
      if (e.code === 'KeyJ' && !e.repeat && shooting() && !atRim() && live(e.code)) {
        shootFrom = performance.now();
        release = null;
      }
    };
    const up = (e: KeyboardEvent) => {
      held.delete(e.code);
      stale.delete(e.code);
      if (e.code === 'KeyJ' && shootFrom !== null) {
        release = gameSecs(performance.now() - shootFrom);
        shootFrom = null;
      }
    };
    const blur = () => {
      held.clear();
      shootFrom = null;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      cancelAnimationFrame(raf);
      ticker?.terminate();
      window.clearInterval(tickerTimer);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
    // the setup and the looks are fixed for a game (the props they come from are)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [given, arena, givenLooks, link]);

  // the words fade on their own, and the points
  useEffect(() => {
    if (!word) return;
    const id = window.setTimeout(() => setWord(null), 1100);
    return () => clearTimeout(id);
  }, [word]);
  useEffect(() => {
    if (!pop) return;
    const id = window.setTimeout(() => setPop(null), 1300);
    return () => clearTimeout(id);
  }, [pop]);

  const side = (i: 0 | 1) => {
    const tm = i === 0 ? setup.us : setup.them;
    return (
      <div className={`fb-team${hud.poss === i ? ' ball' : ''}`} style={{ background: tm.color, color: ink(tm.color) }}>
        <span className="fb-name">{tm.short}</span>
        {/* a new score flashes (keyed on the number, so each basket plays it once) */}
        <span key={hud.score[i]} className="fb-score">
          {hud.score[i]}
        </span>
        <span className="fb-meta">
          <span className="fb-tos" aria-label={t('{n} timeouts left', { n: hud.timeouts[i] })}>
            {Array.from({ length: FLOOR.timeouts }, (_, k) => (
              <i key={k} className={k < hud.timeouts[i] ? 'on' : ''} />
            ))}
          </span>
          <span>{t('Fouls {n}', { n: hud.fouls[i] })}</span>
          {hud.fouls[i === 0 ? 1 : 0] >= FLOOR.foul.bonus && <b>{t('Bonus')}</b>}
        </span>
      </div>
    );
  };
  const user = setup.us.players.find((p) => p.user) ?? setup.us.players[0];
  const me = over && game.current ? game.current.players[game.current.user] : null;
  const hot = hud.mo >= FLOOR.momentum.full * 10;

  return (
    <div className="floor" ref={wrap}>
      <div className="fb" role="group" aria-label={t('Score')}>
        {side(0)}
        <div className="fb-clock">
          <span className="fb-period">{hud.period}</span>
          <span className="fb-time">{hud.clock}</span>
          {series && <span className="fb-series">{t('Series {s}', { s: series })}</span>}
        </div>
        <div className={`fb-shot${hud.shot !== null && Number(hud.shot) <= 5 ? ' low' : ''}`} aria-label={t('Shot clock')}>
          {hud.shot ?? '–'}
        </div>
        {side(1)}
      </div>
      <div className="floor-stage" style={{ width: VIEW.w * scale, height: VIEW.h * scale }}>
        <canvas ref={canvas} width={VIEW.w} height={VIEW.h} style={{ width: VIEW.w * scale, height: VIEW.h * scale }} role="img" aria-label={t('The court')} />
        {tags.map((g) => (
          <span key={g.id} className={`floor-tag${g.us ? ' us' : ''}`} style={{ left: g.x * scale, top: g.y * scale }}>
            {g.text}
          </span>
        ))}
        {pop && (
          <div key={pop.id} className={`floor-pts${pop.team === 0 ? ' us' : ''}`} aria-hidden="true">
            +{pop.pts}
          </div>
        )}
        {word && (
          <div key={word.id} className={`floor-word${word.team === 0 ? ' us' : ''}`} aria-live="polite">
            {word.text}
          </div>
        )}
        {hud.line && !close && <div className="floor-line-tip">{t('Free throw: hold J, let go in the green')}</div>}
        {close && (
          <div className="floor-cam" role="img" aria-label={close.play.text}>
            <ActionCam
              key={close.id}
              play={close.play}
              us={{ kit: looks[0].kit, color: setup.us.color }}
              them={{ kit: looks[1].kit, color: setup.them.color }}
              winner={close.winner}
              me={{ name: user.name, number: user.number }}
              venue="nba"
            />
            <span className="floor-cam-skip">{t('Enter to go on')}</span>
          </div>
        )}
        {paused && !over && (
          <div className="floor-pause" role="dialog" aria-label={t('Paused')}>
            <h2>{t('Paused')}</h2>
            <button className="btn primary" autoFocus onClick={() => setPaused(false)}>
              {t('Resume')}
            </button>
            <button
              className="btn"
              disabled={!game.current || game.current.timeouts[0] <= 0}
              onClick={() => {
                callTimeout.current = true;
                setPaused(false);
              }}
            >
              {t('Call a timeout ({n} left)', { n: hud.timeouts[0] })}
            </button>
            <div className="floor-pause-row">
              <button
                className={`chip${snd.sfx ? ' on' : ''}`}
                aria-pressed={snd.sfx}
                onClick={() => {
                  setSfx(!snd.sfx);
                  setSnd(soundSettings());
                }}
              >
                {t('Sound effects')}
              </button>
              <button
                className={`chip${voice && snd.sfx ? ' on' : ''}`}
                aria-pressed={voice && snd.sfx}
                disabled={!snd.sfx}
                onClick={() => {
                  setAnnouncer(!voice);
                  setVoice(!voice);
                }}
              >
                {t('Announcer')}
              </button>
            </div>
            {game.current && <Bench s={game.current} onSub={(q) => ((askSub.current = q), setPaused(false))} />}
            {net ? (
              <button className="btn" onClick={net.onLeave}>
                {t('Leave the game')}
              </button>
            ) : (
              <button
                className="btn"
                onClick={() => {
                  skip.current = true;
                  setPaused(false);
                }}
              >
                {t('Skip to the end')}
              </button>
            )}
            {onAgain && !net && (
              <button className="btn" onClick={onAgain}>
                {t('Start again')}
              </button>
            )}
            {net && <p className="floor-pause-note">{t('The game goes on while this is open.')}</p>}
          </div>
        )}
        {net && wait === 'late' && !over && <div className="floor-wait">{t('Waiting for {name}…', { name: net.friend })}</div>}
        {net && wait === 'gone' && !over && (
          <div className="floor-pause floor-end" role="dialog" aria-label={t('{name} left the game', { name: net.friend })}>
            <h2>{t('{name} left the game', { name: net.friend })}</h2>
            <p>{t('Nothing more comes through from the other screen. The game stops here.')}</p>
            <button className="btn primary" autoFocus onClick={net.onLeave}>
              {t('Back to the room')}
            </button>
          </div>
        )}
        {over && (
          <div className="floor-pause floor-end" role="dialog" aria-label={t('Final')}>
            <div className="kicker">{t('Final')}</div>
            <h2>{over.win ? t('You won') : net ? t('You lost') : (lose ?? t('Season over'))}</h2>
            <div className="floor-final">
              <span>{setup.us.short}</span> {over.us} – {over.them} <span>{setup.them.short}</span>
            </div>
            {me && (
              <p className="floor-line">
                {me.name}: {over.line.pts} PTS · {over.line.reb} REB · {over.line.ast} AST · {over.line.stl} STL · {over.line.blk} BLK · {over.line.fgm}/{over.line.fga} FG
              </p>
            )}
            <BoxScore r={over} teams={[setup.us.short, setup.them.short]} />
            <div className="floor-end-row">
              {onAgain && (
                <button className="btn" onClick={onAgain}>
                  {t('Play it again')}
                </button>
              )}
              <button className="btn primary" autoFocus onClick={() => onDone(over)}>
                {t('Continue')}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="floor-me">
        <b>
          {user.name} #{user.number}
        </b>
        <span className="floor-me-item">
          {t('Stamina')} <Legs n={hud.legs} />
        </span>
        <span className={`floor-me-item${hud.mine >= 5 ? ' warn' : ''}`}>{t('His fouls: {n}', { n: hud.mine })}</span>
        <span className="floor-me-item">
          {t('Momentum')} <Momentum mo={hud.mo} us={setup.us.color} them={setup.them.color} />
          {hot && <b className="floor-hot">{t('On fire')}</b>}
        </span>
        {net && line && (
          <span className={`floor-me-item floor-line${line.direct ? ' direct' : ''}`} title={line.direct ? t('Your two computers are talking straight to each other.') : t('Your keys go through the game\'s server.')}>
            {line.direct ? t('Direct line') : t('Server line')}
            {line.ms !== null && ` · ${line.ms} ms`}
          </span>
        )}
      </div>
      <dl className="floor-keys">
        <div>
          <dt>{t('Offence')}</dt>
          <dd>
            <kbd>WASD</kbd> {t('move')} · <kbd>Shift</kbd> {t('sprint')} · <kbd>J</kbd> {t('hold to shoot; tap at the rim to lay it in or dunk')} · <kbd>K</kbd> {t('pass (aim with the arrows)')} · <kbd>L</kbd> {t('crossover, spin, step-back; a hook in the paint')} · <kbd>Space</kbd> {t('call a pick')} · <kbd>U</kbd> {t('isolation')} · <kbd>I</kbd> {t('give and go')}
          </dd>
        </div>
        <div>
          <dt>{t('Defence')}</dt>
          <dd>
            <kbd>J</kbd> {t('steal')} · <kbd>K</kbd> {t('block or contest')} · <kbd>L</kbd> {t('switch')} · <kbd>Space</kbd> {t('call for help')} · <kbd>U</kbd> {t('double team')} · <kbd>T</kbd> {t('timeout')} · <kbd>Esc</kbd> {t('pause')}
          </dd>
        </div>
      </dl>
    </div>
  );
}
