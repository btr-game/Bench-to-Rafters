// Playtime model (round 30, owner: Comet "should have an estimate playtime of 5~10 minutes, more
// towards the 5 minute bound"). Plays careers the way the game does (each move, then fast break
// runs on to the next stop), counts what reaches the screen, and prices each in seconds:
//   creating the player                         75 s
//   a decision: team offers 12 s, the draft 8 s, a brand deal 6 s, retiring 6 s, anything else 8 s
//   a stop between seasons                       8 s
//   a story page (read, Continue)                6 s
//   a list on Home (sim's calls, highlights)     4 s
//   the end of the career and the thank-you    30 s
//   the shop again after a purchase              4 s
// The road map's levels (round 33: beginner 5-10 minutes, intermediate about 10, advanced about 15)
// play the same way, fast break only where the level has it on.
// Usage: npx tsx scripts/playtime.ts [careers] [comet|sim|beginner|intermediate|advanced]
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward, setSim } from '../src/engine/fast';
import { smartChoice } from './harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { LEVEL_IDS, madeAllStar, type Level } from '../src/engine/levels';

const PRICE = { create: 75, again: 4, offers: 12, declare: 8, withdraw: 8, brand: 6, retirePrompt: 6, decision: 8, offseason: 8, page: 6, list: 4, end: 30 };

interface Playtime {
  seconds: number;
  stops: Record<string, number>;
  pages: number;
  lists: number;
  seasons: number;
  peak: number;
  star: boolean;
}

type Kind = 'comet' | 'sim' | Level;

/** One career, priced. `kind`: a Comet, Shoot for the stars with sim mode switched on, or a level. */
export function playtime(seed: number, kind: Kind): Playtime {
  const level = (LEVEL_IDS as string[]).includes(kind) ? (kind as Level) : undefined;
  const s: GameState = newGame(seed, { name: `Comet ${seed}`, number: 7, pos: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[seed % 5], archetype: seed % 5, focus: ['SHT', 'ATH'], hometown: 'Tulsa', highSchool: 'Central High', ...(level ? { level } : { mode: 'stars' as const, comet: kind === 'comet' }) });
  if (kind === 'sim') setSim(s, true);
  const ff = () => {
    if (!level || s.flags.fast) fastForward(s);
  };
  ff();
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
    const again = p.type === 'decision' && k === 'shop' && ((p.decision.data?.bought as number) ?? 0) > 0;
    seconds += again ? PRICE.again : ((PRICE as Record<string, number>)[k] ?? PRICE.decision);
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
    ff();
  }
  seconds += pages * PRICE.page + lists * PRICE.list;
  return { seconds, stops, pages, lists, seasons: s.history.length, peak: s.player.peakOvr, star: madeAllStar(s) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[2] ?? 200);
  const kind = (process.argv[3] ?? 'comet') as Kind;
  const all = Array.from({ length: n }, (_, i) => playtime(7000 + i, kind));
  const mean = (f: (x: Playtime) => number) => all.reduce((t, x) => t + f(x), 0) / n;
  const mins = all.map((x) => x.seconds / 60).sort((a, b) => a - b);
  const sd = Math.sqrt(mean((x) => (x.seconds / 60 - mean((y) => y.seconds / 60)) ** 2));
  const stops: Record<string, number> = {};
  for (const x of all) for (const [k, v] of Object.entries(x.stops)) stops[k] = (stops[k] ?? 0) + v / n;
  console.log(`${kind}, ${n} careers: mean ${mean((x) => x.seconds / 60).toFixed(4)} min (SD ${sd.toFixed(4)}), median ${mins[Math.floor(n / 2)].toFixed(4)}, 10th-90th ${mins[Math.floor(n * 0.1)].toFixed(4)}-${mins[Math.floor(n * 0.9)].toFixed(4)}`);
  console.log(`  pages ${mean((x) => x.pages).toFixed(2)}, lists ${mean((x) => x.lists).toFixed(2)}, seasons ${mean((x) => x.seasons).toFixed(2)}, mean peak ${mean((x) => x.peak).toFixed(4)}, NBA All-Star ${(100 * mean((x) => +x.star)).toFixed(4)}%`);
  console.log('  stops: ' + Object.entries(stops).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', '));
}
