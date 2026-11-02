// Sound (round 25, the owner: chiptune sound effects and music). Everything is made in the
// browser with the Web Audio API: square and triangle waves and a little noise, no files. The
// audio starts on the first click (browsers keep pages quiet until then); the settings menu has a
// switch for the effects and one for the music, kept on this device.

import { isDev } from '../dev/mode';
import { TRACKS, parseVoice, type NoteEvent, type Track, type TrackId, type Wave } from './tracks';

/** Every sound effect and when the game plays it (round 26: the dev deck's sound board lists them). */
export const SFX = [
  ['click', 'Any button'],
  ['confirm', 'A good release on the timing meter; a counter in contract talks; a word with your staff'],
  ['lose', 'A title run that ends short, a lost final'],
  ['title', 'A championship'],
  ['award', 'An award, draft night'],
  ['achievement', 'An achievement banner'],
  ['injury', 'An injury'],
  ['fine', 'A fine'],
  ['coins', 'A purchase; a raise for your staff'],
  ['nickname', 'A nickname, with its logo'],
  // round 25 end of round: press answers, contract talks, staff, visits, brands, the timing meter
  ['shutter', 'A press conference'],
  ['deal', 'Contract talks: they agree'],
  ['nope', 'A late release; they pull the offer; letting staff go'],
  ['chime', 'A talk with a staff member'],
  ['visit', 'A visit to something you own'],
  ['brand', 'A brand deal'],
  ['perfect', 'A perfect release on the timing meter'],
  // round 27: Rough Road and feedback
  ['oath', 'Taking the Rough Road challenge'],
  ['sent', 'Feedback sent (or kept)'],
  // round 27 (owner: "can you add more sound to the game?")
  ['tab', 'Switching tabs'],
  ['page', 'Opening a page: the community, the career log, the achievement book, the mini-games'],
  ['good', 'An event that went better than hoped'],
  ['bad', 'An event that backfired or went half wrong'],
  ['whistle', 'Tip-off: a half of the season starts'],
  ['season', 'A new season'],
  ['trade', 'A new team: a trade, a signing, a move'],
  ['rise', 'Your OVR goes up'],
  ['retire', 'The career ends'],
  ['swish', '3-on-3: a basket'],
  ['rim', '3-on-3: a miss off the rim'],
  ['block', '3-on-3: a block or a steal'],
  ['reveal', 'Reality 99 hall: a player steps into the light'],
  ['respect', 'Paying respects at a statue'],
  // round 28 (owner: "add sound for minigames (3 point contest specifically)")
  ['net', '3-point contest: a swish, all net'],
  ['rimin', '3-point contest: in off the rim'],
  ['brick', '3-point contest: off the mark'],
  ['money', '3-point contest: a money ball drops'],
  ['fire', '3-point contest: on fire'],
  ['tick', '3-point contest: the last five seconds'],
  ['buzzer', 'The buzzer: a contest round ends'],
  ['slam', 'Dunk contest: a dunk landed'],
  ['judges', 'Dunk contest: the judges hold up their cards'],
  ['clutch', 'The finals: your play in the last minutes'],
  // round 29: the career log's locks
  ['lock', 'Locking a card in the career log'],
  ['unlock', 'Unlocking a card in the career log'],
  // round 30
  ['comet', 'Riding the comet: the Comet challenge taken'],
  // round 31
  ['undo', 'Undo: a choice taken back'],
  ['knock', 'Knocking on the coach’s door: asking for a bigger role'],
  ['family', 'The next generation: your son’s career begins'],
  // round 33: the tutorial
  ['drive', 'The road map: your car drives to the next stop'],
  ['sail', 'The road map: the boat to the island of mini-games'],
  ['lesson', 'The tutorial: a lesson done'],
  ['graduate', 'Graduation: the tutorial is done and the full game opens'],
  ['boom', 'The announcer: the arena under his call (a deep thump, its echo, the crowd)'],
  // round 35: play with friends, and the road map's unlocks
  ['versus', 'Play with friends: a challenge set, or taken up'],
  ['roll', 'Play with friends: a seat taken in a draft class'],
  ['opened', 'The road map: a stop cleared opens a difficulty or the mini-games'],
  // round 35, the draft class: reunion night's awards, and a reaction on a friend's season
  ['toast', 'Reunion night: an award read out (glasses clink, a cheer)'],
  ['react', 'Play with friends: a reaction on a classmate’s season'],
] as const;
type Sfx = (typeof SFX)[number][0];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
// round 31 (owner: "volume sliders"): a level each for the effects and the music, 0 to 1, kept on this device
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
const readVol = (key: string): number => {
  try {
    const v = Number(localStorage.getItem(key));
    return localStorage.getItem(key) === null || !Number.isFinite(v) ? 1 : Math.max(0, Math.min(1, v));
  } catch {
    return 1;
  }
};
let sfxVol = readVol('btr-sfx-vol');
let musicVol = readVol('btr-music-vol');
let sfxOn = read('btr-sfx', true);
// the music is on to start (owner: "the background music should be playing from the very start of
// the game"); a player who turned it off keeps it off. The dev deck starts quiet.
let musicOn = read('btr-music', !isDev());
let musicTimer: ReturnType<typeof setInterval> | null = null;

