// Round 37 (owner, round 32: "we might run out of them quickly. add more"). The round turned a
// career's tabs into a pixel street (the town: the gym, the arena, his home, the agent's office, the
// hall, the arcade, on his hometown's street, a campus, a city or a city abroad) and gave every NBA
// arena its own build beside a landmark of its city. Round 36 before it made aging diverge, raised
// the bar for All-Star and MVP, and added two rare career changers (the next step and the
// career-altering injury). So this batch is about the street (walking it, the doors, what his
// career puts on it), the landmarks seen across careers, the career changers, the long careers the
// new aging allows, the higher bar, and the round's turning points and shop things.
//
// The street is drawn in the UI (ui/town.ts); what it shows of a career is worked out in
// engine/career/street.ts, so the checks here read it the way the street draws it. The walking (the
// doors, the agent's office, the distance, the four looks, the landmarks) is counted on this device
// by ui/achievements.ts (recordPlace, recordWalk, recordStreet) from components/Town.tsx, and kept
// in the totals. Each career mark was measured over 150 Regular guy careers of the smart player
// (casual mini-games) before its tier was set (DECISIONS.md, round 37). Same rules as the rest of the
// book: cosmetic, pun names, conditions hidden.

import type { GameState, SeasonRecord } from './types';
import type { AchTier, CareerTotals } from './achievements';
import { championships, raftersTeams } from './awards/legacy';
import { CAR_IDS, HOUSE_BANK, carOut, hoopHome, proStreet, statueUp } from './career/street';

/** The places on a pro's street (ui/town.ts PlaceKind) and the four looks of the street (StreetLook). */
export const TOWN_PLACES = ['gym', 'arena', 'house', 'agent', 'hall', 'arcade'] as const;
export const TOWN_LOOKS = ['hometown', 'campus', 'city', 'abroad'] as const;

/** The marks the town's achievements count to (ui/achievements.ts tells the book when one is passed). */
export const TOWN_MARKS = {
  doors: [1, 100, 1000],
  agent: [1, 50],
  /** feet, at his size: the walker on the street is eleven art pixels tall */
  mile: 5280,
  marathon: 26.2,
  landmarks: [5, 10, 30],
};

/** The street of the career walked last on this device: the places gone into, the looks of it seen. */
export interface TownRun {
  run: string;
  places: string[];
  looks: string[];
}

/** What these checks read (the book's facts, in part). */
interface Facts37 {
  g: GameState;
  t: CareerTotals;
  nba: SeasonRecord[];
  retired: boolean;
  age: number;
  ovr: number;
}

interface Ach37 {
  id: string;
  name: string;
  tier: AchTier;
  how: string;
  test: (f: Facts37) => boolean;
}

const A = (id: string, name: string, tier: AchTier, how: string, test: (f: Facts37) => boolean): Ach37 => ({ id, name, tier, how, test });

const has = (f: Facts37, id: string) => f.g.purchases.includes(id);
const logged = (f: Facts37, re: RegExp) => f.g.log.some((e) => e.kind === 'event' && re.test(e.text));
const per = (h: SeasonRecord, k: 'pts') => (h.line.gp ? h.line[k] / h.line.gp : 0);
/** His NBA honours of one kind, each with his age that season. */
const nbaAwards = (g: GameState, key: string) =>
  g.awards.filter((a) => a.key === key && a.level === 'NBA').map((a) => ({ year: a.year, age: g.history.find((h) => h.year === a.year && h.level === 'NBA')?.age ?? 0 }));
