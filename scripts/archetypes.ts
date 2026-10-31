// Difficulty by position and archetype (round 28, owner: "regular guy is too difficult (analyze based
// on position, archetype)"): N careers of each archetype at one position, smart and random choices,
// casual mini-game play. One JSON line per (archetype, policy). Run the five positions side by side:
//   for p in PG SG SF PF C; do npx tsx scripts/archetypes.ts $p 60 > out/$p.jsonl & done
import { runCareer } from './harness';
import { ARCHETYPES } from '../src/engine/player/archetypes';
import type { Pos } from '../src/engine/types';
const pos = process.argv[2] as Pos;
const N = Number(process.argv[3] ?? 60);
const mode = (process.argv[4] ?? 'standard') as 'standard';
for (const policy of ['smart', 'random'] as const) {
  ARCHETYPES[pos].forEach((a, archetype) => {
    const rs = Array.from({ length: N }, (_, i) => runCareer(91000 + i * 7 + archetype * 1009, policy, mode, 'casual', {}, { pos, archetype }));
    const m = (f: (r: (typeof rs)[number]) => number) => rs.reduce((x, r) => x + f(r), 0) / rs.length;
    console.log(JSON.stringify({ pos, archetype, name: a.name, policy, n: N, peak: m((r) => r.peakOvr), nba: m((r) => +r.playedNba), nba5: m((r) => +(r.nbaSeasons >= 5)), allStar: m((r) => +r.allStar), mvp: m((r) => +r.mvp), hof: m((r) => +r.hof), title: m((r) => +r.title), start: m((r) => r.startOvr), pot: m((r) => r.potential) }));
  });
}
