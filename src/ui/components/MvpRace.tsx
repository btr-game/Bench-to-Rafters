// The MVP race at the side of Home (engine/career/mvpRace.ts).

import type { GameState } from '../../engine/types';
import { liveMvpRace } from '../../engine/career/mvpRace';
import { ordinal } from '../format';

function verdict(rank: number | null, gap: number, final: boolean): string {
  if (rank === 1) return final ? 'You won it.' : gap === 0 ? 'You lead the race.' : 'You lead the race.';
  if (rank === null) return final ? 'You were not on enough ballots.' : 'Not in the race yet: play more games.';
  const how = gap <= 1 ? 'neck and neck' : gap <= 3 ? 'within reach' : gap <= 6 ? 'a long way back' : 'out of it';
  return final ? `You finished ${ordinal(rank)}: ${how === 'out of it' ? 'never close' : how}.` : `You are ${ordinal(rank)}: ${how}.`;
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
          <div className="kicker">{r.final ? 'Final voting' : `After ${r.games} games`}</div>
          <div className="sec-title">MVP race</div>
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
