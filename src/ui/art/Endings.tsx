// The endings' scenes (round 36, owner: "do all 12"): a place for each kind of career, drawn on the
// same 160 by 90 pixel grid as the rafters' empty arena (screens/Finale.tsx), in square pixels with
// hard colour stops. Each scene paints a still picture and a few layers that move in steps when its
// act is on screen (styles/app.css, .act-scene): a cloth falling off a plaque, a ring box opening, a
// row of lights going out. With no act around it (a tile in the achievement book's Endings page)
// every layer shows how the scene ends. The signature object of each sits in the middle third, the
// part a phone keeps; the top fifth stays quiet for the words laid over it.

import { useMemo } from 'react';
import type { EndingId, SceneArt } from '../endings';
import { glyph, toPaths } from './pixel';
import { mix, rgb } from './color';

const W = 160;
const H = 90;

class Pix {
  g: string[][] = Array.from({ length: H }, () => Array<string>(W).fill(''));
  /** Pixels across that everything drawn now is moved by. */
  ox = 0;
  put(x: number, y: number, c: string) {
    const X = Math.round(x + this.ox);
    const Y = Math.round(y);
    if (X >= 0 && X < W && Y >= 0 && Y < H) this.g[Y][X] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.put(x + i, y + j, c);
  }
  /** A disc of radius r, squared off a little so it reads round at small sizes. */
  disc(cx: number, cy: number, r: number, c: string) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.put(cx + x, cy + y, c);
  }
  /** Words in the 3 by 5 pixel font, `k` pixels a dot. */
  text(x: number, y: number, s: string, c: string, k = 1) {
    [...s].forEach((ch, i) => {
      const bits = glyph(ch);
      for (let n = 0; n < 15; n++) if (bits[n] === '1') this.rect(x + i * 4 * k + (n % 3) * k, y + Math.floor(n / 3) * k, k, k, c);
    });
  }
  /** Rows of letters, each standing for a colour in `pal` ('.' is nothing). */
  sprite(x: number, y: number, rows: string[], pal: Record<string, string>, k = 1) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => pal[ch] && this.rect(x + i * k, y + j * k, k, k, pal[ch])));
  }
}
const textW = (s: string, k = 1) => s.length * 4 * k - k;

interface Painted {
  base: Pix;
  layers: { cls: string; p: Pix }[];
}

/** A team colour that still shows on a night scene: a black or near-black one is lifted. */
function vivid(c: string): string {
  const [r, g, b] = rgb(c);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 48 ? mix(c, '#9AA3B8', 0.45) : c;
}
/** Dark ink on a light team colour (a yellow banner), white on any other. */
function inkOn(c: string): string {
  const [r, g, b] = rgb(c);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150 ? '#1B1820' : '#F4F1EA';
}
const dk = (c: string, t = 0.3) => mix(c, '#000000', t);
const lt = (c: string, t = 0.25) => mix(c, '#FFFFFF', t);

const NIGHT = '#0A0E1C';
const WARM = '#FFF3C4';
const WHITE = '#F4F1EA';
const GOLD = '#F2C94C';
/** The colour of a warm light's pool, laid over the scene see-through. */
const GLOW = '#FFC94A';
const BALL = { o: '#E8590C', s: '#7A2E06' };

/** A tank top 12 wide, 14 tall (k pixels a dot), his number on it. */
const JERSEY = ['..BB....BB..', '..BBT..TBB..', '..BBBTTBBB..', '.TBBBBBBBBT.', 'TBBBBBBBBBBT', 'BBBBBBBBBBBB', 'BBBBBBBBBBBB', 'BBBBBBBBBBBB', 'BBBBBBBBBBBB', 'BBBBBBBBBBBB', 'BBBBBBBBBBBB', 'BBBBBBBBBBBB', 'BBBBBBBBBBBB', 'TTTTTTTTTTTT'];
function jersey(p: Pix, x: number, y: number, body: string, num: number, k = 1, name?: string) {
  const trim = lt(body, 0.55);
  p.sprite(x, y, JERSEY, { B: body, T: trim }, k);
  const s = String(num);
  const nk = k >= 2 ? k - 1 : 1;
  const ink = inkOn(body);
  if (name && k >= 2 && textW(name) <= 12 * k - 4) p.text(x + Math.round((12 * k - textW(name)) / 2), y + 4 * k, name, ink);
  p.text(x + Math.round((12 * k - textW(s, nk)) / 2), y + (k >= 2 ? 7 : 6) * k, s, ink, nk);
}

/** A ball, r pixels round, with its seams. */
function ball(p: Pix, cx: number, cy: number, r: number) {
  p.disc(cx, cy, r, BALL.o);
  for (let i = -r; i <= r; i++) p.put(cx + i, cy, BALL.s);
  for (let i = -r + 1; i < r; i++) p.put(cx, cy + i, BALL.s);
}

/** The Olympic gold, in the last shot (shown with the act "now"). */
function medal(p: Pix, x: number, y: number) {
  p.sprite(x, y, ['RW.WR', '.RWR.', '..R..', '.GGG.', 'GGYGG', 'GYYYG', 'GGYGG', '.GGG.'], { R: '#C92A2A', W: WHITE, G: '#B8860B', Y: '#FFD43B' });
}

/** Heads and shoulders of a crowd from y down to y1, rows of them, dimmer to the back. */
function crowd(p: Pix, x0: number, x1: number, y0: number, y1: number, shirts: string[], skin: string[], seed = 3, gap = 5) {
  let s = seed;
  const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff), s / 0x7fffffff);
  for (let row = 0, y = y0; y + 4 <= y1; row++, y += 4) {
    for (let x = x0 + (row % 2) * 2; x < x1 - 2; x += gap) {
      if (r() < 0.08) continue;
      const dim = 0.55 - (row / Math.max(1, (y1 - y0) / 4)) * 0.35;
      p.rect(x + 1, y, 2, 2, dk(skin[Math.floor(r() * skin.length)], dim));
      p.rect(x, y + 2, 4, 2, dk(shirts[Math.floor(r() * shirts.length)], dim));
    }
  }
}
const SKINS = ['#F1C9A5', '#C68A5E', '#8A5534', '#E0A982', '#6B3F26'];

// ---------------------------------------------------------------- the scenes

type Painter = (a: SceneArt, base: Pix, layer: (cls: string) => Pix, look: { skin: string; hair: string }) => void;

