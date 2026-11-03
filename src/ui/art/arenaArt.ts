// The town's arenas and schools (round 37, owner: "make each stadium unique? especially for nba
// team stadiums, make the design symbolize the team and city"). An arena is a body in its skin
// (glass, brick, a weathered-steel lattice, stone, stucco or adobe) under its roof (a flat box, a
// saucer, a dome, a tall drum, an arch, a wave, a sail or a row of peaks), with the team's emblem
// on a panel over the doors and, in the NBA, its city's landmark beside it (ui/arenas.ts says
// which). A high school has its tower, its brick and its flag. Rectangles on the street's grid.

import type { Landmark, Roof, SchoolSpec, Skin } from '../arenas';
import { C, G, courses, dome, doorFill, gable, windows, type Px } from './townPx';

interface Colors {
  c1: string;
  c2: string;
  c3: string;
}

/** How light a colour is, 0 to 255. */
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
};
/** A second colour that reads on the first: its own, or white or black when the two are too close. */
const onto = (fg: string, bg: string) => (Math.abs(lum(fg) - lum(bg)) > 60 ? fg : lum(bg) > 140 ? '#20242B' : '#FFFFFF');

// ---------- the body, in its skin ----------

const BODY = 15; // how tall an arena's walls stand

const SKIN: Record<Skin, { wall: string; edge: string; roof: string; roofEdge: string }> = {
  glass: { wall: C.glassD, edge: C.steel, roof: C.steel, roofEdge: C.steelD },
  brick: { wall: C.brick, edge: C.brickL, roof: C.roofD, roofEdge: C.roof },
  lattice: { wall: '#8C4A2B', edge: '#A65F3A', roof: '#6B3520', roofEdge: '#8C4A2B' },
  stone: { wall: C.stone, edge: C.stoneL, roof: C.stoneD, roofEdge: C.stone },
  stucco: { wall: '#F1EFE8', edge: '#FFFFFF', roof: '#E2DED3', roofEdge: '#FFFFFF' },
  adobe: { wall: '#D39B63', edge: '#E6B783', roof: '#B47C47', roofEdge: '#C98D55' },
};

function body(skin: Skin, ax: number, aw: number): Px[] {
  const top = G - BODY;
  const k = SKIN[skin];
  const out: Px[] = [[ax, top, aw, BODY, k.wall], [ax, top, aw, 1, k.edge]];
  switch (skin) {
    case 'glass':
      out.push(...windows(ax + 2, top + 3, Math.floor((aw - 3) / 5), 2, 4, 3, 1, 2));
      break;
    case 'brick':
      out.push(...courses(ax, top, aw, BODY), ...windows(ax + 3, top + 4, Math.floor((aw - 4) / 6), 1, 3, 5, 3));
      for (let x = ax + 3; x + 3 <= ax + aw - 1; x += 6) out.push([x + 1, top + 3, 1, 1, '.tw-win']);
      break;
    case 'lattice':
      // a weathered-steel lattice over a glass lobby
      out.push([ax + 2, G - 9, aw - 4, 3, '.tw-win']);
      for (let y = 0; y < BODY - 1; y++) for (let x = 0; x < aw; x++) if ((x + y) % 6 === 0 || (x - y + 60) % 6 === 0) out.push([ax + x, top + 1 + y, 1, 1, '#6B3520']);
      break;
    case 'stone':
      for (let x = ax; x < ax + aw; x += 7) out.push([x, top + 1, 2, BODY - 1, C.stoneD]);
      out.push(...windows(ax + 3, top + 3, Math.floor((aw - 3) / 7), 1, 3, 6, 4));
      break;
    case 'stucco':
      out.push([ax, top + 3, aw, 1, '#D9D6CC'], [ax + 2, top + 5, aw - 4, 3, '.tw-win'], [ax, top + 9, aw, 1, '#D9D6CC']);
      break;
    default:
      // adobe: the beams' ends under the roofline, small deep windows
      for (let x = ax + 2; x < ax + aw - 1; x += 5) out.push([x, top + 2, 2, 1, C.trunk]);
      out.push(...windows(ax + 4, top + 5, Math.floor((aw - 5) / 8), 2, 3, 2, 5, 2));
  }
  return out;
}

