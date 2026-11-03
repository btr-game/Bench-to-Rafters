// The in-season loop: preseason → first half → midseason → second half + postseason.

import { midseasonSwing, startTeamFactors, winningEdge } from './team';
import { palsOn } from './friends';
import { storySeason } from '../story/pals';
import { pushStory } from '../story/chapters';

import { evaluateBreakthrough, updateHighs } from './breakthrough';
import { markGames } from './marks';
import { edgeOf, youthGrowthMult } from './nationality';
import {
  WEAR,
  WEIGHT,
  ATTR_MAX,
  HEIGHT_LIMITS,
  GAME_POINTS,
  GROWTH_RATE,
  MODES, FAST_GROWTH,
  AGENT_CUT,
  FORM,
  blendPlans,
  MORALE_PERF,
  PLAN_OUTCOMES,
  PLAN_SETBACK_TEXT,
  HS_VARSITY_SIZE,
  IMPACT_MULT,
  LEVELS,
  RECRUIT,
  ROLE_MINUTES,
  TEAM_FACTORS,
  LONGEVITY,
  FAREWELL,
  RECORD_CHASE, ALL_STAR_BAR } from '../balance';
import { chance, clamp, int, normal, range, weightedIndex, type Rng } from '../rng';
import type { Attrs, GameLog, GameState, HalfPlan, League, LevelKey, RoleKey, SeasonRecord, SeasonState, StatLine, Team } from '../types';
import { inLevel, levelGrowth, levelOf, planStyle, shotDue } from '../levels';
import { ovrOf } from '../player/ovr';
import { applyHalfGrowth, eliteMult, perfFactor } from '../player/growth';
import { healDays, rollInjury } from '../player/injury';
import { scoutEstimate } from '../player/create';
import {
  addLine,
  emptyLine,
  expected,
  expectedGameScore,
  gameScore,
  perGame,
  sampleGame,
  sumLines,
  usageWeight,
  valuePerGame,
  type Profile,
} from '../sim/statModel';
import { accumulateHalf, resetSeasonLines, teamUsageMean, type UserSlot } from '../sim/genStats';
import type { SeriesCtx } from '../sim/leagueSim';
import {
  bracketExit,
  euPlayoffs,
  glPlayoffs,
  hsPlayoffs,
  marchMadness,
  nbaPlayoffs,
  playRounds,
  standings,
  winProb,
  type UserGameHook,
} from '../sim/leagueSim';
import { buildEu, buildGl, buildHs, buildInt, buildNba, buildNcaa, schoolRoster, USER_SCHOOL_ID } from '../world/leagues';
import { rosterStrength } from '../world/gen';
import { buildCandidates, nbaAwards, simpleAwards, type AwardOutcome } from '../awards/awards';
import { playoffMvps, postseasonRecap, recordNbaYear } from '../awards/playoffs';
import { pathOf } from './origin';
import { NeedLive, gameRequest, nextPick, playLiveGame } from './live';
import { adjust, conferenceRank, milestone, note, ordinal, pushDecision, pushMoment, rankOnRoster, roleWithTrust, teamById, userOvr } from './common';
import { queueMidseasonEvents } from '../events/resolver';
import { allStarWeekend, conferenceTournament, hsNationals, mcdonaldsGame, nbaCup, nbaPreseason } from '../sim/tournaments';
import { quickNbaSeason, warmUpNba } from './nbaYear';
import { reactionsForSeason } from '../story/reactions';
import { finishStories, startStories, updateStories } from '../world/stories';
import { changeWeight, halfPlanWeight, weightWear } from '../player/weight';
import { recordInjury, trainMuscles } from '../player/body';
import { cityHalf } from './cityCulture';
import { duoEffect, growBonds } from './duo';
import { meetFriends } from './friends';
import { friendCandidates, friendGame } from './friendLeague';
import { askRivalSeries, rivalSeriesFx, rivalSeriesGame, rivalSeriesPossible } from './rivalSeries';
import { NAMES } from '../../content/strings';
import { awardNickname, payBrand } from './nickname';
import { rollFine } from './fines';
import { payStaff } from './staff';
import { updateRivalry } from './rivalry';
import { writeNews } from './news';
import { coachOfYear, temperFx, temperNote } from './coach';
import { addTouch, touchOf } from '../player/touch';

/** What he adds to winning beyond his OVR, scaled by his share of the game (career/team.ts). */
const edgeFor = (a: Attrs, ovr: number, share: number, post: boolean): number => {
  const e = winningEdge(a, ovr);
  return (post ? e.playoff : e.regular) * Math.min(1, share);
};

export function activeLeague(s: GameState): League {
  return (s.stage === 'NBA' ? s.nba : s.league)!;
}

export function userProfile(s: GameState): Profile {
  const p = s.player;
  // lefties get a small edge: defenders rarely see the left hand
  return { attrs: p.attrs, height: p.height, wingspan: p.wingspan, range: p.range, offhand: p.offhand + (p.hand === 'L' ? 6 : 0), touch: touchOf(p) };
}

// ---------- preseason ----------

export function beginSeason(s: GameState): void {
  s.notes = [];
  growBonds(s, null);
  const ovr = userOvr(s);
  let league: League;
  let teamId: string;
  let level: LevelKey;
  if (s.stage === 'HS') {
    const school = schoolRoster(s);
    const schoolRank = 1 + school.filter((g) => g.ovr > ovr).length;
    const varsity = schoolRank <= HS_VARSITY_SIZE;
    const squad = varsity ? school.slice(0, HS_VARSITY_SIZE - 1) : school.slice(HS_VARSITY_SIZE, HS_VARSITY_SIZE * 2);
    league = buildHs(s, s.year, varsity, squad, rosterStrength(squad));
    teamId = USER_SCHOOL_ID;
    level = varsity ? 'HSV' : 'HSJV';
    milestone(s, varsity ? 'varsity' : 'jv');
    if (varsity) milestone(s, 'jv');
    s.league = league;
  } else if (s.stage === 'NBA') {
    league = s.nba!;
    resetSeasonLines(league);
    teamId = s.teamId!;
    level = 'NBA';
    s.league = null;
  } else {
    teamId = s.teamId!;
    level = s.stage as LevelKey;
    league =
      s.stage === 'NCAA' ? buildNcaa(s, s.year, teamId) : s.stage === 'GL' ? buildGl(s, s.year, teamId) : s.stage === 'INT' ? buildInt(s, s.year, teamId) : buildEu(s, s.year, teamId);
    s.league = league;
  }
  league.userTeamId = teamId;
  s.teamId = teamId;
  const team = teamById(league, teamId)!;
  const rank = rankOnRoster(team, ovr);
  const role = roleWithTrust(rank, s.player.trust);
  const season: SeasonState = {
    year: s.year,
    level,
    half: 0,
    plan: 'balanced',
    plans: [],
    role,
    roleRank: rank,
    games: [],
    postGames: [],
    ovrStart: ovr,
    attrsStart: { ...s.player.attrs },
    ...(() => {
      const f = startTeamFactors(s, team, league);
      const d = duoEffect(s);
      // round 32: a farewell season, and the team plays the playoffs for him
      const bye = s.flags.farewell === s.year && level === 'NBA' ? FAREWELL.post : 0;
      // round 32: the head coach's temperament (a loose room, a playoff plan, the grind)
      const fx = temperFx(s);
      const notes = [...f.notes, ...(bye ? [`Farewell tour: the team wants one last run for you in the playoffs (+${bye})`] : []), ...(fx ? [temperNote(s, fx)] : [])];
      return { teamBonus: f.bonus + (fx?.chem ?? 0), teamNotes: notes, teamFx: f.items, postBonus: f.post + bye + (fx?.post ?? 0), styleFx: f.fx, duoFx: d ? { perf: d.perf, ast: d.ast, usage: d.usage } : undefined };
    })(),
    halfLines: [],
    injuredGames: 0,
    midReport: [],
    assignedGL: false,
    summary: null,
  };
  s.season = season;
  s.step = 'preseason';
  startStories(s, league);
  // round 38: story mode's friend and rival move on a year (their lines feed meetFriends), and a
  // chapter that opens a season
  storySeason(s);
  pushStory(s, 'start');
  meetFriends(s);
  pushPlanDecision(s, 1);
}

