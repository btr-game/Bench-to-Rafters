// Story mode's chapters (round 38, owner: "the story mode will totally rely on the relationship
// between the three"). Each is one page: the person, a few lines, two or three answers. Answers
// move the friend's drive (how far he goes), the bonds, a few switches later chapters read, and
// sometimes something real (a teammate, an assistant coach, the rival's team). One chapter comes a
// summer at most, the first that fits in the order below; a few open a season instead (meeting the
// rival, the friend's road being decided, draft night). Heavy ones always have a gentler way through
// (owner: "heavy at times, gentle path").
// The words are keyed (content/story.ts): a chapter names its lines, its answers and their results
// by key, the page carries the keys and the names that fill them, and the screen reads them in the
// player's language (round 40). The English, filled in, is still what the log and the toast keep.

import { STORY, STORY_CH } from '../balance';
import { chance, clamp } from '../rng';
import type { Decision, GameState, StoryRole, StoryState } from '../types';
import { adjust, logDecision, pushDecision, teamById, userOvr } from '../career/common';
import { storyText, type StorySlots } from '../../content/story';
import { first, storyRng } from './cast';
import { hurtFriend } from './pals';

type Ctx = { s: GameState; st: StoryState };
interface Answer {
  id: string;
  /** What it does; returns the result's key when it is not the answer's own (a roll's two ends). */
  go: (c: Ctx) => string | void;
}
interface Chapter {
  id: string;
  who: StoryRole;
  /** 'start': it opens a season (story/pals.ts storySeason) rather than closing a summer. */
  at?: 'start';
  when: (c: Ctx) => boolean;
  /** Its lines' keys, in order. */
  lines: (c: Ctx) => string[];
  answers: (c: Ctx) => Answer[];
  /** What happens as the page opens, once (the injury road's knee). */
  open?: (c: Ctx) => void;
}

// ---- words ----
const town = (s: GameState) => (s.player.hometown || 'Dayton').split(',')[0];
const myTeam = (c: Ctx) => (c.s.stage === 'NBA' || c.s.stage === 'NCAA' ? (teamById(c.s.stage === 'NBA' ? c.s.nba : c.s.league, c.s.teamId)?.name ?? null) : null);
const nba = (c: Ctx) => c.s.stage === 'NBA' && !!myTeam(c);

/** The names and places a story line's slots take. */
export function storySlots(s: GameState, st: StoryState): StorySlots {
  return {
    F: first(st.names.friend),
    R: first(st.names.rival),
    P: first(st.names.parent),
    S: first(st.names.sibling),
    rival: st.names.rival,
    town: town(s),
    school: STORY.smallSchool,
    rteam: st.rival?.team || STORY.smallSchool,
    fteam: st.friend.team || STORY.smallSchool,
  };
}

// ---- effects ----
function bond(c: Ctx, who: StoryRole, d: number): void {
  c.st.bond[who] = clamp((c.st.bond[who] ?? 0) + d, -3, 3);
}
const drive = (c: Ctx, d: number) => (c.st.friend.drive = clamp(c.st.friend.drive + d, -2, 8));
const seed = (c: Ctx, d: number) => (c.st.friend.coach = (c.st.friend.coach ?? 0) + d);
const morale = (c: Ctx, d: number) => (c.s.player.morale = adjust(c.s.player.morale, d));
const trust = (c: Ctx, d: number) => (c.s.player.trust = adjust(c.s.player.trust, d));
const rep = (c: Ctx, d: number) => (c.s.player.rep = clamp(c.s.player.rep + d, 0, 100));
const iq = (c: Ctx, d: number) => (c.s.player.attrs.IQ += d);
const train = (c: Ctx) => (c.s.player.growthMultNext = (c.s.player.growthMultNext ?? 1) * STORY_CH.trainGrowth);
const rivalDrive = (c: Ctx) => c.st.rival && (c.st.rival.drive += 1);
/** A line he said, kept for later chapters (its words are mem.<id>). */
const remember = (c: Ctx, who: StoryRole, id: string) => c.st.mem.push({ id, year: c.s.year, who, text: storyText(`mem.${id}`, storySlots(c.s, c.st)) });
const said = (c: Ctx, id: string) => c.st.mem.some((m) => m.id === id);
const did = (c: Ctx, id: string) => c.st.done.includes(id);
const roll = (c: Ctx, tag: string, p: number) => chance(storyRng(c.s, 'ch', tag), p);