/** Enshrined: the Hall of Fame stage, his plaque unveiled, the jacket, his speech at the podium. */
const enshrined: Painter = (a, p, layer, look) => {
  p.rect(0, 0, W, H, '#100C1A');
  p.rect(0, 0, W, 62, '#141A30');
  for (let x = 30; x < 130; x += 20) p.rect(x, 6, 2, 56, '#1A2140');
  // the curtains, tied back
  for (let y = 0; y < 66; y++) {
    const edge = y < 30 ? 28 - Math.round((y / 30) * 8) : 20 + Math.round(((y - 30) / 36) * 8);
    for (let x = 0; x < edge; x++) {
      const c = x === edge - 1 ? '#3E0C18' : Math.floor(x / 2) % 2 ? '#561020' : '#6E1424';
      p.put(x, y, c);
      p.put(W - 1 - x, y, c);
    }
  }
  p.rect(0, 30, 21, 2, '#C9A227');
  p.rect(W - 21, 30, 21, 2, '#C9A227');
  // the valance and its gold trim
  p.rect(0, 0, W, 5, '#7A1A2C');
  p.rect(0, 5, W, 1, '#C9A227');
  for (let x = 4; x < W; x += 10) p.rect(x, 6, 3, 1, '#7A1A2C');
  // the hall's name over the stage
  p.rect(52, 21, 56, 11, '#C9A227');
  p.rect(53, 22, 54, 9, '#1B1426');
  p.text(80 - Math.round(textW('HALL OF FAME') / 2), 24, 'HALL OF FAME', '#F2C94C');
  // the stage
  for (let y = 62; y < 80; y++) p.rect(0, y, W, 1, Math.floor((y - 62) / 2) % 2 ? '#33200F' : '#3A2414');
  p.rect(0, 62, W, 1, '#5A3A20');
  p.rect(0, 80, W, 2, '#8A6D1F');
  p.rect(0, 82, W, 8, '#08070C');
  // the plaque on its easel
  p.rect(55, 36, 2, 30, '#4E321B');
  p.rect(67, 36, 2, 30, '#4E321B');
  p.rect(53, 62, 4, 4, '#4E321B');
  p.rect(67, 62, 4, 4, '#4E321B');
  p.rect(52, 30, 20, 23, '#6E4A26');
  p.rect(53, 31, 18, 21, '#9C6B3A');
  p.rect(58, 33, 8, 9, '#B07D4F');
  p.rect(59, 34, 6, 7, '#C08A52');
  p.rect(60, 36, 1, 1, '#6E4A26');
  p.rect(63, 36, 1, 1, '#6E4A26');
  p.rect(61, 39, 2, 1, '#6E4A26');
  p.rect(57, 42, 10, 2, '#B07D4F');
  p.text(62 - Math.round(textW(String(a.number)) / 2), 45, String(a.number), '#5A3A20');
  // him at the podium in the jacket, the spotlights on both
  const jacket = '#D98E2B';
  p.rect(101, 31, 6, 1, look.hair);
  p.rect(101, 32, 6, 5, look.skin);
  p.rect(101, 32, 6, 1, look.hair);
  p.put(102, 34, '#1B1820');
  p.put(105, 34, '#1B1820');
  p.rect(103, 37, 2, 1, look.skin);
  p.rect(97, 38, 14, 9, jacket);
  p.rect(102, 38, 4, 6, WHITE);
  p.rect(103, 39, 2, 5, vivid(a.color));
  p.rect(100, 38, 2, 6, '#A86A1A');
  p.rect(106, 38, 2, 6, '#A86A1A');
  p.rect(95, 46, 19, 2, '#6B4626');
  p.rect(97, 48, 15, 18, '#4E321B');
  p.rect(99, 50, 11, 14, '#5A3A20');
  p.disc(104, 56, 2, '#C9A227');
  p.rect(99, 41, 1, 5, '#2A2A30');
  p.rect(98, 40, 2, 2, '#3A3A44');
  // the front row: his family lit, when he has one
  for (let x = 2; x < W; x += 7) {
    p.rect(x + 1, 83, 3, 3, '#1A1622');
    p.rect(x, 86, 5, 4, '#1A1622');
  }
  if (a.family)
    [72, 79, 86].forEach((x, i) => {
      p.rect(x + 1, 83, 3, 3, SKINS[(i + 1) % 5]);
      p.rect(x, 86, 5, 4, ['#7A3A5A', '#1F3A7A', '#C9A227'][i]);
    });
  const spot = layer('es-cone');
  for (let i = 0; i < 9; i++) {
    spot.rect(58 - i, 6 + i * 6, 8 + i * 2, 6, GLOW);
    spot.rect(100 - i, 6 + i * 6, 8 + i * 2, 6, GLOW);
  }
  // the cloth over the plaque, until it falls
  const cloth = layer('es-cloth');
  cloth.rect(51, 29, 22, 25, '#8E1A2E');
  for (let x = 53; x < 72; x += 4) cloth.rect(x, 29, 1, 25, '#6E1424');
  cloth.rect(51, 29, 22, 1, '#B02A40');
  cloth.rect(61, 53, 2, 3, '#C9A227');
  const flash = [layer('es-flash a'), layer('es-flash b')];
  [12, 38, 118, 146, 24, 132].forEach((x, i) => flash[i % 2].rect(x, 84, 2, 2, WHITE));
  medal(layer('es-gold'), 110, 48);
};

