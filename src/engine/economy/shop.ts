// Offseason shop: six things a summer, priced for his income (round 31), as many as he can pay for.

import { ATTR_MAX, ATTRS, LONGEVITY, SHOP, VISIT, WEAR } from '../balance';
import { chance, clamp, pick, weightedIndex } from '../rng';
import { VISITS } from '../../content/visits';
import type { Decision, GameState } from '../types';
import { SHOP_ITEMS, type ShopItem, type WearSlot } from '../../content/shop';
import { logDecision, pushDecision } from '../career/common';
import { fmtMoney } from './salary';
import { changeWeight, idealWeight, weightOf } from '../player/weight';
import { addTouch } from '../player/touch';
import { levelOf } from '../levels';

/** His income, $M a year: salary and brand deal. */
const incomeOf = (s: GameState): number => (s.contract?.salary ?? 0) + (s.player.brand?.perYear ?? 0);

/** Log-scale step from a to b as x goes from x0 to x1 (clamped at both ends). */
const logLerp = (x: number, x0: number, x1: number, a: number, b: number): number => {
  const t = clamp(Math.log(Math.max(x, x0) / x0) / Math.log(x1 / x0), 0, 1);
  return a + (b - a) * t;
};

/** What the shop charges him: more as he earns more, up to three times the sticker at $50M a year. */
export function priceMult(s: GameState): number {
  return logLerp(incomeOf(s), SHOP.inflate.from, SHOP.inflate.to, 1, SHOP.inflate.max);
}

/** A price as a shop writes it: two significant figures. */
const nice = (x: number): number => {
  const e = 10 ** (Math.floor(Math.log10(x)) - 1);
  return Math.round(x / e) * e;
};
export const priceFor = (s: GameState, it: ShopItem): number => nice(it.price * priceMult(s));

/** The price the six are drawn around: about a third of his bank, much less once he is very rich. */
function target(s: GameState): number {
  const share = SHOP.share * (SHOP.rich.share / SHOP.share) ** ((logLerp(incomeOf(s), SHOP.rich.from, SHOP.rich.to, 0, 1)));
  return Math.max(s.player.bank, 0.00005) * share;
}

const HELPS: Record<string, string> = {
  SHT: 'your shooting',
  FIN: 'finishing at the rim',
  PLY: 'your handle and passing',
  PER: 'perimeter defense',
  INT: 'rim protection',
  REB: 'rebounding',
  ATH: 'your athleticism',
  IQ: 'your feel for the game',
};

/** Plain-language effect of an item; no numbers, the player judges the value. */
function describeItem(it: ShopItem): string {
  const parts: string[] = [];
  const attrs = it.attrs ? ATTRS.filter((k) => it.attrs![k]) : [];
  if (attrs.length) parts.push(`Helps ${attrs.map((k) => HELPS[k]).join(' and ')}`);
  if (it.focus) parts.push('Sharpens your focus skills');
  if (it.range) parts.push('Extends your range');
  if (it.offhand) parts.push('Builds your weak hand');
  if (it.touch) parts.push('Steadies you at the free-throw line');
  if (it.growthMult) parts.push('Speeds up your development');
  if (it.injuryMult) parts.push('Keeps your body healthier');
  if (it.declineMult) parts.push('Slows down aging');
  if (it.morale) parts.push('Lifts your mood');
  if (it.rep) parts.push('Raises your profile');
  if (it.trust) parts.push('Earns goodwill');
  if (it.toIdeal) parts.push('Gets you closer to your best playing weight');
  if (it.weight) parts.push(it.weight > 0 ? 'Puts on weight' : 'Takes weight off');
  return parts.join(' · ');
}

/**
 * Six things, different every summer (round 8), drawn around a price that lets him buy two or three
 * (round 31; things he bought before come up less). One from each shelf (round 25, the owner),
 * unless the other shelves have nothing near his price: then a shelf may show two. Accessories
 * stay cheap and come up on some visits as one of the six.
 */
