import { useEffect, useState, type ReactNode } from 'react';
import { useStore, type Tab } from '../store';
import { UI } from '../content/strings';
import { Create } from './screens/Create';
import { Home } from './screens/Home';
import { LeagueTab, PlayerTab, RecordsTab, SeasonTab } from './screens/Tabs';
import { Retirement } from './screens/Retirement';

const HOST_THEME = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;

const ICONS: Record<Tab, ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  season: <path d="M4 5h16v15H4zM4 9h16M9 3v4M15 3v4" />,
  player: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0" />,
  league: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  records: <path d="M7 4h10v5a5 5 0 0 1-10 0zM12 14v4M8 21h8M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />,
};

function TabBar() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  return (
    <nav className="tabbar" aria-label="Main">
      {(Object.keys(UI.tabs) as Tab[]).map((t) => (
        <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[t]}
          </svg>
          {UI.tabs[t]}
        </button>
      ))}
    </nav>
  );
}

function ThemeButton() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const next = theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto';
  return (
    <button className="icon-btn" onClick={() => setTheme(next)} aria-label={`Theme: ${theme}. Switch to ${next}.`}>
      {theme === 'auto' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}

/** Two taps to abandon a career (browser confirm dialogs are not available everywhere). */
function NewButton({ retired, onReset }: { retired: boolean; onReset: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button className="icon-btn" onClick={() => (retired || armed ? onReset() : setArmed(true))}>
      {armed ? 'Tap again to quit' : 'New'}
    </button>
  );
}

export function App() {
  const game = useStore((s) => s.game);
  const tab = useStore((s) => s.tab);
  const theme = useStore((s) => s.theme);
  const reset = useStore((s) => s.reset);

  useEffect(() => {
    const root = document.documentElement;
    // "Auto" goes back to whatever the host page set (or the OS setting if nothing)
    if (theme === 'auto') {
      if (HOST_THEME) root.setAttribute('data-theme', HOST_THEME);
      else root.removeAttribute('data-theme');
    } else root.setAttribute('data-theme', theme);
  }, [theme]);

  if (!game) return <Create />;

  const retired = game.step === 'retired';
  return (
    <>
      <div className="wrap">
        <header className="top">
          <div className="brand">
            Bench to <span>Rafters</span>
          </div>
          <div className="top-right">
            <ThemeButton />
            <NewButton retired={retired} onReset={reset} />
          </div>
        </header>
        {tab === 'home' && (retired ? <Retirement g={game} /> : <Home g={game} />)}
        {tab === 'season' && <SeasonTab g={game} />}
        {tab === 'player' && <PlayerTab g={game} />}
        {tab === 'league' && <LeagueTab g={game} />}
        {tab === 'records' && <RecordsTab g={game} />}
      </div>
      <TabBar />
    </>
  );
}
