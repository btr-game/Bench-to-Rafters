// Round 36: the end-of-round batch of achievements: the rafters finale (whose rafters, the speech
// under the lights, the credits), the username for the community, the finale watched or skipped,
// and the round's turning points and shop things. The speech and the credits are written in
// ui/finale.ts; the book works them out from the career on its own, and this keeps the two in step.

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameState, SeasonRecord } from '../src/engine/types';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow, type CareerTotals } from '../src/engine/achievements';
import { ACHIEVEMENTS_36, ENDING_IDS, R36_TOTALS_ONLY, ROLL, creditLines, creditRows, endingsSeen, type EndingId } from '../src/engine/achievements36';
import { achCatOf } from '../src/engine/achievementCats';
import { hallOfFame, legacyScore, raftersTeams } from '../src/engine/awards/legacy';
import { teamById } from '../src/engine/career/common';
import { NBA_TEAMS, RIVALS } from '../src/content/teams';
import { play } from '../src/dev/stage';
import { ACT_SECS, MAKERS, creditsOf, raftersTeam, rollSecs, speechOf } from '../src/ui/finale';
import type { CareerRecord } from '../src/engine/career/record';

/** One of this round's checks on a career; `retired` stands in for a career played to its end. */
const test36 = (id: string, g: GameState, t: CareerTotals = NO_TOTALS, retired = g.step === 'retired') => {
  const a = ACHIEVEMENTS_36.find((x) => x.id === id)!;
  expect(a, id).toBeTruthy();
  return a.test({ g, t, nba: g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0), retired });
};
const nbaOf = (g: GameState) => g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);

// finished careers of the deck's smart player: one whose jersey hangs, one whose does not
const hung = play((s) => s.step === 'retired' && raftersTeams(s).length > 0, { mode: 'stars', fast: true, tries: 16 })!;
const plain = play((s) => s.step === 'retired' && raftersTeams(s).length === 0 && s.nbaGames > 0, { mode: 'standard', fast: true, tries: 16 })!;

/** Seasons with an NBA team after his last one (`titles` of them won as its first option), so the
 * team hangs his jersey: five with a title, or seven with a legacy of 25. */
function stay(g: GameState, teamId: string, seasons: number, titles: number): GameState {
  const last = g.history[g.history.length - 1];
  const info = NBA_TEAMS.find((t) => t.abbr === teamId)!;
  for (let k = 1; k <= seasons; k++) {
    const h: SeasonRecord = { ...structuredClone(last), level: 'NBA', stage: 'NBA', year: last.year + k, age: last.age + k, teamId, teamName: `${info.city} ${info.nick}`, awards: [], role: 'starter', result: 'Lost in the first round' };
    h.line.gp = Math.max(h.line.gp, 60);
    if (k > seasons - titles) Object.assign(h, { awards: ['Champion'], role: 'key', result: 'NBA Champion' });
    g.history.push(h);
  }
  return g;
}
/** An NBA team he never played for, and no rival of any he did. */
function freshTeam(g: GameState, skip: string[] = []): string {
  const mine = new Set(g.history.filter((h) => h.level === 'NBA').map((h) => h.teamId));
  const rivals = new Set(RIVALS.flat());
  return NBA_TEAMS.map((t) => t.abbr).find((id) => !mine.has(id) && !skip.includes(id) && !rivals.has(id))!;
}

