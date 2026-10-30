// Choices that change how fast he improves (playtest round 6): the hidden growth rate goes up
// with the habits and help that real players credit for late jumps, and down with comfort.
// The size of every change is rolled each time (see outcome.ts).

import { ATTR_MAX, GROWTH_RATE } from '../balance';
import { chance, clamp } from '../rng';
import type { GameState, Stage } from '../types';
import { adjust } from '../career/common';
import { fmtMoney } from '../economy/salary';
import type { EventDef } from './defs';

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];

const rate = (s: GameState, m: number) => (s.player.growthRate = clamp((s.player.growthRate ?? 1) * m, GROWTH_RATE.min, GROWTH_RATE.max));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const ok = (outcome: string, log?: string) => ({ outcome, log });

export const GROWTH_EVENTS: EventDef[] = [
  {
    id: 'legendCalls',
    stages: ALL,
    phase: 'off',
    weight: 0.6,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'A legend calls',
    text: 'A retired star who grew up near you offers to work with you this summer. He does not do this for many players.',
    choices: [
      {
        label: 'Spend the summer learning from him',
        detail: 'He will change how you train',
        resolve: (s) => {
          rate(s, 1.08);
          morale(s, 3);
          return ok('Every drill has a reason now. You learn faster than ever.', 'Spent a summer learning from a retired star.');
        },
      },
      {
        label: 'Thank him and keep your routine',
        resolve: (s) => {
          morale(s, 1);
          return ok('He wishes you luck. Maybe another time.');
        },
      },
    ],
  },
  {
    id: 'fiveam',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.age <= 28,
    weight: 0.7,
    cooldownSeasons: 4,
    title: 'The 5 a.m. club',
    text: 'A teammate swears his jump came from training before sunrise every day for a year. He asks if you are in.',
    choices: [
      {
        label: 'Commit for a full year',
        detail: 'You will learn faster; your body will feel it',
        resolve: (s) => {
          rate(s, 1.06);
          s.player.injuryMultNext *= 1.08;
          morale(s, -3);
          return ok('Brutal mornings, real results.', "Joined a teammate's 5 a.m. workouts for a year.");
        },
      },
      {
        label: 'Keep normal hours',
        resolve: (s) => {
          morale(s, 3);
          return ok('You sleep in. Rested is good too.');
        },
      },
    ],
  },
  {
    id: 'coachable',
    stages: ['HS', 'NCAA', 'GL', 'EU', 'INT'],
    phase: 'mid',
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Film session',
    text: 'Your coach pulls up your worst possessions in front of the whole team and goes through every mistake.',
    choices: [
      {
        label: 'Ask him for more',
        detail: 'Coachable players get better faster',
        resolve: (s) => {
          rate(s, 1.05);
          trust(s, 6);
          morale(s, -3);
          return ok('You stay after and ask for the full tape. He has never had a player do that.', 'Asked the coach for more film after a harsh session.');
        },
      },
      {
        label: 'Take it personally',
        shownOdds: 0.6,
        detail: 'Risky',
        resolve: (s, rng) => {
          trust(s, -4);
          morale(s, -2);
          if (chance(rng, 0.4)) {
            rate(s, 0.97);
            return ok('You tune him out for weeks. The lessons do not stick.');
          }
          return ok('You sulk for a day and move on.');
        },
      },
    ],
  },
  {
    id: 'skillstrainer',
    stages: ['NCAA', ...PRO],
    phase: 'off',
    when: (s) => s.player.bank >= 0.3,
    weight: 0.6,
    cooldownSeasons: 5,
    title: 'The trainer everyone wants',
    text: (s) => `A skills trainer who has built three All-Stars has one opening. He costs about ${fmtMoney(Math.max(0.1, s.player.bank * 0.04))} a year.`,
    choices: [
      {
        label: 'Hire him for good',
        detail: 'Expensive; he changes how fast you develop',
        resolve: (s) => {
          s.player.bank = Math.max(0, s.player.bank - Math.max(0.1, s.player.bank * 0.04));
          rate(s, 1.1);
          return ok('Week one, he rebuilds your footwork from scratch.', 'Hired an elite skills trainer.');
        },
      },
      {
        label: 'Keep your current routine',
        resolve: () => ok('You save the money.'),
      },
    ],
  },
  {
    id: 'complacent',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.bank >= 4,
    weight: 0.6,
    cooldownSeasons: 5,
    title: 'Comfortable',
    text: 'The money is in the bank and the summer is long. Nobody would blame you for taking it easy.',
    choices: [
      {
        label: 'Stay hungry',
        detail: 'Train like you are still broke',
        resolve: (s) => {
          rate(s, 1.03);
          morale(s, -2);
          return ok('You are in the gym the day after the season ends.');
        },
      },
      {
        label: 'Enjoy it',
        detail: 'You earned it; habits slip',
        resolve: (s) => {
          rate(s, 0.94);
          morale(s, 8);
          return ok('Best summer of your life. The first week of camp hurts.', 'Took a long, easy summer.');
        },
      },
    ],
  },
  {
    id: 'filmstudy',
    stages: ALL,
    phase: 'off',
    weight: 0.6,
    cooldownSeasons: 4,
    title: 'Study the greats',
    text: 'You find a hard drive with every game of the best players ever at your position.',
    choices: [
      {
        label: 'Watch all of it and copy what works',
        detail: 'Slow, but you will learn faster after',
        resolve: (s) => {
          rate(s, 1.04);
          s.player.attrs.IQ = Math.min(ATTR_MAX, s.player.attrs.IQ + 1.5);
          return ok('Three hundred games later, you see the floor differently.', 'Studied the greats at his position.');
        },
      },
      {
        label: 'Trust your own game',
        resolve: (s) => {
          morale(s, 2);
          return ok('Your game, your way.');
        },
      },
    ],
  },
  {
    id: 'longevity',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.age >= 28,
    weight: 0.7,
    cooldownSeasons: 4,
    title: 'Extend your prime',
    text: 'A sports scientist says your habits will decide whether you are done at 32 or still good at 38.',
    choices: [
      {
        label: 'Overhaul diet, sleep and training',
        detail: 'Costs money and comfort; slows the clock',
        resolve: (s) => {
          s.player.bank = Math.max(0, s.player.bank - 0.05);
          rate(s, 1.06);
          s.player.declineMultNext *= 0.88;
          morale(s, -2);
          return ok('No sugar, nine hours of sleep, and your legs feel 25 again.', 'Overhauled his habits to extend his prime.');
        },
      },
      {
        label: 'Do what got you here',
        resolve: (s) => {
          morale(s, 2);
          return ok('Same routine, same results. For now.');
        },
      },
    ],
  },
];
