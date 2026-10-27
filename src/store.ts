// The single app store. The engine mutates a GameState in place, so every action works
// on a structured clone and swaps it in; React sees a new object each time.

import { create } from 'zustand';
import type { GameState } from './engine/types';
import { advance as engineAdvance, choose as engineChoose, newGame, type CreateInput } from './engine/flow';

export type Tab = 'home' | 'season' | 'player' | 'league' | 'records';
export type Theme = 'auto' | 'light' | 'dark';

interface Store {
  game: GameState | null;
  tab: Tab;
  theme: Theme;
  busy: boolean;
  start: (input: CreateInput, seed?: number) => void;
  choose: (choiceId: string) => void;
  advance: () => void;
  reset: () => void;
  setTab: (t: Tab) => void;
  setTheme: (t: Theme) => void;
}

function loadTheme(): Theme {
  try {
    const t = localStorage.getItem('btr-theme');
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

export const useStore = create<Store>((set, get) => ({
  game: null,
  tab: 'home',
  theme: loadTheme(),
  busy: false,
  start: (input, seed) => {
    const s = seed ?? Math.floor(Math.random() * 2 ** 31);
    set({ game: newGame(s, input), tab: 'home' });
  },
  choose: (choiceId) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    engineChoose(next, choiceId);
    set({ game: next });
  },
  advance: () => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    engineAdvance(next);
    set({ game: next, tab: 'home' });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  },
  reset: () => set({ game: null, tab: 'home' }),
  setTab: (tab) => {
    set({ tab });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  },
  setTheme: (theme) => {
    try {
      if (theme === 'auto') localStorage.removeItem('btr-theme');
      else localStorage.setItem('btr-theme', theme);
    } catch {
      /* storage can be unavailable; the theme still applies for this visit */
    }
    set({ theme });
  },
}));
