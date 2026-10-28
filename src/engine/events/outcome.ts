// Event outcomes that differ every time (playtest round 6). An event's choice sets the kind
// of effect; how big it turns out is rolled each time it happens: every change it made is
// scaled by one factor (about 0.45x to 1.8x). The result card then lists what changed.

import { ATTRS } from '../balance';
import { clamp, normal } from '../rng';
import type { AttrKey, EventResult, GameState } from '../types';
import { NAMES } from '../../content/strings';
import { fmtMoney } from '../economy/salary';

interface Snap {
  attrs: Record<AttrKey, number>;
  morale: number;
  trust: number;
  rep: number;
  bank: number;
  range: number;
  offhand: number;
  height: number;
  growth: number;
  rate: number;
  injuryMult: number;
  decline: number;
  injuryDays: number;
  suspend: number;
}

export function snap(s: GameState): Snap {
  const p = s.player;
  return {
    attrs: { ...p.attrs },
    morale: p.morale,
    trust: p.trust,
    rep: p.rep,
    bank: p.bank,
    range: p.range,
    offhand: p.offhand,
    height: p.height,
    growth: p.growthMultNext,
    rate: p.growthRate ?? 1,
    injuryMult: p.injuryMultNext,
    decline: p.declineMultNext,
    injuryDays: p.injury?.daysOut ?? 0,
    suspend: s.flags.suspendGames ?? 0,
  };
}

/** Scales everything the choice changed by one random factor; returns the factor. */
export function vary(s: GameState, before: Snap): number {
  const p = s.player;
  const f = clamp(normal(s.rng, 1, 0.32), 0.45, 1.8);
  const scale = (b: number, a: number, lo: number, hi: number) => clamp(b + (a - b) * f, lo, hi);
  for (const k of ATTRS) if (p.attrs[k] !== before.attrs[k]) p.attrs[k] = scale(before.attrs[k], p.attrs[k], 15, 110);
  p.morale = Math.round(scale(before.morale, p.morale, 0, 100));
  p.trust = Math.round(scale(before.trust, p.trust, 0, 100));
  p.rep = scale(before.rep, p.rep, 0, 100);
  p.bank = Math.max(0, before.bank + (p.bank - before.bank) * f);
  p.range = scale(before.range, p.range, 0, 99);
  p.offhand = scale(before.offhand, p.offhand, 0, 99);
  const ratio = (b: number, a: number) => (b > 0 ? b * Math.pow(a / b, f) : a);
  p.growthMultNext = ratio(before.growth, p.growthMultNext);
  p.growthRate = clamp(ratio(before.rate, p.growthRate ?? 1), 0.5, 2.2);
  p.injuryMultNext = ratio(before.injuryMult, p.injuryMultNext);
  p.declineMultNext = ratio(before.decline, p.declineMultNext);
  if (p.injury && p.injury.daysOut !== before.injuryDays) p.injury.daysOut = Math.max(3, Math.round(before.injuryDays + (p.injury.daysOut - before.injuryDays) * f));
  const sus = s.flags.suspendGames ?? 0;
  if (sus > before.suspend) s.flags.suspendGames = before.suspend + Math.max(1, Math.round((sus - before.suspend) * f));
  return f;
}

/** What changed, for the result card: green for good news, red for bad. */
export function changes(s: GameState, before: Snap): EventResult['changes'] {
  const p = s.player;
  const out: EventResult['changes'] = [];
  const num = (label: string, d: number, goodUp = true, digits = 0) => {
    const r = Number(d.toFixed(digits));
    if (r === 0) return;
    out.push({ label, value: `${r > 0 ? '+' : ''}${r.toFixed(digits)}`, good: goodUp ? r > 0 : r < 0 });
  };
  for (const k of ATTRS) {
    const d = p.attrs[k] - before.attrs[k];
    if (Math.abs(d) >= 0.05) num(NAMES.attr[k], d, true, Math.abs(d) < 1 ? 1 : 0);
  }
  num('Morale', p.morale - before.morale);
  num('Coach trust', p.trust - before.trust);
  num('Reputation', p.rep - before.rep);
  num('Range', p.range - before.range);
  num('Weak hand', p.offhand - before.offhand);
  if (p.height !== before.height) out.push({ label: 'Height', value: `${p.height - before.height > 0 ? '+' : ''}${p.height - before.height} in`, good: true });
  const bank = p.bank - before.bank;
  if (Math.abs(bank) >= 0.0005) out.push({ label: 'Bank', value: `${bank > 0 ? '+' : '−'}${fmtMoney(Math.abs(bank))}`, good: bank > 0 });
  if (Math.abs(p.growthMultNext - before.growth) > 0.005) out.push({ label: 'Development next season', value: p.growthMultNext > before.growth ? 'faster' : 'slower', good: p.growthMultNext > before.growth });
  if (Math.abs((p.growthRate ?? 1) - before.rate) > 0.003) out.push({ label: 'Ability to improve', value: (p.growthRate ?? 1) > before.rate ? 'up' : 'down', good: (p.growthRate ?? 1) > before.rate });
  if (Math.abs(p.injuryMultNext - before.injuryMult) > 0.005) out.push({ label: 'Injury risk', value: p.injuryMultNext > before.injuryMult ? 'higher' : 'lower', good: p.injuryMultNext < before.injuryMult });
  if (Math.abs(p.declineMultNext - before.decline) > 0.005) out.push({ label: 'Aging', value: p.declineMultNext > before.decline ? 'faster' : 'slower', good: p.declineMultNext < before.decline });
  const days = (p.injury?.daysOut ?? 0) - before.injuryDays;
  if (days > 0) out.push({ label: 'Out injured', value: `${Math.max(1, Math.round(days / 7))} wk`, good: false });
  const sus = (s.flags.suspendGames ?? 0) - before.suspend;
  if (sus > 0) out.push({ label: 'Suspended', value: `${sus} games`, good: false });
  return out;
}

export function sizeNote(f: number): string {
  if (f >= 1.35) return 'It hit harder than expected.';
  if (f <= 0.7) return 'It turned out smaller than expected.';
  return '';
}