describe('the book: round 36', () => {
  it('keeps every id and every name unique across the whole book, and files each one', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.name.toLowerCase())).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS_36.length).toBe(49);
    expect(ACHIEVEMENTS.length).toBe(825);
    for (const a of ACHIEVEMENTS_36) {
      expect(ACHIEVEMENTS, a.id).toContain(a);
      expect(achCatOf(a.id), a.id).not.toBeNull();
      // a riddle until it is earned: a short line, no condition in the name
      expect(a.how.length, a.id).toBeLessThan(110);
    }
    for (const id of R36_TOTALS_ONLY) expect(ACHIEVEMENTS_36.some((a) => a.id === id), id).toBe(true);
    expect(achCatOf('rf-jv')).toBe('career');
    expect(achCatOf('sp-rival')).toBe('fame');
    expect(achCatOf('nm-pick')).toBe('fame');
    expect(achCatOf('fn-skip')).toBe('modes');
    expect(achCatOf('cr-long')).toBe('odd');
    expect(achCatOf('own-banner')).toBe('money');
    expect(achCatOf('tp-rival')).toBe('team');
    // the endings: most under the long career, the two that end before or away from the NBA under the road there
    expect(achCatOf('en-6')).toBe('career');
    expect(achCatOf('en-dream')).toBe('road');
    expect(achCatOf('en-euro')).toBe('road');
  });

  it('earns the username and the finale ones from the totals alone, with no career open', () => {
    const none = earnedNow(null, { ...NO_TOTALS });
    for (const id of R36_TOTALS_ONLY) expect(none, id).not.toContain(id);
    const once = earnedNow(null, { ...NO_TOTALS, handle: 1, renamed: 1, posted: 1, fin: { rafters: 1, encore: 1, skipped: 1 } });
    for (const id of ['nm-pick', 'nm-rename', 'nm-post1', 'fn-encore', 'fn-skip']) expect(once, id).toContain(id);
    for (const id of ['nm-rename5', 'nm-post10', 'nm-posthof', 'fn-double', 'fn-five', 'fn-rafters3']) expect(once, id).not.toContain(id);
    const more = earnedNow(null, { ...NO_TOTALS, renamed: 5, posted: 10, postedHof: 1, fin: { rafters: 3, dream: 2 } });
    for (const id of ['nm-rename5', 'nm-post10', 'nm-posthof', 'fn-double', 'fn-five', 'fn-rafters3']) expect(more, id).toContain(id);
    // the career ones never come from the totals
    for (const a of ACHIEVEMENTS_36.filter((x) => !R36_TOTALS_ONLY.includes(x.id))) expect(more, a.id).not.toContain(a.id);
  });
});

