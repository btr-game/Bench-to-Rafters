// Multiplayer (round 35, owner: "the theme here is multiplayer"; the owner's picks: "Draft class with
// friends, Challenge a friend", found by a code or link and by quick match; "i want the multiplayer
// under regular guy"). Both play asynchronously: nobody has to be on at the same time.
//
// A challenge is a finished Regular guy career's start (its seed and what was picked on the start
// page) with its card: a friend plays the same prospect their own way and their card goes up beside
// it. A draft class is up to eight Regular guy careers on one seed, each season posting a short line
// to the class, and each finished career its card.
//
// Where it lives: the game's own database (onlineMultiplayer.ts, supabase/migrations/0004) in the
// online build (the website and itch.io); a stand-in on this device in the dev deck, with house
// players, that never touches the real one; nowhere else (the claude.ai page cannot reach the
// database, so the page points to the website).

import type { CareerRecord } from '../engine/career/record';
import type { CreateInput } from '../engine/player/create';
import type { AttrKey, Attrs, FriendLine, GameState, Pos, SeasonRecord } from '../engine/types';
import { ATTRS, POSITIONS } from '../engine/balance';
import { ARCHETYPES } from '../engine/player/archetypes';
import { ORIGINS } from '../content/origins';
import { LOOK_FACES, LOOK_HAIRS, LOOK_STYLES, type ChosenLook } from '../content/looks';
import { isDev } from '../dev/mode';
import { scoreOf } from './community';
import { logCards } from './careerLog';

/** The start of a career anyone can play again: the same seed and the same start page. */
export interface Prospect {
  seed: number;
  input: CreateInput;
}
export interface Answer {
  id: string;
  name: string;
  rec: CareerRecord;
  at: string;
  mine: boolean;
}
export interface Challenge {
  code: string;
  name: string;
  prospect: Prospect;
  rec: CareerRecord;
  at: string;
  mine: boolean;
  answers: Answer[];
}
export interface OpenChallenge {
  code: string;
  name: string;
  rec: CareerRecord;
  at: string;
  answers: number;
}
/** One season of a class member, a short line (the database takes 1.5 KB at most). */
export interface ClassSeason {
  year: number;
  age: number;
  lv: string; // LevelKey
  team: string;
  color: string;
  ovr: number;
  gp: number;
  pts: number;
  reb: number;
  ast: number;
  w: number;
  l: number;
  result: string;
  aw: string[];
  pn: string; // his name, so the class shows the player as well as the friend
  pos?: string; // round 35: his position (a friend's duo or rival needs it)
  sal?: number; // round 35: his salary that season, $M (joining a friend's team must fit it)
  /** Sent with the line, never kept with it: the career it comes from (a seat holds one career). */
  run?: string;
}
/** Round 35: the four reactions on a classmate's season (pixel icons from art/icons.ts). */
export type Emote = 'fire' | 'crown' | 'heart' | 'snow';
export const EMOTES: { k: Emote; icon: string; label: string }[] = [
  { k: 'fire', icon: 'flame', label: 'On fire' },
  { k: 'crown', icon: 'crown', label: 'Royalty' },
  { k: 'heart', icon: 'heart', label: 'Love it' },
  { k: 'snow', icon: 'snow', label: 'Ice cold' },
];
/** A season's reactions of one kind: how many, and whether one of them is his. */
export interface React {
  y: number;
  e: Emote;
  n: number;
  mine: boolean;
}
/** Round 35: a friend's best daily challenge run of a day. */
export interface DailyRow {
  name: string;
  points: number;
  legacy: number;
  peak: number;
  mine: boolean;
}
export interface ClassMember {
  id: string;
  name: string;
  seasons: ClassSeason[];
  rec: CareerRecord | null;
  reacts?: React[]; // round 35
  at: string;
  mine: boolean;
  rival?: string | null; // round 35: the member he picked as his rival (a short id)
}
/** A line in a challenge's or a class's chat. */
export interface ChatLine {
  id: number;
  name: string;
  body: string;
  at: string;
  mine: boolean;
  news?: boolean; // round 35: a line of class news, in the game's voice
}
export type Room = 'challenge' | 'class';
export const CHAT_MAX = 200;
export interface DraftClass {
  code: string;
  name: string;
  seed: number;
  at: string;
  mine: boolean;
  members: ClassMember[];
}
export interface ClassSummary {
  code: string;
  name: string;
  at: string;
  n: number;
}
export type MpFail = 'missing' | 'full' | 'denied' | 'busy' | 'taken' | 'error';
export interface Seat {
  code: string;
  seed: number;
}

export interface Multiplayer {
  kind: 'online' | 'local';
  makeChallenge(name: string, prospect: Prospect, rec: CareerRecord): Promise<string | MpFail>;
  challenge(code: string): Promise<Challenge | null | 'error'>;
  openChallenges(): Promise<OpenChallenge[] | 'error'>;
  myChallenges(): Promise<Challenge[] | 'error'>;
  answer(code: string, name: string, rec: CareerRecord): Promise<'ok' | MpFail>;
  makeClass(name: string, player: string): Promise<Seat | MpFail>;
  joinClass(code: string, player: string): Promise<Seat | MpFail>;
  draftClass(code: string): Promise<DraftClass | null | 'error'>;
  openClasses(): Promise<ClassSummary[] | 'error'>;
  myClasses(): Promise<ClassSummary[] | 'error'>;
  postSeason(code: string, s: ClassSeason): Promise<'ok' | MpFail>;
  postCareer(code: string, rec: CareerRecord, run?: string): Promise<'ok' | MpFail>;
  /** Round 35: pick a classmate as a rival (null takes it back); two who pick each other are rivals. */
  setRival(code: string, to: string | null): Promise<'ok' | MpFail>;
  /** Round 35: he starts a friend's challenge (so he may talk in its chat). */
  take(code: string, name: string): Promise<'ok' | MpFail>;
  chat(room: Room, code: string): Promise<ChatLine[] | null | 'error'>;
  say(room: Room, code: string, name: string, body: string): Promise<'ok' | MpFail>;
  /** Round 35: a reaction on a classmate's season (null takes it back). */
  react(code: string, to: string, year: number, emote: Emote | null): Promise<'ok' | MpFail>;
  /** Round 35: his best daily challenge run of a day, for his friends' board. */
  dailyPost(day: string, name: string, points: number, legacy: number, peak: number): Promise<'ok' | MpFail>;
  /** A day's daily challenge board: his friends (classmates, challenge partners) and him. */
  dailyFriends(day: string): Promise<DailyRow[] | 'error'>;
}

