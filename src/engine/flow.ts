// The state machine. The UI and the balance harness both drive the game only
// through `newGame`, `prompt`, `choose` and `advance`.

import { syncMiniUnlocks } from './career/miniBonus';
import { startStory } from './story/cast';
import { openStory, resolveStory } from './story/chapters';
import { resolveArc } from './events/arcs';
import { resolveMilitary } from './career/nationality';
import { makeRng } from './rng';
import type { Decision, GameState, HalfPlan, Step } from './types';
import { createPlayer, type CreateInput } from './player/create';
import { ovrOf } from './player/ovr';
import { BASE_YEAR } from './economy/salary';
import { activeLeague, assignToGl, beginSeason, playHalf, runPostseason } from './career/season';
import { beginOffseason, resolveOffseasonDecision, retireNow } from './career/offseason';
import { endFarewell } from './career/farewell';
import { runWorldDraft } from './career/nbaYear';
import { resolveEvent } from './events/resolver';
import { resolveShop } from './economy/shop';
import { resolveNationalTeam } from './sim/tournaments';
import { assignOrigin, introText, rareLines, resolveYouth } from './career/origin';
import { openOnDraftNight, opensOnDraftNight } from './career/draftNight';
import { logDecision, milestone, pushMoment } from './career/common';
import { raftersTeams } from './awards/legacy';
import { UI } from '../content/strings';
import { bankGains, isLab, labState } from './career/lab';
import { prepareRecruit } from './career/recruit';
import { resolveBrand } from './career/nickname';
import { resolvePress } from './career/press';
import { LEVEL_IDS, allows, inLevel, levelChoice, levelDone, madeAllStar } from './levels';

export type Prompt =
  | { type: 'decision'; decision: Decision }
  | { type: 'advance'; label: string; step: Step }
  | { type: 'retired' };

export function newGame(seed: number, input: CreateInput): GameState {
  const rng = makeRng(seed);
  const player = createPlayer(rng, input);
  player.peakOvr = ovrOf(player.attrs, player.pos);
  const s: GameState = {
    version: 1,
    // fast break is a switch inside the game now (round 11), on top of a difficulty
    mode: input.mode === 'fast' ? 'standard' : (input.mode ?? 'standard'),
    seed,
    rng,
    nextId: 1,
    year: BASE_YEAR,
    step: 'preseason',
    stage: 'HS',
    hsYear: 1,
    ncaaYear: 0,
    transferUsed: false,
    player,
    contract: null,
    teamId: null,
    affiliateNbaId: null,
    league: null,
    nba: null,
    serviceYears: 0,
    nbaGames: 0,
    season: null,
    pending: [],
    history: [],
    awards: [],
    log: [],
    events: { lastSeen: {}, once: [] },
    draft: null,
    draftedBy: null,
    declared: false,
    undrafted: false,
    worldYearDone: null,
    retireRecommended: false,
    stars: 1,
    recruitRank: null,
    teamSeasons: {},
    rivals: {},
    feed: [],
    milestones: [],
    retiredAt: null,
    verdict: null,
    lastSummary: null,
    notes: [],
    nbaSnapshot: null,
    toast: null,
    moments: [],
    purchases: [],
    tournaments: [],
    nbaHistory: [],
    flags: {},
    schoolColor: '',
  };
  if (input.fast || input.mode === 'fast' || input.mode === 'lab') s.flags.fast = s.flags.quick = 1;
  // round 25 (owner): Rough Road, the hardest way to play, kept for the whole career
  if (input.oath && s.mode === 'reality' && !s.flags.fast) s.flags.oath = 1;
  // round 30 (owner): Comet, Shoot for the stars at hyper speed: fast break and sim, locked on
  if (input.comet && s.mode === 'stars') s.flags.comet = s.flags.fast = s.flags.sim = s.flags.quick = 1;
  if (s.mode === 'lab') labState(player);
  // round 33: a career on the road map (engine/levels.ts); beginner plays at fast break's pace
  if (input.level) {
    s.flags.level = LEVEL_IDS.indexOf(input.level) + 1;
    // every level plays at fast break's pace (owner: beginner 5-10 minutes, intermediate about
    // 10, advanced about 15); from intermediate on, the switch is his
    s.flags.fast = 1;
    // the road abroad is advanced's: below it he grows up in America
    if (!allows(s, 'roads')) player.country = 'USA';
  }
  // round 38: story mode's written hero grows up in America
  if (input.story) player.country = 'USA';
  // the game assigns his country, where he grows up and where he plays as a teenager
  assignOrigin(s);
  // round 35: a draft class's career opens on draft night instead (career/draftNight.ts)
  if (opensOnDraftNight(s, input)) openOnDraftNight(s, input);
  else freshmanYear(s, input);
  // round 38: story mode: his people, and the first page (the driveway)
  if (input.story && !input.level) {
    startStory(s, input);
    openStory(s);
  }
  // round 35: the start, for a challenge (a level career is never one)
  if (!input.level) s.start = { seed, input: JSON.parse(JSON.stringify(input)) as CreateInput };
  return s;
}

/** The usual start: freshman tryouts, then his first high school season (a level's first three
 * years are played for him). */
