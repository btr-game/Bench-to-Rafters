// Personal staff (round 25). A staff member is hired in an event (the hire events in
// events/round25.ts, and the old events that offered a nutritionist or a sports psychologist),
// is paid every season out of the bank, and gives a very small benefit; he can be talked to once
// a season, given a raise (a bigger benefit for more pay, up to level 3), or let go. If the bank
// cannot pay him, he leaves.

import { ATTR_MAX, STAFF_PAY } from '../balance';
import { STAFF, type StaffRole } from '../../content/staff';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { clamp, pick } from '../rng';
import { adjust, logDecision } from './common';
import { changeWeight, idealWeight, weightOf } from '../player/weight';
import type { AttrKey, GameState, StaffMember } from '../types';

/** What he costs a season at his level ($M). */
export const staffPay = (m: Pick<StaffMember, 'role' | 'level'>): number => STAFF[m.role].salary * STAFF_PAY.pay[m.level - 1];

const hasStaff = (s: GameState, role: StaffRole): boolean => !!s.player.staff?.some((m) => m.role === role);

/** Can he take on one more? (a pro league, room on the staff, and a bank that can pay a few seasons) */
export const canHire = (s: GameState, role: StaffRole): boolean =>
  ['GL', 'EU', 'INT', 'NBA'].includes(s.stage) && !hasStaff(s, role) && (s.player.staff?.length ?? 0) < STAFF_PAY.max && s.player.bank >= STAFF[role].salary * STAFF_PAY.afford;

export function hireStaff(s: GameState, role: StaffRole): StaffMember | null {
  if (hasStaff(s, role) || (s.player.staff?.length ?? 0) >= STAFF_PAY.max) return null;
  const m: StaffMember = { id: s.nextId++, role, name: `${pick(s.rng, FIRST_NAMES)} ${pick(s.rng, LAST_NAMES)}`, level: 1, since: s.year, paid: 0 };
  (s.player.staff ??= []).push(m);
  logDecision(s, 'staff', `Hired ${m.name} as ${STAFF[role].title.toLowerCase()}.`);
  return m;
}

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));

/** At season's end: everyone is paid, and does his small part. */
export function payStaff(s: GameState): string[] {
  const p = s.player;
  const notes: string[] = [];
  for (const m of [...(p.staff ?? [])]) {
    const pay = staffPay(m);
    if (p.bank < pay) {
      p.staff = p.staff!.filter((x) => x.id !== m.id);
      notes.push(`${m.name} (${STAFF[m.role].title.toLowerCase()}) left: the bank could not pay him.`);
      continue;
    }
    p.bank -= pay;
    m.paid += pay;
    const k = STAFF_PAY.effect[m.level - 1];
    switch (m.role) {
      case 'chef':
        p.morale = adjust(p.morale, 1 * k);
        changeWeight(p, (idealWeight(p.height, p.age) - weightOf(p)) * 0.08 * k, 0.25);
        break;
      case 'nutritionist':
        changeWeight(p, (idealWeight(p.height, p.age) - weightOf(p)) * 0.15 * k, 0.25);
        p.declineMultNext *= 1 - 0.01 * k;
        break;
      case 'trainer':
        bump(s, 'ATH', 0.3 * k);
        break;
      case 'physio':
        p.injuryMultNext *= 1 - 0.03 * k;
        p.wear = Math.max(0, (p.wear ?? 0) - 1 * k);
        break;
      case 'shooting':
        bump(s, 'SHT', 0.3 * k);
        p.range = clamp(p.range + 0.4 * k, 0, 99);
        break;
      case 'skills':
        bump(s, 'PLY', 0.3 * k);
        p.offhand = clamp(p.offhand + 0.5 * k, 0, 99);
        break;
      case 'psychologist':
        p.morale = adjust(p.morale, 2 * k);
        break;
      case 'analyst':
        bump(s, 'IQ', 0.3 * k);
        break;
      case 'sleep':
        p.declineMultNext *= 1 - 0.015 * k;
        p.injuryMultNext *= 1 - 0.01 * k;
        break;
    }
  }
  return notes;
}

/** A word with him, once a season: what he says, and a small lift. */
export function talkStaff(s: GameState, id: number): string | null {
  const m = s.player.staff?.find((x) => x.id === id);
  if (!m || m.talked === s.year) return null;
  m.talked = s.year;
  s.player.morale = adjust(s.player.morale, STAFF_PAY.talk);
  return pick(s.rng, STAFF[m.role].talk);
}

/** A raise: one level up, more pay, more help. */
export function raiseStaff(s: GameState, id: number): boolean {
  const m = s.player.staff?.find((x) => x.id === id);
  if (!m || m.level >= STAFF_PAY.pay.length) return false;
  m.level += 1;
  s.player.morale = adjust(s.player.morale, 1);
  logDecision(s, 'staff', `Gave ${m.name} a raise.`);
  return true;
}

export function letGo(s: GameState, id: number): void {
  const m = s.player.staff?.find((x) => x.id === id);
  if (!m) return;
  s.player.staff = s.player.staff!.filter((x) => x.id !== id);
  logDecision(s, 'staff', `Let ${m.name} go.`);
}
