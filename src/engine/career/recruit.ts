// Building the starting five (playtest round 9: "the team factor is a little weak"). Once he is
// the first option on his NBA team, the front office lets him help pick the starters around
// him, every summer:
// - Scouting board: six players from other teams who would start next to him, with their
//   salary and how interested they are (better teams, a bigger star and a pay cut all help).
// - Recruiting one: his weakest starter goes the other way, plus bench salary if the numbers
//   need it. Salaries must fit the cap (RECRUIT in balance.ts); if they do not, he can take a
//   pay cut to make room. Up to two new starters and three asks a summer.
// The new players really move: rosters, team strength and the league around him all change.

import { STARTERS_RECRUIT as R } from '../balance';
import { chance, clamp, shuffle } from '../rng';
import type { GameState, GenPlayer, Team } from '../types';
import { capFor, fmtMoney } from '../economy/salary';
import { adjust, logDecision, pushMoment, teamById, userOvr } from './common';
import { nbaStrength } from '../world/nbaWorld';
import { strengthOf } from '../world/gen';
import { rosterRank } from './team';

export interface RecruitState {
  year: number;
  board: number[]; // GenPlayer ids
  asks: number;
  moves: number;
  cut: number; // pay cut taken this contract, as a share
  cutYear?: number;
}

export interface Target {
  p: GenPlayer;
  team: Team;
  interest: number;
  label: 'Interested' | 'Open to it' | 'Unlikely';
  out: GenPlayer[]; // who would go the other way
  fits: boolean;
  short: number; // $M of room missing when it does not fit
  rec: 'High' | 'Moderate' | 'Low'; // the scouts' call on the move
  why: string; // one vague line, never a number
}

/**
 * The scouts' recommendation (round 9): a deliberately vague read of a move. It weighs what the
 * team strength would really gain (the roster after the swap, depth included), his age, the
 * money, and whether the five still has a big and is not three of the same position.
 */
function scoutCall(s: GameState, p: GenPlayer, out: GenPlayer[]): { rec: Target['rec']; why: string } {
  const t = myTeam(s)!;
  const after = [...t.roster.filter((x) => !out.includes(x)), p];
  const gain = strengthOf(after.map((x) => x.ovr)) - strengthOf(t.roster.map((x) => x.ovr));
  const five = [s.player.pos, ...[...after].sort((a, b) => b.ovr - a.ovr).slice(0, 4).map((x) => x.pos)];
  const noBig = !five.some((x) => x === 'C' || x === 'PF');
  const crowded = five.filter((x) => x === p.pos).length >= 3;
  const pricey = p.salary > capFor(s.year + 1) * 0.28 && gain < 1.2;
  const old = p.age >= 32;
  const score = gain - (old ? 0.45 : 0) + (p.age <= 25 ? 0.2 : 0) - (noBig ? 0.35 : 0) - (crowded ? 0.25 : 0) - (pricey ? 0.3 : 0);
  if (score >= 1.9) return { rec: 'High', why: p.age <= 25 ? 'A difference-maker, and still getting better.' : 'Scouts see a real difference-maker next to you.' };
  if (score >= 0.85) return { rec: 'Moderate', why: old ? 'Helps now; how long is another question.' : noBig || crowded ? 'Talented, but the fit is not perfect.' : 'A solid piece, not a game changer.' };
  return {
    rec: 'Low',
    why: old ? 'His best years may be behind him.' : noBig || crowded ? 'The fit next to you is awkward.' : pricey ? 'A lot of money for what he adds.' : 'Not much better than what you give up.',
  };
}

const myTeam = (s: GameState): Team | null => teamById(s.nba, s.teamId);

/** The four teammates who start next to him. */
export function starters(s: GameState): GenPlayer[] {
  const t = myTeam(s);
  return t ? [...t.roster].sort((a, b) => b.ovr - a.ovr).slice(0, 4) : [];
}

export function payroll(s: GameState): number {
  const t = myTeam(s);
  return (t?.roster.reduce((a, p) => a + p.salary, 0) ?? 0) + (s.contract?.salary ?? 0);
}

export const capLine = (s: GameState): number => capFor(s.year + 1) * R.capShare;

