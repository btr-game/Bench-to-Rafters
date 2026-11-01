import type { GameState } from '../../engine/types';
import { championships, hallOfFame, nbaCareerPoints, raftersTeams, verdictFor } from '../../engine/awards/legacy';
import { valuePerGame, perGame } from '../../engine/sim/statModel';
import { LEVELS, MODES } from '../../engine/balance';
import { NAMES, UI } from '../../content/strings';
import { useStore } from '../../store';
import { Card, ReactionCard } from '../components/bits';
import { HistoryTable } from './Tabs';
import { BannersAndRings, TrophyCabinet } from '../components/Trophies';
import { CareerHighs } from '../components/Highs';
import { RaftersPage, RaftersSummary } from '../components/Rafters';
import { fmtMoney, seasonLabel } from '../format';
import { compareCareer } from '../../engine/awards/compare';
import { LegacyRankCard, LegacyTierList } from '../components/Legacy';
import { legacyIndex } from '../../engine/awards/tiers';
import { useMemo, useState } from 'react';
import { careerRecord } from '../../engine/career/record';
import { CardActions, LoggedNote } from './CareerLog';
import { CommunityNote } from './Community';
import { LegendarySeasons } from '../components/Legendary';
import { CareerTimeline } from '../components/Timeline';
import { DailyResult } from '../mini/Daily';
import { BannerArt } from '../art/Trophy';
import { ChildEnd, NextGen } from '../components/NextGen';

