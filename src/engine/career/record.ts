// The career record (round 24): everything the career card shows, in a couple of KB, taken from
// a finished career. The career log keeps these (not whole saves), and the card is drawn from one,
// so a logged career can be looked at and downloaded long after its save is gone.

import type { GameState, Pos } from '../types';
import { championships, count, hallOfFame, nbaCareerPoints, nbaTitles, raftersTeams, verdictFor } from '../awards/legacy';
import { NBA_TEAMS } from '../../content/teams';
import { TIERS, legacyRank, tierCounts } from '../awards/tiers';
import type { Mode } from '../balance';

export interface CareerRecord {
  id: string;
  savedAt: string; // ISO time it was logged
  mode: Mode;
  name: string;
  number: number;
  pos: Pos;
  role: string; // archetype, or his late-career specialist role
  ringChaser: string | null;
  anomaly: string | null;
  country: string;
  highSchool: string;
  retiredAt: number;
  peak: number; // true peak OVR (shown rounded)
  tier: string;
  verdict: string;
  legacy: number; // legacy points
  rank: number; // all-time legacy rank (101 = outside the top 100)
  rankBehind: string | null;
  hof: 'first' | 'hof' | null;
  team: { name: string; color: string } | null; // the team he gave the most seasons to
  nbaSeasons: number;
  nbaPoints: number;
  nbaGames: number;
  titles: number;
  mvps: number;
  allStars: number;
  nbaLine: string; // per game, over his NBA career
  honours: { text: string; color: string }[];
  rings: { team: string; color: string; years: { year: number; fmvp: boolean }[] }[];
  teams: string[];
}

function nbaLine(g: GameState): string {
  const rows = g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);
  if (rows.length === 0) return '';
  const t = rows.reduce((a, h) => ({ gp: a.gp + h.line.gp, pts: a.pts + h.line.pts, reb: a.reb + h.line.reb, ast: a.ast + h.line.ast }), { gp: 0, pts: 0, reb: 0, ast: 0 });
  return `${(t.pts / t.gp).toFixed(1)} PTS · ${(t.reb / t.gp).toFixed(1)} REB · ${(t.ast / t.gp).toFixed(1)} AST · ${rows.length} NBA seasons`;
}

/** The team he gave the most seasons to (NBA first). */
function mainTeam(g: GameState): { name: string; color: string } | null {
  const pool = g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);
  const rows = pool.length ? pool : g.history;
  const n = new Map<string, { name: string; color: string; k: number }>();
  for (const h of rows) {
    const x = n.get(h.teamName) ?? { name: h.teamName, color: h.teamColor, k: 0 };
    x.k++;
    n.set(h.teamName, x);
  }
  const best = [...n.values()].sort((a, b) => b.k - a.k)[0];
  return best ? { name: best.name, color: best.color } : null;
}

/** One finished career, by its seed, name and the age he retired at. */
const recordId = (g: GameState): string => `${g.seed}-${g.player.name}-${g.retiredAt ?? g.player.age}`;

export function careerRecord(g: GameState, now = new Date()): CareerRecord {
  const p = g.player;
  const v = verdictFor(g);
  const r = legacyRank(g);
  const hof = hallOfFame(g);
  const have = tierCounts(g);
  const honours: { text: string; color: string }[] = [];
  if (hof) honours.push({ text: hof === 'first' ? 'Hall of Fame · first ballot' : 'Hall of Fame', color: TIERS[0].color });
  for (const id of raftersTeams(g)) {
    const t = NBA_TEAMS.find((x) => x.abbr === id);
    if (t) honours.push({ text: `Rafters · ${t.city} ${t.nick}`, color: TIERS[0].color });
  }
  for (const t of TIERS)
    for (const it of t.items) {
      if (it.key === 'HOF' || it.key === 'RAFTERS') continue;
      const n = have[it.key] ?? 0;
      if (n > 0) honours.push({ text: `${n > 1 ? `${n}× ` : ''}${it.label}`, color: t.color });
    }
  const won = championships(g).filter((x) => x.nba);
  const rings = [...new Set(won.map((x) => x.teamName))].map((team) => {
    const ys = won.filter((x) => x.teamName === team);
    return { team, color: ys[0].teamColor, years: ys.map((x) => ({ year: x.year, fmvp: !!x.finalsMvp })) };
  });
  return {
    id: recordId(g),
    savedAt: now.toISOString(),
    mode: g.mode ?? 'standard',
    name: p.name,
    number: p.number,
    pos: p.pos,
    role: p.ringChaser ?? p.archetype,
    ringChaser: p.ringChaser ?? null,
    anomaly: p.anomaly ?? null,
    country: p.country,
    highSchool: p.highSchool,
    retiredAt: g.retiredAt ?? p.age,
    peak: p.peakOvr,
    tier: v.tier,
    verdict: v.line,
    legacy: Math.round(r.pts),
    rank: r.rank,
    rankBehind: r.rank <= 100 && r.above ? r.above.name : null,
    hof,
    team: mainTeam(g),
    nbaSeasons: g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0).length,
    nbaPoints: Math.round(nbaCareerPoints(g)),
    nbaGames: g.nbaGames,
    titles: nbaTitles(g),
    mvps: count(g, 'MVP'),
    allStars: count(g, 'ALLSTAR'),
    nbaLine: nbaLine(g),
    honours: honours.slice(0, 14),
    rings,
    teams: [...new Set(g.history.filter((h) => h.level !== 'HSJV' && h.level !== 'HSV').map((h) => h.teamName))].slice(0, 6),
  };
}
