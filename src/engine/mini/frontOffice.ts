// Front Office (round 10): the game from the other chair. You run an NBA franchise for three
// seasons (six until round 12b, then four) in the same simulated league the career mode uses (world/nbaWorld.ts):
// - Draft: a class of prospects with scouting reports. Every report starts vague; scouting
//   points buy a closer look (current level, ceiling, strengths and weaknesses, work ethic,
//   medicals). The other 29 teams draft off the consensus board.
// - Market: trade for players on other teams (they want value back, and salaries must fit the
//   cap or the 125% rule) and sign players from Europe and the leagues abroad (cap room, the
//   mid-level exception once a season, or the minimum). Their reports are fuzzy until scouted.
// - Identity: a game plan for the season that fits your roster or does not.
// - Season: the league plays it out. Miss the playoffs in seasons 2 and 3 and you are fired.
// Real numbers stay hidden behind ranges and words, as in the career mode.

import { DRAFT, ATTRS } from '../balance';
import { chance, clamp, int, makeRng, normal, pick, range, shuffle, type Rng } from '../rng';
import type { AttrKey, GameState, GenPlayer, Team } from '../types';
import { ovrOf } from '../player/ovr';
import { newGame } from '../flow';
import { buildNba } from '../world/leagues';
import { quickNbaSeason, playoffTeamIds, warmUpNba } from '../career/nbaYear';
import { draftOrder, generateClass, type DraftPickResult, type Prospect } from '../world/draft';
import { nbaOffseason, nbaStrength } from '../world/nbaWorld';
import { genPlayer, strengthOf } from '../world/gen';
import { bracketExit, standings } from '../sim/leagueSim';
import { capFor, marketValue, minSalary, fmtMoney } from '../economy/salary';
import { ARCHETYPES } from '../player/archetypes';
import { EURO_CLUBS, INT_LEAGUES } from '../../content/teams';
import { NAMES } from '../../content/strings';

export const FO = {
  seasons: 3,
  draftScout: 8,
  marketScout: 5,
  trades: 3,
  signings: 2,
  mle: 0.07, // share of the cap
  rosterMax: 15,
  rosterMin: 13,
  match: 1.25,
  accept: 0.88, // a team takes a deal worth this share of what it gives up (round 11: lowered from 1.02)
  // scouting: how wide the ranges are at each level (current OVR, ceiling)
  ovrSd: [6, 3.5, 2, 1],
  potSd: [9, 5.5, 3, 1.5],
};

export type Tactic = 'pace' | 'defense' | 'star' | 'depth';
export const TACTIC_LABEL: Record<Tactic, { name: string; text: string }> = {
  pace: { name: 'Pace and space', text: 'Shooters and guards everywhere. Needs ball handlers and wings.' },
  defense: { name: 'Defense first', text: 'Protect the rim, grind games out. Needs a real center.' },
  star: { name: 'Ride the star', text: 'Your best player gets everything. Needs one clear star.' },
  depth: { name: 'Deep rotation', text: 'Ten guys, fresh legs. Needs a strong bench.' },
};

export interface FoProspect {
  pr: Prospect;
  level: number; // 0-3: how closely he has been scouted
  ovrN: number[]; // the scouts' error at each level (fixed when the class is made)
  potN: number[];
  med: 'clean' | 'wear' | 'red';
  dev: number; // work ethic (the hidden development factor)
  rank: number; // consensus board rank
  takenBy?: string;
  pick?: number;
}

export interface FoFree {
  p: GenPlayer;
  from: string;
  ask: number;
  level: number;
  ovrN: number[];
  signed?: boolean;
}

export interface FoSeason {
  year: number;
  w: number;
  l: number;
  seed: number;
  exit: string;
  champion: string;
  tactic: Tactic;
  title: boolean;
}

