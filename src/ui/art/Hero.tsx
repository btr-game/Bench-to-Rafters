import { useMemo } from 'react';
import type { Pos } from '../../engine/types';
import type { Kit } from '../../content/teamStyle';
import { lookOf } from './Player';
import { DIGITS, dark, light, toPaths } from './pixel';
import { HERO_RLE, type HeroPose } from './heroRows';

// The start page's players. Round 20: every one is traced from a real photo the owner chose
// (heroRows.ts): the outline and each part (jersey, shorts, ball, socks, shoes, hair) are drawn
// over the photo, the light and shade come from it, and the kit, skin and hair colours are
// painted in, so nobody in the photos can be recognised. Five position poses, one action of its
// own for each of the 25 archetypes, and one for each late-career specialist role. Letters: O
// outline, H/h hair, S/l/s/d skin (base, light, shade, deep), J/i/j/k jersey (base, light, shade,
// deep), T trim, P/p shorts, R waistband, B/u/b/L ball, W/w socks and sleeves, F/f shoes, E soles.

/** Decoded rows of a pose (run-length encoded in heroRows.ts), or shrunk to `res` rows. */
const ROWS = new Map<string, string[]>();
function rowsOf(pose: HeroPose, res?: number): string[] {
  const key = `${pose}:${res ?? ''}`;
  let r = ROWS.get(key);
  if (!r) {
    r = res ? shrink(rowsOf(pose), res) : HERO_RLE[pose].map((line) => line.replace(/(\d*)(\D)/g, (_, n: string, c: string) => c.repeat(n ? +n : 1)));
    ROWS.set(key, r);
  }
  return r;
}

/**
 * The same player with fewer pixels (round 20: Built in a lab grows the pixel count level by
 * level). Each new pixel takes the most common colour of the block it covers, if enough of the
 * block is the player; then the outline is drawn again around the result.
 */
function shrink(src: string[], res: number): string[] {
  const H = src.length - 2;
  const W = src[0].length - 2;
  const k = H / res;
  const w = Math.max(1, Math.round(W / k));
  const out: string[][] = [];
  for (let y = 0; y < res; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) {
      const count = new Map<string, number>();
      let total = 0;
      let on = 0;
      for (let sy = Math.floor(y * k); sy < Math.max(Math.floor(y * k) + 1, Math.floor((y + 1) * k)); sy++)
        for (let sx = Math.floor(x * k); sx < Math.max(Math.floor(x * k) + 1, Math.floor((x + 1) * k)); sx++) {
          const c = src[sy + 1]?.[sx + 1] ?? '.';
          total++;
          if (c === '.' || c === 'O') continue;
          on++;
          count.set(c, (count.get(c) ?? 0) + 1);
        }
      row.push(on >= total * (res < 30 ? 0.2 : 0.32) ? [...count].sort((a, b) => b[1] - a[1])[0][0] : '.');
    }
    out.push(['.', ...row, '.']);
  }
  const blank = () => Array<string>(w + 2).fill('.');
  const g = [blank(), ...out, blank()];
  return g.map((r, y) =>
    r
      .map((c, x) => (c === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dy, dx]) => !['.', undefined].includes(g[y + dy]?.[x + dx])) ? 'O' : c))
      .join(''),
  );
}

const JERSEY = new Set(['i', 'J', 'j', 'k']);
/** Where a two-digit number fits on the jersey (a 7x5 block of it, high on the chest), if anywhere. */
function numberSpot(rows: string[]): [number, number] | null {
  let top = Infinity;
  let bot = -1;
  let sum = 0;
  let n = 0;
  rows.forEach((r, y) => [...r].forEach((c, x) => {
    if (!JERSEY.has(c)) return;
    top = Math.min(top, y);
    bot = Math.max(bot, y);
    sum += x;
    n++;
  }));
  if (!n) return null;
  const cx = sum / n;
  let best: [number, number, number] | null = null;
  for (let y = top + 2; y < bot - 4; y++)
    for (let x = 0; x < rows[0].length - 7; x++) {
      let ok = true;
      for (let dy = 0; dy < 5 && ok; dy++) for (let dx = 0; dx < 7 && ok; dx++) ok = JERSEY.has(rows[y + dy][x + dx]);
      const score = y - top + Math.abs(x + 3 - cx) * 0.6;
      if (ok && (!best || score < best[0])) best = [score, x, y];
    }
  return best && [best[1], best[2]];
}

