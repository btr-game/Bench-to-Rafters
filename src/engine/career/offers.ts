// Offer generation for every path: NCAA recruiting, G League, Europe, NBA.

import { FA_INTEREST, LEVELS, NCAA_TIER_STRENGTH, RECRUIT, ROLE_MINUTES } from '../balance';
import { COLLEGES, EURO_CLUBS, INT_LEAGUES, NBA_TEAMS } from '../../content/teams';
import { chance, clamp, int, pick, poisson, range, shuffle } from '../rng';
import type { Choice, GameState, NcaaTier, Offer, RoleKey, Team } from '../types';
import { LEVEL_RANK, outlookOf, lastRecord, projectedRank, rankOnRoster, ROLE_LABEL, roleForRank, userOvr } from './common';
import { capFor, fmtMoney, marketValue, minSalary } from '../economy/salary';
import { starsForColleges } from './origin';
import { ROLE_ORDER } from '../balance';

const TIER_LABEL: Record<NcaaTier, string> = { blue: 'Blue blood', power: 'Power program', major: 'Major conference', mid: 'Mid-major' };

function offerId(s: GameState): string {
  return `o${s.nextId++}`;
}

export function offerChoice(o: Offer): Choice {
  const money = o.level === 'NCAA' ? (o.kind === 'walkon' ? 'Walk-on' : 'Scholarship') : `${fmtMoney(o.salary)} × ${o.years}`;
  const lvl = o.level === 'NCAA' && o.tier ? `NCAA · ${TIER_LABEL[o.tier]}` : LEVELS[o.level].short;
  const [a, b] = ROLE_MINUTES[o.role];
  const mins = ((a + b) / 2) * (LEVELS[o.level].gameLen / 48);
  return {
    id: o.id,
    label: o.teamName,
    detail: `${lvl} · ${ROLE_LABEL[o.role]} · ${money} · ${o.outlook} · Last season ${o.lastRecord}${o.note ? ` · ${o.note}` : ''}`,
    tags: [lvl, ROLE_LABEL[o.role], money, o.outlook],
    meta: {
      level: LEVEL_RANK[o.level] + (o.tier ? { blue: 0.6, power: 0.45, major: 0.3, mid: 0.1 }[o.tier] : 0),
      role: ROLE_ORDER.indexOf(o.role),
      minutes: mins,
      salary: o.salary,
      years: o.years,
      kind: o.kind,
      color: o.teamColor,
    },
  };
}

// ---------- after senior year: NCAA, G League, Europe ----------

export function splitOffers(s: GameState): Offer[] {
  const rng = s.rng;
  const ovr = userOvr(s);
  // US colleges see less of players who stayed home abroad
  const stars = starsForColleges(s);
  const tiers: NcaaTier[] = [];
  const add = (t: NcaaTier, n: number) => {
    for (let i = 0; i < n; i++) tiers.push(t);
  };
  if (stars === 5) {
    add('blue', int(rng, 2, 3));
    add('power', int(rng, 1, 2));
  } else if (stars === 4) {
    if (chance(rng, 0.25)) add('blue', 1);
    add('power', int(rng, 1, 2));
    add('major', int(rng, 1, 2));
  } else if (stars === 3) {
    if (chance(rng, 0.2)) add('power', 1);
    add('major', int(rng, 1, 2));
    add('mid', int(rng, 1, 2));
  } else if (stars === 2) {
    if (chance(rng, RECRUIT.d1Chance[2])) {
      if (chance(rng, 0.25)) add('major', 1);
      add('mid', int(rng, 1, 2));
    }
  } else if (chance(rng, RECRUIT.d1Chance[1])) {
    add('mid', 1);
  }
  const offers: Offer[] = [];
  const used = new Set<string>();
  for (const t of tiers) {
    const pool = COLLEGES.filter((c) => c.tier === t && !used.has(c.name));
    if (pool.length === 0) continue;
    const c = pick(rng, pool);
    used.add(c.name);
    const strength = NCAA_TIER_STRENGTH[t];
    const rank = projectedRank(strength, ovr);
    const walkon = stars <= 1 || (stars === 2 && t !== 'mid' && chance(rng, 0.5));
    offers.push({
      id: offerId(s),
      level: 'NCAA',
      teamId: c.name,
      teamName: c.name,
      teamColor: c.color,
      kind: walkon ? 'walkon' : 'scholarship',
      salary: 0,
      years: 4,
      role: roleForRank(rank),
      outlook: t === 'blue' ? 'Contender' : t === 'power' ? 'Playoff team' : t === 'major' ? 'Fringe' : 'Rebuilding',
      lastRecord: `${int(rng, 14, 30)}–${int(rng, 4, 16)}`,
      tier: t,
    });
  }
  if (stars >= 4) {
    const t = pick(rng, NBA_TEAMS);
    const rank = projectedRank(66, ovr);
    offers.push({
      id: offerId(s),
      level: 'GL',
      teamId: `GL-${t.abbr}`,
      teamName: t.gl,
      teamColor: t.color,
      kind: 'gl',
      salary: 0.5,
      years: 1,
      role: roleForRank(rank),
      outlook: 'Pathway contract',
      lastRecord: `${int(rng, 10, 24)}–${int(rng, 10, 24)}`,
      note: 'Draft-eligible next summer',
    });
  }
  if (stars >= 4 && chance(rng, 0.6)) offers.push(...intOffers(s, ovr, 1, { nextStars: true }));
  if (stars >= 3) {
    const pool = EURO_CLUBS.filter((c) => (stars >= 4 ? c.strength >= 64 : c.strength <= 65));
    if (stars >= 4 || chance(rng, 0.5)) {
      const c = pick(rng, pool);
      offers.push(euOffer(s, c.name, ovr, 2));
    }
  }
  return offers;
}

