// Round 22: the body map. Two things are kept as the career goes:
// - what training built, muscle by muscle: every half, the ratings he gained are shared out over
//   the muscles that carry them (athleticism to the legs, shooting to the shoulders and arms...),
//   and the Weight room and Speed plans add their own work on top;
// - every injury he had, so the map can show where his body has been hurt.
// Height and weight are kept per season in the season record.

import type { AttrKey, Attrs, HalfPlan, Injury, UserPlayer } from '../types';

export type Muscle = 'shoulders' | 'chest' | 'arms' | 'forearms' | 'core' | 'back' | 'glutes' | 'quads' | 'hamstrings' | 'calves';

export const MUSCLES: { key: Muscle; name: string }[] = [
  { key: 'shoulders', name: 'Shoulders' },
  { key: 'chest', name: 'Chest' },
  { key: 'arms', name: 'Arms' },
  { key: 'forearms', name: 'Forearms and hands' },
  { key: 'core', name: 'Core' },
  { key: 'back', name: 'Back' },
  { key: 'glutes', name: 'Hips and glutes' },
  { key: 'quads', name: 'Quads' },
  { key: 'hamstrings', name: 'Hamstrings' },
  { key: 'calves', name: 'Calves' },
];

/** Where each rating's gains are built. Basketball IQ lives in the head and builds no muscle. */
const FROM_ATTR: Partial<Record<AttrKey, Partial<Record<Muscle, number>>>> = {
  ATH: { quads: 0.35, calves: 0.3, glutes: 0.2, hamstrings: 0.15 },
  FIN: { core: 0.3, shoulders: 0.3, arms: 0.2, quads: 0.2 },
  SHT: { shoulders: 0.4, arms: 0.3, forearms: 0.3 },
  PLY: { forearms: 0.6, core: 0.2, calves: 0.2 },
  PER: { quads: 0.3, glutes: 0.3, calves: 0.2, hamstrings: 0.2 },
  INT: { chest: 0.3, back: 0.3, shoulders: 0.2, core: 0.2 },
  REB: { back: 0.3, core: 0.3, glutes: 0.2, arms: 0.2 },
};

/** Extra work a half on these plans puts in, on top of the ratings it built. */
const FROM_PLAN: Partial<Record<HalfPlan, Partial<Record<Muscle, number>>>> = {
  strength: { chest: 0.6, back: 0.6, arms: 0.4, shoulders: 0.4, quads: 0.4 },
  speed: { calves: 0.5, hamstrings: 0.5, quads: 0.3 },
  defense: { glutes: 0.3, quads: 0.3 },
  grind: { core: 0.3, back: 0.2 },
};

/** Adds this half's work to his muscles: the ratings gained since `before`, and the plans. */
export function trainMuscles(p: UserPlayer, before: Attrs, plans: HalfPlan[]): void {
  const m = (p.muscles ??= {});
  const add = (k: Muscle, v: number) => (m[k] = Math.round(((m[k] ?? 0) + v) * 100) / 100);
  for (const [a, share] of Object.entries(FROM_ATTR) as [AttrKey, Partial<Record<Muscle, number>>][]) {
    const gain = p.attrs[a] - before[a];
    if (gain > 0) for (const [k, w] of Object.entries(share) as [Muscle, number][]) add(k, gain * w);
  }
  for (const plan of plans) for (const [k, w] of Object.entries(FROM_PLAN[plan] ?? {}) as [Muscle, number][]) add(k, w / plans.length);
}

export type BodyPart = 'head' | 'neck' | 'shoulder' | 'back' | 'hand' | 'groin' | 'hamstring' | 'knee' | 'calf' | 'ankle' | 'foot' | 'whole';

const PARTS: [RegExp, BodyPart][] = [
  [/achilles|calf/i, 'calf'],
  [/ankle/i, 'ankle'],
  [/acl|mcl|meniscus|knee/i, 'knee'],
  [/hamstring/i, 'hamstring'],
  [/groin|hip/i, 'groin'],
  [/back|spine/i, 'back'],
  [/hand|finger|wrist/i, 'hand'],
  [/shoulder/i, 'shoulder'],
  [/foot|stress fracture|toe/i, 'foot'],
  [/whiplash|neck/i, 'neck'],
  [/concussion|head|eye|nose/i, 'head'],
];

/** Where on the body an injury is, from its name (illnesses and the like count as the whole body). */
export const injuryPart = (name: string): BodyPart => PARTS.find(([re]) => re.test(name))?.[1] ?? 'whole';

/** Keeps an injury for the body map and the timeline. */
export function recordInjury(p: UserPlayer, inj: Injury, year?: number): void {
  (p.injuries ??= []).push({ age: p.age, year, name: inj.name, key: inj.key, days: inj.daysOut });
}
