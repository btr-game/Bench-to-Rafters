// Round 22: a gold card for every legendary season, on the end-of-career page.

import type { GameState } from '../../engine/types';
import { legendarySeasons } from '../../engine/awards/legendary';
import { perGame } from '../../engine/sim/statModel';
import { LEVELS } from '../../engine/balance';
import { HeroArt, archPose } from '../art/Hero';
import { kitFor, styleLeague } from '../art/Player';
import { seasonLabel } from '../format';
import { badge, ink } from '../art/color';
import { Card } from './bits';
import { t } from '../../i18n';

export function LegendarySeasons({ g }: { g: GameState }) {
  const list = legendarySeasons(g);
  if (list.length === 0) return null;
  const p = g.player;
  return (
    <Card title={t('Legendary seasons')} fold="Legendary seasons" kicker={list.length === 1 ? t('1 season for the ages') : t('{n} seasons for the ages', { n: list.length })}>
      <div className="legend-grid">
        {list.map((x) => {
          const h = x.season;
          const kit = kitFor(h.teamName, '', h.teamColor, 'home', styleLeague(h.stage));
          return (
            <article key={h.year} className={`legend-card rank-${Math.min(x.rank, 6)}`} style={{ ['--team' as string]: h.teamColor, ['--team-ink' as string]: ink(h.teamColor) }}>
              {/* the band's letters on the team colour, darkened just enough for 4.5:1 (round 33: a
                  mid red passed neither white nor black as it was) */}
              <div className="legend-band" style={badge(h.teamColor)}>
                <span className="num">{seasonLabel(h.year)}</span>
                <span>{t('Age {age}', { age: h.age })}</span>
              </div>
              <div className="legend-body">
                <div className="legend-art">
                  <HeroArt pose={archPose(p.archetype, p.pos)} kit={kit} model={p.name} number={p.number} size={118} />
                </div>
                <div className="legend-text">
                  <div className="legend-name">{x.name}</div>
                  <div className="small">{t(x.line)}</div>
                  <div className="legend-team small muted">
                    {h.teamName} · {LEVELS[h.level].short} · {h.w}-{h.l}
                  </div>
                  <div className="legend-line num">
                    {perGame(h.line, 'pts').toFixed(1)} PTS · {perGame(h.line, 'reb').toFixed(1)} REB · {perGame(h.line, 'ast').toFixed(1)} AST
                  </div>
                </div>
              </div>
              {x.honours.length > 0 && (
                <div className="legend-chips">
                  {x.honours.map((a) => (
                    <span key={a} className="chip">
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </Card>
  );
}