export function euOffer(s: GameState, club: string, ovr: number, years: number): Offer {
  const c = EURO_CLUBS.find((x) => x.name === club)!;
  const rank = projectedRank(c.strength, ovr);
  return {
    id: offerId(s),
    level: 'EU',
    teamId: `EU-${c.name}`,
    teamName: c.name,
    teamColor: c.color,
    kind: 'eu',
    salary: Math.round(clamp(0.25 + (ovr - 58) * 0.18, 0.2, 4) * 100) / 100,
    years,
    role: roleForRank(rank),
    outlook: c.strength >= 68 ? 'Contender' : c.strength >= 66 ? 'Playoff team' : 'Fringe',
    lastRecord: `${int(s.rng, 12, 26)}–${int(s.rng, 8, 22)}`,
    note: c.country,
  };
}

export function glOffer(s: GameState, ovr: number, teamAbbr?: string): Offer {
  const t = teamAbbr ? NBA_TEAMS.find((x) => x.abbr === teamAbbr)! : pick(s.rng, NBA_TEAMS);
  return {
    id: offerId(s),
    level: 'GL',
    teamId: `GL-${t.abbr}`,
    teamName: t.gl,
    teamColor: t.color,
    kind: 'gl',
    salary: 0.045,
    years: 1,
    role: roleForRank(projectedRank(66, ovr)),
    outlook: `${t.city} ${t.nick} affiliate`,
    lastRecord: `${int(s.rng, 10, 24)}–${int(s.rng, 10, 24)}`,
  };
}

/** European offers for a player of this OVR (better clubs need higher OVR). */
export function europeOffers(s: GameState, ovr: number, max: number): Offer[] {
  const fade = FA_INTEREST.minorAgeFade(s.player.age);
  const ok = EURO_CLUBS.filter((c) => ovr >= c.strength - 7 && chance(s.rng, fade));
  return shuffle(s.rng, [...ok])
    .slice(0, max)
    .map((c) => euOffer(s, c.name, ovr, int(s.rng, 1, 2)));
}

// ---------- other overseas leagues ----------

/** Offers from NBL, CBA, B.League and KBL clubs. `cba` adds the late-career China money option. */
export function intOffers(s: GameState, ovr: number, max: number, opts: { nextStars?: boolean; cba?: boolean; league?: string } = {}): Offer[] {
  const fade = FA_INTEREST.minorAgeFade(s.player.age);
  const leagues = INT_LEAGUES.filter((l) => {
    if (opts.nextStars) return l.key === 'NBL';
    if (opts.league) return l.key === opts.league;
    if (l.key === 'CBA' && opts.cba) return ovr >= 58;
    return ovr >= l.strength - 7 && chance(s.rng, Math.max(0.25, fade));
  });
  return shuffle(s.rng, leagues)
    .slice(0, max)
    .map((l) => {
      const [name, color] = pick(s.rng, l.teams);
      const t = clamp((ovr - (l.strength - 7)) / 15, 0, 1);
      const salary = Math.round((l.salary[0] + (l.salary[1] - l.salary[0]) * t) * (opts.cba && l.key === 'CBA' ? 1.6 : 1) * 100) / 100;
      return {
        id: offerId(s),
        level: 'INT' as const,
        teamId: `INT-${l.key}-${name}`,
        teamName: name,
        teamColor: color,
        kind: 'int' as const,
        salary,
        years: opts.nextStars ? 1 : int(s.rng, 1, 2),
        role: roleForRank(projectedRank(l.strength, ovr)),
        outlook: `${l.name} · ${l.country}`,
        lastRecord: `${int(s.rng, 8, 22)}–${int(s.rng, 6, 20)}`,
        note: opts.nextStars ? 'NBL Next Stars: paid, pro minutes, draft-eligible next summer' : opts.league ? 'Your home league · draft-eligible from 19' : l.key === 'CBA' && opts.cba ? 'Big money, little NBA attention' : undefined,
      };
    });
}

// ---------- NBA ----------

function nbaYears(age: number): number {
  return age < 28 ? 4 : age < 31 ? 3 : age < 34 ? 2 : 1;
}

export function nbaOffer(s: GameState, team: Team, role: RoleKey, salary: number, years: number, kind: Offer['kind'], note?: string): Offer {
  return {
    id: offerId(s),
    level: 'NBA',
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color,
    kind,
    salary,
    years,
    role,
    outlook: outlookOf(team, s.nba!),
    lastRecord: lastRecord(team),
    note,
  };
}

