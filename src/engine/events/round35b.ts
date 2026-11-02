// Round 35's end-of-round turning points (the checklist, item 6). The round brought friends into
// the game: a draft class of up to eight Regular guy careers on one seed, and a friend's challenge
// (the same prospect, played again). Four of these come only in such a career: the class group
// chat after a big night, a class workout in July, the other version of you a friend already
// played, and a bet at the free-throw line. The engine never sees a friend's numbers (they live on
// the server), so every one of them works from this career alone. The fifth is for a veteran:
// shooting ages like the other ratings now, and the jumper starts to go. Small effects, like the
// rest of the book.

import { chance, clamp } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust } from '../career/common';
import { ATTR_MAX, TOUCH } from '../balance';
import type { EventChoice, EventDef } from './defs';
import { addTouch, touchOf } from '../player/touch';

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['NCAA', 'GL', 'EU', 'INT', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const wear = (s: GameState, v: number) => (s.player.wear = clamp((s.player.wear ?? 0) + v, 0, 100));
const ok = (outcome: string, log?: string) => ({ outcome, log });

/** A draft-class career: one of up to eight friends' Regular guy careers on one seed. */
const inClass = (s: GameState): boolean => s.mode === 'standard' && !!s.mp?.klass;
/** A career that answers a friend's challenge: the same prospect the friend has already played. */
const inChallenge = (s: GameState): boolean => s.mode === 'standard' && !!s.mp?.challenge;

/** His best scoring night this season, if he has had one worth a screenshot. */
function bigNight(s: GameState): { pts: number; opp: string } | null {
  let best: { pts: number; opp: string } | null = null;
  for (const g of s.season?.games ?? []) if (g.line && g.line.pts >= 15 && (!best || g.line.pts > best.pts)) best = { pts: g.line.pts, opp: g.opp };
  return best;
}

/** The odds he makes one free throw before practice, from his shooting and his touch (as when iced). */
const oneFt = (s: GameState): number => clamp(0.78 + (s.player.attrs.SHT - 72) * 0.004 + (touchOf(s.player) - TOUCH.mid) * 0.0035, 0.45, 0.96);
/** Nine or more of ten. */
const nineOfTen = (s: GameState): number => {
  const p = oneFt(s);
  return p ** 10 + 10 * p ** 9 * (1 - p);
};

const wagerChoices = (s: GameState): EventChoice[] => [
  {
    label: 'Take the bet: nine of ten, on video',
    detail: 'Your shooting and your touch decide it; the loser buys dinner',
    shownOdds: Math.round(nineOfTen(s) * 100) / 100,
    resolve: (t, rng) => {
      if (chance(rng, nineOfTen(t))) {
        morale(t, 3);
        rep(t, 1);
        addTouch(t.player, 1);
        return ok('Nine in a row, then one off the back iron to keep it honest. The video goes in the chat with no caption. None needed.', 'Won a free-throw bet with a friend, nine of ten on video.');
      }
      morale(t, -2);
      addTouch(t.player, 2);
      return ok('Seven of ten. You buy the dinner, and that night you shoot two hundred more on your own.', 'Lost a free-throw bet with a friend, and went back to the line.');
    },
  },
  {
    label: 'Shoot them underhand, for the laughs',
    detail: 'The fans love it; a little steadier at the line',
    resolve: (t) => {
      rep(t, 2);
      morale(t, 1);
      addTouch(t.player, 0.5);
      return ok('Granny style, all ten. You make eight. The video does better numbers than your last highlight.');
    },
  },
  {
    label: 'No bets during the season',
    detail: 'The coach approves',
    resolve: (t) => {
      trust(t, 2);
      return ok('"After the season," you text back. Your coach, reading over your shoulder, nods once.');
    },
  },
];

export const ROUND35B_EVENTS: EventDef[] = [
  {
    id: 'classChat',
    stages: ALL,
    phase: 'mid',
    when: (s) => inClass(s) && !!bigNight(s),
    weight: 1.2,
    cooldownSeasons: 3,
    title: 'The group chat',
    text: (s) => {
      const b = bigNight(s);
      return `${b ? `Your ${b.pts} points against ${b.opp}` : 'Your best night of the season'} is the screenshot in the draft class group chat. One seed, one draft year, a different career for every friend in it, and somebody already has a joke ready.`;
    },
    choices: [
      {
        label: 'Post the full box score',
        detail: 'The chat lights up; a little more fame',
        resolve: (s) => {
          rep(s, 1);
          morale(s, 3);
          return ok('You post the whole line, assists and all. Four people reply with the same fire emoji. One replies with your turnovers.', 'Posted his best night in the draft class group chat.');
        },
      },
      {
        label: 'Hype up a classmate instead',
        detail: 'A good friend; a good mood',
        resolve: (s) => {
          morale(s, 4);
          return ok('You find a friend’s quiet ten-rebound night and post that instead. He calls you at midnight to say thanks.');
        },
      },
      {
        label: 'Mute the chat until the season ends',
        detail: 'A little sharper on the floor; you miss the jokes',
        resolve: (s) => {
          bump(s, 'IQ', 0.4);
          morale(s, -1);
          return ok('Two hundred unread messages by March. You spend the time on film instead.');
        },
      },
    ],
  },
  {
    id: 'classWorkout',
    stages: PRO,
    phase: 'off',
    when: inClass,
    weight: 1.2,
    cooldownSeasons: 3,
    title: 'The class workout',
    text: 'Half your draft class rents a gym for a week in July. Same year, same draft, different roads since. By the second morning it is not a workout any more: it is a tournament.',
    choices: [
      {
        label: 'Go at them every rep',
        detail: 'Your focus skills sharpen; heavier legs',
        resolve: (s) => {
          for (const k of s.player.focus) bump(s, k, 0.4);
          wear(s, 1.5);
          return ok('You win the week’s one-on-one bracket. Your legs will tell you about it in October.', 'Won the one-on-one bracket at his draft class workout.');
        },
      },
      {
        label: 'Guard the best of them all week',
        detail: 'Better perimeter defense; a good week',
        resolve: (s) => {
          bump(s, 'PER', 0.6);
          morale(s, 1);
          return ok('You ask for the class’s best scorer every possession. By Friday he asks to switch.');
        },
      },
      {
        label: 'Go for the barbecue, skip the games',
        detail: 'Fresher legs and a good time',
        resolve: (s) => {
          wear(s, -1.5);
          morale(s, 3);
          return ok('You run the grill all week and hear every story from every road. Somebody films you flipping burgers. It is your best highlight of the summer.');
        },
      },
    ],
  },
  {
    id: 'otherYou',
    stages: ALL,
    phase: 'off',
    when: inChallenge,
    weight: 1.2,
    cooldownSeasons: 4,
    title: 'The other you',
    // a challenge made from a draft class career opens on draft night, not at a high school tryout
    text: (s) => `You are ${s.player.age}. Somewhere a friend has already played this exact career: ${s.start?.input.start === 'draft' ? 'the same college, the same draft night' : `the same ${s.player.highSchool || 'high school'}, the same first tryout`}, the same name on the back. You cannot see what his ${s.player.name.split(' ')[0]} did at ${s.player.age}. You know it is out there.`,
    choices: [
      {
        label: 'Play your own game',
        detail: 'Calmer; the coach likes the steady you',
        resolve: (s) => {
          morale(s, 3);
          trust(s, 1);
          return ok('His career is his. Yours starts at practice tomorrow, and you are early.', 'Stopped wondering what the other version of him did.');
        },
      },
      {
        label: 'Chase the line you picture him having',
        detail: 'Harder summers, better ratings; heavier legs',
        resolve: (s) => {
          for (const k of s.player.focus) bump(s, k, 0.4);
          wear(s, 2);
          morale(s, -1);
          return ok('You picture his numbers a little better than yours, every single morning. It gets you out of bed. It also gets you sore.');
        },
      },
      {
        label: 'Text him: how far did you get?',
        detail: 'He will not say; you study your own tape instead',
        resolve: (s) => {
          bump(s, 'IQ', 0.4);
          morale(s, -1);
          return ok('He sends back one winking face and nothing else. You watch your own season twice out of spite, and learn something.');
        },
      },
    ],
  },
  {
    id: 'friendWager',
    stages: ALL,
    phase: 'mid',
    when: (s) => (inClass(s) || inChallenge(s)) && !!s.season,
    weight: 0.9,
    cooldownSeasons: 4,
    title: 'A friendly wager',
    text: (s) => `${s.mp?.challenge ? 'The friend who sent you this challenge' : 'A friend from your draft class'} bets you dinner that you cannot make nine of ten free throws before practice. On video. No warm-up.`,
    choices: wagerChoices,
  },
  {
    id: 'jumperGoing',
    stages: ['GL', 'EU', 'INT', 'NBA'],
    phase: 'off',
    oncePerCareer: true,
    when: (s) => s.player.age >= 30 && s.player.attrs.SHT >= 45 && !s.player.programs.some((x) => x.id === 'release'),
    // a narrow window (a pro of 30 or more, once): weighted up like the other late-career ones
    weight: 2.5,
    cooldownSeasons: 1,
    title: 'The jumper',
    text: (s) => `You are ${s.player.age}, and the shot tracker says it before anyone else will: your jump shot comes out an inch flatter in fourth quarters than it did two years ago. The legs go first. The jumper follows them.`,
    choices: [
      {
        label: 'Rebuild the release: shorter, quicker',
        detail: 'A little worse this season, a little better each of the next three summers',
        resolve: (s) => {
          bump(s, 'SHT', -1);
          trust(s, 2);
          s.player.programs.push({ id: 'release', name: 'Release rebuild', seasonsLeft: 3, steps: [{ attrs: { SHT: 1 } }, { attrs: { SHT: 1 } }, { attrs: { SHT: 1 } }] });
          return ok('Less dip, less leg, the ball out a beat sooner. It feels like someone else’s shot for a month. Then it feels like yours again.', 'Rebuilt his jump shot for older legs.');
        },
      },
      {
        label: 'Build the legs under it',
        detail: 'Aging slows a little next season; a hard summer',
        resolve: (s) => {
          s.player.declineMultNext *= 0.95;
          morale(s, -1);
          return ok('Squats, sled pushes and hill sprints, all summer. By opening night the jumper has its legs back, for now.');
        },
      },
      {
        label: 'Shoot it the way you always have',
        detail: 'It still goes in. Mostly.',
        resolve: (s) => {
          morale(s, 2);
          return ok('Same shot, same routine, twenty years of it. If it is going, it is going your way.');
        },
      },
    ],
  },
];
