import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { advance, canChangePosition, canRetire, changePosition, choose, newGame, positionOptions, prompt, retireByChoice } from '../src/engine/flow';
import { fastForward, setFast } from '../src/engine/fast';
import { bankGains, labCost, spendCredits } from '../src/engine/career/lab';
import { pushShop } from '../src/engine/economy/shop';
import { buildDrama } from '../src/engine/story/drama';
import { canRecruit, recruitInfo, recruitPlayer, scoutingBoard, takePayCut } from '../src/engine/career/recruit';
import { startArc } from '../src/engine/events/arcs';
import { winningEdge } from '../src/engine/career/team';
import { ovrOf } from '../src/engine/player/ovr';
import { compareCareer, rankModelFit } from '../src/engine/awards/compare';
import { blendPlans, DIFFICULTIES } from '../src/engine/balance';
import { makeRng, next, normal } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { runCareer } from '../scripts/harness';

const input = { name: 'Test Player', number: 23, pos: 'SF' as const, archetype: 1, focus: ['SHT', 'PER'] as ('SHT' | 'PER')[], hometown: 'Akron, OH', highSchool: 'St. Vincent' };

function playOut(s: GameState, maxSteps = 5000): number {
  let steps = 0;
  while (steps++ < maxSteps) {
    const p = prompt(s);
    if (p.type === 'retired') break;
    if (p.type === 'decision') choose(s, p.decision.choices.find((c) => !c.disabled)!.id);
    else advance(s);
  }
  return steps;
}

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = makeRng(7);
    const b = makeRng(7);
    for (let i = 0; i < 100; i++) expect(next(a)).toBe(next(b));
  });
  it('normal() has roughly the right mean and spread', () => {
    const r = makeRng(1);
    const xs = Array.from({ length: 20000 }, () => normal(r, 10, 2));
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
    expect(m).toBeGreaterThan(9.9);
    expect(m).toBeLessThan(10.1);
    expect(sd).toBeGreaterThan(1.9);
    expect(sd).toBeLessThan(2.1);
  });
});

