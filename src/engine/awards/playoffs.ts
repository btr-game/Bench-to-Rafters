// Postseason honours: Finals MVP, conference finals MVPs and the Final Four's most
// outstanding player, plus the NBA record book of champions and award winners.

import { normal, type Rng } from '../rng';
import type { Bracket, GameLog, GameState, League, LevelKey, NbaYearRecord, SeriesMvp, StatLine, Team } from '../types';
import { sumLines, valuePerGame } from '../sim/statModel';
import { statText, type AwardOutcome } from './awards';

export interface UserSeriesInput {
  teamId: string;
  name: string;
  games: GameLog[];
}

// which rounds crown a series MVP, by level; '{conf}' is the winning team's conference
const SPEC: Partial<Record<LevelKey, { rounds: string[]; award: string }[]>> = {
  NBA: [
    { rounds: ['Conference finals'], award: '{conf} Finals MVP' },
    { rounds: ['NBA Finals'], award: 'Finals MVP' },
  ],
  NCAA: [{ rounds: ['Final Four', 'National championship'], award: 'Final Four Most Outstanding Player' }],
  EU: [{ rounds: ['Final Four semifinal', 'EuroLeague final'], award: 'Final Four MVP' }],
  GL: [{ rounds: ['G League Finals'], award: 'G League Finals MVP' }],
  INT: [{ rounds: ['Finals'], award: 'Finals MVP' }],
  HSV: [
    { rounds: ['State final'], award: 'State final MVP' },
    { rounds: ['Youth final'], award: 'Final MVP' },
  ],
};

function scaled(l: StatLine, f: number): StatLine {
  return { ...l, pts: l.pts * f, reb: l.reb * f, ast: l.ast * f };
}

function pickMvp(rng: Rng, team: Team, rounds: string[], award: string, user: UserSeriesInput | null): SeriesMvp {
  // a series is a small sample: season form plus a hot or cold week
  const cands = team.roster
    .filter((p) => p.s && p.s.gp > 0)
    .sort((a, b) => valuePerGame(b.s!) - valuePerGame(a.s!))
    .slice(0, 4)
    .map((p) => {
      const f = normal(rng, 1, 0.14);
      return { v: valuePerGame(p.s!) * f, name: p.name, line: scaled(p.s!, f), isUser: false };
    });
  if (user && user.teamId === team.id) {
    const lines = user.games.filter((g) => g.post && rounds.includes(g.post) && g.line).map((g) => g.line!);
    if (lines.length > 0) {
      const l = sumLines(lines);
      cands.push({ v: valuePerGame(l) * normal(rng, 1, 0.04), name: user.name, line: l, isUser: true });
    }
  }
  const best = cands.reduce((a, b) => (b.v > a.v ? b : a), cands[0] ?? { v: 0, name: team.name, line: sumLines([]), isUser: false });
  return { award, name: best.name, team: team.abbr, line: statText(best.line), isUser: best.isUser };
}

/** Series MVPs for a finished bracket. Stored on the bracket and returned. */
export function playoffMvps(rng: Rng, league: League, bracket: Bracket, user: UserSeriesInput | null): SeriesMvp[] {
  const out: SeriesMvp[] = [];
  for (const spec of SPEC[league.level] ?? []) {
    const last = spec.rounds[spec.rounds.length - 1];
    const round = bracket.rounds.find((r) => r.name === last);
    if (!round) continue;
    for (const sr of round.series) {
      const team = league.teams.find((t) => t.id === sr.winner);
      if (!team) continue;
      out.push(pickMvp(rng, team, spec.rounds, spec.award.replace('{conf}', team.conf ?? ''), user));
    }
  }
  bracket.mvps = out;
  return out;
}

/** "BOS def. LAL 4–2" style summary of a bracket's last series. */
export function finalsText(league: League, bracket: Bracket): { champion: string; runnerUp: string; result: string } {
  const fin = bracket.rounds[bracket.rounds.length - 1]?.series[0];
  const name = (id: string) => league.teams.find((t) => t.id === id)?.name ?? id;
  if (!fin) return { champion: name(bracket.champion), runnerUp: '', result: '' };
  const loser = fin.winner === fin.a ? fin.b : fin.a;
  const w = Math.max(fin.wa, fin.wb);
  const l = Math.min(fin.wa, fin.wb);
  return { champion: name(fin.winner), runnerUp: name(loser), result: w === 1 ? scoreOfSingle(fin) : `${w}–${l}` };
}

function scoreOfSingle(sr: { games?: [number, number][]; winner: string; a: string }): string {
  const g = sr.games?.[0];
  if (!g) return '1–0';
  const [x, y] = sr.winner === sr.a ? g : [g[1], g[0]];
  return `${x}–${y}`;
}

const HISTORY_AWARDS = ['MVP', 'Rookie of the Year', 'DPOY', 'Scoring title'];

/** Adds one season to the NBA record book. */
export function recordNbaYear(s: GameState, nba: League, aw: AwardOutcome, year: number): void {
  const b = nba.bracket;
  if (!b) return;
  const fin = finalsText(nba, b);
  const rec: NbaYearRecord = {
    year,
    champion: fin.champion,
    runnerUp: fin.runnerUp,
    finals: fin.result,
    finalsMvp: b.mvps?.find((m) => m.award === 'Finals MVP') ?? null,
    awards: [],
  };
  for (const award of HISTORY_AWARDS) {
    const r = aw.races.find((x) => x.award === award);
    const top = r?.top[0];
    if (top) rec.awards.push({ award, name: top.name, team: top.team, ovr: top.ovr ?? 0, line: top.line ?? '', isUser: !!top.isUser });
  }
  s.nbaHistory.push(rec);
  if (s.nbaHistory.length > 80) s.nbaHistory.shift();
}

/** Tables for the postseason recap page: the final, the round before it, and the MVPs. */
export function postseasonRecap(league: League, bracket: Bracket): { heading: string; rows: string[] }[] {
  const short = (id: string) => league.teams.find((t) => t.id === id)?.short ?? id;
  const seriesRow = (sr: Bracket['rounds'][0]['series'][0]) => {
    const loser = sr.winner === sr.a ? sr.b : sr.a;
    const w = Math.max(sr.wa, sr.wb);
    const l = Math.min(sr.wa, sr.wb);
    return w === 1 ? `${short(sr.winner)} ${scoreOfSingle(sr)} ${short(loser)}` : `${short(sr.winner)} def. ${short(loser)} ${w}–${l}`;
  };
  const out: { heading: string; rows: string[] }[] = [];
  const rounds = bracket.rounds;
  const fin = rounds[rounds.length - 1];
  if (fin) {
    const rows: string[] = [];
    for (const sr of fin.series) {
      rows.push(seriesRow(sr));
      if ((sr.games?.length ?? 0) > 1) sr.games!.forEach(([x, y], i) => rows.push(`Game ${i + 1}: ${short(sr.a)} ${x}, ${short(sr.b)} ${y}`));
    }
    out.push({ heading: fin.name, rows });
  }
  const semi = rounds[rounds.length - 2];
  if (semi) out.push({ heading: semi.name, rows: semi.series.map(seriesRow) });
  if (bracket.mvps && bracket.mvps.length > 0) out.push({ heading: 'Series MVPs', rows: bracket.mvps.map((m) => `${m.award}: ${m.name} (${m.team})${m.line ? ` · ${m.line}` : ''}`) });
  return out;
}
