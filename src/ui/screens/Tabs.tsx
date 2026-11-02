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
import { BodyMap } from '../components/BodyMap';
import { RosterCard } from '../components/TeamRoster';
import { NameCard } from '../components/NameCard';
import { WardrobeCard } from '../components/Wardrobe';
import { StaffCard } from '../components/StaffCard';
import { StrengthCard } from '../components/StrengthCard';
import { CollectionCard } from '../components/Collection';
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
import { buildWord, idealWeight, weightOf } from '../../engine/player/weight';
import { touchOf } from '../../engine/player/touch';
import { polyCells, type Pt } from '../art/pixel';
import { ChampionStrip, LeaderBars, StandingsBars, VoteBars } from '../components/LeagueVisuals';

/** The ratings his weight is adding or taking away right now, biggest first. */
function frameLine(p: GameState['player']): string {
  const f = p.frame ?? {};
  return ATTRS.filter((k) => Math.abs(f[k] ?? 0) >= 0.25)
    .sort((a, b) => Math.abs(f[b]!) - Math.abs(f[a]!))
    .map((k) => `${NAMES.attr[k]} ${f[k]! > 0 ? '+' : '−'}${Math.abs(f[k]!).toFixed(1)}`)
    .join(' · ');
}

// ---------- Season ----------

function GameLogTable({ g }: { g: GameState }) {
  const s = g.season;
  if (!s) return <p className="muted">No games yet.</p>;
  const games = [...(s.preGames ?? []), ...s.games, ...(s.cupGames ?? []), ...s.postGames];
  if (games.length === 0) return <p className="muted">The season has not started. Play the first half from Home.</p>;
  return (
    <div className="tbl-wrap" style={{ maxHeight: 420 }}>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th className="l">Opponent</th>
            <th className="l">Result</th>
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
            Game {i + 1}: {name(x.a)} {a}, {name(x.b)} {b}
          </span>
        ))}
      </div>
    </details>
  );
}

