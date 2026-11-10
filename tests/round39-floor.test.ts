// Round 39: the Floor's engine (engine/floor/): a seeded fourth quarter, steered by the user on both
// ends, four real minutes long, harder with the difficulty.
import { describe, expect, it } from 'vitest';
import { FLOOR } from '../src/engine/balance';
import { floorResult, freshEvents, inRange, meterWindow, openMan, releaseQuality, skipFloor, startFloor, stepFloor, type FloorEventKind, type FloorInput, type FloorPlayerIn, type FloorSetup, type FloorState } from '../src/engine/floor/sim';
import { floorDue } from '../src/engine/floor/due';
import { isThree, rimOf, zoneOf } from '../src/engine/floor/court';

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
const setup = (seed: number, mode: FloorSetup['mode'] = 'standard', o: { FT?: number; SHT?: number; clock?: number } = {}): FloorSetup => ({
  seed,
  mode,
  us: { name: 'Us', short: 'US', color: '#1D428A', players: roster('U', 75, { user: true, ...o }) },
  them: { name: 'Them', short: 'TH', color: '#C8102E', players: roster('T', 75) },
  score: [80, 80],
  // a career's six minutes unless a test says otherwise (the engine's own default is a whole quarter)
  clock: o.clock ?? FLOOR.from,
});
/** A whole quarter, to hold the numbers against an NBA quarter's. */
const QUARTER = { clock: FLOOR.quarter };

/** A scripted player: drifts, sprints now and then, shoots with a fixed hold, steals and jumps. */
function scripted(s: FloorState): FloorInput {
  const k = s.tick;
  const hold = k % 60 < 20; // presses for twenty ticks (1.5 s: a full load), then lets go
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

  it('the last six minutes take about four real minutes, the clock running at 1.5 times', () => {
    expect(FLOOR.tick * FLOOR.ticksPerSec).toBeCloseTo(1.5, 6);
    const live = FLOOR.from / FLOOR.tick / FLOOR.ticksPerSec;
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
      const s = startFloor(setup(500 + k, 'standard', QUARTER));
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
        const s = startFloor(setup(900 + k, mode, QUARTER));
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
    expect(left).toBeLessThan(FLOOR.from);
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
  it('step 2: his jab, his switch and the help he calls are told, so the screen can show them', () => {
    const s = startFloor(setup(77));
    const seen = new Set<FloorEventKind>();
    for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
      const k = s.tick;
      // on defence he stays on the ball, jabs, switches and calls for help now and then
      const h = s.ball.holder !== null ? s.players[s.ball.holder] : null;
      const u = s.players[s.user];
      const chase = h && s.poss === 1 ? { dx: h.x - u.x, dy: h.y - u.y } : { dx: 0, dy: 0 };
      stepFloor(s, { ...chase, sprint: true, steal: k % 23 === 0, swap: k % 97 === 0, help: k % 89 === 0 });
      for (const e of freshEvents(s)) seen.add(e.kind);
    }
    expect(seen.has('reach')).toBe(true);
    expect(seen.has('switch')).toBe(true);
    expect(seen.has('help')).toBe(true);
  });

  it('step 2: the open man is a teammate, and at the line his free-throw touch sets the meter', () => {
    const s = startFloor(setup(5));
    s.ball.holder = s.user;
    const to = openMan(s);
    expect(to).not.toBeNull();
    expect(s.players[to!].team).toBe(0);
    expect(to).not.toBe(s.user);
    s.phase = 'ft';
    const u = s.players[s.user];
    u.r.FT = 95;
    const wide = meterWindow(s, u);
    u.r.FT = 40;
    expect(meterWindow(s, u)).toBeLessThan(wide);
  });

  // after the first play of round 39 (owner: "dont let any players teleport", "dont make the user's
  // player the inbounder", "dont let the players shoot from behind half court")
  it('moves nobody faster than a sprint, never makes him the inbounder, never shoots from past half court', () => {
    const step = FLOOR.speed[1] * FLOOR.sprint * FLOOR.tick * 1.15;
    let inbounds = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const s = startFloor(setup(seed));
      for (let k = 0; k < 20000 && s.phase !== 'over'; k++) {
        const was = s.players.map((p) => ({ x: p.x, y: p.y, on: p.on }));
        const phase = s.phase;
        const flight = s.ball.flight;
        stepFloor(s, k % 2 ? scripted(s) : null);
        s.players.forEach((p, i) => {
          if (!was[i].on || !p.on) return; // a substitution comes on where the other went off
          const d = Math.hypot(p.x - was[i].x, p.y - was[i].y);
          expect(d, `seed ${seed} tick ${s.tick} player ${i} moved ${d} ft`).toBeLessThanOrEqual(Math.max(step, FLOOR.dash * FLOOR.tick * 1.01));
        });
        // a dead ball comes alive: the inbound pass is in the air, and not from him
        if (phase === 'dead' && s.phase === 'live' && s.ball.flight?.kind === 'pass') {
          inbounds++;
          expect(s.ball.flight.by).not.toBe(s.user);
        }
        const f = s.ball.flight;
        if (f && f.kind === 'shot' && f !== flight) expect(inRange({ ...f.from, team: s.players[f.by].team })).toBe(true);
      }
    }
    expect(inbounds).toBeGreaterThan(30);
  });

  it('finishes at the rim on one tap: a shot or a strip, no meter, the athletic stripped less', () => {
    const strips = (ATH: number) => {
      let n = 0;
      let tries = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const st = setup(seed);
        st.us.players[1].r.ATH = ATH;
        const s = startFloor(st);
        // wait for his ball in the half court, then put him at the rim with a defender on him
        for (let k = 0; k < 400 && !(s.phase === 'live' && s.ball.holder === s.user && !s.ball.flight); k++) stepFloor(s, null);
        if (s.ball.holder !== s.user) continue;
        const me = s.players[s.user];
        const rim = rimOf(me.team);
        Object.assign(me, { x: rim.x + (me.team === 0 ? -2 : 2), y: rim.y });
        const d = s.players.find((p) => p.team !== me.team && p.on)!;
        Object.assign(d, { x: me.x + (me.team === 0 ? 1 : -1), y: me.y + 0.5 });
        const before = s.feed.length;
        stepFloor(s, { finish: true });
        tries++;
        const evs = s.feed.slice(before).map((e) => e.kind);
        const shot = s.ball.flight?.kind === 'shot' || evs.includes('block');
        expect(shot || evs.includes('steal')).toBe(true);
        expect(s.load).toBe(-1);
        if (evs.includes('steal')) n++;
      }
      return n / Math.max(1, tries);
    };
    const slow = strips(45);
    const quick = strips(95);
    expect(slow).toBeGreaterThan(0.05);
    expect(quick).toBeLessThan(slow);
  });
});