/** Ring bearer: a ring box opening under a desk lamp, parade confetti in a jacket pocket. */
const ring: Painter = (a, p, layer) => {
  const team = vivid(a.color);
  p.rect(0, 0, W, H, '#0B0D16');
  p.rect(0, 0, W, 58, '#121626');
  for (let x = 4; x < W; x += 8) p.rect(x, 0, 1, 58, '#151A2C');
  // the window, the city at night
  p.rect(4, 8, 28, 34, '#2B3558');
  p.rect(6, 10, 24, 30, '#0E1838');
  [8, 12, 15, 19, 23, 26].forEach((x, i) => p.rect(x, 26 + (i % 3) * 3, 3, 14 - (i % 3) * 3, '#18224A'));
  [[9, 30], [13, 33], [20, 31], [24, 35], [16, 36]].forEach(([x, y]) => p.put(x, y, GOLD));
  [[10, 13], [22, 15], [27, 12], [14, 18]].forEach(([x, y]) => p.put(x, y, '#C9CFDA'));
  p.rect(17, 10, 2, 30, '#2B3558');
  p.rect(6, 24, 24, 1, '#2B3558');
  // a team photo on the wall
  p.rect(124, 14, 24, 17, '#6B4626');
  p.rect(126, 16, 20, 13, '#1B2340');
  for (let x = 127; x < 145; x += 3) {
    p.rect(x, 21, 2, 2, SKINS[x % 5]);
    p.rect(x, 23, 2, 4, team);
  }
  // the desk
  p.rect(0, 58, W, 4, '#5A3A20');
  p.rect(0, 58, W, 1, '#6B4626');
  p.rect(0, 62, W, 28, '#3E2814');
  p.rect(10, 66, 60, 18, '#2E1E0F');
  p.rect(11, 67, 58, 16, '#3E2814');
  p.rect(90, 66, 60, 18, '#2E1E0F');
  p.rect(91, 67, 58, 16, '#3E2814');
  p.rect(38, 74, 4, 2, '#C9A227');
  p.rect(118, 74, 4, 2, '#C9A227');
  // the chair and the jacket over it, confetti spilling from the pocket
  p.ox = 8;
  p.rect(30, 34, 2, 24, '#4E321B');
  p.rect(52, 34, 2, 24, '#4E321B');
  p.rect(30, 34, 24, 2, '#5A3A20');
  p.rect(29, 35, 26, 4, team);
  p.rect(36, 34, 12, 2, WHITE);
  p.rect(28, 38, 4, 16, team);
  p.rect(52, 38, 4, 16, team);
  p.rect(28, 54, 4, 2, WHITE);
  p.rect(52, 54, 4, 2, WHITE);
  p.rect(32, 38, 1, 16, '#0B0D16');
  p.rect(51, 38, 1, 16, '#0B0D16');
  p.rect(33, 38, 18, 14, dk(team, 0.15));
  p.rect(33, 52, 18, 2, WHITE);
  p.rect(41, 36, 2, 16, '#C9CFDA');
  p.rect(37, 36, 3, 5, dk(team, 0.4));
  p.rect(44, 36, 3, 5, dk(team, 0.4));
  p.rect(44, 46, 6, 4, dk(team, 0.45));
  p.rect(44, 46, 6, 1, lt(team, 0.2));
  const bits = ['#E03131', '#FFD43B', '#4DABF7', '#69DB7C', '#F783AC', WHITE];
  [[44, 45], [46, 44], [48, 45], [45, 44], [49, 46], [47, 51], [50, 55], [52, 57], [46, 57], [56, 57]].forEach(([x, y], i) => p.put(x, y, bits[i % bits.length]));
  // the lamp
  p.ox = 4;
  p.rect(106, 55, 11, 3, '#3A3F48');
  p.rect(107, 54, 9, 1, '#4A505A');
  for (let i = 0; i < 9; i++) p.rect(110 - Math.floor(i / 2), 54 - i * 2, 2, 2, '#4A505A');
  p.rect(100, 34, 7, 2, '#4A505A');
  p.rect(88, 27, 13, 2, '#1F5A3A');
  p.rect(86, 29, 17, 4, '#2F6B4A');
  p.rect(86, 29, 17, 1, '#3F8A60');
  // the ring box: closed at first, then open on the ring
  p.rect(68, 50, 20, 8, '#1B2350');
  p.rect(68, 56, 20, 2, '#121836');
  p.rect(70, 50, 16, 2, '#0E1330');
  p.ox = 0;
  const lamp = layer('es-cone');
  lamp.ox = 4;
  for (let y = 33; y < 58; y++) {
    const half = 6 + Math.floor((y - 33) * 0.9);
    lamp.rect(94 - half, y, half * 2, 1, GLOW);
  }
  const lit = layer('es-lit');
  lit.ox = 4;
  lit.rect(92, 33, 5, 1, WARM);
  lit.rect(62, 58, 52, 1, '#9A6A36');
  lit.rect(60, 59, 56, 3, '#7A5030');
  const shut = layer('es-lid-shut');
  shut.ox = 4;
  shut.rect(67, 46, 22, 4, '#232C60');
  shut.rect(67, 46, 22, 1, '#34418A');
  const open = layer('es-lid-open');
  open.ox = 4;
  open.rect(68, 34, 20, 14, '#232C60');
  open.rect(70, 36, 16, 11, '#E8E2D0');
  open.rect(70, 46, 16, 1, '#C9C2AE');
  // the ring, gold, his team's colour in the stone
  open.sprite(72, 40, ['..oGGGGo..', '.oGWccWGo.', 'oGGcTTcGGo', '.oGGGGGGo.', '.GG....GG.', '.GG....GG.', '..GG..GG..', '...GGGG...'], { o: '#6B4A0B', G: GOLD, W: WHITE, c: '#B8860B', T: team });
  const sparkle = layer('es-sparkle');
  sparkle.ox = 4;
  [[70, 38], [87, 41], [79, 36]].forEach(([x, y]) => {
    sparkle.put(x, y, WHITE);
    sparkle.put(x - 1, y, WARM);
    sparkle.put(x + 1, y, WARM);
    sparkle.put(x, y - 1, WARM);
    sparkle.put(x, y + 1, WARM);
  });
  const fall = layer('es-confetti');
  fall.ox = 8;
  [[47, 50], [49, 52], [45, 53]].forEach(([x, y], i) => fall.put(x, y, bits[(i + 2) % bits.length]));
  medal(layer('es-gold'), 96, 50);
};

/** All-Star: every All-Star jersey hanging in his garage like banners. */
const allstar: Painter = (a, p, layer) => {
  const n = Math.max(1, a.labels.length);
  const k = n <= 4 ? 2 : 1;
  p.rect(0, 0, W, H, '#14161E');
  // the ceiling joists, and the beam they hang from
  for (let x = 0; x < W; x += 14) p.rect(x, 0, 4, 18, '#3A2A1C');
  p.rect(0, 0, W, 2, '#2A2018');
  p.rect(0, 18, W, 3, '#5A3A20');
  p.rect(0, 18, W, 1, '#6B4626');
  // block walls
  for (let y = 21; y < 76; y++) for (let x = 0; x < W; x++) p.put(x, y, (y - 21) % 5 === 4 || (x + (Math.floor((y - 21) / 5) % 2) * 6) % 12 === 0 ? '#262B37' : '#2E3442');
  // the garage door
  const doorTop = k === 2 ? 60 : 50;
  p.rect(34, doorTop, 92, 76 - doorTop, '#3D4558');
  for (let y = doorTop + 5; y < 76; y += 6) p.rect(34, y, 92, 1, '#333A4B');
  p.rect(34, doorTop, 92, 1, '#4A546A');
  p.rect(76, 72, 8, 2, '#9AA3B8');
  // the car's tail at one side, the workbench at the other
  p.rect(0, 52, 24, 22, '#5A6272');
  p.rect(0, 52, 24, 2, '#6C7486');
  p.rect(18, 58, 4, 5, '#E03131');
  p.rect(0, 70, 24, 4, '#1B1E26');
  p.rect(136, 34, 22, 20, '#6B5636');
  for (let x = 138; x < 156; x += 3) for (let y = 36; y < 52; y += 3) p.put(x, y, '#4E3E26');
  p.rect(140, 38, 2, 9, '#9AA3B8');
  p.rect(146, 40, 6, 2, '#C92A2A');
  p.rect(132, 54, 28, 3, '#6B4626');
  p.rect(134, 57, 2, 19, '#4E321B');
  p.rect(156, 57, 2, 19, '#4E321B');
  // the floor
  p.rect(0, 76, W, 14, '#4A4E57');
  for (let x = 0; x < W; x += 20) p.rect(x, 76, 1, 14, '#41454E');
  p.rect(56, 82, 18, 3, '#3A3D44');
  ball(p, 122, 82, 3);
  // the string and the jerseys on it, a year under each
  const gap = k === 2 ? 30 : Math.min(17, Math.floor(120 / n));
  const w = 12 * k;
  const x0 = 80 - Math.round(((n - 1) * gap + w) / 2);
  const y0 = 24;
  p.rect(x0 - 6, y0 - 1, (n - 1) * gap + w + 12, 1, '#9AA3B8');
  const labels = a.labels.length ? a.labels : ['24'];
  labels.forEach((year, i) => {
    const x = x0 + i * gap;
    jersey(p, x, y0, a.tints[i] ?? '#1D428A', a.number, k);
    p.rect(x + 2 * k, y0 - 1, 1, 2, WHITE);
    p.rect(x + 9 * k, y0 - 1, 1, 2, WHITE);
    p.text(x + Math.round((w - textW(year)) / 2), y0 + 14 * k + 3, year, '#C9CFDA');
    // each one in the dark until the bulb reaches it
    layer(`es-dim j${i}`).rect(x - 1, y0 - 1, w + 2, 14 * k + 10, '#14161E');
  });
  // the bulb
  p.rect(80, 2, 1, 4, '#2A2F3A');
  p.rect(79, 6, 3, 3, '#C9CFDA');
  layer('es-lit').rect(79, 6, 3, 3, WARM);
  const bulb = layer('es-cone');
  for (let i = 0; i < 10; i++) bulb.rect(70 - i * 6, 9 + i * 6, 21 + i * 12, 6, GLOW);
  medal(layer('es-gold'), 78, k === 2 ? 64 : 54);
};

