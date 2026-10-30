// Renders whatever decision is at the front of the queue.

import { Icon } from '../art/Icon';
import { HeroArt, archPose } from '../art/Hero';
import { team as teamOf } from '../selectors';
import { StoryScene } from '../art/Scene';
import { SHIFT_COLOR, choiceIcon, shopIcon, shopShift } from '../art/icons';
import { useState } from 'react';
import type { Decision, GameState, Offer } from '../../engine/types';
import type { LiveRequest } from '../../engine/career/live';
import { LEVELS } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import { useStore } from '../../store';
import { brief, fmtMoney, ordinal } from '../format';
import { NBA_TEAMS } from '../../content/teams';
import { TimingMeter } from '../components/TimingMeter';

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
// round 24 (owner): a thin colour strip on each plan, like the shop's items, to tell them apart
const PLAN_TINT: Record<string, string> = {
  balanced: '#E2B33C',
  grind: '#E03131',
  recovery: '#2F9E44',
  spotlight: '#F76707',
  teamfirst: '#7048E8',
  shooting: '#FD7E14',
  strength: '#8B5A2B',
  playmaking: '#1C7ED6',
  defense: '#364FC7',
  offhand: '#0CA678',
  speed: '#FAB005',
  mentor: '#868E96',
};
const planTint = (id: string) => ({ ['--tile' as string]: PLAN_TINT[id] ?? 'var(--line)' });

