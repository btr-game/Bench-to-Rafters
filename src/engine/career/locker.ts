// The locker room and the head coach (round 32). Owner: "Locker room characters ... make it like a
// small rpg(?), where the user can use keyboard a, d to walk around and talk with the teammates and
// coach", and "let's add a small coach feature. make avatars of them, be able to fire them if the
// player reaches some amount of reputation (prolly towards the highest end) that affects team
// chemistry, morale, ...".
//
// Who is in the room: his starting five and the first two off the bench, each with a character
// (the youngest a rookie, the oldest a veteran, the best a star, the rest a joker, a quiet pro or a
// hothead), and the head coach. Each can be talked to once a half; what he says moves the team's
// chemistry (season.teamBonus, capped for the season), his mood, the coach's trust, sometimes a
// rating or his reputation. A hothead sometimes starts a feud for him to settle.

import { LOCKER as L } from '../balance';
import { chance, clamp } from '../rng';
import type { GameState, GenPlayer, Pos, Team } from '../types';
import { adjust, logDecision, tally, userOvr } from './common';
import { TEMPER, changeCoach, coachOf, h32, myTeam, type Coach } from './coach';
import { benchOf, fiveOf } from './roster';

// ---------- who is in the room ----------

export type Persona = 'rookie' | 'vet' | 'star' | 'joker' | 'quiet' | 'hothead';
export const PERSONA: Record<Persona, string> = { rookie: 'Rookie', vet: 'Veteran', star: 'Star', joker: 'Joker', quiet: 'Quiet pro', hothead: 'Hothead' };

export interface Mate {
  id: number;
  name: string;
  pos: Pos;
  age: number;
  ovr: number;
  persona: Persona;
}

export interface Room {
  team: Team;
  coach: Coach;
  mates: Mate[];
  /** Two teammates at odds this half (ids), or none. */
  feud: [number, number] | null;
  phase: string;
}

/** The half the room is open for (a talk each a half), or null when there is no season on. */
export function lockerPhase(s: GameState): string | null {
  if (!s.teamId || s.stage === 'RETIRED' || !s.season) return null;
  const half = s.step === 'preseason' || s.step === 'firstHalf' ? 1 : s.step === 'midseason' || s.step === 'secondHalf' ? 2 : s.step === 'postseason' ? 3 : 0;
  return half ? `${s.year}-${half}` : null;
}

export function lockerRoom(s: GameState): Room | null {
  const phase = lockerPhase(s);
  const team = myTeam(s);
  if (!phase || !team || team.roster.length === 0) return null;
  const five = fiveOf(team.roster, s.player.pos).map((x) => x.p);
  const people: GenPlayer[] = [...five, ...benchOf(team.roster, five).slice(0, 2)].slice(0, 6);
  const my = userOvr(s);
  const byAge = [...people].sort((a, b) => a.age - b.age || a.id - b.id);
  const rookie = byAge[0] && (byAge[0].rookie || byAge[0].age <= 22) ? byAge[0] : null;
  const old = byAge[byAge.length - 1];
  const vet = old && old !== rookie && old.age >= 30 ? old : null;
  const star = [...people].sort((a, b) => b.ovr - a.ovr).find((p) => p !== rookie && p !== vet && p.ovr >= my - 4) ?? null;
  const rest: Persona[] = ['joker', 'quiet', 'hothead'];
  const mates: Mate[] = people.map((p) => ({
    id: p.id,
    name: p.name,
    pos: p.pos,
    age: p.age,
    ovr: Math.round(p.ovr),
    persona: p === rookie ? 'rookie' : p === vet ? 'vet' : p === star ? 'star' : rest[h32(`${team.id}:${p.name}`) % 3],
  }));
  // a hothead starts something about every other half, with the teammate he likes least
  const hot = mates.find((m) => m.persona === 'hothead');
  const other = hot && mates.filter((m) => m !== hot).sort((a, b) => h32(`${phase}${a.name}`) - h32(`${phase}${b.name}`))[0];
  const feud: [number, number] | null = hot && other && h32(`${phase}:${team.id}`) % 2 === 0 ? [hot.id, other.id] : null;
  return { team, coach: coachOf(team), mates, feud, phase };
}

