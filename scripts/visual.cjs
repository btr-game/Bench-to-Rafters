// The visual check (round 27, owner: "this round may cause a lot of visual bugs, keep thinking of ways
// to prevent that and check multiple times"). Opens every dev deck card at desktop and phone width,
// in light and dark, takes a screenshot and checks the page:
//   hscroll    the page scrolls sideways
//   offscreen  something sticks out past the screen's edge (outside any scroller)
//   clipped    text cut off by its own box (overflow hidden, no ellipsis)
//   spill      text running out of its card, button or chip
//   overlap    two pieces of text drawn over each other
//   contrast   text below WCAG AA against what is behind it
//   tap        a control smaller than 32 px on a phone
//   error      a script error or a console error
//   broken     an image that did not load
//   buried     the card to act on starts more than a screen and a bit down the page
//   covered    at the bottom of the page, the last content sits under a bar fixed to the screen's foot
//   stuck      a full-screen layer that can't scroll, with text or a control past its top or foot (round 32)
// Usage (the dev server running, `npx vite --port 5179`):
//   node scripts/visual.cjs <out dir> [--only id,id] [--configs desktop-light,phone-dark] [--url http://localhost:5179/]
// Then `python3 scripts/visual-diff.py <old out dir> <new out dir>` lists the screens that changed.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const out = args[0];
if (!out) throw new Error('usage: node scripts/visual.cjs <out dir> [--only ids] [--configs names] [--xl] [--url url]');
const opt = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : null;
};
const URL = opt('--url') ?? 'http://localhost:5179/';
const ONLY = opt('--only')?.split(',');
const CONFIGS = [
  { name: 'desktop-light', width: 1440, height: 900, scheme: 'light' },
  { name: 'desktop-dark', width: 1440, height: 900, scheme: 'dark' },
  { name: 'phone-light', width: 390, height: 844, scheme: 'light', phone: true },
  { name: 'phone-dark', width: 390, height: 844, scheme: 'dark', phone: true },
  // round 31: Extra large text (Settings), with --xl or by name
  { name: 'desktop-xl', width: 1440, height: 900, scheme: 'light', text: 'xl', xl: true },
  { name: 'phone-xl', width: 390, height: 844, scheme: 'dark', phone: true, text: 'xl', xl: true },
].filter((c) => (opt('--configs') ? opt('--configs').split(',').includes(c.name) : !c.xl || args.includes('--xl')));

