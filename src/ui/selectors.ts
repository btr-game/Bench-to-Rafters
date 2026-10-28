// Read-only helpers that turn the game state into things screens show.

import type { GameState, League, Team } from '../engine/types';
import { ovrOf } from '../engine/player/ovr';
import { LEVELS } from '../engine/balance';
import { NAMES } from '../content/strings';
import { repLabel } from '../engine/career/common';
import { healthLabel } from '../engine/player/injury';

export const ovr = (g: GameState): number => ovrOf(g.player.attrs, g.player.pos);

export function league(g: GameState): League | null {
  if (g.stage === 'NBA') return g.nba;
  return g.league;
}

export function team(g: GameState): Team | null {
  const lg = league(g);
  if (!lg || !g.teamId) return null;
  return lg.teams.find((t) => t.id === g.teamId) ?? null;
}

export function stageLine(g: GameState): string {
  const p = g.player;
  if (g.stage === 'RETIRED') return `Retired at ${g.retiredAt ?? p.age}`;
  const lvl = g.season ? LEVELS[g.season.level].short : '';
  // outside the US, youth and university leagues have their own names (career/culture.ts)
  const named = g.league?.label && (g.stage === 'HS' || g.stage === 'INT') ? g.league.label.replace(/ \(second team\)$/, '') : null;
  if (g.stage === 'HS' && named) return `Age ${p.age} · ${named}`;
  if (g.stage === 'HS') return `${['Freshman', 'Sophomore', 'Junior', 'Senior', 'Post-grad'][g.hsYear - 1]} · ${lvl}`;
  if (g.stage === 'INT' && named) return named;
  if (g.stage === 'NCAA') return `${['Freshman', 'Sophomore', 'Junior', 'Senior'][Math.min(3, g.ncaaYear)]} · ${lvl}`;
  if (g.stage === 'NBA') {
    const yr = g.serviceYears + (g.step === 'offseason' ? 1 : g.step === 'summary' ? 0 : 1);
    return yr <= 1 && g.step !== 'summary' ? 'NBA rookie' : `NBA · year ${Math.max(1, yr)}`;
  }
  return lvl;
}

export const roleName = (g: GameState): string => (g.season ? NAMES.role[g.season.role] : '—');
export const repName = (g: GameState): string => repLabel(g.player.rep);
export const health = (g: GameState): string => healthLabel(g.player);
