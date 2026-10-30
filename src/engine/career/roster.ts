// The roster around him (round 24, owner: "show a roster of the user's team in the player tab.
// The other players are just randoms, but make them determine the team chemistry a bit"). Every
// roster player gets ratings from his archetype and OVR, and the team's average profile (the
// starting five, him included, counting three times the bench) adds a chemistry line:
// - balanced: the profile is well spread, nothing missing;
// - or built for the system: the profile peaks where the team's system wants it (a defensive
//   team with good perimeter and interior defense). The better of the two counts.
// - depth: a bench of above-average bench players.
// Every team has a system: its coach's, or the style he set (career/identity.ts) once he can.

import { ATTRS, ROSTER_FIT as R, modeDial } from '../balance';
import { clamp } from '../rng';
import { ARCHETYPES } from '../player/archetypes';
import { ovrOf } from '../player/ovr';
import type { Attrs, GameState, GenPlayer, League, Pos, Team } from '../types';
import { currentStyle, TEAM_STYLES, type TeamStyle } from './identity';

// position groups for the five (round 12: "I can't have four forwards")
const GROUP: Record<Pos, 'G' | 'F' | 'C'> = { PG: 'G', SG: 'G', SF: 'F', PF: 'F', C: 'C' };
const POS_ORDER: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

/** A small fixed wobble per player and rating, so two players of one archetype differ. */
const jitter = (id: number, i: number): number => {
  let h = (id * 2654435761 + i * 40503) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  return ((h >>> 8) % 2001) / 1000 - 1;
};

/** A roster player's ratings: his archetype's leanings around his OVR, which they still add up to. */
export function rosterAttrs(p: GenPlayer): Attrs {
  const t = (ARCHETYPES[p.pos][p.shape] ?? ARCHETYPES[p.pos][0]).attrs;
  const mean = ATTRS.reduce((a, k) => a + t[k], 0) / ATTRS.length;
  const raw = Object.fromEntries(ATTRS.map((k, i) => [k, p.ovr + (t[k] - mean) * R.spread + jitter(p.id, i) * R.noise])) as Attrs;
  const shift = p.ovr - ovrOf(raw, p.pos);
  return Object.fromEntries(ATTRS.map((k) => [k, clamp(Math.round(raw[k] + shift), 25, 99)])) as Attrs;
}

/**
 * The four who start next to him (round 15: one per position): the best teammate at each other
 * position, else the best of the same group (guards, forwards, bigs), else anyone.
 */
export function fiveOf(roster: GenPlayer[], myPos: Pos): { slot: Pos; p: GenPlayer }[] {
  const left = [...roster].sort((a, b) => b.ovr - a.ovr);
  const take = (ok: (x: GenPlayer) => boolean): GenPlayer | null => {
    const i = left.findIndex(ok);
    return i < 0 ? null : left.splice(i, 1)[0];
  };
  const out: { slot: Pos; p: GenPlayer }[] = [];
  // exact positions first, so a guard is not used up as someone else's stand-in
  for (const slot of POS_ORDER) {
    if (slot === myPos) continue;
    const p = take((x) => x.pos === slot);
    if (p) out.push({ slot, p });
  }
  for (const slot of POS_ORDER) {
    if (slot === myPos || out.some((x) => x.slot === slot)) continue;
    const p = take((x) => GROUP[x.pos] === GROUP[slot]) ?? take(() => true);
    if (p) out.push({ slot, p });
  }
  return out.sort((a, b) => POS_ORDER.indexOf(a.slot) - POS_ORDER.indexOf(b.slot));
}

/** The rotation after the five. */
export function benchOf(roster: GenPlayer[], five: GenPlayer[]): GenPlayer[] {
  return roster.filter((p) => !five.includes(p)).sort((a, b) => b.ovr - a.ovr);
}

const SYSTEMS: TeamStyle[] = ['pace', 'defense', 'motion', 'inside'];

/** How the team plays: the style he set (unless it is just "through you"), else its coach's system. */
export function teamSystem(s: GameState, team: Team): { key: TeamStyle; his: boolean } {
  const set = s.teamId === team.id ? currentStyle(s) : null;
  if (set && set !== 'star') return { key: set, his: true };
  let h = 7;
  for (const c of team.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { key: SYSTEMS[h % SYSTEMS.length], his: false };
}

export interface RosterFit {
  system: TeamStyle;
  his: boolean; // the system is the style he set
  profile: Attrs; // the team's weighted average ratings
  spread: number; // how uneven the profile is (rating points)
  balance: number; // -1 lopsided .. +1 well spread
  identity: number; // -1 against the system .. +1 built for it
  depth: number; // -1 thin .. +1 deep
  bench: number; // his bench's average OVR
  usual: number; // the league's usual bench
  bonus: number; // team strength, after the mode's dial
  label: string;
}

const avgOf = (xs: Attrs[]): Attrs => Object.fromEntries(ATTRS.map((k) => [k, xs.reduce((a, x) => a + x[k], 0) / Math.max(1, xs.length)])) as Attrs;
const meanOvr = (xs: GenPlayer[]): number => xs.reduce((a, p) => a + p.ovr, 0) / Math.max(1, xs.length);

/** The bench a team would have around a player at his position: the league's yardstick. */
function usualBench(league: League, myPos: Pos): number {
  const xs = league.teams.map((t) => meanOvr(benchOf(t.roster, fiveOf(t.roster, myPos).map((x) => x.p)).slice(0, R.bench)));
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}

/** How the roster around him fits together, and what it adds to the team's strength. */
export function rosterFit(s: GameState, team: Team, league: League): RosterFit {
  const five = fiveOf(team.roster, s.player.pos).map((x) => x.p);
  const bench = benchOf(team.roster, five).slice(0, R.bench);
  const fiveAvg = avgOf([s.player.attrs, ...five.map(rosterAttrs)]);
  const benchAvg = bench.length ? avgOf(bench.map(rosterAttrs)) : fiveAvg;
  const profile = Object.fromEntries(ATTRS.map((k) => [k, fiveAvg[k] * R.fiveWeight + benchAvg[k] * (1 - R.fiveWeight)])) as Attrs;
  const mean = ATTRS.reduce((a, k) => a + profile[k], 0) / ATTRS.length;
  const spread = Math.sqrt(ATTRS.reduce((a, k) => a + (profile[k] - mean) ** 2, 0) / ATTRS.length);
  const { key, his } = teamSystem(s, team);
  const lean = Object.entries(TEAM_STYLES[key].weights).reduce((a, [k, w]) => a + (profile[k as keyof Attrs] - mean) * (w ?? 0), 0);
  const balance = clamp((R.sdRef - spread) / R.sdK, -1, 1);
  const identity = clamp(lean / R.leanK, -1, 1);
  const benchOvr = meanOvr(bench);
  const usual = usualBench(league, s.player.pos);
  const depth = clamp((benchOvr - usual) / R.depthK, -1, 1);
  const shape = Math.max(balance, identity) - R.shapeMid;
  const dial = Math.max(R.dialMin, modeDial(s.mode, 'teamFx'));
  const bonus = Math.round((shape * R.shape + depth * R.depth) * dial * 10) / 10;
  const best = Math.max(balance, identity);
  const label = best >= 0.5 && depth >= 0 ? 'Great fit' : best + depth * 0.5 >= 0.1 ? 'Good fit' : best + depth * 0.5 >= -0.3 ? 'Okay' : 'Poor fit';
  return { system: key, his, profile, spread, balance, identity, depth, bench: benchOvr, usual, bonus, label };
}
