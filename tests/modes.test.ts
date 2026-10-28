// The two extra difficulty modes. Round 7 retuned both: "Reality hits hard" now averages a
// peak near 60, with the NBA reachable but only barely; "Shoot for the stars" takes every
// career that lasts to 80+ and centres on the early 90s, so a 99 is still hard to reach.

import { describe, expect, it } from 'vitest';
import { runCareer } from '../scripts/harness';

const N = 120;

describe('difficulty modes', () => {
  it('reality hits hard: peaks average about 60 and the NBA is a long shot', () => {
    let nba = 0;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const c = runCareer(910000 + i, 'smart', 'reality');
      if (c.playedNba) nba++;
      sum += c.peakOvr;
    }
    expect(sum / N).toBeGreaterThan(56);
    expect(sum / N).toBeLessThan(64);
    expect(nba / N).toBeGreaterThan(0.12);
    expect(nba / N).toBeLessThan(0.45);
  });

  it('shoot for the stars: every career that reaches 22 peaks at 80+, centred in the early 90s', () => {
    const peaks: number[] = [];
    for (let i = 0; i < N; i++) {
      const c = runCareer(920000 + i, 'random', 'stars');
      if (c.retireAge >= 22) expect(c.peakOvr).toBeGreaterThanOrEqual(79.5);
      peaks.push(c.peakOvr);
    }
    const mean = peaks.reduce((a, b) => a + b, 0) / N;
    expect(mean).toBeGreaterThan(88);
    expect(mean).toBeLessThan(94);
    expect(peaks.filter((p) => p >= 98.5).length / N).toBeLessThan(0.1);
  });
});
