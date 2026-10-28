import type { AttrKey, GameState, SeasonRecord } from '../../engine/types';
import { canChangeFocus, canChangePosition, canRetire, heightMismatch, positionOptions, prompt } from '../../engine/flow';
import { useState } from 'react';
import { ATTRS, LEVELS } from '../../engine/balance';
import { NAMES, UI } from '../../content/strings';
import { useStore } from '../../store';
import { Banners, MilestoneStrip, ReactionCard, Scoreboard } from '../components/bits';
import { PlayerCard } from '../components/PlayerCard';
import { ScoutCard } from '../components/ScoutCard';
import { DecisionView } from './Decision';
import { fmtMoney, ht, ordinal, pg, seasonLabel, signed } from '../format';
import { team } from '../selectors';
import { perGame } from '../../engine/sim/statModel';

export function SeasonSummary({ rec }: { rec: SeasonRecord }) {
  const delta = rec.ovrEnd - rec.ovrStart;
  const l = rec.line;
  return (
    <div className="stack">
      <div className="sum-head">
        <div className="rec">
          {rec.w}–{rec.l}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="kicker">
            {seasonLabel(rec.year)} · {rec.teamName} · {LEVELS[rec.level].short}
          </div>
          <b>{rec.result}</b>
          <div className="muted small">
            {NAMES.role[rec.role]} · {l.gp > 0 ? `${l.gs} starts · ${(l.min / l.gp).toFixed(1)} MPG` : 'Did not play'}
          </div>
        </div>
      </div>
      <div className="ovr-move num">
        OVR {Math.round(rec.ovrStart)} → {Math.round(rec.ovrEnd)}{' '}
        <span className={delta >= 0 ? 'up' : 'down'}>
          {delta >= 0 ? '▲' : '▼'} {signed(delta)}
        </span>
      </div>
      <div className="kicker">Regular season</div>
      <Scoreboard line={l} />
      {rec.post.gp > 0 && (
        <p className="num small">
          Postseason · {rec.post.gp} games · {pg(rec.post, 'pts')} PTS · {pg(rec.post, 'reb')} REB · {pg(rec.post, 'ast')} AST
        </p>
      )}
      {rec.awards.length > 0 && <Banners items={rec.awards.map((a) => ({ label: a, gold: /Champion|MVP|Player of the Year|champion/.test(a) }))} />}
      {rec.races.some((r) => r.userRank !== null && r.userRank <= 10) && (
        <ul className="small" style={{ paddingLeft: 18 }}>
          {rec.races
            .filter((r) => r.userRank !== null && r.userRank <= 10)
            .map((r) => (
              <li key={r.award}>
                <b>{r.award}:</b> {r.userRank === 1 ? 'Won' : `${ordinal(r.userRank!)}`}
                {r.userRank !== 1 && r.top[0] ? `. Winner: ${r.top[0].name}, ${r.top[0].team}` : ''}
              </li>
            ))}
        </ul>
      )}
      {rec.bestGame?.line && (
        <p className="muted small">
          Best game: {rec.bestGame.line.pts} PTS, {rec.bestGame.line.reb} REB, {rec.bestGame.line.ast} AST vs {rec.bestGame.opp} ({rec.bestGame.res}{' '}
          {rec.bestGame.us}–{rec.bestGame.them})
        </p>
      )}
      {rec.salary > 0 && <p className="muted small">Salary this season: {fmtMoney(rec.salary)}</p>}
    </div>
  );
}

function SeasonHeader({ g }: { g: GameState }) {
  const t = team(g);
  const s = g.season;
  const stepName =
    g.step === 'preseason' ? 'Preseason' : g.step === 'midseason' ? 'Midseason' : g.step === 'postseason' ? 'Postseason' : g.step === 'summary' ? 'Season over' : g.step === 'offseason' ? 'Offseason' : '';
  return (
    <div className="turn-head">
      <div style={{ minWidth: 0 }}>
        <div className="kicker">
          {seasonLabel(g.year)} · {stepName}
        </div>
        <h2>{t ? t.name : 'Offseason'}</h2>
        {g.step === 'offseason' ? (
          <div className="muted small">{g.stage === 'NBA' || g.stage === 'GL' || g.stage === 'EU' || g.stage === 'INT' || g.stage === 'NCAA' ? LEVELS[g.stage].name : g.league?.label ? 'Youth basketball' : 'High school'}</div>
        ) : (
          s && <div className="muted small">{(s.level === 'HSV' || s.level === 'HSJV') && g.league?.label ? g.league.label : LEVELS[s.level].name}</div>
        )}
      </div>
      {t && s && g.step !== 'offseason' && (
        <div className="record">
          {t.w}–{t.l}
          <small>RECORD</small>
        </div>
      )}
    </div>
  );
}

