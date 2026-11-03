// Read-only helpers that turn the game state into things screens show.

import type { GameState, League, Team } from '../engine/types';
import { ovrOf } from '../engine/player/ovr';
import { LEVELS } from '../engine/balance';
import { NAMES } from '../content/strings';
import { repLabel } from '../engine/career/common';
import { healthLabel } from '../engine/player/injury';
import { t, tx } from '../i18n';

export const ovr = (g: GameState): number => ovrOf(g.player.attrs, g.player.pos);

export function league(g: GameState): League | null {
  if (g.stage === 'NBA') return g.nba;
  return g.league;
}

export function team(g: GameState): Team | null {
  const lg = league(g);
  if (!lg || !g.teamId) return null;
  return lg.teams.find((x) => x.id === g.teamId) ?? null;
}

/** The school years, high school's post-grad year last (college stops at senior). */
const YEARS = [tx('Freshman'), tx('Sophomore'), tx('Junior'), tx('Senior'), tx('Post-grad')];

export function stageLine(g: GameState): string {
  const p = g.player;
  if (g.stage === 'RETIRED') return t('Retired at {age}', { age: g.retiredAt ?? p.age });
  const lvl = g.season ? LEVELS[g.season.level].short : '';
  // outside the US, youth and university leagues have their own names (career/culture.ts)
  const named = g.league?.label && (g.stage === 'HS' || g.stage === 'INT') ? g.league.label.replace(/ \(second team\)$/, '') : null;
  if (g.stage === 'HS' && named) return `${t('Age {age}', { age: p.age })} · ${named}`;
  if (g.stage === 'HS') return `${t(YEARS[g.hsYear - 1])} · ${lvl}`;
  if (g.stage === 'INT' && named) return named;
  if (g.stage === 'NCAA') return `${t(YEARS[Math.min(3, g.ncaaYear)])} · ${lvl}`;
  if (g.stage === 'NBA') {
    const yr = g.serviceYears + (g.step === 'offseason' ? 1 : g.step === 'summary' ? 0 : 1);
    return yr <= 1 && g.step !== 'summary' ? t('NBA rookie') : `NBA · ${t('year {n}', { n: Math.max(1, yr) })}`;
  }
  return lvl;
}

export const roleName = (g: GameState): string => (g.season ? NAMES.role[g.season.role] : '—');
export const repName = (g: GameState): string => repLabel(g.player.rep);
export const health = (g: GameState): string => healthLabel(g.player);

/**
 * What each tab shows, boiled down to a key (round 14): when the key moves on while the player
 * is elsewhere, the tab gets a "new" dot. Home has none; it is where the game happens.
 */
export function tabKey(g: GameState, tab: 'home' | 'season' | 'player' | 'records' | 'extras'): string {
  const s = g.season;
  switch (tab) {
    case 'season':
      // round 29: the League tab's champions are on the Season tab now
      return `${g.year}:${s ? s.games.length + s.postGames.length + (s.preGames?.length ?? 0) + (s.cupGames?.length ?? 0) : 0}:${g.nbaHistory.length}`;
    case 'player':
      // round 28: a nickname and the logo's first showing are news too
      return `${Math.round(ovr(g))}:${g.player.pos}:${g.player.nickname?.id ?? ''}:${g.player.nickname?.logo || g.player.brand ? 1 : 0}`;
    case 'records':
      return `${g.history.length}:${g.awards.length}:${g.tournaments.length}`;
    case 'extras':
      // a mini-game that opens is news (round 29), and so is an achievement this career earns (round 31)
      return `${(g.miniOpen ?? []).length}:${g.achN ?? 0}`;
    default:
      return '';
  }
}
