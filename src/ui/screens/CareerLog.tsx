// The career log (round 24): the career cards of the last five finished careers, on this device.

import { useEffect, useState } from 'react';
import type { CareerRecord } from '../../engine/career/record';
import { MODES } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import { useStore } from '../../store';
import { LOG_MAX, LOG_WARN, deleteCard, logCards } from '../careerLog';
import { canShareFiles, downloadCareerCard, drawCareerCard, shareCareerCard } from '../share';
import { PlayerArt } from '../art/Player';
import { Icon } from '../art/Icon';

/** Download (and on phones, share) the career card. */
export function CardActions({ rec }: { rec: CareerRecord }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const run = async (share: boolean) => {
    setBusy(true);
    setMsg('');
    try {
      if (share && (await shareCareerCard(rec))) setMsg('');
      else setMsg(await downloadCareerCard(rec));
    } catch {
      setMsg('Could not make the image in this browser.');
    }
    setBusy(false);
  };
  return (
    <>
      <button className="btn" data-tour="card-download" disabled={busy} onClick={() => run(false)}>
        Download career card
      </button>
      {canShareFiles() && (
        <button className="btn ghost" disabled={busy} onClick={() => run(true)}>
          Share
        </button>
      )}
      {msg && <span className="small muted">{msg}</span>}
    </>
  );
}

/** How full the log is, in words: a warning from four cards. */
function fullness(n: number, oldest: CareerRecord | undefined): string | null {
  if (n < LOG_WARN || !oldest) return null;
  return n >= LOG_MAX
    ? `The log is full (${LOG_MAX} of ${LOG_MAX}). The next career you finish replaces the oldest card: ${oldest.name}.`
    : `${n} of ${LOG_MAX} cards. One more and the log is full; after that each new career replaces the oldest card (${oldest.name}).`;
}

/** The note on the retirement page: the card went into the log (and which one it pushed out). */
export function LoggedNote() {
  const logged = useStore((s) => s.logged);
  const setPage = useStore((s) => s.setPage);
  if (!logged?.added) return null;
  const cards = logCards();
  const warn = fullness(cards.length, cards[cards.length - 1]);
  return (
    <div className="log-note">
      <Icon name="cards" size={22} />
      <span>
        Career card saved to your log{logged.dropped ? `, replacing the oldest (${logged.dropped.name})` : ''}. {warn && !logged.dropped ? warn : ''}
      </span>
      <button className="btn ghost small" onClick={() => setPage('log')}>
        Open the log
      </button>
    </div>
  );
}

/** The entry on the start page. */
export function CareerLogCard() {
  const setPage = useStore((s) => s.setPage);
  const [n] = useState(() => logCards().length);
  return (
    <section className="card stack">
      <div className="sec-title with-icon">
        <Icon name="cards" size={28} />
        Career log
      </div>
      <p className="small muted">The career cards of your last {LOG_MAX} finished careers, kept on this device. {n ? `${n} saved.` : 'Finish a career to start it.'}</p>
      <button className="btn ghost" data-tour="log" onClick={() => setPage('log')}>
        Open the career log
      </button>
    </section>
  );
}

function LogEntry({ rec, onDelete }: { rec: CareerRecord; onDelete: () => void }) {
  const [img, setImg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!open || img) return;
    let live = true;
    drawCareerCard(rec)
      .then((c) => live && setImg(c.toDataURL('image/png')))
      .catch(() => live && setImg(''));
    return () => {
      live = false;
    };
  }, [open, img, rec]);
  const when = new Date(rec.savedAt);
  return (
    <article className="card log-entry">
      <div className="log-head">
        <PlayerArt name={rec.name} number={rec.number} pos={rec.pos} color={rec.team?.color} team={rec.team?.name ?? ''} size={84} />
        <div className="log-who">
          <div className="kicker">
            {MODES[rec.mode].name} · {when.toLocaleDateString()}
          </div>
          <b className="log-name">{rec.name}</b>
          <div className="small">
            {NAMES.pos[rec.pos]} · {rec.role} · retired at {rec.retiredAt}
          </div>
          <div className="small muted">{rec.tier}</div>
        </div>
        <div className="log-nums">
          <div>
            <b>{Math.round(rec.peak)}</b>
            <small>peak</small>
          </div>
          <div>
            <b>{rec.legacy}</b>
            <small>legacy</small>
          </div>
        </div>
      </div>
      {open && (img === null ? <p className="small muted keep">Drawing the card…</p> : img ? <img className="log-card-img" src={img} alt={`Career card of ${rec.name}`} /> : <p className="small muted">This browser could not draw the card.</p>)}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Hide the card' : 'Show the card'}
        </button>
        <CardActions rec={rec} />
        <span className="spacer" />
        <button className={`btn small ${armed ? 'danger' : 'ghost'}`} onClick={() => (armed ? onDelete() : setArmed(true))} onBlur={() => setArmed(false)}>
          {armed ? 'Tap again to delete' : 'Delete'}
        </button>
      </div>
    </article>
  );
}

/** The page: every card, newest first. */
export function CareerLog() {
  const setPage = useStore((s) => s.setPage);
  const [cards, setCards] = useState(logCards);
  const warn = fullness(cards.length, cards[cards.length - 1]);
  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          Bench to <span>Rafters</span>
        </div>
        <button className="btn ghost" onClick={() => setPage(null)}>
          Back
        </button>
      </header>
      <section className="stack stage-in">
        <div>
          <div className="kicker">
            {cards.length} of {LOG_MAX} cards · on this device
          </div>
          <h1 className="hub-title with-icon">
            <Icon name="cards" size={40} />
            Career log
          </h1>
          <p className="prose">Every career you finish leaves its card here. The log keeps {LOG_MAX}: when it is full, a new career replaces the oldest card. Delete any card you don’t want to keep.</p>
        </div>
        {warn && <div className="log-warn">{warn}</div>}
        {cards.length === 0 && <p className="muted">No cards yet. Finish a career and its card lands here.</p>}
        {cards.map((c) => (
          <LogEntry
            key={c.id}
            rec={c}
            onDelete={() => {
              deleteCard(c.id);
              setCards(logCards());
            }}
          />
        ))}
      </section>
    </div>
  );
}
