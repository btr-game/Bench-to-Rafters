// The dev deck summary's Floor chapter (end of the round that brought game plans, signatures, faces,
// sixth men, gimmicks, courts and friend play), written from the game's own modules so every number
// is the code's: `npx vite-node scripts/summaryFloor.ts` prints the chapter's blocks as JSON, and the
// counts the summary quotes elsewhere (achievements, cards, Catalog lists).

import fs from 'node:fs';
import path from 'node:path';
import { FLOOR } from '../src/engine/balance';
import { ACHIEVEMENTS, ACH_TIERS } from '../src/engine/achievements';
import { ALL_LEGENDS, fitPlan, legendFive } from '../src/engine/floor/legends';
import { ERAS, fansOf } from '../src/engine/floor/gimmicks';
import { SHAPES } from '../src/engine/floor/court';
import type { FloorPlay, FloorShape } from '../src/engine/floor/sim';
import { FRANCHISE_FACE, FRANCHISE_SIXTH } from '../src/content/franchiseFives';
import { LEGEND_TRAITS, legendTrait } from '../src/content/legendTraits';
import { LEGEND_PAIRS } from '../src/content/legendPairs';
import { NBA_TEAMS } from '../src/content/teams';
import { BESTS, PICK_SECONDS, SNAKE } from '../src/engine/floor/friend';

const ROOT = path.resolve(__dirname, '..');
type Block = { t: 'h2' | 'p'; text: string } | { t: 'ul'; items: [string, string][] } | { t: 'table'; head: string[]; rows: string[][] };

const SHAPE: Record<FloorShape, string> = { standard: 'Standard', fiveOut: 'Five out', fourOutOneIn: 'Four out, one in', twinTowers: 'Twin towers', horns: 'Horns' };
const STYLE: Record<FloorPlay, string> = { balanced: 'Balanced', runGun: 'Run and gun', motion: 'Ball movement', iso: 'Isolation', grind: 'Grit and grind', space: 'Pace and space' };
const SPOT: Record<string, string> = { top: 'top', leftWing: 'left wing', rightWing: 'right wing', leftCorner: 'left corner', rightCorner: 'right corner', leftElbow: 'left elbow', rightElbow: 'right elbow', highPost: 'high post', leftBlock: 'left block', rightBlock: 'right block' };
const real = (game: number, rate: number) => (game / (FLOOR.tick * FLOOR.ticksPerSec) / rate / 60).toFixed(4);
const pts = (x: number) => `${x >= 0 ? '+' : '−'}${(Math.abs(x) * 100).toFixed(1)}`;

const sigs = ALL_LEGENDS.filter((x) => legendTrait(x.spot.name));
const sixthNames = new Set(Object.values(FRANCHISE_SIXTH).map((l) => l.name));
const top = sigs.filter((x) => x.spot.ovr >= 95).sort((a, b) => b.spot.ovr - a.spot.ovr);
const mid = sigs.filter((x) => x.spot.ovr < 95 && !sixthNames.has(x.spot.name)).sort((a, b) => b.spot.ovr - a.spot.ovr);
const six = sigs.filter((x) => sixthNames.has(x.spot.name)).sort((a, b) => b.spot.ovr - a.spot.ovr);
const sigRow = (x: (typeof sigs)[number]) => [x.spot.name, x.team, String(x.spot.ovr), LEGEND_TRAITS[x.spot.name].name];