function read(key: string, dflt: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? dflt : v === '1';
  } catch {
    return dflt;
  }
}
function write(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    /* the switch still works for this visit */
  }
}

/** The audio, made on the first gesture. */
function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxVol;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicVol;
    musicBus.connect(master);
  } catch {
    ctx = null;
  }
  return ctx;
}

// round 29: the thin pulse waves of old consoles (a quarter and an eighth of the cycle up), for the music
const pulses = new Map<number, PeriodicWave>();
function pulse(duty: number): PeriodicWave {
  const hit = pulses.get(duty);
  if (hit) return hit;
  const n = 32;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    re[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
    im[k] = (2 * Math.sin(Math.PI * k * duty) ** 2) / (Math.PI * k);
  }
  const w = ctx!.createPeriodicWave(re, im);
  pulses.set(duty, w);
  return w;
}

function tone(freq: number, at: number, len: number, type: OscillatorType | Wave = 'square', vol = 1, out: AudioNode = sfxBus!): void {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  if (type === 'pulse25' || type === 'pulse12') o.setPeriodicWave(pulse(type === 'pulse25' ? 0.25 : 0.125));
  else o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + len);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + len + 0.02);
}

function noise(at: number, len: number, vol = 0.5, out: AudioNode = sfxBus!): void {
  const c = ctx!;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + len);
  s.connect(g).connect(out);
  s.start(at);
}

const N = (semi: number) => 440 * Math.pow(2, (semi - 9) / 12); // semitones from C4

