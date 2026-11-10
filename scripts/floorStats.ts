// How the Floor's AI plays: N games with the AI on both sides, from the engine alone (round 42:
// the numbers the tuning is checked against).
//   npx vite-node scripts/floorStats.ts [games] [level] ['{"quarter":1}' setup extras]
import { startFloor, stepFloor, type FloorState } from '../src/engine/floor/sim';
import { floorRoster } from '../src/engine/floor/mini';
import { dist, toRim } from '../src/engine/floor/court';

const N = Number(process.argv[2] ?? 200);
const LEVEL = Number(process.argv[3] ?? 76);
const extra = (process.argv[4] ? JSON.parse(process.argv[4]) : {}) as Record<string, unknown>;
let half = 0, possHalf = 0;
let pts = 0, fga = 0, fgm = 0, tpa = 0, tpm = 0, fta = 0, tov = 0, poss = 0, drives = 0, possDrive = 0, beats = 0, ticks = 0, liveTicks = 0, ot = 0;
const zones: Record<string, [number, number]> = { rim: [0, 0], paint: [0, 0], mid: [0, 0], three: [0, 0] };
const margins: number[] = [];
for (let g = 0; g < N; g++) {
  const s: FloorState = startFloor({ seed: 1000 + g * 7919, mode: 'standard', us: { name: 'A', short: 'A', color: '#000', players: floorRoster('U', LEVEL, g * 3 + 1) }, them: { name: 'B', short: 'B', color: '#fff', players: floorRoster('T', LEVEL, g * 3 + 2) }, score: [0, 0], ...extra } as never);
  let lastPoss = s.poss, wasDrive = false, droveThis = false, halfThis = false;
  poss++;
  for (let i = 0; i < 400000 && s.phase !== 'over'; i++) {
    stepFloor(s, null);
    ticks++;
    if (s.phase === 'live') liveTicks++;
    if (s.poss !== lastPoss) { poss++; lastPoss = s.poss; if (droveThis) possDrive++; if (halfThis) possHalf++; droveThis = false; halfThis = false; }
    if (s.drive && !wasDrive) {
      drives++;
      droveThis = true;
      // a drive in the half court: from inside 32 feet with his man on him (not a walk up an empty floor)
      const h = s.ball.holder !== null ? s.players[s.ball.holder] : null;
      const d = h ? s.players.find((_, k) => s.guard[k] === s.ball.holder) : null;
      if (h && d && toRim(h.team, h) < 32 && dist(d, h) < 9) { half++; halfThis = true; }
    }
    wasDrive = s.drive;
    for (const e of s.feed.slice(s.fresh)) {
      if (e.kind === 'beat') beats++;
      if (e.kind === 'make' || e.kind === 'miss' || e.kind === 'block') { const z = e.zone ?? 'mid'; zones[z][0]++; if (e.kind === 'make') zones[z][1]++; }
    }
  }
  if (droveThis) possDrive++;
  if (halfThis) possHalf++;
  ot += s.periods;
  for (const p of s.players) { pts += p.box.pts; fga += p.box.fga; fgm += p.box.fgm; tpa += p.box.tpa; tpm += p.box.tpm; fta += p.box.fta; tov += p.box.tov; }
  margins.push(Math.abs(s.score[0] - s.score[1]));
}
const f = (x: number, d = 2) => x.toFixed(d);
console.log(`games ${N} level ${LEVEL} ${JSON.stringify(extra)}`);
console.log(`points per team per game ${f(pts / N / 2, 4)} | possessions per team ${f(poss / N / 2, 3)} | points per possession ${f(pts / poss, 4)}`);
console.log(`FG% ${f((100 * fgm) / fga, 3)} | 3P% ${f((100 * tpm) / tpa, 3)} | threes share of shots ${f((100 * tpa) / fga, 3)}% | FTA per team ${f(fta / N / 2, 3)} | TOV per team ${f(tov / N / 2, 3)}`);
console.log(`shots by zone: ` + Object.entries(zones).map(([k, [a, m]]) => `${k} ${f((100 * a) / fga, 2)}% (${f((100 * m) / Math.max(1, a), 1)}% made)`).join(' | '));
console.log(`drives per team per game ${f(drives / N / 2, 3)} (${f((100 * possDrive) / poss, 2)}% of possessions) | in the half court, his man on him: ${f(half / N / 2, 3)} (${f((100 * possHalf) / poss, 2)}% of possessions) | men beaten off the dribble per team ${f(beats / N / 2, 3)}`);
console.log(`real minutes per game ${f(ticks / N / 20 / 60, 3)} (clock running ${f(liveTicks / N / 20 / 60, 3)}) | overtimes ${ot} | mean final margin ${f(margins.reduce((a, b) => a + b, 0) / N, 3)}`);
