// Friends in a career (round 35, owner: "add multiplayer specific features ... each user can send a
// rivalry to one other, and if they accept, they become draft rivals. their dynamics when they meet
// should be more deliberate. if two users join the same team, they can form duos (or a big three if
// three are in the same team)"). Each friend's career is played on his own device, on the class's
// seed, so the league is the same but his player lives only in his own copy of it. Before each
// season the page copies the class's season lines into the career (GameState.mp.friends), and the
// engine reads only that copy: the same copy gives the same career.
// - Where a friend is: his line for this year when he has played it, or else last year's (he is
//   ahead or level, or a season behind); further behind, he is nowhere yet.
// - A friend on his NBA team this season is a duo; two are a Big Three (career/duo.ts takes them
//   in when there is no duo of his own, or as the third man of his own duo).
// - His rival classmate's team, when both are in the NBA on different teams, means a rival night
//   once a season (events/friends.ts), with a record of their meetings.

import type { Bond } from './duo';
import type { FriendLine, GameState, Pos, Team } from '../types';
import { note, pushMoment, teamById } from './common';

type Line = FriendLine['seasons'][number];

/** Where a friend is this season: his line for it, or the one before it (he plays it next). */
export function friendNow(f: FriendLine, year: number): (Line & { projected?: boolean }) | null {
  const now = f.seasons.find((x) => x.year === year);
  if (now) return now;
  const before = f.seasons.find((x) => x.year === year - 1);
  return before ? { ...before, year, projected: true } : null;
}

/** How the game names a classmate: his player, then the friend. */
export const friendName = (f: FriendLine): string => `${f.pn} (${f.name})`;

const myTeam = (s: GameState): Team | null => (s.stage === 'NBA' ? (teamById(s.nba, s.teamId) ?? null) : null);

/** Friends on his NBA team this season, in the order they joined the class. */
export function friendsOnTeam(s: GameState): { f: FriendLine; line: Line }[] {
  const t = myTeam(s);
  if (!t || !s.mp?.klass) return [];
  return (s.mp.friends ?? []).flatMap((f) => {
    const line = friendNow(f, s.year);
    return line && line.lv === 'NBA' && line.team === t.name ? [{ f, line }] : [];
  });
}

/** Seasons he and a friend have shared a team, counting back from this one while they did. */
function together(s: GameState, f: FriendLine): { seasons: number; since: number } {
  let n = 1;
  let since = s.year;
  for (let y = s.year - 1; ; y--) {
    const mine = s.history.find((h) => h.year === y);
    const his = f.seasons.find((x) => x.year === y);
    if (!mine || !his || mine.level !== 'NBA' || his.lv !== 'NBA' || mine.teamName !== his.team) break;
    n++;
    since = y;
  }
  return { seasons: n, since };
}

/** A friend on his team, as a duo partner: formed the first season of their run together. */
export function friendBonds(s: GameState): Bond[] {
  return friendsOnTeam(s).map(({ f }, i) => {
    const t = together(s, f);
    return { id: -1 - i, name: friendName(f), pos: (f.pos || 'SF') as Pos, spark: 1, bond: 100, seasons: t.seasons, formed: t.since, friend: f.name, trio: i > 0 };
  });
}

/** The classmate he and his rival picked each other, if the class has sent him. */
function rivalFriend(s: GameState): FriendLine | null {
  const id = s.mp?.rival;
  return (id && s.mp?.friends?.find((f) => f.id === id)) || null;
}

/** His rival classmate's team this season, when both are in the NBA on different teams. */
export function rivalTeam(s: GameState): { f: FriendLine; line: Line & { projected?: boolean }; team: Team } | null {
  const f = rivalFriend(s);
  const me = myTeam(s);
  if (!f || !me || !s.nba) return null;
  const line = friendNow(f, s.year);
  if (!line || line.lv !== 'NBA' || line.team === me.name) return null;
  const team = s.nba.teams.find((t) => t.name === line.team);
  return team ? { f, line, team } : null;
}

/** Their record in rival nights: his wins and losses. */
export function rivalRecord(s: GameState): { w: number; l: number; sw: number; sl: number } {
  const all = s.mp?.meets ?? [];
  // rival nights, and (round 35) playoff series against him, counted apart
  const m = all.filter((x) => !x.series);
  const ps = all.filter((x) => x.series);
  return { w: m.filter((x) => x.won).length, l: m.filter((x) => !x.won).length, sw: ps.filter((x) => x.won).length, sl: ps.filter((x) => !x.won).length };
}

/** At the start of a season: a page for a duo (or Big Three) of friends the season it forms, and a
 * line when his rival classmate's team is on the schedule. */
export function meetFriends(s: GameState): void {
  const bonds = friendBonds(s);
  const fresh = bonds.filter((b) => b.formed === s.year);
  if (fresh.length) {
    const team = myTeam(s)?.name ?? 'his team';
    const big = bonds.length > 1;
    pushMoment(s, {
      kind: 'event',
      title: big ? 'A Big Three of friends' : 'A duo of friends',
      duo: true,
      color: '#2F9E44',
      text: `${bonds.map((b) => b.name).join(' and ')} ${bonds.length > 1 ? 'are' : 'is'} on the ${team} too. Friends from the draft class, on one team: ${big ? 'a Big Three' : 'a duo'} from day one.`,
      lines: [big ? 'A Big Three bonus to team strength' : 'A duo bonus to team strength', 'It lasts while you play on the same team'],
    });
  }
  const r = rivalTeam(s);
  if (r) note(s, `${r.f.pn} (${r.f.name}), your rival from the draft class, plays for the ${r.team.name}: a rival night this season.`);
}