/** Legend of Europe: a European arena, flares and scarves, his number on a banner. */
const eurolegend: Painter = (a, p, layer) => {
  const team = vivid(a.color);
  p.rect(0, 0, W, H, '#0A0B12');
  crowd(p, 0, W, 2, 26, [team, WHITE, '#1B1820', team], SKINS, 11, 4);
  p.rect(0, 26, W, 2, '#2B2F3A');
  p.rect(0, 28, W, 1, '#3A3F4A');
  crowd(p, 0, W, 30, 58, [team, WHITE, team, '#1B1820'], SKINS, 5, 4);
  // the boards, his name running along them
  p.rect(0, 58, W, 5, '#14161E');
  for (let x = 2, i = 0; x < W - 4; x += textW(`${a.surname} ${a.number}  `) + 1, i++) p.text(x, 58, `${a.surname} ${a.number}`, i % 2 ? '#FFB21E' : '#FFD43B');
  // the court
  for (let y = 63; y < H; y++) for (let x = 0; x < W; x++) p.put(x, y, (y - 63) % 3 === 2 ? '#5E3E22' : Math.floor((x + Math.floor((y - 63) / 3) * 17) / 24) % 2 ? '#7A5230' : '#704A2A');
  p.rect(0, 63, W, 1, lt(team, 0.2));
  p.rect(60, 80, 40, 1, lt(team, 0.2));
  // the scarves held up, in two groups that bounce in turn
  const scarves = [layer('es-scarf a'), layer('es-scarf b')];
  [6, 22, 38, 58, 94, 112, 128, 146].forEach((x, i) =>
    [0, 1, 2, 3, 4].forEach((j) => scarves[i % 2].rect(x + j * 2, 40 + (i % 3) * 5, 2, 2, j % 2 ? WHITE : team)),
  );
  [14, 46, 104, 138].forEach((x, i) => [0, 1, 2, 3, 4].forEach((j) => scarves[(i + 1) % 2].rect(x + j * 2, 10 + (i % 2) * 6, 2, 2, j % 2 ? WHITE : team)));
  // the flares: a glow, the smoke, and the flame in two shapes
  const glow = layer('es-glow');
  const smoke = layer('es-smoke');
  const fa = layer('es-fl a');
  const fb = layer('es-fl b');
  [30, 50, 110, 130].forEach((x) => {
    glow.rect(x - 6, 36, 13, 12, '#E8590C');
    smoke.rect(x - 2, 26, 5, 4, '#6A6E78');
    smoke.rect(x - 4, 20, 7, 5, '#585C66');
    smoke.rect(x - 1, 14, 6, 5, '#4A4E57');
    fa.sprite(x - 2, 38, ['..Y..', '.YWY.', '.OYO.', 'ROWOR', '.RWR.', '..B..', '..B..'], { Y: '#FFD43B', W: WARM, O: '#FF922B', R: '#E03131', B: '#3A3F48' });
    fb.sprite(x - 2, 38, ['.Y...', '..YY.', '.OWO.', '.OYOR', 'RRWR.', '..B..', '..B..'], { Y: '#FFD43B', W: WARM, O: '#FF922B', R: '#E03131', B: '#3A3F48' });
  });
  // the banner the fans made, his number on it, dropped from the upper tier
  const banner = layer('es-banner');
  banner.rect(56, 22, 48, 26, WHITE);
  banner.rect(57, 23, 46, 24, team);
  const num = String(a.number);
  const ink = inkOn(team);
  banner.text(80 - Math.round(textW(num, 3) / 2), 25, num, ink, 3);
  banner.text(80 - Math.round(textW(a.surname.slice(0, 11)) / 2), 41, a.surname.slice(0, 11), ink);
  banner.rect(56, 22, 1, 1, '#9AA3B8');
  banner.rect(103, 22, 1, 1, '#9AA3B8');
  medal(layer('es-gold'), 98, 26);
};

/** The long haul: his last locker cleared out, the nameplate peeled off, the lights going out. */
const longhaul: Painter = (a, p, layer) => {
  const team = vivid(a.color);
  p.rect(0, 0, W, H, '#0E1118');
  p.rect(0, 0, W, 12, '#1A1E28');
  // the four light panels' housings (the tubes are layers)
  const panels = [6, 46, 86, 126];
  panels.forEach((x) => p.rect(x, 3, 28, 5, '#2A2F3A'));
  p.rect(0, 12, W, 62, '#2C3442');
  for (let y = 12; y < 74; y += 6) p.rect(0, y, W, 1, '#283040');
  // the lockers, his in the middle, open and empty
  for (let i = 0; i < 13; i++) {
    const x = -4 + i * 13;
    p.rect(x, 20, 12, 46, '#3B4A5E');
    p.rect(x, 20, 1, 46, '#4A5B72');
    for (let v = 0; v < 3; v++) p.rect(x + 3, 23 + v * 2, 6, 1, '#28323F');
    p.rect(x + 9, 42, 1, 4, '#9AA3B8');
    if (i !== 6) p.rect(x + 3, 14, 6, 3, '#4A5468');
  }
  p.rect(74, 20, 12, 46, '#141922');
  p.rect(74, 30, 12, 1, '#2A2F3A');
  p.rect(79, 33, 2, 3, '#9AA3B8');
  p.rect(86, 20, 4, 46, '#4A5B72');
  p.rect(86, 20, 1, 46, '#5A6C84');
  // where the nameplate was, a clean patch of wall
  const name = a.surname.slice(0, 9);
  const nw = Math.max(16, textW(name) + 4);
  p.rect(80 - Math.round(nw / 2), 13, nw, 7, '#353D4C');
  // the bench, his bag on it, his shoes under it
  p.rect(16, 70, 128, 3, '#6B4626');
  p.rect(16, 70, 128, 1, '#8A5A2E');
  [20, 76, 136].forEach((x) => p.rect(x, 73, 3, 6, '#4E321B'));
  p.rect(56, 63, 22, 7, team);
  p.rect(56, 63, 22, 1, lt(team, 0.3));
  p.rect(58, 66, 18, 1, WHITE);
  p.rect(62, 60, 10, 1, dk(team, 0.3));
  p.rect(61, 61, 1, 2, dk(team, 0.3));
  p.rect(72, 61, 1, 2, dk(team, 0.3));
  p.rect(92, 78, 5, 2, WHITE);
  p.rect(98, 78, 5, 2, WHITE);
  p.rect(92, 80, 5, 1, team);
  p.rect(98, 80, 5, 1, team);
  for (let y = 74; y < H; y += 4) for (let x = 0; x < W; x += 4) p.rect(x, y, 4, 4, (x + y) % 8 ? '#1F242E' : '#232935');
  // the exit sign stays lit
  p.rect(138, 13, 19, 8, '#1B5E2A');
  p.text(140, 14, 'EXIT', WHITE);
  // the nameplate (tape, his name in marker), then its corner lifting, then gone
  const plate = layer('es-plate');
  plate.rect(80 - Math.round(nw / 2), 13, nw, 7, '#E8DDB5');
  plate.text(80 - Math.round(textW(name) / 2), 14, name, '#1B1820');
  const peel = layer('es-peel');
  peel.rect(80 + Math.round(nw / 2) - 3, 13, 3, 3, '#C9BE96');
  peel.rect(80 + Math.round(nw / 2) - 1, 12, 2, 2, '#E8DDB5');
  // each panel's tube and glow, and the dark that comes as each goes
  panels.forEach((x, i) => {
    layer(`es-light l${i}`).rect(x + 1, 4, 26, 3, '#E8F1FF');
    const c = layer(`es-cone l${i}`);
    for (let j = 0; j < 6; j++) c.rect(x + 2 - j, 8 + j * 5, 24 + j * 2, 5, '#DCE8FF');
    layer(`es-dark l${i}`).rect(0, 0, W, H, '#05070C');
  });
  medal(layer('es-gold'), 77, 31);
};

