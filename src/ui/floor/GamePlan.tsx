// A team's game plan on the Floor's page (after round 42, owner: "let's let the player choose team
// archetype (5 out, 1 big, ...), team style (run and gun, ball movement, ...), and where each player
// sits on offense (ex: lebron could be at top, not corner)"): the shape, the style, and a half court
// in pixels with each of his five on his spot, changed from a list beside it. Kept on this device.

import { SHAPES, SPOTS } from '../../engine/floor/court';
import type { FloorPlan, FloorPlay, FloorShape, FloorSpot } from '../../engine/floor/sim';
import type { Pos } from '../../engine/types';
import { t, tx } from '../../i18n';

const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
const KEY = 'btr-floor-plan';

const SHAPE_NAME: Record<FloorShape, { name: string; text: string }> = {
  standard: { name: tx('Standard'), text: tx('Guards up top and on a wing, a forward in the corner, the centre at the rim.') },
  fiveOut: { name: tx('Five out'), text: tx('All five beyond the arc: the paint left open for drives.') },
  fourOutOneIn: { name: tx('Four out, one in'), text: tx('Four shooters around one big on the block.') },
  twinTowers: { name: tx('Twin towers'), text: tx('Two bigs on the blocks, three on the perimeter.') },
  horns: { name: tx('Horns'), text: tx('Both bigs at the elbows, shooters in the corners: picks and posts.') },
};
const PLAY_NAME: Record<FloorPlay, { name: string; text: string }> = {
  balanced: { name: tx('Balanced'), text: tx('A bit of everything.') },
  runGun: { name: tx('Run and gun'), text: tx('Longer fast breaks, early shots, more threes and drives.') },
  motion: { name: tx('Ball movement'), text: tx('More passes, shots shared out, almost no isolations.') },
  iso: { name: tx('Isolation'), text: tx('The star takes over: sides cleared for him, fewer passes.') },
  grind: { name: tx('Grit and grind'), text: tx('Slow and physical: post-ups, patience, tougher contests.') },
  space: { name: tx('Pace and space'), text: tx('Threes and drives, few post-ups.') },
};
const SPOT_NAME: Record<FloorSpot, string> = {
  top: tx('Top of the key'),
  leftWing: tx('Left wing'),
  rightWing: tx('Right wing'),
  leftCorner: tx('Left corner'),
  rightCorner: tx('Right corner'),
  leftElbow: tx('Left elbow'),
  rightElbow: tx('Right elbow'),
  highPost: tx('High post'),
  leftBlock: tx('Left block'),
  rightBlock: tx('Right block'),
};

export const DEFAULT_PLAN: FloorPlan = { shape: 'standard', style: 'balanced' };

/** The plan kept from last time on this device, or the standard one. */
export function rememberedPlan(): FloorPlan {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as FloorPlan | null;
    if (v && v.shape in SHAPES && v.style in PLAY_NAME) return { shape: v.shape, style: v.style, spots: v.spots };
  } catch {
    // nothing kept
  }
  return DEFAULT_PLAN;
}
function remember(p: FloorPlan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage blocked: picked again next time
  }
}

/** Where each position stands under a plan. */
export const spotsOf = (p: FloorPlan): Record<Pos, FloorSpot> => Object.fromEntries(POS.map((pos) => [pos, p.spots?.[pos] ?? SHAPES[p.shape][pos]])) as Record<Pos, FloorSpot>;

