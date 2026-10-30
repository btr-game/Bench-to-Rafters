// The single app store. The engine mutates a GameState in place, so every action works
// on a structured clone and swaps it in; React sees a new object each time.

import { fastForward, setFast } from './engine/fast';
import { requestTrade } from './engine/career/team';
import { recruitPlayer, takePayCut } from './engine/career/recruit';
import { canClaimMini, claimMini, type MiniResult } from './engine/career/miniBonus';
import { create } from 'zustand';
import type { AttrKey, GameLog, GameState, Pos } from './engine/types';
import { advance as engineAdvance, changeFocus, changeNumber, changePosition, choose as engineChoose, dismissMoment, newGame, retireByChoice, spendCredits, type CreateInput } from './engine/flow';
import { seasonLabel } from './ui/format';
import { tabKey } from './ui/selectors';
import { weightOf } from './engine/player/weight';

export type Tab = 'home' | 'season' | 'player' | 'league' | 'records';
export type Theme = 'auto' | 'light' | 'dark';
/** The page background: plain, a hardwood floor or streetball asphalt (round 17). */
export type Court = 'classic' | 'hardwood' | 'street';
export type Mini = 'hub' | 'office' | 'threes' | 'legends' | 'lab' | 'dunk';

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
  retire: () => void;
  changePosition: (pos: Pos) => void;
  togglePlayoffs: () => void;
  toggleFast: () => void;
  requestTrade: (aim?: import('./engine/career/team').TradeAim) => void;
  /** Runs an engine change on a copy of the game (round 13: one action instead of one per feature). */
  mutate: (fn: (g: GameState) => void) => void;
  changeNumber: (n: number) => void;
  changeFocus: (keys: AttrKey[]) => void;
  labSpend: (k: AttrKey, points: number) => void;
  recruit: (id: number) => void;
  payCut: () => void;
  endTransition: () => void;
  reset: () => void;
  mini: Mini | null;
  claimMini: (r: MiniResult) => string;
  setMini: (m: Mini | null) => void;
  setTab: (t: Tab) => void;
  setTheme: (t: Theme) => void;
  court: Court;
  setCourt: (c: Court) => void;
  simple: boolean; // simple text: fewer words, just the choices (round 11)
  toggleSimple: () => void;
  guide: boolean; // guide mode: highlights what to do next (round 13)
  toggleGuide: () => void;
  master: boolean; // master mode: no recommendations anywhere (round 15)
  toggleMaster: () => void;
  /** The tab keys last seen (round 14): a tab whose key moved on shows a "new" dot. */
  seen: Partial<Record<Tab, string>>;
  /** Picks up the career saved on this device; false if there is none or it cannot be read. */
  resume: () => boolean;
  /** Whether the autosave works here ('off' when the browser blocks storage or the save is too big). */
  saving: 'ok' | 'off';
}

// ---------- autosave (round 14) ----------
// One career, saved on this device after every change, so closing the tab loses nothing.

const SAVE_KEY = 'btr-save-v1';

export function savedCareer(): { name: string; year: number; ovr?: number; retired: boolean } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const head = JSON.parse(raw) as { meta?: { name: string; year: number; ovr?: number; retired: boolean } };
    return head.meta ?? null;
  } catch {
    return null;
  }
}

function writeSave(g: GameState | null): boolean {
  try {
    if (!g) {
      localStorage.removeItem(SAVE_KEY);
      return true;
    }
    const meta = { name: g.player.name, year: g.year, ovr: Math.round(g.player.peakOvr), retired: g.step === 'retired' };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ meta, game: g }));
    return true;
  } catch {
    return false;
  }
}

const allSeen = (g: GameState): Partial<Record<Tab, string>> => ({
  season: tabKey(g, 'season'),
  player: tabKey(g, 'player'),
  league: tabKey(g, 'league'),
  records: tabKey(g, 'records'),
});

const loadFlag = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};
const saveFlag = (key: string, on: boolean): void => {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    /* storage can be unavailable; the setting still applies for this visit */
  }
};

