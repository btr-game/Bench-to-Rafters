// The main land's art (round 37): a town along one avenue, on a 258 by 100 grid (224 wide until round 42) of square pixels,
// drawn once into a grid of colours and turned into one path per colour (pixel.ts). In the dark
// theme the town turns to night (app.css, the main land's block): a flat blue shade over it, the
// windows, lamps and signs lit above the shade, and square halos round the lamps and the dome's
// searchlights. The places themselves are in ui/mainland.ts. Round 38: the old neighbourhood, story
// mode's island to the north: his house and his friend's next door, the driveway hoop between.

import { useMemo, type ReactNode } from 'react';
import { glyph, inCircle, toPaths } from './pixel';
import { LAND, LAND_H, LAND_W, AVENUE, AVENUE_X, type LandId } from '../mainland';

export const LC = {
  sea: '#2B7BC4', wave: '#5AA2E0', deep: '#2369AE',
  land: '#5FAE4E', shade: '#4E9A42', tuft: '#7CC466', hedge: '#3F8F3A',
  sand: '#E9D29A', sandD: '#CDB277',
  road: '#6B6F78', edge: '#4D5058', dash: '#FCC419', walk: '#CED4DA', curb: '#A3A9B1',
  tarmac: '#5C6068', tarmacL: '#7A7F88', white: '#FFFFFF', grey: '#DEE2E6', greyD: '#ADB5BD', slate: '#495057',
  glass: '#A5D8FF', glassD: '#4DABF7', lit: '#FFE066', bulb: '#FFF3BF',
  door: '#3A2A20', pole: '#D0D4DA', ink: '#212529',
  brick: '#C2462E', brickD: '#93321F', roof: '#5A2A1E', roofL: '#7A3A2A',
  stone: '#E6DCC4', stoneD: '#C2B596', marble: '#F1EADB',
  purple: '#7B2D8E', purpleD: '#5C1F6B', gold: '#FCC419', goldD: '#D9A400', red: '#E03131', pink: '#E64980', lime: '#82C91E',
  court: '#3F4450', courtD: '#353943', fence: '#C1C7CF', orange: '#F76707', clay: '#C97B3B',
  arena: '#3C4250', ring: '#596173', ringL: '#7C869A',
  wall: '#F1E3C8', roofH: '#8B3A2F', roofHD: '#6E2B22',
  trunk: '#8B5A2B', leaf: '#2F9E44', leafD: '#1E7A32', plank: '#A0703C', plankD: '#7A5229',
  kiosk: '#2B8A3E', kioskD: '#1F6B2F', plaza: '#D8CFC0', plazaD: '#C4B8A4', bronze: '#B07A3A', bronzeD: '#8A5A22', plinth: '#9AA0A8', plinthD: '#7D838C',
  skin: '#C68642', jerseyA: '#1C7ED6', jerseyB: '#E03131',
  sideA: '#5C7CFA', sideAD: '#4263EB', sideB: '#FFD43B', sideBD: '#F59F00', drive: '#C9CED6', driveD: '#AEB4BD',
};

type Grid = string[][];
type Paths = { fill: string; d: string }[];
type Paint = (x: number, y: number, w: number, h: number, c: string) => void;

const blank = (): Grid => Array.from({ length: LAND_H }, () => Array<string>(LAND_W).fill(''));
const painter = (g: Grid): Paint => (x, y, w, h, c) => {
  for (let j = Math.max(0, y); j < Math.min(LAND_H, y + h); j++) for (let i = Math.max(0, x); i < Math.min(LAND_W, x + w); i++) g[j][i] = c;
};

/** The coast: the land runs to here on each row, the beach on from it. */
const coast = (y: number) => 176 + Math.round(3 * Math.sin(y / 6) + 2 * Math.sin(y / 2.7));

/** The island's middle, out in the water; the old neighbourhood's, to the north. */
const ISLE: [number, number] = [203, 77];
const HOOD: [number, number] = [204, 22];
const ARENA: [number, number] = [240, 50];

interface Layers {
  day: Paths;
  lit: Paths;
  glow: Paths;
}