const years = (g: GameState, key: string) => [...new Set(nbaAwards(g, key).map((a) => a.year))].sort((a, b) => a - b);
/** The longest run of seasons in a row with an honour. */
function streak(ys: number[]): number {
  let best = 0;
  let run = 0;
  ys.forEach((y, i) => {
    run = i > 0 && y === ys[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}
/** The most NBA titles he won with one team: the banners on one arena. */
const mostWithOne = (g: GameState) => {
  const by = new Map<string, number>();
  for (const c of championships(g)) if (c.nba) by.set(c.teamName, (by.get(c.teamName) ?? 0) + 1);
  return Math.max(0, ...by.values());
};
/** The season he reached his best OVR (the first, when two tie). */
const peakSeason = (g: GameState) => g.history.reduce<SeasonRecord | null>((best, h) => (!best || h.ovrEnd > best.ovrEnd ? h : best), null);
const town = (t: CareerTotals) => t.townRun;
const allIn = (got: string[] | undefined, want: readonly string[]) => want.every((k) => got?.includes(k));

export const ACHIEVEMENTS_37: Ach37[] = [
  // ---- the town: walking the street, kept on this device ----
  A('tw-door1', 'Come On In', 'bench', 'Walk into a place on your street.', (f) => (f.t.doors ?? 0) >= TOWN_MARKS.doors[0]),
  A('tw-door100', 'Foot in the Door', 'rotation', 'Walk into the places on your streets 100 times.', (f) => (f.t.doors ?? 0) >= TOWN_MARKS.doors[1]),
  A('tw-door1000', 'Wear Out the Welcome Mat', 'starter', 'Walk into the places on your streets 1,000 times.', (f) => (f.t.doors ?? 0) >= TOWN_MARKS.doors[2]),
  A('tw-every', 'Man About Town', 'rotation', 'Walk into every place on the street in one career, the agent’s office too.', (f) => allIn(town(f.t)?.places, TOWN_PLACES)),
  A('tw-agent1', 'Ten Percent', 'bench', 'Walk into your agent’s office.', (f) => (f.t.agentDoors ?? 0) >= TOWN_MARKS.agent[0]),
  A('tw-agent50', 'Show Me the Money', 'starter', 'Walk into your agent’s office 50 times.', (f) => (f.t.agentDoors ?? 0) >= TOWN_MARKS.agent[1]),
  A('tw-looks4', 'Small Town, Big City', 'starter', 'Walk your hometown, a campus, a city abroad and a city at home in one career.', (f) => allIn(town(f.t)?.looks, TOWN_LOOKS)),
  A('tw-mile', 'Walk a Mile in His Shoes', 'rotation', 'Walk a mile up and down your streets.', (f) => (f.t.walked ?? 0) >= TOWN_MARKS.mile),
  A('tw-marathon', 'Marathon Man', 'allstar', 'Walk a marathon up and down your streets.', (f) => (f.t.walked ?? 0) >= TOWN_MARKS.mile * TOWN_MARKS.marathon),
  // ---- the arenas: the landmarks seen beside them, across careers ----
  A('ar-mark5', 'Postcard Collector', 'rotation', 'See five cities’ landmarks beside your arenas.', (f) => (f.t.marks?.length ?? 0) >= TOWN_MARKS.landmarks[0]),
  A('ar-mark10', 'Wish You Were Here', 'starter', 'See ten cities’ landmarks beside your arenas.', (f) => (f.t.marks?.length ?? 0) >= TOWN_MARKS.landmarks[1]),
  A('ar-mark30', 'Coast to Coast', 'hof', 'See every NBA city’s landmark beside its arena.', (f) => (f.t.marks?.length ?? 0) >= TOWN_MARKS.landmarks[2]),
  // ---- what the career puts on the street ----
  A('tw-house', 'Home Sweet Home', 'bench', 'Move out of the apartment into a house of your own.', (f) => proStreet(f.g) && f.g.player.bank >= HOUSE_BANK.house),
  A('tw-mansion', 'Lord of the Manor', 'rotation', 'Live in a mansion on your street.', (f) => proStreet(f.g) && f.g.player.bank >= HOUSE_BANK.mansion),
  A('tw-curb', 'Curb Appeal', 'starter', 'Park your car at the kerb, with a hoop beside the house.', (f) => carOut(f.g) && hoopHome(f.g)),
  A('tw-statue', 'Statue of Limitations', 'allstar', 'Stand in gold outside the arena of the team you finished with.', (f) => statueUp(f.g)),
  A('tw-banners', 'Running Out of Rafters', 'allstar', 'Hang five title banners in one arena.', (f) => mostWithOne(f.g) >= 5),
  // ---- the career changers (round 36) ----
  A('cx-next', 'Second Act', 'hof', 'Take the next step, late in your career.', (f) => !!f.g.flags.nextStep),
  A('cx-next-as', 'Late to the Party', 'hof', 'Make an All-Star team after taking the next step.', (f) => !!f.g.flags.nextStep && years(f.g, 'ALLSTAR').some((y) => y > f.g.flags.nextStep)),
  A('cx-knee', 'Six Million Dollar Man', 'hof', 'Make an All-Star team after the injury that changes everything.', (f) => !!f.g.flags.careerInjury && years(f.g, 'ALLSTAR').some((y) => y > f.g.flags.careerInjury)),
  A('cx-knee-back', 'Back in the Saddle', 'hof', 'Play 70 games of an NBA season after the injury that changes everything.', (f) => !!f.g.flags.careerInjury && f.nba.some((h) => h.year > f.g.flags.careerInjury && h.line.gp >= 70)),
  A('cx-knee-rafters', 'Scar Tissue', 'hof', 'Come back from the injury that changes everything, and still see your number in the rafters.', (f) => f.retired && !!f.g.flags.careerInjury && raftersTeams(f.g).length > 0),
  A('cx-both', 'What Goes Up', 'hof', 'Take the next step and suffer the injury that changes everything, in one career.', (f) => !!f.g.flags.nextStep && !!f.g.flags.careerInjury),
  // ---- the long career that aging now allows ----
  A('vt-as38', 'Gray Matters', 'starter', 'Make an All-Star team at 38 or older.', (f) => nbaAwards(f.g, 'ALLSTAR').some((a) => a.age >= 38)),
  A('vt-ovr90', 'Grand Cru', 'allstar', 'Be OVR 90 at 37 or older.', (f) => (f.age >= 37 && f.ovr >= 90) || f.g.history.some((h) => h.age >= 37 && Math.round(h.ovrEnd) >= 90)),
  A('vt-20at40', 'Twenty at Forty', 'hof', 'Average 20 points in an NBA season at 40 or older.', (f) => f.nba.some((h) => h.age >= 40 && h.line.gp >= 20 && per(h, 'pts') >= 20)),
  A('vt-start42', 'Elder Statesman', 'hof', 'Start for an NBA team at 42 or older.', (f) => f.nba.some((h) => h.age >= 42 && (h.role === 'starter' || h.role === 'key'))),
  A('vt-mvp37', 'Most Veteran Player', 'hof', 'Win MVP at 37 or older.', (f) => nbaAwards(f.g, 'MVP').some((a) => a.age >= 37)),
  A('vt-span15', 'Timeless', 'starter', 'Make All-Star teams fifteen seasons apart.', (f) => {
    const ys = years(f.g, 'ALLSTAR');
    return ys.length > 1 && ys[ys.length - 1] - ys[0] >= 15;
  }),
  A('vt-latepeak', 'Best Is Yet to Come', 'starter', 'Reach your best OVR at 33 or older.', (f) => (peakSeason(f.g)?.age ?? 0) >= 33),
  // ---- the higher bar (round 36) ----
  A('bar-mvp3row', 'Can’t Stop, Won’t Stop', 'hof', 'Win MVP three seasons in a row.', (f) => streak(years(f.g, 'MVP')) >= 3),
  A('bar-as10row', 'A Standing Invitation', 'starter', 'Make the All-Star team ten seasons in a row.', (f) => streak(years(f.g, 'ALLSTAR')) >= 10),
  // ---- the round's turning points and shop things ----
  A('tp-street', 'Easy Street', 'starter', 'Have a street named after you.', (f) => !!f.g.flags.streetName),
  A('tp-mural', 'Wall of Fame', 'starter', 'See yourself three stories tall on a wall.', (f) => !!f.g.flags.mural),
  A('tp-gym', 'Name Over the Door', 'allstar', 'Have the gym where you learned the game take your name.', (f) => !!f.g.flags.gymNamed),
  A('tp-rights', 'Sign of the Times', 'starter', 'Stand under your arena’s new name for the company that bought it.', (f) => logged(f, /^Stood under the new name on the /)),
  A('tp-loyal', 'Loyalty Program', 'starter', 'Turn away an agent who comes poaching.', (f) => logged(f, /^Turned away an agent who came poaching/)),
  A('tp-move', 'Yard Work', 'allstar', 'Move into a house that comes with a hoop.', (f) => !!f.g.flags.yardHoop),
  A('tp-midnight', 'Midnight Madness', 'starter', 'Lose a game of HORSE at midnight, on your own court.', (f) => logged(f, /^Lost a midnight game of HORSE/)),
  A('tp-knee', 'Knee-Jerk Reaction', 'hof', 'Tell the truth about the knee when they first ask.', (f) => logged(f, /^Told the truth about the knee/)),
  A('tp-summer', 'Summer Job', 'allstar', 'Spend a late summer rebuilding your game from the floor up.', (f) => !!f.g.flags.summerWork),
  A('own-prints', 'Print Run', 'bench', 'Hang a print of every arena in the league.', (f) => has(f, 'arena-prints')),
  A('own-bike', 'Two Wheels Good', 'rotation', 'Own a car, and ride a bike across town anyway.', (f) => has(f, 'city-bike') && CAR_IDS.some((id) => has(f, id))),
  A('own-brace', 'Brace Yourself', 'bench', 'Wear a knee brace made for your knee.', (f) => has(f, 'knee-brace')),
  A('own-clinic', 'Forever Young', 'allstar', 'Spend your summers at a longevity clinic, and play at 40.', (f) => has(f, 'longevity-clinic') && f.g.history.some((h) => h.age >= 40 && h.line.gp > 0)),
];

/** The ones that only read the totals kept across careers (checked with no career open). */
export const R37_TOTALS_ONLY = ['tw-door1', 'tw-door100', 'tw-door1000', 'tw-every', 'tw-agent1', 'tw-agent50', 'tw-looks4', 'tw-mile', 'tw-marathon', 'ar-mark5', 'ar-mark10', 'ar-mark30'];
