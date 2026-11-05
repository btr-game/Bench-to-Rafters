// What the player has earned (round 24): kept on this device for good, across careers. Each entry
// remembers when it came and which player earned it; the totals (careers finished, titles over
// every career...) feed the achievements that count more than one career.

import { ACHIEVEMENTS, DIFFICULTIES, NO_TOTALS, earnedNow, simReady, type Achievement, type CareerTotals } from '../engine/achievements';
import { madeAllStar } from '../engine/levels';
import type { Mode } from '../engine/balance';
import type { GameState } from '../engine/types';
import { isDev } from '../dev/mode';
import { count, nbaTitles } from '../engine/awards/legacy';
import { addMiniResult } from '../engine/achievementsMini';
import type { MpKind } from '../engine/achievements35';
import { ENDING_IDS } from '../engine/achievements36';
import { TOWN_MARKS } from '../engine/achievements37';
import { R39_MARKS } from '../engine/achievements39';
import type { CareerRecord } from '../engine/career/record';
import type { MiniResult } from '../engine/career/miniBonus';
import { UNLOCK_FROM, islandDone, loadRoad, offRecord, type Road, type Unlock } from './road';
import { shownBy, username } from './names';
import type { FinaleKind } from './finale';
import { lang } from '../i18n';

const KEY = 'btr-achv-v1';

interface AchSaved {
  // round 28: `run` is the career that earned it (runOf), so a career can show what it earned
  got: Record<string, { at: string; who: string; run?: string }>;
  totals: CareerTotals;
  /** The day of a reset (round 27, the dev deck): daily challenges before it no longer count. */
  since?: string;
}

/** Which career a game is (round 28, owner: "in game, specifically highlight achievements achieved
 * in that run"): its seed and the player's name, the same through every season of it. */
export const runOf = (g: GameState): string => `${g.seed}-${g.player.name}`;

/** What one career earned, newest first (the Extras tab's card and dot, the Records tab). */
export function earnedIn(g: GameState): Achievement[] {
  const run = runOf(g);
  const got = loadAch().got;
  return ACHIEVEMENTS.filter((a) => got[a.id]?.run === run).sort((a, b) => (got[a.id].at < got[b.id].at ? 1 : -1));
}

/** A book with nothing in it, counting from today: what the dev deck's Reset achievements writes. */
export const emptyAch = (today: string): AchSaved => ({ got: {}, totals: { ...NO_TOTALS }, since: today });
export const ACH_KEY = KEY;

export function loadAch(): AchSaved {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null') as AchSaved | null;
    // round 25: the old dev deck page, opened from a file, could write its "everything earned" book
    // into the game's storage; those entries are not the player's and are dropped
    if (d?.got && !isDev()) for (const id of Object.keys(d.got)) if (d.got[id].who === 'Dev deck') delete d.got[id];
    if (d?.got) return { got: d.got, totals: { ...NO_TOTALS, ...d.totals }, since: d.since };
  } catch {
    // a blocked or broken store reads as nothing earned yet
  }
  return { got: {}, totals: { ...NO_TOTALS } };
}

function saveAch(d: AchSaved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // achievements are a nicety: without storage they just don't stick
  }
}

/** Days with a daily challenge run on this device (Daily.tsx keeps one entry a day), since a reset. */
function dailyDays(since?: string): number {
  try {
    return Object.keys(JSON.parse(localStorage.getItem('btr-daily') ?? '{}') as object).filter((day) => !since || day >= since).length;
  } catch {
    return 0;
  }
}

/** A career just ended: count it in the totals. */
export function countCareer(g: GameState, master: boolean): void {
  const d = loadAch();
  const t = d.totals;
  const mode = g.mode ?? 'standard';
  t.finished += 1;
  // round 35: a Comet (a son's career is one) is played by Sim, so it is no career at its difficulty;
  // one with an NBA All-Star team counts toward opening Sim
  if (!g.flags.comet) t.byMode = { ...t.byMode, [mode]: (t.byMode[mode] ?? 0) + 1 };
  if (!g.flags.comet && madeAllStar(g)) t.starBy = { ...t.starBy, [mode]: (t.starBy?.[mode] ?? 0) + 1 };
  t.titles += nbaTitles(g);
  t.mvps += count(g, 'MVP');
  if (g.flags.fast) t.fast += 1;
  if (master) t.master += 1;
  // round 32: a farewell tour seen through, a son's career played
  if (g.awards.some((a) => a.key === 'FAREWELL')) t.farewells = (t.farewells ?? 0) + 1;
  if (g.flags.gen2) t.sons = (t.sons ?? 0) + 1;
  // round 40: the language the game was in when it ended
  if (!t.langs?.includes(lang())) t.langs = [...(t.langs ?? []), lang()];
  saveAch(d);
}

