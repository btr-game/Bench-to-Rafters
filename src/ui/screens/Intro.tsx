// The intro page (round 27). The owner: "for first starters, an intro page with pretty much just
// the title and a very short descriptor of the game ... an animation of the avatars playing in the
// background", then, after a first version: "the title card is large and pixelated ... do the pickup
// game with pixel art, but the players can be large, occupying almost one fourth or third of the
// page. instead of changing the background court randomly ... go from high school, college,
// streetball (easter egg), other league, nba". Every graphic is pixel art: the title is set in a
// 5 by 7 pixel font, the venues are drawn on a 160 by 90 grid, the players are the game's sprites.
// Shown once to someone with nothing on this device yet, and any time from the start page.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../../store';
import { PlayerArt, withoutBall } from '../art/Player';
import { CHEER, DRIBBLE, JUMPER, LOWDRIBBLE, RUN_A, RUN_B, type Pose } from '../art/sprite';
import { toPaths } from '../art/pixel';
import { PixelWord } from '../art/PixelText';
import { Icon } from '../art/Icon';
import { musicAudible, setMusic, soundSettings } from '../sound';

// ---------- the venues, a career in order ----------
type Px = [number, number, number, number, string];
const SKIN = ['#F3D2B8', '#D4A077', '#B67F55', '#8E5B3A', '#6B4029'];

/** Rows of fans across the back wall: `rows` rows from `top`, darker further back. */
function fans(out: Px[], top: number, rows: number, shirts: string[], seed: number, gap = 0): void {
  for (let r = 0; r < rows; r++) {
    const y = top + r * 7;
    const dim = 0.45 + (0.5 * r) / Math.max(1, rows - 1);
    for (let i = 0; i < 27; i++) {
      if (gap && (i * 5 + r * 3 + seed) % gap === 0) continue;
      const x = i * 6 + (r % 2) * 3;
      const k = (i * 7 + r * 11 + seed) % 23;
      out.push([x + 1, y, 3, 3, shade(SKIN[k % SKIN.length], dim)]);
      out.push([x, y + 3, 5, 4, shade(shirts[k % shirts.length], dim)]);
    }
  }
}
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * f).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}
/** The floor: planks, the lines, the paint at both ends and the centre circle. */
function floor(out: Px[], wood: [string, string], paint: string, line = '#F4F1EA'): void {
  out.push([0, 60, 160, 30, wood[0]]);
  for (let x = 0; x < 160; x += 8) out.push([x, 60, 1, 30, wood[1]]);
  out.push([0, 60, 22, 30, paint], [138, 60, 22, 30, paint]);
  out.push([0, 60, 160, 1, line], [22, 60, 1, 30, line], [137, 60, 1, 30, line], [80, 60, 1, 30, line]);
  // the centre circle, flattened by the side view
  for (const [x, y, w] of [[73, 66, 15], [71, 67, 2], [88, 67, 2], [70, 68, 1], [90, 68, 1], [70, 69, 1], [90, 69, 1], [71, 70, 2], [88, 70, 2], [73, 71, 15]] as [number, number, number][]) out.push([x, y, w, 1, line]);
}