export const CLASS_MAX = 12; // round 35 (owner: "the 12 of you (max)")
/** Codes: six letters and digits, none that read alike (no I, O, 0 or 1). */
export const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
export const cleanCode = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

export const MP_FAIL: Record<MpFail, string> = {
  missing: 'No game goes by that code. Check it with your friend.',
  full: 'That draft class is full (twelve players).',
  taken: 'Your seat in that class already holds another career: a seat plays one career.',
  denied: 'That could not be sent: only a Regular guy career counts.',
  busy: 'Too many in a row: try again in a little while.',
  error: 'The game could not reach the server. Try again in a little while.',
};

/** A prospect from another player, kept to what the start page can pick (Regular guy, each pick in
 * range, a rerolled card within reach of its archetype's), or null. Anything else would let a made-up
 * player onto the leaderboards through a challenge. */
export function cleanProspect(p: unknown): Prospect | null {
  const x = p as { seed?: unknown; input?: Record<string, unknown> } | null;
  const i = x?.input;
  if (!x || typeof x.seed !== 'number' || !Number.isInteger(x.seed) || x.seed < 0 || x.seed > 2 ** 31 || !i || typeof i !== 'object') return null;
  const pos = i.pos as Pos;
  if (!POSITIONS.includes(pos)) return null;
  const archetype = Number(i.archetype);
  const arch = ARCHETYPES[pos][archetype];
  if (!Number.isInteger(archetype) || !arch) return null;
  const focus = Array.isArray(i.focus) ? (i.focus as AttrKey[]) : [];
  if (focus.length !== 2 || focus[0] === focus[1] || !focus.every((k) => ATTRS.includes(k))) return null;
  const name = typeof i.name === 'string' ? i.name.trim().slice(0, 30) : '';
  const number = Number(i.number);
  if (!name || !Number.isInteger(number) || number < 0 || number > 99) return null;
  const input: CreateInput = { name, number, pos, archetype, focus: [focus[0], focus[1]], mode: 'standard', hand: i.hand === 'L' ? 'L' : 'R' };
  // a draft-class career's start: the friend plays the same draft night
  if (i.start === 'draft') input.start = 'draft';
  const a = i.attrs as Attrs | undefined;
  if (a && typeof a === 'object') {
    const ok = ATTRS.every((k) => Number.isInteger(a[k]) && Math.abs(a[k] - arch.attrs[k]) <= 6) && ATTRS.reduce((t, k) => t + a[k], 0) === 320;
    if (ok) input.attrs = Object.fromEntries(ATTRS.map((k) => [k, a[k]])) as Attrs;
  }
  if (typeof i.country === 'string' && ORIGINS.some((o) => o.country === i.country)) input.country = i.country;
  const l = i.look as ChosenLook | undefined;
  if (l && Number.isInteger(l.skin) && l.skin >= 0 && l.skin <= 6 && LOOK_HAIRS.includes(l.hair) && LOOK_STYLES.includes(l.style) && LOOK_FACES.includes(l.face)) input.look = { skin: l.skin, hair: l.hair, style: l.style, face: l.face };
  return { seed: x.seed, input };
}

// ---------- the name friends see ----------

const HANDLE = 'btr-mp-name';
export const HANDLE_MAX = 20;
export function handle(): string {
  try {
    return localStorage.getItem(HANDLE) ?? '';
  } catch {
    return '';
  }
}
export function setHandle(name: string): void {
  try {
    localStorage.setItem(HANDLE, name.trim().slice(0, HANDLE_MAX));
  } catch {
    // storage blocked: asked again next visit
  }
}

// ---------- a link to a challenge or a class ----------

/** `#challenge-CODE` or `#class-CODE`, the links a player shares. Kept on this device until the
 * multiplayer page can open (after the tutorial). */
