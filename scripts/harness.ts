// Headless career runner used by `npm run sim` and the balance test.
// It drives the game only through flow.ts, exactly like the UI.

import { claimMini, miniProgress, type MiniId, type MiniResult } from '../src/engine/career/miniBonus';
import { endingOf } from '../src/ui/endings';
import { canSetStyle, setStyle, styleEffect, TEAM_STYLES, type TeamStyle } from '../src/engine/career/identity';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { labCost, spendCredits } from '../src/engine/career/lab';
import { ARCHETYPES } from '../src/engine/player/archetypes';
import { ATTRS, LEGACY, OVR_WEIGHTS, POSITIONS, type Mode } from '../src/engine/balance';
import { makeRng, next, pick, int, type Rng } from '../src/engine/rng';
import type { Choice, Decision, GameState, Pos } from '../src/engine/types';
import { careerIndex, count, legacyScore } from '../src/engine/awards/legacy';
import { ovrOf } from '../src/engine/player/ovr';
import { earnedNow, NO_TOTALS } from '../src/engine/achievements';
import { trueShooting, valuePerGame } from '../src/engine/sim/statModel';
import { FIRST_NAMES, LAST_NAMES } from '../src/content/names';

export type Policy = 'random' | 'smart';

/** The start page's picks; `force` fixes the position and archetype (round 28: difficulty by position and archetype). */
function randomInput(r: Rng, policy: Policy, force?: { pos: Pos; archetype: number }) {
  const pos: Pos = force?.pos ?? pick(r, POSITIONS);
  const archetype = force ? force.archetype : int(r, 0, ARCHETYPES[pos].length - 1);
  const arch = ARCHETYPES[pos][archetype];
  let focus = [...ATTRS].sort(() => next(r) - 0.5).slice(0, 2);
  if (policy === 'smart') {
    // focus the two attributes that matter most for the position
    focus = [...ATTRS].sort((a, b) => OVR_WEIGHTS[pos][b] - OVR_WEIGHTS[pos][a]).slice(0, 2);
  }
  void arch;
  return { name: 'Sim Player', number: 7, pos, archetype, focus, hometown: 'Anytown', highSchool: 'Lincoln High' };
}

/** A name and number from the seed (round 25: nicknames read looks off the name), without touching the rng. */
function simIdentity(seed: number): { name: string; number: number } {
  const k = (seed * 2654435761) >>> 0;
  return { name: `${FIRST_NAMES[k % FIRST_NAMES.length]} ${LAST_NAMES[(k >>> 8) % LAST_NAMES.length]}`, number: (k >>> 16) % 100 };
}

const enabled = (d: Decision): Choice[] => d.choices.filter((c) => !c.disabled);

