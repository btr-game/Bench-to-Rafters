// Round 37 (owner: "a world to walk around instead of menus"): the career's tabs as places on a
// street. His hometown while he is in high school, the campus in college, then the city of the
// team he plays for (or a city abroad). Each place opens what a tab opened: the gym is Home (the
// day's work: plans, the next game, the choice at hand), the arena the Season tab, where he lives
// the Player tab, the hall the Records tab and the arcade the Extras tab. Once he is a pro, an
// agent's office opens the Player tab at his contract and money. Pure: what the street holds is
// decided here; ui/components/Town.tsx walks it and ui/art/TownArt.tsx draws it.

import type { GameState } from '../engine/types';
import { hallOfFame } from '../engine/awards/legacy';
import { HOUSE_BANK, carOut, hoopHome, statueUp, streetLook, upHere, type StreetLook } from '../engine/career/street';
import { team as teamOf } from './selectors';
import { levelTabs } from './road';
import { ARENA_W, MARK_W, NBA_ARENAS } from './arenas';
import type { Tab } from '../store';

export type TownLook = StreetLook;
export type PlaceKind = 'gym' | 'arena' | 'house' | 'agent' | 'hall' | 'arcade';
/** Where he lives, which grows with the bank in a pro city. */
export type HouseTier = 'family' | 'dorm' | 'flat' | 'house' | 'mansion';

export interface Place {
  id: PlaceKind;
  tab: Tab;
  name: string;
  /** a card to bring into view once the tab is open (the agent's office: the contract) */
  spot?: string;
}

export interface Town {
  look: TownLook;
  /** the town or city, for the street sign */
  name: string;
  /** his team's colour, for the arena and the flags along the street */
  color: string;
  /** his team's name (a college's or a club's arena is built from it) and, in the NBA, its abbreviation */
  club: string;
  abbr?: string;
  /** his high school, which stands in the hometown */
  school: string;
  /** what his career has put on the street: his car outside the house, a hoop at home, his statue
   * outside the arena of the team that hung his jersey */
  car: boolean;
  hoop: boolean;
  statue: boolean;
  /** what his team's city put up for him (round 37's turning points): his mural on the practice
   * facility, with his number, and the street sign with his name */
  mural: number | null;
  sign: boolean;
  house: HouseTier;
  places: Place[];
}

/** The bank (in millions) that moves him out of a flat, then into a mansion. */
export const HOUSE_AT = HOUSE_BANK;

/** Which street he is on: his hometown in high school, the campus in college, then a city (engine/career/street.ts). */
export const townLook = streetLook;

/** The longest sign a place gets (the full name is in its tooltip). */
export const SIGN_MAX = 20;

/** His school on a street sign: "Box Hill Senior Secondary" is Box Hill, "Oak Hill Academy" stays. */
export function schoolSign(name: string): string {
  if (!name) return 'High school';
  if (name.length <= SIGN_MAX) return name;
  const bare = name.replace(/\s+(Senior Secondary( College| School)?|Secondary( College| School)?|High School|College|School|Collegiate|Institute)$/i, '').trim();
  if (bare.length <= SIGN_MAX) return bare;
  const words = bare.split(/\s+/);
  let out = words[0];
  for (const w of words.slice(1)) {
    if ((out + ' ' + w).length > SIGN_MAX) break;
    out += ' ' + w;
  }
  return out.slice(0, SIGN_MAX);
}

/** The first part of a place name: "Akron, OH" is Akron. */
const short = (s: string) => s.split(',')[0].trim();

/** Where he lives: the family house, a dorm, then a flat, a house or a mansion as the bank grows. */
export function houseOf(g: GameState, look: TownLook): HouseTier {
  if (look === 'hometown') return 'family';
  if (look === 'campus') return 'dorm';
  const bank = g.player.bank;
  return bank >= HOUSE_AT.mansion ? 'mansion' : bank >= HOUSE_AT.house ? 'house' : 'flat';
}

const HOUSE_NAME: Record<HouseTier, string> = { family: 'Family house', dorm: 'Dorm', flat: 'Apartment', house: 'House', mansion: 'Mansion' };

