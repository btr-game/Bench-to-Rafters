import { useMemo } from 'react';
import type { GameState, Pos } from '../../engine/types';
import { team as teamOf } from '../selectors';
import type { Kit } from '../../content/teamStyle';
import { blankGrid, paintCrowd, paintFloor, paintRibbon } from './arena';
import { mix } from './color';
import { glyph, toPaths } from './pixel';
import { kitFor, lookOf, styleLeague } from './Player';
import { POS_STYLE } from './PositionCard';
import { BITE, CHEER, DRIBBLE, DUNK, JUMPER, LOWDRIBBLE, TRIPLE, noBall, paint } from './sprite';
import { awardKeyOf, awardPaths } from './Award';

// Story scenes (round 17): a wide pixel picture at the top of every turning point, storyline
// chapter and story page. Nine places a career happens (the arena, the gym, the city at night,
// home, the agent's office, the clinic, the press room, a street court at sunset, the locker
// room) and four big nights (draft night, a title, an award, a medal), with the player standing
// in it in his team's colours.

type SceneKind = 'arena' | 'gym' | 'night' | 'home' | 'office' | 'clinic' | 'press' | 'street' | 'locker' | 'draft' | 'title' | 'award' | 'medal';

const W = 192;
const H = 72;

/** Which scene a story belongs in, from its title (and kind, for story pages). */
function sceneFor(title: string, kind?: string): SceneKind {
  const t = title.toLowerCase();
  if (kind === 'intro') return 'street';
  if (kind === 'commit') return 'press';
  if (kind === 'draft' || /draft/.test(t)) return 'draft';
  if (kind === 'title' || /champion|title|finals week/.test(t)) return 'title';
  if (kind === 'awards' || /mvp|award|of the year|all-star|all-nba/.test(t)) return 'award';
  if (kind === 'tournament' || /olympic|world cup|medal|national team/.test(t)) return 'medal';
  if (kind === 'injury' || /ankle|knee|injur|hurt|goes down|wrong with|body choice|surgery|load management|rest night|extend your prime/.test(t)) return 'clinic';
  if (kind === 'camp' || /camp|gym|lab|program|5 a\.m|diet|boxing|footwork|handles|move|trainer|shooting form|corner three|off hand|weak spot|glass|explosive|growth spurt|touch|guru|pick-and-roll|study|film/.test(t)) return 'gym';
  if (/party|night out|celebrity|beef online|tempt/.test(t)) return 'night';
  if (/family|baby|sibling|homesick|grades|parent|home$/.test(t)) return 'home';
  if (/agent|contract|deal|nil|sneaker|investment|envelope|booster|bet on yourself|traded|trade|superteam|powerhouse|offer/.test(t)) return 'office';
  if (/media|paper|front page|viral|documentary|story|tape|gaffe|interview|crew/.test(t)) return 'press';
  if (/hometown|court with your name|back home|pickup|pro-am|aau|summer/.test(t)) return 'street';
  if (/coach|veteran|rookie|captain|meeting|new guy|role|teammate|mentor|minutes|system|comfortable|shouting/.test(t)) return 'locker';
  return 'arena';
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const rect = (g: string[][], x0: number, y0: number, w: number, h: number, c: string) => {
  for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) g[y][x] = c;
};
const text = (g: string[][], word: string, x0: number, y0: number, c: string) =>
  [...word].forEach((ch, i) => {
    const b = glyph(ch);
    for (let k = 0; k < 15; k++) if (b[k] === '1' && g[y0 + Math.floor(k / 3)]?.[x0 + i * 4 + (k % 3)] !== undefined) g[y0 + Math.floor(k / 3)][x0 + i * 4 + (k % 3)] = c;
  });
const gradient = (g: string[][], top: string, bottom: string, y0: number, y1: number) => {
  for (let y = y0; y < y1; y++) rect(g, 0, y, W, 1, mix(top, bottom, (y - y0) / Math.max(1, y1 - y0 - 1)));
};

