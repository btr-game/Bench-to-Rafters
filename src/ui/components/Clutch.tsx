// The playable last minutes (round 24, owner: "make the finals animation a mini-game as well, but
// skippable: total skip, or skip the game and watch the animation"). Each of his team's big
// possessions waits for him: pick the move, then stop the meter. The final's result was settled
// by the season (the title, the awards and the bracket all depend on it), so the score of each
// play stays as it was told; what the timing earns is a clutch rating, worth a little
// reputation and mood, and a few achievements. (Round 25: with playable playoffs on, the last
// possession of a close game is played before the result, and there the timing decides the shot:
// career/live.ts and the timing meter in Decision.tsx.)

import { useEffect, useRef, useState } from 'react';
import type { DramaPlay } from '../../engine/story/drama';
import { VERB2, VERB3 } from '../../engine/story/drama';
import type { AttrKey } from '../../engine/types';
import { Icon } from '../art/Icon';

export type Grade = 'perfect' | 'good' | 'ok';
export interface ClutchMove {
  id: string;
  label: string;
  verb: string; // what the play-by-play says (and what the action cam acts out)
  attr: AttrKey; // the rating that widens the meter's green zone
  icon: string;
}

const THREES: ClutchMove[] = [
  { id: 'pullup', label: 'Pull up from deep', verb: 'pulls up from deep', attr: 'SHT', icon: 'shoot' },
  { id: 'stepback', label: 'Step back', verb: 'hits a step-back three', attr: 'SHT', icon: 'range' },
  { id: 'corner', label: 'Spot up in the corner', verb: 'buries the corner three', attr: 'SHT', icon: 'threes' },
];
const TWOS: ClutchMove[] = [
  { id: 'dunk', label: 'Attack the rim', verb: 'throws it down', attr: 'ATH', icon: 'dunk' },
  { id: 'drive', label: 'Drive and finish', verb: 'drives and scores', attr: 'FIN', icon: 'finish' },
  { id: 'floater', label: 'Floater', verb: 'hits the floater', attr: 'FIN', icon: 'FIN' },
  { id: 'turn', label: 'Post up, turn around', verb: 'hits the turnaround', attr: 'SHT', icon: 'post' },
];
const STOPS: ClutchMove[] = [
  { id: 'block', label: 'Contest at the rim', verb: 'BLOCK', attr: 'INT', icon: 'INT' },
  { id: 'steal', label: 'Jump the passing lane', verb: 'STEAL', attr: 'PER', icon: 'PER' },
];

/** Which plays are his to play: his team's baskets, and the stops his team makes. */
export function clutchMoves(p: DramaPlay, winner: 'us' | 'them'): ClutchMove[] | null {
  if (p.side === 'us' && p.pts === 3) return THREES;
  if (p.side === 'us' && p.pts === 2) return TWOS;
  if ((p.tag === 'BLOCK' || p.tag === 'STEAL') && winner === 'us') return STOPS;
  return null;
}

const last = (n: string) => n.trim().split(' ').slice(-1)[0];

/** The play as he called it: his name, his move, the rest of the line as it was. */
export function calledPlay(p: DramaPlay, m: ClutchMove, name: string, opp: string): DramaPlay {
  const who = last(name);
  if (m.verb === 'BLOCK') return { ...p, tag: 'BLOCK', mine: true, text: `${who} blocks ${last(opp)}'s layup! A game-changing block.` };
  if (m.verb === 'STEAL') return { ...p, tag: 'STEAL', mine: true, text: `${who} jumps the passing lane. Steal!` };
  const verb = [...VERB2, ...VERB3].find((v) => p.text.includes(v));
  const rest = verb ? p.text.slice(p.text.indexOf(verb) + verb.length) : '';
  return { ...p, mine: true, text: `${who} ${m.verb}${rest}` };
}

export const GRADE_NOTE: Record<Grade, string> = { perfect: 'Perfect timing', good: 'Good look', ok: 'Lucky bounce' };
export const GRADE_POINTS: Record<Grade, number> = { perfect: 3, good: 2, ok: 1 };

/**
 * The timing meter: a marker sweeps across; stop it in the green (Space, Enter or a tap). The
 * green zone grows with the rating the move uses; its bright middle is a perfect.
 */
function Meter({ rating, onStop }: { rating: number; onStop: (g: Grade) => void }) {
  const [zone] = useState(() => {
    const w = 0.14 + (Math.max(30, Math.min(99, rating)) / 100) * 0.18;
    const c = 0.25 + Math.random() * 0.5;
    return { a: c - w / 2, b: c + w / 2, pa: c - w * 0.18, pb: c + w * 0.18 };
  });
  const [x, setX] = useState(0);
  const pos = useRef(0);
  const stopped = useRef(false);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      // there and back every 1.3 seconds
      const ph = ((t - t0) / 1300) % 2;
      pos.current = ph < 1 ? ph : 2 - ph;
      setX(pos.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    const stop = () => {
      if (stopped.current) return;
      stopped.current = true;
      const v = pos.current;
      onStop(v >= zone.pa && v <= zone.pb ? 'perfect' : v >= zone.a && v <= zone.b ? 'good' : 'ok');
    };
    // captured first, so Enter here never skips the final
    const key = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      stop();
    };
    window.addEventListener('keydown', key, true);
    const el = document.querySelector('.clutch-meter');
    el?.addEventListener('pointerdown', stop);
    return () => {
      window.removeEventListener('keydown', key, true);
      el?.removeEventListener('pointerdown', stop);
    };
  }, [zone, onStop]);
  return (
    <div className="clutch-meter" role="button" aria-label="Stop the meter">
      <div className="cm-zone" style={{ left: `${zone.a * 100}%`, width: `${(zone.b - zone.a) * 100}%` }} />
      <div className="cm-perfect" style={{ left: `${zone.pa * 100}%`, width: `${(zone.pb - zone.pa) * 100}%` }} />
      <div className="cm-mark" style={{ left: `${x * 100}%` }} />
    </div>
  );
}

/** His call on one possession: the move, then the meter. */
export function ClutchPanel({ play, moves, ratings, onDone }: { play: DramaPlay; moves: ClutchMove[]; ratings: Partial<Record<AttrKey, number>>; onDone: (m: ClutchMove, g: Grade) => void }) {
  const [move, setMove] = useState<ClutchMove | null>(null);
  const stop = moves[0].verb === 'BLOCK' || moves[0].verb === 'STEAL';
  return (
    <div className="clutch-panel" role="group" aria-label="Your call">
      <div className="kicker on-dark with-icon">
        <Icon name="clutch" size={22} />
        Q4 {play.clock} · {stop ? 'Their ball: get a stop' : `Your ball: ${play.pts} points on the line`}
      </div>
      {!move ? (
        <div className="clutch-moves">
          {moves.map((m) => (
            <button key={m.id} className="btn ghost-dark with-icon" onClick={() => setMove(m)}>
              <Icon name={m.icon} size={22} />
              {m.label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="on-dark small">
            {move.label}: stop the meter in the green. Space, Enter or tap.
          </div>
          <Meter rating={ratings[move.attr] ?? 60} onStop={(g) => onDone(move, g)} />
        </>
      )}
    </div>
  );
}
