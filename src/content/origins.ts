// Where the player comes from, and how players from there actually reach the NBA.
//
// The real routes (as of 2026):
// - us: high school (or a national prep school), then college or the G League.
// - euro: a professional club's youth academy from about 14; the best debut with the senior
//   team at 16-18 (Doncic at Real Madrid, Wembanyama at ASVEL) and declare for the draft from
//   the club. International players may declare from 19 and are automatically eligible at 22.
//   Some leave for a US college instead.
// - academy: NBA Academy Africa (Senegal) and NBA Academy Latin America (Mexico City) take
//   prospects at about 14-16; most move to a US prep school for exposure, then college.
//   (Embiid and Siakam came through camps and US prep schools.)
// - aus: the NBA Global Academy at the Australian Institute of Sport in Canberra, then a US
//   college or the NBL Next Stars program (Giddey, and Kai Sotto from the Philippines).
// - canada: Canadian prep programs, often a move to a US prep school, then college
//   (Gilgeous-Alexander, Murray).
// - asia: domestic high school basketball, then the domestic pro league or a US college
//   (Hachimura via Gonzaga, Kawamura via the B.League, Lee Hyun-jung via Davidson).
// Club and academy names below are the real programs; schools are fictional.

export type PathKind = 'us' | 'euro' | 'academy' | 'aus' | 'canada' | 'asia';

export interface Origin {
  country: string;
  nation: string; // national team
  weight: number; // share of careers that start here
  path: PathKind;
  towns: string[];
  youth: { name: string; color: string }[]; // where he plays from 14 to 17
  youthLeague: string;
  homeClub?: string; // euro: senior club behind the academy (one of EURO_CLUBS)
  homeLeague?: string; // aus/asia: domestic pro league key in INT_LEAGUES
  nationColor: string;
}

