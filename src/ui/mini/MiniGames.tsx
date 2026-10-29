// Mini-games (rounds 10-12): Front Office, the three-point and dunk contests, Built in a lab and the legends showdown.
// They sit beside the career: opening one never touches the career in progress.

import { useStore } from '../../store';
import { FrontOffice } from './FrontOffice';
import { LegendsGame } from './Legends';
import { ThreesGame } from './Threes';
import { LabGame } from './LabGame';
import { DunkGame } from './Dunk';

const GAMES = [
  { id: 'office' as const, name: 'Front Office', text: 'Run an NBA franchise for four seasons. Scout the draft, trade, sign players from Europe and beyond, set the game plan, and win a title before the owner loses patience.' },
  { id: 'threes' as const, name: 'Three-point contest', text: 'Five racks, sixty seconds, a money-ball rack of your choice. Stop the meter in the green. Beat seven of the best shooters ever.' },
  { id: 'dunk' as const, name: 'Dunk contest', text: 'Design your dunks (takeoff, moves, props) and land them one timing tap at a time. Five judges, two rounds, three of the best dunkers ever.' },
  { id: 'lab' as const, name: 'Built in a lab', text: 'Design a player and build him over ten seasons: spend each summer\'s credits on ratings, then watch the season play out. Two minutes a run.' },
  { id: 'legends' as const, name: 'Legends showdown', text: 'Every franchise plays with its all-time starting five. Pick one, survive a season against all the others, then beat the powerhouses in four playoff rounds.' },
];

export function MiniGames() {
  const mini = useStore((s) => s.mini);
  const setMini = useStore((s) => s.setMini);
  const hasCareer = useStore((s) => !!s.game);
  return (
    <div className="wrap no-tabs">
      <header className="top">
        <div className="brand">
          Bench to <span>Rafters</span>
        </div>
        <div className="top-right">
          {mini !== 'hub' && (
            <button className="icon-btn" onClick={() => setMini('hub')}>
              All games
            </button>
          )}
          <button className="icon-btn exit-btn" onClick={() => setMini(null)}>
            {hasCareer ? 'Back to career' : 'Exit'}
          </button>
        </div>
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
          <p className="muted small">Your career is safe: tap Back to career any time. With a career in progress, a good showing earns your player a small rating bonus: two claims a season (the second at half value).</p>
        </section>
      )}
      {mini === 'office' && <FrontOffice />}
      {mini === 'threes' && <ThreesGame />}
      {mini === 'legends' && <LegendsGame />}
      {mini === 'dunk' && <DunkGame />}
      {mini === 'lab' && <LabGame />}
    </div>
  );
}

/** The entry button used on the start page and at the bottom of Home. */
export function MiniGamesCard() {
  const setMini = useStore((s) => s.setMini);
  return (
    <section className="card stack">
      <div className="sec-title">Mini-games</div>
      <p className="small muted">Front Office, the three-point and dunk contests, Built in a lab and the legends showdown.</p>
      <button className="btn ghost" onClick={() => setMini('hub')}>
        Play a mini-game
      </button>
    </section>
  );
}

