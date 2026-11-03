// Names (round 36). Owner: "ask the user for a username(changable) after the tutorial. this is for
// the community function (so that users can know who's player it is without having constraints on
// the player name)" and "filter out curse words or non english characters in the player name".
// A player's name keeps to English letters; a username may add digits; neither may hold a swear
// word or a slur. The username is kept on this device, under the key Play with friends already
// used for its name, so a name picked for friends carries over.

import { BLOCKED } from '../content/blocked';
import type { CareerRecord } from '../engine/career/record';

export const NAME_MAX = 28;
export const USERNAME_MAX = 20;

/** Accents to plain letters (José, Kovač: Jose, Kovac). */
const plain = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const squeeze = (s: string): string => s.replace(/\s{2,}/g, ' ').replace(/^\s+/, '');

/** A player's name as typed: English letters, spaces, hyphens, apostrophes and full stops. */
export const cleanName = (s: string): string => squeeze(plain(s).replace(/[^A-Za-z .'-]/g, '')).slice(0, NAME_MAX);

/** A username, or a draft class's name, as typed: English letters, digits, spaces, _ . - */
export const cleanUsername = (s: string, max = USERNAME_MAX): string => squeeze(plain(s).replace(/[^A-Za-z0-9 _.-]/g, '')).slice(0, max);

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' };

/** Whether a name holds a swear word or a slur: spelled with numbers for letters (sh1t), or
 * spaced out letter by letter (f u c k), too. */
export function isRude(s: string): boolean {
  const t = plain(s).toLowerCase().replace(/[0134578@$!|]/g, (c) => LEET[c] ?? c);
  const words = t.split(/[^a-z]+/).filter(Boolean);
  // single letters in a row read as one word (f u c k)
  const runs: string[] = [];
  let run = '';
  for (const w of words) {
    if (w.length === 1) run += w;
    else (run.length > 1 && runs.push(run), (run = ''));
  }
  if (run.length > 1) runs.push(run);
  const all = [...words, ...runs];
  return all.some((w) => BLOCKED.word.includes(w) || BLOCKED.stem.some((x) => w.startsWith(x)) || BLOCKED.anywhere.some((x) => w.includes(x)));
}

/** What is wrong with a name, or '' when it may stand. */
export function nameProblem(s: string): string {
  if (!s.trim()) return 'Pick a name first.';
  return isRude(s) ? 'That name isn’t allowed. Pick another one.' : '';
}

// ---------- the username ----------

const KEY = 'btr-mp-name';

/** The username on this device ('' until one is picked). */
export function username(): string {
  try {
    const v = localStorage.getItem(KEY) ?? '';
    return isRude(v) ? '' : v;
  } catch {
    return '';
  }
}

export function setUsername(name: string): void {
  try {
    localStorage.setItem(KEY, cleanUsername(name).trim());
  } catch {
    // storage blocked: asked again next visit
  }
}

/** A username to show from someone else's card: hidden when it breaks the rules (the boards take
 * what a copy of the game sends, so the check is made again here). */
export const shownBy = (by: string | undefined): string => (by && !isRude(by) ? cleanUsername(by) : '');

/** A career card with this device's username on it, for the community boards. */
export const signed = (r: CareerRecord): CareerRecord => (username() ? { ...r, by: username() } : r);
