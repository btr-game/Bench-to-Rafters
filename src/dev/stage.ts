// The dev deck's fixtures: real careers, played by the balance harness's smart player until the
// state a card needs shows up (a decision, a moment, a stage), so every card opens on a true game.

import { STORY_HERO } from '../engine/story/cast';
import { advance, choose, newGame, prompt, type Prompt } from '../engine/flow';
import { smartChoice } from '../../scripts/harness';
import { makeRng } from '../engine/rng';
import { fastForward, setSim } from '../engine/fast';
import { ARCHETYPES } from '../engine/player/archetypes';
import { POSITIONS, type Mode } from '../engine/balance';
import type { Decision, GameState, Moment, Pos } from '../engine/types';
import type { Level } from '../engine/levels';

export interface PlayOpts {
  mode?: Mode;
  pos?: Pos;
  /** Leave the playable postseason on (it is simulated otherwise, which is quicker). */
  live?: boolean;
  fast?: boolean;
  /** Pick a choice yourself; undefined falls back to the smart player. */
  pick?: (s: GameState, d: Decision) => string | undefined;
  seed?: number;
  tries?: number;
  /** Round 30: played as the game plays it, each move followed by fast break's run to the next
   * stop: in sim mode, or as a Comet. */
  quick?: 'sim' | 'comet';
  /** Round 33: a level career of the road map. */
  level?: Level;
  /** Round 38: a story mode career (the written hero), with these names for his people. */
  story?: Record<string, string>;
}

const NAMES = ['Jordan Vale', 'Marcus Reed', 'Theo Grant', 'Andre Lucas', 'Caleb Stone', 'Isaiah Moore'];

function input(seed: number, o: PlayOpts) {
  if (o.story) return { ...STORY_HERO, focus: [...STORY_HERO.focus], fast: o.fast, story: o.story };
  const pos = o.pos ?? POSITIONS[seed % POSITIONS.length];
  return { name: NAMES[seed % NAMES.length], number: (seed % 54) + 1, pos, archetype: seed % ARCHETYPES[pos].length, focus: pos === 'C' || pos === 'PF' ? (['INT', 'REB'] as const) : (['SHT', 'PLY'] as const), mode: o.mode ?? 'standard', fast: o.fast, comet: o.quick === 'comet', level: o.level };
}

/** Plays careers until `until` holds (checked before every step); null if no career gets there. */
export function play(until: (s: GameState, p: Prompt) => boolean, o: PlayOpts = {}): GameState | null {
  for (let k = 0; k < (o.tries ?? 10); k++) {
    const seed = 101 + (o.seed ?? 0) + k * 37;
    const s = newGame(seed, { ...input(seed, o), focus: [...input(seed, o).focus] });
    if (!o.live) s.flags.simPostseason = 1;
    if (o.quick === 'sim') setSim(s, true);
    else if (o.quick) fastForward(s);
    const r = makeRng(seed ^ 0x51ed);
    for (let i = 0; i < 6000; i++) {
      const p = prompt(s);
      if (until(s, p)) return s;
      if (p.type === 'retired') break;
      // the deck reads moments only through `until`; nobody is there to dismiss them
      s.moments = [];
      if (p.type === 'decision') choose(s, o.pick?.(s, p.decision) ?? smartChoice(s, p.decision, r));
      else advance(s);
      if (o.quick) fastForward(s);
    }
  }
  return null;
}

/** A decision of this kind is up. */
export const decision = (kind: string) => (_: GameState, p: Prompt) => p.type === 'decision' && p.decision.kind === kind;

/** A moment like this is on screen. */
export const moment = (ok: (m: Moment) => boolean) => (s: GameState) => s.moments.some(ok);

/** Only that moment stays on screen. */
export function onlyMoment(s: GameState, ok: (m: Moment) => boolean): GameState {
  s.moments = s.moments.filter(ok).slice(0, 1);
  return s;
}
