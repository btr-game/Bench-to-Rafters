// Round 22: the body map on the Player tab. Front and back views: each muscle group shaded by
// how much training has built it, and a red mark wherever he has been hurt (a number when it
// happened more than once). With it: how he grew (height and weight by age), wingspan, body
// wear, the muscles training built most, and every injury by body part. Round 36: all of it in the
// Body panel, with his weight's effects, his weak hand and his free-throw touch.

import { useState } from 'react';
import type { GameState } from '../../engine/types';
import { MUSCLES, injuryPart, type BodyPart, type Muscle } from '../../engine/player/body';
import { buildWord, idealWeight, weightOf } from '../../engine/player/weight';
import { touchOf } from '../../engine/player/touch';
import { ATTRS } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import { ht } from '../format';
import { Card, Extra, Meter } from './bits';
import { InjuryBadge, SEV_NAME } from '../art/careerArt';
import { t, tx } from '../../i18n';

const WORST = ['season', 'major', 'minor', 'dtd'] as const;

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
const PART_NAME: Record<BodyPart, string> = { head: tx('Head'), neck: tx('Neck'), shoulder: tx('Shoulder'), back: tx('Back'), hand: tx('Hand and wrist'), groin: tx('Hip and groin'), hamstring: tx('Hamstring'), knee: tx('Knee'), calf: tx('Calf and Achilles'), ankle: tx('Ankle'), foot: tx('Foot'), whole: tx('Illness and other') };

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
    const u = Math.max(0, Math.min(1, ((x - bx) * dx + (y - by) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - (bx + u * dx), y - (by + u * dy)) <= r;
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

/** Time missed, in days under two weeks (a sore ankle is not "0 wk"), else in weeks. */
const timeOut = (days: number): string => (days < 14 ? (days === 1 ? t('1 day') : t('{n} days', { n: days })) : t('{n} wk', { n: Math.round(days / 7) }));

/** The ratings his weight is adding or taking away right now, biggest first. */
function frameLine(p: GameState['player']): string {
  const f = p.frame ?? {};
  return ATTRS.filter((k) => Math.abs(f[k] ?? 0) >= 0.25)
    .sort((a, b) => Math.abs(f[b]!) - Math.abs(f[a]!))
    .map((k) => `${NAMES.attr[k]} ${f[k]! > 0 ? '+' : '−'}${Math.abs(f[k]!).toFixed(1)}`)
    .join(' · ');
}

const wearWord = (w: number): string => (w < 25 ? t('fresh') : w < 50 ? t('some miles') : w < 75 ? t('worn') : t('heavily worn'));

/** Round 36 (from the owner's simplification list): his body in one panel on the Player tab, folded
 * until it is opened. Height and where it is heading, weight and what it does, wingspan and wear,
 * his weak hand and free-throw touch, then the body map. Fast break keeps the two meters, as they
 * were on the Ratings card. */
export function BodyCard({ g }: { g: GameState }) {
  const p = g.player;
  const [hover, setHover] = useState<Muscle | null>(null);
  // round 27 (owner: "show the injuries on it when i hover my mouse on the red spots")
  const [spot, setSpot] = useState<BodyPart | null>(null);
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
  const wear = p.wear ?? 0;
  const does = frameLine(p);
  return (
    <Card title={t('Body')} fold="Body" kicker={`${ht(p.height)} · ${weightOf(p)} lb · ${buildWord(p)}`} tour="body" startShut>
      <Extra>
        <dl className="facts">
          <div>
            <dt>{t('Height')}</dt>
            <dd>
              {ht(p.height)}
              {first && first.height < p.height && <span className="muted"> · {t('{n} since {age}', { n: `+${p.height - first.height}″`, age: first.age })}</span>}
              {p.height < p.heightProj && <span className="muted"> → {t('about {h}', { h: ht(p.heightProj) })}</span>}
            </dd>
          </div>
          <div>
            <dt>{t('Weight')}</dt>
            <dd>
              {weightOf(p)} lb{' '}
              <span className="muted">
                · {buildWord(p)}
                {first?.weight ? ` · ${t('{n} since {age}', { n: `${weightOf(p) - first.weight >= 0 ? '+' : '−'}${Math.abs(weightOf(p) - first.weight)}`, age: first.age })}` : ''} · {t('best about {n}', { n: Math.round(idealWeight(p.height, p.age) / 5) * 5 })}
              </span>
            </dd>
          </div>
          <div>
            <dt>{t('Wingspan')}</dt>
            <dd>
              {ht(p.wingspan)}
              <span className="muted">
                {' '}
                · {p.wingspan >= p.height ? t('{n}″ over your height', { n: Math.abs(p.wingspan - p.height) }) : t('{n}″ under your height', { n: Math.abs(p.wingspan - p.height) })}
              </span>
            </dd>
          </div>
          <div>
            <dt>Body wear</dt>
            <dd>
              {Math.round(wear)} / 100 <span className="muted">· {wearWord(wear)}</span>
            </dd>
          </div>
          {does && (
            <div style={{ gridColumn: '1 / -1' }}>
              <dt>{t('What your weight does')}</dt>
              <dd>{does}</dd>
            </div>
          )}
        </dl>
        {growth.length > 1 && (
          <div className="bm-growth">
            {growth.map((x, i) => (
              <div key={x.age} className="bm-age" title={x.weight ? t('Age {age}: {h}, {w} lb', { age: x.age, h: ht(x.height), w: x.weight }) : t('Age {age}: {h}', { age: x.age, h: ht(x.height) })}>
                <i style={{ height: `${20 + ((x.height - first.height) / Math.max(1, p.height - first.height)) * 50}px` }} className={i > 0 && x.height > growth[i - 1].height ? 'grew' : ''} />
                <span>{x.age}</span>
              </div>
            ))}
          </div>
        )}
      </Extra>
      <div className="meters">
        <Meter label="Free-throw touch" value={touchOf(p)} tone="ink" />
        <Meter label={`${p.hand === 'L' ? 'Right' : 'Left'} hand (weak hand)`} value={p.offhand} tone="ink" />
      </div>
      <Extra>
      <div className="bm">
        <div>
          <div className="sec-title">{t('Body map')}</div>
          <div className="kicker">{t('What training built, and where it hurt. Hover a muscle for its number, a red spot for its injuries.')}</div>
        </div>
        <div className="bm-figure">
        <svg viewBox="0 0 410 428" className="bm-svg" role="img" aria-label={t('Body map, front and back')}>
          <text x={100} y={422} textAnchor="middle" className="bm-cap">
            {t('Front')}
          </text>
          <text x={BACK_X + 100} y={422} textAnchor="middle" className="bm-cap">
            {t('Back')}
          </text>
          <Figure shapes={FRONT} dx={0} muscles={muscles} top={top} hover={hover} setHover={setHover} />
          <Figure shapes={BACK} dx={BACK_X} muscles={muscles} top={top} hover={hover} setHover={setHover} />
          {[...byPart.entries()]
            .filter(([part]) => part !== 'whole')
            .map(([part, list]) => {
              const [x, y] = SPOT[part as Exclude<BodyPart, 'whole'>];
              const bad = list.some((i) => i.key === 'major' || i.key === 'season');
              return (
                <g
                  key={part}
                  className={`bm-hurt${spot === part ? ' on' : ''}`}
                  shapeRendering="crispEdges"
                  tabIndex={0}
                  role="button"
                  aria-label={list.length === 1 ? t('{part}: 1 injury', { part: t(PART_NAME[part]) }) : t('{part}: {n} injuries', { part: t(PART_NAME[part]), n: list.length })}
                  onMouseEnter={() => setSpot(part)}
                  onMouseLeave={() => setSpot(null)}
                  onFocus={() => setSpot(part)}
                  onBlur={() => setSpot(null)}
                  onClick={() => setSpot(spot === part ? null : part)}
                >
                  <rect x={Math.round(x / PX) * PX - (bad ? 12 : 9)} y={Math.round(y / PX) * PX - (bad ? 12 : 9)} width={bad ? 24 : 18} height={bad ? 24 : 18} className={bad ? 'major' : ''} />
                  <text x={Math.round(x / PX) * PX} y={Math.round(y / PX) * PX + 4} textAnchor="middle">
                    {list.length > 1 ? list.length : '+'}
                  </text>
                </g>
              );
            })}
        </svg>
        {spot && spot !== 'whole' && byPart.get(spot) && (
          <div className={`bm-tip${SPOT[spot][1] < 120 ? ' below' : ''}${SPOT[spot][0] < 110 ? ' at-left' : SPOT[spot][0] > 300 ? ' at-right' : ''}`} style={{ left: `${(SPOT[spot][0] / 410) * 100}%`, top: `${(SPOT[spot][1] / 428) * 100}%` }} role="tooltip">
            <b>{t(PART_NAME[spot])}</b>
            {byPart.get(spot)!.map((i, k) => (
              <div key={k} className="bm-tip-row">
                <InjuryBadge name={i.name} sev={i.key} size={30} />
                <span>
                  {i.name}
                  <small>
                    {SEV_NAME[i.key]} · {t('age {age}', { age: i.age })} · {t('out {time}', { time: timeOut(i.days) })}
                  </small>
                </span>
              </div>
            ))}
          </div>
        )}
        </div>
        <div className="bm-side stack">
          <div className="sec-title">{t('Most built')}</div>
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
            <p className="small muted">{t('Every half of training adds up here from now on.')}</p>
          )}
          <div className="sec-title">{t('Injuries')}</div>
          {injuries.length === 0 ? (
            <p className="small muted keep">{g.history.length ? t('None on record. Knock on wood.') : t('None yet.')}</p>
          ) : (
            <ul className="bm-list">
              {[...byPart.entries()].map(([part, list]) => (
                <li key={part}>
                  {/* round 27: the worst injury there, its edge the severity */}
                  {(() => {
                    const w = [...list].sort((a, b) => WORST.indexOf(a.key) - WORST.indexOf(b.key))[0];
                    return <InjuryBadge name={w.name} sev={w.key} size={24} />;
                  })()}
                  <span>
                    {t(PART_NAME[part])} <span className="muted small">· {list.map((i) => `${i.name}, ${i.age}`).join('; ')}</span>
                  </span>
                  <b className="num">{timeOut(list.reduce((sum, i) => sum + i.days, 0))}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </Extra>
    </Card>
  );
}
