// The Floor's land (after round 42, owner: "can we add the floor as a separate roadmap, like the
// tutorial land? no eor session, just visual change"): the Floor's own pixel map, drawn and driven
// like the road map (screens/RoadMap.tsx). One road runs past a place for each way to play, a street
// court for the quick game, the playoff arena with its East and West banner, the draft room, the
// versus room with its two screens, and the hall of legends; his player dribbles along it a step at
// a time. Click a place, or move along the road with the arrow keys (Enter opens a place, Escape
// closes its card), and its card pops out beside it: the way to play and the button that opens the
// Floor's page on it. The hall's card shows each franchise's legends with their real numbers.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useStore, type FloorStart } from '../../store';
import { NBA_TEAMS } from '../../content/teams';
import { franchise } from '../../engine/floor/game';
import { Icon } from '../art/Icon';
import { PixelX } from '../art/PixelX';
import { BOAT, Sprite } from '../art/Sprites';
import { HAIR_COLORS, SKIN_COLORS } from '../art/Player';
import { SettingsMenu } from '../components/Settings';
import { ShareButton } from '../components/Share';
import { FootBar } from '../components/FootBar';
import { reducedMotion as reduced } from '../mainland';
import { sfx } from '../sound';
import { t, tx } from '../../i18n';
import { MODES } from './FloorHub';
import { LegendTable } from './LegendTable';

// ---------- the map, on a 192 by 108 pixel grid (the road map's) ----------

const W = 192;
const H = 108;
const C = {
  land: '#5FAE4E', shade: '#4E9A42', tuft: '#7CC466', sea: '#2B7BC4', wave: '#5AA2E0', sand: '#E9D29A', sandD: '#CDB277',
  road: '#6B6F78', edge: '#4D5058', dash: '#FCC419',
  trunk: '#8B5A2B', leaf: '#2F9E44', leafD: '#1E7A32', plank: '#A0703C', plankD: '#7A5229',
  white: '#FFFFFF', ink: '#18141C', pole: '#D0D4DA', grey: '#9AA0A8', greyD: '#7F858E', door: '#3A2A20', lit: '#FFE89A', glass: '#BFE3FF',
  green: '#3B8F5A', key: '#C2462E', rim: '#F76707',
  arena: '#3C4250', ring: '#596173', ringD: '#4A5162', lights: '#FFF3BF', east: '#1C4FA0', west: '#B02525', gold: '#FCC419', goldD: '#C99A06',
  office: '#4C5A73', officeD: '#2F3A4D', navy: '#16213A',
  den: '#3B3355', denD: '#2A2440', screen: '#3FA7F5', screenD: '#1D6FB8', neon: '#E64980',
  stone: '#E6DCC4', stoneD: '#C2B596',
};

type Px = [number, number, number, number, string];

