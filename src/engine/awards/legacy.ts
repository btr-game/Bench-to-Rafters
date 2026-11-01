import { CAREER_INDEX, FAREWELL, LEGACY } from '../balance';
import { RIVALS } from '../../content/teams';
import type { GameState } from '../types';

/** What one honour adds to the legacy score. */
function awardPoints(key: string): number {
  switch (key) {
    case 'TITLE':
      return LEGACY.title;
    case 'TITLEKEY':
      return LEGACY.titleKey;
    case 'MVP':
      return LEGACY.mvp;
    case 'FMVP':
      return LEGACY.finalsMvp;
    case 'ALLNBA1':
      return LEGACY.allNba[0];
    case 'ALLNBA2':
      return LEGACY.allNba[1];
    case 'ALLNBA3':
      return LEGACY.allNba[2];
    case 'ALLSTAR':
      return LEGACY.allStar;
    case 'DPOY':
      return LEGACY.dpoy;
    case 'ROY':
      return LEGACY.roy;
    case 'SCORING':
      return LEGACY.scoring;
    case 'ASTLEAD':
    case 'REBLEAD':
    case 'STLLEAD':
    case 'BLKLEAD':
      return LEGACY.statTitle;
    case 'SIXTH':
      return LEGACY.sixth;
    case 'NCAATITLE':
      return LEGACY.ncaaTitle;
    case 'EUMVP':
    case 'EUTITLE':
      return LEGACY.euro;
    case 'OLYGOLD':
      return 3;
    case 'WCGOLD':
    case 'NBACUP':
      return 1.5;
    case 'OLYMEDAL':
    case 'WCMEDAL':
    case 'CUPMVP':
      return 0.75;
    case 'ASIANGOLD':
      return 0.5;
    case 'ASIANMEDAL':
      return 0.25;
    case 'FAREWELL':
      return FAREWELL.legacy;
    default:
      return 0;
  }
}

export function legacyScore(s: GameState): number {
  let pts = 0;
  for (const a of s.awards) pts += awardPoints(a.key);
  pts += nbaCareerPoints(s) / LEGACY.pointsPer;
  pts += s.player.legacyBonus ?? 0; // round 25: legacy projects
  return Math.round(pts * 10) / 10;
}

/**
 * Round 25: the career index the leaderboards rank by, built like the JAWS score for real Hall of
 * Fame cases. Each season is worth its honours (as in the legacy score), its NBA points and how
 * good he was that year (a tenth of a point for every OVR above 60, at any level). The index
 * averages the career total with the best five seasons in a row, so a long career and a great
 * peak both count.
 */
export function careerIndex(s: GameState): { total: number; best: number; score: number } {
  const years = [...new Set([...s.history.map((h) => h.year), ...s.awards.map((a) => a.year)])].sort((x, y) => x - y);
  const value = years.map((y) => {
    let v = 0;
    for (const a of s.awards) if (a.year === y) v += awardPoints(a.key);
    for (const h of s.history)
      if (h.year === y) {
        if (h.level === 'NBA') v += (h.line.pts + h.post.pts) / LEGACY.pointsPer;
        v += Math.max(0, h.ovrEnd - CAREER_INDEX.ovrFloor) / CAREER_INDEX.ovrPer;
      }
    return v;
  });
  const total = value.reduce((x, v) => x + v, 0);
  let best = 0;
  for (let i = 0; i + Math.min(CAREER_INDEX.stretch, value.length) <= value.length; i++) best = Math.max(best, value.slice(i, i + CAREER_INDEX.stretch).reduce((x, v) => x + v, 0));
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return { total: r1(total), best: r1(best), score: r1((total + best) / 2) };
}

export function nbaCareerPoints(s: GameState): number {
  let p = 0;
  for (const h of s.history) if (h.level === 'NBA') p += h.line.pts + h.post.pts;
  return p;
}

export const count = (s: GameState, key: string): number => s.awards.filter((a) => a.key === key).length;
export const nbaTitles = (s: GameState): number => count(s, 'TITLE') + count(s, 'TITLEKEY');

const rivalOf = (team: string): string[] => RIVALS.filter((r) => r.includes(team)).map((r) => (r[0] === team ? r[1] : r[0]));

