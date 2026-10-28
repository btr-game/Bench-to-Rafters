// Basketball cultures (playtest round 7: "international players should have very different
// pathways from Americans until university or the league"). Each country belongs to one of
// these cultures, which shape the teenage years: who he plays for, the national showcase he
// chases every year, the crossroads at 16-17 and the doors that open at 18.
//
// Built on how the real systems work (as of 2026):
// - Europe: club academies from 12-14, the NextGen EuroLeague youth tournament, a pro debut
//   at 16-18, loans to second divisions (LEB Oro, Pro B, ABA League 2), or an NCAA scholarship.
// - France: INSEP in Paris takes the best 14-16 year olds; the Espoirs U21 league next.
// - Japan: high school basketball (the Inter-High in summer, the Winter Cup in December), then
//   a Kanto university or a B.League club, which can sign students as special designated players.
// - Korea: basketball high schools, then Korea University, Yonsei and the university league;
//   the KBL draft takes high-school entrants too. Military service by 28 (nationality.ts).
// - China: provincial sports schools from childhood, CBA club youth teams in the teens, then
//   the CBA; the CUBA university league is the road for students.
// - Philippines: UAAP juniors, then UAAP college (Ateneo, La Salle, UP), then the PBA draft or
//   the Asian player quota in Japan and Korea.
// - Australia: the Centre of Excellence and NBA Global Academy in Canberra, then NBL Next Stars
//   or a US college.
// - Canada: prep programs, often a US prep school, then the NCAA or U SPORTS.
// - Africa: Basketball Without Borders camps and NBA Academy Africa in Senegal, then a US prep
//   school and college, or the Basketball Africa League.
// - Latin America: club youth teams (Argentina's Liga de Desarrollo, Flamengo, Franca) or NBA
//   Academy Latin America in Mexico; the best Argentines and Brazilians move to Spanish academies.

import { chance, clamp, int, pick, range } from '../rng';
import type { Decision, GameState, Offer } from '../types';
import { originOf } from '../../content/origins';
import { INT_LEAGUES } from '../../content/teams';
import { adjust, logDecision, pushDecision, pushMoment, userOvr } from './common';
import { euOffer, intOffers, offerId } from './offers';

export type Culture = 'us' | 'europe' | 'france' | 'japan' | 'korea' | 'china' | 'philippines' | 'australia' | 'canada' | 'africa' | 'latam';

const AFRICA = ['Nigeria', 'Senegal', 'Cameroon', 'South Sudan'];
const LATAM = ['Argentina', 'Brazil', 'Mexico', 'Dominican Republic'];

export function cultureOf(s: GameState): Culture {
  const c = s.player.country;
  if (c === 'USA') return 'us';
  if (c === 'France') return 'france';
  if (c === 'Japan') return 'japan';
  if (c === 'South Korea') return 'korea';
  if (c === 'China') return 'china';
  if (c === 'Philippines') return 'philippines';
  if (c === 'Australia') return 'australia';
  if (c === 'Canada') return 'canada';
  if (AFRICA.includes(c)) return 'africa';
  if (LATAM.includes(c)) return 'latam';
  return 'europe';
}

/** Still on his home country's road (not moved to a US prep school or a Spanish academy). */
const atHome = (s: GameState) => !s.flags.usPrep && !s.flags.spain;

/** What his youth team is called at this age. */
export function youthLabel(s: GameState): string | null {
  if (!atHome(s)) return s.flags.spain ? (s.player.age <= 16 ? 'Spanish cadete league (U16)' : 'Spanish junior league (U18)') : null;
  const a = s.player.age;
  const o = originOf(s.player.country);
  switch (cultureOf(s)) {
    case 'europe':
      return a <= 15 ? `${o.youthLeague} (U16)` : `${o.youthLeague} (U18) · NextGen EuroLeague`;
    case 'france':
      return s.flags.insep ? 'INSEP · NM1 (third division)' : a <= 15 ? 'French U15 championship' : 'Espoirs (U21 league)';
    case 'japan':
      return 'High school: Inter-High and Winter Cup';
    case 'korea':
      return 'Korean high school league';
    case 'china':
      return s.flags.cbaYouth ? `${o.homeLeague === 'CBA' ? 'CBA youth league' : 'Youth league'}` : 'Provincial sports school league';
    case 'philippines':
      return 'UAAP juniors';
    case 'australia':
      return s.flags.coe ? 'Centre of Excellence (NBL1)' : 'State league and schools';
    case 'canada':
      return 'OSBA prep league';
    case 'africa':
      return 'NBA Academy Africa schedule';
    case 'latam':
      return o.youthLeague;
    default:
      return null;
  }
}

