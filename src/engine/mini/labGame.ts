// Built in a lab, the mini-game (round 12: "make it as simple as possible, even simpler than fast
// break, so that it actually feels like a minigame"). It no longer starts a career: a player is
// built over ten seasons on one screen each.
// - Every season pays credits (more when young, a little luck), sometimes with a twist: a
//   breakthrough summer, a nagging injury, a coach who teaches you something.
// - Credits buy rating points (the career lab's prices: 1, 1.5 from 80, 2 from 90).
// - Then the season plays itself from the OVR: the numbers, the team's record and the awards.
// - After ten seasons: the peak, the trophy shelf and a grade.

import { ATTRS, HEIGHT_RANGE, OVR_WEIGHTS } from '../balance';
import { chance, clamp, makeRng, normal, pick, range, type Rng } from '../rng';
import type { AttrKey, Attrs, Pos } from '../types';
import { ARCHETYPES } from '../player/archetypes';
import { ovrOf } from '../player/ovr';
import { labCost } from '../career/lab';
import { NAMES } from '../../content/strings';

// round 15 ("too difficult; somewhere between Stars and Regular"): a higher start, about 25% more
// credits, lower award bars and a gentler grade scale
export const LAB_GAME = { seasons: 10, startAge: 19, startOvr: 60, step: 3, credits: [14, 13, 12, 10, 9, 8, 7, 6, 5, 4], twistChance: 0.45 };

export interface LabSeason {
  age: number;
  ovr: number;
  line: string;
  record: string;
  awards: string[];
  twist?: string;
}

export interface LabGameState {
  rng: Rng;
  name: string;
  pos: Pos;
  height: number;
  attrs: Attrs;
  credits: number;
  season: number; // seasons played (0-10)
  twist: string | null; // what happened this summer
  history: LabSeason[];
  peak: number;
  over: boolean;
}

/** A fresh build: the position's first archetype, scaled to a raw 19-year-old. */
export function newLabGame(seed: number, name: string, pos: Pos, height: number): LabGameState {
  const rng = makeRng(seed);
  const card = ARCHETYPES[pos][0].attrs;
  const shift = LAB_GAME.startOvr - ovrOf(card, pos);
  const mid = (HEIGHT_RANGE[pos][0] + HEIGHT_RANGE[pos][1]) / 2;
  const attrs = {} as Attrs;
  for (const k of ATTRS) {
    const tall = (height - mid) * (k === 'REB' || k === 'INT' ? 1 : k === 'ATH' || k === 'PLY' ? -0.6 : 0);
    attrs[k] = Math.round(clamp(card[k] + shift + tall + normal(rng, 0, 1.5), 25, 80));
  }
  const st: LabGameState = { rng, name: name.trim() || 'Lab Rat', pos, height, attrs, credits: 0, season: 0, twist: null, history: [], peak: ovrOf(attrs, pos), over: false };
  payday(st);
  return st;
}

export const labOvr = (st: LabGameState): number => ovrOf(st.attrs, st.pos);

/** This summer's credits, and maybe a twist. */
function payday(st: LabGameState): void {
  const r = st.rng;
  const base = LAB_GAME.credits[st.season] ?? 2;
  let credits = Math.round(base * range(r, 0.85, 1.15) * 10) / 10;
  st.twist = null;
  if (chance(r, LAB_GAME.twistChance)) {
    const roll = pick(r, ['boom', 'injury', 'mentor', 'slump', 'camp'] as const);
    const k: AttrKey = pick(r, ATTRS);
    if (roll === 'boom') {
      credits += 5;
      st.twist = 'Breakthrough summer: +5 credits.';
    } else if (roll === 'injury') {
      st.attrs.ATH = Math.max(20, st.attrs.ATH - 3);
      st.twist = 'A nagging injury: Athleticism -3.';
    } else if (roll === 'mentor') {
      st.attrs[k] = Math.min(99, st.attrs[k] + 3);
      st.twist = `A veteran takes you under his wing: ${NAMES.attr[k]} +3.`;
    } else if (roll === 'slump') {
      credits = Math.max(1, credits - 3);
      st.twist = 'A bad summer: -3 credits.';
    } else {
      credits += 2;
      st.attrs.IQ = Math.min(99, st.attrs.IQ + 1);
      st.twist = 'An elite camp: +2 credits, Basketball IQ +1.';
    }
  }
  st.credits = Math.round((st.credits + credits) * 10) / 10;
}