function stock(s: GameState): string[] {
  const bought = new Set(s.purchases);
  // an accessory is kept in the wardrobe, so it is never sold twice
  const owned = new Set(s.player.wardrobe?.owned ?? []);
  const t = target(s);
  const near = (i: ShopItem) => Math.exp(-((Math.log(priceFor(s, i) / t) / SHOP.spread) ** 2) / 2);
  const weight = (i: ShopItem) => near(i) * (bought.has(i.id) ? 0.5 : 1) * (priceFor(s, i) > s.player.bank ? 0.3 : 1);
  // an accessory costs next to nothing at any price level: one of the six on some visits, so the
  // wardrobe keeps filling; the rest are drawn around his price
  const wear = SHOP_ITEMS.filter((i) => i.wear && !owned.has(i.id));
  const picks: ShopItem[] = wear.length && chance(s.rng, SHOP.wear) ? [pick(s.rng, wear)] : [];
  let pool = SHOP_ITEMS.filter((i) => !i.wear);
  // first one a shelf, among things near his price; then the nearest of the rest, any shelf
  for (const oneShelf of [true, false]) {
    let left = pool.filter((i) => !oneShelf || (near(i) > 0.05 && !picks.some((x) => x.category === i.category)));
    while (picks.length < SHOP.stock && left.length > 0) {
      const it = left[weightedIndex(s.rng, left.map((x) => weight(x) + 1e-9))];
      picks.push(it);
      left = left.filter((x) => x !== it && (!oneShelf || x.category !== it.category));
    }
    pool = pool.filter((x) => !picks.includes(x));
  }
  return picks.sort((a, b) => a.price - b.price).map((i) => i.id);
}

export function pushShop(s: GameState, ids?: string[], prices?: number[], bought = 0): void {
  // round 33: the beginner level's shop: three of the six (a cheap one, a middle one, a dear one)
  // and one purchase (owner: "leave the shop, but 1 purchase and 3 items")
  const lite = levelOf(s) === 'beginner';
  const fresh = ids ?? stock(s);
  const list = (ids ?? (lite ? fresh.filter((_, k) => k % 2 === 0).slice(0, 3) : fresh)).map((id) => SHOP_ITEMS.find((i) => i.id === id)!).filter(Boolean);
  if (list.length === 0) return;
  const cost = list.map((it, k) => prices?.[k] ?? priceFor(s, it));
  const rich = cost.reduce((a, b) => a + b, 0) <= s.player.bank;
  pushDecision(s, {
    kind: 'shop',
    title: 'The shop',
    text: lite ? `Bank: ${fmtMoney(s.player.bank)}. Three things this summer, and you can buy one.` : `Bank: ${fmtMoney(s.player.bank)}. ${rich ? 'Buy whatever you like: money is no object now.' : 'Buy as many as you can pay for. Prices follow what you earn.'}`,
    choices: [
      ...list.map((it, k) => ({
        id: it.id,
        label: `${it.name} · ${fmtMoney(cost[k])}`,
        detail: describeItem(it),
        disabled: cost[k] > s.player.bank,
        tags: [it.category],
        meta: { price: cost[k] },
      })),
      { id: 'leave', label: 'Leave the shop', detail: 'Save the money.' },
    ],
    data: { ids: list.map((i) => i.id), prices: cost, bought },
  });
}