// Round 42 (owner: "instead of last six minutes, make it twelve (but same play time, so time goes by
// two times faster), allow the users to play all four quarters (or start from half time), and get
// rid of clutch time ... make the ai players drive in a bit more"; and, for two computers playing the
// same game online, arithmetic every browser does alike).
describe('round 42: quarters, the faster clock, the AI off the dribble', () => {
  const whole = (seed: number, quarter: 1 | 2 | 3 | 4): FloorSetup => ({ ...setup(seed), score: [0, 0], clock: FLOOR.quarter, quarter, rate: FLOOR.rate });

  it('a twelve-minute quarter on the Floor’s own clock takes the real time a career’s six minutes do', () => {
    expect(FLOOR.rate).toBe(2);
    expect(FLOOR.quarter / FLOOR.rate).toBe(FLOOR.from);
    const ticks = (set: FloorSetup) => {
      const s = startFloor(set);
      let live = 0;
      for (let i = 0; i < 400000 && s.phase !== 'over' && !s.periods; i++) {
        stepFloor(s, null);
        if (s.phase === 'live') live++;
      }
      return live;
    };
    // the clock runs for the same number of ticks: 4,800, four real minutes
    const six = ticks(setup(11));
    const twelve = ticks(whole(11, 4));
    expect(Math.abs(six - FLOOR.from / FLOOR.tick)).toBeLessThan(40);
    expect(Math.abs(twelve - FLOOR.from / FLOOR.tick)).toBeLessThan(40);
  });

  it('a whole game is four quarters: the horn, a rest, the fouls wiped, the ball by turns, the timeouts back at the half', () => {
    const s = startFloor(whole(5, 1));
    expect(s.quarter).toBe(1);
    const ends: { q: number; tick: number; fouls: [number, number]; poss: 0 | 1; clock: number }[] = [];
    let before: [number, number] = [0, 0];
    for (let i = 0; i < 400000 && s.phase !== 'over'; i++) {
      before = [...s.teamFouls] as [number, number];
      stepFloor(s, null);
      for (const e of freshEvents(s)) if (e.kind === 'quarter') ends.push({ q: e.q!, tick: s.tick, fouls: [...s.teamFouls] as [number, number], poss: s.inbound!.team, clock: s.clock });
    }
    expect(ends.map((e) => e.q)).toEqual([1, 2, 3]);
    for (const e of ends) {
      expect(e.fouls).toEqual([0, 0]);
      expect(e.clock).toBe(FLOOR.quarter);
    }
    // the team that started has it again in the fourth; the other one starts the second and third
    expect(ends[0].poss).toBe(s.first === 0 ? 1 : 0);
    expect(ends[1].poss).toBe(s.first === 0 ? 1 : 0);
    expect(ends[2].poss).toBe(s.first);
    expect(s.quarter).toBe(4);
    expect(s.phase).toBe('over');
    expect(s.score[0]).not.toBe(s.score[1]);
    void before;
  });

  it('a game from half time plays two quarters, and one from the fourth plays one', () => {
    for (const [q, n] of [[3, 1], [4, 0], [2, 2]] as const) {
      const s = startFloor(whole(9, q));
      let horns = 0;
      for (let i = 0; i < 400000 && s.phase !== 'over'; i++) {
        stepFloor(s, null);
        horns += freshEvents(s).filter((e) => e.kind === 'quarter').length;
      }
      expect(horns).toBe(n);
    }
  });

  it('the last seconds belong to the fourth: no late marks and no fouling on purpose before it', () => {
    const s = startFloor({ ...whole(3, 1), score: [0, 6] });
    let hacked = 0;
    for (let i = 0; i < 400000 && s.quarter < 4 && s.phase !== 'over'; i++) {
      const fouls = s.teamFouls[0] + s.teamFouls[1];
      const held = s.ball.holder !== null && !s.ball.flight && s.phase === 'live';
      stepFloor(s, null);
      // a foul with the ball held and nobody shooting, straight to the line, is the one on purpose
      if (held && s.phase === 'ft' && s.teamFouls[0] + s.teamFouls[1] === fouls + 1 && !freshEvents(s).some((e) => e.kind === 'reach')) hacked += s.clock <= FLOOR.hack.secs * s.rate ? 1 : 0;
    }
    expect(s.marks.winner).toBe(false);
    expect(s.marks.stop).toBe(false);
    expect(hacked).toBe(0);
  });

  it('the AI takes its man off the dribble: men beaten, and the rim taking shots from mid-range', () => {
    let beats = 0;
    let rim = 0;
    let mid = 0;
    for (let k = 0; k < 30; k++) {
      const s = startFloor(setup(500 + k));
      for (let i = 0; i < 40000 && s.phase !== 'over'; i++) {
        stepFloor(s, null);
        for (const e of freshEvents(s)) {
          if (e.kind === 'beat') beats++;
          if (e.kind === 'make' || e.kind === 'miss' || e.kind === 'block') {
            if (e.zone === 'rim') rim++;
            if (e.zone === 'mid') mid++;
          }
        }
      }
    }
    // about 3.5 a team a game (FLOOR.attack); none before round 42
    expect(beats / 30 / 2).toBeGreaterThan(2);
    expect(beats / 30 / 2).toBeLessThan(6);
    // the rim takes a good share of what mid-range had (21.94% of shots against 38.72% before)
    expect(rim / (rim + mid)).toBeGreaterThan(0.4);
  });

  it('keeps to arithmetic every browser does alike: its own sine, no Math.hypot', async () => {
    const { sin, cos, hyp } = await import('../src/engine/floor/court');
    for (let a = -20; a < 60; a += 0.137) {
      expect(Math.abs(sin(a) - Math.sin(a))).toBeLessThan(1e-6);
      expect(Math.abs(cos(a) - Math.cos(a))).toBeLessThan(1e-6);
    }
    expect(hyp(3, 4)).toBe(5);
    const fs = await import('node:fs');
    for (const f of ['sim.ts', 'court.ts']) {
      const src = fs.readFileSync(new URL(`../src/engine/floor/${f}`, import.meta.url), 'utf8');
      expect(src.match(/Math\.(sin|cos|tan|atan2?|hypot|pow|exp|log)\(/g) ?? [], f).toEqual([]);
      expect(src.includes(' ** '), f).toBe(false);
    }
  });
});
