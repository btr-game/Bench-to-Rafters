// What a level adds (round 33, owner: "for intermediate and advanced, can you show the users a quick
// overview (use a lot of icons and little text) of what will be added?"): a pixel icon and a word or
// two for each new system, after a tile for everything the levels before it had.

import { Icon } from '../art/Icon';
import { LEVEL_COPY } from '../../content/roadmap';
import { LEVEL_IDS, LEVEL_NAME, type Level } from '../../engine/levels';

export function LevelAdds({ level }: { level: Level }) {
  const before = LEVEL_IDS[LEVEL_IDS.indexOf(level) - 1];
  const adds = LEVEL_COPY[level].adds;
  return (
    <section className="card level-adds" aria-label={`New in ${LEVEL_NAME[level]}`} data-tour="level-adds">
      <div className="kicker">New in {LEVEL_NAME[level].toLowerCase()} · {adds.length}</div>
      <ul className="adds-grid">
        {before && (
          <li className="adds-was">
            <Icon name="checklist" size={40} />
            <span>All of {LEVEL_NAME[before].toLowerCase()}</span>
          </li>
        )}
        {adds.map((a) => (
          <li key={a.label}>
            <span className="adds-plus" aria-hidden="true">+</span>
            <Icon name={a.icon} size={40} />
            <span>{a.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
