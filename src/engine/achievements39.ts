// Rounds 38 to 40 (owner, round 32: "we might run out of them quickly. add more"). Round 38 wrote
// story mode (one written hero, his friend from the driveway, the rival a small step ahead, his
// family; engine/story/), round 39 put the last six minutes of the biggest playoff games on the
// Floor (engine/floor/) and an airport on the road map with a flight back to the main land, and
// round 40 put the game in six languages. So this batch is about the story (its chapters, the
// bonds, where the friend and the rival end up), the Floor (playing it, winning it, the comeback,
// the game-winner, the late block, the points in six minutes, a game seven), the languages and the
// flight, and a few general ones from the award races and the playoffs.
//
// The story is read from the career's own story state (GameState.story: the chapters played, the
// bonds, the switches the chapters set, the friend's and the rival's season lines in mp.friends).
// The Floor's marks are kept on the career's flags by career/live.ts floorFinish (the games he
// played himself apart from the ones he let the engine play). The languages careers were finished
// in and the flights from the road map are counted on this device by ui/achievements.ts
// (countCareer, recordFlight) and kept in the totals. Each career mark the harness can reach was
// measured over 150 Regular guy careers of the smart player (casual mini-games), the story's over
// 150 story careers of the smart player answering its chapters at random, before its tier was set
// (DECISIONS.md); the Floor's, which only a player at the keys can earn, are tiered by judgement.
// Same rules as the rest of the book: cosmetic, pun names, conditions hidden.

import type { GameState, SeasonRecord, StoryRole } from './types';
import type { AchTier, CareerTotals } from './achievements';
import { championships } from './awards/legacy';

/** The game's languages (i18n/index.ts LANGS; a test keeps the two in step). */
export const LANG_COUNT = 6;

/** The marks the device's counts go to (ui/achievements.ts tells the book when one is passed). */
export const R39_MARKS = {
  flights: [1, 10],
  chapters: [15, 18],
};

/** What these checks read (the book's facts, in part). */
interface Facts39 {
  g: GameState;
  t: CareerTotals;
  nba: SeasonRecord[];
  retired: boolean;
}

interface Ach39 {
  id: string;
  name: string;
  tier: AchTier;
  how: string;
  test: (f: Facts39) => boolean;
}

const A = (id: string, name: string, tier: AchTier, how: string, test: (f: Facts39) => boolean): Ach39 => ({ id, name, tier, how, test });

// ---- the story (engine/story/) ----
const PEOPLE: StoryRole[] = ['friend', 'parent', 'sibling', 'rival'];
const did = (f: Facts39, ch: string) => !!f.g.story?.done.includes(ch);
const said = (f: Facts39, id: string) => !!f.g.story?.mem.some((m) => m.id === id);
const bond = (f: Facts39, who: StoryRole) => f.g.story?.bond[who] ?? 0;
const sw = (f: Facts39, k: string) => f.g.story?.f[k];
/** The friend's or the rival's season lines (story/pals.ts writes them into mp.friends). */
const linesOf = (f: Facts39, id: 'story-friend' | 'story-rival') => f.g.mp?.friends?.find((x) => x.id === id)?.seasons ?? [];
/** NBA seasons he finished rated above his rival (who starts each season a step ahead of him). */
const aheadOfRival = (f: Facts39) => {
  const his = linesOf(f, 'story-rival');
  return f.nba.filter((h) => his.some((x) => x.year === h.year && x.lv === 'NBA' && Math.round(h.ovrEnd) > x.ovr)).length;
};
/** An NBA title with the friend from the driveway on his team, or on its bench. */
const ringWithFriend = (f: Facts39) => {
  const his = linesOf(f, 'story-friend');
  return championships(f.g).some((c) => c.nba && his.some((x) => x.year === c.year && (x.lv === 'NBA' || x.lv === 'COACH') && x.team === c.teamName));
};

// ---- the Floor (career/live.ts floorFinish) ----
const fl = (f: Facts39, k: string) => f.g.flags[k] ?? 0;

// ---- the award races and the playoffs ----
const rankIn = (h: SeasonRecord, award: string) => h.races?.find((r) => r.award === award)?.userRank ?? null;
const lostIn = (f: Facts39, re: RegExp) => f.nba.some((h) => re.test(h.result));

