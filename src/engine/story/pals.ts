// Story mode's friend and rival (round 38, owner: "the friend enters up til the nba, and how good he
// is depends on the user's choice ... the user meets the rival the first time at college, and he grows
// with the user. however, he always seems to be one small step ahead").
// - The friend grows up beside him. Until the scouts decide (the summer he turns 22), he grows like
//   any prospect, faster for every bit of drive the hero's choices put into him. Then his road is set:
//   out of the game early (and his biggest fan, or a coach), a pro, or a star who goes past him.
// - The rival appears the first season the hero plays college (or at 19, wherever he plays) and is
//   always a small step ahead: his OVR is the hero's plus 1 to 3, drawn fresh each season.
// - Each season both go into `mp.friends` as season lines (career/friends.ts reads them), so they play
//   in the hero's league: box scores, award races, All-Star votes, a duo when they share a team, rival
//   nights and playoff series against the rival.
// Their rolls come from streams of their own (story/cast.ts storyRng), so the career's own stream, and
// so its balance, is the same as a Regular guy career's apart from what the chapters do.

import { STORY } from '../balance';
import { chance, clamp, normal, range } from '../rng';
import type { FriendLine, GameState, Pos, StoryPal, StoryState } from '../types';
import { adjust, note, teamById, userOvr } from '../career/common';
import { storyRng } from './cast';

export const FRIEND_ID = 'story-friend';
export const RIVAL_ID = 'story-rival';

// the friend and the rival live in the States (owner: "all three main characters should be american,
// or living in america at least"): never placed in Toronto
const NBA_NAMES = (s: GameState): string[] => (s.nba?.teams ?? []).filter((t) => t.abbr !== 'TOR').map((t) => t.name);

/** The hero's NBA team this season, if he plays for one. */
function myNbaTeam(s: GameState): string | null {
  if (s.stage !== 'NBA') return null;
  return teamById(s.nba, s.teamId)?.name ?? null;
}

/** A team in the hero's league other than his (and other than `not`). */
function otherTeam(s: GameState, tag: string, not: (string | null)[] = []): string {
  const names = NBA_NAMES(s).filter((n) => !not.includes(n));
  if (!names.length) return 'a team out west';
  const r = storyRng(s, tag);
  return names[Math.floor(range(r, 0, names.length))];
}

/** How a season's line reads from his OVR: points, rebounds and assists a game. */
function lineFrom(p: StoryPal, gp: number): { pts: number; reb: number; ast: number; gp: number } {
  const big = p.pos === 'PF' || p.pos === 'C';
  const guard = p.pos === 'PG' || p.pos === 'SG';
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const pts = clamp(1.05 * (p.ovr - 62), 2.5, 32);
  const reb = clamp(big ? 0.42 * (p.ovr - 52) : guard ? 0.16 * (p.ovr - 48) : 0.26 * (p.ovr - 50), 1, 14);
  const ast = clamp(guard ? 0.3 * (p.ovr - 54) : big ? 0.1 * (p.ovr - 50) : 0.18 * (p.ovr - 52), 0.6, 11);
  return { pts: r1(pts), reb: r1(reb), ast: r1(ast), gp };
}

/** A year of the friend's growth at his age, before his road is set (the drive he was given makes it faster). */
function youthGrowth(age: number): number {
  return age <= 17 ? STORY.youth[0] : age <= 21 ? STORY.youth[1] : age <= 25 ? STORY.youth[2] : age <= 28 ? STORY.youth[3] : age <= 31 ? STORY.youth[4] : STORY.youth[5];
}

/** The summer the scouts decide: his road, from the drive the hero's choices gave him. */
export function setTrack(s: GameState, st: StoryState): void {
  const f = st.friend;
  if (f.track) return;
  const r = storyRng(s, 'track');
  const d = f.drive;
  const star = clamp(STORY.star.base + STORY.star.per * d, STORY.star.min, STORY.star.max);
  const bust = clamp(STORY.bust.base - STORY.bust.per * d, STORY.bust.min, STORY.bust.max);
  const u = range(r, 0, 1);
  f.track = u < star ? 'star' : u < star + bust ? 'bust' : 'pro';
}

