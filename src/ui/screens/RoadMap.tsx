// The road map (round 33, owner: "i like the word road map a lot. can you actually make a map, with
// highschool as beginner, college as intermediate, nba as advanced, and the minigames as an oversea
// league? the user's avatar will ride a car from those places, and ride a boat to the minigames. the
// checklist appears on the top right corner like a bucket list, and once a goal is complete, a check
// is on that part"). The page between the levels: a pixel map, the bucket list, a card for each stop.

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { Icon } from '../art/Icon';
import { SKIN_COLORS, HAIR_COLORS } from '../art/Player';
import { LEVEL_IDS, LEVEL_NAME, type Level } from '../../engine/levels';
import { LEVEL_COPY, LEVEL_GOAL } from '../../content/roadmap';
import { ROADMAP } from '../../engine/balance';
import { ROAD_MINIS, ROAD_NEED, inTutorial, levelOpen, levelsDone, nextLevel, passGrade, type Road, type RoadMini } from '../road';
import { LevelAdds } from '../components/LevelAdds';
import { Roll, Tick } from '../components/Scroll';
import { SettingsMenu } from '../components/Settings';
import { ShareButton } from '../components/Share';
import { FootBar } from '../components/FootBar';
import { sfx } from '../sound';

// ---------- the map, on a 192 by 108 pixel grid ----------

const W = 192;
const H = 108;
const C = {
  sea: '#2B7BC4', wave: '#5AA2E0', deep: '#2369AE',
  land: '#5FAE4E', shade: '#4E9A42', tuft: '#7CC466',
  sand: '#E9D29A', sandD: '#CDB277',
  road: '#6B6F78', edge: '#4D5058', dash: '#FCC419',
  brick: '#C2462E', brickD: '#93321F', roofHS: '#5A2A1E', lit: '#FFE89A', door: '#3A2A20', pole: '#D0D4DA', blue: '#1C7ED6',
  stone: '#E6DCC4', stoneD: '#C2B596', dome: '#8FA3B8', domeD: '#6E8399', white: '#FFFFFF', red: '#E03131',
  arena: '#3C4250', ring: '#596173', lights: '#FFF3BF', orange: '#F76707',
  trunk: '#8B5A2B', leaf: '#2F9E44', leafD: '#1E7A32', court: '#C97B3B', plank: '#A0703C', plankD: '#7A5229',
  tire: '#18141C', glass: '#BFE3FF', hull: '#8B5A2B', sail: '#F8F9FA',
};

type Px = [number, number, number, number, string];

/** The road: high school, college, the arena, then the dock. */
const WAY: [number, number][] = [
  [22, 84], [58, 84], [58, 41], [106, 41], [106, 63], [146, 63],
];
/** Where each stop sits on the road (beginner, intermediate, advanced, the dock). */
const STOPS: [number, number][] = [[30, 84], [77, 41], [122, 63], [146, 63]];
const ISLAND: [number, number] = [170, 87];

const coast = (y: number) => 147 + Math.round(5 * Math.sin(y / 7) + 3 * Math.sin(y / 3.1));

