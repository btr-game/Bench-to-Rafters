// Every function in the game, one card each. A card stages the store (a game, a tab, a page, a
// mini-game, an overlay) so that clicking it opens that function with everything unlocked.

import { useStore, type Tab } from '../store';
import type { GameState, Moment } from '../engine/types';
import { ACHIEVEMENTS, ACH_TIERS } from '../engine/achievements';
import { careerRecord, type CareerRecord } from '../engine/career/record';
import { canSetStyle } from '../engine/career/identity';
import { canRecruit, startingFive } from '../engine/career/recruit';
import { growBonds } from '../engine/career/duo';
import { setFast, setSim } from '../engine/fast';
import { awardNickname } from '../engine/career/nickname';
import { hireStaff } from '../engine/career/staff';
import { applyItem } from '../engine/economy/shop';
import { SHOP_ITEMS } from '../content/shop';
import { newSlotId, writeSlot } from '../ui/saves';
import { todayKey } from '../engine/mini/daily';
import { ATTRS } from '../engine/balance';
import { attachChild, lockCard, logCards, logCareer } from '../ui/careerLog';
import { advance as step, choose as pickChoice, prompt as nextPrompt } from '../engine/flow';
import { offerEvent } from '../engine/events/resolver';
import { announceFarewell, canFarewell, isFarewellSeason } from '../engine/career/farewell';
import { recordWatch } from '../engine/career/records';
import { canAskRole } from '../engine/career/coach';
import { childLegacy } from '../engine/nextGen';
import { runOf } from '../ui/achievements';
import { resetTour } from '../ui/components/GuideTour';
import { decision, moment, onlyMoment, play, type PlayOpts } from './stage';
import { isFinal, type LiveRequest } from '../engine/career/live';
import { CamLab } from './CamLab';
import { LEVEL_IDS, type Level } from '../engine/levels';
import { ROAD_MINIS, type Road } from '../ui/road';
import type { ChosenLook } from '../content/looks';
import { LoadingLab } from './LoadingLab';

export type Group = 'Start' | 'Tutorial' | 'Career hub' | 'Decisions' | 'Big moments' | 'Modes' | 'Mini-games' | 'Records & community';
export const GROUPS: { key: Group; color: string; icon: string }[] = [
  { key: 'Start', color: '#E8590C', icon: 'door' },
  { key: 'Tutorial', color: '#862E9C', icon: 'map' },
  { key: 'Career hub', color: '#1C7ED6', icon: 'chart' },
  { key: 'Decisions', color: '#2B8A3E', icon: 'checklist' },
  { key: 'Big moments', color: '#C92A2A', icon: 'laurel' },
  { key: 'Modes', color: '#7048E8', icon: 'dial' },
  { key: 'Mini-games', color: '#F08C00', icon: 'controller' },
  { key: 'Records & community', color: '#0B7285', icon: 'crowd' },
];

export interface DevCard {
  id: string;
  title: string;
  group: Group;
  icon: string;
  blurb: string;
  /** Stages the store; returns false when no career reached the state. */
  open: () => boolean | void;
  /** A control to press once the page is up (a menu, a sheet, a page tab), or several in turn. */
  press?: string | string[];
  /** A page of the deck's own that shows instead of the game (the action cam lab). */
  page?: () => JSX.Element;
}

// ---------- fixtures, played once and reused ----------

const cache = new Map<string, GameState | null>();
function fixture(key: string, make: () => GameState | null): GameState | null {
  if (!cache.has(key)) cache.set(key, make());
  const g = cache.get(key);
  return g ? structuredClone(g) : null;
}

const nbaStar = () => fixture('nba', () => play((s, p) => s.stage === 'NBA' && s.nbaGames > 160 && p.type === 'decision' && p.decision.kind === 'plan', { mode: 'stars' }));
const hsStart = (mode: PlayOpts['mode'] = 'standard') => fixture(`hs-${mode}`, () => play((_, p) => p.type === 'decision' && p.decision.kind === 'plan', { mode }));
const retired = (seed: number) => fixture(`retired-${seed}`, () => play((s) => s.step === 'retired', { mode: 'stars', seed, fast: true }));
const at = (key: string, until: Parameters<typeof play>[0], o: PlayOpts = {}) => fixture(key, () => play(until, { mode: 'stars', ...o }));

/** An NBA star with round 25's systems on: a nickname and a brand, staff, accessories and things
 * to visit. */
function loaded(): GameState | null {
  const g = nbaStar();
  if (!g) return null;
  g.player.bank += 500;
  g.player.rep = Math.max(g.player.rep, 90);
  if (!g.player.nickname) awardNickname(g, '#1C7ED6', 'Team');
  for (const role of ['chef', 'trainer', 'psychologist', 'analyst', 'sleep'] as const) hireStaff(g, role);
  for (const id of ['car', 'jet', 'mansion', 'yacht']) {
    const it = SHOP_ITEMS.find((x) => x.id === id);
    if (it && !g.purchases.includes(id)) applyItem(g, it);
  }
  for (const it of SHOP_ITEMS.filter((x) => x.wear).filter((_, i) => i % 5 === 0)) applyItem(g, it);
  g.player.brand ??= { brand: 'Courtline', color: '#1D3557', kind: 'line', years: 6, left: 4, perYear: 3, since: g.year - 2, earned: 22, shoe: 2 };
  return g;
}
const PRO = ['NBA', 'EU', 'INT', 'GL'];

/** Puts a game on screen, with nothing else in the way (a card that wants a moment keeps it). */
function show(g: GameState | null, tab: Tab = 'home', extra: Partial<ReturnType<typeof useStore.getState>> = {}, keepMoments = false): boolean {
  if (!g) return false;
  if (!keepMoments) g.moments = [];
  useStore.setState({ game: g, tab, page: null, mini: null, transition: null, ...extra });
  return true;
}
const withMoment = (key: string, ok: (m: Moment) => boolean, o: PlayOpts = {}) => {
  const g = at(key, moment(ok), o);
  return show(g && onlyMoment(g, ok), 'home', {}, true);
};
const atDecision = (kind: string, o: PlayOpts = {}) => show(at(`d-${kind}-${o.mode ?? 'stars'}`, decision(kind), o));
/** A live game's request is at this stage. */
const liveAt = (stage: LiveRequest['stage']) => (_: GameState, p: Parameters<Parameters<typeof play>[0]>[1]) => p.type === 'decision' && p.decision.kind === 'live' && (p.decision.data?.req as LiveRequest | undefined)?.stage === stage;
/** Round 28: sims every series to the final, plays the final's games, the steady call each quarter. */
const toFinal: PlayOpts['pick'] = (_, d) => {
  if (d.kind !== 'live') return undefined;
  const r = d.data?.req as LiveRequest;
  if (r.stage === 'game') return isFinal(r.round) ? 'play' : d.choices.some((c) => c.id === 'series') ? 'series' : 'sim';
  return r.stage === 'quarter' ? 'steady' : r.stage === 'clutch' ? 'pull@good' : d.choices[0].id;
};
/** A career played as Rough Road (round 26): Reality, master mode, nothing simplified. */
const oath = (g: GameState | null) => {
  if (g) Object.assign(g.flags, { oath: 1, fast: 0, sim: 0 }), (g.mode = 'reality');
  return show(g, 'home', { master: true, simple: false });
};

