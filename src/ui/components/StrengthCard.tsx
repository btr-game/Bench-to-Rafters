import { strengthBreakdown } from '../../engine/career/breakdown';
import type { GameState } from '../../engine/types';
import { ordinal } from '../format';
import { Card } from './bits';
import { t } from '../../i18n';

// How good his team is, and why (round 25, the owner: explain results). Each line is points of
// team strength a game, the way the season simulation adds them up; the bars are to scale.

const sign = (x: number) => {
  const r = Math.round(x * 10) / 10;
  return r === 0 ? '0.0' : `${r > 0 ? '+' : ''}${r.toFixed(1)}`;
};

export function StrengthCard({ g, title = t('Team strength') }: { g: GameState; title?: string }) {
  const b = strengthBreakdown(g);
  if (!b) return null;
  const max = Math.max(1, ...b.items.map((x) => Math.abs(x.value)));
  const verdict = b.rank === 1 ? t('the best team in the league on paper') : b.rank <= Math.ceil(b.teams * 0.25) ? t('a contender') : b.rank <= Math.ceil(b.teams * 0.55) ? t('in the middle of the pack') : t('behind most of the league');
  return (
    <Card title={title} kicker={t('{change} over an average team · {rank} of {n}', { change: sign(b.total), rank: ordinal(b.rank), n: b.teams })} tour="strength">
      <p className="small">
        {t('All of it together makes your team')} <b>{verdict}</b>. {t('Each line is what it adds to (or takes from) every game.')}
      </p>
      <div className="strength-bars">
        {b.items.map((x) => (
          <div key={x.label} className={`sb-row k-${x.kind}`}>
            <span className="sb-label">{x.label}</span>
            <span className="sb-track" aria-hidden="true">
              <span className={`sb-fill ${x.value >= 0 ? 'up' : 'down'}`} style={{ width: `${(Math.abs(x.value) / max) * 50}%`, [x.value >= 0 ? 'left' : 'right']: '50%' }} />
            </span>
            <span className="sb-val">
              {sign(x.value)}
              {x.playoff !== undefined && x.playoff !== x.value ? <small>{t('{change} playoffs', { change: sign(x.playoff) })}</small> : null}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