export type MpLink = { kind: 'challenge' | 'class'; code: string };
const LINK = 'btr-mp-link';
export function readLink(): MpLink | null {
  try {
    const m = /^#(challenge|class)-([A-Za-z0-9]{6})$/.exec(location.hash);
    if (m) {
      const l: MpLink = { kind: m[1] as MpLink['kind'], code: cleanCode(m[2]) };
      localStorage.setItem(LINK, JSON.stringify(l));
      return l;
    }
    const kept = localStorage.getItem(LINK);
    return kept ? (JSON.parse(kept) as MpLink) : null;
  } catch {
    return null;
  }
}
export function dropLink(): void {
  try {
    localStorage.removeItem(LINK);
    if (/^#(challenge|class)-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  } catch {
    // nothing kept
  }
}
export const SITE = 'https://bench-to-rafters.netlify.app/';
export const linkFor = (l: MpLink): string => `${SITE}#${l.kind}-${l.code}`;

// ---------- what a career sends ----------

/** A season as the class sees it. */
export function seasonLine(h: SeasonRecord, playerName: string, pos?: string): ClassSeason {
  const gp = h.line.gp || 0;
  const per = (x: number) => (gp ? Math.round((x / gp) * 10) / 10 : 0);
  return {
    year: h.year,
    age: h.age,
    lv: h.level,
    team: h.teamName.slice(0, 40),
    color: h.teamColor,
    ovr: Math.round(h.ovrEnd),
    gp,
    pts: per(h.line.pts),
    reb: per(h.line.reb),
    ast: per(h.line.ast),
    w: h.w,
    l: h.l,
    result: h.result.slice(0, 60),
    aw: h.awards.slice(0, 6).map((a) => a.slice(0, 40)),
    pn: playerName.slice(0, 40),
    ...(pos ? { pos } : {}),
    sal: Math.round((h.salary || 0) * 10) / 10,
  };
}

// ---------- friends in a career (round 35) ----------

/** The classmates as a career sees them (engine/career/friends.ts): every member but him. */
export function friendsOf(k: DraftClass): FriendLine[] {
  return k.members
    .filter((m) => !m.mine)
    .map((m) => {
      const last = m.seasons[m.seasons.length - 1];
      return { id: m.id, name: m.name, pn: m.rec?.name ?? last?.pn ?? m.name, pos: m.rec?.pos ?? last?.pos ?? 'SF', seasons: m.seasons.map((x) => ({ year: x.year, lv: x.lv, team: x.team, ovr: x.ovr, pts: x.pts, reb: x.reb, ast: x.ast, gp: x.gp, sal: x.sal ?? 0, aw: x.aw })) };
    });
}
/** His rival in the class: the member he picked who picked him back. */
export function mutualRival(k: DraftClass): ClassMember | null {
  const me = k.members.find((m) => m.mine);
  if (!me?.rival) return null;
  return k.members.find((m) => !m.mine && m.id === me.rival && m.rival === me.id) ?? null;
}
/** Members who picked him and wait for his answer. */
export const rivalRequests = (k: DraftClass): ClassMember[] => {
  const me = k.members.find((m) => m.mine);
  return me ? k.members.filter((m) => !m.mine && m.rival === me.id && me.rival !== m.id) : [];
};

/** A career a challenge can be made from: Regular guy, its start kept, not a level or a child's. */
const challengeable = (g: GameState): boolean => g.mode === 'standard' && !!g.start && !g.flags.level && !g.flags.daily && !g.flags.gen2;
/** Round 35: and played at full pace, as the friend who answers it must play it. */
export const canChallenge = (g: GameState): boolean => challengeable(g) && !g.flags.quick;
/** A Regular guy career that would be a challenge but for Fast break or Sim. */
export const ranQuick = (g: GameState): boolean => challengeable(g) && !!g.flags.quick;

/** Who won a challenge: the career index, as on the leaderboards. */
export const mpScore = scoreOf;

// ---------- the class table ----------

export const LEVEL_SHORT: Record<string, string> = { HSJV: 'HS JV', HSV: 'HS', NCAA: 'College', GL: 'G League', EU: 'Europe', INT: 'Overseas', NBA: 'NBA' };
const has = (s: ClassSeason, re: RegExp) => s.aw.some((a) => re.test(a));
const isMvp = (s: ClassSeason) => has(s, /^MVP$/);
const isAllStar = (s: ClassSeason) => has(s, /^All-Star$/);
const isChamp = (s: ClassSeason) => has(s, /Champion$/) && s.lv === 'NBA';

export interface Standing {
  m: ClassMember;
  peak: number;
  nba: number;
  allStars: number;
  mvps: number;
  titles: number;
  score: number;
}
/** The class's table: a finished career by its card, one still going by its best season so far and
 * its honours, so a member who is still in college can still be ranked. */
export function standings(c: DraftClass): Standing[] {
  return c.members
    .map((m) => {
      const s = m.seasons;
      const peak = m.rec ? Math.round(m.rec.peak) : s.reduce((a, x) => Math.max(a, x.ovr), 0);
      const nba = m.rec ? m.rec.nbaSeasons : s.filter((x) => x.lv === 'NBA').length;
      const allStars = m.rec ? m.rec.allStars : s.filter(isAllStar).length;
      const mvps = m.rec ? m.rec.mvps : s.filter(isMvp).length;
      const titles = m.rec ? m.rec.titles : s.filter(isChamp).length;
      return { m, peak, nba, allStars, mvps, titles, score: peak * 10 + allStars * 6 + mvps * 25 + titles * 15 + nba };
    })
    .sort((a, b) => b.score - a.score || a.m.at.localeCompare(b.m.at));
}
/** The class by year: each year, every member's season, and the best of them (by rating, then points). */
export function classYears(c: DraftClass): { year: number; rows: { m: ClassMember; s: ClassSeason | null }[]; best: string | null }[] {
  const years = [...new Set(c.members.flatMap((m) => m.seasons.map((s) => s.year)))].sort((a, b) => a - b);
  return years.map((year) => {
    const rows = c.members.map((m) => ({ m, s: m.seasons.find((s) => s.year === year) ?? null }));
    const played = rows.filter((r): r is { m: ClassMember; s: ClassSeason } => !!r.s && r.s.gp > 0);
    const top = [...played].sort((a, b) => b.s.ovr - a.s.ovr || b.s.pts - a.s.pts)[0];
    return { year, rows, best: played.length > 1 && top ? top.m.id : null };
  });
}

/** Round 35: the class news line a season brings (the server writes the same one, in
 * supabase/migrations/0006_multiplayer_class.sql): his NBA team, then the honours that matter. */
export function classNews(before: ClassSeason[], line: ClassSeason, friend: string): string | null {
  const pr = before.find((x) => x.year === line.year - 1);
  const bits: string[] = [];
  if (line.lv === 'NBA' && (!pr || pr.lv !== 'NBA')) bits.push(`${before.some((x) => x.lv === 'NBA') ? 'back in the NBA with the' : 'starts his NBA career with the'} ${line.team}`);
  else if (line.lv === 'NBA' && pr?.lv === 'NBA' && pr.team !== line.team) bits.push(`moves to the ${line.team}`);
  else if (line.lv !== 'NBA' && pr?.lv === 'NBA') bits.push(`leaves the NBA for ${line.team}`);
  if (line.aw.includes('Rookie of the Year')) bits.push('Rookie of the Year');
  if (line.aw.includes('All-Star') && !before.some((x) => x.aw.includes('All-Star'))) bits.push('an All-Star for the first time');
  if (line.aw.includes('MVP')) bits.push('the league MVP');
  if (line.lv === 'NBA' && line.aw.some((a) => a.endsWith('Champion'))) bits.push(`NBA champion with the ${line.team}`);
  return bits.length ? `${line.pn || friend} (${friend}), ${line.year}: ${bits.join(' · ')}.`.slice(0, CHAT_MAX) : null;
}

// ---------- reunion night (round 35) ----------
// Owner: "instead of having that throughout, how about combining them all in reunion night,
// revealing each of them one at a time (class MVP, most career points, most assists, wealth, ...,
// from least important to most, so class MVP should be last)".

/** A class member who has posted nothing for this long counts as he stands, so one friend who
 * stops playing does not keep the reunion from the rest. */
export const REUNION_WAIT_DAYS = 14;

/** Whether the class can hold its reunion: every member who started has finished (or has been
 * quiet for two weeks), and at least two played. */
export function reunionReady(k: DraftClass, now = Date.now()): { ready: boolean; done: number; total: number } {
  const started = k.members.filter((m) => m.seasons.length > 0 || m.rec);
  const quiet = (m: ClassMember) => now - Date.parse(m.at) > REUNION_WAIT_DAYS * 86400000;
  const done = started.filter((m) => m.rec || quiet(m)).length;
  return { ready: started.length >= 2 && done === started.length, done, total: started.length };
}

export interface ReunionAward {
  key: string;
  title: string;
  icon: string;
  what: string; // what it measures, in a few words
  rows: { m: ClassMember; value: number; text: string }[]; // best first
}
const nbaOnly = (m: ClassMember) => m.seasons.filter((s) => s.lv === 'NBA' && s.gp > 0);
const total = (m: ClassMember, k: 'pts' | 'reb' | 'ast') => nbaOnly(m).reduce((a, s) => a + s[k] * s.gp, 0);
const n0 = (x: number) => Math.round(x).toLocaleString('en-US');

/** The night's awards, from the least of them to the class MVP, each with the class ranked. */
export function reunionAwards(k: DraftClass): ReunionAward[] {
  const ms = k.members.filter((m) => m.seasons.length > 0 || m.rec);
  const award = (key: string, title: string, icon: string, what: string, value: (m: ClassMember) => number, text: (v: number) => string): ReunionAward => ({
    key,
    title,
    icon,
    what,
    rows: ms
      .map((m) => ({ m, value: value(m) }))
      .sort((a, b) => b.value - a.value || a.m.at.localeCompare(b.m.at))
      .map((r) => ({ ...r, text: text(r.value) })),
  });
  const st = new Map(standings(k).map((s) => [s.m.id, s]));
  return [
    award('iron', 'Iron Man', 'shoe', 'most NBA games', (m) => nbaOnly(m).reduce((a, s) => a + s.gp, 0), (v) => `${n0(v)} games`),
    award('travel', 'Journeyman', 'jet', 'most NBA teams', (m) => new Set(nbaOnly(m).map((s) => s.team)).size, (v) => `${v} team${v === 1 ? '' : 's'}`),
    award('glass', 'Glass Cleaner', 'rebound', 'most career rebounds', (m) => total(m, 'reb'), (v) => `${n0(v)} rebounds`),
    award('dimes', 'Floor General', 'playmake', 'most career assists', (m) => total(m, 'ast'), (v) => `${n0(v)} assists`),
    award('bank', 'Moneybags', 'bank', 'most career earnings', (m) => m.seasons.reduce((a, s) => a + (s.sal ?? 0), 0), (v) => `$${v >= 100 ? n0(v) : v.toFixed(1)}M earned`),
    award('points', 'Bucket Getter', 'shoot', 'most career points', (m) => total(m, 'pts'), (v) => `${n0(v)} points`),
    award('peak', 'Highest Peak', 'ovr', 'the best rating anyone reached', (m) => st.get(m.id)?.peak ?? 0, (v) => `peak ${v} OVR`),
    award('stars', 'All-Star Regular', 'stars', 'most All-Star selections', (m) => st.get(m.id)?.allStars ?? 0, (v) => `${v} All-Star${v === 1 ? '' : 's'}`),
    award('mvps', 'Hardware', 'crown', 'most MVP awards', (m) => st.get(m.id)?.mvps ?? 0, (v) => `${v} MVP${v === 1 ? '' : 's'}`),
    award('rings', 'Ring Leader', 'laurel', 'most titles', (m) => st.get(m.id)?.titles ?? 0, (v) => `${v} ring${v === 1 ? '' : 's'}`),
    // by the career index when every career has its card; with a quiet friend still out, by the
    // class table's own score for everyone, so the two never mix
    ms.every((m) => m.rec)
      ? award('mvp', 'Class MVP', 'podium', 'the best career in the class, by career index', (m) => scoreOf(m.rec!), (v) => `career index ${n0(v)}`)
      : award('mvp', 'Class MVP', 'podium', 'the best career in the class, by the class table', (m) => st.get(m.id)?.score ?? 0, (v) => `class score ${n0(v)}`),
  ];
}

/** The awards of the night he won outright: first in the class, with something to show for it
 * (an award nobody has any of, such as MVPs in a class without one, goes to nobody). */
export const reunionWon = (awards: ReunionAward[]): string[] => awards.filter((a) => a.rows[0]?.m.mine && a.rows[0].value > 0).map((a) => a.key);

// ---------- which multiplayer this page has ----------

let picked: Promise<Multiplayer | null> | null = null;
/** Multiplayer for this page: the database in the online build, the stand-in in the dev deck, none
 * elsewhere (the claude.ai page). */
export function multiplayer(): Promise<Multiplayer | null> {
  if (isDev()) return Promise.resolve(localMultiplayer());
  if (picked) return picked;
  picked = (async () => {
    if (!import.meta.env.VITE_SB_URL || !import.meta.env.VITE_SB_KEY) return null;
    try {
      const { onlineMultiplayer } = await import('./onlineMultiplayer');
      return onlineMultiplayer(import.meta.env.VITE_SB_URL, import.meta.env.VITE_SB_KEY);
    } catch {
      return null;
    }
  })();
  return picked;
}

// ---------- what a career sends, in order ----------

/** A post waiting to go: kept on this device until the server takes it (or turns it down for
 * good), so a season played offline, or faster than the server takes them, still arrives. */
type Job = { k: 'season'; code: string; s: ClassSeason } | { k: 'career'; code: string; rec: CareerRecord; run?: string } | { k: 'answer'; code: string; name: string; rec: CareerRecord };
const QUEUE = 'btr-mp-queue';
const sameJob = (a: Job, b: Job) => a.k === b.k && a.code === b.code && (a.k !== 'season' || (b.k === 'season' && a.s.year === b.s.year));
function loadQ(): Job[] {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE) ?? '[]') as Job[];
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}
function saveQ(q: Job[]): void {
  try {
    localStorage.setItem(QUEUE, JSON.stringify(q.slice(-120)));
  } catch {
    // storage full: what is kept goes
  }
}
/** Sends one post (a season, a class card, a challenge answer) as soon as the server takes it. */
export function send(job: Job): void {
  saveQ([...loadQ().filter((j) => !sameJob(j, job)), job]);
  void pump();
}
const wait = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));
let pumping = false;
/** Sends what is waiting, one at a time (the server takes a season every two seconds). */
export async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    const mp = await multiplayer();
    if (!mp) return;
    for (let misses = 0; misses < 12; ) {
      const j = loadQ()[0];
      if (!j) break;
      const r = j.k === 'season' ? await mp.postSeason(j.code, j.s) : j.k === 'career' ? await mp.postCareer(j.code, j.rec, j.run) : await mp.answer(j.code, j.name, j.rec);
      if (r === 'busy' || r === 'error') {
        misses++;
        await wait(r === 'busy' ? 2500 : 8000);
        continue;
      }
      // taken, or turned down for good (no such class, not a Regular guy card): either way, done
      saveQ(loadQ().filter((x) => !sameJob(x, j)));
      if (mp.kind === 'online') await wait(2100);
    }
  } finally {
    pumping = false;
  }
}