/**
 * NBA free-agent offers (§12). Count scales with OVR, reputation and minutes.
 * `fromOwn` adds a re-sign offer from the current team if it wants him back.
 */
/** Average OVR of the player at depth-chart rank `rank` across the league. */
function leagueRankOvr(s: GameState, rank: number): number {
  const nba = s.nba!;
  let sum = 0;
  for (const t of nba.teams) {
    const sorted = [...t.roster].sort((a, b) => b.ovr - a.ovr);
    sum += sorted[Math.min(sorted.length - 1, rank - 1)].ovr;
  }
  return sum / nba.teams.length;
}

/** Teams where he would rank within `maxRank`, weakest benches first, `n` of them. */
function interestedTeams(s: GameState, ovr: number, maxRank: number, n: number, exclude: string | null): Team[] {
  const ranked = s.nba!.teams
    .filter((t) => t.id !== exclude)
    .map((t) => ({ t, rank: rankOnRoster(t, ovr) }))
    .filter((x) => x.rank <= maxRank);
  shuffle(s.rng, ranked);
  ranked.sort((a, b) => a.rank - b.rank + (chance(s.rng, 0.5) ? 1 : -1));
  return ranked.slice(0, n).map((x) => x.t);
}

/**
 * NBA free-agent offers (§12). The number of suitors is Poisson around how far he is above
 * the league's typical end-of-rotation player, plus minutes and reputation; veterans fade.
 * The current team may also offer to re-sign him.
 */
export function nbaFreeAgentOffers(s: GameState, ownTeamId: string | null, lastShare: number, lastRole: RoleKey): Offer[] {
  const nba = s.nba!;
  const F = FA_INTEREST;
  const ovr = userOvr(s);
  const p = s.player;
  const year = s.year + 1;
  const offers: Offer[] = [];
  const value = marketValue(year, ovr, p.age, p.rep, lastRole, s.serviceYears);
  const minSal = minSalary(year, s.serviceYears);
  const yearsBase = nbaYears(p.age);
  const own = nba.teams.find((t) => t.id === ownTeamId);
  if (own) {
    const rank = rankOnRoster(own, ovr);
    let pr = F.reSign[lastRole] + (p.trust - 50) / 200 - (p.age > 32 ? 0.2 : 0);
    if (p.captain) pr = Math.max(pr, 0.97);
    if (rank <= F.maxRank && chance(s.rng, clamp(pr, 0.02, 0.99))) {
      const sal = Math.max(minSal, value * range(s.rng, 0.92, 1.08));
      offers.push(nbaOffer(s, own, roleForRank(rank), round1(sal), clamp(yearsBase + int(s.rng, -1, 0), 1, 5), 'standard', 'Your team'));
    }
  }
  const ageMult = p.age >= F.oldAge ? F.oldMult : p.age >= F.vetAge ? F.vetMult : 1;
  const bar = leagueRankOvr(s, F.maxRank);
  const lambda = (Math.max(0, ovr - bar) * F.perPoint + lastShare * F.shareW + p.rep * F.repW) * ageMult;
  const n = Math.min(F.maxOffers, poisson(s.rng, lambda));
  for (const team of interestedTeams(s, ovr, p.age >= F.oldAge ? F.oldMaxRank : F.maxRank, n, ownTeamId)) {
    const rank = rankOnRoster(team, ovr);
    const sal = rank >= F.maxRank - 1 ? minSal : Math.max(minSal, value * range(s.rng, 0.82, 1.08));
    offers.push(nbaOffer(s, team, roleForRank(rank), round1(sal), clamp(yearsBase + int(s.rng, -2, 0), 1, 5), sal <= minSal ? 'min' : 'standard'));
  }
  return offers;
}

/** NBA teams watching a G League or EuroLeague player. */
export function nbaOffersForProspect(s: GameState): Offer[] {
  const F = FA_INTEREST;
  const ovr = userOvr(s);
  const p = s.player;
  const last = s.history[s.history.length - 1];
  const prod = last && last.line.gp > 0 ? (last.line.pts + last.line.reb + last.line.ast) / last.line.gp : 0;
  const bar = leagueRankOvr(s, F.prospectMaxRank);
  const lambda = (Math.max(0, ovr - bar) * F.prospectPerPoint + Math.max(0, prod - 18) * F.prospectProdW + p.rep * F.prospectRepW) * F.minorAgeFade(p.age);
  const n = Math.min(3, poisson(s.rng, lambda));
  return interestedTeams(s, ovr, F.prospectMaxRank, n, null).map((team) => {
    const rank = rankOnRoster(team, ovr);
    return nbaOffer(s, team, roleForRank(rank), minSalary(s.year + 1, s.serviceYears), rank <= 10 ? 2 : 1, 'min', rank >= 11 ? 'Camp deal, roster spot not guaranteed' : undefined);
  });
}

const round1 = (x: number): number => Math.round(x * 10) / 10;

export function capNow(s: GameState): number {
  return capFor(s.year);
}
