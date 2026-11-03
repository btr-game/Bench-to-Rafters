// The Floor on screen (round 39): the fourth quarter of a game that can end his team's series,
// played on a high three-quarter court (owner: "I actually want a high three quarter view", "can we
// go pseudo 3d?"). The engine (engine/floor/sim.ts) ticks twenty times a real second; between ticks
// the screen slides everyone along, so the picture moves at the screen's own rate. He is steered
// with the keyboard on both ends (owner: "defence too"); the score bug sits above the court.

import { useEffect, useRef, useState } from 'react';
import { FLOOR } from '../../engine/balance';
import { RIM_Y } from '../../engine/floor/court';
import { floorResult, freshEvents, meterWindow, releaseQuality, skipFloor, startFloor, stepFloor, type FloorEvent, type FloorInput, type FloorSetup, type FloorState } from '../../engine/floor/sim';
import type { Kit } from '../../content/teamStyle';
import { lookOf, shoeOf, type KitName } from '../art/Player';
import type { Look } from '../art/sprite';
import { ink } from '../art/color';
import { t } from '../../i18n';
import { Backdrop, CAM_RANGE, VIEW, drawBasket, drawFrontRow, drawShadow, pixel, project, type ArenaLook } from './view';
import { FOOT, SpriteBook, type Frame } from './sprites';

export interface FloorTeamLook {
  kit: Kit;
  which: KitName;
}

export type FloorOutcome = ReturnType<typeof floorResult>;

interface Props {
  setup: FloorSetup;
  /** His team's arena colours. */
  arena: ArenaLook;
  looks: [FloorTeamLook, FloorTeamLook];
  /** The series so far, as the score bug shows it ("3–3"). */
  series?: string;
  /** Engine ticks a real second: 20 is the four-minute quarter (owner: "time is tripled"). */
  pace?: number;
  onAgain?: () => void;
  onDone: (r: FloorOutcome) => void;
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
  timeout: ['KeyT'],
} as const;
type KeyName = keyof typeof KEY;
const GAME_KEYS = new Set<string>(Object.values(KEY).flat());

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const clockText = (c: number) => (c >= 60 ? `${Math.floor(c / 60)}:${String(Math.floor(c % 60)).padStart(2, '0')}` : Math.max(0, c).toFixed(1));
const periodText = (n: number) => (n === 0 ? t('4th') : n === 1 ? t('OT') : t('OT{n}', { n }));

interface Hud {
  score: [number, number];
  clock: string;
  shot: string | null;
  period: string;
  fouls: [number, number];
  timeouts: [number, number];
  poss: 0 | 1;
}
const hudOf = (s: FloorState): Hud => ({
  score: [...s.score] as [number, number],
  clock: clockText(s.clock),
  shot: s.phase === 'live' && s.shot < s.clock ? String(Math.max(0, Math.ceil(s.shot))) : null,
  period: periodText(s.periods),
  fouls: [...s.teamFouls] as [number, number],
  timeouts: [...s.timeouts] as [number, number],
  poss: s.poss,
});

