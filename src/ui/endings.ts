// The twelve endings (round 36, owner: "do all 12"). A finished career gets the first ending that
// fits it, in this order: the rafters (a team retires his number; screens/Finale.tsx's ceremony),
// then Enshrined (the Hall of Fame), Ring bearer (an NBA title), All-Star (an All-Star or All-NBA
// team, or an MVP), Legend of Europe (three seasons abroad with a EuroLeague title or its MVP; the
// owner agreed it ranks above the two NBA tenures), The long haul (six NBA seasons), Made it (any
// NBA game), Passport (a pro career overseas), The grinder (the G League), One shining moment (a
// college star who never went pro), Cap and gown (college) and Hoops dream (it ended in high
// school). Every ending but the rafters opens on a scene of its own (art/Endings.tsx): a place, a
// moment, three lines written from the career and one of where he is now; then the same credits,
// title and thank-you. This file is pure: what fits, and what the scene says.

import type { GameState, SeasonRecord } from '../engine/types';
import { ENDING_IDS, type EndingId } from '../engine/achievements36';
import { count, hallOfFame, nbaTitles, raftersTeams } from '../engine/awards/legacy';
import { NBA_TEAMS } from '../content/teams';

export { ENDING_IDS, type EndingId };

/** Each ending's name (the book's Endings page shows it once seen), its place, and what it takes
 * (the dev deck's Catalog; the book keeps that a riddle). */
export const ENDINGS: Record<EndingId, { name: string; place: string; fits: string }> = {
  rafters: { name: 'The rafters', place: 'The arena at night, his jersey rising', fits: 'A team retires his number.' },
  enshrined: { name: 'Enshrined', place: 'The Hall of Fame stage', fits: 'The Hall of Fame, with no number retired.' },
  ring: { name: 'Ring bearer', place: 'A ring box under a desk lamp', fits: 'An NBA title.' },
  allstar: { name: 'All-Star', place: 'Every All-Star jersey in his garage', fits: 'An All-Star or All-NBA team, or an MVP.' },
  eurolegend: { name: 'Legend of Europe', place: 'Flares and scarves in a European arena', fits: 'Three seasons abroad, and a EuroLeague title or its MVP.' },
  longhaul: { name: 'The long haul', place: 'Clearing out his last locker', fits: 'Six NBA seasons or more.' },
  madeit: { name: 'Made it', place: 'His first NBA jersey, framed at home', fits: 'An NBA game.' },
  passport: { name: 'Passport', place: 'A departures board of every city he played in', fits: 'A season abroad, in Europe or another league.' },
  grinder: { name: 'The grinder', place: 'The team bus at night on the highway', fits: 'A season in the G League.' },
  shining: { name: 'One shining moment', place: 'Cutting down the net', fits: 'An NCAA title, the Naismith, All-American first team or a conference Player of the Year.' },
  gown: { name: 'Cap and gown', place: 'Graduation day, a ball under his arm', fits: 'A college season.' },
  dream: { name: 'Hoops dream', place: 'The driveway hoop at dusk', fits: 'None of these: it ended in high school.' },
};

/** The honours that make an All-Star ending, a Legend of Europe and a college star. */
const STAR_KEYS = ['ALLSTAR', 'ALLNBA1', 'ALLNBA2', 'ALLNBA3', 'MVP'];
const EURO_KEYS = ['EUTITLE', 'EUMVP'];
const COLLEGE_KEYS = ['NCAATITLE', 'NAISMITH', 'AA1', 'CONFPOY'];
const ABROAD = ['EU', 'INT'];

const has = (g: GameState, keys: string[]) => g.awards.some((a) => keys.includes(a.key));
/** Seasons he played at these levels: a season with games in it, each year once. */
const seasonsAt = (g: GameState, ...lv: string[]) => new Set(g.history.filter((h) => lv.includes(h.level) && h.line.gp > 0).map((h) => h.year)).size;

