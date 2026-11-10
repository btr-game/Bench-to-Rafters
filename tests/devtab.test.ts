// The dev deck as a page of the game (round 28, owner: "can you make the dev deck just another page
// in the game instead of having to open another tab in the browser? just like how the minigame page
// appears", and "theme and court of dev deck should always be the same with the main game"): a switch
// flipped in place, with the deck's storage kept apart while it is on.

import { afterEach, describe, expect, it, vi } from 'vitest';

/** A browser's two stores, as plain maps behind a Storage class the prefix can patch. */
function browser(session: Record<string, string> = {}) {
  class FakeStorage {
    m = new Map<string, string>();
    getItem(k: string) {
      return this.m.get(k) ?? null;
    }
    setItem(k: string, v: string) {
      this.m.set(k, String(v));
    }
    removeItem(k: string) {
      this.m.delete(k);
    }
  }
  const local = new FakeStorage();
  const sess = new FakeStorage();
  for (const [k, v] of Object.entries(session)) sess.m.set(k, v);
  vi.stubGlobal('Storage', FakeStorage);
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', sess);
  return { local: local.m, session: sess.m };
}
const load = async () => {
  vi.resetModules();
  const mode = await import('../src/dev/mode');
  const storage = await import('../src/dev/storage');
  return { ...mode, ...storage };
};
afterEach(() => vi.unstubAllGlobals());

describe('the dev deck as a page of the game', () => {
  it('starts as the game, or as the deck in a tab reloaded inside it', async () => {
    browser();
    expect((await load()).isDev()).toBe(false);
    browser({ 'btr-dev-on': '1' });
    expect((await load()).isDev()).toBe(true);
  });

  it('flips in place and tells whoever listens, keeping the mark for a reload', async () => {
    const b = browser();
    const m = await load();
    const heard: boolean[] = [];
    const stop = m.onDev((on) => heard.push(on));
    m.setDev(true);
    expect(m.isDev()).toBe(true);
    expect(b.session.get('btr-dev-on')).toBe('1');
    m.setDev(true); // no change, no call
    m.setDev(false);
    stop();
    m.setDev(true);
    expect(heard).toEqual([true, false]);
  });

  it('keeps its storage apart while it is on, and shares the theme and the court', async () => {
    const b = browser();
    const m = await load();
    localStorage.setItem('btr-achv-v1', 'game');
    m.setDev(true);
    expect(localStorage.getItem('btr-achv-v1')).toBeNull(); // the deck's own book, empty so far
    localStorage.setItem('btr-achv-v1', 'deck');
    localStorage.setItem('btr-theme', 'dark');
    localStorage.setItem('btr-court', 'street');
    expect(m.readReal('btr-achv-v1')).toBe('game');
    m.setDev(false);
    expect(localStorage.getItem('btr-achv-v1')).toBe('game');
    expect(localStorage.getItem('btr-theme')).toBe('dark');
    expect(localStorage.getItem('btr-court')).toBe('street');
    expect(b.local.get('btr-dev:btr-achv-v1')).toBe('deck');
    expect(b.local.has('btr-dev:btr-theme')).toBe(false);
  });

  it('keeps the deck out with a wrong password', async () => {
    browser();
    const m = await load();
    expect(m.devPassword('not-the-password')).toBe(false);
    expect(m.isDev()).toBe(false);
  });
});

describe('Share the game', () => {
  it('earns Word of Mouth from the totals alone, with no career open', async () => {
    const { earnedNow, NO_TOTALS } = await import('../src/engine/achievements');
    expect(earnedNow(null, { ...NO_TOTALS })).not.toContain('share1');
    expect(earnedNow(null, { ...NO_TOTALS, shared: 1 })).toContain('share1');
  });

  it('shares the website, and every site link carries it', async () => {
    const src = (await import('node:fs')).readFileSync('src/ui/components/Share.tsx', 'utf8');
    expect(src).toContain("GAME_URL = 'https://btr-game.github.io/Bench-to-Rafters/'");
    for (const site of ['twitter.com/intent/tweet', 'reddit.com/submit', 'facebook.com/sharer', 'wa.me', 'mailto:']) expect(src).toContain(site);
    expect(src.match(/enc\(GAME_URL\)|\$\{GAME_URL\}/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
