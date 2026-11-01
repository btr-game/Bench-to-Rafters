// Round 32: the next generation (Love storyline to a son; his career built from his father's;
// a share of his legacy on his father's card), and the Day one page's class.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { canPlayChild, childGame, childLegacy, childSeed } from '../src/engine/nextGen';
import { careerRecord } from '../src/engine/career/record';
import { legacyIndex } from '../src/engine/awards/tiers';
import { NEXT_GEN } from '../src/engine/balance';

const input = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };

/** A career played by the harness's smart player (who says yes to love, a proposal and a family). */
function career(seed: number): GameState {
  const r = makeRng(seed);
  const s = newGame(seed, { ...input, mode: 'standard' });
  s.flags.fast = 1;
  s.flags.simPostseason = 1;
  for (let k = 0; k < 6000; k++) {
    const pr = prompt(s);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') choose(s, smartChoice(s, pr.decision, r));
    else advance(s);
  }
  return s;
}

/** A retired father with a son, without playing a whole career. */
function father(): GameState {
  const g = newGame(99, { ...input, mode: 'stars' });
  g.step = 'retired';
  g.stage = 'RETIRED';
  g.flags.child = g.year;
  return g;
}

describe('round 32: the next generation', () => {
  it('the Love storyline ends in a son for some careers, and only after a career ends can he play', () => {
    let kids = 0;
    for (let i = 0; i < 12; i++) {
      const g = career(32001 + i);
      expect(g.step).toBe('retired');
      if (g.flags.child) {
        kids++;
        expect(canPlayChild(g)).toBe(true);
      }
    }
    expect(kids).toBeGreaterThan(0);
    const g = father();
    g.step = 'offseason';
    expect(canPlayChild(g)).toBe(false);
  }, 240_000);

  it('the son: Comet speed, his father\'s difficulty, number and roots, no family of his own', () => {
    const f = father();
    const k = childGame(f, childSeed(f), 'rec-1', 120, 'slot-1');
    expect(k.flags.gen2).toBe(1);
    expect(k.flags.comet).toBe(1);
    expect(k.flags.fast).toBe(1);
    expect(k.flags.sim).toBe(1);
    expect(k.mode).toBe('stars');
    expect(k.player.number).toBe(23);
    expect(k.player.name.endsWith(' Hale')).toBe(true);
    expect(k.player.name).not.toBe('Marcus Hale');
    expect(k.player.country).toBe(f.player.country);
    expect(k.parent).toMatchObject({ name: 'Marcus Hale', recId: 'rec-1', legacy: 120, slot: 'slot-1', peak: Math.round(f.player.peakOvr), titles: 0, mvps: 0 });
    // the same son every time his father's save is looked at
    expect(childGame(f, childSeed(f), 'rec-1', 120).player.name).toBe(k.player.name);
    // and never a third generation
    k.step = 'retired';
    k.flags.child = k.year;
    expect(canPlayChild(k)).toBe(false);
  });

  it('a lab father\'s son plays the standard difficulty', () => {
    const f = father();
    f.mode = 'lab';
    expect(childGame(f, 5, 'r', 0).mode).toBe('standard');
  });

  it('like his father, a little worse more often than better, with rare big jumps', () => {
    const f = father();
    const dh: number[] = [];
    const dp: number[] = [];
    for (let i = 0; i < 300; i++) {
      const k = childGame(f, 1000 + i * 7919, 'r', 0).player;
      dh.push(k.fullHeight - f.player.fullHeight);
      dp.push(k.potential - f.player.potential);
    }
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(Math.abs(mean(dh))).toBeLessThan(0.6);
    expect(dh.filter((x) => Math.abs(x) <= 2).length).toBeGreaterThan(240);
    expect(dh.some((x) => Math.abs(x) >= 3)).toBe(true);
    expect(mean(dp)).toBeLessThan(-1);
    expect(mean(dp)).toBeGreaterThan(-5);
    expect(dp.filter((x) => x < 0).length).toBeGreaterThan(dp.filter((x) => x > 0).length * 1.5);
  });

  it('a share of his legacy goes to his father, on the father\'s card and in his legacy points', () => {
    const f = father();
    const rec = careerRecord(f);
    const kid = childLegacy({ ...rec, name: 'Tari Hale', legacy: 80 });
    expect(kid.adds).toBeCloseTo(80 * NEXT_GEN.share, 5);
    const before = legacyIndex(f);
    f.kid = kid;
    expect(legacyIndex(f)).toBeCloseTo(before + kid.adds, 5);
    expect(careerRecord(f).child?.name).toBe('Tari Hale');
  });
});

