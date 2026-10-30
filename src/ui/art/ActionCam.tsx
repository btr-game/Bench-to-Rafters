import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DramaPlay } from '../../engine/story/drama';
import type { Kit } from '../../content/teamStyle';
import type { HeroPose } from './heroRows';
import { ballSpot, heroSize, useHeroPaths } from './Hero';
import { toPaths } from './pixel';

// The action cam (round 23): each crunch-time play of a final, acted out from the sideline by the
// photo-traced players (heroRows.ts). The hoop is on the right; whoever has the ball attacks it,
// the man guarding him slides over, and the ball flies, drops through the net, gets swatted,
// poked loose or rims out. The play's own words pick the moves: "throws it down" is a dunk,
// "pulls up from deep" a pull-up three, "hits the turnaround" a fadeaway, and so on.

const W = 400;
const H = 160;
const FLOOR = 154; // where the feet are
const RIM: P = [364, 40]; // the middle of the rim
type P = [number, number];

// which way each photo faces (most of them go left); the attacker always faces the hoop
const FACES_RIGHT = new Set<HeroPose>(['drive', 'finish', 'lowdribble', 'push', 'contest', 'facing']);
const NEUTRAL = new Set<HeroPose>(['stance', 'wall', 'reach', 'hesitation', 'spread']);
const flipFor = (pose: HeroPose, toRight: boolean) => !NEUTRAL.has(pose) && FACES_RIGHT.has(pose) !== toRight;

type Kind = 'make' | 'dunk' | 'block' | 'steal' | 'miss' | 'run';
interface Move {
  from: HeroPose; // on the way in
  to: HeroPose; // the action
  x0: number;
  x: number;
  jump: number;
}
interface Script {
  kind: Kind;
  a: Move; // the man with the ball
  d?: Move; // the man guarding him
  arc: number; // how high the ball flies
}

const S = (kind: Kind, a: [HeroPose, HeroPose, number, number, number], d: [HeroPose, number, number, number] | null, arc = 0): Script => ({
  kind,
  a: { from: a[0], to: a[1], x0: a[2], x: a[3], jump: a[4] },
  d: d ? { from: 'stance', to: d[0], x0: d[1], x: d[2], jump: d[3] } : undefined,
  arc,
});

/** What the play looks like, from its tag and its words (story/drama.ts). */
function scriptOf(p: DramaPlay): Script | null {
  const t = p.text;
  if (p.tag === 'STOP') return null;
  if (p.tag === 'RUN') return S('run', ['push', 'push', -40, 440, 0], null);
  if (p.tag === 'BLOCK') return S('block', ['drive', 'finish', 200, 296, 18], ['contest', 344, 326, 24], 26);
  if (p.tag === 'STEAL') return S('steal', ['lowdribble', 'lowdribble', 120, 214, 0], ['steal', 290, 262, 0]);
  if (p.tag === 'MISS') return S('miss', ['hesitation', 'release', 90, 140, 12], ['contest', 196, 176, 14], 46);
  if (/throws it down/.test(t)) return S('dunk', ['drive', 'dunk', 230, 0, 40], ['reach', 300, 296, 6]);
  if (/putback/.test(t)) return S('dunk', ['reach', 'tip', 300, 0, 26], ['wall', 318, 310, 8]);
  if (/turnaround/.test(t)) return S('make', ['facing', 'fadeaway', 206, 236, 12], ['contest', 280, 266, 10], 34);
  if (/floater/.test(t)) return S('make', ['drive', 'finish', 180, 270, 14], ['wall', 330, 316, 8], 40);
  if (/through contact/.test(t)) return S('make', ['powerdrive', 'finish', 200, 300, 16], ['wall', 330, 318, 6], 18);
  if (/pulls up/.test(t)) return S('make', ['handle', 'pullup', 60, 146, 12], ['contest', 200, 184, 10], 54);
  if (/step-back/.test(t)) return S('make', ['hesitation', 'jumper', 176, 146, 12], ['contest', 200, 186, 10], 54);
  if (/corner/.test(t)) return S('make', ['spread', 'catchshoot', 104, 116, 8], ['contest', 190, 160, 10], 58);
  if (p.pts === 3) return S('make', ['handle', 'release', 70, 150, 10], ['contest', 206, 188, 10], 54);
  return S('make', ['lowdribble', 'scoop', 180, 300, 20], ['wall', 340, 326, 8], 22);
}

