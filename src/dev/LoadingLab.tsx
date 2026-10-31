// The loading pop-out's moves side by side (round 27), and a button that makes the page busy for
// a second and a half so the pop-out can be seen doing its job.

import { useState } from 'react';
import { later } from '../store';
import { Dribbler, MOVES } from '../ui/components/Loading';

export function LoadingLab() {
  const [ms, setMs] = useState<number | null>(null);
  const lag = (n: number) =>
    later(() => {
      const t = performance.now();
      while (performance.now() - t < n) {
        /* a page that has gone quiet: what a long season or a big page does */
      }
      setMs(n);
    });
  return (
    <div className="wrap stack dk-loading">
      <header className="stack">
        <div className="kicker">Dev deck · loading pop-out</div>
        <h1 className="hub-title">{MOVES.length} moves while the page works</h1>
        <p className="prose">
          When a step takes longer than a fifth of a second (a season, a big page), this pops out in the corner (at the top on a phone): your own player in your team's kit, running one of these moves, picked at random each time. It keeps moving while the page is busy.
        </p>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => lag(1500)}>
            Make the page lag for 1.5 s
          </button>
          <button className="btn ghost" onClick={() => lag(120)}>
            A quick step (no pop-out)
          </button>
          {ms !== null && <span className="small muted">Done: {ms} ms of work.</span>}
        </div>
      </header>
      <div className="dk-moves">
        {MOVES.map((m) => (
          <div key={m.id} className="lp dk-move">
            <Dribbler move={m} />
            <span className="lp-text">
              <b>{m.name}</b>
              <small>{m.id}</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
