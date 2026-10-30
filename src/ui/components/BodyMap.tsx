// Round 22: the body map on the Player tab. Front and back views: each muscle group shaded by
// how much training has built it, and a red mark wherever he has been hurt (a number when it
// happened more than once). Beside it: how he grew (height and weight by age), wingspan, body
// wear, the muscles training built most, and every injury by body part.

import { useState } from 'react';
import type { GameState } from '../../engine/types';
import { MUSCLES, injuryPart, type BodyPart, type Muscle } from '../../engine/player/body';
import { idealWeight, weightOf } from '../../engine/player/weight';
import { ht } from '../format';
import { Card } from './bits';

type Shape = { m: Muscle | null; el: 'e' | 'r' | 'c'; x: number; y: number; a: number; b?: number };

// front view (back view is drawn 210 to the right); m = which muscle group shades it
const FRONT: Shape[] = [
  { m: null, el: 'c', x: 100, y: 32, a: 21 },
  { m: null, el: 'r', x: 91, y: 52, a: 18, b: 12 },
  { m: 'shoulders', el: 'e', x: 64, y: 78, a: 19, b: 13 },
  { m: 'shoulders', el: 'e', x: 136, y: 78, a: 19, b: 13 },
  { m: 'chest', el: 'e', x: 84, y: 100, a: 17, b: 14 },
  { m: 'chest', el: 'e', x: 116, y: 100, a: 17, b: 14 },
  { m: 'arms', el: 'e', x: 50, y: 118, a: 10, b: 26 },
  { m: 'arms', el: 'e', x: 150, y: 118, a: 10, b: 26 },
  { m: 'forearms', el: 'e', x: 42, y: 170, a: 9, b: 25 },
  { m: 'forearms', el: 'e', x: 158, y: 170, a: 9, b: 25 },
  { m: 'forearms', el: 'c', x: 40, y: 204, a: 8 },
  { m: 'forearms', el: 'c', x: 160, y: 204, a: 8 },
  { m: 'core', el: 'r', x: 80, y: 117, a: 40, b: 64 },
  { m: 'glutes', el: 'r', x: 78, y: 182, a: 44, b: 22 },
  { m: 'quads', el: 'e', x: 87, y: 248, a: 15, b: 42 },
  { m: 'quads', el: 'e', x: 113, y: 248, a: 15, b: 42 },
  { m: null, el: 'c', x: 87, y: 296, a: 9 },
  { m: null, el: 'c', x: 113, y: 296, a: 9 },
  { m: 'calves', el: 'e', x: 87, y: 342, a: 10, b: 34 },
  { m: 'calves', el: 'e', x: 113, y: 342, a: 10, b: 34 },
  { m: null, el: 'e', x: 84, y: 392, a: 13, b: 7 },
  { m: null, el: 'e', x: 116, y: 392, a: 13, b: 7 },
];
const BACK: Shape[] = [
  { m: null, el: 'c', x: 100, y: 32, a: 21 },
  { m: null, el: 'r', x: 91, y: 52, a: 18, b: 12 },
  { m: 'shoulders', el: 'e', x: 64, y: 78, a: 19, b: 13 },
  { m: 'shoulders', el: 'e', x: 136, y: 78, a: 19, b: 13 },
  { m: 'back', el: 'r', x: 76, y: 74, a: 48, b: 100 },
  { m: 'arms', el: 'e', x: 50, y: 118, a: 10, b: 26 },
  { m: 'arms', el: 'e', x: 150, y: 118, a: 10, b: 26 },
  { m: 'forearms', el: 'e', x: 42, y: 170, a: 9, b: 25 },
  { m: 'forearms', el: 'e', x: 158, y: 170, a: 9, b: 25 },
  { m: 'forearms', el: 'c', x: 40, y: 204, a: 8 },
  { m: 'forearms', el: 'c', x: 160, y: 204, a: 8 },
  { m: 'glutes', el: 'e', x: 88, y: 196, a: 15, b: 17 },
  { m: 'glutes', el: 'e', x: 112, y: 196, a: 15, b: 17 },
  { m: 'hamstrings', el: 'e', x: 87, y: 252, a: 14, b: 38 },
  { m: 'hamstrings', el: 'e', x: 113, y: 252, a: 14, b: 38 },
  { m: 'calves', el: 'e', x: 87, y: 338, a: 12, b: 34 },
  { m: 'calves', el: 'e', x: 113, y: 338, a: 12, b: 34 },
  { m: null, el: 'e', x: 84, y: 392, a: 13, b: 7 },
  { m: null, el: 'e', x: 116, y: 392, a: 13, b: 7 },
];

