// Turning-point events (§11). Events are data; state stores only the id.
// Phase 1–2 ships a starter set; the full list of 30 lands in Phase 3.

import { ATTR_MAX, ATTRS, MAX_FOCUS_CHANGES } from '../balance';
import { chance, clamp, int, range, type Rng } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust } from '../career/common';
import { NAMES } from '../../content/strings';
import { pathOf } from '../career/origin';

export interface EventChoice {
  label: string;
  detail?: string;
  shownOdds?: number;
  resolve: (s: GameState, rng: Rng) => { outcome: string; log?: string };
}

export interface EventDef {
  id: string;
  stages: Stage[];
  phase: 'mid' | 'off' | 'both';
  when?: (s: GameState) => boolean;
  weight: number;
  cooldownSeasons: number;
  oncePerCareer?: boolean;
  title: string;
  text: string | ((s: GameState) => string);
  choices: EventChoice[] | ((s: GameState) => EventChoice[]);
}

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['NCAA', 'GL', 'EU', 'INT', 'NBA'];

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));

export const EVENTS: EventDef[] = [
  {
    id: 'corner3',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.range < 60,
    weight: 1,
    cooldownSeasons: 4,
    title: 'Add a corner three',
    text: 'A shooting coach thinks you can stretch your range to the corners. Two summers of work.',
    choices: [
      {
        label: 'Start the 2-season range program',
        resolve: (s) => {
          s.player.programs.push({ id: 'corner3', name: 'Corner-three program', seasonsLeft: 2, steps: [{ range: 6 }, { range: 7, attrs: { SHT: 1 } }] });
          return { outcome: 'You start taking 300 corner threes a day.', log: 'Started a two-season corner-three program.' };
        },
      },
      { label: 'Decline', resolve: () => ({ outcome: 'You stick with what works.' }) },
    ],
  },
  {
    id: 'offhand',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.offhand < 70,
    weight: 1,
    cooldownSeasons: 5,
    title: 'Develop your off hand',
    text: (s) => `Everyone in the gym knows you go ${s.player.hand === 'L' ? 'left' : 'right'}. A trainer offers a three-season program for your ${s.player.hand === 'L' ? 'right' : 'left'} hand.`,
    choices: [
      {
        label: 'Start the 3-season program',
        resolve: (s) => {
          s.player.programs.push({ id: 'offhand', name: 'Off-hand program', seasonsLeft: 3, steps: [{ offhand: 9 }, { offhand: 9 }, { offhand: 9, attrs: { FIN: 1 } }] });
          return { outcome: `${s.player.hand === 'L' ? 'Right' : 'Left'}-hand layups until your arm is numb.`, log: 'Committed to a three-season off-hand program.' };
        },
      },
      { label: 'Decline', resolve: () => ({ outcome: 'Maybe next year.' }) },
    ],
  },
  {
    id: 'formRebuild',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.age <= 27,
    weight: 0.7,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'Rebuild your shooting form',
    text: 'Your release is slow and low. A full rebuild will make you worse next season and better after.',
    choices: [
      {
        label: 'Rebuild the jumper',
        resolve: (s) => {
          bump(s, 'SHT', -2);
          s.player.programs.push({ id: 'form', name: 'Shooting-form rebuild', seasonsLeft: 2, steps: [{ range: 6, attrs: { SHT: 3 } }, { range: 6, attrs: { SHT: 3 } }] });
          return { outcome: 'Back to square one. It feels awful for now.', log: 'Tore down and rebuilt the jump shot.' };
        },
      },
      { label: 'Keep your form', resolve: () => ({ outcome: 'Ugly, but it goes in.' }) },
    ],
  },
  {
    id: 'focus',
    stages: ALL,
    phase: 'both',
    when: (s) => s.player.focusChanges < MAX_FOCUS_CHANGES,
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Change your focus',
    text: (s) => `Your coach wants to rethink your development. Current focus: ${s.player.focus.map((k) => NAMES.attr[k]).join(' and ')}.`,
    choices: (s) => {
      const cur = s.player.focus;
      const others = ATTRS.filter((k) => !cur.includes(k));
      const sorted = [...others].sort((a, b) => s.player.caps[b] - s.player.attrs[b] - (s.player.caps[a] - s.player.attrs[a]));
      const opts: EventChoice[] = sorted.slice(0, 2).map((k) => ({
        label: `Swap ${NAMES.attr[cur[1]]} for ${NAMES.attr[k]}`,
        resolve: (st: GameState) => {
          st.player.focus = [cur[0], k];
          st.player.focusChanges++;
          return { outcome: `New focus: ${NAMES.attr[cur[0]]} and ${NAMES.attr[k]}.`, log: `Changed focus to ${NAMES.attr[k]}.` };
        },
      }));
      opts.push({ label: 'Keep your focus', resolve: () => ({ outcome: 'You trust the plan.' }) });
      return opts;
    },
  },
  {
    id: 'captain',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.trust >= 60 && !s.player.captain && s.player.age >= 16,
    weight: 0.8,
    cooldownSeasons: 3,
    title: 'Captaincy offer',
    text: 'The coach wants you to wear the C.',
    choices: [
      {
        label: 'Accept',
        resolve: (s) => {
          s.player.captain = true;
          s.player.trust = adjust(s.player.trust, 8);
          s.player.rep = clamp(s.player.rep + 3, 0, 100);
          s.player.morale = adjust(s.player.morale, -3);
          return { outcome: 'Captain. Every loss is on you now.', log: 'Named team captain.' };
        },
      },
      { label: 'Decline', resolve: () => ({ outcome: 'You lead by example instead.' }) },
    ],
  },
  {
    id: 'party',
    stages: ['HS', 'NCAA'],
    phase: 'mid',
    weight: 1,
    cooldownSeasons: 2,
    title: 'Party the night before a game',
    text: 'The team is going out. Tip-off is tomorrow at noon.',
    choices: [
      {
        label: 'Go',
        resolve: (s, rng) => {
          s.player.morale = adjust(s.player.morale, 6);
          if (chance(rng, 0.3)) {
            s.player.trust = adjust(s.player.trust, -8);
            return { outcome: 'Coach heard about it. You came off the bench the next day.', log: 'Got caught partying before a game.' };
          }
          return { outcome: 'Great night. Nobody found out.' };
        },
      },
      {
        label: 'Stay in',
        resolve: (s) => {
          s.player.trust = adjust(s.player.trust, 2);
          return { outcome: 'Early night. You felt sharp.' };
        },
      },
    ],
  },
  {
    id: 'finals',
    stages: ['HS', 'NCAA'],
    phase: 'mid',
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Finals week',
    text: 'Exams collide with a road trip. Your eligibility is on the line.',
    choices: [
      {
        label: 'Study',
        resolve: (s) => {
          s.player.trust = adjust(s.player.trust, 2);
          return { outcome: 'Grades are fine. Coach appreciates it.' };
        },
      },
      {
        label: 'Wing it',
        detail: 'Risky',
        resolve: (s, rng) => {
          if (chance(rng, 0.25)) {
            if (s.season) s.season.ineligibleHalf = true;
            return { outcome: 'You failed a class. Ineligible for the rest of the regular season.', log: 'Ruled academically ineligible for half a season.' };
          }
          s.player.morale = adjust(s.player.morale, 3);
          return { outcome: 'Passed. Barely.' };
        },
      },
    ],
  },
  {
    id: 'aau',
    stages: ['HS'],
    phase: 'off',
    // AAU is an American circuit; other countries have their own showcases (career/culture.ts)
    when: (s) => s.hsYear <= 3 && pathOf(s) === 'us',
    weight: 1.6,
    cooldownSeasons: 1,
    title: 'AAU invite',
    text: 'A Nike EYBL program wants you for the spring circuit. Scouts will be there.',
    choices: [
      {
        label: 'Join the circuit',
        resolve: (s) => {
          s.player.rep = clamp(s.player.rep + 6, 0, 100);
          s.player.injuryMultNext *= 1.1;
          return { outcome: 'Three tournaments, four states. College coaches know your name now.', log: 'Played the AAU circuit.' };
        },
      },
      {
        label: 'Stay with the school group',
        resolve: (s) => {
          s.player.trust = adjust(s.player.trust, 4);
          bump(s, 'IQ', 0.5);
          return { outcome: 'Quiet spring of skill work.' };
        },
      },
    ],
  },
  {
    id: 'paper',
    stages: ['HS'],
    phase: 'mid',
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Local paper feature',
    text: 'The town paper wants a cover story.',
    choices: [
      {
        label: 'Do it',
        resolve: (s) => {
          s.player.rep = clamp(s.player.rep + 4, 0, 100);
          return { outcome: 'Front page. Your grandmother bought ten copies.' };
        },
      },
      {
        label: 'Keep a low profile',
        resolve: (s) => {
          s.player.trust = adjust(s.player.trust, 2);
          return { outcome: 'Head down, work on your game.' };
        },
      },
    ],
  },
  {
    id: 'nil',
    stages: ['NCAA'],
    phase: 'mid',
    weight: 1,
    cooldownSeasons: 1,
    title: 'NIL deal',
    text: (s) => `A local car dealership offers an NIL deal worth about $${Math.round(15 + s.player.rep * 2)}K.`,
    choices: [
      {
        label: 'Take it',
        resolve: (s) => {
          const m = (15 + s.player.rep * 2) / 1000;
          s.player.bank += m;
          s.player.earnings += m;
          s.player.morale = adjust(s.player.morale, 3);
          s.player.trust = adjust(s.player.trust, -2);
          return { outcome: 'You are on a billboard by the highway.', log: 'Signed an NIL deal.' };
        },
      },
      {
        label: 'Pass',
        resolve: (s) => {
          s.player.trust = adjust(s.player.trust, 2);
          return { outcome: 'Focus stays on the court.' };
        },
      },
    ],
  },
  {
    id: 'mentor',
    stages: PRO,
    phase: 'mid',
    when: (s) => s.player.age <= 25,
    weight: 0.9,
    cooldownSeasons: 3,
    title: 'Veteran mentor',
    text: 'A 34-year-old veteran offers to work with you at 6 a.m. every day.',
    choices: [
      {
        label: '6 a.m. sessions',
        resolve: (s) => {
          bump(s, 'IQ', 1.5);
          bump(s, 'PLY', 0.5);
          s.player.morale = adjust(s.player.morale, -2);
          return { outcome: 'You are exhausted, and you see the floor differently.', log: 'Took 6 a.m. sessions with a veteran mentor.' };
        },
      },
      { label: 'Pass', resolve: () => ({ outcome: 'You need the sleep.' }) },
    ],
  },
  {
    id: 'trash',
    stages: ALL,
    phase: 'mid',
    weight: 1,
    cooldownSeasons: 2,
    title: 'Rival trash talk',
    text: 'A rival says you are overrated. The quote is everywhere.',
    choices: [
      {
        label: 'Clap back',
        resolve: (s) => {
          s.player.rep = clamp(s.player.rep + 3, 0, 100);
          s.player.trust = adjust(s.player.trust, -3);
          return { outcome: 'The internet loved it. Your coach did not.' };
        },
      },
      { label: 'Ignore it', resolve: () => ({ outcome: 'No comment.' }) },
      {
        label: 'Use it as fuel',
        resolve: (s) => {
          if (s.season) s.season.fuel = true;
          s.player.morale = adjust(s.player.morale, 2);
          return { outcome: 'You printed the quote and taped it to your locker.' };
        },
      },
    ],
  },
  {
    id: 'viral',
    stages: ALL,
    phase: 'mid',
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Viral highlight',
    text: 'Your dunk from last night has 4 million views.',
    choices: [
      {
        label: 'Post everywhere',
        resolve: (s) => {
          s.player.rep = clamp(s.player.rep + 5, 0, 100);
          s.player.trust = adjust(s.player.trust, -2);
          return { outcome: 'Followers up 300%. Coach thinks you are distracted.' };
        },
      },
      {
        label: 'Stay humble',
        resolve: (s) => {
          s.player.trust = adjust(s.player.trust, 3);
          return { outcome: '"Just doing my job." Coach liked that.' };
        },
      },
    ],
  },
  {
    id: 'ankle',
    stages: ALL,
    phase: 'mid',
    when: (s) => !s.player.injury,
    weight: 0.9,
    cooldownSeasons: 2,
    title: 'Tweaked ankle',
    text: 'You rolled your ankle in practice. The trainer says it is your call.',
    choices: [
      {
        label: 'Play through it',
        detail: 'High risk',
        resolve: (s, rng) => {
          if (chance(rng, 0.35)) {
            s.player.injury = { key: 'minor', name: 'Sprained ankle', daysOut: int(rng, 14, 24) };
            return { outcome: 'It gave out in the second quarter. Out a few weeks.', log: 'Played through an ankle injury and made it worse.' };
          }
          s.player.trust = adjust(s.player.trust, 3);
          return { outcome: 'Taped up and played well. Tough.' };
        },
      },
      {
        label: 'Sit out',
        resolve: (s, rng) => {
          s.player.injury = { key: 'dtd', name: 'Sore ankle', daysOut: Math.round(range(rng, 3, 6)) };
          return { outcome: 'A couple of games on the bench in a hoodie.' };
        },
      },
    ],
  },
];
