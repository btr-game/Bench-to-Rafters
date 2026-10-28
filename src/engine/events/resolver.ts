import { EVENTS as EV_RATES } from '../balance';
import { chance, weightedIndex } from '../rng';
import type { Decision, GameState } from '../types';
import { logDecision, pushDecision } from '../career/common';
import { EVENTS as BASE_EVENTS, type EventChoice, type EventDef } from './defs';
import { MORE_EVENTS } from './more';
import { RISK_EVENTS } from './risks';
import { GROWTH_EVENTS } from './growthEvents';
import { SKILL_EVENTS } from './skillEvents';
import { ARC_EVENTS } from './arcs';
import { ROUND9_EVENTS } from './round9';
import { fitOf, needs } from './director';
import { changes, snap, vary } from './outcome';
import { rollTier, tierFactors, tierLine, TIERS, twists, type Tier } from './twists';

const EVENTS: EventDef[] = [...BASE_EVENTS, ...MORE_EVENTS, ...RISK_EVENTS, ...GROWTH_EVENTS, ...SKILL_EVENTS, ...ARC_EVENTS, ...ROUND9_EVENTS];

function eligible(s: GameState, phase: 'mid' | 'off'): EventDef[] {
  return EVENTS.filter((e) => {
    if (!e.stages.includes(s.stage)) return false;
    if (e.phase !== 'both' && e.phase !== phase) return false;
    if (e.oncePerCareer && s.events.once.includes(e.id)) return false;
    const last = s.events.lastSeen[e.id];
    if (last !== undefined && s.year - last < e.cooldownSeasons) return false;
    if (s.pending.some((d) => d.kind === 'event' && d.data?.eventId === e.id)) return false;
    return e.when ? e.when(s) : true;
  });
}

/** Risk level shown on a choice: from its odds when it has them, or its wording. */
function riskOf(c: EventChoice): 'Low' | 'Medium' | 'High' | undefined {
  if (c.shownOdds !== undefined) return c.shownOdds >= 0.6 ? 'Low' : c.shownOdds >= 0.4 ? 'Medium' : 'High';
  if (c.detail && /high risk/i.test(c.detail)) return 'High';
  if (c.detail && /risky/i.test(c.detail)) return 'Medium';
  return undefined;
}

function push(s: GameState, e: EventDef, reason = ''): void {
  const choices = typeof e.choices === 'function' ? e.choices(s) : e.choices;
  s.events.lastSeen[e.id] = s.year;
  if (e.oncePerCareer) s.events.once.push(e.id);
  pushDecision(s, {
    kind: 'event',
    title: e.title,
    text: typeof e.text === 'function' ? e.text(s) : e.text,
    choices: choices.map((c, i) => ({ id: String(i), label: c.label, detail: c.detail, risk: riskOf(c) })),
    data: { eventId: e.id, ...(reason ? { fit: reason } : {}) },
  });
}

function pickOne(s: GameState, phase: 'mid' | 'off'): void {
  const list = eligible(s, phase);
  if (list.length === 0) return;
  // the event director weighs each event by how well it fits this player (events/director.ts)
  const n = needs(s);
  const fits = list.map((e) => fitOf(s, e, n));
  const i = weightedIndex(s.rng, list.map((e, j) => e.weight * fits[j].mult));
  push(s, list[i], fits[i].reason);
}

export function queueMidseasonEvents(s: GameState): void {
  if (!chance(s.rng, EV_RATES.midseasonChance)) return;
  pickOne(s, 'mid');
  // fast break: at most one turning point at a time
  if (!s.flags.fast && EV_RATES.midseasonMax > 1 && chance(s.rng, EV_RATES.secondChance)) pickOne(s, 'mid');
}

export function queueOffseasonEvent(s: GameState): void {
  if (EV_RATES.offseasonMax < 1 || !chance(s.rng, EV_RATES.offseasonChance)) return;
  pickOne(s, 'off');
  if (!s.flags.fast && EV_RATES.offseasonMax > 1 && chance(s.rng, 0.35)) pickOne(s, 'off');
}

export function resolveEvent(s: GameState, d: Decision, choiceId: string): string {
  const e = EVENTS.find((x) => x.id === d.data?.eventId);
  if (!e) return '';
  // the situation may have changed since the event was queued (a new team, a new league)
  if (!e.stages.includes(s.stage)) return 'That moment passed. You have moved on.';
  // choices built from a function are rebuilt and matched by label
  const choices: EventChoice[] = typeof e.choices === 'function' ? e.choices(s) : e.choices;
  const label = d.choices.find((x) => x.id === choiceId)?.label;
  const c = choices.find((x) => x.label === label) ?? choices[choices.length - 1];
  if (!c) return '';
  const before = snap(s);
  const res = c.resolve(s, s.rng);
  // how it turns out is rolled every time: from a breakthrough to a backfire, often with a twist
  const first = changes(s, before);
  const did = first.length > 0;
  const failed = first.filter((c) => !c.good).length > first.filter((c) => c.good).length;
  const tier: Tier = did ? rollTier(s.rng, failed) : 'expected';
  const fx = tierFactors(s.rng, tier);
  vary(s, before, fx.good, fx.bad);
  const extra = did ? twists(s, tier) : [];
  logDecision(s, 'event', res.log ?? `${e.title}: ${c.label}.`);
  // a backfire replaces the hoped-for outcome with what actually happened
  const lead = did ? tierLine(s.rng, tier) : '';
  const parts = tier === 'backfired' ? [lead, ...extra] : [res.outcome, lead, ...extra];
  const text = parts.filter(Boolean).join(' ');
  s.result = { title: e.title, choice: c.label, text, changes: changes(s, before), tier: did ? TIERS[tier].label : undefined, tierKey: did ? tier : undefined };
  return text;
}
