// Legends showdown (rounds 10-11): every franchise plays with its all-time starting five
// (content/franchiseFives.ts). The player picks a franchise and grows one super-rookie over
// four seasons (the Shoot for the stars potential: 85 to 99), who takes the place of one of
// the legends. The rookie counts double in the team rating and brings his own form to every
// series, so he can swing it. Then a 29-game season (one game against every other franchise)
// and four best-of-seven rounds against the powerhouses. Before every series the player picks
// a game plan, and the scouts say what kind of team is coming: the right plan against the
// right style is worth a few points of rating.

import { FRANCHISE_FIVES, type LegendSpot } from '../../content/franchiseFives';
import { FRANCHISE_IDENTITY } from '../../content/franchiseIdentity';
import { NBA_TEAMS } from '../../content/teams';
import { chance, int, makeRng, next, normal, type Rng } from '../rng';
import { HOME_COURT, MODES } from '../balance';
import { drawPotential } from '../player/create';
import type { Pos } from '../types';
import { buildDrama, type Drama } from '../story/drama';

export type Plan = 'pace' | 'lock' | 'paint' | 'star';
export type Style = 'shooting' | 'paint' | 'defense' | 'star';

export const PLAN_LABEL: Record<Plan, { name: string; text: string }> = {
  pace: { name: 'Pace and space', text: 'Run, spread the floor, let it fly. Slow, big teams struggle to keep up.' },
  lock: { name: 'Lock it down', text: 'Physical, switch everything, win ugly. Shooting teams hate it.' },
  paint: { name: 'Pound the paint', text: 'Feed the bigs, crash the glass. Wears down defensive teams.' },
  star: { name: 'Ride your best player', text: 'Hero ball. Works when he is better than anyone they have.' },
};

export const STYLE_HINT: Record<Style, string> = {
  shooting: 'They live behind the arc.',
  paint: 'They want to bully you inside.',
  defense: 'They will try to grind you down.',
  star: 'Everything runs through one superstar.',
};

/** Which plan beats which style. */
const COUNTER: Record<Plan, Style> = { pace: 'paint', lock: 'shooting', paint: 'defense', star: 'star' };
// legends are closer to each other than ratings suggest: a wider scale than the NBA sim's
// round 15 ("might be too easy"): the right plan is worth less (2.2 to 1.4), the wrong one costs
// more (-0.8 to -1.0), your player counts twice instead of three times, and his form swings more
export const LEGENDS = { counter: 1.4, wrong: -1.0, starGap: 0.3, scale: 6, squeeze: 0.65, rookieWeight: 2, formSd: 2.5, startOvr: 72, growShare: [0.35, 0.4, 0.5, 0.7], breakthrough: 0.12, setback: 0.08 };
// chemistry (round 15): how your player fits the franchise’s identity and the four next to him
export const CHEM = { fits: 0.8, hole: 0.5, crowd: -0.7, position: -0.5, alpha: -0.4, max: 1.5 };
// a super-rookie's ceiling: the Shoot for the stars model, a notch higher (median about 92)
export const ROOKIE_POT = { ...MODES.stars.potential, base: 86, sigma: 0.5, min: 88, max: 99 };

export type Focus = LegendSpot['tag'];
export const FOCUS_LABEL: Record<Focus, { name: string; text: string }> = {
  shooter: { name: 'Shooting lab', text: 'Thousands of threes. He becomes a floor spacer.' },
  scorer: { name: 'Go get buckets', text: 'Isolation, footwork, the mid-range. A scorer.' },
  creator: { name: 'Film and reads', text: 'Passing and feel. He runs the show.' },
  inside: { name: 'Weight room', text: 'Strength and touch inside. A force in the paint.' },
  defense: { name: 'Lockdown', text: 'Footwork and length. He takes the other team’s best player.' },
};

