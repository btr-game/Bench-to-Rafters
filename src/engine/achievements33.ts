// Round 33 (owner: "stuff based on efficiency ... like a 50-40-90 season, or a 100% fg game ... are
// there bad achievements too? like a 0% fg game, or 10ovr. adding those kind of stuff would also be
// good. when i say bad, i mean so bad it's pretty hard to achieve"). Efficiency in a game and in a
// season, and the other end: bricks, turnovers, empty nights, the worst teams and the lowest
// ratings. Each mark was measured over 750 careers of the smart player before it was set, so the
// bad ones are as rare as the good ones (DECISIONS.md, round 33). Game marks come from
// career/marks.ts. Same rules as the rest of the book: cosmetic, pun names, conditions hidden.

import type { GameState, SeasonRecord } from './types';
import type { AchTier } from './achievements';
import { nbaCareerPoints } from './awards/legacy';

/** What these checks read (the book's facts, in part). */
interface Facts33 {
  g: GameState;
  nba: SeasonRecord[];
  peak: number;
  retired: boolean;
}

interface Ach33 {
  id: string;
  name: string;
  tier: AchTier;
  how: string;
  test: (f: Facts33) => boolean;
}

const A = (id: string, name: string, tier: AchTier, how: string, test: (f: Facts33) => boolean): Ach33 => ({ id, name, tier, how, test });
/** The most of something in one NBA game (career/marks.ts). */
const mark = (f: Facts33, k: string) => f.g.flags[k] ?? 0;
const pct = (a: number, b: number) => (b ? a / b : 0);
/** An NBA season of 40 games or more that passes `test`. */
const season = (f: Facts33, test: (h: SeasonRecord) => boolean) => f.nba.some((h) => h.line.gp >= 40 && test(h));
/** At least this many shots from the field a game. */
const shots = (h: SeasonRecord, n: number) => h.line.fga >= n * h.line.gp;
const ts = (h: SeasonRecord) => h.line.pts / Math.max(1, 2 * (h.line.fga + 0.44 * h.line.fta));
/** The lowest OVR he had at any point (the start or the end of a season). */
const lowest = (f: Facts33) => Math.min(...f.g.history.map((h) => Math.min(h.ovrStart, h.ovrEnd)));

