// Round 35: Play with friends, the multiplayer page (ui/multiplayer.ts): challenges and draft
// classes, each found by a code, a link or quick match. Regular guy only (owner: "i want the
// multiplayer under regular guy").

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CareerRecord } from '../../engine/career/record';
import type { GameState } from '../../engine/types';
import { ARCHETYPES } from '../../engine/player/archetypes';
import { NAMES } from '../../content/strings';
import { useStore } from '../../store';
import { PageTop } from '../components/PageTop';
import { DevDoor } from '../components/FootBar';
import { Icon } from '../art/Icon';
import { sfx } from '../sound';
import {
  CLASS_MAX,
  CODE_RE,
  HANDLE_MAX,
  LEVEL_SHORT,
  MP_FAIL,
  SITE,
  canChallenge,
  classYears,
  cleanCode,
  cleanProspect,
  dropLink,
  handle,
  linkFor,
  mpScore,
  multiplayer,
  setHandle,
  standings,
  type Challenge,
  type ClassSummary,
  type DraftClass,
  type MpLink,
  type Multiplayer,
  type OpenChallenge,
} from '../multiplayer';

/** The career index as the page shows it: a whole number. */
const idx = (r: CareerRecord): number => Math.round(mpScore(r));
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

/** The multiplayer this page has: null while it looks, false when there is none here. */
function useMp(): Multiplayer | null | false {
  const [mp, setMp] = useState<Multiplayer | null | false>(null);
  useEffect(() => {
    let live = true;
    void multiplayer().then((m) => live && setMp(m ?? false));
    return () => {
      live = false;
    };
  }, []);
  return mp;
}

/** The entry on the start page. */
export function MultiplayerCard() {
  const setPage = useStore((s) => s.setPage);
  return (
    <section className="card stack">
      <div className="sec-title with-icon">
        <Icon name="versus" size={28} />
        Play with friends
      </div>
      <p className="small muted">Challenge a friend to beat your career from the same start, or start a draft class together and follow each other’s seasons. Regular guy, nobody has to be on at the same time.</p>
      <button className="btn ghost" data-tour="multi" onClick={() => setPage('multi')}>
        Play with friends
      </button>
    </section>
  );
}

// ---------- small parts ----------

/** The name friends see beside a career. */
function HandleBox({ onSet }: { onSet: (h: string) => void }) {
  const [v, setV] = useState(handle());
  const [saved, setSaved] = useState(!!handle());
  const save = () => {
    setHandle(v);
    setSaved(true);
    onSet(v.trim());
    sfx('confirm');
  };
  return (
    <section className="card stack mp-handle">
      <label className="field">
        <span className="small muted">Your name for friends</span>
        <div className="row" style={{ gap: 8 }}>
          <input maxLength={HANDLE_MAX} value={v} placeholder="Shown beside your careers" onChange={(e) => (setV(e.target.value), setSaved(false))} onKeyDown={(e) => e.key === 'Enter' && v.trim() && save()} />
          <button className="btn" disabled={!v.trim() || (saved && v.trim() === handle())} onClick={save}>
            {saved && v.trim() === handle() ? 'Saved' : 'Save'}
          </button>
        </div>
      </label>
      <p className="small muted desc">Friends see this name, not your account: the game keeps no email or login. Your player keeps his own name.</p>
    </section>
  );
}

/** A box for a code a friend sent. */
function CodeEntry({ label, onOpen }: { label: string; onOpen: (code: string) => void }) {
  const [v, setV] = useState('');
  const code = cleanCode(v);
  const ok = CODE_RE.test(code);
  return (
    <div className="row mp-code-entry" style={{ gap: 8 }}>
      <input aria-label={label} value={v} maxLength={8} placeholder="ABC234" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ok && onOpen(code)} />
      <button className="btn" disabled={!ok} onClick={() => onOpen(code)}>
        {label}
      </button>
    </div>
  );
}