/** A short sound for something that just happened (`always`: the sound board, whatever the switch says). */
export function sfx(name: Sfx, always = false): void {
  if ((!sfxOn && !always) || !audio()) return;
  if (ctx!.state === 'suspended') void ctx!.resume();
  const t = ctx!.currentTime + 0.01;
  const seq = (notes: number[], step: number, type: OscillatorType = 'square', vol = 0.8) => notes.forEach((n, i) => tone(N(n), t + i * step, step * 1.6, type, vol));
  switch (name) {
    case 'click':
      tone(N(24), t, 0.03, 'square', 0.25);
      break;
    case 'confirm':
      seq([12, 19], 0.06, 'square', 0.5);
      break;
    case 'lose':
      seq([7, 4, 0], 0.12, 'triangle');
      break;
    case 'title':
      seq([12, 16, 19, 24, 19, 24, 28, 31], 0.1);
      noise(t + 0.8, 0.4, 0.3);
      break;
    case 'award':
      seq([19, 24, 28], 0.08, 'square', 0.6);
      break;
    case 'achievement':
      seq([24, 28, 31, 36], 0.05, 'square', 0.4);
      break;
    case 'injury':
      tone(N(-12), t, 0.4, 'triangle', 1);
      noise(t, 0.15, 0.6);
      break;
    case 'fine':
      seq([16, 12, 7], 0.08, 'square', 0.5);
      break;
    case 'coins':
      seq([28, 33], 0.05, 'square', 0.4);
      break;
    case 'nickname':
      seq([12, 19, 24, 28, 31], 0.07, 'triangle', 0.9);
      break;
    case 'shutter': // cameras at a press conference
      noise(t, 0.04, 0.5);
      tone(N(36), t, 0.02, 'square', 0.3);
      noise(t + 0.09, 0.03, 0.35);
      break;
    case 'deal':
      seq([12, 16, 19, 24, 28], 0.06, 'square', 0.55);
      break;
    case 'nope':
      seq([7, 1], 0.1, 'triangle', 0.8);
      break;
    case 'chime':
      seq([24, 31], 0.08, 'triangle', 0.6);
      break;
    case 'knock':
      seq([0, 0], 0.07, 'square', 0.45);
      break;
    case 'family':
      seq([12, 16, 19, 24, 19, 24, 28], 0.11, 'triangle', 0.6);
      break;
    case 'visit':
      seq([19, 23, 26, 31], 0.09, 'triangle', 0.7);
      break;
    case 'brand':
      seq([12, 19, 24, 28, 31, 36], 0.07, 'square', 0.55);
      break;
    case 'perfect':
      seq([24, 28, 31, 36, 40], 0.04, 'square', 0.45);
      break;
    case 'oath': // low and resolute: a vow, then the anvil
      seq([0, 7, 12], 0.16, 'triangle', 1);
      tone(N(-12), t + 0.5, 0.5, 'square', 0.4);
      noise(t + 0.5, 0.08, 0.5);
      break;
    case 'sent': // a paper plane: up and away
      seq([19, 24, 31], 0.05, 'triangle', 0.6);
      break;
    // ---- round 27 ----
    case 'tab': // a light page turn
      tone(N(19), t, 0.04, 'triangle', 0.35);
      tone(N(26), t + 0.035, 0.05, 'triangle', 0.25);
      break;
    case 'page': // a door: a low knock, a lift
      tone(N(7), t, 0.06, 'triangle', 0.6);
      seq([14, 21], 0.05, 'triangle', 0.4);
      break;
    case 'good':
      seq([16, 19, 23, 28], 0.06, 'square', 0.45);
      break;
    case 'bad':
      seq([10, 6, 3], 0.1, 'triangle', 0.85);
      break;
    case 'whistle': { // two short referee blasts, a little warble in each
      const c = ctx!;
      for (const at of [t, t + 0.2]) {
        const o = c.createOscillator();
        const lfo = c.createOscillator();
        const depth = c.createGain();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(2700, at);
        lfo.frequency.setValueAtTime(38, at);
        depth.gain.setValueAtTime(120, at);
        lfo.connect(depth).connect(o.frequency);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.35, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, at + 0.14);
        o.connect(g).connect(sfxBus!);
        o.start(at);
        lfo.start(at);
        o.stop(at + 0.16);
        lfo.stop(at + 0.16);
      }
      break;
    }
    case 'season': // a short fanfare for the new year
      seq([12, 12, 19, 24], 0.09, 'square', 0.5);
      tone(N(0), t, 0.4, 'triangle', 0.6);
      break;
    case 'trade': // a swoosh to somewhere new
      noise(t, 0.18, 0.25);
      seq([7, 14, 19], 0.05, 'triangle', 0.5);
      break;
    case 'rise':
      seq([19, 26], 0.05, 'square', 0.35);
      break;
    case 'retire': // slow and warm: the jersey goes up
      seq([12, 16, 19, 24], 0.22, 'triangle', 0.9);
      tone(N(0), t, 1.1, 'triangle', 0.5);
      break;
    case 'swish':
      noise(t, 0.12, 0.35);
      tone(N(31), t + 0.02, 0.05, 'triangle', 0.25);
      break;
    case 'rim': // the clang
      tone(N(14), t, 0.18, 'square', 0.45);
      tone(N(15), t, 0.18, 'square', 0.3);
      break;
    case 'block': // the slap
      noise(t, 0.05, 0.7);
      tone(N(-5), t, 0.08, 'square', 0.5);
      break;
    case 'reveal': // a sparkle as the light comes on
      seq([24, 31, 36, 40, 43], 0.04, 'triangle', 0.55);
      break;
    case 'respect': // a small bell
      tone(N(31), t, 0.5, 'triangle', 0.6);
      tone(N(38), t + 0.01, 0.4, 'triangle', 0.25);
      break;
    case 'net': // the net snaps
      noise(t, 0.2, 0.4);
      tone(N(36), t + 0.03, 0.08, 'triangle', 0.3);
      tone(N(43), t + 0.08, 0.1, 'triangle', 0.22);
      break;
    case 'rimin': // a tap on the iron, then the net
      tone(N(14), t, 0.08, 'square', 0.3);
      noise(t + 0.09, 0.14, 0.3);
      break;
    case 'brick': // a dull clank and a thud
      tone(N(2), t, 0.16, 'square', 0.45);
      tone(N(3), t, 0.16, 'square', 0.3);
      noise(t + 0.12, 0.08, 0.35);
      break;
    case 'money': // coins on the swish
      noise(t, 0.16, 0.35);
      seq([24, 28, 31, 36], 0.045, 'triangle', 0.5);
      break;
    case 'fire': // a rising whoosh
      seq([12, 16, 19, 24, 28, 31], 0.035, 'square', 0.35);
      noise(t, 0.3, 0.2);
      break;
    case 'tick':
      tone(N(36), t, 0.025, 'square', 0.3);
      break;
    case 'buzzer': // the horn
      tone(N(-10), t, 0.7, 'square', 0.55);
      tone(N(-9), t, 0.7, 'square', 0.35);
      break;
    case 'slam': // the rim shakes
      noise(t, 0.12, 0.8);
      tone(N(-12), t, 0.22, 'square', 0.6);
      tone(N(14), t + 0.05, 0.25, 'square', 0.2);
      break;
    case 'judges': // the cards go up, one, two, three, four, five
      seq([19, 19, 19, 19, 24], 0.08, 'square', 0.3);
      break;
    case 'clutch': // the ball in his hands, the crowd on its feet
      seq([7, 12, 16], 0.05, 'square', 0.4);
      noise(t + 0.1, 0.25, 0.18);
      break;
    case 'lock': // a padlock: the shackle clicks down, a low thunk
      noise(t, 0.03, 0.35);
      tone(N(2), t + 0.03, 0.08, 'square', 0.5);
      tone(N(-5), t + 0.09, 0.1, 'triangle', 0.6);
      break;
    case 'undo': // a tape rewinding: a quick fall, then a click
      seq([24, 19, 15, 12, 7], 0.03, 'triangle', 0.5);
      noise(t + 0.17, 0.03, 0.25);
      break;
    case 'comet': // a streak across the sky: a rising run, then a sparkle
      seq([12, 16, 19, 24, 28, 31, 36], 0.035, 'square', 0.45);
      noise(t + 0.2, 0.35, 0.12);
      tone(N(43), t + 0.3, 0.25, 'triangle', 0.35);
      break;
    case 'unlock': // the shackle springs up
      noise(t, 0.03, 0.3);
      seq([7, 14], 0.05, 'triangle', 0.5);
      break;
    case 'drive': // a little engine puttering off, then a beep of the horn
      for (let i = 0; i < 6; i++) tone(N(-5 + (i % 2) * 2), t + i * 0.07, 0.05, 'square', 0.25);
      seq([19, 19], 0.08, 'square', 0.3);
      break;
    case 'sail': // a ship's horn, low and long, and the water
      tone(N(-5), t, 0.5, 'triangle', 0.6);
      tone(N(-1), t + 0.55, 0.6, 'triangle', 0.5);
      noise(t + 0.2, 0.5, 0.12);
      break;
    case 'lesson': // a pencil tick on the list
      tone(N(31), t, 0.03, 'triangle', 0.35);
      tone(N(36), t + 0.04, 0.04, 'triangle', 0.3);
      break;
    case 'versus': // two calls across the court, then both together: game on
      seq([7, 12], 0.07, 'square', 0.45);
      tone(N(14), t + 0.18, 0.08, 'square', 0.4);
      tone(N(19), t + 0.26, 0.08, 'square', 0.4);
      tone(N(12), t + 0.38, 0.22, 'square', 0.4);
      tone(N(24), t + 0.38, 0.22, 'square', 0.35);
      noise(t + 0.38, 0.08, 0.2);
      break;
    case 'toast': // reunion night: two glasses clink, then the room cheers the name
      tone(N(43), t, 0.05, 'sine', 0.35);
      tone(N(47), t + 0.06, 0.07, 'sine', 0.3);
      seq([19, 24], 0.09, 'square', 0.35);
      noise(t + 0.22, 0.25, 0.18);
      break;
    case 'react': // a pop and a bright note: one reaction on a friend's season
      noise(t, 0.02, 0.2);
      tone(N(31), t + 0.02, 0.06, 'triangle', 0.4);
      tone(N(36), t + 0.08, 0.06, 'triangle', 0.3);
      break;
    case 'roll': // roll call: the class bell, three names read out
      seq([12, 16, 19], 0.1, 'triangle', 0.6);
      tone(N(31), t + 0.32, 0.35, 'sine', 0.25);
      break;
    case 'opened': // the padlock clicks open, then a short fanfare
      noise(t, 0.03, 0.35);
      tone(N(5), t + 0.04, 0.04, 'square', 0.3);
      seq([12, 19, 24], 0.08, 'square', 0.55);
      tone(N(28), t + 0.3, 0.3, 'triangle', 0.5);
      break;
    case 'graduate': // caps in the air: a rising fanfare, the crowd
      seq([12, 16, 19, 24, 28, 31, 36], 0.09);
      tone(N(0), t, 0.7, 'triangle', 0.6);
      noise(t + 0.6, 0.5, 0.3);
      break;
    case 'boom': {
      // round 34 (owner: "a much more booming one"): the arena under the announcer, a sub-bass thump
      // falling away, its echo off the far wall, and the crowd swelling under a low filter
      const c = ctx!;
      for (const [at, vol] of [[0, 1], [0.32, 0.38]] as const) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(92, t + at);
        o.frequency.exponentialRampToValueAtTime(38, t + at + 0.7);
        g.gain.setValueAtTime(vol * 1.4, t + at);
        g.gain.exponentialRampToValueAtTime(0.001, t + at + 0.85);
        o.connect(g).connect(sfxBus!);
        o.start(t + at);
        o.stop(t + at + 0.9);
      }
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      const crowd = c.createGain();
      crowd.gain.setValueAtTime(0.001, t);
      crowd.gain.exponentialRampToValueAtTime(0.5, t + 0.35);
      crowd.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      lp.connect(crowd).connect(sfxBus!);
      noise(t, 1.6, 1, lp);
      break;
    }
  }
}

