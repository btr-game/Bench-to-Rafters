// Nicknames and brands (round 25). Once his reputation reaches Star, the media names him: the
// picker reads about seventy traits off the player (how he looks, what he is best at, his
// numbers, his story, his name and number) and scores every nickname in content/nicknames.ts by
// how well its traits fit, with a little luck; the best one sticks, with the reasons. At
// Superstar, brands want that name on a logo: a fixed deal, or a signature line that pays with
// his fame and puts out a shoe a season once he is an Icon.

import { BRAND, HEIGHT_RANGE, NICKNAME, ATTRS } from '../balance';
import { BRANDS, NICKNAMES, type Nickname as NickDef, type Trait } from '../../content/nicknames';
import { lookTraits } from '../../content/looks';
import { capFor, fmtMoney } from '../economy/salary';
import { idealWeight, weightOf } from '../player/weight';
import { clamp, next, shuffle } from '../rng';
import { pushDecision, pushMoment } from './common';
import type { BrandDeal, Decision, GameState, Nickname } from '../types';
import { allows } from '../levels';

const c01 = (x: number) => clamp(x, 0, 1);

/** Every trait the picker can see, from 0 to 1. */
function traitsOf(s: GameState): Partial<Record<Trait, number>> {
  const p = s.player;
  const t: Partial<Record<Trait, number>> = {};
  // how he looks
  const [lo, hi] = HEIGHT_RANGE[p.pos];
  t.tall = c01((p.height - (hi - 2)) / 4);
  t.small = c01((lo + 2 - p.height) / 4);
  const over = weightOf(p) - idealWeight(p.height, p.age);
  t.heavy = c01((over - 5) / 15);
  t.lean = c01((-over - 5) / 15);
  t.lefty = p.hand === 'L' ? 1 : 0;
  const look = lookTraits(p.name);
  t.afro = look.style === 'afro' || look.style === 'bigafro' ? 1 : 0;
  t.bald = look.style === 'bald' ? 1 : 0;
  t.braids = look.style === 'cornrows' || look.style === 'twists' ? 1 : 0;
  t.flattop = look.style === 'flattop' ? 1 : 0;
  t.beard = look.face === 'beard' || look.face === 'bigbeard' ? 1 : look.face === 'goatee' ? 0.6 : 0;
  t.mustache = look.face === 'mustache' ? 1 : 0;
  t.headband = look.gear.includes('headband') ? 1 : 0;
  t.sleeve = look.gear.includes('sleeve') ? 1 : 0;
  t.goggles = look.gear.includes('goggles') ? 1 : 0;
  // what he is best at, against the rest of his game
  const avg = ATTRS.reduce((a, k) => a + p.attrs[k], 0) / ATTRS.length;
  for (const k of ATTRS) t[k] = c01((p.attrs[k] - avg - 1) / 9);
  const sd = Math.sqrt(ATTRS.reduce((a, k) => a + (p.attrs[k] - avg) ** 2, 0) / ATTRS.length);
  t.balanced = avg >= 65 ? c01(1 - sd / 8) : 0;
  t.range = c01((p.range - 65) / 25);
  t.offhand = c01((p.offhand - 65) / 25);
  // his numbers: the best of any season with ten games
  const per = (k: 'pts' | 'ast' | 'reb' | 'blk' | 'stl' | 'tpm') => Math.max(0, ...s.history.filter((h) => h.line.gp >= 10).map((h) => h.line[k] / h.line.gp));
  t.scorer = c01((per('pts') - 14) / 14);
  t.passer = c01((per('ast') - 4) / 6);
  t.boards = c01((per('reb') - 6) / 6);
  t.blocks = c01((per('blk') - 0.8) / 1.7);
  t.steals = c01((per('stl') - 0.8) / 1.2);
  t.threes = c01((per('tpm') - 1.2) / 2.3);
  // where he plays and what he is
  t.guard = p.pos === 'PG' || p.pos === 'SG' ? 1 : p.pos === 'SF' ? 0.4 : 0;
  t.big = p.pos === 'C' ? 1 : p.pos === 'PF' ? 0.6 : 0;
  t[`arch:${p.archetype}`] = 1;
  // his story
  t.young = p.age <= 21 ? 1 : p.age === 22 ? 0.6 : 0;
  t.veteran = c01((p.age - 29) / 4);
  t.ageless = c01((p.age - 33) / 3) * (p.peakOvr >= 75 ? 1 : 0.4);
  const pro = s.history.filter((h) => h.level === 'NBA' || h.level === 'EU' || h.level === 'INT' || h.level === 'GL');
  const firstNba = s.history.findIndex((h) => h.level === 'NBA');
  const before = firstNba < 0 ? [] : s.history.slice(0, firstNba);
  // a story many players share says less about him than a skill nobody else has, so these stop short of 1
  t.undrafted = s.undrafted ? 0.7 : 0;
  t.latebloomer = firstNba >= 0 && (s.undrafted || before.some((h) => h.level === 'GL' || h.level === 'EU' || h.level === 'INT')) ? 0.7 : 0;
  t.overseas = 0.7 * c01(pro.filter((h) => h.level === 'EU' || h.level === 'INT').length / 3);
  t.international = p.country !== 'USA' ? 0.5 : 0;
  t.loyal = c01((Math.max(0, ...Object.values(s.teamSeasons)) - 3) / 4);
  t.journeyman = c01((new Set(pro.map((h) => h.teamName)).size - 2) / 3);
  const teams = pro.filter((h) => !h.teamName.endsWith('(assignment)')).map((h) => h.teamName);
  t.returned = teams.some((tm, i) => i > 0 && teams[i - 1] !== tm && teams.slice(0, i - 1).includes(tm)) ? 1 : 0;
  t.comeback = c01((p.injuries ?? []).filter((x) => x.days >= 60).length / 2);
  t.durable = s.history.length >= 6 && !(p.injuries ?? []).some((x) => x.days > 20) ? 0.8 : 0;
  t.captain = p.captain ? 1 : 0;
  t.trust = c01((p.trust - 60) / 30);
  t.grind = s.undrafted || t.latebloomer ? 0.6 : 0.2;
  const n = (key: string) => s.awards.filter((a) => a.key === key).length;
  t.clutch = c01(n('FMVP') * 0.6 + n('PLAYOFFMVP') * 0.4 + n('CFMVP') * 0.3);
  const titles = n('TITLE') + n('TITLEKEY');
  t.titles = c01(titles / 2);
  t.winner = titles > 0 ? 1 : 0.2;
  t.awards = c01((n('MVP') * 2 + n('ALLNBA1') + n('ALLNBA2') + n('ALLNBA3') + n('DPOY') + n('ALLSTAR') * 0.5) / 6);
  t.sixth = n('SIXTH') > 0 ? 1 : 0;
  t.rep = c01((p.rep - 55) / 35);
  t.icon = p.rep >= 85 ? 1 : 0;
  t.hometown = t.international ? 0.5 : 0.35;
  // his name and number
  const [first, ...rest] = p.name.split(' ');
  const last = rest.join(' ') || first;
  t.alliteration = first[0]?.toUpperCase() === last[0]?.toUpperCase() ? 1 : 0;
  t.karat = [14, 18, 24].includes(p.number) ? 1 : 0;
  t.num7 = p.number === 7 ? 1 : 0;
  t.num0 = p.number === 0 ? 1 : 0;
  return t;
}