function paintScene(kind: SceneKind, accent: string): string[][] {
  const g = blankGrid(W, H);
  const r = rng(kind.length * 977 + 13);
  switch (kind) {
    case 'arena':
    case 'title':
    case 'medal': {
      paintCrowd(g, 44, kind.length);
      paintRibbon(g, 42, kind === 'medal' ? 'GOLD MEDAL GAME  ' : kind === 'title' ? 'CHAMPIONS  CHAMPIONS  ' : 'TONIGHT  ');
      paintFloor(g, 49);
      for (let x = 0; x < W; x++) g[49][x] = '#F4F1EA';
      // spotlights from the rafters
      for (const cx of [40, 150])
        for (let y = 0; y < 49; y++)
          for (let x = 0; x < W; x++) if (Math.abs(x - cx) < 4 + y * 0.35 && (x + y) % 2 === 0) g[y][x] = mix(g[y][x], '#FFF3BF', 0.25);
      if (kind !== 'arena')
        for (let k = 0; k < 140; k++) {
          const x = Math.floor(r() * W);
          const y = Math.floor(r() * 46);
          g[y][x] = ['#F5C542', '#FFFFFF', accent, '#E03131', '#1C7ED6'][k % 5];
        }
      break;
    }
    case 'gym': {
      gradient(g, '#454B57', '#2E323B', 0, 50);
      for (const x0 of [8, 58, 108, 158]) {
        rect(g, x0, 6, 36, 30, '#5E6675');
        for (let y = 7; y < 35; y++) for (let x = x0 + 1; x < x0 + 35; x++) if ((x - y) % 9 === 0) g[y][x] = '#6F7888';
      }
      text(g, 'WORK', 84, 40, '#F5C542');
      rect(g, 0, 50, W, 22, '#22252B');
      for (let x = 0; x < W; x += 16) rect(g, x, 50, 1, 22, '#2C3038');
      // a dumbbell rack, a squat rack, a plyo box
      rect(g, 10, 42, 40, 3, '#9AA2B0');
      for (let k = 0; k < 5; k++) rect(g, 13 + k * 8, 38, 5, 4, '#18141C');
      for (const x of [130, 150]) rect(g, x, 20, 3, 34, '#9AA2B0');
      rect(g, 126, 26, 30, 2, '#C9CFDA');
      rect(g, 124, 24, 4, 6, '#18141C');
      rect(g, 154, 24, 4, 6, '#18141C');
      rect(g, 166, 46, 18, 10, '#8B5A2B');
      rect(g, 166, 46, 18, 1, '#A8743E');
      break;
    }
    case 'night': {
      gradient(g, '#0B0D2A', '#3A1D52', 0, 56);
      for (let k = 0; k < 40; k++) g[Math.floor(r() * 30)][Math.floor(r() * W)] = '#FFFFFF';
      for (let y = 6; y < 13; y++) for (let x = 160; x < 168; x++) if ((x - 164) ** 2 + (y - 9.5) ** 2 < 13) g[y][x] = '#F4F1D0';
      let x = 0;
      while (x < W) {
        const bw = 14 + Math.floor(r() * 18);
        const bh = 18 + Math.floor(r() * 30);
        rect(g, x, 56 - bh, bw - 2, bh, '#14152A');
        for (let yy = 58 - bh; yy < 54; yy += 4) for (let xx = x + 2; xx < x + bw - 4; xx += 4) if (r() < 0.45) rect(g, xx, yy, 2, 2, r() < 0.5 ? '#F5C542' : '#FFE8A3');
        x += bw;
      }
      text(g, 'CLUB', 22, 30, '#FF4FD8');
      text(g, 'OPEN', 120, 34, '#3BE3FF');
      rect(g, 0, 56, W, 16, '#1B1C26');
      for (let x2 = 0; x2 < W; x2 += 12) rect(g, x2, 63, 6, 1, '#F5C542');
      break;
    }
    case 'home': {
      rect(g, 0, 0, W, 52, '#E8D5B7');
      for (let y = 0; y < 52; y += 8) rect(g, 0, y, W, 1, '#DDC6A3');
      rect(g, 120, 8, 44, 30, '#8B5A2B');
      gradient(g, '#8EC5F0', '#D7EEFF', 0, 0);
      for (let y = 10; y < 36; y++) for (let x = 122; x < 162; x++) g[y][x] = mix('#8EC5F0', '#D7EEFF', (y - 10) / 26);
      rect(g, 141, 10, 2, 26, '#8B5A2B');
      for (const [fx, fc] of [[20, '#B4532A'], [40, '#1C7ED6'], [60, '#2F9E44']] as [number, string][]) {
        rect(g, fx, 12, 14, 12, '#5E3A1C');
        rect(g, fx + 2, 14, 10, 8, fc);
      }
      rect(g, 0, 52, W, 20, '#B98048');
      for (let y = 52; y < H; y += 4) rect(g, 0, y, W, 1, '#A06A35');
      // the sofa in the team colour, a lamp
      rect(g, 14, 38, 70, 14, accent);
      rect(g, 14, 32, 70, 8, mix(accent, '#000000', 0.25));
      rect(g, 14, 52, 4, 4, '#3A2416');
      rect(g, 80, 52, 4, 4, '#3A2416');
      rect(g, 96, 20, 3, 32, '#5E3A1C');
      rect(g, 90, 14, 15, 8, '#FFE8A3');
      break;
    }
    case 'office': {
      rect(g, 0, 0, W, 54, '#D9DCE2');
      rect(g, 20, 6, 152, 34, '#9FC6DE');
      let x = 22;
      while (x < 170) {
        const bw = 10 + Math.floor(r() * 12);
        const bh = 10 + Math.floor(r() * 20);
        rect(g, x, 40 - bh, bw - 2, bh, '#7B97AE');
        for (let yy = 42 - bh; yy < 38; yy += 3) for (let xx = x + 1; xx < x + bw - 3; xx += 3) g[yy][xx] = '#B9D2E3';
        x += bw;
      }
      for (const x2 of [20, 70, 120, 171]) rect(g, x2, 6, 2, 34, '#5A5F6A');
      rect(g, 0, 54, W, 18, '#6B4A2E');
      // the desk, the contract, a laptop, a plant
      rect(g, 50, 44, 100, 6, '#5E3A1C');
      rect(g, 54, 50, 4, 14, '#3A2416');
      rect(g, 142, 50, 4, 14, '#3A2416');
      rect(g, 70, 40, 16, 4, '#FFFFFF');
      for (let k = 0; k < 3; k++) rect(g, 72, 41 + k, 10, 1, '#9AA2B0');
      rect(g, 100, 34, 22, 10, '#3A3D46');
      rect(g, 102, 36, 18, 6, accent);
      rect(g, 172, 38, 8, 16, '#8B5A2B');
      for (let k = 0; k < 14; k++) g[24 + Math.floor(r() * 14)][168 + Math.floor(r() * 16)] = '#2F9E44';
      break;
    }
    case 'clinic': {
      rect(g, 0, 0, W, 54, '#E3F0F2');
      for (let y = 0; y < 54; y += 10) rect(g, 0, y, W, 1, '#D2E4E7');
      rect(g, 24, 10, 16, 16, '#FFFFFF');
      rect(g, 30, 12, 4, 12, '#E03131');
      rect(g, 26, 16, 12, 4, '#E03131');
      rect(g, 0, 54, W, 18, '#C9D6D9');
      for (let x = 0; x < W; x += 8) rect(g, x, 54, 1, 18, '#B7C6C9');
      // the exam bed, an IV stand, a light box with an X-ray
      rect(g, 110, 40, 60, 6, '#FFFFFF');
      rect(g, 110, 46, 60, 3, '#9AA2B0');
      rect(g, 114, 49, 3, 10, '#6B7280');
      rect(g, 163, 49, 3, 10, '#6B7280');
      rect(g, 180, 12, 2, 44, '#9AA2B0');
      rect(g, 176, 12, 10, 8, '#BFE3F0');
      rect(g, 60, 8, 34, 22, '#1B2430');
      for (let y = 11; y < 28; y++) rect(g, 74 + Math.round(Math.sin(y / 3) * 2), y, 4, 1, '#DCE6EC');
      break;
    }
    case 'press':
    case 'award': {
      rect(g, 0, 0, W, 50, kind === 'award' ? '#14161C' : '#F4F6FA');
      for (let y = 2; y < 48; y += 8)
        for (let x = (y / 8) % 2 ? 6 : 0; x < W; x += 12) {
          rect(g, x, y, 6, 4, kind === 'award' ? mix(accent, '#000000', 0.5) : accent);
          if (kind !== 'award') rect(g, x + 1, y + 1, 4, 2, '#FFFFFF');
        }
      if (kind === 'award')
        for (let y = 0; y < 50; y++) for (let x = 0; x < W; x++) if (Math.abs(x - 96) < 6 + y * 0.6 && (x + y) % 2 === 0) g[y][x] = mix(g[y][x], '#FFF3BF', 0.3);
      rect(g, 0, 50, W, 22, kind === 'award' ? '#2A1A30' : '#3A3D46');
      // a table with microphones, or a lectern with the trophy
      if (kind === 'press') {
        rect(g, 30, 44, 132, 8, '#1B1E24');
        for (const x of [50, 70, 90, 110, 130]) {
          rect(g, x, 38, 2, 6, '#5A5F6A');
          rect(g, x - 1, 35, 4, 4, '#18141C');
        }
      } else {
        rect(g, 140, 34, 22, 18, '#5E3A1C');
        rect(g, 146, 22, 10, 12, '#F5C542');
        rect(g, 148, 18, 6, 4, '#E07028');
      }
      break;
    }
    case 'street': {
      gradient(g, '#FF8A5B', '#FFD6A0', 0, 44);
      for (let y = 6; y < 16; y++) for (let x = 140; x < 154; x++) if ((x - 147) ** 2 + (y - 11) ** 2 < 30) g[y][x] = '#FFF0C4';
      // a graffiti wall and a chain-link fence
      rect(g, 0, 26, 110, 22, '#7A4B3A');
      for (let k = 0; k < 9; k++) {
        const cx = 8 + k * 12;
        const c = ['#FF4FD8', '#3BE3FF', '#F5C542', '#2F9E44', accent][k % 5];
        for (let y = 29; y < 45; y++) for (let x = cx - 5; x < cx + 6; x++) if ((x - cx) ** 2 / 25 + (y - 37) ** 2 / 49 < 1 && r() < 0.85) g[y][x] = c;
      }
      text(g, 'HOOPS', 30, 34, '#FFFFFF');
      for (let y = 20; y < 48; y++) for (let x = 110; x < W; x++) if ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0) g[y][x] = '#8E949E';
      rect(g, 0, 48, W, 24, '#3E4148');
      for (let x = 0; x < W; x++) if ((x * 7) % 11 === 0) g[60][x] = '#4A4E56';
      for (let x = 20; x < 170; x++) g[58][x] = '#F4F1EA';
      // the hoop: a pole, a backboard, a chain net
      rect(g, 176, 18, 3, 44, '#6B7280');
      rect(g, 160, 14, 20, 12, '#F4F6FA');
      rect(g, 156, 26, 12, 2, '#E2551B');
      for (let y = 28; y < 34; y++) for (let x = 157; x < 167; x += 2) g[y][x] = '#C9CFDA';
      break;
    }
    case 'locker': {
      rect(g, 0, 0, W, 54, mix(accent, '#14161C', 0.6));
      for (let x = 4; x < W; x += 26) {
        rect(g, x, 4, 22, 44, '#5E3A1C');
        rect(g, x + 2, 6, 18, 40, '#3A2416');
        rect(g, x + 5, 12, 12, 16, accent);
        rect(g, x + 8, 12, 6, 3, mix(accent, '#000000', 0.4));
        text(g, String((x * 3) % 50), x + 7, 18, '#FFFFFF');
      }
      rect(g, 0, 54, W, 18, '#2A2D34');
      for (let y = 56; y < 70; y++) for (let x = 70; x < 122; x++) if ((x - 96) ** 2 / 676 + (y - 63) ** 2 / 49 < 1) g[y][x] = mix(accent, '#2A2D34', 0.5);
      rect(g, 10, 48, 172, 4, '#8B5A2B');
      break;
    }
    case 'draft': {
      gradient(g, '#0E1A3A', '#1D2F63', 0, 50);
      for (let x = 0; x < W; x += 6) rect(g, x, 0, 3, 50, '#16244A');
      for (let k = 0; k < 30; k++) g[Math.floor(r() * 50)][Math.floor(r() * W)] = '#FFFFFF';
      rect(g, 0, 50, W, 22, '#11172A');
      rect(g, 120, 30, 30, 22, '#F4F6FA');
      text(g, 'DRAFT', 125, 38, '#1D2F63');
      rect(g, 60, 6, 72, 12, '#0A0F20');
      text(g, 'ON THE CLOCK', 64, 9, '#F5C542');
      break;
    }
  }
  return g;
}

