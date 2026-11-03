// Round 36 (owner, round 32: "we might run out of them quickly. add more"). The round ended a
// career in the rafters (the finale: the empty arena, his speech, the jersey rising, the credits;
// ui/finale.ts) and gave the community a username apart from the player's name (ui/names.ts). So
// this batch is about the night the jersey goes up: whose rafters, what the speech says, how long
// the credits run, the finale watched (or skipped), and the username a career is posted under;
// with a few for the round's turning points and shop things. The career marks were measured over
// 150 Regular guy careers of the smart player (casual mini-games) before they were set: 17.33333%
// had a jersey hung, 2.000000% by two teams, none by three; the credits ran at full length in
// 47.33333%, listed twelve teams in 10.00000% and thanked three people in 19.33333% (four needs a
// duo at the end or a father, and the harness never recruits). The ones it never earns are
// choices it never makes (the duo, the Lifestyle shelf) or rare outcomes (hof). Same rules as the
// rest of the book: cosmetic, pun names, conditions hidden.
//
// The speech and the credits are written in ui/finale.ts (speechOf, creditsOf); the engine never
// reads the UI, so the checks here work them out the same way from the career, and a test keeps
// the two in step (tests/round36-ach.test.ts).

import type { GameState, SeasonRecord } from './types';
import type { AchTier, CareerTotals } from './achievements';
import { championships, count, hallOfFame } from './awards/legacy';
import { raftersDetail } from './awards/details';
import { legendarySeasons } from './awards/legendary';
import { duoEffect } from './career/duo';

/** What a device has seen of the finale (ui/achievements.ts recordFinale counts each once a career):
 * a rafters ceremony or the credits alone played to the end, one played to the end when its Skip
 * button was there, one skipped. */
export type FinaleSeen = 'rafters' | 'credits' | 'encore' | 'skipped';

/** What these checks read (the book's facts, in part). */
interface Facts36 {
  g: GameState;
  t: CareerTotals;
  nba: SeasonRecord[];
  retired: boolean;
}

interface Ach36 {
  id: string;
  name: string;
  tier: AchTier;
  how: string;
  test: (f: Facts36) => boolean;
}

const A = (id: string, name: string, tier: AchTier, how: string, test: (f: Facts36) => boolean): Ach36 => ({ id, name, tier, how, test });

// ---- the rafters ----

/** The teams that hang his jersey once he has retired, the one he gave the most seasons first (the
 * finale's, ui/finale.ts raftersTeam). */
const hung = (f: Facts36) => (f.retired ? raftersDetail(f.g).sort((a, b) => b.seasons - a.seasons || b.titles - a.titles) : []);
const hangs = (f: Facts36) => hung(f).length > 0;
const startedJv = (g: GameState) => g.history.some((h) => h.level === 'HSJV');
/** The team he promised to finish with at the number talk (events/round36.ts), by his last NBA row that summer. */
const pledgedTo = (g: GameState): string | null => (g.flags.pledge ? (g.history.filter((h) => h.level === 'NBA' && h.year === g.flags.pledge).pop()?.teamId ?? null) : null);
const has = (f: Facts36, id: string) => f.g.purchases.includes(id);
/** A duo of his own still together when he retired: growBonds drops a bond once the teammate is
 * gone, and nothing drops it after his last season. */
const duoAtEnd = (g: GameState) => (g.bonds ?? []).some((b) => b.formed !== undefined);
const logged = (f: Facts36, re: RegExp) => f.g.log.some((e) => e.kind === 'event' && re.test(e.text));

// ---- the speech (ui/finale.ts speechOf): its third line and its person ----

/** The speech's third line: the banners hung with the team, the MVP, or the ring they never got. */
function speechTurn(f: Facts36): 'rings' | 'mvp' | 'chase' | null {
  const t = hung(f)[0];
  if (!t) return null;
  if (t.titles) return 'rings';
  return count(f.g, 'MVP') ? 'mvp' : 'chase';
}
/** The one person the speech thanks: his family first, then his running mate, then his rival. (Once
 * he has retired no duo is active, so the speech and the credits name the running mate only if the
 * finale comes to read him another way; `duoAtEnd` is the duo of his last season.) */
function speechPerson(f: Facts36): 'family' | 'duo' | 'rival' | null {
  if (!hangs(f)) return null;
  if (f.g.flags.child) return 'family';
  if (duoEffect(f.g)?.b) return 'duo';
  return f.g.rivalry ? 'rival' : null;
}

// ---- the credits (ui/finale.ts creditsOf and rollSecs) ----

/** The roll: a line and a half a second up to its longest (ui/finale.ts ACT_SECS), and the game's two makers. */
export const ROLL = { max: 52, line: 1.4, makers: 2 } as const;