type PlanText = { id: HalfPlan; label: string; detail: string };
/** The plans' names and what they do (round 40: the screens show them in the player's language, scripts/i18n.ts lists them). */
export const PLAN_TEXT: Record<HalfPlan, PlanText> = {
  balanced: { id: 'balanced', label: 'Balanced', detail: 'Steady work, normal risk.' },
  grind: { id: 'grind', label: 'Grind', detail: 'Work harder than anyone. Faster development, much more wear on your body, burnout possible.' },
  recovery: { id: 'recovery', label: 'Recovery', detail: 'Ease off. Slower development, far fewer injuries, heal faster, feel better.' },
  spotlight: { id: 'spotlight', label: 'Spotlight', detail: 'Hunt shots and attention. Fame and money, and your shooting and finishing can jump, or slump. Less feel for the game, a more selfish locker room, more injury risk; coaches and teammates notice.' },
  teamfirst: { id: 'teamfirst', label: 'Team first', detail: 'Make the right play. Fewer shots for you, but the team plays better in your games and the chemistry lasts all season. A little more feel for the game, fewer injuries, and the coach loves it.' },
  shooting: { id: 'shooting', label: 'Shooting lab', detail: 'Live in the gym with a shooting coach. Your jumper, your range and your free throws get the reps; the rest waits.' },
  strength: { id: 'strength', label: 'Weight room', detail: 'Get stronger and more explosive inside. A bit more injury risk.' },
  playmaking: { id: 'playmaking', label: 'Film and reads', detail: 'Study the game. Passing and feel improve; coaches trust you more.' },
  defense: { id: 'defense', label: 'Lockdown', detail: 'Make defense your identity. Coaches notice.' },
  offhand: { id: 'offhand', label: 'Off-hand work', detail: 'Drill your weak hand every day. Finishing with both hands; little else grows.' },
  speed: { id: 'speed', label: 'Speed and agility', detail: 'Sprints, footwork and conditioning: athleticism, perimeter defense and finishing, and you drop a lot of weight. Slightly more injury risk.' },
  mentor: { id: 'mentor', label: 'Learn from a vet', detail: 'Shadow a veteran: basketball IQ, defensive habits and a cleaner jumper. Easy on the body; the coach likes it.' },
};
const PLAN_IDS = Object.keys(PLAN_TEXT) as HalfPlan[];
/** Fast break: five training groups, one a season. */
export const FAST_PLANS: PlanText[] = [
  { id: 'balanced', label: 'General', detail: 'A bit of everything. Every rating grows at a normal pace.' },
  { id: 'strength', label: 'Weight room', detail: 'Strength and explosiveness: finishing, rebounding, athleticism and rim protection. A bit more injury risk.' },
  { id: 'shooting', label: 'Shooting', detail: 'Your jumper, your range and your free throws get the reps; the rest waits.' },
  { id: 'defense', label: 'Defense', detail: 'Perimeter and interior defense. Coaches notice.' },
  { id: 'playmaking', label: 'IQ', detail: 'Film, reads and passing: playmaking and basketball IQ. Coaches trust you more.' },
];
/** Built in a lab: how hard to work, since the player picks the ratings himself. */
export const LAB_PLANS: PlanText[] = [
  { id: 'balanced', label: 'Steady', detail: 'Normal credits, normal risk.' },
  { id: 'grind', label: 'Grind', detail: 'More credits, much more wear on your body, burnout possible.' },
  { id: 'recovery', label: 'Recovery', detail: 'Fewer credits, far fewer injuries, heal faster, feel better.' },
  { id: 'spotlight', label: 'Spotlight', detail: 'Hunt shots and attention. More fame and money; fewer credits, more injury risk, a more selfish locker room.' },
  { id: 'teamfirst', label: 'Team first', detail: 'Make the right play. Fewer shots, the team plays better all season, fewer injuries, the coach loves it.' },
];

/** Round 33: the beginner level's six plans (owner: "balanced, grind, shooting lab, weight room,
 * film and reads, and lockdown"), picked once a season. */
export const SIX_PLANS: HalfPlan[] = ['balanced', 'grind', 'shooting', 'strength', 'playmaking', 'defense'];

export function pushPlanDecision(s: GameState, half: 1 | 2): void {
  const injured = !!s.player.injury && s.player.injury.key !== 'dtd';
  // round 33: the road map's levels pick a plan once a season (levels.ts planStyle)
  const style = planStyle(s);
  if (style !== 'half') {
    const list = style === 'six' ? (injured ? [...SIX_PLANS, 'recovery' as HalfPlan] : SIX_PLANS).map((id) => PLAN_TEXT[id]) : PLAN_IDS.map((id) => PLAN_TEXT[id]);
    pushDecision(s, {
      kind: 'plan',
      title: 'Season plan',
      text: injured
        ? 'You are injured. Recovery is the only plan available.'
        : style === 'six'
          ? 'Pick one plan for the whole season.'
          : 'Pick one or two plans for the whole season. One plan alone works a little better than its listing; add a second and the first keeps most of its effect while the side plan adds a smaller boost.',
      choices: list.map((p) => ({ id: p.id, label: p.label, detail: p.detail, disabled: injured && p.id !== 'recovery' })),
      data: { half, ...(style === 'six' ? { single: true } : {}), season: true },
    });
    return;
  }
  // fast break (round 8): one plan a season from five training groups; the lab has no
  // rating groups (the player buys ratings himself), so it picks how hard to work instead
  const quick = s.flags.fast && !inLevel(s) ? (s.mode === 'lab' ? LAB_PLANS : FAST_PLANS) : null;
  if (quick) {
    const list = injured && !quick.some((p) => p.id === 'recovery') ? [...quick, PLAN_TEXT.recovery] : quick;
    pushDecision(s, {
      kind: 'plan',
      title: 'Season plan',
      text: injured
        ? 'You are injured. Recovery is the only plan available.'
        : s.mode === 'lab'
          ? 'How hard do you work this season? Training pays out lab credits; spend them on any rating.'
          : 'Pick one plan for the season.',
      choices: list.map((p) => ({ id: p.id, label: p.label, detail: p.detail, disabled: injured && p.id !== 'recovery' })),
      data: { half, single: true },
    });
    return;
  }
  const plans = PLAN_IDS.map((id) => PLAN_TEXT[id]);
  pushDecision(s, {
    kind: 'plan',
    title: half === 1 ? 'First-half plan' : 'Second-half plan',
    text: injured ? 'You are injured. Recovery is the only plan available.' : 'Pick one or two plans for the next half. One plan alone works a little better than its listing (focused work); add a second and the first keeps most of its effect while the side plan adds a smaller boost.',
    choices: plans.map((p) => ({ id: p.id, label: p.label, detail: p.detail, disabled: injured && p.id !== 'recovery' })),
    data: { half },
  });
}