function loadCourt(): Court {
  try {
    const c = localStorage.getItem('btr-court');
    return c === 'hardwood' || c === 'street' ? c : 'classic';
  } catch {
    return 'classic';
  }
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
  court: loadCourt(),
  simple: loadFlag('btr-simple'),
  toggleSimple: () => {
    const simple = !get().simple;
    saveFlag('btr-simple', simple);
    set({ simple });
  },
  master: loadFlag('btr-master'),
  toggleMaster: () => {
    const master = !get().master;
    saveFlag('btr-master', master);
    set({ master });
  },
  guide: loadFlag('btr-guide-mode'),
  toggleGuide: () => {
    const guide = !get().guide;
    saveFlag('btr-guide-mode', guide);
    set({ guide });
  },
  transition: null,
  start: (input, seed) => {
    const s = seed ?? Math.floor(Math.random() * 2 ** 31);
    const game = newGame(s, input);
    fastForward(game);
    set({ game, tab: 'home', transition: null, mini: null, seen: allSeen(game) });
  },
  seen: {},
  saving: 'ok',
  resume: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const game = (JSON.parse(raw) as { game: GameState }).game;
      if (!game?.player || !game.step) return false;
      weightOf(game.player); // careers saved before round 20 get a weight
      set({ game, tab: 'home', transition: null, mini: null, seen: allSeen(game) });
      return true;
    } catch {
      return false;
    }
  },
  choose: (choiceId) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    engineChoose(next, choiceId);
    const before = next.step;
    fastForward(next);
    set({ game: next });
    if (next.flags.fast && next.step !== before) top();
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
    if (next.flags.fast) {
      // fast break: no transition screens, straight on to the next real choice
      fastForward(next);
      transition = null;
    }
    set({ game: next, tab: 'home', transition });
    top();
  },
  changeFocus: (keys) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    changeFocus(next, keys);
    set({ game: next });
  },
  recruit: (id) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    recruitPlayer(next, id);
    set({ game: next });
  },
  payCut: () => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    takePayCut(next);
    set({ game: next });
  },
  labSpend: (k, points) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    spendCredits(next, k, points);
    set({ game: next });
  },
  changeNumber: (n) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    changeNumber(next, n);
    set({ game: next });
  },
  requestTrade: (aim) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    requestTrade(next, aim);
    set({ game: next });
  },
  mutate: (fn) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    fn(next);
    set({ game: next });
  },
  toggleFast: () => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    setFast(next, !next.flags.fast);
    set({ game: next, transition: null });
  },
  togglePlayoffs: () => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    next.flags.simPostseason = next.flags.simPostseason ? 0 : 1;
    set({ game: next });
  },
  changePosition: (pos) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    changePosition(next, pos);
    set({ game: next });
  },
  retire: () => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    retireByChoice(next);
    set({ game: next, tab: 'home', transition: null });
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
  mini: null,
  claimMini: (r) => {
    const g = get().game;
    if (!g || !canClaimMini(g, r.game)) return '';
    const next = structuredClone(g);
    const text = claimMini(next, r);
    set({ game: next });
    return text;
  },
  setMini: (mini) => {
    set({ mini });
    top();
  },
  setTab: (tab) => {
    const g = get().game;
    // leaving a tab and opening one both count as having seen them
    const seen = g ? { ...get().seen, [get().tab]: tabKey(g, get().tab), [tab]: tabKey(g, tab) } : get().seen;
    set({ tab, seen });
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
  setCourt: (court) => {
    try {
      if (court === 'classic') localStorage.removeItem('btr-court');
      else localStorage.setItem('btr-court', court);
    } catch {
      /* storage can be unavailable; the court still applies for this visit */
    }
    set({ court });
  },
}));

// save a moment after each change (a whole career is a few hundred KB of JSON)
let saveTimer: ReturnType<typeof setTimeout> | null = null;
useStore.subscribe((now, before) => {
  if (now.game === before.game) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const ok = writeSave(useStore.getState().game);
    if ((ok ? 'ok' : 'off') !== useStore.getState().saving) useStore.setState({ saving: ok ? 'ok' : 'off' });
  }, 500);
});

// development only: lets browser tests load a finished career (stripped from production builds)
if (import.meta.env.DEV) (window as unknown as { __btr?: typeof useStore }).__btr = useStore;
