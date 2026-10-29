// Front Office screens (engine/mini/frontOffice.ts).

import { useMemo, useState } from 'react';
import * as F from '../../engine/mini/frontOffice';
import type { FoState, Tactic } from '../../engine/mini/frontOffice';
import { fmtMoney } from '../../engine/economy/salary';
import { NbaBracket } from '../components/NbaBracket';
import { ordinal } from '../format';

const PHASES: FoState['phase'][] = ['draft', 'market', 'tactic', 'results'];
const PHASE_NAME: Record<string, string> = { draft: 'Draft', market: 'Trades and signings', tactic: 'Game plan', results: 'Season', over: 'The verdict' };

function Roster({ fo, act, canRelease }: { fo: FoState; act: (fn: (f: FoState) => void) => void; canRelease: boolean }) {
  const r = [...F.myTeam(fo).roster].sort((a, b) => b.ovr - a.ovr);
  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th className="l">Player</th>
            <th>Pos</th>
            <th>Age</th>
            <th>OVR</th>
            <th>Salary</th>
            <th>Yrs</th>
            {canRelease && <th />}
          </tr>
        </thead>
        <tbody>
          {r.map((p, i) => (
            <tr key={p.id} className={i < 5 ? 'me' : ''}>
              <td className="l">
                {p.name}
                {p.rookie ? ' (R)' : ''}
              </td>
              <td>{p.pos}</td>
              <td>{p.age}</td>
              <td>{Math.round(p.ovr)}</td>
              <td>{fmtMoney(p.salary)}</td>
              <td>{p.contractYears}</td>
              {canRelease && (
                <td>
                  <button className="link-btn" onClick={() => act((f) => F.release(f, p.id))}>
                    Release
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
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
  const [target, setTarget] = useState<number | null>(null);
  const [offer, setOffer] = useState<number[]>([]);
  const targets = F.tradeTargets(fo);
  const read = target !== null ? F.tradeRead(fo, target, offer) : null;
  const room = F.capOf(fo) - F.payroll(fo);
  const mine = [...F.myTeam(fo).roster].sort((a, b) => b.ovr - a.ovr);
  return (
    <>
      <section className="card stack">
        <div className="row">
          <div className="sec-title">Your roster</div>
          <div className="spacer" />
          <span className="small muted">{F.myTeam(fo).roster.length} players</span>
        </div>
        <div className={`cap-line${room < 0 ? ' over' : ''}`}>
          Payroll {fmtMoney(F.payroll(fo))} of a {fmtMoney(F.capOf(fo))} cap · {room >= 0 ? `${fmtMoney(room)} room` : `${fmtMoney(-room)} over`}
          {m.dead > 0 ? ` · ${fmtMoney(m.dead)} dead money` : ''}
        </div>
        <Roster fo={fo} act={act} canRelease />
      </section>

      <section className="card stack">
        <div className="row">
          <div className="sec-title">Trade market</div>
          <div className="spacer" />
          <span className="small muted">{F.FO.trades - m.trades} offers left</span>
        </div>
        <p className="small muted">Pick a target, then pick up to three of your players to send. Teams want value back: young upside counts, old contracts do not. Salaries must fit the cap or come within 125%.</p>
        <div className="scout-list">
          {targets.map(({ p, team }) => (
            <button key={p.id} className={`scout-row target${target === p.id ? ' on' : ''}`} onClick={() => setTarget(target === p.id ? null : p.id)}>
              <div className="scout-main">
                <b>
                  {p.name} <span className="muted">· {p.pos}, {p.age}</span>
                </b>
                <span className="small muted">
                  {team.name} · OVR {Math.round(p.ovr)} · {fmtMoney(p.salary)} × {p.contractYears} yr
                </span>
              </div>
            </button>
          ))}
        </div>
        {target !== null && (
          <div className="stack offer-box">
            <div className="small">Your offer:</div>
            <div className="offer-picks">
              {mine.map((p) => (
                <button key={p.id} className={`pick-chip${offer.includes(p.id) ? ' on' : ''}`} onClick={() => setOffer((o) => (o.includes(p.id) ? o.filter((x) => x !== p.id) : o.length >= 3 ? o : [...o, p.id]))}>
                  {p.name.split(' ').slice(-1)[0]} {Math.round(p.ovr)}
                </button>
              ))}
            </div>
            {read && offer.length > 0 && (
              <div className="small">
                Their front office: <b className={`mood m-${read.mood.split(' ')[0].toLowerCase()}`}>{read.mood}</b>
                {!read.salaryOk && <span className="warn-text"> · the salaries do not work</span>}
              </div>
            )}
            <button
              className="btn"
              disabled={!read || !read.salaryOk || offer.length === 0 || m.trades >= F.FO.trades}
              onClick={() => {
                act((f) => F.proposeTrade(f, target, offer));
                setOffer([]);
                setTarget(null);
              }}
            >
              Make the offer
            </button>
          </div>
        )}
      </section>

      <section className="card stack">
        <div className="row">
          <div className="sec-title">Europe and beyond</div>
          <div className="spacer" />
          <span className="small muted">
            {F.FO.signings - m.signings} signings left · scouting {fo.scout}
          </span>
        </div>
        <p className="small muted">Players from the EuroLeague and leagues abroad. Their level is a guess until your scouts go and see them. Sign with cap room, the mid-level exception (once a season) or the minimum.</p>
        <div className="scout-list">
          {m.free.map((f, i) => {
            const rp = F.freeReport(f);
            const how = F.signHow(fo, i);
            return (
              <div key={f.p.id} className="scout-row">
                <div className="scout-main">
                  <b>
                    {f.p.name} <span className="muted">· {f.p.pos}, {f.p.age}</span>
                  </b>
                  <span className="small muted">
                    {f.from} · {rp.type}
                  </span>
                  <span className="small">
                    Level {rp.now[0]}–{rp.now[1]} · asks {fmtMoney(f.ask)}
                    {rp.strengths.length ? ` · ${rp.strengths.join(', ')}` : ''}
                  </span>
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  {f.signed ? (
                    <span className="small">Signed</span>
                  ) : (
                    <>
                      <button className="btn ghost small" disabled={fo.scout <= 0 || f.level >= 2} onClick={() => act((x) => F.scoutFree(x, i))}>
                        Scout
                      </button>
                      <button className="btn small" disabled={!how} onClick={() => act((x) => F.signFree(x, i))} title={how ? '' : 'No room under the cap'}>
                        {how === 'mle' ? 'Sign (MLE)' : 'Sign'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
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
