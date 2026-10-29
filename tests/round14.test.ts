// Round 14: per-mode balance dials, tab "new" keys.

import { describe, expect, it } from 'vitest';
import { modeDial, MODES } from '../src/engine/balance';
import { newGame } from '../src/engine/flow';
import { scaledReward } from '../src/engine/career/miniBonus';
import { styleEffect } from '../src/engine/career/identity';
import { tabKey } from '../src/ui/selectors';

describe('round 14', () => {
  it('Regular guy turns the mini-game rating bonus and team systems down; the other modes do not', () => {
    expect(modeDial('standard', 'mini')).toBeLessThan(1);
    expect(modeDial('standard', 'teamFx')).toBeLessThan(1);
    expect(modeDial('reality', 'mini')).toBe(1);
    expect(modeDial('stars', 'teamFx')).toBe(1);
    const reg = newGame(4, { name: 'Reg', number: 4, pos: 'SG', archetype: 0, focus: ['SHT', 'ATH'], mode: 'standard' });
    const rea = newGame(4, { name: 'Rea', number: 4, pos: 'SG', archetype: 0, focus: ['SHT', 'ATH'], mode: 'reality' });
    for (const g of [reg, rea]) g.player.attrs.SHT = 60;
    const r = { game: 'threes' as const, score: 27, won: true, own: true };
    expect(scaledReward(reg, r).attrs.SHT!).toBeLessThan(scaledReward(rea, r).attrs.SHT!);
    expect(scaledReward(reg, r).rep).toBe(scaledReward(rea, r).rep);
    expect(Math.abs(styleEffect(reg, 'defense').playoff)).toBeLessThan(Math.abs(styleEffect(rea, 'defense').playoff) + 1e-9);
    expect(MODES.standard.mini).toBeDefined();
  });

  it('tab keys move when there is something new to see', () => {
    const g = newGame(9, { name: 'Tabs', number: 9, pos: 'PG', archetype: 0, focus: ['PLY', 'IQ'] });
    const before = tabKey(g, 'records');
    g.history.push({ ...(g.history[0] ?? ({} as never)), year: g.year } as never);
    expect(tabKey(g, 'records')).not.toBe(before);
    expect(tabKey(g, 'home')).toBe('');
  });
});
