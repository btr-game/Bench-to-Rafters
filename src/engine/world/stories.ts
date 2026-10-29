// League storylines (playtest round 9: "other teams feel so distant"). Every season the league
// around him gets a few running stories, at every level, and the bigger ones change the league:
// - Superteam (NBA): two stars force their way to a contender; real players really move.
// - Underdog: a young team at the bottom grows up overnight (team strength +2 this season).
// - Rival: the team that knocked him out last time, or the best team he has to get past.
//   His head-to-head record is kept, and a playoff meeting is billed as a grudge match.
// - Dynasty (NBA): last year's champion goes for a repeat. Last dance: an old contender's
//   final run. Tank: a team gives up on the season (strength -1.5). Favorite: the team to beat.
// Each story has a status at midseason and a verdict once the postseason is over.

import { chance, pick, shuffle } from '../rng';
import type { Bracket, GameState, League, Team } from '../types';
import { standings } from '../sim/leagueSim';
import { nbaStrength } from './nbaWorld';
import { logDecision, pushMoment } from '../career/common';

export type StoryKind = 'superteam' | 'underdog' | 'rival' | 'dynasty' | 'lastdance' | 'tank' | 'favorite';

export interface LeagueStory {
  kind: StoryKind;
  teamId: string;
  title: string;
  text: string;
  status?: string;
  result?: string;
  vs?: { w: number; l: number }; // his record against this team (rivals)
}

export const STORY_LABEL: Record<StoryKind, string> = {
  superteam: 'Superteam',
  underdog: 'Underdog',
  rival: 'Rival',
  dynasty: 'Dynasty',
  lastdance: 'Last dance',
  tank: 'Tanking',
  favorite: 'The favorite',
};

export const STORY = { underdog: 2, tank: -1.5, superteamFrom: 78 };

const ranked = (lg: League): Team[] => [...lg.teams].sort((a, b) => b.strength - a.strength);

/** For this season only: NBA strength is recomputed from the roster every summer. */
function addStrength(t: Team, d: number): void {
  t.strength += d;
}

/** Two stars from bottom-half teams join a contender; his 6th and 7th men go the other way. */
function formSuperteam(s: GameState, lg: League, mine: string | null): LeagueStory | null {
  const order = ranked(lg);
  const half = Math.floor(order.length / 2);
  const hosts = order.slice(2, 10).filter((t) => t.id !== mine);
  const donors = order.slice(half).filter((t) => t.id !== mine && t.roster[0] && t.roster[0].ovr >= STORY.superteamFrom);
  if (hosts.length === 0 || donors.length < 2) return null;
  const host = pick(s.rng, hosts);
  const [d1, d2] = shuffle(s.rng, donors).slice(0, 2);
  const stars = [d1.roster[0], d2.roster[0]];
  host.roster.sort((a, b) => b.ovr - a.ovr);
  const going = host.roster.slice(5, 7);
  if (going.length < 2) return null;
  [d1, d2].forEach((d, i) => {
    d.roster = d.roster.filter((p) => p.id !== stars[i].id);
    going[i].teamId = d.id;
    d.roster.push(going[i]);
    d.roster.sort((a, b) => b.ovr - a.ovr);
    d.strength = nbaStrength(d);
  });
  host.roster = host.roster.filter((p) => !going.includes(p));
  for (const st of stars) {
    st.teamId = host.id;
    st.contractYears = Math.max(st.contractYears, 2);
    host.roster.push(st);
  }
  host.roster.sort((a, b) => b.ovr - a.ovr);
  const before = host.strength;
  host.strength = nbaStrength(host);
  return {
    kind: 'superteam',
    teamId: host.id,
    title: `Superteam in ${host.short}`,
    text: `${stars[0].name} (from the ${d1.short}) and ${stars[1].name} (from the ${d2.short}) both force their way to the ${host.name}. Next to ${host.roster.find((p) => !stars.includes(p))?.name ?? 'their star'}, that is three stars on one roster. Team strength ${before.toFixed(1)} to ${host.strength.toFixed(1)}.`,
  };
}