export interface FoState {
  world: GameState;
  mine: string;
  season: number; // 1-based
  phase: 'draft' | 'market' | 'tactic' | 'results' | 'over';
  scout: number;
  draft: { cls: FoProspect[]; order: string[]; at: number } | null;
  market: { targets: number[]; free: FoFree[]; trades: number; signings: number; mle: boolean; dead: number } | null;
  tactic: Tactic | null;
  history: FoSeason[];
  log: string[];
  fired: boolean;
  news: string[]; // what changed in the offseason
}

// ---------- setup ----------

export function newFrontOffice(seed: number, mine: string): FoState {
  const world = newGame(seed, { name: 'Front Office', number: 0, pos: 'SF', archetype: 0, focus: ['SHT', 'IQ'], mode: 'standard' });
  world.nba = buildNba(world, world.year);
  warmUpNba(world, 8);
  quickNbaSeason(world);
  const fo: FoState = { world, mine, season: 1, phase: 'draft', scout: FO.draftScout, draft: null, market: null, tactic: null, history: [], log: [], fired: false, news: [] };
  startDraft(fo);
  return fo;
}

/** Franchises to choose from, best roster first, with a word on where they stand. */
export function franchises(seed: number): { id: string; name: string; color: string; strength: number; tier: string }[] {
  const fo = newFrontOffice(seed, 'BOS');
  const teams = [...fo.world.nba!.teams].sort((a, b) => b.strength - a.strength);
  return teams.map((t, i) => ({ id: t.id, name: t.name, color: t.color, strength: t.strength, tier: i < 5 ? 'Contender' : i < 14 ? 'Playoff team' : i < 22 ? 'In the middle' : 'Rebuilding' }));
}

export const myTeam = (fo: FoState): Team => fo.world.nba!.teams.find((t) => t.id === fo.mine)!;
const rng = (fo: FoState): Rng => fo.world.rng;

// ---------- the draft ----------

function startDraft(fo: FoState): void {
  const w = fo.world;
  const cls = generateClass(w).sort((a, b) => b.board - a.board);
  const order = draftOrder(w.rng, w.nba!, playoffTeamIds(w)).map((t) => t.id);
  fo.draft = {
    cls: cls.map((pr, i) => ({
      pr,
      level: 0,
      ovrN: FO.ovrSd.map((sd) => normal(w.rng, 0, sd)),
      potN: FO.potSd.map((sd) => normal(w.rng, 0, sd)),
      med: chance(w.rng, 0.08) ? 'red' : chance(w.rng, 0.18) ? 'wear' : 'clean',
      dev: clamp(normal(w.rng, 0.8, 0.28), 0.1, 1.4),
      rank: i + 1,
    })),
    order: order.slice(0, 60),
    at: 0,
  };
  fo.scout = FO.draftScout;
  fo.phase = 'draft';
  draftUntilMine(fo);
}

export function myPicks(fo: FoState): number[] {
  return (fo.draft?.order ?? []).map((id, i) => (id === fo.mine ? i + 1 : 0)).filter((x) => x > 0);
}

/** The other teams pick off the consensus board (with their own little biases). */
function draftUntilMine(fo: FoState): void {
  const d = fo.draft!;
  while (d.at < d.order.length && d.order[d.at] !== fo.mine) {
    const avail = d.cls.filter((c) => !c.takenBy);
    let best = avail[0];
    let score = -Infinity;
    for (const c of avail.slice(0, 10)) {
      const sc = c.pr.board + normal(rng(fo), 0, DRAFT.teamNoise * 1.5);
      if (sc > score) {
        score = sc;
        best = c;
      }
    }
    best.takenBy = d.order[d.at];
    best.pick = d.at + 1;
    d.at++;
  }
  if (d.at >= d.order.length) finishDraft(fo);
}

export function scoutProspect(fo: FoState, i: number): void {
  const c = fo.draft?.cls[i];
  if (!c || c.level >= 3 || fo.scout <= 0 || fo.phase !== 'draft') return;
  c.level++;
  fo.scout--;
}

