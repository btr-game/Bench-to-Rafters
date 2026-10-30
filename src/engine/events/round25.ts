// Round 25 turning points (the owner: "these are basically more detailed events"). Staff to hire
// (a yes puts them on the Player tab's staff, career/staff.ts), family and friends asking for
// money, investments that can go either way, and legacy projects for the bank of a big career.

import { LEGACY_PROJECT } from '../balance';
import { chance, clamp, range, type Rng } from '../rng';
import type { GameState, Stage } from '../types';
import { adjust } from '../career/common';
import { canHire, hireStaff, staffPay } from '../career/staff';
import { fmtMoney } from '../economy/salary';
import { STAFF, STAFF_ROLES, type StaffRole } from '../../content/staff';
import type { EventDef } from './defs';

const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const spend = (s: GameState, m: number) => (s.player.bank = Math.max(0, s.player.bank - m));
const earn = (s: GameState, m: number) => {
  s.player.bank += m;
  s.player.earnings += m;
};
const ok = (outcome: string, log?: string) => ({ outcome, log });
/** A share of the bank, with a floor so small banks still see real numbers. */
const share = (s: GameState, f: number, floor: number) => Math.max(floor, s.player.bank * f);

// ---------- staff ----------

const hire = (role: StaffRole): EventDef => ({
  id: `hire-${role}`,
  stages: PRO,
  phase: 'off',
  when: (s) => canHire(s, role),
  weight: 0.55,
  cooldownSeasons: 4,
  title: `A ${STAFF[role].title.toLowerCase()}`,
  text: (s) => `${STAFF[role].pitch} ${fmtMoney(staffPay({ role, level: 1 }))} a season. ${STAFF[role].does}${(s.player.staff?.length ?? 0) > 0 ? ' He would join your staff.' : ''}`,
  choices: [
    {
      label: `Hire him · ${fmtMoney(staffPay({ role, level: 1 }))} a season`,
      detail: 'Paid every season; you can talk to him, give a raise or let him go on the Player tab',
      resolve: (s) => {
        const m = hireStaff(s, role);
        return ok(m ? `${m.name} starts on Monday. Your staff is on the Player tab.` : 'You already have one.');
      },
    },
    { label: 'Not now', resolve: () => ok('Maybe another year.') },
  ],
});

// ---------- family and friends ----------

const FAMILY: EventDef[] = [
  {
    id: 'tuition',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.bank >= 0.08,
    weight: 0.7,
    cooldownSeasons: 3,
    title: 'Your sister’s tuition',
    text: (s) => `Your sister got into the school she wanted. The letter came with a bill: ${fmtMoney(share(s, 0.03, 0.06))}.`,
    choices: [
      { label: 'Pay it all', resolve: (s) => (spend(s, share(s, 0.03, 0.06)), morale(s, 6), ok('She sends a photo from her first day. You frame it.', 'Paid your sister’s tuition.')) },
      { label: 'Pay half, she takes a loan', resolve: (s) => (spend(s, share(s, 0.015, 0.03)), morale(s, 2), ok('She says thank you. She means it, mostly.')) },
      { label: 'She can find a scholarship', resolve: (s) => (morale(s, -5), ok('She does, eventually. Thanksgiving is quiet this year.')) },
    ],
  },
  {
    id: 'cousin-business',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.bank >= 0.1,
    weight: 0.7,
    cooldownSeasons: 3,
    title: 'Your cousin’s business',
    text: (s) => `Your cousin wants to open a car wash. He needs ${fmtMoney(share(s, 0.05, 0.08))} and promises you half.`,
    choices: [
      {
        label: 'Back him',
        shownOdds: 0.45,
        resolve: (s, rng) => {
          const stake = share(s, 0.05, 0.08);
          spend(s, stake);
          if (chance(rng, 0.45)) {
            earn(s, stake * range(rng, 1.3, 2.2));
            morale(s, 5);
            return ok('Lines around the block every Saturday. Your half comes in every month.', 'Backed your cousin’s car wash. It works.');
          }
          morale(s, -3);
          return ok('It closes after a year. He apologises at every family dinner.', 'Lost the money on your cousin’s car wash.');
        },
      },
      { label: 'Say no', resolve: (s) => (morale(s, -3), ok('He understands. He tells everyone he understands.')) },
    ],
  },
  {
    id: 'parents-retire',
    stages: ['NBA', 'EU'],
    phase: 'off',
    when: (s) => s.player.bank >= 1,
    weight: 0.5,
    cooldownSeasons: 99,
    title: 'Your parents could retire',
    text: (s) => `Your father has worked the same job for thirty years. ${fmtMoney(share(s, 0.08, 0.8))} would let him and your mother stop.`,
    choices: [
      { label: 'Retire them', resolve: (s) => (spend(s, share(s, 0.08, 0.8)), morale(s, 10), rep(s, 1), ok('Your father cries at the kitchen table. Then he plays golf every day.', 'Retired your parents.')) },
      { label: 'Not yet', resolve: (s) => (morale(s, -2), ok('They say they like working. You are not sure.')) },
    ],
  },
  {
    id: 'friend-loan',
    stages: PRO,
    phase: 'mid',
    when: (s) => s.player.bank >= 0.05,
    weight: 0.6,
    cooldownSeasons: 3,
    title: 'A loan for an old friend',
    text: (s) => `Your best friend from high school is behind on rent. He asks for ${fmtMoney(share(s, 0.01, 0.01))}, "just until the summer".`,
    choices: [
      {
        label: 'Lend it',
        resolve: (s, rng) => {
          spend(s, share(s, 0.01, 0.01));
          if (chance(rng, 0.5)) {
            earn(s, share(s, 0.01, 0.01));
            morale(s, 3);
            return ok('He pays you back in July, to the dollar, with a thank-you card.');
          }
          morale(s, 1);
          return ok('You never see the money again. You still see him.');
        },
      },
      { label: 'Say no', resolve: (s) => (morale(s, -3), ok('He does not call for a while.')) },
    ],
  },
];

