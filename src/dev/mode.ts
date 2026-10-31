// Dev mode (round 25, owner: the dev deck lives in the game, behind a password, at the foot of the
// start page). Opening it marks this tab and reloads: while the mark is there the deck takes the
// page, and everything it keeps in the browser goes under a prefix of its own (storage.ts), so the
// player's careers, achievements and community posts are never touched. Leaving clears the mark.
// The password only keeps players from wandering in: like everything on the page, it can be read.

const FLAG = 'btr-dev-on';
// FNV-1a of the password, so the page does not spell it out
const KEY = 0x2b798e22;

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return h;
}

/** Whether this tab is in dev mode (read once, when the page loads). */
export const DEV = (() => {
  try {
    return sessionStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
})();

/** Opens the deck if the password is right; false if not. */
export function enterDev(password: string): boolean {
  if (hash(password.trim()) !== KEY) return false;
  try {
    sessionStorage.setItem(FLAG, '1');
  } catch {
    return false;
  }
  location.reload();
  return true;
}

export function leaveDev(): void {
  try {
    sessionStorage.removeItem(FLAG);
  } catch {
    // nothing kept: the reload below is back in the game anyway
  }
  location.reload();
}
