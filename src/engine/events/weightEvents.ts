// Round 20: events that change his weight. The pounds land through addPounds(); the resolver
// rolls how it went and then moves his ratings to match the new weight (player/weight.ts).

import { chance, clamp, type Rng } from '../rng';
import type { GameState, Stage } from '../types';
import { adjust } from '../career/common';
import { addPounds, idealWeight, weightOf, weightUnits } from '../player/weight';
import { fmtMoney } from '../economy/salary';
import type { EventDef } from './defs';

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const ok = (outcome: string, log?: string) => ({ outcome, log });
const lbs = (s: GameState) => `${weightOf(s.player)} lb`;
const best = (s: GameState) => `${Math.round(idealWeight(s.player.height, s.player.age) / 5) * 5} lb`;

export const WEIGHT_EVENTS: EventDef[] = [
  {
    id: 'bulkUp',
    stages: ALL,
    phase: 'off',
    when: (s) => weightUnits(s.player) < 1.2,
    weight: 1,
    cooldownSeasons: 3,
    title: 'The strength coach has a plan',
    text: (s) => `You weigh ${lbs(s)}. The strength coach wants more of you: bigger bodies win the paint, but every pound has to be carried up and down the floor.`,
    choices: [
      {
        label: 'Put on 15 pounds',
        detail: 'Stronger inside, a step slower.',
        resolve: (s) => {
          addPounds(s.player, 14, 0.5);
          return ok('Six meals a day and heavy squats. Your jersey fits differently now.', 'Bulked up by about 15 lb.');
        },
      },
      {
        label: 'Seven lean pounds',
        resolve: (s) => {
          addPounds(s.player, 7, 0.4);
          return ok('A little more muscle, nothing that slows you down.');
        },
      },
      {
        label: 'Stay as you are',
        resolve: (s) => {
          trust(s, -1);
          return ok('You like how you move. The coach shrugs.');
        },
      },
    ],
  },
  {
    id: 'trimDown',
    stages: ALL,
    phase: 'off',
    when: (s) => weightUnits(s.player) >= 1.2,
    weight: 1.3,
    cooldownSeasons: 2,
    title: 'The scale does not lie',
    text: (s) => `${lbs(s)} at the summer weigh-in. The staff thinks you play best around ${best(s)}.`,
    choices: [
      {
        label: 'Strict diet and two-a-days',
        detail: 'Quicker and fresher, at a cost to your mood. Risky.',
        resolve: (s) => {
          addPounds(s.player, -14, 0.4);
          morale(s, -3);
          return ok('No sugar, no late nights, a lot of running. The weight comes off.', 'Cut about 15 lb.');
        },
      },
      {
        label: 'Lose a few',
        resolve: (s) => {
          addPounds(s.player, -6, 0.3);
          return ok('Smaller plates, more cardio.');
        },
      },
      {
        label: 'The weight is strength',
        resolve: (s) => {
          trust(s, -3);
          return ok('You like being the biggest man on the floor. The staff disagrees, quietly.');
        },
      },
    ],
  },
  {
    id: 'skinnyKid',
    stages: ['HS', 'NCAA'],
    phase: 'off',
    when: (s) => weightUnits(s.player) <= -0.8,
    weight: 1.4,
    cooldownSeasons: 2,
    title: 'Getting pushed around',
    text: (s) => `At ${lbs(s)} the bigger kids move you wherever they want under the rim.`,
    choices: [
      {
        label: 'Eat everything',
        detail: 'Peanut butter, rice, a gallon of milk a day.',
        resolve: (s) => {
          addPounds(s.player, 12, 0.6);
          return ok('Your mom cannot keep the fridge full. It works.', 'Put on about 12 lb.');
        },
      },
      {
        label: 'Stay light and quick',
        resolve: (s) => {
          morale(s, 2);
          return ok('You will grow into it. For now, you beat them down the floor.');
        },
      },
    ],
  },
  {
    id: 'holidayFeast',
    stages: ALL,
    phase: 'mid',
    weight: 0.8,
    cooldownSeasons: 3,
    title: 'Holiday break',
    text: 'Three days off and a table full of food. Your family has been cooking since Tuesday.',
    choices: [
      {
        label: 'Eat like it is the holidays',
        resolve: (s) => {
          addPounds(s.player, 5);
          morale(s, 5);
          return ok('Seconds, thirds, dessert. Worth it.');
        },
      },
      {
        label: 'One plate, then the gym',
        resolve: (s) => {
          morale(s, -1);
          trust(s, 2);
          return ok('The coach hears about it and smiles.');
        },
      },
    ],
  },
  {
    id: 'campHeavy',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.age >= 23 && weightUnits(s.player) >= 0.3,
    weight: 0.9,
    cooldownSeasons: 3,
    title: 'Reported to camp heavy',
    text: (s) => `A long summer. You show up at ${lbs(s)} and the beat writers notice.`,
    choices: [
      {
        label: 'Two-a-days until it is gone',
        detail: 'Hard on the body, good for the coach.',
        resolve: (s) => {
          addPounds(s.player, -10, 0.2);
          trust(s, 3);
          s.player.wear = clamp((s.player.wear ?? 0) + 2, 0, 100);
          return ok('You run the stairs after every practice. By opening night you look like yourself.', 'Lost the camp weight.');
        },
      },
      {
        label: 'Play your way into shape',
        resolve: (s) => {
          addPounds(s.player, 4);
          trust(s, -5);
          s.player.injuryMultNext *= 1.08;
          return ok('The first month is ugly. Your legs are heavy in the fourth quarter.');
        },
      },
    ],
  },
  {
    id: 'plantBased',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.age >= 27,
    weight: 0.7,
    cooldownSeasons: 6,
    oncePerCareer: true,
    title: 'A new diet',
    text: 'A veteran teammate swears that going plant-based added three years to his career.',
    choices: [
      {
        label: 'Try it',
        resolve: (s, rng: Rng) => {
          addPounds(s.player, -9, 0.5);
          if (chance(rng, 0.65)) {
            s.player.declineMultNext *= 0.93;
            return ok('Lighter, and your knees feel ten years younger.', 'Went plant-based.');
          }
          morale(s, -3);
          return ok('You lose weight and some strength with it, and you miss burgers.');
        },
      },
      { label: 'Keep eating what works', resolve: () => ok('You have played this long on chicken and rice.') },
    ],
  },
  {
    id: 'burgerDeal',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.rep >= 35,
    weight: 0.6,
    cooldownSeasons: 5,
    title: 'A burger chain calls',
    text: 'They want your face on the drive-thru menu, and you would have to eat the product in the ads.',
    choices: [
      {
        label: 'Sign the deal',
        resolve: (s) => {
          const pay = Math.round((0.15 + s.player.rep * 0.012) * 1000) / 1000;
          s.player.bank += pay;
          s.player.earnings += pay;
          s.player.rep = clamp(s.player.rep + 2, 0, 100);
          addPounds(s.player, 6);
          return ok(`${fmtMoney(pay)} and your own combo meal. Forty takes of biting the burger, every bite swallowed.`, 'Signed a burger endorsement.');
        },
      },
      { label: 'Pass', resolve: () => ok('Your nutritionist sends a thank-you text.') },
    ],
  },
  {
    id: 'couchWeeks',
    stages: ALL,
    phase: 'mid',
    when: (s) => !!s.player.injury && s.player.injury.daysOut >= 21,
    weight: 1.2,
    cooldownSeasons: 2,
    title: 'Stuck on the couch',
    text: 'Weeks in a walking boot. You cannot run, and the snacks are right there.',
    choices: [
      {
        label: 'Count every calorie',
        resolve: (s) => {
          addPounds(s.player, -2);
          morale(s, -2);
          return ok('Boring meals and upper-body work. You come back the same size you left.');
        },
      },
      {
        label: 'Comfort food',
        resolve: (s) => {
          addPounds(s.player, 8, 0.2);
          morale(s, 4);
          return ok('It helps, honestly. The scale does not agree.');
        },
      },
    ],
  },
];
