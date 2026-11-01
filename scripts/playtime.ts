// Playtime model (round 30, owner: Comet "should have an estimate playtime of 5~10 minutes, more
// towards the 5 minute bound"). Plays careers the way the game does (each move, then fast break
// runs on to the next stop), counts what reaches the screen, and prices each in seconds:
//   creating the player                         75 s
//   a decision: team offers 12 s, the draft 8 s, a brand deal 6 s, retiring 6 s, anything else 8 s
//   a stop between seasons                       8 s
//   a story page (read, Continue)                6 s
//   a list on Home (sim's calls, highlights)     4 s
//   the end of the career and the thank-you    30 s
// Usage: npx tsx scripts/playtime.ts [careers] [comet|sim]
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward, setSim } from './../src/engine/fast';
import { smartChoice } from './harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';

const PRICE = { create: 75, offers: 12, declare: 8, withdraw: 8, brand: 6, retirePrompt: 6, decision: 8, offseason: 8, page: 6, list: 4, end: 30 };

interface Playtime {
  seconds: number;
  stops: Record<string, number>;
  pages: number;
  lists: number;
  seasons: number;
  peak: number;
}

/** One career, priced. `kind`: a Comet, or Shoot for the stars with sim mode switched on. */
export function playtime(seed: number, kind: 'comet' | 'sim'): Playtime {
  const s: GameState = newGame(seed, { name: `Comet ${seed}`, number: 7, pos: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[seed % 5], archetype: seed % 5, focus: ['SHT', 'ATH'], hometown: 'Tulsa', highSchool: 'Central High', mode: 'stars', comet: kind === 'comet' });
  if (kind === 'sim') setSim(s, true);
  else fastForward(s);
  const r = makeRng(seed);
  const stops: Record<string, number> = {};
  let seconds = PRICE.create + PRICE.end;
  let pages = 0;
  let lists = 0;
  for (let i = 0; i < 3000; i++) {
    // what this stop shows: the story pages, then the lists, then the decision or the next step
    pages += s.moments.length;
    if (s.simCalls?.length || s.reel?.length) lists++;
    s.moments = [];
    const p = prompt(s);
    if (p.type === 'retired') break;
    const k = p.type === 'decision' ? p.decision.kind : 'offseason';
    stops[k] = (stops[k] ?? 0) + 1;
    seconds += (PRICE as Record<string, number>)[k] ?? PRICE.decision;
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
    fastForward(s);
  }
  seconds += pages * PRICE.page + lists * PRICE.list;
  return { seconds, stops, pages, lists, seasons: s.history.length, peak: s.player.peakOvr };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[2] ?? 200);
  const kind = (process.argv[3] ?? 'comet') as 'comet' | 'sim';
  const all = Array.from({ length: n }, (_, i) => playtime(7000 + i, kind));
  const mean = (f: (x: Playtime) => number) => all.reduce((t, x) => t + f(x), 0) / n;
  const mins = all.map((x) => x.seconds / 60).sort((a, b) => a - b);
  const sd = Math.sqrt(mean((x) => (x.seconds / 60 - mean((y) => y.seconds / 60)) ** 2));
  const stops: Record<string, number> = {};
  for (const x of all) for (const [k, v] of Object.entries(x.stops)) stops[k] = (stops[k] ?? 0) + v / n;
  console.log(`${kind}, ${n} careers: mean ${mean((x) => x.seconds / 60).toFixed(4)} min (SD ${sd.toFixed(4)}), median ${mins[Math.floor(n / 2)].toFixed(4)}, 10th-90th ${mins[Math.floor(n * 0.1)].toFixed(4)}-${mins[Math.floor(n * 0.9)].toFixed(4)}`);
  console.log(`  pages ${mean((x) => x.pages).toFixed(2)}, lists ${mean((x) => x.lists).toFixed(2)}, seasons ${mean((x) => x.seasons).toFixed(2)}, mean peak ${mean((x) => x.peak).toFixed(4)}`);
  console.log('  stops: ' + Object.entries(stops).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', '));
}