export const ACHIEVEMENTS_39: Ach39[] = [
  // ---- story mode (round 38): the chapters ----
  A('sm-done', 'Happily Ever After', 'bench', 'Play a story mode career to its end.', (f) => f.retired && !!f.g.story),
  A('sm-named', 'Casting Call', 'bench', 'Name your friend, your parent, your sibling and your rival yourself.', (f) => PEOPLE.every((w) => f.g.story?.named.includes(w))),
  A('sm-ch15', 'Chapter and Verse', 'bench', `See ${R39_MARKS.chapters[0]} chapters of your story in one career.`, (f) => (f.g.story?.done.length ?? 0) >= R39_MARKS.chapters[0]),
  A('sm-ch18', 'Page Turner', 'starter', `See ${R39_MARKS.chapters[1]} chapters of your story in one career.`, (f) => (f.g.story?.done.length ?? 0) >= R39_MARKS.chapters[1]),
  // ---- story mode: the bonds ----
  A('sm-friend3', 'Thick as Thieves', 'bench', 'Bring your bond with your friend from the driveway as warm as it goes.', (f) => bond(f, 'friend') >= 3),
  A('sm-parent3', 'Family Ties', 'bench', 'Bring your bond with your parent as warm as it goes.', (f) => bond(f, 'parent') >= 3),
  A('sm-sibling3', 'Sibling Revelry', 'rotation', 'Bring your bond with your younger sibling as warm as it goes.', (f) => bond(f, 'sibling') >= 3),
  A('sm-rival3', 'Kindred Spirits', 'rotation', 'Bring your bond with your rival as warm as it goes.', (f) => bond(f, 'rival') >= 3),
  A('sm-full', 'Full House', 'allstar', 'Have your friend, your parent, your sibling and your rival all as close as can be at once.', (f) => PEOPLE.every((w) => bond(f, w) >= 3)),
  A('sm-cold', 'Cold Shoulder', 'starter', 'Let a bond in your story go as cold as it can.', (f) => Object.values(f.g.story?.bond ?? {}).some((v) => (v ?? 0) <= -3)),
  // ---- story mode: where the friend and the rival end up ----
  A('sm-star', 'Second Banana', 'starter', 'Watch your friend from the driveway become better than you.', (f) => did(f, 'f-mvp')),
  A('sm-coach', 'In Your Corner', 'rotation', 'Have your friend from the driveway join your NBA bench as an assistant.', (f) => sw(f, 'friendCoach') === 1),
  A('sm-join', 'Same Street, Same Team', 'rotation', 'Bring your friend from the driveway to your NBA team.', (f) => sw(f, 'friendJoined') === 1),
  A('sm-rivaljoin', 'Keep Your Enemies Closer', 'bench', 'Have your rival join your NBA team.', (f) => sw(f, 'rivalJoined') === 1),
  A('sm-ahead', 'One Step Ahead', 'starter', 'Finish an NBA season rated above your rival.', (f) => aheadOfRival(f) >= 1),
  A('sm-ring', 'Driveway Dynasty', 'starter', 'Win an NBA title with your friend from the driveway on your team or on its bench.', ringWithFriend),
  A('sm-hatchet', 'Bury the Hatchet', 'rotation', 'Make peace with your rival after the hit that hurt your friend.', (f) => did(f, 't-apology') && !sw(f, 'feud')),
  A('sm-keys', 'Keys on a Ribbon', 'starter', 'Keep the promise you made on the ride home: buy your parent a house.', (f) => said(f, 'p-ride-promise') && said(f, 'p-house-house')),
  A('sm-ball', 'Higher Than the Hoop', 'allstar', 'Tell your friend the old driveway ball belongs in the rafters.', (f) => sw(f, 'rafterBall') === 1),
  // ---- the Floor (round 39): the last six minutes, played ----
  A('flr-1', 'Floor Plan', 'bench', 'Play the last six minutes of a game on the Floor yourself.', (f) => fl(f, 'floorPlayed') >= 1),
  A('flr-sim', 'Phone It In', 'bench', 'Let the game play the last six minutes of a game on the Floor for you.', (f) => fl(f, 'floor') > fl(f, 'floorPlayed')),
  A('flr-win1', 'Floor It', 'rotation', 'Win a game on the Floor, playing it yourself.', (f) => fl(f, 'floorWon') >= 1),
  A('flr-win3', 'Three on the Floor', 'allstar', 'Win three games on the Floor in one career, playing them yourself.', (f) => fl(f, 'floorWon') >= 3),
  A('flr-win10', 'Floor General', 'hof', 'Win ten games on the Floor in one career, playing them yourself.', (f) => fl(f, 'floorWon') >= 10),
  A('flr-back', 'Picked Up Off the Floor', 'allstar', 'Win on the Floor after trailing by ten or more.', (f) => fl(f, 'floorBack') >= 1),
  A('flr-winner', 'Dagger', 'allstar', 'Win on the Floor with your own go-ahead basket in the last five seconds.', (f) => fl(f, 'floorWinner') >= 1),
  A('flr-stop', 'Get Off My Floor', 'allstar', 'Win on the Floor with your own block in the last ten seconds.', (f) => fl(f, 'floorStop') >= 1),
  A('flr-pts10', 'Six-Minute Man', 'starter', 'Score 10 points in the six minutes of a game on the Floor.', (f) => fl(f, 'floorPts') >= 10),
  A('flr-pts15', 'Microwave', 'allstar', 'Score 15 points in the six minutes of a game on the Floor.', (f) => fl(f, 'floorPts') >= 15),
  A('flr-pts20', 'Floored', 'hof', 'Score 20 points in the six minutes of a game on the Floor.', (f) => fl(f, 'floorPts') >= 20),
  A('flr-g7', 'Seventh Heaven', 'allstar', 'Win a game seven on the Floor, playing it yourself.', (f) => fl(f, 'floorG7') >= 1),
  A('flr-ring', 'Floor to Ceiling', 'hof', 'Win game seven of the NBA Finals on the Floor, playing it yourself.', (f) => !!fl(f, 'floorRing')),
  // ---- the languages (round 40) and the airport (round 39), kept on this device ----
  A('ln-1', 'Lost in Translation', 'bench', 'Finish a career with the game in a language other than English.', (f) => !!f.t.langs?.some((l) => l !== 'en')),
  A('ln-2', 'Bilingual', 'rotation', 'Finish careers with the game in two languages.', (f) => (f.t.langs?.length ?? 0) >= 2),
  A('ln-3', 'Polyglot', 'starter', 'Finish careers with the game in three languages.', (f) => (f.t.langs?.length ?? 0) >= 3),
  A('ln-6', 'Tower of Babel', 'allstar', 'Finish careers with the game in every one of its languages.', (f) => (f.t.langs?.length ?? 0) >= LANG_COUNT),
  A('ap-1', 'Wheels Up', 'bench', 'Take the flight from the road map’s airport back to the main land.', (f) => (f.t.flights ?? 0) >= R39_MARKS.flights[0]),
  A('ap-10', 'Jet Lag', 'rotation', 'Fly back to the main land from the airport ten times.', (f) => (f.t.flights ?? 0) >= R39_MARKS.flights[1]),
  // ---- the award races and the playoffs ----
  A('gn-mvp2', 'Runner-Up Speech', 'allstar', 'Finish second in the MVP voting.', (f) => f.nba.some((h) => rankIn(h, 'MVP') === 2)),
  A('gn-mvp5x5', 'In the Conversation', 'allstar', 'Finish in the top five of the MVP voting five times.', (f) => f.nba.filter((h) => (rankIn(h, 'MVP') ?? 99) <= 5).length >= 5),
  A('gn-roy2', 'Rookie of the Runner-Up', 'allstar', 'Finish second in the Rookie of the Year voting.', (f) => f.nba.some((h) => rankIn(h, 'Rookie of the Year') === 2)),
  A('gn-dpoy2', 'Almost Impenetrable', 'starter', 'Finish second in the Defensive Player of the Year voting.', (f) => f.nba.some((h) => rankIn(h, 'DPOY') === 2)),
  A('gn-exits', 'Every Exit on the Highway', 'rotation', 'Lose in the first round, the second round, the conference finals and the NBA Finals.', (f) =>
    [/Lost in the first round/i, /Lost in the conference semifinals/i, /Lost in the conference finals/i, /Lost in the NBA Finals/i].every((re) => lostIn(f, re)),
  ),
  A('gn-tourist', 'Postseason Tourist', 'rotation', 'Make the NBA playoffs with four different teams.', (f) => new Set(f.nba.filter((h) => /^Lost in the|Champion/.test(h.result)).map((h) => h.teamId)).size >= 4),
  A('gn-sixthring', 'Bench Mob', 'allstar', 'Win an NBA title as the sixth man.', (f) => f.nba.some((h) => /Champion/.test(h.result) && h.role === 'sixth')),
];

/** The ones that only read the totals kept across careers (checked with no career open). */
export const R39_TOTALS_ONLY = ['ln-1', 'ln-2', 'ln-3', 'ln-6', 'ap-1', 'ap-10'];
