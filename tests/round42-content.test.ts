// After round 42, end of the round (the checklist, items 5 to 7): the Floor's latest batch in the
// book (the franchises and their faces, the sixth men, Jokic, the eras and the courts, on fire, the
// crowd, the duos, the buzzer-beater, big heads, the game plans, the bracket's conferences, the
// draft, and the superteam draft and series against a friend), five turning points in a career
// (a rooftop run, throwback night, the sixth man's job, a spot of his own, the franchise's face) and
// four shop things (a rooftop court membership, a sixties jersey, a bobblehead, a sixth-man coach).

import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow, type CareerTotals } from '../src/engine/achievements';
import { ACHIEVEMENTS_42, R42_MARKS, R42_TOTALS_ONLY, addFloorMore, floorGameRec, type FloorGameRec } from '../src/engine/achievements42';
import { addFloorGame } from '../src/engine/achievementsMini';
import { achCatOf } from '../src/engine/achievementCats';
import { FLOOR } from '../src/engine/balance';
import { franchise, legendSetup } from '../src/engine/floor/game';
import { afterShot, mirrorGimmicks, pairsAmong } from '../src/engine/floor/gimmicks';
import { ALL_LEGENDS } from '../src/engine/floor/legends';
import { floorResult, startFloor, stepFloor, type FloorResult, type FloorState } from '../src/engine/floor/sim';
import { COURTS } from '../src/ui/floor/view';
import { FRANCHISE_FACE, FRANCHISE_SIXTH } from '../src/content/franchiseFives';
import { NBA_TEAMS } from '../src/content/teams';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { R42, ROUND42_EVENTS, faceOf, sixthOf } from '../src/engine/events/round42';
import { offerEvent } from '../src/engine/events/resolver';
import { SHOP_ITEMS } from '../src/content/shop';
import { pushShop } from '../src/engine/economy/shop';
import { ICONS, shopIcon } from '../src/ui/art/icons';
import { CULTURE_ICONS } from '../src/ui/art/cultureIcons';
import { CAREER_ICONS } from '../src/ui/art/careerIcons';
import { EVENT_ICONS_A } from '../src/ui/art/eventIconsA';
import { EVENT_ICONS_B } from '../src/ui/art/eventIconsB';
import { EVENT_ICONS_C } from '../src/ui/art/eventIconsC';
import { themeOf } from '../src/dev/eventThemes';

const ids42 = ACHIEVEMENTS_42.map((a) => a.id);
const has = (t: CareerTotals, id: string) => earnedNow(null, t).includes(id);
/** The totals after these games on the Floor's own page. */
const after = (...recs: Partial<FloorGameRec>[]): CareerTotals => {
  let mini = NO_TOTALS.mini;
  for (const r of recs) {
    const rec: FloorGameRec = { win: true, era: 'modern', lit: 0, roars: 0, row: 0, duo: false, sixth: false, replay: false, big: false, ot: false, fast: 0, allowed: 15, dd: false, ...r };
    mini = addFloorGame(mini, { margin: rec.win ? 3 : -3, pts: 6, low: 0, kind: 'quick', more: rec });
  }
  return { ...NO_TOTALS, mini };
};

const ALL_ICONS = { ...ICONS, ...CULTURE_ICONS, ...CAREER_ICONS, ...EVENT_ICONS_A, ...EVENT_ICONS_B, ...EVENT_ICONS_C };
/** 16 by 16 in the palette's letters, and drawn for this one thing (no other icon is the same picture). */
function ownIcon(key: string): void {
  const pic = ALL_ICONS[key];
  expect(pic, key).toBeTruthy();
  expect(pic.length, key).toBe(16);
  for (const row of pic) expect(row, key).toMatch(/^[.OWwKRrBbGgYyNnPpSsTtCLMm]{16}$/);
  expect(Object.entries(ALL_ICONS).filter(([k, v]) => k !== key && v.join('|') === pic.join('|')).map(([k]) => k), key).toEqual([]);
}