describe('whose rafters', () => {
  it('found a finished career with a jersey hung, and one without', () => {
    expect(hung, 'a career whose jersey hangs').toBeTruthy();
    expect(plain, 'a career whose jersey does not').toBeTruthy();
  });

  it('waits for him to retire, then reads the team that drafted him, the JV and the draft', () => {
    const g = structuredClone(hung);
    const id = raftersTeams(g)[0];
    expect(test36('rf-drafted', g, NO_TOTALS, false), 'not before he retires').toBe(false);
    g.draftedBy = id;
    expect(test36('rf-drafted', g)).toBe(true);
    g.draftedBy = freshTeam(g);
    expect(test36('rf-drafted', g)).toBe(false);
    g.history[0].level = 'HSJV';
    expect(test36('rf-jv', g)).toBe(true);
    for (const h of g.history) if (h.level === 'HSJV') h.level = 'HSV';
    expect(test36('rf-jv', g)).toBe(false);
    g.undrafted = true;
    expect(test36('rf-undrafted', g)).toBe(true);
    g.undrafted = false;
    expect(test36('rf-undrafted', g)).toBe(false);
    g.mode = 'reality';
    expect(test36('rf-real', g)).toBe(true);
    g.mode = 'stars';
    expect(test36('rf-real', g)).toBe(false);
    // the jersey that never went up: none of these without the rafters
    for (const id of ['rf-drafted', 'rf-jv', 'rf-undrafted', 'rf-real', 'rf-five', 'rf-rings3', 'rf-nohof', 'rf-promise']) {
      const p = structuredClone(plain);
      p.draftedBy = p.history.find((h) => h.level === 'NBA')!.teamId;
      p.undrafted = id === 'rf-undrafted';
      p.mode = 'reality';
      p.history[0].level = 'HSJV';
      expect(test36(id, p), id).toBe(false);
    }
  });

  it('counts the teams, the seasons and the banners', () => {
    const g = structuredClone(plain);
    const a = freshTeam(g);
    stay(g, a, 5, 1);
    expect(raftersTeams(g)).toEqual([a]);
    expect(test36('rf-five', g)).toBe(true);
    expect(test36('rf-rings3', g)).toBe(false);
    const b = freshTeam(g, [a]);
    stay(g, b, 6, 3);
    expect(test36('rf-five', g), 'still five seasons with the first').toBe(true);
    // the speech's team is the one he gave the most seasons to: three banners there
    expect(raftersTeam(g)!.id).toBe(b);
    expect(test36('rf-rings3', g)).toBe(true);
    expect(test36('rf-3', g)).toBe(false);
    stay(g, freshTeam(g, [a, b]), 5, 1);
    expect(raftersTeams(g).length).toBe(3);
    expect(test36('rf-3', g)).toBe(true);
  });

  it('knows the Hall of Fame without the rafters, the rafters without the Hall, and the stay that fell short', () => {
    const g = structuredClone(plain);
    g.player.legacyBonus = 0;
    const base = legacyScore(g);
    // seven seasons with a team, a legacy under 25: he stayed, they never hung it
    stay(g, freshTeam(g), 7, 0);
    g.player.legacyBonus = Math.min(0, 20 - legacyScore(g));
    expect(raftersTeams(g)).toEqual([]);
    expect(test36('rf-near', g)).toBe(true);
    expect(test36('rf-near', g, NO_TOTALS, false)).toBe(false);
    // the same stay with a legacy of 25 or more hangs it
    g.player.legacyBonus = 30 - base;
    expect(raftersTeams(g).length).toBe(1);
    expect(test36('rf-near', g)).toBe(false);
    expect(!!hallOfFame(g)).toBe(false);
    expect(test36('rf-nohof', g)).toBe(true);
    expect(test36('rf-hofnone', g)).toBe(false);
    // a Hall of Famer, his jersey hung or not
    g.player.legacyBonus = 200;
    expect(test36('rf-nohof', g)).toBe(false);
    expect(test36('rf-hofnone', g)).toBe(false);
    const p = structuredClone(plain);
    p.player.legacyBonus = 200;
    expect(raftersTeams(p).length === 0 || !test36('rf-hofnone', p)).toBe(true);
    if (raftersTeams(p).length === 0) expect(test36('rf-hofnone', p)).toBe(true);
  });

  it('keeps the promise of the number talk only when that team hangs the number', () => {
    const g = structuredClone(plain);
    const a = freshTeam(g);
    const before = g.history.length;
    stay(g, a, 5, 1);
    g.flags.pledge = g.history[before].year;
    expect(test36('rf-promise', g)).toBe(true);
    g.flags.pledge = g.history.find((h) => h.level === 'NBA')!.year;
    expect(test36('rf-promise', g), 'promised another team').toBe(raftersTeams(g).includes(g.history.find((h) => h.level === 'NBA')!.teamId));
    delete g.flags.pledge;
    expect(test36('rf-promise', g)).toBe(false);
  });
});

