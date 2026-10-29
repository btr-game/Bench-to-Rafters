import { useMemo } from 'react';
import type { Kit } from '../../content/teamStyle';
import { legendLook, type LegendLook } from '../../content/legendLooks';
import { hash, mix } from './color';
import { dark, light, toPaths, DIGITS } from './pixel';

// A pixel portrait, head and shoulders (round 17), for the legends: 64x72, a front-facing head
// lit from the upper left in five tones, eyes with lids and irises, a nose with nostrils, two-
// tone lips, ears, textured hair and beards, the jersey's collar and number below, and the look
// that makes him recognisable (content/legendLooks.ts): his hair, facial hair, goggles or a
// headband.

const W = 64;
const H = 72;
const SKIN = ['#F3D2B8', '#E8BC98', '#D4A077', '#B67F55', '#8E5B3A', '#6B4029', '#4C2C1C'];
const HAIR: Record<LegendLook['color'], string> = { k: '#1A1412', b: '#5A3A22', l: '#D9B26A', r: '#B4532A', g: '#9AA0A8', x: '#3FBF6A' };
const OUT = '#18141C';
const CX = 32;
const CY = 29;
const RX = 14.2;
const RY = 17.4;

const tones5 = (c: string) => [light(c, 0.22), light(c, 0.09), c, dark(c, 0.14), dark(c, 0.3)];
/** A little pixel noise, the same every time, for hair and stubble texture. */
const noise = (x: number, y: number) => (Math.imul(x * 73856093 ^ y * 19349663, 2654435761) >>> 0) % 7;

function fallback(name: string): LegendLook {
  const h = hash(name);
  const hairs: LegendLook['hair'][] = ['short', 'buzz', 'short', 'flattop', 'afro', 'parted'];
  return { skin: 1 + (h % 7), hair: hairs[(h >>> 4) % hairs.length], color: (h >>> 8) % 4 === 0 ? 'b' : 'k', face: (h >>> 10) % 3 === 0 ? 'mustache' : 'none', gear: [] };
}

