// Duos (round 20: "hidden chemistry between the recruit and the user's player that can
// potentially lead to building a duo"). Every teammate he recruits into the starting five
// comes with a hidden spark. Most are just good teammates; about a quarter really click. Each
// season they play together the bond grows (the spark, winning and the coach's trust feed
// it); once it is full they become a named duo:
// - his game: a little more efficient and more assists (DUO.perf, DUO.ast), a few more shots;
// - the team: a chemistry bonus to team strength (DUO.team).
// Both grow as the duo matures. It ends when either of them leaves the team.
// Nothing about the spark is shown; the only clues are the lines in the summer notes.

import { DUO } from '../balance';
import { chance, clamp, normal, pick, range, type Rng } from '../rng';
import type { GameState, GenPlayer, Pos, SeasonRecord } from '../types';
import { logDecision, note, pushMoment, teamById } from './common';

export interface Bond {
  id: number; // GenPlayer id
  name: string;
  pos: Pos;
  spark: number; // hidden, 0-1
  bond: number; // 0-100; a duo at 100
  seasons: number; // seasons played together
  formed?: number; // year the duo formed
  nick?: string;
}

const GROUP: Record<Pos, 'G' | 'W' | 'B'> = { PG: 'G', SG: 'G', SF: 'W', PF: 'B', C: 'B' };

/** A name the papers would give them. */
function nickname(rng: Rng, me: Pos, him: Pos): string {
  const a = GROUP[me];
  const b = GROUP[him];
  const pair = [a, b].sort().join('');
  const names: Record<string, string[]> = {
    GG: ['The Splash Pair', 'Backcourt Fire', 'The Twin Engines'],
    BG: ['Lob City', 'Pick and Pop Inc.', 'Inside Out'],
    GW: ['Fast Break Express', 'The Open-Floor Show', 'Thunder and Lightning'],
    BW: ['The Wrecking Crew', 'Bash Brothers', 'The Long Arms'],
    BB: ['The Twin Towers', 'The Wall', 'Skyscrapers'],
    WW: ['The Wing Brothers', 'Double Trouble', 'The Two-Way Street'],
  };
  return pick(rng, names[pair] ?? names.WW);
}

/** A recruit comes with a hidden spark (career/recruit.ts calls this when he says yes). */
export function meetRecruit(s: GameState, p: GenPlayer): void {
  const real = chance(s.rng, DUO.realChance);
  let spark = real ? range(s.rng, DUO.real[0], DUO.real[1]) : range(s.rng, DUO.plain[0], DUO.plain[1]);
  // a guard and a big have more ways to find each other than two players at one spot
  if (GROUP[p.pos] !== GROUP[s.player.pos]) spark += DUO.fit;
  (s.bonds ??= []).push({ id: p.id, name: p.name, pos: p.pos, spark: clamp(spark, 0, 1), bond: 0, seasons: 0 });
}

/** The duo he has right now (formed, and both still on the team). */
export function activeDuo(s: GameState): Bond | null {
  if (s.stage !== 'NBA') return null;
  const t = teamById(s.nba, s.teamId);
  if (!t) return null;
  return (s.bonds ?? []).find((b) => b.formed !== undefined && t.roster.some((x) => x.id === b.id)) ?? null;
}

/**
 * A moment that pulls him closer to (or away from) the teammates he recruited who have not become
 * a duo yet. Returns the closest one, for the event's text; the bond itself stays hidden.
 */
export function nudgeBonds(s: GameState, v: number): Bond | null {
  const t = teamById(s.nba, s.teamId);
  if (s.stage !== 'NBA' || !t) return null;
  const open = (s.bonds ?? []).filter((b) => b.formed === undefined && t.roster.some((x) => x.id === b.id));
  for (const b of open) b.bond = clamp(b.bond + v, 0, 99);
  return open.sort((a, b) => b.bond - a.bond)[0] ?? null;
}

