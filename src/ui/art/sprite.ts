// Pixel-art players, the cute way (round 17): a big head on a small body, flat colours with one
// shade, a dark outline. Every pose is drawn by hand as a pixel map below, one letter per pixel,
// and painted in the player's kit; the head (face, hair, beard, gear) is drawn by hand too, in
// pieces, so a legend keeps his look (content/legendLooks.ts) in any pose.
//
// Letters: S skin, s skin shade, + skin light, E eye, m mouth, H hair, h hair light, Z stubble, J jersey,
// j jersey shade, T trim, P shorts, p shorts shade, R shorts stripe, W sock, F shoe, f sole,
// B ball, b ball shade, L seam, Q/q the shooting arm (skin, or the arm sleeve), w wrist (skin, or
// a wristband), A headband, G goggle frame, g lens, o the shadow on the floor.

import type { Kit } from '../../content/teamStyle';
import type { Face, Hair } from '../../content/legendLooks';
import type { WearSlot } from '../../content/shop';
import { mix } from './color';
import { DIGITS, dark, light, type Pt } from './pixel';

export interface Pose {
  w: number;
  h: number;
  head: Pt; // the face's top-left
  num: Pt | null; // where a two-digit number starts
  rows: string[];
  /** Seen from behind (round 39, the Floor's spin): the back of his head, no face. */
  back?: boolean;
}

export interface Look {
  skin: string;
  hair: string;
  style: Hair;
  face: Face;
  gear: string[]; // headband, goggles, sleeve, unibrow, wristband
  shoe: string;
  colors?: Partial<Record<WearSlot, string>>; // round 25: bought accessories in their colours (legs: the socks)
}

const OUT = '#1B1820';

function pose(w: number, h: number, head: Pt, num: Pt | null, rows: Record<number, string>): Pose {
  const out = Array.from({ length: h }, (_, y) => (rows[y] ?? '').padEnd(w, '.').slice(0, w));
  return { w: w + 2, h: h + 2, head, num, rows: out };
}
const rep = (a: number, b: number, s: string) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, s]));

/** The two guard: upright, the ball bouncing at his side. */
export const DRIBBLE = pose(30, 34, [9, 9], [11, 21], {
  19: '........SSTJJTssTJJTQQ',
  20: '........SSTJJJTTJJJTQQ',
  21: '........SSJJJJJJJJjjQQ',
  22: '........SSJJJJJJJJjjQQ',
  23: '........SSJJJJJJJJjjqQQ',
  24: '........wwJJJJJJJJjj.QQQ',
  25: '........ssJJJJJJJJjj..QQQ',
  26: '........ssRPPPPPPPpR...BBB',
  27: '..........RPPPPPPPpR..BBLBb',
  28: '..........RPPP..PPpR..LLLLL',
  29: '...........SS....ss...BBLBb',
  30: '...........SS....ss....bbb',
  31: '...........WW....WW',
  32: '.........FFFf....FFFf',
  33: '........oooooooooooooooo',
});

/** The point guard: low in his stance, the ball on a short leash by his knee. */
export const LOWDRIBBLE = pose(30, 36, [9, 11], [11, 23], {
  21: '........SSTJJTssTJJTQQ',
  22: '.......SSSTJJJTTJJJTQQQ',
  23: '......SSS.JJJJJJJJjj.QQQ',
  24: '.....SSS..JJJJJJJJjj..qQQ',
  25: '....wss...JJJJJJJJjj...QQ',
  26: '....ss....JJJJJJJJjj...QQ',
  27: '.........RPPPPPPPPPpR..BBB',
  28: '.........RPPPPPPPPPpR.BBLBb',
  29: '.........RPPPP..PPPpR.LLLLL',
  30: '........SSS.......sss.BBLBb',
  31: '.......SSS........sss..bbb',
  32: '.......WWW........WWW',
  33: '.....FFFFf........FFFFf',
  34: '....oooooooooooooooooooooo',
});

/** The wing: up in the air on the follow-through, the ball just off his fingertips. */
export const JUMPER = pose(30, 36, [9, 8], [11, 20], {
  0: '.................BBB',
  1: '................BBLBb',
  2: '................LLLLL',
  3: '................BBLBb',
  4: '.................bbb',
  5: '...................QQ',
  6: '..................QQQ',
  7: '.....................QQ',
  8: '....ss...............QQ',
  9: '....SS...............QQ',
  10: '....ww...............QQ',
  11: '....SS...............QQ',
  ...rep(12, 16, '....SS...............QQ'),
  17: '....SSSS............QQQ',
  18: '.....SSSSTJJTssTJJTQQQ',
  19: '..........TJJJTTJJJT',
  ...rep(20, 24, '..........JJJJJJJJjj'),
  25: '..........RPPPPPPPpR',
  26: '..........RPPPPPPPpR',
  27: '..........RPPP..PPpR',
  28: '...........SS....ss',
  29: '...........SS....ss',
  30: '...........WW....WW',
  31: '..........FFF.....FFF',
  32: '...........Ff......Ff',
  35: '.........oooooooooooo',
});

