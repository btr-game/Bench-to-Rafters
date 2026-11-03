// Round 37: what the town's street (ui/town.ts) shows of a career, worked out here so the street,
// the book (achievements37.ts) and the turning points (events/round37.ts) all read it one way: the
// kind of street he is on, the home the bank buys him, his car at the kerb, a hoop at home, his
// statue outside the arena, and what a city put up for him (a street with his name, a mural).

import type { GameState, LevelKey } from '../types';
import { raftersTeams } from '../awards/legacy';
import { NBA_TEAMS } from '../../content/teams';

/** His hometown in high school, the campus in college, a city as a pro, a city abroad in Europe. */
export type StreetLook = 'hometown' | 'campus' | 'city' | 'abroad';

/** The bank (in $M) that moves him out of a flat into a house, then into a mansion. */
export const HOUSE_BANK = { house: 3, mansion: 40 };
/** What he bought that stands on the street: a car at the kerb, a hoop beside the house. */
export const CAR_IDS = ['car', 'car-collection'];
const HOOP_IDS = ['backyard-court', 'home-court', 'smart-court'];

/** The level he played last, for a career that is over. */
const lastLevel = (g: GameState): LevelKey | undefined => g.history[g.history.length - 1]?.level;

/** Which street he is on: his hometown in high school, the campus in college, then a city. */
export function streetLook(g: GameState): StreetLook {
  const st = g.stage === 'RETIRED' || g.stage === 'FA' ? lastLevel(g) ?? 'HSV' : g.stage;
  if (st === 'HS' || st === 'HSJV' || st === 'HSV') return 'hometown';
  if (st === 'NCAA') return 'campus';
  if (st === 'EU' || st === 'INT') return 'abroad';
  return 'city';
}

/** A pro's street: a city, at home or abroad. */
export const proStreet = (g: GameState): boolean => ['city', 'abroad'].includes(streetLook(g));
const owns = (g: GameState, ids: string[]) => ids.some((id) => g.purchases.includes(id));
/** His car at the kerb: bought, and he is a pro. */
export const carOut = (g: GameState): boolean => proStreet(g) && owns(g, CAR_IDS);
/** A hoop at home: a court he built, or the one that came with the house (events/round37.ts, moving day). */
export const hoopHome = (g: GameState): boolean => owns(g, HOOP_IDS) || !!g.flags.yardHoop;
/** His statue outside the arena: he has retired, and the team he finished with hangs his jersey. */
export const statueUp = (g: GameState): boolean => g.stage === 'RETIRED' && !!g.teamId && raftersTeams(g).includes(g.teamId);

/** A city in the flags, for what it put up for him: the NBA team's place in content/teams.ts, plus one (0: none). */
export const cityMark = (g: GameState): number => NBA_TEAMS.findIndex((t) => t.abbr === g.teamId) + 1;
/** Whether what a city put up (flags.streetName, flags.mural) stands on the street he is on now: his team's city. */
export const upHere = (g: GameState, mark: number | undefined): boolean => !!mark && NBA_TEAMS[mark - 1]?.abbr === g.teamId;
