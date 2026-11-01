// The careers saved on this device, in the career log (round 32). Continue one in progress, look back
// at a finished one, copy its code to carry it to another browser, delete it, or import one.

import { useState } from 'react';
import { MODES, type Mode } from '../../engine/balance';
import { useStore } from '../../store';
import { MAX_SLOTS, deleteSlot, exportCode, listSlots, readSlot } from '../saves';
import { seasonLabel } from '../format';

/** The careers saved on this device (round 14; round 25: ten slots, with codes to move one; round 32:
 * in the career log, owner: "i think they're pretty much the same function"). From a career they
 * are for looking at: continuing, importing and deleting wait for the start page. */
export function SavedCareers({ live }: { live: boolean }) {
  const resume = useStore((s) => s.resume);
  const importCareer = useStore((s) => s.importCareer);
  const [slots, setSlots] = useState(listSlots);
  const [failed, setFailed] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [code, setCode] = useState<{ id: string; text: string } | null>(null);
  const [paste, setPaste] = useState('');
  const [bad, setBad] = useState(false);
  const share = async (id: string) => {
    const g = await readSlot(id);
    if (!g) return setFailed(id);
    const text = await exportCode(g);
    setCode({ id, text });
    navigator.clipboard?.writeText(text).catch(() => undefined);
  };
  const remove = (id: string) => {
    deleteSlot(id);
    setSlots(listSlots());
    setSure(null);
  };
  return (
    <section className="card stack saves-card" data-tour="saves">
      <div className="row">
        <div>
          <div className="kicker">Saved on this device · {slots.length} of {MAX_SLOTS}</div>
          <div className="sec-title">Saved careers</div>
        </div>
      </div>
      {live && <p className="small muted keep">You are in a career: continuing, importing or deleting another waits for the start page.</p>}
      {slots.length === 0 && <p className="small muted keep">No careers saved yet. Every career is saved here after each move.</p>}
      {slots.map((x) => (
        <div key={x.id} className="save-row">
          <div style={{ minWidth: 0 }}>
            <b className="resume-name">{x.name}</b>
            <div className="muted small">
              {x.retired ? 'Finished' : 'In progress'} · {seasonLabel(x.year)}
              {x.ovr ? ` · peak OVR ${x.ovr}` : ''} · {MODES[x.mode as Mode]?.name ?? x.mode}
            </div>
            {failed === x.id && <div className="small" style={{ color: 'var(--bad)' }}>That save could not be read.</div>}
          </div>
          {!live && (
          <div className="row save-actions">
            <button className="btn" onClick={() => void resume(x.id).then((ok) => !ok && setFailed(x.id))}>
              {x.retired ? 'Look back' : 'Continue'}
            </button>
            <button className="btn ghost small" onClick={() => void share(x.id)}>
              Code
            </button>
            {sure === x.id ? (
              <button className="btn ghost small danger" onClick={() => remove(x.id)}>
                Delete for good
              </button>
            ) : (
              <button className="btn ghost small" onClick={() => setSure(x.id)}>
                Delete
              </button>
            )}
          </div>
          )}
          {code?.id === x.id && (
            <div className="stack" style={{ gap: 4, gridColumn: '1 / -1' }}>
              <span className="small muted">This code is the whole career. Copied if your browser allows it; otherwise select it and copy. Paste it into another browser's import box below.</span>
              <textarea className="save-code" readOnly value={code.text} rows={3} onFocus={(e) => e.currentTarget.select()} />
            </div>
          )}
        </div>
      ))}
      {slots.length >= MAX_SLOTS && <p className="small muted keep">All {MAX_SLOTS} slots are in use: a new career replaces the oldest ({slots[slots.length - 1].name}).</p>}
      {!live && (
      <details className="save-import">
        <summary>Import a career from a code</summary>
        <textarea className="save-code" rows={3} value={paste} placeholder="BTR1..." onChange={(e) => (setPaste(e.target.value), setBad(false))} />
        <button className="btn small" disabled={!paste.trim()} onClick={() => void importCareer(paste).then((ok) => setBad(!ok))}>
          Import and play
        </button>
        {bad && <span className="small" style={{ color: 'var(--bad)' }}>That code could not be read. Check that it was copied whole.</span>}
      </details>
      )}
    </section>
  );
}

