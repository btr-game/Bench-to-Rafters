// Appendix A team data. Real names, cities and colors; all players are fictional.

import type { NcaaTier } from '../engine/types';

export interface NbaTeamInfo {
  abbr: string;
  city: string;
  nick: string;
  conf: 'East' | 'West';
  div: string;
  color: string;
  gl: string;
}

const T = (abbr: string, city: string, nick: string, conf: 'East' | 'West', div: string, color: string, gl: string): NbaTeamInfo => ({
  abbr,
  city,
  nick,
  conf,
  div,
  color,
  gl,
});

export const NBA_TEAMS: NbaTeamInfo[] = [
  T('BOS', 'Boston', 'Celtics', 'East', 'Atlantic', '#007A33', 'Maine Celtics'),
  T('BKN', 'Brooklyn', 'Nets', 'East', 'Atlantic', '#000000', 'Long Island Nets'),
  T('NYK', 'New York', 'Knicks', 'East', 'Atlantic', '#F58426', 'Westchester Knicks'),
  T('PHI', 'Philadelphia', '76ers', 'East', 'Atlantic', '#006BB6', 'Delaware Blue Coats'),
  T('TOR', 'Toronto', 'Raptors', 'East', 'Atlantic', '#CE1141', 'Raptors 905'),
  T('CHI', 'Chicago', 'Bulls', 'East', 'Central', '#CE1141', 'Windy City Bulls'),
  T('CLE', 'Cleveland', 'Cavaliers', 'East', 'Central', '#860038', 'Cleveland Charge'),
  T('DET', 'Detroit', 'Pistons', 'East', 'Central', '#C8102E', 'Motor City Cruise'),
  T('IND', 'Indiana', 'Pacers', 'East', 'Central', '#002D62', 'Noblesville Boom'),
  T('MIL', 'Milwaukee', 'Bucks', 'East', 'Central', '#00471B', 'Wisconsin Herd'),
  T('ATL', 'Atlanta', 'Hawks', 'East', 'Southeast', '#E03A3E', 'College Park Skyhawks'),
  T('CHA', 'Charlotte', 'Hornets', 'East', 'Southeast', '#1D1160', 'Greensboro Swarm'),
  T('MIA', 'Miami', 'Heat', 'East', 'Southeast', '#98002E', 'Sioux Falls Skyforce'),
  T('ORL', 'Orlando', 'Magic', 'East', 'Southeast', '#0077C0', 'Osceola Magic'),
  T('WAS', 'Washington', 'Wizards', 'East', 'Southeast', '#002B5C', 'Capital City Go-Go'),
  T('DEN', 'Denver', 'Nuggets', 'West', 'Northwest', '#0E2240', 'Grand Rapids Gold'),
  T('MIN', 'Minnesota', 'Timberwolves', 'West', 'Northwest', '#0C2340', 'Iowa Wolves'),
  T('OKC', 'Oklahoma City', 'Thunder', 'West', 'Northwest', '#007AC1', 'Oklahoma City Blue'),
  T('POR', 'Portland', 'Trail Blazers', 'West', 'Northwest', '#E03A3E', 'Rip City Remix'),
  T('UTA', 'Utah', 'Jazz', 'West', 'Northwest', '#002B5C', 'Salt Lake City Stars'),
  T('GSW', 'Golden State', 'Warriors', 'West', 'Pacific', '#1D428A', 'Santa Cruz Warriors'),
  T('LAC', 'LA', 'Clippers', 'West', 'Pacific', '#C8102E', 'San Diego Clippers'),
  T('LAL', 'Los Angeles', 'Lakers', 'West', 'Pacific', '#552583', 'South Bay Lakers'),
  T('PHX', 'Phoenix', 'Suns', 'West', 'Pacific', '#1D1160', 'Valley Suns'),
  T('SAC', 'Sacramento', 'Kings', 'West', 'Pacific', '#5A2D81', 'Stockton Kings'),
  T('DAL', 'Dallas', 'Mavericks', 'West', 'Southwest', '#00538C', 'Texas Legends'),
  T('HOU', 'Houston', 'Rockets', 'West', 'Southwest', '#CE1141', 'Rio Grande Valley Vipers'),
  T('MEM', 'Memphis', 'Grizzlies', 'West', 'Southwest', '#5D76A9', 'Memphis Hustle'),
  T('NOP', 'New Orleans', 'Pelicans', 'West', 'Southwest', '#0C2340', 'Birmingham Squadron'),
  T('SAS', 'San Antonio', 'Spurs', 'West', 'Southwest', '#C4CED4', 'Austin Spurs'),
];

