// Mini-games (rounds 10-12): Front Office, the three-point and dunk contests, Built in a lab and the legends showdown.
// They sit beside the career: opening one never touches the career in progress.

import { Icon } from '../art/Icon';
import { ICON_FOR } from '../art/icons';
import { useStore } from '../../store';
import { MINI_CLAIMS, claimsUsed, miniProgress, type MiniId } from '../../engine/career/miniBonus';
import { FrontOffice } from './FrontOffice';
import { LegendsGame } from './Legends';
import { ThreesGame } from './Threes';
import { LabGame } from './LabGame';
import { DunkGame } from './Dunk';
import { StreetballGame } from './Streetball';
import { DailyGame } from './Daily';

const GAMES: { id: MiniId | 'daily'; name: string; text: string; tag: string; color: string }[] = [
  { id: 'daily' as const, tag: 'Every day', color: '#0B7285', name: 'Daily challenge', text: 'One prospect a day, the same for everyone. A whole career with fast break and simple text, scored by the legacy he leaves. Your own career waits.' },
  { id: 'office' as const, tag: 'Strategy', color: '#1C7ED6', name: 'Front Office', text: 'Run an NBA franchise for three seasons. Scout the draft, trade, sign players from Europe and beyond, set the game plan, and win a title before the owner loses patience.' },
  { id: 'threes' as const, tag: 'Timing', color: '#E8590C', name: 'Three-point contest', text: 'Five racks, sixty seconds, a money-ball rack of your choice. Stop the meter in the green. Beat seven of the best shooters ever.' },
  { id: 'dunk' as const, tag: 'Timing', color: '#C2255C', name: 'Dunk contest', text: 'Design your dunks (takeoff, moves, props) and land them one timing tap at a time. Five judges, two rounds, three of the best dunkers ever.' },
  { id: 'lab' as const, tag: 'Building', color: '#2F9E44', name: 'Built in a lab', text: 'Design a player and build him over ten seasons: spend each summer\'s credits on ratings, then watch the season play out. Two minutes a run.' },
  { id: 'street' as const, tag: 'Action', color: '#2B8A3E', name: '3-on-3 streetball', text: 'King of the court at a city park: beat three crews in a row by ones and twos, make it take it. Pick the play, time your finishes at the rim, read their defense.' },
  { id: 'legends' as const, tag: 'Strategy', color: '#B08900', name: 'Legends showdown', text: 'Every franchise plays with its all-time starting five. Join one (with a career: your own player), mind the chemistry, survive the season, then beat the powerhouses in four playoff rounds.' },
];

/** The lobby: big cards. With a career, a game opens once his ratings reach it (round 15). */
function Hub() {
  const setMini = useStore((s) => s.setMini);
  const game = useStore((s) => s.game);
  const career = game && game.step !== 'retired' ? game : null;
  return (
    <section className="stack stage-in">
      <div>
        <div className="kicker">Mini-games</div>
        <h1 className="hub-title with-icon">
          <Icon name="controller" size={40} />
          Pick a game
        </h1>
        <p className="small muted">
          {career
            ? `For ${career.player.name}: each game opens when his ratings reach it, and a good result earns a rating bonus (${MINI_CLAIMS.perSeason - claimsUsed(career)} of ${MINI_CLAIMS.perSeason} claims left this season).`
            : 'Free play: every game is open. With a career in progress, games unlock as your player grows and pay a rating bonus.'}
        </p>
      </div>
      <div className="hub-grid">
        {GAMES.map((x) => {
          const pr = career && x.id !== 'daily' ? miniProgress(career, x.id) : null;
          const locked = !!pr && !pr.open;
          return (
            <button key={x.id} className={`hub-card${locked ? ' locked' : ''}`} style={{ ['--hub' as string]: x.color }} disabled={locked} onClick={() => setMini(x.id)}>
              <span className="hub-band">
                <span>{x.tag}</span>
                {pr && <span className={`hub-state${locked ? '' : ' open'}`}>{locked ? 'Locked' : 'Unlocked'}</span>}
              </span>
              <b className="hub-name with-icon">
                <Icon name={x.id === 'office' ? 'office' : x.id === 'lab' ? 'lab' : x.id === 'daily' ? 'calendar' : ICON_FOR[x.id] ?? ''} size={34} />
                {x.name}
              </b>
              <small>{x.text}</small>
              {pr && (
                <span className="hub-req">
                  <span>
                    {locked ? 'Unlocks at' : 'Needed'} {pr.label} {pr.at}
                    {locked && <> · now {Math.round(pr.value)}</>}
                  </span>
                  {locked && (
                    <span className="hub-bar">
                      <i style={{ width: `${Math.max(4, Math.min(100, (pr.value / pr.at) * 100))}%` }} />
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="muted small">Your career is safe: Back to career is always at the top right.</p>
    </section>
  );
}

/** The end of every mini-game (round 15: "back to career should be emphasized"). */
export function MiniEnd({ children }: { children?: React.ReactNode }) {
  const setMini = useStore((s) => s.setMini);
  const hasCareer = useStore((s) => !!s.game && s.game.step !== 'retired');
  return (
    <section className="card stack mini-end">
      {children}
      <div className="mini-end-actions">
        {hasCareer && (
          <button className="btn mini-end-back" onClick={() => setMini(null)}>
            Back to career
          </button>
        )}
        <button className={`btn ${hasCareer ? 'ghost' : ''}`} onClick={() => setMini('hub')}>
          Other mini-games
        </button>
      </div>
    </section>
  );
}

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
      {mini === 'hub' && <Hub />}
      {mini === 'office' && <FrontOffice />}
      {mini === 'threes' && <ThreesGame />}
      {mini === 'legends' && <LegendsGame />}
      {mini === 'dunk' && <DunkGame />}
      {mini === 'lab' && <LabGame />}
      {mini === 'street' && <StreetballGame />}
      {mini === 'daily' && <DailyGame />}
    </div>
  );
}

/** The entry button used on the start page and at the bottom of Home. */
export function MiniGamesCard() {
  const setMini = useStore((s) => s.setMini);
  return (
    <section className="card stack">
      <div className="sec-title with-icon">
        <Icon name="controller" size={28} />
        Mini-games
      </div>
      <p className="small muted">Front Office, the three-point and dunk contests, 3-on-3 streetball, Built in a lab, the legends showdown and the daily challenge. With a career, each opens when your ratings reach it.</p>
      <button className="btn ghost" onClick={() => setMini('hub')}>
        Play a mini-game
      </button>
    </section>
  );
}