describe('round 32: Day one scrolls', () => {
  it('a moment\'s kind is a prefixed class, so it never picks up a page\'s own (the intro page\'s .intro)', () => {
    const src = readFileSync('src/ui/components/Overlays.tsx', 'utf8');
    expect(src).toContain('overlay moment mo-${m.kind}');
    expect(src).not.toMatch(/overlay moment \$\{m\.kind\}/);
  });
});

// ---------- the rest of round 32: the head coach, the locker room, the farewell tour, records ----------

import { ACHIEVEMENTS } from '../src/engine/achievements';
import { ROUND32_EVENTS } from '../src/engine/events/round32';
import { offerEvent } from '../src/engine/events/resolver';
import { COACH, FAREWELL, LOCKER, TRUST_ROLE } from '../src/engine/balance';
import { askRole, canAskRole, changeCoach, coachOf, coachOfYear, myTeam, offseasonCoaching, onHotSeat } from '../src/engine/career/coach';
import { lockerRoom, lockerTalk, talkFor } from '../src/engine/career/locker';
import { announceFarewell, canFarewell, endFarewell } from '../src/engine/career/farewell';
import { GAME_RECORDS, SCORING_LIST, canChase, chaseRecord, recordWatch } from '../src/engine/career/records';
import { nbaCareerPoints } from '../src/engine/awards/legacy';

/** A stars career played until an NBA season is about to tip off, its plan picked (or, with `off`,
 * an NBA offseason with its calls made). Fast break goes preseason, midseason, summary. */
function inNBA(seed: number, off = false): GameState {
  const r = makeRng(seed);
  const s = newGame(seed, { ...input, mode: 'stars' });
  s.flags.fast = 1;
  s.flags.simPostseason = 1;
  for (let k = 0; k < 6000; k++) {
    if (s.stage === 'NBA' && !s.pending.length && (off ? s.step === 'offseason' : !!s.season && s.step === 'preseason')) return s;
    const pr = prompt(s);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') choose(s, smartChoice(s, pr.decision, r));
    else advance(s);
  }
  throw new Error(`seed ${seed} never reached the NBA`);
}

describe('round 32: the head coach', () => {
  const g = inNBA(32101);

  it('every team has a coach of its own, and a new one each time one goes', () => {
    const t = myTeam(g)!;
    const a = coachOf(t);
    expect(coachOf(t)).toEqual(a);
    const s = structuredClone(g);
    const t2 = myTeam(s)!;
    const was = t2.coachN ?? 0;
    const now = changeCoach(s, t2, 47);
    expect(t2.coachN).toBe(was + 1);
    expect(now).toEqual(coachOf(t2));
    expect(s.player.trust).toBe(47); // his own team: trust starts over
    expect(s.flags.coaches).toBe((g.flags.coaches ?? 0) + 1);
    // in the NBA the coaching factor is drawn again and counted in the team's strength
    expect(typeof t2.coach).toBe('number');
  });

  it('the role talk: once a season, never with the biggest role; a yes lifts trust to the next role', () => {
    let yes = 0;
    for (let i = 0; i < 40; i++) {
      const s = structuredClone(g);
      s.rng = makeRng(900 + i);
      if (s.season!.role === 'key') s.season!.role = 'rotation';
      expect(canAskRole(s)).toBe(true);
      const out = askRole(s);
      expect(out).toBeTruthy();
      expect(canAskRole(s)).toBe(false);
      expect(askRole(s)).toBeNull();
      if (s.flags.roleYes) {
        yes++;
        expect(s.player.trust).toBeGreaterThanOrEqual(TRUST_ROLE.up);
      } else expect(s.player.trust).toBeLessThan(g.player.trust + 1);
    }
    expect(yes).toBeGreaterThan(0);
    expect(yes).toBeLessThan(40);
    const s = structuredClone(g);
    s.season!.role = 'key';
    expect(canAskRole(s)).toBe(false);
  });

  it('the hot seat: only a team under .400 after 12 games', () => {
    const s = structuredClone(g);
    const t = myTeam(s)!;
    Object.assign(t, { w: 3, l: 7 });
    expect(onHotSeat(s)).toBe(false); // too early
    Object.assign(t, { w: 4, l: 10 });
    expect(onHotSeat(s)).toBe(true);
    Object.assign(t, { w: 7, l: 7 });
    expect(onHotSeat(s)).toBe(false);
  });

  it('NBA teams that lose badly may fire their coach in the summer; winners never do', () => {
    let fired = 0;
    for (let i = 0; i < 60; i++) {
      const s = structuredClone(g);
      s.rng = makeRng(1200 + i);
      const nba = s.nba!;
      nba.teams.forEach((t, j) => Object.assign(t, j === 0 ? { w: 15, l: 67 } : { w: 50, l: 32 }));
      const n0 = nba.teams.map((t) => t.coachN ?? 0);
      const lines = offseasonCoaching(s, nba);
      nba.teams.slice(1).forEach((t, j) => expect(t.coachN ?? 0).toBe(n0[j + 1]));
      if ((nba.teams[0].coachN ?? 0) > n0[0]) {
        fired++;
        expect(lines[0]).toMatch(/fire/);
      }
    }
    // 45% (COACH.fireChance) of 60: about 27
    expect(fired).toBeGreaterThan(60 * COACH.fireChance * 0.5);
    expect(fired).toBeLessThan(60 * COACH.fireChance * 1.5);
  });

  it('Coach of the Year goes to the team that beat its talent by the most; his own is worth trust', () => {
    const s = structuredClone(g);
    const nba = s.nba!;
    const weakest = [...nba.teams].sort((a, b) => a.strength - b.strength)[0];
    nba.teams.forEach((t) => Object.assign(t, { w: 41, l: 41 }));
    Object.assign(weakest, { w: 60, l: 22 });
    s.teamId = weakest.id;
    const before = s.player.trust;
    const coy = coachOfYear(s, nba)!;
    expect(coy.team.id).toBe(weakest.id);
    expect(s.flags.coyYear).toBe(s.year);
    expect(s.player.trust).toBe(Math.min(100, before + COACH.coyTrust));
  });

  it('the coach events still answer when he has left the team since they were asked (the crash)', () => {
    for (const id of ['coachDinner', 'coachPoached', 'coachfired', 'prankWar']) {
      const s = structuredClone(g);
      s.player.rep = 70;
      expect(offerEvent(s, id)).toBe(true);
      const d = s.pending[0];
      expect(d.data?.eventId).toBe(id);
      s.teamId = null as unknown as string; // between teams by the time he answers
      expect(() => choose(s, d.choices[0].id)).not.toThrow();
    }
  });
});

