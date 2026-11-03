// The finale (round 36, owner: "the rafters as the finale ... instead of the thank you for playing,
// let's put that. also, make it so that for the first time it's played, its unskippable but from
// the next time a skip button appears"; then: "i like steps 123, but let's combine 45 ... like movie
// credits, the title of the game fills the screen and then a thank you message. i dont want this to
// be any longer than 2 minutes"). This file decides what plays and for how long; the page draws it
// (screens/Finale.tsx).
//
// A career whose jersey hangs gets the whole ceremony: the empty arena at night, his speech, the
// jersey rising, then the credits. Every other finished career gets an ending of its own (owner: "do
// all 12"; ui/endings.ts decides which): a scene of its place, three lines and where he is now, then
// the same credits; a career that ended on a farewell tour opens on the last road ovation first. A
// level of the tutorial gets only the title and the thank-you. Leaving a career that isn't over
// gets no ending at all (owner: "leaving a career that isn't finished doesn't deserve the ending card").

import type { GameState, StoryRole } from '../engine/types';
import { championships, hallOfFame, nbaCareerPoints } from '../engine/awards/legacy';
import { raftersDetail } from '../engine/awards/details';
import { legendarySeasons } from '../engine/awards/legendary';
import { duoAtEnd } from '../engine/career/duo';
import { endingOf, sceneOf, twistsOf, type EndingId } from './endings';

/** The rafters' acts (the arena, the speech, the jersey), every other ending's (the ovation of a
 * farewell tour, the scene, where he is now), then everyone's: the credits, the title, the thank-you. */
export type Act = 'arena' | 'speech' | 'jersey' | 'ovation' | 'scene' | 'now' | 'roll' | 'title' | 'thanks';
/** One of the twelve endings, or a tutorial level's short one. */
export type FinaleKind = EndingId | 'level';

/** The whole of it stays under two minutes (owner); the thank-you waits for the player. */
export const FINALE_MAX = 120;
/** Seconds for each act; the speech and the roll grow with the career, inside their limits. A scene
 * opens on its place, then a line every few seconds; where he is now holds a little longer. */
export const ACT_SECS = { arena: 7, speechLine: 5.5, jersey: 12, ovation: 6, sceneOpen: 6, sceneLine: 6, now: 7, rollMin: 20, rollMax: 52, rollLine: 1.4, title: 6 } as const;

/** Which ending a career gets, or none (a career still going, the daily, a lab run). */
export function finaleKind(g: GameState): FinaleKind | null {
  if (g.step !== 'retired' || g.flags.daily || g.mode === 'lab') return null;
  if (g.flags.level || g.flags.tour) return 'level';
  return endingOf(g);
}

/** The acts of an ending in order; `ovation` when the career ended on a farewell tour. */
export function actsOf(kind: FinaleKind, ovation = false): Act[] {
  if (kind === 'rafters') return ['arena', 'speech', 'jersey', 'roll', 'title', 'thanks'];
  if (kind === 'level') return ['title', 'thanks'];
  return [...(ovation ? (['ovation'] as const) : []), 'scene', 'now', 'roll', 'title', 'thanks'];
}

const actsFor = (g: GameState, kind: FinaleKind) => actsOf(kind, kind !== 'rafters' && kind !== 'level' && twistsOf(g).farewell);

/** What the store keeps for an ending: the career, which ending, where it starts, and the act on
 * screen (the music follows both). */
export function finaleFor(g: GameState, from?: Act): { g: GameState; kind: FinaleKind; from?: Act; act: Act } | null {
  const kind = finaleKind(g);
  if (!kind) return null;
  const acts = actsFor(g, kind);
  return { g, kind, from, act: from && acts.includes(from) ? from : acts[0] };
}

