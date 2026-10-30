// Built in a lab (round 20: "show the evolution of the player, from a puny high school student
// to an MVP-level player: start with the cute version and grow into detailed pixel art as OVR
// grows"). Five stages by OVR: the cute sprite small, then big, then the detailed traced player
// standing with the ball, in his position's action, and finally a signature move in a gold glow.
// A track shows every stage (the ones ahead as silhouettes), and the art flashes when he levels up.

import { useEffect, useRef, useState } from 'react';
import type { Pos } from '../../engine/types';
import type { Kit } from '../../content/teamStyle';
import { PlayerArt } from './Player';
import { HeroArt, POS_POSE } from './Hero';
import type { HeroPose } from './heroRows';

export const EVO_STAGES = [
  { name: 'Raw prospect', from: 0 },
  { name: 'Rising', from: 66 },
  { name: 'Starter', from: 75 },
  { name: 'All-Star', from: 85 },
  { name: 'MVP', from: 92 },
];

/** Each position's signature move at MVP level. */
const SIGNATURE: Record<Pos, HeroPose> = { PG: 'nolook', SG: 'fadeaway', SF: 'twohand', PF: 'post', C: 'skyhook' };

export const evoStage = (ovr: number): number => EVO_STAGES.reduce((st, s, i) => (ovr >= s.from ? i : st), 0);

function StageArt({ stage, pos, name, number, kit, size }: { stage: number; pos: Pos; name: string; number: number; kit: Kit; size: number }) {
  if (stage <= 1) return <PlayerArt name={name} number={number} pos={pos} kitData={kit} size={Math.round(size * (stage === 0 ? 0.55 : 0.75))} />;
  const pose: HeroPose = stage === 2 ? 'hip' : stage === 3 ? POS_POSE[pos] : SIGNATURE[pos];
  return <HeroArt pose={pose} kit={kit} model={name} number={number} size={size} />;
}

export function EvolutionArt({ ovr, pos, name, number, kit, size = 150, track = true }: { ovr: number; pos: Pos; name: string; number: number; kit: Kit; size?: number; track?: boolean }) {
  const stage = evoStage(ovr);
  const last = useRef(stage);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (stage > last.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1400);
      last.current = stage;
      return () => clearTimeout(t);
    }
    last.current = stage;
  }, [stage]);
  return (
    <div className={`evo${stage === 4 ? ' evo-mvp' : ''}`}>
      <div className={`evo-art${flash ? ' evo-flash' : ''}`} style={{ height: size + 18 }}>
        <StageArt stage={stage} pos={pos} name={name} number={number} kit={kit} size={size} />
        {flash && <span className="evo-tag">Evolved: {EVO_STAGES[stage].name}</span>}
      </div>
      {track && (
        <ol className="evo-track" aria-label="Evolution">
          {EVO_STAGES.map((s, i) => (
            <li key={s.name} className={i < stage ? 'done' : i === stage ? 'now' : 'next'} title={`${s.name}${s.from ? ` · OVR ${s.from}+` : ''}`}>
              <span className="evo-mini">
                <StageArt stage={i} pos={pos} name={name} number={number} kit={kit} size={48} />
              </span>
              <span className="evo-name">{s.name}</span>
              <span className="evo-from">{s.from ? `${s.from}+` : 'start'}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
