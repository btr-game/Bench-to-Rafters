// The sound board (round 26, owner: "put all the sounds that are in the game, with buttons that can
// play them"). Every effect with where it plays and the Lockdown beat at each of its tempos. They
// play even with the game's sound switches off; nothing here changes those switches.
// Round 27 (owner: "the Lockdown beat loops and I can't stop it"): the beat is a loop with a stop,
// one at a time, and Stop everything ends whatever is playing.
// Round 29: the music has a tab of its own (MusicBoard), every loop with its icon (owner: "in the dev
// deck, can you add some icons to the music tab as well for distinction").

import { useEffect, useRef, useState } from 'react';
import { SFX, previewMusic, sfx } from '../ui/sound';
import { TRACKS, type TrackId } from '../ui/tracks';
import { beatLoop } from '../ui/mini/Lockdown';
import { PATTERNS, TEMPOS } from '../engine/mini/rhythm';
import { Icon } from '../ui/art/Icon';
import { CALLS, announce } from '../ui/announcer';

export function SoundBoard() {
  const [beat, setBeat] = useState<number | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const stopBeat = useRef<(() => void) | null>(null);
  const playBeat = (bpm: number | null) => {
    stopBeat.current?.();
    stopBeat.current = bpm ? beatLoop(bpm) : null;
    setBeat(bpm);
  };
  // leaving the board stops the beat
  useEffect(() => () => stopBeat.current?.(), []);
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
        <button className="btn small" onClick={() => playBeat(null)} disabled={beat === null}>
          Stop the beat
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
      {/* round 33 (owner: "the sounds from the announcer ... add that") */}
      <div className="kicker">The announcer</div>
      <p className="small muted">The browser's own voice, pitched low and slowed down, so it sounds a little different on every device (and is silent where the browser has no speech).</p>
      <div className="dk-sound-grid">
        {CALLS.map(([line, when]) => (
          <button key={line} className={`dk-sound${last === line ? ' on' : ''}`} onClick={() => (announce(line, true), setLast(line))}>
            <b>{line}</b>
            <small>{when}</small>
          </button>
        ))}
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

/** Round 29: every music loop, with the icon of where it plays; one at a time, tap again to stop. */
export function MusicBoard() {
  const [on, setOn] = useState<TrackId | null>(null);
  const play = (id: TrackId | null) => {
    previewMusic(id);
    setOn(id);
  };
  useEffect(() => () => previewMusic(null), []);
  const ids = Object.keys(TRACKS) as TrackId[];
  return (
    <section className="stack dk-sounds">
      <div className="dk-sound-head">
        <div>
          <h2 className="sec-title with-icon">
            <Icon name="note" size={30} />
            Music
          </h2>
          <p className="small muted">
            {ids.length} loops, written note by note (src/ui/tracks.ts) and played in the browser. The game picks one for what is on screen; Lockdown keeps its own beat (on the Sounds tab). They
            play here even with Music switched off.
          </p>
        </div>
        <button className="btn small" onClick={() => play(null)} disabled={!on}>
          Stop the music
        </button>
      </div>
      <div className="dk-sound-grid dk-music-grid">
        {ids.map((id) => {
          const t = TRACKS[id];
          return (
            <button key={id} className={`dk-sound dk-track${on === id ? ' on' : ''}`} aria-pressed={on === id} onClick={() => play(on === id ? null : id)}>
              <Icon name={t.icon} size={34} />
              <span>
                <b>{on === id ? `Stop ${t.name}` : t.name}</b>
                <small>{t.where}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