/** The team whose rafters it is: the one he spent longest with among those that hang it. */
export function raftersTeam(g: GameState) {
  return raftersDetail(g).sort((a, b) => b.seasons - a.seasons || b.titles - a.titles)[0] ?? null;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const first = (name: string) => name.split(' ')[0];

/** His speech under the lights, written from the career: four or five lines. */
export function speechOf(g: GameState): string[] {
  const t = raftersTeam(g);
  const p = g.player;
  const lines: string[] = [];
  const city = t ? t.name.split(' ').slice(0, -1).join(' ') || t.name : 'everybody';
  lines.push(t ? `Thank you, ${city}. ${plural(t.seasons, 'season')}, and you were loud for every one of them.` : 'Thank you. All of you.');
  const jv = g.history.some((h) => h.level === 'HSJV');
  lines.push(jv ? `I started on the JV at ${p.highSchool}, a kid from ${p.hometown} nobody had heard of.` : `I was a kid from ${p.hometown}, shooting in the gym at ${p.highSchool} until they turned the lights off.`);
  const rings = t?.titles ?? 0;
  const mvps = g.awards.filter((a) => a.key === 'MVP').length;
  if (rings) lines.push(rings === 1 ? 'We hung one banner together. I still remember every second of that night.' : `We hung ${rings} banners together. I remember every one of those nights.`);
  else if (mvps) lines.push(`The MVP ${mvps === 1 ? 'trophy is' : 'trophies are'} nice. You are the part I will miss.`);
  else lines.push('We never got the ring. We never stopped chasing it, either.');
  const duo = duoAtEnd(g)?.b;
  // round 38: in story mode the speech is for his people (his friend, his rival, his family)
  if (g.story) {
    lines.push(...storySpeech(g));
    lines.push(`When you look up and see number ${p.number}, remember the driveway it started on.`);
    return lines.slice(0, 7);
  }
  if (g.flags.child) lines.push(`To my family: every time I looked up and saw that little jersey, I played a little harder.`);
  else if (duo) lines.push(`${first(duo.name)}, I would not be up there without you.`);
  else if (g.rivalry) lines.push(`${g.rivalry.name}, you made me better every single night. Don't tell anybody.`);
  lines.push(`When you look up and see number ${p.number}, remember the bench it started on.`);
  return lines.slice(0, 5);
}

interface CreditBlock {
  head: string;
  rows: string[];
}

const LEVEL_WORD: Record<string, string> = { HSJV: 'High school', HSV: 'High school', NCAA: 'College', GL: 'G League', EU: 'Europe', INT: 'Overseas', NBA: 'NBA' };

function span(years: number[]): string {
  const a = Math.min(...years);
  const b = Math.max(...years);
  return a === b ? `${a}` : `${a}–${b}`;
}

/** The credits, like a film's: the career in blocks, then the two people who made the game. */
export function creditsOf(g: GameState): CreditBlock[] {
  const p = g.player;
  const out: CreditBlock[] = [];
  out.push({ head: 'Starring', rows: [`${p.name}${p.nickname ? ` “${p.nickname.name}”` : ''}`, `#${p.number} · from ${p.hometown}`] });
  // every team, in the order he played for it, with its years
  const teams: { name: string; level: string; years: number[] }[] = [];
  for (const h of g.history) {
    if (/assignment/i.test(h.teamName)) continue;
    const last = teams[teams.length - 1];
    if (last && last.name === h.teamName) last.years.push(h.year);
    else teams.push({ name: h.teamName, level: LEVEL_WORD[h.level] ?? h.level, years: [h.year] });
  }
  if (teams.length) out.push({ head: 'Teams', rows: teams.map((t) => `${t.name} · ${t.level} · ${span(t.years)}`) });
  const titles = championships(g);
  if (titles.length) out.push({ head: 'Championships', rows: titles.map((t) => `${t.year} · ${t.label} · ${t.teamName}${t.finalsMvp ? ' · Finals MVP' : ''}`) });
  const legend = legendarySeasons(g);
  if (legend.length) out.push({ head: 'Legendary seasons', rows: legend.map((l) => `${l.season.year} · ${l.name}`) });
  // honours, the most of each first: "All-Star ×9"
  const counts = new Map<string, number>();
  for (const a of g.awards) if (!/champion/i.test(a.label)) counts.set(a.label, (counts.get(a.label) ?? 0) + 1);
  const honours = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (honours.length) out.push({ head: 'Awards', rows: honours.map(([label, n]) => (n > 1 ? `${label} ×${n}` : label)) });
  const nba = g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);
  if (nba.length) {
    const reb = Math.round(nba.reduce((s, h) => s + h.line.reb + h.post.reb, 0));
    const ast = Math.round(nba.reduce((s, h) => s + h.line.ast + h.post.ast, 0));
    out.push({ head: 'In the NBA', rows: [`${plural(nba.length, 'season')}`, `${Math.round(nbaCareerPoints(g)).toLocaleString('en-US')} points · ${reb.toLocaleString('en-US')} rebounds · ${ast.toLocaleString('en-US')} assists`] });
  }
  const hof = hallOfFame(g);
  const hung = raftersDetail(g);
  if (hof || hung.length) out.push({ head: 'Forever', rows: [...(hof ? [hof === 'first' ? 'Hall of Fame, first ballot' : 'Hall of Fame'] : []), ...hung.map((t) => `#${p.number} hangs in the ${t.name} rafters`)] });
  // the rare late leap and the career-altering injury, when the career had them
  const tw = twistsOf(g);
  const turns = [...(tw.leap ? [`The leap · ${tw.leap}`] : []), ...(tw.injury ? [`The injury · ${tw.injury}`] : [])];
  if (turns.length) out.push({ head: 'Turning points', rows: turns });
  const people: string[] = [];
  const duo = duoAtEnd(g);
  if (duo) people.push(`Running mate · ${duo.b.name}${duo.third ? ` and ${duo.third.name}` : ''}`);
  if (g.rivalry) people.push(`Rival · ${g.rivalry.name}`);
  if (g.flags.wed) people.push(`Married · ${g.flags.wed}`);
  if (g.flags.child) people.push(`${g.flags.childGirl ? 'A daughter' : 'A son'} · ${g.flags.child}`);
  if (g.parent) people.push(`Father · ${g.parent.name}`);
  if (g.story) people.unshift(...storyWith(g));
  if (people.length) out.push({ head: 'With', rows: people });
  // round 38: story mode ends on where his people are now
  if (g.story) out.push({ head: 'Where they are now', rows: storyNow(g) });
  return out;
}

