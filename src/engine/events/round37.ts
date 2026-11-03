// Round 37's turning points (the checklist, item 6). The round put a career's tabs on a pixel
// street (the town: the gym, the arena, his home, the agent's office, the hall, the arcade) and
// gave every NBA arena a build of its own beside its city's landmark; round 36 had added aging that
// diverges and two rare career changers (the next step, the career-altering injury). Nine that
// bring them into a career:
// - the city names the street outside the arena after him (a green sign on the street's lamp post);
// - an artist paints him on the practice facility's wall (the mural shows on the street);
// - his hometown's rec center takes his name;
// - the arena's naming rights are sold, and the sponsor wants him under the new letters;
// - another agent waiting in the lobby of his agent's office;
// - moving day: a house with a yard and an old hoop over the driveway (the hoop shows on the street);
// - the neighbour at midnight, for a player with a hoop at home;
// - the first reporter to ask about the knee, after the career-altering injury;
// - a summer with the trainer who rebuilt a legend's game at thirty-one, late in a career.
// What a city puts up is kept as that city (career/street.ts cityMark), so it stands on that city's
// street only. Small effects, like the rest of the book.

import { clamp } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust, teamById } from '../career/common';
import { ATTR_MAX } from '../balance';
import { championships } from '../awards/legacy';
import { HOUSE_BANK, cityMark, hoopHome } from '../career/street';
import { NBA_TEAMS } from '../../content/teams';
import type { EventDef } from './defs';