describe('the speech and the credits, as the finale writes them', () => {
  /** Every variant of a career whose jersey hangs: the banners or none, the MVP, each person. */
  function variants(): GameState[] {
    const out: GameState[] = [];
    const rings = stay(structuredClone(plain), freshTeam(plain), 5, 1);
    const chase = stay(structuredClone(plain), freshTeam(plain), 7, 0);
    chase.player.legacyBonus = 40;
    chase.awards = chase.awards.filter((a) => a.key !== 'MVP');
    const mvp = structuredClone(chase);
    mvp.awards.push({ year: nbaOf(mvp).at(-1)!.year, level: 'NBA', key: 'MVP', label: 'MVP' });
    for (const base of [structuredClone(hung), rings, chase, mvp]) {
      for (const who of ['none', 'family', 'duo', 'rival', 'all'] as const) {
        const g = structuredClone(base);
        delete g.flags.child;
        g.rivalry = undefined;
        g.bonds = [];
        if (who === 'family' || who === 'all') g.flags.child = 1;
        if (who === 'rival' || who === 'all') g.rivalry = { level: 'starter', pid: 1, name: 'Dario Okafor', pos: 'SF', since: 2030, team: 'Boston Celtics', w: 9, l: 7, seasons: [], notes: [] };
        if (who === 'duo' || who === 'all') {
          const t = teamById(g.nba, g.teamId);
          const mate = t?.roster[0];
          if (mate) g.bonds = [{ id: mate.id, name: mate.name, pos: mate.pos, spark: 1, bond: 100, seasons: 3, formed: g.year - 2 }];
        }
        if (who === 'all') g.flags.wed = 1;
        out.push(g);
      }
    }
    return out;
  }

  it('reads the speech the way the finale writes it', () => {
    const seen = new Set<string>();
    for (const g of variants()) {
      expect(raftersTeams(g).length).toBeGreaterThan(0);
      const lines = speechOf(g);
      const says = (re: RegExp) => lines.some((l) => re.test(l));
      const pairs: [string, RegExp][] = [
        ['sp-family', /^To my family/],
        ['sp-rival', /you made me better every single night/],
        ['sp-chase', /^We never got the ring/],
        ['sp-mvp', /^The MVP/],
      ];
      for (const [id, re] of pairs) {
        expect(test36(id, g), `${id}: ${lines.join(' / ')}`).toBe(says(re));
        if (says(re)) seen.add(id);
      }
    }
    // every line of the speech came up in some variant
    expect([...seen].sort()).toEqual(['sp-chase', 'sp-family', 'sp-mvp', 'sp-rival']);
  });

  it('knows the running mate still beside him when he retired', () => {
    for (const g of variants()) {
      const duo = (g.bonds ?? []).some((b) => b.formed !== undefined);
      expect(test36('rf-duo', g)).toBe(duo);
      expect(test36('rf-duo', g, NO_TOTALS, false), 'not before he retires').toBe(false);
    }
    expect(variants().filter((g) => test36('rf-duo', g)).length).toBeGreaterThan(0);
    // a duo that split up before the end leaves no formed bond behind
    const g = variants().find((x) => test36('rf-duo', x))!;
    for (const b of g.bonds!) b.formed = undefined;
    expect(test36('rf-duo', g)).toBe(false);
  });

  it('counts the credits the way the finale rolls them', () => {
    expect(ROLL.max).toBe(ACT_SECS.rollMax);
    expect(ROLL.line).toBe(ACT_SECS.rollLine);
    expect(ROLL.makers).toBe(MAKERS.length);
    for (const g of [hung, plain, ...variants()]) {
      const blocks = creditsOf(g);
      const rows = (head: string) => blocks.find((b) => b.head === head)?.rows.length ?? 0;
      const c = creditRows(g);
      expect(c.starring).toBe(rows('Starring'));
      expect(c.teams).toBe(rows('Teams'));
      expect(c.titles).toBe(rows('Championships'));
      expect(c.legend).toBe(rows('Legendary seasons'));
      expect(c.awards).toBe(rows('Awards'));
      expect(c.nba).toBe(rows('In the NBA'));
      expect(c.forever).toBe(rows('Forever'));
      expect(c.people).toBe(rows('With'));
      expect(c.turns).toBe(rows('Turning points'));
      expect(Math.min(ROLL.max, Math.max(ACT_SECS.rollMin, creditLines(g) * ROLL.line))).toBeCloseTo(rollSecs(blocks), 9);
      expect(test36('cr-long', g)).toBe(rollSecs(blocks) === ACT_SECS.rollMax);
      expect(test36('cr-teams12', g)).toBe(rows('Teams') >= 12);
      expect(test36('cr-awards12', g)).toBe(rows('Awards') >= 12);
      expect(test36('cr-with3', g)).toBe(rows('With') >= 3);
      expect(test36('cr-champs5', g)).toBe(rows('Championships') >= 5);
      expect(test36('cr-short', g)).toBe(blocks.map((b) => b.head).join() === 'Starring,Teams');
    }
    // the variant with everyone in it names his running mate too (his duo as the career ended)
    expect(variants().some((g) => creditRows(g).people >= 3 && !!g.bonds?.length)).toBe(true);
  });

  it('rolls short credits for a career with nothing but a name and his teams', () => {
    const g = structuredClone(plain);
    g.awards = [];
    g.history = g.history.filter((h) => h.level !== 'NBA').map((h) => ({ ...h, awards: [] }));
    g.rivalry = undefined;
    g.bonds = [];
    for (const k of ['wed', 'child']) delete g.flags[k];
    g.player.legacyBonus = 0;
    expect(creditsOf(g).map((b) => b.head)).toEqual(['Starring', 'Teams']);
    expect(test36('cr-short', g)).toBe(true);
    expect(test36('cr-short', g, NO_TOTALS, false), 'not before he retires').toBe(false);
  });
});

