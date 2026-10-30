import { useMemo } from 'react';
import { dark, glyph, inPoly, light, toPaths, type Pt } from './pixel';

// A trophy for every award (round 19), so each one can be told apart at a glance: its own object
// (a tall trophy with a ball on top for a title, a player statue for an MVP, a blocking hand for
// Defensive Player of the Year, a sneaker for Rookie of the Year, a big 6 for the Sixth Man, a
// rising arrow for Most Improved, crowns for stat titles, a winged ball for the dunk contest, a
// ball rack for the three-point contest, a net for the NCAA title, a sports bottle for the
// national high school player of the year...), its metal, its colours, and an engraved plate.
// Painted on a 24x26 grid: the object above, the plate below.

const W = 24;
const H = 26;
type Metal = 'gold' | 'silver' | 'bronze';
const METAL: Record<Metal, [string, string, string]> = {
  gold: ['#F5C542', '#C9921E', '#FFF1B3'],
  silver: ['#C9CED8', '#8E95A3', '#F4F6FA'],
  bronze: ['#D08A4E', '#9A5A2A', '#F2C9A0'],
};

type Shape = 'title' | 'cup' | 'statue' | 'ballped' | 'netcup' | 'plaque' | 'shield' | 'star' | 'medal' | 'crown' | 'hand' | 'shoe' | 'six' | 'arrow' | 'rack' | 'wings' | 'heart' | 'bust' | 'jersey' | 'bottle' | 'banner';
interface Spec {
  shape: Shape;
  metal: Metal;
  tag: string;
  accent?: string;
  ribbon?: string[];
  sym?: string;
}

