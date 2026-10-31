// What's new (round 27; content/whatsNew.ts). Owner: "make what's new a pop up that covers part of
// the screen, and when the user closes it, they can still access it next to [the Intro] button".
// A panel down the right of the start page (a sheet from the foot on a phone) that opens by itself
// once after each update (store.ts, newsDue); the button beside Intro opens it again.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NEWS } from '../../content/whatsNew';
import { newsFresh, useStore } from '../../store';
import { Icon } from '../art/Icon';
import { sfx } from '../sound';

/** The button beside Intro, with a dot until the latest changes have been opened. */
export function WhatsNewButton() {
  const open = useStore((s) => s.news);
  const showNews = useStore((s) => s.showNews);
  const fresh = !open && newsFresh();
  return (
    <button
      className="icon-btn news-btn"
      data-tour="whats-new"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={fresh ? 'What’s new (not opened yet)' : undefined}
      onClick={() => {
        sfx('page');
        showNews();
      }}
    >
      What&rsquo;s new
      {fresh && <span className="news-dot" aria-hidden="true" />}
    </button>
  );
}

/** The panel itself. */
export function WhatsNewPanel() {
  const open = useStore((s) => s.news);
  const endNews = useStore((s) => s.endNews);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const latest = NEWS[0];

  // closing hands the focus back to the button beside Intro
  const close = () => {
    endNews();
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-tour="whats-new"]')?.focus());
  };
  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    // Escape closes it; Tab stays on its one control while it is up
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        close();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        closeBtn.current?.focus();
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="news-scrim" onClick={(e) => e.target === e.currentTarget && close()}>
      <aside className="news-panel" role="dialog" aria-modal="true" aria-labelledby="news-title">
        <header className="news-head">
          <Icon name="news" size={36} />
          <div style={{ minWidth: 0 }}>
            <div className="kicker">{latest.date}</div>
            <h2 className="title" id="news-title">
              What&rsquo;s new
            </h2>
          </div>
          <div className="spacer" />
          <button ref={closeBtn} className="btn small ghost" onClick={close}>
            Close
          </button>
        </header>
        <ul className="news-list big">
          {latest.items.map((x) => (
            <li key={x.text}>
              <Icon name={x.icon} size={28} />
              <span>{x.text}</span>
            </li>
          ))}
        </ul>
        <p className="small muted news-foot">To see this again, press What&rsquo;s new next to Intro at the top of the start page.</p>
      </aside>
    </div>,
    document.body,
  );
}