describe('round 32: the locker room', () => {
  const g = inNBA(32102);

  it('the room: up to seven people, the coach at his door, each with a character and something to say', () => {
    const room = lockerRoom(g)!;
    expect(room).toBeTruthy();
    expect(room.mates.length).toBeGreaterThan(0);
    expect(room.mates.length).toBeLessThanOrEqual(6);
    for (const m of room.mates) expect(talkFor(room, String(m.id))!.options.length).toBeGreaterThanOrEqual(2);
    expect(talkFor(room, 'coach')!.options.length).toBe(3);
  });

  it('one talk each a half, and the chemistry it moves stays inside the season cap', () => {
    const s = structuredClone(g);
    const room = lockerRoom(s)!;
    const first = room.mates[0];
    const opt = talkFor(room, String(first.id))!.options[0].id;
    expect(lockerTalk(s, String(first.id), opt)).not.toBeNull();
    expect(lockerTalk(s, String(first.id), opt)).toBeNull();
    expect(s.flags.lkTalk).toBe((g.flags.lkTalk ?? 0) + 1);
    // however many talks pile up, the room moves chemistry by the cap at most
    for (let i = 0; i < 30; i++) {
      s.locker!.done = [];
      for (const m of room.mates) {
        const t = talkFor(room, String(m.id))!;
        lockerTalk(s, String(m.id), t.options[0].id);
      }
    }
    expect(Math.abs(s.locker!.chem)).toBeLessThanOrEqual(LOCKER.cap + 1e-9);
  });
});

describe('round 32: the farewell tour and record chases', () => {
  it('from 32 in an NBA offseason: the tour, its gifts, its honour', () => {
    const g = inNBA(32103, true);
    const s = structuredClone(g);
    s.player.age = FAREWELL.age - 1;
    expect(canFarewell(s)).toBe(false);
    s.player.age = FAREWELL.age;
    expect(canFarewell(s)).toBe(true);
    const morale = s.player.morale;
    announceFarewell(s);
    expect(s.flags.farewell).toBe(s.year + 1);
    expect(s.player.morale).toBe(Math.min(100, morale + FAREWELL.morale));
    expect(canFarewell(s)).toBe(false);
    // the end of the last season: six road arenas, none of them his own, and the honour
    s.year = s.flags.farewell!;
    s.step = 'summary';
    endFarewell(s);
    expect(s.player.gifts).toHaveLength(FAREWELL.gifts);
    expect(new Set(s.player.gifts!.map((x) => x.team)).size).toBe(FAREWELL.gifts);
    expect(s.player.gifts!.some((x) => x.team === myTeam(s)?.name)).toBe(false);
    expect(s.awards.some((a) => a.key === 'FAREWELL' && a.year === s.year)).toBe(true);
  });

  it('the record watch: near a legend on the list, near a single-game record; a chase once a season', () => {
    const g = inNBA(32104);
    const s = structuredClone(g);
    expect(SCORING_LIST[0].pts).toBeGreaterThan(SCORING_LIST[SCORING_LIST.length - 1].pts);
    // a career high a point short of the threes record
    s.highs = { ...(s.highs ?? {}), nba: { ...(s.highs?.nba ?? {}), tpm: { v: GAME_RECORDS.tpm.v - 1, year: s.year } } } as GameState['highs'];
    expect(recordWatch(s).some((w) => w.kind === 'game' && /threes/.test(w.text))).toBe(true);
    // a last NBA season that leaves him 500 points short of a legend mid-list: a season's pace away
    const target = SCORING_LIST[50];
    const pts = target.pts - 500 - nbaCareerPoints(s);
    s.history.push({ ...(s.history[s.history.length - 1] ?? {}), level: 'NBA', line: { ...(s.history[s.history.length - 1]?.line ?? {}), pts }, post: { pts: 0 } } as GameState['history'][number]);
    const w = recordWatch(s).find((x) => x.kind === 'list');
    expect(w).toBeTruthy();
    expect(canChase(s)).toBe(true);
    chaseRecord(s);
    expect(s.flags.chase).toBe(s.year);
    expect(canChase(s)).toBe(false);
  });
});

