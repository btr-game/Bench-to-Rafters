import type { Attrs, Pos } from '../types';

export interface Archetype {
  pos: Pos;
  name: string;
  blurb: string;
  attrs: Attrs;
  range: number;
}

const a = (SHT: number, FIN: number, PLY: number, PER: number, INT: number, REB: number, ATH: number, IQ: number): Attrs => ({
  SHT,
  FIN,
  PLY,
  PER,
  INT,
  REB,
  ATH,
  IQ,
});

// §6 archetypes. Every card totals 320.
export const ARCHETYPES: Record<Pos, Archetype[]> = {
  PG: [
    { pos: 'PG', name: 'Floor General', blurb: 'Runs the offense, sees everything', attrs: a(40, 34, 56, 38, 26, 28, 40, 58), range: 35 },
    { pos: 'PG', name: 'Scoring Guard', blurb: 'Gets buckets off the bounce', attrs: a(54, 44, 44, 34, 24, 26, 46, 48), range: 40 },
    { pos: 'PG', name: 'Two-Way Guard', blurb: 'Hounds the ball, runs the break', attrs: a(42, 38, 48, 54, 24, 26, 44, 44), range: 30 },
  ],
  SG: [
    { pos: 'SG', name: 'Sharpshooter', blurb: 'Lights-out jumper', attrs: a(60, 36, 38, 36, 26, 28, 40, 56), range: 45 },
    { pos: 'SG', name: 'Slasher', blurb: 'Lives at the rim', attrs: a(40, 58, 42, 36, 24, 28, 56, 36), range: 25 },
    { pos: 'SG', name: '3&D Guard', blurb: 'Hits the open three, takes the best guard', attrs: a(54, 36, 36, 54, 26, 30, 44, 40), range: 40 },
  ],
  SF: [
    { pos: 'SF', name: 'Point Forward', blurb: 'Big wing who runs the offense', attrs: a(44, 44, 52, 42, 28, 34, 36, 40), range: 30 },
    { pos: 'SF', name: '3&D Wing', blurb: 'Corner threes and lockdown defense', attrs: a(52, 38, 32, 56, 30, 30, 44, 38), range: 40 },
    { pos: 'SF', name: 'Athletic Wing', blurb: 'Above the rim in transition', attrs: a(38, 54, 32, 46, 30, 34, 58, 28), range: 25 },
  ],
  PF: [
    { pos: 'PF', name: 'Stretch Four', blurb: 'Pulls bigs out to the arc', attrs: a(54, 42, 28, 30, 42, 48, 36, 40), range: 40 },
    { pos: 'PF', name: 'Bruiser', blurb: 'Bully ball and the glass', attrs: a(24, 54, 26, 28, 50, 58, 44, 36), range: 20 },
    { pos: 'PF', name: 'Rim Runner', blurb: 'Lobs, putbacks and energy', attrs: a(20, 58, 24, 30, 48, 52, 58, 30), range: 20 },
  ],
  C: [
    { pos: 'C', name: 'Rim Protector', blurb: 'Nothing gets to the rim', attrs: a(24, 48, 30, 32, 54, 54, 46, 32), range: 20 },
    { pos: 'C', name: 'Stretch Big', blurb: 'Shoots it from deep at seven feet', attrs: a(50, 44, 26, 22, 48, 54, 32, 44), range: 35 },
    { pos: 'C', name: 'Post Scorer', blurb: 'Back to the basket, soft touch', attrs: a(30, 60, 32, 22, 48, 56, 34, 38), range: 20 },
  ],
};
