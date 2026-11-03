// The town (round 37): his street in square pixels. A building for each place (ui/town.ts), drawn
// for where he is: the hometown (brick, porches, the hills behind), the campus (brick and domes,
// the quad's trees), a city (glass and steel before a skyline) or a city abroad (old roofs, domes
// and spires). Windows, lamps and neon are their own layer, coloured by the theme: lit at night in
// the dark theme, glass by day in the light one. The sky behind is the one smooth gradient (owner,
// round 32: gradient backgrounds may stay smooth).

import { memo, useMemo } from 'react';
import { STREET, layoutOf, type HouseTier, type PlaceKind, type Slot, type Town, type TownLook } from '../town';

import { C, G, H, courses, dome, doorFill, gable, hash, seq, tree, windows, type Px } from './townPx';
import { arenaPx, landmarkPx, schoolPx } from './arenaArt';
import { ARENA_W, MARK_W, arenaSpec, schoolSpec } from '../arenas';
import { TEAM_STYLE } from '../../content/teamStyle';
import { MOTIFS } from './motifs';
import { GLYPH } from './PixelText';

// ---------- the buildings ----------

function gym(look: TownLook, s: Slot, color: string, open: boolean): Px[] {
  const { x, w, door } = s;
  if (look === 'hometown') {
    const top = G - 17;
    return [
      [x, top, w, 17, C.brick], ...courses(x, top, w, 17), [x - 1, top - 1, w + 2, 2, C.brickD],
      ...windows(x + 3, top + 5, 2, 1, 5, 4, 3), ...windows(door + 6, top + 5, 2, 1, 5, 4, 3),
      // the sign over the door: a backboard and a ball
      [door - 5, top + 1, 10, 6, C.white], [door - 4, top + 2, 8, 4, C.chrome], [door - 2, top + 3, 4, 3, C.ball], [door - 1, top + 3, 1, 3, C.brickD],
      [door - 5, G - 8, 10, 8, C.slateD], [door - 4, G - 7, 8, 7, doorFill(open)], [door, G - 7, 1, 7, C.slateD],
    ];
  }
  if (look === 'campus') {
    const top = G - 18;
    return [
      ...dome(x + 2, top, w - 4, 6, C.roof), [x, top, w, 18, C.brick], ...courses(x, top, w, 18),
      [x + 3, top + 3, 3, 9, color], [x + w - 6, top + 3, 3, 9, color],
      ...windows(x + 9, top + 4, 2, 1, 4, 7, 3), ...windows(door + 6, top + 4, 2, 1, 4, 7, 3),
      [door - 4, G - 9, 8, 9, C.stoneD], [door - 3, G - 8, 6, 8, doorFill(open)],
    ];
  }
  // a city's practice facility: glass and steel, the team's stripe across it
  const top = G - 22;
  return [
    [x, top, w, 22, C.glassD], [x, top, w, 1, C.steel], [x, top + 4, w, 2, color],
    ...windows(x + 2, top + 8, 6, 2, 6, 4, 2),
    [x + w - 1, top, 1, 22, C.steelD],
    [door - 6, G - 6, 12, 6, C.steelD], [door - 5, G - 5, 10, 5, doorFill(open)], [door, G - 5, 1, 5, C.steelD],
  ];
}

/** The arena: his school in the hometown; anywhere else an arena of its own (art/arenaArt.ts):
 * an NBA team's designed for the team and its city, any other built from the club's name. */
function arena(town: Town, s: Slot, open: boolean, banners: number): Px[] {
  if (town.look === 'hometown') return schoolPx(schoolSpec(town.school), s.x, s.w, s.door, town.color, open);
  const spec = arenaSpec(town.abbr, town.club, town.look);
  const st = town.abbr ? TEAM_STYLE[town.abbr] : undefined;
  const c = st ? { c1: st.c1, c2: st.c2, c3: st.c3 } : { c1: town.color, c2: '#FFFFFF', c3: C.gold };
  // the team's emblem: the crest's motif in the NBA, the club's initial anywhere else
  const emblem = st ? MOTIFS[st.motif] : GLYPH[(town.club.match(/[A-Za-z]/)?.[0] ?? 'A').toUpperCase()] ?? GLYPH.A;
  if (!spec.mark) return arenaPx({ roof: spec.roof, skin: spec.skin, ax: s.x, aw: s.w, door: s.door, c, emblem, open, banners, flip: false });
  const left = spec.side === 'l';
  const ax = left ? s.x + MARK_W : s.x;
  return [...landmarkPx(spec.mark, left ? s.x : s.x + ARENA_W), ...arenaPx({ roof: spec.roof, skin: spec.skin, ax, aw: ARENA_W, door: s.door, c, emblem, open, banners, flip: left })];
}

