// Round 37 (owner: "make each stadium unique? especially for nba team stadiums, make the design
// symbolize the team and city"): how each arena on the town's street is built. Every NBA team's
// is designed by hand: a roof and a skin in the spirit of its real building, the team's emblem
// (the crest's motif, art/motifs.ts) on the front, and a landmark of its city beside it. Any other
// arena (a college's, a G League club's, a club abroad) and every high school is put together
// from its name, so no two read the same and each looks the same every visit. Pure data; the art
// is in art/arenaArt.ts.

export type Roof = 'box' | 'saucer' | 'dome' | 'drum' | 'arch' | 'wave' | 'sail' | 'peaks';
export type Skin = 'glass' | 'brick' | 'lattice' | 'stone' | 'stucco' | 'adobe';
export type Landmark =
  | 'steeple' | 'bridge' | 'empire' | 'hall' | 'cntower' | 'willis' | 'terminal' | 'rencen' | 'obelisk' | 'wings'
  | 'peach' | 'crowntower' | 'deco' | 'coaster' | 'capitol' | 'rockies' | 'pines' | 'derrick' | 'hood' | 'rockarch'
  | 'gate' | 'mast' | 'lights' | 'cactus' | 'liftbridge' | 'reunion' | 'rocket' | 'pyramid' | 'balcony' | 'alamo';

interface ArenaSpec {
  roof: Roof;
  skin: Skin;
  /** the city's landmark beside it (NBA arenas), on its left or right */
  mark?: Landmark;
  side?: 'l' | 'r';
}

/** Each NBA team's arena: what its building is like, and what stands for its city. */
export const NBA_ARENAS: Record<string, ArenaSpec & { why: string }> = {
  BOS: { roof: 'box', skin: 'brick', mark: 'steeple', side: 'r', why: 'old Boston brick; the Old North Church steeple' },
  BKN: { roof: 'saucer', skin: 'lattice', mark: 'bridge', side: 'r', why: 'a weathered-steel lattice; a tower of the Brooklyn Bridge' },
  NYK: { roof: 'drum', skin: 'stone', mark: 'empire', side: 'r', why: 'the round drum of a garden arena; the Empire State spire' },
  PHI: { roof: 'box', skin: 'brick', mark: 'hall', side: 'l', why: 'red brick; Independence Hall’s tower' },
  TOR: { roof: 'arch', skin: 'glass', mark: 'cntower', side: 'r', why: 'glass under an arch; the CN Tower' },
  CHI: { roof: 'box', skin: 'brick', mark: 'willis', side: 'l', why: 'a brick box on the West Side; the black tower in the Loop' },
  CLE: { roof: 'saucer', skin: 'glass', mark: 'terminal', side: 'r', why: 'glass on the lake; the Terminal Tower' },
  DET: { roof: 'wave', skin: 'glass', mark: 'rencen', side: 'r', why: 'a glass wave; the Renaissance Center’s round towers' },
  IND: { roof: 'arch', skin: 'brick', mark: 'obelisk', side: 'l', why: 'an old fieldhouse arch; the Monument Circle obelisk and a checkered flag' },
  MIL: { roof: 'wave', skin: 'glass', mark: 'wings', side: 'r', why: 'a curved glass roof; the art museum’s white wings on the lake' },
  ATL: { roof: 'box', skin: 'glass', mark: 'peach', side: 'r', why: 'a glass box downtown; a round glass tower and the peach' },
  CHA: { roof: 'saucer', skin: 'glass', mark: 'crowntower', side: 'l', why: 'the Queen City’s crowned tower' },
  MIA: { roof: 'wave', skin: 'stucco', mark: 'deco', side: 'r', why: 'white on the bay; an art deco hotel and a palm' },
  ORL: { roof: 'arch', skin: 'glass', mark: 'coaster', side: 'r', why: 'glass and steel; a roller coaster loop' },
  WAS: { roof: 'box', skin: 'stone', mark: 'capitol', side: 'l', why: 'stone like the monuments; the Capitol dome' },
  DEN: { roof: 'saucer', skin: 'glass', mark: 'rockies', side: 'l', why: 'the Rockies behind the arena' },
  MIN: { roof: 'box', skin: 'brick', mark: 'pines', side: 'r', why: 'warehouse brick; snowy northern pines' },
  OKC: { roof: 'box', skin: 'glass', mark: 'derrick', side: 'r', why: 'glass on the plains; an oil derrick' },
  POR: { roof: 'dome', skin: 'glass', mark: 'hood', side: 'l', why: 'a glass dome; Mount Hood and the roses' },
  UTA: { roof: 'saucer', skin: 'stone', mark: 'rockarch', side: 'r', why: 'red stone; a desert rock arch' },
  GSW: { roof: 'drum', skin: 'glass', mark: 'gate', side: 'l', why: 'a round glass drum by the bay; a Golden Gate tower' },
  LAC: { roof: 'sail', skin: 'glass', mark: 'mast', side: 'r', why: 'a roof like a sail; a clipper ship’s mast' },
  LAL: { roof: 'wave', skin: 'glass', mark: 'lights', side: 'l', why: 'an oval of glass downtown; palms and premiere searchlights' },
  PHX: { roof: 'peaks', skin: 'adobe', mark: 'cactus', side: 'r', why: 'desert adobe; saguaro cacti' },
  SAC: { roof: 'peaks', skin: 'glass', mark: 'liftbridge', side: 'l', why: 'angled glass; the gold Tower Bridge' },
  DAL: { roof: 'arch', skin: 'brick', mark: 'reunion', side: 'r', why: 'a brick arch; the ball of Reunion Tower' },
  HOU: { roof: 'saucer', skin: 'glass', mark: 'rocket', side: 'l', why: 'Space City’s rocket on its gantry' },
  MEM: { roof: 'box', skin: 'stone', mark: 'pyramid', side: 'r', why: 'stone on Beale Street; the Pyramid on the river' },
  NOP: { roof: 'dome', skin: 'stone', mark: 'balcony', side: 'l', why: 'a dome; a French Quarter balcony' },
  SAS: { roof: 'arch', skin: 'stone', mark: 'alamo', side: 'l', why: 'limestone; the front of the Alamo' },
};