function drawLand(career: boolean): Layers {
  const day = blank();
  const lit = blank();
  const glow = blank();
  const R = painter(day);
  const L = painter(lit);
  const G = painter(glow);
  /** A window: glass by day; lit after dark unless `dark`. */
  const win = (x: number, y: number, w: number, h: number, dark = false) => {
    R(x, y, w, h, LC.glass);
    if (w > 1) R(x, y, 1, h, LC.glassD);
    if (!dark) L(x, y, w, h, LC.lit);
  };
  /** Letters in the 3x5 font; a W gets five columns, so it doesn't read as an H. */
  const word = (s: string, x: number, y: number, c: string, paint: Paint = R) => {
    let at = x;
    for (const ch of s) {
      const wide = ch === 'W';
      const bits = wide ? '1000110001101011010101010' : glyph(ch);
      const w = wide ? 5 : 3;
      [...bits].forEach((b, n) => b === '1' && paint(at + (n % w), y + Math.floor(n / w), 1, 1, c));
      at += w + 1;
    }
  };
  const tree = (x: number, y: number) => {
    R(x, y + 3, 1, 2, LC.trunk);
    R(x - 2, y, 5, 3, LC.leaf);
    R(x - 1, y - 1, 3, 1, LC.leaf);
    R(x - 2, y + 2, 5, 1, LC.leafD);
  };
  const lamp = (x: number, y: number) => {
    R(x, y + 1, 1, 2, LC.slate);
    R(x, y, 2, 1, LC.grey);
    L(x, y, 2, 1, LC.bulb);
    G(x - 1, y - 1, 4, 3, LC.lit);
  };

  // ---- the sea, the land and the beach ----
  R(0, 0, LAND_W, LAND_H, LC.sea);
  for (let i = 0; i < 40; i++) R((i * 53 + 7) % LAND_W, (i * 29 + 3) % LAND_H, 3, 1, i % 3 ? LC.wave : LC.deep);
  for (let y = 0; y < LAND_H; y++) {
    const e = coast(y);
    R(0, y, e, 1, LC.land);
    R(e, y, 3, 1, y % 4 === 0 ? LC.sandD : LC.sand);
  }
  for (let i = 0; i < 90; i++) R((i * 37 + 11) % 172, (i * 23 + 5) % LAND_H, i % 4 ? 2 : 3, 1, i % 2 ? LC.tuft : LC.shade);
  // moonlight on the water, after dark (clear of the two islands)
  for (const [x, y] of [[205, 44], [215, 47], [210, 56], [218, 52], [188, 1], [214, 1], [184, 58]]) G(x, y, 4, 1, LC.white);

  // ---- trees between the places and along the edges ----
  for (const [x, y] of [[44, 4], [63, 4], [99, 3], [131, 4], [60, 92], [27, 95], [86, 95], [110, 95], [142, 95], [171, 95], [171, 62], [3, 50], [172, 12], [172, 30]]) tree(x, y);

  // ---- the avenue, its sidewalks and lamps ----
  const [ax0, ax1] = AVENUE_X;
  R(0, AVENUE - 6, ax1 + 2, 3, LC.walk);
  R(0, AVENUE - 4, ax1 + 2, 1, LC.curb);
  R(0, AVENUE - 3, ax1 + 2, 1, LC.edge);
  R(0, AVENUE - 2, ax1 + 2, 4, LC.road);
  R(0, AVENUE + 2, ax1 + 2, 1, LC.edge);
  R(0, AVENUE + 3, ax1 + 2, 1, LC.curb);
  R(0, AVENUE + 4, ax1 + 2, 2, LC.walk);
  for (let x = ax0 + 2; x < ax1 - 2; x += 6) R(x, AVENUE - 1, 3, 1, LC.dash);
  for (const x of [43, 66, 99, 131]) lamp(x, AVENUE - 7);
  for (const x of [27, 57, 87, 111, 143]) lamp(x, AVENUE + 3);

  // ---- the airport: the runway, the apron, the terminal and the tower ----
  R(2, 5, 40, 6, LC.tarmac);
  R(2, 5, 40, 1, LC.tarmacL);
  R(2, 10, 40, 1, LC.tarmacL);
  for (let x = 8; x < 38; x += 5) R(x, 7, 3, 1, LC.white);
  for (let y = 6; y < 10; y += 2) R(3, y, 3, 1, LC.white);
  for (let y = 6; y < 10; y += 2) R(38, y, 3, 1, LC.white);
  R(19, 11, 3, 3, LC.tarmac);
  R(4, 14, 36, 9, LC.tarmacL);
  R(6, 21, 30, 1, LC.dash);
  for (let x = 4; x < 40; x += 8) L(x, 14, 1, 1, LC.bulb);
  R(5, 26, 24, 2, LC.greyD);
  R(5, 28, 24, 1, LC.slate);
  R(5, 29, 24, 17, LC.grey);
  for (let x = 6; x < 28; x += 4) win(x, 31, 3, 7, x === 18);
  R(5, 39, 24, 1, LC.greyD);
  R(14, 41, 6, 5, LC.glassD);
  L(14, 41, 6, 5, LC.lit);
  R(16, 41, 1, 5, LC.slate);
  R(32, 20, 5, 26, LC.grey);
  R(36, 20, 1, 26, LC.greyD);
  R(30, 13, 9, 1, LC.slate);
  win(30, 14, 9, 4);
  R(30, 18, 9, 2, LC.slate);
  R(34, 10, 1, 3, LC.slate);
  L(34, 10, 1, 1, LC.red);
  R(34, 10, 1, 1, LC.red);

  // ---- the cinema: a marquee of bulbs and a blade sign ----
  R(45, 18, 20, 28, LC.purple);
  R(45, 18, 20, 2, LC.purpleD);
  R(64, 18, 1, 28, LC.purpleD);
  win(47, 21, 4, 3);
  win(59, 21, 4, 3, true);
  R(61, 11, 3, 18, LC.gold);
  for (let y = 12; y < 28; y += 2) {
    R(62, y, 1, 1, LC.red);
    L(62, y, 1, 1, LC.bulb);
  }
  R(46, 27, 15, 5, LC.gold);
  R(47, 28, 13, 3, LC.white);
  for (let x = 48; x < 59; x += 3) R(x, 29, 2, 1, LC.ink);
  for (let x = 46; x < 61; x += 2) {
    R(x, 27, 1, 1, LC.bulb);
    L(x, 27, 1, 1, LC.bulb);
    L(x, 31, 1, 1, LC.bulb);
  }
  R(46, 35, 4, 7, LC.red);
  R(47, 36, 2, 5, LC.gold);
  R(58, 35, 4, 7, LC.jerseyA);
  R(59, 36, 2, 5, LC.bulb);
  R(51, 37, 6, 9, LC.door);
  R(51, 37, 6, 1, LC.gold);
  L(52, 38, 4, 7, LC.lit);
  R(54, 38, 1, 8, LC.ink);

  // ---- the gym: Regular guy, brick with a rounded roof and its name over the doors ----
  R(69, 16, 28, 30, LC.brick);
  for (let y = 18; y < 46; y += 3) R(69, y, 28, 1, LC.brickD);
  for (const [y, x0, x1] of [[10, 78, 88], [11, 75, 91], [12, 72, 94], [13, 70, 96], [14, 69, 97], [15, 69, 97]] as const) R(x0, y, x1 - x0, 1, y < 12 ? LC.roofL : LC.roof);
  // a ball over the doors: an outline, the two straight seams and the two curved ones
  for (let y = 16; y < 28; y++)
    for (let x = 77; x < 90; x++) {
      const [px, py] = [x + 0.5, y + 0.5];
      if (!inCircle(px, py, [83.5, 21.5], 5.6)) continue;
      const seam = x === 83 || y === 21 || (Math.abs(Math.abs(px - 83.5) - 3.4 - Math.abs(py - 21.5) ** 2 / 14) < 0.55);
      R(x, y, 1, 1, !inCircle(px, py, [83.5, 21.5], 4.7) || seam ? LC.ink : LC.orange);
    }
  win(71, 19, 4, 4);
  win(92, 19, 4, 4);
  win(71, 26, 4, 4, true);
  win(92, 26, 4, 4);
  R(75, 30, 17, 8, LC.white);
  R(75, 30, 17, 1, LC.greyD);
  R(75, 37, 17, 1, LC.greyD);
  word('GYM', 78, 31, LC.jerseyA);
  R(78, 38, 11, 8, LC.door);
  R(83, 38, 1, 8, LC.ink);
  win(79, 39, 3, 2);
  win(85, 39, 3, 2);

  // ---- the cage: Reality hits hard, a fenced court under a wall of tags ----
  R(101, 10, 28, 8, LC.ink);
  R(101, 11, 28, 7, LC.ring);
  for (let x = 101; x < 129; x += 2) R(x, 9, 1, 1, LC.fence);
  word('REAL', 104, 12, LC.pink);
  R(120, 12, 3, 2, LC.lime);
  R(121, 14, 4, 2, LC.lime);
  R(124, 12, 3, 2, LC.gold);
  R(102, 18, 26, 25, LC.court);
  for (const [x, y] of [[106, 24], [121, 34], [110, 39], [124, 21]]) R(x, y, 2, 1, LC.courtD);
  R(103, 19, 24, 1, LC.white);
  R(103, 41, 24, 1, LC.white);
  R(103, 19, 1, 23, LC.white);
  R(126, 19, 1, 23, LC.white);
  R(103, 30, 24, 1, LC.white);
  R(111, 20, 1, 4, LC.white);
  R(118, 20, 1, 4, LC.white);
  R(111, 24, 8, 1, LC.white);
  R(111, 37, 1, 4, LC.white);
  R(118, 37, 1, 4, LC.white);
  R(111, 37, 8, 1, LC.white);
  R(113, 28, 4, 1, LC.white);
  R(113, 32, 4, 1, LC.white);
  R(112, 29, 1, 1, LC.white);
  R(117, 29, 1, 1, LC.white);
  R(112, 31, 1, 1, LC.white);
  R(117, 31, 1, 1, LC.white);
  R(112, 18, 6, 1, LC.white);
  R(113, 19, 4, 1, LC.orange);
  R(112, 42, 6, 1, LC.white);
  R(113, 41, 4, 1, LC.orange);
  for (let y = 18; y < 45; y += 2) {
    R(101, y, 1, 1, LC.fence);
    R(128, y, 1, 1, LC.fence);
  }
  for (let x = 101; x < 129; x += 2) if (x < 110 || x > 120) R(x, 44, 1, 1, LC.fence);
  R(101, 43, 9, 1, LC.fence);
  R(121, 43, 8, 1, LC.fence);
  R(127, 18, 1, 6, LC.slate);
  R(125, 18, 3, 1, LC.grey);
  L(125, 18, 2, 1, LC.bulb);
  G(118, 19, 8, 6, LC.lit);

  // ---- the dome: Shoot for the stars, an arena under a star ----
  for (let y = 14; y < 30; y++) {
    const hw = Math.round(18 * Math.sqrt(Math.max(0, 1 - ((29.5 - y) / 16) ** 2)));
    R(151 - hw, y, hw * 2, 1, y % 5 === 1 ? LC.ringL : LC.ring);
  }
  R(147, 15, 8, 1, LC.glass);
  L(147, 15, 8, 1, LC.bulb);
  R(150, 9, 1, 6, LC.pole);
  const star = ['...1...', '..111..', '1111111', '.11111.', '.11.11.', '1.....1'];
  star.forEach((row, j) => [...row].forEach((b, i) => b === '1' && (R(147 + i, 4 + j, 1, 1, LC.gold), L(147 + i, 4 + j, 1, 1, LC.gold))));
  R(133, 30, 36, 16, LC.arena);
  R(133, 30, 36, 1, LC.ringL);
  for (let x = 134; x < 168; x += 2) {
    R(x, 32, 1, 1, LC.bulb);
    L(x, 32, 1, 1, LC.bulb);
  }
  R(136, 35, 8, 4, LC.orange);
  R(158, 35, 8, 4, LC.orange);
  R(138, 36, 4, 2, LC.white);
  R(160, 36, 4, 2, LC.white);
  R(146, 37, 10, 9, LC.glassD);
  L(146, 37, 10, 9, LC.lit);
  for (let x = 148; x < 156; x += 3) R(x, 37, 1, 9, LC.slate);
  // the searchlights, after dark: two beams up into the sky, a step at a time
  for (let k = 0; k < 13; k++) {
    G(137 - k, 29 - k * 2, 2, 2, LC.bulb);
    G(164 + k, 29 - k * 2, 2, 2, LC.bulb);
  }

  // ---- his house while a career is going; a lot for sale when none is ----
  if (career) {
    R(12, 58, 3, 14, LC.walk);
    for (let k = 0; k < 10; k++) R(13 - k, 62 + k, 2 + k * 2, 1, k % 2 ? LC.roofHD : LC.roofH);
    R(19, 62, 2, 5, LC.brick);
    R(4, 72, 20, 21, LC.wall);
    R(4, 72, 20, 1, LC.roofHD);
    win(6, 76, 4, 4);
    win(18, 76, 4, 4);
    win(6, 84, 4, 4, true);
    R(12, 82, 4, 11, LC.door);
    R(15, 87, 1, 1, LC.gold);
    L(12, 81, 4, 1, LC.bulb);
  } else {
    R(9, 72, 9, 6, LC.white);
    R(9, 72, 9, 1, LC.red);
    R(9, 77, 9, 1, LC.red);
    R(11, 74, 5, 1, LC.red);
    R(13, 78, 1, 10, LC.trunk);
    R(5, 88, 3, 2, LC.hedge);
    R(19, 86, 4, 2, LC.hedge);
  }
  for (let x = 3; x < 25; x += 2) R(x, 94, 1, 2, LC.white);
  R(3, 94, 22, 1, LC.white);

  // ---- the park: Play with friends, a court and two players ----
  R(30, 64, 24, 24, LC.hedge);
  R(31, 65, 22, 22, LC.clay);
  R(32, 66, 20, 1, LC.white);
  R(32, 85, 20, 1, LC.white);
  R(32, 66, 1, 20, LC.white);
  R(51, 66, 1, 20, LC.white);
  R(41, 66, 1, 20, LC.white);
  R(39, 74, 5, 1, LC.white);
  R(39, 78, 5, 1, LC.white);
  R(33, 72, 1, 8, LC.white);
  R(34, 75, 1, 2, LC.orange);
  R(50, 72, 1, 8, LC.white);
  R(49, 75, 1, 2, LC.orange);
  for (const [x, y, c] of [[37, 71, LC.jerseyA], [45, 77, LC.jerseyB]] as const) {
    R(x, y, 2, 2, LC.skin);
    R(x, y + 2, 2, 2, c);
    R(x, y + 4, 1, 1, LC.ink);
    R(x + 1, y + 4, 1, 1, LC.ink);
  }
  R(40, 75, 1, 1, LC.orange);
  R(32, 90, 7, 1, LC.plank);
  R(32, 91, 1, 1, LC.plankD);
  R(38, 91, 1, 1, LC.plankD);
  tree(49, 89);
  tree(31, 60);
  lamp(53, 61);

  // ---- the library: the career log, columns under an open book ----
  for (let k = 0; k < 7; k++) R(71 - k * 2, 63 + k, 2 + k * 4, 1, k === 6 ? LC.stoneD : LC.stone);
  R(69, 66, 2, 2, LC.white);
  R(72, 66, 2, 2, LC.white);
  R(71, 66, 1, 2, LC.ink);
  R(60, 70, 24, 20, LC.stone);
  R(60, 70, 24, 1, LC.stoneD);
  for (let x = 61; x < 84; x += 4) {
    R(x, 71, 2, 18, LC.white);
    R(x + 1, 71, 1, 18, LC.grey);
  }
  for (const x of [64, 76, 80]) win(x - 1, 74, 2, 5, x === 80);
  R(69, 81, 6, 8, LC.door);
  L(70, 82, 4, 6, LC.lit);
  R(71, 82, 1, 7, LC.ink);
  R(62, 90, 20, 1, LC.stoneD);
  R(61, 91, 22, 1, LC.stone);
  R(60, 92, 24, 1, LC.stoneD);

  // ---- the newsstand: What's new, under a striped awning ----
  R(89, 62, 20, 9, LC.white);
  R(89, 62, 20, 1, LC.ink);
  R(89, 70, 20, 1, LC.ink);
  word('NEWS', 91, 64, LC.red);
  L(90, 63, 18, 7, LC.bulb);
  word('NEWS', 91, 64, LC.red, L);
  for (let x = 90; x < 108; x++) R(x, 71, 1, 3, Math.floor((x - 90) / 2) % 2 ? LC.white : LC.red);
  for (let x = 90; x < 108; x += 2) R(x, 74, 1, 1, LC.red);
  R(91, 74, 16, 16, LC.kiosk);
  R(106, 74, 1, 16, LC.kioskD);
  R(92, 76, 14, 7, LC.ink);
  for (const [x, c] of [[93, LC.jerseyA], [96, LC.gold], [99, LC.pink], [102, LC.white]] as const) {
    R(x, 77, 2, 2, c);
    R(x + 1, 80, 2, 2, c === LC.white ? LC.lime : LC.white);
  }
  L(92, 76, 14, 1, LC.bulb);
  R(93, 85, 5, 4, LC.white);
  for (let y = 86; y < 89; y++) R(94, y, 3, 1, LC.greyD);
  R(100, 84, 4, 6, LC.door);
  tree(108, 91);

  // ---- the statue plaza: the community, a bronze player on a plinth ----
  for (let y = 62; y < 96; y++) for (let x = 113; x < 141; x++) R(x, y, 1, 1, (x >> 1) % 2 === (y >> 1) % 2 ? LC.plaza : LC.plazaD);
  R(121, 81, 11, 8, LC.plinth);
  R(121, 81, 11, 1, LC.plinthD);
  R(121, 88, 11, 1, LC.plinthD);
  R(125, 84, 3, 2, LC.gold);
  R(126, 69, 2, 2, LC.bronze);
  R(128, 66, 1, 4, LC.bronze);
  R(128, 64, 2, 2, LC.orange);
  R(124, 70, 1, 3, LC.bronzeD);
  R(125, 71, 4, 5, LC.bronze);
  R(128, 71, 1, 5, LC.bronzeD);
  R(125, 76, 1, 5, LC.bronze);
  R(127, 76, 2, 5, LC.bronzeD);
  G(122, 62, 10, 19, LC.lit);
  for (const x of [115, 135]) {
    R(x, 72, 5, 1, LC.plank);
    R(x, 73, 1, 1, LC.plankD);
    R(x + 4, 73, 1, 1, LC.plankD);
  }
  R(114, 63, 4, 3, LC.hedge);
  R(136, 63, 4, 3, LC.hedge);
  tree(115, 91);
  tree(138, 91);

  // ---- the trophy museum: the achievement book, a gold cup on the roof ----
  R(152, 59, 10, 1, LC.gold);
  for (const [y, x0, w] of [[60, 152, 10], [61, 152, 10], [62, 153, 8], [63, 154, 6], [64, 155, 4]] as const) R(x0, y, w, 1, LC.gold);
  R(160, 60, 1, 4, LC.goldD);
  R(150, 60, 2, 1, LC.gold);
  R(150, 61, 1, 2, LC.gold);
  R(162, 60, 2, 1, LC.gold);
  R(163, 61, 1, 2, LC.gold);
  R(156, 65, 2, 3, LC.goldD);
  R(153, 68, 8, 3, LC.goldD);
  R(154, 68, 6, 1, LC.gold);
  L(152, 59, 10, 6, LC.gold);
  G(150, 58, 14, 12, LC.lit);
  R(146, 71, 22, 3, LC.stoneD);
  R(146, 74, 22, 18, LC.marble);
  R(146, 74, 22, 1, LC.goldD);
  for (let x = 147; x < 167; x += 5) {
    R(x, 75, 2, 16, LC.white);
    R(x + 1, 75, 1, 16, LC.grey);
  }
  R(149, 77, 3, 6, LC.purple);
  R(149, 83, 1, 1, LC.purple);
  R(151, 83, 1, 1, LC.purple);
  R(159, 77, 3, 6, LC.red);
  R(159, 83, 1, 1, LC.red);
  R(161, 83, 1, 1, LC.red);
  R(154, 84, 5, 7, LC.glassD);
  L(154, 84, 5, 7, LC.lit);
  R(156, 84, 1, 7, LC.slate);
  R(145, 92, 24, 1, LC.stoneD);
  R(144, 93, 26, 1, LC.stone);

  // ---- the dock at the avenue's end, and the way across ----
  R(ax1, AVENUE - 2, 18, 5, LC.plank);
  for (let x = ax1 + 1; x < ax1 + 18; x += 3) R(x, AVENUE - 2, 1, 5, LC.plankD);
  R(ax1 + 16, AVENUE + 3, 1, 3, LC.plankD);
  R(ax1 + 10, AVENUE + 3, 1, 3, LC.plankD);
  for (let k = 0; k < 5; k++) R(188 + k * 2, 59 + k, 1, 1, LC.white);

  // ---- the old neighbourhood: story mode, his house and his friend's, the driveway hoop between ----
  {
    const [hx, hy] = HOOD;
    for (let y = hy - 15; y <= hy + 15; y++) {
      const hw = Math.round(18 * Math.sqrt(Math.max(0, 1 - ((y - hy) / 15.5) ** 2)));
      R(hx - hw, y, hw * 2, 1, y % 4 === 1 ? LC.sandD : LC.sand);
      if (hw > 4) R(hx - hw + 3, y, hw * 2 - 6, 1, (y + hx) % 7 === 0 ? LC.shade : LC.land);
    }
    // two houses on one street: his (blue siding) and his friend's next door (yellow)
    const house = (x0: number, side: string, sideD: string, roof: string, roofD: string) => {
      for (let k = 0; k < 5; k++) R(x0 + 3 - k, 12 + k, 3 + k * 2, 1, k % 2 ? roofD : roof);
      R(x0 - 1, 16, 11, 1, roofD);
      R(x0, 17, 9, 9, side);
      for (let y = 18; y < 26; y += 2) R(x0, y, 9, 1, sideD);
      win(x0 + 1, 19, 2, 2);
      win(x0 + 6, 19, 2, 2);
      win(x0 + 6, 22, 2, 2, true);
      R(x0 + 3, 22, 3, 4, LC.door);
      R(x0 + 3, 22, 3, 1, LC.white);
      L(x0 + 2, 21, 1, 1, LC.bulb);
      G(x0 + 1, 20, 3, 3, LC.lit);
    };
    house(190, LC.sideA, LC.sideAD, LC.roofH, LC.roofHD);
    R(196, 11, 2, 3, LC.brick);
    house(210, LC.sideB, LC.sideBD, LC.slate, LC.ink);
    // the driveway, its cracks, and the hoop at its head (white board, red square, orange rim)
    R(200, 18, 9, 9, LC.drive);
    for (const [x, y] of [[202, 21], [206, 24], [203, 25]]) R(x, y, 2, 1, LC.driveD);
    R(204, 12, 1, 7, LC.slate);
    R(201, 7, 7, 5, LC.white);
    R(201, 7, 7, 1, LC.greyD);
    R(201, 11, 7, 1, LC.greyD);
    R(203, 8, 3, 1, LC.red);
    R(203, 10, 3, 1, LC.red);
    R(203, 9, 1, 1, LC.red);
    R(205, 9, 1, 1, LC.red);
    R(202, 12, 5, 1, LC.orange);
    for (const x of [202, 204, 206]) R(x, 13, 1, 1, LC.white);
    for (const x of [203, 205]) R(x, 14, 1, 1, LC.white);
    R(207, 25, 2, 2, LC.orange);
    // the mailbox, the sidewalk and the street
    R(199, 24, 1, 3, LC.trunk);
    R(198, 23, 2, 1, LC.red);
    R(190, 27, 29, 1, LC.walk);
    R(190, 28, 29, 3, LC.road);
    for (let x = 192; x < 217; x += 5) R(x, 29, 2, 1, LC.dash);
    lamp(218, 24);
    tree(199, 32);
    tree(209, 32);
    // the jetty the boat ties up at
    R(203, 34, 3, 6, LC.plank);
    for (let y = 35; y < 40; y += 2) R(203, y, 3, 1, LC.plankD);
  }

  // ---- the island of mini-games ----
  const [ix, iy] = ISLE;
  for (let y = iy - 13; y <= iy + 13; y++) {
    const hw = Math.round(19 * Math.sqrt(Math.max(0, 1 - ((y - iy) / 13.5) ** 2)));
    R(ix - hw, y, hw * 2, 1, LC.sand);
    if (hw > 4) R(ix - hw + 3, y, hw * 2 - 6, 1, Math.abs(y - iy) < 10 ? LC.land : LC.sand);
  }
  R(ix - 12, iy - 3, 13, 8, LC.clay);
  R(ix - 12, iy - 3, 13, 1, LC.white);
  R(ix - 12, iy + 4, 13, 1, LC.white);
  R(ix - 6, iy - 3, 1, 8, LC.white);
  R(ix - 13, iy, 1, 2, LC.white);
  R(ix + 1, iy, 1, 2, LC.white);
  R(ix + 7, iy - 9, 2, 12, LC.trunk);
  R(ix + 3, iy - 11, 10, 2, LC.leaf);
  R(ix + 2, iy - 9, 3, 2, LC.leafD);
  R(ix + 11, iy - 9, 3, 2, LC.leafD);
  R(ix + 6, iy - 13, 4, 2, LC.leaf);
  R(ix + 5, iy + 5, 8, 4, LC.plank);
  R(ix + 5, iy + 4, 8, 1, LC.roof);
  win(ix + 7, iy + 6, 2, 2);

  // ---- the arena's island (round 42): the Floor's own house, a jetty on its west shore ----
  const [ax, ay] = ARENA;
  for (let y = ay - 16; y <= ay + 16; y++) {
    const hw = Math.round(16 * Math.sqrt(Math.max(0, 1 - ((y - ay) / 16.5) ** 2)));
    R(ax - hw, y, hw * 2, 1, LC.sand);
    if (hw > 4) R(ax - hw + 3, y, hw * 2 - 6, 1, Math.abs(y - ay) < 13 ? LC.land : LC.sand);
  }
  R(ax - 19, ay, 5, 3, LC.plank);
  R(ax - 19, ay + 1, 5, 1, LC.plankD);
  // the bowl: a banded drum under a stepped dome, the ball on a mast over it
  R(ax - 11, ay - 5, 22, 12, '#C9CED8');
  R(ax - 11, ay - 5, 22, 1, '#EEF1F6');
  R(ax - 11, ay - 1, 22, 2, '#E0672B');
  R(ax - 11, ay + 6, 22, 1, '#8E97A8');
  for (let x = ax - 9; x <= ax + 7; x += 4) win(x, ay + 2, 2, 3);
  R(ax - 2, ay + 2, 4, 5, '#1B2233');
  R(ax - 9, ay - 8, 18, 3, '#8E97A8');
  R(ax - 6, ay - 10, 12, 2, '#A9B1C0');
  R(ax - 3, ay - 11, 6, 1, '#C9CED8');
  R(ax, ay - 14, 1, 3, '#1B2233');
  R(ax - 1, ay - 17, 3, 3, '#E0672B');
  R(ax, ay - 17, 1, 3, '#7A3310');
  R(ax - 1, ay - 16, 3, 1, '#7A3310');
  // a half court painted on the grass, and a hoop
  R(ax - 9, ay + 9, 18, 5, LC.clay);
  R(ax - 9, ay + 9, 18, 1, LC.white);
  R(ax - 9, ay + 13, 18, 1, LC.white);
  R(ax, ay + 9, 1, 5, LC.white);

  return { day: toPaths(day), lit: toPaths(lit), glow: toPaths(glow) };
}