// ---------- the dev deck's stand-in ----------

interface LocalData {
  v: 1;
  chat?: Record<string, (Omit<ChatLine, 'mine'> & { who: string })[]>;
  takers?: Record<string, string[]>;
  challenges: (Omit<Challenge, 'mine' | 'answers'> & { who: string; answers: (Omit<Answer, 'mine'> & { who: string })[] })[];
  classes: (Omit<DraftClass, 'mine' | 'members'> & { who: string; members: (Omit<ClassMember, 'mine' | 'reacts'> & { who: string; run?: string; reacts?: { y: number; e: Emote; who: string }[] })[] })[];
  /** Round 35: each day's best daily challenge runs (the stand-in's friends are everyone in it). */
  daily?: Record<string, (Omit<DailyRow, 'mine'> & { who: string })[]>;
}
const LOCAL = 'btr-mp-local';
const ME = 'me';
const HOUSE = ['Rook', 'Dee', 'Big Tal', 'Mo', 'Sasha', 'Jules', 'Kofi'];
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => ABC[Math.floor(Math.random() * ABC.length)]).join('');
const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

/** A start page that plays again from a logged card (the seed is the first part of its id). */
function prospectOf(r: CareerRecord): Prospect {
  const seed = Number(r.id.split('-')[0]) || 7;
  return { seed, input: { name: r.name, number: r.number, pos: r.pos, archetype: 0, focus: ['SHT', 'ATH'], mode: 'standard', hometown: 'Dayton', highSchool: r.highSchool } };
}
/** House seasons for a class member: a made-up but plausible climb from high school to the NBA. */
function houseSeasons(k: number, upTo: number): ClassSeason[] {
  const out: ClassSeason[] = [];
  let ovr = 44 + k * 3;
  for (let i = 0; i < upTo; i++) {
    const lv = i < 4 ? 'HSV' : i < 6 ? 'NCAA' : 'NBA';
    ovr = Math.min(94, ovr + (i < 6 ? 4 + ((k + i) % 3) : i < 10 ? 2 : -1));
    const star = lv === 'NBA' && ovr >= 80;
    out.push({
      year: 2026 + i,
      age: 15 + i,
      lv,
      team: lv === 'HSV' ? `${['Fairview', 'Lincoln', 'St. Mark', 'Eastside'][k % 4]} High` : lv === 'NCAA' ? ['Duke', 'Kansas', 'Gonzaga', 'UCLA'][k % 4] : ['Celtics', 'Nuggets', 'Knicks', 'Suns'][k % 4],
      color: ['#1f6f43', '#2b4c9b', '#a3302b', '#6b3fa0'][k % 4],
      ovr,
      gp: lv === 'NBA' ? 70 + ((k + i) % 10) : 28,
      pts: Math.round((8 + ovr / 5 + ((k * 7 + i) % 5)) * 10) / 10,
      reb: Math.round((3 + ((k + i) % 6)) * 10) / 10,
      ast: Math.round((2 + ((k * 3 + i) % 5)) * 10) / 10,
      w: 30 + ((k * 5 + i * 3) % 30),
      l: 52 - ((k * 5 + i * 3) % 30),
      result: lv === 'NBA' ? ['Lost in first round', 'Missed playoffs', 'Lost in conference finals', 'Champion'][(k + i) % 4] : 'Lost in state semifinal',
      aw: [...(star ? ['All-Star'] : []), ...(lv === 'NBA' && ovr >= 90 ? ['MVP'] : []), ...(lv === 'NBA' && (k + i) % 4 === 3 ? ['NBA Champion'] : [])],
      pn: ['Andre Cole', 'Luka Venn', 'Tariq Moss', 'Eli Brandt'][k % 4],
    });
  }
  return out;
}
/** Round 35: house seasons for a class that starts on draft night: a first-round rookie (65 to 75)
 * in the NBA from his first season, one move mid-career, a rookie deal then a big one. */
