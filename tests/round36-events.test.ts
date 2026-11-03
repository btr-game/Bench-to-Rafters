// Round 36, end of the round (the checklist, item 6): turning points and shop things for the round's
// systems. The number talk (a long, strong stay, and two more seasons at a hometown discount), the
// first draft of the speech, the JV coach's last game, the fan account and the old rival's number
// going up; and four shop things: the framed first jersey, a replica rafters banner, a speaking
// coach and a yearly body scan.

import { describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState, SeasonRecord } from '../src/engine/types';
import { NUMBER_TALK, ROUND36_EVENTS, fanHandle, numberTalkFits } from '../src/engine/events/round36';
import { offerEvent } from '../src/engine/events/resolver';
import { raftersTeams } from '../src/engine/awards/legacy';
import { SHOP_ITEMS } from '../src/content/shop';
import { VISITS } from '../src/content/visits';
import { pushShop, visitItem } from '../src/engine/economy/shop';
import { ICONS, shopIcon } from '../src/ui/art/icons';
import { CULTURE_ICONS } from '../src/ui/art/cultureIcons';
import { CAREER_ICONS } from '../src/ui/art/careerIcons';
import { EVENT_ICONS_A } from '../src/ui/art/eventIconsA';
import { EVENT_ICONS_B } from '../src/ui/art/eventIconsB';
import { EVENT_ICONS_C } from '../src/ui/art/eventIconsC';
import { themeOf } from '../src/dev/eventThemes';

const input = { name: 'Marcus Hale', number: 23, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };

/** A Regular guy career played to its first NBA midseason and on to that season's offseason (the
 * first of these seeds whose player makes the NBA). */