/** Round 35 (owner: "sim mode should be unlocked once the user completes one full round (until
 * retirement) of each difficulty", then "lets go with allstar as the requirement"): the difficulties
 * with no career played to its end with an NBA All-Star team on this device yet. */
export function difficultiesLeft(): Mode[] {
  const t = loadAch().totals;
  return DIFFICULTIES.filter((m) => !(t.starBy?.[m] ?? 0));
}

/** Sim mode is open on this device: an All-Star career finished at every difficulty (the dev deck:
 * always). */
export const simOpen = (): boolean => isDev() || simReady(loadAch().totals);

/** A mini-game run just ended (round 27): count it for the arcade achievements. */
export function recordMini(r: MiniResult): void {
  const d = loadAch();
  d.totals.mini = addMiniResult(d.totals.mini, r);
  saveAch(d);
}

/** The game's link went out (round 28, Share the game): counted for Word of Mouth. */
export function recordShare(): void {
  const d = loadAch();
  d.totals.shared = (d.totals.shared ?? 0) + 1;
  saveAch(d);
}

/** Round 31: a choice taken back (Take Two). */
export function recordUndo(): void {
  const d = loadAch();
  d.totals.undone = (d.totals.undone ?? 0) + 1;
  saveAch(d);
}

/** Round 32: a play the announcer called. */
export function recordCall(): void {
  const d = loadAch();
  d.totals.called = (d.totals.called ?? 0) + 1;
  saveAch(d);
}

/** Round 32: a career card saved or shared. */
export function recordCard(): void {
  const d = loadAch();
  d.totals.cards = (d.totals.cards ?? 0) + 1;
  saveAch(d);
}

/** Round 31: two career log cards set side by side. */
export function recordCompare(): void {
  const d = loadAch();
  d.totals.compared = (d.totals.compared ?? 0) + 1;
  saveAch(d);
}

/** Round 34: cards folded right now (the most at once is kept). */
export function recordFolds(n: number): void {
  const d = loadAch();
  if (n <= (d.totals.folded ?? 0)) return;
  d.totals.folded = n;
  saveAch(d);
}

/** Round 34: a career opened from the career log, finished (Look back) or in progress (Continue). */
export function recordOpened(finished: boolean): void {
  const d = loadAch();
  if (finished) d.totals.lookedBack = (d.totals.lookedBack ?? 0) + 1;
  else d.totals.resumed = (d.totals.resumed ?? 0) + 1;
  saveAch(d);
}

/** Round 34: a road map place's card opened after the tutorial; true the first time. */
export function recordRoad(place: string): boolean {
  const d = loadAch();
  if (d.totals.roadSeen?.includes(place)) return false;
  d.totals.roadSeen = [...(d.totals.roadSeen ?? []), place];
  saveAch(d);
  return true;
}

/** Round 34: a visit to the game (the intro passed). */
export function recordVisit(): void {
  const d = loadAch();
  d.totals.visits = (d.totals.visits ?? 0) + 1;
  saveAch(d);
}

/**
 * Round 35, Play with friends (ui/multiplayer.ts): one thing done with friends, counted for the book.
 * Like the other recorders it only counts; the caller checks the book after (`achievementsNow()`).
 * - 'made': a challenge set from a finished career (the retirement page's Challenge a friend, once
 *   its code comes back)
 * - 'answered': the answer to a friend's challenge posted (a challenge career finished)
 * - 'beat': that answer beat the career that set the challenge (a higher career index)
 * - 'joined': a draft class made or joined (a seat in it taken)
 * - 'classTop': first in a draft class's standings, with two members or more
 * - the class's pages (ui/screens/ClassNight.tsx): 'reunionMvp', 'reunion3' and 'reunionSweep'
 *   (recordReunion), 'react' (a reaction on a classmate's season, once a season), 'crowned' (a
 *   crown on one of his), 'dailyTop' (first on the friends' daily board, once a day), 'watched'
 *   (a classmate's career opened, once a classmate)
 * With `code` (the challenge's or the class's), each one counts once however often it is seen; the
 * result is true when it counted.
 */
