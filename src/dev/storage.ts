// The dev deck keeps its own storage (round 25). Every key it reads or writes in localStorage carries
// a prefix of its own, so its setup (every achievement earned, sample careers in the log, no saved
// career) never lands in the player's game. main.tsx imports this first, before the store reads
// anything; outside dev mode it does nothing.

import { DEV } from './mode';

const PREFIX = 'btr-dev:';
const own = (k: string) => (k.startsWith(PREFIX) ? k : PREFIX + k);

if (DEV) {
  try {
    const { getItem, setItem, removeItem } = Storage.prototype;
    // only localStorage: the dev-mode mark itself lives in sessionStorage
    Storage.prototype.getItem = function (this: Storage, k: string) {
      return getItem.call(this, this === localStorage ? own(k) : k);
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
