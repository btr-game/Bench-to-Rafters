// The MVP race at the side of Home (engine/career/mvpRace.ts).

import type { GameState } from '../../engine/types';
import { liveMvpRace } from '../../engine/career/mvpRace';
import { ordinal } from '../format';
import { t } from '../../i18n';

function verdict(rank: number | null, gap: number, final: boolean): string {
  if (rank === 1) return final ? t('You won it.') : gap === 0 ? t('You lead the race.') : t('You lead the race.');
  if (rank === null) return final ? t('You were not on enough ballots.') : t('Not in the race yet: play more games.');
  const far = gap > 6;
  const how = gap <= 1 ? t('neck and neck') : gap <= 3 ? t('within reach') : gap <= 6 ? t('a long way back') : t('out of it');
  return final ? t('You finished {rank}: {how}.', { rank: ordinal(rank), how: far ? t('never close') : how }) : t('You are {rank}: {how}.', { rank: ordinal(rank), how });
}

export function MvpRace({ g }: { g: GameState }) {
  const r = liveMvpRace(g);
  if (!r || r.rows.length === 0) return null;
  const top = Math.max(...r.rows.map((x) => x.score));
  const low = Math.min(...r.rows.map((x) => x.score));
  return (
    <section className="card stack mvp-race">
      <div className="row">
        <div>
          <div className="kicker">{r.final ? t('Final voting') : t('After {n} games', { n: r.games })}</div>
          <div className="sec-title">{t('MVP race')}</div>
        </div>
      </div>
      <div className="small">{verdict(r.userRank, r.gap, r.final)}</div>
      <ol className="mvp-ladder">
        {r.rows.map((x, i) => (
          <li key={x.name} className={x.isUser ? 'me' : ''}>
            <span className="mvp-rank">{x.isUser && r.userRank ? r.userRank : i + 1}</span>
            <div className="mvp-who">
              <b>
                {x.name} <span className="muted">{x.team}</span>
              </b>
              <small>
                {x.line}
                {x.record ? ` · ${x.record}` : ''}
              </small>
              <div className="mvp-bar">
                <span style={{ width: `${Math.max(6, 100 - ((top - x.score) / Math.max(1, top - low + 2)) * 80)}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
