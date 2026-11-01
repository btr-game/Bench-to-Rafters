// The road map (round 33, owner: "from now on, the users have to play three levels to access the
// full game"): beginner, intermediate and advanced careers, each a short career with part of the
// game, before the full start page opens. One flag on the career (flags.level, 1 to 3) says which;
// `allows` is asked wherever a system starts, so the full game (no level) is unchanged.
//
// Every level starts as a high school senior (the first three years are played for him at the
// start), plays one college season, enters the draft and plays a set number of NBA seasons, then
// ends. Its goal is an NBA All-Star team; the levels are tuned so at least 80% of careers make one
// (ROADMAP in balance.ts). Missing it still passes the level, with an ending of its own.

import { ROADMAP } from './balance';
import type { Decision, GameState, Offer } from './types';

export type Level = 'beginner' | 'intermediate' | 'advanced';
export const LEVEL_IDS: Level[] = ['beginner', 'intermediate', 'advanced'];
export const LEVEL_NAME: Record<Level, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

/** The level this career is, or null for a career of the full game. */
export const levelOf = (s: GameState): Level | null => (s.flags.level ? (LEVEL_IDS[s.flags.level - 1] ?? null) : null);

/** The systems a level can leave out. A career of the full game has them all. */
type Feature =
  | 'shop' // the summer shop (beginner: three items, one purchase)
  | 'offers' // choosing among offers (a college, a pro deal); otherwise the best is taken for him
  | 'roads' // a country's road to the pros, G League and overseas offers
  | 'talks' // contract talks on every deal (intermediate: the first NBA deal only)
  | 'trade' // trade requests
  | 'arcs' // storylines
  | 'staff' // hiring staff
  | 'coach' // the head coach's card: the role talk, the hot seat
  | 'style' // team style
  | 'live' // playable playoff games
  | 'crunch' // crunch time and the action cam in a final
  | 'nickname'
  | 'brand'
  | 'rival'
  | 'recruit' // the starting five
  | 'body' // the body map and weight on screen
  | 'fast' // the fast break switch
  | 'sim' // the sim switch
  | 'standings'; // the Season tab's standings, leaders and bracket

const ALLOW: Record<Level, Feature[]> = {
  beginner: ['shop'],
  intermediate: ['shop', 'offers', 'talks', 'live', 'nickname', 'brand', 'rival', 'fast', 'standings'],
  advanced: ['shop', 'offers', 'talks', 'live', 'nickname', 'brand', 'rival', 'fast', 'standings', 'roads', 'trade', 'arcs', 'staff', 'coach', 'style', 'crunch', 'recruit', 'body', 'sim'],
};

/** Whether this career has a system (always, outside the levels). The closing tour's systems
 * (press, the locker room, duos, the farewell tour, the record watch, Love, the ring chase, the
 * national team, Around the league) are in no level: they ask `inLevel` instead. */
export function allows(s: GameState, f: Feature): boolean {
  const l = levelOf(s);
  return !l || ALLOW[l].includes(f);
}

/** A career on the road map (so the closing tour's systems stay out of it). */
export const inLevel = (s: GameState): boolean => !!s.flags.level;

/** How the season's plans are picked: six plans once a season (beginner), one or two of all
 * twelve once a season (intermediate), or the full game's one or two a half (advanced). */
export function planStyle(s: GameState): 'six' | 'season' | 'half' {
  const l = levelOf(s);
  return l === 'beginner' ? 'six' : l === 'intermediate' ? 'season' : 'half';
}

/** Beginner's turning points, one a season in this order (owner: "turning point recommendation is
 * good"): each teaches one thing: the risk tag (finals week), fame (a viral clip), a role and the
 * coach's trust (a starter goes down), form (on fire), injury risk (a tweaked ankle), mood (a
 * slump), coach trust (the coach notices). When one does not fit his season, the next that fits. */
export const BEGINNER_EVENTS = ['finals', 'viral', 'opportunity', 'hotstreak', 'ankle', 'slump', 'teamFirstNoticed', 'starHurt', 'posterdunk', 'burnout'];

