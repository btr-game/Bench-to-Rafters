// The loading pop-out (round 27, owner: "when pages lag, can you add a small loading pop out? a
// cute pixel avatar dribbling would be a good one", then "add variations, more than 5"). Your own
// player, in your team's kit, runs one of nine ball-handling moves while a heavy step works (the
// store holds each one a frame so this is up first: `later` in store.ts). Every animation here
// moves only transform and opacity, which the browser runs off the main thread, so the dribble
// keeps going while the page is busy. It fades in only once a step runs past a fifth of a second.

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { PlayerArt, styleLeague } from '../art/Player';
import { Icon } from '../art/Icon';
import { team as teamOf } from '../selectors';
import { t, tx } from '../../i18n';

export const MOVES = [
  { id: 'dribble', name: tx('Dribbling') },
  { id: 'cross', name: tx('Crossover') },
  { id: 'legs', name: tx('Through the legs') },
  { id: 'behind', name: tx('Behind the back') },
  { id: 'spin', name: tx('Finger spin') },
  { id: 'two', name: tx('Two-ball drill') },
  { id: 'pound', name: tx('Pound dribble') },
  { id: 'world', name: tx('Around the world') },
  { id: 'ft', name: tx('Free-throw routine') },
] as const;
export type Move = (typeof MOVES)[number];

/** How long a step runs before the pop-out shows (the CSS delay on `.lp`). */
const SHOW_AFTER = 200;

/** The avatar and the ball: the player on screen, or a playground kid before a career starts. */
export function Dribbler({ move }: { move: Move }) {
  const g = useStore((s) => s.game);
  const club = g ? teamOf(g) : null;
  return (
    <span className={`lp-stage lp-${move.id}`} aria-hidden="true">
      <span className="lp-guy">
        {g ? (
          <PlayerArt name={g.player.name} number={g.player.number} pos={g.player.pos} color={club?.color} team={club?.name} abbr={club?.abbr} league={styleLeague(g.stage)} size={58} wear={g.player.wardrobe?.on} noBall />
        ) : (
          <PlayerArt name="Kai Moreno" number={3} pos="PG" color="#E8590C" size={58} noBall />
        )}
      </span>
      <span className="lp-ball">
        <Icon name="ball" size={14} />
      </span>
      {move.id === 'two' && (
        <span className="lp-ball lp-ball2">
          <Icon name="ball" size={14} />
        </span>
      )}
    </span>
  );
}

export function Loading() {
  const loading = useStore((s) => s.loading);
  const simple = useStore((s) => s.simple);
  // the step on screen: when it started, and when it ended (set while rendering; both idempotent)
  const step = useRef<{ key: number; at: number; end?: number } | null>(null);
  const [gone, setGone] = useState<number | null>(null);
  if (loading !== null && step.current?.key !== loading) step.current = { key: loading, at: performance.now() };
  const s = step.current;
  if (loading === null && s && s.end === undefined) s.end = performance.now();
  // a step that ran long enough to show the pop-out lets it fade out instead of snapping away
  const fading = loading === null && s && s.key !== gone && (s.end ?? 0) - s.at >= SHOW_AFTER ? s.key : null;
  useEffect(() => {
    if (fading === null) return;
    const id = setTimeout(() => setGone(fading), 260);
    return () => clearTimeout(id);
  }, [fading]);
  const key = loading ?? fading;
  if (key === null) return null;
  const move = MOVES[key % MOVES.length];
  return (
    <div className={`lp${loading === null ? ' out' : ''}`} role="status" aria-live="polite">
      <Dribbler move={move} />
      <span className="lp-text">
        <b>{t('Loading')}</b>
        {!simple && <small>{t(move.name)}</small>}
      </span>
    </div>
  );
}
