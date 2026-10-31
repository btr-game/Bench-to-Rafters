import type { CareerRecord } from '../../engine/career/record';
import { PlayerStatue } from './Player';

// A statue in the plaza (round 24, owner: "basically the player design but in bronze or gold";
// round 27: "the statues should also be in the cute avatars not the detailed ones"): his cute
// sprite cast in metal, on a stone plinth with his name.
export function StatueArt({ rec, metal, size = 150 }: { rec: CareerRecord; metal: 'bronze' | 'gold'; size?: number }) {
  return (
    <div className={`statue ${metal}`}>
      <PlayerStatue name={rec.name} number={rec.number} pos={rec.pos} metal={metal} size={size} />
      <div className="plinth">
        <b>{rec.name}</b>
        <small>#{rec.number}</small>
      </div>
    </div>
  );
}