const RWB = ['#C8102E', '#F4F6FA', '#1D428A'];
const SPEC: Record<string, Spec> = {
  // the NBA
  TITLE: { shape: 'title', metal: 'gold', tag: 'NBA' },
  TITLEKEY: { shape: 'title', metal: 'gold', tag: 'NBA' },
  MVP: { shape: 'statue', metal: 'gold', tag: 'MVP', accent: '#1D428A' },
  FMVP: { shape: 'ballped', metal: 'gold', tag: 'FMVP', accent: '#C8102E' },
  CFMVP: { shape: 'ballped', metal: 'silver', tag: 'CFMVP', accent: '#1D428A' },
  DPOY: { shape: 'hand', metal: 'silver', tag: 'DPOY' },
  ROY: { shape: 'shoe', metal: 'silver', tag: 'ROY', accent: '#2F9E44' },
  SIXTH: { shape: 'six', metal: 'silver', tag: '6MOY' },
  MIP: { shape: 'arrow', metal: 'bronze', tag: 'MIP', accent: '#2F9E44' },
  ALLNBA1: { shape: 'shield', metal: 'gold', tag: 'ALL', sym: '1', accent: '#1D428A' },
  ALLNBA2: { shape: 'shield', metal: 'silver', tag: 'ALL', sym: '2', accent: '#1D428A' },
  ALLNBA3: { shape: 'shield', metal: 'bronze', tag: 'ALL', sym: '3', accent: '#1D428A' },
  ALLROOKIE: { shape: 'shield', metal: 'silver', tag: 'ROOK', sym: 'R', accent: '#2F9E44' },
  ALLSTAR: { shape: 'star', metal: 'gold', tag: 'ASG', accent: '#1D428A' },
  ASGMVP: { shape: 'star', metal: 'gold', tag: 'MVP', accent: '#C8102E' },
  '3PT': { shape: 'rack', metal: 'silver', tag: '3PT' },
  DUNK: { shape: 'wings', metal: 'gold', tag: 'DUNK' },
  NBACUP: { shape: 'cup', metal: 'silver', tag: 'CUP', accent: '#00788C' },
  CUPMVP: { shape: 'star', metal: 'silver', tag: 'CMVP', accent: '#00788C' },
  SCORING: { shape: 'crown', metal: 'gold', tag: 'PTS', accent: '#E03131' },
  ASTLEAD: { shape: 'crown', metal: 'silver', tag: 'AST', accent: '#1C7ED6' },
  REBLEAD: { shape: 'crown', metal: 'bronze', tag: 'REB', accent: '#2F9E44' },
  STLLEAD: { shape: 'crown', metal: 'silver', tag: 'STL', accent: '#7048E8' },
  BLKLEAD: { shape: 'crown', metal: 'bronze', tag: 'BLK', accent: '#22B8CF' },
  COMMUNITY: { shape: 'heart', metal: 'silver', tag: 'CARE', accent: '#E64980' },
  HOF: { shape: 'bust', metal: 'gold', tag: 'HOF' },
  RAFTERS: { shape: 'banner', metal: 'gold', tag: 'RAFT', accent: '#C8102E' },
  // college
  NCAATITLE: { shape: 'netcup', metal: 'gold', tag: 'NCAA' },
  FFMOP: { shape: 'ballped', metal: 'bronze', tag: 'MOP', accent: '#1D428A' },
  NAISMITH: { shape: 'statue', metal: 'bronze', tag: 'NAIS', accent: '#5E3A1C' },
  AA1: { shape: 'shield', metal: 'silver', tag: 'AA', sym: '1', accent: '#C8102E', ribbon: RWB },
  AA2: { shape: 'shield', metal: 'silver', tag: 'AA', sym: '2', accent: '#1D428A', ribbon: RWB },
  CONFPOY: { shape: 'plaque', metal: 'gold', tag: 'POY', accent: '#1D428A' },
  ALLCONF: { shape: 'plaque', metal: 'silver', tag: 'ALL', accent: '#5E3A1C' },
  CONFTOURN: { shape: 'cup', metal: 'bronze', tag: 'CONF', accent: '#1D428A' },
  // high school
  STATETITLE: { shape: 'cup', metal: 'gold', tag: 'STATE', accent: '#7A1F2B' },
  ALLSTATE: { shape: 'medal', metal: 'silver', tag: 'ALLST', ribbon: ['#7A1F2B', '#F5C542'] },
  MCDAA: { shape: 'jersey', metal: 'gold', tag: 'AA', accent: '#DA291C' },
  GATORADE: { shape: 'bottle', metal: 'gold', tag: 'POY', accent: '#F76707' },
  HSNATL: { shape: 'cup', metal: 'silver', tag: 'NATL', accent: '#1D428A' },
  // the G League, Europe, leagues abroad
  GLMVP: { shape: 'statue', metal: 'silver', tag: 'GLMVP', accent: '#C8102E' },
  EUMVP: { shape: 'statue', metal: 'gold', tag: 'EUMVP', accent: '#F76707' },
  INTMVP: { shape: 'statue', metal: 'bronze', tag: 'MVP', accent: '#2F9E44' },
  GLALL: { shape: 'shield', metal: 'silver', tag: 'ALL', sym: 'G', accent: '#C8102E' },
  EUALL: { shape: 'shield', metal: 'silver', tag: 'ALL', sym: 'E', accent: '#F76707' },
  INTALL: { shape: 'shield', metal: 'bronze', tag: 'ALL', sym: 'L', accent: '#2F9E44' },
  GLTITLE: { shape: 'cup', metal: 'silver', tag: 'GL', accent: '#C8102E' },
  EUTITLE: { shape: 'cup', metal: 'gold', tag: 'EURO', accent: '#F76707' },
  INTTITLE: { shape: 'cup', metal: 'bronze', tag: 'LGE', accent: '#2F9E44' },
  PLAYOFFMVP: { shape: 'ballped', metal: 'silver', tag: 'PO', accent: '#2F9E44' },
  // national teams
  OLYGOLD: { shape: 'medal', metal: 'gold', tag: 'OLY', ribbon: ['#1C7ED6', '#F5C542', '#18141C', '#2F9E44', '#E03131'] },
  OLYMEDAL: { shape: 'medal', metal: 'silver', tag: 'OLY', ribbon: ['#1C7ED6', '#F5C542', '#18141C', '#2F9E44', '#E03131'] },
  WCGOLD: { shape: 'medal', metal: 'gold', tag: 'WC', ribbon: ['#1D428A', '#F4F6FA'], sym: 'globe' },
  WCMEDAL: { shape: 'medal', metal: 'silver', tag: 'WC', ribbon: ['#1D428A', '#F4F6FA'], sym: 'globe' },
  ASIANGOLD: { shape: 'medal', metal: 'gold', tag: 'ASIA', ribbon: ['#C8102E', '#F4F6FA'] },
  ASIANMEDAL: { shape: 'medal', metal: 'silver', tag: 'ASIA', ribbon: ['#C8102E', '#F4F6FA'] },
  YOUTHMEDAL: { shape: 'medal', metal: 'bronze', tag: 'YOUTH', ribbon: ['#2F9E44', '#F4F6FA'] },
};

