// The end of a level career (round 33): the goal reached or missed, a few numbers, and what the next
// level adds. Missing the goal still passes the level (owner: "if they miss, make an ending card with
// sad music just for that (but still include thank you for playing)"); Continue goes on to the
// thank-you page, then the road map.

import { useEffect } from 'react';
import type { GameState } from '../../engine/types';
import { useStore } from '../../store';
import { Icon } from '../art/Icon';
import { LEVEL_IDS, LEVEL_NAME, levelOf, nbaSeasons } from '../../engine/levels';
import { LEVEL_COPY } from '../../content/roadmap';
import { LevelAdds } from '../components/LevelAdds';
import { sfx } from '../sound';
import { PlaceArt } from './RoadMap';
import { UNLOCK_NAME, unlockOf } from '../road';

export function LevelEnd({ g }: { g: GameState }) {
  const endLevel = useStore((s) => s.endLevel);
  const level = levelOf(g)!;
  const star = g.flags.levelEnd === 2;
  const nba = g.history.filter((h) => h.level === 'NBA');
  const allStars = g.awards.filter((a) => a.key === 'ALLSTAR' && a.level === 'NBA').length;
  const best = nba.reduce((m, h) => Math.max(m, h.line.gp ? h.line.pts / h.line.gp : 0), 0);
  const next = LEVEL_IDS[LEVEL_IDS.indexOf(level) + 1];
  const copy = LEVEL_COPY[level];
  // round 35: a level that opens a mode has the padlock's own sound
  useEffect(() => sfx(star ? (unlockOf(level) ? 'opened' : 'award') : 'lose'), [star, level]);
  return (
    <div className="stack level-end">
      <section className={`card stack level-end-card ${star ? 'won' : 'missed'}`} data-tour="level-end">
        <div className="row level-end-head">
          <PlaceArt place={level} size={120} />
          <Icon name={star ? 'stars' : 'morale'} size={56} />
          <div style={{ minWidth: 0 }}>
            <div className="kicker">
              Level {copy.n} · {LEVEL_NAME[level]} · passed
            </div>
            <h2 className="level-end-title">{star ? 'Goal reached: NBA All-Star' : 'So close: no All-Star team this time'}</h2>
          </div>
        </div>
        <p className="small">
          {star
            ? `${g.player.name} made ${allStars === 1 ? 'an All-Star team' : `${allStars} All-Star teams`} in ${nbaSeasons(g)} NBA seasons.`
            : `${g.player.name} played ${nbaSeasons(g)} NBA seasons without an All-Star call. The level still counts: the road goes on.`}
        </p>
        <ul className="level-end-stats">
          <li>
            <Icon name="calendar" size={28} />
            <b>{nbaSeasons(g)}</b>
            <span>NBA seasons</span>
          </li>
          <li>
            <Icon name="ovr" size={28} />
            <b>{Math.round(g.player.peakOvr)}</b>
            <span>Peak OVR</span>
          </li>
          <li>
            <Icon name="stars" size={28} />
            <b>{allStars}</b>
            <span>All-Star teams</span>
          </li>
          <li>
            <Icon name="shoot" size={28} />
            <b>{best.toFixed(1)}</b>
            <span>Best PPG</span>
          </li>
        </ul>
      </section>
      {/* round 35: beginner opens the full game; intermediate and advanced each open a mode */}
      {level === 'beginner' ? (
        <p className="card with-icon level-opens">
          <Icon name="door" size={28} />
          <span>
            <b>The full game opens</b> with Regular guy. The road map&rsquo;s other stops open the rest.
          </span>
        </p>
      ) : (
        unlockOf(level) && (
          <p className="card with-icon level-opens">
            <Icon name="unlock" size={28} />
            <span>
              <b>{UNLOCK_NAME[unlockOf(level)!][0].toUpperCase() + UNLOCK_NAME[unlockOf(level)!].slice(1)}</b> is open: pick it on the start page.
            </span>
          </p>
        )
      )}
      {next && <LevelAdds level={next} />}
      <div className="row-end">
        <button className="btn" onClick={() => (sfx('confirm'), endLevel())} data-enter>
          Continue
        </button>
      </div>
    </div>
  );
}
