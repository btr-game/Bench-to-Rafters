// Round 32: a batch for the round's systems and more besides (owner: "i think achievements are
// quite easily broken. im happy about that, but we might run out of them quickly. add more"). The
// locker room, the head coach (role talks, the hot seat, Coach of the Year, firing him), the
// farewell tour, record chases, the announcer, career cards, the Love storyline and the next
// generation, then NBA seasons and careers the book did not cover yet. Same rules as the rest of
// the book: cosmetic, pun names, conditions hidden until earned.

import type { GameState, SeasonRecord } from './types';
import type { AchTier, CareerTotals } from './achievements';
import { LOCKER } from './balance';
import { championships, count, hallOfFame, nbaCareerPoints } from './awards/legacy';
import { GAME_RECORDS, SCORING_LIST } from './career/records';
import type { HighKey } from './types';

/** What these checks read (the book's facts, in part). */
interface Facts32 {
  g: GameState;
  t: CareerTotals;
  nba: SeasonRecord[];
  awardsByYear: Map<number, Set<string>>;
  peak: number;
  retired: boolean;
  nbaTitlesYears: number[];
}

interface Ach32 {
  id: string;
  name: string;
  tier: AchTier;
  how: string;
  test: (f: Facts32) => boolean;
}

const A = (id: string, name: string, tier: AchTier, how: string, test: (f: Facts32) => boolean): Ach32 => ({ id, name, tier, how, test });
const fl = (f: Facts32, k: string) => f.g.flags[k] ?? 0;
type K = 'pts' | 'reb' | 'ast' | 'stl' | 'blk' | 'tpm' | 'min' | 'ftm';
const pg = (h: SeasonRecord, k: K) => (h.line.gp ? h.line[k] / h.line.gp : 0);
const ppg = (h: SeasonRecord, k: K) => (h.post.gp ? h.post[k] / h.post.gp : 0);
/** An NBA season of 40 games or more that passes `test`. */
const season = (f: Facts32, test: (h: SeasonRecord) => boolean) => f.nba.some((h) => h.line.gp >= 40 && test(h));
const ageIn = (f: Facts32, year: number) => f.g.history.find((h) => h.year === year)?.age ?? f.g.player.age;
const farewellYear = (f: Facts32) => f.g.awards.find((a) => a.key === 'FAREWELL')?.year ?? null;
const passed = (f: Facts32) => {
  const pts = nbaCareerPoints(f.g);
  return SCORING_LIST.filter((l) => l.pts < pts).length;
};
const high = (f: Facts32, k: HighKey) => f.g.highs?.nba?.[k]?.v ?? 0;
const big = (f: Facts32) => f.g.player.pos === 'C';
const guard = (f: Facts32) => f.g.player.pos === 'PG' || f.g.player.pos === 'SG';
const ts = (h: SeasonRecord) => h.line.pts / Math.max(1, 2 * (h.line.fga + 0.44 * h.line.fta));

