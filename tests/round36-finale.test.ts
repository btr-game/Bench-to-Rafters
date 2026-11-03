// Round 36: the finale in place of Thank you for playing (owner: "for the first time it's played,
// its unskippable but from the next time a skip button appears", "leaving a career that isn't
// finished doesn't deserve the ending card", "i dont want this to be any longer than 2 minutes"),
// then an ending for every kind of career (owner: "do all 12"): the first that fits wins, Europe
// above the two NBA tenures (owner agreed), each with a scene, its own theme and the same credits.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../src/engine/flow';
import { raftersTeams } from '../src/engine/awards/legacy';
import { play } from '../src/dev/stage';
import { ACT_SECS, FINALE_MAX, MAKERS, actsOf, creditsOf, finaleFor, finaleKind, speechOf, timeline } from '../src/ui/finale';
import { ENDINGS, ENDING_IDS, endingOf, sceneOf, twistsOf, type EndingId } from '../src/ui/endings';
import { TRACKS, trackOf } from '../src/ui/tracks';
import { ENDING_LOOPS } from '../src/ui/achievements';
import type { GameState, LevelKey, SeasonRecord } from '../src/engine/types';

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

const input = { name: 'Marcus Hale', number: 23, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };
const hung = play((s) => s.step === 'retired' && raftersTeams(s).length > 0, { mode: 'stars', fast: true, tries: 16 });
const plain = play((s) => s.step === 'retired' && raftersTeams(s).length === 0, { mode: 'standard', fast: true, tries: 16 });
const total = (g: GameState) => timeline(g, finaleKind(g)!).reduce((t, x) => t + x.secs, 0);

// ---- careers built to order: seasons at each level (several NBA teams, so no team hangs his number) ----

const TEAM: Record<string, [string, string]> = { HSV: ['HS-USER', 'Fairview High'], NCAA: ['Utah State', 'Utah State'], GL: ['GL-SAS', 'Austin Spurs'], EU: ['EU-Partizan', 'Partizan'], INT: ['INT-SYD', 'Sydney Kings'] };
const NBA_TEAMS = [
  ['BOS', 'Boston Celtics'],
  ['LAL', 'Los Angeles Lakers'],
  ['MIA', 'Miami Heat'],
];
function career(levels: [LevelKey, number][], keys: string[] = [], legacy = 0): GameState {
  const tpl = plain!.history.find((h) => h.line.gp > 0)!;
  const g = newGame(36036, { ...input, mode: 'standard' });
  g.step = 'retired';
  g.stage = 'RETIRED';
  let year = 2026;
  let nba = 0;
  for (const [level, n] of levels)
    for (let i = 0; i < n; i++, year++) {
      const [teamId, teamName] = level === 'NBA' ? NBA_TEAMS[Math.floor(nba++ / 3) % 3] : TEAM[level];
      const row: SeasonRecord = { ...structuredClone(tpl), year, age: 14 + year - 2026, level, stage: (level === 'HSV' ? 'HS' : level) as SeasonRecord['stage'], teamId, teamName, teamColor: '#1D428A', awards: [], role: 'starter', result: 'Lost in the first round' };
      row.line.gp = Math.max(1, row.line.gp);
      g.history.push(row);
    }
  g.nbaGames = g.history.filter((h) => h.level === 'NBA').length * 60;
  g.awards = keys.map((key, i) => ({ year: 2030 + i, level: key.startsWith('EU') ? 'EU' : key.startsWith('NCAA') || ['NAISMITH', 'AA1', 'CONFPOY'].includes(key) ? 'NCAA' : 'NBA', key, label: key }));
  g.player.legacyBonus = legacy;
  // a pro career ends at 33 here, so no twist of age comes with it
  g.player.age = levels.some(([l]) => ['GL', 'EU', 'INT', 'NBA'].includes(l)) ? 33 : 14 + year - 2026;
  g.retiredAt = g.player.age;
  g.log.push({ year, age: g.player.age, kind: 'retire', text: `Retired at ${g.player.age}. Chose to call it a career.` });
  return g;
}
const HS: [LevelKey, number] = ['HSV', 4];
/** One career for each ending but the rafters, built to fit it. */
const BUILT: Record<Exclude<EndingId, 'rafters'>, GameState> = {
  enshrined: career([HS, ['NBA', 8]], ['TITLE'], 150),
  ring: career([HS, ['NBA', 5]], ['TITLE', 'ALLSTAR', 'ALLSTAR']),
  allstar: career([HS, ['EU', 3], ['NBA', 4]], ['EUTITLE', 'ALLSTAR', 'ALLNBA2']),
  eurolegend: career([HS, ['EU', 6], ['NBA', 6]], ['EUTITLE']),
  longhaul: career([HS, ['NCAA', 2], ['NBA', 6]], ['NAISMITH']),
  madeit: career([HS, ['EU', 2], ['NBA', 1]], []),
  passport: career([HS, ['GL', 2], ['INT', 1]], []),
  grinder: career([HS, ['NCAA', 4], ['GL', 3]], ['NCAATITLE']),
  shining: career([HS, ['NCAA', 4]], ['NAISMITH']),
  gown: career([HS, ['NCAA', 4]], []),
  dream: career([HS], []),
};

