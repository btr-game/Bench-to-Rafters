import type { GameState } from '../engine/types';

// Save slots (round 25, the owner: ten of them, and a code to export or import a career). Each
// career in progress has a slot on this device; the index lists them, newest first, and every
// slot holds its career compressed (gzip, then base64), so ten long careers still fit in the
// browser's storage. The same packing makes the export code: a career copied as text.

export const MAX_SLOTS = 10;
const INDEX = 'btr-saves-v2';
const DATA = (id: string) => `btr-slot-${id}`;
const OLD = 'btr-save-v1'; // the single save before round 25

interface SlotMeta {
  id: string;
  name: string;
  year: number;
  ovr?: number;
  retired: boolean;
  mode: string;
  at: number; // last saved (ms)
}

const metaOf = (id: string, g: GameState): SlotMeta => ({ id, name: g.player.name, year: g.year, ovr: Math.round(g.player.peakOvr), retired: g.step === 'retired', mode: g.mode ?? 'standard', at: Date.now() });

function readIndex(): SlotMeta[] {
  try {
    const list = JSON.parse(localStorage.getItem(INDEX) ?? '[]') as SlotMeta[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function writeIndex(list: SlotMeta[]): void {
  localStorage.setItem(INDEX, JSON.stringify(list));
}

export const newSlotId = (): string => `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/** The saved careers, newest first (the old single save moves into a slot the first time). */
export function listSlots(): SlotMeta[] {
  try {
    const old = localStorage.getItem(OLD);
    if (old) {
      const game = (JSON.parse(old) as { game?: GameState }).game;
      if (game?.player) {
        const id = newSlotId();
        localStorage.setItem(DATA(id), `j:${JSON.stringify(game)}`);
        writeIndex([metaOf(id, game), ...readIndex()]);
      }
      localStorage.removeItem(OLD);
    }
  } catch {
    /* storage blocked: nothing to move */
  }
  return readIndex().sort((a, b) => b.at - a.at);
}

// ---------- packing: gzip and base64 where the browser has them, plain JSON otherwise ----------

const toB64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (text: string): Uint8Array => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function pack(json: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') return `j:${json}`;
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  return `z:${toB64(new Uint8Array(await new Response(stream).arrayBuffer()))}`;
}
async function unpack(text: string): Promise<string> {
  if (text.startsWith('j:')) return text.slice(2);
  if (!text.startsWith('z:') || typeof DecompressionStream === 'undefined') throw new Error('unreadable');
  const stream = new Blob([fromB64(text.slice(2))]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

/** Save a career into its slot; a new slot past the tenth replaces the oldest. */
export async function writeSlot(id: string, g: GameState): Promise<boolean> {
  try {
    const data = await pack(JSON.stringify(g));
    let list = readIndex().filter((x) => x.id !== id);
    list.sort((a, b) => b.at - a.at);
    while (list.length >= MAX_SLOTS) {
      const gone = list.pop()!;
      localStorage.removeItem(DATA(gone.id));
    }
    localStorage.setItem(DATA(id), data);
    list = [metaOf(id, g), ...list];
    writeIndex(list);
    return true;
  } catch {
    return false;
  }
}

export async function readSlot(id: string): Promise<GameState | null> {
  try {
    const raw = localStorage.getItem(DATA(id));
    if (!raw) return null;
    const game = JSON.parse(await unpack(raw)) as GameState;
    return game?.player && game.step ? game : null;
  } catch {
    return null;
  }
}

export function deleteSlot(id: string): void {
  try {
    localStorage.removeItem(DATA(id));
    writeIndex(readIndex().filter((x) => x.id !== id));
  } catch {
    /* nothing to delete */
  }
}

// ---------- a level career (round 33) ----------
// A career on the road map has one save of its own, outside the slots, so it never shows in the
// career log's saved careers, and a reload goes straight back into it.

const RUN = 'btr-level-run';

export async function writeRun(g: GameState): Promise<boolean> {
  try {
    localStorage.setItem(RUN, await pack(JSON.stringify(g)));
    return true;
  } catch {
    return false;
  }
}

export async function readRun(): Promise<GameState | null> {
  try {
    const raw = localStorage.getItem(RUN);
    if (!raw) return null;
    const game = JSON.parse(await unpack(raw)) as GameState;
    return game?.player && game.step && game.flags?.level ? game : null;
  } catch {
    return null;
  }
}

export function dropRun(): void {
  try {
    localStorage.removeItem(RUN);
  } catch {
    /* nothing to drop */
  }
}

// ---------- the export code ----------

const CODE = 'BTR1.';

/** A career as text to copy somewhere else. */
export async function exportCode(g: GameState): Promise<string> {
  return CODE + (await pack(JSON.stringify(g)));
}

/** A career back from its code (null when the code is not one, or is cut short). */
export async function importCode(code: string): Promise<GameState | null> {
  const text = code.trim().replace(/[\r\n]+/g, '');
  if (!text.startsWith(CODE)) return null;
  try {
    const game = JSON.parse(await unpack(text.slice(CODE.length))) as GameState;
    return game?.player && game.step ? game : null;
  } catch {
    return null;
  }
}
