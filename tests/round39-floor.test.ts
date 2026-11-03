// Round 39: the Floor's engine (engine/floor/): a seeded fourth quarter, steered by the user on both
// ends, four real minutes long, harder with the difficulty.
import { describe, expect, it } from 'vitest';
import { FLOOR } from '../src/engine/balance';
import { floorResult, freshEvents, releaseQuality, skipFloor, startFloor, stepFloor, type FloorInput, type FloorPlayerIn, type FloorSetup, type FloorState } from '../src/engine/floor/sim';
import { floorDue } from '../src/engine/floor/due';
import { isThree, zoneOf } from '../src/engine/floor/court';

const POS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
function roster(tag: string, base: number, o: { user?: boolean; FT?: number; SHT?: number } = {}): FloorPlayerIn[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `${tag}${i}`,
    name: `${tag} ${i}`,
    pos: POS[i % 5],
    number: i + 1,
    user: !!o.user && i === 1,
    r: { SHT: o.SHT ?? base, FIN: base, PLY: base, PER: base, INT: base + (i >= 3 ? 6 : -4), REB: base + (i >= 3 ? 8 : -8), ATH: base, IQ: base, FT: o.FT ?? base },
  }));
}
const setup = (seed: number, mode: FloorSetup['mode'] = 'standard', o: { FT?: number; SHT?: number } = {}): FloorSetup => ({
  seed,
  mode,
  us: { name: 'Us', short: 'US', color: '#1D428A', players: roster('U', 75, { user: true, ...o }) },
  them: { name: 'Them', short: 'TH', color: '#C8102E', players: roster('T', 75) },
  score: [80, 80],
});

/** A scripted player: drifts, sprints now and then, shoots with a fixed hold, steals and jumps. */
function scripted(s: FloorState): FloorInput {
  const k = s.tick;
  const hold = k % 40 < 6; // presses for six ticks (0.9 s: a full load), then lets go
  return { dx: Math.sin(k / 30), dy: Math.cos(k / 45), sprint: k % 50 < 10, shoot: hold, pass: k % 97 === 0 ? 'auto' : null, steal: k % 61 === 0, block: k % 73 === 0, move: k % 89 === 0 ? 'cross' : null };
}

function play(set: FloorSetup, input: (s: FloorState) => FloorInput | null): FloorState {
  const s = startFloor(set);
  for (let i = 0; i < 20000 && s.phase !== 'over'; i++) stepFloor(s, input(s));
  return s;
}