/** The season's storylines, set when the season begins. */
export function startStories(s: GameState, lg: League): void {
  const mine = lg.userTeamId;
  const order = ranked(lg);
  const n = order.length;
  const stories: LeagueStory[] = [];
  const taken = new Set<string>(mine ? [mine] : []);
  const add = (st: LeagueStory | null) => {
    if (st && !taken.has(st.teamId)) {
      stories.push(st);
      taken.add(st.teamId);
    }
  };
  const nba = lg.level === 'NBA';
  if (nba && chance(s.rng, 0.55)) add(formSuperteam(s, lg, mine));
  // the defending champion
  const last = s.nbaHistory[s.nbaHistory.length - 1];
  const champ = nba && last && last.year === s.year - 1 ? lg.teams.find((t) => t.name === last.champion) : undefined;
  if (champ && !taken.has(champ.id)) {
    const repeats = s.nbaHistory.slice().reverse().findIndex((h) => h.champion !== champ.name);
    const titles = repeats < 0 ? s.nbaHistory.length : repeats;
    add({ kind: 'dynasty', teamId: champ.id, title: titles >= 2 ? `${champ.short} go for ${titles + 1} straight` : `${champ.short} defend the title`, text: titles >= 2 ? `${titles} titles in a row. Everyone else is chasing the ${champ.name}.` : `Last year's champions, the ${champ.name}, bring most of the roster back.` });
  }
  // the rival: who knocked him out last time, or the best team in his way
  const myTeam = lg.teams.find((t) => t.id === mine);
  const nemesis = s.flags.nemesisYear === s.year - 1 ? lg.teams.find((t) => t.id === s.nemesis) : undefined;
  const rival = nemesis ?? (myTeam ? order.find((t) => t.id !== mine && (t.conf === myTeam.conf || !t.conf)) : undefined);
  if (rival && myTeam) {
    add({
      kind: 'rival',
      teamId: rival.id,
      title: nemesis ? `Revenge on the ${rival.short}` : `The ${rival.short} stand in the way`,
      text: nemesis ? `The ${rival.name} ended your season last year. Every meeting this year has a little extra on it.` : `The ${rival.name} are the best team in your way. Beat them and the road opens up.`,
      vs: { w: 0, l: 0 },
    });
  }
  // the team to beat (when nobody else has it)
  const fav = order.find((t) => !taken.has(t.id));
  if (fav && !stories.some((x) => x.kind === 'dynasty' || x.kind === 'superteam')) add({ kind: 'favorite', teamId: fav.id, title: `${fav.short}: the team to beat`, text: `Everyone picks the ${fav.name}. The deepest roster in the league on paper.` });
  // an underdog with a young core
  const low = order.slice(Math.floor(n * 0.6)).filter((t) => !taken.has(t.id));
  if (low.length > 0) {
    const u = pick(s.rng, low);
    addStrength(u, STORY.underdog);
    add({ kind: 'underdog', teamId: u.id, title: `The ${u.short} grow up`, text: `Nobody picked the ${u.name} for anything. Their young players spent the summer together in the gym, and it shows.` });
  }
  if (nba) {
    // an old contender's final run, and a team that gives up
    const old = order.slice(0, 10).find((t) => !taken.has(t.id) && t.roster.slice(0, 3).every((p) => p.age >= 30));
    if (old) add({ kind: 'lastdance', teamId: old.id, title: `Last dance in ${old.short}`, text: `The ${old.name}'s core is on the wrong side of 30. Everyone knows this is the last run.` });
    const bottom = order.slice(n - 5).filter((t) => !taken.has(t.id));
    if (bottom.length && chance(s.rng, 0.6)) {
      const tk = pick(s.rng, bottom);
      addStrength(tk, STORY.tank);
      add({ kind: 'tank', teamId: tk.id, title: `The ${tk.short} tank`, text: `The ${tk.name} trade their veterans for picks and play the kids. The lottery is the goal.` });
    }
  }
  s.stories = stories;
  if (nba && stories.length) {
    pushMoment(s, { kind: 'event', title: 'Around the league', color: '#2A2F36', text: 'The storylines everyone is talking about before the season.', lines: stories.map((x) => `${STORY_LABEL[x.kind]}: ${x.title}`) });
  }
}

