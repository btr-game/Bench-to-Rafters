// Round 27 (owner: "are there achievements for minigames? if not, make them. ... i think
// achievements can work in two ways. outside of the main game and based on the minigame's impact on
// the main game"). Two kinds, same rules as the rest of the book (cosmetic, pun names, conditions
// hidden until earned):
//  - the arcade: what the mini-games themselves went like, kept on this device across every run
//    (the totals' `mini`, filled when a run ends: addMiniResult), with or without a career open;
//  - the career: what the bonuses did for a career (GameState.miniLog, filled by claimMini).

import type { CareerTotals, AchTier } from './achievements';
import type { GameState } from './types';
import type { MiniId, MiniResult } from './career/miniBonus';

/** Every finished mini-game run on this device: runs, best result and wins, per game. */
export interface MiniTotals {
  runs: Partial<Record<MiniId, number>>;
  /** The best result, on each game's own scale (the 3-point score, the best dunk, a lab peak; a rank 0-3 or 0-4 for the rest). */
  best: Partial<Record<MiniId, number>>;
  /** Top results: contest wins, Legends titles, Front Office titles, lab 90s, 3-on-3 wins, Lockdown S grades. */
  wins: Partial<Record<MiniId, number>>;
}
const NO_MINI: MiniTotals = { runs: {}, best: {}, wins: {} };
const MINIS: MiniId[] = ['threes', 'dunk', 'legends', 'office', 'lab', 'street', 'rhythm'];

const LEGENDS_RANK = { out: 0, semis: 1, finals: 2, champion: 3 } as const;
const STREET_RANK = { out: 0, close: 1, win: 2, rout: 3 } as const;
const GRADE_RANK = { D: 0, C: 1, B: 2, A: 3, S: 4 } as const;

/** A run's result on its game's scale, and how many top results it counts for. */
function scoreOf(r: MiniResult): [number, number] {
  switch (r.game) {
    case 'threes':
      return [r.score, r.won ? 1 : 0];
    case 'dunk':
      return [r.best, r.won ? 1 : 0];
    case 'legends':
      return [LEGENDS_RANK[r.reached], r.reached === 'champion' ? 1 : 0];
    case 'office':
      return [r.titles, r.titles];
    case 'lab':
      return [r.peak, r.peak >= 90 ? 1 : 0];
    case 'street':
      return [STREET_RANK[r.reached], r.reached === 'win' || r.reached === 'rout' ? 1 : 0];
    case 'rhythm':
      return [GRADE_RANK[r.grade], r.grade === 'S' ? 1 : 0];
  }
}

/** The totals after one more finished run (a new object; the old one is left alone). */
export function addMiniResult(t: MiniTotals | undefined, r: MiniResult): MiniTotals {
  const m = t ?? NO_MINI;
  const [score, wins] = scoreOf(r);
  return {
    runs: { ...m.runs, [r.game]: (m.runs[r.game] ?? 0) + 1 },
    best: { ...m.best, [r.game]: Math.max(m.best[r.game] ?? -1, score) },
    wins: { ...m.wins, [r.game]: (m.wins[r.game] ?? 0) + wins },
  };
}

interface MiniFacts {
  g?: GameState;
  t: CareerTotals;
  nbaTitlesYears?: number[];
}
interface AchMini {
  id: string;
  name: string;
  tier: AchTier;
  how: string;
  test: (f: MiniFacts) => boolean;
}
const A = (id: string, name: string, tier: AchTier, how: string, test: (f: MiniFacts) => boolean): AchMini => ({ id, name, tier, how, test });
const mt = (f: MiniFacts): MiniTotals => f.t.mini ?? NO_MINI;
const runs = (f: MiniFacts) => Object.values(mt(f).runs).reduce((a, b) => a + (b ?? 0), 0);
const best = (f: MiniFacts, id: MiniId) => mt(f).best[id] ?? -1;
const wins = (f: MiniFacts, id: MiniId) => mt(f).wins[id] ?? 0;
const claims = (f: MiniFacts) => f.g?.miniLog ?? [];

/** The arcade: read only the device's totals, so they can be earned with no career open. */
export const MINI_TOTALS_ONLY = [
  'mg-first', 'mg-all', 'mg-25', 'mg-100', 'mg-threes-20', 'mg-threes-27', 'mg-threes-win', 'mg-dunk-win', 'mg-dunk-48', 'mg-legends', 'mg-legends3',
  'mg-office', 'mg-office3', 'mg-lab90', 'mg-lab95', 'mg-street', 'mg-rhythm-a', 'mg-rhythm-s', 'mg-sweep',
];

