// The League tab as pictures (round 28; on the Season tab since round 29, owner: "in the league tab, can you make it much more visual?
// use lots of graphs, icons, ... it's too text heavy now"): standings as win bars with each crest
// and the playoff line, the leaders in points, rebounds and assists as bar charts, the award
// voting as bars, and the champions as their title banners. Every bar is a row of pixel cells.

import type { GameState, League, Team } from '../../engine/types';
import { standings } from '../../engine/sim/leagueSim';
import { perGame } from '../../engine/sim/statModel';
import { NBA_TEAMS } from '../../content/teams';
import { seasonLabel } from '../format';
import { TeamArt } from '../art/Crest';
import { Icon } from '../art/Icon';
import { BannerArt } from '../art/Trophy';
import { styleLeague } from '../art/Player';
import { t, tx } from '../../i18n';

/** A bar of `cells` square cells, `value / max` of them lit in `color`. */
function PixelBar({ value, max, color, cells = 20, label }: { value: number; max: number; color: string; cells?: number; label: string }) {
  const lit = max > 0 ? Math.max(value > 0 ? 1 : 0, Math.round((value / max) * cells)) : 0;
  return (
    <svg className="px-bar" viewBox={`0 0 ${cells * 4} 4`} preserveAspectRatio="none" shapeRendering="crispEdges" role="img" aria-label={label}>
      {Array.from({ length: cells }, (_, i) => (
        <rect key={i} x={i * 4} y={0} width={3} height={4} fill={i < lit ? color : 'var(--line)'} />
      ))}
    </svg>
  );
}

const pct = (x: Team) => (x.w + x.l > 0 ? x.w / (x.w + x.l) : 0);

/** One conference (or the whole league): crest, name, the win bar, the record; a line after the playoff places. */
export function StandingsBars({ lg, teams, userId, cut }: { lg: League; teams: Team[]; userId: string | null; cut?: number }) {
  const rows = standings(teams);
  return (
    <ol className="lg-bars">
      {rows.map((x, i) => (
        <li key={x.id} className={`${x.id === userId ? 'me' : ''}${cut && i === cut - 1 ? ' cut' : ''}`}>
          <span className="lg-rank">{i + 1}</span>
          <TeamArt name={x.name} abbr={x.abbr || x.short} color={x.color} league={styleLeague(lg.level)} size={26} />
          <span className="lg-name">{lg.level === 'NBA' ? x.short || x.name : x.short}</span>
          <PixelBar value={pct(x)} max={1} color={x.color} label={t('{w} wins, {l} losses', { w: x.w, l: x.l })} />
          <span className="lg-rec">
            {x.w}–{x.l}
          </span>
        </li>
      ))}
    </ol>
  );
}

type Stat = 'pts' | 'reb' | 'ast';
const STAT: Record<Stat, { name: string; icon: string; short: string }> = {
  pts: { name: tx('Points'), icon: 'shoot', short: 'PPG' },
  reb: { name: tx('Rebounds'), icon: 'rebound', short: 'RPG' },
  ast: { name: tx('Assists'), icon: 'playmake', short: 'APG' },
};

/** The top five in a stat, as bars, with each player's crest. */
export function LeaderBars({ lg, stat, userName }: { lg: League; stat: Stat; userName: string }) {
  const rows = lg.teams
    .flatMap((x) => x.roster.map((p) => ({ p, club: x })))
    .filter((x) => x.p.s && x.p.s.gp >= 10)
    .map((x) => ({ ...x, v: perGame(x.p.s!, stat) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 5);
  if (!rows.length) return null;
  const max = rows[0].v;
  const S = STAT[stat];
  return (
    <div className="lg-leaders">
      <div className="lg-leaders-head with-icon">
        <Icon name={S.icon} size={26} />
        <b>{t(S.name)}</b>
      </div>
      <ol className="lg-bars">
        {rows.map(({ p, club, v }) => (
          <li key={p.id} className={p.name === userName ? 'me' : ''}>
            <TeamArt name={club.name} abbr={club.abbr || club.short} color={club.color} league={styleLeague(lg.level)} size={22} />
            <span className="lg-name">{p.name.split(' ').slice(-1)[0]}</span>
            <PixelBar value={v} max={max} color={club.color} label={`${v.toFixed(1)} ${S.short}`} />
            <span className="lg-rec">{v.toFixed(1)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Last season's award voting as bars (the votes each got), the user marked. */
export function VoteBars({ races }: { races: NonNullable<GameState['lastSummary']>['races'] }) {
  return (
    <div className="lg-votes">
      {races.map((r) => {
        const max = Math.max(1, ...r.top.map((x) => x.value));
        return (
          <div key={r.award} className="lg-leaders">
            <div className="lg-leaders-head with-icon">
              <Icon name={r.award === 'MVP' ? 'crown' : 'podium'} size={24} />
              <b>{r.award === 'MVP' ? t('MVP voting') : r.award}</b>
            </div>
            <ol className="lg-bars">
              {r.top.slice(0, 5).map((x, i) => (
                <li key={i} className={x.isUser ? 'me' : ''}>
                  <span className="lg-rank">{i + 1}</span>
                  <span className="lg-name">{x.name.split(' ').slice(-1)[0]}</span>
                  <PixelBar value={x.value} max={max} color={x.isUser ? 'var(--accent)' : 'var(--ink)'} label={`${x.name}, ${x.team}`} />
                  <span className="lg-rec">{x.team}</span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

const teamColor = (name: string): string => NBA_TEAMS.find((x) => `${x.city} ${x.nick}` === name || x.nick === name)?.color ?? '#495057';

/** The last NBA champions as their banners, newest first. */
export function ChampionStrip({ g }: { g: GameState }) {
  const rows = [...g.nbaHistory].reverse().slice(0, 8);
  if (!rows.length) return null;
  return (
    <div className="lg-champs" role="list">
      {rows.map((h) => (
        <figure key={h.year} className="lg-champ" role="listitem">
          <BannerArt kind="title" color={teamColor(h.champion)} lines={[String(h.year), h.champion.split(' ').slice(-1)[0]]} size={92} />
          <figcaption>
            <b>{seasonLabel(h.year)}</b>
            <small className="muted">{h.finals}</small>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
