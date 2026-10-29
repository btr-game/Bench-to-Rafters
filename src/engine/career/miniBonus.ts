// Mini-game bonuses (round 11: "if you play a minigame, you can earn bonuses to ratings").
// With a career in progress, finishing a mini-game well gives the career player a small boost.
// Round 12: four claims a season across all mini-games, each worth a little less than the last
// (100%, 75%, 55%, 40%), so it is a treat and not a grind:
// - Three-point contest: shooting (and a little range) by score; the winner gets a little fame.
//   Shooting as your own player counts in full, as a legend half.
// - Legends showdown: basketball IQ by how far the team went.
// - Front Office: basketball IQ and a little playmaking by titles and playoff runs.
// In a lab career the boost is paid as credits, like everything else there.

import { ATTR_MAX } from '../balance';
import { clamp } from '../rng';
import type { AttrKey, GameState } from '../types';
import { NAMES } from '../../content/strings';
import { addCredits, isLab } from './lab';
import { logDecision } from './common';

export type MiniId = 'threes' | 'legends' | 'office' | 'dunk' | 'lab';

export const MINI_CLAIMS = { perSeason: 4, share: [1, 0.75, 0.55, 0.4] };

export type MiniResult =
  | { game: 'threes'; score: number; won: boolean; own: boolean }
  | { game: 'legends'; reached: 'champion' | 'finals' | 'semis' | 'out' }
  | { game: 'office'; titles: number; playoffs: number; seasons: number; fired: boolean }
  | { game: 'dunk'; best: number; won: boolean }
  | { game: 'lab'; peak: number };

/** Claims already made this season. */
export function claimsUsed(s: GameState): number {
  return s.flags.miniYear === s.year ? (s.flags.miniClaims ?? 0) : 0;
}

export function canClaimMini(s: GameState | null, _id?: MiniId): boolean {
  return !!s && s.step !== 'retired' && claimsUsed(s) < MINI_CLAIMS.perSeason;
}

/** What the next claim is worth, as a share of the full reward. */
export const nextShare = (s: GameState): number => MINI_CLAIMS.share[Math.min(claimsUsed(s), MINI_CLAIMS.share.length - 1)];

/** What a result is worth, before it is applied. */
export function miniReward(r: MiniResult): { attrs: Partial<Record<AttrKey, number>>; range?: number; rep?: number } {
  switch (r.game) {
    case 'threes': {
      const base = r.score >= 27 ? 1.5 : r.score >= 23 ? 1 : r.score >= 18 ? 0.6 : r.score >= 13 ? 0.3 : 0;
      const k = r.own ? 1 : 0.5;
      return { attrs: base > 0 ? { SHT: base * k } : {}, range: base >= 1 ? 1 * k : 0, rep: r.won ? 3 : 0 };
    }
    case 'legends': {
      const v = r.reached === 'champion' ? 1 : r.reached === 'finals' ? 0.7 : r.reached === 'semis' ? 0.4 : 0.15;
      return { attrs: { IQ: v } };
    }
    case 'office': {
      if (r.fired) return { attrs: {} };
      const v = Math.min(1, r.titles * 0.6 + (r.playoffs / Math.max(1, r.seasons)) * 0.4);
      return { attrs: { IQ: Math.round(v * 10) / 10, PLY: r.titles > 0 ? 0.4 : 0 } };
    }
    case 'dunk': {
      const v = r.best >= 49 ? 1.5 : r.best >= 45 ? 1 : r.best >= 40 ? 0.6 : r.best >= 35 ? 0.3 : 0;
      return { attrs: v ? { ATH: v, FIN: v / 2 } : {}, rep: r.won ? 3 : 0 };
    }
    case 'lab': {
      const v = r.peak >= 95 ? 1 : r.peak >= 90 ? 0.7 : r.peak >= 85 ? 0.4 : 0.15;
      return { attrs: { IQ: v } };
    }
  }
}

/** The reward scaled by how many claims were already made this season. */
export function scaledReward(s: GameState, r: MiniResult): ReturnType<typeof miniReward> {
  const w = miniReward(r);
  const k = nextShare(s);
  const attrs: Partial<Record<AttrKey, number>> = {};
  for (const [a, v] of Object.entries(w.attrs) as [AttrKey, number][]) if (v) attrs[a] = Math.round(v * k * 10) / 10;
  return { attrs, range: w.range ? Math.round(w.range * k * 10) / 10 : 0, rep: w.rep ? Math.round(w.rep * k) : 0 };
}

/** Applies the bonus to the career. Returns a line for the screen. */
export function claimMini(s: GameState, r: MiniResult): string {
  if (!canClaimMini(s, r.game)) return '';
  const w = scaledReward(s, r);
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
  const text = `${p.name}${isLab(s) ? ' (as lab credits)' : ''}: ${parts.join(', ')}.`;
  logDecision(s, 'minigame', `Mini-game bonus: ${parts.join(', ')}.`);
  s.toast = `Mini-game bonus. ${text}`;
  return text;
}