// the timeline of a play (ms): it all fits in the 1.7 s each play stays on screen
const T_ACT = 520; // he gets there and goes up
const T_UP = 220; // the jump to its top
const T_REL = T_ACT + T_UP; // the ball leaves his hands
const T_RES = 1180; // the result

const BALL_ROWS = ['..OOO..', '.OuBBO.', 'OuBBBbO', 'OBLBBbO', 'OBBLbbO', '.ObbbO.', '..OOO..'];
const BALL_PAL: Record<string, string> = { O: '#1B1820', B: '#E8782A', u: '#F5A15F', b: '#C2571B', L: '#6A3416' };
const BALL = toPaths(BALL_ROWS.map((r) => [...r].map((c) => BALL_PAL[c] ?? '')));

/** The arena behind the play: the crowd, the ribbon board, the floor and its lines. */
let BACK: { fill: string; d: string }[] | null = null;
function backdrop(): { fill: string; d: string }[] {
  if (BACK) return BACK;
  const g: string[][] = Array.from({ length: H }, () => Array<string>(W).fill(''));
  const put = (x: number, y: number, c: string) => {
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c;
  };
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, c);
  };
  rect(0, 0, W, 112, '#14161D');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  // a dim crowd, so the eye stays on the floor
  const shirts = ['#262A34', '#2C2F3A', '#33292C', '#263038', '#2E2B38', '#35322A', '#3C2429'];
  const skins = ['#4A3A33', '#5A463C', '#64503F', '#3C2C25', '#6E5A48'];
  for (let row = 0; row < 11; row++) {
    const y = 10 + row * 9;
    rect(0, y + 6, W, 1, '#1C1F28');
    for (let x = (row % 2) * 3; x < W; x += 6) {
      if (rnd() < 0.12) continue;
      const shirt = shirts[Math.floor(rnd() * shirts.length)];
      rect(x + 1, y + 2, 4, 4, shirt);
      rect(x + 2, y, 2, 2, skins[Math.floor(rnd() * skins.length)]);
    }
  }
  // the ribbon board and the floor
  rect(0, 104, W, 8, '#0B0C10');
  for (let x = 2; x < W; x += 4) rect(x, 107, 2, 2, '#3B4256');
  for (let y = 112; y < H; y++) for (let x = 0; x < W; x++) put(x, y, (y - 112) % 6 === 0 ? '#B37A45' : (x + (Math.floor((y - 112) / 6) * 37)) % 53 === 0 ? '#B98048' : '#C98D52');
  // the paint, the three-point line and the baseline, seen from the side
  for (let y = 112; y < H; y++) {
    const k = Math.round((y - 112) * 0.25);
    for (let x = 300 - k; x < 392 - k; x++) put(x, y, (y - 112) % 6 === 0 ? '#8E3A2E' : '#A4473A');
    rect(300 - k, y, 2, 1, '#F2EEE6');
    rect(170 - k, y, 2, 1, '#F2EEE6');
    rect(392 - k, y, 2, 1, '#F2EEE6');
  }
  // the stanchion, the arm and its pad
  rect(392, 18, 6, 136, '#30343E');
  rect(393, 18, 2, 136, '#454A56');
  rect(374, 20, 20, 3, '#30343E');
  rect(390, 112, 10, 42, '#1F4E9E');
  BACK = toPaths(g);
  return BACK;
}

/** One player on the cam: placed by his feet, turned to face the right way. */
function Actor({ pose, kit, model, number, x, toRight, noBall, moveRef, jumpRef }: { pose: HeroPose; kit: Kit; model: string; number: number; x: number; toRight: boolean; noBall: boolean; moveRef: React.Ref<SVGGElement>; jumpRef: React.Ref<SVGGElement> }) {
  const flip = flipFor(pose, toRight);
  const paths = useHeroPaths(pose, kit, model, number, { noBall, flat: true, mirror: flip });
  const [w, h] = heroSize(pose);
  return (
    <g transform={`translate(${x} ${FLOOR - h})`}>
      <g ref={moveRef}>
        <rect x={-14} y={h - 2} width={28} height={3} fill="rgba(0,0,0,0.28)" />
        <g ref={jumpRef}>
          <g transform={flip ? `translate(${w / 2} 0) scale(-1 1)` : `translate(${-w / 2} 0)`}>
            {paths.map((p) => (
              <path key={p.fill} d={p.d} fill={p.fill} />
            ))}
          </g>
        </g>
      </g>
    </g>
  );
}

