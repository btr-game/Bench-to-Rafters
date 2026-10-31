import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Timing } from '../../engine/mini/streetball';
import { clamp } from '../../engine/rng';
import { sfx } from '../sound';

// The timing meter (round 24, streetball; round 25: shared with the last possession of a playable
// playoff game, where the timing decides the shot).

/** The timing meter for a drive or a pull-up: tap while the marker is in the green. The green
 * grows with the rating the shot uses (finishing or shooting). */
export function TimingMeter({ skill, label, onTap }: { skill: number; label: string; onTap: (t: Timing) => void }) {
  const zone = clamp(0.1 + skill * 0.0016, 0.14, 0.27);
  const centre = useMemo(() => 0.3 + Math.random() * 0.4, []);
  const pos = useRef(0);
  const dir = useRef(1);
  const bar = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const tap = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const d = Math.abs(pos.current - centre);
    const t: Timing = d <= zone * 0.18 ? 'perfect' : d <= zone / 2 ? 'good' : 'late';
    sfx(t === 'perfect' ? 'perfect' : t === 'good' ? 'confirm' : 'nope');
    onTap(t);
  }, [centre, zone, onTap]);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const speed = 1 / 780; // a full sweep in under a second
    const step = (now: number) => {
      const dt = Math.min(40, now - (last || now));
      last = now;
      pos.current += dir.current * dt * speed;
      if (pos.current >= 1) (pos.current = 1), (dir.current = -1);
      if (pos.current <= 0) (pos.current = 0), (dir.current = 1);
      if (bar.current) bar.current.style.left = `${pos.current * 100}%`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', key);
    };
  }, [tap]);
  return (
    <div className="sb-meter-wrap">
      <div className="sb-meter" onClick={tap}>
        <span className="sb-green" style={{ left: `${(centre - zone / 2) * 100}%`, width: `${zone * 100}%` }}>
          <i style={{ left: '41%', width: '18%' }} />
        </span>
        <div ref={bar} className="sb-marker" />
      </div>
      <button className="btn" onClick={tap}>
        {label} <span className="kbd">Space</span>
      </button>
    </div>
  );
}
