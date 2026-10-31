// Round 27 (the UI round): the engine's words for places in a list.

import { describe, expect, it } from 'vitest';
import { ordinal } from '../src/engine/career/common';

describe('ordinal', () => {
  it('says 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 22nd, 23rd, 101st', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
  });
});

describe('the dev deck password', () => {
  it('is never spelled out in what ships (the page only keeps its hash)', async () => {
    const { readdirSync, readFileSync, statSync } = await import('fs');
    const { join } = await import('path');
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
    const leaks = walk('src').filter((f) => /btrdev/i.test(readFileSync(f, 'utf8')));
    expect(leaks).toEqual([]);
  });
});
