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
import { Overlays } from './components/Overlays';
import { MiniGames } from './mini/MiniGames';

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
          <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)} title={`${UI.tabs[t]} (${t[0].toUpperCase()})`}>
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

/** Simple text, one tap from anywhere (round 15: next to Fast break). */
function SimpleChip() {
  const on = useStore((s) => s.simple);
  const toggle = useStore((s) => s.toggleSimple);
  return (
    <button className={`fast-toggle${on ? ' on' : ''}`} aria-pressed={on} onClick={toggle} title="Simple text: hide descriptions and flavour, keep the choices">
      <span className="fast-dot" aria-hidden="true" />
      Simple<span className="hide-narrow"> text</span>
    </button>
  );
}

const SHORT_MODE: Record<string, string> = { standard: 'Regular', reality: 'Reality', stars: 'Stars', fast: 'Fast', lab: 'Lab' };

/** The difficulty, always in view (round 15), and Master mode when it is on. */
function ModeBadge({ g }: { g: GameState }) {
  const master = useStore((s) => s.master);
  return (
    <span className={`mode-badge mode-${g.mode}`} title="Difficulty">
      <span className="long">{MODES[g.mode]?.name ?? g.mode}</span>
      <span className="short">{SHORT_MODE[g.mode] ?? g.mode}</span>
      {master && <b> · Master</b>}
    </span>
  );
}

/** Fast break, one tap from anywhere. */
function FastChip({ g }: { g: GameState }) {
  const toggle = useStore((s) => s.toggleFast);
  if (g.mode === 'lab' || g.step === 'retired') return null;
  const on = !!g.flags.fast;
  return (
    <button className={`fast-toggle${on ? ' on' : ''}`} aria-pressed={on} onClick={toggle} title="Fast break: quick seasons, you still make every real call">
      <span className="fast-dot" aria-hidden="true" />
      Fast<span className="hide-narrow"> break</span>
    </button>
  );
}

export function App() {
  const game = useStore((s) => s.game);
  const tab = useStore((s) => s.tab);
  const theme = useStore((s) => s.theme);
  const court = useStore((s) => s.court);
  const mini = useStore((s) => s.mini);
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
            <FastChip g={game} />
            <SimpleChip />
            <GuideButton />
            <SettingsMenu g={game} />
          </div>
        </header>
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
