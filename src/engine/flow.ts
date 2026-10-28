// The state machine. The UI and the balance harness both drive the game only
// through `newGame`, `prompt`, `choose` and `advance`.

import { int, makeRng, pick } from './rng';
import { HOMETOWN_SCHOOLS } from '../content/teams';
import type { Decision, GameState, HalfPlan, Step } from './types';
import { createPlayer, type CreateInput } from './player/create';
import { ovrOf } from './player/ovr';
import { BASE_YEAR } from './economy/salary';
import { activeLeague, assignToGl, beginSeason, playHalf } from './career/season';
import { beginOffseason, resolveOffseasonDecision } from './career/offseason';
import { runWorldDraft } from './career/nbaYear';
import { resolveEvent } from './events/resolver';
import { logDecision, milestone, pushMoment } from './career/common';
import { raftersTeams } from './awards/legacy';
import { NAMES, UI } from '../content/strings';

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
    schoolColor: '',
  };
  // the game assigns where he grows up and goes to school
  const home = HOMETOWN_SCHOOLS[int(rng, 0, HOMETOWN_SCHOOLS.length - 1)];
  if (!player.hometown) player.hometown = home.town;
  if (!player.highSchool) player.highSchool = pick(rng, home.schools);
  s.schoolColor = pick(rng, home.colors);
  pushMoment(s, {
    kind: 'intro',
    title: player.highSchool,
    text: `${player.name} grew up in ${player.hometown}. This fall he walks into ${player.highSchool} as a 14-year-old freshman ${NAMES.pos[player.pos].toLowerCase()}, number ${player.number}.`,
    color: s.schoolColor,
    lines: ['Freshman tryouts are next week.', 'JV or varsity: your spot depends on where you rank on the roster.'],
  });
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
    case 'offseason':
      return { type: 'advance', label: UI.hub.nextSeason(s.year + 1), step: s.step };
  }
  return { type: 'retired' };
}

export function choose(s: GameState, choiceId: string): void {
  const d = s.pending.shift();
  if (!d) return;
  const c = d.choices.find((x) => x.id === choiceId);
  if (!c || c.disabled) {
    s.pending.unshift(d);
    return;
  }
  s.toast = null;
  switch (d.kind) {
    case 'plan':
      s.season!.plan = choiceId as HalfPlan;
      s.season!.plans.push(s.season!.plan);
      return;
    case 'event':
      s.toast = resolveEvent(s, d, choiceId) || null;
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
  switch (s.step) {
    case 'preseason':
    case 'firstHalf':
    case 'midseason':
    case 'secondHalf':
      playHalf(s);
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

function finishCareer(s: GameState): void {
  if (raftersTeams(s).length > 0) milestone(s, 'rafters');
}

export { activeLeague };
export type { CreateInput };
