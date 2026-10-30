// Round 21 turning points: the newer systems get their own moments. Weight (the combine, a
// growth spurt, coming back from an injury, a veteran's body, the team chef), wingspan, the
// hidden duo bond, the Spotlight and Team first plans, and the ring chaser's role.

import { ATTR_MAX } from '../balance';
import { chance, clamp, type Rng } from '../rng';
import type { AttrKey, GameState, HalfPlan, Stage } from '../types';
import { adjust, teamById } from '../career/common';
import { activeDuo, nudgeBonds } from '../career/duo';
import { addPounds, idealWeight, weightOf, weightUnits } from '../player/weight';
import type { EventDef } from './defs';

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const wear = (s: GameState, v: number) => (s.player.wear = clamp((s.player.wear ?? 0) + v, 0, 100));
const chem = (s: GameState, v: number) => {
  if (s.season) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) + v) * 10) / 10;
};
const ok = (outcome: string, log?: string) => ({ outcome, log });
const lbs = (s: GameState) => `${weightOf(s.player)} lb`;
const inches = (n: number) => `${Math.floor(n / 12)}'${n % 12}"`;

/** Is this plan part of his season so far (this half or one already played)? */
const onPlan = (s: GameState, k: HalfPlan): boolean =>
  !!s.season && (s.season.plan === k || s.season.plan2 === k || !!s.season.outcomes?.some((o) => o.plan === k || o.plan2 === k));

/** The teammate he recruited who is closest to becoming a duo (still on the team, not one yet). */
function sparkMate(s: GameState) {
  const t = teamById(s.nba, s.teamId);
  if (s.stage !== 'NBA' || !t) return null;
  return (s.bonds ?? []).filter((b) => b.formed === undefined && t.roster.some((x) => x.id === b.id)).sort((a, b) => b.bond - a.bond)[0] ?? null;
}

/** His duo partner's place on the roster, when he has a duo. */
function duoMate(s: GameState) {
  const d = activeDuo(s);
  const t = teamById(s.nba, s.teamId);
  return d && t ? { d, mate: t.roster.find((x) => x.id === d.id)! } : null;
}