// ---------- user games ----------

interface HalfAcc {
  minutes: number;
  games: number;
  played: number;
  gmsc: number;
  expGmsc: number;
  injuredGames: number;
  line: StatLine;
}

const newAcc = (): HalfAcc => ({ minutes: 0, games: 0, played: 0, gmsc: 0, expGmsc: 0, injuredGames: 0, line: emptyLine() });

function rollMinutes(rng: Rng, role: RoleKey, level: LevelKey, post: boolean): number {
  const len = LEVELS[level].gameLen;
  const [a, b] = ROLE_MINUTES[role];
  if (role === 'deep') return int(rng, a, b);
  const bump = post && (role === 'key' || role === 'starter') ? 2 : 0;
  return clamp(Math.round(((range(rng, a, b) + bump) * len) / 48), 0, len);
}


function makeHook(s: GameState, league: League, level: LevelKey, acc: HalfAcc, slot: UserSlot): UserGameHook {
  const L = LEVELS[level];
  const team = teamById(league, league.userTeamId)!;
  const sorted = [...team.roster].sort((a, b) => b.ovr - a.ovr);
  const replacement = sorted[Math.min(sorted.length - 1, Math.max(0, slot.rank - 1))]?.ovr ?? L.avg;
  const usageMean = teamUsageMean(level, team.roster, slot);
  const daysPerGame = L.seasonDays / L.games;
  /** Round 35: his team's strength in a playoff game with him on the floor at his role's usual
   * minutes, as the simulated games reckon it (the odds of a rival series, career/rivalSeries.ts). */
  const playoffStrength = (): number => {
    const season = s.season!;
    const p = s.player;
    const ovr = ovrOf(p.attrs, p.pos);
    const [a, b] = ROLE_MINUTES[season.role];
    const share = Math.min(1, ((a + b) / 2 + (season.role === 'key' || season.role === 'starter' ? 2 : 0)) / 48);
    const plan = blendPlans(season.plan, season.plan2, p.age);
    return team.strength + (season.teamBonus ?? 0) + (season.postBonus ?? 0) + (ovr - replacement) * share * IMPACT_MULT + edgeFor(p.attrs, ovr, share, true) + plan.teamBoost - TEAM_FACTORS.playoffGrind;
  };
  const hook: UserGameHook = (opp: Team, home: boolean, post?: string, series?: SeriesCtx) => {
    const season = s.season!;
    const p = s.player;
    const rng = s.rng;
    const ovr = ovrOf(p.attrs, p.pos);
    let line: StatLine | null = null;
    let minutes = 0;
    // a playable postseason game? (only inside a postseason replay, and only if he can play)
    let live = false;
    let liveResult: { us: number; them: number; win: boolean; lastShot?: string } | null = null;
    if (post && s.live && !(p.injury && p.injury.key !== 'dtd')) {
      const key = `${post}|${opp.id}`;
      // round 35: his rival classmate's team in a playoff series: the call for the series first
      if (s.mp?.rival && level === 'NBA') askRivalSeries(s, opp, post, home, series, playoffStrength());
      // beginner's one last shot: the first game he plays, then the rest are simulated
      if (s.live.shot) live = !s.flags.levelShot;
      else if (!s.live.simAll && s.live.simSeries !== key) {
        const pick = nextPick(s, gameRequest(s, post, opp.name, home || level !== 'NBA', series));
        if (pick === 'play') live = true;
        else if (pick === 'series') s.live.simSeries = key;
        else if (pick === 'all') s.live.simAll = true;
        else if (pick === 'always') {
          s.live.simAll = true;
          s.flags.simPostseason = 1;
        }
      }
    }
    // round 35: classmates in this game (career/friendLeague.ts): their lines, the lift the ones on
    // the other team give it, and a rival series' call (career/rivalSeries.ts)
    const rs = post && s.live?.rival ? rivalSeriesFx(s, post, opp) : null;
    const fr = level === 'NBA' && palsOn(s) ? friendGame(s, team, opp, (post ? season.postGames : season.games).length + 1, post, rs ? { id: rs.id, by: rs.cut } : undefined) : null;
    const oppStrength = fr ? opp.strength + fr.nudge : opp.strength;
    let hot = 0;
    acc.games++;
    const plan = blendPlans(season.plan, season.plan2, p.age);
    // hot and cold nights, inside a streaky rhythm for the half
    const form = clamp(normal(rng, 1, FORM.gameSd) * (season.rhythm ?? 1), FORM.min, FORM.max);
    if (p.injury && p.injury.key !== 'dtd') {
      acc.injuredGames++;
      season.injuredGames++;
    } else if (s.flags.suspendGames > 0 && !post) {
      // serving a suspension
      s.flags.suspendGames -= 1;
    } else if (!season.ineligibleHalf || post) {
      minutes = rollMinutes(rng, season.role, level, !!post);
      if (p.injury && p.injury.key === 'dtd') minutes = chance(rng, 0.5) ? 0 : Math.round(minutes * 0.85);
      if (minutes > 0) {
        const duo = season.duoFx;
        const moraleMult = MORALE_PERF(p.morale) * (1 + (form - 1) * FORM.shootingShare) * (season.styleFx?.perf ?? 1) * (duo?.perf ?? 1);
        const usage = (usageWeight(p.attrs) / usageMean) * (season.fuel ? 1.06 : 1) * plan.usage * Math.pow(form, 0.8) * (season.styleFx?.usage ?? 1) * (duo?.usage ?? 1) * (s.flags.chase === s.year ? 1 + RECORD_CHASE.usage : 1) * (rs ? rs.usage : 1);
        const e = expected(userProfile(s), level, minutes, usage, moraleMult);
        if (duo) e.ast *= duo.ast;
        const started = season.role === 'key' || season.role === 'starter';
        if (live) {
          const impact = (ovr - replacement) * (minutes / L.gameLen) * IMPACT_MULT;
          const r = playLiveGame(s, {
            e,
            started,
            level,
            my: team.strength + (season.teamBonus ?? 0) + (post ? (season.postBonus ?? 0) : 0) + impact + edgeFor(p.attrs, ovr, minutes / L.gameLen, true) + plan.teamBoost - (level === 'NBA' ? TEAM_FACTORS.playoffGrind : 0) + (rs ? rs.edge : 0),
            opp: oppStrength,
            oppName: opp.name,
            homeAdv: level !== 'NBA' ? 0 : home ? 1 : -1,
            round: post!,
            series,
          });
          line = r.line;
          liveResult = r;
        } else {
          line = sampleGame(rng, e, started);
          // a duel in a rival series: his night moves the game more
          if (rs?.hot) hot = clamp((gameScore(line) - expectedGameScore(e)) * rs.hot, -rs.hotMax, rs.hotMax);
        }
        acc.expGmsc += expectedGameScore(e);
        acc.gmsc += gameScore(line);
        acc.minutes += minutes;
        acc.played++;
        addLine(acc.line, line);
        const inj = rollInjury(rng, p, plan, s.flags.chase === s.year ? minutes * (1 + RECORD_CHASE.injury) : minutes);
        if (inj) recordInjury(p, inj, s.year);
        rollFine(s, season, rng, opp.short);
        if (inj && (inj.key === 'major' || inj.key === 'season')) {
          pushMoment(s, {
            kind: 'injury',
            title: inj.name,
            color: '#5a1a1a',
            text:
              inj.key === 'season'
                ? `Season over. ${p.name} goes down against ${opp.short} and the scan confirms it: ${inj.name.toLowerCase()}. A long road back, and it may never be quite the same.`
                : `${p.name} goes down against ${opp.short}. ${inj.name}: out about ${Math.round(inj.daysOut / 7)} weeks.`,
            lines: [
              `OVR ${Math.round(ovrOf(p.attrs, p.pos) + (inj.ovrLoss ?? 0))} → ${Math.round(ovrOf(p.attrs, p.pos))}`,
              ...(inj.key === 'season' ? ['More injury-prone from now on', 'His ceiling may have dropped'] : ['Athleticism took a hit']),
            ],
          });
        }
      }
    }
    healDays(p, daysPerGame * (season.plan === 'recovery' || season.plan2 === 'recovery' ? 1.3 : 1));
    const impact = line ? (ovr - replacement) * (minutes / L.gameLen) * IMPACT_MULT : 0;
    // what he adds to winning beyond his OVR: defense, playmaking, 3&D (career/team.ts)
    const boost = line ? plan.teamBoost + edgeFor(p.attrs, ovr, minutes / L.gameLen, !!post) : 0;
    let win: boolean;
    let us: number;
    let them: number;
    if (liveResult) ({ win, us, them } = liveResult);
    else {
      // round 22: in the NBA playoffs every opponent raises its game (titles are harder)
      const grind = post && level === 'NBA' ? TEAM_FACTORS.playoffGrind : 0;
      win = chance(rng, winProb(team.strength + (season.teamBonus ?? 0) + (post ? (season.postBonus ?? 0) : 0) + impact + boost - grind + (rs ? rs.edge + hot : 0), oppStrength, post && level !== 'NBA' ? 0 : home ? 1 : -1));
      us = Math.round(GAME_POINTS[level] + normal(rng, 0, 9));
      if (line && line.pts > us - 15) us = line.pts + int(rng, 15, 30);
      // postseason games run closer: more of them come down to the last minutes
      const margin = post && chance(rng, 0.4) ? int(rng, 1, 4) : int(rng, 1, post ? 14 : 18);
      them = win ? Math.max(20, us - margin) : us + margin;
    }
    if (post && s.live) {
      const tag = series && series.bestOf > 1 ? `${post} G${series.game}` : post;
      if (liveResult?.lastShot) s.live.recent.push(liveResult.lastShot);
      s.live.recent.push(`${tag}: ${win ? 'W' : 'L'} ${us}–${them} vs ${opp.short}${line ? ` (you: ${line.pts} pts)` : ''}`);
    }
    const log: GameLog = { n: (post ? season.postGames : season.games).length + 1, opp: opp.short, home, res: win ? 'W' : 'L', us, them, line, post, ...(fr?.box.length ? { friends: fr.box } : {}) };
    (post ? season.postGames : season.games).push(log);
    hook.last = { us, them };
    if (rs) rivalSeriesGame(s, post, opp, series, win, line, fr?.rival ?? null);
    if (line && level === 'NBA') {
      s.nbaGames++;
      milestone(s, 'debut');
      if (line.pts >= 30) milestone(s, 'thirty');
    }
    return win;
  };
  return hook;
}

