// Round 21: the event renovation (ripples on the older events) and the new events.

import { describe, expect, it } from 'vitest';
import { newGame, prompt, choose, advance } from '../src/engine/flow';
import type { EventDef } from '../src/engine/events/defs';
import { EVENTS } from '../src/engine/events/defs';
import { MORE_EVENTS } from '../src/engine/events/more';
import { RISK_EVENTS } from '../src/engine/events/risks';
import { GROWTH_EVENTS } from '../src/engine/events/growthEvents';
import { SKILL_EVENTS } from '../src/engine/events/skillEvents';
import { ARC_EVENTS } from '../src/engine/events/arcs';
import { ROUND9_EVENTS } from '../src/engine/events/round9';
import { ROUND13_EVENTS } from '../src/engine/events/round13';
import { ROUND15_EVENTS } from '../src/engine/events/round15';
import { WEIGHT_EVENTS } from '../src/engine/events/weightEvents';
import { ROUND21_EVENTS } from '../src/engine/events/round21';
import { RIPPLES } from '../src/engine/events/ripples';

const ALL: EventDef[] = [...EVENTS, ...MORE_EVENTS, ...RISK_EVENTS, ...GROWTH_EVENTS, ...SKILL_EVENTS, ...ARC_EVENTS, ...ROUND9_EVENTS, ...ROUND13_EVENTS, ...ROUND15_EVENTS, ...WEIGHT_EVENTS, ...ROUND21_EVENTS];
const game = (seed = 21) => newGame(seed, { name: 'Round Twenty', number: 21, pos: 'PF', archetype: 0, focus: ['REB', 'INT'] });

describe('round 21 events', () => {
  it('every event has its own id (a shared id resolved as the other event)', () => {
    const ids = ALL.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every ripple belongs to a real event choice', () => {
    const s = game();
    for (const [id, byLabel] of Object.entries(RIPPLES)) {
      const e = ALL.find((x) => x.id === id);
      expect(e, id).toBeDefined();
      const labels = (typeof e!.choices === 'function' ? e!.choices(s) : e!.choices).map((c) => c.label);
      for (const label of Object.keys(byLabel)) expect(labels, `${id}: ${label}`).toContain(label);
    }
  });

  it('a renovated choice changes more than one thing, and the result card shows it', () => {
    const s = game(4);
    for (let i = 0; i < 200 && !s.season; i++) {
      const pr = prompt(s);
      if (pr.type === 'decision') choose(s, pr.decision.choices.find((c) => !c.disabled)!.id);
      else advance(s);
    }
    expect(s.season).toBeTruthy();
    s.pending.unshift({ id: 'e', kind: 'event', title: 'Party the night before a game', text: '', choices: [{ id: '0', label: 'Go' }, { id: '1', label: 'Stay in' }], data: { eventId: 'party' } });
    s.stage = 'HS';
    choose(s, '0');
    const labels = s.result!.changes.map((c) => c.label);
    expect(labels).toContain('Weight');
    expect(labels.length).toBeGreaterThanOrEqual(3);
  });

  it('the new events come up in careers', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const s = game(2100 + i);
      s.flags.simPostseason = 1;
      for (let k = 0; k < 3000; k++) {
        const pr = prompt(s);
        if (pr.type === 'retired') break;
        if (pr.type === 'decision') {
          if (pr.decision.kind === 'event') seen.add(String(pr.decision.data?.eventId));
          choose(s, pr.decision.choices.filter((c) => !c.disabled)[k % 2 ? 0 : pr.decision.choices.filter((c) => !c.disabled).length - 1].id);
        } else advance(s);
      }
    }
    const fresh = ROUND21_EVENTS.map((e) => e.id).filter((id) => seen.has(id));
    expect(fresh.length).toBeGreaterThanOrEqual(4);
  });
});