function freshmanYear(s: GameState, input: CreateInput): void {
  const player = s.player;
  const intro = introText(s);
  const start = ovrOf(player.attrs, player.pos);
  const ft = (x: number) => `${Math.floor(x / 12)}′${x % 12}″`;
  intro.lines.unshift(
    `Tryouts: ${start >= 48 ? 'well ahead of most kids his age' : start >= 44 ? 'ahead of most kids his age' : start >= 36 ? 'about where most kids his age are' : 'raw, behind most kids his age'}`,
    s.mode === 'lab'
      ? `${ft(player.height)} now; built to grow to ${ft(player.fullHeight)}`
      : `${ft(player.height)} now; the doctors think he will grow to about ${ft(player.heightProj)}, but nobody knows for sure`,
  );
  intro.lines.push(...rareLines(player, false));
  pushMoment(s, { kind: 'intro', title: player.highSchool, text: intro.text, color: s.schoolColor, lines: intro.lines });
  logDecision(s, 'start', `Enrolled at ${player.highSchool} in ${player.hometown} as a ${input.pos}, ${player.archetype}.`);
  beginSeason(s);
  if (s.flags.level) playEarlyYears(s);
}

/** Round 33: a level starts as a high school senior. The first three years are played for him
 * (plain, safe calls), and the career opens on the first page of his senior season. */
function playEarlyYears(s: GameState): void {
  for (let i = 0; i < 3000 && !(s.player.age >= 17 && s.step === 'preseason'); i++) {
    const pr = prompt(s);
    if (pr.type === 'retired') break;
    if (pr.type === 'advance') {
      advance(s);
      continue;
    }
    const d = pr.decision;
    const open = d.choices.filter((c) => !c.disabled);
    const id =
      d.kind === 'shop' ? 'leave'
      : d.kind === 'plan' ? (open.find((c) => c.id === 'balanced') ?? open[0]).id
      : d.kind === 'event' ? (open.find((c) => c.risk !== 'High') ?? open[0]).id
      : (levelChoice(s, d) ?? open[0].id);
    choose(s, id);
  }
  const p = s.player;
  const ft = (x: number) => `${Math.floor(x / 12)}′${x % 12}″`;
  s.moments = [];
  s.toast = null;
  s.result = null;
  s.notes = [];
  delete s.simCalls;
  pushMoment(s, {
    kind: 'intro',
    title: p.highSchool,
    color: s.schoolColor,
    text: `Senior year. Three seasons at ${p.highSchool} are behind you, and this is the one the colleges are watching.`,
    lines: [`${ft(p.height)} now; the doctors think he will reach about ${ft(p.heightProj)}`, `Recruiting: ${'★'.repeat(Math.max(1, s.stars))} so far`, 'One season of high school, one of college, then the draft'],
  });
}

export function prompt(s: GameState): Prompt {
  if (s.step === 'retired') return { type: 'retired' };
  // a decision with nothing to pick would soft-lock the game; drop it
  while (s.pending.length > 0 && !s.pending[0].choices.some((c) => !c.disabled)) s.pending.shift();
  if (s.pending.length > 0) return { type: 'decision', decision: s.pending[0] };
  switch (s.step) {
    case 'preseason':
    case 'firstHalf':
      return { type: 'advance', label: UI.hub.playFirst, step: s.step };
    case 'midseason':
    case 'secondHalf':
      return { type: 'advance', label: UI.hub.playSecond, step: s.step };
    case 'summary':
      return { type: 'advance', label: UI.hub.toOffseason, step: s.step };
    case 'postseason':
      return { type: 'advance', label: 'Continue the postseason', step: s.step };
    case 'offseason':
      return { type: 'advance', label: UI.hub.nextSeason(s.year + 1), step: s.step };
  }
  return { type: 'retired' };
}

export function choose(s: GameState, choiceId: string): void {
  const before = isLab(s) ? { ...s.player.attrs } : null;
  chooseInner(s, choiceId);
  settleLevel(s);
  if (before) bankGains(s, before);
  prepareRecruit(s);
  syncMiniUnlocks(s);
}