const BACK_X = 210;
// where each injured part is marked (back-view parts are shifted over)
const SPOT: Record<Exclude<BodyPart, 'whole'>, [number, number]> = {
  head: [100, 30],
  neck: [100, 58],
  shoulder: [136, 78],
  back: [BACK_X + 100, 130],
  hand: [160, 204],
  groin: [100, 192],
  hamstring: [BACK_X + 113, 252],
  knee: [87, 296],
  calf: [BACK_X + 113, 350],
  ankle: [87, 380],
  foot: [116, 394],
};
const PART_NAME: Record<BodyPart, string> = { head: 'Head', neck: 'Neck', shoulder: 'Shoulder', back: 'Back', hand: 'Hand and wrist', groin: 'Hip and groin', hamstring: 'Hamstring', knee: 'Knee', calf: 'Calf and Achilles', ankle: 'Ankle', foot: 'Foot', whole: 'Illness and other' };

/** Shade for a muscle: pale when untrained, deep orange when it is his most built. */
const shade = (v: number, top: number) => `color-mix(in srgb, #E8590C ${Math.round(Math.min(1, v / top) * 85)}%, var(--body-base))`;

// round 24 (owner: "can you make the body map also pixelated?"): the same shapes, sampled onto a
// grid of square pixels with a dark outline, like the rest of the game's art
const PX = 6;
type Key = Muscle | 'base';
const near = (x: number, y: number, pts: [number, number][], r: number) =>
  pts.some(([ax, ay], i) => {
    if (i === 0) return false;
    const [bx, by] = pts[i - 1];
    const dx = ax - bx;
    const dy = ay - by;
    const t = Math.max(0, Math.min(1, ((x - bx) * dx + (y - by) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - (bx + t * dx), y - (by + t * dy)) <= r;
  });
function inTorso(x: number, y: number): boolean {
  if (y < 64 || y > 208) return false;
  // the trunk narrows from the shoulders (60-140) to the hips (74-126)
  const k = (y - 64) / 144;
  return x >= 60 + 14 * k && x <= 140 - 14 * k;
}
function covers(sh: Shape, x: number, y: number): boolean {
  if (sh.el === 'c') return Math.hypot(x - sh.x, y - sh.y) <= sh.a;
  if (sh.el === 'r') return x >= sh.x && x <= sh.x + sh.a && y >= sh.y && y <= sh.y + (sh.b ?? 0);
  return ((x - sh.x) / sh.a) ** 2 + ((y - sh.y) / (sh.b ?? sh.a)) ** 2 <= 1;
}
const CACHE = new Map<Shape[], { key: Key | 'line'; d: string }[]>();
/** The figure as pixel runs, one path per muscle (plus the bare body and the outline). */
function pixels(shapes: Shape[]): { key: Key | 'line'; d: string }[] {
  const hit = CACHE.get(shapes);
  if (hit) return hit;
  const W = Math.ceil(200 / PX);
  const H = Math.ceil(410 / PX);
  const grid: (Key | null)[][] = [];
  for (let r = 0; r < H; r++) {
    const row: (Key | null)[] = [];
    for (let c = 0; c < W; c++) {
      const x = c * PX + PX / 2;
      const y = r * PX + PX / 2;
      let k: Key | null =
        inTorso(x, y) || near(x, y, [[62, 76], [48, 140], [41, 206]], 11) || near(x, y, [[138, 76], [152, 140], [159, 206]], 11) || near(x, y, [[88, 206], [87, 298], [86, 388]], 15) || near(x, y, [[112, 206], [113, 298], [114, 388]], 15)
          ? 'base'
          : null;
      for (const sh of shapes) if (covers(sh, x, y)) k = sh.m ?? 'base';
      row.push(k);
    }
    grid.push(row);
  }
  const runs = new Map<Key | 'line', string>();
  const add = (k: Key | 'line', c: number, r: number, n: number) => runs.set(k, `${runs.get(k) ?? ''}M${c * PX} ${r * PX}h${n * PX}v${PX}h${-n * PX}z`);
  grid.forEach((row, r) => {
    let c = 0;
    while (c < W) {
      const k = row[c];
      const edge = !k && [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => grid[r + dr]?.[c + dc]);
      const key = k ?? (edge ? 'line' : null);
      let n = 1;
      while (c + n < W && (row[c + n] ?? ([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => grid[r + dr]?.[c + n + dc]) ? 'line' : null)) === key) n++;
      if (key) add(key, c, r, n);
      c += n;
    }
  });
  const out = [...runs].map(([key, d]) => ({ key, d }));
  CACHE.set(shapes, out);
  return out;
}

function Figure({ shapes, dx, muscles, top, hover, setHover }: { shapes: Shape[]; dx: number; muscles: Partial<Record<Muscle, number>>; top: number; hover: Muscle | null; setHover: (m: Muscle | null) => void }) {
  return (
    <g transform={`translate(${dx} 0)`} shapeRendering="crispEdges">
      {pixels(shapes).map(({ key, d }) => {
        if (key === 'line') return <path key={key} d={d} className="bm-line" />;
        if (key === 'base') return <path key={key} d={d} fill="var(--body-base)" />;
        return (
          <path key={key} d={d} fill={shade(muscles[key] ?? 0, top)} className={`bm-part${hover === key ? ' on' : ''}`} onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)}>
            <title>{`${MUSCLES.find((x) => x.key === key)!.name}: ${(muscles[key] ?? 0).toFixed(1)}`}</title>
          </path>
        );
      })}
    </g>
  );
}

