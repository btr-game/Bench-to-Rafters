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
  mj: tx("His mid-range jumper: a hand in his face barely bothers it."),
  lebron: tx("On the break, his shot at the rim cannot be blocked and draws more fouls."),
  kareem: tx("The skyhook: it cannot be blocked, and it falls far more often."),
  jokic: tx("A teammate who shoots right after his pass shoots better."),
  wilt: tx("The biggest rebounder in the game, at both ends."),
  shaq: tx("He backs his man down much faster, and his drop step almost always works."),
  bird: tx("In the last two minutes his shots fall more and his meter's green window widens."),
  giannis: tx("He is faster with the ball than without it."),
  curry: tx("His shot meter fills twice as fast."),
  magic: tx("On the break, his passes cannot be picked off and set up better shots."),
  hakeem: tx("His post moves beat his man far more often and leave him frozen longer."),
  duncan: tx("The bank shot: his mid-range jumpers from the wings fall more."),
  russell: tx("He blocks more shots, and his blocks always stay with his team."),
  sga: tx("He draws fouls far more often, on drives and jumpers alike."),
  kd: tx("A contest costs him half as much on every jumper, threes included."),
  kobe: tx("Every make in a row makes his next shot better, up to three."),
  oscar: tx("A guard who rebounds like a forward, and whose passes are safer."),
  luka: tx("A three right after his move beats his man is almost uncontested."),
  drj: tx("He finishes at the rim from further out than anyone."),
  embiid: tx("Defenders who contest his jumper foul him far more."),
  kawhi: tx("Far more steals and strips when he reaches for the ball."),
  wade: tx("A guard who blocks shots, most of all against the break."),
  kg: tx("More defensive rebounds, and his contests bother shooters more."),
  malone: tx("Inside, a shot straight off a pass falls more."),
  west: tx("In the final minute only, every shot of his falls much more."),
  dirk: tx("His jumpers cannot be blocked."),
  harden: tx("His step-back works far more, and he draws fouls on threes."),
  robinson: tx("He blocks more, and runs the floor faster than any other centre."),
};


/** A legend's signature for the screen: its name and what it does; null for a player without one. */
export function signatureOf(name: string): { name: string; text: string } | null {
  const x = SIGNATURES_ON ? LEGEND_TRAITS[name] : undefined;
  return x ? { name: x.name, text: t(TRAIT_TEXT[x.kind]) } : null;
}
