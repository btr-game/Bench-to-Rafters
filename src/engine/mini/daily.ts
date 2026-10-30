// Round 22: the daily challenge. Every day has one prospect, the same for everyone: his name,
// position, archetype, focus and country come from the date. The career is played in Regular guy
// with fast break and simple text on, so a run takes a few minutes. The score is the legacy he
// leaves, with his peak OVR breaking ties; the best score of each day stays on this device.

import { ARCHETYPES } from '../player/archetypes';
import { POSITIONS } from '../balance';
import { makeRng, pick, int } from '../rng';
import type { AttrKey, GameState } from '../types';
import type { CreateInput } from '../player/create';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { legacyIndex } from '../awards/tiers';

/** Today's date as YYYY-MM-DD, in the player's own time zone. */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The seed for a date: the same for everyone on that day. */
export function dailySeed(day: string): number {
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const FOCUS: AttrKey[][] = [
  ['SHT', 'FIN'],
  ['PLY', 'IQ'],
  ['PER', 'ATH'],
  ['INT', 'REB'],
  ['SHT', 'PLY'],
  ['FIN', 'ATH'],
  ['REB', 'PER'],
];
const COUNTRIES = ['USA', 'USA', 'USA', 'Canada', 'France', 'Spain', 'Serbia', 'Nigeria', 'Australia', 'Japan', 'Argentina', 'Germany'];

/** Today's prospect. */
export function dailyInput(day: string): CreateInput {
  const r = makeRng(dailySeed(day));
  const pos = pick(r, [...POSITIONS]);
  return {
    name: `${pick(r, FIRST_NAMES)} ${pick(r, LAST_NAMES)}`,
    number: int(r, 0, 55),
    pos,
    archetype: int(r, 0, ARCHETYPES[pos].length - 1),
    focus: pick(r, FOCUS),
    country: pick(r, COUNTRIES),
    mode: 'standard',
    fast: true,
  };
}

/** What a finished run scores: legacy points, then the peak as the tie-breaker. */
export const dailyScore = (s: GameState): { legacy: number; peak: number; points: number } => {
  const legacy = legacyIndex(s);
  const peak = Math.round(s.player.peakOvr);
  return { legacy, peak, points: legacy * 100 + peak };
};
