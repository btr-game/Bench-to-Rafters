// Career analysis after retirement (playtest round 5): a small model that compares the
// player's NBA career with 100 of the greatest real players (content/legends.ts).
//
// Two parts:
// 1. Comparables: k-nearest neighbours in a standardized, weighted feature space (scoring,
//    rebounding, playmaking, best season, longevity, honours, size and position).
// 2. All-time rank: a ridge regression trained on the 100 players to predict log(rank) from
//    the same features, so a career can be placed in the all-time order.
// The written analysis is generated from both.

import { POSITIONS } from '../balance';
import type { GameState, Pos } from '../types';
import { LEGENDS, type Legend } from '../../content/legends';
import { count } from './legacy';
import { NAMES } from '../../content/strings';

export const COMPARE_MIN_OVR = 80;

type Vec = number[];

interface Career {
  pos: Pos;
  height: number;
  seasons: number;
  ppg: number;
  rpg: number;
  apg: number;
  mvp: number;
  fmvp: number;
  titles: number;
  allStar: number;
  allNba: number;
  allNba1: number;
  dpoy: number;
  peakPpg: number;
}

// feature name, getter, weight in the similarity distance
const FEATURES: [string, (c: Career) => number, number][] = [
  ['ppg', (c) => c.ppg, 1.3],
  ['rpg', (c) => c.rpg, 1.0],
  ['apg', (c) => c.apg, 1.0],
  ['peakPpg', (c) => c.peakPpg, 0.6],
  ['seasons', (c) => c.seasons, 0.4],
  ['mvp', (c) => Math.sqrt(c.mvp), 0.9],
  ['fmvp', (c) => Math.sqrt(c.fmvp), 0.5],
  ['titles', (c) => Math.sqrt(c.titles), 0.6],
  ['allStar', (c) => c.allStar, 0.7],
  ['allNba', (c) => c.allNba, 0.7],
  ['allNba1', (c) => c.allNba1, 0.7],
  ['dpoy', (c) => Math.sqrt(c.dpoy), 0.4],
  ['height', (c) => c.height, 0.6],
  ['pos', (c) => POSITIONS.indexOf(c.pos), 0.5],
];

const raw = (c: Career): Vec => FEATURES.map(([, f]) => f(c));
const DATA = LEGENDS.map(raw);
const MEAN = FEATURES.map((_, j) => DATA.reduce((s, r) => s + r[j], 0) / DATA.length);
const SD = FEATURES.map((_, j) => Math.sqrt(DATA.reduce((s, r) => s + (r[j] - MEAN[j]) ** 2, 0) / DATA.length) || 1);
const z = (v: Vec): Vec => v.map((x, j) => (x - MEAN[j]) / SD[j]);
const ZDATA = DATA.map(z);

// ---------- ridge regression: log(rank) from the standardized features ----------

function solve(a: number[][], b: number[]): number[] {
  // Gaussian elimination with partial pivoting (the system is small and well conditioned)
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

const LAMBDA = 3;
const RANK_W = (() => {
  // design matrix with an intercept column; the intercept is not penalized
  const X = ZDATA.map((r) => [1, ...r]);
  const y = LEGENDS.map((l) => Math.log(l.rank));
  const p = X[0].length;
  const xtx = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) + (i === j && i > 0 ? LAMBDA : 0)));
  const xty = Array.from({ length: p }, (_, i) => X.reduce((s, r, k) => s + r[i] * y[k], 0));
  return solve(xtx, xty);
})();

// typical distance from a legend to his nearest fellow legend: the yardstick for similarity
const wdist = (a: Vec, b: Vec) => Math.sqrt(a.reduce((sum, x, j) => sum + FEATURES[j][2] * (x - b[j]) ** 2, 0));
const NN_DIST = (() => {
  const nn = ZDATA.map((a, i) => Math.min(...ZDATA.filter((_, k) => k !== i).map((b) => wdist(a, b)))).sort((x, y) => x - y);
  return nn[Math.floor(nn.length / 2)];
})();
/** 75% at the typical legend-to-legend distance, falling off from there. */
const similarity = (d: number) => Math.round(100 * Math.exp(-0.2877 * (d / NN_DIST) ** 2));