// ---------- the roofs ----------

function roof(kind: Roof, skin: Skin, ax: number, aw: number, c: Colors, flip: boolean): Px[] {
  const base = G - BODY - 1; // the roof's bottom row
  const k = SKIN[skin];
  const out: Px[] = [];
  switch (kind) {
    case 'box':
      out.push([ax - 1, base - 1, aw + 2, 2, k.roof]);
      for (let x = ax + 1; x < ax + aw - 1; x += 4) out.push([x, base - 2, 2, 1, c.c1]);
      break;
    case 'saucer':
      out.push(...dome(ax - 2, base, aw + 4, 5, k.roof), [ax, base, aw, 1, c.c1]);
      for (let x = ax + 2; x < ax + aw - 1; x += 4) out.push([x, base - 2, 1, 1, '.tw-bulb']);
      break;
    case 'dome': {
      const rows = dome(ax + 3, base, aw - 6, 11, k.roof);
      rows.forEach((r, i) => out.push(i % 3 === 1 ? [r[0], r[1], r[2], r[3], k.roofEdge] : r));
      out.push([ax + Math.floor(aw / 2) - 1, base - 12, 2, 2, c.c1]);
      break;
    }
    case 'drum':
      // a tall round drum: ribs all the way round, the team's ring at the top
      out.push([ax + 4, base - 8, aw - 8, 9, k.wall]);
      for (let x = ax + 5; x < ax + aw - 4; x += 3) out.push([x, base - 8, 1, 9, k.roof]);
      out.push([ax + 3, base - 9, aw - 6, 1, c.c1], [ax + 2, base - 10, aw - 4, 1, k.roof], [ax - 1, base, aw + 2, 1, k.roof]);
      break;
    case 'arch': {
      const rows = dome(ax, base, aw, 8, C.steel);
      rows.forEach((r, i) => out.push(i % 2 ? [r[0], r[1], r[2], r[3], C.steelD] : r));
      out.push([ax, base, aw, 1, c.c1]);
      break;
    }
    case 'wave':
      for (let i = 0; i < aw; i++) {
        const h = 3 + Math.round(2.5 * (1 + Math.sin((i + (flip ? 9 : 0)) / 6)));
        out.push([ax + i, base - h + 1, 1, h, k.roof], [ax + i, base - h + 1, 1, 1, k.roofEdge]);
      }
      out.push([ax, base, aw, 1, c.c1]);
      break;
    case 'sail':
      // a roof rising like a sail, toward the water
      for (let i = 0; i < aw; i++) {
        const t = flip ? aw - 1 - i : i;
        const h = 2 + Math.round((t / aw) * 11);
        out.push([ax + i, base - h + 1, 1, h, '#DDE6EE'], [ax + i, base - h + 1, 1, 1, '#FFFFFF']);
      }
      out.push([ax, base, aw, 1, c.c1]);
      break;
    default: {
      // peaks: a row of sharp gables in the roof's colour, edged in the team's
      const n = Math.max(3, Math.round(aw / 12));
      const pw = Math.floor(aw / n);
      for (let i = 0; i < n; i++) out.push(...gable(ax + i * pw, base, pw, k.roof, c.c1));
    }
  }
  return out;
}

// ---------- the emblem over the doors ----------

/** Where the emblem's panel stands: x, y, width and height, frame included. */
function panelBox(rows: string[], door: number): [number, number, number, number] {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  return [door - Math.floor(w / 2) - 2, G - 8 - h - 2, w + 4, h + 4];
}
const overlaps = (p: Px, b: [number, number, number, number]) => p[0] < b[0] + b[2] && p[0] + p[2] > b[0] && p[1] < b[1] + b[3] && p[1] + p[3] > b[1];