function mapPixels(): Px[] {
  const px: Px[] = [];
  const R = (x: number, y: number, w: number, h: number, c: string) => px.push([x, y, w, h, c]);
  R(0, 0, W, H, C.sea);
  // waves, here and there
  for (let i = 0; i < 46; i++) {
    const x = (i * 53) % W;
    const y = (i * 29) % H;
    R(x, y, 3, 1, i % 3 ? C.wave : C.deep);
  }
  // the land, row by row, with a beach along the coast
  for (let y = 0; y < H; y++) {
    const e = coast(y) - (y > 96 ? (y - 96) * 3 : 0);
    R(0, y, e, 1, C.land);
    R(e, y, 3, 1, y % 4 === 0 ? C.sandD : C.sand);
  }
  // grass, shaded patches and tufts
  for (let i = 0; i < 60; i++) {
    const x = (i * 37 + 11) % 140;
    const y = (i * 23 + 5) % H;
    R(x, y, i % 4 ? 2 : 4, 1, i % 2 ? C.tuft : C.shade);
  }
  // the island
  const [ix, iy] = ISLAND;
  for (let y = iy - 9; y <= iy + 9; y++) {
    const hw = Math.round(17 * Math.sqrt(Math.max(0, 1 - ((y - iy) / 9.5) ** 2)));
    R(ix - hw, y, hw * 2, 1, C.sand);
    if (hw > 4) R(ix - hw + 3, y, hw * 2 - 6, 1, Math.abs(y - iy) < 7 ? C.land : C.sand);
  }
  // a little court on the island
  R(ix - 12, iy - 2, 12, 7, C.court);
  R(ix - 12, iy - 2, 12, 1, C.white);
  R(ix - 12, iy + 4, 12, 1, C.white);
  R(ix - 7, iy - 2, 1, 7, C.white);
  R(ix - 13, iy + 1, 1, 2, C.white);
  // a palm
  R(ix + 6, iy - 10, 2, 11, C.trunk);
  R(ix + 2, iy - 12, 10, 2, C.leaf);
  R(ix + 1, iy - 10, 3, 2, C.leafD);
  R(ix + 10, iy - 10, 3, 2, C.leafD);
  R(ix + 5, iy - 14, 4, 2, C.leaf);
  // trees on the land
  for (const [x, y] of [[8, 18], [20, 30], [40, 12], [46, 54], [32, 44], [92, 72], [80, 92], [56, 97], [124, 86], [100, 96], [132, 18], [12, 96], [90, 10], [116, 26], [70, 64], [140, 40]]) {
    R(x, y + 3, 1, 2, C.trunk);
    R(x - 2, y, 5, 3, C.leaf);
    R(x - 1, y - 1, 3, 1, C.leaf);
    R(x - 2, y + 2, 5, 1, C.leafD);
  }
  // the road: four pixels wide, edges and a dashed line
  for (let i = 1; i < WAY.length; i++) {
    const [x1, y1] = WAY[i - 1];
    const [x2, y2] = WAY[i];
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    R(x - 2, y - 2, w + 4, h + 4, C.road);
    if (h === 0) {
      R(x - 2, y - 3, w + 4, 1, C.edge);
      R(x - 2, y + 2, w + 4, 1, C.edge);
      for (let d = x + 1; d < x + w - 1; d += 5) R(d, y - 1, 2, 1, C.dash);
    } else {
      R(x - 3, y - 2, 1, h + 4, C.edge);
      R(x + 2, y - 2, 1, h + 4, C.edge);
      for (let d = y + 1; d < y + h - 1; d += 5) R(x - 1, d, 1, 2, C.dash);
    }
  }
  // the dock
  R(144, 61, 14, 5, C.plank);
  for (let x = 145; x < 158; x += 3) R(x, 61, 1, 5, C.plankD);
  R(157, 66, 1, 3, C.plankD);
  R(145, 66, 1, 3, C.plankD);
  // the sea route to the island, dotted
  for (let k = 0; k < 7; k++) R(160 + k, 67 + k * 2, 1, 1, C.white);
  // high school: brick, windows, a door and the flag
  R(12, 64, 30, 16, C.brick);
  R(12, 62, 30, 2, C.roofHS);
  for (let y = 66; y < 76; y += 4) for (let x = 15; x < 40; x += 5) R(x, y, 3, 2, C.lit);
  R(25, 74, 4, 6, C.door);
  for (let y = 67; y < 80; y += 3) R(12, y, 30, 1, C.brickD);
  R(38, 52, 1, 10, C.pole);
  R(39, 52, 5, 3, C.blue);
  // college: stone, columns, a stepped dome and a pennant
  R(62, 24, 32, 14, C.stone);
  R(62, 22, 32, 2, C.stoneD);
  for (let x = 64; x < 93; x += 4) R(x, 25, 2, 13, C.white);
  R(70, 18, 16, 4, C.dome);
  R(73, 15, 10, 3, C.dome);
  R(76, 13, 4, 2, C.domeD);
  R(70, 21, 16, 1, C.domeD);
  R(77, 8, 1, 5, C.pole);
  R(78, 8, 4, 2, C.red);
  R(75, 32, 6, 6, C.door);
  // the NBA arena: a stepped bowl, a ring of lights and a banner
  R(108, 50, 32, 10, C.arena);
  R(110, 47, 28, 3, C.arena);
  R(113, 45, 22, 2, C.ring);
  R(117, 44, 14, 1, C.ring);
  for (let x = 110; x < 138; x += 3) R(x, 50, 1, 1, C.lights);
  R(118, 53, 12, 4, C.orange);
  R(120, 54, 8, 2, C.white);
  R(122, 57, 4, 3, C.door);
  return px;
}

