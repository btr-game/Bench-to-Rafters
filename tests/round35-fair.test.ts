// Round 35 (owner: "for equality purposes, i think sim and fastbreak should be locked in
// multiplayer. think of other ways to balance"): a career with friends is played at full pace by
// everyone in it, takes no mini-game bonus, and a challenge comes only from a career played the
// same way.
import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/flow';
import { setFast, setSim } from '../src/engine/fast';
import { canClaimMini } from '../src/engine/career/miniBonus';
import { canChallenge, ranQuick } from '../src/ui/multiplayer';

const input = { name: 'Fair Play', number: 7, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], mode: 'standard' as const };

describe('fair play with friends', () => {
  it('keeps Fast break and Sim off in a career with friends', () => {
    const g = newGame(3501, input);
    g.flags.friends = 1;
    setFast(g, true);
    setSim(g, true);
    expect(g.flags.fast ?? 0).toBe(0);
    expect(g.flags.sim ?? 0).toBe(0);
    expect(g.flags.quick ?? 0).toBe(0);
  });
  it('marks a career that ever ran quick, and sends no challenge from it', () => {
    const g = newGame(3502, input);
    g.step = 'retired';
    expect(canChallenge(g)).toBe(true);
    setFast(g, true);
    setFast(g, false);
    expect(g.flags.quick).toBe(1);
    expect(canChallenge(g)).toBe(false);
    expect(ranQuick(g)).toBe(true);
    expect(newGame(3503, { ...input, fast: true }).flags.quick).toBe(1);
  });
  it('pays no mini-game bonus to a career with friends', () => {
    const g = newGame(3504, input);
    const before = canClaimMini(g);
    g.flags.friends = 1;
    expect(canClaimMini(g)).toBe(false);
    expect(before).toBe(true);
  });
});
