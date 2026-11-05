// Mini-game bonuses (round 11: "if you play a minigame, you can earn bonuses to ratings").
// With a career in progress, finishing a mini-game well gives the career player a small boost.
// Round 12: four claims a season across all mini-games, each worth a little less than the last
// (100%, 75%, 55%, 40%), so it is a treat and not a grind:
// - Three-point contest: shooting (and a little range) by score; the winner gets a little fame.
//   Shooting as your own player counts in full, as a legend half.
// - Legends showdown: basketball IQ by how far the team went.
// - The Floor (round 39, in Front Office's place): basketball IQ and a little playmaking by grade.
// - 3-on-3 streetball (round 22): finishing and a little athleticism by how far he went.
// In a lab career the boost is paid as credits, like everything else there.

import { ATTR_MAX, FLOOR_MINI, modeDial } from '../balance';
import { clamp } from '../rng';
import type { AttrKey, GameState } from '../types';
import { NAMES } from '../../content/strings';
import { addCredits, isLab } from './lab';
import { logDecision, userOvr } from './common';
import type { FloorGrade, FloorStrength } from '../floor/mini';

export type MiniId = 'threes' | 'legends' | 'floor' | 'dunk' | 'lab' | 'street' | 'rhythm';

export const MINI_CLAIMS = { perSeason: 2, share: [1, 0.5] };

/**
 * Round 15: in a career, each mini-game opens once his ratings earn it, and stays open after
 * that (aging does not lock it again). From the start page every game is free to play.
 * Rewards are larger (x1.6) to match.
 */
const MINI_UNLOCK: Record<MiniId, { key: AttrKey | 'OVR' | 'DEF'; at: number; label: string }> = {
  threes: { key: 'SHT', at: 85, label: 'Shooting' },
  dunk: { key: 'ATH', at: 85, label: 'Athleticism' },
  // round 39: the Floor opens where Front Office did
  floor: { key: 'IQ', at: 85, label: 'Basketball IQ' },
  lab: { key: 'OVR', at: 82, label: 'OVR' },
  legends: { key: 'OVR', at: 90, label: 'OVR' },
  street: { key: 'FIN', at: 82, label: 'Finishing' },
  // round 24: Lockdown opens for a good defender, on the perimeter or inside
  rhythm: { key: 'DEF', at: 82, label: 'Perimeter or interior D' },
};
export const MINI_REWARD_MULT = 1.6;

/** His value toward a game's unlock, and whether it is open. */
export function miniProgress(s: GameState, id: MiniId): { value: number; at: number; label: string; open: boolean } {
  const u = MINI_UNLOCK[id];
  const value = u.key === 'OVR' ? userOvr(s) : u.key === 'DEF' ? Math.max(s.player.attrs.PER, s.player.attrs.INT) : s.player.attrs[u.key];
  return { value, at: u.at, label: u.label, open: (s.miniOpen ?? []).includes(id) || value >= u.at };
}

/** Records games that just opened; returns their names (flow.ts calls it after every action). */
export function syncMiniUnlocks(s: GameState): string[] {
  const fresh: string[] = [];
  for (const id of Object.keys(MINI_UNLOCK) as MiniId[]) {
    if ((s.miniOpen ?? []).includes(id)) continue;
    if (miniProgress(s, id).open) {
      s.miniOpen = [...(s.miniOpen ?? []), id];
      fresh.push(MINI_NAMES[id]);
    }
  }
  if (fresh.length && s.history.length > 0) s.toast = `Mini-game unlocked: ${fresh.join(', ')}. Play it from the Extras tab for a career bonus.`;
  return fresh;
}

export const MINI_NAMES: Record<MiniId, string> = { threes: 'Three-point contest', dunk: 'Dunk contest', floor: 'The Floor', lab: 'Built in a lab', legends: 'Legends showdown', street: '3-on-3 streetball', rhythm: 'Lockdown' };