/** What the picker saw, in words (the papers talk to him: "your"). */
const SAW: Partial<Record<Trait, string>> = {
  tall: 'your height', small: 'your size', heavy: 'your frame', lean: 'your frame', lefty: 'your left hand', afro: 'your hair', bald: 'your shaved head', braids: 'your hair', flattop: 'your hair',
  beard: 'your beard', mustache: 'your mustache', headband: 'the headband', sleeve: 'the arm sleeve', goggles: 'the goggles',
  SHT: 'your shooting', FIN: 'your finishing', PLY: 'your handle and passing', PER: 'your perimeter defense', INT: 'your rim protection', REB: 'your rebounding', ATH: 'your athleticism', IQ: 'your feel for the game',
  range: 'your range', offhand: 'your off hand', balanced: 'an all-round game', scorer: 'your scoring', passer: 'your assists', boards: 'your rebounds', blocks: 'your blocks', steals: 'your steals', threes: 'your threes',
  guard: 'your position', big: 'your position', young: 'your age', veteran: 'your years', ageless: 'your years', latebloomer: 'your road to the league', undrafted: 'going undrafted', overseas: 'your years abroad',
  international: 'where you are from', loyal: 'your loyalty', journeyman: 'your travels', comeback: 'your comebacks', durable: 'never missing games', captain: 'the captaincy', trust: 'what teammates say', grind: 'your work rate',
  clutch: 'your big moments', titles: 'your rings', awards: 'your awards', sixth: 'your bench scoring', rep: 'your fame', icon: 'your fame', winner: 'your winning', hometown: 'your hometown',
  alliteration: 'your name', karat: 'your number', num7: 'your number', num0: 'your number',
};