/** The spec for an award: its key first, then a few labels (bronze medals, silver medals). */
function specFor(key: string, label: string): Spec {
  const base = SPEC[key] ?? { shape: 'cup', metal: 'bronze', tag: key.replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'WIN', accent: '#5E3A1C' };
  if (base.shape === 'medal') {
    const metal: Metal | null = /bronze/i.test(label) ? 'bronze' : /silver/i.test(label) ? 'silver' : /gold/i.test(label) ? 'gold' : null;
    if (metal) return { ...base, metal };
  }
  return base;
}

// ---- painting ----
type G = string[][];
const blank = (): G => Array.from({ length: H }, () => Array(W).fill('.'));
function put(g: G, x: number, y: number, c: string) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (yi >= 0 && yi < H && xi >= 0 && xi < W) g[yi][xi] = c;
}
function rect(g: G, x: number, y: number, w: number, h: number, c: string) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(g, xx, yy, c);
}
/** Rows from y0 down, each `hw` pixels either side of the middle. */
function vase(g: G, y0: number, hws: number[], c: string) {
  hws.forEach((hw, i) => rect(g, 12 - hw, y0 + i, hw * 2, 1, c));
}
function disc(g: G, cx: number, cy: number, r: number, c: string) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) g[y][x] = c;
}
function poly(g: G, pts: Pt[], c: string) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inPoly(x + 0.5, y + 0.5, pts)) g[y][x] = c;
}
function ball(g: G, cx: number, cy: number, r: number, body = 'B', seam = 'L') {
  disc(g, cx, cy, r, body);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (g[y][x] !== body) continue;
      if (Math.abs(x + 0.5 - cx) < 0.6 || Math.abs(y + 0.5 - cy) < 0.6) g[y][x] = seam;
    }
}
/** A glyph scaled up, drawn in colour c. */
function bigGlyph(g: G, ch: string, x0: number, y0: number, k: number, c: string) {
  const bits = glyph(ch);
  for (let i = 0; i < 15; i++) if (bits[i] === '1') rect(g, x0 + (i % 3) * k, y0 + Math.floor(i / 3) * k, k, k, c);
}
function base(g: G, y0 = 16) {
  rect(g, 6, y0, 12, 3, 'K');
  rect(g, 6, y0 + 2, 12, 1, 'k');
}

