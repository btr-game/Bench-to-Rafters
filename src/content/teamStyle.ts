// Team identities for the artwork (round 17): each NBA team's real colours, the motif its crest
// is built around (a nod to the club, never a copy of its logo), and its three kits: home
// (light), road (the team colour) and a city edition. Palettes follow the teams' current brand
// colours; city editions are in the spirit of the teams' recent alternates, not exact copies.

export type Motif =
  | 'shamrock'
  | 'bridge'
  | 'skyline'
  | 'bell'
  | 'claw'
  | 'horns'
  | 'sword'
  | 'piston'
  | 'checker'
  | 'antlers'
  | 'feather'
  | 'stinger'
  | 'flame'
  | 'star'
  | 'monument'
  | 'peaks'
  | 'wolf'
  | 'bolt'
  | 'rose'
  | 'note'
  | 'goldengate'
  | 'sail'
  | 'crown'
  | 'sun'
  | 'horse'
  | 'rocket'
  | 'paw'
  | 'fleur'
  | 'spur'
  | 'swish';

export interface Kit {
  base: string; // jersey and shorts
  ink: string; // wordmark and number
  trim: string; // collar, armholes, the number's outline, the shorts stripe
  word: string; // across the chest
  pattern?: 'pinstripe' | 'sash' | 'panel';
}

export interface TeamStyle {
  c1: string;
  c2: string;
  c3: string;
  motif: Motif;
  home: Kit;
  road: Kit;
  city: Kit;
}

const W = '#FFFFFF';
const S = (c1: string, c2: string, c3: string, motif: Motif, home: Kit, road: Kit, city: Kit): TeamStyle => ({ c1, c2, c3, motif, home, road, city });
const K = (base: string, ink: string, trim: string, word: string, pattern?: Kit['pattern']): Kit => ({ base, ink, trim, word, pattern });

