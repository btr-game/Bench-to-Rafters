// The main land (round 37, owner: "can we make the main home page a map as well? let's do it this
// way: once the user completes the first tutorial beginner level, they can take a plane to the
// "main land". in the main land, there's buildings/islands/areas/... where the user can access the
// main contents"). The start page's first step is a pixel town along one avenue: a venue for each
// difficulty, his house while a career is going, the library (the career log), the trophy museum
// (the achievement book), the statue plaza (the community), the park (Play with friends), the
// newsstand (What's new), the cinema (the intro), the airport back to the road map, the island
// of mini-games across the water, (round 38) the old neighbourhood on the island to the north,
// where story mode starts, and (round 42) the arena on a third island to the east: the Floor, a
// game of its own now (the map grew 34 pixels east for it). This file says where each place
// stands, which are open, how the arrow keys move between them, the boat's crossings, and the
// flight that brings him there; the page draws them (screens/MainLand.tsx, art/LandArt.tsx,
// screens/Plane.tsx).

import type { Mode } from '../engine/balance';
import { modeOpen, unlocked, type Road } from './road';

export type LandId = 'airport' | 'cinema' | 'gym' | 'cage' | 'dome' | 'house' | 'park' | 'library' | 'news' | 'plaza' | 'museum' | 'island' | 'story' | 'floor';

interface LandPlace {
  id: LandId;
  /** The place to click on the map: x, y, w, h on its grid (LAND_W by LAND_H). */
  box: [number, number, number, number];
  /** Where on the avenue the car stops for it (the islands' stop is the dock). */
  stop: number;
  /** Which side of the avenue it stands on: its plate hangs on the avenue's side (the arena, level
   * with the avenue, hangs its plate at its foot, as the row above does). */
  row: 'top' | 'bottom';
  /** The place itself ("The gym"), the word on its plate ("Regular guy") and its icon. */
  name: string;
  plate: string;
  icon: string;
}

export const LAND_W = 258;
export const LAND_H = 100;
/** The avenue's middle row; the car drives along it. */
export const AVENUE = 52;
/** The avenue's two ends: the airport's side and the dock. */
export const AVENUE_X: [number, number] = [2, 168];

// in the order Tab reaches them: the row above the avenue, west to east, then the row below, then
// the three islands across the water. The cinema and the newsstand are 24 wide (22 before the map
// grew): on a phone's narrower map every place is still 32 px to tap.
export const LAND: LandPlace[] = [
  { id: 'airport', box: [2, 2, 40, 44], stop: 17, row: 'top', name: 'The airport', plate: 'Road map', icon: 'jet' },
  { id: 'cinema', box: [43, 12, 24, 34], stop: 55, row: 'top', name: 'The cinema', plate: 'Intro', icon: 'camera' },
  { id: 'gym', box: [68, 8, 30, 38], stop: 83, row: 'top', name: 'The gym', plate: 'Regular guy', icon: 'regular' },
  { id: 'cage', box: [100, 8, 30, 38], stop: 115, row: 'top', name: 'The cage', plate: 'Reality hits hard', icon: 'reality' },
  { id: 'dome', box: [132, 2, 38, 44], stop: 151, row: 'top', name: 'The dome', plate: 'Shoot for the stars', icon: 'stars' },
  { id: 'house', box: [2, 58, 24, 40], stop: 14, row: 'bottom', name: 'His house', plate: 'Continue', icon: 'house' },
  { id: 'park', box: [28, 58, 28, 40], stop: 42, row: 'bottom', name: 'The park', plate: 'Play with friends', icon: 'versus' },
  { id: 'library', box: [58, 58, 28, 40], stop: 72, row: 'bottom', name: 'The library', plate: 'Career log', icon: 'cards' },
  { id: 'news', box: [87, 58, 24, 40], stop: 99, row: 'bottom', name: 'The newsstand', plate: 'What’s new', icon: 'news' },
  { id: 'plaza', box: [112, 58, 30, 40], stop: 127, row: 'bottom', name: 'The statue plaza', plate: 'Community', icon: 'statue' },
  { id: 'museum', box: [144, 58, 26, 40], stop: 157, row: 'bottom', name: 'The trophy museum', plate: 'Achievements', icon: 'laurel' },
  { id: 'island', box: [184, 62, 38, 30], stop: 166, row: 'bottom', name: 'The island', plate: 'Mini-games', icon: 'controller' },
  { id: 'story', box: [184, 4, 38, 36], stop: 166, row: 'top', name: 'The old neighbourhood', plate: 'Story mode', icon: 'story' },
  { id: 'floor', box: [222, 33, 34, 35], stop: 166, row: 'top', name: 'The arena', plate: 'The Floor', icon: 'floor' },
];