// Jersey retirement is cancelled by moving to the rival after 5+ seasons (§10)
export const RIVALS: [string, string][] = [
  ['LAL', 'BOS'],
  ['NYK', 'BKN'],
  ['LAL', 'LAC'],
  ['CHI', 'DET'],
  ['GSW', 'CLE'],
  ['MIA', 'NYK'],
  ['BOS', 'PHI'],
  ['SAS', 'DAL'],
];

export interface CollegeInfo {
  name: string;
  tier: NcaaTier;
  conf: string;
  color: string;
}

const C = (name: string, tier: NcaaTier, conf: string, color: string): CollegeInfo => ({ name, tier, conf, color });

export const COLLEGES: CollegeInfo[] = [
  // blue bloods
  C('Duke', 'blue', 'ACC', '#003087'),
  C('Kentucky', 'blue', 'SEC', '#0033A0'),
  C('North Carolina', 'blue', 'ACC', '#7BAFD4'),
  C('Kansas', 'blue', 'Big 12', '#0051BA'),
  C('UConn', 'blue', 'Big East', '#000E2F'),
  C('Gonzaga', 'blue', 'WCC', '#041E42'),
  C('UCLA', 'blue', 'Big Ten', '#2D68C4'),
  C('Arizona', 'blue', 'Big 12', '#CC0033'),
  // power programs
  C('Michigan State', 'power', 'Big Ten', '#18453B'),
  C('Villanova', 'power', 'Big East', '#00205B'),
  C('Houston', 'power', 'Big 12', '#C8102E'),
  C('Baylor', 'power', 'Big 12', '#154734'),
  C('Purdue', 'power', 'Big Ten', '#CEB888'),
  C('Tennessee', 'power', 'SEC', '#FF8200'),
  C('Auburn', 'power', 'SEC', '#0C2340'),
  C('Alabama', 'power', 'SEC', '#9E1B32'),
  C('Texas', 'power', 'SEC', '#BF5700'),
  C('Arkansas', 'power', 'SEC', '#9D2235'),
  // major conference
  C('Indiana', 'major', 'Big Ten', '#990000'),
  C('Ohio State', 'major', 'Big Ten', '#BB0000'),
  C('Oregon', 'major', 'Big Ten', '#154733'),
  C('USC', 'major', 'Big Ten', '#990000'),
  C('Virginia', 'major', 'ACC', '#232D4B'),
  C('Syracuse', 'major', 'ACC', '#F76900'),
  C('Louisville', 'major', 'ACC', '#AD0000'),
  C('Florida', 'major', 'SEC', '#0021A5'),
  C('Creighton', 'major', 'Big East', '#005CA9'),
  C('Marquette', 'major', 'Big East', '#003366'),
  C('Iowa State', 'major', 'Big 12', '#C8102E'),
  C('Texas Tech', 'major', 'Big 12', '#CC0000'),
  C('Wisconsin', 'major', 'Big Ten', '#C5050C'),
  C('Illinois', 'major', 'Big Ten', '#E84A27'),
  C('Michigan', 'major', 'Big Ten', '#00274C'),
  C('Maryland', 'major', 'Big Ten', '#E03A3E'),
  C('Xavier', 'major', 'Big East', '#0C2340'),
  C('Providence', 'major', 'Big East', '#000000'),
  C('Miami', 'major', 'ACC', '#F47321'),
  C('Clemson', 'major', 'ACC', '#F56600'),
  C('NC State', 'major', 'ACC', '#CC0000'),
  C('Oklahoma', 'major', 'SEC', '#841617'),
  C('Missouri', 'major', 'SEC', '#F1B82D'),
  C('LSU', 'major', 'SEC', '#461D7C'),
  C('Ole Miss', 'major', 'SEC', '#14213D'),
  C('Kansas State', 'major', 'Big 12', '#512888'),
  C('BYU', 'major', 'Big 12', '#002E5D'),
  C('Cincinnati', 'major', 'Big 12', '#E00122'),
  C("St. John's", 'major', 'Big East', '#BA0C2F'),
  C('Butler', 'major', 'Big East', '#13294B'),
  // mid-majors
  C('Dayton', 'mid', 'Atlantic 10', '#CE1141'),
  C("Saint Mary's", 'mid', 'WCC', '#D80024'),
  C('San Diego State', 'mid', 'Mountain West', '#A6192E'),
  C('VCU', 'mid', 'Atlantic 10', '#FFB300'),
  C('Drake', 'mid', 'Missouri Valley', '#004477'),
  C('Belmont', 'mid', 'Missouri Valley', '#002D72'),
  C('Wichita State', 'mid', 'American', '#FFCD00'),
  C('Utah State', 'mid', 'Mountain West', '#0F2439'),
  C('Memphis', 'mid', 'American', '#003087'),
  C('Florida Atlantic', 'mid', 'American', '#003366'),
  C('Nevada', 'mid', 'Mountain West', '#003366'),
  C('New Mexico', 'mid', 'Mountain West', '#BA0C2F'),
  C('Boise State', 'mid', 'Mountain West', '#0033A0'),
  C('Grand Canyon', 'mid', 'WAC', '#522398'),
  C('McNeese', 'mid', 'Southland', '#00529B'),
  C('Furman', 'mid', 'SoCon', '#582C83'),
  C('Vermont', 'mid', 'America East', '#154734'),
  C('Charleston', 'mid', 'CAA', '#8A1538'),
  C('Princeton', 'mid', 'Ivy', '#E77500'),
  C('Akron', 'mid', 'MAC', '#041E42'),
  C('UC Irvine', 'mid', 'Big West', '#0064A4'),
  C('James Madison', 'mid', 'Sun Belt', '#450084'),
  C('Richmond', 'mid', 'Atlantic 10', '#990000'),
  C('Loyola Chicago', 'mid', 'Atlantic 10', '#7B1C2E'),
  C('Bradley', 'mid', 'Missouri Valley', '#C8102E'),
  C('Samford', 'mid', 'SoCon', '#002D72'),
];

