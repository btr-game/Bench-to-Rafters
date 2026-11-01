// Round 32's events (the end-of-round checklist, item 6: "new random events ... that touch the
// new systems"): the locker room, the head coach, the farewell tour, record chases, love and a
// family. Small effects, like the rest of the book.

import { chance, clamp } from '../rng';
import type { GameState, Stage } from '../types';
import { adjust, tally } from '../career/common';
import { TEMPER, changeCoach, coachOf, myTeam, type Coach } from '../career/coach';
import { isFarewellSeason } from '../career/farewell';
import { chasing } from '../career/records';
import type { EventDef } from './defs';

const PRO: Stage[] = ['NCAA', 'GL', 'EU', 'INT', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const chem = (s: GameState, v: number) => {
  if (s.season) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) + v) * 100) / 100;
};
const ok = (outcome: string, log?: string) => ({ outcome, log });
const coachName = (s: GameState) => {
  const t = myTeam(s);
  return t ? coachOf(t).name : 'the coach';
};
/** His coach, or (between teams, when an event asked earlier is answered) the last one. */
const coachNow = (s: GameState): Pick<Coach, 'name' | 'temper'> => {
  const t = myTeam(s);
  return t ? coachOf(t) : { name: 'Your coach', temper: 'players' };
};

export const ROUND32_EVENTS: EventDef[] = [
  {
    id: 'prankWar',
    stages: PRO,
    phase: 'mid',
    when: (s) => !!s.season && !!myTeam(s),
    weight: 0.7,
    cooldownSeasons: 3,
    title: 'Prank war',
    text: 'Somebody filled your sneakers with shaving cream. The whole locker room is waiting to see what you do.',
    choices: [
      {
        label: 'Get him back, bigger',
        detail: 'The room loves it; the coach might not',
        resolve: (s, rng) => {
          morale(s, 4);
          chem(s, 0.1);
          if (chance(rng, 0.35)) {
            trust(s, -3);
            return ok('Your revenge goes off in the middle of a film session. The room is crying laughing; the coach is not.', 'Won a locker room prank war, at a cost.');
          }
          return ok('Twelve hundred plastic cups of water across his locker. Legend status.', 'Won a locker room prank war.');
        },
      },
      {
        label: 'Laugh it off',
        detail: 'A little chemistry, nothing risked',
        resolve: (s) => {
          morale(s, 2);
          chem(s, 0.05);
          return ok('You wear the shaving-cream sneakers to warm-ups. Respect.');
        },
      },
      {
        label: 'Tell everyone to grow up',
        detail: 'The coach approves; the room goes quiet',
        resolve: (s) => {
          trust(s, 3);
          morale(s, -1);
          return ok(`${coachName(s)} nods at you from across the room. Nobody pranks you again.`);
        },
      },
    ],
  },
  {
    id: 'coachDinner',
    stages: PRO,
    phase: 'off',
    when: (s) => !!myTeam(s) && s.player.trust >= 55,
    weight: 0.6,
    cooldownSeasons: 3,
    title: 'Dinner at the coach’s house',
    text: (s) => {
      const c = coachNow(s);
      return `${c.name} (${TEMPER[c.temper].toLowerCase()}) has you over for dinner. His wife made too much food. He wants to talk.`;
    },
    // the choices are worked out again when he answers, when he may be between teams
    choices: (s) => {
      const c = coachNow(s);
      return [
        {
          label: 'Talk basketball all night',
          detail: c.temper === 'tactician' ? 'His whiteboard is in the kitchen' : 'Sets, schemes and old stories',
          resolve: (s) => {
            s.player.attrs.IQ = clamp(s.player.attrs.IQ + (c.temper === 'tactician' ? 0.6 : 0.3), 15, 99);
            trust(s, 3);
            return ok(`You leave at one in the morning with a notebook full of sets. Basketball IQ up, coach trust +3.`, `Dinner with ${c.name}: basketball all night.`);
          },
        },
        {
          label: 'Talk about life',
          detail: 'Family, home, what comes after',
          resolve: (s) => {
            morale(s, c.temper === 'players' ? 6 : 4);
            trust(s, 2);
            return ok('For once, nobody mentions basketball. You leave lighter than you came.', `Dinner with ${c.name}: about life.`);
          },
        },
      ];
    },
  },
  {
    id: 'coachPoached',
    stages: ['NBA'],
    phase: 'off',
    when: (s) => s.flags.coyYear === s.year && !!myTeam(s),
    weight: 2,
    cooldownSeasons: 2,
    title: 'They want your coach',
    text: (s) => `A big-market team wants ${coachName(s)}, Coach of the Year, and they are offering him the moon.`,
    choices: [
      {
        label: 'Ask him to stay',
        detail: 'Your word carries weight; it might be enough',
        resolve: (s, rng) => {
          const name = coachName(s);
          const t = myTeam(s);
          if (!t) return ok(`${name} takes the bigger job. You are between teams anyway.`);
          if (chance(rng, 0.45 + s.player.rep / 250)) {
            trust(s, 5);
            tally(s, 'coachKept');
            return ok(`${name} turns them down. "The kid asked me to stay." Coach trust +5.`, `Talked ${name} into staying.`);
          }
          const now = changeCoach(s, t);
          return ok(`${name} takes the money. ${now.name} (${TEMPER[now.temper].toLowerCase()}) replaces him; coach trust starts over.`, `${name} left for a bigger job.`);
        },
      },
      {
        label: 'Wish him well',
        detail: 'He goes; a new coach comes in',
        resolve: (s) => {
          const name = coachName(s);
          const t = myTeam(s);
          if (!t) return ok(`${name} takes the bigger job, with your blessing.`);
          const now = changeCoach(s, t, 55);
          morale(s, 1);
          return ok(`You shake his hand at the airport. ${now.name} (${TEMPER[now.temper].toLowerCase()}) takes over, and he has heard good things about you.`, `${name} left for a bigger job, with your blessing.`);
        },
      },
    ],
  },
  {
    id: 'recordCircus',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => chasing(s),
    weight: 2.5,
    cooldownSeasons: 1,
    title: 'The record watch',
    text: 'Camera crews follow you from the hotel to the arena. Every night the ticker counts down how many points you need.',
    choices: [
      {
        label: 'Play to the cameras',
        detail: 'Reputation now, a little pressure',
        resolve: (s) => {
          rep(s, 2);
          morale(s, -2);
          return ok('You give them a quote every night. The highlight shows love it; you sleep a little worse.');
        },
      },
      {
        label: 'Shut it all out',
        detail: 'Locker room first',
        resolve: (s) => {
          morale(s, 2);
          trust(s, 2);
          chem(s, 0.05);
          return ok('No interviews until it is done. Your teammates appreciate it.');
        },
      },
    ],
  },
  {
    id: 'farewellOvation',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => isFarewellSeason(s),
    weight: 3,
    cooldownSeasons: 1,
    title: 'A standing ovation, on the road',
    text: (s) => {
      const r = s.rivalry?.name;
      return r ? `In ${r}'s building, of all places, the whole arena stands for you before tip-off. He walks over to shake your hand.` : 'A rival arena stands and applauds before tip-off. Even their bench is clapping.';
    },
    choices: [
      {
        label: 'Take it in at center court',
        detail: 'A moment for the highlight reels',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 5);
          return ok('You tap your heart and point to every corner of the building. Then you drop thirty on them.', 'A standing ovation on the farewell tour.');
        },
      },
      {
        label: 'Wave, then get to work',
        detail: 'One more win is the best goodbye',
        resolve: (s) => {
          trust(s, 2);
          chem(s, 0.05);
          return ok('A wave, a nod to their bench, and you are back in the huddle. Your teammates notice.');
        },
      },
    ],
  },
  {
    id: 'farewellJersey',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => isFarewellSeason(s),
    weight: 2,
    cooldownSeasons: 1,
    title: 'A sign in the front row',
    text: 'A kid in the front row holds up a sign: "I learned to shoot watching you. Last time I can see you play."',
    choices: [
      {
        label: 'Give him your game jersey',
        detail: 'Off your back, after the buzzer',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 4);
          return ok('His face ends up on every sports show in the country. So does yours.', 'Gave a young fan his jersey on the farewell tour.');
        },
      },
      {
        label: 'Sign the sign',
        detail: 'A small thing that means a lot',
        resolve: (s) => {
          morale(s, 3);
          return ok('He holds it up again, signed, for the rest of the night.');
        },
      },
    ],
  },
  {
    id: 'anniversary',
    stages: PRO,
    phase: 'mid',
    when: (s) => !!s.flags.wed && s.year > s.flags.wed && !s.flags.gen2,
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Anniversary on a road trip',
    text: 'Your anniversary lands in the middle of a five-game road trip.',
    choices: [
      {
        label: 'Fly home between games',
        detail: 'Worth it; the coach won’t love it',
        resolve: (s, rng) => {
          morale(s, 7);
          if (chance(rng, 0.5)) trust(s, -3);
          return ok('Twelve hours at home, three hours of sleep, and the best night of the season.', 'Flew home for his anniversary mid-trip.');
        },
      },
      {
        label: 'Celebrate after the trip',
        detail: 'Flowers now, a weekend later',
        resolve: (s) => {
          morale(s, 3);
          return ok('Flowers on the doorstep and a long weekend after the trip. It works.');
        },
      },
    ],
  },
  {
    id: 'kidAtGame',
    stages: ['NBA', 'EU', 'GL', 'INT'],
    phase: 'mid',
    when: (s) => !!s.flags.child && s.year >= s.flags.child + 2 && !s.flags.gen2,
    weight: 1.2,
    cooldownSeasons: 4,
    oncePerCareer: true,
    title: 'Your kid’s first game',
    text: 'Your kid is in the stands for the first time, wearing your jersey down to the knees.',
    choices: [
      {
        label: 'Point to them after every bucket',
        detail: 'The cameras catch every one',
        resolve: (s) => {
          morale(s, 8);
          rep(s, 1);
          return ok('Every basket, a point at the stands. The clip goes everywhere.', 'His child came to a game for the first time.');
        },
      },
      {
        label: 'Take them on the court after the game',
        detail: 'One shot at the real hoop',
        resolve: (s) => {
          morale(s, 6);
          s.player.attrs.SHT = clamp(s.player.attrs.SHT + 0.2, 15, 99);
          return ok('Twenty tries, one make, and the loudest cheer of the night. You shoot a little better for a week.', 'His child took a shot on the arena floor.');
        },
      },
    ],
  },
  {
    id: 'mentorThanks',
    stages: PRO,
    phase: 'off',
    when: (s) => (s.flags.lkMentor ?? 0) >= 3,
    weight: 1,
    cooldownSeasons: 4,
    oncePerCareer: true,
    title: 'A thank-you on TV',
    text: 'The rookie you kept taking aside had a breakout year. On national TV he says he owes it to you.',
    choices: [
      {
        label: 'Call him that night',
        detail: 'Tell him he earned it',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 4);
          return ok('You talk for an hour. He calls you every summer after that.', 'A rookie he mentored thanked him on national TV.');
        },
      },
      {
        label: 'Send a text: "Now do it again"',
        detail: 'Old school',
        resolve: (s) => {
          rep(s, 1);
          trust(s, 2);
          return ok('He screenshots it and makes it his lock screen.');
        },
      },
    ],
  },
];
