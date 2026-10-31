// The itch.io cover (owner: "can you make me a cover image of the game?"): the intro page at
// 630 x 500 (and 1260 x 1000 for sharp screens), title plate made smaller, the line and the Start
// button hidden, the play frozen at a moment (seconds into the intro's 14 s play and its 25 s
// venue cycle). With the dev server up: node scripts/itch-cover.cjs <out dir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch();
  // [name, seconds into the 14 s play, seconds into the 25 s venue cycle]
  const shots = [['cover', 5.95, 22], ['cover-steal', 9.24, 22]];
  for (const dsf of [1, 2]) {
    const ctx = await b.newContext({ viewport: { width: 630, height: 500 }, deviceScaleFactor: dsf });
    const p = await ctx.newPage();
    await p.goto('http://localhost:5179/');
    await p.waitForSelector('.intro');
    await p.addStyleTag({ content: `
      .intro { --pl: 188px !important; --feet: 5% !important; }
      .intro-line, .intro-go, .in-where { display: none !important; }
      .in-word { height: 54px !important; }
      .intro-front { margin-top: 16px !important; padding: 14px 22px 16px !important; gap: 0 !important; }
      .lp, .foot-bar, .dev-door { display: none !important; }
    ` });
    await p.waitForTimeout(1200);
    for (const [name, sec, ven] of shots) {
      await p.evaluate(([sec, ven]) => {
        for (const a of document.getAnimations()) {
          const n = a.animationName ?? '';
          a.pause();
          a.currentTime = (n === 'in-scene' ? ven : n.startsWith('in-bounce') ? 0 : sec) * 1000;
        }
      }, [sec, ven]);
      await p.waitForTimeout(150);
      await p.screenshot({ path: `${out}/${name}-${dsf === 1 ? '630x500' : '1260x1000'}.png` });
    }
    await ctx.close();
  }
  await b.close();
})();
