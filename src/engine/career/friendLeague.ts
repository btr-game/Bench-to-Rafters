// Friends in each other's leagues (round 35, owner: "yup" to "classmates show up in your box
// scores, MVP races and All-Star rosters"). A classmate's player lives in this league only through
// the career's copy of his season lines (career/friends.ts friendNow). On his NBA team for this
// season, he
// - has a line in the box score of every game against his team, and of every game with him on
//   your team, drawn around his averages (friendGame);
// - lifts his team a little in the games against you, since its roster here was generated without
//   him (FRIEND_LEAGUE.nudge);
// - runs for the season's awards with his season's numbers, so he can finish above or below you
//   in the MVP race, and win it (friendCandidates);
// - can be voted onto an All-Star team (friendAllStars).
// Nothing here draws from the career's random stream. His box lines come from a stream of their
// own, seeded by the career, the season, the game and the friend, so the same copy gives the same
// career; and a career with no friends never gets past the first line of any of it.

import { FAN_VOTE, FRIEND_LEAGUE as F, VALUE } from '../balance';
import { palsOn } from './friends';
import { clamp, makeRng, next, normal, type Rng } from '../rng';
import type { FriendGame, FriendLine, GameState, League, StatLine, Team } from '../types';
import type { FriendCandInput } from '../awards/awards';
import { valuePerGame } from '../sim/statModel';
import { friendName, friendNow } from './friends';

type Line = FriendLine['seasons'][number] & { projected?: boolean };

/** Classmates on an NBA team this season, with that season's line (or last season's). */
function inLeague(s: GameState): { f: FriendLine; line: Line }[] {
  if (!palsOn(s) || !s.mp?.friends?.length) return [];
  return s.mp.friends.flatMap((f) => {
    const line = friendNow(f, s.year);
    return line && line.lv === 'NBA' ? [{ f, line }] : [];
  });
}

/** A stream of its own for one classmate in one game (FNV-1a over the parts). */
function streamFor(...parts: (string | number)[]): Rng {
  let h = 2166136261;
  const key = parts.join('|');
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return makeRng(h >>> 0);
}

/** His season as a stat line over `gp` games: his points, rebounds and assists, and what the
 * line does not carry at a regular starter's rates, shooting at the league's average. */
export function friendStatLine(line: Line, gp: number): StatLine {
  const pts = Math.round(line.pts * gp);
  const tsa = pts / (2 * VALUE.effAvgTs);
  const fga = Math.round(tsa / (1 + 0.44 * F.ftPerFga));
  const fta = Math.round(fga * F.ftPerFga);
  const ftm = Math.round(fta * F.ftp);
  const tpa = Math.round(fga * F.threeShare);
  const tpm = Math.min(tpa, Math.round(tpa * F.p3));
  const twos = Math.max(0, Math.round((pts - ftm - 3 * tpm) / 2));
  return {
    gp,
    gs: gp,
    min: Math.round(F.min * gp),
    pts,
    reb: Math.round((line.reb ?? 0) * gp),
    ast: Math.round((line.ast ?? 0) * gp),
    stl: Math.round(F.stl * gp),
    blk: Math.round(F.blk * gp),
    tov: Math.round(F.tovPerPt * pts),
    fgm: Math.min(fga, twos + tpm),
    fga,
    tpm,
    tpa,
    ftm,
    fta,
  };
}

/** What a classmate on the floor adds to his team against you. */
const lift = (line: Line): number => Math.max(0, (line.ovr - F.nudge.from) * F.nudge.per);

/** The lift of all the classmates on a team, when they all play (a playoff series). */
export function friendNudge(s: GameState, team: Team): number {
  const sum = inLeague(s).filter((x) => x.line.team === team.name).reduce((t, x) => t + lift(x.line), 0);
  return Math.min(F.nudge.max, sum);
}

/** One number around his average: the spread a share of it, never under the floor. */
function around(r: Rng, avg: number, [share, floor]: [number, number]): number {
  return Math.max(0, Math.round(normal(r, avg, Math.max(floor, avg * share))));
}

/**
 * The classmates in one of his NBA games: each one's line (on the other team, or his), and the
 * lift the ones on the other team give it. In the regular season a classmate sits out about as
 * often as his games played say; in the postseason he always plays. `rival` takes a share off
 * one classmate's scoring (a rival series, career/rivalSeries.ts), whose points come back too.
 */
