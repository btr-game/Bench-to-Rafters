// Round 35 (owner: achievements for "multiplayer, the unlocks and free throws", and more besides:
// "players earn them quickly, so every round adds a good batch"). Play with friends (a challenge
// set, answered and beaten; a draft class joined and topped), the road map's stops that open the
// other modes, the free-throw touch that came in this round, the jump shot that now ages like the
// rest of him, and a few more. Each career mark was measured over careers of the smart player
// before it was set (DECISIONS.md, round 35). Same rules as the rest of the book: cosmetic, pun
// names, conditions hidden. A later batch is for the draft class's own careers: draft night,
// classmates in his league's races and on his team, the playoff series against his rival
// classmate, and the class's pages (reunion night, reactions, the friends' daily board).

import type { GameState, SeasonRecord } from './types';
import type { AchTier, CareerTotals } from './achievements';
import { count, hallOfFame } from './awards/legacy';
import { friendName, friendNow } from './career/friends';
import { TRADE_AIM } from './career/team';

/** What a device has done with friends (ui/achievements.ts recordMp counts each). The later ones
 * come from the draft class's pages (ui/screens/ClassNight.tsx): reunion night's Class MVP, three
 * of its awards and all of them, a reaction given, a crown received, first on the friends' daily
 * board, a classmate's career watched. */
export type MpKind = 'made' | 'answered' | 'beat' | 'joined' | 'classTop' | 'friendDuo' | 'friendTrio' | 'chat' | 'reunionMvp' | 'reunion3' | 'reunionSweep' | 'react' | 'crowned' | 'dailyTop' | 'watched';

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

// ---- the draft class's careers (career/draftNight.ts, friendLeague.ts, rivalSeries.ts) ----
const inClass = (f: Facts35) => !!f.g.mp?.klass;
/** A career that opened on draft night: a draft class's, or a challenge set from one. */
const draftNight = (f: Facts35) => f.g.start?.input.start === 'draft' && f.g.mode === 'standard' && !!f.g.draft?.userPick;
const pickNo = (f: Facts35) => f.g.draft?.userPick ?? 0;
const mockOf = (f: Facts35): [number, number] => f.g.draft?.mockRange ?? [0, 99];
/** His classmates as the league names them (career/friends.ts friendName). */
const pals = (f: Facts35) => new Set((f.g.mp?.friends ?? []).map(friendName));
/** Playoff series against his rival classmate (a rival night has no round), oldest first. */
const series = (f: Facts35) => (f.g.mp?.meets ?? []).filter((m) => !!m.series);
const nights = (f: Facts35) => (f.g.mp?.meets ?? []).filter((m) => !m.series);
/** An MVP he won in a season a classmate finished in the top five of the voting. */
const mvpOverPal = (f: Facts35) => {
  const ps = pals(f);
  return f.g.awards.some((a) => a.key === 'MVP' && a.level === 'NBA' && f.nba.some((h) => h.year === a.year && h.races.some((r) => r.award === 'MVP' && r.top.some((x) => ps.has(x.name)))));
};
/** A title with a classmate on his team that season, where the class has him (or a season behind). */
const ringWithPal = (f: Facts35) =>
  f.nba.some((h) => champ(h) && (f.g.mp?.friends ?? []).some((x) => {
    const line = friendNow(x, h.year);
    return !!line && line.lv === 'NBA' && line.team === h.teamName;
  }));