/** Made it: his first NBA jersey framed on his childhood bedroom wall, the debut's ticket stub. */
const madeit: Painter = (a, p, layer) => {
  const team = vivid(a.color);
  p.rect(0, 0, W, H, '#1B2034');
  for (let x = 0; x < W; x += 6) p.rect(x, 0, 3, 70, '#232A44');
  p.rect(0, 0, W, 3, '#141828');
  // the window, moon and stars
  p.rect(6, 12, 28, 30, '#4A5470');
  p.rect(8, 14, 24, 26, '#0C1430');
  p.disc(25, 20, 3, '#F4F1EA');
  p.disc(26, 19, 2, '#0C1430');
  [[11, 17], [15, 24], [20, 30], [28, 33], [12, 35]].forEach(([x, y]) => p.put(x, y, '#C9CFDA'));
  p.rect(19, 14, 2, 26, '#4A5470');
  p.rect(2, 10, 5, 36, '#7A3A3A');
  p.rect(33, 10, 5, 36, '#7A3A3A');
  p.rect(2, 10, 36, 2, '#5A2A2A');
  // the frame, the jersey inside it
  p.ox = -3;
  p.rect(58, 20, 44, 40, '#6B4626');
  p.rect(59, 21, 42, 38, '#8A5A2E');
  p.rect(61, 23, 38, 34, '#4E321B');
  p.rect(62, 24, 36, 32, '#E8E2D0');
  p.rect(64, 26, 32, 28, '#1B1F2E');
  jersey(p, 68, 27, team, a.number, 2, a.surname.length <= 5 ? a.surname : undefined);
  p.ox = 0;
  // the ticket stub, pinned beside it
  p.rect(101, 40, 13, 9, '#E8D8A8');
  for (let y = 40; y < 49; y += 2) p.put(101, y, '#1B2034');
  p.rect(102, 40, 12, 2, '#C92A2A');
  p.text(102, 43, 'NBA', '#3A2A1A');
  p.rect(107, 38, 2, 2, '#E03131');
  // a poster and a shelf with a trophy
  p.rect(136, 12, 18, 24, '#E8E2D0');
  p.rect(137, 13, 16, 22, team);
  p.rect(143, 16, 4, 4, '#1B1820');
  p.rect(142, 20, 6, 8, '#1B1820');
  p.rect(140, 22, 2, 5, '#1B1820');
  p.rect(148, 18, 2, 5, '#1B1820');
  p.rect(150, 16, 2, 2, BALL.o);
  p.rect(130, 48, 26, 2, '#6B4626');
  p.rect(140, 40, 6, 5, GOLD);
  p.rect(142, 45, 2, 2, '#B8860B');
  p.rect(139, 47, 8, 1, '#5A3A20');
  // the bed, the nightstand and its lamp
  p.rect(0, 70, W, 20, '#3E2814');
  for (let x = 0; x < W; x += 12) p.rect(x, 70, 1, 20, '#352210');
  p.rect(0, 56, 6, 22, '#5A3A20');
  p.rect(0, 62, 50, 14, '#7A1F2B');
  p.rect(0, 62, 50, 2, '#932838');
  for (let x = 8; x < 50; x += 8) p.rect(x, 66, 4, 4, '#932838');
  p.rect(6, 58, 14, 5, '#E8E2D0');
  ball(p, 40, 82, 3);
  p.rect(116, 64, 16, 16, '#5A3A20');
  p.rect(116, 64, 16, 2, '#6B4626');
  p.rect(118, 70, 12, 1, '#3E2814');
  p.rect(123, 58, 2, 6, '#2A2F3A');
  p.rect(119, 52, 10, 6, '#C9B48A');
  layer('es-lit').rect(119, 52, 10, 6, WARM);
  const lamp = layer('es-cone');
  for (let i = 0; i < 6; i++) lamp.rect(106 - i * 8, 30 + i * 5, 16 + i * 10, 5, GLOW);
  const tw = layer('es-twinkle');
  [[11, 17], [20, 30], [28, 33]].forEach(([x, y]) => tw.put(x, y, WHITE));
  medal(layer('es-gold'), 93, 16);
};