/** Runs in the page: every problem it can find, as plain data. */
function inspect([phone, W]) {
  // the device's width: a phone browser widens its window to fit a page that is too wide
  const found = [];
  const add = (kind, el, detail) => found.length < 400 && found.push({ kind, el: el ? where(el) : '', detail });
  function where(el) {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
      const cls = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      parts.unshift(e.tagName.toLowerCase() + cls);
    }
    const text = (el.textContent || '').trim().slice(0, 40);
    return parts.join(' > ') + (text ? ` "${text}"` : '');
  }
  // with a dialog open, only what is inside it is on screen
  const modal = [...document.querySelectorAll('[aria-modal="true"], .overlay')].pop();
  const shown = (el) => {
    if (modal && !modal.contains(el)) return false;
    // inside a closed fold, only its own summary shows (round 29: folds inside folds, like every
    // series under the bracket, each series a fold of its own)
    for (let d = el.closest('details:not([open])'); d; d = d.parentElement?.closest('details:not([open])')) {
      const own = [...d.children].find((c) => c.tagName === 'SUMMARY');
      if (!own || !own.contains(el)) return false;
    }
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
      if (e.getAttribute('aria-hidden') === 'true') return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const inScroller = (el) => {
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const o = getComputedStyle(e).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true;
    }
    return false;
  };
  const fixed = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') return true;
    return false;
  };

  if (document.documentElement.scrollWidth > W + 1) add('hscroll', null, `${document.documentElement.scrollWidth}px wide on a ${W}px screen`);

  const all = [...document.querySelectorAll('body *')].filter((e) => !e.closest('svg') || e.tagName === 'svg');
  const flagged = new Set();
  for (const el of all) {
    if (flagged.has(el.parentElement)) {
      flagged.add(el);
      continue;
    }
    const r = el.getBoundingClientRect();
    if ((r.right > W + 2 || r.left < -2) && r.width > 0 && !inScroller(el) && !fixed(el) && shown(el)) {
      add('offscreen', el, `${Math.round(r.left)} to ${Math.round(r.right)}`);
      flagged.add(el);
    }
  }

  // text: one entry per text node, with its line boxes
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('svg, script, style, noscript, option, .sr-only') || !shown(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    // only the part a scroller lets through is on screen (a journal scrolled past its first seasons)
    const clips = [];
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const es = getComputedStyle(e);
      if (/auto|scroll|hidden|clip/.test(es.overflowX + es.overflowY)) clips.push(e.getBoundingClientRect());
    }
    const rects = [...range.getClientRects()].filter((q) => q.width > 1 && q.height > 1 && clips.every((c) => q.bottom > c.top + 1 && q.top < c.bottom - 1 && q.right > c.left + 1 && q.left < c.right - 1));
    if (rects.length) texts.push({ n, el, rects });
  }

  for (const t of texts) {
    const s = getComputedStyle(t.el);
    // clipped by its own box
    for (let e = t.el; e && e !== document.body; e = e.parentElement) {
      const es = getComputedStyle(e);
      const hid = (v) => v === 'hidden' || v === 'clip';
      if ((hid(es.overflowX) && e.scrollWidth > e.clientWidth + 2 && es.textOverflow !== 'ellipsis') || (hid(es.overflowY) && e.scrollHeight > e.clientHeight + 2 && !es.webkitLineClamp?.match(/\d/))) {
        const er = e.getBoundingClientRect();
        if (t.rects.some((q) => q.right > er.right + 1 || q.bottom > er.bottom + 1 || q.left < er.left - 1)) add('clipped', t.el, `cut off by ${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`);
        break;
      }
      if (e.matches('.card, button, .choice, .chip, .btn, .tag, .mode-chip, .result-chip')) break;
    }
    // running out of its card, button or chip
    const box = t.el.closest('.card, button, .choice, .chip, .btn, .tag, .mode-chip, .result-chip, .risk');
    // badges placed on a card's edge on purpose are absolutely positioned; text inside a scroller of
    // its own (a journal, a wide table) is the scroller's to show
    let placed = false;
    for (let e = t.el; box && e && e !== box; e = e.parentElement) {
      const es = getComputedStyle(e);
      if (es.position === 'absolute' || /auto|scroll|hidden|clip/.test(es.overflowX + es.overflowY)) placed = true;
    }
    if (box && !placed) {
      const br = box.getBoundingClientRect();
      const over = t.rects.find((q) => q.right > br.right + 2 || q.left < br.left - 2 || q.bottom > br.bottom + 2 || q.top < br.top - 2);
      if (over) add('spill', t.el, `out of ${box.tagName.toLowerCase()}.${String(box.className).split(' ')[0]} by ${Math.round(Math.max(over.right - br.right, br.left - over.left, over.bottom - br.bottom, br.top - over.top))}px`);
    }
    // contrast against the first solid background behind it
    if (!t.el.closest('button:disabled, [aria-disabled="true"], input:disabled')) {
      const rgba = (c) => {
        const v = (c.match(/[\d.]+/g) || []).map(Number);
        if (c.startsWith('color(')) return [v[0] * 255, v[1] * 255, v[2] * 255, v[3]];
        return v;
      };
      const lum = ([r, g, b]) => {
        const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      let bg = null;
      let image = false;
      for (let e = t.el; e; e = e.parentElement) {
        const es = getComputedStyle(e);
        if (es.backgroundImage !== 'none' && !es.backgroundImage.startsWith('linear-gradient(rgba(0, 0, 0, 0)')) {
          image = true;
          break;
        }
        const c = rgba(es.backgroundColor);
        if (c.length >= 3 && (c[3] === undefined || c[3] > 0.9)) {
          bg = c;
          break;
        }
      }
      const fg = rgba(s.color);
      if (!image && bg && fg.length >= 3 && (fg[3] === undefined || fg[3] > 0.5)) {
        const a = lum(fg);
        const b = lum(bg);
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const size = parseFloat(s.fontSize);
        const large = size >= 24 || (size >= 18.6 && +s.fontWeight >= 700);
        if (ratio < (large ? 3 : 4.5)) add('contrast', t.el, `${ratio.toFixed(2)}:1 (${s.color} on rgb(${bg.slice(0, 3).join(', ')}))`);
      }
    }
  }

  // two pieces of text drawn over each other (line boxes of different text nodes), on the same layer:
  // a menu, a toast, the guide's tip or a bar fixed to the screen sits over the page on purpose
  const layerOf = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const es = getComputedStyle(e);
      if (es.position === 'fixed' || es.position === 'sticky' || ((es.position === 'absolute' || es.position === 'relative') && es.zIndex !== 'auto')) return e;
    }
    return document.body;
  };
  for (const t of texts) t.layer = layerOf(t.el);
  const lines = texts.flatMap((t) => t.rects.map((q) => ({ t, q })));
  let overlaps = 0;
  for (let i = 0; i < lines.length && overlaps < 30; i++)
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i];
      const b = lines[j];
      if (a.t === b.t || a.t.layer !== b.t.layer) continue;
      const band = (q) => ({ left: q.left, right: q.right, top: q.top + q.height * 0.22, bottom: q.bottom - q.height * 0.22 });
      const A = band(a.q);
      const B = band(b.q);
      const w = Math.min(A.right, B.right) - Math.max(A.left, B.left);
      const h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
      if (w <= 0 || h <= 0) continue;
      if (h / Math.min(A.bottom - A.top, B.bottom - B.top) > 0.4 && w / Math.min(A.right - A.left, B.right - B.left) > 0.3) {
        add('overlap', a.t.el, `with ${where(b.t.el)}`);
        overlaps++;
        break;
      }
    }

  if (phone)
    for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role="switch"]')) {
      if (!shown(el)) continue;
      // a box inside its label is tapped through the label
      const r = (el.closest('label') ?? el).getBoundingClientRect();
      if (r.height < 32 || r.width < 32) add('tap', el, `${Math.round(r.width)}x${Math.round(r.height)}`);
    }

  // the card to act on (the season's main card) starts within the first screen and a bit (round 27:
  // on phones the folded extras jumped above it, four cards down)
  const main = document.querySelector('.o-main');
  if (main && shown(main)) {
    const top = main.getBoundingClientRect().top + scrollY;
    if (top > innerHeight * 1.2) add('buried', main, `starts ${Math.round(top)}px down a ${innerHeight}px screen`);
  }

  for (const img of document.querySelectorAll('img')) if (img.complete && img.naturalWidth === 0 && shown(img)) add('broken', img, img.src.slice(0, 60));

  // a layer fixed to the screen (a pop-up, a scrim, a bar) inside a parent that moves (a transform,
  // a filter, will-change, contain): it is then fixed to that parent instead, and a pop-up's
  // backdrop covers part of the page (found on a phone's statue plaza, owner: "make it popup in
  // the middle of the screen")
  for (const el of document.querySelectorAll('body *')) {
    if (getComputedStyle(el).position !== 'fixed') continue;
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.transform !== 'none' || s.filter !== 'none' || s.perspective !== 'none' || /transform|filter/.test(s.willChange) || /paint|layout|strict|content/.test(s.contain)) {
        add('trapped', el, `fixed inside ${e.tagName.toLowerCase()}.${String(e.className).trim().split(/\s+/)[0] ?? ''}`);
        break;
      }
    }
  }
  // round 32 (owner: "i cant scroll in the day one screen"): a layer that fills the screen but
  // can't scroll (its overflow hidden by a stray rule), with text or a control past its top or
  // foot. Scripts can still scroll such a layer (Guide mode scrolled to Continue), so what is
  // above the fold is lost too.
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' || /auto|scroll/.test(s.overflowY) || !shown(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < innerWidth * 0.9 || r.height < innerHeight * 0.9) continue;
    const out = [...el.querySelectorAll('button, a, input, h1, h2, h3, p, .moment-title')].find((c) => {
      if (!shown(c) || c.closest('[aria-hidden="true"]')) return false;
      for (let e = c.parentElement; e && e !== el; e = e.parentElement) if (/auto|scroll/.test(getComputedStyle(e).overflowY)) return false;
      const cr = c.getBoundingClientRect();
      return cr.bottom > Math.min(r.bottom, innerHeight) + 2 || cr.top < Math.max(r.top, 0) - 2;
    });
    if (out) add('stuck', out, `in ${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/).slice(0, 3).join('.')}, overflow ${s.overflowY}`);
  }
  return found;
}

