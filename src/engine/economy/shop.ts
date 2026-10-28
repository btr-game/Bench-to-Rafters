// Offseason shop: a random stock of five items, up to two purchases per summer.

import { ATTRS } from '../balance';
import { clamp, shuffle } from '../rng';
import type { Decision, GameState } from '../types';
import { SHOP_ITEMS, type ShopItem } from '../../content/shop';
import { logDecision, pushDecision } from '../career/common';
import { fmtMoney } from './salary';
import { NAMES } from '../../content/strings';

export const MAX_PURCHASES = 2;

export function describeItem(it: ShopItem): string {
  const parts: string[] = [];
  if (it.attrs) for (const k of ATTRS) if (it.attrs[k]) parts.push(`${NAMES.attr[k]} +${it.attrs[k]}`);
  if (it.focus) parts.push(`Focus stats +${it.focus}`);
  if (it.range) parts.push(`Range +${it.range}`);
  if (it.offhand) parts.push(`Off-hand +${it.offhand}`);
  if (it.growthMult) parts.push(`Growth ×${it.growthMult} next season`);
  if (it.injuryMult) parts.push(`Injury risk ×${it.injuryMult} next season`);
  if (it.declineMult) parts.push(`Aging ×${it.declineMult} next season`);
  if (it.morale) parts.push(`Morale +${it.morale}`);
  if (it.rep) parts.push(`Reputation +${it.rep}`);
  if (it.trust) parts.push(`Coach trust +${it.trust}`);
  return parts.join(' · ');
}

function stock(s: GameState): string[] {
  const bank = s.player.bank;
  const items = shuffle(s.rng, [...SHOP_ITEMS]);
  const affordable = items.filter((i) => i.price <= bank).sort((a, b) => b.price - a.price);
  // the best things you can afford, plus a couple of things to save up for
  const picks = [...affordable.slice(0, 2), ...shuffle(s.rng, affordable.slice(2)).slice(0, 1)];
  const dream = items.filter((i) => i.price > bank && i.price < Math.max(0.002, bank * 40)).slice(0, 5 - picks.length);
  return [...picks, ...dream].slice(0, 5).map((i) => i.id);
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
  if (it.attrs) for (const k of ATTRS) if (it.attrs[k]) p.attrs[k] = clamp(p.attrs[k] + it.attrs[k]!, 15, 99);
  if (it.focus) for (const k of p.focus) p.attrs[k] = clamp(p.attrs[k] + it.focus, 15, 99);
  if (it.range) p.range = clamp(p.range + it.range, 0, 99);
  if (it.offhand) p.offhand = clamp(p.offhand + it.offhand, 0, 99);
  if (it.growthMult) p.growthMultNext *= it.growthMult;
  if (it.injuryMult) p.injuryMultNext *= it.injuryMult;
  if (it.declineMult) p.declineMultNext *= it.declineMult;
  if (it.morale) p.morale = clamp(p.morale + it.morale, 0, 100);
  if (it.rep) p.rep = clamp(p.rep + it.rep, 0, 100);
  if (it.trust) p.trust = clamp(p.trust + it.trust, 0, 100);
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