describe('the book: the Floor’s latest batch', () => {
  it('adds 45, unique across the whole book, each filed, each read from the totals alone', () => {
    expect(ACHIEVEMENTS_42.length).toBe(45);
    // round 42's 935, and these
    expect(ACHIEVEMENTS.length).toBe(980);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.name.toLowerCase())).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS_42) {
      expect(ACHIEVEMENTS, a.id).toContain(a);
      expect(achCatOf(a.id), a.id).not.toBeNull();
      expect(a.how.length, a.id).toBeLessThan(110);
    }
    expect(R42_TOTALS_ONLY).toEqual(ids42);
    expect(achCatOf('fh-team5')).toBe('arcade');
    expect(achCatOf('fo-sweep')).toBe('arcade');
    expect(achCatOf('fh-big')).toBe('odd');
    expect(achCatOf('fh-east')).toBe('titles');
  });

  it('keeps its marks in step with the game: the franchises, the faces, the courts', () => {
    expect(R42_MARKS.teams[2]).toBe(NBA_TEAMS.length);
    expect(R42_MARKS.faces[1]).toBe(Object.keys(FRANCHISE_FACE).length);
    expect(R42_MARKS.courts).toBe(COURTS.length);
    expect(Object.values(FRANCHISE_FACE)).toContain('Nikola Jokic');
  });

  it('earns nothing from empty totals, nor from games lost', () => {
    const none = earnedNow(null, { ...NO_TOTALS });
    for (const id of ids42) expect(none, id).not.toContain(id);
    const lost = after({ win: false, team: 'DEN', opp: 'DEN', face: 'Nikola Jokic', era: 'sixties', court: 'rooftop', duo: true, sixth: true, replay: true, big: true, ot: true, fast: 20, conf: 'East', stars: 5 });
    for (const id of ['fh-face1', 'fh-joker', 'fh-nuggets', 'fh-era60', 'fh-roof', 'fh-duo', 'fh-sixth', 'fh-buzzer', 'fh-big', 'fh-ot', 'fh-fast', 'fh-east', 'fh-stars']) expect(has(lost, id), id).toBe(false);
  });

  it('counts franchises and faces won with, tier by tier', () => {
    const teams = NBA_TEAMS.map((x) => x.abbr);
    const won = (n: number) => after(...teams.slice(0, n).map((team) => ({ team, face: FRANCHISE_FACE[team] })));
    expect(has(won(4), 'fh-team5')).toBe(false);
    expect(has(won(5), 'fh-team5')).toBe(true);
    expect(has(won(5), 'fh-face1')).toBe(true);
    expect(has(won(9), 'fh-face10')).toBe(false);
    expect(has(won(10), 'fh-face10')).toBe(true);
    expect(has(won(15), 'fh-team15')).toBe(true);
    expect(has(won(29), 'fh-team30')).toBe(false);
    expect(has(won(30), 'fh-team30')).toBe(true);
    expect(has(won(30), 'fh-face30')).toBe(true);
    // the same franchise twice counts once
    expect(has(after(...Array.from({ length: 5 }, () => ({ team: 'CHI' }))), 'fh-team5')).toBe(false);
    expect(has(after({ face: 'Nikola Jokic' }), 'fh-joker')).toBe(true);
    expect(has(after({ opp: 'DEN' }), 'fh-nuggets')).toBe(true);
  });

  it('reads the eras, the courts, the plans, the conferences and the draft', () => {
    expect(has(after({ era: 'nineties' }), 'fh-era90')).toBe(true);
    expect(has(after({ era: 'nineties' }, { era: 'sixties' }), 'fh-eras')).toBe(false);
    expect(has(after({ era: 'nineties' }, { era: 'sixties' }, { era: 'modern' }), 'fh-eras')).toBe(true);
    const courts = COURTS.map((c) => ({ court: c.id }));
    expect(has(after(...courts.slice(0, -1)), 'fh-courts')).toBe(false);
    const all = after(...courts);
    for (const id of ['fh-courts', 'fh-roof', 'fh-beach', 'fh-street', 'fh-gym']) expect(has(all, id), id).toBe(true);
    const styles = Object.keys(FLOOR.play).map((style) => ({ style }));
    expect(has(after(...styles.slice(1)), 'fh-styles')).toBe(false);
    expect(has(after(...styles), 'fh-styles')).toBe(true);
    expect(has(after({ shape: 'standard' }, { shape: 'fiveOut' }, { shape: 'fourOutOneIn' }, { shape: 'twinTowers' }, { shape: 'horns' }), 'fh-shapes')).toBe(true);
    expect(has(after({ style: 'grind', allowed: R42_MARKS.lock + 1 }), 'fh-lock')).toBe(false);
    expect(has(after({ style: 'balanced', allowed: 2 }), 'fh-lock')).toBe(false);
    expect(has(after({ style: 'grind', allowed: R42_MARKS.lock }), 'fh-lock')).toBe(true);
    expect(has(after({ conf: 'West' }), 'fh-west')).toBe(true);
    expect(has(after({ conf: 'West' }), 'fh-east')).toBe(false);
    expect(has(after({ stars: 4 }), 'fh-stars')).toBe(false);
    expect(has(after({ stars: 5 }), 'fh-stars')).toBe(true);
    expect(has(after({ blue: true }), 'fh-blue')).toBe(true);
    expect(has(after({ fast: R42_MARKS.fast - 1 }), 'fh-fast')).toBe(false);
    expect(has(after({ fast: R42_MARKS.fast }), 'fh-fast')).toBe(true);
  });

  it('reads the fire, the crowd and the rows from any game, the duos, the bench, the buzzer and big heads from wins', () => {
    const fire = after({ win: false, row: FLOOR.gimmick.fireMakes, lit: R42_MARKS.lit, roars: R42_MARKS.roars });
    for (const id of ['fh-fire', 'fh-lit3', 'fh-crowd', 'fh-crowd3']) expect(has(fire, id), id).toBe(true);
    expect(has(fire, 'fh-row5')).toBe(false);
    expect(has(after({ row: R42_MARKS.row[1] }), 'fh-row8')).toBe(true);
    const many = (k: Partial<FloorGameRec>, n: number) => after(...Array.from({ length: n }, () => k));
    expect(has(many({ duo: true }, R42_MARKS.duo - 1), 'fh-duo10')).toBe(false);
    expect(has(many({ duo: true }, R42_MARKS.duo), 'fh-duo10')).toBe(true);
    expect(has(many({ sixth: true }, R42_MARKS.sixth), 'fh-sixth3')).toBe(true);
    expect(has(many({ replay: true }, R42_MARKS.buzzer), 'fh-buzzer3')).toBe(true);
    expect(has(many({ big: true }, R42_MARKS.big), 'fh-big10')).toBe(true);
    expect(has(after({ ot: true }), 'fh-ot')).toBe(true);
    expect(has(after({ win: false, dd: true }), 'fh-dd')).toBe(true);
  });

  it('reads the friend games: a drafted win, a series, a sweep, the same friend beaten again and again', () => {
    const f = (o: Partial<NonNullable<CareerTotals['floorFriend']>>): CareerTotals => ({ ...NO_TOTALS, floorFriend: { games: 1, wins: 1, losses: 0, streak: 1, best: 1, rout: false, close: false, pts: 0, ...o } });
    expect(has(f({}), 'fo-draft')).toBe(false);
    expect(has(f({ draftWins: 1 }), 'fo-draft')).toBe(true);
    expect(has(f({ series: 1 }), 'fo-series')).toBe(true);
    expect(has(f({ sweeps: 1 }), 'fo-sweep')).toBe(true);
    expect(has(f({ draftSeries: 1 }), 'fo-draftseries')).toBe(true);
    expect(has(f({ vs: { Ana: R42_MARKS.rival - 1, Bo: 3 } }), 'fo-rival')).toBe(false);
    expect(has(f({ vs: { Ana: R42_MARKS.rival } }), 'fo-rival')).toBe(true);
  });

  it('keeps the old totals and adds to them, without touching what it was given', () => {
    const one: FloorGameRec = { win: true, team: 'CHI', era: 'modern', court: 'arena', lit: 2, roars: 1, row: 4, duo: true, sixth: false, replay: false, big: false, ot: false, fast: 3, allowed: 9, dd: false };
    const m = addFloorMore(undefined, one);
    const frozen = structuredClone(m);
    const m2 = addFloorMore(m, { ...one, win: false, lit: 1, row: 6, team: 'LAL' });
    expect(m).toEqual(frozen);
    expect(m2.teams).toEqual(['CHI']);
    expect(m2.lit).toBe(2);
    expect(m2.row).toBe(6);
    expect(m2.duo).toBe(1);
    // the old marks of addFloorGame still count as before
    const t = addFloorGame(undefined, { margin: 4, pts: 9, low: -9, kind: 'draft', more: one });
    expect(t.wins.floor).toBe(1);
    expect(t.floor?.draft).toBe(1);
    expect(t.floor?.more?.teams).toEqual(['CHI']);
    expect(addFloorGame(undefined, { margin: 4, pts: 9, low: 0, kind: 'quick' }).floor?.more).toBeUndefined();
  });
});

