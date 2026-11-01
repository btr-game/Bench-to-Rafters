// Round 33's events (the end-of-round checklist, item 6): the round's achievements are about
// efficiency and the nights that go badly wrong, so the turning points are too: a cold night, the
// ball from a perfect one, a free-throw routine, the analytics report and a front office that
// wants to lose. Small effects, like the rest of the book.

import { clamp } from '../rng';
import type { AttrKey, GameState, SeasonRecord, Stage } from '../types';
import { adjust } from '../career/common';
import { ATTR_MAX } from '../balance';
import type { EventDef } from './defs';

const PRO: Stage[] = ['NCAA', 'GL', 'EU', 'INT', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const ok = (outcome: string, log?: string) => ({ outcome, log });
const pct = (a: number, b: number) => (b ? a / b : 0);
/** His last full season as a pro (20 games or more). */
const lastPro = (s: GameState): SeasonRecord | undefined => s.history.filter((h) => h.stage !== 'HS' && h.line.gp >= 20).at(-1);
const lastNba = (s: GameState): SeasonRecord | undefined => s.history.filter((h) => h.level === 'NBA' && h.line.gp >= 20).at(-1);

export const ROUND33_EVENTS: EventDef[] = [
  {
    id: 'coldNight',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => !!s.season,
    weight: 0.6,
    cooldownSeasons: 4,
    title: 'One for fourteen',
    text: 'Last night you went 1 for 14. Every highlight show ran the misses back to back, with circus music.',
    choices: [
      {
        label: 'Keep shooting',
        detail: 'Shooters shoot; morale holds, the coach is not sure',
        resolve: (s) => {
          morale(s, 2);
          trust(s, -2);
          return ok('Next game you take the first shot. And the second. The coach looks at the ceiling.', 'Kept shooting through a 1-for-14 night.');
        },
      },
      {
        label: 'Gym at five in the morning',
        detail: 'A little better as a shooter, a little more tired',
        resolve: (s) => {
          bump(s, 'SHT', 0.5);
          s.player.wear = Math.min(100, s.player.wear + 2);
          return ok('Five hundred makes before the sun comes up. The janitor starts bringing you coffee.', 'Answered a 1-for-14 night in the gym at dawn.');
        },
      },
      {
        label: 'Post the circus music yourself',
        detail: 'Laugh at yourself first: the fans love it',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 3);
          return ok('Your clip gets more views than theirs. Even the bricks look funny now.');
        },
      },
    ],
  },
  {
    id: 'gameBall',
    stages: ['NBA'],
    phase: 'off',
    oncePerCareer: true,
    when: (s) => (s.flags.gPerfFg ?? 0) >= 10,
    weight: 0.8,
    cooldownSeasons: 1,
    title: 'The game ball',
    text: (s) => `The ball from your perfect night${s.flags.gPerfFg ? `, ${s.flags.gPerfFg} for ${s.flags.gPerfFg} from the field,` : ''} is still in your locker. The Hall of Fame has asked for it.`,
    choices: [
      {
        label: 'Send it to the Hall',
        detail: 'It goes behind glass with your name on it',
        resolve: (s) => {
          rep(s, 3);
          return ok('A plaque goes up: the night nobody could stop you.', 'Gave the ball from a perfect night to the Hall of Fame.');
        },
      },
      {
        label: 'Keep it',
        detail: 'Some things are yours',
        resolve: (s) => {
          morale(s, 4);
          return ok('It sits on your nightstand. Some nights you just look at it.');
        },
      },
      {
        label: 'Auction it for charity',
        detail: 'A good cause, and a good story',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 2);
          trust(s, 1);
          return ok('It goes for a small fortune. A youth gym gets new floors and your name over the door.', 'Auctioned the ball from a perfect night for charity.');
        },
      },
    ],
  },
  {
    id: 'ftRoutine',
    stages: PRO,
    phase: 'off',
    when: (s) => {
      const h = lastPro(s);
      return !!h && h.line.fta >= 2 * h.line.gp && pct(h.line.ftm, h.line.fta) < 0.7;
    },
    weight: 0.7,
    cooldownSeasons: 4,
    title: 'Free throws',
    text: (s) => {
      const h = lastPro(s);
      return `${h ? `${Math.round(100 * pct(h.line.ftm, h.line.fta))}% from the line last season` : 'Your free throws are clanking'}. A retired shooter who never missed calls with an offer: he will rebuild your routine. Underhand.`;
    },
    choices: [
      {
        label: 'Go underhand',
        detail: 'It works; the crowds will laugh',
        resolve: (s) => {
          bump(s, 'SHT', 1);
          rep(s, -2);
          return ok('Granny style. The first road crowd howls; then you make twelve in a row.', 'Switched to underhand free throws.');
        },
      },
      {
        label: 'Rebuild it the usual way',
        detail: 'A slower fix, and he charges for it',
        resolve: (s) => {
          bump(s, 'SHT', 0.5);
          s.player.bank = Math.max(0, s.player.bank - (s.stage === 'NBA' ? 0.05 : 0.002));
          return ok('Same breath, same dribbles, same spin, every time. It starts to feel like yours.', 'Rebuilt his free-throw routine.');
        },
      },
      {
        label: 'Leave it alone',
        detail: 'Overthinking is worse',
        resolve: (s) => {
          morale(s, 1);
          return ok('You decide the next one is going in. Mostly, it does.');
        },
      },
    ],
  },
  {
    id: 'shotDiet',
    stages: ['NBA'],
    phase: 'off',
    when: (s) => {
      const h = lastNba(s);
      return !!h && h.line.fga >= 10 * h.line.gp && pct(h.line.fgm, h.line.fga) < 0.45;
    },
    weight: 0.7,
    cooldownSeasons: 4,
    title: 'The shot chart',
    text: (s) => {
      const h = lastNba(s);
      return `The analytics staff sends a forty-page report on your ${h ? `${Math.round(100 * pct(h.line.fgm, h.line.fga))}% ` : ''}shooting from the field. Page one: a lot of red from just inside the three-point line.`;
    },
    choices: [
      {
        label: 'Cut the long twos',
        detail: 'Smarter shots; it will feel strange for a while',
        resolve: (s) => {
          bump(s, 'IQ', 1);
          morale(s, -1);
          return ok('Step back for three or attack the rim. Nothing in between. Your shot chart turns green.', 'Changed his shot selection after an analytics report.');
        },
      },
      {
        label: 'Shoot your shots',
        detail: 'You know your game; the staff does not love it',
        resolve: (s) => {
          morale(s, 2);
          trust(s, -2);
          return ok('You file the report under "later". The coaches notice.');
        },
      },
      {
        label: 'Ask for the one-page version',
        detail: 'A little of both',
        resolve: (s) => {
          bump(s, 'IQ', 0.5);
          return ok('Three bullet points on a sticky note in your locker. You read them before every game.');
        },
      },
    ],
  },
  {
    id: 'tankJob',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => {
      const h = lastNba(s);
      return !!s.season && !!h && h.w <= 25;
    },
    weight: 0.6,
    cooldownSeasons: 3,
    title: 'Rest that knee',
    text: 'The front office wants a top pick. Somebody suggests your knee is sore, and that you sit out the last month to rest it.',
    choices: [
      {
        label: 'Sit, and rest',
        detail: 'A fresher body; the fans will not love it',
        resolve: (s) => {
          s.player.wear = Math.max(0, s.player.wear - 4);
          trust(s, 3);
          morale(s, -3);
          return ok('Courtside in a nice jacket for a month. Your knee, which was fine, feels great.', 'Sat out the end of a tanking season.');
        },
      },
      {
        label: 'Play every game',
        detail: 'The fans love it; the front office does not',
        resolve: (s) => {
          morale(s, 2);
          rep(s, 2);
          trust(s, -3);
          return ok('You play every minute they give you and win three games nobody wanted won.', 'Refused to sit out a tanking season.');
        },
      },
      {
        label: 'Say it in public',
        detail: 'Big for your name, bad with the team',
        resolve: (s) => {
          rep(s, 4);
          trust(s, -6);
          return ok('"I am not hurt." Three words on every sports page. The general manager stops returning calls.', 'Called out his team for tanking.');
        },
      },
    ],
  },
];
