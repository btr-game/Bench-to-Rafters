// The community's house players (round 27, owner: "the community page is too blank now. fill the
// leaderboard and statue plaza with some dummies"). Real careers, played by the balance harness's
// smart player under made-up names, written to src/content/house.json: the boards show them
// (marked as house players) beside real careers, and the plaza holds a few in bronze.
//   npx tsx scripts/house.ts
import { writeFileSync } from 'fs';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from './harness';
import { makeRng } from '../src/engine/rng';
import { careerRecord, type CareerRecord } from '../src/engine/career/record';
import { ARCHETYPES } from '../src/engine/player/archetypes';
import { POSITIONS, type Mode } from '../src/engine/balance';
import { FIRST_NAMES, LAST_NAMES } from '../src/content/names';
import { scoreOf } from '../src/ui/community';

function career(seed: number, mode: Mode): CareerRecord | null {
  const k = (seed * 2654435761) >>> 0;
  const pos = POSITIONS[k % POSITIONS.length];
  const name = `${FIRST_NAMES[(k >>> 4) % FIRST_NAMES.length]} ${LAST_NAMES[(k >>> 12) % LAST_NAMES.length]}`;
  const s = newGame(seed, { name, number: (k >>> 20) % 100, pos, archetype: (k >>> 7) % ARCHETYPES[pos].length, focus: pos === 'C' || pos === 'PF' ? ['INT', 'REB'] : ['SHT', 'PLY'], hometown: 'Anytown', highSchool: 'Lincoln High', mode, fast: true } as never);
  s.flags.simPostseason = 1;
  const r = makeRng(seed ^ 0x5eed);
  for (let i = 0; i < 6000; i++) {
    const p = prompt(s);
    if (p.type === 'retired') break;
    s.moments = [];
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
  }
  if (s.step !== 'retired') return null;
  const rec = careerRecord(s);
  return { ...rec, id: `house-${mode}-${seed}`, savedAt: '2026-10-01T12:00:00.000Z' };
}

// round 27 (owner: "the dummies should have very low stats so that the users can quickly
// dominate"): short, small careers only. They are played on Reality hits hard, where most careers
// stall, and the weakest are kept: ten a board, six bronze statues.
const pool: CareerRecord[] = [];
const names = new Set<string>();
for (let seed = 7000; pool.length < 56 && seed < 9000; seed++) {
  const rec = career(seed, 'reality');
  if (!rec || names.has(rec.name) || rec.peak >= 70 || rec.titles > 0 || scoreOf(rec) < 0.5 || scoreOf(rec) > 25) continue;
  names.add(rec.name);
  pool.push(rec);
}
pool.sort((a, b) => scoreOf(a) - scoreOf(b) || a.peak - b.peak);
const out: CareerRecord[] = [];
// ten for each board (round 31: the Rough Road and Comet boards too, marked as those challenges)
const BOARDS: [string, Mode, Partial<CareerRecord>][] = [
  ['standard', 'standard', {}],
  ['reality', 'reality', {}],
  ['stars', 'stars', {}],
  ['rough', 'reality', { oath: true }],
  ['comet', 'stars', { comet: true }],
];
BOARDS.forEach(([board, mode, mark], k) => {
  for (const rec of pool.filter((_, i) => i % BOARDS.length === k).slice(0, 10)) out.push({ ...rec, mode, ...mark, id: `house-${board}-${rec.id.split('-').pop()}` });
});
for (const rec of pool.slice(50, 56)) out.push({ ...rec, mode: 'standard', id: `house-statue-${rec.id.split('-').pop()}` });
writeFileSync('src/content/house.json', JSON.stringify(out));
console.log(`${out.length} house careers; peaks and scores`, out.map((r) => `${Math.round(r.peak)}/${scoreOf(r).toFixed(1)}`).join(' '));