const predictLogRank = (zv: Vec): number => RANK_W[0] + zv.reduce((s, x, j) => s + x * RANK_W[j + 1], 0);

/** How well the rank model fits its own training set (for the docs and tests). */
export function rankModelFit(): { r2: number; spearman: number } {
  const y = LEGENDS.map((l) => Math.log(l.rank));
  const yh = ZDATA.map(predictLogRank);
  const my = y.reduce((s, x) => s + x, 0) / y.length;
  const ssr = y.reduce((s, x, i) => s + (x - yh[i]) ** 2, 0);
  const sst = y.reduce((s, x) => s + (x - my) ** 2, 0);
  const order = (v: number[]) => v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const ra = new Array(y.length);
  const rb = new Array(y.length);
  order(y).forEach((i, r) => (ra[i] = r));
  order(yh).forEach((i, r) => (rb[i] = r));
  const n = y.length;
  const d2 = ra.reduce((s: number, r: number, i: number) => s + (r - rb[i]) ** 2, 0);
  return { r2: 1 - ssr / sst, spearman: 1 - (6 * d2) / (n * (n * n - 1)) };
}

// ---------- the player's career ----------

export function careerOf(s: GameState): Career | null {
  const rows = s.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);
  if (rows.length === 0) return null;
  const tot = rows.reduce((t, h) => ({ gp: t.gp + h.line.gp, pts: t.pts + h.line.pts, reb: t.reb + h.line.reb, ast: t.ast + h.line.ast }), { gp: 0, pts: 0, reb: 0, ast: 0 });
  const peak = Math.max(...rows.filter((h) => h.line.gp >= 40).map((h) => h.line.pts / h.line.gp), 0);
  return {
    pos: s.player.pos,
    height: s.player.height,
    seasons: rows.length,
    ppg: tot.pts / tot.gp,
    rpg: tot.reb / tot.gp,
    apg: tot.ast / tot.gp,
    mvp: count(s, 'MVP'),
    fmvp: count(s, 'FMVP'),
    titles: count(s, 'TITLE') + count(s, 'TITLEKEY'),
    allStar: count(s, 'ALLSTAR'),
    allNba: count(s, 'ALLNBA1') + count(s, 'ALLNBA2') + count(s, 'ALLNBA3'),
    allNba1: count(s, 'ALLNBA1'),
    dpoy: count(s, 'DPOY'),
    peakPpg: peak,
  };
}

export interface Comparison {
  eligible: boolean;
  reason?: string;
  rank?: number; // projected all-time rank (may be above 100)
  between?: [string | null, string | null];
  comps?: { name: string; similarity: number; rank: number; line: string; honours: string }[];
  standing?: { label: string; you: string; rankAmong: number }[];
  analysis?: string[];
}

const honoursOf = (l: Legend | Career): string => {
  const parts: string[] = [];
  if (l.mvp) parts.push(`${l.mvp}× MVP`);
  if (l.titles) parts.push(`${l.titles}× champion`);
  if (l.allStar) parts.push(`${l.allStar}× All-Star`);
  if (l.allNba) parts.push(`${l.allNba}× All-NBA`);
  if (l.dpoy) parts.push(`${l.dpoy}× DPOY`);
  return parts.join(', ') || 'no major honours';
};

const lineOf = (c: Career | Legend) => `${c.ppg.toFixed(1)} PTS, ${c.rpg.toFixed(1)} REB, ${c.apg.toFixed(1)} AST over ${c.seasons} seasons`;