export function recordMp(kind: MpKind, code?: string): boolean {
  const d = loadAch();
  const t = d.totals;
  const key = code ? `${kind}:${code}` : '';
  if (key && t.mpSeen?.includes(key)) return false;
  if (key) t.mpSeen = [...(t.mpSeen ?? []), key];
  t.mp = { ...t.mp, [kind]: (t.mp?.[kind] ?? 0) + 1 };
  saveAch(d);
  return true;
}

/** Round 35: a class's reunion night seen to its last award (ui/screens/ClassNight.tsx): named
 * Class MVP, `won` of its `of` awards. Each counts once a class; true when any of them counted. */
export function recordReunion(code: string, won: number, of: number, mvp: boolean): boolean {
  const got = [mvp && recordMp('reunionMvp', code), won >= 3 && recordMp('reunion3', code), won === of && recordMp('reunionSweep', code)];
  return got.some(Boolean);
}

/** Round 36: the username was saved (components/Username.tsx, right after setUsername), with the
 * one it replaced ('' for none): a first pick and a change count apart. A device that had a name
 * before the round (Play with friends kept one) counts as having picked it (checkAch). */
export function recordUsername(before: string): void {
  const now = username();
  if (!now || now === before) return;
  const d = loadAch();
  d.totals.handle = 1;
  if (before) d.totals.renamed = (d.totals.renamed ?? 0) + 1;
  saveAch(d);
}

/** Round 36: a career went to the community boards (store.ts, with the card `signed` gave it). It
 * counts only under a username (a Hall of Fame career counts again on its own); true when it counted. */
export function recordPosted(r: CareerRecord): boolean {
  if (!shownBy(r.by)) return false;
  const d = loadAch();
  d.totals.posted = (d.totals.posted ?? 0) + 1;
  if (r.hof) d.totals.postedHof = (d.totals.postedHof ?? 0) + 1;
  saveAch(d);
  return true;
}

/** Round 36: a finale reached its thank-you (screens/Finale.tsx): `skipped` when the Skip button
 * (or Enter) jumped there, `skippable` when the button was there to press. Each career counts once,
 * the tutorial's levels never; true when it counted. */
export function recordFinale(g: GameState, kind: FinaleKind, how: { skippable: boolean; skipped: boolean }): boolean {
  if (kind === 'level') return false;
  const d = loadAch();
  const t = d.totals;
  const run = runOf(g);
  if (t.finSeen?.includes(run)) return false;
  // the latest 200 careers are enough to keep one from counting twice
  t.finSeen = [...(t.finSeen ?? []), run].slice(-200);
  const fin = { ...t.fin };
  if (how.skipped) fin.skipped = (fin.skipped ?? 0) + 1;
  else {
    fin[kind] = (fin[kind] ?? 0) + 1;
    if (how.skippable) fin.encore = (fin.encore ?? 0) + 1;
  }
  t.fin = fin;
  saveAch(d);
  return true;
}

/** Round 37, the town (components/Town.tsx): the street of this career, started afresh when a
 * different career is walked. */
function townRunOf(t: CareerTotals, g: GameState) {
  const run = runOf(g);
  if (t.townRun?.run !== run) t.townRun = { run, places: [], looks: [] };
  return t.townRun;
}

/** Round 37: a place on the town's street walked into (not the one he stood at when the street came
 * up). Counts every door, the agent's office's apart, and the places of this career; true when a
 * mark the book reads was reached. The tutorial's levels and the closing tour count nowhere. */
export function recordPlace(g: GameState, place: string): boolean {
  if (offRecord(g)) return false;
  const d = loadAch();
  const t = d.totals;
  t.doors = (t.doors ?? 0) + 1;
  if (place === 'agent') t.agentDoors = (t.agentDoors ?? 0) + 1;
  const town = townRunOf(t, g);
  const fresh = !town.places.includes(place);
  if (fresh) town.places.push(place);
  saveAch(d);
  return fresh || TOWN_MARKS.doors.includes(t.doors) || (place === 'agent' && TOWN_MARKS.agent.includes(t.agentDoors ?? 0));
}

/** Round 37: the street of this career came up: its look (his hometown, a campus, a city, a city
 * abroad) and the landmark beside an NBA arena on it. True when either is new. */
export function recordStreet(g: GameState, look: string, landmark?: string): boolean {
  if (offRecord(g)) return false;
  const d = loadAch();
  const t = d.totals;
  const town = townRunOf(t, g);
  const newLook = !town.looks.includes(look);
  if (newLook) town.looks.push(look);
  const newMark = !!landmark && !t.marks?.includes(landmark);
  if (newMark) t.marks = [...(t.marks ?? []), landmark!];
  saveAch(d);
  return newLook || newMark;
}