/** Where the ball is in his hands: the pose's ball, with him at x, turned and up in the air. */
function handBall(pose: HeroPose, x: number, toRight: boolean, up: number): P {
  const [w, h] = heroSize(pose);
  const [bx, by] = ballSpot(pose);
  const fx = flipFor(pose, toRight) ? 1 - bx : bx;
  return [x - w / 2 + fx * w, FLOOR - h + by * h - up];
}

/** A flight along a parabola, as points. */
function arc(a: P, b: P, top: number, n = 10, upTo = 1): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * upTo;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - top * 4 * t * (1 - t)];
  });
}

/** Keyframes for the ball through a list of legs (points and how long each leg takes). */
function legs(parts: { pts: P[]; ms: number }[]): { frames: Keyframe[]; ms: number } {
  const ms = parts.reduce((s, l) => s + l.ms, 0);
  const frames: Keyframe[] = [];
  let at = 0;
  parts.forEach((l) => {
    l.pts.forEach((p, i) => {
      if (i === 0 && frames.length) return;
      frames.push({ transform: `translate(${p[0]}px, ${p[1]}px)`, opacity: 1, offset: (at + (l.ms * i) / Math.max(1, l.pts.length - 1)) / ms });
    });
    at += l.ms;
  });
  frames[frames.length - 1].opacity = 0;
  return { frames, ms };
}

const LABEL: Partial<Record<DramaPlay['tag'], string>> = { BUZZER: 'At the buzzer!', DAGGER: 'Dagger', LEAD: 'Takes the lead', TIE: 'All tied up' };

export interface CamSide {
  kit: Kit;
  color: string; // for the label
}

/**
 * One play on the action cam. Mount it with a new key for every play: it runs once, about 1.5 s.
 * `me` is the player himself (his name and number when the play is his).
 */