/** A panel with the emblem's pixels: '#' in the team's second colour, '+' in its third. */
function emblem(rows: string[], door: number, c: Colors): Px[] {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const px = door - Math.floor(w / 2) - 1;
  const py = G - 8 - h - 1;
  const ink = onto(c.c2, c.c1);
  const accent = onto(c.c3, c.c1);
  const out: Px[] = [[px - 1, py - 1, w + 4, h + 4, ink], [px, py, w + 2, h + 2, c.c1]];
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && out.push([px + 1 + x, py + 1 + y, 1, 1, ch === '+' ? accent : ink])));
  return out;
}

/** An arena: its body, its roof, the doors, the emblem over them and banners for the titles won there. */
export function arenaPx(o: { roof: Roof; skin: Skin; ax: number; aw: number; door: number; c: Colors; emblem: string[]; open: boolean; banners: number; flip: boolean }): Px[] {
  const { ax, aw, door, c } = o;
  // the windows' light is its own layer, drawn over the walls: none behind the emblem or the doors
  const keep = [panelBox(o.emblem, door), [door - 7, G - 6, 14, 6] as [number, number, number, number]];
  const out: Px[] = [...roof(o.roof, o.skin, ax, aw, c, o.flip), ...body(o.skin, ax, aw)].filter((p) => !p[4].startsWith('.') || !keep.some((b) => overlaps(p, b)));
  out.push([ax, G - BODY + 1, aw, 1, c.c1]);
  // the titles he won with this team, one banner each down the side of the front
  for (let i = 0; i < Math.min(4, o.banners); i++) out.push([ax + 2 + i * 4, G - BODY + 2, 3, 5, c.c1], [ax + 2 + i * 4, G - BODY + 2, 3, 1, C.gold]);
  out.push(...emblem(o.emblem, door, c));
  out.push([door - 7, G - 6, 14, 6, C.steelD], [door - 6, G - 5, 12, 5, doorFill(o.open)], [door - 2, G - 5, 1, 5, C.steelD], [door + 2, G - 5, 1, 5, C.steelD]);
  return out;
}

// ---------- the city's landmark, on a 22-wide plot beside the arena ----------

const L = {
  rust: '#C0362C', rustD: '#8E2620', concrete: '#C9C4BA', concreteD: '#A9A39A', black: '#26282E', deco: '#B8B2A6',
  peach: '#F7A072', pink: '#F7B6C8', teal: '#2BB3A6', rock: '#C2562E', rockD: '#9A3F1F', snow: '#FFFFFF', mount: '#7D8CA3', mountD: '#61708A',
  sand: '#E2C48E', green: '#3F8F3A', copper: '#5C9C84', limestone: '#D8C8A8', limestoneD: '#B9A784', yellow: '#E9C46A', iron: '#2F4A3F', water: '#4C9BE8',
};

/** A stepped diagonal line, one pixel a step. */
function line(x0: number, y0: number, x1: number, y1: number, fill: string): Px[] {
  const out: Px[] = [];
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) out.push([Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1, fill]);
  return out;
}

/** A palm: a leaning trunk and its fronds. */
function palm(x: number, h = 16): Px[] {
  const out: Px[] = [];
  for (let i = 0; i < h; i++) out.push([x + Math.round(i / 6), G - 1 - i, 1, 1, C.trunk]);
  const tx = x + Math.round(h / 6);
  const ty = G - h;
  out.push([tx - 4, ty, 9, 1, C.leaf], [tx - 5, ty + 1, 2, 1, C.leaf], [tx + 4, ty + 1, 2, 1, C.leaf], [tx - 2, ty - 1, 5, 1, C.leafL], [tx - 6, ty + 2, 1, 1, C.leafD], [tx + 6, ty + 2, 1, 1, C.leafD]);
  return out;
}

