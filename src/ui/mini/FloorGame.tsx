// The Floor as a mini-game (round 39, owner: "can we get rid of (archive) the front office minigame
// and replace it with this game?"): the setup page, the court (ui/floor/FloorScreen.tsx, over the
// whole page as in a career), then the result: the final score, his line, the grade and, with a
// career, the bonus to claim. The setup's "play the AI" part is a component of its own (FloorVsAi),
// so another way to play can stand beside it. Enter presses the main button and Escape goes back:
// to the hub from the setup, to the setup from the result. A phone has the engine play the six
// minutes, as a career's Floor does (phones are set aside, owner, round 39).

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FLOOR_MINI } from '../../engine/balance';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE } from '../../content/teamStyle';
import { ovrOf } from '../../engine/player/ovr';
import { teamById } from '../../engine/career/common';
import { floorResult, skipFloor, startFloor, type FloorSetup } from '../../engine/floor/sim';
import { FLOOR_STRENGTHS, bestStarter, careerMe, floorCareerSetup, floorGrade, floorMiniResult, floorMiniSetup, floorRoster, onNbaTeam, type FloorStrength } from '../../engine/floor/mini';
import type { MiniResult } from '../../engine/career/miniBonus';
import type { GameState, Team } from '../../engine/types';
import { FloorScreen, type FloorTeamLook } from '../floor/FloorScreen';
import type { ArenaLook } from '../floor/view';
import { kitFor } from '../art/Player';
import { TeamArt } from '../art/Crest';
import { Icon } from '../art/Icon';
import { MiniBonus } from './MiniBonus';
import { sfx } from '../sound';
import { useStore } from '../../store';
import { t, tx } from '../../i18n';

type Outcome = ReturnType<typeof floorResult>;

/** What the setup hands over: two generated teams (the start page, or a career off the NBA), or his
 * own NBA team against one he picked. `roster` seeds the generated players, so Play again keeps them. */
type FloorChoice = { kind: 'free'; us: string; them: string; strength: FloorStrength; slot: number; roster: number } | { kind: 'team'; opp: string };

/** A game ready to tip off (`abbrs`: the two teams' crests). */
interface Plan {
  choice: FloorChoice;
  abbrs: [string, string];
  setup: FloorSetup;
  arena: ArenaLook;
  looks: [FloorTeamLook, FloorTeamLook];
}

/** A finished game. */
interface End {
  plan: Plan;
  out: Outcome;
  result: Extract<MiniResult, { game: 'floor' }>;
}

const STRENGTH_NAME: Record<FloorStrength, string> = { average: tx('Average@@teams'), good: tx('Good@@teams'), great: tx('Great@@teams') };
const newSeed = () => 1 + Math.floor(Math.random() * 2_000_000_000);
/** A screen the Floor cannot be played on (as FloorStage): a touch screen, or one too narrow. */
const noKeys = (): boolean => (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) || window.innerWidth < 720;
const nbaTeam = (abbr: string) => NBA_TEAMS.find((x) => x.abbr === abbr)!;
const arenaOf = (abbr: string, color: string): ArenaLook => {
  const st = TEAM_STYLE[abbr];
  return st ? { c1: st.c1, c2: st.c2, c3: st.c3 } : { c1: color, c2: '#F2F2F2', c3: '#1B1820' };
};

function planOf(choice: FloorChoice, seed: number, g: GameState | null): Plan {
  if (choice.kind === 'team') {
    const mine = teamById(g!.nba, g!.teamId)!;
    const theirs = teamById(g!.nba, choice.opp)!;
    const kit = (x: Team, which: 'home' | 'road') => kitFor(x.name, x.abbr, x.color, which, 'NBA');
    return { choice, abbrs: [mine.abbr, theirs.abbr], setup: floorCareerSetup(g!, choice.opp, seed), arena: arenaOf(mine.abbr, mine.color), looks: [{ kit: kit(mine, 'home'), which: 'home' }, { kit: kit(theirs, 'road'), which: 'road' }] };
  }
  const me = g ? careerMe(g) : undefined;
  const setup = floorMiniSetup({ seed, roster: choice.roster, us: choice.us, them: choice.them, strength: choice.strength, slot: me ? me.slot : choice.slot }, me);
  return { choice, abbrs: [choice.us, choice.them], setup, arena: arenaOf(choice.us, nbaTeam(choice.us).color), looks: [{ kit: TEAM_STYLE[choice.us].home, which: 'home' }, { kit: TEAM_STYLE[choice.them].road, which: 'road' }] };
}

const endOf = (plan: Plan, out: Outcome): End => ({ plan, out, result: floorMiniResult(out, plan.choice.kind === 'team' ? 'team' : plan.choice.strength) });

