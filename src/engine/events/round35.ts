// Round 35's events (owner: "add free throw percentage to the game, with events and other stuff that
// helps it. this is mostly for the 50-40-90 achievement"). Three turning points at the line, each
// a way to build free-throw touch (player/touch.ts): two hundred makes after a bad night, a summer
// clinic with a retired 90% shooter, and the timeout called to ice you. Small effects, like the
// rest of the book.

import { chance, clamp } from '../rng';
import type { GameState, Stage } from '../types';
import { adjust } from '../career/common';
import { ATTR_MAX, TOUCH } from '../balance';
import type { EventChoice, EventDef } from './defs';
import { addTouch, touchOf } from '../player/touch';

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['NCAA', 'GL', 'EU', 'INT', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const ok = (outcome: string, log?: string) => ({ outcome, log });

/** His last game this season with a trip to the line, if any. */
function lastLine(s: GameState): { ftm: number; fta: number } | null {
  const g = [...(s.season?.games ?? [])].reverse().find((x) => x.line && x.line.fta > 0);
  return g?.line ? { ftm: g.line.ftm, fta: g.line.fta } : null;
}

/** The odds he makes both when iced: his shooting and his touch, squared for two in a row. */
const icedOdds = (s: GameState): number => clamp(0.78 + (s.player.attrs.SHT - 72) * 0.004 + (touchOf(s.player) - TOUCH.mid) * 0.0035, 0.45, 0.96) ** 2;

const icedChoices = (s: GameState): EventChoice[] => [
  {
    label: 'Same breath, same routine',
    detail: 'Trust the routine: your shooting and your touch decide it',
    shownOdds: Math.round(icedOdds(s) * 100) / 100,
    resolve: (t, rng) => {
      if (chance(rng, icedOdds(t))) {
        rep(t, 2);
        morale(t, 3);
        addTouch(t.player, 1);
        return ok('Three dribbles, a spin, the breath. Swish. Same again. Their bench sits down before the ball does.', 'Made two free throws to win it after a timeout to ice him.');
      }
      morale(t, -3);
      addTouch(t.player, 3);
      return ok('The first one rattles out. All summer, you shoot that one free throw again, a thousand times.', 'Missed at the line with the game on it, and went back to the gym.');
    },
  },
  {
    label: 'Talk to the referee to stay loose',
    detail: 'Loose, not perfect; a little steadier at the line',
    resolve: (t) => {
      morale(t, 1);
      addTouch(t.player, 1.5);
      return ok('You ask him about his weekend. He tells you about his weekend. You split the pair and win in overtime.');
    },
  },
  {
    label: 'Stare down their bench',
    detail: 'The crowd loves it; your coach rolls his eyes',
    resolve: (t) => {
      rep(t, 2);
      trust(t, -1);
      return ok('You hold the stare for the whole timeout. The clip of it runs longer than the free throws.');
    },
  },
];

export const ROUND35_EVENTS: EventDef[] = [
  {
    id: 'ftAfterHours',
    stages: ALL,
    phase: 'mid',
    when: (s) => !!s.season && touchOf(s.player) < 90,
    weight: 0.6,
    cooldownSeasons: 3,
    title: 'Two hundred makes',
    text: (s) => {
      const l = lastLine(s);
      return `${l ? `${l.ftm} for ${l.fta} from the line last night` : 'A bad night at the line last night'}. The gym is empty, the lights are on a timer, and the ball rack is full.`;
    },
    choices: [
      {
        label: 'Stay until you make two hundred',
        detail: 'Steadier at the line; heavy legs tomorrow',
        resolve: (s) => {
          addTouch(s.player, 4);
          s.player.wear = Math.min(100, (s.player.wear ?? 0) + 1.5);
          morale(s, -1);
          return ok('The lights go off at one hundred and sixty. You finish the last forty in the dark, by the sound of the net.', 'Stayed after a bad night at the line for two hundred makes.');
        },
      },
      {
        label: 'Fifty makes, then home',
        detail: 'A little steadier, and some sleep',
        resolve: (s) => {
          addTouch(s.player, 2);
          morale(s, 1);
          return ok('Fifty makes, forty-four in a row at the end. Then dinner, then bed.');
        },
      },
      {
        label: 'Watch the misses on tape',
        detail: 'A little smarter; the line can wait',
        resolve: (s) => {
          s.player.attrs.IQ = clamp(s.player.attrs.IQ + 0.4, 15, ATTR_MAX);
          addTouch(s.player, 1);
          return ok('Every miss went left. Your elbow flies out when you are tired. Now you know.');
        },
      },
    ],
  },
  {
    id: 'ftClinic',
    stages: PRO,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => touchOf(s.player) < 85,
    weight: 0.6,
    cooldownSeasons: 1,
    title: 'The free-throw clinic',
    text: 'A retired guard who made nine in ten from the line for fifteen seasons runs a summer clinic. He watches you shoot three and stops you there.',
    choices: [
      {
        label: 'Learn his routine, breath by breath',
        detail: 'Much steadier at the line; he charges for the summer',
        resolve: (s) => {
          addTouch(s.player, 6);
          s.player.bank = Math.max(0, s.player.bank - (s.stage === 'NBA' ? 0.08 : 0.002));
          return ok('Feet on the nail, three dribbles, the breath, the same spin. By August you do it without thinking.', 'Learned a free-throw routine from a retired 90% shooter.');
        },
      },
      {
        label: 'Ask him about the pressure',
        detail: 'Calmer in big moments; a little steadier',
        resolve: (s) => {
          morale(s, 3);
          addTouch(s.player, 2.5);
          return ok('"Nobody is watching you. They are watching the ball." You write it on your shoe.');
        },
      },
      {
        label: 'A photo, a handshake, home',
        detail: 'A little more fame',
        resolve: (s) => {
          rep(s, 1);
          morale(s, 1);
          return ok('He signs your ball "keep your elbow in". Your feed loves it.');
        },
      },
    ],
  },
  {
    id: 'ftIced',
    stages: PRO,
    phase: 'mid',
    when: (s) => !!s.season,
    weight: 0.5,
    cooldownSeasons: 4,
    title: 'Iced',
    text: 'Two free throws to win it, and the other coach calls his last timeout to ice you. Forty seconds, a full arena, one rim.',
    choices: icedChoices,
  },
];
