// International origins: the player's country decides how his teenage years look and which
// doors open at 16-18 (see content/origins.ts for the real routes these follow).

import { chance, int, pick, weightedIndex } from '../rng';
import type { Decision, GameState, Offer } from '../types';
import { ORIGINS, US_PREPS, originOf, type Origin, type PathKind } from '../../content/origins';
import { EURO_CLUBS, HOMETOWN_SCHOOLS } from '../../content/teams';
import { NAMES } from '../../content/strings';
import { euOffer, offerChoice } from './offers';
import { collegeStarPenalty, cultureIntro, cultureOf, cultureOffers, pushCultureCrossroads, resolveCultureFork, youthLabel } from './culture';
import { logDecision, pushDecision, pushMoment, userOvr } from './common';
import { signOffer } from './offseason';

/** Picks the country, hometown and youth program (unless the input fixed them). */
export function assignOrigin(s: GameState): Origin {
  const p = s.player;
  const o = p.country ? originOf(p.country) : ORIGINS[weightedIndex(s.rng, ORIGINS.map((x) => x.weight))];
  p.country = o.country;
  if (o.path === 'us') {
    const home = HOMETOWN_SCHOOLS[int(s.rng, 0, HOMETOWN_SCHOOLS.length - 1)];
    if (!p.hometown) p.hometown = home.town;
    if (!p.highSchool) p.highSchool = pick(s.rng, home.schools);
    s.schoolColor = pick(s.rng, home.colors);
  } else {
    if (!p.hometown) p.hometown = `${pick(s.rng, o.towns)}, ${o.country}`;
    const y = pick(s.rng, o.youth);
    if (!p.highSchool) p.highSchool = y.name;
    s.schoolColor = y.color;
  }
  return o;
}

/** The route he is on now: a move to a US prep school puts him on the American path. */
export function pathOf(s: GameState): PathKind {
  if (s.flags.usPrep) return 'us';
  // a Latin American teenager who moved to a Spanish academy is on the European road
  if (s.flags.spain) return 'euro';
  return originOf(s.player.country).path;
}

export function introText(s: GameState): { text: string; lines: string[] } {
  const p = s.player;
  const o = originOf(p.country);
  const pos = NAMES.pos[p.pos].toLowerCase();
  const own = cultureIntro(s);
  if (own) return own;
  switch (o.path) {
    case 'euro':
      return {
        text: `${p.name} grew up in ${p.hometown}. At 14 he joins the ${p.highSchool}, a professional club's youth system: two practices a day, school on the side, and the first team training down the hall.`,
        lines: [`${o.youthLeague} this season`, 'Play well and the first team could call you up as early as 16', 'International players can enter the NBA draft from age 19'],
      };
    case 'academy':
      return {
        text: `${p.name} grew up in ${p.hometown}. A camp coach saw his length and sent his name to the ${p.highSchool}. At 14 he moves into the academy as a ${pos}, number ${p.number}.`,
        lines: ['NBA coaching, school, and games against top teams', 'Most academy players move to a US prep school for exposure', 'The best go on to college, then the draft'],
      };
    case 'aus':
      return {
        text: `${p.name} grew up in ${p.hometown}. At 14 he starts at ${p.highSchool}, chasing the route Australia's NBA players took: the academy, then a US college or the NBL.`,
        lines: [`${o.youthLeague} this season`, 'US college coaches and NBL clubs both scout here'],
      };
    case 'canada':
      return {
        text: `${p.name} grew up in ${p.hometown}. This fall he starts at ${p.highSchool}, a Canadian prep program, as a 14-year-old ${pos}, number ${p.number}.`,
        lines: [`${o.youthLeague} this season`, 'Many Canadians finish high school at a US prep school for exposure'],
      };
    case 'asia':
      return {
        text: `${p.name} grew up in ${p.hometown}. At 14 he enrolls at ${p.highSchool}, one of the country's basketball schools, as a ${pos}, number ${p.number}.`,
        lines: [`${o.youthLeague} this season`, `After school: the ${o.homeLeague === 'BLG' ? 'B.League' : o.homeLeague} or a US college`],
      };
    default:
      return {
        text: `${p.name} grew up in ${p.hometown}. This fall he walks into ${p.highSchool} as a 14-year-old freshman ${pos}, number ${p.number}.`,
        lines: ['Freshman tryouts are next week.', 'JV or varsity: your spot depends on where you rank on the roster.'],
      };
  }
}

const AUS_TEAMS = ['Victoria Metro', 'NSW Country', 'Queensland North', 'WA Pride', 'SA Central', 'Tasmania Devils', 'Canberra Capitals', 'NT Thunder'];
const CAN_TEAMS = ['Northern Lights Prep', 'Grand River Academy', 'Ottawa Valley Prep', 'Niagara Prep', 'Lakehead Collegiate', 'Fraser Valley Academy', 'St. Lawrence Prep', 'Prairie Prep'];
const ASIA_SUFFIX = ['Technical High School', 'Commercial High School', 'Sports High School', 'Academy'];

/** Opponent names and a league label for his youth league; null on the US path. */
export function youthLeagueLook(s: GameState): { names: string[]; label: string } | null {
  const o = originOf(s.player.country);
  const path = pathOf(s);
  if (path === 'us') return null;
  const label = youthLabel(s) ?? o.youthLeague;
  switch (path) {
    case 'euro':
      return { names: EURO_CLUBS.map((c) => `${c.name} juniors`).filter((n) => !n.startsWith(o.homeClub ?? '-') && !s.player.highSchool.startsWith(n.replace(' juniors', ''))), label };
    case 'aus':
      return { names: AUS_TEAMS, label };
    case 'canada':
      return { names: CAN_TEAMS, label };
    case 'asia':
      return { names: o.towns.flatMap((t) => ASIA_SUFFIX.map((x) => `${t} ${x}`)), label };
    default:
      return { names: ['NBA Academy India', 'NBA Academy China', 'NBA Global Academy', 'Basketball Without Borders select', 'Overtime Elite select', 'Georgia prep select', 'Florida prep select', 'Texas prep select'], label };
  }
}