/** The turning points that belong to a system the level leaves out, or to the closing tour. */
export function eventInLevel(s: GameState, id: string): boolean {
  if (!inLevel(s)) return true;
  if (/^(prankWar|mentorThanks|recordCircus|farewellOvation|farewellJersey|anniversary|kidAtGame|newborn|arc-love|arc-protege|duoShootaround|duoLastShot|duoExtension|national-team)$/.test(id)) return false;
  if (/^arc-/.test(id) && !allows(s, 'arcs')) return false;
  if ((/^hire-/.test(id) || id === 'staff-poached') && !allows(s, 'staff')) return false;
  if (/^(coachfired|coachDinner|coachPoached)$/.test(id) && !allows(s, 'coach')) return false;
  if (/^(brand-scandal|shoe-sellout|burgerDeal)$/.test(id) && !allows(s, 'brand')) return false;
  if (id === 'nickname-hate' && !allows(s, 'nickname')) return false;
  if (/^(rivalTalk|rival-talk|rivalFilm|rivalgame)$/.test(id) && !allows(s, 'rival')) return false;
  return true;
}

/** The level's floor: never too far behind the path to an NBA starter (like Shoot for the stars). */
export function levelFloor(s: GameState): { age: number; ovr: number; until: number } | undefined {
  const l = levelOf(s);
  return l ? ROADMAP[l].floor : undefined;
}

/** The level's growth multiplier (1 outside the levels). */
export function levelGrowth(s: GameState): number {
  const l = levelOf(s);
  return l ? ROADMAP[l].growth : 1;
}

/** NBA seasons played, this one included once it has started. */
export const nbaSeasons = (s: GameState): number => s.history.filter((h) => h.level === 'NBA').length;

/** The level's career is over: its NBA seasons are played. */
export function levelDone(s: GameState): boolean {
  const l = levelOf(s);
  return !!l && s.stage === 'NBA' && nbaSeasons(s) >= ROADMAP[l].nbaSeasons;
}

/** Beginner's one playable moment (owner: "one playable last shot in the first NBA playoffs"):
 * the last possession of his first NBA playoff game, kept close; every other game is simulated. */
export const shotDue = (s: GameState): boolean => levelOf(s) === 'beginner' && s.season?.level === 'NBA' && !s.flags.levelShot;

/** The goal: an NBA All-Star team. */
export const madeAllStar = (s: GameState): boolean => s.awards.some((a) => a.key === 'ALLSTAR' && a.level === 'NBA');

/** Contract talks: on every deal in advanced and the full game, on the first NBA deal past the
 * rookie scale in intermediate (flags.nbaDeal is set once he signs one), never in beginner. */
export function talksOpen(s: GameState): boolean {
  return allows(s, 'talks') && (levelOf(s) !== 'intermediate' || !s.flags.nbaDeal);
}

/** The offers a level shows: without the roads abroad, only colleges and NBA teams (then the G
 * League, then anything, so a career is never left with nowhere to play). */
export function roadOffers(s: GameState, offers: Offer[]): Offer[] {
  if (allows(s, 'roads')) return offers;
  for (const keep of [['NCAA', 'NBA'], ['GL']]) {
    const left = offers.filter((o) => keep.includes(o.level));
    if (left.length > 0) return left;
  }
  return offers;
}

/** A decision the level makes for the player (null when it is his). The path is set in the
 * levels: he declares after one college season, takes the first offer where offers are not his to
 * pick, goes down to the G League when sent, and never meets the closing tour's calls. */
export function levelChoice(s: GameState, d: Decision): string | null {
  if (!inLevel(s)) return null;
  const open = d.choices.filter((c) => !c.disabled).map((c) => c.id);
  const has = (id: string) => (open.includes(id) ? id : null);
  switch (d.kind) {
    case 'declare':
      return has('declare') ?? open[0] ?? null;
    case 'withdraw':
      return has('stay') ?? has('keep') ?? open[0] ?? null;
    case 'transfer':
      return has('stay') ?? open[open.length - 1] ?? null;
    case 'assign':
      return has('go') ?? open[0] ?? null;
    case 'national':
    case 'military':
      return has('decline') ?? open[open.length - 1] ?? null;
    case 'summer':
      return levelOf(s) === 'beginner' ? (has('skills') ?? open[0] ?? null) : null;
    case 'retirePrompt':
      return has('go') ?? has('continue') ?? has('keep') ?? open.find((x) => x !== 'retire') ?? null;
    case 'youth':
      return allows(s, 'roads') ? null : (open[0] ?? null);
    case 'offers':
      return allows(s, 'offers') ? null : (open[0] ?? null);
    default:
      return null;
  }
}