// ---------- the talks ----------

export interface TalkOption {
  id: string;
  label: string;
}
export interface Talk {
  who: string; // 'coach', 'feud' or a teammate's id
  name: string;
  line: string;
  options: TalkOption[];
}

const first = (name: string) => name.split(' ')[0];

/** What someone says when he walks up, and what he can say back. */
export function talkFor(room: Room, who: string): Talk | null {
  if (who === 'coach') {
    const c = room.coach;
    const line = c.temper === 'players' ? 'Door’s always open. What’s on your mind?' : c.temper === 'tactician' ? 'I’ve got the film up. Talk to me.' : 'Make it quick. We’ve got work to do.';
    return {
      who,
      name: `Coach ${c.name.split(' ').slice(-1)[0]}`,
      line,
      options: [
        { id: 'listen', label: 'Ask what he needs from you' },
        { id: 'plan', label: 'Talk strategy' },
        { id: 'gripe', label: 'Complain about your minutes' },
      ],
    };
  }
  if (who === 'feud') {
    if (!room.feud) return null;
    const [a, b] = room.feud.map((id) => room.mates.find((m) => m.id === id)!);
    return {
      who,
      name: `${first(a.name)} and ${first(b.name)}`,
      line: `${first(a.name)} and ${first(b.name)} are nose to nose by the lockers. Everyone is watching you.`,
      options: [
        { id: 'breakup', label: 'Break it up' },
        { id: 'side', label: `Back ${first(b.name)}` },
        { id: 'out', label: 'Stay out of it' },
      ],
    };
  }
  const m = room.mates.find((x) => String(x.id) === who);
  if (!m) return null;
  const n = first(m.name);
  const T: Record<Persona, { line: string; options: TalkOption[] }> = {
    rookie: { line: `${n}: First season up here. Any advice?`, options: [{ id: 'mentor', label: 'Take him under your wing' }, { id: 'tough', label: 'Tell him to earn it' }] },
    vet: { line: `${n}: Seen a lot of guys come through this room, kid.`, options: [{ id: 'advice', label: 'Ask how he has lasted so long' }, { id: 'minutes', label: 'Tell him the minutes are yours now' }] },
    star: { line: `${n}: Whose team is this, anyway?`, options: [{ id: 'twoman', label: 'Pitch a two-man game' }, { id: 'alpha', label: 'Tell him it’s yours' }] },
    joker: { line: `${n} has taped a rubber chicken to your locker.`, options: [{ id: 'laugh', label: 'Laugh along' }, { id: 'focus', label: 'Tell him to lock in' }] },
    quiet: { line: `${n} is watching film alone, headphones on.`, options: [{ id: 'film', label: 'Ask to watch with him' }, { id: 'leave', label: 'Leave him to his routine' }] },
    hothead: { line: `${n}: Refs had it out for us. Somebody’s gotta pay.`, options: [{ id: 'calm', label: 'Calm him down' }, { id: 'square', label: 'Square up to him' }] },
  };
  return { who, name: m.name, ...T[m.persona] };
}

/** Whether he has talked to someone this half. */
export const talked = (s: GameState, who: string): boolean => !!s.locker && s.locker.phase === lockerPhase(s) && s.locker.done.includes(who);

/** Chemistry from the room, within the season's cap. Returns what actually moved. */
function chem(s: GameState, d: number): number {
  const box = s.locker!;
  const want = clamp(box.chem + d, -L.cap, L.cap);
  const real = Math.round((want - box.chem) * 100) / 100;
  box.chem = want;
  if (s.season && real) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) + real) * 100) / 100;
  return real;
}