export const ROUND21_EVENTS: EventDef[] = [
  {
    id: 'combineWeighIn',
    stages: ['NCAA', 'GL', 'EU', 'INT'],
    phase: 'off',
    when: (s) => s.player.age >= 19 && s.player.age <= 22,
    weight: 0.9,
    cooldownSeasons: 3,
    oncePerCareer: true,
    title: 'Measured at the combine',
    text: (s) => `Height ${inches(s.player.height)}, wingspan ${inches(s.player.wingspan)}, ${lbs(s)}. Every scout in the room writes it down, and the agility drills are next.`,
    choices: [
      {
        label: 'Show up a little heavier',
        detail: 'Look like a pro body. Slower in the drills.',
        resolve: (s) => {
          const light = weightUnits(s.player) < 0;
          addPounds(s.player, 6, 0.3);
          rep(s, light ? 2 : -1);
          return ok(light ? 'The scouts stop calling you skinny.' : 'One scout writes "soft" next to your name.');
        },
      },
      {
        label: 'Cut weight for the speed tests',
        detail: 'Risky: a big jump in the drills, or no gas left.',
        resolve: (s, rng: Rng) => {
          addPounds(s.player, -6, 0.2);
          if (chance(rng, 0.55)) {
            rep(s, 3);
            return ok('The fastest lane agility of your group. Your phone does not stop.', 'Starred in the combine drills.');
          }
          morale(s, -2);
          return ok('You are flat by the last drill, and the scouts notice.');
        },
      },
      {
        label: 'Come as you are',
        resolve: (s) => {
          morale(s, 1);
          return ok('No tricks. The numbers are the numbers.');
        },
      },
    ],
  },
  {
    id: 'growthSpurt',
    stages: ['HS'],
    phase: 'off',
    when: (s) => s.player.age <= 17 && weightUnits(s.player) <= 0.3,
    weight: 1,
    cooldownSeasons: 3,
    title: 'All elbows',
    text: (s) => `You grew again. At ${inches(s.player.height)} and ${lbs(s)} your body has not caught up with your bones, and the ball keeps hitting your knees.`,
    choices: [
      {
        label: 'Eat and lift to fill out',
        resolve: (s) => {
          addPounds(s.player, 8, 0.5);
          wear(s, 1);
          return ok('Protein shakes and a squat rack. The frame starts to fill in.');
        },
      },
      {
        label: 'Footwork and handles until it fits',
        resolve: (s) => {
          bump(s, 'PLY', 0.6);
          bump(s, 'ATH', 0.3);
          morale(s, -1);
          return ok('Ladder drills and two-ball dribbling. Still skinny, a lot less clumsy.');
        },
      },
    ],
  },
  {
    id: 'comebackLighter',
    stages: ALL,
    phase: 'mid',
    when: (s) => (s.player.injury?.daysOut ?? 0) >= 21 && weightUnits(s.player) >= 0,
    weight: 1.2,
    cooldownSeasons: 3,
    title: 'Coming back lighter',
    text: 'The physio has an idea while you rehab: ten pounds less is ten pounds your knee does not have to land on.',
    choices: [
      {
        label: 'Drop the weight',
        detail: 'Easier on the joints, less power inside.',
        resolve: (s) => {
          addPounds(s.player, -9, 0.3);
          s.player.injuryMultNext *= 0.92;
          morale(s, -1);
          return ok('Salads in the training room. You come back lighter and land softer.', 'Came back from injury lighter.');
        },
      },
      {
        label: 'Keep the strength',
        resolve: (s) => {
          s.player.injuryMultNext *= 1.05;
          trust(s, 1);
          return ok('The coach wants you as you were. Your knee is less sure.');
        },
      },
    ],
  },
  {
    id: 'veteranTrim',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.age >= 31,
    weight: 0.9,
    cooldownSeasons: 4,
    title: 'A veteran’s body',
    text: (s) => `${lbs(s)}, and your knees ask for a little less of you every morning.`,
    choices: [
      {
        label: 'Get lean to last longer',
        detail: 'Slows the aging, costs you on the glass.',
        resolve: (s) => {
          addPounds(s.player, -10, 0.5);
          s.player.declineMultNext *= 0.95;
          bump(s, 'REB', -0.4);
          return ok('You lose ten pounds and the morning stiffness with them.', 'Got lean to extend his career.');
        },
      },
      {
        label: 'Stay big for the paint',
        resolve: (s) => {
          s.player.declineMultNext *= 1.04;
          trust(s, 2);
          return ok('The coach needs your size in the playoffs. Your knees file a complaint.');
        },
      },
      {
        label: 'Yoga and pool work',
        resolve: (s) => {
          wear(s, -4);
          s.player.bank = Math.max(0, s.player.bank - 0.05);
          morale(s, 1);
          return ok('A private instructor and a lot of slow stretching. You feel younger.');
        },
      },
    ],
  },
  {
    id: 'teamChef',
    stages: PRO,
    phase: 'off',
    when: (s) => Math.abs(weightUnits(s.player)) >= 0.8,
    weight: 0.8,
    cooldownSeasons: 3,
    title: 'The team chef',
    text: (s) => `The new team chef reads your file: ${lbs(s)}, and the staff wants you nearer ${Math.round(idealWeight(s.player.height, s.player.age) / 5) * 5}. He has a menu for that.`,
    choices: [
      {
        label: 'Eat what he cooks',
        resolve: (s) => {
          const gap = idealWeight(s.player.height, s.player.age) - weightOf(s.player);
          addPounds(s.player, clamp(Math.round(gap * 0.6), -10, 10), 0.3);
          morale(s, -1);
          return ok('Measured plates, every meal. The scale moves the right way.');
        },
      },
      {
        label: 'Your own cooking',
        resolve: (s) => {
          addPounds(s.player, weightUnits(s.player) > 0 ? 2 : -2);
          morale(s, 2);
          return ok('Your grandmother’s recipes, as always. The chef is not offended. Much.');
        },
      },
    ],
  },
  {
    id: 'longArms',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.wingspan - s.player.height >= 4,
    weight: 0.8,
    cooldownSeasons: 5,
    title: 'Those arms',
    text: (s) => `A defensive coach measures you twice: your wingspan is ${s.player.wingspan - s.player.height} inches longer than you are tall. He has ideas.`,
    choices: [
      {
        label: 'Play the passing lanes',
        resolve: (s) => {
          bump(s, 'PER', 0.6);
          wear(s, 1);
          return ok('You learn to sag off and still get a hand on the pass.');
        },
      },
      {
        label: 'Contest everything at the rim',
        resolve: (s) => {
          bump(s, 'INT', 0.6);
          bump(s, 'REB', 0.3);
          return ok('Vertical, arms up, no fouls. The shots start to look worried.');
        },
      },
      {
        label: 'Fix the long-armed release',
        detail: 'Long arms flatten a jump shot.',
        resolve: (s) => {
          bump(s, 'SHT', 0.4);
          s.player.range = clamp(s.player.range + 2, 0, 99);
          return ok('A higher set point. The ball comes out with more arc.');
        },
      },
    ],
  },
  {
    id: 'duoShootaround',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => !!sparkMate(s),
    weight: 1,
    cooldownSeasons: 2,
    title: 'Late-night shootaround',
    text: (s) => `${sparkMate(s)?.name ?? 'A teammate'} texts you at 11 pm: the practice gym is open, and he has the keys.`,
    choices: [
      {
        label: 'Go every night',
        resolve: (s) => {
          const b = nudgeBonds(s, 12);
          wear(s, 2);
          bump(s, 'SHT', 0.3);
          chem(s, 0.2);
          return ok(`Rebound for each other until the lights go off. ${b ? `You and ${b.name} have your own shorthand now.` : ''}`.trim());
        },
      },
      {
        label: 'Sleep is a skill',
        resolve: (s) => {
          nudgeBonds(s, -3);
          wear(s, -2);
          return ok('You go to bed. He goes on his own.');
        },
      },
    ],
  },
  {
    id: 'duoLastShot',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => !!activeDuo(s),
    weight: 1.1,
    cooldownSeasons: 2,
    title: 'Who takes the last shot?',
    text: (s) => `Down one, eight seconds left. The play is drawn up for you, and ${activeDuo(s)?.name ?? 'your partner'} wants it too.`,
    choices: [
      {
        label: 'Take it yourself',
        detail: 'Risky.',
        resolve: (s, rng: Rng) => {
          if (chance(rng, 0.45 + s.player.attrs.SHT / 300)) {
            rep(s, 3);
            morale(s, 3);
            return ok('Pull-up, buzzer, ballgame. He is the first one to grab you.', 'Hit a game-winner.');
          }
          morale(s, -3);
          chem(s, -0.2);
          return ok('Front rim. He does not say anything, which says enough.');
        },
      },
      {
        label: 'Trust him with it',
        resolve: (s, rng: Rng) => {
          chem(s, 0.5);
          trust(s, 2);
          if (chance(rng, 0.5)) {
            morale(s, 2);
            return ok('You draw two defenders and hit him in the corner. Splash.');
          }
          morale(s, -1);
          return ok('Right pass, wrong result. The locker room liked the pass.');
        },
      },
    ],
  },
  {
    id: 'duoExtension',
    stages: ['NBA'],
    phase: 'off',
    when: (s) => (duoMate(s)?.mate.contractYears ?? 9) <= 1,
    weight: 1.5,
    cooldownSeasons: 2,
    title: 'Keep the duo together',
    text: (s) => `${duoMate(s)?.d.name ?? 'Your partner'} has one year left on his deal. ${duoMate(s)?.d.nick ?? 'The duo'} could end with it.`,
    choices: [
      {
        label: 'Lobby the front office for him',
        resolve: (s) => {
          const m = duoMate(s);
          if (m) m.mate.contractYears = Math.max(m.mate.contractYears, 3);
          trust(s, -3);
          morale(s, 2);
          return ok('You sit in the GM’s office until he gives in. Three more years.', 'Pushed the front office to extend his duo partner.');
        },
      },
      {
        label: 'Stay out of it',
        resolve: (s, rng: Rng) => {
          const m = duoMate(s);
          if (m && chance(rng, 0.5)) {
            m.mate.contractYears += 2;
            return ok('He signs on anyway. He was never leaving.');
          }
          morale(s, -2);
          return ok('The talks stall. Nobody knows yet whether he will be back.');
        },
      },
    ],
  },
  {
    id: 'spotlightGrumble',
    stages: ['NCAA', ...PRO],
    phase: 'mid',
    when: (s) => onPlan(s, 'spotlight'),
    weight: 1.3,
    cooldownSeasons: 2,
    title: 'Grumbling about shots',
    text: 'You are taking the big shots this season, and two teammates are counting them out loud.',
    choices: [
      {
        label: 'Keep shooting',
        detail: 'Your stage, their mood.',
        resolve: (s, rng: Rng) => {
          rep(s, 2);
          chem(s, -0.4);
          if (chance(rng, 0.4)) bump(s, 'SHT', 0.4);
          return ok('Somebody has to take them. You do.');
        },
      },
      {
        label: 'Spread it around',
        resolve: (s) => {
          chem(s, 0.4);
          bump(s, 'PLY', 0.3);
          morale(s, -1);
          return ok('A few more extra passes a night. The grumbling stops.');
        },
      },
    ],
  },
  {
    id: 'teamFirstNoticed',
    stages: ALL,
    phase: 'mid',
    when: (s) => onPlan(s, 'teamfirst') && s.player.trust < 85,
    weight: 1.2,
    cooldownSeasons: 2,
    title: 'The coach notices',
    text: 'The charges you take and the screens you set make the film session. The coach calls you into his office.',
    choices: [
      {
        label: 'Ask for a bigger role',
        detail: 'Risky.',
        resolve: (s, rng: Rng) => {
          if (chance(rng, 0.5)) {
            trust(s, 4);
            return ok('"I was going to offer it anyway." More minutes from tonight.');
          }
          trust(s, -2);
          return ok('"Not yet." He liked you better before you asked.');
        },
      },
      {
        label: 'Keep doing the little things',
        resolve: (s) => {
          chem(s, 0.3);
          bump(s, 'IQ', 0.3);
          trust(s, 1);
          return ok('Same as always. The team plays better with you on the floor.');
        },
      },
    ],
  },
  {
    id: 'chaserYoungStar',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => !!s.player.ringChaser,
    weight: 1.2,
    cooldownSeasons: 2,
    title: 'The kid asks for help',
    text: 'The team’s young star finds you after practice. He has the talent; he wants to know how you win in May.',
    choices: [
      {
        label: 'Take him under your wing',
        resolve: (s) => {
          chem(s, 0.5);
          bump(s, 'IQ', 0.3);
          morale(s, 2);
          return ok('Film at your place, every Monday. He starts making the right reads.', 'Mentored the young star.');
        },
      },
      {
        label: 'Focus on your own minutes',
        resolve: (s) => {
          trust(s, 1);
          rep(s, -1);
          return ok('You came for a ring, not to coach. Fair, and a little cold.');
        },
      },
    ],
  },
];
