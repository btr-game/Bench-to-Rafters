// The online community (round 24): leaderboards, the Reality 99 hall, the statue plaza, feedback
// and the live strip. One interface, two homes: the claude.ai page's shared database (the `db`,
// `user` and `room` capabilities) when the game runs there, and this device alone anywhere else,
// so every page still works offline. Moving to a website with its own database later means a
// third home behind the same interface; nothing above this file changes.
//
// What is shared is only what a career card shows (the career record), the player's name in the
// game, and an opaque account id for ownership; never an account name or address.

import type { CareerRecord } from '../engine/career/record';
import type { Mode } from '../engine/balance';
import { todayKey } from '../engine/mini/daily';

// ---------- what counts ----------

/**
 * The leaderboard score. Provisional (owner, round 24: "legacy points are not good enough, let's
 * think of that later"): legacy points plus a point for every OVR of peak above 60.
 */
export const scoreOf = (r: CareerRecord): number => Math.round(r.legacy + Math.max(0, Math.round(r.peak) - 60));
export const SCORE_NOTE = 'Score (provisional): legacy points + one point for every peak OVR above 60.';

/** Statues: Regular guy careers from this many legacy points; the plaza holds 100. */
export const STATUE = { minLegacy: 150, max: 100, gold: 220 };
export const statueOk = (r: CareerRecord) => r.mode === 'standard' && r.legacy >= STATUE.minLegacy;
/** The Reality 99 hall: a shown 99 in Reality hits hard. */
export const hall99Ok = (r: CareerRecord) => r.mode === 'reality' && Math.round(r.peak) >= 99;

export interface ScoreRow {
  id: string;
  mode: Mode;
  day: string;
  score: number;
  rec: CareerRecord;
  mine: boolean;
}
export interface StatueRow {
  id: string;
  rec: CareerRecord;
  metal: 'bronze' | 'gold';
  respects: number;
  paid: boolean; // this viewer has paid respects
  mine: boolean;
}
export interface FeedbackRow {
  text: string;
  contact: string;
  at: string;
  player: string;
}
export interface FeedItem {
  t: string;
  at: number;
}
export type WriteResult = 'ok' | 'denied' | 'full' | 'error';

export interface Community {
  kind: 'shared' | 'local';
  canWrite: boolean;
  isOwner: boolean;
  postCareer(r: CareerRecord): Promise<void>;
  scores(mode: Mode, scope: 'day' | 'all'): Promise<ScoreRow[]>;
  hall(): Promise<ScoreRow[]>;
  statues(): Promise<StatueRow[]>;
  buildStatue(r: CareerRecord): Promise<WriteResult>;
  respect(id: string): Promise<WriteResult>;
  sendFeedback(text: string, contact: string, player: string): Promise<WriteResult>;
  inbox(): Promise<FeedbackRow[]>;
  feed(cb: (items: FeedItem[]) => void): () => void;
  presence(cb: (n: number) => void): () => void;
}

const metalOf = (r: CareerRecord): 'bronze' | 'gold' => (r.legacy >= STATUE.gold || r.hof === 'first' ? 'gold' : 'bronze');
const feedLine = (r: CareerRecord): string => {
  const what = r.titles ? `${r.titles}× champion` : r.mvps ? `${r.mvps}× MVP` : r.hof ? 'a Hall of Famer' : r.tier.toLowerCase();
  return `${r.name} (${r.country}) retired at ${r.retiredAt}: ${what}.`;
};

// ---------- this device only ----------

