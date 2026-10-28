// Renders whatever decision is at the front of the queue.

import { useState } from 'react';
import type { Decision, GameState, Offer } from '../../engine/types';
import type { LiveRequest } from '../../engine/career/live';
import { LEVELS } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import { useStore } from '../../store';
import { fmtMoney, ordinal } from '../format';
import { NBA_TEAMS } from '../../content/teams';

const TIER: Record<string, string> = { blue: 'Blue blood', power: 'Power program', major: 'Major conference', mid: 'Mid-major' };

function OfferCard({ o, onPick }: { o: Offer; onPick: () => void }) {
  const level = o.level === 'NCAA' && o.tier ? `NCAA · ${TIER[o.tier]}` : LEVELS[o.level].name;
  const money = o.level === 'NCAA' ? (o.kind === 'walkon' ? 'Walk-on' : 'Scholarship') : `${fmtMoney(o.salary)} × ${o.years} yr`;
  return (
    <button className="offer" style={{ ['--team' as string]: o.teamColor }} onClick={onPick}>
      <div className="team">{o.teamName}</div>
      <dl>
        <dt>Level</dt>
        <dd>{level}</dd>
        <dt>Role</dt>
        <dd>{NAMES.role[o.role]}</dd>
        <dt>Deal</dt>
        <dd>{money}</dd>
        <dt>Outlook</dt>
        <dd>{o.outlook}</dd>
        <dt>Last year</dt>
        <dd>{o.lastRecord}</dd>
      </dl>
      {o.note && <div className="muted small">{o.note}</div>}
    </button>
  );
}

