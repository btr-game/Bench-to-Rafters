// Round 22: fan cultures. Next to each NBA city's culture (career/cityCulture.ts), its fans have
// their own way with a player: how loud the building gets (a small edge for the team at home,
// and a bigger one in the playoffs for the crowds that rise to it), how they treat him when the
// team wins and when it loses, and how fast they make him famous. Philadelphia boos, Sacramento
// rings its cowbells win or lose, Miami arrives late, New York never lets anything go.

import { clamp } from '../rng';
import type { GameState } from '../types';
import { adjust, teamById } from './common';
import { NBA_TEAMS } from '../../content/teams';

interface FanCulture {
  name: string;
  text: string;
  crowd: number; // team strength in the regular season (home games are half of them)
  playoff: number; // extra team strength in the playoffs
  win: number; // morale a half when the team is winning
  lose: number; // morale a half when it is losing
  rep: number; // reputation a half
}

const F = (name: string, text: string, crowd: number, playoff: number, win: number, lose: number, rep = 0): FanCulture => ({ name, text, crowd, playoff, win, lose, rep });

export const FAN_CULTURES: Record<string, FanCulture> = {
  BOS: F('The Garden faithful', 'They know the history, they know the rotations, and they expect banners.', 0.15, 0.3, 1, -2, 0.3),
  BKN: F('New to the borough', 'A young fan base still finding its voice.', 0, 0, 1, 0, 0.1),
  NYK: F('Garden crazies', 'The loudest building in the world when the Knicks are good, and the angriest when they are not.', 0.2, 0.4, 3, -3, 0.6),
  PHI: F('The boo birds', 'Passionate, loyal and merciless. They boo their own when it goes wrong.', 0.1, 0.25, 1, -4, 0.2),
  TOR: F('Jurassic Park', 'Thousands in the square outside, a whole country watching.', 0.2, 0.4, 2, 0, 0.2),
  CHI: F('United Center loyal', 'Sell-outs in the good years and the bad ones.', 0.1, 0.15, 1, -1, 0.3),
  CLE: F('Believeland', 'A city that waited 52 years for a title and treasures every win.', 0.15, 0.25, 2, 0),
  DET: F('Blue-collar crowd', 'They cheer the charge you take as loud as the dunk.', 0.1, 0.15, 1, -1),
  IND: F('Hoosier hysteria', 'Basketball people who know a good back-door cut.', 0.15, 0.2, 2, 0),
  MIL: F('The Deer District', 'Tens of thousands outside the arena in the playoffs.', 0.1, 0.3, 2, 0),
  ATL: F('Fashionably late', 'Celebrities courtside, half-empty seats until the third quarter.', 0, 0.15, 1, 0, 0.3),
  CHA: F('The Hive', 'Patient and friendly; nobody boos in Charlotte.', 0.05, 0.05, 1, 0),
  MIA: F('White Hot', 'They leave early in November and fill every seat in a white-out in May.', 0, 0.35, 1, -1, 0.4),
  ORL: F('Quiet Orlando', 'Friendly crowds, tourists in the upper deck.', 0, 0.05, 1, 0),
  WAS: F('Patient capital', 'A crowd that has learned to expect little.', 0, 0.05, 1, -1),
  DEN: F('Mile High crowd', 'They know what the altitude does to visitors and love to watch it.', 0.1, 0.15, 1, 0),
  MIN: F('Wolves diehards', 'Long-suffering and all in when it finally turns.', 0.1, 0.2, 2, -1),
  OKC: F('Loud City', 'The loudest small-market crowd in the league, every night.', 0.25, 0.35, 2, 0),
  POR: F('Rip City roar', 'A sold-out, deafening building in a city that has only this team.', 0.2, 0.3, 2, 0),
  UTA: F('Salt Lake roar', 'Hostile for visitors, demanding of their own.', 0.25, 0.3, 1, -1),
  GSW: F('Dub Nation', 'Spoiled by a dynasty: they expect the parade.', 0.1, 0.25, 2, -2, 0.4),
  LAC: F('Clipper Nation', 'Small, loyal and tired of being the other team.', 0.05, 0.05, 1, 0),
  LAL: F('Celebrity row', 'The most famous fans in the world. Win and you are royalty; lose and you are on every show.', 0, 0.25, 2, -3, 0.9),
  PHX: F('Valley faithful', 'Orange shirts and a building that rocks in the playoffs.', 0.1, 0.25, 2, 0),
  SAC: F('Cowbell crowd', 'Cowbells and a purple light: they love this team, winning or not.', 0.25, 0.3, 2, 1),
  DAL: F('Mavs Nation', 'Big crowds, big expectations, big Texas hats.', 0.1, 0.2, 1, -1, 0.3),
  HOU: F('Clutch City', 'They believe in comebacks: the louder it gets, the closer it is.', 0.1, 0.25, 1, -1),
  MEM: F('The Grindhouse', 'Growl towels and a building that hates easy baskets.', 0.2, 0.3, 1, 0),
  NOP: F('Who Dat crowd', 'Brass bands in the concourse and a party in the stands.', 0.1, 0.15, 2, 0),
  SAS: F('Spurs Nation', 'Quietly the most knowledgeable crowd in Texas.', 0.15, 0.2, 1, 0),
};

/** The fans of an NBA team by its full name (for offers). */
export function fansByName(teamName: string): FanCulture | null {
  const t = NBA_TEAMS.find((x) => `${x.city} ${x.nick}` === teamName);
  return t ? (FAN_CULTURES[t.abbr] ?? null) : null;
}

/** The fans of the NBA team he plays for, if any. */
export function fanCultureOf(s: GameState): FanCulture | null {
  if (s.stage !== 'NBA') return null;
  const t = teamById(s.nba, s.teamId);
  return t ? (FAN_CULTURES[t.abbr] ?? null) : null;
}

/** How the fans treat him this half (season.ts calls it with the city culture). */
export function fanHalf(s: GameState): void {
  const f = fanCultureOf(s);
  const t = teamById(s.nba, s.teamId);
  if (!f || !t || s.mode === 'lab') return;
  s.player.morale = adjust(s.player.morale, t.w >= t.l ? f.win : f.lose);
  if (f.rep) s.player.rep = clamp(s.player.rep + f.rep, 0, 100);
}