export function ActionCam({ play, us, them, winner, me }: { play: DramaPlay | null; us: CamSide; them: CamSide; winner: 'us' | 'them'; me: { name: string; number: number } | null }) {
  const sc = useMemo(() => (play ? scriptOf(play) : null), [play]);
  const [phase, setPhase] = useState(0); // 0 on the way, 1 the action, 2 the ball is gone, 3 the result
  const aMove = useRef<SVGGElement>(null);
  const aJump = useRef<SVGGElement>(null);
  const dMove = useRef<SVGGElement>(null);
  const dJump = useRef<SVGGElement>(null);
  const ball = useRef<SVGGElement>(null);
  const net = useRef<SVGGElement>(null);
  const rim = useRef<SVGGElement>(null);

  // who has the ball: the scorer; on a block or a steal, the losing side (the winners make the stop)
  const loser = winner === 'us' ? 'them' : 'us';
  const atkSide = !play || play.side === 'none' ? (sc?.kind === 'run' ? winner : sc?.kind === 'miss' ? 'us' : loser) : play.side;
  const defSide = atkSide === 'us' ? 'them' : 'us';
  const text = play?.text ?? '';
  const first = text.split(' ')[0].replace(/[^A-Za-z'-]/g, '');
  const victim = /blocks your/.test(text) ? 'you' : (text.match(/blocks (\S+)'s/)?.[1] ?? 'Guard');
  const atkName = sc?.kind === 'block' ? victim : first;
  const defName = sc?.kind === 'block' || sc?.kind === 'steal' ? first : `${first} D`;
  const atkMine = sc?.kind === 'block' ? victim === 'you' : sc?.kind === 'steal' ? false : !!play?.mine;
  const defMine = (sc?.kind === 'block' || sc?.kind === 'steal') && !!play?.mine;
  const num = (s: string) => ([...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 45) + 1;
  const atk = atkMine && me ? me : { name: atkName, number: num(atkName) };
  const def = defMine && me ? me : { name: defName, number: num(defName) };

  // a dunk or a tip-in is placed so the ball reaches the rim
  const a = sc?.a;
  const ax = a ? a.x || RIM[0] - handBall(a.to, 0, true, 0)[0] - 2 : 0;

  useLayoutEffect(() => {
    if (!sc || !a) return;
    const anims: Animation[] = [];
    const timers: number[] = [];
    const go = (el: Element | null, frames: Keyframe[], o: KeyframeAnimationOptions) => {
      if (el && typeof el.animate === 'function') anims.push(el.animate(frames, { fill: 'both', ...o }));
    };
    const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
    const tx = (x: number, y = 0) => `translate(${x}px, ${y}px)`;

    if (sc.kind === 'run') {
      go(aMove.current, [{ transform: tx(a.x0 - ax) }, { transform: tx(0) }], { duration: 1500, easing: 'linear' });
      go(aJump.current, [{ transform: tx(0, 0) }, { transform: tx(0, -3) }, { transform: tx(0, 0) }], { duration: 260, iterations: 6 });
      at(300, () => setPhase(3));
      return () => {
        anims.forEach((x) => x.cancel());
        timers.forEach(clearTimeout);
      };
    }

    // in he comes, and up he goes
    go(aMove.current, [{ transform: tx(a.x0 - ax) }, { transform: tx(0) }], { duration: T_ACT, easing: 'cubic-bezier(.3,.6,.4,1)' });
    at(T_ACT - 40, () => setPhase(1));
    if (a.jump) go(aJump.current, [{ transform: tx(0, 0) }, { transform: tx(0, -a.jump), offset: 0.42, easing: 'ease-in' }, { transform: tx(0, 0) }], { duration: T_UP / 0.42, delay: T_ACT, easing: 'ease-out' });
    const d = sc.d;
    if (d) {
      const dDelay = sc.kind === 'block' ? T_ACT + 80 : sc.kind === 'steal' ? T_ACT - 140 : T_ACT + 40;
      go(dMove.current, [{ transform: tx(d.x0 - d.x) }, { transform: tx(0) }], { duration: sc.kind === 'steal' ? T_ACT + 120 : T_ACT, easing: 'ease-out' });
      if (d.jump) go(dJump.current, [{ transform: tx(0, 0) }, { transform: tx(0, -d.jump), offset: 0.42, easing: 'ease-in' }, { transform: tx(0, 0) }], { duration: T_UP / 0.42, delay: dDelay, easing: 'ease-out' });
    }

    const hand = handBall(sc.kind === 'steal' ? a.from : a.to, ax, true, sc.kind === 'steal' ? 0 : a.jump);
    const netWhip = (delay: number) => go(net.current, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.4) scaleX(0.86)' }, { transform: 'scaleY(1)' }], { duration: 300, delay, easing: 'ease-out' });
    const rimShake = (delay: number, by = 3) => go(rim.current, [{ transform: tx(0) }, { transform: tx(0, by) }, { transform: tx(0, -1) }, { transform: tx(0) }], { duration: 260, delay });
    const through: P[] = [RIM, [RIM[0], RIM[1] + 12], [RIM[0] - 1, FLOOR - 6]];
    let flight: { frames: Keyframe[]; ms: number } | null = null;
    let ballAt = T_REL;
    if (sc.kind === 'make') {
      flight = legs([
        { pts: arc(hand, [RIM[0], RIM[1] - 2], sc.arc), ms: T_RES - T_REL - 60 },
        { pts: through, ms: 380 },
      ]);
      netWhip(T_RES - 60);
    } else if (sc.kind === 'dunk') {
      ballAt = T_REL + 30;
      flight = legs([
        { pts: [hand, [RIM[0], RIM[1] - 4]], ms: 90 },
        { pts: through, ms: 340 },
      ]);
      rimShake(ballAt + 80, 4);
      netWhip(ballAt + 80);
    } else if (sc.kind === 'block') {
      const to: P = [RIM[0], RIM[1] - 2];
      const hit = arc(hand, to, sc.arc, 4, 0.3);
      const e = hit[hit.length - 1];
      flight = legs([
        { pts: hit, ms: 150 },
        { pts: arc(e, [60, FLOOR - 4], 30, 8), ms: 520 },
      ]);
    } else if (sc.kind === 'steal') {
      ballAt = T_ACT + 60;
      const grab = handBall('steal', d!.x, false, 0);
      flight = legs([
        { pts: [hand, [hand[0] + 12, FLOOR - 8], [grab[0], grab[1] + 6]], ms: 260 },
        { pts: arc([grab[0], grab[1] + 6], [10, FLOOR - 8], 20, 8), ms: 520 },
      ]);
    } else if (sc.kind === 'miss') {
      const front: P = [RIM[0] - 9, RIM[1] - 2];
      flight = legs([
        { pts: arc(hand, front, sc.arc), ms: T_RES - T_REL - 60 },
        { pts: arc(front, [300, FLOOR - 4], 30, 8), ms: 520 },
      ]);
      rimShake(T_RES - 60, 2);
    }
    at(ballAt, () => setPhase(2));
    // the ball only shows once it leaves his hands (until then it is in the drawing)
    if (flight) go(ball.current, flight.frames, { duration: flight.ms, delay: ballAt, easing: 'linear', fill: 'forwards' });
    at(sc.kind === 'block' || sc.kind === 'steal' ? ballAt + 140 : T_RES, () => setPhase(3));
    return () => {
      anims.forEach((x) => x.cancel());
      timers.forEach(clearTimeout);
    };
    // once per play: the cam is mounted again for the next one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const back = useMemo(backdrop, []);
  const A = atkSide === 'us' ? us : them;
  const D = defSide === 'us' ? us : them;
  const kind = sc?.kind;
  const label =
    kind === 'block' ? 'Blocked!' : kind === 'steal' ? 'Stolen!' : kind === 'miss' ? 'No good' : kind === 'run' ? 'Here comes the run' : `+${play?.pts ?? 0}`;
  const sub = play && (kind === 'make' || kind === 'dunk') ? LABEL[play.tag] : undefined;
  const good = kind === 'miss' ? loser : kind === 'block' || kind === 'steal' ? defSide : atkSide;
  const ballGone = phase >= 2 && kind !== 'run';
  return (
    <div className={`cam${play?.tag === 'BUZZER' && phase === 3 ? ' buzz' : ''}`} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges">
        {back.map((p) => (
          <path key={p.fill} d={p.d} fill={p.fill} />
        ))}
        <rect x={0} y={104} width={W} height={8} fill={(good === 'us' ? us : them).color} opacity={phase === 3 ? 0.55 : 0.12} className="cam-ribbon" />
        {phase === 3 && (kind === 'make' || kind === 'dunk') && (
          <g className="cam-flashes">
            {[22, 71, 118, 160, 205, 250, 292, 338, 47, 183].map((x, i) => (
              <rect key={x} x={x} y={14 + ((i * 37) % 80)} width={2} height={2} fill="#FFFFFF" style={{ animationDelay: `${(i % 5) * 60}ms` }} />
            ))}
          </g>
        )}
        {/* the backboard, behind the players; the rim and the net in front of the ball */}
        <rect x={374} y={2} width={4} height={50} fill="#DCE8F0" opacity={0.85} />
        <rect x={374} y={2} width={1} height={50} fill="#FFFFFF" />
        <rect x={377} y={2} width={1} height={50} className="cam-board" fill="#9AA7B4" />
        {sc?.d && (
          <Actor pose={phase >= 1 ? sc.d.to : sc.d.from} kit={D.kit} model={def.name} number={def.number} x={sc.d.x} toRight={false} noBall moveRef={dMove} jumpRef={dJump} />
        )}
        {a && <Actor pose={phase >= 1 ? a.to : a.from} kit={A.kit} model={atk.name} number={atk.number} x={ax} toRight noBall={ballGone} moveRef={aMove} jumpRef={aJump} />}
        <g ref={ball} style={{ opacity: 0 }}>
          <g transform="translate(-3.5 -3.5)">
            {BALL.map((p) => (
              <path key={p.fill} d={p.d} fill={p.fill} />
            ))}
          </g>
        </g>
        <g ref={rim}>
          <rect x={354} y={RIM[1]} width={20} height={2} fill="#E0531F" />
          <rect x={354} y={RIM[1]} width={20} height={1} fill="#F07A3A" />
          <g ref={net} style={{ transformBox: 'fill-box', transformOrigin: '50% 0' }}>
            <path d={`M355 ${RIM[1] + 2}l3 14M359 ${RIM[1] + 2}l2 14M364 ${RIM[1] + 2}v14M369 ${RIM[1] + 2}l-2 14M373 ${RIM[1] + 2}l-3 14M357 ${RIM[1] + 7}h14M358 ${RIM[1] + 12}h12`} stroke="#F4F4F4" strokeWidth={1} fill="none" opacity={0.9} />
          </g>
        </g>
      </svg>
      {phase === 3 && sc && (
        <div className={`cam-label${good === 'them' ? ' them' : ''}`}>
          <b>{label}</b>
          {sub && <small>{sub}</small>}
        </div>
      )}
    </div>
  );
}
