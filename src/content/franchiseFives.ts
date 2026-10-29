// All-time starting fives for every franchise (round 10: "compete with the legends"). Every
// player appears once, on the team where his peak was (LeBron James is a Cavalier, Kareem a
// Buck, Kawhi a Raptor, Wilt a Warrior). Franchise history follows the team: the Seattle
// SuperSonics are the Thunder, the Cincinnati Royals and Kansas City Kings are the Kings, the
// Buffalo Braves the Clippers, the Baltimore Bullets the Wizards, the 1988-2002 Hornets the
// Hornets, the 2002-13 New Orleans Hornets the Pelicans, the New Orleans Jazz the Jazz. ABA
// seasons count for the Nets, Pacers, Nuggets and Spurs. Ratings are peak ratings on the
// game's scale (99 = the very best), a judgement call from honours and peak seasons.

import type { Pos } from '../engine/types';

export interface LegendSpot {
  name: string;
  pos: Pos;
  ovr: number;
  peak: string; // his peak years with this team
  tag: 'shooter' | 'inside' | 'defense' | 'creator' | 'scorer';
  rookie?: boolean; // the player's own super-rookie (legends showdown)
}

const L = (name: string, pos: Pos, ovr: number, peak: string, tag: LegendSpot['tag']): LegendSpot => ({ name, pos, ovr, peak, tag });

