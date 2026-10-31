import type { GameState } from '../../engine/types';
import { RivalScene } from '../art/Scene';

// His rival (round 25): who, at which level, the head to head and the race season by season.

const LEVEL: Record<string, string> = { draft: 'Draft-class rival', starter: 'Head-to-head rival', mvp: 'MVP rival' };

export function RivalCard({ g }: { g: GameState }) {
  const r = g.rivalry;
  if (!r) return null;
  const now = r.seasons[r.seasons.length - 1];
  return (
    <section className={`card stack rival-card lvl-${r.level}`} data-tour="rival">
      <RivalScene g={g} r={r} />
      <div>
        <div className="kicker">{LEVEL[r.level]} · since {r.since}</div>
        <h2 className="title">{r.name}</h2>
        <div className="small muted">
          {r.pos} · {r.ended ?? r.team}
        </div>
      </div>
      <dl className="facts">
        <div>
          <dt>Head to head</dt>
          <dd>
            {r.w}–{r.l}
          </dd>
        </div>
        {now && (
          <div>
            <dt>OVR now</dt>
            <dd>
              You {now.me} · him {now.him}
            </dd>
          </div>
        )}
      </dl>
      {r.seasons.length > 1 && (
        <div className="rival-race" aria-label="OVR season by season, you against him">
          {r.seasons.slice(-10).map((x) => (
            <span key={x.year} className={x.me > x.him ? 'up' : x.me < x.him ? 'down' : ''} title={`${x.year}: you ${x.me}, him ${x.him}`} />
          ))}
        </div>
      )}
      {r.notes.length > 0 && <p className="small">{r.notes[r.notes.length - 1]}</p>}
    </section>
  );
}
