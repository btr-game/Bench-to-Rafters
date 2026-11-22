// A room between two friends on the Floor (after round 42, owner: "superteam draft against a friend:
// nice. let's expand friend play in general"): what the room plays (each his franchise, or a superteam
// draft from one pool), the series (best of 1, 3 or 5) and the draft's board, the same on both screens.
// The host keeps the room: he sends it whole whenever it changes and every so often besides (`room`);
// the friend's picks go to the host (`pick`, sent again until the board shows them) and come back on
// the board. The host's screen runs the pick clock and makes the pick for whoever runs out of time.
// The rules themselves are engine/floor/friend.ts.

import { bestLeft, newDraft, pickIn, PICK_SECONDS, seriesWinner, turnOf, type Best, type Draft } from '../../engine/floor/friend';
import { SHAPES, SPOTS } from '../../engine/floor/court';
import type { FloorPlan, FloorPlay } from '../../engine/floor/sim';
import type { FloorEra } from '../../engine/floor/gimmicks';
import type { Pos } from '../../engine/types';
import { ME, type FloorMsg, type Wire } from './net';

const STYLES: FloorPlay[] = ['balanced', 'runGun', 'motion', 'iso', 'grind', 'space'];
const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

/** A friend's game plan as it came down the line: kept only when it is one the game knows. */
export function cleanPlan(v: unknown): FloorPlan | undefined {
  const p = v as FloorPlan | null | undefined;
  if (!p || typeof p !== 'object' || !(p.shape in SHAPES) || !STYLES.includes(p.style)) return undefined;
  const spots = p.spots && typeof p.spots === 'object' ? Object.fromEntries(POS.filter((q) => p.spots![q] && p.spots![q]! in SPOTS).map((q) => [q, p.spots![q]])) : {};
  return { shape: p.shape, style: p.style, spots: Object.keys(spots).length ? spots : undefined };
}

export type RoomMode = 'franchise' | 'draft';

export interface RoomState {
  mode: RoomMode;
  best: Best;
  /** The era the room plays in (owner: "eras for friend games": yes), the host's pick. */
  era: FloorEra;
  /** Games won in this series (a new one once one is decided and the host tips off again): the host's, the friend's. */
  wins: [number, number];
  draft: Draft | null;
}

const PICK_MS = PICK_SECONDS * 1000;
/** A friend's pick goes again this often (ms) until the board shows it. */
const RESEND = 1000;

export class FriendRoom {
  readonly host: boolean;
  state: RoomState;
  private wire: Wire;
  private clock: () => number;
  private stop: () => void;
  private subs = new Set<() => void>();
  /** When the pick on the clock runs out (this screen's clock), while a draft is on. */
  private due: number | null = null;
  /** Games already counted on the host's screen (by their tip-off's number). */
  private counted = new Set<number>();
  /** The friend's pick on its way to the host: sent again until the board has it. */
  private pending: { draft: number; at: number; legend: number; sent: number } | null = null;

  constructor(wire: Wire, host: boolean, init: Partial<Pick<RoomState, 'mode' | 'best' | 'era'>> = {}, clock: () => number = () => Date.now()) {
    this.wire = wire;
    this.host = host;
    this.clock = clock;
    this.state = { mode: init.mode ?? 'franchise', best: init.best ?? 1, era: init.era ?? 'modern', wins: [0, 0], draft: null };
    this.stop = wire.listen((m) => this.hear(m));
  }

  /** Called whenever the room changes. */
  onChange(f: () => void): () => void {
    this.subs.add(f);
    return () => this.subs.delete(f);
  }

  private changed(): void {
    if (this.host) this.announce();
    this.subs.forEach((f) => f());
  }

  /** The host sends the room as it stands. */
  announce(): void {
    if (!this.host) return;
    this.wire.send({ k: 'room', id: ME, room: this.state, ms: this.due === null ? null : Math.max(0, this.due - this.clock()) });
  }

  /** Milliseconds left on the pick clock, or null when no pick is on it. */
  left(): number | null {
    return this.due === null || !this.state.draft || turnOf(this.state.draft) === null ? null : Math.max(0, this.due - this.clock());
  }

  /** The draft is done: both have five. */
  get drafted(): boolean {
    return !!this.state.draft && turnOf(this.state.draft) === null;
  }

  // ---- the host's ----

