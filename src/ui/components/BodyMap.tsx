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

function Figure({ shapes, dx, muscles, top, hover, setHover }: { shapes: Shape[]; dx: number; muscles: Partial<Record<Muscle, number>>; top: number; hover: Muscle | null; setHover: (m: Muscle | null) => void }) {
  return (
    <g transform={`translate(${dx} 0)`}>
      <g className="bm-sil">
        <path d="M60,68 Q100,58 140,68 L132,140 L126,208 L74,208 L68,140 Z" />
        <polyline points="62,76 48,140 41,206" />
        <polyline points="138,76 152,140 159,206" />
        <polyline points="88,206 87,298 86,388" />
        <polyline points="112,206 113,298 114,388" />
      </g>
      {shapes.map((s, i) => {
        const fill = s.m ? shade(muscles[s.m] ?? 0, top) : 'var(--body-base)';
        const cls = `bm-part${s.m && hover === s.m ? ' on' : ''}`;
        const ev = s.m ? { onMouseEnter: () => setHover(s.m), onMouseLeave: () => setHover(null) } : {};
        const title = s.m ? <title>{`${MUSCLES.find((x) => x.key === s.m)!.name}: ${(muscles[s.m] ?? 0).toFixed(1)}`}</title> : null;
        if (s.el === 'c')
          return (
            <circle key={i} cx={s.x} cy={s.y} r={s.a} fill={fill} className={cls} {...ev}>
              {title}
            </circle>
          );
        if (s.el === 'r')
          return (
            <rect key={i} x={s.x} y={s.y} width={s.a} height={s.b} rx={10} fill={fill} className={cls} {...ev}>
              {title}
            </rect>
          );
        return (
          <ellipse key={i} cx={s.x} cy={s.y} rx={s.a} ry={s.b} fill={fill} className={cls} {...ev}>
            {title}
          </ellipse>
        );
      })}
    </g>
  );
}

export function BodyMap({ g }: { g: GameState }) {
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
      <div className="bm">
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
                <g key={part} className="bm-hurt">
                  <circle cx={x} cy={y} r={bad ? 10 : 8} className={bad ? 'major' : ''} />
                  <text x={x} y={y + 4} textAnchor="middle">
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
            <p className="small muted">{g.history.length ? 'None on record. Knock on wood.' : 'None yet.'}</p>
          ) : (
            <ul className="bm-list">
              {[...byPart.entries()].map(([part, list]) => (
                <li key={part}>
                  <i className="hurt" />
                  <span>
                    {PART_NAME[part]} <span className="muted small">· {list.map((i) => `${i.name}, ${i.age}`).join('; ')}</span>
                  </span>
                  <b className="num">{Math.round(list.reduce((t, i) => t + i.days, 0) / 7)} wk</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
