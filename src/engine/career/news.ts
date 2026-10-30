// The news about him (round 25, the owner: an AI that makes the news change the options; trade
// rumours, for one, bring more teams and more money). At the end of every pro season the papers
// read the season and write what they see; some stories carry weight into the summer's free
// agency: more suitors (offers), bigger or smaller numbers (salary).

import { chance, clamp } from '../rng';
import type { GameState } from '../types';

export interface NewsItem {
  year: number;
  kind: 'rumour' | 'buzz' | 'body' | 'breakout' | 'doubt' | 'oldteam' | 'rival';
  text: string;
  fx?: { offers?: number; salary?: number }; // into next summer's free agency
}

/** At the end of a pro season: what the papers write about him. */
export function writeNews(s: GameState): void {
  const last = s.history[s.history.length - 1];
  if (!last || !['NBA', 'EU', 'INT', 'GL'].includes(s.stage)) return;
  const p = s.player;
  const out: NewsItem[] = [];
  const y = s.year;
  const wp = last.w + last.l > 0 ? last.w / (last.w + last.l) : 0.5;
  if ((p.trust < 40 || wp < 0.4 || (s.contract?.years ?? 9) <= 1) && chance(s.rng, 0.55))
    out.push({ year: y, kind: 'rumour', text: `Trade rumours: three teams have called about you. ${p.trust < 40 ? 'The coach did not deny it.' : 'Your agent is smiling.'}`, fx: { offers: 0.8, salary: 1.04 } });
  const mvp = last.races.find((r) => r.award === 'MVP');
  if (mvp?.userRank && mvp.userRank <= 5) out.push({ year: y, kind: 'buzz', text: `MVP buzz: ${mvp.userRank === 1 ? 'the best player in the league, and everyone knows it' : `${mvp.userRank === 2 ? 'second' : mvp.userRank === 3 ? 'third' : `${mvp.userRank}th`} in the MVP voting`}.`, fx: { salary: 1.05 } });
  const hurt = (p.injuries ?? []).filter((x) => (x.year ?? y) === y);
  if (hurt.some((x) => x.days >= 60) || hurt.length >= 2) out.push({ year: y, kind: 'body', text: 'Questions about your body: front offices are reading the medical reports.', fx: { offers: -0.5, salary: 0.94 } });
  if (last.ovrEnd >= last.ovrStart + 4) out.push({ year: y, kind: 'breakout', text: `Breakout season: OVR ${last.ovrStart} to ${last.ovrEnd}, and every scout noticed.`, fx: { offers: 0.5, salary: 1.03 } });
  else if (last.ovrEnd <= last.ovrStart - 3) out.push({ year: y, kind: 'doubt', text: 'Doubts: is the decline starting? The columnists think so.', fx: { salary: 0.96 } });
  const prev = s.history[s.history.length - 2];
  if (prev && prev.teamName !== last.teamName && prev.level === last.level) {
    const old = (s.stage === 'NBA' ? s.nba : s.league)?.teams.find((t) => t.name === prev.teamName);
    if (old) out.push({ year: y, kind: 'oldteam', text: `Your old team, the ${old.name}, went ${old.w}–${old.l} without you.` });
  }
  const r = s.rivalry;
  if (r && !r.ended && r.seasons.length) {
    const x = r.seasons[r.seasons.length - 1];
    out.push({ year: y, kind: 'rival', text: x.me > x.him ? `You are ahead of ${r.name} now: OVR ${x.me} to ${x.him}.` : x.me < x.him ? `${r.name} is ahead of you: OVR ${x.him} to ${x.me}. The papers love it.` : `You and ${r.name}: dead even at OVR ${x.me}.` });
  }
  if (out.some((n) => n.kind === 'rumour')) p.morale = clamp(p.morale - 2, 0, 100);
  if (out.some((n) => n.kind === 'buzz')) p.rep = clamp(p.rep + 1, 0, 100);
  s.news = [...(s.news ?? []), ...out].slice(-10);
}

/** What this summer's news does to his free agency. */
export function newsFx(s: GameState): { offers: number; salary: number } {
  const now = (s.news ?? []).filter((n) => n.year === s.year && n.fx);
  return { offers: now.reduce((a, n) => a + (n.fx!.offers ?? 0), 0), salary: now.reduce((a, n) => a * (n.fx!.salary ?? 1), 1) };
}

/** The papers' line on what the news means for him, for Around the league. */
export const NEWS_EFFECT: Partial<Record<NewsItem['kind'], string>> = {
  rumour: 'More teams will call this summer, with a little more money',
  buzz: 'Bigger numbers in every offer',
  body: 'Fewer suitors, smaller offers',
  breakout: 'More suitors, a little more money',
  doubt: 'Smaller offers',
};

