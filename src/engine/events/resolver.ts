import { EVENTS as EV_RATES } from '../balance';
import { chance, weightedIndex } from '../rng';
import type { Decision, GameState } from '../types';
import { logDecision, pushDecision } from '../career/common';
import { EVENTS, type EventChoice, type EventDef } from './defs';

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

function push(s: GameState, e: EventDef): void {
  const choices = typeof e.choices === 'function' ? e.choices(s) : e.choices;
  s.events.lastSeen[e.id] = s.year;
  if (e.oncePerCareer) s.events.once.push(e.id);
  pushDecision(s, {
    kind: 'event',
    title: e.title,
    text: typeof e.text === 'function' ? e.text(s) : e.text,
    choices: choices.map((c, i) => ({ id: String(i), label: c.label, detail: c.detail, shownOdds: c.shownOdds })),
    data: { eventId: e.id },
  });
}

function pickOne(s: GameState, phase: 'mid' | 'off'): void {
  const list = eligible(s, phase);
  if (list.length === 0) return;
  push(s, list[weightedIndex(s.rng, list.map((e) => e.weight))]);
}

export function queueMidseasonEvents(s: GameState): void {
  if (!chance(s.rng, EV_RATES.midseasonChance)) return;
  pickOne(s, 'mid');
  if (EV_RATES.midseasonMax > 1 && chance(s.rng, 0.25)) pickOne(s, 'mid');
}

export function queueOffseasonEvent(s: GameState): void {
  if (EV_RATES.offseasonMax < 1 || !chance(s.rng, EV_RATES.offseasonChance)) return;
  pickOne(s, 'off');
}

export function resolveEvent(s: GameState, d: Decision, choiceId: string): string {
  const e = EVENTS.find((x) => x.id === d.data?.eventId);
  if (!e) return '';
  // choices built from a function are rebuilt and matched by label
  const choices: EventChoice[] = typeof e.choices === 'function' ? e.choices(s) : e.choices;
  const label = d.choices.find((x) => x.id === choiceId)?.label;
  const c = choices.find((x) => x.label === label) ?? choices[choices.length - 1];
  if (!c) return '';
  const res = c.resolve(s, s.rng);
  logDecision(s, 'event', res.log ?? `${e.title}: ${c.label}.`);
  return res.outcome;
}
