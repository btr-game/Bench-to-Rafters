// Round 22: duo art. The two of them (three, with a Big Three) side by side in the team's kit, under
// the name the league gave them. Shown on the page where the duo forms and on the duo card.

import type { GameState } from '../../engine/types';
import type { Bond } from '../../engine/career/duo';
import { team as teamOf } from '../selectors';
import { PlayerArt, styleLeague } from './Player';

// Round 28 (owner: "for visuals of the duo and big three, make them the cute version"): the cute
// pixel players, the partners turned to face him.
export function DuoArt({ g, b, third, size = 150 }: { g: GameState; b: Bond; third?: Bond | null; size?: number }) {
  const p = g.player;
  const t = teamOf(g);
  const league = styleLeague(g.stage);
  const each = third ? Math.round(size * 0.82) : Math.round(size * 0.9);
  return (
    <figure className="duo-art" style={{ ['--team' as string]: t?.color ?? '#7048E8' }} aria-label={`${p.name} and ${b.name}: ${b.nick}`}>
      <div className="duo-pair">
        <div className="duo-one">
          <PlayerArt name={p.name} number={p.number} pos={p.pos} color={t?.color} team={t?.name} abbr={t?.abbr} league={league} size={each} wear={p.wardrobe?.on} />
          <span>{p.name}</span>
        </div>
        {[b, ...(third ? [third] : [])].map((x) => (
          <div key={x.id} className="duo-one">
            <PlayerArt name={x.name} number={(x.id % 54) + 1} pos={x.pos} color={t?.color} team={t?.name} abbr={t?.abbr} league={league} size={each} mirror />
            <span>{x.name}</span>
          </div>
        ))}
      </div>
      {(third?.nick ?? b.nick) && <figcaption className="duo-nick">{third?.nick ?? b.nick}</figcaption>}
    </figure>
  );
}