export interface Rookie {
  name: string;
  pos: Pos;
  ovr: number;
  pot: number;
  season: number; // development seasons done (0-4)
  focus: Focus[];
  replaces: string; // the legend he takes the place of
}

export interface LTeam {
  id: string;
  name: string;
  color: string;
  conf: string;
  five: LegendSpot[];
  rating: number;
  style: Style;
  w: number;
  l: number;
}

export interface LSeries {
  round: string;
  a: string; // higher seed
  b: string;
  wa: number;
  wb: number;
  games: [number, number][];
  winner: string;
  plan?: Plan; // his plan, when he played in it
  mvp?: string;
  rookieLine?: string; // the rookie's numbers in the series
}

export interface LegendsState {
  rng: Rng;
  mine: string;
  teams: LTeam[];
  phase: 'grow' | 'season' | 'plan' | 'over';
  rookie: Rookie;
  rounds: { name: string; series: LSeries[] }[];
  next: { opp: string; round: number } | null; // the series he is about to play
  champion: string | null;
  out: string | null; // the round he went out in
  finals?: { us: number; them: number; opp: string; drama: Drama; won: boolean; round: string };
  log: string[];
  chem?: Chemistry; // round 15
  career?: boolean; // round 15: his career player, not a rookie built here
}

export interface Chemistry {
  value: number;
  label: 'Great' | 'Good' | 'Okay' | 'Poor';
  notes: string[];
}

const TAG_NAME: Record<Focus, string> = { shooter: 'shooter', scorer: 'scorer', creator: 'playmaker', inside: 'big', defense: 'defender' };

/** How a player with this role fits a franchise's five in place of one legend. */
export function chemistryOf(teamId: string, five: LegendSpot[], who: { pos: Pos; tag: Focus }, replaces: string): Chemistry {
  const id = FRANCHISE_IDENTITY[teamId];
  const gone = five.find((p) => p.name === replaces) ?? five[0];
  const rest = five.filter((p) => p !== gone);
  const notes: string[] = [];
  let v = 0;
  if (id?.wants.includes(who.tag)) {
    v += CHEM.fits;
    notes.push(`A ${TAG_NAME[who.tag]} fits the ${id.name} identity`);
  }
  const same = rest.filter((p) => p.tag === who.tag).length;
  if (same === 0) {
    v += CHEM.hole;
    notes.push(`Nobody else is a ${TAG_NAME[who.tag]}: you fill a hole`);
  } else if (same >= 2) {
    v += CHEM.crowd;
    notes.push(`Already ${same} ${TAG_NAME[who.tag]}s next to you: roles overlap`);
  }
  if (gone.pos !== who.pos) {
    v += CHEM.position;
    notes.push(`Out of position: you play ${who.pos} in ${gone.name}’s ${gone.pos} spot`);
  }
  const alpha = rest.find((p) => p.ovr >= 97 && (p.tag === 'scorer' || p.tag === 'creator'));
  if (alpha && (who.tag === 'scorer' || who.tag === 'creator')) {
    v += CHEM.alpha;
    notes.push(`You and ${alpha.name} both want the ball`);
  }
  const value = Math.round(Math.max(-CHEM.max, Math.min(CHEM.max, v)) * 10) / 10;
  if (notes.length === 0) notes.push('No problems, no special spark');
  return { value, label: value >= 1 ? 'Great' : value >= 0.3 ? 'Good' : value > -0.4 ? 'Okay' : 'Poor', notes };
}

const ROUNDS = ['First round', 'Conference semifinals', 'Conference finals', 'Finals'];

function styleOf(five: LegendSpot[]): Style {
  const best = Math.max(...five.map((p) => p.ovr));
  const second = [...five].sort((a, b) => b.ovr - a.ovr)[1].ovr;
  if (best >= 97 && best - second >= 3) return 'star';
  const count = (t: LegendSpot['tag']) => five.filter((p) => p.tag === t).length;
  if (count('defense') >= 2) return 'defense';
  if (count('inside') >= 2) return 'paint';
  if (count('shooter') >= 1) return 'shooting';
  if (count('inside') >= 1) return 'paint';
  return count('defense') >= 1 ? 'defense' : 'shooting';
}

