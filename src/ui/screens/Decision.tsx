// Renders whatever decision is at the front of the queue.

import type { Decision, GameState, Offer } from '../../engine/types';
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

export function DecisionView({ g, d }: { g: GameState; d: Decision }) {
  const choose = useStore((s) => s.choose);
  const offers = (d.data?.offers as Offer[] | undefined) ?? [];
  const offerIds = new Set(offers.map((o) => o.id));
  const extra = d.choices.filter((c) => !offerIds.has(c.id));

  if (d.kind === 'plan') {
    return (
      <div className="stack">
        <div className="sec-title">{d.title}</div>
        <p className="muted small">{d.text}</p>
        <div className="plans">
          {d.choices.map((c) => (
            <button key={c.id} className="choice" disabled={c.disabled} onClick={() => choose(c.id)}>
              <span className="label">{c.label}</span>
              <small>{c.detail}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

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
                {c.label} {c.shownOdds !== undefined && <span className="odds">{Math.round(c.shownOdds * 100)}% chance</span>}
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
