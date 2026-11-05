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
// `node scripts/i18n.cjs` lists what each language is missing.
// After round 41 (owner: "the game takes too long to open"): the five tables were half of the game's
// script, read on every visit for a language most players never pick. A language is now loaded when
// it is picked (and before the first screen, for a device that picked it before): the website fetches
// that one table; the one-file artifact carries each table as a data block in its page
// (`<script type="application/json" id="btr-lang-ko">`, which the browser never runs as code).

import ko from './ko.json?url';
import zh from './zh.json?url';
import ja from './ja.json?url';
import es from './es.json?url';
import fr from './fr.json?url';

export type Lang = 'en' | 'ko' | 'zh' | 'ja' | 'es' | 'fr';
export type Table = { ui: Record<string, string>; story: Record<string, string>; eng?: Record<string, string> }; // eng: the engine's lines by hashOf (round 41, engine.ts)

/** Each language by its own name, the way its speakers look for it. */
export const LANGS: { id: Lang; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'ko', name: '한국어' },
  { id: 'zh', name: '简体中文' },
  { id: 'ja', name: '日本語' },
  { id: 'es', name: 'Español' },
  { id: 'fr', name: 'Français' },
];

type Other = Exclude<Lang, 'en'>;
const URLS: Record<Other, string> = { ko, zh, ja, es, fr };
const TABLES: Partial<Record<Other, Table>> = {};
const EMPTY: Table = { ui: {}, story: {} };
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

// English until the picked language's table is in (every screen reads `cur`, so none sees a gap)
let cur: Lang = 'en';
const subs = new Set<() => void>();

export const lang = (): Lang => cur;

/** A language's tables, from the page's data block (the artifact) or the server (the website). */
async function load(l: Other): Promise<Table> {
  const have = TABLES[l];
  if (have) return have;
  const block = typeof document !== 'undefined' ? document.getElementById(`btr-lang-${l}`) : null;
  const tb = block
    ? (JSON.parse(block.textContent ?? '') as Table)
    : await fetch(URLS[l]).then((r) => {
        if (!r.ok) throw new Error(`${l} table: ${r.status}`);
        return r.json() as Promise<Table>;
      });
  TABLES[l] = tb;
  return tb;
}

/** For the tests and the scripts, which read the tables from disk. */
export function registerLang(l: Other, tb: Table): void {
  TABLES[l] = tb;
}

function apply(l: Lang): void {
  if (l === cur) return;
  cur = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  subs.forEach((f) => f());
}

let wantedNow: Lang = 'en';
/** Switch the language; every screen draws again in it, once its table is in (at once, if it is). */
export function setLang(l: Lang): Promise<void> {
  wantedNow = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* it lasts this visit */
  }
  if (l === 'en' || TABLES[l]) {
    apply(l);
    return Promise.resolve();
  }
  return load(l).then(
    () => {
      // a later pick wins over a table that came in late
      if (wantedNow === l) apply(l);
    },
    () => {
      /* not reachable now: the game stays in its language and the pick is kept for next time */
    },
  );
}

/** The language this device picked, in before the first screen draws (main.tsx). */
export function startLang(): Promise<void> {
  const l = first();
  return l === 'en' ? Promise.resolve() : setLang(l);
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
  if (cur === 'en') return fill(plain, v);
  // round 41: a value that is a line the engine wrote shows in the language too (engine.ts)
  const vals = v && slots ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === 'string' ? slots!(x) : x])) : v;
  return fill(TABLES[cur]?.ui[en] ?? plain, vals);
}

let slots: ((s: string) => string) | null = null;
/** engine.ts hands t() its translator for values (set once, as it loads; no import back from here). */
export function onSlots(f: (s: string) => string): void {
  slots = f;
}

/** Marks English kept in data for the catalog; the screen translates it with `t` when it shows it. */
export const tx = (en: string): string => en;

/** English a tx() marked with a context (`'Back@@body'`), as it shows in English. */
export const plainOf = (en: string): string => (en.includes('@@') ? en.slice(0, en.indexOf('@@')) : en);

/** Story mode's table in the player's language (missing lines in English). */
export function storyTable(en: Record<string, string>): Record<string, string> {
  return cur === 'en' ? en : { ...en, ...TABLES[cur]?.story };
}

/** "5th" in the player's language (round 40, moved here in round 41 for the engine's lines): null in English. */
export function localOrdinal(n: number): string | null {
  switch (cur) {
    case 'ko':
      return `${n}위`;
    case 'ja':
      return `${n}位`;
    case 'zh':
      return `第${n}`;
    case 'es':
      return `${n}.º`;
    case 'fr':
      return n === 1 ? '1er' : `${n}e`;
    default:
      return null;
  }
}

/** A language's tables (empty until it is loaded). */
export const tableOf = (l: Other): Table => TABLES[l] ?? EMPTY;
