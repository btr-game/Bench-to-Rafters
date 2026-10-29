import { useMemo } from 'react';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE, type KitLeague, type TeamStyle } from '../../content/teamStyle';
import { hash, ink, rgb, shade, tint } from './color';
import { MOTIFS } from './motifs';
import { glyph, inCircle, inPoly, toPaths, type Pt } from './pixel';

// Team crests (round 17), in pixels to match the player sprites. NBA teams get their real colours
// and a motif that nods to the club (content/teamStyle.ts, art/motifs.ts); never a copy of a real
// logo. Every other team (college, G KitLeague, clubs abroad) gets a generic crest: a shape, a
// pattern and an emblem picked from its name, painted in its own colour.

const N = 24;
const SHAPES: ((x: number, y: number) => boolean)[] = [
  (x, y) => inPoly(x, y, [[12, 1], [22.5, 4.5], [22.5, 13], [12, 23.5], [1.5, 13], [1.5, 4.5]] as Pt[]), // shield
  (x, y) => inCircle(x, y, [12, 12], 11.2), // roundel
  (x, y) => inPoly(x, y, [[12, 0.8], [22, 6.4], [22, 17.6], [12, 23.2], [2, 17.6], [2, 6.4]] as Pt[]), // hexagon
  (x, y) => inPoly(x, y, [[2, 1.5], [22, 1.5], [22, 17], [12, 23.5], [2, 17]] as Pt[]), // pennant
  (x, y) => inPoly(x, y, [[4, 1.5], [20, 1.5], [22.5, 4], [22.5, 20], [20, 22.5], [4, 22.5], [1.5, 20], [1.5, 4]] as Pt[]), // badge
];
const PATTERNS: ((x: number, y: number) => boolean)[] = [
  (x, y) => y + x * 0.5 > 15 && y + x * 0.5 < 19.5, // sash
  (x, y) => Math.abs(y - 15 - Math.abs(x - 12) * -0.45) < 1.6, // chevron
  (x) => x > 12, // halves
  (_, y) => y < 4 || y > 19.5, // bands
];
// 7-wide emblems, row by row
const EMBLEMS = [
  ['..###..', '.#.#.#.', '#######', '.#.#.#.', '..###..'], // ball
  ['...#...', '..###..', '#######', '.#####.', '.##.##.'], // star
  ['#..#..#', '##.#.##', '#######', '#######'], // crown
  ['..#....', '.###.#.', '#######', '#######'], // peaks
  ['....##.', '...##..', '..####.', '...##..', '..##...'], // bolt
  ['...#...', '..##...', '..###..', '.#####.', '.##.##.'], // flame
  ['##...##', '.##.##.', '..###..'], // wings
];

function paintCrest(name: string, abbr: string, color: string): string[][] {
  const h = hash(name);
  const inShape = SHAPES[h % SHAPES.length];
  const pattern = PATTERNS[(h >>> 4) % PATTERNS.length];
  const emblem = EMBLEMS[(h >>> 8) % EMBLEMS.length];
  const fg = ink(color);
  const lightTeam = fg !== '#FFFFFF';
  const second = (h >>> 12) % 3 === 0 && !lightTeam ? '#F2C14E' : lightTeam ? shade(color, 0.45) : tint(color, 0.32);
  const grid: string[][] = Array.from({ length: N }, () => Array(N).fill(''));
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && inShape(x + 0.5, y + 0.5);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (!inside(x, y)) {
        if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) grid[y][x] = '#17131A';
        continue;
      }
      const rim = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      grid[y][x] = rim ? second : pattern(x + 0.5, y + 0.5) ? shade(second, lightTeam ? 0 : 0.1) : (x + y) % 7 === 0 && y < 8 ? tint(color, 0.12) : color;
    }
  const stamp = (rows: string[], x0: number, y0: number, c: string, under: string) => {
    rows.forEach((row, dy) =>
      [...row].forEach((b, dx) => {
        if (b !== '#' && b !== '1') return;
        if (inside(x0 + dx + 1, y0 + dy + 1) && grid[y0 + dy + 1][x0 + dx + 1] !== c) grid[y0 + dy + 1][x0 + dx + 1] = under;
      }),
    );
    rows.forEach((row, dy) => [...row].forEach((b, dx) => (b === '#' || b === '1') && inside(x0 + dx, y0 + dy) && (grid[y0 + dy][x0 + dx] = c)));
  };
  const under = lightTeam ? tint(color, 0.45) : shade(color, 0.5);
  stamp(emblem, 9 - (emblem[0].length > 7 ? 1 : 0), 10 - emblem.length - 1 + 1, fg, under);
  const label = abbr.slice(0, 4).toUpperCase();
  const width = label.length * 4 - 1;
  const rows = Array.from({ length: 5 }, (_, r) => [...label].map((ch) => glyph(ch).slice(r * 3, r * 3 + 3)).join('0'));
  stamp(rows, Math.floor((N - width) / 2), 12, fg, under);
  return grid;
}