export const TEAM_STYLE: Record<string, TeamStyle> = {
  BOS: S('#007A33', '#BA9653', '#000000', 'shamrock', K(W, '#007A33', '#000000', 'CELTICS'), K('#007A33', W, '#000000', 'BOSTON'), K('#1C1C1C', '#BA9653', '#007A33', 'BOSTON')),
  BKN: S('#000000', '#FFFFFF', '#777D84', 'bridge', K(W, '#000000', '#777D84', 'BROOKLYN'), K('#000000', W, '#777D84', 'BROOKLYN'), K('#3C3F44', W, '#000000', 'BKLYN', 'panel')),
  NYK: S('#006BB6', '#F58426', '#BEC0C2', 'skyline', K(W, '#006BB6', '#F58426', 'KNICKS'), K('#006BB6', W, '#F58426', 'NEW YORK'), K('#1D1D1D', '#F58426', '#006BB6', 'NEW YORK')),
  PHI: S('#006BB6', '#ED174C', '#002B5C', 'bell', K(W, '#006BB6', '#ED174C', 'SIXERS'), K('#006BB6', W, '#ED174C', 'PHILA'), K('#002B5C', '#ED174C', W, 'PHILA')),
  TOR: S('#CE1141', '#000000', '#A1A1A4', 'claw', K(W, '#CE1141', '#000000', 'RAPTORS'), K('#CE1141', W, '#000000', 'TORONTO'), K('#000000', '#B4975A', '#CE1141', 'NORTH')),
  CHI: S('#CE1141', '#000000', '#41B6E6', 'horns', K(W, '#CE1141', '#000000', 'BULLS'), K('#CE1141', W, '#000000', 'CHICAGO'), K('#000000', '#CE1141', '#41B6E6', 'CHICAGO')),
  CLE: S('#860038', '#FDBB30', '#041E42', 'sword', K(W, '#860038', '#FDBB30', 'CAVS'), K('#860038', '#FDBB30', W, 'CAVS'), K('#041E42', '#FDBB30', '#860038', 'THE LAND')),
  DET: S('#C8102E', '#1D42BA', '#BEC0C2', 'piston', K(W, '#C8102E', '#1D42BA', 'DETROIT'), K('#1D42BA', W, '#C8102E', 'DETROIT'), K('#0C2340', '#C8102E', '#BEC0C2', 'MOTOR CITY')),
  IND: S('#002D62', '#FDBB30', '#BEC0C2', 'checker', K(W, '#002D62', '#FDBB30', 'PACERS'), K('#002D62', '#FDBB30', W, 'INDIANA'), K('#FDBB30', '#002D62', W, 'INDY')),
  MIL: S('#00471B', '#EEE1C6', '#0077C0', 'antlers', K('#EEE1C6', '#00471B', '#0077C0', 'BUCKS'), K('#00471B', '#EEE1C6', '#0077C0', 'BUCKS'), K('#0077C0', '#EEE1C6', '#00471B', 'CREAM CITY')),
  ATL: S('#E03A3E', '#C1D32F', '#26282A', 'feather', K(W, '#E03A3E', '#26282A', 'HAWKS'), K('#E03A3E', W, '#C1D32F', 'ATLANTA'), K('#26282A', '#E03A3E', '#C1D32F', 'ATL')),
  CHA: S('#1D1160', '#00788C', '#A1A1A4', 'stinger', K(W, '#00788C', '#1D1160', 'HORNETS'), K('#00788C', W, '#1D1160', 'HORNETS'), K('#1D1160', '#00788C', W, 'BUZZ CITY', 'pinstripe')),
  MIA: S('#98002E', '#F9A01B', '#000000', 'flame', K(W, '#98002E', '#000000', 'HEAT'), K('#000000', W, '#98002E', 'MIAMI'), K('#111111', '#FF65B2', '#41D9F5', 'MIAMI')),
  ORL: S('#0077C0', '#C4CED4', '#000000', 'star', K(W, '#0077C0', '#000000', 'MAGIC', 'pinstripe'), K('#0077C0', W, '#000000', 'ORLANDO'), K('#000000', '#0077C0', '#C4CED4', 'ORLANDO', 'pinstripe')),
  WAS: S('#002B5C', '#E31837', '#C4CED4', 'monument', K(W, '#002B5C', '#E31837', 'WIZARDS'), K('#002B5C', W, '#E31837', 'WIZARDS'), K('#000000', '#C9A44C', '#E31837', 'DC')),
  DEN: S('#0E2240', '#FEC524', '#8B2131', 'peaks', K(W, '#0E2240', '#FEC524', 'NUGGETS'), K('#0E2240', '#FEC524', '#8B2131', 'DENVER'), K('#1D428A', '#FEC524', '#8B2131', 'DENVER')),
  MIN: S('#0C2340', '#236192', '#78BE20', 'wolf', K(W, '#0C2340', '#78BE20', 'WOLVES'), K('#236192', W, '#78BE20', 'WOLVES'), K('#0C2340', '#78BE20', '#236192', 'TWIN CITIES')),
  OKC: S('#007AC1', '#EF3B24', '#002D62', 'bolt', K(W, '#007AC1', '#EF3B24', 'THUNDER'), K('#007AC1', W, '#EF3B24', 'OKC'), K('#002D62', '#EF3B24', '#FDBB30', 'OKC')),
  POR: S('#E03A3E', '#000000', '#FFFFFF', 'rose', K(W, '#000000', '#E03A3E', 'BLAZERS', 'sash'), K('#000000', W, '#E03A3E', 'PORTLAND', 'sash'), K('#E03A3E', '#000000', W, 'RIP CITY')),
  UTA: S('#002B5C', '#F9A01B', '#00471B', 'note', K(W, '#002B5C', '#F9A01B', 'JAZZ'), K('#002B5C', '#F9A01B', W, 'UTAH'), K('#000000', '#F9A01B', '#00471B', 'UTAH')),
  GSW: S('#1D428A', '#FFC72C', '#26282A', 'goldengate', K(W, '#1D428A', '#FFC72C', 'GOLDEN STATE'), K('#1D428A', '#FFC72C', W, 'GOLDEN STATE'), K('#111111', '#FFC72C', '#1D428A', 'THE TOWN')),
  LAC: S('#C8102E', '#1D428A', '#BEC0C2', 'sail', K(W, '#1D428A', '#C8102E', 'CLIPPERS'), K('#1D428A', W, '#C8102E', 'LA'), K('#000000', '#C8102E', '#1D428A', 'LA')),
  LAL: S('#552583', '#FDB927', '#000000', 'swish', K('#FDB927', '#552583', W, 'LAKERS'), K('#552583', '#FDB927', W, 'LAKERS'), K('#000000', '#FDB927', '#552583', 'LOS ANGELES')),
  PHX: S('#1D1160', '#E56020', '#63727A', 'sun', K(W, '#1D1160', '#E56020', 'SUNS'), K('#1D1160', W, '#E56020', 'PHOENIX'), K('#000000', '#E56020', '#1D1160', 'THE VALLEY')),
  SAC: S('#5A2D81', '#63727A', '#000000', 'crown', K(W, '#5A2D81', '#63727A', 'KINGS'), K('#5A2D81', W, '#63727A', 'KINGS'), K('#000000', '#9B6FCF', '#63727A', 'SACTOWN')),
  DAL: S('#00538C', '#002B5E', '#B8C4CA', 'horse', K(W, '#00538C', '#B8C4CA', 'MAVS'), K('#00538C', W, '#B8C4CA', 'DALLAS'), K('#002B5E', '#B8C4CA', '#00538C', 'DALLAS')),
  HOU: S('#CE1141', '#000000', '#C4CED4', 'rocket', K(W, '#CE1141', '#000000', 'ROCKETS'), K('#CE1141', W, '#000000', 'HOUSTON'), K('#000000', '#CE1141', '#FDB927', 'CLUTCH CITY')),
  MEM: S('#5D76A9', '#12173F', '#F5B112', 'paw', K(W, '#12173F', '#5D76A9', 'GRIZZ'), K('#12173F', '#5D76A9', W, 'MEMPHIS'), K('#5D76A9', '#12173F', '#F5B112', 'MEMPHIS')),
  NOP: S('#0C2340', '#C8102E', '#85714D', 'fleur', K(W, '#0C2340', '#85714D', 'PELICANS'), K('#0C2340', W, '#C8102E', 'NEW ORLEANS'), K('#5B2B82', '#F5B800', '#00843D', 'NOLA')),
  SAS: S('#C4CED4', '#000000', '#00B2A9', 'spur', K(W, '#000000', '#C4CED4', 'SPURS'), K('#000000', W, '#C4CED4', 'SAN ANTONIO'), K('#000000', '#00B2A9', '#EF426F', 'SA')),
};

/** Kits for teams without an entry (college, G League, clubs abroad, national teams): built from the one colour. */
export function genericKits(color: string, word: string): Pick<TeamStyle, 'home' | 'road' | 'city'> {
  return { home: K(W, color, '#1A1A1A', word), road: K(color, W, '#1A1A1A', word), city: K('#1A1A1A', color, W, word) };
}
