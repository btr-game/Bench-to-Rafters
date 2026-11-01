// The head coach (round 32). Owner: "can we give the coach a slightly bigger role?", picking: his
// temperament matters, he is on Home with a role talk, and coaches come and go (the hot seat,
// firings, Coach of the Year).
//
// Every team has a head coach: a name and a temperament from the team and how many coaches it has
// had (a new man each time one goes), and in the NBA a coaching factor added to team strength.
// - Temperament nudges a season a little: a players' coach keeps the room loose (chemistry, a
//   point of morale a half, softer swings in trust), a tactician is worth a little in the playoffs,
//   a hardliner makes the grind pay a little more (and trust swings harder, morale a point lower).
// - Once a season the player can ask him for a bigger role; trust, temperament and where he
//   stands on the roster decide the answer.
// - NBA teams that lose badly may fire their coach in the offseason; a losing team at midseason
//   puts his own coach on the hot seat (events/risks.ts); the league names a Coach of the Year.
// The locker room keeps the talks with him and the star's power to have him fired (locker.ts).

import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { COACH as C, COACHING, TRUST_ROLE } from '../balance';
import { chance, clamp, normal } from '../rng';
import type { GameState, League, Team } from '../types';
import { adjust, logDecision, note, roleWithTrust, tally, teamById } from './common';
import { nbaStrength } from '../world/nbaWorld';
import { allows } from '../levels';

/** A small stable number from a string (names, characters, who feuds). */
export function h32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type Temper = 'players' | 'tactician' | 'hardliner';
export const TEMPER: Record<Temper, string> = { players: 'Players’ coach', tactician: 'Tactician', hardliner: 'Hardliner' };
/** What each temperament does, in a line. */
export const TEMPER_FX: Record<Temper, string> = {
  players: 'Keeps the room loose: a little chemistry, a point of morale a half, softer swings in trust.',
  tactician: 'Draws up the playoffs: a small edge in the postseason.',
  hardliner: 'Makes the grind pay a little more; trust swings harder and morale runs a point lower.',
};

export interface Coach {
  name: string;
  temper: Temper;
  /** How good he is, in words (NBA only: the team's coaching factor); empty below the NBA. */
  grade: string;
}

/** The team's head coach: a name and a temperament of his own, a new man each time one goes. */
export function coachOf(team: Team): Coach {
  const k = h32(`${team.id}#${team.coachN ?? 0}`);
  const name = `${FIRST_NAMES[k % FIRST_NAMES.length]} ${LAST_NAMES[(k >>> 9) % LAST_NAMES.length]}`;
  const temper = (['players', 'tactician', 'hardliner'] as Temper[])[(k >>> 20) % 3];
  const f = team.coach;
  const grade = f === undefined ? '' : f >= 1 ? 'Elite' : f >= 0.3 ? 'Good' : f > -0.3 ? 'Average' : f > -1 ? 'Shaky' : 'On the hot seat';
  return { name, temper, grade };
}

/** The team he plays for now, at any level. */
export const myTeam = (s: GameState): Team | null => teamById(s.stage === 'NBA' ? s.nba : s.league, s.teamId);

/** His own coach now, or null between teams. */
const myCoach = (s: GameState): Coach | null => {
  const t = myTeam(s);
  return t ? coachOf(t) : null;
};

/** The coach's trust in words. */
export function trustWord(t: number): string {
  return t >= TRUST_ROLE.up ? 'Trusts you' : t >= 55 ? 'Likes what he sees' : t > TRUST_ROLE.down ? 'Still deciding' : 'Doubts you';
}

// ---------- temperament ----------

interface TemperFx {
  temper: Temper;
  chem: number; // added to the season's chemistry
  post: number; // added in the postseason
  morale: number; // a half
  trustMul: number; // on each half's change in trust
  grind: number; // on growth in a half on the grind
}

/** What his coach's temperament does to this season. */
export function temperFx(s: GameState): TemperFx | null {
  const c = myCoach(s);
  return c ? { temper: c.temper, ...C.temper[c.temper] } : null;
}

/** The season's note for it (the team factors' list). */
export function temperNote(s: GameState, fx: TemperFx): string {
  const c = myCoach(s)!;
  const who = `Coach ${c.name.split(' ').slice(-1)[0]}`;
  return fx.temper === 'players'
    ? `${who}, a players’ coach: a loose, happy room (+${fx.chem})`
    : fx.temper === 'tactician'
      ? `${who}, a tactician: a plan for every playoff series (+${fx.post} in the postseason)`
      : `${who}, a hardliner: the grind pays a little more, and he lets you hear about it`;
}

// ---------- the role talk ----------

/** Once a season, while it is on, unless he already has the biggest role. */
export function canAskRole(s: GameState): boolean {
  if (!allows(s, 'coach')) return false; // round 33: not in the road map's first two levels
  const season = s.season;
  if (!season || !myTeam(s) || s.flags.roleAsk === s.year || season.role === 'key') return false;
  return s.step === 'preseason' || s.step === 'firstHalf' || s.step === 'midseason' || s.step === 'secondHalf';
}