/** How wide an NBA arena stands, and its landmark beside it. */
export const ARENA_W = 62;
export const MARK_W = 22;

const ROOFS: Roof[] = ['box', 'saucer', 'dome', 'drum', 'arch', 'wave', 'sail', 'peaks'];
const hashOf = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Any other arena, from its club's name: a campus builds in brick and stone, a club abroad in
 * stucco, stone and glass, a G League club in glass and brick. */
export function arenaFromName(name: string, look: 'campus' | 'city' | 'abroad'): ArenaSpec {
  const h = hashOf(name);
  const skins: Skin[] = look === 'campus' ? ['brick', 'stone', 'brick', 'glass'] : look === 'abroad' ? ['stucco', 'stone', 'glass', 'adobe'] : ['glass', 'brick', 'glass', 'stone'];
  return { roof: ROOFS[h % ROOFS.length], skin: skins[(h >>> 3) % skins.length] };
}

/** An NBA team's arena by its abbreviation, or one from the club's name. */
export function arenaSpec(abbr: string | undefined, name: string, look: 'campus' | 'city' | 'abroad'): ArenaSpec {
  return (abbr && NBA_ARENAS[abbr]) || arenaFromName(name, look);
}

export type Tower = 'bell' | 'clock' | 'cupola' | 'dome' | 'flat';
export interface SchoolSpec {
  tower: Tower;
  brick: 'red' | 'tan' | 'grey';
  /** the flagpole on the left or the right */
  flag: 'l' | 'r';
}

/** A high school, from its name: its tower, its brick and where its flag flies. */
export function schoolSpec(name: string): SchoolSpec {
  const h = hashOf(name || 'school');
  const towers: Tower[] = ['bell', 'clock', 'cupola', 'dome', 'flat'];
  const bricks: SchoolSpec['brick'][] = ['red', 'tan', 'grey'];
  return { tower: towers[h % towers.length], brick: bricks[(h >>> 4) % bricks.length], flag: (h >>> 7) % 2 ? 'l' : 'r' };
}
