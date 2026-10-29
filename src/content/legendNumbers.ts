// Jersey numbers for the legends' pixel sprites (round 17), with the franchise they are drawn
// for. Only numbers we are sure of: a legend missing here wears a plain jersey rather than a
// wrong number.

export const LEGEND_NUMBERS: Record<string, number> = {
  'Trae Young': 11, 'Joe Johnson': 2, 'Dominique Wilkins': 21, 'Bob Pettit': 9, 'Dikembe Mutombo': 55,
  'Bob Cousy': 14, 'John Havlicek': 17, 'Larry Bird': 33, 'Kevin McHale': 32, 'Bill Russell': 6,
  'Jason Kidd': 5, 'Drazen Petrovic': 3, 'Julius Erving': 32, 'Buck Williams': 52, 'Brook Lopez': 11,
  'Jalen Brunson': 11, 'Walt Frazier': 10, 'Bernard King': 30, 'Willis Reed': 19, 'Patrick Ewing': 33,
  'Maurice Cheeks': 10, 'Allen Iverson': 3, 'Billy Cunningham': 32, 'Charles Barkley': 34, 'Joel Embiid': 21,
  'Kyle Lowry': 7, 'Vince Carter': 15, 'Kawhi Leonard': 2, 'Pascal Siakam': 43, 'Chris Bosh': 4,
  'Derrick Rose': 1, 'Michael Jordan': 23, 'Scottie Pippen': 33, 'Horace Grant': 54, 'Artis Gilmore': 53,
  'Kyrie Irving': 2, 'Donovan Mitchell': 45, 'LeBron James': 23, 'Evan Mobley': 4, 'Brad Daugherty': 43,
  'Isiah Thomas': 11, 'Joe Dumars': 4, 'Grant Hill': 33, 'Dennis Rodman': 10, 'Ben Wallace': 3,
  'Tyrese Haliburton': 0, 'Reggie Miller': 31, 'Paul George': 13, "Jermaine O'Neal": 7, 'Rik Smits': 45,
  'Sidney Moncrief': 4, 'Ray Allen': 34, 'Marques Johnson': 8, 'Giannis Antetokounmpo': 34, 'Kareem Abdul-Jabbar': 33,
  'Kemba Walker': 15, 'LaMelo Ball': 1, 'Glen Rice': 41, 'Larry Johnson': 2, 'Al Jefferson': 25,
  'Tim Hardaway': 10, 'Dwyane Wade': 3, 'Jimmy Butler': 22, 'Bam Adebayo': 13, 'Alonzo Mourning': 33,
  'Penny Hardaway': 1, 'Tracy McGrady': 1, 'Franz Wagner': 22, 'Paolo Banchero': 5, 'Dwight Howard': 12,
  'Gilbert Arenas': 0, 'Earl Monroe': 10, 'Bradley Beal': 3, 'Elvin Hayes': 11, 'Wes Unseld': 41,
  'Jamal Murray': 27, 'David Thompson': 33, 'Alex English': 2, 'Carmelo Anthony': 15, 'Nikola Jokic': 15,
  'Anthony Edwards': 5, 'Kevin Garnett': 21, 'Kevin Love': 42, 'Karl-Anthony Towns': 32,
  'Russell Westbrook': 0, 'Shai Gilgeous-Alexander': 2, 'Kevin Durant': 35, 'Shawn Kemp': 40, 'Jack Sikma': 43,
  'Damian Lillard': 0, 'Clyde Drexler': 22, 'Brandon Roy': 7, 'LaMarcus Aldridge': 12, 'Bill Walton': 32,
  'John Stockton': 12, 'Pete Maravich': 7, 'Adrian Dantley': 4, 'Karl Malone': 32, 'Rudy Gobert': 27,
  'Stephen Curry': 30, 'Klay Thompson': 11, 'Rick Barry': 24, 'Draymond Green': 23, 'Wilt Chamberlain': 13,
  'World B. Free': 21, 'Blake Griffin': 32, 'Bob McAdoo': 11,
  'Jerry West': 44, 'Kobe Bryant': 24, 'Magic Johnson': 32, 'Elgin Baylor': 22, "Shaquille O'Neal": 34,
  'Steve Nash': 13, 'Devin Booker': 1, 'Shawn Marion': 31, "Amar'e Stoudemire": 32, 'Alvan Adams': 33,
  'Oscar Robertson': 14, 'Tiny Archibald': 1, 'Peja Stojakovic': 16, 'Chris Webber': 4, 'Jerry Lucas': 16,
  'Luka Doncic': 77, 'Rolando Blackman': 22, 'Mark Aguirre': 24, 'Dirk Nowitzki': 41, 'Tyson Chandler': 6,
  'James Harden': 13, 'Calvin Murphy': 23, 'Rudy Tomjanovich': 45, 'Moses Malone': 24, 'Hakeem Olajuwon': 34,
  'Ja Morant': 12, 'Mike Conley': 11, 'Shareef Abdur-Rahim': 3, 'Jaren Jackson Jr.': 13, 'Marc Gasol': 33,
  'Chris Paul': 3, 'Jrue Holiday': 11, 'Brandon Ingram': 14, 'Zion Williamson': 1, 'Anthony Davis': 23,
  'Tony Parker': 9, 'George Gervin': 44, 'Manu Ginobili': 20, 'Tim Duncan': 21, 'David Robinson': 50,
  // the contest fields
  'Craig Hodges': 14, 'Kyle Korver': 26, 'Mark Price': 25, 'Dale Ellis': 3, 'Zach LaVine': 8, 'Aaron Gordon': 0, 'Spud Webb': 4, 'Nate Robinson': 2,
};

/** A few wore a different number for the team they appear for in a contest field. */
export const CONTEST_NUMBERS: Record<string, number> = { 'BOS:Ray Allen': 20 };

/** The dunk contest field's teams: the club each won (or lit up) the contest for. */
export const DUNKER_TEAMS: Record<string, string> = {
  'Vince Carter': 'TOR',
  'Zach LaVine': 'MIN',
  'Aaron Gordon': 'ORL',
  'Michael Jordan': 'CHI',
  'Dominique Wilkins': 'ATL',
  'Mac McClung': 'PHI',
  'Jason Richardson': 'GSW',
  'Julius Erving': 'BKN',
  'Spud Webb': 'ATL',
  'Nate Robinson': 'NYK',
  'Blake Griffin': 'LAC',
  'Dwight Howard': 'ORL',
};