/** Letters three pixels wide (W five), five high, for the signs. */
const FONT: Record<string, string[]> = {
  A: ['010', '101', '111', '101', '101'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  L: ['100', '100', '100', '100', '111'],
  O: ['010', '101', '101', '101', '010'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  V: ['101', '101', '101', '010', '010'],
  W: ['10001', '10001', '10101', '10101', '01010'],
};

/** The road: from the left edge past the court, the arena, the draft room, the versus room and the
 * hall, to the dock where the boat from the main land ties up. */
const WAY: [number, number][] = [
  [2, 54], [78, 54], [78, 50], [118, 50], [118, 56], [176, 56],
];

type Place = FloorStart | 'hall';
/** The places in the road's order: where the player stops, the building to click (x, y, w, h on the
 * map), the side its card pops out on, its name and its pin's icon. */
const PLACES: { id: Place; stop: [number, number]; box: [number, number, number, number]; side: 'left' | 'right'; name: string; icon: string }[] = [
  { id: 'quick', stop: [24, 54], box: [2, 4, 48, 42], side: 'right', name: tx('The street court'), icon: 'ball' },
  { id: 'playoffs', stop: [60, 54], box: [32, 58, 64, 46], side: 'right', name: tx('The playoff arena'), icon: 'bracket' },
  { id: 'draft', stop: [96, 50], box: [72, 2, 46, 42], side: 'right', name: tx('The draft room'), icon: 'roster' },
  { id: 'online', stop: [134, 56], box: [112, 60, 52, 44], side: 'left', name: tx('The versus room'), icon: 'versus' },
  { id: 'hall', stop: [164, 56], box: [140, 2, 50, 44], side: 'left', name: tx('The hall of legends'), icon: 'hall' },
];

/** The edge of the land, row by row: the sea comes in at the bottom right. */
const coast = (y: number) => (y < 62 ? W : 170 + Math.round(3 * Math.sin(y / 4) + 2 * Math.sin(y / 2.3)));

function mapPixels(): Px[] {
  const px: Px[] = [];
  const R = (x: number, y: number, w: number, h: number, c: string) => px.push([x, y, w, h, c]);
  const text = (x: number, y: number, s: string, c: string) => {
    for (const ch of s) {
      const g = FONT[ch];
      g.forEach((row, j) => [...row].forEach((b, i) => b === '1' && R(x + i, y + j, 1, 1, c)));
      x += g[0].length + 1;
    }
  };
  R(0, 0, W, H, C.sea);
  for (let i = 0; i < 24; i++) R(172 + ((i * 7) % 18), 64 + ((i * 11) % 42), 3, 1, C.wave);
  for (let y = 0; y < H; y++) {
    const e = coast(y);
    R(0, y, e, 1, C.land);
    if (e < W) R(e, y, 3, 1, y % 4 === 0 ? C.sandD : C.sand);
  }
  for (let i = 0; i < 70; i++) R((i * 37 + 11) % 168, (i * 23 + 5) % H, i % 4 ? 2 : 4, 1, i % 2 ? C.tuft : C.shade);
  for (const [x, y] of [[58, 12], [64, 32], [124, 12], [132, 30], [8, 78], [22, 92], [104, 70], [104, 94], [186, 50], [52, 40]]) {
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
    }
  }
  // the dock, down into the sea
  R(173, 54, 6, 20, C.plank);
  for (let y = 56; y < 74; y += 3) R(173, y, 6, 1, C.plankD);
  R(172, 74, 1, 3, C.plankD);
  R(178, 74, 1, 3, C.plankD);
  // the welcome sign
  R(6, 62, 23, 9, C.ink);
  text(8, 64, 'FLOOR', C.gold);
  R(9, 71, 1, 4, C.greyD);
  R(25, 71, 1, 4, C.greyD);

  // the street court: green asphalt, red keys, white lines, a hoop at each end and a chain-link fence
  R(4, 7, 44, 34, C.grey);
  for (let y = 8; y < 40; y += 2) for (let x = 5 + ((y / 2) % 2); x < 47; x += 2) R(x, y, 1, 1, C.greyD);
  R(6, 10, 40, 28, C.green);
  R(7, 19, 8, 10, C.key);
  R(37, 19, 8, 10, C.key);
  R(6, 10, 40, 1, C.white);
  R(6, 37, 40, 1, C.white);
  R(6, 10, 1, 28, C.white);
  R(45, 10, 1, 28, C.white);
  R(26, 10, 1, 28, C.white);
  R(23, 20, 7, 1, C.white);
  R(23, 27, 7, 1, C.white);
  R(22, 21, 1, 6, C.white);
  R(30, 21, 1, 6, C.white);
  R(7, 19, 8, 1, C.white);
  R(7, 28, 8, 1, C.white);
  R(15, 19, 1, 10, C.white);
  R(37, 19, 8, 1, C.white);
  R(37, 28, 8, 1, C.white);
  R(36, 19, 1, 10, C.white);
  // the three-point arcs, in steps
  for (const [dx, dy, w] of [[0, 13, 4], [4, 14, 3], [7, 15, 2], [9, 16, 1], [10, 17, 1]] as const) {
    R(7 + dx, dy, w, 1, C.white);
    R(7 + dx, 47 - dy, w, 1, C.white);
    R(45 - dx - w, dy, w, 1, C.white);
    R(45 - dx - w, 47 - dy, w, 1, C.white);
  }
  R(18, 18, 1, 12, C.white);
  R(33, 18, 1, 12, C.white);
  R(3, 22, 2, 3, C.ink);
  R(5, 20, 1, 7, C.white);
  R(6, 23, 2, 1, C.rim);
  R(47, 22, 2, 3, C.ink);
  R(46, 20, 1, 7, C.white);
  R(44, 23, 2, 1, C.rim);

  // the playoff arena: a stepped bowl, a trophy on top, the East and West banner, the glass doors
  R(63, 57, 3, 3, C.gold);
  R(64, 60, 1, 2, C.goldD);
  R(62, 62, 5, 1, C.goldD);
  R(54, 63, 20, 1, C.ringD);
  R(48, 64, 32, 2, C.ring);
  R(42, 66, 44, 3, C.arena);
  R(38, 69, 52, 4, C.ring);
  R(36, 73, 56, 27, C.arena);
  for (let x = 38; x < 91; x += 3) R(x, 73, 1, 1, C.lights);
  R(44, 75, 40, 1, C.gold);
  R(44, 76, 20, 9, C.east);
  R(64, 76, 20, 9, C.west);
  R(44, 85, 40, 1, C.gold);
  text(52, 78, 'E', C.white);
  text(72, 78, 'W', C.white);
  R(50, 89, 28, 9, C.glass);
  for (let x = 53; x < 78; x += 4) R(x, 89, 1, 9, C.ring);
  R(60, 92, 8, 6, C.door);
  R(34, 100, 60, 2, C.stone);
  R(34, 102, 60, 1, C.stoneD);
  for (const x of [33, 94]) {
    R(x, 66, 1, 22, C.pole);
    R(x - 1, 64, 3, 2, C.lights);
  }

  // the draft room: an office block, its windows lit, DRAFT over the door, a pennant on the roof
  R(80, 2, 1, 6, C.pole);
  R(81, 2, 5, 3, C.gold);
  R(76, 6, 40, 2, C.officeD);
  R(78, 8, 36, 32, C.office);
  for (let y = 11; y < 25; y += 5) for (let x = 81; x < 111; x += 6) R(x, y, 4, 3, (x + y) % 3 ? C.lit : C.glass);
  R(82, 27, 28, 7, C.navy);
  text(87, 28, 'DRAFT', C.white);
  R(92, 35, 8, 5, C.door);
  R(88, 40, 16, 2, C.stone);
  R(78, 39, 36, 1, C.officeD);

  // the versus room: a marquee of two screens with VS between them, a pink neon band, an antenna
  R(160, 64, 1, 10, C.pole);
  R(162, 64, 1, 1, C.white);
  R(163, 65, 1, 2, C.white);
  R(158, 64, 1, 1, C.white);
  R(118, 62, 40, 11, C.ink);
  R(119, 63, 15, 9, C.screen);
  R(143, 63, 14, 9, C.screen);
  R(119, 71, 15, 1, C.screenD);
  R(143, 71, 14, 1, C.screenD);
  // a player on each screen, one in blue, one in red
  R(126, 65, 2, 2, C.lit);
  R(125, 67, 4, 3, C.east);
  R(149, 65, 2, 2, C.lit);
  R(148, 67, 4, 3, C.west);
  text(135, 65, 'VS', C.gold);
  R(114, 74, 48, 2, C.denD);
  R(116, 76, 44, 24, C.den);
  R(116, 79, 44, 1, C.neon);
  R(120, 84, 9, 6, C.screen);
  R(147, 84, 9, 6, C.screen);
  R(134, 88, 8, 12, C.door);
  R(130, 100, 16, 2, C.stone);

  // the hall of legends: a pediment in steps with a gold ball, white columns, retired jerseys
  R(162, 3, 8, 2, C.stone);
  R(158, 5, 16, 2, C.stone);
  R(154, 7, 24, 2, C.stone);
  R(150, 9, 32, 2, C.stone);
  R(146, 11, 40, 2, C.stone);
  R(164, 7, 4, 4, C.gold);
  R(165, 7, 1, 4, C.goldD);
  R(144, 13, 44, 3, C.stone);
  R(144, 16, 44, 1, C.stoneD);
  R(146, 17, 40, 19, C.stoneD);
  const jerseys = ['#C92A2A', '#552583', '#1D428A', '#007A33', '#FDB927', '#CE1141'];
  for (let k = 0; k < 7; k++) {
    const x = 148 + k * 6;
    R(x - 1, 17, 5, 1, C.stone);
    R(x, 18, 3, 18, C.white);
    if (k < 6) {
      R(x + 3, 20, 3, 6, jerseys[k]);
      R(x + 4, 22, 1, 2, C.white);
    }
  }
  R(163, 28, 6, 8, C.door);
  R(145, 36, 42, 2, C.stone);
  R(143, 38, 46, 2, C.stoneD);
  R(141, 40, 50, 2, C.stone);
  return px;
}

/** A place on the map, cropped from it for its card (the road map's PlaceArt, at the same shape). */
let MAP_PX: Px[] | null = null;
const mapPx = () => (MAP_PX ??= mapPixels());
function FloorPlaceArt({ place, size = 88 }: { place: Place; size?: number }) {
  const [x, y, w, h] = PLACES.find((p) => p.id === place)!.box;
  const ch = (w * 36) / 44;
  const top = Math.max(0, Math.min(H - ch, y + h / 2 - ch / 2));
  return (
    <svg className="place-art" viewBox={`${x} ${top} ${w} ${ch}`} width={size} height={(size * 36) / 44} shapeRendering="crispEdges" aria-hidden="true">
      {mapPx().map(([px, py, pw, ph, c], i) => (
        <rect key={i} x={px} y={py} width={pw} height={ph} fill={c} />
      ))}
    </svg>
  );
}

/** Every pixel of the road, so the player can walk it a step at a time. */
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

/** His player, side on: hair, face, a jersey with its number, shorts and shoes; the ball beside him. */
const PLAYER = ['.hhh.', '.sss.', '.sss.', 'JJJJJ', 'JJNJJ', 'sJJJs', '.KKK.', '.s.s.', '.s.s.', '.O.O.'];

/** The map: the places, the road, the boat at the dock and his player, who walks to the place picked
 * (three pixels a step) and dribbles there (the ball up, then down). */
function MapArt({ goal }: { goal: number }) {
  const road = useStore((s) => s.road);
  const [step, setStep] = useState(goal);
  const [bounce, setBounce] = useState(0);
  useEffect(() => {
    if (step === goal) return;
    if (reduced()) return setStep(goal);
    const id = setTimeout(() => setStep((s) => (s < goal ? Math.min(goal, s + 3) : Math.max(goal, s - 3))), 30);
    return () => clearTimeout(id);
  }, [step, goal]);
  useEffect(() => {
    if (reduced()) return;
    const id = setInterval(() => setBounce((b) => 1 - b), 280);
    return () => clearInterval(id);
  }, []);
  const look = road.look;
  const kin = { h: look ? HAIR_COLORS[look.hair] : '#231B18', s: SKIN_COLORS[look?.skin ?? 2], J: C.west, N: C.white, K: C.navy, O: C.ink };
  const [cx, cy] = ROUTE[step];
  const back = step > goal;
  const x = cx - 2;
  const y = cy - 8;
  // the ball at his hand while he walks; on the floor and back up while he waits
  const low = step === goal && bounce === 1;
  const bx = back ? x - 2 : x + 5;
  return (
    <svg className="roadmap-art" viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label={t('The Floor’s land: the street court, the playoff arena, the draft room, the versus room and the hall of legends, along one road')}>
      {mapPx().map(([px, py, pw, ph, c], i) => (
        <rect key={i} x={px} y={py} width={pw} height={ph} fill={c} />
      ))}
      <Sprite rows={BOAT} x={171} y={74} colors={{ S: '#F8F9FA', T: C.trunk }} />
      <Sprite rows={PLAYER} x={x} y={y} colors={kin} flip={back} />
      <rect x={bx} y={low ? y + 8 : y + 5} width={2} height={2} fill={C.rim} />
      <rect x={bx} y={low ? y + 8 : y + 5} width={1} height={1} fill="#7A2E05" />
    </svg>
  );
}

// ---------- the cards ----------

const PLAY: Record<FloorStart, string> = { quick: tx('Play a quick game'), playoffs: tx('Go to the playoffs'), draft: tx('Draft your five'), online: tx('Play a friend online') };

/** A way to play: what it is, and the button that opens the Floor's page on it. */
function ModeStop({ id, name }: { id: FloorStart; name: string }) {
  const openFloor = useStore((s) => s.openFloor);
  const m = MODES.find((x) => x.id === id)!;
  return (
    <section className="card stack road-stop">
      <div className="row road-stop-head">
        <FloorPlaceArt place={id} />
        <div style={{ minWidth: 0 }}>
          <div className="kicker">{t(name)}</div>
          <div className="sec-title">{t(m.name)}</div>
        </div>
      </div>
      <p className="small prose">{t(m.text)}</p>
      <div className="row-end">
        <button className="btn" onClick={() => (sfx('confirm'), openFloor(id))}>
          {t(PLAY[id])}
        </button>
      </div>
    </section>
  );
}

const TEAMS = [...NBA_TEAMS].sort((a, b) => (`${a.city} ${a.nick}` < `${b.city} ${b.nick}` ? -1 : 1));

/** The hall of legends: a franchise's all-time five and its sixth man, with their real numbers. */
function HallStop() {
  const [abbr, setAbbr] = useState('CHI');
  const side = franchise(abbr);
  const rows = [...side.five, ...(side.sixth ? [side.sixth] : [])].map((spot) => ({ team: abbr, spot }));
  return (
    <section className="card stack road-stop">
      <div className="row road-stop-head">
        <FloorPlaceArt place="hall" />
        <div style={{ minWidth: 0 }}>
          <div className="kicker">{t('The hall of legends')}</div>
          <div className="sec-title">{t('Their real career numbers')}</div>
        </div>
      </div>
      <p className="small prose">{t('Every franchise’s all-time five and its sixth man: their real career averages, and the ratings the Floor gives them.')}</p>
      <label className="small fl-hall-pick">
        {t('Team')}{' '}
        <select value={abbr} onChange={(e) => setAbbr(e.target.value)}>
          {TEAMS.map((x) => (
            <option key={x.abbr} value={x.abbr}>
              {x.city} {x.nick}
            </option>
          ))}
        </select>
      </label>
      <LegendTable rows={rows} />
    </section>
  );
}

// ---------- the page ----------

export function FloorLand() {
  const setPage = useStore((s) => s.setPage);
  const [sel, setSel] = useState(0);
  // the map opens clear, the place he stands at hopping; a card pops out when a place is picked
  const [open, setOpen] = useState(false);
  const pop = useRef<HTMLDivElement>(null);
  const go = (i: number, keys = false) => {
    if (i !== sel) sfx('tick');
    setSel(i);
    setOpen(true);
    // from the keyboard, the focus follows him: the card's button (Enter opens the Floor on it), the
    // hall's team picker, or the place itself
    if (keys) requestAnimationFrame(() => (pop.current?.querySelector<HTMLElement>('.btn, select') ?? document.querySelectorAll<HTMLElement>('.road-spot')[i])?.focus({ preventScroll: true }));
  };
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => document.querySelectorAll<HTMLElement>('.road-spot')[sel]?.focus({ preventScroll: true }));
  };
  // the arrow keys walk along the road; Escape folds the card away; Enter opens the place he is at
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || document.querySelector('[aria-modal="true"], .set-menu')) return;
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (d) {
        e.preventDefault();
        go(Math.max(0, Math.min(PLACES.length - 1, sel + d)), true);
      } else if (e.key === 'Escape' && open) close();
      else if (e.key === 'Enter' && !open && !el.closest('button, a')) {
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
          <button className="icon-btn" onClick={() => setPage(null)}>
            {t('Back to the main land')}
          </button>
          <ShareButton />
          <SettingsMenu g={null} />
        </div>
      </header>
      <section className="hero level-hero">
        <div className="kicker">{t('Five on five')}</div>
        <h1>{t('The Floor’s land')}</h1>
        <p className="lede">{t('Five places, one for each way to play: the street court, the playoff arena, the draft room, the versus room, and the hall of legends with their real numbers.')}</p>
        <p className="small muted road-hint">
          {t('Click a place on the map')}
          <span className="hide-touch">{t(', or move between them with the arrow keys (Enter opens a place, Escape closes its card)')}</span>.
        </p>
      </section>
      <div className="roadmap">
        <div className="roadmap-stage">
          <MapArt goal={stopAt(place.stop)} />
          <div className="road-spots">
            {PLACES.map((p, i) => {
              const [x, y, w, h] = p.box;
              const on = i === sel && open;
              return (
                <button
                  key={p.id}
                  className={`road-spot ${i === sel && !open ? 'next' : 'open'}${on ? ' on' : ''}`}
                  data-place={p.id}
                  style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` }}
                  aria-label={t(p.name)}
                  aria-pressed={on}
                  onClick={(e) => go(i, e.detail === 0)}
                >
                  <span className="road-pin">
                    <Icon name={p.icon} size={16} />
                  </span>
                </button>
              );
            })}
          </div>
          {open && (
            <div className={`road-pop ${place.side}${place.id === 'hall' ? ' fl-hall' : ''}`} style={popAt} ref={pop} key={place.id}>
              <button className="pop-x road-pop-x" aria-label={t('Close')} onClick={close}>
                <PixelX />
              </button>
              {place.id === 'hall' ? <HallStop /> : <ModeStop id={place.id} name={place.name} />}
            </div>
          )}
        </div>
      </div>
      <FootBar where="the Floor's land" />
    </div>
  );
}
