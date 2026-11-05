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
// - A paragraph of sentences, or a title and its line joined by a colon, is tried a piece at a time
//   (the longest known run of pieces first); a quoted line, by the words inside its quotes.
// Anything else stays as it is: names, numbers, and the interface's words, already translated by t().

import TPL from './engineTpl.json';
import { hashOf } from './hash';
import { lang, localOrdinal, onSlots, tableOf, type Lang } from './index';

interface Pat {
  re: RegExp;
  h: string;
  /** the template's values by name, in order ('0', '1'… or 'name', 'team' in a plain string) */
  names: string[];
  /** the template's own words, for a quick look before the pattern */
  head: string;
  key: string;
  lit: number;
  /** enough of its own to name a whole line: opening words, or a word that is not filler */
  strong: boolean;
}

// words too common to name a line on their own ("{0} with the {1}" would match half the game)
const FILLER = new Set('with the and for his her you your are was has had who all out from into more than that this they them their have will one two our its'.split(' '));

let pats: Pat[] | null = null;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SLOT = /\{(\w+)\}/;

function patterns(): Pat[] {
  if (pats) return pats;
  pats = (TPL as string[])
    .map((en) => {
      const bits = en.split(SLOT);
      const parts = bits.filter((_, i) => i % 2 === 0);
      const names = bits.filter((_, i) => i % 2 === 1);
      const key = parts.reduce((a, b) => (b.length > a.length ? b : a), '');
      const own = (parts.join(' ').match(/[A-Za-z’']{3,}/g) ?? []).map((w) => w.toLowerCase());
      const strong = parts[0].trim().length >= 4 || own.some((w) => !FILLER.has(w));
      return { re: new RegExp('^' + parts.map(esc).join('([\\s\\S]*?)') + '$'), h: hashOf(en), names, head: parts[0], key, lit: parts.join('').length, strong };
    })
    // the more of its own words a template has, the more surely it is the one
    .sort((a, b) => b.lit - a.lit);
  return pats;
}

type Table = Record<string, string>;

const fill = (tr: string, vals: Record<string, string>) => tr.replace(/\{(\w+)\}/g, (m, k: string) => vals[k] ?? m);

/** One line: by its name, else by a template; null when neither knows it. A value that is a word of
 * the interface ('Left', 'Right') is found in the interface's table (`ui`). */
function one(s: string, tb: Table, depth: number, ui?: Table): string | null {
  if (ui && depth > 0 && ui[s] !== undefined) return ui[s];
  const exact = tb[hashOf(s)];
  if (exact !== undefined) return exact;
  if (depth > 2) return null;
  for (const p of patterns()) {
    // a weak template only fills a value inside another line
    if (depth === 0 && !p.strong) continue;
    if (p.head && !s.startsWith(p.head)) continue;
    if (!s.includes(p.key)) continue;
    const m = p.re.exec(s);
    if (!m) continue;
    const tr = tb[p.h];
    if (tr === undefined) continue;
    // a value can be a line of its own (a phrase or a word the engine chose), an ordinal, or a name or a number
    const vals: Record<string, string> = {};
    m.slice(1).forEach((v, i) => {
      const o = v.match(/^(\d+)(?:st|nd|rd|th)$/);
      const w = v.trim();
      const t = o ? localOrdinal(Number(o[1])) : /[a-z]{2}/i.test(w) ? one(w, tb, depth + 1, ui) : null;
      vals[p.names[i]] = t === null ? v : o ? t : v.replace(w, t);
    });
    return fill(tr, vals);
  }
  return null;
}

/** Where a line the engine glued together comes apart: between sentences, and after a title's colon
 * or a dot between items ("Trade deadline: the front office goes all in…", "A ring · 3 All-Stars"). */
const SEAM = /(?<=[.!?…”"])\s+(?=[A-Z“"‘(])|: | · |：/g;

/** A line glued from lines the engine knows, the longest known run of its pieces at a time; null
 * when no piece of it is known. */
function pieces(s: string, tb: Table, l: Lang, ui: Table): string | null {
  const bits: string[] = [];
  const seams: string[] = [];
  let at = 0;
  for (const m of s.matchAll(SEAM)) {
    bits.push(s.slice(at, m.index));
    seams.push(m[0]);
    at = m.index! + m[0].length;
  }
  bits.push(s.slice(at));
  if (bits.length < 2) return null;
  const cjk = l === 'zh' || l === 'ja';
  let out = '';
  let hit = false;
  for (let i = 0; i < bits.length; ) {
    let j = bits.length;
    let tr: string | null = null;
    for (; j > i; j--) {
      if (i === 0 && j === bits.length) continue; // the whole line was tried already
      let run = bits[i];
      for (let k = i + 1; k < j; k++) run += seams[k - 1] + bits[k];
      tr = one(run, tb, 0, ui);
      if (tr !== null) break;
    }
    if (tr !== null) hit = true;
    else j = i + 1;
    out += tr ?? bits[i];
    // the seam after the run: a colon reads as one in the language, and sentences run on in Chinese and Japanese
    if (j < bits.length) out += cjk ? (seams[j - 1] === ': ' ? '：' : /^\s+$/.test(seams[j - 1]) ? '' : seams[j - 1]) : seams[j - 1];
    i = j;
  }
  return hit ? out : null;
}

const QUOTE = /^([“"‘'])([\s\S]+)([”"’'])$/;

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
    const ui = tableOf(l).ui;
    const exact = (x: string) => one(x, tb, 0, ui) ?? pieces(x, tb, l, ui);
    // a line a screen lowercased ("missed the playoffs"), found as the engine wrote it
    const whole = (x: string) => {
      const tr = exact(x);
      if (tr !== null || !/^[a-z]/.test(x)) return tr;
      const up = exact(x[0].toUpperCase() + x.slice(1));
      return up === null ? null : l === 'es' || l === 'fr' ? up[0].toLowerCase() + up.slice(1) : up;
    };
    // a quoted line: the words inside the quotes
    const q = core.match(QUOTE);
    const tr = whole(core) ?? (q ? (() => {
      const inner = whole(q[2]);
      return inner === null ? null : q[1] + inner + q[3];
    })() : null);
    if (tr !== null) out = lead + tr + tail;
  }
  cache.set(s, out);
  return out;
}

// an interface sentence's values (t('Preseason: {x}', { x })) are often lines the engine wrote
onSlots(te);

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