const LKEY = 'btr-community-local';
interface LocalData {
  scores: ScoreRow[];
  statues: { id: string; rec: CareerRecord; metal: 'bronze' | 'gold'; paid: boolean; respects: number }[];
  feedback: FeedbackRow[];
  feed: FeedItem[];
}
function lload(): LocalData {
  try {
    const d = JSON.parse(localStorage.getItem(LKEY) ?? 'null') as LocalData | null;
    if (d?.scores) return d;
  } catch {
    // nothing stored yet
  }
  return { scores: [], statues: [], feedback: [], feed: [] };
}
function lsave(d: LocalData): void {
  try {
    // only the best 200 careers are worth keeping on one device
    d.scores = d.scores.sort((a, b) => b.score - a.score).slice(0, 200);
    localStorage.setItem(LKEY, JSON.stringify(d));
  } catch {
    // storage blocked: the community pages stay empty
  }
}
const rid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function localCommunity(): Community {
  return {
    kind: 'local',
    canWrite: true,
    isOwner: true,
    async postCareer(r) {
      const d = lload();
      d.scores.push({ id: rid(), mode: r.mode, day: todayKey(), score: scoreOf(r), rec: r, mine: true });
      d.feed = [{ t: feedLine(r), at: Date.now() }, ...d.feed].slice(0, 30);
      lsave(d);
    },
    async scores(mode, scope) {
      const day = todayKey();
      return lload()
        .scores.filter((x) => x.mode === mode && (scope === 'all' || x.day === day))
        .sort((a, b) => b.score - a.score)
        .slice(0, 25);
    },
    async hall() {
      return lload().scores.filter((x) => hall99Ok(x.rec));
    },
    async statues() {
      return lload().statues.map((x) => ({ ...x, mine: true }));
    },
    async buildStatue(r) {
      const d = lload();
      if (d.statues.length >= STATUE.max) return 'full';
      if (!d.statues.some((x) => x.rec.id === r.id)) d.statues.push({ id: rid(), rec: r, metal: metalOf(r), paid: false, respects: 0 });
      lsave(d);
      return 'ok';
    },
    async respect(id) {
      const d = lload();
      const s = d.statues.find((x) => x.id === id);
      if (s && !s.paid) {
        s.paid = true;
        s.respects += 1;
      }
      lsave(d);
      return 'ok';
    },
    async sendFeedback(text, contact, player) {
      const d = lload();
      d.feedback.push({ text, contact, player, at: new Date().toISOString() });
      lsave(d);
      return 'ok';
    },
    async inbox() {
      return lload().feedback.slice().reverse();
    },
    feed(cb) {
      cb(lload().feed);
      return () => {};
    },
    presence(cb) {
      cb(1);
      return () => {};
    },
  };
}

// ---------- the claude.ai page's shared database ----------

type DbErr = { code?: string };
type Snap = { id: string; exists: boolean; data(): Record<string, unknown> | undefined };
type QSnap = { docs: Snap[] };
interface Query {
  where(f: string, op: string, v: unknown): Query;
  orderBy(f: string, dir?: 'asc' | 'desc'): Query;
  limit(n: number): Query;
  get(): Promise<QSnap>;
}
interface DocRef {
  get(): Promise<Snap>;
  set(d: Record<string, unknown>): Promise<void>;
  update(d: Record<string, unknown>): Promise<void>;
  onSnapshot(next: (s: Snap) => void, err?: (e: DbErr) => void): () => void;
}
interface Coll extends Query {
  doc(id?: string): DocRef;
}
interface Db {
  doc(p: string): DocRef;
  collection(p: string): Coll;
}
interface UserApi {
  id(): Promise<string | null>;
  isOwner(): Promise<boolean>;
  can(c: string): Promise<boolean | null>;
}
interface RoomApi {
  presence(p: Record<string, unknown>): Promise<void>;
  peers(): readonly unknown[];
  onPeers(h: (c: { peers: readonly unknown[] }) => void): () => void;
}
type ClaudeHost = { use(name: string): Promise<unknown> };

const denied = (e: unknown): WriteResult => ((e as DbErr)?.code === 'invalid_argument' ? 'denied' : (e as DbErr)?.code === 'quota_exceeded' ? 'full' : 'error');

