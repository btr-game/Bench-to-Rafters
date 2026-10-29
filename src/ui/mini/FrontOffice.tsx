// Front Office screens (engine/mini/frontOffice.ts).

import { useMemo, useState, type ReactNode } from 'react';
import * as F from '../../engine/mini/frontOffice';
import type { FoState, Tactic } from '../../engine/mini/frontOffice';
import { fmtMoney } from '../../engine/economy/salary';
import { NbaBracket } from '../components/NbaBracket';
import { ordinal } from '../format';
import { ATTRS } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import type { GenPlayer } from '../../engine/types';

const PHASES: FoState['phase'][] = ['draft', 'market', 'tactic', 'results'];
const PHASE_NAME: Record<string, string> = { draft: 'Draft', market: 'Trades and signings', tactic: 'Game plan', results: 'Season', over: 'The verdict' };

/** A player's ratings and outlook, shown when his row is tapped. */
function PlayerCard({ p, extra }: { p: GenPlayer; extra?: ReactNode }) {
  const r = F.ratingsOf(p);
  return (
    <div className="fo-card">
      <div className="small muted">
        {p.pos} · age {p.age} · {F.outlook(p)} · {fmtMoney(p.salary)} × {p.contractYears} yr
      </div>
      <div className="fo-ratings">
        {ATTRS.map((k) => (
          <div key={k} className="fo-rating">
            <span>{NAMES.attr[k]}</span>
            <div className="track">
              <div className={`fill${r[k] >= 85 ? ' good' : r[k] < 60 ? ' bad' : ''}`} style={{ width: `${r[k]}%` }} />
            </div>
            <b>{r[k]}</b>
          </div>
        ))}
      </div>
      {extra}
    </div>
  );
}

/** One compact row; tap to open the player's card. */
function Row({ p, open, onTap, right, sub }: { p: GenPlayer; open: boolean; onTap: () => void; right?: ReactNode; sub?: string }) {
  return (
    <button className={`fo-row${open ? ' on' : ''}`} onClick={onTap} aria-expanded={open}>
      <span className="fo-pos">{p.pos}</span>
      <span className="fo-name">
        {p.name}
        {sub && <small>{sub}</small>}
      </span>
      <span className="fo-ovr">{Math.round(p.ovr)}</span>
      {right}
    </button>
  );
}