/** Runs the model on a finished career. Only careers that peaked at 80+ get compared. */
export function compareCareer(s: GameState): Comparison {
  if (s.player.peakOvr < COMPARE_MIN_OVR) {
    return { eligible: false, reason: `Comparisons with the all-time greats unlock for careers that peak at OVR ${COMPARE_MIN_OVR} or higher (yours peaked at ${Math.round(s.player.peakOvr)}).` };
  }
  const c = careerOf(s);
  if (!c || c.seasons < 2) return { eligible: false, reason: 'Not enough NBA seasons to compare.' };
  const zc = z(raw(c));
  // nearest neighbours by weighted distance; similarity on a 0-100 scale
  const dist = ZDATA.map((zl) => wdist(zl, zc));
  const order = dist.map((d, i) => [d, i] as const).sort((a, b) => a[0] - b[0]);
  const comps = order.slice(0, 3).map(([d, i]) => {
    const l = LEGENDS[i];
    return { name: l.name, similarity: similarity(d), rank: l.rank, line: lineOf(l), honours: honoursOf(l) };
  });
  const rank = Math.max(1, Math.round(Math.exp(predictLogRank(zc))));
  const above = rank > 1 ? LEGENDS[Math.min(99, rank - 2)]?.name ?? null : null;
  const below = rank <= 100 ? LEGENDS[rank - 1]?.name ?? null : null;
  const among = (v: number, f: (l: Legend) => number) => 1 + LEGENDS.filter((l) => f(l) > v).length;
  const standing = [
    { label: 'Points per game', you: c.ppg.toFixed(1), rankAmong: among(c.ppg, (l) => l.ppg) },
    { label: 'Rebounds per game', you: c.rpg.toFixed(1), rankAmong: among(c.rpg, (l) => l.rpg) },
    { label: 'Assists per game', you: c.apg.toFixed(1), rankAmong: among(c.apg, (l) => l.apg) },
    { label: 'Best season (PPG)', you: c.peakPpg.toFixed(1), rankAmong: among(c.peakPpg, (l) => l.peakPpg) },
    { label: 'MVPs', you: String(c.mvp), rankAmong: among(c.mvp, (l) => l.mvp) },
    { label: 'Titles', you: String(c.titles), rankAmong: among(c.titles, (l) => l.titles) },
    { label: 'All-NBA teams', you: String(c.allNba), rankAmong: among(c.allNba, (l) => l.allNba) },
  ];
  // the written analysis
  const p = s.player;
  const top = comps[0];
  const analysis: string[] = [];
  analysis.push(
    rank === 1
      ? `The model places ${p.name} at No. 1 all time, ahead of ${LEGENDS[0].name}.`
      : rank <= 100
      ? `The model places ${p.name} around No. ${rank} all time${above ? `, just behind ${above}` : ''}${below && below !== above ? ` and ahead of ${below}` : ''}.`
      : `The model places ${p.name} just outside the all-time top 100 (around No. ${Math.min(rank, 150)}): a very good career, short of the honours the greats piled up.`,
  );
  if (top.similarity < 40) analysis.push('Nobody in this list had a career quite like this one; the comparisons below are the nearest, not close.');
  analysis.push(`Closest comparison: ${top.name} (${top.similarity}% similar). ${top.name} averaged ${top.line} with ${top.honours}; ${p.name} averaged ${lineOf(c)} with ${honoursOf(c)}.`);
  const best = [...standing].sort((a, b) => a.rankAmong - b.rankAmong)[0];
  if (best.rankAmong <= 10) analysis.push(`Strongest claim: ${best.label} (${best.you}) would rank ${best.rankAmong === 1 ? 'first' : `${ordinal(best.rankAmong)}`} among these 100 players.`);
  const weak = [...standing].filter((x) => ['MVPs', 'Titles', 'All-NBA teams'].includes(x.label)).sort((a, b) => b.rankAmong - a.rankAmong)[0];
  if (weak && weak.rankAmong > 50) analysis.push(`What holds the ranking back: ${weak.label} (${weak.you}). The top of the list is built on hardware.`);
  if (c.seasons <= 9 && rank <= 40) analysis.push('A short, brilliant career: more seasons at that level would have pushed the ranking higher.');
  analysis.push(`As a ${NAMES.pos[p.pos].toLowerCase()} at ${Math.floor(p.height / 12)}′${p.height % 12}″, his style sits closest to ${comps.map((x) => x.name).join(', ')}.`);
  return { eligible: true, rank, between: [above, below], comps, standing, analysis };
}

function ordinal(n: number): string {
  const sfx = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (sfx[(v - 20) % 10] || sfx[v] || sfx[0]);
}