/** Team rating: the five's average, plus a little for balance (a creator, a big, a shooter, a stopper). */
export function ratingOf(five: LegendSpot[]): number {
  const w = (p: LegendSpot) => (p.rookie ? LEGENDS.rookieWeight : 1);
  const avg = five.reduce((a, p) => a + p.ovr * w(p), 0) / five.reduce((a, p) => a + w(p), 0);
  const has = (t: LegendSpot['tag']) => five.some((p) => p.tag === t);
  const balance = (has('creator') ? 0.4 : 0) + (has('inside') ? 0.4 : 0) + (has('shooter') ? 0.4 : 0) + (has('defense') ? 0.4 : 0);
  // legends are closer to each other than their numbers: squeeze the gaps toward 90
  return Math.round((90 + (avg + balance - 90) * LEGENDS.squeeze) * 10) / 10;
}

export function legendTeams(): LTeam[] {
  return NBA_TEAMS.map((t) => {
    const five = FRANCHISE_FIVES[t.abbr];
    return { id: t.abbr, name: `${t.city} ${t.nick}`, color: t.color, conf: t.conf, five, rating: ratingOf(five), style: styleOf(five), w: 0, l: 0 };
  });
}

/** A franchise run, starting with the rookie's first development season. */
export function newLegends(seed: number, mine: string, rookieName: string, replaces: string): LegendsState {
  const rng = makeRng(seed);
  const teams = legendTeams();
  const legend = teams.find((t) => t.id === mine)!.five.find((p) => p.name === replaces) ?? teams.find((t) => t.id === mine)!.five[0];
  const rookie: Rookie = {
    name: rookieName.trim() || 'The Rookie',
    pos: legend.pos,
    ovr: Math.round((LEGENDS.startOvr + normal(rng, 0, 3)) * 10) / 10,
    pot: drawPotential(rng, ROOKIE_POT),
    season: 0,
    focus: [],
    replaces: legend.name,
  };
  return { rng, mine, rookie, teams, phase: 'grow', rounds: [], next: null, champion: null, out: null, log: [] };
}

/** His career player's role among the legends, read from his ratings. */
export function careerTag(a: Record<'SHT' | 'FIN' | 'PLY' | 'PER' | 'INT' | 'REB' | 'ATH' | 'IQ', number>): Focus {
  const c: [Focus, number][] = [
    ['shooter', a.SHT],
    ['creator', (a.PLY + a.IQ) / 2],
    ['inside', (a.FIN + a.REB + a.INT) / 3],
    ['defense', (a.PER + a.INT) / 2],
    ['scorer', (a.FIN + a.SHT + a.ATH) / 3 - 1],
  ];
  return c.sort((x, y) => y[1] - x[1])[0][0];
}

/** Round 15: with a career at OVR 90+, his own player joins the legends, no development years. */
export function newLegendsCareer(seed: number, mine: string, me: { name: string; pos: Pos; ovr: number; tag: Focus }, replaces: string): LegendsState {
  const st = newLegends(seed, mine, me.name, replaces);
  st.career = true;
  Object.assign(st.rookie, { pos: me.pos, ovr: me.ovr, pot: me.ovr, season: LEGENDS.growShare.length, focus: [me.tag] });
  joinTeam(st);
  return st;
}

