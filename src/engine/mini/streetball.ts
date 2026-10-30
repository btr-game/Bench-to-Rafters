// Round 22: 3-on-3 streetball at a city park, by ones and twos (a basket inside the arc is 1,
// outside it 2), and make it take it: whoever scores keeps the ball. Round 24 (owner: "reduce it
// to one game"): one game to 11 against the crew that holds the court today.
// On offense he picks the play: drive and finish or a pull-up two (a timing tap decides how
// clean it is; a perfect drive draws the foul for an and-one, and both play out on the action
// cam), a post-up, a give-and-go, a kick to a teammate for two, or a lob. On defense he reads the other crew: lock up the ball, sit at
// the rim, or jump the passing lane. Every crew has a style, so the right read pays.
// Highlights fire up the crowd; a full hype meter makes his next play better.
// Ratings come from the career player (or a park regular in free play), so finishing,
// athleticism, shooting and passing all matter; the reward is mostly finishing.

import { chance, clamp, makeRng, next, pick, weightedIndex, type Rng } from '../rng';

export const STREET = {
  to: 11,
  close: 3, // a loss by this many or fewer is still a good run
  rout: 4, // a win by this many or more owns the park
  hypeMax: 5,
  hypeBoost: 0.12,
  slope: 0.0065, // make chance per rating point of edge
  timing: { perfect: 0.22, good: 0.08, late: -0.18 },
  andOne: 0.45, // a perfect finish draws the foul this often
  read: 0.13, // a right read on defense takes this off their make chance
  wrong: 0.06, // a wrong one gives them this much
  laneSteal: 0.28,
  oreb: 0.3, // base chance the shooting crew gets the rebound
};

export interface Baller {
  name: string;
  FIN: number;
  SHT: number;
  PLY: number;
  ATH: number;
  PER: number;
  INT: number;
  REB: number;
  me?: boolean;
}

export type Style = 'shooters' | 'slashers' | 'bigs';
export interface Crew {
  name: string;
  court: string;
  style: Style;
  players: Baller[];
}

export type Move = 'drive' | 'pullup' | 'post' | 'givego' | 'kick' | 'lob';
export type Guard = 'ball' | 'rim' | 'lane';
export type Timing = 'perfect' | 'good' | 'late';

/** The plays that ask for a timing tap (and play out on the action cam). */
export const TIMED: Move[] = ['drive', 'pullup'];

export const MOVES: { key: Move; name: string; text: string; pts: 1 | 2 }[] = [
  { key: 'drive', name: 'Drive and finish', text: 'Attack the rim. Tap the finish meter: a perfect finish draws the and-one.', pts: 1 },
  { key: 'pullup', name: 'Pull-up two', text: 'Step back behind the arc and let it fly. Tap the release meter.', pts: 2 },
  { key: 'post', name: 'Post up', text: 'Back him down and finish over him.', pts: 1 },
  { key: 'givego', name: 'Give and go', text: 'Hit a teammate and cut for the return pass. Safe, unless they read it.', pts: 1 },
  { key: 'kick', name: 'Kick out for two', text: 'Draw the help, then find the open shooter.', pts: 2 },
  { key: 'lob', name: 'Lob it up', text: 'Throw it to the sky. The crowd loves it, when it works.', pts: 1 },
];

export const GUARDS: { key: Guard; name: string; text: string }[] = [
  { key: 'ball', name: 'Lock up the ball', text: 'Take away the pull-up and the drive.' },
  { key: 'rim', name: 'Sit at the rim', text: 'Wall off drives and post-ups. Leaves the shooters.' },
  { key: 'lane', name: 'Jump the passing lane', text: 'Guess the pass and take it the other way.' },
];

