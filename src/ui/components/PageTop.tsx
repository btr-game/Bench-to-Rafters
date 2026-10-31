import { useEffect } from 'react';
import { useStore } from '../../store';

// The top of a page of its own (round 27, navigation): the way back on the left, saying where it
// goes; where you are; the game's name on the right. Escape goes back too, unless a dialog, the
// settings menu or a guide tip is open (they take Escape first).

export function PageTop({ trail, back, backLabel, extra }: { trail: string[]; back: () => void; backLabel?: string; extra?: React.ReactNode }) {
  const career = useStore((s) => !!s.game);
  const label = backLabel ?? (career ? 'Back to the career' : 'Back to the start');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[role="dialog"], .set-menu, .tour-tip')) return;
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      e.preventDefault();
      back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back]);
  return (
    <header className="top page-top">
      <button className="btn ghost back-btn" onClick={back} title={`${label} (Esc)`}>
        <span aria-hidden="true">←</span> {label}
      </button>
      <nav className="crumbs" aria-label="You are here">
        {[career ? 'Career' : 'Start', ...trail].map((t, i, all) => (
          <span key={t} aria-current={i === all.length - 1 ? 'page' : undefined}>
            {t}
          </span>
        ))}
      </nav>
      <div className="top-right">
        {extra}
        <div className="brand">
          Bench to <span>Rafters</span>
        </div>
      </div>
    </header>
  );
}