const CHAPTERS: Chapter[] = [
  // ---------------- the friend, growing up ----------------
  {
    id: 'f-driveway',
    who: 'friend',
    when: () => false, // the career's first page (openStory pushes it)
    lines: () => ['1', '2'],
    answers: (c) => [
      { id: 'together', go: () => void (drive(c, 2), bond(c, 'friend', 1), remember(c, 'friend', 'f-driveway-together')) },
      { id: 'compete', go: () => void (drive(c, 1), remember(c, 'friend', 'f-driveway-compete')) },
      { id: 'step', go: () => void (drive(c, 1), bond(c, 'friend', 2), morale(c, -3), remember(c, 'friend', 'f-driveway-step')) },
    ],
  },
  {
    id: 'f-summer',
    who: 'friend',
    when: (c) => c.st.f.summers === 1 && c.s.stage === 'HS',
    lines: () => ['1', '2'],
    answers: (c) => [
      { id: 'together', go: () => void (drive(c, 1), bond(c, 'friend', 1), remember(c, 'friend', 'f-summer-together')) },
      { id: 'alone', go: () => void (bond(c, 'friend', -1), rep(c, 3), remember(c, 'friend', 'f-summer-alone')) },
      {
        id: 'bring',
        go: () => {
          drive(c, 2);
          if (!roll(c, 'travel', STORY_CH.travelMakes)) return 'cut';
          c.st.f.travel = 1;
          bond(c, 'friend', 1);
          return 'made';
        },
      },
    ],
  },
  {
    id: 'f-grades',
    who: 'friend',
    when: (c) => c.st.f.summers === 2 && c.s.stage === 'HS',
    lines: () => ['1'],
    answers: (c) => [
      { id: 'study', go: () => void (drive(c, 1), bond(c, 'friend', 1), iq(c, 0.4)) },
      { id: 'coach', go: () => void (drive(c, 1), seed(c, 1)) },
      { id: 'out', go: () => void (drive(c, -1), bond(c, 'friend', -1)) },
    ],
  },
  {
    id: 'p-ride',
    who: 'parent',
    when: (c) => c.st.f.summers === 3 && c.s.stage === 'HS',
    lines: () => ['1', '2'],
    answers: (c) => [
      { id: 'thank', go: () => void (bond(c, 'parent', 1), remember(c, 'parent', 'p-ride-thank')) },
      { id: 'promise', go: () => void (bond(c, 'parent', 1), (c.st.f.promise = 1), remember(c, 'parent', 'p-ride-promise')) },
      { id: 'sleep', go: () => void morale(c, 2) },
    ],
  },
  {
    id: 'f-signing',
    who: 'friend',
    when: (c) => c.st.f.summers === 4 && c.s.stage === 'HS',
    lines: () => ['1', '2'],
    answers: (c) => [
      { id: 'with', go: () => void ((c.st.f.sameCollege = 1), drive(c, 1), bond(c, 'friend', 1)) },
      { id: 'play', go: () => void (drive(c, 2), remember(c, 'friend', 'f-signing-play')) },
      { id: 'quiet', go: () => void bond(c, 'friend', -1) },
    ],
  },
  // ---------------- the rival ----------------
  {
    id: 'r-meet',
    who: 'rival',
    at: 'start',
    when: (c) => !!c.st.rival,
    lines: () => ['1', '2'],
    answers: (c) => [
      { id: 'laugh', go: () => void morale(c, 1) },
      { id: 'answer', go: () => void (morale(c, 3), bond(c, 'rival', -1), rivalDrive(c), remember(c, 'rival', 'r-meet-answer')) },
      { id: 'hand', go: () => void (bond(c, 'rival', 1), remember(c, 'rival', 'r-meet-hand')) },
    ],
  },
  {
    id: 'f-minutes',
    who: 'friend',
    when: (c) => c.s.stage === 'NCAA' && c.s.ncaaYear >= 1,
    lines: (c) => [c.st.f.sameCollege ? 'bench' : 'small'],
    answers: (c) => [
      { id: 'stairs', go: () => void (drive(c, 2), bond(c, 'friend', 1), (c.s.player.wear = Math.min(100, (c.s.player.wear ?? 0) + 4))) },
      { id: 'see', go: () => void (seed(c, 2), drive(c, -1), remember(c, 'friend', 'f-minutes-see')) },
      { id: 'believe', go: () => void (drive(c, 1), bond(c, 'friend', 1)) },
    ],
  },
  {
    id: 'r-march',
    who: 'rival',
    when: (c) => c.s.stage === 'NCAA' && !!c.st.rival && did(c, 'r-meet'),
    lines: () => ['1', '2'],
    answers: (c) => [
      { id: 'tape', go: () => void (iq(c, 0.5), rivalDrive(c)) },
      { id: 'text', go: () => void bond(c, 'rival', 1) },
      { id: 'forget', go: () => void morale(c, 2) },
    ],
  },
  {
    id: 'f-fork',
    who: 'friend',
    at: 'start',
    when: (c) => !!c.st.friend.track,
    lines: (c) => {
      const t = c.st.friend.track ?? 'pro';
      return t !== 'bust' && said(c, 'f-driveway-together') ? [t, 'early'] : [t];
    },
    answers: (c) => {
      const f = c.st.friend;
      if (f.track === 'bust')
        return [
          { id: 'workout', go: () => (bond(c, 'friend', 1), roll(c, 'workout', STORY_CH.workoutSaves) ? ((f.track = 'pro'), 'saved') : 'thanks') },
          { id: 'coach', go: () => void (seed(c, 2), remember(c, 'friend', 'f-fork-coach')) },
          { id: 'chase', go: () => void drive(c, 1) },
        ];
      return [
        { id: 'proud', go: () => void bond(c, 'friend', 1) },
        { id: 'race', go: () => void ((c.st.f.friendly = 1), bond(c, 'friend', 1), remember(c, 'friend', 'f-fork-race')) },
        { id: 'train', go: () => void train(c) },
      ];
    },
  },
  // ---------------- the draft ----------------
  {
    id: 't-draft',
    who: 'rival',
    at: 'start',
    when: (c) => nba(c) && c.s.serviceYears === 0 && !!c.st.rival,
    lines: (c) => ['1', c.st.friend.lv === 'NBA' ? 'room' : 'home'],
    answers: (c) => [
      { id: 'friend', go: () => void bond(c, 'friend', 1) },
      { id: 'rival', go: () => void (rivalDrive(c), morale(c, 3), remember(c, 'rival', 't-draft-rival')) },
      { id: 'family', go: () => void bond(c, 'parent', 1) },
    ],
  },
  {
    id: 'p-house',
    who: 'parent',
    when: (c) => nba(c) && !!c.s.contract && c.s.serviceYears >= 1,
    lines: (c) => (said(c, 'p-ride-promise') ? ['1', 'promise'] : ['1']),
    answers: (c) => [
      { id: 'house', go: () => void ((c.s.player.bank -= STORY_CH.house), bond(c, 'parent', 2), remember(c, 'parent', 'p-house-house')) },
      { id: 'debts', go: () => void ((c.s.player.bank -= STORY_CH.debts), bond(c, 'parent', 1)) },
      { id: 'wait', go: () => void bond(c, 'parent', -1) },
    ],
  },
  // ---------------- the friend, grown up ----------------
  {
    id: 'f-fan',
    who: 'friend',
    when: (c) => nba(c) && c.st.friend.lv === 'OUT',
    lines: () => ['1'],
    answers: (c) => [
      { id: 'seats', go: () => void bond(c, 'friend', 1) },
      { id: 'bench', go: () => void (seed(c, 2), (c.st.friend.lv = 'COACH'), (c.st.friend.team = STORY.smallSchool), (c.st.friend.since = c.s.year)) },
      { id: 'film', go: () => void (iq(c, 0.5), seed(c, 1)) },
    ],
  },
  {
    id: 'f-coach',
    who: 'friend',
    when: (c) => nba(c) && c.st.friend.lv === 'COACH' && c.s.player.age >= STORY_CH.coachAge && !c.st.f.friendCoach,
    lines: () => ['1'],
    answers: (c) => [
      { id: 'hire', go: () => void ((c.st.f.friendCoach = 1), (c.st.friend.team = myTeam(c) ?? c.st.friend.team), bond(c, 'friend', 1), trust(c, 3)) },
      { id: 'own', go: () => void bond(c, 'friend', 1) },
    ],
  },
  {
    id: 'f-join',
    who: 'friend',
    when: (c) => nba(c) && c.st.friend.lv === 'NBA' && c.st.friend.track !== 'bust' && c.st.friend.team !== myTeam(c) && c.s.serviceYears >= 2 && !c.st.f.friendJoined,
    lines: () => ['1'],
    answers: (c) => [
      { id: 'yes', go: () => void ((c.st.f.friendJoined = 1), (c.st.friend.team = myTeam(c) ?? c.st.friend.team), bond(c, 'friend', 1)) },
      { id: 'money', go: () => void (bond(c, 'friend', 1), (c.st.f.friendJoined = -1)) },
      ...(c.st.rival?.lv === 'NBA' && c.st.rival.team !== myTeam(c) ? [{ id: 'rival', go: () => void ((c.st.f.friendJoined = -1), (c.st.f.withRival = 1), (c.st.friend.team = c.st.rival!.team), bond(c, 'friend', -1)) }] : []),
    ],
  },
  {
    id: 'f-mvp',
    who: 'friend',
    when: (c) => nba(c) && c.st.friend.track === 'star' && c.st.friend.lv === 'NBA' && c.st.friend.ovr >= userOvr(c.s) + STORY_CH.starAhead,
    lines: () => ['1', '2'],
    answers: (c) => [
      { id: 'proud', go: () => void (bond(c, 'friend', 1), morale(c, 2)) },
      { id: 'chase', go: () => void ((c.st.f.friendly = 1), morale(c, 4), remember(c, 'friend', 'f-mvp-chase')) },
      { id: 'summer', go: () => void (train(c), bond(c, 'friend', 1)) },
    ],
  },
  // ---------------- the three of them ----------------
  {
    id: 't-together',
    who: 'friend',
    when: (c) => nba(c) && c.st.f.withRival === 1,
    lines: () => ['1'],
    answers: (c) => [
      { id: 'fine', go: () => void bond(c, 'friend', 1) },
      { id: 'hurt', go: () => void (bond(c, 'friend', -2), morale(c, -3)) },
      { id: 'spy', go: () => void bond(c, 'friend', 1) },
    ],
  },
  {
    id: 't-hit',
    who: 'rival',
    when: (c) => nba(c) && c.st.friend.lv === 'NBA' && c.st.rival?.lv === 'NBA' && c.st.friend.team !== c.st.rival.team && c.s.serviceYears >= 2 && roll(c, 'hit', STORY_CH.hit),
    open: (c) => hurtFriend(c.s, c.st),
    lines: () => ['1', '2'],
    answers: (c) => [
      { id: 'confront', go: () => void (bond(c, 'rival', -2), (c.st.f.feud = 1), rep(c, 2), morale(c, 3), remember(c, 'rival', 't-hit-confront')) },
      { id: 'bedside', go: () => void bond(c, 'friend', 2) },
      { id: 'ask', go: () => void (c.st.f.asked = 1) },
    ],
  },
  {
    id: 't-apology',
    who: 'rival',
    when: (c) => did(c, 't-hit') && !!c.st.rival && c.st.rival.lv !== 'OUT',
    lines: () => ['1', '2'],
    answers: (c) => [
      { id: 'forgive', go: () => void ((c.st.f.feud = 0), bond(c, 'rival', 2)) },
      { id: 'friend', go: () => void (bond(c, 'rival', 1), bond(c, 'friend', 1), (c.st.f.feud = 0)) },
      { id: 'never', go: () => void ((c.st.f.feud = 1), rivalDrive(c)) },
    ],
  },
  // ---------------- the rival in the league ----------------
  {
    id: 'r-trade',
    who: 'rival',
    when: (c) => nba(c) && c.st.rival?.lv === 'NBA' && c.st.rival.team !== myTeam(c) && c.s.serviceYears >= 3 && !c.st.f.feud,
    lines: () => ['1'],
    answers: (c) => {
      const join = () => {
        c.st.rival!.team = myTeam(c) ?? c.st.rival!.team;
        c.st.f.rivalJoined = 1;
      };
      return [
        { id: 'ask', go: () => void (join(), bond(c, 'rival', 1)) },
        { id: 'against', go: () => void morale(c, 1) },
        { id: 'team', go: () => (trust(c, 2), roll(c, 'trade', 0.5) ? (join(), 'done') : 'dies') },
      ];
    },
  },
  {
    id: 'r-teammates',
    who: 'rival',
    when: (c) => nba(c) && c.st.f.rivalJoined === 1 && c.st.rival?.team === myTeam(c),
    lines: () => ['1'],
    answers: (c) => [
      { id: 'give', go: () => void bond(c, 'rival', 2) },
      { id: 'take', go: () => void (rep(c, 2), bond(c, 'rival', -1)) },
      { id: 'coach', go: () => void trust(c, 3) },
    ],
  },
  {
    id: 'r-allstar',
    who: 'rival',
    when: (c) => nba(c) && c.st.rival?.lv === 'NBA' && c.s.awards.some((a) => a.key === 'ALLSTAR' && a.year === c.s.year - 1),
    lines: () => ['1'],
    answers: (c) => [
      { id: 'same', go: () => void (bond(c, 'rival', 2), (c.st.f.feud = 0)) },
      { id: 'joke', go: () => void bond(c, 'rival', 1) },
      { id: 'quiet', go: () => undefined },
    ],
  },
  {
    id: 's-sibling',
    who: 'sibling',
    when: (c) => nba(c) && c.s.serviceYears >= 4,
    lines: () => ['1'],
    answers: (c) => [
      { id: 'train', go: () => void bond(c, 'sibling', 2) },
      { id: 'agent', go: () => void bond(c, 'sibling', 1) },
      { id: 'own', go: () => void bond(c, 'sibling', -1) },
    ],
  },
  {
    id: 'r-last',
    who: 'rival',
    when: (c) => nba(c) && !!c.st.rival?.last && c.st.rival.last === c.s.year + 1,
    lines: () => ['1'],
    answers: (c) => [
      { id: 'go', go: () => void bond(c, 'rival', 2) },
      { id: 'video', go: () => void bond(c, 'rival', 1) },
      { id: 'away', go: () => undefined },
    ],
  },
  {
    id: 'f-last',
    who: 'friend',
    when: (c) => c.s.stage !== 'RETIRED' && (c.s.retireRecommended || c.s.player.age >= STORY_CH.lastAge || c.s.flags.farewell === c.s.year + 1),
    lines: () => ['1'],
    answers: (c) => [
      { id: 'play', go: () => void (bond(c, 'friend', 1), remember(c, 'friend', 'f-last-play')) },
      { id: 'ball', go: () => void bond(c, 'friend', 1) },
      { id: 'rafters', go: () => void (c.st.f.rafterBall = 1) },
    ],
  },
];

