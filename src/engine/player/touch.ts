// Free-throw touch (round 35, owner: "add free throw percentage to the game, with events and other
// stuff that helps it. this is mostly for the 50-40-90 achievement"). A 0-99 feel at the line that
// sits apart from the jump shot: the stat model adds (touch - TOUCH.mid) * STAT.ft.touch to his
// free-throw percentage on top of what his shooting rating gives (sim/statModel.ts). It starts from
// his shooting card, grows a little with every season of reps, and more with the shooting plan and
// summer, a shooting coach, the shop and the turning points that are about the line.

import { TOUCH } from '../balance';
import { clamp } from '../rng';
import type { UserPlayer } from '../types';

/** A steady -1..1 from his name and number: two shooters with the same card still differ a little. */
function knack(name: string, number: number): number {
  let h = 2166136261 ^ number;
  for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 2001) / 1000 - 1;
}

/** His touch at 14, from the shooting he started with (no random draw: the career's stream stays as it was). */
export function touchStart(p: Pick<UserPlayer, 'startAttrs' | 'name' | 'number'>): number {
  const t = TOUCH.start;
  return Math.round(clamp(t.base + (p.startAttrs.SHT - 40) * t.sht + knack(p.name, p.number) * t.jitter, t.min, t.max));
}

/** What one season of reps at the line adds at this age. */
export const seasonTouch = (age: number): number => (age <= TOUCH.season.youngTo ? TOUCH.season.young : age <= TOUCH.season.primeTo ? TOUCH.season.prime : TOUCH.season.late);

/** Free-throw touch, filled in for careers saved before round 35: his start plus the seasons of reps he has had. */
export function touchOf(p: UserPlayer): number {
  if (p.touch === undefined) {
    let t = touchStart(p);
    for (let age = 15; age <= p.age; age++) t += seasonTouch(age);
    p.touch = Math.round(clamp(t, 0, 99));
  }
  return p.touch;
}

/** Builds (or costs) touch. */
export function addTouch(p: UserPlayer, v: number): void {
  p.touch = clamp(touchOf(p) + v, 0, 99);
}
