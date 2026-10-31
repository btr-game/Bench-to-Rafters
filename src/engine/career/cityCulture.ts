// Round 22: every NBA city has its own culture, and it rubs off on the players who live there.
// Each half of a season with a team, its city does something to him: Denver's thin air slows a
// weak athlete down at first and then builds his lungs; San Antonio's discipline keeps him young.
// The party cities each cost him in their own way: New York's tabloids (mood and coach trust),
// Atlanta's late nights (his legs), Miami's fines, Hollywood's paid gigs (missed reps) and New
// Orleans' food (pounds). Every team is different, and most cities cut both ways.
// The effects are small each half and add up over the years he stays.

import { ATTR_MAX } from '../balance';
import { chance, clamp, pick } from '../rng';
import type { AttrKey, GameState } from '../types';
import { adjust, note, teamById } from './common';
import { NBA_TEAMS } from '../../content/teams';
import { fanHalf } from './fanCulture';
import { addPounds, syncWeight, weightUnits } from '../player/weight';

interface CityCulture {
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
}

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const wear = (s: GameState, v: number) => (s.player.wear = clamp((s.player.wear ?? 0) + v, 0, 100));
const chem = (s: GameState, v: number) => {
  if (s.season) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) + v) * 100) / 100;
};
/** Whether the city's nights get him this half (a happy player goes out more). */
const night = (s: GameState, p: number): boolean => chance(s.rng, p * (s.player.morale > 70 ? 1.2 : 1));
const focusKey = (s: GameState): AttrKey => pick(s.rng, s.player.focus.length ? s.player.focus : (['SHT'] as AttrKey[]));