const lum = (c: string) => {
  const [r, g, b] = rgb(c);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
/** The first colour that stands out on the background. */
const against = (bg: string, ...options: string[]) => options.find((c) => Math.abs(lum(c) - lum(bg)) > 70) ?? ink(bg);

const M = 32;
// 0 shield, 1 roundel, 2 hexagon, 3 pennant, 4 badge: the outline closest to each club's own style
const NBA_SHAPE: Record<string, number> = { BOS: 1, BKN: 1, NYK: 1, PHI: 1, TOR: 1, DET: 1, IND: 1, MIL: 1, ATL: 1, MIA: 1, WAS: 1, DEN: 1, GSW: 1, LAL: 1, HOU: 1, CLE: 0, NOP: 0, SAC: 0, POR: 0, ORL: 0, CHI: 4, UTA: 4, DAL: 4, MEM: 4, CHA: 2, MIN: 2, OKC: 2, SAS: 3, PHX: 3, LAC: 3 };

function paintNbaCrest(abbr: string, st: TeamStyle, label = abbr): string[][] {
  const shapeAt = SHAPES[NBA_SHAPE[abbr] ?? hash(abbr) % SHAPES.length];
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < M && y < M && shapeAt(((x + 0.5) * 24) / M, ((y + 0.5) * 24) / M);
  const ring = against(st.c1, st.c2, st.c3, '#FFFFFF');
  const motifInk = against(st.c1, st.c2 === ring ? '#FFFFFF' : st.c2, '#FFFFFF', st.c3);
  const accent = against(motifInk, st.c3, st.c1, st.c2);
  const grid: string[][] = Array.from({ length: M }, () => Array(M).fill(''));
  for (let y = 0; y < M; y++)
    for (let x = 0; x < M; x++) {
      if (!inside(x, y)) {
        if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) grid[y][x] = '#17131A';
        continue;
      }
      const d1 = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const d2 = !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2);
      const d3 = !inside(x - 3, y) || !inside(x + 3, y) || !inside(x, y - 3) || !inside(x, y + 3);
      grid[y][x] = d1 ? shade(ring, 0.25) : d2 ? ring : d3 ? shade(st.c1, 0.35) : y < 10 && (x + y) % 9 === 0 ? tint(st.c1, 0.1) : st.c1;
    }
  const motif = MOTIFS[TEAM_STYLE[abbr].motif];
  const x0 = Math.floor((M - motif[0].length) / 2);
  const y0 = 4 + Math.floor((13 - motif.length) / 2);
  const shadow = shade(st.c1, 0.45);
  motif.forEach((row, dy) => [...row].forEach((ch, dx) => ch !== '.' && inside(x0 + dx + 1, y0 + dy + 1) && grid[y0 + dy + 1][x0 + dx + 1] === st.c1 && (grid[y0 + dy + 1][x0 + dx + 1] = shadow)));
  motif.forEach((row, dy) => [...row].forEach((ch, dx) => ch !== '.' && (grid[y0 + dy][x0 + dx] = ch === '+' ? accent : motifInk)));
  // the team code on a band across the bottom
  const band = shade(st.c1, 0.4);
  for (let y = 20; y < 27; y++) for (let x = 0; x < M; x++) if (inside(x, y) && inside(x - 3, y) && inside(x + 3, y)) grid[y][x] = band;
  const text = label.toUpperCase().slice(0, 5);
  const width = text.length * 4 - 1;
  const lx = Math.floor((M - width) / 2);
  [...text].forEach((ch, i) => {
    const g = glyph(ch);
    for (let k = 0; k < 15; k++) if (g[k] === '1') grid[21 + Math.floor(k / 3)][lx + i * 4 + (k % 3)] = ring === '#FFFFFF' || lum(ring) > 120 ? ring : '#FFFFFF';
  });
  return grid;
}

