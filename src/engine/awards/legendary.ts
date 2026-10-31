// Round 22: legendary seasons. A season earns a card on the end-of-career page when it stacks
// the big honours in one year (MVP and Defensive Player of the Year, MVP and the title, ...) or
// puts up numbers few seasons ever have (a triple-double average, thirty a night). Each season
// gets one card, the rarest combination it reached; the rest of its honours show as chips.

import type { GameState, SeasonRecord } from '../types';
import { perGame } from '../sim/statModel';

interface LegendarySeason {
  id: string;
  name: string;
  line: string; // what made it legendary, in a sentence
  rank: number; // 1 = the rarest
  season: SeasonRecord;
  honours: string[]; // every award label won that year
}

const TITLE = ['TITLE', 'TITLEKEY'];

interface Combo {
  id: string;
  name: string;
  line: string;
  /** Each entry is one requirement: any of its keys counts. */
  need: string[][];
  stat?: (h: SeasonRecord) => boolean;
}

const pg = (h: SeasonRecord, k: 'pts' | 'reb' | 'ast') => perGame(h.line, k);
const full = (h: SeasonRecord) => h.level === 'NBA' && h.line.gp >= 50;

// rarest first: a season shows the first one it matches
const COMBOS: Combo[] = [
  { id: 'greatest', name: 'The Greatest Season', line: 'MVP, Defensive Player of the Year and the title, all in one year.', need: [['MVP'], ['DPOY'], TITLE] },
  { id: 'perfect', name: 'The Perfect Season', line: 'League MVP and Finals MVP: the best player all year, and when it mattered most.', need: [['MVP'], ['FMVP']] },
  { id: 'twoway', name: 'Two-Way Throne', line: 'MVP and Defensive Player of the Year in the same season.', need: [['MVP'], ['DPOY']] },
  { id: 'ringmvp', name: 'Ring and Trophy', line: 'The MVP trophy and a championship ring in the same season.', need: [['MVP'], TITLE] },
  { id: 'scoringmvp', name: 'Scoring King', line: 'The scoring title and the MVP.', need: [['MVP'], ['SCORING']] },
  { id: 'tripledouble', name: 'Triple-Double Season', line: 'Double figures in points, rebounds and assists, on average, for a whole NBA season.', need: [], stat: (h) => full(h) && pg(h, 'pts') >= 10 && pg(h, 'reb') >= 10 && pg(h, 'ast') >= 10 },
  { id: 'finalshero', name: 'Finals Hero', line: 'Finals MVP as the best player on a champion, with an All-NBA First Team season behind it.', need: [['FMVP'], ['ALLNBA1']] },
  { id: 'defensewins', name: 'Defense Wins Championships', line: 'Defensive Player of the Year and the title.', need: [['DPOY'], TITLE] },
  { id: 'wall', name: 'The Wall', line: 'Defensive Player of the Year and the league lead in blocks or steals.', need: [['DPOY'], ['BLKLEAD', 'STLLEAD']] },
  { id: 'goldring', name: 'Gold and a Ring', line: 'An NBA title and Olympic gold in the same year.', need: [TITLE, ['OLYGOLD']] },
  { id: 'thirty', name: 'Thirty a Night', line: 'Thirty points a game over a full NBA season.', need: [], stat: (h) => full(h) && pg(h, 'pts') >= 30 },
  { id: 'rookie', name: 'Rookie Sensation', line: 'Rookie of the Year and an All-Star in his first NBA season.', need: [['ROY'], ['ALLSTAR']] },
  { id: 'europe', name: 'King of Europe', line: 'EuroLeague MVP and the EuroLeague title.', need: [['EUMVP'], ['EUTITLE']] },
  { id: 'march', name: 'March King', line: 'National champion and the best player in the country.', need: [['NCAATITLE'], ['NAISMITH', 'FFMOP']] },
];

/** His legendary seasons, in the order they happened. */
export function legendarySeasons(s: GameState): LegendarySeason[] {
  const out: LegendarySeason[] = [];
  for (const h of s.history) {
    if (h.line.gp === 0 || /assignment/i.test(h.teamName)) continue;
    // NBA honours carry the NBA level; Olympic gold the same year counts with them
    const won = s.awards.filter((a) => a.year === h.year && (a.level === h.level || a.key === 'OLYGOLD'));
    const keys = new Set(won.map((a) => a.key));
    const i = COMBOS.findIndex((c) => (c.stat ? c.stat(h) : c.need.every((any) => any.some((k) => keys.has(k)))));
    if (i < 0) continue;
    const c = COMBOS[i];
    out.push({ id: c.id, name: c.name, line: c.line, rank: i + 1, season: h, honours: won.map((a) => a.label) });
  }
  return out;
}