/** How many rows each block of his credits holds, worked out as the finale writes them. */
export function creditRows(g: GameState, retired = g.step === 'retired') {
  let teams = 0;
  let last = '';
  for (const h of g.history) {
    if (/assignment/i.test(h.teamName)) continue;
    if (h.teamName !== last) teams++;
    last = h.teamName;
  }
  const labels = new Set(g.awards.filter((a) => !/champion/i.test(a.label)).map((a) => a.label)).size;
  const nba = g.history.some((h) => h.level === 'NBA' && h.line.gp > 0);
  const forever = (hallOfFame(g) ? 1 : 0) + (retired ? raftersDetail(g).length : 0);
  const people = [!!duoEffect(g), !!g.rivalry, !!g.flags.wed, !!g.flags.child, !!g.parent].filter(Boolean).length;
  const rows = { starring: 2, teams, titles: championships(g).length, legend: legendarySeasons(g).length, awards: Math.min(12, labels), nba: nba ? 2 : 0, forever, people };
  return { ...rows, labels };
}

/** Lines in the roll: each block's head and gap, its rows, then the makers' block. */
export function creditLines(g: GameState, retired = g.step === 'retired'): number {
  const r = creditRows(g, retired);
  const blocks = [r.starring, r.teams, r.titles, r.legend, r.awards, r.nba, r.forever, r.people].filter((n) => n > 0);
  return blocks.reduce((n, rows) => n + 2 + rows, 0) + 2 + ROLL.makers * 2;
}

const credits = (f: Facts36) => creditRows(f.g, f.retired);
const fin = (f: Facts36, k: FinaleSeen) => f.t.fin?.[k] ?? 0;