/** The four: ball on his hip, sizing up his man. */
export const TRIPLE = pose(30, 34, [9, 9], [11, 21], {
  19: '........SSTJJTssTJJTQQ',
  20: '........SSTJJJTTJJJTQQ',
  21: '........SSJJJJJJJJjjQ.BBB',
  22: '........SSJJJJJJJJjjQBBLBb',
  23: '........SSJJJJJJJJjjQLLLLL',
  24: '........wwJJJJJJJJjjQBBLBb',
  25: '........ssJJJJJJJJjjQQbbbQ',
  26: '........ssRPPPPPPPpR.QQQQ',
  27: '..........RPPPPPPPpR',
  28: '..........RPPP..PPpR',
  29: '..........SS......ss',
  30: '..........SS......ss',
  31: '..........WW......WW',
  32: '........FFFf......FFFf',
  33: '.......oooooooooooooooo',
});

/** The big man: flying, the ball cocked high in one hand, a knee up. */
export const DUNK = pose(30, 36, [9, 8], [11, 20], {
  0: '......................BBB',
  1: '.....................BBLBb',
  2: '.....................LLLLL',
  3: '.....................BBLBb',
  4: '.....................QbbbQ',
  5: '.....................QQQQ',
  ...rep(6, 16, '......................QQ'),
  17: '.....................QQQ',
  18: '......SSSSTJJTssTJJTQQ',
  19: '....SSS...TJJJTTJJJT',
  20: '...SSS....JJJJJJJJjj',
  21: '..ssw.....JJJJJJJJjj',
  ...rep(22, 24, '..........JJJJJJJJjj'),
  25: '..........RPPPPPPPpR',
  26: '.........SRPPPPPPPpR',
  27: '........SSRPPP..PPpR',
  28: '........SSSS......ss',
  29: '.........SS.......ss',
  30: '.........WW.......WW',
  31: '........FFFf.....FFF',
  32: '..................Ff',
  35: '.........oooooooooooo',
});

/** Both arms straight up: holding a trophy over his head (round 19, celebrations). */
export const CHEER = pose(30, 34, [9, 9], [11, 21], {
  1: '......ss..............qq',
  2: '......SS..............QQ',
  ...rep(3, 17, '......SS..............QQ'),
  18: '......SSSSTJJTssTJJTQQQQ',
  19: '..........TJJJTTJJJT',
  ...rep(20, 25, '..........JJJJJJJJjj'),
  26: '..........RPPPPPPPpR',
  27: '..........RPPPPPPPpR',
  28: '..........RPPP..PPpR',
  29: '...........SS....ss',
  30: '...........SS....ss',
  31: '...........WW....WW',
  32: '.........FFFf....FFFf',
  33: '........oooooooooooooooo',
});

// Round 27 (owner: the intro's avatars "should have motion (running animation, shots, blocks,
// steals...), very simple, in 2~3 frames per action"): two running frames, drawn like the two
// guard's stance (no ball: the intro bounces one of its own beside him).
const RUN_TOP = {
  19: '........SSTJJTssTJJTQQ',
  20: '........SSTJJJTTJJJTQQ',
  21: '........SSJJJJJJJJjjQQ',
  22: '........SSJJJJJJJJjjQQ',
  23: '........SSJJJJJJJJjjqQ',
  24: '........wwJJJJJJJJjj.QQ',
  25: '........ssJJJJJJJJjj..Qw',
  26: '........ssRPPPPPPPpR',
  27: '..........RPPPPPPPpR',
  28: '..........RPPP..PPpR',
};
/** Running, mid-stride: the front leg reaching, the back leg pushing off. */
export const RUN_A = pose(30, 34, [9, 9], [11, 21], {
  ...RUN_TOP,
  29: '.........SS.......ss',
  30: '........SS.........ss',
  31: '.......WW...........WW',
  32: '.....FFFf............FFFf',
  33: '....oooooooooooooooooooooo',
});
/** Running, the passing frame: one foot down under him, the other knee coming through. */
export const RUN_B = pose(30, 34, [9, 9], [11, 21], {
  ...RUN_TOP,
  29: '...........SS...sss',
  30: '...........SS..sss',
  31: '...........WW.FFFf',
  32: '.........FFFf',
  33: '........oooooooooooo',
});