function draftSeasons(k: number, upTo: number, first = 2026): ClassSeason[] {
  const teams = [['Boston Celtics', 'Miami Heat'], ['Denver Nuggets', 'Chicago Bulls'], ['New York Knicks', 'Phoenix Suns'], ['Golden State Warriors', 'Dallas Mavericks'], ['Toronto Raptors', 'Utah Jazz'], ['Atlanta Hawks', 'Orlando Magic']][k % 6];
  const colors = ['#007A33', '#0E2240', '#006BB6', '#1D428A', '#CE1141', '#E03A3E'];
  const out: ClassSeason[] = [];
  let ovr = 66 + ((k * 3) % 10);
  for (let i = 0; i < upTo; i++) {
    ovr = Math.max(55, Math.min(95, ovr + [4, 3, 3, 2, 1, 1, 0, -1, -2, -3, -3, -4][i] + ((k + i) % 2)));
    const team = teams[i < 5 + (k % 3) ? 0 : 1];
    const ring = (k + i) % 5 === 4 && ovr >= 78;
    out.push({
      year: first + i,
      age: 22 + i,
      lv: 'NBA',
      team,
      color: colors[k % 6],
      ovr,
      gp: 64 + ((k * 7 + i * 3) % 18),
      pts: Math.round((ovr - 52 + ((k + i) % 4)) * 0.9 * 10) / 10,
      reb: Math.round((3 + ((k * 2 + i) % 7)) * 10) / 10,
      ast: Math.round((2 + ((k * 5 + i) % 6)) * 10) / 10,
      w: 30 + ((k * 5 + i * 3) % 30),
      l: 52 - ((k * 5 + i * 3) % 30),
      result: ring ? 'Won the title' : ['Lost in first round', 'Missed playoffs', 'Lost in conference finals'][(k + i) % 3],
      aw: [...(i === 0 && k === 1 ? ['Rookie of the Year'] : []), ...(ovr >= 80 ? ['All-Star'] : []), ...(ovr >= 90 ? ['MVP'] : []), ...(ring ? ['NBA Champion'] : [])],
      pn: ['Andre Cole', 'Luka Venn', 'Tariq Moss', 'Eli Brandt', 'Nico Hale', 'Ray Quinn'][k % 6],
      pos: ['SG', 'C', 'SF', 'PG', 'PF', 'SF'][k % 6],
      sal: Math.round((i < 4 ? 4 + k * 1.3 + i : 18 + (ovr - 70) * 1.6) * 10) / 10,
    });
  }
  return out;
}
/** A finished house career's card, on one of the deck's own (so every field is real). */
function houseCard(base: CareerRecord, k: number, seasons: ClassSeason[]): CareerRecord {
  const peak = seasons.reduce((a, s) => Math.max(a, s.ovr), 0);
  const count = (re: RegExp) => seasons.filter((s) => s.aw.some((a) => re.test(a))).length;
  return { ...base, id: `house-r${k}`, mode: 'standard', name: seasons[0]?.pn ?? base.name, peak, nbaSeasons: seasons.length, allStars: count(/^All-Star$/), mvps: count(/^MVP$/), titles: count(/Champion$/), tier: peak >= 88 ? 'Hall of Famer' : peak >= 80 ? 'All-Star' : 'Starter', index: { total: 0, best: 0, score: 380 + peak * 6 + count(/^All-Star$/) * 25 - k * 7 } };
}
function seed(recs: CareerRecord[]): LocalData {
  const d: LocalData = { v: 1, challenges: [], classes: [] };
  recs.slice(0, 4).forEach((r, i) => {
    const rec = { ...r, mode: 'standard' as const };
    if (i === 0) {
      // one of the deck's own, with a friend's answer beside it
      const other = recs[1] ? { ...recs[1], mode: 'standard' as const, name: rec.name } : rec;
      d.challenges.push({ code: 'DECK22', who: ME, name: 'Deck', prospect: prospectOf(rec), rec, at: ago(2), answers: [{ id: 'house00001', who: 'house-1', name: HOUSE[0], rec: other, at: ago(1) }] });
    } else d.challenges.push({ code: `HSE${i + 1}AB`, who: `house-${i}`, name: HOUSE[i], prospect: prospectOf(rec), rec, at: ago(i * 3), answers: [] });
  });
  d.classes.push({
    code: 'CLASS2',
    who: 'house-2',
    name: 'Rooftop runs',
    seed: 4242,
    at: ago(5),
    members: [
      { id: 'house00002', who: 'house-2', name: HOUSE[1], seasons: houseSeasons(0, 12), rec: null, at: ago(5), rival: 'me00000000' },
      { id: 'house00003', who: 'house-3', name: HOUSE[2], seasons: houseSeasons(1, 9), rec: null, at: ago(4) },
      { id: 'house00004', who: 'house-4', name: HOUSE[3], seasons: houseSeasons(2, 7), rec: null, at: ago(3) },
    ],
  });
  d.chat = {
    'class:CLASS2': [
      { id: 1, who: 'house-2', name: HOUSE[1], body: 'Rookie of the Year is mine, just so everyone knows.', at: ago(2) },
      { id: 2, who: 'house-3', name: HOUSE[2], body: 'Big words from a guy shooting 41%.', at: ago(1.9) },
      { id: 3, who: 'house-4', name: HOUSE[3], body: 'Knicks drafted me. See you all in the Garden.', at: ago(1) },
    ],
    'challenge:DECK22': [{ id: 4, who: 'house-1', name: HOUSE[0], body: 'Beat your index on the first try. Your move.', at: ago(1) }],
  };
  d.classes.push({ code: 'OPEN22', who: 'house-5', name: 'Late bloomers', seed: 777, at: ago(1), members: [{ id: 'house00005', who: 'house-5', name: HOUSE[4], seasons: houseSeasons(3, 3), rec: null, at: ago(1) }] });
  // round 35: a class on the draft-night story, three seasons in, with its news and reactions
  const night: LocalData['classes'][number]['members'] = [0, 1, 2, 3, 4].map((k) => ({ id: `house0001${k}`, who: `house-n${k}`, name: HOUSE[k], seasons: draftSeasons(k, 3), rec: null, at: ago(2 - k * 0.1) }));
  night[0].reacts = [{ y: 2027, e: 'fire', who: 'house-n1' }, { y: 2027, e: 'fire', who: 'house-n2' }, { y: 2028, e: 'crown', who: 'house-n3' }];
  d.classes.push({ code: 'NIGHT6', who: 'house-n0', name: 'Draft night', seed: 2026, at: ago(6), members: night });
  d.chat!['class:NIGHT6'] = night.flatMap((m) => m.seasons.map((s, i) => classNews(m.seasons.slice(0, i), s, m.name)).filter((b): b is string => !!b)).slice(0, 8).map((body, i) => ({ id: 20 + i, who: 'news', name: 'Class news', body, at: ago(5 - i * 0.4) }));
  // and one whose careers are all over: its reunion night is ready (the deck's own seat in it too)
  if (recs[0]) {
    const done = [0, 1, 2, 3, 4, 5].map((k) => {
      const seasons = draftSeasons(k, 9 + (k % 4), 2014);
      return { id: k === 5 ? 'me00000000' : `house0002${k}`, who: k === 5 ? ME : `house-o${k}`, name: k === 5 ? 'Deck' : HOUSE[k], seasons, rec: houseCard(recs[k % recs.length], k, seasons), at: ago(30 - k) };
    });
    d.classes.push({ code: 'REUNI8', who: 'house-o0', name: 'Class of 2014', seed: 2014, at: ago(40), members: done });
  }
  return d;
}
function lload(): LocalData {
  try {
    const d = JSON.parse(localStorage.getItem(LOCAL) ?? 'null') as LocalData | null;
    if (d?.v === 1) return d;
  } catch {
    // made again below
  }
  const d = seed(logCards());
  lsave(d);
  return d;
}
function lsave(d: LocalData): void {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(d));
  } catch {
    // storage full or blocked: this visit only
  }
}
/** Puts the dev deck's stand-in back to its house players, with these careers for their cards,
 * and (round 35) a class of its own around one of the deck's careers (`me` marks his seat). */
