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
import { logCareer } from '../ui/careerLog';
import { resetTour } from '../ui/components/GuideTour';
import { decision, moment, onlyMoment, play, type PlayOpts } from './stage';
import { CamLab } from './CamLab';
import { LoadingLab } from './LoadingLab';

export type Group = 'Start' | 'Career hub' | 'Decisions' | 'Big moments' | 'Modes' | 'Mini-games' | 'Records & community';
export const GROUPS: { key: Group; color: string; icon: string }[] = [
  { key: 'Start', color: '#E8590C', icon: 'door' },
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
  /** A control to press once the page is up (a menu, a sheet, a page tab). */
  press?: string;
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
/** A career played as No Shortcuts (round 26): Reality, master mode, nothing simplified. */
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

function seedLog(): void {
  for (const r of records()) logCareer(r);
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
    blurb: 'Every career on this device, newest first: continue, copy its code, delete. Paste a code to import.',
    open: () => {
      const g = loaded();
      if (!g) return false;
      void writeSlot(newSlotId(), g).then(() => useStore.setState({ game: null, page: null, mini: null }));
    },
  },
  { id: 'daily', title: 'Daily challenge', group: 'Start', icon: 'calendar', blurb: "Today's prospect, the same for everyone. Mini-games locked.", open: () => void (useStore.setState({ game: null, mini: null, page: null }), useStore.getState().startDaily()) },

  // career hub
  { id: 'home-hs', title: 'Home: high school', group: 'Career hub', icon: 'house', blurb: 'The first season, the first plan.', open: () => show(hsStart()) },
  { id: 'home-nba', title: 'Home: an NBA star', group: 'Career hub', icon: 'stars', blurb: 'Third NBA season, MVP race, duo, stories.', open: () => show(nbaStar()) },
  { id: 'season', title: 'Season tab', group: 'Career hub', icon: 'calendar', blurb: 'Games, splits, the season so far.', open: () => show(nbaStar(), 'season') },
  { id: 'player', title: 'Player tab', group: 'Career hub', icon: 'person', blurb: 'Ratings, status, contract, profile, scouting, body map.', open: () => show(nbaStar(), 'player') },
  { id: 'roster', title: 'Team roster and fit', group: 'Career hub', icon: 'roster', blurb: 'The five, the bench, the system and the chemistry.', open: () => show(nbaStar(), 'player'), press: '[data-tour="roster"]' },
  { id: 'bodymap', title: 'Body map with an injury', group: 'Career hub', icon: 'health', blurb: 'The pixel body map, hurt.', open: () => show(at('injured', (s) => !!s.player.injury && s.stage === 'NBA'), 'player') },
  { id: 'league', title: 'League tab and bracket', group: 'Career hub', icon: 'bracket', blurb: 'Standings, the playoff bracket, the record book.', open: () => show(at('bracket', (s) => s.stage === 'NBA' && s.step === 'summary' && !!s.nba?.bracket), 'league') },
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
  { id: 'name-card', title: 'Nickname and brand', group: 'Career hub', icon: 'crown', blurb: 'His nickname, its two-colour logo, the brand deal.', open: () => show(loaded(), 'player') },
  { id: 'staff', title: 'Staff', group: 'Career hub', icon: 'chef', blurb: 'Each at work in the role’s uniform: stop by, raise, let go.', open: () => show(loaded(), 'player') },
  { id: 'wardrobe', title: 'Wardrobe', group: 'Career hub', icon: 'hanger', blurb: 'Accessories on the avatar; swap or take them off.', open: () => show(loaded(), 'player') },
  { id: 'collection', title: 'Collection and visits', group: 'Career hub', icon: 'car', blurb: 'Everything bought; visit the car, the jet, the house.', open: () => show(loaded(), 'player') },

  // decisions
  { id: 'd-plan', title: 'Training plan', group: 'Decisions', icon: 'grind', blurb: 'Plans with colour strips, two at half strength.', open: () => atDecision('plan', { mode: 'standard' }) },
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
  { id: 'd-style', title: 'Team style', group: 'Decisions', icon: 'motion', blurb: 'Steer how the team plays.', open: () => show(at('style', (s) => canSetStyle(s))), press: '[data-tour="move-style"]' },
  { id: 'd-recruit', title: 'Build the starting five', group: 'Decisions', icon: 'superteam', blurb: 'The scouting board and recruiting.', open: () => show(at('recruit', (s) => canRecruit(s))), press: '[data-tour="move-roster"]' },

  // big moments
  { id: 'cam-lab', title: 'Action cam lab', group: 'Big moments', icon: 'camera', blurb: 'Any play on the finals cam, slowed right down, any two teams.', open: () => true, page: CamLab },
  { id: 'intro', title: 'Intro page', group: 'Start', icon: 'ball', blurb: 'The title over a side-on one-on-one: runs, steals, blocks and jumpers in pixel frames, the venue changing every five seconds. First visit only, or the Intro button on the start page.', open: () => void useStore.setState({ game: null, page: null, mini: null, intro: true }) },
  { id: 'whats-new', title: 'What’s new', group: 'Start', icon: 'news', blurb: 'The latest changes in a panel over part of the start page. It opens by itself once after each update; What’s new beside Intro opens it again.', open: () => void useStore.setState({ game: null, page: null, mini: null, intro: false, thanks: null, news: true }) },
  { id: 'thanks', title: 'Thank you for playing', group: 'Start', icon: 'laurel', blurb: 'The first time someone leaves a career for a new one: the crowd, the confetti, the trophy held high.', open: () => {
    const g = nbaStar();
    if (!g) return false;
    useStore.setState({ game: null, page: null, mini: null, thanks: g });
  } },
  { id: 'loading', title: 'Loading pop-out', group: 'Start', icon: 'ball', blurb: 'The pixel player who dribbles while a slow step runs: all nine moves, and a button to make the page lag.', open: () => true, page: LoadingLab },
  { id: 'm-intro', title: 'Intro moment', group: 'Big moments', icon: 'door', blurb: 'The career begins.', open: () => withMoment('m-intro', (m) => m.kind === 'intro', { mode: 'standard' }) },
  { id: 'm-commit', title: 'College commitment', group: 'Big moments', icon: 'jersey', blurb: 'Signing day.', open: () => withMoment('m-commit', (m) => m.kind === 'commit', { mode: 'standard' }) },
  { id: 'm-draft', title: 'Draft night', group: 'Big moments', icon: 'jersey', blurb: 'The pick, the cap, the handshake.', open: () => withMoment('m-draft', (m) => m.kind === 'draft') },
  { id: 'm-awards', title: 'Awards night', group: 'Big moments', icon: 'laurel', blurb: 'MVP, All-NBA, the trophies.', open: () => withMoment('m-awards', (m) => m.kind === 'awards') },
  { id: 'm-finals', title: 'NBA Finals (playable)', group: 'Big moments', icon: 'clutch', blurb: 'Play, watch or skip the last minutes.', open: () => withMoment('m-finals', (m) => m.kind === 'title' && !!m.drama && m.mood === 'champion' && m.game?.level === 'NBA') },
  { id: 'm-gold', title: 'Olympic or World Cup final', group: 'Big moments', icon: 'globe', blurb: 'National colours on a FIBA floor.', open: () => withMoment('m-gold', (m) => m.kind === 'tournament' && !!m.drama) },
  { id: 'm-fine', title: 'Fined', group: 'Big moments', icon: 'envelope', blurb: 'A letter from the league office, and the amount.', open: () => withMoment('m-fine', (m) => m.kind === 'fine') },
  { id: 'm-nickname', title: 'A nickname', group: 'Big moments', icon: 'crown', blurb: 'The day the media names him, with its logo.', open: () => withMoment('m-nickname', (m) => !!m.logo) },
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
    id: 'm-transition',
    title: 'Season transition',
    group: 'Big moments',
    icon: 'calendar',
    blurb: 'The screen between seasons.',
    open: () => show(nbaStar(), 'home', { transition: { kind: 'season', label: 'Next season', sub: 'Age 25 · Year 4 in the NBA', color: '#1C7ED6' } }),
  },
  { id: 'retired', title: 'Retirement page', group: 'Big moments', icon: 'stars', blurb: 'The career card, legacy, statue, log.', open: () => show(retired(3)) },

  // modes
  // round 26-27: No Shortcuts, from the offer to the banner
  { id: 'oath-offer', title: 'No Shortcuts: the offer', group: 'Modes', icon: 'oath', blurb: 'Picking Reality asks once: take the hardest way to play?', open: () => void useStore.setState({ game: null, page: null, mini: null }), press: '.modes .mode-card:nth-child(2)' },
  { id: 'oath-career', title: 'No Shortcuts career', group: 'Modes', icon: 'oath', blurb: 'Master mode on, Fast break and Sim locked off; the mark in the top bar.', open: () => oath(hsStart('reality')) },
  { id: 'oath-retired', title: 'No Shortcuts, kept to the end', group: 'Modes', icon: 'oath', blurb: 'Its own banner on the retirement page.', open: () => oath(retired(3)), press: 'text=See the whole career' },
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

  // records and community
  { id: 'log', title: 'Career log', group: 'Records & community', icon: 'cards', blurb: 'The last five career cards.', open: () => (seedLog(), useStore.setState({ game: null, mini: null, page: 'log' })) },
  { id: 'ach-all', title: 'Achievement book (all earned)', group: 'Records & community', icon: 'laurel', blurb: `Every one of the ${ACHIEVEMENTS.length}, with how it was earned.`, open: () => (setAchievements(true), useStore.setState({ game: null, mini: null, page: 'achievements' })) },
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
  { id: 'c-boards', title: 'Leaderboards', group: 'Records & community', icon: 'podium', blurb: 'Daily and all-time, every difficulty, ranked by career index, with the house players at the foot.', open: () => (seedCommunity(), useStore.setState({ game: null, mini: null, page: 'community' })) },
  { id: 'c-hall', title: 'Reality 99 hall', group: 'Records & community', icon: 'hall', blurb: 'Every Reality career that reached 99, on the benches of a hall; tap one for the card.', open: () => (seedCommunity(), useStore.setState({ game: null, mini: null, page: 'community' })), press: 'text=Reality 99 hall' },
  { id: 'c-plaza', title: 'Statue plaza', group: 'Records & community', icon: 'statue', blurb: 'Cute players cast in bronze and gold, house statues among them; pay your respects.', open: () => (seedCommunity(), useStore.setState({ game: null, mini: null, page: 'community' })), press: 'text=Statue plaza' },
  { id: 'c-feedback', title: 'Send feedback', group: 'Records & community', icon: 'envelope', blurb: 'A note to the maker.', open: () => (seedCommunity(), useStore.setState({ game: null, mini: null, page: 'community' })), press: 'text=Send feedback' },
];
