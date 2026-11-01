// The farewell tour (round 32, owner on the idea "Announce your last season in advance. Every road
// arena gives you a pixel-art gift, morale rises, and the pressure for one last title run grows.
// It adds legacy points."). Said in an NBA offseason from FAREWELL.age: the next season is his
// last. In it the team rallies in the playoffs; at its end six road arenas give him a gift, the
// tour counts as an honour (legacy points), and he retires.

import { FAREWELL_GIFTS } from '../../content/farewell';
import { FAREWELL } from '../balance';
import { shuffle } from '../rng';
import type { GameState } from '../types';
import { adjust, logDecision, pushMoment } from './common';
import { inLevel } from '../levels';

export function canFarewell(s: GameState): boolean {
  if (inLevel(s)) return false; // round 33: the closing tour shows it
  return s.stage === 'NBA' && s.step === 'offseason' && !!s.teamId && s.player.age >= FAREWELL.age && !s.flags.farewell;
}

/** The season that will be his last, if he has said so. */
export const farewellYear = (s: GameState): number | null => s.flags.farewell || null;
export const isFarewellSeason = (s: GameState): boolean => s.flags.farewell === s.year && s.step !== 'offseason' && s.step !== 'retired';

export function announceFarewell(s: GameState): void {
  if (!canFarewell(s)) return;
  s.flags.farewell = s.year + 1;
  const p = s.player;
  p.morale = adjust(p.morale, FAREWELL.morale);
  p.rep = adjust(p.rep, FAREWELL.rep);
  logDecision(s, 'farewell', `Announced a farewell tour: the coming season is his last (morale +${FAREWELL.morale}, reputation +${FAREWELL.rep}).`);
  s.toast = 'Next season is your last. Every arena will want to say goodbye.';
}

/** The end of the last season: the road arenas' gifts, the honour, and a page for it. Called
 * before the offseason that retires him. */
export function endFarewell(s: GameState): void {
  if (s.flags.farewell !== s.year || !s.nba) return;
  const others = shuffle(s.rng, s.nba.teams.filter((t) => t.id !== s.teamId)).slice(0, FAREWELL.gifts);
  const gifts = shuffle(s.rng, [...FAREWELL_GIFTS]);
  s.player.gifts = others.map((t, i) => ({ team: t.name, color: t.color, gift: gifts[i % gifts.length] }));
  s.awards.push({ year: s.year, level: 'NBA', key: 'FAREWELL', label: 'Farewell tour' });
  pushMoment(s, {
    kind: 'event',
    title: 'The farewell tour',
    text: 'Every road arena stood up for you one more time. Some sent you home with something.',
    color: '#C9A227',
    lines: s.player.gifts.map((g) => `${g.team}: ${g.gift}`),
  });
}
