// Round 34's events (the end-of-round checklist, item 6). The round was about simplification: cards
// that fold, one career log, Look back on a finished career, a bigger announcer. So the turning
// points are too: a coach who cuts the playbook to four plays, an old tape from high school, the
// arena announcer's call for you, a house with too much in it, and one move learned for good.
// Small effects, like the rest of the book.

import { clamp } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust } from '../career/common';
import { ATTR_MAX } from '../balance';
import type { EventDef } from './defs';

const PRO: Stage[] = ['NCAA', 'GL', 'EU', 'INT', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const ok = (outcome: string, log?: string) => ({ outcome, log });
/** His best rating and his worst, of the eight. */
const best = (s: GameState): AttrKey => (Object.keys(s.player.attrs) as AttrKey[]).reduce((a, b) => (s.player.attrs[b] > s.player.attrs[a] ? b : a));
const worst = (s: GameState): AttrKey => (Object.keys(s.player.attrs) as AttrKey[]).reduce((a, b) => (s.player.attrs[b] < s.player.attrs[a] ? b : a));
const ATTR_NAME: Record<AttrKey, string> = { SHT: 'shooting', FIN: 'finishing', PLY: 'playmaking', PER: 'perimeter defense', INT: 'interior defense', REB: 'rebounding', ATH: 'athleticism', IQ: 'basketball IQ' };

export const ROUND34_EVENTS: EventDef[] = [
  {
    id: 'fourPlays',
    stages: PRO,
    phase: 'mid',
    when: (s) => !!s.season,
    weight: 0.6,
    cooldownSeasons: 5,
    title: 'Four plays',
    text: 'The coach tears the playbook in half, then in half again. "Four plays. We run them until we can run them in our sleep."',
    choices: [
      {
        label: 'Learn the four cold',
        detail: 'A little smarter on the floor; the coach notices',
        resolve: (s) => {
          bump(s, 'IQ', 0.5);
          trust(s, 3);
          return ok('By the third week you call the plays before he does. He pretends not to smile.', 'Learned the coach’s four plays cold.');
        },
      },
      {
        label: 'Ask for your old sets back',
        detail: 'You liked your touches; he likes his four',
        resolve: (s) => {
          morale(s, 2);
          trust(s, -3);
          return ok('He gives you one of them back. He also gives you a long look.');
        },
      },
      {
        label: 'Make one of the four yours',
        detail: 'A better finisher, a little more fame',
        resolve: (s) => {
          bump(s, 'FIN', 0.4);
          rep(s, 2);
          return ok('Play three becomes your play. The broadcast starts calling it by your name.', 'Made one of the coach’s four plays his own.');
        },
      },
    ],
  },
  {
    id: 'oldTape',
    stages: PRO,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => s.history.some((h) => h.stage === 'HS'),
    weight: 0.7,
    cooldownSeasons: 1,
    title: 'The old tape',
    text: (s) => `Your mother finds a tape of your first game at ${s.player.highSchool || 'high school'}. Same jump shot. Much worse haircut.`,
    choices: [
      {
        label: 'Watch it with the family',
        detail: 'A good night; morale up',
        resolve: (s) => {
          morale(s, 5);
          return ok('Everyone talks over the tape. Nobody watches the second half. It is the best night of the summer.', 'Watched his first high school game again with the family.');
        },
      },
      {
        label: 'Study the old habits',
        detail: 'What you still do wrong, you can still fix',
        resolve: (s) => {
          const k = worst(s);
          bump(s, k, 0.6);
          return ok(`The same mistake, ten years apart. You spend the summer on your ${ATTR_NAME[k]}.`);
        },
      },
      {
        label: 'Post the haircut',
        detail: 'The fans love it; a little more fame',
        resolve: (s) => {
          rep(s, 3);
          morale(s, 1);
          return ok('Two million views. The barber from the tape asks for a shout-out.');
        },
      },
    ],
  },
  {
    id: 'announcerCall',
    stages: ['NBA'],
    phase: 'mid',
    oncePerCareer: true,
    when: (s) => s.player.rep >= 55,
    weight: 0.6,
    cooldownSeasons: 1,
    title: 'Your own call',
    text: (s) => `The arena announcer has a call just for you now. When you score, he stretches "${s.player.name.split(' ').pop()}" for three full seconds.`,
    choices: [
      {
        label: 'Feed the call',
        detail: 'More fame, more fun; a little less patience from the coach',
        resolve: (s) => {
          rep(s, 3);
          morale(s, 3);
          trust(s, -1);
          return ok('You start hunting the shots that make him shout. The crowd shouts with him.', 'Has his own call from the arena announcer.');
        },
      },
      {
        label: 'Ask him to call the team',
        detail: 'The locker room likes it; the coach likes it more',
        resolve: (s) => {
          trust(s, 3);
          morale(s, 1);
          return ok('He calls the whole starting five the same way. The rookie nearly cries.');
        },
      },
      {
        label: 'Record a birthday call for a fan',
        detail: 'A kind thing that travels; a little more fame',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 2);
          return ok('One boy gets his name boomed across an empty arena. His video goes everywhere.');
        },
      },
    ],
  },
  {
    id: 'clearOut',
    stages: PRO,
    phase: 'off',
    when: (s) => (s.purchases?.length ?? 0) >= 4,
    weight: 0.6,
    cooldownSeasons: 5,
    title: 'Too much stuff',
    text: 'Your agent walks through the house and counts the boxes you never opened. "You need less. You need a lot less."',
    choices: [
      {
        label: 'Sell what you never use',
        detail: 'A little money back',
        resolve: (s) => {
          s.player.bank += s.stage === 'NBA' ? 0.15 : 0.005;
          morale(s, 1);
          return ok('Three garage sales and a very confused neighbour later, the garage has a car in it again.', 'Cleared out the house.');
        },
      },
      {
        label: 'Give it to the youth league',
        detail: 'The town loves it; more fame',
        resolve: (s) => {
          rep(s, 3);
          morale(s, 2);
          return ok('Forty kids get shoes they never thought they would own. One of them wears yours to tryouts.', 'Gave his things to the youth league.');
        },
      },
      {
        label: 'Keep everything',
        detail: 'It all means something',
        resolve: (s) => {
          morale(s, 2);
          return ok('You buy shelves instead. Then you buy a bigger house for the shelves.');
        },
      },
    ],
  },
  {
    id: 'oneMove',
    stages: ['HS', 'NCAA', 'GL', 'EU', 'INT'],
    phase: 'off',
    oncePerCareer: true,
    weight: 0.7,
    cooldownSeasons: 1,
    title: 'One move',
    text: 'An old coach at summer camp watches you try ten different moves. "Pick one. Do it ten thousand times. Then you can have a second."',
    choices: [
      {
        label: 'Your best thing, sharper',
        detail: 'What you already do well, a bit better',
        resolve: (s) => {
          const k = best(s);
          bump(s, k, 0.6);
          return ok(`All summer, one thing: your ${ATTR_NAME[k]}. By August nobody can stop it, even when they know it is coming.`, 'Spent a summer on one move.');
        },
      },
      {
        label: 'A jump shot, one form',
        detail: 'A steadier shooter',
        resolve: (s) => {
          bump(s, 'SHT', 0.5);
          return ok('Same feet, same elbow, same release. Ten thousand times. Then ten thousand more.');
        },
      },
      {
        label: 'Ten moves anyway',
        detail: 'Fun to watch; the coach shrugs',
        resolve: (s) => {
          morale(s, 3);
          return ok('The mixtape is incredible. The coach goes home early.');
        },
      },
    ],
  },
];
