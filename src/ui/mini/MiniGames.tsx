// Mini-games (rounds 10-12): the three-point and dunk contests, Built in a lab and the legends showdown
// (round 39: the Floor in Front Office's place).
// They sit beside the career: opening one never touches the career in progress.

import { FootBar } from '../components/FootBar';
import { Icon } from '../art/Icon';
import { ICON_FOR } from '../art/icons';
import { ROAD_MINIS, ROAD_NEED, passGrade, unlockHint, unlocked, type RoadMini } from '../road';
import { useStore } from '../../store';
import { PageTop } from '../components/PageTop';
import { MINI_CLAIMS, claimsUsed, miniProgress, type MiniId } from '../../engine/career/miniBonus';
import { FloorGame } from './FloorGame';
import { LegendsGame } from './Legends';
import { ThreesGame } from './Threes';
import { LabGame } from './LabGame';
import { DunkGame } from './Dunk';
import { StreetballGame } from './Streetball';
import { LockdownGame } from './Lockdown';
import { DailyGame } from './Daily';
import { t, tx } from '../../i18n';

/** A mini-game's icon (the Catalog's island list uses it too). */
export const miniIcon = (id: string): string => (id === 'floor' ? 'floor' : id === 'lab' ? 'lab' : id === 'daily' ? 'calendar' : id === 'rhythm' ? 'lockdown' : ICON_FOR[id] ?? '');

// round 40: a game's name stays English in every language (owner); its tag and text are marked
// tx() and shown with t()
export const GAMES: { id: MiniId | 'daily'; name: string; text: string; tag: string; color: string }[] = [
  { id: 'daily' as const, tag: tx('Every day'), color: '#0B7285', name: 'Daily challenge', text: tx('One prospect a day, the same for everyone. A whole career with fast break and simple text, scored by the legacy he leaves. From the start page, when no career is in progress.') },
  { id: 'floor' as const, tag: tx('Action'), color: '#1C7ED6', name: 'The Floor', text: tx('The last six minutes of a close NBA game, played on the court: pick both teams, how good they are and which starter you steer (in a career on an NBA team, yourself). Win by enough for an A. Pays basketball IQ and a little playmaking.') },
  { id: 'threes' as const, tag: tx('Timing'), color: '#E8590C', name: 'Three-point contest', text: tx('Five racks, sixty seconds, a money-ball rack of your choice. Stop the meter in the green. Beat seven of the best shooters ever.') },
  { id: 'dunk' as const, tag: tx('Timing'), color: '#C2255C', name: 'Dunk contest', text: tx('Design your dunks (takeoff, moves, props) and land them one timing tap at a time. Five judges, two rounds, three of the best dunkers ever.') },
  { id: 'lab' as const, tag: tx('Building'), color: '#2F9E44', name: 'Built in a lab', text: tx('Design a player and build him over ten seasons: spend each summer\'s credits on ratings, then watch the season play out. Two minutes a run.') },
  { id: 'street' as const, tag: tx('Action'), color: '#2B8A3E', name: '3-on-3 streetball', text: tx('One game to 11 at a city park against the crew that holds the court, by ones and twos, make it take it. Pick the play, time your drives and pull-ups on the action cam, read their defense.') },
  { id: 'rhythm' as const, tag: tx('Rhythm'), color: '#5F3DC4', name: 'Lockdown', text: tx('A rhythm game of defense: the offense runs its sets to the beat, you block (A) and steal (S) on time and hold the long notes. Fourteen sets in a random order, under a minute a run. Pays perimeter and interior defense.') },
  { id: 'legends' as const, tag: tx('Strategy'), color: '#B08900', name: 'Legends showdown', text: tx('Every franchise plays with its all-time starting five. Join one (with a career: your own player), mind the chemistry, survive the season, then beat the powerhouses in four playoff rounds.') },
];

