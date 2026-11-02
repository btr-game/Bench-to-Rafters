// How an event turns out (playtest round 7: "the results are still the same"). Every time a
// choice is made its result is rolled on five tiers, from a breakthrough to a backfire, and
// often comes with a twist nobody planned for: a trick picked up along the way, a tweaked
// hamstring, a clip that goes around online. The same choice can play out very differently.

import { ATTR_MAX, ATTRS } from '../balance';
import { chance, clamp, pick, range, weightedIndex, type Rng } from '../rng';
import type { AttrKey, GameState } from '../types';
import { adjust } from '../career/common';
import { NAMES } from '../../content/strings';
import { addTouch } from '../player/touch';

export type Tier = 'breakthrough' | 'better' | 'expected' | 'mixed' | 'backfired';

interface TierDef {
  odds: number;
  good: [number, number]; // factor on what the choice made better
  bad: [number, number]; // factor on what it made worse
  goodTwist: number; // chance of a lucky twist
  badTwist: number; // chance of an unlucky twist
  lines: string[];
  label: string;
}

export const TIERS: Record<Tier, TierDef> = {
  breakthrough: { odds: 0.1, good: [1.7, 2.3], bad: [0, 0.3], goodTwist: 1, badTwist: 0, label: 'Breakthrough', lines: ['Better than anyone hoped.', 'Something clicked, and it clicked hard.', 'It went about as well as it possibly could.', 'People will remember this one.'] },
  better: { odds: 0.22, good: [1.15, 1.55], bad: [0.5, 0.9], goodTwist: 0.6, badTwist: 0, label: 'Better than expected', lines: ['It went better than expected.', 'A good result, with a little extra.', 'Things broke your way.', ''] },
  expected: { odds: 0.42, good: [0.8, 1.2], bad: [0.8, 1.2], goodTwist: 0.12, badTwist: 0.12, label: 'As expected', lines: ['', '', 'About what you expected.', 'No surprises.'] },
  mixed: { odds: 0.17, good: [0.35, 0.75], bad: [1.1, 1.5], goodTwist: 0, badTwist: 0.65, label: 'Mixed', lines: ['It only half worked.', 'Not quite what you hoped for.', 'Harder going than it should have been.', 'Some good, some bad.'] },
  backfired: { odds: 0.09, good: [0, 0.25], bad: [1.4, 2], goodTwist: 0, badTwist: 1, label: 'Backfired', lines: ['It backfired.', 'Nothing went right.', 'In hindsight, a mistake.', 'It went sideways fast.'] },
};

const ORDER: Tier[] = ['breakthrough', 'better', 'expected', 'mixed', 'backfired'];

/** A choice that already went wrong (a failed gamble) cannot turn into a breakthrough. */
const AFTER_FAIL: Partial<Record<Tier, number>> = { expected: 0.6, mixed: 0.28, backfired: 0.12 };

export function rollTier(rng: Rng, failed = false): Tier {
  return ORDER[weightedIndex(rng, ORDER.map((t) => (failed ? (AFTER_FAIL[t] ?? 0) : TIERS[t].odds)))];
}

export function tierFactors(rng: Rng, t: Tier): { good: number; bad: number } {
  const d = TIERS[t];
  return { good: range(rng, d.good[0], d.good[1]), bad: range(rng, d.bad[0], d.bad[1]) };
}

interface Twist {
  text: (s: GameState, k: AttrKey) => string;
  apply: (s: GameState, rng: Rng, k: AttrKey) => void;
  when?: (s: GameState) => boolean;
}

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const attrName = (k: AttrKey) => NAMES.attr[k].toLowerCase();
const pro = (s: GameState) => s.stage !== 'HS';

