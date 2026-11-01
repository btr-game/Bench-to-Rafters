// Round 33 (owner: "stuff based on efficiency ... like a 50-40-90 season, or a 100% fg game ... are
// there bad achievements too? like a 0% fg game ... so bad it's pretty hard to achieve"): the
// extremes of his NBA games, kept as he plays them, for the achievement book. A season keeps only
// its totals and its best game, so the perfect nights and the bricks are noted here, game by game,
// as the season ends. Cosmetic: nothing reads these but the book.

import type { GameLog, GameState, LevelKey } from '../types';

/** The marks one game can set: the most of something in a single NBA game. */
const MARKS: { flag: string; of: (l: NonNullable<GameLog['line']>) => number }[] = [
  // every shot from the field made: the attempts
  { flag: 'gPerfFg', of: (l) => (l.fga > 0 && l.fgm === l.fga ? l.fga : 0) },
  // every free throw made: the makes
  { flag: 'gPerfFt', of: (l) => (l.fta > 0 && l.ftm === l.fta ? l.ftm : 0) },
  // every three made: the makes
  { flag: 'gPerf3', of: (l) => (l.tpa > 0 && l.tpm === l.tpa ? l.tpm : 0) },
  // the most points on 20 shots or fewer
  { flag: 'gEff', of: (l) => (l.fga <= 20 ? l.pts : 0) },
  // a triple-double without a miss from the field or the line (five shots at least)
  { flag: 'gTdClean', of: (l) => ([l.pts, l.reb, l.ast, l.stl, l.blk].filter((v) => v >= 10).length >= 3 && l.fga >= 5 && l.fgm === l.fga && l.ftm === l.fta ? 1 : 0) },
  // the bricks: shots from the field, threes and free throws, none made
  { flag: 'gBrick', of: (l) => (l.fgm === 0 ? l.fga : 0) },
  { flag: 'gBrick3', of: (l) => (l.tpm === 0 ? l.tpa : 0) },
  { flag: 'gBrickFt', of: (l) => (l.ftm === 0 ? l.fta : 0) },
  { flag: 'gTov', of: (l) => l.tov },
  // the most minutes without a point
  { flag: 'gBlank', of: (l) => (l.pts === 0 ? Math.round(l.min) : 0) },
];

/** Notes the extremes of a season's NBA games (G League games on assignment do not count). */
export function markGames(s: GameState, games: GameLog[], level: LevelKey): void {
  if (level !== 'NBA') return;
  for (const g of games) {
    if (!g.line || g.post === 'G League') continue;
    for (const m of MARKS) {
      const v = m.of(g.line);
      if (v > (s.flags[m.flag] ?? 0)) s.flags[m.flag] = v;
    }
  }
}
