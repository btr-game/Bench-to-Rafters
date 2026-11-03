// Round 40: the languages' catalog. Every English string the screens translate: the literal first
// argument of each t() and tx() call in src (the dev deck aside: it stays English), the data lists the
// screens pass through t() (the plans, the shop's items, the achievements' descriptions, the legendary
// seasons' lines), and story mode's keyed table. For each language it reports what is translated,
// what is missing and what is stale (translated, no longer used), and checks that each translation
// keeps its English's {slots}.
//
//   npx vite-node scripts/i18n.ts                    the report
//   npx vite-node scripts/i18n.ts --missing <dir>    and <dir>/<lang>.json: the missing strings, for a translator
//   npx vite-node scripts/i18n.ts --catalog <file>   the whole English catalog, with where each string is used
//   npx vite-node scripts/i18n.ts --strict           exit 1 on a slot mismatch or a t() of a template literal

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { tableOf, type Lang } from '../src/i18n';
import { STORY_EN } from '../src/content/story';
import { PLAN_TEXT } from '../src/engine/career/season';
import { SHOP_ITEMS } from '../src/content/shop';
import { ACHIEVEMENTS } from '../src/engine/achievements';
import { COMBOS } from '../src/engine/awards/legendary';

const ROOT = path.resolve(__dirname, '..');
const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : undefined;
};

/** Every English string, with the places it is used. */
export function catalog(): { ui: Map<string, Set<string>>; bad: string[] } {
  const ui = new Map<string, Set<string>>();
  const bad: string[] = [];
  const add = (en: string, where: string) => {
    if (!ui.has(en)) ui.set(en, new Set());
    ui.get(en)!.add(where);
  };
  const walk = (dir: string): string[] => fs.readdirSync(dir).flatMap((f) => (fs.statSync(path.join(dir, f)).isDirectory() ? walk(path.join(dir, f)) : /\.tsx?$/.test(f) ? [path.join(dir, f)] : []));
  for (const file of walk(path.join(ROOT, 'src'))) {
    const rel = path.relative(ROOT, file);
    if (rel.startsWith(path.join('src', 'dev'))) continue;
    const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === 't' || n.expression.text === 'tx') && n.arguments.length) {
        const a = n.arguments[0];
        const line = src.getLineAndCharacterOfPosition(n.getStart()).line + 1;
        if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) add(a.text, `${rel}:${line}`);
        else if (ts.isTemplateExpression(a)) bad.push(`${rel}:${line} t() of a template literal: put the values in {slots}`);
        // t(x) of a variable: its English comes from a tx() or one of the data lists below
      }
      ts.forEachChild(n, visit);
    };
    visit(src);
  }
  for (const p of Object.values(PLAN_TEXT)) {
    add(p.label, 'plan');
    add(p.detail, 'plan');
  }
  for (const it of SHOP_ITEMS) {
    add(it.name, 'shop');
    add(it.blurb, 'shop');
    add(it.category, 'shop');
  }
  for (const a of ACHIEVEMENTS) add(a.how, 'achievement');
  for (const c of COMBOS) add(c.line, 'legendary');
  return { ui, bad };
}

const slots = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

function main() {
  const { ui, bad } = catalog();
  const story = Object.keys(STORY_EN);
  const langs: Exclude<Lang, 'en'>[] = ['ko', 'zh', 'ja', 'es', 'fr'];
  let wrong = 0;
  console.log(`English: ${ui.size} interface strings, ${story.length} story lines`);
  const outDir = arg('--missing');
  for (const l of langs) {
    const tb = tableOf(l);
    const miss = [...ui.keys()].filter((en) => !(en in tb.ui));
    const missStory = story.filter((k) => !(k in tb.story));
    const stale = Object.keys(tb.ui).filter((en) => !ui.has(en));
    for (const [en, tr] of Object.entries(tb.ui))
      if (ui.has(en) && slots(en) !== slots(tr)) {
        wrong++;
        console.log(`  ${l}: slots differ: "${en}" -> "${tr}"`);
      }
    for (const [k, tr] of Object.entries(tb.story))
      if (k in STORY_EN && slots(STORY_EN[k]) !== slots(tr)) {
        wrong++;
        console.log(`  ${l}: story slots differ: ${k}`);
      }
    const done = ui.size - miss.length;
    console.log(`${l}: interface ${done}/${ui.size} (${((100 * done) / Math.max(1, ui.size)).toFixed(1)}%), story ${story.length - missStory.length}/${story.length}, stale ${stale.length}`);
    if (outDir) {
      fs.mkdirSync(outDir, { recursive: true });
      const ex = (en: string) => [...(ui.get(en) ?? [])].slice(0, 2).join(' ');
      fs.writeFileSync(path.join(outDir, `${l}.json`), JSON.stringify({ ui: Object.fromEntries(miss.map((en) => [en, ex(en)])), story: Object.fromEntries(missStory.map((k) => [k, STORY_EN[k]])) }, null, 1));
    }
  }
  const cat = arg('--catalog');
  if (cat) fs.writeFileSync(cat, JSON.stringify(Object.fromEntries([...ui].map(([en, w]) => [en, [...w]])), null, 1));
  bad.forEach((b) => console.log(`  ${b}`));
  if (process.argv.includes('--strict') && (wrong || bad.length)) process.exit(1);
}

main();