export interface ClubInfo {
  name: string;
  short: string;
  strength: number;
  color: string;
  country: string;
}

export const EURO_CLUBS: ClubInfo[] = [
  { name: 'Real Madrid', short: 'RMB', strength: 69, color: '#C9A227', country: 'Spain' },
  { name: 'FC Barcelona', short: 'BAR', strength: 68, color: '#A50044', country: 'Spain' },
  { name: 'Fenerbahçe', short: 'FEN', strength: 68, color: '#0E1E5B', country: 'Turkey' },
  { name: 'Olympiacos', short: 'OLY', strength: 68, color: '#D6001C', country: 'Greece' },
  { name: 'Panathinaikos', short: 'PAO', strength: 68, color: '#007A3D', country: 'Greece' },
  { name: 'AS Monaco', short: 'MON', strength: 66, color: '#E2001A', country: 'Monaco' },
  { name: 'Anadolu Efes', short: 'EFS', strength: 66, color: '#1C3F94', country: 'Turkey' },
  { name: 'Partizan', short: 'PAR', strength: 66, color: '#2B2B2B', country: 'Serbia' },
  { name: 'Žalgiris', short: 'ZAL', strength: 65, color: '#006B3F', country: 'Lithuania' },
  { name: 'Virtus Bologna', short: 'VIR', strength: 65, color: '#1F1F1F', country: 'Italy' },
  { name: 'Maccabi Tel Aviv', short: 'MTA', strength: 65, color: '#F2C200', country: 'Israel' },
  { name: 'ALBA Berlin', short: 'BER', strength: 63, color: '#F2C200', country: 'Germany' },
  { name: 'Crvena zvezda', short: 'CZV', strength: 66, color: '#C8102E', country: 'Serbia' },
  { name: 'Bayern Munich', short: 'BAY', strength: 65, color: '#DC052D', country: 'Germany' },
  { name: 'Olimpia Milano', short: 'MIL', strength: 65, color: '#D2001F', country: 'Italy' },
  { name: 'Baskonia', short: 'BKN', strength: 64, color: '#1A3F86', country: 'Spain' },
  { name: 'Paris Basketball', short: 'PAR', strength: 64, color: '#111111', country: 'France' },
  { name: 'LDLC ASVEL', short: 'ASV', strength: 63, color: '#003C71', country: 'France' },
];

