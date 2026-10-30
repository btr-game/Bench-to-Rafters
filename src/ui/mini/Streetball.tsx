// 3-on-3 streetball (engine/mini/streetball.ts): one game at a city park. Pick the play on
// offense (a drive or a pull-up asks for a timing tap, then plays out on the action cam), read
// the other crew on defense. Round 24: six cute sprites on the court, none holding a ball; the
// one ball goes where the play's words say: handler, pass, shooter, rim.

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

function Court({ st, spots, ball, shooter, inside, highlight, crewColor }: { st: StreetState; spots: Map<string, Pt>; ball: Pt; shooter: string | null; inside: boolean; highlight: { key: number; text: string } | null; crewColor: string }) {
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
      <div className="sb-fence" />
      <div className="sb-board">
        <div className="sb-rim" />
      </div>
      <div className="sb-key" />
      <div className="sb-arc" />
      {ours.map((x, i) => (
        <div key={x.name} className={`sb-player us${shooter === x.name ? ' act' : ''}`} style={{ left: `${where(x.name)[0]}%`, top: `${where(x.name)[1]}%` }}>
          <PlayerArt name={x.name} number={[1, 7, 23][i]} pos={pose(x.name)} kitData={usKit} size={64} noBall />
          <span>{x.me ? 'You' : x.name.split(' ').pop()}</span>
        </div>
      ))}
      {crew.players.map((x, i) => (
        <div key={x.name} className={`sb-player them${shooter === x.name ? ' act' : ''}`} style={{ left: `${where(x.name)[0]}%`, top: `${where(x.name)[1]}%` }}>
          <PlayerArt name={x.name} number={[3, 11, 32][i]} pos={pose(x.name)} kitData={themKit} size={64} noBall />
          <span>{x.name.split(' ').pop()}</span>
        </div>
      ))}
      <div className="sb-ball" style={{ left: `${ball[0]}%`, top: `${ball[1]}%` }} />
      {highlight && (
        <div key={`h${highlight.key}`} className="sb-highlight">
          {highlight.text}
        </div>
      )}
    </div>
  );
}

const first = (n: string) => n.split(' ')[0].replace(/[^A-Za-z'-]/g, '');

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
  const [shown, setShown] = useState<Play | null>(null);
  const [cam, setCam] = useState<{ key: number; play: DramaPlay; note: string } | null>(null);
  const [view, setView] = useState<{ spots: Map<string, Pt>; ball: Pt; shooter: string | null; inside: boolean; highlight: { key: number; text: string } | null }>({ spots: new Map(), ball: hand(OFF[0]), shooter: null, inside: false, highlight: null });
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));

  /** Everyone back in place for the next possession, the ball with its handler. */
  const settle = useCallback((x: StreetState, play: Play | null) => {
    const spots = layout(x, x.ourBall);
    setView({ spots, ball: hand(x.ourBall ? (spots.get(x.me.name) ?? OFF[0]) : OFF[0]), shooter: null, inside: false, highlight: play?.highlight ? { key: x.plays.length, text: play.highlight } : null });
    setShown(play);
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
    setShown(play);
    setBusy(true);
    setView({ spots, ball: path[0], shooter: play.steal ? play.def : play.shooter, inside: INSIDE.includes(play.move) && !play.steal, highlight: null });
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
        {cam ? (
          <div className="sb-cam">
            <ActionCam key={cam.key} play={cam.play} us={{ kit: genericKits(US_COLOR, 'PARK').road, color: US_COLOR }} them={{ kit: genericKits(color, crew.name.split(' ').pop()!.toUpperCase().slice(0, 6)).road, color }} winner="us" me={{ name: st.me.name, number: 1 }} venue="park" note={cam.note} />
          </div>
        ) : (
          <Court st={st} spots={view.spots} ball={view.ball} shooter={view.shooter} inside={view.inside} highlight={view.highlight} crewColor={color} />
        )}
        <div className="stack sb-side">
          <div className="sb-hype" aria-label={`Crowd ${st.hype} of ${STREET.hypeMax}`}>
            <span>Crowd</span>
            {Array.from({ length: STREET.hypeMax }, (_, i) => (
              <i key={i} className={i < st.hype ? 'on' : ''} />
            ))}
            {st.hype >= STREET.hypeMax && <b>On fire: next play is better</b>}
          </div>
          {cam ? <p className="sb-play us">…</p> : shown && <p className={`sb-play ${shown.side}${shown.made ? ' made' : ''}`}>{shown.text}</p>}
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
          <ul className="sb-log small">
            {st.plays
              .slice(cam ? -7 : -6, cam ? -1 : undefined)
              .reverse()
              .map((x, i) => (
                <li key={st.plays.length - i} className={x.side}>
                  {x.made ? `+${x.pts} ` : ''}
                  {x.text}
                </li>
              ))}
          </ul>
        </div>
      </div>
      {done && <MiniBonus result={{ game: 'street', reached }} />}
    </section>
  );
}
