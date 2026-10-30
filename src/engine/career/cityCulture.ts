// Round 22: every NBA city has its own culture, and it rubs off on the players who live there.
// Each half of a season with a team, its city does something to him: Denver's thin air slows a
// weak athlete down at first and then builds his lungs; Atlanta's and New Orleans' nights can
// pull him out of the gym; San Antonio's discipline keeps him young; Los Angeles makes him
// famous and distracted at once. Every team is different, and most cities cut both ways.
// The effects are small each half and add up over the years he stays.

import { ATTR_MAX } from '../balance';
import { chance, clamp, pick } from '../rng';
import type { AttrKey, GameState } from '../types';
import { adjust, note, teamById } from './common';
import { NBA_TEAMS } from '../../content/teams';
import { addPounds, syncWeight, weightUnits } from '../player/weight';

export interface CityCulture {
  name: string;
  /** What living and playing there is like, in a sentence. */
  text: string;
  good: string;
  bad: string;
  half: (s: GameState, c: Ctx) => string | void;
}

interface Ctx {
  years: number; // seasons already played with the team
  winning: boolean; // the team is at .500 or better
  young: boolean; // 24 or younger
}

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const wear = (s: GameState, v: number) => (s.player.wear = clamp((s.player.wear ?? 0) + v, 0, 100));
const chem = (s: GameState, v: number) => {
  if (s.season) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) + v) * 100) / 100;
};
/** A night (or a week) out: fun, but the work suffers. */
const distracted = (s: GameState, rng: GameState['rng'], p: number, where: string): string | void => {
  if (!chance(rng, p * (s.player.morale > 70 ? 1.2 : 1))) return;
  bump(s, pick(rng, s.player.focus.length ? s.player.focus : (['SHT'] as AttrKey[])), -0.5);
  morale(s, 3);
  return where;
};