// ---------- music (round 29: a loop for each part of the game, tracks.ts), from the first click or key ----------

interface Compiled {
  step: number;
  length: number;
  voices: { at: (NoteEvent | null)[]; wave: Wave; vol: number; every?: 2 }[];
  drums: string;
}

const compiled = new Map<TrackId, Compiled>();
function compile(id: TrackId): Compiled {
  const hit = compiled.get(id);
  if (hit) return hit;
  const tr: Track = TRACKS[id];
  const voices = tr.voices.map((v) => ({ at: parseVoice(v.notes), wave: v.wave, vol: v.vol, every: v.every }));
  const c = { step: tr.step, length: Math.max(...voices.map((v) => v.at.length), tr.drums?.length ?? 0), voices, drums: tr.drums ?? '' };
  compiled.set(id, c);
  return c;
}

/** A kick: a short sine sweep down. */
function kick(at: number, out: AudioNode): void {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, at);
  o.frequency.exponentialRampToValueAtTime(45, at + 0.12);
  g.gain.setValueAtTime(0.7, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.14);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + 0.16);
}

function playStep(c: Compiled, i: number, t: number): void {
  const slot = i % c.length;
  const pass = Math.floor(i / c.length);
  for (const v of c.voices) {
    if (v.every === 2 && pass % 2 === 0) continue;
    const e = v.at[i % v.at.length];
    if (!e) continue;
    const vol = v.vol / Math.sqrt(e.semis.length);
    for (const n of e.semis) tone(N(n), t, c.step * e.len * 0.92, v.wave, vol, musicBus!);
  }
  const d = c.drums[slot % (c.drums.length || 1)];
  if (d === 'k' || d === 'K') kick(t, musicBus!);
  if (d === 's' || d === 'S') {
    noise(t, 0.1, 0.2, musicBus!);
    tone(185, t, 0.05, 'triangle', 0.25, musicBus!);
  }
  if (d === 'h' || d === 'K' || d === 'S') noise(t, 0.025, 0.07, musicBus!);
}

