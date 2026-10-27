import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../src/engine/player/archetypes';
import { ovrOf } from '../src/engine/player/ovr';
import { ATTRS, POSITIONS } from '../src/engine/balance';
import { rerollAttrs } from '../src/engine/player/create';
import { makeRng } from '../src/engine/rng';

describe('archetypes (§6)', () => {
  for (const pos of POSITIONS) {
    for (const a of ARCHETYPES[pos]) {
      it(`${pos} ${a.name} totals 320 and starts between 40.5 and 47 OVR`, () => {
        const total = ATTRS.reduce((s, k) => s + a.attrs[k], 0);
        expect(total).toBe(320);
        const ovr = ovrOf(a.attrs, pos);
        expect(ovr).toBeGreaterThanOrEqual(40.5);
        expect(ovr).toBeLessThanOrEqual(47);
      });
    }
  }

  it('"See other candidates" re-rolls keep the 320 total', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 200; i++) {
      const base = ARCHETYPES.SG[i % 3].attrs;
      const r = rerollAttrs(rng, base);
      expect(ATTRS.reduce((s, k) => s + r[k], 0)).toBe(320);
      for (const k of ATTRS) expect(Math.abs(r[k] - base[k])).toBeLessThanOrEqual(5);
    }
  });
});