/** The code, big, and its link to copy. */
export function ShareCode({ link }: { link: MpLink }) {
  const url = linkFor(link);
  const field = useRef<HTMLInputElement>(null);
  const [said, setSaid] = useState('');
  const pick = () => {
    field.current?.focus();
    field.current?.select();
    setSaid('Selected: copy it with your keyboard.');
  };
  const copy = () => {
    try {
      if (!navigator.clipboard) return pick();
      navigator.clipboard.writeText(url).then(() => (setSaid('Link copied.'), sfx('sent')), pick);
    } catch {
      pick();
    }
  };
  return (
    <div className="mp-share stack">
      <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="mp-code" aria-label={`Code ${link.code.split('').join(' ')}`}>
          {link.code}
        </span>
        <button className="btn with-icon" onClick={copy}>
          <Icon name="share" size={20} />
          Copy the link
        </button>
      </div>
      <input ref={field} readOnly value={url} aria-label="Link to send" onFocus={(e) => e.currentTarget.select()} />
      <small className="muted" aria-live="polite">
        {said || 'Send the code or the link. A friend opens Play with friends and types the code, or just opens the link.'}
      </small>
    </div>
  );
}

/** A career's few big numbers, as a challenge compares them. */
function Line({ rec }: { rec: CareerRecord }) {
  return (
    <span className="mp-line">
      <b>{idx(rec)}</b> index · peak {Math.round(rec.peak)} · {rec.titles} {rec.titles === 1 ? 'title' : 'titles'} · {rec.allStars} All-Star · {rec.mvps} MVP
    </span>
  );
}

const prospectText = (c: Challenge): string => {
  const i = c.prospect.input;
  const arch = ARCHETYPES[i.pos]?.[i.archetype]?.name ?? '';
  return `${i.name}, #${i.number} · ${NAMES.pos[i.pos]} · ${arch} · focus ${i.focus.map((k) => NAMES.attr[k]).join(' and ')}`;
};

// ---------- challenges ----------

function ChallengeView({ mp, code, back }: { mp: Multiplayer; code: string; back: () => void }) {
  const startChallenge = useStore((s) => s.startChallenge);
  const career = useStore((s) => !!s.game && s.game.step !== 'retired');
  const [c, setC] = useState<Challenge | null | 'error' | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void mp.challenge(code).then((x) => live && setC(x));
    return () => {
      live = false;
    };
  }, [mp, code]);
  if (c === undefined) return <p className="muted">Looking up {code}…</p>;
  if (c === null || c === 'error')
    return (
      <section className="card stack">
        <p>{c === null ? MP_FAIL.missing : MP_FAIL.error}</p>
        <button className="btn ghost" onClick={back}>
          Back
        </button>
      </section>
    );
  const rows = [{ id: 'maker', name: c.name, rec: c.rec, mine: c.mine, maker: true }, ...c.answers.map((a) => ({ ...a, maker: false }))].sort((a, b) => mpScore(b.rec) - mpScore(a.rec));
  const playable = !c.mine && !!cleanProspect(c.prospect);
  return (
    <section className="stack">
      <section className="card stack mp-challenge">
        <div className="kicker">{c.mine ? 'Your challenge' : `${c.name}’s challenge`} · {ago(c.at)}</div>
        <div className="sec-title">{c.prospect.input.name}</div>
        <p className="small">{prospectText(c)}</p>
        <p className="small muted desc">The same seed and the same start page: the same high school, the same first tryout, the same league around him. What he becomes is up to the choices. A challenge career has no step back.</p>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th className="l">#</th>
                <th className="l">Who</th>
                <th>Index</th>
                <th>Peak</th>
                <th>Titles</th>
                <th>All-Star</th>
                <th>MVP</th>
                <th className="l">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={r.mine ? 'me' : undefined}>
                  <td className="l">{i + 1}</td>
                  <td className="l">
                    {r.name}
                    {r.maker ? ' (set it)' : ''}
                    {r.mine ? ' · you' : ''}
                  </td>
                  <td>{idx(r.rec)}</td>
                  <td>{Math.round(r.rec.peak)}</td>
                  <td>{r.rec.titles}</td>
                  <td>{r.rec.allStars}</td>
                  <td>{r.rec.mvps}</td>
                  <td className="l">{r.rec.tier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {playable && (
            <button className="btn" disabled={career} onClick={() => (sfx('versus'), startChallenge(c))}>
              {c.answers.some((a) => a.mine) ? 'Play it again (your best counts)' : 'Play this prospect'}
            </button>
          )}
          <button className="btn ghost" onClick={back}>
            Back
          </button>
        </div>
        {playable && career && <p className="small muted keep">Finish or leave the career you are playing first (New career in Settings), then come back.</p>}
      </section>
      <section className="card stack">
        <div className="sec-title">Send it on</div>
        <ShareCode link={{ kind: 'challenge', code: c.code }} />
      </section>
    </section>
  );
}