/** The half court: the basket at the bottom, the five on their spots (pixel art, a 2-pixel grid). */
function Court({ at, names }: { at: Record<Pos, FloorSpot>; names: Partial<Record<Pos, string>> }) {
  // court feet to the picture: 50 feet wide, 32 deep from the baseline, 4 pixels a foot
  const X = (side: number) => Math.round((25 + side) * 4);
  const Y = (ahead: number) => Math.round(136 - ahead * 4);
  return (
    <svg className="gp-court" viewBox="0 0 200 144" shapeRendering="crispEdges" role="img" aria-label={t('Where each player stands')}>
      <rect x="0" y="0" width="200" height="144" fill="var(--gp-floor)" />
      {/* the paint, the free-throw line, the arc (in steps), the rim */}
      <rect x="68" y="60" width="64" height="76" fill="var(--gp-paint)" />
      <rect x="68" y="60" width="64" height="2" fill="var(--gp-line)" />
      <rect x="68" y="60" width="2" height="76" fill="var(--gp-line)" />
      <rect x="130" y="60" width="2" height="76" fill="var(--gp-line)" />
      <rect x="12" y="104" width="2" height="32" fill="var(--gp-line)" />
      <rect x="186" y="104" width="2" height="32" fill="var(--gp-line)" />
      {[
        [14, 96, 8],
        [20, 82, 8],
        [28, 68, 10],
        [38, 56, 12],
        [50, 46, 14],
        [64, 40, 18],
        [82, 36, 36],
      ].map(([x, y, w]) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height="2" fill="var(--gp-line)" />
          <rect x={200 - x - w} y={y} width={w} height="2" fill="var(--gp-line)" />
          <rect x={x} y={y} width="2" height={x === 14 ? 10 : 16} fill="var(--gp-line)" />
          <rect x={198 - x} y={y} width="2" height={x === 14 ? 10 : 16} fill="var(--gp-line)" />
        </g>
      ))}
      <rect x="92" y="130" width="16" height="2" fill="var(--gp-rim)" />
      <rect x="0" y="142" width="200" height="2" fill="var(--gp-line)" />
      {POS.map((pos) => {
        const [ahead, side] = SPOTS[at[pos]];
        const x = X(side);
        const y = Y(ahead);
        return (
          <g key={pos}>
            <rect x={x - 7} y={y - 7} width="14" height="14" fill="var(--gp-man)" />
            <rect x={x - 7} y={y - 7} width="14" height="2" fill="var(--gp-man-hi)" />
            <text x={x} y={y + 3} textAnchor="middle" className="gp-pos">
              {pos}
            </text>
            {names[pos] && (
              <text x={x} y={y + (ahead < 4 ? -10 : 17)} textAnchor="middle" className="gp-name">
                {names[pos]!.split(' ').slice(-1)[0]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function GamePlan({ plan, onChange, names }: { plan: FloorPlan; onChange: (p: FloorPlan) => void; names: Partial<Record<Pos, string>> }) {
  const set = (p: FloorPlan) => {
    remember(p);
    onChange(p);
  };
  const at = spotsOf(plan);
  // a spot another position holds is swapped with it, so two never share one
  const move = (pos: Pos, to: FloorSpot) => {
    const next = { ...at };
    const other = POS.find((q) => q !== pos && next[q] === to);
    if (other) next[other] = next[pos];
    next[pos] = to;
    const base = SHAPES[plan.shape];
    const spots = Object.fromEntries(POS.filter((q) => next[q] !== base[q]).map((q) => [q, next[q]]));
    set({ ...plan, spots: Object.keys(spots).length ? spots : undefined });
  };
  return (
    <div className="fm-row gp">
      <div className="sec-title">{t('Game plan')}</div>
      <div className="gp-pick" role="group" aria-label={t('Team shape')}>
        <span className="small muted">{t('Shape')}</span>
        {(Object.keys(SHAPE_NAME) as FloorShape[]).map((k) => (
          <button key={k} className={`pick-chip${plan.shape === k ? ' on' : ''}`} aria-pressed={plan.shape === k} title={t(SHAPE_NAME[k].text)} onClick={() => set({ ...plan, shape: k, spots: undefined })}>
            {t(SHAPE_NAME[k].name)}
          </button>
        ))}
      </div>
      <div className="gp-pick" role="group" aria-label={t('Team style')}>
        <span className="small muted">{t('Style')}</span>
        {(Object.keys(PLAY_NAME) as FloorPlay[]).map((k) => (
          <button key={k} className={`pick-chip${plan.style === k ? ' on' : ''}`} aria-pressed={plan.style === k} title={t(PLAY_NAME[k].text)} onClick={() => set({ ...plan, style: k })}>
            {t(PLAY_NAME[k].name)}
          </button>
        ))}
      </div>
      <p className="small muted">
        {t(SHAPE_NAME[plan.shape].text)} {t(PLAY_NAME[plan.style].text)}
      </p>
      <div className="gp-body">
        <Court at={at} names={names} />
        <div className="gp-spots">
          {POS.map((pos) => (
            <label key={pos} className="small">
              <b>{pos}</b> {names[pos] ?? ''}
              <select value={at[pos]} onChange={(e) => move(pos, e.target.value as FloorSpot)}>
                {(Object.keys(SPOT_NAME) as FloorSpot[]).map((k) => (
                  <option key={k} value={k}>
                    {t(SPOT_NAME[k])}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