export function applyItem(s: GameState, it: ShopItem, price = it.price): void {
  const p = s.player;
  p.bank -= price;
  if (it.attrs) for (const k of ATTRS) if (it.attrs[k]) p.attrs[k] = clamp(p.attrs[k] + it.attrs[k]!, 15, ATTR_MAX);
  if (it.focus) for (const k of p.focus) p.attrs[k] = clamp(p.attrs[k] + it.focus, 15, ATTR_MAX);
  if (it.range) p.range = clamp(p.range + it.range, 0, 99);
  if (it.offhand) p.offhand = clamp(p.offhand + it.offhand, 0, 99);
  if (it.touch) addTouch(p, it.touch);
  if (it.growthMult) p.growthMultNext *= it.growthMult;
  if (it.injuryMult) p.injuryMultNext *= it.injuryMult;
  if (it.declineMult) p.declineMultNext *= it.declineMult;
  // health spending takes some wear off the body
  if (it.injuryMult || it.declineMult) {
    p.wear = Math.max(0, (p.wear ?? 0) - WEAR.shopItem);
    p.longevity = (p.longevity ?? 0) + LONGEVITY.healthItem;
  }
  if (it.morale) p.morale = clamp(p.morale + it.morale, 0, 100);
  if (it.rep) p.rep = clamp(p.rep + it.rep, 0, 100);
  if (it.trust) p.trust = clamp(p.trust + it.trust, 0, 100);
  if (it.weight) changeWeight(p, it.weight, 0.3);
  if (it.toIdeal) changeWeight(p, (idealWeight(p.height, p.age) - weightOf(p)) * it.toIdeal, 0.25);
  if (!s.purchases.includes(it.id)) s.purchases.push(it.id);
  // an accessory goes into the wardrobe and on, right away
  if (it.wear) {
    const w = (p.wardrobe ??= { owned: [], on: {} });
    if (!w.owned.includes(it.id)) w.owned.push(it.id);
    w.on[it.wear.slot] = it.id;
  }
}

/** Put on an accessory he owns, or take a slot off ('none'), or go back to his own look (null). */
export function wearItem(s: GameState, slot: WearSlot, id: string | null): void {
  const w = (s.player.wardrobe ??= { owned: [], on: {} });
  if (id === null) delete w.on[slot];
  else if (id === 'none' || w.owned.includes(id)) w.on[slot] = id;
}

/** Returns the outcome text. */
export function resolveShop(s: GameState, d: Decision, id: string): string | null {
  if (id === 'leave') return null;
  const it = SHOP_ITEMS.find((i) => i.id === id);
  const ids = (d.data?.ids as string[]) ?? [];
  // the price on the tag when the shop opened (a save from before round 31 has none: today's price)
  const prices = (d.data?.prices as number[] | undefined) ?? ids.map((x) => priceFor(s, SHOP_ITEMS.find((i) => i.id === x)!));
  const price = prices[ids.indexOf(id)] ?? (it ? priceFor(s, it) : 0);
  if (!it || price > s.player.bank) return null;
  applyItem(s, it, price);
  logDecision(s, 'shop', `Bought: ${it.name} (${fmtMoney(price)}).`);
  // no limit (round 31): the shop stays open while something is left in it; the most bought in
  // one visit is kept (Shopping Spree, Cleaned Out)
  const bought = ((d.data?.bought as number) ?? 0) + 1;
  s.flags.spree = Math.max(s.flags.spree ?? 0, bought);
  const rest = ids.map((x, k) => [x, prices[k]] as const).filter(([x]) => x !== id);
  // round 33: one purchase in the beginner level's shop
  if (rest.length > 0 && levelOf(s) !== 'beginner') {
    pushShop(s, rest.map(([x]) => x), rest.map(([, v]) => v), bought);
    // keep the shop at the front of the queue
    s.pending.unshift(s.pending.pop()!);
  }
  return `${it.name}: ${describeItem(it)}.`;
}

/** A visit to something he owns (round 25). Round 28 (owner: "let the user revisit", and "same
 * [a small advantage] for visiting lifestyle"): he can go back any time; the first visit of a
 * season lifts his mood, rests his legs a little, and raises his profile for the public ones. */
export function visitItem(s: GameState, id: string): string | null {
  const v = VISITS[id];
  const p = s.player;
  if (!v || !s.purchases.includes(id)) return null;
  const seen = (p.visits ??= {});
  const line = pick(s.rng, v.lines);
  if (seen[id] === s.year) return line;
  seen[id] = s.year;
  p.morale = clamp(p.morale + VISIT.morale, 0, 100);
  p.wear = Math.max(0, (p.wear ?? 0) - VISIT.rest);
  if (v.rep) p.rep = clamp(p.rep + v.rep, 0, 100);
  return `${line} (A small edge: in better spirits, fresher legs${v.rep ? ', a bigger name' : ''}.)`;
}