function BracketView({ g }: { g: GameState }) {
  const lg = leagueOf(g);
  const b = lg?.bracket;
  if (!lg || !b) return <p className="muted">The postseason bracket appears after the regular season.</p>;
  const name = (id: string) => lg.teams.find((t) => t.id === id)?.short ?? id;
  const rounds = lg.level === 'NCAA' ? b.rounds.slice(2) : b.rounds;
  const mine = (x: SeriesResult) => x.a === g.teamId || x.b === g.teamId;
  const graphic = lg.level === 'NBA' && b.rounds.length === 4;
  return (
    <div className="bracket">
      {graphic ? <NbaBracket bracket={b} league={lg} userTeamId={g.teamId} /> : <TextBracket b={b} league={lg} userTeamId={g.teamId} />}
      <div className="kicker">Champion: {name(b.champion)}</div>
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
        <summary className="sec-title">Every {lg.level === 'NBA' ? 'series' : 'game'}</summary>
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
        <p className="muted small">Tap a series to see every game.</p>
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
    <div className="form-strip" aria-label={`Last ${last.length}: ${last.map((x) => x.res).join(' ')}`}>
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
  const avg = played.reduce((t, x) => t + x.line!.pts, 0) / played.length;
  const w = 6;
  const h = 70;
  return (
    <figure className="pts-chart">
      <figcaption className="row">
        <span className="kicker">Points, game by game</span>
        <span className="spacer" />
        <span className="small muted">
          <i className="key w" /> win <i className="key l" /> loss · average {avg.toFixed(1)}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${games.length * w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Points per game, average ${avg.toFixed(1)}`}>
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
      <Card title="Standings" kicker="Top six to the playoffs, seven to ten to the play-in" tour="season-standings">
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
    <Card title="Standings" kicker={conf ?? lg.label ?? LEVELS[lg.level].name} tour="season-standings">
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
  const t = teamOf(g);
  const s = g.season;
  const games = realGames(g);
  const all = s ? [...(s.preGames ?? []), ...s.games, ...(s.cupGames ?? []), ...s.postGames] : [];
  const played = all.filter((x) => x.line);
  const avg = (k: 'pts' | 'reb' | 'ast') => (played.length ? (played.reduce((a, x) => a + x.line![k], 0) / played.length).toFixed(1) : '—');
  const confTeams = lg && t ? standings(lg.level === 'NBA' || lg.level === 'NCAA' ? lg.teams.filter((x) => x.conf === t.conf) : lg.teams) : [];
  const place = t ? confTeams.findIndex((x) => x.id === t.id) + 1 : 0;
  const leaders = !!view?.teams.some((x) => x.roster.some((p) => p.s && p.s.gp >= 10));
  const races = g.lastSummary?.races ?? [];
  // the last season stands in for the team after retirement
  const last = !t ? g.lastSummary : null;
  return (
    <div className="page">
      <PageHero
        venue={venueOf(g)}
        arena={arenaOf(g)}
        place={placeOf(g)}
        stripe={trimOf(g)}
        art={t ? <TeamArt name={t.name} abbr={t.abbr || t.short} color={t.color} league={styleLeague(g.stage)} size={92} /> : undefined}
        color={t?.color ?? last?.teamColor}
        kicker={`${seasonLabel(last?.year ?? g.year)} · ${lg ? (lg.label ?? LEVELS[lg.level].name) : last ? 'Final season' : 'Season'}`}
        title={t?.name ?? last?.teamName ?? 'Season'}
        sub={place > 0 ? `${ordinal(place)} in the ${lg?.level === 'NBA' ? `${t!.conf}ern Conference` : lg?.level === 'NCAA' ? t!.conf : 'league'}` : last ? `${last.w}–${last.l}, ${last.result.toLowerCase()}` : 'The season has not started'}
        stats={[
          { k: 'Record', v: t ? `${t.w}–${t.l}` : last ? `${last.w}–${last.l}` : '—' },
          { k: 'Streak', v: streakOf(games), tone: games.length ? (games[games.length - 1].res === 'W' ? 'good' : 'bad') : undefined },
          { k: 'Your PTS', v: avg('pts') },
          { k: 'REB', v: avg('reb') },
          { k: 'AST', v: avg('ast') },
        ]}
      >
        <FormStrip games={games} />
      </PageHero>
      {/* round 33 (owner: "move up the locker room to the top ... the team strength and team
          culture+fan culture side-by-side ... right below the locker room, and then the standings") */}
      {t && (
        <Extra>
          <FoldBox id="locker" title="Locker room" icon="locker">
            <LockerRoom g={g} />
          </FoldBox>
        </Extra>
      )}
      {t && (
        <div className="season-pair">
          <StrengthCard g={g} />
          <Extra>
            <FoldBox id="city" title="City and fans" icon="crowd">
              <CityCard g={g} />
            </FoldBox>
          </Extra>
        </div>
      )}
      {lg?.bracket && (
        <Card title="Postseason" kicker={`${seasonLabel(g.year)} · ${lg.level === 'NBA' ? 'the playoffs' : 'the postseason'}`} tour="season-post">
          <BracketView g={g} />
        </Card>
      )}
      {view && <StandingsCard g={g} lg={view} />}
      {view && leaders && (
        <Card title="League leaders" kicker="Per game, ten games or more" tour="season-leaders">
          <div className="lg-leader-grid">
            {(['pts', 'reb', 'ast'] as const).map((k) => (
              <LeaderBars key={k} lg={view} stat={k} userName={g.player.name} />
            ))}
          </div>
        </Card>
      )}
      <Extra>
        <Card title="Your games" kicker={`${all.length} played`} tour="season-games">
          <PointsChart games={all} />
          <GameLogTable g={g} />
        </Card>
      </Extra>
      <Extra>
        {races.length > 0 && (
          <Card title="Last season's award voting" tour="season-votes">
            <VoteBars races={races} />
            {races.map((r) => (r.userRank && r.userRank > 5 ? <p key={r.award} className="small muted">{r.award === 'MVP' ? 'MVP' : r.award}: you finished {ordinal(r.userRank)}.</p> : null))}
          </Card>
        )}
        {g.nbaHistory.length > 0 && (
          <Card title="Champions" kicker="The last NBA titles, newest first" tour="champions">
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
  const t = teamOf(g);
  if (!c || !t) return null;
  const years = g.teamSeasons[t.id] ?? 0;
  const loud = (v: number) => (v >= 0.25 ? 'deafening' : v >= 0.15 ? 'loud' : v > 0 ? 'lively' : 'quiet');
  return (
    <section className="card stack city-card" style={{ ['--team' as string]: t.color }}>
      <div className="city-head">
        <TeamArt name={t.name} abbr={t.abbr} color={t.color} league="NBA" size={56} />
        <span className="city-icon">
          <Icon name={`city${t.abbr}`} size={40} />
        </span>
        <div>
          <div className="kicker">
            City culture · {years ? `season ${years + 1} here` : 'first season here'}
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
              <Icon name={`fan${t.abbr}`} size={34} />
            </span>
            <div>
              <div className="kicker">The fans</div>
              <b>{f.name}</b>
            </div>
          </div>
          <p className="small prose">{f.text}</p>
          <ul className="city-fx small">
            <li className={f.crowd > 0 ? 'good' : 'flat'}>Home crowd: {loud(f.crowd)}{f.playoff >= 0.3 ? ', and they rise in the playoffs' : ''}</li>
            <li className={f.win > 1 ? 'good' : 'flat'}>When you win: {f.win >= 3 ? 'you own the city' : f.win >= 2 ? 'they love you' : 'they enjoy it'}</li>
            <li className={f.lose < 0 ? 'bad' : 'good'}>When you lose: {f.lose <= -3 ? 'brutal' : f.lose < 0 ? 'restless' : f.lose > 0 ? 'still ringing the cowbells' : 'patient'}</li>
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
    <svg className="radar" viewBox="0 0 260 260" role="img" aria-label="Ratings shape" shapeRendering="crispEdges">
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
  const t = teamOf(g);
  const contractTeam = c && lg ? lg.teams.find((x) => x.id === c.teamId)?.name : null;
  const now = Math.round(ovr(g));
  const start = g.season?.attrsStart ? Math.round(ovrOf(g.season.attrsStart as GameState['player']['attrs'], p.pos)) : now;
  const [kit, setKit] = useState<KitName>('home');
  return (
    <div className="page">
      <PageHero
        venue={venueOf(g)}
        arena={arenaOf(g)}
        place={placeOf(g)}
        stripe={trimOf(g)}
        art={
          g.mode === 'lab' ? (
            <EvolutionArt ovr={now} name={p.name} number={p.number} kit={kitFor(t?.name ?? '', t?.abbr ?? '', t?.color ?? '#1C7ED6', kit, styleLeague(g.stage))} size={150} track={false} />
          ) : (
            <PlayerArt name={p.name} number={p.number} pos={p.pos} color={t?.color} team={t?.name} abbr={t?.abbr} league={styleLeague(g.stage)} kit={kit} size={150} wear={p.wardrobe?.on} />
          )
        }
        color={t?.color}
        kicker={`#${p.number} · ${NAMES.pos[p.pos]} · ${ht(p.height)} · ${weightOf(p)} lb`}
        title={p.name}
        sub={`${p.nickname ? `\u201c${p.nickname.name}\u201d · ` : ''}${t ? `${t.name} · ` : ''}${stageLine(g)}`}
        stats={[
          { k: 'OVR', v: now, tone: now > start ? 'good' : now < start ? 'bad' : undefined },
          // round 27: the peak is kept at each season's end, so a rise during the season shows here first
          { k: 'Peak', v: Math.max(Math.round(p.peakOvr), now) },
          { k: 'Age', v: p.age },
          { k: 'Role', v: roleName(g) },
          { k: 'Scouts', v: p.scoutGrade ?? '—' },
        ]}
      />
      <div className="page-grid three">
        <Card title="Ratings" kicker={now !== start ? `OVR ${start} → ${now} this season` : 'This season'} tour="ratings">
          <Radar g={g} compare={g.season?.attrsStart} />
          <AttrRows g={g} compare={g.season?.attrsStart} />
          <p className="muted small">● focus stat · the dashed shape is where you started the season.</p>
          <div className="meters">
            <Meter label="Range" value={p.range} tone="ink" />
            <Meter label="Free-throw touch" value={touchOf(p)} tone="ink" />
            <Meter label={`${p.hand === 'L' ? 'Right' : 'Left'} hand (weak hand)`} value={p.offhand} tone="ink" />
          </div>
        </Card>
        <div className="stack">
          {t && (
            <Extra>
            <Card title="Kits" kicker={t.name}>
              <div className="kits">
                {(['home', 'road', 'city'] as const).map((k) => (
                  <button key={k} className="kit" aria-pressed={kit === k} onClick={() => setKit(k)}>
                    <JerseyArt kit={kitFor(t.name, t.abbr, t.color, k, styleLeague(g.stage))} number={p.number} size={76} label={`${t.name} ${k} jersey`} />
                    <span>{k === 'city' ? 'City edition' : k === 'home' ? 'Home' : 'Road'}</span>
                  </button>
                ))}
              </div>
            </Card>
            </Extra>
          )}
          <Card title="Status">
            <div className="meters">
              <Meter label="Morale" value={p.morale} tone={p.morale < 35 ? 'bad' : p.morale > 70 ? 'good' : undefined} />
              <Meter label="Coach trust" value={p.trust} tone={p.trust <= 30 ? 'bad' : p.trust >= 70 ? 'good' : undefined} />
              <Meter label="Reputation" value={p.rep} tone="ink" />
              <Meter label="Body wear" value={p.wear ?? 0} tone={(p.wear ?? 0) >= 50 ? 'bad' : (p.wear ?? 0) >= 25 ? 'warn' : 'good'} />
            </div>
            <p className="small muted">Body wear builds with heavy minutes, hard plans and injuries, and makes aging hit harder after 30. Recovery plans, rest summers and health purchases bring it down.</p>
          </Card>
          <Card title="Contract and money">
            {c && g.stage !== 'HS' ? (
              <p>
                {contractTeam ?? c.teamId}: {g.stage === 'NCAA' ? (c.kind === 'walkon' ? 'walk-on' : 'scholarship') : `${fmtMoney(c.salary)} a year`}, {c.years} year
                {c.years === 1 ? '' : 's'} left{c.teamOptionYears.length > 0 ? ' (team options in the final years)' : ''}.
              </p>
            ) : (
              <p className="muted">No contract.</p>
            )}
            <dl className="facts">
              <div>
                <dt>Bank</dt>
                <dd>{fmtMoney(p.bank)}</dd>
              </div>
              <div>
                <dt>Career earnings</dt>
                <dd>{fmtMoney(p.earnings)}</dd>
              </div>
            </dl>
            {p.programs.length > 0 && (
              <ul className="small" style={{ paddingLeft: 18 }}>
                {p.programs.map((x) => (
                  <li key={x.id}>
                    {x.name}: {x.seasonsLeft} season{x.seasonsLeft === 1 ? '' : 's'} left
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Extra>
            <NameCard g={g} />
          </Extra>
          {g.mode === 'lab' && (
            <Card title="Evolution">
              <EvolutionArt ovr={now} name={p.name} number={p.number} kit={{ base: t?.color ?? '#1C7ED6', ink: '#FFFFFF', trim: '#F4F4F4', word: '' }} size={130} />
            </Card>
          )}
          <Extra>
          <Card title="Profile">
            <dl className="facts">
              <div>
                <dt>Height</dt>
                <dd>
                  {ht(p.height)}
                  {p.height < p.heightProj ? <span className="muted"> → about {ht(p.heightProj)}</span> : null}
                </dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>
                  {weightOf(p)} lb <span className="muted">· {buildWord(p)} (best about {Math.round(idealWeight(p.height, p.age) / 5) * 5})</span>
                </dd>
              </div>
              <div>
                <dt>Wingspan</dt>
                <dd>
                  {ht(p.wingspan)}
                  <span className="muted">
                    {' '}
                    · {Math.abs(p.wingspan - p.height)}″ {p.wingspan >= p.height ? 'over' : 'under'} your height
                  </span>
                </dd>
              </div>
              {frameLine(p) && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>What your weight does</dt>
                  <dd>{frameLine(p)}</dd>
                </div>
              )}
              <div>
                <dt>Hometown</dt>
                <dd>{p.hometown}</dd>
              </div>
              <div>
                <dt>Nationality</dt>
                <dd className="with-flag">
                  <FlagArt country={p.country} size={24} />
                  {p.country}
                </dd>
              </div>
              <div>
                <dt>Shoots</dt>
                <dd>{p.hand === 'L' ? 'Left-handed' : 'Right-handed'}</dd>
              </div>
              <div>
                <dt>Captain</dt>
                <dd>{p.captain ? 'Yes' : 'No'}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt>Scouts' read on your game</dt>
                <dd>
                  {(p.fit ?? [{ name: p.archetype, conf: 1 }]).map((f) => `${f.name} ${Math.round(f.conf * 100)}%`).join(' · ')}
                  {p.anomaly ? ` · rare: ${p.anomaly}` : ''}
                </dd>
              </div>
              {g.stars > 1 && g.stage === 'HS' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>Recruiting</dt>
                  <dd>
                    {'★'.repeat(g.stars)}
                    {g.recruitRank ? `, ranked ${g.recruitRank} in the class` : ''}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
          </Extra>
        </div>
        <div className="stack">
          <Extra>
          <ScoutCard g={g} />
          {!p.scoutGrade && (
            <Card title="Scouting">
              <p className="muted">Scouts post a potential grade after your sophomore season. Your true potential, growth curve and durability stay hidden.</p>
            </Card>
          )}
          {/* round 24: up beside the ratings instead of below the long profile column */}
          <BodyMap g={g} narrow />
          </Extra>
        </div>
      </div>
      {/* round 27 (owner: "staff, wardrobe, collection are all stacked in one row ... the sides are
          completely empty"): their own full-width row, side by side */}
      <Extra>
        <div className="player-extras">
          <StaffCard g={g} />
          <WardrobeCard g={g} kit={kit} />
          <CollectionCard g={g} />
        </div>
      </Extra>
      <Extra>
        <RosterCard g={g} />
      </Extra>
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
    <Card title="NBA record book" kicker="Champions and award winners" tour="record-book">
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
                  Champion: <b>{h.champion}</b> def. {h.runnerUp} {h.finals}
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
            {all ? 'Show fewer seasons' : `Show all ${rows.length} seasons`}
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
            <th className="l">Season</th>
            <th>Age</th>
            <th className="l">Team</th>
            <th className="l">Level</th>
            <th className="l">Role</th>
            <th>GP</th>
            <th>MIN</th>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>FG%</th>
            <th>3P%</th>
            <th>FT%</th>
            <th>OVR</th>
            <th className="l">Result</th>
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
  const t = teamOf(g);
  const v = verdictFor(g);
  return (
    <div className="page">
      <PageHero
        venue={venueOf(g)}
        arena={arenaOf(g)}
        place={placeOf(g)}
        stripe={trimOf(g)}
        art={<PlayerArt name={g.player.name} number={g.player.number} pos={g.player.pos} color={t?.color} team={t?.name} abbr={t?.abbr} league={styleLeague(g.stage)} size={120} wear={g.player.wardrobe?.on} />}
        color={t?.color}
        kicker={`${g.history.length} season${g.history.length === 1 ? '' : 's'} · legacy score ${legacyScore(g)}`}
        title={`${g.player.name}: the career`}
        sub={g.history.length ? `On course for: ${v.tier}` : 'Your seasons show up here after the first one.'}
        stats={[
          { k: 'NBA seasons', v: nba.length },
          { k: 'NBA points', v: Math.round(nbaT.pts).toLocaleString() },
          { k: 'Titles', v: nbaTitles(g) },
          { k: 'MVPs', v: count(g, 'MVP') },
          { k: 'All-Star', v: count(g, 'ALLSTAR') },
        ]}
      />
      <Extra>
        <CareerTimeline g={g} />
      </Extra>
      <Extra>
      {championships(g).length > 0 && (
        <Card title="Banners and rings" kicker="Every title hangs in the rafters">
          <BannersAndRings g={g} />
        </Card>
      )}
      </Extra>
      <div className="page-grid two">
        <Extra>
          <TrophyCabinet g={g} />
        </Extra>
        <Card title="Career totals" kicker={`Legacy score ${legacyScore(g)} · career index ${careerIndex(g).score.toFixed(1)}`}>
          {nbaT.gp > 0 && (
            <>
              <div className="kicker">
                NBA · {nba.length} seasons · {nbaT.gp} games
              </div>
              <Scoreboard line={nbaT} />
              <p className="num small">
                {Math.round(nbaT.pts).toLocaleString()} points · {Math.round(nbaT.reb).toLocaleString()} rebounds · {Math.round(nbaT.ast).toLocaleString()} assists ·{' '}
                {nbaTitles(g)} title{nbaTitles(g) === 1 ? '' : 's'} · {count(g, 'ALLSTAR')} All-Star
              </p>
            </>
          )}
          {proT.gp > nbaT.gp && (
            <>
              <div className="kicker">All pro leagues · {proT.gp} games</div>
              <Scoreboard line={proT} />
            </>
          )}
          {proT.gp === 0 && <p className="muted">No pro games yet.</p>}
        </Card>
      </div>
      <Extra>
        <CareerHighs g={g} />
      </Extra>
      {g.player.gifts?.length ? (
        <Card title="The farewell tour" kicker="What the road arenas gave you" tour="gifts">
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
      <Card title="Season by season" tour="season-log">
        {g.history.length === 0 ? <p className="muted">Your seasons show up here after the first one.</p> : <HistoryTable rows={g.history} />}
        <p className="muted small">High school and college seasons are listed but do not count toward pro career totals.</p>
      </Card>
      <Extra>
        <CareerJournal g={g} />
      </Extra>
      <Extra>
      <div className="page-grid two">
        {g.tournaments.length > 0 && (
          <Card title="Tournaments" kicker="Tap an event to see every game" tour="tournaments">
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
                        {gm.post ?? `Game ${k + 1}`}: {gm.res} {gm.us}–{gm.them} vs {gm.opp}
                        {gm.line ? ` · ${gm.line.pts} pts, ${gm.line.reb} reb, ${gm.line.ast} ast` : ' · DNP'}
                      </span>
                    ))}
                    {(x.notes ?? []).map((n, k) => (
                      <span key={`n${k}`} className={n.startsWith('Champion') ? 'strong' : ''}>
                        {n}
                      </span>
                    ))}
                    {!x.games && !x.notes && <span>No game details for this event.</span>}
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
  const t = teamOf(g);
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
        color={t?.color}
        art={
          <span className="extras-art" aria-hidden="true">
            <Icon name="controller" size={44} />
            <Icon name="cards" size={44} />
            <Badge tier="starter" size={44} />
            <Icon name="crowd" size={44} />
          </span>
        }
        kicker="Beside the career"
        title="Extras"
        sub="The mini-games, your career log, the achievement book and the community, one tap from the career and back."
        stats={[
          { k: 'Mini-games', v: g.flags.daily ? 'Locked' : `${open} of ${minis}`, tone: g.flags.daily ? 'bad' : undefined },
          { k: 'Earned this career', v: earned },
          { k: 'Career log', v: `${log.n} of ${LOG_MAX}` },
          { k: 'Locked', v: `${log.locked} of ${LOCK_MAX}` },
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
            <b>Kept for the start page while a career is on</b>
            <ul className="small">
              <li>The daily challenge: it is a career of its own.</li>
              <li>Deleting career log cards (looking, downloading and locking are fine).</li>
              <li>Starting or continuing another career.</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
