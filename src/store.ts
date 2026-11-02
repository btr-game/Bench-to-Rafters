// The single app store. The engine mutates a GameState in place, so every action works
// on a structured clone and swaps it in; React sees a new object each time.

import { dailyInput, dailySeed, todayKey } from './engine/mini/daily';
import { fastForward, setFast, setSim } from './engine/fast';
import { requestTrade } from './engine/career/team';
import { recruitPlayer, takePayCut } from './engine/career/recruit';
import { canClaimMini, claimMini, type MiniResult } from './engine/career/miniBonus';
import { create } from 'zustand';
import type { AttrKey, GameLog, GameState, Pos } from './engine/types';
import { advance as engineAdvance, changeFocus, changeNumber, changePosition, choose as engineChoose, dismissMoment, newGame, prompt, retireByChoice, spendCredits, type CreateInput } from './engine/flow';
import { seasonLabel } from './ui/format';
import { tabKey } from './ui/selectors';
import { weightOf } from './engine/player/weight';
import { touchOf } from './engine/player/touch';
import { visitItem, wearItem } from './engine/economy/shop';
import { letGo, raiseStaff, talkStaff } from './engine/career/staff';
import { negotiate, type Ask } from './engine/career/negotiate';
import { fireCoach, lockerTalk } from './engine/career/locker';
import { askRole } from './engine/career/coach';
import { announceFarewell } from './engine/career/farewell';
import { chaseRecord } from './engine/career/records';
import type { WearSlot } from './content/shop';
import { careerRecord, type CareerRecord } from './engine/career/record';
import { canPlayChild, childGame, childLegacy, childSeed } from './engine/nextGen';
import { attachChild, logCareer, type LogResult } from './ui/careerLog';
import { checkAch, countCareer, earnedIn, recordMp, recordOpened, recordUndo, recordVisit } from './ui/achievements';
import { community } from './ui/community';
import { cleanProspect, handle, multiplayer, pump, readLink, seasonLine, send, type Challenge, type MpLink } from './ui/multiplayer';
import { deleteSlot, dropRun, importCode, newSlotId, readRun, readSlot, writeRun, writeSlot } from './ui/saves';
import { bestGrade, exitCode, levelTabs, loadRoad, offRecord, roadGrade, saveRoad, type Road } from './ui/road';
import { STOPS, stopsLeft } from './ui/tutorial/closing';
import { levelOf, type Level } from './engine/levels';
import { isDev } from './dev/mode';
import { chooseLook } from './content/looks';
import { NEWS } from './content/whatsNew';
import { tabNews, type Spot } from './ui/tabNews';
import { ACH_TIERS, type AchTier } from './engine/achievements';
import { sfx } from './ui/sound';