/** Round 37: he walked along the street, `feet` at his size. True when a whole mile was passed. */
export function recordWalk(g: GameState, feet: number): boolean {
  if (offRecord(g) || !(feet > 0)) return false;
  const d = loadAch();
  const before = d.totals.walked ?? 0;
  d.totals.walked = before + feet;
  saveAch(d);
  const marathon = TOWN_MARKS.mile * TOWN_MARKS.marathon;
  return Math.floor(d.totals.walked / TOWN_MARKS.mile) > Math.floor(before / TOWN_MARKS.mile) || (before < marathon && d.totals.walked >= marathon);
}

/** Round 39: the flight from the road map's airport back to the main land (screens/RoadMap.tsx).
 * True when a mark the book reads was reached. */
export function recordFlight(): boolean {
  const d = loadAch();
  d.totals.flights = (d.totals.flights ?? 0) + 1;
  saveAch(d);
  return R39_MARKS.flights.includes(d.totals.flights);
}

/** Round 39, online: a game on the Floor against a friend, played to its end (ui/floor/FloorFriend.tsx).
 * True when the book has something new to read. */
export function recordFloorFriend(win: boolean, margin: number, pts: number): boolean {
  const d = loadAch();
  const was = JSON.stringify(d.totals.floorFriend ?? null);
  const f = d.totals.floorFriend ?? { games: 0, wins: 0, losses: 0, streak: 0, best: 0, rout: false, close: false, pts: 0 };
  f.games++;
  if (win) {
    f.wins++;
    f.streak++;
    f.best = Math.max(f.best, f.streak);
    if (margin >= R39_MARKS.friendRout) f.rout = true;
    if (margin <= 2) f.close = true;
  } else {
    f.losses++;
    f.streak = 0;
  }
  f.pts = Math.max(f.pts, pts);
  d.totals.floorFriend = f;
  saveAch(d);
  return JSON.stringify(f) !== was;
}

/** Round 29: cards locked in the career log right now (the most at once is kept). */
export function recordLocks(n: number): void {
  const d = loadAch();
  d.totals.locked = Math.max(d.totals.locked ?? 0, n);
  saveAch(d);
}

/** Round 29: a music loop was heard; true the first time. */
/** The music loops of the tutorial, left out of Full Album (the levels count nowhere). */
export const TUTORIAL_LOOPS = ['road', 'sad'];
/** Round 36: each ending's theme (tracks.ts: a loop per ending, named as the ending), heard only at
 * that ending, so left out of Full Album too. */
export const ENDING_LOOPS: string[] = [...ENDING_IDS];

export function recordHeard(id: string): boolean {
  // round 33: the tutorial's two loops (the road map, a missed goal) are not part of the album
  if (TUTORIAL_LOOPS.includes(id) || ENDING_LOOPS.includes(id)) return false;
  const d = loadAch();
  if (d.totals.heard?.includes(id)) return false;
  d.totals.heard = [...(d.totals.heard ?? []), id];
  saveAch(d);
  return true;
}

/** Round 35: the modes this road has opened by clearing their stops (not by `all`, the gift to a
 * device that graduated before the locks, nor by the dev deck having everything). */
const roadOpened = (r: Road): Unlock[] =>
  (Object.keys(UNLOCK_FROM) as Unlock[]).filter((u) => {
    const from = UNLOCK_FROM[u];
    return from === 'island' ? islandDone(r) : !!r.passed[from];
  });

/** Checks everything against the career on screen; returns what is new (and keeps it). */
export function checkAch(g: GameState | null): Achievement[] {
  const d = loadAch();
  d.totals.daily = Math.max(d.totals.daily, dailyDays(d.since));
  // round 35: the road map's stops cleared (kept once seen, like the daily days)
  const open = roadOpened(loadRoad()).filter((u) => !d.totals.unlocks?.includes(u));
  if (open.length) d.totals.unlocks = [...(d.totals.unlocks ?? []), ...open];
  // round 36: a username on this device, whenever it was picked (kept once seen)
  if (!d.totals.handle && username()) d.totals.handle = 1;
  const fresh = earnedNow(g, d.totals).filter((id) => !d.got[id]);
  if (!fresh.length) return [];
  const at = new Date().toISOString();
  for (const id of fresh) d.got[id] = { at, who: g?.player.name ?? '', ...(g ? { run: runOf(g) } : {}) };
  saveAch(d);
  return fresh.map((id) => ACHIEVEMENTS.find((a) => a.id === id)!);
}
