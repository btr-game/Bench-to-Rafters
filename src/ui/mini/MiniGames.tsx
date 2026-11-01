// Mini-games (rounds 10-12): Front Office, the three-point and dunk contests, Built in a lab and the legends showdown.
// They sit beside the career: opening one never touches the career in progress.

import { FootBar } from '../components/FootBar';
import { Icon } from '../art/Icon';
import { ICON_FOR } from '../art/icons';
import { ROAD_MINIS, ROAD_NEED, inTutorial, passGrade, type RoadMini } from '../road';
import { useStore } from '../../store';
import { PageTop } from '../components/PageTop';
import { MINI_CLAIMS, claimsUsed, miniProgress, type MiniId } from '../../engine/career/miniBonus';
import { FrontOffice } from './FrontOffice';
import { LegendsGame } from './Legends';
import { ThreesGame } from './Threes';
import { LabGame } from './LabGame';
import { DunkGame } from './Dunk';
import { StreetballGame } from './Streetball';
import { LockdownGame } from './Lockdown';
import { DailyGame } from './Daily';

const GAMES: { id: MiniId | 'daily'; name: string; text: string; tag: string; color: string }[] = [
  { id: 'daily' as const, tag: 'Every day', color: '#0B7285', name: 'Daily challenge', text: 'One prospect a day, the same for everyone. A whole career with fast break and simple text, scored by the legacy he leaves. From the start page, when no career is in progress.' },
  { id: 'office' as const, tag: 'Strategy', color: '#1C7ED6', name: 'Front Office', text: 'Run an NBA franchise for three seasons. Scout the draft, trade, sign players from Europe and beyond, set the game plan, and win a title before the owner loses patience.' },
  { id: 'threes' as const, tag: 'Timing', color: '#E8590C', name: 'Three-point contest', text: 'Five racks, sixty seconds, a money-ball rack of your choice. Stop the meter in the green. Beat seven of the best shooters ever.' },
  { id: 'dunk' as const, tag: 'Timing', color: '#C2255C', name: 'Dunk contest', text: 'Design your dunks (takeoff, moves, props) and land them one timing tap at a time. Five judges, two rounds, three of the best dunkers ever.' },
  { id: 'lab' as const, tag: 'Building', color: '#2F9E44', name: 'Built in a lab', text: 'Design a player and build him over ten seasons: spend each summer\'s credits on ratings, then watch the season play out. Two minutes a run.' },
  { id: 'street' as const, tag: 'Action', color: '#2B8A3E', name: '3-on-3 streetball', text: 'One game to 11 at a city park against the crew that holds the court, by ones and twos, make it take it. Pick the play, time your drives and pull-ups on the action cam, read their defense.' },
  { id: 'rhythm' as const, tag: 'Rhythm', color: '#5F3DC4', name: 'Lockdown', text: 'A rhythm game of defense: the offense runs its sets to the beat, you block (A) and steal (S) on time and hold the long notes. Fourteen sets in a random order, under a minute a run. Pays perimeter and interior defense.' },
  { id: 'legends' as const, tag: 'Strategy', color: '#B08900', name: 'Legends showdown', text: 'Every franchise plays with its all-time starting five. Join one (with a career: your own player), mind the chemistry, survive the season, then beat the powerhouses in four playoff rounds.' },
];

