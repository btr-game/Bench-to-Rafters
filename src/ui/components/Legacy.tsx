import type { GameState } from '../../engine/types';
import { LEGEND_PTS, TIERS, legacyRank, tierCounts } from '../../engine/awards/tiers';
import { ink } from '../art/color';
import { Card } from './bits';
import { t } from '../../i18n';

/** The tier list: every honour by weight, with what this career earned highlighted. */
export function LegacyTierList({ g }: { g: GameState }) {
  const have = tierCounts(g);
  return (
    <Card title={t('Legacy tier list')} fold="Legacy tier list" kicker={t('What counts most toward a legacy')}>
      <div className="tiers">
        {TIERS.map((tier) => (
          <div key={tier.tier} className="tier-row">
            <div className="tier-badge" style={{ background: tier.color, color: ink(tier.color) }}>
              <b>{tier.tier}</b>
              <small>{tier.name}</small>
            </div>
            <div className="tier-items">
              {tier.items.map((it) => {
                const n = have[it.key] ?? 0;
                return (
                  <span key={it.key} className={`tier-item${n > 0 ? ' got' : ''}`} style={n > 0 ? { borderColor: tier.color } : undefined} title={it.note}>
                    {it.label}
                    <em>{it.pts} pts</em>
                    {n > 0 && <b style={{ background: tier.color, color: ink(tier.color) }}>×{n}</b>}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="muted small">{t('Plus 1 point for every 1,500 NBA points scored. Highlighted honours are the ones this career has earned so far.')}</p>
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
    <Card title={t('All-time legacy ranking')} fold="All-time legacy ranking" kicker={t('Scored with the tier list against 100 real legends')}>
      <div className="row">
        <div>
          <div className="kicker">{t('Legacy rank')}</div>
          <div className="verdict" style={{ fontSize: 44 }}>
            {inTop ? t('No. {n}', { n: r.rank }) : t('Outside the top 100')}
          </div>
        </div>
        <div className="spacer" />
        <div className="ovr">
          <b>{r.pts}</b>
          <small>{t('LEGACY PTS')}</small>
        </div>
      </div>
      <p style={{ margin: 0 }}>
        {r.rank === 1
          ? t('By legacy points, {name} is the greatest of all time, ahead of {below}.', { name: g.player.name, below: r.below?.name ?? '' })
          : inTop
          ? r.below
            ? t('Just behind {above} ({abovePts}) and ahead of {below} ({belowPts}).', { above: r.above?.name ?? '', abovePts: r.above?.pts ?? '', below: r.below.name, belowPts: r.below.pts })
            : t('Just behind {above} ({abovePts}).', { above: r.above?.name ?? '', abovePts: r.above?.pts ?? '' })
          : t('The 100th player on the list has {pts} points. {n} more would have put this career among them.', { pts: LEGEND_PTS[99].pts, n: (LEGEND_PTS[99].pts - r.pts).toFixed(1) })}
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
