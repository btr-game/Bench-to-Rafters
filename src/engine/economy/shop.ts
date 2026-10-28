// Offseason shop: a random stock of six items, up to three purchases per summer.

import { ATTR_MAX, ATTRS, WEAR } from '../balance';
import { clamp, shuffle } from '../rng';
import type { Decision, GameState } from '../types';
import { SHOP_ITEMS, type ShopItem } from '../../content/shop';
import { logDecision, pushDecision } from '../career/common';
import { fmtMoney } from './salary';

export const MAX_PURCHASES = 3;

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
  return parts.join(' · ');
}

function stock(s: GameState): string[] {
  const bank = s.player.bank;
  const items = shuffle(s.rng, [...SHOP_ITEMS]);
  const affordable = items.filter((i) => i.price <= bank).sort((a, b) => b.price - a.price);
  // the best things you can afford, plus a couple of things to save up for
  const picks = [...affordable.slice(0, 3), ...shuffle(s.rng, affordable.slice(3)).slice(0, 1)];
  const dream = items.filter((i) => i.price > bank && i.price < Math.max(0.002, bank * 40)).slice(0, 6 - picks.length);
  return [...picks, ...dream].slice(0, 6).map((i) => i.id);
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
  if (it.injuryMult || it.declineMult) p.wear = Math.max(0, (p.wear ?? 0) - WEAR.shopItem);
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