/**
 * The crossroads at 16-17 (after the sophomore or junior season). Europeans may be promoted
 * to the senior team; everyone else outside the US may get a US prep school invitation.
 */
export function pushYouthCrossroads(s: GameState): void {
  // each culture's own fork comes first (career/culture.ts)
  if (pushCultureCrossroads(s)) return;
  if (s.stage !== 'HS' || s.flags.crossroads || s.hsYear < 3) return;
  const o = originOf(s.player.country);
  const path = pathOf(s);
  const ovr = userOvr(s);
  const age = s.player.age;
  if (path === 'euro' && o.homeClub) {
    // a first-team debut at 16-17 needs pro-level tools
    if (ovr < (age <= 16 ? 57 : 55)) return;
    s.flags.crossroads = 1;
    const offer = euOffer(s, o.homeClub, ovr, 3);
    offer.note = 'First-team contract · draft-eligible from 19';
    pushDecision(s, {
      kind: 'youth',
      title: `${o.homeClub} call you up`,
      text: `You are ${age}. The ${o.homeClub} first-team coach wants you training with the pros full time and in the senior rotation when you are ready. The youth team would keep you a star among kids for another year.`,
      choices: [
        { ...offerChoice(offer), id: 'promote', label: `Sign with the ${o.homeClub} first team`, risk: 'Medium' },
        { id: 'stay', label: 'Stay in the youth team', detail: 'More touches and confidence now; the first team can wait.', risk: 'Low' },
      ],
      data: { kind: 'promote', offer },
    });
    return;
  }
  if (path === 'academy' || path === 'canada' || path === 'aus' || path === 'asia') {
    // US prep coaches recruit the best international teenagers; academies place most of theirs
    // US prep schools recruit hard in Africa and Canada, much less in Asia
    const base = path === 'academy' ? (cultureOf(s) === 'latam' ? 0.45 : 0.85) : path === 'canada' ? 0.7 : 0.2;
    if (ovr < 47 || !chance(s.rng, base)) return;
    s.flags.crossroads = 1;
    const prep = pick(s.rng, US_PREPS);
    pushDecision(s, {
      kind: 'youth',
      title: 'A US prep school calls',
      text: `${prep.name} offer you a place for the rest of high school: a national schedule, college coaches at every game, and a long way from home.`,
      choices: [
        { id: 'move', label: `Move to ${prep.name}`, detail: 'Much more exposure to US colleges. Homesickness is real.', risk: 'Medium' },
        { id: 'stay', label: `Stay at ${s.player.highSchool}`, detail: 'Familiar coaches and home; fewer eyes on you.', risk: 'Low' },
      ],
      data: { kind: 'prep', prep: prep.name, color: prep.color },
    });
  }
}

export function resolveYouth(s: GameState, d: Decision, id: string): string {
  const data = d.data ?? {};
  if (data.kind === 'culture') return resolveCultureFork(s, data.fork as string, id);
  if (data.kind === 'promote') {
    if (id === 'promote') {
      const offer = data.offer as Offer;
      signOffer(s, offer, 'youth', []);
      s.flags.earlyPro = 1;
      return `${s.player.age} years old and a professional.`;
    }
    logDecision(s, 'youth', `Stayed in the ${s.player.highSchool} youth team instead of a first-team call-up.`);
    s.player.morale = Math.min(100, s.player.morale + 4);
    return 'Another year as the star of the youth team.';
  }
  if (data.kind === 'prep') {
    if (id === 'move') {
      s.flags.usPrep = 1;
      s.flags.powerhouse = 1;
      s.player.highSchool = data.prep as string;
      s.schoolColor = data.color as string;
      s.player.rep = Math.min(100, s.player.rep + 6);
      s.player.morale = Math.max(0, s.player.morale - 6);
      logDecision(s, 'youth', `Moved to ${data.prep} in the United States.`);
      pushMoment(s, { kind: 'commit', title: data.prep as string, teamName: data.prep as string, color: data.color as string, text: `A new country, a new school, and college coaches in the stands every night.`, lines: ['Recruited like an American prospect from now on', 'Homesick for a while'] });
      return 'You pack two bags and fly out.';
    }
    logDecision(s, 'youth', 'Turned down a US prep school to stay home.');
    s.player.morale = Math.min(100, s.player.morale + 3);
    return 'You stay home.';
  }
  return '';
}

/** Recruiting reach: US colleges see less of players who stay home abroad. */
export function starsForColleges(s: GameState): number {
  return Math.max(1, s.stars - collegeStarPenalty(s));
}

/** Path-specific offers after the last youth season (added to the college and pro offers). */
export function originOffers(s: GameState, offers: Offer[]): Offer[] {
  const o = originOf(s.player.country);
  const path = pathOf(s);
  const ovr = userOvr(s);
  // the roads at home come first; US colleges and the rest follow
  const first: Offer[] = [];
  if (path === 'euro' && o.homeClub && !s.flags.spain && ovr >= 50 && !offers.some((x) => x.teamName === o.homeClub)) {
    const offer = euOffer(s, o.homeClub, ovr, 3);
    offer.note = 'Your club · draft-eligible from 19';
    first.push(offer);
  }
  // each culture's own doors: universities, home leagues, loans (career/culture.ts)
  for (const x of cultureOffers(s)) if (![...first, ...offers].some((y) => y.teamName === x.teamName)) first.push(x);
  return [...first, ...offers];
}