function paintBust(look: LegendLook, kit: Kit, number: number): string[][] {
  const g: string[][] = Array.from({ length: H }, () => Array(W).fill(''));
  const part: number[][] = Array.from({ length: H }, () => Array(W).fill(0)); // 1 jersey, 2 neck, 3 head, 4 hair
  const skin = tones5(SKIN[Math.max(0, Math.min(6, look.skin - 1))]);
  const hair = tones5(HAIR[look.color]);
  const inHead = (x: number, y: number) => {
    // a head: a touch narrower at the jaw than at the temples
    const dy = (y + 0.5 - CY) / RY;
    const rx = RX * (dy > 0.2 ? 1 - (dy - 0.2) * 0.32 : 1);
    return ((x + 0.5 - CX) / rx) ** 2 + dy ** 2 <= 1;
  };
  const lit = (x: number, y: number, cx = CX, cy = CY, rx = RX, ry = RY) => {
    const nx = (x + 0.5 - cx) / rx;
    const ny = (y + 0.5 - cy) / ry;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    return -0.5 * nx - 0.45 * ny + 0.74 * nz;
  };
  const t5 = (v: number) => (v > 0.86 ? 0 : v > 0.64 ? 1 : v > 0.36 ? 2 : v > 0.1 ? 3 : 4);
  const set = (x: number, y: number, c: string, p?: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    g[y][x] = c;
    if (p !== undefined) part[y][x] = p;
  };

  // ---- big hair behind the head ----
  const puff = look.hair === 'afro' ? [19, 17] : look.hair === 'bigafro' ? [24, 20] : null;
  if (puff)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const cy = CY - 7;
        if (((x + 0.5 - CX) / puff[0]) ** 2 + ((y + 0.5 - cy) / puff[1]) ** 2 > 1) continue;
        const v = lit(x, y, CX, cy, puff[0], puff[1]);
        set(x, y, hair[Math.min(4, t5(v) + (noise(x, y) < 2 ? 1 : 0))], 4);
      }
  if (look.hair === 'long' || look.hair === 'mullet')
    for (let y = 16; y < (look.hair === 'long' ? 52 : 50); y++)
      for (let x = 0; x < W; x++) {
        const d = Math.abs(x + 0.5 - CX);
        if (d > 11 && d < 18.5 && (look.hair === 'long' || y > 30)) set(x, y, hair[Math.min(4, (x > CX ? 3 : 2) + (noise(x, y) < 2 ? -1 : 0))], 4);
      }

  // ---- shoulders and jersey ----
  for (let y = 51; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x + 0.5 - CX);
      const half = 17 + (y - 51) * 1.7;
      if (d > half) continue;
      const shoulder = d > 15 && y < 62 && d > half - 9;
      const v = lit(x, y, CX, 70, 30, 22);
      if (shoulder) set(x, y, skin[Math.min(4, t5(v) + 1)], 1);
      else if (d > half - 2.2 || (d > 14.5 && d < 17 && y < 64)) set(x, y, kit.trim, 1);
      else {
        const base = tones5(kit.base);
        set(x, y, kit.base.toUpperCase() === '#FFFFFF' ? ['#FFFFFF', '#FFFFFF', '#F1F3F7', '#DCE0E8', '#C9CFDA'][t5(v)] : base[Math.min(4, t5(v) + 1)], 1);
      }
    }
  // neck, its shadow under the jaw, and the collar
  for (let y = 40; y < 60; y++)
    for (let x = 23; x < 41; x++) {
      const v = 52 - y > -6 + Math.abs(x + 0.5 - CX) * 0.9;
      if (y < 52 || (y - 52 < 6.6 - Math.abs(x + 0.5 - CX) * 0.9 && v)) set(x, y, skin[y < 47 ? 4 : x > CX + 4 ? 3 : 2], 2);
      else if (y - 52 < 9.2 - Math.abs(x + 0.5 - CX) * 0.9) set(x, y, kit.trim, 1);
    }
  // the number on the chest, double size, outlined in the trim
  const num = number < 0 ? '' : String(Math.min(99, number));
  const cells: [number, number][] = [];
  const nx0 = Math.round(CX - (num.length * 8 - 2) / 2);
  [...num].forEach((d, i) => {
    const bits = DIGITS[+d];
    for (let k = 0; k < 15; k++) if (bits[k] === '1') for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) cells.push([nx0 + i * 8 + (k % 3) * 2 + a, 61 + Math.floor(k / 3) * 2 + b]);
  });
  for (const [x, y] of cells) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (part[y + b]?.[x + a] === 1) set(x + a, y + b, kit.trim);
  for (const [x, y] of cells) set(x, y, kit.ink);

  // ---- ears and head ----
  for (const side of [-1, 1])
    for (let y = 27; y < 37; y++)
      for (let k = 0; k < 2; k++) {
        const x = Math.round(CX + side * (RX + 0.4 + k)) - (side < 0 ? 1 : 0);
        if (Math.abs(y - 31.5) > 4.6 - k * 1.6) continue;
        set(x, y, k === 0 && y > 29 && y < 34 ? skin[4] : skin[side < 0 ? 2 : 3], 3);
      }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (inHead(x, y)) set(x, y, skin[t5(lit(x, y))], 3);
  // cheekbones and the jaw catch a little shadow
  for (let y = 36; y < 46; y++)
    for (let x = 0; x < W; x++) if (inHead(x, y) && Math.abs(x + 0.5 - CX) > 9 && !inHead(x + (x < CX ? -1 : 1), y + 1)) set(x, y, skin[4]);

  // ---- hair on the head ----
  const crown = (x: number, y: number, depth: number) => inHead(x, y) && (y + 0.5 < CY - RY + depth || (Math.abs(x + 0.5 - CX) > RX - 2.6 && y + 0.5 < CY - 3));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = t5(lit(x, y));
      const strand = hair[Math.min(4, t + 1 + (noise(x, y) < 2 ? 1 : 0))];
      switch (look.hair) {
        case 'bald':
          if (inHead(x, y) && y > 13 && y < 18 && x > 23 && x < 28) set(x, y, mix(g[y][x], '#FFFFFF', 0.32));
          break;
        case 'buzz':
          if (crown(x, y, 9)) set(x, y, mix(skin[t], hair[2], 0.55 + (noise(x, y) < 3 ? 0.15 : 0)));
          break;
        case 'cornrows':
          if (crown(x, y, 10.5)) set(x, y, (x + Math.floor(y / 3)) % 4 < 2 ? hair[t > 2 ? 4 : 2] : hair[t > 2 ? 3 : 1], 4);
          break;
        case 'parted':
          if (crown(x, y, 11)) set(x, y, x === 25 || x === 26 ? skin[2] : strand, 4);
          if (inHead(x, y) && y < 22 && y > 12 && x > 26 && x < 38 && y + 0.5 < CY - RY + 13 - (x - 26) * 0.4) set(x, y, strand, 4);
          break;
        case 'flattop':
          if (crown(x, y, 10) || (y >= 3 && y < 14 && Math.abs(x + 0.5 - CX) < 12.4)) set(x, y, y === 3 ? hair[0] : x > CX + 5 ? hair[3] : hair[noise(x, y) < 2 ? 1 : 2], 4);
          break;
        case 'mop':
        case 'long':
        case 'mullet':
          if (crown(x, y, look.hair === 'mop' ? 14.5 : 11) || (look.hair === 'mop' && inHead(x, y) && y < 22 && Math.abs(x + 0.5 - CX) > 6 + (y - 14) * 0.2)) set(x, y, strand, 4);
          break;
        default:
          if (crown(x, y, 10.5)) set(x, y, strand, 4);
      }
    }
  if (look.hair === 'curly' || look.hair === 'twists')
    for (let x = 18; x < 47; x += 3)
      for (let k = 0; k < 4; k++) {
        const y = 9 + k + (x % 2);
        if (!part[y][x]) set(x, y, hair[k === 0 ? 1 : 2], 4);
        if (!part[y][x + 1]) set(x + 1, y, hair[3], 4);
      }

  // ---- the face ----
  const ey = 31;
  const browC = look.hair === 'bald' || look.hair === 'buzz' ? dark(skin[3], 0.45) : hair[2];
  const lid = dark(skin[3], 0.35);
  for (const [x0, iris] of [
    [21, 24],
    [36, 38],
  ]) {
    // an almond: the upper lid dark, two rows of white, the iris and pupil, a lit catchlight
    for (let x = x0 + 1; x < x0 + 6; x++) set(x, ey - 1, lid);
    for (let x = x0 + 1; x < x0 + 6; x++) {
      set(x, ey, '#ECE6DC');
      set(x, ey + 1, x === x0 + 1 || x === x0 + 5 ? skin[3] : '#D9D2C6');
    }
    set(x0, ey, lid);
    set(x0 + 6, ey, skin[3]);
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(iris + a, ey + b, '#3B2617');
    set(iris + 1, ey + 1, '#140C08');
    set(iris, ey, '#F4F1EA');
    for (let x = x0 + 1; x < x0 + 6; x++) set(x, ey + 2, skin[3]);
    // brows, thick at the inside end
    for (let k = 0; k < 8; k++) {
      const bx = x0 - 1 + k;
      const inner = x0 < CX ? k > 4 : k < 3;
      set(bx, ey - 4 - (k > 1 && k < 6 ? 1 : 0), browC);
      if (inner) set(bx, ey - 3 - (k > 1 && k < 6 ? 1 : 0), browC);
    }
  }
  if (look.gear.includes('unibrow')) for (let x = 21; x <= 43; x++) set(x, ey - 5, browC);
  // nose: a bridge in shade, a lit tip, nostrils
  for (let y = ey; y < ey + 7; y++) set(CX + 1, y, skin[3]);
  set(CX - 1, ey + 6, skin[0]);
  set(CX, ey + 6, skin[1]);
  for (const x of [CX - 4, CX - 3, CX + 2, CX + 3]) set(x, ey + 7, skin[4]);
  for (let x = CX - 3; x <= CX + 3; x++) set(x, ey + 8, skin[3]);
  // lips: a dark line, a lit lower lip
  const lip = mix(skin[3], '#9E3B3B', 0.3);
  for (let x = CX - 5; x <= CX + 5; x++) set(x, ey + 11, dark(lip, 0.45));
  for (let x = CX - 4; x <= CX + 4; x++) set(x, ey + 12, x < CX ? light(lip, 0.1) : lip);
  for (let x = CX - 3; x <= CX + 3; x++) set(x, ey + 10, lip);
  set(CX - 6, ey + 11, skin[4]);
  set(CX + 6, ey + 11, skin[4]);

  // ---- facial hair ----
  const fh = look.color === 'l' || look.color === 'r' ? hair[2] : hair[1];
  const fhd = look.color === 'l' || look.color === 'r' ? hair[3] : hair[0];
  const beardAt = (x: number, y: number) => inHead(x, y) && set(x, y, noise(x, y) < 3 ? fhd : fh);
  const stache = () => {
    for (let x = CX - 6; x <= CX + 6; x++) for (const y of [ey + 9, ey + 10]) if (!(y === ey + 10 && Math.abs(x - CX) < 2)) beardAt(x, y);
  };
  if (look.face === 'mustache' || look.face === 'goatee' || look.face === 'sideburns' || look.face === 'beard' || look.face === 'bigbeard') stache();
  if (look.face === 'goatee') for (let y = ey + 13; y <= ey + 17; y++) for (let x = CX - 4; x <= CX + 4; x++) beardAt(x, y);
  if (look.face === 'sideburns')
    for (let y = 22; y <= 38; y++)
      for (const x of [18, 19, 20, 44, 45, 46]) if (inHead(x, y)) beardAt(x, y);
  if (look.face === 'stubble') for (let y = ey + 6; y < H; y++) for (let x = 0; x < W; x++) if (inHead(x, y) && noise(x, y) < 3 && !(y >= ey + 10 && y <= ey + 12 && Math.abs(x - CX) < 6)) set(x, y, dark(g[y][x], 0.3));
  if (look.face === 'beard' || look.face === 'bigbeard') {
    for (let y = ey + 3; y < H; y++)
      for (let x = 0; x < W; x++) {
        const jaw = inHead(x, y) && (Math.abs(x + 0.5 - CX) > 9.5 || y >= ey + 13);
        if (jaw && !(y >= ey + 10 && y <= ey + 12 && Math.abs(x - CX) < 6)) beardAt(x, y);
      }
    if (look.face === 'bigbeard')
      for (let y = 44; y < 54; y++)
        for (let x = 0; x < W; x++)
          if (Math.abs(x + 0.5 - CX) < 13.5 - (y - 44) * 1.1) {
            set(x, y, noise(x, y) < 3 ? fhd : fh, 4);
          }
  }

  // ---- gear ----
  if (look.gear.includes('headband'))
    for (let x = 0; x < W; x++)
      for (const y of [18, 19, 20, 21]) if (inHead(x, y) || part[y][x] === 4) set(x, y, y === 18 ? '#FFFFFF' : y === 21 ? '#C9CFDA' : x < CX ? '#FFFFFF' : '#E8EBF0');
  if (look.gear.includes('goggles')) {
    for (let x = 18; x <= 46; x++) {
      set(x, ey - 3, OUT);
      set(x, ey + 3, OUT);
      if (x < 20 || x > 44) for (let y = ey - 2; y <= ey + 2; y++) set(x, y, OUT);
    }
    for (let y = ey - 2; y <= ey + 2; y++) for (const x of [31, 32, 33]) set(x, y, OUT);
    for (let y = ey - 2; y <= ey + 2; y++)
      for (let x = 20; x <= 44; x++) if (x < 31 || x > 33) set(x, y, mix(g[y][x], '#A9D6EA', 0.45));
    for (const x of [21, 22, 35, 36]) set(x, ey - 2, '#FFFFFF');
  }

  // ---- outline ----
  const out = g.map((r) => [...r]);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (part[y][x]) continue;
      const n = (xx: number, yy: number) => yy >= 0 && yy < H && xx >= 0 && xx < W && part[yy][xx];
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) out[y][x] = OUT;
    }
  return out;
}

export function BustArt({ name, kit, number, size = 48 }: { name: string; kit: Kit; number: number; size?: number }) {
  const paths = useMemo(() => toPaths(paintBust(legendLook(name) ?? fallback(name), kit, number)), [name, kit, number]);
  return (
    <svg className="art art-bust" width={(size * W) / H} height={size} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label={name}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
