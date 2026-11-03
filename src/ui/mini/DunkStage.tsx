import { useEffect, useMemo, useRef, useState } from 'react';
import type { Kit } from '../../content/teamStyle';
import type { DunkDesign } from '../../engine/mini/dunk';
import { blankGrid, paintCrowd, paintFloor, paintRibbon } from '../art/arena';
import { mix } from '../art/color';
import { DIGITS, toPaths } from '../art/pixel';
import { lookOf } from '../art/Player';
import { DRIBBLE, DUNK, noBall, paint, type Pose } from '../art/sprite';
import { t } from '../../i18n';

// The dunk contest stage (round 17), side on: the crowd, the stanchion, glass and rim on the
// right, hardwood with the free-throw line, the judges' table up front. The dunker runs in from
// his takeoff, flies, slams it home (the rim shakes, the net whips, the flashes go off) or
// clanks it; a lob or a teammate to jump over appear when the dunk calls for them. After a
// dunk, five judges raise their cards one by one.

const SW = 320;
const SH = 180;
const FLOOR = 150; // where feet land
const RIM: [number, number] = [258, 74];
const SCALE = 1.4;
const START: Record<string, number> = { stand: 214, run: 52, ft: 44 };
const TAKEOFF: Record<string, number> = { stand: 222, run: 196, ft: 150 };

function paintStage(): string[][] {
  const g = blankGrid(SW, SH);
  paintCrowd(g, 64, 11);
  paintRibbon(g, 62, 'SLAM DUNK CONTEST  ALL-STAR SATURDAY  ');
  paintFloor(g, 69);
  const line = '#F4F1EA';
  // the painted lane from the baseline to the free-throw line, the line itself
  for (let y = 120; y < 156; y++) for (let x = 150; x < 300; x++) g[y][x] = mix(g[y][x], '#1D428A', 0.38);
  for (let x = 150; x < 300; x++) {
    g[120][x] = line;
    g[155][x] = line;
  }
  for (let y = 120; y < 156; y++) g[y][150] = line;
  for (let y = 112; y < 164; y++) g[y][300] = line; // baseline
  // the stanchion: a padded base, the post, the arm out to the glass
  for (let y = 112; y < 160; y++) for (let x = 298; x < 320; x++) g[y][x] = y < 116 ? '#2A2D34' : x < 301 ? '#0E2C5A' : '#1D428A';
  for (let y = 40; y < 112; y++) for (let x = 304; x < 310; x++) g[y][x] = x === 304 ? '#9AA2B0' : '#6B7280';
  for (let y = 40; y < 46; y++) for (let x = 270; x < 306; x++) g[y][x] = y === 40 ? '#9AA2B0' : '#6B7280';
  // the glass, side on, and the rim
  for (let y = 36; y < 84; y++) for (let x = 268; x < 272; x++) g[y][x] = x === 268 ? '#F4F6FA' : '#C9D9E6';
  return g;
}

/** Where the dunker is at time t (0 to 1) of the dunk: running, flying, hanging, dropping. */
function path(d: DunkDesign, t: number): { x: number; y: number; air: boolean; flip: boolean } {
  const x0 = START[d.takeoff] ?? 52;
  const x1 = TAKEOFF[d.takeoff] ?? 196;
  const [rx] = RIM;
  const spin = d.moves.includes('360') || d.moves.includes('reverse');
  if (t < 0.35) {
    const u = t / 0.35;
    return { x: x0 + (x1 - x0) * u, y: FLOOR - Math.abs(Math.sin(u * Math.PI * 4)) * 2, air: false, flip: false };
  }
  if (t < 0.72) {
    const u = (t - 0.35) / 0.37;
    const hangX = rx - 12;
    const top = FLOOR - 70 - (d.takeoff === 'ft' ? 10 : 0);
    const x = x1 + (hangX - x1) * u;
    const y = (1 - u) * (1 - u) * FLOOR + 2 * (1 - u) * u * top + u * u * (FLOOR - 52);
    return { x, y, air: true, flip: spin && u > 0.35 && u < 0.75 };
  }
  if (t < 0.86) return { x: rx - 12, y: FLOOR - 52, air: true, flip: false };
  const u = (t - 0.86) / 0.14;
  return { x: rx - 12 - u * 8, y: FLOOR - 52 + 52 * u * u, air: u < 0.95, flip: false };
}