/**
 * Round 39: Front Office is archived and the Floor takes its place, so a career saved before reads
 * its 'office' (the game it unlocked, the bonuses it claimed) as 'floor'. Called on every career
 * that comes back from storage or a code.
 */
export function floorForOffice(s: GameState): void {
  const was = (id: string): MiniId => (id === 'office' ? 'floor' : (id as MiniId));
  if (s.miniOpen) s.miniOpen = [...new Set(s.miniOpen.map(was))];
  for (const c of s.miniLog ?? []) c.game = was(c.game);
}

export type MiniResult =
  | { game: 'threes'; score: number; won: boolean; own: boolean }
  | { game: 'legends'; reached: 'champion' | 'finals' | 'semis' | 'out' }
  // the margin, his points, the lowest the margin went, and the strength ('team': his own NBA team)
  | { game: 'floor'; grade: FloorGrade; margin: number; pts: number; low: number; strength: FloorStrength | 'team' }
  | { game: 'dunk'; best: number; won: boolean }
  | { game: 'lab'; peak: number }
  | { game: 'street'; reached: 'rout' | 'win' | 'close' | 'out' }
  | { game: 'rhythm'; grade: 'S' | 'A' | 'B' | 'C' | 'D' };

/** Claims already made this season. */
export function claimsUsed(s: GameState): number {
  return s.flags.miniYear === s.year ? (s.flags.miniClaims ?? 0) : 0;
}

export function canClaimMini(s: GameState | null, id?: MiniId): boolean {
  // round 35: a career with friends takes no arcade bonus, so time spent on the mini-games buys
  // nobody in the class or challenge a rating the others did not get
  return !!s && s.step !== 'retired' && !s.flags.friends && claimsUsed(s) < MINI_CLAIMS.perSeason && (!id || miniProgress(s, id).open);
}

/** What the next claim is worth, as a share of the full reward. */
const nextShare = (s: GameState): number => MINI_CLAIMS.share[Math.min(claimsUsed(s), MINI_CLAIMS.share.length - 1)];

/**
 * What a result is worth, before it is applied. Round 12c ("the rewards are too weak; they take
 * time, so players won't do them often"): about three times the round 10 amounts and spread over
 * two ratings, so a top result is worth about 1 OVR for a player who fits it.
 */
export function miniReward(r: MiniResult): { attrs: Partial<Record<AttrKey, number>>; range?: number; rep?: number } {
  switch (r.game) {
    case 'threes': {
      const base = r.score >= 27 ? 4 : r.score >= 23 ? 3 : r.score >= 18 ? 2 : r.score >= 13 ? 1 : 0;
      const k = r.own ? 1 : 0.5;
      return { attrs: base > 0 ? { SHT: base * k, IQ: (base / 4) * k } : {}, range: base >= 2 ? (base - 1) * k : 0, rep: r.won ? 5 : 0 };
    }
    case 'legends': {
      const v = r.reached === 'champion' ? 3 : r.reached === 'finals' ? 2 : r.reached === 'semis' ? 1.2 : 0.5;
      return { attrs: { IQ: v, PLY: v / 2 } };
    }
    case 'floor':
      // round 39: Front Office's bonus, by grade
      return { attrs: { ...FLOOR_MINI.reward[r.grade] } };
    case 'dunk': {
      const v = r.best >= 48 ? 4 : r.best >= 44 ? 3 : r.best >= 40 ? 2 : r.best >= 35 ? 1 : 0;
      return { attrs: v ? { ATH: v, FIN: v / 2 } : {}, rep: r.won ? 5 : 0 };
    }
    case 'lab': {
      const v = r.peak >= 95 ? 3 : r.peak >= 90 ? 2 : r.peak >= 85 ? 1.2 : 0.5;
      return { attrs: { IQ: v, PER: v / 2 } };
    }
    case 'street': {
      // round 22: streetball is mostly a finishing workout (round 24: one game, same rewards)
      const v = r.reached === 'rout' ? 4 : r.reached === 'win' ? 2.5 : r.reached === 'close' ? 1.2 : 0;
      return { attrs: v ? { FIN: v, ATH: v / 4 } : {}, rep: r.reached === 'rout' ? 3 : 0 };
    }
    case 'rhythm': {
      // round 24: Lockdown is a defense workout, perimeter and interior alike
      const v = r.grade === 'S' ? 4 : r.grade === 'A' ? 2.5 : r.grade === 'B' ? 1.2 : r.grade === 'C' ? 0.5 : 0;
      return { attrs: v ? { PER: v * 0.6, INT: v * 0.6 } : {}, rep: r.grade === 'S' ? 2 : 0 };
    }
  }
}