// ---------- records, the log and the community, seeded on this page only ----------

let recs: CareerRecord[] | null = null;
function records(): CareerRecord[] {
  if (!recs) recs = [3, 7, 11, 19].map((n) => retired(n)).filter((g): g is GameState => !!g).map((g) => careerRecord(g));
  return recs;
}

function seedCommunity(): void {
  const rs = records();
  if (!rs.length) return;
  const day = todayKey();
  const vary = (r: CareerRecord, i: number, patch: Partial<CareerRecord>): CareerRecord => ({ ...r, id: `${r.id}-${i}`, name: `${r.name.split(' ')[0]} ${['Okafor', 'Lindqvist', 'Moreau', 'Tanaka', 'Silva', 'Brooks'][i % 6]}`, ...patch });
  const scores = rs.flatMap((r, i) =>
    (['standard', 'reality', 'stars'] as const).map((mode, k) => {
      const rec = vary(r, i * 3 + k, { mode, legacy: Math.max(10, r.legacy - k * 30 + i * 9) });
      return { id: `s${i}${k}`, mode, day: k === 1 ? '2026-01-01' : day, score: rec.legacy + Math.max(0, Math.round(rec.peak) - 60), rec, mine: i === 0 };
    }),
  );
  // the challenge boards: each career again as a Rough Road one and as a Comet
  rs.forEach((r, i) => {
    const rough = vary(r, 60 + i, { mode: 'reality', oath: true, legacy: Math.max(10, r.legacy - 20 + i * 7) });
    const comet = vary(r, 70 + i, { mode: 'stars', comet: true, legacy: Math.max(10, r.legacy - 10 + i * 5) });
    scores.push({ id: `r${i}`, mode: 'reality', day, score: rough.legacy + Math.max(0, Math.round(rough.peak) - 60), rec: rough, mine: i === 1 });
    scores.push({ id: `c${i}`, mode: 'stars', day, score: comet.legacy + Math.max(0, Math.round(comet.peak) - 60), rec: comet, mine: i === 1 });
  });
  // round 27: six in the hall, so the benches show a full row and the next one opening
  for (let i = 0; i < 6; i++) {
    const legend = vary(rs[i % rs.length], 40 + i, { mode: 'reality', peak: 99, legacy: 260 - i * 7, pos: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5] });
    scores.push({ id: `hall${i}`, mode: 'reality', day, score: 299 - i, rec: legend, mine: false });
  }
  const statues = rs.slice(0, 3).map((r, i) => ({ id: `st${i}`, rec: vary(r, 50 + i, { mode: 'standard', legacy: i === 0 ? 240 : 160 + i * 20 }), metal: i === 0 ? 'gold' : 'bronze', paid: i === 2, respects: 12 - i * 4 }));
  const feed = rs.map((r, i) => ({ t: `${r.name} retired with ${Math.round(r.legacy)} legacy points.`, at: Date.now() - (i + 1) * 600e3 }));
  try {
    localStorage.setItem('btr-community-local', JSON.stringify({ scores, statues, feedback: [], feed }));
  } catch {
    // storage blocked: the community cards open empty
  }
}

function seedLog(locks = false): void {
  // round 32: the newest two show the card's challenge badges and achievement medals
  const tiers = ['hof', 'allstar', 'allstar', 'starter', 'starter', 'starter', 'rotation', 'rotation', 'bench', 'bench'] as const;
  const ach = (n: number) => ({ n, top: ACHIEVEMENTS.filter((a) => a.tier === 'hof' || a.tier === 'allstar').slice(0, 1).concat(ACHIEVEMENTS.slice(40, 49)).map((a, i) => ({ name: a.name, tier: tiers[i] })) });
  records().forEach((r, i, all) => logCareer(i === all.length - 1 ? { ...r, comet: true, mode: 'stars', ach: ach(41) } : i === all.length - 2 ? { ...r, oath: true, mode: 'reality', ach: ach(27) } : r));
  // round 32: one father with his son's career on his card
  const dad = records()[1];
  if (dad) attachChild(dad.id, SON(dad.name));
  // round 29: lock the oldest two, so the page shows both kinds
  if (locks) for (const c of logCards().slice(-2)) lockCard(c.id, true);
}

/** Round 32: a son's career, for the cards that show one. */
const SON = (father: string) => childLegacy({ ...records()[0], name: `Tari ${father.split(' ').slice(-1)[0]}`, peak: 81, honours: [{ text: '2× All-Star', color: '#E2B33C' }], nbaSeasons: 11, nbaPoints: 14210, mvps: 0, titles: 1, allStars: 2, legacy: 64 });

/** Plays a staged career on (first choices, the season advancing) until `until` holds. */
function forward(g: GameState | null, until: (s: GameState) => boolean, max = 3000): GameState | null {
  if (!g) return null;
  for (let k = 0; k < max && !until(g); k++) {
    const p = nextPrompt(g);
    if (p.type === 'retired') return null;
    if (p.type === 'decision') pickChoice(g, p.decision.choices.find((c) => !c.disabled)!.id);
    else step(g);
  }
  return until(g) ? g : null;
}

/** Every achievement earned (so none pop up while you look around), or none. */
export function setAchievements(all: boolean): void {
  const got = all ? Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, { at: new Date().toISOString(), who: 'Dev deck' }])) : {};
  try {
    localStorage.setItem('btr-achv-v1', JSON.stringify({ got, totals: {} }));
  } catch {
    // nothing to keep
  }
}

// ---------- round 33: the tutorial's pages, on a road of the deck's own (never saved) ----------