/** Moves the friend on by a year: his growth, then where he plays. */
function friendYear(s: GameState, st: StoryState): void {
  const f = st.friend;
  const age = s.player.age;
  const r = storyRng(s, 'friend');
  if (f.hurt) {
    f.hurt -= 1;
    return;
  }
  if (f.lv === 'OUT' || f.lv === 'COACH') return;
  const base = youthGrowth(age);
  let g: number;
  if (!f.track) g = base * (STORY.driveGrowth[0] + STORY.driveGrowth[1] * f.drive) + normal(r, 0, 1.1);
  else if (f.track === 'star') g = f.ovr < STORY.starPeak ? Math.max(base * 1.7, 0) + 1.4 + normal(r, 0, 0.8) : base > 0 ? 0.2 : base;
  else if (f.track === 'pro') g = f.ovr < STORY.proPeak ? base + normal(r, 0, 0.9) : base > 0 ? 0 : base;
  else g = f.ovr < STORY.bustPeak ? base * 0.6 + normal(r, 0, 0.8) : base > 0 ? 0 : base;
  f.ovr = clamp(f.ovr + g, 30, 97);
}

/** Where the friend plays this season, from his age and his road. */
function friendPlace(s: GameState, st: StoryState): void {
  const f = st.friend;
  const age = s.player.age;
  if (f.lv === 'OUT' || f.lv === 'COACH') {
    // the coaching road: an NBA bench once the hero's team asks for him (chapters set friendCoach)
    if (f.lv === 'COACH' && st.f.friendCoach && myNbaTeam(s)) f.team = myNbaTeam(s)!;
    return;
  }
  if (age <= 17) {
    f.lv = 'HS';
    f.team = s.player.highSchool;
    return;
  }
  if (age <= 21) {
    f.lv = 'NCAA';
    f.team = st.f.sameCollege && s.stage === 'NCAA' ? (teamById(s.league, s.teamId)?.name ?? f.team) : f.team && f.team !== s.player.highSchool ? f.team : STORY.smallSchool;
    return;
  }
  setTrack(s, st);
  if (f.track === 'bust') {
    // a season at the end of an NBA bench, one in the G League, then out of the league (or onto a
    // coaching bench, if he leaned that way)
    const years = st.f.bustYears ?? 0;
    st.f.bustYears = years + 1;
    if (years === 0) {
      f.lv = 'NBA';
      f.team = otherTeam(s, 'friend-team', [myNbaTeam(s), st.rival?.team ?? null]);
    } else if (years === 1) {
      f.lv = 'GL';
      f.team = 'a G League team';
    } else {
      f.lv = (f.coach ?? 0) >= STORY.coachSeeds ? 'COACH' : 'OUT';
      f.team = f.lv === 'COACH' ? STORY.smallSchool : '';
      f.since = s.year;
      note(s, f.lv === 'COACH' ? `${f.name} hung up his sneakers and took a job on a college bench.` : `${f.name} is out of the game. He still watches every one of yours.`);
    }
    return;
  }
  if (f.lv !== 'NBA' || !NBA_NAMES(s).includes(f.team)) {
    f.lv = 'NBA';
    f.team = otherTeam(s, 'friend-team', [myNbaTeam(s), st.rival?.team ?? null]);
  }
}

