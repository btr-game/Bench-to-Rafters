// The community online, for copies of the game outside claude.ai (itch.io). Owner: "let's go with
// [itch.io]. i do want to get community features activated tho." A Supabase database
// (supabase/migrations/0001_community.sql) behind the same interface as the other two homes in
// community.ts. Everyone reads the boards; every write is a database function that checks it.
// Players are anonymous: this copy keeps a random secret, and the database stores only its
// SHA-256 (who), which is also how a row is known to be this player's own.
// Loaded only by the itch.io build (npm run build:itch), so the claude.ai page never carries it.

import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { CareerRecord } from '../engine/career/record';
import type { Mode } from '../engine/balance';
import { todayKey } from '../engine/mini/daily';
import { BOARD_SIZE, STATUE, feedLine, hall99Ok, scoreOf, type Community, type FeedItem, type ScoreRow, type StatueRow, type WriteResult } from './community';

const SECRET = 'btr-online-secret';
function secretOf(): string {
  try {
    let s = localStorage.getItem(SECRET);
    if (!s) {
      s = crypto.randomUUID();
      localStorage.setItem(SECRET, s);
    }
    return s;
  } catch {
    // storage blocked: a secret for this visit only
    return crypto.randomUUID();
  }
}
async function sha256(s: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const within = <T,>(p: PromiseLike<T>, ms: number): Promise<T> => Promise.race([Promise.resolve(p), new Promise<T>((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

interface BoardRow {
  who: string;
  score: number;
  rec: CareerRecord;
}

/** The online community, or a rejection when the database cannot be reached (the caller then keeps to this device). */
export async function onlineCommunity(url: string, key: string): Promise<Community> {
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const secret = secretOf();
  const me = await sha256(secret);
  // reachable at all? one small read, or this device instead
  const ping = await within(sb.from('feed').select('id').limit(1), 8000);
  if (ping.error) throw ping.error;

  const result = (r: { data: unknown; error: unknown }): WriteResult => {
    if (r.error) return 'error';
    return r.data === 'ok' ? 'ok' : r.data === 'full' ? 'full' : r.data === 'denied' ? 'denied' : 'error';
  };
  const rows = (mode: Mode, day: string, data: BoardRow[] | null): ScoreRow[] =>
    (data ?? []).map((d) => ({ id: d.who, mode, day, score: d.score, rec: d.rec, mine: d.who === me, by: d.who }));

  // one presence channel for the page, however many strips listen to it
  let channel: RealtimeChannel | null = null;
  const listeners = new Set<(n: number) => void>();
  const tell = () => {
    const n = channel ? Math.max(1, Object.keys(channel.presenceState()).length) : 1;
    listeners.forEach((cb) => cb(n));
  };

  return {
    kind: 'shared',
    canWrite: true,
    async postCareer(r) {
      await sb.rpc('post_career', { p_secret: secret, p_mode: r.mode, p_day: todayKey(), p_score: scoreOf(r), p_rec: r, p_line: feedLine(r) });
    },
    async scores(mode, scope) {
      const day = todayKey();
      const q = scope === 'all' ? sb.from('best_all').select('who, score, rec').eq('mode', mode) : sb.from('best_day').select('who, score, rec').eq('mode', mode).eq('day', day);
      const { data } = await q.order('score', { ascending: false }).limit(BOARD_SIZE);
      return rows(mode, day, data as BoardRow[] | null);
    },
    async hall() {
      const { data } = await sb.from('hall').select('rec_id, who, score, rec').order('score', { ascending: false }).limit(200);
      return ((data ?? []) as (BoardRow & { rec_id: string })[]).map((d) => ({ id: d.rec_id, mode: 'reality' as Mode, day: todayKey(), score: d.score, rec: d.rec, mine: d.who === me, by: d.who })).filter((x) => hall99Ok(x.rec));
    },
    async statues() {
      const [all, mine] = await Promise.all([
        sb.from('statues').select('id, who, metal, rec, respects(count)').limit(STATUE.max + 20),
        sb.from('respects').select('statue_id').eq('who', me),
      ]);
      const paid = new Set(((mine.data ?? []) as { statue_id: string }[]).map((x) => x.statue_id));
      const out: StatueRow[] = ((all.data ?? []) as { id: string; who: string; metal: 'bronze' | 'gold'; rec: CareerRecord; respects: { count: number }[] }[]).map((s) => ({
        id: s.id,
        rec: s.rec,
        metal: s.metal,
        respects: s.respects?.[0]?.count ?? 0,
        paid: paid.has(s.id),
        mine: s.who === me,
      }));
      return out.sort((a, b) => b.respects - a.respects || b.rec.legacy - a.rec.legacy);
    },
    async buildStatue(r) {
      return result(await sb.rpc('build_statue', { p_secret: secret, p_rec: r, p_line: `A statue of ${r.name} went up in the plaza.` }));
    },
    async respect(id) {
      return result(await sb.rpc('pay_respect', { p_secret: secret, p_statue: id }));
    },
    async sendFeedback(text, contact, player) {
      return result(await sb.rpc('send_feedback', { p_secret: secret, p_text: text, p_contact: contact, p_player: player }));
    },
    feed(cb) {
      let live = true;
      const pull = async () => {
        const { data } = await sb.from('feed').select('t, at').order('at', { ascending: false }).limit(30);
        if (live && data) cb((data as { t: string; at: string }[]).map((x): FeedItem => ({ t: x.t, at: Date.parse(x.at) })));
      };
      void pull();
      const timer = window.setInterval(() => void pull(), 30000);
      return () => {
        live = false;
        window.clearInterval(timer);
      };
    },
    presence(cb) {
      listeners.add(cb);
      if (!channel) {
        channel = sb.channel('court', { config: { presence: { key: me } } });
        channel.on('presence', { event: 'sync' }, tell).subscribe((status) => {
          if (status === 'SUBSCRIBED') void channel?.track({ at: Date.now() });
        });
      }
      tell();
      return () => {
        listeners.delete(cb);
        if (!listeners.size && channel) {
          void sb.removeChannel(channel);
          channel = null;
        }
      };
    },
  };
}
