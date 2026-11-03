import type { GameState } from '../../engine/types';
import { useStore } from '../../store';
import { Icon } from '../art/Icon';
import { allows } from '../../engine/levels';
import { useState } from 'react';
import { MODES } from '../../engine/balance';
import { difficultiesLeft, simOpen } from '../achievements';
import { t, tx } from '../../i18n';

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

/** A level's switches: Fast break (on, for the level's pace) from intermediate, Sim in advanced. */
function LevelModes({ g }: { g: GameState }) {
  const st = useStore();
  const fast = allows(g, 'fast');
  const sim = allows(g, 'sim');
  if (!fast && !sim) return null;
  const notes = NOTE.filter(([k]) => (k === 'sim' && g.flags.sim) || (k === 'fast' && g.flags.fast && !g.flags.sim)).map(([, x]) => t(x));
  return (
    <section className="card stack modes-card" data-tour="modes">
      <div className="kicker">{t('How you play')}</div>
      <div className="mode-chips">
        {sim && <Chip icon="sim" label={t('Sim')} on={!!g.flags.sim} onClick={st.toggleSim} tour="chip-sim" disabled={g.step === 'retired'} />}
        {fast && <Chip icon="fast" label={t('Fast break')} on={!!g.flags.fast} onClick={st.toggleFast} tour="chip-fast" disabled={g.step === 'retired'} />}
      </div>
      {notes.length > 0 && (
        <ul className="small muted mode-notes">
          {notes.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

const NOTE: [string, string][] = [
  ['sim', tx('Sim: the season plays itself, turning points included (it lists the calls it made); it stops for offers, the draft and contracts.')],
  ['fast', tx('Fast break: quick seasons; you still make every real call.')],
  ['simple', tx('Simple text: just the choices.')],
  ['master', tx('Master: no recommendations anywhere.')],
  ['guide', tx('Guide: the next thing to do is highlighted.')],
];

export function ModesCard({ g }: { g: GameState }) {
  const st = useStore();
  // round 35: Sim opens once a career has been finished at every difficulty (read once a visit)
  const [shut] = useState(() => !simOpen());
  const [left] = useState(() => difficultiesLeft());
  // round 33: a level shows only its own switches (Fast break from intermediate, Sim in advanced);
  // beginner has none, so no card
  if (g.flags.level) return <LevelModes g={g} />;
  // round 30: a Comet keeps Fast break and Sim on for the whole career
  const locked = g.mode === 'lab' || g.step === 'retired' || !!g.flags.daily || !!g.flags.oath || !!g.flags.comet || !!g.flags.friends;
  const oath = !!g.flags.oath;
  const simShut = !g.flags.sim && (st.simShut || shut);
  const on: Record<string, boolean> = { sim: !!g.flags.sim, fast: !!g.flags.fast, simple: st.simple, master: st.master, guide: st.guide && !st.master };
  const notes = NOTE.filter(([k]) => on[k] && !(k === 'fast' && on.sim)).map(([, x]) => t(x));
  // round 30: a Comet says why the two are locked on
  if (g.flags.comet) notes.unshift(t('{comet}: Fast break and Sim stay on for the whole career, and only the biggest nights get a page.', { comet: 'Comet' }));
  // round 35: and a career with friends says why they are locked off
  if (g.flags.friends) notes.unshift(t('With friends: Fast break and Sim stay off, so everyone in the challenge or class plays every season the same way.'));
  if (simShut && !locked) notes.unshift(t('Sim opens once you have played a career to retirement with an NBA All-Star team on every difficulty. Still to go: {modes}.', { modes: left.map((m) => MODES[m].name).join(', ') }));
  return (
    <section className="card stack modes-card" data-tour="modes">
      <div className="kicker">{t('How you play')}</div>
      <div className="mode-chips">
        <Chip icon="sim" label={t('Sim')} on={on.sim} onClick={st.toggleSim} tour="chip-sim" disabled={locked || simShut} />
        <Chip icon="fast" label={t('Fast break')} on={on.fast} onClick={st.toggleFast} tour="chip-fast" disabled={locked} />
        <Chip icon="simple" label={t('Simple text')} on={on.simple} onClick={st.toggleSimple} tour="chip-simple" />
        <Chip icon="guide" label={t('Guide')} on={on.guide} onClick={st.toggleGuide} tour="chip-guide" disabled={st.master} />
        <Chip icon="master" label={t('Master')} on={on.master} onClick={st.toggleMaster} tour="chip-master" disabled={oath} />
        {g.mode !== 'lab' && <Chip icon="bracket" label={t('Play playoffs')} on={!g.flags.simPostseason} onClick={st.togglePlayoffs} tour="chip-playoffs" disabled={!!g.flags.daily || !!g.flags.fast} />}
      </div>
      {oath && (
        <p className="small oath-note with-icon">
          <Icon name="oath" size={20} />
          {t('{oath}: a player the road picked, master mode and every season played, for the whole career.', { oath: 'Rough Road' })}
        </p>
      )}
      {notes.length > 0 && (
        <ul className="small muted mode-notes">
          {notes.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