const GOOD: Twist[] = [
  { text: (_, k) => `A teammate showed you a trick along the way, and your ${attrName(k)} got better for it.`, apply: (s, r, k) => bump(s, k, range(r, 1.5, 3)) },
  { text: () => 'Your coach noticed the work.', apply: (s, r) => (s.player.trust = adjust(s.player.trust, Math.round(range(r, 4, 8)))) },
  { text: () => 'A clip of it went around online.', apply: (s, r) => { s.player.rep = clamp(s.player.rep + range(r, 2, 5), 0, 100); s.player.morale = adjust(s.player.morale, 3); } },
  { text: () => 'You came out of it hungrier than ever.', apply: (s, r) => { s.player.morale = adjust(s.player.morale, Math.round(range(r, 5, 10))); s.player.growthMultNext *= 1.06; } },
  { text: () => 'Your body responded better than expected.', apply: (s, r) => { bump(s, 'ATH', range(r, 1, 2.5)); s.player.injuryMultNext *= 0.94; } },
  { text: () => 'Somehow your weak hand came along too.', apply: (s, r) => (s.player.offhand = Math.min(99, s.player.offhand + range(r, 3, 6))) },
  { text: () => 'You started seeing the floor differently.', apply: (s, r) => bump(s, 'IQ', range(r, 1.5, 3)) },
  { text: () => 'You found a couple of extra feet of range.', apply: (s, r) => (s.player.range = Math.min(99, s.player.range + range(r, 3, 5))) },
  // round 35: free-throw touch
  { text: () => 'Your free throws started dropping too.', apply: (s, r) => addTouch(s.player, range(r, 2, 4)) },
  { text: () => 'A local business wants you in its next ad.', when: pro, apply: (s, r) => (s.player.bank += s.stage === 'NBA' ? range(r, 0.1, 0.4) : range(r, 0.01, 0.05)) },
  { text: () => 'It took less out of your body than you feared.', when: (s) => (s.player.wear ?? 0) > 6, apply: (s, r) => (s.player.wear = Math.max(0, (s.player.wear ?? 0) - range(r, 2, 4))) },
  { text: (_, k) => `Your ${attrName(k)} jumped in a way nobody can quite explain.`, apply: (s, r, k) => bump(s, k, range(r, 2.5, 4.5)) },
];

const BAD: Twist[] = [
  { text: () => 'You tweaked a hamstring doing it, and your legs still feel heavy.', apply: (s, r) => { s.player.injuryMultNext *= 1.12; bump(s, 'ATH', -range(r, 0.5, 1.5)); } },
  { text: () => 'You burned out a little.', apply: (s, r) => (s.player.morale = adjust(s.player.morale, -Math.round(range(r, 5, 10)))) },
  { text: () => 'The coach thought you were freelancing.', apply: (s, r) => (s.player.trust = adjust(s.player.trust, -Math.round(range(r, 4, 8)))) },
  { text: () => 'Some bad press came with it.', apply: (s, r) => (s.player.rep = clamp(s.player.rep - range(r, 1.5, 4), 0, 100)) },
  { text: () => 'You overdid it, and your body is paying for it.', apply: (s, r) => { s.player.wear = Math.min(100, (s.player.wear ?? 0) + range(r, 3, 6)); s.player.injuryMultNext *= 1.06; } },
  { text: () => 'A bad habit crept into your shot.', apply: (s, r) => bump(s, 'SHT', -range(r, 1, 2.5)) },
  { text: (_, k) => `Your ${attrName(k)} slipped while your attention was elsewhere.`, apply: (s, r, k) => bump(s, k, -range(r, 1, 2)) },
  { text: () => 'It cost more than you planned.', when: (s) => s.player.bank > 0.02, apply: (s, r) => (s.player.bank = Math.max(0, s.player.bank - Math.min(s.player.bank * 0.15, range(r, 0.01, s.stage === 'NBA' ? 0.3 : 0.03)))) },
  { text: () => 'It ate into your recovery time.', apply: (s) => (s.player.growthMultNext *= 0.95) },
];

function applyTwist(s: GameState, pool: Twist[]): string {
  const list = pool.filter((t) => !t.when || t.when(s));
  const t = pick(s.rng, list);
  const k = pick(s.rng, ATTRS);
  t.apply(s, s.rng, k);
  return t.text(s, k);
}

/** Lucky and unlucky twists for this tier. Returns their text. */
export function twists(s: GameState, t: Tier): string[] {
  const d = TIERS[t];
  const out: string[] = [];
  if (chance(s.rng, d.goodTwist)) out.push(applyTwist(s, GOOD));
  if (t === 'breakthrough' && chance(s.rng, 0.35)) out.push(applyTwist(s, GOOD));
  if (chance(s.rng, d.badTwist)) out.push(applyTwist(s, BAD));
  return out;
}

export function tierLine(rng: Rng, t: Tier): string {
  return pick(rng, TIERS[t].lines);
}
