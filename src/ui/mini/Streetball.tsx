// 3-on-3 streetball (engine/mini/streetball.ts): one game at a city park. Pick the play on
// offense (a drive or a pull-up asks for a timing tap, then plays out on the action cam), read
// the other crew on defense. Round 24: six cute sprites on the court, none holding a ball; the
// one ball goes where the play's words say: handler, pass, shooter, rim.

import { announce, callFor } from '../announcer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { GUARDS, MOVES, STREET, TIMED, newStreet, runDefense, runOffense, streetResult, type Baller, type Guard, type Move, type Play, type StreetState, type Timing } from '../../engine/mini/streetball';
import type { DramaPlay } from '../../engine/story/drama';
import type { Pos } from '../../engine/types';
import { ActionCam } from '../art/ActionCam';
import { userOvr } from '../../engine/career/common';
import { clamp } from '../../engine/rng';
import { genericKits } from '../../content/teamStyle';
import { PlayerArt } from '../art/Player';
import { MiniBonus } from './MiniBonus';
import { TimingMeter } from '../components/TimingMeter';
import { Icon } from '../art/Icon';
import { sfx } from '../sound';
import { PixelWord } from '../art/PixelText';

// each crew's colour, in the order of the crews in the engine
const CREW_COLOR = ['#E8590C', '#1C7ED6', '#7048E8'];
const CREW_NAMES = ['The Corner Store Kings', 'Splash Brothers Inc.', 'The Bricklayers'];
const US_COLOR = '#2B8A3E';

/** The career player's ratings, or a park regular's in free play. */
function meFrom(game: ReturnType<typeof useStore.getState>['game']): { me: Baller; level: number } {
  if (!game || game.step === 'retired') return { me: { name: 'Ace Walker', FIN: 72, SHT: 70, PLY: 70, ATH: 72, PER: 68, INT: 64, REB: 66 }, level: 70 };
  const a = game.player.attrs;
  return { me: { name: game.player.name, FIN: a.FIN, SHT: a.SHT, PLY: a.PLY, ATH: a.ATH, PER: a.PER, INT: a.INT, REB: a.REB }, level: clamp(Math.round(userOvr(game)), 55, 92) };
}

// spots on the court (percent of width, height): the ball handler up top, two wings
type Pt = [number, number];
const OFF: Pt[] = [
  [50, 74],
  [18, 50],
  [82, 50],
];
const DEF: Pt[] = [
  [50, 58],
  [27, 40],
  [73, 40],
];
const RIM: Pt = [50, 15];
const LANE: Pt = [50, 33]; // where a driver finishes
const INSIDE: Move[] = ['drive', 'post', 'givego', 'lob'];
// the ball in his hands: a little up and to the side of his feet
const hand = ([x, y]: Pt): Pt => [x + 2.6, y - 5];

/** Who stands where for one possession: the side with the ball spreads out, its handler up top. */
function layout(st: StreetState, ourBall: boolean, handler?: string): Map<string, Pt> {
  const ours = [st.me, ...st.mates].map((x) => x.name);
  const theirs = st.crew.players.map((x) => x.name);
  const lead = (names: string[]) => (handler && names.includes(handler) ? [handler, ...names.filter((n) => n !== handler)] : names);
  const m = new Map<string, Pt>();
  lead(ours).forEach((n, i) => m.set(n, (ourBall ? OFF : DEF)[i]));
  lead(theirs).forEach((n, i) => m.set(n, (ourBall ? DEF : OFF)[i]));
  return m;
}

