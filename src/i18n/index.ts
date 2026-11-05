// Round 40: the game in six languages (owner: "let's just add korean, chinese, japanese, spanish,
// and french"; then "let's only go with interface"). The interface's words are keyed by their
// English: `t('Start the story')` is the English on an English screen and the translation on any
// other, so the English stays readable where it is written and a missing translation falls back to
// it. Slots in braces are filled after translating (`t('{n} seasons left', { n })`), so a language
// can move them. `tx()` only marks words kept in data (a list of plans, the manual's sections) so
// the catalog script finds them; the screen still says `t(x)` where it shows them.
// What stays English (owner's marks on "Round 40 - what stays in English"): names of leagues, teams,
// places, people, awards, achievements, modes, mini-games, the town's and the main land's places
// and tabs, ratings and meters, and everything the engine writes as the career happens (events,
// storylines, the log and news, press conferences, the finale). Story mode's words are translated
// too, by their own keys (content/story.ts), in each language's `story` table.
// The tables are bundled (the artifact is one file); `node scripts/i18n.cjs` lists what each
// language is missing.

import ko from './ko.json';
import zh from './zh.json';
import ja from './ja.json';
import es from './es.json';
import fr from './fr.json';

export type Lang = 'en' | 'ko' | 'zh' | 'ja' | 'es' | 'fr';
type Table = { ui: Record<string, string>; story: Record<string, string>; eng?: Record<string, string> }; // eng: the engine's lines by hashOf (round 41, engine.ts)

/** Each language by its own name, the way its speakers look for it. */
export const LANGS: { id: Lang; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'ko', name: '한국어' },
  { id: 'zh', name: '简体中文' },
  { id: 'ja', name: '日本語' },
  { id: 'es', name: 'Español' },
  { id: 'fr', name: 'Français' },
];

const TABLES: Record<Exclude<Lang, 'en'>, Table> = { ko, zh, ja, es, fr };
const KEY = 'btr-lang';
const isLang = (x: unknown): x is Lang => LANGS.some((l) => l.id === x);

/** The language picked on this device; at first, the browser's own if the game has it. */
function first(): Lang {
  try {
    const kept = localStorage.getItem(KEY);
    if (isLang(kept)) return kept;
  } catch {
    /* no storage: the browser's language, or English */
  }
  const nav = typeof navigator !== 'undefined' ? (navigator.language || '').slice(0, 2).toLowerCase() : '';
  return isLang(nav) ? nav : 'en';
}

let cur: Lang = first();
const subs = new Set<() => void>();
if (typeof document !== 'undefined') document.documentElement.lang = cur;

export const lang = (): Lang => cur;

/** Switch the language; every screen draws again in it. */
export function setLang(l: Lang): void {
  if (l === cur) return;
  cur = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* it lasts this visit */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  subs.forEach((f) => f());
}

/** For useSyncExternalStore: the root draws again when the language changes. */
export function onLang(f: () => void): () => void {
  subs.add(f);
  return () => subs.delete(f);
}

const fill = (s: string, v?: Record<string, string | number>): string => (v ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m)) : s);

/** The interface's words in the player's language, keyed by the English. One English word with two
 * meanings takes a context after `@@` (`t('Back@@body')`, the back of the body, beside `t('Back')`,
 * the button): the English shows without it, and each meaning gets a translation of its own. */
export function t(en: string, v?: Record<string, string | number>): string {
  const plain = en.includes('@@') ? en.slice(0, en.indexOf('@@')) : en;
  return fill(cur === 'en' ? plain : (TABLES[cur].ui[en] ?? plain), v);
}

/** Marks English kept in data for the catalog; the screen translates it with `t` when it shows it. */
export const tx = (en: string): string => en;

/** English a tx() marked with a context (`'Back@@body'`), as it shows in English. */
export const plainOf = (en: string): string => (en.includes('@@') ? en.slice(0, en.indexOf('@@')) : en);

/** Story mode's table in the player's language (missing lines in English). */
export function storyTable(en: Record<string, string>): Record<string, string> {
  return cur === 'en' ? en : { ...en, ...TABLES[cur].story };
}

/** For the tests and the catalog script: a language's tables. */
export const tableOf = (l: Exclude<Lang, 'en'>): Table => TABLES[l];
