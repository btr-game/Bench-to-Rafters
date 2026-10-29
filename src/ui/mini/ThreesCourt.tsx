import { useEffect, useMemo, useState } from 'react';
import type { Kit } from '../../content/teamStyle';
import { toPaths, DIGITS } from '../art/pixel';
import { blankGrid, paintCrowd, paintFloor, paintRibbon } from '../art/arena';
import { ballValue, THREES } from '../../engine/mini/threes';
import { mix } from '../art/color';
import { paint, noBall, DRIBBLE, JUMPER } from '../art/sprite';
import { lookOf } from '../art/Player';

// The three-point contest arena (round 17), in pixels: a crowd behind the glass, the hoop and
// net, a hardwood floor with the arc, five racks round it (the money rack in red, white and
// blue), the shooter at his rack, every ball flying to the rim, the net snapping on a swish,
// camera flashes, an LED scoreboard, and flames when he is on fire.

export type ShotResult = 'swish' | 'make' | 'rim' | 'miss';
type Ball = 'todo' | 'make' | 'miss';

const SW = 320;
const SH = 180;
const RIM: [number, number] = [160, 45];
const RACKS: [number, number][] = [
  [30, 88],
  [74, 134],
  [160, 156],
  [246, 134],
  [290, 88],
];

/** The arena, painted once: crowd, ad ribbon, glass, the floor and its lines. */
function paintArena(accent: string): string[][] {
  const g = blankGrid(SW, SH);
  paintCrowd(g, 62);
  paintRibbon(g, 62, '3-POINT CONTEST  ALL-STAR SATURDAY  ');
  paintFloor(g, 69);
  // the painted lane, the free-throw circle, the arc and the baseline
  for (let y = 69; y < 122; y++) {
    const half = 30 + (y - 69) * 0.36;
    for (let x = Math.floor(160 - half); x <= 160 + half; x++) g[y][x] = mix(mix(g[y][x], accent, 0.42), '#FFFFFF', 0.08);
  }
  const line = '#F4F1EA';
  for (let x = 0; x < SW; x++) g[69][x] = line;
  for (let a = 0; a <= Math.PI; a += 0.004) {
    const x = Math.round(160 + Math.cos(a) * 130);
    const y = Math.round(72 + Math.sin(a) * 82);
    if (y >= 69 && y < SH) g[y][x] = line;
    const fx = Math.round(160 + Math.cos(a) * 30);
    const fy = Math.round(122 + Math.sin(a) * 12);
    if (fy < SH) g[fy][fx] = line;
  }
  for (let x = 130; x <= 190; x++) g[122][x] = line;
  // the glass, its frame and the shooter's square; the arm that holds it
  for (let y = 0; y < 12; y++) for (let x = 156; x < 164; x++) g[y][x] = x === 156 || x === 163 ? '#2A2D34' : '#4A4F5A';
  for (let y = 12; y < 46; y++)
    for (let x = 126; x < 194; x++) {
      const frame = y === 12 || y === 45 || x === 126 || x === 193;
      const square = (y >= 30 && y <= 44 && (x === 148 || x === 171)) || (y === 30 && x >= 148 && x <= 171);
      g[y][x] = frame ? '#E8ECF2' : square ? '#F4F6FA' : mix(g[y][x], '#9FC6DE', 0.35);
    }
  // ball racks
  for (const [rx, ry] of RACKS) for (let y = ry; y < ry + 5; y++) for (let x = rx - 9; x <= rx + 9; x++) g[y][x] = y === ry ? '#9AA2B0' : x === rx - 9 || x === rx + 9 ? '#6B7280' : y === ry + 4 ? '#4B515C' : g[y][x];
  return g;
}

// money balls in the old red, white and blue
const ballColors = (money: boolean, k: number) => (money ? ['#C8102E', '#F4F6FA', '#1D428A'][k % 3] : '#E07028');

