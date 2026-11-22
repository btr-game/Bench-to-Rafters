// A signature for each of the Floor's best legends (a shared kind for those rated 90 to 94, one of his
// own for those rated 95 or more, owner: "from 95, they actually get their own move") (after round 42, owner: "can we give each legend
// in the floor (not all of them, maybe more than 90 ovr) a signature move or unique trait? ex: dame
// shoots better from deep, curry's fast release(greenbar fills much faster), so on"). Every legend
// rated 90 or more has one: a name of his own (it stays English, as names do) and one of a dozen
// kinds, each a small edge in the engine (balance.ts FLOOR.trait, engine/floor/sim.ts).

import type { FloorOwnTrait90, FloorTrait } from '../engine/floor/sim';

/** Whether the signatures are in the game (off, nobody carries one and none is shown). Held back until
 * the owner had gone through the list ("confirm the signature moves before getting them through");
 * on once he had: shared kinds to 94, one of his own from 95. */
export const SIGNATURES_ON: boolean = true;

export const LEGEND_TRAITS: Record<string, { kind: FloorTrait; name: string }> = {
  'Michael Jordan': { kind: 'mj', name: 'The fadeaway' },
  'LeBron James': { kind: 'lebron', name: 'Freight train' },
  'Kareem Abdul-Jabbar': { kind: 'kareem', name: 'The skyhook' },
  'Nikola Jokic': { kind: 'jokic', name: 'Sombor Shuffle' },
  'Wilt Chamberlain': { kind: 'wilt', name: 'Fifty-five boards' },
  "Shaquille O'Neal": { kind: 'shaq', name: 'Diesel drop step' },
  'Larry Bird': { kind: 'bird', name: 'Larry Legend' },
  'Giannis Antetokounmpo': { kind: 'giannis', name: 'Greek Freak strides' },
  'Stephen Curry': { kind: 'curry', name: 'Chef Curry' },
  'Magic Johnson': { kind: 'magic', name: 'Showtime no-look' },
  'Hakeem Olajuwon': { kind: 'hakeem', name: 'Dream Shake' },
  'Tim Duncan': { kind: 'duncan', name: 'The bank shot' },
  'Bill Russell': { kind: 'russell', name: 'Rim protector' },
  'Shai Gilgeous-Alexander': { kind: 'sga', name: 'Mid-range maestro' },
  'Kevin Durant': { kind: 'kd', name: 'Unguardable jumper' },
  'Kobe Bryant': { kind: 'kobe', name: 'Mamba mentality' },
  'Oscar Robertson': { kind: 'oscar', name: 'The Big O' },
  'Luka Doncic': { kind: 'luka', name: 'Step-back three' },
  'Julius Erving': { kind: 'drj', name: 'Rock the baby' },
  'Joel Embiid': { kind: 'embiid', name: 'The shimmy' },
  'Kawhi Leonard': { kind: 'kawhi', name: 'The Klaw' },
  'Dwyane Wade': { kind: 'wade', name: 'Flash chase-down' },
  'Kevin Garnett': { kind: 'kg', name: 'The Big Ticket' },
  'Karl Malone': { kind: 'malone', name: 'The Mailman delivers' },
  'Jerry West': { kind: 'west', name: 'Mr. Clutch' },
  'Dirk Nowitzki': { kind: 'dirk', name: 'One-legged fade' },
  'James Harden': { kind: 'harden', name: 'The step-back' },
  'David Robinson': { kind: 'robinson', name: 'The Admiral' },
  'Bob Pettit': { kind: 'glass', name: 'Second chances' },
  'Tracy McGrady': { kind: 'clutch', name: 'Thirteen in thirty-three' },
  'Elgin Baylor': { kind: 'power', name: 'Hang time' },
  'Moses Malone': { kind: 'glass', name: 'Chairman of the Boards' },
  'Chris Paul': { kind: 'steal', name: 'Point God hands' },
  'Anthony Davis': { kind: 'block', name: 'The Brow' },
  'Patrick Ewing': { kind: 'block', name: 'Hoya Destroya' },
  'Allen Iverson': { kind: 'handle', name: 'Killer crossover' },
  'Charles Barkley': { kind: 'glass', name: 'Round Mound of Rebound' },
  'Isiah Thomas': { kind: 'handle', name: 'Zeke’s dribble' },
  'Dwight Howard': { kind: 'block', name: 'Superman' },
  'Russell Westbrook': { kind: 'motor', name: 'Why not?' },
  'Rick Barry': { kind: 'pass', name: 'Point forward' },
  'Steve Nash': { kind: 'pass', name: 'Seven seconds or less' },
  'Dominique Wilkins': { kind: 'power', name: 'Human Highlight Film' },
  'John Havlicek': { kind: 'motor', name: 'Never stops running' },
  'Jason Kidd': { kind: 'pass', name: 'The outlet' },
  'Walt Frazier': { kind: 'steal', name: 'Clyde’s quick hands' },
  'Scottie Pippen': { kind: 'steal', name: 'Lockdown wingspan' },
  'Anthony Edwards': { kind: 'power', name: 'Ant-Man poster' },
  'Damian Lillard': { kind: 'deep', name: 'Dame Time' },
  'Clyde Drexler': { kind: 'power', name: 'Clyde the Glide' },
  'Bill Walton': { kind: 'pass', name: 'High-post passing' },
  'John Stockton': { kind: 'pass', name: 'Pick-and-roll maestro' },
  'George Gervin': { kind: 'power', name: 'The finger roll' },
  'Bob Cousy': { kind: 'pass', name: 'Houdini of the Hardwood' },
  'Kevin McHale': { kind: 'hook', name: 'The torture chamber' },
  'Bernard King': { kind: 'quick', name: 'Quick trigger' },
  'Willis Reed': { kind: 'clutch', name: 'The Game 7 walk-out' },
  'Derrick Rose': { kind: 'handle', name: 'Hesi burst' },
  'Grant Hill': { kind: 'handle', name: 'Point-forward crossover' },
  'Elvin Hayes': { kind: 'glass', name: 'The Big E' },
  'Carmelo Anthony': { kind: 'fade', name: 'The jab step' },
  'Bob McAdoo': { kind: 'fade', name: 'Sweet jumper' },
  'Devin Booker': { kind: 'fade', name: 'Mid-range assassin' },
  'Chris Webber': { kind: 'pass', name: 'Big-man vision' },
  'Jalen Brunson': { kind: 'handle', name: 'Footwork' },
  'Vince Carter': { kind: 'power', name: 'Vinsanity' },
  'Kyrie Irving': { kind: 'handle', name: 'Uncle Drew handles' },
  'Donovan Mitchell': { kind: 'power', name: 'Spida' },
  'Reggie Miller': { kind: 'clutch', name: 'Miller Time' },
  'Paul George': { kind: 'steal', name: 'Two-way wing' },
  'Alonzo Mourning': { kind: 'block', name: 'Zo' },
  'Penny Hardaway': { kind: 'pass', name: 'Penny’s dimes' },
  'Pete Maravich': { kind: 'handle', name: 'Pistol Pete' },
  'Tiny Archibald': { kind: 'handle', name: 'Tiny' },
  // the sixth men rated 90 or more (after round 42, "let's just have sixth man in the teams")
  'Victor Wembanyama': { kind: 'block', name: 'The Alien' },
  'Cooper Flagg': { kind: 'steal', name: 'Two-way rookie' },
  'Gary Payton': { kind: 'steal', name: 'The Glove' },
  'Paul Pierce': { kind: 'stepback', name: 'The Truth' },
  'Hal Greer': { kind: 'fade', name: 'The jump-shot free throw' },
  'Chris Mullin': { kind: 'deep', name: 'Lefty stroke' },
  'James Worthy': { kind: 'quick', name: 'Big Game James' },
  'Kevin Johnson': { kind: 'handle', name: 'KJ first step' },
  'Yao Ming': { kind: 'hook', name: 'The Great Wall' },
};