export function friendGame(s: GameState, mine: Team, opp: Team, n: number, post: string | undefined, rival?: { id: string; by: number }): { box: FriendGame[]; nudge: number; rival: number | null } {
  const box: FriendGame[] = [];
  let nudge = 0;
  let rivalPts: number | null = null;
  for (const { f, line } of inLeague(s)) {
    const mate = line.team === mine.name;
    if (!mate && line.team !== opp.name) continue;
    const gp = line.gp ?? F.gp;
    if (gp <= 0) continue;
    const r = streamFor(s.seed, s.year, post ?? 'season', n, f.id);
    if (!post && next(r) >= Math.min(1, gp / F.games)) continue;
    const by = rival?.id === f.id ? rival.by : 0;
    box.push({
      pn: f.pn,
      name: f.name,
      pts: around(r, line.pts * (1 - by), F.box.pts),
      ...(line.reb !== undefined ? { reb: around(r, line.reb, F.box.reb) } : {}),
      ...(line.ast !== undefined ? { ast: around(r, line.ast, F.box.ast) } : {}),
      ...(mate ? { mate: true } : {}),
    });
    if (!mate) nudge += lift(line);
    if (rival?.id === f.id) rivalPts = box[box.length - 1].pts;
  }
  return { box, nudge: Math.min(F.nudge.max, nudge), rival: rivalPts };
}

/** His fan vote, from his rating. */
const repOf = (line: Line): number => clamp((line.ovr - F.repFrom) * F.repPer, 0, 100);

/**
 * Classmates as award candidates in this league. For the voting at the end of the season his
 * season's games count; for the race so far (`soFar`), his share of the games his team has played
 * here. A rookie is a classmate with no NBA season before this one; last season's value (Most
 * Improved) is his NBA line the season before.
 */
export function friendCandidates(s: GameState, league: League, soFar = false): FriendCandInput[] {
  const out: FriendCandInput[] = [];
  for (const { f, line } of inLeague(s)) {
    const team = league.teams.find((t) => t.name === line.team);
    if (!team) continue;
    const full = line.gp ?? F.gp;
    const gp = soFar ? Math.round(Math.min(1, full / F.games) * (team.w + team.l)) : full;
    if (gp <= 0) continue;
    // a line carried over from last season says he plays as he did then: no rookie, and nothing
    // to measure an improvement against
    const prev = line.projected ? undefined : f.seasons.find((x) => x.year === s.year - 1 && x.lv === 'NBA');
    out.push({
      id: f.id,
      name: friendName(f),
      teamId: team.id,
      line: friendStatLine(line, gp),
      rep: repOf(line),
      rookie: !line.projected && !f.seasons.some((x) => x.lv === 'NBA' && x.year < s.year),
      prevValue: prev ? valuePerGame(friendStatLine(prev, prev.gp ?? F.gp)) : null,
      age: s.player.age,
      ovr: line.ovr,
    });
  }
  return out;
}

/**
 * The All-Star vote at midseason (sim/tournaments.ts): `vals` are the vote scores of his
 * conference, `mine` his own. A classmate in his conference stands in the same vote and can take a
 * place ahead of him; one in the other conference makes it when he would have made it in this one
 * (the other conference's vote is not drawn, since that would take from the career's random
 * stream). Returns how many classmates finished ahead of him and who was picked.
 */
export function friendAllStars(s: GameState, league: League, conf: string | undefined, vals: number[], mine: number): { ahead: number; picked: string[] } {
  const half = Math.round(F.games / 2);
  const cands = friendCandidates(s, league).flatMap((c) => {
    const team = league.teams.find((t) => t.id === c.teamId)!;
    const gp = Math.round(Math.min(1, c.line.gp / F.games) * half);
    if (gp < 15) return [];
    return [{ c, team, score: (1 - FAN_VOTE.share) * valuePerGame(c.line) + FAN_VOTE.share * (c.rep / 100) * FAN_VOTE.scale }];
  });
  const line12 = [...vals].sort((a, b) => b - a)[11] ?? 0;
  const here = cands.filter((x) => x.team.conf === conf);
  const picked: string[] = [];
  for (const x of cands) {
    const rank =
      x.team.conf === conf
        ? 1 + vals.filter((v) => v > x.score).length + (mine > x.score ? 1 : 0) + here.filter((y) => y.score > x.score).length
        : x.score > line12
          ? 1
          : 13;
    if (rank <= 12) picked.push(`${x.c.name} of the ${x.team.name}`);
  }
  return { ahead: here.filter((x) => x.score > mine).length, picked };
}
