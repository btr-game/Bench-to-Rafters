// The road map (round 33, owner: "i like the word road map a lot. can you actually make a map, with
// highschool as beginner, college as intermediate, nba as advanced, and the minigames as an oversea
// league? the user's avatar will ride a car from those places, and ride a boat to the minigames. the
// checklist appears on the top right corner like a bucket list, and once a goal is complete, a check
// is on that part"). The page between the levels: a pixel map and the bucket list. Round 34 (owner:
// "instead of putting the cards bellow the map, make it so that when the user clicks on the
// buildings, or use the arrow keys to move around, the cards pop out"): each place on the map is a
// button, the arrow keys drive the car along the road, and the place's card pops out beside it.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { achievementsNow, useStore } from '../../store';
import { recordFlight, recordRoad } from '../achievements';
import { Icon } from '../art/Icon';
import { SKIN_COLORS, HAIR_COLORS } from '../art/Player';
import { LEVEL_IDS, LEVEL_NAME, type Level } from '../../engine/levels';
import { LEVEL_COPY, LEVEL_GOAL } from '../../content/roadmap';
import { ROADMAP } from '../../engine/balance';
import { ROAD_MINIS, ROAD_NEED, UNLOCK_NAME, inTutorial, islandDone, levelOpen, levelsDone, nextLevel, passGrade, unlockOf, unlocked, type Road, type RoadMini } from '../road';
import { LevelAdds } from '../components/LevelAdds';
import { Roll, Tick } from '../components/Scroll';
import { SettingsMenu } from '../components/Settings';
import { ShareButton } from '../components/Share';
import { FootBar } from '../components/FootBar';
import { sfx } from '../sound';
import { isDev } from '../../dev/mode';
import { PixelX } from '../art/PixelX';
import { BOAT, CAR, PLANE, PLANE_COLORS, Sprite } from '../art/Sprites';
import { reducedMotion as reduced } from '../mainland';
import { t, tx } from '../../i18n';

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
  stage: '#5F3DC4', stageD: '#4527A0', gold: '#FCC419',
  runway: '#3F434B', runwayD: '#2E3138', apron: '#9AA0A8', apronD: '#7F858E', terminal: '#DDE3EA',
};

type Px = [number, number, number, number, string];

/** The road: the airport (owner, after round 38: "add airport on the road map to go back to
 * mainland"), high school, college, the arena, then the dock. */
const WAY: [number, number][] = [
  [6, 38], [6, 84], [58, 84], [58, 41], [106, 41], [106, 63], [146, 63],
];
const ISLAND: [number, number] = [170, 87];

type Place = 'airport' | Level | 'tour' | 'island';
/** The places in the road's order: where the car stops for each, the building to click (x, y, w, h
 * on the map), and the side its card pops out on. The island's stop is the dock. */
