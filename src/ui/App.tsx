import { GuideButton } from './components/Guide';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { GameState } from '../engine/types';
import { MODES } from '../engine/balance';
import { ovrOf } from '../engine/player/ovr';
import { NextStep, SettingsMenu, useKeys } from './components/Settings';
import { ShareButton } from './components/Share';
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
import { FootBar } from './components/FootBar';
import { Intro } from './screens/Intro';
import { Thanks } from './screens/Thanks';
import { ICON_FOR } from './art/icons';
import { music, sfx, wakeOnClick } from './sound';


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
      {g.flags.oath ? (
        <b className="oath-badge with-icon">
          {' · '}
          <Icon name="oath" size={14} />
          No Shortcuts
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
  const thanks = useStore((s) => s.thanks);
  const simple = useStore((s) => s.simple);
  useEffect(() => {
    document.documentElement.classList.toggle('simple', simple);
  }, [simple]);
  // round 27 (navigation): a tab opens at its top, not where the last one was scrolled to, and the
  // browser tab says where you are
  useEffect(() => {
    window.scrollTo(0, 0); // braces: newer browsers return a promise from scrollTo, and an effect may only return its clean-up
  }, [tab, page, mini]);
  useEffect(() => {
    const where = mini ? 'Mini-games' : page === 'log' ? 'Career log' : page === 'achievements' ? 'Achievement book' : page === 'community' ? 'Community' : game ? UI.tabs[tab] : '';
    document.title = where ? `${where} · Bench to Rafters` : 'Bench to Rafters';
  }, [tab, page, mini, game]);
  const fast = !!game?.flags.fast && game.step !== 'retired';


  useKeys(!mini && !!game);
  // round 25: sound. The first click or key wakes the audio; the music plays from the start (owner:
  // "the background music should be playing from the very start of the game"), everywhere but the
  // mini-games, which have their own; what happens in the game has its own sounds
  useEffect(() => wakeOnClick(), []);
  useEffect(() => music(!mini), [mini]);
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
        if (fresh.logo) sfx('nickname');
        else if (fresh.kind === 'title') sfx(fresh.mood === 'champion' ? 'title' : 'lose');
        else if (fresh.lostFinal) sfx('lose');
        else if (fresh.kind === 'awards' || fresh.kind === 'draft') sfx('award');
        else if (fresh.kind === 'injury') sfx('injury');
        else if (fresh.kind === 'fine') sfx('fine');
      }),
    [],
  );

  if (thanks && !game) return <Thanks g={thanks} />;
  if (intro && !game) return <Intro />;
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
            <ShareButton />
            <GuideButton />
            <SettingsMenu g={game} />
          </div>
        </header>
        {game.flags.daily ? <DailyStrip g={game} /> : null}
        <TabView key={tab} fast={fast}>
          {tab === 'home' && (retired ? <Retirement g={game} /> : <Home g={game} />)}
          {tab === 'season' && <SeasonTab g={game} />}
          {tab === 'player' && <PlayerTab g={game} />}
          {tab === 'league' && <LeagueTab g={game} />}
          {tab === 'records' && <RecordsTab g={game} />}
        </TabView>
        <FootBar where={`${tab} tab, ${MODES[game.mode]?.name ?? game.mode}, age ${game.player.age}`} />
      </div>
      <Overlays g={game} />
      <TabBar g={game} />
    </>
  );
}
