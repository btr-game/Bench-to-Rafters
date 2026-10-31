// Into the dev deck and back, in place (round 28, owner: "can you make the dev deck just another page
// in the game instead of having to open another tab in the browser? just like how the minigame page
// appears"). On the way in, the game's last move is saved where it belongs, its screen is set aside,
// and the storage prefix goes on (storage.ts). On the way out, anything the deck left waiting is
// dropped, the prefix goes off and the game's screen comes back as it was. The theme and the court
// stay as they are both ways: the deck and the game share them.

import { settle, startView, useStore, viewNow, type View } from '../store';
import { devPassword, isDev, setDev } from './mode';
import { refreshSound } from '../ui/sound';
import { joinCourt } from '../ui/community';
import { devSetup } from './DevDeck';

let aside: View | null = null;

/** Opens the deck if the password is right; false if not. */
export function enterDev(password: string): boolean {
  if (!devPassword(password)) return false;
  if (isDev()) return true;
  settle(true);
  aside = viewNow();
  setDev(true);
  refreshSound();
  devSetup();
  window.scrollTo(0, 0);
  return true;
}

/** Back to the game, as it was when the deck opened (the start page if the page opened in the deck). */
export function leaveDev(): void {
  if (!isDev()) return;
  settle(false);
  setDev(false);
  refreshSound();
  useStore.setState(aside ?? startView());
  // the career coming back was saved on the way in: nothing to write again
  settle(false);
  aside = null;
  joinCourt();
  window.scrollTo(0, 0);
}
