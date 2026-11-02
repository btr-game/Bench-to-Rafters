// The road map (round 33, owner: "from now on, the users have to play three levels to access the
// full game"): the three levels and the mini-games every device plays before the full start page
// opens, kept on this device. Every device starts in it, whatever it has saved (owner: "anyone who
// goes into the browser automatically gets assigned to the tutorial, regardless of their data");
// the exit code skips it, and the graduation page shows the code (owner: "at the end of the
// tutorial, the game reveals the exit password ... this allows old users to skip").
// Round 35 (owner: "make only the beginner level of tutorial necessary. once the user graduates from
// it, they get the key and gain access to the main game. but, can you lock the other difficulties
// ... except for regular guy. also lock minigame. the user have to clear the other levels in
// tutorial and the minigame tutorial in order to access those modes"): graduation follows the
// beginner level; intermediate opens Reality hits hard, advanced Shoot for the stars, the island the
// mini-games (Built in a lab among them). The exit code opens what beginner does. A device that had
// already graduated keeps everything.

import { LEVEL_IDS, levelOf, type Level } from '../engine/levels';
import type { GameState } from '../engine/types';
import type { ChosenLook } from '../content/looks';
import type { MiniResult } from '../engine/career/miniBonus';
import { ROAD_GRADES } from '../engine/balance';
import { fnv1a, isDev } from '../dev/mode';

/** The mini-games of the island; each needs a C or better once (R33-D). */
export type RoadMini = 'threes' | 'dunk' | 'street' | 'legends' | 'lab' | 'rhythm' | 'office';

export interface Road {
  /** The full game is open on this device: the beginner level passed (round 35), or the exit code. */
  free?: 1;
  /** Round 35: every mode open (a device that graduated before the round 35 locks). */
  all?: 1;
  /** The version of the road's rules this was saved under (35: the beginner-only tutorial). */
  v?: number;
  /** The levels passed, and whether that career made an All-Star team. */
  passed: Partial<Record<Level, { star: boolean }>>;
  /** The best grade in each mini-game so far. */
  minis: Partial<Record<RoadMini, string>>;
  /** The closing tour is done. */
  toured?: 1;
  /** The look of the last level's player, for the car on the map. */
  look?: ChosenLook;
  /** The tutorial guide's lessons done (tutorial/lessons.ts). */
  lessons?: string[];
  /** The dev deck's look at the tutorial's pages (with its lessons, or the pages alone); never saved. */
  preview?: 'page' | 'lesson';
}

const KEY = 'btr-road-v1';

export function loadRoad(): Road {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Road | null;
    if (r && typeof r === 'object') {
      const road: Road = { ...r, passed: r.passed ?? {}, minis: r.minis ?? {} };
      // round 35: a road saved before the locks; one that had graduated keeps every mode
      if (!road.v) {
        road.v = ROAD_V;
        if (road.free) road.all = 1;
        saveRoad(road);
      }
      return road;
    }
  } catch {
    /* unreadable or blocked: the road from its start */
  }
  return { passed: {}, minis: {}, v: ROAD_V };
}

const ROAD_V = 35;

export function saveRoad({ preview: _, ...r }: Road): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* storage blocked: the road holds for this visit */
  }
}

/** The tutorial is on: the full game is not open on this device yet (the dev deck is never in it,
 * but for the cards that show its pages). */
export const inTutorial = (r: Road): boolean => !r.free && (!isDev() || !!r.preview);

/** Round 35 (owner: "there are still too much features accessible in the tutorial mode"): the
 * beginner level, the tutorial, shows the essence only: no fan talk or milestones on Home, and a
 * Player tab of ratings and status. */
export const leanLevel = (g: GameState): boolean => levelOf(g) === 'beginner';

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

/** Round 35: what the road map's other stops open once the full game is: intermediate Reality hits
 * hard, advanced Shoot for the stars, the island the mini-games (Built in a lab is one of them). */
export type Unlock = 'reality' | 'stars' | 'minis';
export const UNLOCK_FROM: Record<Unlock, Level | 'island'> = { reality: 'intermediate', stars: 'advanced', minis: 'island' };
export const UNLOCK_NAME: Record<Unlock, string> = { reality: 'Reality hits hard', stars: 'Shoot for the stars', minis: 'the mini-games' };
const STOP_NAME: Record<Level | 'island', string> = { beginner: 'beginner', intermediate: 'the intermediate level', advanced: 'the advanced level', island: 'the island' };

/** Whether this device has opened `u` (the dev deck has everything, but for its tutorial cards). */
export function unlocked(r: Road, u: Unlock): boolean {
  if (r.all || (isDev() && !r.preview)) return true;
  const from = UNLOCK_FROM[u];
  return from === 'island' ? islandDone(r) : !!r.passed[from];
}
/** A difficulty this device may start a career at (Regular guy always). */
export const modeOpen = (r: Road, m: string): boolean => (m === 'reality' ? unlocked(r, 'reality') : m === 'stars' ? unlocked(r, 'stars') : true);
/** What a stop on the road map opens, if it opens anything. */
export const unlockOf = (stop: Level | 'island'): Unlock | null => (Object.keys(UNLOCK_FROM) as Unlock[]).find((u) => UNLOCK_FROM[u] === stop) ?? null;
/** "Clear the intermediate level on the road map to open Reality hits hard." */
export const unlockHint = (u: Unlock): string => `Clear ${STOP_NAME[UNLOCK_FROM[u]]} on the road map to open ${UNLOCK_NAME[u]}.`;

/** A career kept nowhere: a level, or a closing-tour stop (no save slot, log, community or achievements). */
export const offRecord = (g: GameState): boolean => !!(g.flags.level || g.flags.tour);

/** All three levels are passed. */
export const levelsDone = (r: Road): boolean => LEVEL_IDS.every((l) => !!r.passed[l]);
/** Every mini-game on the island has a C or better. */
export const islandDone = (r: Road): boolean => ROAD_MINIS.every((m) => passGrade(r.minis[m]));
