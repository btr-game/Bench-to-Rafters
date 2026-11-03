// Round 35: reunion night's banquet, in pixels (square cells, hard edges, no gradients): the class
// at a long table under a string of lights, the trophy in the middle. `seats` sets how many of the
// class are there; `lit` (the night under way) lights the bulbs and raises the trophy.

const W = 96;
const H = 36;
const SKIN = ['#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#5c3a1e', '#a86b3c'];
const SHIRT = ['#2b4c9b', '#a3302b', '#1f6f43', '#6b3fa0', '#c77d14', '#1d6f7a'];

export function ReunionArt({ seats = 6, lit = false }: { seats?: number; lit?: boolean }) {
  const n = Math.max(2, Math.min(12, seats));
  const r = (x: number, y: number, w: number, h: number, fill: string, key?: string) => <rect key={key ?? `${x}-${y}-${fill}`} x={x} y={y} width={w} height={h} fill={fill} />;
  const cells: JSX.Element[] = [];
  // the hall: a dark wall, wood panels, the floor
  cells.push(r(0, 0, W, 26, '#1b1f2e', 'wall'), r(0, 18, W, 8, '#2a2233', 'panel'), r(0, 26, W, 10, '#3b2a1c', 'floor'));
  for (let x = 0; x < W; x += 12) cells.push(r(x, 18, 1, 8, '#1b1f2e', `seam${x}`));
  // the string of lights, sagging between three hooks
  for (let x = 2; x < W - 1; x += 4) {
    const sag = Math.round(3 * Math.sin((Math.PI * ((x - 2) % 46)) / 46));
    cells.push(r(x, 2 + sag, 3, 1, '#4a4a4a', `wire${x}`));
    const bulb = lit ? ((x / 4) % 2 ? '#ffd166' : '#ff9f43') : '#6b6b55';
    cells.push(r(x + 1, 3 + sag, 1, 2, bulb, `bulb${x}`));
  }
  // the class behind the table, spread along it
  const span = 72;
  const left = (W - span) / 2;
  for (let i = 0; i < n; i++) {
    const x = Math.round(left + ((i + 0.5) * span) / n) - 2;
    cells.push(r(x, 10, 4, 4, SKIN[i % SKIN.length], `head${i}`), r(x, 10, 4, 1, '#20160f', `hair${i}`), r(x - 1, 14, 6, 6, SHIRT[i % SHIRT.length], `body${i}`));
  }
  // the long table, its cloth, the glasses
  cells.push(r(8, 19, 80, 2, '#f2efe6', 'cloth'), r(8, 21, 80, 3, '#d9d4c4', 'cloth2'), r(10, 24, 2, 4, '#5a3d24', 'legL'), r(84, 24, 2, 4, '#5a3d24', 'legR'));
  for (let i = 0; i < n; i++) {
    const x = Math.round(left + ((i + 0.5) * span) / n) + 2;
    cells.push(r(x, 17, 1, 2, '#bfe3f2', `glass${i}`));
  }
  // the trophy in the middle, raised when the night starts
  const ty = lit ? 9 : 12;
  cells.push(r(45, ty, 6, 4, '#e2b007', 'cup'), r(44, ty, 1, 2, '#e2b007', 'hl'), r(51, ty, 1, 2, '#e2b007', 'hr'), r(47, ty + 4, 2, 2, '#b8860b', 'stem'), r(45, ty + 6, 6, 1, '#8a6508', 'base'), r(46, ty + 1, 1, 1, '#fff2b0', 'shine'));
  return (
    <svg className="reunion-art" viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label="The class at a long table under a string of lights, the trophy in the middle">
      {cells}
    </svg>
  );
}
