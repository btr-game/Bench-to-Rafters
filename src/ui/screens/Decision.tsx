// Renders whatever decision is at the front of the queue.

import { announce, callFor } from '../announcer';
import { Icon } from '../art/Icon';
import { HeroArt, archPose } from '../art/Hero';
import { team as teamOf } from '../selectors';
import { StoryScene } from '../art/Scene';
import { BrandLogo, eventIcon } from '../art/careerArt';
import { SHIFT_COLOR, choiceIcon, shopIcon, shopShift } from '../art/icons';
import { useEffect, useState } from 'react';
import type { Decision, GameState, HalfPlan, Offer } from '../../engine/types';
import type { LiveRequest } from '../../engine/career/live';
import { LEVELS, ageEdge } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import { useStore } from '../../store';
import { brief, fmtMoney, ordinal } from '../format';
import { NBA_TEAMS } from '../../content/teams';
import { TimingMeter } from '../components/TimingMeter';
import { FinalsCourt } from '../components/FinalsCourt';
import { sfx } from '../sound';
import { negotiable, type Ask } from '../../engine/career/negotiate';
import { talksOpen } from '../../engine/levels';
import { StoryPage } from '../components/StoryPage';
import { t, tx } from '../../i18n';
import { SHOP_ITEMS } from '../../content/shop';
import { itemParts } from '../../engine/economy/shop';

const TIER: Record<string, string> = { blue: tx('Blue blood'), power: tx('Power program'), major: tx('Major conference'), mid: tx('Mid-major') };

/** A choice's risk, in the player's language. */
export const riskText = (r: 'Low' | 'Medium' | 'High'): string => (r === 'Low' ? t('Low risk') : r === 'Medium' ? t('Medium risk') : t('High risk'));

function OfferCard({ o, onPick }: { o: Offer; onPick: () => void }) {
  const level = o.level === 'NCAA' && o.tier ? `NCAA · ${t(TIER[o.tier])}` : LEVELS[o.level].name;
  const money = o.level === 'NCAA' ? (o.kind === 'walkon' ? t('Walk-on') : t('Scholarship')) : t('{money} × {n} yr', { money: fmtMoney(o.salary), n: o.years });
  return (
    <button className="offer" style={{ ['--team' as string]: o.teamColor }} onClick={onPick}>
      <div className="team">{o.teamName}</div>
      <dl>
        <dt>{t('Level')}</dt>
        <dd>{level}</dd>
        <dt>{t('Role')}</dt>
        <dd>{NAMES.role[o.role]}</dd>
        <dt>{t('Deal')}</dt>
        <dd>{money}</dd>
        <dt>{t('Outlook')}</dt>
        <dd>{o.outlook}</dd>
        <dt>{t('Last year')}</dt>
        <dd>{o.lastRecord}</dd>
      </dl>
      {o.note && <div className="muted small">{o.note}</div>}
    </button>
  );
}