// ---------- the national showcase, every youth season ----------

interface Showcase {
  name: string;
  from: number;
  /** Text for each finish: [won, final, semis, early]. */
  finish: [string, string, string, string];
}

const SHOWCASES: Partial<Record<Culture, Showcase>> = {
  europe: { name: 'NextGen EuroLeague', from: 16, finish: ['Your junior team wins the NextGen EuroLeague Finals. Every NBA scout in Europe was in the building.', 'You reach the NextGen final and lose. The scouts still wrote your name down.', 'Out in the semifinals of the NextGen Finals.', 'Your team does not qualify for the NextGen Finals.'] },
  france: { name: 'French junior championship', from: 15, finish: ['National champions. The federation calls you the best of your generation.', 'A national final, lost by a basket.', 'Semifinals at the national championship.', 'An early exit at nationals.'] },
  japan: { name: 'Winter Cup', from: 15, finish: ['Winter Cup champions! Tokyo goes wild, and your face is on the evening news.', 'The Winter Cup final, lost in front of a packed arena.', 'Winter Cup semifinals: the best four schools in Japan.', 'Out early at the Winter Cup. Some of your teammates cry on the bus.'] },
  korea: { name: 'National high school championships', from: 15, finish: ['Your school wins the national championship. Korea University and Yonsei both call.', 'Runners-up at nationals.', 'Semifinals at the national championship.', 'An early exit at nationals.'] },
  china: { name: 'National Youth Games', from: 15, finish: ['Gold at the National Youth Games. The provincial team takes notice.', 'Silver at the National Youth Games.', 'Bronze-medal game at the Youth Games.', 'Your province goes out early at the Youth Games.'] },
  philippines: { name: 'UAAP Juniors Finals', from: 15, finish: ['UAAP Juniors champions! The college coaches line up at your door.', 'A UAAP Juniors Finals loss, in front of 15,000 fans.', 'Out in the Final Four.', 'Your team misses the Final Four.'] },
  australia: { name: 'Under-18 Nationals', from: 15, finish: ['Under-18 national champions. NBL clubs and US colleges both call.', 'A national final, lost.', 'Semifinals at Under-18 Nationals.', 'Out in pool play at Nationals.'] },
  canada: { name: 'OSBA championship', from: 15, finish: ['OSBA champions. US college coaches fly up to see you.', 'The OSBA final, lost.', 'Semifinals in the OSBA playoffs.', 'Out early in the OSBA playoffs.'] },
  africa: { name: 'Basketball Without Borders Africa', from: 15, finish: ['Camp MVP at Basketball Without Borders Africa. NBA scouts take your number.', 'All-Star at the BWB camp.', 'A solid week at the BWB camp.', 'You are invited to BWB, but you mostly watch.'] },
  latam: { name: 'South American youth championship', from: 15, finish: ['Gold for your country at the South American championship.', 'Silver at the South American championship.', 'Fourth at the South American championship.', 'Not selected for the national youth team this year.'] },
};