export const ORIGINS: Origin[] = [
  { country: 'USA', nation: 'USA', weight: 0.5, path: 'us', towns: [], youth: [], youthLeague: '', nationColor: '#002868' },
  {
    country: 'Canada', nation: 'Canada', weight: 0.06, path: 'canada',
    towns: ['Toronto, Ontario', 'Hamilton, Ontario', 'Montreal, Quebec', 'Vancouver, British Columbia'],
    youth: [{ name: 'Maple Ridge Prep', color: '#C8102E' }, { name: 'Lakeshore Collegiate Academy', color: '#1F3A7A' }],
    youthLeague: 'OSBA prep league', nationColor: '#C8102E',
  },
  {
    country: 'France', nation: 'France', weight: 0.04, path: 'euro',
    towns: ['Paris', 'Lyon', 'Le Mans', 'Nanterre'],
    youth: [{ name: 'ASVEL Academy', color: '#2A2F36' }, { name: 'Paris Basketball Academy', color: '#1F3A7A' }, { name: 'AS Monaco Espoirs', color: '#C8102E' }],
    homeClub: 'LDLC ASVEL', youthLeague: 'Espoirs league', nationColor: '#002395',
  },
  {
    country: 'Spain', nation: 'Spain', weight: 0.03, path: 'euro',
    towns: ['Madrid', 'Barcelona', 'Badalona', 'Málaga'],
    youth: [{ name: 'Real Madrid youth academy', color: '#4B2E83' }, { name: 'FC Barcelona juniors', color: '#A50044' }],
    homeClub: 'Real Madrid', youthLeague: 'Junior league', nationColor: '#AA151B',
  },
  {
    country: 'Serbia', nation: 'Serbia', weight: 0.03, path: 'euro',
    towns: ['Belgrade', 'Novi Sad', 'Niš', 'Sombor'],
    youth: [{ name: 'Mega Basket youth', color: '#7A1F2B' }, { name: 'Crvena zvezda juniors', color: '#C8102E' }, { name: 'Partizan juniors', color: '#2A2F36' }],
    homeClub: 'Partizan', youthLeague: 'Junior ABA league', nationColor: '#C6363C',
  },
  {
    country: 'Greece', nation: 'Greece', weight: 0.02, path: 'euro',
    towns: ['Athens', 'Thessaloniki', 'Piraeus'],
    youth: [{ name: 'Panathinaikos youth', color: '#1E5B3A' }, { name: 'Olympiacos youth', color: '#C8102E' }],
    homeClub: 'Panathinaikos', youthLeague: 'Greek junior league', nationColor: '#0D5EAF',
  },
  {
    country: 'Germany', nation: 'Germany', weight: 0.02, path: 'euro',
    towns: ['Berlin', 'Munich', 'Würzburg', 'Ulm'],
    youth: [{ name: 'ALBA Berlin youth', color: '#F4C300' }, { name: 'Bayern Munich youth', color: '#C8102E' }],
    homeClub: 'ALBA Berlin', youthLeague: 'NBBL', nationColor: '#2A2F36',
  },
  {
    country: 'Lithuania', nation: 'Lithuania', weight: 0.02, path: 'euro',
    towns: ['Kaunas', 'Vilnius', 'Klaipėda'],
    youth: [{ name: 'Žalgiris academy', color: '#1E5B3A' }, { name: 'Rytas youth', color: '#1F3A7A' }],
    homeClub: 'Žalgiris', youthLeague: 'Lithuanian junior league', nationColor: '#006A44',
  },
  {
    country: 'Slovenia', nation: 'Slovenia', weight: 0.01, path: 'euro',
    towns: ['Ljubljana', 'Maribor'],
    youth: [{ name: 'Cedevita Olimpija youth', color: '#1E5B3A' }],
    homeClub: 'Real Madrid', youthLeague: 'Junior ABA league', nationColor: '#005DA4',
  },
  {
    country: 'Turkey', nation: 'Turkey', weight: 0.02, path: 'euro',
    towns: ['Istanbul', 'Ankara', 'Izmir'],
    youth: [{ name: 'Anadolu Efes youth', color: '#1F3A7A' }, { name: 'Fenerbahçe youth', color: '#F4C300' }],
    homeClub: 'Anadolu Efes', youthLeague: 'Turkish youth league', nationColor: '#E30A17',
  },
  {
    country: 'Argentina', nation: 'Argentina', weight: 0.01, path: 'academy',
    towns: ['Buenos Aires', 'Bahía Blanca', 'Córdoba', 'Santiago del Estero'],
    youth: [{ name: 'Obras Sanitarias juniors', color: '#1F3A7A' }, { name: 'Boca Juniors youth', color: '#002B5C' }, { name: 'Quimsa juniors', color: '#C8102E' }],
    homeLeague: 'LAT', youthLeague: 'Liga de Desarrollo', nationColor: '#74ACDF',
  },
  {
    country: 'Australia', nation: 'Australia', weight: 0.04, path: 'aus',
    towns: ['Melbourne', 'Sydney', 'Perth', 'Adelaide', 'Brisbane'],
    youth: [{ name: 'NBA Global Academy (Canberra)', color: '#00843D' }, { name: 'Box Hill Senior Secondary', color: '#1F3A7A' }],
    homeLeague: 'NBL', youthLeague: 'Australian schools league', nationColor: '#00843D',
  },
  {
    country: 'Nigeria', nation: 'Nigeria', weight: 0.015, path: 'academy',
    towns: ['Lagos', 'Abuja', 'Ibadan'],
    youth: [{ name: 'NBA Academy Africa', color: '#1E5B3A' }],
    homeLeague: 'BAL', youthLeague: 'NBA Academy schedule', nationColor: '#008751',
  },
  {
    country: 'Senegal', nation: 'Senegal', weight: 0.01, path: 'academy',
    towns: ['Dakar', 'Thiès', 'Saly'],
    youth: [{ name: 'NBA Academy Africa', color: '#1E5B3A' }, { name: 'SEED Academy', color: '#F4C300' }],
    homeLeague: 'BAL', youthLeague: 'NBA Academy schedule', nationColor: '#00853F',
  },
  {
    country: 'Cameroon', nation: 'Cameroon', weight: 0.015, path: 'academy',
    towns: ['Yaoundé', 'Douala', 'Kribi'],
    youth: [{ name: 'NBA Academy Africa', color: '#1E5B3A' }],
    homeLeague: 'BAL', youthLeague: 'NBA Academy schedule', nationColor: '#007A5E',
  },
  {
    country: 'South Sudan', nation: 'South Sudan', weight: 0.005, path: 'academy',
    towns: ['Juba', 'Wau'],
    youth: [{ name: 'NBA Academy Africa', color: '#1E5B3A' }],
    homeLeague: 'BAL', youthLeague: 'NBA Academy schedule', nationColor: '#0F47AF',
  },
  {
    country: 'Dominican Republic', nation: 'Dominican Republic', weight: 0.015, path: 'academy',
    towns: ['Santo Domingo', 'Santiago de los Caballeros'],
    youth: [{ name: 'NBA Academy Latin America', color: '#002D62' }, { name: 'Club San Lázaro juniors', color: '#C8102E' }],
    homeLeague: 'LAT', youthLeague: 'NBA Academy schedule', nationColor: '#002D62',
  },
  {
    country: 'Brazil', nation: 'Brazil', weight: 0.01, path: 'academy',
    towns: ['São Paulo', 'Rio de Janeiro', 'Franca'],
    youth: [{ name: 'Flamengo youth', color: '#C8102E' }, { name: 'Franca juniors', color: '#1F3A7A' }],
    homeLeague: 'LAT', youthLeague: 'Brazilian junior league', nationColor: '#009C3B',
  },
  {
    country: 'Mexico', nation: 'Mexico', weight: 0.01, path: 'academy',
    towns: ['Mexico City', 'Monterrey', 'Guadalajara'],
    youth: [{ name: 'NBA Academy Latin America', color: '#002D62' }, { name: 'Fuerza Regia youth', color: '#F28C28' }],
    homeLeague: 'LAT', youthLeague: 'NBA Academy schedule', nationColor: '#006847',
  },
  {
    country: 'Japan', nation: 'Japan', weight: 0.015, path: 'asia',
    towns: ['Tokyo', 'Sendai', 'Fukuoka', 'Toyama'],
    youth: [{ name: 'Sendai Seiryo High School', color: '#1F3A7A' }, { name: 'Fukuoka Minato High School', color: '#C8102E' }],
    homeLeague: 'BLG', youthLeague: 'Winter Cup circuit', nationColor: '#BC002D',
  },
  {
    country: 'South Korea', nation: 'South Korea', weight: 0.01, path: 'asia',
    towns: ['Seoul', 'Busan', 'Daegu'],
    youth: [{ name: 'Hanbit High School', color: '#1F3A7A' }, { name: 'Gangnam Sports High School', color: '#7A1F2B' }],
    homeLeague: 'KBL', youthLeague: 'Korean high school league', nationColor: '#CD2E3A',
  },
  {
    country: 'China', nation: 'China', weight: 0.015, path: 'asia',
    towns: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen'],
    youth: [{ name: 'Guangdong Southern Tigers youth', color: '#C8102E' }, { name: 'Beijing Ducks youth', color: '#7A1F2B' }],
    homeLeague: 'CBA', youthLeague: 'Provincial youth league', nationColor: '#DE2910',
  },
  {
    country: 'Philippines', nation: 'Philippines', weight: 0.01, path: 'asia',
    towns: ['Manila', 'Quezon City', 'Cebu City'],
    youth: [{ name: 'Ateneo Blue Eaglets', color: '#1F3A7A' }, { name: 'NU Nazareth School', color: '#1F2A44' }],
    homeLeague: 'PBA', youthLeague: 'UAAP juniors', nationColor: '#0038A8',
  },
];

export const originOf = (country: string): Origin => ORIGINS.find((o) => o.country === country) ?? ORIGINS[0];

// US prep schools that recruit international teenagers (fictional names)
export const US_PREPS: { name: string; color: string }[] = [
  { name: 'Lakeland Christian Academy (FL)', color: '#1F3A7A' },
  { name: 'Blue Ridge Prep (VA)', color: '#1E5B3A' },
  { name: 'Desert Sky Academy (AZ)', color: '#B3541E' },
  { name: 'Oak Hollow Academy (TN)', color: '#5B2A86' },
];