export function draftPlayer(fo: FoState, i: number): void {
  const d = fo.draft;
  if (!d || fo.phase !== 'draft' || d.order[d.at] !== fo.mine) return;
  const c = d.cls[i];
  if (!c || c.takenBy) return;
  c.takenBy = fo.mine;
  c.pick = d.at + 1;
  fo.log.push(`Season ${fo.season} draft: took ${c.pr.p.name} at ${c.pick}.`);
  d.at++;
  draftUntilMine(fo);
}

function finishDraft(fo: FoState): void {
  const w = fo.world;
  const nba = w.nba!;
  const d = fo.draft!;
  const picks: DraftPickResult[] = d.cls
    .filter((c) => c.takenBy)
    .sort((a, b) => a.pick! - b.pick!)
    .map((c) => ({ team: nba.teams.find((t) => t.id === c.takenBy)!, prospect: c.pr, pick: c.pick! }));
  const before = new Map(myTeam(fo).roster.map((p) => [p.id, p]));
  nbaOffseason(w, nba, picks, w.year + 1);
  w.year += 1;
  // the work ethic and medicals the scouts saw are the real ones
  for (const c of d.cls.filter((x) => x.takenBy)) {
    c.pr.p.dev = c.dev * (c.med === 'red' ? 0.6 : c.med === 'wear' ? 0.9 : 1);
    if (c.med === 'red') c.pr.p.pot = Math.max(Math.round(c.pr.p.ovr), c.pr.p.pot - 4);
  }
  // what happened to his roster over the summer
  const mine = myTeam(fo);
  const now = new Set(mine.roster.map((p) => p.id));
  fo.news = [];
  for (const [id, p] of before) if (!now.has(id)) fo.news.push(`${p.name} left (${p.age >= 33 ? 'retired or released' : 'free agency'}).`);
  for (const p of mine.roster) if (!before.has(p.id) && !p.rookie) fo.news.push(`${p.name} signed to fill the roster.`);
  fo.draft = { ...d, at: d.order.length };
  startMarket(fo);
}

/** The report the scouts can give at their current level. Ranges and words, no exact numbers. */
export function prospectReport(c: FoProspect): {
  now: [number, number];
  ceiling: [number, number];
  role: string;
  strengths: string[];
  weaknesses: string[];
  ethic: string | null;
  medical: string | null;
  type: string;
} {
  const p = c.pr.p;
  const L = c.level;
  const o = p.ovr + c.ovrN[L];
  // a ceiling below where he already is makes no sense, whatever the scouts think
  const pt = Math.max(p.pot + c.potN[L], o + 1);
  const w = (sd: number) => Math.max(1, Math.round(sd * 1.1));
  const arch = ARCHETYPES[p.pos][p.shape] ?? ARCHETYPES[p.pos][0];
  const sorted = [...ATTRS].sort((a, b) => arch.attrs[b] - arch.attrs[a]);
  const centre = Math.round(pt);
  return {
    now: [Math.round(o - w(FO.ovrSd[L])), Math.round(o + w(FO.ovrSd[L]))],
    ceiling: [Math.round(Math.max(o - w(FO.ovrSd[L]), pt - w(FO.potSd[L]))), Math.min(99, Math.round(Math.max(o + w(FO.ovrSd[L]), pt + w(FO.potSd[L]))))],
    role: L === 0 ? 'Needs a closer look' : centre >= 88 ? 'Future star' : centre >= 82 ? 'Starter' : centre >= 76 ? 'Rotation player' : 'Fringe NBA player',
    strengths: L >= 1 ? sorted.slice(0, 2).map((k) => NAMES.attr[k]) : [],
    weaknesses: L >= 1 ? sorted.slice(-2).map((k) => NAMES.attr[k]) : [],
    ethic: L >= 2 ? (c.dev >= 1.05 ? 'Gym rat' : c.dev >= 0.8 ? 'Hard worker' : c.dev >= 0.55 ? 'Up and down' : 'Coasts on talent') : null,
    medical: L >= 3 ? (c.med === 'clean' ? 'Clean' : c.med === 'wear' ? 'Some wear on the knees' : 'Red flag') : null,
    type: `${arch.name} · ${arch.blurb.toLowerCase()}`,
  };
}

