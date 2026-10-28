import type { CareerHigh, GameState, HighKey } from '../../engine/types';
import { HIGH_LABEL } from '../../engine/career/breakthrough';
import { LEVELS } from '../../engine/balance';
import { seasonLabel } from '../format';
import { Card } from './bits';

const KEYS: HighKey[] = ['pts', 'reb', 'ast', 'stl', 'blk', 'tpm'];

function Cell({ h, showLevel }: { h?: CareerHigh; showLevel?: boolean }) {
  if (!h) return <td className="muted">—</td>;
  return (
    <td className="hi-cell">
      <b className="num">{h.v}</b>
      <small>
        vs {h.opp} · {seasonLabel(h.year)}
        {showLevel ? ` · ${LEVELS[h.level].short}` : ''}
        {h.post ? ` · ${h.post}` : ''}
      </small>
    </td>
  );
}

/** Best single games: in the NBA and at any level. */
export function CareerHighs({ g }: { g: GameState }) {
  const h = g.highs;
  if (!h || Object.keys(h.all).length === 0) return null;
  const nba = Object.keys(h.nba).length > 0;
  return (
    <Card title="Career highs" kicker="Best single games">
      <div className="tbl-wrap">
        <table className="highs">
          <thead>
            <tr>
              <th className="l">Stat</th>
              {nba && <th className="l">NBA</th>}
              <th className="l">Any level</th>
            </tr>
          </thead>
          <tbody>
            {KEYS.map((k) => (
              <tr key={k}>
                <td className="l">{HIGH_LABEL[k]}</td>
                {nba && <Cell h={h.nba[k]} />}
                <Cell h={h.all[k]} showLevel />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