export type Tab = 'home' | 'season' | 'player' | 'records' | 'extras';
export type Theme = 'auto' | 'light' | 'dark';
/** The page background: plain, a hardwood floor or streetball asphalt (round 17). */
export type Court = 'classic' | 'hardwood' | 'street';
/** Round 31: the text size, a multiplier on every font size (tokens.css, --ts). */
export type TextSize = 'm' | 'l' | 'xl';
type Page = 'log' | 'achievements' | 'community' | 'road' | 'multi';
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
  /** The intro page is up (round 27; round 34: every visit), until Start. */
  intro: boolean;
  endIntro: () => void;
  showIntro: () => void;
  /** What's new is open (owner: "make what's new a pop up that covers part of the screen"). */
  news: boolean;
  showNews: () => void;
  endNews: () => void;
  /** The career just left, for the thank-you page (round 27): the first time only. */
  thanks: GameState | null;
  endThanks: () => void;
  /** Set while a heavy step waits its turn (round 27): the loading pop-out shows if it runs long. */
  loading: number | null;
  start: (input: CreateInput, seed?: number, mp?: GameState['mp']) => void;
  /** Round 35: a friend's challenge, played from the same start (the same seed and start page). */
  startChallenge: (c: Challenge) => boolean;
  /** Round 35: a draft class waiting for its player (made or joined when he starts), and the
   * multiplayer page's open challenge or class. */
  draft: { code?: string; name: string } | null;
  setDraft: (d: { code?: string; name: string } | null) => void;
  mpOpen: MpLink | null;
  openMp: (l: MpLink | null) => void;
  choose: (choiceId: string) => void;
  advance: () => void;
  dismissMoment: () => void;
  retire: () => void;
  changePosition: (pos: Pos) => void;
  togglePlayoffs: () => void;
  toggleFast: () => void;
  toggleSim: () => void;
  requestTrade: (aim?: import('./engine/career/team').TradeAim, to?: string) => void;
  /** Round 31: the career as it was before his last choice (one step), with what that choice was. */
  undo: { game: GameState; label: string } | null;
  undoLast: () => void;
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
  /** Round 32: a word with someone in the locker room; what came of it. */
  lockerTalk: (who: string, opt: string) => string | null;
  /** Round 32: a star of the league has the coach fired. */
  fireCoach: () => string | null;
  /** Round 32: the next season is his last. */
  farewell: () => void;
  /** Round 32: chase the next name on the all-time scoring list this season. */
  chase: () => void;
  /** Round 32: after a career with a child, the child's own (Comet speed, a slot of his own). */
  playChild: () => void;
  /** Round 32: once a season, ask the head coach for a bigger role. */
  askRole: () => void;
  endTransition: () => void;
  reset: () => void;
  mini: Mini | null;
  claimMini: (r: MiniResult) => string;
  setMini: (m: Mini | null) => void;
  setTab: (t: Tab) => void;
  setTheme: (t: Theme) => void;
  court: Court;
  setCourt: (c: Court) => void;
  text: TextSize;
  setText: (t: TextSize) => void;
  simple: boolean; // simple text: fewer words, just the choices (round 11)
  toggleSimple: () => void;
  guide: boolean; // guide mode: highlights what to do next (round 13)
  toggleGuide: () => void;
  master: boolean; // master mode: no recommendations anywhere (round 15)
  toggleMaster: () => void;
  /** The tab keys last seen (round 14): a tab whose key moved on shows a "new" dot. */
  seen: Partial<Record<Tab, string>>;
  /** What that dot was about, for the tab just opened: shown one at a time with Got it (TabNews). */
  spots: { tab: Tab; list: Spot[]; total: number } | null;
  endSpot: () => void;
  /** Picks up the career saved on this device; false if there is none or it cannot be read. */
  /** Round 25: the save slot of the career on screen (null until it is first saved). */
  slot: string | null;
  resume: (id: string) => Promise<boolean>;
  /** Round 34: a finished career opened from the career log (Look back), with a bar to leave it. */
  lookBack: boolean;
  /** Leaves a looked-back career, back to the career log. */
  leaveLookBack: () => void;
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
  /** Round 33: the road map's progress on this device (ui/road.ts). */
  road: Road;
  /** The level whose career is being set up (the create page in level mode). */
  creating: Level | null;
  setCreating: (l: Level | null) => void;
  /** The exit code: true when it was right, and the full game opens. */
  skipTutorial: (code: string) => boolean;
  /** A level career has ended and its last page was read: the level is passed, back to the road. */
  endLevel: () => void;
  /** A mini-game run ended: its grade on the island, kept if it is the best so far. */
  gradeMini: (r: MiniResult) => void;
  /** The graduation page's last button: the full game opens, with Regular guy suggested. */
  graduate: () => void;
  /** Round 33: the start page suggests a Regular guy career (right after graduation, this visit). */
  recommend: boolean;
  /** The tutorial guide: a lesson is done (kept on the road). */
  doneLesson: (id: string) => void;
  /** A lesson is on screen (the closing tour's Next stop waits for it). */
  lessonUp: boolean;
  /** The closing tour: the stops to visit (tutorial/closing.ts) and the one on screen. */
  closing: { ids: string[]; i: number } | null;
  startClosing: () => void;
  nextStop: () => void;
}

// ---------- autosave (round 14; round 25: ten slots, ui/saves.ts) ----------
// Every career in progress has a slot on this device, saved after every change, so closing the
// tab loses nothing.