const LOOK: ChosenLook = { skin: 3, hair: 'k', style: 'flattop', face: 'none' };
const ALL_C = Object.fromEntries(ROAD_MINIS.map((m) => [m, 'C'])) as Road['minis'];
/** The tutorial on screen, the road this far: its pages alone, or with their lessons. */
function onRoad(passed: Level[], extra: Partial<Road> = {}, preview: Road['preview'] = 'page', more: Partial<ReturnType<typeof useStore.getState>> = {}): boolean {
  // the second level passed short of its goal, so the map shows both marks
  const road: Road = { passed: Object.fromEntries(passed.map((l, i) => [l, { star: i !== 1 }])), minis: {}, look: LOOK, ...extra, preview };
  useStore.setState({ road, ...more });
  return true;
}
const levelRun = (key: string, level: Level, until: Parameters<typeof play>[0], o: PlayOpts = {}) => fixture(`lv-${key}`, () => play(until, { level, ...o }));
const ended = (star: boolean) => (s: GameState) => s.step === 'retired' && s.flags.levelEnd === (star ? 2 : 1);

const TUTORIAL: DevCard[] = [
  { id: 'road-map', title: 'The road map', group: 'Tutorial', icon: 'map', blurb: 'The tutorial between levels: the pixel map with the car driving on to the next stop, the bucket list on a paper scroll, and the next level with what it adds.', open: () => onRoad(['beginner']) },
  { id: 'road-late', title: 'The road map, near its end', group: 'Tutorial', icon: 'map', blurb: 'All three levels passed (one short of the All-Star goal): the island of mini-games with the grades so far, and the closing tour waiting.', open: () => onRoad(LEVEL_IDS, { minis: { threes: 'A', dunk: 'C', street: 'C', lab: 'B' } }) },
  { id: 'road-free', title: 'The road map from the start page', group: 'Tutorial', icon: 'map', blurb: 'Once the full game is open, the Levels card brings the road back: every level to play again, kept nowhere.', open: () => onRoad(LEVEL_IDS, { minis: ALL_C, toured: 1, free: 1 }, 'page', { page: 'road' }) },
  { id: 'level-1', title: 'Level 1: Beginner', group: 'Tutorial', icon: 'lvl-HSV', blurb: 'The first page of every device: the school on the map, the goal (an NBA All-Star team), a name, a number, a position and an archetype; the rest is chosen for him.', open: () => onRoad([]) },
  { id: 'level-2', title: 'Level 2: Intermediate', group: 'Tutorial', icon: 'lvl-NCAA', blurb: 'The level’s start page: the college on the map, the icons for what the level adds, and the focus to pick.', open: () => onRoad(['beginner'], {}, 'page', { creating: 'intermediate' }) },
  { id: 'level-3', title: 'Level 3: Advanced', group: 'Tutorial', icon: 'lvl-NBA', blurb: 'The last level’s start page: the arena on the map, the country and the shooting hand as well.', open: () => onRoad(['beginner', 'intermediate'], {}, 'page', { creating: 'advanced' }) },
  { id: 'level-career', title: 'A beginner career', group: 'Tutorial', icon: 'lvl-HSV', blurb: 'A level career at its first call: Home and Player only, the level’s badge, fast break’s pace, two plans of its own.', open: () => show(levelRun('beg', 'beginner', decision('plan'))) },
  { id: 'level-nba', title: 'An intermediate career in the NBA', group: 'Tutorial', icon: 'lvl-NCAA', blurb: 'Intermediate with three tabs, its sim and fast break chips, and the first NBA season ahead.', open: () => show(levelRun('int', 'intermediate', (s, p) => p.type === 'decision' && p.decision.kind === 'plan' && s.stage === 'NBA')) },
  { id: 'level-shot', title: 'Beginner’s last shot', group: 'Tutorial', icon: 'shoot', blurb: 'Beginner’s one playoff moment: the game comes down to his shot, on the timing meter.', open: () => show(levelRun('shot', 'beginner', liveAt('clutch'), { live: true })) },
  { id: 'level-won', title: 'A level passed: the goal reached', group: 'Tutorial', icon: 'stars', blurb: 'The end of a level career that made an All-Star team: its numbers, and what the next level adds.', open: () => show(levelRun('won', 'beginner', ended(true))) },
  { id: 'level-missed', title: 'A level passed: so close', group: 'Tutorial', icon: 'morale', blurb: 'The end of a level career with no All-Star team: its own card and its own sad loop, and the road still goes on.', open: () => show(levelRun('missed', 'intermediate', ended(false), { tries: 30 })) },
  { id: 'island', title: 'The island of mini-games', group: 'Tutorial', icon: 'palm', blurb: 'Every mini-game once, a C or better in each: the mark to beat and the best grade so far on every card.', open: () => onRoad(LEVEL_IDS, { minis: { threes: 'B', dunk: 'C', lab: 'D' } }, 'page', { mini: 'hub' }) },
  { id: 'graduation', title: 'Graduation', group: 'Tutorial', icon: 'cap', blurb: 'The tutorial done: the diploma with the exit code, a copy button, and the way into the full game.', open: () => onRoad(LEVEL_IDS, { minis: ALL_C, toured: 1 }) },
  { id: 'lesson', title: 'A lesson on screen', group: 'Tutorial', icon: 'guide', blurb: 'The tutorial guide: the page shaded but for one control, the note beside it, Got it or Your turn, and the exit code for anyone who has it.', open: () => onRoad([], {}, 'lesson') },
  { id: 'closing-tour', title: 'The closing tour', group: 'Tutorial', icon: 'arena', blurb: 'After the levels: a star’s career, stop by stop, for every system no level has; the bar says which stop, Next stop goes on once its lessons are done.', open: () => (onRoad(LEVEL_IDS, { minis: ALL_C }, 'lesson'), useStore.getState().startClosing()) },
  { id: 'recommended', title: 'The full game, first look', group: 'Tutorial', icon: 'door', blurb: 'Just after graduation: the start page with Regular guy recommended and its own few lessons.', open: () => onRoad(LEVEL_IDS, { minis: ALL_C, toured: 1, free: 1 }, 'lesson', { recommend: true }) },
  { id: 'skip-door', title: 'The Skip button', group: 'Tutorial', icon: 'lock', blurb: 'Beside Share at the top of every tutorial page: the exit code (shown at graduation) opens the full game on this device for good.', open: () => onRoad(['beginner']), press: '[data-tour="skip-door"]' },
];

// ---------- the deck ----------