const rec = (lg: League, t: Team): string => {
  const conf = t.conf ? standings(lg.teams.filter((x) => x.conf === t.conf)).indexOf(t) + 1 : standings(lg.teams).indexOf(t) + 1;
  return `${t.w}–${t.l}, ${conf}${conf === 1 ? 'st' : conf === 2 ? 'nd' : conf === 3 ? 'rd' : 'th'}${t.conf ? ` in the ${t.conf}` : ''}`;
};

/** His record against a team, from this season's games. */
function headToHead(s: GameState, t: Team): { w: number; l: number } {
  const all = [...(s.season?.games ?? []), ...(s.season?.postGames ?? [])].filter((g) => g.opp === t.short && g.post !== 'G League');
  return { w: all.filter((g) => g.res === 'W').length, l: all.filter((g) => g.res === 'L').length };
}

/** Midseason: how each story is going. */
export function updateStories(s: GameState, lg: League): void {
  for (const st of s.stories ?? []) {
    const t = lg.teams.find((x) => x.id === st.teamId);
    if (!t) continue;
    st.status = rec(lg, t);
    if (st.kind === 'rival') st.vs = headToHead(s, t);
  }
}

/** How far a team went in the postseason. */
export function reached(b: Bracket | null, id: string): { text: string; depth: number } {
  if (!b) return { text: 'no postseason', depth: -1 };
  if (b.champion === id) return { text: 'won it all', depth: 99 };
  for (let i = b.rounds.length - 1; i >= 0; i--) {
    const sr = b.rounds[i].series.find((x) => x.a === id || x.b === id);
    if (sr) return { text: i === b.rounds.length - 1 ? 'lost in the final' : `out in the ${b.rounds[i].name.toLowerCase()}`, depth: i };
  }
  return { text: 'missed the postseason', depth: -1 };
}

/** After the postseason: a verdict on every story, and next year's grudge. */
export function finishStories(s: GameState, lg: League): void {
  const b = lg.bracket;
  const mine = lg.userTeamId;
  updateStories(s, lg);
  const deep = b ? b.rounds.length - 2 : 0;
  for (const st of s.stories ?? []) {
    const t = lg.teams.find((x) => x.id === st.teamId);
    if (!t) continue;
    const r = reached(b, t.id);
    const verdict: Record<StoryKind, () => string> = {
      superteam: () => (r.depth === 99 ? 'It worked: the superteam won it all.' : r.depth >= deep ? `Close, but no ring: ${r.text}.` : `A flop: ${r.text}.`),
      underdog: () => (r.depth >= 1 ? `A Cinderella run: ${r.text}.` : r.depth >= 0 ? 'They made the postseason. Nobody saw that coming.' : `${t.w}–${t.l}: better, but not there yet.`),
      rival: () => {
        const v = st.vs ?? { w: 0, l: 0 };
        return `${v.w + v.l > 0 ? `You went ${v.w}–${v.l} against them` : 'You never got a shot at them'}. They ${r.text}.`;
      },
      dynasty: () => (r.depth === 99 ? 'They did it again.' : `The run is over: ${r.text}.`),
      lastdance: () => (r.depth === 99 ? 'One last ring for the old guys.' : `The window closes: ${r.text}.`),
      tank: () => `${t.w}–${t.l}. Mission accomplished, if you can call it that.`,
      favorite: () => (r.depth === 99 ? 'They lived up to it.' : `Not this year: ${r.text}.`),
    };
    st.result = verdict[st.kind]();
  }
  // whoever ended his season becomes next year's grudge
  if (b && mine && b.champion !== mine) {
    for (let i = b.rounds.length - 1; i >= 0; i--) {
      const sr = b.rounds[i].series.find((x) => x.a === mine || x.b === mine);
      if (sr) {
        s.nemesis = sr.winner;
        s.flags.nemesisYear = s.year;
        const t = lg.teams.find((x) => x.id === sr.winner);
        if (t && lg.level === 'NBA') logDecision(s, 'rival', `Knocked out by the ${t.name}.`, t.id);
        break;
      }
    }
  }
}

