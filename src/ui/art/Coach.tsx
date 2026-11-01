// Head coaches (round 32, owner: "make avatars of them"): pixel coaches of their own, in the same
// cute style as the players, with a pose for each temperament. The hardliner folds his arms, the
// tactician holds his clipboard, the players' coach has his hands together, ready to clap. A suit
// with a tie in the team's colour (the players' coach in a team tracksuit instead), grey hair on
// some, glasses on every tactician and a few others. Each coach looks the same wherever he shows
// up: his look comes from his name.

import { useMemo } from 'react';
import type { Coach, Temper } from '../../engine/career/coach';
import type { Kit } from '../../content/teamStyle';
import type { Hair } from '../../content/legendLooks';
import { lookOf } from './Player';
import { paint, type Look, type Pose } from './sprite';
import { toPaths } from './pixel';

function pose(rows: Record<number, string>): Pose {
  const w = 30;
  const h = 34;
  return { w: w + 2, h: h + 2, head: [9, 9], num: null, rows: Array.from({ length: h }, (_, y) => (rows[y] ?? '').padEnd(w, '.').slice(0, w)) };
}

const LEGS: Record<number, string> = {
  27: '..........PPPPPPPPPP',
  28: '..........PPPPPPPPPP',
  29: '..........PPPp..PPPp',
  30: '..........PPPp..PPPp',
  31: '..........PPPp..PPPp',
  32: '.........FFFFf..FFFFf',
  33: '.......oooooooooooooooo',
};

/** One pose for each temperament (letters as in sprite.ts: J jacket, N shirt, T tie, P trousers,
 * G clipboard, g its paper). */
const COACH_POSES: Record<Temper, Pose> = {
  hardliner: pose({
    19: '........JJJJNNTTNNJJJJ',
    20: '........JJJJjNTTNjJJJJ',
    21: '........JjJJJjTTjJJJjJ',
    22: '........JJjjjjjjjjjjJJ',
    23: '........JjSSjjjjjjSSjJ',
    24: '........JJjjjjjjjjjjJJ',
    25: '........JjJJJJJNJJJJjJ',
    26: '........jjJJJJJJJJJJjj',
    ...LEGS,
  }),
  tactician: pose({
    19: '........JJJJNNTTNNJJJJ',
    20: '........JJJJjNTTNjJJJJ',
    21: '........JjJJJjGGGGGGGJ',
    22: '........JjJJJjGgggggGJ',
    23: '........JjjjSSGGGGggGJ',
    24: '........JjJJssGggggGGJ',
    25: '........JjJJJjGgGGGgGJ',
    26: '........jjJJJJGGGGGGGj',
    ...LEGS,
    27: '..........PPPPPPPPPPSS',
    28: '..........PPPPPPPPPPss',
  }),
  players: pose({
    19: '........JJJJNNTTNNJJJJ',
    20: '........JJJJjNTTNjJJJJ',
    21: '........JjJJJjTTjJJJjJ',
    22: '........JjJJJJTTJJJJjJ',
    23: '........JjJJJJTTJJJJjJ',
    24: '........JjjjjSSSSjjjjJ',
    25: '........JJJJjssssjJJJJ',
    26: '........jjJJJJJJJJJJjj',
    ...LEGS,
  }),
};

const SUITS = ['#1F2A44', '#2E3138', '#3B2F2A', '#4A5160', '#18141C', '#24392C'];
const SHIRTS = ['#F4F4F4', '#DCE7F5', '#F1E7D0'];
const GREYS = ['#B8BCC4', '#9AA0A6', '#D5D8DE'];
// hair a man of fifty keeps on a sideline
const SIDELINE: Hair[] = ['bald', 'buzz', 'short', 'flattop', 'parted', 'curly'];
// thin frames over the eyes (rows 3 to 6 of the face, '.' keeps the face underneath)
const GLASSES = ['..GGG..GGG..', '..G.GGGG.G..', '..G.G..G.G..', '..GGG..GGG..'];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** His clothes and his look, from his name and the team's colour. */
function coachLook(c: Pick<Coach, 'name' | 'temper'>, color: string): { kit: Kit; look: Look; glasses: boolean } {
  const k = hash(c.name);
  const kit: Kit = c.temper === 'players' ? { base: color, ink: '#F4F4F4', trim: color, word: '' } : { base: SUITS[k % SUITS.length], ink: SHIRTS[(k >>> 4) % SHIRTS.length], trim: color, word: '' };
  const own = lookOf(c.name, '#1B1820');
  const style = SIDELINE.includes(own.style) ? own.style : SIDELINE[(k >>> 6) % SIDELINE.length];
  const grey = (k >>> 8) % 10 < 4;
  const look: Look = { ...own, style, hair: grey ? GREYS[(k >>> 16) % GREYS.length] : own.hair, gear: [], shoe: '#1B1820' };
  return { kit, look, glasses: c.temper === 'tactician' || (k >>> 12) % 10 < 2 };
}

/** A head coach, standing. */
export function CoachArt({ coach, color = '#343A40', size = 96, mirror = false }: { coach: Pick<Coach, 'name' | 'temper'>; color?: string; size?: number; mirror?: boolean }) {
  const { name, temper } = coach;
  const p = COACH_POSES[temper];
  const paths = useMemo(() => {
    const { kit, look, glasses } = coachLook({ name, temper }, color);
    const grid = paint(p, kit, look, -1);
    if (glasses) {
      const [hx, hy] = p.head;
      GLASSES.forEach((row, dy) => [...row].forEach((ch, dx) => ch === 'G' && (grid[hy + 3 + dy + 1][hx + dx + 1] = '#2A2D34')));
    }
    return toPaths(grid);
  }, [name, temper, color, p]);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="art art-coach" data-art="coach" width={(size * p.w) / p.h} height={size} viewBox={`0 0 ${p.w} ${p.h}`} shapeRendering="crispEdges" role="img" aria-label={`Coach ${name}`}>
      <g transform={mirror ? `matrix(-1 0 0 1 ${p.w} 0)` : undefined}>
        {paths.map((x) => (
          <path key={x.fill} d={x.d} fill={x.fill} />
        ))}
      </g>
    </svg>
  );
}
