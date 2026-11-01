// Risks that are not injuries (playtest round 3): burnout, illness, legal trouble, money
// trouble, academics, locker-room conflict. Plus a few new turning points.

import { ATTR_MAX, COACH } from '../balance';
import { chance, clamp, int, range } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust, tally } from '../career/common';
import { TEMPER, changeCoach, coachOf, myTeam, onHotSeat } from '../career/coach';
import { fmtMoney } from '../economy/salary';
import type { EventDef } from './defs';
import { positionOptions, setPosition } from '../career/position';
import { ovrOf } from '../player/ovr';
import { NAMES } from '../../content/strings';
import { canHire, hireStaff } from '../career/staff';

/** The adjacent spot a coach would move him to: one that fits and does not cost much OVR. */
function coachSpot(s: GameState) {
  const now = ovrOf(s.player.attrs, s.player.pos);
  return positionOptions(s)
    .filter((o) => o.allowed && o.fit === 'natural size' && o.ovr >= now - 1.5)
    .sort((a, b) => b.ovr - a.ovr)[0];
}

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];
const ADULT: Stage[] = ['NCAA', 'GL', 'EU', 'INT', 'NBA'];

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const ok = (outcome: string, log?: string) => ({ outcome, log });
/** Games he sits out, served at the start of the next games he would play. */
const suspend = (s: GameState, games: number) => (s.flags.suspendGames = (s.flags.suspendGames ?? 0) + games);
const spend = (s: GameState, m: number) => (s.player.bank = Math.max(0, s.player.bank - m));

