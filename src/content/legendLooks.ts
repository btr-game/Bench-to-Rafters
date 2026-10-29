// How the legends look in their pixel portraits (round 17): skin tone, hair, facial hair and
// signature gear, each from the player's well-known look in the years he is drawn for (his peak
// with that franchise). A respectful likeness, not a caricature; anyone missing gets a look
// built from his name.
//
// skin: 1 (fair) to 7 (deep). hair: bald, buzz, short, flattop, afro, bigafro, cornrows,
// twists, long, mop, mullet, parted, curly. colour: k black, b brown, l blond, r red, g grey,
// x dyed green. face: none, stubble, mustache, goatee, beard, bigbeard, sideburns.
// gear: headband, goggles, sleeve, unibrow.

export type Hair = 'bald' | 'buzz' | 'short' | 'flattop' | 'afro' | 'bigafro' | 'cornrows' | 'twists' | 'long' | 'mop' | 'mullet' | 'parted' | 'curly';
export type Face = 'none' | 'stubble' | 'mustache' | 'goatee' | 'beard' | 'bigbeard' | 'sideburns';

export interface LegendLook {
  skin: number;
  hair: Hair;
  color: 'k' | 'b' | 'l' | 'r' | 'g' | 'x';
  face: Face;
  gear: string[];
}

type Row = [number, Hair, LegendLook['color'], Face, string?];

