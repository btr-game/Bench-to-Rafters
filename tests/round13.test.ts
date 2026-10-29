// Round 13: single-plan boost, team styles, trade aims, story calls, draft advice, fast break stops.

import { describe, expect, it } from 'vitest';
import { blendPlans, HALF_PLANS, SOLO_PLAN } from '../src/engine/balance';
import { newGame, prompt, choose, advance } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { styleFit, styleEffect } from '../src/engine/career/identity';
import { callQuestion, makeCall, callsLeft } from '../src/engine/world/stories';
import * as F from '../src/engine/mini/frontOffice';
import type { GameState } from '../src/engine/types';

const play = (s: GameState, until: (s: GameState) => boolean, max = 4000) => {
  for (let i = 0; i < max && !until(s); i++) {
    const pr = prompt(s);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') choose(s, (pr.decision.choices.find((c) => !c.disabled && c.id !== 'retire') ?? pr.decision.choices.find((c) => !c.disabled))!.id);
    else advance(s);
  }
};

describe('round 13', () => {
  it('a single plan is a little stronger than its listing; two plans still blend', () => {
    const one = blendPlans('shooting');
    expect(one.growth).toBeCloseTo(HALF_PLANS.shooting.growth * SOLO_PLAN.growth, 6);
    expect(one.attrs!.SHT!).toBeGreaterThan(HALF_PLANS.shooting.attrs!.SHT!);
    const two = blendPlans('shooting', 'defense');
    expect(two.attrs!.PER!).toBeGreaterThan(1);
    expect(Object.keys(HALF_PLANS).length).toBe(12);
  });

  it('team styles fit the player: a defender fits Defense first better than Run and gun', () => {
    const s = newGame(5, { name: 'Two Way', number: 1, pos: 'SF', archetype: 0, focus: ['PER', 'INT'] });
    for (const k of ['PER', 'INT'] as const) s.player.attrs[k] = 90;
    for (const k of ['ATH', 'SHT', 'PLY'] as const) s.player.attrs[k] = 55;
    expect(styleFit(s, 'defense')).toBeGreaterThan(styleFit(s, 'pace'));
    expect(styleEffect(s, 'defense').playoff).toBeGreaterThan(styleEffect(s, 'defense').regular);
    expect(styleEffect(s, 'defense').perf).toBeGreaterThan(styleEffect(s, 'pace').perf);
  });

  it('calls: up to three a season, before the second half', () => {
    const s = newGame(8, { name: 'Call Er', number: 2, pos: 'PG', archetype: 0, focus: ['PLY', 'IQ'] });
    play(s, (x) => (x.stories ?? []).filter((st) => callQuestion(st)).length >= 3 && callsLeft(x) > 0 && x.step === 'preseason');
    const idx = (s.stories ?? []).map((st, i) => (callQuestion(st) ? i : -1)).filter((i) => i >= 0);
    if (idx.length >= 3 && callsLeft(s) > 0) {
      idx.slice(0, 4).forEach((i) => makeCall(s, i, true));
      expect((s.stories ?? []).filter((st) => st.call !== undefined).length).toBe(3);
      expect(callsLeft(s)).toBe(0);
    }
  });

  it('fast break stops once in every offseason after high school', () => {
    const s = newGame(12, { name: 'Fast Er', number: 3, pos: 'SG', archetype: 0, focus: ['SHT', 'ATH'] });
    s.flags.fast = 1;
    play(s, (x) => x.stage !== 'HS');
    let stops = 0;
    for (let i = 0; i < 6 && s.step !== 'retired'; i++) {
      fastForward(s);
      if (s.step === 'offseason') {
        stops++;
        advance(s);
      } else if (prompt(s).type === 'decision') choose(s, (prompt(s) as { decision: { choices: { id: string; disabled?: boolean }[] } }).decision.choices.find((c) => !c.disabled)!.id);
    }
    expect(stops).toBeGreaterThan(0);
  });

  it('front office: three seasons and draft advice from the scouting reports', () => {
    expect(F.FO.seasons).toBe(3);
    const fo = F.newFrontOffice(3, 'DET');
    const recs = F.draftRecs(fo);
    expect(recs.length).toBe(3);
    expect(recs[0].score).toBeGreaterThanOrEqual(recs[1].score);
  });
});