/** Passport: a departures board listing every city he played in, a passport full of stamps. */
const passport: Painter = (a, p, layer) => {
  const team = vivid(a.color);
  p.rect(0, 0, W, H, '#20283A');
  p.rect(0, 0, W, 6, '#1A1F2B');
  [10, 50, 90, 130].forEach((x) => p.rect(x, 2, 20, 2, '#C9CFDA'));
  // the window on the runway, a plane taking off
  p.rect(0, 10, 40, 54, '#2E3850');
  p.rect(2, 12, 36, 50, '#0C1430');
  for (let x = 4; x < 38; x += 4) p.put(x, 56, '#FFD43B');
  p.rect(2, 58, 36, 4, '#141A2E');
  [[8, 16], [20, 22], [30, 14], [14, 30]].forEach(([x, y]) => p.put(x, y, '#C9CFDA'));
  p.rect(19, 12, 2, 50, '#2E3850');
  // the board
  p.rect(43, 9, 74, 56, '#3A3F4A');
  p.rect(44, 10, 72, 54, '#0E0F14');
  p.text(80 - Math.round(textW('DEPARTURES') / 2), 12, 'DEPARTURES', WHITE);
  p.rect(46, 18, 68, 1, '#2A2F3A');
  const rows = a.labels.length ? a.labels : ['2030 MADRID', '2032 ISTANBUL', '2034 SYDNEY'];
  for (let r = 0; r < 6; r++) {
    const y = 21 + r * 7;
    for (let c = 0; c < 17; c++) p.rect(46 + c * 4, y - 1, 3, 7, '#1E2129');
  }
  rows.forEach((row, r) => {
    const l = layer(`es-row r${r}`);
    l.text(46, 21 + r * 7, row, '#FFD43B');
  });
  // the last city's light blinks: boarding now
  const blink = layer('es-blink');
  blink.rect(112, 21 + (rows.length - 1) * 7, 2, 5, '#40C057');
  // the seats, the passport open on one, a bag beside it
  p.rect(40, 68, 80, 6, '#2B3558');
  p.rect(40, 74, 80, 2, '#3A4566');
  for (let x = 44; x < 120; x += 16) p.rect(x, 76, 2, 6, '#9AA3B8');
  p.rect(66, 64, 24, 9, '#5A1A1A');
  p.rect(67, 64, 11, 8, '#E8E2D0');
  p.rect(78, 64, 11, 8, '#E8E2D0');
  p.rect(78, 64, 1, 8, '#C9C2AE');
  p.rect(68, 65, 4, 3, '#C92A2A');
  p.rect(73, 67, 3, 3, '#1C7ED6');
  p.rect(69, 69, 3, 2, '#2B8A3E');
  p.rect(80, 65, 3, 3, '#7048E8');
  p.rect(84, 66, 4, 2, '#C92A2A');
  p.rect(81, 69, 4, 2, '#1C7ED6');
  p.rect(98, 58, 12, 16, team);
  p.rect(98, 58, 12, 1, lt(team, 0.3));
  p.rect(102, 54, 4, 1, '#9AA3B8');
  p.rect(101, 55, 1, 3, '#9AA3B8');
  p.rect(106, 55, 1, 3, '#9AA3B8');
  p.rect(100, 64, 8, 1, dk(team, 0.3));
  p.rect(0, 82, W, 8, '#2A3040');
  for (let x = 0; x < W; x += 10) p.rect(x, 84, 6, 1, '#323A4E');
  p.rect(0, 82, W, 1, '#3A4256');
  const plane = layer('es-plane');
  plane.sprite(6, 46, ['.....W.....', 'WWWWWWWWWWR', '..WWWW.....', '...W.......'], { W: WHITE, R: '#E03131' });
  medal(layer('es-gold'), 86, 60);
};

/** The grinder: the team bus at night on the highway, ten-day contracts taped in his window. */
const grinder: Painter = (a, p, layer) => {
  const team = vivid(a.color);
  p.rect(0, 0, W, H, NIGHT);
  [[12, 6], [30, 14], [48, 4], [70, 10], [96, 6], [118, 16], [140, 8], [150, 20], [22, 24], [60, 22]].forEach(([x, y]) => p.put(x, y, '#C9CFDA'));
  p.disc(134, 12, 4, '#E8E2D0');
  p.disc(136, 11, 3, NIGHT);
  for (let x = 0; x < W; x++) {
    const h = 6 + Math.round(4 * Math.sin(x / 13) + 3 * Math.sin(x / 5.3));
    p.rect(x, 50 - h, 1, h, '#121931');
  }
  // the highway
  p.rect(0, 50, W, 4, '#3A4256');
  for (let x = 2; x < W; x += 10) p.rect(x, 50, 1, 6, '#2B3348');
  p.rect(0, 56, W, 34, '#22262F');
  p.rect(0, 58, W, 1, GOLD);
  p.rect(0, 88, W, 1, WHITE);
  // the exit sign the bus goes past
  const sign = layer('es-sign');
  sign.rect(133, 24, 26, 14, WHITE);
  sign.rect(134, 25, 24, 12, '#2B8A3E');
  sign.text(136, 27, 'NBA', WHITE);
  sign.rect(150, 30, 5, 1, WHITE);
  sign.rect(153, 29, 1, 3, WHITE);
  sign.rect(154, 30, 1, 1, WHITE);
  sign.rect(136, 33, 15, 1, WHITE);
  sign.rect(145, 38, 2, 18, '#9AA3B8');
  // the bus
  const bus = layer('es-bus');
  bus.rect(30, 30, 100, 34, '#D9DDE5');
  bus.rect(32, 28, 96, 2, '#C2C8D2');
  bus.rect(30, 52, 100, 4, team);
  bus.rect(30, 60, 100, 4, '#3A3F48');
  for (let i = 0; i < 8; i++) {
    const x = 38 + i * 10;
    const on = i === 4 || i === 1 || i === 6;
    bus.rect(x, 35, 8, 11, on ? '#FFD98A' : '#2B3558');
    if (on || i % 2) bus.rect(x + 2, 40, 4, 6, on ? '#3A2E1E' : '#1A1E28');
    if (on || i % 2) bus.rect(x + 3, 38, 2, 2, on ? '#3A2E1E' : '#1A1E28');
  }
  // the contracts taped up in his window
  bus.rect(79, 36, 3, 4, WHITE);
  bus.rect(83, 36, 3, 4, WHITE);
  bus.rect(80, 37, 1, 1, '#6B7280');
  bus.rect(84, 38, 1, 1, '#6B7280');
  bus.rect(120, 33, 9, 17, '#3A4566');
  bus.rect(120, 33, 9, 1, '#5A6688');
  bus.rect(111, 29, 19, 6, '#1B1820');
  bus.text(113, 30, 'AWAY', '#FFB21E');
  bus.rect(128, 56, 2, 3, WARM);
  bus.rect(30, 56, 2, 3, '#E03131');
  for (const cx of [48, 110]) {
    bus.disc(cx, 64, 5, '#14161C');
    bus.disc(cx, 64, 2, '#9AA3B8');
  }
  const beam = layer('es-cone');
  for (let i = 0; i < 6; i++) beam.rect(130 + i * 5, 55 - i, 5, 4 + i * 2, '#FFF3C4');
  const road = layer('es-dash');
  for (let x = -16; x < W + 16; x += 16) road.rect(x, 73, 8, 1, '#E8E2D0');
  medal(layer('es-gold'), 90, 37);
};