/** Which of the twelve a finished career gets: the first that fits. */
export function endingOf(g: GameState): EndingId {
  if (raftersTeams(g).length) return 'rafters';
  if (hallOfFame(g)) return 'enshrined';
  if (nbaTitles(g) > 0) return 'ring';
  if (has(g, STAR_KEYS)) return 'allstar';
  const abroad = seasonsAt(g, ...ABROAD);
  if (abroad >= 3 && has(g, EURO_KEYS)) return 'eurolegend';
  if (seasonsAt(g, 'NBA') >= 6) return 'longhaul';
  if (g.nbaGames > 0) return 'madeit';
  if (abroad > 0) return 'passport';
  if (seasonsAt(g, 'GL') > 0) return 'grinder';
  if (has(g, COLLEGE_KEYS)) return 'shining';
  if (seasonsAt(g, 'NCAA') > 0) return 'gown';
  return 'dream';
}

// ---- the twists, layered on any ending: a line, or a small touch in the scene ----

interface Twists {
  /** It ended on a farewell tour: the ending opens on the last road ovation. */
  farewell: boolean;
  /** The age he walked away at, before 30, by his own choice. */
  young: number | null;
  /** The age he played to, 40 or older. */
  iron: number | null;
  wed: boolean;
  child: 'son' | 'daughter' | null;
  /** The year of his first Olympic gold: the medal is in the scene's last shot. */
  gold: number | null;
  /** A son's career: his father's name. */
  father: string | null;
  /** The Rough Road. */
  oath: boolean;
  /** The year of a rare late-career leap, and of a career-altering injury (both optional flags). */
  leap: number | null;
  injury: number | null;
}

/** Why he retired, as the log has it. */
const reasonOf = (g: GameState) => [...g.log].reverse().find((l) => l.kind === 'retire')?.text ?? '';
const year = (n: number | undefined) => (n && n > 1900 ? n : null);

export function twistsOf(g: GameState): Twists {
  const why = reasonOf(g);
  const age = g.retiredAt ?? g.player.age;
  const pro = seasonsAt(g, 'GL', 'EU', 'INT', 'NBA') > 0;
  return {
    farewell: /farewell/i.test(why),
    young: pro && age < 30 && /own terms|walk away|call it a career/i.test(why) ? age : null,
    iron: age >= 40 ? age : null,
    wed: !!g.flags.wed,
    child: g.flags.child ? (g.flags.childGirl ? 'daughter' : 'son') : null,
    gold: g.awards.find((a) => a.key === 'OLYGOLD')?.year ?? null,
    father: g.parent?.name ?? null,
    oath: !!g.flags.oath,
    leap: year(g.flags.nextStep),
    injury: year(g.flags.careerInjury),
  };
}

/** The one twist the scene speaks of, the rarest first (the credits list the rest). */
function twistLine(t: Twists): string | null {
  if (t.injury) return `The injury in ${t.injury} changed everything after it. He played on anyway.`;
  if (t.leap) return `In ${t.leap}, late in the career, he took a leap nobody saw coming.`;
  if (t.oath) return 'He took the Rough Road, the hard way all the way, and finished it.';
  if (t.father) return `His father, ${t.father}, walked this road first. Now they both have a story.`;
  if (t.wed || t.child) return `In the front row for all of it: ${t.wed ? `his wife${t.child ? ` and their ${t.child}` : ''}` : `his ${t.child}`}.`;
  if (t.iron) return `Iron man: he was still lacing them up at ${t.iron}.`;
  if (t.young) return `He walked away at ${t.young}, on his own terms.`;
  return null;
}

// ---- what the scene shows and says ----

/** What the pixel scene needs from the career (art/Endings.tsx; a tile in the book uses its defaults). */
export interface SceneArt {
  /** The colour of the team the scene belongs to. */
  color: string;
  number: number;
  surname: string;
  /** Labels the scene writes: the years under the All-Star jerseys, the cities on the board. */
  labels: string[];
  /** A second colour per label: each All-Star jersey's side. */
  tints: string[];
  family: boolean;
  gold: boolean;
}