/** He is the first option: nobody on the roster is better. */
export function isFirstOption(s: GameState): boolean {
  const t = myTeam(s);
  if (!t || s.stage !== 'NBA') return false;
  const ovr = userOvr(s);
  return t.roster.every((p) => p.ovr <= ovr) || s.history[s.history.length - 1]?.role === 'key';
}

export function canRecruit(s: GameState): boolean {
  return s.step === 'offseason' && s.stage === 'NBA' && !!s.nba && !!s.contract && s.contract.years > 0 && s.contract.teamId === s.teamId && isFirstOption(s);
}

/** Opens this summer's scouting board (flow.ts calls it after every action). */
export function prepareRecruit(s: GameState): void {
  if (!canRecruit(s) || s.recruit?.year === s.year) return;
  // a pay cut lasts as long as the contract it was taken on
  const keepCut = s.recruit && s.contract && s.recruit.cutYear !== undefined && s.contract.signedYear <= s.recruit.cutYear ? s.recruit.cut : 0;
  s.recruit = { year: s.year, board: buildBoard(s), asks: 0, moves: 0, cut: keepCut, cutYear: keepCut ? s.recruit?.cutYear : undefined };
}

const state = (s: GameState): RecruitState | null => (s.recruit?.year === s.year ? s.recruit : null);

function buildBoard(s: GameState): number[] {
  const nba = s.nba!;
  const weakest = starters(s)[3]?.ovr ?? 70;
  const pool = nba.teams
    .filter((t) => t.id !== s.teamId)
    .flatMap((t) => t.roster.filter((p) => p.ovr >= weakest + 2 && p.age <= 34))
    .sort((a, b) => b.ovr - a.ovr);
  // a couple of stars, the rest from the useful middle
  const stars = pool.slice(0, 8);
  const rest = pool.slice(8);
  const picks = [...shuffle(s.rng, stars).slice(0, 2), ...shuffle(s.rng, rest).slice(0, R.board - 2)];
  return picks.sort((a, b) => b.ovr - a.ovr).map((p) => p.id);
}

/** How likely he is to agree to come. */
function interestOf(s: GameState, p: GenPlayer, from: Team): number {
  const nba = s.nba!;
  const mine = myTeam(s)!;
  const n = nba.teams.length;
  const ovr = userOvr(s);
  const winNow = (rosterRank(nba, from.id) - rosterRank(nba, mine.id)) / n; // positive: we are better
  // a star can sell the vision even on a bad team; better players are harder to move
  return clamp(0.45 + winNow * 0.35 + (ovr - 80) * 0.03 + (p.age >= 30 ? 0.1 : 0) - (p.ovr > ovr ? 0.15 : 0) + ((state(s)?.cut ?? 0) / R.cutStep) * R.cutInterest, 0.08, 0.92);
}

/** What goes the other way, and whether the money works. */
function package_(s: GameState, p: GenPlayer): { out: GenPlayer[]; fits: boolean; short: number } {
  const t = myTeam(s)!;
  const st = starters(s);
  const out: GenPlayer[] = [st[st.length - 1]].filter(Boolean);
  const bench = [...t.roster].sort((a, b) => b.ovr - a.ovr).slice(4).sort((a, b) => b.salary - a.salary);
  const pay = payroll(s);
  const cap = capLine(s);
  const works = () => {
    const outPay = out.reduce((a, x) => a + x.salary, 0);
    return pay - outPay + p.salary <= cap || p.salary <= outPay * R.match;
  };
  for (const b of bench) {
    if (works() || out.length >= 3) break;
    out.push(b);
  }
  const outPay = out.reduce((a, x) => a + x.salary, 0);
  const fits = works();
  const short = fits ? 0 : Math.min(pay - outPay + p.salary - cap, p.salary - outPay * R.match);
  return { out, fits, short: Math.max(0, short) };
}

export function scoutingBoard(s: GameState): Target[] {
  const st = state(s);
  if (!canRecruit(s) || !st) return [];
  const nba = s.nba!;
  const out: Target[] = [];
  for (const id of st.board) {
    const team = nba.teams.find((t) => t.roster.some((p) => p.id === id));
    const p = team?.roster.find((x) => x.id === id);
    if (!team || !p || team.id === s.teamId) continue;
    const interest = interestOf(s, p, team);
    const pk = package_(s, p);
    out.push({ p, team, interest, label: interest >= 0.6 ? 'Interested' : interest >= 0.35 ? 'Open to it' : 'Unlikely', ...pk, ...scoutCall(s, p, pk.out) });
  }
  return out;
}