// ---------- the market ----------

function startMarket(fo: FoState): void {
  const w = fo.world;
  const nba = w.nba!;
  const mine = myTeam(fo);
  const fifth = [...mine.roster].sort((a, b) => b.ovr - a.ovr)[4]?.ovr ?? 74;
  const pool = nba.teams.filter((t) => t.id !== fo.mine).flatMap((t) => t.roster.filter((p) => p.ovr >= Math.min(fifth, 78) - 1 && p.age <= 34));
  pool.sort((a, b) => b.ovr - a.ovr);
  const targets = [...shuffle(w.rng, pool.slice(0, 10)).slice(0, 3), ...shuffle(w.rng, pool.slice(10)).slice(0, 5)].sort((a, b) => b.ovr - a.ovr).map((p) => p.id);
  const year = w.year;
  const free: FoFree[] = [];
  for (let i = 0; i < 8; i++) {
    const euro = chance(w.rng, 0.6);
    const from = euro ? `${pick(w.rng, EURO_CLUBS.slice(0, 18)).name} (EuroLeague)` : (() => {
      const lg = pick(w.rng, INT_LEAGUES.filter((l) => !l.amateur && !l.homeOnly));
      return `${pick(w.rng, lg.teams)[0]} (${lg.name})`;
    })();
    // most are role players by NBA standards; now and then a real find
    const p = genPlayer(w, clamp(normal(w.rng, euro ? 72 : 70, 3) + (chance(w.rng, 0.12) ? 5 : 0), 64, 83), int(w.rng, 22, 31));
    p.pot = Math.max(Math.round(p.ovr), p.pot);
    const ask = Math.max(minSalary(year, 2), Math.round(marketValue(year, p.ovr, p.age, 0, 'rotation', 3) * range(w.rng, 0.95, 1.3) * 10) / 10);
    free.push({ p, from, ask, level: 0, ovrN: [normal(w.rng, 0, 5), normal(w.rng, 0, 2.5), normal(w.rng, 0, 1)] });
  }
  fo.market = { targets, free, trades: 0, signings: 0, mle: false, dead: 0 };
  fo.scout = FO.marketScout;
  fo.phase = 'market';
}

export const payroll = (fo: FoState): number => myTeam(fo).roster.reduce((a, p) => a + p.salary, 0) + (fo.market?.dead ?? 0);
export const capOf = (fo: FoState): number => capFor(fo.world.year);

/** What a team thinks a player is worth in a trade. */
export function tradeValue(p: GenPlayer): number {
  const age = p.age <= 24 ? 1.15 : p.age <= 29 ? 1 : p.age <= 32 ? 0.8 : 0.55;
  const upside = p.age <= 24 ? Math.max(0, p.pot - p.ovr) * 1.2 : 0;
  // stars cost extra: nobody gives one up for a pile of good players
  return Math.pow(Math.max(0, p.ovr - 66 + upside * 0.35), 2) * age * (p.ovr >= 88 ? 1.35 : 1);
}

export function tradeTargets(fo: FoState): { p: GenPlayer; team: Team }[] {
  const nba = fo.world.nba!;
  return (fo.market?.targets ?? []).flatMap((id) => {
    const team = nba.teams.find((t) => t.roster.some((p) => p.id === id));
    const p = team?.roster.find((x) => x.id === id);
    return team && p && team.id !== fo.mine ? [{ p, team }] : [];
  });
}