describe('the round\'s turning points and shop things in the book', () => {
  it('reads the log of the JV coach, the fan account and the rival', () => {
    const g = structuredClone(plain);
    const log = (text: string) => g.log.push({ year: g.year, age: g.player.age, kind: 'event', text });
    expect(test36('tp-jv', g) || test36('tp-fan', g) || test36('tp-rival', g)).toBe(g.log.some((e) => /^(Flew home to speak|Followed back @|Spoke the night)/.test(e.text)));
    log('Flew home to speak at his JV coach’s last game.');
    log('Followed back @hale23clips, the fan account that clipped every game.');
    log('Spoke the night Dario Okafor’s number went up.');
    for (const id of ['tp-jv', 'tp-fan', 'tp-rival']) expect(test36(id, g), id).toBe(true);
  });

  it('reads the frame, the banner and the speech coach, the last two with the real rafters', () => {
    const p = structuredClone(plain);
    p.purchases = ['framed-jersey', 'rafters-banner', 'speech-coach'];
    expect(test36('own-frame', p)).toBe(true);
    expect(test36('own-banner', p)).toBe(true);
    expect(test36('own-banner-real', p)).toBe(false);
    expect(test36('own-speech', p)).toBe(false);
    const h = structuredClone(hung);
    h.purchases = ['rafters-banner', 'speech-coach'];
    expect(test36('own-banner-real', h)).toBe(true);
    expect(test36('own-speech', h)).toBe(true);
    h.flags.speech = h.year - 3;
    expect(test36('sp-draft', h)).toBe(true);
    p.flags.speech = p.year - 3;
    expect(test36('sp-draft', p)).toBe(false);
  });
});

describe('the UI\'s part (ui/achievements.ts): the username, the boards, the finale', () => {
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
  const fresh = async () => {
    vi.stubGlobal('localStorage', new FakeStorage());
    vi.resetModules();
    return { ach: await import('../src/ui/achievements'), names: await import('../src/ui/names'), book: await import('../src/engine/achievements') };
  };

  it('counts a username picked, then each change, never the same name saved again', async () => {
    const { ach, names, book } = await fresh();
    names.setUsername('hoopsfan');
    ach.recordUsername('');
    expect(ach.loadAch().totals).toMatchObject({ handle: 1 });
    expect(ach.loadAch().totals.renamed ?? 0).toBe(0);
    ach.recordUsername('hoopsfan');
    expect(ach.loadAch().totals.renamed ?? 0, 'the same name').toBe(0);
    for (const n of ['b1', 'b2', 'b3', 'b4', 'b5']) {
      const before = names.username();
      names.setUsername(n);
      ach.recordUsername(before);
    }
    expect(ach.loadAch().totals.renamed).toBe(5);
    const got = book.earnedNow(null, ach.loadAch().totals);
    for (const id of ['nm-pick', 'nm-rename', 'nm-rename5']) expect(got, id).toContain(id);
  });

  it('gives the pick to a device that already had a name (Play with friends kept one)', async () => {
    const { ach, names } = await fresh();
    expect(ach.checkAch(null).map((a) => a.id)).not.toContain('nm-pick');
    names.setUsername('oldfriend');
    expect(ach.checkAch(null).map((a) => a.id)).toContain('nm-pick');
    expect(ach.loadAch().totals.handle).toBe(1);
  });

  it('counts a career posted under a username, and a Hall of Fame one again', async () => {
    const { ach, book } = await fresh();
    const rec = { id: 'x', hof: null } as unknown as CareerRecord;
    expect(ach.recordPosted(rec), 'no username on it').toBe(false);
    expect(ach.recordPosted({ ...rec, by: 'sh1t' }), 'a name the boards would hide').toBe(false);
    expect(ach.recordPosted({ ...rec, by: 'hoopsfan' })).toBe(true);
    expect(ach.recordPosted({ ...rec, by: 'hoopsfan', hof: 'first' })).toBe(true);
    expect(ach.loadAch().totals).toMatchObject({ posted: 2, postedHof: 1 });
    const got = book.earnedNow(null, ach.loadAch().totals);
    expect(got).toContain('nm-post1');
    expect(got).toContain('nm-posthof');
    expect(got).not.toContain('nm-post10');
  });

  it('counts each career\'s finale once: watched, watched when it could be skipped, or skipped', async () => {
    const { ach, book } = await fresh();
    const career = (seed: number) => ({ seed, player: { name: 'Marcus Hale' } }) as unknown as GameState;
    expect(ach.recordFinale(career(1), 'level', { skippable: false, skipped: false }), 'a tutorial level').toBe(false);
    expect(ach.recordFinale(career(1), 'rafters', { skippable: false, skipped: false })).toBe(true);
    expect(ach.recordFinale(career(1), 'rafters', { skippable: true, skipped: false }), 'the same career again').toBe(false);
    expect(book.earnedNow(null, ach.loadAch().totals)).not.toContain('fn-encore');
    expect(ach.recordFinale(career(2), 'dream', { skippable: true, skipped: false })).toBe(true);
    expect(ach.recordFinale(career(3), 'rafters', { skippable: true, skipped: true })).toBe(true);
    expect(ach.loadAch().totals.fin).toEqual({ rafters: 1, dream: 1, encore: 1, skipped: 1 });
    const got = book.earnedNow(null, ach.loadAch().totals);
    for (const id of ['fn-encore', 'fn-skip', 'fn-double']) expect(got, id).toContain(id);
    for (const id of ['fn-five', 'fn-rafters3']) expect(got, id).not.toContain(id);
    for (const k of [4, 5, 6]) ach.recordFinale(career(k), 'rafters', { skippable: true, skipped: false });
    const more = book.earnedNow(null, ach.loadAch().totals);
    for (const id of ['fn-five', 'fn-rafters3']) expect(more, id).toContain(id);
  });

  it('keeps the endings a device has seen for the book, and their themes out of Full Album', async () => {
    const { ach, book } = await fresh();
    const career = (seed: number) => ({ seed, player: { name: 'Marcus Hale' } }) as unknown as GameState;
    ach.recordFinale(career(1), 'gown', { skippable: false, skipped: false });
    ach.recordFinale(career(2), 'gown', { skippable: true, skipped: true });
    ach.recordFinale(career(3), 'level', { skippable: true, skipped: false });
    expect(endingsSeen(ach.loadAch().totals)).toEqual(['gown']);
    expect(book.earnedNow(null, ach.loadAch().totals)).toContain('en-1');
    for (const id of ['dream', 'rafters', 'road']) expect(ach.recordHeard(id), id).toBe(false);
    expect(ach.recordHeard('hub')).toBe(true);
    expect(ach.loadAch().totals.heard).toEqual(['hub']);
  });
});