/** How likely he is to say yes (shown to the player only as a word). */
function roleChance(s: GameState): number {
  const c = myCoach(s);
  const season = s.season;
  if (!c || !season) return 0;
  const a = C.ask;
  const near = season.roleRank <= 3 ? a.top : 0;
  return clamp(a.base + (s.player.trust - 50) * a.trust + a.temper[c.temper] + near, a.min, a.max);
}

export function roleOdds(s: GameState): string {
  const p = roleChance(s);
  return p >= 0.6 ? 'He is likely to say yes' : p >= 0.35 ? 'It could go either way' : 'A long shot';
}

/** He asks for a bigger role: yes lifts his trust to where the role moves up a step. */
export function askRole(s: GameState): string | null {
  if (!canAskRole(s)) return null;
  const c = myCoach(s)!;
  const season = s.season!;
  const p = s.player;
  const a = C.ask;
  s.flags.roleAsk = s.year;
  tally(s, 'roleAsks');
  const yes = chance(s.rng, roleChance(s));
  let text: string;
  if (yes) {
    tally(s, 'roleYes');
    p.trust = Math.max(p.trust, TRUST_ROLE.up);
    p.morale = adjust(p.morale, a.yesMorale);
    const was = season.role;
    season.role = roleWithTrust(season.roleRank, p.trust);
    text = `${c.name} hears you out and nods. ${season.role !== was ? `Your role grows: ${was} to ${season.role}.` : 'More minutes when it counts.'} Coach trust ${p.trust}, morale +${a.yesMorale}.`;
  } else {
    const cost = c.temper === 'hardliner' ? a.noTrustHard : a.noTrust;
    p.trust = adjust(p.trust, -cost);
    p.morale = adjust(p.morale, -a.noMorale);
    text = `${c.temper === 'hardliner' ? `${c.name}: "Earn it."` : `${c.name} says not yet: keep doing what you are doing.`} Coach trust -${cost}, morale -${a.noMorale}.`;
  }
  logDecision(s, 'coach', `Asked ${c.name} for a bigger role. ${text}`);
  s.toast = text;
  return text;
}

// ---------- coaching changes ----------

/** His team is losing badly enough at midseason that the coach's job is on the line. */
export function onHotSeat(s: GameState): boolean {
  const t = myTeam(s);
  return !!t && !!s.season && t.w + t.l >= 12 && t.w / (t.w + t.l) < C.hotSeat;
}

/** A team's coach goes and the next one comes in (an NBA team's factor drawn around `hire`). His
 * own team: trust starts over at `trust`. The caller says what happened. */
export function changeCoach(s: GameState, team: Team, trust: number = C.newTrust, hire: number = C.hire): Coach {
  team.coachN = (team.coachN ?? 0) + 1;
  if (team.coach !== undefined) {
    team.coach = normal(s.rng, hire, COACHING.sd);
    team.strength = nbaStrength(team);
  }
  if (team.id === s.teamId) {
    s.player.trust = trust;
    if (s.season) s.season.role = roleWithTrust(s.season.roleRank, trust);
    tally(s, 'coaches');
  }
  return coachOf(team);
}

/** The NBA offseason: teams that lost badly may fire their coach. Returns the news lines. */
export function offseasonCoaching(s: GameState, nba: League): string[] {
  const out: string[] = [];
  for (const t of nba.teams) {
    const games = t.w + t.l;
    if (games < 20 || t.w / games >= C.fireBelow || !chance(s.rng, C.fireChance)) continue;
    const old = coachOf(t);
    const now = changeCoach(s, t);
    out.push(`${t.name} fire ${old.name} after a ${t.w}–${t.l} season; ${now.name} takes over.`);
    if (t.id === s.teamId) {
      s.toast = `${old.name} is out after a ${t.w}–${t.l} season. ${now.name} is your new head coach.`;
      logDecision(s, 'coach', `${t.name} fire ${old.name} after a ${t.w}–${t.l} season. ${now.name} (${TEMPER[now.temper].toLowerCase()}) takes over; coach trust starts over at ${C.newTrust}.`, t.id);
    }
  }
  for (const line of out.slice(0, 3)) note(s, line);
  return out;
}

/** The NBA's Coach of the Year: the coach whose team beat its talent by the most. */
export function coachOfYear(s: GameState, nba: League): { team: Team; coach: Coach } | null {
  const teams = nba.teams.filter((t) => t.w + t.l > 0);
  if (!teams.length) return null;
  const byStrength = [...teams].sort((a, b) => b.strength - a.strength);
  const byWins = [...teams].sort((a, b) => b.w - a.w);
  const over = (t: Team) => byStrength.indexOf(t) - byWins.indexOf(t);
  const best = teams.filter((t) => t.w >= t.l).sort((a, b) => over(b) - over(a) || b.w - a.w)[0];
  if (!best) return null;
  const coach = coachOf(best);
  note(s, `Coach of the Year: ${coach.name}, ${best.name} (${best.w}–${best.l}).`);
  if (best.id === s.teamId) {
    tally(s, 'coyMine');
    s.flags.coyYear = s.year; // other teams come calling for him this offseason (events/round32.ts)
    s.player.trust = adjust(s.player.trust, C.coyTrust);
    logDecision(s, 'coach', `${coach.name} is Coach of the Year. He credits the room, and you. Coach trust +${C.coyTrust}.`, best.id);
  }
  return { team: best, coach };
}
