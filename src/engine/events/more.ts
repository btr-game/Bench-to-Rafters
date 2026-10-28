// More turning points (§11): bigger swings, real risks and some shown odds.

import { ATTR_MAX, ROLE_ORDER } from '../balance';
import { chance, clamp, int, pick, range, type Rng } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust, logDecision, pushMoment, rankOnRoster, userOvr } from '../career/common';
import { marketValue, fmtMoney } from '../economy/salary';
import type { EventChoice, EventDef } from './defs';
import { pathOf } from '../career/origin';

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];
const PAID: Stage[] = ['NCAA', 'GL', 'EU', 'INT', 'NBA'];

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const money = (s: GameState, m: number) => {
  s.player.bank = Math.max(0, s.player.bank + m);
  if (m > 0) s.player.earnings += m;
};
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const ok = (outcome: string, log?: string) => ({ outcome, log });

function roleUp(s: GameState): void {
  const season = s.season;
  if (!season) return;
  const i = ROLE_ORDER.indexOf(season.role);
  season.role = ROLE_ORDER[Math.min(ROLE_ORDER.length - 1, i + 1)];
  season.roleRank = Math.max(1, season.roleRank - 2);
}

function tradeAway(s: GameState, rng: Rng): string {
  const nba = s.nba!;
  const others = nba.teams.filter((t) => t.id !== s.teamId);
  // teams where he would play more are likelier partners
  const ovr = userOvr(s);
  const target = pick(rng, others.filter((t) => rankOnRoster(t, ovr) <= 8).concat(others.slice(0, 3)));
  const from = nba.teams.find((t) => t.id === s.teamId)?.name ?? 'your team';
  s.teamId = target.id;
  if (s.contract) s.contract.teamId = target.id;
  s.player.trust = 50;
  s.player.captain = false;
  logDecision(s, 'trade', `Traded from the ${from} to the ${target.name}.`, target.id);
  pushMoment(s, { kind: 'event', title: 'Traded', teamName: target.name, color: target.color, text: `The ${from} send ${s.player.name} to the ${target.name}.`, lines: [`New team: ${target.name}`, 'Coach trust resets to 50'] });
  return `You are a ${target.short} now.`;
}

