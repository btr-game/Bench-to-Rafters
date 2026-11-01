// Fast break (playtest round 7): a speed mode. The player still makes every real choice
// (season plan, turning points, offers, the draft, contracts, the summer, national team,
// military service, retirement), but everything in between runs on its own:
// - one plan a season, picked from five training groups (round 8): the second half repeats it;
// - no national team (round 8);
// - at most one turning point at a time, and notices with a single button close themselves;
// - the postseason is simulated and the shop is skipped;
// - a press conference is one answer: its tone carries through a second question (round 25);
// - "next" screens advance by themselves, and the offseason only stops when there is a move
//   worth making (an unlocked focus change, the starting five to build, a size problem, or
//   retirement age);
// - only the big story pages are shown;
// - on screen, every tab folds its extra cards away behind one button (round 25, App.tsx).
// The road map's levels (round 33) play at this pace too, but keep their own season plans, their
// shop and, where the level has them, playable playoff games.

import type { Decision, EventResult, GameState, Moment } from './types';
import { advance, canChangeFocus, choose, heightMismatch, prompt } from './flow';
import { pushPlanDecision } from './career/season';
import { allows, inLevel } from './levels';

/** Story pages worth stopping for in fast break. */
const BIG_EVENT = /Breakthrough season|The leap|Everything changes|Exempted|rafters/i;
function isBig(m: Moment): boolean {
  if (m.arc || m.drama) return true;
  if (m.logo || m.nick) return true; // the day he gets his nickname, and the day his logo comes out (round 28)
  if (m.kind === 'draft' || m.kind === 'title' || m.kind === 'intro') return true;
  if (m.kind === 'awards') return /MVP|All-NBA|Champion|Player of the Year/i.test((m.lines ?? []).join(' ') + m.title);
  if (m.kind === 'injury') return /season|ACL|Everything/i.test(m.title + m.text);
  if (m.kind === 'commit') return /Sangmu|NBA|commits/i.test(m.text) || m.lines?.some((l) => /NBA/.test(l)) === true;
  return m.kind === 'event' && BIG_EVENT.test(m.title);
}

/**
 * Comet (round 30, owner: "for stars, can you make a hyper-fast mode (let's call it comet)? this
 * employs fastbreak and sim ... an estimate playtime of 5~10 minutes, more towards the 5 minute
 * bound"; then "make balance changes or additional features to fastbreak and sim to achieve the 5
 * minute goal"): on top of sim, the game takes the brand deal (a signature line for a big name,
 * the sure deal otherwise) and the youth academy's call, and never stops between seasons. What is
 * left is his: where to play, the draft, and when to retire. Only the career's biggest days get a
 * page of their own (cometPage); the rest of the story goes into a list of highlights on Home.
 */
function cometChoice(d: Decision): string | null {
  const open = d.choices.filter((c) => !c.disabled).map((c) => c.id);
  if (d.kind === 'youth') return open.includes('promote') ? 'promote' : open.includes('move') ? 'move' : (open[0] ?? null);
  return null;
}

/** The days a Comet career stops for: the first page, draft night, a final, award nights, a
 * breakthrough season, a chapter of a storyline, the nickname and its logo. College commitments,
 * tournaments and injuries go into the list of highlights instead (scripts/playtime.ts prices
 * the choice). */
function cometPage(m: Moment): boolean {
  if (m.kind === 'intro' || m.kind === 'draft' || m.kind === 'title' || m.kind === 'awards' || m.nick || m.logo || m.arc) return true;
  return m.kind === 'event' && /Breakthrough season|The leap/i.test(m.title);
}

/** A decision fast break makes for the player, or null when it is the player's call. */
function autoChoice(s: GameState, d: Decision): string | null {
  if (d.kind === 'shop' && !s.flags.level) return d.choices.find((c) => c.id === 'leave')?.id ?? null;
  // a press conference: the first answer's tone carries through a second question
  if (d.kind === 'press' && typeof d.data?.last === 'string') return d.data.last;
  // a notice with a single button
  const open = d.choices.filter((c) => !c.disabled);
  if (d.kind === 'info' && open.length === 1) return open[0].id;
  // injured: recovery is the only plan
  if (d.kind === 'plan' && open.length === 1) return open[0].id;
  if (d.kind === 'plan' && (d.data?.half as number) === 2 && s.season && !inLevel(s)) {
    const open = d.choices.filter((c) => !c.disabled).map((c) => c.id);
    const want = [s.season.plan, s.season.plan2].filter((x): x is NonNullable<typeof x> => !!x && open.includes(x));
    return want.length ? want.join('+') : open[0] ?? null;
  }
  return null;
}

/**
 * Sim mode (round 25, the owner: "sim to the next decision"): fast break, and the routine calls it
 * still leaves to him are made for him too: the season plan (the training group of his first
 * focus stat, or recovery when hurt or low), the summer program, the national team call-up, the
 * G League assignment and the press conference (humble, round 25). It stops for the decisions that shape a career: offers,
 * the draft, contracts, brands, storylines, retirement.
 * Round 30 (owner: "for sim mode, can we even skip turning points?"): turning points too, taking
 * the first choice that is not high risk. Five ways of choosing were played over 300 sim careers
 * each, and all landed within noise of each other (mean peak 69.9 to 70.4, SE about 0.65); this
 * one is the closest to the balance harness's smart player. Home lists the calls it made.
 */