/** How well a nickname fits: the weighted traits, over the square root of the weights (so a long list is no free win). */
export function fitOf(nick: NickDef, t: Partial<Record<Trait, number>>): number {
  const fit = Object.entries(nick.fit) as [Trait, number][];
  const w = fit.reduce((a, [, x]) => a + x, 0);
  const got = fit.reduce((a, [k, x]) => a + x * (t[k] ?? 0), 0);
  return got / Math.sqrt(w);
}

/** A nickname filled in for this player. */
function nameFor(nick: NickDef, s: GameState): { name: string; why: string } {
  const p = s.player;
  const [first, ...rest] = p.name.split(' ');
  const last = rest.join(' ') || first;
  const town = p.hometown.split(',')[0].trim();
  const fill = (x: string) => x.replace(/\{first\}/g, first).replace(/\{last\}/g, last).replace(/\{i\}/g, first[0]?.toUpperCase() ?? '').replace(/\{num\}/g, String(p.number)).replace(/\{town\}/g, town);
  return { name: fill(nick.name), why: fill(nick.why) };
}

/** The media's pick: the best fit, with a little luck, and why. */
function pickNickname(s: GameState): Nickname {
  const t = traitsOf(s);
  let best = NICKNAMES[0];
  let top = -1;
  for (const nick of NICKNAMES) {
    const v = fitOf(nick, t) + next(s.rng) * NICKNAME.noise;
    if (v > top) {
      top = v;
      best = nick;
    }
  }
  const reasons = [...new Set((Object.entries(best.fit) as [Trait, number][])
    .map(([k, w]) => [k, w * (t[k] ?? 0)] as const)
    .filter(([, v]) => v > 0.15)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => (k.startsWith('arch:') ? `how you play (${k.slice(5)})` : SAW[k] ?? k)))].slice(0, 3);
  return { id: best.id, ...nameFor(best, s), reasons, year: s.year };
}

/** At season's end: a famous enough player gets his name. */
export function awardNickname(s: GameState, color: string, teamName: string): void {
  if (!allows(s, 'nickname')) return; // round 33: intermediate level and up
  const p = s.player;
  if (p.nickname || p.rep < NICKNAME.rep) return;
  p.nickname = pickNickname(s);
  pushMoment(s, {
    kind: 'event',
    title: `“${p.nickname.name}”`,
    text: `The papers have a name for you: ${p.nickname.name}, ${p.nickname.why}.`,
    color,
    teamName,
    lines: p.nickname.reasons.length ? [`They noticed ${p.nickname.reasons.join(', ')}.`] : [],
    // round 28 (owner: "instead of giving the nickname and its icon at the same time, reveal the icon
    // when the player gets a brand signing"): the name alone today
    nick: p.nickname.name,
  });
}

// ---------- brands ----------

