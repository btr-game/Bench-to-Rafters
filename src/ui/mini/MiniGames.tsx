// Mini-games (round 10): Front Office, the three-point contest and the legends showdown.
// They sit beside the career: opening one never touches the career in progress.

import { useStore } from '../../store';
import { FrontOffice } from './FrontOffice';
import { LegendsGame } from './Legends';
import { ThreesGame } from './Threes';
import { Create } from '../screens/Create';

const GAMES = [
  { id: 'office' as const, name: 'Front Office', text: 'Run an NBA franchise for six seasons. Scout the draft, trade, sign players from Europe and beyond, set the game plan, and win a title before the owner loses patience.' },
  { id: 'threes' as const, name: 'Three-point contest', text: 'Five racks, sixty seconds, a money-ball rack of your choice. Stop the meter in the green. Beat seven of the best shooters ever.' },
  { id: 'lab' as const, name: 'Built in a lab', text: 'A career where you build the player: training and events pay out credits you spend on any rating, and you pick your height. Fast-break pace.' },
  { id: 'legends' as const, name: 'Legends showdown', text: 'Every franchise plays with its all-time starting five. Pick one, survive a season against all the others, then beat the powerhouses in four playoff rounds.' },
];

export function MiniGames() {
  const mini = useStore((s) => s.mini);
  const setMini = useStore((s) => s.setMini);
  const back = () => setMini(mini === 'hub' ? null : 'hub');
  if (mini === 'lab') return <Create lab />;
  return (
    <div className="wrap no-tabs">
      <header className="top">
        <div className="brand">
          Bench to <span>Rafters</span>
        </div>
        <button className="icon-btn" onClick={back}>
          {mini === 'hub' ? 'Close' : 'All games'}
        </button>
      </header>
      {mini === 'hub' && (
        <section className="stack">
          <div className="kicker">Mini-games</div>
          <div className="modes">
            {GAMES.map((g) => (
              <button key={g.id} className="choice mode-card" onClick={() => setMini(g.id)}>
                <span className="label">{g.name}</span>
                <small>{g.text}</small>
              </button>
            ))}
          </div>
          <p className="muted small">Your career is safe: close the mini-games to go back to it. With a career in progress, a good showing earns your player a small rating bonus, once per mini-game per season.</p>
        </section>
      )}
      {mini === 'office' && <FrontOffice />}
      {mini === 'threes' && <ThreesGame />}
      {mini === 'legends' && <LegendsGame />}
    </div>
  );
}

/** The entry button used on the start page and at the bottom of Home. */
export function MiniGamesCard() {
  const setMini = useStore((s) => s.setMini);
  return (
    <section className="card stack">
      <div className="sec-title">Mini-games</div>
      <p className="small muted">Front Office, the three-point contest, Built in a lab and the legends showdown.</p>
      <button className="btn ghost" onClick={() => setMini('hub')}>
        Play a mini-game
      </button>
    </section>
  );
}

