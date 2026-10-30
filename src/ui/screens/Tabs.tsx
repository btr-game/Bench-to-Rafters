// Season, Player, League and Records tabs.

import { LegacyTierList } from '../components/Legacy';
import { BannersAndRings, TrophyCabinet, trophyItems } from '../components/Trophies';
import { CareerHighs } from '../components/Highs';
import { NbaBracket } from '../components/NbaBracket';
import { TextBracket } from '../components/TextBracket';
import { useState, type ReactNode } from 'react';
import { VenueArt, arenaOf, placeOf, venueOf, type VenueKind } from '../art/Venue';
import { TeamArt } from '../art/Crest';
import { Icon } from '../art/Icon';
import { PlayerArt, kitFor, styleLeague, type KitName } from '../art/Player';
import { JerseyArt } from '../art/Jersey';
import { EvolutionArt } from '../art/Evolution';
import { CareerTimeline } from '../components/Timeline';
import { cityCultureOf } from '../../engine/career/cityCulture';
import { fanCultureOf } from '../../engine/career/fanCulture';
import { BodyMap } from '../components/BodyMap';
import { RosterCard } from '../components/TeamRoster';
import { NameCard } from '../components/NameCard';
import { AchievementsCard } from './Achievements';
import { FlagArt } from '../art/Flag';
import type { GameLog, GameState, League, SeasonRecord, SeriesResult, StatLine, Team } from '../../engine/types';
import { ATTRS, LEVELS } from '../../engine/balance';
import { ovrOf } from '../../engine/player/ovr';
import { standings } from '../../engine/sim/leagueSim';
import { addLine, emptyLine, perGame } from '../../engine/sim/statModel';
import { careerIndex, championships, count, legacyScore, nbaTitles, verdictFor } from '../../engine/awards/legacy';
import { NAMES } from '../../content/strings';
import { Card, Meter, Scoreboard } from '../components/bits';
import { AttrRows } from '../components/PlayerCard';
import { ScoutCard } from '../components/ScoutCard';
import { fmtMoney, ht, pct, pg, seasonLabel } from '../format';
import { ordinal } from '../../engine/career/season';
import { league as leagueOf, ovr, roleName, stageLine, team as teamOf } from '../selectors';
import { buildWord, idealWeight, weightOf } from '../../engine/player/weight';

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
                </>
              ) : (
                <td colSpan={6} className="l muted">
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

function StandingsTable({ lg, teams, userId, title }: { lg: League; teams: Team[]; userId: string | null; title?: string }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      {title && <div className="kicker">{title}</div>}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th className="l">Team</th>
              <th>W</th>
              <th>L</th>
              <th>PCT</th>
            </tr>
          </thead>
          <tbody>
            {standings(teams).map((t, i) => (
              <tr key={t.id} className={t.id === userId ? 'me' : ''}>
                <td>{i + 1}</td>
                <td className="l">
                  <TeamArt name={t.name} abbr={t.abbr || t.short} color={t.color} league={styleLeague(lg.level)} size={24} />
                  {lg.level === 'NBA' ? t.name : t.short}
                </td>
                <td>{t.w}</td>
                <td>{t.l}</td>
                <td>{t.w + t.l > 0 ? (t.w / (t.w + t.l)).toFixed(3).replace(/^0/, '') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Standings({ g }: { g: GameState }) {
  const lg = leagueOf(g);
  if (!lg) return <p className="muted">No league right now.</p>;
  const userTeam = lg.teams.find((t) => t.id === g.teamId);
  if (lg.level === 'NBA') {
    return (
      <div className="stack">
        {['East', 'West'].map((c) => (
          <StandingsTable key={c} lg={lg} teams={lg.teams.filter((t) => t.conf === c)} userId={g.teamId} title={`${c}ern Conference`} />
        ))}
      </div>
    );
  }
  if (lg.level === 'NCAA' && userTeam) {
    return <StandingsTable lg={lg} teams={lg.teams.filter((t) => t.conf === userTeam.conf)} userId={g.teamId} title={userTeam.conf} />;
  }
  return <StandingsTable lg={lg} teams={lg.teams} userId={g.teamId} />;
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
      <div className="sec-title">Every {lg.level === 'NBA' ? 'series' : 'game'}</div>
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
      <p className="muted small">Tap a series to see every game.</p>
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

/** Standings for his conference (or the other one), compact enough for a side column. */
function ConfStandings({ g }: { g: GameState }) {
  const lg = leagueOf(g);
  const mine = lg?.teams.find((t) => t.id === g.teamId);
  const [conf, setConf] = useState(mine?.conf ?? 'East');
  if (!lg) return <p className="muted">No league right now.</p>;
  if (lg.level === 'NBA')
    return (
      <div className="stack" style={{ gap: 8 }}>
        <div className="subtabs">
          {['East', 'West'].map((c) => (
            <button key={c} aria-pressed={conf === c} onClick={() => setConf(c)}>
              {c}
            </button>
          ))}
        </div>
        <StandingsTable lg={lg} teams={lg.teams.filter((t) => t.conf === conf)} userId={g.teamId} />
      </div>
    );
  return <Standings g={g} />;
}

/** The team's second colour (its kit trim), for the stripe under the banner's top edge. */
function trimOf(g: GameState): string | undefined {
  const t = teamOf(g);
  return t ? kitFor(t.name, t.abbr, t.color, 'home', styleLeague(g.stage)).trim : undefined;
}

/** A page banner: art on the left, the headline, then the numbers that matter (round 14). */
export function PageHero({ art, venue, place, arena, stripe, kicker, title, sub, color, stats, children }: { art?: ReactNode; venue: VenueKind; place?: string | null; arena?: string; stripe?: string; kicker: string; title: string; sub?: ReactNode; color?: string; stats: { k: string; v: ReactNode; tone?: 'good' | 'bad' }[]; children?: ReactNode }) {
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

export function SeasonTab({ g }: { g: GameState }) {
  const lg = leagueOf(g);
  const t = teamOf(g);
  const s = g.season;
  const games = realGames(g);
  const all = s ? [...(s.preGames ?? []), ...s.games, ...(s.cupGames ?? []), ...s.postGames] : [];
  const played = all.filter((x) => x.line);
  const avg = (k: 'pts' | 'reb' | 'ast') => (played.length ? (played.reduce((a, x) => a + x.line![k], 0) / played.length).toFixed(1) : '—');
  const confTeams = lg && t ? standings(lg.level === 'NBA' || lg.level === 'NCAA' ? lg.teams.filter((x) => x.conf === t.conf) : lg.teams) : [];
  const place = t ? confTeams.findIndex((x) => x.id === t.id) + 1 : 0;
  const [view, setView] = useState<'season' | 'bracket'>('season');
  const hasBracket = !!lg?.bracket;
  // after retirement there is no team: the last season stands in
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
      {hasBracket && (
        <div className="subtabs">
          <button aria-pressed={view === 'season'} onClick={() => setView('season')}>
            Season
          </button>
          <button aria-pressed={view === 'bracket'} onClick={() => setView('bracket')}>
            Postseason bracket
          </button>
        </div>
      )}
      {view === 'bracket' && hasBracket ? (
        <Card title="Postseason">
          <BracketView g={g} />
        </Card>
      ) : (
        <div className="page-grid wide-side">
          <Card title="Games" kicker={`${all.length} played`} tour="season-games">
            <PointsChart games={all} />
            <GameLogTable g={g} />
          </Card>
          <div className="stack">
            <CityCard g={g} />
            <Card title="Standings">
              <ConfStandings g={g} />
            </Card>
          </div>
        </div>
      )}
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

/** The eight ratings as a shape, with the start of the season dashed behind it. */
function Radar({ g, compare }: { g: GameState; compare?: Record<string, number> }) {
  const n = ATTRS.length;
  const R = 92;
  const c = 130;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (Math.max(0, Math.min(99, v)) / 99) * R;
    return `${(c + Math.cos(a) * r).toFixed(1)},${(c + Math.sin(a) * r).toFixed(1)}`;
  };
  const shape = (vals: (k: string) => number) => ATTRS.map((k, i) => pt(i, vals(k))).join(' ');
  return (
    <svg className="radar" viewBox="0 0 260 260" role="img" aria-label="Ratings shape">
      {[25, 50, 75, 99].map((v) => (
        <polygon key={v} points={ATTRS.map((_, i) => pt(i, v)).join(' ')} className="ring" />
      ))}
      {compare && <polygon points={shape((k) => compare[k])} className="was" />}
      <polygon points={shape((k) => g.player.attrs[k as keyof typeof g.player.attrs])} className="now" />
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
            <PlayerArt name={p.name} number={p.number} pos={p.pos} color={t?.color} team={t?.name} abbr={t?.abbr} league={styleLeague(g.stage)} kit={kit} size={150} />
          )
        }
        color={t?.color}
        kicker={`#${p.number} · ${NAMES.pos[p.pos]} · ${ht(p.height)} · ${weightOf(p)} lb`}
        title={p.name}
        sub={`${p.nickname ? `\u201c${p.nickname.name}\u201d · ` : ''}${t ? `${t.name} · ` : ''}${stageLine(g)}`}
        stats={[
          { k: 'OVR', v: now, tone: now > start ? 'good' : now < start ? 'bad' : undefined },
          { k: 'Peak', v: Math.round(p.peakOvr) },
          { k: 'Age', v: p.age },
          { k: 'Role', v: roleName(g) },
          { k: 'Scouts', v: p.scoutGrade ?? '—' },
        ]}
      />
      <div className="page-grid three">
        <Card title="Ratings" kicker={now !== start ? `OVR ${start} → ${now} this season` : 'This season'}>
          <Radar g={g} compare={g.season?.attrsStart} />
          <AttrRows g={g} compare={g.season?.attrsStart} />
          <p className="muted small">● focus stat · the dashed shape is where you started the season.</p>
          <div className="meters">
            <Meter label="Range" value={p.range} tone="ink" />
            <Meter label={`${p.hand === 'L' ? 'Right' : 'Left'} hand (weak hand)`} value={p.offhand} tone="ink" />
          </div>
        </Card>
        <div className="stack">
          {t && (
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
          <NameCard g={g} />
          {g.mode === 'lab' && (
            <Card title="Evolution">
              <EvolutionArt ovr={now} name={p.name} number={p.number} kit={{ base: t?.color ?? '#1C7ED6', ink: '#FFFFFF', trim: '#F4F4F4', word: '' }} size={130} />
            </Card>
          )}
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
        </div>
        <div className="stack">
          <ScoutCard g={g} />
          {!p.scoutGrade && (
            <Card title="Scouting">
              <p className="muted">Scouts post a potential grade after your sophomore season. Your true potential, growth curve and durability stay hidden.</p>
            </Card>
          )}
          {/* round 24: up beside the ratings instead of below the long profile column */}
          <BodyMap g={g} narrow />
        </div>
      </div>
      <RosterCard g={g} />
    </div>
  );
}

// ---------- League ----------

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

export function LeagueTab({ g }: { g: GameState }) {
  const lg = leagueOf(g) ?? g.nba;
  if (!lg) return <Card title="League">No league data yet.</Card>;
  const players = lg.teams.flatMap((t) => t.roster.map((p) => ({ p, t })));
  const withLines = players.filter((x) => x.p.s && x.p.s.gp >= 10);
  const leaders = withLines.length
    ? [...withLines].sort((a, b) => perGame(b.p.s!, 'pts') - perGame(a.p.s!, 'pts')).slice(0, 15)
    : [...players].sort((a, b) => b.p.ovr - a.p.ovr).slice(0, 15);
  const races = g.lastSummary?.races ?? [];
  const best = standings(lg.teams)[0];
  const mine = lg.teams.find((t) => t.id === g.teamId);
  const last = g.nbaHistory[g.nbaHistory.length - 1];
  const conf = lg.level === 'NBA' ? ['East', 'West'] : [];
  return (
    <div className="page">
      <PageHero
        venue={venueOf(g)}
        arena={arenaOf(g)}
        place={placeOf(g)}
        stripe={trimOf(g)}
        kicker={seasonLabel(g.year)}
        title={lg.label ?? LEVELS[lg.level].name}
        sub={mine ? `Your team: ${mine.name}, ${mine.w}–${mine.l}` : 'Fictional players and teams'}
        color={mine?.color}
        stats={[
          { k: 'Best record', v: best && best.w + best.l > 0 ? `${best.short} ${best.w}–${best.l}` : '—' },
          { k: 'Scoring leader', v: withLines.length ? `${leaders[0].p.name.split(' ').slice(-1)[0]} ${perGame(leaders[0].p.s!, 'pts').toFixed(1)}` : '—' },
          ...(last ? [{ k: 'Last champion', v: last.champion }] : []),
        ]}
      />
      {conf.length ? (
        <div className="page-grid two">
          {conf.map((c) => (
            <Card key={c} title={`${c}ern Conference`}>
              <StandingsTable lg={lg} teams={lg.teams.filter((t) => t.conf === c)} userId={g.teamId} />
            </Card>
          ))}
        </div>
      ) : (
        <Card title="Standings">
          <Standings g={{ ...g, league: lg, stage: g.stage }} />
        </Card>
      )}
      <div className="page-grid two">
        <Card title={withLines.length ? 'Scoring leaders' : 'Top players'} kicker="Fictional players">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th className="l">Player</th>
                  <th className="l">Team</th>
                  <th>Age</th>
                  <th>OVR</th>
                  {withLines.length > 0 && <th>PPG</th>}
                </tr>
              </thead>
              <tbody>
                {leaders.map(({ p, t }, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td className="l">
                      {p.name} <span className="muted">{p.pos}</span>
                    </td>
                    <td className="l">
                      <span className="sw" style={{ background: t.color }} />
                      {t.abbr}
                    </td>
                    <td>{p.age}</td>
                    <td>{Math.round(p.ovr)}</td>
                    {withLines.length > 0 && <td>{perGame(p.s!, 'pts').toFixed(1)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {races.length > 0 ? (
          <Card title="Last season's award voting">
            {races.map((r) => (
              <div key={r.award} className="stack" style={{ gap: 4, marginBottom: 10 }}>
                <b>{r.award === 'MVP' ? 'MVP voting' : r.award}</b>
                <ol className="vote-list">
                  {r.top.map((x, i) => (
                    <li key={i} className={x.isUser ? 'me' : ''}>
                      <span>
                        {x.name} <span className="muted">({x.team}{x.ovr ? ` · OVR ${x.ovr}` : ''})</span>
                      </span>
                      {x.line && <span className="muted small">{x.line}</span>}
                    </li>
                  ))}
                </ol>
                {r.userRank && r.userRank > r.top.length ? <span className="small muted">You finished {ordinal(r.userRank)}.</span> : null}
              </div>
            ))}
          </Card>
        ) : (
          g.nbaHistory.length > 0 && <NbaHistoryCard g={g} />
        )}
      </div>
      {races.length > 0 && g.nbaHistory.length > 0 && <NbaHistoryCard g={g} />}
    </div>
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
        art={<PlayerArt name={g.player.name} number={g.player.number} pos={g.player.pos} color={t?.color} team={t?.name} abbr={t?.abbr} league={styleLeague(g.stage)} size={120} />}
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
      <CareerTimeline g={g} />
      <div className="start-cards">
        <AchievementsCard />
      </div>
      <Card title="Season by season">
        {g.history.length === 0 ? <p className="muted">Your seasons show up here after the first one.</p> : <HistoryTable rows={g.history} />}
        <p className="muted small">High school and college seasons are listed but do not count toward pro career totals.</p>
      </Card>
      {championships(g).length > 0 && (
        <Card title="Banners and rings" kicker="Every title hangs in the rafters">
          <BannersAndRings g={g} />
        </Card>
      )}
      <div className="page-grid two">
        <TrophyCabinet g={g} />
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
      <div className="page-grid two">
        <CareerHighs g={g} />
        {g.tournaments.length > 0 && (
          <Card title="Tournaments" kicker="Tap an event to see every game">
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
    </div>
  );
}
