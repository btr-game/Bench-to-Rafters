// Two secrets on the main land (owner, after round 41: "can we add the masterkey and dev key in as
// easter eggs somewhere?"): a bottle in the water holds the master code, and the old cheat code typed
// on the keyboard (up up down down left right left right B A) brings the developer's key. Both are
// kept lightly encoded, as the exit code is (road.ts), so the page never spells them out.

const BOTTLE = [64, 82, 47, 37, 50, 51, 61, 18, 31];
const DESK = [87, 72, 49, 46, 52, 46];
const shown = (a: number[]): string => String.fromCharCode(...a.map((c, i) => c ^ (0x35 + 7 * i)));

/** The master code, as the bottle's note shows it. */
export const bottleCode = (): string => shown(BOTTLE);
/** The dev deck's password, as the developer's note shows it. */
export const deskKey = (): string => shown(DESK);

/** The old cheat code, key by key. */
export const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

/** Feeds a key to the code; true when it completes it. `at` is how far along the code is. */
export function konamiStep(at: number, key: string): { at: number; done: boolean } {
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (k === KONAMI[at]) return at + 1 === KONAMI.length ? { at: 0, done: true } : { at: at + 1, done: false };
  // a wrong key starts over (an Up can start it again; a third Up keeps the two before it)
  return { at: k === KONAMI[0] ? (at === 2 ? 2 : 1) : 0, done: false };
}