/** A vague read of a proposed trade: does the other side like it, and do the salaries work. */
/** A vague read of a proposed trade: does the other side like it, and do the salaries work. */
export function tradeRead(fo: FoState, targetId: number, offer: number[]): { mood: 'No chance' | 'Not enough' | 'Close' | 'They like it'; salaryOk: boolean; ratio: number } {
  const tg = tradeTargets(fo).find((x) => x.p.id === targetId);
  const mine = myTeam(fo);
  const out = mine.roster.filter((p) => offer.includes(p.id));
  if (!tg || out.length === 0) return { mood: 'No chance', salaryOk: false, ratio: 0 };
  const give = out.reduce((a, p) => a + tradeValue(p), 0);
  const ratio = give / Math.max(1, tradeValue(tg.p));
  const outPay = out.reduce((a, p) => a + p.salary, 0);
  const salaryOk = payroll(fo) - outPay + tg.p.salary <= capOf(fo) || tg.p.salary <= outPay * FO.match + 0.1;
  return { mood: ratio >= FO.accept + 0.1 ? 'They like it' : ratio >= FO.accept - 0.12 ? 'Close' : ratio >= 0.45 ? 'Not enough' : 'No chance', salaryOk, ratio };
}

export interface TradeIdea {
  targetId: number;
  ids: number[]; // your players going the other way
  before: number; // your team strength now
  after: number; // and after the deal
  gain: number;
}

/** Your team strength if this deal went through (the same number the season sim uses). */
export function strengthAfter(fo: FoState, targetId: number, offer: number[]): number {
  const mine = myTeam(fo);
  const tg = tradeTargets(fo).find((x) => x.p.id === targetId);
  if (!tg) return nbaStrength(mine);
  return nbaStrength({ ...mine, roster: [...mine.roster.filter((p) => !offer.includes(p.id)), tg.p] });
}

/** The trade value a deal must carry so the other side says yes whatever its mood that day. */
export const SURE_THING = FO.accept / 0.9;

/**
 * Suggested offers for one player (round 12b: "the suggestions are still a little bad"). Every
 * package of one to three of your players that the other side is sure to accept (worth at least
 * SURE_THING of him), the salaries working, and nobody in it better than the player you get;
 * ranked by what the deal does to your team, then by what it costs. Up to three.
 */
export function tradeIdeas(fo: FoState, targetId: number, max = 3): TradeIdea[] {
  const tg = tradeTargets(fo).find((x) => x.p.id === targetId);
  if (!tg) return [];
  const before = nbaStrength(myTeam(fo));
  const pool = [...myTeam(fo).roster].filter((p) => p.ovr <= tg.p.ovr).sort((a, b) => tradeValue(a) - tradeValue(b));
  const out: (TradeIdea & { cost: number })[] = [];
  const consider = (ids: number[]) => {
    const r = tradeRead(fo, targetId, ids);
    if (!r.salaryOk || r.ratio < SURE_THING) return;
    const after = strengthAfter(fo, targetId, ids);
    const cost = pool.filter((p) => ids.includes(p.id)).reduce((a, p) => a + tradeValue(p), 0);
    out.push({ targetId, ids, before, after, gain: Math.round((after - before) * 10) / 10, cost });
  };
  const n = pool.length;
  for (let a = 0; a < n; a++) {
    consider([pool[a].id]);
    for (let b = a + 1; b < n; b++) {
      consider([pool[a].id, pool[b].id]);
      for (let c = b + 1; c < n; c++) consider([pool[a].id, pool[b].id, pool[c].id]);
    }
  }
  // best for the team; a point of strength is worth more than keeping one more player
  out.sort((x, y) => y.after - x.after + (x.ids.length - y.ids.length) * 0.15 || x.cost - y.cost);
  // different packages, not the same two players with a different third
  const picked: TradeIdea[] = [];
  for (const o of out) {
    if (picked.length >= max) break;
    if (picked.some((p) => o.ids.filter((id) => p.ids.includes(id)).length >= Math.min(2, o.ids.length))) continue;
    picked.push({ targetId: o.targetId, ids: o.ids, before: o.before, after: o.after, gain: o.gain });
  }
  return picked;
}