/** Whether the legends rated 90 to 94 play with a move of their own (LEGEND_TRAITS_90_OWN) instead of
 * their shared kind (after round 42, owner: the 90s get their own too, each smaller than a 95's;
 * their signature names stay as they are); on once the owner said no confirmation was needed. Off,
 * they would keep the shared kinds above. */
export const OWN_90_ON: boolean = true;

/** The own move of each legend rated 90 to 94 (FLOOR.sig90 has what each is worth). */
export const LEGEND_TRAITS_90_OWN: Record<string, FloorOwnTrait90> = {
  'Bob Pettit': 'pettit',
  'Tracy McGrady': 'tmac',
  'Elgin Baylor': 'baylor',
  'Moses Malone': 'moses',
  'Chris Paul': 'cp3',
  'Anthony Davis': 'ad',
  'Patrick Ewing': 'ewing',
  'Allen Iverson': 'iverson',
  'Charles Barkley': 'barkley',
  'Isiah Thomas': 'zeke',
  'Dwight Howard': 'dwight',
  'Russell Westbrook': 'russ',
  'Rick Barry': 'barry',
  'Steve Nash': 'nash',
  'Dominique Wilkins': 'nique',
  'John Havlicek': 'hondo',
  'Jason Kidd': 'kidd',
  'Walt Frazier': 'frazier',
  'Scottie Pippen': 'pippen',
  'Anthony Edwards': 'ant',
  'Damian Lillard': 'dame',
  'Clyde Drexler': 'glide',
  'Bill Walton': 'walton',
  'John Stockton': 'stockton',
  'George Gervin': 'iceman',
  'Bob Cousy': 'cousy',
  'Kevin McHale': 'mchale',
  'Bernard King': 'king',
  'Willis Reed': 'reed',
  'Derrick Rose': 'rose',
  'Grant Hill': 'hill',
  'Elvin Hayes': 'bige',
  'Carmelo Anthony': 'melo',
  'Bob McAdoo': 'mcadoo',
  'Devin Booker': 'booker',
  'Chris Webber': 'webber',
  'Jalen Brunson': 'brunson',
  'Vince Carter': 'vince',
  'Kyrie Irving': 'kyrie',
  'Donovan Mitchell': 'spida',
  'Reggie Miller': 'reggie',
  'Paul George': 'pg13',
  'Alonzo Mourning': 'zo',
  'Penny Hardaway': 'penny',
  'Pete Maravich': 'pistol',
  'Tiny Archibald': 'tiny',
  'Victor Wembanyama': 'wemby',
  'Cooper Flagg': 'flagg',
  'Gary Payton': 'glove',
  'Paul Pierce': 'truth',
  'Hal Greer': 'greer',
  'Chris Mullin': 'mullin',
  'James Worthy': 'worthy',
  'Kevin Johnson': 'kj',
  'Yao Ming': 'yao',
};

/** A legend's signature as the game has it now: none while SIGNATURES_ON is off; for a legend rated 90
 * to 94, his own move once OWN_90_ON is on; the name is always LEGEND_TRAITS'. */
export function legendTrait(name: string): { kind: FloorTrait; name: string } | undefined {
  const x = SIGNATURES_ON ? LEGEND_TRAITS[name] : undefined;
  if (!x) return undefined;
  const own = OWN_90_ON ? LEGEND_TRAITS_90_OWN[name] : undefined;
  return own ? { kind: own, name: x.name } : x;
}
