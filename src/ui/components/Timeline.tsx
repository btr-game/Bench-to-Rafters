// Round 22: the career timeline (OVR by age, with the big moments on it) and the journal under
// it, season by season. Used on the Records tab and on the end-of-career page.

import { useMemo, useState } from 'react';
import type { GameState } from '../../engine/types';
import { careerTimeline, type MarkKind, type TimelineMark } from '../../engine/career/timeline';
import { LEVELS } from '../../engine/balance';
import { seasonLabel } from '../format';
import { Card } from './bits';

const KIND: Record<MarkKind, { name: string; color: string }> = {
  legend: { name: 'Legendary season', color: '#B8860B' },
  title: { name: 'Title', color: '#D4A017' },
  award: { name: 'Honour', color: '#7048E8' },
  duo: { name: 'Duo', color: '#C2255C' },
  move: { name: 'Team move', color: '#1C7ED6' },
  story: { name: 'Story', color: '#495057' },
  injury: { name: 'Injury', color: '#E03131' },
  event: { name: 'Turning point', color: '#2F9E44' },
};

type Filter = 'all' | 'event' | 'injury' | 'honours' | 'moves';
const FILTERS: { key: Filter; label: string; kinds: MarkKind[] }[] = [
  { key: 'all', label: 'Everything', kinds: ['legend', 'title', 'award', 'duo', 'move', 'story', 'injury', 'event'] },
  { key: 'event', label: 'Turning points', kinds: ['event', 'story'] },
  { key: 'honours', label: 'Honours', kinds: ['legend', 'title', 'award'] },
  { key: 'injury', label: 'Injuries', kinds: ['injury'] },
  { key: 'moves', label: 'Teams and duos', kinds: ['move', 'duo'] },
];

const W = 900;
const H = 270;
const PAD = { l: 40, r: 16, t: 34, b: 30 };

// round 28 (owner: "any graphic that isnt pixels, change them"): the marks on a 7x7 pixel grid,
// two units a pixel, in place of circles, stars and turned squares
const GLYPH: Record<'ring' | 'star' | 'cross' | 'arrow' | 'pair' | 'diamond', string[]> = {
  ring: ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'],
  star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
  cross: ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'],
  arrow: ['.#.....', '.##....', '.###...', '.####..', '.###...', '.##....', '.#.....'],
  pair: ['.......', '.......', '.#...#.', '###.###', '.#...#.', '.......', '.......'],
  diamond: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
};

function PixelMark({ rows, x, y, fill, cell = 2 }: { rows: string[]; x: number; y: number; fill: string; cell?: number }) {
  const h = (rows.length * cell) / 2;
  const w = (rows[0].length * cell) / 2;
  return (
    <g fill={fill} shapeRendering="crispEdges">
      {rows.flatMap((row, r) => [...row].map((ch, c) => (ch === '#' ? <rect key={`${c}-${r}`} x={Math.round(x - w) + c * cell} y={Math.round(y - h) + r * cell} width={cell} height={cell} /> : null)))}
    </g>
  );
}

/** A small glyph for a mark on the chart. */
function Glyph({ kind, x, y }: { kind: MarkKind; x: number; y: number }) {
  const c = KIND[kind].color;
  const rows = kind === 'title' ? GLYPH.ring : kind === 'legend' || kind === 'award' ? GLYPH.star : kind === 'injury' ? GLYPH.cross : kind === 'move' ? GLYPH.arrow : kind === 'duo' ? GLYPH.pair : GLYPH.diamond;
  return <PixelMark rows={rows} x={x} y={y} fill={c} cell={kind === 'legend' ? 3 : 2} />;
}

