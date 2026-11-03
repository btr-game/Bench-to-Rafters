import { announce } from './announcer';
import { GuideButton } from './components/Guide';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { GameState } from '../engine/types';
import { MODES } from '../engine/balance';
import { ovrOf } from '../engine/player/ovr';
import { NextStep, SettingsMenu, useKeys } from './components/Settings';
import { ShareButton } from './components/Share';
import { tabKey } from './selectors';
import { achievementsNow, useStore, type Tab } from '../store';
import { UI } from '../content/strings';
import { Create } from './screens/Create';
import { Home } from './screens/Home';
import { ExtrasTab, PlayerTab, RecordsTab, SeasonTab } from './screens/Tabs';
import { Retirement } from './screens/Retirement';
import { DailyStrip } from './mini/Daily';
import { Overlays } from './components/Overlays';
import { MiniGames } from './mini/MiniGames';
import { Icon } from './art/Icon';
import { CareerLog } from './screens/CareerLog';
import { AchievementBook } from './screens/Achievements';
import { CommunityPage } from './screens/Community';
import { MpBoard, MultiplayerPage } from './screens/Multiplayer';
import { FootBar } from './components/FootBar';
import { Intro } from './screens/Intro';
import { Finale } from './screens/Finale';
import { ICON_FOR } from './art/icons';
import { music, onHeard, sfx, wakeOnClick } from './sound';
import { recordHeard } from './achievements';
import { trackOf } from './tracks';
import { inTutorial, levelTabs } from './road';
import { Graduation } from './screens/Graduation';
import { STOPS } from './tutorial/closing';
import { LEVEL_NAME, levelOf } from '../engine/levels';
import { RoadMap } from './screens/RoadMap';
import { LevelEnd } from './screens/LevelEnd';
import { Town } from './components/Town';


// round 28 (owner: "any graphic that isnt pixels, change them"): the tab icons on a 12x12 pixel
// grid, in the tab's own colour. Round 37: each is its place in the town (components/Town.tsx):
// the gym's hoop for Home, the arena for Season, his house for Player, the trophy for Records and
// the arcade's joystick for Extras
const ICON_ROWS: Record<Tab, string[]> = {
  home: ['.##########.', '.#........#.', '.#..####..#.', '.#..#..#..#.', '.##########.', '.....##.....', '...######...', '...#.##.#...', '....#..#....', '....#..#....', '.....##.....', '............'],
  season: ['....####....', '..##....##..', '.#........#.', '############', '#.##.##.##.#', '#.##.##.##.#', '#..........#', '#.##.##.##.#', '#.##.##.##.#', '#....##....#', '#....##....#', '############'],
  player: ['.....##.....', '....####....', '...##..##...', '..##....##..', '.##......##.', '##........##', '.#........#.', '.#..####..#.', '.#..#..#..#.', '.#..#..#..#.', '.#..#..#..#.', '.####..####.'],
  records: ['.##########.', '#.#......#.#', '#.#......#.#', '.##......##.', '..#......#..', '...#....#...', '....####....', '.....##.....', '.....##.....', '....####....', '...######...', '............'],
  extras: ['.....##.....', '....####....', '....####....', '.....##.....', '.....##.....', '.....##.....', '..########..', '.#........#.', '.#.##..#.#.#', '.#........#.', '.##########.', '............'],
};
const ICONS: Record<Tab, ReactNode> = Object.fromEntries(
  (Object.keys(ICON_ROWS) as Tab[]).map((t) => [t, ICON_ROWS[t].flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))]),
) as unknown as Record<Tab, ReactNode>;

/** The main tabs: along the top on a computer, along the bottom on a phone. A dot marks a tab with something new. */
function TabBar({ g, top = false }: { g: GameState; top?: boolean }) {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const seen = useStore((s) => s.seen);
  return (
    <nav className={top ? 'toptabs' : 'tabbar'} aria-label="Main">
      {((levelTabs(g) ?? Object.keys(UI.tabs)) as Tab[]).map((t) => {
        const fresh = t !== tab && seen[t] !== undefined && seen[t] !== tabKey(g, t);
        return (
          <button key={t} data-tour={`tab-${t}`} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)} title={`${UI.tabs[t]} (${t[0].toUpperCase()})`}>
            <svg viewBox="-1 -1 14 14" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
              {ICONS[t]}
            </svg>
            {UI.tabs[t]}
            {fresh && <span className="tab-dot" aria-label="new" />}
          </button>
        );
      })}
    </nav>
  );
}