describe('round 39: the Floor', () => {
  it('the same setup and the same inputs give the same game', () => {
    const a = play(setup(7), scripted);
    const b = play(setup(7), scripted);
    expect(a.phase).toBe('over');
    expect(a.score).toEqual(b.score);
    expect(a.feed.map((e) => `${e.tick}${e.kind}${e.by}`)).toEqual(b.feed.map((e) => `${e.tick}${e.kind}${e.by}`));
    expect(floorResult(a).line).toEqual(floorResult(b).line);
  });

  it('a quarter takes about four real minutes, the clock running three times as fast', () => {
    expect(FLOOR.tick * FLOOR.ticksPerSec).toBeCloseTo(3, 6);
    const live = FLOOR.quarter / FLOOR.tick / FLOOR.ticksPerSec;
    expect(live).toBeCloseTo(240, 6);
    const times: number[] = [];
    for (let k = 0; k < 20; k++) {
      const s = startFloor(setup(100 + k));
      skipFloor(s);
      if (!s.periods) times.push(s.tick / FLOOR.ticksPerSec);
    }
    const mean = times.reduce((x, y) => x + y, 0) / times.length;
    // the live clock plus the stoppages (inbounds, free throws, timeouts)
    expect(mean).toBeGreaterThan(240);
    expect(mean).toBeLessThan(300);
  });

  it('plays like a fourth quarter: points, shooting, free throws and turnovers in an NBA range', () => {
    let pts = 0;
    let fga = 0;
    let fgm = 0;
    let fta = 0;
    let tov = 0;
    const n = 60;
    for (let k = 0; k < n; k++) {
      const s = startFloor(setup(500 + k));
      skipFloor(s);
      if (s.periods) continue;
      const r = floorResult(s);
      pts += r.us - 80 + (r.them - 80);
      for (const b of r.box) {
        fga += b.box.fga;
        fgm += b.box.fgm;
        fta += b.box.fta;
        tov += b.box.tov;
      }
    }
    const games = n;
    expect(pts / games / 2).toBeGreaterThan(22);
    expect(pts / games / 2).toBeLessThan(34);
    expect(fgm / fga).toBeGreaterThan(0.36);
    expect(fgm / fga).toBeLessThan(0.52);
    expect(fta / games / 2).toBeGreaterThan(2);
    expect(tov / games / 2).toBeLessThan(7);
  }, 120_000);

  it('harder difficulties make his team shoot worse and the other team better', () => {
    const avg = (mode: FloorSetup['mode']) => {
      let diff = 0;
      for (let k = 0; k < 120; k++) {
        const s = startFloor(setup(900 + k, mode));
        skipFloor(s);
        diff += s.score[0] - s.score[1];
      }
      return diff / 120;
    };
    const reality = avg('reality');
    const standard = avg('standard');
    const stars = avg('stars');
    expect(reality).toBeLessThan(standard);
    expect(standard).toBeLessThan(stars);
  }, 240_000);

  it('the meter: a full load is a perfect release, far off is none, and a better shooter has a wider window', () => {
    const s = startFloor(setup(3));
    const u = s.players[s.user];
    // alone at the top of the key: nobody near
    for (const p of s.players) if (p !== u) p.x = p.team === 0 ? 60 : 5;
    u.x = 70;
    u.y = 25;
    expect(releaseQuality(s, u, FLOOR.meter.load)).toBeCloseTo(1, 6);
    expect(releaseQuality(s, u, FLOOR.meter.load * 0.3)).toBe(0);
    const good = releaseQuality(s, u, FLOOR.meter.load * 1.12);
    u.r.SHT = 30;
    expect(releaseQuality(s, u, FLOOR.meter.load * 1.12)).toBeLessThan(good);
  });

  it('free throws follow his touch', () => {
    const rate = (FT: number) => {
      let made = 0;
      let tried = 0;
      for (let k = 0; k < 40; k++) {
        const s = startFloor(setup(1500 + k, 'standard', { FT }));
        skipFloor(s);
        for (const p of s.players.filter((q) => q.team === 0)) {
          made += p.box.ftm;
          tried += p.box.fta;
        }
      }
      return made / Math.max(1, tried);
    };
    expect(rate(95)).toBeGreaterThan(rate(35) + 0.15);
  }, 120_000);

  it('Skip plays the rest from where it stands; a game always ends with a winner', () => {
    const s = startFloor(setup(42));
    for (let i = 0; i < 1500; i++) stepFloor(s, scripted(s));
    const mid = [...s.score];
    const left = s.clock;
    expect(left).toBeLessThan(FLOOR.quarter);
    skipFloor(s);
    expect(s.phase).toBe('over');
    expect(s.score[0]).toBeGreaterThanOrEqual(mid[0]);
    expect(s.score[1]).toBeGreaterThanOrEqual(mid[1]);
    expect(s.score[0]).not.toBe(s.score[1]);
    expect(freshEvents(s).length).toBeGreaterThanOrEqual(0);
  });

  it('a sixth foul sends a player to the bench and a sub comes on', () => {
    const set = setup(9);
    set.them.players[0].fouls = 5;
    const s = startFloor(set);
    skipFloor(s);
    const out = s.players.find((p) => p.team === 1 && p.fouls >= FLOOR.foul.out);
    if (out) {
      expect(out.on).toBe(false);
      expect(s.players.filter((p) => p.team === 1 && p.on).length).toBe(5);
    }
  });

  it('the three-point line and the zones', () => {
    expect(isThree(0, { x: 88.75 - 24, y: 25 })).toBe(true);
    expect(isThree(0, { x: 88.75 - 20, y: 25 })).toBe(false);
    expect(isThree(0, { x: 90, y: 2.5 })).toBe(true); // the corner
    expect(isThree(1, { x: 5.25 + 24, y: 25 })).toBe(true);
    expect(zoneOf(0, { x: 87, y: 25 })).toBe('rim');
  });

  it('plays only his own elimination games, from the conference finals on', () => {
    expect(floorDue('Conference finals', 3, 7)).toBe(true);
    expect(floorDue('NBA Finals', 3, 7)).toBe(true);
    expect(floorDue('NBA Finals', 2, 7)).toBe(false);
    expect(floorDue('Conference semifinals', 3, 7)).toBe(false);
    expect(floorDue('First round', 3, 7)).toBe(false);
  });
});
