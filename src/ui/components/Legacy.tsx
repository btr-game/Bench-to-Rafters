import type { GameState } from '../../engine/types';
import { LEGEND_PTS, TIERS, legacyRank, tierCounts } from '../../engine/awards/tiers';
import { Card } from './bits';

/** The tier list: every honour by weight, with what this career earned highlighted. */
export function LegacyTierList({ g }: { g: GameState }) {
  const have = tierCounts(g);
  return (
    <Card title="Legacy tier list" kicker="What counts most toward a legacy">
      <div className="tiers">
        {TIERS.map((t) => (
          <div key={t.tier} className="tier-row">
            <div className="tier-badge" style={{ background: t.color }}>
              <b>{t.tier}</b>
              <small>{t.name}</small>
            </div>
            <div className="tier-items">
              {t.items.map((it) => {
                const n = have[it.key] ?? 0;
                return (
                  <span key={it.key} className={`tier-item${n > 0 ? ' got' : ''}`} style={n > 0 ? { borderColor: t.color } : undefined} title={it.note}>
                    {it.label}
                    <em>{it.pts} pts</em>
                    {n > 0 && <b style={{ background: t.color }}>×{n}</b>}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="muted small">Plus 1 point for every 1,500 NBA points scored. Highlighted honours are the ones this career has earned so far.</p>
    </Card>
  );
}

/** Where the legacy places him among the 100 legends, with the neighbours on the ladder. */
export function LegacyRankCard({ g }: { g: GameState }) {
  const r = legacyRank(g);
  const i = r.rank - 1; // his index once inserted
  const ladder = [
    ...LEGEND_PTS.slice(Math.max(0, i - 3), i).map((l, k) => ({ ...l, pos: Math.max(0, i - 3) + k + 1, me: false })),
    { name: g.player.name, pts: r.pts, pos: r.rank, me: true },
    ...LEGEND_PTS.slice(i, i + 3).map((l, k) => ({ ...l, pos: r.rank + k + 1, me: false })),
  ];
  const inTop = r.rank <= 100;
  return (
    <Card title="All-time legacy ranking" kicker="Scored with the tier list against 100 real legends">
      <div className="row">
        <div>
          <div className="kicker">Legacy rank</div>
          <div className="verdict" style={{ fontSize: 44 }}>
            {inTop ? `No. ${r.rank}` : 'Outside the top 100'}
          </div>
        </div>
        <div className="spacer" />
        <div className="ovr">
          <b>{r.pts}</b>
          <small>LEGACY PTS</small>
        </div>
      </div>
      <p style={{ margin: 0 }}>
        {r.rank === 1
          ? `By legacy points, ${g.player.name} is the greatest of all time, ahead of ${r.below?.name}.`
          : inTop
          ? `Just behind ${r.above?.name} (${r.above?.pts})${r.below ? ` and ahead of ${r.below.name} (${r.below.pts})` : ''}.`
          : `The 100th player on the list has ${LEGEND_PTS[99].pts} points. ${(LEGEND_PTS[99].pts - r.pts).toFixed(1)} more would have put this career among them.`}
      </p>
      {inTop && (
        <ol className="ladder">
          {ladder.map((x) => (
            <li key={`${x.name}-${x.pos}`} className={x.me ? 'me' : ''}>
              <span className="num">{x.pos}</span>
              <span>{x.name}</span>
              <span className="num">{x.pts}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