describe('what a game on the Floor records for the book', () => {
  const game = (o: { us?: string; them?: string; era?: 'modern' | 'nineties' | 'sixties'; seed?: number } = {}): FloorState =>
    startFloor(legendSetup({ seed: o.seed ?? 11, us: franchise(o.us ?? 'CHI'), them: franchise(o.them ?? 'LAL'), length: 'fourth', era: o.era }));
  const idxOf = (s: FloorState, name: string) => s.players.findIndex((p) => p.name === name);

  it('counts each catch of fire, each roar of the crowd and the most makes in a row', () => {
    const s = game();
    const mj = idxOf(s, 'Michael Jordan');
    for (let k = 0; k < 4; k++) afterShot(s, mj, true, () => undefined);
    expect(s.gm!.lit).toEqual([1, 0]);
    expect(s.gm!.roars).toEqual([1, 0]);
    expect(s.gm!.most[mj]).toBe(4);
    afterShot(s, mj, false, () => undefined);
    afterShot(s, mj, false, () => undefined);
    for (let k = 0; k < 3; k++) afterShot(s, mj, true, () => undefined);
    expect(s.gm!.lit).toEqual([2, 0]);
    expect(s.gm!.most[mj]).toBe(4);
    // seen from the other end (a friend's screen), the teams' counts swap
    const m = mirrorGimmicks(s.gm)!;
    expect(m.lit).toEqual([0, 2]);
    expect(m.roars).toEqual([0, 1]);
    expect(m.most).toEqual(s.gm!.most);
  });

  it('gives the result its era, its marks and whether his team had a famous duo', () => {
    const s = game({ era: 'sixties' });
    for (let k = 0; k < 5; k++) afterShot(s, s.user, true, () => undefined);
    for (let i = 0; i < 400000 && s.phase !== 'over'; i++) stepFloor(s, null);
    const r = floorResult(s);
    expect(r.gm.era).toBe('sixties');
    expect(r.gm.row).toBeGreaterThanOrEqual(5);
    expect(r.gm.lit).toBeGreaterThanOrEqual(1);
    // Jordan and Pippen are both Bulls
    expect(r.gm.duo).toBe(true);
    // a franchise with no famous duo in its five and sixth man has none
    const lone = NBA_TEAMS.map((x) => x.abbr).find((abbr) => {
      const g = game({ us: abbr, them: 'CHI' });
      return !pairsAmong(g.players.filter((p) => p.team === 0).map((p) => p.name)).length;
    })!;
    expect(lone).toBeTruthy();
    expect(floorResult(game({ us: lone, them: 'CHI' })).gm.duo).toBe(false);
  });

  it('turns a result and the page’s picks into a record: the face he steered, the bench, the draft', () => {
    const s = game();
    for (let i = 0; i < 400000 && s.phase !== 'over'; i++) stepFloor(s, null);
    const r: FloorResult = floorResult(s);
    const steered = r.box.find((b) => b.user && b.team === 0)!;
    const rec = floorGameRec({ ...r, replay: true, big: true }, { team: 'CHI', opp: 'LAL', court: 'beach', plan: { shape: 'horns', style: 'motion' } });
    expect(rec.face).toBe(Object.values(FRANCHISE_FACE).includes(steered.name) ? steered.name : undefined);
    expect([rec.court, rec.style, rec.shape, rec.replay, rec.big, rec.win]).toEqual(['beach', 'motion', 'horns', true, true, r.win]);
    expect(rec.allowed).toBe(r.them - r.start[1]);
    expect(floorGameRec(r, {}).court).toBe('arena');
    // a bench man alone at the top of his team's scoring
    const box = (name: string, starter: boolean, pts: number) => ({ name, team: 0 as const, pos: 'SF' as const, starter, user: false, box: { ...steered.box, pts } });
    expect(floorGameRec({ ...r, box: [box('A', true, 6), box('B', false, 8)] }, {}).sixth).toBe(true);
    expect(floorGameRec({ ...r, box: [box('A', true, 8), box('B', false, 8)] }, {}).sixth).toBe(false);
    // a drafted five: how many 95s, and whether it is all under 90
    const stars = ALL_LEGENDS.filter((x) => x.spot.ovr >= R42_MARKS.star).slice(0, 5).map((x) => x.spot);
    const blue = ALL_LEGENDS.filter((x) => x.spot.ovr < R42_MARKS.blue).slice(0, 5).map((x) => x.spot);
    expect(stars).toHaveLength(5);
    expect(floorGameRec(r, { drafted: stars }).stars).toBe(5);
    expect(floorGameRec(r, { drafted: stars }).blue).toBe(false);
    expect(floorGameRec(r, { drafted: blue }).blue).toBe(true);
    expect(floorGameRec(r, {}).stars).toBeUndefined();
  });
});

