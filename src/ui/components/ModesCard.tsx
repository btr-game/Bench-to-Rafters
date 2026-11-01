import type { GameState } from '../../engine/types';
import { useStore } from '../../store';
import { Icon } from '../art/Icon';

// Every way to play, one tap away (round 25, the owner: easier access to all the modes, above
// Around the league instead of in the top bar).

function Chip({ icon, label, on, onClick, tour, disabled }: { icon: string; label: string; on: boolean; onClick: () => void; tour: string; disabled?: boolean }) {
  return (
    <button data-tour={tour} className={`mode-chip${on ? ' on' : ''}`} aria-pressed={on} disabled={disabled} onClick={onClick}>
      <Icon name={icon} size={20} />
      {label}
    </button>
  );
}

const NOTE: [string, string][] = [
  ['sim', 'Sim: the season plays itself, turning points included (it lists the calls it made); it stops for offers, the draft and contracts.'],
  ['fast', 'Fast break: quick seasons; you still make every real call.'],
  ['simple', 'Simple text: just the choices.'],
  ['master', 'Master: no recommendations anywhere.'],
  ['guide', 'Guide: the next thing to do is highlighted.'],
];

export function ModesCard({ g }: { g: GameState }) {
  const st = useStore();
  // round 30: a Comet keeps Fast break and Sim on for the whole career
  const locked = g.mode === 'lab' || g.step === 'retired' || !!g.flags.daily || !!g.flags.oath || !!g.flags.comet;
  const oath = !!g.flags.oath;
  const on: Record<string, boolean> = { sim: !!g.flags.sim, fast: !!g.flags.fast, simple: st.simple, master: st.master, guide: st.guide && !st.master };
  const notes = NOTE.filter(([k]) => on[k] && !(k === 'fast' && on.sim)).map(([, t]) => t);
  // round 30: a Comet says why the two are locked on
  if (g.flags.comet) notes.unshift('Comet: Fast break and Sim stay on for the whole career, and only the biggest nights get a page.');
  return (
    <section className="card stack modes-card" data-tour="modes">
      <div className="kicker">How you play</div>
      <div className="mode-chips">
        <Chip icon="sim" label="Sim" on={on.sim} onClick={st.toggleSim} tour="chip-sim" disabled={locked} />
        <Chip icon="fast" label="Fast break" on={on.fast} onClick={st.toggleFast} tour="chip-fast" disabled={locked} />
        <Chip icon="simple" label="Simple text" on={on.simple} onClick={st.toggleSimple} tour="chip-simple" />
        <Chip icon="guide" label="Guide" on={on.guide} onClick={st.toggleGuide} tour="chip-guide" disabled={st.master} />
        <Chip icon="master" label="Master" on={on.master} onClick={st.toggleMaster} tour="chip-master" disabled={oath} />
        {g.mode !== 'lab' && <Chip icon="bracket" label="Play playoffs" on={!g.flags.simPostseason} onClick={st.togglePlayoffs} tour="chip-playoffs" disabled={!!g.flags.daily || !!g.flags.fast} />}
      </div>
      {oath && (
        <p className="small oath-note with-icon">
          <Icon name="oath" size={20} />
          Rough Road: a player the road picked, master mode and every season played, for the whole career.
        </p>
      )}
      {notes.length > 0 && (
        <ul className="small muted mode-notes">
          {notes.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
