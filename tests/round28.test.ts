// Round 28: age edges on the season plans, staff talks and lifestyle visits with a small edge (and
// visits as often as he likes), duos and Big Threes that end the moment any of them moves, and the
// nickname whose logo waits for the first brand deal.

import { beforeAll, describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { Decision, GameState } from '../src/engine/types';
import { AGE_PLANS, VISIT, ageEdge, blendPlans } from '../src/engine/balance';
import { activeDuo, activeTrio, breakGroup, growBonds } from '../src/engine/career/duo';
import { hireStaff, talkStaff } from '../src/engine/career/staff';
import { visitItem } from '../src/engine/economy/shop';
import { awardNickname, pushBrand, resolveBrand } from '../src/engine/career/nickname';
import { LOG_MAX, LOG_WARN } from '../src/ui/careerLog';
import { NO_TOTALS, earnedNow } from '../src/engine/achievements';
import { NeedLive, isFinal, playLiveGame, type LiveGameArgs, type LiveRequest } from '../src/engine/career/live';
import { expected } from '../src/engine/sim/statModel';
import { userProfile } from '../src/engine/career/season';

let pro: GameState;
const copy = (): GameState => structuredClone(pro);

beforeAll(() => {
  const r = makeRng(280028);
  const s = newGame(280028, { name: 'Theo Marsh', number: 8, pos: 'SF', archetype: 1, focus: ['SHT', 'ATH'], hometown: 'Tulsa', highSchool: 'Central High' });
  s.flags.simPostseason = 1;
  for (let i = 0; i < 6000; i++) {
    const p = prompt(s);
    if (p.type === 'retired') break;
    if (s.stage === 'NBA' && s.serviceYears >= 3 && p.type !== 'decision' && s.step === 'offseason') break;
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
  }
  expect(s.stage).toBe('NBA');
  pro = s;
}, 60_000);

describe('age edges on the season plans', () => {
  it('makes grind, spotlight and learning from a vet stronger and safer for the young', () => {
    for (const plan of AGE_PLANS.young.plans) {
      expect(ageEdge(plan, 20)).toBe('young');
      expect(blendPlans(plan, null, 20).growth).toBeGreaterThan(blendPlans(plan).growth);
      expect(blendPlans(plan, null, 20).injury).toBeLessThan(blendPlans(plan).injury);
      expect(ageEdge(plan, 27)).toBeNull();
      expect(blendPlans(plan, null, 27).growth).toBeCloseTo(blendPlans(plan).growth, 9);
    }
  });

  it('makes recovery and Team first do more for a veteran, Team first for the team too', () => {
    for (const plan of AGE_PLANS.vet.plans) {
      expect(ageEdge(plan, 32)).toBe('vet');
      expect(blendPlans(plan, null, 32).growth).toBeGreaterThan(blendPlans(plan).growth);
      expect(blendPlans(plan, null, 32).injury).toBeLessThan(blendPlans(plan).injury);
    }
    expect(blendPlans('teamfirst', null, 32).teamBoost).toBeGreaterThan(blendPlans('teamfirst').teamBoost);
    expect(ageEdge('recovery', 22)).toBeNull();
  });

  it('carries the edge into a main plan and side plan blend', () => {
    expect(blendPlans('grind', 'balanced', 19).growth).toBeGreaterThan(blendPlans('grind', 'balanced').growth);
  });
});

describe('staff talks and lifestyle visits', () => {
  it('gives a small edge for a talk: the trainer adds a touch of athleticism', () => {
    const s = copy();
    s.player.staff = [];
    s.player.bank = 100;
    s.player.attrs.ATH = 60;
    const m = hireStaff(s, 'trainer')!;
    const said = talkStaff(s, m.id)!;
    expect(said).toContain('small edge');
    expect(s.player.attrs.ATH).toBeGreaterThan(60);
    expect(talkStaff(s, m.id)).toBeNull(); // the edge comes once a season
  });

  it('lets him go back as often as he likes; the lift comes once a season', () => {
    const s = copy();
    s.purchases = [...s.purchases, 'car'];
    s.player.visits = {};
    s.player.morale = 50;
    s.player.wear = 10;
    const first = visitItem(s, 'car');
    expect(first).toContain('small edge');
    expect(s.player.morale).toBe(50 + VISIT.morale);
    expect(s.player.wear).toBe(10 - VISIT.rest);
    const again = visitItem(s, 'car');
    expect(again).toBeTruthy();
    expect(again).not.toContain('small edge');
    expect(s.player.morale).toBe(50 + VISIT.morale);
    expect(visitItem(s, 'not-owned')).toBeNull();
  });
});

describe('duos and Big Threes', () => {
  /** His duo and Big Three with two teammates on his roster. */
  function group(s: GameState) {
    const t = s.nba!.teams.find((x) => x.id === s.teamId)!;
    const [a, b] = t.roster.filter((x) => x.id !== -1).slice(0, 2);
    s.bonds = [
      { id: a.id, name: a.name, pos: a.pos, spark: 0.9, bond: 100, seasons: 2, formed: s.year - 1, nick: 'The Splash Pair' },
      { id: b.id, name: b.name, pos: b.pos, spark: 0.9, bond: 100, seasons: 1, formed: s.year, nick: 'The Big Three', trio: true },
    ];
    return { t, a, b };
  }

  it('ends the whole Big Three when any one of them leaves', () => {
    const s = copy();
    const { t, a, b } = group(s);
    expect(activeDuo(s)?.id).toBe(a.id);
    expect(activeTrio(s)?.id).toBe(b.id);
    // the third man is traded away
    const other = s.nba!.teams.find((x) => x.id !== t.id)!;
    t.roster = t.roster.filter((x) => x.id !== b.id);
    other.roster.push(b);
    expect(activeDuo(s)).toBeNull(); // not a duo any more: the group is over
    expect(activeTrio(s)).toBeNull();
    s.moments = [];
    growBonds(s, null);
    expect(s.moments.some((m) => /the end/.test(m.title))).toBe(true);
    const left = s.bonds!.find((x) => x.id === a.id)!;
    expect(left.formed).toBeUndefined(); // the teammate who stayed starts over
    expect(s.bonds!.some((x) => x.id === b.id)).toBe(false);
  });

  it('ends it at once when he is the one who moves', () => {
    const s = copy();
    const { t } = group(s);
    const other = s.nba!.teams.find((x) => x.id !== t.id)!;
    s.teamId = other.id;
    s.moments = [];
    breakGroup(s);
    expect(s.moments.some((m) => /the end/.test(m.title) && /You play for/.test(m.text))).toBe(true);
    expect(s.bonds!.filter((x) => x.formed !== undefined)).toHaveLength(0);
  });
});

describe('the nickname, then the logo', () => {
  it('names him without the logo, and shows the logo with his first brand deal only', () => {
    const s = copy();
    s.player.nickname = undefined;
    s.player.brand = undefined;
    s.player.rep = 90;
    s.moments = [];
    awardNickname(s, '#123456', 'Team');
    const named = s.moments.find((m) => m.nick);
    expect(named?.nick).toBe(s.player.nickname!.name);
    expect(named?.logo).toBeUndefined();
    expect(s.player.nickname!.logo).toBeFalsy();
    s.pending = [];
    pushBrand(s);
    const d = s.pending.find((x) => x.kind === 'brand') as Decision;
    resolveBrand(s, d, d.choices[0].id);
    expect(s.player.nickname!.logo).toBe(true);
    expect(s.moments.some((m) => m.logo === s.player.nickname!.id)).toBe(true);
    // a renewal does not draw it again
    const before = s.moments.filter((m) => m.logo).length;
    s.player.brand!.left = 0;
    s.pending = [];
    pushBrand(s);
    const d2 = s.pending.find((x) => x.kind === 'brand') as Decision;
    resolveBrand(s, d2, d2.choices[0].id);
    expect(s.moments.filter((m) => m.logo).length).toBe(before);
  });
});

describe('the career log', () => {
  it('keeps ten, like the saved careers', () => {
    expect(LOG_MAX).toBe(10);
    expect(LOG_WARN).toBe(9);
  });
});

describe('crunch time in a final', () => {
  it('knows a final from the rounds before it', () => {
    for (const r of ['NBA Finals', 'G League Finals', 'Finals', 'National championship', 'State final', 'Youth final', 'EuroLeague final']) expect(isFinal(r)).toBe(true);
    for (const r of ['Conference finals', 'Final Four', 'Final Four semifinal', 'State semifinals', 'First round', 'Play-In']) expect(isFinal(r)).toBe(false);
  });

  /** Plays one game, answering every pause with `answer`; the requests it stopped at. */
  function play(seed: number, round: string, answer: (r: LiveRequest) => string, my = 70, opp = 70) {
    const base = copy();
    base.rng = makeRng(seed);
    const args: LiveGameArgs = { e: expected(userProfile(base), 'NBA', 36, 1), started: true, level: 'NBA', my, opp, oppName: 'Boston Celtics', homeAdv: 1, round, series: { game: 7, bestOf: 7, wins: 3, losses: 3 } };
    const picks: string[] = [];
    const seen: LiveRequest[] = [];
    for (let k = 0; k < 80; k++) {
      const s = structuredClone(base);
      s.live = { picks: [...picks], i: 0, simAll: false, simSeries: null, recent: [] };
      try {
        return { res: playLiveGame(s, args), seen, s };
      } catch (e) {
        if (!(e instanceof NeedLive)) throw e;
        seen.push(e.req);
        picks.push(answer(e.req));
      }
    }
    throw new Error('the game never ended');
  }
  const steady = (r: LiveRequest) => (r.stage === 'quarter' ? 'steady' : r.stage === 'clutch' ? 'pull@good' : r.side === 'off' ? 'drive' : 'contest');

  it('plays a close final trip by trip, his ball first, then theirs, and the score adds up', () => {
    let crunched = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const { res, seen, s } = play(seed, 'NBA Finals', steady);
      const c = seen.filter((r) => r.stage === 'crunch');
      if (!c.length) {
        expect(s.flags.crunch ?? 0).toBe(pro.flags.crunch ?? 0);
        continue;
      }
      crunched++;
      // counted for the achievement book
      expect(s.flags.crunch).toBe((pro.flags.crunch ?? 0) + 1);
      expect(s.flags.crunchWon ?? 0).toBe((pro.flags.crunchWon ?? 0) + (res.win ? 1 : 0));
      expect(c[0].side).toBe('off');
      expect(c[0].clock).toBe('2:00');
      expect(c[0].last).toBeNull();
      expect(c[1].side).toBe('def');
      expect(c[1].last).not.toBeNull();
      expect(Math.abs(c[0].us - c[0].them)).toBeLessThanOrEqual(8);
      // the quarters add up to the score on every trip
      for (const r of c) {
        expect(r.qs).toHaveLength(4);
        expect(r.qs.reduce((n, q) => n + q[0], 0)).toBe(r.us);
        expect(r.qs.reduce((n, q) => n + q[1], 0)).toBe(r.them);
      }
      expect(res.us).toBeGreaterThanOrEqual(c[c.length - 1].us);
      expect(res.win).toBe(res.us > res.them);
      expect(seen.some((r) => r.stage === 'clutch')).toBe(false); // crunch time replaces the old last shot
    }
    expect(crunched).toBeGreaterThan(10);
  });

  it('keeps the old last shot for the rounds before the final', () => {
    for (let seed = 1; seed <= 20; seed++) expect(play(seed, 'Conference finals', steady).seen.some((r) => r.stage === 'crunch')).toBe(false);
  });

  it('lets his calls matter: a great shooter does better pulling up than posting up', () => {
    const tally = (answer: (r: LiveRequest) => string) => {
      let pts = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const { seen } = play(seed, 'NBA Finals', answer);
        const c = seen.filter((r) => r.stage === 'crunch');
        if (c.length > 1) pts += c[c.length - 1].us - c[0].us;
      }
      return pts;
    };
    const was = { ...pro.player.attrs };
    pro.player.attrs.SHT = 95;
    pro.player.attrs.INT = 40;
    const pull = tally((r) => (r.stage === 'crunch' && r.side === 'off' ? 'pull' : steady(r)));
    const post = tally((r) => (r.stage === 'crunch' && r.side === 'off' ? 'post' : steady(r)));
    pro.player.attrs = was;
    expect(pull).toBeGreaterThan(post);
  });

  it('goes to overtime when crunch time ends level', () => {
    let ot = 0;
    for (let seed = 1; seed <= 200 && !ot; seed++) {
      const { seen } = play(seed, 'NBA Finals', steady);
      if (seen.some((r) => r.stage === 'crunch' && (r.ot ?? 0) > 0)) ot++;
    }
    expect(ot).toBe(1);
  });
});

describe('the achievements for this round', () => {
  it('reads crunch time, the logo and the talk with the coach off the career', () => {
    const s = copy();
    s.flags = { ...s.flags, crunch: 0, crunchWon: 0, crunchBack: 0, crunchOtWon: 0 };
    s.player.nickname = undefined;
    s.teamStyle = undefined;
    const none = earnedNow(s, { ...NO_TOTALS });
    for (const id of ['crunch1', 'crunchwin', 'crunchback', 'crunchot', 'crunch5', 'logo', 'chalk']) expect(none).not.toContain(id);
    s.flags = { ...s.flags, crunch: 6, crunchWon: 5, crunchBack: 1, crunchOtWon: 1 };
    awardNickname(s, '#123456', 'Team');
    s.player.nickname!.logo = true;
    s.teamStyle = { key: 'pace', teamId: s.teamId! };
    const all = earnedNow(s, { ...NO_TOTALS });
    for (const id of ['crunch1', 'crunchwin', 'crunchback', 'crunchot', 'crunch5', 'logo', 'chalk']) expect(all).toContain(id);
  });
});