function PlanPicker({ d }: { d: Decision }) {
  const choose = useStore((s) => s.choose);
  const [picked, setPicked] = useState<string[]>([]);
  const enabled = d.choices.filter((c) => !c.disabled);
  // one plan only (fast break, or injured): a tap picks it
  if (enabled.length === 1 || d.data?.single) {
    return (
      <div className="stack">
        <div className="sec-title">{d.title}</div>
        <p className="muted small prose">{d.text}</p>
        <div className={`plans${d.data?.single ? ' plan-groups' : ''}`}>
          {enabled.map((c) => (
            <button key={c.id} className="choice plan-card" style={planTint(c.id)} onClick={() => choose(c.id)}>
              <span className="label with-icon">
                <Icon name={choiceIcon(c.id)} size={26} />
                {c.label}
                {c.risk && <span className={`risk risk-${c.risk.toLowerCase()}`}>{c.risk} risk</span>}
              </span>
              <small>{c.detail}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }
  // the first pick is the main plan; a third tap replaces the side plan
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? [p[0], id] : [...p, id]));
  const name = (id: string) => d.choices.find((c) => c.id === id)?.label ?? id;
  return (
    <div className="stack">
      <div className="sec-title">{d.title}</div>
      <p className="muted small prose">{d.text}</p>
      <div className="plans">
        {d.choices.map((c) => {
          const on = picked.includes(c.id);
          return (
            <button key={c.id} className={`choice plan-card${on ? ' selected' : ''}`} style={planTint(c.id)} aria-pressed={on} disabled={c.disabled} onClick={() => toggle(c.id)}>
              <span className="label with-icon">
                <Icon name={choiceIcon(c.id)} size={26} />
                {on && <span className={`plan-tag ${picked.indexOf(c.id) === 0 ? 'main' : 'side'}`}>{picked.indexOf(c.id) === 0 ? 'Main' : 'Side'}</span>}
                {c.label}
                {c.risk && <span className={`risk risk-${c.risk.toLowerCase()}`}>{c.risk} risk</span>}
              </span>
              <small>{c.detail}</small>
            </button>
          );
        })}
      </div>
      <button className="btn block" disabled={picked.length === 0} onClick={() => choose(picked.join('+'))}>
        {picked.length === 0 ? 'Pick one or two plans' : picked.length === 1 ? `Go with ${name(picked[0])}` : `Go with ${name(picked[0])} (main) + ${name(picked[1])} (side)`}
      </button>
    </div>
  );
}

function LiveView({ g, d }: { g: GameState; d: Decision }) {
  const choose = useStore((s) => s.choose);
  const simple = useStore((s) => s.simple);
  const r = d.data?.req as LiveRequest;
  // round 25: the last possession is his to time; the meter decides the shot
  const [timed, setTimed] = useState<string | null>(null);
  const pick = (id: string) => (r.stage === 'clutch' && (id === 'pull' || id === 'drive') ? setTimed(id) : choose(id));
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
      <p>{brief(d.text, simple)}</p>
      {r.recent.length > 0 && (
        <div className="small muted">
          {r.recent.map((x, i) => (
            <div key={i}>{x}</div>
          ))}
        </div>
      )}
      {timed ? (
        <div className="stack" data-tour="live-meter">
          <p className="small">Stop the marker in the green. Dead centre and it is nearly automatic; late and it probably rims out.</p>
          <TimingMeter skill={timed === 'drive' ? g.player.attrs.FIN : g.player.attrs.SHT} label={timed === 'drive' ? 'Finish!' : 'Release!'} onTap={(t) => choose(`${timed}@${t}`)} />
        </div>
      ) : (
      <div className="choices">
        {d.choices.map((c, i) => (
          <button key={c.id} className={`choice${i === 0 && r.stage === 'game' ? ' primary' : ''}`} onClick={() => pick(c.id)}>
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

export function DecisionView({ g, d }: { g: GameState; d: Decision }) {
  const choose = useStore((s) => s.choose);
  const simple = useStore((s) => s.simple);
  const master = useStore((s) => s.master);
  const offers = (d.data?.offers as Offer[] | undefined) ?? [];
  const offerIds = new Set(offers.map((o) => o.id));
  const extra = d.choices.filter((c) => !offerIds.has(c.id));

  if (d.kind === 'live') return <LiveView g={g} d={d} />;

  if (d.kind === 'plan') return <PlanPicker d={d} />;

  // round 20: the late-career specialist roles, as cards with the player in each role's action
  if (d.kind === 'chaserRole') {
    const color = teamOf(g)?.color ?? '#1F5FBF';
    return (
      <div className="stack">
        <div className="sec-title">{d.title}</div>
        {!simple && <p className="muted small prose">{d.text}</p>}
        <div className="arch-cards">
          {d.choices.map((c) => (
            <button key={c.id} className="arch role-card" onClick={() => choose(c.id)}>
              <span className="arch-stage" style={{ ['--pos' as string]: color }}>
                <span className="pos-player">
                  <HeroArt pose={archPose(c.label, g.player.pos)} model={g.player.name} number={g.player.number} kit={{ base: color, ink: '#FFFFFF', trim: '#F4F4F4', word: '' }} size={132} />
                </span>
              </span>
              <h3>{c.label}</h3>
              <div className="muted small">{c.detail}</div>
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
        <p>{brief(d.text, simple)}</p>
        <div className="shop">
          {items.map((c) => {
            const [name, price] = c.label.split(' · ');
            return (
              <button key={c.id} className="item" disabled={c.disabled} onClick={() => choose(c.id)} style={{ ['--tile' as string]: SHIFT_COLOR[shopShift(c.id)] }}>
                <span className="shop-tile">
                  <Icon name={shopIcon(c.id, name)} shift={shopShift(c.id)} size={40} />
                </span>
                <span className="kicker">{c.tags?.[0]}</span>
                <span className="name">{name}</span>
                <span className="price">{price}</span>
                <small className="muted">{c.detail}</small>
              </button>
            );
          })}
        </div>
        <button className="choice" data-enter onClick={() => choose('leave')}>
          <span className="label">
            Leave the shop <kbd className="hide-touch">Enter</kbd>
          </span>
          <small>Save the money.</small>
        </button>
      </div>
    );
  }

  const isDraftNight = d.kind === 'info' && !!d.data?.draft;
  return (
    <div className="stack">
      {(d.kind === 'event' || isDraftNight) && <StoryScene g={g} title={d.title} kind={isDraftNight ? 'draft' : undefined} />}
      <div>
        <div className="kicker">{kickerFor(d)}</div>
        <h2 className="title" style={{ fontFamily: 'var(--f-display)', fontSize: 28, textTransform: 'uppercase', lineHeight: 1 }}>
          {d.title}
        </h2>
      </div>
      {!master && typeof d.data?.fit === 'string' && <span className="fit-tag">Fits your game · {d.data.fit as string}</span>}
      <p>{brief(d.text, simple)}</p>
      {isDraftNight && (
        <>
          {extra.map((c) => (
            <button key={c.id} className="btn block" onClick={() => choose(c.id)}>
              {c.label}
            </button>
          ))}
          <DraftBoard g={g} />
        </>
      )}
      {offers.length > 0 && (
        <div className="offers">
          {offers.map((o) => (
            <OfferCard key={o.id} o={o} onPick={() => choose(o.id)} />
          ))}
        </div>
      )}
      {extra.length > 0 && !isDraftNight && (
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
