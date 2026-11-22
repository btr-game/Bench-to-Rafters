// The superteam draft's board (after round 42, owner: "superteam draft against a friend"): whose pick
// it is and the seconds left on it, the two fives as they fill, and the pool of every legend still
// there, best first, to pick from on his turn. The same board on both screens (room.ts).

import { useState } from 'react';
import type { Pos } from '../../engine/types';
import { picksOf, SNAKE, turnOf, type Draft } from '../../engine/floor/friend';
import { ALL_LEGENDS, fiveOvr } from '../../engine/floor/legends';
import { t } from '../../i18n';

const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
/** The pool best first (between equals, the list's own order). */
const POOL = ALL_LEGENDS.map((x, k) => ({ ...x, k })).sort((a, b) => b.spot.ovr - a.spot.ovr || a.k - b.k);

function Five({ d, side, title }: { d: Draft; side: 0 | 1; title: string }) {
  const five = picksOf(d, side);
  return (
    <div className="dr-five">
      <div className="small">
        <b>{title}</b>
        {five.length > 0 && <span className="muted"> · {t('{n} overall', { n: fiveOvr(five).toFixed(1) })}</span>}
      </div>
      <ol>
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className={five[i] ? '' : 'muted'}>
            {five[i] ? (
              <>
                <b>{five[i].ovr}</b> {five[i].name} <span className="muted">{five[i].pos}</span>
              </>
            ) : (
              '–'
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function DraftBoard({ d, me, names, left, onPick }: { d: Draft; me: 0 | 1; names: [string, string]; left: number | null; onPick: (k: number) => void }) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [find, setFind] = useState('');
  const turn = turnOf(d);
  const mine = turn === me;
  const q = find.trim().toLowerCase();
  const pool = POOL.filter((x) => !d.picks.includes(x.k) && (!pos || x.spot.pos === pos) && (!q || x.spot.name.toLowerCase().includes(q)));
  return (
    <div className="dr stack" style={{ gap: 10 }}>
      <p className={`dr-turn${mine ? ' on' : ''}`} role="status">
        {turn === null
          ? t('The draft is done.')
          : mine
            ? t('Your pick ({n} of 10): {s} s', { n: d.picks.length + 1, s: Math.ceil((left ?? 0) / 1000) })
            : t('{name} is picking ({n} of 10): {s} s', { name: names[1 - me], n: d.picks.length + 1, s: Math.ceil((left ?? 0) / 1000) })}
      </p>
      <p className="small muted">{t('Order: {order}. When the clock runs out, the best legend left is picked.', { order: SNAKE.map((s) => (s === me ? t('you') : names[1 - me])).join(', ') })}</p>
      <div className="dr-fives">
        <Five d={d} side={me} title={t('Your five')} />
        <Five d={d} side={(1 - me) as 0 | 1} title={names[1 - me]} />
      </div>
      {turn !== null && (
        <>
          <div className="row" role="group" aria-label={t('Position')} style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className={`pick-chip${pos === null ? ' on' : ''}`} aria-pressed={pos === null} onClick={() => setPos(null)}>
              {t('All')}
            </button>
            {POS.map((p) => (
              <button key={p} className={`pick-chip${pos === p ? ' on' : ''}`} aria-pressed={pos === p} onClick={() => setPos(p)}>
                {p}
              </button>
            ))}
            <input className="dr-find" aria-label={t('Find a legend')} placeholder={t('Find a legend')} value={find} onChange={(e) => setFind(e.target.value)} />
          </div>
          <div className="dr-pool" role="list" aria-label={t('Legends left')}>
            {pool.map((x) => (
              <button key={x.k} role="listitem" className="dr-man" disabled={!mine} onClick={() => onPick(x.k)}>
                <b>{x.spot.ovr}</b>
                <span>{x.spot.name}</span>
                <span className="muted">
                  {x.spot.pos} · {x.team}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
