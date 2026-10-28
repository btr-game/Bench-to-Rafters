// Changing focus stats (playtest round 7): a breakthrough season earns the right to pick two
// new focus stats that offseason (career/breakthrough.ts), on top of the coach's occasional
// suggestion (the "Change your focus" event). Focus stats grow about twice as fast, so moving
// the focus around over a career is how a player fills out every rating.

import { ATTRS } from '../balance';
import type { AttrKey, GameState } from '../types';
import { adjust, logDecision } from './common';
import { NAMES } from '../../content/strings';

export function canChangeFocus(s: GameState): boolean {
  // built in a lab has no focus stats: the player picks every rating himself
  return s.mode !== 'lab' && s.step === 'offseason' && s.stage !== 'RETIRED' && s.flags.focusYear !== s.year && s.breakthrough?.year === s.year;
}

export function changeFocus(s: GameState, keys: AttrKey[]): void {
  if (!canChangeFocus(s)) return;
  const pick = [...new Set(keys)].filter((k) => ATTRS.includes(k)).slice(0, 2);
  if (pick.length !== 2) return;
  const p = s.player;
  if (pick.every((k) => p.focus.includes(k))) return;
  p.focus = pick;
  p.focusChanges++;
  s.flags.focusYear = s.year;
  // a new emphasis takes a little getting used to
  p.trust = adjust(p.trust, -2);
  logDecision(s, 'focus', `New focus: ${pick.map((k) => NAMES.attr[k]).join(' and ')}.`);
  s.toast = `New focus for next season: ${pick.map((k) => NAMES.attr[k]).join(' and ')}.`;
}
