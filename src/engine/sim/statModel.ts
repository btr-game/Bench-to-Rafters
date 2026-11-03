// Per-game stat model (§9). The same expected-rate function feeds full box scores
// for the user and season-level lines for every generated player.

import { EFF_KNEE, LEVELS, STAT, TOUCH, USAGE_KNEE, USAGE_SCORING_W, USAGE_TEMP, VALUE } from '../balance';
import { binomial, clamp, poisson, type Rng } from '../rng';
import type { Attrs, GenPlayer, LevelKey, Pos, StatLine } from '../types';
import { genAttrs, genRange, shapeOvr } from '../player/ovr';
import { ARCHETYPES } from '../player/archetypes';

export interface Profile {
  attrs: Attrs;
  height: number;
  wingspan: number;
  range: number;
  offhand: number;
  touch: number; // round 35: free-throw touch (player/touch.ts)
}

export interface Expected {
  min: number;
  fga: number;
  tpa: number;
  p2: number;
  p3: number;
  fta: number;
  ftp: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pts: number;
}

export function genProfile(g: GenPlayer): Profile {
  return {
    attrs: genAttrs(g.pos, g.shape, g.ovr),
    height: g.height,
    wingspan: g.height + 2,
    range: genRange(g.pos, g.shape, g.ovr),
    // better players have a better weak hand
    offhand: Math.max(30, Math.min(88, g.ovr - 12)),
    // their free throws come from their shooting alone
    touch: TOUCH.mid,
  };
}

// A generated player's attributes are the archetype shape shifted by (ovr - shapeOvr),
// and the usage weights sum to 1, so the scoring rating shifts by the same amount.
const SHAPE_SCORE: Record<Pos, number[]> = Object.fromEntries(
  (Object.keys(ARCHETYPES) as Pos[]).map((pos) => [pos, ARCHETYPES[pos].map((a) => scoringRating(a.attrs) - shapeOvr(pos, ARCHETYPES[pos].indexOf(a)))]),
) as Record<Pos, number[]>;

// Above the knee extra scoring rating buys less usage: there are only so many shots in a game.
const kneed = (r: number): number => (r > USAGE_KNEE.at ? USAGE_KNEE.at + (r - USAGE_KNEE.at) * USAGE_KNEE.slope : r);

export const genUsageWeight = (g: GenPlayer): number => Math.exp(kneed(SHAPE_SCORE[g.pos][g.shape] + g.ovr) / USAGE_TEMP);

function scoringRating(a: Attrs): number {
  const w = USAGE_SCORING_W;
  return a.SHT * w.SHT + a.FIN * w.FIN + a.PLY * w.PLY + a.ATH * w.ATH + a.IQ * w.IQ;
}

export const usageWeight = (a: Attrs): number => Math.exp(kneed(scoringRating(a)) / USAGE_TEMP);

const kneeEff = (v: number): number => (v > EFF_KNEE.at ? EFF_KNEE.at + (v - EFF_KNEE.at) * EFF_KNEE.slope : v);

/** Expected per-game numbers for a player given minutes and usage multiplier. */
export function expected(pr: Profile, level: LevelKey, minutes: number, usageMult: number, moraleMult = 1): Expected {
  const L = LEVELS[level];
  const lv = L.avg;
  // shooting efficiency flattens out at the very top of the scale
  const r = pr.attrs;
  const a: Attrs = { SHT: kneeEff(r.SHT), FIN: kneeEff(r.FIN), PLY: kneeEff(r.PLY), PER: kneeEff(r.PER), INT: kneeEff(r.INT), REB: kneeEff(r.REB), ATH: kneeEff(r.ATH), IQ: kneeEff(r.IQ) };
  const f36 = minutes / 36;
  const fgaPerMin = (L.teamFga / (5 * L.gameLen)) * usageMult;
  const fga = fgaPerMin * minutes;
  const s = STAT;
  const share3 = clamp(s.threeShare.base + (pr.range - 20) * s.threeShare.range + (a.SHT - 50) * s.threeShare.sht, s.threeShare.min, s.threeShare.max);
  const p3 = clamp(s.three.base + (a.SHT - lv) * s.three.sht + (pr.range - 50) * s.three.range, s.three.min, s.three.max) * moraleMult;
  const inside = a.FIN * 0.6 + a.SHT * 0.15 + a.ATH * 0.15 + a.IQ * 0.1;
  const p2 = clamp(
    s.two.base + (inside - lv) * s.two.rating + (pr.height - 78) * s.two.height + (pr.offhand - 50) * s.two.offhand,
    s.two.min,
    s.two.max,
  ) * moraleMult;
  const ftRate = clamp(s.ftRate.base + (a.FIN - lv) * s.ftRate.fin + (a.ATH - lv) * s.ftRate.ath, s.ftRate.min, s.ftRate.max);
  const ftp = clamp(s.ft.base + (a.SHT - lv) * s.ft.sht + (pr.touch - TOUCH.mid) * s.ft.touch, s.ft.min, s.ft.max);
  const tpa = fga * share3;
  const fta = fga * ftRate;
  const reb36 = clamp(
    s.reb36.base + (a.REB - lv) * s.reb36.rating + (pr.height - 79) * s.reb36.height + (pr.wingspan - pr.height - 2) * s.reb36.wing,
    s.reb36.min,
    s.reb36.max,
  );
  // assists use the raw ratings (the efficiency knee would cap elite passers near 7 a game),
  // with basketball IQ helping and a little extra for elite playmakers
  const ast36 = clamp(
    s.ast36.base + (r.PLY - lv) * s.ast36.rating + (r.IQ - lv) * s.ast36.iq + Math.max(0, r.PLY - s.ast36.eliteFrom) * s.ast36.elite,
    s.ast36.min,
    s.ast36.max,
  );
  const stl36 = clamp(s.stl36.base + (a.PER - lv) * s.stl36.per + (a.ATH - lv) * s.stl36.ath, s.stl36.min, s.stl36.max);
  const blk36 = clamp(
    s.blk36.base + (a.INT - lv) * s.blk36.int + (pr.height - 79) * s.blk36.height + (pr.wingspan - pr.height - 2) * s.blk36.wing,
    s.blk36.min,
    s.blk36.max,
  );
  const fga36 = minutes > 0 ? (fga / minutes) * 36 : 0;
  const tov36 = clamp(s.tov36.base + fga36 * s.tov36.fga + ast36 * s.tov36.ast - (a.IQ - lv) * s.tov36.iq, s.tov36.min, s.tov36.max);
  const pts = (fga - tpa) * p2 * 2 + tpa * p3 * 3 + fta * ftp;
  return {
    min: minutes,
    fga,
    tpa,
    p2,
    p3,
    fta,
    ftp,
    reb: reb36 * f36,
    ast: ast36 * f36,
    stl: stl36 * f36,
    blk: blk36 * f36,
    tov: tov36 * f36,
    pts,
  };
}

