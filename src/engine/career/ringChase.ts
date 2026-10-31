// The ring chaser (round 15: "when the AI suggests retiring or one last chance, it should also
// suggest a smaller role that helps win championships"). A veteran past his best can reinvent
// himself as a specialist: his best skill gets sharper, the parts of his game the role does not
// use fade, his archetype becomes the role, and title contenders offer him a minimum deal.

import { RING_CHASE as RC } from '../balance';
import { clamp, shuffle } from '../rng';
import type { AttrKey, Decision, GameState, Offer } from '../types';
import { NAMES } from '../../content/strings';
import { logDecision, userOvr } from './common';
import { minSalary } from '../economy/salary';
import { nbaOffer, offerChoice } from './offers';

interface ChaserRole {
  name: string;
  text: string;
  up: Partial<Record<AttrKey, number>>;
  down: Partial<Record<AttrKey, number>>;
  range?: number;
}

export type ChaserKey = 'shooter' | 'stopper' | 'playmaker' | 'glass' | 'scorer' | 'leader';

/**
 * The specialist roles (round 20: six, picked from cards; the three that suit him best are
 * offered). `fit` says how well his ratings suit the role.
 */
export const CHASER_ROLES: Record<ChaserKey, ChaserRole & { fit: (a: Record<AttrKey, number>) => number }> = {
  // round 15 follow-up: a role gives up what it will not use, not automatically athleticism or
  // defense (a defensive specialist keeps both and sharpens his defense)
  shooter: { name: 'Floor spacer', text: 'Stand in the corner, make them pay for helping.', up: { SHT: 6, IQ: 1 }, down: { FIN: 3, PLY: 3, REB: 2 }, range: 8, fit: (a) => a.SHT },
  stopper: { name: 'Defensive specialist', text: 'Guard the other team\u2019s best player for 20 minutes a night.', up: { PER: 5, INT: 4, ATH: 1 }, down: { SHT: 3, FIN: 3, PLY: 3 }, fit: (a) => Math.max(a.PER, a.INT) - 1 },
  playmaker: { name: 'Veteran playmaker', text: 'Run the second unit and settle everyone down.', up: { PLY: 5, IQ: 5 }, down: { FIN: 3, REB: 3, ATH: 2 }, fit: (a) => (a.PLY + a.IQ) / 2 },
  glass: { name: 'Rebounding big', text: 'Box out, set screens, win the possession game.', up: { REB: 6, INT: 3 }, down: { SHT: 3, PLY: 3, FIN: 1 }, fit: (a) => a.REB - 1 },
  scorer: { name: 'Bench scorer', text: 'Come off the bench and get buckets for ten minutes at a time.', up: { SHT: 3, FIN: 4 }, down: { PER: 3, REB: 2, INT: 2 }, fit: (a) => (a.SHT + a.FIN) / 2 - 2 },
  leader: { name: 'Veteran leader', text: 'Fewer minutes, more voice: the coach on the floor and the calm in the huddle.', up: { IQ: 7, PLY: 2 }, down: { ATH: 3, FIN: 2, REB: 2 }, fit: (a) => a.IQ - 3 },
};

/** The roles that suit him best, best first. */
function chaserRolesFor(s: GameState, n = 3): ChaserKey[] {
  const a = s.player.attrs;
  return (Object.keys(CHASER_ROLES) as ChaserKey[]).sort((x, y) => CHASER_ROLES[y].fit(a) - CHASER_ROLES[x].fit(a)).slice(0, n);
}

export const chaserRoleFor = (s: GameState): ChaserRole => CHASER_ROLES[chaserRolesFor(s, 1)[0]];

/** Offered at the retirement prompt and with the last-chance offers, to former NBA players. */
export function canChaseRing(s: GameState): boolean {
  const ovr = userOvr(s);
  // round 22: a former star can still sell his experience a little below the usual bar
  const enough = ovr >= RC.minOvr || (s.player.peakOvr >= RC.starPeak && ovr >= RC.starMinOvr);
  return !!s.nba && s.nbaGames > 0 && !s.player.ringChaser && enough && s.player.age <= RC.maxAge;
}

export const ringChaseChoice = () => ({
  id: 'ringchase',
  label: 'Become a veteran specialist: chase a ring',
  detail: 'Reinvent your game for a contender: pick the role next. Your best skill gets sharper, what the role does not use fades for good.',
});

/** The role cards: the three roles that suit him best. */
export function chaserRoleDecision(s: GameState): Omit<Decision, 'id'> {
  const name = (k: string) => NAMES.attr[k as AttrKey].toLowerCase();
  return {
    kind: 'chaserRole',
    title: 'Pick your role',
    text: 'Contenders want a specialist, not a star. These are the roles your game suits best.',
    choices: chaserRolesFor(s).map((k) => {
      const r = CHASER_ROLES[k];
      return { id: k, label: r.name, detail: `${r.text} Sharper: ${Object.keys(r.up).map(name).join(', ')}. Fades: ${Object.keys(r.down).map(name).join(', ')}.` };
    }),
  };
}

/** Remakes his game around the role; returns the contenders' offers as the next decision. */
export function becomeRingChaser(s: GameState, key?: ChaserKey): Omit<Decision, 'id'> {
  const p = s.player;
  const r = key && CHASER_ROLES[key] ? CHASER_ROLES[key] : chaserRoleFor(s);
  for (const [k, v] of Object.entries(r.up) as [AttrKey, number][]) {
    p.attrs[k] = clamp(p.attrs[k] + v, 15, 99);
    p.caps[k] = Math.max(p.caps[k], p.attrs[k]);
  }
  for (const [k, v] of Object.entries(r.down) as [AttrKey, number][]) p.attrs[k] = clamp(p.attrs[k] - v, 15, 99);
  if (r.range) p.range = clamp(p.range + r.range, 0, 99);
  p.archetype = r.name;
  p.ringChaser = r.name;
  logDecision(s, 'ringchase', `Reinvented himself as a ${r.name.toLowerCase()} to chase a ring.`);
  const nba = s.nba!;
  // round 22: the very best teams rarely need him; the calls come from good teams a step below
  const contenders = shuffle(s.rng, [...nba.teams].sort((a, b) => b.strength - a.strength).slice(RC.from, RC.from + RC.contenders).filter((t) => t.id !== s.teamId));
  const offers: Offer[] = contenders.slice(0, RC.offers).map((t) => nbaOffer(s, t, 'rotation', minSalary(s.year + 1, s.serviceYears), 1, 'min', `Ring chase: ${r.name.toLowerCase()} off the bench`));
  return {
    kind: 'offers',
    title: 'Contenders call',
    text: `Word is out: you will take less money and a smaller role for a shot at a title. These contenders want a ${r.name.toLowerCase()}.`,
    choices: [...offers.map(offerChoice), { id: 'retire', label: 'Retire after all', detail: 'Hang them up.' }],
    data: { offers, context: 'fa' },
  };
}