function PlanOutcomes({ g, half }: { g: GameState; half?: number }) {
  const list = (g.season?.outcomes ?? []).filter((o) => half === undefined || o.half === half);
  if (list.length === 0) return null;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {list.map((o, i) => (
        <div key={i} className={`outcome ${o.outcome.split(' ')[0].toLowerCase()}`}>
          <div className="kicker">
            {o.half === 1 ? 'First half' : 'Second half'} · {NAMES.plan[o.plan]}
            {o.plan2 ? ` + ${NAMES.plan[o.plan2]}` : ''} · {o.outcome}
          </div>
          <div>
            {o.text}
          </div>
        </div>
      ))}
    </div>
  );
}

function Context({ g }: { g: GameState }) {
  const s = g.season;
  if (g.step === 'preseason' && s) {
    return (
      <div className="recap">
        <div className="kicker">Season preview</div>
        <div>
          Projected role: <b>{NAMES.role[s.role]}</b> (number {s.roleRank} on the depth chart).
        </div>
        {s.preReport && <div className="small">{s.preReport}</div>}
        {g.contract && g.stage !== 'HS' && g.stage !== 'NCAA' && (
          <div className="muted small">
            Contract: {fmtMoney(g.contract.salary)} a year, {g.contract.years} year{g.contract.years === 1 ? '' : 's'} left.
          </div>
        )}
      </div>
    );
  }
  if (g.step === 'midseason' && s) {
    const half = s.halfLines[0];
    return (
      <div className="stack">
        <div className="recap">
          <div className="kicker">Half report</div>
          {s.midReport.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          {s.preReport && <div className="muted small">Preseason: {s.preReport}</div>}
          {s.allStarRank !== undefined && (
            <div className="small">{s.allStar ? 'All-Star selection' : `All-Star voting: ${s.allStarRank}th in the conference`}</div>
          )}
        </div>
        <PlanOutcomes g={g} half={1} />
        {half && half.gp > 0 && <Scoreboard line={half} />}
      </div>
    );
  }
  if (g.step === 'summary' && s?.summary)
    return (
      <div className="stack">
        <SeasonSummary rec={s.summary} />
        <PlanOutcomes g={g} />
      </div>
    );
  if (g.step === 'offseason') {
    return (
      <div className="recap">
        <div className="kicker">Offseason · age {g.player.age}</div>
        {g.notes.length === 0 ? <div className="muted">A quiet summer.</div> : g.notes.map((n, i) => <div key={i}>{n}</div>)}
      </div>
    );
  }
  return null;
}

function Todo({ g }: { g: GameState }) {
  const items = [
    ...g.pending.slice(1).map((d) => d.title),
    ...g.player.programs.map((p) => `${p.name}: ${p.seasonsLeft} season${p.seasonsLeft === 1 ? '' : 's'} left`),
  ];
  return (
    <section className="card stack">
      <div className="sec-title">{UI.hub.todo}</div>
      {items.length === 0 ? (
        <p className="muted small">{UI.hub.nothingPending}</p>
      ) : (
        <ul className="small" style={{ paddingLeft: 18 }}>
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FocusCard({ g }: { g: GameState }) {
  const change = useStore((s) => s.changeFocus);
  const p = g.player;
  const [pick, setPick] = useState<AttrKey[]>(p.focus);
  const toggle = (k: AttrKey) => setPick((f) => (f.includes(k) ? f.filter((x) => x !== k) : f.length >= 2 ? [f[1], k] : [...f, k]));
  const same = pick.length === 2 && pick.every((k) => p.focus.includes(k));
  return (
    <section className="card stack">
      <div className="row">
        <div className="sec-title">Focus stats</div>
        <div className="spacer" />
        <span className="small muted">{p.focus.map((k) => NAMES.attr[k]).join(' + ')}</span>
      </div>
      <p className="small muted">Focus stats grow about twice as fast. Move your focus around to fill out every rating.</p>
      <div className="focus-grid">
        {ATTRS.map((k) => (
          <button key={k} className={`choice${pick.includes(k) ? ' selected' : ''}`} aria-pressed={pick.includes(k)} onClick={() => toggle(k)}>
            <span className="label">
              {NAMES.attr[k]} <span className="muted">{Math.round(p.attrs[k])}</span>
            </span>
          </button>
        ))}
      </div>
      <button className="btn ghost" disabled={pick.length !== 2 || same} onClick={() => change(pick)}>
        {same ? 'Pick two new focus stats' : `Focus on ${pick.map((k) => NAMES.attr[k]).join(' and ')}`}
      </button>
    </section>
  );
}

function NumberCard({ g }: { g: GameState }) {
  const change = useStore((s) => s.changeNumber);
  const [n, setN] = useState(String(g.player.number));
  const v = Number(n);
  const ok = n.trim() !== '' && Number.isInteger(v) && v >= 0 && v <= 99 && v !== g.player.number;
  return (
    <section className="card stack">
      <div className="row">
        <div className="sec-title">Jersey number</div>
        <div className="spacer" />
        <span className="small muted">Now #{g.player.number}</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input aria-label="New jersey number" type="number" min={0} max={99} value={n} onChange={(e) => setN(e.target.value)} style={{ maxWidth: 110 }} />
        <button className="btn ghost" disabled={!ok} onClick={() => change(v)}>
          Switch number
        </button>
      </div>
    </section>
  );
}

function PositionCard({ g }: { g: GameState }) {
  const change = useStore((s) => s.changePosition);
  const [open, setOpen] = useState(false);
  const p = g.player;
  const opts = positionOptions(g);
  const mm = heightMismatch(g);
  return (
    <section className={`card stack${mm ? ' warn-card' : ''}`}>
      <div className="row">
        <div className="sec-title">Position</div>
        <div className="spacer" />
        <span className="small muted">
          {NAMES.pos[p.pos]} · {ht(p.height)}
          {p.height < p.heightProj ? ` (projected ${ht(p.heightProj)})` : ''}
        </span>
      </div>
      {mm && (
        <p className="height-warn-text">
          <b>Size check:</b> {mm.text}
          {mm.better.length > 0 ? ` ${mm.better.map((o) => NAMES.pos[o.pos]).join(' or ')} would fit.` : ''}
        </p>
      )}
      {open || mm ? (
        <div className="stack" style={{ gap: 6 }}>
          {opts.map((o) => (
            <button key={o.pos} className="choice" disabled={!o.allowed} onClick={() => change(o.pos)}>
              <span className="label">
                {NAMES.pos[o.pos]} <span className="muted">· OVR {Math.round(o.ovr)}</span>
              </span>
              <small>{o.fit}</small>
            </button>
          ))}
          <p className="small muted">One move per offseason. Your OVR is re-weighted for the new spot, and the coach needs time to trust you there.</p>
        </div>
      ) : (
        <button className="btn ghost" onClick={() => setOpen(true)}>
          Try another position
        </button>
      )}
    </section>
  );
}

function RetireCard({ g }: { g: GameState }) {
  const retire = useStore((s) => s.retire);
  const [armed, setArmed] = useState(false);
  return (
    <section className="card stack">
      <div className="sec-title">Your call</div>
      <p className="small muted">
        You can hang it up between any two seasons. At {g.player.age}, with {g.history.filter((h) => h.level === 'NBA').length} NBA season
        {g.history.filter((h) => h.level === 'NBA').length === 1 ? '' : 's'} behind you.
      </p>
      {armed ? (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn danger" onClick={retire}>
            Yes, retire now
          </button>
          <button className="btn ghost" onClick={() => setArmed(false)}>
            Keep playing
          </button>
        </div>
      ) : (
        <button className="btn ghost" onClick={() => setArmed(true)}>
          Retire
        </button>
      )}
    </section>
  );
}

export function Home({ g }: { g: GameState }) {
  const advance = useStore((s) => s.advance);
  const pr = prompt(g);
  const last = g.lastSummary;
  return (
    <div className="home-grid">
      <div className="stack">
        <PlayerCard g={g} />
        <ScoutCard g={g} compact />
      </div>
      <div className="stack">
        <section className="card stack">
          <SeasonHeader g={g} />
          {g.result ? (
            <div className={`result-card${g.result.tierKey ? ` tier-${g.result.tierKey}` : ''}`}>
              <div className="kicker">
                {g.result.title} · {g.result.choice}
              </div>
              {g.result.tier && <span className="result-tier">{g.result.tier}</span>}
              <p className="result-text">{g.result.text}</p>
              {g.result.changes.length > 0 && (
                <div className="result-chips">
                  {g.result.changes.map((c, i) => (
                    <span key={i} className={`result-chip ${c.good ? 'up' : 'down'}`}>
                      {c.good ? '▲' : '▼'} {c.label} <b>{c.value}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            g.toast && <div className="toast">{g.toast}</div>
          )}
          <div className="stack fade-in" key={pr.type === 'decision' ? pr.decision.id : `${g.year}-${g.step}`}>
            <Context g={g} />
            {pr.type === 'decision' && <DecisionView g={g} d={pr.decision} />}
            {pr.type === 'advance' && (
              <button className="btn block" onClick={advance}>
                {pr.label}
              </button>
            )}
          </div>
        </section>
        <section className="card stack">
          <div className="sec-title">Milestones</div>
          <MilestoneStrip reached={g.milestones} />
        </section>
        <Todo g={g} />
        {canChangePosition(g) && <PositionCard g={g} />}
        {canChangeFocus(g) && <FocusCard g={g} />}
        {g.step === 'offseason' && g.stage !== 'RETIRED' && <NumberCard g={g} />}
        {canRetire(g) && <RetireCard g={g} />}
        {g.feed[0] && (
          <section className="card">
            <ReactionCard r={g.feed[0]} />
          </section>
        )}
        {last && g.step !== 'summary' && (
          <section className="card stack">
            <div className="kicker">Last season</div>
            <div className="small">
              {seasonLabel(last.year)} · {last.teamName}: {last.w}–{last.l}, {last.result}. {perGame(last.line, 'pts').toFixed(1)} PPG.
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
