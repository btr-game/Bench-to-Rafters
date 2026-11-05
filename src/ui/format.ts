import type { StatLine } from '../engine/types';
export { fmtMoney } from '../engine/economy/salary';
import { ordinal as englishOrdinal } from '../engine/career/common';
import { localOrdinal } from '../i18n';
import { te } from '../i18n/engine';

/** "5th", in the player's language (round 40): the slots of translated lines take it as it is. */
export const ordinal = (n: number): string => localOrdinal(n) ?? englishOrdinal(n);

export const ht = (inches: number): string => `${Math.floor(inches / 12)}′${Math.round(inches % 12)}″`;
export const seasonLabel = (y: number): string => `${y}–${String(y + 1).slice(2)}`;
export const pg = (l: StatLine, k: keyof StatLine): string => (l.gp > 0 ? (l[k] / l.gp).toFixed(1) : '—');
export const pct = (made: number, att: number): string => (att > 0 ? ((made / att) * 100).toFixed(1) : '—');
export const signed = (x: number, digits = 1): string => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(digits)}`;

/** Simple text (round 11): the first sentence of a longer text. */
export function brief(text: string, simple: boolean): string {
  if (!simple || !text) return text;
  // round 41: the whole line in the player's language first, then its first sentence (。！？ in Chinese and Japanese)
  const tr = te(text);
  const m = tr.match(/^.*?(?:[.!?](?:\s|$)|[。！？])/);
  return m ? m[0].trim() : tr;
}