// how each style plays (their move mix)
const MIX: Record<Style, Partial<Record<Move, number>>> = {
  shooters: { pullup: 0.45, kick: 0.3, drive: 0.15, givego: 0.1 },
  slashers: { drive: 0.5, givego: 0.2, lob: 0.15, pullup: 0.15 },
  bigs: { post: 0.5, lob: 0.2, drive: 0.15, kick: 0.15 },
};
// which read takes away which play
const READ: Record<Guard, Move[]> = { ball: ['pullup', 'drive'], rim: ['drive', 'post', 'lob'], lane: ['kick', 'givego', 'lob'] };

const CREWS: { name: string; court: string; style: Style; names: string[] }[] = [
  { name: 'The Corner Store Kings', court: 'Harbor Park', style: 'slashers', names: ['Dre "Jets" Collins', 'Tiny Okafor', 'Marcus Bell'] },
  { name: 'Splash Brothers Inc.', court: 'The Cage on 4th', style: 'shooters', names: ['Rico "Rain" Vega', 'Sam Holt', 'Benny Tran'] },
  { name: 'The Bricklayers', court: 'Sunset Courts', style: 'bigs', names: ['Big Lou Mensah', 'Tower Novak', 'Rashad Pike'] },
];
const MATES = ['Kev "Glue" Ortiz', 'Jules Baptiste', 'Nate "Hops" Kim', 'Teo Rossi', 'Malik Dunn', 'Ash Patel'];

/** A park player around this level, leaning toward a style. */
function baller(r: Rng, name: string, level: number, style: Style | 'mate'): Baller {
  const v = (lean = 0) => clamp(Math.round(level + lean + (next(r) - 0.5) * 12), 35, 95);
  const s = style;
  return {
    name,
    FIN: v(s === 'slashers' ? 5 : 0),
    SHT: v(s === 'shooters' ? 7 : s === 'bigs' ? -6 : 0),
    PLY: v(s === 'slashers' ? 2 : 0),
    ATH: v(s === 'slashers' ? 5 : s === 'bigs' ? -3 : 0),
    PER: v(s === 'shooters' ? 2 : 0),
    INT: v(s === 'bigs' ? 8 : -2),
    REB: v(s === 'bigs' ? 8 : 0),
  };
}

export interface Play {
  side: 'us' | 'them';
  text: string;
  pts: number;
  shooter: string;
  move: Move;
  made: boolean;
  highlight?: string; // AND ONE!, POSTER!, ...
  steal?: boolean;
  // round 24: who it went through, for the ball on the court and the action cam
  handler: string; // who had the ball when the play started
  def: string; // the man on him (on a steal, the one who took it)
  timing?: Timing;
  blocked?: boolean;
  dunk?: boolean;
}

export interface StreetState {
  rng: Rng;
  me: Baller;
  mates: Baller[];
  crew: Crew;
  us: number;
  them: number;
  ourBall: boolean;
  hype: number;
  plays: Play[];
  over: boolean;
}

export function newStreet(seed: number, me: Baller, level: number): StreetState {
  const r = makeRng(seed);
  // the crew that holds the court today, a little better than him
  const c = pick(r, CREWS);
  const crew = { name: c.name, court: c.court, style: c.style, players: c.names.map((n) => baller(r, n, level + 1, c.style)) };
  const names = [...MATES].sort(() => next(r) - 0.5);
  const mates = [baller(r, names[0], level - 4, 'mate'), baller(r, names[1], level - 4, 'mate')];
  return { rng: r, me: { ...me, me: true }, mates, crew, us: 0, them: 0, ourBall: chance(r, 0.5), hype: 0, plays: [], over: false };
}

const avg = (xs: Baller[], k: keyof Omit<Baller, 'name' | 'me'>) => xs.reduce((t, x) => t + x[k], 0) / xs.length;
const p = (base: number, edge: number) => clamp(base + edge * STREET.slope, 0.08, 0.92);

function score(st: StreetState, side: 'us' | 'them', pts: number): void {
  if (side === 'us') st.us += pts;
  else st.them += pts;
  // make it take it
  st.ourBall = side === 'us';
  if (st.us >= STREET.to || st.them >= STREET.to) st.over = true;
}

