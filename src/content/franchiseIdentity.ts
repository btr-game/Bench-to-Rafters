// Each all-time five's identity (round 15: "add more character to each NBA team, so the user can
// consider the chemistry of the team"). `wants` are the roles that fit the identity: a player
// with one of them gets along with the team; the legends showdown turns that into chemistry.

import type { LegendSpot } from './franchiseFives';

type Tag = LegendSpot['tag'];

export const FRANCHISE_IDENTITY: Record<string, { name: string; text: string; wants: Tag[] }> = {
  ATL: { name: 'Highlight Hawks', text: 'Dominique’s dunks and Pettit’s power: an attacking, athletic team.', wants: ['scorer', 'inside'] },
  BOS: { name: 'Celtic pride', text: 'Passing, defense and Russell’s rings: team basketball first.', wants: ['creator', 'defense'] },
  BKN: { name: 'ABA flair', text: 'Dr. J and Kidd: run, fly, find the open man.', wants: ['creator', 'scorer'] },
  NYK: { name: 'Garden grit', text: 'Physical and defensive, Reed limping out of the tunnel.', wants: ['defense', 'inside'] },
  PHI: { name: 'The Answer and the Process', text: 'Big men and fearless scorers.', wants: ['scorer', 'inside'] },
  TOR: { name: 'We the North', text: 'Two-way wings and a cold-blooded closer.', wants: ['defense', 'scorer'] },
  CHI: { name: 'Triangle dynasty', text: 'Jordan scores, Pippen guards everyone, no weak links on defense.', wants: ['defense', 'shooter'] },
  CLE: { name: 'The King’s court', text: 'Everything runs through LeBron: shooters and finishers around him.', wants: ['shooter', 'inside'] },
  DET: { name: 'Bad Boys', text: 'Physical, nasty, defense first and always.', wants: ['defense'] },
  IND: { name: 'Hoosier shooting', text: 'Reggie off screens, ball movement and threes.', wants: ['shooter', 'creator'] },
  MIL: { name: 'Twin towers', text: 'Kareem’s sky hook and Giannis in transition: own the paint.', wants: ['shooter', 'defense'] },
  CHA: { name: 'Buzz city', text: 'Fast and fun, guards who push the pace.', wants: ['scorer', 'shooter'] },
  MIA: { name: 'Heat culture', text: 'The hardest-working team in the league: defense and toughness.', wants: ['defense'] },
  ORL: { name: 'Magic of the 90s', text: 'Penny, T-Mac and a dominant center: athletic, inside out.', wants: ['shooter', 'inside'] },
  WAS: { name: 'Bullets bruisers', text: 'Hayes and Unseld: rebounds, outlet passes, power.', wants: ['creator', 'inside'] },
  DEN: { name: 'Mile-high offense', text: 'Score in bunches while Jokic finds everyone.', wants: ['scorer', 'shooter'] },
  MIN: { name: 'Garnett’s intensity', text: 'Two-way bigs and a young star who wants it all.', wants: ['creator', 'defense'] },
  OKC: { name: 'Thunder athletes', text: 'Length and speed, three scorers on the floor at once.', wants: ['defense', 'shooter'] },
  POR: { name: 'Rip City', text: 'Drexler glides, Walton passes, Dame shoots from the logo.', wants: ['inside', 'creator'] },
  UTA: { name: 'Stockton to Malone', text: 'The pick and roll, run to perfection.', wants: ['shooter', 'inside'] },
  GSW: { name: 'Splash dynasty', text: 'Shooting, motion and Wilt in the middle.', wants: ['defense', 'creator'] },
  LAC: { name: 'Lob City', text: 'Above the rim, but thin on stars: they need help.', wants: ['creator', 'defense'] },
  LAL: { name: 'Showtime', text: 'Magic pushes, everyone runs, superstars everywhere.', wants: ['defense', 'shooter'] },
  PHX: { name: 'Seven seconds or less', text: 'Nash’s pace and space.', wants: ['shooter', 'inside'] },
  SAC: { name: 'The greatest show on court', text: 'Passing big men and a triple-double point guard.', wants: ['defense', 'shooter'] },
  DAL: { name: 'Skill and spacing', text: 'Luka and Dirk: shotmaking from everywhere.', wants: ['defense', 'inside'] },
  HOU: { name: 'Clutch City', text: 'The Dream’s footwork and Harden’s step-backs.', wants: ['shooter', 'creator'] },
  MEM: { name: 'Grit and grind', text: 'Defense, bigs and toughness.', wants: ['defense', 'inside'] },
  NOP: { name: 'Big Easy bigs', text: 'CP3’s control and AD’s two-way game.', wants: ['shooter', 'scorer'] },
  SAS: { name: 'The Spurs way', text: 'Fundamentals, unselfish, defense: the team over everything.', wants: ['creator', 'shooter'] },
};
