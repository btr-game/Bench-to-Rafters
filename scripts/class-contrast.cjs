// Every class combination the code can put on an element, drawn in both themes, with the contrast
// of its text against what is behind it (owner, after a red button with red letters: "try to look
// for similar bugs"). It finds states no screen shows on its own (a confirm button, a picked card),
// which the visual check (visual.cjs) cannot reach. Run it with the dev server up:
//   node scripts/class-contrast.cjs [--url http://localhost:5179/]
// It lists every combination under WCAG AA (4.5:1, or 3:1 for large text: 24px, or 18.66px bold),
// worst first.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5179/';

// class names written in the code: className="..." and the plain parts of className={`...`}
function combos() {
  const out = new Set();
  const walk = (d) => fs.readdirSync(d).forEach((f) => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) return walk(p);
    if (!p.endsWith('.tsx')) return;
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(/className="([^"]+)"/g)) out.add(m[1].trim());
    for (const m of src.matchAll(/className=\{`([^`]+)`\}/g)) {
      const base = m[1].replace(/\$\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim();
      if (base) out.add(base);
      // each optional class written inside the template: base plus that one
      for (const opt of m[1].matchAll(/'\s*([a-z][\w -]*)'/g)) out.add(`${base} ${opt[1].trim()}`.trim());
    }
  });
  walk(path.join(__dirname, '..', 'src'));
  // a class built as prefix-${...} (risk-${level}): each class in the stylesheets with that prefix
  const css = new Set();
  const walkCss = (d) => fs.readdirSync(d).forEach((f) => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) return walkCss(p);
    if (p.endsWith('.css')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/\.([a-z][\w-]*)/g)) css.add(m[1]);
  });
  walkCss(path.join(__dirname, '..', 'src'));
  for (const c of [...out]) {
    const parts = c.split(' ');
    const at = parts.findIndex((x) => x.endsWith('-'));
    if (at < 0) continue;
    for (const k of css) if (k.startsWith(parts[at]) && k.length > parts[at].length) out.add(parts.map((x, i) => (i === at ? k : x)).join(' '));
  }
  return [...out].filter((c) => /\b(btn|chip|tag|badge|pill|risk|plan-tag|choice|seg|kicker|link-btn|icon-btn)\b/.test(c) && !EXPECTED.some((e) => e.test(c)));
}

// combinations never drawn as they are: a base class that always comes with its colour modifier,
// and buttons made for the dark boards and overlays
// (round 31: a postseason page's labels and W/L tags, only ever on the dark moment page, the tag inside a won or lost row)
// (round 35, with prefix-${...} classes filled in: the drama tags in every kind, still only on the
// dark moment page; a story card's kind, whose tag is a child the visual check draws on the League tab)
const EXPECTED = [/^tier-badge$/, /^plan-tag$/, /^drama-tag tag-/, /\bghost-dark\b/, /\bon-dark\b/, /^rr-tag$/, /^mo-tag( champ)?$/, /^story story-/];

(async () => {
  const list = combos();
  // round 35: tags drawn inside a choice button (a risk level, an age edge, a scout's odds), in every
  // state of the button, since a tag in its own colour can vanish on the highlighted one
  const inner = list.filter((c) => /^(risk|plan-tag|scout-rec)\b/.test(c));
  const nested = list.filter((c) => /\bchoice\b/.test(c)).flatMap((outer) => inner.map((tag) => `${outer} > ${tag}`));
  list.push(...nested);
  const b = await chromium.launch();
  const bad = [];
  for (const scheme of ['light', 'dark']) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme })).newPage();
    await p.goto(URL);
    await p.waitForTimeout(1500);
    const found = await p.evaluate((list) => {
      const lum = (c) => {
        const m = c.match(/[\d.]+/g);
        if (!m) return null;
        // rgb(0-255) or color(srgb 0-1), with an optional alpha
        const unit = c.startsWith('color(') ? 1 : 255;
        const [r, g, bl, a = 1] = m.map(Number);
        return { l: [r, g, bl].map((v) => v / unit).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0), a };
      };
      const box = document.createElement('div');
      box.className = 'card';
      box.style.cssText = 'position:fixed;left:0;top:0;width:900px;z-index:99999';
      document.body.appendChild(box);
      const res = [];
      for (const cls of list) {
        // "outer > inner": a tag inside a button
        const [outer, tag] = cls.split(' > ');
        const host = document.createElement(/\bbtn|choice|link-btn|icon-btn\b/.test(outer) ? 'button' : 'span');
        host.className = outer;
        let el = host;
        if (tag) {
          const label = document.createElement('span');
          label.className = 'label';
          el = document.createElement('span');
          el.className = tag;
          label.appendChild(el);
          host.appendChild(label);
        }
        el.textContent = 'Sample text';
        box.appendChild(host);
        const cs = getComputedStyle(el);
        // what is behind the letters: the first painted background up the tree
        let n = el;
        let bg = null;
        while (n) {
          const c = lum(getComputedStyle(n).backgroundColor);
          if (c && c.a > 0.5) {
            bg = c.l;
            break;
          }
          n = n.parentElement;
        }
        const fg = lum(cs.color);
        if (fg && bg !== null && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.2) {
          const ratio = (Math.max(fg.l, bg) + 0.05) / (Math.min(fg.l, bg) + 0.05);
          const size = parseFloat(cs.fontSize);
          const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
          if (ratio < (large ? 3 : 4.5)) res.push({ cls, ratio: Math.round(ratio * 100) / 100, need: large ? 3 : 4.5, size, color: cs.color, bg: getComputedStyle(n).backgroundColor });
        }
        host.remove();
      }
      box.remove();
      return res;
    }, list);
    found.forEach((f) => bad.push({ scheme, ...f }));
  }
  await b.close();
  bad.sort((a, b) => a.ratio - b.ratio);
  console.log(`${list.length} class combinations in two themes (${nested.length} of them a tag inside a choice); under AA: ${bad.length}`);
  for (const f of bad) console.log(`${f.ratio.toFixed(2)}:1 (needs ${f.need}, ${f.size}px)  ${f.scheme.padEnd(5)}  "${f.cls}"  ${f.color} on ${f.bg}`);
})();
