// The single app store. The engine mutates a GameState in place, so every action works
// on a structured clone and swaps it in; React sees a new object each time.

import { create } from 'zustand';
import type { GameLog, GameState } from './engine/types';
import { advance as engineAdvance, choose as engineChoose, dismissMoment, newGame, type CreateInput } from './engine/flow';
import { seasonLabel } from './ui/format';

export type Tab = 'home' | 'season' | 'player' | 'league' | 'records';
export type Theme = 'auto' | 'light' | 'dark';

/** A short interstitial between steps (not part of the saved game). */
export type Transition =
  | { kind: 'half'; label: string; teamName: string; color: string; games: GameLog[]; w: number; l: number }
  | { kind: 'season'; label: string; sub: string; color: string };

interface Store {
  game: GameState | null;
  tab: Tab;
  theme: Theme;
  transition: Transition | null;
  start: (input: CreateInput, seed?: number) => void;
  choose: (choiceId: string) => void;
  advance: () => void;
  dismissMoment: () => void;
  endTransition: () => void;
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

const top = () => {
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
};

function teamOf(g: GameState) {
  const lg = g.stage === 'NBA' ? g.nba : g.league;
  return lg?.teams.find((t) => t.id === g.teamId) ?? null;
}

export const useStore = create<Store>((set, get) => ({
  game: null,
  tab: 'home',
  theme: loadTheme(),
  transition: null,
  start: (input, seed) => {
    const s = seed ?? Math.floor(Math.random() * 2 ** 31);
    set({ game: newGame(s, input), tab: 'home', transition: null });
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
    const before = { step: g.step, games: g.season?.games.length ?? 0, post: g.season?.postGames.length ?? 0 };
    const t0 = teamOf(g);
    const rec = { w: t0?.w ?? 0, l: t0?.l ?? 0 };
    const next = structuredClone(g);
    engineAdvance(next);
    let transition: Transition | null = null;
    if ((before.step === 'preseason' || before.step === 'midseason') && next.season) {
      const t = teamOf(next);
      const pre = before.step === 'preseason' ? (next.season.preGames ?? []) : [];
      const cup = before.step === 'preseason' ? (next.season.cupGames ?? []) : [];
      const games = [...pre, ...next.season.games.slice(before.games), ...cup, ...next.season.postGames.slice(before.post)];
      transition = {
        kind: 'half',
        label: before.step === 'preseason' ? 'First half' : 'Second half and postseason',
        teamName: t?.name ?? '',
        color: t?.color ?? '#2A2F36',
        games,
        w: rec.w,
        l: rec.l,
      };
    } else if (before.step === 'offseason' && next.step === 'preseason') {
      const t = teamOf(next);
      transition = { kind: 'season', label: seasonLabel(next.year), sub: t ? t.name : '', color: t?.color ?? '#2A2F36' };
    }
    set({ game: next, tab: 'home', transition });
    top();
  },
  dismissMoment: () => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    dismissMoment(next);
    set({ game: next });
    top();
  },
  endTransition: () => set({ transition: null }),
  reset: () => set({ game: null, tab: 'home', transition: null }),
  setTab: (tab) => {
    set({ tab });
    top();
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
