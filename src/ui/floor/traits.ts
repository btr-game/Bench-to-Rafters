// What each kind of signature does, in a line (content/legendTraits.ts has who has which; the
// engine's numbers are FLOOR.trait). Shown beside the signature's name, in the player's language.

import type { FloorTrait } from '../../engine/floor/sim';
import { LEGEND_TRAITS, SIGNATURES_ON } from '../../content/legendTraits';
import { t, tx } from '../../i18n';

const TRAIT_TEXT: Record<FloorTrait, string> = {
  quick: tx('Quick release: his shot meter fills much faster.'),
  deep: tx('Deep range: threes from far out cost him nothing, and all his threes fall a little more.'),
  fade: tx('Tough shot maker: a hand in his face bothers his jumper far less.'),
  hook: tx('Hook shot: his hook falls more often and is rarely blocked.'),
  power: tx('Power at the rim: he finishes through contact and is seldom blocked there.'),
  block: tx('Rim protector: he blocks far more shots.'),
  steal: tx('Quick hands: more steals, strips and passes picked off.'),
  handle: tx('Handle: his moves beat his man more often.'),
  stepback: tx('Step-back: his moves work a little more, and a contested three costs him less.'),
  pass: tx('Passer: his passes fly faster and are rarely picked off or thrown away.'),
  glass: tx('On the glass: he comes down with far more rebounds.'),
  clutch: tx('Clutch: in the last two minutes of a game every shot of his falls more.'),
  motor: tx('Motor: his legs tire far more slowly.'),
};


/** A legend's signature for the screen: its name and what it does; null for a player without one. */
export function signatureOf(name: string): { name: string; text: string } | null {
  const x = SIGNATURES_ON ? LEGEND_TRAITS[name] : undefined;
  return x ? { name: x.name, text: t(TRAIT_TEXT[x.kind]) } : null;
}