const MINI: DevCard[] = (
  [
    ['hub', 'Mini-game hub', 'controller', 'Every mini-game, all unlocked.'],
    ['office', 'Front Office', 'office', 'Coach or GM a franchise.'],
    ['threes', 'Three-point contest', 'range', 'Five racks, a money rack, a timing meter.'],
    ['dunk', 'Dunk contest', 'flame', 'Design dunks; each move once a contest.'],
    ['street', '3-on-3 streetball', 'post', 'One game to 11, action cam on timing shots.'],
    ['rhythm', 'Lockdown', 'lockdown', 'Rhythm defense: A blocks, S steals, new sets each run.'],
    ['lab', 'Built in a lab (mini-game)', 'lab', 'Spend credits on a prospect.'],
    ['legends', 'Legends showdown', 'laurel', 'A legends bracket with your player.'],
  ] as const
).map(([mini, title, icon, blurb]) => ({ id: `mini-${mini}`, title, group: 'Mini-games' as const, icon, blurb, open: () => void useStore.setState({ game: null, page: null, mini }) }));

export const CARDS: DevCard[] = [
  // start
  { id: 'start', title: 'Start page and player creation', group: 'Start', icon: 'person', blurb: 'Name, position, archetype, focus, country, difficulty.', open: () => void useStore.setState({ game: null, page: null, mini: null }) },
  { id: 'look', title: 'Your look', group: 'Start', icon: 'jersey', blurb: 'The identity step: skin, hair colour, hair and facial hair on the player, in a plain white or black jersey with his number, and the back of the jersey with his name.', open: () => void useStore.setState({ game: null, page: null, mini: null }), press: '[data-tour="create-next"]' },
  {
    id: 'saves',
    title: 'Ten save slots and career codes',
    group: 'Start',
    icon: 'disk',
    blurb: 'In the career log: every career on this device, newest first: continue, look back, copy its code, delete; paste a code to import. The start page keeps a Continue card for the latest.',
    open: () => {
      const g = loaded();
      if (!g) return false;
      void writeSlot(newSlotId(), g).then(() => useStore.setState({ game: null, page: 'log', mini: null }));
    },
  },
  { id: 'daily', title: 'Daily challenge', group: 'Start', icon: 'calendar', blurb: "Today's prospect, the same for everyone. Mini-games locked.", open: () => void (useStore.setState({ game: null, mini: null, page: null }), useStore.getState().startDaily()) },

  // career hub
  { id: 'home-hs', title: 'Home: high school', group: 'Career hub', icon: 'house', blurb: 'The first season, the first plan.', open: () => show(hsStart()) },
  { id: 'home-nba', title: 'Home: an NBA star', group: 'Career hub', icon: 'stars', blurb: 'Third NBA season, MVP race, duo, stories.', open: () => show(nbaStar()) },
  { id: 'season', title: 'Season tab', group: 'Career hub', icon: 'calendar', blurb: 'Season and league in one (round 29): team and form, standings beside team strength, the league leaders, his games, award voting, champions, the record book.', open: () => show(nbaStar(), 'season') },
  { id: 'player', title: 'Player tab', group: 'Career hub', icon: 'person', blurb: 'Ratings, status, contract, profile, scouting, body map.', open: () => show(nbaStar(), 'player') },
  { id: 'roster', title: 'Team roster and fit', group: 'Career hub', icon: 'roster', blurb: 'The five, the bench, the system and the chemistry.', open: () => show(nbaStar(), 'player'), press: '[data-tour="roster"]' },
  { id: 'bodymap', title: 'Body map with an injury', group: 'Career hub', icon: 'health', blurb: 'The pixel body map, hurt.', open: () => show(at('injured', (s) => !!s.player.injury && s.stage === 'NBA'), 'player') },
  { id: 'season-post', title: 'Season tab in the playoffs', group: 'Career hub', icon: 'bracket', blurb: 'With a bracket out, it comes first: under the team and form, above the standings.', open: () => show(at('bracket', (s) => s.stage === 'NBA' && s.step === 'summary' && !!s.nba?.bracket), 'season') },
  { id: 'extras', title: 'Extras tab', group: 'Career hub', icon: 'controller', blurb: 'The start page’s four cards inside a career (round 29): mini-games, career log, achievements, community, and what waits for the start page.', open: () => show(nbaStar(), 'extras') },
  { id: 'records', title: 'Records tab', group: 'Career hub', icon: 'chart', blurb: 'Trophies, banners, career highs, timeline.', open: () => show(at('late', (s) => s.stage === 'NBA' && s.player.age >= 31 && s.step === 'summary'), 'records') },
  { id: 'settings', title: 'Settings menu', group: 'Career hub', icon: 'dial', blurb: 'Theme, court, sound and music, new career, switches.', open: () => show(nbaStar()), press: '[data-tour="settings-btn"]' },
  { id: 'guide', title: 'The game guide', group: 'Career hub', icon: 'guide', blurb: 'The manual: big headers, expandable cards.', open: () => show(nbaStar()), press: '[data-tour="guide-btn"]' },
  { id: 'tour', title: 'Guide mode tour', group: 'Career hub', icon: 'arrow', blurb: 'Every control, highlighted once.', open: () => (resetTour(), show(hsStart(), 'home', { guide: true, master: false })) },
  { id: 'tab-news', title: 'What a tab’s dot was about', group: 'Career hub', icon: 'arrow', blurb: 'A tab with a dot takes you to each change in turn, rings its card and waits for Got it (or Enter).', open: () => show(nbaStar(), 'home', { seen: { records: '0:0:0', player: '40:SG' } }), press: '[data-tour="tab-records"]' },
  { id: 'feedback-foot', title: 'Feedback on every tab', group: 'Career hub', icon: 'envelope', blurb: 'The bar at the foot of each tab: a note to the maker, with the tab it came from.', open: () => show(nbaStar()), press: '.feedback-foot > summary' },
  { id: 'master', title: 'Master mode', group: 'Career hub', icon: 'master', blurb: 'No recommendations anywhere.', open: () => show(nbaStar(), 'home', { master: true }) },
  {
    id: 'fast',
    title: 'Fast break',
    group: 'Career hub',
    icon: 'fast',
    blurb: 'Quick seasons, one-tap press conferences, every tab folded to its essentials.',
    open: () => {
      const g = nbaStar();
      if (g) setFast(g, true);
      return show(g);
    },
  },
  { id: 'simple', title: 'Simple text', group: 'Career hub', icon: 'simple', blurb: 'Explanations hidden on every tab, just the choices.', open: () => show(nbaStar(), 'home', { simple: true }) },
  {
    id: 'sim',
    title: 'Sim mode',
    group: 'Career hub',
    icon: 'sim',
    blurb: 'Routine calls made for you; it stops only for the big ones.',
    open: () => {
      const g = nbaStar();
      if (g) setSim(g, true);
      return show(g);
    },
  },
  { id: 'modes', title: 'How you play', group: 'Career hub', icon: 'dial', blurb: 'Every mode as a switch, above Around the league.', open: () => show(loaded()), press: '[data-tour="modes"]' },
  { id: 'strength', title: 'Why it went this way', group: 'Career hub', icon: 'chart', blurb: 'Team strength, factor by factor.', open: () => show(nbaStar(), 'season') },
  { id: 'rival', title: 'Rival', group: 'Career hub', icon: 'rival', blurb: 'Draft class, head to head, MVP race: you and him on one floor.', open: () => show(loaded()) },
  { id: 'name-card', title: 'Nickname and brand', group: 'Career hub', icon: 'crown', blurb: 'His nickname, its two-colour logo (locked until his first brand deal), the brand deal.', open: () => show(loaded(), 'player') },
  { id: 'staff', title: 'Staff', group: 'Career hub', icon: 'chef', blurb: 'Each at work in the role’s uniform: a talk once a season for a small edge, a raise, letting go.', open: () => show(loaded(), 'player') },
  { id: 'wardrobe', title: 'Wardrobe', group: 'Career hub', icon: 'hanger', blurb: 'Accessories on the avatar; swap or take them off.', open: () => show(loaded(), 'player') },
  { id: 'collection', title: 'Collection and visits', group: 'Career hub', icon: 'car', blurb: 'Everything bought; visit as often as he likes, the first visit each season with a small edge.', open: () => show(loaded(), 'player') },

  // decisions
  { id: 'd-plan', title: 'Training plan', group: 'Decisions', icon: 'grind', blurb: 'Plans with colour strips, two at half strength; tags on the plans that suit his age.', open: () => atDecision('plan', { mode: 'standard' }) },
  { id: 'd-event', title: 'Turning point', group: 'Decisions', icon: 'news', blurb: 'An event with a choice and a rolled result.', open: () => atDecision('event') },
  { id: 'd-offers', title: 'College offers', group: 'Decisions', icon: 'bag', blurb: 'Where he goes after high school.', open: () => atDecision('offers', { mode: 'standard' }) },
  { id: 'd-declare', title: 'Draft declaration', group: 'Decisions', icon: 'door', blurb: 'Declare, test the waters or stay.', open: () => atDecision('declare') },
  { id: 'd-shop', title: 'Shop', group: 'Decisions', icon: 'bag', blurb: 'Spend the bank on gear and health.', open: () => atDecision('shop') },
  { id: 'd-summer', title: 'Summer', group: 'Decisions', icon: 'palm', blurb: 'How he spends the offseason.', open: () => atDecision('summer') },
  { id: 'd-national', title: 'National team', group: 'Decisions', icon: 'globe', blurb: 'The call-up and the summer tournament.', open: () => atDecision('national') },
  { id: 'd-press', title: 'Press conference', group: 'Decisions', icon: 'mic', blurb: 'One or two questions: humble, confident or fiery.', open: () => atDecision('press') },
  { id: 'd-brand', title: 'Brand offers', group: 'Decisions', icon: 'shoe', blurb: 'A fixed deal or a signature line under his logo.', open: () => show(at('d-brand', decision('brand'))) },
  { id: 'd-talks', title: 'Contract talks', group: 'Decisions', icon: 'office', blurb: 'More money, a year or a bigger role, under each pro offer.', open: () => show(at('d-talks', (s, p) => p.type === 'decision' && p.decision.kind === 'offers' && PRO.includes(s.stage))) },
  { id: 'd-live', title: 'Playable playoff game', group: 'Decisions', icon: 'clutch', blurb: 'A tactic each quarter; the last shot of a close game goes to the timing meter.', open: () => atDecision('live', { live: true }) },
  { id: 'd-crunch', title: 'Crunch time in a final', group: 'Decisions', icon: 'clutch', blurb: 'The last two minutes of a close final on the court, trip by trip: pick the play, call the defense, overtime if it ends level.', open: () => show(at('d-crunch', liveAt('crunch'), { live: true, pick: toFinal, tries: 20 })) },
  { id: 'd-assign', title: 'Midseason assignment', group: 'Decisions', icon: 'swap', blurb: 'A G League stint or a move.', open: () => atDecision('assign', { mode: 'standard' }) },
  { id: 'd-retire', title: 'Retirement prompt', group: 'Decisions', icon: 'lastdance', blurb: 'Retire, one more year, or chase a ring.', open: () => atDecision('retirePrompt') },
  {
    id: 'd-chaser',
    title: 'Ring-chaser role',
    group: 'Decisions',
    icon: 'dynasty',
    blurb: 'The specialist roles for a veteran.',
    open: () => show(at('chaser', decision('chaserRole'), { pick: (_, d) => (d.kind === 'retirePrompt' && d.choices.some((c) => c.id === 'ringchase' && !c.disabled) ? 'ringchase' : undefined) })),
  },
  { id: 'd-style', title: 'Team style', group: 'Decisions', icon: 'motion', blurb: 'A talk with the coach: speech bubbles, then the new playbook.', open: () => show(at('style', (s) => canSetStyle(s))), press: '[data-tour="move-style"]' },
  { id: 'd-recruit', title: 'Build the starting five', group: 'Decisions', icon: 'superteam', blurb: 'The scouting board and recruiting.', open: () => show(at('recruit', (s) => canRecruit(s))), press: '[data-tour="move-roster"]' },

  // big moments
  { id: 'cam-lab', title: 'Action cam lab', group: 'Big moments', icon: 'camera', blurb: 'Any play on the finals cam, slowed right down, any two teams.', open: () => true, page: CamLab },
  { id: 'intro', title: 'Intro page', group: 'Start', icon: 'ball', blurb: 'The title over a side-on one-on-one: runs, steals, blocks and jumpers in pixel frames, the venue changing every five seconds. First visit only, or the Intro button on the start page.', open: () => void useStore.setState({ game: null, page: null, mini: null, intro: true }) },
  { id: 'whats-new', title: 'What’s new', group: 'Start', icon: 'news', blurb: 'The latest changes in a panel over part of the start page. It opens by itself once after each update; What’s new beside Intro opens it again.', open: () => void useStore.setState({ game: null, page: null, mini: null, intro: false, thanks: null, news: true }) },
  { id: 'share', title: 'Share the game', group: 'Start', icon: 'share', blurb: 'The Share button on every page: the link to copy, the phone’s share sheet, and posts for X, Reddit, Facebook, WhatsApp and email. Sharing earns Word of Mouth.', open: () => void useStore.setState({ game: null, page: null, mini: null, intro: false, thanks: null, news: false }), press: '[data-tour="share-btn"]' },
  { id: 'thanks', title: 'Thank you for playing', group: 'Start', icon: 'laurel', blurb: 'Every time someone leaves a career: the crowd, the confetti, the trophy held high.', open: () => {
    const g = nbaStar();
    if (!g) return false;
    useStore.setState({ game: null, page: null, mini: null, thanks: g });
  } },
  { id: 'loading', title: 'Loading pop-out', group: 'Start', icon: 'ball', blurb: 'The pixel player who dribbles while a slow step runs: all nine moves, and a button to make the page lag.', open: () => true, page: LoadingLab },
  ...TUTORIAL,
  { id: 'm-intro', title: 'Intro moment', group: 'Big moments', icon: 'door', blurb: 'The career begins.', open: () => withMoment('m-intro', (m) => m.kind === 'intro', { mode: 'standard' }) },
  { id: 'm-commit', title: 'College commitment', group: 'Big moments', icon: 'jersey', blurb: 'Signing day.', open: () => withMoment('m-commit', (m) => m.kind === 'commit', { mode: 'standard' }) },
  { id: 'm-draft', title: 'Draft night', group: 'Big moments', icon: 'jersey', blurb: 'The pick, the cap, the handshake.', open: () => withMoment('m-draft', (m) => m.kind === 'draft') },
  { id: 'm-awards', title: 'Awards night', group: 'Big moments', icon: 'laurel', blurb: 'MVP, All-NBA, the trophies.', open: () => withMoment('m-awards', (m) => m.kind === 'awards') },
  { id: 'm-finals', title: 'NBA Finals (playable)', group: 'Big moments', icon: 'clutch', blurb: 'Play, watch or skip the last minutes.', open: () => withMoment('m-finals', (m) => m.kind === 'title' && !!m.drama && m.mood === 'champion' && m.game?.level === 'NBA') },
  { id: 'm-gold', title: 'Olympic or World Cup final', group: 'Big moments', icon: 'globe', blurb: 'National colours on a FIBA floor.', open: () => withMoment('m-gold', (m) => m.kind === 'tournament' && !!m.drama) },
  { id: 'm-playoffs', title: 'Playoffs out', group: 'Big moments', icon: 'bracket', blurb: 'A postseason that ended short: how his team finished and who won it all, in big type, then the series with his marked W or L.', open: () => withMoment('m-playoffs', (m) => !!m.outcome && !m.lostFinal && m.game === undefined) },
  { id: 'm-fine', title: 'Fined', group: 'Big moments', icon: 'envelope', blurb: 'A letter from the league office, and the amount.', open: () => withMoment('m-fine', (m) => m.kind === 'fine') },
  { id: 'm-nickname', title: 'A nickname', group: 'Big moments', icon: 'crown', blurb: 'The day the media names him: the name alone, in big pixel letters.', open: () => withMoment('m-nickname', (m) => !!m.nick) },
  { id: 'm-logo', title: 'Your logo', group: 'Big moments', icon: 'shoe', blurb: 'His first brand deal draws the logo of his nickname; the name card has kept a locked spot for it until now.', open: () => withMoment('m-logo', (m) => !!m.logo) },
  { id: 'm-injury', title: 'Injury', group: 'Big moments', icon: 'health', blurb: 'The bad news and the timeline.', open: () => withMoment('m-injury', (m) => m.kind === 'injury') },
  {
    id: 'm-duo',
    title: 'A duo forms',
    group: 'Big moments',
    icon: 'superteam',
    blurb: 'Hidden chemistry with a teammate, revealed.',
    // duos only grow from recruits, which the test player never makes: plant a bond that is
    // nearly full and let the engine form it
    open: () => {
      const g = nbaStar();
      const last = g?.history[g.history.length - 1];
      const mate = g && startingFive(g)[0]?.p;
      if (!g || !last || !mate) return false;
      g.bonds = [{ id: mate.id, name: mate.name, pos: mate.pos, spark: 1, bond: 99.5, seasons: 2 }];
      growBonds(g, { ...last, teamId: g.teamId!, w: 60, l: 22, line: { ...last.line, gp: Math.max(1, last.line.gp) } });
      return show(onlyMoment(g, (m) => !!m.duo), 'home', {}, true);
    },
  },
  {
    id: 'm-duo-end',
    title: 'A Big Three ends',
    group: 'Big moments',
    icon: 'superteam',
    blurb: 'One of the three is traded away: the group is over, and whoever stays starts again.',
    open: () => {
      const g = nbaStar();
      const last = g?.history[g.history.length - 1];
      const five = g ? startingFive(g) : [];
      const t = g?.nba?.teams.find((x) => x.id === g.teamId);
      const other = g?.nba?.teams.find((x) => x.id !== g.teamId);
      if (!g || !last || five.length < 2 || !t || !other) return false;
      const [a, b] = [five[0].p, five[1].p];
      g.bonds = [
        { id: a.id, name: a.name, pos: a.pos, spark: 0.9, bond: 100, seasons: 2, formed: g.year - 1, nick: 'The Splash Pair' },
        { id: b.id, name: b.name, pos: b.pos, spark: 0.9, bond: 100, seasons: 1, formed: g.year, trio: true, nick: 'The Big Three' },
      ];
      t.roster = t.roster.filter((x) => x.id !== b.id);
      other.roster.push(b);
      growBonds(g, { ...last, teamId: g.teamId!, w: 50, l: 32, line: { ...last.line, gp: Math.max(1, last.line.gp) } });
      return show(onlyMoment(g, (m) => /the end/.test(m.title)), 'home', {}, true);
    },
  },
  {
    id: 'm-transition',
    title: 'Season transition',
    group: 'Big moments',
    icon: 'calendar',
    blurb: 'The screen between seasons.',
    open: () => show(nbaStar(), 'home', { transition: { kind: 'season', label: 'Next season', sub: 'Age 25 · Year 4 in the NBA', color: '#1C7ED6' } }),
  },
  { id: 'retired', title: 'Retirement page', group: 'Big moments', icon: 'stars', blurb: 'The career card, legacy, what the career qualifies for (boards, hall, statue), the log.', open: () => show(retired(3)) },

  // modes
  // round 26-27: Rough Road, from the offer to the banner
  { id: 'oath-offer', title: 'Rough Road: the offer', group: 'Modes', icon: 'oath', blurb: 'Picking Reality asks once: take the hardest way to play?', open: () => void useStore.setState({ game: null, page: null, mini: null }), press: '.modes .mode-card:nth-child(2)' },
  { id: 'comet-offer', title: 'Comet, offered', group: 'Modes', icon: 'comet', blurb: 'Round 30: Shoot for the stars at hyper speed, offered on the start page with the stars.', open: () => void useStore.setState({ game: null, page: null, mini: null }), press: '.modes .mode-card:nth-child(3)' },
  { id: 'comet-career', title: 'Comet career', group: 'Modes', icon: 'comet', blurb: 'Fast break and Sim locked on; the story it did not stop for, in a list of highlights; the Comet mark.', open: () => show(at('comet', (s, p) => s.stage === 'NBA' && !!s.reel?.length && p.type === 'decision', { quick: 'comet' }), 'home', {}, true) },
  { id: 'sim-calls', title: 'Sim made the call', group: 'Modes', icon: 'sim', blurb: 'Round 30: sim mode makes the turning points too, and lists each call with how it went.', open: () => show(at('sim-calls', (s) => !!s.simCalls?.length, { quick: 'sim' }), 'home') },
  { id: 'oath-career', title: 'Rough Road career', group: 'Modes', icon: 'oath', blurb: 'Master mode on, Fast break and Sim locked off; the mark in the top bar.', open: () => oath(hsStart('reality')) },
  { id: 'oath-retired', title: 'Rough Road, kept to the end', group: 'Modes', icon: 'oath', blurb: 'Its own banner on the retirement page.', open: () => oath(retired(3)), press: 'text=See the whole career' },
  { id: 'mode-reality', title: 'Reality hits hard', group: 'Modes', icon: 'reality', blurb: 'Most careers end short of the NBA.', open: () => show(hsStart('reality')) },
  { id: 'mode-stars', title: 'Shoot for the stars', group: 'Modes', icon: 'stars', blurb: 'Every career reaches stardom.', open: () => show(hsStart('stars')) },
  { id: 'mode-lab', title: 'Built in a lab', group: 'Modes', icon: 'lab', blurb: 'Spend credits on any rating.', open: () => show(hsStart('lab')) },

  // mini-games
  ...MINI,
  {
    id: 'mini-bonus',
    title: 'Mini-games in a career',
    group: 'Mini-games',
    icon: 'controller',
    blurb: 'Career unlocks and the bonus claim, all open.',
    open: () => {
      const g = nbaStar();
      if (!g) return false;
      for (const k of ATTRS) g.player.attrs[k] = Math.max(g.player.attrs[k], 92);
      useStore.setState({ game: g, page: null, mini: 'hub' });
    },
  },

  // round 32: the locker room, the coach, the farewell tour, record chases, love and the next generation
  { id: 'locker', title: 'Locker room', group: 'Career hub', icon: 'locker', blurb: 'On the Season tab: walk with A and D, talk to the five and the bench and the coach; a feud to settle; the coach can be fired from here at the top of the league.', open: () => show(loaded(), 'season'), press: '.lk-who.coach' },
  { id: 'coach-home', title: 'The head coach on Home', group: 'Career hub', icon: 'whistle', blurb: 'His face, temperament and what it does, how much he trusts you, and once a season the role talk.', open: () => show(at('coach-ask', (s, p) => s.stage === 'NBA' && canAskRole(s) && p.type === 'decision' && p.decision.kind === 'plan', { mode: 'standard' })) },
  { id: 'coach-talk', title: 'Team style talk with the coach', group: 'Decisions', icon: 'whistle', blurb: 'The new game plan, set face to face with the team’s own head coach (his pixel avatar, by temperament).', open: () => show(at('style', (s) => canSetStyle(s))), press: ['[data-tour="move-style"]', '.style-choice:not(.selected)'] },
  {
    id: 'd-hotseat',
    title: 'Hot seat',
    group: 'Decisions',
    icon: 'whistle',
    blurb: 'A losing team, the coach’s job on the line: back him, stay out of it, or (a name in the league) tell the front office it is time.',
    open: () => {
      const g = at('hotseat', (s) => s.stage === 'NBA' && s.step === 'midseason');
      if (g) {
        g.player.rep = Math.max(g.player.rep, 70);
        offerEvent(g, 'coachfired');
      }
      return show(g);
    },
  },
  { id: 'farewell-offer', title: 'Farewell tour: the offer', group: 'Decisions', icon: 'gift', blurb: 'An offseason move for a veteran: announce that next season is the last.', open: () => show(at('farewell', (s) => canFarewell(s))), press: '[data-tour="move-farewell"]' },
  {
    id: 'farewell-season',
    title: 'Farewell tour: the last season',
    group: 'Big moments',
    icon: 'gift',
    blurb: 'Home during the farewell season: the banner, every arena saying goodbye.',
    open: () => {
      const g = at('farewell', (s) => canFarewell(s));
      if (g) announceFarewell(g);
      return show(forward(g, (s) => isFarewellSeason(s) && s.step === 'preseason'));
    },
  },
  {
    id: 'm-farewell',
    title: 'Farewell tour: the last page',
    group: 'Big moments',
    icon: 'gift',
    blurb: 'The road arenas’ gifts, the honour, then the retirement page.',
    open: () => {
      const g = at('farewell', (s) => canFarewell(s));
      if (g) announceFarewell(g);
      const done = forward(g, (s) => s.moments.some((m) => m.title === 'The farewell tour'));
      return show(done && onlyMoment(done, (m) => m.title === 'The farewell tour'), 'home', {}, true);
    },
  },
  { id: 'record-watch', title: 'Record watch', group: 'Career hub', icon: 'record', blurb: 'Close to passing a legend on the all-time scoring list, or near a single-game league record: a warning, and Chase it.', open: () => show(at('record-watch', (s) => s.stage === 'NBA' && s.step === 'preseason' && recordWatch(s).some((w) => w.kind === 'list'))) },
  { id: 'm-wedding', title: 'Love: the wedding', group: 'Big moments', icon: 'heart', blurb: 'A chapter of the Love storyline (dating, a proposal, the wedding, a family), on the garden wedding scene.', open: () => withMoment('m-wedding', (m) => /^Love: The wedding/.test(m.title), { mode: 'standard', tries: 12 }) },
  {
    id: 'next-gen',
    title: 'The next generation: his son',
    group: 'Big moments',
    icon: 'family',
    blurb: 'After a career with a child: the son, his father’s number and hometown, and his career at Comet speed.',
    open: () => {
      const g = retired(3);
      if (g) g.flags.child = g.year - 6;
      return show(g);
    },
    press: 'text=See the whole career',
  },
  {
    id: 'next-gen-done',
    title: 'The next generation: how the son did',
    group: 'Big moments',
    icon: 'family',
    blurb: 'On the father’s page: the son’s peak, biggest honour and five numbers, and the legacy points he added.',
    open: () => {
      const g = retired(3);
      if (g) {
        g.flags.child = g.year - 6;
        g.flags.childPlayed = 1;
        g.kid = SON(g.player.name);
      }
      return show(g);
    },
    press: 'text=See the whole career',
  },
  {
    id: 'son-end',
    title: 'The next generation: the son’s last page',
    group: 'Big moments',
    icon: 'family',
    blurb: 'A son’s career has no card of its own: his page says whose son he was and where his legacy went.',
    open: () => {
      const g = retired(3);
      if (g) {
        g.flags.gen2 = 1;
        g.flags.comet = 1;
        g.parent = { name: 'Marcus Hale', recId: 'dev-father', legacy: 180, slot: 'dev-none', peak: 88, titles: 1, mvps: 0 };
      }
      return show(g);
    },
    press: 'text=See the whole career',
  },
  // records and community
  { id: 'log', title: 'Career log', group: 'Records & community', icon: 'cards', blurb: 'The last ten career cards, two of them locked.', open: () => (seedLog(true), useStore.setState({ game: null, mini: null, page: 'log' })) },
  { id: 'log-compare', title: 'Compare two careers', group: 'Records & community', icon: 'cards', blurb: 'Two log cards side by side: peak, index, legacy, rank, honours, NBA numbers; the better of each in bold with a ▲.', open: () => (seedLog(true), useStore.setState({ game: null, mini: null, page: 'log' })), press: ['[data-tour="log-pick"]:not([aria-pressed="true"])', '[data-tour="log-pick"]:not([aria-pressed="true"])'] },
  { id: 'log-live', title: 'Career log from a career', group: 'Records & community', icon: 'lock', blurb: 'Opened from the Extras tab: look, download and lock; no Delete until the start page.', open: () => (seedLog(true), show(nbaStar(), 'extras', { page: 'log' })) },
  { id: 'ach-all', title: 'Achievement book (all earned)', group: 'Records & community', icon: 'laurel', blurb: `Every one of the ${ACHIEVEMENTS.length}, with how it was earned.`, open: () => (setAchievements(true), useStore.setState({ game: null, mini: null, page: 'achievements' })) },
  {
    id: 'ach-run',
    title: 'Achievements in a career',
    group: 'Records & community',
    icon: 'laurel',
    blurb: 'The book from a career’s Extras tab: what this career earned comes first, in gold.',
    // a book where a third of the first forty were earned by this career
    open: () => {
      const g = nbaStar();
      if (!g) return false;
      const run = runOf(g);
      const got = Object.fromEntries(ACHIEVEMENTS.slice(0, 40).map((a, i) => [a.id, { at: new Date().toISOString(), who: i % 3 === 0 ? g.player.name : 'Dev deck', run: i % 3 === 0 ? run : 'another' }]));
      try {
        localStorage.setItem('btr-achv-v1', JSON.stringify({ got, totals: {} }));
      } catch {
        // nothing kept: the book opens empty
      }
      return show(g, 'extras');
    },
    press: '[data-tour="ach"]',
  },
  { id: 'ach-none', title: 'Achievement book (new player)', group: 'Records & community', icon: 'lock', blurb: 'Every name a riddle.', open: () => (setAchievements(false), useStore.setState({ game: null, mini: null, page: 'achievements' })) },
  {
    id: 'ach-toast',
    title: 'Achievement banners',
    group: 'Records & community',
    icon: 'laurel',
    blurb: 'The toasts at the top, one per tier.',
    open: () => {
      show(nbaStar());
      useStore.setState({ toasts: ACH_TIERS.slice(0, 3).map((t, i) => ({ id: `dev-${t.key}`, name: ACHIEVEMENTS.find((a) => a.tier === t.key)!.name, tier: t.key, more: i === 2 ? 9 : undefined })) });
    },
  },
  { id: 'c-boards', title: 'Leaderboards', group: 'Records & community', icon: 'podium', blurb: 'Daily and all-time, a board for each difficulty and each challenge, ranked by career index, with the house players at the foot.', open: () => (seedCommunity(), useStore.setState({ game: null, mini: null, page: 'community' })) },
  { id: 'c-rough', title: 'Rough Road board', group: 'Records & community', icon: 'oath', blurb: 'Rough Road careers only, today and all time; they rank on the Reality board too.', open: () => (seedCommunity(), useStore.setState({ game: null, mini: null, page: 'community' })), press: '[data-board="rough"]' },
  { id: 'c-comet', title: 'Comet board', group: 'Records & community', icon: 'comet', blurb: 'Comet careers only, off the Shoot for the stars board, so careers played by hand compete with each other.', open: () => (seedCommunity(), useStore.setState({ game: null, mini: null, page: 'community' })), press: '[data-board="comet"]' },
  { id: 'c-hall', title: 'Reality 99 hall', group: 'Records & community', icon: 'hall', blurb: 'Every Reality career that reached 99, on the benches of a hall; tap one for the card.', open: () => (seedCommunity(), useStore.setState({ game: null, mini: null, page: 'community' })), press: 'text=Reality 99 hall' },
  { id: 'c-plaza', title: 'Statue plaza', group: 'Records & community', icon: 'statue', blurb: 'Cute players cast in bronze and gold, house statues among them; pay your respects.', open: () => (seedCommunity(), useStore.setState({ game: null, mini: null, page: 'community' })), press: 'text=Statue plaza' },
  { id: 'c-feedback', title: 'Send feedback', group: 'Records & community', icon: 'envelope', blurb: 'A note to the maker.', open: () => (seedCommunity(), useStore.setState({ game: null, mini: null, page: 'community' })), press: 'text=Send feedback' },
];