const allSeen = (g: GameState): Partial<Record<Tab, string>> => ({
  season: tabKey(g, 'season'),
  player: tabKey(g, 'player'),
  records: tabKey(g, 'records'),
  extras: tabKey(g, 'extras'),
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

/**
 * Round 27 (owner: "for a user that has never played before (no record) ... activate the guide
 * automatically"): Guide mode starts on for someone with nothing on this device yet: no saved
 * career, no career log, no achievement, no daily challenge, and no say on the switch so far.
 * Not in the dev deck, whose cards would all open under the tour.
 */
function noRecord(): boolean {
  if (isDev()) return false;
  try {
    const has = (k: string) => {
      const v = localStorage.getItem(k);
      if (!v) return false;
      const d = JSON.parse(v) as unknown;
      return Array.isArray(d) ? d.length > 0 : typeof d === 'object' && d !== null && Object.keys((d as { got?: object }).got ?? d).length > 0;
    };
    return !['btr-saves-v2', 'btr-save-v1', 'btr-log-v1', 'btr-achv-v1', 'btr-daily'].some(has);
  } catch {
    return false;
  }
}
function newcomer(): boolean {
  try {
    if (localStorage.getItem('btr-guide-mode') !== null || !noRecord()) return false;
  } catch {
    return false;
  }
  saveFlag('btr-guide-mode', true);
  return true;
}
/**
 * What's new opens by itself once after each update, on the start page, for someone who has played
 * here before (owner: "make what's new a pop up"); a first-time player starts on this version, with
 * the intro and the guide instead. Not in the dev deck, which has a card for it.
 */
const NEWS_KEY = 'btr-news-seen';
function markNews() {
  try {
    localStorage.setItem(NEWS_KEY, NEWS[0].id);
  } catch {
    /* it opens again next visit; nothing else is lost */
  }
}
/** The latest changes have not been opened on this device yet. */
export function newsFresh(): boolean {
  try {
    return localStorage.getItem(NEWS_KEY) !== NEWS[0].id;
  } catch {
    return false;
  }
}
function newsDue(): boolean {
  if (isDev() || !newsFresh()) return false;
  if (noRecord()) {
    markNews();
    return false;
  }
  return true;
}

function loadCourt(): Court {
  try {
    const c = localStorage.getItem('btr-court');
    return c === 'hardwood' || c === 'street' ? c : 'classic';
  } catch {
    return 'classic';
  }
}

function loadText(): TextSize {
  try {
    const t = localStorage.getItem('btr-text');
    return t === 'l' || t === 'xl' ? t : 'm';
  } catch {
    return 'm';
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

// ---------- undo (round 31, owner: "undo last choice is great. It would be off for Rough Road
// and Comet so leaderboards stay fair") ----------

/** Whether this career can step back: not a challenge (Rough Road, Comet), not the daily
 * challenge, and not once it has ended (it is logged and posted by then). */
export const canUndo = (g: GameState | null): boolean => !!g && !g.flags.oath && !g.flags.comet && !g.flags.daily && !g.flags.level && !g.mp && g.step !== 'retired';

/** Keeps the career as it was before a choice (the old state is never changed: every action works on a copy). */
function remember(g: GameState, label: string): { undo: Store['undo'] } {
  return { undo: canUndo(g) ? { game: g, label } : null };
}

/** "Free agency: Dallas Mavericks", or both plans of a half. */
function choiceLabel(g: GameState, id: string): string {
  const p = prompt(g);
  if (p.type !== 'decision') return 'Your choice';
  const names = id.split('+').map((x) => p.decision.choices.find((c) => c.id === x)?.label ?? x);
  return `${p.decision.title}: ${names.join(' + ')}`;
}

function stepLabel(g: GameState): string {
  const p = prompt(g);
  return p.type === 'advance' ? p.label : 'The next step';
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
    return location.hash === '#community' ? 'community' : readLink() ? 'multi' : null;
  } catch {
    return null;
  }
}

/** A Rough Road career (round 25) plays in master mode, whatever the switch said before it opened;
 * the switch stays put until it closes. (Round 27, owner: "simple text could be allowed in harder
 * road reality": Simple text is free now.) */
function oathLock(g: GameState): Partial<Pick<Store, 'master' | 'simple' | 'guide'>> {
  // round 33: a level career shows the game as it is (Simple text, Master mode and Guide mode come
  // in the closing tour; the tutorial guide does Guide mode's job), whatever the switches say
  if (g.flags.level) return { master: false, simple: false, guide: false };
  return g.flags.oath ? { master: true } : {};
}
/** The switches as this device keeps them, for the way out of a level career. */
const savedSwitches = (): Pick<Store, 'simple' | 'master' | 'guide'> => ({ simple: loadFlag('btr-simple'), master: loadFlag('btr-master'), guide: loadFlag('btr-guide-mode') });

// Round 27 (owner: "there's small lags here and there; when pages lag, add a small loading pop
// out"). The steps that run the engine or swap a whole page wait one frame, so the pop-out is on
// screen before the work blocks the page. Its animations run on the compositor, so it keeps
// dribbling while the work runs, and it only fades in if the work takes more than a moment
// (components/Loading.tsx). Steps called in a row run in the same order, together.
let queued: (() => void)[] = [];
export function later(fn: () => void): void {
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') return fn();
  queued.push(fn);
  if (queued.length > 1) return;
  useStore.setState({ loading: Math.floor(Math.random() * 2 ** 30) });
  let went = false;
  const go = () => {
    if (went) return;
    went = true;
    // after the frame that shows the pop-out has painted
    setTimeout(() => {
      const run = queued;
      queued = [];
      try {
        for (const f of run) f();
      } finally {
        useStore.setState({ loading: null });
      }
    }, 0);
  };
  requestAnimationFrame(go);
  setTimeout(go, 80); // a hidden tab paints no frames
}

export const useStore = create<Store>((set, get) => ({
  game: null,
  tab: 'home',
  theme: loadTheme(),
  court: loadCourt(),
  text: loadText(),
  simple: loadFlag('btr-simple'),
  toggleSimple: () => {
    const simple = !get().simple;
    saveFlag('btr-simple', simple);
    set({ simple });
  },
  master: loadFlag('btr-master'),
  toggleMaster: () => {
    if (get().game?.flags.oath) return; // Rough Road: master mode for the whole career
    const master = !get().master;
    saveFlag('btr-master', master);
    set({ master });
  },
  guide: loadFlag('btr-guide-mode') || newcomer(),
  toggleGuide: () => {
    const guide = !get().guide;
    saveFlag('btr-guide-mode', guide);
    set({ guide });
  },
  transition: null,
  // round 34 (owner: "the intro page should always appear before anything"): every visit opens on
  // the intro, a career resumed from a reload included; the dev deck has a card for it instead
  intro: !isDev(),
  endIntro: () => {
    set({ intro: false });
    // round 34: each visit counts toward the book's visit achievements
    recordVisit();
    achievementsNow();
  },
  showIntro: () => set({ intro: true }),
  news: newsDue(),
  showNews: () => {
    markNews();
    set({ news: true });
  },
  endNews: () => {
    markNews();
    set({ news: false });
  },
  thanks: null,
  endThanks: () => {
    set({ thanks: null });
  },
  loading: null,
  start: (input, seed, mp) =>
    later(() => {
      const s = seed ?? Math.floor(Math.random() * 2 ** 31);
      // round 35 (owner): with friends, Fast break and Sim stay off for the whole career, and a
      // draft class starts on draft night (engine/career/draftNight.ts)
      const friends = !!(mp?.challenge || mp?.klass);
      // round 35: a draft class starts on draft night (engine/career/draftNight.ts)
      const game = newGame(s, friends ? { ...input, fast: false, mode: input.mode === 'fast' ? 'standard' : input.mode, ...(mp?.klass ? { start: 'draft' as const } : {}) } : input);
      if (mp) game.mp = mp.klass && !mp.run ? { ...mp, run: `${s.toString(36)}-${Date.now().toString(36)}` } : mp;
      if (friends) game.flags.friends = 1;
      fastForward(game);
      // round 33: a level career has a save of its own (ui/saves.ts writeRun), not a slot
      set({ game, slot: input.level ? null : newSlotId(), creating: null, draft: null, page: null, tab: 'home', transition: null, mini: null, seen: allSeen(game), lookBack: false, ...oathLock(game) });
    }),
  startChallenge: (c) => {
    const p = cleanProspect(c.prospect);
    if (!p || c.mine) return false;
    if (get().game) flushSave();
    get().start(p.input, p.seed, { challenge: c.code });
    // round 35: he has taken it, so its chat is his too
    void multiplayer().then((mp) => mp?.take(c.code, handle() || 'A friend'));
    return true;
  },
  draft: null,
  setDraft: (draft) => {
    // a finished career on screen steps aside first (its thank-you page, then the start page)
    if (draft && get().game) get().reset();
    set({ draft, page: draft ? null : get().page, creating: null });
  },
  mpOpen: readLink(),
  openMp: (mpOpen) => set({ mpOpen, ...(mpOpen ? { page: 'multi' as Page } : {}) }),
  seen: {},
  undo: null,
  undoLast: () => {
    const u = get().undo;
    if (!u || !canUndo(get().game)) return;
    set({ game: { ...u.game, achN: get().game?.achN }, undo: null, transition: null, tab: 'home' });
    recordUndo();
    top();
  },
  saving: 'ok',
  // round 26 (owner: "just give me the link to the community page"): #community opens it
  page: linkedPage(),
  setPage: (page) =>
    later(() => {
      set({ page });
      top();
    }),
  logged: null,
  tour: false,
  toasts: [],
  dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
  daily: null,
  startDaily: () =>
    later(() => {
      const day = todayKey();
      const game = newGame(dailySeed(day), dailyInput(day));
      game.flags.daily = 1;
      fastForward(game);
      const st = get();
      set({ daily: { day, stash: st.daily?.stash ?? st.game, simple: st.daily?.simple ?? st.simple }, game, simple: true, tab: 'home', transition: null, mini: null, seen: allSeen(game) });
      top();
    }),
  endDaily: () =>
    later(() => {
      const d = get().daily;
      if (!d) return;
      set({ daily: null, game: d.stash, simple: d.simple, tab: 'home', transition: null, mini: null, seen: d.stash ? allSeen(d.stash) : {} });
      top();
    }),
  road: loadRoad(),
  creating: null,
  setCreating: (creating) =>
    later(() => {
      // back from a level's start page: the road map (from Regular guy's card on the start page, once the
      // full game is open; the tutorial shows it anyway)
      set({ creating, page: creating ? null : get().road.free ? 'road' : null });
      top();
    }),
  skipTutorial: (code) => {
    if (!exitCode(code)) return false;
    sfx('unlock');
    const road = { ...get().road, free: 1 as const };
    saveRoad(road);
    dropRun();
    const g = get().game;
    set({ road, creating: null, page: null, mini: null, ...(g?.flags.level ? { game: null, tab: 'home' as Tab, transition: null, ...savedSwitches() } : {}) });
    top();
    return true;
  },
  endLevel: () => {
    const g = get().game;
    const level = g && levelOf(g);
    if (!g || !level || g.step !== 'retired') return;
    const road = { ...get().road, passed: { ...get().road.passed, [level]: { star: g.flags.levelEnd === 2 } }, ...(g.player.look ? { look: g.player.look } : {}) };
    saveRoad(road);
    dropRun();
    // the thank-you page, then the road map (owner: "still include thank you for playing")
    set({ road, game: null, thanks: g, tab: 'home', transition: null, undo: null, page: road.free ? 'road' : null, ...savedSwitches() });
    top();
  },
  recommend: false,
  lessonUp: false,
  doneLesson: (id) => {
    const road = get().road;
    if (road.lessons?.includes(id)) return;
    sfx('lesson');
    const next = { ...road, lessons: [...(road.lessons ?? []), id] };
    saveRoad(next);
    set({ road: next });
  },
  closing: null,
  startClosing: () => {
    const ids = stopsLeft(get().road.lessons ?? []).map((x) => x.id);
    set({ closing: { ids, i: -1 }, creating: null, page: null, mini: null });
    get().nextStop();
  },
  nextStop: () =>
    later(() => {
      const c = get().closing;
      if (!c) return;
      // the next stop that still has a lesson to show and a career to show it in
      for (let i = c.i + 1; i < c.ids.length; i++) {
        const stop = STOPS.find((x) => x.id === c.ids[i]);
        const left = stop?.lessons.some((l) => !(get().road.lessons ?? []).includes(l));
        const game = stop && left ? stop.build() : null;
        if (!stop || !game) continue;
        game.flags.tour = 1;
        if (!stop.page) game.moments = [];
        game.flags.simPostseason = game.flags.simPostseason ?? 1;
        set({ game, slot: null, closing: { ids: c.ids, i }, tab: stop.tab ?? 'home', transition: null, undo: null, seen: allSeen(game), ...savedSwitches(), master: false, simple: false, guide: false });
        top();
        return;
      }
      // the end of the tour
      const road = { ...get().road, toured: 1 as const };
      saveRoad(road);
      set({ road, closing: null, game: null, tab: 'home', transition: null, undo: null, ...savedSwitches() });
      top();
    }),
  graduate: () => {
    const road = { ...get().road, free: 1 as const };
    saveRoad(road);
    set({ road, recommend: true, page: null, creating: null, mini: null, ...savedSwitches() });
    top();
  },
  gradeMini: (r) => {
    const road = get().road;
    const best = bestGrade(road.minis[r.game], roadGrade(r));
    if (best === road.minis[r.game]) return;
    const next = { ...road, minis: { ...road.minis, [r.game]: best } };
    saveRoad(next);
    set({ road: next });
  },
  slot: null,
  resume: async (id) => {
    const game = await readSlot(id);
    if (!game) return false;
    weightOf(game.player); // careers saved before round 20 get a weight
    touchOf(game.player); // and before round 35 a free-throw touch
    // round 34 (owner: "when i look back or continue from the career log, it doesnt instantly direct
    // me to the career's homepage"): straight to its Home, from wherever Continue was pressed
    set({ game, slot: id, tab: 'home', page: null, transition: null, mini: null, seen: allSeen(game), daily: null, logged: null, lookBack: game.step === 'retired', ...oathLock(game) });
    // round 34: Look back and Continue count in the book (Rewind, Where We Left Off)
    recordOpened(game.step === 'retired');
    top();
    return true;
  },
  importCareer: async (code) => {
    // round 35: the dev deck's alone (owner: "i dont want people abusing the export codes")
    if (!isDev()) return false;
    const game = await importCode(code);
    if (!game) return false;
    weightOf(game.player);
    const slot = newSlotId();
    set({ game, slot, tab: 'home', page: null, transition: null, mini: null, seen: allSeen(game), daily: null, logged: null, lookBack: game.step === 'retired', ...oathLock(game) });
    top();
    return true;
  },
  lookBack: false,
  leaveLookBack: () => {
    set({ game: null, slot: null, tab: 'home', transition: null, lookBack: false, page: 'log' });
    top();
  },
  choose: (choiceId) =>
    later(() => {
      const g = get().game;
      if (!g) return;
      const next = structuredClone(g);
      engineChoose(next, choiceId);
      const before = next.step;
      fastForward(next);
      set({ game: next, ...remember(g, choiceLabel(g, choiceId)) });
      if (next.flags.fast && next.step !== before) top();
    }),
  advance: () =>
    later(() => {
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
      set({ game: next, tab: 'home', transition, ...remember(g, stepLabel(g)) });
      top();
    }),
  changeFocus: (keys) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    changeFocus(next, keys);
    set({ game: next, ...remember(g, 'New focus stats') });
  },
  recruit: (id) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    recruitPlayer(next, id);
    set({ game: next, ...remember(g, 'Recruiting a starter') });
  },
  payCut: () => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    takePayCut(next);
    set({ game: next, ...remember(g, 'Taking a pay cut') });
  },
  lockerTalk: (who, opt) => {
    const g = get().game;
    if (!g) return null;
    const next = structuredClone(g);
    const text = lockerTalk(next, who, opt);
    if (text) set({ game: next, ...remember(g, 'A word in the locker room') });
    return text;
  },
  chase: () => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    chaseRecord(next);
    set({ game: next, ...remember(g, 'Chasing a record') });
  },
  askRole: () => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    askRole(next);
    set({ game: next, ...remember(g, 'Asking the coach for a bigger role') });
  },
  playChild: () =>
    later(() => {
      const g = get().game;
      if (!g || !canPlayChild(g)) return;
      // the father's save remembers that his child's career has started
      const father: GameState = { ...g, flags: { ...g.flags, childPlayed: 1 } };
      const slot = get().slot;
      if (slot) void writeSlot(slot, father);
      const rec = careerRecord(father);
      const kid = childGame(father, childSeed(father), rec.id, rec.legacy, slot ?? undefined);
      fastForward(kid);
      set({ game: kid, slot: newSlotId(), tab: 'home', transition: null, mini: null, seen: allSeen(kid), undo: null, logged: null, ...oathLock(kid) });
      top();
    }),
  farewell: () => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    announceFarewell(next);
    set({ game: next, ...remember(g, 'Announcing a farewell tour') });
  },
  fireCoach: () => {
    const g = get().game;
    if (!g) return null;
    const next = structuredClone(g);
    const text = fireCoach(next);
    if (text) set({ game: next, ...remember(g, 'Firing the coach') });
    return text;
  },
  labSpend: (k, points) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    spendCredits(next, k, points);
    set({ game: next, ...remember(g, 'Spending lab credits') });
  },
  changeNumber: (n) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    changeNumber(next, n);
    set({ game: next, ...remember(g, 'A new jersey number') });
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
    if (text) set({ game: next, ...remember(g, 'A contract ask') });
    return text;
  },
  staffAct: (id, act) => {
    const g = get().game;
    if (!g) return null;
    const next = structuredClone(g);
    const text = act === 'talk' ? talkStaff(next, id) : act === 'raise' ? (raiseStaff(next, id) ? 'raised' : null) : (letGo(next, id), 'gone');
    if (text) set({ game: next, ...remember(g, 'A staff move') });
    return text;
  },
  requestTrade: (aim, to) => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    requestTrade(next, aim, to);
    set({ game: next, ...remember(g, 'A trade request') });
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
    set({ game: next, ...remember(g, 'A new position') });
  },
  retire: () =>
    later(() => {
      const g = get().game;
      if (!g) return;
      const next = structuredClone(g);
      retireByChoice(next);
      set({ game: next, tab: 'home', transition: null, undo: null });
      top();
    }),
  dismissMoment: () => {
    const g = get().game;
    if (!g) return;
    const next = structuredClone(g);
    dismissMoment(next);
    set({ game: next });
    top();
  },
  endTransition: () => set({ transition: null }),
  // round 27 (owner: "for end career, instead of discarding that game totally, make the user be
  // able to pick it up again from Your careers"): leaving a career keeps its save; only Delete in
  // Your careers removes one
  reset: () => {
    // round 33: New career inside the closing tour moves on to its next stop
    if (get().closing) return get().nextStop();
    flushSave();
    // round 27 (owner): a thank-you page first. Round 28 (owner: "make the thank you page appear
    // everytime the user exits a career"): every time, not only the first
    const g = get().game;
    const thanks = g && !g.flags.daily && g.mode !== 'lab' ? g : null;
    set({ game: null, slot: null, tab: 'home', transition: null, thanks, lookBack: false });
  },
  mini: null,
  claimMini: (r) => {
    const g = get().game;
    if (!g || !canClaimMini(g, r.game)) return '';
    const next = structuredClone(g);
    const text = claimMini(next, r);
    set({ game: next, undo: null }); // a bonus claimed is kept: no stepping back past a mini-game
    return text;
  },
  setMini: (mini) =>
    later(() => {
      // round 24 (owner): no mini-games during a daily challenge
      if (mini && get().game?.flags.daily) return;
      set({ mini });
      top();
    }),
  setTab: (tab) =>
    later(() => {
      const g = get().game;
      // round 33: a level shows only its own tabs
      if (g && !(levelTabs(g) ?? [tab]).includes(tab as never)) return;
      // what the tab's dot was about, read before the tab counts as seen
      const list = g && tab !== get().tab ? tabNews(g, tab, get().seen[tab]) : [];
      // leaving a tab and opening one both count as having seen them
      const seen = g ? { ...get().seen, [get().tab]: tabKey(g, get().tab), [tab]: tabKey(g, tab) } : get().seen;
      set({ tab, seen, spots: list.length ? { tab, list, total: list.length } : null });
      top();
    }),
  spots: null,
  endSpot: () =>
    set((s) => {
      const rest = s.spots?.list.slice(1) ?? [];
      return { spots: s.spots && rest.length ? { ...s.spots, list: rest } : null };
    }),
  setTheme: (theme) => {
    try {
      if (theme === 'auto') localStorage.removeItem('btr-theme');
      else localStorage.setItem('btr-theme', theme);
    } catch {
      /* storage can be unavailable; the theme still applies for this visit */
    }
    set({ theme });
  },
  setText: (text) => {
    try {
      if (text === 'm') localStorage.removeItem('btr-text');
      else localStorage.setItem('btr-text', text);
    } catch {
      /* the size still applies for this visit */
    }
    set({ text });
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

// round 27: the career's chosen look applies wherever his name is drawn (content/looks.ts)
useStore.subscribe((now) => {
  const g = now.game ?? now.thanks;
  if (g?.player.look) chooseLook(g.player.name, g.player.look);
});

// save a moment after each change (a whole career is a few hundred KB of JSON). Round 24: the
// autosave only ever writes a career, never clears one: going back to the start page, or ending a
// daily challenge started there, used to wipe the career waiting behind Continue.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function flushSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  const st = useStore.getState();
  if (!st.game || st.daily) return;
  if (st.game.flags.tour) return; // a closing-tour stop is never saved
  if (st.game.flags.level) {
    void writeRun(st.game);
    return;
  }
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
  // round 33: the levels count nowhere (owner: "dont count in any community"; no achievements)
  if (offRecord(g)) return;
  // round 32: the career's last achievements first, so its card carries all of them
  achievementsNow();
  // round 32: a child's career is never logged or posted on its own: a share of it goes to his
  // father, on his card in the log and in his save
  if (g.flags.gen2 && g.parent) {
    const kid = childLegacy(careerRecord(g));
    attachChild(g.parent.recId, kid);
    const fs = g.parent.slot;
    if (fs) void readSlot(fs).then((f) => (f && !f.kid ? writeSlot(fs, { ...f, kid }) : false));
    useStore.setState({ logged: null });
    return;
  }
  const got = earnedIn(g);
  const order = (t: string) => ACH_TIERS.findIndex((x) => x.key === t);
  const rec: CareerRecord = { ...careerRecord(g), slot: now.slot ?? undefined, ach: { n: got.length, top: [...got].sort((a, b) => order(b.tier) - order(a.tier)).slice(0, 10).map((a) => ({ name: a.name, tier: a.tier })) } };
  const logged = logCareer(rec);
  // round 34: a card pushed out of the log takes its save with it (the log is the saved careers)
  if (logged.dropped?.slot) deleteSlot(logged.dropped.slot);
  useStore.setState({ logged });
  // round 24: onto the leaderboards (and the news feed) for everyone who shares this page. Round 35
  // (owner: "the career played in multiplayer wont be counted towards the real leaderboards in
  // community"): a career with friends counts on its challenge's or class's board only
  if (!g.mp?.challenge && !g.mp?.klass) void community().then((c) => c.postCareer(rec));
  // round 35: a draft class gets the card, a friend's challenge its answer
  if (g.mp?.klass) send({ k: 'career', code: g.mp.klass, rec, run: g.mp.run });
  if (g.mp?.challenge) {
    send({ k: 'answer', code: g.mp.challenge, name: handle() || 'A friend', rec });
    if (recordMp('answered', g.mp.challenge)) achievementsNow();
  }
});