export function smartChoice(s: GameState, d: Decision, r: Rng): string {
  const ch = enabled(d);
  const byId = (id: string) => ch.find((c) => c.id === id)?.id;
  switch (d.kind) {
    case 'plan': {
      if (s.player.injury) return byId('recovery') ?? ch[0].id;
      // fast break: one of five training groups, the one that trains his top focus stat
      if (d.data?.single && s.mode !== 'lab') {
        const want = s.player.focus[0];
        const group: Record<string, string> = { SHT: 'shooting', FIN: 'strength', REB: 'strength', ATH: 'strength', INT: 'defense', PER: 'defense', PLY: 'playmaking', IQ: 'playmaking' };
        return byId(group[want] ?? 'balanced') ?? ch[0].id;
      }
      if (s.player.morale < 35) return byId('recovery') ?? ch[0].id;
      return byId(s.player.age <= 22 ? 'grind' : s.player.age <= 27 ? 'balanced' : 'teamfirst') ?? ch[0].id;
    }
    case 'summer':
      return 'skills';
    case 'shop': {
      // buy the priciest affordable training or recovery item
      const buy = ch.filter((c) => c.id !== 'leave' && /Training|Recovery|Shoes/.test(String(c.tags?.[0]))).sort((a, b) => Number(b.meta?.price) - Number(a.meta?.price))[0];
      return buy?.id ?? 'leave';
    }
    case 'press':
      return 'humble';
    case 'story':
      // round 38: story mode's chapters: the warm answer (the first)
      return ch[0].id;
    case 'brand':
      // a signature line for a big name, the sure deal otherwise
      return ch.find((c) => c.id.startsWith(s.player.rep >= 80 ? 'line:' : 'deal:'))?.id ?? 'later';
    case 'assign':
      return 'go';
    case 'youth':
      return byId('promote') ?? byId('move') ?? ch[0].id;
    case 'live':
      // round 35: the call before a series against his rival classmate has no 'all'; its first,
      // guarding him, carries the best odds (RIVAL_SERIES.guard.edge). Round 39: sim mode's stop for
      // a game the Floor plays is simulated like the rest; the Floor itself is left to the engine
      return byId('all') ?? byId('auto') ?? (byId('play') && byId('sim')) ?? ch[0].id;
    case 'national':
      return s.player.age < 32 ? 'accept' : 'decline';
    case 'transfer':
      return 'enter';
    case 'retirePrompt':
      return s.player.age >= (Number(globalThis.process?.env?.RETIRE_AGE) || 32) ? 'retire' : 'go';
    case 'declare':
    case 'withdraw': {
      const c = ch.find((x) => x.id === 'declare' || x.id === 'stay')!;
      const lo = Number(c.meta?.mockLo ?? 99);
      const hi = Number(c.meta?.mockHi ?? 99);
      const centre = (lo + hi) / 2;
      if (ch.length === 1) return ch[0].id;
      if (centre <= 30) return c.id;
      return d.kind === 'declare' ? 'return' : 'withdraw';
    }
    case 'event': {
      const avoid = ['Play through it', 'Wing it', 'Go', 'Clap back', 'Post everywhere'];
      const safe = ch.filter((c) => !avoid.includes(c.label));
      return (safe[0] ?? ch[0]).id;
    }
    case 'offers': {
      const offers = ch.filter((c) => c.meta && c.id !== 'retire' && c.id !== 'stay');
      if (offers.length === 0) return byId('stay') ?? byId('retire') ?? ch[0].id;
      const score = (c: Choice) => {
        const lvl = Number(c.meta!.level);
        const role = Number(c.meta!.role);
        const mins = Number(c.meta!.minutes);
        const sal = Number(c.meta!.salary);
        // highest level where he'd be at least Rotation, then minutes, then team quality and money
        const outlook = String(c.tags?.[3] ?? '');
        const ob = outlook === 'Contender' ? 3 : outlook === 'Playoff team' ? 1.5 : 0;
        return (role >= 2 ? 100 : 0) + lvl * 10 + mins * 0.1 + ob + sal * 0.01;
      };
      const best = [...offers].sort((a, b) => score(b) - score(a))[0];
      const stay = byId('stay');
      if (stay && Number(best.meta!.level) < 6 && Number(best.meta!.role) < 2) return stay;
      return best.id;
    }
  }
  void r;
  return ch[0].id;
}

function randomChoice(d: Decision, r: Rng): string {
  // playable postseason games are simulated here: replaying each pick would be slow
  if (d.kind === 'live') return d.choices.some((c) => c.id === 'all') ? 'all' : d.choices[0].id;
  const ch = enabled(d);
  return pick(r, ch).id;
}

/**
 * Built in a lab: spend every credit. The smart policy buys the point that adds the most OVR
 * per credit (position weights over cost, a little spread so no rating is left at zero); the
 * random policy buys random ratings.
 */
