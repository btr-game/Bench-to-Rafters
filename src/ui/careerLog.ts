// The career log (round 24): the career cards of the last finished careers, kept on this device.
// Five at most: at four the page warns, and a sixth pushes out the oldest. Deleting a card here
// never touches anything posted elsewhere (a leaderboard keeps its own copy).

import { chooseLook } from '../content/looks';
import type { CareerRecord } from '../engine/career/record';

const KEY = 'btr-log-v1';
export const LOG_MAX = 5;
export const LOG_WARN = 4;

interface LogData {
  cards: CareerRecord[];
  // every career ever logged, so looking back at a finished save never logs it twice
  seen: string[];
}

function load(): LogData {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null') as LogData | null;
    if (d && Array.isArray(d.cards)) return { cards: d.cards, seen: d.seen ?? d.cards.map((c) => c.id) };
  } catch {
    // a blocked or broken store reads as an empty log
  }
  return { cards: [], seen: [] };
}

function save(d: LogData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ cards: d.cards, seen: d.seen.slice(-100) }));
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

export interface LogResult {
  added: boolean;
  dropped: CareerRecord | null; // the oldest card, pushed out to make room
  count: number;
}

/** Logs a finished career once; at the limit the oldest card goes. */
export function logCareer(rec: CareerRecord): LogResult {
  const d = load();
  if (d.seen.includes(rec.id)) return { added: false, dropped: null, count: d.cards.length };
  d.cards.push(rec);
  d.seen.push(rec.id);
  const dropped = d.cards.length > LOG_MAX ? d.cards.shift()! : null;
  const ok = save(d);
  return { added: ok, dropped: ok ? dropped : null, count: d.cards.length };
}

export function deleteCard(id: string): void {
  const d = load();
  d.cards = d.cards.filter((c) => c.id !== id);
  save(d);
}
