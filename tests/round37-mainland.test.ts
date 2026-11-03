// Round 37: the main land (owner: "once the user completes the first tutorial beginner level, they
// can take a plane to the "main land". in the main land, there's buildings/islands/areas/... where
// the user can access the main contents"). Which places stand, which are locked, how the arrow keys
// move between them, and the flight that plays once on a device.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { FLIGHT_FPS, FLIGHT_SECS, FLIGHT_VIEW, FLIGHT_W, LAND, LAND_H, LAND_MODE, LAND_W, AVENUE_X, STRIP, camAt, firstLand, flightAt, landPlaces, landSide, landState, markPlaneSeen, neighbour, planeDue, planeSeen, type LandDir, type LandId } from '../src/ui/mainland';
import { ROAD_MINIS, type Road } from '../src/ui/road';

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

const road = (o: Partial<Road> = {}): Road => ({ passed: { beginner: { star: true } }, minis: {}, free: 1, v: 35, ...o });
const ALL_C = Object.fromEntries(ROAD_MINIS.map((m) => [m, 'C'])) as Road['minis'];

describe('the places', () => {
  it('stand on the map, apart, each big enough to tap on a phone', () => {
    const ids = LAND.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of LAND) {
      const [x, y, w, h] = p.box;
      expect(x >= 0 && y >= 0 && x + w <= LAND_W && y + h <= LAND_H, p.id).toBe(true);
      // a 390 px phone leaves the map about 356 px: every place at least 32 px each way
      expect((w * 356) / LAND_W, p.id).toBeGreaterThanOrEqual(32);
      expect((h * 356) / LAND_W, p.id).toBeGreaterThanOrEqual(32);
      expect(p.stop >= AVENUE_X[0] && p.stop <= AVENUE_X[1], p.id).toBe(true);
      expect(p.plate.length && p.name.length && p.icon.length, p.id).toBeTruthy();
      for (const q of LAND) {
        if (q === p) continue;
        const [a, b, c, d] = q.box;
        expect(x < a + c && a < x + w && y < b + d && b < y + h, `${p.id} and ${q.id} overlap`).toBe(false);
      }
    }
  });

  it('give each difficulty a venue, and keep the four that were the start page’s row of cards', () => {
    expect(Object.values(LAND_MODE).sort()).toEqual(['reality', 'standard', 'stars']);
    for (const id of ['library', 'museum', 'plaza', 'island', 'airport', 'park'] as LandId[]) expect(LAND.some((p) => p.id === id), id).toBe(true);
  });

  it('build his house only while a career is going', () => {
    expect(landPlaces(false).map((p) => p.id)).not.toContain('house');
    expect(landPlaces(true).map((p) => p.id)).toContain('house');
    expect(landPlaces(true).length).toBe(LAND.length);
  });

  it('lock what the road map has not opened, and suggest the gym after graduation', () => {
    const fresh = road();
    expect(landState(fresh, 'cage')).toBe('locked');
    expect(landState(fresh, 'dome')).toBe('locked');
    expect(landState(fresh, 'island')).toBe('locked');
    expect(landState(fresh, 'gym')).toBe('open');
    expect(landState(fresh, 'gym', true)).toBe('next');
    for (const id of ['airport', 'cinema', 'park', 'library', 'news', 'plaza', 'museum', 'house'] as LandId[]) expect(landState(fresh, id, true), id).toBe('open');
    const college = road({ passed: { beginner: { star: true }, intermediate: { star: false } } });
    expect(landState(college, 'cage')).toBe('open');
    expect(landState(college, 'dome')).toBe('locked');
    expect(landState(road({ minis: ALL_C }), 'island')).toBe('open');
    // a device that graduated before the locks keeps everything
    const old = road({ all: 1 });
    for (const id of ['cage', 'dome', 'island'] as LandId[]) expect(landState(old, id), id).toBe('open');
  });

  it('pop their cards out on the side with more map', () => {
    for (const p of LAND) {
      const side = landSide(p);
      const room = side === 'right' ? LAND_W - p.box[0] - p.box[2] : p.box[0];
      // the card is at most 40% of the map wide on a computer
      expect(room / LAND_W, p.id).toBeGreaterThan(0.4);
    }
  });

  it('open on the gym, or his house when a career is going', () => {
    expect(firstLand(false, false)).toBe('gym');
    expect(firstLand(true, false)).toBe('house');
    expect(firstLand(true, true)).toBe('gym');
  });
});