interface Scene {
  kind: EndingId;
  /** The caption the scene opens on: the ending's name, then a fact. */
  title: string;
  fact: string;
  lines: string[];
  now: string;
  /** The Olympic gold in the last shot. */
  gold: string | null;
  /** The farewell tour's ovation, when the career ended on one: its team. */
  ovation: { team: string; color: string } | null;
  art: SceneArt;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const townOf = (g: GameState) => g.player.hometown.split(',')[0];
const surnameOf = (name: string) => name.split(' ').slice(-1)[0];
const isAssignment = (h: SeasonRecord) => /assignment/i.test(h.teamName);
const rowsAt = (g: GameState, ...lv: string[]) => g.history.filter((h) => lv.includes(h.level) && h.line.gp > 0 && !isAssignment(h));
/** "A, B and C"; past `most`, the first of them "and more". */
const listed = (xs: string[], most = 99) => (xs.length > most ? `${xs.slice(0, most).join(', ')} and more` : xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The team he gave the most seasons to among these rows (the first one on a tie). */
function mainTeam(rows: SeasonRecord[]): { name: string; id: string; color: string; seasons: number; first: number } | null {
  const by = new Map<string, { name: string; id: string; color: string; seasons: number; first: number }>();
  for (const h of rows) {
    const t = by.get(h.teamName) ?? { name: h.teamName, id: h.teamId, color: h.teamColor, seasons: 0, first: h.year };
    t.seasons += 1;
    by.set(h.teamName, t);
  }
  return [...by.values()].sort((a, b) => b.seasons - a.seasons || a.first - b.first)[0] ?? null;
}

/** The cities of the clubs whose names don't start with one (content/teams.ts names a club, and
 * its league's country): every EuroLeague club, the others abroad and the G League's exceptions. */
const CITY: Record<string, string> = {
  'Real Madrid': 'Madrid', 'FC Barcelona': 'Barcelona', Fenerbahçe: 'Istanbul', Olympiacos: 'Piraeus', Panathinaikos: 'Athens', 'AS Monaco': 'Monaco',
  'Anadolu Efes': 'Istanbul', Partizan: 'Belgrade', Žalgiris: 'Kaunas', 'Virtus Bologna': 'Bologna', 'Maccabi Tel Aviv': 'Tel Aviv', 'ALBA Berlin': 'Berlin',
  'Crvena zvezda': 'Belgrade', 'Bayern Munich': 'Munich', 'Olimpia Milano': 'Milan', Baskonia: 'Vitoria', 'Paris Basketball': 'Paris', 'LDLC ASVEL': 'Lyon',
  'New Zealand Breakers': 'Auckland', 'South East Melbourne Phoenix': 'Melbourne', 'Alvark Tokyo': 'Tokyo', 'Sunrockers Shibuya': 'Tokyo', 'Ryukyu Golden Kings': 'Okinawa',
  'Seoul SK Knights': 'Seoul', 'Seoul Samsung Thunders': 'Seoul', 'Sangmu Phoenix': 'Mungyeong', 'Unicaja Málaga': 'Malaga', 'Joventut Badalona': 'Badalona',
  'Gran Canaria': 'Las Palmas', 'JL Bourg': 'Bourg', 'ratiopharm Ulm': 'Ulm', 'Dolomiti Trento': 'Trento', 'Cedevita Olimpija': 'Ljubljana', 'Mega Basket': 'Belgrade',
  'Rytas Vilnius': 'Vilnius', 'Hapoel Tel Aviv': 'Tel Aviv', 'Türk Telekom': 'Ankara', 'Aris Thessaloniki': 'Thessaloniki', Budućnost: 'Podgorica', Bahçeşehir: 'Istanbul',
  'Real Madrid B': 'Madrid', 'Barça B': 'Barcelona', Estudiantes: 'Madrid', 'OKK Beograd': 'Belgrade', 'Vrijednosnice Osijek': 'Osijek', 'Rytas-2': 'Vilnius',
  'Varese Academy': 'Varese', 'Fenerbahçe B': 'Istanbul', 'Ludwigsburg Juniors': 'Ludwigsburg', 'Petro de Luanda': 'Luanda', 'Al Ahly': 'Cairo', 'US Monastir': 'Monastir',
  'AS Douanes': 'Dakar', 'Rivers Hoopers': 'Port Harcourt', APR: 'Kigali', 'FUS Rabat': 'Rabat', 'Stade Malien': 'Bamako', 'Boca Juniors': 'Buenos Aires',
  Quimsa: 'Santiago del Estero', Instituto: 'Cordoba', Flamengo: 'Rio de Janeiro', Minas: 'Belo Horizonte', 'Fuerza Regia': 'Monterrey', 'Diablos Rojos': 'Mexico City',
  'Metros de Santiago': 'Santiago', 'Leones de Santo Domingo': 'Santo Domingo', 'Hakuoh University': 'Oyama', 'Tokai University': 'Hiratsuka',
  'Sun Yat-sen University': 'Guangzhou', 'Huaqiao University': 'Xiamen', 'Shanghai Jiao Tong': 'Shanghai', 'Zhejiang University': 'Hangzhou', 'Wuhan University': 'Wuhan',
  'Tsinghua University': 'Beijing', 'Peking University': 'Beijing', 'Beijing Normal': 'Beijing', 'Carleton Ravens': 'Ottawa', 'Ottawa Gee-Gees': 'Ottawa',
  'Victoria Vikes': 'Victoria', 'Alberta Golden Bears': 'Edmonton', 'McMaster Marauders': 'Hamilton', 'UBC Thunderbirds': 'Vancouver', 'Laval Rouge et Or': 'Quebec City',
  'Delaware Blue Coats': 'Wilmington', 'Raptors 905': 'Mississauga', 'Rip City Remix': 'Portland', 'Valley Suns': 'Phoenix', 'Rio Grande Valley Vipers': 'Edinburg',
  'Windy City Bulls': 'Chicago', 'Motor City Cruise': 'Detroit', 'Capital City Go-Go': 'Washington', 'South Bay Lakers': 'El Segundo',
};
// the leagues of Korea's, Japan's and the Philippines' university teams, and the PBA, play in their capitals
for (const t of ['Korea University Tigers', 'Yonsei Eagles', 'Chung-Ang Blue Dragons', 'Kyung Hee', 'Sungkyunkwan', 'Dankook', 'Hanyang', 'Myongji']) CITY[t] = 'Seoul';
for (const t of ['Senshu University', 'Nihon University', 'Aoyama Gakuin', 'Toyo University', 'Waseda University', 'Keio University']) CITY[t] = 'Tokyo';
for (const t of ['Ateneo Blue Eagles', 'De La Salle Green Archers', 'UP Fighting Maroons', 'UST Growling Tigers', 'FEU Tamaraws', 'NU Bulldogs', 'Adamson Soaring Falcons', 'UE Red Warriors', 'San Miguel Beermen', 'Barangay Ginebra', 'TNT Tropang Giga', 'Magnolia Hotshots', 'Meralco Bolts', 'Rain or Shine', 'NLEX Road Warriors', 'Converge FiberXers']) CITY[t] = 'Manila';

/** The city a season was played in: an NBA team's own, a club's from the list, else a G League
 * team's name less its nickname, a club abroad's first word, a college's name. */
function cityOf(h: Pick<SeasonRecord, 'level' | 'teamId' | 'teamName'>): string {
  if (h.level === 'NBA') return NBA_TEAMS.find((t) => t.abbr === h.teamId)?.city ?? h.teamName;
  const name = h.teamName.replace(/\s*\(.*\)$/, '');
  if (CITY[name]) return CITY[name];
  const words = name.split(' ');
  if (h.level === 'NCAA' || words.length < 2) return name;
  return h.level === 'GL' ? words.slice(0, -1).join(' ') : words[0];
}

/** A city as the departures board can show it, twelve letters at most: "Port Harcourt" as P HARCOURT. */
function boardCity(city: string): string {
  const plain = city.normalize('NFD').replace(/[^A-Za-z -]/g, '').toUpperCase();
  if (plain.length <= 12) return plain;
  const [head, ...rest] = plain.split(' ');
  return `${head[0]} ${rest.join(' ')}`.slice(0, 12).trim();
}

/** A number at the start of a line, in words up to twenty: "Nine seasons". */
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
const Count = (n: number, one: string, many = `${one}s`) => `${WORDS[n] ?? n} ${n === 1 ? one : many}`;

const EAST = new Set(NBA_TEAMS.filter((t) => t.conf === 'East').map((t) => t.abbr));

/** The scene for a finished career's ending (not the rafters: that one has its ceremony). */
export function sceneOf(g: GameState, kind: EndingId = endingOf(g)): Scene {
  const p = g.player;
  const town = townOf(g);
  const t = twistsOf(g);
  const nba = rowsAt(g, 'NBA');
  const last = [...g.history].reverse().find((h) => h.line.gp > 0 && !isAssignment(h)) ?? g.history[g.history.length - 1];
  const art: SceneArt = { color: last?.teamColor ?? '#C8102E', number: p.number, surname: surnameOf(p.name).toUpperCase(), labels: [], tints: [], family: t.wed || !!t.child, gold: !!t.gold };
  let fact = '';
  let lines: string[] = [];
  let now = '';
  if (kind === 'enshrined') {
    const best = mainTeam(nba);
    const first = hallOfFame(g) === 'first';
    if (best) art.color = best.color;
    const rings = nbaTitles(g);
    const mvps = count(g, 'MVP');
    const stars = count(g, 'ALLSTAR');
    fact = first ? 'The Hall of Fame · first ballot' : `The Hall of Fame · class of ${(last?.year ?? g.year) + 4}`;
    lines = [
      first ? `“First ballot. I was a kid from ${town} who just wanted to make varsity.”` : `“A kid from ${town}, in the Hall of Fame. I had to read the letter twice.”`,
      rings ? `“${Count(rings, 'ring')}. Every one of them belongs to the guys beside me too.”` : mvps ? `“${mvps === 1 ? 'The MVP' : Count(mvps, 'MVP')}, and I still remember the misses better than the makes.”` : stars ? `“${Count(stars, 'All-Star game')}, and I was nervous at every one of them.”` : `“${Count(nba.length, 'season')}. I was never the loudest. I was the last one to leave the gym.”`,
      '“No team ever hung my number. That’s all right: this hall has room for it.”',
    ];
    now = `Today he calls games on TV, the Hall of Fame jacket hanging in his closet.`;
  } else if (kind === 'ring') {
    const won = g.awards.filter((a) => a.key === 'TITLE' || a.key === 'TITLEKEY').map((a) => ({ year: a.year, row: nba.find((h) => h.year === a.year) }));
    const firstWin = won[0];
    if (firstWin?.row) art.color = firstWin.row.teamColor;
    const ringTeams = [...new Set(won.map((w) => w.row?.teamName ?? 'champions'))];
    const fmvp = g.awards.some((a) => a.key === 'FMVP');
    const key = g.awards.some((a) => a.key === 'TITLEKEY');
    fact = `NBA champion · ${won.map((w) => w.year).join(', ')}`;
    lines = [
      `${Count(won.length, 'ring')}${ringTeams.length === 1 ? ` with the ${ringTeams[0]}: ${listed(won.map((w) => String(w.year)))}` : `: ${listed(won.map((w) => `${w.year} with the ${w.row?.teamName ?? 'champions'}`))}`}. The box lives in his desk drawer in ${town}.`,
      fmvp ? 'Finals MVP that June, and he still says the defense won it.' : key ? 'He was a key player on that team, and the parade went right past his old apartment.' : 'He didn’t play much that June. They put his name on the ring all the same.',
      'There’s still confetti in the pocket of the jacket he wore to the parade.',
    ];
    now = `Today he coaches a youth team in ${town}, and lets the kids hold the ring after a win.`;
  } else if (kind === 'allstar') {
    const keys = count(g, 'ALLSTAR') ? ['ALLSTAR'] : STAR_KEYS;
    const years = [...new Set(g.awards.filter((a) => keys.includes(a.key)).map((a) => a.year))].sort((a, b) => a - b);
    for (const y of years.slice(0, 8)) {
      const row = nba.find((h) => h.year === y);
      art.labels.push(String(y % 100).padStart(2, '0'));
      art.tints.push(row && EAST.has(row.teamId) ? '#1D428A' : '#C8102E');
    }
    const mvps = count(g, 'MVP');
    const first1 = g.awards.find((a) => a.key === 'ALLNBA1');
    const word = keys.length === 1 ? 'All-Star' : 'All-NBA';
    fact = `${word} · ${years.length > 1 ? `${years.length} times` : years[0] ?? ''}`;
    lines = [
      `${Count(years.length, `${word} jersey`)}, hung in the garage in ${town} like banners.`,
      mvps ? `The MVP trophy is in there too, holding the side door open.` : first1 ? `First-team All-NBA in ${first1.year}: for one season, nobody played his position better.` : `${years[0]}: the first one. He called home from the locker room and couldn’t get a word out.`,
      'No ring to hang beside them. He’ll tell you the jerseys are enough, and most days he means it.',
    ];
    now = `Today he runs a summer camp in ${town}, and every kid asks to see the garage.`;
  } else if (kind === 'eurolegend') {
    const abroad = rowsAt(g, ...ABROAD);
    const club = mainTeam(rowsAt(g, 'EU')) ?? mainTeam(abroad);
    const city = club ? cityOf({ level: 'EU', teamId: club.id, teamName: club.name }) : 'Europe';
    if (club) art.color = club.color;
    const titles = g.awards.filter((a) => a.key === 'EUTITLE').map((a) => a.year);
    const mvp = g.awards.find((a) => a.key === 'EUMVP');
    fact = `${club?.name ?? 'Europe'} · ${plural(seasonsAt(g, ...ABROAD), 'season')} abroad`;
    lines = [
      `${city} took a kid from ${town} and made him one of their own.`,
      titles.length ? `EuroLeague champion${titles.length > 1 ? ` ${titles.length} times` : ` in ${titles[0]}`}${mvp ? `, and the EuroLeague MVP in ${mvp.year}` : ''}. The flares burned until morning.` : `The EuroLeague MVP in ${mvp?.year ?? ''}. The whole city knew his name by spring.`,
      'His number hangs from the upper tier on a banner the fans made. They still sing his name.',
    ];
    now = `Today he lives in ${city}, where nobody lets him pay for dinner.`;
  } else if (kind === 'longhaul') {
    const seasons = seasonsAt(g, 'NBA');
    const teams = new Set(nba.map((h) => h.teamId)).size;
    const lastNba = nba[nba.length - 1];
    if (lastNba) art.color = lastNba.teamColor;
    fact = `${plural(seasons, 'NBA season')} · ${plural(teams, 'team')}`;
    lines = [
      `${Count(seasons, 'season')} in the NBA. Most who make it last fewer than five.`,
      `His last locker was with the ${lastNba?.teamName ?? 'team'}. The nameplate came off in one piece, which felt about right.`,
      `${g.nbaGames.toLocaleString('en-US')} games. He was rarely the headline, and he never once missed the bus.`,
    ];
    now = 'Today he’s an assistant coach, and still the first one in the gym.';
  } else if (kind === 'madeit') {
    const debut = nba[0];
    if (debut) art.color = debut.teamColor;
    const seasons = seasonsAt(g, 'NBA');
    fact = `NBA debut · ${debut?.year ?? ''} · ${debut?.teamName ?? ''}`;
    lines = [
      `${debut?.year ?? 'One night'}: his NBA debut, for the ${debut?.teamName ?? 'team'}. The jersey hangs framed on his old bedroom wall in ${town}.`,
      `${Count(g.nbaGames, 'NBA game')}${seasons > 1 ? ` over ${seasons} seasons` : ''}. The ticket stub from the debut is pinned beside the frame.`,
      `Most kids who shoot in the driveway never get one. He got ${g.nbaGames === 1 ? 'one' : g.nbaGames.toLocaleString('en-US')}.`,
    ];
    now = `Today he coaches at ${p.highSchool}, and tells them about the night he checked in.`;
  } else if (kind === 'passport') {
    const stops: { city: string; year: number }[] = [];
    for (const h of rowsAt(g, 'NCAA', 'GL', ...ABROAD)) {
      const city = cityOf(h);
      if (!stops.some((s) => s.city === city)) stops.push({ city, year: h.year });
    }
    art.labels = stops.slice(-6).map((s) => `${s.year} ${boardCity(s.city)}`);
    const abroad = rowsAt(g, ...ABROAD);
    const club = mainTeam(abroad);
    if (club) art.color = club.color;
    const cities = stops.filter((s) => abroad.some((h) => cityOf(h) === s.city)).map((s) => s.city);
    fact = `${plural(cities.length, 'city', 'cities')} abroad · ${plural(seasonsAt(g, ...ABROAD), 'season')}`;
    lines = [
      `${cities.length === 1 ? `One city on the board: ${cities[0]}` : `${Count(cities.length, 'city', 'cities')} on the board: ${listed(cities, 4)}`}.`,
      `${Count(seasonsAt(g, ...ABROAD), 'season')} abroad, and a passport with no room left for stamps.`,
      'Every stamp is a season someone paid him to play the game he loves.',
    ];
    now = `Today he’s back in ${town}, with a map on the wall and a pin in every city.`;
  } else if (kind === 'grinder') {
    const gl = rowsAt(g, 'GL');
    const teams = [...new Set(gl.map((h) => h.teamName))];
    const main = mainTeam(gl);
    if (main) art.color = main.color;
    fact = `The G League · ${plural(seasonsAt(g, 'GL'), 'season')}`;
    lines = [
      `${Count(seasonsAt(g, 'GL'), 'season')} in the G League${teams.length ? `: ${listed(teams, 3)}` : ''}. A lot of highway in between.`,
      'The call-up never came. He kept every ten-day offer that almost did, pinned to the wall by his bunk.',
      'Bus rides and ten-day dreams. He would ride every mile again.',
    ];
    now = 'Today he scouts for a G League team, on the same buses, looking for the next him.';
  } else if (kind === 'shining') {
    const ncaa = rowsAt(g, 'NCAA');
    const school = mainTeam(ncaa);
    if (school) art.color = school.color;
    const champs = g.awards.find((a) => a.key === 'NCAATITLE');
    const honour = g.awards.find((a) => COLLEGE_KEYS.includes(a.key) && a.key !== 'NCAATITLE');
    const name = school?.name ?? 'his college';
    fact = champs ? `National champion · ${champs.year}` : `${honour?.label ?? 'A college star'} · ${honour?.year ?? ''}`;
    lines = [
      champs ? `${champs.year}: national champions. He climbed the ladder and cut down the net.` : `${honour?.year}: ${honour?.label} at ${name}. The best player in the building, every night.`,
      `His number ${p.number} hangs in the ${name} gym, over the student section.`,
      'The pros never called. For one shining moment, it didn’t matter.',
    ];
    now = champs ? `Today he teaches at ${p.highSchool}; a piece of that net hangs over his desk.` : `Today he teaches at ${p.highSchool}, and still plays pickup in the ${name} gym.`;
  } else if (kind === 'gown') {
    const ncaa = rowsAt(g, 'NCAA');
    const school = mainTeam(ncaa);
    if (school) art.color = school.color;
    const grad = (ncaa[ncaa.length - 1]?.year ?? g.year) + 1;
    art.labels = [String(grad)];
    fact = `${school?.name ?? 'College'} · class of ${grad}`;
    lines = [
      `${Count(seasonsAt(g, 'NCAA'), 'season')} at ${school?.name ?? 'college'}, then graduation day in ${grad}.`,
      'He crossed the stage with a ball under his arm. The dean let it slide.',
      'No draft, no contract: a degree, and the game for life.',
    ];
    now = `Today he works in ${town}, and the ball still rides in the trunk of his car.`;
  } else {
    const hs = rowsAt(g, 'HSJV', 'HSV');
    const lastHs = hs[hs.length - 1];
    art.color = g.schoolColor || lastHs?.teamColor || art.color;
    const draft = /No team called/.test(reasonOf(g));
    fact = `${lastHs?.teamName ?? p.highSchool} · ${plural(hs.length, 'season')}`;
    lines = [
      `${Count(hs.length, 'season')} at ${lastHs?.teamName ?? p.highSchool}. ${lastHs?.result ? `The last one: ${lastHs.result.charAt(0).toLowerCase()}${lastHs.result.slice(1)}.` : ''}`.trim(),
      draft ? 'Draft night, the phone sat on the porch step. It never rang.' : 'Signing day came and went. The phone on the porch step never rang.',
      'The dream ended before the pros. The love of the game did not.',
    ];
    now = `Today he still shoots in the driveway in ${town} until the streetlight comes on.`;
  }
  // the one twist the scene speaks of takes the third line (Hoops dream keeps the owner's line last)
  const twist = twistLine(t);
  if (twist) lines = kind === 'dream' ? [lines[0], twist, lines[2]] : [lines[0], lines[1], twist];
  const lastTeam = [...g.history].reverse().find((h) => h.line.gp > 0 && !isAssignment(h) && h.level !== 'HSJV' && h.level !== 'HSV');
  return {
    kind,
    title: ENDINGS[kind].name,
    fact,
    lines,
    now,
    gold: t.gold ? `Olympic gold · ${t.gold}` : null,
    ovation: t.farewell && lastTeam ? { team: lastTeam.teamName, color: lastTeam.teamColor } : null,
    art,
  };
}