function Sprite({ paths, x, y, flip = false, scale = SCALE, pose = DRIBBLE }: { paths: { fill: string; d: string }[]; x: number; y: number; flip?: boolean; scale?: number; pose?: Pose }) {
  const { w, h } = pose;
  // anchored at the feet, centred
  const tx = Math.round(x - (w * scale) / 2);
  const ty = Math.round(y - h * scale);
  return (
    <g transform={`translate(${flip ? tx + w * scale : tx} ${ty}) scale(${flip ? -scale : scale} ${scale})`}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </g>
  );
}

function Card({ x, score, delay }: { x: number; score: number; delay: number }) {
  const cells: string[] = [];
  String(score)
    .split('')
    .forEach((ch, i) => {
      const bits = DIGITS[+ch];
      const ox = x + 2 + (score === 10 ? 0 : 2) + i * 4;
      for (let k = 0; k < 15; k++) if (bits[k] === '1') cells.push(`M${ox + (k % 3)} ${146 + Math.floor(k / 3)}h1v1h-1z`);
    });
  return (
    <g className="judge-card" style={{ animationDelay: `${delay}s` }}>
      <rect x={x} y={144} width={13} height={9} fill={score === 10 ? '#F5C542' : '#F4F6FA'} stroke="#18141C" strokeWidth={1} />
      <path d={cells.join('')} fill="#18141C" />
      <rect x={x + 6} y={153} width={1} height={5} fill="#6B7280" />
    </g>
  );
}

