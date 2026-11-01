// The end-of-round balance check: careers played by the harness's smart player with casual
// mini-game play (one claim a season), the setup of the last approved numbers (round 22).
//   npx tsx scripts/balance31.ts <first seed> <careers> > part.json
import { runCareer } from './harness';
const first = Number(process.argv[2] ?? 1);
const n = Number(process.argv[3] ?? 100);
const out = [];
for (let i = 0; i < n; i++) {
  const c = runCareer(first + i, 'smart', 'standard', 'casual');
  out.push({ peak: c.peakOvr, nba: c.playedNba, allStar: c.allStar, mvp: c.mvp, hof: c.hof, title: c.title });
}
console.log(JSON.stringify(out));