function Roster({ fo, act, canRelease }: { fo: FoState; act: (fn: (f: FoState) => void) => void; canRelease: boolean }) {
  const r = [...F.myTeam(fo).roster].sort((a, b) => b.ovr - a.ovr);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="fo-list">
      {r.map((p, i) => (
        <div key={p.id}>
          <Row p={p} open={open === p.id} onTap={() => setOpen(open === p.id ? null : p.id)} sub={i < 5 ? 'Starter' : p.rookie ? 'Rookie' : undefined} />
          {open === p.id && (
            <PlayerCard
              p={p}
              extra={
                canRelease && (
                  <button className="btn ghost small" onClick={() => act((f) => F.release(f, p.id))}>
                    Release (salary still counts this season)
                  </button>
                )
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Draft({ fo, act }: { fo: FoState; act: (fn: (f: FoState) => void) => void }) {
  const d = fo.draft!;
  const onClock = d.order[d.at] === fo.mine;
  const avail = d.cls.map((c, i) => ({ c, i })).filter((x) => !x.c.takenBy).slice(0, 20);
  const recent = d.cls.filter((c) => c.takenBy && c.pick).sort((a, b) => b.pick! - a.pick!).slice(0, 4);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="card stack">
      <div className="row">
        <div className="sec-title">{onClock ? `On the clock: pick ${d.at + 1}` : 'Draft'}</div>
        <div className="spacer" />
        <span className="small muted">Your picks: {F.myPicks(fo).join(', ') || 'none'}</span>
      </div>
      <p className="small muted">
        Scouting points left: <b>{fo.scout}</b>. Each point takes a closer look at one prospect: tighter ranges, then strengths and weaknesses, work ethic, and finally the medicals.
      </p>
      {recent.length > 0 && <div className="small muted">Just went: {recent.map((c) => `${c.pick}. ${c.pr.p.name} (${c.takenBy})`).join(' · ')}</div>}
      <div className="scout-list">
        {avail.map(({ c, i }) => {
          const rp = F.prospectReport(c);
          const show = open === i;
          return (
            <div key={c.pr.p.id} className="scout-row prospect">
              <div className="scout-main">
                <button className="legend-head" onClick={() => setOpen(show ? null : i)} aria-expanded={show}>
                  <b>
                    #{c.rank} {c.pr.p.name}
                  </b>
                  <span className="small muted">
                    {c.pr.p.pos} · {c.pr.p.age} · {c.pr.from} · {'●'.repeat(c.level)}
                    {'○'.repeat(3 - c.level)}
                  </span>
                </button>
                <span className="small">
                  {rp.role} · now {rp.now[0]}–{rp.now[1]} · ceiling {rp.ceiling[0]}–{rp.ceiling[1]}
                </span>
                {show && (
                  <div className="report small">
                    <div>{rp.type}</div>
                    {rp.strengths.length > 0 ? (
                      <div>
                        Strengths: {rp.strengths.join(', ')} · Weaknesses: {rp.weaknesses.join(', ')}
                      </div>
                    ) : (
                      <div className="muted">Scout him to see strengths and weaknesses.</div>
                    )}
                    <div>Work ethic: {rp.ethic ?? <span className="muted">unknown (scout twice)</span>}</div>
                    <div>Medical: {rp.medical ?? <span className="muted">unknown (scout three times)</span>}</div>
                  </div>
                )}
              </div>
              <div className="stack" style={{ gap: 6 }}>
                <button className="btn ghost small" disabled={fo.scout <= 0 || c.level >= 3} onClick={() => act((f) => F.scoutProspect(f, i))}>
                  Scout
                </button>
                {onClock && (
                  <button className="btn small" onClick={() => act((f) => F.draftPlayer(f, i))}>
                    Draft
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Market({ fo, act }: { fo: FoState; act: (fn: (f: FoState) => void) => void }) {
  const m = fo.market!;
  const [tab, setTab] = useState<'roster' | 'trades' | 'abroad'>('trades');
  const [target, setTarget] = useState<number | null>(null);
  const [offer, setOffer] = useState<number[]>([]);
  const [openFree, setOpenFree] = useState<number | null>(null);
  const targets = F.tradeTargets(fo);
  const read = target !== null && offer.length ? F.tradeRead(fo, target, offer) : null;
  const suggestion = useMemo(() => (target !== null ? F.suggestOffer(fo, target) : null), [fo, target]);
  const room = F.capOf(fo) - F.payroll(fo);
  const mine = [...F.myTeam(fo).roster].sort((a, b) => b.ovr - a.ovr);
  const name = (id: number) => mine.find((p) => p.id === id)?.name ?? '';
  return (
    <>
      <div className={`cap-line${room < 0 ? ' over' : ''}`}>
        {fmtMoney(F.payroll(fo))} of {fmtMoney(F.capOf(fo))} · {room >= 0 ? `${fmtMoney(room)} room` : `${fmtMoney(-room)} over the cap`}
        {m.dead > 0 ? ` · ${fmtMoney(m.dead)} dead` : ''}
      </div>
      <div className="subtabs">
        {(
          [
            ['trades', `Trades (${F.FO.trades - m.trades} left)`],
            ['abroad', `Abroad (${F.FO.signings - m.signings} left)`],
            ['roster', `Roster (${mine.length})`],
          ] as const
        ).map(([k, label]) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'roster' && (
        <section className="card stack">
          <p className="small muted">Tap a player for his ratings. Releasing frees a roster spot; his salary still counts this season.</p>
          <Roster fo={fo} act={act} canRelease />
        </section>
      )}

      {tab === 'trades' && (
        <section className="card stack">
          <p className="small muted">Tap a target to see his ratings and what it might take. The suggested offer is the least you would have to give up.</p>
          <div className="fo-list">
            {targets.map(({ p, team }) => (
              <div key={p.id}>
                <Row
                  p={p}
                  open={target === p.id}
                  onTap={() => {
                    setTarget(target === p.id ? null : p.id);
                    setOffer([]);
                  }}
                  sub={`${team.abbr} · ${fmtMoney(p.salary)}`}
                />
                {target === p.id && (
                  <PlayerCard
                    p={p}
                    extra={
                      <div className="stack" style={{ gap: 8 }}>
                        {suggestion ? (
                          <button className="btn ghost small" onClick={() => setOffer(suggestion)}>
                            Use suggested offer: {suggestion.map((id) => name(id).split(' ').slice(-1)[0]).join(' + ')}
                          </button>
                        ) : (
                          <div className="small muted">Nothing on your roster gets this one done.</div>
                        )}
                        <div className="small">Or build your own (up to three):</div>
                        <div className="offer-picks">
                          {mine.map((q) => (
                            <button key={q.id} className={`pick-chip${offer.includes(q.id) ? ' on' : ''}`} onClick={() => setOffer((o) => (o.includes(q.id) ? o.filter((x) => x !== q.id) : o.length >= 3 ? o : [...o, q.id]))}>
                              {q.name.split(' ').slice(-1)[0]} {Math.round(q.ovr)}
                            </button>
                          ))}
                        </div>
                        {read && (
                          <div className="small">
                            Their front office: <b className={`mood m-${read.mood.split(' ')[0].toLowerCase()}`}>{read.mood}</b>
                            {!read.salaryOk && <span className="warn-text"> · the salaries do not work</span>}
                          </div>
                        )}
                        <button
                          className="btn"
                          disabled={!read || !read.salaryOk || m.trades >= F.FO.trades}
                          onClick={() => {
                            act((f) => F.proposeTrade(f, p.id, offer));
                            setOffer([]);
                            setTarget(null);
                          }}
                        >
                          Make the offer
                        </button>
                      </div>
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'abroad' && (
        <section className="card stack">
          <p className="small muted">EuroLeague and leagues abroad. Their level is a guess until scouted (scouting points: {fo.scout}). Sign with cap room, the mid-level exception once a season, or the minimum.</p>
          <div className="fo-list">
            {m.free.map((f, i) => {
              const rp = F.freeReport(f);
              const how = F.signHow(fo, i);
              return (
                <div key={f.p.id}>
                  <button className={`fo-row${openFree === i ? ' on' : ''}`} onClick={() => setOpenFree(openFree === i ? null : i)}>
                    <span className="fo-pos">{f.p.pos}</span>
                    <span className="fo-name">
                      {f.p.name}
                      <small>
                        {f.from.replace(/ \(.*\)$/, '')} · asks {fmtMoney(f.ask)}
                      </small>
                    </span>
                    <span className="fo-ovr">{f.signed ? 'Signed' : `${rp.now[0]}–${rp.now[1]}`}</span>
                  </button>
                  {openFree === i && (
                    <div className="fo-card">
                      <div className="small muted">
                        {f.from} · age {f.p.age} · {rp.type}
                        {rp.strengths.length ? ` · good at ${rp.strengths.join(', ').toLowerCase()}` : ''}
                      </div>
                      {f.level >= 2 && <PlayerCard p={f.p} />}
                      {!f.signed && (
                        <div className="row" style={{ gap: 8 }}>
                          <button className="btn ghost small" disabled={fo.scout <= 0 || f.level >= 2} onClick={() => act((x) => F.scoutFree(x, i))}>
                            Scout ({f.level}/2)
                          </button>
                          <button className="btn small" disabled={!how} onClick={() => act((x) => F.signFree(x, i))}>
                            {how === 'mle' ? 'Sign (mid-level)' : how ? 'Sign' : 'No room'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <button className="btn block" onClick={() => act(F.toTactics)}>
        Done: set the game plan
      </button>
    </>
  );
}

export function FrontOffice() {
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const list = useMemo(() => F.franchises(seed), [seed]);
  const [fo, setFo] = useState<FoState | null>(null);
  const act = (fn: (f: FoState) => void) => {
    if (!fo) return;
    const n = structuredClone(fo);
    fn(n);
    setFo(n);
  };

  if (!fo)
    return (
      <section className="stack">
        <div className="kicker">Front Office</div>
        <h2 className="title">Pick your franchise</h2>
        <p className="small muted">Six seasons. After two seasons of grace, two missed postseasons in a row and the owner fires you.</p>
        <div className="scout-list">
          {list.map((t) => (
            <button key={t.id} className="scout-row target" style={{ borderLeft: `6px solid ${t.color}` }} onClick={() => setFo(F.newFrontOffice(seed, t.id))}>
              <div className="scout-main">
                <b>{t.name}</b>
                <span className="small muted">{t.tier}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    );

  const team = F.myTeam(fo);
  const last = fo.history[fo.history.length - 1];
  return (
    <section className="stack">
      <div className="row">
        <div>
          <div className="kicker">
            Front Office · season {fo.season} of {F.FO.seasons}
          </div>
          <h2 className="title" style={{ color: team.color }}>
            {team.name}
          </h2>
        </div>
      </div>
      <div className="stepper">
        {PHASES.map((p) => (
          <span key={p} className={fo.phase === p ? 'on' : ''}>
            {PHASE_NAME[p]}
          </span>
        ))}
      </div>
      {fo.news.length > 0 && fo.phase !== 'results' && (
        <div className="toast">
          {fo.news.map((n, i) => (
            <div key={i}>{n}</div>
          ))}
        </div>
      )}

      {fo.phase === 'draft' && <Draft fo={fo} act={act} />}
      {fo.phase === 'market' && <Market fo={fo} act={act} />}
      {fo.phase === 'tactic' && (
        <section className="card stack">
          <div className="sec-title">Your identity this season</div>
          <Roster fo={fo} act={act} canRelease={false} />
          <div className="plans">
            {(Object.keys(F.TACTIC_LABEL) as Tactic[]).map((t) => (
              <button key={t} className="choice" onClick={() => act((f) => F.playSeason(f, t))}>
                <span className="label">
                  {F.TACTIC_LABEL[t].name} <span className={`scout-rec rec-${F.fitWord(F.tacticFit(fo, t)) === 'Poor fit' ? 'low' : F.fitWord(F.tacticFit(fo, t)) === 'Okay' ? 'moderate' : 'high'}`}>{F.fitWord(F.tacticFit(fo, t))}</span>
                </span>
                <small>{F.TACTIC_LABEL[t].text}</small>
              </button>
            ))}
          </div>
        </section>
      )}
      {(fo.phase === 'results' || fo.phase === 'over') && last && (
        <section className="card stack">
          <div className="sum-head">
            <div className="rec">
              {last.w}–{last.l}
            </div>
            <div>
              <div className="sec-title">{last.title ? 'Champions!' : last.exit}</div>
              <div className="small muted">
                {last.seed <= 15 ? `${ordinal(last.seed)} in the ${team.conf}` : ''} · {F.TACTIC_LABEL[last.tactic].name} · champion: {last.champion}
              </div>
            </div>
          </div>
          {fo.world.nba?.bracket && <NbaBracket bracket={fo.world.nba.bracket} league={fo.world.nba} userTeamId={fo.mine} />}
          {fo.phase === 'results' && (
            <button className="btn block" onClick={() => act(F.nextSeason)}>
              {fo.fired ? 'The owner wants a word' : fo.season >= F.FO.seasons ? 'See the verdict' : 'On to the draft'}
            </button>
          )}
        </section>
      )}
      {fo.phase === 'over' && (
        <section className="card stack">
          <div className="kicker">The verdict</div>
          <div className="verdict">{F.grade(fo).letter}</div>
          <p>{F.grade(fo).text}</p>
          <button className="btn" onClick={() => setFo(null)}>
            Run another franchise
          </button>
        </section>
      )}
      {fo.history.length > 0 && (
        <section className="card stack">
          <div className="sec-title">Your seasons</div>
          {fo.history.map((h, i) => (
            <div key={i} className="small">
              Season {i + 1}: {h.w}–{h.l}, {h.exit.toLowerCase()} ({F.TACTIC_LABEL[h.tactic].name})
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