function labSpend(s: GameState, policy: Policy, r: Rng): void {
  for (let i = 0; i < 400; i++) {
    const credits = s.player.lab?.credits ?? 0;
    const open = ATTRS.filter((k) => s.player.attrs[k] < 99 && labCost(s.player.attrs[k]) <= credits + 1e-9);
    if (open.length === 0) return;
    const w = OVR_WEIGHTS[s.player.pos];
    const k = policy === 'smart' ? [...open].sort((a, b) => w[b] / labCost(s.player.attrs[b]) / (1 + s.player.attrs[b] / 400) - w[a] / labCost(s.player.attrs[a]) / (1 + s.player.attrs[a] / 400))[0] : pick(r, open);
    if (spendCredits(s, k, 1) === 0) return;
  }
}

export interface CareerResult {
  playedNba: boolean;
  nbaSeasons: number;
  allStar: boolean;
  allNba: boolean;
  allNba1: boolean;
  mvp: boolean;
  title: boolean;
  hof: boolean;
  declared: boolean;
  undrafted: boolean;
  drafted: boolean;
  retireAge: number;
  proCareer: boolean;
  verdict: string;
  legacy: number;
  index: { total: number; best: number; score: number }; // round 25: the leaderboards' career index
  nickname: string | null; // round 25: what the media called him (nickname id)
  achievements: string[]; // round 25: the achievement ids the career earned (checked for ones that never or always fire)
  brand: { kind: 'deal' | 'line'; earned: number; shoe: number } | null;
  money: { hired: number; staffPaid: number; fines: number; finedFor: number; legacy: number; pressers: number; seasons: number; rival: string | null; h2h: [number, number]; news: string[] }; // round 25: staff, fines, legacy projects, press conferences
  peakOvr: number;
  potential: number;
  startOvr: number;
  snapshots: { leader: number; over25: number; best: number; worst: number }[];
  nbaLines: { ovr: number; mpg: number; ppg: number; role: string; value: number; rpg: number; apg: number; ts: number }[];
  steps: number;
  paths: string[];
  ages: { age: number; ovr: number; wear: number }[]; // at the end of each season
  leap: boolean;
  tragedy: boolean;
  nextStep: boolean; // round 36: the late-career leap
  ending: string; // round 36: which of the twelve endings the career gets (ui/endings.ts)
  anomaly: string;
  country: string;
  stars: number;
  titles: { age: number; key: boolean; role: string; rank: number }[]; // round 14: how titles were won
}

/**
 * Mini-game play for the diagnostics (round 13): none; casual (one claim a season with a decent
 * result); grinder (both claims every season with top results that suit his position).
 */
export type MiniPlay = 'none' | 'casual' | 'grinder';

function playMinis(s: GameState, how: MiniPlay): void {
  if (how === 'none' || s.stage === 'HS' || s.flags.harnessMini === s.year) return;
  s.flags.harnessMini = s.year;
  // round 15: only the games his ratings have unlocked (casual: a decent result, grinder: the best)
  const top: Record<MiniId, MiniResult> = {
    threes: { game: 'threes', score: 27, won: true, own: true },
    dunk: { game: 'dunk', best: 48, won: true },
    legends: { game: 'legends', reached: 'champion' },
    office: { game: 'office', titles: 1, playoffs: 3, seasons: 3, fired: false },
    lab: { game: 'lab', peak: 95 },
    street: { game: 'street', reached: 'rout' },
    rhythm: { game: 'rhythm', grade: 'S' },
  };
  const ok: Record<MiniId, MiniResult> = {
    threes: { game: 'threes', score: 23, won: false, own: true },
    dunk: { game: 'dunk', best: 44, won: false },
    legends: { game: 'legends', reached: 'semis' },
    office: { game: 'office', titles: 0, playoffs: 2, seasons: 3, fired: false },
    lab: { game: 'lab', peak: 90 },
    street: { game: 'street', reached: 'win' },
    rhythm: { game: 'rhythm', grade: 'A' },
  };
  const open = (Object.keys(top) as MiniId[]).filter((id) => miniProgress(s, id).open);
  if (open.length === 0) return;
  if (how === 'casual') claimMini(s, ok[open[0]]);
  else for (const id of open.slice(0, 2)) claimMini(s, top[id]);
}