export const ACHIEVEMENTS_36: Ach36[] = [
  // ---- the rafters: whose, and how he got there ----
  A('rf-3', 'Three Arenas, One Number', 'hof', 'Have your number retired by three teams.', (f) => hung(f).length >= 3),
  A('rf-drafted', 'Draft Day to Banner Day', 'starter', 'Have your number retired by the team that drafted you.', (f) => !!f.g.draftedBy && hung(f).some((t) => t.id === f.g.draftedBy)),
  A('rf-jv', 'Bench to Rafters', 'starter', 'Start on the JV, and finish in the rafters.', (f) => startedJv(f.g) && hangs(f)),
  A('rf-undrafted', 'Undrafted, Unforgotten', 'hof', 'Have your number retired after going undrafted.', (f) => f.g.undrafted && hangs(f)),
  A('rf-five', 'Five-Year Plan', 'allstar', 'Have your number retired by a team you played only five seasons for.', (f) => hung(f).some((t) => t.seasons === 5)),
  A('rf-rings3', 'Hang ’Em High', 'starter', 'Hang three title banners with the team that retires your number.', (f) => (hung(f)[0]?.titles ?? 0) >= 3),
  A('rf-nohof', 'Local Legend', 'starter', 'Have your number retired, and miss the Hall of Fame.', (f) => hangs(f) && !hallOfFame(f.g)),
  A('rf-hofnone', 'Nowhere to Hang It', 'starter', 'Make the Hall of Fame with no team retiring your number.', (f) => f.retired && !!hallOfFame(f.g) && !hangs(f)),
  A('rf-near', 'Almost Famous', 'starter', 'Retire after seven seasons or more with one NBA team that never hangs your number.', (f) => f.retired && [...new Set(f.nba.map((h) => h.teamId))].some((id) => f.g.history.filter((h) => h.level === 'NBA' && h.teamId === id).length >= 7 && !hung(f).some((t) => t.id === id))),
  A('rf-promise', 'Promise Kept', 'allstar', 'Promise a team you will finish your career there, and see it hang your number.', (f) => {
    const id = pledgedTo(f.g);
    return !!id && hung(f).some((t) => t.id === id);
  }),
  A('rf-duo', 'Plus One', 'allstar', 'Have your number retired with your running mate still beside you.', (f) => hangs(f) && duoAtEnd(f.g)),
  A('rf-real', 'Raised in Reality', 'starter', 'Have your number retired in Reality hits hard.', (f) => f.g.mode === 'reality' && hangs(f)),
  // ---- the speech under the lights ----
  A('sp-chase', 'We Never Stopped Chasing', 'allstar', 'Have your number retired by a team you never won a title with, and no MVP to show for it.', (f) => speechTurn(f) === 'chase'),
  A('sp-mvp', 'The Part I’ll Miss', 'hof', 'Have your number retired by a team you never won a title with, with an MVP trophy at home.', (f) => speechTurn(f) === 'mvp'),
  A('sp-rival', 'Don’t Tell Anybody', 'starter', 'Thank your rival in your speech the night your number goes up.', (f) => speechPerson(f) === 'rival'),
  A('sp-family', 'Little Jersey', 'starter', 'Look up at your family in your speech the night your number goes up.', (f) => speechPerson(f) === 'family'),
  A('sp-draft', 'Rehearsed', 'allstar', 'Write your speech years early, and get to give it.', (f) => !!f.g.flags.speech && hangs(f)),
  // ---- the credits ----
  A('cr-teams12', 'Ensemble Cast', 'starter', 'Roll credits that list twelve teams.', (f) => f.retired && credits(f).teams >= 12),
  A('cr-awards12', 'Awards Season', 'rotation', 'Fill the awards in your credits: twelve different ones.', (f) => f.retired && credits(f).awards >= 12),
  A('cr-with3', 'Supporting Cast', 'starter', 'Roll credits that thank three people.', (f) => f.retired && credits(f).people >= 3),
  A('cr-champs5', 'Championship Montage', 'starter', 'Roll credits with five championships in them, at any level.', (f) => f.retired && credits(f).titles >= 5),
  A('cr-long', 'Director’s Cut', 'rotation', 'Roll credits so long they run at full length.', (f) => f.retired && creditLines(f.g, true) * ROLL.line >= ROLL.max),
  A('cr-short', 'Indie Darling', 'allstar', 'Roll credits with nothing in them but your name and your teams.', (f) => {
    const c = credits(f);
    return f.retired && !c.titles && !c.legend && !c.labels && !c.nba && !c.forever && !c.people;
  }),
  // ---- the round's turning points and shop things ----
  A('tp-jv', 'Full Circle', 'starter', 'Fly home for your JV coach’s last game.', (f) => logged(f, /^Flew home to speak at his JV coach/)),
  A('tp-fan', 'Mutuals', 'rotation', 'Follow back the fan account that clipped every game you played.', (f) => logged(f, /^Followed back @/)),
  A('tp-rival', 'Grudging Respect', 'allstar', 'Speak the night your old rival’s number goes up.', (f) => logged(f, /^Spoke the night .*number went up\.$/)),
  A('own-frame', 'Frame of Reference', 'bench', 'Frame your first jersey.', (f) => has(f, 'framed-jersey')),
  A('own-banner', 'Dress Rehearsal', 'bench', 'Hang a replica rafters banner in your garage.', (f) => has(f, 'rafters-banner')),
  A('own-banner-real', 'The Real Thing', 'starter', 'Hang a replica banner in your garage, and the real one in an arena.', (f) => has(f, 'rafters-banner') && hangs(f)),
  A('own-speech', 'Well Spoken', 'starter', 'Take lessons in public speaking, and use them the night your number goes up.', (f) => has(f, 'speech-coach') && hangs(f)),
  // ---- the username (ui/names.ts), kept on this device ----
  A('nm-pick', 'Handle With Care', 'bench', 'Pick a username for the community.', (f) => (f.t.handle ?? 0) >= 1),
  A('nm-rename', 'New Handle on Life', 'bench', 'Change your username.', (f) => (f.t.renamed ?? 0) >= 1),
  A('nm-rename5', 'Witness Protection', 'rotation', 'Change your username five times.', (f) => (f.t.renamed ?? 0) >= 5),
  A('nm-post1', 'Signed, Sealed, Delivered', 'bench', 'Post a career to the community boards under your username.', (f) => (f.t.posted ?? 0) >= 1),
  A('nm-post10', 'Autograph Session', 'starter', 'Post ten careers to the community boards under your username.', (f) => (f.t.posted ?? 0) >= 10),
  A('nm-posthof', 'Name in Lights', 'allstar', 'Post a Hall of Fame career under your username.', (f) => (f.t.postedHof ?? 0) >= 1),
  // ---- the finale (ui/screens/Finale.tsx), kept on this device ----
  A('fn-encore', 'Stay for the Credits', 'bench', 'Watch a finale to the end when you could have skipped it.', (f) => fin(f, 'encore') >= 1),
  A('fn-skip', 'Skip to the Good Part', 'bench', 'Skip a finale.', (f) => fin(f, 'skipped') >= 1),
  A('fn-double', 'Double Feature', 'starter', 'Watch both endings to the end: the rafters, and the credits alone.', (f) => fin(f, 'rafters') >= 1 && fin(f, 'credits') >= 1),
  A('fn-five', 'Film Festival', 'rotation', 'Watch five finales to the end.', (f) => fin(f, 'rafters') + fin(f, 'credits') >= 5),
  A('fn-rafters3', 'Not a Dry Eye in the House', 'allstar', 'Watch your jersey rise to the rafters in three careers.', (f) => fin(f, 'rafters') >= 3),
];

/** The ones that only read the totals kept across careers (checked with no career open). */
export const R36_TOTALS_ONLY = ['nm-pick', 'nm-rename', 'nm-rename5', 'nm-post1', 'nm-post10', 'nm-posthof', 'fn-encore', 'fn-skip', 'fn-double', 'fn-five', 'fn-rafters3'];
