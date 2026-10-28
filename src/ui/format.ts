import type { StatLine } from '../engine/types';
export { fmtMoney } from '../engine/economy/salary';
export { ordinal } from '../engine/career/season';

export const ht = (inches: number): string => `${Math.floor(inches / 12)}′${Math.round(inches % 12)}″`;
export const seasonLabel = (y: number): string => `${y}–${String(y + 1).slice(2)}`;
export const pg = (l: StatLine, k: keyof StatLine): string => (l.gp > 0 ? (l[k] / l.gp).toFixed(1) : '—');
export const pct = (made: number, att: number): string => (att > 0 ? ((made / att) * 100).toFixed(1) : '—');
export const signed = (x: number, digits = 1): string => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(digits)}`;
