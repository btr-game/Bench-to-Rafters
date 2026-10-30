// Round 22: 3-on-3 streetball. King of the court at a city park: three crews to beat, the
// first two games to 7 and the final to 11, by ones and twos (a basket inside the arc is 1,
// outside it 2), and make it take it: whoever scores keeps the ball.
// On offense he picks the play: drive and finish (a timing tap decides how clean it is, a
// perfect one draws the foul for an and-one), a pull-up two, a post-up, a give-and-go, a kick
// to a teammate for two, or a lob. On defense he reads the other crew: lock up the ball, sit at
// the rim, or jump the passing lane. Every crew has a style, so the right read pays.
// Highlights fire up the crowd; a full hype meter makes his next play better.
// Ratings come from the career player (or a park regular in free play), so finishing,
// athleticism, shooting and passing all matter; the reward is mostly finishing.

import { chance, clamp, makeRng, next, pick, weightedIndex, type Rng } from '../rng';

export const STREET = {
  rounds: [7, 7, 11],
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

export const MOVES: { key: Move; name: string; text: string; pts: 1 | 2 }[] = [
  { key: 'drive', name: 'Drive and finish', text: 'Attack the rim. Tap the finish meter: a perfect finish draws the and-one.', pts: 1 },
  { key: 'pullup', name: 'Pull-up two', text: 'Step back behind the arc and let it fly.', pts: 2 },
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
}

export interface StreetState {
  rng: Rng;
  me: Baller;
  mates: Baller[];
  crews: Crew[];
  round: number; // 0-2
  us: number;
  them: number;
  ourBall: boolean;
  hype: number;
  plays: Play[];
  wins: number;
  over: boolean; // the run is over (lost a game, or won the final)
  gameOver: boolean; // this game is over
}

export function newStreet(seed: number, me: Baller, level: number): StreetState {
  const r = makeRng(seed);
  const crews = CREWS.map((c, i) => ({ name: c.name, court: c.court, style: c.style, players: c.names.map((n) => baller(r, n, level - 3 + i * 3, c.style)) }));
  const names = [...MATES].sort(() => next(r) - 0.5);
  const mates = [baller(r, names[0], level - 4, 'mate'), baller(r, names[1], level - 4, 'mate')];
  return { rng: r, me: { ...me, me: true }, mates, crews, round: 0, us: 0, them: 0, ourBall: chance(r, 0.5), hype: 0, plays: [], wins: 0, over: false, gameOver: false };
}

export const target = (st: StreetState): number => STREET.rounds[st.round];
const avg = (xs: Baller[], k: keyof Omit<Baller, 'name' | 'me'>) => xs.reduce((t, x) => t + x[k], 0) / xs.length;
const p = (base: number, edge: number) => clamp(base + edge * STREET.slope, 0.08, 0.92);

function score(st: StreetState, side: 'us' | 'them', pts: number): void {
  if (side === 'us') st.us += pts;
  else st.them += pts;
  // make it take it
  st.ourBall = side === 'us';
  const t = target(st);
  if (st.us >= t || st.them >= t) {
    st.gameOver = true;
    if (st.us >= t) {
      st.wins++;
      if (st.round === STREET.rounds.length - 1) st.over = true;
    } else st.over = true;
  }
}

/** A miss: who gets the board. */
function rebound(st: StreetState, shooting: 'us' | 'them'): string {
  const ours = avg([st.me, ...st.mates], 'REB');
  const theirs = avg(st.crews[st.round].players, 'REB');
  const edge = shooting === 'us' ? ours - theirs : theirs - ours;
  const keep = chance(st.rng, clamp(STREET.oreb + edge * 0.006, 0.1, 0.55));
  st.ourBall = shooting === 'us' ? keep : !keep;
  return keep ? ' Offensive board, ball stays.' : '';
}

/** His play on offense. `timing` is the finish tap for a drive. */
export function runOffense(st: StreetState, move: Move, timing?: Timing): Play {
  const r = st.rng;
  const crew = st.crews[st.round].players;
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
      chanceMake = p(0.33, me.SHT - def.PER);
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
  if (chance(r, turnover)) {
    st.ourBall = false;
    play = { side: 'us', move, shooter, pts: 0, made: false, steal: true, text: `${def.name} reads it and picks it off.` };
  } else if (chance(r, chanceMake)) {
    const andOne = move === 'drive' && timing === 'perfect' && chance(r, STREET.andOne);
    if (andOne) pts += 1;
    const highlight = andOne ? 'AND ONE!' : move === 'lob' ? 'ALLEY-OOP!' : move === 'drive' && me.ATH >= 75 && chance(r, 0.4) ? `POSTER ON ${def.name.split(' ').pop()!.toUpperCase()}!` : move === 'pullup' && chance(r, 0.25) ? 'CASH!' : undefined;
    st.hype = Math.min(STREET.hypeMax, st.hype + (highlight ? 2 : 1));
    play = { side: 'us', move, shooter, pts, made: true, highlight, text: TEXT_MAKE[move](shooter, def.name) + (fire ? ' The park is going crazy.' : '') };
    score(st, 'us', pts);
  } else {
    play = { side: 'us', move, shooter, pts: 0, made: false, text: TEXT_MISS[move](shooter, def.name) };
    play.text += rebound(st, 'us');
  }
  st.plays.push(play);
  return play;
}

/** Their possession: he picks how to guard it. */
export function runDefense(st: StreetState, guard: Guard): Play {
  const r = st.rng;
  const crew = st.crews[st.round];
  const mix = MIX[crew.style];
  const moves = Object.keys(mix) as Move[];
  const move = moves[weightedIndex(r, moves.map((m) => mix[m]!))];
  const att = pick(r, crew.players);
  const us = [st.me, ...st.mates];
  const read = READ[guard].includes(move);
  const adj = read ? -STREET.read : STREET.wrong;
  let play: Play;
  if (guard === 'lane' && read && chance(r, STREET.laneSteal + (st.me.PER - 60) * 0.004)) {
    st.ourBall = true;
    st.hype = Math.min(STREET.hypeMax, st.hype + 1);
    play = { side: 'them', move, shooter: att.name, pts: 0, made: false, steal: true, highlight: 'PICKED!', text: `You jump the lane and take it the other way. ${att.name} never saw you.` };
  } else {
    const defense = move === 'pullup' || move === 'kick' ? avg(us, 'PER') : move === 'post' || move === 'lob' ? avg(us, 'INT') : avg(us, 'PER') * 0.5 + avg(us, 'INT') * 0.5;
    const off = move === 'pullup' || move === 'kick' ? att.SHT : move === 'post' ? (att.FIN + att.INT) / 2 : move === 'givego' ? (att.PLY + att.FIN) / 2 : att.FIN * 0.6 + att.ATH * 0.4;
    const base = move === 'pullup' || move === 'kick' ? 0.33 : move === 'givego' ? 0.52 : 0.44;
    const made = chance(r, clamp(p(base, off - defense) + adj, 0.05, 0.92));
    const pts = MOVES.find((m) => m.key === move)!.pts;
    if (made) {
      play = { side: 'them', move, shooter: att.name, pts, made: true, text: TEXT_MAKE[move](att.name, 'you') };
      score(st, 'them', pts);
    } else {
      play = { side: 'them', move, shooter: att.name, pts: 0, made: false, text: read ? `You read it. ${TEXT_MISS[move](att.name, 'you')}` : TEXT_MISS[move](att.name, 'you') };
      play.text += rebound(st, 'them');
    }
  }
  st.plays.push(play);
  return play;
}

/** On to the next crew. */
export function nextGame(st: StreetState): void {
  st.round++;
  st.us = 0;
  st.them = 0;
  st.hype = 0;
  st.gameOver = false;
  st.ourBall = chance(st.rng, 0.5);
}

const TEXT_MAKE: Record<Move, (a: string, d: string) => string> = {
  drive: (a, d) => `${a} gets past ${d} and finishes at the rim.`,
  pullup: (a, d) => `${a} steps back over ${d}. Two.`,
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

/** What the run is worth, for the career bonus. */
export const streetResult = (st: StreetState): 'king' | 'final' | 'won' | 'out' => (st.wins >= STREET.rounds.length ? 'king' : st.wins === 2 ? 'final' : st.wins === 1 ? 'won' : 'out');