function sharedCommunity(db: Db, uid: string | null, owner: boolean, canWrite: boolean, room: RoomApi | null): Community {
  const me = uid ?? 'anon';
  const row = (s: Snap): ScoreRow | null => {
    const d = s.data();
    return d ? { id: s.id, mode: d.mode as Mode, day: d.day as string, score: d.score as number, rec: d.rec as CareerRecord, mine: d.by === me } : null;
  };
  const pushFeed = async (t: string) => {
    const ref = db.doc('feed/live');
    const now = await ref.get();
    const items = ((now.data()?.items as FeedItem[] | undefined) ?? []).slice(0, 29);
    await ref.set({ items: [{ t, at: Date.now() }, ...items] });
  };
  return {
    kind: 'shared',
    canWrite,
    isOwner: owner,
    async postCareer(r) {
      if (!canWrite) return;
      try {
        await db.collection('scores').doc().set({ mode: r.mode, day: todayKey(), score: scoreOf(r), rec: r as unknown as Record<string, unknown>, by: me, at: Date.now() });
        await pushFeed(feedLine(r));
      } catch {
        // a refused write leaves the boards as they were
      }
    },
    async scores(mode, scope) {
      let q = db.collection('scores').where('mode', '==', mode);
      if (scope === 'day') q = q.where('day', '==', todayKey());
      const snap = await q.orderBy('score', 'desc').limit(25).get();
      return snap.docs.map(row).filter((x): x is ScoreRow => !!x);
    },
    async hall() {
      const snap = await db.collection('scores').where('mode', '==', 'reality').orderBy('score', 'desc').limit(200).get();
      return snap.docs
        .map(row)
        .filter((x): x is ScoreRow => !!x && hall99Ok(x.rec));
    },
    async statues() {
      const snap = await db.collection('statues').limit(STATUE.max + 20).get();
      const out: StatueRow[] = [];
      for (const s of snap.docs) {
        const d = s.data();
        if (!d) continue;
        const by = (d.respects as Record<string, boolean> | undefined) ?? {};
        out.push({ id: s.id, rec: d.rec as CareerRecord, metal: d.metal as 'bronze' | 'gold', respects: Object.keys(by).length, paid: !!by[me], mine: d.by === me });
      }
      return out.sort((a, b) => b.respects - a.respects || b.rec.legacy - a.rec.legacy);
    },
    async buildStatue(r) {
      if (!canWrite) return 'denied';
      try {
        const all = await db.collection('statues').limit(STATUE.max + 1).get();
        if (all.docs.some((x) => (x.data()?.rec as CareerRecord | undefined)?.id === r.id)) return 'ok';
        if (all.docs.length >= STATUE.max) return 'full';
        await db.collection('statues').doc().set({ rec: r as unknown as Record<string, unknown>, metal: metalOf(r), by: me, at: Date.now(), respects: {} });
        await pushFeed(`A ${metalOf(r)} statue of ${r.name} went up in the plaza.`);
        return 'ok';
      } catch (e) {
        return denied(e);
      }
    },
    async respect(id) {
      if (!canWrite || !uid) return 'denied';
      try {
        // a map keyed by account: one respect each, and concurrent visitors never overwrite each other
        await db.doc(`statues/${id}`).update({ respects: { [uid]: true } });
        return 'ok';
      } catch (e) {
        return denied(e);
      }
    },
    async sendFeedback(text, contact, player) {
      if (!uid) return 'denied';
      try {
        const ref = db.doc(`feedback/${uid}`);
        const now = await ref.get();
        const msgs = ((now.data()?.msgs as FeedbackRow[] | undefined) ?? []).slice(-19);
        await ref.set({ msgs: [...msgs, { text, contact, player, at: new Date().toISOString() }] });
        return 'ok';
      } catch (e) {
        return denied(e);
      }
    },
    async inbox() {
      if (!owner) return [];
      const snap = await db.collection('feedback').get();
      return snap.docs
        .flatMap((s) => (s.data()?.msgs as FeedbackRow[] | undefined) ?? [])
        .sort((a, b) => (a.at < b.at ? 1 : -1));
    },
    feed(cb) {
      return db.doc('feed/live').onSnapshot(
        (s) => cb((s.data()?.items as FeedItem[] | undefined) ?? []),
        () => cb([]),
      );
    },
    presence(cb) {
      if (!room) {
        cb(1);
        return () => {};
      }
      void room.presence({ here: 1 }).catch(() => {});
      cb(Math.max(1, room.peers().length));
      return room.onPeers((c) => cb(Math.max(1, c.peers.length)));
    },
  };
}

// ---------- which one ----------

let picked: Promise<Community> | null = null;
/** The community this page can reach: shared on claude.ai, this device elsewhere. */
export function community(): Promise<Community> {
  if (picked) return picked;
  picked = (async () => {
    const host = (window as unknown as { claude?: ClaudeHost }).claude;
    if (!host?.use) return localCommunity();
    try {
      const [db, user, room] = (await Promise.all([host.use('db'), host.use('user'), host.use('room')])) as [Db | null, UserApi | null, RoomApi | null];
      if (!db) return localCommunity();
      const [uid, owner, can] = await Promise.all([user?.id() ?? null, user?.isOwner() ?? false, user?.can('data.write') ?? null]);
      return sharedCommunity(db, uid, owner, can !== false, room);
    } catch {
      return localCommunity();
    }
  })();
  return picked;
}