  setMode(mode: RoomMode): void {
    if (!this.host || mode === this.state.mode) return;
    this.state = { ...this.state, mode, wins: [0, 0] };
    this.changed();
  }

  setEra(era: FloorEra): void {
    if (!this.host || era === this.state.era) return;
    this.state = { ...this.state, era };
    this.changed();
  }

  setBest(best: Best): void {
    if (!this.host || best === this.state.best) return;
    this.state = { ...this.state, best, wins: [0, 0] };
    this.changed();
  }

  /** A new draft from the whole pool, the host picking first. */
  startDraft(): void {
    if (!this.host) return;
    this.state = { ...this.state, draft: newDraft((this.state.draft?.n ?? 0) + 1) };
    this.due = this.clock() + PICK_MS;
    this.changed();
  }

  /** Before a tip-off: a series already decided makes way for a new one. */
  nextGame(): void {
    if (!this.host || seriesWinner(this.state.best, this.state.wins) === null) return;
    this.state = { ...this.state, wins: [0, 0] };
    this.changed();
  }

  /** Keeps time: on the host, a pick whose clock has run out is made for him (`live`: only while the
   * friend is in the room); on the friend's screen, a pick still on its way goes again. */
  tick(live = true): void {
    const at = this.clock();
    if (this.host) {
      const d = this.state.draft;
      const who = d && turnOf(d);
      if (live && d && who !== null && who !== undefined && this.due !== null && at >= this.due) this.apply(who, bestLeft(d, who));
    } else if (this.pending) {
      const d = this.state.draft;
      if (!d || d.n !== this.pending.draft || d.picks.length > this.pending.at) this.pending = null;
      else if (at - this.pending.sent >= RESEND) this.send();
    }
  }

  // ---- both ----

  /** He picks a legend (a place in ALL_LEGENDS): false when it is not his turn or the man is gone. */
  pick(k: number): boolean {
    const d = this.state.draft;
    const me: 0 | 1 = this.host ? 0 : 1;
    if (!d || !pickIn(d, me, k)) return false;
    if (this.host) return this.apply(0, k);
    this.pending = { draft: d.n, at: d.picks.length, legend: k, sent: 0 };
    this.send();
    return true;
  }

  /** A game is over: `winner` is the side that won it (0 the host). The host counts it, once, and the
   * friend's screen shows the series as the host sends it (two screens counting each on its own could
   * count one game twice when the host's word came first). */
  result(game: number, winner: 0 | 1): void {
    if (!this.host || this.counted.has(game)) return;
    this.counted.add(game);
    const wins: [number, number] = [...this.state.wins];
    wins[winner]++;
    this.state = { ...this.state, wins };
    this.changed();
  }

  close(): void {
    this.stop();
  }

  private send(): void {
    if (!this.pending) return;
    this.pending.sent = this.clock();
    this.wire.send({ k: 'pick', id: ME, draft: this.pending.draft, at: this.pending.at, legend: this.pending.legend });
  }

  private apply(side: 0 | 1, k: number): boolean {
    const d = this.state.draft;
    const next = d && pickIn(d, side, k);
    if (!next) return false;
    this.state = { ...this.state, draft: next };
    this.due = turnOf(next) === null ? null : this.clock() + PICK_MS;
    this.changed();
    return true;
  }

  private hear(m: FloorMsg): void {
    if (m.id === ME) return;
    if (m.k === 'pick' && this.host) {
      const d = this.state.draft;
      // a pick for this draft and this turn; one sent again after it counted is let go
      if (d && m.draft === d.n && m.at === d.picks.length) this.apply(1, m.legend);
      else this.announce();
    } else if (m.k === 'room' && !this.host) {
      const r = m.room;
      const mine = this.state;
      // the board: the host's, unless it is an older look at the same draft
      const draft = r.draft && mine.draft && r.draft.n === mine.draft.n && r.draft.picks.length < mine.draft.picks.length ? mine.draft : r.draft;
      this.state = { mode: r.mode, best: r.best, era: r.era === 'nineties' || r.era === 'sixties' ? r.era : 'modern', wins: [r.wins[0], r.wins[1]], draft };
      this.due = m.ms === null ? null : this.clock() + m.ms;
      if (this.pending && (!draft || draft.n !== this.pending.draft || draft.picks.length > this.pending.at)) this.pending = null;
      this.subs.forEach((f) => f());
    }
  }
}
