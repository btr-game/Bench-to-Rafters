// Offseason shop: a random stock of about six items, up to three purchases per summer.

import { ATTR_MAX, ATTRS, LONGEVITY, WEAR } from '../balance';
import { clamp, shuffle, weightedIndex } from '../rng';
import type { Decision, GameState } from '../types';
import { SHOP_ITEMS, type ShopItem } from '../../content/shop';
import { logDecision, pushDecision } from '../career/common';
import { fmtMoney } from './salary';
import { changeWeight, idealWeight, weightOf } from '../player/weight';

export const MAX_PURCHASES = 3;
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
export function describeItem(it: ShopItem): string {
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
 * with things worth his money weighted up (a rich player rarely sees the $40 sleeve), and one
 * to save up for.
 */
function stock(s: GameState): string[] {
  const bank = s.player.bank;
  const bought = new Set(s.purchases);
  const affordable = SHOP_ITEMS.filter((i) => i.price <= bank);
  const weight = (i: ShopItem) => (i.price >= bank * 0.002 ? 1 : 0.2) * (bought.has(i.id) ? 0.5 : 1);
  const picks: ShopItem[] = [];
  const pool = [...affordable];
  while (picks.length < STOCK.afford && pool.length > 0) {
    const i = weightedIndex(s.rng, pool.map(weight));
    picks.push(pool.splice(i, 1)[0]);
  }
  const dream = shuffle(s.rng, SHOP_ITEMS.filter((i) => i.price > bank && i.price < Math.max(0.002, bank * 40)));
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