/** Moves the rival on by a year: a small step ahead of the hero, wherever he plays. */
function rivalYear(s: GameState, st: StoryState): void {
  const me = userOvr(s);
  const age = s.player.age;
  if (!st.rival) {
    // met in college, or at 19 wherever he plays
    if (s.stage !== 'NCAA' && age < 19) return;
    st.rival = { name: st.names.rival, pos: s.player.pos, ovr: me + 2, lv: 'NCAA', team: '', drive: 0 };
  }
  const r = st.rival;
  if (r.lv === 'OUT') return;
  if (r.last && s.year > r.last) {
    r.lv = 'OUT';
    note(s, `${r.name} has retired. For once you are the one still going.`);
    return;
  }
  const lead = range(storyRng(s, 'rival-lead'), STORY.rivalLead[0], STORY.rivalLead[1]);
  r.ovr = clamp(me + lead, 30, 99);
  if (r.hurt) r.hurt -= 1;
  if (s.stage === 'NCAA' || (age <= 21 && s.stage === 'HS')) {
    r.lv = 'NCAA';
    if (!r.team) {
      const teams = (s.league?.teams ?? []).map((t) => t.name).filter((n) => n !== teamById(s.league, s.teamId)?.name);
      r.team = teams.length ? teams[Math.floor(range(storyRng(s, 'rival-school'), 0, teams.length))] : 'State';
    }
    return;
  }
  // a pro the season the hero is (one step ahead: he is already in the NBA when the hero is anywhere)
  if (r.lv !== 'NBA' || !NBA_NAMES(s).includes(r.team)) {
    r.lv = 'NBA';
    r.team = otherTeam(s, 'rival-team', [myNbaTeam(s), st.friend.lv === 'NBA' ? st.friend.team : null]);
  }
  // he retires a season before the hero is likely to
  if (!r.last && age >= STORY.rivalRetireAge) r.last = s.year + 1;
}

function lineOf(id: string, who: string, p: StoryPal, s: GameState, prev?: FriendLine): FriendLine {
  const seasons = (prev?.seasons ?? []).filter((x) => x.year !== s.year);
  const playing = p.lv !== 'OUT' && p.lv !== 'COACH';
  const l = lineFrom(p, playing && !p.hurt ? STORY.games : 0);
  seasons.push({ year: s.year, lv: p.lv, team: p.team, ovr: Math.round(p.ovr), ...l });
  return { id, name: who, pn: p.name, pos: p.pos, seasons };
}

/** At the start of a season: the friend and the rival move on a year, and their lines go where the
 * league reads them. The friend on the hero's bench steadies the coach's trust. */
export function storySeason(s: GameState): void {
  const st = s.story;
  if (!st || st.f.year === s.year) return;
  st.f.year = s.year;
  friendYear(s, st);
  friendPlace(s, st);
  rivalYear(s, st);
  s.mp ??= {};
  const prev = new Map((s.mp.friends ?? []).map((x) => [x.id, x]));
  s.mp.friends = [lineOf(FRIEND_ID, 'your friend', st.friend, s, prev.get(FRIEND_ID))];
  if (st.rival) {
    s.mp.friends.push(lineOf(RIVAL_ID, 'your rival', st.rival, s, prev.get(RIVAL_ID)));
    // rival nights and playoff series read the rival from here (career/friends.ts)
    s.mp.rival = st.rival.lv === 'NBA' ? RIVAL_ID : undefined;
  }
  if (st.f.friendCoach && st.friend.lv === 'COACH' && myNbaTeam(s) && st.friend.team === myNbaTeam(s)) {
    s.player.trust = adjust(s.player.trust, STORY.coachTrust);
    note(s, `${st.friend.name} is on the bench as an assistant. The staff listens to him, and he speaks for you.`);
  }
}

/** The friend's knee (the injury road): a season or two out, and a step down his road. */
export function hurtFriend(s: GameState, st: StoryState): void {
  const f = st.friend;
  f.hurt = chance(storyRng(s, 'hurt'), STORY.hurt.twoSeasons) ? 2 : 1;
  f.ovr = clamp(f.ovr - STORY.hurt.ovr, 30, 97);
  f.track = f.track === 'star' ? 'pro' : 'bust';
  if (f.track === 'bust') st.f.bustYears = Math.max(st.f.bustYears ?? 0, 2);
}

/** Who is who, for the chapters' choice of words. */
export const isGuard = (pos: Pos): boolean => pos === 'PG' || pos === 'SG';
