// Round 35 (owner: achievements for "multiplayer, the unlocks and free throws", and more besides:
// "players earn them quickly, so every round adds a good batch"). Play with friends (a challenge
// set, answered and beaten; a draft class joined and topped), the road map's stops that open the
// other modes, the free-throw touch that came in this round, the jump shot that now ages like the
// rest of him, and a few more. Each career mark was measured over careers of the smart player
// before it was set (DECISIONS.md, round 35). Same rules as the rest of the book: cosmetic, pun
// names, conditions hidden.

import type { GameState, SeasonRecord } from './types';
import type { AchTier, CareerTotals } from './achievements';
import { count, hallOfFame } from './awards/legacy';

/** What a device has done with friends (ui/achievements.ts recordMp counts each). */
export type MpKind = 'made' | 'answered' | 'beat' | 'joined' | 'classTop' | 'friendDuo' | 'friendTrio' | 'chat';

/** What these checks read (the book's facts, in part). */
interface Facts35 {
  g: GameState;
  t: CareerTotals;
  nba: SeasonRecord[];
  retired: boolean;
  age: number;
}

interface Ach35 {
  id: string;
  name: string;
  tier: AchTier;
  how: string;
  test: (f: Facts35) => boolean;
}

/** Free-throw touch tops out here (player/touch.ts addTouch). */
const TOUCH_TOP = 99;

const A = (id: string, name: string, tier: AchTier, how: string, test: (f: Facts35) => boolean): Ach35 => ({ id, name, tier, how, test });
const pct = (a: number, b: number) => (b ? a / b : 0);
const per = (h: SeasonRecord, k: 'pts' | 'ast') => h.line[k] / Math.max(1, h.line.gp);
const ftp = (h: SeasonRecord) => pct(h.line.ftm, h.line.fta);
const nbaSum = (f: Facts35, k: 'ftm' | 'fta') => f.nba.reduce((a, h) => a + h.line[k], 0);
/** Retired with this NBA free-throw percentage over 1,000 tries or more. */
const careerFt = (f: Facts35, at: number) => f.retired && nbaSum(f, 'fta') >= 1000 && pct(nbaSum(f, 'ftm'), nbaSum(f, 'fta')) >= at;
const champ = (h: SeasonRecord) => /Champion/.test(h.result);
const playoffs = (h: SeasonRecord) => /^Lost in the|Champion/.test(h.result);
/** Each NBA year once (a trade splits a season in two records), oldest first, with whether any of its records passes. */
const byYear = (f: Facts35, test: (h: SeasonRecord) => boolean) => {
  const m = new Map<number, boolean>();
  for (const h of f.nba) m.set(h.year, (m.get(h.year) ?? false) || test(h));
  return m;
};
const mp = (f: Facts35, k: MpKind) => f.t.mp?.[k] ?? 0;
/** A mode the road map has opened by clearing its stop (ui/road.ts Unlock). */
const opened = (f: Facts35, u: 'reality' | 'stars' | 'minis') => !!f.t.unlocks?.includes(u);

