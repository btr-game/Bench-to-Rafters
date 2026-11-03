// The live MVP race on Home (round 11). It shows once the player is at MVP level (OVR 92 and
// up) or already in the top five, during an NBA season; between seasons it shows the final
// voting from the season just played.

import type { GameState } from '../types';
import { palsOn } from './friends';
import { mvpLadder, type MvpLadder } from '../awards/awards';
import { sumLines } from '../sim/statModel';
import { valuePerGame } from '../sim/statModel';
import { userOvr } from './common';
import { projectedLines } from '../sim/genStats';
import { friendCandidates } from './friendLeague';

const MVP_RACE = { fromOvr: 92, top: 5 };

export function liveMvpRace(s: GameState): (MvpLadder & { final: boolean }) | null {
  if (s.stage !== 'NBA' || !s.nba) return null;
  const season = s.season;
  const p = s.player;
  // between seasons: the final voting, when he was in it
  if (!season || season.half === 0 || s.step === 'summary' || s.step === 'offseason' || s.step === 'postseason') {
    const r = s.lastSummary?.races.find((x) => x.award === 'MVP');
    if (!r || s.lastSummary?.level !== 'NBA') return null;
    if (userOvr(s) < MVP_RACE.fromOvr && (r.userRank === null || r.userRank > MVP_RACE.top)) return null;
    return {
      final: true,
      rows: r.top.map((x) => ({ name: x.name, team: x.team, record: '', line: x.line ?? '', score: x.value, isUser: !!x.isUser })),
      userRank: r.userRank,
      gap: r.userRank && r.top[0] ? Math.round((r.top[0].value - (r.top.find((x) => x.isUser)?.value ?? r.top[0].value)) * 10) / 10 : 0,
      games: 82,
    };
  }
  const games = season.games.filter((g) => g.post !== 'G League' && !g.post);
  const line = sumLines(games.map((g) => g.line));
  if (line.gp === 0) return null;
  const prev = [...s.history].reverse().find((h) => h.level === 'NBA' && h.line.gp > 0);
  const ladder = mvpLadder(
    s.nba,
    { name: p.name, teamId: s.teamId!, line, firstHalfLine: season.halfLines[0] ?? line, rep: p.rep, rookie: s.serviceYears === 0, per: p.attrs.PER, int: p.attrs.INT, prevValue: prev ? valuePerGame(prev.line) : null, age: p.age, ovr: userOvr(s), mvpWins: s.awards.filter((a) => a.key === 'MVP').length },
    MVP_RACE.top,
    projectedLines(s.nba, s.teamId, season.roleRank),
    // round 35: classmates in the race, at their share of the games so far (career/friendLeague.ts)
    palsOn(s) ? friendCandidates(s, s.nba, true) : undefined,
  );
  if (userOvr(s) < MVP_RACE.fromOvr && (ladder.userRank === null || ladder.userRank > MVP_RACE.top)) return null;
  return { ...ladder, final: false };
}