/** One shining moment: cutting down the net, his number in the college gym's rafters. */
const shining: Painter = (a, p, layer, look) => {
  const school = vivid(a.color);
  p.rect(0, 0, W, H, '#16131A');
  // the rafters' trusses
  p.rect(0, 2, W, 1, '#3A3F4A');
  p.rect(0, 9, W, 1, '#3A3F4A');
  for (let x = 0; x < W; x += 8) {
    p.rect(x, 3, 1, 6, '#2A2F3A');
    for (let i = 0; i < 6; i++) p.put(x + i, 3 + i, '#2A2F3A');
  }
  // the school's banners, and his number among them
  [6, 22, 126, 142].forEach((x, i) => {
    p.rect(x + 5, 10, 1, 6, '#9AA3B8');
    p.rect(x, 16, 11, 16, i % 2 ? WHITE : school);
    p.rect(x + 2, 20, 7, 1, i % 2 ? school : WHITE);
    p.rect(x + 2, 23, 7, 1, i % 2 ? school : WHITE);
    p.rect(x + 2, 26, 5, 1, i % 2 ? school : WHITE);
  });
  p.rect(105, 10, 1, 12, '#9AA3B8');
  p.rect(97, 22, 17, 24, WHITE);
  p.rect(98, 23, 15, 22, school);
  const num = String(a.number);
  const ink = inkOn(school);
  p.text(105 - Math.round(textW(num, 2) / 2) + 1, 26, num, ink, 2);
  p.rect(100, 39, 11, 1, ink);
  p.rect(100, 41, 11, 1, ink);
  // the student section
  crowd(p, 0, W, 44, 66, [school, WHITE, school, '#1B1820'], SKINS, 9, 4);
  // the floor
  for (let y = 66; y < H; y++) for (let x = 0; x < W; x++) p.put(x, y, (y - 66) % 4 === 3 ? '#B98048' : Math.floor((x + Math.floor((y - 66) / 4) * 29) / 40) % 2 ? '#D9A066' : '#D29A5F');
  p.rect(0, 66, W, 2, school);
  // the stanchion, the backboard, the rim, two strands of net left
  p.rect(64, 58, 28, 8, '#2B3558');
  p.rect(76, 46, 4, 12, '#3A4566');
  p.rect(62, 24, 32, 20, '#C9D6E0');
  p.rect(63, 25, 30, 18, '#2A3040');
  p.rect(72, 32, 12, 9, WHITE);
  p.rect(73, 33, 10, 7, '#2A3040');
  p.rect(71, 44, 14, 2, '#E8590C');
  p.rect(72, 46, 1, 4, WHITE);
  p.rect(83, 46, 1, 5, WHITE);
  // the ladder, him at the top with the scissors
  for (let i = 0; i < 36; i++) {
    p.put(97 - Math.floor(i / 4), 88 - i, '#C9CFDA');
    p.put(103 - Math.floor(i / 4), 88 - i, '#C9CFDA');
    if (i % 5 === 0) p.rect(98 - Math.floor(i / 4), 88 - i, 5, 1, '#9AA3B8');
  }
  p.rect(89, 37, 5, 1, look.hair);
  p.rect(89, 38, 5, 4, look.skin);
  p.rect(88, 36, 7, 2, WHITE);
  p.put(90, 40, '#1B1820');
  p.rect(87, 42, 8, 8, school);
  p.text(89, 43, num.slice(-1), ink);
  p.rect(86, 41, 2, 4, look.skin);
  p.rect(84, 43, 2, 1, '#C9CFDA');
  p.rect(88, 50, 6, 8, '#2A2F3A');
  // the net, until it's cut
  const net = layer('es-net');
  net.sprite(72, 46, ['W.W.W.W.W.W.', '.W.W.W.W.W..', 'W.W.W.W.W.W.', '.W.W.W.W.W..', '..W.W.W.W...', '...W.W.W....', '....WWWW....'], { W: WHITE });
  const confetti = layer('es-confetti');
  const bits = ['#E03131', '#FFD43B', WHITE, school, '#4DABF7'];
  for (let i = 0; i < 40; i++) confetti.put((i * 37) % W, (i * 23) % 60, bits[i % bits.length]);
  medal(layer('es-gold'), 104, 60);
};

/** Cap and gown: graduation day, a ball under his arm. */
const gown: Painter = (a, p, layer, look) => {
  const school = vivid(a.color);
  // a day sky in bands, the sun, two clouds
  ['#7EC8E3', '#8FD0E8', '#A5DAEE', '#BDE4F2'].forEach((c, i) => p.rect(0, i * 10, W, 10, c));
  p.rect(0, 40, W, 14, '#BDE4F2');
  p.disc(142, 10, 5, '#FFE8A3');
  p.sprite(14, 6, ['...WWWW.....', '.WWWWWWWW...', 'WWWWWWWWWWWW'], { W: WHITE }, 1);
  p.sprite(98, 12, ['..WWW...', 'WWWWWWW.', 'WWWWWWWW'], { W: WHITE }, 1);
  // the hall
  for (let i = 0; i < 9; i++) p.rect(80 - 8 - i * 6, 14 + i, 16 + i * 12, 1, i === 0 ? '#C9C2AE' : '#E8E2D0');
  p.rect(24, 23, 112, 5, '#E8E2D0');
  p.rect(24, 27, 112, 1, '#C9C2AE');
  const words = `CLASS OF ${a.labels[0] ?? '2030'}`;
  p.rect(78 - Math.round(textW(words) / 2), 22, textW(words) + 4, 7, school);
  p.text(80 - Math.round(textW(words) / 2), 23, words, WHITE);
  p.rect(26, 28, 108, 20, '#D8D0BC');
  for (let x = 30; x < 132; x += 14) {
    p.rect(x, 28, 5, 20, WHITE);
    p.rect(x + 4, 28, 1, 20, '#C9C2AE');
  }
  p.rect(74, 34, 12, 14, '#5A4A3A');
  p.rect(22, 48, 116, 2, '#C9C2AE');
  p.rect(20, 50, 120, 2, '#B8B09C');
  // trees at either side
  for (const tx of [8, 150]) {
    p.disc(tx, 34, 9, '#2B8A3E');
    p.disc(tx + 3, 30, 6, '#37A04C');
    p.rect(tx - 1, 42, 3, 10, '#5A3A20');
  }
  // the lawn, mown in stripes, the chairs and the class in them
  for (let y = 52; y < H; y += 4) p.rect(0, y, W, 4, (y / 4) % 2 ? '#4CAF50' : '#43A047');
  [64, 72, 80].forEach((y, r) => {
    for (let x = 4 + (r % 2) * 3; x < W - 4; x += 7) {
      if (x > 66 && x < 92) continue;
      p.rect(x, y + 3, 5, 1, WHITE);
      p.rect(x + 4, y - 1, 1, 4, WHITE);
      p.rect(x, y - 3, 4, 5, '#1B1820');
      p.rect(x - 1, y - 4, 6, 1, '#1B1820');
      p.put(x + 4, y - 3, '#F2C94C');
    }
  });
  // him, in the aisle: cap, gown, the ball under his arm
  p.rect(73, 44, 14, 2, '#1B1820');
  p.rect(76, 42, 8, 2, '#1B1820');
  p.rect(86, 46, 1, 4, school);
  p.rect(77, 46, 6, 1, look.hair);
  p.rect(77, 47, 6, 6, look.skin);
  p.put(78, 49, '#1B1820');
  p.put(81, 49, '#1B1820');
  p.rect(79, 51, 2, 1, dk(look.skin, 0.25));
  p.rect(74, 53, 12, 22, '#1B1820');
  p.rect(78, 53, 4, 3, school);
  p.rect(74, 53, 1, 22, '#2A2630');
  ball(p, 88, 62, 3);
  p.rect(85, 61, 2, 3, look.skin);
  p.rect(76, 75, 3, 3, '#14161C');
  p.rect(81, 75, 3, 3, '#14161C');
  // the caps thrown in the air
  const caps = layer('es-caps');
  [[30, 30], [52, 18], [112, 22], [130, 34], [96, 8], [62, 36]].forEach(([x, y]) => {
    caps.rect(x, y, 6, 1, '#1B1820');
    caps.rect(x + 1, y + 1, 4, 2, '#1B1820');
    caps.put(x + 5, y + 1, '#F2C94C');
  });
  medal(layer('es-gold'), 77, 55);
};