describe('the arrow keys', () => {
  const dirs: LandDir[] = ['left', 'right', 'up', 'down'];
  it('move along the avenue and across it', () => {
    const all = landPlaces(true);
    expect(neighbour(all, 'gym', 'right')).toBe('cage');
    expect(neighbour(all, 'cage', 'right')).toBe('dome');
    expect(neighbour(all, 'cage', 'left')).toBe('gym');
    expect(neighbour(all, 'dome', 'down')).toBe('museum');
    expect(neighbour(all, 'library', 'up')).toBe('gym');
    expect(neighbour(all, 'museum', 'right')).toBe('island');
    expect(neighbour(all, 'airport', 'left')).toBeNull();
    expect(neighbour(all, 'airport', 'up')).toBeNull();
  });

  it('reach every place from the gym, with or without his house', () => {
    for (const career of [false, true]) {
      const all = landPlaces(career);
      const seen = new Set<LandId>(['gym']);
      const queue: LandId[] = ['gym'];
      while (queue.length) {
        const at = queue.shift()!;
        for (const d of dirs) {
          const n = neighbour(all, at, d);
          if (n && !seen.has(n)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
      expect([...seen].sort()).toEqual(all.map((p) => p.id).sort());
      // and never onto his house when it isn't there
      if (!career) expect(seen.has('house')).toBe(false);
    }
  });
});

describe('the plane to the main land', () => {
  it('plays once on a device, never with reduced motion, always in the dev deck', () => {
    vi.stubGlobal('localStorage', new FakeStorage());
    expect(planeSeen()).toBe(false);
    expect(planeDue(false)).toBe(true);
    expect(planeDue(true)).toBe(false);
    markPlaneSeen();
    expect(planeSeen()).toBe(true);
    expect(planeDue(false)).toBe(false);
    expect(planeDue(true, true)).toBe(true);
  });

  it('takes four to six seconds, from the island’s airstrip to the main land’s runway', () => {
    expect(FLIGHT_SECS).toBeGreaterThanOrEqual(4);
    expect(FLIGHT_SECS).toBeLessThanOrEqual(6);
    const start = flightAt(0);
    const end = flightAt(1);
    expect(start.y + 6).toBe(STRIP.wheels);
    expect(start.x >= STRIP.away[0] && start.x + 20 <= STRIP.away[1]).toBe(true);
    expect(end.y + 6).toBe(STRIP.wheels);
    expect(end.x >= STRIP.home[0] && end.x + 20 <= STRIP.home[1]).toBe(true);
    const frames = FLIGHT_SECS * FLIGHT_FPS;
    const legs: string[] = [];
    let top = Infinity;
    for (let f = 0; f <= frames; f++) {
      const at = flightAt(f / frames);
      if (legs[legs.length - 1] !== at.leg) legs.push(at.leg);
      top = Math.min(top, at.y);
      // the window keeps the plane in it, wide or tall
      for (const view of [FLIGHT_VIEW, 100]) {
        const cam = camAt(at.x, view);
        expect(cam >= 0 && cam + view <= FLIGHT_W).toBe(true);
        expect(at.x >= cam && at.x + 20 <= cam + view, `frame ${f}, view ${view}`).toBe(true);
      }
    }
    expect(legs).toEqual(['away', 'sea', 'land']);
    expect(top).toBeLessThan(25);
    // it climbs nose up and comes down nose down
    expect(flightAt(0.2).tilt).toBe(-1);
    expect(flightAt(0.8).tilt).toBe(1);
    expect(flightAt(0.5).tilt).toBe(0);
  });
});
