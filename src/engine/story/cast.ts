// Story mode's people (round 38). The player names his friend, his family (a parent and a younger
// sibling) and his rival, or skips and the game names them (owner: "the player can skip the naming
// and all are generated"); the mentor, the agent and the reporter are always the game's. A one-word
// name for the parent or the sibling takes the hero's surname (they are his family).
// storyRng gives each roll a stream of its own (FNV-1a over the seed and the parts, as the friends
// system does), so story mode never shifts the career's own random stream.

import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { STORY } from '../balance';
import { clamp, makeRng, range, type Rng } from '../rng';
import type { CreateInput } from '../player/create';
import type { GameState, Pos, StoryRole, StoryState } from '../types';
import { userOvr } from '../career/common';

/** Story mode's written hero (owner: "one written hero"): a shooting guard from Dayton, Ohio, number
 * 3 at Fairview High, a sharpshooter working on his shot and his handle, on Regular guy's road. The
 * naming step may rename him; the rest is his. */
export const STORY_HERO: CreateInput = {
  name: 'Eli Carter',
  number: 3,
  pos: 'SG',
  archetype: 0,
  focus: ['SHT', 'PLY'],
  hand: 'R',
  mode: 'standard',
  hometown: 'Dayton, OH',
  highSchool: 'Fairview High',
  look: { skin: 4, hair: 'k', style: 'short', face: 'none' },
};

/** A stream of its own for one story roll (the career's seed, the year and a tag). */
export function storyRng(s: GameState, ...parts: (string | number)[]): Rng {
  let h = 2166136261;
  const key = [s.seed, s.year, ...parts].join('|');
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return makeRng(h >>> 0);
}

const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(range(r, 0, xs.length))];

const surnameOf = (name: string): string => name.trim().split(/\s+/).slice(-1)[0] ?? '';

/** A generated full name, never the hero's surname unless asked for. */
function makeName(s: GameState, tag: string, surname?: string): string {
  const r = storyRng(s, 'name', tag);
  const own = surnameOf(s.player.name);
  let last = surname ?? pick(r, LAST_NAMES);
  for (let i = 0; !surname && last === own && i < 6; i++) last = pick(r, LAST_NAMES);
  return `${pick(r, FIRST_NAMES)} ${last}`;
}

/** A name the player gave, with the hero's surname for family given one word. */
function given(s: GameState, raw: string | undefined, family: boolean): string | null {
  const t = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return null;
  return family && !t.includes(' ') ? `${t} ${surnameOf(s.player.name)}` : t;
}

/** The friend plays a different spot from the hero: a big beside a guard, a guard beside a big. */
function friendPos(pos: Pos): Pos {
  return pos === 'PG' || pos === 'SG' ? 'PF' : pos === 'SF' ? 'PG' : 'SG';
}

/** A story career's people and its first state, as it opens (flow.ts newGame). */
export function startStory(s: GameState, input: CreateInput): void {
  s.flags.story = 1;
  const ask = input.story ?? {};
  const named: StoryRole[] = [];
  const name = (role: StoryRole, raw: string | undefined, family: boolean, fallback: () => string): string => {
    const g = given(s, raw, family);
    if (g) named.push(role);
    return g ?? fallback();
  };
  const own = surnameOf(s.player.name);
  const names: Record<StoryRole, string> = {
    friend: name('friend', ask.friend, false, () => makeName(s, 'friend')),
    parent: name('parent', ask.parent, true, () => makeName(s, 'parent', own)),
    sibling: name('sibling', ask.sibling, true, () => makeName(s, 'sibling', own)),
    rival: name('rival', ask.rival, false, () => makeName(s, 'rival')),
    mentor: makeName(s, 'mentor'),
    agent: makeName(s, 'agent'),
    reporter: makeName(s, 'reporter'),
  };
  const st: StoryState = {
    names,
    named,
    bond: { friend: 1, parent: 1, sibling: 1 },
    done: [],
    mem: [],
    friend: { name: names.friend, pos: friendPos(s.player.pos), ovr: clamp(userOvr(s), STORY.friendStart[0], STORY.friendStart[1]) + range(storyRng(s, 'friend-start'), -3, 1), lv: 'HS', team: s.player.highSchool, drive: 0 },
    rival: null,
    f: {},
  };
  s.story = st;
}

/** The first name, the way the people who know him say it. */
export const first = (name: string): string => name.trim().split(/\s+/)[0] ?? name;