describe('flow', () => {
  it('plays a full career to retirement', () => {
    const s = newGame(11, input);
    const steps = playOut(s);
    expect(s.step).toBe('retired');
    expect(steps).toBeLessThan(5000);
    expect(s.history.length).toBeGreaterThanOrEqual(4);
    expect(s.verdict).toBeTruthy();
  });

  it('same seed and same choices give the same career', () => {
    const a = newGame(99, input);
    const b = newGame(99, input);
    playOut(a);
    playOut(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('game state is plain JSON at every step (saves can use JSON.stringify)', () => {
    const s = newGame(5, input);
    for (let i = 0; i < 60; i++) {
      const copy = JSON.parse(JSON.stringify(s));
      expect(copy).toEqual(s);
      const p = prompt(s);
      if (p.type === 'retired') break;
      if (p.type === 'decision') choose(s, p.decision.choices.find((c) => !c.disabled)!.id);
      else advance(s);
    }
  });

  it('a game resumed from JSON continues identically', () => {
    const a = newGame(21, input);
    for (let i = 0; i < 25; i++) {
      const p = prompt(a);
      if (p.type === 'decision') choose(a, p.decision.choices.find((c) => !c.disabled)!.id);
      else advance(a);
    }
    const b: GameState = JSON.parse(JSON.stringify(a));
    playOut(a);
    playOut(b);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  // §1 asked for 4–7 clicks a season; playtesting asked for more events, a shop and
  // national-team call-ups, so the bar is now about a dozen.
  it('a season stays a manageable number of clicks', () => {
    const r = runCareer(3, 'smart');
    const seasons = r.paths.length > 0 ? r.retireAge - 14 : 1;
    expect(r.steps / seasons).toBeLessThan(14);
  });
});

describe('engine purity', () => {
  it('never calls Math.random() or imports React', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
      });
    for (const f of walk(join(__dirname, '../src/engine'))) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/Math\.random\s*\(/);
      expect(src, f).not.toMatch(/from 'react'/);
    }
  });
});

describe('growth calibration (§7)', () => {
  // Potential is the ceiling for an average career; good choices (shop, plans, events)
  // can add a few points. Random choices peak lower than smart ones.
  it('a potential-70 player peaks near OVR 70', () => {
    const meanPeak = (policy: 'random' | 'smart') => {
      const peaks: number[] = [];
      for (let i = 0; i < 300; i++) {
        const r = runCareer(20000 + i, policy);
        if (r.potential >= 67 && r.potential <= 73) peaks.push(r.peakOvr);
      }
      expect(peaks.length).toBeGreaterThan(30);
      return peaks.reduce((s, x) => s + x, 0) / peaks.length;
    };
    const random = meanPeak('random');
    const smart = meanPeak('smart');
    console.log(`potential 67-73 mean peak: random ${random.toFixed(2)}, smart ${smart.toFixed(2)}`);
    expect(smart).toBeGreaterThan(random); // good decisions matter
    expect(smart).toBeGreaterThan(67);
    expect(smart).toBeLessThan(76);
  });
});

describe('international origins', () => {
  it('assigns a country, hometown and youth program', () => {
    const s = newGame(7, { name: 'X', number: 1, pos: 'SG', archetype: 0, focus: ['SHT', 'IQ'], country: 'Lithuania' });
    expect(s.player.country).toBe('Lithuania');
    expect(s.player.hometown).toMatch(/Lithuania$/);
    expect(['Žalgiris academy', 'Rytas youth']).toContain(s.player.highSchool);
    expect(s.league?.label).toMatch(/^Lithuanian junior league/);
  });

  it('a European who turns pro at 16 can still be drafted from his club', () => {
    let draftedFromEurope = 0;
    for (let i = 0; i < 40; i++) {
      const s = newGame(900 + i, { name: 'X', number: 1, pos: 'SF', archetype: 0, focus: ['SHT', 'ATH'], country: 'Spain' });
      for (let steps = 0; steps < 3000 && s.player.age < 23; steps++) {
        const pr = prompt(s);
        if (pr.type === 'retired') break;
        if (pr.type === 'decision') {
          const ch = pr.decision.choices.filter((c) => !c.disabled);
          choose(s, ch.find((c) => c.id === 'promote' || c.id === 'declare')?.id ?? ch[0].id);
        } else advance(s);
      }
      if (s.flags.earlyPro && s.draftedBy) draftedFromEurope++;
    }
    expect(draftedFromEurope).toBeGreaterThan(0);
  });
});

describe('retire any season', () => {
  it('can retire between seasons once past high school, and not before', () => {
    const s = newGame(11, { name: 'X', number: 1, pos: 'PG', archetype: 0, focus: ['PLY', 'IQ'] });
    let sawHsSummary = false;
    for (let steps = 0; steps < 3000; steps++) {
      if (s.step === 'summary' && s.stage === 'HS') {
        sawHsSummary = true;
        expect(canRetire(s)).toBe(false);
      }
      if (canRetire(s)) break;
      const pr = prompt(s);
      if (pr.type === 'retired') break;
      // keep playing: skip any choice that ends the career
      const open = pr.type === 'decision' ? pr.decision.choices.filter((c) => !c.disabled) : [];
      if (pr.type === 'decision') choose(s, (open.find((c) => c.id !== 'retire' && !/retire|hang it up/i.test(c.label)) ?? open[0]).id);
      else advance(s);
    }
    expect(sawHsSummary).toBe(true);
    expect(canRetire(s)).toBe(true);
    retireByChoice(s);
    expect(s.step).toBe('retired');
    expect(prompt(s).type).toBe('retired');
  });
});

describe('variety at the start', () => {
  it('starting OVR and height vary between players of the same archetype', () => {
    const ovrs = new Set<number>();
    const heights = new Set<number>();
    for (let i = 0; i < 40; i++) {
      const s = newGame(400 + i, { name: 'X', number: 1, pos: 'SF', archetype: 0, focus: ['SHT', 'PER'] });
      ovrs.add(Math.round(ovrOf(s.player.attrs, 'SF')));
      heights.add(s.player.fullHeight);
    }
    expect(Math.max(...ovrs) - Math.min(...ovrs)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThanOrEqual(6);
  });

  it('position moves: adjacent always, two spots only when the height fits', () => {
    const s = newGame(5, { name: 'X', number: 1, pos: 'SG', archetype: 0, focus: ['SHT', 'IQ'], height: 76 });
    s.step = 'offseason';
    const opts = positionOptions(s);
    expect(opts.find((o) => o.pos === 'PG')!.allowed).toBe(true);
    expect(opts.find((o) => o.pos === 'SF')!.allowed).toBe(true);
    expect(opts.find((o) => o.pos === 'C')!.allowed).toBe(false);
    changePosition(s, 'SF');
    expect(s.player.pos).toBe('SF');
    expect(canChangePosition(s)).toBe(false); // once per offseason
  });
});

describe('playable postseason', () => {
  it('pauses for each game, quarter and close finish, and finishes the season', () => {
    const stages = new Set<string>();
    let seasonsWithLive = 0;
    // a few seeds, in case a career ends before it reaches a playable postseason
    let s = newGame(7001, { name: 'X', number: 1, pos: 'PG', archetype: 0, focus: ['PLY', 'SHT'] });
    for (let seed = 7001, steps = 0; steps < 60000 && s.player.age < 24; steps++) {
      if (s.step === 'retired' && !stages.has('game') && seed < 7010) {
        seed++;
        s = newGame(seed, { name: 'X', number: 1, pos: 'PG', archetype: 0, focus: ['PLY', 'SHT'] });
      }
      const pr = prompt(s);
      if (pr.type === 'retired') {
        if (stages.has('game') || seed >= 7010) break;
        continue;
      }
      if (pr.type === 'decision') {
        const d = pr.decision;
        if (d.kind === 'live') {
          const stage = (d.data as { req: { stage: string } }).req.stage;
          if (stage === 'game' && !stages.has('game')) seasonsWithLive++;
          stages.add(stage);
          choose(s, stage === 'game' ? 'play' : d.choices[steps % d.choices.length].id);
          // the replay state never leaks into the saved game
          expect(s.live).toBeUndefined();
        } else {
          // keep playing: skip any choice that ends the career
          const open = d.choices.filter((c) => !c.disabled);
          choose(s, (open.find((c) => c.id !== 'retire' && !/retire|hang it up/i.test(c.label)) ?? open[0]).id);
        }
      } else advance(s);
    }
    expect(stages.has('game')).toBe(true);
    expect(stages.has('quarter')).toBe(true);
    expect(seasonsWithLive).toBeGreaterThan(0);
    expect(s.postSnap === undefined || s.step === 'postseason').toBe(true);
    expect(() => JSON.parse(JSON.stringify(s))).not.toThrow();
  });
});

describe('career comparison model', () => {
  it('fits the all-time order of its 100 players reasonably', () => {
    const f = rankModelFit();
    expect(f.spearman).toBeGreaterThan(0.75);
  });
  it('only compares careers that peaked at 80+', () => {
    const s = newGame(3, { name: 'X', number: 1, pos: 'SG', archetype: 0, focus: ['SHT', 'IQ'] });
    s.player.peakOvr = 72;
    expect(compareCareer(s).eligible).toBe(false);
  });
});

describe('round 6 mechanics', () => {
  it('two plans each count at reduced strength', () => {
    const one = blendPlans('grind');
    const two = blendPlans('grind', 'recovery');
    expect(two.growth).toBeLessThan(one.growth);
    expect(two.injury).toBeLessThan(one.injury);
    // the first plan is the main one: it counts for more than the side plan
    expect(blendPlans('grind', 'recovery').growth).toBeGreaterThan(blendPlans('recovery', 'grind').growth);
    const s = newGame(12, { name: 'X', number: 1, pos: 'SG', archetype: 0, focus: ['SHT', 'IQ'] });
    const d = prompt(s);
    if (d.type === 'decision' && d.decision.kind === 'plan') {
      choose(s, 'grind+shooting');
      expect(s.season!.plan).toBe('grind');
      expect(s.season!.plan2).toBe('shooting');
    }
  });

  it('the same event choice lands differently each time', () => {
    const sizes = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const s = newGame(300 + i, { name: 'X', number: 1, pos: 'SG', archetype: 0, focus: ['SHT', 'IQ'] });
      const before = s.player.morale;
      s.pending.unshift({ id: 'e', kind: 'event', title: 'Captaincy offer', text: '', choices: [{ id: '0', label: 'x' }], data: { eventId: 'mentor' } });
      s.pending[0].choices = [{ id: '0', label: 'Spend the summer learning from him' }];
      choose(s, '0');
      sizes.add((s.player.morale - before).toFixed(0) + '/' + s.player.growthRate.toFixed(3));
    }
    expect(sizes.size).toBeGreaterThan(3);
  });
});

describe('round 7: fast break and storylines', () => {
  it('fast break only stops for real choices and still finishes a career', () => {
    const s = newGame(5150, { name: 'X', number: 1, pos: 'SF', archetype: 0, focus: ['SHT', 'FIN'], mode: 'fast' });
    expect(s.flags.fast).toBe(1);
    fastForward(s);
    for (let i = 0; i < 3000; i++) {
      const pr = prompt(s);
      if (pr.type === 'retired') break;
      if (pr.type === 'decision') {
        expect(pr.decision.kind).not.toBe('shop');
        expect(pr.decision.kind).not.toBe('national');
        if (pr.decision.kind === 'plan') {
          expect(pr.decision.data?.half).toBe(1);
          // round 8: one plan from five training groups
          expect(pr.decision.data?.single).toBe(true);
          expect(pr.decision.choices.filter((c) => !c.disabled).map((c) => c.label).sort()).toEqual(['Defense', 'General', 'IQ', 'Shooting', 'Weight room']);
        }
        const open = pr.decision.choices.filter((c) => !c.disabled);
        choose(s, (open.find((c) => c.id !== 'retire' && !/hang it up|^retire/i.test(c.label) && s.player.age < 33) ?? open.find((c) => c.id === 'retire') ?? open[0]).id);
      } else {
        // the only "next" screen fast break shows is an offseason with a move worth making
        expect(s.step).toBe('offseason');
        advance(s);
      }
      fastForward(s);
    }
    expect(s.step).toBe('retired');
  });

  it('a storyline plays its chapters in later offseasons', () => {
    const s = newGame(5151, { name: 'X', number: 1, pos: 'SG', archetype: 0, focus: ['SHT', 'FIN'] });
    s.flags.simPostseason = 1;
    startArc(s, 'jumper');
    const before = s.player.attrs.SHT;
    let chapters = 0;
    for (let i = 0; i < 400 && s.player.age < 17; i++) {
      chapters += s.moments.filter((m) => m.arc).length;
      s.moments = [];
      const pr = prompt(s);
      if (pr.type === 'decision') choose(s, pr.decision.choices.find((c) => !c.disabled)!.id);
      else advance(s);
    }
    expect(chapters).toBeGreaterThanOrEqual(2);
    expect(s.arcs?.some((a) => a.id === 'jumper') ?? false).toBe(false);
    expect(s.player.attrs.SHT).toBeGreaterThan(before);
  });
});

describe('round 7: team factors', () => {
  it('defenders, floor generals and 3&D players add more to winning than pure scorers of the same OVR', () => {
    const scorer = { SHT: 88, FIN: 86, PLY: 70, PER: 62, INT: 50, REB: 55, ATH: 80, IQ: 72 };
    const stopper = { SHT: 72, FIN: 70, PLY: 66, PER: 90, INT: 60, REB: 60, ATH: 82, IQ: 80 };
    const general = { SHT: 72, FIN: 68, PLY: 92, PER: 66, INT: 45, REB: 50, ATH: 72, IQ: 90 };
    const edge = (a: typeof scorer) => winningEdge(a, 78);
    expect(edge(stopper).playoff).toBeGreaterThan(edge(scorer).playoff + 0.5);
    expect(edge(general).playoff).toBeGreaterThan(edge(scorer).playoff + 0.5);
    expect(edge(stopper).traits).toContain('Lockdown defender');
    expect(edge(general).traits).toContain('Floor general');
    // the postseason weighs it more
    expect(edge(stopper).playoff).toBeGreaterThan(edge(stopper).regular);
  });
});

describe('round 8: built in a lab and the shop', () => {
  const labInput = { name: 'X', number: 1, pos: 'PG' as const, archetype: 0, focus: [], mode: 'lab' as const, height: 74 };

  it('training pays out credits instead of ratings, and credits buy any rating at a rising cost', () => {
    const s = newGame(8801, labInput);
    expect(s.player.fullHeight).toBe(74);
    expect(s.flags.fast).toBe(1);
    const start = { ...s.player.attrs };
    fastForward(s);
    for (let i = 0; i < 200 && s.player.age < 17; i++) {
      const pr = prompt(s);
      if (pr.type === 'retired') break;
      if (pr.type === 'decision') choose(s, pr.decision.choices.find((c) => !c.disabled)!.id);
      else advance(s);
      fastForward(s);
    }
    // nothing grew on its own (aging and minuses can only take away)
    for (const k of Object.keys(start) as (keyof typeof start)[]) expect(s.player.attrs[k]).toBeLessThanOrEqual(start[k] + 1e-9);
    const credits = s.player.lab!.credits;
    expect(credits).toBeGreaterThan(5);
    const ply = s.player.attrs.PLY;
    const bought = spendCredits(s, 'PLY', 3);
    expect(bought).toBe(3);
    expect(s.player.attrs.PLY).toBeCloseTo(ply + 3, 6);
    expect(s.player.lab!.credits).toBeCloseTo(credits - [0, 1, 2].reduce((t, i) => t + labCost(ply + i), 0), 6);
    expect(labCost(70)).toBe(1);
    expect(labCost(85)).toBe(1.5);
    expect(labCost(95)).toBe(2);
  });

  it('an event that raises a rating in the lab pays credits instead', () => {
    const s = newGame(8802, labInput);
    const before = { ...s.player.attrs };
    const credits = s.player.lab!.credits;
    s.player.attrs.SHT += 2;
    s.player.attrs.ATH -= 1;
    expect(bankGains(s, before)).toBeCloseTo(2, 6);
    expect(s.player.attrs.SHT).toBe(before.SHT);
    expect(s.player.attrs.ATH).toBe(before.ATH - 1);
    expect(s.player.lab!.credits).toBeCloseTo(credits + 2, 6);
  });

  it('the shop shows about six random things a summer, not the same list every time', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const s = newGame(8810 + i, input);
      s.player.bank = 0.002; // $2K: a high schooler with a summer job
      pushShop(s);
      const d = s.pending[s.pending.length - 1];
      const items = d.choices.filter((c) => c.id !== 'leave');
      expect(items.length).toBe(6);
      expect(items.filter((c) => !c.disabled).length).toBeGreaterThanOrEqual(4);
      items.forEach((c) => seen.add(c.id));
    }
    expect(seen.size).toBeGreaterThan(14);
  });
});