function userSlot(s: GameState, team: Team, level: LevelKey): UserSlot {
  const [a, b] = ROLE_MINUTES[s.season!.role];
  const mins = s.season!.role === 'deep' ? (a + b) / 2 : ((a + b) / 2) * (LEVELS[level].gameLen / 48);
  return { teamId: team.id, rank: s.season!.roleRank, usageW: usageWeight(s.player.attrs), minutes: mins };
}

// ---------- halves ----------

export function playHalf(s: GameState): void {
  const season = s.season!;
  const half = (season.half + 1) as 1 | 2;
  const league = activeLeague(s);
  const level = season.level;
  const toRound = half === 1 ? Math.floor(league.rounds / 2) : league.rounds;
  const games = toRound - league.round;
  const acc = newAcc();
  season.rhythm = clamp(normal(s.rng, 1, FORM.halfSd), 0.8, 1.2);
  if (half === 1 && s.stage === 'NBA') {
    nbaPreseason(s);
    const before = season.role;
    season.role = roleWithTrust(season.roleRank, s.player.trust);
    if (before !== season.role) season.preReport = `${season.preReport} Role after camp: ${season.role}.`;
  }
  if (half === 2 && season.assignedGL && s.stage === 'NBA') {
    // the NBA half goes on without the user; the user plays the half in the G League
    playRounds(s.rng, league, toRound, null);
    accumulateHalf(s.rng, league, games, null, half);
    const gl = s.league!;
    const glTeam = teamById(gl, gl.userTeamId)!;
    const glRank = rankOnRoster(glTeam, userOvr(s));
    const keepRole = season.role;
    const keepRank = season.roleRank;
    season.role = roleWithTrust(glRank, 55);
    season.roleRank = glRank;
    const slot = userSlot(s, glTeam, 'GL');
    const glGamesBefore = season.games.length;
    playRounds(s.rng, gl, gl.rounds, makeHook(s, gl, 'GL', acc, slot));
    for (let i = glGamesBefore; i < season.games.length; i++) season.games[i].post = 'G League';
    accumulateHalf(s.rng, gl, gl.rounds, slot, half);
    growthAfterHalf(s, acc, 'GL', userOvr(s));
    season.role = keepRole;
    season.roleRank = keepRank;
  } else {
    const team = teamById(league, league.userTeamId)!;
    const slot = userSlot(s, team, level);
    playRounds(s.rng, league, toRound, makeHook(s, league, level, acc, slot));
    accumulateHalf(s.rng, league, games, slot, half);
    growthAfterHalf(s, acc, level, userOvr(s));
  }
  season.halfLines.push(acc.line);
  season.half = half;
  season.ineligibleHalf = false;
  if (half === 1) beginMidseason(s, acc);
  else startPostseason(s);
}

// ---------- playable postseason (see live.ts) ----------

const LIVE_LEVELS = new Set<LevelKey>(['HSV', 'NCAA', 'GL', 'EU', 'INT', 'NBA']);

