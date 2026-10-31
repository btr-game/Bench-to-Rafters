// Achievements (round 24, owner: "records/achievements: doesn't contribute to OVR or growth, but
// just looks good... make hundreds of them, some extremely hard... name each with a little
// variation, some puns... the ones they didn't get, they can see the title but not the conditions,
// so it remains a riddle. Make tiers"). Every achievement is a check on the career being played,
// plus a few totals kept across careers (careers finished, titles over all careers...). They are
// cosmetic only: nothing here touches the game. The UI keeps what was earned on the device.

import type { GameState, SeasonRecord } from './types';
import type { Mode } from './balance';
import { championships, count, hallOfFame, nbaCareerPoints, raftersTeams } from './awards/legacy';
import { legacyRank } from './awards/tiers';
import { legendarySeasons } from './awards/legendary';
import { activeDuo, activeTrio } from './career/duo';
import { ovrOf } from './player/ovr';
import { weightOf } from './player/weight';
import { ACHIEVEMENTS_25 } from './achievements25';
import { ACHIEVEMENTS_MINI, MINI_TOTALS_ONLY, type MiniTotals } from './achievementsMini';

export type AchTier = 'bench' | 'rotation' | 'starter' | 'allstar' | 'hof';
export const ACH_TIERS: { key: AchTier; name: string; color: string }[] = [
  { key: 'bench', name: 'Bench', color: '#B07D4F' },
  { key: 'rotation', name: 'Rotation', color: '#9AA7B4' },
  { key: 'starter', name: 'Starter', color: '#E2B33C' },
  { key: 'allstar', name: 'All-Star', color: '#4FC3D9' },
  { key: 'hof', name: 'Hall of Fame', color: '#B26BFF' },
];

/** Totals kept across careers (the UI stores them with the achievements). */
export interface CareerTotals {
  finished: number;
  byMode: Partial<Record<Mode, number>>;
  titles: number; // NBA titles over every career
  mvps: number;
  fast: number; // careers finished on Fast break
  master: number; // careers finished in Master mode
  daily: number; // days the daily challenge was played
  mini?: MiniTotals; // round 27: every mini-game run on this device (achievementsMini.ts)
  shared?: number; // round 28: times the game's link went out (Share the game)
}
export const NO_TOTALS: CareerTotals = { finished: 0, byMode: {}, titles: 0, mvps: 0, fast: 0, master: 0, daily: 0 };

/** Everything the checks read, worked out once per look. */
interface Facts {
  g: GameState;
  t: CareerTotals;
  mode: Mode;
  retired: boolean;
  peak: number; // shown peak OVR
  ovr: number; // shown OVR now
  age: number;
  nba: SeasonRecord[]; // NBA seasons he played in
  levels: Set<string>;
  nbaTeams: number;
  awardsByYear: Map<number, Set<string>>;
  nbaTitlesYears: number[];
  playIn: boolean;
  playInToPlayoffs: boolean;
  lowSeedChamp: boolean;
}

function facts(g: GameState, t: CareerTotals): Facts {
  const nba = g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);
  const awardsByYear = new Map<number, Set<string>>();
  for (const a of g.awards) awardsByYear.set(a.year, (awardsByYear.get(a.year) ?? new Set()).add(a.key));
  // the play-in can only be seen while that season's bracket is still up
  const lg = g.nba;
  const me = g.stage === 'NBA' ? lg?.userTeamId : null;
  const b = me ? lg?.bracket : undefined;
  const playIn = !!b?.playIn?.some((x) => x.a === me || x.b === me);
  const inRound1 = !!b?.rounds[0]?.series.some((x) => x.a === me || x.b === me);
  return {
    g,
    t,
    mode: g.mode ?? 'standard',
    retired: g.step === 'retired',
    peak: Math.round(g.player.peakOvr),
    ovr: Math.round(ovrOf(g.player.attrs, g.player.pos)),
    age: g.player.age,
    nba,
    levels: new Set(g.history.filter((h) => h.line.gp > 0).map((h) => h.level)),
    nbaTeams: new Set(nba.map((h) => h.teamId)).size,
    awardsByYear,
    nbaTitlesYears: championships(g).filter((x) => x.nba).map((x) => x.year),
    playIn,
    playInToPlayoffs: playIn && inRound1,
    lowSeedChamp: !!(me && b && b.champion === me && (b.seeds?.[me] ?? 0) >= 7),
  };
}

export interface Achievement {
  id: string;
  name: string;
  tier: AchTier;
  how: string; // shown once it is earned
  test: (f: Facts) => boolean;
}

const A = (id: string, name: string, tier: AchTier, how: string, test: (f: Facts) => boolean): Achievement => ({ id, name, tier, how, test });
const per = (h: SeasonRecord, k: 'pts' | 'reb' | 'ast') => (h.line.gp ? h.line[k] / h.line.gp : 0);
const n = (f: Facts, key: string) => count(f.g, key);
const high = (f: Facts, k: 'pts' | 'reb' | 'ast' | 'stl' | 'blk' | 'tpm') => f.g.highs?.nba?.[k]?.v ?? 0;
const bothYear = (f: Facts, ...keys: string[]) => [...f.awardsByYear.values()].some((s) => keys.every((k) => s.has(k)));
const titleYear = (s: Set<string>) => s.has('TITLE') || s.has('TITLEKEY');
const result = (f: Facts, re: RegExp) => f.nba.some((h) => re.test(h.result));
const playedAt = (f: Facts, age: number) => f.g.history.some((h) => h.age >= age && h.line.gp > 0);