/** One development season for the rookie (four in all), then he joins the team. */
export function growRookie(st: LegendsState, focus: Focus): string {
  if (st.phase !== 'grow') return '';
  const r = st.rookie;
  const share = LEGENDS.growShare[r.season] ?? 0.5;
  let mult = 0.75 + next(st.rng) * 0.5;
  let note = '';
  if (chance(st.rng, LEGENDS.breakthrough)) {
    mult *= 1.6;
    note = 'A breakthrough year.';
  } else if (chance(st.rng, LEGENDS.setback)) {
    mult *= 0.35;
    note = 'A hard year: an injury cost him months.';
  }
  const gain = Math.max(0.5, (r.pot - r.ovr) * share * mult);
  r.ovr = Math.round(Math.min(r.pot, r.ovr + gain) * 10) / 10;
  r.focus.push(focus);
  r.season++;
  const line = `Year ${r.season} (${FOCUS_LABEL[focus].name}): OVR ${Math.round(r.ovr)}${note ? `. ${note}` : ''}`;
  st.log.push(line);
  if (r.season >= LEGENDS.growShare.length) joinTeam(st);
  return line;
}

/** His main identity: the focus he chose most (the latest breaks a tie). */
export function rookieTag(r: Rookie): Focus {
  const n = (f: Focus) => r.focus.filter((x) => x === f).length;
  return [...r.focus].reverse().sort((a, b) => n(b) - n(a))[0] ?? 'scorer';
}

function joinTeam(st: LegendsState): void {
  const me = st.teams.find((t) => t.id === st.mine)!;
  const r = st.rookie;
  st.chem = chemistryOf(me.id, me.five, { pos: r.pos, tag: rookieTag(r) }, r.replaces);
  me.five = me.five.map((p) => (p.name === r.replaces ? { name: r.name, pos: r.pos, ovr: Math.round(r.ovr), peak: st.career ? 'you' : 'rookie', tag: rookieTag(r), rookie: true } : p));
  me.rating = Math.round((ratingOf(me.five) + st.chem.value) * 10) / 10;
  st.log.push(`Chemistry: ${st.chem.label.toLowerCase()} (${st.chem.value >= 0 ? '+' : ''}${st.chem.value} team rating). ${st.chem.notes.join('. ')}.`);
  me.style = styleOf(me.five);
  st.log.push(`${r.name} joins the starting five in place of ${r.replaces}.`);
  st.phase = 'season';
}

const byId = (st: LegendsState, id: string) => st.teams.find((t) => t.id === id)!;

function planBonus(st: LegendsState, plan: Plan | undefined, opp: LTeam): number {
  if (!plan) return 0;
  const me = byId(st, st.mine);
  if (plan === 'star') {
    const myBest = Math.max(...me.five.map((p) => p.ovr));
    const theirBest = Math.max(...opp.five.map((p) => p.ovr));
    return Math.max(-1, Math.min(LEGENDS.counter, (myBest - theirBest) * LEGENDS.starGap + (opp.style === 'star' ? 0.4 : 0)));
  }
  return COUNTER[plan] === opp.style ? LEGENDS.counter : LEGENDS.wrong;
}

/** One game: returns [a score, b score]. */
function game(r: Rng, a: number, b: number, homeA: number): [number, number] {
  const p = 1 / (1 + Math.exp(-((a - b + homeA * HOME_COURT) / LEGENDS.scale)));
  const aWon = chance(r, p);
  const total = 224 + normal(r, 0, 12);
  const margin = chance(r, 0.35) ? int(r, 1, 4) : int(r, 1, 16);
  const win = Math.round((total + margin) / 2);
  return aWon ? [win, win - margin] : [win - margin, win];
}

