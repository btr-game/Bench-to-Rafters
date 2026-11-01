// The music (round 29, owner: "add more loop music to the game. especially for intro and thank you
// page, i want bright, cheerful music. minigames can each have one (except for lockdown), the
// offseason could have a different one from mid-season, high school, college, and each league can
// have one too"). Each loop is written out note by note, one token an eighth note:
//   C5, F#4, Bb3  a note (C4 is middle C); notes joined by + sound together (a chord)
//   -             holds the note before for one more eighth
//   .             rest;  | marks a bar and is skipped
// Drums: k kick, s snare, h hi-hat, K kick and hat, S snare and hat, . nothing.
// A voice shorter than the loop repeats; `every: 2` plays only on every other time round.
// sound.ts plays them; the dev deck's Music tab lists them with their icons.

import type { GameState } from '../engine/types';
import { inTutorial, nextLevel, type Road } from './road';

export type Wave = 'square' | 'triangle' | 'sawtooth' | 'pulse25' | 'pulse12';

interface Voice {
  notes: string;
  wave: Wave;
  vol: number;
  every?: 2;
}

export interface Track {
  name: string;
  where: string;
  icon: string;
  /** Seconds per eighth note. */
  step: number;
  voices: Voice[];
  drums?: string;
}

const bpm = (b: number) => 30 / b;

export interface NoteEvent {
  semis: number[];
  len: number;
}

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "F#4" as semitones from middle C. */
function semi(note: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!m) throw new Error(`Bad note ${note}`);
  return LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
}

/** A voice's tokens as one slot an eighth: a note (or chord) with how long it rings, or nothing. */
export function parseVoice(notes: string): (NoteEvent | null)[] {
  const toks = notes.split(/\s+/).filter((t) => t && t !== '|');
  const at: (NoteEvent | null)[] = toks.map(() => null);
  toks.forEach((t, i) => {
    if (t === '.' || t === '-') return;
    let len = 1;
    while (toks[i + len] === '-') len++;
    at[i] = { semis: t.split('+').map(semi), len };
  });
  return at;
}