function house(tier: HouseTier, s: Slot, color: string, open: boolean): Px[] {
  const { x, w, door } = s;
  switch (tier) {
    case 'family': {
      // the house he grew up in: a gable, a porch, a hoop on the garage, a tree
      const top = G - 13;
      return [
        ...tree(x, 1),
        ...gable(door - 15, top - 1, 30, C.roof, C.roofD), [door - 13, top, 26, 13, C.cream], [door - 13, top, 26, 1, C.creamD],
        ...windows(door - 10, top + 3, 2, 1, 4, 4, 12), [door - 6, G - 1, 12, 1, C.creamD], [door - 3, G - 8, 6, 7, doorFill(open)],
        [door + 17, G - 9, 1, 9, C.steelD], [door + 15, G - 12, 5, 3, C.white], [door + 16, G - 9, 3, 1, C.ball],
      ];
    }
    case 'dorm': {
      const top = G - 24;
      return [
        [x, top, w, 24, C.brick], ...courses(x, top, w, 24), [x - 1, top - 1, w + 2, 2, C.stoneD],
        ...windows(x + 3, top + 3, 5, 4, 5, 3, 3), [x + 2, top + 1, w - 4, 1, color],
        [door - 4, G - 6, 8, 6, C.stoneD], [door - 3, G - 5, 6, 5, doorFill(open)],
      ];
    }
    case 'flat': {
      const top = G - 29;
      return [
        [x, top, w, 29, C.stone], [x, top, w, 1, C.stoneL], [x + w - 2, top, 2, 29, C.stoneD],
        ...windows(x + 3, top + 3, 4, 5, 5, 3, 2),
        [x + 2, G - 7, w - 4, 1, color], [door - 4, G - 6, 8, 6, doorFill(open)],
      ];
    }
    case 'house': {
      // a modern house: the garage on the left, two floors of glass on the right
      const top = G - 17;
      return [
        [x + 2, top + 6, 18, 11, C.stoneL], [x + 2, top + 5, 18, 1, C.slate], [x + 4, G - 8, 14, 8, C.steel], [x + 4, G - 6, 14, 1, C.steelD], [x + 4, G - 3, 14, 1, C.steelD],
        [x + 20, top - 2, w - 22, 2, C.slate], [x + 20, top, w - 22, 17, C.white],
        [x + 22, top + 2, w - 26, 5, '.tw-win'], [x + 22, top + 7, w - 26, 1, C.slate], [door + 5, G - 8, 15, 5, '.tw-win'],
        [door - 3, G - 8, 6, 8, doorFill(open)], [x + w - 4, G - 2, 4, 2, C.leaf], [x, G - 2, 3, 2, C.leaf],
      ];
    }
    default: {
      // the mansion: stone, columns, a pediment and a gold trim, hedges and a gate
      const top = G - 18;
      return [
        [x + 2, top, w - 4, 18, C.stoneL], [x + 2, top, w - 4, 1, C.gold],
        ...gable(door - 14, top - 1, 28, C.stone, C.goldD), [door - 1, top - 9, 2, 2, C.gold],
        ...Array.from({ length: 5 }, (_, i): Px => [door - 12 + i * 6, top + 2, 2, 16, C.white]),
        ...windows(x + 4, top + 4, 1, 2, 5, 4, 3), ...windows(x + w - 9, top + 4, 1, 2, 5, 4, 3),
        [door - 3, G - 9, 6, 9, doorFill(open)], [door - 4, G - 10, 8, 1, C.goldD],
        [x, G - 3, 12, 3, C.leafD], [x + w - 12, G - 3, 12, 3, C.leafD], [x, G - 3, 12, 1, C.leaf], [x + w - 12, G - 3, 12, 1, C.leaf],
        [door - 8, G - 1, 16, 1, color],
      ];
    }
  }
}

function agent(s: Slot, color: string, open: boolean): Px[] {
  const { x, w, door } = s;
  const top = G - 30;
  return [
    [x + 4, top - 3, w - 8, 3, C.glassD], [x + w / 2, top - 7, 1, 4, C.steel],
    [x, top, w, 30, C.glass], [x, top, w, 1, C.steel], [x + w - 2, top, 2, 30, C.glassD],
    ...windows(x + 3, top + 3, 4, 6, 4, 2, 3),
    [door - 4, G - 12, 8, 4, C.goldD], [door - 3, G - 11, 6, 2, C.gold], [door - 1, G - 13, 2, 1, C.goldD],
    [x, G - 7, w, 1, color], [door - 4, G - 6, 8, 6, doorFill(open)], [door, G - 6, 1, 6, C.steelD],
  ];
}