const PLACES: { id: Place; stop: [number, number]; box: [number, number, number, number]; side: 'left' | 'right' }[] = [
  { id: 'airport', stop: [6, 38], box: [2, 4, 52, 34], side: 'right' },
  { id: 'beginner', stop: [30, 84], box: [10, 50, 36, 32], side: 'right' },
  { id: 'intermediate', stop: [77, 41], box: [60, 6, 36, 34], side: 'right' },
  { id: 'advanced', stop: [122, 63], box: [106, 42, 36, 20], side: 'left' },
  { id: 'tour', stop: [130, 63], box: [110, 66, 29, 27], side: 'left' },
  { id: 'island', stop: [146, 63], box: [150, 72, 40, 26], side: 'left' },
];

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
  for (const [x, y] of [[46, 54], [32, 44], [92, 72], [80, 92], [56, 97], [100, 96], [132, 18], [12, 96], [90, 10], [116, 26], [70, 64], [140, 40]]) {
    R(x, y + 3, 1, 2, C.trunk);
    R(x - 2, y, 5, 3, C.leaf);
    R(x - 1, y - 1, 3, 1, C.leaf);
    R(x - 2, y + 2, 5, 1, C.leafD);
  }
  // the airport: the runway, the apron where the plane waits, the terminal and the tower
  R(3, 5, 52, 7, C.runway);
  R(3, 5, 52, 1, C.runwayD);
  R(3, 11, 52, 1, C.runwayD);
  for (let x = 8; x < 50; x += 6) R(x, 8, 3, 1, C.white);
  for (let y = 6; y < 11; y += 2) R(4, y, 2, 1, C.white), R(52, y, 2, 1, C.white);
  R(6, 12, 40, 8, C.apron);
  R(6, 19, 40, 1, C.apronD);
  R(9, 20, 26, 2, C.domeD);
  R(9, 22, 26, 10, C.terminal);
  R(11, 24, 22, 3, C.glass);
  for (let x = 14; x < 33; x += 4) R(x, 24, 1, 3, C.domeD);
  R(20, 28, 4, 4, C.door);
  R(9, 31, 26, 1, C.stoneD);
  R(40, 17, 3, 15, C.terminal);
  R(40, 17, 1, 15, C.stoneD);
  R(38, 13, 7, 4, C.domeD);
  R(39, 14, 5, 2, C.glass);
  R(41, 12, 1, 1, C.red);
  R(49, 14, 1, 6, C.pole);
  R(50, 14, 3, 1, C.orange);
  R(50, 15, 2, 1, C.white);
  R(6, 32, 30, 4, C.apron);
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
  // the closing tour: a stage with a gold star, two light towers and a plank floor
  R(116, 70, 18, 14, C.stage);
  R(116, 70, 18, 2, C.stageD);
  R(124, 73, 2, 2, C.gold);
  R(121, 75, 8, 2, C.gold);
  R(122, 77, 6, 1, C.gold);
  R(122, 78, 2, 2, C.gold);
  R(126, 78, 2, 2, C.gold);
  R(114, 84, 22, 4, C.plank);
  R(114, 88, 22, 1, C.plankD);
  R(115, 89, 1, 3, C.plankD);
  R(134, 89, 1, 3, C.plankD);
  R(113, 68, 1, 16, C.pole);
  R(112, 67, 3, 2, C.lights);
  R(136, 68, 1, 16, C.pole);
  R(135, 67, 3, 2, C.lights);
  return px;
}

