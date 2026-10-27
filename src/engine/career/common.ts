// Shared helpers for the career code.

import { LEVELS, REP, ROLE_BY_RANK, ROLE_ORDER, ROSTER_OFFSETS, TRUST_ROLE } from '../balance';
import { clamp } from '../rng';
import type { Decision, GameState, League, LevelKey, RoleKey, Team } from '../types';
import { ovrOf } from '../player/ovr';
import { anchorFor } from '../world/gen';
import { standings } from '../sim/leagueSim';

export const userOvr = (s: GameState): number => ovrOf(s.player.attrs, s.player.pos);

export function roleForRank(rank: number): RoleKey {
  for (const r of ROLE_BY_RANK) if (rank <= r.maxRank) return r.role;
  return 'deep';
}

/** Rank on the team moved one slot by coach trust (§8). */
export function roleWithTrust(rank: number, trust: number): RoleKey {
  const base = roleForRank(rank);
  let i = ROLE_ORDER.indexOf(base);
  if (trust >= TRUST_ROLE.up) i = Math.min(ROLE_ORDER.length - 1, i + 1);
  if (trust <= TRUST_ROLE.down) i = Math.max(0, i - 1);
  return ROLE_ORDER[i];
}

export const rankOnRoster = (team: Team, ovr: number): number => 1 + team.roster.filter((p) => p.ovr > ovr).length;

/** Expected rank on a team of a given strength, without seeing the roster. */
export function projectedRank(strength: number, ovr: number): number {
  const anchor = anchorFor(strength);
  return 1 + ROSTER_OFFSETS.filter((o) => anchor + o > ovr).length;
}

export const ROLE_LABEL: Record<RoleKey, string> = {
  key: 'Key player',
  starter: 'Starter',
  sixth: 'Sixth man',
  rotation: 'Rotation',
  bench: 'End of bench',
  deep: 'Deep bench',
};

export function outlookOf(team: Team, league: League): string {
  const ranked = [...league.teams].sort((a, b) => b.strength - a.strength);
  const i = ranked.indexOf(team);
  const n = ranked.length;
  if (i < n * 0.2) return 'Contender';
  if (i < n * 0.5) return 'Playoff team';
  if (i < n * 0.7) return 'Fringe';
  return 'Rebuilding';
}

export function lastRecord(team: Team): string {
  return team.w + team.l > 0 ? `${team.w}–${team.l}` : '—';
}

export const LEVEL_RANK: Record<LevelKey, number> = { HSJV: 0, HSV: 1, NCAA: 2, GL: 3, EU: 4, NBA: 6 };

export function repLabel(rep: number): string {
  for (const [min, label] of REP.labels) if (rep >= min) return label;
  return 'Unknown';
}

export function logDecision(s: GameState, kind: string, text: string, ref?: string): void {
  s.log.push({ year: s.year, age: s.player.age, kind, text, ref });
}

export function note(s: GameState, text: string): void {
  s.notes.push(text);
  if (s.notes.length > 12) s.notes.shift();
}

export function pushDecision(s: GameState, d: Omit<Decision, 'id'>): void {
  s.pending.push({ ...d, id: `${d.kind}-${s.nextId++}` });
}

export const adjust = (x: number, d: number): number => clamp(x + d, 0, 100);

export function teamById(league: League | null, id: string | null): Team | null {
  if (!league || !id) return null;
  return league.teams.find((t) => t.id === id) ?? null;
}

export function levelName(level: LevelKey): string {
  return LEVELS[level].name;
}

export function conferenceRank(team: Team, league: League): number {
  const st = standings(league.teams.filter((t) => t.conf === team.conf));
  return st.indexOf(team) + 1;
}

export function milestone(s: GameState, key: string): void {
  if (!s.milestones.includes(key)) s.milestones.push(key);
}
