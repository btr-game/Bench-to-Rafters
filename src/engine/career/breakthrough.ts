// Two season-end records (playtest round 7).
// - Breakthrough seasons: changing focus stats is earned. A season counts as a breakthrough when
//   his OVR or any single rating jumps well past what is normal for his age (thresholds below,
//   about the top quarter of seasons at every age), and only then may he pick new focus stats
//   that offseason. About one season in four.
// - Career highs: his best single game in each box-score stat, in the NBA and at any level.

import { ATTRS, FOCUS_BREAKTHROUGH } from '../balance';
import type { AttrKey, CareerHigh, GameLog, GameState, HighKey, LevelKey, SeasonState } from '../types';
import { NAMES } from '../../content/strings';
import { logDecision, pushMoment } from './common';
import { ovrOf } from '../player/ovr';

export function breakthroughBar(age: number): { ovr: number; attr: number } {
  const row = FOCUS_BREAKTHROUGH.find((r) => age <= r.upTo) ?? FOCUS_BREAKTHROUGH[FOCUS_BREAKTHROUGH.length - 1];
  return { ovr: row.ovr, attr: row.attr };
}

/** Checks the season just finished; unlocks a focus change for this offseason when it was a breakthrough. */
export function evaluateBreakthrough(s: GameState, season: SeasonState): string {
  const p = s.player;
  const dOvr = ovrOf(p.attrs, p.pos) - season.ovrStart;
  let key: AttrKey = ATTRS[0];
  for (const k of ATTRS) if (p.attrs[k] - season.attrsStart[k] > p.attrs[key] - season.attrsStart[key]) key = k;
  const dAttr = p.attrs[key] - season.attrsStart[key];
  const bar = breakthroughBar(p.age);
  const byOvr = dOvr >= bar.ovr;
  const byAttr = dAttr >= bar.attr;
  if (!byOvr && !byAttr) return '';
  s.breakthrough = { year: s.year, ovr: Math.round(dOvr * 10) / 10, key, gain: Math.round(dAttr * 10) / 10 };
  const what = byOvr ? `OVR up ${dOvr.toFixed(1)} in one season` : `${NAMES.attr[key]} up ${dAttr.toFixed(1)} in one season`;
  logDecision(s, 'breakthrough', `Breakthrough season: ${what}.`);
  pushMoment(s, {
    kind: 'event',
    title: 'Breakthrough season',
    color: '#B8860B',
    text: `Something clicked this year: ${what.toLowerCase()}. You have earned a new focus: this offseason you may pick two new focus stats.`,
    lines: [byOvr ? `OVR +${dOvr.toFixed(1)}` : `${NAMES.attr[key]} +${dAttr.toFixed(1)}`, 'Focus change unlocked for this offseason'],
  });
  return `${what}.`;
}

const HIGH_KEYS: HighKey[] = ['pts', 'reb', 'ast', 'stl', 'blk', 'tpm'];
export const HIGH_LABEL: Record<HighKey, string> = { pts: 'Points', reb: 'Rebounds', ast: 'Assists', stl: 'Steals', blk: 'Blocks', tpm: 'Threes made' };

/** Updates career highs from this season's games. Returns the new NBA highs, for the season summary. */
export function updateHighs(s: GameState, games: GameLog[], level: LevelKey, team: string): string[] {
  s.highs ??= { nba: {}, all: {} };
  const fresh: string[] = [];
  for (const g of games) {
    if (!g.line) continue;
    const lv: LevelKey = g.post === 'G League' ? 'GL' : level;
    for (const k of HIGH_KEYS) {
      const v = g.line[k];
      if (v <= 0) continue;
      const rec: CareerHigh = { v, year: s.year, level: lv, team, opp: g.opp, post: g.post && g.post !== 'G League' ? g.post : undefined };
      if (!s.highs.all[k] || v > s.highs.all[k]!.v) s.highs.all[k] = rec;
      if (lv === 'NBA' && (!s.highs.nba[k] || v > s.highs.nba[k]!.v)) {
        const had = s.highs.nba[k];
        s.highs.nba[k] = rec;
        if (had) fresh.push(k);
      }
    }
  }
  // one line per stat, with the final number
  return [...new Set(fresh)].map((k) => `${s.highs!.nba[k as HighKey]!.v} ${HIGH_LABEL[k as HighKey].toLowerCase()}`);
}
