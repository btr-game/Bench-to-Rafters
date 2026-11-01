// Playable postseason games (playtest round 5).
//
// The postseason is resumable by replay: when the regular season ends, the game keeps a
// snapshot and the list of the player's picks so far. Each pick replays the postseason from
// the snapshot (the engine is deterministic), and the replay stops at the first point that
// needs a pick it does not have yet: the next game (play it or simulate), the next quarter
// (a tactic) or a close finish (the last possession). That keeps the state plain JSON and
// the postseason code unchanged.

import { CLUTCH_TIMING, CRUNCH, GAME_POINTS, HOME_COURT, LEVELS, WIN_SCALE } from '../balance';
import { chance, clamp, int, normal } from '../rng';
import type { GameState, LevelKey, StatLine } from '../types';
import { addLine, emptyLine, expectedGameScore, gameScore, sampleGame, type Expected } from '../sim/statModel';

interface LiveChoice {
  id: string;
  label: string;
  detail?: string;
  risk?: 'Low' | 'Medium' | 'High';
}

export interface LiveRequest {
  stage: 'game' | 'quarter' | 'clutch' | 'crunch';
  title: string;
  text: string;
  round: string;
  opp: string;
  home: boolean;
  game: number;
  bestOf: number;
  wins: number;
  losses: number;
  quarter: number;
  us: number;
  them: number;
  qs: [number, number][];
  line: StatLine | null;
  recent: string[];
  choices: LiveChoice[];
  // round 28, crunch time in a final: the clock, whose ball, the last trip in a word, and overtime
  clock?: string;
  side?: 'off' | 'def';
  last?: { word: string; good: boolean; text: string } | null;
  ot?: number;
}

/** Thrown by the replay when it reaches a point that needs a pick. */
export class NeedLive extends Error {
  constructor(public req: LiveRequest) {
    super('needs a live pick');
  }
}

export interface LiveState {
  picks: string[];
  i: number;
  simAll: boolean;
  simSeries: string | null;
  recent: string[];
  // round 33: beginner's one last shot (levels.ts shotDue): no other pick in this postseason
  shot?: boolean;
}

export interface SeriesCtx {
  game: number;
  bestOf: number;
  wins: number;
  losses: number;
}

/** The next pick in the replay, or a pause for the player. */
export function nextPick(s: GameState, req: LiveRequest): string {
  const L = s.live!;
  if (L.i < L.picks.length) return L.picks[L.i++];
  throw new NeedLive(req);
}

const TACTICS: Record<string, { label: string; detail: string; usage: number; eff: number; ast: number; def: number; carry: number; risk: LiveChoice['risk'] }> = {
  steady: { label: 'Play your game', detail: 'Take what the defense gives you', usage: 1, eff: 1, ast: 1, def: 1, carry: 0.5, risk: 'Low' },
  takeover: { label: 'Take over', detail: 'Call your own number every trip: a hot hand wins it, a cold one loses it', usage: 1.55, eff: 0.96, ast: 0.8, def: 0.9, carry: 1.1, risk: 'High' },
  share: { label: 'Get everyone involved', detail: 'Make the extra pass; good if you can really pass', usage: 0.7, eff: 1.0, ast: 1.8, def: 1, carry: 0.3, risk: 'Low' },
  defense: { label: 'Lock in on defense', detail: 'Guard their best player; good if you can really defend', usage: 0.82, eff: 0.97, ast: 0.9, def: 1.7, carry: 0.3, risk: 'Medium' },
};

function quarterExpected(e: Expected, t: (typeof TACTICS)[string]): Expected {
  const q = 0.25;
  return {
    ...e,
    min: e.min * q,
    fga: e.fga * q * t.usage,
    tpa: e.tpa * q * t.usage,
    fta: e.fta * q * t.usage,
    p2: clamp(e.p2 * t.eff, 0.2, 0.8),
    p3: clamp(e.p3 * t.eff, 0.1, 0.6),
    reb: e.reb * q,
    ast: e.ast * q * t.ast,
    stl: e.stl * q * t.def,
    blk: e.blk * q * t.def,
    tov: e.tov * q * Math.sqrt(t.usage),
    pts: e.pts * q * t.usage * t.eff,
  };
}

const lineText = (l: StatLine | null) => (l && l.min > 0 ? `${l.pts} pts, ${l.reb} reb, ${l.ast} ast` : 'not played yet');

/** A final: the last game of a postseason or a tournament (round 28: its last minutes are played trip by trip). */
export const isFinal = (round: string): boolean => !/conference/i.test(round) && /\b(Finals|final|championship)$/i.test(round);

