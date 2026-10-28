import type { GameState } from '../../engine/types';
import { hallOfFame, legacyScore, nbaCareerPoints, raftersTeams, verdictFor } from '../../engine/awards/legacy';
import { valuePerGame, perGame } from '../../engine/sim/statModel';
import { LEVELS, MODES } from '../../engine/balance';
import { NAMES, UI } from '../../content/strings';
import { NBA_TEAMS } from '../../content/teams';
import { useStore } from '../../store';
import { Banners, Card, ReactionCard } from '../components/bits';
import { HistoryTable, trophyItems } from './Tabs';
import { fmtMoney, seasonLabel } from '../format';
import { compareCareer } from '../../engine/awards/compare';

function CareerAnalysis({ g }: { g: GameState }) {
  const c = compareCareer(g);
  if (!c.eligible) {
    return (
      <Card title="Among the all-time greats" kicker="Career analysis">
        <p className="muted small">{c.reason}</p>
      </Card>
    );
  }
  return (
    <Card title="Among the all-time greats" kicker="Career analysis · model vs 100 real legends">
      <div className="row">
        <div>
          <div className="kicker">Projected all-time rank</div>
          <div className="verdict" style={{ fontSize: 44 }}>
            {c.rank! <= 100 ? `No. ${c.rank}` : 'Outside the top 100'}
          </div>
        </div>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        {c.analysis!.map((x, i) => (
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
        from a nearest-neighbour search over scoring, rebounding, playmaking, best season, longevity, honours, size and position; the rank comes
        from a ridge regression trained on those players' all-time order.
      </p>
    </Card>
  );
}

export function Retirement({ g }: { g: GameState }) {
  const reset = useStore((s) => s.reset);
  const p = g.player;
  const v = verdictFor(g);
  const hof = hallOfFame(g);
  const rafters = raftersTeams(g).map((id) => NBA_TEAMS.find((t) => t.abbr === id)!);
  const pro = g.history.filter((h) => h.level === 'NBA' || h.level === 'GL' || h.level === 'EU' || h.level === 'INT');
  const pool = pro.length ? pro : g.history;
  const best = pool.filter((h) => h.line.gp > 0).sort((a, b) => valuePerGame(b.line) - valuePerGame(a.line))[0];
  const teams = [...new Set(g.history.filter((h) => h.level !== 'HSJV' && h.level !== 'HSV').map((h) => h.teamName))];
  const nbaSeasons = g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0).length;
  return (
    <div className="stack">
      <section className="final stack" style={{ gap: 10 }}>
        <div className="kicker">
          Retired at {g.retiredAt ?? p.age} · legacy score {legacyScore(g)} · {MODES[g.mode ?? 'standard'].name}
        </div>
        <div className="verdict">{v.tier}</div>
        <p className="lede">{v.line}</p>
        {hof && <div className="toast">{hof === 'first' ? 'Inducted into the Hall of Fame on the first ballot.' : 'Inducted into the Hall of Fame.'}</div>}
        {rafters.map((t) => (
          <div key={t.abbr} className="callout accent">
            <div className="kicker">The rafters</div>
            <div>
              The {t.city} {t.nick} retire number {p.number}. It hangs above the court forever.
            </div>
          </div>
        ))}
      </section>
      <CareerAnalysis g={g} />
      <Card title="Career card" kicker={`${NAMES.pos[p.pos]} · ${p.archetype}`}>
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
      {g.awards.length > 0 && (
        <Card title="Trophy cabinet">
          <Banners items={trophyItems(g)} />
        </Card>
      )}
      {g.feed[0] && (
        <Card title="The last word">
          <ReactionCard r={g.feed[0]} />
        </Card>
      )}
      <Card title="Your story">
        <ul className="feed">
          {g.log.map((e, i) => (
            <li key={i}>
              <span className="t">
                {e.year} · {e.age}
              </span>
              <span>{e.text}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Season by season">
        <HistoryTable rows={g.history} />
      </Card>
      <button className="btn block" onClick={reset}>
        {UI.newCareer}
      </button>
    </div>
  );
}
