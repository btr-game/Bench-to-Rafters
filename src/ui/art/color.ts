// Shared helpers for the procedural artwork (round 17): a string hash for stable per-name
// choices, and colour math so art can tint itself from team.color.

export { hash } from '../../content/looks';

const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));

export function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0x2a2f36;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix a colour toward another: t = 0 keeps it, 1 gives the other. */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return `#${x
    .map((v, i) =>
      clamp(v + (y[i] - v) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

export const shade = (hex: string, t: number) => mix(hex, '#000000', t);
export const tint = (hex: string, t: number) => mix(hex, '#ffffff', t);

/** Readable ink on a colour: near-black on light colours, white on dark ones. */
export function ink(hex: string): string {
  const [r, g, b] = rgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? '#14161A' : '#FFFFFF';
}
