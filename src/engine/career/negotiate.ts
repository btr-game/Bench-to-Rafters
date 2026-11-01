// Contract talks (round 25, the owner: "contract negotiation is good, just make sure it is
// concise"). On a pro offer he can ask for one thing at a time, twice at most: more money, one
// more year, or a bigger role. The team's patience is hidden: it grows with his reputation and
// with how much better he is than the league's average player, and every ask uses some up. The
// answer comes at once: yes, meet halfway, or the offer is pulled.

import { LEVELS, MAX_SHARE, NEGOTIATE, ROLE_ORDER } from '../balance';
import { clamp, next } from '../rng';
import { capFor, fmtMoney } from '../economy/salary';
import { logDecision, userOvr } from './common';
import { offerChoice } from './offers';
import type { GameState, Offer } from '../types';
import { talksOpen } from '../levels';

export type Ask = 'money' | 'years' | 'role';

/** Which offers he can talk about: paid contracts in a pro league that are not on a fixed scale. */
export const negotiable = (o: Offer): boolean => ['NBA', 'EU', 'INT', 'GL'].includes(o.level) && !['rookie', 'min', 'exhibit10', 'scholarship', 'walkon'].includes(o.kind) && (o.asked ?? 0) < NEGOTIATE.asks;

/** What an ask would turn the offer into (all of it). */
function asked(s: GameState, o: Offer, ask: Ask, share: number): Offer {
  if (ask === 'money') {
    const max = o.level === 'NBA' ? capFor(s.year + 1) * MAX_SHARE(s.serviceYears) : Infinity;
    return { ...o, salary: Math.round(Math.min(max, o.salary * (1 + NEGOTIATE.money * share)) * 1000) / 1000 };
  }
  if (ask === 'years') return { ...o, years: Math.min(NEGOTIATE.maxYears, o.years + (share >= 1 ? 1 : 0)) };
  const i = ROLE_ORDER.indexOf(o.role);
  return { ...o, role: share >= 1 ? ROLE_ORDER[Math.min(ROLE_ORDER.length - 1, i + 1)] : o.role };
}

/** The ask, answered: the offer as it now stands (or pulled), and what the team said. */
export function negotiate(s: GameState, offerId: string, ask: Ask): string | null {
  const d = s.pending[0];
  const offers = (d?.data?.offers as Offer[] | undefined) ?? [];
  const o = offers.find((x) => x.id === offerId);
  if (!d || d.kind !== 'offers' || !o || !negotiable(o) || !talksOpen(s)) return null;
  const avg = LEVELS[o.level].avg;
  const patience = clamp(NEGOTIATE.base + s.player.rep / NEGOTIATE.repPer + (userOvr(s) - avg) / NEGOTIATE.ovrPer - (o.asked ?? 0) * NEGOTIATE.perAsk, 0.05, 0.9);
  const roll = next(s.rng);
  let now: Offer | null;
  let said: string;
  if (roll < patience) {
    now = asked(s, o, ask, 1);
    said = ask === 'money' ? `They agree: ${fmtMoney(now.salary)} a season.` : ask === 'years' ? `They agree: ${now.years} years.` : 'They agree: a bigger role from day one.';
  } else if (roll < patience + NEGOTIATE.halfway * (1 - patience)) {
    now = asked(s, o, ask, 0.5);
    said = ask === 'money' ? `They meet you halfway: ${fmtMoney(now.salary)} a season.` : ask === 'years' ? 'They will not add a year, but the offer stands.' : 'No promises on the role, but the offer stands.';
  } else {
    now = null;
    said = `${o.teamName} pull the offer. "We wish him well."`;
  }
  const i = offers.indexOf(o);
  logDecision(s, 'talks', `${o.teamName}: ${said}`);
  if (now) {
    now.asked = (o.asked ?? 0) + 1;
    offers[i] = now;
    const ci = d.choices.findIndex((c) => c.id === o.id);
    if (ci >= 0) d.choices[ci] = offerChoice(now);
  } else {
    offers.splice(i, 1);
    d.choices = d.choices.filter((c) => c.id !== o.id);
  }
  return said;
}
