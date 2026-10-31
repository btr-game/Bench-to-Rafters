// The sound board (round 26, owner: "put all the sounds that are in the game, with buttons that can
// play them"). Every effect with where it plays, the music loop and the Lockdown beat. They play even
// with the game's sound switches off; nothing here changes those switches.

import { useEffect, useState } from 'react';
import { SFX, previewMusic, sfx } from '../ui/sound';
import { previewBeat } from '../ui/mini/Lockdown';
import { Icon } from '../ui/art/Icon';

export function SoundBoard() {
  const [music, setMusic] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => () => previewMusic(false), []);
  return (
    <section className="stack dk-sounds">
      <div>
        <h2 className="sec-title with-icon">
          <Icon name="live" size={30} />
          Sound board
        </h2>
        <p className="small muted">Every sound in the game, made in the browser (no files). They play here even with the game's sound switched off.</p>
      </div>
      <div className="dk-sound-grid">
        {SFX.map(([id, where]) => (
          <button key={id} className={`dk-sound${last === id ? ' on' : ''}`} onClick={() => (sfx(id, true), setLast(id))}>
            <b>{id}</b>
            <small>{where}</small>
          </button>
        ))}
      </div>
      <div className="kicker">Loops</div>
      <div className="dk-sound-grid">
        <button className={`dk-sound${music ? ' on' : ''}`} aria-pressed={music} onClick={() => (previewMusic(!music), setMusic(!music))}>
          <b>{music ? 'Stop the music' : 'Music loop'}</b>
          <small>Plays while a career is on screen, when Music is on in the settings</small>
        </button>
        <button className={`dk-sound${last === 'beat' ? ' on' : ''}`} onClick={() => (previewBeat(), setLast('beat'))}>
          <b>Lockdown beat</b>
          <small>The count-in sticks, then two bars of kick, snare and hats</small>
        </button>
      </div>
    </section>
  );
}