const NBA: Stage[] = ['NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const wear = (s: GameState, v: number) => (s.player.wear = clamp((s.player.wear ?? 0) + v, 0, 100));
const spend = (s: GameState, m: number) => (s.player.bank = Math.max(0, s.player.bank - m));
const earn = (s: GameState, m: number) => {
  s.player.bank += m;
  s.player.earnings += m;
};
const ok = (outcome: string, log?: string) => ({ outcome, log });

/** His NBA team now, by name, and its city. */
const teamName = (s: GameState): string => teamById(s.nba, s.teamId)?.name ?? 'team';
const cityOf = (s: GameState): string => NBA_TEAMS.find((t) => t.abbr === s.teamId)?.city ?? 'the city';
const seasonsHere = (s: GameState): number => (s.teamId ? s.teamSeasons[s.teamId] ?? 0 : 0);
/** The street that takes his name: his last name, and Way. */
export const streetOf = (s: GameState): string => `${s.player.name.split(' ').pop() ?? 'Hoops'} Way`;
/** His hometown's first part: "Akron, OH" is Akron. */
const homeOf = (s: GameState): string => s.player.hometown.split(',')[0].trim() || 'your hometown';

/** The windows of the round's turning points (each tested in tests/round37-events.test.ts). */
export const R37 = {
  street: { seasons: 4, rep: 70 },
  mural: { seasons: 2, rep: 65 },
  gym: { age: 26, rep: 60 },
  rights: { seasons: 3, rep: 72, pay: 0.4 },
  poach: { rep: 50, ages: [23, 32] as [number, number] },
  move: { age: 29 },
  knee: { within: 3 },
  summer: { ages: [29, 33] as [number, number] },
};

/** A long stay and a big name, or a title won here: a city names a street for that. */
export function streetFits(s: GameState): boolean {
  if (s.stage !== 'NBA' || !cityMark(s) || seasonsHere(s) < R37.street.seasons) return false;
  const titlesHere = championships(s).filter((c) => c.nba && c.teamName === teamName(s)).length;
  return s.player.rep >= R37.street.rep || titlesHere > 0;
}

export const ROUND37_EVENTS: EventDef[] = [
  {
    id: 'streetName',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: streetFits,
    weight: 1.2,
    cooldownSeasons: 1,
    title: 'A street with your name',
    text: (s) => `The ${cityOf(s)} city council votes nine to nothing: the block outside the arena is ${streetOf(s)} from now on. A green sign, a ribbon across the corner, and the mayor holding a very large pair of scissors.`,
    choices: [
      {
        label: 'Cut the ribbon yourself',
        detail: 'The whole block comes out for it',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 3);
          s.flags.streetName = cityMark(s);
          return ok('It takes two tries. The sign goes up a little crooked; the city says it will fix it, and you ask it not to.', `${streetOf(s)}: ${cityOf(s)} named the street outside the arena after him.`);
        },
      },
      {
        label: 'Ask for a court on the corner too',
        detail: 'It costs a little; the kids on the block love it',
        resolve: (s) => {
          spend(s, 0.1);
          rep(s, 2);
          trust(s, 1);
          s.flags.streetName = cityMark(s);
          return ok(`Two hoops and fresh paint on the corner of ${streetOf(s)}. By the weekend there is a line for next game.`, `${streetOf(s)}: ${cityOf(s)} named the street outside the arena after him, and he put a court on its corner.`);
        },
      },
      {
        label: 'Ask them to name it for the usher at gate 4',
        detail: 'Forty years at the same door',
        resolve: (s) => {
          trust(s, 2);
          morale(s, 2);
          return ok('Mr. Delgado cries at the unveiling, and so do you. He still holds the door for you every home game.');
        },
      },
    ],
  },
  {
    id: 'mural',
    stages: NBA,
    phase: 'mid',
    oncePerCareer: true,
    when: (s) => !!cityMark(s) && seasonsHere(s) >= R37.mural.seasons && s.player.rep >= R37.mural.rep,
    weight: 0.9,
    cooldownSeasons: 1,
    title: 'The mural',
    text: (s) => `An artist from ${cityOf(s)} is painting you three stories tall on the wall of the practice facility: number ${s.player.number}, rising for a jumper, in ${teamName(s)} colours. She asks if you would come by before practice and sign the corner.`,
    choices: [
      {
        label: 'Sign the corner, and pick up a brush',
        detail: 'A good morning; the fans find out fast',
        resolve: (s) => {
          morale(s, 3);
          rep(s, 1);
          s.flags.mural = cityMark(s);
          return ok('You paint one shoelace, badly. She leaves it in.', `Signed the corner of his mural on the practice facility in ${cityOf(s)}.`);
        },
      },
      {
        label: 'Ask her to paint the rec center kids beside you',
        detail: 'A little more famous, and a lot more liked',
        resolve: (s) => {
          rep(s, 2);
          trust(s, 1);
          s.flags.mural = cityMark(s);
          return ok('Twelve kids from the rec center, all mid-jumper, all a little higher than you. They point it out every time they walk past.', `His mural went up on the practice facility in ${cityOf(s)}, with the rec center's kids beside him.`);
        },
      },
      {
        label: 'Ask her to paint the whole team instead',
        detail: 'The locker room notices',
        resolve: (s) => {
          trust(s, 3);
          morale(s, 1);
          return ok('Fifteen players on one wall. You are fourth from the left, and you like it there.');
        },
      },
    ],
  },
  {
    id: 'gymRenamed',
    stages: PRO,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => s.player.age >= R37.gym.age && s.player.rep >= R37.gym.rep,
    weight: 0.8,
    cooldownSeasons: 1,
    title: 'Your name over the door',
    text: (s) => `Back in ${homeOf(s)}, the rec center where you learned the game is getting a new roof and a new name: yours. The sign is already painted. They would like you there when the sheet comes off.`,
    choices: [
      {
        label: 'Fly home for the unveiling',
        detail: 'A long weekend; a good one',
        resolve: (s) => {
          morale(s, 4);
          rep(s, 1);
          wear(s, 1);
          s.flags.gymNamed = s.year;
          return ok('The sheet sticks on one corner. Every kid in the gym helps pull. Then they all want to play you one-on-one.', `His name went up over the door of the rec center in ${homeOf(s)}.`);
        },
      },
      {
        label: 'Pay for new hoops while they are at it',
        detail: 'It costs a little; the town remembers',
        resolve: (s) => {
          spend(s, s.stage === 'NBA' ? 0.15 : 0.004);
          rep(s, 2);
          morale(s, 2);
          s.flags.gymNamed = s.year;
          return ok('Glass backboards and nets that swish. The old rims go up in the lobby, under your name.', `His name went up over the door of the rec center in ${homeOf(s)}, over new hoops he paid for.`);
        },
      },
      {
        label: 'Ask them to name it for the man who ran it',
        detail: 'He kept the lights on for thirty years',
        resolve: (s) => {
          trust(s, 2);
          morale(s, 2);
          return ok('Mr. Reyes gets the door. You get the scoreboard. He says that is the right way round.');
        },
      },
    ],
  },
  {
    id: 'namingRights',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => seasonsHere(s) >= R37.rights.seasons && s.player.rep >= R37.rights.rep,
    weight: 0.8,
    cooldownSeasons: 1,
    title: 'The naming rights',
    text: (s) => `The ${teamName(s)} have sold the arena's naming rights to a phone company. The new letters go up in August, and its ad agency wants the photo: you, under the sign, holding their phone, for a fee they will not say out loud.`,
    choices: [
      {
        label: 'Take the money and smile',
        detail: 'A good fee; some fans grumble',
        resolve: (s) => {
          earn(s, R37.rights.pay);
          rep(s, 1);
          trust(s, -1);
          return ok('The photo is on every bus in the city by September. Your mother buys the phone.', `Stood under the new name on the ${teamName(s)} arena for the company that bought it.`);
        },
      },
      {
        label: 'Only if the old name stays on the court',
        detail: 'The fans love it',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 1);
          trust(s, 1);
          return ok('The company agrees: the old name stays painted at center court. The season-ticket holders give you a standing ovation in October.');
        },
      },
      {
        label: 'Pass: the building belongs to the fans',
        detail: 'The locker room nods',
        resolve: (s) => {
          trust(s, 2);
          rep(s, 1);
          return ok('Somebody else holds the phone in the photo. Nobody remembers who.');
        },
      },
    ],
  },
  {
    id: 'agentPoach',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => !!s.contract && !s.flags.powerAgent && s.player.rep >= R37.poach.rep && s.player.age >= R37.poach.ages[0] && s.player.age <= R37.poach.ages[1],
    weight: 0.8,
    cooldownSeasons: 1,
    title: 'The other agent',
    text: 'Someone is waiting in the lobby of your agent’s office: a younger agent in a better suit, a folder with your name on it, and a number for next summer bigger than any your agent has said out loud.',
    choices: [
      {
        label: 'Stay with the agent who signed you first',
        detail: 'Loyalty; he hears about it by lunch',
        resolve: (s) => {
          trust(s, 2);
          morale(s, 2);
          return ok('You hand the folder back unopened. Your agent sends a fruit basket the size of a center.', 'Turned away an agent who came poaching, and stayed with his own.');
        },
      },
      {
        label: 'Hear him out over coffee',
        detail: 'Nothing signed; a few stories in the papers',
        resolve: (s) => {
          rep(s, 1);
          morale(s, 1);
          trust(s, -1);
          return ok('He talks for an hour. You keep the folder. Your agent finds out before the coffee is cold.');
        },
      },
      {
        label: 'Sign with him',
        detail: 'A new office; awkward at first',
        resolve: (s) => {
          rep(s, 2);
          morale(s, -1);
          trust(s, -1);
          return ok('New office, new elevator, new view. You miss the old one’s bad coffee.', 'Left his agent for a younger one with a bigger promise.');
        },
      },
    ],
  },
  {
    id: 'movingHouse',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => s.player.bank >= HOUSE_BANK.house && s.player.bank < HOUSE_BANK.mansion && s.player.age <= R37.move.age && !hoopHome(s),
    weight: 0.8,
    cooldownSeasons: 1,
    title: 'Moving day',
    text: 'The lease on the apartment is up. Your realtor has three listings and a favourite: a house on a quiet street, a yard, a two-car garage, and an old hoop over the driveway that still has its net.',
    choices: [
      {
        label: 'Take the house with the hoop',
        detail: 'Moving day; the hoop comes with it',
        resolve: (s) => {
          spend(s, 0.3);
          morale(s, 3);
          s.flags.yardHoop = s.year;
          return ok('The first box you unpack is a ball. The second is another ball.', 'Bought a house with a hoop over the driveway.');
        },
      },
      {
        label: 'Stay in the apartment and save',
        detail: 'Teammates tease you',
        resolve: (s) => {
          trust(s, 1);
          morale(s, 1);
          return ok('Your teammates call you cheap. Your financial advisor calls you his favourite client.');
        },
      },
      {
        label: 'Buy your parents the house instead',
        detail: 'It costs a little more; worth it',
        resolve: (s) => {
          spend(s, 0.5);
          morale(s, 4);
          return ok('Your father shoots on the old hoop every evening. He says the rim is soft. It is not.');
        },
      },
    ],
  },
  {
    id: 'midnightCourt',
    stages: PRO,
    phase: 'mid',
    oncePerCareer: true,
    when: hoopHome,
    weight: 0.9,
    cooldownSeasons: 1,
    title: 'The neighbour at midnight',
    text: 'Midnight, and the ball is still bouncing on your court at home. The porch light next door comes on. Your neighbour walks over in his slippers, looks up at the rim, and asks if he can take one shot.',
    choices: [
      {
        label: 'Hand him the ball: a game of HORSE',
        detail: 'A good night; nobody sleeps much',
        resolve: (s) => {
          morale(s, 3);
          trust(s, 1);
          return ok('He banks in a hook shot from the flower bed and you never recover. H, O, R, S, E.', 'Lost a midnight game of HORSE on his own court to the neighbour.');
        },
      },
      {
        label: 'Shoot until the hundredth make',
        detail: 'A sharper stroke; tired legs',
        resolve: (s) => {
          bump(s, 'SHT', 0.3);
          wear(s, 1);
          morale(s, -1);
          return ok('The neighbour rebounds the last forty. He goes home at one with a sore back and your old shoes.');
        },
      },
      {
        label: 'Call it a night',
        detail: 'Fresh legs in the morning',
        resolve: (s) => {
          wear(s, -2);
          morale(s, 1);
          return ok('You turn off the lights. Ten minutes later his come on: he is shooting on your court.');
        },
      },
    ],
  },
  {
    id: 'kneeQuestion',
    stages: PRO,
    phase: 'mid',
    oncePerCareer: true,
    when: (s) => !!s.flags.careerInjury && !s.player.injury && s.year > s.flags.careerInjury && s.year - s.flags.careerInjury <= R37.knee.within,
    // a narrow window (the first seasons back from a rare injury): weighted up well past the rest
    weight: 4,
    cooldownSeasons: 1,
    title: 'The knee',
    text: 'First week back. Before the coach can say a word, a reporter in the second row asks it: "How is the knee?" Every camera in the room turns to the brace.',
    choices: [
      {
        label: 'Tell the truth: some mornings it talks back',
        detail: 'The fans like the honesty',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 1);
          return ok('"Some mornings it talks back. I listen, then I go to work." The quote runs on the front page.', 'Told the truth about the knee in his first week back.');
        },
      },
      {
        label: 'Knock twice on the table: it is fine',
        detail: 'Confidence; the room laughs',
        resolve: (s) => {
          morale(s, 2);
          trust(s, 1);
          return ok('Two knocks on the table, a grin, next question. The knee is not asked about again for a month.');
        },
      },
      {
        label: 'Answer with the game plan instead',
        detail: 'All business; the coach approves',
        resolve: (s) => {
          trust(s, 2);
          rep(s, -1);
          return ok('Three minutes on pick-and-roll coverage. The reporter stops writing after one.');
        },
      },
    ],
  },
  {
    id: 'nextSummer',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => !s.flags.nextStep && s.player.age >= R37.summer.ages[0] && s.player.age <= R37.summer.ages[1],
    weight: 0.7,
    cooldownSeasons: 1,
    title: 'The summer of work',
    text: 'A trainer who rebuilt a Hall of Famer’s game at thirty-one has one opening this summer: the track at five, footwork until noon, film all afternoon. "Most players are who they are by now," he says. "Most."',
    choices: [
      {
        label: 'Take the whole summer',
        detail: 'Aging slows a little next season; a long summer',
        resolve: (s) => {
          s.player.declineMultNext *= 0.97;
          bump(s, 'IQ', 0.4);
          wear(s, 1);
          s.flags.summerWork = s.year;
          return ok('By August you can do the footwork in your sleep. You know, because you do: the neighbours hear you counting steps.', `Spent the summer at ${s.player.age} rebuilding his game with the trainer who rebuilt a legend’s.`);
        },
      },
      {
        label: 'Take his footwork drills home',
        detail: 'A little better finishing',
        resolve: (s) => {
          bump(s, 'FIN', 0.3);
          morale(s, 1);
          return ok('Three drills on a piece of paper, taped to the garage wall. You do them every morning anyway.');
        },
      },
      {
        label: 'Rest: the legs need it more',
        detail: 'Fresher in the fall',
        resolve: (s) => {
          wear(s, -3);
          morale(s, 1);
          return ok('A summer on the porch. In October your legs feel twenty-five. Your jump shot feels its age.');
        },
      },
    ],
  },
];