function PixelBall({ x, y, money = false }: { x: number; y: number; money?: boolean }) {
  const c = money ? '#C8102E' : '#E07028';
  return (
    <g transform={`translate(${Math.round(x) - 2} ${Math.round(y) - 2})`}>
      <rect x="1" y="0" width="3" height="5" fill="#18141C" />
      <rect x="0" y="1" width="5" height="3" fill="#18141C" />
      <rect x="1" y="1" width="3" height="3" fill={c} />
      {money ? <rect x="2" y="1" width="1" height="3" fill="#F4F6FA" /> : <rect x="2" y="1" width="1" height="3" fill="#4A2210" />}
      <rect x="1" y="1" width="1" height="1" fill="#FFD7B0" />
    </g>
  );
}

function Led({ x, y, text, color = '#FFB21E' }: { x: number; y: number; text: string; color?: string }) {
  const cells: [number, number][] = [];
  [...text].forEach((ch, i) => {
    const bits = /\d/.test(ch) ? DIGITS[+ch] : ch === ':' ? '000010000010000' : '';
    for (let k = 0; k < 15; k++) if (bits[k] === '1') cells.push([x + i * 4 + (k % 3), y + Math.floor(k / 3)]);
  });
  return <path d={cells.map(([a, b]) => `M${a} ${b}h1v1h-1z`).join('')} fill={color} />;
}

interface Flight {
  n: number;
  result: ShotResult;
  from: [number, number];
  money: boolean;
}