export const ACHIEVEMENTS_32: Ach32[] = [
  // ---- the locker room ----
  A('lk1', 'Locker Room Talk', 'bench', 'Talk to someone in the locker room.', (f) => fl(f, 'lkTalk') >= 1),
  A('lk25', 'Team Meeting', 'rotation', 'Have 25 locker room talks in one career.', (f) => fl(f, 'lkTalk') >= 25),
  A('lk75', 'Mayor of the Locker Room', 'allstar', 'Have 75 locker room talks in one career.', (f) => fl(f, 'lkTalk') >= 75),
  A('lk-mentor', 'Big Brother', 'bench', 'Mentor a rookie in the locker room.', (f) => fl(f, 'lkMentor') >= 1),
  A('lk-mentor8', 'Coaching Tree', 'starter', 'Mentor rookies eight times in one career.', (f) => fl(f, 'lkMentor') >= 8),
  A('lk-feud', 'Peacekeeper', 'rotation', 'Break up a feud between two teammates.', (f) => fl(f, 'lkFeud') >= 1),
  A('lk-feud5', 'Blue Helmet', 'allstar', 'Break up five feuds in one career.', (f) => fl(f, 'lkFeud') >= 5),
  A('lk-calm', 'Anger Management', 'rotation', 'Talk a hothead down.', (f) => fl(f, 'lkCalm') >= 1),
  A('lk-square', 'Squared Up', 'rotation', 'Stand up to a hothead, and win the room.', (f) => fl(f, 'lkSquare') >= 1),
  A('lk-gripe', 'Complaint Department', 'bench', 'Tell the coach what you really think.', (f) => fl(f, 'lkGripe') >= 1),
  A('lk-film', 'Tape Delay', 'bench', 'Watch film with the quiet pro.', (f) => fl(f, 'lkFilm') >= 1),
  A('lk-film10', 'Film School', 'starter', 'Watch film with the quiet pro ten times in one career.', (f) => fl(f, 'lkFilm') >= 10),
  A('lk-laugh', 'Laugh Track', 'bench', 'Laugh along with the team joker.', (f) => fl(f, 'lkLaugh') >= 1),
  A('lk-alpha', 'Alpha Dog', 'rotation', 'Tell the star whose team it is.', (f) => fl(f, 'lkAlpha') >= 1),
  A('lk-vet', 'Ask Your Elders', 'bench', 'Ask the veteran for advice.', (f) => fl(f, 'lkVet') >= 1),
  A('lk-twoman', 'Two-Man Game', 'rotation', 'Set up a two-man game with a star near your level.', (f) => fl(f, 'lkTwoMan') >= 1),
  A('lk-all', 'Social Butterfly', 'starter', 'In one career: mentor a rookie, ask a veteran, laugh with the joker, watch film with the quiet pro and break up a feud.', (f) => ['lkMentor', 'lkVet', 'lkLaugh', 'lkFilm', 'lkFeud'].every((k) => fl(f, k) >= 1)),
  A('lk-glue', 'Glue Guy', 'starter', 'Build all the chemistry the locker room allows in one season.', (f) => (f.g.locker?.chem ?? 0) >= LOCKER.cap - 1e-9),

  // ---- the head coach ----
  A('co-ask', 'Knock Knock', 'bench', 'Ask the coach for a bigger role.', (f) => fl(f, 'roleAsks') >= 1),
  A('co-yes', 'Promoted', 'rotation', 'Talk the coach into a bigger role.', (f) => fl(f, 'roleYes') >= 1),
  A('co-yes5', 'Corner Office', 'allstar', 'Talk your coaches into a bigger role five times in one career.', (f) => fl(f, 'roleYes') >= 5),
  A('co-fire', 'Pink Slip', 'starter', 'Have your head coach fired from the locker room.', (f) => fl(f, 'coachFires') >= 1),
  A('co-fire3', 'Coach Killer', 'allstar', 'Have three head coaches fired in one career.', (f) => fl(f, 'coachFires') >= 3),
  A('co-firering', 'New Voice', 'hof', 'Win the NBA title the season you had the coach fired.', (f) => !!fl(f, 'coachFired') && f.nbaTitlesYears.includes(fl(f, 'coachFired'))),
  A('co-coy', 'Teacher’s Pet', 'starter', 'Play for the Coach of the Year.', (f) => fl(f, 'coyMine') >= 1),
  A('co-coy3', 'Coaching Clinic', 'allstar', 'Play for three Coach of the Year seasons in one career.', (f) => fl(f, 'coyMine') >= 3),
  A('co-hotsave', 'Vote of Confidence', 'rotation', 'Back your coach on the hot seat, and save his job.', (f) => fl(f, 'hotSaved') >= 1),
  A('co-hotpush', 'Front Office Whisperer', 'rotation', 'Tell the front office it is time for a change.', (f) => fl(f, 'hotPushed') >= 1),
  A('co-many', 'Revolving Door', 'starter', 'See your team change head coaches four times in one career.', (f) => fl(f, 'coaches') >= 4),

  // ---- the farewell tour ----
  A('fw-ann', 'Goodbye Tour', 'rotation', 'Announce a farewell tour.', (f) => fl(f, 'farewell') > 0),
  A('fw-done', 'Victory Lap', 'starter', 'See a farewell tour through to its last game.', (f) => farewellYear(f) !== null),
  A('fw-ring', 'Ride Into the Sunset', 'hof', 'Win the NBA title in your farewell season.', (f) => {
    const y = farewellYear(f);
    return y !== null && f.nbaTitlesYears.includes(y);
  }),
  A('fw-as', 'One More for the Road', 'allstar', 'Make the All-Star team in your farewell season.', (f) => {
    const y = farewellYear(f);
    return y !== null && !!f.awardsByYear.get(y)?.has('ALLSTAR');
  }),
  A('fw-20', 'Last Call', 'allstar', 'Average 20 points in your farewell season.', (f) => {
    const y = farewellYear(f);
    return y !== null && f.nba.some((h) => h.year === y && pg(h, 'pts') >= 20);
  }),
  A('fw-40', 'Encore at Forty', 'allstar', 'Finish a farewell tour at 40 or older.', (f) => {
    const y = farewellYear(f);
    return y !== null && ageIn(f, y) >= 40;
  }),
  A('fw-3', 'Serial Goodbyes', 'allstar', 'Finish three careers on a farewell tour.', (f) => (f.t.farewells ?? 0) >= 3),

  // ---- record chases ----
  A('rc-chase', 'Chasing Ghosts', 'bench', 'Chase a name on the all-time scoring list.', (f) => fl(f, 'chases') >= 1),
  A('rc-chase5', 'Ghostbuster', 'starter', 'Chase the scoring list in five seasons of one career.', (f) => fl(f, 'chases') >= 5),
  A('rc-pass1', 'Passing the Torch', 'rotation', 'Pass a legend on the all-time scoring list.', (f) => passed(f) >= 1),
  A('rc-pass25', 'Name Dropper', 'starter', 'Pass 25 legends on the all-time scoring list.', (f) => passed(f) >= 25),
  A('rc-pass50', 'Leapfrog', 'allstar', 'Pass 50 legends on the all-time scoring list.', (f) => passed(f) >= 50),
  A('rc-king', 'Scoring King', 'hof', 'Top the all-time scoring list.', (f) => passed(f) >= SCORING_LIST.length),
  A('rc-near', 'So Close You Can Taste It', 'rotation', 'Come within a fifth of a league single-game record.', (f) => (Object.keys(GAME_RECORDS) as HighKey[]).some((k) => high(f, k) >= GAME_RECORDS[k].v * 0.8)),
  A('rc-break', 'Record Breaker', 'hof', 'Break the league’s single-game record for points, rebounds, assists, steals or blocks.', (f) => (['pts', 'reb', 'ast', 'stl', 'blk'] as HighKey[]).some((k) => high(f, k) >= GAME_RECORDS[k].v)),
  A('rc-break3', 'Splash Record', 'allstar', 'Break the league’s single-game record for threes.', (f) => high(f, 'tpm') >= GAME_RECORDS.tpm.v),

  // ---- the announcer and the career card ----
  A('mic1', 'Booming Voice', 'bench', 'Hear the announcer call a play.', (f) => (f.t.called ?? 0) >= 1),
  A('mic50', 'Play-by-Play', 'rotation', 'Hear the announcer call fifty plays.', (f) => (f.t.called ?? 0) >= 50),
  A('mic250', 'Hall of Fame Voice', 'starter', 'Hear the announcer call 250 plays.', (f) => (f.t.called ?? 0) >= 250),
  A('card1', 'Picture Day', 'bench', 'Save or share a career card.', (f) => (f.t.cards ?? 0) >= 1),
  A('card10', 'Trading Card Collector', 'rotation', 'Save or share ten career cards.', (f) => (f.t.cards ?? 0) >= 10),

  // ---- love and a family ----
  A('love', 'Meet Cute', 'bench', 'Fall in love.', (f) => fl(f, 'love') > 0),
  A('wed', 'Tie the Knot', 'rotation', 'Get married.', (f) => fl(f, 'wed') > 0),
  A('wed-sweet', 'High School Sweethearts', 'rotation', 'Marry your high school sweetheart.', (f) => fl(f, 'love') === 1 && fl(f, 'wed') > 0),
  A('wed-celeb', 'Power Couple', 'starter', 'Marry a celebrity.', (f) => fl(f, 'love') === 2 && fl(f, 'wed') > 0),
  A('wed-quiet', 'Off the Grid', 'rotation', 'Marry someone outside the game.', (f) => fl(f, 'love') === 3 && fl(f, 'wed') > 0),
  A('breakup', 'It’s Not You', 'bench', 'Wait too long, and lose them.', (f) => fl(f, 'breakup') > 0),
  A('dad', 'Proud Father', 'rotation', 'Start a family.', (f) => fl(f, 'child') > 0 && !fl(f, 'gen2')),
  A('dad-mvp', 'Dad Strength', 'allstar', 'Win an MVP after becoming a father.', (f) => fl(f, 'child') > 0 && !fl(f, 'gen2') && f.g.awards.some((a) => a.key === 'MVP' && a.year >= fl(f, 'child'))),

  // ---- the next generation ----
  A('gen2', 'Chip Off the Old Block', 'starter', 'Play your son’s career to the end.', (f) => !!fl(f, 'gen2') && f.retired),
  A('gen2-nba', 'Family Business', 'rotation', 'Your son makes the NBA.', (f) => !!fl(f, 'gen2') && f.nba.length > 0),
  A('gen2-as', 'Second-Generation All-Star', 'starter', 'Your son makes an All-Star team.', (f) => !!fl(f, 'gen2') && count(f.g, 'ALLSTAR') > 0),
  A('gen2-better', 'The Student Becomes the Master', 'allstar', 'Your son peaks higher than his father did.', (f) => !!fl(f, 'gen2') && !!f.g.parent?.peak && f.peak > f.g.parent.peak),
  A('gen2-ring', 'Rings Run in the Family', 'allstar', 'Father and son both win an NBA title.', (f) => !!fl(f, 'gen2') && (f.g.parent?.titles ?? 0) > 0 && f.nbaTitlesYears.length > 0),
  A('gen2-mvp', 'Like Father, Like Son', 'hof', 'Father and son both win an MVP.', (f) => !!fl(f, 'gen2') && (f.g.parent?.mvps ?? 0) > 0 && count(f.g, 'MVP') > 0),
  A('gen2-hof', 'Hall of Fame Family', 'hof', 'Your son makes the Hall of Fame.', (f) => !!fl(f, 'gen2') && f.retired && !!hallOfFame(f.g)),
  A('kid', 'Passing It Down', 'rotation', 'Have your son’s career add to your legacy.', (f) => !!f.g.kid),
  A('kid25', 'Family Legacy', 'allstar', 'Your son’s career adds 25 legacy points or more to yours.', (f) => (f.g.kid?.adds ?? 0) >= 25),
  A('sons3', 'Dynasty Builder', 'allstar', 'Play three sons’ careers to the end.', (f) => (f.t.sons ?? 0) >= 3),

  // ---- NBA seasons the book did not have yet ----
  A('g-20105', 'Twenty-Ten-Five', 'allstar', 'Average 20 points, 10 rebounds and 5 assists in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 20 && pg(h, 'reb') >= 10 && pg(h, 'ast') >= 5)),
  A('g-3010pr', 'Thirty and Ten', 'hof', 'Average 30 points and 10 rebounds in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 30 && pg(h, 'reb') >= 10)),
  A('g-stocks', 'Stocks Exchange', 'allstar', 'Average 2 steals and 2 blocks in an NBA season.', (f) => season(f, (h) => pg(h, 'stl') >= 2 && pg(h, 'blk') >= 2)),
  A('g-pointc', 'Point Center', 'starter', 'Average 6 assists in an NBA season as a center.', (f) => big(f) && season(f, (h) => pg(h, 'ast') >= 6)),
  A('g-stretch5', 'Stretch Five', 'starter', 'Make 120 threes in an NBA season as a center.', (f) => big(f) && season(f, (h) => h.line.tpm >= 120)),
  A('g-swatguard', 'Swat Guard', 'allstar', 'Average 1.5 blocks in an NBA season as a guard.', (f) => guard(f) && season(f, (h) => pg(h, 'blk') >= 1.5)),
  A('g-ft450', 'Line Drive', 'allstar', 'Make 450 free throws in an NBA season.', (f) => season(f, (h) => h.line.ftm >= 450)),
  A('g-ts62', 'True Shooter', 'allstar', 'Score 25 a game on 62% true shooting in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 25 && ts(h) >= 0.62)),
  A('g-min40', 'Heavy Legs', 'starter', 'Average 40 minutes a game in an NBA season.', (f) => season(f, (h) => pg(h, 'min') >= 40)),
  A('g-teen20', 'Teen Phenom', 'allstar', 'Average 20 points in an NBA season at 19 or younger.', (f) => season(f, (h) => h.age <= 19 && pg(h, 'pts') >= 20)),
  A('g-old20', 'Forty and Fabulous', 'allstar', 'Average 20 points in an NBA season at 40 or older.', (f) => season(f, (h) => h.age >= 40 && pg(h, 'pts') >= 20)),
  A('g-lateas', 'Better Late Than Never', 'starter', 'Make your first All-Star team at 30 or older.', (f) => {
    const first = f.g.awards.filter((a) => a.key === 'ALLSTAR').sort((a, b) => a.year - b.year)[0];
    return !!first && ageIn(f, first.year) >= 30;
  }),
  A('g-post30', 'Playoff Riser', 'allstar', 'Average 30 points in an NBA postseason (four games or more).', (f) => f.nba.some((h) => h.post.gp >= 4 && ppg(h, 'pts') >= 30)),
  A('g-posttd', 'Spring Triple-Double', 'hof', 'Average a triple-double in an NBA postseason (four games or more).', (f) => f.nba.some((h) => h.post.gp >= 4 && ppg(h, 'pts') >= 10 && ppg(h, 'reb') >= 10 && ppg(h, 'ast') >= 10)),
  A('g-2cities', 'Two-City Champion', 'allstar', 'Win NBA titles with two different teams.', (f) => new Set(championships(f.g).filter((x) => x.nba).map((x) => x.teamName)).size >= 2),
  A('g-hofnoring', 'Ringless Wonder', 'starter', 'Make the Hall of Fame without an NBA title.', (f) => f.retired && !!hallOfFame(f.g) && f.nbaTitlesYears.length === 0),
];

/** The ones that read only the totals kept across careers. */
export const R32_TOTALS_ONLY = ['fw-3', 'mic1', 'mic50', 'mic250', 'card1', 'card10', 'sons3'];