export const OFFENSE: Record<string, { label: string; detail: string; pts: 2 | 3; attr: 'FIN' | 'SHT' | 'INT' | 'PLY' }> = {
  drive: { label: 'Attack the rim', detail: 'Two points, maybe and-one', pts: 2, attr: 'FIN' },
  pull: { label: 'Pull-up jumper', detail: 'Your shot from the elbow', pts: 2, attr: 'SHT' },
  three: { label: 'Three from the wing', detail: 'Three points if it drops', pts: 3, attr: 'SHT' },
  post: { label: 'Post up', detail: 'Back him down, turn and score', pts: 2, attr: 'INT' },
  kick: { label: 'Draw two, kick it out', detail: 'A teammate takes the open shot', pts: 2, attr: 'PLY' },
};
export const DEFENSE: Record<string, { label: string; detail: string; attr: 'PER' | 'INT' | 'IQ' }> = {
  contest: { label: 'Contest the shooter', detail: 'Hands up, no easy jumpers', attr: 'PER' },
  help: { label: 'Help at the rim', detail: 'Wall off the paint', attr: 'INT' },
  gamble: { label: 'Go for the steal', detail: 'A steal, or an easy look for them', attr: 'PER' },
  switch: { label: 'Switch everything', detail: 'Talk, switch, no mismatches', attr: 'IQ' },
};
const clockOf = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec % 60)).padStart(2, '0')}`;

/**
 * Crunch time in a final (round 28): `trips` possessions from `start` seconds left, alternating from
 * his ball, each his call; the score, his line and the last word move with every trip.
 */
function crunchTime(s: GameState, a: LiveGameArgs, head: Omit<LiveRequest, 'stage' | 'title' | 'text' | 'quarter' | 'us' | 'them' | 'qs' | 'line' | 'choices'>, st: { us: number; them: number; line: StatLine; qs: [number, number][]; last: LiveRequest['last'] }, trips: number, start: number, ot: number): void {
  const rng = s.rng;
  const p = s.player;
  const lv = LEVELS[a.level].avg;
  const C = CRUNCH;
  const theirBase = clamp(C.them - (a.my - a.opp) * C.strength, 0.3, 0.62);
  for (let k = 0; k < trips; k++) {
    const sec = start - k * C.secs;
    const off = k % 2 === 0;
    const diff = st.us - st.them;
    const status = diff > 0 ? `Up ${diff}` : diff < 0 ? `Down ${-diff}` : 'Tied';
    const pick = nextPick(s, {
      ...head,
      stage: 'crunch',
      title: `${a.round}${head.bestOf > 1 ? ` · Game ${head.game}` : ''} · ${ot ? `Overtime${ot > 1 ? ` ${ot}` : ''}` : 'Crunch time'}`,
      text: `${status}, ${st.us}–${st.them}.`,
      quarter: 4,
      us: st.us,
      them: st.them,
      qs: st.qs.map((x) => [...x] as [number, number]),
      line: { ...st.line },
      clock: clockOf(sec),
      side: off ? 'off' : 'def',
      last: st.last,
      ot,
      choices: off
        ? Object.entries(OFFENSE).map(([id, m]) => ({ id, label: m.label, detail: m.detail, risk: m.pts === 3 ? 'High' : id === 'kick' ? 'Low' : 'Medium' }))
        : Object.entries(DEFENSE).map(([id, m]) => ({ id, label: m.label, detail: m.detail, risk: id === 'gamble' ? 'High' : 'Low' })),
    });
    if (off) {
      const m = OFFENSE[pick] ?? OFFENSE.drive;
      if (chance(rng, C.tov)) {
        st.line.tov += 1;
        st.last = { word: 'STEAL', good: false, text: `${clockOf(sec)} · They jump the passing lane. Turnover.` };
        continue;
      }
      const prob = clamp((C.base[pick] ?? 0.45) + (p.attrs[m.attr] - lv) * C.per + (p.morale - 60) * C.morale, C.min, C.max);
      const made = chance(rng, prob);
      const pts = pick === 'kick' && chance(rng, 0.4) ? 3 : m.pts;
      const andOne = made && pick === 'drive' && chance(rng, C.andOne);
      if (pick === 'kick') {
        if (made) st.line.ast += 1;
      } else {
        st.line.fga += 1;
        if (pts === 3) st.line.tpa += 1;
        if (made) {
          st.line.fgm += 1;
          if (pts === 3) st.line.tpm += 1;
          st.line.pts += pts + (andOne ? 1 : 0);
          if (andOne) {
            st.line.ftm += 1;
            st.line.fta += 1;
          }
        }
      }
      if (made) {
        st.us += pts + (andOne ? 1 : 0);
        st.qs[st.qs.length - 1][0] += pts + (andOne ? 1 : 0); // the last quarter counts up with the score
      }
      st.last = made
        ? { word: andOne ? 'AND ONE' : pick === 'drive' ? 'DUNK' : 'MAKE', good: true, text: `${clockOf(sec)} · ${pick === 'kick' ? `You find the open man: ${pts === 3 ? 'three' : 'two'}!` : `${m.label}: good${andOne ? ', and the foul' : ''}!`}` }
        : { word: 'MISS', good: false, text: `${clockOf(sec)} · ${m.label}: no good.` };
    } else {
      const d = DEFENSE[pick] ?? DEFENSE.contest;
      const steal = chance(rng, pick === 'gamble' ? C.steal.gamble + (p.attrs.PER - lv) * 0.003 : C.steal.other);
      if (steal) {
        st.line.stl += 1;
        st.last = { word: 'STEAL', good: true, text: `${clockOf(sec)} · You pick his pocket!` };
        continue;
      }
      const stop = (C.stop[pick] ?? 0) + (pick === 'gamble' ? 0 : (p.attrs[d.attr] - lv) * C.stopPer);
      const made = chance(rng, clamp(theirBase - stop, 0.2, 0.75));
      const pts = chance(rng, C.themThree) ? 3 : 2;
      const blocked = !made && pick === 'help' && chance(rng, 0.25);
      if (made) {
        st.them += pts;
        st.qs[st.qs.length - 1][1] += pts;
      } else if (blocked) st.line.blk += 1;
      st.last = made ? { word: pts === 3 ? 'THREE' : 'BUCKET', good: false, text: `${clockOf(sec)} · They score ${pts === 3 ? 'from deep' : 'inside'}.` } : blocked ? { word: 'BLOCK', good: true, text: `${clockOf(sec)} · You meet him at the rim: blocked!` } : { word: 'STOP', good: true, text: `${clockOf(sec)} · ${d.label}: stop!` };
    }
  }
}

export interface LiveGameArgs {
  e: Expected;
  started: boolean;
  level: LevelKey;
  my: number; // team strength with his impact
  opp: number;
  oppName: string;
  homeAdv: number; // 1 home, -1 away, 0 neutral
  round: string;
  series: SeriesCtx | undefined;
}

/** Plays one postseason game quarter by quarter with the player's calls. */
export function playLiveGame(s: GameState, a: LiveGameArgs): { line: StatLine; us: number; them: number; win: boolean; lastShot?: string } {
  const rng = s.rng;
  const p = s.player;
  const lv = LEVELS[a.level].avg;
  const base = GAME_POINTS[a.level];
  const sdGame = base * 0.106;
  const sdQ = sdGame / 2;
  // match the simulated games: logistic(diff / WIN_SCALE) is close to a normal margin with
  // mean diff * sdGame / (1.7 * WIN_SCALE); a quarter is a quarter of that
  const meanQ = ((a.my - a.opp + a.homeAdv * HOME_COURT) * sdGame) / (1.7 * WIN_SCALE) / 4;
  // per-quarter margin from the call: it pays off only if he has the skills for it
  const bonus: Record<string, number> = {
    steady: 0,
    takeover: 0,
    share: (p.attrs.PLY - lv - 5) * 0.025,
    defense: ((p.attrs.PER + p.attrs.INT) / 2 - lv - 5) * 0.025,
  };
  const line = emptyLine();
  let us = 0;
  let them = 0;
  const qs: [number, number][] = [];
  let lastShot: string | undefined; // how his last possession went, for the play-by-play
  let crunched = false; // round 28: a final played out over its last two minutes
  let crunchOts = 0; // the overtimes it took
  let crunchDown = false; // behind when crunch time began
  const sr = a.series;
  const head = {
    round: a.round,
    opp: a.oppName,
    home: a.homeAdv > 0,
    game: sr?.game ?? 1,
    bestOf: sr?.bestOf ?? 1,
    wins: sr?.wins ?? 0,
    losses: sr?.losses ?? 0,
    recent: s.live?.recent.slice(-3) ?? [],
  };
  // round 33: beginner's one last shot plays the quarters on its own and keeps the finish close
  const shot = !!s.live?.shot;
  for (let q = 1; q <= 4; q++) {
    const where = q === 1 ? 'Tip-off' : q === 3 ? 'Halftime' : `End of the ${q === 2 ? '1st' : '3rd'} quarter`;
    const tactic = shot ? 'steady' : nextPick(s, {
      ...head,
      stage: 'quarter',
      title: `${a.round}${head.bestOf > 1 ? ` · Game ${head.game}` : ''} · ${q === 1 ? '1st' : q === 2 ? '2nd' : q === 3 ? '3rd' : '4th'} quarter`,
      text: q === 1 ? `${where}. How do you start?` : `${where}: ${us}–${them}. You: ${lineText(line)}. What now?`,
      quarter: q,
      us,
      them,
      qs: [...qs],
      line: q === 1 ? null : { ...line },
      choices: Object.entries(TACTICS).map(([id, t]) => ({ id, label: t.label, detail: t.detail, risk: t.risk })),
    });
    const T = TACTICS[tactic] ?? TACTICS.steady;
    const eq = quarterExpected(a.e, T);
    const ql = sampleGame(rng, eq, a.started);
    addLine(line, ql);
    // a hot or cold quarter from him moves the score
    const hot = (gameScore(ql) - expectedGameScore(eq)) * T.carry * 0.5;
    const m = normal(rng, meanQ + (bonus[tactic] ?? 0) + hot, sdQ);
    let uq = Math.round(base / 4 + normal(rng, 0, sdQ * 0.5) + m / 2);
    uq = Math.max(uq, ql.pts + int(rng, 3, 9));
    const tq = Math.max(6, Math.round(uq - m));
    // round 28: a close final stops at two minutes to go, and the rest is his to play
    const at2 = q === 4 && isFinal(a.round) ? { u: Math.round(uq * 0.83), t: Math.round(tq * 0.83) } : null;
    if (at2 && Math.abs(us + at2.u - (them + at2.t)) <= CRUNCH.within) {
      us += at2.u;
      them += at2.t;
      qs.push([at2.u, at2.t]);
      crunched = true;
      break;
    }
    us += uq;
    them += tq;
    qs.push([uq, tq]);
  }
  line.gp = 1;
  line.gs = a.started ? 1 : 0;
  if (shot) {
    // down one with the ball: make it and they win
    if (Math.abs(us - them) > 3) them = us + 1;
    s.flags.levelShot = 1;
  }
  if (crunched) {
    const st = { us, them, line, qs, last: null as LiveRequest['last'] };
    crunchDown = us < them;
    crunchTime(s, a, head, st, CRUNCH.possessions, 120, 0);
    // overtime, played the same way (then decided quickly if it goes on and on)
    for (let ot = 1; st.us === st.them && ot <= CRUNCH.maxOt; ot++) {
      crunchOts = ot;
      crunchTime(s, a, head, st, CRUNCH.ot, 75, ot);
    }
    us = st.us;
    them = st.them;
    lastShot = st.last?.text.replace(/^[0-9:]+ · /, 'Last trip: ');
  }
  // a close finish: the last possession is his call
  else if (Math.abs(us - them) <= 3) {
    const need = them - us; // >0 trailing
    const three = need === 3;
    const pull = clamp(0.32 + (p.attrs.SHT - lv) * 0.006 + (p.morale - 60) * 0.001 - (three ? 0.06 : 0), 0.12, 0.62);
    const drive = clamp(0.42 + (p.attrs.FIN - lv) * 0.006 + (p.morale - 60) * 0.001, 0.18, 0.66);
    const pass = 0.4 - (three ? 0.05 : 0);
    const status = need > 0 ? `Down ${need}` : need < 0 ? `Up ${-need}` : 'Tied';
    // round 25: "pull@perfect": the call, then how his timing on the meter went
    const [call, timing] = nextPick(s, {
      ...head,
      stage: 'clutch',
      title: 'Last possession',
      text: `${status}, ${us}–${them}, ball in your hands with 14 seconds left. You: ${lineText(line)}.`,
      quarter: 4,
      us,
      them,
      qs: [...qs],
      line: { ...line },
      choices: [
        { id: 'pull', label: three ? 'Pull up from three yourself' : 'Pull-up jumper', detail: 'Your shot, your moment', risk: pull >= 0.45 ? 'Medium' : 'High' },
        { id: 'drive', label: 'Attack the rim', detail: 'Two points or a foul', risk: drive >= 0.5 ? 'Medium' : 'High' },
        { id: 'pass', label: 'Draw two and find the open man', detail: 'Trust a teammate', risk: 'Medium' },
      ],
    }).split('@');
    const pts = call === 'drive' ? 2 : three ? 3 : 2;
    const odds = call === 'pull' ? pull : call === 'drive' ? drive : pass;
    const T = CLUTCH_TIMING;
    const prob = timing === 'perfect' ? Math.min(T.max, odds + T.perfect) : timing === 'good' ? Math.min(T.max, odds + T.good) : timing === 'late' ? Math.max(T.min, odds + T.late) : odds;
    const made = chance(rng, prob);
    lastShot =
      call === 'pull'
        ? made
          ? `Last shot: you pull up ${three ? 'from three' : 'from the elbow'} and it is good!`
          : `Last shot: your pull-up ${three ? 'three ' : ''}rims out`
        : call === 'drive'
          ? made
            ? 'Last shot: you attack the rim and finish the layup!'
            : 'Last shot: your drive is blocked at the rim!'
          : made
            ? `Last shot: you draw two and kick it out; your teammate ${three ? 'drills the three' : 'hits the jumper'}!`
            : 'Last shot: you find the open man, and his shot misses';
    if (made) {
      us += pts;
      if (call !== 'pass') {
        line.pts += pts;
        line.fgm += 1;
        line.fga += 1;
        if (pts === 3) {
          line.tpm += 1;
          line.tpa += 1;
        }
      } else line.ast += 1;
      if (call === 'drive' && chance(rng, 0.2)) {
        us += 1;
        line.pts += 1;
        line.ftm += 1;
        line.fta += 1;
      }
    } else if (call !== 'pass') {
      line.fga += 1;
      if (three) line.tpa += 1;
    }
    // their answer, if there is time left
    if (them >= us - 2 && chance(rng, 0.5)) {
      const theyNeed = us - them;
      if (theyNeed >= 0 && chance(rng, theyNeed === 2 ? 0.33 : 0.42)) them += theyNeed === 2 ? 3 : 2;
    }
  }
  // overtime until someone wins
  while (us === them) {
    const m = normal(rng, meanQ * 0.5, sdQ * 0.6);
    const uq = Math.round(base / 9.6 + m / 2 + normal(rng, 0, 2));
    us += Math.max(2, uq);
    them += Math.max(2, Math.round(uq - m));
    const ot = sampleGame(rng, { ...a.e, min: a.e.min / 9.6, fga: a.e.fga / 9.6, tpa: a.e.tpa / 9.6, fta: a.e.fta / 9.6, reb: a.e.reb / 9.6, ast: a.e.ast / 9.6, stl: a.e.stl / 9.6, blk: a.e.blk / 9.6, tov: a.e.tov / 9.6 }, a.started);
    ot.gp = 0;
    ot.gs = 0;
    addLine(line, ot);
    if (crunched) crunchOts += 1;
  }
  // round 28: what crunch time came to, for the achievement book
  if (crunched) {
    const F = s.flags;
    F.crunch = (F.crunch ?? 0) + 1;
    if (us > them) {
      F.crunchWon = (F.crunchWon ?? 0) + 1;
      if (crunchOts) F.crunchOtWon = (F.crunchOtWon ?? 0) + 1;
      if (crunchDown) F.crunchBack = (F.crunchBack ?? 0) + 1;
    }
  }
  return { line, us, them, win: us > them, lastShot };
}

/** The pick before each game: play it, simulate it, or simulate more. */
export function gameRequest(s: GameState, round: string, oppName: string, home: boolean, sr: SeriesCtx | undefined): LiveRequest {
  const bestOf = sr?.bestOf ?? 1;
  const status = bestOf > 1 ? `Series ${sr!.wins}–${sr!.losses}. ` : '';
  const choices: LiveChoice[] = [
    { id: 'play', label: 'Play it', detail: 'Call the shots each quarter' },
    { id: 'sim', label: 'Simulate this game' },
  ];
  if (bestOf > 1) choices.push({ id: 'series', label: 'Simulate the rest of this series' });
  choices.push({ id: 'all', label: 'Simulate the rest of the postseason' });
  choices.push({ id: 'always', label: 'Always simulate postseasons', detail: 'You can turn playable games back on in Settings' });
  return {
    stage: 'game',
    title: `${round}${bestOf > 1 ? ` · Game ${sr!.game}` : ''}`,
    text: `${status}${home ? 'Home' : 'On the road'} against ${oppName}.`,
    round,
    opp: oppName,
    home,
    game: sr?.game ?? 1,
    bestOf,
    wins: sr?.wins ?? 0,
    losses: sr?.losses ?? 0,
    quarter: 0,
    us: 0,
    them: 0,
    qs: [],
    line: null,
    recent: s.live?.recent.slice(-3) ?? [],
    choices,
  };
}
