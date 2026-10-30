// Rivals (round 25, the owner: not necessarily the same draft class, Bird and Magic were not; in
// levels). One rival at a time, and the rivalry only ever grows:
// 1. draft: in his first NBA season, the best rookie at his position group, a race for Rookie of
//    the Year and for who becomes better;
// 2. starter: once he starts, the best player at his position on a rival team (the real NBA
//    rivalries first), the man he meets head to head;
// 3. mvp: once he is in MVP races, whoever keeps beating him for the big awards, the long war.
// Each NBA season adds the head-to-head games between their teams, both OVRs and a line on what
// happened between them.

import { RIVALS } from '../../content/teams';
import { userOvr } from './common';
import type { GameState, GenPlayer, Pos, Rivalry, Team } from '../types';

const GROUP: Record<Pos, string> = { PG: 'g', SG: 'g', SF: 'w', PF: 'b', C: 'b' };
const LEVEL_ORDER: Rivalry['level'][] = ['draft', 'starter', 'mvp'];

/** Where a generated player is now, if he is still in the league. */
function find(s: GameState, pid: number): { p: GenPlayer; t: Team } | null {
  for (const t of s.nba?.teams ?? []) {
    const p = t.roster.find((x) => x.id === pid);
    if (p) return { p, t };
  }
  return null;
}

function start(s: GameState, level: Rivalry['level'], p: GenPlayer, t: Team, why: string): void {
  s.rivalry = { level, pid: p.id, name: p.name, pos: p.pos as Pos, since: s.year, team: t.name, w: 0, l: 0, seasons: [], notes: [why] };
}

/** A candidate for the next level of rivalry, or null. */
function candidate(s: GameState, level: Rivalry['level']): { p: GenPlayer; t: Team; why: string } | null {
  const nba = s.nba;
  if (!nba) return null;
  const me = s.player;
  const ovr = userOvr(s);
  const others = nba.teams.filter((t) => t.id !== s.teamId).flatMap((t) => t.roster.map((p) => ({ p, t })));
  const mine = (p: GenPlayer) => GROUP[p.pos as Pos] === GROUP[me.pos];
  if (level === 'draft') {
    const rookies = others.filter(({ p }) => mine(p) && (p.rookie || (p.draftYear ?? 0) >= s.year - 1));
    const best = rookies.sort((a, b) => b.p.ovr + (b.p.pot ?? 0) * 0.5 - (a.p.ovr + (a.p.pot ?? 0) * 0.5))[0];
    return best ? { ...best, why: `${best.p.name}, the best rookie at your position, came into the league with you.` } : null;
  }
  if (level === 'starter') {
    const myAbbr = nba.teams.find((t) => t.id === s.teamId)?.abbr ?? '';
    const rivalTeams = new Set(RIVALS.filter((r) => r.includes(myAbbr)).map((r) => (r[0] === myAbbr ? r[1] : r[0])));
    const pool = others.filter(({ p }) => p.pos === me.pos && p.ovr >= ovr - 6);
    const score = ({ p, t }: { p: GenPlayer; t: Team }) => (rivalTeams.has(t.abbr) ? 6 : 0) - Math.abs(p.ovr - ovr);
    const best = pool.sort((a, b) => score(b) - score(a))[0];
    return best ? { ...best, why: `${best.p.name} starts at your position for the ${best.t.name}. Every meeting is personal now.` } : null;
  }
  // mvp: the man who keeps beating him for the big awards
  const name = Object.entries(s.rivals).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0]?.[0];
  const hit = name ? others.find(({ p }) => p.name === name) : undefined;
  return hit ? { ...hit, why: `${hit.p.name} has beaten you for the big awards ${s.rivals[name!]} times. This is the rivalry people will remember.` } : null;
}

/** At the end of each NBA season: the rivalry starts, grows, or carries on. */
export function updateRivalry(s: GameState): void {
  if (s.stage !== 'NBA' || !s.nba || !s.season) return;
  const role = s.season.role;
  const r = s.rivalry;
  const lvl = r && !r.ended ? LEVEL_ORDER.indexOf(r.level) : -1;
  // the level he has reached
  const mvpRace = s.history[s.history.length - 1]?.races.find((x) => x.award === 'MVP');
  const want: Rivalry['level'] = mvpRace?.userRank !== null && mvpRace?.userRank !== undefined && mvpRace.userRank <= 5 && Object.values(s.rivals).some((n) => n >= 2) ? 'mvp' : role === 'starter' || role === 'key' ? 'starter' : 'draft';
  for (let k = LEVEL_ORDER.indexOf(want); k > lvl; k--) {
    const c = candidate(s, LEVEL_ORDER[k]);
    if (c && c.p.id !== r?.pid) {
      start(s, LEVEL_ORDER[k], c.p, c.t, c.why);
      break;
    }
    if (c && r && c.p.id === r.pid && k > lvl) {
      r.level = LEVEL_ORDER[k];
      r.notes.push(`${r.name} and you are now ${k === 2 ? 'fighting for MVPs' : 'starting against each other'}.`);
      break;
    }
  }
  const cur = s.rivalry;
  if (!cur || cur.ended) return;
  const at = find(s, cur.pid);
  if (!at) {
    cur.ended = `${cur.name} left the league.`;
    cur.notes.push(cur.ended);
    return;
  }
  cur.team = at.t.name;
  // head to head: every game between their teams this season, playoffs too
  const games = [...s.season.games, ...s.season.postGames].filter((g) => g.opp === at.t.short);
  const w = games.filter((g) => g.res === 'W').length;
  cur.w += w;
  cur.l += games.length - w;
  const me = Math.round(userOvr(s));
  cur.seasons.push({ year: s.year, me, him: Math.round(at.p.ovr) });
  if (cur.seasons.length > 25) cur.seasons.shift();
  const roy = s.history[s.history.length - 1]?.races.find((x) => /Rookie/i.test(x.award));
  if (cur.level === 'draft' && roy && cur.seasons.length === 1) {
    const his = roy.top.findIndex((x) => x.name === cur.name);
    cur.notes.push(roy.userRank === 1 ? `You beat ${cur.name} for Rookie of the Year.` : his === 0 ? `${cur.name} took Rookie of the Year.` : 'Neither of you won Rookie of the Year.');
  } else if (games.length) cur.notes.push(`${s.year}: ${w}–${games.length - w} against him, OVR ${me} to ${Math.round(at.p.ovr)}.`);
  if (cur.notes.length > 12) cur.notes.shift();
}
