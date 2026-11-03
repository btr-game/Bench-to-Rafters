// Career-changing swings (playtest round 7), rolled once per offseason:
// - The leap: a rare jump that changes what a young player can become (19 to 24 since round 36),
//   the kind that turns a G League player into an All-Star. His ceiling rises, he improves faster
//   from then on, and he takes a big step right away.
// - The next step (round 36): the same kind of jump later in a career, from 25 to 33, and bigger.
// - The tragedy: a rare devastating injury, likelier for fragile, worn-down bodies. Since round 36
//   it takes a season or two and he is never the same player: his ratings and his ceiling fall hard.

import { ATTR_MAX, ATTRS, GROWTH_RATE, LEVELS, OFFSEASON_DAYS, SWINGS } from '../balance';
import { chance, clamp, int, range } from '../rng';
import type { GameState } from '../types';
import { ovrOf } from '../player/ovr';
import { adjust, logDecision, pushMoment } from './common';

/** A jump in his ratings and his ceiling, for the leap and the next step. */
function jump(s: GameState, J: { ceiling: [number, number]; now: [number, number]; rateMult: number }): [number, number] {
  const p = s.player;
  const before = ovrOf(p.attrs, p.pos);
  const lift = int(s.rng, J.ceiling[0], J.ceiling[1]);
  p.potential = Math.min(99, p.potential + lift);
  for (const k of ATTRS) p.caps[k] = Math.min(ATTR_MAX, p.caps[k] + lift);
  p.growthRate = Math.min(GROWTH_RATE.max, (p.growthRate ?? 1) * J.rateMult);
  const step = range(s.rng, J.now[0], J.now[1]);
  for (const k of ATTRS) p.attrs[k] = Math.min(p.caps[k], p.attrs[k] + step);
  p.morale = adjust(p.morale, 15);
  return [before, ovrOf(p.attrs, p.pos)];
}

export function rollSwings(s: GameState): void {
  const p = s.player;
  if (s.stage === 'RETIRED') return;
  const rate = p.growthRate ?? 1;
  const L = SWINGS.leap;
  if (p.age >= L.minAge && p.age <= L.maxAge && chance(s.rng, L.chance * rate)) {
    const [before, after] = jump(s, L);
    logDecision(s, 'leap', `Took a career-changing leap: OVR ${Math.round(before)} to ${Math.round(after)}, and a much higher ceiling.`);
    pushMoment(s, {
      kind: 'event',
      title: 'The leap',
      color: '#B8860B',
      text: `Something changed this summer. The game slowed down, the body caught up, and ${p.name} came back a different player: the kind of jump that turns overlooked players into stars.`,
      lines: [`OVR ${Math.round(before)} → ${Math.round(after)}`, 'His ceiling is much higher now', 'He will keep improving faster'],
    });
    return;
  }
  const N = SWINGS.nextStep;
  if (p.age >= N.minAge && p.age <= N.maxAge && !s.flags.nextStep && chance(s.rng, N.chance)) {
    const [before, after] = jump(s, N);
    s.flags.nextStep = s.year;
    logDecision(s, 'nextStep', `Took the next step at ${p.age}: OVR ${Math.round(before)} to ${Math.round(after)}, and a higher ceiling than anyone saw coming.`);
    pushMoment(s, {
      kind: 'event',
      title: 'The next step',
      color: '#8A5A00',
      text: `Most players are who they are by ${p.age}. ${p.name} spent the summer rebuilding his game from the floor up, and came back to camp a different level of player: the jump almost nobody makes this late.`,
      lines: [`OVR ${Math.round(before)} → ${Math.round(after)}`, 'A bigger jump than any breakthrough', 'His ceiling rose with it'],
    });
    return;
  }
  const T = SWINGS.tragedy;
  const wear = p.wear ?? 0;
  if (p.age >= T.minAge && !(p.injury && p.injury.key === 'season') && chance(s.rng, T.chance * p.durability * (1 + wear / T.wearDiv))) {
    const before = ovrOf(p.attrs, p.pos);
    const hit = (k: (typeof ATTRS)[number], r: [number, number]) => (p.attrs[k] = clamp(p.attrs[k] - int(s.rng, r[0], r[1]), 5, ATTR_MAX));
    hit('ATH', T.ath);
    for (const k of ['FIN', 'PER', 'REB', 'INT'] as const) hit(k, T.other);
    for (const k of ['SHT', 'PLY', 'IQ'] as const) hit(k, T.minor);
    // the ceiling falls with him: every rating's, and his potential
    for (const k of ATTRS) p.caps[k] = Math.max(30, p.caps[k] - int(s.rng, T.caps[0], T.caps[1]));
    p.potential = Math.max(30, p.potential - int(s.rng, T.potential[0], T.potential[1]));
    p.durability = Math.round((p.durability + T.durability) * 100) / 100;
    p.growthRate = Math.max(GROWTH_RATE.min, rate * T.rateMult);
    p.wear = Math.min(100, wear + T.wear);
    p.morale = adjust(p.morale, -25);
    // one season gone, or two: this summer, the season, and for two another summer and season
    const two = chance(s.rng, T.twoSeasons);
    const season = LEVELS[s.stage === 'HS' ? 'HSV' : (s.stage as keyof typeof LEVELS)]?.seasonDays ?? LEVELS.NBA.seasonDays;
    p.injury = { key: 'season', name: 'Torn ACL, meniscus and MCL', daysOut: (OFFSEASON_DAYS + season) * (two ? 2 : 1) - 5 };
    s.flags.careerInjury = s.year;
    const after = ovrOf(p.attrs, p.pos);
    logDecision(s, 'tragedy', `Tore his ACL, meniscus and MCL in a summer workout: ${two ? 'two seasons' : 'a season'} gone, OVR ${Math.round(before)} to ${Math.round(after)}.`);
    pushMoment(s, {
      kind: 'injury',
      title: 'Everything changes',
      color: '#5a1a1a',
      text: `A routine drive in a summer workout. ${p.name} plants, the knee gives, and the gym goes silent. Torn ACL, meniscus and MCL: ${two ? 'the next two seasons' : 'the whole of next season'} gone, and the player who comes back will not be the one who went down.`,
      lines: [`OVR ${Math.round(before)} → ${Math.round(after)}`, two ? 'Out for two seasons' : 'Out for a season', 'His ceiling fell with him', 'More injury-prone from now on'],
    });
  }
}
