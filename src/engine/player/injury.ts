import { BASE_INJURY, HALF_PLANS, INJURY_AGE_MULT, INJURY_SEVERITY } from '../balance';
import { chance, int, pick, weightedIndex, type Rng } from '../rng';
import type { HalfPlan, Injury, UserPlayer } from '../types';

const NAMES: Record<Injury['key'], string[]> = {
  dtd: ['Sore ankle', 'Bruised knee', 'Back spasms', 'Jammed finger', 'Illness'],
  minor: ['Sprained ankle', 'Hamstring strain', 'Groin strain', 'Sprained wrist', 'Calf strain'],
  major: ['High ankle sprain', 'Broken hand', 'Knee sprain (MCL)', 'Stress fracture', 'Torn meniscus'],
  season: ['Torn ACL', 'Ruptured Achilles'],
};

export function injuryChance(p: UserPlayer, plan: HalfPlan, minutes: number): number {
  const fatigue = 0.5 + minutes / 60;
  return BASE_INJURY * p.durability * HALF_PLANS[plan].injury * fatigue * INJURY_AGE_MULT(p.age) * p.injuryMultNext;
}

/** Rolls for an injury after a game. Mutates the player and returns the injury if one happened. */
export function rollInjury(rng: Rng, p: UserPlayer, plan: HalfPlan, minutes: number): Injury | null {
  if (minutes <= 0 || !chance(rng, injuryChance(p, plan, minutes))) return null;
  const sev = INJURY_SEVERITY[weightedIndex(rng, INJURY_SEVERITY.map((s) => s.share))];
  const inj: Injury = { key: sev.key, name: pick(rng, NAMES[sev.key]), daysOut: int(rng, sev.days[0], sev.days[1]) };
  if (sev.key === 'major') {
    p.attrs.ATH = Math.max(15, p.attrs.ATH - 1);
    const k = pick(rng, ['FIN', 'PER', 'REB'] as const);
    p.attrs[k] = Math.max(15, p.attrs[k] - 1);
    p.morale = Math.max(0, p.morale - 6);
  }
  if (sev.key === 'season') {
    p.attrs.ATH = Math.max(15, p.attrs.ATH - int(rng, 4, 8));
    p.durability = Math.round((p.durability + 0.1) * 100) / 100; // higher multiplier = more fragile
    p.morale = Math.max(0, p.morale - 15);
    // half the time the injury also lowers his ceiling
    if (chance(rng, 0.5)) for (const k of ['ATH', 'FIN', 'PER'] as const) p.caps[k] = Math.max(30, p.caps[k] - 2);
  }
  p.injury = inj;
  return inj;
}

export function healDays(p: UserPlayer, days: number): void {
  if (!p.injury) return;
  p.injury.daysOut -= days;
  if (p.injury.daysOut <= 0) p.injury = null;
}

export function healthLabel(p: UserPlayer): string {
  if (!p.injury) return 'Healthy';
  if (p.injury.key === 'season') return `Season-ending (${p.injury.name})`;
  if (p.injury.key === 'dtd') return `Day-to-day (${p.injury.name})`;
  const weeks = Math.max(1, Math.round(p.injury.daysOut / 7));
  return `Out ${weeks} week${weeks === 1 ? '' : 's'} (${p.injury.name})`;
}