/** How the career is played: fast break or sim mode on from the start (round 25). */
export interface PlayModes {
  fast?: boolean;
  sim?: boolean;
  /** round 37: called with the career at every season's summary (diagnostics) */
  peek?: (s: GameState) => void;
}

export function runCareer(seed: number, policy: Policy, mode: Mode = 'standard', minis: MiniPlay = 'none', play: PlayModes = {}, force?: { pos: Pos; archetype: number }): CareerResult {
  const r = makeRng(seed ^ 0x9e3779b9);
  const s = newGame(seed, { ...randomInput(r, policy, force), ...simIdentity(seed), mode });
  // the harness simulates every postseason (the playable replay would only slow it down)
  s.flags.simPostseason = 1;
  if (play.fast || play.sim) s.flags.fast = 1;
  if (play.sim) s.flags.sim = 1;
  const snapshots: CareerResult['snapshots'] = [];
  let steps = 0;
  let lastSnapYear = -1;
  const ages: CareerResult['ages'] = [];
  let starsAt = 0;
  while (steps < 5000) {
    const pr = prompt(s);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') {
      const id = policy === 'smart' ? smartChoice(s, pr.decision, r) : randomChoice(pr.decision, r);
      choose(s, id);
    } else {
      if (s.step === 'summary' && ages[ages.length - 1]?.age !== s.player.age) ages.push({ age: s.player.age, ovr: ovrOf(s.player.attrs, s.player.pos), wear: s.player.wear });
      if (s.step === 'summary' && play.peek) play.peek(s);
      if (s.step === 'summary' && s.stage === 'HS' && s.hsYear === 4) starsAt = s.stars;
      if (s.step === 'summary' && s.nbaSnapshot && s.year !== lastSnapYear && s.nba) {
        snapshots.push({ ...s.nbaSnapshot });
        lastSnapYear = s.year;
      }
      advance(s);
    }
    // fast break plays like the app does: it runs on to the next real choice
    if (s.flags.fast) fastForward(s);
    if (s.mode === 'lab') labSpend(s, policy, r);
    if (s.step === 'offseason') {
      playMinis(s, minis);
      // the smart player sets the team style that suits him best once he starts
      if (policy === 'smart' && canSetStyle(s)) {
        const best = (Object.keys(TEAM_STYLES) as TeamStyle[]).map((k) => ({ k, e: styleEffect(s, k) })).sort((a, b) => b.e.regular + b.e.playoff - (a.e.regular + a.e.playoff))[0];
        setStyle(s, best.k);
      }
    }
    steps++;
  }
  const nbaRows = s.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);
  return {
    playedNba: s.nbaGames > 0,
    nbaSeasons: nbaRows.length,
    allStar: count(s, 'ALLSTAR') > 0,
    allNba: count(s, 'ALLNBA1') + count(s, 'ALLNBA2') + count(s, 'ALLNBA3') > 0,
    allNba1: count(s, 'ALLNBA1') > 0,
    mvp: count(s, 'MVP') > 0,
    title: count(s, 'TITLE') + count(s, 'TITLEKEY') > 0,
    hof: legacyScore(s) >= LEGACY.hof,
    declared: s.log.some((l) => l.kind === 'draft' && /Declared|Entered|Stayed/.test(l.text)) || s.draftedBy !== null || s.undrafted,
    undrafted: s.undrafted,
    drafted: s.draftedBy !== null,
    retireAge: s.retiredAt ?? s.player.age,
    proCareer: s.history.some((h) => h.level === 'NBA' || h.level === 'GL' || h.level === 'EU' || h.level === 'INT'),
    verdict: s.verdict ?? '?',
    legacy: legacyScore(s),
    index: careerIndex(s),
    nickname: s.player.nickname?.id ?? null,
    achievements: earnedNow(s, NO_TOTALS),
    money: {
      hired: s.log.filter((x) => x.kind === 'staff' && x.text.startsWith('Hired')).length,
      staffPaid: (s.player.staff ?? []).reduce((a, m) => a + m.paid, 0),
      fines: s.log.filter((x) => x.kind === 'fine').length,
      finedFor: s.log.filter((x) => x.kind === 'fine').reduce((a, x) => a + Number(/\$([0-9.]+)K/.exec(x.text)?.[1] ?? 0) / 1000, 0),
      legacy: s.player.legacyBonus ?? 0,
      pressers: new Set(s.log.filter((x) => x.kind === 'press').map((x) => x.year)).size,
      seasons: s.history.length,
      rival: s.rivalry ? `${s.rivalry.level}${s.rivalry.ended ? ' (ended)' : ''}` : null,
      h2h: [s.rivalry?.w ?? 0, s.rivalry?.l ?? 0],
      news: (s.news ?? []).map((n) => n.kind),
    },
    brand: s.player.brand ? { kind: s.player.brand.kind, earned: s.player.brand.earned, shoe: s.player.brand.shoe } : null,
    peakOvr: s.player.peakOvr,
    potential: s.player.potential,
    startOvr: ovrOf(s.player.startAttrs, s.player.pos),
    snapshots,
    nbaLines: nbaRows.map((h) => ({ ovr: (h.ovrStart + h.ovrEnd) / 2, mpg: h.line.min / h.line.gp, ppg: h.line.pts / h.line.gp, role: h.role, value: valuePerGame(h.line), rpg: h.line.reb / h.line.gp, apg: h.line.ast / h.line.gp, ts: trueShooting(h.line) })),
    steps,
    paths: [...new Set(s.history.map((h) => h.level))],
    ages,
    titles: s.awards.filter((a) => a.key === 'TITLE' || a.key === 'TITLEKEY').map((a) => { const h = s.history.find((x) => x.year === a.year && x.level === 'NBA'); return { age: h?.age ?? 0, key: a.key === 'TITLEKEY', role: h?.role ?? '?', rank: 0 }; }),
    leap: s.log.some((l) => l.kind === 'leap'),
    tragedy: s.log.some((l) => l.kind === 'tragedy'),
    nextStep: s.log.some((l) => l.kind === 'nextStep'), // round 36
    ending: endingOf(s),
    anomaly: s.player.anomaly ?? '',
    country: s.player.country,
    stars: starsAt,
  };
}

