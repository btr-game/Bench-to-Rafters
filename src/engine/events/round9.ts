// Round 9 turning points: more of everyday life at every level, and some that pull the rest
// of the league in (the rival, the superteam, the underdog: world/stories.ts).

import { ATTR_MAX, GROWTH_RATE } from '../balance';
import { chance, clamp, pick, range, type Rng } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust } from '../career/common';
import { pathOf } from '../career/origin';
import type { EventDef } from './defs';
import { canHire, hireStaff } from '../career/staff';

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];
const YOUNG: Stage[] = ['HS', 'NCAA'];

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const ok = (outcome: string, log?: string) => ({ outcome, log });
const story = (s: GameState, kind: string) => s.stories?.find((x) => x.kind === kind);
const teamName = (s: GameState, id: string) => (s.stage === 'NBA' ? s.nba : s.league)?.teams.find((t) => t.id === id)?.name ?? 'them';

export const ROUND9_EVENTS: EventDef[] = [
  {
    id: 'rivalTalk',
    stages: ALL,
    phase: 'mid',
    when: (s) => !!story(s, 'rival'),
    weight: 1.1,
    cooldownSeasons: 2,
    title: 'Circle the date',
    text: (s) => `The ${teamName(s, story(s, 'rival')!.teamId)} are next on the schedule. A reporter asks if this one means more.`,
    choices: [
      {
        label: 'Say it out loud',
        detail: 'Fire everyone up. Risky if you lose.',
        resolve: (s, rng: Rng) => {
          const won = chance(rng, 0.5 + (s.player.morale - 60) / 200);
          rep(s, won ? 4 : -2);
          morale(s, won ? 6 : -5);
          return ok(won ? 'You said it, then you backed it up. The clip of your celebration is everywhere.' : 'They heard it, and they made you pay. That one will sting for a while.', `Called out the rival before a big game, and ${won ? 'won' : 'lost'}.`);
        },
      },
      {
        label: 'Just another game',
        resolve: (s) => {
          trust(s, 2);
          return ok('Coach-speak. Your coach loves it; the fans wanted more.');
        },
      },
    ],
  },
  {
    id: 'superteamCall',
    stages: ['NBA'],
    phase: 'off',
    when: (s) => !!story(s, 'superteam') && !!s.contract && s.contract.years <= 1 && s.player.age >= 24,
    weight: 1,
    cooldownSeasons: 3,
    title: 'The superteam calls',
    text: (s) => `The ${teamName(s, story(s, 'superteam')!.teamId)}'s stars text you: one more piece and nobody can stop them. You would come off the bench behind them.`,
    choices: [
      {
        label: 'Tell them you are listening',
        detail: 'Chase a ring. Your role and your numbers would shrink.',
        resolve: (s) => {
          s.flags.superteamPitch = s.year;
          rep(s, -2);
          morale(s, 3);
          return ok('Word gets out that you are open to it. Your own fans are not thrilled.', 'Told a superteam he was listening.');
        },
      },
      {
        label: 'Beat them instead',
        resolve: (s) => {
          rep(s, 3);
          morale(s, 4);
          s.player.growthMultNext *= 1.04;
          return ok('You screenshot the texts and set them as your lock screen. Motivation.', 'Turned down a superteam to beat it.');
        },
      },
    ],
  },
  {
    id: 'underdogSpirit',
    stages: ALL,
    phase: 'mid',
    when: (s) => !!story(s, 'underdog') && story(s, 'underdog')!.teamId !== s.teamId,
    weight: 0.8,
    cooldownSeasons: 3,
    title: 'Nobody believed in them',
    text: (s) => `The ${teamName(s, story(s, 'underdog')!.teamId)} just beat you by 20. Their young players celebrate like they won a title.`,
    choices: [
      {
        label: 'Watch the film twice',
        resolve: (s) => {
          bump(s, 'IQ', range(s.rng, 0.8, 1.6));
          trust(s, 2);
          return ok('They moved the ball better than you did. You take notes.', 'Learned from a loss to an underdog.');
        },
      },
      {
        label: 'Shake it off',
        resolve: (s) => {
          morale(s, 2);
          return ok('One bad night. You move on.');
        },
      },
    ],
  },
  {
    id: 'summerLeague',
    stages: ['NBA'],
    phase: 'off',
    when: (s) => s.serviceYears <= 1 && s.player.age <= 23,
    weight: 1,
    cooldownSeasons: 2,
    title: 'Summer League',
    text: 'The front office wants you in Las Vegas for Summer League. Most second-year guys skip it.',
    choices: [
      {
        label: 'Go and dominate',
        detail: 'Reps and confidence, a little more wear',
        resolve: (s) => {
          bump(s, pick(s.rng, ['FIN', 'PLY', 'SHT'] as AttrKey[]), range(s.rng, 1, 2));
          trust(s, 4);
          s.player.wear = Math.min(100, (s.player.wear ?? 0) + 2);
          return ok('You average 24 in Vegas and the coaches give you a longer leash.', 'Starred at Summer League.');
        },
      },
      {
        label: 'Train privately',
        resolve: (s) => {
          s.player.growthMultNext *= 1.03;
          return ok('A quiet summer with your own trainer.');
        },
      },
    ],
  },
  {
    id: 'proAm',
    stages: PRO,
    phase: 'off',
    weight: 0.8,
    cooldownSeasons: 3,
    title: 'Pro-am in the summer heat',
    text: 'The local pro-am league wants you. The gym has no air conditioning and the crowd is right on the baseline.',
    choices: [
      {
        label: 'Put on a show',
        resolve: (s) => {
          rep(s, 4);
          bump(s, 'FIN', range(s.rng, 0.5, 1.5));
          morale(s, 4);
          return ok('You drop 51 in a summer game and the video does numbers.', 'Lit up a summer pro-am.');
        },
      },
      { label: 'Skip it', resolve: () => ok('You rest instead.') },
    ],
  },
  {
    id: 'mentorRookie',
    stages: ['NBA', 'EU'],
    phase: 'both',
    when: (s) => s.player.age >= 28,
    weight: 1,
    cooldownSeasons: 4,
    title: 'The rookie needs someone',
    text: 'The team’s first-round pick is lost: late nights, bad habits, no idea how to prepare. The coach asks you to take him under your wing.',
    choices: [
      {
        label: 'Take him on',
        resolve: (s) => {
          trust(s, 6);
          bump(s, 'IQ', range(s.rng, 0.5, 1.2));
          s.player.declineMultNext *= 0.97;
          return ok('Teaching him how to prepare makes you sharper too. He calls you "OG" now.', 'Mentored a rookie.');
        },
      },
      {
        label: 'Not my job',
        resolve: (s) => {
          trust(s, -3);
          return ok('The coach does not ask again.');
        },
      },
    ],
  },
  {
    id: 'contractYear',
    stages: PRO,
    phase: 'off',
    when: (s) => !!s.contract && s.contract.years === 2 && s.player.age <= 30,
    weight: 1,
    cooldownSeasons: 4,
    title: 'Bet on yourself',
    text: 'Your agent says the team will offer an extension now: decent money, a few more years. Or you could play out the deal and hit free agency.',
    choices: [
      {
        label: 'Bet on yourself',
        detail: 'Extra motivation. Risky if you get hurt.',
        resolve: (s) => {
          s.player.growthMultNext *= 1.06;
          s.player.injuryMultNext *= 1.05;
          morale(s, 3);
          return ok('No extension. Every game is an audition now.', 'Turned down an extension to bet on himself.');
        },
      },
      {
        label: 'Take the security',
        resolve: (s) => {
          s.player.bank += Math.max(0.05, (s.contract?.salary ?? 0.5) * 0.2);
          morale(s, 2);
          return ok('A signing bonus and peace of mind.', 'Signed for security (signing bonus).');
        },
      },
    ],
  },
  {
    id: 'classGrades',
    stages: YOUNG,
    phase: 'mid',
    weight: 0.9,
    cooldownSeasons: 2,
    title: 'Grades are slipping',
    text: 'Your academic advisor shows you the numbers: one more bad test and you are ineligible for a few games.',
    choices: [
      {
        label: 'Tutoring every night',
        resolve: (s) => {
          morale(s, -2);
          bump(s, 'IQ', range(s.rng, 0.3, 0.9));
          return ok('Flash cards on the bus. You pass.', 'Kept his grades up with tutoring.');
        },
      },
      {
        label: 'Wing it',
        detail: 'Risky',
        resolve: (s, rng: Rng) => {
          if (chance(rng, 0.45)) {
            s.flags.suspendGames = (s.flags.suspendGames ?? 0) + 3;
            trust(s, -4);
            return ok('You fail the test and sit for three games.', 'Ruled academically ineligible for three games.');
          }
          return ok('You squeak by with a C-minus.');
        },
      },
    ],
  },
  {
    id: 'localPaper',
    stages: ['HS'],
    phase: 'mid',
    weight: 0.9,
    cooldownSeasons: 2,
    title: 'Front page',
    text: (s) => `The ${pathOf(s) === 'us' ? 'local paper' : 'club magazine'} wants a feature on you: photos, interviews, the whole thing.`,
    choices: [
      {
        label: 'Do the interview',
        resolve: (s) => {
          rep(s, 4);
          morale(s, 2);
          if (chance(s.rng, 0.3)) {
            morale(s, -4);
            return ok('Great photos. Then everyone at school starts calling you "the next big thing", and the pressure gets to you.', 'Featured in the local press.');
          }
          return ok('Your grandmother buys ten copies.', 'Featured in the local press.');
        },
      },
      {
        label: 'Stay humble',
        resolve: (s) => {
          trust(s, 3);
          return ok('Your coach respects it.');
        },
      },
    ],
  },
  {
    id: 'starHurt',
    stages: ALL,
    phase: 'mid',
    weight: 0.9,
    cooldownSeasons: 3,
    title: 'Your star teammate goes down',
    text: 'The best player on the team rolls an ankle and will miss a month. Someone has to take the big shots.',
    choices: [
      {
        label: 'I want the ball',
        detail: 'A chance to shine. Risky if you struggle.',
        resolve: (s, rng: Rng) => {
          if (chance(rng, 0.55 + (s.player.morale - 60) / 250)) {
            rep(s, 5);
            trust(s, 5);
            morale(s, 5);
            return ok('You carry the team for a month and win 9 of 13. Nobody forgets that.', 'Carried the team while the star was out.');
          }
          morale(s, -4);
          trust(s, -2);
          return ok('You force too many shots. The team goes 4–9.');
        },
      },
      {
        label: 'Share it around',
        resolve: (s) => {
          bump(s, 'PLY', range(s.rng, 0.5, 1.2));
          trust(s, 3);
          return ok('Everyone eats. The team holds steady.');
        },
      },
    ],
  },
  {
    id: 'ref',
    stages: ALL,
    phase: 'mid',
    weight: 0.7,
    cooldownSeasons: 3,
    title: 'The no-call',
    text: 'You got hammered on a drive in a tie game. No whistle. The ref is jogging right past you.',
    choices: [
      {
        label: 'Let him hear it',
        detail: 'Risky',
        resolve: (s, rng: Rng) => {
          if (chance(rng, 0.5)) {
            s.flags.suspendGames = (s.flags.suspendGames ?? 0) + 1;
            rep(s, 1);
            return ok('Two technicals, ejected, and a one-game suspension. The fans loved it.', 'Ejected after arguing a no-call.');
          }
          morale(s, 2);
          return ok('You got your point across. The next close one goes your way.');
        },
      },
      {
        label: 'Get back on defense',
        resolve: (s) => {
          trust(s, 3);
          bump(s, 'IQ', 0.4);
          return ok('You get a stop on the next play. Your coach claps.');
        },
      },
    ],
  },
  {
    id: 'diet',
    stages: ALL,
    phase: 'off',
    weight: 0.8,
    cooldownSeasons: 5,
    title: 'A new diet',
    text: 'A nutritionist says your diet is costing you a step. She wants to change everything: what, when and how much.',
    choices: [
      {
        label: 'Go all in',
        resolve: (s, rng: Rng) => {
          if (chance(rng, 0.75)) {
            bump(s, 'ATH', range(rng, 0.8, 1.8));
            s.player.injuryMultNext *= 0.95;
            s.player.declineMultNext *= 0.97;
            if (canHire(s, 'nutritionist')) hireStaff(s, 'nutritionist'); // round 25: onto his staff
            return ok('Lighter, quicker, and your knees thank you.', 'Overhauled his diet.');
          }
          bump(s, 'ATH', -0.6);
          morale(s, -3);
          return ok('You lost too much weight too fast and felt weak for a month.', 'A diet change backfired.');
        },
      },
      { label: 'Keep eating what works', resolve: () => ok('Your mom’s cooking it is.') },
    ],
  },
  {
    id: 'charityGame',
    stages: PRO,
    phase: 'off',
    weight: 0.7,
    cooldownSeasons: 3,
    title: 'Celebrity game',
    text: 'A charity game with actors, musicians and a few retired legends. Cameras everywhere.',
    choices: [
      {
        label: 'Play and ham it up',
        resolve: (s) => {
          rep(s, 4);
          morale(s, 5);
          return ok('You let a famous rapper cross you up on purpose. The crowd goes wild, and the charity raises a lot.', 'Played in a celebrity charity game.');
        },
      },
      { label: 'Stay in the gym', resolve: (s) => ((s.player.growthMultNext *= 1.02), ok('Another day of work.')) },
    ],
  },
  {
    id: 'shoeLab',
    stages: ['NCAA', ...PRO],
    phase: 'off',
    when: (s) => (s.player.growthRate ?? 1) < GROWTH_RATE.max,
    weight: 0.6,
    cooldownSeasons: 6,
    title: 'Sports science lab',
    text: 'A sports science lab offers a full summer of testing: force plates, sleep tracking, movement screens. It is long and boring.',
    choices: [
      {
        label: 'Do the whole program',
        resolve: (s) => {
          s.player.growthRate = Math.min(GROWTH_RATE.max, (s.player.growthRate ?? 1) * 1.04);
          morale(s, -2);
          return ok('They find three things in your movement nobody had noticed. You fix all of them.', 'Did a summer in a sports science lab.');
        },
      },
      { label: 'Pass', resolve: () => ok('You trust your own routine.') },
    ],
  },
];