/** Bonuses taper on ratings that are already elite, so mini-games are no shortcut to 99. */
// round 15: the unlocks already ask for 85+, so the taper starts higher
const MINI_TAPER: [number, number][] = [
  [95, 0.45],
  [90, 0.7],
];
export const taperAt = (rating: number): number => MINI_TAPER.find(([from]) => rating >= from)?.[1] ?? 1;

/** The reward scaled by how many claims were already made this season, and tapered near the top. */
export function scaledReward(s: GameState, r: MiniResult): ReturnType<typeof miniReward> {
  const w = miniReward(r);
  const k = nextShare(s) * modeDial(s.mode, 'mini') * MINI_REWARD_MULT;
  const attrs: Partial<Record<AttrKey, number>> = {};
  // bigs turn the playmaking and perimeter part into what counts for them
  const big = s.player.pos === 'PF' || s.player.pos === 'C';
  // (Lockdown's perimeter defense stays perimeter defense: it is a defense game for everyone)
  const to = (a: AttrKey): AttrKey => (r.game === 'rhythm' ? a : big && a === 'PLY' ? 'INT' : big && a === 'PER' ? 'REB' : a);
  for (const [a0, v] of Object.entries(w.attrs) as [AttrKey, number][]) {
    const a = to(a0);
    if (v) attrs[a] = Math.round(((attrs[a] ?? 0) + v * k * (isLab(s) ? 1 : taperAt(s.player.attrs[a]))) * 10) / 10;
  }
  return { attrs, range: w.range ? Math.round(w.range * k * 10) / 10 : 0, rep: w.rep ? Math.round(w.rep * nextShare(s)) : 0 };
}

/** Applies the bonus to the career. Returns a line for the screen. */
export function claimMini(s: GameState, r: MiniResult): string {
  if (!canClaimMini(s, r.game)) return '';
  const w = scaledReward(s, r);
  const before = userOvr(s);
  s.flags.miniClaims = claimsUsed(s) + 1;
  s.flags.miniYear = s.year;
  const p = s.player;
  const parts: string[] = [];
  let credits = 0;
  for (const [k, v] of Object.entries(w.attrs) as [AttrKey, number][]) {
    if (!v) continue;
    if (isLab(s)) credits += v;
    else p.attrs[k] = clamp(p.attrs[k] + v, 15, ATTR_MAX);
    parts.push(`${NAMES.attr[k]} +${v.toFixed(1)}`);
  }
  if (credits > 0) addCredits(p, credits);
  if (w.range) {
    p.range = clamp(p.range + w.range, 0, 99);
    parts.push(`Range +${w.range.toFixed(1)}`);
  }
  if (w.rep) {
    p.rep = clamp(p.rep + w.rep, 0, 100);
    parts.push(`Reputation +${w.rep}`);
  }
  if (parts.length === 0) return 'No bonus this time. Do better and try again next season.';
  // round 27: what it did for the career, for the mini-game achievements
  (s.miniLog ??= []).push({ game: r.game, year: s.year, gain: Math.round((userOvr(s) - before) * 100) / 100, ...(w.range ? { range: w.range } : {}) });
  const text = `${p.name}${isLab(s) ? ' (as lab credits)' : ''}: ${parts.join(', ')}.`;
  logDecision(s, 'minigame', `Mini-game bonus: ${parts.join(', ')}.`);
  s.toast = `Mini-game bonus. ${text}`;
  return text;
}
