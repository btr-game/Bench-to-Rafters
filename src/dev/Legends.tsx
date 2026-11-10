// The dev deck's legends page (round 42, owner: "can i look at each legend's stats? maybe add that
// to the dev deck"): all 150, their real career averages (content/legendStats.ts), the ratings the
// Floor gives them and how it has them play. Filter by franchise or name; sort by a click.

import { useMemo, useState } from 'react';
import { ALL_LEGENDS } from '../engine/floor/legends';
import { LegendTable } from '../ui/floor/LegendTable';

export function Legends() {
  const [q, setQ] = useState('');
  const [by, setBy] = useState<'team' | 'ovr' | 'name'>('team');
  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    const list = ALL_LEGENDS.filter((x) => !k || x.spot.name.toLowerCase().includes(k) || x.team.toLowerCase().includes(k) || x.spot.pos.toLowerCase() === k);
    if (by === 'ovr') return [...list].sort((a, b) => b.spot.ovr - a.spot.ovr);
    if (by === 'name') return [...list].sort((a, b) => (a.spot.name < b.spot.name ? -1 : 1));
    return list;
  }, [q, by]);
  return (
    <main className="cl fl">
      <header>
        <div className="kicker on-dark">Bench to Rafters · dev deck</div>
        <h1>The Floor’s legends</h1>
        <p className="on-dark">
          Every franchise’s all-time five: career regular-season averages on the left, then the overall from the list and the ratings the Floor plays him at (the list’s 80 to 99 is played as 75 to 89.25), then how
          it has him play (1 is a player like any other).
        </p>
      </header>
      <section className="card stack" style={{ color: 'var(--ink)' }}>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input aria-label="Filter" placeholder="Name, team (CHI) or position (PG)" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 280 }} />
          {(['team', 'ovr', 'name'] as const).map((k) => (
            <button key={k} className={`pick-chip${by === k ? ' on' : ''}`} aria-pressed={by === k} onClick={() => setBy(k)}>
              {k === 'team' ? 'By franchise' : k === 'ovr' ? 'By overall' : 'By name'}
            </button>
          ))}
          <span className="small muted">{rows.length} of 150</span>
        </div>
        <LegendTable rows={rows} wide />
      </section>
    </main>
  );
}