// the dev deck's result card: a game the engine played, waiting for the page to open
let staged: End | null = null;
/** The dev deck: open the Floor on the result of a game the engine plays from `seed`. */
export function stageFloorEnd(seed = 39): void {
  const plan = planOf({ kind: 'free', us: 'MIN', them: 'BOS', strength: 'good', slot: 1, roster: seed }, seed, null);
  const st = startFloor(plan.setup);
  skipFloor(st);
  staged = endOf(plan, floorResult(st));
}

/** The mini-game: the setup page, the court, the result. */
export function FloorGame() {
  const game = useStore((s) => s.game);
  const career = game && game.step !== 'retired' ? game : null;
  const [playing, setPlaying] = useState<{ plan: Plan; key: number } | null>(null);
  const [end, setEnd] = useState<End | null>(() => staged);
  // the last choice, so Back from the result returns to it
  const [last, setLast] = useState<FloorChoice | null>(() => staged?.plan.choice ?? null);
  useEffect(() => {
    staged = null;
  }, []);

  const tipOff = (choice: FloorChoice) => {
    const plan = planOf(choice, newSeed(), career);
    setLast(choice);
    setEnd(null);
    sfx('whistle');
    if (noKeys()) {
      const st = startFloor(plan.setup);
      skipFloor(st);
      finish(plan, floorResult(st));
    } else setPlaying({ plan, key: plan.setup.seed });
  };
  const finish = (plan: Plan, out: Outcome) => {
    setPlaying(null);
    setEnd(endOf(plan, out));
    sfx(out.win ? 'good' : 'bad');
    window.scrollTo(0, 0);
  };

  if (playing)
    return createPortal(
      <div className="floor-layer" role="dialog" aria-modal="true" aria-label={t('The Floor')}>
        <FloorScreen key={playing.key} setup={playing.plan.setup} arena={playing.plan.arena} looks={playing.plan.looks} onDone={(r) => finish(playing.plan, r)} />
      </div>,
      document.body,
    );
  if (end) return <FloorEnd end={end} again={() => tipOff(end.plan.choice)} back={() => setEnd(null)} />;
  return <FloorSetupPage career={career} last={last} onStart={tipOff} />;
}

/** The setup page: what the Floor is, then the ways to play it (the AI, for now). */
function FloorSetupPage({ career, last, onStart }: { career: GameState | null; last: FloorChoice | null; onStart: (c: FloorChoice) => void }) {
  return (
    <section className="stack stage-in fm-setup">
      <div>
        <div className="kicker">{t('Mini-game · The Floor')}</div>
        <h1 className="hub-title with-icon">
          <Icon name="floor" size={40} />
          {t('The last six minutes')}
        </h1>
        <p className="prose">{t('A close NBA game with six minutes left in the fourth, four real minutes on the clock. You steer one starter at both ends; the other nine play themselves. Win it, and win it by enough for an A.')}</p>
      </div>
      <FloorVsAi career={career} last={last} onStart={onStart} />
      <p className="small muted">
        {t('WASD or the arrows move, Shift sprints, J shoots (hold, let go in the green; tap at the rim), K passes, L makes a move, Space calls a pick. On defence J steals, K blocks, L switches. Esc pauses.')}{' '}
        {t('Grade: A for a win by {a} or more, B for a win, C for a loss by {c} or less, D below; your own line adds or takes up to {cap}.', { a: FLOOR_MINI.grade.A, c: -FLOOR_MINI.grade.C, cap: FLOOR_MINI.cap })}
      </p>
    </section>
  );
}

/** A row of crests to pick a team from (by its id: an NBA abbreviation, or a career league's team id). */
function Crests({ teams, value, onPick, label }: { teams: { id: string; abbr: string; name: string; color: string }[]; value: string; onPick: (id: string) => void; label: string }) {
  return (
    <div className="fm-crests" role="group" aria-label={label}>
      {teams.map((x) => (
        <button key={x.id} className={`fm-crest${x.id === value ? ' on' : ''}`} aria-pressed={x.id === value} aria-label={x.name} title={x.name} onClick={() => onPick(x.id)}>
          <TeamArt name={x.name} abbr={x.abbr} color={x.color} league="NBA" size={36} />
        </button>
      ))}
    </div>
  );
}

/** The team picked, big. */
function Picked({ abbr, name, color, note }: { abbr: string; name: string; color: string; note?: string }) {
  return (
    <div className="fm-picked" style={{ ['--team' as string]: color }}>
      <TeamArt name={name} abbr={abbr} color={color} league="NBA" size={64} />
      <div>
        <b>{name}</b>
        {note && <span className="small muted keep">{note}</span>}
      </div>
    </div>
  );
}