// ---- round 38: story mode's people in the finale (the finale stays English: owner, round 40) ----

const bondOf = (g: GameState, who: StoryRole) => g.story?.bond[who] ?? 0;

/** The speech's lines for his people: the friend first when they are close, the rival, the family. */
function storySpeech(g: GameState): string[] {
  const st = g.story!;
  const F = first(st.names.friend);
  const R = first(st.names.rival);
  const P = first(st.names.parent);
  const out: string[] = [];
  const f = st.friend;
  if (bondOf(g, 'friend') >= 2) out.push(f.lv === 'COACH' && st.f.friendCoach ? `${F}, you were on my bench at the end, like you were in the driveway at the start. This is yours too.` : f.track === 'star' ? `${F}, you got there first and waited for me. The best player I ever played against grew up next door.` : `${F}, from the driveway to here. This number is half yours.`);
  else if (bondOf(g, 'friend') <= -1) out.push(`${F}, I know we lost each other somewhere along the way. I still think about the driveway.`);
  else out.push(`${F}, thank you for every game to eleven.`);
  if (st.rival) out.push(st.f.feud ? `${R}... we never did settle it. Maybe one day.` : bondOf(g, 'rival') >= 2 ? `${R}, one step ahead of me my whole life. You made me chase. Thank you for that.` : `${R}, you were always two points ahead. Don't think I didn't notice.`);
  out.push(st.mem.some((m) => m.id === 'p-ride-promise') && st.mem.some((m) => m.id === 'p-house-house') ? `${P}, I promised in the car I would pay it all back. I hope the porch is a start.` : `${P}, the car rides at five in the morning. I heard every word you didn't say.`);
  return out;
}