/** One tap: +3 to a rating (less near 99) for the career lab's price of one point. */
export function labBuy(st: LabGameState, k: AttrKey): boolean {
  const c = labCost(st.attrs[k]);
  if (st.over || st.attrs[k] >= 99 || st.credits + 1e-9 < c) return false;
  st.credits = Math.round((st.credits - c) * 10) / 10;
  st.attrs[k] = Math.min(99, st.attrs[k] + LAB_GAME.step);
  return true;
}

/** The lazy option: spreads the credits evenly, lowest rating first. */
export function labSpreadSpend(st: LabGameState): void {
  for (;;) {
    const low = [...ATTRS].filter((k) => st.attrs[k] < 99 && labCost(st.attrs[k]) <= st.credits + 1e-9).sort((a, b) => st.attrs[a] - st.attrs[b])[0];
    if (!low || !labBuy(st, low)) return;
  }
}

/** The best value tap: the rating that adds the most OVR per credit (used by the tests and the harness). */
export function labBestSpend(st: LabGameState): void {
  const w = OVR_WEIGHTS[st.pos];
  for (;;) {
    const best = [...ATTRS].filter((k) => st.attrs[k] < 99 && labCost(st.attrs[k]) <= st.credits + 1e-9).sort((a, b) => w[b] / labCost(st.attrs[b]) - w[a] / labCost(st.attrs[a]))[0];
    if (!best || !labBuy(st, best)) return;
  }
}

/** Which ratings matter most at his position, for the hint on the screen. */
export const keyRatings = (pos: Pos): AttrKey[] => [...ATTRS].sort((a, b) => OVR_WEIGHTS[pos][b] - OVR_WEIGHTS[pos][a]).slice(0, 3);

/** Plays the season from his OVR, then pays next summer's credits. */
export function labPlaySeason(st: LabGameState): LabSeason | null {
  if (st.over) return null;
  const r = st.rng;
  const ovr = labOvr(st);
  const age = LAB_GAME.startAge + st.season;
  const form = normal(r, 0, 2);
  const lvl = ovr + form;
  const w = (k: AttrKey) => st.attrs[k];
  const pts = clamp(4 + (lvl - 60) * 0.7 + (w('SHT') + w('FIN') - 120) * 0.06, 2, 36);
  const reb = clamp(2 + (w('REB') - 40) * 0.12 + (st.pos === 'C' || st.pos === 'PF' ? 2 : 0), 1, 16);
  const ast = clamp(1 + (w('PLY') - 40) * 0.12 + (st.pos === 'PG' ? 1.5 : 0), 0.5, 13);
  const wins = Math.round(clamp(41 + (lvl - 78) * 2.2 + normal(r, 0, 6), 15, 68));
  const awards: string[] = [];
  if (lvl >= 77 && chance(r, 0.8)) awards.push('All-Star');
  if (lvl >= 84 && chance(r, 0.75)) awards.push(lvl >= 89 ? 'All-NBA 1st Team' : 'All-NBA');
  if (lvl >= 89 && wins >= 48 && chance(r, 0.45)) awards.push('MVP');
  if (wins >= 52 && chance(r, 0.12 + Math.max(0, lvl - 85) * 0.03)) awards.push('NBA Champion');
  if (w('PER') + w('INT') >= 175 && chance(r, 0.4)) awards.push('Defensive Player of the Year');
  const season: LabSeason = {
    age,
    ovr: Math.round(ovr),
    line: `${pts.toFixed(1)} PTS · ${reb.toFixed(1)} REB · ${ast.toFixed(1)} AST`,
    record: `${wins}–${82 - wins}`,
    awards,
  };
  st.history.push(season);
  st.peak = Math.max(st.peak, ovr);
  st.season++;
  if (st.season >= LAB_GAME.seasons) {
    st.over = true;
    st.twist = null;
  } else payday(st);
  return season;
}

export function labGrade(st: LabGameState): { letter: string; text: string } {
  const all = st.history.flatMap((h) => h.awards);
  const n = (a: string) => all.filter((x) => x === a).length;
  const score = n('MVP') * 6 + n('NBA Champion') * 4 + n('All-NBA 1st Team') * 3 + n('All-NBA') * 2 + n('All-Star') + n('Defensive Player of the Year') * 2;
  if (score >= 26) return { letter: 'A+', text: 'A perfect build. The lab will study him for years.' };
  if (score >= 15) return { letter: 'A', text: 'A superstar, by design.' };
  if (score >= 7) return { letter: 'B', text: 'An All-Star build.' };
  if (score >= 2) return { letter: 'C', text: 'A solid pro.' };
  return { letter: 'D', text: 'The experiment needs work.' };
}
