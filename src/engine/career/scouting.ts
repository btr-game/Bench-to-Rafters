// The scouting report: what level the player is at now, his projected ceiling, and
// his odds of NBA milestones. The odds curves were fitted to the balance harness
// (peak OVR → share of careers reaching each milestone).

import { clamp, logistic } from '../rng';
import { MODES } from '../balance';
import type { AttrKey, GameState } from '../types';
import { NAMES } from '../../content/strings';
import { ovrOf } from '../player/ovr';
import { expectedOvrAt } from '../player/growth';
import { scoutSd } from '../player/create';

// The OVR scale (playtest round 3): 80 is an All-Star, 85 All-NBA 2nd team, 90 All-NBA 1st
// team, 95 an MVP, 97 the all-time greats. Anything above that is new territory.
export const TIERS: [number, string][] = [
  [98, 'Beyond anyone who has played'],
  [97, 'All-time great'],
  [95, 'MVP level'],
  [90, 'All-NBA 1st team level'],
  [85, 'All-NBA level'],
  [80, 'All-Star level'],
  [74, 'NBA starter'],
  [69, 'NBA rotation player'],
  [65, 'NBA end of bench'],
  [59, 'Pro overseas / G League level'],
  [52, 'College player'],
  [0, 'High school level'],
];

export const tierFor = (ovr: number): string => TIERS.find(([min]) => ovr >= min)![1];

// [center, scale] of the logistic curve in peak OVR, fitted to the balance harness
// (share of careers with that peak that reach each milestone at least once)
// round 15: refit to 450 Regular guy careers after the new OVR weights and the harder Hall of Fame
export const ODDS_CURVES: Record<string, [number, number]> = {
  nba: [64.6, 1.8],
  allStar: [77.7, 1.65],
  allNba: [83.1, 1.35],
  allNba1: [87.0, 2.05],
  hof: [90.1, 1.15],
  mvp: [90.5, 1.15],
};

export interface ScoutReport {
  ovr: number;
  tier: string;
  peakLo: number;
  peakHi: number;
  peakTier: string;
  confidence: 'low' | 'medium' | 'high';
  odds: Record<keyof typeof ODDS_CURVES, number>;
  notes: string[];
  /** Before college or a pro career (round 27): a rough read, shown in broad strokes. */
  early: boolean;
  /** The tiers the range spans, low to high ("NBA rotation player to All-Star level"). */
  peakSpan: string;
}

/**
 * Round 27 (owner: "i still dont like the projected peak system, especially on the earlier
 * career. it either overestimates or kind of spoils the potential of the player. moderate it,
 * especially before college or proper career"). In high school and youth academies the scouts
 * mostly go on what they see on the court: their read of his ceiling counts for half, and the
 * range never gets narrower than this many points either side.
 */
export const EARLY_SCOUT = { seenWeight: 0.5, minSd: 8 };

// Gauss-Hermite style weights for integrating over the ceiling's uncertainty
const NODES = [-2, -1, 0, 1, 2];
const WEIGHTS = [0.06, 0.24, 0.4, 0.24, 0.06];

export function scoutReport(s: GameState): ScoutReport {
  const p = s.player;
  const ovr = ovrOf(p.attrs, p.pos);
  // the visible estimate: the scouts' range when there is one, otherwise a broad guess
  let mid: number;
  let sd: number;
  // what he shows on the court: how far ahead of the curve he is (fitted to the harness)
  const f = MODES[s.mode ?? 'standard'].scout;
  const seen = f.mid + (ovr - expectedOvrAt(f.mid, p.age)) * f.slope;
  const early = s.stage === 'HS';
  if (p.scoutRange) {
    mid = (p.scoutRange[0] + p.scoutRange[1]) / 2;
    sd = scoutSd(p.age) + 1;
    if (early) mid = (1 - EARLY_SCOUT.seenWeight) * mid + EARLY_SCOUT.seenWeight * seen;
  } else {
    // freshman year: only what he shows
    mid = seen;
    sd = f.sd;
  }
  if (early) sd = Math.max(sd, EARLY_SCOUT.minSd);
  // he can't peak below where he is now or above 99; older players are close to their ceiling
  const room = p.age >= 27 ? 1 : p.age >= 24 ? 3 : 99;
  mid = clamp(mid, ovr, Math.min(99, ovr + room));
  const peakHi = Math.round(Math.min(99, mid + sd));
  const peakLo = Math.min(peakHi, Math.round(Math.max(ovr, mid - sd)));
  const odds = {} as ScoutReport['odds'];
  for (const [k, [c, sc]] of Object.entries(ODDS_CURVES)) {
    let pr = 0;
    NODES.forEach((z, i) => {
      const peak = clamp(mid + z * sd, ovr, 99);
      pr += WEIGHTS[i] * logistic((peak - c) / sc);
    });
    // only a milestone already reached is certain (round 25: near-sure odds showed as reached)
    odds[k as keyof typeof ODDS_CURVES] = Math.min(0.99, pr);
  }
  // milestones already reached are certain
  if (s.nbaGames > 0) odds.nba = 1;
  if (s.awards.some((a) => a.key === 'ALLSTAR')) odds.allStar = 1;
  if (s.awards.some((a) => a.key.startsWith('ALLNBA'))) odds.allNba = 1;
  if (s.awards.some((a) => a.key === 'ALLNBA1')) odds.allNba1 = 1;
  if (s.awards.some((a) => a.key === 'MVP')) odds.mvp = 1;
  const notes: string[] = [];
  const strengths = Object.entries(p.attrs).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => NAMES.attr[k as AttrKey].toLowerCase());
  const weak = NAMES.attr[Object.entries(p.attrs).sort((a, b) => a[1] - b[1])[0][0] as AttrKey].toLowerCase();
  notes.push(`Best tools: ${strengths.join(' and ')}. Biggest hole: ${weak}.`);
  if (early) notes.push('It is early: projections before college or a pro contract move a lot, both ways.');
  if (p.injury) notes.push('Currently injured; scouts are watching how he comes back.');
  if (p.morale < 35) notes.push('Body language has been poor. Confidence is a concern.');
  if (p.morale > 80) notes.push('Plays with real swagger right now.');
  if (p.durability > 1.15) notes.push('Medical file is thick. Durability is a question mark.');
  // the growth rate stays hidden, but coaches notice it
  if ((p.growthRate ?? 1) >= 1.25) notes.push('Coaches say he picks things up unusually fast.');
  else if ((p.growthRate ?? 1) <= 0.8) notes.push('He needs a lot of reps before a new skill sticks.');
  return {
    ovr,
    tier: tierFor(ovr),
    peakLo,
    peakHi,
    peakTier: tierFor((peakLo + peakHi) / 2),
    confidence: sd <= 3 ? 'high' : sd <= 5 ? 'medium' : 'low',
    odds,
    notes,
    early,
    peakSpan: tierFor(peakLo) === tierFor(peakHi) ? tierFor(peakHi) : `${tierFor(peakLo).replace(/ level$/, '')} to ${tierFor(peakHi)}`,
  };
}
