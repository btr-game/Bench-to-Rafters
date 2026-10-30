import type { CareerRecord } from '../../engine/career/record';
import { archPose, heroSize, useStatuePaths } from './Hero';

// A statue in the plaza (round 24, owner: "basically the player design but in bronze or gold"):
// his archetype's traced action, cast in metal, on a stone plinth with his name.
export function StatueArt({ rec, metal, size = 150 }: { rec: CareerRecord; metal: 'bronze' | 'gold'; size?: number }) {
  const pose = archPose(rec.role, rec.pos);
  const paths = useStatuePaths(pose, metal);
  const [w, h] = heroSize(pose);
  return (
    <div className={`statue ${metal}`}>
      <svg className="art" width={(size * w) / h} height={size} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" role="img" aria-label={`A ${metal} statue of ${rec.name}`}>
        {paths.map((p) => (
          <path key={p.fill} d={p.d} fill={p.fill} />
        ))}
      </svg>
      <div className="plinth">
        <b>{rec.name}</b>
        <small>#{rec.number}</small>
      </div>
    </div>
  );
}
