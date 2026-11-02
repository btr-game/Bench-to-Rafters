// Rival nights (round 35, owner: "each user can send a rivalry to one other, and if they accept,
// they become draft rivals. their dynamics when they meet should be more deliberate"). Once a
// season, when he and his rival classmate are in the NBA on different teams, their meeting is a
// turning point of its own, never a line in the box scores: how he plays it, both players' nights
// and the score, and a record of their meetings kept with the career (career/friends.ts). The
// rival's strength is his own copy of the league's: his rating from his latest season line.

import { chance, clamp, range, type Rng } from '../rng';
import type { GameState, Stage } from '../types';
import { adjust, userOvr } from '../career/common';
import { rivalTeam } from '../career/friends';
import { perGame } from '../sim/statModel';
import type { EventChoice, EventDef } from './defs';

const NBA: Stage[] = ['NBA'];
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));

/** His team's chance tonight: the two teams, then the two players, then how he plays it. */
function odds(s: GameState, edge: number): number {
  const r = rivalTeam(s);
  const mine = s.nba?.teams.find((t) => t.id === s.teamId);
  if (!r || !mine) return 0.5;
  return clamp(0.5 + (mine.strength - r.team.strength) * 0.03 + (userOvr(s) - r.line.ovr) * 0.012 + edge, 0.15, 0.85);
}

/** His points a game this season so far (or last season's, early on). */
function ppg(s: GameState): number {
  const g = s.season?.games ?? [];
  const pts = g.reduce((t, x) => t + (x.line?.pts ?? 0), 0);
  const gp = g.filter((x) => x.line && x.line.min > 0).length;
  if (gp >= 3) return pts / gp;
  const last = s.history[s.history.length - 1];
  return last ? perGame(last.line, 'pts') : 10;
}

/** One rival night, played out: who won, both players' points, the score. */
function play(s: GameState, rng: Rng, how: string, edge: number, myBoost: number, hisCut: number): { won: boolean; me: number; him: number; score: string } {
  const r = rivalTeam(s)!;
  const won = chance(rng, odds(s, edge));
  const me = Math.max(2, Math.round(ppg(s) * (myBoost + range(rng, -0.3, 0.35))));
  const him = Math.max(2, Math.round(r.line.pts * (1 - hisCut + range(rng, -0.3, 0.35))));
  const a = Math.round(range(rng, 98, 122));
  const margin = Math.max(1, Math.round(range(rng, 1, 16)));
  const score = won ? `${a}–${a - margin}` : `${a - margin}–${a}`;
  (s.mp!.meets ??= []).push({ year: s.year, won, me, him, score, how });
  if (s.mp!.meets.length > 30) s.mp!.meets.shift();
  return { won, me, him, score };
}

const choices = (s: GameState): EventChoice[] => {
  const r = rivalTeam(s);
  const his = r ? r.f.pn : 'him';
  return [
    {
      label: `Guard ${his} yourself, every possession`,
      detail: 'Your defense against his night; a loss stings more',
      shownOdds: Math.round(odds(s, 0.02) * 100) / 100,
      resolve: (t, rng) => {
        const g = play(t, rng, 'guarded him', 0.02, 0.9, 0.25);
        if (g.won) {
          morale(t, 4);
          rep(t, 2);
          return { outcome: `You took ${his} yourself and held him to ${g.him}. ${g.score}, and the handshake was short.`, log: `Rival night: guarded ${his}, held him to ${g.him}, won ${g.score}.` };
        }
        morale(t, -4);
        return { outcome: `You chased ${his} all night and he still found ${g.him}. ${g.score}. The group chat already knows.`, log: `Rival night: guarded ${his}, he scored ${g.him}, lost ${g.score}.` };
      },
    },
    {
      label: 'Outscore him',
      detail: 'Your shots against his; the most fun, the widest swing',
      shownOdds: Math.round(odds(s, 0) * 100) / 100,
      resolve: (t, rng) => {
        const g = play(t, rng, 'went at him', 0, 1.3, 0);
        const beat = g.me > g.him;
        if (g.won) {
          morale(t, beat ? 5 : 3);
          rep(t, beat ? 3 : 1);
          return { outcome: `${g.me} for you, ${g.him} for ${his}, and the win: ${g.score}. ${beat ? 'The highlight goes straight to the class.' : 'He had the better line; you have the win.'}`, log: `Rival night: ${g.me} to ${his}'s ${g.him}, won ${g.score}.` };
        }
        morale(t, beat ? -1 : -3);
        rep(t, beat ? 1 : 0);
        return { outcome: `${g.me} for you, ${g.him} for ${his}. ${g.score} the wrong way. ${beat ? 'You won the duel and lost the game.' : 'He won both.'}`, log: `Rival night: ${g.me} to ${his}'s ${g.him}, lost ${g.score}.` };
      },
    },
    {
      label: 'Play it like any other night',
      detail: 'The team plan, no extra shots; the coach likes it',
      shownOdds: Math.round(odds(s, 0.01) * 100) / 100,
      resolve: (t, rng) => {
        const g = play(t, rng, 'played the team game', 0.01, 1, 0.05);
        trust(t, 2);
        if (g.won) {
          morale(t, 2);
          return { outcome: `No speeches, no extra shots: ${g.me} points in the flow, ${g.score}. ${his} had ${g.him}.`, log: `Rival night: played the team game, won ${g.score}.` };
        }
        morale(t, -2);
        return { outcome: `${g.score}. You stuck to the plan; ${his} did not, and it worked for him tonight (${g.him}).`, log: `Rival night: played the team game, lost ${g.score}.` };
      },
    },
  ];
};

export const FRIEND_EVENTS: EventDef[] = [
  {
    id: 'rivalNight',
    stages: NBA,
    phase: 'mid',
    // never drawn at random: the season queues it (events/resolver.ts queueMidseasonEvents)
    weight: 0,
    cooldownSeasons: 1,
    when: (s) => !!rivalTeam(s) && !s.mp?.meets?.some((m) => m.year === s.year),
    title: 'Rival night',
    text: (s) => {
      const r = rivalTeam(s)!;
      const rec = s.mp?.meets ?? [];
      const w = rec.filter((m) => m.won).length;
      return `The ${r.team.name} are in town, and so is ${r.f.pn}, ${r.f.name}’s player, your rival from the draft class. ${rec.length ? `You are ${w}–${rec.length - w} against him.` : 'Your first meeting.'} He is rated ${r.line.ovr}${r.line.projected ? ' (as of last season)' : ''} and scores ${r.line.pts} a night. How do you play it?`;
    },
    choices,
  },
];
