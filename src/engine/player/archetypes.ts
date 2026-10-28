import type { Attrs, Pos } from '../types';

export interface Archetype {
  pos: Pos;
  name: string;
  blurb: string;
  attrs: Attrs;
  range: number;
  height?: number; // inches added to the position's usual height
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
    { pos: 'PG', name: 'Jumbo Playmaker', blurb: 'A forward\'s body with a point guard\'s eyes', attrs: a(38, 40, 54, 40, 30, 36, 38, 44), range: 30, height: 4 },
    { pos: 'PG', name: 'Speedster', blurb: 'End to end in four seconds', attrs: a(38, 48, 46, 40, 20, 22, 60, 46), range: 30, height: -2 },
  ],
  SG: [
    { pos: 'SG', name: 'Sharpshooter', blurb: 'Lights-out jumper', attrs: a(60, 36, 38, 36, 26, 28, 40, 56), range: 45 },
    { pos: 'SG', name: 'Slasher', blurb: 'Lives at the rim', attrs: a(40, 58, 42, 36, 24, 28, 56, 36), range: 25 },
    { pos: 'SG', name: '3&D Guard', blurb: 'Hits the open three, takes the best guard', attrs: a(54, 36, 36, 54, 26, 30, 44, 40), range: 40 },
    { pos: 'SG', name: 'Combo Guard', blurb: 'Runs the point or plays off the ball', attrs: a(48, 42, 50, 38, 24, 28, 44, 46), range: 35, height: -1 },
    { pos: 'SG', name: 'Shot Creator', blurb: 'Isolation, step-backs and the midrange', attrs: a(56, 50, 42, 30, 22, 26, 44, 50), range: 35 },
  ],
  SF: [
    { pos: 'SF', name: 'Point Forward', blurb: 'Big wing who runs the offense', attrs: a(44, 44, 52, 42, 28, 34, 36, 40), range: 30 },
    { pos: 'SF', name: '3&D Wing', blurb: 'Corner threes and lockdown defense', attrs: a(52, 38, 32, 56, 30, 30, 44, 38), range: 40 },
    { pos: 'SF', name: 'Athletic Wing', blurb: 'Above the rim in transition', attrs: a(38, 54, 32, 46, 30, 34, 58, 28), range: 25 },
    { pos: 'SF', name: 'Scoring Wing', blurb: 'Three levels of buckets', attrs: a(54, 50, 38, 36, 28, 32, 44, 38), range: 35 },
    { pos: 'SF', name: 'Glue Guy', blurb: 'Defends, rebounds, makes the right play', attrs: a(40, 38, 38, 50, 34, 40, 40, 40), range: 30, height: 1 },
  ],
  PF: [
    { pos: 'PF', name: 'Stretch Four', blurb: 'Pulls bigs out to the arc', attrs: a(54, 42, 28, 30, 42, 48, 36, 40), range: 40 },
    { pos: 'PF', name: 'Bruiser', blurb: 'Bully ball and the glass', attrs: a(24, 54, 26, 28, 50, 58, 44, 36), range: 20 },
    { pos: 'PF', name: 'Rim Runner', blurb: 'Lobs, putbacks and energy', attrs: a(20, 58, 24, 30, 48, 52, 58, 30), range: 20 },
    { pos: 'PF', name: 'Two-Way Forward', blurb: 'Guards one through five', attrs: a(38, 40, 30, 46, 44, 46, 40, 36), range: 30, height: -1 },
    { pos: 'PF', name: 'Playmaking Four', blurb: 'Grabs the board and brings it up', attrs: a(40, 47, 42, 30, 38, 47, 34, 42), range: 30 },
  ],
  C: [
    { pos: 'C', name: 'Rim Protector', blurb: 'Nothing gets to the rim', attrs: a(24, 48, 30, 32, 54, 54, 46, 32), range: 20 },
    { pos: 'C', name: 'Stretch Big', blurb: 'Shoots it from deep at seven feet', attrs: a(50, 44, 26, 22, 48, 54, 32, 44), range: 35 },
    { pos: 'C', name: 'Post Scorer', blurb: 'Back to the basket, soft touch', attrs: a(30, 60, 32, 22, 48, 56, 34, 38), range: 20 },
    { pos: 'C', name: 'Playmaking Big', blurb: 'Runs the offense from the elbow', attrs: a(30, 44, 48, 24, 44, 50, 30, 50), range: 25 },
    { pos: 'C', name: 'Lob Threat', blurb: 'Springs, length and alley-oops', attrs: a(22, 56, 22, 34, 50, 54, 58, 24), range: 15, height: 1 },
  ],
};
