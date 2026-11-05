// Round 41 (owner: "lines the game engine writes, events, storylines, press conferences, the finale.
// do these"): the catalog of the English the engine writes as a career happens. Every prose string
// and template literal in the engine, the content it draws its lines from and the finale's helpers;
// a template's values become {0}, {1}... (each with the code that fills it, for a translator). The
// screens translate these lines as they draw them (src/i18n/engine.ts): a line with no values by its
// name (hashOf), one with values by its template, matched against the line on screen.
//
//   npx vite-node scripts/engineText.ts                  the report (each language's coverage)
//   npx vite-node scripts/engineText.ts --write          and src/i18n/engineTpl.json, the templates the screens match
//   npx vite-node scripts/engineText.ts --chunks <dir> <lines a chunk> [lang]
//                                                        the lines each language is missing, in chunks, for translators
//   npx vite-node scripts/engineText.ts --merge <dir>    folds <dir>/<lang>/*.json ({ name: translation }) into each
//                                                        language's `eng` table (lines no longer in the catalog left out)
//   npx vite-node scripts/engineText.ts --strict         exit 1 on a hash shared by two lines, a stale template file,
//                                                        or a translation with a value its English does not have

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { hashOf } from '../src/i18n/hash';

const ROOT = path.resolve(__dirname, '..');
const LANGS = ['ko', 'zh', 'ja', 'es', 'fr'] as const;
const TPL_FILE = path.join(ROOT, 'src/i18n/engineTpl.json');

/** Where the engine's lines are written. The rest stays English by the owner's marks (names of
 * teams, people, places and awards; achievements; What's new) or is translated as the interface. */
function sources(): string[] {
  const walk = (d: string): string[] => fs.readdirSync(d).flatMap((f) => (fs.statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : /\.ts$/.test(f) ? [path.join(d, f)] : []));
  const engine = walk(path.join(ROOT, 'src/engine')).filter((f) => !/achievement|balance\.ts$|types\.ts$|rng\.ts$/.test(path.basename(f)));
  const content = ['farewell', 'reactions', 'strings', 'origins', 'staff', 'visits', 'franchiseIdentity'].map((n) => path.join(ROOT, `src/content/${n}.ts`));
  const ui = ['finale', 'endings', 'tabNews'].map((n) => path.join(ROOT, `src/ui/${n}.ts`));
  return [...engine, ...content, ...ui];
}

export interface Line {
  h: string;
  en: string;
  /** what fills each value, by its number */
  hint?: Record<string, string>;
  /** where it shows: the event or function it belongs to, and the field */
  ctx: string;
  at: string;
}