// ---------------- the career: turning points and the shop ----------------

const input = { name: 'Marcus Hale', number: 23, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton, OH', highSchool: 'Fairview High' };

/** A Regular guy career played to its first NBA offseason (the first of these seeds that makes it). */
function nbaOff(...seeds: number[]): { mid: GameState; off: GameState } {
  for (const seed of seeds) {
    const g = newGame(seed, { ...input, mode: 'standard' });
    const r = makeRng(seed);
    let mid: GameState | null = null;
    for (let k = 0; k < 9000; k++) {
      if (!mid && g.stage === 'NBA' && g.step === 'midseason' && g.season?.games.length) mid = structuredClone(g);
      if (mid && g.stage === 'NBA' && g.step === 'offseason' && !g.pending.length) return { mid, off: g };
      fastForward(g);
      const pr = prompt(g);
      if (pr.type === 'retired') break;
      if (pr.type === 'decision') choose(g, smartChoice(g, pr.decision, r));
      else advance(g);
    }
  }
  throw new Error(`none of seeds ${seeds.join(', ')} had an NBA season`);
}

describe('the turning points after round 42: the Floor in a career', () => {
  const { mid, off } = nbaOff(4211, 4212, 4213, 4214, 4215);
  const at = (base: GameState, o: { starter?: boolean; rep?: number } = {}) => {
    const t = structuredClone(base);
    t.player.rep = o.rep ?? 70;
    t.player.injury = null;
    const h = [...t.history].reverse().find((x) => x.level === 'NBA');
    if (h && o.starter !== undefined) h.role = o.starter ? 'starter' : 'bench';
    return t;
  };
  const where: Record<string, GameState> = {
    rooftopRun: at(off),
    retroNight: at(mid),
    sixthManPitch: at(off, { starter: true }),
    hotSpot: at(mid),
    franchiseFace: at(off),
  };
  const ev = (id: string) => ROUND42_EVENTS.find((e) => e.id === id)!;
  const applies = (id: string, s: GameState) => ev(id).stages.includes(s.stage) && (ev(id).when?.(s) ?? true);

  it('has five, each with a pixel icon of its own and a theme in the deck, once a career', () => {
    expect(ROUND42_EVENTS.map((e) => e.id)).toEqual(Object.keys(where));
    for (const e of ROUND42_EVENTS) {
      ownIcon(`ev-${e.id}`);
      expect(themeOf(e.id), e.id).not.toBe('Other');
      expect(e.oncePerCareer, e.id).toBe(true);
    }
  });

  it('names his franchise’s sixth man and face, and keeps each to its window', () => {
    const abbr = off.nba!.teams.find((x) => x.id === off.teamId)!.abbr;
    expect(sixthOf(off)).toBe(FRANCHISE_SIXTH[abbr].name);
    expect(faceOf(off)).toBe(FRANCHISE_FACE[abbr]);
    expect(applies('sixthManPitch', where.sixthManPitch)).toBe(true);
    expect(applies('sixthManPitch', at(off, { starter: false }))).toBe(false);
    expect(applies('franchiseFace', at(off, { rep: R42.face.rep }))).toBe(true);
    expect(applies('franchiseFace', at(off, { rep: R42.face.rep - 1 }))).toBe(false);
    // off an NBA team neither has a name to use
    const away = structuredClone(off);
    away.stage = 'EU';
    expect(sixthOf(away)).toBeNull();
    expect(faceOf(away)).toBeNull();
  });

  it('offers each one, every choice resolves with a result card, the text names the legend, the harness picks one', () => {
    for (const e of ROUND42_EVENTS) {
      const s = where[e.id];
      expect(applies(e.id, s), e.id).toBe(true);
      const t = structuredClone(s);
      expect(offerEvent(t, e.id), e.id).toBe(true);
      const d = t.pending[0];
      expect(d.kind).toBe('event');
      expect(d.choices.length, e.id).toBe(3);
      expect(d.choices.map((c) => c.id)).toContain(smartChoice(t, d, makeRng(1)));
      for (const c of d.choices) {
        const u = structuredClone(t);
        expect(() => choose(u, c.id), `${e.id}: ${c.label}`).not.toThrow();
        expect(u.result?.title).toBe(e.title);
        expect(u.result?.choice).toBe(c.label);
        expect(u.result!.text.length, `${e.id}: ${c.label}`).toBeGreaterThan(20);
      }
    }
    const text = (id: string, s: GameState) => {
      const e = ev(id);
      return typeof e.text === 'function' ? e.text(s) : e.text;
    };
    expect(text('sixthManPitch', where.sixthManPitch)).toContain(sixthOf(off)!);
    expect(text('franchiseFace', where.franchiseFace)).toContain(faceOf(off)!);
  });

  it('keeps every effect small: a rating by half a point at most, morale by three, the name by two', () => {
    for (const e of ROUND42_EVENTS)
      for (const [k, c] of (e.choices as Exclude<typeof e.choices, (s: GameState) => unknown>).entries()) {
        const s = structuredClone(where[e.id]);
        const t = structuredClone(s);
        c.resolve(t, makeRng(k));
        for (const a of Object.keys(s.player.attrs) as (keyof typeof s.player.attrs)[]) expect(Math.abs(t.player.attrs[a] - s.player.attrs[a]), `${e.id} ${k} ${a}`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(t.player.morale - s.player.morale), `${e.id} ${k}`).toBeLessThanOrEqual(3);
        expect(Math.abs(t.player.trust - s.player.trust), `${e.id} ${k}`).toBeLessThanOrEqual(3);
        expect(Math.abs(t.player.rep - s.player.rep), `${e.id} ${k}`).toBeLessThanOrEqual(2);
        expect(t.player.bank, `${e.id} ${k}`).toBe(s.player.bank);
      }
  });
});

describe('the shop things after round 42: courts, eras, sixth men and big heads', () => {
  const ids = ['rooftop-pass', 'retro-jersey', 'bobblehead', 'sixth-man-coach'];

  it('sells four, each with a pixel icon of its own', () => {
    const keys = new Set<string>();
    for (const id of ids) {
      const it = SHOP_ITEMS.find((x) => x.id === id)!;
      expect(it, id).toBeTruthy();
      expect(it.klass, id).toBeUndefined();
      const icon = shopIcon(it.id, it.name);
      expect(icon, id).not.toBe('bag');
      ownIcon(icon);
      keys.add(icon);
    }
    expect(keys.size).toBe(ids.length);
    for (const it of SHOP_ITEMS.filter((x) => !ids.includes(x.id))) expect(keys.has(shopIcon(it.id, it.name)), it.id).toBe(false);
  });

  it('does what the shop says it does', () => {
    const g = newGame(4217, input);
    g.player.bank = 1;
    pushShop(g, ids);
    const d = g.pending.find((x) => x.kind === 'shop')!;
    const detail = (id: string) => d.choices.find((c) => c.id === id)!.detail!;
    expect(detail('rooftop-pass')).toContain('Lifts your mood');
    expect(detail('retro-jersey')).toContain('Lifts your mood');
    expect(detail('bobblehead')).toContain('Lifts your mood');
    expect(detail('sixth-man-coach')).toContain('your shooting');
  });
});
