import { BASE_INJURY, HEIGHT_LIMITS, WEAR, HALF_PLANS, type PlanDef, INJURY_AGE_MULT, INJURY_SEVERITY, INJURY_TOLL } from '../balance';
import { ovrOf } from './ovr';
import { chance, int, pick, shuffle, weightedIndex, type Rng } from '../rng';
import type { HalfPlan, Injury, UserPlayer } from '../types';

const NAMES: Record<Injury['key'], string[]> = {
  dtd: ['Sore ankle', 'Bruised knee', 'Back spasms', 'Jammed finger', 'Illness'],
  minor: ['Sprained ankle', 'Hamstring strain', 'Groin strain', 'Sprained wrist', 'Calf strain'],
  major: ['High ankle sprain', 'Broken hand', 'Knee sprain (MCL)', 'Stress fracture', 'Torn meniscus'],
  season: ['Torn ACL', 'Ruptured Achilles'],
};
/** Every injury the game can hand out, by severity (the dev deck's catalog lists them). */
export const INJURY_NAMES = NAMES;

export function injuryChance(p: UserPlayer, plan: HalfPlan | PlanDef, minutes: number): number {
  const fatigue = 0.5 + minutes / 60;
  // very tall bodies break down more often
  const tall = Math.max(0, p.fullHeight - HEIGHT_LIMITS.bandHi) * HEIGHT_LIMITS.tallInjury;
  return (1 + tall) * BASE_INJURY * p.durability * (typeof plan === 'string' ? HALF_PLANS[plan] : plan).injury * fatigue * INJURY_AGE_MULT(p.age) * p.injuryMultNext;
}

/** Rolls for an injury after a game. Mutates the player and returns the injury if one happened. */
export function rollInjury(rng: Rng, p: UserPlayer, plan: HalfPlan | PlanDef, minutes: number): Injury | null {
  if (minutes <= 0 || !chance(rng, injuryChance(p, plan, minutes))) return null;
  const sev = INJURY_SEVERITY[weightedIndex(rng, INJURY_SEVERITY.map((s) => s.share))];
  const inj: Injury = { key: sev.key, name: pick(rng, NAMES[sev.key]), daysOut: int(rng, sev.days[0], sev.days[1]) };
  const before = ovrOf(p.attrs, p.pos);
  const hit = (k: keyof typeof p.attrs, [a, b]: [number, number]) => (p.attrs[k] = Math.max(15, p.attrs[k] - int(rng, a, b)));
  if (sev.key === 'minor') {
    hit('ATH', INJURY_TOLL.minor.ath);
    p.morale = Math.max(0, p.morale - 2);
  }
  if (sev.key === 'major') {
    const t = INJURY_TOLL.major;
    hit('ATH', t.ath);
    hit(pick(rng, ['FIN', 'PER', 'REB', 'SHT'] as const), t.other);
    p.morale = Math.max(0, p.morale - 8);
    if (chance(rng, t.capChance)) p.caps.ATH = Math.max(30, p.caps.ATH - int(rng, t.cap[0], t.cap[1]));
  }
  if (sev.key === 'season') {
    const t = INJURY_TOLL.season;
    hit('ATH', t.ath);
    for (const k of shuffle(rng, ['FIN', 'PER', 'REB', 'INT', 'SHT'] as const).slice(0, t.others)) hit(k, t.other);
    p.durability = Math.round((p.durability + 0.1) * 100) / 100; // higher multiplier = more fragile
    p.morale = Math.max(0, p.morale - 15);
    // most of the time the injury also lowers his ceiling
    if (chance(rng, t.capChance)) for (const k of ['ATH', 'FIN', 'PER'] as const) p.caps[k] = Math.max(30, p.caps[k] - int(rng, t.cap[0], t.cap[1]));
  }
  inj.ovrLoss = Math.max(0, before - ovrOf(p.attrs, p.pos));
  p.wear = Math.min(100, (p.wear ?? 0) + (WEAR.injury[sev.key] ?? 0));
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
