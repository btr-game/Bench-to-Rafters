// The single app store. The engine mutates a GameState in place, so every action works
// on a structured clone and swaps it in; React sees a new object each time.

import { dailyInput, dailySeed, todayKey } from './engine/mini/daily';
import { fastForward, setFast, setSim } from './engine/fast';
import { requestTrade } from './engine/career/team';
import { recruitPlayer, takePayCut } from './engine/career/recruit';
import { canClaimMini, claimMini, type MiniResult } from './engine/career/miniBonus';
import { create } from 'zustand';
import type { AttrKey, GameLog, GameState, Pos } from './engine/types';
import { advance as engineAdvance, changeFocus, changeNumber, changePosition, choose as engineChoose, dismissMoment, newGame, retireByChoice, spendCredits, type CreateInput } from './engine/flow';
import { seasonLabel } from './ui/format';
import { tabKey } from './ui/selectors';
import { weightOf } from './engine/player/weight';
import { visitItem, wearItem } from './engine/economy/shop';
import { letGo, raiseStaff, talkStaff } from './engine/career/staff';
import { negotiate, type Ask } from './engine/career/negotiate';
import type { WearSlot } from './content/shop';
import { careerRecord } from './engine/career/record';
import { logCareer, type LogResult } from './ui/careerLog';
import { checkAch, countCareer } from './ui/achievements';
import { community } from './ui/community';
import { deleteSlot, importCode, newSlotId, readSlot, writeSlot } from './ui/saves';
import type { AchTier } from './engine/achievements';

export type Tab = 'home' | 'season' | 'player' | 'league' | 'records';
export type Theme = 'auto' | 'light' | 'dark';
/** The page background: plain, a hardwood floor or streetball asphalt (round 17). */
export type Court = 'classic' | 'hardwood' | 'street';
export type Page = 'log' | 'achievements' | 'community';
export type Mini = 'hub' | 'office' | 'threes' | 'legends' | 'lab' | 'dunk' | 'street' | 'rhythm' | 'daily';

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
  toggleSim: () => void;
  requestTrade: (aim?: import('./engine/career/team').TradeAim) => void;
  /** Runs an engine change on a copy of the game (round 13: one action instead of one per feature). */
  mutate: (fn: (g: GameState) => void) => void;
  changeNumber: (n: number) => void;
  wear: (slot: WearSlot, id: string | null) => void;
  visit: (id: string) => string | null;
  staffAct: (id: number, act: 'talk' | 'raise' | 'go') => string | null;
  negotiate: (offerId: string, ask: Ask) => string | null;
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
  /** Round 25: the save slot of the career on screen (null until it is first saved). */
  slot: string | null;
  resume: (id: string) => Promise<boolean>;
  importCareer: (code: string) => Promise<boolean>;
  /** Whether the autosave works here ('off' when the browser blocks storage or the save is too big). */
  saving: 'ok' | 'off';
  /** Round 24: a page of its own (the career log, the community pages), over the start page or a career. */
  page: Page | null;
  setPage: (p: Page | null) => void;
  /** What logging the career that just ended did (for the note on the retirement page). */
  logged: LogResult | null;
  /** Guide mode's tour has a step on screen (the plain next-step highlight waits for it). */
  tour: boolean;
  /** Achievements just earned, shown as banners at the top (round 24). */
  toasts: { id: string; name: string; tier: AchTier; more?: number }[];
  dismissToast: (id: string) => void;
  /** Round 22: the daily challenge in progress, with the career and setting it stepped away from. */
  daily: { day: string; stash: GameState | null; simple: boolean } | null;
  startDaily: () => void;
  endDaily: () => void;
}

// ---------- autosave (round 14; round 25: ten slots, ui/saves.ts) ----------
// Every career in progress has a slot on this device, saved after every change, so closing the
// tab loses nothing.

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

/** The page a link names: …#community. (…#inbox opens the dev door on the start page, then the deck's inbox.) */
function linkedPage(): Page | null {
  try {
    return location.hash === '#community' ? 'community' : null;
  } catch {
    return null;
  }
}

/** A No Shortcuts career (round 25) plays in master mode with the full text, whatever the switches
 * said before it opened; the switches stay put until it closes. */
function oathLock(g: GameState): Partial<Pick<Store, 'master' | 'simple'>> {
  return g.flags.oath ? { master: true, simple: false } : {};
}

