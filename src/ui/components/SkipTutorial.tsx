// The way out of the tutorial (round 33, owner: "there's a skip button, where the user can insert the
// code to skip it. this allows old users to skip"). Round 34 (owner: "put the skip the tutorial door
// on the top next to share instead of the bottom"): a button just before Share in every top bar
// while the tutorial is on; it opens a small pop-up for the exit code (the graduation page shows it).
// Round 35 (owner: "the skip button of the tutorial doesnt appear. let users skip mid tutorial if
// possible"): the lessons shade the whole page but for one control, top bar included, so the button
// was dimmed and could not be pressed for almost the whole tutorial. The lesson layer now carries a
// Skip tutorial button of its own, fixed to a corner above the shade, and the pop-up opens above
// the lesson too (its field types even while a lesson to read holds the keys).
// After round 41 (owner: "if the user enters the master code, they unlock everything without having
// to complete the tutorial and main game. add the unlock button to every locked component"): an
// Unlock button beside every lock opens the same pop-up for the master code, and the tutorial's
// pop-up takes the master code too.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { inTutorial } from '../road';
import { Icon } from '../art/Icon';
import { PixelX } from '../art/PixelX';
import { sfx } from '../sound';
import { t } from '../../i18n';

interface Ask {
  icon: string;
  title: string;
  text: string;
  label: string;
  go: string;
  /** true when the code was right (the pop-up goes with what it opened) */
  act: (code: string) => boolean;
}

function CodePanel({ ask, onClose }: { ask: Ask; onClose: () => void }) {
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
    <div className="hall-pop share-pop skip-pop" data-lesson-free role="dialog" aria-modal="true" aria-label={ask.title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="share-card">
        <button className="pop-x" aria-label={t('Close')} onClick={onClose}>
          <PixelX />
        </button>
        <div className="share-head">
          <Icon name={ask.icon} size={34} />
          <div style={{ minWidth: 0 }}>
            <div className="sec-title">{ask.title}</div>
            <p className="small muted">{ask.text}</p>
          </div>
        </div>
        <form
          className="share-link"
          onSubmit={(e) => {
            e.preventDefault();
            const ok = ask.act(code);
            setWrong(!ok);
            if (ok) onClose();
          }}
        >
          <input ref={field} type="text" aria-label={ask.label} placeholder={ask.label} value={code} onChange={(e) => (setCode(e.target.value), setWrong(false))} autoComplete="off" autoCapitalize="off" spellCheck={false} />
          <button className="btn small" disabled={!code.trim()}>
            {ask.go}
          </button>
        </form>
        <p className="small keep share-said" aria-live="polite" style={wrong ? { color: 'var(--bad)' } : undefined}>
          {wrong ? t('That is not the code.') : ' '}
        </p>
      </div>
    </div>,
    document.body,
  );
}

/** Beside Share in a top bar, while the tutorial is on (the word hides on a phone, as Share's does).
 * `float` is the lesson layer's own (round 35), fixed to a corner above the shade; while a lesson
 * is up the top bar's steps aside for it. */
export function SkipButton({ float, style }: { float?: boolean; style?: CSSProperties }) {
  const on = useStore((s) => inTutorial(s.road) && (!!float || !s.lessonUp));
  const [open, setOpen] = useState(false);
  if (!on) return null;
  return (
    <>
      <button className={`icon-btn share-btn skip-btn${float ? ' skip-float' : ''}`} style={style} data-lesson-free={float || undefined} data-tour={float ? undefined : 'skip-door'} aria-haspopup="dialog" aria-expanded={open} aria-label={t('Skip the tutorial')} onClick={() => (sfx('page'), setOpen(true))}>
        <Icon name="door" size={18} />
        <span className="share-word">{t('Skip tutorial')}</span>
      </button>
      {open && (
        <CodePanel
          ask={{
            icon: 'door',
            title: t('Skip the tutorial'),
            text: t('Played before? Enter the exit code and the full game opens at once. You get the code when you finish the tutorial.'),
            label: t('Exit code'),
            go: t('Skip'),
            act: useStore.getState().skipTutorial,
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** Beside a lock (a difficulty, the mini-games, a road map stop, Sim mode): the master code opens
 * everything at once. */
export function UnlockButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn ghost small with-icon" aria-haspopup="dialog" aria-expanded={open} aria-label={t('Unlock with the master code')} onClick={() => (sfx('page'), setOpen(true))}>
        <Icon name="unlock" size={18} />
        {t('Unlock')}
      </button>
      {open && (
        <CodePanel
          ask={{
            icon: 'unlock',
            title: t('Unlock everything'),
            text: t('Have the master code? Enter it and the whole game opens at once: the tutorial, every level, difficulty and mini-game, and Sim mode.'),
            label: t('Master code'),
            go: t('Unlock'),
            act: useStore.getState().masterUnlock,
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