/** A snowy pine. */
const pine = (x: number, h: number): Px[] => [
  ...Array.from({ length: h }, (_, i): Px => [x - Math.floor(i / 2), G - h - 2 + i, Math.floor(i / 2) * 2 + 1, 1, i % 3 === 0 ? L.snow : C.leafD]),
  [x, G - 2, 1, 2, C.trunk],
];

export function landmarkPx(mark: Landmark, lx: number): Px[] {
  const m = lx + 11; // the plot's middle
  switch (mark) {
    case 'steeple': // Boston: the Old North Church
      return [[lx + 2, G - 8, 16, 8, C.brick], ...courses(lx + 2, G - 8, 16, 8), ...windows(lx + 4, G - 6, 3, 1, 2, 3, 3), [m - 3, G - 18, 6, 10, C.brick], [m - 3, G - 23, 6, 5, C.white], [m - 1, G - 22, 2, 3, C.ink], [m - 2, G - 26, 4, 3, C.white], [m - 1, G - 29, 2, 3, C.white], [m - 1, G - 31, 1, 2, C.white]];
    case 'bridge': // Brooklyn: a stone tower of the bridge, its cables
      return [...line(lx, G - 4, m - 5, G - 24, C.steelD), ...line(lx + 21, G - 4, m + 5, G - 24, C.steelD), ...line(lx, G - 10, m - 5, G - 22, C.steel), [m - 6, G - 26, 12, 26, C.stoneD], [m - 6, G - 26, 12, 1, C.stone], [m - 4, G - 21, 3, 9, '.tw-gap'], [m + 1, G - 21, 3, 9, '.tw-gap'], [m - 3, G - 22, 1, 1, '.tw-gap'], [m + 2, G - 22, 1, 1, '.tw-gap']];
    case 'empire': // New York: the Empire State's steps and spire
      return [[m - 7, G - 17, 14, 17, L.deco], [m - 5, G - 22, 10, 5, L.deco], [m - 3, G - 26, 6, 4, L.deco], [m - 1, G - 29, 2, 3, L.deco], [m, G - 32, 1, 3, C.steel], ...windows(m - 6, G - 15, 6, 4, 1, 1, 1, 2), ...windows(m - 4, G - 21, 4, 1, 1, 1, 1, 2)];
    case 'hall': // Philadelphia: Independence Hall's tower
      return [[lx + 1, G - 9, 20, 9, C.brick], [lx + 1, G - 9, 20, 1, C.white], ...windows(lx + 3, G - 7, 5, 1, 2, 3, 2), [m - 3, G - 17, 6, 8, C.brick], [m - 1, G - 15, 2, 2, C.white], [m - 2, G - 21, 4, 4, C.white], [m - 1, G - 24, 2, 3, C.white], [m, G - 26, 1, 2, C.white]];
    case 'cntower': // Toronto: the CN Tower
      return [[m - 3, G - 4, 7, 4, L.concreteD], [m - 1, G - 30, 3, 26, L.concrete], [m - 4, G - 22, 9, 3, L.concreteD], [m - 4, G - 21, 9, 1, '.tw-win'], [m - 2, G - 26, 5, 2, L.concreteD], [m, G - 33, 1, 3, C.steel]];
    case 'willis': // Chicago: the black tower, its two antennas
      return [[m - 7, G - 20, 14, 20, L.black], [m - 5, G - 25, 10, 5, L.black], [m - 3, G - 29, 6, 4, L.black], [m - 2, G - 33, 1, 4, C.steel], [m + 1, G - 33, 1, 4, C.steel], ...windows(m - 6, G - 18, 6, 6, 1, 1, 1, 2), ...windows(m - 4, G - 24, 4, 1, 1, 1, 1, 2)];
    case 'terminal': // Cleveland: the Terminal Tower
      return [[m - 8, G - 12, 16, 12, C.stone], ...windows(m - 7, G - 10, 5, 2, 2, 2, 1, 2), [m - 4, G - 23, 8, 11, C.stone], ...windows(m - 3, G - 21, 3, 3, 1, 2, 1, 1), [m - 3, G - 26, 6, 3, C.stoneD], [m - 2, G - 28, 4, 2, C.stone], [m - 1, G - 31, 2, 3, C.stoneD]];
    case 'rencen': // Detroit: the Renaissance Center's round glass towers
      return [[lx + 2, G - 20, 6, 20, C.glass], [lx + 14, G - 20, 6, 20, C.glass], [m - 3, G - 29, 6, 29, C.glassD], ...[2, 14].flatMap((dx): Px[] => Array.from({ length: 6 }, (_, i): Px => [lx + dx, G - 18 + i * 3, 6, 1, '.tw-win'])), ...Array.from({ length: 9 }, (_, i): Px => [m - 3, G - 27 + i * 3, 6, 1, '.tw-win'])];
    case 'obelisk': // Indianapolis: the monument, its pool, a checkered flag
      return [[lx + 1, G - 2, 20, 2, L.water], [m - 5, G - 6, 10, 4, C.stoneD], [m - 2, G - 22, 4, 16, C.stone], [m - 1, G - 26, 2, 4, C.stone], [m - 1, G - 28, 2, 2, C.gold], [lx + 19, G - 17, 1, 15, C.steelD], [lx + 15, G - 17, 2, 1, C.ink], [lx + 17, G - 17, 2, 1, C.white], [lx + 15, G - 16, 2, 1, C.white], [lx + 17, G - 16, 2, 1, C.ink], [lx + 15, G - 15, 2, 1, C.ink], [lx + 17, G - 15, 2, 1, C.white]];
    case 'wings': // Milwaukee: the art museum's white wings over the lake
      return [[lx + 2, G - 5, 18, 5, C.white], [lx + 4, G - 4, 14, 2, '.tw-win'], [m, G - 22, 1, 17, C.white], ...Array.from({ length: 9 }, (_, i): Px[] => [[m - 1 - i, G - 8 - i, 1, 2, C.white], [m + 1 + i, G - 8 - i, 1, 2, C.white]]).flat()];
    case 'peach': // Atlanta: a round glass tower, the peach on its pole
      return [[lx + 3, G - 27, 9, 27, C.glassD], ...Array.from({ length: 8 }, (_, i): Px => [lx + 3, G - 25 + i * 3, 9, 1, '.tw-win']), [lx + 3, G - 28, 9, 1, C.steel], [lx + 17, G - 13, 1, 13, C.steelD], [lx + 15, G - 18, 5, 5, L.peach], [lx + 16, G - 19, 3, 1, L.peach], [lx + 18, G - 20, 2, 1, C.leaf]];
    case 'crowntower': // Charlotte: the Queen City's crowned tower
      return [[m - 5, G - 26, 10, 26, C.steel], ...windows(m - 4, G - 24, 4, 7, 1, 2, 1, 1), [m - 5, G - 27, 10, 1, C.gold], ...Array.from({ length: 5 }, (_, i): Px => [m - 5 + i * 2 + 1, G - 31 + (i === 2 ? -1 : 0), 1, 4 + (i === 2 ? 1 : 0), C.gold])];
    case 'deco': // Miami: an art deco hotel, its neon, a palm
      return [[lx + 1, G - 17, 14, 17, L.pink], [lx + 1, G - 17, 14, 1, L.teal], [lx + 1, G - 11, 14, 1, L.teal], [lx + 1, G - 5, 14, 1, L.teal], ...windows(lx + 3, G - 15, 3, 2, 2, 3, 2, 3), [lx + 13, G - 21, 2, 12, '.tw-neon'], ...palm(lx + 16, 15)];
    case 'coaster': { // Orlando: a roller coaster's loop
      const out: Px[] = [];
      for (let a = 0; a < 40; a++) {
        const t = (a / 40) * Math.PI * 2;
        out.push([Math.round(m + 7 * Math.cos(t)), Math.round(G - 12 + 8 * Math.sin(t)), 1, 1, '#E64C9A']);
      }
      out.push(...line(lx, G - 2, m - 7, G - 12, '#E64C9A'), [m - 1, G - 4, 1, 4, C.steelD], [m + 5, G - 6, 1, 6, C.steelD], [lx + 2, G - 4, 1, 4, C.steelD]);
      return out;
    }
    case 'capitol': // Washington: the Capitol dome
      return [[lx + 1, G - 8, 20, 8, C.white], ...Array.from({ length: 6 }, (_, i): Px => [lx + 3 + i * 3, G - 7, 1, 7, C.stoneD]), [m - 5, G - 13, 10, 5, C.white], ...Array.from({ length: 4 }, (_, i): Px => [m - 4 + i * 3, G - 12, 1, 4, C.stoneD]), ...dome(m - 6, G - 14, 12, 7, C.white), [m - 1, G - 23, 2, 3, C.white], [m - 1, G - 24, 2, 1, C.stoneD]];
    case 'rockies': // Denver: the Rockies, snow on the peaks, rising behind the arena
      return [...gable(lx - 6, G - 1, 30, L.mountD, L.mountD).map((p): Px => [p[0], p[1], p[2], p[3], p[1] < G - 11 ? L.snow : p[4]]), ...gable(lx + 8, G - 1, 36, L.mount, L.mountD).map((p): Px => [p[0], p[1], p[2], p[3], p[1] < G - 13 ? L.snow : p[4]])];
    case 'pines': // Minnesota: snowy pines
      return [...pine(lx + 4, 14), ...pine(lx + 11, 19), ...pine(lx + 18, 12)];
    case 'derrick': { // Oklahoma City: an oil derrick
      const out: Px[] = [...line(m - 6, G - 1, m - 1, G - 26, C.steelD), ...line(m + 6, G - 1, m + 1, G - 26, C.steelD), [m - 1, G - 28, 3, 2, C.steelD]];
      for (let y = G - 5; y > G - 25; y -= 5) {
        const half = Math.round(6 - ((G - y) / 26) * 5);
        out.push([m - half, y, half * 2 + 1, 1, C.steel], ...line(m - half, y, m + half, y - 5, C.steel));
      }
      return out;
    }
    case 'hood': // Portland: Mount Hood, the rose garden
      return [...gable(lx - 2, G - 1, 26, L.mount, L.mountD).map((p): Px => [p[0], p[1], p[2], p[3], p[1] < G - 8 ? L.snow : p[4]]), [lx + 1, G - 3, 20, 3, C.leafD], ...[2, 6, 10, 14, 18].map((dx): Px => [lx + dx, G - 3, 2, 1, C.red])];
    case 'rockarch': // Utah: a red rock arch
      return [[lx + 2, G - 16, 5, 16, L.rock], [lx + 15, G - 16, 5, 16, L.rock], ...dome(lx + 2, G - 16, 18, 6, L.rock), [lx + 7, G - 16, 8, 2, L.rock], [lx + 2, G - 16, 1, 16, L.rockD], [lx + 15, G - 16, 1, 16, L.rockD], [lx, G - 2, 22, 2, L.sand]];
    case 'gate': // San Francisco: a tower of the Golden Gate, its cables
      return [...line(lx, G - 6, m - 4, G - 27, L.rust), ...line(lx + 21, G - 6, m + 4, G - 27, L.rust), [m - 4, G - 29, 2, 29, L.rust], [m + 2, G - 29, 2, 29, L.rust], [m - 4, G - 29, 8, 2, L.rust], [m - 4, G - 21, 8, 2, L.rust], [m - 4, G - 13, 8, 2, L.rust], [m - 4, G - 6, 8, 1, L.rustD]];
    case 'mast': // Los Angeles: a clipper ship's mast and sails, a palm
      return [[lx + 7, G - 30, 1, 30, C.trunk], [lx + 3, G - 27, 9, 6, C.white], [lx + 2, G - 19, 11, 7, C.white], [lx + 4, G - 10, 7, 5, C.white], [lx + 8, G - 31, 4, 2, C.red], ...palm(lx + 16, 13)];
    case 'lights': // Los Angeles: palms and a premiere's searchlights
      return [...line(lx + 6, G - 2, lx - 2, G - 30, '.tw-beam'), ...line(lx + 7, G - 2, lx + 1, G - 30, '.tw-beam'), ...line(lx + 15, G - 2, lx + 22, G - 30, '.tw-beam'), ...line(lx + 14, G - 2, lx + 19, G - 30, '.tw-beam'), [lx + 5, G - 3, 3, 3, C.steelD], [lx + 13, G - 3, 3, 3, C.steelD], ...palm(lx + 1, 17), ...palm(lx + 9, 14)];
    case 'cactus': // Phoenix: saguaros in the sand
      return [[lx, G - 2, 22, 2, L.sand], [lx + 5, G - 20, 3, 18, L.green], [lx + 2, G - 14, 3, 2, L.green], [lx + 2, G - 18, 2, 4, L.green], [lx + 8, G - 12, 3, 2, L.green], [lx + 9, G - 16, 2, 4, L.green], [lx + 15, G - 13, 3, 11, L.green], [lx + 18, G - 10, 2, 2, L.green], [lx + 19, G - 13, 1, 3, L.green]];
    case 'liftbridge': // Sacramento: the gold Tower Bridge
      return [[lx + 1, G - 22, 4, 22, C.gold], [lx + 17, G - 22, 4, 22, C.gold], [lx + 1, G - 23, 20, 1, C.goldD], [lx + 5, G - 9, 12, 2, C.gold], ...line(lx + 5, G - 9, lx + 9, G - 22, C.goldD), ...line(lx + 16, G - 9, lx + 12, G - 22, C.goldD), [lx + 2, G - 20, 2, 2, '.tw-win'], [lx + 18, G - 20, 2, 2, '.tw-win']];
    case 'reunion': // Dallas: Reunion Tower's ball of lights
      return [[m - 1, G - 22, 3, 22, L.concrete], ...dome(m - 5, G - 22, 11, 4, C.steelD), [m - 5, G - 22, 11, 2, C.steelD], ...windows(m - 4, G - 25, 5, 2, 1, 1, 1, 1, '.tw-bulb')];
    case 'rocket': // Houston: a rocket on its gantry
      return [...Array.from({ length: 7 }, (_, i): Px[] => [[lx + 2, G - 28 + i * 4, 6, 1, C.steelD], ...line(lx + 2, G - 28 + i * 4, lx + 7, G - 24 + i * 4, C.steel)]).flat(), [lx + 2, G - 28, 1, 28, C.steelD], [lx + 7, G - 28, 1, 28, C.steelD], [lx + 11, G - 26, 5, 24, C.white], [lx + 12, G - 29, 3, 3, C.white], [lx + 13, G - 30, 1, 1, C.red], [lx + 11, G - 17, 5, 1, C.red], [lx + 9, G - 5, 2, 4, C.red], [lx + 16, G - 5, 2, 4, C.red], [lx + 12, G - 2, 3, 2, C.ink]];
    case 'pyramid': // Memphis: the Pyramid on the river
      return [[lx - 3, G - 1, 30, 1, L.water], ...gable(lx - 3, G - 2, 30, C.steel, C.steelD).map((p, i): Px => [p[0], p[1], p[2], p[3], i % 3 === 2 ? C.steelD : p[4]]), ...gable(lx + 9, G - 7, 6, '.tw-win', '.tw-win')];
    case 'balcony': // New Orleans: a French Quarter house, its iron balconies
      return [[lx + 2, G - 19, 18, 19, L.yellow], [lx + 2, G - 19, 18, 1, C.white], ...windows(lx + 4, G - 17, 4, 3, 2, 3, 2, 3), [lx + 1, G - 13, 20, 1, L.iron], [lx + 1, G - 7, 20, 1, L.iron], ...Array.from({ length: 10 }, (_, i): Px[] => [[lx + 1 + i * 2, G - 12, 1, 2, L.iron], [lx + 1 + i * 2, G - 6, 1, 2, L.iron]]).flat(), [lx + 9, G - 4, 4, 4, C.door]];
    default: // San Antonio: the front of the Alamo
      return [[lx + 1, G - 12, 20, 12, L.limestone], [m - 4, G - 15, 8, 3, L.limestone], [m - 2, G - 17, 4, 2, L.limestone], [m - 3, G - 9, 6, 9, L.limestoneD], ...dome(m - 3, G - 9, 6, 2, L.limestoneD), [m - 2, G - 8, 4, 8, C.door], [lx + 3, G - 10, 1, 8, L.limestoneD], [lx + 18, G - 10, 1, 8, L.limestoneD], [lx + 5, G - 9, 2, 3, '.tw-win'], [lx + 15, G - 9, 2, 3, '.tw-win']];
  }
}