function paintShape(g: G, s: Spec) {
  switch (s.shape) {
    case 'title':
      ball(g, 12, 3.6, 3.4);
      rect(g, 7, 7, 10, 1, 'Y');
      vase(g, 8, [4, 3, 3, 2, 1, 1, 2, 3, 4], 'Y');
      for (let y = 8; y < 12; y++) for (let x = 9; x < 15; x += 2) if (g[y][x] === 'Y') g[y][x] = 'y';
      base(g, 17);
      break;
    case 'cup':
      vase(g, 2, [8, 8, 8, 7, 7, 6, 5, 3, 1, 1, 1, 2, 4], 'Y');
      for (const side of [0, 1]) {
        const x = side ? 20 : 1;
        rect(g, x, 3, 3, 6, 'Y');
        rect(g, x + 1, 4, 1, 4, '.');
      }
      if (s.accent) rect(g, 6, 4, 12, 2, 'A');
      base(g, 15);
      break;
    case 'statue':
      // a player on a column, the ball raised
      disc(g, 11, 3.5, 2.3, 'Y');
      rect(g, 9, 6, 5, 5, 'Y');
      rect(g, 14, 2, 2, 5, 'Y');
      ball(g, 16.5, 1.8, 2, 'Y', 'y');
      rect(g, 7, 6, 2, 5, 'Y');
      rect(g, 9, 11, 2, 3, 'Y');
      rect(g, 12, 11, 2, 3, 'Y');
      rect(g, 8, 14, 8, 1, 'A');
      base(g, 15);
      break;
    case 'ballped':
      ball(g, 12, 5, 4.6, 'Y', 'y');
      vase(g, 10, [1, 1, 2, 3, 4], 'Y');
      rect(g, 7, 14, 10, 1, 'A');
      base(g, 15);
      break;
    case 'netcup':
      ball(g, 12, 4.5, 4.2, 'Y', 'y');
      // the net that was cut down, hanging off the side
      for (let y = 9; y < 15; y++) for (let x = 2; x < 8; x++) if ((x + y) % 2 === 0 && x - 2 > (y - 9) / 2) g[y][x] = 'w';
      vase(g, 9, [2, 3, 3, 3, 3, 4, 4], 'K');
      rect(g, 9, 11, 6, 2, 'Y');
      base(g, 16);
      break;
    case 'plaque':
      rect(g, 4, 1, 16, 17, 'K');
      rect(g, 6, 3, 12, 7, 'Y');
      poly(g, [[12, 11], [13.5, 14], [16.5, 14], [14, 15.8], [15, 18], [12, 16.6], [9, 18], [10, 15.8], [7.5, 14], [10.5, 14]], 'A');
      break;
    case 'shield': {
      const hw = [9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 7, 6, 5, 4, 3, 2, 1];
      vase(g, 1, hw, 'Y');
      vase(g, 3, hw.slice(2).map((v) => Math.max(0, v - 2)), 'A');
      if (s.ribbon) s.ribbon.forEach((_, i) => rect(g, 5 + i * 5, 3, 4, 2, `#${i}`));
      if (s.sym) bigGlyph(g, s.sym, 9, 6, 2, 'w');
      break;
    }
    case 'star': {
      const pts: Pt[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 4.2 : 9.5;
        pts.push([12 + Math.cos(a) * r, 9.5 + Math.sin(a) * r]);
      }
      poly(g, pts, 'Y');
      disc(g, 12, 10, 2.6, 'A');
      break;
    }
    case 'medal': {
      const rib = s.ribbon ?? ['#1C7ED6', '#F4F6FA'];
      // a V of ribbon from the top corners to the medal
      for (let y = 0; y < 10; y++)
        for (let x = 0; x < W; x++) {
          const l = x - (3 + y * 0.8);
          const r = 20 - y * 0.8 - x;
          if ((l >= 0 && l < 5) || (r >= 0 && r < 5)) g[y][x] = `#${Math.floor((l >= 0 && l < 5 ? l : r) * rib.length / 5)}`;
        }
      disc(g, 12, 13.5, 5.6, 'Y');
      disc(g, 12, 13.5, 3.8, 'y');
      disc(g, 12, 13.5, 3.2, 'Y');
      if (s.sym === 'globe') {
        for (let y = 10; y < 18; y++) for (let x = 8; x < 17; x++) if (g[y][x] === 'Y' && ((x - 12) % 3 === 0 || (y - 13) % 3 === 0)) g[y][x] = 'y';
      } else bigGlyph(g, '1', 11, 11, 1, 'y');
      break;
    }
    case 'crown':
      rect(g, 4, 11, 16, 5, 'Y');
      for (const x of [4, 9, 14, 19]) poly(g, [[x - 0.5, 11], [x + 1.5, 3], [x + 3.5, 11]], 'Y');
      for (const x of [5.5, 10.5, 15.5, 20.5]) disc(g, x, 3, 1.3, 'A');
      for (const x of [7, 12, 17]) rect(g, x - 1, 12, 2, 2, 'A');
      rect(g, 4, 15, 16, 1, 'y');
      base(g, 17);
      break;
    case 'hand':
      // an open hand, fingers spread: the block
      rect(g, 7, 8, 11, 6, 'Y');
      for (const [x, top] of [[7, 3], [10, 1], [13, 1], [16, 3]] as [number, number][]) rect(g, x, top, 2, 9 - top, 'Y');
      poly(g, [[7, 11], [2.5, 7], [4, 5.5], [8, 9]], 'Y');
      rect(g, 9, 14, 7, 2, 'Y');
      base(g, 16);
      break;
    case 'shoe':
      // a high-top sneaker on a pedestal: the first pair, bronzed in silver
      poly(g, [[4, 4], [10, 4], [10, 8], [20, 9], [21, 12], [4, 12]], 'A');
      rect(g, 3, 12, 19, 2, 'w');
      for (let x = 11; x < 18; x += 2) put(g, x, 9, 'w');
      for (let y = 5; y < 8; y++) put(g, 8, y, 'w');
      vase(g, 14, [8, 8], 'Y');
      base(g, 16);
      break;
    case 'six':
      bigGlyph(g, '6', 7, 1, 3, 'Y');
      base(g, 16);
      break;
    case 'arrow':
      poly(g, [[12, 0.5], [20, 8], [15, 8], [15, 15], [9, 15], [9, 8], [4, 8]], 'Y');
      rect(g, 10, 8, 4, 7, 'A');
      base(g, 16);
      break;
    case 'rack':
      rect(g, 3, 13, 18, 2, 'K');
      rect(g, 4, 15, 2, 3, 'K');
      rect(g, 18, 15, 2, 3, 'K');
      for (const x of [6.5, 12, 17.5]) ball(g, x, 10.5, 2.7);
      ball(g, 9.2, 5.6, 2.7);
      // the money ball: red, white and blue
      disc(g, 14.8, 5.6, 2.7, 'R');
      rect(g, 12, 5, 6, 1, 'w');
      rect(g, 12, 7, 6, 1, 'U');
      break;
    case 'wings':
      poly(g, [[8, 8], [1, 2], [2, 6], [0, 7], [3, 10], [1, 12], [7, 12]], 'w');
      poly(g, [[16, 8], [23, 2], [22, 6], [24, 7], [21, 10], [23, 12], [17, 12]], 'w');
      ball(g, 12, 9, 5.2);
      rect(g, 8, 16, 8, 1, 'Y');
      base(g, 17);
      break;
    case 'heart':
      disc(g, 8.5, 6, 4.2, 'A');
      disc(g, 15.5, 6, 4.2, 'A');
      poly(g, [[4.4, 7], [19.6, 7], [12, 15.5]], 'A');
      base(g, 16);
      break;
    case 'bust':
      disc(g, 12, 6, 4.6, 'Y');
      vase(g, 10, [3, 5, 7, 8], 'Y');
      vase(g, 14, [4, 4, 5], 'K');
      rect(g, 7, 17, 10, 1, 'K');
      break;
    case 'jersey':
      poly(g, [[6, 1], [9, 1], [12, 4], [15, 1], [18, 1], [18, 5], [21, 6], [20, 17], [4, 17], [3, 6], [6, 5]], 'A');
      rect(g, 4, 6, 16, 1, 'Y');
      bigGlyph(g, '1', 11, 8, 2, 'Y');
      break;
    case 'bottle':
      rect(g, 10, 0, 4, 2, 'w');
      rect(g, 9, 2, 6, 2, 'G');
      vase(g, 4, [4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4], 'A');
      rect(g, 7, 8, 10, 4, 'Y');
      bigGlyph(g, '1', 11, 9, 1, 'K');
      break;
    case 'banner':
      rect(g, 5, 0, 14, 15, 'A');
      poly(g, [[5, 14], [12, 18.5], [19, 14]], 'A');
      rect(g, 5, 1, 14, 1, 'Y');
      bigGlyph(g, '2', 7, 5, 2, 'w');
      bigGlyph(g, '3', 13, 5, 1, 'w');
      break;
  }
}