describe('round 9: starting five, league stories, finals drama', () => {
  it('the last minutes of a final always land on the real score, and close ones end at the buzzer', () => {
    const cast = { me: 'Sam Star', mates: ['A B', 'C D', 'E F'], opps: ['G H', 'I J'], us: 'US', them: 'THEM' };
    for (let i = 0; i < 300; i++) {
      const us = 80 + (i % 37);
      let them = us + ((i * 7) % 31) - 15;
      if (them === us) them++;
      const d = buildDrama({ us, them }, cast, 1000 + i);
      const endUs = d.start.us + d.plays.filter((p) => p.side === 'us').reduce((a, p) => a + p.pts, 0);
      const endThem = d.start.them + d.plays.filter((p) => p.side === 'them').reduce((a, p) => a + p.pts, 0);
      expect([endUs, endThem]).toEqual([us, them]);
      if (Math.abs(us - them) <= 3) expect(d.plays.some((p) => p.tag === 'BUZZER')).toBe(true);
    }
  });

  it('a star gets league storylines, and as first option can recruit starters within the cap', () => {
    const s = newGame(4243, { name: 'Sam Star', number: 1, pos: 'SF', archetype: 0, focus: ['SHT', 'FIN'], mode: 'stars' });
    s.flags.simPostseason = 1;
    let sawStories = false;
    let tried = false;
    for (let i = 0; i < 6000 && !tried; i++) {
      if (s.stage === 'NBA' && s.stories && s.stories.length >= 2) sawStories = true;
      if (canRecruit(s)) {
        const board = scoutingBoard(s);
        expect(board.length).toBeGreaterThan(0);
        const salary = s.contract!.salary;
        takePayCut(s);
        expect(s.contract!.salary).toBeCloseTo(Math.round(salary * 0.9 * 10) / 10, 6);
        const mine = s.nba!.teams.find((t) => t.id === s.teamId)!;
        for (const t of scoutingBoard(s).filter((x) => x.fits)) {
          if (recruitPlayer(s, t.p.id)) {
            expect(mine.roster.some((p) => p.id === t.p.id)).toBe(true);
            expect(t.team.roster.some((p) => p.id === t.out[0].id)).toBe(true);
          }
        }
        expect(recruitInfo(s).asks).toBeGreaterThan(0);
        tried = true;
        break;
      }
      const pr = prompt(s);
      if (pr.type === 'retired') break;
      if (pr.type === 'decision') choose(s, (pr.decision.choices.find((c) => !c.disabled && c.id !== 'retire') ?? pr.decision.choices.find((c) => !c.disabled))!.id);
      else advance(s);
    }
    expect(sawStories).toBe(true);
    expect(tried).toBe(true);
  });
});

describe('round 11: fast break is a switch', () => {
  it('flipping it rebuilds the plan on screen and the first page offers three difficulties', () => {
    const s = newGame(9101, input);
    const d0 = prompt(s);
    expect(d0.type === 'decision' && d0.decision.kind).toBe('plan');
    setFast(s, true);
    const d1 = prompt(s);
    expect(d1.type === 'decision' && d1.decision.data?.single).toBe(true);
    setFast(s, false);
    const d2 = prompt(s);
    expect(d2.type === 'decision' && d2.decision.kind === 'plan' && !d2.decision.data?.single).toBe(true);
    expect(DIFFICULTIES).toEqual(['standard', 'reality', 'stars']);
    // an old "fast" game is the regular game with the switch on
    const f = newGame(9102, { ...input, mode: 'fast' });
    expect(f.mode).toBe('standard');
    expect(f.flags.fast).toBe(1);
  });
});