export const HS_SCHOOL_NAMES = [
  'Central',
  'North Ridge',
  'St. Vincent',
  'Oak Park',
  'Riverside',
  'Eastside',
  'Westlake',
  'Mount Carmel',
  'Valley View',
  'Lakeside',
  'Southgate',
  'Fairview',
  'Hillcrest',
  'Jefferson',
  'Bishop Gorman',
  'Lincoln Prep',
  'Roosevelt',
  'Heritage',
  'Kennedy Catholic',
  'Summit',
];

export const HS_COLORS = ['#7A1F2B', '#1F3A7A', '#1E5B3A', '#5B2A86', '#B3541E', '#2A2F36', '#0F5C6E', '#8A6D1F'];

// Hometowns and the (fictional) high schools a player can be assigned to. The game picks
// one for each new career; the player does not choose.
export const HOMETOWN_SCHOOLS: { town: string; schools: string[]; colors: string[] }[] = [
  { town: 'Chicago, IL', schools: ['Lakeshore Prep', 'South Side Academy', 'Westbrook High'], colors: ['#7A1F2B', '#1F3A7A'] },
  { town: 'Atlanta, GA', schools: ['Peachtree Christian', 'Eastlake High', 'Grant Park Academy'], colors: ['#B3541E', '#1E5B3A'] },
  { town: 'Houston, TX', schools: ['Bayou City High', 'Westheimer Prep', 'Third Ward Academy'], colors: ['#5B2A86', '#8A6D1F'] },
  { town: 'Los Angeles, CA', schools: ['Crenshaw Heights', 'Valley Prep', 'Harbor Gateway High'], colors: ['#1F3A7A', '#B3541E'] },
  { town: 'Philadelphia, PA', schools: ['Germantown Catholic', 'Schuylkill Prep', 'North Broad High'], colors: ['#2A2F36', '#7A1F2B'] },
  { town: 'Indianapolis, IN', schools: ['Crossroads High', 'Fall Creek Academy', 'Broad Ripple Prep'], colors: ['#0F5C6E', '#8A6D1F'] },
  { town: 'Baltimore, MD', schools: ['Harbor East High', 'Patapsco Prep', 'Mount Royal Catholic'], colors: ['#5B2A86', '#2A2F36'] },
  { town: 'Seattle, WA', schools: ['Rainier Valley High', 'Puget Sound Prep', 'Garfield Heights'], colors: ['#1E5B3A', '#0F5C6E'] },
  { town: 'Detroit, MI', schools: ['Motor City Prep', 'Eastside Catholic', 'Belle Isle High'], colors: ['#1F3A7A', '#7A1F2B'] },
  { town: 'Oakland, CA', schools: ['Lake Merritt High', 'East Bay Prep', 'Fruitvale Academy'], colors: ['#8A6D1F', '#1E5B3A'] },
  { town: 'Queens, NY', schools: ['Flushing Catholic', 'Jamaica Bay High', 'Astoria Prep'], colors: ['#2A2F36', '#B3541E'] },
  { town: 'Memphis, TN', schools: ['Bluff City High', 'Beale Prep', 'Overton Academy'], colors: ['#0F5C6E', '#5B2A86'] },
  { town: 'Akron, OH', schools: ['Cuyahoga Falls Catholic', 'Summit Prep', 'Rubber City High'], colors: ['#7A1F2B', '#8A6D1F'] },
  { town: 'Phoenix, AZ', schools: ['Camelback High', 'Desert Vista Prep', 'Saguaro Academy'], colors: ['#B3541E', '#5B2A86'] },
  { town: 'Milwaukee, WI', schools: ['Lakefront Lutheran', 'Menomonee Valley High', 'Brew City Prep'], colors: ['#1E5B3A', '#1F3A7A'] },
  { town: 'Dallas, TX', schools: ['Trinity River High', 'Oak Cliff Prep', 'Lone Star Academy'], colors: ['#1F3A7A', '#2A2F36'] },
  { town: 'Las Vegas, NV', schools: ['Silver State Prep', 'Spring Mountain High', 'Desert Rose Catholic'], colors: ['#8A6D1F', '#7A1F2B'] },
  { town: 'Seoul, South Korea', schools: ['Hanbit International School', 'Gangnam Prep Academy'], colors: ['#1F3A7A', '#7A1F2B'] },
];

