// Rare players who break the mold (playtest round 7): a center who passes like a point guard,
// a guard who rebounds like a big. About one career in twenty starts with one of these gifts.
// The gift comes with a higher ceiling in that skill, so it lasts.

import { ANOMALY, CAP_MAX } from '../balance';
import { chance, clamp, pick, type Rng } from '../rng';
import type { AttrKey, Pos, UserPlayer } from '../types';

export interface Anomaly {
  name: string;
  text: string;
  pos: Pos[];
  boost: Partial<Record<AttrKey, number>>;
  range?: number;
}

export const ANOMALIES: Anomaly[] = [
  { name: 'Point center', text: 'A big man who sees passes nobody else his size sees', pos: ['C', 'PF'], boost: { PLY: 16, IQ: 6 } },
  { name: 'Rebounding guard', text: 'A guard who attacks the glass like a power forward', pos: ['PG', 'SG'], boost: { REB: 18, ATH: 4 } },
  { name: 'Shot-blocking guard', text: 'A guard with the timing to block shots at the rim', pos: ['PG', 'SG', 'SF'], boost: { INT: 16, ATH: 3 } },
  { name: 'Point forward', text: 'A forward who runs the offense like a point guard', pos: ['PF', 'SF'], boost: { PLY: 14, IQ: 5 } },
  { name: 'Shooting big', text: 'A seven-footer with a guard\'s jump shot', pos: ['C'], boost: { SHT: 16 }, range: 25 },
  { name: 'Switchable big', text: 'A big who can stay in front of guards on the perimeter', pos: ['C', 'PF'], boost: { PER: 16, ATH: 4 } },
  { name: 'Post-up guard', text: 'A guard who backs smaller defenders down like a big', pos: ['PG', 'SG'], boost: { FIN: 12, REB: 6 } },
];

/** Rolls a rare gift at creation. Changes the player in place and returns it, if any. */
export function rollAnomaly(rng: Rng, p: UserPlayer, force = false): Anomaly | null {
  if (!force && !chance(rng, ANOMALY.chance)) return null;
  const list = ANOMALIES.filter((a) => a.pos.includes(p.pos));
  if (list.length === 0) return null;
  const a = pick(rng, list);
  for (const [k, v] of Object.entries(a.boost) as [AttrKey, number][]) {
    p.attrs[k] = clamp(p.attrs[k] + v, 5, 99);
    p.startAttrs[k] = p.attrs[k];
    p.caps[k] = Math.min(CAP_MAX, Math.max(p.caps[k], p.potential) + v * ANOMALY.capShare);
  }
  if (a.range) p.range = Math.min(99, p.range + a.range);
  p.anomaly = a.name;
  return a;
}