/** Shine on the left of each run of metal, shade on its right, as if lit from the left. */
function shadeMetal(g: G) {
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      if (g[y][x] !== 'Y') {
        x++;
        continue;
      }
      let e = x;
      while (e < W && g[y][e] === 'Y') e++;
      if (e - x >= 3) {
        g[y][x] = 'W';
        g[y][e - 1] = 'y';
        if (e - x >= 6) g[y][e - 2] = 'y';
      }
      x = e;
    }
  }
}

function paintAward(s: Spec, accent: string): string[][] {
  const g = blank();
  paintShape(g, s);
  shadeMetal(g);
  // the plate, with the award's tag engraved in its metal
  const tag = s.tag.slice(0, 5);
  rect(g, 1, 19, 22, 7, 'K');
  rect(g, 2, 20, 20, 5, 'k');
  const x0 = Math.floor((W - (tag.length * 4 - 1)) / 2);
  [...tag].forEach((ch, i) => bigGlyph(g, ch, x0 + i * 4, 20, 1, 'W'));
  const [m, ms, mw] = METAL[s.metal];
  const acc = s.accent ?? accent;
  const rib = s.ribbon ?? [];
  const pal: Record<string, string> = {
    Y: m,
    y: ms,
    W: mw,
    K: '#5E3A1C',
    k: '#3A2416',
    B: '#E8782A',
    b: '#C2571B',
    L: '#6A3416',
    A: acc,
    a: dark(acc, 0.25),
    R: '#E03131',
    U: '#1C7ED6',
    w: '#F4F6FA',
    G: '#2F9E44',
    O: '#18141C',
  };
  rib.forEach((c, i) => (pal[`#${i}`] = c));
  const out = g.map((row) => row.map((c) => (c === '.' ? '' : (pal[c] ?? ''))));
  // a dark outline round the whole piece
  const solid = (x: number, y: number) => !!out[y]?.[x] && out[y][x] !== '#18141C';
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (!out[y][x] && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) out[y][x] = '#18141C';
  // a little shine on the accent
  for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) if (out[y][x] === acc && out[y][x + 1] === acc && (x === 0 || out[y][x - 1] !== acc)) out[y][x] = light(acc, 0.25);
  return out;
}

