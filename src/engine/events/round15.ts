// Round 15 turning points ("more events"): some lean on this round's systems (reputation that
// pays, coach trust that holds a team together, the starting five, ring chasing), the rest are
// new everyday moments of a career.

import { ATTR_MAX } from '../balance';
import { chance, clamp, type Rng } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust } from '../career/common';
import type { EventDef } from './defs';

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const ok = (outcome: string, log?: string) => ({ outcome, log });
const teamUp = (s: GameState, v: number) => {
  if (s.season) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) + v) * 10) / 10;
};

export const ROUND15_EVENTS: EventDef[] = [
  {
    id: 'playersOnlyMeeting',
    stages: PRO,
    phase: 'mid',
    when: (s) => !!s.season && s.player.trust >= 60,
    weight: 1,
    cooldownSeasons: 3,
    title: 'Players-only meeting',
    text: 'Five losses in a row. The coach leaves the room and the veterans look at you.',
    choices: [
      {
        label: 'Speak up',
        detail: 'The coach trusts you; now the room has to.',
        resolve: (s, rng: Rng) => {
          const land = chance(rng, 0.4 + s.player.trust / 250);
          if (land) {
            teamUp(s, 0.6);
            trust(s, 4);
            return ok('You say what everyone was thinking. The next night the ball moves again (team strength +0.6).', 'Led a players-only meeting.');
          }
          morale(s, -4);
          return ok('Nobody wanted a speech. The streak goes on a little longer.');
        },
      },
      {
        label: 'Let the vets talk',
        resolve: (s) => {
          morale(s, 2);
          return ok('You listen. Sometimes that is the right call.');
        },
      },
    ],
  },
  {
    id: 'agentRaise',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.rep >= 60 && !!s.contract && s.contract.years >= 2,
    weight: 0.8,
    cooldownSeasons: 4,
    title: 'Your agent has an idea',
    text: 'Your name sells jerseys now. Your agent wants to ask the team to rework your deal.',
    choices: [
      {
        label: 'Ask for more',
        detail: 'Reputation is leverage.',
        resolve: (s, rng: Rng) => {
          const c = s.contract!;
          if (chance(rng, 0.3 + s.player.rep / 250)) {
            const before = c.salary;
            c.salary = Math.round(c.salary * 1.12 * 10) / 10;
            trust(s, -3);
            return ok(`They pay. ${before.toFixed(1)}M to ${c.salary.toFixed(1)}M a year (coach trust -3).`, 'Got his contract reworked.');
          }
          trust(s, -8);
          morale(s, -3);
          return ok('The front office says no, and leaks it. Not a great look (coach trust -8).');
        },
      },
      {
        label: 'Honor the deal',
        resolve: (s) => {
          trust(s, 5);
          rep(s, 1);
          return ok('You signed it, you play it. The front office remembers (coach trust +5).');
        },
      },
    ],
  },
  {
    id: 'charityCourt',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.rep >= 40,
    weight: 0.9,
    cooldownSeasons: 4,
    title: 'A court with your name on it',
    text: (s) => `A city program in ${s.player.hometown} wants to rebuild an outdoor court and name it after you.`,
    choices: [
      {
        label: 'Pay for it',
        detail: 'Costs a little money.',
        resolve: (s) => {
          s.player.bank = Math.max(0, s.player.bank - 0.4);
          rep(s, 4);
          morale(s, 5);
          return ok('Ribbon cutting in July. Kids are on it before the speech ends (reputation +4).', 'Built a court in his hometown.');
        },
      },
      {
        label: 'Just show up',
        resolve: (s) => {
          rep(s, 1);
          return ok('You play a pickup game at the opening. Somebody films it.');
        },
      },
    ],
  },
  {
    id: 'newTeammateClash',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => (s.recruit?.joined?.length ?? 0) > 0 && s.recruit?.year === s.year - 1,
    weight: 2,
    cooldownSeasons: 2,
    title: 'The new guy',
    text: 'The starter you recruited wants more shots. The old core is muttering.',
    choices: [
      {
        label: 'Share the ball',
        detail: 'You brought him here.',
        resolve: (s) => {
          teamUp(s, 0.5);
          return ok('You set him up early. He settles in, and the team clicks (team strength +0.5).');
        },
      },
      {
        label: 'It is still your team',
        resolve: (s) => {
          morale(s, 3);
          teamUp(s, -0.3);
          return ok('You keep the ball. He sulks for a week (team strength -0.3).');
        },
      },
    ],
  },
  {
    id: 'ringChaserDoubt',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => !!s.player.ringChaser,
    weight: 3,
    cooldownSeasons: 2,
    title: 'Twelve minutes a night',
    text: (s) => `You took a ${s.player.ringChaser!.toLowerCase()} role for a ring. Some nights you barely see the floor.`,
    choices: [
      {
        label: 'Own the role',
        detail: 'This is what you came for.',
        resolve: (s) => {
          trust(s, 6);
          teamUp(s, 0.4);
          return ok('You become the best teammate in the building (coach trust +6, team strength +0.4).');
        },
      },
      {
        label: 'Ask for more minutes',
        resolve: (s) => {
          trust(s, -5);
          morale(s, 2);
          return ok('The coach hears you out. Nothing changes.');
        },
      },
    ],
  },
  {
    id: 'weightCut',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.age >= 19 && s.player.age <= 30,
    weight: 0.9,
    cooldownSeasons: 4,
    title: 'Body choice',
    text: 'The strength staff has two plans for your summer: add muscle, or cut weight and get quicker.',
    choices: [
      {
        label: 'Add muscle',
        resolve: (s) => {
          bump(s, 'INT', 1.2);
          bump(s, 'REB', 1);
          bump(s, 'ATH', -0.5);
          return ok('Eight pounds, all of it useful in the paint (interior D +1.2, rebounding +1, athleticism -0.5).');
        },
      },
      {
        label: 'Get lean',
        resolve: (s) => {
          bump(s, 'ATH', 1.2);
          bump(s, 'PER', 0.8);
          return ok('You are a step quicker in camp (athleticism +1.2, perimeter D +0.8).');
        },
      },
    ],
  },
  {
    id: 'boxingTraining',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.age >= 18,
    weight: 0.7,
    cooldownSeasons: 5,
    title: 'Boxing gym',
    text: 'A trainer swears boxing footwork will fix your defense.',
    choices: [
      {
        label: 'Lace up the gloves',
        resolve: (s) => {
          bump(s, 'PER', 1.5);
          s.player.wear = Math.min(100, (s.player.wear ?? 0) + 2);
          return ok('Your feet have never been this fast (perimeter D +1.5).');
        },
      },
      {
        label: 'Stick to basketball',
        resolve: (s) => {
          morale(s, 1);
          return ok('A normal summer.');
        },
      },
    ],
  },
  {
    id: 'glassCleaner',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.pos === 'PF' || s.player.pos === 'C' || s.player.pos === 'SF',
    weight: 0.9,
    cooldownSeasons: 4,
    title: 'The glass',
    text: 'An old rebounding coach offers a week of nothing but box-outs and tip drills.',
    choices: [
      {
        label: 'Do the week',
        resolve: (s) => {
          bump(s, 'REB', 2);
          return ok('Every miss is yours now (rebounding +2).');
        },
      },
      {
        label: 'Not this summer',
        resolve: () => ok('Maybe next year.'),
      },
    ],
  },
  {
    id: 'passingGuru',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.attrs.PLY < 85,
    weight: 0.9,
    cooldownSeasons: 4,
    title: 'See the floor',
    text: 'A retired point guard runs a famous passing clinic. He has one spot left.',
    choices: [
      {
        label: 'Take the spot',
        resolve: (s) => {
          bump(s, 'PLY', 1.8);
          bump(s, 'IQ', 0.5);
          return ok('You start seeing passes before they open (playmaking +1.8, basketball IQ +0.5).');
        },
      },
      {
        label: 'Give it to a teammate',
        resolve: (s) => {
          trust(s, 3);
          return ok('Your backup goes instead. The coach notices (coach trust +3).');
        },
      },
    ],
  },
  {
    id: 'reputationTest',
    stages: PRO,
    phase: 'mid',
    when: (s) => s.player.rep >= 70,
    weight: 0.8,
    cooldownSeasons: 3,
    title: 'Everyone’s best shot',
    text: 'Your name is on every scouting report now. Teams send two defenders at you from the opening tip.',
    choices: [
      {
        label: 'Find the open man',
        resolve: (s) => {
          bump(s, 'PLY', 0.8);
          teamUp(s, 0.4);
          return ok('You punish the double team with passes. Teammates eat (playmaking +0.8, team strength +0.4).');
        },
      },
      {
        label: 'Score through it',
        resolve: (s, rng: Rng) => {
          if (chance(rng, 0.55)) {
            rep(s, 3);
            return ok('Forty through two defenders. That is why they send two (reputation +3).');
          }
          morale(s, -3);
          return ok('Forced shots, a cold week. The doubles keep coming.');
        },
      },
    ],
  },
];
