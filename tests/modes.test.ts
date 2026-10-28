// The two extra difficulty modes (playtest round 6): "Reality hits hard" keeps the NBA out of
// reach for almost everyone; "Shoot for the stars" takes every career that lasts to 80+.

import { describe, expect, it } from 'vitest';
import { runCareer } from '../scripts/harness';

const N = 120;

describe('difficulty modes', () => {
  it('reality hits hard: few players ever reach the NBA', () => {
    let nba = 0;
    for (let i = 0; i < N; i++) if (runCareer(910000 + i, 'smart', 'reality').playedNba) nba++;
    expect(nba / N).toBeLessThan(0.15);
  });

  it('shoot for the stars: every career that reaches 22 peaks at 80+', () => {
    for (let i = 0; i < N; i++) {
      const c = runCareer(920000 + i, 'random', 'stars');
      if (c.retireAge >= 22) expect(c.peakOvr).toBeGreaterThanOrEqual(79.5);
    }
  });
});
