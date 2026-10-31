// Details behind an honour (playtest round 7): tap a trophy to see when and with which team
// it was won, what it is, and what it is worth to the legacy. Also the rafters ceremony data:
// the teams that hang his jersey and why, or how close he came.

import type { GameState, SeasonRecord } from '../types';
import { awardLook, AWARD_CATS } from '../../content/awards';
import { NBA_TEAMS } from '../../content/teams';
import { HONOR_PTS, TIERS, legacyIndex, type TierKey } from './tiers';
import { legacyScore, nbaCareerPoints, nbaTitles, raftersTeams } from './legacy';

interface AchievementDetail {
  label: string;
  key: string;
  desc: string;
  category: string;
  color: string;
  tier: TierKey | null;
  tierName: string;
  tierColor: string;
  ptsEach: number;
  ptsTotal: number;
  share: number; // of his legacy points, 0-1
  wins: { year: number; teamName: string; teamColor: string; level: string }[];
  legacyLine: string;
}

const seasonOf = (s: GameState, year: number, level: string): SeasonRecord | undefined =>
  s.history.find((h) => h.year === year && h.level === level && !/assignment/i.test(h.teamName)) ??
  s.history.find((h) => h.year === year && !/assignment/i.test(h.teamName));

/** Everything about one honour, by the label the trophy cabinet shows. */
export function achievementDetail(s: GameState, label: string): AchievementDetail | null {
  const won = s.awards.filter((a) => a.label === label);
  if (won.length === 0) return null;
  const key = won[0].key;
  const look = awardLook(key, label);
  const tier = TIERS.find((t) => t.items.some((it) => it.key === key)) ?? null;
  const item = tier?.items.find((it) => it.key === key);
  const ptsEach = item?.pts ?? 0;
  const ptsTotal = ptsEach * won.length;
  const total = legacyIndex(s);
  const wins = won
    .map((a) => {
      const row = seasonOf(s, a.year, a.level);
      // national-team honours belong to the country, not a club
      const country = /olymp|world cup|asian games|youth/i.test(label);
      return { year: a.year, level: a.level, teamName: country ? s.player.country : row?.teamName ?? '', teamColor: country ? '#8A6D1F' : row?.teamColor ?? '#555' };
    })
    .sort((a, b) => a.year - b.year);
  const legacyLine = !tier
    ? 'Not part of the legacy score. It is part of the story, and it helps reputation, contracts and the scouts.'
    : `${tier.tier} tier (${tier.name}): ${ptsEach} legacy point${ptsEach === 1 ? '' : 's'} each${won.length > 1 ? `, ${Math.round(ptsTotal * 10) / 10} in all` : ''}${total > 0 ? `, ${Math.round((ptsTotal / total) * 100)}% of your legacy` : ''}.`;
  return {
    label,
    key,
    desc: look.desc || AWARD_CATS[look.cat].name,
    category: AWARD_CATS[look.cat].name,
    color: look.color,
    tier: tier?.tier ?? null,
    tierName: tier?.name ?? '',
    tierColor: tier?.color ?? '#4A4F57',
    ptsEach,
    ptsTotal,
    share: total > 0 ? ptsTotal / total : 0,
    wins,
    legacyLine,
  };
}

interface RaftersTeam {
  id: string;
  name: string;
  color: string;
  seasons: number;
  first: number;
  last: number;
  titles: number;
  points: number;
  why: string;
}

function teamStats(s: GameState, id: string): Omit<RaftersTeam, 'why'> {
  const t = NBA_TEAMS.find((x) => x.abbr === id);
  const rows = s.history.filter((h) => h.level === 'NBA' && h.teamId === id);
  return {
    id,
    name: t ? `${t.city} ${t.nick}` : rows[0]?.teamName ?? id,
    color: t?.color ?? rows[0]?.teamColor ?? '#555',
    seasons: rows.length,
    first: Math.min(...rows.map((h) => h.year)),
    last: Math.max(...rows.map((h) => h.year)),
    titles: rows.filter((h) => h.awards.includes('Champion')).length,
    points: Math.round(rows.reduce((p, h) => p + h.line.pts + h.post.pts, 0)),
  };
}

/** The teams that hang his jersey, with the case for each. */
export function raftersDetail(s: GameState): RaftersTeam[] {
  return raftersTeams(s).map((id) => {
    const t = teamStats(s, id);
    const parts = [`${t.seasons} seasons`, `${t.points.toLocaleString()} points`];
    if (t.titles) parts.push(`${t.titles} championship${t.titles > 1 ? 's' : ''}`);
    return { ...t, why: parts.join(' · ') };
  });
}

/** When nobody hangs his jersey: the team he came closest with and what was missing. */
export function raftersNearMiss(s: GameState): { team: string; color: string; lines: string[] } | null {
  const ids = [...new Set(s.history.filter((h) => h.level === 'NBA').map((h) => h.teamId))];
  if (ids.length === 0) return null;
  const best = ids.map((id) => teamStats(s, id)).sort((a, b) => b.seasons - a.seasons || b.titles - a.titles)[0];
  const legacy = legacyScore(s);
  const lines: string[] = [];
  lines.push(`Longest stay: ${best.seasons} season${best.seasons === 1 ? '' : 's'} with the ${best.name}.`);
  lines.push('A team hangs a jersey after 7+ seasons with a legacy score of 25+, or 5+ seasons with a title won as a key player.');
  if (best.seasons < 5) lines.push(`${5 - best.seasons} more season${5 - best.seasons === 1 ? '' : 's'} there would have opened the door.`);
  else if (legacy < 25 && best.seasons >= 7) lines.push(`The legacy score was ${legacy}; it needed 25.`);
  else if (best.seasons < 7 && nbaTitles(s) === 0) lines.push('A title as a key player there would have done it.');
  else lines.push('Moving to a rival can cancel it, unless you come back.');
  return { team: best.name, color: best.color, lines };
}

export const RAFTERS_POINTS = HONOR_PTS.rafters;
export { nbaCareerPoints };