/** A trade he asked for to a classmate's team, and got (career/team.ts requestTrade logs it). */
const joinedPal = (f: Facts35) => f.g.log.some((e) => e.kind === 'trade' && e.text.includes(`at his request (${TRADE_AIM.friend.label.toLowerCase()})`));

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
  // ---- draft night (a draft class's start). Of 300 draft nights 1.333333% went first and
  // 16.66667% in the top five; of 300 smart careers from draft night (no classmates in the league;
  // 66.33333% made an All-Star team), 4.666667% slid past the mocks and made one, 1.000000% beat
  // the mocks and made All-Rookie, 2.666667% went 30th and made an All-Star team, 0.3333333% were
  // Rookie of the Year. The plain draft ones (pick1, d-slide...) count on draft night too ----
  A('dn-pick1', 'First Chair', 'allstar', 'Go first overall on draft night, ahead of your whole draft class.', (f) => inClass(f) && draftNight(f) && pickNo(f) === 1),
  A('dn-top5', 'Honor Roll', 'starter', 'Go in the top five on draft night with your draft class.', (f) => inClass(f) && draftNight(f) && pickNo(f) <= 5),
  A('dn-slide', 'Chip on the Shoulder', 'starter', 'Fall past every mock draft on draft night, then make an All-Star team.', (f) => draftNight(f) && pickNo(f) > mockOf(f)[1] && count(f.g, 'ALLSTAR') > 0),
  A('dn-rise', 'Believe the Hype', 'allstar', 'Go higher than any mock draft had you on draft night, then make an All-Rookie team.', (f) => draftNight(f) && pickNo(f) < mockOf(f)[0] && count(f.g, 'ALLROOKIE') + count(f.g, 'ROY') > 0),
  A('dn-30', 'Thirty for Thirty', 'allstar', 'Go 30th on draft night, the last pick of the first round, and make an All-Star team.', (f) => draftNight(f) && pickNo(f) === 30 && count(f.g, 'ALLSTAR') > 0),
  A('dn-roy', 'Pick of the Litter', 'hof', 'Win Rookie of the Year in a draft class, against classmates who are rookies too.', (f) => inClass(f) && draftNight(f) && count(f.g, 'ROY') > 0),
  // ---- the playoff series against his rival classmate (career/rivalSeries.ts) ----
  A('rs-win1', 'Best of Enemies', 'starter', 'Beat your rival classmate in a playoff series.', (f) => series(f).some((m) => m.won)),
  A('rs-win3', 'Rent Free', 'allstar', 'Beat your rival classmate in three playoff series.', (f) => series(f).filter((m) => m.won).length >= 3),
  A('rs-back', 'Revenge Tour', 'starter', 'Lose your first rival night, then beat him in a playoff series.', (f) => {
    const first = nights(f)[0];
    return !!first && !first.won && series(f).some((m) => m.won && m.year >= first.year);
  }),
  A('rs-final', 'Final Word', 'allstar', 'Beat your rival classmate in the NBA Finals.', (f) => series(f).some((m) => m.won && m.series === 'NBA Finals')),
  A('rs-sweep', 'Brooms Out', 'allstar', 'Sweep your rival classmate in a playoff series.', (f) => series(f).some((m) => m.won && /^4–0$/.test(m.score))),
  A('rs-double', 'Home and Away', 'starter', 'Beat your rival classmate on rival night and in a playoff series in the same season.', (f) => series(f).some((m) => m.won && nights(f).some((x) => x.won && x.year === m.year))),
  A('rs-lost3', 'Same Time Next Year', 'allstar', 'Lose three playoff series to your rival classmate.', (f) => series(f).filter((m) => !m.won).length >= 3),
  // ---- classmates in his league (career/friendLeague.ts) and on his team ----
  A('fl-mvp-beat', 'Head of the Class', 'allstar', 'Win MVP in a season a classmate finished in the top five of the voting.', mvpOverPal),
  A('fl-mvp-friend', 'Green with Envy', 'starter', 'Watch a classmate win MVP in your league.', (f) => {
    const ps = pals(f);
    return f.g.nbaHistory.some((y) => y.awards.some((a) => a.award === 'MVP' && ps.has(a.name)));
  }),
  A('fl-as-pal', 'All-Star Alumni', 'rotation', 'Make an All-Star team the same season as a classmate.', (f) => (f.g.flags.asPal ?? 0) > 0),
  A('fl-join', 'Phone a Friend', 'rotation', 'Ask to join a classmate’s team, and get the trade.', joinedPal),
  A('fl-ring-pal', 'Friendship Ring', 'allstar', 'Win an NBA title with a classmate on your team.', ringWithPal),
  // ---- the class's pages (ui/screens/ClassNight.tsx), kept across careers ----
  A('mp-rmvp', 'Homecoming King', 'allstar', 'Be named Class MVP on reunion night.', (f) => mp(f, 'reunionMvp') >= 1),
  A('mp-r3', 'Superlatives', 'starter', 'Win three awards or more on one reunion night.', (f) => mp(f, 'reunion3') >= 1),
  A('mp-rsweep', 'The Whole Yearbook', 'hof', 'Win every award on a reunion night.', (f) => mp(f, 'reunionSweep') >= 1),
  A('mp-react10', 'Hype Man', 'bench', 'React to ten of your classmates’ seasons.', (f) => mp(f, 'react') >= 10),
  A('mp-crown', 'Heavy Is the Head', 'rotation', 'Get a crown from a classmate on one of your seasons.', (f) => mp(f, 'crowned') >= 1),
  A('mp-daily1', 'King of the Hill', 'rotation', 'Top your friends’ board for the daily challenge.', (f) => mp(f, 'dailyTop') >= 1),
  A('mp-watch5', 'Binge Watcher', 'bench', 'Watch the careers of five classmates, season by season.', (f) => mp(f, 'watched') >= 5),
];

/** The ones that only read the totals kept across careers (checked with no career open). */
export const R35_TOTALS_ONLY = ['mp-made1', 'mp-made5', 'mp-ans1', 'mp-join1', 'mp-beat1', 'mp-beat5', 'mp-top1', 'mp-top3', 'mp-fduo', 'mp-ftrio', 'mp-chat1', 'un-real', 'un-stars', 'un-minis', 'un-all', 'mp-rmvp', 'mp-r3', 'mp-rsweep', 'mp-react10', 'mp-crown', 'mp-daily1', 'mp-watch5'];
