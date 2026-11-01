// The road map (round 33, owner: "from now on, the users have to play three levels to access the
// full game"): the three levels and the mini-games every device plays before the full start page
// opens, kept on this device. Every device starts in it, whatever it has saved (owner: "anyone who
// goes into the browser automatically gets assigned to the tutorial, regardless of their data");
// the exit code skips it, and the graduation page shows the code (owner: "at the end of the
// tutorial, the game reveals the exit password ... this allows old users to skip").

import { LEVEL_IDS, levelOf, type Level } from '../engine/levels';
import type { GameState } from '../engine/types';
import type { ChosenLook } from '../content/looks';
import type { MiniResult } from '../engine/career/miniBonus';
import { ROAD_GRADES } from '../engine/balance';
import { fnv1a, isDev } from '../dev/mode';

/** The mini-games of the island; each needs a C or better once (R33-D). */
export type RoadMini = 'threes' | 'dunk' | 'street' | 'legends' | 'lab' | 'rhythm' | 'office';

export interface Road {
  /** The full game is open on this device: the tutorial finished, or the exit code. */
  free?: 1;
  /** The levels passed, and whether that career made an All-Star team. */
  passed: Partial<Record<Level, { star: boolean }>>;
  /** The best grade in each mini-game so far. */
  minis: Partial<Record<RoadMini, string>>;
  /** The closing tour is done. */
  toured?: 1;
  /** The look of the last level's player, for the car on the map. */
  look?: ChosenLook;
}

const KEY = 'btr-road-v1';

export function loadRoad(): Road {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Road | null;
    if (r && typeof r === 'object') return { ...r, passed: r.passed ?? {}, minis: r.minis ?? {} };
  } catch {
    /* unreadable or blocked: the road from its start */
  }
  return { passed: {}, minis: {} };
}

export function saveRoad(r: Road): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* storage blocked: the road holds for this visit */
  }
}

/** The tutorial is on: the full game is not open on this device yet (the dev deck is never in it). */
export const inTutorial = (r: Road): boolean => !r.free && !isDev();

/** The tabs a level career shows (owner: beginner "tabs Home + Player"), or null for all of them. */
export function levelTabs(g: GameState): ('home' | 'season' | 'player')[] | null {
  const l = levelOf(g);
  if (!l) return null;
  return l === 'beginner' ? ['home', 'player'] : ['home', 'season', 'player'];
}

/** The next level on the road, or null once all three are passed. */
export const nextLevel = (r: Road): Level | null => LEVEL_IDS.find((l) => !r.passed[l]) ?? null;

/** A level can be played once the one before it is passed. */
export const levelOpen = (r: Road, l: Level): boolean => {
  const i = LEVEL_IDS.indexOf(l);
  return i === 0 || !!r.passed[LEVEL_IDS[i - 1]];
};

// FNV-1a of the exit code (dev/mode.ts hashes the deck's password the same way)
const EXIT = 0xc56a0907;
// the code itself, for the graduation page: kept lightly encoded so the page never spells it out
const SHOWN = [82, 78, 34, 46, 51, 44, 45];

/** Whether a code is the exit code (spaces and capitals do not matter). */
export const exitCode = (code: string): boolean => fnv1a(code.trim().toLowerCase()) === EXIT;

/** The exit code, as the graduation page shows it. */
export const revealCode = (): string => String.fromCharCode(...SHOWN.map((c, i) => c ^ (0x35 + 7 * i)));

/** A mini-game run's grade on the island (balance.ts ROAD_GRADES): A to D, or Lockdown's own. */
export function roadGrade(r: MiniResult): string {
  const G = ROAD_GRADES;
  const by = (v: number, t: { A: number; B: number; C: number }, won = false) => (won || v >= t.A ? 'A' : v >= t.B ? 'B' : v >= t.C ? 'C' : 'D');
  switch (r.game) {
    case 'threes':
      return by(r.score, G.threes, r.won);
    case 'dunk':
      return by(r.best, G.dunk, r.won);
    case 'lab':
      return by(r.peak, G.lab);
    case 'office':
      return r.titles > 0 ? 'A' : r.playoffs >= G.office.B ? 'B' : r.playoffs >= G.office.C ? 'C' : 'D';
    case 'legends':
      return { champion: 'A', finals: 'B', semis: 'C', out: 'D' }[r.reached];
    case 'street':
      return { rout: 'A', win: 'B', close: 'C', out: 'D' }[r.reached];
    case 'rhythm':
      return r.grade;
  }
}

const RANK = ['S', 'A', 'B', 'C', 'D'];
/** The better of two grades. */
export const bestGrade = (a: string | undefined, b: string): string => (a && RANK.indexOf(a) <= RANK.indexOf(b) ? a : b);
/** A grade that passes the island: C or better. */
export const passGrade = (g?: string): boolean => !!g && RANK.indexOf(g) >= 0 && RANK.indexOf(g) <= RANK.indexOf('C');
/** The island's mini-games, in the hub's order. */
export const ROAD_MINIS: RoadMini[] = ['threes', 'dunk', 'street', 'legends', 'lab', 'rhythm', 'office'];

/** What a C takes in each mini-game, in a few words (the island's hub and the road map). */
export const ROAD_NEED: Record<RoadMini, string> = {
  threes: `${ROAD_GRADES.threes.C} points`,
  dunk: `a ${ROAD_GRADES.dunk.C}-point dunk`,
  street: 'lose by 3 or less',
  legends: 'reach the conference finals',
  lab: `peak OVR ${ROAD_GRADES.lab.C}`,
  rhythm: 'half the plays on time',
  office: 'make the playoffs once',
};

/** All three levels are passed. */
export const levelsDone = (r: Road): boolean => LEVEL_IDS.every((l) => !!r.passed[l]);
/** Every mini-game on the island has a C or better. */
export const islandDone = (r: Road): boolean => ROAD_MINIS.every((m) => passGrade(r.minis[m]));
/** The whole bucket list: the levels, the island and the closing tour. The graduation page is next. */
export const roadDone = (r: Road): boolean => levelsDone(r) && islandDone(r) && !!r.toured;
