// dev mode first: its storage prefix has to be in place before the store reads anything
import './dev/storage';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import { GuideTour } from './ui/components/GuideTour';
import { TabNews } from './ui/components/TabNews';
import { AchToasts } from './ui/screens/Achievements';
import { Loading } from './ui/components/Loading';
import { Look } from './ui/components/Look';
import './ui/styles/app.css';
import { DECK_LOGO, GAME_LOGO, setFavicon } from './ui/art/favicon';
import { DEV } from './dev/mode';
import { DevDeck, devSetup } from './dev/DevDeck';

setFavicon(DEV ? DECK_LOGO : GAME_LOGO);
if (DEV) devSetup();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {DEV ? (
      <DevDeck />
    ) : (
      <>
        <App />
        <GuideTour />
        <TabNews />
        <AchToasts />
      </>
    )}
    <Loading />
    <Look />
  </React.StrictMode>,
);
