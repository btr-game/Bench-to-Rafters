// The itch.io build's online community (src/ui/onlineCommunity.ts) against a stand-in for the
// database client: what it asks for, and how it reads the answers. The database's own rules are
// checked against a real Postgres when the migration changes (supabase/migrations).

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

type Call = { kind: string; args: unknown[] };
const calls: Call[] = [];
const tables: Record<string, unknown[]> = {};
let rpcAnswer: unknown = 'ok';

// a chainable query that records itself and resolves to the table's rows
function query(table: string) {
  const q: Record<string, unknown> = {};
  for (const k of ['select', 'eq', 'order', 'limit']) q[k] = (...a: unknown[]) => (calls.push({ kind: `${table}.${k}`, args: a }), q);
  q.then = (ok: (v: unknown) => void) => ok({ data: tables[table] ?? [], error: null });
  return q;
}
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (t: string) => query(t),
    rpc: async (name: string, args: unknown) => (calls.push({ kind: `rpc.${name}`, args: [args] }), { data: rpcAnswer, error: null }),
    channel: () => ({ on() { return this; }, subscribe() { return this; }, presenceState: () => ({}), track: async () => {} }),
    removeChannel: async () => {},
  }),
}));

const store = new Map<string, string>();
beforeEach(() => {
  calls.length = 0;
  for (const k of Object.keys(tables)) delete tables[k];
  rpcAnswer = 'ok';
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
  vi.stubGlobal('window', { setInterval: () => 1, clearInterval: () => {} });
});

const rec = (over: Record<string, unknown> = {}) => ({ id: 'c1', name: 'Kai Moreno', mode: 'reality', peak: 99.2, legacy: 80, index: { score: 120.5, total: 1, best: 1 }, tier: 'Legend', country: 'USA', retiredAt: 36, titles: 2, ...over });

describe('the online community', () => {
  it('posts a career through the checked function, with this copy’s secret', async () => {
    const { onlineCommunity } = await import('../src/ui/onlineCommunity');
    const c = await onlineCommunity('https://x.supabase.co', 'key');
    await c.postCareer(rec() as never);
    const post = calls.find((x) => x.kind === 'rpc.post_career')!.args[0] as Record<string, unknown>;
    expect(post.p_mode).toBe('reality');
    expect(post.p_score).toBe(120.5);
    expect(post.p_secret).toBe(store.get('btr-online-secret'));
    expect(String(post.p_line)).toContain('Kai Moreno');
  });

  it('marks this player’s own rows by the SHA-256 of the secret, as the database stores it', async () => {
    const { onlineCommunity } = await import('../src/ui/onlineCommunity');
    store.set('btr-online-secret', '11111111-1111-1111-1111-111111111111');
    const me = createHash('sha256').update('11111111-1111-1111-1111-111111111111').digest('hex');
    tables.best_all = [{ who: me, score: 120, rec: rec() }, { who: 'someone', score: 90, rec: rec({ id: 'c2' }) }];
    const c = await onlineCommunity('https://x.supabase.co', 'key');
    const rows = await c.scores('reality', 'all');
    expect(rows.map((r) => r.mine)).toEqual([true, false]);
    expect(calls.some((x) => x.kind === 'best_all.eq' && x.args[1] === 'reality')).toBe(true);
    // today's board asks for today's day
    await c.scores('reality', 'day');
    expect(calls.some((x) => x.kind === 'best_day.eq' && x.args[0] === 'day')).toBe(true);
  });

  it('counts respects and knows which ones this player paid', async () => {
    const { onlineCommunity } = await import('../src/ui/onlineCommunity');
    tables.statues = [
      { id: 's1', who: 'a', metal: 'gold', rec: rec({ mode: 'standard', legacy: 240 }), respects: [{ count: 3 }] },
      { id: 's2', who: 'b', metal: 'bronze', rec: rec({ id: 'c2', mode: 'standard', legacy: 160 }), respects: [{ count: 7 }] },
    ];
    tables.respects = [{ statue_id: 's1' }];
    const c = await onlineCommunity('https://x.supabase.co', 'key');
    const s = await c.statues();
    expect(s.map((x) => [x.id, x.respects, x.paid])).toEqual([
      ['s2', 7, false],
      ['s1', 3, true],
    ]);
  });

  it('reads the database’s answers to a write', async () => {
    const { onlineCommunity } = await import('../src/ui/onlineCommunity');
    const c = await onlineCommunity('https://x.supabase.co', 'key');
    rpcAnswer = 'full';
    expect(await c.buildStatue(rec({ mode: 'standard', legacy: 200 }) as never)).toBe('full');
    rpcAnswer = 'busy';
    expect(await c.sendFeedback('hi', '', 'Kai')).toBe('error');
    rpcAnswer = 'ok';
    expect(await c.respect('s1')).toBe('ok');
  });

  it('keeps only the Reality 99 careers in the hall', async () => {
    const { onlineCommunity } = await import('../src/ui/onlineCommunity');
    tables.hall = [{ rec_id: 'c1', who: 'a', score: 120, rec: rec() }, { rec_id: 'c5', who: 'b', score: 80, rec: rec({ id: 'c5', peak: 97 }) }];
    const c = await onlineCommunity('https://x.supabase.co', 'key');
    expect((await c.hall()).map((x) => x.id)).toEqual(['c1']);
  });
});