function Chart({ g, pick, picked }: { g: GameState; pick: (year: number) => void; picked: number | null }) {
  const { seasons, marks } = useMemo(() => careerTimeline(g), [g]);
  if (seasons.length === 0) return <p className="muted">The timeline starts after your first season.</p>;
  const ovrs = seasons.flatMap((x) => [x.ovrStart, x.ovrEnd]);
  const lo = Math.max(20, Math.floor((Math.min(...ovrs) - 4) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...ovrs) + 4) / 5) * 5);
  const n = seasons.length;
  const colW = (W - PAD.l - PAD.r) / n;
  const xOf = (i: number) => PAD.l + colW * (i + 0.5);
  const yOf = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  // round 28: the OVR line in pixel steps: across to each season, then up or down to its OVR
  const pts: [number, number][] = [[PAD.l + 2, yOf(seasons[0].ovrStart)], ...seasons.map((x, i): [number, number] => [xOf(i), yOf(x.ovrEnd)])].map(([a, b]) => [Math.round(a), Math.round(b)]);
  const line = pts.flatMap(([x, y], i) => (i === 0 ? [`${x},${y}`] : [`${x},${pts[i - 1][1]}`, `${x},${y}`])).join(' ');
  const grid = [30, 40, 50, 60, 70, 80, 90].filter((v) => v > lo && v < hi);
  // the NBA scale's landmarks, as coloured lines
  const bands = ([[72, 'Rotation'], [80, 'All-Star'], [90, 'All-NBA 1st'], [95, 'MVP']] as [number, string][]).filter(([v]) => v > lo && v < hi);
  const big = marks.filter((m) => m.big);
  return (
    <svg className="tl-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="OVR by season">
      {seasons.map((x, i) => (
        <g key={x.year} className={`tl-col${picked === x.year ? ' on' : ''}`} onClick={() => pick(x.year)}>
          <rect x={PAD.l + colW * i} y={PAD.t - 26} width={colW} height={H - PAD.t - PAD.b + 26} fill={x.color} opacity={picked === x.year ? 0.22 : x.level === 'NBA' ? 0.1 : 0.05} />
          <title>{`${seasonLabel(x.year)} · age ${x.age} · ${x.team} (${LEVELS[x.level].short}) · OVR ${Math.round(x.ovrStart)} → ${Math.round(x.ovrEnd)}`}</title>
        </g>
      ))}
      {grid.map((v) => (
        <g key={v} className="tl-grid">
          <line x1={PAD.l} x2={W - PAD.r} y1={yOf(v)} y2={yOf(v)} />
          <text x={PAD.l - 6} y={yOf(v) + 4} textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {bands.map(([v, name]) => (
        <g key={v} className="tl-mark-line">
          <line x1={PAD.l} x2={W - PAD.r} y1={yOf(v)} y2={yOf(v)} />
          <text x={PAD.l + 6} y={yOf(v) - 4}>
            {name} {v}
          </text>
        </g>
      ))}
      <polyline points={line} className="tl-line" />
      {seasons.map((x, i) => (
        <rect key={x.year} x={Math.round(xOf(i)) - 4} y={Math.round(yOf(x.ovrEnd)) - 4} width={8} height={8} className="tl-dot" />
      ))}
      {seasons.map((x, i) => {
        const here = big.filter((m) => m.year === x.year).slice(0, 4);
        return here.map((m, j) => (
          <g key={`${x.year}-${j}`}>
            <Glyph kind={m.kind} x={xOf(i) + (j - (here.length - 1) / 2) * Math.min(16, colW / 2)} y={PAD.t - 14} />
            <title>{m.label}</title>
          </g>
        ));
      })}
      {seasons.map((x, i) =>
        n <= 14 || i % 2 === 0 ? (
          <text key={x.year} x={xOf(i)} y={H - 10} textAnchor="middle" className="tl-age">
            {x.age}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function Row({ m }: { m: TimelineMark }) {
  return (
    <li className={`tl-entry k-${m.kind}`}>
      <i style={{ background: KIND[m.kind].color }} title={KIND[m.kind].name} />
      <span>{m.label}</span>
      {m.tier && <span className={`tl-tier tier-${m.tier.split(' ')[0].toLowerCase()}`}>{m.tier}</span>}
    </li>
  );
}

export function CareerTimeline({ g }: { g: GameState }) {
  const { seasons, marks } = useMemo(() => careerTimeline(g), [g]);
  const [filter, setFilter] = useState<Filter>('all');
  const [picked, setPicked] = useState<number | null>(null);
  const kinds = FILTERS.find((f) => f.key === filter)!.kinds;
  const shown = marks.filter((m) => kinds.includes(m.kind) && (picked === null || m.year === picked));
  const years = [...new Set([...seasons.map((x) => x.year), ...shown.map((m) => m.year)])].filter((y) => picked === null || y === picked).sort((a, b) => b - a);
  return (
    <Card title="Career timeline" kicker="OVR at the end of each season, with the big moments. Tap a season to see only that year.">
      <Chart g={g} pick={(y) => setPicked(picked === y ? null : y)} picked={picked} />
      <div className="tl-legend small">
        {(['legend', 'title', 'award', 'duo', 'move', 'injury', 'event'] as MarkKind[]).map((k) => (
          <span key={k}>
            <i style={{ background: KIND[k].color }} />
            {KIND[k].name}
          </span>
        ))}
      </div>
      <div className="sec-title" style={{ marginTop: 6 }}>
        Journal
      </div>
      <div className="seg small-seg">
        {FILTERS.map((f) => (
          <button key={f.key} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
        {picked !== null && (
          <button aria-pressed onClick={() => setPicked(null)}>
            {seasonLabel(picked)} ✕
          </button>
        )}
      </div>
      <div className="tl-journal">
        {years.map((y) => {
          const ss = seasons.find((x) => x.year === y);
          const list = shown.filter((m) => m.year === y);
          if (!ss && list.length === 0) return null;
          return (
            <section key={y} className="tl-season" style={{ borderLeftColor: ss?.color ?? 'var(--line)' }}>
              <header>
                <b className="num">{seasonLabel(y)}</b>
                {ss && (
                  <span className="small muted">
                    Age {ss.age} · {ss.team} ({LEVELS[ss.level].short}) · OVR {Math.round(ss.ovrStart)} → {Math.round(ss.ovrEnd)}
                    {ss.height ? ` · ${Math.floor(ss.height / 12)}′${ss.height % 12}″` : ''}
                    {ss.weight ? `, ${ss.weight} lb` : ''}
                  </span>
                )}
              </header>
              {list.length ? <ul>{list.map((m, i) => <Row key={i} m={m} />)}</ul> : <p className="small muted keep">A quiet season.</p>}
            </section>
          );
        })}
      </div>
    </Card>
  );
}
