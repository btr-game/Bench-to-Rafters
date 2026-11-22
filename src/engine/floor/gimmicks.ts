// The Floor's gimmicks (after round 42, the owner's picks from a list): a player on fire, each
// legend's hot spots, the home crowd erupting on a run (owner: "under certain circumstances, make
// the team and fan culture activate in the game. (maybe this becomes the streak thing?)"), famous
// duos, and the rules of an era. Kept here, apart from the engine (sim.ts calls in at a few
// places: the start, a shot's chance, a pass picked off, a strip, a shot landing), so it reads on
// its own. Nothing here draws from the game's random stream: each only moves a chance the engine
// already rolls, so two computers playing a friend game still agree to the last bit. Every number
// is in FLOOR.gimmick and FLOOR.era.

import { FLOOR } from '../balance';
import { clamp } from '../rng';
import type { Pos } from '../types';
import { FAN_CULTURES } from '../career/fanCulture';
import { LEGEND_PAIRS } from '../../content/legendPairs';
import { SPOTS, attackSpot, dist, type Spot, type Zone } from './court';
import type { FloorEvent, FloorRatings, FloorSetup, FloorSpot, FloorState, FloorStyle } from './sim';

export type FloorEra = 'modern' | 'nineties' | 'sixties';
export const ERAS: FloorEra[] = ['modern', 'nineties', 'sixties'];

type Player = FloorState['players'][number];

/** What the gimmicks keep through a game (plain data: a state is copied and compared whole). */
export interface FloorGimmicks {
  era: FloorEra;
  /** The home team, and its fans (their name, kept in English, and how much they lift it, 0 to 1). */
  home: 0 | 1;
  fans: { name: string; k: number };
  /** Each player's hot spots (by index in `players`), and the famous duos among them. */
  spots: FloorSpot[][];
  pairs: [number, number][];
  /** Each player's makes in a row, and his misses since he caught fire (-1: he is not on fire). */
  row: number[];
  fire: number[];
  /** Baskets in a row for each team. */
  scores: [number, number];
  /** The crowd erupting (for whom, until which tick), and whether it already has for this run. */
  crowd: { team: 0 | 1; until: number } | null;
  roared: boolean;
}

const G = FLOOR.gimmick;
const ticks = (n: number) => Math.max(1, Math.round(n / FLOOR.tick));
const flip = (t: 0 | 1): 0 | 1 => (t === 0 ? 1 : 0);

/** A name to a number (which side of the floor he likes), the same on every computer. */
function nameSide(name: string): 'left' | 'right' {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 2 ? 'right' : 'left';
}

/** His hot spots, from how he plays: a shooter's corner and wing (a volume shooter's wing and the
 * top), a big man's block and elbow, anyone else's elbow and wing. A role player has one. */
export function hotSpotsOf(p: { name: string; pos: Pos; r: FloorRatings; st: FloorStyle }): FloorSpot[] {
  const side = nameSide(p.name);
  const far = side === 'left' ? 'right' : 'left';
  const big = p.st.post >= 0.6 || ((p.pos === 'C' || p.pos === 'PF') && p.st.three < 0.3);
  const shooter = p.st.three >= 0.85;
  const spots: FloorSpot[] = big
    ? [`${side}Block`, `${p.r.SHT >= 70 ? side : far}Elbow`]
    : shooter
      ? p.st.three >= 1.4
        ? [`${side}Wing`, 'top']
        : [`${side}Corner`, `${far}Wing`]
      : p.pos === 'PF' || p.pos === 'C'
        ? [`${side}Elbow`, 'highPost']
        : [`${side}Elbow`, `${side}Wing`];
  return p.st.use < 0.8 ? spots.slice(0, 1) : spots;
}

/** The famous duos among these names (indices into the list). */
export function pairsAmong(names: string[]): [number, number][] {
  const out: [number, number][] = [];
  for (const [a, b] of LEGEND_PAIRS) {
    const i = names.indexOf(a);
    const j = names.indexOf(b);
    if (i >= 0 && j >= 0) out.push([i, j]);
  }
  return out;
}

/** A team's fans on the Floor: their name and how much they lift it (FLOOR.gimmick.crowdMin to 1). */
export function fansOf(short: string): { name: string; k: number } {
  const f = FAN_CULTURES[short];
  return { name: f?.name ?? '', k: G.crowdMin + (1 - G.crowdMin) * clamp((f?.crowd ?? 0) / G.crowdFull, 0, 1) };
}

/** The gimmicks at the start of a game (the era also leans every man's threes its way). */
export function startGimmicks(set: FloorSetup, players: Player[]): FloorGimmicks {
  const era = set.era ?? 'modern';
  const home = set.home ?? 0;
  const spots = players.map((p) => (p.style || p.user ? hotSpotsOf({ ...p, st: p.style ?? p.st }) : []));
  const E = FLOOR.era[era];
  if (E.threeUse !== 1) for (const p of players) p.st = { ...p.st, three: p.st.three * E.threeUse };
  const pairs: [number, number][] = [];
  for (const team of [0, 1] as const) {
    const at = players.map((p, i) => (p.team === team ? i : -1)).filter((i) => i >= 0);
    for (const [i, j] of pairsAmong(at.map((i) => players[i].name))) pairs.push([at[i], at[j]]);
  }
  return { era, home, fans: fansOf((home === 0 ? set.us : set.them).short), spots, pairs, row: players.map(() => 0), fire: players.map(() => -1), scores: [0, 0], crowd: null, roared: false };
}