/** The ball's way through a play, step by step, in line with its words. */
function ballPath(play: Play, spots: Map<string, Pt>): Pt[] {
  const at = (n: string) => spots.get(n) ?? OFF[0];
  const path: Pt[] = [hand(at(play.handler))];
  if (play.steal) {
    // the pass that never got there
    path.push(hand(at(play.def)));
    return path;
  }
  // a pass to the shooter; on a give-and-go, out to the wing and back to the cutter
  const wing = [...spots.entries()].find(([, p]) => p === OFF[1])?.[0];
  if (play.shooter !== play.handler) path.push(hand(at(play.shooter)));
  else if (play.move === 'givego' && wing) path.push(hand(at(wing)));
  if (INSIDE.includes(play.move)) path.push(hand(LANE));
  if (play.blocked) {
    path.push([LANE[0] + 6, LANE[1] - 6], [LANE[0] + 20, LANE[1] + 10]);
    return path;
  }
  path.push(RIM);
  path.push(play.made ? [RIM[0], RIM[1] + 7] : [RIM[0] + 9, RIM[1] + 16]);
  return path;
}

/**
 * The park in pixels (round 27, owner: "i dont feel like its very much pixellated"): asphalt with a
 * dither, a chain-link fence, the backboard, rim and net, the paint and a stepped arc, all on one
 * 100 x 80 grid drawn with square pixels (the players stand on it in percent of the same box).
 */