/** One place on the map, cropped from it: the level's school, the college, the arena, the stage, the island. */
const PLACE_BOX: Record<Place, string> = { airport: '6 3 44 36', beginner: '6 48 44 36', intermediate: '56 4 44 36', advanced: '102 34 44 36', tour: '103 62 44 36', island: '148 66 44 36' };
let MAP_PX: Px[] | null = null;
const mapPx = () => (MAP_PX ??= mapPixels());
export function PlaceArt({ place, size = 132 }: { place: Place; size?: number }) {
  return (
    <svg className="place-art" viewBox={PLACE_BOX[place]} width={size} height={(size * 36) / 44} shapeRendering="crispEdges" aria-hidden="true">
      {mapPx().map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
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

/** The pixel map: the places, the road, the car (it drives to the place on screen, a step at a time),
 * and the boat at the dock or sailing to the island. */
function MapArt({ road, first, goal, sailing, onSailed, flight }: { road: Road; first: number; goal: number; sailing: boolean; onSailed: () => void; flight: number }) {
  const px = mapPx();
  const [step, setStep] = useState(first);
  // the engine starts when the car has somewhere to go as the page opens
  const [moving] = useState(first !== goal);
  useEffect(() => {
    if (moving) sfx('drive');
  }, [moving]);
  useEffect(() => {
    if (step === goal) return;
    if (reduced()) return setStep(goal);
    const t = setTimeout(() => setStep((s) => (s < goal ? Math.min(goal, s + 3) : Math.max(goal, s - 3))), 30);
    return () => clearTimeout(t);
  }, [step, goal]);
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
  // the plane waits on the apron; flying, it rolls onto the runway, then climbs off the map
  const plane = flight < 0 ? { x: 12, y: 12 } : { x: 12 + flight * 4, y: 12 - Math.min(5, flight) - Math.max(0, flight - 5) * 3 };
  return (
    <svg className="roadmap-art" viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label={t('The road map: the airport, high school, college, the NBA arena, and the island of mini-games across the sea')}>
      {px.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
      <Sprite rows={BOAT} x={Math.round(boatX)} y={Math.round(boatY)} colors={sailing || sail ? kin : { ...kin, h: '', s: '' }} />
      <Sprite rows={PLANE} x={plane.x} y={plane.y} colors={PLANE_COLORS} />
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
    [t('Island · every mini-game at C or better'), minis === MINIS.length, `${minis}/${MINIS.length}`],
    [t('The closing tour'), !!road.toured],
  ];
  return (
    <aside className="bucket" aria-label={t('Bucket list')}>
      <Roll />
      <div className="scroll-paper">
        <div className="bucket-title">{t('Bucket list')}</div>
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


/** A stop on the road: passed, next, or still locked. */
/** Round 35: what a stop opens in the full game, and whether it has. */
function Opens({ stop, road }: { stop: Level | 'island'; road: Road }) {
  const u = unlockOf(stop);
  if (!u) return null;
  const done = unlocked(road, u);
  return (
    <p className={`small with-icon road-opens${done ? ' done' : ''}`}>
      <Icon name={done ? 'unlock' : 'lock'} size={18} />
      <span>{done ? t('{mode}: open.', { mode: `${UNLOCK_NAME[u][0].toUpperCase()}${UNLOCK_NAME[u].slice(1)}` }) : t('Clear it to open {mode}.', { mode: UNLOCK_NAME[u] })}</span>
    </p>
  );
}

function LevelStop({ level, road }: { level: Level; road: Road }) {
  const setCreating = useStore((s) => s.setCreating);
  const copy = LEVEL_COPY[level];
  const passed = road.passed[level];
  const open = levelOpen(road, level);
  const next = nextLevel(road) === level;
  return (
    <section className={`card stack road-stop${next ? ' next' : ''}${open ? '' : ' locked'}`} data-tour={next ? 'road-next' : undefined}>
      <div className="row road-stop-head">
        <PlaceArt place={level} size={88} />
        <div style={{ minWidth: 0 }}>
          <div className="kicker">
            {t('Level {n}', { n: copy.n })} · {copy.place}
          </div>
          <div className="sec-title">{LEVEL_NAME[level]}</div>
        </div>
        <div className="spacer" />
        {passed ? (
          <span className="tag good with-icon">
            <Icon name={passed.star ? 'stars' : 'checklist'} size={18} />
            {passed.star ? `${t('Passed')} · All-Star` : t('Passed')}
          </span>
        ) : !open ? (
          <span className="tag with-icon">
            <Icon name="lock" size={18} />
            {t('Locked')}
          </span>
        ) : null}
      </div>
      <Opens stop={level} road={road} />
      {next && (
        <>
          <p className="small">
            {t('The goal: {goal} in {n} NBA seasons.', { goal: t(LEVEL_GOAL), n: ROADMAP[level].nbaSeasons })}
          </p>
          <LevelAdds level={level} />
        </>
      )}
      {open && (
        <div className="row-end">
          <button className={`btn${next ? '' : ' ghost small'}`} onClick={() => (sfx('confirm'), setCreating(level))}>
            {next ? t('Drive to {place}: play {level}', { place: copy.place.toLowerCase(), level: LEVEL_NAME[level].toLowerCase() }) : t('Play it again')}
          </button>
        </div>
      )}
      {!open && <p className="small muted">{t('Opens after {level}.', { level: LEVEL_NAME[LEVEL_IDS[LEVEL_IDS.indexOf(level) - 1]].toLowerCase() })}</p>}
    </section>
  );
}

/** The airport (owner, after round 38): the way back to the main land, once beginner is passed. */
function AirportStop({ road, onFly }: { road: Road; onFly: () => void }) {
  const open = !!road.passed.beginner;
  return (
    <section className={`card stack road-stop${open ? '' : ' locked'}`}>
      <div className="row road-stop-head">
        <PlaceArt place="airport" size={88} />
        <div style={{ minWidth: 0 }}>
          <div className="kicker">The airport</div>
          <div className="sec-title">{t('Back to the main land')}</div>
        </div>
        <div className="spacer" />
        <span className="tag with-icon">
          <Icon name={open ? 'jet' : 'lock'} size={18} />
          {open ? t('open') : t('Locked')}
        </span>
      </div>
      <p className="small">{open ? t('Fly back to the main land. The road map waits for you here.') : t('Opens after beginner.')}</p>
      {open && (
        <div className="row-end">
          <button className="btn ghost" onClick={onFly}>
            {t('Fly to the main land')}
          </button>
        </div>
      )}
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
        <PlaceArt place="island" size={88} />
        <div style={{ minWidth: 0 }}>
          <div className="kicker">Overseas league · the island</div>
          <div className="sec-title">{t('The mini-games')}</div>
        </div>
        <div className="spacer" />
        <span className="tag with-icon">
          <Icon name={open ? 'controller' : 'lock'} size={18} />
          {open ? t('{done}/{n} at C or better', { done, n: MINIS.length }) : t('Locked')}
        </span>
      </div>
      <Opens stop="island" road={road} />
      <p className={open ? 'small prose' : 'small'}>{open ? t('Play each one once and get a C or better. Any time, between levels.') : t('Opens after beginner.')}</p>
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
            {t('Take the boat to the island')}
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
        <PlaceArt place="tour" size={88} />
        <div style={{ minWidth: 0 }}>
          <div className="kicker">{t('The last stop')}</div>
          <div className="sec-title">{t('The closing tour')}</div>
        </div>
        <div className="spacer" />
        {road.toured ? (
          <span className="tag good with-icon">
            <Icon name="checklist" size={18} />
            {t('Done')}
          </span>
        ) : !open ? (
          <span className="tag with-icon">
            <Icon name="lock" size={18} />
            {t('Locked')}
          </span>
        ) : null}
      </div>
      <p className={open ? 'small prose' : 'small'}>{open ? t('A star’s career, already under way: the rest of the game, stop by stop. About ten minutes.') : t('Opens after advanced.')}</p>
      {open && !road.toured && (
        <div className="row-end">
          <button className="btn" onClick={() => (sfx('confirm'), start())}>
            {t('Start the closing tour')}
          </button>
        </div>
      )}
    </section>
  );
}

/** Where the road map opens: the next level, else the island or the closing tour still to do. */
function firstPlace(road: Road): number {
  const next = nextLevel(road);
  if (next) return PLACES.findIndex((p) => p.id === next);
  if (!islandDone(road)) return PLACES.findIndex((p) => p.id === 'island');
  if (!road.toured) return PLACES.findIndex((p) => p.id === 'tour');
  return 0;
}

const PLACE_NAME: Record<Place, string> = { airport: 'The airport', beginner: 'Beginner · High school', intermediate: 'Intermediate · College', advanced: 'Advanced · NBA arena', tour: tx('The closing tour'), island: tx('The island of mini-games') };

/** Each place's state, for its pin on the map: done, the next thing to do, open, or locked. */
function placeState(road: Road, id: Place): 'done' | 'next' | 'open' | 'locked' {
  if (id === 'airport') return road.passed.beginner ? 'open' : 'locked';
  if (id === 'island') return !road.passed.beginner ? 'locked' : islandDone(road) ? 'done' : levelsDone(road) ? 'next' : 'open';
  if (id === 'tour') return !levelsDone(road) ? 'locked' : road.toured ? 'done' : islandDone(road) ? 'next' : 'open';
  return road.passed[id] ? 'done' : nextLevel(road) === id ? 'next' : levelOpen(road, id) ? 'open' : 'locked';
}
const PIN: Record<ReturnType<typeof placeState>, string> = { done: 'checklist', next: 'arrow', open: 'map', locked: 'lock' };
const STATE_WORD: Record<ReturnType<typeof placeState>, string> = { done: tx('done'), next: tx('next'), open: tx('open'), locked: tx('locked') };

export function RoadMap() {
  const road = useStore((s) => s.road);
  const setMini = useStore((s) => s.setMini);
  const setPage = useStore((s) => s.setPage);
  const [sailing, setSailing] = useState(false);
  // the airport: the plane takes off, then the main land
  const [flight, setFlight] = useState(-1);
  const fly = () => {
    if (flight >= 0) return;
    sfx('takeoff');
    // round 39: the book counts the flights back (Wheels Up, Jet Lag)
    if (recordFlight()) achievementsNow();
    if (reduced()) return setPage(null);
    setFlight(0);
  };
  useEffect(() => {
    if (flight < 0) return;
    if (flight >= 12) return setPage(null);
    const id = setTimeout(() => setFlight((f) => f + 1), 70);
    return () => clearTimeout(id);
  }, [flight, setPage]);
  const tut = inTutorial(road);
  const [sel, setSel] = useState(() => firstPlace(road));
  // the map opens clear, the next place's pin hopping; a card pops out when a place is picked
  const [open, setOpen] = useState(false);
  const pop = useRef<HTMLDivElement>(null);
  // the first time the page opens after a level, the car drives on from the place before
  const [first] = useState(() => {
    const goal = stopAt(PLACES[sel].stop);
    const next = nextLevel(road);
    const at = next ? LEVEL_IDS.indexOf(next) : -1;
    if (at < 1 || reduced()) return goal;
    // the deck keeps a mark of its own, so its look at the map never stops the game's car
    const key = `${isDev() ? 'btr-dev:' : ''}btr-road-drove-${at}`;
    try {
      if (sessionStorage.getItem(key)) return goal;
      sessionStorage.setItem(key, '1');
    } catch {
      return goal;
    }
    return stopAt(PLACES.find((p) => p.id === LEVEL_IDS[at - 1])!.stop);
  });
  const go = (i: number, keys = false) => {
    if (sailing) return;
    if (i !== sel) sfx('tick');
    setSel(i);
    setOpen(true);
    // round 34: after the tutorial, the book keeps which places' cards were opened (Every Stop on the Line)
    if (!tut && recordRoad(PLACES[i].id)) achievementsNow();
    // from the keyboard, the focus follows the car: the card's main button (Enter plays it), or the
    // place itself when its card has nothing to press (a locked place)
    if (keys)
      requestAnimationFrame(() => (pop.current?.querySelector<HTMLElement>('.btn') ?? document.querySelectorAll<HTMLElement>('.road-spot')[i])?.focus({ preventScroll: true }));
  };
  // the arrow keys drive along the road; Escape folds the card away
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || document.querySelector('[aria-modal="true"], .set-menu')) return;
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (d) {
        e.preventDefault();
        go(Math.max(0, Math.min(PLACES.length - 1, sel + d)), true);
      } else if (e.key === 'Escape' && open) setOpen(false);
      // Enter opens the card of the place the car is at (a focused button keeps its own Enter)
      else if (e.key === 'Enter' && !open && !t.closest('button, a')) {
        e.preventDefault();
        go(sel, true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const place = PLACES[sel];
  const [bx, by, bw, bh] = place.box;
  const cy = ((by + bh / 2) / H) * 100;
  const popAt: CSSProperties = { [place.side === 'right' ? 'left' : 'right']: `${(place.side === 'right' ? (bx + bw) / W : (W - bx) / W) * 100 + 1}%`, top: `${cy}%`, transform: `translateY(-${cy}%)` };
  return (
    <div className="wrap no-tabs roadmap-page">
      <header className="top">
        <div className="brand">
          Bench to <span>Rafters</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {!tut && (
            <button className="icon-btn" onClick={() => setPage(null)}>
              {t('Back to the main land')}
            </button>
          )}
          <ShareButton />
          <SettingsMenu g={null} />
        </div>
      </header>
      <section className="hero level-hero">
        <div className="kicker">The road map</div>
        <h1>{t('Your road')}</h1>
        <p className="lede">{t('Three levels and an island of mini-games. Finish them all and the full game opens.')}</p>
        <p className="small muted road-hint">
          {t('Tap a place on the map')}
          <span className="hide-touch">{t(', or drive along the road with the arrow keys (Enter opens where you are)')}</span>.
        </p>
      </section>
      <div className="roadmap">
        <div className="roadmap-stage">
          <MapArt road={road} first={first} goal={stopAt(place.stop)} sailing={sailing} onSailed={() => setMini('hub')} flight={flight} />
          <div className="road-spots">
            {PLACES.map((p, i) => {
              const st = placeState(road, p.id);
              const [x, y, w, h] = p.box;
              return (
                <button
                  key={p.id}
                  className={`road-spot ${st}${i === sel && open ? ' on' : ''}`}
                  style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` }}
                  aria-label={`${t(PLACE_NAME[p.id])}: ${t(STATE_WORD[st])}`}
                  aria-pressed={i === sel && open}
                  onClick={() => go(i)}
                >
                  <span className="road-pin">
                    <Icon name={PIN[st]} size={16} />
                  </span>
                </button>
              );
            })}
          </div>
          {open && (
            <div className={`road-pop ${place.side}`} style={popAt} ref={pop} key={place.id}>
              <button className="pop-x road-pop-x" aria-label={t('Close')} onClick={() => setOpen(false)}>
                <PixelX />
              </button>
              {place.id === 'airport' ? <AirportStop road={road} onFly={fly} /> : place.id === 'island' ? <IslandStop road={road} onSail={() => (sfx('sail'), setSailing(true))} /> : place.id === 'tour' ? <TourStop road={road} /> : <LevelStop level={place.id} road={road} />}
            </div>
          )}
        </div>
        <BucketList road={road} />
      </div>
      <FootBar where="road map" />
    </div>
  );
}
