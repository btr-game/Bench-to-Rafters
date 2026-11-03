// A playoff series against the rival classmate (round 35, owner: "sounds cool" to "if your teams
// meet in the playoffs, a whole series with higher stakes"). When his team meets his rival
// classmate's team in an NBA playoff series (the play-in is one game, not a series), the
// postseason stops before game 1 for a turning point of its own: how he plays the whole series.
// - The call holds for every game of it (RIVAL_SERIES in balance.ts): his shots, an edge in team
//   strength, his rival's scoring, and for the duel a series that swings with his form.
// - Each call shows its risk from the chance to win the series: the chance of a game, with the
//   call's edge, carried over a best of seven.
// - When the series ends, a page names both players with their points a game, the call pays out
//   in morale, reputation and coach trust, and the series goes into the record of their meetings
//   (s.mp.meets, with the round).
// It lives inside the postseason's replay (career/live.ts): the call is a pick like a game's, so it
// is asked the same way whether the games are played by hand or simulated (season.ts replays a
// simulated postseason too when a rival series can come up), and the same picks give the same
// series.

import { RIVAL_SERIES as R } from '../balance';
import { clamp } from '../rng';
import type { GameState, StatLine, Team } from '../types';
import { winProb, type SeriesCtx } from '../sim/leagueSim';
import { nextPick, type LiveRequest } from './live';
import { adjust, logDecision, pushMoment, teamById } from './common';
import { friendName, rivalTeam } from './friends';
import { friendNudge } from './friendLeague';

type Call = 'guard' | 'duel' | 'team';
const CALLS: Call[] = ['guard', 'duel', 'team'];
// how the record of their meetings says it, as for a rival night (events/friends.ts)
const HOW: Record<Call, string> = { guard: 'guarded him', duel: 'went at him', team: 'played the team game' };

/** Can this postseason bring a rival series? (season.ts then replays it even when simulated.) */
export const rivalSeriesPossible = (s: GameState): boolean => s.season?.level === 'NBA' && !!rivalTeam(s);

/** The chance to win a best-of-n series at `p` a game, home court left out. */
export function seriesOdds(p: number, bestOf: number): number {
  const need = Math.ceil(bestOf / 2);
  let total = 0;
  // he wins the last game, after need - 1 wins and k losses in any order
  for (let k = 0, ways = 1; k < need; k++, ways = (ways * (need - 1 + k)) / k) total += ways * p ** need * (1 - p) ** k;
  return total;
}

const riskOf = (p: number): 'Low' | 'Medium' | 'High' => (p >= 0.6 ? 'Low' : p >= 0.4 ? 'Medium' : 'High');
const where = (round: string): string => (round === 'NBA Finals' ? 'the NBA Finals' : `the ${round.toLowerCase()}`);

/**
 * Before a playoff game: at game 1 of a series against his rival classmate's team, the call for
 * the whole series. `my` is his team's strength in a playoff game with him on the floor, as the
 * season's hook (career/season.ts) reckons it.
 */
export function askRivalSeries(s: GameState, opp: Team, round: string, home: boolean, series: SeriesCtx | undefined, my: number): void {
  const L = s.live;
  if (!L || L.shot || L.rival || !series || series.game !== 1 || series.bestOf < 2) return;
  const r = rivalTeam(s);
  if (!r || r.team.id !== opp.id) return;
  const them = opp.strength + friendNudge(s, opp);
  const odds = (c: Call) => seriesOdds(winProb(my + R[c].edge, them, 0), series.bestOf);
  const rec = s.mp?.meets ?? [];
  const w = rec.filter((m) => m.won).length;
  const his = r.f.pn;
  const req: LiveRequest = {
    stage: 'rival',
    title: `Rival series · ${round}`,
    text: `The ${opp.name} stand between you and ${round === 'NBA Finals' ? 'the title' : 'the next round'}, and so does ${friendName(r.f)}, your rival from the draft class. ${rec.length ? `You are ${w}–${rec.length - w} against him.` : 'Your first meeting.'} He is rated ${r.line.ovr}${r.line.projected ? ' (as of last season)' : ''} and scores ${r.line.pts} a night. Best of ${series.bestOf}: how do you play the series?`,
    round,
    opp: opp.name,
    home,
    game: 1,
    bestOf: series.bestOf,
    wins: 0,
    losses: 0,
    quarter: 0,
    us: 0,
    them: 0,
    qs: [],
    line: null,
    recent: L.recent.slice(-3),
    choices: [
      { id: 'guard', label: `Guard ${his} yourself, all series`, detail: 'Your defense against his series: fewer shots for you, and a loss stings more', risk: riskOf(odds('guard')) },
      { id: 'duel', label: 'Outscore him', detail: 'Your shots against his: the most fun, and the series swings with your form', risk: riskOf(odds('duel')) },
      { id: 'team', label: 'Play it like any other series', detail: 'The team plan, no extra shots; the coach likes it', risk: riskOf(odds('team')) },
    ],
  };
  const pick = nextPick(s, req) as Call;
  L.rival = { key: `${round}|${opp.id}`, round, how: CALLS.includes(pick) ? pick : 'team', gp: 0, me: 0, hisGp: 0, him: 0 };
}

