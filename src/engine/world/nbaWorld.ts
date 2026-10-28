// The persistent simulated NBA: generated players grow, age, retire and change teams.

import { COACHING, DECLINE_TABLE, GEN_GROWTH, NBA_WORLD, SUDDEN_DECLINE } from '../balance';
import { chance, clamp, int, normal, range, weightedIndex, type Rng } from '../rng';
import type { GameState, GenPlayer, League, Team } from '../types';
import { valuePerGame } from '../sim/statModel';
import { genPlayer, rosterStrength } from './gen';
import { marketValue, rookieScale } from '../economy/salary';
import type { DraftPickResult } from './draft';

/** Season-level growth or decline for a generated player. */
export function progressGen(rng: Rng, p: GenPlayer): void {
  p.age += 1;
  const gap = GEN_GROWTH.gapRate[Math.max(19, p.age - 1)] ?? 0;
  if (gap > 0 && p.pot > p.ovr) p.ovr += (p.pot - p.ovr) * gap * (p.dev ?? GEN_GROWTH.devMean) * range(rng, 0.7, 1.3);
  const start = 30 + int(rng, -2, 2);
  if (p.age >= start) {
    p.ovr += DECLINE_TABLE[Math.min(DECLINE_TABLE.length - 1, p.age - start)] * range(rng, 0.7, 1.3);
  }
  if (p.age >= SUDDEN_DECLINE.fromAge && chance(rng, SUDDEN_DECLINE.chance)) p.ovr -= range(rng, SUDDEN_DECLINE.min, SUDDEN_DECLINE.max);
  p.ovr = clamp(p.ovr + normal(rng, 0, GEN_GROWTH.noise * 0.5), 30, 97);
  if (p.ovr > p.pot) p.pot = Math.round(p.ovr);
}

export function updateGenRep(p: GenPlayer): void {
  // without a season line (the user was not in the league) reputation follows OVR
  const target = p.s && p.s.gp > 10 ? clamp((valuePerGame(p.s) - 12) * 3.2, 0, 100) : clamp((p.ovr - 72) * 5, 0, 100);
  p.rep = clamp(p.rep * 0.6 + target * 0.4, 0, 100);
}

export const nbaStrength = (t: Team): number => rosterStrength(t.roster) + (t.coach ?? 0);

function signGen(year: number, p: GenPlayer, team: Team, years: number): void {
  p.teamId = team.id;
  p.contractYears = years;
  p.salary = marketValue(year, p.ovr, p.age, p.rep, 'rotation', Math.max(0, p.age - 21));
  team.roster.push(p);
}

/**
 * NBA offseason for generated players: progression, retirements, expiring contracts,
 * draft picks joining rosters, AI free agency, and roster fill.
 * The user is not on any roster; their seat is handled by the career code.
 */
export function nbaOffseason(s: GameState, nba: League, picks: DraftPickResult[], year: number): void {
  const rng = s.rng;
  const fa: GenPlayer[] = [];
  for (const t of nba.teams) {
    const keep: GenPlayer[] = [];
    t.roster.sort((a, b) => b.ovr - a.ovr);
    t.roster.forEach((p, rank) => {
      updateGenRep(p);
      progressGen(rng, p);
      p.rookie = false;
      const retire =
        p.age >= NBA_WORLD.hardRetireAge ||
        (p.age >= NBA_WORLD.retireAge && p.ovr < 74 && chance(rng, 0.5)) ||
        p.ovr < NBA_WORLD.minOvrToStay - 2;
      if (retire) return;
      p.contractYears -= 1;
      if (p.contractYears <= 0) {
        if (rank < 9 && p.age < 33 && chance(rng, NBA_WORLD.reSignChance)) {
          p.contractYears = int(rng, 1, 4);
          p.salary = marketValue(year, p.ovr, p.age, p.rep, 'rotation', Math.max(0, p.age - 21));
          keep.push(p);
        } else fa.push(p);
      } else keep.push(p);
    });
    t.roster = keep;
  }
  // draft picks join their teams
  for (const pk of picks) {
    if (pk.prospect.isUser) continue;
    const p = pk.prospect.p;
    p.rookie = true;
    p.dev = clamp(normal(rng, GEN_GROWTH.devMean, GEN_GROWTH.devSd), 0.05, 1.4);
    p.draftYear = year;
    p.teamId = pk.team.id;
    p.contractYears = pk.pick <= 30 ? 4 : 2;
    p.salary = pk.pick <= 30 ? rookieScale(year, pk.pick) : 1.3;
    pk.team.roster.push(p);
  }
  // trim rosters over the max (lowest OVR non-rookies first)
  for (const t of nba.teams) {
    t.roster.sort((a, b) => b.ovr - a.ovr);
    while (t.roster.length > NBA_WORLD.maxRoster) {
      let idx = t.roster.length - 1;
      for (let i = t.roster.length - 1; i >= 0; i--) {
        if (!t.roster[i].rookie) {
          idx = i;
          break;
        }
      }
      const [cut] = t.roster.splice(idx, 1);
      fa.push(cut);
    }
    t.strength = nbaStrength(t);
  }
  // AI free agency: best players first; stronger teams pull harder
  fa.sort((a, b) => b.ovr - a.ovr);
  for (const p of fa) {
    if (p.age >= 34 && p.ovr < 76) continue; // retires
    const open = nba.teams.filter((t) => t.roster.length < NBA_WORLD.rosterSize);
    if (open.length === 0) break;
    const w = open.map((t) => Math.exp((t.strength - 77) * NBA_WORLD.faStrengthPull) * (NBA_WORLD.rosterSize - t.roster.length));
    const team = open[weightedIndex(rng, w)];
    if (p.ovr < NBA_WORLD.minOvrToStay) continue;
    signGen(year, p, team, int(rng, 1, 3));
    team.strength = nbaStrength(team);
  }
  // fill remaining spots with journeymen; the coaching factor drifts
  for (const t of nba.teams) {
    while (t.roster.length < NBA_WORLD.rosterSize) {
      const p = genPlayer(s, normal(rng, 65, 1.5), int(rng, 23, 30));
      signGen(year, p, t, 1);
    }
    t.coach = (t.coach ?? 0) * COACHING.keep + normal(rng, 0, COACHING.sd);
    t.roster.sort((a, b) => b.ovr - a.ovr);
    t.strength = nbaStrength(t);
  }
}
