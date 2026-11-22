// After round 42, the Floor's gimmicks (engine/floor/gimmicks.ts): a player on fire, hot spots, the
// home crowd erupting on a run, famous duos, and the rules of an era.
import { describe, expect, it } from 'vitest';
import { FLOOR } from '../src/engine/balance';
import { SPOTS, attackSpot, zoneOf } from '../src/engine/floor/court';
import { franchise, legendSetup } from '../src/engine/floor/game';
import { afterShot, crowdFor, fansOf, hotSpotsOf, onFire, pickEdge, shotEdge, stripEdge } from '../src/engine/floor/gimmicks';
import { ALL_LEGENDS, legendRatings, legendStyle } from '../src/engine/floor/legends';
import { floorHash, floorResult, startFloor, stepFloor, type FloorEvent, type FloorState } from '../src/engine/floor/sim';
import { LEGEND_PAIRS } from '../src/content/legendPairs';
import { FAN_CULTURES } from '../src/engine/career/fanCulture';

const G = FLOOR.gimmick;
const game = (o: { us?: string; them?: string; era?: 'modern' | 'nineties' | 'sixties'; home?: 0 | 1; seed?: number } = {}): FloorState =>
  startFloor(legendSetup({ seed: o.seed ?? 11, us: franchise(o.us ?? 'CHI'), them: franchise(o.them ?? 'LAL'), length: 'fourth', era: o.era, home: o.home }));
const idxOf = (s: FloorState, name: string) => s.players.findIndex((p) => p.name === name);
const play = (s: FloorState, seen?: (e: FloorEvent) => void) => {
  for (let i = 0; i < 400000 && s.phase !== 'over'; i++) {
    stepFloor(s, null);
    if (seen) for (let k = s.fresh; k < s.feed.length; k++) seen(s.feed[k]);
  }
  return s;
};

