// How a player looks, before any colour is painted (round 25: moved out of the art so the engine
// can read it too: the nickname picker notices an afro, a headband or a beard).

import { legendLook, type Face, type Hair, type LegendLook } from './legendLooks';

/** FNV-1a: the same name always gives the same number. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface LookTraits {
  skin: number; // 0-6, light to deep
  hair: LegendLook['color'];
  style: Hair;
  face: Face;
  gear: string[]; // headband, sleeve, wristband (legends: also goggles, unibrow)
}

/** The parts a player picks for his own look at the start (round 27). */
export interface ChosenLook {
  skin: number; // 0-6, light to deep
  hair: LegendLook['color'];
  style: Hair;
  face: Face;
}
export const LOOK_STYLES: Hair[] = ['short', 'buzz', 'flattop', 'afro', 'bigafro', 'cornrows', 'twists', 'curly', 'parted', 'long', 'mop', 'mullet', 'bald'];
export const LOOK_FACES: Face[] = ['none', 'stubble', 'mustache', 'goatee', 'beard', 'bigbeard', 'sideburns'];
export const LOOK_HAIRS: LegendLook['color'][] = ['k', 'b', 'l', 'r', 'g'];

// round 27 (owner: "let the user choose the appearance of the player at the start ... the avatar
// shouldn't have any accessories to start with"): the user's player looks as chosen, everywhere
// his name is drawn, with only the accessories he buys (the wardrobe adds those)
const CHOSEN = new Map<string, ChosenLook>();
export function chooseLook(name: string, look: ChosenLook | undefined): void {
  if (look) CHOSEN.set(name, look);
}

/** A legend as he really looked (content/legendLooks.ts), the user's player as he chose, anyone else from his name. */
export function lookTraits(name: string): LookTraits {
  const c = CHOSEN.get(name);
  if (c) return { ...c, gear: [] };
  const l = legendLook(name);
  if (l) return { skin: Math.max(0, Math.min(6, l.skin - 1)), hair: l.color, style: l.hair, face: l.face, gear: l.gear };
  const h = hash(name);
  const h2 = hash(`${name}~`);
  const skin = h % 7;
  const styles: Hair[] = ['short', 'buzz', 'short', 'flattop', 'afro', 'cornrows', 'twists', 'curly', 'bald', skin < 2 ? 'parted' : 'short'];
  const faces: Face[] = ['none', 'none', 'none', 'goatee', 'beard', 'stubble', 'mustache'];
  const gear = [(h2 >>> 11) % 5 === 0 && 'headband', (h2 >>> 15) % 5 === 0 && 'sleeve', (h2 >>> 19) % 4 === 0 && 'wristband'].filter((x): x is string => !!x);
  return { skin, hair: skin < 2 && (h >>> 9) % 3 === 0 ? 'b' : 'k', style: styles[(h2 >>> 3) % styles.length], face: faces[(h2 >>> 7) % faces.length], gear };
}