function startPostseason(s: GameState): void {
  // round 35: a simulated postseason is still replayed when a rival series can come up, so the
  // series' call can be asked (career/rivalSeries.ts)
  if (!LIVE_LEVELS.has(s.season!.level) || (s.flags.simPostseason && !shotDue(s) && !rivalSeriesPossible(s))) {
    finishSeason(s);
    return;
  }
  const snap = structuredClone(s);
  s.postSnap = { snap, picks: [] };
  s.step = 'postseason';
  runPostseason(s);
}

/** Replays the postseason with the picks so far; pauses at the next pick or commits. */
export function runPostseason(s: GameState): void {
  const ps = s.postSnap;
  if (!ps) return;
  const trial = structuredClone(ps.snap);
  // round 35: a simulated postseason replayed only for a rival series plays its games unasked
  const quiet = !!trial.flags.simPostseason && !shotDue(trial) && !!trial.mp?.rival;
  trial.live = { picks: ps.picks, i: 0, simAll: quiet, simSeries: null, recent: [], ...(shotDue(trial) ? { shot: true } : {}) };
  try {
    finishSeason(trial);
  } catch (e) {
    if (!(e instanceof NeedLive)) throw e;
    const r = e.req;
    s.pending = [
      {
        id: `live-${ps.picks.length}`,
        kind: 'live',
        title: r.title,
        text: r.text,
        choices: r.choices.map((c) => ({ id: c.id, label: c.label, detail: c.detail, risk: c.risk })),
        data: { req: r },
      },
    ];
    return;
  }
  delete trial.live;
  for (const k of Object.keys(s)) delete (s as unknown as Record<string, unknown>)[k];
  Object.assign(s, trial);
}

function growthAfterHalf(s: GameState, acc: HalfAcc, level: LevelKey, ovr: number): void {
  const season = s.season!;
  const p = s.player;
  const L = LEVELS[level];
  const share = acc.games > 0 ? acc.minutes / (acc.games * L.gameLen) : 0;
  const perf = perfFactor(acc.gmsc, acc.expGmsc);
  // roll how the plan went; good morale makes breakthroughs likelier and setbacks rarer
  const m = clamp(p.morale / 60, 0.5, 1.6);
  // fast learners break through more often, and young ones can surge
  const rate = p.growthRate ?? 1;
  const surgeW = p.age <= GROWTH_RATE.surgeAgeMax ? Math.max(0, rate - GROWTH_RATE.surgeFrom) * GROWTH_RATE.surgeW : 0;
  const outcome =
    PLAN_OUTCOMES[
      weightedIndex(
        s.rng,
        PLAN_OUTCOMES.map((o) =>
          o.key === 'surge' ? surgeW : o.key === 'breakthrough' ? o.weight * m * Math.pow(rate, GROWTH_RATE.breakthroughPow) : o.key === 'setback' || o.key === 'plateau' ? o.weight / m : o.weight,
        ),
      )
    ];
  // a breakthrough on the grind plan teaches him how to work
  if (outcome.key === 'breakthrough' && (season.plan === 'grind' || season.plan2 === 'grind')) p.growthRate = Math.min(GROWTH_RATE.max, rate * 1.02);
  const before = ovrOf(p.attrs, p.pos);
  const plan = blendPlans(season.plan, season.plan2, p.age);
  const coach = temperFx(s); // round 32: the head coach's temperament
  const attrs0 = { ...p.attrs };
  applyHalfGrowth(s.rng, p, {
    minutesShare: share,
    played: acc.played > 0,
    ovr,
    levelAvg: L.avg,
    perf,
    plan: season.plan,
    planDef: plan,
    outMost: acc.injuredGames > acc.games / 2,
    extraMult: outcome.growth * p.growthMultNext * MODES[s.mode ?? 'standard'].growth * youthGrowthMult(s) * eliteMult(s.mode ?? 'standard', before) * (s.flags.fast && s.mode !== 'lab' && s.mode !== 'fast' ? FAST_GROWTH : 1) * (coach && (season.plan === 'grind' || season.plan2 === 'grind') ? coach.grind : 1) * levelGrowth(s),
    morale: p.morale,
    lab: s.mode === 'lab',
  });
  // round 22: what this half built, muscle by muscle (the body map)
  trainMuscles(p, attrs0, season.plan2 && season.plan2 !== season.plan ? [season.plan, season.plan2] : [season.plan]);
  // body wear from this half: minutes played and how hard the plan pushed the body
  const tallWear = (1 + Math.max(0, p.fullHeight - HEIGHT_LIMITS.bandHi) * HEIGHT_LIMITS.tallWear) * weightWear(p);
  p.wear = clamp((p.wear ?? 0) + (share * WEAR.minutes + (plan.injury - 1) * WEAR.plan) * tallWear, 0, 100);
  // round 24: a half spent on recovery builds longevity (a side plan, half as much)
  if (season.plan === 'recovery') p.longevity = (p.longevity ?? 0) + LONGEVITY.recoveryHalf;
  else if (season.plan2 === 'recovery') p.longevity = (p.longevity ?? 0) + LONGEVITY.recoveryHalf / 2;
  // the weight room puts pounds on, sprints take them off, a half on the injury list adds a few
  const lb = halfPlanWeight(season.plan, season.plan2) + (acc.injuredGames > acc.games / 2 ? WEIGHT.injuredHalf : 0);
  if (lb) changeWeight(p, lb, 0.3);
  if (plan.rangeGain) p.range = clamp(p.range + plan.rangeGain * outcome.growth, 0, 99);
  if (plan.offhandGain) p.offhand = clamp(p.offhand + plan.offhandGain * outcome.growth, 0, 99);
  if (plan.touchGain) addTouch(p, plan.touchGain * outcome.growth);
  if (outcome.injury) p.injuryMultNext *= outcome.injury;
  // round 20: chemistry built (or burned) for the rest of the season
  if (plan.chem) season.teamBonus = Math.round(((season.teamBonus ?? 0) + plan.chem) * 100) / 100;
  // round 20: Spotlight's gamble on shooting and finishing, which can also cost points
  let swingText = '';
  if (plan.swing && s.mode !== 'lab') {
    const parts = plan.swing.attrs.map((k) => {
      const d = normal(s.rng, plan.swing!.mean, plan.swing!.sd);
      p.attrs[k] = clamp(p.attrs[k] + d, 15, ATTR_MAX);
      return `${NAMES.attr[k].toLowerCase()} ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}`;
    });
    swingText = ` In the spotlight: ${parts.join(', ')}.`;
  }
  // round 22: what his NBA city did to him this half
  swingText += cityHalf(s);
  const gain = ovrOf(p.attrs, p.pos) - before;
  const text =
    outcome.key === 'setback'
      ? PLAN_SETBACK_TEXT[season.plan] ?? 'Nothing clicked. A frustrating stretch.'
      : outcome.key === 'surge'
        ? 'A surge. Everything is clicking at once and the coaches cannot believe the jump.'
        : outcome.key === 'breakthrough'
        ? 'Something clicked. You are a different player than two months ago.'
        : outcome.key === 'plateau'
          ? 'The work did not show up in games yet.'
          : 'The plan did what it said.';
  (season.outcomes ??= []).push({ half: season.half + 1, plan: season.plan, plan2: season.plan2 ?? null, outcome: outcome.label, text: text + swingText, ovrGain: gain });
  p.morale = adjust(p.morale, plan.morale + outcome.morale + (season.role === 'deep' ? -4 : season.role === 'key' ? 3 : 0) + (perf - 1) * 30 + (coach?.morale ?? 0));
  p.trust = adjust(p.trust, (plan.trust + outcome.trust + (perf - 1) * 30 + (p.attrs.IQ - L.avg) * 0.04) * (coach?.trustMul ?? 1));
  const repGain = plan.rep[1] > 0 ? range(s.rng, plan.rep[0], plan.rep[1]) : 0;
  const v = acc.line.gp > 0 ? valuePerGame(acc.line) : 0;
  const levelW: Record<LevelKey, number> = { HSJV: 0.2, HSV: 0.5, NCAA: 1, GL: 0.6, EU: 0.8, INT: 0.5, NBA: 1.4 };
  p.rep = clamp(p.rep + repGain + Math.max(0, v - 10) * 0.12 * levelW[level], 0, 100);
  if ((season.plan === 'spotlight' || season.plan2 === 'spotlight') && s.stage !== 'HS') {
    const money = (s.stage === 'NBA' ? 0.25 : 0.01) * (1 + p.rep / 25);
    p.bank += money;
    p.earnings += money;
  }
}