export const MORE_EVENTS: EventDef[] = [
  {
    id: 'growthspurt',
    stages: ['HS'],
    phase: 'off',
    when: (s) => s.player.age <= 16,
    weight: 1,
    cooldownSeasons: 9,
    oncePerCareer: true,
    title: 'Growth spurt',
    text: 'You came back from summer two inches taller. Your coordination has not caught up yet.',
    choices: [
      {
        label: 'Learn to play big',
        detail: 'Rebounding and interior D up, shooting touch down for now',
        resolve: (s) => {
          s.player.height += 2;
          s.player.fullHeight += 2;
          s.player.heightProj += 2;
          s.player.wingspan += 2;
          bump(s, 'REB', 3);
          bump(s, 'INT', 2);
          bump(s, 'SHT', -2);
          return ok('Two more inches. The rim feels closer.', 'Hit a growth spurt and started playing bigger.');
        },
      },
      {
        label: 'Keep your guard skills sharp',
        detail: 'Taller, same game',
        resolve: (s) => {
          s.player.height += 2;
          s.player.fullHeight += 2;
          s.player.heightProj += 2;
          s.player.wingspan += 1;
          bump(s, 'PLY', 1);
          return ok('Taller, and still handling it like a guard.');
        },
      },
    ],
  },
  {
    id: 'powerhouse',
    stages: ['HS'],
    phase: 'off',
    when: (s) => s.hsYear <= 3 && !s.flags.powerhouse && pathOf(s) === 'us',
    weight: 0.8,
    cooldownSeasons: 9,
    oncePerCareer: true,
    title: 'Powerhouse comes calling',
    text: 'A national prep powerhouse wants you to transfer. Better teammates, bigger stage, and you may not start.',
    choices: [
      {
        label: 'Transfer to the powerhouse',
        detail: 'Stronger team, national schedule, tougher role battle',
        resolve: (s) => {
          s.flags.powerhouse = 1;
          rep(s, 6);
          trust(s, -10);
          s.player.highSchool = 'National Prep Academy';
          s.schoolColor = '#0B3D2E';
          return ok('You pack up for National Prep Academy.', 'Transferred to a national prep powerhouse.');
        },
      },
      {
        label: 'Stay loyal to your school',
        detail: 'Hometown hero',
        resolve: (s) => {
          trust(s, 8);
          morale(s, 5);
          return ok('Your coach hugs you in the hallway.');
        },
      },
    ],
  },
  {
    id: 'coachfeud',
    stages: ['HS', 'NCAA', 'GL', 'EU', 'INT'],
    phase: 'mid',
    weight: 0.9,
    cooldownSeasons: 2,
    title: 'Shouting match with the coach',
    text: 'You got pulled after one bad possession and said something you cannot take back.',
    choices: [
      {
        label: 'Apologize in front of the team',
        resolve: (s) => {
          trust(s, 5);
          morale(s, -5);
          return ok('Humbling, but the room respects it.');
        },
      },
      {
        label: 'Stand your ground',
        shownOdds: 0.5,
        detail: 'He respects it, or you are in the doghouse',
        resolve: (s, rng) => {
          if (chance(rng, 0.5)) {
            trust(s, 10);
            morale(s, 6);
            return ok('He calls you into his office and says he likes your fire.');
          }
          trust(s, -18);
          morale(s, -8);
          return ok('You are in the doghouse. Minutes are going to be hard to find.', 'Got into a feud with the coach and lost.');
        },
      },
    ],
  },
  {
    id: 'kneescare',
    stages: ALL,
    phase: 'mid',
    when: (s) => !s.player.injury,
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Something is wrong with your knee',
    text: 'It clicked on a landing and it has been swelling. The trainer wants an MRI. Tonight is a big game.',
    choices: [
      {
        label: 'Get the MRI and sit',
        detail: 'Safe: about two weeks out',
        resolve: (s, rng) => {
          s.player.injury = { key: 'minor', name: 'Knee soreness', daysOut: int(rng, 10, 16) };
          return ok('Small strain. Two weeks of rest and you will be fine.');
        },
      },
      {
        label: 'Play tonight',
        detail: 'High risk',
        resolve: (s, rng) => {
          if (chance(rng, 0.3)) {
            s.player.injury = { key: 'major', name: 'Torn meniscus', daysOut: int(rng, 45, 80) };
            bump(s, 'ATH', -2);
            morale(s, -10);
            return ok('It gives way in the third quarter. Torn meniscus.', 'Played through a knee problem and tore his meniscus.');
          }
          trust(s, 6);
          rep(s, 3);
          return ok('Wrapped up and dominant. The crowd chants your name.');
        },
      },
    ],
  },
  {
    id: 'family',
    stages: ALL,
    phase: 'mid',
    weight: 0.7,
    cooldownSeasons: 3,
    title: 'Family emergency',
    text: 'Your grandmother is in the hospital back home. The team has three games this week.',
    choices: [
      {
        label: 'Go home',
        detail: 'Miss about a week',
        resolve: (s, rng) => {
          s.player.injury = s.player.injury ?? { key: 'dtd', name: 'Personal leave', daysOut: int(rng, 6, 9) };
          morale(s, 8);
          trust(s, 2);
          return ok('You were there. She squeezed your hand. That mattered more than three games.', 'Left the team for a week to be with family.');
        },
      },
      {
        label: 'Stay and play for her',
        resolve: (s, rng) => {
          if (chance(rng, 0.5)) {
            if (s.season) s.season.fuel = true;
            morale(s, 4);
            return ok('You wrote her initials on your shoes and played the game of your life.');
          }
          morale(s, -12);
          return ok('Your head was not in it. You wish you had gone.');
        },
      },
    ],
  },
  {
    id: 'booster',
    stages: ['NCAA'],
    phase: 'mid',
    weight: 0.6,
    cooldownSeasons: 3,
    title: 'Envelope from a booster',
    text: 'A booster slips you an envelope with $40K in it. Nobody needs to know.',
    choices: [
      {
        label: 'Take it',
        detail: 'Risky',
        resolve: (s, rng) => {
          money(s, 0.04);
          if (chance(rng, 0.25)) {
            if (s.season) s.season.ineligibleHalf = true;
            rep(s, -10);
            trust(s, -10);
            return ok('Someone talked. The NCAA suspends you for the rest of the regular season.', 'Suspended after taking money from a booster.');
          }
          return ok('Nobody found out. Yet.');
        },
      },
      {
        label: 'Hand it back',
        resolve: (s) => {
          trust(s, 4);
          return ok('Clean conscience.');
        },
      },
    ],
  },
  {
    id: 'tradeRequest',
    stages: ['NBA'],
    phase: 'off',
    when: (s) => !!s.season && (s.season.role === 'bench' || s.season.role === 'deep' || s.season.role === 'rotation'),
    weight: 1.2,
    cooldownSeasons: 2,
    title: 'Trade rumors',
    text: 'Your name keeps coming up in trade talks and you are not playing much here.',
    choices: [
      {
        label: 'Request a trade',
        shownOdds: 0.55,
        detail: 'A fresh start somewhere you can play',
        resolve: (s, rng) => {
          if (chance(rng, 0.55)) return ok(tradeAway(s, rng));
          trust(s, -12);
          morale(s, -6);
          return ok('The front office says no. Things are awkward now.', 'Asked for a trade and was turned down.');
        },
      },
      {
        label: 'Commit publicly',
        resolve: (s) => {
          trust(s, 8);
          morale(s, 2);
          return ok('"I want to be here." The coach noticed.');
        },
      },
    ],
  },
  {
    id: 'extension',
    stages: ['NBA'],
    phase: 'off',
    when: (s) => !!s.contract && s.contract.years === 1 && s.player.age <= 31,
    weight: 1.2,
    cooldownSeasons: 2,
    title: 'Contract year',
    text: (s) => {
      const v = marketValue(s.year + 1, userOvr(s), s.player.age, s.player.rep, s.season?.role ?? 'rotation', s.serviceYears);
      return `One year left. The team offers an extension now at about ${fmtMoney(v * 0.88)} a year for three more years. Or you can bet on yourself.`;
    },
    choices: [
      {
        label: 'Sign the extension',
        detail: 'Security now, a little below market',
        resolve: (s) => {
          const v = marketValue(s.year + 1, userOvr(s), s.player.age, s.player.rep, s.season?.role ?? 'rotation', s.serviceYears);
          s.contract!.years += 3;
          s.contract!.salary = Math.round(v * 0.88 * 10) / 10;
          s.contract!.teamOptionYears = [];
          morale(s, 5);
          return ok(`Extended through ${s.year + 4}.`, `Signed a three-year extension at ${fmtMoney(s.contract!.salary)} a year.`);
        },
      },
      {
        label: 'Bet on yourself',
        detail: 'Play for a bigger deal in free agency',
        resolve: (s) => {
          if (s.season) s.season.fuel = true;
          morale(s, 3);
          return ok('Free agency or bust.');
        },
      },
    ],
  },
  {
    id: 'sneaker',
    stages: PAID,
    phase: 'off',
    when: (s) => s.player.rep >= 20,
    weight: 1,
    cooldownSeasons: 3,
    title: 'Sneaker deal',
    text: (s) => `A shoe company offers about ${fmtMoney(0.02 + (s.player.rep / 100) ** 2 * (s.stage === 'NBA' ? 8 : 0.4))} a year.`,
    choices: [
      {
        label: 'Sign now',
        resolve: (s) => {
          money(s, 0.02 + (s.player.rep / 100) ** 2 * (s.stage === 'NBA' ? 8 : 0.4));
          rep(s, 2);
          return ok('New kicks every week.', 'Signed a sneaker deal.');
        },
      },
      {
        label: 'Hold out for a signature shoe',
        shownOdds: 0.3,
        resolve: (s, rng) => {
          if (s.player.rep >= 50 && chance(rng, 0.3 + (s.player.rep - 50) / 100)) {
            money(s, 0.05 + (s.player.rep / 100) ** 2 * (s.stage === 'NBA' ? 25 : 1));
            rep(s, 8);
            return ok('Your own logo. Your own shoe.', 'Landed a signature shoe.');
          }
          return ok('They walked away. Maybe next year.');
        },
      },
    ],
  },
  {
    id: 'agent',
    stages: PAID,
    phase: 'off',
    when: (s) => !s.flags.powerAgent,
    weight: 0.7,
    cooldownSeasons: 4,
    title: 'A power agent calls',
    text: 'The most feared agent in the business wants to represent you. He gets everyone paid, and he takes a bigger cut.',
    choices: [
      {
        label: 'Sign with him',
        detail: 'Bigger contracts from now on, coaches trust you a bit less',
        resolve: (s) => {
          s.flags.powerAgent = 1;
          trust(s, -4);
          rep(s, 4);
          return ok('Your phone does not stop ringing.', 'Signed with a power agent.');
        },
      },
      {
        label: 'Stay with your family advisor',
        resolve: (s) => {
          morale(s, 5);
          return ok('Loyalty. Your uncle cried a little.');
        },
      },
    ],
  },
  {
    id: 'mediagaffe',
    stages: PRO,
    phase: 'mid',
    weight: 0.7,
    cooldownSeasons: 2,
    title: 'Media day gaffe',
    text: 'You joked that your team "has no chance this year". It is everywhere.',
    choices: [
      {
        label: 'Apologize',
        resolve: (s) => {
          rep(s, -2);
          trust(s, 2);
          return ok('Contrite. It blows over.');
        },
      },
      {
        label: 'Double down',
        shownOdds: 0.5,
        resolve: (s, rng) => {
          if (chance(rng, 0.5)) {
            rep(s, 7);
            return ok('Fans love the honesty. You are a personality now.');
          }
          rep(s, -8);
          trust(s, -10);
          morale(s, -6);
          return ok('The locker room is furious.', 'Doubled down on a media gaffe and lost the locker room.');
        },
      },
    ],
  },
  {
    id: 'loadmgmt',
    stages: ['NBA'],
    phase: 'mid',
    when: (s) => s.player.age >= 29,
    weight: 1,
    cooldownSeasons: 2,
    title: 'Load management',
    text: 'The medical staff wants you to sit one of every four games.',
    choices: [
      {
        label: 'Accept the rest days',
        resolve: (s) => {
          s.player.injuryMultNext *= 0.7;
          s.player.declineMultNext *= 0.85;
          rep(s, -2);
          return ok('Fans boo the inactive list. Your body thanks you.');
        },
      },
      {
        label: 'Refuse, play every night',
        resolve: (s) => {
          s.player.injuryMultNext *= 1.35;
          trust(s, 4);
          rep(s, 2);
          return ok('Old school. Risky.');
        },
      },
    ],
  },
  {
    id: 'definedrole',
    stages: ['NBA', 'GL', 'EU', 'INT'],
    phase: 'off',
    when: (s) => !!s.season && ['bench', 'rotation', 'sixth'].includes(s.season.role) && s.player.range < 70,
    weight: 0.9,
    cooldownSeasons: 3,
    title: 'A defined role',
    text: 'The coach wants you to become a corner-three and defense specialist. Smaller role, guaranteed minutes.',
    choices: [
      {
        label: 'Accept the role',
        resolve: (s) => {
          s.player.range = clamp(s.player.range + 8, 0, 99);
          bump(s, 'SHT', 1);
          bump(s, 'PER', 1);
          trust(s, 10);
          return ok('3-and-D. Every team needs one.', 'Accepted a 3-and-D specialist role.');
        },
      },
      {
        label: 'Decline, you want the ball',
        resolve: (s) => {
          morale(s, 4);
          trust(s, -6);
          return ok('You want more than that.');
        },
      },
    ],
  },
  {
    id: 'nightlife',
    stages: ['NCAA', ...PRO],
    phase: 'mid',
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Big night out',
    text: 'Road trip in a party city. The veterans are going out.',
    choices: [
      {
        label: 'Go out',
        shownOdds: 0.65,
        detail: 'Probably fine',
        resolve: (s, rng) => {
          morale(s, 8);
          if (chance(rng, 0.35)) {
            trust(s, -10);
            rep(s, -5);
            return ok('Photos leaked. You played terribly the next night.', 'Got caught out late on a road trip.');
          }
          return ok('Team bonding. You feel closer to the guys.');
        },
      },
      {
        label: 'Stay in and rest',
        resolve: (s) => {
          trust(s, 3);
          return ok('Room service and film.');
        },
      },
    ],
  },
  {
    id: 'hotstreak',
    stages: ALL,
    phase: 'mid',
    when: (s) => (s.season?.rhythm ?? 1) >= 1.03,
    weight: 1.2,
    cooldownSeasons: 1,
    title: 'You are on fire',
    text: 'You cannot miss. Everyone is talking about the streak.',
    choices: [
      {
        label: 'Ride the wave, shoot more',
        resolve: (s) => {
          if (s.season) {
            s.season.fuel = true;
            s.season.rhythm = (s.season.rhythm ?? 1) + 0.08;
          }
          morale(s, 6);
          rep(s, 3);
          return ok('Green light. Keep firing.');
        },
      },
      {
        label: 'Stay humble, stay in the system',
        resolve: (s) => {
          trust(s, 6);
          morale(s, 3);
          return ok('Coach appreciates it.');
        },
      },
    ],
  },
  {
    id: 'slump',
    stages: ALL,
    phase: 'mid',
    when: (s) => (s.season?.rhythm ?? 1) <= 0.97 || s.player.morale < 45,
    weight: 1.2,
    cooldownSeasons: 1,
    title: 'Shooting slump',
    text: 'You cannot buy a bucket. 2-for-your-last-19 from three.',
    choices: [
      {
        label: 'Extra shooting every night',
        resolve: (s) => {
          bump(s, 'SHT', 1);
          morale(s, -3);
          if (s.season) s.season.rhythm = 1;
          return ok('Hundreds of shots after practice. It comes back slowly.');
        },
      },
      {
        label: 'See a sports psychologist',
        detail: 'Costs a little money',
        resolve: (s) => {
          money(s, -Math.min(s.player.bank, 0.003));
          morale(s, 12);
          if (s.season) s.season.rhythm = 1.04;
          return ok('You stop thinking. The ball starts going in.');
        },
      },
      {
        label: 'Ignore it',
        shownOdds: 0.5,
        resolve: (s, rng) => {
          if (chance(rng, 0.5)) return ok('It passed on its own.');
          morale(s, -10);
          if (s.season) s.season.rhythm = 0.9;
          return ok('It gets worse. You are hearing it from the crowd.');
        },
      },
    ],
  },
  {
    id: 'opportunity',
    stages: ALL,
    phase: 'mid',
    when: (s) => !!s.season && ['bench', 'deep', 'rotation', 'sixth'].includes(s.season.role),
    weight: 1.1,
    cooldownSeasons: 1,
    title: 'Starter goes down',
    text: 'The starter at your spot is out for the season. Someone has to step up.',
    choices: [
      {
        label: 'Step up',
        resolve: (s) => {
          roleUp(s);
          trust(s, 4);
          return ok('Bigger role for the second half.', 'Stepped into a bigger role after an injury.');
        },
      },
      {
        label: 'Stay in your lane',
        resolve: (s) => {
          morale(s, 2);
          return ok('Somebody else gets the shot.');
        },
      },
    ],
  },
  {
    id: 'socialbeef',
    stages: ALL,
    phase: 'both',
    weight: 0.7,
    cooldownSeasons: 2,
    title: 'Beef online',
    text: 'A famous streamer roasted your game for ten minutes. Millions watched.',
    choices: [
      {
        label: 'Clap back',
        resolve: (s, rng) => {
          rep(s, int(rng, 2, 7));
          morale(s, -4);
          return ok('Your reply has more views than his roast.');
        },
      },
      {
        label: 'Log off for a month',
        resolve: (s) => {
          morale(s, 6);
          return ok('Peace and quiet.');
        },
      },
    ],
  },
  {
    id: 'elitecamp',
    stages: ['HS'],
    phase: 'off',
    when: (s) => s.hsYear >= 2,
    weight: 1.1,
    cooldownSeasons: 1,
    title: 'Elite camp invite',
    text: 'An invite-only camp with the top 100 players in your class. Every college coach will be there.',
    choices: [
      {
        label: 'Go and compete',
        shownOdds: 0.5,
        detail: 'Shine and your stock rises; flop and it falls',
        resolve: (s, rng) => {
          const p = s.player;
          // scouts get a better look at your real ceiling
          const est = p.potential + range(rng, -2, 2);
          p.scoutRange = [Math.round(est - 3), Math.min(99, Math.round(est + 3))];
          if (chance(rng, 0.5)) {
            rep(s, 9);
            morale(s, 6);
            return ok('You were the talk of camp. Offers are coming.', 'Starred at an elite camp.');
          }
          rep(s, -3);
          morale(s, -6);
          return ok('You looked overmatched. The scouts wrote it down.');
        },
      },
      {
        label: 'Train at home instead',
        resolve: (s) => {
          for (const k of s.player.focus) bump(s, k, 1);
          return ok('A quiet summer of reps.');
        },
      },
    ],
  },
  {
    id: 'nutrition',
    stages: ALL,
    phase: 'off',
    weight: 0.8,
    cooldownSeasons: 3,
    title: 'Diet overhaul',
    text: 'A nutritionist says your diet is costing you a step.',
    choices: [
      {
        label: 'Go all in',
        resolve: (s) => {
          bump(s, 'ATH', 2);
          s.player.injuryMultNext *= 0.9;
          morale(s, -4);
          return ok('No more fries. You feel lighter by October.');
        },
      },
      {
        label: 'Not giving up wings',
        resolve: (s) => {
          morale(s, 3);
          return ok('Life is short.');
        },
      },
    ],
  },
  {
    id: 'youthcamp',
    stages: PRO,
    phase: 'off',
    weight: 0.7,
    cooldownSeasons: 3,
    title: 'Hometown youth camp',
    text: (s) => `Kids from ${s.player.hometown} want to learn from you.`,
    choices: [
      {
        label: 'Host it yourself',
        resolve: (s) => {
          money(s, -Math.min(s.player.bank, 0.01));
          rep(s, 5);
          morale(s, 8);
          return ok('Three hundred kids in your jersey.', 'Hosted a youth camp back home.');
        },
      },
      {
        label: 'Send a donation',
        resolve: (s) => {
          money(s, -Math.min(s.player.bank, 0.005));
          rep(s, 2);
          return ok('The gym gets new hoops.');
        },
      },
    ],
  },
  {
    id: 'homesick',
    stages: ['EU', 'INT'],
    phase: 'mid',
    weight: 1.1,
    cooldownSeasons: 2,
    title: 'Homesick overseas',
    text: 'Different food, different language, eight time zones from home.',
    choices: [
      {
        label: 'Explore the city',
        resolve: (s) => {
          morale(s, 9);
          return ok('You found a great taco place. In Belgrade. Life is good.');
        },
      },
      {
        label: 'Call home every night',
        resolve: (s, rng) => {
          if (chance(rng, 0.5)) {
            morale(s, 4);
            return ok('Hearing your mom helps.');
          }
          morale(s, -8);
          return ok('It makes it worse. You count the days.');
        },
      },
    ],
  },
  {
    id: 'rivalgame',
    stages: ['HS', 'NCAA'],
    phase: 'mid',
    weight: 1,
    cooldownSeasons: 1,
    title: 'Rivalry game',
    text: 'Sold-out gym. Your rival is guarding you all night.',
    choices: [
      {
        label: 'Take him one on one',
        shownOdds: 0.5,
        resolve: (s, rng) => {
          if (chance(rng, 0.5)) {
            rep(s, 8);
            morale(s, 8);
            return ok('You dropped a career high on his head. Video is everywhere.', 'Won a rivalry game duel.');
          }
          rep(s, -4);
          morale(s, -6);
          trust(s, -4);
          return ok('He locked you up. Long bus ride home.');
        },
      },
      {
        label: 'Play within the offense',
        resolve: (s) => {
          trust(s, 5);
          return ok('Smart, efficient, a win.');
        },
      },
    ],
  },
  {
    id: 'investment',
    stages: PAID,
    phase: 'off',
    when: (s) => s.player.bank >= 0.05,
    weight: 0.8,
    cooldownSeasons: 3,
    title: 'Investment pitch',
    text: (s) => `A friend wants ${fmtMoney(s.player.bank * 0.3)} for a startup. "Can't miss."`,
    choices: [
      {
        label: 'Invest',
        shownOdds: 0.35,
        resolve: (s, rng) => {
          const stake = s.player.bank * 0.3;
          if (chance(rng, 0.35)) {
            money(s, stake * range(rng, 1.5, 4));
            return ok('It took off. You are an investor now.', 'Hit big on a startup investment.');
          }
          money(s, -stake);
          morale(s, -5);
          return ok('It folded in eight months.', 'Lost money on a friend’s startup.');
        },
      },
      {
        label: 'Pass',
        resolve: () => ok('Index funds it is.'),
      },
    ],
  },
  {
    id: 'pickup',
    stages: ALL,
    phase: 'off',
    weight: 0.8,
    cooldownSeasons: 2,
    title: 'Summer pickup runs',
    text: 'Pros, college stars and legends run open gym all summer across town.',
    choices: [
      {
        label: 'Run every day',
        detail: 'Better, but more wear',
        resolve: (s, rng) => {
          const k = pick(rng, ['SHT', 'FIN', 'PLY', 'PER'] as AttrKey[]);
          bump(s, k, 2);
          s.player.injuryMultNext *= 1.1;
          return ok(`You held your own. Your ${k.toLowerCase()} game took a jump.`);
        },
      },
      {
        label: 'Rest up',
        resolve: (s) => {
          s.player.injuryMultNext *= 0.92;
          morale(s, 3);
          return ok('Fresh legs for the fall.');
        },
      },
    ],
  },
] satisfies EventDef[] as EventDef[];

export type { EventChoice };
