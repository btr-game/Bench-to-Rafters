// The dev deck keeps its own storage (round 25). While the deck is on, every key it reads or writes
// in localStorage carries a prefix of its own, so its setup (every achievement earned, sample careers
// in the log, no saved career) never lands in the player's game. main.tsx imports this first, before
// the store reads anything. Round 28: the deck is a page the game flips to in place, so the prefix
// follows the switch; the theme and the court are the game's own in both (owner: "theme and court of
// dev deck should always be the same with the main game"). Round 40: the language too (the deck's
// own words stay English; the game's screens it deals come in the player's language).

import { isDev } from './mode';

const PREFIX = 'btr-dev:';
/** Keys the deck shares with the game, never prefixed. */
const SHARED = new Set(['btr-theme', 'btr-court', 'btr-text', 'btr-sfx-vol', 'btr-music-vol', 'btr-announcer', 'btr-lang']);
const own = (k: string) => (!isDev() || SHARED.has(k) || k.startsWith(PREFIX) ? k : PREFIX + k);
const realGet = typeof Storage === 'undefined' ? null : Storage.prototype.getItem;
const realSet = typeof Storage === 'undefined' ? null : Storage.prototype.setItem;

/** Reads the game's own key, past the prefix (the deck's inbox reads the notes kept on this device). */
export function readReal(key: string): string | null {
  try {
    return realGet ? realGet.call(localStorage, key) : null;
  } catch {
    return null;
  }
}

/** Writes the game's own key, past the prefix: only for the deck's Reset achievements (round 27). */
export function writeReal(key: string, value: string): boolean {
  try {
    if (!realSet) return false;
    realSet.call(localStorage, key, value);
    return true;
  } catch {
    return false;
  }
}

if (realGet && realSet) {
  try {
    const { removeItem } = Storage.prototype;
    // only localStorage: the dev-mode mark itself lives in sessionStorage
    Storage.prototype.getItem = function (this: Storage, k: string) {
      return realGet.call(this, this === localStorage ? own(k) : k);
    };
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      realSet.call(this, this === localStorage ? own(k) : k, v);
    };
    Storage.prototype.removeItem = function (this: Storage, k: string) {
      removeItem.call(this, this === localStorage ? own(k) : k);
    };
  } catch {
    // no storage at all: nothing to keep apart
  }
}
