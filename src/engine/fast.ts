// Fast break (playtest round 7): a speed mode. The player still makes every real choice
// (season plan, turning points, offers, the draft, contracts, the summer, national team,
// military service, retirement), but everything in between runs on its own:
// - one plan a season, picked from five training groups (round 8): the second half repeats it;
// - no national team (round 8);
// - at most one turning point at a time, and notices with a single button close themselves;
// - the postseason is simulated and the shop is skipped;
// - "next" screens advance by themselves, and the offseason only stops when there is a move
//   worth making (an unlocked focus change, the starting five to build, a size problem, or
//   retirement age);
// - only the big story pages are shown.

import type { Decision, GameState, Moment } from './types';
import { advance, canChangeFocus, choose, heightMismatch, prompt } from './flow';
import { canRecruit } from './career/recruit';
import { pushPlanDecision } from './career/season';

/** Story pages worth stopping for in fast break. */
const BIG_EVENT = /Breakthrough season|The leap|Everything changes|Exempted|rafters/i;
function isBig(m: Moment): boolean {
  if (m.arc || m.drama) return true;
  if (m.kind === 'draft' || m.kind === 'title' || m.kind === 'intro') return true;
  if (m.kind === 'awards') return /MVP|All-NBA|Champion|Player of the Year/i.test((m.lines ?? []).join(' ') + m.title);
  if (m.kind === 'injury') return /season|ACL|Everything/i.test(m.title + m.text);
  if (m.kind === 'commit') return /Sangmu|NBA|commits/i.test(m.text) || m.lines?.some((l) => /NBA/.test(l)) === true;
  return m.kind === 'event' && BIG_EVENT.test(m.title);
}

/** A decision fast break makes for the player, or null when it is the player's call. */
function autoChoice(s: GameState, d: Decision): string | null {
  if (d.kind === 'shop') return d.choices.find((c) => c.id === 'leave')?.id ?? null;
  // a notice with a single button
  const open = d.choices.filter((c) => !c.disabled);
  if (d.kind === 'info' && open.length === 1) return open[0].id;
  // injured: recovery is the only plan
  if (d.kind === 'plan' && open.length === 1) return open[0].id;
  if (d.kind === 'plan' && (d.data?.half as number) === 2 && s.season) {
    const open = d.choices.filter((c) => !c.disabled).map((c) => c.id);
    const want = [s.season.plan, s.season.plan2].filter((x): x is NonNullable<typeof x> => !!x && open.includes(x));
    return want.length ? want.join('+') : open[0] ?? null;
  }
  return null;
}

/** An offseason with something to do: stop there once so the player can act. */
function worthStopping(s: GameState): boolean {
  return canChangeFocus(s) || canRecruit(s) || heightMismatch(s) !== null || s.player.age >= 30;
}

/** Runs the game forward until the next real choice. */
export function fastForward(s: GameState): void {
  if (!s.flags.fast) return;
  s.flags.simPostseason = 1;
  // keep the outcome of the choice just made on screen while the game runs on
  const result = s.result;
  const toast = s.toast;
  for (let i = 0; i < 400; i++) {
    const pr = prompt(s);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') {
      const auto = autoChoice(s, pr.decision);
      if (auto === null) break;
      choose(s, auto);
      continue;
    }
    if (s.step === 'offseason' && worthStopping(s) && s.flags.fastStop !== s.year) {
      s.flags.fastStop = s.year;
      break;
    }
    advance(s);
  }
  s.moments = s.moments.filter(isBig);
  s.result ??= result;
  s.toast ??= toast;
}

/**
 * Fast break on or off (round 11: "once the user clicks fast break, it should totally
 * change"). The switch takes effect at once: a plan decision already on screen is rebuilt in
 * the new style (five training groups and one tap, or the full two-plan picker), and from then
 * on the shop, the national team and extra turning points follow the switch.
 */
export function setFast(s: GameState, on: boolean): void {
  s.flags.fast = on ? 1 : 0;
  if (!on) s.flags.simPostseason = 0;
  const d = s.pending[0];
  if (d && d.kind === 'plan') {
    s.pending.shift();
    pushPlanDecision(s, ((d.data?.half as number) === 2 ? 2 : 1) as 1 | 2);
    s.pending.unshift(s.pending.pop()!);
  }
  if (on) fastForward(s);
}
