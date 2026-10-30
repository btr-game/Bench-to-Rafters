// Playable postseason games (playtest round 5).
//
// The postseason is resumable by replay: when the regular season ends, the game keeps a
// snapshot and the list of the player's picks so far. Each pick replays the postseason from
// the snapshot (the engine is deterministic), and the replay stops at the first point that
// needs a pick it does not have yet: the next game (play it or simulate), the next quarter
// (a tactic) or a close finish (the last possession). That keeps the state plain JSON and
// the postseason code unchanged.

import { CLUTCH_TIMING, GAME_POINTS, HOME_COURT, LEVELS, WIN_SCALE } from '../balance';
import { chance, clamp, int, normal } from '../rng';
import type { GameState, LevelKey, StatLine } from '../types';
import { addLine, emptyLine, expectedGameScore, gameScore, sampleGame, type Expected } from '../sim/statModel';

export interface LiveChoice {
  id: string;
  label: string;
  detail?: string;
  risk?: 'Low' | 'Medium' | 'High';
}

export interface LiveRequest {
  stage: 'game' | 'quarter' | 'clutch';
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
  for (let q = 1; q <= 4; q++) {
    const where = q === 1 ? 'Tip-off' : q === 3 ? 'Halftime' : `End of the ${q === 2 ? '1st' : '3rd'} quarter`;
    const tactic = nextPick(s, {
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
    us += uq;
    them += tq;
    qs.push([uq, tq]);
  }
  line.gp = 1;
  line.gs = a.started ? 1 : 0;
  // a close finish: the last possession is his call
  if (Math.abs(us - them) <= 3) {
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