const POSES = { PG: LOWDRIBBLE, SG: DRIBBLE, SF: JUMPER, PF: TRIPLE, C: DUNK };
const STANDING = noBall(DRIBBLE);
const FIST_UP = noBall(JUMPER);
const COURT: SceneKind[] = ['arena', 'street'];

type Cheer = { mode: 'cheer' | 'bite'; prize: string };

/** Whether a story page celebrates, and how: a trophy over his head, or a medal in his teeth. */
function cheerOf(kind: SceneKind, prize?: string): Cheer | null {
  if (!prize) return null;
  if (kind === 'medal') return /gold|silver|bronze|medal/i.test(prize) ? { mode: 'bite', prize } : null;
  if (kind === 'award' || kind === 'title') return { mode: 'cheer', prize };
  return null;
}

/** The player celebrating (round 19): bouncing with the trophy held high, sparkles round it, or
 * biting the medal. Drawn in the sprite's own units at (x, y), `scale` times. */
function Celebrate({ c, kit, name, number, accent, x, y, scale }: { c: Cheer; kit: Kit; name: string; number: number; accent: string; x: number; y: number; scale: number }) {
  const pose = c.mode === 'cheer' ? CHEER : BITE;
  const sprite = useMemo(() => toPaths(paint(pose, kit, lookOf(name, kit.base === '#FFFFFF' ? kit.ink : kit.base), number)), [pose, kit, name, number]);
  const key = awardKeyOf(c.prize);
  const prize = useMemo(() => awardPaths(key, c.prize, accent), [key, c.prize, accent]);
  const medal = /bronze/i.test(c.prize) ? ['#D08A4E', '#9A5A2A'] : /silver/i.test(c.prize) ? ['#C9CED8', '#8E95A3'] : ['#F5C542', '#C9921E'];
  return (
    <g transform={`translate(${Math.round(x)} ${Math.round(y)}) scale(${scale})`}>
      <g className={c.mode === 'cheer' ? 'cel-bounce' : 'cel-bob'}>
        {sprite.map((p) => (
          <path key={p.fill} d={p.d} fill={p.fill} />
        ))}
        {c.mode === 'cheer' ? (
          <g transform="translate(7 -16) scale(0.75)">
            <g className="cel-wiggle">
              {prize.map((p) => (
                <path key={p.fill} d={p.d} fill={p.fill} />
              ))}
            </g>
          </g>
        ) : (
          <g className="cel-chomp">
            <path d="M14 21L18 17M22 21L19 17" stroke="#1C7ED6" strokeWidth="1.2" />
            <circle cx="18.5" cy="17.5" r="2.6" fill={medal[0]} stroke="#18141C" strokeWidth="0.6" />
            <circle cx="18.5" cy="17.5" r="1.3" fill="none" stroke={medal[1]} strokeWidth="0.6" />
          </g>
        )}
        {[
          [2, -10],
          [29, -6],
          [4, 4],
          [27, 8],
        ].map(([sx, sy], i) => (
          <path key={i} className="cel-spark" style={{ animationDelay: `${i * 0.22}s` }} d={`M${sx} ${sy - 2}h1v5h-1zM${sx - 2} ${sy}h5v1h-5z`} fill="#FFF3BF" />
        ))}
      </g>
    </g>
  );
}

