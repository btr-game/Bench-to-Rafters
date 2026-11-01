// The career log (round 24): the career cards of the last finished careers, kept on this device.
// Ten at most, like the saved careers (round 28; five before): at nine the page warns, and an
// eleventh pushes out the oldest. Deleting a card here
// never touches anything posted elsewhere (a leaderboard keeps its own copy).
// Round 29 (owner: "if the user doesnt want to loose an old career, let him lock it so that we
// exclude that career from getting deleted. however, limit the number of locks to 5"): a locked
// card is never pushed out and can't be deleted until it is unlocked; five locks at most, so a new
// career always has an unlocked card to replace.

import { chooseLook } from '../content/looks';
import type { CareerRecord } from '../engine/career/record';

const KEY = 'btr-log-v1';
export const LOG_MAX = 10;
export const LOG_WARN = 9;
export const LOCK_MAX = 5;

interface LogData {
  cards: CareerRecord[];
  // every career ever logged, so looking back at a finished save never logs it twice
  seen: string[];
  // round 29: the ids of the locked cards
  locked: string[];
}

function load(): LogData {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null') as LogData | null;
    if (d && Array.isArray(d.cards)) {
      const ids = new Set(d.cards.map((c) => c.id));
      return { cards: d.cards, seen: d.seen ?? d.cards.map((c) => c.id), locked: (d.locked ?? []).filter((id) => ids.has(id)) };
    }
  } catch {
    // a blocked or broken store reads as an empty log
  }
  return { cards: [], seen: [], locked: [] };
}

function save(d: LogData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ cards: d.cards, seen: d.seen.slice(-100), locked: d.locked }));
    return true;
  } catch {
    return false;
  }
}

/** The cards, newest first. */
export const logCards = (): CareerRecord[] => {
  const cards = load().cards.slice().reverse();
  for (const c of cards) chooseLook(c.name, c.look); // round 27: each in the look he chose
  return cards;
};

/** The ids of the locked cards. */
export const logLocks = (): string[] => load().locked;

/** The card a new career would push out: the oldest one not locked (none while the log has room). */
export function nextOut(): CareerRecord | null {
  const d = load();
  if (d.cards.length < LOG_MAX) return null;
  return d.cards.find((c) => !d.locked.includes(c.id)) ?? null;
}

/** Locks or unlocks a card; false when a sixth lock is asked for (or the card is gone). */
export function lockCard(id: string, on: boolean): boolean {
  const d = load();
  if (!d.cards.some((c) => c.id === id)) return false;
  if (on && !d.locked.includes(id)) {
    if (d.locked.length >= LOCK_MAX) return false;
    d.locked.push(id);
  } else if (!on) d.locked = d.locked.filter((x) => x !== id);
  return save(d);
}

export interface LogResult {
  added: boolean;
  dropped: CareerRecord | null; // the oldest card, pushed out to make room
  count: number;
}

/** Logs a finished career once; at the limit the oldest card that is not locked goes. */
export function logCareer(rec: CareerRecord): LogResult {
  const d = load();
  if (d.seen.includes(rec.id)) return { added: false, dropped: null, count: d.cards.length };
  d.cards.push(rec);
  d.seen.push(rec.id);
  const out = d.cards.length > LOG_MAX ? d.cards.findIndex((c) => !d.locked.includes(c.id)) : -1;
  const dropped = out >= 0 ? d.cards.splice(out, 1)[0] : null;
  const ok = save(d);
  return { added: ok, dropped: ok ? dropped : null, count: d.cards.length };
}

/** Deletes a card, unless it is locked. */
export function deleteCard(id: string): void {
  const d = load();
  if (d.locked.includes(id)) return;
  d.cards = d.cards.filter((c) => c.id !== id);
  save(d);
}
