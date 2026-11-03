// Season (with the league, round 29), Player and Records tabs.

import { LegacyTierList } from '../components/Legacy';
import { BannersAndRings, TrophyCabinet, trophyItems } from '../components/Trophies';
import { CareerHighs } from '../components/Highs';
import { NbaBracket } from '../components/NbaBracket';
import { TextBracket } from '../components/TextBracket';
import { useMemo, useState, type ReactNode } from 'react';
import { VenueArt, arenaOf, placeOf, venueOf, type VenueKind } from '../art/Venue';
import { TeamArt } from '../art/Crest';
import { Icon } from '../art/Icon';
import { PlayerArt, kitFor, styleLeague, type KitName } from '../art/Player';
import { JerseyArt } from '../art/Jersey';
import { EvolutionArt } from '../art/Evolution';
import { CareerJournal, CareerTimeline } from '../components/Timeline';
import { cityCultureOf } from '../../engine/career/cityCulture';
import { fanCultureOf } from '../../engine/career/fanCulture';
import { BodyCard } from '../components/BodyMap';
import { RosterCard } from '../components/TeamRoster';
import { PeopleCard } from '../components/PeopleCard';
import { NameCard } from '../components/NameCard';
import { LifeCard } from '../components/YourLife';
import { StrengthCard } from '../components/StrengthCard';
import { FlagArt } from '../art/Flag';
import { Badge } from '../art/Badge';
import { MiniGamesCard } from '../mini/MiniGames';
import { CareerLogCard } from './CareerLog';
import { LockerRoom } from '../components/LockerRoom';
import { AchievementsCard } from './Achievements';
import { earnedIn } from '../achievements';
import { CommunityCard } from './Community';
import { LOCK_MAX, LOG_MAX, logCards, logLocks } from '../careerLog';
import { MINI_NAMES } from '../../engine/career/miniBonus';
import type { GameLog, GameState, League, SeasonRecord, SeriesResult, StatLine } from '../../engine/types';
import { ATTRS, LEVELS } from '../../engine/balance';
import { ovrOf } from '../../engine/player/ovr';
import { standings } from '../../engine/sim/leagueSim';
import { addLine, emptyLine } from '../../engine/sim/statModel';
import { careerIndex, championships, count, legacyScore, nbaTitles, verdictFor } from '../../engine/awards/legacy';
import { NAMES } from '../../content/strings';
import { Card, Extra, FoldBox, Meter, Scoreboard } from '../components/bits';
import { AttrRows } from '../components/PlayerCard';
import { ScoutCard } from '../components/ScoutCard';
import { fmtMoney, ht, pct, pg, seasonLabel } from '../format';
import { ordinal } from '../format';
import { league as leagueOf, ovr, roleName, stageLine, team as teamOf } from '../selectors';
import { weightOf } from '../../engine/player/weight';
import { polyCells, type Pt } from '../art/pixel';
import { ChampionStrip, LeaderBars, StandingsBars, VoteBars } from '../components/LeagueVisuals';
import { leanLevel } from '../road';
import { t } from '../../i18n';

// ---------- Season ----------