const BY_ID = new Map(CHAPTERS.map((ch) => [ch.id, ch]));

/** A chapter's page: the English filled in (the log, the harness), and the keys with the names that
 * fill them (data: the screen reads these, in the player's language). */
function toDecision(c: Ctx, ch: Chapter): Omit<Decision, 'id'> {
  const v = storySlots(c.s, c.st);
  const lines = ch.lines(c).map((l) => `${ch.id}.l.${l}`);
  return {
    kind: 'story',
    title: storyText(`${ch.id}.title`),
    text: lines.map((k) => storyText(k, v)).join(' '),
    choices: ch.answers(c).map((a) => ({ id: a.id, label: storyText(`${ch.id}.a.${a.id}`, v) })),
    data: { ch: ch.id, who: ch.who, name: c.st.names[ch.who], lines, v },
  };
}

/** The first chapter that fits (`at`: a season's start, or the end of a summer), as a decision. */
export function pushStory(s: GameState, at: 'start' | 'summer'): void {
  const st = s.story;
  if (!st || s.stage === 'RETIRED') return;
  if (at === 'summer') st.f.summers = (st.f.summers ?? 0) + 1;
  const c = { s, st };
  for (const ch of CHAPTERS) {
    if (did(c, ch.id) || (ch.at ?? 'summer') !== at || s.pending.some((d) => d.kind === 'story' && d.data?.ch === ch.id)) continue;
    if (!ch.when(c)) continue;
    ch.open?.(c);
    pushDecision(s, toDecision(c, ch));
    return;
  }
}