/** The yearly showcase for a youth player at home: a story page and a little reputation. */
export function playShowcase(s: GameState): void {
  if (s.stage !== 'HS' || !atHome(s)) return;
  const sc = SHOWCASES[cultureOf(s)];
  if (!sc || s.player.age < sc.from) return;
  // a youth player's level against his age group
  const lvl = userOvr(s) - (40 + (s.player.age - 14) * 4) + range(s.rng, -6, 6);
  const i = lvl >= 12 ? 0 : lvl >= 7 ? 1 : lvl >= 2 ? 2 : 3;
  s.player.rep = clamp(s.player.rep + [6, 4, 2, 0][i], 0, 100);
  s.player.morale = adjust(s.player.morale, [6, 2, 1, -3][i]);
  s.flags.showcase = Math.max(s.flags.showcase ?? 0, 3 - i);
  logDecision(s, 'showcase', `${sc.name}: ${sc.finish[i].split('.')[0].toLowerCase()}.`);
  pushMoment(s, { kind: 'tournament', title: sc.name, color: originOf(s.player.country).nationColor, text: sc.finish[i], lines: [youthLabel(s) ?? ''] });
}

// ---------- the crossroads at 15-17 ----------

/**
 * The culture's own fork in the road, offered once. Returns true when it pushed a decision.
 * (Europe's first-team call-up and the US prep invitation stay in origin.ts.)
 */
export function pushCultureCrossroads(s: GameState): boolean {
  if (s.stage !== 'HS' || !atHome(s) || s.flags.cultureFork) return false;
  const ovr = userOvr(s);
  const age = s.player.age;
  const ask = (title: string, text: string, choices: Decision['choices'], kind: string) => {
    s.flags.cultureFork = 1;
    pushDecision(s, { kind: 'youth', title, text, choices, data: { kind: 'culture', fork: kind } });
    return true;
  };
  switch (cultureOf(s)) {
    case 'france':
      if (age <= 16 && ovr >= 46)
        return ask('INSEP calls', 'The national institute in Paris has picked twenty teenagers from the whole country. You are one of them: boarding school, two practices a day, and a team in the third division against grown men.', [
          { id: 'go', label: 'Move to INSEP in Paris', detail: 'The best coaching in France. Far from home at 15.', risk: 'Medium' },
          { id: 'stay', label: 'Stay at your club', detail: 'Your coaches, your family, the Espoirs next year.', risk: 'Low' },
        ], 'insep');
      return false;
    case 'china':
      if (age >= 15 && ovr >= 46)
        return ask('The provincial team', 'The CBA club in your province wants you in its youth team: you would train with the professionals and live at the club. It means leaving regular school for good.', [
          { id: 'go', label: 'Join the CBA youth team', detail: 'Pro coaching every day. School becomes an afterthought.', risk: 'Medium' },
          { id: 'stay', label: 'Stay in school and the sports school', detail: 'Keep the university door open (the CUBA league).', risk: 'Low' },
        ], 'cba');
      return false;
    case 'japan':
      if (age >= 15 && ovr >= 47)
        return ask('A B.League youth team', 'A B.League club invites you to its U18 team. Most of Japan\'s best still choose high school basketball and the Winter Cup.', [
          { id: 'go', label: 'Join the club\'s U18 team', detail: 'Pro coaching, a straight road into the B.League. No Winter Cup.', risk: 'Medium' },
          { id: 'stay', label: 'Stay for the Winter Cup', detail: 'National TV, school pride, and university scouts.', risk: 'Low' },
        ], 'blg');
      return false;
    case 'australia':
      if (age >= 15 && ovr >= 47)
        return ask('Centre of Excellence', 'Basketball Australia invites you to the Centre of Excellence in Canberra, home of the NBA Global Academy: full-time training and NBL1 games against men.', [
          { id: 'go', label: 'Move to Canberra', detail: 'Where Giddey and Daniels came from.', risk: 'Low' },
          { id: 'stay', label: 'Stay home with your state team', risk: 'Low' },
        ], 'coe');
      return false;
    case 'latam': {
      const c = s.player.country;
      if (age >= 15 && ovr >= 47 && (c === 'Argentina' || c === 'Brazil') && chance(s.rng, 0.7)) {
        const club = pick(s.rng, ['Real Madrid', 'FC Barcelona', 'Joventut Badalona', 'Unicaja Málaga']);
        return ask(`${club} want you`, `A scout from ${club} has watched you for a year. They offer a place in their academy in Spain: the road many of your country's best players took to the NBA.`, [
          { id: 'go', label: `Move to the ${club} academy`, detail: 'European coaching and a pro path. An ocean from home.', risk: 'Medium' },
          { id: 'stay', label: 'Stay with your club at home', detail: 'The Liga Nacional or a US college later.', risk: 'Low' },
        ], `spain:${club}`);
      }
      return false;
    }
    case 'africa':
      // the US prep invitation (origin.ts) is the usual road out of the academy
      return false;
    default:
      return false;
  }
}