const LAYERS = new Map<boolean, Layers>();
const layersOf = (career: boolean): Layers => {
  if (!LAYERS.has(career)) LAYERS.set(career, drawLand(career));
  return LAYERS.get(career)!;
};

/** The map's layers: the day picture, then (after dark only) the shade, the halos and the lights. */
function Ground({ career }: { career: boolean }) {
  const { day, lit, glow } = layersOf(career);
  return (
    <>
      {day.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
      <g className="ml-night">
        <rect width={LAND_W} height={LAND_H} fill="#0B1636" opacity={0.5} />
        <g opacity={0.32}>
          {glow.map((p) => (
            <path key={p.fill} d={p.d} fill={p.fill} />
          ))}
        </g>
        {lit.map((p) => (
          <path key={p.fill} d={p.d} fill={p.fill} />
        ))}
      </g>
    </>
  );
}

/** The whole map: the town, then what moves on it (the car, the boat, the plane) on top. */
export function LandMap({ career, label, children }: { career: boolean; label: string; children?: ReactNode }) {
  return (
    <svg className="ml-art" viewBox={`0 0 ${LAND_W} ${LAND_H}`} shapeRendering="crispEdges" role="img" aria-label={label}>
      <Ground career={career} />
      {children}
    </svg>
  );
}

/** One place on the map, cropped from it, for the head of its card. */
export function LandCrop({ place, career, size = 88 }: { place: LandId; career: boolean; size?: number }) {
  const p = useMemo(() => LAND.find((x) => x.id === place)!, [place]);
  const [x, y, w, h] = p.box;
  // a square-ish crop round the place, kept on the map
  const side = Math.max(w, h);
  const cx = Math.max(0, Math.min(LAND_W - side, Math.round(x + w / 2 - side / 2)));
  const cy = Math.max(0, Math.min(LAND_H - side, Math.round(y + h / 2 - side / 2)));
  return (
    <svg className="ml-crop" viewBox={`${cx} ${cy} ${side} ${side}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <Ground career={career} />
    </svg>
  );
}