describe('after round 42: the Floor’s gimmicks', () => {
  it('three makes in a row and he is on fire; two misses, or three baskets in a row the other way, put it out', () => {
    const s = game();
    const mj = idxOf(s, 'Michael Jordan');
    const ev: FloorEvent[] = [];
    const emit = (e: Omit<FloorEvent, 'tick'>) => ev.push({ tick: s.tick, ...e });
    afterShot(s, mj, true, emit);
    afterShot(s, mj, false, emit);
    afterShot(s, mj, true, emit);
    afterShot(s, mj, true, emit);
    expect(onFire(s, mj)).toBe(false);
    afterShot(s, mj, true, emit);
    expect(onFire(s, mj)).toBe(true);
    expect(ev.filter((e) => e.kind === 'fire')).toEqual([{ tick: s.tick, kind: 'fire', team: 0, by: mj }]);
    // (three baskets in a row at home: the crowd has erupted too)
    expect(ev.some((e) => e.kind === 'crowd')).toBe(true);
    s.gm!.crowd = null;
    // on fire: every shot of his is better by fireShot
    const away = { x: 47, y: 25 };
    expect(shotEdge(s, s.players[mj], away, zoneOf(0, away))).toBeCloseTo(G.fireShot, 9);
    afterShot(s, mj, false, emit);
    expect(onFire(s, mj)).toBe(true);
    afterShot(s, mj, false, emit);
    expect(onFire(s, mj)).toBe(false);
    // again, then the other team scores three in a row
    for (let k = 0; k < 3; k++) afterShot(s, mj, true, emit);
    expect(onFire(s, mj)).toBe(true);
    const kobe = idxOf(s, 'Kobe Bryant');
    afterShot(s, kobe, true, emit);
    afterShot(s, kobe, true, emit);
    expect(onFire(s, mj)).toBe(true);
    afterShot(s, kobe, true, emit);
    expect(onFire(s, mj)).toBe(false);
  });

  it('players catch fire in real games, and the game still comes out the same every time', () => {
    let fires = 0;
    const a = play(game({ seed: 5 }), (e) => e.kind === 'fire' && fires++);
    const b = play(game({ seed: 5 }));
    expect(floorHash(a)).toBe(floorHash(b));
    for (let g = 0; g < 4; g++) play(game({ seed: 40 + g }), (e) => e.kind === 'fire' && fires++);
    expect(fires).toBeGreaterThan(0);
  });

  it('each legend has one or two hot spots from how he plays, and a shot from one is better', () => {
    const at = (name: string) => {
      const l = ALL_LEGENDS.find((x) => x.spot.name === name)!.spot;
      return hotSpotsOf({ name, pos: l.pos, r: legendRatings(l), st: legendStyle(l) });
    };
    // a shooter's are on the perimeter, a big man's inside
    for (const n of at('Ray Allen')) expect(['leftCorner', 'rightCorner', 'leftWing', 'rightWing', 'top']).toContain(n);
    for (const n of at("Shaquille O'Neal")) expect(['leftBlock', 'rightBlock', 'leftElbow', 'rightElbow']).toContain(n);
    for (const x of ALL_LEGENDS) {
      const n = at(x.spot.name).length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(2);
    }
    const s = game();
    const mj = idxOf(s, 'Michael Jordan');
    const spot = s.gm!.spots[mj][0];
    const c = attackSpot(0, SPOTS[spot][0], SPOTS[spot][1]);
    expect(shotEdge(s, s.players[mj], c, zoneOf(0, c))).toBeCloseTo(G.hotSpot, 9);
    const away = { x: 47, y: 25 };
    expect(shotEdge(s, s.players[mj], away, zoneOf(0, away))).toBe(0);
    // the bench's made-up men have none
    expect(s.gm!.spots[6]).toEqual([]);
  });

  it('the home crowd erupts on a run, for a while, named after its fans; never for the visitors', () => {
    const s = game({ us: 'CHI', them: 'LAL' });
    expect(s.gm!.fans.name).toBe(FAN_CULTURES.CHI.name);
    const ev: FloorEvent[] = [];
    const emit = (e: Omit<FloorEvent, 'tick'>) => ev.push({ tick: s.tick, ...e });
    const kobe = idxOf(s, 'Kobe Bryant');
    const mj = idxOf(s, 'Michael Jordan');
    // the visitors' run: nothing
    s.run = { team: 1, pts: 10 };
    for (let k = 0; k < 4; k++) afterShot(s, kobe, true, emit);
    expect(ev.some((e) => e.kind === 'crowd')).toBe(false);
    expect(crowdFor(s)).toBeNull();
    // the home team's run
    s.run = { team: 0, pts: 6 };
    afterShot(s, mj, true, emit);
    expect(crowdFor(s)).toBeNull();
    s.run = { team: 0, pts: 8 };
    afterShot(s, mj, true, emit);
    expect(ev.filter((e) => e.kind === 'crowd')).toHaveLength(1);
    expect(crowdFor(s)).toBe(0);
    const away = { x: 47, y: 25 };
    expect(shotEdge(s, s.players[mj], away, zoneOf(0, away))).toBeCloseTo(G.crowdShot * s.gm!.fans.k, 9);
    expect(stripEdge(s, s.players[mj])).toBeGreaterThan(1);
    expect(stripEdge(s, s.players[kobe])).toBe(1);
    // once a run: another basket in it does not set it off again
    s.run = { team: 0, pts: 10 };
    afterShot(s, mj, true, emit);
    expect(ev.filter((e) => e.kind === 'crowd')).toHaveLength(1);
    // it dies down after crowdSecs of play
    s.tick += Math.round(G.crowdSecs / FLOOR.tick) + 1;
    expect(crowdFor(s)).toBeNull();
    // a louder crowd lifts its team more
    expect(fansOf('OKC').k).toBeGreaterThan(fansOf('LAL').k);
    expect(fansOf('LAL').k).toBeCloseTo(G.crowdMin, 9);
    // with the other team at home (a playoff game on the road), it is theirs
    const r = game({ us: 'CHI', them: 'LAL', home: 1 });
    expect(r.gm!.fans.name).toBe(FAN_CULTURES.LAL.name);
    r.run = { team: 0, pts: 12 };
    afterShot(r, idxOf(r, 'Michael Jordan'), true, () => undefined);
    expect(crowdFor(r)).toBeNull();
    r.run = { team: 1, pts: 12 };
    afterShot(r, idxOf(r, 'Kobe Bryant'), true, () => undefined);
    expect(crowdFor(r)).toBe(1);
  });

  it('famous duos: a shot one sets up for the other is better, and a pass between them is picked off less', () => {
    const names = new Set(ALL_LEGENDS.map((x) => x.spot.name));
    for (const [a, b] of LEGEND_PAIRS) {
      expect(names.has(a), a).toBe(true);
      expect(names.has(b), b).toBe(true);
    }
    const s = game();
    const mj = idxOf(s, 'Michael Jordan');
    const pip = idxOf(s, 'Scottie Pippen');
    const grant = idxOf(s, 'Horace Grant');
    expect(s.gm!.pairs).toContainEqual([mj, pip]);
    const away = { x: 47, y: 25 };
    s.lastPass = { by: pip, tick: s.tick };
    expect(shotEdge(s, s.players[mj], away, zoneOf(0, away))).toBeCloseTo(G.pair, 9);
    s.lastPass = { by: grant, tick: s.tick };
    expect(shotEdge(s, s.players[mj], away, zoneOf(0, away))).toBe(0);
    // a pass set up too long ago no longer counts
    s.lastPass = { by: pip, tick: s.tick - Math.round(G.pairSecs / FLOOR.tick) - 1 };
    expect(shotEdge(s, s.players[mj], away, zoneOf(0, away))).toBe(0);
    const d = s.players[idxOf(s, 'Kobe Bryant')];
    expect(pickEdge(s, pip, mj, d)).toBeCloseTo(G.pairPick, 9);
    expect(pickEdge(s, grant, mj, d)).toBe(1);
  });

  it('the sixties: no three-point line, every basket two; the era travels in the setup', () => {
    const set = legendSetup({ seed: 77, us: franchise('GSW'), them: franchise('HOU'), length: 'full', era: 'sixties' });
    expect(set.era).toBe('sixties');
    // the setup a friend game sends goes through JSON: the same game on both computers
    const a = play(startFloor(set));
    const b = play(startFloor(JSON.parse(JSON.stringify(set))));
    expect(floorHash(a)).toBe(floorHash(b));
    for (const p of floorResult(a).box) {
      expect(p.box.tpa).toBe(0);
      expect(p.box.pts).toBe(2 * p.box.fgm + p.box.ftm);
    }
    expect(a.score[0] + a.score[1]).toBeGreaterThan(0);
    // and the modern game, from the same seed, has threes
    const m = play(startFloor(legendSetup({ seed: 77, us: franchise('GSW'), them: franchise('HOU'), length: 'full' })));
    expect(floorResult(m).box.some((p) => p.box.tpm > 0)).toBe(true);
  });

  it('the nineties: fewer fouls called on shots than today', () => {
    const fta = (era: 'modern' | 'nineties') => {
      let n = 0;
      for (let g = 0; g < 12; g++) {
        const s = play(startFloor(legendSetup({ seed: 300 + g * 7, us: franchise('NYK', 90), them: franchise('CHI', 90), length: 'full', era })));
        for (const p of floorResult(s).box) n += p.box.fta;
      }
      return n;
    };
    expect(fta('nineties')).toBeLessThan(fta('modern'));
  }, 120_000);
});