export const ACHIEVEMENTS_35: Ach35[] = [
  // ---- play with friends (a challenge, a draft class), kept across careers ----
  A('mp-made1', 'Gauntlet Thrown', 'bench', 'Set a challenge for a friend from a finished career.', (f) => mp(f, 'made') >= 1),
  A('mp-made5', 'Open Invitation', 'rotation', 'Set five challenges for friends.', (f) => mp(f, 'made') >= 5),
  A('mp-ans1', 'Challenge Accepted', 'bench', 'Answer a friend’s challenge: play their prospect to the end.', (f) => mp(f, 'answered') >= 1),
  A('mp-join1', 'Class Picture', 'bench', 'Start or join a draft class.', (f) => mp(f, 'joined') >= 1),
  A('mp-beat1', 'Bragging Rights', 'rotation', 'Answer a challenge with a better career than the one that set it.', (f) => mp(f, 'beat') >= 1),
  A('mp-beat5', 'Undisputed', 'starter', 'Beat the careers that set five challenges.', (f) => mp(f, 'beat') >= 5),
  A('mp-top1', 'Valedictorian', 'starter', 'Finish first in a draft class of two players or more.', (f) => mp(f, 'classTop') >= 1),
  A('mp-top3', 'Summa Cum Laude', 'allstar', 'Finish first in three draft classes.', (f) => mp(f, 'classTop') >= 3),
  // ---- play with friends, in the career itself ----
  A('mp-class-as', 'Most Likely to Succeed', 'rotation', 'Make an All-Star team in a draft-class career.', (f) => !!f.g.mp?.klass && count(f.g, 'ALLSTAR') > 0),
  A('mp-ans-ring', 'Answer Key', 'starter', 'Win an NBA title in a career that answers a friend’s challenge.', (f) => !!f.g.mp?.challenge && f.nba.some(champ)),
  A('mp-made-hof', 'Follow That', 'allstar', 'Set a challenge from a Hall of Fame career.', (f) => f.retired && !!f.g.mp?.made && !!hallOfFame(f.g)),
  A('mp-made-low', 'Low Bar', 'bench', 'Set a challenge from a career that never played an NBA game.', (f) => f.retired && !!f.g.mp?.made && f.g.nbaGames === 0),
  // ---- the road map's stops that open the other modes, kept on this device ----
  A('un-real', 'Hard Knocks', 'rotation', 'Open Reality hits hard on the road map.', (f) => opened(f, 'reality')),
  A('un-stars', 'Moonshot', 'starter', 'Open Shoot for the stars on the road map.', (f) => opened(f, 'stars')),
  A('un-minis', 'Castaway', 'rotation', 'Open the mini-games on the road map.', (f) => opened(f, 'minis')),
  A('un-all', 'Skeleton Key', 'starter', 'Open every mode the road map keeps locked.', (f) => opened(f, 'reality') && opened(f, 'stars') && opened(f, 'minis')),
  // ---- free throws ----
  A('ft-c80', 'Free and Clear', 'rotation', 'Retire with an NBA free-throw percentage of 80% or better (1,000 tries or more).', (f) => careerFt(f, 0.8)),
  A('ft-c85', 'Automatic', 'allstar', 'Retire with an NBA free-throw percentage of 85% or better (1,000 tries or more).', (f) => careerFt(f, 0.85)),
  A('ft-s95', 'Ninety-Five Theses', 'hof', 'Make 95% of your free throws in an NBA season (150 tries or more).', (f) => f.nba.some((h) => h.line.fta >= 150 && ftp(h) >= 0.95)),
  A('ft-touch', 'Soft Touch', 'rotation', 'Build your touch at the line as far as it goes.', (f) => (f.g.player.touch ?? 0) >= TOUCH_TOP),
  A('ft-up', 'Practice Makes Perfect', 'starter', 'Raise your free-throw percentage 15 points from your first NBA season at the line (50 tries or more) to a later one (100 or more).', (f) => {
    const s = f.nba.filter((h) => h.line.fta >= 50);
    return s.length >= 2 && s.slice(1).some((h) => h.line.fta >= 100 && ftp(h) - ftp(s[0]) >= 0.15);
  }),
  A('ft-bad', 'Hack-a-Me', 'allstar', 'Shoot under 60% from the line in an NBA season (150 tries or more).', (f) => f.nba.some((h) => h.line.fta >= 150 && ftp(h) < 0.6)),
  A('ft-m3k', 'Line Item', 'starter', 'Make 3,000 NBA free throws.', (f) => nbaSum(f, 'ftm') >= 3000),
  A('ft-m6k', 'Charity Gala', 'allstar', 'Make 6,000 NBA free throws.', (f) => nbaSum(f, 'ftm') >= 6000),
  A('hs-ft90', 'Varsity Stripes', 'starter', 'Make 90% of your free throws in a high school season (60 tries or more).', (f) => f.g.history.some((h) => h.stage === 'HS' && h.line.fta >= 60 && ftp(h) >= 0.9)),
  // ---- the jump shot, late (round 35: shooting ages like the other ratings) ----
  A('sa-late3', 'Silver Splash', 'starter', 'Make 40% of your threes in an NBA season at 36 or older (three tries a game, 40 games).', (f) => f.nba.some((h) => h.age >= 36 && h.line.gp >= 40 && h.line.tpa >= 3 * h.line.gp && pct(h.line.tpm, h.line.tpa) >= 0.4)),
  A('sa-sht80', 'Muscle Memory', 'allstar', 'Keep a shooting rating of 80 or more at 38.', (f) => f.age >= 38 && f.g.player.attrs.SHT >= 80),
  // ---- more besides ----
  A('x-upside', 'Upside Down', 'allstar', 'Shoot a better percentage from three than from two in an NBA season (three tries a game, 40 games).', (f) =>
    f.nba.some((h) => h.line.gp >= 40 && h.line.tpa >= 3 * h.line.gp && pct(h.line.tpm, h.line.tpa) > pct(h.line.fgm - h.line.tpm, h.line.fga - h.line.tpa)),
  ),
  A('x-flash', 'Flash in the Pan', 'allstar', 'Make an All-Rookie team, then retire without ever making an All-Star team.', (f) => f.retired && count(f.g, 'ALLROOKIE') + count(f.g, 'ROY') > 0 && count(f.g, 'ALLSTAR') === 0),
  A('x-tallpg', 'Tall Order', 'allstar', 'Average six assists in an NBA season as a point guard of 6′7″ or taller (40 games).', (f) => f.g.player.pos === 'PG' && f.nba.some((h) => h.line.gp >= 40 && (h.height ?? f.g.player.height) >= 79 && per(h, 'ast') >= 6)),
  A('c-dfig', 'Mr. Reliable', 'rotation', 'Average double figures in every NBA season of 20 games or more, ten of them at least, and retire.', (f) => {
    const s = f.nba.filter((h) => h.line.gp >= 20);
    return f.retired && s.length >= 10 && s.every((h) => per(h, 'pts') >= 10);
  }),
  A('r-every', 'Perfect Attendance', 'allstar', 'Make the playoffs in every NBA season of a career of eight or more.', (f) => {
    const y = byYear(f, playoffs);
    return f.retired && y.size >= 8 && [...y.values()].every(Boolean);
  }),
  A('r-homegrown', 'Homegrown', 'starter', 'Win an NBA title with the team that drafted you.', (f) => !!f.g.draftedBy && f.nba.some((h) => champ(h) && h.teamId === f.g.draftedBy)),
  A('r-rookie-ring', 'Beginner’s Luck', 'allstar', 'Win the NBA title in your first NBA season.', (f) => !!f.nba.length && f.nba.some((h) => h.year === f.nba[0].year && champ(h))),
  A('r-redeem', 'Unfinished Business', 'starter', 'Lose in the NBA Finals, then win the title the next season.', (f) => f.nba.some((h) => /Lost in the NBA Finals/.test(h.result) && f.nba.some((x) => x.year === h.year + 1 && champ(x)))),
  // ---- friends in each other's careers (rival nights, duos of friends, the chat) ----
  // a playoff series against him (round 35, career/rivalSeries.ts) is no rival night
  A('mp-rn1', 'Grudge Match', 'starter', 'Win a rival night against your rival from the draft class.', (f) => !!f.g.mp?.meets?.some((m) => m.won && !m.series)),
  A('mp-rn5', 'Bad Blood', 'allstar', 'Win five rival nights in one career.', (f) => (f.g.mp?.meets?.filter((m) => m.won && !m.series).length ?? 0) >= 5),
  A('mp-fduo', 'Friends on the Floor', 'rotation', 'Play on the same NBA team as a friend from your draft class.', (f) => mp(f, 'friendDuo') >= 1),
  A('mp-ftrio', 'The Old Gang', 'allstar', 'Make a Big Three with two friends from your draft class.', (f) => mp(f, 'friendTrio') >= 1),
  A('mp-chat1', 'Chirp', 'bench', 'Say something in a challenge’s or a draft class’s chat.', (f) => mp(f, 'chat') >= 1),
  A('a-as-first3', 'Instant Classic', 'starter', 'Make the All-Star team in each of your first three NBA seasons.', (f) => {
    const first = [...byYear(f, () => true).keys()].slice(0, 3);
    return first.length === 3 && first.every((y) => f.g.awards.some((a) => a.key === 'ALLSTAR' && a.year === y));
  }),
];

/** The ones that only read the totals kept across careers (checked with no career open). */
export const R35_TOTALS_ONLY = ['mp-made1', 'mp-made5', 'mp-ans1', 'mp-join1', 'mp-beat1', 'mp-beat5', 'mp-top1', 'mp-top3', 'mp-fduo', 'mp-ftrio', 'mp-chat1', 'un-real', 'un-stars', 'un-minis', 'un-all'];
