// The three-point contest (round 10): five racks of five balls, 60 seconds. Each rack's last
// ball is a money ball (2 points), and one rack of the shooter's choice is all money balls,
// so a perfect round is 34. Eight shooters, the top three go to the final.
// The player shoots for real (ui/mini/Threes.tsx: stop the meter in the green); the others
// are simulated from their skill. The green zone grows with skill, and narrows a little as
// the round goes on (tired arms).

import { chance, makeRng, normal, type Rng } from '../rng';

export const THREES = { racks: 5, balls: 5, seconds: 60, money: 2, zoneBase: 0.07, zoneSkill: 0.0011, tire: 0.12, sweepMs: 1050, rimMargin: 0.45 };

export interface Shooter {
  name: string;
  skill: number; // 0-100
  team: string;
  me?: boolean;
}

export interface RoundScore {
  name: string;
  score: number;
  me?: boolean;
}

/** Points for ball b (0-4) of rack r (0-4), with the money rack. */
export const ballValue = (r: number, b: number, moneyRack: number): number => (r === moneyRack || b === THREES.balls - 1 ? THREES.money : 1);

/** How wide the green zone is (share of the meter) for this shooter on this ball. */
export function zoneWidth(skill: number, ballIndex: number): number {
  const fatigue = 1 - THREES.tire * (ballIndex / (THREES.racks * THREES.balls));
  return (THREES.zoneBase + skill * THREES.zoneSkill) * fatigue;
}

/** Make chance for a simulated shooter: the best real ones make about three in four. */
export const simChance = (skill: number): number => Math.min(0.8, 0.26 + skill * 0.0046);

/** A simulated round: the score, rack by rack. */
export function simRound(r: Rng, skill: number): number {
  const moneyRack = Math.floor(r.s % THREES.racks);
  let score = 0;
  let i = 0;
  for (let rk = 0; rk < THREES.racks; rk++)
    for (let b = 0; b < THREES.balls; b++) {
      // the clock: a slow round runs out before the last rack
      if (i >= 24 && chance(r, 0.15)) continue;
      const p = simChance(skill) * (1 - 0.08 * (i / 25)) + normal(r, 0, 0.03);
      if (chance(r, p)) score += ballValue(rk, b, moneyRack);
      i++;
    }
  return score;
}

/** Where a stop of the meter lands: a make, a rim-out (maybe in), or a miss. */
export function shotResult(r: Rng, pos: number, zone: number): 'swish' | 'make' | 'rim' | 'miss' {
  const d = Math.abs(pos - 0.5);
  if (d <= zone * 0.18) return 'swish';
  if (d <= zone / 2) return 'make';
  if (d <= zone / 2 + THREES.rimMargin * zone) return chance(r, 0.35) ? 'make' : 'rim';
  return 'miss';
}

export function contestRng(seed: number): Rng {
  return makeRng(seed);
}