export const ACHIEVEMENTS_MINI: AchMini[] = [
  // ---- the arcade (outside the main game) ----
  A('mg-first', 'Recess', 'bench', 'Finish a mini-game.', (f) => runs(f) >= 1),
  A('mg-all', 'Arcade Tour', 'starter', 'Finish every mini-game at least once.', (f) => MINIS.every((id) => (mt(f).runs[id] ?? 0) > 0)),
  A('mg-25', 'Quarter Muncher', 'rotation', 'Finish 25 mini-game runs.', (f) => runs(f) >= 25),
  A('mg-100', 'High Score Table', 'allstar', 'Finish 100 mini-game runs.', (f) => runs(f) >= 100),
  A('mg-threes-20', 'Heat Check', 'rotation', 'Score 20 in the three-point contest.', (f) => best(f, 'threes') >= 20),
  A('mg-threes-27', 'Splash Zone', 'allstar', 'Score 27 in the three-point contest.', (f) => best(f, 'threes') >= 27),
  A('mg-threes-win', 'Rack Attack', 'starter', 'Win the three-point contest.', (f) => wins(f, 'threes') >= 1),
  A('mg-dunk-win', 'Air Raid', 'starter', 'Win the dunk contest.', (f) => wins(f, 'dunk') >= 1),
  A('mg-dunk-48', 'Judges in Tears', 'allstar', 'Score 48 or better with one dunk.', (f) => best(f, 'dunk') >= 48),
  A('mg-legends', 'Time Machine', 'starter', 'Win the Legends showdown.', (f) => wins(f, 'legends') >= 1),
  A('mg-legends3', 'Era Hopper', 'allstar', 'Win the Legends showdown three times.', (f) => wins(f, 'legends') >= 3),
  A('mg-office', 'Suit and Ring', 'starter', 'Win a title in Front Office.', (f) => wins(f, 'office') >= 1),
  A('mg-office3', 'Dynasty in a Spreadsheet', 'hof', 'Win three titles in one Front Office run.', (f) => best(f, 'office') >= 3),
  A('mg-lab90', 'Mad Scientist', 'starter', 'Build a 90 OVR player in Built in a lab.', (f) => best(f, 'lab') >= 90),
  A('mg-lab95', "It's Alive", 'allstar', 'Build a 95 OVR player in Built in a lab.', (f) => best(f, 'lab') >= 95),
  A('mg-street', 'Blacktop Bully', 'starter', 'Win a 3-on-3 game by a rout.', (f) => best(f, 'street') >= 3),
  A('mg-rhythm-a', 'In the Pocket', 'rotation', 'Get an A in Lockdown.', (f) => best(f, 'rhythm') >= 3),
  A('mg-rhythm-s', 'Metronome', 'allstar', 'Get an S in Lockdown.', (f) => best(f, 'rhythm') >= 4),
  A('mg-sweep', 'Arcade Royalty', 'hof', 'Get the top result in every mini-game.', (f) =>
    wins(f, 'threes') > 0 && wins(f, 'dunk') > 0 && wins(f, 'legends') > 0 && wins(f, 'office') > 0 && best(f, 'lab') >= 90 && best(f, 'street') >= 3 && best(f, 'rhythm') >= 4),

  // ---- the career (what the bonuses did for it) ----
  A('mg-c3', 'Cross-Trainer', 'starter', 'Claim bonuses from three different mini-games in one career.', (f) => new Set(claims(f).map((c) => c.game)).size >= 3),
  A('mg-c7', 'Decathlete', 'allstar', 'Claim a bonus from every mini-game in one career.', (f) => new Set(claims(f).map((c) => c.game)).size >= MINIS.length),
  A('mg-c10', 'Extra Credit', 'rotation', 'Claim ten mini-game bonuses in one career.', (f) => claims(f).length >= 10),
  A('mg-ovr2', 'Homework Pays', 'allstar', 'Gain 2 OVR from mini-game bonuses in one career.', (f) => claims(f).reduce((a, c) => a + c.gain, 0) >= 2),
  A('mg-range', 'One Step Back', 'rotation', 'Add range with a three-point contest bonus.', (f) => claims(f).some((c) => c.game === 'threes' && (c.range ?? 0) > 0)),
  A('mg-streak5', 'Summer School', 'starter', 'Claim a mini-game bonus five seasons in a row.', (f) => {
    const years = new Set(claims(f).map((c) => c.year));
    return [...years].some((y) => [1, 2, 3, 4].every((k) => years.has(y + k)));
  }),
  A('mg-ring', 'Offseason Pays Off', 'allstar', 'Win an NBA title in a season you also earned a mini-game bonus.', (f) =>
    (f.nbaTitlesYears ?? []).some((y) => claims(f).some((c) => c.year === y || c.year === y - 1))),
];
