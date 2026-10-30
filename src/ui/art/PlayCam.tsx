import { useEffect, useMemo, useRef, useState } from 'react';
import { blankGrid, paintCrowd } from './arena';
import { mix } from './color';
import { glyph, toPaths } from './pixel';

// The play camera (round 19): playoff and title plays shown on the ball, not the player. A close
// shot of the backboard and the rim, the game clock in LED digits above the glass, the crowd in
// the dark behind, and the ball doing what the text says: a three arcing in and swishing, a dunk
// slamming through with the rim shaking, a layup kissed off the glass, a free throw, a rim-out, a
// block swatted away, a steal poked loose. On a buzzer beater the clock runs out as the ball
// drops and the glass's LED strip turns red.

type PlayKind = 'three' | 'jumper' | 'layup' | 'dunk' | 'ft' | 'miss' | 'block' | 'steal' | 'buzzer';

const W = 160;
const H = 90;
const RIM: [number, number] = [80, 56];
const DUR: Record<PlayKind, number> = { three: 1500, jumper: 1300, layup: 1300, dunk: 1100, ft: 1300, miss: 1600, block: 1300, steal: 1200, buzzer: 2200 };

/** What a line of play-by-play shows, from its tag and its words; null for plays with no shot. */
export function playKind(text: string, tag = '', pts = 0): PlayKind | null {
  const t = text.toLowerCase();
  if (tag === 'BUZZER' || /buzzer|at the horn/.test(t)) return /rims out|no good|misses/.test(t) ? 'miss' : 'buzzer';
  if (tag === 'BLOCK' || /block|swat|reject/.test(t)) return 'block';
  if (tag === 'STEAL' || /steal|passing lane|strip/.test(t)) return 'steal';
  if (tag === 'MISS' || /rims out|no good|misses|off the rim/.test(t)) return 'miss';
  if (/dunk|slam|throws it down|jam|lob|alley/.test(t)) return 'dunk';
  if (pts === 3 || /three|from deep|3-pointer/.test(t)) return 'three';
  if (pts === 1 || /free throw|at the line/.test(t)) return 'ft';
  if (/layup|finish|rim|inside|post|drive|floater|putback|scores/.test(t)) return 'layup';
  if (pts === 2 || /jumper|pull-up|turnaround|good|hits/.test(t)) return 'jumper';
  return null;
}

const quad = (a: number, b: number, c: number, u: number) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp01 = (u: number) => Math.max(0, Math.min(1, u));

/** Where the ball is at time u (0 to 1), and what the rim, net and glass are doing. */
function frame(kind: PlayKind, u: number): { x: number; y: number; show: boolean; shake: number; swish: number; hand?: [number, number]; flash: number } {
  const [rx, ry] = RIM;
  const through = (u0: number) => {
    // after reaching the rim at u0, the ball drops through the net
    const v = clamp01((u - u0) / (1 - u0));
    return { x: rx, y: lerp(ry - 2, H + 10, v * v), swish: v > 0 && v < 0.5 ? 1 - v * 2 : 0 };
  };
  switch (kind) {
    case 'three':
    case 'jumper':
    case 'buzzer': {
      const f = kind === 'jumper' ? 0.6 : 0.68;
      if (u < f) {
        const v = u / f;
        const x0 = kind === 'jumper' ? 14 : -8;
        return { x: quad(x0, 46, rx, v), y: quad(86, kind === 'jumper' ? 4 : -14, ry - 2, v), show: true, shake: 0, swish: 0, flash: 0 };
      }
      const t = through(f);
      return { ...t, show: true, shake: 0, flash: kind === 'buzzer' ? clamp01((u - f) * 4) : 0 };
    }
    case 'ft': {
      if (u < 0.65) {
        const v = u / 0.65;
        return { x: lerp(rx + 2, rx, v), y: quad(H + 8, 2, ry - 2, v), show: true, shake: 0, swish: 0, flash: 0 };
      }
      return { ...through(0.65), show: true, shake: 0, flash: 0 };
    }
    case 'layup': {
      // up off the glass: to the box, then down into the rim
      if (u < 0.45) {
        const v = u / 0.45;
        return { x: quad(150, 120, 92, v), y: quad(92, 40, 36, v), show: true, shake: 0, swish: 0, flash: 0 };
      }
      if (u < 0.62) {
        const v = (u - 0.45) / 0.17;
        return { x: lerp(92, rx, v), y: lerp(36, ry - 2, v), show: true, shake: 0, swish: 0, flash: 0 };
      }
      return { ...through(0.62), show: true, shake: 0, flash: 0 };
    }
    case 'dunk': {
      if (u < 0.35) {
        const v = u / 0.35;
        return { x: lerp(108, rx + 2, v), y: lerp(-12, ry - 6, v * v), show: true, shake: 0, swish: 0, hand: [lerp(108, rx + 2, v) + 3, lerp(-12, ry - 6, v * v) - 7], flash: 0 };
      }
      const t = through(0.35);
      const s = clamp01(1 - (u - 0.35) * 3);
      return { ...t, show: true, shake: Math.sin(u * 60) * 2 * s, swish: Math.max(t.swish, s), hand: u < 0.5 ? [rx + 5, ry - 13] : undefined, flash: s };
    }
    case 'miss': {
      if (u < 0.5) {
        const v = u / 0.5;
        return { x: quad(-8, 46, rx - 7, v), y: quad(86, -12, ry - 3, v), show: true, shake: 0, swish: 0, flash: 0 };
      }
      // off the front of the rim, up, and away
      const v = (u - 0.5) / 0.5;
      const s = clamp01(1 - v * 3);
      return { x: lerp(rx - 7, 150, v), y: quad(ry - 3, 20, H + 12, v), show: true, shake: Math.sin(u * 70) * 1.5 * s, swish: 0, flash: 0 };
    }
    case 'block': {
      if (u < 0.5) {
        const v = u / 0.5;
        return { x: quad(-8, 30, 58, v), y: quad(86, 10, 26, v), show: true, shake: 0, swish: 0, hand: u > 0.32 ? [lerp(110, 64, (u - 0.32) / 0.18), lerp(-6, 18, (u - 0.32) / 0.18)] : undefined, flash: 0 };
      }
      const v = (u - 0.5) / 0.5;
      return { x: lerp(58, -20, v), y: quad(26, 2, 60, v), show: true, shake: 0, swish: 0, hand: v < 0.4 ? [62, 18] : undefined, flash: clamp01(1 - v * 2) };
    }
    case 'steal': {
      // a low dribble across the frame, a hand pokes it loose
      if (u < 0.5) {
        const v = u / 0.5;
        return { x: lerp(10, 80, v), y: 84 - Math.abs(Math.sin(v * Math.PI * 3)) * 16, show: true, shake: 0, swish: 0, flash: 0 };
      }
      const v = (u - 0.5) / 0.5;
      return { x: lerp(80, 170, v), y: quad(84, 50, 88, v), show: true, shake: 0, swish: 0, hand: v < 0.35 ? [74, 70] : undefined, flash: clamp01(1 - v * 2) };
    }
  }
}

