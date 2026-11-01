// The announcer (round 32, owner: "it would be cool if there's a person with a booming voice
// shouting breakthrough, block, 3 point, buzzer beater, ... in the game"). The browser's own speech
// (speechSynthesis), pitched low and slowed down, with the deepest English voice on the device. It
// follows the sound effects: off with them, at their volume. A switch in Settings turns it off.

import { soundSettings } from './sound';
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

/** The deepest-sounding English voice the device has (a few known names first). */
function voice(): SpeechSynthesisVoice | null {
  const all = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  return all.find((v) => /daniel|david|fred|alex|male|guy|arthur|aaron|james/i.test(v.name)) ?? all[0] ?? null;
}

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
    const u = new SpeechSynthesisUtterance(words);
    const v = voice();
    if (v) u.voice = v;
    u.pitch = 0.35;
    u.rate = 0.88;
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
