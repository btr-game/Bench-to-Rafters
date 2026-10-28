// The event director (playtest round 7: "the pathway, archetype, focus and position should
// contribute to the events that occur"). A small model that picks turning points to fit the
// player.
//
// 1. It learns what each event does. The first time an event comes up, every choice is played
//    out on a throwaway copy of the game with a neutral player (all ratings 50), and the
//    ratings each choice raises are averaged into the event's profile. Profiles are cached.
// 2. It scores what the player needs. Each rating gets a weight from his focus stats, the
//    signature ratings of his archetype, how much his position leans on it (the OVR weights),
//    and whether it is one of his weakest; ratings that are already near the cap count less.
// 3. An event's weight is multiplied by how well its profile matches those needs (0.55x to
//    2.2x), and by 1.35 when the event belongs to the road he is on (a league abroad, college).
// The reason behind a pick is kept, so the screen can say why the event fits.

import { ATTRS, OVR_WEIGHTS } from '../balance';
import { clamp, makeRng } from '../rng';
import type { AttrKey, GameState } from '../types';
import { ARCHETYPES } from '../player/archetypes';
import { NAMES } from '../../content/strings';
import type { EventChoice, EventDef } from './defs';

type Profile = Partial<Record<AttrKey, number>>;
const PROFILES = new Map<string, Profile>();

const W = { focus: 1, archetype: 0.6, position: 3.5, weak: 0.5, near: -0.7, maxed: -2, slope: 0.8, min: 0.55, max: 2.2, road: 1.35 };

/** What an event does to ratings, learned by playing each choice on a throwaway copy. */
export function profileOf(s: GameState, e: EventDef): Profile {
  const hit = PROFILES.get(e.id);
  if (hit) return hit;
  const prof: Profile = {};
  let n = 0;
  try {
    const choices: EventChoice[] = typeof e.choices === 'function' ? e.choices(s) : e.choices;
    choices.forEach((c, i) => {
      const t: GameState = {
        ...s,
        player: { ...structuredClone(s.player), injury: null },
        flags: { ...s.flags },
        pending: [],
        moments: [],
        log: [],
        events: structuredClone(s.events),
        season: s.season ? structuredClone(s.season) : null,
        contract: s.contract ? { ...s.contract } : null,
        arcs: s.arcs ? structuredClone(s.arcs) : undefined,
        rng: makeRng(7919 * (i + 1) + e.id.length),
      };
      for (const k of ATTRS) {
        t.player.attrs[k] = 50;
        t.player.caps[k] = 99;
      }
      c.resolve(t, t.rng);
      for (const k of ATTRS) {
        const d = t.player.attrs[k] - 50;
        if (d > 0) prof[k] = (prof[k] ?? 0) + d;
      }
      n++;
    });
  } catch {
    // an event that cannot run on a copy just gets a neutral profile
  }
  for (const k of ATTRS) if (prof[k]) prof[k] = prof[k]! / Math.max(1, n);
  PROFILES.set(e.id, prof);
  return prof;
}

/** How much the player could use each rating right now. */
export function needs(s: GameState): { need: Record<AttrKey, number>; why: Record<AttrKey, string> } {
  const p = s.player;
  const arch = ARCHETYPES[p.pos].find((a) => a.name === p.archetype) ?? ARCHETYPES[p.pos][0];
  const mean = ATTRS.reduce((t, k) => t + arch.attrs[k], 0) / ATTRS.length;
  const signature = [...ATTRS].sort((a, b) => arch.attrs[b] - arch.attrs[a]).slice(0, 3).filter((k) => arch.attrs[k] > mean);
  const weakest = [...ATTRS].sort((a, b) => p.attrs[a] - p.attrs[b]).slice(0, 2);
  const need = {} as Record<AttrKey, number>;
  const why = {} as Record<AttrKey, string>;
  for (const k of ATTRS) {
    const parts: [number, string][] = [
      [p.focus.includes(k) ? W.focus : 0, 'your focus'],
      [signature.includes(k) ? W.archetype : 0, `a ${p.archetype.toLowerCase()} staple`],
      [OVR_WEIGHTS[p.pos][k] * W.position, `key for a ${NAMES.pos[p.pos].toLowerCase()}`],
      [weakest.includes(k) ? W.weak : 0, 'a weak spot'],
    ];
    let v = parts.reduce((t, [x]) => t + x, 0);
    if (p.attrs[k] >= 95) v += W.maxed;
    else if (p.attrs[k] >= 90) v += W.near;
    need[k] = v;
    why[k] = parts.sort((a, b) => b[0] - a[0])[0][1];
  }
  return { need, why };
}

/** Weight multiplier for an event, and the reason it fits (empty when it is neutral). */
export function fitOf(s: GameState, e: EventDef, n = needs(s)): { mult: number; reason: string } {
  const prof = profileOf(s, e);
  const total = ATTRS.reduce((t, k) => t + (prof[k] ?? 0), 0);
  let mult = 1;
  let reason = '';
  if (total >= 1) {
    const score = ATTRS.reduce((t, k) => t + (prof[k] ?? 0) * n.need[k], 0) / total;
    mult = clamp(Math.exp(W.slope * (score - 1)), W.min, W.max);
    const top = [...ATTRS].filter((k) => prof[k]).sort((a, b) => (prof[b] ?? 0) * n.need[b] - (prof[a] ?? 0) * n.need[a])[0];
    if (mult > 1.15 && top) reason = `Builds ${NAMES.attr[top].toLowerCase()}: ${n.why[top]}`;
  }
  // events that belong to the road he is on
  if (e.stages.length <= 2 && e.stages.includes(s.stage)) {
    mult *= W.road;
    reason ||= s.stage === 'EU' || s.stage === 'INT' ? 'Part of life abroad' : s.stage === 'NCAA' ? 'Part of college life' : '';
  }
  return { mult, reason };
}