// round 35: each finished season of a draft class career goes to the class, a short line
useStore.subscribe((now, before) => {
  const g = now.game;
  const b = before.game;
  if (!g?.mp?.klass || !b || g === b || g.seed !== b.seed || g.player.name !== b.player.name || g.history.length <= b.history.length) return;
  for (const h of g.history.slice(b.history.length)) send({ k: 'season', code: g.mp.klass, s: { ...seasonLine(h, g.player.name, g.player.pos), ...(g.mp.run ? { run: g.mp.run } : {}) } });
});
// anything a closed page left unsent goes now
setTimeout(() => void pump(), 4000);

// round 31: the step back belongs to the career it was taken in; another career on screen (a new
// one, a save picked up, the daily challenge) drops it
useStore.subscribe((now) => {
  const u = now.undo;
  if (u && (!now.game || now.game.seed !== u.game.seed || now.game.player.name !== u.game.player.name)) useStore.setState({ undo: null });
});

// round 24: achievements, checked a moment after each change; a career that ends counts first
let achTimer: ReturnType<typeof setTimeout> | null = null;
useStore.subscribe((now, before) => {
  if (now.game === before.game) return;
  const g = now.game;
  if (g && before.game && g !== before.game && g.step === 'retired' && before.game.step !== 'retired' && g.mode !== 'lab' && !offRecord(g)) countCareer(g, now.master);
  if (achTimer) clearTimeout(achTimer);
  achTimer = setTimeout(achievementsNow, 400);
});