function simChoice(s: GameState, d: Decision): string | null {
  const open = d.choices.filter((c) => !c.disabled).map((c) => c.id);
  const has = (id: string) => (open.includes(id) ? id : null);
  const p = s.player;
  const tired = (p.wear ?? 0) >= 40;
  switch (d.kind) {
    case 'plan': {
      if (p.injury || p.morale < 35) return has('recovery') ?? open[0] ?? null;
      const group: Record<string, string> = { SHT: 'shooting', FIN: 'strength', REB: 'strength', ATH: 'strength', INT: 'defense', PER: 'defense', PLY: 'playmaking', IQ: 'playmaking' };
      return has(group[p.focus[0]] ?? 'balanced') ?? has('balanced') ?? open[0] ?? null;
    }
    case 'summer':
      return has(tired ? 'rest' : 'skills') ?? open[0] ?? null;
    case 'national':
      return has(tired ? 'decline' : 'accept') ?? open[0] ?? null;
    case 'assign':
      return has('go') ?? open[0] ?? null;
    case 'press':
      return has('humble') ?? open[0] ?? null;
    case 'event':
      return (d.choices.find((c) => !c.disabled && c.risk !== 'High') ?? d.choices.find((c) => !c.disabled))?.id ?? null;
    default:
      return null;
  }
}

/**
 * Stop once in every offseason after high school, so the offseason moves (position, number,
 * trade request, starting five, retiring) are always reachable. Round 13 bug fix: it used to
 * stop only for a focus unlock, a recruit board, a size problem or age 30+, so in most summers
 * the moves could not be reached at all.
 */
function worthStopping(s: GameState): boolean {
  if (s.flags.comet) return false; // Comet: no stop between seasons
  // sim mode only stops for a move he has to make
  if (s.flags.sim) return canChangeFocus(s) || heightMismatch(s) !== null;
  return s.stage !== 'HS' || canChangeFocus(s) || heightMismatch(s) !== null;
}

/** Runs the game forward until the next real choice. */
export function fastForward(s: GameState): void {
  if (!s.flags.fast) return;
  // the road map's levels keep their playable playoffs at this pace (round 33)
  if (!inLevel(s) || !allows(s, 'live')) s.flags.simPostseason = 1;
  // keep the outcome of the choice just made on screen while the game runs on
  const result = s.result;
  const toast = s.toast;
  // round 30: the turning points sim mode decided on its own, for Home to list
  const calls: EventResult[] = [];
  for (let i = 0; i < 400; i++) {
    const pr = prompt(s);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') {
      const sim = s.flags.sim ? simChoice(s, pr.decision) : null;
      const auto = autoChoice(s, pr.decision) ?? sim ?? (s.flags.comet ? cometChoice(pr.decision) : null);
      if (auto === null) break;
      choose(s, auto);
      if (pr.decision.kind === 'event' && s.result) calls.push(s.result);
      continue;
    }
    if (s.step === 'offseason' && worthStopping(s) && s.flags.fastStop !== s.year) {
      s.flags.fastStop = s.year;
      break;
    }
    advance(s);
  }
  s.moments = s.moments.filter(isBig);
  if (s.flags.comet) {
    // Comet: the biggest days keep a page; the rest of the story is a list on Home
    const reel = s.moments.filter((m) => !cometPage(m));
    s.moments = s.moments.filter(cometPage);
    if (reel.length) s.reel = [...(s.reel ?? []), ...reel.map((m) => ({ title: m.title, line: m.lines?.[0] ?? '' }))];
  }
  if (calls.length) {
    // the player's own outcome stays on the main card; sim's calls go in a list of their own
    s.result = result;
    s.toast = toast;
  } else {
    s.result ??= result;
    s.toast ??= toast;
  }
  if (calls.length) s.simCalls = calls;
  else delete s.simCalls;
}

/**
 * Fast break on or off (round 11: "once the user clicks fast break, it should totally
 * change"). The switch takes effect at once: a plan decision already on screen is rebuilt in
 * the new style (five training groups and one tap, or the full two-plan picker), and from then
 * on the shop, the national team and extra turning points follow the switch.
 */
export function setFast(s: GameState, on: boolean): void {
  if (on && s.flags.oath) return; // Rough Road (round 25): no quick pace, for the whole career
  if (!on && s.flags.comet) return; // Comet (round 30): the quick pace, for the whole career
  s.flags.fast = on ? 1 : 0;
  if (!on) {
    s.flags.simPostseason = 0;
    s.flags.sim = 0; // sim mode rides on fast break
  }
  const d = s.pending[0];
  if (d && d.kind === 'plan') {
    s.pending.shift();
    pushPlanDecision(s, ((d.data?.half as number) === 2 ? 2 : 1) as 1 | 2);
    s.pending.unshift(s.pending.pop()!);
  }
  if (on) fastForward(s);
}

/** Sim mode on or off (round 25). It turns fast break on with it; turning fast break off ends it. */
export function setSim(s: GameState, on: boolean): void {
  if (on && s.flags.oath) return;
  if (!on && s.flags.comet) return;
  s.flags.sim = on ? 1 : 0;
  if (on) setFast(s, true);
}