/** The season: one game against every other franchise, everyone. */
export function playSeason(st: LegendsState): void {
  if (st.phase !== 'season') return;
  const ts = st.teams;
  for (let i = 0; i < ts.length; i++)
    for (let j = i + 1; j < ts.length; j++) {
      const [x, y] = game(st.rng, ts[i].rating, ts[j].rating, chance(st.rng, 0.5) ? 1 : -1);
      if (x > y) {
        ts[i].w++;
        ts[j].l++;
      } else {
        ts[j].w++;
        ts[i].l++;
      }
    }
  const me = byId(st, st.mine);
  st.log.push(`Season: ${me.w}–${me.l}.`);
  // eight a conference, seeded 1 v 8
  const seeds = (conf: string) => standings(st).filter((t) => t.conf === conf).slice(0, 8);
  const pair = (s: LTeam[]): LSeries[] => [0, 3, 2, 1].map((k) => ({ round: ROUNDS[0], a: s[k].id, b: s[7 - k].id, wa: 0, wb: 0, games: [], winner: '' }));
  const west = seeds('West');
  const east = seeds('East');
  st.rounds = [{ name: ROUNDS[0], series: [...pair(west), ...pair(east)] }];
  const inIt = [...west, ...east].some((t) => t.id === st.mine);
  if (!inIt) {
    st.out = 'the regular season';
    st.log.push('Missed the playoffs.');
    simRest(st);
    return;
  }
  queueNext(st);
}

export function standings(st: LegendsState): LTeam[] {
  return [...st.teams].sort((a, b) => b.w - a.w || b.rating - a.rating);
}

export function seedOf(st: LegendsState, id: string): number {
  const t = byId(st, id);
  return standings(st).filter((x) => x.conf === t.conf).findIndex((x) => x.id === id) + 1;
}

function playSeries(st: LegendsState, s: LSeries, plan?: Plan): void {
  const A = byId(st, s.a);
  const B = byId(st, s.b);
  const mineA = s.a === st.mine;
  const mineB = s.b === st.mine;
  // the rookie brings his own form to every series: he can carry it, or not
  const form = mineA || mineB ? normal(st.rng, 0, LEGENDS.formSd) : 0;
  const bonusA = mineA ? planBonus(st, plan, B) + form : 0;
  const bonusB = mineB ? planBonus(st, plan, A) + form : 0;
  // 2-2-1-1-1: the higher seed is home in games 1, 2, 5, 7
  const home = [1, 1, -1, -1, 1, -1, 1];
  let g = 0;
  while (s.wa < 4 && s.wb < 4) {
    const [x, y] = game(st.rng, A.rating + bonusA, B.rating + bonusB, home[g]);
    s.games.push([x, y]);
    if (x > y) s.wa++;
    else s.wb++;
    g++;
  }
  s.winner = s.wa === 4 ? s.a : s.b;
  s.plan = mineA || mineB ? plan : undefined;
  const w = byId(st, s.winner);
  const star = [...w.five].sort((p, q) => q.ovr - p.ovr)[chance(st.rng, 0.7) ? 0 : 1];
  const starPts = 18 + (star.ovr - 85) * 0.9 + normal(st.rng, 0, 3);
  s.mvp = `${star.name}: ${starPts.toFixed(1)} PTS`;
  if (mineA || mineB) {
    const r = st.rookie;
    const tag = rookieTag(r);
    const pts = 16 + (r.ovr - 85) * 1.1 + form * 3 + normal(st.rng, 0, 2);
    const reb = (tag === 'inside' ? 10 : tag === 'defense' ? 7 : 5) + normal(st.rng, 0, 1.2);
    const ast = (tag === 'creator' ? 9 : tag === 'scorer' ? 4 : 3) + normal(st.rng, 0, 1);
    s.rookieLine = `${r.name}: ${pts.toFixed(1)} PTS, ${reb.toFixed(1)} REB, ${ast.toFixed(1)} AST${form > 1 ? ', on fire' : form < -1 ? ', a rough series' : ''}`;
    if (s.winner === st.mine && pts >= starPts - 1) s.mvp = `${r.name}: ${pts.toFixed(1)} PTS`;
  }
}

/** The next series he plays, or the end. */
function queueNext(st: LegendsState): void {
  const r = st.rounds.length - 1;
  const mine = st.rounds[r].series.find((x) => (x.a === st.mine || x.b === st.mine) && !x.winner);
  if (mine) {
    st.next = { opp: mine.a === st.mine ? mine.b : mine.a, round: r };
    st.phase = 'plan';
  } else {
    st.next = null;
    st.phase = 'over';
  }
}