/** The lobby: big cards. With a career, a game opens once his ratings reach it (round 15). */
function Hub() {
  const setMini = useStore((s) => s.setMini);
  const game = useStore((s) => s.game);
  const career = game && game.step !== 'retired' ? game : null;
  // round 33: in the tutorial this is the island: every game once, a C or better
  const road = useStore((s) => s.road);
  const island = inTutorial(road);
  return (
    <section className="stack stage-in">
      <div>
        <div className="kicker">Mini-games</div>
        <h1 className="hub-title with-icon">
          <Icon name="controller" size={40} />
          Pick a game
        </h1>
        <p className="small muted">
          {island
            ? `The island: play each game once and get a C or better. ${ROAD_MINIS.filter((m) => passGrade(road.minis[m])).length} of ${ROAD_MINIS.length} done.`
            : career
            ? `For ${career.player.name}: each game opens when his ratings reach it, and a good result earns a rating bonus (${MINI_CLAIMS.perSeason - claimsUsed(career)} of ${MINI_CLAIMS.perSeason} claims left this season).`
            : 'Free play: every game is open. With a career in progress, games unlock as your player grows and pay a rating bonus.'}
        </p>
      </div>
      <div className="hub-grid">
        {GAMES.filter((x) => !island || x.id !== 'daily').map((x) => {
          const pr = career && x.id !== 'daily' ? miniProgress(career, x.id) : null;
          // the daily challenge is its own career: only from the start page, not during one
          const dailyShut = x.id === 'daily' && !!career;
          const locked = (!!pr && !pr.open) || dailyShut;
          return (
            <button key={x.id} className={`hub-card${locked ? ' locked' : ''}`} style={{ ['--hub' as string]: x.color }} disabled={locked} onClick={() => setMini(x.id)}>
              <span className="hub-band">
                <span>{x.tag}</span>
                {(pr || dailyShut) && <span className={`hub-state${locked ? '' : ' open'}`}>{locked ? 'Locked' : 'Unlocked'}</span>}
              </span>
              <b className="hub-name with-icon">
                <Icon name={x.id === 'office' ? 'office' : x.id === 'lab' ? 'lab' : x.id === 'daily' ? 'calendar' : x.id === 'rhythm' ? 'lockdown' : ICON_FOR[x.id] ?? ''} size={34} />
                {x.name}
              </b>
              <small>{x.text}</small>
              {island && x.id !== 'daily' && (
                <span className={`hub-req island-req${passGrade(road.minis[x.id as RoadMini]) ? ' done' : ''}`}>
                  <span>
                    C: {ROAD_NEED[x.id as RoadMini]}
                    {road.minis[x.id as RoadMini] ? ` · best ${road.minis[x.id as RoadMini]}` : ''}
                  </span>
                </span>
              )}
              {dailyShut && (
                <span className="hub-req">
                  <span>Not during a career: play it from the start page, or once this career is over.</span>
                </span>
              )}
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
      {!island && <p className="muted small">Your career is safe: Back to career is always at the top right.</p>}
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

const MINI_NAME: Record<string, string> = Object.fromEntries(GAMES.map((x) => [x.id, x.name]));

export function MiniGames() {
  const mini = useStore((s) => s.mini);
  const setMini = useStore((s) => s.setMini);
  const hasCareer = useStore((s) => !!s.game);
  const island = useStore((s) => inTutorial(s.road));
  return (
    <div className="wrap no-tabs">
      {/* round 27: the shared page top; in a game the way back is the hub, and the career is one tap away */}
      <PageTop
        trail={mini === 'hub' || !mini ? ['Mini-games'] : ['Mini-games', MINI_NAME[mini] ?? mini]}
        back={() => setMini(mini === 'hub' ? null : 'hub')}
        backLabel={mini === 'hub' ? undefined : 'All mini-games'}
        extra={
          mini !== 'hub' && (
            <button className="icon-btn exit-btn" onClick={() => setMini(null)}>
              {hasCareer ? 'Back to the career' : island ? 'Back to the road map' : 'Exit'}
            </button>
          )
        }
      />
      {mini === 'hub' && <Hub />}
      {mini === 'office' && <FrontOffice />}
      {mini === 'threes' && <ThreesGame />}
      {mini === 'legends' && <LegendsGame />}
      {mini === 'dunk' && <DunkGame />}
      {mini === 'lab' && <LabGame />}
      {mini === 'street' && <StreetballGame />}
      {mini === 'rhythm' && <LockdownGame />}
      {mini === 'daily' && <DailyGame />}
      <FootBar where={`mini-games, ${mini === 'hub' || !mini ? 'hub' : MINI_NAME[mini] ?? mini}${hasCareer ? ', with a career' : ''}`} />
    </div>
  );
}

/** The entry on the start page and on a career's Extras tab (round 29; at the foot of Home before). */
export function MiniGamesCard() {
  const setMini = useStore((s) => s.setMini);
  const daily = useStore((s) => !!s.game?.flags.daily);
  const live = useStore((s) => !!s.game && s.game.step !== 'retired');
  return (
    <section className={`card stack${daily ? ' mini-locked' : ''}`}>
      <div className="sec-title with-icon">
        <Icon name={daily ? 'lock' : 'controller'} size={28} />
        Mini-games
      </div>
      {daily ? (
        <p className="small muted">Locked during the daily challenge, so a run stays quick. They open again when you go back to your career.</p>
      ) : (
        <>
          <p className="small muted">
            {live
              ? 'Front Office, the three-point and dunk contests, 3-on-3 streetball, Lockdown, Built in a lab and the legends showdown. Each opens when your ratings reach it, and a good result pays a rating bonus. The daily challenge waits for the start page.'
              : 'Front Office, the three-point and dunk contests, 3-on-3 streetball, Lockdown, Built in a lab, the legends showdown and the daily challenge. With a career, each opens when your ratings reach it.'}
          </p>
          <button className="btn ghost" data-tour="minis" onClick={() => setMini('hub')}>
            Play a mini-game
          </button>
        </>
      )}
    </section>
  );
}