/** Round 34 (owner: "if i am looking back, i should have easier access to leave that career"): a
 * finished career opened from the career log says so at the top, with the way out beside it. */
function LookBackBar({ g }: { g: GameState }) {
  const lookBack = useStore((s) => s.lookBack);
  const leave = useStore((s) => s.leaveLookBack);
  if (!lookBack || g.step !== 'retired') return null;
  return (
    <div className="daily-strip look-back-bar" role="region" aria-label="Looking back">
      <Icon name="rewind" size={22} />
      <b>Looking back</b>
      <span className="small">
        {g.player.name}, retired at {g.player.age}
      </span>
      <span className="spacer" />
      <button className="btn small" onClick={() => (sfx('page'), leave())}>
        Leave: back to the career log
      </button>
    </div>
  );
}

/** Round 33: the closing tour's bar: the stop on screen, and on to the next once its lessons are done. */
function TourBar() {
  const closing = useStore((s) => s.closing);
  const up = useStore((s) => s.lessonUp);
  const nextStop = useStore((s) => s.nextStop);
  // a moment for the stop's first lesson to show before Next stop can be pressed
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, [closing?.i]);
  if (!closing) return null;
  const stop = STOPS.find((x) => x.id === closing.ids[closing.i]);
  const last = closing.i >= closing.ids.length - 1;
  return (
    <div className="card tour-bar" data-tour="tour-bar">
      <Icon name="map" size={28} />
      <div style={{ minWidth: 0 }}>
        <div className="kicker">
          Closing tour · stop {closing.i + 1} of {closing.ids.length}
        </div>
        <b>{stop?.title}</b>
      </div>
      <div className="spacer" />
      <button className="btn" disabled={up || !ready} onClick={nextStop}>
        {last ? 'Finish the tour' : 'Next stop'}
      </button>
    </div>
  );
}

const SHORT_MODE: Record<string, string> = { standard: 'Regular', reality: 'Reality', stars: 'Stars', fast: 'Fast', lab: 'Lab' };

/** The difficulty, always in view (round 15), and Master mode when it is on. */
function ModeBadge({ g }: { g: GameState }) {
  const master = useStore((s) => s.master);
  // round 33: a level career shows its level, not a difficulty
  const level = levelOf(g);
  if (level)
    return (
      <span className="mode-badge mode-level" title="Level">
        <Icon name="map" size={14} />
        <span className="long">Level {['beginner', 'intermediate', 'advanced'].indexOf(level) + 1} · {LEVEL_NAME[level]}</span>
        <span className="short">{LEVEL_NAME[level]}</span>
      </span>
    );
  return (
    <span className={`mode-badge mode-${g.mode}`} title="Difficulty">
      {ICON_FOR[g.mode] && <Icon name={ICON_FOR[g.mode]} size={14} />}
      <span className="long">{MODES[g.mode]?.name ?? g.mode}</span>
      <span className="short">{SHORT_MODE[g.mode] ?? g.mode}</span>
      {g.flags.oath ? (
        <b className="oath-badge with-icon">
          {' · '}
          <Icon name="oath" size={14} />
          Rough Road
        </b>
      ) : g.flags.comet ? (
        <b className="oath-badge with-icon">
          {' · '}
          <Icon name="comet" size={14} />
          Comet
        </b>
      ) : (
        master && <b> · Master</b>
      )}
    </span>
  );
}

/** A tab's page. With fast break on, the cards marked Extra fold away and one button at the
 * bottom brings them back for this visit (round 25). */