export function DunkStage({ kit, name, design, phase, progress = 0, made = true, judges }: { kit: Kit; name: string; design: DunkDesign; phase: 'idle' | 'taps' | 'replay'; progress?: number; made?: boolean; judges?: number[] }) {
  const stage = useMemo(() => toPaths(paintStage()), []);
  const sprites = useMemo(() => {
    const look = lookOf(name, kit.base === '#FFFFFF' ? kit.ink : kit.base);
    const mate = { base: '#3A3D46', ink: '#FFFFFF', trim: '#F5C542', word: 'ALL-STAR' };
    const mateLook = lookOf(`${name} teammate`, '#18141C');
    return { run: toPaths(paint(noBall(DRIBBLE), kit, look, 0)), fly: toPaths(paint(noBall(DUNK), kit, look, 0)), mate: toPaths(paint(noBall(DRIBBLE), mate, mateLook, 0)) };
  }, [name, kit]);
  const [time, setTime] = useState(phase === 'replay' ? 0 : 0);
  const raf = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (phase === 'idle') return setTime(0);
    if (phase === 'taps') return setTime(Math.min(0.7, progress * 0.7));
    const t0 = performance.now();
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / 2200);
      setTime(u);
      if (u < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, progress]);

  const p = path(design, time);
  const slam = phase === 'replay' && made && time >= 0.72 && time < 0.9;
  const clank = phase === 'replay' && !made && time >= 0.7;
  // the ball: in hand on the run, up high in flight, through the rim on a make, off it on a miss
  let ball: [number, number] | null = null;
  if (design.prop === 'lob' && time > 0.2 && time < 0.6) {
    const u = (time - 0.2) / 0.4;
    ball = [96 + (RIM[0] - 30 - 96) * u, 110 - Math.sin(u * Math.PI) * 70 + u * -20];
  } else if (design.prop === 'glass' && time > 0.25 && time < 0.55) {
    const u = (time - 0.25) / 0.3;
    ball = u < 0.6 ? [p.x + (268 - p.x) * (u / 0.6), FLOOR - 40 - (u / 0.6) * 30] : [268 - ((u - 0.6) / 0.4) * 20, FLOOR - 70 + ((u - 0.6) / 0.4) * 4];
  } else if (clank) {
    const u = Math.min(1, (time - 0.7) / 0.3);
    ball = [RIM[0] - 4 - u * 40, RIM[1] - 4 - Math.sin(u * Math.PI) * 26 + u * 70];
  } else if (made && time >= 0.72 && time < 0.92) {
    const u = (time - 0.72) / 0.2;
    ball = [RIM[0] - 4, RIM[1] + u * 30];
  } else if (time < 0.72 && !(design.prop === 'lob' && time <= 0.6)) {
    // windmill and friends swing the ball round the body
    const swing = design.moves.some((m) => ['windmill', 'legs', 'back', 'cradle', 'scorpion', 'pump'].includes(m)) && p.air ? Math.sin(time * 40) * 9 : 0;
    ball = p.air ? [p.x - 10 + swing, p.y - 50 + Math.abs(swing)] : [p.x - 14, p.y - 18 + Math.abs(Math.sin(time * 50)) * 6];
  }
  const shake = slam ? (Math.floor(time * 100) % 2 ? 1 : -1) : 0;
  const hype = judges ? judges.reduce((a, b) => a + b, 0) : 0;
  return (
    <svg className={`dunk-stage${hype >= 45 ? ' hype' : ''}${hype === 50 ? ' fifty' : ''}`} viewBox={`0 0 ${SW} ${SH}`} shapeRendering="crispEdges" role="img" aria-label={t('The dunk contest floor')}>
      {stage.map((s) => (
        <path key={s.fill} d={s.d} fill={s.fill} />
      ))}
      <g className="flashes">
        {[
          [30, 20],
          [64, 40],
          [118, 26],
          [160, 46],
          [204, 18],
          [240, 36],
          [96, 52],
          [182, 30],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 2}h1v5h-1z M${x - 2} ${y}h5v1h-5z`} fill="#FFFFFF" style={{ animationDelay: `${(i * 0.61) % 2.4}s` }} />
        ))}
      </g>
      {/* a teammate: lobbing from the wing, or standing in the way to be jumped over */}
      {design.prop === 'lob' && <Sprite paths={sprites.mate} x={96} y={FLOOR - 6} scale={1.15} flip />}
      {design.prop === 'over' && <Sprite paths={sprites.mate} x={(TAKEOFF[design.takeoff] ?? 196) + 14} y={FLOOR} scale={1.2} />}
      {/* rim and net, shaking on a slam */}
      <g transform={`translate(0 ${shake})`}>
        <path d={`M${RIM[0] - 14} ${RIM[1]}h14v2h-14z`} fill="#E2551B" />
        <path d={`M${RIM[0] - 13} ${RIM[1] + 2}h1v9h-1z M${RIM[0] - 9} ${RIM[1] + 2}h1v10h-1z M${RIM[0] - 5} ${RIM[1] + 2}h1v10h-1z M${RIM[0] - 2} ${RIM[1] + 2}h1v9h-1z M${RIM[0] - 12} ${RIM[1] + 6}h10v1h-10z M${RIM[0] - 11} ${RIM[1] + 10}h8v1h-8z`} fill="#F4F6FA" className={slam ? 'whip' : ''} />
      </g>
      <Sprite paths={p.air ? sprites.fly : sprites.run} pose={p.air ? DUNK : DRIBBLE} x={p.x} y={p.y} flip={p.flip} />
      {ball && (
        <g transform={`translate(${Math.round(ball[0]) - 3} ${Math.round(ball[1]) - 3})`}>
          <rect x="1" y="0" width="5" height="7" fill="#18141C" />
          <rect x="0" y="1" width="7" height="5" fill="#18141C" />
          <rect x="1" y="1" width="5" height="5" fill="#E07028" />
          <rect x="3" y="1" width="1" height="5" fill="#4A2210" />
          <rect x="1" y="3" width="5" height="1" fill="#4A2210" />
          <rect x="1" y="1" width="1" height="1" fill="#FFD7B0" />
        </g>
      )}
      {/* the judges' table */}
      <rect x="0" y="164" width="120" height="16" fill="#1D428A" />
      <rect x="0" y="164" width="120" height="2" fill="#F5C542" />
      {[10, 32, 54, 76, 98].map((x, i) => (
        <g key={x}>
          <rect x={x + 3} y={158} width={6} height={6} fill={['#8A5534', '#F1C9A5', '#C68A5E', '#523020', '#E0A982'][i]} />
          <rect x={x + 3} y={157} width={6} height={2} fill="#1C1512" />
        </g>
      ))}
      {phase === 'replay' && time >= 1 && judges && judges.map((j, i) => <Card key={i} x={[10, 32, 54, 76, 98][i] - 1} score={j} delay={0.15 + i * 0.28} />)}
    </svg>
  );
}