/** Hoops dream: the driveway hoop at dusk, the phone on the step that never rang. */
const dream: Painter = (_a, p, layer) => {
  // dusk, in hard bands
  ['#2B1B4A', '#3E2058', '#5A2A62', '#7A3460', '#A8405E', '#D2584E', '#F08A4B'].forEach((c, i) => p.rect(0, i * 7, W, 7, c));
  p.rect(0, 49, W, 4, '#FFB35C');
  const sun = layer('es-sun');
  sun.disc(124, 52, 8, '#FFD98A');
  // the street behind, the house, the garage with the hoop over its door
  const fg = layer('es-fg');
  for (let x = 0; x < W; x += 18) fg.rect(x, 38 + ((x / 18) % 3) * 3, 16, 16, '#2A1A38');
  fg.rect(0, 53, W, 2, '#2A1A38');
  for (let i = 0; i < 12; i++) fg.rect(2 + i * 2, 24 + i, 54 - i * 4, 1, '#2A2030');
  fg.rect(2, 36, 54, 34, '#3A2E3E');
  fg.rect(12, 42, 12, 10, '#FFD98A');
  fg.rect(17, 42, 2, 10, '#3A2E3E');
  fg.rect(12, 46, 12, 1, '#3A2E3E');
  fg.rect(30, 50, 9, 20, '#2A2030');
  fg.put(37, 60, GOLD);
  fg.rect(40, 62, 18, 2, '#6A5A62');
  fg.rect(40, 64, 18, 3, '#5A4A52');
  fg.rect(40, 67, 18, 3, '#4A3E46');
  fg.rect(60, 36, 46, 34, '#3A2E3E');
  fg.rect(58, 34, 50, 2, '#2A2030');
  fg.rect(64, 46, 38, 24, '#4A3E50');
  for (let y = 50; y < 70; y += 5) fg.rect(64, y, 38, 1, '#42374A');
  fg.rect(73, 22, 22, 14, '#D8D2E0');
  fg.rect(74, 23, 20, 12, '#5A4E62');
  fg.rect(79, 27, 10, 7, '#D8D2E0');
  fg.rect(80, 28, 8, 5, '#5A4E62');
  fg.rect(83, 34, 2, 2, '#9AA3B8');
  fg.rect(78, 36, 12, 1, '#E8590C');
  fg.sprite(79, 37, ['W.W.W.W.W.', '.W.W.W.W..', '..W.W.W...', '...WWW....'], { W: '#D8D2E0' });
  // the tree, the streetlight, the lawn and the driveway
  fg.disc(122, 40, 10, '#1E1428');
  fg.disc(116, 46, 7, '#1E1428');
  fg.rect(121, 48, 3, 22, '#1E1428');
  fg.rect(144, 28, 2, 62, '#2A2030');
  fg.rect(138, 27, 10, 2, '#2A2030');
  fg.rect(138, 29, 5, 2, '#5A4E62');
  fg.rect(0, 70, W, 20, '#2A3428');
  for (let y = 70; y < H; y++) {
    const half = 22 + Math.round((y - 70) * 1.4);
    fg.rect(83 - half, y, half * 2, 1, (y - 70) % 6 === 5 ? '#423E48' : '#4A4650');
  }
  for (let i = 0; i < 8; i++) fg.put(90 + i, 76 + Math.round(i * 0.6), '#36323C');
  ball(fg, 98, 80, 3);
  // the phone on the porch step, dark
  fg.rect(49, 59, 9, 3, '#9AA3B8');
  fg.rect(50, 59, 7, 2, '#14161C');
  fg.rect(51, 59, 5, 1, '#2B3558');
  const glow = layer('es-phone');
  glow.rect(50, 59, 7, 2, '#9AD0FF');
  layer('es-lit').rect(138, 29, 5, 2, WARM);
  const street = layer('es-cone');
  for (let i = 0; i < 8; i++) street.rect(140 - i * 2, 31 + i * 7, 3 + i * 4, 7, GLOW);
  medal(layer('es-gold'), 81, 38);
};

/** The rafters, for the book's tile: the arena at night, his jersey hanging among the banners. */
const rafters: Painter = (a, p) => {
  const team = vivid(a.color);
  p.rect(0, 0, W, H, NIGHT);
  p.rect(0, 3, W, 1, '#1F2742');
  p.rect(0, 8, W, 1, '#1F2742');
  for (let x = 10; x < W; x += 22) {
    p.rect(x, 10, 9, 12, team);
    p.rect(x + 3, 13, 3, 3, '#F2C94C');
  }
  for (let r = 0; r < 9; r++) for (let x = 2 + (r % 2); x < 158; x += 3) p.rect(x, 30 + r * 3, 2, 2, '#2B3558');
  p.rect(0, 28, W, 2, dk(team, 0.4));
  for (let i = 0; i < 17; i++) p.rect(0, 58 + i * 2, W, 2, i % 2 ? '#5A3A20' : '#4E321B');
  p.rect(80, 0, 1, 16, '#9AA3B8');
  jersey(p, 68, 16, team, a.number, 2);
};

const PAINTERS: Record<EndingId, Painter> = { rafters, enshrined, ring, allstar, eurolegend, longhaul, madeit, passport, grinder, shining, gown, dream };

/** The sample career a tile in the book shows when there is no career to read. */
const SAMPLE: SceneArt = { color: '#1D428A', number: 23, surname: 'HALE', labels: [], tints: [], family: false, gold: false };

function paint(kind: EndingId, art: SceneArt, look: { skin: string; hair: string }): Painted {
  const base = new Pix();
  const layers: { cls: string; p: Pix }[] = [];
  const layer = (cls: string) => {
    const p = new Pix();
    layers.push({ cls, p });
    return p;
  };
  PAINTERS[kind](art, base, layer, look);
  return { base, layers: layers.filter((l) => l.cls !== 'es-gold' || art.gold) };
}

const Paths = ({ p }: { p: Pix }) => (
  <>
    {toPaths(p.g).map(({ fill, d }) => (
      <path key={fill} d={d} fill={fill} />
    ))}
  </>
);

const LOOK = { skin: '#C68A5E', hair: '#231B18' };

/** An ending's scene. With `art` from the career (ui/endings.ts sceneOf); without, the book's sample. */
export function EndingArt({ kind, art = SAMPLE, look = LOOK, className = 'fn-scene' }: { kind: EndingId; art?: SceneArt; look?: { skin: string; hair: string }; className?: string }) {
  const s = useMemo(() => paint(kind, art, look), [kind, art, look]);
  return (
    <svg className={`${className} es-${kind}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
      <Paths p={s.base} />
      {s.layers.map((l, i) => (
        <g key={i} className={l.cls}>
          <Paths p={l.p} />
        </g>
      ))}
    </svg>
  );
}

/** The colour above each scene, where a tall phone screen shows the words (the scene keeps its lower part). */
export const SKY: Record<EndingId, string> = { rafters: NIGHT, enshrined: '#141A30', ring: '#121626', allstar: '#14161E', eurolegend: '#0A0B12', longhaul: '#1A1E28', madeit: '#141828', passport: '#1A1F2B', grinder: NIGHT, shining: '#16131A', gown: '#7EC8E3', dream: '#2B1B4A' };