export function ThreesCourt({ kit, name, accent, rack, balls, moneyRack, onFire, shot, score, left }: { kit: Kit; name: string; accent: string; rack: number; balls: Ball[]; moneyRack: number; onFire: boolean; shot: { n: number; result: ShotResult } | null; score: number; left: number }) {
  const arena = useMemo(() => toPaths(paintArena(accent)), [accent]);
  const shooter = useMemo(() => {
    const look = lookOf(name, kit.base === '#FFFFFF' ? kit.ink : kit.base);
    return { stand: toPaths(paint(DRIBBLE, kit, look, 0)), shoot: toPaths(paint(noBall(JUMPER), kit, look, 0)) };
  }, [name, kit]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [rip, setRip] = useState(0);
  const [shooting, setShooting] = useState(false);
  const [rx, ry] = RACKS[Math.min(4, rack)];
  // the shooter stands on the outside of his rack
  const sx = rx + (rx < 120 ? 14 : rx > 200 ? -14 : 16);
  const sy = ry + 4;
  // the ball leaves from over his head, where the jumper holds it
  const hand: [number, number] = [sx - JUMPER.w / 2 + 14, sy - JUMPER.h + 2];
  const body = shooting ? JUMPER : DRIBBLE;

  useEffect(() => {
    if (!shot) return;
    const i = shot.n;
    setFlight({ n: i, result: shot.result, from: hand, money: ballValue(Math.floor(i / THREES.balls), i % THREES.balls, moneyRack) === THREES.money });
    setShooting(true);
    const t = setTimeout(() => setShooting(false), 380);
    return () => clearTimeout(t);
    // the hand is where the shot left from: the rack at the moment of the shot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot?.n]);

  useEffect(() => {
    if (!flight) return;
    const t0 = performance.now();
    const [x0, y0] = flight.from;
    const [x1, y1] = RIM;
    const peak = Math.min(y0, y1) - 34;
    const res = flight.result;
    // where the ball ends up after the rim
    const end: [number, number] = res === 'swish' || res === 'make' ? [x1, 64] : res === 'rim' ? [x1 + (x0 < 160 ? 26 : -26), 66] : [x1 + (x0 < 160 ? -14 : 14), 66];
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - t0) / 560;
      if (t < 1) {
        // up and over to the rim (a short ball falls a little shy of it)
        const tx = res === 'miss' ? x1 + (x0 < 160 ? -9 : 9) : x1;
        const ty = res === 'miss' ? y1 + 2 : y1 - 2;
        const x = x0 + (tx - x0) * t;
        const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * peak + t * t * ty;
        setPos([x, y]);
      } else if (t < 1.7) {
        const u = (t - 1) / 0.7;
        const sx0 = res === 'miss' ? x1 + (x0 < 160 ? -9 : 9) : x1;
        const bounce = res === 'rim' ? -10 * Math.sin(Math.PI * u) : res === 'make' ? -3 * Math.sin(Math.PI * Math.min(1, u * 2)) : 0;
        setPos([sx0 + (end[0] - sx0) * u, y1 + (end[1] - y1) * u + bounce]);
        if (u > 0.05 && (res === 'swish' || res === 'make')) setRip(flight.n);
      } else {
        setPos(null);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [flight]);

  const mins = Math.max(0, Math.ceil(left));
  return (
    <svg className={`threes-court${onFire ? ' fire' : ''}`} viewBox={`0 0 ${SW} ${SH}`} shapeRendering="crispEdges" role="img" aria-label={`Three-point contest: ${score} points, ${mins} seconds left`}>
      {arena.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
      {/* camera flashes in the crowd */}
      <g className="flashes">
        {[
          [22, 18],
          [70, 34],
          [104, 22],
          [214, 28],
          [252, 16],
          [290, 40],
          [40, 46],
          [232, 50],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 2}h1v5h-1z M${x - 2} ${y}h5v1h-5z`} fill="#FFFFFF" style={{ animationDelay: `${(i * 0.77) % 3}s` }} />
        ))}
      </g>
      {/* the rim and the net */}
      <g className={`net${rip ? ' rip' : ''}`} key={rip}>
        <path d="M152 47h16v1h-16z M153 48h1v1h-1z M156 48h1v1h-1z M159 48h1v1h-1z M162 48h1v1h-1z M165 48h1v1h-1z M154 50h1v1h-1z M157 50h1v1h-1z M160 50h1v1h-1z M163 50h1v1h-1z M155 52h1v1h-1z M158 52h1v1h-1z M161 52h1v1h-1z M164 52h1v1h-1z M156 54h1v1h-1z M159 54h1v1h-1z M162 54h1v1h-1z M157 56h7v1h-7z" fill="#F4F6FA" />
        <path d="M153 47v9h1v-9z M166 47v9h1v-9z" fill="#C9CFDA" />
      </g>
      <path d="M150 45h20v2h-20z" fill="#E2551B" />
      <path d="M150 45h20v1h-20z" fill="#FF7A3A" />
      {onFire && (
        <g className="flames">
          <path d="M150 42h2v3h-2z M154 40h2v5h-2z M158 41h3v4h-3z M163 39h2v6h-2z M167 42h2v3h-2z" fill="#FF8A1E" />
          <path d="M151 43h1v2h-1z M155 42h1v3h-1z M159 43h1v2h-1z M164 41h1v4h-1z M168 43h1v2h-1z" fill="#FFE07A" />
        </g>
      )}
      {/* balls left on the racks */}
      {RACKS.map(([x, y], r) =>
        Array.from({ length: 5 }, (_, b) => {
          const k = r * 5 + b;
          if (balls[k] !== 'todo') return null;
          const money = ballValue(r, b, moneyRack) === THREES.money;
          return <rect key={k} x={x - 7 + b * 3} y={y - 3} width="2" height="3" fill={ballColors(money, b)} />;
        }),
      )}
      {/* the shooter */}
      <g transform={`translate(${Math.round(sx - body.w / 2)} ${sy - body.h})`}>
        {(shooting ? shooter.shoot : shooter.stand).map((p) => (
          <path key={p.fill} d={p.d} fill={p.fill} />
        ))}
      </g>
      {pos && <PixelBall x={pos[0]} y={pos[1]} money={flight?.money} />}
      {onFire && pos && <path d={`M${Math.round(pos[0]) + 3} ${Math.round(pos[1]) - 1}h3v1h-3z M${Math.round(pos[0]) + 5} ${Math.round(pos[1]) + 1}h3v1h-3z`} fill="#FF8A1E" />}
      {/* the scoreboard */}
      <rect x="6" y="6" width="44" height="22" fill="#0A0B0E" stroke="#3A3F4A" />
      <Led x={10} y={10} text={String(score).padStart(2, '0')} />
      <Led x={30} y={10} text={String(mins).padStart(2, '0')} color={mins <= 10 ? '#FF4A4A' : '#3BE37A'} />
      <path d="M10 19h36v1h-36z" fill="#3A3F4A" />
      <Led x={10} y={21} text={String(balls.filter((b) => b !== 'todo').length).padStart(2, '0')} color="#9AA2B0" />
    </svg>
  );
}
