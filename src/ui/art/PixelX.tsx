// The close mark of the pop-ups (the community's career cards, Share the game): a 7x7 pixel X.

export function PixelX() {
  return (
    <svg viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].flatMap((i) => [<rect key={`a${i}`} x={i} y={i} width={1} height={1} fill="currentColor" />, <rect key={`b${i}`} x={6 - i} y={i} width={1} height={1} fill="currentColor" />])}
    </svg>
  );
}
