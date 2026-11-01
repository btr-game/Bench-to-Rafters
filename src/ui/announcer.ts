// The announcer (round 32, owner: "it would be cool if there's a person with a booming voice
// shouting breakthrough, block, 3 point, buzzer beater, ... in the game"). The browser's own speech
// (speechSynthesis), pitched low and slowed down, with the deepest English voice on the device. It
// follows the sound effects: off with them, at their volume. A switch in Settings turns it off.
// Round 34 (owner: "i dont really like the announcer voice. can you find a much more booming one?"):
// the natural (neural) male voices first, lower and slower still, a held breath before the big word,
// and the arena under every call (sound.ts 'boom').

import { sfx, soundSettings } from './sound';
import { recordCall } from './achievements';

const KEY = 'btr-announcer';
let on = (() => {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
})();

export const announcerOn = (): boolean => on;

export function setAnnouncer(v: boolean): void {
  on = v;
  try {
    localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    // storage blocked: the switch lasts for the visit
  }
}

/** The deepest-sounding English voices, best first: the natural (neural) male voices of Edge and
 * Windows, Google's UK male voice, then the deep classic voices of macOS, Windows and Linux. */
const DEEP = [
  /\b(guy|davis|christopher|eric|roger|steffan|andrew|brian|ryan|thomas|william|liam)\b.*(natural|online)/i,
  /google uk english male/i,
  /\b(daniel|arthur|aaron|oliver|reed|ralph|rishi|gordon)\b/i,
  /microsoft (david|mark|george|james|richard|sean)/i,
  /\bmale\b|\bman\b/i,
  /\b(alex|tom|fred)\b/i,
];
const HIGH = /female|woman|zira|samantha|karen|moira|tessa|victoria|susan|hazel|fiona|aria|jenny|libby|sonia|emma|ava|michelle|serena|kate|catherine/i;
function voice(): SpeechSynthesisVoice | null {
  const all = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  for (const re of DEEP) {
    const v = all.find((x) => re.test(x.name) && !HIGH.test(x.name));
    if (v) return v;
  }
  return all.find((x) => !HIGH.test(x.name)) ?? all[0] ?? null;
}

/** How he says a call: a held breath before the big word, the way an arena announcer leans on it. */
const SAY: Record<string, string> = {
  'From downtown!': 'From... downtown!',
  'Slam dunk!': 'Slam... dunk!',
  'Buzzer beater!': 'Buzzer... beater!',
  'What a stop!': 'What a... stop!',
};

/** Every line he shouts, and when (round 33: the dev deck's sound board plays them). */
export const CALLS: [string, string][] = [
  ['Stolen!', 'A steal on the court (3-on-3, crunch time)'],
  ['Rejected!', 'A block'],
  ['What a stop!', 'A stop on defense in crunch time'],
  ['Slam dunk!', 'A dunk'],
  ['And one!', 'A basket and the foul'],
  ['From downtown!', 'A three'],
  ['Buzzer beater!', 'A make in the last three seconds'],
  ['Alley-oop!', 'An alley-oop in 3-on-3'],
  ['Posterized!', 'A poster dunk in 3-on-3'],
  ['Champions!', 'The page of a title'],
  ['Breakthrough!', 'The page of a breakthrough season'],
  ['Let’s go!', 'Turning him on in Settings'],
];

/** Shouts `words`, cutting off whatever he was still saying. `preview` (the dev deck) plays him
 * even with the game's sound off, and leaves the device's count of his calls alone. */
export function announce(words: string, preview = false): void {
  if ((!on && !preview) || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
  const s = soundSettings();
  if (!preview && (!s.sfx || s.sfxVol <= 0)) return;
  try {
    const u = new SpeechSynthesisUtterance(SAY[words] ?? words);
    const v = voice();
    if (v) u.voice = v;
    // a natural voice keeps its own depth (pushed far down it turns to gravel); the rest go to the floor
    const natural = !!v && /natural|online|google/i.test(v.name);
    u.pitch = natural ? 0.55 : 0.1;
    u.rate = natural ? 0.8 : 0.78;
    sfx('boom', preview);
    u.volume = preview ? 1 : Math.min(1, s.sfxVol + 0.15);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    if (!preview) recordCall();
  } catch {
    // no speech on this device: the game goes on without the voice
  }
}

/** What he shouts for a call on the court (3v3's and crunch time's pixel words). */
export function callFor(word: string, good: boolean, text = ''): string | null {
  if (!good) return null;
  if (/^0:0[0-3]\b/.test(text) && /MAKE|DUNK|AND ONE/.test(word)) return 'Buzzer beater!';
  if (word === 'STEAL') return 'Stolen!';
  if (word === 'BLOCK') return 'Rejected!';
  if (word === 'STOP') return 'What a stop!';
  if (word === 'DUNK') return 'Slam dunk!';
  if (word === 'AND ONE') return 'And one!';
  if (word === 'MAKE' && /three|deep/i.test(text)) return 'From downtown!';
  return null;
}
