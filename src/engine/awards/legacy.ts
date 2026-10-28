import { LEGACY } from '../balance';
import { RIVALS } from '../../content/teams';
import type { GameState } from '../types';

export function legacyScore(s: GameState): number {
  let pts = 0;
  for (const a of s.awards) {
    switch (a.key) {
      case 'TITLE':
        pts += LEGACY.title;
        break;
      case 'TITLEKEY':
        pts += LEGACY.titleKey;
        break;
      case 'MVP':
        pts += LEGACY.mvp;
        break;
      case 'FMVP':
        pts += LEGACY.finalsMvp;
        break;
      case 'ALLNBA1':
        pts += LEGACY.allNba[0];
        break;
      case 'ALLNBA2':
        pts += LEGACY.allNba[1];
        break;
      case 'ALLNBA3':
        pts += LEGACY.allNba[2];
        break;
      case 'ALLSTAR':
        pts += LEGACY.allStar;
        break;
      case 'DPOY':
        pts += LEGACY.dpoy;
        break;
      case 'ROY':
        pts += LEGACY.roy;
        break;
      case 'SCORING':
        pts += LEGACY.scoring;
        break;
      case 'SIXTH':
        pts += LEGACY.sixth;
        break;
      case 'NCAATITLE':
        pts += LEGACY.ncaaTitle;
        break;
      case 'EUMVP':
      case 'EUTITLE':
        pts += LEGACY.euro;
        break;
      case 'OLYGOLD':
        pts += 3;
        break;
      case 'WCGOLD':
      case 'NBACUP':
        pts += 1.5;
        break;
      case 'OLYMEDAL':
      case 'WCMEDAL':
      case 'CUPMVP':
        pts += 0.75;
        break;
      case 'ASIANGOLD':
        pts += 0.5;
        break;
      case 'ASIANMEDAL':
        pts += 0.25;
        break;
    }
  }
  pts += nbaCareerPoints(s) / LEGACY.pointsPer;
  return Math.round(pts * 10) / 10;
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
