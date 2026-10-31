// Dev mode (round 25, owner: the dev deck lives in the game, behind a password, at the foot of the
// start page). While it is on, the page shows the deck, and everything the deck keeps in the browser
// goes under a prefix of its own (storage.ts), so the player's careers, achievements and community
// posts are never touched. Round 28 (owner: "can you make the dev deck just another page in the game
// instead of having to open another tab in the browser? just like how the minigame page appears"):
// it is a switch the page flips in place, no new tab and no reload. On the way in the game's screen
// is set aside; Back to the game puts it back exactly as it was (devSwitch.ts). The tab's mark keeps
// a reload in the deck, and lets the visual check open the page straight into it.
// The password only keeps players from wandering in: like everything on the page, it can be read.

const FLAG = 'btr-dev-on';
// FNV-1a of the password, so the page does not spell it out
const KEY = 0x2b798e22;

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return h;
}

let on = (() => {
  try {
    return sessionStorage.getItem(FLAG) === '1';
  } catch {
    // no storage: the game, never the deck
    return false;
  }
})();
const listeners = new Set<(on: boolean) => void>();

/** Whether the deck is on right now. */
export const isDev = (): boolean => on;

/** Called with the new state whenever the deck opens or closes; returns the unsubscribe. */
export function onDev(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Flips the deck on or off (devSwitch.ts sets the game aside first and puts it back after). */
export function setDev(next: boolean): void {
  if (next === on) return;
  try {
    if (next) sessionStorage.setItem(FLAG, '1');
    else sessionStorage.removeItem(FLAG);
  } catch {
    // the mark only matters for a reload
  }
  on = next;
  for (const fn of [...listeners]) fn(on);
}

/** Whether the password is the deck's. */
export const devPassword = (password: string): boolean => hash(password.trim()) === KEY;