/** The career's first page (flow.ts newGame), ahead of the first season's plan. */
export function openStory(s: GameState): void {
  const st = s.story;
  if (!st) return;
  pushDecision(s, toDecision({ s, st }, BY_ID.get('f-driveway')!));
  s.pending.unshift(s.pending.pop()!);
}

/** An answer: what it does, the chapter marked played, and the line shown after (its key kept in
 * `story.after` for the screen). */
export function resolveStory(s: GameState, d: Decision, id: string): string | null {
  const st = s.story;
  const ch = BY_ID.get(String(d.data?.ch ?? ''));
  if (!st || !ch) return null;
  const c = { s, st };
  const answers = ch.answers(c);
  const a = answers.find((x) => x.id === id) ?? answers[0];
  const k = `${ch.id}.r.${a.go(c) || a.id}`;
  st.done.push(ch.id);
  const v = storySlots(s, st);
  st.after = { k, v };
  const out = storyText(k, v);
  logDecision(s, 'story', `${storyText(`${ch.id}.title`)}: ${storyText(`${ch.id}.a.${a.id}`, v)} ${out}`);
  return out;
}

/** The chapters in play order (the dev deck, the tests), with their titles in English. */
export const STORY_CHAPTERS = CHAPTERS.map((ch) => ({ id: ch.id, who: ch.who, title: storyText(`${ch.id}.title`) }));