describe('round 32: achievements and events', () => {
  it('the book holds more than 650, every id and name once', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(650);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.name)).size).toBe(ACHIEVEMENTS.length);
  });

  it('the round\'s events can be offered and answered on a real NBA season', () => {
    const g = inNBA(32105);
    for (const e of ROUND32_EVENTS) {
      const s = structuredClone(g);
      s.flags.wed = s.year - 1;
      s.flags.child = s.year - 3;
      expect(offerEvent(s, e.id)).toBe(true);
      const d = s.pending[0];
      for (const c of d.choices) {
        const t = structuredClone(s);
        expect(() => choose(t, c.id)).not.toThrow();
        expect(t.result?.title).toBe(e.title);
      }
    }
  });
});

describe('round 32: the live strip carries house players', () => {
  it('the court moves between a few hundred and the low thousands; careers ended never go down and stay below it', async () => {
    const { HOUSE_COURT, houseEnded, houseOnCourt } = await import('../src/ui/houseLive');
    const t0 = Date.UTC(2026, 10, 1, 0, 0, 0);
    let lo = Infinity;
    let hi = 0;
    for (let t = t0; t < t0 + 2 * 86_400_000; t += 60_000) {
      const v = houseOnCourt(t);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    expect(lo).toBeGreaterThanOrEqual(HOUSE_COURT.low);
    expect(hi).toBeLessThanOrEqual(HOUSE_COURT.high);
    expect(hi - lo).toBeGreaterThan(700); // it really moves over a day
    // it fluctuates from one 4-second tick to the next, but not wildly
    let moved = 0;
    for (let t = t0; t < t0 + 3_600_000; t += 4000) {
      const d = Math.abs(houseOnCourt(t + 4000) - houseOnCourt(t));
      if (d > 0) moved++;
      expect(d).toBeLessThan(80);
    }
    expect(moved).toBeGreaterThan(400);
    for (const opened of [t0, t0 + 5 * 3_600_000, t0 + 13 * 3_600_000]) {
      let last = 0;
      for (let m = 0; m <= 240; m++) {
        const now = opened + m * 60_000;
        const e = houseEnded(opened, now);
        expect(e).toBeGreaterThanOrEqual(last);
        expect(e).toBeLessThan(houseOnCourt(now));
        if (m === 5) expect(e).toBeGreaterThan(15); // meaningful within minutes
        if (m === 60) expect(e).toBeGreaterThan(100);
        last = Math.max(last, e);
      }
    }
    expect(houseEnded(t0, t0)).toBe(0);
  });
});

describe('the dev deck’s project summary', () => {
  it('every block has the shape the deck draws (a crash here kept the whole deck from opening)', () => {
    const d = JSON.parse(readFileSync('src/dev/summary.json', 'utf8')) as { chapters: { title: string; blocks: Record<string, unknown>[] }[] };
    for (const c of d.chapters) {
      for (const b of c.blocks) {
        if (b.t === 'ul') for (const it of b.items as unknown[]) expect(Array.isArray(it) && (it as unknown[]).every((x) => typeof x === 'string'), `${c.title}: ${JSON.stringify(it).slice(0, 60)}`).toBe(true);
        else if (b.t === 'table') for (const r of b.rows as unknown[][]) expect(r.length, `${c.title}: ${String(r[0])}`).toBe((b.head as string[]).length);
        else expect(typeof b.text).toBe('string');
      }
    }
  });
});
