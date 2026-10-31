// The feedback inbox (round 26, owner: only for the devs, in the dev deck instead of the Community
// page). On the claude.ai page it reads what players sent from the game; the page's rules let only
// its owner and editors read other people's messages. Players who cannot post there leave a comment
// on the page instead, which the claude.ai comments panel shows. On the website (owner: "the send
// feedback option isnt really runnin": the notes arrived, but nothing showed them) it reads the
// website's database, for whoever enters the inbox key; the key is kept on this device.

import { useEffect, useState, type FormEvent } from 'react';
import { onlineBuild, readInbox, readWebInbox, type FeedbackRow } from '../ui/community';
import { Icon } from '../ui/art/Icon';

const KEY = 'btr-inbox-key';
const keptKey = (): string => {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
};

function Messages({ rows }: { rows: FeedbackRow[] }) {
  if (rows.length === 0)
    return (
      <p className="muted with-icon">
        <Icon name="inbox" size={34} />
        No messages yet.
      </p>
    );
  return (
    <>
      {rows.map((r, i) => (
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
      ))}
    </>
  );
}

/** The website's inbox: the key once, then the notes, newest first. */
function WebInbox() {
  const [key, setKey] = useState(keptKey);
  const [typed, setTyped] = useState('');
  const [box, setBox] = useState<FeedbackRow[] | 'denied' | 'error' | null>(null);
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    if (!key) return;
    let live = true;
    setBox(null);
    void readWebInbox(key).then((b) => {
      if (!live) return;
      setBox(b);
      if (b === 'denied') {
        // a wrong key is not worth keeping
        try {
          localStorage.removeItem(KEY);
        } catch {
          // nothing kept
        }
        setKey('');
      }
    });
    return () => {
      live = false;
    };
  }, [key, turn]);
  const open = (e: FormEvent) => {
    e.preventDefault();
    const k = typed.trim();
    try {
      localStorage.setItem(KEY, k);
    } catch {
      // kept for this visit only
    }
    setTyped('');
    setKey(k);
  };
  const forget = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nothing kept
    }
    setKey('');
    setBox(null);
  };
  if (!key)
    return (
      <form className="stack" style={{ gap: 8 }} onSubmit={open}>
        <p className="small muted">Notes players sent from the website. Enter the inbox key to read them; this device remembers it.</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input type="password" aria-label="Inbox key" placeholder="Inbox key" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          <button className="btn small" disabled={typed.trim().length < 24}>
            Open the inbox
          </button>
        </div>
        {box === 'denied' && <span className="small" style={{ color: 'var(--bad)' }}>That key does not open the inbox.</span>}
      </form>
    );
  return (
    <div className="stack">
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <p className="small muted" style={{ flex: '1 1 220px', margin: 0 }}>
          Notes players sent from the website, newest first.
        </p>
        <button className="btn small ghost" onClick={() => setTurn((n) => n + 1)}>
          Refresh
        </button>
        <button className="btn small ghost" onClick={forget}>
          Forget the key here
        </button>
      </div>
      {box === null ? (
        <p className="muted">Loading…</p>
      ) : box === 'error' || box === 'denied' ? (
        <p className="small" style={{ color: 'var(--bad)' }}>
          The inbox could not be reached. Try Refresh in a moment.
        </p>
      ) : (
        <Messages rows={box} />
      )}
    </div>
  );
}

export function Inbox() {
  const web = onlineBuild();
  const [box, setBox] = useState<{ rows: FeedbackRow[]; where: 'shared' | 'device' } | null>(null);
  useEffect(() => {
    if (web) return;
    let live = true;
    void readInbox().then((b) => live && setBox(b));
    return () => {
      live = false;
    };
  }, [web]);
  return (
    <section className="stack dk-inbox">
      <div>
        <h2 className="sec-title with-icon">
          <Icon name="inbox" size={30} />
          Feedback inbox
        </h2>
        {!web && (
          <p className="small muted">
            {box?.where === 'device'
              ? 'This copy is not connected to the game’s page on claude.ai, so these are the notes kept on this device.'
              : 'Messages sent from the game on its claude.ai page. Players who cannot post there leave a comment on the page instead: see the page’s comments panel.'}
          </p>
        )}
      </div>
      {web ? <WebInbox /> : box === null ? <p className="muted">Loading…</p> : <Messages rows={box.rows} />}
    </section>
  );
}