function Challenges({ mp, open, setOpen }: { mp: Multiplayer; open: string | null; setOpen: (c: string | null) => void }) {
  const [quick, setQuick] = useState<OpenChallenge[] | 'error' | null>(null);
  const [mine, setMine] = useState<Challenge[] | 'error' | null>(null);
  useEffect(() => {
    if (open) return;
    let live = true;
    void mp.openChallenges().then((x) => live && setQuick(x));
    void mp.myChallenges().then((x) => live && setMine(x));
    return () => {
      live = false;
    };
  }, [mp, open]);
  if (open) return <ChallengeView mp={mp} code={open} back={() => setOpen(null)} />;
  return (
    <section className="stack">
      <section className="card stack">
        <div className="sec-title">Got a code?</div>
        <CodeEntry label="Open the challenge" onOpen={setOpen} />
        <p className="small muted desc">To make one: finish a Regular guy career, then press Challenge a friend on its last page.</p>
      </section>
      <section className="card stack">
        <div className="sec-title with-icon">
          <Icon name="live" size={24} />
          Quick match
        </div>
        <p className="small muted desc">Other players’ challenges from the last 30 days, the least answered first.</p>
        {quick === null ? (
          <p className="muted">Loading…</p>
        ) : quick === 'error' ? (
          <p className="muted">{MP_FAIL.error}</p>
        ) : quick.length === 0 ? (
          <p className="muted">No open challenges right now. Make the first one.</p>
        ) : (
          <ul className="mp-list">
            {quick.map((q) => (
              <li key={q.code}>
                <button className="mp-row" onClick={() => setOpen(q.code)}>
                  <span>
                    <b>{q.rec.name}</b> <small className="muted">by {q.name} · {ago(q.at)} · {q.answers} {q.answers === 1 ? 'answer' : 'answers'}</small>
                  </span>
                  <Line rec={q.rec} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {mine && mine !== 'error' && mine.length > 0 && (
        <section className="card stack">
          <div className="sec-title">Yours</div>
          <ul className="mp-list">
            {mine.map((c) => {
              const best = [...c.answers].sort((a, b) => mpScore(b.rec) - mpScore(a.rec))[0];
              return (
                <li key={c.code}>
                  <button className="mp-row" onClick={() => setOpen(c.code)}>
                    <span>
                      <b>{c.rec.name}</b> <small className="muted">{c.mine ? 'you set it' : `${c.name}’s`} · {c.code} · {c.answers.length} {c.answers.length === 1 ? 'answer' : 'answers'}</small>
                    </span>
                    <small>{best ? `Best answer: ${best.name}, ${idx(best.rec)} against ${idx(c.rec)}` : 'No answers yet'}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </section>
  );
}

// ---------- draft classes ----------

function ClassView({ mp, code, back }: { mp: Multiplayer; code: string; back: () => void }) {
  const setDraft = useStore((s) => s.setDraft);
  const career = useStore((s) => !!s.game && s.game.step !== 'retired');
  const [k, setK] = useState<DraftClass | null | 'error' | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void mp.draftClass(code).then((x) => live && setK(x));
    return () => {
      live = false;
    };
  }, [mp, code]);
  const table = useMemo(() => (k && k !== 'error' ? standings(k) : []), [k]);
  const years = useMemo(() => (k && k !== 'error' ? classYears(k) : []), [k]);
  if (k === undefined) return <p className="muted">Looking up {code}…</p>;
  if (k === null || k === 'error')
    return (
      <section className="card stack">
        <p>{k === null ? MP_FAIL.missing : MP_FAIL.error}</p>
        <button className="btn ghost" onClick={back}>
          Back
        </button>
      </section>
    );
  const me = k.members.find((m) => m.mine);
  const canJoin = (!me || me.seasons.length === 0) && (me || k.members.length < CLASS_MAX);
  return (
    <section className="stack">
      <section className="card stack">
        <div className="kicker">
          Draft class · {k.members.length} of {CLASS_MAX} · started {ago(k.at)}
        </div>
        <div className="sec-title">{k.name}</div>
        <p className="small muted desc">Every career here starts on one seed: the same year, the same league, the same draft. Each season posts its line when it ends, and each finished career its card.</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {canJoin && (
            <button className="btn" disabled={career} onClick={() => (sfx('roll'), setDraft({ code: k.code, name: k.name }))}>
              {me ? 'Start your career in it' : 'Join with a new career'}
            </button>
          )}
          <button className="btn ghost" onClick={back}>
            Back
          </button>
        </div>
        {canJoin && career && <p className="small muted keep">Finish or leave the career you are playing first (New career in Settings), then come back.</p>}
        {me && me.seasons.length > 0 && !me.rec && <p className="small muted keep">Your career in this class carries on from Continue on the start page.</p>}
      </section>
      <section className="card stack">
        <div className="sec-title with-icon">
          <Icon name="podium" size={24} />
          Standings
        </div>
        <p className="small muted desc">By the best rating so far, then the honours. A finished career counts its card.</p>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th className="l">#</th>
                <th className="l">Friend</th>
                <th className="l">Player</th>
                <th className="l">Now</th>
                <th>Peak</th>
                <th>NBA</th>
                <th>All-Star</th>
                <th>MVP</th>
                <th>Titles</th>
              </tr>
            </thead>
            <tbody>
              {table.map((t, i) => {
                const last = t.m.seasons[t.m.seasons.length - 1];
                return (
                  <tr key={t.m.id} className={t.m.mine ? 'me' : undefined}>
                    <td className="l">{i + 1}</td>
                    <td className="l">
                      {t.m.name}
                      {t.m.mine ? ' · you' : ''}
                    </td>
                    <td className="l">{t.m.rec?.name ?? last?.pn ?? '—'}</td>
                    <td className="l">{t.m.rec ? `Retired · ${t.m.rec.tier}` : last ? `${LEVEL_SHORT[last.lv] ?? last.lv} · ${last.team} · age ${last.age}` : 'Not started'}</td>
                    <td>{t.peak || '—'}</td>
                    <td>{t.nba}</td>
                    <td>{t.allStars}</td>
                    <td>{t.mvps}</td>
                    <td>{t.titles}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {years.length > 0 && (
        <section className="card stack">
          <div className="sec-title">Year by year</div>
          <p className="small muted desc">Each friend’s season, with the best of the class that year marked.</p>
          <div className="tbl-wrap">
            <table className="mp-years">
              <thead>
                <tr>
                  <th className="l">Year</th>
                  {k.members.map((m) => (
                    <th key={m.id} className="l">
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...years].reverse().map((y) => (
                  <tr key={y.year}>
                    <td className="l">{y.year}</td>
                    {y.rows.map(({ m, s }) => (
                      <td key={m.id} className={`l${y.best === m.id ? ' mp-best' : ''}`}>
                        {s ? (
                          <span className="mp-cell">
                            <span>
                              <i className="sw" style={{ background: s.color }} />
                              {LEVEL_SHORT[s.lv] ?? s.lv} · {s.team}
                            </span>
                            <small>
                              {s.ovr} · {s.pts} pts {s.reb} reb {s.ast} ast
                              {s.aw.length ? ` · ${s.aw.slice(0, 2).join(', ')}` : ''}
                            </small>
                            {y.best === m.id && <small className="mp-best-tag">Best of the class</small>}
                          </span>
                        ) : (
                          <small className="muted">—</small>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="card stack">
        <div className="sec-title">Invite friends</div>
        {k.members.length < CLASS_MAX ? <ShareCode link={{ kind: 'class', code: k.code }} /> : <p className="small muted keep">The class is full.</p>}
      </section>
    </section>
  );
}

function Classes({ mp, open, setOpen, name }: { mp: Multiplayer; open: string | null; setOpen: (c: string | null) => void; name: string }) {
  const setDraft = useStore((s) => s.setDraft);
  const career = useStore((s) => !!s.game && s.game.step !== 'retired');
  const [title, setTitle] = useState('');
  const [quick, setQuick] = useState<ClassSummary[] | 'error' | null>(null);
  const [mine, setMine] = useState<ClassSummary[] | 'error' | null>(null);
  useEffect(() => {
    if (open) return;
    let live = true;
    void mp.openClasses().then((x) => live && setQuick(x));
    void mp.myClasses().then((x) => live && setMine(x));
    return () => {
      live = false;
    };
  }, [mp, open]);
  if (open) return <ClassView mp={mp} code={open} back={() => setOpen(null)} />;
  const list = (xs: ClassSummary[]) => (
    <ul className="mp-list">
      {xs.map((x) => (
        <li key={x.code}>
          <button className="mp-row" onClick={() => setOpen(x.code)}>
            <span>
              <b>{x.name}</b> <small className="muted">{x.code} · started {ago(x.at)}</small>
            </span>
            <small>
              {x.n} of {CLASS_MAX} players
            </small>
          </button>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="stack">
      <section className="card stack">
        <div className="sec-title">Start a class</div>
        <p className="small muted desc">Name it, make your player, and send the code: up to eight friends start careers on the same seed.</p>
        <div className="row mp-classes-new" style={{ gap: 8 }}>
          <input aria-label="Name of the class" maxLength={40} value={title} placeholder="Class of the rooftop" onChange={(e) => setTitle(e.target.value)} />
          <button className="btn" disabled={!title.trim() || !name || career} onClick={() => (sfx('confirm'), setDraft({ name: title.trim() }))}>
            Make your player
          </button>
        </div>
        {career && <p className="small muted keep">Finish or leave the career you are playing first (New career in Settings).</p>}
      </section>
      <section className="card stack">
        <div className="sec-title">Got a code?</div>
        <CodeEntry label="Open the class" onOpen={setOpen} />
      </section>
      {mine && mine !== 'error' && mine.length > 0 && (
        <section className="card stack">
          <div className="sec-title">Yours</div>
          {list(mine)}
        </section>
      )}
      <section className="card stack">
        <div className="sec-title with-icon">
          <Icon name="live" size={24} />
          Quick match
        </div>
        <p className="small muted desc">Classes from the last two weeks with a seat left.</p>
        {quick === null ? <p className="muted">Loading…</p> : quick === 'error' ? <p className="muted">{MP_FAIL.error}</p> : quick.length === 0 ? <p className="muted">No open classes right now. Start one.</p> : list(quick)}
      </section>
    </section>
  );
}

// ---------- the page ----------

export function MultiplayerPage() {
  const setPage = useStore((s) => s.setPage);
  const mpOpen = useStore((s) => s.mpOpen);
  const openMp = useStore((s) => s.openMp);
  const mp = useMp();
  const [name, setName] = useState(handle());
  const [tab, setTab] = useState<'challenge' | 'class'>(mpOpen?.kind ?? 'challenge');
  // a link opens once: after that the page is the player's to move around
  useEffect(() => {
    if (mpOpen) dropLink();
  }, [mpOpen]);
  const open = mpOpen && mpOpen.kind === tab ? mpOpen.code : null;
  const setOpen = (code: string | null) => openMp(code ? { kind: tab, code } : null);
  return (
    <div className="wrap">
      <PageTop trail={['Play with friends']} back={() => (openMp(null), setPage(null))} />
      <section className="stack stage-in">
        <div>
          <div className="kicker">Multiplayer · Regular guy</div>
          <h1 className="hub-title with-icon">
            <Icon name="versus" size={40} />
            Play with friends
          </h1>
          <p className="small muted desc">Two ways to play with friends, and nobody has to be on at the same time.</p>
        </div>
        {mp === null ? (
          <p className="muted">Connecting…</p>
        ) : mp === false ? (
          <section className="card stack">
            <p className="keep">Playing with friends needs the game’s own server, which this page cannot reach. It works on the website and in the itch.io download.</p>
            <a className="btn" href={SITE} target="_blank" rel="noreferrer">
              Open the website
            </a>
          </section>
        ) : (
          <>
            {mp.kind === 'local' && <p className="small muted">Dev deck: a stand-in on this device with house players; nothing reaches the real server.</p>}
            <HandleBox onSet={setName} />
            <div className="seg" role="group" aria-label="Kind of game" data-tour="mp-tabs">
              <button className="with-icon" aria-pressed={tab === 'challenge'} onClick={() => (setTab('challenge'), openMp(null))}>
                <Icon name="versus" size={20} />
                Challenge a friend
              </button>
              <button className="with-icon" data-mp-tab="class" aria-pressed={tab === 'class'} onClick={() => (setTab('class'), openMp(null))}>
                <Icon name="draftclass" size={20} />
                Draft class
              </button>
            </div>
            {!name && <p className="small">Pick your name for friends first: it goes beside everything you post.</p>}
            {tab === 'challenge' ? <Challenges mp={mp} open={open} setOpen={setOpen} /> : <Classes mp={mp} open={open} setOpen={setOpen} name={name} />}
          </>
        )}
      </section>
      <DevDoor />
    </div>
  );
}

// ---------- on the retirement page ----------

/** What a finished career can do with friends: set a challenge from it, see how a challenge or a
 * draft class went. */
export function RetirementMp({ g, rec }: { g: GameState; rec: CareerRecord }) {
  const mutate = useStore((s) => s.mutate);
  const openMp = useStore((s) => s.openMp);
  const mp = useMp();
  const [name, setName] = useState(handle());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [theirs, setTheirs] = useState<Challenge | null>(null);
  const answering = g.mp?.challenge;
  useEffect(() => {
    if (!mp || !answering) return;
    let live = true;
    void mp.challenge(answering).then((c) => live && c && c !== 'error' && setTheirs(c));
    return () => {
      live = false;
    };
  }, [mp, answering]);
  if (!mp || (!answering && !g.mp?.klass && !canChallenge(g))) return null;
  const make = async () => {
    if (!g.start) return;
    setBusy(true);
    setErr('');
    const r = await mp.makeChallenge(name, g.start, rec);
    setBusy(false);
    if (r.length === 6 && CODE_RE.test(r)) {
      sfx('versus');
      mutate((x) => (x.mp = { ...x.mp, made: r }));
    } else setErr(MP_FAIL[r as keyof typeof MP_FAIL] ?? MP_FAIL.error);
  };
  const mine = idx(rec);
  const target = theirs ? idx(theirs.rec) : null;
  return (
    <section className="card stack mp-retire">
      <div className="sec-title with-icon">
        <Icon name="versus" size={26} />
        Play with friends
      </div>
      {answering && (
        <div className="stack" style={{ gap: 6 }}>
          {theirs && target !== null ? (
            <p className="lede">
              {mine > target ? `You beat ${theirs.name}’s career: ${mine} to ${target}.` : mine === target ? `Dead even with ${theirs.name}: ${mine} each.` : `${theirs.name} still leads: ${target} to your ${mine}.`}
            </p>
          ) : (
            <p className="small">Your answer to challenge {answering} is on its way.</p>
          )}
          <button className="btn ghost small" onClick={() => openMp({ kind: 'challenge', code: answering })}>
            See the challenge
          </button>
        </div>
      )}
      {g.mp?.klass && (
        <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="small">The card goes to your draft class.</span>
          <button className="btn ghost small" onClick={() => openMp({ kind: 'class', code: g.mp!.klass! })}>
            See the class
          </button>
        </div>
      )}
      {canChallenge(g) && !answering && (
        <div className="stack" style={{ gap: 8 }}>
          {g.mp?.made ? (
            <ShareCode link={{ kind: 'challenge', code: g.mp.made }} />
          ) : (
            <>
              <p className="small">Challenge a friend: they play this same prospect from the same start, and both cards go side by side.</p>
              {!name ? (
                <HandleBox onSet={setName} />
              ) : (
                <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn" data-tour="mp-challenge" disabled={busy} onClick={() => void make()}>
                    Challenge a friend
                  </button>
                  <small className="muted">as {name}</small>
                </div>
              )}
              {err && <p className="small" style={{ color: 'var(--bad)' }}>{err}</p>}
            </>
          )}
        </div>
      )}
    </section>
  );
}