export function resolveCultureFork(s: GameState, fork: string, id: string): string {
  if (id !== 'go') {
    s.player.morale = adjust(s.player.morale, 3);
    logDecision(s, 'youth', 'Chose to stay on the road at home.');
    return 'You stay where you are.';
  }
  const p = s.player;
  if (fork === 'insep') {
    s.flags.insep = 1;
    p.highSchool = 'INSEP (Paris)';
    s.schoolColor = '#002395';
    p.growthMultNext *= 1.12;
    p.morale = adjust(p.morale, -4);
    logDecision(s, 'youth', 'Moved to INSEP, the national institute in Paris.');
    pushMoment(s, { kind: 'commit', title: 'INSEP', teamName: 'INSEP', color: '#002395', text: 'A dorm room in the Bois de Vincennes, two practices a day, and grown men in the third division.', lines: ['Faster development', 'Pro clubs watch every game'] });
    return 'You pack for Paris.';
  }
  if (fork === 'cba') {
    s.flags.cbaYouth = 1;
    p.highSchool = `${originOf(p.country).youth[0]?.name ?? 'CBA youth team'}`;
    p.growthMultNext *= 1.1;
    logDecision(s, 'youth', 'Joined his province\'s CBA youth team.');
    return 'You move into the club dormitory.';
  }
  if (fork === 'blg') {
    s.flags.blgYouth = 1;
    p.highSchool = `${pick(s.rng, INT_LEAGUES.find((l) => l.key === 'BLG')!.teams)[0]} U18`;
    p.growthMultNext *= 1.08;
    logDecision(s, 'youth', 'Joined a B.League club\'s U18 team.');
    return 'Your first practice is with the pros watching.';
  }
  if (fork === 'coe') {
    s.flags.coe = 1;
    p.highSchool = 'Centre of Excellence (Canberra)';
    s.schoolColor = '#00843D';
    p.growthMultNext *= 1.08;
    logDecision(s, 'youth', 'Moved to the Centre of Excellence in Canberra.');
    return 'You move to Canberra.';
  }
  if (fork.startsWith('spain:')) {
    const club = fork.slice(6);
    s.flags.spain = 1;
    p.highSchool = `${club} academy`;
    s.schoolColor = club === 'Real Madrid' ? '#4B2E83' : club === 'FC Barcelona' ? '#A50044' : '#1E5B3A';
    p.morale = adjust(p.morale, -6);
    p.growthMultNext *= 1.08;
    logDecision(s, 'youth', `Moved to the ${club} academy in Spain.`);
    pushMoment(s, { kind: 'commit', title: `${club} academy`, teamName: club, color: s.schoolColor, text: 'A new country, a new language, and the best youth coaching in Europe.', lines: ['On the European road from now on', 'Homesick for a while'] });
    return 'You fly to Spain.';
  }
  return '';
}

// ---------- the doors at 18 ----------

/** A place at a university in his country's league (no salary; still draft-eligible). */
function uniOffer(s: GameState, key: string, top: boolean): Offer {
  const L = INT_LEAGUES.find((l) => l.key === key)!;
  const [name, color] = top ? L.teams[int(s.rng, 0, 1)] : pick(s.rng, L.teams);
  return {
    id: offerId(s),
    level: 'INT',
    teamId: `INT-${L.key}-${name}`,
    teamName: name,
    teamColor: color,
    kind: 'int',
    salary: 0,
    years: 4,
    role: userOvr(s) >= L.strength + 6 ? 'starter' : 'rotation',
    outlook: L.name,
    lastRecord: `${int(s.rng, 10, 20)}–${int(s.rng, 2, 10)}`,
    note: 'University: a degree, four seasons, and NBA draft eligibility from 19',
  };
}

