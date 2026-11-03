// The career log (round 24): the career cards of the last ten finished careers (five before round
// 28), on this device. Round 29: up to five can be locked, and a locked card is never replaced.
// From the Extras tab of a career the page is for looking (and locking): deleting waits for the
// start page.

import { FootBar } from '../components/FootBar';
import { useEffect, useState } from 'react';
import type { CareerRecord } from '../../engine/career/record';
import { MODES, type Mode } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import { useStore } from '../../store';
import { PageTop } from '../components/PageTop';
import { LOCK_MAX, LOG_MAX, LOG_WARN, deleteCard, lockCard, logCards, logLocks, nextOut } from '../careerLog';
import { sfx } from '../sound';
import { recordCompare, recordLocks } from '../achievements';
import { achievementsNow } from '../../store';
import { canShareFiles, downloadCareerCard, drawCareerCard, shareCareerCard } from '../share';
import { PlayerArt } from '../art/Player';
import { Icon } from '../art/Icon';
import { CometMark, OathMark } from '../components/OathMark';
import { compareRows, compareScore } from '../compare';
import { deleteSlot, exportCode, listSlots, readSlot, type SlotMeta } from '../saves';
import { seasonLabel } from '../format';
import { isDev } from '../../dev/mode';

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

/** How full the log is, in words: a warning from nine cards, naming the card a new career would
 * replace (the oldest one not locked). */
function fullness(n: number): string | null {
  if (n < LOG_WARN) return null;
  const out = nextOut();
  return n >= LOG_MAX
    ? `The log is full (${LOG_MAX} of ${LOG_MAX}). The next career you finish replaces the oldest card that is not locked${out ? `: ${out.name}` : ''}.`
    : `${n} of ${LOG_MAX} cards. One more and the log is full; after that each new career replaces the oldest card that is not locked.`;
}

