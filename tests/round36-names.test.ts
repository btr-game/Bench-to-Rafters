// Round 36: names and the username. Owner: "ask the user for a username(changable) after the
// tutorial ... so that users can know who's player it is" and "filter out curse words or non english
// characters in the player name".

import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIRST_NAMES, LAST_NAMES } from '../src/content/names';
import { cleanName, cleanUsername, isRude, nameProblem, shownBy } from '../src/ui/names';

class FakeStorage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
afterEach(() => vi.unstubAllGlobals());

describe('a player’s name', () => {
  it('keeps to English letters: accents become plain letters, other alphabets and emoji drop', () => {
    expect(cleanName('José Kovač')).toBe('Jose Kovac');
    expect(cleanName('김민재')).toBe('');
    expect(cleanName('Luka Dončić 🏀')).toBe('Luka Doncic ');
    expect(cleanName("D'Angelo O'Neal-Smith Jr.")).toBe("D'Angelo O'Neal-Smith Jr.");
    expect(cleanName('Number 23')).toBe('Number ');
    expect(cleanName('x'.repeat(40))).toHaveLength(28);
  });

  it('refuses swear words and slurs, spelled with numbers or spaced out too', () => {
    for (const bad of ['Shit Head', 'F u c k Smith', 'Dick Smith', 'motherf Jones', 'b1tch']) expect(isRude(bad), bad).toBe(true);
    expect(nameProblem('Shit Head')).not.toBe('');
    expect(nameProblem('   ')).not.toBe('');
  });

  it('lets real names that only look close stand', () => {
    for (const ok of ['Jim Hancock', 'Hilary Swank', 'Don Draper', 'Pete Dickerson', 'Assane Diop', 'Cumberland', 'Titus Sexton', 'Peacock']) expect(isRude(ok), ok).toBe(false);
    expect(nameProblem('Marcus Hale')).toBe('');
  });

  it('never refuses a name the game picks at random', () => {
    let bad = 0;
    for (const f of FIRST_NAMES) for (const l of LAST_NAMES) if (nameProblem(cleanName(`${f} ${l}`))) bad++;
    expect(bad).toBe(0);
  });
});

describe('the username', () => {
  it('keeps to English letters, numbers and _ . -, and refuses the same words', () => {
    expect(cleanUsername('Min_jae.07')).toBe('Min_jae.07');
    expect(cleanUsername('민재 #1!')).toBe('1');
    expect(cleanUsername('y'.repeat(40))).toHaveLength(20);
    expect(isRude('xX_sh1t_Xx')).toBe(true);
    expect(isRude('hooper_23')).toBe(false);
  });

  it('is kept on the device under the name Play with friends used, and a rude one never shows', async () => {
    vi.stubGlobal('localStorage', new FakeStorage());
    vi.resetModules();
    const names = await import('../src/ui/names');
    expect(names.username()).toBe('');
    localStorage.setItem('btr-mp-name', 'old_friend_name');
    expect(names.username(), 'a name picked for friends carries over').toBe('old_friend_name');
    names.setUsername('  hooper 23  ');
    expect(names.username()).toBe('hooper 23');
    localStorage.setItem('btr-mp-name', 'fuckface');
    expect(names.username()).toBe('');
  });

  it('signs a posted card with it, and the boards hide one that breaks the rules', async () => {
    vi.stubGlobal('localStorage', new FakeStorage());
    vi.resetModules();
    const names = await import('../src/ui/names');
    const rec = { name: 'Marcus Hale' } as never;
    expect(names.signed(rec)).toBe(rec);
    names.setUsername('hooper23');
    expect((names.signed(rec) as { by?: string }).by).toBe('hooper23');
    expect(shownBy('hooper23')).toBe('hooper23');
    expect(shownBy('sh1tposter')).toBe('');
    expect(shownBy(undefined)).toBe('');
  });
});
