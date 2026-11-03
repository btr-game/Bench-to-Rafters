// Round 21: the event renovation. Many early turning points moved one number (a little morale,
// a point of coach trust) and their "no" choices did nothing at all. Each entry here adds what
// else that choice sets in motion: his body (weight, wear, injury risk), the locker room (team
// chemistry, and quietly the bond with the teammates he recruited), his money, his development
// next season. The resolver runs the ripple right after the choice itself, so the roll for how
// it turned out (breakthrough to backfire) covers both, and the result card lists everything.
// Keyed by event id, then the choice's label.

import { ATTR_MAX } from '../balance';
import { chance, clamp, pick, type Rng } from '../rng';
import type { AttrKey, GameState } from '../types';
import { adjust } from '../career/common';
import { nudgeBonds } from '../career/duo';
import { addPounds } from '../player/weight';
import { addTouch } from '../player/touch';

type Ripple = (s: GameState, rng: Rng) => string | void;

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const wear = (s: GameState, v: number) => (s.player.wear = clamp((s.player.wear ?? 0) + v, 0, 100));
const injury = (s: GameState, m: number) => (s.player.injuryMultNext *= m);
const develop = (s: GameState, m: number) => (s.player.growthMultNext *= m);
const chem = (s: GameState, v: number) => {
  if (s.season) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) + v) * 10) / 10;
};
/** Pulls him closer to a teammate he recruited, and says so without saying how much. */
const closer = (s: GameState, v: number): string => {
  const b = nudgeBonds(s, v);
  return b ? ` ${b.name} was right there with you.` : '';
};
const mainFocus = (s: GameState): AttrKey => s.player.focus[0] ?? 'IQ';