/** Where a team of this strength would rank in the league (1 = best). */
export function rankAt(fo: FoState, strength: number): number {
  return 1 + fo.world.nba!.teams.filter((t) => t.id !== fo.mine && nbaStrength(t) > strength).length;
}

/**
 * The trade board: each target's top offer (null: out of reach), and the best deals for you,
 * the ones that move you up the league, biggest jump first.
 */
export function tradeBoard(fo: FoState, max = 3): { tops: Record<number, TradeIdea | null>; best: TradeIdea[] } {
  const tops: Record<number, TradeIdea | null> = {};
  for (const { p } of tradeTargets(fo)) tops[p.id] = tradeIdeas(fo, p.id, 1)[0] ?? null;
  const jump = (d: TradeIdea) => rankAt(fo, d.before) - rankAt(fo, d.after);
  const best = Object.values(tops)
    .filter((d): d is TradeIdea => !!d && jump(d) > 0)
    .sort((a, b) => jump(b) - jump(a) || b.gain - a.gain || a.ids.length - b.ids.length)
    .slice(0, max);
  return { tops, best };
}

/** The best deals for you (see tradeBoard). */
export const bestTrades = (fo: FoState, max = 3): TradeIdea[] => tradeBoard(fo, max).best;

/** The top suggested offer for a player, or null when nothing on the roster gets it done. */
export function suggestOffer(fo: FoState, targetId: number): number[] | null {
  return tradeIdeas(fo, targetId, 1)[0]?.ids ?? null;
}

export function proposeTrade(fo: FoState, targetId: number, offer: number[]): boolean {
  const m = fo.market;
  if (!m || fo.phase !== 'market' || m.trades >= FO.trades) return false;
  const read = tradeRead(fo, targetId, offer);
  const tg = tradeTargets(fo).find((x) => x.p.id === targetId);
  if (!tg || !read.salaryOk || offer.length === 0 || offer.length > 3) return false;
  m.trades++;
  const ok = read.ratio * range(rng(fo), 0.9, 1.1) >= FO.accept;
  if (!ok) {
    fo.log.push(`The ${tg.team.name} turned down an offer for ${tg.p.name}.`);
    fo.news = [`The ${tg.team.name} said no to your offer for ${tg.p.name}.`];
    return false;
  }
  const mine = myTeam(fo);
  const out = mine.roster.filter((p) => offer.includes(p.id));
  mine.roster = mine.roster.filter((p) => !offer.includes(p.id));
  tg.team.roster = tg.team.roster.filter((p) => p.id !== targetId);
  for (const o of out) {
    o.teamId = tg.team.id;
    tg.team.roster.push(o);
  }
  tg.p.teamId = mine.id;
  mine.roster.push(tg.p);
  for (const t of [mine, tg.team]) {
    t.roster.sort((a, b) => b.ovr - a.ovr);
    t.strength = nbaStrength(t);
  }
  m.targets = m.targets.filter((x) => x !== targetId);
  fo.log.push(`Traded ${out.map((o) => o.name).join(' and ')} to the ${tg.team.name} for ${tg.p.name}.`);
  fo.news = [`Deal done: ${tg.p.name} is yours. ${out.map((o) => o.name).join(' and ')} head to the ${tg.team.name}.`];
  return true;
}

/**
 * A player's eight ratings (round 11: "make the ratings accessible"): generated players carry
 * only an OVR and an archetype, so the archetype's shape is shifted until it matches his OVR.
 */
export function ratingsOf(p: GenPlayer): Record<AttrKey, number> {
  const arch = ARCHETYPES[p.pos][p.shape] ?? ARCHETYPES[p.pos][0];
  const shift = p.ovr - ovrOf(arch.attrs, p.pos);
  const out = {} as Record<AttrKey, number>;
  for (const k of ATTRS) out[k] = Math.round(clamp(arch.attrs[k] + shift, 20, 99));
  return out;
}