/** A hand up at his mouth: biting the medal (round 19, celebrations). */
export const BITE = pose(30, 34, [9, 9], [11, 21], {
  16: '..................qqq',
  17: '.....................QQ',
  18: '.....................QQ',
  19: '........SSTJJTssTJJTQQQ',
  20: '........SSTJJJTTJJJTQQ',
  21: '........SSJJJJJJJJjj',
  22: '........SSJJJJJJJJjj',
  23: '........SSJJJJJJJJjj',
  24: '........wwJJJJJJJJjj',
  25: '........ssJJJJJJJJjj',
  26: '........ssRPPPPPPPpR',
  27: '..........RPPPPPPPpR',
  28: '..........RPPP..PPpR',
  29: '...........SS....ss',
  30: '...........SS....ss',
  31: '...........WW....WW',
  32: '.........FFFf....FFFf',
  33: '........oooooooooooooooo',
});

// Round 39, the Floor: a defender's slide and a reach for the ball, and the two guard seen from
// behind, for the middle of a spin move.
/** Down in his stance, arms out wide, sliding with his man. */
export const SLIDE = pose(30, 36, [9, 11], [11, 23], {
  21: '........SSTJJTssTJJTQQ',
  22: '.......SSSTJJJTTJJJTQQQ',
  23: '......SSS.JJJJJJJJjj.QQQ',
  24: '.....SSS..JJJJJJJJjj..QQQ',
  25: '....wss...JJJJJJJJjj...qQw',
  26: '....ss....JJJJJJJJjj....qq',
  27: '.........RPPPPPPPPPpR',
  28: '.........RPPPPPPPPPpR',
  29: '.........RPPPP..PPPpR',
  30: '........SSS......sss',
  31: '.......SSS........sss',
  32: '......WWW..........WWW',
  33: '....FFFFf..........FFFFf',
  34: '...ooooooooooooooooooooooo',
});
/** Lunging for the ball: weight forward, the near arm jabbing out low. */
export const REACH = pose(30, 34, [10, 9], [12, 21], {
  19: '.........SSTJJTssTJJTQQ',
  20: '.........SSTJJJTTJJJTQQQQ',
  21: '.........SSJJJJJJJJjj..QQQQ',
  22: '.........SSJJJJJJJJjj....QQQw',
  23: '.........SSJJJJJJJJjj......ww',
  24: '.........wwJJJJJJJJjj',
  25: '.........ssJJJJJJJJjj',
  26: '...........RPPPPPPPpR',
  27: '..........RPPPPPPPpR',
  28: '.........RPPP...PPpR',
  29: '........SS.......ss',
  30: '.......SS.........ss',
  31: '......WW...........WW',
  32: '....FFFf...........FFFf',
  33: '...ooooooooooooooooooooo',
});
/** The two guard with his back turned, half way round a spin. */
export const SPIN_BACK: Pose = { ...DRIBBLE, back: true };

/** Head and shoulders, for portraits. */
export const BUST = pose(20, 24, [4, 7], [6, 19], {
  17: '...SSTJJTssTJJTSS',
  18: '...SSTJJJTTJJJTSS',
  ...rep(19, 23, '...SSJJJJJJJJjjSS'),
});
/** The same pose with the ball taken out, for scenes that animate the ball themselves. */
export const noBall = (p: Pose): Pose => ({ ...p, rows: p.rows.map((r) => r.replace(/[BbL]/g, '.')) });

// ---- the head ----

const FACE = ['.SSSSSSSSSS.', 'SSSSSSSSSSSs', 'SSSSSSSSSSSs', 'SSSSSSSSSSSs', 'SSSESSSSESSs', 'SSSESSSSESSs', 'SSSSSSSSSSSs', 'SSSSSSSSSSSs', '.SSSSSSSSSs.', '..ssssssss..'];

