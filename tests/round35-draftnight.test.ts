// Round 35: a draft class starts on draft night (engine/career/draftNight.ts). Owner: "the 12 of
// you (max) were the first options of your colleges. you're going for the nba draft, and all of
// you are predicted to be entering as a 1st round pick (1~30th). ovr starts at a 65~75 range. the
// rest is history".

import { beforeAll, describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import { ovrOf } from '../src/engine/player/ovr';
import { ARCHETYPES } from '../src/engine/player/archetypes';
import { runDraft, type Prospect } from '../src/engine/world/draft';
import { ATTRS, DRAFT_NIGHT, POSITIONS } from '../src/engine/balance';
import { COLLEGES } from '../src/content/teams';
import { cleanProspect } from '../src/ui/multiplayer';
import type { CreateInput } from '../src/engine/player/create';
import type { AttrKey, GameState, Team } from '../src/engine/types';

/** A classmate's picks, different for each k: position, archetype, focus, hand, name and number. */
function classmate(k: number): CreateInput {
  const pos = POSITIONS[k % 5];
  return {
    name: `Class Mate${k}`,
    number: k % 100,
    pos,
    archetype: (k * 7) % ARCHETYPES[pos].length,
    focus: [ATTRS[k % 8], ATTRS[(k + 1 + ((k >> 3) % 7)) % 8]],
    hand: k % 8 === 0 ? 'L' : 'R',
    mode: 'standard',
    start: 'draft',
  };
}

/** Plays a career with the harness policy, for `seasons` seasons or to the end. */
function play(s: GameState, seed: number, seasons = Infinity): GameState {
  const r = makeRng(seed);
  s.flags.simPostseason = 1;
  for (let k = 0; k < 6000 && s.history.length < seasons; k++) {
    const pr = prompt(s);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') choose(s, smartChoice(s, pr.decision, r));
    else advance(s);
  }
  return s;
}

const [LO, HI] = DRAFT_NIGHT.ovr;
const LAST = DRAFT_NIGHT.firstRound;

describe('a draft class starts on draft night', () => {
  // 160 starts: four classmates on each of 40 seeds (each builds its league: about 60 ms apiece)
  let starts: { s: GameState }[] = [];
  beforeAll(() => {
    starts = Array.from({ length: 160 }, (_, i) => ({ s: newGame(9100 + Math.floor(i / 4), classmate(i)) }));
  }, 120_000);

  it('as a grown college player (freshman to senior) at OVR 65 to 75, spread across the range', () => {
    const ovrs = starts.map(({ s }) => ovrOf(s.player.attrs, s.player.pos));
    for (const { s } of starts) {
      const o = ovrOf(s.player.attrs, s.player.pos);
      expect(o).toBeGreaterThanOrEqual(LO - 1e-9);
      expect(o).toBeLessThanOrEqual(HI + 1e-9);
      expect(ovrOf(s.player.startAttrs, s.player.pos)).toBeCloseTo(o, 9);
      expect(s.player.peakOvr).toBeCloseTo(o, 9);
      expect([19, 20, 21, 22]).toContain(s.player.age);
      expect(s.player.height).toBe(s.player.fullHeight);
      expect(s.player.potential).toBeGreaterThanOrEqual(o + DRAFT_NIGHT.potRoom - 1e-9);
      for (const k of ATTRS) expect(s.player.attrs[k]).toBeLessThanOrEqual(99);
    }
    // every point of the range is used, the ends included
    for (let x = LO; x < HI; x++) expect(ovrs.filter((o) => o >= x && o < x + 1).length, `OVR ${x}`).toBeGreaterThan(4);
    expect(Math.min(...ovrs)).toBeLessThan(LO + 0.5);
    expect(Math.max(...ovrs)).toBeGreaterThan(HI - 0.5);
    // the card and the focus shape him, as seasons would have: grown from the 14-year-old the same
    // seed and picks make without the flag, his focus ratings grew more than the rest (the first-round
    // picks of 150 smart careers grew theirs 33.8221 points to 27.0389 by the draft, 1.250868 to 1;
    // these 160 draft nights 36.28730 to 27.79095, 1.305724 to 1)
    let focus = 0;
    let rest = 0;
    let topIsFocus = 0;
    starts.forEach(({ s }, i) => {
      const kid = newGame(9100 + Math.floor(i / 4), { ...classmate(i), start: undefined }).player.attrs;
      const grew = (k: AttrKey) => s.player.attrs[k] - kid[k];
      for (const k of ATTRS) {
        if (s.player.focus.includes(k)) focus += grew(k) / 2;
        else rest += grew(k) / 6;
      }
      if (s.player.focus.includes([...ATTRS].sort((a, b) => grew(b) - grew(a))[0])) topIsFocus++;
    });
    expect(focus).toBeGreaterThan(rest * 1.15);
    expect(topIsFocus / starts.length).toBeGreaterThan(0.6);
  });

  it('goes in the first round, mostly near the mock drafts, to the team that picks there', () => {
    const picks = starts.map(({ s }) => s.draft!.userPick!);
    for (const { s } of starts) {
      const [lo, hi] = s.draft!.mockRange!;
      expect(lo).toBeGreaterThanOrEqual(1);
      expect(hi).toBeLessThanOrEqual(LAST);
      expect(lo).toBeLessThan(hi);
      const pick = s.draft!.userPick!;
      expect(pick).toBeGreaterThanOrEqual(1);
      expect(pick).toBeLessThanOrEqual(LAST);
      // drafted, signed to the rookie scale by the team that took him, in his first NBA preseason
      const row = s.draft!.picks.find((p) => p.isUser)!;
      expect(row.pick).toBe(pick);
      expect(s.draftedBy).toBe(row.teamId);
      expect(s.teamId).toBe(row.teamId);
      expect(s.stage).toBe('NBA');
      expect(s.contract?.kind).toBe('rookie');
      expect(s.step).toBe('preseason');
      expect(s.season?.level).toBe('NBA');
      expect(s.history).toHaveLength(0);
      expect(s.year).toBe(s.draft!.year);
    }
    expect(Math.min(...picks)).toBeLessThanOrEqual(3);
    expect(Math.max(...picks)).toBeGreaterThanOrEqual(LAST - 2);
    const near = starts.filter(({ s }) => Math.abs(s.draft!.userPick! - (s.draft!.mockRange![0] + s.draft!.mockRange![1]) / 2) <= 4);
    expect(near.length / starts.length).toBeGreaterThan(0.75);
    // the better player goes nearer the top
    const top = starts.filter(({ s }) => ovrOf(s.player.attrs, s.player.pos) >= HI - 2.5).map(({ s }) => s.draft!.userPick!);
    const bottom = starts.filter(({ s }) => ovrOf(s.player.attrs, s.player.pos) < LO + 2.5).map(({ s }) => s.draft!.userPick!);
    const mean = (a: number[]) => a.reduce((t, x) => t + x, 0) / a.length;
    expect(mean(top)).toBeLessThan(mean(bottom) - 10);
  });

  it('opens on the story of the night: his college, the declaration, the mock drafts, the class', () => {
    for (const { s } of starts.slice(0, 20)) {
      const [intro, draft] = s.moments;
      expect(intro.kind).toBe('intro');
      expect(COLLEGES.some((c) => c.name === intro.title)).toBe(true);
      expect(intro.text).toBe(`Draft night. ${s.player.name} was the first option at ${intro.title}, and after ${['one season', 'two seasons', 'three seasons', 'four seasons'][s.player.age - 19]} there he has declared for the ${s.draft!.year} NBA Draft.`);
      expect(intro.lines![0]).toBe(`Mock drafts have him going ${s.draft!.mockRange![0]}–${s.draft!.mockRange![1]}, in the first round`);
      expect(intro.lines!.some((l) => /rest of your class is in this draft too/.test(l))).toBe(true);
      expect(draft.kind).toBe('draft');
      expect(draft.pick).toBe(s.draft!.userPick);
      // the night's own pages come first: the draft card, then the season plan
      expect(s.pending.map((d) => d.kind)).toEqual(['info', 'plan']);
      expect(s.log[0].kind).toBe('start');
      expect(s.log[0].text).toMatch(/^Declared for the \d{4} NBA Draft after (one season|two seasons|three seasons|four seasons) as the first option at /);
    }
  });

  it('puts classmates on one seed into the same draft as different players', () => {
    const seed = 4242;
    const mates = Array.from({ length: 12 }, (_, k) => newGame(seed, classmate(k)));
    const ovrs = new Set(mates.map((s) => Math.round(ovrOf(s.player.attrs, s.player.pos) * 1000)));
    expect(ovrs.size).toBe(12);
    // the same league before the draft and the same draft order (the lottery included)
    const order = (s: GameState) => s.draft!.picks.map((p) => p.teamId).join(',');
    const past = (s: GameState) => JSON.stringify(s.nbaHistory);
    for (const s of mates) {
      expect(order(s)).toBe(order(mates[0]));
      expect(past(s)).toBe(past(mates[0]));
      expect(s.draft!.year).toBe(mates[0].draft!.year);
    }
  });

  it('gives the same career from the same seed and picks, and a challenge replays it', () => {
    const a = play(newGame(777, classmate(5)), 1, 3);
    const b = play(newGame(777, classmate(5)), 1, 3);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    // another name is another player
    const c = newGame(777, { ...classmate(5), name: 'Some Body' });
    expect(ovrOf(c.player.attrs, c.player.pos)).not.toBeCloseTo(ovrOf(a.player.startAttrs, a.player.pos), 6);
    // a friend who takes a challenge from it gets the same draft night (the store adds fast: false)
    const g = newGame(778, { ...classmate(9), fast: false });
    expect(g.start?.input.start).toBe('draft');
    const p = cleanProspect(JSON.parse(JSON.stringify(g.start)))!;
    expect(p.input.start).toBe('draft');
    const h = newGame(p.seed, { ...p.input, fast: false });
    expect(h.player.attrs).toEqual(g.player.attrs);
    expect(h.draft).toEqual(g.draft);
    expect(h.moments[0]).toEqual(g.moments[0]);
  });

  it('plays to retirement with the harness policy, never back in high school or college', () => {
    for (let i = 0; i < 6; i++) {
      const s = play(newGame(6100 + i, classmate(20 + i)), 6100 + i);
      expect(s.step).toBe('retired');
      expect(s.nbaGames).toBeGreaterThan(0);
      expect(s.history.length).toBeGreaterThan(0);
      expect(s.history[0].level).toBe('NBA');
      expect(s.history.some((h) => h.level === 'HSV' || h.level === 'HSJV' || h.level === 'NCAA')).toBe(false);
    }
  });
});

describe('every other career starts as it did', () => {
  const base = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], mode: 'standard' as const };

  it('a freshman at 14 without the flag, and a level or another difficulty even with it', () => {
    for (const s of [newGame(31, base), newGame(31, { ...base, mode: 'reality', start: 'draft' }), newGame(31, { ...base, mode: 'stars', start: 'draft' })]) {
      expect(s.player.age).toBe(14);
      expect(s.stage).toBe('HS');
      expect(s.draft).toBeNull();
      expect(s.moments[0].lines![0]).toMatch(/^Tryouts:/);
    }
    const lv = newGame(31, { ...base, level: 'beginner', start: 'draft' });
    expect(lv.player.age).toBe(17);
    expect(lv.stage).toBe('HS');
  });

  it('keeps the draft as it was when no pick is set for him', () => {
    // a class of 60 with him at the bottom of the board: 60 teams pass on him unless he is due at 30
    const teams = Array.from({ length: 60 }, (_, i) => ({ id: `T${i}` }) as Team);
    const cls = Array.from({ length: 60 }, (_, i): Prospect => ({ p: { id: i } as Prospect['p'], scoutPot: 60, prod: 60, board: 100 - i, isUser: false, from: 'NCAA' }));
    cls.push({ p: { id: -1 } as Prospect['p'], scoutPot: 40, prod: 40, board: -100, isUser: true, from: 'NCAA' });
    const free = runDraft(makeRng(3), teams, cls);
    expect(free.find((p) => p.prospect.isUser)).toBeUndefined();
    const due = runDraft(makeRng(3), teams, cls, LAST);
    expect(due.find((p) => p.prospect.isUser)?.pick).toBe(LAST);
    // the picks before his are the same as without the rule
    expect(due.slice(0, LAST - 1).map((p) => p.prospect.p.id)).toEqual(free.slice(0, LAST - 1).map((p) => p.prospect.p.id));
  });
});
