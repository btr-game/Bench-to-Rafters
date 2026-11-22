// After round 42's turning points (the checklist, item 6): the Floor became a game of its own, with
// courts beyond the arena (a rooftop among them), the eras' rules (the sixties with no three-point
// line), a sixth man for every franchise, a face for every franchise, and each legend's hot spots.
// Five that bring them into a career:
// - a pickup run on a rooftop court downtown, wherever he plays as a pro;
// - a throwback night in sixties uniforms, with the old game's habits;
// - the coach floating the sixth man's job, with the clips of his franchise's own sixth man
//   (content/franchiseFives.ts FRANCHISE_SIXTH), for a starter on an NBA team;
// - a spot of his own on the shot chart (the Floor's hot spots);
// - his franchise's face (FRANCHISE_FACE) dropping by practice.
// Small effects, like the rest of the book.

import { clamp } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust, teamById } from '../career/common';
import { ATTR_MAX } from '../balance';
import { FRANCHISE_FACE, FRANCHISE_SIXTH } from '../../content/franchiseFives';
import type { EventDef } from './defs';

const NBA: Stage[] = ['NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const wear = (s: GameState, v: number) => (s.player.wear = clamp((s.player.wear ?? 0) + v, 0, 100));
const ok = (outcome: string, log?: string) => ({ outcome, log });

/** The windows of the turning points (each tested in tests/round42-content.test.ts). */
export const R42 = {
  face: { rep: 45 },
};

/** His NBA team's abbreviation, or null off an NBA team. */
const abbrOf = (s: GameState): string | null => (s.stage === 'NBA' ? (teamById(s.nba, s.teamId)?.abbr ?? null) : null);
/** His franchise's sixth man on the Floor, and its face. */
export const sixthOf = (s: GameState): string | null => FRANCHISE_SIXTH[abbrOf(s) ?? '']?.name ?? null;
export const faceOf = (s: GameState): string | null => FRANCHISE_FACE[abbrOf(s) ?? ''] ?? null;
/** A starter last season (or the team's key man), in the NBA. */
const starter = (s: GameState): boolean => {
  // (his last NBA season: a stint in the G League on assignment can come after it in the same year)
  const h = [...s.history].reverse().find((x) => x.level === 'NBA');
  return !!h && (h.role === 'starter' || h.role === 'key');
};

export const ROUND42_EVENTS: EventDef[] = [
  {
    id: 'rooftopRun',
    stages: PRO,
    phase: 'off',
    oncePerCareer: true,
    weight: 0.8,
    cooldownSeasons: 1,
    title: 'Pickup on the roof',
    text: 'A friend of a friend has the key to a court on top of a parking garage downtown: chain nets, city lights, and a run that starts at ten at night. Word gets around that you might show up.',
    choices: [
      {
        label: 'Play until they turn the lights off',
        detail: 'Quicker feet; tired legs',
        resolve: (s) => {
          bump(s, 'ATH', 0.3);
          wear(s, 2);
          morale(s, 2);
          return ok('You win eleven games in a row and lose the twelfth to a mail carrier with a set shot. The lights go off at two.', 'Ran pickup on a rooftop court until two in the morning.');
        },
      },
      {
        label: 'Pick the teams and coach the losers',
        detail: 'Your feel for the game; the city talks',
        resolve: (s) => {
          bump(s, 'IQ', 0.3);
          rep(s, 1);
          return ok('Your losers win three in a row. Somebody films the huddle, and by morning it has more views than your last game.');
        },
      },
      {
        label: 'Shoot alone after everyone leaves',
        detail: 'A steadier jumper',
        resolve: (s) => {
          bump(s, 'SHT', 0.3);
          morale(s, 1);
          return ok('Just you, the wind and the skyline. The wind teaches you more about arc than any coach has.');
        },
      },
    ],
  },
  {
    id: 'retroNight',
    stages: NBA,
    phase: 'mid',
    oncePerCareer: true,
    weight: 0.8,
    cooldownSeasons: 1,
    title: 'Throwback night',
    text: 'Tonight the team plays in sixties uniforms: short shorts, high socks, canvas-look shoes. The coach jokes that there is no three-point line either. Then he says he is only half joking.',
    choices: [
      {
        label: 'Live in the paint tonight',
        detail: 'Better at the rim; a sore body',
        resolve: (s) => {
          bump(s, 'FIN', 0.3);
          wear(s, 1);
          return ok('Eight shots, all from inside eight feet. An old-timer in the front row says that is how the game was meant to be played.');
        },
      },
      {
        label: 'Wear the short shorts with pride',
        detail: 'The crowd loves it',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 2);
          return ok('The photo of you in the tunnel is the most shared picture of the night. Your teammates beg the team never to do it again.', 'Wore the sixties throwback uniform with pride.');
        },
      },
      {
        label: 'Ask the team historian about the old days',
        detail: 'Your feel for the game',
        resolve: (s) => {
          bump(s, 'IQ', 0.3);
          trust(s, 1);
          return ok('He shows you a reel from 1965: no threes, a pace that never stops. You start seeing passes nobody makes anymore.');
        },
      },
    ],
  },
  {
    id: 'sixthManPitch',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => starter(s) && !!sixthOf(s),
    weight: 1,
    cooldownSeasons: 1,
    title: 'The sixth man',
    text: (s) => `The coach shows you old clips of ${sixthOf(s)} coming off this franchise’s bench and floats an idea: next season, you come off the bench too. "Starters start games," he says. "The sixth man finishes them."`,
    choices: [
      {
        label: 'Say yes, if it helps the team',
        detail: 'The coach trusts you; your pride takes a hit',
        resolve: (s) => {
          trust(s, 3);
          morale(s, -1);
          return ok('He nods for a long time. "We will see in camp," he says, but you can tell he has already written it down.', 'Told the coach he would come off the bench if it helped the team.');
        },
      },
      {
        label: 'Tell him you are a starter',
        detail: 'Your confidence; the coach’s patience',
        resolve: (s) => {
          morale(s, 2);
          trust(s, -2);
          return ok('"Then play like one," he says, and turns the clips off.');
        },
      },
      {
        label: 'Study the old clips first',
        detail: 'Your feel for the game',
        resolve: (s) => {
          bump(s, 'IQ', 0.3);
          return ok('Two hours of tape. He never wasted a dribble coming in cold. You see why the coach brought it up.');
        },
      },
    ],
  },
  {
    id: 'hotSpot',
    stages: PRO,
    phase: 'mid',
    oncePerCareer: true,
    weight: 0.8,
    cooldownSeasons: 1,
    title: 'A spot of your own',
    text: 'The analytics staff pins your shot chart on the locker room door. One patch of the floor, the left elbow, glows red. Your teammates have started looking for you there.',
    choices: [
      {
        label: 'Live on your spot',
        detail: 'Your confidence and your jumper',
        resolve: (s) => {
          bump(s, 'SHT', 0.2);
          morale(s, 2);
          return ok('Every time you touch the left elbow the bench stands up. Defenders start meeting you there, which leaves the lane open.');
        },
      },
      {
        label: 'Work on a second spot',
        detail: 'A wider jumper; long sessions',
        resolve: (s) => {
          bump(s, 'SHT', 0.2);
          bump(s, 'IQ', 0.2);
          wear(s, 1);
          return ok('Five hundred shots a day from the right corner. By the end of the month it is turning orange on the chart.');
        },
      },
      {
        label: 'Use it as a decoy',
        detail: 'Your passing; the locker room',
        resolve: (s) => {
          bump(s, 'PLY', 0.2);
          trust(s, 2);
          return ok('You catch at the elbow, two men jump at you, and you find the open teammate. The coach adds it to the playbook.', 'Turned his favourite spot on the floor into a decoy.');
        },
      },
    ],
  },
  {
    id: 'franchiseFace',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => !!faceOf(s) && faceOf(s) !== s.player.name && s.player.rep >= R42.face.rep,
    weight: 0.8,
    cooldownSeasons: 1,
    title: 'The face of the franchise',
    text: (s) => `${faceOf(s)} comes by the practice facility, and the whole building stops. Before he leaves, he finds you at the far basket and asks what you want your name to mean in this city.`,
    choices: [
      {
        label: 'Ask how he carried a whole city',
        detail: 'Your feel for the game; the room notices',
        resolve: (s) => {
          trust(s, 2);
          bump(s, 'IQ', 0.2);
          return ok('"Show up when it is boring," he says. "Anyone shows up when it is fun."');
        },
      },
      {
        label: 'Ask him to rebound for you',
        detail: 'A steadier jumper; a story to tell',
        resolve: (s) => {
          bump(s, 'SHT', 0.3);
          morale(s, 2);
          return ok('He rebounds a hundred shots in his suit and counts out loud. You make seventy-eight. He says he made eighty at your age.');
        },
      },
      {
        label: 'Get a picture for your family',
        detail: 'Your mood and your name',
        resolve: (s) => {
          morale(s, 2);
          rep(s, 1);
          return ok('Your mother has it framed before you get home.', `Met ${faceOf(s)}, the face of the franchise.`);
        },
      },
    ],
  },
];
