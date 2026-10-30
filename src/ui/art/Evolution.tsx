// Built in a lab (round 20, third take). The player starts as the cute sprite in high school;
// every level after that is a different media-day photo of a player standing for the camera,
// traced into pixels, and each level has more pixels than the one before: university 20 rows
// tall, a lower league 28, the NBA 40, All-Star 56 and MVP the full 80 in a gold glow. A track
// shows every level (the ones ahead as silhouettes), and the art flashes when he moves up.

import { useEffect, useRef, useState } from 'react';
import type { Kit } from '../../content/teamStyle';
import { HeroArt } from './Hero';
import type { HeroPose } from './heroRows';
import { PlayerArt } from './Player';

// High school has no pose: it is the cute sprite
const EVO_STAGES: { name: string; from: number; pose?: HeroPose; res?: number }[] = [
  { name: 'High school', from: 0 },
  { name: 'University', from: 65, pose: 'spin', res: 20 },
  { name: 'Lower league', from: 70, pose: 'carry', res: 28 },
  { name: 'NBA', from: 75, pose: 'chest', res: 40 },
  { name: 'All-Star', from: 80, pose: 'hip', res: 56 },
  { name: 'MVP', from: 89, pose: 'mediaday' },
];
const TOP = EVO_STAGES.length - 1;

const evoStage = (ovr: number): number => EVO_STAGES.reduce((st, s, i) => (ovr >= s.from ? i : st), 0);

export function EvolutionArt({ ovr, name, number, kit, size = 150, track = true }: { ovr: number; name: string; number: number; kit: Kit; size?: number; track?: boolean }) {
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
  const art = (i: number, h: number) => {
    const st = EVO_STAGES[i];
    return st.pose ? <HeroArt pose={st.pose} kit={kit} model={name} number={number} size={h} res={st.res} /> : <PlayerArt name={name} number={number} kitData={kit} size={h} />;
  };
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