function TabView({ fast, children }: { fast: boolean; children: ReactNode }) {
  const [all, setAll] = useState(false);
  const [folded, setFolded] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // the cards folded away (a card inside another card counts once)
    setFolded(ref.current ? [...ref.current.querySelectorAll('.extra .card')].filter((c) => !c.parentElement?.closest('.card')).length : 0);
  });
  return (
    <div ref={ref} className={`tab-view${fast && !all ? ' fold' : ''}`}>
      {children}
      {fast && folded > 0 && (
        <button className="btn ghost fold-toggle" onClick={() => setAll(!all)}>
          {all ? 'Fold the extra cards' : `Show everything (${folded} more card${folded === 1 ? '' : 's'})`}
        </button>
      )}
    </div>
  );
}

export function App() {
  const game = useStore((s) => s.game);
  const tab = useStore((s) => s.tab);
  const mini = useStore((s) => s.mini);
  const page = useStore((s) => s.page);
  const intro = useStore((s) => s.intro);
  const finale = useStore((s) => s.finale);
  const simple = useStore((s) => s.simple);
  const road = useStore((s) => s.road);
  const creating = useStore((s) => s.creating);
  useEffect(() => {
    document.documentElement.classList.toggle('simple', simple);
  }, [simple]);
  // round 27 (navigation): a tab opens at its top, not where the last one was scrolled to, and the
  // browser tab says where you are
  useEffect(() => {
    window.scrollTo(0, 0); // braces: newer browsers return a promise from scrollTo, and an effect may only return its clean-up
  }, [tab, page, mini]);
  useEffect(() => {
    const where = mini ? 'Mini-games' : page === 'log' ? 'Career log' : page === 'achievements' ? 'Achievement book' : page === 'community' ? 'Community' : page === 'multi' ? 'Play with friends' : game ? UI.tabs[tab] : '';
    document.title = where ? `${where} · Bench to Rafters` : 'Bench to Rafters';
  }, [tab, page, mini, game]);
  // round 33: a level plays at fast break's pace but keeps every card in view
  const fast = !!game?.flags.fast && game.step !== 'retired' && !game.flags.level;


  useKeys(!mini && !!game);
  // round 25: sound. The first click or key wakes the audio; the music plays from the start (owner:
  // "the background music should be playing from the very start of the game"); what happens in the
  // game has its own sounds. Round 29: the loop follows the screen
  const track = useStore(trackOf);
  useEffect(() => wakeOnClick(), []);
  useEffect(() => onHeard((id) => recordHeard(id) && achievementsNow()), []);
  useEffect(() => music(track), [track]);
  useEffect(
    () =>
      useStore.subscribe((now, before) => {
        if (now.toasts.length > before.toasts.length) sfx('achievement');
        // round 27 (owner: "can you add more sound"): moving around, and how the season goes
        if (now.tab !== before.tab && now.game) sfx('tab');
        if ((now.page && now.page !== before.page) || (now.mini && now.mini !== before.mini)) sfx('page');
        if (now.transition && now.transition !== before.transition) sfx(now.transition.kind === 'half' ? 'whistle' : 'season');
        const g = now.game;
        const b = before.game;
        if (!g || !b || g === b) return;
        if (g.result && g.result !== b.result && g.result.tierKey) sfx(g.result.tierKey === 'backfired' || g.result.tierKey === 'mixed' ? 'bad' : g.result.tierKey === 'expected' ? 'confirm' : 'good');
        if (b.teamId && g.teamId && g.teamId !== b.teamId && g.step !== 'retired') sfx('trade');
        if (g.step === 'retired' && b.step !== 'retired') sfx('retire');
        else if (Math.round(ovrOf(g.player.attrs, g.player.pos)) > Math.round(ovrOf(b.player.attrs, b.player.pos))) sfx('rise');
        if (g.purchases.length > b.purchases.length) sfx('coins');
        // round 25: what the new systems did, read off the career log and the player
        for (const l of g.log.slice(b.log.length)) {
          if (l.kind === 'press') sfx('shutter');
          else if (l.kind === 'talks') sfx(/pull the offer/.test(l.text) ? 'nope' : /They agree/.test(l.text) ? 'deal' : 'confirm');
          else if (l.kind === 'staff') sfx(/^Let /.test(l.text) ? 'nope' : /raise/.test(l.text) ? 'coins' : 'confirm');
        }
        if (g.player.brand && g.player.brand.since !== b.player.brand?.since) sfx('brand');
        if (Object.keys(g.player.visits ?? {}).some((k) => g.player.visits![k] !== b.player.visits?.[k])) sfx('visit');
        if ((g.player.staff ?? []).some((m) => m.talked !== b.player.staff?.find((x) => x.id === m.id)?.talked)) sfx('chime');
        const seen = new Set(b.moments.map((m) => m.id));
        const fresh = g.moments.find((m) => !seen.has(m.id));
        if (!fresh) return;
        if (fresh.logo || fresh.nick) sfx('nickname');
        else if (fresh.kind === 'title') sfx(fresh.mood === 'champion' ? 'title' : 'lose');
        // round 32: the announcer for the biggest pages
        if (fresh.kind === 'title' && fresh.mood === 'champion') announce('Champions!');
        else if (fresh.title === 'Breakthrough season') announce('Breakthrough!');
        else if (fresh.lostFinal) sfx('lose');
        else if (fresh.kind === 'awards' || fresh.kind === 'draft') sfx('award');
        else if (fresh.kind === 'injury') sfx('injury');
        else if (fresh.kind === 'fine') sfx('fine');
      }),
    [],
  );

  if (finale && !game) return <Finale key={`${finale.g.seed}-${finale.from ?? ""}`} g={finale.g} from={finale.from} />;
  if (intro) return <Intro />;
  // round 33: the tutorial, until the full game opens on this device. Round 35 (owner: "make only the
  // beginner level of tutorial necessary"): the beginner career, then graduation; the road map's
  // other stops wait in the full game, where they open the other modes
  if (inTutorial(road) && !game) return road.passed.beginner ? <Graduation /> : <Create level="beginner" />;
  if (creating && !game) return <Create level={creating} />;
  // the island from the road map (the hub over the map, which stays the page to go back to)
  if (mini && !game) return <MiniGames />;
  if (page === 'road' && !game) return <RoadMap />;
  if (page === 'log') return <CareerLog />;
  if (page === 'achievements') return <AchievementBook />;
  if (page === 'community') return <CommunityPage />;
  if (page === 'multi') return <MultiplayerPage />;
  if (mini) return <MiniGames />;
  if (!game) return <Create />;

  const retired = game.step === 'retired';
  const sideBoard = !!(game.mp?.challenge || game.mp?.klass) && (tab !== 'home' || retired);
  return (
    <>
      <div className="wrap">
        <header className="top">
          <div className="brand-wrap">
            <div className="brand">
              Bench to <span>Rafters</span>
            </div>
            <ModeBadge g={game} />
          </div>
          <TabBar g={game} top />
          <div className="top-right">
            <NextStep g={game} />
            <ShareButton />
            {!game.flags.level && <GuideButton />}
            <SettingsMenu g={game} />
          </div>
        </header>
        {/* round 37: the town, his street of places in place of the row of tabs */}
        <Town g={game} fast={fast} />
        {game.flags.daily ? <DailyStrip g={game} /> : null}
        <LookBackBar g={game} />
        {game.flags.tour ? <TourBar /> : null}
        <div className={sideBoard ? 'mp-layout' : undefined}>
          <TabView key={tab} fast={fast}>
            {tab === 'home' && (retired ? game.flags.level ? <LevelEnd g={game} /> : <Retirement g={game} /> : <Home g={game} />)}
            {tab === 'season' && <SeasonTab g={game} />}
            {tab === 'player' && <PlayerTab g={game} />}
            {tab === 'records' && <RecordsTab g={game} />}
            {tab === 'extras' && <ExtrasTab g={game} />}
          </TabView>
          {/* round 35: a career with friends keeps its board beside every tab (Home has it in its own side column) */}
          {sideBoard && (
            <aside className="mp-aside">
              <MpBoard g={game} />
            </aside>
          )}
        </div>
        <FootBar where={`${tab} tab, ${MODES[game.mode]?.name ?? game.mode}, age ${game.player.age}`} />
      </div>
      <Overlays g={game} />
      <TabBar g={game} />
    </>
  );
}