export const FRANCHISE_FIVES: Record<string, LegendSpot[]> = {
  ATL: [L('Trae Young', 'PG', 89, '2021-24', 'creator'), L('Joe Johnson', 'SG', 86, '2006-11', 'scorer'), L('Dominique Wilkins', 'SF', 92, '1985-93', 'scorer'), L('Bob Pettit', 'PF', 94, '1956-64', 'inside'), L('Dikembe Mutombo', 'C', 89, '1996-2000', 'defense')],
  BOS: [L('Bob Cousy', 'PG', 91, '1953-60', 'creator'), L('John Havlicek', 'SG', 92, '1968-74', 'scorer'), L('Larry Bird', 'SF', 97, '1984-88', 'shooter'), L('Kevin McHale', 'PF', 91, '1986-88', 'inside'), L('Bill Russell', 'C', 96, '1960-66', 'defense')],
  BKN: [L('Jason Kidd', 'PG', 92, '2001-04', 'creator'), L('Drazen Petrovic', 'SG', 86, '1991-93', 'shooter'), L('Julius Erving', 'SF', 95, '1973-76', 'scorer'), L('Buck Williams', 'PF', 84, '1982-88', 'inside'), L('Brook Lopez', 'C', 83, '2010-17', 'inside')],
  NYK: [L('Jalen Brunson', 'PG', 90, '2023-25', 'scorer'), L('Walt Frazier', 'SG', 92, '1969-74', 'defense'), L('Bernard King', 'SF', 91, '1983-85', 'scorer'), L('Willis Reed', 'PF', 91, '1967-71', 'inside'), L('Patrick Ewing', 'C', 93, '1988-93', 'defense')],
  PHI: [L('Maurice Cheeks', 'PG', 85, '1981-88', 'defense'), L('Allen Iverson', 'SG', 93, '1999-2005', 'scorer'), L('Billy Cunningham', 'SF', 89, '1968-72', 'scorer'), L('Charles Barkley', 'PF', 93, '1986-92', 'inside'), L('Joel Embiid', 'C', 95, '2021-23', 'inside')],
  TOR: [L('Kyle Lowry', 'PG', 87, '2016-19', 'creator'), L('Vince Carter', 'SG', 90, '2000-02', 'scorer'), L('Kawhi Leonard', 'SF', 95, '2019', 'defense'), L('Pascal Siakam', 'PF', 86, '2019-22', 'inside'), L('Chris Bosh', 'C', 88, '2006-10', 'inside')],
  CHI: [L('Derrick Rose', 'PG', 91, '2010-12', 'scorer'), L('Michael Jordan', 'SG', 99, '1988-93', 'scorer'), L('Scottie Pippen', 'SF', 92, '1991-96', 'defense'), L('Horace Grant', 'PF', 84, '1990-94', 'defense'), L('Artis Gilmore', 'C', 87, '1977-82', 'inside')],
  CLE: [L('Kyrie Irving', 'PG', 90, '2014-17', 'scorer'), L('Donovan Mitchell', 'SG', 90, '2023-25', 'scorer'), L('LeBron James', 'SF', 99, '2008-10, 2015-18', 'creator'), L('Evan Mobley', 'PF', 86, '2024-25', 'defense'), L('Brad Daugherty', 'C', 86, '1988-93', 'inside')],
  DET: [L('Isiah Thomas', 'PG', 93, '1984-90', 'creator'), L('Joe Dumars', 'SG', 87, '1989-93', 'defense'), L('Grant Hill', 'SF', 91, '1996-2000', 'creator'), L('Dennis Rodman', 'PF', 88, '1989-92', 'defense'), L('Ben Wallace', 'C', 89, '2002-06', 'defense')],
  IND: [L('Tyrese Haliburton', 'PG', 88, '2023-25', 'creator'), L('Reggie Miller', 'SG', 90, '1990-2000', 'shooter'), L('Paul George', 'SF', 90, '2013-17', 'defense'), L("Jermaine O'Neal", 'PF', 87, '2002-05', 'inside'), L('Rik Smits', 'C', 82, '1995-98', 'inside')],
  MIL: [L('Sidney Moncrief', 'PG', 87, '1982-86', 'defense'), L('Ray Allen', 'SG', 89, '1998-2002', 'shooter'), L('Marques Johnson', 'SF', 87, '1978-84', 'scorer'), L('Giannis Antetokounmpo', 'PF', 97, '2019-25', 'inside'), L('Kareem Abdul-Jabbar', 'C', 99, '1970-74', 'inside')],
  CHA: [L('Kemba Walker', 'PG', 87, '2016-19', 'scorer'), L('LaMelo Ball', 'SG', 86, '2022-25', 'creator'), L('Glen Rice', 'SF', 87, '1995-98', 'shooter'), L('Larry Johnson', 'PF', 86, '1992-95', 'inside'), L('Al Jefferson', 'C', 83, '2014', 'inside')],
  MIA: [L('Tim Hardaway', 'PG', 87, '1996-99', 'creator'), L('Dwyane Wade', 'SG', 95, '2006-11', 'scorer'), L('Jimmy Butler', 'SF', 89, '2020-23', 'defense'), L('Bam Adebayo', 'PF', 87, '2020-25', 'defense'), L('Alonzo Mourning', 'C', 90, '1996-2000', 'defense')],
  ORL: [L('Penny Hardaway', 'PG', 90, '1994-97', 'creator'), L('Tracy McGrady', 'SG', 94, '2001-04', 'scorer'), L('Franz Wagner', 'SF', 84, '2023-25', 'scorer'), L('Paolo Banchero', 'PF', 86, '2023-25', 'scorer'), L('Dwight Howard', 'C', 93, '2008-12', 'defense')],
  WAS: [L('Gilbert Arenas', 'PG', 89, '2005-07', 'scorer'), L('Earl Monroe', 'SG', 88, '1968-71', 'scorer'), L('Bradley Beal', 'SF', 87, '2019-21', 'scorer'), L('Elvin Hayes', 'PF', 91, '1972-79', 'inside'), L('Wes Unseld', 'C', 89, '1968-75', 'defense')],
  DEN: [L('Jamal Murray', 'PG', 87, '2020-23', 'scorer'), L('David Thompson', 'SG', 88, '1976-79', 'scorer'), L('Alex English', 'SF', 89, '1982-87', 'scorer'), L('Carmelo Anthony', 'PF', 91, '2006-10', 'scorer'), L('Nikola Jokic', 'C', 98, '2021-25', 'creator')],
  MIN: [L('Sam Cassell', 'PG', 85, '2004', 'creator'), L('Anthony Edwards', 'SG', 92, '2023-25', 'scorer'), L('Kevin Garnett', 'SF', 95, '1999-2007', 'defense'), L('Kevin Love', 'PF', 89, '2011-14', 'inside'), L('Karl-Anthony Towns', 'C', 88, '2017-22', 'shooter')],
  OKC: [L('Russell Westbrook', 'PG', 93, '2015-17', 'creator'), L('Shai Gilgeous-Alexander', 'SG', 96, '2023-25', 'scorer'), L('Kevin Durant', 'SF', 96, '2010-14', 'scorer'), L('Shawn Kemp', 'PF', 88, '1993-97', 'inside'), L('Jack Sikma', 'C', 85, '1979-84', 'inside')],
  POR: [L('Damian Lillard', 'PG', 92, '2018-21', 'shooter'), L('Clyde Drexler', 'SG', 92, '1988-92', 'scorer'), L('Brandon Roy', 'SF', 87, '2008-09', 'scorer'), L('LaMarcus Aldridge', 'PF', 88, '2011-15', 'inside'), L('Bill Walton', 'C', 92, '1977-78', 'defense')],
  UTA: [L('John Stockton', 'PG', 92, '1988-97', 'creator'), L('Pete Maravich', 'SG', 90, '1976-77', 'scorer'), L('Adrian Dantley', 'SF', 89, '1980-86', 'scorer'), L('Karl Malone', 'PF', 95, '1990-99', 'inside'), L('Rudy Gobert', 'C', 88, '2017-22', 'defense')],
  GSW: [L('Stephen Curry', 'PG', 97, '2015-22', 'shooter'), L('Klay Thompson', 'SG', 88, '2015-19', 'shooter'), L('Rick Barry', 'SF', 93, '1966-67, 1974-76', 'scorer'), L('Draymond Green', 'PF', 85, '2015-17', 'defense'), L('Wilt Chamberlain', 'C', 98, '1960-64', 'inside')],
  LAC: [L('Randy Smith', 'PG', 81, '1976-78', 'creator'), L('World B. Free', 'SG', 85, '1979-80', 'scorer'), L('Danny Manning', 'SF', 84, '1991-93', 'inside'), L('Blake Griffin', 'PF', 89, '2011-15', 'inside'), L('Bob McAdoo', 'C', 91, '1974-76', 'scorer')],
  LAL: [L('Jerry West', 'PG', 95, '1965-70', 'scorer'), L('Kobe Bryant', 'SG', 96, '2006-10', 'scorer'), L('Magic Johnson', 'SF', 97, '1986-90', 'creator'), L('Elgin Baylor', 'PF', 94, '1960-63', 'scorer'), L("Shaquille O'Neal", 'C', 98, '1999-2002', 'inside')],
  PHX: [L('Steve Nash', 'PG', 93, '2005-07', 'creator'), L('Devin Booker', 'SG', 91, '2021-23', 'scorer'), L('Shawn Marion', 'SF', 87, '2002-07', 'defense'), L("Amar'e Stoudemire", 'PF', 89, '2005-10', 'inside'), L('Alvan Adams', 'C', 83, '1976-80', 'creator')],
  SAC: [L('Oscar Robertson', 'PG', 96, '1961-66', 'creator'), L('Tiny Archibald', 'SG', 90, '1972-73', 'scorer'), L('Peja Stojakovic', 'SF', 87, '2001-04', 'shooter'), L('Chris Webber', 'PF', 91, '1999-2003', 'creator'), L('Jerry Lucas', 'C', 89, '1964-68', 'inside')],
  DAL: [L('Luka Doncic', 'PG', 96, '2021-24', 'creator'), L('Rolando Blackman', 'SG', 85, '1984-90', 'scorer'), L('Mark Aguirre', 'SF', 87, '1983-88', 'scorer'), L('Dirk Nowitzki', 'PF', 95, '2005-11', 'shooter'), L('Tyson Chandler', 'C', 82, '2011', 'defense')],
  HOU: [L('James Harden', 'PG', 95, '2015-20', 'scorer'), L('Calvin Murphy', 'SG', 85, '1976-79', 'shooter'), L('Rudy Tomjanovich', 'SF', 84, '1973-77', 'scorer'), L('Moses Malone', 'PF', 94, '1979-82', 'inside'), L('Hakeem Olajuwon', 'C', 97, '1993-95', 'defense')],
  MEM: [L('Ja Morant', 'PG', 89, '2022-23', 'scorer'), L('Mike Conley', 'SG', 85, '2013-19', 'creator'), L('Shareef Abdur-Rahim', 'SF', 85, '1998-2001', 'scorer'), L('Jaren Jackson Jr.', 'PF', 86, '2023-25', 'defense'), L('Marc Gasol', 'C', 87, '2013-15', 'defense')],
  NOP: [L('Chris Paul', 'PG', 94, '2008-09', 'creator'), L('Jrue Holiday', 'SG', 86, '2018-20', 'defense'), L('Brandon Ingram', 'SF', 86, '2020-22', 'scorer'), L('Zion Williamson', 'PF', 88, '2021-23', 'inside'), L('Anthony Davis', 'C', 94, '2015-18', 'defense')],
  SAS: [L('Tony Parker', 'PG', 89, '2009-13', 'scorer'), L('George Gervin', 'SG', 92, '1977-82', 'scorer'), L('Manu Ginobili', 'SF', 88, '2005-08', 'creator'), L('Tim Duncan', 'PF', 97, '2001-05', 'defense'), L('David Robinson', 'C', 95, '1992-96', 'defense')],
};