const CAR = ['...hh....', '..gssg...', '.RRRRRRR.', 'RRRRRRRRY', 'RRRRRRRRR', '.OO...OO.'];
const BOAT = ['....S.....', '....SS....', '....SSS...', '..hhSSSS..', '..ss.S....', 'TTTTTTTTTT', '.TTTTTTTT.'];

function Sprite({ rows, x, y, colors, flip = false }: { rows: string[]; x: number; y: number; colors: Record<string, string>; flip?: boolean }) {
  const w = rows[0].length;
  return (
    <g transform={`translate(${x},${y})${flip ? ` translate(${w},0) scale(-1,1)` : ''}`}>
      {rows.flatMap((row, j) => [...row].map((ch, i) => (colors[ch] ? <rect key={`${i}-${j}`} x={i} y={j} width={1} height={1} fill={colors[ch]} /> : null)))}
    </g>
  );
}

/** Every pixel of the road, start to dock, so the car can drive it a step at a time. */
const ROUTE: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let i = 1; i < WAY.length; i++) {
    const [x1, y1] = WAY[i - 1];
    const [x2, y2] = WAY[i];
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let k = 0; k < n; k++) out.push([x1 + Math.sign(x2 - x1) * k, y1 + Math.sign(y2 - y1) * k]);
  }
  out.push(WAY[WAY.length - 1]);
  return out;
})();
const stopAt = (s: [number, number]) => ROUTE.findIndex(([x, y]) => x === s[0] && y === s[1]);

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The pixel map: the places, the road, the car at the next stop (it drives there the first time
 * the page opens after a level), and the boat at the dock or sailing to the island. */
