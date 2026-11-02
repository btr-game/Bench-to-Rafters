// Multiplayer online (round 35): the database functions in supabase/migrations/0004_multiplayer.sql,
// behind the interface in multiplayer.ts. The same anonymous secret as the community
// (onlineCommunity.ts): the database keeps only its hash. Loaded only by the online build.

import { createClient } from '@supabase/supabase-js';
import type { CareerRecord } from '../engine/career/record';
import { secretOf } from './onlineCommunity';
import type { ChatLine, Challenge, ClassSummary, DraftClass, Multiplayer, MpFail, OpenChallenge, Seat } from './multiplayer';

const FAILS: MpFail[] = ['missing', 'full', 'denied', 'busy'];
const fail = (x: unknown): MpFail => (FAILS.includes(x as MpFail) ? (x as MpFail) : 'error');

export function onlineMultiplayer(url: string, key: string): Multiplayer {
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const p_secret = secretOf();
  /** One call; its data, or 'error' when the database could not be reached. */
  const call = async <T,>(fn: string, args: Record<string, unknown>): Promise<T | 'error'> => {
    try {
      const { data, error } = await sb.rpc(fn, { p_secret, ...args });
      return error ? 'error' : (data as T);
    } catch {
      return 'error';
    }
  };
  const said = async (fn: string, args: Record<string, unknown>): Promise<'ok' | MpFail> => {
    const r = await call<string>(fn, args);
    return r === 'ok' ? 'ok' : fail(r);
  };
  const seat = async (fn: string, args: Record<string, unknown>): Promise<Seat | MpFail> => {
    const r = await call<{ code?: string; seed?: number; error?: string }>(fn, args);
    if (r === 'error' || !r) return 'error';
    return r.code && typeof r.seed === 'number' ? { code: r.code, seed: r.seed } : fail(r.error);
  };
  return {
    kind: 'online',
    async makeChallenge(name, prospect, rec: CareerRecord) {
      const r = await call<string>('mp_challenge_create', { p_name: name, p_prospect: prospect, p_rec: rec });
      return typeof r === 'string' && /^[A-Z2-9]{6}$/.test(r) ? r : fail(r);
    },
    challenge: (code) => call<Challenge | null>('mp_challenge_get', { p_code: code }),
    openChallenges: () => call<OpenChallenge[]>('mp_challenges_open', { p_limit: 12 }),
    myChallenges: () => call<Challenge[]>('mp_challenges_mine', {}),
    answer: (code, name, rec) => said('mp_challenge_answer', { p_code: code, p_name: name, p_rec: rec }),
    makeClass: (name, player) => seat('mp_class_create', { p_name: name, p_player: player }),
    joinClass: (code, player) => seat('mp_class_join', { p_code: code, p_player: player }),
    draftClass: (code) => call<DraftClass | null>('mp_class_get', { p_code: code }),
    openClasses: () => call<ClassSummary[]>('mp_classes_open', { p_limit: 12 }),
    myClasses: () => call<ClassSummary[]>('mp_classes_mine', {}),
    postSeason: (code, s) => said('mp_class_season', { p_code: code, p_season: s }),
    postCareer: (code, rec) => said('mp_class_career', { p_code: code, p_rec: rec }),
    setRival: (code, to) => said('mp_class_rival', { p_code: code, p_to: to }),
    take: (code, name) => said('mp_challenge_take', { p_code: code, p_name: name }),
    chat: (room, code) => call<ChatLine[] | null>('mp_chat_get', { p_kind: room, p_code: code }),
    say: (room, code, name, body) => said('mp_chat_post', { p_kind: room, p_code: code, p_name: name, p_body: body }),
  };
}