function beginMidseason(s: GameState, acc: HalfAcc): void {
  const season = s.season!;
  const league = activeLeague(s);
  updateStories(s, league);
  const team = teamById(league, league.userTeamId)!;
  const ovr = userOvr(s);
  const oldRole = season.role;
  season.roleRank = rankOnRoster(team, ovr);
  season.role = roleWithTrust(season.roleRank, s.player.trust);
  season.midReport = [
    `${team.name} are ${team.w}–${team.l}.`,
    acc.played > 0
      ? `You averaged ${perGame(acc.line, 'pts').toFixed(1)} points in ${(acc.minutes / Math.max(1, acc.played)).toFixed(1)} minutes over ${acc.played} games.`
      : 'You did not get into a game.',
  ];
  if (oldRole !== season.role) season.midReport.push(`Role change: ${oldRole} → ${season.role}.`);
  if (acc.injuredGames > 0) season.midReport.push(`Missed ${acc.injuredGames} games through injury.`);
  s.step = 'midseason';
  if (s.stage === 'NBA' && !season.assignedGL) {
    nbaCup(s);
    allStarWeekend(s, acc.line);
    if (season.cupResult) season.midReport.push(`NBA Cup: ${season.cupResult}.`);
  }
  // a trade-deadline move, an injury, a team that clicks (career/team.ts)
  midseasonSwing(s, league);
  queueMidseasonEvents(s);
  // the G League assignment valve for end-of-bench NBA players
  if (s.stage === 'NBA' && (season.role === 'deep' || season.role === 'bench')) {
    pushDecision(s, {
      kind: 'assign',
      title: 'G League assignment',
      text: 'You are barely playing. The front office would send you to the G League for the second half so you get real minutes.',
      choices: [
        { id: 'go', label: 'Go to the G League', detail: 'Real minutes for the rest of the season. Growth counts.' },
        { id: 'stay', label: 'Stay with the NBA team', detail: 'Practice with the best, play garbage time.' },
      ],
    });
  }
  // round 33: a level's plan holds for the whole season (recovery if he is hurt now)
  if (planStyle(s) !== 'half') {
    const hurt = !!s.player.injury && s.player.injury.key !== 'dtd';
    if (hurt) {
      season.plan = 'recovery';
      season.plan2 = null;
    }
    season.plans.push(season.plan);
    if (season.plan2) season.plans.push(season.plan2);
  } else pushPlanDecision(s, 2);
}

export function assignToGl(s: GameState): void {
  const season = s.season!;
  const nbaTeam = s.teamId!;
  const gl = buildGl(s, s.year, `GL-${nbaTeam}`);
  gl.rounds = Math.floor(LEVELS.GL.games / 2);
  s.league = gl;
  season.assignedGL = true;
  s.affiliateNbaId = nbaTeam;
}

// ---------- season end ----------

function postseason(s: GameState, league: League, hook: UserGameHook): { result: string; champion: boolean; madePost: boolean } {
  const level = s.season!.level;
  const team = teamById(league, league.userTeamId)!;
  const rng = s.rng;
  if (level === 'NBA') {
    const { bracket, seeds } = nbaPlayoffs(rng, league, hook);
    league.bracket = bracket;
    const ex = bracketExit(bracket, team.id);
    const confRank = conferenceRank(team, league);
    if (ex.champion) return { result: 'NBA Champion', champion: true, madePost: true };
    if (!seeds[team.id]) return { result: `Missed the playoffs (${ordinal(confRank)} in the ${team.conf})`, champion: false, madePost: false };
    return { result: `Lost in the ${ex.lastRound}`, champion: false, madePost: true };
  }
  if (level === 'NCAA') {
    const ct = conferenceTournament(s, team, league.teams.filter((t) => t.conf === team.conf));
    for (const g of ct.games) s.season!.postGames.push({ ...g, n: s.season!.postGames.length + 1 });
    const bracket = marchMadness(rng, league, hook);
    league.bracket = bracket;
    const ex = bracketExit(bracket, team.id);
    const pre = ct.won ? `${ct.text}. ` : '';
    if (ex.champion) return { result: `${pre}National champion`, champion: true, madePost: true };
    if (!ex.lastRound) return { result: `${pre}Missed March Madness`, champion: false, madePost: false };
    return { result: `${pre}Lost in the ${ex.lastRound} of March Madness`, champion: false, madePost: true };
  }
  if (level === 'HSV' || level === 'GL' || level === 'EU' || level === 'INT') {
    const bracket = level === 'HSV' ? hsPlayoffs(rng, league, hook) : level === 'GL' || level === 'INT' ? glPlayoffs(rng, league, hook) : euPlayoffs(rng, league, hook);
    league.bracket = bracket;
    const ex = bracketExit(bracket, team.id);
    const name = level === 'HSV' ? (league.label ? `${league.label} champion` : 'State champion') : level === 'GL' ? 'G League champion' : level === 'INT' ? `${team.conf} champion` : 'EuroLeague champion';
    if (ex.champion) return { result: name, champion: true, madePost: true };
    if (!ex.lastRound) return { result: level === 'HSV' ? 'Missed the state playoffs' : 'Missed the playoffs', champion: false, madePost: false };
    return { result: `Lost in the ${ex.lastRound}`, champion: false, madePost: true };
  }
  const st = standings(league.teams);
  return { result: `JV season · ${ordinal(st.indexOf(team) + 1)} of ${st.length}`, champion: false, madePost: false };
}

export const seasonLabel = (y: number): string => `${y}–${String(y + 1).slice(2)}`;