function hall(look: TownLook, s: Slot, open: boolean, hof: boolean): Px[] {
  const { x, w, door } = s;
  if (look === 'hometown') {
    // the diner, with his clippings on the wall inside
    const top = G - 14;
    const awning: Px[] = Array.from({ length: Math.floor(w / 4) }, (_, i): Px => [x + i * 4, top + 2, 4, 3, i % 2 ? C.white : C.red]);
    return [
      [x + 8, top - 6, w - 16, 5, C.redD], [x + 9, top - 5, w - 18, 3, '.tw-neon'], [x + 12, top - 1, 1, 1, C.steelD], [x + w - 13, top - 1, 1, 1, C.steelD],
      [x, top, w, 14, C.chrome], [x, top, w, 2, C.steel], ...awning,
      [x + 2, top + 6, w - 4, 1, C.red], ...windows(x + 3, top + 8, 4, 1, 7, 4, 2).filter((p) => p[0] + p[2] < door - 4 || p[0] > door + 4),
      [door - 4, G - 8, 8, 8, doorFill(open)], [door - 4, G - 8, 8, 1, C.steelD],
    ];
  }
  const top = G - 20;
  const body = look === 'campus' ? C.brick : C.stone;
  const out: Px[] = [
    ...gable(x + 2, top - 1, w - 4, C.stoneL, look === 'campus' ? C.stoneD : C.goldD),
    [x + 2, top, w - 4, 20, body], [x + 2, top, w - 4, 1, C.stoneL],
    ...Array.from({ length: 6 }, (_, i): Px => [x + 6 + i * 9, top + 3, 3, 15, C.white]),
    [x, G - 3, w, 3, C.stoneD], [x + 2, G - 2, w - 4, 1, C.stone],
    [door - 3, G - 12, 6, 9, doorFill(open)],
  ];
  if (look === 'campus') out.push(...courses(x + 2, top, w - 4, 17));
  if (hof) out.unshift(...dome(door - 8, top - 8, 16, 6, C.gold), [door - 1, top - 15, 2, 2, C.goldD]);
  return out;
}

function arcade(s: Slot, open: boolean): Px[] {
  const { x, w, door } = s;
  const top = G - 18;
  const neon: Px[] = [];
  for (let i = 0; i < w; i += 2) neon.push([x + i, top, 2, 1, i % 4 ? '.tw-neon-c' : '.tw-neon-p']);
  for (let j = 2; j < 18; j += 2) neon.push([x, top + j, 1, 2, j % 4 ? '.tw-neon-p' : '.tw-neon-c'], [x + w - 1, top + j, 1, 2, j % 4 ? '.tw-neon-c' : '.tw-neon-p']);
  return [
    [x, top, w, 18, C.purple], [x + 1, top + 1, w - 2, 1, C.purpleD], ...neon,
    // the sign: a star and a joystick
    [x + 6, top + 4, w - 12, 6, C.purpleD], [x + 10, top + 6, 3, 1, '.tw-neon-c'], [x + 11, top + 5, 1, 3, '.tw-neon-c'],
    [x + w - 14, top + 8, 4, 1, C.ink], [x + w - 13, top + 5, 2, 3, '.tw-neon-p'],
    ...windows(x + 4, top + 12, 1, 1, 6, 4, 0, 0, '.tw-neon-c'), ...windows(x + w - 10, top + 12, 1, 1, 6, 4, 0, 0, '.tw-neon-p'),
    [door - 4, G - 7, 8, 7, doorFill(open)],
  ];
}

// ---------- what stands behind and between ----------

