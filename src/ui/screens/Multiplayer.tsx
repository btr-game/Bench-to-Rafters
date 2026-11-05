// Round 35: Play with friends, the multiplayer page (ui/multiplayer.ts): challenges and draft
// classes, each found by a code, a link or quick match. Regular guy only (owner: "i want the
// multiplayer under regular guy").

import { useEffect, useMemo, useRef, useState } from 'react';
import { careerRecord, type CareerRecord } from '../../engine/career/record';
import { friendsOnTeam, rivalRecord } from '../../engine/career/friends';
import type { GameState } from '../../engine/types';
import { ARCHETYPES } from '../../engine/player/archetypes';
import { NAMES } from '../../content/strings';
import { achievementsNow, useStore } from '../../store';
import { unlockHint, unlocked } from '../road';
import { PageTop } from '../components/PageTop';
import { UnlockButton } from '../components/SkipTutorial';
import { DevDoor } from '../components/FootBar';
import { Icon } from '../art/Icon';
import { sfx } from '../sound';
import { recordMp } from '../achievements';
import { FriendCareer, ReactCounts, ReunionNight } from './ClassNight';
import {
  CLASS_MAX,
  CODE_RE,
  LEVEL_SHORT,
  MP_FAIL,
  SITE,
  canChallenge,
  ranQuick,
  classYears,
  cleanCode,
  cleanProspect,
  dropLink,
  linkFor,
  mpScore,
  multiplayer,
  CHAT_MAX,
  friendsOf,
  mutualRival,
  rivalRequests,
  seasonLine,
  standings,
  type Challenge,
  type ChatLine,
  type ClassMember,
  type ClassSummary,
  type Room,
  type DraftClass,
  type MpLink,
  type Multiplayer,
  type OpenChallenge,
} from '../multiplayer';
import { cleanUsername, isRude, username } from '../names';
import { UsernameBox } from '../components/Username';
import { t, tx } from '../../i18n';

/** The career index as the page shows it: a whole number. */
const idx = (r: CareerRecord): number => Math.round(mpScore(r));
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? t('just now') : m < 60 ? t('{n} min ago', { n: m }) : m < 1440 ? t('{n} h ago', { n: Math.round(m / 60) }) : t('{n} d ago', { n: Math.round(m / 1440) });
};
/** Two names (or stats) joined. */
const both = (xs: string[]): string => (xs.length === 2 ? t('{a} and {b}', { a: xs[0], b: xs[1] }) : xs.join(' and '));

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

/** The entry on the start page (round 36, owner: "never put more that 4 cards here. move the play with
 * friends elsewhere (under difficulties maybe)"): round 37, the park's card on the main land. */
