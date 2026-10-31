import { useEffect } from 'react';
import { useStore } from '../../store';

// The theme and the court on the page (round 27, owner: "the dev deck is also always in dark
// theme. let me be able to change that and the court"): kept here, at the root, for the game and
// the dev deck alike (it used to live in App, which the deck's own pages never mount).

// the host page's own theme, if it set one, is what "Auto" goes back to
const HOST_THEME = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;

export function Look() {
  const theme = useStore((s) => s.theme);
  const court = useStore((s) => s.court);
  useEffect(() => {
    const root = document.documentElement;
    // "Auto" goes back to whatever the host page set (or the OS setting if nothing)
    if (theme === 'auto') {
      if (HOST_THEME) root.setAttribute('data-theme', HOST_THEME);
      else root.removeAttribute('data-theme');
    } else root.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => {
    if (court === 'classic') document.documentElement.removeAttribute('data-court');
    else document.documentElement.setAttribute('data-court', court);
  }, [court]);
  return null;
}
