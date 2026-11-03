import type { GameState } from '../../engine/types';
import { RivalScene } from '../art/Scene';
import { t, tx } from '../../i18n';

// His rival (round 25): who, at which level, the head to head and the race season by season.

const LEVEL: Record<string, string> = { draft: tx('Draft-class rival'), starter: tx('Head-to-head rival'), mvp: tx('MVP rival') };

export function RivalCard({ g }: { g: GameState }) {
  const r = g.rivalry;
  if (!r) return null;
  const now = r.seasons[r.seasons.length - 1];
  return (
    <section className={`card stack rival-card lvl-${r.level}`} data-tour="rival">
      <RivalScene g={g} r={r} />
      <div>
        <div className="kicker">{t(LEVEL[r.level])} · {t('since {year}', { year: r.since })}</div>
        <h2 className="title">{r.name}</h2>
        <div className="small muted">
          {r.pos} · {r.ended ?? r.team}
        </div>
      </div>
      <dl className="facts">
        <div>
          <dt>{t('Head to head')}</dt>
          <dd>
            {r.w}–{r.l}
          </dd>
        </div>
        {now && (
          <div>
            <dt>{t('OVR now')}</dt>
            <dd>
              {t('You {me} · him {him}', { me: now.me, him: now.him })}
            </dd>
          </div>
        )}
      </dl>
      {r.seasons.length > 1 && (
        <div className="rival-race" aria-label={t('OVR season by season, you against him')}>
          {r.seasons.slice(-10).map((x) => (
            <span key={x.year} className={x.me > x.him ? 'up' : x.me < x.him ? 'down' : ''} title={t('{year}: you {me}, him {him}', { year: x.year, me: x.me, him: x.him })} />
          ))}
        </div>
      )}
      {r.notes.length > 0 && <p className="small">{r.notes[r.notes.length - 1]}</p>}
    </section>
  );
}