export const VENUES: { cls: string; where: string; draw: () => Px[] }[] = [
  {
    cls: 'v-hs',
    where: 'High school',
    draw: () => {
      const o: Px[] = [[0, 0, 160, 60, '#C9B48A']];
      for (let y = 4; y < 60; y += 5) o.push([0, y, 160, 1, '#B39C70']);
      o.push([40, 6, 80, 7, '#B22222'], [41, 7, 78, 5, '#C92A2A']);
      o.push([74, 8, 12, 3, '#F4F1EA']);
      // the pulled-out bleachers, a few families in them
      for (let r = 0; r < 4; r++) o.push([0, 38 + r * 5, 160, 2, '#8B5A2B'], [0, 40 + r * 5, 160, 1, '#5E3A1C']);
      fans(o, 31, 3, ['#C92A2A', '#F1F3F5', '#1C7ED6'], 3, 2);
      floor(o, ['#E0B47A', '#CFA066'], '#B22222');
      return o;
    },
  },
  {
    cls: 'v-college',
    where: 'College',
    draw: () => {
      const o: Px[] = [[0, 0, 160, 60, '#24151A']];
      fans(o, 14, 6, ['#862E2E', '#F1F3F5', '#862E2E', '#E9C46A'], 7);
      o.push([0, 56, 160, 4, '#862E2E'], [0, 57, 160, 1, '#F1F3F5']);
      floor(o, ['#C4874A', '#AE743C'], '#862E2E');
      return o;
    },
  },
  {
    cls: 'v-street',
    where: 'Streetball',
    draw: () => {
      const o: Px[] = [];
      ['#5AA0D8', '#6CAEE0', '#7EBCE6', '#93C9EC', '#A9D6F0'].forEach((c, i) => o.push([0, i * 8, 160, 8, c]));
      // the skyline, its windows lit
      [[4, 22, 14], [20, 14, 10], [32, 26, 16], [50, 10, 12], [64, 20, 18], [84, 16, 10], [96, 24, 14], [112, 12, 12], [126, 22, 16], [144, 18, 16]].forEach(([x, top, w]) => {
        o.push([x, top, w, 60 - top, '#4A5568']);
        for (let y = top + 2; y < 50; y += 4) for (let wx = x + 2; wx < x + w - 1; wx += 3) o.push([wx, y, 1, 2, (wx + y) % 3 ? '#FFE08A' : '#2D3748']);
      });
      // the fence
      o.push([0, 44, 160, 16, '#9AA3AD']);
      for (let x = 0; x < 160; x += 3) o.push([x, 44, 1, 16, '#C9CED6']);
      for (let y = 44; y < 60; y += 3) o.push([0, y, 160, 1, '#C9CED6']);
      floor(o, ['#3B6A96', '#335F89'], '#2F8A5B');
      return o;
    },
  },
  {
    cls: 'v-euro',
    where: 'Overseas',
    draw: () => {
      const o: Px[] = [[0, 0, 160, 60, '#101A33']];
      fans(o, 12, 6, ['#1C5FAD', '#F76707', '#F1F3F5', '#1C5FAD'], 11);
      o.push([0, 55, 160, 5, '#F76707']);
      for (let x = 6; x < 160; x += 14) o.push([x, 56, 3, 3, '#FFE08A']);
      floor(o, ['#D8A262', '#C38E52'], '#1C5FAD');
      return o;
    },
  },
  {
    cls: 'v-nba',
    where: 'The NBA',
    draw: () => {
      const o: Px[] = [[0, 0, 160, 60, '#0B0D14']];
      fans(o, 16, 6, ['#C8102E', '#1D428A', '#F1F3F5', '#FDB927', '#552583'], 5);
      // the scoreboard over centre court
      o.push([62, 1, 36, 14, '#1B1820'], [64, 3, 32, 10, '#2A2D3A'], [66, 5, 12, 6, '#C8102E'], [82, 5, 12, 6, '#1D428A']);
      o.push([0, 56, 160, 4, '#1D428A']);
      for (let x = 2; x < 160; x += 6) o.push([x, 57, 3, 2, x % 12 ? '#FDB927' : '#F1F3F5']);
      floor(o, ['#C98D52', '#B37A45'], '#C8102E');
      return o;
    },
  },
];