/** The era's rules in this game. */
export const eraOf = (s: FloorState) => FLOOR.era[s.gm?.era ?? 'modern'];
export const onFire = (s: FloorState, i: number): boolean => (s.gm?.fire[i] ?? -1) >= 0;
/** The crowd's team while it is erupting, or null. */
export const crowdFor = (s: FloorState): 0 | 1 | null => (s.gm?.crowd && s.tick < s.gm.crowd.until ? s.gm.crowd.team : null);
const paired = (s: FloorState, a: number, b: number): boolean => !!s.gm?.pairs.some(([i, j]) => (i === a && j === b) || (i === b && j === a));

/** Whether a spot is within reach of one of his hot spots. */
export function onHotSpot(s: FloorState, i: number, at: Spot): boolean {
  const p = s.players[i];
  return (s.gm?.spots[i] ?? []).some((n) => dist(at, attackSpot(p.team, SPOTS[n][0], SPOTS[n][1])) <= G.spotReach);
}

/** What the gimmicks add to a shot's chance: on fire, a hot spot, the crowd, a duo's feed, and
 * the nineties' hand-checking inside. */
export function shotEdge(s: FloorState, p: Player, at: Spot, zone: Zone): number {
  if (!s.gm) return 0;
  const i = s.players.indexOf(p);
  let c = 0;
  if (onFire(s, i)) c += G.fireShot;
  if (onHotSpot(s, i, at)) c += G.hotSpot;
  if (crowdFor(s) === p.team) c += G.crowdShot * s.gm.fans.k;
  const lp = s.lastPass;
  if (lp && lp.by !== i && s.tick - lp.tick <= ticks(G.pairSecs) && s.players[lp.by].team === p.team && paired(s, lp.by, i)) c += G.pair;
  const E = eraOf(s);
  if (E.contest !== 1 && (zone === 'rim' || zone === 'paint')) {
    let d = Infinity;
    for (const q of s.players) if (q.on && q.team !== p.team) d = Math.min(d, dist(q, at));
    c -= (E.contest - 1) * Math.max(0, (FLOOR.contest.within - d) / FLOOR.contest.within) * FLOOR.contest.max;
  }
  return c;
}

/** What the chance a pass is picked off is multiplied by: less between a duo, more with the crowd behind the defender. */
export function pickEdge(s: FloorState, from: number, to: number, by: Player): number {
  return (paired(s, from, to) ? G.pairPick : 1) * stripEdge(s, by);
}

/** What a defender's strips are multiplied by: more with his crowd erupting. */
export function stripEdge(s: FloorState, by: Player): number {
  return s.gm && crowdFor(s) === by.team ? 1 + (G.crowdHands - 1) * s.gm.fans.k : 1;
}

/** A shot has come down (made or missed): his streak, the fire, the baskets in a row, the crowd. */
export function afterShot(s: FloorState, by: number, made: boolean, emit: (e: Omit<FloorEvent, 'tick'>) => void): void {
  const g = s.gm;
  if (!g) return;
  const p = s.players[by];
  if (made) {
    g.row[by]++;
    if (g.fire[by] < 0 && g.row[by] >= G.fireMakes) {
      g.fire[by] = 0;
      emit({ kind: 'fire', team: p.team, by });
    }
    g.scores[p.team]++;
    g.scores[flip(p.team)] = 0;
    // the other team scoring again and again puts his fire out
    if (g.scores[p.team] >= G.fireStops)
      s.players.forEach((q, j) => {
        if (q.team !== p.team) {
          g.fire[j] = -1;
          g.row[j] = 0;
        }
      });
  } else {
    g.row[by] = 0;
    if (g.fire[by] >= 0 && ++g.fire[by] >= G.fireMisses) g.fire[by] = -1;
  }
  // the home crowd erupts on a run (once a run)
  if (s.run.team !== g.home) g.roared = false;
  else if (made && !g.roared && p.team === g.home && (s.run.pts >= G.crowdRun || g.scores[g.home] >= G.crowdScores)) {
    g.roared = true;
    g.crowd = { team: g.home, until: s.tick + ticks(G.crowdSecs) };
    emit({ kind: 'crowd', team: g.home });
  }
}

/** The gimmicks seen from the other end (mirrorFloor): the teams swapped. */
export function mirrorGimmicks(g: FloorGimmicks | undefined): FloorGimmicks | undefined {
  return g && { ...g, home: flip(g.home), scores: [g.scores[1], g.scores[0]], crowd: g.crowd ? { ...g.crowd, team: flip(g.crowd.team) } : null };
}
