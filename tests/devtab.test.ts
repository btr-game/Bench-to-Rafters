// The dev deck in a tab of its own (owner: "when i enter the dev deck, the tab reloads ... this
// still kind of bothers me"): how a page knows it is the deck, and how the deck goes back.

import { afterEach, describe, expect, it, vi } from 'vitest';

function browser(opts: { session?: Record<string, string>; local?: Record<string, string>; opener?: boolean } = {}) {
  const session = new Map(Object.entries(opts.session ?? {}));
  const local = new Map(Object.entries(opts.local ?? {}));
  const reload = vi.fn();
  const close = vi.fn();
  const win: Record<string, unknown> = { opener: opts.opener ? {} : null, close, closed: false };
  win.top = win;
  win.self = win;
  const store = (m: Map<string, string>) => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) });
  vi.stubGlobal('window', win);
  vi.stubGlobal('sessionStorage', store(session));
  vi.stubGlobal('localStorage', store(local));
  vi.stubGlobal('location', { reload, href: 'https://bench-to-rafters.netlify.app/' });
  return { session, local, reload, close };
}
const load = async () => {
  vi.resetModules();
  return import('../src/dev/mode');
};
afterEach(() => vi.unstubAllGlobals());

describe('the dev deck in its own tab', () => {
  it('is the game in an ordinary tab', async () => {
    browser();
    expect((await load()).DEV).toBe(false);
  });

  it('is the deck in a tab the game just opened for it, and keeps it so on a reload', async () => {
    const b = browser({ local: { 'btr-dev-handoff': String(Date.now()) }, opener: true });
    expect((await load()).DEV).toBe(true);
    expect(b.local.has('btr-dev-handoff')).toBe(false); // used once
    expect(b.session.get('btr-dev-on')).toBe('1');
  });

  it('is not the deck from a stale handoff, or in a tab nobody opened', async () => {
    browser({ local: { 'btr-dev-handoff': String(Date.now() - 60000) }, opener: true });
    expect((await load()).DEV).toBe(false);
    browser({ local: { 'btr-dev-handoff': String(Date.now()) }, opener: false });
    expect((await load()).DEV).toBe(false);
  });

  it('closes its tab to go back to the game, and reloads only a tab it took over', async () => {
    const b = browser({ session: { 'btr-dev-on': '1' }, opener: true });
    const m = await load();
    m.leaveDev();
    expect(b.close).toHaveBeenCalled();
    expect(b.reload).not.toHaveBeenCalled();
    expect(b.session.has('btr-dev-on')).toBe(false);
    const c = browser({ session: { 'btr-dev-on': '1' } });
    (await load()).leaveDev();
    expect(c.reload).toHaveBeenCalled();
  });

  it('keeps the deck out with a wrong password', async () => {
    const b = browser();
    expect((await load()).enterDev('not-the-password')).toBe(false);
    expect(b.reload).not.toHaveBeenCalled();
  });
});