function backdrop(town: Town, W: number): Px[] {
  const r = seq(hash(town.name + town.look));
  const out: Px[] = [];
  if (town.look === 'hometown' || town.look === 'campus') {
    // rolling hills, a water tower (the hometown) or a clock tower (the campus)
    for (let x = 0; x < W; x += 4) {
      const hgt = Math.round(7 + 4 * Math.sin(x / 37) + 3 * Math.sin(x / 13 + 1));
      out.push([x, G - hgt, 4, hgt, '.tw-hill']);
    }
    const tx = Math.round(W * 0.82);
    if (town.look === 'hometown') out.push([tx, G - 24, 10, 6, '.tw-far'], [tx + 1, G - 18, 1, 8, '.tw-far'], [tx + 8, G - 18, 1, 8, '.tw-far'], [tx + 2, G - 26, 6, 2, '.tw-far']);
    else out.push([tx, G - 28, 8, 18, '.tw-far'], ...gable(tx - 1, G - 29, 10, '.tw-far', '.tw-far'), [tx + 3, G - 24, 2, 2, '.tw-farwin']);
    return out;
  }
  // a skyline: towers (a city) or roofs, domes and spires (a city abroad)
  for (let x = 0; x < W; ) {
    const w = 8 + Math.floor(r() * 12);
    const hgt = town.look === 'abroad' ? 8 + Math.floor(r() * 9) : 10 + Math.floor(r() * 18);
    out.push([x, G - hgt, w, hgt, r() < 0.5 ? '.tw-far' : '.tw-far2']);
    if (town.look === 'abroad') {
      const k = r();
      if (k < 0.25) out.push(...dome(x + 1, G - hgt, w - 2, 4, '.tw-far2'));
      else if (k < 0.45) out.push([x + Math.floor(w / 2), G - hgt - 6, 1, 6, '.tw-far']);
      else out.push(...gable(x, G - hgt, w, '.tw-far2', '.tw-far2'));
    }
    for (let wy = G - hgt + 2; wy < G - 2; wy += 3) for (let wx = x + 2; wx < x + w - 2; wx += 3) if (r() < 0.35) out.push([wx, wy, 1, 1, '.tw-farwin']);
    x += w + Math.floor(r() * 3);
  }
  return out;
}

function street(W: number): Px[] {
  const out: Px[] = [[0, G, W, 2, '.tw-walk'], [0, G + 2, W, 1, '.tw-curb'], [0, G + 3, W, H - G - 3, '.tw-road']];
  for (let x = 4; x < W; x += 14) out.push([x, G + 5, 7, 1, '.tw-dash']);
  return out;
}

/** Lamps (a city) or trees (the hometown and the campus) between the buildings. */
function between(town: Town, slots: Slot[]): Px[] {
  const out: Px[] = [];
  slots.slice(1).forEach((s, i) => {
    const mid = s.x - Math.ceil(STREET.gap / 2);
    if (town.look === 'hometown' || (town.look === 'campus' && i % 2 === 0)) out.push(...tree(mid - 4, 1));
    else out.push([mid, G - 12, 1, 12, C.steelD], [mid - 1, G - 13, 3, 1, C.steelD], [mid - 1, G - 12, 3, 1, '.tw-lamp']);
  });
  return out;
}

function building(id: PlaceKind, town: Town, s: Slot, open: boolean, banners: number, hof: boolean): Px[] {
  switch (id) {
    case 'gym':
      return gym(town.look, s, town.color, open);
    case 'arena':
      return arena(town, s, open, banners);
    case 'house':
      return house(town.house, s, town.color, open);
    case 'agent':
      return agent(s, town.color, open);
    case 'hall':
      return hall(town.look, s, open, hof);
    default:
      return arcade(s, open);
  }
}

/** The whole street, at one art pixel per unit; the component scales it. */
export const TownArt = memo(function TownArt({ town, here, pad = 0, banners = 0, hof = false }: { town: Town; here: PlaceKind | null; pad?: number; banners?: number; hof?: boolean }) {
  const { w: W, slots } = useMemo(() => layoutOf(town, pad), [town, pad]);
  const px = useMemo(() => {
    const body: Px[] = [];
    const lights: Px[] = [];
    const add = (list: Px[]) => list.forEach((p) => (p[4].startsWith('.') ? lights : body).push(p));
    const far = backdrop(town, W);
    add(street(W));
    add(between(town, slots));
    slots.forEach((s) => add(building(s.place.id, town, s, s.place.id === here, banners, hof)));
    return { far, body, lights };
  }, [town, W, slots, here, banners, hof]);
  const draw = (list: Px[]) => list.map(([x, y, w, h, f], i) => (f.startsWith('.') ? <rect key={i} x={x} y={y} width={w} height={h} className={f.slice(1)} /> : <rect key={i} x={x} y={y} width={w} height={h} fill={f} />));
  return (
    <svg className="tw-art" viewBox={`0 0 ${W} ${H}`} width={W} height={H} shapeRendering="crispEdges" aria-hidden="true">
      <g className="tw-back">{draw(px.far)}</g>
      <g className="tw-body">{draw(px.body)}</g>
      <g className="tw-lights">{draw(px.lights)}</g>
    </svg>
  );
});
