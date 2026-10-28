// Season, Player, League and Records tabs.

import { LegacyTierList } from '../components/Legacy';
import { NbaBracket } from '../components/NbaBracket';
import { useState } from 'react';
import type { GameState, League, SeasonRecord, SeriesResult, StatLine, Team } from '../../engine/types';
import { LEVELS } from '../../engine/balance';
import { standings } from '../../engine/sim/leagueSim';
import { addLine, emptyLine, perGame } from '../../engine/sim/statModel';
import { count, legacyScore, nbaTitles } from '../../engine/awards/legacy';
import { NAMES } from '../../content/strings';
import { Banners, Card, Meter, Scoreboard, type BannerItem } from '../components/bits';
import { AttrRows } from '../components/PlayerCard';
import { ScoutCard } from '../components/ScoutCard';
import { fmtMoney, ht, pct, pg, seasonLabel } from '../format';
import { ordinal } from '../../engine/career/season';
import { useStore } from '../../store';
import { league as leagueOf, ovr } from '../selectors';

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
                  <span className="sw" style={{ background: t.color }} />
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
      {graphic && <NbaBracket bracket={b} league={lg} userTeamId={g.teamId} />}
      {graphic && <div className="sec-title">Every series</div>}
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

export function SeasonTab({ g }: { g: GameState }) {
  const [view, setView] = useState<'log' | 'standings' | 'bracket'>('log');
  return (
    <Card title="Season" kicker={seasonLabel(g.year)}>
      <div className="subtabs">
        {(['log', 'standings', 'bracket'] as const).map((v) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
            {v === 'log' ? 'Game log' : v === 'standings' ? 'Standings' : 'Bracket'}
          </button>
        ))}
      </div>
      {view === 'log' && <GameLogTable g={g} />}
      {view === 'standings' && <Standings g={g} />}
      {view === 'bracket' && <BracketView g={g} />}
    </Card>
  );
}

// ---------- Player ----------

function PlayoffToggle({ g }: { g: GameState }) {
  const toggle = useStore((s) => s.togglePlayoffs);
  const sim = !!g.flags.simPostseason;
  return (
    <div className="row" style={{ gap: 10, marginTop: 10 }}>
      <span className="small">
        Postseason games: <b>{sim ? 'simulated' : 'playable'}</b>
      </span>
      <div className="spacer" />
      <button className="btn ghost small" onClick={toggle}>
        {sim ? 'Make them playable' : 'Always simulate'}
      </button>
    </div>
  );
}