/** How far along a duo is: 0.6 the season it forms, 1 three seasons later. */
export const duoLevel = (s: GameState, b: Bond): number => clamp(DUO.start + (s.year - (b.formed ?? s.year)) * DUO.perSeason, DUO.start, 1);

/** What the duo adds this season: team strength, and multipliers on his own game. */
export function duoEffect(s: GameState): { team: number; perf: number; ast: number; usage: number; b: Bond } | null {
  const b = activeDuo(s);
  if (!b) return null;
  const k = duoLevel(s, b);
  return { team: Math.round(DUO.team * k * 10) / 10, perf: 1 + DUO.perf * k, ast: 1 + DUO.ast * k, usage: 1 + DUO.usage * k, b };
}

/**
 * After a season: bonds grow with every teammate he recruited who is still there, a duo can
 * form, and bonds with players who left are dropped. Called at the start of the offseason, and
 * with no season at the start of the next one (so a duo split by a summer move ends then).
 */
export function growBonds(s: GameState, last: SeasonRecord | null): void {
  if (!s.bonds?.length) return;
  const t = teamById(s.nba, s.teamId);
  const here = (b: Bond) => s.stage === 'NBA' && !!t && t.roster.some((x) => x.id === b.id);
  for (const b of [...s.bonds]) {
    if (!here(b)) {
      if (b.formed !== undefined) {
        const now = s.nba?.teams.find((x) => x.roster.some((y) => y.id === b.id));
        logDecision(s, 'duo', `${b.nick} split up after ${b.seasons} season${b.seasons === 1 ? '' : 's'} together.`);
        pushMoment(s, {
          kind: 'event',
          title: `${b.nick}: the end`,
          color: '#4A4F57',
          text: `${now ? `${b.name} plays for the ${now.name} now.` : `You and ${b.name} are on different teams now.`} ${b.seasons} season${b.seasons === 1 ? '' : 's'} together, and nobody will forget how it looked.`,
          lines: ['The duo bonus is gone', 'A new recruit could spark another one'],
        });
      }
      s.bonds = s.bonds.filter((x) => x !== b);
      continue;
    }
    if (!last || last.teamId !== s.teamId || last.line.gp === 0) continue;
    b.seasons++;
    if (b.formed !== undefined) continue;
    const win = last.w + last.l > 0 ? last.w / (last.w + last.l) : 0.5;
    b.bond = clamp(b.bond + b.spark * DUO.grow + (win - 0.5) * DUO.winW + (s.player.trust - 50) * DUO.trustW + normal(s.rng, 0, DUO.sd), 0, 100);
    if (b.bond >= 100) formDuo(s, b);
    // the only clues: how it feels on the floor
    else if (b.bond >= 45) note(s, `Something is there with ${b.name}. The lobs, the looks, the late-game reads. Give it time.`);
    else if (b.spark < DUO.real[0] && b.seasons === 1) note(s, `You and ${b.name} play fine together. Just fine.`);
  }
}

function formDuo(s: GameState, b: Bond): void {
  // one duo at a time: a second spark keeps growing and takes over if the first one ends
  if (activeDuo(s)) {
    b.bond = 99;
    return;
  }
  b.formed = s.year;
  b.nick = nickname(s.rng, s.player.pos, b.pos);
  const t = teamById(s.nba, s.teamId);
  // he signs on for more: nobody walks away from this
  const mate = t?.roster.find((x) => x.id === b.id);
  if (mate) mate.contractYears = Math.max(mate.contractYears, DUO.stay);
  logDecision(s, 'duo', `Formed a duo with ${b.name}: "${b.nick}".`, t?.id);
  pushMoment(s, {
    kind: 'event',
    title: `A duo: ${b.nick}`,
    teamName: t?.name,
    color: t?.color ?? '#7048E8',
    text: `Season by season it stopped being two players. You and ${b.name} know where the other one is going before he does, and the league has a name for it now: ${b.nick}.`,
    lines: ['Your game: a little more efficient, more assists', 'The team: better chemistry every night', `${b.name} signs on to stay with you`, 'It grows for three seasons, and ends if either of you leaves'],
  });
}