const LABEL: Record<PlayKind, string> = { three: 'Splash', jumper: 'Bucket', layup: 'Off the glass', dunk: 'Slam!', ft: 'Free throw', miss: 'No good', block: 'Rejected!', steal: 'Stolen!', buzzer: 'At the buzzer!' };

function paintBack(accent: string): string[][] {
  const g = blankGrid(W, H);
  paintCrowd(g, H, 21);
  // the crowd sinks into the dark, a spotlight on the hoop
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - 80) / 1.6, y - 44);
      g[y][x] = mix(g[y][x], '#0B0D12', 0.62);
      if (d < 46) g[y][x] = mix(g[y][x], '#2A2F3A', 0.6 * (1 - d / 46));
    }
  // the stanchion arm behind the glass, in the team colour
  for (let y = 0; y < 18; y++) for (let x = 77; x < 83; x++) g[y][x] = mix(accent, '#000000', 0.35);
  return g;
}

/** LED digits as rects, 1 unit a dot. */
function led(text: string, x0: number, y0: number): string {
  let d = '';
  [...text].forEach((ch, i) => {
    if (ch === ' ') return;
    const bits = ch === ':' ? '000010000010000' : ch === '.' ? '000000000000010' : glyph(ch);
    for (let k = 0; k < 15; k++) if (bits[k] === '1') d += `M${x0 + i * 4 + (k % 3)} ${y0 + Math.floor(k / 3)}h1v1h-1z`;
  });
  return d;
}

const BALL = (() => {
  // a 9x9 pixel ball: outline, two tones, seams
  const rows = ['..OOOOO..', '.ObBBBBO.', 'ObBBLBBBO', 'OBBBLBBBO', 'OLLLLLLLO', 'OBBBLBBbO', 'OBBBLBBbO', '.OBBLBbO.', '..OOOOO..'];
  const pal: Record<string, string> = { O: '#1B1820', B: '#E8782A', b: '#F5A15F', L: '#6A3416' };
  return toPaths(rows.map((r) => [...r].map((c) => pal[c] ?? '')));
})();

const HAND = (() => {
  const rows = ['.O.O.O.', 'OSOSOSO', 'OSSSSSO', 'OSSSSSO', '.OSSSO.', '..OSO..', '..OSO..'];
  const pal: Record<string, string> = { O: '#1B1820', S: '#8A5534' };
  return toPaths(rows.map((r) => [...r].map((c) => pal[c] ?? '')));
})();

/**
 * Plays one shot each time `play` changes (a new key). Plays that arrive while one is running
 * wait their turn; only the latest waiting one is shown, so a fast reel never stacks up.
 */