/** Colleges and high schools: a big block letter (on a felt patch for a high school). */
function paintLetterCrest(name: string, color: string, school: boolean): string[][] {
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < M && y < M && SHAPES[school ? 4 : 0](((x + 0.5) * 24) / M, ((y + 0.5) * 24) / M);
  const fg = against(color, '#FFFFFF', '#18141C');
  const g: string[][] = Array.from({ length: M }, () => Array(M).fill(''));
  for (let y = 0; y < M; y++)
    for (let x = 0; x < M; x++) {
      if (!inside(x, y)) {
        if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) g[y][x] = '#17131A';
        continue;
      }
      const d1 = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const d2 = !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2);
      // felt has a weave; a college shield a clean field
      g[y][x] = d1 ? shade(color, 0.4) : d2 ? fg : school && (x + y) % 2 === 0 ? shade(color, 0.08) : color;
    }
  const ch = (name.replace(/^(St\.|Saint|The)\s+/, '').match(/[A-Za-z]/)?.[0] ?? 'T').toUpperCase();
  const bits = glyph(ch);
  const k = 3;
  const x0 = Math.floor((M - 3 * k) / 2);
  const y0 = school ? 7 : 6;
  const cells: Pt[] = [];
  for (let i = 0; i < 15; i++) if (bits[i] === '1') for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) cells.push([x0 + (i % 3) * k + dx, y0 + Math.floor(i / 3) * k + dy]);
  // the letter gets a shadow (college) or a chenille outline (high school)
  for (const [x, y] of cells)
    for (const [dx, dy] of (school ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1]]) as Pt[]) if (inside(x + dx, y + dy)) g[y + dy][x + dx] = school ? fg : shade(color, 0.5);
  for (const [x, y] of cells) g[y][x] = school ? color : fg;
  if (school) for (const [x, y] of cells) if ((x + y) % 3 === 0) g[y][x] = shade(color, 0.15);
  return g;
}

/** Clubs abroad: a football-style roundel of vertical stripes with the club's initials. */
function paintClubCrest(abbr: string, color: string): string[][] {
  const inside = (x: number, y: number) => (x + 0.5 - 16) ** 2 + (y + 0.5 - 16) ** 2 <= 15 * 15;
  const inner = (x: number, y: number) => (x + 0.5 - 16) ** 2 + (y + 0.5 - 16) ** 2 <= 11.5 * 11.5;
  const second = against(color, '#FFFFFF', '#F2C14E', '#18141C');
  const g: string[][] = Array.from({ length: M }, () => Array(M).fill(''));
  for (let y = 0; y < M; y++)
    for (let x = 0; x < M; x++) {
      if (!inside(x, y)) {
        if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) g[y][x] = '#17131A';
        continue;
      }
      if (!inner(x, y)) g[y][x] = inner(x - 1, y) || inner(x + 1, y) || inner(x, y - 1) || inner(x, y + 1) ? second : shade(color, 0.3);
      else g[y][x] = Math.floor((x - 4) / 4) % 2 === 0 ? color : second;
    }
  // a band across the middle with the initials, and a star above for the founders
  for (let y = 13; y < 20; y++) for (let x = 5; x < 27; x++) if (inner(x, y)) g[y][x] = shade(color, 0.35);
  const text = abbr.toUpperCase().slice(0, 4);
  const lx = Math.floor((M - (text.length * 4 - 1)) / 2);
  [...text].forEach((ch, i) => {
    const b = glyph(ch);
    for (let k = 0; k < 15; k++) if (b[k] === '1') g[14 + Math.floor(k / 3)][lx + i * 4 + (k % 3)] = '#FFFFFF';
  });
  for (const [x, y] of [[16, 5], [15, 6], [16, 6], [17, 6], [16, 7]] as Pt[]) g[y][x] = second === '#FFFFFF' ? '#F2C14E' : '#FFFFFF';
  return g;
}

/** The NBA team a crest belongs to, if any (a college or club abroad can share a short code). */
const nbaAbbr = (name: string, abbr: string) => (TEAM_STYLE[abbr] && NBA_TEAMS.some((t) => t.abbr === abbr && name.includes(t.nick)) ? abbr : null);

export function TeamArt({ name, abbr, color = '#2A2F36', league, size = 44 }: { name: string; abbr: string; color?: string; league?: KitLeague; size?: number }) {
  const nba = nbaAbbr(name, abbr);
  const parent = !nba && league === 'GL' ? NBA_TEAMS.find((t) => t.gl === name) : undefined;
  const grid = useMemo(
    () =>
      nba
        ? paintNbaCrest(nba, TEAM_STYLE[nba])
        : parent
          ? paintNbaCrest(parent.abbr, TEAM_STYLE[parent.abbr], abbr.slice(0, 4))
          : league === 'NCAA' || league === 'HS'
            ? paintLetterCrest(name, color, league === 'HS')
            : league === 'EU' || league === 'INT'
              ? paintClubCrest(abbr, color)
              : paintCrest(name, abbr, color),
    [nba, parent, league, name, abbr, color],
  );
  const paths = useMemo(() => toPaths(grid), [grid]);
  const n = grid.length;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="art art-team" data-art="team-logo" width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label={`${name} crest`}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