export const CITY_CULTURES: Record<string, CityCulture> = {
  BOS: {
    name: 'Banner standards',
    text: 'Seventeen banners in the rafters and a city that measures every season against them.',
    good: 'Basketball IQ grows; a winning season lifts your mood',
    bad: 'A losing season weighs on your mood',
    half: (s, c) => {
      bump(s, 'IQ', 0.15);
      morale(s, c.winning ? 1 : -2);
    },
  },
  BKN: {
    name: 'Brooklyn skills lab',
    text: 'A borough of strivers and a staff of skills coaches who rebuild players from the ground up.',
    good: 'Your weak hand improves, fastest for players 25 and under',
    bad: 'Brooklyn rent eats into your bank account',
    half: (s) => {
      s.player.offhand = clamp(s.player.offhand + (s.player.age <= 25 ? 2 : 1.2), 0, 99);
      s.player.bank = Math.max(0, s.player.bank - 0.03);
    },
  },
  NYK: {
    name: 'The Garden spotlight',
    text: 'The Mecca. Every good night makes the back page, and so does every night out.',
    good: 'Your fame grows every half',
    bad: 'Nights out become tabloid stories: your mood and the coach’s trust take the hit',
    half: (s) => {
      rep(s, 1);
      if (!night(s, 0.14)) return;
      morale(s, -3);
      trust(s, -2);
      rep(s, 1);
      return 'A night out ends up on the back page. The coach reads the Post too.';
    },
  },
  PHI: {
    name: 'Philly tough',
    text: 'Cheesesteaks, the Rocky steps and a city that respects whoever plays through pain.',
    good: 'The coach’s trust grows: toughness is noticed here',
    bad: 'Playing through everything raises your injury risk',
    half: (s) => {
      trust(s, 1.5);
      s.player.injuryMultNext *= 1.03;
    },
  },
  TOR: {
    name: 'We the North',
    text: 'A whole country behind one team, and the longest flights in the league.',
    good: 'Team chemistry: a nation pulling together',
    bad: 'Cross-border travel wears your body down',
    half: (s) => {
      chem(s, 0.25);
      wear(s, 0.6);
    },
  },
  CHI: {
    name: 'Windy City grind',
    text: 'A blue-collar town that loves defenders and still measures every star against the 90s.',
    good: 'Perimeter defense and rebounding grow',
    bad: 'Once you are famous, the dynasty’s shadow weighs on your mood',
    half: (s) => {
      bump(s, 'PER', 0.1);
      bump(s, 'REB', 0.08);
      if (s.player.rep >= 60) morale(s, -1);
    },
  },
  CLE: {
    name: 'Rust Belt loyalty',
    text: 'A city that never forgets who stayed. The longer you stay, the more it gives back.',
    good: 'Your mood and the coach’s trust grow more with every season you stay',
    bad: 'Lake-effect winters: your body ages a little faster',
    half: (s, c) => {
      const k = Math.min(2, 0.5 + c.years * 0.5);
      morale(s, k);
      trust(s, k);
      s.player.declineMultNext *= 1.01;
    },
  },
  DET: {
    name: 'Bad Boys',
    text: 'Motor City toughness. The practices are as physical as the games.',
    good: 'Interior defense grows and you put on muscle',
    bad: 'The physical practices wear your body down',
    half: (s) => {
      bump(s, 'INT', 0.12);
      addPounds(s.player, 1, 0.5);
      wear(s, 0.6);
    },
  },
  IND: {
    name: 'Hoosier hoops',
    text: 'Basketball is a religion in Indiana, and it is played the right way: pass, cut, shoot.',
    good: 'Shooting and playmaking grow',
    bad: 'Ball-stoppers (playmaking under 60) lose the coach’s trust',
    half: (s) => {
      bump(s, 'SHT', 0.1);
      bump(s, 'PLY', 0.06);
      if (s.player.attrs.PLY < 60) trust(s, -1);
    },
  },
  MIL: {
    name: 'Cold-weather focus',
    text: 'Cold, quiet and friendly: nothing to do in winter but work.',
    good: 'Few distractions: you develop a little faster',
    bad: 'Cold muscles: injury risk goes up a little',
    half: (s) => {
      s.player.growthMultNext *= 1.02;
      s.player.injuryMultNext *= 1.02;
    },
  },
  ATL: {
    name: 'Nightlife capital',
    text: 'The music capital of the South: studio sessions and clubs until sunrise.',
    good: 'Your fame grows with the city’s music scene',
    bad: 'Late nights wear your legs down and cost you athleticism',
    half: (s) => {
      rep(s, 0.6);
      if (!night(s, 0.22)) return;
      wear(s, 2);
      bump(s, 'ATH', -0.3);
      rep(s, 1);
      morale(s, 2);
      return 'Atlanta nights: a studio session, a club, sunrise. Your legs feel it all week.';
    },
  },
  CHA: {
    name: 'Easy living',
    text: 'Golf, lake houses and Sunday drives. Nobody is in a hurry in Charlotte.',
    good: 'Your body recovers: body wear goes down',
    bad: 'Too comfortable: you develop a little slower',
    half: (s) => {
      wear(s, -0.8);
      s.player.growthMultNext *= 0.99;
    },
  },
  MIA: {
    name: 'Heat Culture',
    text: 'The best-conditioned team in the league, with body-fat tests, in a city built for parties.',
    good: 'Your weight moves toward its best, and athleticism grows',
    bad: 'South Beach nights bring a fine and a talk with the front office',
    half: (s) => {
      const u = weightUnits(s.player);
      if (Math.abs(u) > 0.3) addPounds(s.player, u > 0 ? -2 : 1);
      bump(s, 'ATH', 0.08);
      if (!night(s, 0.12)) return;
      morale(s, 3);
      trust(s, -3);
      s.player.bank = Math.max(0, s.player.bank - 0.05);
      return 'South Beach got you. Heat Culture does not forgive: a fine and a long talk with the front office.';
    },
  },
  ORL: {
    name: 'Sunshine State',
    text: 'Theme parks, sunshine and very little pressure.',
    good: 'A fresh body (lower injury risk) and a good mood',
    bad: 'Little urgency: the coach pushes you less and trusts you a little less',
    half: (s) => {
      s.player.injuryMultNext *= 0.97;
      morale(s, 1);
      trust(s, -0.5);
    },
  },
  WAS: {
    name: 'Capital politics',
    text: 'Power, politics and a front office where the winds change every month.',
    good: 'The national media spotlight grows your fame',
    bad: 'Front-office politics: the coach’s trust swings up or down at random',
    half: (s) => {
      rep(s, 0.5);
      trust(s, pick(s.rng, [-2, -1, 1, 2]));
    },
  },
  DEN: {
    name: 'Mile High',
    text: 'A mile above sea level. Visitors gasp for air in the fourth quarter, and so do newcomers.',
    good: 'After a first season of thin air, your athleticism and development grow (more for weak athletes); a home edge for the team',
    bad: 'A weak athlete struggles in his first season',
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
    text: 'A small market that builds through youth and patience.',
    good: 'Players 23 and under develop faster and earn the coach’s trust',
    bad: 'A youth movement: veterans (26 and over) lose the coach’s trust',
    half: (s) => {
      if (s.player.age <= 23) {
        s.player.growthMultNext *= 1.03;
        trust(s, 1);
      } else if (s.player.age >= 26) trust(s, -1);
    },
  },
  POR: {
    name: 'Shoe company town',
    text: 'Rain, coffee and the world’s biggest sneaker company down the road.',
    good: 'Sneaker money and fame',
    bad: 'The longest road trips in the league wear you down',
    half: (s) => {
      s.player.bank += 0.03;
      s.player.earnings += 0.03;
      rep(s, 0.3);
      wear(s, 0.5);
    },
  },
  UTA: {
    name: 'Pick-and-roll school',
    text: 'The city that perfected the pick-and-roll still teaches it every day.',
    good: 'Playmaking and interior defense grow',
    bad: 'The system wants the roll, not the jumper: shooting slips a little',
    half: (s) => {
      bump(s, 'PLY', 0.12);
      bump(s, 'INT', 0.06);
      bump(s, 'SHT', -0.04);
    },
  },
  GSW: {
    name: 'Splash culture',
    text: 'The team that changed the game from deep, with tech money in every courtside seat.',
    good: 'Shooting and range grow',
    bad: 'Losing seasons cost you the coach’s trust',
    half: (s, c) => {
      bump(s, 'SHT', 0.15);
      s.player.range = clamp(s.player.range + 0.5, 0, 99);
      if (!c.winning) trust(s, -1);
    },
  },
  LAC: {
    name: 'The other LA team',
    text: 'Overshadowed in their own city, and playing with a chip on the shoulder.',
    good: 'The chip on your shoulder: coach trust and development go up',
    bad: 'Second fiddle in a shared city: team chemistry dips a little',
    half: (s) => {
      trust(s, 1);
      s.player.growthMultNext *= 1.01;
      chem(s, -0.1);
    },
  },
  LAL: {
    name: 'Hollywood',
    text: 'The brightest lights in sports: celebrities courtside, premieres every night.',
    good: 'Fame grows fastest here',
    bad: 'Paid gigs eat practice time; losing seasons cost you fame',
    half: (s, c) => {
      rep(s, c.winning ? 1.5 : -1);
      if (!night(s, 0.18)) return;
      s.player.bank += 0.08;
      s.player.earnings += 0.08;
      rep(s, 1.5);
      bump(s, focusKey(s), -0.4);
      return 'Hollywood called: a commercial shoot and a premiere. Good money, missed reps.';
    },
  },
  PHX: {
    name: 'Valley heat',
    text: 'Desert sunshine and summer days over 110 degrees.',
    good: 'You sweat off a pound a half, and the sunshine keeps you happy',
    bad: 'Small-ball desert basketball: rebounding slips a little',
    half: (s) => {
      addPounds(s.player, -1);
      morale(s, 1);
      bump(s, 'REB', -0.04);
    },
  },
  SAC: {
    name: 'Light the beam',
    text: 'A government town with one team, and a purple beam over the arena after every win.',
    good: 'Winning seasons: a big lift to your mood and to team chemistry',
    bad: 'A small market: your fame grows slowly',
    half: (s, c) => {
      if (c.winning) {
        morale(s, 2);
        chem(s, 0.15);
      }
      rep(s, -0.2);
    },
  },
  DAL: {
    name: 'Texas-size',
    text: 'Big money, big steaks, big expectations.',
    good: 'Your fame grows',
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
    bad: 'Mid-range players (range under 40) lose the coach’s trust',
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
    bad: 'Defense first: your shooting range slips a little',
    half: (s) => {
      bump(s, 'PER', 0.1);
      bump(s, 'INT', 0.06);
      trust(s, 1);
      s.player.range = clamp(s.player.range - 0.3, 0, 99);
    },
  },
  NOP: {
    name: 'The Big Easy',
    text: 'Jazz, gumbo and a festival every week of the year.',
    good: 'You have never been happier',
    bad: 'Mardi Gras and crawfish boils add pounds',
    half: (s) => {
      morale(s, 2);
      if (!night(s, 0.2)) return;
      addPounds(s.player, 4);
      morale(s, 1);
      return 'New Orleans: Mardi Gras, crawfish boils and beignets. Four pounds and no regrets.';
    },
  },
  SAS: {
    name: 'The Spurs Way',
    text: 'Fundamentals, discipline and the best sports science in the league. Players last longer here.',
    good: 'Basketball IQ grows and you age more slowly',
    bad: 'Egos are not welcome: playing for the spotlight costs you the coach’s trust',
    half: (s) => {
      bump(s, 'IQ', 0.12);
      s.player.declineMultNext *= 0.98;
      const sp = s.season && (s.season.plan === 'spotlight' || s.season.plan2 === 'spotlight');
      if (sp) trust(s, -2);
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
  const ctx: Ctx = { years: s.teamSeasons[t.id] ?? 0, winning: t.w >= t.l };
  const line = c.half(s, ctx);
  fanHalf(s);
  syncWeight(s.player);
  if (line) note(s, line);
  return line ? ` ${line}` : '';
}