export const TRACKS = {
  intro: {
    name: 'Tip-off',
    where: 'The intro, on a first visit',
    icon: 'stars',
    step: bpm(160),
    voices: [
      { wave: 'pulse25', vol: 0.11, notes: 'E5 - G5 - C6 - B5 A5 | G5 - - - D5 - G5 - | A5 - C6 - E6 - D6 C6 | C6 - A5 - F5 - G5 - | E5 G5 C6 G5 E5 G5 C6 E6 | D6 - B5 - G5 - B5 D6 | C6 - A5 - F5 A5 C6 - | B5 - D6 - G6 - - -' },
      { wave: 'triangle', vol: 0.32, notes: 'C3 . C3 C4 . C3 G3 . | G2 . G2 G3 . G2 D3 . | A2 . A2 A3 . A2 E3 . | F2 . F2 F3 . F2 C3 . | C3 . C3 C4 . C3 G3 . | G2 . G2 G3 . G2 D3 . | F2 . F2 F3 . F2 C3 . | G2 . G2 G3 . G2 B2 .' },
      { wave: 'pulse12', vol: 0.05, notes: '. C5+E5 . C5+E5 . C5+E5 . C5+E5 | . B4+D5 . B4+D5 . B4+D5 . B4+D5 | . C5+E5 . C5+E5 . C5+E5 . C5+E5 | . A4+C5 . A4+C5 . A4+C5 . A4+C5' },
    ],
    drums: 'khshkksh',
  },
  thanks: {
    name: 'Curtain call',
    where: 'The thank-you page, after every career',
    icon: 'heart',
    step: bpm(140),
    voices: [
      { wave: 'pulse25', vol: 0.11, notes: 'D5 - G5 - B5 - A5 G5 | B5 - - - G5 - E5 - | E5 - G5 - C6 - B5 A5 | A5 - - - F#5 - D5 - | D5 G5 B5 D6 - B5 G5 - | E6 - D6 - B5 - G5 - | C6 - B5 - A5 - F#5 - | G5 - - - - - . .' },
      { wave: 'triangle', vol: 0.32, notes: 'G2 . D3 . G2 . D3 . | E2 . B2 . E2 . B2 . | C3 . G3 . C3 . G3 . | D3 . A3 . D3 . A3 . | G2 . D3 . G2 . D3 . | E2 . B2 . E2 . B2 . | C3 . G3 . D3 . A3 . | G2 . D3 . G2 . G3 .' },
      { wave: 'pulse12', vol: 0.05, notes: '. B4+D5 . B4+D5 . B4+D5 . B4+D5 | . G4+B4 . G4+B4 . G4+B4 . G4+B4 | . G4+C5 . G4+C5 . G4+C5 . G4+C5 | . F#4+A4 . F#4+A4 . F#4+A4 . F#4+A4' },
    ],
    drums: 'khshk.sh',
  },
  start: {
    name: 'Locker room',
    where: 'The start page (the game’s first loop, round 25)',
    icon: 'house',
    step: 0.22,
    voices: [
      { wave: 'triangle', vol: 0.35, notes: 'C3 C3 G3 G3 F3 F3 G3 G3 | C3 C3 G3 G3 F3 F3 Eb3 G3' },
      { wave: 'square', vol: 0.12, every: 2, notes: 'C5 . E5 . G5 . E5 D5 | C5 . E5 . F5 E5 D5 .' },
    ],
    drums: 'h...h...',
  },
  hs: {
    name: 'Gym class hero',
    where: 'High school seasons, JV and varsity',
    icon: 'lvl-HSV',
    step: bpm(150),
    voices: [
      { wave: 'pulse25', vol: 0.1, notes: 'A4 C5 F5 . A5 . G5 F5 | D5 - F5 - A5 - - . | Bb4 D5 F5 . Bb5 . A5 G5 | G5 - E5 - C5 - - .' },
      { wave: 'triangle', vol: 0.32, notes: 'F2 . F3 . F2 . F3 . | D2 . D3 . D2 . D3 . | Bb2 . Bb3 . Bb2 . Bb3 . | C3 . C4 . C3 . C4 .' },
    ],
    drums: 'khshkhsh',
  },
  college: {
    name: 'Fight song',
    where: 'College seasons',
    icon: 'lvl-NCAA',
    step: bpm(120),
    voices: [
      { wave: 'sawtooth', vol: 0.06, notes: 'F5 - - D5 Bb4 - D5 F5 | G5 - - Eb5 Bb4 - Eb5 G5 | A5 - F5 - C5 - A4 - | Bb4 - D5 - F5 - Bb5 - | D6 - - Bb5 F5 - Bb5 D6 | Eb6 - - C6 G5 - C6 Eb6 | D6 - C6 - A5 - F5 A5 | Bb5 - - - . . F5 F5' },
      { wave: 'triangle', vol: 0.32, notes: 'Bb2 . F3 . Bb2 . F3 . | Eb3 . Bb3 . Eb3 . Bb3 . | F2 . C3 . F2 . C3 . | Bb2 . F3 . Bb2 . F3 .' },
    ],
    drums: 'k.s.k.ss',
  },
  gleague: {
    name: 'Bus ride',
    where: 'G League seasons',
    icon: 'lvl-GL',
    step: bpm(104),
    voices: [
      { wave: 'pulse25', vol: 0.1, notes: '. . B4 . D5 E5 . . | G5 - E5 - D5 . B4 . | . . B4 . D5 E5 . G5 | A5 - G5 - E5 - - .' },
      { wave: 'triangle', vol: 0.34, notes: 'E2 . E3 E2 . G2 A2 . | E2 . E3 E2 . D3 B2 .' },
    ],
    drums: 'KhSh.KSh',
  },
  europe: {
    name: 'Euro step',
    where: 'Seasons in Europe, in waltz time',
    icon: 'lvl-EU',
    step: bpm(132),
    voices: [
      { wave: 'pulse12', vol: 0.1, notes: 'A5 - - F5 E5 D5 | E5 - - G5 F5 E5 | F5 - - A5 G5 F5 | G5 - - - D5 - | E5 - - G5 F5 E5 | F5 - - A5 C6 A5 | Bb5 - - G5 E5 D5 | C#5 - - E5 A5 -' },
      { wave: 'triangle', vol: 0.32, notes: 'D3 . . . . . | A2 . . . . . | D3 . . . . . | G2 . . . . . | C3 . . . . . | F2 . . . . . | G2 . . . . . | A2 . . . . .' },
      { wave: 'pulse12', vol: 0.05, notes: '. . F4+A4 . F4+A4 . | . . E4+G4 . E4+G4 . | . . F4+A4 . F4+A4 . | . . G4+Bb4 . G4+Bb4 . | . . E4+G4 . E4+G4 . | . . F4+A4 . F4+A4 . | . . G4+Bb4 . G4+Bb4 . | . . E4+C#5 . E4+C#5 .' },
    ],
    drums: 'k.h.h.',
  },
  intl: {
    name: 'Passport',
    where: 'Seasons in the leagues around the world',
    icon: 'lvl-INT',
    step: bpm(128),
    voices: [
      { wave: 'pulse25', vol: 0.1, notes: 'D5 E5 F#5 A5 - B5 A5 F#5 | E5 - D5 - B4 - D5 - | D5 E5 F#5 A5 - B5 D6 B5 | A5 - F#5 - E5 - D5 -' },
      { wave: 'triangle', vol: 0.32, notes: 'D3 . A2 . D3 . A2 . | B2 . F#2 . B2 . A2 .' },
    ],
    drums: 'k.hhs.h.',
  },
  nba: {
    name: 'Prime time',
    where: 'NBA seasons',
    icon: 'lvl-NBA',
    step: bpm(120),
    voices: [
      { wave: 'sawtooth', vol: 0.06, notes: 'B4 - E5 - G#5 - B5 - | C#6 - B5 - G#5 - E5 - | A5 - - G#5 F#5 - E5 F#5 | F#5 - - - D#5 - B4 - | B4 E5 G#5 B5 - B5 C#6 B5 | G#5 - - E5 - G#5 B5 - | C#6 - B5 - A5 - G#5 F#5 | F#5 - G#5 - A5 - B5 -' },
      { wave: 'triangle', vol: 0.34, notes: 'E2 E2 E3 E2 E2 E2 E3 E2 | C#2 C#2 C#3 C#2 C#2 C#2 C#3 C#2 | A2 A2 A3 A2 A2 A2 A3 A2 | B2 B2 B3 B2 B2 B2 B3 B2' },
    ],
    drums: 'KhShKKSh',
  },
  offseason: {
    name: 'Summer league',
    where: 'Every offseason and free agency, at any level',
    icon: 'palm',
    step: bpm(96),
    voices: [
      { wave: 'pulse25', vol: 0.09, notes: 'C5 - - A4 - C5 D5 - | E5 - - - C5 - A4 - | D5 - - Bb4 - D5 F5 - | E5 - - - G5 - - .' },
      { wave: 'triangle', vol: 0.32, notes: 'F2 - . F2 A2 - C3 . | A2 - . A2 C3 - E3 . | Bb2 - . Bb2 D3 - F3 . | C3 - . C3 E3 - G3 .' },
      { wave: 'pulse12', vol: 0.05, notes: '. F4+A4+C5 . F4+A4+C5 . F4+A4+C5 . F4+A4+C5 | . E4+A4+C5 . E4+A4+C5 . E4+A4+C5 . E4+A4+C5 | . F4+Bb4+D5 . F4+Bb4+D5 . F4+Bb4+D5 . F4+Bb4+D5 | . E4+G4+C5 . E4+G4+C5 . E4+G4+C5 . E4+G4+C5' },
    ],
    drums: 'h.hhS.h.',
  },
  retired: {
    name: 'Jersey night',
    where: 'The end of a career',
    icon: 'statue',
    step: bpm(84),
    voices: [
      { wave: 'pulse25', vol: 0.1, notes: 'G4 - - - C5 - E5 - | E5 - - - D5 - C5 - | C5 - - - A4 - C5 - | D5 - - - - - . . | G4 - - - C5 - E5 - | G5 - - - E5 - D5 - | C5 - A4 - B4 - D5 - | C5 - - - - - . .' },
      { wave: 'triangle', vol: 0.3, notes: 'C3 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - - | C3 - - - - - - - | E2 - - - - - - - | F2 - - - G2 - - - | C3 - - - - - - -' },
      { wave: 'pulse12', vol: 0.04, notes: 'C4+E4+G4 - - - - - - - | A3+C4+E4 - - - - - - - | F3+A3+C4 - - - - - - - | G3+B3+D4 - - - - - - - | C4+E4+G4 - - - - - - - | G3+B3+E4 - - - - - - - | F3+A3+C4 - - - G3+B3+D4 - - - | C4+E4+G4 - - - - - - -' },
    ],
    drums: 'k...s...',
  },
  // round 33: the road map between the levels, and the end of a level that missed its goal (owner:
  // "make an ending card with sad music just for that")
  road: {
    name: 'Road trip',
    where: 'The road map, between the tutorial’s levels',
    icon: 'map',
    step: bpm(128),
    voices: [
      { wave: 'pulse25', vol: 0.1, notes: 'C5 - E5 G5 - E5 C5 - | D5 - F5 A5 - F5 D5 - | E5 - G5 C6 - G5 E5 - | F5 - E5 D5 - - . . | C5 - E5 G5 - E5 C5 - | A4 - C5 F5 - E5 D5 - | G4 - B4 D5 - F5 E5 D5 | C5 - - - - - . .' },
      { wave: 'triangle', vol: 0.32, notes: 'C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | E3 . B2 . E3 . B2 . | F2 . C3 . G2 . G2 . | C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . . .' },
      { wave: 'pulse12', vol: 0.05, notes: '. C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 | . D4+F4+A4 . D4+F4+A4 . D4+F4+A4 . D4+F4+A4 | . E4+G4+B4 . E4+G4+B4 . E4+G4+B4 . E4+G4+B4 | . F4+A4+C5 . F4+A4+C5 . G4+B4+D5 . G4+B4+D5' },
    ],
    drums: 'k.hsk.hs',
  },
  sad: {
    name: 'So close',
    where: 'The end of a level that missed its All-Star goal',
    icon: 'morale',
    step: bpm(76),
    voices: [
      { wave: 'pulse25', vol: 0.09, notes: 'A4 - - - C5 - B4 - | A4 - - - E4 - - - | F4 - - - A4 - G4 - | E4 - - - - - . . | A4 - - - C5 - D5 - | E5 - - - D5 - C5 - | B4 - - - G#4 - B4 - | A4 - - - - - . .' },
      { wave: 'triangle', vol: 0.28, notes: 'A2 - - - - - - - | E2 - - - - - - - | F2 - - - - - - - | C2 - - - - - - - | A2 - - - - - - - | C2 - - - - - - - | E2 - - - - - - - | A2 - - - - - - -' },
      { wave: 'pulse12', vol: 0.04, notes: 'A3+C4+E4 - - - - - - - | E3+G3+B3 - - - - - - - | F3+A3+C4 - - - - - - - | C3+E3+G3 - - - - - - - | A3+C4+E4 - - - - - - - | C3+E3+G3 - - - - - - - | E3+G#3+B3 - - - - - - - | A3+C4+E4 - - - - - - -' },
    ],
    drums: 'k.......',
  },
  hub: {
    name: 'Arcade',
    where: 'The mini-games hub and the daily challenge’s page',
    icon: 'controller',
    step: bpm(150),
    voices: [
      { wave: 'pulse25', vol: 0.1, notes: 'D5 - . D5 G5 - . . | E5 - G5 - B5 - . . | C6 - B5 - A5 - G5 - | F#5 - - - A5 - - .' },
      { wave: 'pulse12', vol: 0.05, notes: 'G4 B4 D5 B4 G4 B4 D5 B4 | E4 G4 B4 G4 E4 G4 B4 G4 | C4 E4 G4 E4 C4 E4 G4 E4 | D4 F#4 A4 F#4 D4 F#4 A4 F#4' },
      { wave: 'triangle', vol: 0.32, notes: 'G2 . G3 . G2 . G3 . | E2 . E3 . E2 . E3 . | C3 . C4 . C3 . C4 . | D3 . D4 . D3 . D4 .' },
    ],
    drums: 'khshkhsh',
  },
  office: {
    name: 'Front Office',
    where: 'Front Office: running a franchise',
    icon: 'office',
    step: bpm(112),
    voices: [
      { wave: 'pulse25', vol: 0.08, notes: 'A5 - F5 - D5 - E5 F5 | G5 - - F5 D5 - B4 - | C5 - E5 - G5 - B5 - | A5 - G5 - E5 - C#5 -' },
      { wave: 'triangle', vol: 0.32, notes: 'D3 - F3 - A3 - C4 - | G2 - B2 - D3 - F3 - | C3 - E3 - G3 - B3 - | A2 - C#3 - E3 - G3 -' },
      { wave: 'pulse12', vol: 0.05, notes: '. . F4+A4+C5 . . . F4+A4+C5 . | . . F4+B4+D5 . . . F4+B4+D5 . | . . E4+G4+B4 . . . E4+G4+B4 . | . . G4+C#5+E5 . . . G4+C#5+E5 .' },
    ],
    drums: 'h.shh.sh',
  },
  threes: {
    name: 'Rack ’em',
    where: 'The three-point contest',
    icon: 'range',
    step: bpm(168),
    voices: [
      { wave: 'pulse25', vol: 0.1, notes: 'F#5 . F#5 . A5 . F#5 D5 | F#5 . F#5 . B5 . A5 F#5 | G5 . G5 . B5 . D6 B5 | A5 - - - C#6 - E6 -' },
      { wave: 'triangle', vol: 0.32, notes: 'D3 D3 . D3 D3 . D3 . | B2 B2 . B2 B2 . B2 . | G2 G2 . G2 G2 . G2 . | A2 A2 . A2 A2 . A2 .' },
    ],
    drums: 'KhShKhSS',
  },
  dunk: {
    name: 'Showtime',
    where: 'The dunk contest',
    icon: 'flame',
    step: bpm(112),
    voices: [
      { wave: 'sawtooth', vol: 0.06, notes: '. . G5 . Bb5 . C6 . | Eb6 - C6 - Bb5 . G5 . | . . G5 . Bb5 . C6 Eb6 | F6 - Eb6 - C6 - - .' },
      { wave: 'triangle', vol: 0.34, notes: 'C3 . C4 C3 . Eb3 F3 . | C3 . C4 C3 . Bb2 G2 .' },
    ],
    drums: 'K.ShKKS.',
  },
  lab: {
    name: 'Lab coat',
    where: 'Built in a lab (the mini-game)',
    icon: 'lab',
    step: bpm(132),
    voices: [
      { wave: 'pulse25', vol: 0.08, notes: 'E5 - - . A5 - G#5 . | F5 - - . C5 - - . | D5 - F5 - A5 - C6 - | B5 - G#5 - E5 - - .' },
      { wave: 'pulse12', vol: 0.05, notes: 'A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 C5 A4 F4 A4 | D4 F4 A4 D5 A4 F4 D4 F4 | E4 G#4 B4 E5 B4 G#4 E4 G#4' },
      { wave: 'triangle', vol: 0.3, notes: 'A2 . . . A2 . . . | F2 . . . F2 . . . | D2 . . . D2 . . . | E2 . . . E2 . . .' },
    ],
    drums: 'k.h.sh.h',
  },
  street: {
    name: 'Blacktop',
    where: '3-on-3 streetball',
    icon: 'post',
    step: bpm(90),
    voices: [
      { wave: 'pulse25', vol: 0.09, notes: 'D5 . . Bb4 . . G4 . | A4 . . C5 . D5 . . | D5 . . F5 . . D5 . | C5 . Bb4 . A4 . . .' },
      { wave: 'triangle', vol: 0.34, notes: 'G2 - . G2 . . Bb2 C3 | D3 - . D3 . . C3 Bb2' },
    ],
    drums: 'K.S.hKS.',
  },
  legends: {
    name: 'Hall of legends',
    where: 'The legends showdown',
    icon: 'laurel',
    step: bpm(116),
    voices: [
      { wave: 'sawtooth', vol: 0.06, notes: 'D5 - - - A5 - - - | Bb5 - A5 - G5 - F5 - | A5 - - - C6 - - - | G5 - - - - - E5 - | F5 - E5 - D5 - A5 - | D6 - - - Bb5 - G5 - | C6 - Bb5 - A5 - G5 - | A5 - - - C#6 - E6 -' },
      { wave: 'triangle', vol: 0.34, notes: 'D2 D2 D3 D2 D2 D2 D3 D2 | Bb1 Bb1 Bb2 Bb1 Bb1 Bb1 Bb2 Bb1 | F2 F2 F3 F2 F2 F2 F3 F2 | C2 C2 C3 C2 C2 C2 C3 C2 | D2 D2 D3 D2 D2 D2 D3 D2 | Bb1 Bb1 Bb2 Bb1 Bb1 Bb1 Bb2 Bb1 | C2 C2 C3 C2 C2 C2 C3 C2 | A1 A1 A2 A1 A1 A1 A2 A1' },
    ],
    drums: 'K.ShK.SS',
  },
} satisfies Record<string, Track>;

