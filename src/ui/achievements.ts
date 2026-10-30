// What the player has earned (round 24): kept on this device for good, across careers. Each entry
// remembers when it came and which player earned it; the totals (careers finished, titles over
// every career...) feed the achievements that count more than one career.

import { ACHIEVEMENTS, NO_TOTALS, earnedNow, type Achievement, type CareerTotals } from '../engine/achievements';
import type { GameState } from '../engine/types';
import { count, nbaTitles } from '../engine/awards/legacy';

const KEY = 'btr-achv-v1';

export interface AchSaved {
  got: Record<string, { at: string; who: string }>;
  totals: CareerTotals;
}

export function loadAch(): AchSaved {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null') as AchSaved | null;
    if (d?.got) return { got: d.got, totals: { ...NO_TOTALS, ...d.totals } };
  } catch {
    // a blocked or broken store reads as nothing earned yet
  }
  return { got: {}, totals: { ...NO_TOTALS } };
}

function saveAch(d: AchSaved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // achievements are a nicety: without storage they just don't stick
  }
}

/** Days with a daily challenge run on this device (Daily.tsx keeps one entry a day). */
function dailyDays(): number {
  try {
    return Object.keys(JSON.parse(localStorage.getItem('btr-daily') ?? '{}') as object).length;
  } catch {
    return 0;
  }
}

/** A career just ended: count it in the totals. */
export function countCareer(g: GameState, master: boolean): void {
  const d = loadAch();
  const t = d.totals;
  const mode = g.mode ?? 'standard';
  t.finished += 1;
  t.byMode = { ...t.byMode, [mode]: (t.byMode[mode] ?? 0) + 1 };
  t.titles += nbaTitles(g);
  t.mvps += count(g, 'MVP');
  if (g.flags.fast) t.fast += 1;
  if (master) t.master += 1;
  saveAch(d);
}

/** Checks everything against the career on screen; returns what is new (and keeps it). */
export function checkAch(g: GameState | null): Achievement[] {
  const d = loadAch();
  d.totals.daily = Math.max(d.totals.daily, dailyDays());
  const fresh = earnedNow(g, d.totals).filter((id) => !d.got[id]);
  if (!fresh.length) return [];
  const at = new Date().toISOString();
  for (const id of fresh) d.got[id] = { at, who: g?.player.name ?? '' };
  saveAch(d);
  return fresh.map((id) => ACHIEVEMENTS.find((a) => a.id === id)!);
}
