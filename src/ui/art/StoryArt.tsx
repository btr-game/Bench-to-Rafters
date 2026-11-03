// Story mode's portraits (round 38): the people in pixel busts, the same style as every player's.
// The friend and the rival wear their NBA team's home kit once they are there (his own role's
// colours before that: the friend green, the rival red); the parent and the sibling wear their own
// clothes, with no number. Each face comes from the name (art/Player.tsx lookOf), so a name the
// player types is a face of its own.

import type { Kit } from '../../content/teamStyle';
import { TEAM_STYLE } from '../../content/teamStyle';
import { NBA_TEAMS } from '../../content/teams';
import type { StoryRole } from '../../engine/types';
import { BustArt } from './Bust';

const OWN: Record<StoryRole, Kit> = {
  friend: { base: '#2F9E44', ink: '#FFFFFF', trim: '#1E7A32', word: '' },
  rival: { base: '#C92A2A', ink: '#FFFFFF', trim: '#18141C', word: '' },
  parent: { base: '#8B5A2B', ink: '#F1E3C8', trim: '#5E3A1C', word: '' },
  sibling: { base: '#7048E8', ink: '#FFFFFF', trim: '#5235C4', word: '' },
  mentor: { base: '#343A40', ink: '#FFFFFF', trim: '#868E96', word: '' },
  agent: { base: '#1F2A44', ink: '#F4F4F4', trim: '#C9A227', word: '' },
  reporter: { base: '#E9ECEF', ink: '#343A40', trim: '#1C7ED6', word: '' },
};
const NUMBER: Partial<Record<StoryRole, number>> = { friend: 11, rival: 1 };

/** The friend's or the rival's NBA team, by its full name ("Boston Celtics"). */
const nbaKit = (team: string): Kit | null => {
  const t = NBA_TEAMS.find((x) => team === `${x.city} ${x.nick}`);
  return t ? TEAM_STYLE[t.abbr].home : null;
};

/** One of his people, head and shoulders. `team` dresses the friend or the rival in it. */
export function StoryPortrait({ role, name, team = '', size = 72 }: { role: StoryRole; name: string; team?: string; size?: number }) {
  const kit = (role === 'friend' || role === 'rival' ? nbaKit(team) : null) ?? OWN[role];
  return <BustArt name={name} kit={kit} number={NUMBER[role] ?? -1} size={size} />;
}