/** A miss: who gets the board. */
function rebound(st: StreetState, shooting: 'us' | 'them'): string {
  const ours = avg([st.me, ...st.mates], 'REB');
  const theirs = avg(st.crew.players, 'REB');
  const edge = shooting === 'us' ? ours - theirs : theirs - ours;
  const keep = chance(st.rng, clamp(STREET.oreb + edge * 0.006, 0.1, 0.55));
  st.ourBall = shooting === 'us' ? keep : !keep;
  return keep ? ' Offensive board, ball stays.' : '';
}

/** His play on offense. `timing` is the tap for a drive or a pull-up. */
export function runOffense(st: StreetState, move: Move, timing?: Timing): Play {
  const r = st.rng;
  const crew = st.crew.players;
  const def = pick(r, crew);
  const mate = pick(r, st.mates);
  const me = st.me;
  const fire = st.hype >= STREET.hypeMax ? STREET.hypeBoost : 0;
  if (fire) st.hype = 0;
  let chanceMake = 0;
  let shooter = me.name;
  let pts: number = MOVES.find((m) => m.key === move)!.pts;
  let turnover = 0;
  switch (move) {
    case 'drive':
      chanceMake = p(0.42, me.FIN * 0.6 + me.ATH * 0.4 - (def.PER * 0.5 + def.INT * 0.5)) + STREET.timing[timing ?? 'good'];
      break;
    case 'pullup':
      chanceMake = p(0.33, me.SHT - def.PER) + STREET.timing[timing ?? 'good'];
      break;
    case 'post':
      chanceMake = p(0.44, (me.FIN + me.INT) / 2 - def.INT);
      break;
    case 'givego':
      chanceMake = p(0.56, me.PLY * 0.5 + me.FIN * 0.5 - def.PER);
      turnover = clamp(0.14 - me.PLY * 0.0012, 0.03, 0.12);
      break;
    case 'kick':
      shooter = mate.name;
      chanceMake = p(0.33, mate.SHT + (me.PLY - 60) * 0.4 - def.PER);
      turnover = 0.05;
      break;
    case 'lob':
      shooter = mate.name;
      chanceMake = p(0.42, me.PLY * 0.5 + mate.ATH * 0.5 - def.INT);
      turnover = clamp(0.2 - me.PLY * 0.0015, 0.06, 0.16);
      break;
  }
  chanceMake = clamp(chanceMake + fire, 0.05, 0.95);
  let play: Play;
  const base = { side: 'us' as const, move, shooter, handler: me.name, def: def.name, timing };
  if (chance(r, turnover)) {
    st.ourBall = false;
    play = { ...base, pts: 0, made: false, steal: true, text: `${def.name} reads it and picks it off.` };
  } else if (chance(r, chanceMake)) {
    const andOne = move === 'drive' && timing === 'perfect' && chance(r, STREET.andOne);
    if (andOne) pts += 1;
    const dunk = move === 'drive' && me.ATH >= 75 && chance(r, 0.4);
    const highlight = andOne ? 'AND ONE!' : move === 'lob' ? 'ALLEY-OOP!' : dunk ? `POSTER ON ${def.name.split(' ').pop()!.toUpperCase()}!` : move === 'pullup' && timing === 'perfect' ? 'CASH!' : undefined;
    st.hype = Math.min(STREET.hypeMax, st.hype + (highlight ? 2 : 1));
    const text = dunk ? `${shooter} rises up and throws it down on ${def.name}.` : TEXT_MAKE[move](shooter, def.name);
    play = { ...base, pts, made: true, highlight, dunk, text: text + (andOne ? ' And one!' : '') + (fire ? ' The park is going crazy.' : '') };
    score(st, 'us', pts);
  } else {
    const blocked = move === 'drive' && chance(r, 0.5);
    play = { ...base, pts: 0, made: false, blocked, text: blocked ? `${shooter} drives and ${def.name} swats it away.` : TEXT_MISS[move](shooter, def.name) };
    play.text += rebound(st, 'us');
  }
  st.plays.push(play);
  return play;
}