/** The call's numbers for this game, when it is a game of the rival series; with the rival's id. */
export function rivalSeriesFx(s: GameState, round: string | undefined, opp: Team): ((typeof R)[Call] & { id: string }) | null {
  const x = s.live?.rival;
  return x && s.mp?.rival && x.key === `${round}|${opp.id}` ? { ...R[x.how], id: s.mp.rival } : null;
}

/** After a game of the rival series: both players' points, and once it is over, what it came to.
 * `his` is the rival's points tonight, or null when he did not play. */
export function rivalSeriesGame(s: GameState, round: string | undefined, opp: Team, series: SeriesCtx | undefined, won: boolean, line: StatLine | null, his: number | null): void {
  const x = s.live?.rival;
  if (!x || !series || x.key !== `${round}|${opp.id}`) return;
  if (line && line.min > 0) {
    x.gp++;
    x.me += line.pts;
  }
  if (his !== null) {
    x.hisGp++;
    x.him += his;
  }
  const need = Math.ceil(series.bestOf / 2);
  const w = series.wins + (won ? 1 : 0);
  const l = series.losses + (won ? 0 : 1);
  if (w >= need || l >= need) finish(s, opp, x, w, l);
}

function finish(s: GameState, opp: Team, x: NonNullable<NonNullable<GameState['live']>['rival']>, w: number, l: number): void {
  const r = rivalTeam(s);
  const mine = teamById(s.nba, s.teamId);
  const pn = r?.f.pn ?? 'your rival';
  const won = w > l;
  const c = R[x.how];
  const me = x.gp ? Math.round((x.me / x.gp) * 10) / 10 : 0;
  const him = x.hisGp ? Math.round((x.him / x.hisGp) * 10) / 10 : 0;
  const beat = x.gp > 0 && me > him;
  const morale = (won ? c.won[0] : c.lost[0]) + (beat ? c.outscored[0] : 0);
  const rep = (won ? c.won[1] : c.lost[1]) + (beat ? c.outscored[1] : 0);
  const p = s.player;
  p.morale = adjust(p.morale, morale);
  p.rep = clamp(p.rep + rep, 0, 100);
  if (c.trust) p.trust = adjust(p.trust, c.trust);
  (s.mp!.meets ??= []).push({ year: s.year, won, me, him, score: `${w}–${l}`, how: HOW[x.how], series: x.round });
  if (s.mp!.meets.length > 30) s.mp!.meets.shift();
  const head = won ? `The ${mine?.name ?? 'your team'} beat the ${opp.name} ${w}–${l} in ${where(x.round)}.` : `The ${opp.name} beat the ${mine?.name ?? 'your team'} ${l}–${w} in ${where(x.round)}.`;
  const how =
    x.how === 'guard'
      ? won
        ? `You took ${pn} yourself every night and held him to ${him} a game.`
        : `You chased ${pn} all series and he still found ${him} a game.`
      : x.how === 'duel'
        ? `${me} a game for you, ${him} for ${pn}. ${won ? (beat ? 'The duel and the series: the class will not hear the end of it.' : 'He won the duel; you have the series.') : beat ? 'You won the duel and lost the series.' : 'He won both.'}`
        : won
          ? `No speeches, no extra shots: ${me} a game in the flow, and the series. ${pn} had ${him}.`
          : `You stuck to the plan; ${pn} did not, and it worked for him (${him} a game).`;
  const sign = (v: number) => (v > 0 ? `+${v}` : `${v}`);
  pushMoment(s, {
    kind: 'event',
    title: won ? 'Rival series won' : 'Rival series lost',
    color: (won ? mine?.color : opp.color) ?? '#2F9E44',
    teamName: won ? mine?.name : opp.name,
    text: `${head} ${how}`,
    lines: [`${p.name}: ${me} points a game · ${r ? friendName(r.f) : pn}: ${him}`,`Morale ${sign(morale)}`, ...(rep ? [`Reputation ${sign(rep)}`] : []), ...(c.trust ? [`Coach trust ${sign(c.trust)}`] : [])],
  });
  logDecision(s, 'event', `Rival series, ${x.round}: ${HOW[x.how]}; ${won ? 'won' : 'lost'} ${w}–${l}, ${me} to ${pn}'s ${him} a game.`);
  s.live?.recent.push(`Rival series: ${won ? 'won' : 'lost'} ${w}–${l} against ${pn}`);
}
