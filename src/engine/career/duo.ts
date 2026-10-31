// Duos (round 20: "hidden chemistry between the recruit and the user's player that can
// potentially lead to building a duo"). Every teammate he recruits into the starting five
// comes with a hidden spark. Most are just good teammates; about a quarter really click. Each
// season they play together the bond grows (the spark, winning and the coach's trust feed
// it); once it is full they become a named duo:
// - his game: a little more efficient and more assists (DUO.perf, DUO.ast), a few more shots;
// - the team: a chemistry bonus to team strength (DUO.team).
// Both grow as the duo matures. It ends when either of them leaves the team.
// Round 22: a Big Three. When a second recruit's bond fills while the duo stands, he joins them:
// the team gets another chemistry bonus, his game a little more efficiency and more assists, and
// a few fewer shots (three stars share the ball). Round 28 (owner: "make sure duos or big threes
// break apart when any of the three move teams"): when any of them leaves, him included, the whole
// group is over at once; a teammate who stays starts his bond again.
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
  trio?: boolean; // round 22: the third member of a Big Three
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
  // a player he recruits a second time keeps the bond he already has
  if ((s.bonds ?? []).some((b) => b.id === p.id)) return;
  const real = chance(s.rng, DUO.realChance);
  let spark = real ? range(s.rng, DUO.real[0], DUO.real[1]) : range(s.rng, DUO.plain[0], DUO.plain[1]);
  // a guard and a big have more ways to find each other than two players at one spot
  if (GROUP[p.pos] !== GROUP[s.player.pos]) spark += DUO.fit;
  (s.bonds ??= []).push({ id: p.id, name: p.name, pos: p.pos, spark: clamp(spark, 0, 1), bond: 0, seasons: 0 });
}

const formedOf = (s: GameState): Bond[] => (s.bonds ?? []).filter((b) => b.formed !== undefined);
const onTeam = (s: GameState, b: Bond): boolean => {
  const t = s.stage === 'NBA' ? teamById(s.nba, s.teamId) : null;
  return !!t && t.roster.some((x) => x.id === b.id);
};

/** The duo he has right now: formed, and everyone in it (a Big Three's third man too) still on his team. */
export function activeDuo(s: GameState): Bond | null {
  const f = formedOf(s);
  if (!f.length || f.some((b) => !onTeam(s, b))) return null;
  return f.find((b) => !b.trio) ?? f[0];
}

/** The third member of his Big Three, when all three are still together. */
export function activeTrio(s: GameState): Bond | null {
  const d = activeDuo(s);
  return d ? (formedOf(s).find((b) => b.id !== d.id) ?? null) : null;
}

/** Someone in his duo or Big Three has gone (or he has): the group ends, all of it, with one page.
 * Called after each season, and the moment he is traded (round 28). */