export const RISK_EVENTS: EventDef[] = [
  {
    id: 'burnout',
    stages: ALL,
    phase: 'mid',
    when: (s) => s.player.morale < 50 || (s.season?.plans ?? []).filter((p) => p === 'grind').length >= 1,
    weight: 1,
    cooldownSeasons: 3,
    title: 'Running on empty',
    text: 'You cannot remember the last day off. Practice feels like a chore and you are sleeping badly.',
    choices: [
      {
        label: 'Take a week away from basketball',
        detail: 'Miss a few games; your head clears',
        resolve: (s) => {
          suspend(s, 3);
          morale(s, 14);
          trust(s, -3);
          return ok('A week at home. You come back hungry.', 'Took a mental-health break mid-season.');
        },
      },
      {
        label: 'Push through it',
        shownOdds: 0.5,
        detail: 'Risky: it passes, or it gets worse',
        resolve: (s, rng) => {
          if (chance(rng, 0.5)) {
            morale(s, 4);
            return ok('A couple of good games and the fog lifts.');
          }
          morale(s, -16);
          s.player.growthMultNext *= 0.9;
          return ok('It gets worse. Your development stalls for a while.', 'Burned out and kept playing.');
        },
      },
    ],
  },
  {
    id: 'illness',
    stages: ALL,
    phase: 'mid',
    when: (s) => !s.player.injury,
    weight: 0.8,
    cooldownSeasons: 3,
    title: 'Sick',
    text: 'A fever, then exhaustion. The doctor says it might be mono.',
    choices: [
      {
        label: 'Shut it down until you are fully healthy',
        detail: 'About three weeks out',
        resolve: (s) => {
          s.player.injury = { key: 'minor', name: 'Mononucleosis', daysOut: 21 };
          return ok('Three weeks of rest. You come back at full strength.', 'Missed three weeks with mono.');
        },
      },
      {
        label: 'Play through it',
        shownOdds: 0.55,
        detail: 'Risky: you might lose strength for months',
        resolve: (s, rng) => {
          if (chance(rng, 0.55)) {
            morale(s, 3);
            return ok('Rough for two weeks, then fine. Nobody noticed.');
          }
          bump(s, 'ATH', -2);
          morale(s, -6);
          s.player.injury = { key: 'minor', name: 'Mononucleosis relapse', daysOut: 35 };
          return ok('A relapse. Five weeks out and your legs are gone for a while.', 'Played through mono and relapsed.');
        },
      },
    ],
  },
  {
    id: 'fight',
    stages: ADULT,
    phase: 'off',
    when: (s) => s.player.age >= 19,
    weight: 0.6,
    cooldownSeasons: 5,
    title: 'Trouble outside a club',
    text: 'A night out ends with a shoving match outside a club. Police were called and the video is everywhere.',
    choices: [
      {
        label: 'Settle quietly and apologize',
        detail: 'Costs money and some reputation',
        resolve: (s) => {
          const cost = Math.max(0.005, s.player.bank * 0.08);
          spend(s, cost);
          rep(s, -4);
          return ok(`Settled for ${fmtMoney(cost)}. The story dies in a week.`, 'Settled a nightclub incident.');
        },
      },
      {
        label: 'Fight the charges',
        shownOdds: 0.5,
        detail: 'Risky: cleared, or a suspension',
        resolve: (s, rng) => {
          if (chance(rng, 0.5)) {
            rep(s, 2);
            return ok('The video shows you walking away. Charges dropped.');
          }
          const games = s.stage === 'NBA' ? int(rng, 5, 15) : int(rng, 3, 8);
          suspend(s, games);
          rep(s, -12);
          trust(s, -10);
          return ok(`Convicted of a misdemeanor and suspended ${games} games.`, `Suspended ${games} games after a nightclub fight.`);
        },
      },
    ],
  },
  {
    id: 'betting',
    stages: PRO,
    phase: 'mid',
    weight: 0.4,
    cooldownSeasons: 6,
    oncePerCareer: true,
    title: 'The betting group chat',
    text: 'A teammate keeps asking whether you will play tonight and how many minutes. Someone tells you he has been betting on games.',
    choices: [
      {
        label: 'Tell the league',
        detail: 'The right call; the locker room may not see it that way',
        resolve: (s) => {
          trust(s, 4);
          morale(s, -6);
          rep(s, 3);
          return ok('The league opens an investigation. Some teammates stop talking to you.', 'Reported a betting teammate to the league.');
        },
      },
      {
        label: 'Stay out of it',
        shownOdds: 0.7,
        detail: 'Probably nothing happens to you',
        resolve: (s, rng) => {
          if (chance(rng, 0.7)) return ok('He gets caught on his own. You were never involved.');
          suspend(s, 20);
          rep(s, -15);
          return ok('Investigators find your messages. You knew and said nothing: 20 games.', 'Suspended 20 games in a betting investigation.');
        },
      },
    ],
  },
  {
    id: 'grades',
    stages: ['HS', 'NCAA'],
    phase: 'mid',
    weight: 0.7,
    cooldownSeasons: 2,
    title: 'Failing a class',
    text: 'Your academic adviser calls: one more bad test and you are ineligible.',
    choices: [
      {
        label: 'Tutoring every night',
        detail: 'Less time in the gym',
        resolve: (s) => {
          s.player.growthMultNext *= 0.95;
          morale(s, -2);
          return ok('You pass. Barely, but you pass.');
        },
      },
      {
        label: 'Cram the night before',
        shownOdds: 0.55,
        detail: 'Risky: pass, or sit out games',
        resolve: (s, rng) => {
          if (chance(rng, 0.55)) return ok('A C-minus. Good enough.');
          suspend(s, 6);
          trust(s, -6);
          return ok('You fail. Academically ineligible for six games.', 'Ruled academically ineligible.');
        },
      },
    ],
  },
  {
    id: 'agentfraud',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.bank >= 1,
    weight: 0.35,
    cooldownSeasons: 8,
    oncePerCareer: true,
    title: 'Money missing',
    text: 'Your accountant finds transfers you never approved. Your financial adviser has been skimming.',
    choices: [
      {
        label: 'Sue him',
        shownOdds: 0.5,
        detail: 'Risky: get it back, or pay lawyers too',
        resolve: (s, rng) => {
          const lost = s.player.bank * range(rng, 0.12, 0.25);
          if (chance(rng, 0.5)) {
            spend(s, lost * 0.15);
            return ok(`You win. Most of it comes back; lawyers cost ${fmtMoney(lost * 0.15)}.`, 'Won a lawsuit against a crooked adviser.');
          }
          spend(s, lost * 1.2);
          morale(s, -6);
          return ok(`You lose the case and ${fmtMoney(lost * 1.2)}.`, `Lost ${fmtMoney(lost * 1.2)} to a crooked adviser.`);
        },
      },
      {
        label: 'Cut him off and move on',
        detail: 'Lose what is gone, keep your peace',
        resolve: (s, rng) => {
          const lost = s.player.bank * range(rng, 0.08, 0.15);
          spend(s, lost);
          morale(s, -3);
          return ok(`${fmtMoney(lost)} gone. A lesson learned.`, `Lost ${fmtMoney(lost)} to a crooked adviser.`);
        },
      },
    ],
  },
  {
    id: 'starbeef',
    stages: ['NCAA', 'GL', 'EU', 'INT', 'NBA'],
    phase: 'mid',
    weight: 0.7,
    cooldownSeasons: 3,
    title: 'Beef with the star',
    text: 'The team\'s best player blames you on the bench after a loss. Cameras caught it.',
    choices: [
      {
        label: 'Clear the air privately',
        detail: 'Swallow some pride',
        resolve: (s) => {
          trust(s, 4);
          morale(s, -2);
          return ok('Dinner, a long talk, and he passes you the ball more.');
        },
      },
      {
        label: 'Answer him publicly',
        shownOdds: 0.4,
        detail: 'High risk: the room picks a side',
        resolve: (s, rng) => {
          if (chance(rng, 0.4)) {
            rep(s, 5);
            morale(s, 6);
            return ok('Teammates back you. You are a leader now.', 'Stood up to the team star and won the room.');
          }
          trust(s, -14);
          morale(s, -8);
          return ok('The coach sides with his star. Your minutes shrink.', 'Lost a public feud with the team star.');
        },
      },
    ],
  },
  {
    // round 32 (owner: "you might want to fix or edit the original coach fired event"): the hot
    // seat. Only when his team is losing, his coach by name, and a firing really changes the coach
    // (a new name and face, and in the NBA a new coaching factor). He can back him, stay out of
    // it, or (a name in the league) tell the front office it is time.
    id: 'coachfired',
    stages: ['NCAA', 'GL', 'EU', 'INT', 'NBA'],
    phase: 'mid',
    when: (s) => onHotSeat(s),
    weight: 1,
    cooldownSeasons: 3,
    title: 'Hot seat',
    text: (s) => {
      const t = myTeam(s)!;
      const c = coachOf(t);
      return `${t.w}–${t.l}, and the front office is out of patience. ${c.name}’s job is on the line, and the reporters want to know where you stand.`;
    },
    choices: (s) => [
      {
        label: 'Back him in public',
        detail: 'He might keep his job, and remember who stood up for him',
        resolve: (s, rng) => {
          const t = myTeam(s)!;
          const c = coachOf(t);
          if (chance(rng, COACH.backSave.base + s.player.rep * COACH.backSave.rep)) {
            s.player.trust = adjust(s.player.trust, COACH.backTrust);
            morale(s, 2);
            tally(s, 'hotSaved');
            return ok(`${c.name} keeps his job. After practice he pulls you aside: he won’t forget it. Coach trust +${COACH.backTrust}.`, `Backed ${c.name} on the hot seat; he kept his job.`);
          }
          const now = changeCoach(s, t, COACH.newTrust - 5);
          return ok(`They fire him anyway. ${now.name} takes over, and he has heard what you said about the last guy. Coach trust ${s.player.trust}.`, `Backed ${c.name} on the hot seat; they fired him anyway.`);
        },
      },
      {
        label: 'Stay out of it',
        detail: 'The front office decides',
        resolve: (s, rng) => {
          const t = myTeam(s)!;
          const c = coachOf(t);
          if (chance(rng, 0.6)) {
            const now = changeCoach(s, t);
            return ok(`${c.name} is fired. ${now.name} (${TEMPER[now.temper].toLowerCase()}) takes over, and coach trust starts over at ${COACH.newTrust}.`, `${c.name} was fired midseason; ${now.name} took over.`);
          }
          return ok(`${c.name} survives the week, and the next. For now.`);
        },
      },
      ...(s.player.rep >= COACH.letGoRep
        ? [
            {
              label: 'Tell them it is time for a change',
              detail: 'He goes; some of the room liked him',
              resolve: (s: GameState) => {
                const t = myTeam(s)!;
                const c = coachOf(t);
                const now = changeCoach(s, t, COACH.newTrust + 5);
                if (s.season) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) - 0.1) * 100) / 100;
                s.player.rep = adjust(s.player.rep, -1);
                tally(s, 'hotPushed');
                return ok(`${c.name} is fired the next morning. ${now.name} takes over, and he knows who has the front office’s ear. Some teammates liked the old coach (chemistry -0.1, reputation -1).`, `Told the front office to fire ${c.name}; ${now.name} took over.`);
              },
            },
          ]
        : []),
    ],
  },
  {
    id: 'psychologist',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.rep >= 30 || s.player.morale < 45,
    weight: 0.6,
    cooldownSeasons: 4,
    title: 'Pressure',
    text: 'Big games make your hands shake now. A teammate swears by his sports psychologist.',
    choices: [
      {
        label: 'Start seeing her',
        detail: 'Costs money, steadies your mind',
        resolve: (s) => {
          spend(s, Math.min(s.player.bank, 0.02 + s.player.bank * 0.01));
          morale(s, 12);
          // round 25: in a pro league she joins his staff
          if (canHire(s, 'psychologist')) hireStaff(s, 'psychologist');
          return ok('Breathing drills, routines, and the shaking stops.', 'Started working with a sports psychologist.');
        },
      },
      {
        label: 'Handle it yourself',
        shownOdds: 0.5,
        detail: 'Risky',
        resolve: (s, rng) => {
          if (chance(rng, 0.5)) {
            morale(s, 4);
            return ok('It passes on its own.');
          }
          morale(s, -12);
          return ok('It does not pass. Your confidence takes a hit.');
        },
      },
    ],
  },
  {
    id: 'posterdunk',
    stages: ALL,
    phase: 'mid',
    when: (s) => s.player.attrs.ATH >= 65,
    weight: 0.7,
    cooldownSeasons: 3,
    title: 'Poster',
    text: 'You catch a lob in transition and the only thing between you and the rim is the league\'s best shot blocker.',
    choices: [
      {
        label: 'Go right at him',
        shownOdds: 0.5,
        detail: 'Risky: the dunk of the year, or the block of the year',
        resolve: (s, rng) => {
          if (chance(rng, 0.5)) {
            rep(s, 8);
            morale(s, 8);
            return ok('Dunk of the year. Forty million views by morning.', 'Dunked on the league\'s best shot blocker.');
          }
          rep(s, -2);
          morale(s, -4);
          return ok('Pinned on the glass. You are the poster now.');
        },
      },
      {
        label: 'Kick it out to the open shooter',
        detail: 'The smart play',
        resolve: (s) => {
          trust(s, 4);
          return ok('Corner three, swish. The coach points at you.');
        },
      },
    ],
  },
  {
    id: 'foundation',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.bank >= 3,
    weight: 0.9,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'Give back',
    text: (s) => `Your old coach in ${s.player.hometown} asks if you would fund a youth center.`,
    choices: [
      {
        label: 'Start a foundation',
        detail: 'A real chunk of your savings',
        resolve: (s) => {
          spend(s, s.player.bank * 0.1);
          rep(s, 8);
          morale(s, 10);
          return ok('The ribbon-cutting is the best day of your year.', 'Started a foundation and built a youth center at home.');
        },
      },
      {
        label: 'Send a check',
        detail: 'Something, not everything',
        resolve: (s) => {
          spend(s, s.player.bank * 0.02);
          rep(s, 2);
          return ok('They name a court after you.');
        },
      },
    ],
  },
  {
    id: 'newborn',
    stages: ADULT,
    phase: 'off',
    when: (s) => s.player.age >= 23,
    weight: 0.5,
    cooldownSeasons: 6,
    title: 'A new baby',
    text: 'Your partner is due in the middle of summer workouts.',
    choices: [
      {
        label: 'Take the summer off',
        detail: 'Family first; less offseason work',
        resolve: (s) => {
          morale(s, 12);
          s.player.growthMultNext *= 0.92;
          return ok('A daughter. You have never been happier.', 'Took the summer off for the birth of his daughter.');
        },
      },
      {
        label: 'Keep your training schedule',
        detail: 'Some guilt',
        resolve: (s) => {
          morale(s, -3);
          return ok('You fly home for the birth and back to the gym two days later.');
        },
      },
    ],
  },
  {
    id: 'carcrash',
    stages: ALL,
    phase: 'off',
    weight: 0.3,
    cooldownSeasons: 8,
    oncePerCareer: true,
    title: 'Car accident',
    text: 'Someone runs a red light and hits your car. You walk away, sore and shaken.',
    choices: [
      {
        label: 'Get every scan the team doctors offer',
        detail: 'Slower return, nothing missed',
        resolve: (s) => {
          s.player.injury = { key: 'minor', name: 'Whiplash', daysOut: 14 };
          return ok('Whiplash and bruises. Two weeks and you are fine.');
        },
      },
      {
        label: 'Shake it off and keep training',
        shownOdds: 0.6,
        detail: 'Probably fine',
        resolve: (s, rng) => {
          if (chance(rng, 0.6)) return ok('Sore for a week. Nothing more.');
          s.player.injury = { key: 'major', name: 'Back injury (car accident)', daysOut: 45 };
          bump(s, 'ATH', -2);
          return ok('Your back stiffens up a week later. A real injury after all.', 'Hurt his back after a car accident.');
        },
      },
    ],
  },
  {
    id: 'coachpos',
    stages: ALL,
    phase: 'mid',
    when: (s) => !!coachSpot(s),
    weight: 0.7,
    cooldownSeasons: 3,
    title: 'A new spot',
    text: (s) => {
      const o = coachSpot(s);
      return `The coach wants to try you at ${o ? NAMES.pos[o.pos].toLowerCase() : 'another position'} for the rest of the season. He thinks it fits your game.`;
    },
    choices: (s) => {
      const o = coachSpot(s);
      return [
        {
          label: `Move to ${o ? NAMES.pos[o.pos].toLowerCase() : 'the new spot'}`,
          detail: 'The coach will trust you for it',
          resolve: (st: GameState) => {
            const spot = coachSpot(st);
            if (!spot) return ok('The plan changed. You stay where you are.');
            trust(st, 6);
            return ok(setPosition(st, spot.pos, true));
          },
        },
        {
          label: 'Ask to stay where you are',
          detail: 'He will not love it',
          resolve: (st: GameState) => {
            trust(st, -4);
            return ok('He shrugs. Your spot, your responsibility.');
          },
        },
      ];
    },
  },
];