export interface Summary {
  n: number;
  meanPeak: number;
  playedNba: number;
  nba5: number;
  allStar: number;
  allNba: number;
  allNba1: number;
  mvp: number;
  title: number;
  hof: number;
  undraftedOfDeclared: number;
  meanNbaSeasons: number;
  medianRetireAge: number;
  league: { leader: number; over25: number; best: number; worst: number };
  verdicts: Record<string, number>;
  ms: number;
  ovrBands: { band: string; n: number; mpg: number; ppg: number }[];
}

export function summarize(results: CareerResult[], ms: number): Summary {
  const n = results.length;
  const frac = (f: (c: CareerResult) => boolean) => results.filter(f).length / n;
  const declared = results.filter((c) => c.declared);
  const made = results.filter((c) => c.nbaSeasons > 0);
  const pro = results.filter((c) => c.proCareer).map((c) => c.retireAge).sort((a, b) => a - b);
  const snaps = results.flatMap((c) => c.snapshots);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const verdicts: Record<string, number> = {};
  for (const c of results) verdicts[c.verdict] = (verdicts[c.verdict] ?? 0) + 1;
  const lines = results.flatMap((c) => c.nbaLines);
  const bands = [
    [0, 69],
    [69, 71],
    [71, 74],
    [74, 78],
    [78, 82],
    [82, 86],
    [86, 99],
  ];
  return {
    n,
    meanPeak: avg(results.map((c) => c.peakOvr)),
    playedNba: frac((c) => c.playedNba),
    nba5: frac((c) => c.nbaSeasons >= 5),
    allStar: frac((c) => c.allStar),
    allNba: frac((c) => c.allNba),
    allNba1: frac((c) => c.allNba1),
    mvp: frac((c) => c.mvp),
    title: frac((c) => c.title),
    hof: frac((c) => c.hof),
    undraftedOfDeclared: declared.length ? declared.filter((c) => c.undrafted).length / declared.length : 0,
    meanNbaSeasons: avg(made.map((c) => c.nbaSeasons)),
    medianRetireAge: pro.length ? pro[Math.floor(pro.length / 2)] : 0,
    league: {
      leader: avg(snaps.map((x) => x.leader)),
      over25: avg(snaps.map((x) => x.over25)),
      best: avg(snaps.map((x) => x.best)),
      worst: avg(snaps.map((x) => x.worst)),
    },
    verdicts,
    ms,
    ovrBands: bands.map(([a, b]) => {
      const sel = lines.filter((l) => l.ovr >= a && l.ovr < b);
      return { band: `${a}–${b}`, n: sel.length, mpg: avg(sel.map((l) => l.mpg)), ppg: avg(sel.map((l) => l.ppg)) };
    }),
  };
}

