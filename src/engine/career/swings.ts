// Career-changing swings (playtest round 7), rolled once per offseason:
// - The leap: a rare jump that changes what a player can become, the kind that turns a G
//   League player into an All-Star or a late second-round pick into an MVP. His ceiling
//   rises, he improves faster from then on, and he takes a big step right away.
// - The tragedy: a rare devastating injury that takes a player's explosiveness for good.
//   It is likelier for fragile, worn-down bodies.

import { ATTR_MAX, ATTRS, GROWTH_RATE, SWINGS } from '../balance';
import { chance, clamp, int, range } from '../rng';
import type { GameState } from '../types';
import { ovrOf } from '../player/ovr';
import { adjust, logDecision, pushMoment } from './common';

export function rollSwings(s: GameState): void {
  const p = s.player;
  if (s.stage === 'RETIRED') return;
  const rate = p.growthRate ?? 1;
  const L = SWINGS.leap;
  if (p.age >= L.minAge && p.age <= L.maxAge && chance(s.rng, L.chance * rate)) {
    const before = ovrOf(p.attrs, p.pos);
    const lift = int(s.rng, L.ceiling[0], L.ceiling[1]);
    p.potential = Math.min(99, p.potential + lift);
    for (const k of ATTRS) p.caps[k] = Math.min(ATTR_MAX, p.caps[k] + lift);
    p.growthRate = Math.min(GROWTH_RATE.max, rate * L.rateMult);
    const step = range(s.rng, L.now[0], L.now[1]);
    for (const k of ATTRS) p.attrs[k] = Math.min(p.caps[k], p.attrs[k] + step);
    p.morale = adjust(p.morale, 15);
    const after = ovrOf(p.attrs, p.pos);
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
  const T = SWINGS.tragedy;
  const wear = p.wear ?? 0;
  if (p.age >= T.minAge && !(p.injury && p.injury.key === 'season') && chance(s.rng, T.chance * p.durability * (1 + wear / T.wearDiv))) {
    const before = ovrOf(p.attrs, p.pos);
    p.attrs.ATH = clamp(p.attrs.ATH - int(s.rng, T.ath[0], T.ath[1]), 5, ATTR_MAX);
    p.attrs.FIN = clamp(p.attrs.FIN - int(s.rng, T.other[0], T.other[1]), 5, ATTR_MAX);
    p.attrs.PER = clamp(p.attrs.PER - int(s.rng, T.other[0], T.other[1]), 5, ATTR_MAX);
    for (const k of ['ATH', 'FIN', 'PER'] as const) p.caps[k] = Math.max(30, p.caps[k] - int(s.rng, T.caps[0], T.caps[1]));
    p.durability = Math.round((p.durability + T.durability) * 100) / 100;
    p.growthRate = Math.max(GROWTH_RATE.min, rate * T.rateMult);
    p.wear = Math.min(100, wear + T.wear);
    p.morale = adjust(p.morale, -20);
    p.injury = { key: 'season', name: 'Torn ACL and meniscus', daysOut: T.daysOut };
    const after = ovrOf(p.attrs, p.pos);
    logDecision(s, 'tragedy', `Tore his ACL and meniscus in a summer workout: OVR ${Math.round(before)} to ${Math.round(after)}.`);
    pushMoment(s, {
      kind: 'injury',
      title: 'Everything changes',
      color: '#5a1a1a',
      text: `A routine drive in a summer workout. ${p.name} plants, the knee gives, and the gym goes silent. Torn ACL and meniscus: most of next season gone, and the explosiveness may never fully come back.`,
      lines: [`OVR ${Math.round(before)} → ${Math.round(after)}`, 'Athleticism and its ceiling cut sharply', 'More injury-prone from now on'],
    });
  }
}
