// The way out of the tutorial (round 33, owner: "there's a skip button, where the user can insert the
// code to skip it. this allows old users to skip"). Round 34 (owner: "put the skip the tutorial door
// on the top next to share instead of the bottom"): a button just before Share in every top bar
// while the tutorial is on; it opens a small pop-up for the exit code (the graduation page shows it).

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { inTutorial } from '../road';
import { Icon } from '../art/Icon';
import { PixelX } from '../art/PixelX';
import { sfx } from '../sound';

function SkipPanel({ onClose }: { onClose: () => void }) {
  const skip = useStore((s) => s.skipTutorial);
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    field.current?.focus();
    // Escape closes it before the page's own Escape
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('keydown', key, true);
      back?.focus?.();
    };
  }, [onClose]);
  return createPortal(
    <div className="hall-pop share-pop" role="dialog" aria-modal="true" aria-label="Skip the tutorial" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="share-card">
        <button className="pop-x" aria-label="Close" onClick={onClose}>
          <PixelX />
        </button>
        <div className="share-head">
          <Icon name="door" size={34} />
          <div style={{ minWidth: 0 }}>
            <div className="sec-title">Skip the tutorial</div>
            <p className="small muted">Played before? Enter the exit code and the full game opens at once. You get the code when you finish the tutorial.</p>
          </div>
        </div>
        <form
          className="share-link"
          onSubmit={(e) => {
            e.preventDefault();
            // a right code frees the device and this pop-up goes with the tutorial
            setWrong(!skip(code));
          }}
        >
          <input ref={field} type="text" aria-label="Exit code" placeholder="Exit code" value={code} onChange={(e) => (setCode(e.target.value), setWrong(false))} autoComplete="off" autoCapitalize="off" spellCheck={false} />
          <button className="btn small" disabled={!code.trim()}>
            Skip
          </button>
        </form>
        <p className="small keep share-said" aria-live="polite" style={wrong ? { color: 'var(--bad)' } : undefined}>
          {wrong ? 'That is not the code.' : ' '}
        </p>
      </div>
    </div>,
    document.body,
  );
}

/** Beside Share in a top bar, while the tutorial is on (the word hides on a phone, as Share's does). */
export function SkipButton() {
  const on = useStore((s) => inTutorial(s.road));
  const [open, setOpen] = useState(false);
  if (!on) return null;
  return (
    <>
      <button className="icon-btn share-btn skip-btn" data-tour="skip-door" aria-haspopup="dialog" aria-expanded={open} aria-label="Skip the tutorial" onClick={() => (sfx('page'), setOpen(true))}>
        <Icon name="door" size={18} />
        <span className="share-word">Skip tutorial</span>
      </button>
      {open && <SkipPanel onClose={() => setOpen(false)} />}
    </>
  );
}