const proStage = (s: GameState) => s.stage === 'NBA' || s.stage === 'EU' || s.stage === 'INT' || s.stage === 'GL';
const lineBase = (s: GameState) => capFor(s.year + 1) * BRAND.line.base;
const lineRoyalty = (s: GameState, rep: number) => capFor(s.year + 1) * BRAND.line.royalty * clamp((rep - 60) / 40, 0, 1);

/** This season's pay from his deal (0 without one). */
export function brandPay(s: GameState, d: BrandDeal): number {
  return d.kind === 'deal' ? d.perYear : d.perYear + lineRoyalty(s, s.player.rep);
}

/** In the offseason: brands call a famous player with a name and no deal running. */
export function pushBrand(s: GameState): void {
  const p = s.player;
  if (!p.nickname || !proStage(s)) return;
  const d = p.brand;
  if (d && d.left > 0) return;
  if (p.rep < (d ? BRAND.renewRep : BRAND.brandRep)) return;
  const [a, b] = shuffle(s.rng, BRANDS.filter((x) => x.name !== d?.brand)).slice(0, 2);
  const deal = capFor(s.year + 1) * BRAND.deal.share * (p.rep / BRAND.brandRep);
  const decision: Omit<Decision, 'id'> = {
    kind: 'brand',
    title: d ? 'Your deal is up' : 'Brands come calling',
    text: `${p.nickname.name} sells. Two companies want your logo on their products${d ? `; ${d.brand} had it for ${d.years} seasons` : ''}.`,
    choices: [
      { id: `deal:${a.name}`, label: `${a.name} · ${fmtMoney(deal)} a season for ${BRAND.deal.years}`, detail: 'A sure thing: the same money every season, whatever happens.', tags: ['Deal'] },
      { id: `line:${b.name}`, label: `${b.name} signature line · ${fmtMoney(lineBase(s))} a season plus royalties`, detail: `Your own line under your logo for ${BRAND.line.years} seasons. It pays more the more famous you are, and an Icon gets his own shoe every season.`, tags: ['Signature'] },
      { id: 'later', label: 'Not yet', detail: 'Keep your name to yourself for now. They will be back next summer.' },
    ],
    data: { deal, colors: { [a.name]: a.color, [b.name]: b.color } },
  };
  pushDecision(s, decision);
}

export function resolveBrand(s: GameState, d: Decision, choiceId: string): string | null {
  const p = s.player;
  if (choiceId === 'later') return 'No deal this summer.';
  const [kind, brand] = choiceId.split(':') as ['deal' | 'line', string];
  const colors = (d.data?.colors ?? {}) as Record<string, string>;
  const years = kind === 'deal' ? BRAND.deal.years : BRAND.line.years;
  const first = !p.brand;
  p.brand = { brand, color: colors[brand] ?? '#343A40', kind, years, left: years, perYear: kind === 'deal' ? Number(d.data?.deal ?? 0) : lineBase(s), since: s.year + 1, earned: p.brand?.earned ?? 0, shoe: p.brand?.shoe ?? 0 };
  // round 28: his first deal draws his logo, and the page shows it for the first time
  if (first && p.nickname && !p.nickname.logo) {
    p.nickname.logo = true;
    pushMoment(s, {
      kind: 'event',
      title: 'Your logo',
      text: `${brand} draws it up: ${p.nickname.name}, on ${kind === 'deal' ? 'everything they make' : 'your own line'}.`,
      color: p.brand.color,
      logo: p.nickname.id,
    });
  }
  return kind === 'deal' ? `You signed with ${brand}: your logo on everything they make for ${years} seasons.` : `${brand} launches your signature line.`;
}

/** At season's end: the deal pays, and a signature line puts out a shoe for an Icon. */
export function payBrand(s: GameState): number {
  const p = s.player;
  const d = p.brand;
  if (!d || d.left <= 0 || !proStage(s)) return 0;
  const pay = brandPay(s, d);
  d.left -= 1;
  d.earned += pay;
  if (d.kind === 'line' && p.rep >= BRAND.shoeRep) d.shoe += 1;
  p.rep = clamp(p.rep + BRAND.rep, 0, 100);
  p.morale = clamp(p.morale + BRAND.morale, 0, 100);
  return pay;
}
