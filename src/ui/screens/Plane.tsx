// The plane to the main land (round 37): after graduation, a flight of about five seconds from the
// road map's island over the sea to the main land, in steps of twelve frames a second. Skip (or
// Enter, or Escape) lands at once. It plays once on a device and never with reduced motion
// (ui/mainland.ts, planeDue); the dev deck always shows it, as a still with reduced motion.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FlightArt } from '../art/FlightArt';
import { FLIGHT_FPS, FLIGHT_SECS, flightAt, reducedMotion } from '../mainland';

const FRAMES = FLIGHT_SECS * FLIGHT_FPS;
const SAY = {
  away: ['Leaving the road map', 'Wheels up'],
  sea: ['Over the sea', 'To the main land'],
  land: ['Coming in to land', 'The main land'],
} as const;

export function PlaneFlight({ onDone }: { onDone: () => void }) {
  const [still] = useState(reducedMotion);
  const [tall] = useState(() => innerWidth < innerHeight);
  const [frame, setFrame] = useState(still ? FRAMES / 2 : 0);
  const skip = useRef<HTMLButtonElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (still) return;
    // the plane rolls to a stop on the main land's runway, then the page is the main land
    const t = frame >= FRAMES ? setTimeout(() => done.current(), 600) : setTimeout(() => setFrame((f) => f + 1), 1000 / FLIGHT_FPS);
    return () => clearTimeout(t);
  }, [frame, still]);
  useEffect(() => {
    skip.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Enter') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      done.current();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, []);
  const [kicker, line] = SAY[flightAt(frame / FRAMES).leg];
  return createPortal(
    <div className="plane-flight" role="dialog" aria-modal="true" aria-label="The flight to the main land">
      <FlightArt p={frame / FRAMES} tall={tall} label="A plane flies from the road map’s island over the sea to the main land" />
      <div className="pl-caption" aria-live="polite">
        <span>{kicker}</span>
        <b>{line}</b>
      </div>
      <button ref={skip} className="btn pl-skip" data-skip onClick={() => done.current()}>
        {still ? 'Land' : 'Skip'}
      </button>
    </div>,
    document.body,
  );
}