describe('which ending a career gets', () => {
  it('none for a career still going, the daily or a lab run; the title and thanks for a level', () => {
    const g = newGame(5, { ...input, mode: 'standard' });
    expect(finaleKind(g), 'a career still going').toBeNull();
    const done = { ...g, step: 'retired' as const };
    expect(finaleKind({ ...done, flags: { ...done.flags, daily: 1 } })).toBeNull();
    expect(finaleKind({ ...done, mode: 'lab' })).toBeNull();
    expect(finaleKind({ ...done, flags: { ...done.flags, level: 1 } })).toBe('level');
    expect(actsOf('level')).toEqual(['title', 'thanks']);
    expect(finaleKind(done), 'a career that never left high school').toBe('dream');
  });

  it('gives each kind of career its own ending, the first that fits winning', () => {
    expect(hung, 'a career whose jersey hangs').toBeTruthy();
    expect(finaleKind(hung!)).toBe('rafters');
    for (const [kind, g] of Object.entries(BUILT)) expect(endingOf(g), kind).toBe(kind);
    expect(ENDING_IDS).toHaveLength(12);
    expect(Object.keys(ENDINGS)).toEqual([...ENDING_IDS]);
  });

  it('keeps the owner’s order: the rafters over the Hall, Europe over the long haul and made it', () => {
    // the career whose jersey hangs keeps the rafters even with a Hall of Fame score
    const h = structuredClone(hung!);
    h.player.legacyBonus = 500;
    expect(endingOf(h)).toBe('rafters');
    // the Hall over a ring, a ring over the All-Star teams, those over Europe
    expect(endingOf(BUILT.enshrined)).toBe('enshrined');
    expect(endingOf(BUILT.ring)).toBe('ring');
    expect(endingOf(BUILT.allstar)).toBe('allstar');
    // a legend of Europe over six NBA seasons when as many were abroad, and over a few NBA games
    expect(endingOf(BUILT.eurolegend)).toBe('eurolegend');
    expect(endingOf(career([HS, ['EU', 3], ['NBA', 2]], ['EUMVP']))).toBe('eurolegend');
    // owner: "make legend of europe need more seasons abroad. but not too much": fewer seasons abroad
    // than in the NBA is the long haul, a title over there or not
    expect(endingOf(career([HS, ['EU', 3], ['NBA', 6]], ['EUTITLE']))).toBe('longhaul');
    expect(endingOf(career([HS, ['EU', 3], ['NBA', 4]], ['EUTITLE']))).toBe('madeit');
    // it takes three seasons abroad (any league overseas counts) and the EuroLeague's title or MVP
    expect(endingOf(career([HS, ['EU', 2], ['NBA', 6]], ['EUTITLE']))).toBe('longhaul');
    expect(endingOf(career([HS, ['EU', 2], ['INT', 1]], ['EUTITLE']))).toBe('eurolegend');
    expect(endingOf(career([HS, ['EU', 4]], []))).toBe('passport');
    // an NBA game beats a career abroad, abroad beats the G League, the G League beats college honours
    expect(endingOf(BUILT.madeit)).toBe('madeit');
    expect(endingOf(BUILT.passport)).toBe('passport');
    expect(endingOf(BUILT.grinder)).toBe('grinder');
    expect(endingOf(BUILT.shining)).toBe('shining');
    for (const key of ['NCAATITLE', 'AA1', 'CONFPOY']) expect(endingOf(career([HS, ['NCAA', 2]], [key])), key).toBe('shining');
  });
});

