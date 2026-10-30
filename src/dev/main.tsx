import React from 'react';
import ReactDOM from 'react-dom/client';
import { DevDeck } from './DevDeck';
import { setAchievements } from './cards';
import '../ui/styles/app.css';
import './dev.css';

// this page never keeps a career of its own, and every achievement starts earned (so none pop up)
try {
  localStorage.setItem('btr-guide-seen', '1');
  localStorage.removeItem('btr-save-v1');
} catch {
  // storage blocked: the deck still works, the start page just shows its first-visit sheet
}
setAchievements(true);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DevDeck />
  </React.StrictMode>,
);