/** Contract talks (round 25): ask for one thing at a time, twice at most; the answer comes at once. */
function Talks({ g, o, onSaid }: { g: GameState; o: Offer; onSaid: (text: string | null) => void }) {
  const talk = useStore((s) => s.negotiate);
  if (!talksOpen(g)) return null;
  if (!negotiable(o)) return o.asked ? <div className="small muted talk-done">{t('Talks are over: sign it or leave it.')}</div> : null;
  const ask = (a: Ask) => onSaid(talk(o.id, a));
  return (
    <div className="talks" data-tour="talks">
      <span className="kicker">{o.asked ? t('Ask for one more thing') : t('Ask for')}</span>
      <button className="btn small ghost" onClick={() => ask('money')}>{t('More money')}</button>
      <button className="btn small ghost" onClick={() => ask('years')}>{t('One more year')}</button>
      <button className="btn small ghost" onClick={() => ask('role')}>{t('A bigger role')}</button>
    </div>
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
            <th>{t('Pick')}</th>
            <th className="l">{t('Team')}</th>
            <th className="l">{t('Player')}</th>
            <th>{t('Age')}</th>
            <th>OVR</th>
            <th className="l">{t('From')}</th>
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

/** Round 28: the plans his age makes stronger, tagged on their cards. */
function AgeTag({ plan }: { plan: string }) {
  const age = useStore((s) => s.game?.player.age ?? 20);
  const edge = ageEdge(plan as HalfPlan, age);
  if (!edge) return null;
  return (
    <span className="plan-tag age" title={edge === 'young' ? t('Young legs: this plan does more for you, and is easier on the body, up to 23') : t('A veteran’s plan: it does more for you from 30')}>
      {edge === 'young' ? t('Young legs') : t('Veteran')}
    </span>
  );
}

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
                {t(c.label)}
                <AgeTag plan={c.id} />
                {c.risk && <span className={`risk risk-${c.risk.toLowerCase()}`}>{riskText(c.risk)}</span>}
              </span>
              <small>{c.detail && t(c.detail)}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }
  // the first pick is the main plan; a third tap replaces the side plan
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? [p[0], id] : [...p, id]));
  const name = (id: string) => t(d.choices.find((c) => c.id === id)?.label ?? id);
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
                {on && <span className={`plan-tag ${picked.indexOf(c.id) === 0 ? 'main' : 'side'}`}>{picked.indexOf(c.id) === 0 ? t('Main') : t('Side')}</span>}
                {t(c.label)}
                <AgeTag plan={c.id} />
                {c.risk && <span className={`risk risk-${c.risk.toLowerCase()}`}>{riskText(c.risk)}</span>}
              </span>
              <small>{c.detail && t(c.detail)}</small>
            </button>
          );
        })}
      </div>
      <button className="btn block" disabled={picked.length === 0} onClick={() => choose(picked.join('+'))}>
        {picked.length === 0 ? t('Pick one or two plans') : picked.length === 1 ? t('Go with {plan}', { plan: name(picked[0]) }) : t('Go with {main} (main) + {side} (side)', { main: name(picked[0]), side: name(picked[1]) })}
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
  const lg = g.season ? (g.stage === 'NBA' ? g.nba : g.league) : null;
  const team = lg?.teams.find((t) => t.id === g.teamId) ?? null;
  const me = team?.short ?? t('You');
  // round 35: the call before a rival series comes before any game, like a game's own pick
  const started = r.stage !== 'game' && r.stage !== 'rival';
  const l = r.line;
  const crunch = r.stage === 'crunch';
  // round 28: crunch time sounds out each trip (the first one, a new overtime, then how it went)
  useEffect(() => {
    if (!crunch) return;
    if (!r.last) sfx(r.ot ? 'buzzer' : 'clutch');
    else if (!r.last.good) sfx('rim');
    else sfx(r.last.word === 'STEAL' || r.last.word === 'BLOCK' || r.last.word === 'STOP' ? 'block' : 'swish');
    // round 32: the announcer
    const say = r.last && callFor(r.last.word, r.last.good, r.last.text);
    if (say) announce(say);
  }, [d.id, crunch, r.last, r.ot]);
  const opp = lg?.teams.find((t) => t.name === r.opp);
  return (
    <div className="stack live">
      <div>
        <div className="kicker">
          {r.round}
          {r.bestOf > 1 ? ` · ${t('Game {n} · series {w}–{l}', { n: r.game, w: r.wins, l: r.losses })}` : ''}
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
              <div className="k">{crunch ? (r.ot ? `OT${r.ot > 1 ? ` ${r.ot}` : ''}` : 'Q4') : r.stage === 'clutch' ? '0:14 Q4' : r.quarter === 1 ? t('Tip-off') : t('End Q{n}', { n: r.quarter - 1 })}</div>
              <div className={`v${crunch ? ' live-clock' : ' dim'}`}>{crunch ? r.clock : '—'}</div>
            </div>
            <div className="cell">
              <div className="k">{opp?.short ?? r.opp.split(' ').slice(-1)[0]}</div>
              <div className="v">{r.them}</div>
            </div>
          </div>
          {r.qs.length > 0 && (
            <div className="tbl-wrap">
              <table className="quarters">
                <thead>
                  <tr>
                    <th className="l">{t('Team')}</th>
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
              <b>{g.player.name}</b>: {l.pts} pts, {l.reb} reb, {l.ast} ast, {l.fgm}/{l.fga} FG, {l.ftm}/{l.fta} FT, {l.stl} stl, {l.blk} blk
            </p>
          )}
        </>
      )}
      {crunch && (
        <div className="stack fc-wrap" data-tour="live-crunch">
          <FinalsCourt me={g.player.name} number={g.player.number} us={{ name: me, color: team?.color ?? '#1F5FBF', team: team?.name, abbr: team?.abbr }} them={{ name: r.opp, color: opp?.color ?? '#495057', team: opp?.name, abbr: opp?.abbr }} level={g.stage} side={r.side ?? 'off'} last={r.last} home={r.home} wear={g.player.wardrobe?.on} />
          <div className={`fc-ball ${r.side === 'def' ? 'def' : 'off'}`}>
            <Icon name={r.side === 'def' ? 'lockdown' : 'ball'} size={22} />
            <b>{r.side === 'def' ? t('Their ball: call the defense') : t('Your ball: pick the play')}</b>
          </div>
          {r.last && <p className={`fc-last ${r.last.good ? 'good' : 'bad'}`}>{r.last.text}</p>}
        </div>
      )}
      <p>{brief(d.text, simple)}</p>
      {r.recent.length > 0 && !crunch && (
        <div className="small muted">
          {r.recent.map((x, i) => (
            <div key={i}>{x}</div>
          ))}
        </div>
      )}
      {timed ? (
        <div className="stack" data-tour="live-meter">
          <p className="small">{t('Stop the marker in the green. Dead centre and it is nearly automatic; late and it probably rims out.')}</p>
          <TimingMeter skill={timed === 'drive' ? g.player.attrs.FIN : g.player.attrs.SHT} label={timed === 'drive' ? t('Finish!') : t('Release!')} onTap={(at) => choose(`${timed}@${at}`)} />
        </div>
      ) : (
      <div className="choices">
        {d.choices.map((c, i) => (
          <button key={c.id} className={`choice${i === 0 && r.stage === 'game' ? ' primary' : ''}`} onClick={() => pick(c.id)}>
            <span className="label">
              {c.label} {c.risk && <span className={`risk risk-${c.risk.toLowerCase()}`}>{riskText(c.risk)}</span>}
            </span>
            {c.detail && <small>{c.detail}</small>}
          </button>
        ))}
      </div>
      )}
    </div>
  );
}

