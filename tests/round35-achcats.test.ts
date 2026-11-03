// Round 35: a category for every achievement (engine/achievementCats.ts), so a book of 700 and
// more can be looked through by area without giving a riddle away.

import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/engine/achievements';
import { ACH_CATS, ACH_CAT_RULES, achCatOf, type AchCat } from '../src/engine/achievementCats';
import { ICONS } from '../src/ui/art/icons';

const ids = ACHIEVEMENTS.map((a) => a.id);
const named = (c: AchCat) => ACH_CAT_RULES[c].filter((r): r is string => typeof r === 'string');
const patterns = (c: AchCat) => ACH_CAT_RULES[c].filter((r): r is RegExp => typeof r !== 'string');
const allNamed = ACH_CATS.flatMap((c) => named(c.key));

describe('achievement categories', () => {
  it('files every achievement in the book under a category', () => {
    const lost = ids.filter((id) => achCatOf(id) === null);
    expect(lost).toEqual([]);
  });

  it('files each one in exactly one category: no id named twice, none fitting two categories’ patterns', () => {
    const twice = allNamed.filter((id, i) => allNamed.indexOf(id) !== i);
    expect(twice).toEqual([]);
    const loose = ids.filter((id) => !allNamed.includes(id));
    const both = loose.filter((id) => ACH_CATS.filter((c) => patterns(c.key).some((p) => p.test(id))).length !== 1);
    expect(both).toEqual([]);
  });

  it('keeps no rule that files nothing: every named id is in the book, every pattern fits one not named', () => {
    expect(allNamed.filter((id) => !ids.includes(id))).toEqual([]);
    for (const c of ACH_CATS)
      for (const p of patterns(c.key)) expect(ids.some((id) => !allNamed.includes(id) && p.test(id)), `${c.key} ${p}`).toBe(true);
  });

  it('gives the categories short plain names, unique, with icons from the set', () => {
    expect(new Set(ACH_CATS.map((c) => c.key)).size).toBe(ACH_CATS.length);
    expect(Object.keys(ACH_CAT_RULES).sort()).toEqual(ACH_CATS.map((c) => c.key).sort());
    expect(new Set(ACH_CATS.map((c) => c.name.toLowerCase())).size).toBe(ACH_CATS.length);
    for (const c of ACH_CATS) {
      expect(c.name.split(/\s+/).filter((w) => w !== '&').length, c.name).toBeLessThanOrEqual(3);
      expect(c.name.length, c.name).toBeLessThanOrEqual(18);
      // an area, never a condition: no numbers, no thresholds
      expect(c.name, c.name).not.toMatch(/\d/);
      expect(ICONS[c.icon], c.icon).toBeDefined();
    }
    expect(ACH_CATS.length).toBeGreaterThanOrEqual(8);
    expect(ACH_CATS.length).toBeLessThanOrEqual(14);
  });

  it('covers the whole book, with no category above a tenth of it', () => {
    const by = new Map<AchCat, number>();
    for (const id of ids) by.set(achCatOf(id)!, (by.get(achCatOf(id)!) ?? 0) + 1);
    expect([...by.values()].reduce((a, b) => a + b, 0)).toBe(ACHIEVEMENTS.length);
    for (const c of ACH_CATS) {
      const n = by.get(c.key) ?? 0;
      expect(n, c.name).toBeGreaterThan(0);
      expect(n, `${c.name}: ${n} of ${ACHIEVEMENTS.length}`).toBeLessThanOrEqual(ACHIEVEMENTS.length * 0.1);
    }
  });
});
