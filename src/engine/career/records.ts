// Record chases (round 32, owner: "The game alerts you when you are close to a franchise or all-time
// record ... this could work as a simple warning system. sure, embed it, but dont make it influence
// the game too much"). Two kinds: the all-time scoring list (the legends at about RECORD_CHASE.games
// games a season), when this season could carry him past the next name on it; and the league's
// single-game records, when one of his NBA career highs is close. Chasing the list for a season is
// his call: a few more shots, a little more risk, a little chemistry.

import { LEGENDS } from '../../content/legends';
import { RECORD_CHASE as R } from '../balance';
import { nbaCareerPoints } from '../awards/legacy';
import type { GameState, HighKey } from '../types';
import { logDecision, tally } from './common';

/** The league's single-game records. */
export const GAME_RECORDS: Record<HighKey, { v: number; what: string }> = {
  pts: { v: 100, what: 'points in a game' },
  reb: { v: 55, what: 'rebounds in a game' },
  ast: { v: 30, what: 'assists in a game' },
  stl: { v: 11, what: 'steals in a game' },
  blk: { v: 17, what: 'blocks in a game' },
  tpm: { v: 14, what: 'threes in a game' },
};

/** The legends' career points, about (their scoring average over their seasons), most first. */
export const SCORING_LIST = LEGENDS.map((l) => ({ name: l.name, pts: Math.round(l.ppg * l.seasons * R.games) })).sort((a, b) => b.pts - a.pts);

export interface Watch {
  kind: 'list' | 'game';
  text: string;
  /** For the scoring list: the name to pass and the points still to go. */
  name?: string;
  gap?: number;
}

/** What he is close to now. The list counts while he plays in the NBA; a season's pace is his last
 * NBA season's points (or this one's so far, if more). */
export function recordWatch(s: GameState): Watch[] {
  if (s.stage !== 'NBA' || s.step === 'retired') return [];
  const out: Watch[] = [];
  const mine = nbaCareerPoints(s) + (s.season?.games.reduce((a, g) => a + (g.line?.pts ?? 0), 0) ?? 0);
  const last = [...s.history].reverse().find((h) => h.level === 'NBA');
  const pace = Math.max(last ? last.line.pts + last.post.pts : 0, 0);
  const above = SCORING_LIST.filter((l) => l.pts > mine);
  const next = above[above.length - 1];
  const rank = above.length + 1;
  if (next && pace > 0 && next.pts - mine <= pace) {
    out.push({ kind: 'list', name: next.name, gap: next.pts - mine, text: `${(next.pts - mine).toLocaleString('en-US')} points from passing ${next.name} (about ${next.pts.toLocaleString('en-US')}) for ${ordinalOf(rank - 1)} on the all-time scoring list.` });
  }
  for (const k of Object.keys(GAME_RECORDS) as HighKey[]) {
    const h = s.highs?.nba?.[k]?.v ?? 0;
    const rec = GAME_RECORDS[k];
    if (h >= rec.v * R.near && h < rec.v) out.push({ kind: 'game', text: `Your career high of ${h} is ${rec.v - h} short of the league record: ${rec.v} ${rec.what}.` });
  }
  return out;
}

const ordinalOf = (n: number): string => {
  const t = n % 100;
  return `${n}${t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

/** Chasing the list this season. */
export const chasing = (s: GameState): boolean => s.flags.chase === s.year && s.stage === 'NBA';

export function canChase(s: GameState): boolean {
  return !chasing(s) && !!s.season && s.step !== 'postseason' && s.step !== 'summary' && recordWatch(s).some((w) => w.kind === 'list');
}

export function chaseRecord(s: GameState): void {
  if (!canChase(s)) return;
  const w = recordWatch(s).find((x) => x.kind === 'list')!;
  s.flags.chase = s.year;
  tally(s, 'chases');
  if (s.season) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) - R.chem) * 100) / 100;
  logDecision(s, 'record', `Chasing ${w.name} on the all-time scoring list this season: more shots, a little more risk.`);
  s.toast = `Chasing ${w.name}: a few more shots your way this season.`;
}