const G = FLOOR.gimmick;
const blocks: Block[] = [
  { t: 'p', text: 'Round 42 (owner: “let’s take it out of minigames and develop it into a larger one”) and the batches after it: the Floor is a game of its own, five on five, one player steered, with every franchise’s all-time five and its sixth man, from the arena on the main land and from a career’s mini-games. The engine is src/engine/floor/ (sim.ts the game, legends.ts the legends, game.ts the setups and the bracket, gimmicks.ts the gimmicks, friend.ts the draft and the series); the screens src/ui/floor/. A career’s own Floor (the last six minutes of an elimination game) is in the next chapter.' },
  { t: 'h2', text: 'Ways to play' },
  {
    t: 'table',
    head: ['Mode', 'What he picks', 'Length', 'Real minutes'],
    rows: [
      ['Quick game', 'the two teams and who he steers; each side plays its franchise’s best fit at its own level, in a random era on a random court', `the fourth quarter from a close score, clock ×${FLOOR.rate}`, real(FLOOR.quarter, FLOOR.rate)],
      ['Playoffs', 'his franchise, who he steers, a game plan, the court, the era, his overall and every opponent’s', `one quarter from 0-0 a round, clock ×${FLOOR.ratePlayoff}`, real(FLOOR.quarter, FLOOR.ratePlayoff)],
      ['Draft your five', `any five of all ${ALL_LEGENDS.length} legends (no positions), a game plan, the court, the era, each side’s overall`, `the fourth quarter, clock ×${FLOOR.rate}`, real(FLOOR.quarter, FLOOR.rate)],
      ['Your player (a career’s mini-games only)', 'the opponent and a game plan; his own player on his NBA team’s roster, or on a team at his level', `the fourth quarter, clock ×${FLOOR.rate}`, real(FLOOR.quarter, FLOOR.rate)],
      ['Online', 'franchises or a superteam draft, each his own game plan, best of 1, 3 or 5', `the fourth quarter, clock ×${FLOOR.rate}`, real(FLOOR.quarter, FLOOR.rate)],
    ],
  },
  { t: 'p', text: `Real minutes are the clock alone (12:00 of game time at ${FLOOR.ticksPerSec} ticks of ${FLOOR.tick} game seconds a real second, times the rate); stoppages add to them. The playoffs: sixteen franchises, eight from each conference, seeded by their fives, four wins to the title; the bracket shows the East from the left and the West from the right with the Finals between; the games he is not in are played by the engine at the same length. Nothing is saved between visits.` },
  { t: 'h2', text: 'Game plans' },
  { t: 'p', text: 'Owner: “let’s let the player choose team archetype (5 out, 1 big, ...), team style (run and gun, ball movement, ...), and where each player sits on offense”. A plan is a shape, a style and any of the five moved to any of ten spots (taking a held spot swaps the two); the AI teammates play it, the man he steers goes where he likes. Kept on the device. The computer’s side always plays its franchise’s best fit; picking a franchise sets his plan to its fit, changed from there.' },
  { t: 'table', head: ['Shape', 'PG', 'SG', 'SF', 'PF', 'C'], rows: (Object.keys(SHAPES) as FloorShape[]).map((k) => [SHAPE[k], ...(['PG', 'SG', 'SF', 'PF', 'C'] as const).map((p) => SPOT[SHAPES[k][p]])]) },
  {
    t: 'table',
    head: ['Style', 'Shots', 'Threes', 'Drives', 'Post-ups', 'Passes', 'Patience', 'Isolations', 'Fast breaks', 'Contests'],
    rows: (Object.keys(STYLE) as FloorPlay[]).map((k) => {
      const m = FLOOR.play[k];
      return [STYLE[k], ...[m.use, m.three, m.drive, m.post, m.pass, m.patience, m.iso, m.brk, m.contest].map((x) => `×${x}`)];
    }),
  },
  { t: 'p', text: 'Best fit (fitPlan): the shape from the five’s two bigs (a creating centre plays horns, a shooting centre five out, a stretch four four out one in, two post bigs twin towers, else standard); the style from the franchise’s culture where it is famous (the Lakers and Suns run, the Spurs and Nuggets move the ball, the Grizzlies, Pistons, Knicks and Heat grind, the Warriors and Rockets space, the Bulls and 76ers isolate), else from the five (two creators: ball movement; a 97 with two scorers: isolation; athletic: run and gun; shooters: pace and space; two defenders: grit and grind).' },
  {
    t: 'table',
    head: ['Franchise', 'Shape', 'Style'],
    rows: NBA_TEAMS.map((t) => {
      const p = fitPlan(t.abbr);
      return [`${t.city} ${t.nick}`, SHAPE[p.shape], STYLE[p.style]];
    }),
  },
  { t: 'h2', text: 'The legends' },
  {
    t: 'ul',
    items: [
      ['From real numbers: ', 'each legend’s ratings come from his career regular-season averages (content/legendStats.ts), and how the AI plays him (shot share, threes, the post, passing) from the same line; the list’s 80 to 99 is played as 75 to 89.25.'],
      ['Sixth men: ', `one for each of the ${Object.keys(FRANCHISE_SIXTH).length} franchises (FRANCHISE_SIXTH), first off the bench in place of the first made-up bench man; a real sixth man where the team had a famous one, a great missing from the five otherwise. Victor Wembanyama (93) for the Spurs; Cooper Flagg (90, an estimate from one season) for the Mavericks. The draft’s pool is ${ALL_LEGENDS.length}.`],
      ['Franchise faces: ', `one a franchise (FRANCHISE_FACE): every skill but legs and free throws +${FLOOR.face.rest} for a face under 95, +${FLOOR.face.star} for one at 95 or more, so Isiah Thomas, Reggie Miller or Allen Iverson gain more than Jordan or Curry. Marked “Face of the franchise”.`],
      ['Jokic: ', `on top of the face’s buff, playmaking, IQ and rebounding set to ${FLOOR.jokic.PLY}, finishing +${FLOOR.jokic.FIN}, shooting +${FLOOR.jokic.SHT}, interior +${FLOOR.jokic.INT}; he looks for his own shot ×${FLOOR.jokic.use} and posts up ×${FLOOR.jokic.post} (owner: “developer bias. he’s my favorite player”). Measured over 80 full games: 1.9375 to 10.2000 points a game, Denver winning 35.0000% to 42.5000%.`],
      ['Stamina: ', `sprint ${FLOOR.stamina.sprint}, move ${FLOOR.stamina.move} a tick, rest +${FLOOR.stamina.rest}, a timeout +${FLOOR.stamina.timeout} (owner: “increase stamina of all players more”).`],
    ],
  },
  { t: 'table', head: ['Franchise', 'Face', 'Sixth man', 'Sixth man’s overall'], rows: NBA_TEAMS.map((t) => [t.abbr, FRANCHISE_FACE[t.abbr], FRANCHISE_SIXTH[t.abbr].name, String(FRANCHISE_SIXTH[t.abbr].ovr)]) },
  { t: 'h2', text: 'Signatures' },
  { t: 'p', text: `Every legend rated 90 or more has a signature (content/legendTraits.ts; what each does in ui/floor/traits.ts, its numbers in FLOOR.sig and FLOOR.sig90): ${sigs.length} in all. The ${top.length} rated 95 or more each have a move nobody else has, the bigger edge (owner: “95+ should have a bit of dominance”); the ${mid.length} rated 90 to 94 and the ${six.length} sixth men at 90 or more each have a smaller move of their own, in place of the shared kinds they first had. It travels on the player, so it holds in every mode, online included, for the AI as for him. Shown on his card, spelled out for the man he steers, and beside his name under the court.` },
  { t: 'table', head: ['Legend, 95 and up', 'Team', 'Overall', 'Signature'], rows: top.map(sigRow) },
  { t: 'table', head: ['Legend, 90 to 94', 'Team', 'Overall', 'Signature'], rows: mid.map(sigRow) },
  { t: 'table', head: ['Sixth man, 90 and up', 'Team', 'Overall', 'Signature'], rows: six.map(sigRow) },
  { t: 'h2', text: 'Gimmicks' },
  {
    t: 'ul',
    items: [
      ['On fire: ', `${G.fireMakes} makes in a row; his shots ${pts(G.fireShot)} points of a hundred, a pixel flame over him, until he misses ${G.fireMisses} or the other team scores ${G.fireStops} baskets in a row.`],
      ['Hot spots: ', `one or two spots from how he plays (a shooter’s corner and wing, a big man’s block and elbow); within ${G.spotReach} feet his shots ${pts(G.hotSpot)}.`],
      ['The crowd: ', `a home run of ${G.crowdRun} points or ${G.crowdScores} baskets in a row brings the home crowd to its feet for ${G.crowdSecs} game seconds, once a run, with its fans’ banner (FAN_CULTURES); the home team’s shots up to ${pts(G.crowdShot)} and its hands up to ×${G.crowdHands}, scaled from ${G.crowdMin} to 1 by how loud the fans are.`],
      ['Duos: ', `${LEGEND_PAIRS.length} famous pairs (content/legendPairs.ts); both on the court, a pass between them is picked off ×${G.pairPick} and a shot within ${G.pairSecs} seconds of a pass from the other ${pts(G.pair)}. A few meet only in a drafted five.`],
      ['Eras: ', `${ERAS.length}: modern; the nineties (contests inside ×${FLOOR.era.nineties.contest}, fouls on a shot ×${FLOOR.era.nineties.foul}, patience ×${FLOOR.era.nineties.patience}, fast breaks ×${FLOOR.era.nineties.brk}, threes tried ×${FLOOR.era.nineties.threeUse}); the sixties (no three-point line, patience ×${FLOOR.era.sixties.patience}, fast breaks ×${FLOOR.era.sixties.brk}, threes tried ×${FLOOR.era.sixties.threeUse}).`],
      ['None of them draws from the game’s random stream: ', 'each only moves a chance the engine already rolls, so a friend game stays the same on both screens.'],
    ],
  },
  {
    t: 'table',
    head: ['Home crowd', 'Fans', 'Share of the lift'],
    rows: NBA_TEAMS.map((t) => {
      const f = fansOf(t.abbr);
      return [t.abbr, f.name, `${(f.k * 100).toFixed(4)}%`];
    }),
  },
  { t: 'h2', text: 'Courts, big heads and the replay' },
  {
    t: 'ul',
    items: [
      ['Courts: ', 'the team arena, a street court, a beach court, a 1970s gym and a rooftop at night (ui/floor/view.ts COURTS): each its own floor, what stands behind it, the baskets’ pads and who sits courtside. Picked in the playoffs and the draft and kept on the device; random for a quick game.'],
      ['Big heads: ', 'NBA Jam’s big-head mode, every head twice the size; B or the pause menu switches it, kept on the device.'],
      ['The buzzer-beater replay: ', 'a shot that beats the horn, or a go-ahead basket in the last three seconds that holds up, plays again at half speed once the game is over, the word REPLAY over it, before the final page (Enter, Space or Esc moves on).'],
    ],
  },
  { t: 'h2', text: 'Rules that keep it honest' },
  {
    t: 'ul',
    items: [
      ['Leaking out: ', `a player somebody steers who stays past half court while the other team attacks, for ${FLOOR.leak.secs} game seconds, leaves his team a man short (“Get back on defence”).`],
      ['Three seconds: ', `a steered player in the lane for more than ${FLOOR.lane.secs} game seconds while his team has the ball loses it.`],
      ['The meter: ', `fills in ${(FLOOR.meter.load / (FLOOR.tick * FLOOR.ticksPerSec)).toFixed(1)} real seconds; ${(FLOOR.meter.hold / (FLOOR.tick * FLOOR.ticksPerSec)).toFixed(0)} real seconds past full the shot goes by itself.`],
      ['Big men: ', 'inside, a bigger man shoots over a smaller one and a contest costs him less; real rebounders weigh more on the boards; the post is used a little more.'],
    ],
  },
  { t: 'h2', text: 'With a friend' },
  {
    t: 'ul',
    items: [
      ['The room: ', 'a six-letter code shared with a friend, or a quick match with whoever is waiting in the lobby (the website and itch.io; the dev deck joins two tabs).'],
      ['Superteam draft: ', `one pool of every legend, ${SNAKE.length} picks in a snake (${SNAKE.map((s) => (s ? 'F' : 'H')).join(' ')}), ${PICK_SECONDS} seconds a pick, the best man left taken when the clock runs out; the two fives play at their own levels.`],
      ['Game plans and series: ', `each sends his own plan; a series is best of ${BESTS.join(', ')}; the browser keeps the record against each friend.`],
      ['The line: ', 'friends by code play on a direct line between the two browsers (WebRTC), with the room’s line as the fallback; a quick match stays on the room’s line. Each screen plays its own keys at once and replays the few ticks since when the friend’s arrive.'],
    ],
  },
];

// the counts the rest of the summary quotes
const cards = (fs.readFileSync(path.join(ROOT, 'src/dev/cards.ts'), 'utf8').match(/^\s*\{ id: '/gm) ?? []).length;
const catalog = fs.readFileSync(path.join(ROOT, 'src/dev/Catalog.tsx'), 'utf8');
const lists = catalog.slice(catalog.indexOf('const CATEGORIES'), catalog.indexOf('const WHERE_NAME')).match(/^ {4}key: '/gm)?.length ?? 0;
const tiers = Object.fromEntries(ACH_TIERS.map((t) => [t.name, ACHIEVEMENTS.filter((a) => a.tier === t.key).length]));
console.log(JSON.stringify({ blocks, counts: { achievements: ACHIEVEMENTS.length, tiers, cardsLiteral: cards, lists, legends: ALL_LEGENDS.length, signatures: sigs.length, top: top.length, mid: mid.length, six: six.length, duos: LEGEND_PAIRS.length, faces: Object.keys(FRANCHISE_FACE).length, sixth: Object.keys(FRANCHISE_SIXTH).length, fives: NBA_TEAMS.map((t) => legendFive(t.abbr).length).reduce((a, b) => a + b, 0) } }));
