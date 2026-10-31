// The What's new card on the start page and its pop-up (round 27; content/whatsNew.ts).

import { useEffect, useState } from 'react';
import { NEWS } from '../../content/whatsNew';
import { Icon } from '../art/Icon';
import { sfx } from '../sound';

const KEY = 'btr-news-seen';
const seenId = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export function WhatsNewCard() {
  const latest = NEWS[0];
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(() => seenId() !== latest.id);
  const show = () => {
    setOpen(true);
    sfx('page');
    if (fresh) {
      setFresh(false);
      try {
        localStorage.setItem(KEY, latest.id);
      } catch {
        /* the dot comes back next visit; nothing else is lost */
      }
    }
  };
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open]);
  return (
    <section className="card stack news-card" data-tour="whats-new">
      <div className="sec-title with-icon">
        <Icon name="news" size={28} />
        What&rsquo;s new
        {fresh && <span className="news-dot" aria-label="New" />}
      </div>
      <ul className="news-list">
        {latest.items.slice(0, 3).map((x) => (
          <li key={x.text}>
            <Icon name={x.icon} size={22} />
            <span>{x.text}</span>
          </li>
        ))}
      </ul>
      <button className="btn ghost" onClick={show}>
        See all {latest.items.length} changes
      </button>
      {open && (
        <div className="news-pop" role="dialog" aria-modal="true" aria-label="What's new" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="news-pop-card">
            <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div className="kicker">{latest.date}</div>
                <h2 className="title">What&rsquo;s new</h2>
              </div>
              <div className="spacer" />
              <button className="btn small ghost" onClick={() => setOpen(false)} autoFocus>
                Close
              </button>
            </div>
            <ul className="news-list big">
              {latest.items.map((x) => (
                <li key={x.text}>
                  <Icon name={x.icon} size={28} />
                  <span>{x.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