export const useStore = create<Store>((set, get) => ({
  game: null,
  tab: 'home',
  theme: loadTheme(),
  court: loadCourt(),
  simple: loadFlag('btr-simple'),
  toggleSimple: () => {
    if (get().game?.flags.oath) return; // No Shortcuts (round 25): full text for the whole career
    const simple = !get().simple;
    saveFlag('btr-simple', simple);
    set({ simple });
  },
  master: loadFlag('btr-master'),
  toggleMaster: () => {
    if (get().game?.flags.oath) return; // No Shortcuts: master mode for the whole career
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
    set({ game, slot: newSlotId(), tab: 'home', transition: null, mini: null, seen: allSeen(game), ...oathLock(game) });
  },
  seen: {},
  saving: 'ok',
  // round 26 (owner: "just give me the link to the community page"): #community opens it
  page: linkedPage(),
  setPage: (page) => {
    set({ page });
    top();
  },
  logged: null,
  tour: false,
  toasts: [],
  dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
  daily: null,
  startDaily: () => {
    const day = todayKey();
    const game = newGame(dailySeed(day), dailyInput(day));
    game.flags.daily = 1;
    fastForward(game);
    const st = get();
    set({ daily: { day, stash: st.daily?.stash ?? st.game, simple: st.daily?.simple ?? st.simple }, game, simple: true, tab: 'home', transition: null, mini: null, seen: allSeen(game) });
    top();
  },
  endDaily: () => {
    const d = get().daily;
    if (!d) return;
    set({ daily: null, game: d.stash, simple: d.simple, tab: 'home', transition: null, mini: null, seen: d.stash ? allSeen(d.stash) : {} });
    top();
  },
  slot: null,
  resume: async (id) => {
    const game = await readSlot(id);
    if (!game) return false;
    weightOf(game.player); // careers saved before round 20 get a weight
    set({ game, slot: id, tab: 'home', transition: null, mini: null, seen: allSeen(game), daily: null, ...oathLock(game) });
    return true;
  },
  importCareer: async (code) => {
    const game = await importCode(code);
    if (!game) return false;
    weightOf(game.player);
    const slot = newSlotId();
    set({ game, slot, tab: 'home', transition: null, mini: null, seen: allSeen(game), daily: null, ...oathLock(game) });
    return true;
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
  wear: (slot, id) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    wearItem(next, slot, id);
    set({ game: next });
  },
  visit: (id) => {
    const g = get().game;
    if (!g) return null;
    const next = structuredClone(g);
    const text = visitItem(next, id);
    if (text) set({ game: next });
    return text;
  },
  negotiate: (offerId, ask) => {
    const g = get().game;
    if (!g) return null;
    const next = structuredClone(g);
    const text = negotiate(next, offerId, ask);
    if (text) set({ game: next });
    return text;
  },
  staffAct: (id, act) => {
    const g = get().game;
    if (!g) return null;
    const next = structuredClone(g);
    const text = act === 'talk' ? talkStaff(next, id) : act === 'raise' ? (raiseStaff(next, id) ? 'raised' : null) : (letGo(next, id), 'gone');
    if (text) set({ game: next });
    return text;
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
    // round 24 (owner): a daily run stays quick, so fast break and simulated playoffs are fixed
    if (!g || g.flags.daily) return;
    const next = structuredClone(g);
    setFast(next, !next.flags.fast);
    set({ game: next, transition: null });
  },
  toggleSim: () => {
    const g = get().game;
    if (!g || g.flags.daily || g.mode === 'lab') return;
    const next = structuredClone(g);
    setSim(next, !next.flags.sim);
    set({ game: next, transition: null });
  },
  togglePlayoffs: () => {
    const g = get().game;
    if (!g || g.flags.daily) return;
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
  // ending a career is the only thing that clears the save (round 24)
  reset: () => {
    const slot = get().slot;
    if (slot) deleteSlot(slot);
    set({ game: null, slot: null, tab: 'home', transition: null });
  },
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
    // round 24 (owner): no mini-games during a daily challenge
    if (mini && get().game?.flags.daily) return;
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

// save a moment after each change (a whole career is a few hundred KB of JSON). Round 24: the
// autosave only ever writes a career, never clears one: going back to the start page, or ending a
// daily challenge started there, used to wipe the career waiting behind Continue.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function flushSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  const st = useStore.getState();
  if (!st.game || st.daily) return;
  let slot = st.slot;
  if (!slot) {
    slot = newSlotId();
    useStore.setState({ slot });
  }
  void writeSlot(slot, st.game).then((ok) => {
    if ((ok ? 'ok' : 'off') !== useStore.getState().saving) useStore.setState({ saving: ok ? 'ok' : 'off' });
  });
}
useStore.subscribe((now, before) => {
  if (now.game === before.game) return;
  if (saveTimer) clearTimeout(saveTimer);
  // a daily challenge is never saved: the career on this device stays as it was
  if (now.daily || !now.game) return;
  saveTimer = setTimeout(flushSave, 500);
});
// round 24: a career that just ended goes into the career log (daily runs and lab players don't)
useStore.subscribe((now, before) => {
  const g = now.game;
  if (!g || !before.game || g === before.game || g.step !== 'retired' || before.game.step === 'retired') return;
  if (now.daily || g.flags.daily || g.mode === 'lab') return;
  const rec = careerRecord(g);
  useStore.setState({ logged: logCareer(rec) });
  // round 24: onto the leaderboards (and the news feed) for everyone who shares this page
  void community().then((c) => c.postCareer(rec));
});

// round 24: achievements, checked a moment after each change; a career that ends counts first
let achTimer: ReturnType<typeof setTimeout> | null = null;
useStore.subscribe((now, before) => {
  if (now.game === before.game) return;
  const g = now.game;
  if (g && before.game && g !== before.game && g.step === 'retired' && before.game.step !== 'retired' && g.mode !== 'lab') countCareer(g, now.master);
  if (achTimer) clearTimeout(achTimer);
  achTimer = setTimeout(() => {
    const fresh = checkAch(useStore.getState().game);
    if (!fresh.length) return;
    // a flood (an old save, a long career at once) shows three and a count of the rest
    const shown: Store['toasts'] = fresh.slice(0, 3).map((a) => ({ id: a.id, name: a.name, tier: a.tier }));
    if (fresh.length > 3) shown[2] = { ...shown[2], more: fresh.length - 3 };
    useStore.setState({ toasts: [...useStore.getState().toasts, ...shown].slice(-4) });
  }, 400);
});

// closing the tab inside the half second still keeps the last move
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => saveTimer && flushSave());

// development only: lets browser tests load a finished career (stripped from production builds)
if (import.meta.env.DEV) (window as unknown as { __btr?: typeof useStore }).__btr = useStore;
