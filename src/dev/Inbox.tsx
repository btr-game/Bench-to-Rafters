// The feedback inbox (round 26, owner: only for the devs, in the dev deck instead of the Community
// page). On the claude.ai page it reads what players sent from the game; the page's rules let only
// its owner and editors read other people's messages. Players who cannot post there leave a comment
// on the page instead, which the claude.ai comments panel shows.

import { useEffect, useState } from 'react';
import { readInbox, type FeedbackRow } from '../ui/community';
import { Icon } from '../ui/art/Icon';

export function Inbox() {
  const [box, setBox] = useState<{ rows: FeedbackRow[]; where: 'shared' | 'device' } | null>(null);
  useEffect(() => {
    let live = true;
    void readInbox().then((b) => live && setBox(b));
    return () => {
      live = false;
    };
  }, []);
  return (
    <section className="stack dk-inbox">
      <div>
        <h2 className="sec-title with-icon">
          <Icon name="inbox" size={30} />
          Feedback inbox
        </h2>
        <p className="small muted">
          {box?.where === 'device'
            ? 'This copy is not connected to the game’s page on claude.ai, so these are the notes kept on this device.'
            : 'Messages sent from the game on its claude.ai page. Players who cannot post there leave a comment on the page instead: see the page’s comments panel.'}
        </p>
      </div>
      {box === null ? (
        <p className="muted">Loading…</p>
      ) : box.rows.length === 0 ? (
        <p className="muted with-icon">
          <Icon name="inbox" size={34} />
          No messages yet.
        </p>
      ) : (
        box.rows.map((r, i) => (
          <article key={i} className="card stack inbox-msg">
            <div className="kicker">
              {new Date(r.at).toLocaleString()}
              {r.player ? ` · playing ${r.player}` : ''}
            </div>
            <p className="prose" style={{ whiteSpace: 'pre-wrap' }}>
              {r.text}
            </p>
            {r.contact && <p className="small">Reply to: {r.contact}</p>}
          </article>
        ))
      )}
    </section>
  );
}
