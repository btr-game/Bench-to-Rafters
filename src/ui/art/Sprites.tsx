// The little things that move on the maps (round 33's road map, round 37's main land and the
// flight between them): his car, the boat to the island and the airliner, each a few rows of
// letters, one square pixel a letter.

/** A small sprite from rows of letters (each a colour; '.' or a missing colour is clear), flipped to face left. */
export function Sprite({ rows, x, y, colors, flip = false }: { rows: string[]; x: number; y: number; colors: Record<string, string>; flip?: boolean }) {
  const w = rows[0].length;
  return (
    <g transform={`translate(${x},${y})${flip ? ` translate(${w},0) scale(-1,1)` : ''}`}>
      {rows.flatMap((row, j) => [...row].map((ch, i) => (colors[ch] ? <rect key={`${i}-${j}`} x={i} y={j} width={1} height={1} fill={colors[ch]} /> : null)))}
    </g>
  );
}

/** His car, facing right: hair, skin and glass up top, the body, the headlight and the tyres. */
export const CAR = ['...hh....', '..gssg...', '.RRRRRRR.', 'RRRRRRRRY', 'RRRRRRRRR', '.OO...OO.'];
/** The boat, with him aboard (h and s) once it sails. */
export const BOAT = ['....S.....', '....SS....', '....SSS...', '..hhSSSS..', '..ss.S....', 'TTTTTTTTTT', '.TTTTTTTT.'];

/** The airliner, side on, facing right: 20 by 7. */
export const PLANE = [
  '..TT................',
  '..TTT...............',
  '..TTTWWWWWWWWWWWW...',
  '.WWWWgWgWgWgWgWWWgg.',
  '.WWWWWWWWWWWWWWWWWWW',
  '..ssssssssssssssss..',
  '.......DDDDDD.......',
];
export const PLANE_COLORS = { T: '#1C7ED6', W: '#F8F9FA', g: '#4DABF7', s: '#1C7ED6', D: '#868E96' };