/** A celebration on its own, for the end of a title game or a final. */
export function CelebrationArt({ g, prize, mode = 'cheer' }: { g: GameState; prize: string; mode?: 'cheer' | 'bite' }) {
  const t = teamOf(g);
  const kit = useMemo(() => kitFor(t?.name ?? '', t?.abbr ?? '', t?.color ?? '#2A2F36', 'home', styleLeague(g.stage)), [t?.name, t?.abbr, t?.color, g.stage]);
  return (
    <svg className="art art-celebrate" viewBox="-4 -22 40 60" shapeRendering="crispEdges" role="img" aria-label={`Celebrating: ${prize}`}>
      <Celebrate c={{ mode, prize }} kit={kit} name={g.player.name} number={g.player.number} accent={t?.color ?? '#C8102E'} x={0} y={0} scale={1} />
    </svg>
  );
}

function SceneArt({ kind, kit, name, number, pos, accent, prize }: { kind: SceneKind; kit: Kit; name: string; number: number; pos?: Pos; accent: string; prize?: string }) {
  const bg = useMemo(() => toPaths(paintScene(kind, accent)), [kind, accent]);
  const cheer = cheerOf(kind, prize);
  // on the court he plays his position; at a title or a medal he throws a fist up; off it he just stands
  const pose = kind === 'title' || kind === 'medal' ? FIST_UP : kind === 'gym' ? DUNK : COURT.includes(kind) ? POSES[pos ?? 'SG'] : STANDING;
  const sprite = useMemo(() => toPaths(paint(pose, kit, lookOf(name, kit.base === '#FFFFFF' ? kit.ink : kit.base), number)), [pose, kit, name, number]);
  const scale = 1.5;
  const at = kind === 'office' || kind === 'press' ? 46 : kind === 'clinic' ? 140 : kind === 'draft' ? 92 : 96;
  const x = at - (pose.w * scale) / 2;
  const y = H - 1 - pose.h * scale;
  return (
    <svg className="art art-scene" data-scene={kind} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label={`Scene: ${kind}`}>
      {bg.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
      {cheer ? (
        <Celebrate c={cheer} kit={kit} name={name} number={number} accent={accent} x={96 - 16 * 1.3} y={H - 1 - 36 * 1.3} scale={1.3} />
      ) : (
        <g transform={`translate(${Math.round(x)} ${Math.round(y)}) scale(${scale})`}>
          {sprite.map((p) => (
            <path key={p.fill} d={p.d} fill={p.fill} />
          ))}
        </g>
      )}
    </svg>
  );
}

/** The scene for a story, with the player in his current team's home kit; `prize` (an award, a
 * title, a medal) makes him celebrate with it. */
export function StoryScene({ g, title, kind, prize }: { g: GameState; title: string; kind?: string; prize?: string }) {
  const t = teamOf(g);
  const kit = useMemo(() => kitFor(t?.name ?? '', t?.abbr ?? '', t?.color ?? '#2A2F36', 'home', styleLeague(g.stage)), [t?.name, t?.abbr, t?.color, g.stage]);
  return <SceneArt kind={sceneFor(title, kind)} kit={kit} name={g.player.name} number={g.player.number} pos={g.player.pos} accent={t?.color ?? '#E8590C'} prize={prize} />;
}

/** The start page: a street court at sunset and a starting five, one of each position. */
export function LineupArt() {
  const bg = useMemo(() => toPaths(paintScene('street', '#E8590C')), []);
  const five = useMemo(
    () =>
      (Object.keys(POS_STYLE) as Pos[]).map((pos) => {
        const { color, model, number } = POS_STYLE[pos];
        const kit: Kit = { base: color, ink: '#FFFFFF', trim: mix(color, '#000000', 0.45), word: '' };
        return { pos, paths: toPaths(paint(POSES[pos], kit, lookOf(model, '#18141C'), number)) };
      }),
    [],
  );
  const scale = 1.25;
  return (
    <svg className="art art-scene art-lineup" viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label="A starting five on a street court">
      {bg.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
      {five.map((f, i) => {
        const pose = POSES[f.pos];
        return (
          <g key={f.pos} transform={`translate(${Math.round(18 + i * 35 - (pose.w * scale) / 2 + 8)} ${Math.round(H - 1 - pose.h * scale)}) scale(${scale})`}>
            {f.paths.map((p) => (
              <path key={p.fill} d={p.d} fill={p.fill} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
