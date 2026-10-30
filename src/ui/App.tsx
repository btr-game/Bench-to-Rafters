import { GuideButton } from './components/Guide';
import { useEffect, type ReactNode } from 'react';
import type { GameState } from '../engine/types';
import { MODES } from '../engine/balance';
import { NextStep, SettingsMenu, useKeys } from './components/Settings';
import { tabKey } from './selectors';
import { useStore, type Tab } from '../store';
import { UI } from '../content/strings';
import { Create } from './screens/Create';
import { Home } from './screens/Home';
import { LeagueTab, PlayerTab, RecordsTab, SeasonTab } from './screens/Tabs';
import { Retirement } from './screens/Retirement';
import { DailyStrip } from './mini/Daily';
import { Overlays } from './components/Overlays';
import { MiniGames } from './mini/MiniGames';
import { Icon } from './art/Icon';
import { CareerLog } from './screens/CareerLog';
import { AchievementBook } from './screens/Achievements';
import { CommunityPage } from './screens/Community';
import { ICON_FOR } from './art/icons';
import { music, sfx, wakeOnClick } from './sound';

const HOST_THEME = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;

const ICONS: Record<Tab, ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  season: <path d="M4 5h16v15H4zM4 9h16M9 3v4M15 3v4" />,
  player: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0" />,
  league: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  records: <path d="M7 4h10v5a5 5 0 0 1-10 0zM12 14v4M8 21h8M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />,
};

/** The main tabs: along the top on a computer, along the bottom on a phone. A dot marks a tab with something new. */
function TabBar({ g, top = false }: { g: GameState; top?: boolean }) {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const seen = useStore((s) => s.seen);
  return (
    <nav className={top ? 'toptabs' : 'tabbar'} aria-label="Main">
      {(Object.keys(UI.tabs) as Tab[]).map((t) => {
        const fresh = t !== tab && seen[t] !== undefined && seen[t] !== tabKey(g, t);
        return (
          <button key={t} data-tour={`tab-${t}`} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)} title={`${UI.tabs[t]} (${t[0].toUpperCase()})`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

const SHORT_MODE: Record<string, string> = { standard: 'Regular', reality: 'Reality', stars: 'Stars', fast: 'Fast', lab: 'Lab' };

/** The difficulty, always in view (round 15), and Master mode when it is on. */
function ModeBadge({ g }: { g: GameState }) {
  const master = useStore((s) => s.master);
  return (
    <span className={`mode-badge mode-${g.mode}`} title="Difficulty">
      {ICON_FOR[g.mode] && <Icon name={ICON_FOR[g.mode]} size={14} />}
      <span className="long">{MODES[g.mode]?.name ?? g.mode}</span>
      <span className="short">{SHORT_MODE[g.mode] ?? g.mode}</span>
      {master && <b> · Master</b>}
    </span>
  );
}

export function App() {
  const game = useStore((s) => s.game);
  const tab = useStore((s) => s.tab);
  const theme = useStore((s) => s.theme);
  const court = useStore((s) => s.court);
  const mini = useStore((s) => s.mini);
  const page = useStore((s) => s.page);
  const simple = useStore((s) => s.simple);
  useEffect(() => {
    document.documentElement.classList.toggle('simple', simple);
  }, [simple]);

  useEffect(() => {
    const root = document.documentElement;
    // "Auto" goes back to whatever the host page set (or the OS setting if nothing)
    if (theme === 'auto') {
      if (HOST_THEME) root.setAttribute('data-theme', HOST_THEME);
      else root.removeAttribute('data-theme');
    } else root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (court === 'classic') document.documentElement.removeAttribute('data-court');
    else document.documentElement.setAttribute('data-court', court);
  }, [court]);

  useKeys(!mini && !!game);
  // round 25: sound. The first click wakes the audio; music plays with a career on screen (a
  // mini-game has its own); what happens in the game has its own sounds
  useEffect(() => wakeOnClick(), []);
  useEffect(() => music(!!game && !mini && !page), [game, mini, page]);
  useEffect(
    () =>
      useStore.subscribe((now, before) => {
        if (now.toasts.length > before.toasts.length) sfx('achievement');
        const g = now.game;
        const b = before.game;
        if (!g || !b || g === b) return;
        if (g.purchases.length > b.purchases.length) sfx('coins');
        const seen = new Set(b.moments.map((m) => m.id));
        const fresh = g.moments.find((m) => !seen.has(m.id));
        if (!fresh) return;
        if (fresh.logo) sfx('nickname');
        else if (fresh.kind === 'title') sfx(fresh.mood === 'champion' ? 'title' : 'lose');
        else if (fresh.lostFinal) sfx('lose');
        else if (fresh.kind === 'awards' || fresh.kind === 'draft') sfx('award');
        else if (fresh.kind === 'injury') sfx('injury');
        else if (fresh.kind === 'fine') sfx('fine');
      }),
    [],
  );

  if (page === 'log') return <CareerLog />;
  if (page === 'achievements') return <AchievementBook />;
  if (page === 'community') return <CommunityPage />;
  if (mini) return <MiniGames />;
  if (!game) return <Create />;

  const retired = game.step === 'retired';
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
            <GuideButton />
            <SettingsMenu g={game} />
          </div>
        </header>
        {game.flags.daily ? <DailyStrip g={game} /> : null}
        <div className="tab-view" key={tab}>
          {tab === 'home' && (retired ? <Retirement g={game} /> : <Home g={game} />)}
          {tab === 'season' && <SeasonTab g={game} />}
          {tab === 'player' && <PlayerTab g={game} />}
          {tab === 'league' && <LeagueTab g={game} />}
          {tab === 'records' && <RecordsTab g={game} />}
        </div>
      </div>
      <Overlays g={game} />
      <TabBar g={game} />
    </>
  );
}
