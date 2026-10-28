// The legacy tier list (playtest round 7): how much each honour counts toward a legacy, and
// an all-time ranking built from it. The same weights score the 100 real legends
// (content/legends.ts), so a career can be placed among them.
//
// S: the honours that define an all-time career (the Hall of Fame, a jersey in the rafters,
//    MVP, Finals MVP). A to D: everything else, by weight. NBA points add 1 per 1,500.

import { LEGACY } from '../balance';
import type { GameState } from '../types';
import { LEGENDS, type Legend } from '../../content/legends';
import { count, hallOfFame, legacyScore, nbaCareerPoints, raftersTeams } from './legacy';

export type TierKey = 'S' | 'A' | 'B' | 'C' | 'D';

export interface TierItem {
  key: string; // award key, or HOF / RAFTERS
  label: string;
  pts: number;
  note?: string;
}

/** Points for a Hall of Fame induction and for each jersey hung in the rafters. */
export const HONOR_PTS = { firstBallot: 14, hof: 10, rafters: 6, raftersMax: 3 };

export const TIERS: { tier: TierKey; name: string; color: string; items: TierItem[] }[] = [
  {
    tier: 'S',
    name: 'Immortal',
    color: '#B8860B',
    items: [
      { key: 'HOF', label: 'Hall of Fame', pts: HONOR_PTS.hof, note: `${HONOR_PTS.firstBallot} on the first ballot` },
      { key: 'RAFTERS', label: 'Jersey in the rafters', pts: HONOR_PTS.rafters, note: `each team, up to ${HONOR_PTS.raftersMax}` },
      { key: 'MVP', label: 'MVP', pts: LEGACY.mvp },
      { key: 'FMVP', label: 'Finals MVP', pts: LEGACY.finalsMvp },
    ],
  },
  {
    tier: 'A',
    name: 'Legendary',
    color: '#7A1F2B',
    items: [
      { key: 'ALLNBA1', label: 'All-NBA First Team', pts: LEGACY.allNba[0] },
      { key: 'TITLEKEY', label: 'Champion as a key player', pts: LEGACY.titleKey },
      { key: 'DPOY', label: 'Defensive Player of the Year', pts: LEGACY.dpoy },
      { key: 'ALLNBA2', label: 'All-NBA Second Team', pts: LEGACY.allNba[1] },
    ],
  },
  {
    tier: 'B',
    name: 'Elite',
    color: '#1F3A7A',
    items: [
      { key: 'TITLE', label: 'NBA champion', pts: LEGACY.title },
      { key: 'ALLNBA3', label: 'All-NBA Third Team', pts: LEGACY.allNba[2] },
      { key: 'OLYGOLD', label: 'Olympic gold', pts: 3 },
      { key: 'ALLSTAR', label: 'All-Star', pts: LEGACY.allStar },
      { key: 'ROY', label: 'Rookie of the Year', pts: LEGACY.roy },
      { key: 'SCORING', label: 'Scoring title', pts: LEGACY.scoring },
    ],
  },
  {
    tier: 'C',
    name: 'Notable',
    color: '#1E5B3A',
    items: [
      { key: 'NCAATITLE', label: 'NCAA champion', pts: LEGACY.ncaaTitle },
      { key: 'EUTITLE', label: 'EuroLeague title', pts: LEGACY.euro },
      { key: 'EUMVP', label: 'EuroLeague MVP', pts: LEGACY.euro },
      { key: 'WCGOLD', label: 'FIBA World Cup gold', pts: 1.5 },
      { key: 'NBACUP', label: 'NBA Cup', pts: 1.5 },
      { key: 'SIXTH', label: 'Sixth Man of the Year', pts: LEGACY.sixth },
    ],
  },
  {
    tier: 'D',
    name: 'Honourable',
    color: '#4A4F57',
    items: [
      { key: 'OLYMEDAL', label: 'Olympic silver or bronze', pts: 0.75 },
      { key: 'WCMEDAL', label: 'World Cup silver or bronze', pts: 0.75 },
      { key: 'CUPMVP', label: 'NBA Cup MVP', pts: 0.75 },
      { key: 'ASIANGOLD', label: 'Asian Games gold', pts: 0.5 },
      { key: 'ASIANMEDAL', label: 'Asian Games silver or bronze', pts: 0.25 },
    ],
  },
];

/** How many of each tier-list item the career earned. */
export function tierCounts(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of TIERS) for (const it of t.items) out[it.key] = count(s, it.key);
  const hof = s.stage === 'RETIRED' ? hallOfFame(s) : null;
  out.HOF = hof ? 1 : 0;
  out.RAFTERS = s.stage === 'RETIRED' ? raftersTeams(s).length : 0;
  return out;
}

/** Legacy points for the all-time ranking: the career's legacy plus the Hall and the rafters. */
export function legacyIndex(s: GameState): number {
  const hof = s.stage === 'RETIRED' ? hallOfFame(s) : null;
  const rafters = s.stage === 'RETIRED' ? Math.min(HONOR_PTS.raftersMax, raftersTeams(s).length) : 0;
  const pts = legacyScore(s) + (hof === 'first' ? HONOR_PTS.firstBallot : hof ? HONOR_PTS.hof : 0) + rafters * HONOR_PTS.rafters;
  return Math.round(pts * 10) / 10;
}

/**
 * A legend scored the same way. The list does not split All-NBA second and third teams or
 * titles won as a key player, so those use the average weight; every top-100 player is in
 * the Hall of Fame (the top 40 as first-ballot picks) with one jersey in the rafters.
 */
export function legendIndex(l: Legend): number {
  const titlesKey = Math.min(l.titles, l.fmvp + (l.allNba1 > 0 ? 1 : 0));
  const pts =
    l.mvp * LEGACY.mvp +
    l.fmvp * LEGACY.finalsMvp +
    titlesKey * LEGACY.titleKey +
    (l.titles - titlesKey) * LEGACY.title +
    l.allNba1 * LEGACY.allNba[0] +
    (l.allNba - l.allNba1) * ((LEGACY.allNba[1] + LEGACY.allNba[2]) / 2) +
    l.allStar * LEGACY.allStar +
    l.dpoy * LEGACY.dpoy +
    (l.ppg * l.seasons * 72) / LEGACY.pointsPer +
    (l.rank <= 40 ? HONOR_PTS.firstBallot : HONOR_PTS.hof) +
    HONOR_PTS.rafters;
  return Math.round(pts * 10) / 10;
}

const LEGEND_PTS = LEGENDS.map((l) => ({ name: l.name, pts: legendIndex(l) })).sort((a, b) => b.pts - a.pts);

export interface LegacyRank {
  pts: number;
  rank: number; // among the 100 legends plus him; 101 means outside the top 100
  above: { name: string; pts: number } | null; // the legend just ahead
  below: { name: string; pts: number } | null; // the legend just behind
  nbaPts: number;
}

/** Where his legacy points place him among the 100 legends. */
export function legacyRank(s: GameState): LegacyRank {
  const pts = legacyIndex(s);
  const ahead = LEGEND_PTS.filter((l) => l.pts > pts);
  const rank = ahead.length + 1;
  return {
    pts,
    rank,
    above: ahead.length ? ahead[ahead.length - 1] : null,
    below: LEGEND_PTS[ahead.length] ?? null,
    nbaPts: Math.round(nbaCareerPoints(s) / LEGACY.pointsPer * 10) / 10,
  };
}

export { LEGEND_PTS };
