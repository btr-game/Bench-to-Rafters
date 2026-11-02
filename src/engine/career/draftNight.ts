// Draft night (round 35). Owner, for a draft class: "here's the story line. the 12 of you (max)
// were the first options of your colleges. you're going for the nba draft, and all of you are
// predicted to be entering as a 1st round pick (1~30th). ovr starts at a 65~75 range. the rest is
// history". A class career (CreateInput.start = 'draft', set by the store for a class) skips high
// school and college: the player is made as usual, grown to a college junior or senior who was
// his school's first option, and the career opens on the night of the draft he has declared for.
// From the pick on it is an ordinary career.
//
// His age, OVR, college and projection are drawn from a stream of his own, from the seed and his
// picks, so classmates on one seed are different players. His potential is the one Regular guy drew
// for him, raised where it is too low for a player this good at his age. The league and the draft
// come from the seed alone, so every classmate goes into the same draft: the same teams, lottery
// and prospects around him.

import { ARCH_CEILING, ATTR_GROWTH, ATTR_MAX, ATTRS, CAP_FROM_START, CAP_MAX, DRAFT_NIGHT as D, FOCUS_MULT, NON_FOCUS_MULT } from '../balance';
import { clamp, int, makeRng, normal, pick, range, weightedIndex, type Rng } from '../rng';
import type { AttrKey, Attrs, GameState, UserPlayer } from '../types';
import { updateScouting, type CreateInput } from '../player/create';
import { ARCHETYPES } from '../player/archetypes';
import { ovrOf } from '../player/ovr';
import { expectedOvrAt } from '../player/growth';
import { settleWeight } from '../player/weight';
import { addTouch, seasonTouch } from '../player/touch';
import { COLLEGES } from '../../content/teams';
import { NAMES } from '../../content/strings';
import { buildNba } from '../world/leagues';
import { draftNightPreview, quickNbaSeason, warmUpNba } from './nbaYear';
import { doDraft } from './offseason';
import { beginSeason } from './season';
import { logDecision, pushMoment } from './common';
import { rareLines } from './origin';

/** A draft class plays Regular guy; a level or another difficulty starts as it always has. */
export const opensOnDraftNight = (s: GameState, input: CreateInput): boolean => input.start === 'draft' && !input.level && s.mode === 'standard';

/** His own stream: the seed and the picks a friend's challenge hands on (ui/multiplayer.ts
 * cleanProspect keeps all of them), so a challenge replays the same draft night. */
function ownRng(seed: number, input: CreateInput): Rng {
  let h = (2166136261 ^ seed) >>> 0;
  for (const c of [input.name, input.number, input.pos, input.archetype, ...input.focus, input.hand ?? 'R'].join('|')) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return makeRng(h >>> 0);
}

/** The league's stream: the seed alone (a constant apart from every other stream drawn from it). */
const worldRng = (seed: number): Rng => makeRng((seed ^ 0x2f6b9d35) >>> 0);

/** The potential whose growth curve (the one the draft class is drawn on) reaches this OVR at
 * this age, between the two whole potentials around it. */
function potentialFor(ovr: number, age: number): number {
  let lo = 40;
  while (lo < 98 && expectedOvrAt(lo + 1, age) < ovr) lo++;
  const a = expectedOvrAt(lo, age);
  const b = expectedOvrAt(lo + 1, age);
  return lo + clamp((ovr - a) / Math.max(1e-9, b - a), 0, 1);
}

/** His ratings at `target` OVR, grown from the 14-year-old's the way seasons grow them: each one
 * closes on its ceiling, his two focus ratings about twice as fast as the rest, so his card, his
 * height and his focus shape the player. Whatever is left (none, unless the ceilings fall short)
 * is spread evenly; the OVR weights sum to 1. */
function grownAttrs(p: UserPlayer, target: number): Attrs {
  const from = { ...p.attrs };
  const rate = (k: AttrKey) => ATTR_GROWTH[k] * (p.focus.includes(k) ? FOCUS_MULT : NON_FOCUS_MULT);
  const at = (t: number): Attrs => {
    const out = {} as Attrs;
    for (const k of ATTRS) out[k] = from[k] + Math.max(0, p.caps[k] - from[k]) * (1 - Math.exp(-rate(k) * t));
    return out;
  };
  let lo = 0;
  let hi = 1;
  while (hi < 64 && ovrOf(at(hi), p.pos) < target) hi *= 2;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (ovrOf(at(mid), p.pos) < target) lo = mid;
    else hi = mid;
  }
  const out = at(hi);
  for (let i = 0; i < 4; i++) {
    const d = target - ovrOf(out, p.pos);
    if (Math.abs(d) < 1e-9) break;
    for (const k of ATTRS) out[k] = clamp(out[k] + d, 5, ATTR_MAX);
  }
  return out;
}