/** The places across the water: the car stops at the dock and the boat takes him over. Each is the
 * boat's crossing from its mooring, in map pixels east and south: up to the old neighbourhood,
 * down to the island, straight out to the arena's jetty. */
export const ISLANDS: Partial<Record<LandId, [number, number]>> = { island: [8, 9], story: [8, -10], floor: [20, 0] };
/** Where the boat lies at the dock (its sprite's top-left corner). */
export const MOORING: [number, number] = [186, 51];

/** The boat: the island it is out toward (or coming back from) and how many steps out it is. */
export interface Boat {
  isle: LandId | null;
  k: number;
}

/** A crossing's length in steps: a pixel at a time along its longer side. */
const crossing = (id: LandId | null): number => Math.max(...(id ? ISLANDS[id] ?? [0] : [0]).map(Math.abs));

/** The boat at the end of its way: tied up at an island, or (null) at the dock. */
export const berth = (to: LandId | null): Boat => ({ isle: to, k: crossing(to) });

/** The boat a step on toward an island (null: the dock); the same boat once it is there. It comes
 * back to the dock before it sets out for another island. */
export function sailStep(boat: Boat, to: LandId | null): Boat {
  if (boat.k > 0 && boat.isle !== to) return { isle: boat.isle, k: boat.k - 1 };
  if (!to || (boat.isle === to && boat.k >= crossing(to))) return boat;
  return { isle: to, k: boat.k + 1 };
}

/** Where the boat is drawn (its sprite's top-left corner). */
export function boatAt({ isle, k }: Boat): [number, number] {
  const [dx, dy] = (isle && ISLANDS[isle]) || [0, 0];
  const n = Math.max(1, crossing(isle));
  return [MOORING[0] + Math.round((dx * k) / n), MOORING[1] + Math.round((dy * k) / n)];
}

/** The three difficulties, each a venue of its own. */
export const LAND_MODE: Partial<Record<LandId, Mode>> = { gym: 'standard', cage: 'reality', dome: 'stars' };

/** The places standing: his house only while a career is going (a save not yet retired). */
export const landPlaces = (career: boolean): LandPlace[] => LAND.filter((p) => p.id !== 'house' || career);

export type LandState = 'open' | 'locked' | 'next';

/** A place's state, for its plate: a difficulty or the island still shut by the road map, the gym
 * suggested right after graduation, or open. */
export function landState(road: Road, id: LandId, recommend = false): LandState {
  if (id === 'cage') return modeOpen(road, 'reality') ? 'open' : 'locked';
  if (id === 'dome') return modeOpen(road, 'stars') ? 'open' : 'locked';
  if (id === 'island') return unlocked(road, 'minis') ? 'open' : 'locked';
  return id === 'gym' && recommend ? 'next' : 'open';
}

const centre = (p: LandPlace): [number, number] => [p.box[0] + p.box[2] / 2, p.box[1] + p.box[3] / 2];

/** The side a place's card pops out on: the one with more of the map. */
export const landSide = (p: LandPlace): 'left' | 'right' => (centre(p)[0] < LAND_W / 2 ? 'right' : 'left');

export type LandDir = 'left' | 'right' | 'up' | 'down';

/** The place an arrow key moves to: the nearest one that way (within a wide cone, so Left at the
 * airport stays put rather than dropping to his house), a step across counting double, or none at
 * the edge of the map. */
