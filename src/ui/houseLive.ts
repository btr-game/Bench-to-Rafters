// The live strip's house players (round 32, owner: "i want the game to be more popular. to do that,
// i want to make it seem popular"). Simulated players on the court and the careers they finish,
// added to the real ones, the way the leaderboards and the plaza carry house players; the strip
// says so ("House players included"), and the dev deck shows the real numbers on their own.
// Worked out from the clock alone, so everyone sees about the same numbers at the same moment.

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** The range the house court moves in. */
export const HOUSE_COURT = { low: 300, high: 1500 };
/** House careers ended since a page opened: a share of the court then (never more than the court's
 * lowest, so the count stays below the court whatever it does), reached over about an hour. */
const ENDED = { share: 0.6, minutes: 40 };

const wave = (t: number, period: number, phase = 0) => Math.sin((2 * Math.PI * t) / period + phase);

/** A small stable wobble for each 10-second step, between −0.5 and 0.5. */
function jitter(step: number): number {
  let h = Math.imul(step ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 2 ** 32 - 0.5;
}

/** House players on the court at time `t` (ms): a day that peaks in the evening across the
 * Americas and Europe, slower and quicker swells on top, and a little wobble. */
export function houseOnCourt(t: number): number {
  const day = wave(t, DAY, -Math.PI / 2 - (2 * Math.PI * 10) / 24); // lowest about 10:00 UTC, highest about 22:00
  const v = 880 + 420 * day + 110 * wave(t, 37 * MIN, 1.3) + 45 * wave(t, 7 * MIN, 0.4) + 50 * jitter(Math.floor(t / 10_000));
  return Math.round(Math.min(HOUSE_COURT.high, Math.max(HOUSE_COURT.low, v)));
}

/** House careers ended between `opened` and `now` (ms): never down, and always below the court. */
export function houseEnded(opened: number, now: number): number {
  const k = Math.min(ENDED.share * houseOnCourt(opened), HOUSE_COURT.low - 1);
  return Math.floor(k * (1 - Math.exp(-Math.max(0, now - opened) / (ENDED.minutes * MIN))));
}
