// Dev mode (round 25, owner: the dev deck lives in the game, behind a password, at the foot of the
// start page). A tab marked for dev mode shows the deck, and everything it keeps in the browser goes
// under a prefix of its own (storage.ts), so the player's careers, achievements and community posts
// are never touched. The mark is read once, when the page loads, so the deck needs a fresh page:
// on the website it opens in a tab of its own (owner: "when i enter the dev deck, the tab reloads
// ... this still kind of bothers me"), and the game's tab stays exactly as it was; Back to the game
// closes that tab. Inside the claude.ai page (a frame, which cannot rely on opening tabs) the game's
// own tab reloads into the deck, as before.
// The password only keeps players from wandering in: like everything on the page, it can be read.

const FLAG = 'btr-dev-on';
// localStorage: when the game last opened the deck in a new tab (the tab's mark may not come along)
const HANDOFF = 'btr-dev-handoff';
const framed = (): boolean => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
};
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
    const sent = Number(localStorage.getItem(HANDOFF) ?? 0);
    if (sent) localStorage.removeItem(HANDOFF);
    if (sessionStorage.getItem(FLAG) === '1') return true;
    // a tab the game has just opened for the deck
    if (window.opener && Date.now() - sent < 15000) {
      sessionStorage.setItem(FLAG, '1');
      return true;
    }
  } catch {
    // no storage: the game, never the deck
  }
  return false;
})();

/** Opens the deck if the password is right; false if not. */
export function enterDev(password: string): boolean {
  if (hash(password.trim()) !== KEY) return false;
  try {
    sessionStorage.setItem(FLAG, '1');
  } catch {
    return false;
  }
  if (!framed()) {
    try {
      // the new tab starts with a copy of this tab's mark, and the handoff in case it does not
      localStorage.setItem(HANDOFF, String(Date.now()));
      const tab = window.open(location.href, '_blank');
      sessionStorage.removeItem(FLAG);
      if (tab) return true;
      localStorage.removeItem(HANDOFF);
      sessionStorage.setItem(FLAG, '1');
    } catch {
      // no new tab: this one becomes the deck
    }
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
  // a deck the game opened in its own tab closes, back to the game's tab as it was
  if (window.opener) {
    window.close();
    setTimeout(() => {
      if (!window.closed) location.reload();
    }, 300);
    return;
  }
  location.reload();
}