const home = (s: GameState, league: string, note?: string): Offer[] => intOffers(s, userOvr(s), 1, { league }).map((o) => (note ? { ...o, note } : o));

/** The doors that open after the last youth season, by culture (added to the other offers). */
export function cultureOffers(s: GameState): Offer[] {
  const ovr = userOvr(s);
  const out: Offer[] = [];
  if (s.flags.spain) {
    const club = s.player.highSchool.replace(' academy', '');
    if (ovr >= 48) {
      const o = euOffer(s, club === 'Real Madrid' || club === 'FC Barcelona' ? club : 'Real Madrid', ovr, 3);
      if (club !== 'Real Madrid' && club !== 'FC Barcelona') Object.assign(o, { teamName: club });
      out.push({ ...o, note: 'Your academy club · draft-eligible from 19' });
    }
    out.push(...home(s, 'EU2', 'Loan to a second-division club: real minutes at 18'));
    return out;
  }
  if (!atHome(s)) return out;
  switch (cultureOf(s)) {
    case 'europe':
    case 'france':
      if (ovr >= 50) out.push(...home(s, 'EC'));
      out.push(...home(s, 'EU2', 'Loan to a second-division club: real minutes at 18'));
      if (s.flags.insep && ovr >= 52) out.push(...home(s, 'EC', 'Pro A club out of INSEP · draft-eligible from 19'));
      break;
    case 'japan':
      out.push(uniOffer(s, 'UJP', ovr >= 52 || (s.flags.showcase ?? 0) >= 2));
      if (ovr >= 52 || s.flags.blgYouth) out.push(...home(s, 'BLG', s.flags.blgYouth ? 'Your club\'s first team' : 'Special designated player contract'));
      break;
    case 'korea':
      out.push(uniOffer(s, 'UKR', ovr >= 52 || (s.flags.showcase ?? 0) >= 2));
      if (ovr >= 55) out.push(...home(s, 'KBL', 'KBL draft: straight out of high school'));
      break;
    case 'china':
      if (s.flags.cbaYouth || ovr >= 54) out.push(...home(s, 'CBA', s.flags.cbaYouth ? 'Promoted from the youth team' : undefined));
      if (!s.flags.cbaYouth) out.push(uniOffer(s, 'CUBA', ovr >= 50));
      break;
    case 'philippines':
      out.push(uniOffer(s, 'UAAP', ovr >= 50 || (s.flags.showcase ?? 0) >= 2));
      if (ovr >= 56) out.push(...home(s, chance(s.rng, 0.5) ? 'BLG' : 'KBL', 'Asian player quota'));
      break;
    case 'australia':
      if (ovr >= 53 || s.flags.coe) out.push(...intOffers(s, ovr, 1, { nextStars: true }));
      break;
    case 'canada':
      out.push(uniOffer(s, 'USP', ovr >= 52));
      break;
    case 'africa':
      if (ovr >= 46) out.push(...home(s, 'BAL'));
      break;
    case 'latam':
      if (ovr >= 45) out.push(...home(s, 'LAT', 'Your club\'s first team'));
      break;
    default:
      break;
  }
  return out;
}

/** US colleges see less of players who stay home: stars knocked off for college offers. */
export function collegeStarPenalty(s: GameState): number {
  if (!atHome(s)) return s.flags.spain ? 1 : 0;
  switch (cultureOf(s)) {
    case 'us':
    case 'canada':
      return 0;
    case 'japan':
    case 'korea':
    case 'china':
    case 'philippines':
      return 2;
    default:
      return 1;
  }
}

/** A pro whose contract is up: his home league is always interested if he is good enough. */
export function homeLeagueOffers(s: GameState): Offer[] {
  const o = originOf(s.player.country);
  const key = cultureOf(s) === 'europe' || cultureOf(s) === 'france' ? 'EC' : o.homeLeague;
  if (!key || key === 'NBL' && cultureOf(s) !== 'australia') return [];
  const L = INT_LEAGUES.find((l) => l.key === key);
  if (!L || L.amateur || userOvr(s) < L.strength - 10) return [];
  return home(s, key, 'A club back home');
}