/** His people for the credits' With block. */
function storyWith(g: GameState): string[] {
  const st = g.story!;
  return [`Best friend · ${st.names.friend}`, ...(st.rival ? [`Rival · ${st.names.rival}`] : []), `Parent · ${st.names.parent}`, `Younger sibling · ${st.names.sibling}`];
}

/** Where each of them is when it ends. */
function storyNow(g: GameState): string[] {
  const st = g.story!;
  const f = st.friend;
  const rows: string[] = [];
  rows.push(`${st.names.friend} · ${f.lv === 'COACH' ? (st.f.friendCoach ? 'an assistant coach, still on your bench' : `coaching at ${f.team || 'a college'}`) : f.lv === 'OUT' ? 'two rows behind the bench, every game' : f.track === 'star' ? 'one of the best of his time, and still your driveway' : 'a pro to the end, and still your friend'}`);
  if (st.rival) rows.push(`${st.names.rival} · ${st.f.feud ? 'still two points ahead, still not speaking' : bondOf(g, 'rival') >= 2 ? 'in the front row on your night' : 'retired a season before you, one step ahead'}`);
  rows.push(`${st.names.parent} · ${st.mem.some((m) => m.id === 'p-house-house') ? 'on the porch of the house you bought, the old hoop out front' : 'still in the house with the driveway hoop'}`);
  rows.push(`${st.names.sibling} · ${bondOf(g, 'sibling') >= 2 ? 'playing college ball, in your number' : 'at every home game you ever played'}`);
  if (st.f.rafterBall) rows.push('The old driveway ball · in the rafters, beside your number');
  return rows;
}

/** The game's own credits: kept to two lines (owner: "make that part extremely short (just
 * developer: mj kwon and (your role): claude)"). */
export const MAKERS: { role: string; name: string }[] = [
  { role: 'Developer', name: 'MJ Kwon' },
  { role: 'Code, art and sound', name: 'Claude' },
];

/** How long the roll runs: a line and a half a second's worth, inside its limits. */
export function rollSecs(blocks: CreditBlock[]): number {
  const lines = blocks.reduce((n, b) => n + 2 + b.rows.length, 0) + 2 + MAKERS.length * 2;
  return Math.min(ACT_SECS.rollMax, Math.max(ACT_SECS.rollMin, lines * ACT_SECS.rollLine));
}

/** How long an act runs, in seconds (the thank-you has none: it waits for the player). */
function secsOf(g: GameState, act: Act): number {
  switch (act) {
    case 'arena':
      return ACT_SECS.arena;
    case 'speech':
      return speechOf(g).length * ACT_SECS.speechLine;
    case 'jersey':
      return ACT_SECS.jersey;
    case 'ovation':
      return ACT_SECS.ovation;
    case 'scene':
      return ACT_SECS.sceneOpen + sceneOf(g).lines.length * ACT_SECS.sceneLine;
    case 'now':
      return ACT_SECS.now;
    case 'roll':
      return rollSecs(creditsOf(g));
    case 'title':
      return ACT_SECS.title;
    default:
      return 0;
  }
}

/** Every act with its length in seconds. */
export function timeline(g: GameState, kind: FinaleKind): { act: Act; secs: number }[] {
  return actsFor(g, kind).map((act) => ({ act, secs: secsOf(g, act) }));
}

// ---- the first time on a device it can't be skipped (owner); each ending counts on its own ----

const SEEN = 'btr-finale-seen';

export function finaleSeen(kind: FinaleKind): boolean {
  if (kind === 'level') return true;
  try {
    return (JSON.parse(localStorage.getItem(SEEN) ?? '[]') as string[]).includes(kind);
  } catch {
    return false;
  }
}

export function markFinaleSeen(kind: FinaleKind): void {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN) ?? '[]') as string[];
    if (!seen.includes(kind)) localStorage.setItem(SEEN, JSON.stringify([...seen, kind]));
  } catch {
    /* it plays unskippable once more next time: no harm */
  }
}