/** A word on where a player is headed. */
export function outlook(p: GenPlayer): string {
  if (p.age <= 24 && p.pot - p.ovr >= 6) return 'Still rising';
  if (p.age <= 27) return 'In his prime soon';
  if (p.age <= 30) return 'In his prime';
  if (p.age <= 32) return 'Starting to slow down';
  return 'On the way down';
}

export function scoutFree(fo: FoState, i: number): void {
  const f = fo.market?.free[i];
  if (!f || f.level >= 2 || fo.scout <= 0) return;
  f.level++;
  fo.scout--;
}

export function freeReport(f: FoFree): { now: [number, number]; type: string; strengths: string[] } {
  const o = f.p.ovr + f.ovrN[f.level];
  const half = [6, 3, 1][f.level];
  const arch = ARCHETYPES[f.p.pos][f.p.shape] ?? ARCHETYPES[f.p.pos][0];
  const sorted = [...ATTRS].sort((a, b) => arch.attrs[b] - arch.attrs[a]);
  return { now: [Math.round(o - half), Math.round(o + half)], type: arch.name, strengths: f.level >= 1 ? sorted.slice(0, 2).map((k) => NAMES.attr[k]) : [] };
}

/** How he could sign this player: cap room, the mid-level exception, or not at all. */
export function signHow(fo: FoState, i: number): 'room' | 'mle' | 'min' | null {
  const m = fo.market;
  const f = m?.free[i];
  if (!m || !f || f.signed || m.signings >= FO.signings || myTeam(fo).roster.length >= FO.rosterMax) return null;
  if (payroll(fo) + f.ask <= capOf(fo)) return 'room';
  if (!m.mle && f.ask <= capOf(fo) * FO.mle) return 'mle';
  if (f.ask <= minSalary(fo.world.year, 2) * 1.05) return 'min';
  return null;
}

export function signFree(fo: FoState, i: number): void {
  const how = signHow(fo, i);
  const m = fo.market!;
  const f = m.free[i];
  if (!how) return;
  if (how === 'mle') m.mle = true;
  f.signed = true;
  m.signings++;
  const mine = myTeam(fo);
  f.p.teamId = mine.id;
  f.p.salary = f.ask;
  f.p.contractYears = 2;
  mine.roster.push(f.p);
  mine.roster.sort((a, b) => b.ovr - a.ovr);
  mine.strength = nbaStrength(mine);
  fo.log.push(`Signed ${f.p.name} from ${f.from} (${fmtMoney(f.ask)}, ${how === 'mle' ? 'mid-level exception' : how === 'room' ? 'cap room' : 'minimum'}).`);
  fo.news = [`${f.p.name} signs: ${fmtMoney(f.ask)} a year for two years.`];
}

/** Releases a player: his salary stays on the books this season. */
export function release(fo: FoState, id: number): void {
  const m = fo.market;
  const mine = myTeam(fo);
  if (!m || fo.phase !== 'market' || mine.roster.length <= FO.rosterMin) return;
  const p = mine.roster.find((x) => x.id === id);
  if (!p) return;
  mine.roster = mine.roster.filter((x) => x.id !== id);
  m.dead += p.salary;
  mine.strength = nbaStrength(mine);
  fo.log.push(`Released ${p.name}.`);
  fo.news = [`${p.name} released. His ${fmtMoney(p.salary)} still counts this season.`];
}

export function toTactics(fo: FoState): void {
  if (fo.phase !== 'market') return;
  fo.phase = 'tactic';
}

// ---------- identity and the season ----------

