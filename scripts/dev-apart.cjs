// The dev deck keeps out of the player's game (round 27, owner: "the dev deck shouldn't interfere
// with any achievements"). Deal every card (they earn every achievement, play and end careers, fill
// the log), then check every key the game keeps outside dev mode is exactly as it was.
//   node scripts/dev-apart.cjs        (dev server on port 5179)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  let bad = 0;
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5179/');
  await p.waitForTimeout(1500);
  // a player with one achievement and one career counted
  await p.evaluate(() => {
    localStorage.setItem('btr-achv-v1', JSON.stringify({ got: { firstcareer: 1700000000000 }, t: { careers: 1, byMode: { standard: 1 } } }));
  });
  const snap = () => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith('btr-dev:')) o[k] = localStorage[k]; } return o; });
  const before = await snap();
  console.log('real keys before:', Object.keys(before).join(', '));
  await p.evaluate(() => sessionStorage.setItem('btr-dev-on', '1'));
  await p.reload();
  await p.waitForFunction(() => window.__deck);
  const ids = await p.evaluate(() => window.__deck.ids);
  // every card: the deck sets every achievement, plays careers, ends some (retired cards count careers)
  for (const id of ids) {
    await p.evaluate((x) => window.__deck.open(x), id);
    await p.waitForSelector('.dk-bar, .dk-miss', { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(700);
    await p.evaluate(() => window.__deck.back());
    await p.waitForTimeout(100);
  }
  const devKeys = await p.evaluate(() => { const o = []; for (let i = 0; i < localStorage.length; i++) o.push(localStorage.key(i)); return o.filter((k) => k.startsWith('btr-dev:')); });
  console.log('dev keys written:', devKeys.join(', '));
  const after = await snap();
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => before[k] !== after[k]);
  console.log('real keys changed by the deck:', changed.length ? changed.join(', ') : 'none');
  bad += changed.length;
  await p.evaluate(() => sessionStorage.removeItem('btr-dev-on'));
  await p.reload();
  await p.waitForTimeout(1500);
  const back = await snap();
  console.log('achievements after leaving dev:', back['btr-achv-v1'] === before['btr-achv-v1'] ? 'unchanged' : 'CHANGED: ' + back['btr-achv-v1']?.slice(0, 200));
  if (back['btr-achv-v1'] !== before['btr-achv-v1']) bad++;
  await b.close();
  process.exit(bad ? 1 : 0);
})();