// the loop the screen asks for, and the one playing
let wanted: TrackId | null = null;
let playing: TrackId | null = null;
// round 29: told when a loop is first heard (for the Mixtape and Full Album achievements)
let heardHook: ((id: TrackId) => void) | null = null;
export function onHeard(fn: (id: TrackId) => void): void {
  heardHook = fn;
}

function startMusic(id: TrackId): void {
  if (playing === id && musicTimer) return;
  stopMusic();
  if (!audio()) return;
  if (ctx!.state === 'suspended') void ctx!.resume();
  const c = compile(id);
  let i = 0;
  let next = ctx!.currentTime + 0.05;
  playing = id;
  // a little ahead of the clock, so the beat stays even when the page is busy
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    if (next < ctx.currentTime - 0.05) next = ctx.currentTime + 0.02;
    while (next < ctx.currentTime + 0.12) {
      if (i === 0) heardHook?.(id);
      playStep(c, i, next);
      i++;
      next += c.step;
    }
  }, 25);
}

function stopMusic(): void {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  playing = null;
}

/** The loop for what is on screen (null: none, as in Lockdown, which has its own beat). */
export function music(track: TrackId | null): void {
  wanted = track;
  if (track && musicOn) startMusic(track);
  else stopMusic();
}

/** The dev deck's Music tab: a loop on or off, whatever the switch says. */
export function previewMusic(track: TrackId | null): void {
  if (track) startMusic(track);
  else stopMusic();
}

