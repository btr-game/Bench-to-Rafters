// Offseason shop: a random stock of about six items, up to three purchases per summer.

import { ATTR_MAX, ATTRS, LONGEVITY, VISIT, WEAR } from '../balance';
import { clamp, pick, shuffle, weightedIndex } from '../rng';
import { VISITS } from '../../content/visits';
import type { Decision, GameState } from '../types';
import { SHOP_ITEMS, type ShopItem, type WearSlot } from '../../content/shop';
import { logDecision, pushDecision } from '../career/common';
import { fmtMoney } from './salary';
import { changeWeight, idealWeight, weightOf } from '../player/weight';

const MAX_PURCHASES = 3;
const STOCK = { size: 6, afford: 5 };

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
 * About six things, different every summer (round 8): five he can afford, drawn at random
 * with things worth his money weighted up (a rich player rarely sees the $40 sleeve; round 25: a
 * thing costing 1% of his bank or more comes up most), and one to save up for; one from each
 * shelf at most (round 25).
 */
function stock(s: GameState): string[] {
  const bank = s.player.bank;
  const bought = new Set(s.purchases);
  // an accessory is kept in the wardrobe, so it is never sold twice
  const owned = new Set(s.player.wardrobe?.owned ?? []);
  const forSale = SHOP_ITEMS.filter((i) => !(i.wear && owned.has(i.id)));
  const weight = (i: ShopItem) => (i.price >= bank * 0.01 ? 1.5 : i.price >= bank * 0.002 ? 1 : 0.2) * (bought.has(i.id) ? 0.5 : 1);
  // round 25 (the owner): never two things from the same shelf in one visit
  const picks: ShopItem[] = [];
  let pool = forSale.filter((i) => i.price <= bank);
  while (picks.length < STOCK.afford && pool.length > 0) {
    const it = pool[weightedIndex(s.rng, pool.map(weight))];
    picks.push(it);
    pool = pool.filter((x) => x.category !== it.category);
  }
  const shelves = new Set(picks.map((i) => i.category));
  const dream = shuffle(s.rng, forSale.filter((i) => i.price > bank && i.price < Math.max(0.002, bank * 40) && !shelves.has(i.category)));
  return [...picks, ...dream].slice(0, STOCK.size).sort((a, b) => a.price - b.price).map((i) => i.id);
}

export function pushShop(s: GameState, ids?: string[], bought = 0): void {
  const list = (ids ?? stock(s)).map((id) => SHOP_ITEMS.find((i) => i.id === id)!).filter(Boolean);
  if (list.length === 0) return;
  pushDecision(s, {
    kind: 'shop',
    title: 'The shop',
    text: `Bank: ${fmtMoney(s.player.bank)}. Buy up to ${MAX_PURCHASES - bought} more thing${MAX_PURCHASES - bought === 1 ? '' : 's'} this summer.`,
    choices: [
      ...list.map((it) => ({
        id: it.id,
        label: `${it.name} · ${fmtMoney(it.price)}`,
        detail: describeItem(it),
        disabled: it.price > s.player.bank,
        tags: [it.category],
        meta: { price: it.price },
      })),
      { id: 'leave', label: 'Leave the shop', detail: 'Save the money.' },
    ],
    data: { ids: list.map((i) => i.id), bought },
  });
}

export function applyItem(s: GameState, it: ShopItem): void {
  const p = s.player;
  p.bank -= it.price;
  if (it.attrs) for (const k of ATTRS) if (it.attrs[k]) p.attrs[k] = clamp(p.attrs[k] + it.attrs[k]!, 15, ATTR_MAX);
  if (it.focus) for (const k of p.focus) p.attrs[k] = clamp(p.attrs[k] + it.focus, 15, ATTR_MAX);
  if (it.range) p.range = clamp(p.range + it.range, 0, 99);
  if (it.offhand) p.offhand = clamp(p.offhand + it.offhand, 0, 99);
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
  if (!it || it.price > s.player.bank) return null;
  applyItem(s, it);
  logDecision(s, 'shop', `Bought: ${it.name} (${fmtMoney(it.price)}).`);
  const bought = ((d.data?.bought as number) ?? 0) + 1;
  const rest = ((d.data?.ids as string[]) ?? []).filter((x) => x !== id);
  if (bought < MAX_PURCHASES && rest.length > 0) {
    pushShop(s, rest, bought);
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
