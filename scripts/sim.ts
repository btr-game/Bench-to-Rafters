// Balance harness: npm run sim -- --careers 2000 --policy smart --seed 1
// Use --policy both to run random and smart back to back.

import { Worker } from 'node:worker_threads';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { LEAGUE_TARGETS, summarize, TARGETS, type CareerResult, type Policy, type Summary } from './harness';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const careers = Number(arg('careers', '2000'));
const seed = Number(arg('seed', '1'));
const policyArg = arg('policy', 'both');
const policies: Policy[] = policyArg === 'both' ? ['random', 'smart'] : [policyArg as Policy];

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const LABELS: Record<string, string> = {
  playedNba: 'Played at least 1 NBA game',
  nba5: '5+ NBA seasons',
  allStar: 'At least 1 All-Star',
  allNba: 'At least 1 All-NBA',
  mvp: 'At least 1 MVP',
  title: 'At least 1 NBA title',
  hof: 'Hall of Fame',
  undraftedOfDeclared: 'Undrafted (of those who declared)',
  meanNbaSeasons: 'Mean NBA seasons (of those who made it)',
  medianRetireAge: 'Median retirement age (pro careers)',
};

function fmt(key: string, v: number): string {
  return key === 'meanNbaSeasons' || key === 'medianRetireAge' ? v.toFixed(2) : pct(v);
}
function fmtRange(key: string, r: [number, number]): string {
  return key === 'meanNbaSeasons' || key === 'medianRetireAge' ? `${r[0]}–${r[1]}` : `${pct(r[0])}–${pct(r[1])}`;
}
const mark = (v: number, [a, b]: [number, number]) => (v >= a - 1e-9 && v <= b + 1e-9 ? 'OK ' : 'off');

function print(policy: Policy, s: Summary): void {
  console.log(`\n=== policy: ${policy} · ${s.n} careers · seed ${seed} · ${threads} threads · ${(s.ms / 1000).toFixed(1)} s ===`);
  console.log(`${'Outcome'.padEnd(42)} ${'Result'.padStart(8)}  ${'Target'.padStart(14)}  `);
  for (const [k, r] of Object.entries(TARGETS[policy])) {
    const v = (s as unknown as Record<string, number>)[k];
    console.log(`${LABELS[k].padEnd(42)} ${fmt(k, v).padStart(8)}  ${fmtRange(k, r).padStart(14)}  ${mark(v, r)}`);
  }
  console.log('\nLeague calibration (per NBA season, averaged)');
  for (const [k, r] of Object.entries(LEAGUE_TARGETS)) {
    const v = (s.league as Record<string, number>)[k];
    console.log(`  ${k.padEnd(10)} ${v.toFixed(2).padStart(8)}  target ${r[0]}–${r[1]}  ${mark(v, r)}`);
  }
  console.log('\nUser NBA seasons by OVR band');
  for (const b of s.ovrBands) console.log(`  OVR ${b.band.padEnd(7)} n=${String(b.n).padStart(5)}  ${b.mpg.toFixed(1).padStart(5)} MPG  ${b.ppg.toFixed(1).padStart(5)} PPG`);
  console.log('\nVerdicts');
  for (const [k, v] of Object.entries(s.verdicts).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(28)} ${pct(v / s.n).padStart(7)}`);
}

const threads = Math.max(1, Math.min(Number(arg('threads', String(availableParallelism()))), 16));

// Workers run a bundled copy of the engine, so they do not need a TypeScript loader.
const workerFile = join(tmpdir(), `btr-sim-worker-${process.pid}.mjs`);
await build({
  entryPoints: [fileURLToPath(new URL('./simWorker.ts', import.meta.url))],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: workerFile,
  logLevel: 'warning',
});

/** Runs careers across worker threads; seeds match runMany() so results are identical to a single thread. */
async function runParallel(n: number, policy: Policy): Promise<Summary> {
  const t0 = Date.now();
  const seeds = Array.from({ length: n }, (_, i) => seed * 100003 + i);
  const chunks: number[][] = Array.from({ length: threads }, () => []);
  seeds.forEach((sd, i) => chunks[i % threads].push(sd));
  const parts = await Promise.all(
    chunks
      .filter((c) => c.length > 0)
      .map(
        (c) =>
          new Promise<CareerResult[]>((resolve, reject) => {
            const w = new Worker(workerFile, { workerData: { seeds: c, policy } });
            w.once('message', resolve);
            w.once('error', reject);
          }),
      ),
  );
  return summarize(parts.flat(), Date.now() - t0);
}

for (const p of policies) print(p, await runParallel(careers, p));