export type TrackId = keyof typeof TRACKS;

const LEVEL_TRACK: Record<string, TrackId> = { HS: 'hs', NCAA: 'college', GL: 'gleague', EU: 'europe', INT: 'intl', NBA: 'nba' };

/** The loop for what is on screen. A page of its own (the log, the book, the community) keeps the
 * one under it; Lockdown has its own beat, so none. */
export function trackOf(s: { game: GameState | null; thanks: unknown; intro: boolean; mini: string | null; road?: Road; creating?: unknown; page?: string | null }): TrackId | null {
  const g = s.game;
  if (s.thanks && !g) return 'thanks';
  if (s.intro && !g) return 'intro';
  if (s.mini) return s.mini === 'rhythm' ? null : s.mini === 'hub' || s.mini === 'daily' ? 'hub' : s.mini in TRACKS ? (s.mini as TrackId) : 'hub';
  // round 33: the road map (in the tutorial, or opened from the start page: Regular guy's card)
  if (!g && !s.creating && (s.page === 'road' || (s.road && inTutorial(s.road) && nextLevel(s.road) !== 'beginner'))) return 'road';
  if (!g) return 'start';
  if (g.step === 'retired') return g.flags.level && g.flags.levelEnd !== 2 ? 'sad' : 'retired';
  if (g.step === 'offseason' || g.stage === 'FA') return 'offseason';
  return LEVEL_TRACK[g.stage] ?? 'start';
}
