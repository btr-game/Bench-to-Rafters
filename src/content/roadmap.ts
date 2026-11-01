// The road map's words (round 33): each level is a place on the map (owner: "highschool as
// beginner, college as intermediate, nba as advanced, and the minigames as an oversea league").

import type { Level } from '../engine/levels';

export interface LevelCopy {
  n: number;
  place: string;
  /** What the level is about, in a sentence. */
  lede: string;
  /** What it adds to the one before (owner: "a quick overview (use a lot of icons and little text)
   * of what will be added"): a pixel icon and a word or two each. */
  adds: { icon: string; label: string }[];
  /** The steps of the create page for it. */
  steps: string[];
}

export const LEVEL_COPY: Record<Level, LevelCopy> = {
  beginner: {
    n: 1,
    place: 'High school',
    lede: 'Your senior year, one season in college, the draft, then five NBA seasons. Pick a plan each season, make one call when it matters, and spend a little in the shop.',
    adds: [
      { icon: 'balanced', label: 'Season plan' },
      { icon: 'book', label: 'Turning points' },
      { icon: 'bag', label: 'The shop' },
      { icon: 'clutch', label: 'One last shot' },
    ],
    steps: ['Identity', 'Confirm'],
  },
  intermediate: {
    n: 2,
    place: 'College',
    lede: 'Everything from beginner, and more of the game. Six NBA seasons.',
    adds: [
      { icon: 'person', label: 'Archetype' },
      { icon: 'range', label: 'Focus stats' },
      { icon: 'lvl-NCAA', label: 'College offers' },
      { icon: 'grind', label: 'All 12 plans' },
      { icon: 'bracket', label: 'Playoff games' },
      { icon: 'bank', label: 'Contract talks' },
      { icon: 'crown', label: 'Nickname' },
      { icon: 'shoe', label: 'Brand deals' },
      { icon: 'rival', label: 'A rival' },
      { icon: 'fast', label: 'Fast break' },
    ],
    steps: ['Identity', 'Archetype', 'Focus', 'Confirm'],
  },
  advanced: {
    n: 3,
    place: 'NBA arena',
    lede: 'Everything so far, and nearly all the rest: the closest to the full game. Seven NBA seasons.',
    adds: [
      { icon: 'globe', label: 'Your country' },
      { icon: 'offhand', label: 'Your hand' },
      { icon: 'lvl-EU', label: 'Roads abroad' },
      { icon: 'calendar', label: 'Plans by half' },
      { icon: 'book', label: 'Storylines' },
      { icon: 'chef', label: 'Staff' },
      { icon: 'whistle', label: 'Head coach' },
      { icon: 'motion', label: 'Team style' },
      { icon: 'swap', label: 'Trades' },
      { icon: 'roster', label: 'Starting five' },
      { icon: 'clutch', label: 'Crunch time' },
      { icon: 'weight', label: 'Body and weight' },
      { icon: 'sim', label: 'Sim' },
    ],
    steps: ['Identity', 'Archetype', 'Focus', 'Confirm'],
  },
};

/** The goal of every level (owner: "nba all star could be achieved above 80%. make that the goal"). */
export const LEVEL_GOAL = 'make an NBA All-Star team';