/** The lobby: big cards. With a career, a game opens once his ratings reach it (round 15). */
function Hub() {
  const setMini = useStore((s) => s.setMini);
  const game = useStore((s) => s.game);
  const career = game && game.step !== 'retired' ? game : null;
  // round 33: the island: every game once, a C or better (round 35: while the mini-games are locked)
  const road = useStore((s) => s.road);
  const island = !unlocked(road, 'minis');
  return (
    <section className="stack stage-in">
      <div>
        <div className="kicker">{t('Mini-games')}</div>
        <h1 className="hub-title with-icon">
          <Icon name="controller" size={40} />
          {t('Pick a game')}
        </h1>
        <p className="small muted">
          {island
            ? t('The island: play each game once and get a C or better. {n} of {total} done.', { n: ROAD_MINIS.filter((m) => passGrade(road.minis[m])).length, total: ROAD_MINIS.length })
            : career
            ? t('For {name}: each game opens when his ratings reach it, and a good result earns a rating bonus ({left} of {total} claims left this season).', { name: career.player.name, left: MINI_CLAIMS.perSeason - claimsUsed(career), total: MINI_CLAIMS.perSeason })
            : t('Free play: every game is open. With a career in progress, games unlock as your player grows and pay a rating bonus.')}
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
                <span>{t(x.tag)}</span>
                {(pr || dailyShut) && <span className={`hub-state${locked ? '' : ' open'}`}>{locked ? t('Locked') : t('Unlocked')}</span>}
              </span>
              <b className="hub-name with-icon">
                <Icon name={miniIcon(x.id)} size={34} />
                {x.name}
              </b>
              <small>{t(x.text)}</small>
              {island && x.id !== 'daily' && (
                <span className={`hub-req island-req${passGrade(road.minis[x.id as RoadMini]) ? ' done' : ''}`}>
                  <span>
                    C: {ROAD_NEED[x.id as RoadMini]}
                    {road.minis[x.id as RoadMini] ? <> · {t('best {grade}', { grade: road.minis[x.id as RoadMini] ?? '' })}</> : ''}
                  </span>
                </span>
              )}
              {dailyShut && (
                <span className="hub-req">
                  <span>{t('Not during a career: play it from the start page, or once this career is over.')}</span>
                </span>
              )}
              {pr && (
                <span className="hub-req">
                  <span>
                    {/* the rating's name stays English (owner) */}
                    {locked ? t('Unlocks at {rating} {n}', { rating: pr.label, n: pr.at }) : t('Needed {rating} {n}', { rating: pr.label, n: pr.at })}
                    {locked && <> · {t('now {n}', { n: Math.round(pr.value) })}</>}
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
      {!island && <p className="muted small">{t('Your career is safe: Back to career is always at the top right.')}</p>}
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
            {t('Back to career')}
          </button>
        )}
        <button className={`btn ${hasCareer ? 'ghost' : ''}`} onClick={() => setMini('hub')}>
          {t('Other mini-games')}
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
  // round 35: while the mini-games are locked, the hub is the island (the road map's way to open them)
  const island = useStore((s) => !unlocked(s.road, 'minis'));
  return (
    <div className="wrap no-tabs">
      {/* round 27: the shared page top; in a game the way back is the hub, and the career is one tap away */}
      <PageTop
        trail={mini === 'hub' || !mini ? [t('Mini-games')] : [t('Mini-games'), MINI_NAME[mini] ?? mini]}
        back={() => setMini(mini === 'hub' ? null : 'hub')}
        backLabel={mini === 'hub' ? undefined : t('All mini-games')}
        extra={
          mini !== 'hub' && (
            <button className="icon-btn exit-btn" onClick={() => setMini(null)}>
              {hasCareer ? t('Back to the career') : island ? t('Back to the road map') : t('Exit')}
            </button>
          )
        }
      />
      {mini === 'hub' && <Hub />}
      {mini === 'floor' && <FloorGame />}
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
  const setPage = useStore((s) => s.setPage);
  const daily = useStore((s) => !!s.game?.flags.daily);
  const live = useStore((s) => !!s.game && s.game.step !== 'retired');
  // round 35: the mini-games open with the island on the road map
  const shut = useStore((s) => !unlocked(s.road, 'minis'));
  const career = useStore((s) => !!s.game);
  return (
    <section className={`card stack${daily || shut ? ' mini-locked' : ''}`}>
      <div className="sec-title with-icon">
        <Icon name={daily || shut ? 'lock' : 'controller'} size={28} />
        {t('Mini-games')}
      </div>
      {shut ? (
        <>
          <p className="small muted keep">{unlockHint('minis')} {t('Every game once, a C or better in each.')}</p>
          {!career && (
            <button className="btn ghost" data-tour="minis-locked" onClick={() => setPage('road')}>
              {t('Open the road map')}
            </button>
          )}
        </>
      ) : daily ? (
        <p className="small muted">{t('Locked during the daily challenge, so a run stays quick. They open again when you go back to your career.')}</p>
      ) : (
        <>
          <p className="small muted">
            {live
              ? t('The Floor, the three-point and dunk contests, 3-on-3 streetball, Lockdown, Built in a lab and the legends showdown. Each opens when your ratings reach it, and a good result pays a rating bonus. The daily challenge waits for the start page.')
              : t('The Floor, the three-point and dunk contests, 3-on-3 streetball, Lockdown, Built in a lab, the legends showdown and the daily challenge. With a career, each opens when your ratings reach it.')}
          </p>
          <button className="btn ghost" data-tour="minis" onClick={() => setMini('hub')}>
            {t('Play a mini-game')}
          </button>
        </>
      )}
    </section>
  );
}