// §15 targets, revised after playtest round 6 (Oct 2026): the average career (between the two
// play styles) peaks in the low 70s with a wide spread; starting OVR is Laplace around 40;
// a hidden growth rate lets some players surge. These are the Standard mode's targets; the
// other modes are checked by tests/modes.test.ts.
// round 12: the top end of Regular guy is harder to reach (narrower potential and the elite
// climb), so the star outcomes sit lower: about half as many MVPs and a third fewer Hall of Famers.
// round 14: Regular guy is tuned with casual mini-game play as the standard (one claim a season),
// so these no-mini-game targets sit lower: measured 71.6 smart / 67.2 random mean peak, titles
// 23.6% / 9.6%, All-Star 24.4% / 19.6% (250 careers each).
// round 15: new OVR weights, unlock-gated mini-games and a much harder Hall of Fame. No mini-games,
// smart / random: mean peak 74.5 / 70.6, NBA 80.0% / 71.3%, All-Star 36.5% / 31.0%, MVP 9.8% / 5.7%,
// titles 31.0% / 17.3%, Hall of Fame 11.3% / 6.3% (400 / 300 careers).
export const TARGETS: Record<Policy, Record<string, [number, number]>> = {
  random: {
    meanPeak: [68, 73],
    playedNba: [0.62, 0.78],
    nba5: [0.42, 0.57],
    allStar: [0.24, 0.38],
    allNba: [0.15, 0.29],
    allNba1: [0.07, 0.2],
    mvp: [0.03, 0.09],
    title: [0.12, 0.22],
    hof: [0.03, 0.1],
    // round 7: the wider spread sends more weak college seniors into the draft pool
    undraftedOfDeclared: [0.28, 0.45],
    meanNbaSeasons: [9, 12],
    medianRetireAge: [31, 36],
  },
  smart: {
    meanPeak: [72, 77],
    playedNba: [0.72, 0.86],
    nba5: [0.55, 0.7],
    allStar: [0.3, 0.43],
    allNba: [0.18, 0.31],
    allNba1: [0.11, 0.25],
    mvp: [0.06, 0.14],
    title: [0.25, 0.38],
    hof: [0.07, 0.16],
    undraftedOfDeclared: [0.18, 0.4], // round 28: the easier ceiling gets more of them drafted (17.5% measured)
    meanNbaSeasons: [11, 14],
    medianRetireAge: [32, 36],
  },
};

export const LEAGUE_TARGETS: Record<string, [number, number]> = {
  leader: [30, 35],
  over25: [8, 15],
  best: [58, 67],
  worst: [15, 25],
};

export function runMany(n: number, policy: Policy, seed: number): Summary {
  const t0 = Date.now();
  const res: CareerResult[] = [];
  for (let i = 0; i < n; i++) res.push(runCareer(seed * 100003 + i, policy));
  return summarize(res, Date.now() - t0);
}

export { ovrOf };
