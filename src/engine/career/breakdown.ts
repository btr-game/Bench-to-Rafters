// Why his team is as good as it is (round 25, the owner: explain results). The same numbers the
// season simulation adds up for every game his team plays, laid out: his teammates against an
// average team in the league, what he adds at his role's minutes, and every team factor this
// season (chemistry, coach trust, star gravity, style, fans, roster fit, duo, storylines and
// midseason swings). The sum, against the other teams, is how good his team really is.

import { IMPACT_MULT, LEVELS, ROLE_MINUTES } from '../balance';
import { userOvr } from './common';
import { winningEdge } from './team';
import type { GameState } from '../types';

interface StrengthItem {
  label: string;
  value: number; // points of team strength a game
  playoff?: number; // a different value in the playoffs
  kind: 'team' | 'you' | 'factor';
}

interface Breakdown {
  items: StrengthItem[];
  total: number; // over an average team in his league
  rank: number; // where that total puts his team among the teams of the league
  teams: number;
}

export function strengthBreakdown(s: GameState): Breakdown | null {
  const season = s.season;
  const lg = s.stage === 'NBA' ? s.nba : s.league;
  const team = lg?.teams.find((t) => t.id === (s.stage === 'NBA' ? s.teamId : lg.userTeamId));
  if (!season || !lg || !team || lg.teams.length < 4) return null;
  const avg = lg.teams.reduce((a, t) => a + t.strength, 0) / lg.teams.length;
  const L = LEVELS[season.level];
  const ovr = userOvr(s);
  const sorted = [...team.roster].sort((a, b) => b.ovr - a.ovr);
  const replacement = sorted[Math.min(sorted.length - 1, Math.max(0, season.roleRank - 1))]?.ovr ?? L.avg;
  const [lo, hi] = ROLE_MINUTES[season.role];
  const share = Math.min(1, ((lo + hi) / 2) / 48);
  const you = (ovr - replacement) * share * IMPACT_MULT;
  const edge = winningEdge(s.player.attrs, ovr);
  const items: StrengthItem[] = [
    { label: 'Your teammates, against an average team', value: team.strength - avg, kind: 'team' },
    { label: `You: OVR ${Math.round(ovr)} over the player you replace, at ${Math.round(share * 48)} minutes`, value: you, kind: 'you' },
  ];
  if (edge.regular > 0 && edge.traits.length > 0) items.push({ label: `What you do beyond the box score (${edge.traits.join(', ').toLowerCase()})`, value: edge.regular * share, playoff: edge.playoff * share, kind: 'you' });
  for (const f of season.teamFx ?? []) items.push({ ...f, kind: 'factor' });
  const r1 = (x: number) => Math.round(x * 100) / 100;
  const total = r1(items.reduce((a, x) => a + x.value, 0));
  // the others play at their own strength
  const rank = 1 + lg.teams.filter((t) => t.id !== team.id && t.strength - avg > total).length;
  return { items: items.map((x) => ({ ...x, value: r1(x.value), playoff: x.playoff === undefined ? undefined : r1(x.playoff) })), total, rank, teams: lg.teams.length };
}