// ---------- investments ----------

const invest = (id: string, title: string, text: string, odds: number, win: [number, number], f: number, floor: number, good: string, bad: string): EventDef => ({
  id,
  stages: PRO,
  phase: 'off',
  when: (s) => s.player.bank >= floor * 2,
  weight: 0.7,
  cooldownSeasons: 3,
  title,
  text: (s) => text.replace('$', fmtMoney(share(s, f, floor))),
  choices: [
    {
      label: 'Invest',
      shownOdds: odds,
      resolve: (s, rng: Rng) => {
        const stake = share(s, f, floor);
        spend(s, stake);
        if (chance(rng, odds)) {
          earn(s, stake * range(rng, win[0], win[1]));
          return ok(good, `${title}: it paid off.`);
        }
        morale(s, -3);
        return ok(bad, `${title}: the money is gone.`);
      },
    },
    { label: 'Pass', resolve: () => ok('You keep the money where it is.') },
  ],
});

const INVEST: EventDef[] = [
  invest('real-estate', 'An apartment building', 'Your financial adviser has found an apartment building downtown: $ for a share.', 0.6, [1.2, 1.8], 0.1, 0.3, 'Every unit rented. The checks come every month.', 'The roof, the pipes, then the roof again. You sell at a loss.'),
  invest('restaurant-chain', 'A restaurant chain', 'A chef wants to open five restaurants with your name on the menu: $.', 0.4, [1.5, 3], 0.08, 0.2, 'A line out the door at all five. A sixth opens next spring.', 'Three close in the first year. The other two follow.'),
  invest('sneaker-startup', 'A sneaker startup', 'Two designers want $ to launch a sneaker brand. Their samples are the best you have ever worn.', 0.3, [2, 5], 0.06, 0.15, 'The first drop sells out in nine minutes. You own a sneaker company now.', 'The factory falls through. You keep a pair of the samples.'),
];

// ---------- legacy projects (for a big career's bank) ----------

const legacy = (id: string, title: string, text: string, f: number, floor: number, outcome: string, rp: number): EventDef => ({
  id,
  stages: ['NBA', 'EU'],
  phase: 'off',
  when: (s) => s.player.bank >= floor * 1.5 && s.player.rep >= 45,
  weight: 0.55,
  cooldownSeasons: 99,
  title,
  text: (s) => text.replace('$', fmtMoney(share(s, f, floor))),
  choices: [
    {
      label: 'Fund it',
      resolve: (s) => {
        spend(s, share(s, f, floor));
        rep(s, rp);
        morale(s, 4);
        trust(s, 2);
        s.player.legacyBonus = (s.player.legacyBonus ?? 0) + LEGACY_PROJECT.points;
        return ok(outcome, `${title}: funded.`);
      },
    },
    { label: 'Not now', resolve: () => ok('Maybe when the career is over.') },
  ],
});

const LEGACY_EVENTS: EventDef[] = [
  legacy('college-facility', 'A practice facility for your old school', 'Your old school still practises in a gym with dead spots. $ would build them a new one, with your name over the door.', 0.12, 2, 'The ribbon is cut on a Tuesday. The team practises there that night.', 4),
  legacy('national-team', 'Fund the national team', 'The national federation is broke. $ would pay for four years of travel, coaches and youth camps.', 0.1, 1.5, 'The youth team qualifies for the world championship. They wear your number on their warmups.', 5),
  legacy('hall-wing', 'A wing at the Hall of Fame', 'The Hall of Fame is building a new wing for the stories of the game. $ puts your name on it.', 0.15, 5, 'A wing full of other people’s stories, with your name over the door. The voters notice.', 6),
];

export const ROUND25_EVENTS: EventDef[] = [...STAFF_ROLES.map(hire), ...FAMILY, ...INVEST, ...LEGACY_EVENTS];