async function runConfig(browser, cfg) {
  const dir = path.join(out, cfg.name);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: cfg.width, height: cfg.height }, colorScheme: cfg.scheme, reducedMotion: 'reduce', deviceScaleFactor: 1, hasTouch: !!cfg.phone, isMobile: !!cfg.phone });
  const page = await ctx.newPage();
  let errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 200)}`));
  await page.addInitScript((text) => {
    try {
      sessionStorage.setItem('btr-dev-on', '1');
      if (text) localStorage.setItem('btr-text', text);
    } catch {}
    // the same random draws and the same clock every run, so two runs differ only where the code did
    let seed = 20261031;
    Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const RealDate = Date;
    const fixed = new RealDate('2026-10-31T12:00:00Z').getTime();
    class FixedDate extends RealDate {
      constructor(...a) {
        super(...(a.length ? a : [fixed]));
      }
      static now() {
        return fixed;
      }
    }
    window.Date = FixedDate;
  }, cfg.text ?? null);
  await page.goto(URL);
  await page.waitForFunction(() => window.__deck, null, { timeout: 30000 });
  // no transitions or animations in the shots: what is checked is where things settle
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation-duration: 0s !important; animation-delay: 0s !important; caret-color: transparent !important; }' });
  const ids = (await page.evaluate(() => window.__deck.ids)).filter((id) => !ONLY || ONLY.includes(id));
  const report = {};
  for (const id of ids) {
    errors = [];
    await page.evaluate((x) => window.__deck.open(x), id);
    // dealt: the card's bar is up, or the deck says no career reached it
    await page.waitForSelector('.dk-bar, .dk-miss', { timeout: 60000 }).catch(() => errors.push('timeout: the card never opened'));
    await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelector('.dk-bar')?.setAttribute('style', 'display:none'));
    const missed = await page.$('.dk-miss');
    const found = missed ? [] : await page.evaluate(inspect, [!!cfg.phone, cfg.width]);
    // at the very bottom of the page, the last of the content clears the bars fixed to the screen's foot
    // (the tab bar and the next-step pill on a phone)
    if (!missed) {
      const covered = await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        const bars = [...document.querySelectorAll('body *')].filter((e) => {
          const s = getComputedStyle(e);
          if (s.position !== 'fixed' || s.display === 'none' || s.visibility === 'hidden' || e.closest('[aria-modal="true"], .overlay, .dk-bar, .ach-toasts')) return false;
          const r = e.getBoundingClientRect();
          return r.height > 0 && r.bottom >= innerHeight - 2 && r.top > innerHeight / 2;
        });
        if (!bars.length) return null;
        const top = Math.min(...bars.map((b) => b.getBoundingClientRect().top));
        const wrap = document.querySelector('.wrap');
        const last = wrap && [...wrap.children].filter((c) => c.getBoundingClientRect().height > 0).pop();
        const bottom = last ? last.getBoundingClientRect().bottom : 0;
        window.scrollTo(0, 0);
        return bottom > top + 1 ? `${Math.round(bottom - top)}px of ${last.className || last.tagName} under the bar` : null;
      });
      if (covered) found.push({ kind: 'covered', el: '', detail: covered });
    }
    for (const e of errors) found.push({ kind: 'error', el: '', detail: e });
    report[id] = missed ? [{ kind: 'skipped', el: '', detail: await missed.innerText() }] : found;
    await page.screenshot({ path: path.join(dir, `${id}.png`), fullPage: true }).catch(() => {});
    // round 27: a card that reloads the page is a bug of its own, not the end of the run
    await page.evaluate(() => window.__deck.back()).catch(async (e) => {
      report[id] = [...(report[id] ?? []), { kind: 'error', el: '', detail: `the page navigated away (${String(e.message).split('\n')[0]})` }];
      await page.waitForFunction(() => window.__deck, null, { timeout: 30000 }).catch(() => {});
    });
    await page.waitForTimeout(150);
  }
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 1));
  await ctx.close();
  return report;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const reports = await Promise.all(CONFIGS.map((c) => runConfig(browser, c)));
  await browser.close();
  // the summary: counts by kind, then every screen with something to look at
  const lines = [];
  CONFIGS.forEach((c, i) => {
    const rep = reports[i];
    const kinds = {};
    for (const list of Object.values(rep)) for (const f of list) kinds[f.kind] = (kinds[f.kind] ?? 0) + 1;
    lines.push(`== ${c.name}: ${Object.keys(rep).length} screens · ${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(' · ') || 'clean'}`);
    for (const [id, list] of Object.entries(rep)) {
      const real = list.filter((f) => f.kind !== 'skipped');
      if (!real.length) continue;
      lines.push(`  ${id}:`);
      const seen = new Set();
      for (const f of real) {
        const key = `${f.kind}|${f.el}`;
        if (seen.has(key)) continue;
        seen.add(key);
        lines.push(`    ${f.kind.padEnd(9)} ${f.el}${f.detail ? ` — ${f.detail}` : ''}`);
      }
    }
  });
  fs.writeFileSync(path.join(out, 'summary.txt'), lines.join('\n') + '\n');
  console.log(lines.filter((l) => l.startsWith('==')).join('\n'));
})();