function CareerAnalysis({ g }: { g: GameState }) {
  const c = compareCareer(g);
  if (!c.eligible) {
    return (
      <Card title="Closest careers among the greats" kicker="Career analysis">
        <p className="muted small">{c.reason}</p>
      </Card>
    );
  }
  return (
    <Card title="Closest careers among the greats" kicker="Career analysis · style model vs 100 real legends">
      <div className="stack" style={{ gap: 6 }}>
        {/* the ranking itself comes from the legacy tier list above; this card compares styles */}
        {c.analysis!.slice(1).map((x, i) => (
          <p key={i} style={{ margin: 0 }}>
            {x}
          </p>
        ))}
      </div>
      <div className="sec-title" style={{ marginTop: 12 }}>
        Closest careers
      </div>
      <div className="stack" style={{ gap: 6 }}>
        {c.comps!.map((x) => (
          <div key={x.name} className="mvp">
            <div className="row">
              <b>{x.name}</b>
              <div className="spacer" />
              <span className="num">{x.similarity}% similar</span>
            </div>
            <div className="small muted">
              All-time No. {x.rank} · {x.line} · {x.honours}
            </div>
          </div>
        ))}
      </div>
      <div className="tbl-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th className="l">Stat</th>
              <th>You</th>
              <th>Rank among the 100</th>
            </tr>
          </thead>
          <tbody>
            {c.standing!.map((r) => (
              <tr key={r.label}>
                <td className="l">{r.label}</td>
                <td>{r.you}</td>
                <td>{r.rankAmong <= 100 ? `${r.rankAmong}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        The comparison set is 100 of the greatest NBA players with approximate career averages and honours through 2024–25. Comparables come
        from a nearest-neighbour search over scoring, rebounding, playmaking, best season, longevity, honours, size and position.
      </p>
    </Card>
  );
}

function Championships({ g }: { g: GameState }) {
  const titles = championships(g);
  if (titles.length === 0) return null;
  const nba = titles.filter((x) => x.nba);
  // "3x NBA champion: Charlotte Hornets (2), Los Angeles Lakers"
  const byTeam = [...new Set(nba.map((x) => x.teamName))].map((t) => {
    const n = nba.filter((x) => x.teamName === t).length;
    return n > 1 ? `${t} (${n})` : t;
  });
  return (
    <Card title="Championships" kicker={nba.length ? `${nba.length}× NBA champion · ${byTeam.join(', ')}` : `${titles.length} title${titles.length > 1 ? 's' : ''}`}>
      <BannersAndRings g={g} />
      <div className="titles">
        {titles.map((x, i) => (
          <div key={i} className={`title-row${x.nba ? ' nba' : ''}`} style={{ borderLeftColor: x.teamColor }}>
            <div className="title-year num">{seasonLabel(x.year)}</div>
            <div>
              <div className="title-team">{x.teamName}</div>
              <div className="small muted">
                {x.label} · {LEVELS[x.level as keyof typeof LEVELS]?.short ?? x.level}
                {x.finalsMvp ? (x.nba ? ' · Finals MVP' : ' · MVP of the final') : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}


/** The NBA teams he played for, in order (round 12). */
function NbaTeams({ g }: { g: GameState }) {
  const rows = g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0 && !/assignment/i.test(h.teamName));
  if (rows.length === 0) return null;
  const teams: { id: string; name: string; color: string; from: number; to: number; seasons: number; gp: number; pts: number; reb: number; ast: number; titles: number }[] = [];
  for (const h of rows) {
    let t = teams.find((x) => x.id === h.teamId);
    if (!t) {
      t = { id: h.teamId, name: h.teamName, color: h.teamColor, from: h.year, to: h.year, seasons: 0, gp: 0, pts: 0, reb: 0, ast: 0, titles: 0 };
      teams.push(t);
    }
    t.to = Math.max(t.to, h.year);
    t.seasons++;
    t.gp += h.line.gp;
    t.pts += h.line.pts;
    t.reb += h.line.reb;
    t.ast += h.line.ast;
    if (/champion/i.test(h.result)) t.titles++;
  }
  return (
    <Card title="NBA teams" kicker={`${teams.length} team${teams.length > 1 ? 's' : ''} · ${rows.length} season${rows.length > 1 ? 's' : ''}`}>
      <div className="titles">
        {teams.map((t) => (
          <div key={t.id} className="title-row" style={{ borderLeftColor: t.color }}>
            <div className="title-year">
              {t.from === t.to ? seasonLabel(t.from) : `${t.from}–${String(t.to + 1).slice(2)}`}
            </div>
            <div>
              <div className="title-team">{t.name}</div>
              <div className="small muted">
                {t.seasons} season{t.seasons > 1 ? 's' : ''} · {(t.pts / t.gp).toFixed(1)} PTS, {(t.reb / t.gp).toFixed(1)} REB, {(t.ast / t.gp).toFixed(1)} AST
                {t.titles ? ` · ${t.titles}× champion` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Retirement({ g }: { g: GameState }) {
  const reset = useStore((s) => s.reset);
  const rec = useMemo(() => careerRecord(g), [g]);
  const p = g.player;
  const v = verdictFor(g);
  const hof = hallOfFame(g);
  const hasRafters = raftersTeams(g).length > 0;
  // the rafters get their own page first: the ultimate goal of the game
  const [view, setView] = useState<'rafters' | 'career'>(hasRafters ? 'rafters' : 'career');
  const pro = g.history.filter((h) => h.level === 'NBA' || h.level === 'GL' || h.level === 'EU' || h.level === 'INT');
  const pool = pro.length ? pro : g.history;
  const best = pool.filter((h) => h.line.gp > 0).sort((a, b) => valuePerGame(b.line) - valuePerGame(a.line))[0];
  const teams = [...new Set(g.history.filter((h) => h.level !== 'HSJV' && h.level !== 'HSV').map((h) => h.teamName))];
  const nbaSeasons = g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0).length;
  if (view === 'rafters' && hasRafters) {
    return (
      <RaftersPage
        g={g}
        onContinue={() => {
          setView('career');
          window.scrollTo(0, 0);
        }}
      />
    );
  }
  return (
    <div className="stack">
      {g.flags.daily ? <DailyResult g={g} /> : null}
      <section className="final stack" style={{ gap: 10 }}>
        <div className="kicker">
          Retired at {g.retiredAt ?? p.age} · {legacyIndex(g)} legacy points · {MODES[g.mode ?? 'standard'].name}
        </div>
        <div className="verdict">{v.tier}</div>
        <p className="lede">{v.line}</p>
        {g.flags.oath ? (
          <div className="oath-honour">
            {/* round 27 (owner): its own banner for the rafters */}
            <BannerArt kind="oath" color="#7A1E1E" trim="#C9CFDA" lines={['ROUGH', 'ROAD']} size={132} />
            <span>
              <b>Rough Road, kept to the end</b>
              <small className="muted">Reality hits hard, master mode, every season played in full. Nobody handed this career anything.</small>
            </span>
          </div>
        ) : null}
        {/* round 32: a son's career has no card of its own: it goes onto his father's */}
        {g.flags.gen2 ? <ChildEnd g={g} /> : <LoggedNote />}
        {hof && <div className="toast">{hof === 'first' ? 'Inducted into the Hall of Fame on the first ballot.' : 'Inducted into the Hall of Fame.'}</div>}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {!g.flags.gen2 && <CardActions rec={rec} />}
          <button className="btn ghost" data-tour="retire-new" onClick={reset}>
            {UI.newCareer}
          </button>
        </div>
      </section>
      {/* round 28: what the career means for the community, as a card of its own right under the verdict */}
      {!g.flags.daily && !g.flags.gen2 && g.mode !== 'lab' && <CommunityNote rec={rec} />}
      <NextGen g={g} />
      <NbaTeams g={g} />
      <RaftersSummary
        g={g}
        onOpen={() => {
          setView('rafters');
          window.scrollTo(0, 0);
        }}
      />
      <LegacyRankCard g={g} />
      <CareerAnalysis g={g} />
      <Card title="Career card" kicker={`${NAMES.pos[p.pos]} · ${p.archetype}`} fold={false}>
        <div className="row">
          <div className="pc-name">{p.name}</div>
          <div className="spacer" />
          <div className="ovr">
            <b>{Math.round(p.peakOvr)}</b>
            <small>PEAK</small>
          </div>
        </div>
        <dl className="facts">
          <div>
            <dt>NBA seasons</dt>
            <dd>{nbaSeasons}</dd>
          </div>
          <div>
            <dt>NBA points</dt>
            <dd>{Math.round(nbaCareerPoints(g)).toLocaleString()}</dd>
          </div>
          <div>
            <dt>NBA games</dt>
            <dd>{g.nbaGames}</dd>
          </div>
          <div>
            <dt>Earnings</dt>
            <dd>{fmtMoney(p.earnings)}</dd>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <dt>Teams</dt>
            <dd>{teams.join(' · ') || p.highSchool}</dd>
          </div>
        </dl>
        {best && (
          <p className="small">
            Best season: {seasonLabel(best.year)} with {best.teamName} ({LEVELS[best.level].short}): {perGame(best.line, 'pts').toFixed(1)} PTS,{' '}
            {perGame(best.line, 'reb').toFixed(1)} REB, {perGame(best.line, 'ast').toFixed(1)} AST.
          </p>
        )}
      </Card>
      <LegendarySeasons g={g} />
      <Championships g={g} />
      {g.awards.length > 0 && <TrophyCabinet g={g} />}
      <CareerHighs g={g} />
      <LegacyTierList g={g} />
      {g.feed[0] && (
        <Card title="The last word">
          <ReactionCard r={g.feed[0]} />
        </Card>
      )}
      <CareerTimeline g={g} journal />
      <Card title="Season by season">
        <HistoryTable rows={g.history} />
      </Card>
      <button className="btn block" onClick={reset}>
        {UI.newCareer}
      </button>
    </div>
  );
}
