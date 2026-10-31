// The dev deck keeps its own storage (round 25). Every key it reads or writes in localStorage carries
// a prefix of its own, so its setup (every achievement earned, sample careers in the log, no saved
// career) never lands in the player's game. main.tsx imports this first, before the store reads
// anything; outside dev mode it does nothing.

import { DEV } from './mode';

const PREFIX = 'btr-dev:';
const own = (k: string) => (k.startsWith(PREFIX) ? k : PREFIX + k);
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

if (DEV && realGet) {
  try {
    const { setItem, removeItem } = Storage.prototype;
    // only localStorage: the dev-mode mark itself lives in sessionStorage
    Storage.prototype.getItem = function (this: Storage, k: string) {
      return realGet.call(this, this === localStorage ? own(k) : k);
    };
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      setItem.call(this, this === localStorage ? own(k) : k, v);
    };
    Storage.prototype.removeItem = function (this: Storage, k: string) {
      removeItem.call(this, this === localStorage ? own(k) : k);
    };
  } catch {
    // no storage at all: nothing to keep apart
  }
}
