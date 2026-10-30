// Round 22: duo art. The two of them (three, with a Big Three) side by side in the team's kit, under the name the league
// gave them: his archetype's pose next to a pose that fits his partner's position. Shown on the
// page where the duo forms and on the duo card.

import type { GameState } from '../../engine/types';
import type { Bond } from '../../engine/career/duo';
import { team as teamOf } from '../selectors';
import { HeroArt, archPose } from './Hero';
import type { HeroPose } from './heroRows';
import { kitFor, styleLeague } from './Player';

const PARTNER_POSES: Record<Bond['pos'], HeroPose[]> = {
  PG: ['handle', 'hesitation', 'nolook', 'lowdribble'],
  SG: ['pullup', 'catchshoot', 'drive', 'jumper'],
  SF: ['jumper', 'fadeaway', 'spin', 'drive'],
  PF: ['facing', 'post', 'hip', 'powerdrive'],
  C: ['post', 'dunk', 'skyhook', 'wall'],
};

/** A pose for the partner that is not the same as his. */
function partnerPose(b: Bond, mine: HeroPose): HeroPose {
  const list = PARTNER_POSES[b.pos].filter((x) => x !== mine);
  return list[b.id % list.length];
}

export function DuoArt({ g, b, third, size = 150 }: { g: GameState; b: Bond; third?: Bond | null; size?: number }) {
  const p = g.player;
  const t = teamOf(g);
  const kit = kitFor(t?.name ?? '', t?.abbr ?? '', t?.color ?? '#7048E8', 'home', styleLeague(g.stage));
  const mine = archPose(p.archetype, p.pos);
  return (
    <figure className="duo-art" style={{ ['--team' as string]: t?.color ?? '#7048E8' }} aria-label={`${p.name} and ${b.name}: ${b.nick}`}>
      <div className="duo-pair">
        <div className="duo-one">
          <HeroArt pose={mine} kit={kit} model={p.name} number={p.number} size={size} />
          <span>{p.name}</span>
        </div>
        {[b, ...(third ? [third] : [])].map((x) => (
          <div key={x.id} className="duo-one">
            <HeroArt pose={partnerPose(x, mine)} kit={kit} model={x.name} number={(x.id % 54) + 1} size={third ? Math.round(size * 0.9) : size} />
            <span>{x.name}</span>
          </div>
        ))}
      </div>
      {(third?.nick ?? b.nick) && <figcaption className="duo-nick">{third?.nick ?? b.nick}</figcaption>}
    </figure>
  );
}