const ALL = NBA_TEAMS.map((x) => ({ id: x.abbr, abbr: x.abbr, name: `${x.city} ${x.nick}`, color: x.color }));

/** Playing the AI: the two teams, how good they are and his starter; or, with a career on an NBA
 * team, his team against the one he picks. Enter tips it off. */
function FloorVsAi({ career, last, onStart }: { career: GameState | null; last: FloorChoice | null; onStart: (c: FloorChoice) => void }) {
  const own = onNbaTeam(career);
  const [seed] = useState(newSeed);
  const lastFree = last?.kind === 'free' ? last : null;
  const [us, setUs] = useState(() => lastFree?.us ?? ALL[seed % ALL.length].abbr);
  const [them, setThem] = useState(() => lastFree?.them ?? ALL[(seed + 7) % ALL.length].abbr);
  const [strength, setStrength] = useState<FloorStrength>(lastFree?.strength ?? 'good');
  const [roster, setRoster] = useState(lastFree?.roster ?? seed);
  const five = useMemo(() => floorRoster('U', FLOOR_MINI.strength[strength], roster + 3).slice(0, 5), [strength, roster]);
  const [slot, setSlot] = useState<number | null>(lastFree?.slot ?? null);
  const me = career && !own ? careerMe(career) : null;
  const steer = me ? me.slot : (slot ?? bestStarter(five));

  // a career on an NBA team: his team, and the others of his league
  const league = own ? career!.nba!.teams : [];
  const mine = own ? teamById(career!.nba, career!.teamId)! : null;
  const others = league.filter((x) => x.id !== mine?.id);
  const [opp, setOpp] = useState(() => {
    if (last?.kind === 'team' && others.some((x) => x.id === last.opp)) return last.opp;
    return [...others].sort((a, b) => Math.abs(a.strength - (mine?.strength ?? 0)) - Math.abs(b.strength - (mine?.strength ?? 0)))[0]?.id ?? '';
  });
  const oppT = others.find((x) => x.id === opp);

  const choice: FloorChoice = own ? { kind: 'team', opp } : { kind: 'free', us, them, strength, slot: steer, roster };
  const go = () => onStart(choice);
  // Enter tips it off (a focused button presses itself)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('[role="dialog"], .set-menu, .tour-tip')) return;
      if ((e.target as HTMLElement).closest('button, input, textarea, select, a, summary')) return;
      e.preventDefault();
      go();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const pickUs = (a: string) => {
    if (a === them) setThem(us);
    setUs(a);
  };
  const pickThem = (a: string) => {
    if (a === us) setUs(them);
    setThem(a);
  };

  if (own && mine)
    return (
      <section className="card stack fm-ai">
        <div className="sec-title">{t('Play the AI')}</div>
        <div className="fm-teams">
          <div className="fm-side">
            <div className="kicker">{t('Your team')}</div>
            <Picked abbr={mine.abbr} name={mine.name} color={mine.color} note={t('You play yourself: {name}, #{n}, with your own ratings. Team strength {s}.', { name: career!.player.name, n: career!.player.number, s: Math.round(mine.strength) })} />
          </div>
          <div className="fm-vs">{t('vs')}</div>
          <div className="fm-side">
            <div className="kicker">{t('The opponent')}</div>
            {oppT && <Picked abbr={oppT.abbr} name={oppT.name} color={oppT.color} note={t('Team strength {s}', { s: Math.round(oppT.strength) })} />}
            <Crests teams={others} value={opp} onPick={setOpp} label={t('The opponent')} />
          </div>
        </div>
        <p className="small muted">{t('Both teams as they are this season, in your arena. The gap between them is the season’s.')}</p>
        <button className="btn fm-go" data-tour="floor-mini" onClick={go}>
          {t('Tip it off')}
        </button>
      </section>
    );

  const usT = ALL.find((x) => x.abbr === us)!;
  const themT = ALL.find((x) => x.abbr === them)!;
  return (
    <section className="card stack fm-ai">
      <div className="sec-title">{t('Play the AI')}</div>
      <div className="fm-teams">
        <div className="fm-side">
          <div className="kicker">{t('Your team')}</div>
          <Picked abbr={us} name={usT.name} color={usT.color} note={t('In your arena, in your home kit.')} />
          <Crests teams={ALL} value={us} onPick={pickUs} label={t('Your team')} />
        </div>
        <div className="fm-vs">{t('vs')}</div>
        <div className="fm-side">
          <div className="kicker">{t('The opponent')}</div>
          <Picked abbr={them} name={themT.name} color={themT.color} />
          <Crests teams={ALL} value={them} onPick={pickThem} label={t('The opponent')} />
        </div>
      </div>
      <div className="fm-row">
        <div className="kicker">{t('How good both teams are')}</div>
        <div className="row" role="group" aria-label={t('How good both teams are')}>
          {FLOOR_STRENGTHS.map((k) => (
            <button key={k} className={`pick-chip${k === strength ? ' on' : ''}`} aria-pressed={k === strength} onClick={() => (setStrength(k), setSlot(null))}>
              {t('{name} ({n})', { name: t(STRENGTH_NAME[k]), n: FLOOR_MINI.strength[k] })}
            </button>
          ))}
        </div>
      </div>
      <div className="fm-row">
        <div className="kicker">{me ? t('You play yourself') : t('Who you steer')}</div>
        <div className="fm-five" role="group" aria-label={me ? t('You play yourself') : t('Who you steer')}>
          {five.map((p, i) =>
            me && i === me.slot ? (
              <button key={p.id} className="fm-starter on" aria-pressed="true">
                <small>{p.pos}</small>
                <b>{me.name}</b>
                <span>{Math.round(ovrOf(me.r, p.pos))}</span>
              </button>
            ) : (
              <button key={p.id} className={`fm-starter${!me && i === steer ? ' on' : ''}`} aria-pressed={!me && i === steer} disabled={!!me} onClick={() => setSlot(i)}>
                <small>{p.pos}</small>
                <b>{p.name}</b>
                <span>{Math.round(ovrOf(p.r, p.pos))}</span>
              </button>
            ),
          )}
          <button className="btn ghost small" onClick={() => (setRoster(newSeed()), setSlot(null))}>
            {t('New players')}
          </button>
        </div>
        <p className="small muted">{me ? t('{name} takes his own spot with his own ratings; the rest of the team is at the level picked.', { name: me.name }) : t('The best starter is picked for you; any of the five can be yours. The number is his overall rating at his position.')}</p>
      </div>
      <button className="btn fm-go" data-tour="floor-mini" onClick={go}>
        {t('Tip it off')}
      </button>
    </section>
  );
}

