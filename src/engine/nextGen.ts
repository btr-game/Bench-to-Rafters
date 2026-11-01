// The next generation (round 32). Owner: "when retiring and completing the storyline of having a
// child ... this part of the game will always be in comet mode. the child is going to have similar
// attributes to the father ... never let the child have another generation ... the child won't have
// a player card of his own, but let's add a mini-addon to the father's player card that shows the
// child's legacy ... their legacy points count towards the father's legacy points, but not fully".
//
// After a career whose Love storyline ended in a child (flags.child), the child's career can be
// played at Comet speed (fast break and sim locked on, the few big calls left to the player), on
// the father's difficulty. Built from the father: his height and potential with a little variance
// and a rare big jump either way (worse more often than better), his country and hometown, his look
// with a new haircut. The child's career is never logged on its own and never starts a family.

import { ARCHETYPES } from './player/archetypes';
import { ATTRS, CAP_MAX, HEIGHT_RANGE, NEXT_GEN as N, POSITIONS } from './balance';
import { FIRST_NAMES } from '../content/names';
import { LOOK_STYLES } from '../content/looks';
import { chance, clamp, int, makeRng, normal, pick } from './rng';
import { newGame } from './flow';
import { count, nbaTitles } from './awards/legacy';
import type { AttrKey, ChildLegacy, GameState, Pos } from './types';
import type { CareerRecord } from './career/record';

/** A finished career whose child's career has not been played yet. */
export const canPlayChild = (g: GameState): boolean => g.step === 'retired' && !!g.flags.child && !g.flags.gen2 && !g.flags.childPlayed;

/** The child's seed, from his father's (the same child every time the father's save is looked at). */
export const childSeed = (father: GameState): number => (Math.imul(father.seed ^ 0x5bd1e995, 0x27d4eb2d) >>> 1) % 2 ** 31;

/** The position his height fits best. */
function posFor(height: number): Pos {
  const mid = (p: Pos) => (HEIGHT_RANGE[p][0] + HEIGHT_RANGE[p][1]) / 2;
  return [...POSITIONS].sort((a, b) => Math.abs(mid(a) - height) - Math.abs(mid(b) - height))[0];
}

/** The child's career, ready to start (the store gives it a slot of its own). */
export function childGame(father: GameState, seed: number, recId: string, legacy: number, slot?: string): GameState {
  const fp = father.player;
  const r = makeRng(seed ^ 0x9e3779b9);
  // height: his, give or take, and now and then a lot more or less
  let height = Math.round(fp.fullHeight + normal(r, 0, N.heightSd));
  if (chance(r, N.jump)) height += (chance(r, 0.5) ? 1 : -1) * int(r, N.jumpIn[0], N.jumpIn[1]);
  height = clamp(height, 68, 90);
  const pos = posFor(height);
  const archetype = int(r, 0, ARCHETYPES[pos].length - 1);
  const card = ARCHETYPES[pos][archetype].attrs;
  const focus = [...ATTRS].sort((a, b) => card[b] - card[a]).slice(0, 2) as AttrKey[];
  const [firstOfDad, ...rest] = fp.name.split(' ');
  const surname = rest.length ? rest.join(' ') : firstOfDad;
  const first = pick(r, FIRST_NAMES.filter((n) => n !== firstOfDad));
  // his look, with a haircut of the kid's own
  const look = fp.look ? { ...fp.look, style: chance(r, 0.6) ? pick(r, LOOK_STYLES) : fp.look.style, face: 'none' as const } : undefined;
  const g = newGame(seed, {
    name: `${first} ${surname}`,
    number: fp.number,
    pos,
    archetype,
    focus,
    hand: chance(r, 0.85) ? fp.hand : fp.hand === 'R' ? 'L' : 'R',
    mode: father.mode === 'lab' ? 'standard' : father.mode,
    height,
    hometown: fp.hometown,
    country: fp.country,
    highSchool: fp.highSchool,
    ...(look ? { look } : {}),
  });
  // potential: his, a little lower on average, now and then far off (more often down than up)
  let pot = fp.potential + N.potShift + normal(r, 0, N.potSd);
  if (chance(r, N.potJump)) pot += (chance(r, N.potUp) ? 1 : -1) * int(r, N.potJumpSize[0], N.potJumpSize[1]);
  const p = g.player;
  const was = p.potential;
  p.potential = clamp(Math.round(pot), 40, 99);
  for (const k of ATTRS) p.caps[k] = clamp(p.caps[k] + (p.potential - was), 30, CAP_MAX);
  // Comet speed for the whole career, and no family of his own
  g.flags.gen2 = 1;
  g.flags.fast = 1;
  g.flags.sim = 1;
  g.flags.comet = 1;
  g.parent = { name: fp.name, recId, legacy, ...(slot ? { slot } : {}), peak: Math.round(fp.peakOvr), titles: nbaTitles(father), mvps: count(father, 'MVP') };
  return g;
}

/** The child's legacy, from his career record. */
export function childLegacy(rec: CareerRecord): ChildLegacy {
  return {
    name: rec.name,
    peak: Math.round(rec.peak),
    best: rec.honours[0]?.text ?? rec.tier,
    nbaSeasons: rec.nbaSeasons,
    nbaPoints: rec.nbaPoints,
    mvps: rec.mvps,
    titles: rec.titles,
    allStars: rec.allStars,
    legacy: rec.legacy,
    adds: Math.round(rec.legacy * N.share * 10) / 10,
  };
}
