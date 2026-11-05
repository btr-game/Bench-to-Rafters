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
import { FLOOR_MINI } from './balance';

/** Every finished mini-game run on this device: runs, best result and wins, per game. */
export interface MiniTotals {
  runs: Partial<Record<MiniId, number>>;
  /** The best result, on each game's own scale (the 3-point score, the best dunk, a lab peak; a rank 0-3 or 0-4 for the rest). */
  best: Partial<Record<MiniId, number>>;
  /** Top results: contest wins, Legends titles, the Floor's wins, lab 90s, 3-on-3 wins, Lockdown S grades. */
  wins: Partial<Record<MiniId, number>>;
  /** Round 39: the Floor's own marks: his most points in a game, wins after trailing by FLOOR_MINI.back
   * or more, the strengths won at ('team': his own NBA team in a career), and A grades. */
  floor?: FloorTotals;
}
interface FloorTotals {
  pts: number;
  back: number;
  beat: string[];
  a: number;
}
// a device's totals from before round 39 may still count Front Office runs under 'office': they
// stay in the number of runs, and count for no game of today's
const NO_MINI: MiniTotals = { runs: {}, best: {}, wins: {} };
const NO_FLOOR: FloorTotals = { pts: 0, back: 0, beat: [], a: 0 };
const MINIS: MiniId[] = ['threes', 'dunk', 'legends', 'floor', 'lab', 'street', 'rhythm'];

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
    case 'floor':
      return [r.margin, r.margin > 0 ? 1 : 0];
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
  const out: MiniTotals = {
    ...m,
    runs: { ...m.runs, [r.game]: (m.runs[r.game] ?? 0) + 1 },
    // (a first result below -1, a Floor loss, keeps the -1 that means nothing yet: the marks are wins)
    best: { ...m.best, [r.game]: Math.max(m.best[r.game] ?? -1, score) },
    wins: { ...m.wins, [r.game]: (m.wins[r.game] ?? 0) + wins },
  };
  if (r.game === 'floor') {
    const f = m.floor ?? NO_FLOOR;
    const won = r.margin > 0;
    out.floor = {
      pts: Math.max(f.pts, r.pts),
      back: f.back + (won && r.low <= -FLOOR_MINI.back ? 1 : 0),
      beat: won && !f.beat.includes(r.strength) ? [...f.beat, r.strength] : f.beat,
      a: f.a + (r.grade === 'A' ? 1 : 0),
    };
  }
  return out;
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
const fl = (f: MiniFacts): FloorTotals => mt(f).floor ?? NO_FLOOR;

/** The arcade: read only the device's totals, so they can be earned with no career open. */
export const MINI_TOTALS_ONLY = [
  'mg-first', 'mg-all', 'mg-25', 'mg-100', 'mg-threes-20', 'mg-threes-27', 'mg-threes-win', 'mg-dunk-win', 'mg-dunk-48', 'mg-legends', 'mg-legends3',
  'mg-lab90', 'mg-lab95', 'mg-street', 'mg-rhythm-a', 'mg-rhythm-s', 'mg-sweep',
  'mg-floor', 'mg-floor-win', 'mg-floor-w10', 'mg-floor-w25', 'mg-floor-big', 'mg-floor-15', 'mg-floor-back', 'mg-floor-pts12', 'mg-floor-pts20', 'mg-floor-every', 'mg-floor-a', 'mg-floor-a5', 'mg-floor-home',
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
  A('mg-lab90', 'Mad Scientist', 'starter', 'Build a 90 OVR player in Built in a lab.', (f) => best(f, 'lab') >= 90),
  A('mg-lab95', "It's Alive", 'allstar', 'Build a 95 OVR player in Built in a lab.', (f) => best(f, 'lab') >= 95),
  A('mg-street', 'Blacktop Bully', 'starter', 'Win a 3-on-3 game by a rout.', (f) => best(f, 'street') >= 3),
  A('mg-rhythm-a', 'In the Pocket', 'rotation', 'Get an A in Lockdown.', (f) => best(f, 'rhythm') >= 3),
  A('mg-rhythm-s', 'Metronome', 'allstar', 'Get an S in Lockdown.', (f) => best(f, 'rhythm') >= 4),
  A('mg-sweep', 'Arcade Royalty', 'hof', 'Get the top result in every mini-game.', (f) =>
    wins(f, 'threes') > 0 && wins(f, 'dunk') > 0 && wins(f, 'legends') > 0 && fl(f).a > 0 && best(f, 'lab') >= 90 && best(f, 'street') >= 3 && best(f, 'rhythm') >= 4),
  // round 39: the Floor, in Front Office's place (the career's own games on the Floor are flr-*)
  A('mg-floor', 'Open Floor', 'bench', 'Finish a game of the Floor mini-game.', (f) => (mt(f).runs.floor ?? 0) >= 1),
  A('mg-floor-win', 'Floor Exercise', 'starter', 'Win a game of the Floor mini-game.', (f) => wins(f, 'floor') >= 1),
  A('mg-floor-w10', 'Hardwood Classic', 'allstar', 'Win ten games of the Floor mini-game.', (f) => wins(f, 'floor') >= 10),
  A('mg-floor-w25', 'Wall to Wall', 'hof', 'Win 25 games of the Floor mini-game.', (f) => wins(f, 'floor') >= 25),
  A('mg-floor-big', 'Wipe the Floor', 'rotation', 'Win a game of the Floor mini-game by 10 or more.', (f) => best(f, 'floor') >= 10),
  A('mg-floor-15', 'Polished Off', 'allstar', 'Win a game of the Floor mini-game by 15 or more.', (f) => best(f, 'floor') >= 15),
  A('mg-floor-back', 'Basement to Penthouse', 'allstar', `Win a game of the Floor mini-game after trailing by ${FLOOR_MINI.back} or more.`, (f) => fl(f).back >= 1),
  A('mg-floor-pts12', 'Floor Show', 'rotation', 'Score 12 points in one game of the Floor mini-game.', (f) => fl(f).pts >= 12),
  A('mg-floor-pts20', 'Top Floor', 'hof', 'Score 20 points in one game of the Floor mini-game.', (f) => fl(f).pts >= 20),
  A('mg-floor-every', 'Elevator Pitch', 'rotation', 'Win a game of the Floor mini-game with the teams at every strength: Average, Good and Great.', (f) => Object.keys(FLOOR_MINI.strength).every((k) => fl(f).beat.includes(k))),
  A('mg-floor-a', "Dean's List", 'starter', 'Get an A in the Floor mini-game.', (f) => fl(f).a >= 1),
  A('mg-floor-a5', "Straight A's", 'allstar', 'Get an A in the Floor mini-game five times.', (f) => fl(f).a >= 5),
  A('mg-floor-home', 'Home Floor', 'starter', 'Win a game of the Floor mini-game as yourself, on your own NBA team.', (f) => fl(f).beat.includes('team')),

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
  A('mg-floor-c1', 'Practice Floor', 'starter', 'Claim a bonus from the Floor mini-game in a career.', (f) => claims(f).some((c) => c.game === 'floor')),
  A('mg-floor-c5', 'Floor Time', 'allstar', 'Claim five bonuses from the Floor mini-game in one career.', (f) => claims(f).filter((c) => c.game === 'floor').length >= 5),
  A('mg-ring', 'Offseason Pays Off', 'allstar', 'Win an NBA title in a season you also earned a mini-game bonus.', (f) =>
    (f.nbaTitlesYears ?? []).some((y) => claims(f).some((c) => c.year === y || c.year === y - 1))),
];
