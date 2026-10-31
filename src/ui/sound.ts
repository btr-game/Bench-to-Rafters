// Sound (round 25, the owner: chiptune sound effects and music). Everything is made in the
// browser with the Web Audio API: square and triangle waves and a little noise, no files. The
// audio starts on the first click (browsers keep pages quiet until then); the settings menu has a
// switch for the effects and one for the music, kept on this device.

type Sfx =
  | 'click' | 'confirm' | 'win' | 'lose' | 'title' | 'award' | 'achievement' | 'injury' | 'fine' | 'coins' | 'nickname'
  // round 25 end of round: press answers, contract talks, staff, visits, brands, the timing meter
  | 'shutter' | 'deal' | 'nope' | 'chime' | 'visit' | 'brand' | 'perfect';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxOn = read('btr-sfx', true);
let musicOn = read('btr-music', false);
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

/** A short sound for something that just happened. */
export function sfx(name: Sfx): void {
  if (!sfxOn || !audio()) return;
  const t = ctx!.currentTime + 0.01;
  const seq = (notes: number[], step: number, type: OscillatorType = 'square', vol = 0.8) => notes.forEach((n, i) => tone(N(n), t + i * step, step * 1.6, type, vol));
  switch (name) {
    case 'click':
      tone(N(24), t, 0.03, 'square', 0.25);
      break;
    case 'confirm':
      seq([12, 19], 0.06, 'square', 0.5);
      break;
    case 'win':
      seq([12, 16, 19, 24], 0.07);
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
  }
}

// ---------- music: a soft four-bar loop while a career is on screen ----------

const BASS = [0, 0, 7, 7, 5, 5, 7, 7, 0, 0, 7, 7, 5, 5, 3, 7];
const LEAD = [12, -1, 16, -1, 19, -1, 16, 14, 12, -1, 16, -1, 17, 16, 14, -1];

function startMusic(): void {
  if (musicTimer || !musicOn || !audio()) return;
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

/** The first click wakes the audio up (and every button gets a soft click). */
export function wakeOnClick(): () => void {
  const onClick = (e: MouseEvent) => {
    if (audio() && ctx!.state === 'suspended') void ctx!.resume();
    if ((e.target as HTMLElement).closest('button')) sfx('click');
  };
  window.addEventListener('click', onClick, true);
  return () => window.removeEventListener('click', onClick, true);
}
