// A paper scroll in chunky pixels (round 33): the road map's bucket list (owner: "can you give the
// bucket list a more paper vibe?", then "make it more roughly pixellated. less pixels"), and the
// diploma on the graduation page. Its colours are its own, in both themes, like any drawn object.

/** A box on the bucket list, ticked in red ink once that goal is done: a 6 by 6 grid of big pixels. */
export function Tick({ on }: { on: boolean }) {
  return (
    <svg className="bucket-box" viewBox="0 0 6 6" width={24} height={24} shapeRendering="crispEdges" aria-hidden="true">
      <rect x={0} y={0} width={6} height={6} fill={INK.ink} />
      <rect x={1} y={1} width={4} height={4} fill={INK.light} />
      {on && (
        <g fill={INK.red}>
          <rect x={1} y={3} width={1} height={1} />
          <rect x={2} y={4} width={1} height={1} />
          <rect x={3} y={3} width={1} height={1} />
          <rect x={4} y={2} width={1} height={1} />
          <rect x={5} y={0} width={1} height={2} />
        </g>
      )}
    </svg>
  );
}

// The bucket list as an old paper scroll (owner: "can you give the bucket list a more paper vibe?",
// with a picture of a parchment rolled at both ends on wooden rods; then "make it more roughly
// pixellated. less pixels"): chunky pixel art, every pixel four screen pixels wide: the rolls and
// their knobs, the paper with specks and stains, ragged steps along its sides.
const INK = { ink: '#3A2716', faded: '#6B5236', red: '#9B2C1A', light: '#F3E6C6' };
const WOOD: Record<string, string> = { O: '#3B2414', T: '#9A6A3A', t: '#6E4826', L: '#C99A62' };
/** A knob at the end of a roll, and the stub of its rod (drawn for the left end; the right is mirrored). */
const KNOB = ['.OO...', 'OLTO..', 'OTTOOO', 'OTTOLL', 'OTTOtt', 'OTTOOO', 'OTtO..', '.OO...'];

function Knob({ flip = false }: { flip?: boolean }) {
  return (
    <svg className="scroll-knob" viewBox="0 0 6 8" width={24} height={32} shapeRendering="crispEdges" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      {KNOB.flatMap((row, y) => [...row].map((c, x) => (WOOD[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={WOOD[c]} /> : null)))}
    </svg>
  );
}

/** One roll of the scroll: a knob, the rolled paper, a knob. */
export function Roll() {
  return (
    <div className="scroll-roll" aria-hidden="true">
      <Knob />
      <span className="scroll-cyl" />
      <Knob flip />
    </div>
  );
}