/** The street for this moment of the career. */
export function townOf(g: GameState): Town {
  const look = townLook(g);
  const t = teamOf(g);
  const pro = look === 'city' || look === 'abroad';
  const house = houseOf(g, look);
  const hof = g.stage === 'RETIRED' && !!hallOfFame(g);
  const names: Record<PlaceKind, string> = {
    gym: look === 'hometown' ? 'Rec center' : look === 'campus' ? 'Practice gym' : 'Practice facility',
    arena: look === 'hometown' ? schoolSign(g.player.highSchool) : t ? `${t.short} arena` : look === 'campus' ? 'Campus arena' : 'The arena',
    house: HOUSE_NAME[house],
    agent: 'Agent’s office',
    hall: look === 'hometown' ? 'The diner' : look === 'campus' ? 'Athletics hall' : hof ? 'Hall of Fame' : 'Sports museum',
    arcade: 'Arcade',
  };
  const all: Place[] = [
    { id: 'gym', tab: 'home', name: names.gym },
    { id: 'arena', tab: 'season', name: names.arena },
    { id: 'house', tab: 'player', name: names.house },
    ...(pro ? [{ id: 'agent' as const, tab: 'player' as const, name: names.agent, spot: 'contract' }] : []),
    { id: 'hall', tab: 'records', name: names.hall },
    { id: 'arcade', tab: 'extras', name: names.arcade },
  ];
  // a tutorial level opens only some tabs (ui/road.ts levelTabs), so only their places stand
  const open = levelTabs(g) as Tab[] | null;
  const places = open ? all.filter((p) => open.includes(p.tab) && p.id !== 'agent') : all;
  const name = look === 'hometown' ? short(g.player.hometown) : look === 'campus' ? t?.short ?? 'Campus' : t?.short ?? short(g.player.hometown);
  const abbr = g.stage === 'NBA' || (g.stage === 'RETIRED' && g.history[g.history.length - 1]?.level === 'NBA') ? t?.abbr : undefined;
  const city = look === 'city';
  return { look, name, color: t?.color ?? '#1C7ED6', club: t?.name ?? name, abbr: abbr && NBA_ARENAS[abbr] ? abbr : undefined, school: g.player.highSchool, house, places, car: carOut(g), hoop: hoopHome(g), statue: statueUp(g), mural: city && upHere(g, g.flags.mural) ? g.player.number : null, sign: city && upHere(g, g.flags.streetName) };
}

/** The place a tab belongs to (the agent's office only when it was the last one entered). */
export function placeFor(town: Town, tab: Tab, last: PlaceKind | null): Place | null {
  const lastPlace = town.places.find((p) => p.id === last);
  if (lastPlace && lastPlace.tab === tab) return lastPlace;
  return town.places.find((p) => p.tab === tab && !p.spot) ?? town.places.find((p) => p.tab === tab) ?? null;
}

// ---------- the street's layout, in the art's own pixels ----------

/** The street's height and where the ground is (the art draws everything on this grid). */
export const STREET = { h: 40, ground: 32, gap: 10, margin: 14 };

/** How wide each building stands. */
export function widthOf(id: PlaceKind, town: Town): number {
  switch (id) {
    case 'arena':
      return town.look === 'hometown' ? 70 : town.abbr ? ARENA_W + MARK_W : 72;
    case 'house':
      return town.house === 'mansion' ? 62 : town.house === 'flat' ? 36 : town.house === 'dorm' ? 46 : town.house === 'house' ? 50 : 44;
    case 'agent':
      return 36;
    case 'hall':
      return town.look === 'hometown' ? 48 : 56;
    case 'arcade':
      return 44;
    default:
      return 52;
  }
}

/** Where the door is across a building: the middle, but an NBA arena's own middle, beside its landmark. */
function doorAt(id: PlaceKind, town: Town, w: number): number {
  if (id !== 'arena' || !town.abbr) return Math.round(w / 2);
  return (NBA_ARENAS[town.abbr].side === 'l' ? MARK_W : 0) + Math.round(ARENA_W / 2);
}

export interface Slot {
  place: Place;
  x: number;
  w: number;
  /** where he stands to go in: the middle of the door */
  door: number;
}

/** Each building's place along the street, left to right in the tabs' order, and the street's
 * width. `pad` widens the street on both sides (a wide screen: the road runs edge to edge). */
export function layoutOf(town: Town, pad = 0): { w: number; slots: Slot[] } {
  let x = STREET.margin + pad;
  const slots = town.places.map((place) => {
    const w = widthOf(place.id, town);
    const slot = { place, x, w, door: x + doorAt(place.id, town, w) };
    x += w + STREET.gap;
    return slot;
  });
  return { w: x - STREET.gap + STREET.margin + pad, slots };
}