export const ACHIEVEMENTS_33: Ach33[] = [
  // ---- efficiency: a game ----
  A('e-perf10', 'Flawless', 'starter', 'Take 10 shots or more in an NBA game and miss none.', (f) => mark(f, 'gPerfFg') >= 10),
  A('e-perf13', 'Perfect Pitch', 'allstar', 'Take 13 shots or more in an NBA game and miss none.', (f) => mark(f, 'gPerfFg') >= 13),
  A('e-perf15', 'Untouchable', 'hof', 'Take 15 shots or more in an NBA game and miss none.', (f) => mark(f, 'gPerfFg') >= 15),
  A('e-ft15', 'Charity Ball', 'allstar', 'Make 15 free throws or more in an NBA game without a miss.', (f) => mark(f, 'gPerfFt') >= 15),
  A('e-3p8', 'Swish Upon a Star', 'starter', 'Make 8 threes or more in an NBA game without missing one.', (f) => mark(f, 'gPerf3') >= 8),
  A('e-3p10', 'Nothing but Net', 'allstar', 'Make 10 threes or more in an NBA game without missing one.', (f) => mark(f, 'gPerf3') >= 10),
  A('e-eff50', 'Fifty on a Budget', 'allstar', 'Score 50 in an NBA game on 20 shots or fewer.', (f) => mark(f, 'gEff') >= 50),
  A('e-tdclean', 'Spotless Triple', 'allstar', 'Record a triple-double in an NBA game without missing a shot or a free throw (five shots at least).', (f) => mark(f, 'gTdClean') >= 1),
  // ---- efficiency: a season ----
  A('e-504090-25', 'Twenty-Five Karat', 'hof', 'Go 50-40-90 in an NBA season while scoring 25 a game (a three and a free throw a game at least).', (f) =>
    season(f, (h) => h.line.pts >= 25 * h.line.gp && h.line.tpa >= h.line.gp && h.line.fta >= h.line.gp && pct(h.line.fgm, h.line.fga) >= 0.5 && pct(h.line.tpm, h.line.tpa) >= 0.4 && pct(h.line.ftm, h.line.fta) >= 0.9),
  ),
  A('e-ts70', 'True Seventy', 'starter', 'Shoot 70% true shooting in an NBA season (10+ shots a game).', (f) => season(f, (h) => shots(h, 10) && ts(h) >= 0.7)),
  A('e-ts74', 'Truest Shooter', 'hof', 'Shoot 74% true shooting in an NBA season (10+ shots a game).', (f) => season(f, (h) => shots(h, 10) && ts(h) >= 0.74)),
  A('e-3p50', 'Half the Time', 'allstar', 'Make half your threes in an NBA season, on seven or more a game.', (f) => season(f, (h) => h.line.tpa >= 7 * h.line.gp && pct(h.line.tpm, h.line.tpa) >= 0.5)),
  A('e-fg65', 'Can’t Miss', 'hof', 'Shoot 65% from the field in an NBA season (10+ shots a game).', (f) => season(f, (h) => shots(h, 10) && pct(h.line.fgm, h.line.fga) >= 0.65)),
  // ---- so bad it's hard ----
  A('b-brick10', 'Brick by Brick', 'starter', 'Go 0 for 10 or worse from the field in an NBA game.', (f) => mark(f, 'gBrick') >= 10),
  A('b-brick12', 'Brick House', 'allstar', 'Go 0 for 12 or worse from the field in an NBA game.', (f) => mark(f, 'gBrick') >= 12),
  A('b-brick15', 'Masonry Masterclass', 'hof', 'Go 0 for 15 or worse from the field in an NBA game.', (f) => mark(f, 'gBrick') >= 15),
  A('b-3brick12', 'Off the Mark', 'allstar', 'Go 0 for 12 or worse from three in an NBA game.', (f) => mark(f, 'gBrick3') >= 12),
  A('b-ftbrick5', 'Free Throw Nightmare', 'allstar', 'Go 0 for 5 or worse at the line in an NBA game.', (f) => mark(f, 'gBrickFt') >= 5),
  A('b-tov12', 'Butterfingers', 'starter', 'Turn the ball over 12 times in an NBA game.', (f) => mark(f, 'gTov') >= 12),
  A('b-tov13', 'Hot Potato', 'allstar', 'Turn the ball over 13 times in an NBA game.', (f) => mark(f, 'gTov') >= 13),
  A('b-blank35', 'Ghosted', 'starter', 'Play 35 minutes or more in an NBA game without scoring a point.', (f) => mark(f, 'gBlank') >= 35),
  A('b-fg40', 'Volume Chucker', 'allstar', 'Shoot under 40% from the field in an NBA season on 10+ shots a game.', (f) => season(f, (h) => shots(h, 10) && pct(h.line.fgm, h.line.fga) < 0.4)),
  A('b-tank15', 'Tanks a Lot', 'allstar', 'Play an NBA season (40+ games) for a team that wins 15 games or fewer.', (f) => season(f, (h) => h.w <= 15)),
  A('b-tank10', 'Trust the Process', 'hof', 'Play an NBA season (40+ games) for a team that wins 10 games or fewer.', (f) => season(f, (h) => h.w <= 10)),
  A('b-ovr25', 'Basement', 'starter', 'Fall to an OVR of 25 or lower at any point in a career.', (f) => lowest(f) <= 25),
  A('b-ovr18', 'Below Sea Level', 'hof', 'Fall to an OVR of 18 or lower at any point in a career.', (f) => lowest(f) <= 18),
  A('b-peak40', 'Cut Short', 'allstar', 'Retire with a peak OVR of 40 or lower.', (f) => f.retired && f.peak <= 40),
  A('b-draft0', 'Draft and Gone', 'starter', 'Get drafted into the NBA, then retire without scoring an NBA point.', (f) => f.retired && f.g.draftedBy !== null && nbaCareerPoints(f.g) === 0),
];