export function Venue({ draw }: { draw: () => Px[] }) {
  const px = useMemo(draw, [draw]);
  return (
    <svg className="in-venue" viewBox="0 0 160 90" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
      {px.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
  );
}

// The ball (owner: "make the ball even larger ... the lines are too thin to match the avatar's
// vibes"): drawn on the players' own pixel grid, 11 of their pixels across (about nine tenths of a
// head), with their dark outline and seams a whole pixel thick
const BALL_ROWS = [
  '...OOOOO...',
  '.OOwuLBBOO.',
  '.OuLuLBLbO.',
  'OuLBBLBBLbO',
  'OuLBBLBBLbO',
  'OLLLLLLLLLO',
  'OBLBBLBBLbO',
  'OBLBBLBBLbO',
  '.ObLBLBLbO.',
  '.OObbLbbOO.',
  '...OOOOO...',
];
const BALL_PAL: Record<string, string> = { O: '#1B1820', B: '#E8782A', u: '#F5A15F', w: '#FFD6AA', b: '#C2571B', L: '#3A1E0E' };
const BALL_PATHS = toPaths(BALL_ROWS.map((r) => [...r].map((c) => BALL_PAL[c] ?? '')));
const ball: ReactNode = (
  <span>
    <svg viewBox="0 0 11 11" shapeRendering="crispEdges" aria-hidden="true">
      {BALL_PATHS.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  </span>
);

/** A hoop seen from the side, on a 24 by 40 grid: the stanchion and its pad, the arm, the thin
 * backboard, the rim reaching out over the court and the net under it. Drawn for the left end. */
const HOOP_PX: Px[] = [
  [1, 31, 7, 9, '#1C5FAD'], [2, 32, 5, 7, '#2B78C8'],
  [3, 9, 3, 23, '#3A3D46'], [4, 9, 1, 23, '#5A5E69'],
  [3, 9, 6, 2, '#3A3D46'],
  [8, 1, 3, 17, '#1B1820'], [9, 2, 1, 15, '#E9ECEF'],
  [11, 12, 8, 1, '#1B1820'], [11, 13, 8, 2, '#F76707'], [11, 15, 8, 1, '#C2410C'],
  [11, 16, 1, 2, '#F1F3F5'], [13, 16, 1, 3, '#F1F3F5'], [15, 16, 1, 3, '#F1F3F5'], [17, 16, 1, 2, '#F1F3F5'],
  [12, 18, 1, 2, '#F1F3F5'], [14, 19, 1, 2, '#F1F3F5'], [16, 18, 1, 2, '#F1F3F5'],
  [12, 21, 5, 1, '#F1F3F5'],
];
function SideHoop({ side }: { side: 'l' | 'r' }) {
  return (
    <svg className={`in-hoop ${side}`} viewBox="0 0 24 40" shapeRendering="crispEdges" aria-hidden="true">
      {HOOP_PX.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
  );
}

// round 27 (owner: "the avatars should have motion (running animation, shots, blocks, steals...),
// 2~3 frames per action"): each player is a stack of frames, and the page shows one at a time
const FRAMES: [string, Pose][] = [
  ['run-a', RUN_A],
  ['run-b', RUN_B],
  ['shoot', withoutBall(JUMPER)],
  ['block', CHEER],
  ['steal', withoutBall(LOWDRIBBLE)],
  ['stand', withoutBall(DRIBBLE)],
];
/** A player: A (orange) attacks the right-hand hoop and B (blue) the left, so they always face each other. */
function Mover({ who, name, number, color }: { who: 'a' | 'b'; name: string; number: number; color: string }) {
  return (
    <div className={`in-p in-${who}`}>
      <span className="in-jump">
        <span className="in-frames">
          {FRAMES.map(([k, pose]) => (
            <span key={k} className={`fr fr-${k}`} style={{ height: `calc(var(--pl) * ${pose.h / 36})` }}>
              <PlayerArt name={name} number={number} color={color} kit="road" frame={pose} mirror={who === 'b'} size={240} />
            </span>
          ))}
        </span>
        <span className="in-dribble">{ball}</span>
      </span>
    </div>
  );
}

function IntroCourt() {
  return (
    <div className="in-court" aria-hidden="true">
      {VENUES.map((v) => (
        <div key={v.cls} className={`in-scene ${v.cls}`}>
          <Venue draw={v.draw} />
          <div className="in-where">{v.where}</div>
        </div>
      ))}
      <SideHoop side="l" />
      <SideHoop side="r" />
      <Mover who="a" name="Kai Moreno" number={3} color="#E8590C" />
      <Mover who="b" name="Theo Banks" number={24} color="#1C7ED6" />
      <span className="in-shot r">{ball}</span>
      <span className="in-shot l">{ball}</span>
    </div>
  );
}

/** Round 29: the intro has a tune of its own (tracks.ts), but browsers stay quiet until the first
 * click; this button is that click (or turns the music off). */
function MusicButton() {
  const [, redraw] = useState(0);
  const audible = musicAudible();
  return (
    <button
      className="btn ghost intro-music with-icon"
      aria-pressed={audible}
      onClick={() => {
        if (audible) setMusic(false);
        else if (!soundSettings().music) setMusic(true);
        // the first click wakes the audio a moment later
        setTimeout(() => redraw((n) => n + 1), 200);
      }}
    >
      <Icon name="note" size={20} />
      {audible ? 'Music off' : 'Play the music'}
    </button>
  );
}

export function Intro() {
  const end = useStore((s) => s.endIntro);
  useEffect(() => {
    const key = (e: KeyboardEvent) => (e.key === 'Enter' || e.key === 'Escape') && end();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [end]);
  return (
    <main className="intro">
      <IntroCourt />
      <MusicButton />
      <div className="intro-front">
        <h1 className="in-title">
          <PixelWord text="BENCH" color="#F4F1EA" shade="#1B1820" />
          <PixelWord text="TO RAFTERS" color="#FF6B2C" shade="#5A1E06" />
        </h1>
        <p className="intro-line">From a high school bench to a jersey in the rafters. One career, every choice yours.</p>
        <button className="btn intro-go" onClick={end} autoFocus>
          Start
        </button>
      </div>
    </main>
  );
}
