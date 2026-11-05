// The tutorial, played end to end in a browser (round 33, owner: "let's just try to prepare as much
// as possible so that no bug appears in the tutorial"). Round 35 (owner: "make only the beginner
// level of tutorial necessary"): from a fresh device, the intro, the beginner level, the graduation
// page and the full start page, the way a player would: every lesson is answered (Got it, or the
// highlighted control), every decision takes its first choice, story pages are read, the shop is
// left, the last shot is taken. On the full start page the modes the road map opens must still be
// locked (Reality hits hard, Shoot for the stars, the mini-games). Fails on a script error, when a
// lock is open, or when nothing on screen moves the tutorial on.
// Round 37: graduation's button takes the plane to the main land, the start page's map. With
// reduced motion (the default here) the flight is skipped; with MOTION=1 it must play and land by
// itself, and the device must remember it (btr-plane-seen). The locks are the map's places: the
// cage, the dome and the island.
//
//   node scripts/tutorial-e2e.cjs [desk|phone] [out dir]     (dev server on :5179)
//   LESSON_IDS=<ids, comma-separated> lists the lessons never shown; MOTION=1 plays the animations

const { chromium } = require('playwright');
const fs = require('fs');

const VIEW = process.argv[2] === 'phone' ? { width: 390, height: 844 } : { width: 1366, height: 900 };
const OUT = process.argv[3] || '/tmp/tutorial-e2e';
const URL = process.env.URL || 'http://localhost:5179/';
fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(`${OUT}/live.txt`, { force: true });

