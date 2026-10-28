// The comparison set for the career analysis: 100 of the greatest NBA players, in a
// consensus all-time order (the top follows Bleacher Report's July 2025 list: Jordan,
// LeBron, Kareem, Magic, Russell, Shaq... with Curry 10th and Kobe 11th).
//
// Numbers are career regular-season averages and honours through the 2024-25 season,
// written from public records (Basketball-Reference); treat them as approximate. ABA
// seasons are included for players who played there. Height in inches.
//
// Columns: name, pos, height, seasons, PPG, RPG, APG, MVP, Finals MVP, titles, All-Star,
// All-NBA, All-NBA 1st, DPOY, best season PPG.

import type { Pos } from '../engine/types';

export interface Legend {
  rank: number;
  name: string;
  pos: Pos;
  height: number;
  seasons: number;
  ppg: number;
  rpg: number;
  apg: number;
  mvp: number;
  fmvp: number;
  titles: number;
  allStar: number;
  allNba: number;
  allNba1: number;
  dpoy: number;
  peakPpg: number;
}

type Row = [string, Pos, number, number, number, number, number, number, number, number, number, number, number, number, number];

const ROWS: Row[] = [
  ['Michael Jordan', 'SG', 78, 15, 30.1, 6.2, 5.3, 5, 6, 6, 14, 11, 10, 1, 37.1],
  ['LeBron James', 'SF', 81, 22, 27.0, 7.5, 7.4, 4, 4, 4, 21, 21, 13, 0, 31.4],
  ['Kareem Abdul-Jabbar', 'C', 86, 20, 24.6, 11.2, 3.6, 6, 2, 6, 19, 15, 10, 0, 34.8],
  ['Magic Johnson', 'PG', 81, 13, 19.5, 7.2, 11.2, 3, 3, 5, 12, 10, 9, 0, 23.9],
  ['Bill Russell', 'C', 82, 13, 15.1, 22.5, 4.3, 5, 0, 11, 12, 11, 3, 0, 18.9],
  ["Shaquille O'Neal", 'C', 85, 19, 23.7, 10.9, 2.5, 1, 3, 4, 15, 14, 8, 0, 29.7],
  ['Wilt Chamberlain', 'C', 85, 14, 30.1, 22.9, 4.4, 4, 1, 2, 13, 10, 7, 0, 50.4],
  ['Larry Bird', 'SF', 81, 13, 24.3, 10.0, 6.3, 3, 2, 3, 12, 10, 9, 0, 29.9],
  ['Tim Duncan', 'PF', 83, 19, 19.0, 10.8, 3.0, 2, 3, 5, 15, 15, 10, 0, 25.5],
  ['Stephen Curry', 'PG', 74, 16, 24.8, 4.7, 6.4, 2, 1, 4, 11, 11, 4, 0, 32.0],
  ['Kobe Bryant', 'SG', 78, 20, 25.0, 5.2, 4.7, 1, 2, 5, 18, 15, 11, 0, 35.4],
  ['Kevin Durant', 'SF', 82, 17, 27.2, 7.0, 4.4, 1, 2, 2, 15, 11, 6, 0, 32.0],
  ['Hakeem Olajuwon', 'C', 84, 18, 21.8, 11.1, 2.5, 1, 2, 2, 12, 12, 6, 2, 27.8],
  ['Nikola Jokić', 'C', 83, 10, 21.6, 11.1, 7.1, 3, 1, 1, 7, 7, 4, 0, 29.6],
  ['Giannis Antetokounmpo', 'PF', 83, 12, 23.6, 9.8, 4.9, 2, 1, 1, 9, 9, 7, 1, 31.1],
  ['Oscar Robertson', 'PG', 77, 14, 25.7, 7.5, 9.5, 1, 0, 1, 12, 11, 9, 0, 31.4],
  ['Jerry West', 'PG', 75, 14, 27.0, 5.8, 6.7, 0, 1, 1, 14, 12, 10, 0, 31.3],
  ['Moses Malone', 'C', 82, 21, 20.6, 12.2, 1.3, 3, 1, 1, 12, 8, 4, 0, 31.1],
  ['Karl Malone', 'PF', 81, 19, 25.0, 10.1, 3.6, 2, 0, 0, 14, 14, 11, 0, 31.0],
  ['Dirk Nowitzki', 'PF', 84, 21, 20.7, 7.5, 2.4, 1, 1, 1, 14, 12, 4, 0, 26.6],
  ['Kevin Garnett', 'PF', 83, 21, 17.8, 10.0, 3.7, 1, 0, 1, 15, 9, 4, 1, 24.2],
  ['Julius Erving', 'SF', 79, 16, 24.2, 8.5, 4.2, 4, 0, 3, 16, 12, 9, 0, 31.9],
  ['David Robinson', 'C', 85, 14, 21.1, 10.6, 2.5, 1, 0, 2, 10, 10, 4, 1, 29.8],
  ['Kawhi Leonard', 'SF', 79, 13, 19.9, 6.4, 3.0, 0, 2, 2, 6, 6, 3, 2, 27.1],
  ['Elgin Baylor', 'SF', 77, 14, 27.4, 13.5, 4.3, 0, 0, 0, 11, 10, 10, 0, 38.3],
  ['Charles Barkley', 'PF', 78, 16, 22.1, 11.7, 3.9, 1, 0, 0, 11, 11, 5, 0, 28.3],
  ['Shai Gilgeous-Alexander', 'PG', 78, 7, 24.9, 4.8, 5.3, 1, 1, 1, 3, 3, 3, 0, 32.7],
  ['John Havlicek', 'SF', 77, 16, 20.8, 6.3, 4.8, 0, 1, 8, 13, 11, 4, 0, 28.9],
  ['Bob Pettit', 'PF', 81, 11, 26.4, 16.2, 3.0, 2, 0, 1, 11, 11, 10, 0, 31.1],
  ['Chris Paul', 'PG', 72, 20, 17.5, 4.5, 9.3, 0, 0, 0, 12, 11, 4, 0, 25.0],
  ['Isiah Thomas', 'PG', 73, 13, 19.2, 3.6, 9.3, 0, 1, 2, 12, 5, 3, 0, 22.9],
  ['Scottie Pippen', 'SF', 80, 17, 16.1, 6.4, 5.2, 0, 0, 6, 7, 7, 3, 0, 22.0],
  ['Dwyane Wade', 'SG', 76, 16, 22.0, 4.7, 5.4, 0, 1, 3, 13, 8, 2, 0, 30.2],
  ['James Harden', 'SG', 77, 16, 24.1, 5.6, 7.0, 1, 0, 0, 11, 7, 6, 0, 36.1],
  ['John Stockton', 'PG', 73, 19, 13.1, 2.7, 10.5, 0, 0, 0, 10, 11, 2, 0, 17.2],
  ['Steve Nash', 'PG', 75, 18, 14.3, 3.0, 8.5, 2, 0, 0, 8, 7, 3, 0, 18.8],
  ['Jason Kidd', 'PG', 76, 19, 12.6, 6.3, 8.7, 0, 0, 1, 10, 6, 5, 0, 18.7],
  ['Allen Iverson', 'SG', 72, 14, 26.7, 3.7, 6.2, 1, 0, 0, 11, 7, 3, 0, 33.0],
  ['Patrick Ewing', 'C', 84, 17, 21.0, 9.8, 1.9, 0, 0, 0, 11, 7, 1, 0, 28.6],
  ['George Mikan', 'C', 82, 7, 23.1, 13.4, 2.8, 0, 0, 5, 4, 6, 6, 0, 28.4],
  ['Russell Westbrook', 'PG', 75, 17, 21.4, 7.0, 8.1, 1, 0, 0, 9, 9, 2, 0, 31.6],
  ['Anthony Davis', 'PF', 82, 13, 24.1, 10.6, 2.4, 0, 0, 1, 10, 5, 4, 0, 28.1],
  ['Joel Embiid', 'C', 84, 9, 27.9, 11.0, 3.6, 1, 0, 0, 7, 5, 1, 0, 34.7],
  ['Luka Dončić', 'PG', 79, 7, 28.6, 8.7, 8.3, 0, 0, 0, 5, 5, 5, 0, 33.9],
  ['Walt Frazier', 'PG', 76, 13, 18.9, 5.9, 6.1, 0, 0, 2, 7, 6, 4, 0, 23.2],
  ['Rick Barry', 'SF', 79, 14, 24.8, 6.7, 4.9, 0, 1, 1, 12, 6, 5, 0, 35.6],
  ['Clyde Drexler', 'SG', 79, 15, 20.4, 6.1, 5.6, 0, 0, 1, 10, 5, 1, 0, 27.2],
  ['Dominique Wilkins', 'SF', 80, 15, 24.8, 6.7, 2.5, 0, 0, 0, 9, 7, 1, 0, 30.7],
  ['Paul Pierce', 'SF', 79, 19, 19.7, 5.6, 3.5, 0, 1, 1, 10, 4, 0, 0, 26.8],
  ['Ray Allen', 'SG', 77, 18, 18.9, 4.1, 3.4, 0, 0, 2, 10, 2, 0, 0, 26.4],
  ['Dwight Howard', 'C', 82, 18, 15.7, 11.8, 1.3, 0, 0, 1, 8, 8, 5, 3, 22.9],
  ['Damian Lillard', 'PG', 74, 13, 25.1, 4.2, 6.7, 0, 0, 0, 9, 7, 1, 0, 32.2],
  ['Jayson Tatum', 'SF', 80, 8, 23.1, 7.2, 3.9, 0, 0, 1, 6, 4, 4, 0, 30.1],
  ['Bob Cousy', 'PG', 73, 14, 18.4, 5.2, 7.5, 1, 0, 6, 13, 12, 10, 0, 21.7],
  ['Elvin Hayes', 'PF', 81, 16, 21.0, 12.5, 1.8, 0, 0, 1, 12, 6, 3, 0, 28.4],
  ['Kevin McHale', 'PF', 82, 13, 17.9, 7.3, 1.7, 0, 0, 3, 7, 1, 1, 0, 26.1],
  ['Dolph Schayes', 'PF', 80, 16, 18.5, 12.1, 3.1, 0, 0, 1, 12, 12, 6, 0, 24.9],
  ['Willis Reed', 'C', 81, 10, 18.7, 12.9, 1.8, 1, 2, 2, 7, 5, 1, 0, 21.7],
  ['Gary Payton', 'PG', 76, 17, 16.3, 3.9, 6.7, 0, 0, 1, 9, 9, 2, 1, 24.2],
  ['Tracy McGrady', 'SG', 80, 16, 19.6, 5.6, 4.4, 0, 0, 0, 7, 7, 2, 0, 32.1],
  ['George Gervin', 'SG', 79, 14, 25.1, 5.3, 2.6, 0, 0, 0, 12, 7, 5, 0, 33.1],
  ['Carmelo Anthony', 'SF', 79, 19, 22.5, 6.2, 2.7, 0, 0, 0, 10, 6, 1, 0, 28.9],
  ['Nate Thurmond', 'C', 83, 14, 15.0, 15.0, 2.7, 0, 0, 0, 7, 0, 0, 0, 21.5],
  ['Wes Unseld', 'C', 79, 13, 10.8, 14.0, 3.9, 1, 1, 1, 5, 1, 1, 0, 16.2],
  ['Sam Jones', 'SG', 76, 12, 17.7, 4.9, 2.5, 0, 0, 10, 5, 3, 0, 0, 25.9],
  ['Pete Maravich', 'SG', 77, 10, 24.2, 4.2, 5.4, 0, 0, 0, 5, 4, 2, 0, 31.1],
  ['Vince Carter', 'SG', 78, 22, 16.7, 4.3, 3.1, 0, 0, 0, 8, 2, 0, 0, 27.6],
  ['Reggie Miller', 'SG', 79, 18, 18.2, 3.0, 3.0, 0, 0, 0, 5, 3, 0, 0, 24.6],
  ['Alonzo Mourning', 'C', 82, 15, 17.1, 8.5, 1.1, 0, 0, 1, 7, 2, 1, 2, 23.2],
  ['Dikembe Mutombo', 'C', 86, 18, 9.8, 10.3, 1.0, 0, 0, 0, 8, 3, 0, 4, 16.6],
  ['Pau Gasol', 'PF', 84, 18, 17.0, 9.2, 3.2, 0, 0, 2, 6, 4, 0, 0, 20.8],
  ['Tony Parker', 'PG', 74, 18, 15.5, 2.7, 5.6, 0, 1, 4, 6, 4, 0, 0, 22.0],
  ['Manu Ginóbili', 'SG', 78, 16, 13.3, 3.5, 3.8, 0, 0, 4, 2, 2, 0, 0, 19.5],
  ['Grant Hill', 'SF', 80, 18, 16.7, 6.0, 4.1, 0, 0, 0, 7, 5, 1, 0, 25.8],
  ['Adrian Dantley', 'SF', 77, 15, 24.3, 5.7, 3.0, 0, 0, 0, 6, 2, 0, 0, 30.7],
  ['Bill Walton', 'C', 83, 10, 13.3, 10.5, 3.4, 1, 1, 2, 2, 2, 1, 0, 18.9],
  ['Dave Cowens', 'C', 81, 11, 17.6, 13.6, 3.8, 1, 0, 2, 8, 3, 0, 0, 20.5],
  ['Kyrie Irving', 'PG', 74, 14, 23.6, 3.9, 5.7, 0, 0, 1, 9, 3, 1, 0, 28.7],
  ['Jimmy Butler', 'SF', 79, 14, 18.3, 5.3, 4.3, 0, 0, 0, 6, 5, 0, 0, 23.9],
  ['Paul George', 'SF', 80, 15, 20.8, 6.3, 3.7, 0, 0, 0, 9, 6, 1, 0, 28.0],
  ['Draymond Green', 'PF', 78, 13, 8.6, 6.9, 5.6, 0, 0, 4, 4, 2, 0, 1, 14.0],
  ['Devin Booker', 'SG', 77, 10, 24.3, 4.3, 5.0, 0, 0, 0, 4, 2, 1, 0, 27.8],
  ['Anthony Edwards', 'SG', 76, 5, 24.6, 5.4, 4.6, 0, 0, 0, 3, 2, 0, 0, 27.6],
  ['Jerry Lucas', 'PF', 80, 11, 17.0, 15.6, 3.3, 0, 0, 1, 7, 5, 3, 0, 21.8],
  ['Hal Greer', 'SG', 74, 15, 19.2, 5.0, 4.0, 0, 0, 1, 10, 7, 0, 0, 24.1],
  ['Billy Cunningham', 'SF', 79, 11, 21.2, 10.4, 4.3, 1, 0, 1, 5, 3, 3, 0, 26.1],
  ['Bob McAdoo', 'C', 81, 14, 22.1, 9.4, 2.3, 1, 0, 2, 5, 2, 1, 0, 34.5],
  ['Earl Monroe', 'SG', 75, 13, 18.8, 3.0, 3.9, 0, 0, 1, 4, 1, 1, 0, 25.8],
  ["Amar'e Stoudemire", 'PF', 82, 14, 18.9, 7.8, 1.2, 0, 0, 0, 6, 5, 1, 0, 26.0],
  ['Yao Ming', 'C', 90, 8, 19.0, 9.2, 1.6, 0, 0, 0, 8, 5, 0, 0, 25.0],
  ['Dennis Rodman', 'PF', 79, 14, 7.3, 13.1, 1.8, 0, 0, 5, 2, 2, 0, 2, 11.6],
  ['Ben Wallace', 'C', 81, 16, 5.7, 9.6, 1.3, 0, 0, 1, 4, 5, 0, 4, 9.7],
  ['Chris Webber', 'PF', 82, 15, 20.7, 9.8, 4.2, 0, 0, 0, 5, 5, 1, 0, 27.1],
  ['Chauncey Billups', 'PG', 75, 17, 15.2, 2.9, 5.4, 0, 1, 1, 5, 3, 0, 0, 18.5],
  ['Lenny Wilkens', 'PG', 73, 15, 16.5, 4.7, 6.7, 0, 0, 0, 9, 0, 0, 0, 22.4],
  ['Victor Wembanyama', 'C', 88, 2, 22.4, 10.8, 3.8, 0, 0, 0, 1, 0, 0, 0, 24.3],
  ['Bernard King', 'SF', 79, 14, 22.5, 5.8, 3.3, 0, 0, 0, 4, 4, 2, 0, 32.9],
  ['Klay Thompson', 'SG', 78, 13, 19.5, 3.5, 2.3, 0, 0, 4, 5, 2, 0, 0, 22.3],
  ['Dave Bing', 'SG', 75, 12, 20.3, 3.8, 6.0, 0, 0, 0, 7, 3, 2, 0, 27.1],
  ['Artis Gilmore', 'C', 86, 17, 18.8, 12.3, 2.3, 1, 0, 1, 11, 5, 5, 0, 24.6],
];

export const LEGENDS: Legend[] = ROWS.map((r, i) => ({
  rank: i + 1,
  name: r[0],
  pos: r[1],
  height: r[2],
  seasons: r[3],
  ppg: r[4],
  rpg: r[5],
  apg: r[6],
  mvp: r[7],
  fmvp: r[8],
  titles: r[9],
  allStar: r[10],
  allNba: r[11],
  allNba1: r[12],
  dpoy: r[13],
  peakPpg: r[14],
}));