export const CITY_CULTURES: Record<string, CityCulture> = {
  BOS: {
    name: 'Banner standards',
    text: 'Seventeen banners in the rafters and fans who know every one. Nothing but winning counts.',
    good: 'Basketball IQ grows; winning seasons lift you',
    bad: 'Losing seasons get loud',
    half: (s, c) => {
      bump(s, 'IQ', 0.15);
      morale(s, c.winning ? 1 : -2);
    },
  },
  BKN: {
    name: 'Brooklyn hustle',
    text: 'A borough of strivers and a front office built on player development.',
    good: 'Young players develop faster',
    bad: 'Less of a spotlight than across the river',
    half: (s, c) => {
      if (c.young) s.player.growthMultNext *= 1.02;
      rep(s, -0.2);
    },
  },
  NYK: {
    name: 'The Garden spotlight',
    text: 'The Mecca. Every good night makes the back page, every bad one too, and the city never sleeps.',
    good: 'Reputation grows fast',
    bad: 'The nightlife and the tabloids can distract you',
    half: (s, c) => {
      rep(s, 1);
      morale(s, c.winning ? 2 : -2);
      return distracted(s, s.rng, 0.12, 'New York never sleeps, and neither did you this month.');
    },
  },
  PHI: {
    name: 'Trust the Process',
    text: 'A patient front office and the toughest fans in sports. They booed Santa Claus.',
    good: 'Young players develop a little faster',
    bad: 'Losing gets you booed',
    half: (s, c) => {
      if (c.young) s.player.growthMultNext *= 1.02;
      if (!c.winning) morale(s, -2);
    },
  },
  TOR: {
    name: 'We the North',
    text: 'A whole country behind one team, and the longest flights in the league.',
    good: 'Team chemistry: a nation pulling together',
    bad: 'Cold winters and cross-border travel wear you down',
    half: (s) => {
      chem(s, 0.25);
      wear(s, 0.6);
    },
  },
  CHI: {
    name: 'Windy City grind',
    text: 'A blue-collar town that loves defenders and still measures everyone against the 90s.',
    good: 'Perimeter defense and rebounding grow; the coach trusts grinders',
    bad: 'Stars live under the shadow of the dynasty',
    half: (s) => {
      bump(s, 'PER', 0.1);
      bump(s, 'REB', 0.08);
      trust(s, 1);
      if (s.player.rep >= 60) morale(s, -1);
    },
  },
  CLE: {
    name: 'Rust Belt loyalty',
    text: 'A small market that never forgets who stayed.',
    good: 'Loyal fans keep your mood and the coach’s trust up',
    bad: 'A small market grows your fame slowly',
    half: (s, c) => {
      morale(s, 1);
      trust(s, c.years >= 2 ? 1 : 0);
      rep(s, -0.3);
    },
  },
  DET: {
    name: 'Bad Boys',
    text: 'Motor City toughness. Nobody gets an easy basket here.',
    good: 'Interior defense, perimeter defense and rebounding grow',
    bad: 'The physical practices wear the body down',
    half: (s) => {
      bump(s, 'INT', 0.1);
      bump(s, 'PER', 0.06);
      bump(s, 'REB', 0.06);
      wear(s, 0.6);
    },
  },
  IND: {
    name: 'Hoosier hoops',
    text: 'Basketball is a religion in Indiana, and it is played the right way.',
    good: 'Shooting and basketball IQ grow; the fans love you',
    bad: 'Not much glamour to sell',
    half: (s) => {
      bump(s, 'SHT', 0.08);
      bump(s, 'IQ', 0.08);
      morale(s, 1);
      rep(s, -0.2);
    },
  },
  MIL: {
    name: 'Small-town focus',
    text: 'Cold, quiet and friendly: nothing to do in winter but work.',
    good: 'Few distractions: you develop a little faster',
    bad: 'A small market grows your fame slowly',
    half: (s) => {
      s.player.growthMultNext *= 1.02;
      rep(s, -0.3);
    },
  },
  ATL: {
    name: 'Nightlife capital',
    text: 'The music capital of the South, and the clubs are open until sunrise.',
    good: 'Your name grows with the city’s music scene',
    bad: 'Late nights can pull you out of the gym',
    half: (s) => {
      rep(s, 0.6);
      return distracted(s, s.rng, 0.22, 'Atlanta nights: you were seen everywhere except the practice gym.');
    },
  },
  CHA: {
    name: 'Buzz City ease',
    text: 'Easygoing, warm and full of barbecue.',
    good: 'Good mood all season',
    bad: 'The food adds a few pounds',
    half: (s) => {
      morale(s, 1.5);
      addPounds(s.player, 1);
    },
  },
  MIA: {
    name: 'Heat Culture',
    text: 'The hardest-working, best-conditioned team in the league, in a city built for parties.',
    good: 'Body-fat tests: your weight moves toward its best, conditioning grows',
    bad: 'South Beach is right there',
    half: (s) => {
      const u = weightUnits(s.player);
      if (Math.abs(u) > 0.3) addPounds(s.player, u > 0 ? -2 : 1);
      bump(s, 'ATH', 0.08);
      wear(s, 0.4);
      return distracted(s, s.rng, 0.1, 'South Beach got you this month.');
    },
  },
  ORL: {
    name: 'Sunshine State',
    text: 'Theme parks, sunshine and very little pressure.',
    good: 'Good mood and a fresh body',
    bad: 'Little pressure means little urgency',
    half: (s) => {
      morale(s, 1);
      s.player.injuryMultNext *= 0.98;
      s.player.growthMultNext *= 0.99;
    },
  },
  WAS: {
    name: 'Capital pressure',
    text: 'Power, politics and a media corps that covers everything.',
    good: 'Fame grows',
    bad: 'The pressure wears on your mood',
    half: (s) => {
      rep(s, 0.5);
      morale(s, -1);
    },
  },
  DEN: {
    name: 'Mile High',
    text: 'A mile above sea level. Visitors gasp for air in the fourth quarter, and so do newcomers.',
    good: 'After a season of thin air, your stamina and athleticism grow, and so does your development',
    bad: 'A weak athlete struggles at first',
    half: (s, c) => {
      chem(s, 0.2); // the altitude is a home edge
      if (c.years === 0) {
        if (s.player.attrs.ATH < 70) {
          s.player.growthMultNext *= 0.97;
          wear(s, 0.5);
          return 'The thin air of Denver: your legs are gone by the fourth quarter.';
        }
        return;
      }
      bump(s, 'ATH', s.player.attrs.ATH < 70 ? 0.25 : 0.12);
      s.player.growthMultNext *= 1.02;
    },
  },
  MIN: {
    name: 'Northern winters',
    text: 'Long, frozen winters: the gym is the warmest place in town.',
    good: 'Gym rats develop faster',
    bad: 'The dark winters weigh on your mood',
    half: (s) => {
      s.player.growthMultNext *= 1.025;
      morale(s, -1);
    },
  },
  OKC: {
    name: 'Draft and develop',
    text: 'A small market that builds through youth, patience and player development.',
    good: 'Young players develop faster',
    bad: 'A small market grows your fame slowly',
    half: (s, c) => {
      if (c.young) s.player.growthMultNext *= 1.03;
      rep(s, -0.3);
    },
  },
  POR: {
    name: 'Rip City',
    text: 'Rain, coffee and the most loyal crowd in the West.',
    good: 'Loyal fans keep your mood up',
    bad: 'The longest road trips in the league',
    half: (s) => {
      morale(s, 1.5);
      wear(s, 0.5);
    },
  },
  UTA: {
    name: 'Quiet altitude',
    text: 'Salt Lake City: four thousand feet up and early to bed.',
    good: 'Few distractions; after a season the altitude builds your athleticism',
    bad: 'A small market grows your fame slowly',
    half: (s, c) => {
      if (c.years >= 1) bump(s, 'ATH', 0.08);
      s.player.growthMultNext *= 1.01;
      rep(s, -0.3);
    },
  },
  GSW: {
    name: 'Splash culture',
    text: 'The team that changed the game from deep, with tech money in every seat.',
    good: 'Shooting and range grow',
    bad: 'Expectations are sky high',
    half: (s, c) => {
      bump(s, 'SHT', 0.15);
      s.player.range = clamp(s.player.range + 0.5, 0, 99);
      if (!c.winning) morale(s, -2);
    },
  },
  LAC: {
    name: 'The other LA team',
    text: 'Overshadowed in their own city, and playing with a chip on the shoulder.',
    good: 'The chip on your shoulder: the coach trusts you, you work harder',
    bad: 'Less fame than down the hall',
    half: (s) => {
      trust(s, 1);
      s.player.growthMultNext *= 1.01;
      rep(s, -0.2);
    },
  },
  LAL: {
    name: 'Hollywood',
    text: 'The brightest lights in sports: celebrities courtside, premieres every night.',
    good: 'Fame grows fastest here',
    bad: 'The glamour can distract you; losing is not allowed',
    half: (s, c) => {
      rep(s, 1.5);
      if (!c.winning) morale(s, -2);
      return distracted(s, s.rng, 0.18, 'Hollywood called: a premiere, a commercial shoot, a party in the hills.');
    },
  },
  PHX: {
    name: 'Valley heat',
    text: 'Desert sunshine and summer days over 110 degrees.',
    good: 'Conditioning in the heat builds athleticism; sunshine keeps you happy',
    bad: 'The heat wears the body down',
    half: (s) => {
      bump(s, 'ATH', 0.06);
      morale(s, 1);
      wear(s, 0.4);
    },
  },
  SAC: {
    name: 'Cowbell loyalty',
    text: 'The loudest small arena in the league, and a city that loves its only team.',
    good: 'Team chemistry and a good mood',
    bad: 'A small market grows your fame slowly',
    half: (s) => {
      chem(s, 0.2);
      morale(s, 1);
      rep(s, -0.3);
    },
  },
  DAL: {
    name: 'Texas-size',
    text: 'Big money, big steaks, big expectations.',
    good: 'Fame and money grow',
    bad: 'Brisket adds pounds',
    half: (s) => {
      rep(s, 0.5);
      addPounds(s.player, 1.5);
    },
  },
  HOU: {
    name: 'Space City analytics',
    text: 'Threes, layups and spreadsheets: the numbers decide everything here.',
    good: 'Shooting range and basketball IQ grow',
    bad: 'Mid-range shooters get benched',
    half: (s) => {
      s.player.range = clamp(s.player.range + 0.6, 0, 99);
      bump(s, 'IQ', 0.06);
      if (s.player.range < 40) trust(s, -1);
    },
  },
  MEM: {
    name: 'Grit and grind',
    text: 'Blues, barbecue and defense. Nothing comes easy in Memphis.',
    good: 'Defense grows and the coach trusts grinders',
    bad: 'A small market grows your fame slowly',
    half: (s) => {
      bump(s, 'PER', 0.08);
      bump(s, 'INT', 0.08);
      trust(s, 1);
      rep(s, -0.3);
    },
  },
  NOP: {
    name: 'The Big Easy',
    text: 'Jazz, gumbo and a party every night of the week.',
    good: 'You have never been happier',
    bad: 'The food adds pounds and the nights pull you out of the gym',
    half: (s) => {
      morale(s, 2);
      addPounds(s.player, 2);
      return distracted(s, s.rng, 0.2, 'New Orleans: Bourbon Street won this month.');
    },
  },
  SAS: {
    name: 'The Spurs Way',
    text: 'Fundamentals, discipline and the best sports science in the league. Players last longer here.',
    good: 'Basketball IQ grows and you age more slowly',
    bad: 'Egos are not welcome: a smaller spotlight',
    half: (s) => {
      bump(s, 'IQ', 0.12);
      s.player.declineMultNext *= 0.98;
      rep(s, -0.2);
    },
  },
};

/** The culture of an NBA team by its full name (for offers). */
export function cultureByName(teamName: string): CityCulture | null {
  const t = NBA_TEAMS.find((x) => `${x.city} ${x.nick}` === teamName);
  return t ? (CITY_CULTURES[t.abbr] ?? null) : null;
}

/** The culture of the NBA team he plays for, if any. */
export function cityCultureOf(s: GameState): CityCulture | null {
  if (s.stage !== 'NBA') return null;
  const t = teamById(s.nba, s.teamId);
  return t ? (CITY_CULTURES[t.abbr] ?? null) : null;
}

/** What his city did to him this half (season.ts calls it after each half's growth). */
export function cityHalf(s: GameState): string {
  const c = cityCultureOf(s);
  const t = teamById(s.nba, s.teamId);
  if (!c || !t || !s.season || s.mode === 'lab') return '';
  const ctx: Ctx = { years: s.teamSeasons[t.id] ?? 0, winning: t.w >= t.l, young: s.player.age <= 24 };
  const line = c.half(s, ctx);
  syncWeight(s.player);
  if (line) note(s, line);
  return line ? ` ${line}` : '';
}
