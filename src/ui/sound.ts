// Sound (round 25, the owner: chiptune sound effects and music). Everything is made in the
// browser with the Web Audio API: square and triangle waves and a little noise, no files. The
// audio starts on the first click (browsers keep pages quiet until then); the settings menu has a
// switch for the effects and one for the music, kept on this device.

import { DEV } from '../dev/mode';

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
  // round 27: No Shortcuts and feedback
  ['oath', 'Taking the No Shortcuts challenge'],
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
] as const;
type Sfx = (typeof SFX)[number][0];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxOn = read('btr-sfx', true);
// the music is on to start (owner: "the background music should be playing from the very start of
// the game"); a player who turned it off keeps it off. The dev deck starts quiet.
let musicOn = read('btr-music', !DEV);
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
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(freq: number, at: number, len: number, type: OscillatorType = 'square', vol = 1): void {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + len);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + len + 0.02);
}

function noise(at: number, len: number, vol = 0.5): void {
  const c = ctx!;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + len);
  s.connect(g).connect(master!);
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
        o.connect(g).connect(master!);
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
  }
}

// ---------- music: a soft four-bar loop everywhere but the mini-games, from the first click or key ----------

const BASS = [0, 0, 7, 7, 5, 5, 7, 7, 0, 0, 7, 7, 5, 5, 3, 7];
const LEAD = [12, -1, 16, -1, 19, -1, 16, 14, 12, -1, 16, -1, 17, 16, 14, -1];

function startMusic(force = false): void {
  if (musicTimer || (!musicOn && !force) || !audio()) return;
  if (ctx!.state === 'suspended') void ctx!.resume();
  let i = 0;
  const step = 0.22;
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.02;
    tone(N(BASS[i % 16] - 12), t, step * 0.9, 'triangle', 0.35);
    if (LEAD[i % 16] >= 0 && Math.floor(i / 16) % 2 === 1) tone(N(LEAD[i % 16]), t, step * 0.7, 'square', 0.12);
    if (i % 4 === 0) noise(t, 0.04, 0.12);
    i++;
  }, step * 1000);
}

function stopMusic(): void {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

/** Music on or off with what is on screen (a mini-game has its own sound). */
export function music(playing: boolean): void {
  if (playing && musicOn) startMusic();
  else stopMusic();
}

/** The sound board's music button: the loop on or off, whatever the switch says. */
export function previewMusic(on: boolean): void {
  if (on) startMusic(true);
  else stopMusic();
}

export const soundSettings = () => ({ sfx: sfxOn, music: musicOn });
export function setSfx(on: boolean): void {
  sfxOn = on;
  write('btr-sfx', on);
}
export function setMusic(on: boolean, playing: boolean): void {
  musicOn = on;
  write('btr-music', on);
  music(playing);
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
