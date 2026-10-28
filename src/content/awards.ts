// How each award looks and what it means (playtest round 6): a category colour, an icon and
// a one-line description, so the trophy cabinet reads at a glance.

export type AwardCat = 'title' | 'mvp' | 'series' | 'team' | 'defense' | 'rookie' | 'skills' | 'country' | 'school';

export const AWARD_CATS: Record<AwardCat, { name: string; color: string; icon: string }> = {
  title: { name: 'Championship', color: '#B8860B', icon: '🏆' },
  mvp: { name: 'MVP', color: '#7B2CBF', icon: '👑' },
  series: { name: 'Big-game MVP', color: '#D2601A', icon: '🎖️' },
  team: { name: 'All-league team', color: '#2A78D6', icon: '⭐' },
  defense: { name: 'Defense', color: '#1D7F47', icon: '🛡️' },
  rookie: { name: 'Breakout', color: '#0F8A8A', icon: '🌱' },
  skills: { name: 'Skills', color: '#C8102E', icon: '🎯' },
  country: { name: 'National team', color: '#8A6D1F', icon: '🥇' },
  school: { name: 'School and youth', color: '#6B4E2E', icon: '🎓' },
};

const A: Record<string, [AwardCat, string]> = {
  MVP: ['mvp', 'Best player in the league this season'],
  FMVP: ['series', 'Best player of the NBA Finals'],
  CFMVP: ['series', 'Best player of a conference finals series'],
  TITLE: ['title', 'Won the NBA championship'],
  TITLEKEY: ['title', 'Won the NBA championship as a key player'],
  ALLNBA1: ['team', 'One of the five best players in the league'],
  ALLNBA2: ['team', 'Ranked sixth to tenth in the league'],
  ALLNBA3: ['team', 'Ranked eleventh to fifteenth in the league'],
  ALLSTAR: ['team', 'Picked for the All-Star Game'],
  ASGMVP: ['series', 'Best player of the All-Star Game'],
  DPOY: ['defense', 'Best defender in the league'],
  ROY: ['rookie', 'Best first-year player'],
  ALLROOKIE: ['rookie', 'One of the ten best rookies'],
  SIXTH: ['rookie', 'Best player off the bench'],
  MIP: ['rookie', 'Biggest jump from the season before'],
  SCORING: ['skills', 'Led the league in points per game'],
  NBACUP: ['title', 'Won the in-season NBA Cup'],
  CUPMVP: ['series', 'Best player of the NBA Cup knockouts'],
  '3PT': ['skills', 'Won the 3-Point Contest'],
  DUNK: ['skills', 'Won the Slam Dunk Contest'],
  NAISMITH: ['mvp', 'Best player in college basketball'],
  AA1: ['team', 'One of the ten best college players'],
  AA2: ['team', 'Ranked eleventh to twentieth in college'],
  CONFPOY: ['mvp', 'Best player in the conference'],
  ALLCONF: ['team', 'One of the five best in the conference'],
  CONFTOURN: ['title', 'Won the conference tournament'],
  NCAATITLE: ['title', 'Won the national championship'],
  FFMOP: ['series', 'Best player of the Final Four'],
  GLMVP: ['mvp', 'Best player in the G League'],
  EUMVP: ['mvp', 'Best player in the EuroLeague'],
  INTMVP: ['mvp', 'Best player in the league'],
  GLALL: ['team', 'One of the five best in the G League'],
  EUALL: ['team', 'One of the five best in the EuroLeague'],
  INTALL: ['team', 'One of the five best in the league'],
  GLTITLE: ['title', 'Won the G League title'],
  EUTITLE: ['title', 'Won the EuroLeague'],
  INTTITLE: ['title', 'Won the league title'],
  PLAYOFFMVP: ['series', 'Best player of the finals'],
  STATETITLE: ['title', 'Won the state or youth league title'],
  ALLSTATE: ['school', 'One of the ten best players in the league'],
  HSNATL: ['title', 'Won the national prep invitational'],
  MCDAA: ['school', 'One of the 24 best high school seniors'],
  GATORADE: ['school', 'Best high school player in the country'],
  OLYGOLD: ['country', 'Olympic gold medal'],
  OLYMEDAL: ['country', 'Olympic medal'],
  WCGOLD: ['country', 'World Cup gold medal'],
  WCMEDAL: ['country', 'World Cup medal'],
  YOUTHMEDAL: ['country', 'Medal at a youth World Cup'],
};

export interface AwardLook {
  cat: AwardCat;
  color: string;
  icon: string;
  desc: string;
}

/** Look for an award by key, or (for story pages that only have the label) by its wording. */
export function awardLook(key: string | null, label: string): AwardLook {
  let hit = key ? A[key] : undefined;
  if (!hit) {
    const l = label.toLowerCase();
    const cat: AwardCat = /olympic|world cup|medal/.test(l)
      ? 'country'
      : /finals mvp|final four|game mvp|cup mvp|final mvp/.test(l)
      ? 'series'
      : /mvp|player of the year/.test(l)
      ? 'mvp'
      : /champion|title/.test(l)
      ? 'title'
      : /defensive/.test(l)
      ? 'defense'
      : /rookie|sixth|improved|rising/.test(l)
      ? 'rookie'
      : /contest|scoring/.test(l)
      ? 'skills'
      : /mcdonald|gatorade|all-state|state/.test(l)
      ? 'school'
      : 'team';
    const known = Object.entries(A).find(([k]) => labelFor(k) === label);
    hit = known ? known[1] : [cat, ''];
  }
  const c = AWARD_CATS[hit[0]];
  return { cat: hit[0], color: c.color, icon: c.icon, desc: hit[1] };
}

// labels as the game writes them, for story pages that only carry the label
const LABEL_KEY: Record<string, string> = {
  MVP: 'MVP',
  'Finals MVP': 'FMVP',
  'All-NBA 1st Team': 'ALLNBA1',
  'All-NBA 2nd Team': 'ALLNBA2',
  'All-NBA 3rd Team': 'ALLNBA3',
  'All-Star': 'ALLSTAR',
  'All-Star Game MVP': 'ASGMVP',
  'Defensive Player of the Year': 'DPOY',
  'Rookie of the Year': 'ROY',
  'All-Rookie Team': 'ALLROOKIE',
  'Sixth Man of the Year': 'SIXTH',
  'Most Improved Player': 'MIP',
  'Scoring title': 'SCORING',
  'NBA Champion': 'TITLE',
  'NBA Cup champion': 'NBACUP',
  'NBA Cup MVP': 'CUPMVP',
  '3-Point Contest champion': '3PT',
  'Slam Dunk champion': 'DUNK',
  'Naismith Player of the Year': 'NAISMITH',
  'All-American 1st Team': 'AA1',
  'All-American 2nd Team': 'AA2',
  "McDonald's All-American": 'MCDAA',
  'Gatorade Player of the Year': 'GATORADE',
  'All-State': 'ALLSTATE',
  'National champion': 'NCAATITLE',
  'Final Four Most Outstanding Player': 'FFMOP',
  'G League MVP': 'GLMVP',
  'EuroLeague MVP': 'EUMVP',
  'G League champion': 'GLTITLE',
  'EuroLeague champion': 'EUTITLE',
  'State champion': 'STATETITLE',
};
const labelFor = (k: string) => Object.entries(LABEL_KEY).find(([, v]) => v === k)?.[0] ?? '';