export function breakGroup(s: GameState): void {
  const formed = formedOf(s);
  const gone = formed.filter((b) => !onTeam(s, b));
  if (!formed.length || !gone.length) return;
  const stay = formed.filter((b) => onTeam(s, b));
  const name = formed.find((b) => b.trio)?.nick ?? formed[0].nick ?? 'The duo';
  const seasons = Math.max(...formed.map((b) => b.seasons));
  const mine = s.stage === 'NBA' ? teamById(s.nba, s.teamId) : null;
  const moved = gone.length === formed.length && !stay.length;
  const where = (b: Bond) => s.nba?.teams.find((x) => x.roster.some((y) => y.id === b.id));
  const why = moved && (gone.every((b) => where(b)?.id !== s.teamId))
    ? mine
      ? `You play for the ${mine.name} now.`
      : 'You are on a different team now.'
    : gone.map((b) => (where(b) ? `${b.name} plays for the ${where(b)!.name} now.` : `${b.name} has moved on.`)).join(' ');
  logDecision(s, 'duo', `${name} split up after ${seasons} season${seasons === 1 ? '' : 's'} together.`);
  pushMoment(s, {
    kind: 'event',
    title: `${name}: the end`,
    color: '#4A4F57',
    text: `${why} ${seasons} season${seasons === 1 ? '' : 's'} together, and nobody will forget how it looked.`,
    lines: [formed.length > 1 ? 'The Big Three bonus is gone' : 'The duo bonus is gone', stay.length ? `You and ${stay.map((b) => b.name).join(' and ')} start over` : 'A new recruit could spark another one'],
  });
  for (const b of stay) {
    b.formed = undefined;
    b.trio = undefined;
    b.nick = undefined;
    b.bond = Math.min(b.bond, DUO.restart);
  }
  s.bonds = (s.bonds ?? []).filter((b) => !gone.includes(b));
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
export function duoEffect(s: GameState): { team: number; perf: number; ast: number; usage: number; b: Bond; third: Bond | null } | null {
  const b = activeDuo(s);
  if (!b) return null;
  const k = duoLevel(s, b);
  const third = activeTrio(s);
  const k3 = third ? duoLevel(s, third) : 0;
  const T = DUO.trio;
  return {
    team: Math.round((DUO.team * k + T.team * k3) * 10) / 10,
    perf: 1 + DUO.perf * k + T.perf * k3,
    ast: 1 + DUO.ast * k + T.ast * k3,
    usage: 1 + DUO.usage * k + T.usage * k3,
    b,
    third,
  };
}

/**
 * After a season: bonds grow with every teammate he recruited who is still there, a duo can
 * form, and bonds with players who left are dropped. Called at the start of the offseason, and
 * with no season at the start of the next one (so a duo split by a summer move ends then).
 */
export function growBonds(s: GameState, last: SeasonRecord | null): void {
  if (!s.bonds?.length) return;
  // careers saved before round 22 can hold two bonds with the same teammate: keep the further one
  s.bonds = s.bonds.filter((b, i, all) => !all.some((o, j) => o.id === b.id && j !== i && (o.formed !== undefined && b.formed === undefined ? true : o.bond > b.bond || (o.bond === b.bond && j < i))));
  breakGroup(s);
  for (const b of [...s.bonds]) {
    if (!onTeam(s, b)) {
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

const TRIO_NAMES = ['The Big Three', 'Three Kings', 'The Trifecta', 'The Triangle', 'The Three Amigos', 'Hat Trick'];

function formTrio(s: GameState, b: Bond, duo: Bond): void {
  b.formed = s.year;
  b.trio = true;
  b.nick = pick(s.rng, TRIO_NAMES);
  const t = teamById(s.nba, s.teamId);
  const mate = t?.roster.find((x) => x.id === b.id);
  if (mate) mate.contractYears = Math.max(mate.contractYears, DUO.stay);
  logDecision(s, 'duo', `Formed a Big Three with ${duo.name} and ${b.name}: "${b.nick}".`, t?.id);
  pushMoment(s, {
    kind: 'event',
    title: `A Big Three: ${b.nick}`,
    duo: true,
    teamName: t?.name,
    color: t?.color ?? '#7048E8',
    text: `${duo.nick} was not enough for ${b.name}. Seasons of reading each other later, there are three of you, and the league has started calling it ${b.nick}.`,
    lines: ['The team: another big chemistry bonus', 'Your game: more efficient, more assists, a few fewer shots', `${b.name} signs on to stay`, 'If one of you leaves, it is a duo again'],
  });
}

function formDuo(s: GameState, b: Bond): void {
  // a duo already stands: he joins it as the third man of a Big Three (one at a time)
  const duo = activeDuo(s);
  if (duo) {
    if (activeTrio(s)) {
      b.bond = 99;
      return;
    }
    formTrio(s, b, duo);
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
    duo: true,
    teamName: t?.name,
    color: t?.color ?? '#7048E8',
    text: `Season by season it stopped being two players. You and ${b.name} know where the other one is going before he does, and the league has a name for it now: ${b.nick}.`,
    lines: ['Your game: a little more efficient, more assists', 'The team: better chemistry every night', `${b.name} signs on to stay with you`, 'It grows for three seasons, and ends if either of you leaves'],
  });
}