/** The words over the court after a play (round 28's big pixel words, in the player's language). */
function wordFor(s: FloorState, e: FloorEvent): string | null {
  switch (e.kind) {
    case 'make':
      return e.and ? t('And one') : e.dunk ? t('Dunk') : `+${e.pts}`;
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
      return t('{name} fouls out', { name: s.players[e.by!].name.split(' ').slice(-1)[0] });
    case 'ft':
      return e.good ? '+1' : null;
    case 'end':
      return t('Final');
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

export function FloorScreen({ setup, arena, looks, series, pace = FLOOR.ticksPerSec, onAgain, onDone }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2);
  const [hud, setHud] = useState<Hud>(() => hudOf(startFloor(setup)));
  const [word, setWord] = useState<{ text: string; team: 0 | 1; id: number } | null>(null);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState<FloorOutcome | null>(null);
  const pausedRef = useRef(false);
  const game = useRef<FloorState | null>(null);
  const skip = useRef(false);
  const callTimeout = useRef(false);

  // the biggest whole-number scale the page has room for
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setScale(clamp(Math.floor(Math.min(el.clientWidth / VIEW.w, (window.innerHeight - 220) / VIEW.h)), 1, 4));
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
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const s = startFloor(setup);
    game.current = s;
    // the dev server lets a test script read the game it is playing
    if (import.meta.env.DEV) (window as unknown as { __floor?: FloorState }).__floor = s;
    const back = new Backdrop(ctx, arena);
    const book = new SpriteBook();
    const lookFor: Look[] = s.players.map((p) => lookOf(p.name, shoeOf(looks[p.team].kit, looks[p.team].which)));
    const prev = s.players.map((p) => ({ x: p.x, y: p.y }));
    const face = s.players.map((p) => (p.team === 0 ? 1 : -1));
    const stride = s.players.map(() => 0);
    const held = new Set<string>();
    const pressed = new Set<string>();
    const on = (k: KeyName) => KEY[k].some((c) => held.has(c));
    const hit = (k: KeyName) => KEY[k].some((c) => pressed.has(c));
    // his shot, timed by the screen to the millisecond: when the key went down, and the hold to send
    let shootFrom: number | null = null;
    let release: number | null = null;
    let flash: { q: number; until: number } | null = null;
    let cam = clamp(s.ball.x, CAM_RANGE[0], CAM_RANGE[1]);
    let acc = 0;
    let last = performance.now();
    let raf = 0;
    let lastHud = '';
    const gameSecs = (ms: number) => (ms / 1000) * FLOOR.tick * pace;

    const shooting = () => {
      const mine = s.ball.holder === s.user && s.poss === 0;
      const ft = s.phase === 'ft' && s.ft?.by === s.user;
      return mine || ft;
    };

    const inputFor = (): FloorInput => {
      const dx = (on('right') ? 1 : 0) - (on('left') ? 1 : 0);
      const dy = (on('down') ? 1 : 0) - (on('up') ? 1 : 0);
      const inp: FloorInput = { dx, dy, sprint: on('sprint') };
      const mine = s.ball.holder === s.user;
      if (s.poss === 0 || s.phase === 'ft') {
        if (shooting()) {
          if (on('a')) {
            inp.shoot = true;
            if (shootFrom === null) shootFrom = performance.now();
          }
          else if (release !== null) {
            // a tap shorter than a tick still loads first, then lets go on the next one
            if (s.load < 0) inp.shoot = true;
            else {
              inp.load = release;
              const u = s.players[s.user];
              flash = { q: releaseQuality(s, u, release), until: performance.now() + 700 };
              release = null;
            }
          }
        } else release = null;
        if (hit('b')) inp.pass = mine ? aimPass(s, dx, dy) : 'auto';
        if (hit('c') && mine) inp.move = dx < 0 ? 'step' : dy !== 0 ? 'spin' : 'cross';
        if (hit('d')) inp.pick = true;
      } else {
        release = null;
        if (hit('a')) inp.steal = true;
        if (hit('b')) inp.block = true;
        if (hit('c')) inp.swap = true;
        if (hit('d')) inp.help = true;
      }
      if (hit('timeout') || callTimeout.current) inp.timeout = true;
      callTimeout.current = false;
      pressed.clear();
      return inp;
    };

    const onEvents = (evs: FloorEvent[]) => {
      for (const e of evs) {
        const w = wordFor(s, e);
        if (w) setWord({ text: w, team: e.kind === 'turnover' || e.kind === 'shotclock' ? (e.team === 0 ? 1 : 0) : e.team, id: performance.now() + Math.random() });
      }
    };

    const finish = () => {
      setHud(hudOf(s));
      setOver(floorResult(s));
    };

    // ---- drawing ----
    const interp = (i: number, a: number) => ({ x: lerp(prev[i].x, s.players[i].x, a), y: lerp(prev[i].y, s.players[i].y, a) });

    const ballAt = (a: number, tr: number): { x: number; y: number; h: number } => {
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
        return { x: p.x + face[s.ft.by] * 0.3, y: p.y + 0.3, h: 4.8 };
      }
      if (s.ball.holder !== null) {
        const i = s.ball.holder;
        const p = interp(i, a);
        const loading = (i === s.user && shootFrom !== null && s.poss === 0) || s.gather?.by === i;
        if (loading) return { x: p.x + face[i] * 0.2, y: p.y + 0.2, h: 7.2 };
        return { x: p.x + face[i] * 1.0, y: p.y + 0.7, h: 2.9 * Math.abs(Math.sin(tr * Math.PI * 2.4)) + 0.3 };
      }
      return { x: s.ball.x, y: s.ball.y, h: 1 };
    };

    const drawBall = (b: { x: number; y: number; h: number }) => {
      const p = project(cam, b.x, b.y, b.h);
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const big = p.s >= 0.84;
      ctx.fillStyle = '#1B1820';
      if (big) {
        ctx.fillRect(x - 2, y - 3, 4, 6);
        ctx.fillRect(x - 3, y - 2, 6, 4);
      } else {
        ctx.fillRect(x - 1, y - 2, 3, 5);
        ctx.fillRect(x - 2, y - 1, 5, 3);
      }
      ctx.fillStyle = '#E8782A';
      if (big) {
        ctx.fillRect(x - 1, y - 2, 2, 4);
        ctx.fillRect(x - 2, y - 1, 4, 2);
        ctx.fillStyle = '#C2571B';
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = '#6A3416';
        ctx.fillRect(x - 1, y - 1, 1, 1);
      } else {
        ctx.fillRect(x, y - 1, 1, 3);
        ctx.fillRect(x - 1, y, 3, 1);
      }
    };

    const frameOf = (i: number, a: number, speed: number): { frame: Frame; lift: number } => {
      const p = s.players[i];
      const f = s.ball.flight;
      if (f && f.kind === 'shot' && f.by === i) {
        const k = clamp(1 - (f.t - a) / f.total, 0, 1);
        if (k < 0.6) return { frame: f.dunk ? 'dunk' : 'shoot', lift: Math.sin(Math.PI * Math.min(1, k / 0.6)) * (f.dunk ? 3.8 : 2.6) };
      }
      if (s.gather?.by === i || (i === s.user && shootFrom !== null && s.ball.holder === i)) return { frame: 'shoot', lift: 0 };
      if (p.air > 0) {
        const air = Math.max(0, p.air - a * FLOOR.tick);
        return { frame: 'jump', lift: Math.sin(Math.PI * (1 - air / 0.6)) * 3.2 };
      }
      if (speed > 5) return { frame: Math.floor(stride[i] / 2.4) % 2 ? 'runA' : 'runB', lift: 0 };
      if (s.ball.holder === i) return { frame: 'dribble', lift: 0 };
      return { frame: p.team !== s.poss ? 'guard' : 'stand', lift: 0 };
    };

    const render = (now: number, a: number, dt: number) => {
      const tr = now / 1000;
      const ball = ballAt(a, tr);
      const target = clamp(ball.x + (s.poss === 0 ? 7 : -7), CAM_RANGE[0], CAM_RANGE[1]);
      cam += (target - cam) * (1 - Math.exp(-dt * 4));
      const close = Math.abs(s.score[0] - s.score[1]) <= 6;
      const hype = clamp(0.25 + Math.abs(s.momentum) * 0.6 + (s.clock < 90 && close ? 0.35 : 0), 0, 1);
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
        stride[i] += speed[i] * dt * FLOOR.tick * pace;
      });

      // on the floor: the shadows, and the ring under him
      s.players.forEach((p, i) => p.on && drawShadow(ctx, project(cam, at[i].x, at[i].y), 12));
      drawShadow(ctx, project(cam, ball.x, ball.y), 4);
      const me = s.players[s.user];
      if (me.on) {
        const c = project(cam, at[s.user].x, at[s.user].y);
        ctx.fillStyle = '#FFD23F';
        for (let k = 0; k < 24; k++) {
          const an = (k / 24) * Math.PI * 2;
          pixel(ctx, c.x + Math.cos(an) * 7 * c.s, c.y + Math.sin(an) * 2.4 * c.s);
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
            const { frame, lift } = frameOf(i, a, speed[i]);
            const pt = project(cam, at[i].x, at[i].y, lift);
            // drawn at their own size, a sprite pixel to a canvas pixel: scaled down, the hand-drawn
            // faces and numbers lose columns (a 23 read as 21), so the court's perspective carries the depth
            const spr = book.get(p.id, frame, face[i] < 0, looks[p.team].kit, lookFor[i], p.number);
            ctx.drawImage(spr, Math.round(pt.x) - FOOT.x, Math.round(pt.y) - FOOT.y);
          },
        });
      });
      items.sort((p, q) => p.y - q.y).forEach((it) => it.draw());
      drawFrontRow(ctx, cam, tr, hype);

      // his marker over his head, and the meter beside him
      if (me.on) {
        const top = project(cam, at[s.user].x, at[s.user].y);
        const hx = Math.round(top.x);
        const hy = Math.round(top.y) - FOOT.y - 4;
        ctx.fillStyle = '#1B1820';
        ctx.fillRect(hx - 3, hy - 1, 7, 2);
        ctx.fillRect(hx - 2, hy + 1, 5, 1);
        ctx.fillStyle = '#FFD23F';
        ctx.fillRect(hx - 2, hy - 1, 5, 1);
        ctx.fillRect(hx - 1, hy, 3, 1);
        ctx.fillRect(hx, hy + 1, 1, 1);
        const loading = shootFrom !== null && shooting();
        const showFlash = flash && now < flash.until;
        if (loading || showFlash) {
          const win = meterWindow(s, me) * 1;
          const fill = loading ? gameSecs(now - shootFrom!) / FLOOR.meter.load : 1;
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
          ctx.fillStyle = showFlash && !loading ? (flash!.q >= 0.75 ? '#7CFF9B' : flash!.q > 0 ? '#FFD23F' : '#FF5A4E') : good ? '#7CFF9B' : fill > 1 + win ? '#FF5A4E' : '#FFD23F';
          const fr = showFlash && !loading ? y0 : rowOf(fill);
          ctx.fillRect(x0, fr, 3, y0 + H - fr);
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (skip.current) {
        skip.current = false;
        skipFloor(s);
        finish();
      }
      const live = !pausedRef.current && s.phase !== 'over';
      if (live) {
        acc += dt;
        const tl = 1 / pace;
        while (acc >= tl) {
          s.players.forEach((p, i) => {
            prev[i].x = p.x;
            prev[i].y = p.y;
          });
          stepFloor(s, inputFor());
          onEvents(freshEvents(s));
          acc -= tl;
          if (s.phase === 'over') {
            finish();
            break;
          }
        }
      }
      render(now, live ? clamp(acc * pace, 0, 1) : 1, dt);
      const h = hudOf(s);
      const key = JSON.stringify(h);
      if (key !== lastHud) {
        lastHud = key;
        setHud(h);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (s.phase === 'over') return;
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (pausedRef.current || s.phase === 'over' || !GAME_KEYS.has(e.code)) return;
      e.preventDefault();
      if (!e.repeat) pressed.add(e.code);
      held.add(e.code);
      if (e.code === 'KeyJ' && !e.repeat && shooting()) {
        shootFrom = performance.now();
        release = null;
      }
    };
    const up = (e: KeyboardEvent) => {
      held.delete(e.code);
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
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [setup, arena, looks, pace]);

  // the words fade on their own
  useEffect(() => {
    if (!word) return;
    const id = window.setTimeout(() => setWord(null), 1100);
    return () => clearTimeout(id);
  }, [word]);

  const side = (i: 0 | 1) => {
    const tm = i === 0 ? setup.us : setup.them;
    return (
      <div className={`fb-team${hud.poss === i ? ' ball' : ''}`} style={{ background: tm.color, color: ink(tm.color) }}>
        <span className="fb-name">{tm.short}</span>
        <span className="fb-score">{hud.score[i]}</span>
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
  const me = over && game.current ? game.current.players[game.current.user] : null;

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
        {word && (
          <div key={word.id} className={`floor-word${word.team === 0 ? ' us' : ''}`} aria-live="polite">
            {word.text}
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
            <button
              className="btn"
              onClick={() => {
                skip.current = true;
                setPaused(false);
              }}
            >
              {t('Skip to the end')}
            </button>
            {onAgain && (
              <button className="btn" onClick={onAgain}>
                {t('Start again')}
              </button>
            )}
          </div>
        )}
        {over && (
          <div className="floor-pause floor-end" role="dialog" aria-label={t('Final')}>
            <div className="kicker">{t('Final')}</div>
            <h2>{over.win ? t('You won') : t('Season over')}</h2>
            <div className="floor-final">
              <span>{setup.us.short}</span> {over.us} – {over.them} <span>{setup.them.short}</span>
            </div>
            {me && (
              <p className="floor-line">
                {me.name}: {over.line.pts} PTS · {over.line.reb} REB · {over.line.ast} AST · {over.line.stl} STL · {over.line.blk} BLK · {over.line.fgm}/{over.line.fga} FG
              </p>
            )}
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
      <dl className="floor-keys">
        <div>
          <dt>{t('Offence')}</dt>
          <dd>
            <kbd>WASD</kbd> {t('move')} · <kbd>Shift</kbd> {t('sprint')} · <kbd>J</kbd> {t('hold to shoot')} · <kbd>K</kbd> {t('pass (aim with the arrows)')} · <kbd>L</kbd> {t('crossover, spin, step-back')} · <kbd>Space</kbd> {t('call a pick')}
          </dd>
        </div>
        <div>
          <dt>{t('Defence')}</dt>
          <dd>
            <kbd>J</kbd> {t('steal')} · <kbd>K</kbd> {t('block or contest')} · <kbd>L</kbd> {t('switch')} · <kbd>Space</kbd> {t('call for help')} · <kbd>T</kbd> {t('timeout')} · <kbd>Esc</kbd> {t('pause')}
          </dd>
        </div>
      </dl>
    </div>
  );
}