/** The first story page for cultures whose road differs from the generic one in origin.ts. */
export function cultureIntro(s: GameState): { text: string; lines: string[] } | null {
  const p = s.player;
  const where = `${p.name} grew up in ${p.hometown}.`;
  switch (cultureOf(s)) {
    case 'france':
      return { text: `${where} At 14 he joins the ${p.highSchool}'s youth system. France finds its best teenagers early: the federation's scouts watch every U15 game in the country.`, lines: ['The best 14-16 year olds are picked for INSEP in Paris', 'Then the Espoirs (U21) league and a pro debut', 'International players can enter the NBA draft from 19'] };
    case 'japan':
      return { text: `${where} At 14 he enrolls at ${p.highSchool}, a basketball powerhouse. In Japan, high school basketball is a national event: the Inter-High every summer, the Winter Cup every December, on national TV.`, lines: ['Win the Winter Cup and the whole country knows your name', 'After high school: a Kanto university or a B.League club', 'A US college only for the very best'] };
    case 'korea':
      return { text: `${where} At 14 he enrolls at ${p.highSchool}. Korean basketball runs through its schools: early-morning practice, national tournaments, and the dream of Korea University or Yonsei.`, lines: ['After high school: university, or the KBL draft straight away', 'Every Korean man serves about 18 months in the military by 28', 'An Asian Games gold or an Olympic medal brings an exemption'] };
    case 'china':
      return { text: `${where} Picked out as a tall kid at a primary school, he trains at a provincial sports school: practice twice a day, lessons in between. At 14 he plays for ${p.highSchool}.`, lines: ['The provincial CBA club picks its youth team from here', 'Stay in school and the university league (CUBA) is the other road', 'The CBA is the goal for almost everyone'] };
    case 'philippines':
      return { text: `${where} At 14 he plays for ${p.highSchool} in the UAAP juniors, where college basketball is as big as the pros and 15,000 fans come to a final.`, lines: ['After high school: Ateneo, La Salle or UP in the UAAP', 'Then the PBA draft, or the Asian quota in Japan and Korea'] };
    case 'africa':
      return { text: `${where} A Basketball Without Borders coach saw his length at a camp and sent his name to the ${p.highSchool} in Saly, Senegal. At 14 he moves into the academy as a ${p.pos}.`, lines: ['NBA coaching, school, and games against top teams', 'Most academy players move to a US prep school for exposure', 'The Basketball Africa League is the pro league at home'] };
    case 'latam':
      return { text: `${where} At 14 he plays for ${p.highSchool}, in a country where the club is everything: youth teams from age 8, packed gyms, and the pros practicing next door.`, lines: [`${originOf(p.country).youthLeague} this season`, 'Spanish clubs scout the best teenagers hard', 'After 18: the club\'s first team, a US college, or Europe'] };
    default:
      return null;
  }
}

/** The "where next" line after the last youth season, for players who are not on the US road. */
export function splitLine(s: GameState): string | null {
  if (cultureOf(s) === 'us' || s.flags.usPrep) return null;
  const sc = SHOWCASES[cultureOf(s)];
  const best = s.flags.showcase ?? 0;
  const shown = sc && best > 0 ? `Best finish at the ${sc.name}: ${['', 'semifinals', 'the final', 'champions'][best]}. ` : '';
  switch (cultureOf(s)) {
    case 'japan':
      return `${shown}High school is over. Universities, B.League clubs and, for the very best, US colleges are calling.`;
    case 'korea':
      return `${shown}High school is over. Korea University, Yonsei and the KBL draft are the usual roads.`;
    case 'china':
      return `${shown}Time to choose: the CBA or university.`;
    case 'philippines':
      return `${shown}The UAAP colleges want you. So, maybe, do clubs abroad.`;
    case 'canada':
      return `${shown}NCAA programs and Canadian universities (U SPORTS) are calling.`;
    default:
      return `${shown}Your youth years are over. Clubs at home and abroad, and some US colleges, have made offers.`;
  }
}
