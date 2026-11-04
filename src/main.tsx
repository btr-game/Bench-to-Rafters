// the storage prefix first: it has to be in place before the store reads anything
import './dev/storage';
import React, { Fragment, useSyncExternalStore, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import { GuideTour } from './ui/components/GuideTour';
import { Lessons } from './ui/tutorial/Lessons';
import { TabNews } from './ui/components/TabNews';
import { AchToasts } from './ui/screens/Achievements';
import { Loading } from './ui/components/Loading';
import { Look } from './ui/components/Look';
import { Safe } from './ui/components/Safe';
import { useStore } from './store';
import './ui/styles/app.css';
import { DECK_LOGO, GAME_LOGO, setFavicon } from './ui/art/favicon';
import { isDev, onDev } from './dev/mode';
import { DevDeck, devSetup } from './dev/DevDeck';
import { joinCourt } from './ui/community';
import { lang, onLang } from './i18n';

setFavicon(isDev() ? DECK_LOGO : GAME_LOGO);
onDev((on) => setFavicon(on ? DECK_LOGO : GAME_LOGO));
// a page reloaded in the deck (or opened into it by the visual check) starts there
if (isDev()) devSetup();
joinCourt();

/** The game, or the dev deck in its place (round 28: a page of the game, flipped in place). */
function Root() {
  const dev = useSyncExternalStore(onDev, isDev);
  // after round 40: a part that fails to draw keeps to itself (components/Safe.tsx)
  const game = useStore((s) => s.game);
  return dev ? (
    <DevDeck />
  ) : (
    <>
      <Safe name="game" kind="page" again={game}>
        <App />
      </Safe>
      <Safe name="guide mode" kind="quiet" again={game}>
        <GuideTour />
      </Safe>
      <Safe name="lessons" kind="quiet" again={game}>
        <Lessons />
      </Safe>
      <Safe name="tab news" kind="quiet" again={game}>
        <TabNews />
      </Safe>
      <Safe name="achievement toasts" kind="quiet" again={game}>
        <AchToasts />
      </Safe>
    </>
  );
}

/** Round 40: a new language draws every screen again, in it. */
function Lang({ children }: { children: ReactNode }) {
  const l = useSyncExternalStore(onLang, lang);
  return <Fragment key={l}>{children}</Fragment>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Lang>
      <Root />
      <Loading />
      <Look />
    </Lang>
  </React.StrictMode>,
);