function CourtPixels() {
  const px = useMemo(() => {
    const out: [number, number, number, number, string][] = [];
    const r = (x: number, y: number, w: number, h: number, c: string) => out.push([x, y, w, h, c]);
    // the fence: sky, chain diamonds, posts and the top rail of the court
    r(0, 0, 100, 10, '#9fc1e0');
    for (let x = 0; x < 100; x += 4)
      for (let y = 0; y < 10; y += 4) {
        r(x, y, 1, 1, '#c4d5e6');
        r(x + 1, y + 1, 1, 1, '#c4d5e6');
        r(x + 2, y + 2, 1, 1, '#c4d5e6');
        r(x + 3, y + 3, 1, 1, '#c4d5e6');
        r(x + 3, y, 1, 1, '#c4d5e6');
        r(x + 2, y + 1, 1, 1, '#c4d5e6');
        r(x + 1, y + 2, 1, 1, '#c4d5e6');
        r(x, y + 3, 1, 1, '#c4d5e6');
      }
    for (const x of [0, 33, 66, 99]) r(x, 0, 1, 10, '#6b7079');
    r(0, 10, 100, 1, '#6b7079');
    r(0, 11, 100, 1, '#2c5277');
    // the paint and its lines
    r(36, 12, 28, 26, '#8e5a4a');
    r(35, 12, 1, 27, '#e6edf3');
    r(64, 12, 1, 27, '#e6edf3');
    r(35, 38, 30, 1, '#e6edf3');
    // the arc, stepped: a pixel at every column, the gaps filled down the steep sides
    let prev: number | null = null;
    for (let x = 6; x <= 94; x++) {
      const t = (x - 50) / 44;
      const y = Math.round(12 + 41 * Math.sqrt(Math.max(0, 1 - t * t)));
      const top = prev === null ? y : Math.min(prev, y);
      const bot = prev === null ? y : Math.max(prev, y);
      r(x, x < 50 ? top : top, 1, Math.max(1, bot - top + (x < 50 ? 0 : 0) + 0), '#e6edf3');
      r(x, y, 1, 1, '#e6edf3');
      prev = y;
    }
    // the backboard, the square, the rim and the net
    r(41, 2, 18, 8, '#18141c');
    r(42, 3, 16, 6, '#f1f3f5');
    r(47, 5, 6, 1, '#e8590c');
    r(47, 5, 1, 4, '#e8590c');
    r(52, 5, 1, 4, '#e8590c');
    r(49, 10, 2, 2, '#6b7079');
    r(46, 12, 8, 1, '#e8590c');
    r(45, 13, 1, 1, '#e8590c');
    r(54, 13, 1, 1, '#e8590c');
    r(46, 14, 8, 1, '#c2410c');
    for (let i = 0; i < 4; i++) r(46 + i * 2, 15 + (i % 2), 1, 2, '#f1f3f5');
    r(47, 17, 6, 1, '#f1f3f5');
    return out;
  }, []);
  return (
    <svg className="sb-px" viewBox="0 0 100 80" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
      <defs>
        <pattern id="sb-dither" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="1" height="1" fill="#4777a6" />
          <rect x="2" y="2" width="1" height="1" fill="#335f89" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100" height="80" fill="#3b6a96" />
      <rect x="0" y="12" width="100" height="68" fill="url(#sb-dither)" />
      {px.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
  );
}

/** Round 28 (owner: "after each play, put large texts appear at the top of the rim? like miss, make,
 * steal"): the play in one word, gold when it went your way, red when it did not. */
function callOf(p: Play): { word: string; good: boolean } {
  const good = p.side === 'us' ? p.made : !p.made;
  if (p.steal) return { word: 'STEAL', good };
  if (p.blocked) return { word: 'BLOCK', good };
  if (p.made) return { word: p.dunk ? 'DUNK' : 'MAKE', good };
  return { word: 'MISS', good };
}

function Court({ st, spots, ball, shooter, inside, highlight, call, crewColor }: { st: StreetState; spots: Map<string, Pt>; ball: Pt; shooter: string | null; inside: boolean; highlight: { key: number; text: string } | null; call: { key: number; word: string; good: boolean } | null; crewColor: string }) {
  const crew = st.crew;
  const ours = [st.me, ...st.mates];
  const usKit = genericKits(US_COLOR, 'PARK').road;
  const themKit = genericKits(crewColor, crew.name.split(' ').pop()!.toUpperCase().slice(0, 6)).road;
  const off = (n: string) => spots.get(n) === OFF[0] || spots.get(n) === OFF[1] || spots.get(n) === OFF[2];
  // the handler dribbles, the others on offense wait in triple threat, the defense crouches
  const pose = (n: string): Pos => (spots.get(n) === OFF[0] ? 'SG' : off(n) ? 'PF' : 'PG');
  const where = (n: string): Pt => (n === shooter && inside ? LANE : (spots.get(n) ?? OFF[0]));
  return (
    <div className="sb-court" aria-label={`${crew.court}: you ${st.us}, ${crew.name} ${st.them}`}>
      <CourtPixels />
      {ours.map((x, i) => (
        <div key={x.name} className={`sb-player us${shooter === x.name ? ' act' : ''}`} style={{ left: `${where(x.name)[0]}%`, top: `${where(x.name)[1]}%` }}>
          <PlayerArt name={x.name} number={[1, 7, 23][i]} pos={pose(x.name)} kitData={usKit} size={72} noBall />
          <span>{x.me ? 'You' : x.name.split(' ').pop()}</span>
        </div>
      ))}
      {crew.players.map((x, i) => (
        <div key={x.name} className={`sb-player them${shooter === x.name ? ' act' : ''}`} style={{ left: `${where(x.name)[0]}%`, top: `${where(x.name)[1]}%` }}>
          <PlayerArt name={x.name} number={[3, 11, 32][i]} pos={pose(x.name)} kitData={themKit} size={72} noBall />
          <span>{x.name.split(' ').pop()}</span>
        </div>
      ))}
      <div className="sb-ball" style={{ left: `${ball[0]}%`, top: `${ball[1]}%` }}>
        <Icon name="ball" size={20} />
      </div>
      {call && (
        <div key={`c${call.key}`} className={`sb-call ${call.good ? 'good' : 'bad'}`} aria-hidden="true">
          <PixelWord text={call.word} color={call.good ? '#FFD43B' : '#FF8787'} shade={call.good ? '#5A4206' : '#5C1A1A'} className="sb-call-word" />
        </div>
      )}
      {highlight && (
        <div key={`h${highlight.key}`} className="sb-highlight">
          {highlight.text}
        </div>
      )}
    </div>
  );
}

const first = (n: string) => n.split(' ')[0].replace(/[^A-Za-z'-]/g, '');

// round 27 (owner: "it's a little hard to know what happened. make the log more concise and make it
// appear larger in a place more visible"): each play in a few words, under the court
const MOVE_WORD: Record<Move, string> = { drive: 'drive', pullup: 'pull-up two', post: 'post-up', givego: 'give-and-go', kick: 'kick-out two', lob: 'lob' };
function brief(p: Play, me: string): { tag: string; line: string; good: boolean } {
  const who = (n: string) => (n === me ? 'You' : (n.split(' ').pop() ?? n));
  const good = p.side === 'us' ? p.made : !p.made;
  if (p.steal) return { tag: 'STEAL', line: `${who(p.def)} picks off ${who(p.handler)}`, good };
  if (p.blocked) return { tag: 'BLOCK', line: `${who(p.def)} swats ${who(p.shooter)}`, good };
  if (p.made) return { tag: `+${p.pts}`, line: `${who(p.shooter)} · ${MOVE_WORD[p.move]}${p.highlight ? ` · ${p.highlight.replace(/!+$/, '').toLowerCase()}` : ''}`, good };
  return { tag: p.side === 'them' ? 'STOP' : 'MISS', line: `${who(p.shooter)} · ${MOVE_WORD[p.move]}`, good };
}

/** The last play big, the four before it smaller, each with the score it left. */
function Ticker({ plays, me, upTo }: { plays: Play[]; me: string; upTo: number }) {
  let us = 0;
  let them = 0;
  const rows = plays.slice(0, upTo).map((p) => {
    if (p.made) p.side === 'us' ? (us += p.pts) : (them += p.pts);
    return { ...brief(p, me), score: `${us}–${them}`, full: p.text };
  });
  const [now, ...before] = rows.slice(-5).reverse();
  return (
    <div className="sb-ticker" aria-live="polite">
      {now ? (
        <div className={`sb-now ${now.good ? 'good' : 'bad'}`} title={now.full}>
          <span className="sb-tag">{now.tag}</span>
          <b>{now.line}</b>
          <span className="sb-at">{now.score}</span>
        </div>
      ) : (
        <div className="sb-now">
          <b>Tip-off: your ball.</b>
        </div>
      )}
      {before.length > 0 && (
        <ol className="sb-feed">
          {before.map((r, i) => (
            <li key={rows.length - 1 - i} className={r.good ? 'good' : 'bad'} title={r.full}>
              <span className="sb-tag">{r.tag}</span>
              <span className="sb-line">{r.line}</span>
              <span className="sb-at">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** A timing shot as the action cam tells it (the cam reads the words to pick the move). */
function camPlay(p: Play): DramaPlay {
  const me = first(p.shooter);
  const text = p.blocked ? `${first(p.def)} blocks your layup` : p.dunk ? `${me} throws it down` : p.move === 'pullup' ? `${me} pulls up` : `${me} finishes at the rim`;
  return { clock: '', side: 'us', pts: p.pts, text, tag: p.blocked ? 'BLOCK' : p.made ? '' : 'MISS', mine: true };
}

const STEP_MS = 330;
const CAM_MS = 2300;

export function StreetballGame() {
  const game = useStore((s) => s.game);
  const { me, level } = useMemo(() => meFrom(game), [game]);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const preview = useMemo(() => newStreet(seed, me, level), [seed, me, level]);
  const [st, setSt] = useState<StreetState | null>(null);
  const [, force] = useState(0);
  const [timed, setTimed] = useState<Move | null>(null);
  const [cam, setCam] = useState<{ key: number; play: DramaPlay; note: string } | null>(null);
  const [view, setView] = useState<{ spots: Map<string, Pt>; ball: Pt; shooter: string | null; inside: boolean; highlight: { key: number; text: string } | null; call: { key: number; word: string; good: boolean } | null }>({ spots: new Map(), ball: hand(OFF[0]), shooter: null, inside: false, highlight: null, call: null });
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));

  /** Everyone back in place for the next possession, the ball with its handler. */
  const settle = useCallback((x: StreetState, play: Play | null) => {
    const spots = layout(x, x.ourBall);
    setView({ spots, ball: hand(x.ourBall ? (spots.get(x.me.name) ?? OFF[0]) : OFF[0]), shooter: null, inside: false, highlight: play?.highlight ? { key: x.plays.length, text: play.highlight } : null, call: play ? { key: x.plays.length, ...callOf(play) } : null });
    // round 27: the play's sound as it lands
    if (play) sfx(play.made ? 'swish' : play.steal || play.blocked ? 'block' : 'rim');
    // round 32: the announcer, for the plays worth shouting about (ours)
    if (play) {
      const c = callOf(play);
      const hl = play.highlight ?? '';
      const say = !c.good ? null : hl === 'AND ONE!' ? 'And one!' : hl.startsWith('ALLEY') ? 'Alley-oop!' : hl.startsWith('POSTER') ? 'Posterized!' : callFor(c.word, c.good, play.pts >= 2 && play.made && !play.dunk ? 'three' : '');
      if (say) announce(say);
    }
    setBusy(false);
    force((n) => n + 1);
  }, []);

  const start = () => {
    const x = newStreet(seed, me, level);
    setSt(x);
    setTimed(null);
    setCam(null);
    settle(x, null);
  };

  /** A play on the court: the text first, then the ball goes where the words say. */
  const playOut = (x: StreetState, play: Play) => {
    const spots = layout(x, play.side === 'us', play.handler);
    const path = ballPath(play, spots);
    setBusy(true);
    setView({ spots, ball: path[0], shooter: play.steal ? play.def : play.shooter, inside: INSIDE.includes(play.move) && !play.steal, highlight: null, call: null });
    path.slice(1).forEach((b, i) => later(STEP_MS * (i + 1), () => setView((v) => ({ ...v, ball: b }))));
    later(STEP_MS * path.length + 250, () => settle(x, play));
  };

  const offense = (m: Move, t?: Timing) => {
    if (!st || busy) return;
    const play = runOffense(st, m, t);
    setTimed(null);
    if (t) {
      // a timing shot plays out on the action cam, like the last minutes of a final
      setBusy(true);
      setCam({ key: st.plays.length, play: camPlay(play), note: [t === 'perfect' ? 'Perfect timing' : t === 'good' ? 'Good look' : 'Late', play.highlight].filter(Boolean).join(' · ') });
      later(CAM_MS, () => {
        setCam(null);
        settle(st, play);
      });
    } else playOut(st, play);
  };
  const pick = (m: Move) => (TIMED.includes(m) ? setTimed(m) : offense(m));
  const defense = (g: Guard) => {
    if (!st || busy) return;
    playOut(st, runDefense(st, g));
  };
  // number keys pick the play
  useEffect(() => {
    if (!st || st.over || timed || busy) return;
    const key = (e: KeyboardEvent) => {
      const n = Number(e.key) - 1;
      if (Number.isNaN(n) || n < 0) return;
      if (st.ourBall && MOVES[n]) pick(MOVES[n].key);
      else if (!st.ourBall && GUARDS[n]) defense(GUARDS[n].key);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const crew = (st ?? preview).crew;
  const color = CREW_COLOR[CREW_NAMES.indexOf(crew.name)] ?? CREW_COLOR[0];
  if (!st)
    return (
      <section className="stack stage-in sb-intro">
        <div>
          <div className="kicker">Mini-game · 3-on-3</div>
          <h1 className="hub-title">King of the court</h1>
          <p className="prose">
            One game to {STREET.to} against the crew that holds the court today. Ones and twos (inside the arc 1, outside 2), and make it take it: score and you keep the ball. On offense pick the play; a drive or a pull-up asks for a timing tap and plays out on the action cam (a perfect drive draws the and-one). On defense read the crew. Highlights fire up the crowd, and a full crowd makes your next play better.
          </p>
          <p className="small muted">
            {game && game.step !== 'retired' ? `${me.name} plays with his own ratings (finishing ${Math.round(me.FIN)}, athleticism ${Math.round(me.ATH)}, shooting ${Math.round(me.SHT)}, playmaking ${Math.round(me.PLY)}).` : 'Free play: you are Ace Walker, a park regular. With a career, your own player takes the court.'}{' '}
            A good game pays finishing.
          </p>
        </div>
        <div className="sb-rung" style={{ borderTopColor: color }}>
          <small>
            Today at {crew.court} · first to {STREET.to}
          </small>
          <b>{crew.name}</b>
          <span className="small muted">{crew.style === 'shooters' ? 'Shooters: they live at the arc' : crew.style === 'slashers' ? 'Slashers: they attack the rim' : 'Bigs: they post you up'}</span>
          <span className="small">{crew.players.map((p) => p.name).join(' · ')}</span>
        </div>
        <button className="btn sb-go" onClick={start}>
          Hit the court
        </button>
      </section>
    );

  const reached = streetResult(st);
  const done = st.over && !busy;
  return (
    <section className="stack stage-in">
      <div className="sb-head">
        <div>
          <div className="kicker">
            {crew.court} · first to {STREET.to}
          </div>
          <h2 className="sb-title">vs {crew.name}</h2>
        </div>
        <div className="sb-score">
          <span className="us">{st.us}</span>
          <span className="dash">–</span>
          <span className="them" style={{ color }}>
            {st.them}
          </span>
        </div>
      </div>
      <div className="sb-grid">
        <div className="stack sb-main">
          {cam ? (
            <div className="sb-cam">
              <ActionCam key={cam.key} play={cam.play} us={{ kit: genericKits(US_COLOR, 'PARK').road, color: US_COLOR }} them={{ kit: genericKits(color, crew.name.split(' ').pop()!.toUpperCase().slice(0, 6)).road, color }} winner="us" me={{ name: st.me.name, number: 1 }} venue="park" note={cam.note} />
            </div>
          ) : (
            <Court st={st} spots={view.spots} ball={view.ball} shooter={view.shooter} inside={view.inside} highlight={view.highlight} call={view.call} crewColor={color} />
          )}
          {/* the action cam tells its own play: the ticker catches up when it ends */}
          <Ticker plays={st.plays} me={st.me.name} upTo={cam ? st.plays.length - 1 : st.plays.length} />
        </div>
        <div className="stack sb-side">
          <div className="sb-hype" aria-label={`Crowd ${st.hype} of ${STREET.hypeMax}`}>
            <span>Crowd</span>
            {Array.from({ length: STREET.hypeMax }, (_, i) => (
              <i key={i} className={i < st.hype ? 'on' : ''} />
            ))}
            {st.hype >= STREET.hypeMax && <b>On fire: next play is better</b>}
          </div>
          {done ? (
            <div className="card stack sb-over">
              <div className="sec-title">{st.us > st.them ? `You beat ${crew.name}, ${st.us}–${st.them}` : `${crew.name} hold the court, ${st.them}–${st.us}`}</div>
              <p className="small">{reached === 'rout' ? 'Not even close. The park is yours.' : reached === 'win' ? 'A win is a win. They want a rematch.' : reached === 'close' ? 'One more stop and it was yours.' : 'Next time. The park remembers.'}</p>
              <button className="btn ghost" onClick={() => (setSeed(Math.floor(Math.random() * 2 ** 31)), setSt(null))}>
                Run it back
              </button>
            </div>
          ) : st.over || busy ? null : st.ourBall ? (
            timed ? (
              <TimingMeter skill={timed === 'drive' ? me.FIN : me.SHT} label={timed === 'drive' ? 'Finish!' : 'Release!'} onTap={(t) => offense(timed, t)} />
            ) : (
              <>
                <div className="sec-title">Your ball: pick the play</div>
                <div className="sb-moves">
                  {MOVES.map((m, i) => (
                    <button key={m.key} className="sb-move" onClick={() => pick(m.key)}>
                      <b>
                        <span className="kbd">{i + 1}</span> {m.name} <small>{m.pts === 2 ? '2 pts' : '1 pt'}</small>
                      </b>
                      <small>{m.text}</small>
                    </button>
                  ))}
                </div>
              </>
            )
          ) : (
            <>
              <div className="sec-title">Their ball: how do you guard it?</div>
              <div className="sb-moves">
                {GUARDS.map((g, i) => (
                  <button key={g.key} className="sb-move def" onClick={() => defense(g.key)}>
                    <b>
                      <span className="kbd">{i + 1}</span> {g.name}
                    </b>
                    <small>{g.text}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {done && <MiniBonus result={{ game: 'street', reached }} />}
    </section>
  );
}
