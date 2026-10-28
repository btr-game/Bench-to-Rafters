// Built in a lab (playtest round 8): fast break, but the player builds the ratings himself.
// - Training: each half's growth is worked out as usual, except that it does not depend on
//   which ratings are already high (one headroom for the whole player, from his OVR against
//   his potential) and there are no focus stats. It is paid out as credits.
// - Events, storylines and items: every rating they would have raised is paid out as credits
//   instead. Their minuses still land where the event says.
// - Credits buy rating points: one credit a point below 80, more near the top (LAB.cost).
// Aging, injuries and setbacks still take ratings away as in every other mode.

import { ATTR_MAX, ATTRS, LAB } from '../balance';
import type { AttrKey, Attrs, GameState, UserPlayer } from '../types';
import { NAMES } from '../../content/strings';
import { ovrOf } from '../player/ovr';

export const isLab = (s: GameState): boolean => s.mode === 'lab';

export function labState(p: UserPlayer): NonNullable<UserPlayer['lab']> {
  p.lab ??= { credits: 0, earned: 0, spent: {} };
  return p.lab;
}

/** Credits for the next point of a rating at this value. */
export function labCost(v: number): number {
  let c = 1;
  for (const [from, cost] of LAB.cost) if (v >= from) c = cost;
  return c;
}

export function addCredits(p: UserPlayer, n: number): void {
  if (n <= 0) return;
  const l = labState(p);
  l.credits += n;
  l.earned += n;
}

/**
 * Pays out what an action raised: every rating above where it was before goes back down, and
 * the difference becomes credits. Returns the credits added.
 */
export function bankGains(s: GameState, before: Attrs): number {
  if (!isLab(s)) return 0;
  const p = s.player;
  let gained = 0;
  for (const k of ATTRS) {
    const d = p.attrs[k] - before[k];
    if (d > 1e-9) {
      gained += d;
      p.attrs[k] = before[k];
    }
  }
  if (gained <= 0) return 0;
  addCredits(p, gained);
  // the result card shows credits instead of the ratings they replaced
  if (s.result) {
    const up = new Set(ATTRS.filter((k) => p.attrs[k] === before[k]).map((k) => NAMES.attr[k]));
    s.result.changes = [{ label: 'Lab credits', value: `+${gained.toFixed(1)}`, good: true }, ...s.result.changes.filter((c) => !(up.has(c.label) && c.good))];
  }
  return gained;
}

/** Spends credits on one rating, a point at a time. Returns the points bought. */
export function spendCredits(s: GameState, k: AttrKey, points: number): number {
  if (!isLab(s) || s.step === 'retired' || !ATTRS.includes(k)) return 0;
  const p = s.player;
  const l = labState(p);
  let bought = 0;
  for (let i = 0; i < Math.max(0, Math.floor(points)); i++) {
    if (p.attrs[k] >= ATTR_MAX) break;
    const c = labCost(p.attrs[k]);
    if (l.credits + 1e-9 < c) break;
    l.credits -= c;
    p.attrs[k] = Math.min(ATTR_MAX, p.attrs[k] + 1);
    bought++;
  }
  if (bought > 0) {
    l.spent[k] = (l.spent[k] ?? 0) + bought;
    p.peakOvr = Math.max(p.peakOvr, ovrOf(p.attrs, p.pos));
    s.toast = `${NAMES.attr[k]} +${bought}.`;
  }
  return bought;
}