(async () => {
  const b = await chromium.launch();
  // MOTION=1 plays the animations (the action cam's "play the last minutes" only shows with them)
  const ctx = await b.newContext({ viewport: VIEW, reducedMotion: process.env.MOTION ? 'no-preference' : 'reduce', hasTouch: process.argv[2] === 'phone' });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('e2e')) return;
    sessionStorage.setItem('e2e', '1');
    localStorage.clear();
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL);
  await p.waitForTimeout(1500);

  const seen = new Map(); // lesson part -> count
  const log = [];
  let idle = 0;
  let last = '';
  let same = 0;
  let repeat = 0;
  let lastDid = '';
  let flew = false;
  const t0 = Date.now();
  const vis = async (sel) => {
    const l = p.locator(sel).first();
    return (await l.count()) > 0 && (await l.isVisible().catch(() => false)) ? l : null;
  };
  const click = async (sel) => {
    const l = await vis(sel);
    if (!l) return false;
    if (await l.isDisabled().catch(() => false)) return false;
    await l.click({ timeout: 3000 }).catch(() => {});
    return true;
  };

  for (let i = 0; i < 6000; i++) {
    await p.waitForTimeout(40);
    let did = '';
    const tip = await vis('.lesson-tip');
    if (tip) {
      const kicker = (await tip.locator('.kicker').innerText().catch(() => '')).split('·')[0].trim();
      const text = await tip.locator('p').innerText().catch(() => '');
      if (text !== last) {
        seen.set(kicker, (seen.get(kicker) ?? 0) + 1);
        const line = `${((Date.now() - t0) / 1000).toFixed(1)}s ${kicker}: ${text.slice(0, 70)}`;
        log.push(line);
        fs.appendFileSync(`${OUT}/live.txt`, line + '\n');
      }
      const got = tip.locator('button.btn', { hasText: 'Got it' });
      if (await got.count()) {
        await got.click().catch(() => {});
        did = 'got';
      } else {
        // a lesson to do: a real control inside the highlighted one, where the note does not cover it
        const at = await p.evaluate(() => {
          const ring = document.querySelector('.lesson-ring')?.getBoundingClientRect();
          const tipBox = document.querySelector('.lesson-tip')?.getBoundingClientRect();
          if (!ring) return null;
          const inside = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
          for (const el of document.querySelectorAll('button, a, input, summary, [role="button"]')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || el.disabled || el.hasAttribute('data-enter')) continue;
            const x = r.left + r.width / 2;
            // round 39: a point the control itself gets (its top may sit under the bar fixed to the top)
            for (const y of [r.top + Math.min(r.height / 2, 20), r.top + r.height / 2, r.bottom - 8]) {
              if (!inside(ring, x, y) || y < 0 || y > innerHeight) continue;
              if (tipBox && inside(tipBox, x, y)) continue;
              const hit = document.elementFromPoint(x, y);
              if (hit && (el === hit || el.contains(hit))) return { x, y };
            }
          }
          return null;
        });
        if (at) await p.mouse.click(at.x, at.y);
        else await p.evaluate(() => window.scrollBy(0, 160)); // a thumb scrolling through a tall control
        did = 'act';
      }
      same = text === last ? same + 1 : 0;
      last = text;
      if (same > 60) {
        await p.screenshot({ path: `${OUT}/stuck.png` });
        log.push(`STUCK on a lesson: ${text}`);
        break;
      }
    } else if (await click('.intro-go')) did = 'intro/thanks';
    // round 37: the flight lands by itself; it is waited for, not skipped
    else if (await vis('.plane-flight')) {
      if (!flew) log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s the plane to the main land`);
      flew = true;
      did = 'flying';
    } else if (await click('[data-tour="graduate"]')) did = 'graduate';
    else if ((await vis('[data-tour="mode-regular"]')) && !(await vis('.lesson-tip'))) {
      const road = await p.evaluate(() => JSON.parse(localStorage.getItem('btr-road-v1') || '{}'));
      if (road.free) {
        log.push('the full start page, Regular guy recommended');
        break;
      }
    } else if (await click('[role="dialog"] [data-skip]')) did = 'skip reel';
    else if (await click('[role="dialog"] button:has-text("Skip to the result")')) did = 'skip final';
    else if (await click('[role="dialog"] .moment-btn')) did = 'moment';
    else if (await vis('.set-menu')) {
      await p.keyboard.press('Escape');
      did = 'close settings';
    } else if (await click('.level-end .btn')) did = 'level end';
    else if (await vis('.focus-grid') && (await p.locator('.focus-grid button[aria-pressed="true"]').count()) < 2) {
      await p.locator('.focus-grid button[aria-pressed="false"]').first().click();
      did = 'focus';
    } else if (await click('[data-tour="create-start"]')) did = 'start';
    else if (await click('[data-tour="create-next"]')) did = 'next';
    else if (await click('.o-main [data-tour="live-meter"] .sb-meter-wrap .btn')) did = 'shot';
    else if (await click('.o-main [data-enter]')) did = 'leave shop';
    else if (await click('.o-main .btn.block:not(:disabled)')) did = 'confirm';
    else if (await click('.o-main button.choice:not(:disabled), .o-main button.offer, .o-main button.role-card')) did = 'choose';
    else if (await click('.main-go')) did = 'go';
    else if (await click('.next-step')) did = 'next step';
    if (did) {
      idle = 0;
      fs.appendFileSync(`${OUT}/live.txt`, `  ${did}\n`);
      repeat = did === lastDid && !tip ? repeat + 1 : 0;
      lastDid = did;
      if (repeat > 200) {
        await p.screenshot({ path: `${OUT}/stuck.png` });
        fs.writeFileSync(`${OUT}/stuck.txt`, await p.evaluate(() => document.body.innerText));
        log.push(`STUCK repeating: ${did}`);
        break;
      }
    }
    else if (++idle > 120) {
      await p.screenshot({ path: `${OUT}/stuck.png`, fullPage: true });
      fs.writeFileSync(`${OUT}/stuck.txt`, await p.evaluate(() => document.body.innerText));
      log.push('STUCK: nothing on screen moved the tutorial on');
      break;
    }
  }
  const road = await p.evaluate(() => JSON.parse(localStorage.getItem('btr-road-v1') || '{}'));
  // round 35: what the road map opens is still shut on the full start page; round 37: on its map
  const locks = await p.evaluate(() => {
    const st = (id) => document.querySelector(`.ml-spot[data-place="${id}"]`)?.getAttribute('data-state');
    return { regular: !!st('gym') && st('gym') !== 'locked', reality: st('cage') === 'locked', stars: st('dome') === 'locked', minis: st('island') === 'locked' };
  });
  const shut = locks.regular && locks.reality && locks.stars && locks.minis;
  // round 37: the flight plays once with motion (and is remembered), never with reduced motion
  const seenPlane = await p.evaluate(() => localStorage.getItem('btr-plane-seen'));
  const plane = process.env.MOTION ? flew && seenPlane === '1' : !flew;
  await p.screenshot({ path: `${OUT}/end.png`, fullPage: true });
  fs.writeFileSync(`${OUT}/log.txt`, log.join('\n'));
  const all = (process.env.LESSON_IDS || '').split(',').filter(Boolean);
  const missed = all.filter((id) => !(road.lessons || []).includes(id));
  const out = { view: VIEW.width, seconds: Math.round((Date.now() - t0) / 1000), passed: Object.keys(road.passed || {}), free: !!road.free, locks, plane: { flew, seen: seenPlane === '1', ok: plane }, lessons: (road.lessons || []).length, missed, seen: Object.fromEntries(seen), errors };
  console.log(JSON.stringify(out, null, 1));
  await b.close();
  process.exit(road.free && shut && plane && !errors.length ? 0 : 1);
})();