export function neighbour(places: LandPlace[], from: LandId, dir: LandDir): LandId | null {
  const a = places.find((p) => p.id === from);
  if (!a) return places[0]?.id ?? null;
  const [ax, ay] = centre(a);
  let best: LandId | null = null;
  let score = Infinity;
  for (const p of places) {
    if (p.id === from) continue;
    const [x, y] = centre(p);
    const along = dir === 'right' ? x - ax : dir === 'left' ? ax - x : dir === 'down' ? y - ay : ay - y;
    const across = dir === 'left' || dir === 'right' ? Math.abs(y - ay) : Math.abs(x - ax);
    if (along <= 0 || across > along * 2) continue;
    const s = along + across * 2;
    if (s < score) {
      score = s;
      best = p.id;
    }
  }
  return best;
}

/** Where the main land opens: the gym right after graduation, else his house when a career is
 * going, else the gym. */
export const firstLand = (career: boolean, recommend: boolean): LandId => (career && !recommend ? 'house' : 'gym');

/** The player's device asks for less motion (the map's car jumps, the flight is skipped). */
export const reducedMotion = (): boolean => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- the flight from the road map (graduation), once per device ----

const PLANE = 'btr-plane-seen';

export function planeSeen(): boolean {
  try {
    return localStorage.getItem(PLANE) === '1';
  } catch {
    return false;
  }
}

export function markPlaneSeen(): void {
  try {
    localStorage.setItem(PLANE, '1');
  } catch {
    /* it flies once more next time: no harm */
  }
}

/** Whether the flight plays: once per device and never with reduced motion. The dev deck always
 * shows it (with reduced motion, as a still), so it can be looked at. */
export const planeDue = (reduced: boolean, dev = false): boolean => dev || (!reduced && !planeSeen());

/** The flight's length in seconds, and its frames a second (the plane moves in steps). */
export const FLIGHT_SECS = 5;
export const FLIGHT_FPS = 12;
/** The flight's strip: the road map's island on the left, the sea, the main land on the right; a
 * wide screen shows a 160-wide window of it, following the plane. */
export const FLIGHT_W = 320;
export const FLIGHT_H = 90;
export const FLIGHT_VIEW = 160;
/** Where the two runways start and end, and the row the wheels run on. */
export const STRIP = { away: [36, 92], home: [258, 318], wheels: 64 } as const;

type Leg = 'away' | 'sea' | 'land';

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));

/** Where a window `view` wide on the strip starts, to keep the plane a little left of its middle. */
export const camAt = (x: number, view: number): number => Math.round(Math.min(FLIGHT_W - view, Math.max(0, x + 10 - view * 0.44)));

/** The plane at a point of the flight (0 to 1): its top-left on the strip (it is 20 by 7), its tilt,
 * and which part of the flight it is. */
export function flightAt(p: number): { x: number; y: number; tilt: -1 | 0 | 1; leg: Leg } {
  const t = Math.min(1, Math.max(0, p));
  const ground = STRIP.wheels - 6;
  const cruise = 20;
  let x: number;
  let y: number;
  let tilt: -1 | 0 | 1 = 0;
  if (t < 0.14) {
    x = lerp(40, 70, t / 0.14);
    y = ground;
  } else if (t < 0.34) {
    const k = (t - 0.14) / 0.2;
    x = lerp(70, 140, k);
    y = lerp(ground, cruise, k);
    tilt = -1;
  } else if (t < 0.72) {
    x = lerp(140, 232, (t - 0.34) / 0.38);
    y = cruise + (Math.floor(t * 40) % 2);
  } else if (t < 0.92) {
    const k = (t - 0.72) / 0.2;
    x = lerp(232, 276, k);
    y = lerp(cruise, ground, k);
    tilt = 1;
  } else {
    x = lerp(276, 292, (t - 0.92) / 0.08);
    y = ground;
  }
  return { x: Math.round(x), y: Math.round(y), tilt, leg: t < 0.3 ? 'away' : t < 0.7 ? 'sea' : 'land' };
}
