// Team archetypes (round 13: "the team archetype will determine how well the team plays, as
// well as the player's fit with the team"). Once he starts for an NBA team, he can steer how
// the team plays, one change a summer. Each style:
// - moves the team's strength in his games (some more in the regular season, some more in the
//   playoffs), and
// - fits some players better than others: the ratings the style leans on, measured against his
//   own OVR. A good fit plays a little better and a little more; a poor fit a little worse.
// The style stays while he stays with the team and resets when he changes teams.

import type { AttrKey, GameState, RoleKey } from '../types';
import { clamp } from '../rng';
import { modeDial } from '../balance';
import { logDecision, userOvr } from './common';
import { allows } from '../levels';

export type TeamStyle = 'pace' | 'defense' | 'motion' | 'inside' | 'star';

export const TEAM_STYLES: Record<TeamStyle, { name: string; text: string; fits: string; weights: Partial<Record<AttrKey, number>>; regular: number; playoff: number; usage: number }> = {
  pace: { name: 'Run and gun', text: 'Push the ball, shoot early, win the track meet. Great in the regular season, easier to slow down in May.', fits: 'athletic guards and shooting wings', weights: { ATH: 0.4, SHT: 0.35, PLY: 0.25 }, regular: 1.0, playoff: -0.3, usage: 1.04 },
  defense: { name: 'Defense first', text: 'Switch everything, protect the rim, win ugly. Defense travels in the playoffs.', fits: 'two-way forwards, stoppers and rim protectors', weights: { PER: 0.5, INT: 0.35, IQ: 0.15 }, regular: 0.3, playoff: 1.1, usage: 0.97 },
  motion: { name: 'Ball movement', text: 'Five passers, nobody holds it. Steady all year.', fits: 'playmakers and high-IQ shooters', weights: { PLY: 0.4, IQ: 0.4, SHT: 0.2 }, regular: 0.6, playoff: 0.5, usage: 0.98 },
  inside: { name: 'Inside out', text: 'Feed the post, crash the glass, kick it out. Bullies smaller teams.', fits: 'bigs who finish, rebound and defend the paint', weights: { INT: 0.35, REB: 0.35, FIN: 0.3 }, regular: 0.6, playoff: 0.4, usage: 1.0 },
  star: { name: 'Run it through you', text: 'Your team, your ball. As good as you are: it lifts the team if you are a star and sinks it if you are not.', fits: 'stars (OVR 85+)', weights: {}, regular: 0, playoff: 0, usage: 1.12 },
};

const STYLE = { fitSpread: 8, perf: 0.05, usage: 0.06, team: 0.5, starFrom: 82, starPer: 0.15, starMax: 1.8 };

const STARTER: RoleKey[] = ['starter', 'key'];

/** He can steer the team's style once he starts for an NBA team (round 13: starter level). */
export function canSetStyle(s: GameState): boolean {
  if (!allows(s, 'style')) return false; // round 33: advanced level and up
  const last = [...s.history].reverse().find((h) => h.level === 'NBA' && h.teamId === s.teamId);
  return s.step === 'offseason' && s.stage === 'NBA' && !!s.contract && s.contract.years > 0 && !!last && STARTER.includes(last.role) && s.flags.styleYear !== s.year;
}

/** The style in force for his current team, if any. */
export function currentStyle(s: GameState): TeamStyle | null {
  return s.teamStyle && s.teamStyle.teamId === s.teamId ? s.teamStyle.key : null;
}

/** How well he fits a style: -1 (poor) to +1 (great). */
export function styleFit(s: GameState, key: TeamStyle): number {
  const a = s.player.attrs;
  const ovr = userOvr(s);
  if (key === 'star') return clamp((ovr - 85) / 6, -1, 1);
  const w = TEAM_STYLES[key].weights;
  const lean = (Object.entries(w) as [AttrKey, number][]).reduce((t, [k, v]) => t + (a[k] - ovr) * v, 0);
  return clamp(lean / STYLE.fitSpread, -1, 1);
}

export const fitLabel = (f: number): 'Great fit' | 'Good fit' | 'Okay' | 'Poor fit' => (f >= 0.5 ? 'Great fit' : f >= 0.15 ? 'Good fit' : f >= -0.25 ? 'Okay' : 'Poor fit');

/** The season's numbers for a style: team strength (regular, playoffs), his performance and usage. */
export function styleEffect(s: GameState, key: TeamStyle): { regular: number; playoff: number; perf: number; usage: number } {
  const st = TEAM_STYLES[key];
  const f = styleFit(s, key);
  const star = key === 'star' ? clamp((userOvr(s) - STYLE.starFrom) * STYLE.starPer, -STYLE.starMax, STYLE.starMax) : 0;
  const d = modeDial(s.mode, 'teamFx');
  const r1 = (x: number) => Math.round(x * d * 10) / 10;
  return {
    regular: r1(st.regular + f * STYLE.team + star),
    playoff: r1(st.playoff + f * STYLE.team + star),
    perf: 1 + f * STYLE.perf,
    usage: st.usage * (1 + f * STYLE.usage),
  };
}

export function setStyle(s: GameState, key: TeamStyle): void {
  if (!canSetStyle(s) || !s.teamId) return;
  s.teamStyle = { key, teamId: s.teamId };
  s.flags.styleYear = s.year;
  logDecision(s, 'style', `Set the team's style: ${TEAM_STYLES[key].name} (${fitLabel(styleFit(s, key)).toLowerCase()}).`, s.teamId);
  s.toast = `${TEAM_STYLES[key].name}: the team will play that way next season.`;
}