function MapArt({ road, sailing, onSailed }: { road: Road; sailing: boolean; onSailed: () => void }) {
  const px = useMemo(mapPixels, []);
  const next = nextLevel(road);
  const at = next ? LEVEL_IDS.indexOf(next) : 3;
  const target = stopAt(STOPS[at]);
  const from = at > 0 ? stopAt(STOPS[at - 1]) : target;
  const key = `btr-road-drove-${at}`;
  const [step, setStep] = useState(() => {
    try {
      return sessionStorage.getItem(key) || reduced() ? target : from;
    } catch {
      return target;
    }
  });
  useEffect(() => {
    if (step >= target) {
      try {
        sessionStorage.setItem(key, '1');
      } catch {
        /* it drives again next time */
      }
      return;
    }
    const t = setTimeout(() => setStep((s) => Math.min(target, s + 2)), 45);
    return () => clearTimeout(t);
  }, [step, target, key]);
  // the boat: at the dock, or on its way across in steps
  const [sail, setSail] = useState(0);
  useEffect(() => {
    if (!sailing) return setSail(0);
    if (sail >= 8) {
      const t = setTimeout(onSailed, 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSail((k) => k + 1), reduced() ? 20 : 120);
    return () => clearTimeout(t);
  }, [sailing, sail, onSailed]);
  const look = road.look;
  const kin = { h: look ? HAIR_COLORS[look.hair] : '#231B18', s: SKIN_COLORS[look?.skin ?? 2], g: C.glass, R: C.red, Y: C.lights, O: C.tire, S: C.sail, T: C.hull };
  const [cx, cy] = ROUTE[step];
  const boatX = 156 + sail * 1.5;
  const boatY = 60 + sail * 2;
  return (
    <svg className="roadmap-art" viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label="The road map: high school, college, the NBA arena, and the island of mini-games across the sea">
      {px.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
      <Sprite rows={BOAT} x={Math.round(boatX)} y={Math.round(boatY)} colors={sailing || sail ? kin : { ...kin, h: '', s: '' }} />
      {!sailing && <Sprite rows={CAR} x={cx - 4} y={cy - 5} colors={kin} />}
    </svg>
  );
}

const MINIS = ROAD_MINIS;
const MINI_ICON: Record<RoadMini, string> = { threes: 'shoot', dunk: 'finish', street: 'flame', legends: 'spotlight', lab: 'lab', rhythm: 'lockdown', office: 'office' };

/** The bucket list in the map's top-right corner: every goal on the road, ticked as it is done. */
function BucketList({ road }: { road: Road }) {
  const minis = MINIS.filter((m) => passGrade(road.minis[m])).length;
  const items: [string, boolean, string?][] = [
    ...LEVEL_IDS.map((l) => [`${LEVEL_NAME[l]} · ${LEVEL_COPY[l].place}`, !!road.passed[l], road.passed[l]?.star ? 'All-Star' : undefined] as [string, boolean, string?]),
    ['Island · every mini-game at C or better', minis === MINIS.length, `${minis}/${MINIS.length}`],
    ['The closing tour', !!road.toured],
  ];
  return (
    <aside className="bucket" aria-label="Bucket list">
      <Roll />
      <div className="scroll-paper">
        <div className="bucket-title">Bucket list</div>
        <ul>
          {items.map(([label, on, tag]) => (
            <li key={label} className={on ? 'done' : ''}>
              <Tick on={on} />
              <span>{label}</span>
              {tag && <small className="bucket-tag">{tag}</small>}
            </li>
          ))}
        </ul>
      </div>
      <Roll />
    </aside>
  );
}

const PLACE_ICON: Record<Level, string> = { beginner: 'lvl-HSV', intermediate: 'lvl-NCAA', advanced: 'lvl-NBA' };

/** A stop on the road: passed, next, or still locked. */
function LevelStop({ level, road }: { level: Level; road: Road }) {
  const setCreating = useStore((s) => s.setCreating);
  const copy = LEVEL_COPY[level];
  const passed = road.passed[level];
  const open = levelOpen(road, level);
  const next = nextLevel(road) === level;
  return (
    <section className={`card stack road-stop${next ? ' next' : ''}${open ? '' : ' locked'}`} data-tour={next ? 'road-next' : undefined}>
      <div className="row road-stop-head">
        <Icon name={PLACE_ICON[level]} size={40} />
        <div style={{ minWidth: 0 }}>
          <div className="kicker">
            Level {copy.n} · {copy.place}
          </div>
          <div className="sec-title">{LEVEL_NAME[level]}</div>
        </div>
        <div className="spacer" />
        {passed ? (
          <span className="tag good with-icon">
            <Icon name={passed.star ? 'stars' : 'checklist'} size={18} />
            {passed.star ? 'Passed · All-Star' : 'Passed'}
          </span>
        ) : !open ? (
          <span className="tag with-icon">
            <Icon name="lock" size={18} />
            Locked
          </span>
        ) : null}
      </div>
      {next && (
        <>
          <p className="small">
            The goal: {LEVEL_GOAL} in {ROADMAP[level].nbaSeasons} NBA seasons.
          </p>
          <LevelAdds level={level} />
        </>
      )}
      {open && (
        <div className="row-end">
          <button className={`btn${next ? '' : ' ghost small'}`} onClick={() => (sfx('confirm'), setCreating(level))}>
            {next ? `Drive to ${copy.place.toLowerCase()}: play ${LEVEL_NAME[level].toLowerCase()}` : 'Play it again'}
          </button>
        </div>
      )}
      {!open && <p className="small muted">Opens after {LEVEL_NAME[LEVEL_IDS[LEVEL_IDS.indexOf(level) - 1]].toLowerCase()}.</p>}
    </section>
  );
}

/** The island: the mini-games, by boat, any time after beginner. */
function IslandStop({ road, onSail }: { road: Road; onSail: () => void }) {
  const open = !!road.passed.beginner;
  const done = MINIS.filter((m) => passGrade(road.minis[m])).length;
  return (
    <section className={`card stack road-stop island${open ? '' : ' locked'}`}>
      <div className="row road-stop-head">
        <Icon name="palm" size={40} />
        <div style={{ minWidth: 0 }}>
          <div className="kicker">Overseas league · the island</div>
          <div className="sec-title">The mini-games</div>
        </div>
        <div className="spacer" />
        <span className="tag with-icon">
          <Icon name={open ? 'controller' : 'lock'} size={18} />
          {open ? `${done}/${MINIS.length} at C or better` : 'Locked'}
        </span>
      </div>
      <p className="small">{open ? 'Play each one once and get a C or better. Any time, between levels.' : 'Opens after beginner.'}</p>
      {open && (
        <ul className="island-grid">
          {MINIS.map((m) => (
            <li key={m} className={passGrade(road.minis[m]) ? 'done' : ''} title={`C: ${ROAD_NEED[m]}`}>
              <Icon name={MINI_ICON[m]} size={32} />
              <b>{road.minis[m] ?? '·'}</b>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div className="row-end">
          <button className="btn ghost" onClick={onSail}>
            Take the boat to the island
          </button>
        </div>
      )}
    </section>
  );
}

/** The last stop: the closing tour, once advanced is passed. */
function TourStop({ road }: { road: Road }) {
  const start = useStore((s) => s.startClosing);
  const open = levelsDone(road);
  return (
    <section className={`card stack road-stop${open && !road.toured ? ' next' : ''}${open ? '' : ' locked'}`} data-tour={open && !road.toured ? 'tour-stop' : undefined}>
      <div className="row road-stop-head">
        <Icon name="stars" size={40} />
        <div style={{ minWidth: 0 }}>
          <div className="kicker">The last stop</div>
          <div className="sec-title">The closing tour</div>
        </div>
        <div className="spacer" />
        {road.toured ? (
          <span className="tag good with-icon">
            <Icon name="checklist" size={18} />
            Done
          </span>
        ) : !open ? (
          <span className="tag with-icon">
            <Icon name="lock" size={18} />
            Locked
          </span>
        ) : null}
      </div>
      <p className="small">{open ? 'A star’s career, already under way: the rest of the game, stop by stop. About ten minutes.' : 'Opens after advanced.'}</p>
      {open && !road.toured && (
        <div className="row-end">
          <button className="btn" onClick={() => (sfx('confirm'), start())}>
            Start the closing tour
          </button>
        </div>
      )}
    </section>
  );
}

/** The start page's Levels card, once the full game is open: the road map, to play a level again. */
export function LevelsCard() {
  const setPage = useStore((s) => s.setPage);
  return (
    <section className="card stack">
      <div className="sec-title with-icon">
        <Icon name="map" size={28} />
        Levels
      </div>
      <p className="small muted">The road map: beginner, intermediate and advanced. Play any of them again; they count nowhere.</p>
      <button className="btn ghost" data-tour="levels-card" onClick={() => setPage('road')}>
        Open the road map
      </button>
    </section>
  );
}

export function RoadMap() {
  const road = useStore((s) => s.road);
  const setMini = useStore((s) => s.setMini);
  const setPage = useStore((s) => s.setPage);
  const [sailing, setSailing] = useState(false);
  const tut = inTutorial(road);
  return (
    <div className="wrap no-tabs roadmap-page">
      <header className="top">
        <div className="brand">
          Bench to <span>Rafters</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {!tut && (
            <button className="icon-btn" onClick={() => setPage(null)}>
              Back to the start page
            </button>
          )}
          <ShareButton />
          <SettingsMenu g={null} />
        </div>
      </header>
      <section className="hero level-hero">
        <div className="kicker">The road map</div>
        <h1>Your road</h1>
        <p className="lede">Three levels and an island of mini-games. Finish them all and the full game opens.</p>
      </section>
      <div className="roadmap">
        <MapArt road={road} sailing={sailing} onSailed={() => setMini('hub')} />
        <BucketList road={road} />
      </div>
      <div className="road-stops">
        {LEVEL_IDS.map((l) => (
          <LevelStop key={l} level={l} road={road} />
        ))}
        <IslandStop road={road} onSail={() => (sfx('page'), setSailing(true))} />
        <TourStop road={road} />
      </div>
      <FootBar where="road map" />
    </div>
  );
}