function finishSeason(s: GameState): void {
  const season = s.season!;
  const level = season.level;
  const league = activeLeague(s);
  const team = teamById(league, league.userTeamId)!;
  const p = s.player;
  const acc = newAcc();
  const slot = userSlot(s, team, level);
  const hook = makeHook(s, league, level, acc, slot);
  const post = postseason(s, league, hook);
  const mvps = league.bracket ? playoffMvps(s.rng, league, league.bracket, { teamId: team.id, name: p.name, games: season.postGames }) : [];
  const recap = league.bracket ? postseasonRecap(league, league.bracket) : [];
  finishStories(s, league);
  if (level === 'HSV') {
    const rank = standings(league.teams).indexOf(team) + 1;
    if (pathOf(s) === 'us' && (post.champion || (rank <= 2 && team.strength >= 50) || s.flags.powerhouse)) hsNationals(s, team);
  }

  const nbaGames = season.games.filter((g) => g.post !== 'G League');
  const regLine = sumLines(nbaGames.map((g) => g.line));
  const postLine = sumLines(season.postGames.map((g) => g.line));
  const firstHalf = season.halfLines[0] ?? emptyLine();
  const prevNba = [...s.history].reverse().find((h) => h.level === 'NBA' && h.line.gp > 0);
  const userCand = {
    name: p.name,
    teamId: team.id,
    line: regLine,
    firstHalfLine: firstHalf,
    rep: p.rep,
    rookie: level === 'NBA' && s.serviceYears === 0,
    per: p.attrs.PER,
    int: p.attrs.INT,
    prevValue: prevNba ? valuePerGame(prevNba.line) : null,
    age: p.age,
    ovr: userOvr(s),
    dpoyWins: s.awards.filter((a) => a.key === 'DPOY').length,
    mvpWins: s.awards.filter((a) => a.key === 'MVP').length,
    // round 37: a tutorial level's goal is an All-Star team, so it keeps the old cut-off (all twelve)
    allStarTop: levelOf(s) ? ALL_STAR_BAR.level : ALL_STAR_BAR.userTop,
  };
  // round 35: classmates run for the NBA's awards too (career/friendLeague.ts)
  const cands = buildCandidates(league, userCand, undefined, level === 'NBA' && palsOn(s) ? friendCandidates(s, league) : undefined);
  let aw: AwardOutcome;
  if (level === 'NBA') {
    aw = nbaAwards(cands);
    // the All-Star team was picked at midseason; keep the season record consistent with it
    aw.wins = aw.wins.filter((w) => w.key !== 'ALLSTAR');
    if (season.allStar) aw.wins.push({ key: 'ALLSTAR', label: 'All-Star' });
    recordNbaYear(s, league, aw, s.year);
    coachOfYear(s, league); // round 32
  }
  else aw = simpleAwards(league, cands, level === 'NCAA' ? team.conf : null);
  const labels: string[] = aw.wins.map((w) => w.label);
  const keys: { key: string; label: string }[] = [...aw.wins];

  // titles
  if (post.champion) {
    if (level === 'NBA') {
      const isKey = season.role === 'key';
      keys.push({ key: isKey ? 'TITLEKEY' : 'TITLE', label: 'NBA Champion' });
      labels.push('Champion');
      milestone(s, 'champion');
    } else {
      const key = level === 'NCAA' ? 'NCAATITLE' : level === 'EU' ? 'EUTITLE' : level === 'GL' ? 'GLTITLE' : level === 'INT' ? 'INTTITLE' : 'STATETITLE';
      // one clean title per level (the season result can read "conference tournament champion. National champion")
      const label = TITLE_LABEL[key] ?? post.result;
      keys.push({ key, label });
      labels.push(post.result);
    }
  }
  // series MVPs (Finals, conference finals, Final Four)
  for (const m of mvps.filter((x) => x.isUser)) {
    keys.push({ key: SERIES_MVP_KEY(level, m.award), label: m.award });
    labels.push(m.award);
  }
  // senior-year national honours
  if (s.stage === 'HS' && s.hsYear === 4) {
    computeRecruiting(s);
    if (s.recruitRank !== null && s.recruitRank <= 24) {
      keys.push({ key: 'MCDAA', label: "McDonald's All-American" });
      labels.push("McDonald's All-American");
    }
    if (s.recruitRank !== null && s.recruitRank <= 24 && pathOf(s) === 'us') mcdonaldsGame(s);
    if (s.recruitRank === 1) {
      keys.push({ key: 'GATORADE', label: 'Gatorade Player of the Year' });
      labels.push('Gatorade Player of the Year');
    }
  } else if (s.stage === 'HS') computeRecruiting(s);

  for (const k of keys) s.awards.push({ year: s.year, level, key: k.key, label: k.label });
  if (post.champion) {
    const final = [...season.postGames].reverse().find((g) => g.res === 'W');
    if (final) {
      pushMoment(s, {
        kind: 'title',
        title: post.result,
        teamName: team.name,
        color: team.color,
        text: `${team.name} win it all. ${seasonLabel(s.year)}.`,
        game: { ...final, level, teamShort: team.short },
        lines: [],
        recap,
        mood: 'champion',
      });
    }
  } else if (league.bracket && recap.length > 0) {
    // a final he lost still gets its last minutes, without the banner
    const finalRound = league.bracket.rounds[league.bracket.rounds.length - 1];
    const inFinal = finalRound?.series.some((x) => x.a === team.id || x.b === team.id);
    const lastGame = season.postGames[season.postGames.length - 1];
    pushMoment(s, {
      kind: 'tournament',
      title: league.label ? `The ${league.label} playoffs` : (POSTSEASON_TITLE[level] ?? 'The postseason'),
      teamName: team.name,
      color: team.color,
      text: `${teamById(league, league.bracket.champion)?.name ?? 'Someone else'} won it all. ${post.result}.`,
      lines: [],
      recap,
      outcome: { team: team.name, short: team.short, result: post.result, champion: teamById(league, league.bracket.champion)?.name ?? 'Someone else' },
      ...(inFinal && lastGame && lastGame.res === 'L' ? { game: { ...lastGame, level, teamShort: team.short }, lostFinal: true, mood: 'heartbreak' as const, title: 'So close' } : {}),
    });
  }
  const honours = aw.wins.map((w) => w.label).concat(keys.filter((k) => ['MCDAA', 'GATORADE', 'FMVP', 'CFMVP', 'FFMOP', 'PLAYOFFMVP'].includes(k.key)).map((k) => k.label));
  if (honours.length > 0) {
    pushMoment(s, { kind: 'awards', title: honours.length > 1 ? 'Season honours' : honours[0], color: team.color, teamName: team.name, text: `${seasonLabel(s.year)} · ${team.name}`, lines: [...new Set(honours)] });
  }
  if (keys.some((k) => k.key === 'ALLSTAR')) milestone(s, 'allstar');
  if (keys.some((k) => k.key === 'MVP')) milestone(s, 'mvp');
  // rivals: generated winners who beat you
  for (const w of aw.winners) {
    if (w.friend) continue; // round 35: a classmate is not on a roster here (career/rivalry.ts looks there)
    const r = aw.races.find((x) => x.award === 'MVP' || x.award.startsWith('Naismith'));
    if (r && r.userRank !== null && r.userRank <= 10) s.rivals[w.name] = (s.rivals[w.name] ?? 0) + 1;
  }

  // reputation from honours
  const repBump = keys.reduce((acc2, k) => acc2 + (REP_BUMP[k.key] ?? 1), 0);
  p.rep = clamp(p.rep + repBump, 0, 100);
  if (post.champion || keys.length > 0) p.morale = adjust(p.morale, 6);

  // money
  let salary = 0;
  if (s.contract && (s.stage === 'NBA' || s.stage === 'GL' || s.stage === 'EU' || s.stage === 'INT')) {
    salary = s.contract.salary;
    p.bank += salary * (1 - AGENT_CUT);
    p.earnings += salary * (1 - AGENT_CUT);
  }
  const endorse = s.stage === 'NBA' ? Math.pow(p.rep / 100, 3) * 20 : s.stage === 'NCAA' ? 0.003 + (p.rep / 100) * 0.15 : s.stage === 'EU' || s.stage === 'GL' ? (p.rep / 100) * 0.05 : 0;
  p.bank += endorse;
  p.earnings += endorse;
  // round 25: his own deal with a brand, and his staff's pay
  const brand = payBrand(s);
  p.bank += brand;
  p.earnings += brand;
  for (const n of payStaff(s)) note(s, n);

  const ovrEnd = userOvr(s);
  p.peakOvr = Math.max(p.peakOvr, ovrEnd);
  // a breakthrough season earns a focus change; career highs from every game he played
  const breakthrough = evaluateBreakthrough(s, season);
  const allGames = [...season.games, ...season.postGames].filter((g) => g.line);
  const newHighs = updateHighs(s, allGames, level, team.name);
  markGames(s, allGames, level);
  const bestGame = allGames.reduce<GameLog | null>((b, g) => (!b || gameScore(g.line!) > gameScore(b.line!) ? g : b), null);
  const rec: SeasonRecord = {
    year: s.year,
    age: p.age,
    level,
    stage: s.stage,
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color,
    role: season.role,
    line: regLine,
    post: postLine,
    w: team.w,
    l: team.l,
    result: post.result,
    ovrStart: season.ovrStart,
    ovrEnd,
    height: p.height,
    weight: p.weight,
    awards: labels,
    races: aw.races,
    salary,
    bestGame,
    newHighs,
    breakthrough: breakthrough || undefined,
  };
  s.history.push(rec);
  // G League assignment shows as its own row
  const glGames = season.games.filter((g) => g.post === 'G League');
  if (glGames.length > 0) {
    const gl = s.league!;
    const glTeam = teamById(gl, gl.userTeamId)!;
    s.history.push({
      ...rec,
      level: 'GL',
      stage: 'GL',
      teamId: glTeam.id,
      teamName: `${glTeam.name} (assignment)`,
      teamColor: glTeam.color,
      line: sumLines(glGames.map((g) => g.line)),
      post: emptyLine(),
      w: glTeam.w,
      l: glTeam.l,
      result: 'G League assignment',
      awards: [],
      races: [],
      salary: 0,
      bestGame: null,
    });
  }
  if (level === 'NBA') {
    s.serviceYears += 1;
    s.teamSeasons[team.id] = (s.teamSeasons[team.id] ?? 0) + 1;
  }
  season.summary = rec;
  s.lastSummary = rec;
  awardNickname(s, team.color, team.name);
  updateRivalry(s);
  writeNews(s);
  s.feed.unshift(reactionsForSeason(s, rec));
  if (s.feed.length > 12) s.feed.length = 12;

  // the NBA world keeps turning when the user is elsewhere
  if (s.stage !== 'NBA') {
    if (s.nba) quickNbaSeason(s);
    else if ((s.stage === 'HS' && s.hsYear === 4) || s.player.age >= 17) {
      // built by senior year, or by 17 for players who turned pro early abroad
      s.nba = buildNba(s, s.year);
      warmUpNba(s, 12);
      quickNbaSeason(s);
    }
  } else snapshotNba(s);
  s.step = 'summary';
}