/** Checks the book now and raises a toast for anything new (also after a mini-game run, round 27). */
export function achievementsNow(): void {
  const g = useStore.getState().game;
  // round 33: no achievements in the levels or the closing tour
  if (g && offRecord(g)) return;
  const fresh = checkAch(g);
  if (!fresh.length) return;
  // the career keeps count, for the Extras tab's dot (round 31)
  if (g && g.step !== 'retired') useStore.setState({ game: { ...g, achN: (g.achN ?? 0) + fresh.length } });
  // a flood (an old save, a long career at once) shows three and a count of the rest
  const shown: Store['toasts'] = fresh.slice(0, 3).map((a) => ({ id: a.id, name: a.name, tier: a.tier }));
  if (fresh.length > 3) shown[2] = { ...shown[2], more: fresh.length - 3 };
  useStore.setState({ toasts: [...useStore.getState().toasts, ...shown].slice(-4) });
}

/** What is on the game's screen (round 28): set aside while the dev deck is open, then put back.
 * The theme and the court are left out, since the deck shares them with the game. */
export type View = Partial<Store>;
export function viewNow(): View {
  return Object.fromEntries(Object.entries(useStore.getState()).filter(([k, v]) => typeof v !== 'function' && k !== 'theme' && k !== 'court' && k !== 'text' && k !== 'loading')) as View;
}
/** The start page as the game's own storage has it (the deck was opened before the game was). */
/** The road as this storage has it, with nothing of the tutorial's on screen. */
export const roadView = (): View => ({ road: loadRoad(), creating: null, closing: null, recommend: false, lessonUp: false });
export function startView(): View {
  return { game: null, tab: 'home', page: null, mini: null, transition: null, daily: null, toasts: [], thanks: null, spots: null, intro: false, news: false, slot: null, seen: {}, logged: null, tour: false, simple: loadFlag('btr-simple'), master: loadFlag('btr-master'), guide: loadFlag('btr-guide-mode'), lookBack: false, ...roadView() };
}
/** Settles what is waiting to be written as the deck opens (`flush`: the game's last move is
 * saved where it belongs) or closes (dropped: nothing of the deck's reaches the game). */
export function settle(flush: boolean): void {
  if (achTimer) clearTimeout(achTimer);
  achTimer = null;
  if (flush && saveTimer) flushSave();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
}

// round 33: a level career in progress comes straight back after a reload (owner: "they also cant
// quit"); the deck keeps storage of its own and never picks one up
if (typeof window !== 'undefined' && !isDev())
  void readRun().then((g) => {
    if (g && !useStore.getState().game) useStore.setState({ game: g, slot: null, tab: 'home', seen: allSeen(g), ...oathLock(g) });
  });

// closing the tab inside the half second still keeps the last move
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => saveTimer && flushSave());

// development only: lets browser tests load a finished career (stripped from production builds)
if (import.meta.env.DEV) (window as unknown as { __btr?: typeof useStore }).__btr = useStore;
