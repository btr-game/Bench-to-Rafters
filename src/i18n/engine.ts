// The lines the engine writes, in the player's language (round 41, owner: "lines the game engine
// writes, events, storylines, press conferences, the finale. do these"). The engine still writes
// English (its tests, saves and the harness read it), and the screens translate each line as they
// draw it: every string a page draws as text passes through `te` (jsx-runtime.ts), so no screen has
// to know which of its words came from the engine.
// - A line with no values (most of an event: its title, text, choices and outcomes) is found by
//   its name (hashOf) in the language's `eng` table.
// - A line with values ("{0} signs with {1}") is matched against the templates the catalog found
//   (engineTpl.json, scripts/engineText.ts): the values are taken from the line on screen, each one
//   translated in turn when it is a line of its own, and put into the translation.
// - A paragraph of sentences joined together is tried a sentence at a time.
// Anything else stays as it is: names, numbers, and the interface's words, already translated by t().

import TPL from './engineTpl.json';
import { hashOf } from './hash';
import { lang, localOrdinal, tableOf, type Lang } from './index';

interface Pat {
  re: RegExp;
  h: string;
  /** the template's own words, for a quick look before the pattern */
  head: string;
  key: string;
  lit: number;
}

let pats: Pat[] | null = null;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function patterns(): Pat[] {
  if (pats) return pats;
  pats = (TPL as string[])
    .map((en) => {
      const parts = en.split(/\{\d+\}/);
      const key = parts.reduce((a, b) => (b.length > a.length ? b : a), '');
      return { re: new RegExp('^' + parts.map(esc).join('([\\s\\S]*?)') + '$'), h: hashOf(en), head: parts[0], key, lit: parts.join('').length };
    })
    // the more of its own words a template has, the more surely it is the one
    .sort((a, b) => b.lit - a.lit);
  return pats;
}

type Table = Record<string, string>;

const fill = (tr: string, vals: string[]) => tr.replace(/\{(\d+)\}/g, (m, k: string) => vals[Number(k)] ?? m);

/** One line: by its name, else by a template; null when neither knows it. */
function one(s: string, tb: Table, depth: number): string | null {
  const exact = tb[hashOf(s)];
  if (exact !== undefined) return exact;
  if (depth > 2) return null;
  for (const p of patterns()) {
    if (p.head && !s.startsWith(p.head)) continue;
    if (!s.includes(p.key)) continue;
    const m = p.re.exec(s);
    if (!m) continue;
    const tr = tb[p.h];
    if (tr === undefined) continue;
    // a value can be a line of its own (a phrase or a word the engine chose), an ordinal, or a name or a number
    const vals = m.slice(1).map((v) => {
      const o = v.match(/^(\d+)(?:st|nd|rd|th)$/);
      if (o) return localOrdinal(Number(o[1])) ?? v;
      const w = v.trim();
      const tr = /[a-z]{2}/i.test(w) ? one(w, tb, depth + 1) : null;
      return tr === null ? v : v.replace(w, tr);
    });
    return fill(tr, vals);
  }
  return null;
}

const SENTENCE = /(?<=[.!?…”"])\s+(?=[A-Z“"‘(])/;

/** A paragraph, a sentence at a time; null when no sentence of it is known. */
function sentences(s: string, tb: Table, l: Lang): string | null {
  const parts = s.split(SENTENCE);
  if (parts.length < 2) return null;
  let hit = false;
  const out = parts.map((p) => {
    const tr = one(p, tb, 0);
    if (tr === null) return p;
    hit = true;
    return tr;
  });
  return hit ? out.join(l === 'zh' || l === 'ja' ? '' : ' ') : null;
}

const cache = new Map<string, string>();
let cacheLang: Lang = 'en';

/** A line the engine wrote, in the player's language (as it is when no translation knows it). */
export function te(s: string): string {
  const l = lang();
  if (l === 'en' || s.length < 4 || !/[a-z]{2}/.test(s)) return s;
  if (cacheLang !== l || cache.size > 6000) {
    cache.clear();
    cacheLang = l;
  }
  const got = cache.get(s);
  if (got !== undefined) return got;
  const tb = tableOf(l).eng;
  let out = s;
  if (tb) {
    const lead = s.match(/^\s*/)![0];
    const tail = s.match(/\s*$/)![0];
    const core = s.trim();
    const tr = one(core, tb, 0) ?? sentences(core, tb, l);
    if (tr !== null) out = lead + tr + tail;
  }
  cache.set(s, out);
  return out;
}

/** A page element's props with its text in the player's language (for jsx-runtime.ts): the string
 * children of a tag or a fragment. The same props when nothing changes. */
export function translatedProps<P>(props: P): P {
  if (lang() === 'en' || !props) return props;
  const c = (props as { children?: unknown }).children;
  if (typeof c === 'string') {
    const tr = te(c);
    return tr === c ? props : { ...props, children: tr };
  }
  if (Array.isArray(c)) {
    let changed = false;
    const next = c.map((x) => {
      if (typeof x !== 'string') return x;
      const tr = te(x);
      if (tr !== x) changed = true;
      return tr;
    });
    return changed ? { ...props, children: next } : props;
  }
  return props;
}