function GameLogTable({ g }: { g: GameState }) {
  const s = g.season;
  if (!s) return <p className="muted">{t('No games yet.')}</p>;
  const games = [...(s.preGames ?? []), ...s.games, ...(s.cupGames ?? []), ...s.postGames];
  if (games.length === 0) return <p className="muted">{t('The season has not started. Play the first half from Home.')}</p>;
  return (
    <div className="tbl-wrap" style={{ maxHeight: 420 }}>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th className="l">{t('Opponent')}</th>
            <th className="l">{t('Result')}</th>
            <th>MIN</th>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>FG</th>
            <th>3P</th>
            <th>FT</th>
          </tr>
        </thead>
        <tbody>
          {games.map((x, i) => (
            <tr key={i}>
              <td>{x.post && x.post !== 'G League' ? (x.post === 'Preseason' ? 'Pre' : x.post.startsWith('NBA Cup') ? 'Cup' : 'P') : x.n}</td>
              <td className="l">
                {x.home ? 'vs' : '@'} {x.opp}
                {x.post ? <span className="muted"> · {x.post}</span> : null}
                {/* round 35: classmates in this game (engine/career/friendLeague.ts) */}
                {x.friends?.map((f, k) => (
                  <div key={k} className="small muted">
                    {f.mate ? `${t('With you:')} ` : ''}
                    {f.pn} ({f.name}): {f.pts} pts{f.reb !== undefined ? `, ${f.reb} reb` : ''}
                    {f.ast !== undefined ? `, ${f.ast} ast` : ''}
                  </div>
                ))}
              </td>
              <td className={`l ${x.res === 'W' ? 'w' : 'lo'}`}>
                {x.res} {x.us}–{x.them}
              </td>
              {x.line ? (
                <>
                  <td>{x.line.min}</td>
                  <td>{x.line.pts}</td>
                  <td>{x.line.reb}</td>
                  <td>{x.line.ast}</td>
                  <td>
                    {x.line.fgm}-{x.line.fga}
                  </td>
                  <td>
                    {x.line.tpm}-{x.line.tpa}
                  </td>
                  <td>
                    {x.line.ftm}-{x.line.fta}
                  </td>
                </>
              ) : (
                <td colSpan={7} className="l muted">
                  DNP
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeriesRow({ x, name, me, label }: { x: SeriesResult; name: (id: string) => string; me: boolean; label?: string }) {
  const games = x.games ?? [];
  const head = (
    <div className={`series${me ? ' me' : ''}`}>
      <span>
        {label ? <span className="muted">{label} · </span> : null}
        {x.winner === x.a ? <b>{name(x.a)}</b> : name(x.a)} vs {x.winner === x.b ? <b>{name(x.b)}</b> : name(x.b)}
      </span>
      <span>{games.length === 1 ? `${games[0][0]}–${games[0][1]}` : `${x.wa}–${x.wb}`}</span>
    </div>
  );
  if (games.length <= 1) return head;
  return (
    <details className="series-wrap">
      <summary>{head}</summary>
      <div className="series-games">
        {games.map(([a, b], i) => (
          <span key={i}>
            {t('Game {n}', { n: i + 1 })}: {name(x.a)} {a}, {name(x.b)} {b}
          </span>
        ))}
      </div>
    </details>
  );
}

function BracketView({ g }: { g: GameState }) {
  const lg = leagueOf(g);
  const b = lg?.bracket;
  if (!lg || !b) return <p className="muted">{t('The postseason bracket appears after the regular season.')}</p>;
  const name = (id: string) => lg.teams.find((t) => t.id === id)?.short ?? id;
  const rounds = lg.level === 'NCAA' ? b.rounds.slice(2) : b.rounds;
  const mine = (x: SeriesResult) => x.a === g.teamId || x.b === g.teamId;
  const graphic = lg.level === 'NBA' && b.rounds.length === 4;
  return (
    <div className="bracket">
      {graphic ? <NbaBracket bracket={b} league={lg} userTeamId={g.teamId} /> : <TextBracket b={b} league={lg} userTeamId={g.teamId} />}
      <div className="kicker">{t('Champion: {team}', { team: name(b.champion) })}</div>
      {b.mvps && b.mvps.length > 0 && (
        <div className="mvp-list">
          {b.mvps.map((m, i) => (
            <div key={i} className={`mvp small${m.isUser ? ' me' : ''}`}>
              <b>{m.award}</b>: {m.name} ({m.team})<div className="muted">{m.line}</div>
            </div>
          ))}
        </div>
      )}
      {/* round 29: on the Season tab the list folds away, so the standings stay near the top */}
      <details className="series-all">
        <summary className="sec-title">{lg.level === 'NBA' ? t('Every series') : t('Every game')}</summary>
        {b.playIn && b.playIn.length > 0 && (
          <div className="round">
            <div className="kicker">Play-In Tournament</div>
            {b.playIn.map((x, i) => (
              <SeriesRow key={i} x={x} name={name} me={mine(x)} label={x.label} />
            ))}
          </div>
        )}
        {rounds.map((r) => (
          <div className="round" key={r.name}>
            <div className="kicker">{r.name}</div>
            {r.series
              .filter((x) => lg.level !== 'NCAA' || r.series.length <= 16 || mine(x))
              .map((x, i) => (
                <SeriesRow key={i} x={x} name={name} me={mine(x)} />
              ))}
          </div>
        ))}
        <p className="muted small">{t('Tap a series to see every game.')}</p>
      </details>
    </div>
  );
}

/** The season's games with a line or a result, preseason and Cup left out. */
const realGames = (g: GameState) => (g.season ? [...g.season.games, ...g.season.postGames] : []);

/** The last ten results as colored blocks. */
function FormStrip({ games }: { games: GameLog[] }) {
  const last = games.slice(-10);
  if (last.length === 0) return null;
  return (
    <div className="form-strip" aria-label={t('Last {n}: {list}', { n: last.length, list: last.map((x) => x.res).join(' ') })}>
      {last.map((x, i) => (
        <span key={i} className={x.res === 'W' ? 'w' : 'l'} title={`${x.res} ${x.us}–${x.them} ${x.home ? 'vs' : '@'} ${x.opp}`}>
          {x.res}
        </span>
      ))}
    </div>
  );
}

function streakOf(games: GameLog[]): string {
  if (games.length === 0) return '—';
  const last = games[games.length - 1].res;
  let n = 0;
  for (let i = games.length - 1; i >= 0 && games[i].res === last; i--) n++;
  return `${last}${n}`;
}

/** His points, game by game: a bar per game, colored by the result. */
function PointsChart({ games }: { games: GameLog[] }) {
  const played = games.filter((x) => x.line);
  if (played.length < 3) return null;
  const max = Math.max(30, ...played.map((x) => x.line!.pts));
  const avg = played.reduce((sum, x) => sum + x.line!.pts, 0) / played.length;
  const w = 6;
  const h = 70;
  return (
    <figure className="pts-chart">
      <figcaption className="row">
        <span className="kicker">{t('Points, game by game')}</span>
        <span className="spacer" />
        <span className="small muted">
          <i className="key w" /> {t('win')} <i className="key l" /> {t('loss')} · {t('average {n}', { n: avg.toFixed(1) })}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${games.length * w} ${h}`} preserveAspectRatio="none" role="img" aria-label={t('Points per game, average {n}', { n: avg.toFixed(1) })}>
        {games.map((x, i) => {
          const v = x.line ? (x.line.pts / max) * (h - 4) : 2;
          return <rect key={i} x={i * w + 1} y={h - v} width={w - 2} height={v} className={x.line ? (x.res === 'W' ? 'w' : 'l') : 'dnp'} />;
        })}
        <line x1="0" x2={games.length * w} y1={h - (avg / max) * (h - 4)} y2={h - (avg / max) * (h - 4)} className="avg" />
      </svg>
    </figure>
  );
}

/** The team's second colour (its kit trim), for the stripe under the banner's top edge. */
function trimOf(g: GameState): string | undefined {
  const t = teamOf(g);
  return t ? kitFor(t.name, t.abbr, t.color, 'home', styleLeague(g.stage)).trim : undefined;
}

/** A page banner: art on the left, the headline, then the numbers that matter (round 14). */
function PageHero({ art, venue, place, arena, stripe, kicker, title, sub, color, stats, children }: { art?: ReactNode; venue: VenueKind; place?: string | null; arena?: string; stripe?: string; kicker: string; title: string; sub?: ReactNode; color?: string; stats: { k: string; v: ReactNode; tone?: 'good' | 'bad' }[]; children?: ReactNode }) {
  return (
    <header className="page-hero" style={{ ...(color ? { ['--team' as string]: color } : {}), ...(stripe ? { ['--team2' as string]: stripe } : {}) }}>
      <VenueArt kind={venue} place={place} arena={arena} />
      {art && <div className="hero-art">{art}</div>}
      <div className="hero-main">
        <div className="kicker">{kicker}</div>
        <h1 className="hero-title">{title}</h1>
        {sub && <div className="hero-sub">{sub}</div>}
        {children}
      </div>
      <dl className="hero-stats">
        {stats.map((x) => (
          <div key={x.k} className={x.tone ?? ''}>
            <dt>{x.k}</dt>
            <dd>{x.v}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

/** Round 29: the standings as win bars (round 28's League tab), his own conference first. */
function StandingsCard({ g, lg }: { g: GameState; lg: League }) {
  const mine = lg.teams.find((t) => t.id === g.teamId);
  if (lg.level === 'NBA') {
    const confs = mine?.conf === 'West' ? ['West', 'East'] : ['East', 'West'];
    return (
      <Card title={t('Standings')} fold="Standings" kicker={t('Top six to the playoffs, seven to ten to the play-in')} tour="season-standings">
        <div className="lg-confs">
          {confs.map((c) => (
            <div key={c} className="stack" style={{ gap: 6 }}>
              <div className="kicker">{c}ern Conference</div>
              <StandingsBars lg={lg} teams={lg.teams.filter((t) => t.conf === c)} userId={g.teamId} cut={6} />
            </div>
          ))}
        </div>
      </Card>
    );
  }
  const conf = lg.level === 'NCAA' && mine ? mine.conf : null;
  return (
    <Card title={t('Standings')} fold="Standings" kicker={conf ?? lg.label ?? LEVELS[lg.level].name} tour="season-standings">
      <StandingsBars lg={lg} teams={conf ? lg.teams.filter((t) => t.conf === conf) : lg.teams} userId={g.teamId} />
    </Card>
  );
}

/**
 * Season and League in one tab (round 29, owner: "not much incentive to using the season tab and
 * league tab. combine them. just make sure the ones that are actually worth noticing are towards
 * the top"): his team and form, then the bracket while there is one, the standings beside the
 * team's strength, the league leaders, his games, and the league's history last.
 */
export function SeasonTab({ g }: { g: GameState }) {
  const lg = leagueOf(g);
  // after retirement there is no league of his own: the NBA's stands in
  const view = lg ?? g.nba;
  const tm = teamOf(g);
  const s = g.season;
  const games = realGames(g);
  const all = s ? [...(s.preGames ?? []), ...s.games, ...(s.cupGames ?? []), ...s.postGames] : [];
  const played = all.filter((x) => x.line);
  const avg = (k: 'pts' | 'reb' | 'ast') => (played.length ? (played.reduce((a, x) => a + x.line![k], 0) / played.length).toFixed(1) : '—');
  const confTeams = lg && tm ? standings(lg.level === 'NBA' || lg.level === 'NCAA' ? lg.teams.filter((x) => x.conf === tm.conf) : lg.teams) : [];
  const place = tm ? confTeams.findIndex((x) => x.id === tm.id) + 1 : 0;
  const leaders = !!view?.teams.some((x) => x.roster.some((p) => p.s && p.s.gp >= 10));
  const races = g.lastSummary?.races ?? [];
  // the last season stands in for the team after retirement
  const last = !tm ? g.lastSummary : null;
  return (
    <div className="page">
      <PageHero
        venue={venueOf(g)}
        arena={arenaOf(g)}
        place={placeOf(g)}
        stripe={trimOf(g)}
        art={tm ? <TeamArt name={tm.name} abbr={tm.abbr || tm.short} color={tm.color} league={styleLeague(g.stage)} size={92} /> : undefined}
        color={tm?.color ?? last?.teamColor}
        kicker={`${seasonLabel(last?.year ?? g.year)} · ${lg ? (lg.label ?? LEVELS[lg.level].name) : last ? t('Final season') : 'Season'}`}
        title={tm?.name ?? last?.teamName ?? 'Season'}
        sub={
          place > 0
            ? lg?.level === 'NBA' || lg?.level === 'NCAA'
              ? t('{place} in the {conf}', { place: ordinal(place), conf: lg?.level === 'NBA' ? `${tm!.conf}ern Conference` : tm!.conf })
              : t('{place} in the league', { place: ordinal(place) })
            : last
              ? `${last.w}–${last.l}, ${last.result.toLowerCase()}`
              : t('The season has not started')
        }
        stats={[
          { k: t('Record'), v: tm ? `${tm.w}–${tm.l}` : last ? `${last.w}–${last.l}` : '—' },
          { k: t('Streak'), v: streakOf(games), tone: games.length ? (games[games.length - 1].res === 'W' ? 'good' : 'bad') : undefined },
          { k: t('Your PTS'), v: avg('pts') },
          { k: 'REB', v: avg('reb') },
          { k: 'AST', v: avg('ast') },
        ]}
      >
        <FormStrip games={games} />
      </PageHero>
      {/* round 33 (owner: "move up the locker room to the top ... the team strength and team
          culture+fan culture side-by-side ... right below the locker room, and then the standings") */}
      {tm && (
        <Extra>
          <FoldBox id="locker" title={t('Locker room')} icon="locker">
            <LockerRoom g={g} />
          </FoldBox>
        </Extra>
      )}
      {tm && (
        <div className="season-pair">
          <StrengthCard g={g} />
          <Extra>
            <FoldBox id="city" title={t('City and fans')} icon="crowd">
              <CityCard g={g} />
            </FoldBox>
          </Extra>
        </div>
      )}
      {lg?.bracket && (
        <Card title={t('Postseason')} fold="Postseason" kicker={`${seasonLabel(g.year)} · ${lg.level === 'NBA' ? t('the playoffs') : t('the postseason')}`} tour="season-post">
          <BracketView g={g} />
        </Card>
      )}
      {view && <StandingsCard g={g} lg={view} />}
      {view && leaders && (
        <Card title={t('League leaders')} fold="League leaders" kicker={t('Per game, ten games or more')} tour="season-leaders">
          <div className="lg-leader-grid">
            {(['pts', 'reb', 'ast'] as const).map((k) => (
              <LeaderBars key={k} lg={view} stat={k} userName={g.player.name} />
            ))}
          </div>
        </Card>
      )}
      <Extra>
        <Card title={t('Your games')} fold="Your games" kicker={t('{n} played', { n: all.length })} tour="season-games">
          <PointsChart games={all} />
          <GameLogTable g={g} />
        </Card>
      </Extra>
      <Extra>
        {races.length > 0 && (
          <Card title={t("Last season's award voting")} fold="Last season's award voting" tour="season-votes">
            <VoteBars races={races} />
            {races.map((r) => (r.userRank && r.userRank > 5 ? <p key={r.award} className="small muted">{r.award === 'MVP' ? 'MVP' : r.award}: {t('you finished {rank}.', { rank: ordinal(r.userRank) })}</p> : null))}
          </Card>
        )}
        {g.nbaHistory.length > 0 && (
          <Card title={t('Champions')} fold="Champions" kicker={t('The last NBA titles, newest first')} tour="champions">
            <ChampionStrip g={g} />
          </Card>
        )}
        {g.nbaHistory.length > 0 && <NbaHistoryCard g={g} />}
      </Extra>
    </div>
  );
}

/** Round 22: what his NBA city and its fans are like, and what they do to him. */
function CityCard({ g }: { g: GameState }) {
  const c = cityCultureOf(g);
  const f = fanCultureOf(g);
  const tm = teamOf(g);
  if (!c || !tm) return null;
  const years = g.teamSeasons[tm.id] ?? 0;
  const loud = (v: number) => (v >= 0.25 ? t('deafening') : v >= 0.15 ? t('loud') : v > 0 ? t('lively') : t('quiet'));
  return (
    <section className="card stack city-card" style={{ ['--team' as string]: tm.color }}>
      <div className="city-head">
        <TeamArt name={tm.name} abbr={tm.abbr} color={tm.color} league="NBA" size={56} />
        <span className="city-icon">
          <Icon name={`city${tm.abbr}`} size={40} />
        </span>
        <div>
          <div className="kicker">
            {t('City culture')} · {years ? t('season {n} here', { n: years + 1 }) : t('first season here')}
          </div>
          <div className="sec-title">{c.name}</div>
        </div>
      </div>
      <p className="small prose">{c.text}</p>
      <ul className="city-fx small">
        <li className="good">{c.good}</li>
        <li className="bad">{c.bad}</li>
      </ul>
      {f && (
        <div className="city-fans">
          <div className="city-head">
            <span className="city-icon">
              <Icon name={`fan${tm.abbr}`} size={34} />
            </span>
            <div>
              <div className="kicker">{t('The fans')}</div>
              <b>{f.name}</b>
            </div>
          </div>
          <p className="small prose">{f.text}</p>
          <ul className="city-fx small">
            <li className={f.crowd > 0 ? 'good' : 'flat'}>{f.playoff >= 0.3 ? t('Home crowd: {level}, and they rise in the playoffs', { level: loud(f.crowd) }) : t('Home crowd: {level}', { level: loud(f.crowd) })}</li>
            <li className={f.win > 1 ? 'good' : 'flat'}>{t('When you win: {how}', { how: f.win >= 3 ? t('you own the city') : f.win >= 2 ? t('they love you') : t('they enjoy it') })}</li>
            <li className={f.lose < 0 ? 'bad' : 'good'}>{t('When you lose: {how}', { how: f.lose <= -3 ? t('brutal') : f.lose < 0 ? t('restless') : f.lose > 0 ? t('still ringing the cowbells') : t('patient') })}</li>
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------- Player ----------

/** The eight ratings as a shape, with the start of the season behind it. Round 28 (owner: "any
 * graphic that isnt pixels, change them"): drawn on a grid of 4-unit squares. */
function Radar({ g, compare }: { g: GameState; compare?: Record<string, number> }) {
  const n = ATTRS.length;
  const R = 92;
  const c = 130;
  const pt = (i: number, v: number): Pt => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (Math.max(0, Math.min(99, v)) / 99) * R;
    return [c + Math.cos(a) * r, c + Math.sin(a) * r];
  };
  const shape = (vals: (k: string) => number): Pt[] => ATTRS.map((k, i) => pt(i, vals(k)));
  const now = shape((k) => g.player.attrs[k as keyof typeof g.player.attrs]);
  return (
    <svg className="radar" viewBox="0 0 260 260" role="img" aria-label={t('Ratings shape')} shapeRendering="crispEdges">
      {[25, 50, 75, 99].map((v) => (
        <path key={v} d={polyCells(ATTRS.map((_, i) => pt(i, v)), 4, 'edge')} className="ring" />
      ))}
      {compare && <path d={polyCells(shape((k) => compare[k]), 4, 'edge')} className="was" />}
      <path d={polyCells(now, 4, 'fill')} className="now" />
      <path d={polyCells(now, 4, 'edge')} className="now-edge" />
      {ATTRS.map((k, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = c + Math.cos(a) * (R + 22);
        const y = c + Math.sin(a) * (R + 16);
        return (
          <text key={k} x={x} y={y} textAnchor={Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'} dominantBaseline="middle" className={g.player.focus.includes(k) ? 'focus' : ''}>
            {k} {Math.round(g.player.attrs[k])}
          </text>
        );
      })}
    </svg>
  );
}

export function PlayerTab({ g }: { g: GameState }) {
  const p = g.player;
  const c = g.contract;
  const lg = leagueOf(g);
  const tm = teamOf(g);
  const contractTeam = c && lg ? lg.teams.find((x) => x.id === c.teamId)?.name : null;
  const now = Math.round(ovr(g));
  const start = g.season?.attrsStart ? Math.round(ovrOf(g.season.attrsStart as GameState['player']['attrs'], p.pos)) : now;
  const [kit, setKit] = useState<KitName>('home');
  const lean = leanLevel(g);
  return (
    <div className="page">
      <PageHero
        venue={venueOf(g)}
        arena={arenaOf(g)}
        place={placeOf(g)}
        stripe={trimOf(g)}
        art={
          g.mode === 'lab' ? (
            <EvolutionArt ovr={now} name={p.name} number={p.number} kit={kitFor(tm?.name ?? '', tm?.abbr ?? '', tm?.color ?? '#1C7ED6', kit, styleLeague(g.stage))} size={150} track={false} />
          ) : (
            <PlayerArt name={p.name} number={p.number} pos={p.pos} color={tm?.color} team={tm?.name} abbr={tm?.abbr} league={styleLeague(g.stage)} kit={kit} size={150} wear={p.wardrobe?.on} />
          )
        }
        color={tm?.color}
        kicker={`#${p.number} · ${NAMES.pos[p.pos]} · ${ht(p.height)} · ${weightOf(p)} lb`}
        title={p.name}
        sub={`${p.nickname ? `\u201c${p.nickname.name}\u201d · ` : ''}${tm ? `${tm.name} · ` : ''}${stageLine(g)}`}
        stats={[
          { k: 'OVR', v: now, tone: now > start ? 'good' : now < start ? 'bad' : undefined },
          // round 27: the peak is kept at each season's end, so a rise during the season shows here first
          { k: t('Peak'), v: Math.max(Math.round(p.peakOvr), now) },
          { k: t('Age'), v: p.age },
          { k: t('Role'), v: roleName(g) },
          { k: t('Scouts'), v: p.scoutGrade ?? '—' },
        ]}
      />
      <div className={`page-grid ${lean ? 'two' : 'three'}`}>
        <Card title={t('Ratings')} fold="Ratings" kicker={now !== start ? t('OVR {from} → {to} this season', { from: start, to: now }) : t('This season')} tour="ratings">
          <Radar g={g} compare={g.season?.attrsStart} />
          <AttrRows g={g} compare={g.season?.attrsStart} />
          <p className="muted small">{t('● focus stat · the dashed shape is where you started the season.')}</p>
          {!lean && (
            <div className="meters">
              <Meter label="Range" value={p.range} tone="ink" />
            </div>
          )}
        </Card>
        <div className="stack">
          {tm && !lean && (
            <Extra>
            <Card title={t('Kits')} fold="Kits" kicker={tm.name}>
              <div className="kits">
                {(['home', 'road', 'city'] as const).map((k) => (
                  <button key={k} className="kit" aria-pressed={kit === k} onClick={() => setKit(k)}>
                    <JerseyArt kit={kitFor(tm.name, tm.abbr, tm.color, k, styleLeague(g.stage))} number={p.number} size={76} label={k === 'city' ? t('{team} city jersey', { team: tm.name }) : k === 'home' ? t('{team} home jersey', { team: tm.name }) : t('{team} road jersey', { team: tm.name })} />
                    <span>{k === 'city' ? t('City edition') : k === 'home' ? t('Home') : t('Road')}</span>
                  </button>
                ))}
              </div>
            </Card>
            </Extra>
          )}
          <Card title={t('Status')} fold="Status" tour="status">
            <div className="meters">
              <Meter label="Morale" value={p.morale} tone={p.morale < 35 ? 'bad' : p.morale > 70 ? 'good' : undefined} />
              <Meter label="Coach trust" value={p.trust} tone={p.trust <= 30 ? 'bad' : p.trust >= 70 ? 'good' : undefined} />
              <Meter label="Reputation" value={p.rep} tone="ink" />
              <Meter label="Body wear" value={p.wear ?? 0} tone={(p.wear ?? 0) >= 50 ? 'bad' : (p.wear ?? 0) >= 25 ? 'warn' : 'good'} />
            </div>
            <p className="small muted">{t('Body wear builds with heavy minutes, hard plans and injuries, and makes aging hit harder after 30. Recovery plans, rest summers and health purchases bring it down.')}</p>
          </Card>
          {/* round 38: story mode's people */}
          <PeopleCard g={g} />
          {!lean && (
          <>
          <Card title={t('Contract and money')} fold="Contract and money" tour="contract">
            {c && g.stage !== 'HS' ? (
              <p>
                {contractTeam ?? c.teamId}: {g.stage === 'NCAA' ? (c.kind === 'walkon' ? t('walk-on') : t('scholarship')) : t('{money} a year', { money: fmtMoney(c.salary) })},{' '}
                {c.years === 1 ? t('1 year left') : t('{n} years left', { n: c.years })}
                {c.teamOptionYears.length > 0 ? ` ${t('(team options in the final years)')}` : ''}.
              </p>
            ) : (
              <p className="muted">{t('No contract.')}</p>
            )}
            <dl className="facts">
              <div>
                <dt>{t('Bank')}</dt>
                <dd>{fmtMoney(p.bank)}</dd>
              </div>
              <div>
                <dt>{t('Career earnings')}</dt>
                <dd>{fmtMoney(p.earnings)}</dd>
              </div>
            </dl>
            {p.programs.length > 0 && (
              <ul className="small" style={{ paddingLeft: 18 }}>
                {p.programs.map((x) => (
                  <li key={x.id}>
                    {x.seasonsLeft === 1 ? t('{name}: 1 season left', { name: x.name }) : t('{name}: {n} seasons left', { name: x.name, n: x.seasonsLeft })}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Extra>
            <NameCard g={g} />
          </Extra>
          {g.mode === 'lab' && (
            <Card title={t('Evolution')} fold="Evolution">
              <EvolutionArt ovr={now} name={p.name} number={p.number} kit={{ base: tm?.color ?? '#1C7ED6', ink: '#FFFFFF', trim: '#F4F4F4', word: '' }} size={130} />
            </Card>
          )}
          <Extra>
          <Card title={t('Profile')} fold="Profile">
            {/* round 36: height, weight and wingspan went to the Body panel */}
            <dl className="facts">
              <div>
                <dt>{t('Hometown')}</dt>
                <dd>{p.hometown}</dd>
              </div>
              <div>
                <dt>{t('Nationality')}</dt>
                <dd className="with-flag">
                  <FlagArt country={p.country} size={24} />
                  {p.country}
                </dd>
              </div>
              <div>
                <dt>{t('Shoots')}</dt>
                <dd>{p.hand === 'L' ? t('Left-handed') : t('Right-handed')}</dd>
              </div>
              <div>
                <dt>{t('Captain')}</dt>
                <dd>{p.captain ? t('Yes') : t('No')}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt>{t("Scouts' read on your game")}</dt>
                <dd>
                  {(p.fit ?? [{ name: p.archetype, conf: 1 }]).map((f) => `${f.name} ${Math.round(f.conf * 100)}%`).join(' · ')}
                  {p.anomaly ? ` · ${t('rare: {what}', { what: p.anomaly })}` : ''}
                </dd>
              </div>
              {g.stars > 1 && g.stage === 'HS' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>{t('Recruiting')}</dt>
                  <dd>
                    {'★'.repeat(g.stars)}
                    {g.recruitRank ? `, ${t('ranked {n} in the class', { n: g.recruitRank })}` : ''}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
          </Extra>
          </>
          )}
        </div>
        {!lean && (
        <div className="stack">
          <Extra>
          <ScoutCard g={g} />
          {!p.scoutGrade && (
            <Card title={t('Scouting')} fold="Scouting">
              <p className="muted">{t('Scouts post a potential grade after your sophomore season. Your true potential, growth curve and durability stay hidden.')}</p>
            </Card>
          )}
          </Extra>
          {/* round 36: weight, the weak hand, free-throw touch, height and the body map in one panel,
              folded until opened, up beside the ratings (round 24) */}
          <BodyCard g={g} />
        </div>
        )}
      </div>
      {/* round 27 (owner: "staff, wardrobe, collection are all stacked in one row ... the sides are
          completely empty"): their own full-width row; round 36: one card, a tab each */}
      {!lean && (
        <>
          <Extra>
            <LifeCard g={g} kit={kit} />
          </Extra>
          <Extra>
            <RosterCard g={g} />
          </Extra>
        </>
      )}
    </div>
  );
}

// ---------- League history (on the Season tab since round 29) ----------

function NbaHistoryCard({ g }: { g: GameState }) {
  const [all, setAll] = useState(false);
  const rows = [...g.nbaHistory].reverse();
  const shown = all ? rows : rows.slice(0, 8);
  // how many MVPs each fictional player has won up to that season
  const mvpCount = (year: number, n: string) => g.nbaHistory.filter((h) => h.year <= year && h.awards.some((a) => a.award === 'MVP' && a.name === n)).length;
  return (
    <Card title={t('NBA record book')} fold="NBA record book" kicker={t('Champions and award winners')} tour="record-book">
      <div className="stack" style={{ gap: 10 }}>
        {shown.map((h) => {
          const mvp = h.awards.find((a) => a.award === 'MVP');
          const others = h.awards.filter((a) => a.award !== 'MVP');
          return (
            <div key={h.year} className="history-row">
              <div className="row">
                <b>{seasonLabel(h.year)}</b>
                <div className="spacer" />
                <span className="small">
                  {t('Champion:')} <b>{h.champion}</b> {t('def.')} {h.runnerUp} {h.finals}
                </span>
              </div>
              {h.finalsMvp && (
                <div className={`small${h.finalsMvp.isUser ? ' me-text' : ''}`}>
                  Finals MVP: {h.finalsMvp.name} ({h.finalsMvp.team}) <span className="muted">{h.finalsMvp.line}</span>
                </div>
              )}
              {mvp && (
                <div className={`small${mvp.isUser ? ' me-text' : ''}`}>
                  MVP: {mvp.name} ({mvp.team}, OVR {mvp.ovr})
                  {mvpCount(h.year, mvp.name) > 1 ? ` · MVP #${mvpCount(h.year, mvp.name)}` : ''} <span className="muted">{mvp.line}</span>
                </div>
              )}
              {others.length > 0 && (
                <div className="small muted">
                  {others.map((a) => `${a.award}: ${a.name} (${a.team})`).join(' · ')}
                </div>
              )}
            </div>
          );
        })}
        {rows.length > 8 && (
          <button className="btn ghost" onClick={() => setAll(!all)}>
            {all ? t('Show fewer seasons') : t('Show all {n} seasons', { n: rows.length })}
          </button>
        )}
      </div>
    </Card>
  );
}

// ---------- Records ----------

function totals(rows: SeasonRecord[]): StatLine {
  const t = emptyLine();
  for (const r of rows) addLine(t, r.line);
  return t;
}

export { trophyItems };

export function HistoryTable({ rows }: { rows: SeasonRecord[] }) {
  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th className="l">{t('Season')}</th>
            <th>{t('Age')}</th>
            <th className="l">{t('Team')}</th>
            <th className="l">{t('Level')}</th>
            <th className="l">{t('Role')}</th>
            <th>GP</th>
            <th>MIN</th>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>FG%</th>
            <th>3P%</th>
            <th>FT%</th>
            <th>OVR</th>
            <th className="l">{t('Result')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h, i) => (
            <tr key={i} className={h.level === 'NBA' ? 'nba' : ''}>
              <td className="l">{seasonLabel(h.year)}</td>
              <td>{h.age}</td>
              <td className="l">
                <span className="sw" style={{ background: h.teamColor }} />
                {h.teamName}
              </td>
              <td className="l">{LEVELS[h.level].short}</td>
              <td className="l">{NAMES.role[h.role]}</td>
              <td>{h.line.gp}</td>
              <td>{pg(h.line, 'min')}</td>
              <td>{pg(h.line, 'pts')}</td>
              <td>{pg(h.line, 'reb')}</td>
              <td>{pg(h.line, 'ast')}</td>
              <td>{pct(h.line.fgm, h.line.fga)}</td>
              <td>{pct(h.line.tpm, h.line.tpa)}</td>
              <td>{pct(h.line.ftm, h.line.fta)}</td>
              <td>{Math.round(h.ovrEnd)}</td>
              <td className="l">
                {h.result}
                {h.awards.length > 0 ? ` · ${h.awards.join(', ')}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecordsTab({ g }: { g: GameState }) {
  const nba = g.history.filter((h) => h.level === 'NBA');
  const pro = g.history.filter((h) => h.level === 'NBA' || h.level === 'GL' || h.level === 'EU' || h.level === 'INT');
  const nbaT = totals(nba);
  const proT = totals(pro);
  const tm = teamOf(g);
  const v = verdictFor(g);
  return (
    <div className="page">
      <PageHero
        venue={venueOf(g)}
        arena={arenaOf(g)}
        place={placeOf(g)}
        stripe={trimOf(g)}
        art={<PlayerArt name={g.player.name} number={g.player.number} pos={g.player.pos} color={tm?.color} team={tm?.name} abbr={tm?.abbr} league={styleLeague(g.stage)} size={120} wear={g.player.wardrobe?.on} />}
        color={tm?.color}
        kicker={`${g.history.length === 1 ? t('1 season') : t('{n} seasons', { n: g.history.length })} · ${t('legacy score {n}', { n: legacyScore(g) })}`}
        title={t('{name}: the career', { name: g.player.name })}
        sub={g.history.length ? t('On course for: {tier}', { tier: v.tier }) : t('Your seasons show up here after the first one.')}
        stats={[
          { k: t('NBA seasons'), v: nba.length },
          { k: t('NBA points'), v: Math.round(nbaT.pts).toLocaleString() },
          { k: t('Titles'), v: nbaTitles(g) },
          { k: 'MVPs', v: count(g, 'MVP') },
          { k: 'All-Star', v: count(g, 'ALLSTAR') },
        ]}
      />
      <Extra>
        <CareerTimeline g={g} />
      </Extra>
      <Extra>
      {championships(g).length > 0 && (
        <Card title={t('Banners and rings')} fold="Banners and rings" kicker={t('Every title hangs in the rafters')}>
          <BannersAndRings g={g} />
        </Card>
      )}
      </Extra>
      <div className="page-grid two">
        <Extra>
          <TrophyCabinet g={g} />
        </Extra>
        <Card title={t('Career totals')} fold="Career totals" kicker={t('Legacy score {n} · career index {index}', { n: legacyScore(g), index: careerIndex(g).score.toFixed(1) })}>
          {nbaT.gp > 0 && (
            <>
              <div className="kicker">
                NBA · {t('{n} seasons', { n: nba.length })} · {t('{n} games', { n: nbaT.gp })}
              </div>
              <Scoreboard line={nbaT} />
              <p className="num small">
                {t('{pts} points · {reb} rebounds · {ast} assists', { pts: Math.round(nbaT.pts).toLocaleString(), reb: Math.round(nbaT.reb).toLocaleString(), ast: Math.round(nbaT.ast).toLocaleString() })} ·{' '}
                {nbaTitles(g) === 1 ? t('1 title') : t('{n} titles', { n: nbaTitles(g) })} · {count(g, 'ALLSTAR')} All-Star
              </p>
            </>
          )}
          {proT.gp > nbaT.gp && (
            <>
              <div className="kicker">{t('All pro leagues')} · {t('{n} games', { n: proT.gp })}</div>
              <Scoreboard line={proT} />
            </>
          )}
          {proT.gp === 0 && <p className="muted">{t('No pro games yet.')}</p>}
        </Card>
      </div>
      <Extra>
        <CareerHighs g={g} />
      </Extra>
      {g.player.gifts?.length ? (
        <Card title={t('The farewell tour')} fold="The farewell tour" kicker={t('What the road arenas gave you')} tour="gifts">
          <ul className="gift-list">
            {g.player.gifts.map((x) => (
              <li key={x.team} style={{ ['--team' as string]: x.color }}>
                <Icon name="gift" size={28} />
                <span>
                  <b>{x.team}</b>
                  <small>{x.gift}</small>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {/* round 32 (owner): the season-by-season table and the journal sit below the honours now */}
      <Card title={t('Season by season')} fold="Season by season" tour="season-log">
        {g.history.length === 0 ? <p className="muted">{t('Your seasons show up here after the first one.')}</p> : <HistoryTable rows={g.history} />}
        <p className="muted small">{t('High school and college seasons are listed but do not count toward pro career totals.')}</p>
      </Card>
      <Extra>
        <CareerJournal g={g} />
      </Extra>
      <Extra>
      <div className="page-grid two">
        {g.tournaments.length > 0 && (
          <Card title={t('Tournaments')} fold="Tournaments" kicker={t('Tap an event to see every game')} tour="tournaments">
            <div className="stack" style={{ gap: 6 }}>
              {[...g.tournaments].reverse().map((x, i) => (
                <details key={i} className="tourney">
                  <summary>
                    <span className="tourney-head">
                      <b>{x.name}</b>
                      <span className="muted small">
                        {x.year} · {x.team} · {x.result}
                      </span>
                    </span>
                    <span className="num small">{x.line && x.line.gp ? `${pg(x.line, 'pts')} PPG` : '—'}</span>
                  </summary>
                  <div className="series-games">
                    {(x.games ?? []).map((gm, k) => (
                      <span key={k}>
                        {gm.post ?? t('Game {n}', { n: k + 1 })}: {gm.res} {gm.us}–{gm.them} vs {gm.opp}
                        {gm.line ? ` · ${gm.line.pts} pts, ${gm.line.reb} reb, ${gm.line.ast} ast` : ' · DNP'}
                      </span>
                    ))}
                    {(x.notes ?? []).map((n, k) => (
                      <span key={`n${k}`} className={n.startsWith('Champion') ? 'strong' : ''}>
                        {n}
                      </span>
                    ))}
                    {!x.games && !x.notes && <span>{t('No game details for this event.')}</span>}
                  </div>
                </details>
              ))}
            </div>
          </Card>
        )}
      </div>
      <LegacyTierList g={g} />
      </Extra>
    </div>
  );
}

// ---------- Extras (round 29) ----------

/**
 * The start page's four cards inside a career (round 29, owner: "let them view the four additional
 * cards in the homepage (minigames, career logs, achievements, community). try to limit access to
 * some (such as going into career log and continuing a career mid-career) to prevent bugs"). Each
 * opens as it does from the start page, less what belongs to the start page alone: the daily
 * challenge (a career of its own), deleting log cards, and starting or continuing
 * another career, which the start page keeps.
 */
export function ExtrasTab({ g }: { g: GameState }) {
  const tm = teamOf(g);
  const live = g.step !== 'retired';
  const minis = Object.keys(MINI_NAMES).length;
  const open = (g.miniOpen ?? []).length;
  const earned = useMemo(() => earnedIn(g).length, [g]);
  const [log] = useState(() => ({ n: logCards().length, locked: logLocks().length }));
  return (
    <div className="page">
      <PageHero
        venue={venueOf(g)}
        arena={arenaOf(g)}
        place={placeOf(g)}
        stripe={trimOf(g)}
        color={tm?.color}
        art={
          <span className="extras-art" aria-hidden="true">
            <Icon name="controller" size={44} />
            <Icon name="cards" size={44} />
            <Badge tier="starter" size={44} />
            <Icon name="crowd" size={44} />
          </span>
        }
        kicker={t('Beside the career')}
        title="Extras"
        sub={t('The mini-games, your career log, the achievement book and the community, one tap from the career and back.')}
        stats={[
          { k: 'Mini-games', v: g.flags.daily ? t('Locked') : t('{n} of {total}', { n: open, total: minis }), tone: g.flags.daily ? 'bad' : undefined },
          { k: t('Earned this career'), v: earned },
          { k: 'Career log', v: t('{n} of {total}', { n: log.n, total: LOG_MAX }) },
          { k: t('Locked'), v: t('{n} of {total}', { n: log.locked, total: LOCK_MAX }) },
        ]}
      />
      <div className="start-cards extras-cards">
        <MiniGamesCard />
        <CareerLogCard />
        <AchievementsCard g={g} />
        <CommunityCard />
      </div>
      {live && (
        <section className="card extras-limits prose" data-tour="extras-limits">
          <Icon name="lock" size={28} />
          <div className="stack" style={{ gap: 4 }}>
            <b>{t('Kept for the start page while a career is on')}</b>
            <ul className="small">
              <li>{t('The daily challenge: it is a career of its own.')}</li>
              <li>{t('Deleting career log cards (looking, downloading and locking are fine).')}</li>
              <li>{t('Starting or continuing another career.')}</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