export function seedLocalMultiplayer(recs: CareerRecord[], also?: { code: string; name: string; seed: number; members: { id: string; name: string; seasons: ClassSeason[]; rival?: string | null; me?: boolean }[] }): void {
  const d = seed(recs);
  if (also) d.classes.unshift({ code: also.code, name: also.name, seed: also.seed, who: ME, at: ago(3), members: also.members.map(({ me, ...m }, i) => ({ ...m, who: me ? ME : `house-x${i}`, rec: null, at: ago(3 - i * 0.1) })) });
  lsave(d);
}

function localMultiplayer(): Multiplayer {
  const view = (c: LocalData['challenges'][number]): Challenge => ({ ...c, mine: c.who === ME, answers: c.answers.map((a) => ({ ...a, mine: a.who === ME })) });
  const viewClass = (k: LocalData['classes'][number]): DraftClass => ({
    ...k,
    mine: k.who === ME,
    members: k.members.map(({ run: _run, reacts, ...m }) => {
      const out: React[] = [];
      for (const r of reacts ?? []) {
        const x = out.find((o) => o.y === r.y && o.e === r.e);
        if (x) (x.n++, (x.mine ||= r.who === ME));
        else out.push({ y: r.y, e: r.e, n: 1, mine: r.who === ME });
      }
      return { ...m, mine: m.who === ME, reacts: out };
    }),
  });
  const news = (d: LocalData, code: string, body: string | null) => {
    if (!body) return;
    const key = `class:${code}`;
    const lines = d.chat?.[key] ?? [];
    d.chat = { ...d.chat, [key]: [...lines, { id: (lines[lines.length - 1]?.id ?? 0) + 1, who: 'news', name: 'Class news', body, at: new Date().toISOString() }].slice(-200) };
  };
  const summary = (k: LocalData['classes'][number]): ClassSummary => ({ code: k.code, name: k.name, at: k.at, n: k.members.length });
  return {
    kind: 'local',
    async makeChallenge(name, prospect, rec) {
      if (rec.mode !== 'standard') return 'denied';
      const d = lload();
      const code = newCode();
      d.challenges.unshift({ code, who: ME, name, prospect, rec, at: new Date().toISOString(), answers: [] });
      lsave(d);
      return code;
    },
    async challenge(code) {
      const c = lload().challenges.find((x) => x.code === cleanCode(code));
      return c ? view(c) : null;
    },
    async openChallenges() {
      return lload()
        .challenges.filter((c) => c.who !== ME && !c.answers.some((a) => a.who === ME))
        .map((c) => ({ code: c.code, name: c.name, rec: c.rec, at: c.at, answers: c.answers.length }));
    },
    async myChallenges() {
      return lload()
        .challenges.filter((c) => c.who === ME || c.answers.some((a) => a.who === ME))
        .map(view);
    },
    async answer(code, name, rec) {
      const d = lload();
      const c = d.challenges.find((x) => x.code === cleanCode(code));
      if (!c) return 'missing';
      if (c.who === ME || rec.mode !== 'standard') return 'denied';
      c.answers = [...c.answers.filter((a) => a.who !== ME), { id: 'me00000000', who: ME, name, rec, at: new Date().toISOString() }];
      lsave(d);
      return 'ok';
    },
    async makeClass(name, player) {
      const d = lload();
      const k = { code: newCode(), who: ME, name, seed: Math.floor(Math.random() * 2000000000) + 1, at: new Date().toISOString(), members: [{ id: 'me00000000', who: ME, name: player, seasons: [], rec: null, at: new Date().toISOString() }] };
      d.classes.unshift(k);
      lsave(d);
      return { code: k.code, seed: k.seed };
    },
    async joinClass(code, player) {
      const d = lload();
      const k = d.classes.find((x) => x.code === cleanCode(code));
      if (!k) return 'missing';
      if (!k.members.some((m) => m.who === ME)) {
        if (k.members.length >= CLASS_MAX) return 'full';
        k.members.push({ id: 'me00000000', who: ME, name: player, seasons: [], rec: null, at: new Date().toISOString() });
        lsave(d);
      }
      return { code: k.code, seed: k.seed };
    },
    async draftClass(code) {
      const k = lload().classes.find((x) => x.code === cleanCode(code));
      return k ? viewClass(k) : null;
    },
    async openClasses() {
      return lload()
        .classes.filter((k) => k.members.length < CLASS_MAX && !k.members.some((m) => m.who === ME))
        .map(summary);
    },
    async myClasses() {
      return lload()
        .classes.filter((k) => k.members.some((m) => m.who === ME))
        .map(summary);
    },
    // round 35: as the server (0006): a seat holds one career, a posted season stands, and what
    // changed goes to the class news
    async postSeason(code, s) {
      const d = lload();
      const m = d.classes.find((x) => x.code === code)?.members.find((x) => x.who === ME);
      if (!m) return 'missing';
      const { run, ...line } = s;
      if (m.run && run !== m.run) return 'taken';
      if (m.seasons.some((x) => x.year === s.year)) return 'ok';
      news(d, code, classNews(m.seasons, line, m.name));
      m.seasons = [...m.seasons, line].sort((a, b) => a.year - b.year);
      m.run ??= run;
      m.at = new Date().toISOString();
      lsave(d);
      return 'ok';
    },
    async postCareer(code, rec, run) {
      const d = lload();
      const m = d.classes.find((x) => x.code === code)?.members.find((x) => x.who === ME);
      if (!m) return 'missing';
      if (m.run && run !== m.run) return 'taken';
      if (m.rec) return 'ok';
      m.rec = rec;
      news(d, code, `${rec.name} (${m.name}) retires: ${rec.tier}, peak ${Math.round(rec.peak)}.`);
      lsave(d);
      return 'ok';
    },
    async setRival(code, to) {
      const d = lload();
      const k = d.classes.find((x) => x.code === code);
      const m = k?.members.find((x) => x.who === ME);
      if (!k || !m) return 'missing';
      if (to && (to === m.id || !k.members.some((x) => x.id === to))) return 'denied';
      m.rival = to;
      lsave(d);
      return 'ok';
    },
    async take(code) {
      const d = lload();
      if (!d.challenges.some((c) => c.code === code)) return 'missing';
      d.takers = { ...d.takers, [code]: [...new Set([...(d.takers?.[code] ?? []), ME])] };
      lsave(d);
      return 'ok';
    },
    async chat(room, code) {
      const d = lload();
      const inRoom = room === 'class' ? !!d.classes.find((k) => k.code === code)?.members.some((m) => m.who === ME) : !!d.challenges.find((c) => c.code === code && (c.who === ME || c.answers.some((a) => a.who === ME))) || !!d.takers?.[code]?.includes(ME);
      if (!inRoom) return null;
      return (d.chat?.[`${room}:${code}`] ?? []).slice(-50).map((x) => ({ id: x.id, name: x.name, body: x.body, at: x.at, mine: x.who === ME, ...(x.who === 'news' ? { news: true } : {}) }));
    },
    async say(room, code, name, body) {
      const d = lload();
      const b = body.replace(/[\u0000-\u001f]+/g, ' ').trim();
      if (!b || b.length > CHAT_MAX) return 'denied';
      const key = `${room}:${code}`;
      const lines = d.chat?.[key] ?? [];
      d.chat = { ...d.chat, [key]: [...lines, { id: (lines[lines.length - 1]?.id ?? 0) + 1, who: ME, name, body: b, at: new Date().toISOString() }].slice(-200) };
      lsave(d);
      return 'ok';
    },
    async react(code, to, year, emote) {
      const d = lload();
      const k = d.classes.find((x) => x.code === code);
      if (!k?.members.some((m) => m.who === ME)) return 'missing';
      const t = k.members.find((m) => m.id === to);
      if (!t || t.who === ME || !t.seasons.some((s) => s.year === year)) return 'denied';
      t.reacts = [...(t.reacts ?? []).filter((r) => !(r.y === year && r.who === ME)), ...(emote ? [{ y: year, e: emote, who: ME }] : [])];
      lsave(d);
      return 'ok';
    },
    async dailyPost(day, name, points, legacy, peak) {
      const d = lload();
      const rows = d.daily?.[day] ?? [];
      const mine = rows.find((r) => r.who === ME);
      const best = !mine || points > mine.points ? { who: ME, name, points, legacy, peak } : { ...mine, name };
      d.daily = { ...d.daily, [day]: [...rows.filter((r) => r.who !== ME), best] };
      lsave(d);
      return 'ok';
    },
    async dailyFriends(day) {
      const d = lload();
      // the house friends play today's daily too (a fixed spread, so the board has company)
      const house = HOUSE.slice(0, 4).map((name, i) => ({ who: `house-d${i}`, name, points: 5200 - i * 900, legacy: 52 - i * 9, peak: 84 - i * 3 }));
      return [...house, ...(d.daily?.[day] ?? [])]
        .sort((a, b) => b.points - a.points || b.peak - a.peak)
        .map(({ who, ...r }) => ({ ...r, mine: who === ME }));
    },
  };
}