export function recruitInfo(s: GameState): { payroll: number; cap: number; moves: number; asks: number; cut: number } {
  const st = state(s);
  return { payroll: payroll(s), cap: capLine(s), moves: st?.moves ?? 0, asks: st?.asks ?? 0, cut: st?.cut ?? 0 };
}

/** Takes 10% less for the rest of his contract. */
export function takePayCut(s: GameState): void {
  const st = state(s);
  if (!canRecruit(s) || !s.contract || !st) return;
  if (st.cut >= R.maxCut - 1e-9) return;
  const before = s.contract.salary;
  s.contract.salary = Math.round(before * (1 - R.cutStep) * 10) / 10;
  st.cut = Math.round((st.cut + R.cutStep) * 100) / 100;
  st.cutYear = s.year;
  s.player.trust = adjust(s.player.trust, 4);
  s.player.rep = clamp(s.player.rep + 1, 0, 100);
  logDecision(s, 'paycut', `Took a pay cut (${fmtMoney(before)} to ${fmtMoney(s.contract.salary)}) to make room for better teammates.`);
  s.toast = `Pay cut: ${fmtMoney(s.contract.salary)} a year now. ${fmtMoney(before - s.contract.salary)} more room, and teammates notice.`;
}

/** Tries to bring a player in. Returns true when he joins. */
export function recruitPlayer(s: GameState, id: number): boolean {
  const st = state(s);
  if (!canRecruit(s) || !st) return false;
  if (st.moves >= R.moves || st.asks >= R.asks) return false;
  const tg = scoutingBoard(s).find((x) => x.p.id === id);
  if (!tg || !tg.fits) return false;
  st.asks++;
  st.board = st.board.filter((x) => x !== id);
  if (!chance(s.rng, tg.interest)) {
    s.player.morale = adjust(s.player.morale, -1);
    logDecision(s, 'recruit', `Tried to recruit ${tg.p.name} from the ${tg.team.name}. He stayed.`);
    s.toast = `${tg.p.name} thanks you for the call, but he is staying with the ${tg.team.name}.`;
    return false;
  }
  const mine = myTeam(s)!;
  const before = mine.strength;
  tg.team.roster = tg.team.roster.filter((x) => x.id !== id);
  for (const o of tg.out) {
    mine.roster = mine.roster.filter((x) => x.id !== o.id);
    o.teamId = tg.team.id;
    tg.team.roster.push(o);
  }
  tg.p.teamId = mine.id;
  tg.p.contractYears = Math.max(tg.p.contractYears, 2);
  mine.roster.push(tg.p);
  mine.roster.sort((a, b) => b.ovr - a.ovr);
  tg.team.roster.sort((a, b) => b.ovr - a.ovr);
  mine.strength = nbaStrength(mine);
  tg.team.strength = nbaStrength(tg.team);
  st.moves++;
  s.player.morale = adjust(s.player.morale, 4);
  const outNames = tg.out.map((o) => o.name).join(' and ');
  logDecision(s, 'recruit', `Recruited ${tg.p.name} (${tg.p.pos}) from the ${tg.team.name}; ${outNames} went the other way.`, tg.team.id);
  pushMoment(s, {
    kind: 'commit',
    title: `${tg.p.name} is coming`,
    teamName: mine.name,
    color: mine.color,
    text: `You made the call, and ${tg.p.name} said yes. The ${tg.team.name} get ${outNames} in return.`,
    lines: [`New starter: ${tg.p.pos}, OVR ${Math.round(tg.p.ovr)}, ${fmtMoney(tg.p.salary)} a year`, `Team strength ${before.toFixed(1)} to ${mine.strength.toFixed(1)}`, `Roster rank: ${rosterRank(s.nba!, mine.id)} of ${s.nba!.teams.length}`],
  });
  s.toast = `${tg.p.name} joins the ${mine.name}.`;
  return true;
}