/** The result: the final score, his line, the grade, the career bonus; Play again (Enter) or Back (Escape). */
function FloorEnd({ end, again, back }: { end: End; again: () => void; back: () => void }) {
  const { out, plan, result } = end;
  const s = plan.setup;
  const me = s.us.players.find((p) => p.user) ?? s.us.players[0];
  const { share } = floorGrade(out.us, out.them, out.line);
  const m = out.us - out.them;
  const L = out.line;
  // Escape goes back to the setup (before the page's own Escape, which leaves for the hub)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('[role="dialog"], .set-menu, .tour-tip')) return;
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        back();
      } else if (e.key === 'Enter' && !(e.target as HTMLElement).closest('button, a, summary')) {
        e.preventDefault();
        again();
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  });
  const crest = (x: FloorSetup['us'], abbr: string) => <TeamArt name={x.name} abbr={abbr} color={x.color} league="NBA" size={56} />;
  return (
    <section className="stack stage-in">
      <section className="card stack fm-end">
        <div className="kicker">{t('The Floor · final')}</div>
        <div className="fm-final" aria-label={`${s.us.name} ${out.us}, ${s.them.name} ${out.them}`}>
          {crest(s.us, plan.abbrs[0])}
          <span className={m > 0 ? 'win' : ''}>{out.us}</span>
          <span className="fm-dash">–</span>
          <span className={m < 0 ? 'win' : ''}>{out.them}</span>
          {crest(s.them, plan.abbrs[1])}
        </div>
        <div className="fm-verdict">
          <span className={`fm-grade g-${result.grade}`} aria-label={t('Grade {g}', { g: result.grade })}>
            {result.grade}
          </span>
          <div>
            <b>{m > 0 ? t('{team} win by {n}', { team: s.us.name, n: m }) : t('{team} lose by {n}', { team: s.us.name, n: -m })}</b>
            <span className="small muted keep">{share === 0 ? t('Your line neither adds nor takes away.') : share > 0 ? t('Your line adds {n} to the grade.', { n: share }) : t('Your line takes {n} off the grade.', { n: -share })}</span>
          </div>
        </div>
        <p className="fm-line">
          {me.name}: {L.pts} PTS · {L.reb} REB · {L.ast} AST · {L.stl} STL · {L.blk} BLK · {L.fgm}/{L.fga} FG
        </p>
        <div className="row">
          <button className="btn fm-go" autoFocus onClick={again}>
            {t('Play again')}
          </button>
          <button className="btn ghost" onClick={back}>
            {t('Back')}
          </button>
        </div>
      </section>
      <MiniBonus result={result} />
    </section>
  );
}
