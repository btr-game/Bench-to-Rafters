import { useMemo } from 'react';
import type { Pos } from '../../engine/types';
import type { Kit } from '../../content/teamStyle';
import { lookOf } from './Player';
import { DIGITS, dark, light, toPaths } from './pixel';
import { HERO_NUM, HERO_RLE, type HeroPose } from './heroRows';

// The start page's players. Round 20: every one is traced from a real photo the owner chose
// (heroRows.ts): the outline and each part (jersey, shorts, ball, socks, shoes, hair) are drawn
// over the photo, the light and shade come from it, and the kit, skin and hair colours are
// painted in, so nobody in the photos can be recognised. Five position poses, one action of its
// own for each of the 25 archetypes, and one for each late-career specialist role. Letters: O
// outline, H/h hair, S/l/s/d skin (base, light, shade, deep), J/i/j/k jersey (base, light, shade,
// deep), T trim, P/p shorts, R waistband, B/u/b/L ball, W/w socks and sleeves, F/f shoes, E soles.

/** Decoded rows of a pose (run-length encoded in heroRows.ts). */
const ROWS = new Map<HeroPose, string[]>();
function rowsOf(pose: HeroPose): string[] {
  let r = ROWS.get(pose);
  if (!r) {
    r = HERO_RLE[pose].map((line) => line.replace(/(\d*)(\D)/g, (_, n: string, c: string) => c.repeat(n ? +n : 1)));
    ROWS.set(pose, r);
  }
  return r;
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

function paintHero(pos: HeroPose, kit: Kit, skin: string, hair: string, number: number): string[][] {
  const rows = rowsOf(pos).map((r) => r.split(''));
  const digits = String(Math.min(99, Math.max(0, number)));
  const at = HERO_NUM[pos];
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

/** A position's hand-drawn player in a kit, with his number. */
export function HeroArt({ pose: pos, kit, model, number, size = 150 }: { pose: HeroPose; kit: Kit; model: string; number: number; size?: number }) {
  const look = lookOf(model, '#2A2D34');
  const paths = useMemo(() => toPaths(paintHero(pos, kit, look.skin, look.hair, number)), [pos, kit, look.skin, look.hair, number]);
  const w = rowsOf(pos)[0].length;
  const h = rowsOf(pos).length;
  return (
    <svg className="art art-hero" width={(size * w) / h} height={size} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" role="img" aria-label={`${model}, number ${number}`}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
