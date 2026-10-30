// The last minutes of a final, told play by play (playtest round 9: "minor animations for the
// finals, like buzzer beaters, lead-taking shots, game-changing blocks"). The plays are made up
// to land exactly on the real final score, so the story always matches the box score:
// - a close game (3 points or fewer) trades the lead and ends on a shot at the buzzer;
// - a middle margin has the losing side charge back to within a basket before a dagger;
// - a blowout gets the run that decided it.
// It is seeded from the game itself, so the same final always tells the same story.

import { makeRng, next, type Rng } from '../rng';

export type DramaTag = 'LEAD' | 'TIE' | 'BLOCK' | 'BUZZER' | 'DAGGER' | 'STEAL' | 'RUN' | 'MISS' | 'STOP' | '';

export interface DramaPlay {
  clock: string;
  side: 'us' | 'them' | 'none';
  pts: number;
  text: string;
  tag: DramaTag;
  mine: boolean; // his play
}

export interface Drama {
  start: { us: number; them: number }; // the score when the story starts
  plays: DramaPlay[];
}

export interface DramaCast {
  me: string | null; // null when he did not play
  mates: string[];
  opps: string[];
  us: string; // short team names
  them: string;
}

export const VERB2 = ['drives and scores', 'hits the turnaround', 'finishes through contact', 'throws it down', 'hits the floater', 'scores on the putback'];
export const VERB3 = ['drills a three', 'pulls up from deep', 'buries the corner three', 'hits a step-back three'];
const pickOf = <T>(r: Rng, a: T[]): T => a[Math.floor(next(r) * a.length)];
const last = (n: string) => n.split(' ').slice(-1)[0];

export function buildDrama(g: { us: number; them: number }, cast: DramaCast, seed: number): Drama {
  const r = makeRng(seed >>> 0 || 1);
  const m = g.us - g.them;
  const win = m > 0;
  const am = Math.abs(m);
  const team = (side: 'us' | 'them') => (side === 'us' ? cast.us : cast.them);
  const who = (side: 'us' | 'them', star = 0.45): { name: string; mine: boolean } => {
    if (side === 'us' && cast.me && next(r) < star) return { name: last(cast.me), mine: true };
    const pool = side === 'us' ? cast.mates : cast.opps;
    return { name: pool.length ? last(pickOf(r, pool.slice(0, 5))) : side === 'us' ? 'A teammate' : `${cast.them}'s guard`, mine: false };
  };
  const shot = (side: 'us' | 'them', pts: number, star?: number) => {
    const p = who(side, star);
    return { ...p, verb: pickOf(r, pts === 3 ? VERB3 : VERB2) };
  };
  const scoring: { side: 'us' | 'them'; pts: number }[] = [];
  const W: 'us' | 'them' = win ? 'us' : 'them';
  const L: 'us' | 'them' = win ? 'them' : 'us';

  if (am <= 3) {
    // trade the lead: walk back from the winning shot, the sides taking turns
    const v = am === 3 ? 3 : 2;
    const back: { side: 'us' | 'them'; pts: number }[] = [];
    let side: 'us' | 'them' = L;
    for (let i = 0; i < 4; i++) {
      back.push({ side, pts: next(r) < 0.35 ? 3 : 2 });
      side = side === 'us' ? 'them' : 'us';
    }
    scoring.push(...back.reverse(), { side: W, pts: v });
  } else if (am <= 10) {
    // the comeback that falls short (the lead shrinks by five), and the dagger
    scoring.push({ side: W, pts: 2 }, { side: L, pts: 3 }, { side: L, pts: 2 }, { side: W, pts: 3 });
  } else {
    scoring.push({ side: W, pts: 3 }, { side: W, pts: 2 }, { side: W, pts: 3 }, { side: W, pts: 2 });
  }

  // the score when the story starts
  const sumUs = scoring.filter((x) => x.side === 'us').reduce((a, x) => a + x.pts, 0);
  const sumThem = scoring.filter((x) => x.side === 'them').reduce((a, x) => a + x.pts, 0);
  const start = { us: Math.max(0, g.us - sumUs), them: Math.max(0, g.them - sumThem) };
  const clocks = am <= 3 ? ['3:12', '2:24', '1:31', '0:47', '0:06'] : am <= 10 ? ['4:05', '2:58', '1:52', '0:41'] : ['9:40', '8:12', '6:55', '5:20'];
  let us = start.us;
  let them = start.them;
  const plays: DramaPlay[] = [];
  if (am > 10) plays.push({ clock: '11:30', side: 'none', pts: 0, text: `${team(W)} come out of the timeout on a mission.`, tag: 'RUN', mine: false });
  scoring.forEach((x, i) => {
    const before = us - them;
    if (x.side === 'us') us += x.pts;
    else them += x.pts;
    const after = us - them;
    const lastShot = i === scoring.length - 1;
    const s = shot(x.side, x.pts, lastShot && x.side === 'us' ? 0.65 : 0.45);
    const t = team(x.side);
    const lead = (d: number) => (x.side === 'us' ? d : -d);
    let tag: DramaTag = '';
    let text = `${s.name} ${s.verb}`;
    if (lastShot && am <= 3) {
      tag = 'BUZZER';
      text = `${s.name} ${s.verb} as the buzzer sounds! ${lead(after) > 0 ? `${t} win it.` : ''}`;
    } else if (lastShot && am <= 10) {
      tag = 'DAGGER';
      text = `${s.name} ${s.verb}. That is the dagger.`;
    } else if (lead(before) <= 0 && lead(after) > 0) {
      tag = 'LEAD';
      text = `${s.name} ${s.verb}: ${t} take the lead`;
    } else if (after === 0) {
      tag = 'TIE';
      text = `${s.name} ${s.verb} to tie it at ${us}`;
    } else if (lead(after) < 0) text = `${s.name} ${s.verb}. ${t} within ${-lead(after)}`;
    else text = `${s.name} ${s.verb}. ${t} lead by ${lead(after)}`;
    plays.push({ clock: lastShot && am <= 3 ? '0:00.4' : clocks[Math.min(i, clocks.length - 1)], side: x.side, pts: x.pts, text, tag, mine: s.mine });
    // a stop in crunch time, just before the final shot
    if (am <= 10 && i === scoring.length - 2) {
      const d = who(W, 0.5);
      const kind = next(r) < 0.6 ? 'BLOCK' : 'STEAL';
      const o = who(L);
      plays.push({
        clock: am <= 3 ? '0:19' : '1:08',
        side: 'none',
        pts: 0,
        text: kind === 'BLOCK' ? `${d.name} blocks ${o.mine ? 'your' : `${o.name}'s`} layup! A game-changing block.` : `${d.name} jumps the passing lane. Steal!`,
        tag: kind,
        mine: d.mine,
      });
    }
  });
  if (am > 10) plays.push({ clock: '2:00', side: 'none', pts: 0, text: `The benches empty. ${team(W)} cruise home.`, tag: 'STOP', mine: false });
  else if (!win && am <= 3 && cast.me) plays.push({ clock: '0:00', side: 'none', pts: 0, text: `${last(cast.me)}'s heave at the horn rims out.`, tag: 'MISS', mine: true });
  return { start, plays };
}