/** The position cards' poses. */
export const POS_POSE: Record<Pos, HeroPose> = { PG: 'lowdribble', SG: 'drive', SF: 'jumper', PF: 'hip', C: 'dunk' };

/** Each archetype's own action (round 20: one traced photo per archetype, none shared). */
const ARCH_POSE: Record<string, HeroPose> = {
  'Floor General': 'nolook',
  'Scoring Guard': 'pullup',
  'Two-Way Guard': 'stance',
  'Jumbo Playmaker': 'powerdrive',
  Speedster: 'push',
  Sharpshooter: 'jumper',
  Slasher: 'drive',
  '3&D Guard': 'catchshoot',
  'Combo Guard': 'lowdribble',
  'Shot Creator': 'hesitation',
  'Point Forward': 'handle',
  '3&D Wing': 'contest',
  'Athletic Wing': 'twohand',
  'Scoring Wing': 'fadeaway',
  'Glue Guy': 'spread',
  'Stretch Four': 'hip',
  Bruiser: 'post',
  'Rim Runner': 'scoop',
  'Two-Way Forward': 'reach',
  'Playmaking Four': 'facing',
  'Rim Protector': 'wall',
  'Stretch Big': 'setshot',
  'Post Scorer': 'skyhook',
  'Playmaking Big': 'overhead',
  'Lob Threat': 'dunk',
  // the late-career specialist roles (career/ringChase.ts)
  'Floor spacer': 'release',
  'Defensive specialist': 'steal',
  'Rebounding big': 'tip',
  'Bench scorer': 'finish',
  'Veteran playmaker': 'spin',
  'Veteran leader': 'crouch',
};
export const archPose = (name: string, pos: Pos): HeroPose => ARCH_POSE[name] ?? POS_POSE[pos];

function paintHero(pos: HeroPose, kit: Kit, skin: string, hair: string, number: number, res?: number): string[][] {
  const base = rowsOf(pos, res);
  const rows = base.map((r) => r.split(''));
  const digits = String(Math.min(99, Math.max(0, number)));
  const at = numberSpot(base);
  if (at) {
    const [nx, ny] = at;
    const x0 = nx + (digits.length === 1 ? 2 : 0);
    [...digits].forEach((d, i) => {
      const bits = DIGITS[+d];
      for (let k = 0; k < 15; k++) if (bits[k] === '1') rows[ny + Math.floor(k / 3)][x0 + i * 4 + (k % 3)] = 'N';
    });
  }
  const pal: Record<string, string> = {
    O: '#1B1820',
    H: hair,
    h: light(hair, 0.16),
    S: skin,
    l: light(skin, 0.16),
    s: dark(skin, 0.18),
    d: dark(skin, 0.34),
    J: kit.base,
    i: light(kit.base, 0.18),
    j: dark(kit.base, 0.16),
    k: dark(kit.base, 0.32),
    T: kit.trim,
    N: kit.ink,
    P: kit.base,
    p: dark(kit.base, 0.16),
    R: kit.trim,
    B: '#E8782A',
    u: '#F5A15F',
    b: '#C2571B',
    L: '#6A3416',
    W: '#F4F4F4',
    w: '#C9CFDA',
    F: '#2A2D34',
    f: '#4A4F5A',
    E: '#F4F4F4',
  };
  return rows.map((r) => r.map((c) => pal[c] ?? ''));
}

/** A traced player in a kit, with his number; `res` draws him with fewer pixels (rows tall). */
export function HeroArt({ pose: pos, kit, model, number, size = 150, res }: { pose: HeroPose; kit: Kit; model: string; number: number; size?: number; res?: number }) {
  const look = lookOf(model, '#2A2D34');
  const paths = useMemo(() => toPaths(paintHero(pos, kit, look.skin, look.hair, number, res)), [pos, kit, look.skin, look.hair, number, res]);
  const w = rowsOf(pos, res)[0].length;
  const h = rowsOf(pos, res).length;
  return (
    <svg className="art art-hero" width={(size * w) / h} height={size} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" role="img" aria-label={`${model}, number ${number}`}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
