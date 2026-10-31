// Words in a 5 by 7 pixel font (round 27, owner: "for every graphic you make, make them
// pixelated"): the intro's and the thank-you page's titles. Each letter has a dark drop shadow one
// pixel down and right.

import { useMemo } from 'react';

const GLYPH: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

export function PixelWord({ text, color, shade, className = 'in-word' }: { text: string; color: string; shade: string; className?: string }) {
  const w = text.length * 6 - 1;
  const px = useMemo(() => {
    const out: [number, number][] = [];
    [...text.toUpperCase()].forEach((ch, i) => (GLYPH[ch] ?? GLYPH[' ']).forEach((row, y) => [...row].forEach((c, x) => c === '#' && out.push([i * 6 + x, y]))));
    return out;
  }, [text]);
  return (
    <svg className={className} viewBox={`0 0 ${w + 1} 8`} shapeRendering="crispEdges" role="img" aria-label={text}>
      {px.map(([x, y]) => (
        <rect key={`s${x}-${y}`} x={x + 1} y={y + 1} width={1} height={1} fill={shade} />
      ))}
      {px.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}