/** How much a game plan suits the roster (team strength points). */
export function tacticFit(fo: FoState, t: Tactic): number {
  const r = [...myTeam(fo).roster].sort((a, b) => b.ovr - a.ovr);
  const top = r.slice(0, 8);
  switch (t) {
    case 'pace':
      return (top.filter((p) => p.pos === 'PG' || p.pos === 'SG' || p.pos === 'SF').length - 4) * 0.45;
    case 'defense':
      return r.slice(0, 5).some((p) => p.pos === 'C' && p.ovr >= (r[2]?.ovr ?? 0) - 2) ? 1.3 : r.slice(0, 5).some((p) => p.pos === 'C') ? 0.5 : -0.6;
    case 'star':
      return clamp(((r[0]?.ovr ?? 0) - (r[1]?.ovr ?? 0) - 3) * 0.35, -0.8, 1.6);
    case 'depth':
      return clamp((strengthOf(r.slice(5, 9).map((p) => p.ovr)) - strengthOf(r.slice(0, 5).map((p) => p.ovr)) + 9) * 0.25, -0.8, 1.4);
  }
}

export const fitWord = (v: number): 'Great fit' | 'Good fit' | 'Okay' | 'Poor fit' => (v >= 1.1 ? 'Great fit' : v >= 0.5 ? 'Good fit' : v >= 0 ? 'Okay' : 'Poor fit');

export function playSeason(fo: FoState, t: Tactic): void {
  if (fo.phase !== 'tactic') return;
  const w = fo.world;
  const nba = w.nba!;
  const mine = myTeam(fo);
  fo.tactic = t;
  const bonus = clamp(tacticFit(fo, t), -1, 1.6);
  mine.strength += bonus;
  quickNbaSeason(w);
  mine.strength -= bonus;
  const b = nba.bracket!;
  const exit = bracketExit(b, mine.id);
  const conf = standings(nba.teams.filter((x) => x.conf === mine.conf));
  const seed = conf.findIndex((x) => x.id === mine.id) + 1;
  const champ = nba.teams.find((x) => x.id === b.champion)!;
  const rec: FoSeason = {
    year: w.year,
    w: mine.w,
    l: mine.l,
    seed,
    exit: exit.champion ? 'Champions' : exit.lastRound ? `Lost in the ${exit.lastRound.toLowerCase()}` : 'Missed the playoffs',
    champion: champ.name,
    tactic: t,
    title: exit.champion,
  };
  fo.history.push(rec);
  fo.log.push(`Season ${fo.season}: ${rec.w}–${rec.l}, ${rec.exit.toLowerCase()}.`);
  const missed = (h?: FoSeason) => !!h && h.exit === 'Missed the playoffs';
  // two seasons of grace to rebuild, then two missed postseasons in a row is the end
  if (fo.season >= 3 && missed(fo.history[fo.history.length - 1]) && missed(fo.history[fo.history.length - 2])) fo.fired = true;
  fo.phase = 'results';
}

export function nextSeason(fo: FoState): void {
  if (fo.phase !== 'results') return;
  if (fo.fired || fo.season >= FO.seasons) {
    fo.phase = 'over';
    return;
  }
  fo.season++;
  fo.tactic = null;
  startDraft(fo);
}

/** A grade for the run. */
export function grade(fo: FoState): { letter: string; text: string } {
  const titles = fo.history.filter((h) => h.title).length;
  const deep = fo.history.filter((h) => /final/i.test(h.exit)).length;
  const made = fo.history.filter((h) => h.exit !== 'Missed the playoffs').length;
  const score = titles * 5 + deep * 1.5 + made * 0.6;
  if (fo.fired) return { letter: 'F', text: 'Fired. The owner wanted wins.' };
  if (titles >= 2) return { letter: 'A+', text: 'A dynasty. Your name goes on the building.' };
  if (titles === 1) return { letter: 'A', text: 'You brought home a title.' };
  if (score >= 4) return { letter: 'B', text: 'A winner every year, just not the last one.' };
  if (score >= 2) return { letter: 'C', text: 'Respectable. The fans wanted more.' };
  return { letter: 'D', text: 'You kept your job. Barely.' };
}

export { makeRng };