function DraftBoard({ g }: { g: GameState }) {
  const d = g.draft;
  if (!d) return null;
  const name = (id: string) => NBA_TEAMS.find((t) => t.abbr === id);
  const shown = d.picks.filter((p) => p.pick <= 14 || p.isUser || (d.userPick && Math.abs(p.pick - d.userPick) <= 2));
  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>Pick</th>
            <th className="l">Team</th>
            <th className="l">Player</th>
            <th>Age</th>
            <th>OVR</th>
            <th className="l">From</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((p) => (
            <tr key={p.pick} className={p.isUser ? 'me' : ''}>
              <td>{p.pick}</td>
              <td className="l">
                <span className="sw" style={{ background: name(p.teamId)?.color }} />
                {p.teamId}
              </td>
              <td className="l">{p.name}</td>
              <td>{p.age}</td>
              <td>{p.ovr}</td>
              <td className="l">{p.from}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One or two plans for the half: tap to select, then start. */
function PlanPicker({ d }: { d: Decision }) {
  const choose = useStore((s) => s.choose);
  const [picked, setPicked] = useState<string[]>([]);
  const enabled = d.choices.filter((c) => !c.disabled);
  // with only one option (injured) there is nothing to combine
  if (enabled.length === 1) {
    const c = enabled[0];
    return (
      <div className="stack">
        <div className="sec-title">{d.title}</div>
        <p className="muted small">{d.text}</p>
        <div className="plans">
          <button className="choice" onClick={() => choose(c.id)}>
            <span className="label">{c.label}</span>
            <small>{c.detail}</small>
          </button>
        </div>
      </div>
    );
  }
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? [p[1], id] : [...p, id]));
  const name = (id: string) => d.choices.find((c) => c.id === id)?.label ?? id;
  return (
    <div className="stack">
      <div className="sec-title">{d.title}</div>
      <p className="muted small">{d.text}</p>
      <div className="plans">
        {d.choices.map((c) => {
          const on = picked.includes(c.id);
          return (
            <button key={c.id} className={`choice${on ? ' selected' : ''}`} aria-pressed={on} disabled={c.disabled} onClick={() => toggle(c.id)}>
              <span className="label">
                {on ? `${picked.indexOf(c.id) + 1}. ` : ''}
                {c.label}
              </span>
              <small>{c.detail}</small>
            </button>
          );
        })}
      </div>
      <button className="btn block" disabled={picked.length === 0} onClick={() => choose(picked.join('+'))}>
        {picked.length === 0 ? 'Pick one or two plans' : picked.length === 1 ? `Go with ${name(picked[0])}` : `Go with ${name(picked[0])} + ${name(picked[1])}`}
      </button>
    </div>
  );
}

function LiveView({ g, d }: { g: GameState; d: Decision }) {
  const choose = useStore((s) => s.choose);
  const r = d.data?.req as LiveRequest;
  const team = g.season ? (g.stage === 'NBA' ? g.nba : g.league)?.teams.find((t) => t.id === g.teamId) : null;
  const me = team?.short ?? 'You';
  const started = r.stage !== 'game';
  const l = r.line;
  return (
    <div className="stack live">
      <div>
        <div className="kicker">
          {r.round}
          {r.bestOf > 1 ? ` · Game ${r.game} · series ${r.wins}–${r.losses}` : ''}
        </div>
        <h2 className="title live-title">{d.title}</h2>
      </div>
      {started && (
        <>
          <div className="board live-board">
            <div className="cell">
              <div className="k">{me}</div>
              <div className="v">{r.us}</div>
            </div>
            <div className="cell">
              <div className="k">{r.stage === 'clutch' ? '0:14 Q4' : r.quarter === 1 ? 'Tip-off' : `End Q${r.quarter - 1}`}</div>
              <div className="v dim">—</div>
            </div>
            <div className="cell">
              <div className="k">{r.opp.split(' ').slice(-1)[0]}</div>
              <div className="v">{r.them}</div>
            </div>
          </div>
          {r.qs.length > 0 && (
            <div className="tbl-wrap">
              <table className="quarters">
                <thead>
                  <tr>
                    <th className="l">Team</th>
                    {r.qs.map((_, i) => (
                      <th key={i}>Q{i + 1}</th>
                    ))}
                    <th>T</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="me">
                    <td className="l">{me}</td>
                    {r.qs.map((q, i) => (
                      <td key={i}>{q[0]}</td>
                    ))}
                    <td>{r.us}</td>
                  </tr>
                  <tr>
                    <td className="l">{r.opp}</td>
                    {r.qs.map((q, i) => (
                      <td key={i}>{q[1]}</td>
                    ))}
                    <td>{r.them}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {l && l.min > 0 && (
            <p className="small">
              <b>{g.player.name}</b>: {l.pts} pts, {l.reb} reb, {l.ast} ast, {l.fgm}/{l.fga} FG, {l.stl} stl, {l.blk} blk
            </p>
          )}
        </>
      )}
      <p>{d.text}</p>
      {r.recent.length > 0 && (
        <div className="small muted">
          {r.recent.map((x, i) => (
            <div key={i}>{x}</div>
          ))}
        </div>
      )}
      <div className="choices">
        {d.choices.map((c, i) => (
          <button key={c.id} className={`choice${i === 0 && r.stage === 'game' ? ' primary' : ''}`} onClick={() => choose(c.id)}>
            <span className="label">
              {c.label} {c.risk && <span className={`risk risk-${c.risk.toLowerCase()}`}>{c.risk} risk</span>}
            </span>
            {c.detail && <small>{c.detail}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DecisionView({ g, d }: { g: GameState; d: Decision }) {
  const choose = useStore((s) => s.choose);
  const offers = (d.data?.offers as Offer[] | undefined) ?? [];
  const offerIds = new Set(offers.map((o) => o.id));
  const extra = d.choices.filter((c) => !offerIds.has(c.id));

  if (d.kind === 'live') return <LiveView g={g} d={d} />;

  if (d.kind === 'plan') return <PlanPicker d={d} />;

  if (d.kind === 'shop') {
    const items = d.choices.filter((c) => c.id !== 'leave');
    return (
      <div className="stack">
        <div>
          <div className="kicker">Offseason</div>
          <h2 className="title" style={{ fontFamily: 'var(--f-display)', fontSize: 28, textTransform: 'uppercase', lineHeight: 1 }}>
            {d.title}
          </h2>
        </div>
        <p>{d.text}</p>
        <div className="shop">
          {items.map((c) => {
            const [name, price] = c.label.split(' · ');
            return (
              <button key={c.id} className="item" disabled={c.disabled} onClick={() => choose(c.id)}>
                <span className="kicker">{c.tags?.[0]}</span>
                <span className="name">{name}</span>
                <span className="price">{price}</span>
                <small className="muted">{c.detail}</small>
              </button>
            );
          })}
        </div>
        <button className="choice" onClick={() => choose('leave')}>
          <span className="label">Leave the shop</span>
          <small>Save the money.</small>
        </button>
      </div>
    );
  }

  const isDraftNight = d.kind === 'info' && !!d.data?.draft;
  return (
    <div className="stack">
      <div>
        <div className="kicker">{kickerFor(d)}</div>
        <h2 className="title" style={{ fontFamily: 'var(--f-display)', fontSize: 28, textTransform: 'uppercase', lineHeight: 1 }}>
          {d.title}
        </h2>
      </div>
      <p>{d.text}</p>
      {isDraftNight && <DraftBoard g={g} />}
      {offers.length > 0 && (
        <div className="offers">
          {offers.map((o) => (
            <OfferCard key={o.id} o={o} onPick={() => choose(o.id)} />
          ))}
        </div>
      )}
      {extra.length > 0 && (
        <div className="choices">
          {extra.map((c, i) => (
            <button key={c.id} className={`choice${extra.length > 1 && i === 0 && d.kind !== 'event' ? ' primary' : ''}`} disabled={c.disabled} onClick={() => choose(c.id)}>
              <span className="label">
                {c.label} {c.risk && <span className={`risk risk-${c.risk.toLowerCase()}`}>{c.risk} risk</span>}
              </span>
              {c.detail && <small>{c.detail}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function kickerFor(d: Decision): string {
  switch (d.kind) {
    case 'event':
      return 'Turning point';
    case 'offers':
      return 'Decision';
    case 'declare':
    case 'withdraw':
      return 'NBA Draft';
    case 'summer':
      return 'Offseason';
    case 'retirePrompt':
      return 'Career';
    case 'assign':
      return 'Midseason';
    case 'national':
      return 'National team';
    default:
      return 'Update';
  }
}

export { ordinal };