// hair maps start two columns left of the face, 16 wide; [first row, rows]
const HAIR: Record<Hair, [number, string[]]> = {
  bald: [1, ['....++']],
  buzz: [-1, ['...ZZZZZZZZZZ', '..ZZZZZZZZZZZZ', '..ZZ........ZZ']],
  short: [-2, ['....HHhHHHHH', '...HHhHHHHHHH', '..HHHHHHHHHHHH', '..HHHHHHHHHHHH', '..HH........HH']],
  flattop: [-4, ['...hhhhhhhhhh', '...HHHHHHHHHH', '...HHHHHHHHHH', '..HHHHHHHHHHHH', '..HHHHHHHHHHHH', '..HH........HH']],
  afro: [-4, ['....HHhhHHHH', '..HHHhHHHHHHHH', '.HHhHHHHHHHHHHH', '.HHHHHHHHHHHHHH', '.HHHHHHHHHHHHHH', '.HHHHHHHHHHHHHH', '.HHH........HHH', '.HH..........HH']],
  bigafro: [
    -5,
    ['...HHHhhHHHH', '.HHHHhHHHHHHHHH', 'HHHhHHHHHHHHHHHH', 'HHhHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHH', 'HHHH........HHHH', 'HHH..........HHH', '.HH..........HH', '.H............H'],
  ],
  cornrows: [-2, ['....HHHHHHHH', '...HhHhHhHhHh', '..HhHhHhHhHhHh', '..HhHhHhHhHhHh', '..HH........HH']],
  twists: [-3, ['...H.H.HH.H.H', '...HHHHHHHHHH', '..HHHHHHHHHHHH', '.HHHHHHHHHHHHHH', '.HHHHHHHHHHHHHH', ...Array(6).fill('Hh............hH')]],
  long: [-2, ['....HHhHHHHH', '...HHhHHHHHHH', '.HHHHHHHHHHHHHH', '.HHHHHHHHHHHHHH', '.HHH........HHH', ...Array(8).fill('.HH..........HH')]],
  mop: [-2, ['....HHhHHHHH', '...HHhHHHHHHH', '..HHHHHHHHHHHH', '.HHHHHHHHHHHHHH', '.HHHHHH.HHHHHHH', '.HH..........HH', '.HH..........HH']],
  mullet: [-2, ['....HHhHHHHH', '...HHhHHHHHHH', '..HHHHHHHHHHHH', '..HHHHHHHHHHHH', '.HHH........HHH', ...Array(7).fill('.HH..........HH')]],
  parted: [-2, ['....HHHHHHHH', '...HHhSHHHHHH', '..HHHHSHHHHHHH', '..HHHHHHHHHHHH', '..HH........HH']],
  curly: [-3, ['..HH.HH..HH.HH', '..HHhHHHHHhHHH', '.HHHHHHhHHHHHHH', '.HHhHHHHHHHHhHH', '.HHHHHHHHHHHHHH', '.HH..........HH']],
};

// facial hair, over the face's own columns; [first row, rows]
const FACE_HAIR: Record<Face, [number, string[]]> = {
  none: [0, []],
  stubble: [7, ['Z..........Z', '.ZZZ....ZZZ.', '..ZZZZZZZZ..']],
  mustache: [7, ['....HHHH']],
  goatee: [7, ['....HHHH', '.....HH', '....HHHH']],
  beard: [4, ['H..........H', 'H..........H', 'HH........HH', 'HHH.HHHH.HHH', '.HHHHHHHHHH.', '..HHHHHHHH..']],
  bigbeard: [4, ['H..........H', 'HH........HH', 'HH........HH', 'HHH.HHHH.HHH', 'HHHHHHHHHHHH', '.HHHHHHHHHH.', '...HHHHHH...']],
  sideburns: [3, ['H..........H', 'H..........H', 'H..........H', 'H..........H', 'H..........H']],
};

const GOGGLES = ['.GGGGGGGGGG.', 'GGgEgGGgEgGG', '.GgEgGGgEgG.', '.GGGGGGGGGG.'];
/** The back of the head, over the face's own square: hair all over, the nape of the neck under it. */
const BACK = ['.HHHHHHHHHH.', ...Array(7).fill('HHHHHHHHHHHH'), '.HHHHHHHHHH.', '..ssssssss..'];

function stamp(g: string[], x0: number, y0: number, rows: string[]) {
  rows.forEach((row, dy) => {
    const y = y0 + dy;
    if (y < 0 || y >= g.length) return;
    const line = g[y].split('');
    [...row].forEach((ch, dx) => {
      const x = x0 + dx;
      if (ch !== '.' && x >= 0 && x < line.length) line[x] = ch;
    });
    g[y] = line.join('');
  });
}

