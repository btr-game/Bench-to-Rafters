// The dev deck keeps out of the player's game (round 27, owner: "the dev deck shouldn't interfere
// with any achievements"). Round 28: the deck is a page the game flips to in place, so this plays it
// the way a player would: a career in progress, into the deck through the Developer door, every card
// dealt (they earn every achievement, play and end careers, fill the log), Back to the game. Then the
// career is back on screen as it was, the game's storage is exactly as it was, and the tab never
// reloaded or opened another.
//   DECK_PW=... node scripts/dev-apart.cjs        (dev server on port 5179)
const { chromium } = require('playwright');
(async () => {
  if (!process.env.DECK_PW) {
    console.log('set DECK_PW to the dev deck password');
    process.exit(2);
  }
  const b = await chromium.launch();
  let bad = 0;
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  let pages = 1;
  ctx.on('page', () => pages++);
  await p.addInitScript(() => {
    try {
      localStorage.setItem('btr-intro-seen', '1');
    } catch {}
  });
  await p.goto('http://localhost:5179/');
  await p.waitForTimeout(1500);
  // a player with one achievement, one career counted, and a career under way
  await p.evaluate(() => {
    localStorage.setItem('btr-achv-v1', JSON.stringify({ got: { firstcareer: 1700000000000 }, t: { careers: 1, byMode: { standard: 1 } } }));
    window.__btr.setState({ intro: false, news: false });
    window.__btr.getState().start({ name: 'Apart Test', number: 8, pos: 'SF', archetype: 1, focus: ['SHT', 'ATH'], hometown: 'Tulsa', highSchool: 'Central High' }, 4242);
  });
  await p.waitForFunction(() => window.__btr.getState().game?.player.name === 'Apart Test', null, { timeout: 30000 });
  // the new career's opening moments out of the way, then another tab, to see it come back
  await p.evaluate(() => (window.__btr.getState().mutate((g) => (g.moments = [])), window.__btr.getState().setTab('player')));
  await p.waitForTimeout(1200); // the autosave
  const marker = () => p.evaluate(() => { const s = window.__btr.getState(); return s.game ? `${s.game.player.name} ${s.game.year} ${s.game.step} tab=${s.tab}` : 'no game'; });
  const was = await marker();
  const snap = () => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith('btr-dev:')) o[k] = localStorage[k]; } return o; });
  const before = await snap();
  console.log('game before:', was);
  console.log('real keys before:', Object.keys(before).join(', '));
  // the Developer door at the foot of the page
  await p.locator('.dev-door summary').first().click();
  await p.locator('.dev-door input[type=password]').first().fill(process.env.DECK_PW);
  await p.locator('.dev-door button').first().click();
  await p.waitForFunction(() => window.__deck, null, { timeout: 30000 });
  console.log('deck open in place:', pages === 1 ? 'yes' : `NO (${pages} pages)`);
  if (pages !== 1) bad++;
  const ids = await p.evaluate(() => window.__deck.ids);
  for (const id of ids) {
    await p.evaluate((x) => window.__deck.open(x), id);
    await p.waitForSelector('.dk-bar, .dk-miss', { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(700);
    await p.evaluate(() => window.__deck.back());
    await p.waitForTimeout(100);
  }
  const devKeys = await p.evaluate(() => { const o = []; for (let i = 0; i < localStorage.length; i++) o.push(localStorage.key(i)); return o.filter((k) => k.startsWith('btr-dev:')); });
  console.log('dev keys written:', devKeys.join(', '));
  const during = await snap();
  const changed = [...new Set([...Object.keys(before), ...Object.keys(during)])].filter((k) => before[k] !== during[k]);
  console.log('real keys changed by the deck:', changed.length ? changed.join(', ') : 'none');
  bad += changed.length;
  // back to the game, in place
  await p.getByRole('button', { name: 'Back to the game' }).first().click();
  await p.waitForTimeout(1500);
  const now = await marker();
  console.log('game after:', now, now === was ? '(as it was)' : '(CHANGED)');
  if (now !== was) bad++;
  const back = await snap();
  const changed2 = [...new Set([...Object.keys(before), ...Object.keys(back)])].filter((k) => before[k] !== back[k]);
  console.log('real keys changed after leaving:', changed2.length ? changed2.join(', ') : 'none');
  bad += changed2.length;
  const mark = await p.evaluate(() => sessionStorage.getItem('btr-dev-on'));
  console.log('dev mark cleared:', mark === null ? 'yes' : 'NO');
  if (mark !== null) bad++;
  console.log('errors:', errors.join(' | ') || 'none');
  bad += errors.length;
  await b.close();
  process.exit(bad ? 1 : 0);
})();
