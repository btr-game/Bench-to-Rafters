// The roster around him (round 24, career/roster.ts): the five that starts, the bench, the team's
// average ratings against its system, and what that does for the team's chemistry.

import { ATTRS, ROSTER_FIT } from '../../engine/balance';
import { benchOf, fiveOf, rosterAttrs, rosterFit } from '../../engine/career/roster';
import { TEAM_STYLES } from '../../engine/career/identity';
import { ARCHETYPES } from '../../engine/player/archetypes';
import type { AttrKey, Attrs, GameState, GenPlayer, Pos } from '../../engine/types';
import { NAMES } from '../../content/strings';
import { PlayerArt, kitFor, styleLeague } from '../art/Player';
import { Icon } from '../art/Icon';
import { Card } from './bits';
import { league as leagueOf, ovr, team as teamOf } from '../selectors';

const SHORT: Record<AttrKey, string> = { SHT: 'SHT', FIN: 'FIN', PLY: 'PLY', PER: 'PER', INT: 'INT', REB: 'REB', ATH: 'ATH', IQ: 'IQ' };

/** His two best ratings, the way a scout would sum him up. */
const tops = (a: Attrs): string =>
  [...ATTRS]
    .sort((x, y) => a[y] - a[x])
    .slice(0, 2)
    .map((k) => `${SHORT[k]} ${Math.round(a[k])}`)
    .join(' · ');

const word = (x: number, hi: string, mid: string, lo: string) => (x >= 0.3 ? hi : x <= -0.3 ? lo : mid);

function Row({ slot, name, pos, arch, ovr, age, attrs, me, kit, number }: { slot: string; name: string; pos: Pos; arch: string; ovr: number; age: number; attrs: Attrs; me?: boolean; kit: ReturnType<typeof kitFor>; number: number }) {
  return (
    <div className={`roster-row${me ? ' me' : ''}`}>
      <span className="roster-slot">{slot}</span>
      <PlayerArt name={name} number={number} pos={pos} kitData={kit} size={40} noBall />
      <span className="roster-name">
        <b>{me ? `${name} (you)` : name}</b>
        <small>
          {NAMES.pos[pos]} · {arch} · {age}
        </small>
      </span>
      <span className="roster-tops small">{tops(attrs)}</span>
      <b className="roster-ovr">{Math.round(ovr)}</b>
    </div>
  );
}

export function RosterCard({ g }: { g: GameState }) {
  const lg = leagueOf(g);
  const t = teamOf(g);
  if (!lg || !t || t.roster.length < 5) return null;
  const five = fiveOf(t.roster, g.player.pos);
  const bench = benchOf(
    t.roster,
    five.map((x) => x.p),
  );
  const fit = rosterFit(g, t, lg);
  const sys = TEAM_STYLES[fit.system];
  const kit = kitFor(t.name, t.abbr, t.color, 'home', styleLeague(g.stage));
  const mean = ATTRS.reduce((a, k) => a + fit.profile[k], 0) / ATTRS.length;
  const lo = Math.min(...ATTRS.map((k) => fit.profile[k]));
  const hi = Math.max(...ATTRS.map((k) => fit.profile[k]));
  const archOf = (p: GenPlayer) => (ARCHETYPES[p.pos][p.shape] ?? ARCHETYPES[p.pos][0]).name;
  const numberOf = (p: GenPlayer) => (p.id % 54) + 1;
  // him in his own spot, the other four around him
  const order: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
  return (
    <Card title="Roster" kicker={`${t.name} · plays ${sys.name.toLowerCase()} (${fit.his ? 'your call' : "the coach's system"})`} tour="roster" right={<Icon name="roster" size={34} />}>
      <div className="roster-fit">
        <div className={`roster-chip ${fit.label === 'Great fit' || fit.label === 'Good fit' ? 'good' : fit.label === 'Poor fit' ? 'bad' : ''}`}>
          <small>Roster fit</small>
          <b>{fit.label}</b>
        </div>
        <div className="roster-chip">
          <small>The five</small>
          <b>{fit.balance >= fit.identity ? word(fit.balance, 'Well balanced', 'A little uneven', 'Lopsided') : word(fit.identity, `Built for ${sys.name.toLowerCase()}`, 'Half a fit for the system', 'Wrong for the system')}</b>
        </div>
        <div className="roster-chip">
          <small>Bench</small>
          <b>{word(fit.depth, 'Deep', 'About usual', 'Thin')}</b>
        </div>
      </div>
      <div className="roster-profile" aria-label="The team's average ratings">
        {ATTRS.map((k) => {
          const v = fit.profile[k];
          const key = (sys.weights[k] ?? 0) > 0;
          return (
            <div key={k} className={`rp${key ? ' key' : ''}`} title={`${NAMES.attr[k]}: ${Math.round(v)}${key ? ` (${sys.name} leans on it)` : ''}`}>
              <i style={{ height: `${18 + ((v - lo) / Math.max(1, hi - lo)) * 82}%` }} className={v >= mean ? 'up' : ''} />
              <small>{SHORT[k]}</small>
            </div>
          );
        })}
      </div>
      <p className="small muted">
        The team's average ratings (the five counts three times the bench). Gold bars are the ones {sys.name.toLowerCase()} leans on. Chemistry is good when the profile is well spread, when it peaks where the system wants it, and when the bench is better than most.
      </p>
      <div className="roster-list">
        <div className="roster-head">Starting five</div>
        {order.map((slot) =>
          slot === g.player.pos ? (
            <Row key={slot} slot={slot} name={g.player.name} pos={g.player.pos} arch={g.player.archetype} ovr={ovr(g)} age={g.player.age} attrs={g.player.attrs} me kit={kit} number={g.player.number} />
          ) : (
            (() => {
              const x = five.find((f) => f.slot === slot);
              return x ? <Row key={slot} slot={slot} name={x.p.name} pos={x.p.pos} arch={archOf(x.p)} ovr={x.p.ovr} age={x.p.age} attrs={rosterAttrs(x.p)} kit={kit} number={numberOf(x.p)} /> : null;
            })()
          ),
        )}
        <div className="roster-head">Bench</div>
        {bench.map((p, i) => (
          <Row key={p.id} slot={i < ROSTER_FIT.bench ? `${i + 6}th` : '—'} name={p.name} pos={p.pos} arch={archOf(p)} ovr={p.ovr} age={p.age} attrs={rosterAttrs(p)} kit={kit} number={numberOf(p)} />
        ))}
      </div>
    </Card>
  );
}