export function emptyLine(): StatLine {
  return { gp: 0, gs: 0, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 };
}

export function sampleGame(rng: Rng, e: Expected, started: boolean): StatLine {
  const fga = poisson(rng, e.fga);
  const share3 = e.fga > 0 ? e.tpa / e.fga : 0;
  const tpa = binomial(rng, fga, share3);
  const tpm = binomial(rng, tpa, e.p3);
  const twm = binomial(rng, fga - tpa, e.p2);
  const fta = poisson(rng, e.fta);
  const ftm = binomial(rng, fta, e.ftp);
  return {
    gp: 1,
    gs: started ? 1 : 0,
    min: Math.round(e.min),
    pts: tpm * 3 + twm * 2 + ftm,
    reb: poisson(rng, e.reb),
    ast: poisson(rng, e.ast),
    stl: poisson(rng, e.stl),
    blk: poisson(rng, e.blk),
    tov: poisson(rng, e.tov),
    fgm: tpm + twm,
    fga,
    tpm,
    tpa,
    ftm,
    fta,
  };
}

/** Season-level line: expected per game times games, rounded. No per-game sampling. */
export function seasonLineFromExpected(e: Expected, gp: number, gs: number, noise: number): StatLine {
  const k = gp * noise;
  const fga = e.fga * k;
  const tpa = e.tpa * k;
  const tpm = tpa * e.p3;
  const twm = (fga - tpa) * e.p2;
  const fta = e.fta * k;
  const ftm = fta * e.ftp;
  return {
    gp,
    gs,
    min: e.min * gp,
    pts: tpm * 3 + twm * 2 + ftm,
    reb: e.reb * k,
    ast: e.ast * k,
    stl: e.stl * gp,
    blk: e.blk * gp,
    tov: e.tov * k,
    fgm: tpm + twm,
    fga,
    tpm,
    tpa,
    ftm,
    fta,
  };
}

export function addLine(into: StatLine, l: StatLine): void {
  into.gp += l.gp;
  into.gs += l.gs;
  into.min += l.min;
  into.pts += l.pts;
  into.reb += l.reb;
  into.ast += l.ast;
  into.stl += l.stl;
  into.blk += l.blk;
  into.tov += l.tov;
  into.fgm += l.fgm;
  into.fga += l.fga;
  into.tpm += l.tpm;
  into.tpa += l.tpa;
  into.ftm += l.ftm;
  into.fta += l.fta;
}

export function sumLines(lines: (StatLine | null)[]): StatLine {
  const t = emptyLine();
  for (const l of lines) if (l) addLine(t, l);
  return t;
}

export const perGame = (l: StatLine, k: keyof StatLine): number => (l.gp > 0 ? l[k] / l.gp : 0);

export function trueShooting(l: StatLine): number {
  const tsa = l.fga + 0.44 * l.fta;
  return tsa > 0 ? l.pts / (2 * tsa) : 0;
}

/** Value score per game (§10). */
export function valuePerGame(l: StatLine): number {
  if (l.gp <= 0) return 0;
  const raw = l.pts + VALUE.reb * l.reb + VALUE.ast * l.ast + VALUE.stl * l.stl + VALUE.blk * l.blk - VALUE.tov * l.tov;
  const tsa = l.fga + 0.44 * l.fta;
  const eff = (trueShooting(l) - VALUE.effAvgTs) * tsa * 2 * VALUE.effMult;
  return (raw + eff) / l.gp;
}

export function gameScore(l: StatLine): number {
  return l.pts + 0.4 * l.fgm - 0.7 * l.fga - 0.4 * (l.fta - l.ftm) + 0.7 * l.reb + 0.7 * l.ast + l.stl + 0.7 * l.blk - l.tov;
}

export function expectedGameScore(e: Expected): number {
  const fgm = (e.fga - e.tpa) * e.p2 + e.tpa * e.p3;
  return e.pts + 0.4 * fgm - 0.7 * e.fga - 0.4 * (e.fta * (1 - e.ftp)) + 0.7 * e.reb + 0.7 * e.ast + e.stl + 0.7 * e.blk - e.tov;
}
