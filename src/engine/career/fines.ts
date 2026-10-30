// Fines (round 25, the owner: treat them like injuries, with a page that says how much). In a
// pro league every game he plays can bring one, like an injury roll: a technical, a flagrant, a
// word about the referees, a missed media session, a late bus. Low morale and a big name make
// them likelier; at most two a season. The money comes out of the bank and the page shows up.

import { FINES } from '../balance';
import { chance, int, pick, type Rng } from '../rng';
import type { GameState, SeasonState } from '../types';
import { fmtMoney } from '../economy/salary';
import { logDecision, pushMoment } from './common';

interface FineKind {
  title: string;
  text: string; // finishes "You have been fined ... "
  amount: [number, number]; // $M in the NBA
}

const KINDS: FineKind[] = [
  { title: 'Technical foul', text: 'for your second technical in a week: you had a lot to say about a blocking call.', amount: [0.002, 0.004] },
  { title: 'Flagrant foul', text: 'for a hard foul on a breakaway. The league reviewed it and did not like what it saw.', amount: [0.025, 0.05] },
  { title: 'Criticising the referees', text: 'for what you said about the officiating after the game. The microphones were on.', amount: [0.025, 0.1] },
  { title: 'Skipped media day', text: 'for missing your media session. The league requires it; the reporters noticed.', amount: [0.025, 0.05] },
  { title: 'Late to the team bus', text: 'by your own team for missing the bus to the arena. The coach did not wait.', amount: [0.005, 0.015] },
  { title: 'Uniform violation', text: 'for wearing unapproved shoes. They looked great. That is not the point.', amount: [0.005, 0.02] },
  { title: 'Throwing the ball into the stands', text: 'for launching the ball into the crowd after the buzzer. Nobody was hurt; the league was not amused.', amount: [0.02, 0.04] },
];

/** After a game he played: maybe a fine. */
export function rollFine(s: GameState, season: SeasonState, rng: Rng, oppShort: string): void {
  if (!['GL', 'EU', 'INT', 'NBA'].includes(s.stage) || (season.fines ?? 0) >= FINES.maxSeason) return;
  const p = s.player;
  const odds = FINES.perGame * (p.morale < 35 ? FINES.lowMorale : 1) * (p.rep >= 70 ? FINES.star : 1);
  if (!chance(rng, odds)) return;
  const k = pick(rng, KINDS);
  const scale = s.stage === 'NBA' ? 1 : FINES.abroad;
  const amount = Math.round(k.amount[0] * scale * 1000 + int(rng, 0, Math.round((k.amount[1] - k.amount[0]) * scale * 1000))) / 1000;
  season.fines = (season.fines ?? 0) + 1;
  p.bank = Math.max(0, p.bank - amount);
  logDecision(s, 'fine', `Fined ${fmtMoney(amount)}: ${k.title.toLowerCase()} (against ${oppShort}).`);
  pushMoment(s, {
    kind: 'fine',
    title: `Fined ${fmtMoney(amount)}`,
    color: '#3b3f48',
    text: `You have been fined ${fmtMoney(amount)} ${k.text}`,
    lines: [k.title, `Bank: ${fmtMoney(p.bank)}`],
  });
}