export function PlayCam({ play, clock, accent = '#E8590C', label = true }: { play: { key: string; kind: PlayKind } | null; clock?: string; accent?: string; label?: boolean }) {
  const back = useMemo(() => toPaths(paintBack(accent)), [accent]);
  const [cur, setCur] = useState<{ key: string; kind: PlayKind } | null>(null);
  const [u, setU] = useState(1);
  const waiting = useRef<{ key: string; kind: PlayKind } | null>(null);
  const busy = useRef(false);
  const raf = useRef(0);

  const start = (p: { key: string; kind: PlayKind }) => {
    busy.current = true;
    setCur(p);
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setU(1);
      busy.current = false;
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const v = Math.min(1, (now - t0) / DUR[p.kind]);
      setU(v);
      if (v < 1) raf.current = requestAnimationFrame(tick);
      else {
        busy.current = false;
        const w = waiting.current;
        waiting.current = null;
        if (w) start(w);
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!play || play.key === cur?.key) return;
    if (busy.current) waiting.current = play;
    else start(play);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play?.key]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const kind = cur?.kind ?? null;
  const f = kind ? frame(kind, u) : null;
  const buzzer = kind === 'buzzer';
  // the clock: the given time, or on a buzzer beater three seconds running out as the ball drops
  const shown = buzzer ? (u >= 0.68 ? '0.0' : (3 * (1 - u / 0.68)).toFixed(1)) : (clock ?? '');
  const red = buzzer && u >= 0.68;
  const shake = f?.shake ?? 0;
  const swish = f?.swish ?? 0;
  const [rx, ry] = RIM;
  const net = Array.from({ length: 6 }, (_, i) => {
    const top = rx - 12 + i * 4.8;
    const bot = rx - 7 + i * 2.8 + (i - 2.5) * swish * 1.6;
    return `M${Math.round(top)} ${ry + 2}L${Math.round(bot)} ${Math.round(ry + 15 + swish * 4)}`;
  }).join('');
  return (
    <div className={`play-cam${red ? ' buzz' : ''}`} data-play={kind ?? 'idle'}>
      <svg viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label={kind ? LABEL[kind] : 'The rim'}>
        {back.map((p) => (
          <path key={p.fill} d={p.d} fill={p.fill} />
        ))}
        {/* the game clock above the glass */}
        <rect x="58" y="3" width="44" height="12" fill="#0A0B0E" stroke="#3A3F4A" />
        <path d={led(shown.padStart(5, ' ').slice(-5), 60, 6)} fill={red ? '#FF3B3B' : '#FFB21E'} />
        <g transform={`translate(${Math.round(shake)} 0)`}>
          {/* the glass, its LED strip and the shooter's square */}
          <rect x="46" y="18" width="68" height="40" fill="#BFD9EA" fillOpacity="0.28" stroke={red ? '#FF3B3B' : '#E8ECF2'} strokeWidth="2" />
          {red && <rect x="44" y="16" width="72" height="44" fill="none" stroke="#FF3B3B" strokeWidth="1" className="cam-strip" />}
          <rect x="68" y="38" width="24" height="17" fill="none" stroke="#F4F6FA" strokeWidth="1.4" />
          {/* the back of the rim */}
          <path d={`M${rx - 13} ${ry}h26v1h-26z`} fill="#A63D12" />
        </g>
        {f && f.show && (
          <g transform={`translate(${Math.round(f.x) - 4} ${Math.round(f.y) - 4})`}>
            {BALL.map((p) => (
              <path key={p.fill} d={p.d} fill={p.fill} />
            ))}
          </g>
        )}
        <g transform={`translate(${Math.round(shake)} 0)`}>
          <path d={net} stroke="#F4F6FA" strokeWidth="1" fill="none" opacity="0.9" />
          <path d={`M${rx - 11} ${ry + 7}h22M${rx - 9} ${ry + 12}h18`} stroke="#F4F6FA" strokeWidth="0.8" opacity="0.7" />
          {/* the front of the rim */}
          <path d={`M${rx - 14} ${ry + 1}h28v2h-28z`} fill="#E2551B" />
        </g>
        {f?.hand && (
          <g transform={`translate(${Math.round(f.hand[0]) - 7} ${Math.round(f.hand[1]) - 7}) scale(2)`}>
            {HAND.map((p) => (
              <path key={p.fill} d={p.d} fill={p.fill} />
            ))}
          </g>
        )}
        {f && f.flash > 0 && <rect x="0" y="0" width={W} height={H} fill={kind === 'block' || kind === 'steal' ? '#1C7ED6' : '#FFFFFF'} opacity={f.flash * 0.18} />}
      </svg>
      {label && kind && u > 0.55 && (
        <div key={cur?.key} className={`cam-label cam-${kind}`}>
          {LABEL[kind]}
        </div>
      )}
    </div>
  );
}