/** Paint a pose in a kit with a look: a grid of colours, '' where empty, outlined. */
export function paint(p: Pose, kit: Kit, look: Look, number: number, mirror = false): string[][] {
  const w = p.w - 2;
  const h = p.h - 2;
  const g = Array.from({ length: h }, () => '.'.repeat(w));
  const [hx, hy] = p.head;

  // the head first: hair that sits behind, the face, then hair and gear over it
  const [hy0, hair] = HAIR[look.style] ?? HAIR.short;
  if (p.back) {
    // from behind: his hair (its length too), then the back of the head over the face; a bald
    // head is skin all round
    stamp(g, hx - 2, hy + hy0, hair);
    stamp(g, hx, hy, look.style === 'bald' ? BACK.map((r) => r.replace(/H/g, 'S')) : BACK);
    stamp(g, hx - 1, hy + 4, ['s', 's']);
    stamp(g, hx + 12, hy + 4, ['s', 's']);
    if (look.gear.includes('headband')) stamp(g, hx - 1, hy + 2, ['AAAAAAAAAAAAAA']);
  } else {
    stamp(g, hx, hy, FACE);
    stamp(g, hx - 2, hy + hy0, hair);
    stamp(g, hx - 1, hy + 4, ['s', 's']);
    stamp(g, hx + 12, hy + 4, ['s', 's']);
    stamp(g, hx, hy + 4, ['...E....E', '...E....E']); // long hair never covers the eyes
    if (!['mustache', 'goatee', 'beard', 'bigbeard'].includes(look.face)) stamp(g, hx + 5, hy + 7, ['mm']);
    const [fy0, fh] = FACE_HAIR[look.face] ?? FACE_HAIR.none;
    stamp(g, hx, hy + fy0, fh);
    if (look.gear.includes('unibrow')) stamp(g, hx + 2, hy + 3, ['HHHHHHHH']);
    if (look.gear.includes('goggles')) stamp(g, hx, hy + 3, GOGGLES);
    if (look.gear.includes('headband')) stamp(g, hx - 1, hy + 2, ['AAAAAAAAAAAAAA']);
  }

  // the body over it
  for (let y = 0; y < h; y++) stamp(g, 0, y, [p.rows[y]]);

  // the number (painted back to front for a player drawn turned around, so it still reads right)
  if (number >= 0 && p.num) {
    const digits = String(Math.min(99, number));
    const x0 = p.num[0] + (digits.length === 1 ? 2 : 0);
    (mirror ? [...digits].reverse() : [...digits]).forEach((d, i) => {
      const bits = DIGITS[+d];
      for (let k = 0; k < 15; k++) if (bits[k] === '1') stamp(g, x0 + i * 4 + (mirror ? 2 - (k % 3) : k % 3), p.num![1] + Math.floor(k / 3), ['N']);
    });
  }

  // colours
  const white = (c: string) => c.toUpperCase() === '#FFFFFF' || c.toUpperCase() === '#F4F4F4';
  const shadeOf = (c: string) => (white(c) ? '#D5DAE3' : dark(c, 0.16));
  const skin = look.skin;
  const sleeve = look.colors?.arm ?? (white(kit.base) ? '#2A2D34' : '#F4F4F4');
  const hasSleeve = look.gear.includes('sleeve');
  const sole = white(look.shoe) ? '#9AA2B0' : '#F4F4F4';
  const pal: Record<string, string> = {
    S: skin,
    s: dark(skin, 0.16),
    '+': light(skin, 0.22),
    E: '#1A1412',
    m: dark(skin, 0.32),
    H: look.hair,
    h: light(look.hair, 0.16),
    Z: mix(look.hair, skin, 0.45),
    J: kit.base,
    j: shadeOf(kit.base),
    T: kit.trim,
    N: kit.ink,
    P: kit.base,
    p: shadeOf(kit.base),
    R: kit.trim,
    W: look.colors?.legs ?? '#F4F4F4',
    F: look.shoe,
    f: sole,
    B: '#E8782A',
    b: '#C2571B',
    L: '#6A3416',
    Q: hasSleeve ? sleeve : skin,
    q: hasSleeve ? shadeOf(sleeve) : dark(skin, 0.16),
    w: look.gear.includes('wristband') ? (look.colors?.wrist ?? '#F4F4F4') : skin,
    A: look.colors?.head ?? (white(kit.base) ? kit.ink : '#F4F4F4'),
    G: '#2A2D34',
    g: '#BFE3F0',
    o: 'rgba(0,0,0,0.16)',
  };

  // onto a grid one pixel bigger all round, then the outline
  const out: string[][] = Array.from({ length: p.h }, () => Array(p.w).fill(''));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] !== '.') out[y + 1][x + 1] = pal[g[y][x]] ?? '';
  const solid = (x: number, y: number) => out[y]?.[x] && out[y][x] !== pal.o && out[y][x] !== OUT;
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++)
      if ((!out[y][x] || out[y][x] === pal.o) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) out[y][x] = OUT;
  return out;
}

