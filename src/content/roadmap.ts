// The road map's words (round 33): each level is a place on the map (owner: "highschool as
// beginner, college as intermediate, nba as advanced, and the minigames as an oversea league").

import { tx } from '../i18n';
import type { Level } from '../engine/levels';

interface LevelCopy {
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
      { icon: 'balanced', label: tx('Season plan') },
      { icon: 'book', label: tx('Turning points') },
      { icon: 'bag', label: tx('The shop') },
      { icon: 'clutch', label: tx('One last shot') },
    ],
    steps: ['Identity', 'Confirm'],
  },
  intermediate: {
    n: 2,
    place: 'College',
    lede: 'Everything from beginner, and more of the game. Six NBA seasons.',
    adds: [
      { icon: 'person', label: tx('Archetype') },
      { icon: 'range', label: tx('Focus stats') },
      { icon: 'lvl-NCAA', label: tx('College offers') },
      { icon: 'grind', label: tx('All 12 plans') },
      { icon: 'bracket', label: tx('Playoff games') },
      { icon: 'bank', label: tx('Contract talks') },
      { icon: 'crown', label: tx('Nickname') },
      { icon: 'shoe', label: tx('Brand deals') },
      { icon: 'rival', label: tx('A rival') },
      { icon: 'fast', label: tx('Fast break') },
    ],
    steps: ['Identity', 'Archetype', 'Focus', 'Confirm'],
  },
  advanced: {
    n: 3,
    place: 'NBA arena',
    lede: 'Everything so far, and nearly all the rest: the closest to the full game. Seven NBA seasons.',
    adds: [
      { icon: 'globe', label: tx('Your country') },
      { icon: 'offhand', label: tx('Your hand') },
      { icon: 'lvl-EU', label: tx('Roads abroad') },
      { icon: 'calendar', label: tx('Plans by half') },
      { icon: 'book', label: tx('Storylines') },
      { icon: 'chef', label: tx('Staff') },
      { icon: 'whistle', label: tx('Head coach') },
      { icon: 'motion', label: tx('Team style') },
      { icon: 'swap', label: tx('Trades') },
      { icon: 'roster', label: tx('Starting five') },
      { icon: 'clutch', label: tx('Crunch time') },
      { icon: 'weight', label: tx('Body and weight') },
      { icon: 'sim', label: tx('Sim') },
    ],
    steps: ['Identity', 'Archetype', 'Focus', 'Confirm'],
  },
};

/** The goal of every level (owner: "nba all star could be achieved above 80%. make that the goal"). */
export const LEVEL_GOAL = 'make an NBA All-Star team';