describe('the finale itself', () => {
  const all = () => [hung!, plain!, ...Object.values(BUILT)];

  it('stays under two minutes for every ending, however big the career', () => {
    for (const g of all()) expect(total(g), finaleKind(g)!).toBeLessThanOrEqual(FINALE_MAX);
    for (const g of all()) {
      // every honour going, a farewell tour first, every twist at once
      const big = structuredClone(g);
      for (let i = 0; i < 60; i++) big.awards.push({ year: big.year, level: 'NBA', key: `X${i}`, label: `Honour ${i}` });
      big.log.push({ year: big.year, age: 38, kind: 'retire', text: 'Retired at 38. Said goodbye on a farewell tour, every arena on its feet.' });
      Object.assign(big.flags, { wed: 2030, child: 2032, oath: 1, nextStep: 2034, careerInjury: 2036 });
      big.parent = { name: 'Dale Hale', recId: 'x', legacy: 90 };
      expect(total(big), finaleKind(big)!).toBeLessThanOrEqual(FINALE_MAX);
      expect(timeline(big, finaleKind(big)!).at(-1)).toEqual({ act: 'thanks', secs: 0 });
    }
  });

  it('opens every ending but the rafters on a scene of about half a minute', () => {
    expect(actsOf('rafters')).toEqual(['arena', 'speech', 'jersey', 'roll', 'title', 'thanks']);
    for (const kind of ENDING_IDS.filter((k) => k !== 'rafters')) {
      expect(actsOf(kind)).toEqual(['scene', 'now', 'roll', 'title', 'thanks']);
      expect(actsOf(kind, true)[0]).toBe('ovation');
    }
    for (const g of Object.values(BUILT)) {
      const t = timeline(g, finaleKind(g)!);
      const opening = t.filter((x) => x.act === 'scene' || x.act === 'now').reduce((s, x) => s + x.secs, 0);
      expect(opening).toBeGreaterThanOrEqual(25);
      expect(opening).toBeLessThanOrEqual(35);
    }
  });

  it('writes each scene from the career: three lines, where he is now, nothing left blank', () => {
    for (const [kind, g] of Object.entries(BUILT)) {
      const s = sceneOf(g);
      expect(s.kind).toBe(kind);
      expect(s.title).toBe(ENDINGS[s.kind].name);
      expect(s.lines, kind).toHaveLength(3);
      expect(s.now, kind).toMatch(/^Today /);
      const words = [s.fact, ...s.lines, s.now].join(' ');
      expect(words, kind).not.toMatch(/undefined|NaN|null|\s\s|\.\./);
      expect(s.fact.length, kind).toBeGreaterThan(3);
    }
    expect(sceneOf(BUILT.dream).lines.at(-1)).toBe('The dream ended before the pros. The love of the game did not.');
    // a jersey for each All-Star year (the All-NBA ones only stand in when he never made an All-Star team)
    expect(sceneOf(BUILT.allstar).art.labels).toEqual(['31']);
    expect(sceneOf(career([HS, ['NBA', 4]], ['ALLNBA3', 'ALLNBA2'])).art.labels).toEqual(['30', '31']);
    expect(sceneOf(BUILT.passport).art.labels.join(' ')).toContain('SYDNEY');
  });

  it('layers the twists on: the ovation, a line, the gold in the last shot, the credits’ turning points', () => {
    const g = structuredClone(BUILT.longhaul);
    expect(twistsOf(g)).toMatchObject({ farewell: false, young: null, iron: null, gold: null, father: null, oath: false, leap: null, injury: null });
    g.log.push({ year: g.year, age: 34, kind: 'retire', text: 'Retired at 34. Said goodbye on a farewell tour, every arena on its feet.' });
    expect(finaleFor(g)?.act, 'a farewell tour opens on the last road ovation').toBe('ovation');
    expect(sceneOf(g).ovation?.team).toBe('Los Angeles Lakers');
    g.flags.wed = 2033;
    expect(sceneOf(g).lines[2]).toBe('In the front row for all of it: his wife.');
    g.flags.child = 2035;
    g.flags.childGirl = 1;
    expect(sceneOf(g).lines[2]).toBe('In the front row for all of it: his wife and their daughter.');
    expect(sceneOf(g).art.family).toBe(true);
    g.parent = { name: 'Dale Hale', recId: 'x', legacy: 90 };
    expect(sceneOf(g).lines[2]).toContain('Dale Hale');
    g.flags.oath = 1;
    expect(sceneOf(g).lines[2]).toContain('Rough Road');
    g.flags.nextStep = 2034;
    expect(sceneOf(g).lines[2]).toContain('2034');
    g.flags.careerInjury = 2036;
    expect(sceneOf(g).lines[2]).toContain('2036');
    const turns = creditsOf(g).find((b) => b.head === 'Turning points');
    expect(turns?.rows).toEqual(['The leap · 2034', 'The injury · 2036']);
    g.awards.push({ year: 2032, level: 'NBA', key: 'OLYGOLD', label: 'Olympic gold' });
    expect(sceneOf(g).gold).toBe('Olympic gold · 2032');
    expect(sceneOf(g).art.gold).toBe(true);
    // the ages, when nothing rarer is there to say
    const old = structuredClone(BUILT.longhaul);
    old.retiredAt = 41;
    expect(sceneOf(old).lines[2]).toBe('Iron man: he was still lacing them up at 41.');
    const young = structuredClone(BUILT.madeit);
    young.retiredAt = 27;
    young.log.push({ year: young.year, age: 27, kind: 'retire', text: 'Retired at 27. Walked away early, on his own terms.' });
    expect(sceneOf(young).lines[2]).toBe('He walked away at 27, on his own terms.');
    // a dream that ended in high school never walked away "on his own terms", and keeps the owner's line last
    const dream = structuredClone(BUILT.dream);
    dream.retiredAt = 18;
    dream.log.push({ year: dream.year, age: 18, kind: 'retire', text: 'Retired at 18. Chose to walk away.' });
    expect(twistsOf(dream).young).toBeNull();
    dream.flags.wed = 2040;
    expect(sceneOf(dream).lines).toEqual([sceneOf(BUILT.dream).lines[0], 'In the front row for all of it: his wife.', 'The dream ended before the pros. The love of the game did not.']);
    // and with no new flags at all (the main session adds them), nothing breaks
    expect(creditsOf(BUILT.longhaul).some((b) => b.head === 'Turning points')).toBe(false);
  });

  it('writes his speech from the career, four or five lines, ending on his number', () => {
    const lines = speechOf(hung!);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines.length).toBeLessThanOrEqual(5);
    expect(lines.join(' ')).toContain(hung!.player.hometown);
    expect(lines.at(-1)).toContain(`number ${hung!.player.number}`);
  });

  it('rolls the career as credits: him, his teams, the rafters; the makers in two lines', () => {
    const blocks = creditsOf(hung!);
    const heads = blocks.map((b) => b.head);
    expect(heads[0]).toBe('Starring');
    expect(heads).toContain('Teams');
    expect(heads).toContain('Forever');
    expect(blocks.find((b) => b.head === 'Teams')!.rows.some((r) => r.includes('NBA'))).toBe(true);
    expect(MAKERS).toEqual([
      { role: 'Developer', name: 'MJ Kwon' },
      { role: 'Code, art and sound', name: 'Claude' },
    ]);
  });

  it('can’t be skipped the first time each ending plays on a device, and can after', async () => {
    vi.stubGlobal('localStorage', new FakeStorage());
    vi.resetModules();
    const f = await import('../src/ui/finale');
    expect(f.finaleSeen('level'), 'a level’s short thank-you can always be skipped').toBe(true);
    for (const kind of ENDING_IDS) {
      expect(f.finaleSeen(kind), kind).toBe(false);
      f.markFinaleSeen(kind);
      expect(f.finaleSeen(kind), kind).toBe(true);
      // each ending counts on its own
      for (const other of ENDING_IDS.slice(ENDING_IDS.indexOf(kind) + 1)) expect(f.finaleSeen(other), `${other} after ${kind}`).toBe(false);
    }
  });

  it('starts on its first act, and its music follows it: the ending’s own theme, then Curtain call', () => {
    expect(finaleFor(newGame(5, { ...input, mode: 'standard' })), 'a career still going').toBeNull();
    expect(finaleFor(hung!)?.act).toBe('arena');
    expect(finaleFor(hung!)?.kind).toBe('rafters');
    expect(finaleFor(BUILT.gown)).toMatchObject({ kind: 'gown', act: 'scene' });
    expect(finaleFor(hung!, 'jersey')?.act).toBe('jersey');
    expect(finaleFor(BUILT.gown, 'now')?.act).toBe('now');
    const base = { game: null, intro: false, mini: null };
    for (const act of ['arena', 'speech', 'jersey', 'roll'] as const) expect(trackOf({ ...base, finale: { act, kind: 'rafters' } })).toBe('rafters');
    for (const kind of ENDING_IDS)
      for (const act of ['ovation', 'scene', 'now', 'roll'] as const) {
        expect(trackOf({ ...base, finale: { act, kind } }), `${kind} ${act}`).toBe(kind);
        expect(TRACKS[kind].icon, kind).toBeTruthy();
      }
    expect(trackOf({ ...base, finale: { act: 'title', kind: 'dream' } })).toBe('thanks');
    expect(trackOf({ ...base, finale: { act: 'thanks', kind: 'dream' } })).toBe('thanks');
    // the themes are heard only at an ending, so they stay out of Full Album
    expect(ENDING_LOOPS).toEqual([...ENDING_IDS]);
    expect(new Set(ENDING_IDS.map((k) => TRACKS[k].name)).size).toBe(12);
    expect(ACT_SECS.sceneOpen + 3 * ACT_SECS.sceneLine + ACT_SECS.now).toBe(31);
  });
});
