// The finale (round 36, owner: "the rafters as the finale ... instead of the thank you for playing,
// let's put that. also, make it so that for the first time it's played, its unskippable but from
// the next time a skip button appears"; then: "i like steps 123, but let's combine 45 ... like movie
// credits, the title of the game fills the screen and then a thank you message. i dont want this to
// be any longer than 2 minutes"). This file decides what plays and for how long; the page draws it
// (screens/Finale.tsx).
//
// A career whose jersey hangs gets the whole ceremony: the empty arena at night, his speech, the
// jersey rising, then the credits. Any other finished career gets the credits (its own opening
// comes later: owner, "let's catagorize that a bit later, because there are many paths"). A level
// of the tutorial gets only the title and the thank-you. Leaving a career that isn't over gets no
// ending at all (owner: "leaving a career that isn't finished doesn't deserve the ending card").

import type { GameState } from '../engine/types';
import { championships, hallOfFame, nbaCareerPoints, raftersTeams } from '../engine/awards/legacy';
import { raftersDetail } from '../engine/awards/details';
import { legendarySeasons } from '../engine/awards/legendary';
import { duoEffect } from '../engine/career/duo';

export type Act = 'arena' | 'speech' | 'jersey' | 'roll' | 'title' | 'thanks';
export type FinaleKind = 'rafters' | 'credits' | 'level';

/** The whole of it stays under two minutes (owner); the thank-you waits for the player. */
export const FINALE_MAX = 120;
/** Seconds for each act; the speech and the roll grow with the career, inside their limits. */
export const ACT_SECS = { arena: 7, speechLine: 5.5, jersey: 12, rollMin: 20, rollMax: 52, rollLine: 1.4, title: 6 } as const;

/** Which ending a career gets, or none (a career still going, the daily, a lab run). */
export function finaleKind(g: GameState): FinaleKind | null {
  if (g.step !== 'retired' || g.flags.daily || g.mode === 'lab') return null;
  if (g.flags.level || g.flags.tour) return 'level';
  return raftersTeams(g).length ? 'rafters' : 'credits';
}

export function actsOf(kind: FinaleKind): Act[] {
  if (kind === 'rafters') return ['arena', 'speech', 'jersey', 'roll', 'title', 'thanks'];
  if (kind === 'credits') return ['roll', 'title', 'thanks'];
  return ['title', 'thanks'];
}

/** What the store keeps for an ending: the career, where it starts, and the act on screen (the
 * music follows it). */
export function finaleFor(g: GameState, from?: Act): { g: GameState; from?: Act; act: Act } | null {
  const kind = finaleKind(g);
  if (!kind) return null;
  const acts = actsOf(kind);
  return { g, from, act: from && acts.includes(from) ? from : acts[0] };
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
  const duo = duoEffect(g)?.b;
  if (g.flags.child) lines.push(`To my family: every time I looked up and saw that little jersey, I played a little harder.`);
  else if (duo) lines.push(`${first(duo.name)}, I would not be up there without you.`);
  else if (g.rivalry) lines.push(`${g.rivalry.name}, you made me better every single night. Don't tell anybody.`);
  lines.push(`When you look up and see number ${p.number}, remember the bench it started on.`);
  return lines.slice(0, 5);
}

export interface CreditBlock {
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
  const people: string[] = [];
  const duo = duoEffect(g);
  if (duo) people.push(`Running mate · ${duo.b.name}${duo.third ? ` and ${duo.third.name}` : ''}`);
  if (g.rivalry) people.push(`Rival · ${g.rivalry.name}`);
  if (g.flags.wed) people.push(`Married · ${g.flags.wed}`);
  if (g.flags.child) people.push(`${g.flags.childGirl ? 'A daughter' : 'A son'} · ${g.flags.child}`);
  if (g.parent) people.push(`Father · ${g.parent.name}`);
  if (people.length) out.push({ head: 'With', rows: people });
  return out;
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

/** Every act with its length in seconds (the thank-you has none: it waits for the player). */
export function timeline(g: GameState, kind: FinaleKind): { act: Act; secs: number }[] {
  return actsOf(kind).map((act) => ({
    act,
    secs: act === 'arena' ? ACT_SECS.arena : act === 'speech' ? speechOf(g).length * ACT_SECS.speechLine : act === 'jersey' ? ACT_SECS.jersey : act === 'roll' ? rollSecs(creditsOf(g)) : act === 'title' ? ACT_SECS.title : 0,
  }));
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