const fx = (parts: (string | false)[]) => parts.filter(Boolean).join(', ');
const sign = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100) / 100}`;

/** He says `opt` to `who`. Returns what came of it, or null when it can't be said. */
export function lockerTalk(s: GameState, who: string, opt: string): string | null {
  const room = lockerRoom(s);
  const talk = room && talkFor(room, who);
  if (!room || !talk || !talk.options.some((o) => o.id === opt) || talked(s, who)) return null;
  if (!s.locker || s.locker.year !== s.year) s.locker = { phase: room.phase, done: [], year: s.year, chem: 0 };
  if (s.locker.phase !== room.phase) s.locker = { ...s.locker, phase: room.phase, done: [] };
  s.locker.done.push(who);
  tally(s, 'lkTalk');
  const p = s.player;
  let out = '';
  const c = (d: number) => {
    const r = chem(s, d);
    return r !== 0 && `chemistry ${sign(r)}`;
  };
  switch (`${who === 'coach' || who === 'feud' ? who : room.mates.find((m) => String(m.id) === who)!.persona}:${opt}`) {
    case 'rookie:mentor':
      tally(s, 'lkMentor');
      p.morale = adjust(p.morale, 1);
      p.trust = adjust(p.trust, 1);
      out = `He hangs on every word. ${fx([c(L.rookie.mentor), 'coach trust +1'])}.`;
      break;
    case 'rookie:tough':
      p.rep = adjust(p.rep, 1);
      out = `He nods and goes quiet. ${fx([c(L.rookie.tough), 'reputation +1'])}.`;
      break;
    case 'vet:advice':
      tally(s, 'lkVet');
      p.morale = adjust(p.morale, 2);
      p.longevity = (p.longevity ?? 0) + 1;
      out = 'Sleep, cold tubs, and never skip the boring work. You feel a little more like him. Morale +2, and something for later.';
      break;
    case 'vet:minutes':
      p.rep = adjust(p.rep, 2);
      p.morale = adjust(p.morale, 1);
      out = `He laughs, but it stings. ${fx([c(L.vet.minutes), 'reputation +2'])}.`;
      break;
    case 'star:twoman': {
      const m = room.mates.find((x) => String(x.id) === who)!;
      const close = Math.abs(m.ovr - userOvr(s)) <= L.star.close;
      if (close) tally(s, 'lkTwoMan');
      out = close ? `He’s in. Pick-and-roll all night. ${fx([c(L.star.twoman)])}.` : `He shrugs: sure, sometimes. ${fx([c(L.star.twomanFar)])}.`;
      break;
    }
    case 'star:alpha':
      tally(s, 'lkAlpha');
      p.rep = adjust(p.rep, 2);
      p.morale = adjust(p.morale, 2);
      out = `The room goes quiet. ${fx([c(L.star.alpha), 'reputation +2', 'morale +2'])}.`;
      break;
    case 'joker:laugh':
      tally(s, 'lkLaugh');
      p.morale = adjust(p.morale, 4);
      out = 'The whole room cracks up. Morale +4.';
      break;
    case 'joker:focus':
      p.morale = adjust(p.morale, -1);
      p.trust = adjust(p.trust, 1);
      out = `He peels the chicken off, a little sheepish. ${fx([c(L.joker.focus), 'coach trust +1', 'morale -1'])}.`;
      break;
    case 'quiet:film':
      tally(s, 'lkFilm');
      p.attrs.IQ = clamp(p.attrs.IQ + L.quiet.film, 15, 99);
      out = `He shows you how the defense tips its rotations. ${fx(['basketball IQ +0.3', c(L.quiet.filmChem)])}.`;
      break;
    case 'quiet:leave':
      p.morale = adjust(p.morale, 1);
      out = 'He gives you a small nod on your way past. Morale +1.';
      break;
    case 'hothead:calm': {
      const ok = chance(s.rng, L.hothead.calm);
      if (ok) tally(s, 'lkCalm');
      if (!ok) p.morale = adjust(p.morale, -2);
      out = ok ? `He breathes out and sits down. ${fx([c(L.hothead.calmWin)])}.` : `He shrugs you off and storms out. ${fx([c(L.hothead.calmLose), 'morale -2'])}.`;
      break;
    }
    case 'hothead:square': {
      const ok = chance(s.rng, L.hothead.square);
      if (ok) {
        p.rep = adjust(p.rep, 2);
        tally(s, 'lkSquare');
      }
      else p.morale = adjust(p.morale, -2);
      out = ok ? `He backs off, and respects you for it. ${fx([c(L.hothead.squareWin), 'reputation +2'])}.` : `It gets loud, then ugly. ${fx([c(L.hothead.squareLose), 'morale -2'])}.`;
      break;
    }
    case 'feud:breakup':
      tally(s, 'lkFeud');
      p.trust = adjust(p.trust, 2);
      out = `You step in between them and it ends there. ${fx([c(L.feud.breakup), 'coach trust +2'])}.`;
      break;
    case 'feud:side':
      p.morale = adjust(p.morale, 2);
      out = `One of them owes you now; the other won’t forget. ${fx([c(L.feud.side), 'morale +2'])}.`;
      break;
    case 'feud:out':
      out = `It simmers all week. ${fx([c(L.feud.out)]) || 'Nothing changes'}.`;
      break;
    case 'coach:listen':
      p.trust = adjust(p.trust, 3);
      out = 'He tells you, straight. Coach trust +3.';
      break;
    case 'coach:plan':
      p.trust = adjust(p.trust, 2);
      if (room.coach.temper === 'tactician') p.attrs.IQ = clamp(p.attrs.IQ + 0.2, 15, 99);
      else p.morale = adjust(p.morale, 2);
      out = `You trade ideas at the whiteboard. Coach trust +2, ${room.coach.temper === 'tactician' ? 'basketball IQ +0.2' : 'morale +2'}.`;
      break;
    case 'coach:gripe': {
      tally(s, 'lkGripe');
      const cost = room.coach.temper === 'hardliner' ? 6 : room.coach.temper === 'players' ? 2 : 4;
      p.trust = adjust(p.trust, -cost);
      p.morale = adjust(p.morale, 2);
      out = `${room.coach.temper === 'hardliner' ? 'He shows you the door.' : 'He hears you out, and doesn’t like it.'} Coach trust -${cost}, morale +2 (it felt good to say).`;
      break;
    }
    default:
      return null;
  }
  logDecision(s, 'locker', `Locker room, ${talk.name}: ${talk.options.find((o) => o.id === opt)!.label.toLowerCase()}. ${out}`);
  return out;
}

// ---------- firing the coach ----------

/** A star of the league can have his NBA coach fired, once a season, while one is on. */
export function canFireCoach(s: GameState): boolean {
  return s.stage === 'NBA' && !!myTeam(s) && !!lockerPhase(s) && s.player.rep >= L.fireRep && s.flags.coachFired !== s.year;
}

export function fireCoach(s: GameState): string | null {
  const team = myTeam(s);
  if (!team || !canFireCoach(s)) return null;
  const old = coachOf(team);
  // the man he wanted, a little better than an average hire
  const now = changeCoach(s, team, L.fireTrust, L.newCoach);
  s.flags.coachFired = s.year;
  tally(s, 'coachFires');
  // the room splits over it (straight off this season's chemistry, past the talks' cap)
  if (s.season) s.season.teamBonus = Math.round(((s.season.teamBonus ?? 0) - L.fireChem) * 100) / 100;
  const p = s.player;
  p.morale = adjust(p.morale, L.fireMorale);
  p.rep = adjust(p.rep, -L.fireRepCost);
  const text = `${team.name} fire ${old.name}; ${now.name} (${TEMPER[now.temper].toLowerCase()}, ${now.grade.toLowerCase()}) takes over. You got your way: morale +${L.fireMorale}, the new coach starts at trust ${L.fireTrust}. The room is split (chemistry -${L.fireChem}), and the papers call you a coach killer (reputation -${L.fireRepCost}).`;
  logDecision(s, 'coach', text, team.id);
  s.toast = `${old.name} is out. ${now.name} is the new head coach.`;
  return text;
}