const words = (s: string) => (s.match(/[A-Za-z’']{3,}/g) ?? []).length;
const SMALL = new Set(['of', 'the', 'and', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'de', 'la', 'le', 'du', 'del', '&', 'vs', 'vs.']);
/** A name, not a sentence: every word capitalised (Golden State Warriors, Most Valuable Player). */
const nameLike = (s: string) => {
  const w = s.trim().split(/\s+/);
  return w.length <= 6 && !/[.!?:;,]$/.test(s.trim()) && w.every((x) => SMALL.has(x.toLowerCase()) || /^[A-Z0-9“"‘'(]/.test(x));
};
/** Words a template's value can be (round 41): the short words written inside a template's values
 * ('won' or 'lost') are found in the code; these reach a template through a variable. Grammar words
 * that only agree with English ('is', 'plays') are left out: a translation has no use for them. */
const VALUE_WORDS = ['humble', 'confident', 'fiery', 'One of', 'Projected to be one of', 'heavy', 'solid', 'ideal', 'lean', 'skinny', 'daughter', 'son'];
const GRAMMAR = new Set(['is', 'are', 'was', 'were', 'has', 'have', 'go', 'goes', 'play', 'plays', 's', 'es', 'a', 'an', 'the']);
const LOGIC_CALLS = new Set(['includes', 'startsWith', 'endsWith', 'indexOf', 'test', 'match', 'replace', 'split', 'RegExp', 'error', 'warn', 'log', 'has', 'get', 'set', 'delete', 'flag', 'add']);

/** The English already in the interface's tables (t() and the data lists), by the Korean table. */
function interfaceKeys(): Set<string> {
  const ko = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/ko.json'), 'utf8'));
  return new Set(Object.keys(ko.ui));
}

export function catalog(): { lines: Line[]; clash: string[] } {
  const ui = interfaceKeys();
  const byH = new Map<string, Line>();
  const clash: string[] = [];
  for (const file of sources()) {
    const rel = path.relative(ROOT, file);
    const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const ctxOf = (n: ts.Node): string => {
      let field = '';
      let owner = '';
      for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
        if (!field && ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) field = p.name.text;
        if (!field && ts.isCallExpression(p) && ts.isIdentifier(p.expression)) field = `${p.expression.text}()`;
        if (ts.isObjectLiteralExpression(p)) {
          const t = p.properties.find((q) => ts.isPropertyAssignment(q) && ts.isIdentifier(q.name) && q.name.text === 'title' && ts.isStringLiteral(q.initializer));
          if (t && ts.isPropertyAssignment(t)) {
            owner = `event "${(t.initializer as ts.StringLiteral).text}"`;
            break;
          }
        }
        if ((ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p)) && p.name && ts.isIdentifier(p.name)) {
          owner = `${p.name.text}()`;
          break;
        }
        if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) {
          owner = p.name.text;
          break;
        }
      }
      return [owner, field].filter(Boolean).join(' · ') || rel;
    };
    const logic = (n: ts.Node): boolean => {
      const p = n.parent;
      if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind)) return true;
      if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
        const e = p.expression;
        const name = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : '';
        if (LOGIC_CALLS.has(name) || name === 't' || name === 'tx') return true;
      }
      if (ts.isElementAccessExpression(p) || ts.isCaseClause(p) || ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p)) return true;
      if (ts.isPropertyAssignment(p) && p.name === n) return true;
      return false;
    };
    const add = (en: string, hint: Record<string, string> | undefined, n: ts.Node, ctx?: string) => {
      const h = hashOf(en);
      const was = byH.get(h);
      if (was && was.en !== en) clash.push(`${h}: "${was.en}" / "${en}"`);
      if (!was) byH.set(h, { h, en, ...(hint ? { hint } : {}), ctx: ctx ?? ctxOf(n), at: `${rel}:${src.getLineAndCharacterOfPosition(n.getStart()).line + 1}` });
    };
    const visit = (n: ts.Node): void => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        const s = n.text;
        if (!logic(n) && /\s/.test(s.trim()) && words(s) >= 1 && !nameLike(s) && !ui.has(s)) add(s, undefined, n);
        return;
      }
      if (ts.isTemplateExpression(n)) {
        let en = n.head.text;
        const hint: Record<string, string> = {};
        n.templateSpans.forEach((sp, i) => {
          en += `{${i}}` + sp.literal.text;
          hint[i] = sp.expression.getText(src).replace(/\s+/g, ' ').slice(0, 80);
        });
        // a template carries its line only when its own words do (not "{0} {1}" or "{0} points"): two
        // words, or ten letters ("Enrolled at {0} in {1} as a {2}, {3}.")
        const own = en.replace(/\{\d+\}/g, ' ');
        if (!logic(n) && (words(own) >= 2 || (own.match(/[A-Za-z]/g) ?? []).length >= 10)) add(en, hint, n);
        n.templateSpans.forEach((sp) => {
          // the short words a value is written as ('won' or 'lost', 'left' or 'right'), each a line of its own
          const word = (x: ts.Node): void => {
            if ((ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) && !logic(x)) {
              const w = x.text.trim();
              // not a locale ('en-US') or an ordinal's ending (the screens write ordinals in the player's language)
              if (/[A-Za-z]{2}/.test(w) && w.split(/\s+/).length <= 4 && !GRAMMAR.has(w.toLowerCase()) && !/^(st|nd|rd|th|[a-z]{2}-[A-Z]{2})$/.test(w) && !ui.has(w)) add(w, undefined, x, `a value in "${en}"`);
            } else ts.forEachChild(x, word);
          };
          word(sp.expression);
          visit(sp.expression);
        });
        return;
      }
      ts.forEachChild(n, visit);
    };
    visit(src);
  }
  for (const w of VALUE_WORDS) {
    const h = hashOf(w);
    if (!byH.has(h)) byH.set(h, { h, en: w, ctx: 'a word that fills a value in another line', at: 'scripts/engineText.ts VALUE_WORDS' });
  }
  return { lines: [...byH.values()], clash };
}