// Other overseas leagues (level INT). Strength is mean team strength; salary in $M a year.
export interface IntLeagueInfo {
  key: string;
  name: string;
  country: string;
  strength: number;
  salary: [number, number];
  teams: [string, string][];
}

export const INT_LEAGUES: IntLeagueInfo[] = [
  {
    key: 'NBL',
    name: 'NBL',
    country: 'Australia',
    strength: 62,
    salary: [0.15, 0.9],
    teams: [
      ['Sydney Kings', '#5B2A86'], ['Melbourne United', '#002B5C'], ['Perth Wildcats', '#C8102E'], ['Brisbane Bullets', '#7A1F2B'],
      ['Adelaide 36ers', '#B3541E'], ['New Zealand Breakers', '#2A2F36'], ['Tasmania JackJumpers', '#1E5B3A'], ['Illawarra Hawks', '#B71C1C'],
      ['Cairns Taipans', '#F28C28'], ['South East Melbourne Phoenix', '#0F5C6E'],
    ],
  },
  {
    key: 'CBA',
    name: 'CBA',
    country: 'China',
    strength: 61,
    salary: [0.4, 3.5],
    teams: [
      ['Guangdong Southern Tigers', '#C8102E'], ['Liaoning Flying Leopards', '#002B5C'], ['Zhejiang Lions', '#1E5B3A'], ['Shanghai Sharks', '#0F5C6E'],
      ['Beijing Ducks', '#7A1F2B'], ['Shenzhen Leopards', '#2A2F36'], ['Xinjiang Flying Tigers', '#8A6D1F'], ['Shandong Heroes', '#B3541E'],
      ['Qingdao Eagles', '#1F3A7A'], ['Guangzhou Loong Lions', '#5B2A86'],
    ],
  },
  {
    key: 'BLG',
    name: 'B.League',
    country: 'Japan',
    strength: 59,
    salary: [0.2, 1.4],
    teams: [
      ['Chiba Jets', '#C8102E'], ['Utsunomiya Brex', '#F4C300'], ['Ryukyu Golden Kings', '#5B2A86'], ['Alvark Tokyo', '#B71C1C'],
      ['Nagoya Diamond Dolphins', '#1F3A7A'], ['Shimane Susanoo Magic', '#2A2F36'], ['Kawasaki Brave Thunders', '#7A1F2B'], ['Hiroshima Dragonflies', '#0F5C6E'],
      ['Sunrockers Shibuya', '#8A6D1F'], ['Gunma Crane Thunders', '#1E5B3A'],
    ],
  },
  {
    key: 'KBL',
    name: 'KBL',
    country: 'South Korea',
    strength: 57,
    salary: [0.12, 0.6],
    teams: [
      ['Seoul SK Knights', '#C8102E'], ['Changwon LG Sakers', '#7A1F2B'], ['Suwon KT Sonicboom', '#2A2F36'], ['Anyang Jung Kwan Jang', '#B3541E'],
      ['Ulsan Hyundai Mobis Phoebus', '#1F3A7A'], ['Busan KCC Egis', '#002B5C'], ['Wonju DB Promy', '#1E5B3A'], ['Seoul Samsung Thunders', '#0F5C6E'],
      ['Goyang Sono Skygunners', '#5B2A86'], ['Daegu KOGAS Pegasus', '#8A6D1F'],
    ],
  },
];