/** The note on the retirement page: the card went into the log (and which one it pushed out). */
export function LoggedNote() {
  const logged = useStore((s) => s.logged);
  const setPage = useStore((s) => s.setPage);
  if (!logged?.added) return null;
  const warn = fullness(logCards().length);
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

/** The entry on the start page, and on a career's Extras tab (round 29). */
export function CareerLogCard() {
  const setPage = useStore((s) => s.setPage);
  const live = useStore((s) => !!s.game && s.game.step !== 'retired');
  const [n] = useState(() => [logCards().length, logLocks().length]);
  return (
    <section className="card stack">
      <div className="sec-title with-icon">
        <Icon name="cards" size={28} />
        Career log
      </div>
      <p className="small muted">
        Your saved careers (continue or look back) and the cards of your last {LOG_MAX} finished careers, on this device. {n[0] ? `${n[0]} card${n[0] === 1 ? '' : 's'}${n[1] ? `, ${n[1]} locked` : ''}.` : 'Finish a career for its first card.'}
        {live ? ' During a career you can look, download and lock; deleting waits for the start page.' : ` Lock up to ${LOCK_MAX} to keep them for good.`}
      </p>
      <button className="btn ghost" data-tour="log" onClick={() => setPage('log')}>
        Open the career log
      </button>
    </section>
  );
}

/** Two cards side by side: the better number in each row in bold with a ▲, not by colour alone. */
function Compare({ a, b, onClear }: { a: CareerRecord; b: CareerRecord; onClear: () => void }) {
  const rows = compareRows(a, b);
  const score = compareScore(rows);
  const head = (r: CareerRecord, n: number) => (
    <th scope="col">
      <span className="cmp-who">
        <PlayerArt name={r.name} number={r.number} pos={r.pos} color={r.team?.color} team={r.team?.name ?? ''} size={56} />
        <span>
          <b>{r.name}</b>
          <small>{n} row{n === 1 ? '' : 's'} ahead</small>
        </span>
      </span>
    </th>
  );
  return (
    <section className="card stack cmp" data-tour="log-compare" aria-label={`${a.name} and ${b.name} side by side`}>
      <div className="row">
        <div className="sec-title with-icon">
          <Icon name="compare" size={26} />
          Side by side
        </div>
        <span className="spacer" />
        <button className="btn ghost small" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="cmp-scroll">
        <table className="cmp-table">
          <thead>
            <tr>
              <td />
              {head(a, score.a)}
              {head(b, score.b)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                {(['a', 'b'] as const).map((k) => (
                  <td key={k} className={r.better === k ? 'better' : undefined}>
                    {r.better === k ? <b>▲ {r[k]}</b> : r[k]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">▲ marks the better of the two. Retiring age and the difficulty are facts, not scores.</p>
    </section>
  );
}

/** A save's code, copied where the browser allows (round 25: a career as text, to carry it over). */
async function codeOf(id: string): Promise<string | null> {
  const g = await readSlot(id);
  if (!g) return null;
  const text = await exportCode(g);
  navigator.clipboard?.writeText(text).catch(() => undefined);
  return text;
}

function CodeBox({ text }: { text: string }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="small muted">This code is the whole career as it stands. Copied if your browser allows it; otherwise select it and copy. Found a bug? Send it with your feedback and the maker can open the career exactly as it is.</span>
      <textarea className="save-code" readOnly value={text} rows={3} onFocus={(e) => e.currentTarget.select()} />
    </div>
  );
}

/** A career saved on this device with no card yet: one in progress (or a finished one whose card has
 * gone). Round 34 (owner: "integrate the saved career system into the career log and get rid of
 * it"): it sits in the log as a card of its own. */
function SaveEntry({ meta, live, onGone }: { meta: SlotMeta; live: boolean; onGone: () => void }) {
  const resume = useStore((s) => s.resume);
  const here = useStore((s) => s.slot === meta.id);
  const [failed, setFailed] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  return (
    <article className={`card log-entry save-entry${meta.retired ? '' : ' going'}`}>
      <div className="log-head">
        <PlayerArt name={meta.name} number={meta.number ?? 0} pos={meta.pos ?? 'SF'} color={meta.team?.color} team={meta.team?.name ?? ''} size={84} />
        <div className="log-who">
          <div className="kicker">
            {MODES[meta.mode as Mode]?.name ?? meta.mode} · saved {new Date(meta.at).toLocaleDateString()}
          </div>
          <b className="log-name">{meta.name}</b>
          <span className={`tag${meta.retired ? '' : ' good'}`}>{here ? 'This career' : meta.retired ? 'Finished' : 'In progress'}</span>
          <div className="small">
            {seasonLabel(meta.year)}
            {meta.team ? ` · ${meta.team.name}` : ''}
            {meta.age ? ` · age ${meta.age}` : ''}
          </div>
          {failed && <div className="small" style={{ color: 'var(--bad)' }}>That save could not be read.</div>}
        </div>
        <div className="log-nums">
          <div>
            <b>{meta.ovr ?? '–'}</b>
            <small>peak</small>
          </div>
        </div>
      </div>
      {code && <CodeBox text={code} />}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {!live && (
          <button className="btn" onClick={() => void resume(meta.id).then((ok) => !ok && setFailed(true))}>
            {meta.retired ? 'Look back' : 'Continue'}
          </button>
        )}
        <button className="btn ghost small" onClick={() => void codeOf(meta.id).then((t) => (t ? setCode(t) : setFailed(true)))}>
          Code
        </button>
        <span className="spacer" />
        {!live && (
          <button className={`btn small ${armed ? 'danger' : 'ghost'}`} onClick={() => (armed ? (deleteSlot(meta.id), onGone()) : setArmed(true))} onBlur={() => setArmed(false)}>
            {armed ? 'Tap again to delete' : 'Delete'}
          </button>
        )}
      </div>
    </article>
  );
}

function LogEntry({ rec, save, locked, canLock, live, onDelete, onLock, picked, canPick, onPick }: { rec: CareerRecord; save?: SlotMeta; locked: boolean; canLock: boolean; live: boolean; onDelete: () => void; onLock: () => void; picked: boolean; canPick: boolean; onPick: () => void }) {
  const resume = useStore((s) => s.resume);
  const [img, setImg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
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
    <article className={`card log-entry${locked ? ' locked' : ''}`}>
      <div className="log-head">
        <PlayerArt name={rec.name} number={rec.number} pos={rec.pos} color={rec.team?.color} team={rec.team?.name ?? ''} size={84} />
        <div className="log-who">
          <div className="kicker">
            {MODES[rec.mode].name} · {when.toLocaleDateString()}
          </div>
          <b className="log-name">{rec.name}</b>
          {rec.oath && <OathMark />}
          {rec.comet && <CometMark />}
          {locked && (
            <span className="log-lock-tag with-icon">
              <Icon name="lock" size={16} />
              Locked
            </span>
          )}
          <div className="small">
            {NAMES.pos[rec.pos]} · {rec.role} · retired at {rec.retiredAt}
          </div>
          <div className="small muted">{rec.tier}</div>
          {/* round 32: his son's career, and what it added */}
          {rec.child && (
            <div className="small log-child">
              Son {rec.child.name}: peak {rec.child.peak} · +{rec.child.adds} legacy
            </div>
          )}
          {failed && <div className="small" style={{ color: 'var(--bad)' }}>That save could not be read.</div>}
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
      {code && <CodeBox text={code} />}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {/* round 34: the career itself, when its save is still on this device */}
        {save && !live && (
          <button className="btn" onClick={() => void resume(save.id).then((ok) => !ok && setFailed(true))}>
            Look back
          </button>
        )}
        <button className="btn ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Hide the card' : 'Show the card'}
        </button>
        <CardActions rec={rec} />
        {save && (
          <button className="btn ghost small" onClick={() => void codeOf(save.id).then((t) => (t ? setCode(t) : setFailed(true)))}>
            Code
          </button>
        )}
        <button className={`btn small${picked ? '' : ' ghost'}`} data-tour="log-pick" aria-pressed={picked} disabled={!picked && !canPick} onClick={onPick} title={picked ? 'Take it out of the comparison' : 'Compare it with another card'}>
          {picked ? 'Comparing' : 'Compare'}
        </button>
        <span className="spacer" />
        <button
          className={`btn small with-icon${locked ? '' : ' ghost'}`}
          data-tour="log-lock"
          aria-pressed={locked}
          disabled={!locked && !canLock}
          title={!locked && !canLock ? `${LOCK_MAX} cards are locked already: unlock one first` : locked ? 'Unlock: it can be replaced or deleted again' : 'Lock: never replaced, never deleted'}
          onClick={onLock}
        >
          <Icon name="lock" size={16} />
          {locked ? 'Unlock' : 'Lock'}
        </button>
        {!live && !locked && (
          <button className={`btn small ${armed ? 'danger' : 'ghost'}`} onClick={() => (armed ? onDelete() : setArmed(true))} onBlur={() => setArmed(false)}>
            {armed ? 'Tap again to delete' : 'Delete'}
          </button>
        )}
      </div>
    </article>
  );
}

/** A finished card's save: the one it was finished in, or (for cards from before round 34) a
 * finished save of the same name and difficulty. */
const saveOf = (rec: CareerRecord, slots: SlotMeta[]): SlotMeta | undefined =>
  rec.slot ? slots.find((x) => x.id === rec.slot) : slots.find((x) => x.retired && x.name === rec.name && x.mode === rec.mode);

/** Paste a code: the career opens at once. Round 35 (owner: "let's put the import function exclusive
 * to devs. i dont want people abusing the export codes"): only in the dev deck, where it opens in
 * the deck's own storage (a code is the whole career as plain packed text, so an edited one could
 * carry made-up ratings or honours into the boards). */
function ImportBox() {
  const importCareer = useStore((s) => s.importCareer);
  const [paste, setPaste] = useState('');
  const [bad, setBad] = useState(false);
  return (
    <details className="save-import">
      <summary>Import a career from a code</summary>
      <textarea className="save-code" rows={3} value={paste} placeholder="BTR1..." onChange={(e) => (setPaste(e.target.value), setBad(false))} />
      <button className="btn small" disabled={!paste.trim()} onClick={() => void importCareer(paste).then((ok) => setBad(!ok))}>
        Import and play
      </button>
      {bad && <span className="small" style={{ color: 'var(--bad)' }}>That code could not be read. Check that it was copied whole.</span>}
    </details>
  );
}

/** The page: the careers in progress, then every finished career's card, newest first. */
export function CareerLog() {
  const setPage = useStore((s) => s.setPage);
  // round 29: opened from a career (its Extras tab), the log is for looking and locking
  const live = useStore((s) => !!s.game && s.game.step !== 'retired');
  const [cards, setCards] = useState(logCards);
  const [locks, setLocks] = useState(logLocks);
  const [slots, setSlots] = useState(listSlots);
  const [pick, setPick] = useState<string[]>([]);
  const picked = pick.map((id) => cards.find((c) => c.id === id)).filter((c): c is CareerRecord => !!c);
  const warn = fullness(cards.length);
  const linked = new Map(cards.map((c) => [c.id, saveOf(c, slots)]));
  const taken = new Set([...linked.values()].filter(Boolean).map((x) => x!.id));
  const going = slots.filter((x) => !x.retired);
  // finished saves whose card has gone (or never came: a career finished before the log)
  const loose = slots.filter((x) => x.retired && !taken.has(x.id));
  return (
    <div className="wrap">
      <PageTop trail={['Career log']} back={() => setPage(null)} />
      <section className="stack stage-in">
        <div>
          <div className="kicker">
            {going.length} in progress · {cards.length} of {LOG_MAX} finished · {locks.length} of {LOCK_MAX} locked · on this device
          </div>
          <h1 className="hub-title with-icon">
            <Icon name="cards" size={40} />
            Career log
          </h1>
          <p className="prose">
            Every career on this device. The ones in progress come first: continue one, or copy its code (the maker can open it, to look into a bug). Then a card for each finished career: look back at it, download or share the card, compare two side by side. The log keeps {LOG_MAX} finished careers: when it is full, a new one replaces the oldest card that is not locked. Lock up to {LOCK_MAX} you never want to lose.
          </p>
        </div>
        {live && (
          <div className="log-warn with-icon">
            <Icon name="lock" size={20} />
            <span>You are in a career: look, copy codes, download and lock here. Continuing another career, importing and deleting wait for the start page.</span>
          </div>
        )}
        {going.length > 0 && <div className="sec-title">In progress</div>}
        {going.map((x) => (
          <SaveEntry key={x.id} meta={x} live={live} onGone={() => setSlots(listSlots())} />
        ))}
        <div className="sec-title">Finished careers</div>
        {warn && <div className="log-warn">{warn}</div>}
        {picked.length === 2 ? (
          <Compare a={picked[0]} b={picked[1]} onClear={() => setPick([])} />
        ) : cards.length > 1 ? (
          <p className="small muted keep">{picked.length === 1 ? `Comparing ${picked[0].name}: pick one more card.` : 'Pick two cards with Compare to see them side by side.'}</p>
        ) : null}
        {cards.length === 0 && loose.length === 0 && <p className="muted">No cards yet. Finish a career and its card lands here.</p>}
        {cards.map((c) => (
          <LogEntry
            key={c.id}
            rec={c}
            save={linked.get(c.id)}
            live={live}
            locked={locks.includes(c.id)}
            canLock={locks.length < LOCK_MAX}
            picked={pick.includes(c.id)}
            canPick={pick.length < 2}
            onPick={() => {
              const next = pick.includes(c.id) ? pick.filter((x) => x !== c.id) : [...pick, c.id];
              setPick(next);
              if (next.length === 2) {
                sfx('confirm');
                recordCompare();
                achievementsNow();
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onLock={() => {
              const on = !locks.includes(c.id);
              if (lockCard(c.id, on)) sfx(on ? 'lock' : 'unlock');
              setLocks(logLocks());
              recordLocks(logLocks().length);
              achievementsNow();
            }}
            onDelete={() => {
              // the card and its save go together
              if (deleteCard(c.id)) {
                const sv = linked.get(c.id);
                if (sv) deleteSlot(sv.id);
              }
              setPick(pick.filter((x) => x !== c.id));
              setCards(logCards());
              setLocks(logLocks());
              setSlots(listSlots());
            }}
          />
        ))}
        {loose.map((x) => (
          <SaveEntry key={x.id} meta={x} live={live} onGone={() => setSlots(listSlots())} />
        ))}
        {!live && isDev() && <ImportBox />}
      </section>
      <FootBar where={`career log page${live ? ', from a career' : ''}`} />
    </div>
  );
}
