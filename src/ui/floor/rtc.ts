// A direct line between the two screens of a friend game (after round 42, owner: "it's better now,
// but the lag is still significant. try to spend as much time and resources on reducing the lag").
//
// The room's own line (floorOnline.ts) carries every message through the realtime service: from one
// player up to its servers and down to the other, in order, over one connection, so a key press makes
// two trips and one late message holds up all those behind it. This opens a second line straight from
// one browser to the other (WebRTC, a data channel that neither orders nor resends), and the game sends
// its keys down it: one short trip, and a message that is late or lost is simply passed by the next
// (each carries the last few ticks again).
//
// The room's line stays: it is how the two browsers find each other (the offer, the answer and the
// addresses to try go through it), it carries everything that must arrive (the start, the game's
// fingerprint, a resync, leaving), and it is what the keys fall back to when no direct line can be
// made (some networks allow none) or the one in use goes quiet. The host calls, the friend answers.
//
// A direct line shows each player's network address to the other, as any call between two browsers
// does. So it is made only in a room joined by code, between people who gave each other that code:
// a quick match between strangers stays on the room's line (FloorFriend.tsx).

import { ME, type FloorMsg, type Wire } from './net';

/** Public servers that tell a browser its own address as the internet sees it (nothing of the game
 * goes to them). */
const ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
/** The host calls again if a call has not connected by then (ms), a few times at most. */
const RETRY_MS = 8000;
const TRIES = 4;

export type RtcSignal = { sdp: RTCSessionDescriptionInit } | { ice: RTCIceCandidateInit } | { bye: true };

/** The room's line with a direct one beside it, when this browser can make one. */
export function withDirect(base: Wire, host: boolean): Wire {
  if (typeof RTCPeerConnection === 'undefined') return base;
  const fs = new Set<(m: FloorMsg, fast?: boolean) => void>();
  let pc: RTCPeerConnection | null = null;
  let ch: RTCDataChannel | null = null;
  let peer = '';
  let tries = 0;
  let tried = -Infinity;
  /** Addresses that came before the call they belong to was set up. */
  let early: RTCIceCandidateInit[] = [];

  const sig = (to: string, d: RtcSignal) => base.send({ k: 'rtc', id: ME, to, d });
  const shut = () => {
    const c = ch;
    const p = pc;
    ch = null;
    pc = null;
    early = [];
    try {
      c?.close();
      p?.close();
    } catch {
      // already closed
    }
  };
  const take = (c: RTCDataChannel) => {
    ch = c;
    c.onmessage = (e) => {
      let m: FloorMsg;
      try {
        m = JSON.parse(e.data as string) as FloorMsg;
      } catch {
        return;
      }
      fs.forEach((f) => f(m, true));
    };
    c.onclose = () => {
      if (ch === c) ch = null;
    };
  };
  const make = (to: string): RTCPeerConnection => {
    shut();
    peer = to;
    const p = new RTCPeerConnection({ iceServers: ICE });
    pc = p;
    p.onicecandidate = (e) => {
      if (e.candidate) sig(to, { ice: e.candidate.toJSON() });
    };
    p.onconnectionstatechange = () => {
      if (p.connectionState === 'failed' && pc === p) shut();
    };
    return p;
  };
  const call = async (to: string) => {
    const p = make(to);
    take(p.createDataChannel('floor', { ordered: false, maxRetransmits: 0 }));
    await p.setLocalDescription(await p.createOffer());
    if (pc === p && p.localDescription) sig(to, { sdp: p.localDescription.toJSON() });
  };
  const hear = async (m: FloorMsg) => {
    if (m.id === ME) return;
    if (m.k === 'hi' && host && !m.host) {
      // the friend is in the room: call him, unless a line to him is open or being made
      const open = ch?.readyState === 'open' && peer === m.id;
      const now = Date.now();
      if (peer !== m.id) tries = 0;
      if (open || now - tried < RETRY_MS || tries >= TRIES) return;
      tried = now;
      tries++;
      await call(m.id);
    } else if (m.k === 'bye' && m.id === peer) shut();
    else if (m.k === 'rtc' && m.to === ME) {
      const d = m.d;
      if ('bye' in d) {
        if (m.id === peer) shut();
      } else if ('sdp' in d) {
        if (d.sdp.type === 'offer' && !host) {
          const p = make(m.id);
          p.ondatachannel = (e) => take(e.channel);
          await p.setRemoteDescription(d.sdp);
          for (const c of early.splice(0)) await p.addIceCandidate(c);
          await p.setLocalDescription(await p.createAnswer());
          if (pc === p && p.localDescription) sig(m.id, { sdp: p.localDescription.toJSON() });
        } else if (d.sdp.type === 'answer' && host && pc && m.id === peer && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(d.sdp);
          for (const c of early.splice(0)) await pc.addIceCandidate(c);
        }
      } else if (pc?.remoteDescription && m.id === peer) await pc.addIceCandidate(d.ice);
      else early.push(d.ice);
    }
  };
  // (a call that cannot be made is no error: the keys stay on the room's line)
  const off = base.listen((m) => void hear(m).catch(() => undefined));

  return {
    send: (m) => base.send(m),
    listen: (f) => {
      fs.add(f);
      const stop = base.listen((m) => f(m, false));
      return () => {
        fs.delete(f);
        stop();
      };
    },
    close: () => {
      off();
      shut();
      base.close();
    },
    fast: {
      ready: () => ch?.readyState === 'open',
      send: (m) => {
        try {
          ch?.send(JSON.stringify(m));
        } catch {
          // the line closed under it: the game notices the quiet and goes back to the room's line
        }
      },
      drop: () => {
        if (peer) sig(peer, { bye: true });
        shut();
      },
    },
  };
}