// ---------- the high school ----------

const BRICKS: Record<SchoolSpec['brick'], [string, string, string]> = {
  red: [C.brick, C.brickD, C.brickL],
  tan: ['#C9A97A', '#A88A5E', '#D9BE94'],
  grey: ['#9A9EA6', '#7D828B', '#B3B7BE'],
};

export function schoolPx(spec: SchoolSpec, x: number, w: number, door: number, color: string, open: boolean): Px[] {
  const [b, bd, bl] = BRICKS[spec.brick];
  const top = G - 16;
  const out: Px[] = [[x, top, w, 16, b], [x - 1, top - 1, w + 2, 2, C.stoneD]];
  for (let r = 2; r < 16; r += 3) out.push([x, top + r, w, 1, bd]);
  out.push(...windows(x + 3, top + 4, 3, 2, 4, 3, 3), ...windows(door + 11, top + 4, 3, 2, 4, 3, 3));
  switch (spec.tower) {
    case 'bell':
      out.push([door - 7, G - 27, 14, 12, bl], ...gable(door - 8, G - 28, 16, C.roof, C.roofD), [door - 2, G - 25, 4, 4, C.white], [door - 1, G - 24, 2, 2, C.ink]);
      break;
    case 'clock':
      out.push([door - 6, G - 30, 12, 15, bl], [door - 7, G - 31, 14, 2, C.stoneD], [door - 7, G - 33, 2, 2, C.stoneD], [door + 5, G - 33, 2, 2, C.stoneD], [door - 3, G - 27, 6, 6, C.white], [door, G - 26, 1, 3, C.ink], [door, G - 24, 2, 1, C.ink]);
      break;
    case 'cupola':
      out.push([door - 4, G - 22, 8, 5, C.white], [door - 3, G - 21, 2, 3, '.tw-win'], [door + 1, G - 21, 2, 3, '.tw-win'], ...dome(door - 5, G - 22, 10, 4, L.copper), [door, G - 28, 1, 3, C.steelD]);
      break;
    case 'dome':
      out.push([door - 7, G - 20, 14, 4, C.stone], ...dome(door - 8, G - 21, 16, 7, L.copper), [door - 1, G - 29, 2, 2, C.gold]);
      break;
    default:
      // no tower: a portico with columns and the school's colour across it
      out.push([door - 10, G - 20, 20, 3, color], [door - 11, G - 21, 22, 1, C.stoneD], ...Array.from({ length: 5 }, (_, i): Px => [door - 9 + i * 4, G - 17, 2, 11, C.white]));
  }
  const fx = spec.flag === 'r' ? x + w - 4 : x + 3;
  out.push([fx, G - 31, 1, 15, C.steel], [fx + 1, G - 31, 6, 4, color], [fx + 1, G - 31, 6, 1, C.white]);
  out.push([door - 6, G - 2, 12, 2, C.stoneD], [door - 4, G - 10, 8, 8, doorFill(open)], [door - 5, G - 11, 10, 1, C.stone]);
  return out;
}