function nbaYear(...seeds: number[]): { mid: GameState; off: GameState } {
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

const ev = (id: string) => ROUND36_EVENTS.find((e) => e.id === id)!;
const applies = (id: string, s: GameState) => ev(id).stages.includes(s.stage) && (ev(id).when?.(s) ?? true);
const ALL_ICONS = { ...ICONS, ...CULTURE_ICONS, ...CAREER_ICONS, ...EVENT_ICONS_A, ...EVENT_ICONS_B, ...EVENT_ICONS_C };
/** 16 by 16 in the palette's letters, and drawn for this one thing (no other icon is the same picture). */
function ownIcon(key: string): void {
  const pic = ALL_ICONS[key];
  expect(pic, key).toBeTruthy();
  expect(pic.length, key).toBe(16);
  for (const row of pic) expect(row, key).toMatch(/^[.OWwKRrBbGgYyNnPpSsTtCLMm]{16}$/);
  expect(Object.entries(ALL_ICONS).filter(([k, v]) => k !== key && v.join('|') === pic.join('|')).map(([k]) => k), key).toEqual([]);
}

/** Seasons with his NBA team after the last, the last a title as its first option: a team that hangs his jersey. */
function hangIt(g: GameState): GameState {
  const last = g.history.filter((h) => h.level === 'NBA').at(-1)!;
  for (let k = 1; k <= 5; k++) {
    const h: SeasonRecord = { ...structuredClone(last), year: last.year + k, age: last.age + k, awards: k === 5 ? ['Champion'] : [], role: k === 5 ? 'key' : 'starter' };
    g.history.push(h);
  }
  return g;
}

describe('round 36\'s turning points: the rafters, the speech, the JV, the fan account, the rival', () => {
  const { mid, off } = nbaYear(3601, 3602, 3603, 3604, 3605, 3606);
  /** A long, strong stay: 30, six seasons with his team on a standard deal, an All-Star team behind him. */
  const longStay = (() => {
    const t = structuredClone(off);
    t.player.age = 30;
    t.teamSeasons[t.teamId!] = 6;
    t.contract = { teamId: t.teamId!, kind: 'standard', salary: 20, years: 1, teamOptionYears: [1], signedYear: t.year - 3 };
    t.awards.push({ year: t.year, level: 'NBA', key: 'ALLSTAR', label: 'All-Star' });
    return t;
  })();
  const where: Record<string, GameState> = {
    numberTalk: longStay,
    speechDraft: (() => {
      const t = hangIt(structuredClone(off));
      t.player.age = 33;
      return t;
    })(),
    jvCoach: (() => {
      const t = structuredClone(off);
      t.player.age = 25;
      if (!t.history.some((h) => h.level === 'HSJV')) t.history[0].level = 'HSJV';
      return t;
    })(),
    fanAccount: (() => {
      const t = structuredClone(mid);
      t.player.rep = 60;
      // five seasons behind him
      while (t.history.length < 5) t.history.unshift({ ...structuredClone(t.history[0]), year: t.history[0].year - 1 });
      return t;
    })(),
    rivalJersey: (() => {
      const t = structuredClone(off);
      t.player.age = 31;
      t.rivalry = { level: 'starter', pid: 1, name: 'Dario Okafor', pos: 'SF', since: t.year - 6, team: 'Boston Celtics', w: 14, l: 11, seasons: [], notes: [], ended: 'Dario Okafor left the league.' };
      return t;
    })(),
  };

  it('has five, each with a pixel icon of its own and a theme in the deck', () => {
    expect(ROUND36_EVENTS.map((e) => e.id)).toEqual(Object.keys(where));
    for (const e of ROUND36_EVENTS) {
      ownIcon(`ev-${e.id}`);
      expect(themeOf(e.id), e.id).not.toBe('Other');
      expect(e.oncePerCareer, e.id).toBe(true);
    }
  });

  it('offers each one where it applies, and every choice resolves with a result card; the harness picks one', () => {
    expect(raftersTeams(where.speechDraft).length).toBeGreaterThan(0);
    for (const e of ROUND36_EVENTS) {
      const s = structuredClone(where[e.id]);
      expect(applies(e.id, s), e.id).toBe(true);
      expect(offerEvent(s, e.id), e.id).toBe(true);
      const d = s.pending[0];
      expect(d.kind).toBe('event');
      expect(d.title).toBe(e.title);
      expect(d.text.length, e.id).toBeGreaterThan(60);
      expect(d.choices.length).toBe(3);
      expect(d.choices.map((c) => c.id)).toContain(smartChoice(s, d, makeRng(1)));
      for (const c of d.choices) {
        const t = structuredClone(s);
        expect(() => choose(t, c.id), `${e.id}: ${c.label}`).not.toThrow();
        expect(t.result?.title).toBe(e.title);
        expect(t.result?.choice).toBe(c.label);
        expect(t.result!.text.length, `${e.id}: ${c.label}`).toBeGreaterThan(20);
        // the same career makes the same call the same way: everything comes from its own random stream
        const u = structuredClone(s);
        choose(u, c.id);
        expect(u.result).toEqual(t.result);
        expect(u.player).toEqual(t.player);
      }
    }
  });

  it('keeps each one to its window', () => {
    // the number talk: a long, strong stay, on a standard deal with his own team
    const no = (f: (t: GameState) => void) => {
      const t = structuredClone(longStay);
      f(t);
      return numberTalkFits(t);
    };
    expect(numberTalkFits(longStay)).toBe(true);
    expect(no((t) => (t.player.age = 27)), 'too young').toBe(false);
    expect(no((t) => (t.player.age = 35)), 'too old').toBe(false);
    expect(no((t) => (t.teamSeasons[t.teamId!] = 4)), 'a short stay').toBe(false);
    expect(no((t) => (t.contract!.kind = 'rookie')), 'a rookie deal').toBe(false);
    expect(no((t) => (t.contract!.teamId = 'XXX')), 'a deal with another team').toBe(false);
    expect(no((t) => ((t.awards = []), (t.player.legacyBonus = -100))), 'no All-Star team, a legacy under 10').toBe(false);
    expect(no((t) => ((t.awards = []), (t.player.legacyBonus = 50))), 'a legacy of 10 or more').toBe(true);
    expect(ev('numberTalk').stages).toEqual(['NBA']);
    // the speech waits for a team that would hang the jersey, at 32 or older
    expect(applies('speechDraft', off), 'no team hangs it').toBe(raftersTeams(off).length > 0 && off.player.age >= 32);
    const youngHung = structuredClone(where.speechDraft);
    youngHung.player.age = 31;
    expect(applies('speechDraft', youngHung)).toBe(false);
    // the JV coach only for a player who started on the JV, and not as a college kid
    const varsity = structuredClone(where.jvCoach);
    for (const h of varsity.history) if (h.level === 'HSJV') h.level = 'HSV';
    expect(applies('jvCoach', varsity)).toBe(false);
    expect(ev('jvCoach').stages).not.toContain('NCAA');
    // the fan account waits for a name worth clipping
    const quiet = structuredClone(where.fanAccount);
    quiet.player.rep = 30;
    expect(applies('fanAccount', quiet)).toBe(false);
    // the rival's night: once he has left the league, and only for a real rivalry (not the draft's)
    const still = structuredClone(where.rivalJersey);
    still.rivalry!.ended = undefined;
    expect(applies('rivalJersey', still)).toBe(false);
    const draftRival = structuredClone(where.rivalJersey);
    draftRival.rivalry!.level = 'draft';
    expect(applies('rivalJersey', draftRival)).toBe(false);
  });

  it('signs him on for two more seasons at a hometown discount when he promises to finish there', () => {
    const s = structuredClone(longStay);
    offerEvent(s, 'numberTalk');
    const before = { ...s.contract! };
    choose(s, s.pending[0].choices[0].id);
    expect(s.contract!.years).toBe(before.years + NUMBER_TALK.years);
    expect(s.contract!.salary).toBeLessThanOrEqual(Math.round(before.salary * NUMBER_TALK.discount * 10) / 10 + 1e-9);
    expect(s.contract!.teamOptionYears).toEqual([]);
    expect(s.flags.pledge).toBe(s.year);
    expect(s.log.at(-1)!.text).toMatch(/^Promised the .* he would finish his career there/);
    // the other two leave the deal as it was
    for (const k of [1, 2]) {
      const t = structuredClone(longStay);
      offerEvent(t, 'numberTalk');
      choose(t, t.pending[0].choices[k].id);
      expect(t.contract).toEqual(longStay.contract);
      expect(t.flags.pledge).toBeUndefined();
    }
  });

  it('writes the logs the book reads, and names him and his rival', () => {
    const say = (id: string, k = 0) => {
      const s = structuredClone(where[id]);
      offerEvent(s, id);
      const text = s.pending[0].text;
      choose(s, s.pending[0].choices[k].id);
      return { s, text };
    };
    expect(say('speechDraft').s.flags.speech).toBeDefined();
    expect(say('jvCoach').s.log.at(-1)!.text).toMatch(/^Flew home to speak at his JV coach/);
    const fan = say('fanAccount');
    expect(fan.text).toContain(`@${fanHandle(where.fanAccount)}`);
    expect(fanHandle(where.fanAccount)).toMatch(/^[a-z]+\d+clips$/);
    expect(fan.s.log.at(-1)!.text).toMatch(/^Followed back @/);
    const rival = say('rivalJersey');
    expect(rival.text).toContain('Dario Okafor');
    expect(rival.text).toContain('Boston Celtics');
    expect(rival.s.log.at(-1)!.text).toBe('Spoke the night Dario Okafor’s number went up.');
  });
});

describe('round 36\'s shop things: the rafters, the speech and the body', () => {
  const ids = ['framed-jersey', 'rafters-banner', 'speech-coach', 'body-scan'];

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
    const g = newGame(3603, input);
    g.player.bank = 1;
    pushShop(g, ids);
    const d = g.pending.find((x) => x.kind === 'shop')!;
    const detail = (id: string) => d.choices.find((c) => c.id === id)!.detail!;
    expect(detail('framed-jersey')).toContain('Lifts your mood');
    expect(detail('rafters-banner')).toContain('Lifts your mood');
    expect(detail('speech-coach')).toContain('Raises your profile');
    expect(detail('body-scan')).toContain('Keeps your body healthier');
    expect(detail('body-scan')).toContain('Slows down aging');
  });

  it('lets him go back to the frame and the banner he owns', () => {
    for (const id of ['framed-jersey', 'rafters-banner']) {
      expect(VISITS[id], id).toBeTruthy();
      const s = newGame(3604, input);
      expect(visitItem(s, id), id).toBeNull();
      s.purchases.push(id);
      expect(visitItem(s, id), id).toBeTruthy();
    }
    // the coach and the scan are services, not things to visit
    for (const id of ['speech-coach', 'body-scan']) expect(VISITS[id], id).toBeUndefined();
  });
});