export function PlayerTab({ g }: { g: GameState }) {
  const p = g.player;
  const c = g.contract;
  const lg = leagueOf(g);
  const contractTeam = c && lg ? lg.teams.find((t) => t.id === c.teamId)?.name : null;
  return (
    <div className="home-grid">
      <div className="stack">
      <ScoutCard g={g} />
      <Card title="Ratings" kicker={`${NAMES.pos[p.pos]} · OVR ${Math.round(ovr(g))} · peak ${Math.round(p.peakOvr)}`}>
        <AttrRows g={g} compare={g.season?.attrsStart} />
        <p className="muted small">● focus stat. Changes are since the start of this season.</p>
        <div className="sec-title">Meters</div>
        <div className="meters">
          <Meter label="Range" value={p.range} tone="ink" />
          <Meter label={`${p.hand === 'L' ? 'Right' : 'Left'} hand (weak hand)`} value={p.offhand} tone="ink" />
        </div>
      </Card>
      </div>
      <div className="stack">
        <Card title="Status">
          <div className="meters">
            <Meter label="Morale" value={p.morale} />
            <Meter label="Coach trust" value={p.trust} />
            <Meter label="Reputation" value={p.rep} tone="ink" />
            <Meter label="Body wear" value={p.wear ?? 0} tone={(p.wear ?? 0) >= 50 ? "bad" : (p.wear ?? 0) >= 25 ? "warn" : "good"} />
            <p className="small muted" style={{ margin: 0 }}>Body wear builds with heavy minutes, hard plans and injuries, and makes aging hit harder after 30. Recovery plans, rest summers and health purchases bring it down.</p>
          </div>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>
                {ht(p.height)}
                {p.height < p.heightProj ? <span className="muted"> → about {ht(p.heightProj)}</span> : null}
              </dd>
            </div>
            <div>
              <dt>Wingspan</dt>
              <dd>{ht(p.wingspan)}</dd>
            </div>
            <div>
              <dt>Hometown</dt>
              <dd>{p.hometown}</dd>
              <dt>Nationality</dt>
              <dd>{p.country}</dd>
            </div>
            <div>
              <dt>Shoots</dt>
              <dd>{p.hand === 'L' ? 'Left-handed' : 'Right-handed'}</dd>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <dt>Scouts' read on your game</dt>
              <dd>
                {(p.fit ?? [{ name: p.archetype, conf: 1 }]).map((f) => `${f.name} ${Math.round(f.conf * 100)}%`).join(' · ')}
                {p.anomaly ? ` · rare: ${p.anomaly}` : ''}
              </dd>
            </div>
            <div>
              <dt>Captain</dt>
              <dd>{p.captain ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
          <PlayoffToggle g={g} />
        </Card>
        <Card title="Scouting">
          {p.scoutGrade ? (
            <p>
              Scouts' potential grade: <b>{p.scoutGrade}</b>, projected ceiling {p.scoutRange![0]}–{p.scoutRange![1]}.
            </p>
          ) : (
            <p className="muted">Scouts post a potential grade after your sophomore season.</p>
          )}
          <p className="muted small">Your true potential, growth curve and durability are hidden. The grade gets more accurate as you get older.</p>
          {g.stars > 1 && g.stage === 'HS' && (
            <p>
              Recruiting: <b>{'★'.repeat(g.stars)}</b>
              {g.recruitRank ? `, ranked ${g.recruitRank} in the class` : ''}
            </p>
          )}
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
          <p>
            Bank {fmtMoney(p.bank)} · career earnings {fmtMoney(p.earnings)}
          </p>
        </Card>
        {p.programs.length > 0 && (
          <Card title="Programs">
            <ul className="small" style={{ paddingLeft: 18 }}>
              {p.programs.map((x) => (
                <li key={x.id}>
                  {x.name}: {x.seasonsLeft} season{x.seasonsLeft === 1 ? '' : 's'} left
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
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
    <Card title="NBA record book" kicker="Champions and award winners">
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
  return (
    <div className="stack">
      <Card title={lg.label ?? LEVELS[lg.level].name} kicker={seasonLabel(lg.year)}>
        <Standings g={{ ...g, league: lg, stage: lg.level === 'NBA' ? 'NBA' : g.stage }} />
      </Card>
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
      {races.length > 0 && (
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
      )}
      {g.nbaHistory.length > 0 && <NbaHistoryCard g={g} />}
    </div>
  );
}

// ---------- Records ----------

function totals(rows: SeasonRecord[]): StatLine {
  const t = emptyLine();
  for (const r of rows) addLine(t, r.line);
  return t;
}

export function trophyItems(g: GameState): BannerItem[] {
  const counts = new Map<string, number>();
  for (const a of g.awards) counts.set(a.label, (counts.get(a.label) ?? 0) + 1);
  return [...counts.entries()].map(([label, c]) => ({ label, count: c, gold: /Champion|MVP|Player of the Year|champion/.test(label) }));
}

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
  return (
    <div className="stack">
      <Card title="Season by season">
        {g.history.length === 0 ? <p className="muted">Your seasons show up here after the first one.</p> : <HistoryTable rows={g.history} />}
        <p className="muted small">High school and college seasons are listed but do not count toward pro career totals.</p>
      </Card>
      {g.tournaments.length > 0 && (
        <Card title="Tournaments" kicker="Tap an event to see every game">
          <div className="stack" style={{ gap: 6 }}>
            {[...g.tournaments].reverse().map((t, i) => (
              <details key={i} className="tourney">
                <summary>
                  <span className="tourney-head">
                    <b>
                      {t.name}
                    </b>
                    <span className="muted small">
                      {t.year} · {t.team} · {t.result}
                    </span>
                  </span>
                  <span className="num small">{t.line && t.line.gp ? `${pg(t.line, 'pts')} PPG` : '—'}</span>
                </summary>
                <div className="series-games">
                  {(t.games ?? []).map((gm, k) => (
                    <span key={k}>
                      {gm.post ?? `Game ${k + 1}`}: {gm.res} {gm.us}–{gm.them} vs {gm.opp}
                      {gm.line ? ` · ${gm.line.pts} pts, ${gm.line.reb} reb, ${gm.line.ast} ast` : ' · DNP'}
                    </span>
                  ))}
                  {(t.notes ?? []).map((n, k) => (
                    <span key={`n${k}`} className={n.startsWith('Champion') ? 'strong' : ''}>
                      {n}
                    </span>
                  ))}
                  {!t.games && !t.notes && <span>No game details for this event.</span>}
                </div>
              </details>
            ))}
          </div>
        </Card>
      )}
      <Card title="Trophy cabinet">{g.awards.length === 0 ? <p className="muted">Empty, for now.</p> : <Banners items={trophyItems(g)} />}</Card>
      <LegacyTierList g={g} />
      <Card title="Career totals" kicker={`Legacy score ${legacyScore(g)}`}>
        {nbaT.gp > 0 && (
          <>
            <div className="kicker">NBA · {nba.length} seasons · {nbaT.gp} games</div>
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
      <Card title="Decision log">
        <ul className="feed">
          {[...g.log].reverse().map((e, i) => (
            <li key={i}>
              <span className="t">
                {e.year} · {e.age}
              </span>
              <span>{e.text}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
