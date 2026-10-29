// Round 13 turning points: more of them, some tied to the new systems (team style, his team's
// story, the rival) and two short storylines that run over two summers (a documentary crew,
// a youth camp back home): the first event sets a flag, the follow-up checks it a year later.

import { ATTR_MAX } from '../balance';
import { chance, clamp, type Rng } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust } from '../career/common';
import { currentStyle, TEAM_STYLES } from '../career/identity';
import type { EventDef } from './defs';

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const ok = (outcome: string, log?: string) => ({ outcome, log });
const mineStory = (s: GameState) => s.stories?.find((x) => x.mine);

export const ROUND13_EVENTS: EventDef[] = [
  {
    id: 'styleClash',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => !!currentStyle(s),
    weight: 1,
    cooldownSeasons: 3,
    title: 'The system',
    text: (s) => `Your coach pulls you aside: some veterans think "${TEAM_STYLES[currentStyle(s)!].name}" does not suit them. They want you to back the plan in front of the team.`,
    choices: [
      {
        label: 'Back the plan',
        detail: 'Stand with the coach.',
        resolve: (s) => {
          trust(s, 6);
          if (s.season) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) + 0.5) * 10) / 10;
          return ok('You speak first in the film session. The grumbling stops, and the team plays your way (team strength +0.5).', 'Backed the team\'s style in front of the locker room.');
        },
      },
      {
        label: 'Hear the veterans out',
        detail: 'Maybe they have a point.',
        resolve: (s) => {
          morale(s, 3);
          trust(s, -3);
          return ok('The vets appreciate it. The coach notices you did not back him.');
        },
      },
    ],
  },
  {
    id: 'storyMedia',
    stages: PRO,
    phase: 'mid',
    when: (s) => !!mineStory(s),
    weight: 1.2,
    cooldownSeasons: 2,
    title: 'Everyone wants the story',
    text: (s) => `"${mineStory(s)!.title}" is the headline of the week. A national show wants you on air to talk about it.`,
    choices: [
      {
        label: 'Go on the show',
        detail: 'Fame, and a target on your back.',
        resolve: (s, rng: Rng) => {
          rep(s, 4);
          const jinx = chance(rng, 0.3);
          if (jinx && s.season) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) - 0.4) * 10) / 10;
          return ok(jinx ? 'Great TV. Then every opponent printed your quotes and pinned them up (team strength -0.4).' : 'Great TV, and your team keeps rolling.', 'Talked up the team on national TV.');
        },
      },
      {
        label: 'Let the play talk',
        resolve: (s) => {
          trust(s, 3);
          morale(s, 2);
          return ok('No interviews. The locker room likes it that way.');
        },
      },
    ],
  },
  {
    id: 'rivalFilm',
    stages: ALL,
    phase: 'off',
    when: (s) => s.flags.nemesisYear === s.year,
    weight: 1.2,
    cooldownSeasons: 2,
    title: 'You keep the tape',
    text: 'The game that ended your season is still on your laptop. You have watched it nine times.',
    choices: [
      {
        label: 'Study every possession',
        detail: 'Learn from it.',
        resolve: (s) => {
          bump(s, 'IQ', 1.5);
          return ok('You find the three plays where you got caught. You will not get caught again (basketball IQ +1.5).');
        },
      },
      {
        label: 'Use it as fuel',
        detail: 'Train angry.',
        resolve: (s) => {
          bump(s, 'ATH', 0.8);
          morale(s, 4);
          s.player.growthMultNext = Math.min(1.25, s.player.growthMultNext * 1.06);
          return ok('Early mornings, late nights, one picture on the wall. Next season starts now.');
        },
      },
      {
        label: 'Delete it',
        resolve: (s) => {
          morale(s, 5);
          return ok('Gone. Some things you leave behind.');
        },
      },
    ],
  },
  {
    id: 'docuStart',
    stages: ['NCAA', 'NBA', 'EU'],
    phase: 'off',
    when: (s) => s.player.rep >= 45 && !s.flags.docuYear,
    weight: 0.8,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'A documentary crew',
    text: 'A streaming service wants to follow you for a full season: practices, family dinners, the bad nights too.',
    choices: [
      {
        label: 'Sign on',
        detail: 'Cameras everywhere for a year.',
        resolve: (s) => {
          s.flags.docuYear = s.year;
          rep(s, 3);
          morale(s, -2);
          return ok('The crew moves in. It is strange to have a boom mic in your kitchen.', 'Agreed to a season-long documentary.');
        },
      },
      {
        label: 'Keep your life private',
        resolve: (s) => {
          morale(s, 2);
          return ok('Maybe after you have won something.');
        },
      },
    ],
  },
  {
    id: 'docuRelease',
    stages: ALL,
    phase: 'off',
    when: (s) => !!s.flags.docuYear && s.flags.docuYear === s.year - 1,
    weight: 5,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'The documentary drops',
    text: 'Eight episodes, out tonight. The trailer already has millions of views.',
    choices: [
      {
        label: 'Watch it with your family',
        resolve: (s, rng: Rng) => {
          const hit = chance(rng, 0.65);
          rep(s, hit ? 8 : 2);
          morale(s, hit ? 6 : -3);
          return ok(hit ? 'It is a hit. Kids around the world now know your story (reputation +8).' : 'Mixed reviews. One episode makes you look bad, and the clip goes around.', `The documentary came out: ${hit ? 'a hit' : 'mixed reviews'}.`);
        },
      },
    ],
  },
  {
    id: 'homeCamp',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.age >= 22 && !s.flags.campYear,
    weight: 0.8,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'A camp back home',
    text: (s) => `The gym in ${s.player.hometown} where you learned the game needs a new floor. You could run a youth camp there this summer.`,
    choices: [
      {
        label: 'Run the camp',
        detail: 'A week of your summer.',
        resolve: (s) => {
          s.flags.campYear = s.year;
          morale(s, 6);
          rep(s, 2);
          return ok('Two hundred kids, one week, and a new floor. Coaching them makes you see the game differently (it may pay off next year).', 'Ran a youth camp in his hometown.');
        },
      },
      {
        label: 'Send a check',
        resolve: (s) => {
          rep(s, 1);
          return ok('The floor gets fixed. You are too busy to go.');
        },
      },
    ],
  },
  {
    id: 'homeCampKid',
    stages: PRO,
    phase: 'off',
    when: (s) => !!s.flags.campYear && s.flags.campYear === s.year - 1,
    weight: 5,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'One of your campers',
    text: 'A kid from your camp just made his high school varsity as a freshman. His mom sends you a video of him doing your move.',
    choices: [
      {
        label: 'Call him',
        resolve: (s) => {
          morale(s, 8);
          bump(s, 'IQ', 1);
          return ok('Twenty minutes on the phone. Explaining your game to him made it clearer to you too (basketball IQ +1).');
        },
      },
    ],
  },
  {
    id: 'loadManagement',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => s.player.age >= 29 && (s.player.wear ?? 0) >= 35,
    weight: 1,
    cooldownSeasons: 2,
    title: 'Rest nights',
    text: 'The medical staff wants you to sit one game of every back-to-back. The fans in road arenas paid to see you.',
    choices: [
      {
        label: 'Take the rest',
        detail: 'Saves your body.',
        resolve: (s) => {
          s.player.wear = Math.max(0, (s.player.wear ?? 0) - 5);
          rep(s, -1);
          return ok('Fewer games, fresher legs (body wear -5). A few boos in Cleveland.');
        },
      },
      {
        label: 'Play every night',
        detail: 'The fans came for you.',
        resolve: (s) => {
          s.player.wear = Math.min(100, (s.player.wear ?? 0) + 3);
          rep(s, 3);
          trust(s, 2);
          return ok('Every night, every city. They love you for it. Your knees are less sure.');
        },
      },
    ],
  },
  {
    id: 'rookieMentor',
    stages: ['NBA'],
    phase: 'off',
    when: (s) => s.player.age >= 27,
    weight: 0.9,
    cooldownSeasons: 3,
    title: 'The rookie',
    text: 'Your team drafted a 19-year-old at your position. The coach asks you to take him under your wing.',
    choices: [
      {
        label: 'Mentor him',
        detail: 'Good for the team. He may take your minutes one day.',
        resolve: (s) => {
          trust(s, 6);
          bump(s, 'IQ', 1);
          return ok('You teach him everything. Explaining it out loud sharpens your own game (basketball IQ +1, coach trust up).');
        },
      },
      {
        label: 'Make him earn it',
        detail: 'Practice is a fight.',
        resolve: (s) => {
          bump(s, 'PER', 1);
          morale(s, 2);
          return ok('You lock him up every day in practice. He hates you now; he will thank you later (perimeter D +1).');
        },
      },
    ],
  },
  {
    id: 'clutchDrill',
    stages: ALL,
    phase: 'off',
    when: (s) => s.history.some((h) => h.year === s.year && /final|semifinal|conference/i.test(h.result)),
    weight: 1,
    cooldownSeasons: 3,
    title: 'The last shot',
    text: 'You had the ball with the season on the line and it did not go in. All summer, the same thought.',
    choices: [
      {
        label: 'Thousand game-winners',
        detail: 'Every workout ends with a buzzer-beater.',
        resolve: (s) => {
          bump(s, 'SHT', 1);
          morale(s, 3);
          return ok('Three, two, one... a thousand times. Next time you want the ball (shooting +1).');
        },
      },
      {
        label: 'Talk to someone',
        resolve: (s) => {
          morale(s, 8);
          return ok('A sports psychologist helps you let it go. You sleep again.');
        },
      },
    ],
  },
];