describe('the endings in the book (the Endings page and its achievements)', () => {
  const seen = (...kinds: EndingId[]) => earnedNow(null, { ...NO_TOTALS, fin: Object.fromEntries(kinds.map((k) => [k, 1])) });
  it('counts the endings seen from the totals alone: one, three, six, all twelve', () => {
    expect(endingsSeen({ ...NO_TOTALS })).toEqual([]);
    // a skip or an encore is not an ending of its own
    expect(endingsSeen({ ...NO_TOTALS, fin: { skipped: 4, encore: 2, longhaul: 1 } })).toEqual(['longhaul']);
    expect(seen('longhaul')).toContain('en-1');
    expect(seen('longhaul', 'madeit')).not.toContain('en-3');
    expect(seen('longhaul', 'madeit', 'gown')).toContain('en-3');
    expect(seen(...ENDING_IDS.slice(0, 5))).not.toContain('en-6');
    expect(seen(...ENDING_IDS.slice(0, 6))).toContain('en-6');
    expect(seen(...ENDING_IDS.slice(0, 11))).not.toContain('en-12');
    expect(seen(...ENDING_IDS)).toContain('en-12');
  });

  it('has one for the bittersweet ending, the Hall without the rafters, Europe, and both ends of it', () => {
    expect(seen('dream')).toContain('en-dream');
    expect(seen('enshrined')).toContain('en-hof');
    expect(seen('rafters')).not.toContain('en-hof');
    expect(seen('eurolegend')).toContain('en-euro');
    expect(seen('passport')).not.toContain('en-euro');
    expect(seen('rafters')).not.toContain('en-both');
    expect(seen('rafters', 'dream')).toContain('en-both');
  });
});