const ft = (x: number) => `${Math.floor(x / 12)}′${x % 12}″`;

/** Turns the 14-year-old newGame made into a first option on draft night, runs the draft and
 * opens his first NBA season. */
export function openOnDraftNight(s: GameState, input: CreateInput): void {
  const p = s.player;
  const r = ownRng(s.seed, input);
  // a junior or a senior, done growing: the height he was always going to reach, the wingspan with it
  p.age = D.ages[weightedIndex(r, D.ages.map((a) => a[1]))][0];
  p.wingspan += p.fullHeight - p.height;
  p.height = p.heightProj = p.fullHeight;
  settleWeight(p);
  // his OVR tonight; his potential stays the one he was made with unless it is below what the
  // growth curve gives a player that good at his age (give or take), or leaves him no room to grow
  const ovr = range(r, D.ovr[0], D.ovr[1]);
  const card = input.attrs ?? ARCHETYPES[input.pos][input.archetype].attrs;
  p.potential = Math.min(99, Math.max(p.potential, ovr + D.potRoom, potentialFor(ovr, p.age) + (ARCH_CEILING[p.archetype] ?? 0) + normal(r, 0, D.potSd)));
  for (const k of ATTRS) p.caps[k] = clamp(p.potential + (card[k] - 40) * CAP_FROM_START, 30, CAP_MAX);
  p.attrs = grownAttrs(p, ovr);
  p.startAttrs = { ...p.attrs };
  p.peakOvr = ovrOf(p.attrs, p.pos);
  // the seasons he did not play here still happened: reps at the line, wear on the body
  for (let age = 15; age <= p.age; age++) addTouch(p, seasonTouch(age));
  p.wear = D.wear;
  updateScouting(r, p);
  // the program he led
  const tier = D.tiers[weightedIndex(r, D.tiers.map((t) => t[1]))][0];
  const college = pick(r, COLLEGES.filter((c) => c.tier === tier));
  // the mock drafts: the better he is, the nearer the top
  const best = (D.ovr[1] - ovr) / (D.ovr[1] - D.ovr[0]);
  let proj = 0;
  for (let tries = 0; tries < 12 && (proj < 1 || proj > D.firstRound); tries++) proj = Math.round(1 + (D.firstRound - 1) * best + normal(r, 0, D.pickSd));
  proj = clamp(proj, 1, D.firstRound);
  const mock: [number, number] = [Math.max(1, proj - int(r, D.mockSpread[0], D.mockSpread[1])), Math.min(D.firstRound, proj + int(r, D.mockSpread[0], D.mockSpread[1]))];
  p.rep = D.rep.last + ((D.rep.top - D.rep.last) * (D.firstRound - proj)) / (D.firstRound - 1);
  s.stage = 'NCAA';
  s.hsYear = 4;
  s.ncaaYear = p.age - 18;
  s.teamId = college.name;
  s.declared = true;
  // the league, built as at the end of a senior year (career/season.ts), on the league's stream
  const career = s.rng;
  s.rng = worldRng(s.seed);
  s.nba = buildNba(s, s.year);
  warmUpNba(s, 12);
  quickNbaSeason(s);
  const year = s.year + 1;
  const senior = s.ncaaYear >= 4;
  pushMoment(s, {
    kind: 'intro',
    title: college.name,
    color: college.color,
    text: `Draft night. ${p.name} was the first option at ${college.name}, and after ${senior ? 'four' : 'three'} seasons there he has declared for the ${year} NBA Draft.`,
    lines: [
      `Mock drafts have him going ${mock[0]}–${mock[1]}, in the first round`,
      `A ${p.age}-year-old ${senior ? 'senior' : 'junior'} ${NAMES.pos[p.pos].toLowerCase()}, ${ft(p.height)}, OVR ${Math.round(ovr)}`,
      'The rest of your class is in this draft too, every one of them a first option projected in the first round',
      ...rareLines(p, true),
    ],
  });
  logDecision(s, 'start', `Declared for the ${year} NBA Draft after ${senior ? 'four' : 'three'} seasons as the first option at ${college.name}, a ${input.pos}, ${p.archetype}.`);
  doDraft(s, draftNightPreview(s, proj, mock, D.firstRound));
  // from the pick on, the career goes on with the stream it started with
  s.rng = career;
  s.year = year;
  beginSeason(s);
}