const slotsOf = (s: string) => new Set(s.match(/\{\d+\}/g) ?? []);

function main() {
  const { lines, clash } = catalog();
  const tpl = lines.filter((l) => /\{\w+\}/.test(l.en));
  const nWords = lines.reduce((a, l) => a + l.en.split(/\s+/).length, 0);
  console.log(`engine lines: ${lines.length} (${tpl.length} with values), ${nWords} words`);
  const tplJson = JSON.stringify(tpl.map((l) => l.en).sort());
  const stale = !fs.existsSync(TPL_FILE) || fs.readFileSync(TPL_FILE, 'utf8').trim() !== tplJson;
  if (process.argv.includes('--write')) {
    fs.writeFileSync(TPL_FILE, tplJson + '\n');
    console.log(`wrote ${path.relative(ROOT, TPL_FILE)} (${tpl.length} templates)`);
  } else if (stale) console.log('  src/i18n/engineTpl.json is out of date: run with --write');
  const byH = new Map(lines.map((l) => [l.h, l]));
  const mi = process.argv.indexOf('--merge');
  if (mi > 0) {
    const dir = process.argv[mi + 1];
    for (const l of LANGS) {
      const sub = path.join(dir, l);
      if (!fs.existsSync(sub)) continue;
      const file = path.join(ROOT, `src/i18n/${l}.json`);
      const d = JSON.parse(fs.readFileSync(file, 'utf8'));
      const eng: Record<string, string> = { ...(d.eng ?? {}) };
      let n = 0;
      for (const f of fs.readdirSync(sub).filter((x) => x.endsWith('.json')).sort())
        for (const [h, tr] of Object.entries(JSON.parse(fs.readFileSync(path.join(sub, f), 'utf8')) as Record<string, string>))
          if (byH.has(h) && typeof tr === 'string' && tr.trim()) {
            eng[h] = tr;
            n++;
          }
      d.eng = Object.fromEntries(Object.entries(eng).filter(([h]) => byH.has(h)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
      fs.writeFileSync(file, JSON.stringify(d, null, 1) + '\n');
      console.log(`merged ${n} lines into ${l}.json`);
    }
  }
  let wrong = 0;
  const missing: Record<string, Line[]> = {};
  for (const l of LANGS) {
    const tb = JSON.parse(fs.readFileSync(path.join(ROOT, `src/i18n/${l}.json`), 'utf8')).eng ?? {};
    missing[l] = lines.filter((x) => !(x.h in tb));
    const old = Object.keys(tb).filter((h) => !byH.has(h));
    for (const [h, tr] of Object.entries(tb) as [string, string][]) {
      const en = byH.get(h)?.en;
      if (!en) continue;
      const have = slotsOf(en);
      const extra = [...slotsOf(tr)].filter((x) => !have.has(x));
      if (extra.length) {
        wrong++;
        console.log(`  ${l}: ${extra.join(' ')} not in the English: "${en}" -> "${tr}"`);
      }
    }
    const done = lines.length - missing[l].length;
    console.log(`${l}: ${done}/${lines.length} (${((100 * done) / Math.max(1, lines.length)).toFixed(1)}%), stale ${old.length}`);
  }
  clash.forEach((c) => console.log(`  hash shared: ${c}`));
  const ci = process.argv.indexOf('--chunks');
  if (ci > 0) {
    const dir = process.argv[ci + 1];
    const per = Number(process.argv[ci + 2] ?? 400);
    const only = process.argv[ci + 3];
    fs.mkdirSync(dir, { recursive: true });
    for (const l of LANGS) {
      if (only && only !== l) continue;
      const m = missing[l];
      for (let i = 0, k = 1; i < m.length; i += per, k++) {
        const part = m.slice(i, i + per).map(({ h, en, hint, ctx }) => ({ h, en, ...(hint ? { hint } : {}), ctx }));
        fs.writeFileSync(path.join(dir, `${l}-${String(k).padStart(2, '0')}.json`), JSON.stringify(part, null, 1));
      }
      console.log(`  ${l}: ${Math.ceil(m.length / per)} chunks in ${dir}`);
    }
  }
  if (process.argv.includes('--strict') && (wrong || clash.length || stale)) process.exit(1);
}

if (!process.env.ENGINE_TEXT_LIB) main();
