// Round 22: the career timeline and journal. One list of everything that happened, in order:
// his OVR at the end of every season, and marks for honours, titles, injuries, team moves,
// turning points (with how they turned out), duos, legendary seasons and every other entry of
// his decision log (the journal replaces the old log). The chart draws the
// OVR line with the big marks on it; the journal lists every mark, season by season.

import type { GameState, SeasonRecord } from '../types';
import { legendarySeasons } from '../awards/legendary';

export type MarkKind = 'title' | 'award' | 'legend' | 'injury' | 'move' | 'event' | 'story' | 'duo';

export interface TimelineMark {
  year: number;
  age: number;
  kind: MarkKind;
  label: string;
  tier?: string; // a turning point's result
  big?: boolean; // drawn on the chart, not only listed
}

interface TimelineSeason {
  year: number;
  age: number;
  ovrStart: number;
  ovrEnd: number;
  team: string;
  color: string;
  level: SeasonRecord['level'];
  height?: number;
  weight?: number;
}

const TITLE_KEYS = ['TITLE', 'TITLEKEY', 'NCAATITLE', 'EUTITLE', 'GLTITLE', 'INTTITLE', 'STATETITLE'];
const BIG_AWARDS = ['MVP', 'FMVP', 'DPOY', 'ROY', 'ALLNBA1', 'SCORING', 'OLYGOLD', 'EUMVP', 'NAISMITH'];
// story beats drawn on the chart (every other log entry is listed in the journal only)
const BIG_STORY = ['leap', 'tragedy', 'drafted', 'undrafted', 'ringchase'];

export function careerTimeline(s: GameState): { seasons: TimelineSeason[]; marks: TimelineMark[] } {
  const rows = s.history.filter((h) => !/assignment/i.test(h.teamName));
  const seasons: TimelineSeason[] = rows.map((h) => ({ year: h.year, age: h.age, ovrStart: h.ovrStart, ovrEnd: h.ovrEnd, team: h.teamName, color: h.teamColor, level: h.level, height: h.height, weight: h.weight }));
  const ageOf = (year: number) => rows.find((h) => h.year === year)?.age ?? s.player.age - (s.year - year);
  const marks: TimelineMark[] = [];
  // team moves: the first season with each new team
  rows.forEach((h, i) => {
    if (i > 0 && h.teamName !== rows[i - 1].teamName) marks.push({ year: h.year, age: h.age, kind: 'move', label: `Joined ${h.teamName}`, big: h.level === 'NBA' });
  });
  for (const a of s.awards) {
    const title = TITLE_KEYS.includes(a.key);
    if (!title && a.key === 'ALLROOKIE') continue;
    marks.push({ year: a.year, age: ageOf(a.year), kind: title ? 'title' : 'award', label: title && (a.key === 'TITLE' || a.key === 'TITLEKEY') ? 'NBA champion' : a.label, big: title || BIG_AWARDS.includes(a.key) });
  }
  for (const x of legendarySeasons(s)) marks.push({ year: x.season.year, age: x.season.age, kind: 'legend', label: `Legendary season: ${x.name}`, big: true });
  for (const inj of s.player.injuries ?? []) {
    const weeks = Math.max(1, Math.round(inj.days / 7));
    marks.push({ year: inj.year ?? s.year - (s.player.age - inj.age), age: inj.age, kind: 'injury', label: `${inj.name} (${inj.key === 'season' ? 'season over' : `${weeks} wk`})`, big: inj.key === 'major' || inj.key === 'season' });
  }
  for (const e of s.log) {
    if (e.kind === 'event') marks.push({ year: e.year, age: e.age, kind: 'event', label: e.text, tier: e.tier });
    else if (e.kind === 'duo') marks.push({ year: e.year, age: e.age, kind: 'duo', label: e.text, big: /formed/i.test(e.text) });
    else marks.push({ year: e.year, age: e.age, kind: 'story', label: e.text, big: BIG_STORY.includes(e.kind) });
  }
  const order: MarkKind[] = ['legend', 'title', 'award', 'duo', 'move', 'story', 'injury', 'event'];
  marks.sort((a, b) => a.year - b.year || order.indexOf(a.kind) - order.indexOf(b.kind));
  return { seasons, marks };
}
