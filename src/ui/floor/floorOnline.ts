// The Floor's room online (round 39): a realtime broadcast channel on the game's own service, one a
// room code. Nothing is stored: the messages go from one screen to the other and are gone (no table,
// no database function). Loaded only by the online build (the website and itch.io), as the
// community and multiplayer are (onlineCommunity.ts, onlineMultiplayer.ts).

import { createClient } from '@supabase/supabase-js';
import type { FloorMsg, Wire } from './net';

export function onlineWire(url: string, key: string, code: string): Promise<Wire> {
  // its own storage key, apart from the community's client on the same page
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'btr-floor-auth' } });
  const ch = sb.channel(`floor-${code}`, { config: { broadcast: { self: false, ack: false } } });
  const fs = new Set<(m: FloorMsg) => void>();
  ch.on('broadcast', { event: 'm' }, ({ payload }) => fs.forEach((f) => f(payload as FloorMsg)));
  const wire: Wire = {
    send: (m) => void ch.send({ type: 'broadcast', event: 'm', payload: m }),
    listen: (f) => {
      fs.add(f);
      return () => fs.delete(f);
    },
    close: () => void sb.removeChannel(ch),
  };
  return new Promise((ok, no) => {
    const late = setTimeout(() => no(new Error('timeout')), 10000);
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(late);
        ok(wire);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(late);
        no(new Error(status));
      }
    });
  });
}