/** The trophy's pixels as paths (24 by 26), to place inside another picture. */
export const awardPaths = (akey: string, label: string, color: string) => toPaths(paintAward(specFor(akey, label), color));

/** The trophy for an award, by its key (and label, for medal colours). */
export function AwardArt({ akey, label = '', color = '#C8102E', size = 32 }: { akey: string; label?: string; color?: string; size?: number }) {
  const paths = useMemo(() => toPaths(paintAward(specFor(akey, label), color)), [akey, label, color]);
  return (
    <svg className="art art-award" width={(size * W) / H} height={size} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label={label || akey}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}

/** An award's key from its label, for screens that only have the words. */
export function awardKeyOf(label: string): string {
  const l = label.toLowerCase();
  const rules: [RegExp, string][] = [
    [/finals mvp/, 'FMVP'],
    [/conference finals mvp/, 'CFMVP'],
    [/final four|most outstanding/, 'FFMOP'],
    [/all-star game mvp/, 'ASGMVP'],
    [/cup mvp/, 'CUPMVP'],
    [/euroleague mvp/, 'EUMVP'],
    [/g league mvp/, 'GLMVP'],
    [/playoff mvp|playoffs mvp/, 'PLAYOFFMVP'],
    [/naismith/, 'NAISMITH'],
    [/gatorade/, 'GATORADE'],
    [/mcdonald/, 'MCDAA'],
    [/defensive player/, 'DPOY'],
    [/rookie of the year/, 'ROY'],
    [/all-rookie/, 'ALLROOKIE'],
    [/sixth man/, 'SIXTH'],
    [/most improved/, 'MIP'],
    [/player of the year/, 'CONFPOY'],
    [/^mvp$|most valuable/, 'MVP'],
    [/mvp/, 'INTMVP'],
    [/all-nba (1st|first)/, 'ALLNBA1'],
    [/all-nba (2nd|second)/, 'ALLNBA2'],
    [/all-nba (3rd|third)/, 'ALLNBA3'],
    [/all-american 1st/, 'AA1'],
    [/all-american 2nd/, 'AA2'],
    [/all-star/, 'ALLSTAR'],
    [/all-state/, 'ALLSTATE'],
    [/all-g league/, 'GLALL'],
    [/all-euroleague/, 'EUALL'],
    [/^all-/, 'ALLCONF'],
    [/scoring/, 'SCORING'],
    [/assists title/, 'ASTLEAD'],
    [/rebounding title/, 'REBLEAD'],
    [/steals title/, 'STLLEAD'],
    [/blocks title/, 'BLKLEAD'],
    [/3-point contest|three-point contest/, '3PT'],
    [/dunk/, 'DUNK'],
    [/nba cup/, 'NBACUP'],
    [/community/, 'COMMUNITY'],
    [/hall of fame/, 'HOF'],
    [/rafters/, 'RAFTERS'],
    [/olympic.*gold/, 'OLYGOLD'],
    [/olympic/, 'OLYMEDAL'],
    [/world cup.*gold/, 'WCGOLD'],
    [/world cup/, 'WCMEDAL'],
    [/asian games.*gold/, 'ASIANGOLD'],
    [/asian games/, 'ASIANMEDAL'],
    [/youth|u1[6-9]|u2[01]/, 'YOUTHMEDAL'],
    [/nba champ/, 'TITLE'],
    [/national champ|ncaa/, 'NCAATITLE'],
    [/euroleague/, 'EUTITLE'],
    [/g league/, 'GLTITLE'],
    [/tournament champ/, 'CONFTOURN'],
    [/state champ|state title/, 'STATETITLE'],
    [/national prep|invitational/, 'HSNATL'],
    [/champ|title/, 'INTTITLE'],
  ];
  return rules.find(([r]) => r.test(l))?.[1] ?? 'INTTITLE';
}
