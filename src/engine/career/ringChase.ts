// The ring chaser (round 15: "when the AI suggests retiring or one last chance, it should also
// suggest a smaller role that helps win championships"). A veteran past his best can reinvent
// himself as a specialist: his best skill gets sharper, the parts of his game the role does not
// use fade, his archetype becomes the role, and title contenders offer him a minimum deal.

import { RING_CHASE as RC } from '../balance';
import { clamp } from '../rng';
import type { AttrKey, Decision, GameState, Offer } from '../types';
import { NAMES } from '../../content/strings';
import { logDecision, userOvr } from './common';
import { minSalary } from '../economy/salary';
import { nbaOffer, offerChoice } from './offers';

export interface ChaserRole {
  name: string;
  text: string;
  up: Partial<Record<AttrKey, number>>;
  down: Partial<Record<AttrKey, number>>;
  range?: number;
}

/** The four specialist roles; his best rating decides which one he becomes. */
export const CHASER_ROLES: Record<'shooter' | 'stopper' | 'playmaker' | 'glass', ChaserRole> = {
  // round 15 follow-up: a role gives up what it will not use, not automatically athleticism or
  // defense (a defensive specialist keeps both and sharpens his defense)
  shooter: { name: 'Floor spacer', text: 'Stand in the corner, make them pay for helping.', up: { SHT: 6, IQ: 1 }, down: { FIN: 3, PLY: 3, REB: 2 }, range: 8 },
  stopper: { name: 'Defensive specialist', text: 'Guard the other team\u2019s best player for 20 minutes a night.', up: { PER: 5, INT: 4, ATH: 1 }, down: { SHT: 3, FIN: 3, PLY: 3 } },
  playmaker: { name: 'Veteran playmaker', text: 'Run the second unit and settle everyone down.', up: { PLY: 5, IQ: 5 }, down: { FIN: 3, REB: 3, ATH: 2 } },
  glass: { name: 'Rebounding big', text: 'Box out, set screens, win the possession game.', up: { REB: 6, INT: 3 }, down: { SHT: 3, PLY: 3, FIN: 1 } },
};

export function chaserRoleFor(s: GameState): ChaserRole {
  const a = s.player.attrs;
  const best: [keyof typeof CHASER_ROLES, number][] = [
    ['shooter', a.SHT],
    ['stopper', Math.max(a.PER, a.INT) - 1],
    ['playmaker', (a.PLY + a.IQ) / 2],
    ['glass', a.REB - 1],
  ];
  return CHASER_ROLES[best.sort((x, y) => y[1] - x[1])[0][0]];
}

/** Offered at the retirement prompt and with the last-chance offers, to former NBA players. */
export function canChaseRing(s: GameState): boolean {
  return !!s.nba && s.nbaGames > 0 && !s.player.ringChaser && userOvr(s) >= RC.minOvr && s.player.age <= RC.maxAge;
}

export const ringChaseChoice = (s: GameState) => {
  const r = chaserRoleFor(s);
  return {
    id: 'ringchase',
    label: `Chase a ring: become a ${r.name.toLowerCase()}`,
    detail: `${r.text} Your ${Object.keys(r.up).map((k) => NAMES.attr[k as AttrKey].toLowerCase()).join(' and ')} get sharper; ${Object.keys(r.down).map((k) => NAMES.attr[k as AttrKey].toLowerCase()).join(', ')} drop for good. Contenders call.`,
  };
};

/** Remakes his game around the role; returns the contenders' offers as the next decision. */
export function becomeRingChaser(s: GameState): Omit<Decision, 'id'> {
  const p = s.player;
  const r = chaserRoleFor(s);
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
  const contenders = [...nba.teams].sort((a, b) => b.strength - a.strength).slice(0, RC.contenders).filter((t) => t.id !== s.teamId);
  const offers: Offer[] = contenders.slice(0, RC.offers).map((t) => nbaOffer(s, t, 'rotation', minSalary(s.year + 1, s.serviceYears), 1, 'min', `Ring chase: ${r.name.toLowerCase()} off the bench`));
  return {
    kind: 'offers',
    title: 'Contenders call',
    text: `Word is out: you will take less money and a smaller role for a shot at a title. These contenders want a ${r.name.toLowerCase()}.`,
    choices: [...offers.map(offerChoice), { id: 'retire', label: 'Retire after all', detail: 'Hang them up.' }],
    data: { offers, context: 'fa' },
  };
}
