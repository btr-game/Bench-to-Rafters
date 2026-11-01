// Two careers side by side (round 31, owner: "comparing two careers looks good"): the career log's
// Compare. Each row says which side is better, if either, so the page can mark it in words as well
// as colour.

import type { CareerRecord } from '../engine/career/record';
import { MODES } from '../engine/balance';

interface CompareRow {
  label: string;
  a: string;
  b: string;
  better: 'a' | 'b' | null;
}

/** `more`: a bigger number is better; `less`: a smaller one; `none`: neither is (a fact, not a score). */
type Way = 'more' | 'less' | 'none';

export function compareRows(a: CareerRecord, b: CareerRecord): CompareRow[] {
  const row = (label: string, x: number, y: number, show: (v: number) => string, way: Way = 'more'): CompareRow => ({
    label,
    a: show(x),
    b: show(y),
    better: way === 'none' || x === y ? null : (way === 'more' ? x > y : x < y) ? 'a' : 'b',
  });
  const int = (v: number) => Math.round(v).toLocaleString('en-US');
  const one = (v: number) => v.toFixed(1);
  const hof = (r: CareerRecord) => (r.hof === 'first' ? 2 : r.hof ? 1 : 0);
  const rank = (r: CareerRecord) => (r.rank > 100 ? 101 : r.rank);
  return [
    { label: 'Difficulty', a: `${MODES[a.mode].name}${a.oath ? ' · Rough Road' : ''}${a.comet ? ' · Comet' : ''}`, b: `${MODES[b.mode].name}${b.oath ? ' · Rough Road' : ''}${b.comet ? ' · Comet' : ''}`, better: null },
    { label: 'Tier', a: a.tier, b: b.tier, better: null },
    row('Peak OVR', a.peak, b.peak, int),
    ...(a.index && b.index ? [row('Career index', a.index.score, b.index.score, one)] : []),
    row('Legacy points', a.legacy, b.legacy, int),
    row('All-time rank', rank(a), rank(b), (v) => (v > 100 ? 'outside the top 100' : `#${v}`), 'less'),
    row('Hall of Fame', hof(a), hof(b), (v) => (v === 2 ? 'First ballot' : v === 1 ? 'Yes' : 'No')),
    row('Titles', a.titles, b.titles, int),
    row('MVPs', a.mvps, b.mvps, int),
    row('All-Star picks', a.allStars, b.allStars, int),
    row('NBA seasons', a.nbaSeasons, b.nbaSeasons, int),
    row('NBA points', a.nbaPoints, b.nbaPoints, int),
    row('Retired at', a.retiredAt, b.retiredAt, (v) => `age ${v}`, 'none'),
  ];
}

/** How many rows each side wins. */
export function compareScore(rows: CompareRow[]): { a: number; b: number } {
  return { a: rows.filter((r) => r.better === 'a').length, b: rows.filter((r) => r.better === 'b').length };
}
