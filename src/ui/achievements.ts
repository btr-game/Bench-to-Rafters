// What the player has earned (round 24): kept on this device for good, across careers. Each entry
// remembers when it came and which player earned it; the totals (careers finished, titles over
// every career...) feed the achievements that count more than one career.

import { ACHIEVEMENTS, NO_TOTALS, earnedNow, type Achievement, type CareerTotals } from '../engine/achievements';
import type { GameState } from '../engine/types';
import { isDev } from '../dev/mode';
import { count, nbaTitles } from '../engine/awards/legacy';
import { addMiniResult } from '../engine/achievementsMini';
import type { MiniResult } from '../engine/career/miniBonus';

const KEY = 'btr-achv-v1';

interface AchSaved {
  // round 28: `run` is the career that earned it (runOf), so a career can show what it earned
  got: Record<string, { at: string; who: string; run?: string }>;
  totals: CareerTotals;
  /** The day of a reset (round 27, the dev deck): daily challenges before it no longer count. */
  since?: string;
}

/** Which career a game is (round 28, owner: "in game, specifically highlight achievements achieved
 * in that run"): its seed and the player's name, the same through every season of it. */
export const runOf = (g: GameState): string => `${g.seed}-${g.player.name}`;

/** What one career earned, newest first (the Extras tab's card and dot, the Records tab). */
export function earnedIn(g: GameState): Achievement[] {
  const run = runOf(g);
  const got = loadAch().got;
  return ACHIEVEMENTS.filter((a) => got[a.id]?.run === run).sort((a, b) => (got[a.id].at < got[b.id].at ? 1 : -1));
}

/** A book with nothing in it, counting from today: what the dev deck's Reset achievements writes. */
export const emptyAch = (today: string): AchSaved => ({ got: {}, totals: { ...NO_TOTALS }, since: today });
export const ACH_KEY = KEY;

export function loadAch(): AchSaved {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null') as AchSaved | null;
    // round 25: the old dev deck page, opened from a file, could write its "everything earned" book
    // into the game's storage; those entries are not the player's and are dropped
    if (d?.got && !isDev()) for (const id of Object.keys(d.got)) if (d.got[id].who === 'Dev deck') delete d.got[id];
    if (d?.got) return { got: d.got, totals: { ...NO_TOTALS, ...d.totals }, since: d.since };
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

/** Days with a daily challenge run on this device (Daily.tsx keeps one entry a day), since a reset. */
function dailyDays(since?: string): number {
  try {
    return Object.keys(JSON.parse(localStorage.getItem('btr-daily') ?? '{}') as object).filter((day) => !since || day >= since).length;
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
  // round 32: a farewell tour seen through, a son's career played
  if (g.awards.some((a) => a.key === 'FAREWELL')) t.farewells = (t.farewells ?? 0) + 1;
  if (g.flags.gen2) t.sons = (t.sons ?? 0) + 1;
  saveAch(d);
}

/** A mini-game run just ended (round 27): count it for the arcade achievements. */
export function recordMini(r: MiniResult): void {
  const d = loadAch();
  d.totals.mini = addMiniResult(d.totals.mini, r);
  saveAch(d);
}

/** The game's link went out (round 28, Share the game): counted for Word of Mouth. */
export function recordShare(): void {
  const d = loadAch();
  d.totals.shared = (d.totals.shared ?? 0) + 1;
  saveAch(d);
}

/** Round 31: a choice taken back (Take Two). */
export function recordUndo(): void {
  const d = loadAch();
  d.totals.undone = (d.totals.undone ?? 0) + 1;
  saveAch(d);
}

/** Round 32: a play the announcer called. */
export function recordCall(): void {
  const d = loadAch();
  d.totals.called = (d.totals.called ?? 0) + 1;
  saveAch(d);
}

/** Round 32: a career card saved or shared. */
export function recordCard(): void {
  const d = loadAch();
  d.totals.cards = (d.totals.cards ?? 0) + 1;
  saveAch(d);
}

/** Round 31: two career log cards set side by side. */
export function recordCompare(): void {
  const d = loadAch();
  d.totals.compared = (d.totals.compared ?? 0) + 1;
  saveAch(d);
}

/** Round 29: cards locked in the career log right now (the most at once is kept). */
export function recordLocks(n: number): void {
  const d = loadAch();
  d.totals.locked = Math.max(d.totals.locked ?? 0, n);
  saveAch(d);
}

/** Round 29: a music loop was heard; true the first time. */
export function recordHeard(id: string): boolean {
  const d = loadAch();
  if (d.totals.heard?.includes(id)) return false;
  d.totals.heard = [...(d.totals.heard ?? []), id];
  saveAch(d);
  return true;
}

/** Checks everything against the career on screen; returns what is new (and keeps it). */
export function checkAch(g: GameState | null): Achievement[] {
  const d = loadAch();
  d.totals.daily = Math.max(d.totals.daily, dailyDays(d.since));
  const fresh = earnedNow(g, d.totals).filter((id) => !d.got[id]);
  if (!fresh.length) return [];
  const at = new Date().toISOString();
  for (const id of fresh) d.got[id] = { at, who: g?.player.name ?? '', ...(g ? { run: runOf(g) } : {}) };
  saveAch(d);
  return fresh.map((id) => ACHIEVEMENTS.find((a) => a.id === id)!);
}