export function MultiplayerCard() {
  const setPage = useStore((s) => s.setPage);
  return (
    <div className="card oath-card" role="group" aria-label="Play with friends">
      <Icon name="versus" size={48} />
      <div className="stack" style={{ gap: 6 }}>
        <div className="sec-title">{t('Play with friends?')}</div>
        <p className="small muted">{t('Challenge a friend to beat your career from the same start, or start a draft class together and follow each other’s seasons. Regular guy, nobody has to be on at the same time.')}</p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn small ghost" data-tour="multi" onClick={() => (sfx('page'), setPage('multi'))}>
            {t('Play with friends')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- small parts ----------

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
function ShareCode({ link }: { link: MpLink }) {
  const url = linkFor(link);
  const field = useRef<HTMLInputElement>(null);
  const [said, setSaid] = useState('');
  const pick = () => {
    field.current?.focus();
    field.current?.select();
    setSaid(tx('Selected: copy it with your keyboard.'));
  };
  const copy = () => {
    try {
      if (!navigator.clipboard) return pick();
      navigator.clipboard.writeText(url).then(() => (setSaid(tx('Link copied.')), sfx('sent')), pick);
    } catch {
      pick();
    }
  };
  return (
    <div className="mp-share stack">
      <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="mp-code" aria-label={t('Code {code}', { code: link.code.split('').join(' ') })}>
          {link.code}
        </span>
        <button className="btn with-icon" onClick={copy}>
          <Icon name="share" size={20} />
          {t('Copy the link')}
        </button>
      </div>
      <input ref={field} readOnly value={url} aria-label={t('Link to send')} onFocus={(e) => e.currentTarget.select()} />
      <small className="muted" aria-live="polite">
        {said ? t(said) : t('Send the code or the link. A friend opens Play with friends and types the code, or just opens the link.')}
      </small>
    </div>
  );
}

/** A career's few big numbers, as a challenge compares them. */
function Line({ rec }: { rec: CareerRecord }) {
  return (
    <span className="mp-line">
      <b>{idx(rec)}</b> {t('index')} · {t('peak {n}', { n: Math.round(rec.peak) })} · {rec.titles === 1 ? t('1 title') : t('{n} titles', { n: rec.titles })} · {rec.allStars} All-Star · {rec.mvps} MVP
    </span>
  );
}

const prospectText = (c: Challenge): string => {
  const i = c.prospect.input;
  const arch = ARCHETYPES[i.pos]?.[i.archetype]?.name ?? '';
  return `${i.name}, #${i.number} · ${NAMES.pos[i.pos]} · ${arch} · ${t('focus {list}', { list: both(i.focus.map((k) => NAMES.attr[k])) })}`;
};

/** Round 35 (owner: "try to make a chat below the leaderboard so that the users can communicate"):
 * a challenge's or a class's chat, for its people only (the server checks), the latest 50 lines,
 * new ones every ten seconds. Lines are plain text. */
function MpChat({ mp, room, code, compact }: { mp: Multiplayer; room: Room; code: string; compact?: boolean }) {
  const [lines, setLines] = useState<ChatLine[] | null | 'error' | undefined>(undefined);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const box = useRef<HTMLOListElement>(null);
  const pull = useMemo(() => () => mp.chat(room, code).then((x) => setLines((old) => (x === 'error' && old && old !== 'error' ? old : x))), [mp, room, code]);
  useEffect(() => {
    void pull();
    const t = window.setInterval(() => void pull(), 10000);
    return () => window.clearInterval(t);
  }, [pull]);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);
  const say = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const r = await mp.say(room, code, username() || 'A friend', body);
    setSending(false);
    if (r === 'ok') {
      setText('');
      setErr('');
      sfx('sent');
      if (recordMp('chat')) achievementsNow();
      void pull();
    } else setErr(r === 'busy' ? tx('One line every few seconds.') : r === 'missing' ? tx('Only the people in it can talk here.') : MP_FAIL[r]);
  };
  if (lines === null)
    return <p className="small muted keep">{room === 'class' ? t('The class chat is for its members.') : t('The chat is for those who set or took this challenge.')}</p>;
  return (
    <div className={`mp-chat stack${compact ? ' compact' : ''}`}>
      <div className="kicker">{room === 'class' ? t('Class chat') : t('Challenge chat')}</div>
      <ol className="mp-chat-lines" ref={box} aria-live="polite" aria-label={t('Chat')}>
        {lines === undefined ? (
          <li className="muted">{t('Loading…')}</li>
        ) : lines === 'error' ? (
          <li className="muted">{t(MP_FAIL.error)}</li>
        ) : lines.length === 0 ? (
          <li className="muted">{t('No one has said anything yet.')}</li>
        ) : (
          lines.map((l) =>
            // round 35: class news, in the game's voice
            l.news ? (
              <li key={l.id} className="news">
                <Icon name="news" size={16} /> <span>{l.body}</span> <small className="muted">{ago(l.at)}</small>
              </li>
            ) : (
              <li key={l.id} className={l.mine ? 'mine' : undefined}>
                <b>{l.mine ? t('You') : l.name}</b> <span>{l.body}</span> <small className="muted">{ago(l.at)}</small>
              </li>
            ),
          )
        )}
      </ol>
      <div className="row mp-chat-say" style={{ gap: 6 }}>
        <input aria-label={t('Say something')} maxLength={CHAT_MAX} value={text} placeholder={username() ? t('Say something as {name}', { name: username() }) : t('Say something')} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void say()} />
        <button className="btn small" disabled={!text.trim() || sending} onClick={() => void say()}>
          {t('Send')}
        </button>
      </div>
      {err && <small style={{ color: 'var(--bad)' }}>{t(err)}</small>}
    </div>
  );
}

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
  if (c === undefined) return <p className="muted">{t('Looking up {code}…', { code })}</p>;
  if (c === null || c === 'error')
    return (
      <section className="card stack">
        <p>{t(c === null ? MP_FAIL.missing : MP_FAIL.error)}</p>
        <button className="btn ghost" onClick={back}>
          {t('Back')}
        </button>
      </section>
    );
  const rows = [{ id: 'maker', name: c.name, rec: c.rec, mine: c.mine, maker: true }, ...c.answers.map((a) => ({ ...a, maker: false }))].sort((a, b) => mpScore(b.rec) - mpScore(a.rec));
  const playable = !c.mine && !!cleanProspect(c.prospect);
  return (
    <section className="stack">
      <section className="card stack mp-challenge">
        <div className="kicker">{c.mine ? t('Your challenge') : t('{name}’s challenge', { name: c.name })} · {ago(c.at)}</div>
        <div className="sec-title">{c.prospect.input.name}</div>
        <p className="small">{prospectText(c)}</p>
        <p className="small muted desc">{t('The same seed and the same start page: the same high school, the same first tryout, the same league around him. What he becomes is up to the choices. A challenge career has no step back.')}</p>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th className="l">#</th>
                <th className="l">{t('Who')}</th>
                <th>{t('Index')}</th>
                <th>{t('Peak')}</th>
                <th>{t('Titles')}</th>
                <th>All-Star</th>
                <th>MVP</th>
                <th className="l">{t('Verdict')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={r.mine ? 'me' : undefined}>
                  <td className="l">{i + 1}</td>
                  <td className="l">
                    {r.name}
                    {r.maker ? ` (${t('set it')})` : ''}
                    {r.mine ? ` · ${t('you')}` : ''}
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
              {c.answers.some((a) => a.mine) ? t('Play it again (your best counts)') : t('Play this prospect')}
            </button>
          )}
          <button className="btn ghost" onClick={back}>
            {t('Back')}
          </button>
        </div>
        {playable && career && <p className="small muted keep">{t('Finish or leave the career you are playing first (New career in Settings), then come back.')}</p>}
      </section>
      <section className="card stack">
        <MpChat mp={mp} room="challenge" code={c.code} />
      </section>
      <section className="card stack">
        <div className="sec-title">{t('Send it on')}</div>
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
        <div className="sec-title">{t('Got a code?')}</div>
        <CodeEntry label={t('Open the challenge')} onOpen={setOpen} />
        <p className="small muted desc">{t('To make one: finish a Regular guy career, then press Challenge a friend on its last page.')}</p>
      </section>
      <section className="card stack">
        <div className="sec-title with-icon">
          <Icon name="live" size={24} />
          {t('Quick match')}
        </div>
        <p className="small muted desc">{t('Other players’ challenges from the last 30 days, the least answered first.')}</p>
        {quick === null ? (
          <p className="muted">{t('Loading…')}</p>
        ) : quick === 'error' ? (
          <p className="muted">{t(MP_FAIL.error)}</p>
        ) : quick.length === 0 ? (
          <p className="muted">{t('No open challenges right now. Make the first one.')}</p>
        ) : (
          <ul className="mp-list">
            {quick.map((q) => (
              <li key={q.code}>
                <button className="mp-row" onClick={() => setOpen(q.code)}>
                  <span>
                    <b>{q.rec.name}</b> <small className="muted">{t('by {name}', { name: q.name })} · {ago(q.at)} · {q.answers === 1 ? t('1 answer') : t('{n} answers', { n: q.answers })}</small>
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
          <div className="sec-title">{t('Yours')}</div>
          <ul className="mp-list">
            {mine.map((c) => {
              const best = [...c.answers].sort((a, b) => mpScore(b.rec) - mpScore(a.rec))[0];
              return (
                <li key={c.code}>
                  <button className="mp-row" onClick={() => setOpen(c.code)}>
                    <span>
                      <b>{c.rec.name}</b> <small className="muted">{c.mine ? t('you set it') : t('{name}’s', { name: c.name })} · {c.code} · {c.answers.length === 1 ? t('1 answer') : t('{n} answers', { n: c.answers.length })}</small>
                    </span>
                    <small>{best ? t('Best answer: {name}, {score} against {theirs}', { name: best.name, score: idx(best.rec), theirs: idx(c.rec) }) : t('No answers yet')}</small>
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
  const [tick, setTick] = useState(0);
  const [rivalErr, setRivalErr] = useState('');
  // round 35 (owner: "watch a friend's career ... of course"): one member's career, season by season
  const [watch, setWatch] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void mp.draftClass(code).then((x) => live && setK(x));
    return () => {
      live = false;
    };
  }, [mp, code, tick]);
  // round 35 (owner: "each user can send a rivalry to one other, and if they accept, they become draft rivals")
  const pickRival = async (to: string | null) => {
    const r = await mp.setRival(code, to);
    if (r === 'ok') {
      sfx(to ? 'versus' : 'click');
      setRivalErr('');
      setTick((n) => n + 1);
    } else setRivalErr(MP_FAIL[r]);
  };
  const table = useMemo(() => (k && k !== 'error' ? standings(k) : []), [k]);
  // first in a class where two or more have played: once a class
  useEffect(() => {
    if (k && k !== 'error' && table[0]?.m.mine && k.members.filter((m) => m.seasons.length || m.rec).length >= 2 && recordMp('classTop', k.code)) achievementsNow();
    // a crown from a classmate on one of his seasons (he cannot react to his own): once a class
    if (k && k !== 'error' && k.members.some((m) => m.mine && m.reacts?.some((r) => r.e === 'crown')) && recordMp('crowned', k.code)) achievementsNow();
  }, [k, table]);
  const years = useMemo(() => (k && k !== 'error' ? classYears(k) : []), [k]);
  if (k === undefined) return <p className="muted">{t('Looking up {code}…', { code })}</p>;
  if (k === null || k === 'error')
    return (
      <section className="card stack">
        <p>{t(k === null ? MP_FAIL.missing : MP_FAIL.error)}</p>
        <button className="btn ghost" onClick={back}>
          {t('Back')}
        </button>
      </section>
    );
  const me = k.members.find((m) => m.mine);
  const canJoin = (!me || me.seasons.length === 0) && (me || k.members.length < CLASS_MAX);
  const watched = watch ? k.members.find((m) => m.id === watch) : null;
  if (watched) return <FriendCareer mp={mp} k={k} m={watched} back={() => setWatch(null)} changed={() => setTick((n) => n + 1)} />;
  return (
    <section className="stack">
      <section className="card stack">
        <div className="kicker">
          {t('Draft class · {n} of {max} · started {when}', { n: k.members.length, max: CLASS_MAX, when: ago(k.at) })}
        </div>
        <div className="sec-title">{k.name}</div>
        <p className="small muted desc">{t('Up to twelve friends, each his college’s first option, all projected in the first round of the same NBA draft: every career here starts on draft night, on one seed. Each season posts its line when it ends, and each finished career its card.')}</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {canJoin && (
            <button className="btn" disabled={career} onClick={() => (sfx('roll'), setDraft({ code: k.code, name: k.name }))}>
              {me ? t('Start your career in it') : t('Join with a new career')}
            </button>
          )}
          <button className="btn ghost" onClick={back}>
            {t('Back')}
          </button>
        </div>
        {canJoin && career && <p className="small muted keep">{t('Finish or leave the career you are playing first (New career in Settings), then come back.')}</p>}
        {me && me.seasons.length > 0 && !me.rec && <p className="small muted keep">{t('Your career in this class carries on from Continue on the start page.')}</p>}
      </section>
      <ReunionNight k={k} />
      <section className="card stack">
        <div className="sec-title with-icon">
          <Icon name="podium" size={24} />
          {t('Standings')}
        </div>
        <p className="small muted desc">{t('By the best rating so far, then the honours. A finished career counts its card. Tap a friend to watch his career season by season. Send one classmate a rivalry; when he sends one back, you are rivals, and your teams’ meetings become rival nights.')}</p>
        {rivalErr && <p className="small" style={{ color: 'var(--bad)' }}>{t(rivalErr)}</p>}
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th className="l">#</th>
                <th className="l">{t('Friend')}</th>
                <th className="l">{t('Player')}</th>
                <th className="l">{t('Now')}</th>
                <th>{t('Peak')}</th>
                <th>NBA</th>
                <th>All-Star</th>
                <th>MVP</th>
                <th>{t('Titles')}</th>
                {me && <th className="l">{t('Rival')}</th>}
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => {
                const last = row.m.seasons[row.m.seasons.length - 1];
                const picked = me?.rival === row.m.id;
                const picksMe = !!me && row.m.rival === me.id;
                return (
                  <tr key={row.m.id} className={row.m.mine ? 'me' : undefined}>
                    <td className="l">{i + 1}</td>
                    <td className="l">
                      <button className="link-btn" onClick={() => setWatch(row.m.id)} aria-label={row.m.mine ? t('Watch your career') : t('Watch {name}’s career', { name: row.m.name })}>
                        {row.m.name}
                      </button>
                      {row.m.mine ? ` · ${t('you')}` : ''}
                    </td>
                    <td className="l">{row.m.rec?.name ?? last?.pn ?? '—'}</td>
                    <td className="l">{row.m.rec ? `${t('Retired')} · ${row.m.rec.tier}` : last ? `${LEVEL_SHORT[last.lv] ?? last.lv} · ${last.team} · ${t('age {n}', { n: last.age })}` : t('Not started')}</td>
                    <td>{row.peak || '—'}</td>
                    <td>{row.nba}</td>
                    <td>{row.allStars}</td>
                    <td>{row.mvps}</td>
                    <td>{row.titles}</td>
                    {me && (
                      <td className="l">
                        {row.m.mine ? null : picked && picksMe ? (
                          <span className="tag accent">{t('Rivals')}</span>
                        ) : picksMe ? (
                          <button className="btn small" onClick={() => void pickRival(row.m.id)}>
                            {t('Accept the rivalry')}
                          </button>
                        ) : picked ? (
                          <button className="btn ghost small" onClick={() => void pickRival(null)}>
                            {t('Sent · take back')}
                          </button>
                        ) : (
                          <button className="btn ghost small" onClick={() => void pickRival(row.m.id)}>
                            {t('Send a rivalry')}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {years.length > 0 && (
        <section className="card stack">
          <div className="sec-title">{t('Year by year')}</div>
          <p className="small muted desc">{t('Each friend’s season, with the best of the class that year marked.')}</p>
          <div className="tbl-wrap">
            <table className="mp-years">
              <thead>
                <tr>
                  <th className="l">{t('Year')}</th>
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
                            {y.best === m.id && <small className="mp-best-tag">{t('Best of the class')}</small>}
                            <ReactCounts m={m} year={y.year} />
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
      {me && (
        <section className="card stack">
          <MpChat mp={mp} room="class" code={k.code} />
        </section>
      )}
      <section className="card stack">
        <div className="sec-title">{t('Invite friends')}</div>
        {k.members.length < CLASS_MAX ? <ShareCode link={{ kind: 'class', code: k.code }} /> : <p className="small muted keep">{t('The class is full.')}</p>}
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
              <b>{x.name}</b> <small className="muted">{x.code} · {t('started {when}', { when: ago(x.at) })}</small>
            </span>
            <small>
              {t('{n} of {max} players', { n: x.n, max: CLASS_MAX })}
            </small>
          </button>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="stack">
      <section className="card stack">
        <div className="sec-title">{t('Start a class')}</div>
        <p className="small muted desc">{t('Name it, make your player, and send the code: up to twelve friends, first options from their colleges, start on the same draft night.')}</p>
        <div className="row mp-classes-new" style={{ gap: 8 }}>
          <input aria-label={t('Name of the class')} maxLength={40} value={title} placeholder={t('Class of the rooftop')} onChange={(e) => setTitle(cleanUsername(e.target.value, 40))} />
          <button className="btn" disabled={!title.trim() || isRude(title) || !name || career} onClick={() => (sfx('confirm'), setDraft({ name: title.trim() }))}>
            {t('Make your player')}
          </button>
        </div>
        {career && <p className="small muted keep">{t('Finish or leave the career you are playing first (New career in Settings).')}</p>}
      </section>
      <section className="card stack">
        <div className="sec-title">{t('Got a code?')}</div>
        <CodeEntry label={t('Open the class')} onOpen={setOpen} />
      </section>
      {mine && mine !== 'error' && mine.length > 0 && (
        <section className="card stack">
          <div className="sec-title">{t('Yours')}</div>
          {list(mine)}
        </section>
      )}
      <section className="card stack">
        <div className="sec-title with-icon">
          <Icon name="live" size={24} />
          {t('Quick match')}
        </div>
        <p className="small muted desc">{t('Classes from the last two weeks with a seat left.')}</p>
        {quick === null ? <p className="muted">{t('Loading…')}</p> : quick === 'error' ? <p className="muted">{t(MP_FAIL.error)}</p> : quick.length === 0 ? <p className="muted">{t('No open classes right now. Start one.')}</p> : list(quick)}
      </section>
    </section>
  );
}

// ---------- the page ----------

/** Round 39 (owner: "can you make the game multiplayer as well?"): the one way to play a friend live,
 * the Floor head to head, lives on the Floor mini-game's page. */
function FloorLive() {
  const setMini = useStore((s) => s.setMini);
  const open = useStore((s) => unlocked(s.road, 'minis'));
  return (
    <section className="card stack">
      <div className="sec-title with-icon">
        <Icon name="floor" size={28} />
        {t('Live: the Floor, head to head')}
      </div>
      <p className="small muted keep">{t('The last six minutes against a friend, both of you at the keys at once: one makes a room, the other types in its code.')}</p>
      {open ? (
        <button className="btn" onClick={() => setMini('floor')}>
          {t('Play a friend on the Floor')}
        </button>
      ) : (
        <>
          <p className="small muted keep">{unlockHint('minis')}</p>
          <div className="row-end">
            <UnlockButton />
          </div>
        </>
      )}
    </section>
  );
}

export function MultiplayerPage() {
  const setPage = useStore((s) => s.setPage);
  const mpOpen = useStore((s) => s.mpOpen);
  const openMp = useStore((s) => s.openMp);
  const mp = useMp();
  const [name, setName] = useState(username());
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
          <div className="kicker">{t('Multiplayer')} · Regular guy</div>
          <h1 className="hub-title with-icon">
            <Icon name="versus" size={40} />
            Play with friends
          </h1>
          <p className="small muted desc">{t('Two ways to play with friends, and nobody has to be on at the same time; and one live, on the Floor.')}</p>
        </div>
        {mp === null ? (
          <p className="muted">{t('Connecting…')}</p>
        ) : mp === false ? (
          <section className="card stack">
            <p className="keep">{t('Playing with friends needs the game’s own server, which this page cannot reach. It works on the website and in the itch.io download.')}</p>
            <a className="btn" href={SITE} target="_blank" rel="noreferrer">
              {t('Open the website')}
            </a>
          </section>
        ) : (
          <>
            {mp.kind === 'local' && <p className="small muted">Dev deck: a stand-in on this device with house players; nothing reaches the real server.</p>}
            <UsernameBox onSet={setName} />
            <div className="seg" role="group" aria-label={t('Kind of game')} data-tour="mp-tabs">
              <button className="with-icon" aria-pressed={tab === 'challenge'} onClick={() => (setTab('challenge'), openMp(null))}>
                <Icon name="versus" size={20} />
                {t('Challenge a friend')}
              </button>
              <button className="with-icon" data-mp-tab="class" aria-pressed={tab === 'class'} onClick={() => (setTab('class'), openMp(null))}>
                <Icon name="draftclass" size={20} />
                {t('Draft class')}
              </button>
            </div>
            {!name && <p className="small">{t('Pick your username first: it goes beside everything you post.')}</p>}
            {tab === 'challenge' ? <Challenges mp={mp} open={open} setOpen={setOpen} /> : <Classes mp={mp} open={open} setOpen={setOpen} name={name} />}
          </>
        )}
        <FloorLive />
      </section>
      <DevDoor />
    </div>
  );
}

// ---------- beside a career with friends ----------

/** Round 35 (owner: "for the multiplayer, a leaderboard should always appear on the side"): the
 * challenge's or the class's board, beside every tab of a career played with friends, with this
 * career as it stands now (the server's copy of it lags a season behind). Never folds. */
/** On the board: his rival in the class (and their rival nights), a request waiting for him, and
 * friends on his team this season (a duo, or a Big Three). */
function FriendsLine({ g, k }: { g: GameState; k: DraftClass }) {
  const openMp = useStore((s) => s.openMp);
  const rival = mutualRival(k);
  const asks = rivalRequests(k);
  const team = friendsOnTeam(g);
  const rec = rivalRecord(g);
  const pn = (m: ClassMember) => m.seasons[m.seasons.length - 1]?.pn ?? m.rec?.name ?? m.name;
  // a duo (or a Big Three) of friends: once a class
  useEffect(() => {
    let earned = team.length >= 1 && recordMp('friendDuo', k.code);
    if (team.length >= 2) earned = recordMp('friendTrio', k.code) || earned;
    if (earned) achievementsNow();
  }, [team.length, k.code]);
  if (!rival && !asks.length && !team.length) return null;
  return (
    <div className="mp-friends stack">
      {rival && (
        <p className="small keep with-icon">
          <Icon name="rival" size={18} />
          <span>
            {t('Rival:')} <b>{rival.name}</b> ({pn(rival)}) · {t('{w}–{l} in rival nights', { w: rec.w, l: rec.l })}
            {rec.sw + rec.sl > 0 ? ` · ${t('{w}–{l} in playoff series', { w: rec.sw, l: rec.sl })}` : ''}
          </span>
        </p>
      )}
      {asks.map((m) => (
        <p key={m.id} className="small keep">
          <b>{m.name}</b> {t('sent you a rivalry.')}{' '}
          <button className="btn ghost small" onClick={() => openMp({ kind: 'class', code: k.code })}>
            {t('Answer it')}
          </button>
        </p>
      ))}
      {team.length > 0 && (
        <p className="small keep with-icon">
          <Icon name="draftclass" size={18} />
          <span>
            {team.length > 1 ? t('A Big Three of friends: {list}', { list: both(team.map((x) => `${x.f.pn} (${x.f.name})`)) }) : t('A duo of friends: {list}', { list: both(team.map((x) => `${x.f.pn} (${x.f.name})`)) })}
          </span>
        </p>
      )}
    </div>
  );
}

export function MpBoard({ g }: { g: GameState }) {
  const openMp = useStore((s) => s.openMp);
  const mp = useMp();
  const code = g.mp?.challenge ?? g.mp?.klass ?? null;
  const kind: MpLink['kind'] = g.mp?.challenge ? 'challenge' : 'class';
  const [c, setC] = useState<Challenge | null>(null);
  const [k, setK] = useState<DraftClass | null>(null);
  const seasons = g.history.length;
  // fetched again after every season, and every minute while the page is open
  useEffect(() => {
    if (!mp || !code) return;
    let live = true;
    const pull = () => {
      if (kind === 'challenge') void mp.challenge(code).then((x) => live && x && x !== 'error' && setC(x));
      else void mp.draftClass(code).then((x) => live && x && x !== 'error' && setK(x));
    };
    pull();
    const t = window.setInterval(pull, 60000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [mp, code, kind, seasons]);
  // round 35: the class's lines, and his rival, copied into the career (engine/career/friends.ts)
  useEffect(() => {
    if (!k || !g.mp?.klass) return;
    const friends = friendsOf(k);
    const rival = mutualRival(k)?.id;
    if (JSON.stringify(friends) !== JSON.stringify(g.mp.friends ?? []) || rival !== g.mp.rival) {
      useStore.getState().mutate((x) => {
        if (x.mp) x.mp = { ...x.mp, friends, rival };
      });
    }
  }, [k, g.mp]);
  // this career so far: its card as if it ended today
  const now = useMemo(() => careerRecord(g), [seasons, g.step]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!code) return null;
  const rows: { id: string; name: string; score: number; peak: number; me: boolean; done: boolean }[] = [];
  if (kind === 'challenge' && c) {
    rows.push({ id: 'set', name: c.name, score: mpScore(c.rec), peak: c.rec.peak, me: false, done: true });
    for (const a of c.answers) if (!a.mine) rows.push({ id: a.id, name: a.name, score: mpScore(a.rec), peak: a.rec.peak, me: false, done: true });
  }
  if (kind === 'challenge') rows.push({ id: 'me', name: username() || t('You'), score: mpScore(now), peak: now.peak, me: true, done: g.step === 'retired' });
  rows.sort((a, b) => b.score - a.score);
  // the class, with this career's seasons as they are on this device
  const klass: DraftClass | null = kind === 'class' && k ? { ...k, members: k.members.map((m) => (m.mine ? { ...m, seasons: g.history.map((h) => seasonLine(h, g.player.name)), rec: g.step === 'retired' ? now : null } : m)) } : null;
  const table = klass ? standings(klass) : [];
  return (
    <section className="card stack mp-board" aria-label={kind === 'challenge' ? t('Challenge leaderboard') : t('Draft class leaderboard')}>
      <div className="sec-title with-icon">
        <Icon name={kind === 'challenge' ? 'versus' : 'draftclass'} size={24} />
        {kind === 'challenge' ? t('Challenge {code}', { code }) : (k?.name ?? t('Class {code}', { code }))}
      </div>
      {!mp ? (
        <p className="small muted keep">{t('The board lives on the game’s server: open the game on the website to see it.')}</p>
      ) : kind === 'challenge' ? (
        <ol className="mp-board-list">
          {(c ? rows : rows.filter((r) => r.me)).map((r, i) => (
            <li key={r.id} className={r.me ? 'me' : undefined}>
              <b>{i + 1}</b>
              <span>
                {r.name}
                {r.id === 'set' ? <small> {t('set it')}</small> : r.me && !r.done ? <small> {t('so far')}</small> : null}
              </span>
              <span className="num">{Math.round(r.score)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="mp-board-list">
          {table.map((row, i) => (
            <li key={row.m.id} className={row.m.mine ? 'me' : undefined}>
              <b>{i + 1}</b>
              <span>
                {row.m.name}
                {row.m.mine && !row.m.rec ? <small> {t('so far')}</small> : null}
              </span>
              <span className="num">
                {row.peak || '–'}
                {row.titles ? <small> · {t('{n}× ring', { n: row.titles })}</small> : row.allStars ? <small> · {row.allStars}× AS</small> : null}
              </span>
            </li>
          ))}
          {!k && <li className="muted">{t('Loading the class…')}</li>}
        </ol>
      )}
      {kind === 'class' && k && <FriendsLine g={g} k={k} />}
      <p className="small muted keep">
        {kind === 'challenge' ? t('By career index.') : t('By best rating so far, then honours.')} {t('Careers with friends count here, not on the community’s leaderboards.')}
      </p>
      <button className="btn ghost small" onClick={() => openMp({ kind, code })}>
        {kind === 'challenge' ? t('The whole challenge') : t('The whole class')}
      </button>
      {mp && <MpChat mp={mp} room={kind} code={code} compact />}
    </section>
  );
}

// ---------- on the retirement page ----------

/** What a finished career can do with friends: set a challenge from it, see how a challenge or a
 * draft class went. */
export function RetirementMp({ g, rec }: { g: GameState; rec: CareerRecord }) {
  const mutate = useStore((s) => s.mutate);
  const openMp = useStore((s) => s.openMp);
  const mp = useMp();
  const [name, setName] = useState(username());
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
  // the answer beat the career that set the challenge: once a challenge
  useEffect(() => {
    if (answering && theirs && mpScore(rec) > mpScore(theirs.rec) && recordMp('beat', answering)) achievementsNow();
  }, [answering, theirs, rec]);
  if (!mp || (!answering && !g.mp?.klass && !canChallenge(g) && !ranQuick(g))) return null;
  const make = async () => {
    if (!g.start) return;
    setBusy(true);
    setErr('');
    const r = await mp.makeChallenge(name, g.start, rec);
    setBusy(false);
    if (r.length === 6 && CODE_RE.test(r)) {
      sfx('versus');
      mutate((x) => (x.mp = { ...x.mp, made: r }));
      if (recordMp('made', r)) achievementsNow();
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
              {mine > target
                ? t('You beat {name}’s career: {mine} to {theirs}.', { name: theirs.name, mine, theirs: target })
                : mine === target
                  ? t('Dead even with {name}: {mine} each.', { name: theirs.name, mine })
                  : t('{name} still leads: {theirs} to your {mine}.', { name: theirs.name, theirs: target, mine })}
            </p>
          ) : (
            <p className="small">{t('Your answer to challenge {code} is on its way.', { code: answering })}</p>
          )}
          <button className="btn ghost small" onClick={() => openMp({ kind: 'challenge', code: answering })}>
            {t('See the challenge')}
          </button>
        </div>
      )}
      {g.mp?.klass && (
        <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="small">{t('The card goes to your draft class.')}</span>
          <button className="btn ghost small" onClick={() => openMp({ kind: 'class', code: g.mp!.klass! })}>
            {t('See the class')}
          </button>
        </div>
      )}
      {ranQuick(g) && !answering && <p className="small muted">{t('This career ran with Fast break or Sim, so it can’t be sent as a challenge: a friend answers at full pace, with neither.')}</p>}
      {canChallenge(g) && !answering && (
        <div className="stack" style={{ gap: 8 }}>
          {g.mp?.made ? (
            <ShareCode link={{ kind: 'challenge', code: g.mp.made }} />
          ) : (
            <>
              <p className="small">{t('Challenge a friend: they play this same prospect from the same start, and both cards go side by side.')}</p>
              {!name ? (
                <UsernameBox onSet={setName} />
              ) : (
                <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn" data-tour="mp-challenge" disabled={busy} onClick={() => void make()}>
                    {t('Challenge a friend')}
                  </button>
                  <small className="muted">{t('as {name}', { name })}</small>
                </div>
              )}
              {err && <p className="small" style={{ color: 'var(--bad)' }}>{t(err)}</p>}
            </>
          )}
        </div>
      )}
    </section>
  );
}