/** Famous shooters for the three-point contest (round 10). Accuracy is a 0-100 skill. */
export const SHOOTERS: { name: string; skill: number; team: string }[] = [
  { name: 'Stephen Curry', skill: 99, team: 'GSW' },
  { name: 'Klay Thompson', skill: 93, team: 'GSW' },
  { name: 'Ray Allen', skill: 95, team: 'BOS' },
  { name: 'Reggie Miller', skill: 93, team: 'IND' },
  { name: 'Larry Bird', skill: 94, team: 'BOS' },
  { name: 'Craig Hodges', skill: 91, team: 'CHI' },
  { name: 'Dirk Nowitzki', skill: 89, team: 'DAL' },
  { name: 'Damian Lillard', skill: 92, team: 'POR' },
  { name: 'Kyle Korver', skill: 92, team: 'ATL' },
  { name: 'Steve Nash', skill: 90, team: 'PHX' },
  { name: 'Peja Stojakovic', skill: 91, team: 'SAC' },
  { name: 'Mark Price', skill: 90, team: 'CLE' },
  { name: 'Devin Booker', skill: 89, team: 'PHX' },
  { name: 'Jason Kapono', skill: 88, team: 'MIA' },
  { name: 'Dale Ellis', skill: 89, team: 'OKC' },
  { name: 'Tyrese Haliburton', skill: 88, team: 'IND' },
];
