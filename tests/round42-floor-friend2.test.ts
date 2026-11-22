// After round 42 (owner): "eras for friend games: yes", "blocked shots cooling a hot streak: yes", "online
// games that can go to endless overtime if nobody touches the keys -> prevent", "a sixth man for superteam
// drafts: yes".

import { describe, expect, it } from 'vitest';
import { franchise, legendSetup } from '../src/engine/floor/game';
import { afterShot, onFire } from '../src/engine/floor/gimmicks';
import { startFloor, stepFloor } from '../src/engine/floor/sim';
import { FLOOR } from '../src/engine/balance';

describe('the Floor with a friend, and the hot streak', () => {
  it('a blocked shot counts as a miss: the streak ends and the fire cools', () => {
    const s = startFloor(legendSetup({ seed: 4, us: franchise('GSW'), them: franchise('BOS'), length: 'fourth' }));
    for (let k = 0; k < FLOOR.gimmick.fireMakes; k++) afterShot(s, 0, true, () => {});
    expect(onFire(s, 0)).toBe(true);
    for (let k = 0; k < FLOOR.gimmick.fireMisses; k++) afterShot(s, 0, false, () => {});
    expect(onFire(s, 0)).toBe(false);
    expect(s.gm!.row[0]).toBe(0);
  });

  it('two players who press nothing still finish: the AI takes their men over', () => {
    const set = legendSetup({ seed: 9, us: franchise('NYK'), them: franchise('CHI'), user: 0, length: 'fourth' });
    set.them.players[0].user = true;
    const s = startFloor(set);
    expect(s.two).not.toBeNull();
    for (let i = 0; i < 200000 && s.phase !== 'over'; i++) stepFloor(s, {}, {});
    expect(s.phase).toBe('over');
    expect(s.periods ?? 0).toBeLessThan(10);
    expect(s.score[0] + s.score[1]).toBeGreaterThan(10);
  });

  it('a friend game carries the room’s era, and a drafted team its sixth man', () => {
    const set = legendSetup({ seed: 3, us: { ...franchise('BOS'), sixth: franchise('SAS').sixth }, them: franchise('LAL'), user: 0, length: 'fourth', era: 'sixties' });
    expect(set.era).toBe('sixties');
    expect(set.us.players[5].name).toBe('Victor Wembanyama');
  });
});