/** A shop item's effect in the player's language, a part at a time (round 40); the engine's English
 * if the item is not in the list. */
function shopDetail(id: string, en?: string): string {
  const it = SHOP_ITEMS.find((x) => x.id === id);
  if (!it) return en ?? '';
  const and = (xs: string[]) => (xs.length === 2 ? t('{a} and {b}', { a: xs[0], b: xs[1] }) : xs.join(', '));
  return itemParts(it)
    .map((p) => (p.what ? t(p.k, { what: and(p.what.map((w) => t(w))) }) : t(p.k)))
    .join(' · ');
}

export function DecisionView({ g, d }: { g: GameState; d: Decision }) {
  const choose = useStore((s) => s.choose);
  const simple = useStore((s) => s.simple);
  const master = useStore((s) => s.master);
  const offers = (d.data?.offers as Offer[] | undefined) ?? [];
  const offerIds = new Set(offers.map((o) => o.id));
  const [talk, setTalk] = useState<{ id: string; text: string } | null>(null);
  const said = talk?.id === d.id ? talk.text : null;
  const extra = d.choices.filter((c) => !offerIds.has(c.id));

  if (d.kind === 'live') return <LiveView g={g} d={d} />;

  if (d.kind === 'plan') return <PlanPicker d={d} />;

  // round 38: a story mode chapter, face to face
  if (d.kind === 'story') return <StoryPage g={g} d={d} />;

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
          <div className="kicker">{t('Offseason')}</div>
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
                <span className="kicker">{c.tags?.[0] && t(c.tags[0])}</span>
                <span className="name">{t(name)}</span>
                <span className="price">{price}</span>
                <small className="muted">{shopDetail(c.id, c.detail)}</small>
              </button>
            );
          })}
        </div>
        <button className="choice" data-enter onClick={() => choose('leave')}>
          <span className="label">
            {t('Leave the shop')} <kbd className="hide-touch">Enter</kbd>
          </span>
          <small>{t('Save the money.')}</small>
        </button>
      </div>
    );
  }

  const isDraftNight = d.kind === 'info' && !!d.data?.draft;
  return (
    <div className="stack">
      {(d.kind === 'event' || d.kind === 'press' || d.kind === 'brand' || isDraftNight) && <StoryScene g={g} title={d.title} kind={isDraftNight ? 'draft' : d.kind === 'event' ? undefined : d.kind} />}
      <div className={typeof d.data?.eventId === 'string' ? 'title-with-icon' : undefined}>
        {/* round 27: every event has a pixel icon of its own */}
        {typeof d.data?.eventId === 'string' && <Icon name={eventIcon(d.data.eventId)} size={48} />}
        <div>
          <div className="kicker">{kickerFor(d)}</div>
          <h2 className="title" style={{ fontFamily: 'var(--f-display)', fontSize: 28, textTransform: 'uppercase', lineHeight: 1 }}>
            {d.title}
          </h2>
        </div>
      </div>
      {!master && typeof d.data?.fit === 'string' && <span className="fit-tag">{t('Fits your game · {fit}', { fit: d.data.fit as string })}</span>}
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
            <div key={o.id} className="offer-wrap">
              <OfferCard o={o} onPick={() => choose(o.id)} />
              <Talks g={g} o={o} onSaid={(text) => setTalk(text ? { id: d.id, text } : null)} />
            </div>
          ))}
        </div>
      )}
      {said && <p className="small talk-said" role="status">{said}</p>}
      {extra.length > 0 && !isDraftNight && (
        <div className="choices">
          {extra.map((c, i) => (
            <button key={c.id} className={`choice${extra.length > 1 && i === 0 && d.kind !== 'event' ? ' primary' : ''}`} disabled={c.disabled} onClick={() => choose(c.id)}>
              <span className={`label${d.kind === 'brand' && c.id.includes(':') ? ' with-icon' : ''}`}>
                {d.kind === 'brand' && c.id.includes(':') && <BrandLogo name={c.id.split(':')[1]} color={(d.data?.colors as Record<string, string> | undefined)?.[c.id.split(':')[1]] ?? '#343A40'} size={30} />}
                {c.label} {c.risk && <span className={`risk risk-${c.risk.toLowerCase()}`}>{riskText(c.risk)}</span>}
              </span>
              {/* a press answer's tone is the point, so simple text keeps it */}
              {c.detail && <small className={d.kind === 'press' ? 'keep' : undefined}>{c.detail}</small>}
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
      return t('Turning point');
    case 'offers':
      return t('Decision');
    case 'declare':
    case 'withdraw':
      return t('NBA Draft');
    case 'summer':
      return t('Offseason');
    case 'retirePrompt':
      return t('Career');
    case 'assign':
      return t('Midseason');
    case 'national':
      return t('National team');
    case 'press':
      return t('Media day');
    case 'brand':
      return t('Endorsements');
    default:
      return t('Update');
  }
}

export { ordinal };