function chooseInner(s: GameState, choiceId: string): void {
  const d = s.pending.shift();
  if (!d) return;
  // plans may come as two ids joined by '+'; a last possession as the call and its timing joined by '@' (round 25)
  const ids = d.kind === 'plan' ? choiceId.split('+').slice(0, 2) : d.kind === 'live' ? [choiceId.split('@')[0]] : [choiceId];
  const c = ids.every((id) => d.choices.some((x) => x.id === id && !x.disabled)) ? d.choices.find((x) => x.id === ids[0]) : undefined;
  if (!c || c.disabled) {
    s.pending.unshift(d);
    return;
  }
  s.toast = null;
  s.result = null;
  // round 30: sim mode's calls and a Comet's highlights last until the next move
  delete s.simCalls;
  delete s.reel;
  switch (d.kind) {
    case 'plan':
      s.season!.plan = ids[0] as HalfPlan;
      s.season!.plan2 = ids[1] && ids[1] !== ids[0] ? (ids[1] as HalfPlan) : null;
      s.season!.plans.push(s.season!.plan);
      if (s.season!.plan2) s.season!.plans.push(s.season!.plan2);
      return;
    case 'event':
      s.toast = resolveEvent(s, d, choiceId) || null;
      return;
    case 'national':
      s.toast = resolveNationalTeam(s, d.data ?? {}, choiceId);
      return;
    case 'youth':
      s.toast = resolveYouth(s, d, choiceId) || null;
      return;
    case 'military':
      s.toast = resolveMilitary(s, choiceId);
      return;
    case 'arc':
      s.toast = resolveArc(s, d, choiceId) || null;
      return;
    case 'story':
      s.toast = resolveStory(s, d, choiceId);
      return;
    case 'live':
      if (s.postSnap) {
        s.postSnap.picks.push(choiceId);
        runPostseason(s);
      }
      return;
    case 'shop':
      s.toast = resolveShop(s, d, choiceId);
      return;
    case 'brand':
      s.toast = resolveBrand(s, d, choiceId);
      return;
    case 'press':
      s.toast = resolvePress(s, d, choiceId);
      return;
    case 'assign':
      if (choiceId === 'go') {
        assignToGl(s);
        logDecision(s, 'assign', 'Asked to be sent to the G League for minutes.');
      }
      return;
  }
  resolveOffseasonDecision(s, d, choiceId);
  if (s.step === 'retired') finishCareer(s);
}

export function advance(s: GameState): void {
  const before = isLab(s) ? { ...s.player.attrs } : null;
  advanceInner(s);
  settleLevel(s);
  if (before) bankGains(s, before);
  prepareRecruit(s);
  syncMiniUnlocks(s);
}

function advanceInner(s: GameState): void {
  if (s.pending.length > 0 || s.step === 'retired') return;
  s.toast = null;
  s.result = null;
  delete s.simCalls;
  delete s.reel;
  switch (s.step) {
    case 'preseason':
    case 'firstHalf':
    case 'midseason':
    case 'secondHalf':
      playHalf(s);
      return;
    case 'postseason':
      runPostseason(s);
      return;
    case 'summary': {
      // round 33: a level's career ends once its NBA seasons are played
      if (levelDone(s)) {
        s.flags.levelEnd = madeAllStar(s) ? 2 : 1;
        retireNow(s, madeAllStar(s) ? 'The level is done: an NBA All-Star, as the goal asked.' : 'The level is done, short of the All-Star goal.');
        finishCareer(s);
        return;
      }
      // round 32: the last season of a farewell tour ends with its gifts, then he retires
      const bye = s.flags.farewell === s.year;
      if (bye) endFarewell(s);
      beginOffseason(s);
      if (bye && (s.step as Step) !== 'retired') retireNow(s, 'Said goodbye on a farewell tour, every arena on its feet.');
      if ((s.step as Step) === 'retired') finishCareer(s);
      return;
    }
    case 'offseason':
      if (s.nba && s.worldYearDone !== s.year) {
        runWorldDraft(s, null);
        s.worldYearDone = s.year;
      }
      s.year += 1;
      beginSeason(s);
      return;
  }
}

/** The UI calls this after showing the front story page. */
export function dismissMoment(s: GameState): void {
  s.moments.shift();
}

/** A new jersey number, between seasons. */
export function changeNumber(s: GameState, n: number): void {
  if (s.step !== 'offseason' && s.step !== 'summary') return;
  const num = Math.round(n);
  if (!Number.isFinite(num) || num < 0 || num > 99 || num === s.player.number) return;
  logDecision(s, 'number', `Switched from number ${s.player.number} to ${num}.`);
  s.player.number = num;
  s.toast = `You will wear number ${num} next season.`;
}

/** Retiring by choice: possible between any two seasons (season summary or offseason). */
export function canRetire(s: GameState): boolean {
  // once his playing days are a job (after high school or a youth academy)
  // round 33: a level is played to its end (owner: "they also cant quit")
  return (s.step === 'summary' || s.step === 'offseason') && s.stage !== 'HS' && !inLevel(s);
}

export function retireByChoice(s: GameState): void {
  if (!canRetire(s)) return;
  s.moments = [];
  retireNow(s, s.player.age < 30 ? 'Walked away early, on his own terms.' : 'Chose to call it a career.');
  finishCareer(s);
}

/** Round 33: the calls a level makes for him (levels.ts levelChoice), taken as soon as they
 * reach the front of the queue, so they never wait on screen. */
function settleLevel(s: GameState): void {
  if (!s.flags.level) return;
  for (let i = 0; i < 50 && s.pending.length > 0 && s.step !== 'retired'; i++) {
    const id = levelChoice(s, s.pending[0]);
    if (!id) return;
    chooseInner(s, id);
  }
}

function finishCareer(s: GameState): void {
  if (raftersTeams(s).length > 0) milestone(s, 'rafters');
}

export { activeLeague };
export { canChangePosition, changePosition, heightMismatch, positionOptions } from './career/position';
export { canChangeFocus, changeFocus } from './career/focus';
export { canRequestTrade, requestTrade } from './career/team';
export { labCost, spendCredits } from './career/lab';
export type { CreateInput };
