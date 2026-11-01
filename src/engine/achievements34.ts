// Round 34 (owner, round 32: "we might run out of them quickly. add more"). The round's theme was
// simplification, so the batch keeps it simple too: plain numbers that line up (your age, your
// jersey, a round total, a season that mirrors another), the fundamentals done cleanly, and the
// round's new pages (cards that fold, the career log's Look back and Continue, the road map, the
// intro on every visit). Same rules as the rest of the book: cosmetic, pun names, conditions hidden.

import type { GameState, SeasonRecord } from './types';
import type { AchTier, CareerTotals } from './achievements';
import { nbaCareerPoints } from './awards/legacy';

/** What these checks read (the book's facts, in part). */
interface Facts34 {
  g: GameState;
  t: CareerTotals;
  nba: SeasonRecord[];
  retired: boolean;
}

interface Ach34 {
  id: string;
  name: string;
  tier: AchTier;
  how: string;
  test: (f: Facts34) => boolean;
}

/** The places on the road map (ui/screens/RoadMap.tsx: three levels, the closing tour, the island). */
const ROAD_PLACES = 5;

const A = (id: string, name: string, tier: AchTier, how: string, test: (f: Facts34) => boolean): Ach34 => ({ id, name, tier, how, test });
/** NBA seasons of 40 games or more, oldest first. */
const full = (f: Facts34) => f.nba.filter((h) => h.line.gp >= 40);
const per = (h: SeasonRecord, k: 'pts' | 'reb' | 'ast' | 'tov' | 'fta' | 'min') => h.line[k] / Math.max(1, h.line.gp);
/** Points a game as the box score prints it, to one decimal. */
const ppg = (h: SeasonRecord) => per(h, 'pts').toFixed(1);
const season = (f: Facts34, test: (h: SeasonRecord) => boolean) => full(f).some(test);
/** Three seasons in a row (by year) whose points a game keep going one way, a point a game each step. */
const run3 = (f: Facts34, up: boolean) => {
  const s = full(f);
  for (let i = 2; i < s.length; i++) {
    const [a, b, c] = [s[i - 2], s[i - 1], s[i]];
    if (c.year - a.year !== 2) continue;
    const [x, y, z] = [per(a, 'pts'), per(b, 'pts'), per(c, 'pts')];
    if (up ? x >= 10 && y >= x + 1 && z >= y + 1 : z >= 5 && y <= x - 1 && z <= y - 1) return true;
  }
  return false;
};
const palindrome = (n: number) => n >= 1000 && String(n) === String(n).split('').reverse().join('');

