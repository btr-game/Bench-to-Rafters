// The state machine. The UI and the balance harness both drive the game only
// through `newGame`, `prompt`, `choose` and `advance`.

import { resolveMilitary } from './career/nationality';
import { ANOMALIES } from './player/anomaly';
import { makeRng } from './rng';
import type { Decision, GameState, HalfPlan, Step } from './types';
import { createPlayer, type CreateInput } from './player/create';
import { ovrOf } from './player/ovr';
import { BASE_YEAR } from './economy/salary';
import { activeLeague, assignToGl, beginSeason, playHalf, runPostseason } from './career/season';
import { beginOffseason, resolveOffseasonDecision, retireNow } from './career/offseason';
import { runWorldDraft } from './career/nbaYear';
import { resolveEvent } from './events/resolver';
import { resolveShop } from './economy/shop';
import { resolveNationalTeam } from './sim/tournaments';
import { assignOrigin, introText, resolveYouth } from './career/origin';
import { logDecision, milestone, pushMoment } from './career/common';
import { raftersTeams } from './awards/legacy';
import { UI } from '../content/strings';

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
    mode: input.mode ?? 'standard',
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
  // the game assigns his country, where he grows up and where he plays as a teenager
  assignOrigin(s);
  const intro = introText(s);
  const start = ovrOf(player.attrs, player.pos);
  const ft = (x: number) => `${Math.floor(x / 12)}′${x % 12}″`;
  intro.lines.unshift(
    `Tryouts: ${start >= 48 ? 'well ahead of most kids his age' : start >= 44 ? 'ahead of most kids his age' : start >= 36 ? 'about where most kids his age are' : 'raw, behind most kids his age'}`,
    `${ft(player.height)} now; the doctors think he will grow to about ${ft(player.heightProj)}, but nobody knows for sure`,
  );
  const gift = ANOMALIES.find((a) => a.name === player.anomaly);
  if (gift) intro.lines.push(`A rare one: ${gift.name.toLowerCase()}. ${gift.text}.`);
  pushMoment(s, { kind: 'intro', title: player.highSchool, text: intro.text, color: s.schoolColor, lines: intro.lines });
  logDecision(s, 'start', `Enrolled at ${player.highSchool} in ${player.hometown} as a ${input.pos}, ${player.archetype}.`);
  beginSeason(s);
  return s;
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
  const d = s.pending.shift();
  if (!d) return;
  // plans may come as two ids joined by '+'
  const ids = d.kind === 'plan' ? choiceId.split('+').slice(0, 2) : [choiceId];
  const c = ids.every((id) => d.choices.some((x) => x.id === id && !x.disabled)) ? d.choices.find((x) => x.id === ids[0]) : undefined;
  if (!c || c.disabled) {
    s.pending.unshift(d);
    return;
  }
  s.toast = null;
  s.result = null;
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
    case 'live':
      if (s.postSnap) {
        s.postSnap.picks.push(choiceId);
        runPostseason(s);
      }
      return;
    case 'shop':
      s.toast = resolveShop(s, d, choiceId);
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
  if (s.pending.length > 0 || s.step === 'retired') return;
  s.toast = null;
  s.result = null;
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
    case 'summary':
      beginOffseason(s);
      if ((s.step as Step) === 'retired') finishCareer(s);
      return;
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
  return (s.step === 'summary' || s.step === 'offseason') && s.stage !== 'HS';
}

export function retireByChoice(s: GameState): void {
  if (!canRetire(s)) return;
  s.moments = [];
  retireNow(s, s.player.age < 30 ? 'Walked away early, on his own terms.' : 'Chose to call it a career.');
  finishCareer(s);
}

function finishCareer(s: GameState): void {
  if (raftersTeams(s).length > 0) milestone(s, 'rafters');
}

export { activeLeague };
export { canChangePosition, changePosition, heightMismatch, positionOptions } from './career/position';
export { canChangeFocus, changeFocus } from './career/focus';
export type { CreateInput };