/** Their possession: he picks how to guard it. */
export function runDefense(st: StreetState, guard: Guard): Play {
  const r = st.rng;
  const crew = st.crew;
  const mix = MIX[crew.style];
  const moves = Object.keys(mix) as Move[];
  const move = moves[weightedIndex(r, moves.map((m) => mix[m]!))];
  const att = pick(r, crew.players);
  const us = [st.me, ...st.mates];
  const read = READ[guard].includes(move);
  const adj = read ? -STREET.read : STREET.wrong;
  // the ball starts with their handler; a pass goes to the man who shoots it
  const handler = move === 'kick' || move === 'lob' || move === 'givego' ? (crew.players.find((x) => x !== att) ?? att).name : att.name;
  const base = { side: 'them' as const, move, shooter: att.name, handler, def: st.me.name };
  let play: Play;
  if (guard === 'lane' && read && chance(r, STREET.laneSteal + (st.me.PER - 60) * 0.004)) {
    st.ourBall = true;
    st.hype = Math.min(STREET.hypeMax, st.hype + 1);
    play = { ...base, pts: 0, made: false, steal: true, highlight: 'PICKED!', text: `You jump the lane and take it the other way. ${att.name} never saw you.` };
  } else {
    const defense = move === 'pullup' || move === 'kick' ? avg(us, 'PER') : move === 'post' || move === 'lob' ? avg(us, 'INT') : avg(us, 'PER') * 0.5 + avg(us, 'INT') * 0.5;
    const off = move === 'pullup' || move === 'kick' ? att.SHT : move === 'post' ? (att.FIN + att.INT) / 2 : move === 'givego' ? (att.PLY + att.FIN) / 2 : att.FIN * 0.6 + att.ATH * 0.4;
    const odds = move === 'pullup' || move === 'kick' ? 0.33 : move === 'givego' ? 0.52 : 0.44;
    const made = chance(r, clamp(p(odds, off - defense) + adj, 0.05, 0.92));
    const pts = MOVES.find((m) => m.key === move)!.pts;
    if (made) {
      play = { ...base, pts, made: true, text: TEXT_MAKE[move](att.name, 'you') };
      score(st, 'them', pts);
    } else {
      play = { ...base, pts: 0, made: false, text: read ? `You read it. ${TEXT_MISS[move](att.name, 'you')}` : TEXT_MISS[move](att.name, 'you') };
      play.text += rebound(st, 'them');
    }
  }
  st.plays.push(play);
  return play;
}

const TEXT_MAKE: Record<Move, (a: string, d: string) => string> = {
  drive: (a, d) => `${a} gets past ${d} and finishes at the rim.`,
  pullup: (a, d) => `${a} pulls up over ${d}. Two.`,
  post: (a, d) => `${a} backs ${d} down and drops it in.`,
  givego: (a) => `Give, go, and ${a} lays it in.`,
  kick: (a) => `${a} catches it in rhythm. Two.`,
  lob: (a) => `${a} goes up and throws it down.`,
};
const TEXT_MISS: Record<Move, (a: string, d: string) => string> = {
  drive: (a, d) => `${a} drives, ${d === 'you' ? 'you meet him' : d + ' meets him'} at the rim. No good.`,
  pullup: (a) => `${a} pulls up. Off the back iron.`,
  post: (a) => `${a} spins baseline. Rolls out.`,
  givego: (a) => `The return pass to ${a} is a step late.`,
  kick: (a) => `${a} is open and misses.`,
  lob: (a) => `The lob to ${a} sails long.`,
};

/** What the game is worth, for the career bonus: a rout, a win, a close loss or a beating. */
export const streetResult = (st: StreetState): 'rout' | 'win' | 'close' | 'out' => {
  const m = st.us - st.them;
  return m >= STREET.rout ? 'rout' : m > 0 ? 'win' : -m <= STREET.close ? 'close' : 'out';
};