/** Whether music can be heard right now (the intro's button asks before the first click). */
export const musicAudible = (): boolean => musicOn && !!musicTimer && ctx?.state === 'running';

export const soundSettings = () => ({ sfx: sfxOn, music: musicOn, sfxVol, musicVol });

/** Round 31: a channel's level, 0 to 1 (the settings' sliders); it applies at once. */
export function setVolume(kind: 'sfx' | 'music', v: number): void {
  const level = Math.max(0, Math.min(1, v));
  if (kind === 'sfx') sfxVol = level;
  else musicVol = level;
  const bus = kind === 'sfx' ? sfxBus : musicBus;
  if (bus && ctx) bus.gain.setTargetAtTime(level, ctx.currentTime, 0.02);
  try {
    localStorage.setItem(kind === 'sfx' ? 'btr-sfx-vol' : 'btr-music-vol', String(level));
  } catch {
    /* the level still applies for this visit */
  }
}

/** The music's level, for Lockdown's beat, which plays on an audio of its own. */
export const musicVolume = (): number => musicVol;
/** Reads the switches again as the dev deck opens or closes (each keeps its own); the loop stops
 * if they say so (the game's screen starts it again when it comes back). */
export function refreshSound(): void {
  sfxOn = read('btr-sfx', true);
  musicOn = read('btr-music', !isDev());
  if (!musicOn) stopMusic();
}
export function setSfx(on: boolean): void {
  sfxOn = on;
  write('btr-sfx', on);
}
export function setMusic(on: boolean): void {
  musicOn = on;
  write('btr-music', on);
  music(wanted);
}

/** The first click or key wakes the audio up, so the music starts with it (browsers keep sound
 * off until then); every button gets a soft click. */
export function wakeOnClick(): () => void {
  const wake = () => {
    if (audio() && ctx!.state === 'suspended') void ctx!.resume();
  };
  const onClick = (e: MouseEvent) => {
    wake();
    if ((e.target as HTMLElement).closest('button')) sfx('click');
  };
  window.addEventListener('click', onClick, true);
  window.addEventListener('keydown', wake, true);
  window.addEventListener('pointerdown', wake, true);
  return () => {
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('keydown', wake, true);
    window.removeEventListener('pointerdown', wake, true);
  };
}
