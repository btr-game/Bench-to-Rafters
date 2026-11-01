// The shop by income (round 31): over careers played by the harness's smart player, how many of
// the six things a visit offers he could pay for at once (cheapest first), by income band.
//   npx tsx scripts/shopcheck.ts [careers]
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from './harness';
import { makeRng } from '../src/engine/rng';
import { POSITIONS, type Mode } from '../src/engine/balance';
import { ARCHETYPES } from '../src/engine/player/archetypes';

const N = Number(process.argv[2] ?? 120);
const bands: [string, number, number][] = [
  ['no income', -1, 0.0001],
  ['under $1M', 0.0001, 1],
  ['$1M-$5M', 1, 5],
  ['$5M-$20M', 5, 20],
  ['$20M-$50M', 20, 50],
  ['$50M+', 50, 1e9],
];
const out: Record<string, { n: number; fit: number[]; all: number; buys: number[]; wear: number }> = {};
for (let i = 0; i < N; i++) {
  const mode: Mode = (['standard', 'reality', 'stars'] as Mode[])[i % 3];
  const pos = POSITIONS[i % 5];
  const s = newGame(31000 + i, { name: 'Shop Test', number: 7, pos, archetype: i % ARCHETYPES[pos].length, focus: ['SHT', 'ATH'], hometown: 'Reno', highSchool: 'Galena High', mode });
  s.flags.simPostseason = 1;
  const r = makeRng(31000 + i);
  let open: { band: string; bought: number } | null = null;
  for (let k = 0; k < 6000; k++) {
    s.moments = [];
    const p = prompt(s);
    if (p.type === 'retired') break;
    if (p.type === 'decision' && p.decision.kind === 'shop') {
      const d = p.decision;
      // accessories cost next to nothing: count the things that matter
      const prices = ((d.data?.prices as number[]) ?? []).filter((_, k) => d.choices[k]?.tags?.[0] !== 'Accessories');
      if (!open) {
        const inc = (s.contract?.salary ?? 0) + (s.player.brand?.perYear ?? 0);
        const band = bands.find(([, lo, hi]) => inc >= lo && inc < hi)![0];
        let left = s.player.bank;
        let fit = 0;
        for (const c of [...prices].sort((a, b) => a - b)) if (c <= left) (left -= c), fit++;
        const o = (out[band] ??= { n: 0, fit: [0, 0, 0, 0, 0, 0, 0], all: 0, buys: [], wear: 0 });
        if (prices.length < 6) o.wear++;
        o.n++;
        o.fit[fit]++;
        if (prices.reduce((a, b) => a + b, 0) <= s.player.bank) o.all++; // all of them (accessories aside)
        open = { band, bought: 0 };
      }
      const c = smartChoice(s, d, r);
      if (c === 'leave') {
        out[open.band].buys.push(open.bought);
        open = null;
      } else open.bought++;
      choose(s, c);
      if (!s.pending.some((x) => x.kind === 'shop') && open) {
        out[open.band].buys.push(open.bought);
        open = null;
      }
      continue;
    }
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
  }
}
for (const [b] of bands) {
  const o = out[b];
  if (!o) continue;
  const mean = o.fit.reduce((t, x, k) => t + x * k, 0) / o.n;
  const buys = o.buys.reduce((a, x) => a + x, 0) / Math.max(1, o.buys.length);
  console.log(`${b.padEnd(11)} visits ${String(o.n).padStart(4)} · fit at once: mean ${mean.toFixed(4)} · ${o.fit.map((x, k) => `${k}:${(x / o.n * 100).toFixed(1)}%`).join(' ')} · all six fit ${(o.all / o.n * 100).toFixed(1)}% · smart bought ${buys.toFixed(4)} · an accessory ${(o.wear / o.n * 100).toFixed(1)}%`);
}