/** Plays his next series with this plan, the rest of the round, and sets up the next round. */
export function playNext(st: LegendsState, plan: Plan): void {
  if (st.phase !== 'plan' || !st.next) return;
  const r = st.next.round;
  const round = st.rounds[r];
  for (const s of round.series) if (!s.winner) playSeries(st, s, s.a === st.mine || s.b === st.mine ? plan : undefined);
  const my = round.series.find((x) => x.a === st.mine || x.b === st.mine)!;
  const opp = byId(st, my.a === st.mine ? my.b : my.a);
  const won = my.winner === st.mine;
  const mw = my.a === st.mine ? my.wa : my.wb;
  const ml = my.a === st.mine ? my.wb : my.wa;
  st.log.push(`${round.name}: ${won ? 'beat' : 'lost to'} the ${opp.name} ${mw}–${ml} (${PLAN_LABEL[plan].name}). ${my.rookieLine ?? ''}`);
  if (r === ROUNDS.length - 1 || !won) {
    // the last game of his last series, play by play
    const last = my.games[my.games.length - 1];
    const us = my.a === st.mine ? last[0] : last[1];
    const them = my.a === st.mine ? last[1] : last[0];
    const me = byId(st, st.mine);
    st.finals = {
      us,
      them,
      opp: opp.id,
      won,
      round: round.name,
      drama: buildDrama({ us, them }, { me: st.rookie.name, mates: me.five.filter((p) => !p.rookie).map((p) => p.name), opps: opp.five.map((p) => p.name), us: me.id, them: opp.id }, (st.rng.s ^ (us * 131 + them)) >>> 0),
    };
  }
  if (!won) {
    st.out = round.name;
    simRest(st);
    return;
  }
  if (r === ROUNDS.length - 1) {
    st.champion = st.mine;
    st.phase = 'over';
    st.next = null;
    st.log.push('Champions of the legends.');
    return;
  }
  nextRound(st);
  queueNext(st);
}

function nextRound(st: LegendsState): void {
  const r = st.rounds.length - 1;
  const prev = st.rounds[r].series;
  const winners = prev.map((s) => s.winner);
  const series: LSeries[] = [];
  for (let i = 0; i + 1 < winners.length; i += 2) {
    const [x, y] = [winners[i], winners[i + 1]];
    const hi = byId(st, x).w >= byId(st, y).w ? x : y;
    series.push({ round: ROUNDS[r + 1], a: hi, b: hi === x ? y : x, wa: 0, wb: 0, games: [], winner: '' });
  }
  st.rounds.push({ name: ROUNDS[r + 1], series });
}

/** He is out: the rest of the bracket plays itself. */
function simRest(st: LegendsState): void {
  for (;;) {
    const round = st.rounds[st.rounds.length - 1];
    for (const s of round.series) if (!s.winner) playSeries(st, s);
    if (st.rounds.length === ROUNDS.length) break;
    nextRound(st);
  }
  st.champion = st.rounds[ROUNDS.length - 1].series[0].winner;
  st.phase = 'over';
  st.next = null;
}

/** What the scouts say about the next opponent, and how the plans look (vague). */
export function scoutNext(st: LegendsState): { opp: LTeam; hint: string; reads: Record<Plan, 'Good' | 'Risky' | 'Neutral'> } | null {
  if (!st.next) return null;
  const opp = byId(st, st.next.opp);
  const reads = {} as Record<Plan, 'Good' | 'Risky' | 'Neutral'>;
  for (const p of Object.keys(PLAN_LABEL) as Plan[]) {
    const b = planBonus(st, p, opp);
    reads[p] = b >= 1 ? 'Good' : b < 0 ? 'Risky' : 'Neutral';
  }
  return { opp, hint: STYLE_HINT[opp.style], reads };
}
