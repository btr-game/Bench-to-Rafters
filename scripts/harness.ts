// Headless career runner used by `npm run sim` and the balance test.
// It drives the game only through flow.ts, exactly like the UI.

import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { labCost, spendCredits } from '../src/engine/career/lab';
import { ARCHETYPES } from '../src/engine/player/archetypes';
import { ATTRS, OVR_WEIGHTS, POSITIONS, type Mode } from '../src/engine/balance';
import { makeRng, next, pick, int, type Rng } from '../src/engine/rng';
import type { Choice, Decision, GameState, Pos } from '../src/engine/types';
import { count, legacyScore } from '../src/engine/awards/legacy';
import { ovrOf } from '../src/engine/player/ovr';
import { trueShooting, valuePerGame } from '../src/engine/sim/statModel';

export type Policy = 'random' | 'smart';

function randomInput(r: Rng, policy: Policy) {
  const pos: Pos = pick(r, POSITIONS);
  const archetype = int(r, 0, ARCHETYPES[pos].length - 1);
  const arch = ARCHETYPES[pos][archetype];
  let focus = [...ATTRS].sort(() => next(r) - 0.5).slice(0, 2);
  if (policy === 'smart') {
    // focus the two attributes that matter most for the position
    focus = [...ATTRS].sort((a, b) => OVR_WEIGHTS[pos][b] - OVR_WEIGHTS[pos][a]).slice(0, 2);
  }
  void arch;
  return { name: 'Sim Player', number: 7, pos, archetype, focus, hometown: 'Anytown', highSchool: 'Lincoln High' };
}

const enabled = (d: Decision): Choice[] => d.choices.filter((c) => !c.disabled);

function smartChoice(s: GameState, d: Decision, r: Rng): string {
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
    case 'assign':
      return 'go';
    case 'youth':
      return byId('promote') ?? byId('move') ?? ch[0].id;
    case 'live':
      return byId('all') ?? ch[0].id;
    case 'national':
      return s.player.age < 32 ? 'accept' : 'decline';
    case 'transfer':
      return 'enter';
    case 'retirePrompt':
      return s.player.age >= (Number(process.env.RETIRE_AGE) || 32) ? 'retire' : 'go';
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
  anomaly: string;
  country: string;
  stars: number;
}

export function runCareer(seed: number, policy: Policy, mode: Mode = 'standard'): CareerResult {
  const r = makeRng(seed ^ 0x9e3779b9);
  const s = newGame(seed, { ...randomInput(r, policy), mode });
  // the harness simulates every postseason (the playable replay would only slow it down)
  s.flags.simPostseason = 1;
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
    hof: legacyScore(s) >= 45,
    declared: s.log.some((l) => l.kind === 'draft' && /Declared|Entered|Stayed/.test(l.text)) || s.draftedBy !== null || s.undrafted,
    undrafted: s.undrafted,
    drafted: s.draftedBy !== null,
    retireAge: s.retiredAt ?? s.player.age,
    proCareer: s.history.some((h) => h.level === 'NBA' || h.level === 'GL' || h.level === 'EU' || h.level === 'INT'),
    verdict: s.verdict ?? '?',
    legacy: legacyScore(s),
    peakOvr: s.player.peakOvr,
    potential: s.player.potential,
    startOvr: ovrOf(s.player.startAttrs, s.player.pos),
    snapshots,
    nbaLines: nbaRows.map((h) => ({ ovr: (h.ovrStart + h.ovrEnd) / 2, mpg: h.line.min / h.line.gp, ppg: h.line.pts / h.line.gp, role: h.role, value: valuePerGame(h.line), rpg: h.line.reb / h.line.gp, apg: h.line.ast / h.line.gp, ts: trueShooting(h.line) })),
    steps,
    paths: [...new Set(s.history.map((h) => h.level))],
    ages,
    leap: s.log.some((l) => l.kind === 'leap'),
    tragedy: s.log.some((l) => l.kind === 'tragedy'),
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
export const TARGETS: Record<Policy, Record<string, [number, number]>> = {
  random: {
    meanPeak: [66, 71],
    playedNba: [0.56, 0.7],
    nba5: [0.42, 0.57],
    allStar: [0.27, 0.4],
    allNba: [0.21, 0.34],
    allNba1: [0.15, 0.27],
    mvp: [0.07, 0.15],
    title: [0.11, 0.19],
    hof: [0.17, 0.29],
    // round 7: the wider spread sends more weak college seniors into the draft pool
    undraftedOfDeclared: [0.28, 0.45],
    meanNbaSeasons: [9, 12],
    medianRetireAge: [31, 36],
  },
  smart: {
    meanPeak: [71.5, 76.5],
    playedNba: [0.65, 0.78],
    nba5: [0.55, 0.7],
    allStar: [0.33, 0.46],
    allNba: [0.26, 0.39],
    allNba1: [0.19, 0.31],
    mvp: [0.12, 0.21],
    title: [0.28, 0.4],
    hof: [0.24, 0.36],
    undraftedOfDeclared: [0.28, 0.45],
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
