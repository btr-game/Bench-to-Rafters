// Built in a lab (round 20, second take: "increase the amount of pixels every time"). The player
// is the same traced model at every level, drawn at the same size, and each level he gains
// pixels: high school 14 rows tall, university 20, a lower league 28, the NBA 40, All-Star 56
// and MVP the full 80 in a gold glow. A track shows every level (the ones ahead as
// silhouettes), and the art flashes when he moves up.

import { useEffect, useRef, useState } from 'react';
import type { Kit } from '../../content/teamStyle';
import { HeroArt } from './Hero';
import type { HeroPose } from './heroRows';

export const EVO_STAGES = [
  { name: 'High school', from: 0, res: 14 },
  { name: 'University', from: 65, res: 20 },
  { name: 'Lower league', from: 70, res: 28 },
  { name: 'NBA', from: 75, res: 40 },
  { name: 'All-Star', from: 80, res: 56 },
  { name: 'MVP', from: 89, res: 80 },
];
const TOP = EVO_STAGES.length - 1;

export const evoStage = (ovr: number): number => EVO_STAGES.reduce((st, s, i) => (ovr >= s.from ? i : st), 0);

export function EvolutionArt({ ovr, pose, name, number, kit, size = 150, track = true }: { ovr: number; pose: HeroPose; name: string; number: number; kit: Kit; size?: number; track?: boolean }) {
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
  const art = (i: number, h: number) => <HeroArt pose={pose} kit={kit} model={name} number={number} size={h} res={i === TOP ? undefined : EVO_STAGES[i].res} />;
  return (
    <div className={`evo${stage === TOP ? ' evo-mvp' : ''}`}>
      <div className={`evo-art${flash ? ' evo-flash' : ''}`} style={{ height: size + 18 }}>
        {art(stage, size)}
        {flash && <span className="evo-tag">Evolved: {EVO_STAGES[stage].name}</span>}
      </div>
      {track && (
        <ol className="evo-track" aria-label="Evolution">
          {EVO_STAGES.map((s, i) => (
            <li key={s.name} className={i < stage ? 'done' : i === stage ? 'now' : 'next'} title={`${s.name}${s.from ? ` · OVR ${s.from}+` : ''}`}>
              <span className="evo-mini">{art(i, 48)}</span>
              <span className="evo-name">{s.name}</span>
              <span className="evo-from">{s.from ? `${s.from}+` : 'start'}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
