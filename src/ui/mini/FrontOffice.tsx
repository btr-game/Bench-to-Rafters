// Front Office screens (engine/mini/frontOffice.ts).

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as F from '../../engine/mini/frontOffice';
import type { FoState, Tactic } from '../../engine/mini/frontOffice';
import { fmtMoney } from '../../engine/economy/salary';
import { NbaBracket } from '../components/NbaBracket';
import { MiniBonus } from './MiniBonus';
import { ordinal } from '../format';
import { ATTRS } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import type { GenPlayer } from '../../engine/types';
import { useStore } from '../../store';
import { TeamArt } from '../art/Crest';
import { Icon } from '../art/Icon';
import { t, tx } from '../../i18n';

const PHASES: FoState['phase'][] = ['draft', 'market', 'tactic', 'results'];
const last = (name: string) => name.split(' ').slice(-1)[0];
const PHASE_NAME: Record<string, string> = { draft: tx('Draft'), market: tx('Trades and signings'), tactic: tx('Game plan'), results: tx('Season'), over: tx('The verdict') };

/** A player's ratings and outlook, shown when his row is tapped. */
function PlayerCard({ p, extra }: { p: GenPlayer; extra?: ReactNode }) {
  const r = F.ratingsOf(p);
  return (
    <div className="fo-card">
      <div className="small muted">
        {t('{pos} · age {age} · {outlook} · {salary} × {years} yr', { pos: p.pos, age: p.age, outlook: F.outlook(p), salary: fmtMoney(p.salary), years: p.contractYears })}
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
          <Row p={p} open={open === p.id} onTap={() => setOpen(open === p.id ? null : p.id)} sub={i < 5 ? t('Starter') : p.rookie ? t('Rookie') : undefined} />
          {open === p.id && (
            <PlayerCard
              p={p}
              extra={
                canRelease && (
                  <button className="btn ghost small" onClick={() => act((f) => F.release(f, p.id))}>
                    {t('Release (salary still counts this season)')}
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
  const master = useStore((s) => s.master);
  const recs = useMemo(() => (master ? [] : F.draftRecs(fo)), [fo, master]);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="card stack">
      <div className="row">
        <div className="sec-title">{onClock ? t('On the clock: pick {n}', { n: d.at + 1 }) : t('Draft')}</div>
        <div className="spacer" />
        <span className="small muted">{t('Your picks: {picks}', { picks: F.myPicks(fo).join(', ') || t('none') })}</span>
      </div>
      <p className="small muted">
        {t('Scouting points left:')} <b>{fo.scout}</b>. {t('Each point takes a closer look at one prospect: tighter ranges, then strengths and weaknesses, work ethic, and finally the medicals.')}
      </p>
      {recent.length > 0 && <div className="small muted">{t('Just went: {picks}', { picks: recent.map((c) => `${c.pick}. ${c.pr.p.name} (${c.takenBy})`).join(' · ') })}</div>}
      {recs.length > 0 && (
        <div className="fo-recs">
          <div className="kicker">{t("Scouts' board")}</div>
          {recs.map((r, k) => {
            const c = d.cls[r.i];
            return (
              <div key={c.pr.p.id} className={`fo-rec${k === 0 ? ' first' : ''}`}>
                <span className="fo-rec-n">{k + 1}</span>
                <div>
                  <b>
                    {c.pr.p.name} <span className="muted small">{t('{pos} · #{rank} on the consensus board', { pos: c.pr.p.pos, rank: c.rank })}</span>
                  </b>
                  <div className="small muted">{r.why.length ? r.why.join(' · ') : t('best value on the board')}</div>
                </div>
                {onClock && (
                  <button className="btn small" onClick={() => act((f) => F.draftPlayer(f, r.i))}>
                    {t('Draft')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
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
                  {t('{role} · now {lo}–{hi} · ceiling {top0}–{top1}', { role: rp.role, lo: rp.now[0], hi: rp.now[1], top0: rp.ceiling[0], top1: rp.ceiling[1] })}
                </span>
                {show && (
                  <div className="report small">
                    <div>{rp.type}</div>
                    {rp.strengths.length > 0 ? (
                      <div>{t('Strengths: {good} · Weaknesses: {bad}', { good: rp.strengths.join(', '), bad: rp.weaknesses.join(', ') })}</div>
                    ) : (
                      <div className="muted">{t('Scout him to see strengths and weaknesses.')}</div>
                    )}
                    <div>
                      {t('Work ethic:')} {rp.ethic ?? <span className="muted">{t('unknown (scout twice)')}</span>}
                    </div>
                    <div>
                      {t('Medical:')} {rp.medical ?? <span className="muted">{t('unknown (scout three times)')}</span>}
                    </div>
                  </div>
                )}
              </div>
              <div className="stack" style={{ gap: 6 }}>
                <button className="btn ghost small" disabled={fo.scout <= 0 || c.level >= 3} onClick={() => act((f) => F.scoutProspect(f, i))}>
                  {t('Scout')}
                </button>
                {onClock && (
                  <button className="btn small" onClick={() => act((f) => F.draftPlayer(f, i))}>
                    {t('Draft')}
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
  const ideas = useMemo(() => (target !== null ? F.tradeIdeas(fo, target) : []), [fo, target]);
  const board = useMemo(() => F.tradeBoard(fo), [fo]);
  const best = m.trades < F.FO.trades ? board.best : [];
  const signs = useMemo(() => F.signingRecs(fo), [fo]);
  const master = useStore((s) => s.master);
  const nowRank = F.rankAt(fo, F.strengthAfter(fo, -1, []));
  const room = F.capOf(fo) - F.payroll(fo);
  const mine = [...F.myTeam(fo).roster].sort((a, b) => b.ovr - a.ovr);
  const name = (id: number) => mine.find((p) => p.id === id)?.name ?? '';
  return (
    <>
      <div className={`cap-line${room < 0 ? ' over' : ''}`}>
        {t('{pay} of {cap}', { pay: fmtMoney(F.payroll(fo)), cap: fmtMoney(F.capOf(fo)) })} · {room >= 0 ? t('{money} room', { money: fmtMoney(room) }) : t('{money} over the cap', { money: fmtMoney(-room) })}
        {m.dead > 0 ? <> · {t('{money} dead', { money: fmtMoney(m.dead) })}</> : ''}
      </div>
      <div className="subtabs">
        {(
          [
            ['trades', t('Trades ({n} left)', { n: F.FO.trades - m.trades })],
            ['abroad', t('Abroad ({n} left)', { n: F.FO.signings - m.signings })],
            ['roster', t('Roster ({n})', { n: mine.length })],
          ] as const
        ).map(([k, label]) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'roster' && (
        <section className="card stack">
          <p className="small muted">{t('Tap a player for his ratings. Releasing frees a roster spot; his salary still counts this season.')}</p>
          <Roster fo={fo} act={act} canRelease />
        </section>
      )}

      {!master && (
        <section className="card stack fo-best">
          <div className="sec-title">{t('Your front office recommends')}</div>
          <p className="small muted">{t('Deals and signings that make your team better, from what your scouts have seen. Your team now: {rank} of 30.', { rank: ordinal(nowRank) })}</p>
          <div className="kicker">{t('Trades')}</div>
          {best.length === 0 && <div className="small muted">{m.trades >= F.FO.trades ? t('No trades left this summer.') : t('No trade they would accept moves you up right now. Try the targets below, or sign someone.')}</div>}
          {best.map((d) => {
            const tg = targets.find((x) => x.p.id === d.targetId)!;
            return (
              <div key={d.targetId} className="fo-deal">
                <div className="fo-deal-text">
                  <b>
                    {tg.p.pos} {tg.p.name} <span className="muted">{Math.round(tg.p.ovr)}</span>
                  </b>
                  <div className="small muted">
                    <span className="fo-from">
                      {t('from')} <Crest t={tg.team} size={18} /> {tg.team.abbr}
                    </span>{' '}
                    {t('for {players}', { players: d.ids.map((id) => `${last(name(id))} ${Math.round(mine.find((q) => q.id === id)?.ovr ?? 0)}`).join(' + ') })}
                  </div>
                  <div className="fo-gain up">{t('Your team: {before} → {after}', { before: ordinal(F.rankAt(fo, d.before)), after: ordinal(F.rankAt(fo, d.after)) })}</div>
                </div>
                <button className="btn small" onClick={() => act((f) => F.proposeTrade(f, d.targetId, d.ids))}>
                  {t('Trade')}
                </button>
              </div>
            );
          })}
          <div className="kicker">{t('Signings')}</div>
          {signs.length === 0 && <div className="small muted">{m.signings >= F.FO.signings ? t('No signings left this summer.') : t('Nobody you can afford would help right now.')}</div>}
          {signs.map(({ i, why }) => {
            const f = m.free[i];
            const rp = F.freeReport(f);
            return (
              <div key={f.p.id} className="fo-deal">
                <div className="fo-deal-text">
                  <b>
                    {f.p.pos} {f.p.name} <span className="muted">{rp.now[0]}–{rp.now[1]}</span>
                  </b>
                  <div className="small muted">
                    {f.from.replace(/ \(.*\)$/, '')} · {t('asks {money}', { money: fmtMoney(f.ask) })} · {why.join(' · ')}
                  </div>
                </div>
                <button className="btn small" onClick={() => act((x) => F.signFree(x, i))}>
                  {t('Sign')}
                </button>
              </div>
            );
          })}
        </section>
      )}

      {tab === 'trades' && (
        <section className="card stack">
          <p className="small muted">{best.length ? t('Or tap any target for his ratings and the offers they will accept. "Out of reach" means nothing on your roster gets it done.') : t('Tap any target for his ratings and the offers they will accept. "Out of reach" means nothing on your roster gets it done.')}</p>
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
                  sub={`${team.abbr} · ${fmtMoney(p.salary)}${board.tops[p.id] ? '' : ` · ${t('out of reach')}`}`}
                />
                {target === p.id && (
                  <PlayerCard
                    p={p}
                    extra={
                      <div className="stack" style={{ gap: 8 }}>
                        {ideas.length ? (
                          <div className="stack fo-ideas">
                            <div className="small">{t('Offers they will accept:')}</div>
                            {ideas.map((d) => (
                              <button key={d.ids.join('-')} className={`fo-idea${offer.join() === d.ids.join() ? ' on' : ''}`} onClick={() => setOffer(d.ids)}>
                                <span>{d.ids.map((id) => `${last(name(id))} ${Math.round(mine.find((q) => q.id === id)?.ovr ?? 0)}`).join(' + ')}</span>
                                <span className={`fo-gain ${d.gain > 0 ? 'up' : d.gain < 0 ? 'down' : ''}`}>
                                  {d.gain > 0 ? t('better') : d.gain < 0 ? t('weaker') : t('same')} · {ordinal(F.rankAt(fo, d.after))}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="small muted">{t('Nothing on your roster gets this one done without giving up someone better.')}</div>
                        )}
                        <div className="small">{t('Or build your own (up to three):')}</div>
                        <div className="offer-picks">
                          {mine.map((q) => (
                            <button key={q.id} className={`pick-chip${offer.includes(q.id) ? ' on' : ''}`} onClick={() => setOffer((o) => (o.includes(q.id) ? o.filter((x) => x !== q.id) : o.length >= 3 ? o : [...o, q.id]))}>
                              {last(q.name)} {Math.round(q.ovr)}
                            </button>
                          ))}
                        </div>
                        {read && (
                          <div className="small">
                            {t('Their front office:')} <b className={`mood m-${read.mood.split(' ')[0].toLowerCase()}`}>{read.mood}</b>
                            {!read.salaryOk && <span className="warn-text"> · {t('the salaries do not work')}</span>}
                            {read.salaryOk && <span className="muted"> · {t('your team would rank {rank}', { rank: ordinal(F.rankAt(fo, F.strengthAfter(fo, p.id, offer))) })}</span>}
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
                          {t('Make the offer')}
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
          <p className="small muted">{t('EuroLeague and leagues abroad. Their level is a guess until scouted (scouting points: {n}). Sign with cap room, the mid-level exception once a season, or the minimum.', { n: fo.scout })}</p>
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
                        {f.from.replace(/ \(.*\)$/, '')} · {t('asks {money}', { money: fmtMoney(f.ask) })}
                      </small>
                    </span>
                    <span className="fo-ovr">{f.signed ? t('Signed') : `${rp.now[0]}–${rp.now[1]}`}</span>
                  </button>
                  {openFree === i && (
                    <div className="fo-card">
                      <div className="small muted">
                        {f.from} · {t('age {n}', { n: f.p.age })} · {rp.type}
                        {rp.strengths.length ? <> · {t('good at {list}', { list: rp.strengths.join(', ').toLowerCase() })}</> : ''}
                      </div>
                      {f.level >= 2 && <PlayerCard p={f.p} />}
                      {!f.signed && (
                        <div className="row" style={{ gap: 8 }}>
                          <button className="btn ghost small" disabled={fo.scout <= 0 || f.level >= 2} onClick={() => act((x) => F.scoutFree(x, i))}>
                            {t('Scout ({n}/2)', { n: f.level })}
                          </button>
                          <button className="btn small" disabled={!how} onClick={() => act((x) => F.signFree(x, i))}>
                            {how === 'mle' ? t('Sign (mid-level)') : how ? t('Sign') : t('No room')}
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
        {t('Done: set the game plan')}
      </button>
    </>
  );
}

const TACTIC_ICON: Record<Tactic, string> = { pace: 'pace', defense: 'perimeter', star: 'spotlight', depth: 'swap' };

/** A team's crest, small, beside its name. */
const Crest = ({ t, size = 22 }: { t: { id: string; name: string; color: string }; size?: number }) => <TeamArt name={t.name} abbr={t.id} color={t.color} league="NBA" size={size} />;

/** The game plan (round 12b: the plans come first; the roster folds away underneath). */
function Tactics({ fo, act }: { fo: FoState; act: (fn: (f: FoState) => void) => void }) {
  const [show, setShow] = useState(false);
  const r = [...F.myTeam(fo).roster].sort((a, b) => b.ovr - a.ovr);
  const tactics = (Object.keys(F.TACTIC_LABEL) as Tactic[]).map((tac) => ({ tac, fit: F.tacticFit(fo, tac) })).sort((a, b) => b.fit - a.fit);
  const recOf = (w: string) => (w === 'Poor fit' ? 'low' : w === 'Okay' ? 'moderate' : 'high');
  return (
    <>
      <section className="card stack">
        <div className="sec-title">{t('Pick a game plan')}</div>
        <p className="small muted">{t('The plan that fits your roster adds to every game. Best fit first.')}</p>
        <div className="plans compact fo-plans">
          {tactics.map(({ tac, fit }) => {
            const w = F.fitWord(fit);
            return (
              <button key={tac} className="choice" onClick={() => act((f) => F.playSeason(f, tac))}>
                <span className="label with-icon">
                  <Icon name={TACTIC_ICON[tac]} size={26} />
                  {F.TACTIC_LABEL[tac].name}
                  <span className={`scout-rec rec-${recOf(w)}`}>{w}</span>
                </span>
                <small>{F.TACTIC_LABEL[tac].text}</small>
              </button>
            );
          })}
        </div>
      </section>
      <section className="card stack">
        <div className="row">
          <div className="sec-title">{t('Your rotation')}</div>
          <div className="spacer" />
          <button className="link-btn" aria-expanded={show} onClick={() => setShow(!show)}>
            {show ? t('Hide') : t('Full roster')}
          </button>
        </div>
        <div className="small fo-rotation">
          {r.slice(0, 8).map((p, i) => (
            <span key={p.id} className={i < 5 ? 'starter' : ''}>
              {p.pos} {last(p.name)} <b>{Math.round(p.ovr)}</b>
            </span>
          ))}
        </div>
        <div className={`lg-fold${show ? ' open' : ''}`}>
          <div>
            <Roster fo={fo} act={act} canRelease={false} />
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * The season, animated (round 12: "the season simulation seems abrupt"): the record counts up
 * game by game along a path that ends at the real record, the All-Star break and the final
 * standing get a line, then each playoff series he played appears in turn. Skip shows the end.
 */
function SeasonReel({ fo, onDone }: { fo: FoState; onDone: () => void }) {
  const last = fo.history[fo.history.length - 1];
  const team = F.myTeam(fo);
  const b = fo.world.nba?.bracket;
  const path = useMemo(() => {
    // a plausible order of wins and losses with exactly his record (seeded by the season)
    let x = (last.year * 2654435761 + last.w * 97) >>> 0 || 1;
    const rnd = () => ((x ^= x << 13), (x ^= x >>> 17), (x ^= x << 5), (x >>> 0) / 4294967296);
    const games = [...Array(last.w).fill(1), ...Array(last.l).fill(0)];
    for (let i = games.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [games[i], games[j]] = [games[j], games[i]];
    }
    return games as number[];
  }, [last]);
  const series = (b?.rounds ?? []).flatMap((r) => r.series.filter((s) => s.a === fo.mine || s.b === fo.mine).map((s) => ({ round: r.name, s })));
  const total = path.length + series.length + 1;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= total) {
      onDone();
      return;
    }
    const timer = setTimeout(() => setI((x) => x + 1), i < path.length ? 35 : 900);
    return () => clearTimeout(timer);
  }, [i, total, path.length, onDone]);
  const played = path.slice(0, Math.min(i, path.length));
  const w = played.filter((g) => g === 1).length;
  const l = played.length - w;
  const name = (id: string) => fo.world.nba?.teams.find((x) => x.id === id)?.short ?? id;
  const opp = (id: string) => fo.world.nba?.teams.find((x) => x.id === id);
  return (
    <section className="card stack fo-reel" style={{ borderTop: `5px solid ${team.color}` }}>
      <div className="kicker">{i < path.length ? t('Game {n} of {total}', { n: played.length, total: path.length }) : t('The postseason')}</div>
      <div className="row">
        <div className="rec-big">
          {w}–{l}
        </div>
        <div className="spacer" />
        <div className="streak">
          {played.slice(-12).map((g, k) => (
            <span key={k} className={g ? 'win' : 'loss'} />
          ))}
        </div>
      </div>
      {played.length >= 41 && <div className="small">{t('All-Star break: {w}–{l}.', { w: played.slice(0, 41).filter((g) => g === 1).length, l: 41 - played.slice(0, 41).filter((g) => g === 1).length })}</div>}
      {i >= path.length && (
        <div className="small">{t('Regular season over: {w}–{l}, {seed}.', { w: last.w, l: last.l, seed: last.seed <= 15 ? t('{place} in the {conf}', { place: ordinal(last.seed), conf: team.conf }) : '' })}</div>
      )}
      {series.slice(0, Math.max(0, i - path.length)).map(({ round, s }) => {
        const won = s.winner === fo.mine;
        const mine = s.a === fo.mine ? s.wa : s.wb;
        const theirs = s.a === fo.mine ? s.wb : s.wa;
        return (
          <div key={round} className={`fo-series ${won ? 'won' : 'lost'}`}>
            <span className="kicker">{round}</span>
            <b className="with-icon">
              {opp(s.a === fo.mine ? s.b : s.a) && <Crest t={opp(s.a === fo.mine ? s.b : s.a)!} size={24} />}
              {won ? t('Beat the {team} {us}–{them}', { team: name(s.a === fo.mine ? s.b : s.a), us: mine, them: theirs }) : t('Lost to the {team} {us}–{them}', { team: name(s.a === fo.mine ? s.b : s.a), us: mine, them: theirs })}
            </b>
          </div>
        );
      })}
      <button className="btn ghost small reel-skip" onClick={() => setI(total)}>
        {t('Skip')}
      </button>
    </section>
  );
}


export function FrontOffice() {
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const list = useMemo(() => F.franchises(seed), [seed]);
  const [fo, setFo] = useState<FoState | null>(null);
  const [reel, setReel] = useState(false);
  const act = (fn: (f: FoState) => void) => {
    if (!fo) return;
    const n = structuredClone(fo);
    fn(n);
    if (fo.phase === 'tactic' && n.phase === 'results') setReel(true);
    setFo(n);
  };

  if (!fo)
    return (
      <section className="stack">
        <div className="kicker">Front Office</div>
        <h2 className="title">{t('Pick your franchise')}</h2>
        <p className="small muted">{t('Three seasons. The first is a free pass; miss the playoffs in both of the next two and the owner fires you.')}</p>
        <div className="scout-list">
          {list.map((fr) => (
            <button key={fr.id} className="scout-row target fo-pick" style={{ borderLeft: `6px solid ${fr.color}` }} onClick={() => setFo(F.newFrontOffice(seed, fr.id))}>
              <Crest t={fr} size={40} />
              <div className="scout-main">
                <b>{fr.name}</b>
                <span className="small muted">{fr.tier}</span>
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
      <div className="row fo-head">
        <Crest t={team} size={60} />
        <div>
          <div className="kicker">{t('Front Office · season {n} of {total}', { n: fo.season, total: F.FO.seasons })}</div>
          <h2 className="title fo-team" style={{ ['--team' as string]: team.color }}>
            {team.name}
          </h2>
        </div>
      </div>
      <div className="stepper">
        {PHASES.map((p) => (
          <span key={p} className={fo.phase === p ? 'on' : ''}>
            {t(PHASE_NAME[p])}
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

      {(fo.phase === 'draft' || fo.phase === 'market' || fo.phase === 'tactic') && (
        <div key={`${fo.phase}-${fo.season}`} className="stack stage-in">
          {fo.phase === 'draft' && <Draft fo={fo} act={act} />}
          {fo.phase === 'market' && <Market fo={fo} act={act} />}
          {fo.phase === 'tactic' && <Tactics fo={fo} act={act} />}
        </div>
      )}
      {fo.phase === 'results' && last && reel && <SeasonReel fo={fo} onDone={() => setReel(false)} />}
      {(fo.phase === 'results' || fo.phase === 'over') && last && !reel && (
        <section className="card stack">
          <div className="sum-head">
            <div className="rec">
              {last.w}–{last.l}
            </div>
            <div>
              <div className="sec-title">{last.title ? t('Champions!') : last.exit}</div>
              <div className="small muted">
                {last.seed <= 15 ? t('{place} in the {conf}', { place: ordinal(last.seed), conf: team.conf }) : ''} · {F.TACTIC_LABEL[last.tactic].name} · {t('champion: {team}', { team: last.champion })}
              </div>
            </div>
          </div>
          {fo.world.nba?.bracket && <NbaBracket bracket={fo.world.nba.bracket} league={fo.world.nba} userTeamId={fo.mine} />}
          {fo.phase === 'results' && (
            <button className="btn block" onClick={() => act(F.nextSeason)}>
              {fo.fired ? t('The owner wants a word') : fo.season >= F.FO.seasons ? t('See the verdict') : t('On to the draft')}
            </button>
          )}
        </section>
      )}
      {fo.phase === 'over' && (
        <MiniBonus
          result={{ game: 'office', titles: fo.history.filter((h) => h.title).length, playoffs: fo.history.filter((h) => h.exit !== 'Missed the playoffs').length, seasons: fo.history.length, fired: fo.fired }}
        />
      )}
      {fo.phase === 'over' && (
        <section className="card stack">
          <div className="kicker">{t('The verdict')}</div>
          <div className="verdict">{F.grade(fo).letter}</div>
          <p>{F.grade(fo).text}</p>
          <button className="btn" onClick={() => setFo(null)}>
            {t('Run another franchise')}
          </button>
        </section>
      )}
      {fo.history.length > (reel ? 1 : 0) && (
        <section className="card stack">
          <div className="sec-title">{t('Your seasons')}</div>
          {(reel ? fo.history.slice(0, -1) : fo.history).map((h, i) => (
            <div key={i} className="small">
              {t('Season {n}: {w}–{l}, {exit} ({plan})', { n: i + 1, w: h.w, l: h.l, exit: h.exit.toLowerCase(), plan: F.TACTIC_LABEL[h.tactic].name })}
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
