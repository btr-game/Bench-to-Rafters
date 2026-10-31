// The sound board (round 26, owner: "put all the sounds that are in the game, with buttons that can
// play them"). Every effect with where it plays, the music loop and the Lockdown beat at each of its
// tempos. They play even with the game's sound switches off; nothing here changes those switches.
// Round 27 (owner: "the Lockdown beat loops and I can't stop it"): the beat is a loop with a stop,
// one at a time, and Stop everything ends whatever is playing.

import { useEffect, useRef, useState } from 'react';
import { SFX, previewMusic, sfx } from '../ui/sound';
import { beatLoop } from '../ui/mini/Lockdown';
import { PATTERNS, TEMPOS } from '../engine/mini/rhythm';
import { Icon } from '../ui/art/Icon';

export function SoundBoard() {
  const [music, setMusic] = useState(false);
  const [beat, setBeat] = useState<number | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const stopBeat = useRef<(() => void) | null>(null);
  const playBeat = (bpm: number | null) => {
    stopBeat.current?.();
    stopBeat.current = bpm ? beatLoop(bpm) : null;
    setBeat(bpm);
  };
  const stopAll = () => {
    playBeat(null);
    previewMusic(false);
    setMusic(false);
  };
  // leaving the board stops the loops
  useEffect(
    () => () => {
      stopBeat.current?.();
      previewMusic(false);
    },
    [],
  );
  return (
    <section className="stack dk-sounds">
      <div className="dk-sound-head">
        <div>
          <h2 className="sec-title with-icon">
            <Icon name="live" size={30} />
            Sound board
          </h2>
          <p className="small muted">Every sound in the game, made in the browser (no files). They play here even with the game's sound switched off.</p>
        </div>
        <button className="btn small" onClick={stopAll} disabled={!music && beat === null}>
          Stop everything
        </button>
      </div>
      <div className="dk-sound-grid">
        {SFX.map(([id, where]) => (
          <button key={id} className={`dk-sound${last === id ? ' on' : ''}`} onClick={() => (sfx(id, true), setLast(id))}>
            <b>{id}</b>
            <small>{where}</small>
          </button>
        ))}
      </div>
      <div className="kicker">The music loop</div>
      <div className="dk-sound-grid">
        <button className={`dk-sound${music ? ' on' : ''}`} aria-pressed={music} onClick={() => (previewMusic(!music), setMusic(!music))}>
          <b>{music ? 'Stop the music' : 'Music loop'}</b>
          <small>Plays while a career is on screen, when Music is on in the settings</small>
        </button>
      </div>
      <div className="kicker">The Lockdown beat</div>
      <p className="small muted">
        One beat: four sticks to count in, then kick on 1 and 3, snare on 2 and 4, hats on every half beat. Each run plays it at one of these {TEMPOS.length} tempos. The
        offense's {PATTERNS.length} sets are the notes you press on top of it; they make no sound of their own.
      </p>
      <div className="dk-sound-grid">
        {TEMPOS.map((bpm) => (
          <button key={bpm} className={`dk-sound${beat === bpm ? ' on' : ''}`} aria-pressed={beat === bpm} onClick={() => playBeat(beat === bpm ? null : bpm)}>
            <b>{beat === bpm ? `Stop ${bpm} bpm` : `${bpm} bpm`}</b>
            <small>{beat === bpm ? 'Looping. Tap to stop.' : 'Loops until stopped'}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