export const RIPPLES: Record<string, Record<string, Ripple>> = {
  corner3: {
    'Start the 2-season range program': (s) => {
      trust(s, 2);
      wear(s, 2);
      return 'The coaches see you in the gym before anyone else.';
    },
    Decline: (s) => {
      morale(s, 1);
      return 'A summer with some time off.';
    },
  },
  offhand: {
    'Start the 3-season program': (s) => {
      bump(s, 'FIN', -0.5);
      bump(s, 'PLY', 0.5);
      return 'Your finishing gets clumsy for a while, but you see the whole floor now.';
    },
    Decline: (s) => {
      wear(s, -1);
    },
  },
  party: {
    Go: (s, rng) => {
      addPounds(s.player, 2);
      injury(s, 1.03);
      chem(s, 0.2);
      if (chance(rng, 0.3)) {
        rep(s, 1);
        return 'Someone posts the pictures. The fans love it.' + closer(s, 4);
      }
      return 'The whole team was there, at least.' + closer(s, 4);
    },
    'Stay in': (s) => {
      wear(s, -2);
      morale(s, -1);
    },
  },
  finals: {
    Study: (s) => {
      bump(s, 'IQ', 0.6);
      chem(s, 0.2);
      return 'You walk the others through what you saw.';
    },
    'Wing it': (s, rng) => {
      if (chance(rng, 0.5)) {
        rep(s, 2);
        return 'You played free, and it showed.';
      }
      trust(s, -2);
      return 'You missed a coverage the whole staff saw coming.';
    },
  },
  paper: {
    'Do it': (s, rng) => {
      morale(s, 2);
      if (chance(rng, 0.25)) {
        trust(s, -1);
        return 'The coach thinks you talked a little too much.';
      }
    },
    'Keep a low profile': (s) => {
      bump(s, 'IQ', 0.3);
      return 'The time goes into film instead.';
    },
  },
  viral: {
    'Post everywhere': (s) => {
      const pay = Math.round((0.01 + s.player.rep * 0.0006) * 1000) / 1000;
      s.player.bank += pay;
      s.player.earnings += pay;
      chem(s, -0.2);
      return 'A sponsor pays for a post. A few teammates roll their eyes.';
    },
    'Stay humble': (s) => {
      chem(s, 0.2);
      rep(s, 0.5);
      return 'You credit the screen and the pass. The locker room notices.';
    },
  },
  ankle: {
    'Play through it': (s) => {
      wear(s, 3);
      injury(s, 1.06);
      bump(s, 'ATH', -0.4);
      return 'It holds, but you feel it on every cut.';
    },
    'Sit out': (s) => {
      wear(s, -3);
      addPounds(s.player, 2);
      return 'Your legs get a rest. The snacks get a workout.';
    },
  },
  coachfeud: {
    'Apologize in front of the team': (s) => {
      chem(s, 0.3);
    },
    'Stand your ground': (s, rng) => {
      rep(s, 1);
      chem(s, -0.3);
      if (chance(rng, 0.3)) {
        morale(s, 3);
        return 'A couple of the veterans tell you they had your back.';
      }
    },
  },
  extension: {
    'Sign the extension': (s) => {
      develop(s, 0.97);
      return 'The pressure is off. Maybe a little too off.';
    },
    'Bet on yourself': (s) => {
      develop(s, 1.06);
      wear(s, 2);
      return 'Every game is an audition now, and you play like it.';
    },
  },
  opportunity: {
    'Step up': (s, rng) => {
      rep(s, 1);
      wear(s, 2);
      bump(s, pick(rng, ['SHT', 'PLY'] as AttrKey[]), 0.5);
    },
    'Stay in your lane': (s) => {
      chem(s, 0.3);
      return 'The rotation stays steady.' + closer(s, 3);
    },
  },
  socialbeef: {
    'Clap back': (s, rng) => {
      chem(s, -0.2);
      if (chance(rng, 0.4)) {
        rep(s, 2);
        return 'The reply goes viral.';
      }
    },
    'Log off for a month': (s) => {
      bump(s, 'IQ', 0.3);
      develop(s, 1.03);
      return 'A month of quiet. You read more defenses than tweets.';
    },
  },
  homesick: {
    'Explore the city': (s) => {
      rep(s, 1);
      addPounds(s.player, 2);
      return 'The locals love you, and so does the bakery on the corner.';
    },
    'Call home every night': (s) => {
      develop(s, 0.98);
    },
  },
  agentfraud: {
    'Sue him': (s, rng) => {
      trust(s, -1);
      if (chance(rng, 0.5)) {
        rep(s, 1);
        return 'Other players thank you for going public.';
      }
    },
    'Cut him off and move on': (s) => {
      develop(s, 1.03);
      return 'Your head goes back to basketball.';
    },
  },
  coachfired: {
    'Back him in public': (s) => {
      chem(s, 0.2);
      return closer(s, 3).trim() || undefined;
    },
    'Stay out of it': (s) => {
      bump(s, 'IQ', 0.3);
    },
  },
  psychologist: {
    'Start seeing her': (s) => {
      develop(s, 1.04);
    },
    'Handle it yourself': (s, rng) => {
      if (!chance(rng, 0.35)) return;
      morale(s, -4);
      bump(s, 'SHT', -0.4);
      addTouch(s.player, -1.5); // round 35: free-throw touch
      return 'It catches up with you at the free-throw line.';
    },
  },
  newborn: {
    'Take the summer off': (s) => {
      addPounds(s.player, 4);
      return 'Dad strength, and a few dad pounds.';
    },
    'Keep your training schedule': (s) => {
      wear(s, 2);
    },
  },
  carcrash: {
    'Get every scan the team doctors offer': (s) => {
      injury(s, 0.95);
    },
    'Shake it off and keep training': (s) => {
      injury(s, 1.08);
      wear(s, 3);
    },
  },
  legendCalls: {
    'Spend the summer learning from him': (s) => {
      bump(s, 'IQ', 0.6);
    },
    'Thank him and keep your routine': (s) => {
      bump(s, mainFocus(s), 0.3);
    },
  },
  skillstrainer: {
    'Hire him for good': (s) => {
      bump(s, mainFocus(s), 0.5);
    },
    'Keep your current routine': (s) => {
      morale(s, 1);
    },
  },
  complacent: {
    'Stay hungry': (s) => {
      wear(s, 2);
      addPounds(s.player, -3);
    },
    'Enjoy it': (s) => {
      addPounds(s.player, 5, 0.2);
      rep(s, 1);
      return 'Good restaurants, good seats, a softer middle.';
    },
  },
  shootingcamp: {
    'Rebuild your shot from the feet up': (s) => {
      trust(s, -1);
      return 'The first weeks of the new form are ugly.';
    },
    'Just get extra reps': (s) => {
      wear(s, 1);
    },
  },
  lockdowncoach: {
    'Perimeter footwork and hands': (s) => {
      bump(s, 'ATH', 0.3);
      wear(s, 1);
    },
    'Rim protection and verticality': (s) => {
      addPounds(s.player, 3, 0.3);
      bump(s, 'REB', 0.4);
    },
  },
  touchsummer: {
    'Mikan drills until your arms hurt': (s) => {
      bump(s, 'REB', 0.3);
    },
  },
  passers: {
    'Watch all of it, twice': (s) => {
      chem(s, 0.3);
      return 'Your teammates start getting the ball where they want it.' + closer(s, 3);
    },
    'Skim the highlights': (s) => {
      morale(s, 1);
    },
  },
  shoeLab: {
    'Do the whole program': (s) => {
      injury(s, 0.95);
      return 'They fix how you land, too.';
    },
    Pass: (s) => {
      morale(s, 1);
    },
  },
  clutchDrill: {
    'Thousand game-winners': (s) => {
      wear(s, 2);
    },
    'Talk to someone': (s) => {
      develop(s, 1.03);
    },
  },
  ringChaserDoubt: {
    'Own the role': (s) => {
      chem(s, 0.4);
      return 'The young players watch how you take it.';
    },
  },
  glassCleaner: {
    'Do the week': (s) => {
      addPounds(s.player, 2, 0.3);
      wear(s, 1);
    },
    'Not this summer': (s) => {
      wear(s, -2);
    },
  },
};

/** What else the choice sets in motion: extra text for the result, or '' when nothing does. */
export function ripple(s: GameState, rng: Rng, eventId: string, label: string): string {
  const r = RIPPLES[eventId]?.[label];
  return (r && r(s, rng)) || '';
}
