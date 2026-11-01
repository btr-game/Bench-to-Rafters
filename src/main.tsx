// the storage prefix first: it has to be in place before the store reads anything
import './dev/storage';
import React, { useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import { GuideTour } from './ui/components/GuideTour';
import { Lessons } from './ui/tutorial/Lessons';
import { TabNews } from './ui/components/TabNews';
import { AchToasts } from './ui/screens/Achievements';
import { Loading } from './ui/components/Loading';
import { Look } from './ui/components/Look';
import './ui/styles/app.css';
import { DECK_LOGO, GAME_LOGO, setFavicon } from './ui/art/favicon';
import { isDev, onDev } from './dev/mode';
import { DevDeck, devSetup } from './dev/DevDeck';
import { joinCourt } from './ui/community';

setFavicon(isDev() ? DECK_LOGO : GAME_LOGO);
onDev((on) => setFavicon(on ? DECK_LOGO : GAME_LOGO));
// a page reloaded in the deck (or opened into it by the visual check) starts there
if (isDev()) devSetup();
joinCourt();

/** The game, or the dev deck in its place (round 28: a page of the game, flipped in place). */
function Root() {
  const dev = useSyncExternalStore(onDev, isDev);
  return dev ? (
    <DevDeck />
  ) : (
    <>
      <App />
      <GuideTour />
      <Lessons />
      <TabNews />
      <AchToasts />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
    <Loading />
    <Look />
  </React.StrictMode>,
);