const TITLE_LABEL: Record<string, string> = {
  NCAATITLE: 'National champion',
  EUTITLE: 'EuroLeague champion',
  GLTITLE: 'G League champion',
  INTTITLE: 'League champion',
  STATETITLE: 'State champion',
};

const SERIES_MVP_KEY = (level: LevelKey, award: string): string =>
  level === 'NBA' ? (award === 'Finals MVP' ? 'FMVP' : 'CFMVP') : level === 'NCAA' ? 'FFMOP' : 'PLAYOFFMVP';

const POSTSEASON_TITLE: Partial<Record<LevelKey, string>> = {
  NBA: 'The NBA playoffs',
  NCAA: 'March Madness',
  EU: 'The EuroLeague playoffs',
  GL: 'The G League playoffs',
  INT: 'The playoffs',
  HSV: 'The state playoffs',
};

const REP_BUMP: Record<string, number> = {
  MVP: 12,
  ALLNBA1: 8,
  ALLNBA2: 6,
  ALLNBA3: 5,
  ALLSTAR: 5,
  TITLE: 5,
  TITLEKEY: 8,
  FMVP: 8,
  CFMVP: 3,
  FFMOP: 4,
  PLAYOFFMVP: 2,
  ROY: 5,
  DPOY: 5,
  SCORING: 4,
  ASTLEAD: 3,
  REBLEAD: 3,
  STLLEAD: 2,
  BLKLEAD: 2,
  NAISMITH: 10,
  AA1: 6,
  AA2: 4,
  NCAATITLE: 6,
  MCDAA: 5,
  GATORADE: 6,
  ALLSTATE: 3,
  STATETITLE: 3,
  CONFPOY: 3,
  ALLCONF: 2,
};

function snapshotNba(s: GameState): void {
  const nba = s.nba!;
  const ppgs: number[] = [];
  for (const t of nba.teams) for (const g of t.roster) if (g.s && g.s.gp >= 58) ppgs.push(g.s.pts / g.s.gp);
  const user = s.stage === 'NBA' && s.lastSummary && s.lastSummary.level === 'NBA' ? s.lastSummary.line : null;
  if (user && user.gp >= 58) ppgs.push(user.pts / user.gp);
  const wins = nba.teams.map((t) => t.w);
  s.nbaSnapshot = {
    leader: Math.max(0, ...ppgs),
    over25: ppgs.filter((x) => x >= 25).length,
    best: Math.max(...wins),
    worst: Math.min(...wins),
  };
}

/** Recruiting rank against a national class (§8), computed analytically from the class distribution. */
function computeRecruiting(s: GameState): void {
  const p = s.player;
  // underclassmen are judged on where they are heading by senior year
  const gradeGap = (4 - Math.min(4, s.hsYear)) * 3.5;
  const R = RECRUIT;
  const ovr = ovrOf(p.attrs, p.pos);
  const pot = p.scoutRange ? scoutEstimate(p) : 68;
  // a senior-equivalent rating: OVR first, a nudge for potential and buzz
  // American high schoolers have the easiest road (career/nationality.ts)
  const eff = ovr + gradeGap + R.potW * (pot - 68) + R.repW * p.rep + edgeOf(p.country).recruit;
  const z = (eff - R.effMean) / R.effSd;
  const rank = Math.max(1, Math.round(R.population * (1 - normCdf(z)) + 1));
  s.recruitRank = rank;
  const [five, four, three] = R.stars;
  s.stars = rank <= five ? 5 : rank <= four ? 4 : rank <= three ? 3 : eff >= R.twoStar ? 2 : 1;
}

function normCdf(z: number): number {
  // Abramowitz-Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}