const ROWS: Record<string, Row> = {
  // Hawks
  'Trae Young': [4, 'short', 'k', 'none'],
  'Joe Johnson': [5, 'buzz', 'k', 'goatee'],
  'Dominique Wilkins': [5, 'flattop', 'k', 'mustache'],
  'Bob Pettit': [1, 'parted', 'b', 'none'],
  'Dikembe Mutombo': [7, 'bald', 'k', 'none'],
  // Celtics
  'Bob Cousy': [1, 'parted', 'k', 'none'],
  'John Havlicek': [1, 'parted', 'b', 'none'],
  'Larry Bird': [1, 'mop', 'l', 'mustache'],
  'Kevin McHale': [1, 'mop', 'b', 'none'],
  'Bill Russell': [6, 'bald', 'k', 'goatee'],
  // Nets
  'Jason Kidd': [4, 'buzz', 'k', 'none'],
  'Drazen Petrovic': [1, 'curly', 'k', 'none'],
  'Julius Erving': [5, 'bigafro', 'k', 'none'],
  'Buck Williams': [5, 'short', 'k', 'mustache'],
  'Brook Lopez': [2, 'curly', 'k', 'beard'],
  // Knicks
  'Jalen Brunson': [4, 'short', 'k', 'none'],
  'Walt Frazier': [5, 'afro', 'k', 'sideburns'],
  'Bernard King': [5, 'short', 'k', 'mustache'],
  'Willis Reed': [6, 'short', 'k', 'none'],
  'Patrick Ewing': [6, 'flattop', 'k', 'none'],
  // 76ers
  'Maurice Cheeks': [5, 'short', 'k', 'mustache'],
  'Allen Iverson': [5, 'cornrows', 'k', 'goatee', 'headband sleeve'],
  'Billy Cunningham': [1, 'parted', 'b', 'none'],
  'Charles Barkley': [5, 'bald', 'k', 'none'],
  'Joel Embiid': [5, 'short', 'k', 'none'],
  // Raptors
  'Kyle Lowry': [5, 'buzz', 'k', 'beard'],
  'Vince Carter': [5, 'short', 'k', 'none'],
  'Kawhi Leonard': [5, 'cornrows', 'k', 'beard'],
  'Pascal Siakam': [6, 'flattop', 'k', 'none'],
  'Chris Bosh': [5, 'buzz', 'k', 'goatee'],
  // Bulls
  'Derrick Rose': [5, 'short', 'k', 'none'],
  'Michael Jordan': [5, 'bald', 'k', 'none'],
  'Scottie Pippen': [5, 'short', 'k', 'none'],
  'Horace Grant': [5, 'flattop', 'k', 'none', 'goggles'],
  'Artis Gilmore': [5, 'bigafro', 'k', 'beard'],
  // Cavaliers
  'Kyrie Irving': [4, 'short', 'k', 'beard'],
  'Donovan Mitchell': [5, 'short', 'k', 'none'],
  'LeBron James': [5, 'short', 'k', 'beard', 'headband'],
  'Evan Mobley': [5, 'short', 'k', 'none'],
  'Brad Daugherty': [5, 'short', 'k', 'none'],
  // Pistons
  'Isiah Thomas': [5, 'short', 'k', 'mustache'],
  'Joe Dumars': [5, 'short', 'k', 'mustache'],
  'Grant Hill': [4, 'short', 'k', 'none'],
  'Dennis Rodman': [5, 'buzz', 'x', 'none'],
  'Ben Wallace': [6, 'afro', 'k', 'beard', 'headband'],
  // Pacers
  'Tyrese Haliburton': [4, 'short', 'k', 'none'],
  'Reggie Miller': [5, 'buzz', 'k', 'none'],
  'Paul George': [5, 'short', 'k', 'goatee'],
  "Jermaine O'Neal": [5, 'cornrows', 'k', 'none'],
  'Rik Smits': [1, 'mullet', 'b', 'none'],
  // Bucks
  'Sidney Moncrief': [5, 'short', 'k', 'mustache'],
  'Ray Allen': [5, 'buzz', 'k', 'none'],
  'Marques Johnson': [5, 'afro', 'k', 'mustache'],
  'Giannis Antetokounmpo': [5, 'short', 'k', 'beard'],
  'Kareem Abdul-Jabbar': [5, 'short', 'k', 'none', 'goggles'],
  // Hornets
  'Kemba Walker': [5, 'short', 'k', 'none'],
  'LaMelo Ball': [4, 'curly', 'l', 'none'],
  'Glen Rice': [5, 'flattop', 'k', 'none'],
  'Larry Johnson': [5, 'short', 'k', 'goatee'],
  'Al Jefferson': [5, 'buzz', 'k', 'none'],
  // Heat
  'Tim Hardaway': [5, 'short', 'k', 'mustache'],
  'Dwyane Wade': [5, 'buzz', 'k', 'goatee'],
  'Jimmy Butler': [5, 'short', 'k', 'beard'],
  'Bam Adebayo': [5, 'short', 'k', 'none'],
  'Alonzo Mourning': [5, 'flattop', 'k', 'none'],
  // Magic
  'Penny Hardaway': [5, 'short', 'k', 'none'],
  'Tracy McGrady': [5, 'short', 'k', 'none'],
  'Franz Wagner': [1, 'short', 'b', 'none'],
  'Paolo Banchero': [4, 'short', 'k', 'none'],
  'Dwight Howard': [5, 'short', 'k', 'none'],
  // Wizards
  'Gilbert Arenas': [5, 'short', 'k', 'beard'],
  'Earl Monroe': [5, 'afro', 'k', 'mustache'],
  'Bradley Beal': [5, 'short', 'k', 'beard'],
  'Elvin Hayes': [5, 'afro', 'k', 'mustache'],
  'Wes Unseld': [5, 'short', 'k', 'none'],
  // Nuggets
  'Jamal Murray': [2, 'short', 'b', 'beard'],
  'David Thompson': [5, 'afro', 'k', 'mustache'],
  'Alex English': [5, 'afro', 'k', 'mustache'],
  'Carmelo Anthony': [5, 'cornrows', 'k', 'goatee', 'headband'],
  'Nikola Jokic': [1, 'short', 'b', 'stubble'],
  // Timberwolves
  'Sam Cassell': [5, 'short', 'k', 'none'],
  'Anthony Edwards': [5, 'short', 'k', 'none'],
  'Kevin Garnett': [5, 'buzz', 'k', 'none'],
  'Kevin Love': [1, 'short', 'b', 'beard'],
  'Karl-Anthony Towns': [4, 'short', 'k', 'none'],
  // Thunder / SuperSonics
  'Russell Westbrook': [5, 'short', 'k', 'none'],
  'Shai Gilgeous-Alexander': [5, 'short', 'k', 'none'],
  'Kevin Durant': [5, 'short', 'k', 'beard', 'headband'],
  'Shawn Kemp': [5, 'flattop', 'k', 'none'],
  'Jack Sikma': [1, 'curly', 'l', 'none'],
  // Trail Blazers
  'Damian Lillard': [5, 'short', 'k', 'beard', 'headband'],
  'Clyde Drexler': [5, 'short', 'k', 'mustache'],
  'Brandon Roy': [5, 'short', 'k', 'none'],
  'LaMarcus Aldridge': [5, 'short', 'k', 'none'],
  'Bill Walton': [1, 'curly', 'r', 'beard'],
  // Jazz
  'John Stockton': [1, 'parted', 'b', 'none'],
  'Pete Maravich': [1, 'mop', 'b', 'none'],
  'Adrian Dantley': [5, 'afro', 'k', 'mustache'],
  'Karl Malone': [5, 'short', 'k', 'none'],
  'Rudy Gobert': [5, 'short', 'k', 'stubble'],
  // Warriors
  'Stephen Curry': [4, 'short', 'k', 'stubble'],
  'Klay Thompson': [4, 'short', 'k', 'none'],
  'Rick Barry': [1, 'parted', 'b', 'none'],
  'Draymond Green': [5, 'short', 'k', 'beard'],
  'Wilt Chamberlain': [5, 'short', 'k', 'goatee', 'headband'],
  // Clippers / Braves
  'Randy Smith': [5, 'afro', 'k', 'mustache'],
  'World B. Free': [5, 'afro', 'k', 'mustache'],
  'Blake Griffin': [3, 'short', 'k', 'beard'],
  'Bob McAdoo': [5, 'afro', 'k', 'mustache'],
  // Lakers
  'Jerry West': [1, 'parted', 'b', 'none'],
  'Kobe Bryant': [5, 'buzz', 'k', 'none'],
  'Magic Johnson': [5, 'short', 'k', 'none'],
  'Elgin Baylor': [5, 'short', 'k', 'none'],
  "Shaquille O'Neal": [5, 'bald', 'k', 'goatee'],
  // Suns
  'Steve Nash': [1, 'long', 'b', 'none'],
  'Devin Booker': [4, 'short', 'k', 'beard'],
  'Shawn Marion': [5, 'short', 'k', 'none'],
  "Amar'e Stoudemire": [5, 'short', 'k', 'beard'],
  'Alvan Adams': [1, 'curly', 'b', 'none'],
  // Kings / Royals
  'Oscar Robertson': [5, 'short', 'k', 'none'],
  'Tiny Archibald': [5, 'short', 'k', 'mustache'],
  'Peja Stojakovic': [1, 'short', 'b', 'none'],
  'Chris Webber': [5, 'bald', 'k', 'goatee'],
  'Jerry Lucas': [1, 'parted', 'b', 'none'],
  // Mavericks
  'Luka Doncic': [1, 'mop', 'b', 'stubble'],
  'Rolando Blackman': [5, 'short', 'k', 'none'],
  'Mark Aguirre': [5, 'short', 'k', 'mustache'],
  'Dirk Nowitzki': [1, 'mop', 'l', 'none'],
  'Tyson Chandler': [5, 'short', 'k', 'none'],
  // Rockets
  'James Harden': [4, 'short', 'k', 'bigbeard'],
  'Calvin Murphy': [5, 'afro', 'k', 'mustache'],
  'Rudy Tomjanovich': [1, 'parted', 'b', 'none'],
  'Moses Malone': [5, 'short', 'k', 'mustache'],
  'Hakeem Olajuwon': [6, 'short', 'k', 'none'],
  // Grizzlies
  'Ja Morant': [5, 'short', 'k', 'none'],
  'Mike Conley': [5, 'short', 'k', 'none'],
  'Shareef Abdur-Rahim': [5, 'short', 'k', 'none'],
  'Jaren Jackson Jr.': [5, 'short', 'k', 'none'],
  'Marc Gasol': [1, 'short', 'b', 'beard'],
  // Pelicans
  'Chris Paul': [5, 'short', 'k', 'none'],
  'Jrue Holiday': [5, 'short', 'k', 'beard'],
  'Brandon Ingram': [5, 'short', 'k', 'none'],
  'Zion Williamson': [5, 'short', 'k', 'none'],
  'Anthony Davis': [5, 'short', 'k', 'none', 'unibrow'],
  // Spurs
  'Tony Parker': [3, 'short', 'k', 'none'],
  'George Gervin': [5, 'afro', 'k', 'mustache'],
  'Manu Ginobili': [1, 'bald', 'b', 'none'],
  'Tim Duncan': [5, 'short', 'k', 'none'],
  'David Robinson': [5, 'short', 'k', 'none'],
  // the contest fields
  'Craig Hodges': [5, 'short', 'k', 'mustache'],
  'Kyle Korver': [1, 'short', 'b', 'none'],
  'Mark Price': [1, 'short', 'b', 'none'],
  'Dale Ellis': [5, 'short', 'k', 'mustache'],
  'Jason Kapono': [2, 'short', 'k', 'none'],
  'Zach LaVine': [4, 'short', 'k', 'none'],
  'Aaron Gordon': [4, 'curly', 'k', 'none'],
  'Mac McClung': [1, 'mullet', 'b', 'none'],
  'Jason Richardson': [5, 'short', 'k', 'none'],
  'Spud Webb': [5, 'short', 'k', 'none'],
  'Nate Robinson': [5, 'short', 'k', 'none'],
};

export function legendLook(name: string): LegendLook | null {
  const r = ROWS[name];
  return r ? { skin: r[0], hair: r[1], color: r[2], face: r[3], gear: r[4] ? r[4].split(' ') : [] } : null;
}