export const ACHIEVEMENTS_34: Ach34[] = [
  // ---- simple math ----
  A('n-jersey', 'Wearing It Well', 'rotation', 'Average your jersey number in points in an NBA season (number 5 or higher).', (f) => f.g.player.number >= 5 && season(f, (h) => Math.round(per(h, 'pts')) === f.g.player.number)),
  A('n-age', 'Act Your Age', 'rotation', 'Average your age in points in an NBA season.', (f) => season(f, (h) => Math.round(per(h, 'pts')) === h.age)),
  A('n-even20', 'Even Twenty', 'starter', 'Average exactly 20.0 points in an NBA season.', (f) => season(f, (h) => ppg(h) === '20.0')),
  A('n-even10', 'Perfect Ten', 'allstar', 'Average exactly 10.0 points in an NBA season.', (f) => season(f, (h) => ppg(h) === '10.0')),
  A('n-mirror', 'Mirror, Mirror', 'rotation', 'Average the same points a game, to the decimal, in two NBA seasons (15 or more).', (f) => {
    const seen = full(f).filter((h) => per(h, 'pts') >= 15).map(ppg);
    return new Set(seen).size < seen.length;
  }),
  A('n-bookends', 'Bookends', 'hof', 'Average the same points a game, to the decimal, in your first and last NBA seasons (two seasons at least).', (f) => {
    const s = full(f);
    return f.retired && s.length >= 2 && ppg(s[0]) === ppg(s[s.length - 1]);
  }),
  A('n-split', 'Even Split', 'starter', 'Average exactly as many rebounds as assists, to the decimal, in an NBA season (five of each at least).', (f) => season(f, (h) => per(h, 'reb') >= 5 && per(h, 'reb').toFixed(1) === per(h, 'ast').toFixed(1))),
  A('n-palin', 'Palindrome', 'hof', 'Retire with an NBA points total that reads the same both ways (1,000 or more).', (f) => f.retired && palindrome(nbaCareerPoints(f.g))),
  A('n-round', 'Round Number', 'allstar', 'Retire with an NBA points total that ends in 00 (1,000 or more).', (f) => {
    const n = nbaCareerPoints(f.g);
    return f.retired && n >= 1000 && n % 100 === 0;
  }),
  A('n-ovrnum', 'Number Matches', 'allstar', 'Finish an NBA season with an OVR equal to your jersey number.', (f) => f.nba.some((h) => Math.round(h.ovrEnd) === f.g.player.number)),
  A('n-500', 'Perfectly Balanced', 'rotation', 'Play an NBA season (40+ games) for a team that goes exactly 41–41.', (f) => season(f, (h) => h.w === 41 && h.l === 41)),
  A('n-up3', 'Counting Up', 'rotation', 'Score a point a game more in each of three NBA seasons in a row (10 or more to start).', (f) => run3(f, true)),
  A('n-down3', 'Countdown', 'bench', 'Score a point a game less in each of three NBA seasons in a row.', (f) => run3(f, false)),
  A('n-coffee', 'Cup of Coffee', 'rotation', 'Retire after exactly one NBA season.', (f) => f.retired && new Set(f.nba.map((h) => h.year)).size === 1),
  // ---- the fundamentals, kept simple ----
  A('k-pure', 'Pure Scorer', 'allstar', 'Average 25 points and under 4.5 assists in an NBA season.', (f) => season(f, (h) => per(h, 'pts') >= 25 && per(h, 'ast') < 4.5)),
  A('k-selfless', 'Selfless', 'starter', 'Average an assist for every two points in an NBA season (six assists at least).', (f) => season(f, (h) => per(h, 'ast') >= 6 && 2 * per(h, 'ast') >= per(h, 'pts'))),
  A('k-grip', 'Sure Grip', 'starter', 'Average under two turnovers in an NBA season while playing 34 minutes a game.', (f) => season(f, (h) => per(h, 'min') >= 34 && per(h, 'tov') < 2)),
  A('k-ft65', 'Line Dancer', 'allstar', 'Attempt 6.5 free throws a game in an NBA season.', (f) => season(f, (h) => per(h, 'fta') >= 6.5)),
  A('k-quiet', 'Quiet Ring', 'rotation', 'Win an NBA title in a season you averaged under 8 points.', (f) => season(f, (h) => /champion/i.test(h.result) && per(h, 'pts') < 8)),
  A('k-basics', 'Back to Basics', 'allstar', 'Average 15 points, 5 rebounds and 5 assists with under 2 turnovers in an NBA season.', (f) => season(f, (h) => per(h, 'pts') >= 15 && per(h, 'reb') >= 5 && per(h, 'ast') >= 5 && per(h, 'tov') < 2)),
  // ---- round 34's pages ----
  A('fold1', 'Origami', 'bench', 'Fold a card.', (f) => (f.t.folded ?? 0) >= 1),
  A('fold5', 'Neatly Pressed', 'rotation', 'Have five cards folded at once.', (f) => (f.t.folded ?? 0) >= 5),
  A('fold12', 'Less Is More', 'starter', 'Have twelve cards folded at once.', (f) => (f.t.folded ?? 0) >= 12),
  A('look1', 'Rewind', 'bench', 'Look back at a finished career from the career log.', (f) => (f.t.lookedBack ?? 0) >= 1),
  A('look10', 'Old Tapes', 'rotation', 'Look back at finished careers ten times.', (f) => (f.t.lookedBack ?? 0) >= 10),
  A('resume1', 'Where We Left Off', 'bench', 'Continue a career from the career log.', (f) => (f.t.resumed ?? 0) >= 1),
  A('road-all', 'Every Stop on the Line', 'rotation', 'Open the card of every place on the road map, after the tutorial.', (f) => (f.t.roadSeen?.length ?? 0) >= ROAD_PLACES),
  A('visit10', 'Season Ticket Holder', 'bench', 'Come back to the game for ten visits.', (f) => (f.t.visits ?? 0) >= 10),
  A('visit50', 'Courtside Regular', 'rotation', 'Come back to the game for fifty visits.', (f) => (f.t.visits ?? 0) >= 50),
  A('visit100', 'Part of the Furniture', 'starter', 'Come back to the game for a hundred visits.', (f) => (f.t.visits ?? 0) >= 100),
];

/** The ones that only read the totals kept across careers (checked with no career open). */
export const R34_TOTALS_ONLY = ['fold1', 'fold5', 'fold12', 'look1', 'look10', 'resume1', 'road-all', 'visit10', 'visit50', 'visit100'];
