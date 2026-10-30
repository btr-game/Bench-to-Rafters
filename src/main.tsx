import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import { GuideTour } from './ui/components/GuideTour';
import { AchToasts } from './ui/screens/Achievements';
import './ui/styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <GuideTour />
    <AchToasts />
  </React.StrictMode>,
);