/** Teams that would hang the player's jersey (§10). */
export function raftersTeams(s: GameState): string[] {
  const nba = s.history.filter((h) => h.level === 'NBA');
  const legacy = legacyScore(s);
  const out: string[] = [];
  for (const teamId of new Set(nba.map((h) => h.teamId))) {
    const seasons = nba.filter((h) => h.teamId === teamId);
    const keyTitle = seasons.some((h) => h.awards.includes('Champion') && (h.role === 'key'));
    const ok = (seasons.length >= 7 && legacy >= 25) || (seasons.length >= 5 && keyTitle);
    if (!ok) continue;
    // moving to the rival after 5+ seasons here cancels it, unless the player came back
    const years = seasons.map((h) => h.year).sort((x, y) => x - y);
    const fifth = years[Math.min(4, years.length - 1)];
    const rivals = rivalOf(teamId);
    const rivalYears = nba.filter((h) => rivals.includes(h.teamId) && h.year > fifth).map((h) => h.year);
    if (rivalYears.length > 0 && !years.some((y) => y > Math.max(...rivalYears))) continue;
    out.push(teamId);
  }
  return out;
}

export function verdictFor(s: GameState): { tier: string; line: string } {
  const legacy = legacyScore(s);
  const nbaSeasons = s.history.filter((h) => h.level === 'NBA' && h.line.gp > 0).length;
  const glSeasons = s.history.filter((h) => h.level === 'GL').length;
  const euSeasons = s.history.filter((h) => h.level === 'EU' || h.level === 'INT').length;
  const allStar = count(s, 'ALLSTAR') + count(s, 'ALLNBA1') + count(s, 'ALLNBA2') + count(s, 'ALLNBA3') + count(s, 'MVP');
  if (legacy >= LEGACY.firstBallot) return { tier: 'First-ballot Hall of Famer', line: 'Inducted on the first ballot. There was never any doubt.' };
  if (legacy >= LEGACY.hof) return { tier: 'Hall of Famer', line: 'Springfield calls. A Hall of Fame career.' };
  if (allStar > 0) return { tier: 'NBA star', line: 'A name every fan knows.' };
  if (nbaSeasons >= 6) return { tier: 'NBA veteran', line: 'Lasted where most do not. A real NBA career.' };
  if (nbaSeasons >= 2) return { tier: 'Rotation player', line: 'Made it, and stuck for a while.' };
  if (s.nbaGames > 0) return { tier: 'Cup of coffee', line: 'Made it to the league. Nobody can take that away.' };
  if (glSeasons > 0 && glSeasons >= euSeasons) return { tier: 'G League grinder', line: 'Bus rides and ten-day dreams.' };
  if (euSeasons > 0) return { tier: 'Pro overseas', line: 'Got paid to play the game, far from home.' };
  return { tier: 'Hoops dream', line: 'The dream ended before the pros. The love of the game did not.' };
}

export function hallOfFame(s: GameState): 'first' | 'hof' | null {
  const l = legacyScore(s);
  return l >= LEGACY.firstBallot ? 'first' : l >= LEGACY.hof ? 'hof' : null;
}

interface TitleWon {
  year: number;
  level: string; // "NBA", "NCAA", ...
  label: string; // "NBA Champion", "National champions", ...
  teamName: string;
  teamColor: string;
  nba: boolean;
  finalsMvp: boolean; // the series MVP of that final
}

const TITLE_KEYS = ['TITLE', 'TITLEKEY', 'NCAATITLE', 'EUTITLE', 'GLTITLE', 'INTTITLE', 'STATETITLE'];
// the MVP of the deciding series at each level (conference finals MVPs do not count)
const FINAL_MVP_KEYS = ['FMVP', 'FFMOP', 'PLAYOFFMVP'];

/** Every championship he won, with the team he won it with, NBA titles first. */
export function championships(s: GameState): TitleWon[] {
  const out: TitleWon[] = [];
  for (const a of s.awards) {
    if (!TITLE_KEYS.includes(a.key)) continue;
    // the season he won it (G League assignment rows aside)
    const row = s.history.find((h) => h.year === a.year && h.level === a.level && !/assignment/i.test(h.teamName));
    out.push({
      year: a.year,
      level: a.level,
      label: a.key === 'TITLE' || a.key === 'TITLEKEY' ? 'NBA Champion' : a.key === 'NCAATITLE' ? 'National champion' : a.label.split('. ').pop()!,
      teamName: row?.teamName ?? '',
      teamColor: row?.teamColor ?? '#555',
      nba: a.key === 'TITLE' || a.key === 'TITLEKEY',
      finalsMvp: s.awards.some((m) => m.year === a.year && m.level === a.level && FINAL_MVP_KEYS.includes(m.key)),
    });
  }
  return out.sort((x, y) => Number(y.nba) - Number(x.nba) || x.year - y.year);
}