/** `narrow`: stacked (figures above, numbers below) for a side column. */
/** Time missed, in days under two weeks (a sore ankle is not "0 wk"), else in weeks. */
const timeOut = (days: number): string => (days < 14 ? `${days} day${days === 1 ? '' : 's'}` : `${Math.round(days / 7)} wk`);

export function BodyMap({ g, narrow = false }: { g: GameState; narrow?: boolean }) {
  const p = g.player;
  const [hover, setHover] = useState<Muscle | null>(null);
  const muscles = p.muscles ?? {};
  const top = Math.max(20, ...Object.values(muscles).map((v) => v ?? 0));
  const injuries = p.injuries ?? [];
  const byPart = new Map<BodyPart, typeof injuries>();
  for (const x of injuries) byPart.set(injuryPart(x.name), [...(byPart.get(injuryPart(x.name)) ?? []), x]);
  const ranked = MUSCLES.map((x) => ({ ...x, v: muscles[x.key] ?? 0 })).sort((a, b) => b.v - a.v);
  // height and weight by age: one row per season (and today)
  const rows = g.history.filter((h) => h.height && !/assignment/i.test(h.teamName));
  const growth = [...new Map(rows.map((h) => [h.age, { age: h.age, height: h.height!, weight: h.weight }])).values()];
  const first = growth[0];
  return (
    <Card title="Body map" kicker="What training built, and where it hurt. Hover a muscle for its number.">
      <div className={`bm${narrow ? ' narrow' : ''}`}>
        <svg viewBox="0 0 410 428" className="bm-svg" role="img" aria-label="Body map, front and back">
          <text x={100} y={422} textAnchor="middle" className="bm-cap">
            Front
          </text>
          <text x={BACK_X + 100} y={422} textAnchor="middle" className="bm-cap">
            Back
          </text>
          <Figure shapes={FRONT} dx={0} muscles={muscles} top={top} hover={hover} setHover={setHover} />
          <Figure shapes={BACK} dx={BACK_X} muscles={muscles} top={top} hover={hover} setHover={setHover} />
          {[...byPart.entries()]
            .filter(([part]) => part !== 'whole')
            .map(([part, list]) => {
              const [x, y] = SPOT[part as Exclude<BodyPart, 'whole'>];
              const bad = list.some((i) => i.key === 'major' || i.key === 'season');
              return (
                <g key={part} className="bm-hurt" shapeRendering="crispEdges">
                  <rect x={Math.round(x / PX) * PX - (bad ? 12 : 9)} y={Math.round(y / PX) * PX - (bad ? 12 : 9)} width={bad ? 24 : 18} height={bad ? 24 : 18} className={bad ? 'major' : ''} />
                  <text x={Math.round(x / PX) * PX} y={Math.round(y / PX) * PX + 4} textAnchor="middle">
                    {list.length > 1 ? list.length : '+'}
                  </text>
                  <title>{`${PART_NAME[part]}: ${list.map((i) => `${i.name} (age ${i.age})`).join(', ')}`}</title>
                </g>
              );
            })}
        </svg>
        <div className="bm-side stack">
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>
                {ht(p.height)}
                {first && first.height < p.height && <span className="muted"> · +{p.height - first.height}″ since {first.age}</span>}
              </dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>
                {weightOf(p)} lb
                {first?.weight && <span className="muted"> · {weightOf(p) - first.weight >= 0 ? '+' : '−'}{Math.abs(weightOf(p) - first.weight)} since {first.age}</span>}
                <span className="muted"> · best about {Math.round(idealWeight(p.height, p.age) / 5) * 5}</span>
              </dd>
            </div>
            <div>
              <dt>Wingspan</dt>
              <dd>{ht(p.wingspan)}</dd>
            </div>
            <div>
              <dt>Body wear</dt>
              <dd>
                {Math.round(p.wear ?? 0)} / 100 <span className="muted">· {(p.wear ?? 0) < 25 ? 'fresh' : (p.wear ?? 0) < 50 ? 'some miles' : (p.wear ?? 0) < 75 ? 'worn' : 'heavily worn'}</span>
              </dd>
            </div>
          </dl>
          {growth.length > 1 && (
            <div className="bm-growth">
              {growth.map((x, i) => (
                <div key={x.age} className="bm-age" title={`Age ${x.age}: ${ht(x.height)}${x.weight ? `, ${x.weight} lb` : ''}`}>
                  <i style={{ height: `${20 + ((x.height - first.height) / Math.max(1, p.height - first.height)) * 50}px` }} className={i > 0 && x.height > growth[i - 1].height ? 'grew' : ''} />
                  <span>{x.age}</span>
                </div>
              ))}
            </div>
          )}
          <div className="sec-title">Most built</div>
          {ranked[0].v > 0 ? (
            <ul className="bm-list">
              {ranked.slice(0, 5).map((x) => (
                <li key={x.key} className={hover === x.key ? 'on' : ''} onMouseEnter={() => setHover(x.key)} onMouseLeave={() => setHover(null)}>
                  <i style={{ background: shade(x.v, top) }} />
                  <span>{x.name}</span>
                  <b className="num">{x.v.toFixed(1)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">Every half of training adds up here from now on.</p>
          )}
          <div className="sec-title">Injuries</div>
          {injuries.length === 0 ? (
            <p className="small muted keep">{g.history.length ? 'None on record. Knock on wood.' : 'None yet.'}</p>
          ) : (
            <ul className="bm-list">
              {[...byPart.entries()].map(([part, list]) => (
                <li key={part}>
                  <i className="hurt" />
                  <span>
                    {PART_NAME[part]} <span className="muted small">· {list.map((i) => `${i.name}, ${i.age}`).join('; ')}</span>
                  </span>
                  <b className="num">{timeOut(list.reduce((t, i) => t + i.days, 0))}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
