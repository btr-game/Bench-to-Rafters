// Turning points that build ratings directly (playtest round 7): most of the earlier events
// moved morale, trust and reputation. These are about getting better at basketball. Every
// effect is scaled by a random factor each time (see outcome.ts).

import { ATTR_MAX } from '../balance';
import { chance, clamp } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust } from '../career/common';
import type { EventDef } from './defs';

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 5, ATTR_MAX));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const ok = (outcome: string, log?: string) => ({ outcome, log });
const weakest = (s: GameState): AttrKey => (Object.keys(s.player.attrs) as AttrKey[]).sort((a, b) => s.player.attrs[a] - s.player.attrs[b])[0];

export const SKILL_EVENTS: EventDef[] = [
  {
    id: 'shootingcamp',
    stages: ALL,
    phase: 'off',
    weight: 1,
    cooldownSeasons: 2,
    title: 'Shooting camp invite',
    text: 'A shooting coach who rebuilt three NBA jumpers has a week open.',
    choices: [
      {
        label: 'Rebuild your shot from the feet up',
        detail: 'Ugly for a while, better for good',
        resolve: (s) => {
          bump(s, 'SHT', 3);
          s.player.range = Math.min(99, s.player.range + 4);
          return ok('Ten thousand makes later, the release is quicker and higher.', 'Rebuilt his jump shot at a shooting camp.');
        },
      },
      {
        label: 'Just get extra reps',
        resolve: (s) => {
          bump(s, 'SHT', 1.5);
          return ok('More reps, same form. A little better.');
        },
      },
    ],
  },
  {
    id: 'bigmancamp',
    stages: ALL,
    phase: 'off',
    weight: 0.9,
    cooldownSeasons: 2,
    title: 'Footwork with a post legend',
    text: 'A Hall of Fame big man runs a footwork camp: drop steps, up-and-unders, sealing.',
    choices: [
      {
        label: 'Learn the old-school post game',
        resolve: (s) => {
          bump(s, 'FIN', 3);
          bump(s, 'INT', 1.5);
          return ok('The up-and-under is yours now.', 'Learned post footwork from a Hall of Famer.');
        },
      },
      {
        label: 'Work on finishing through contact',
        resolve: (s) => {
          bump(s, 'FIN', 2);
          bump(s, 'ATH', 1);
          return ok('Bumps that used to knock you off line barely move you now.');
        },
      },
    ],
  },
  {
    id: 'handlesummer',
    stages: ALL,
    phase: 'off',
    weight: 0.9,
    cooldownSeasons: 2,
    title: 'Summer of handles',
    text: 'A streetball legend offers to run you through the drills that made him famous.',
    choices: [
      {
        label: 'Two-ball drills every morning',
        resolve: (s) => {
          bump(s, 'PLY', 3);
          s.player.offhand = Math.min(99, s.player.offhand + 4);
          return ok('Your handle is tighter and your weak hand finally listens.', 'Spent a summer on ball-handling.');
        },
      },
      {
        label: 'Learn to read the pick-and-roll',
        resolve: (s) => {
          bump(s, 'PLY', 2.5);
          bump(s, 'IQ', 1);
          return ok('You see the roll man a beat earlier.');
        },
      },
    ],
  },
  {
    id: 'lockdowncoach',
    stages: ALL,
    phase: 'both',
    weight: 0.9,
    cooldownSeasons: 2,
    title: 'The defensive guru',
    text: 'An assistant who made his name on defense offers you extra sessions after practice.',
    choices: [
      {
        label: 'Perimeter footwork and hands',
        resolve: (s) => {
          bump(s, 'PER', 3);
          return ok('Slides are quicker, hands are active. Guards notice.', 'Worked extra on perimeter defense.');
        },
      },
      {
        label: 'Rim protection and verticality',
        resolve: (s) => {
          bump(s, 'INT', 3);
          return ok('You learn to block without fouling.', 'Worked extra on rim protection.');
        },
      },
    ],
  },
  {
    id: 'explosive',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.age <= 27,
    weight: 0.8,
    cooldownSeasons: 3,
    title: 'Explosiveness program',
    text: 'A sprint coach says your first step can get faster with a summer of plyometrics.',
    choices: [
      {
        label: 'Commit to the program',
        detail: 'Hard on the knees',
        resolve: (s) => {
          bump(s, 'ATH', 3);
          s.player.injuryMultNext *= 1.05;
          return ok('Half a step quicker. That is everything.', 'Did a summer of explosiveness training.');
        },
      },
      {
        label: 'Focus on strength instead',
        resolve: (s) => {
          bump(s, 'ATH', 1.5);
          bump(s, 'REB', 1.5);
          return ok('Heavier, stronger, harder to move.');
        },
      },
    ],
  },
  {
    id: 'glasswork',
    stages: ALL,
    phase: 'both',
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Crash the glass',
    text: 'Your coach shows you a clip of every rebound you gave up last week.',
    choices: [
      {
        label: 'Box out on every possession',
        resolve: (s) => {
          bump(s, 'REB', 3);
          return ok('Positioning first, then the ball. Your boards go up.', 'Made rebounding a habit.');
        },
      },
      {
        label: 'Leak out for fast breaks instead',
        shownOdds: 0.5,
        detail: 'Risky',
        resolve: (s, rng) => {
          if (chance(rng, 0.5)) {
            bump(s, 'FIN', 2);
            return ok('Easy layups all month.');
          }
          bump(s, 'REB', -1);
          s.player.trust = adjust(s.player.trust, -5);
          return ok('The coach benches you for it.');
        },
      },
    ],
  },
  {
    id: 'pickuppros',
    stages: ALL,
    phase: 'off',
    weight: 0.9,
    cooldownSeasons: 2,
    title: 'Runs with the pros',
    text: 'You get invited to the summer runs where NBA players work out. You will get destroyed at first.',
    choices: [
      {
        label: 'Show up every day',
        resolve: (s, rng) => {
          bump(s, 'IQ', 1.5);
          bump(s, chance(rng, 0.5) ? 'PLY' : 'FIN', 1.5);
          morale(s, -2);
          return ok('You lose a lot, then less, then you start winning some.', 'Played summer runs against NBA players.');
        },
      },
      {
        label: 'Stick with your own workouts',
        resolve: (s) => {
          morale(s, 2);
          return ok('Comfortable, controlled, and a little less to learn.');
        },
      },
    ],
  },
  {
    id: 'newmove',
    stages: ALL,
    phase: 'mid',
    weight: 1,
    cooldownSeasons: 2,
    title: 'A new move',
    text: 'You have been working on something in practice. The coach says try it in a game.',
    choices: [
      {
        label: 'A floater over the big men',
        resolve: (s) => {
          bump(s, 'FIN', 1.5);
          bump(s, 'SHT', 1.5);
          return ok('Soft touch from eight feet. Defenders hate it.');
        },
      },
      {
        label: 'A Euro step',
        resolve: (s) => {
          bump(s, 'FIN', 2);
          bump(s, 'PLY', 1);
          return ok('Two steps, two directions, two points.');
        },
      },
      {
        label: 'A step-back three',
        shownOdds: 0.55,
        detail: 'Risky',
        resolve: (s, rng) => {
          if (chance(rng, 0.55)) {
            bump(s, 'SHT', 3);
            s.player.range = Math.min(99, s.player.range + 3);
            return ok('It works. You have a new weapon.', 'Added a step-back three.');
          }
          s.player.trust = adjust(s.player.trust, -4);
          return ok('It clanks a few times and the coach asks you to stop.');
        },
      },
    ],
  },
  {
    id: 'weakspot',
    stages: ALL,
    phase: 'off',
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Fix the weak spot',
    text: (s) => `A scout's report on you is blunt: the ${weakest(s) === 'IQ' ? 'basketball IQ' : 'weakest part of your game'} gets you played off the floor.`,
    choices: [
      {
        label: 'Spend the summer on your weakest rating',
        resolve: (s) => {
          const k = weakest(s);
          bump(s, k, 4);
          return ok('It is not a weakness anymore. Not quite a strength either.', 'Spent a summer fixing his weakest rating.');
        },
      },
      {
        label: 'Double down on what you do best',
        resolve: (s) => {
          const best = (Object.keys(s.player.attrs) as AttrKey[]).sort((a, b) => s.player.attrs[b] - s.player.attrs[a])[0];
          bump(s, best, 2);
          return ok('Your best skill gets even better.');
        },
      },
    ],
  },
  {
    id: 'filmiq',
    stages: ALL,
    phase: 'mid',
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Film with the coaches',
    text: 'The coaching staff invites you to their late-night film sessions.',
    choices: [
      {
        label: 'Join them every night',
        resolve: (s) => {
          bump(s, 'IQ', 2);
          bump(s, 'PLY', 0.5);
          s.player.trust = adjust(s.player.trust, 4);
          return ok('You start calling out plays before they happen.', 'Joined late-night film sessions with the coaches.');
        },
      },
      {
        label: 'Get your sleep',
        resolve: (s) => {
          morale(s, 2);
          return ok('Rested legs matter too.');
        },
      },
    ],
  },
  {
    id: 'pnrlab',
    stages: ALL,
    phase: 'both',
    weight: 0.9,
    cooldownSeasons: 2,
    title: 'Pick-and-roll lab',
    text: 'The coaches want to run more offense through you. Every practice ends with twenty minutes of two-man game.',
    choices: [
      {
        label: 'Learn to read the low man',
        resolve: (s) => {
          bump(s, 'PLY', 3);
          return ok('Skip passes to the corner start finding shooters you did not see last year.', 'Learned to read the pick-and-roll.');
        },
      },
      {
        label: 'Work on the pocket pass',
        resolve: (s) => {
          bump(s, 'PLY', 2);
          bump(s, 'IQ', 0.5);
          return ok('Bounce passes through two defenders, right into the big man\'s hands.');
        },
      },
      {
        label: 'Keep looking for your own shot',
        resolve: (s) => {
          bump(s, 'SHT', 1);
          s.player.trust = adjust(s.player.trust, -3);
          return ok('You score a little more. The coach wanted more than that.');
        },
      },
    ],
  },
  {
    id: 'touchsummer',
    stages: ALL,
    phase: 'off',
    weight: 0.9,
    cooldownSeasons: 2,
    title: 'Touch around the rim',
    text: 'You missed too many layups last season. A trainer known for finishing drills has a summer open.',
    choices: [
      {
        label: 'Mikan drills until your arms hurt',
        resolve: (s) => {
          bump(s, 'FIN', 3);
          return ok('Left, right, left, right. The ball starts kissing off the glass.', 'Spent a summer on finishing touch.');
        },
      },
      {
        label: 'Reverse layups and the weak hand',
        resolve: (s) => {
          bump(s, 'FIN', 2);
          s.player.offhand = Math.min(99, s.player.offhand + 4);
          return ok('You can finish on the other side of the rim now, with either hand.');
        },
      },
    ],
  },
  {
    id: 'passers',
    stages: ALL,
    phase: 'off',
    weight: 0.7,
    cooldownSeasons: 3,
    title: 'Study the great passers',
    text: 'A coach sends you a hard drive: every assist from three of the best passers who ever lived.',
    choices: [
      {
        label: 'Watch all of it, twice',
        resolve: (s) => {
          bump(s, 'PLY', 2.5);
          bump(s, 'IQ', 0.5);
          return ok('You start throwing passes before the cut happens, the way they did.', 'Studied the great passers all summer.');
        },
      },
      {
        label: 'Skim the highlights',
        resolve: (s) => {
          bump(s, 'PLY', 1);
          return ok('A few new ideas. A few.');
        },
      },
    ],
  },
];