export const ACHIEVEMENTS: Achievement[] = [
  // ---- how good he got ----
  A('ovr45', 'Rookie Numbers', 'bench', 'Reach OVR 45.', (f) => f.peak >= 45),
  A('ovr50', 'Half-Court Heave', 'bench', 'Reach OVR 50.', (f) => f.peak >= 50),
  A('ovr55', 'Double Nickel', 'bench', 'Reach OVR 55.', (f) => f.peak >= 55),
  A('ovr60', 'Six-Oh, Six-Oh', 'bench', 'Reach OVR 60.', (f) => f.peak >= 60),
  A('ovr65', 'Route 65', 'rotation', 'Reach OVR 65.', (f) => f.peak >= 65),
  A('ovr70', 'Seventy Something', 'rotation', 'Reach OVR 70.', (f) => f.peak >= 70),
  A('ovr75', 'Diamond Anniversary', 'rotation', 'Reach OVR 75.', (f) => f.peak >= 75),
  A('ovr80', 'Octane Eighty', 'starter', 'Reach OVR 80.', (f) => f.peak >= 80),
  A('ovr85', 'Eighty-Fine', 'starter', 'Reach OVR 85.', (f) => f.peak >= 85),
  A('ovr88', 'Infinity, Twice', 'allstar', 'Reach OVR 88.', (f) => f.peak >= 88),
  A('ovr90', 'Nine-Oh!', 'allstar', 'Reach OVR 90.', (f) => f.peak >= 90),
  A('ovr92', 'Ninety-Two Good', 'allstar', 'Reach OVR 92.', (f) => f.peak >= 92),
  A('ovr95', 'Nine to Five', 'hof', 'Reach OVR 95.', (f) => f.peak >= 95),
  A('ovr97', 'Ninety-Heaven', 'hof', 'Reach OVR 97.', (f) => f.peak >= 97),
  A('ovr99', 'Ninety-Nine Problems', 'hof', 'Reach OVR 99.', (f) => f.peak >= 99),
  A('real70', 'Reality Check', 'rotation', 'Reach OVR 70 in Reality hits hard.', (f) => f.mode === 'reality' && f.peak >= 70),
  A('real80', 'Reality Bites Back', 'starter', 'Reach OVR 80 in Reality hits hard.', (f) => f.mode === 'reality' && f.peak >= 80),
  A('real90', 'Augmented Reality', 'allstar', 'Reach OVR 90 in Reality hits hard.', (f) => f.mode === 'reality' && f.peak >= 90),
  A('real99', 'Virtual Reality', 'hof', 'Reach OVR 99 in Reality hits hard.', (f) => f.mode === 'reality' && f.peak >= 99),
  A('star90', 'Starstruck', 'starter', 'Reach OVR 90 in Shoot for the stars.', (f) => f.mode === 'stars' && f.peak >= 90),
  A('star95', 'Supernova', 'allstar', 'Reach OVR 95 in Shoot for the stars.', (f) => f.mode === 'stars' && f.peak >= 95),
  A('star99', 'Black Hole Sun', 'hof', 'Reach OVR 99 in Shoot for the stars.', (f) => f.mode === 'stars' && f.peak >= 99),
  A('teen70', 'Teen Spirit', 'starter', 'Reach OVR 70 as a teenager.', (f) => f.age <= 19 && f.ovr >= 70),
  A('young85', 'Ahead of Schedule', 'allstar', 'Reach OVR 85 by 22.', (f) => f.age <= 22 && f.ovr >= 85),

  // ---- the long road ----
  A('age35', 'Thirty-Fine', 'rotation', 'Play a season at 35.', (f) => playedAt(f, 35)),
  A('age38', 'Old School', 'starter', 'Play a season at 38.', (f) => playedAt(f, 38)),
  A('age40', 'Over the Hill, Under the Rim', 'allstar', 'Play a season at 40.', (f) => playedAt(f, 40)),
  A('age42', 'The Answer to Everything', 'allstar', 'Play a season at 42.', (f) => playedAt(f, 42)),
  A('age45', 'Forty-Fly', 'hof', 'Play a season at 45.', (f) => playedAt(f, 45)),
  A('age50', 'Half a Century', 'hof', 'Play until the very end: 50.', (f) => playedAt(f, 49) && f.retired && (f.g.retiredAt ?? 0) >= 50),
  A('vintage', 'Vintage', 'allstar', 'Be OVR 80 or better at 38.', (f) => f.age >= 38 && f.ovr >= 80),
  A('finewine', 'Fine Wine', 'hof', 'Be OVR 85 at 40.', (f) => f.age >= 40 && f.ovr >= 85),
  A('methuselah', 'Methuselah Moves', 'hof', 'Be OVR 70 at 45.', (f) => f.age >= 45 && f.ovr >= 70),
  A('fountain', 'Fountain of Youth', 'allstar', 'Take care of your body for years (longevity at its best).', (f) => (f.g.player.longevity ?? 0) >= 47),
  A('early', 'Early Bird Special', 'bench', 'Retire before 20.', (f) => f.retired && (f.g.retiredAt ?? 99) <= 19),
  A('walkaway', 'Walk Away Joe', 'bench', 'Retire on your own before 30.', (f) => f.retired && (f.g.retiredAt ?? 99) < 30 && f.g.history.length > 6),

  // ---- the road to the NBA ----
  A('fivestar', 'Five-Star Review', 'rotation', 'Be a five-star recruit.', (f) => f.g.stars >= 5),
  A('topclass', 'Top of the Class', 'allstar', 'Be the number one recruit in your class.', (f) => f.g.recruitRank === 1),
  A('state', 'State of Mind', 'rotation', 'Win a state title.', (f) => n(f, 'STATETITLE') > 0),
  A('college', 'Campus Life', 'bench', 'Play a college season.', (f) => f.levels.has('NCAA')),
  A('ncaa', 'One Shining Moment', 'starter', 'Win the NCAA title.', (f) => n(f, 'NCAATITLE') > 0),
  A('naismith', 'Naismith Approved', 'allstar', 'Be the national player of the year in college.', (f) => n(f, 'NAISMITH') > 0),
  A('euro', 'Euro Step', 'bench', 'Play a season in Europe.', (f) => f.levels.has('EU')),
  A('eutitle', 'Champions of Europe', 'starter', 'Win the EuroLeague.', (f) => n(f, 'EUTITLE') > 0),
  A('abroad', 'Passport Stamps', 'bench', 'Play a season in an overseas league.', (f) => f.levels.has('INT')),
  A('gleague', 'Minor Detour', 'bench', 'Play in the G League.', (f) => f.levels.has('GL')),
  A('callup', 'Called Up to the Bigs', 'rotation', 'Go from the G League to the NBA.', (f) => {
    const gl = f.g.history.filter((h) => h.level === 'GL').map((h) => h.year);
    return gl.length > 0 && f.nba.some((h) => h.year > Math.min(...gl));
  }),
  A('scenic', 'The Scenic Route', 'rotation', 'Play in four different kinds of leagues.', (f) => f.levels.size >= 4),
  A('drafted', 'Name Called', 'bench', 'Get drafted.', (f) => !!f.g.draftedBy),
  A('round2', 'Second Helping', 'bench', 'Go in the second round.', (f) => (f.g.draft?.userPick ?? 0) > 30),
  A('round1', 'Round One, Fight!', 'rotation', 'Go in the first round.', (f) => !!f.g.draft?.userPick && f.g.draft.userPick <= 30),
  A('lottery', 'Lottery Ticket', 'starter', 'Go in the lottery (top 14).', (f) => !!f.g.draft?.userPick && f.g.draft.userPick <= 14),
  A('top3', 'Three Wishes', 'starter', 'Go in the top three.', (f) => !!f.g.draft?.userPick && f.g.draft.userPick <= 3),
  A('pick1', 'The First Domino', 'allstar', 'Go first overall.', (f) => f.g.draft?.userPick === 1),
  A('undrafted', 'Undrafted, Undeterred', 'starter', 'Make the NBA after going undrafted.', (f) => f.g.undrafted && f.g.nbaGames > 0),
  A('debut', 'Lights, Camera, Action', 'bench', 'Play an NBA game.', (f) => f.g.nbaGames > 0),
  A('young', 'Fast Track', 'starter', 'Play in the NBA at 19.', (f) => f.nba.some((h) => h.age <= 19)),

  // ---- roles and moves ----
  A('starter', 'Starting Lineup', 'rotation', 'Start for an NBA team.', (f) => f.nba.some((h) => h.role === 'starter' || h.role === 'key')),
  A('key', 'The Main Event', 'starter', 'Be your NBA team’s first option.', (f) => f.nba.some((h) => h.role === 'key')),
  A('sixthrole', 'Spark Plug', 'rotation', 'Be an NBA sixth man.', (f) => f.nba.some((h) => h.role === 'sixth')),
  A('deep', 'Best Seat in the House', 'bench', 'Spend an NBA season at the end of the bench.', (f) => f.nba.some((h) => h.role === 'deep')),
  A('captain', 'Captain Obvious', 'rotation', 'Be named captain.', (f) => f.g.player.captain),
  A('traded', 'Trade Winds', 'bench', 'Play for two NBA teams.', (f) => f.nbaTeams >= 2),
  A('flyer', 'Frequent Flyer', 'rotation', 'Play for four NBA teams.', (f) => f.nbaTeams >= 4),
  A('journey', 'Journeyman', 'starter', 'Play for seven NBA teams.', (f) => f.nbaTeams >= 7),
  A('passport', 'Full Passport', 'allstar', 'Play for ten NBA teams.', (f) => f.nbaTeams >= 10),
  A('oneclub', 'One-Club Man', 'allstar', 'Play ten NBA seasons, all for one team.', (f) => f.retired && f.nba.length >= 10 && f.nbaTeams === 1),
  A('duo', 'Dynamic Duo', 'rotation', 'Form a duo with a teammate.', (f) => !!activeDuo(f.g) || f.g.log.some((e) => e.kind === 'duo')),
  A('trio', 'Holy Trinity', 'starter', 'Form a Big Three.', (f) => !!activeTrio(f.g)),
  A('chaser', 'Have Ring, Will Travel', 'starter', 'Become a veteran specialist for a contender.', (f) => !!f.g.player.ringChaser),
  A('chaserring', 'Ring Pop', 'allstar', 'Win a title as a veteran specialist.', (f) => !!f.g.player.ringChaser && f.nba.some((h) => /Champion/.test(h.result) && h.age >= 30 && h.role !== 'key')),
  A('military', 'Service Record', 'rotation', 'Serve your country between seasons.', (f) => f.g.log.some((e) => e.kind === 'military')),
  A('shop1', 'Retail Therapy', 'bench', 'Buy something in the shop.', (f) => f.g.purchases.length > 0),
  A('shop10', 'Shopaholic', 'rotation', 'Buy ten things in one career.', (f) => f.g.purchases.length >= 10),
  A('shop25', 'Platinum Card', 'starter', 'Buy 25 things in one career.', (f) => f.g.purchases.length >= 25),
  A('side', 'Side Quest', 'bench', 'Earn a mini-game bonus in a career.', (f) => !!f.g.flags.miniYear),
  A('clutch1', 'Crunch Time', 'bench', 'Play the last minutes of a final yourself.', (f) => (f.g.flags.clutchPlayed ?? 0) > 0),
  A('clutch90', 'Ice in the Veins', 'allstar', 'Earn a clutch rating of 90 in a final.', (f) => (f.g.flags.clutchBest ?? 0) >= 90),
  A('clutch100', 'Perfect Timing', 'hof', 'Earn a perfect clutch rating in a final.', (f) => (f.g.flags.clutchBest ?? 0) >= 100),

  // ---- the team ----
  A('w50', 'Fifty Shades of Win', 'rotation', 'Be on a 50-win NBA team.', (f) => f.nba.some((h) => h.w >= 50)),
  A('w60', 'Sixty Grand', 'starter', 'Be on a 60-win NBA team.', (f) => f.nba.some((h) => h.w >= 60)),
  A('w65', 'Speed Limit 65', 'allstar', 'Be on a 65-win NBA team.', (f) => f.nba.some((h) => h.w >= 65)),
  A('w70', 'Seventy Wonders', 'hof', 'Be on a 70-win NBA team.', (f) => f.nba.some((h) => h.w >= 70)),
  A('w73', 'Lucky Seventy-Three', 'hof', 'Be on a 73-win NBA team.', (f) => f.nba.some((h) => h.w >= 73)),
  A('w82', 'Perfecto', 'hof', 'Go 82–0.', (f) => f.nba.some((h) => h.w >= 82 && h.l === 0)),
  A('l60', 'Tank Commander', 'rotation', 'Survive a 60-loss NBA season.', (f) => f.nba.some((h) => h.l >= 60)),
  A('playin', 'Play It Again', 'bench', 'Make the play-in.', (f) => f.playIn),
  A('sidedoor', 'Through the Side Door', 'rotation', 'Win your way from the play-in into the playoffs.', (f) => f.playInToPlayoffs),
  A('playoffs', 'Postseason Pass', 'bench', 'Make the NBA playoffs.', (f) => result(f, /^Lost in the|Champion/)),
  A('round2win', 'Round Two, Please', 'rotation', 'Win an NBA playoff series.', (f) => result(f, /Conference semifinals|Conference finals|NBA Finals|Champion/)),
  A('conf', 'Conference Call', 'starter', 'Reach the conference finals.', (f) => result(f, /Conference finals|NBA Finals|Champion/)),
  A('finals', 'June Bug', 'starter', 'Reach the NBA Finals.', (f) => result(f, /NBA Finals|Champion/)),
  A('lostfinal', 'So Close', 'starter', 'Lose in the NBA Finals.', (f) => result(f, /Lost in the NBA Finals/)),
  A('ring', 'Ring Bearer', 'starter', 'Win an NBA title.', (f) => f.nbaTitlesYears.length > 0),
  A('ringkey', 'Lord of the Rings', 'allstar', 'Win a title as your team’s first option.', (f) => n(f, 'TITLEKEY') > 0),
  A('rings3', 'Hat Trick', 'allstar', 'Win three NBA titles.', (f) => f.nbaTitlesYears.length >= 3),
  A('threepeat', 'Three-Peat', 'hof', 'Win three titles in a row.', (f) => f.nbaTitlesYears.some((y) => f.nbaTitlesYears.includes(y + 1) && f.nbaTitlesYears.includes(y + 2))),
  A('rings5', 'High Five', 'hof', 'Win five NBA titles.', (f) => f.nbaTitlesYears.length >= 5),
  A('rings8', 'Octo-Ring', 'hof', 'Win eight NBA titles.', (f) => f.nbaTitlesYears.length >= 8),
  A('rings11', 'Bill Would Approve', 'hof', 'Win eleven NBA titles.', (f) => f.nbaTitlesYears.length >= 11),
  A('ringteams', 'Ring Collector', 'hof', 'Win titles with three different teams.', (f) => new Set(championships(f.g).filter((x) => x.nba).map((x) => x.teamName)).size >= 3),
  A('cinderella', 'Cinderella Story', 'allstar', 'Win the title as a seventh seed or lower.', (f) => f.lowSeedChamp),
  A('youngring', 'Prodigy Parade', 'allstar', 'Win an NBA title by 21.', (f) => f.nba.some((h) => /Champion/.test(h.result) && h.age <= 21)),
  A('oldring', 'Last Dance', 'allstar', 'Win an NBA title at 38 or older.', (f) => f.nba.some((h) => /Champion/.test(h.result) && h.age >= 38)),
  A('realring', 'Real Champ', 'allstar', 'Win an NBA title in Reality hits hard.', (f) => f.mode === 'reality' && f.nbaTitlesYears.length > 0),
  A('cup', 'Cup Runneth Over', 'starter', 'Win the NBA Cup.', (f) => n(f, 'NBACUP') > 0),
  A('cupmvp', 'Cup of Joe', 'allstar', 'Be the NBA Cup MVP.', (f) => n(f, 'CUPMVP') > 0),

  // ---- honours ----
  A('as1', 'A Star Is Born', 'rotation', 'Make an All-Star team.', (f) => n(f, 'ALLSTAR') >= 1),
  A('as5', 'Fan Favourite', 'starter', 'Make five All-Star teams.', (f) => n(f, 'ALLSTAR') >= 5),
  A('as10', 'Perennial', 'allstar', 'Make ten All-Star teams.', (f) => n(f, 'ALLSTAR') >= 10),
  A('as15', 'Weekend Regular', 'hof', 'Make fifteen All-Star teams.', (f) => n(f, 'ALLSTAR') >= 15),
  A('as19', 'Nineteen Weekends', 'hof', 'Make nineteen All-Star teams.', (f) => n(f, 'ALLSTAR') >= 19),
  A('allnba', 'Honour Roll', 'starter', 'Make an All-NBA team.', (f) => n(f, 'ALLNBA1') + n(f, 'ALLNBA2') + n(f, 'ALLNBA3') > 0),
  A('allnba1', 'First Team, First Class', 'allstar', 'Make the All-NBA first team.', (f) => n(f, 'ALLNBA1') > 0),
  A('allnba1x5', 'Fixture', 'hof', 'Make the All-NBA first team five times.', (f) => n(f, 'ALLNBA1') >= 5),
  A('allnba1x10', 'Furniture', 'hof', 'Make the All-NBA first team ten times.', (f) => n(f, 'ALLNBA1') >= 10),
  A('mvp1', 'Valuable Lesson', 'allstar', 'Win an MVP.', (f) => n(f, 'MVP') >= 1),
  A('mvp2', 'Double Value', 'allstar', 'Win two MVPs.', (f) => n(f, 'MVP') >= 2),
  A('mvp3', 'Value Meal', 'hof', 'Win three MVPs.', (f) => n(f, 'MVP') >= 3),
  A('mvp4', 'Four-Star General', 'hof', 'Win four MVPs.', (f) => n(f, 'MVP') >= 4),
  A('mvp5', 'Value Pack', 'hof', 'Win five MVPs.', (f) => n(f, 'MVP') >= 5),
  A('mvp6', 'Six Pack', 'hof', 'Win six MVPs.', (f) => n(f, 'MVP') >= 6),
  A('dpoy1', 'Lockdown Artist', 'starter', 'Win Defensive Player of the Year.', (f) => n(f, 'DPOY') >= 1),
  A('dpoy3', 'Wall Street', 'allstar', 'Win three DPOYs.', (f) => n(f, 'DPOY') >= 3),
  A('dpoy5', 'The Great Wall', 'hof', 'Win five DPOYs.', (f) => n(f, 'DPOY') >= 5),
  A('roy', 'Rookie Card', 'starter', 'Win Rookie of the Year.', (f) => n(f, 'ROY') > 0),
  A('allrookie', 'Fresh Face', 'rotation', 'Make the All-Rookie team.', (f) => n(f, 'ALLROOKIE') + n(f, 'ROY') > 0),
  A('sixth', 'Sixth Sense', 'starter', 'Win Sixth Man of the Year.', (f) => n(f, 'SIXTH') > 0),
  A('mip', 'Glow-Up', 'rotation', 'Win Most Improved Player.', (f) => n(f, 'MIP') > 0),
  A('scoring', 'Bucket List', 'allstar', 'Win a scoring title.', (f) => n(f, 'SCORING') > 0),
  A('scoring5', 'Bucket Brigade', 'hof', 'Win five scoring titles.', (f) => n(f, 'SCORING') >= 5),
  A('astlead', 'Dime Store', 'allstar', 'Lead the league in assists.', (f) => n(f, 'ASTLEAD') > 0),
  A('reblead', 'Board Meeting', 'allstar', 'Lead the league in rebounds.', (f) => n(f, 'REBLEAD') > 0),
  A('stllead', 'Pickpocket', 'allstar', 'Lead the league in steals.', (f) => n(f, 'STLLEAD') > 0),
  A('blklead', 'Get That Outta Here', 'allstar', 'Lead the league in blocks.', (f) => n(f, 'BLKLEAD') > 0),
  A('fmvp', 'June’s Finest', 'allstar', 'Win Finals MVP.', (f) => n(f, 'FMVP') > 0),
  A('fmvp3', 'Clutch Gene', 'hof', 'Win three Finals MVPs.', (f) => n(f, 'FMVP') >= 3),
  A('twoway', 'Two-Way Street', 'hof', 'Win MVP and DPOY in the same season.', (f) => bothYear(f, 'MVP', 'DPOY')),
  A('haveitall', 'Have It All', 'hof', 'Win MVP and the title in the same season.', (f) => [...f.awardsByYear.values()].some((s) => s.has('MVP') && titleYear(s))),
  A('triplecrown', 'Triple Crown', 'hof', 'Win MVP, Finals MVP and the title in one season.', (f) => [...f.awardsByYear.values()].some((s) => s.has('MVP') && s.has('FMVP') && titleYear(s))),
  A('dayone', 'Day-One Superstar', 'hof', 'Win Rookie of the Year and MVP in the same season.', (f) => bothYear(f, 'ROY', 'MVP')),
  A('lonewolf', 'Lone Wolf', 'allstar', 'Win MVP on a losing team.', (f) => f.g.awards.some((a) => a.key === 'MVP' && f.nba.some((h) => h.year === a.year && h.w < h.l))),
  A('legend1', 'Legendary', 'allstar', 'Have a legendary season.', (f) => legendarySeasons(f.g).length > 0),
  A('legend3', 'Myth in the Making', 'hof', 'Have three legendary seasons.', (f) => legendarySeasons(f.g).length >= 3),
  A('medal', 'Podium Finish', 'starter', 'Win a medal for your country.', (f) => n(f, 'OLYMEDAL') + n(f, 'WCMEDAL') + n(f, 'ASIANMEDAL') + n(f, 'OLYGOLD') + n(f, 'WCGOLD') + n(f, 'ASIANGOLD') > 0),
  A('olygold', 'Going for Gold', 'allstar', 'Win Olympic gold.', (f) => n(f, 'OLYGOLD') > 0),
  A('wcgold', 'World Domination', 'allstar', 'Win the World Cup.', (f) => n(f, 'WCGOLD') > 0),
  A('asiangold', 'Gold Rush', 'starter', 'Win Asian Games gold.', (f) => n(f, 'ASIANGOLD') > 0),
  A('olygold3', 'Gold Standard', 'hof', 'Win three Olympic golds.', (f) => n(f, 'OLYGOLD') >= 3),

  // ---- numbers ----
  A('pts1k', 'Four Digits', 'bench', 'Score 1,000 NBA points.', (f) => nbaCareerPoints(f.g) >= 1000),
  A('pts5k', 'High Five Thousand', 'rotation', 'Score 5,000 NBA points.', (f) => nbaCareerPoints(f.g) >= 5000),
  A('pts10k', 'Ten Grand', 'starter', 'Score 10,000 NBA points.', (f) => nbaCareerPoints(f.g) >= 10000),
  A('pts20k', 'Twenty K Club', 'allstar', 'Score 20,000 NBA points.', (f) => nbaCareerPoints(f.g) >= 20000),
  A('pts30k', 'Thirty Thousand Feet', 'hof', 'Score 30,000 NBA points.', (f) => nbaCareerPoints(f.g) >= 30000),
  A('pts40k', 'Forty Thou', 'hof', 'Score 40,000 NBA points.', (f) => nbaCareerPoints(f.g) >= 40000),
  A('pts50k', 'Fifty K (Unreal)', 'hof', 'Score 50,000 NBA points.', (f) => nbaCareerPoints(f.g) >= 50000),
  A('gp82', 'Full Season', 'bench', 'Play 82 NBA games.', (f) => f.g.nbaGames >= 82),
  A('gp500', 'Five Hundred Club', 'rotation', 'Play 500 NBA games.', (f) => f.g.nbaGames >= 500),
  A('gp1000', 'Thousand Club', 'allstar', 'Play 1,000 NBA games.', (f) => f.g.nbaGames >= 1000),
  A('gp1500', 'Iron Man', 'hof', 'Play 1,500 NBA games.', (f) => f.g.nbaGames >= 1500),
  A('g30', 'Thirty Piece', 'rotation', 'Score 30 in an NBA game.', (f) => high(f, 'pts') >= 30),
  A('g40', 'Forty Piece', 'starter', 'Score 40 in an NBA game.', (f) => high(f, 'pts') >= 40),
  A('g50', 'Fifty Burger', 'allstar', 'Score 50 in an NBA game.', (f) => high(f, 'pts') >= 50),
  A('g60', 'Sixty Minutes of Fame', 'hof', 'Score 60 in an NBA game.', (f) => high(f, 'pts') >= 60),
  A('g70', 'Seventy Times Seven', 'hof', 'Score 70 in an NBA game.', (f) => high(f, 'pts') >= 70),
  A('g81', 'Eighty-One Reasons', 'hof', 'Score 81 in an NBA game.', (f) => high(f, 'pts') >= 81),
  A('g100', 'Wilt Would Wink', 'hof', 'Score 100 in an NBA game.', (f) => high(f, 'pts') >= 100),
  A('r20', 'Glass Cleaner', 'starter', 'Grab 20 rebounds in an NBA game.', (f) => high(f, 'reb') >= 20),
  A('r25', 'Window Washer', 'allstar', 'Grab 25 rebounds in an NBA game.', (f) => high(f, 'reb') >= 25),
  A('a15', 'Dime Bag', 'starter', 'Dish 15 assists in an NBA game.', (f) => high(f, 'ast') >= 15),
  A('a20', 'Twenty Dimes', 'allstar', 'Dish 20 assists in an NBA game.', (f) => high(f, 'ast') >= 20),
  A('s7', 'Sticky Fingers', 'allstar', 'Steal 7 in an NBA game.', (f) => high(f, 'stl') >= 7),
  A('b8', 'Swat Team', 'allstar', 'Block 8 shots in an NBA game.', (f) => high(f, 'blk') >= 8),
  A('t10', 'Raining Threes', 'allstar', 'Hit 10 threes in an NBA game.', (f) => high(f, 'tpm') >= 10),
  A('t14', 'Splash Flood', 'hof', 'Hit 14 threes in an NBA game.', (f) => high(f, 'tpm') >= 14),
  A('ppg20', 'Twenty Questions', 'rotation', 'Average 20 points in an NBA season.', (f) => f.nba.some((h) => per(h, 'pts') >= 20)),
  A('ppg25', 'Twenty-Five to Life', 'starter', 'Average 25 points in an NBA season.', (f) => f.nba.some((h) => per(h, 'pts') >= 25)),
  A('ppg30', 'Thirty, Flirty and Thriving', 'allstar', 'Average 30 points in an NBA season.', (f) => f.nba.some((h) => per(h, 'pts') >= 30)),
  A('ppg35', 'Thirty-Five Alive', 'hof', 'Average 35 points in an NBA season.', (f) => f.nba.some((h) => per(h, 'pts') >= 35)),
  A('apg10', 'Ten Dimes a Night', 'allstar', 'Average 10 assists in an NBA season.', (f) => f.nba.some((h) => per(h, 'ast') >= 10)),
  A('rpg12', 'Rebound Relationship', 'allstar', 'Average 12 rebounds in an NBA season.', (f) => f.nba.some((h) => per(h, 'reb') >= 12)),
  A('rpg15', 'Board Certified', 'hof', 'Average 15 rebounds in an NBA season.', (f) => f.nba.some((h) => per(h, 'reb') >= 15)),
  A('tdavg', 'Triple-Double Life', 'hof', 'Average a triple-double over an NBA season.', (f) => f.nba.some((h) => per(h, 'pts') >= 10 && per(h, 'reb') >= 10 && per(h, 'ast') >= 10)),

  // ---- legacy ----
  A('lp50', 'Legacy Loading', 'starter', 'Earn 50 legacy points.', (f) => f.retired && legacyRank(f.g).pts >= 50),
  A('hof', 'Hall Pass', 'allstar', 'Make the Hall of Fame.', (f) => f.retired && !!hallOfFame(f.g)),
  A('hof1', 'First Ballot, First Class', 'hof', 'Make the Hall of Fame on the first ballot.', (f) => f.retired && hallOfFame(f.g) === 'first'),
  A('rafters', 'Hang Time', 'allstar', 'Have your number retired.', (f) => f.retired && raftersTeams(f.g).length > 0),
  A('rafters2', 'Two Banners, One Name', 'hof', 'Have your number retired by two teams.', (f) => f.retired && raftersTeams(f.g).length >= 2),
  A('top100', 'Century Club', 'starter', 'Crack the all-time top 100.', (f) => f.retired && legacyRank(f.g).rank <= 100),
  A('top25', 'Quarter Century', 'allstar', 'Crack the all-time top 25.', (f) => f.retired && legacyRank(f.g).rank <= 25),
  A('top10', 'Top Ten List', 'hof', 'Crack the all-time top 10.', (f) => f.retired && legacyRank(f.g).rank <= 10),
  A('goat', 'Greatest of All Time', 'hof', 'Finish first all-time.', (f) => f.retired && legacyRank(f.g).rank === 1),
  A('realhof', 'Keeping It Real', 'hof', 'Make the Hall of Fame in Reality hits hard.', (f) => f.mode === 'reality' && f.retired && !!hallOfFame(f.g)),
  A('regularhof', 'Regular Legend', 'allstar', 'Make the Hall of Fame as a Regular guy.', (f) => f.mode === 'standard' && f.retired && !!hallOfFame(f.g)),
  A('realnba', 'Reality TV', 'starter', 'Make the NBA in Reality hits hard.', (f) => f.mode === 'reality' && f.g.nbaGames > 0),
  A('realas', 'Real Star', 'allstar', 'Make an All-Star team in Reality hits hard.', (f) => f.mode === 'reality' && n(f, 'ALLSTAR') > 0),
  A('realmvp', 'The Realest', 'hof', 'Win MVP in Reality hits hard.', (f) => f.mode === 'reality' && n(f, 'MVP') > 0),
  A('starmvp', 'Star Power', 'starter', 'Win MVP in Shoot for the stars.', (f) => f.mode === 'stars' && n(f, 'MVP') > 0),
  A('starmvp5', 'Constellation', 'allstar', 'Win five MVPs in Shoot for the stars.', (f) => f.mode === 'stars' && n(f, 'MVP') >= 5),

  // ---- body ----
  A('spurt', 'Growth Spurt', 'rotation', 'Grow six inches after 14.', (f) => {
    const first = f.g.history.find((h) => h.height)?.height;
    return !!first && f.g.player.height - first >= 6;
  }),
  A('seven', 'Seven Footer', 'starter', 'Stand seven feet tall.', (f) => f.g.player.height >= 84),
  A('sky', 'Skyscraper', 'allstar', 'Stand 7′4″ or taller.', (f) => f.g.player.height >= 88),
  A('small', 'Small Wonder', 'allstar', 'Make the NBA at under six feet.', (f) => f.g.nbaGames > 0 && f.g.player.height < 72),
  A('heavy', 'Heavyweight', 'rotation', 'Weigh 300 pounds.', (f) => weightOf(f.g.player) >= 300),
  A('feather', 'Featherweight', 'rotation', 'Play an NBA season under 180 pounds.', (f) => f.g.nbaGames > 0 && weightOf(f.g.player) < 180),
  A('hurt1', 'Out for the Season', 'bench', 'Miss a season with an injury.', (f) => (f.g.player.injuries ?? []).some((i) => i.key === 'season')),
  A('hurt10', 'Frequent Patient', 'rotation', 'Get hurt ten times in one career.', (f) => (f.g.player.injuries ?? []).length >= 10),
  A('bubble', 'Bubble Wrap', 'hof', 'Play 15 seasons without a single injury.', (f) => f.retired && f.g.history.length >= 15 && (f.g.player.injuries ?? []).length === 0),
  // round 25 (owner: some achievements came already earned): the wingspan alone is a birth draw,
  // so it now has to be put to use as well
  A('wingspan', 'Pterodactyl', 'starter', 'Have a wingspan seven inches over your height and use it: 3 blocks and steals a game over a season.', (f) => f.g.player.wingspan - f.g.player.height >= 7 && f.g.history.some((h) => h.line.gp >= 10 && (h.line.blk + h.line.stl) / h.line.gp >= 3)),

  // ---- money ----
  A('m10', 'Paid in Full', 'rotation', 'Earn $10 million.', (f) => f.g.player.earnings >= 10),
  A('m100', 'Nine Figures', 'starter', 'Earn $100 million.', (f) => f.g.player.earnings >= 100),
  A('m300', 'Bag Secured', 'allstar', 'Earn $300 million.', (f) => f.g.player.earnings >= 300),
  A('m500', 'Half a Billion Reasons', 'hof', 'Earn $500 million.', (f) => f.g.player.earnings >= 500),

  // ---- careers (over every career on this device) ----
  A('c1', 'First Chapter', 'bench', 'Finish a career.', (f) => f.t.finished >= 1),
  A('c3', 'Trilogy', 'bench', 'Finish three careers.', (f) => f.t.finished >= 3),
  A('c5', 'Box Set', 'rotation', 'Finish five careers.', (f) => f.t.finished >= 5),
  A('c10', 'Double Digits', 'starter', 'Finish ten careers.', (f) => f.t.finished >= 10),
  A('c25', 'Silver Anniversary', 'allstar', 'Finish 25 careers.', (f) => f.t.finished >= 25),
  A('c50', 'Golden Anniversary', 'hof', 'Finish 50 careers.', (f) => f.t.finished >= 50),
  A('c100', 'Centurion', 'hof', 'Finish 100 careers.', (f) => f.t.finished >= 100),
  A('allmodes', 'Grand Tour', 'starter', 'Finish a career at every difficulty.', (f) => (['standard', 'reality', 'stars'] as Mode[]).every((m) => (f.t.byMode[m] ?? 0) > 0)),
  A('fastdone', 'Speed Reader', 'bench', 'Finish a career on Fast break.', (f) => f.t.fast > 0),
  A('masterdone', 'No Training Wheels', 'starter', 'Finish a career in Master mode.', (f) => f.t.master > 0),
  A('titles10', 'Ring Hoarder', 'allstar', 'Win ten NBA titles over all your careers.', (f) => f.t.titles >= 10),
  A('mvp10', 'Trophy Room', 'hof', 'Win ten MVPs over all your careers.', (f) => f.t.mvps >= 10),
  A('daily1', 'Daily Grind', 'bench', 'Play a daily challenge.', (f) => f.t.daily >= 1),
  A('daily7', 'Week Streak', 'rotation', 'Play the daily challenge on seven days.', (f) => f.t.daily >= 7),
  A('daily30', 'Month of Sundays', 'allstar', 'Play the daily challenge on thirty days.', (f) => f.t.daily >= 30),
  // round 28: Share the game
  A('share1', 'Word of Mouth', 'bench', 'Share the game with someone.', (f) => (f.t.shared ?? 0) >= 1),
  // round 28: crunch time in a final, the logo at the first brand deal, the talk with the coach
  A('crunch1', 'Two-Minute Drill', 'rotation', 'Play the last two minutes of a final yourself.', (f) => (f.g.flags.crunch ?? 0) >= 1),
  A('crunchwin', 'Closing Time', 'starter', 'Win a final in crunch time, calling the plays yourself.', (f) => (f.g.flags.crunchWon ?? 0) >= 1),
  A('crunchback', 'Down but Not Out', 'allstar', 'Trail when crunch time starts in a final, and win it.', (f) => (f.g.flags.crunchBack ?? 0) >= 1),
  A('crunchot', 'Bonus Basketball', 'allstar', 'Win a final in overtime, calling the plays yourself.', (f) => (f.g.flags.crunchOtWon ?? 0) >= 1),
  A('crunch5', 'Ice Water', 'hof', 'Win five finals in crunch time over a career.', (f) => (f.g.flags.crunchWon ?? 0) >= 5),
  A('logo', 'Brand New Look', 'rotation', 'Have your nickname’s logo drawn for your first brand deal.', (f) => !!f.g.player.nickname?.logo),
  A('chalk', 'Chalk Talk', 'bench', 'Sit down with the coach and set the team’s style.', (f) => !!f.g.teamStyle),
  // round 25: the book past 500 (achievements25.ts)
  ...ACHIEVEMENTS_25,
  // round 27: the mini-games, in the arcade and in a career (achievementsMini.ts)
  ...ACHIEVEMENTS_MINI,
];

// the ones that only read the totals kept across careers (they can be checked with no career open)
const TOTALS_ONLY = new Set(['c1', 'c3', 'c5', 'c10', 'c25', 'c50', 'c100', 'allmodes', 'fastdone', 'masterdone', 'titles10', 'mvp10', 'daily1', 'daily7', 'daily30', 'share1', ...MINI_TOTALS_ONLY]);

/** The achievements this career (and the totals) have earned, by id. */
export function earnedNow(g: GameState | null, t: CareerTotals): string[] {
  const f = g ? facts(g, t) : ({ t } as Facts);
  // round 25: nothing comes with the starting draw (a high first OVR used to earn the OVR rungs
  // on the first screen): a career earns its achievements from the end of its first season
  const career = !!g?.history.length;
  return ACHIEVEMENTS.filter((a) => {
    if (!career && !TOTALS_ONLY.has(a.id)) return false;
    try {
      return a.test(f);
    } catch {
      return false;
    }
  }).map((a) => a.id);
}
