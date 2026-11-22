// The Floor, a game of its own (round 42, owner: "let's take it out of minigames and develop it into
// a larger one"): its page, opened from the arena on the main land (the store's page 'floor').
// Four ways to play: a quick game (the fourth quarter) as any franchise's legends, the playoffs
// (sixteen franchises, one four-minute game a round), a five drafted from all 150 legends, and a
// friend online. Each side's overall is its own to set.

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE } from '../../content/teamStyle';
import { isFace, type LegendSpot } from '../../content/franchiseFives';
import type { Pos } from '../../engine/types';
import { ALL_LEGENDS, fiveOvr, fitPlan, legendFive, legendLine, legendRatings, legendStyle } from '../../engine/floor/legends';
import { ERAS, hotSpotsOf, pairsAmong, type FloorEra } from '../../engine/floor/gimmicks';
import { BRACKET_ROUNDS, finishBracket, type BracketGame, franchise, legendSetup, myGame, newBracket, playRound, winnerOf, type Bracket, type FloorSide } from '../../engine/floor/game';
import type { FloorResult, FloorSetup } from '../../engine/floor/sim';
import { onNbaTeam, ownSetup } from '../../engine/floor/mini';
import { teamById } from '../../engine/career/common';
import { ovrOf } from '../../engine/player/ovr';
import { achievementsNow, useStore } from '../../store';
import { recordFloorGame } from '../achievements';
import { t, tx } from '../../i18n';
import { PageTop } from '../components/PageTop';
import { TeamArt } from '../art/Crest';
import { Icon } from '../art/Icon';
import { sfx } from '../sound';
import { COURTS, FloorScreen, type CourtLook, type FloorTeamLook } from './FloorScreen';
import { FloorFriend } from './FloorFriend';
import { LegendTable } from './LegendTable';
import { signatureOf } from './traits';
import { GamePlan, SPOT_NAME, rememberedPlan } from './GamePlan';

type Mode = 'career' | 'quick' | 'playoffs' | 'draft' | 'online';
/** Only from a career's mini-games: his own player (owner, after round 42: "the user should be able
 * to play the floor with their own character"). */
const CAREER_MODE: { id: Mode; name: string; text: string } = { id: 'career', name: tx('Your player'), text: tx('The fourth quarter as your own player, with his own ratings. About four minutes.') };
const MODES: { id: Mode; name: string; text: string }[] = [
  { id: 'quick', name: tx('Quick game'), text: tx('The fourth quarter from a close score, as any franchise’s all-time five. About four minutes.') },
  { id: 'playoffs', name: tx('Playoffs'), text: tx('Eight franchises from each conference, one game a round, four wins to the title. Each game is all four quarters in about four minutes.') },
  { id: 'draft', name: tx('Draft your five'), text: tx('Any five legends from all 180, no positions needed, then a quick game against a franchise.') },
  { id: 'online', name: tx('Online'), text: tx('Head to head with a friend by room code, or a quick match with whoever is waiting.') },
];
const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
const ALL = NBA_TEAMS.map((x) => ({ abbr: x.abbr, name: `${x.city} ${x.nick}`, color: x.color }));
const nameOf = (abbr: string) => ALL.find((x) => x.abbr === abbr)?.name ?? abbr;
/** The eras' rules (gimmicks.ts, FLOOR.era). */
const ERA_NAME: Record<FloorEra, { name: string; text: string }> = {
  modern: { name: tx('Modern'), text: tx('Today’s rules.') },
  nineties: { name: tx('The nineties'), text: tx('Hand-checking: tougher at the rim, fewer fouls called, a slower pace.') },
  sixties: { name: tx('The sixties'), text: tx('No three-point line: every basket is two. A faster pace.') },
};
/** A legend's hot spots, by name. */
const hotSpotsFor = (l: LegendSpot): string => hotSpotsOf({ name: l.name, pos: l.pos, r: legendRatings(l), st: legendStyle(l) }).map((n) => t(SPOT_NAME[n])).join(', ');

/** The era picker: one chip each. */
function EraPick({ value, onChange }: { value: FloorEra; onChange: (e: FloorEra) => void }) {
  return (
    <div className="fm-row">
      <div className="gp-pick" role="group" aria-label={t('Era')}>
        <span className="small muted">{t('Era')}</span>
        {ERAS.map((k) => (
          <button key={k} className={`pick-chip${value === k ? ' on' : ''}`} aria-pressed={value === k} title={t(ERA_NAME[k].text)} onClick={() => onChange(k)}>
            {t(ERA_NAME[k].name)}
          </button>
        ))}
      </div>
      <p className="small muted">{t(ERA_NAME[value].text)}</p>
    </div>
  );
}

const ROUND_NAME = [tx('First round'), tx('Conference semi-finals'), tx('Conference finals'), tx('The Finals')];

/** A row of crests to pick a franchise from. */
function Crests({ value, onPick, label }: { value: string; onPick: (abbr: string) => void; label: string }) {
  return (
    <div className="fm-crests" role="group" aria-label={label}>
      {ALL.map((x) => (
        <button key={x.abbr} className={`fm-crest${x.abbr === value ? ' on' : ''}`} aria-pressed={x.abbr === value} aria-label={x.name} title={x.name} onClick={() => onPick(x.abbr)}>
          <TeamArt name={x.name} abbr={x.abbr} color={x.color} league="NBA" size={36} />
        </button>
      ))}
    </div>
  );
}

function Picked({ abbr, note }: { abbr: string; note: string }) {
  const x = ALL.find((y) => y.abbr === abbr)!;
  return (
    <div className="fm-picked" style={{ ['--team' as string]: x.color }}>
      <TeamArt name={x.name} abbr={x.abbr} color={x.color} league="NBA" size={64} />
      <div>
        <b>{x.name}</b>
        <span className="small muted keep">{note}</span>
      </div>
    </div>
  );
}

/** A side's overall: its legends' own, or a number picked for it. */
function OvrPick({ label, real, value, onChange }: { label: string; real: number; value: number | null; onChange: (v: number | null) => void }) {
  const shown = value ?? Math.round(real);
  return (
    <label className="fh-ovr">
      <span>
        {label}: <b>{shown}</b> {value === null && <em>{t('(their real level)')}</em>}
      </span>
      <input type="range" min={70} max={99} step={1} value={shown} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} />
      <button className={`pick-chip${value === null ? ' on' : ''}`} aria-pressed={value === null} onClick={() => onChange(null)}>
        {t('Real ({n})', { n: Math.round(real) })}
      </button>
    </label>
  );
}

/** A legend's real career line, short. */
function lineOf(name: string): string {
  const r = legendLine(name);
  return r ? `${r[0].toFixed(1)} PTS · ${r[1].toFixed(1)} REB · ${r[2].toFixed(1)} AST` : '';
}

/** The five, to pick who he steers. */
function Five({ five, slot, onPick, sixth }: { five: LegendSpot[]; slot: number; onPick: (i: number) => void; sixth?: LegendSpot }) {
  return (
    <>
    <div className="fm-five fh-five" role="group" aria-label={t('Who you steer')}>
      {five.map((l, i) => (
        <button key={l.name} className={`fm-starter${slot === i ? ' on' : ''}`} aria-pressed={slot === i} onClick={() => onPick(i)}>
          <small>{POS[i]}</small>
          <span>{l.ovr}</span>
          <b>{l.name}</b>
          <i className="fh-line">{lineOf(l.name)}</i>
          {signatureOf(l.name) && (
            <em className="fh-sig" title={signatureOf(l.name)!.text}>
              {signatureOf(l.name)!.name}
            </em>
          )}
          {isFace(l.name) && <em className="fh-face">{t('Face of the franchise')}</em>}
        </button>
      ))}
    </div>
    {sixth && (
      <p className="small muted fh-sixth">
        {t('Sixth man')}: <b>{sixth.name}</b> · {sixth.pos} · {sixth.ovr}
        {signatureOf(sixth.name) ? ` · ${signatureOf(sixth.name)!.name}` : ''}
      </p>
    )}
    {five[slot] && (
      <p className="small fh-spots">
        <b>{t('Hot spots')}:</b> {hotSpotsFor(five[slot])}
      </p>
    )}
    {(() => {
      const names = [...five, ...(sixth ? [sixth] : [])].map((l) => l.name);
      const duos = pairsAmong(names);
      return duos.length ? (
        <p className="small fh-duos">
          {duos.map(([i, j]) => (
            <span key={`${i}-${j}`}>{t('Chemistry: {a} + {b}', { a: names[i], b: names[j] })}</span>
          ))}
        </p>
      ) : null;
    })()}
    </>
  );
}

const best = (five: LegendSpot[]): number => five.reduce((k, l, i) => (l.ovr > five[k].ovr ? i : k), 0);

interface Plan {
  setup: FloorSetup;
  kits: [string, string];
  key: number;
  court?: CourtLook;
}

// (owner: "more courts can be nice"): the court a game is played on, kept on this device
const COURT_KEY = 'btr-floor-court';
function keptCourt(): CourtLook {
  try {
    const v = localStorage.getItem(COURT_KEY);
    if (COURTS.some((c) => c.id === v)) return v as CourtLook;
  } catch {
    // nothing kept
  }
  return 'arena';
}

function CourtPick({ value, onChange }: { value: CourtLook; onChange: (c: CourtLook) => void }) {
  return (
    <div className="fm-row">
      <div className="sec-title">{t('Court')}</div>
      <div className="gp-pick" role="group" aria-label={t('Court')}>
        {COURTS.map((c) => (
          <button
            key={c.id}
            className={`pick-chip${value === c.id ? ' on' : ''}`}
            aria-pressed={value === c.id}
            onClick={() => {
              try {
                localStorage.setItem(COURT_KEY, c.id);
              } catch {
                // storage blocked: picked again next time
              }
              onChange(c.id);
            }}
          >
            {t(c.name)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Court({ plan, onDone, onAgain }: { plan: Plan; onDone: (r: FloorResult) => void; onAgain?: () => void }) {
  const us = TEAM_STYLE[plan.kits[0]];
  const them = TEAM_STYLE[plan.kits[1]];
  const looks: [FloorTeamLook, FloorTeamLook] = [
    { kit: us.home, which: 'home' },
    { kit: them.road, which: 'road' },
  ];
  return createPortal(
    <div className="floor-layer" role="dialog" aria-modal="true" aria-label={t('The Floor')}>
      <FloorScreen key={plan.key} setup={plan.setup} court={plan.court} arena={{ c1: us.c1, c2: us.c2, c3: us.c3 }} looks={looks} onDone={onDone} onAgain={onAgain} lose={t('You lost')} />
    </div>,
    document.body,
  );
}

function BracketView({ b }: { b: Bracket }) {
  // (owner, after round 42: "make the bracket ui divide by east and west"): the East from the left, the
  // West from the right, the Finals between them
  const tie = (g: BracketGame, key: string) => {
    const w = winnerOf(g);
    return (
      <div key={key} className={`fh-tie${g.a === b.me || g.b === b.me ? ' mine' : ''}`}>
        {[g.a, g.b].map((a, i) => (
          <div key={a} className={`fh-team${w === a ? ' won' : w ? ' lost' : ''}`}>
            <TeamArt name={nameOf(a)} abbr={a} color={ALL.find((x) => x.abbr === a)!.color} league="NBA" size={22} />
            <span>{a}</span>
            <b>{g.score ? g.score[i] : ''}</b>
          </div>
        ))}
      </div>
    );
  };
  const side = (east: boolean) =>
    Array.from({ length: BRACKET_ROUNDS - 1 }, (_, r) => {
      const games = b.rounds[r] ?? [];
      const half = Math.max(1, (4 >> r) as number);
      const mine = east ? games.slice(0, games.length / 2) : games.slice(games.length / 2);
      return (
        <div key={`${east}${r}`} className="fh-round">
          <div className="fh-round-name">{t(ROUND_NAME[r])}</div>
          <div className="fh-ties">{mine.length ? mine.map((g, k) => tie(g, `${r}-${k}`)) : Array.from({ length: half }, (_, k) => <div key={k} className="fh-tie fh-tbd" aria-hidden="true" />)}</div>
        </div>
      );
    });
  const finals = b.rounds[BRACKET_ROUNDS - 1] ?? [];
  return (
    <div className="fh-bracket fh-split" aria-label={t('The bracket')}>
      <div className="fh-conf-side">
        <div className="fh-conf">{t('East')}</div>
        <div className="fh-rounds">{side(true)}</div>
      </div>
      <div className="fh-round fh-finals">
        <div className="fh-round-name">{t(ROUND_NAME[BRACKET_ROUNDS - 1])}</div>
        <div className="fh-ties">{finals.length ? finals.map((g, k) => tie(g, `f${k}`)) : <div className="fh-tie fh-tbd" aria-hidden="true" />}</div>
      </div>
      <div className="fh-conf-side west">
        <div className="fh-conf">{t('West')}</div>
        <div className="fh-rounds">{side(false).reverse()}</div>
      </div>
    </div>
  );
}

/** The arena's card on the main land. */
export function FloorCard() {
  const setPage = useStore((s) => s.setPage);
  return (
    <section className="card stack">
      <div className="sec-title with-icon">
        <Icon name="floor" size={28} />
        {t('The Floor')}
      </div>
      <p className="prose small">{t('Five on five, you steer one player. Play as the legends of all 30 teams, run the 16-team playoffs, or take on a friend online.')}</p>
      <div className="row-end">
        <button className="btn primary" data-tour="floor-enter" onClick={() => setPage('floor')}>
          {t('Enter the arena')}
        </button>
      </div>
    </section>
  );
}

/** The Floor's own page: from the arena on the main land, or (`inside`) as one of a career's
 * mini-games, where the mini-games' page gives it its top bar and its way back. */
export function FloorPage({ inside = false }: { inside?: boolean }) {
  const setPage = useStore((s) => s.setPage);
  const g = useStore((s) => s.game);
  // inside a career's mini-games he can play as himself: on his NBA team, or on a team at his level
  const career = inside && g && g.step !== 'retired' ? g : null;
  const myTeam = career && onNbaTeam(career) ? teamById(career.nba, career.teamId)! : null;
  const [mode, setMode] = useState<Mode>(career ? 'career' : 'quick');
  const [us, setUs] = useState('CHI');
  const [them, setThem] = useState('LAL');
  const [slot, setSlot] = useState<number | null>(null);
  const [myOvr, setMyOvr] = useState<number | null>(null);
  const [oppOvr, setOppOvr] = useState<number | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [gamePlan, setGamePlan] = useState(rememberedPlan);
  const [court, setCourt] = useState<CourtLook>(keptCourt);
  const [era, setEra] = useState<FloorEra>('modern');
  const [last, setLast] = useState<FloorResult | null>(null);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  // the draft: one legend for each position
  const [draft, setDraft] = useState<string[]>(() => POS.map((p) => ALL_LEGENDS.filter((x) => x.spot.pos === p).sort((a, b) => b.spot.ovr - a.spot.ovr)[0].spot.name));
  // (owner: "in draft your five, get rid of position constraints"): any five from one pool, set out
  // on the floor by their own positions, guards first
  const pool = useMemo(() => [...ALL_LEGENDS].sort((a, b) => b.spot.ovr - a.spot.ovr || (a.spot.name < b.spot.name ? -1 : 1)), []);

  const drafted: LegendSpot[] = draft.map((n) => ALL_LEGENDS.find((x) => x.spot.name === n)!.spot).sort((a, b) => POS.indexOf(a.pos) - POS.indexOf(b.pos));
  const five = mode === 'draft' ? drafted : legendFive(us);
  const steer = slot !== null && slot < five.length ? slot : best(five);
  const mine: FloorSide = mode === 'draft' ? { ...franchise(us, myOvr ?? undefined), name: t('Your five'), five: drafted, sixth: drafted.some((l) => l.name === franchise(us).sixth?.name) ? undefined : franchise(us).sixth } : franchise(us, myOvr ?? undefined);

  const pickUs = (a: string) => {
    if (a === them) setThem(us);
    setUs(a);
    setSlot(null);
    // a franchise starts from its own best fit (its culture or its five); changed from there as before
    if (mode !== 'draft') setGamePlan(fitPlan(a));
  };
  const pickThem = (a: string) => {
    if (a === us) setUs(them);
    setThem(a);
  };
  const seed = () => 1 + Math.floor(Math.random() * 1e9);
  const tip = () => {
    sfx('opened');
    setLast(null);
    // (owner: "for quick play, try to make as little choices as possible ... everything else is fixed (team style
    // is based on team choice) or random (era,...)"): a quick game asks only the team and who he steers
    if (mode === 'quick') {
      const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
      const eras: FloorEra[] = ['modern', 'nineties', 'sixties'];
      setPlan({ setup: legendSetup({ seed: seed(), us: franchise(us), them: franchise(them), user: steer, length: 'fourth', plan: fitPlan(us), era: pick(eras) }), kits: [us, them], key: Date.now(), court: pick(COURTS).id });
      return;
    }
    setPlan({ setup: legendSetup({ seed: seed(), us: mine, them: franchise(them, oppOvr ?? undefined), user: steer, length: 'fourth', plan: gamePlan, era }), kits: [us, them], key: Date.now(), court });
  };
  // his own game: his team's colours are his NBA team's, or the ones picked; the opponent is never his own team
  const ownUs = myTeam ? myTeam.abbr : us;
  const ownThem = them === ownUs ? ALL.find((x) => x.abbr !== ownUs)!.abbr : them;
  const tipOwn = () => {
    if (!career) return;
    sfx('opened');
    setLast(null);
    const look = (abbr: string) => ({ name: nameOf(abbr), short: abbr, color: ALL.find((x) => x.abbr === abbr)!.color });
    const opp = myTeam ? career.nba?.teams.find((x) => x.abbr === ownThem) : null;
    const setup = myTeam && opp ? ownSetup(career, { seed: seed(), oppId: opp.id }) : ownSetup(career, { seed: seed(), us: look(ownUs), them: look(ownThem) });
    setPlan({ setup: { ...setup, us: { ...setup.us, plan: gamePlan } }, kits: [ownUs, ownThem], key: Date.now(), court });
  };
  const tipPlayoff = (b: Bracket) => {
    const g = myGame(b);
    if (!g) return;
    const opp = g.home ? g.game.b : g.game.a;
    setPlan({ setup: legendSetup({ seed: b.seed + b.rounds.length * 7919, us: mine, them: franchise(opp, oppOvr ?? undefined), user: steer, length: 'playoff', plan: gamePlan, era, home: g.home ? 0 : 1 }), kits: [us, opp], key: Date.now(), court });
  };

  if (plan)
    return (
      <Court
        plan={plan}
        onAgain={mode === 'playoffs' ? undefined : mode === 'career' ? tipOwn : tip}
        onDone={(r) => {
          setPlan(null);
          setLast(r);
          let title = false;
          if (mode === 'playoffs' && bracket) {
            const b = playRound(bracket, [r.us, r.them], oppOvr ?? undefined);
            title = b.champion === b.me;
            setBracket(b.out !== null && !b.champion ? finishBracket(b, oppOvr ?? undefined) : b);
          }
          // the book (achievements) keeps games played to their end
          recordFloorGame({ margin: r.us - r.them, pts: r.line.pts, low: Math.min(r.marks.low, r.us - r.them), kind: mode === 'playoffs' ? 'playoff' : mode === 'draft' ? 'draft' : 'quick', title });
          achievementsNow();
        }}
      />
    );

  const game = bracket ? myGame(bracket) : null;
  return (
    <div className={inside ? undefined : 'wrap'}>
      {!inside && <PageTop trail={[t('The Floor')]} back={() => setPage(null)} />}
      <section className="stack stage-in fh">
        <div>
          <div className="kicker">{t('Five on five')}</div>
          <h1 className="hub-title with-icon">
            <Icon name="floor" size={40} />
            {t('The Floor')}
          </h1>
        </div>
        <div className="fh-modes" role="tablist" aria-label={t('How to play')}>
          {(career ? [CAREER_MODE, ...MODES] : MODES).map((m) => (
            <button key={m.id} role="tab" aria-selected={mode === m.id} className={`fh-mode${mode === m.id ? ' on' : ''}`} onClick={() => (setMode(m.id), setLast(null))}>
              <b>{t(m.name)}</b>
              <span className="prose small">{t(m.text)}</span>
            </button>
          ))}
        </div>

        {mode === 'online' && <FloorFriend />}

        {mode === 'career' && career && (
          <section className="card stack fm-setup">
            <div className="fm-teams">
              <div className="fm-side">
                <div className="sec-title">{t('Your player')}</div>
                <p className="fh-own">
                  <b>{career.player.name}</b>{' '}
                  <span className="small muted keep">
                    {career.player.pos} · #{career.player.number} · {t('{n} overall', { n: Math.round(ovrOf(career.player.attrs, career.player.pos)) })}
                  </span>
                </p>
                <Picked abbr={ownUs} note={myTeam ? t('Your team, with its real roster') : t('Teammates at your level')} />
                {!myTeam && <Crests value={us} onPick={pickUs} label={t('Your colours')} />}
              </div>
              <div className="fm-vs">{t('vs')}</div>
              <div className="fm-side">
                <div className="sec-title">{t('Opponent')}</div>
                <Picked abbr={ownThem} note={myTeam ? t('Their real roster') : t('A team at your level')} />
                <Crests value={ownThem} onPick={(a) => a !== ownUs && setThem(a)} label={t('Opponent')} />
              </div>
            </div>
            <GamePlan plan={gamePlan} onChange={setGamePlan} names={{ [career.player.pos]: career.player.name }} />
            <button className="btn primary fm-go" data-tour="floor-tip" onClick={tipOwn}>
              {t('Tip it off')}
            </button>
            {last && (
              <p className="small" role="status">
                {t('Last game: {line}', { line: t('{us} – {them}, {result}', { us: last.us, them: last.them, result: last.win ? t('you won') : t('you lost') }) })}
              </p>
            )}
          </section>
        )}

        {mode !== 'online' && mode !== 'career' && !(mode === 'playoffs' && bracket) && (
          <section className="card stack fm-setup">
            <div className="fm-teams">
              <div className="fm-side">
                <div className="sec-title">{mode === 'draft' ? t('Your colours') : t('Your team')}</div>
                <Picked abbr={us} note={t('All-time five: {n} overall', { n: Math.round(fiveOvr(legendFive(us))) })} />
                <Crests value={us} onPick={pickUs} label={t('Your team')} />
              </div>
              {mode !== 'playoffs' && (
                <>
                  <div className="fm-vs">{t('vs')}</div>
                  <div className="fm-side">
                    <div className="sec-title">{t('Opponent')}</div>
                    <Picked abbr={them} note={t('All-time five: {n} overall', { n: Math.round(fiveOvr(legendFive(them))) })} />
                    <Crests value={them} onPick={pickThem} label={t('Opponent')} />
                  </div>
                </>
              )}
            </div>
            {mode === 'draft' && (
              <div className="fm-row">
                <div className="sec-title">{t('Your draft')}</div>
                <div className="fh-draft">
                  {draft.map((pick, i) => (
                    <label key={i} className="small">
                      {t('Pick {n}', { n: i + 1 })}{' '}
                      <select value={pick} onChange={(e) => setDraft(draft.map((n, k) => (k === i ? e.target.value : n)))}>
                        {pool.map((x) => (
                          <option key={x.spot.name} value={x.spot.name} disabled={x.spot.name !== pick && draft.includes(x.spot.name)}>
                            {x.spot.name} · {x.spot.pos} · {x.spot.ovr} · {x.team}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="fm-row">
              <div className="sec-title">{t('Who you steer')}</div>
              <Five five={five} slot={steer} onPick={setSlot} sixth={mine.sixth} />
              {signatureOf(five[steer].name) && (
                <p className="small fh-sig-text">
                  <b>{signatureOf(five[steer].name)!.name}.</b> {signatureOf(five[steer].name)!.text}
                </p>
              )}
            </div>
            <details className="fh-stats">
              <summary>{t('Their real career numbers')}</summary>
              <LegendTable rows={five.map((spot) => ({ team: us, spot }))} />
            </details>
            {mode === 'quick' ? (
              <p className="small muted">{t('Everything else is set for you: each team plays its own style, at its own level, in a random era on a random court.')}</p>
            ) : (
              <>
                <GamePlan plan={gamePlan} onChange={setGamePlan} names={Object.fromEntries(five.map((l, i) => [POS[i], l.name]))} />
                <CourtPick value={court} onChange={setCourt} />
                <EraPick value={era} onChange={setEra} />
                <div className="fm-row fh-ovrs">
                  <OvrPick label={t('Your team’s overall')} real={fiveOvr(five)} value={myOvr} onChange={setMyOvr} />
                  <OvrPick label={mode === 'playoffs' ? t('Every opponent’s overall') : t('Opponent’s overall')} real={mode === 'playoffs' ? 90 : fiveOvr(legendFive(them))} value={oppOvr} onChange={setOppOvr} />
                </div>
              </>
            )}
            {mode === 'playoffs' ? (
              <button className="btn primary fm-go" onClick={() => (sfx('opened'), setLast(null), setBracket(newBracket(us, seed())))}>
                {t('Draw the bracket')}
              </button>
            ) : (
              <button className="btn primary fm-go" data-tour="floor-tip" onClick={tip}>
                {t('Tip it off')}
              </button>
            )}
            {last && mode !== 'playoffs' && (
              <p className="small" role="status">
                {t('Last game: {line}', { line: t('{us} – {them}, {result}', { us: last.us, them: last.them, result: last.win ? t('you won') : t('you lost') }) })}
              </p>
            )}
          </section>
        )}

        {mode === 'playoffs' && bracket && (
          <section className="card stack fh-playoffs">
            <div className="sec-title">
              {bracket.champion
                ? bracket.champion === bracket.me
                  ? t('Champions: the {team}', { team: nameOf(bracket.me) })
                  : t('Out in the {round}. Champions: the {team}', { round: t(ROUND_NAME[bracket.out ?? 0]).toLowerCase(), team: nameOf(bracket.champion) })
                : game
                  ? t('{round}: the {team}', { round: t(ROUND_NAME[game.round]), team: nameOf(game.home ? game.game.b : game.game.a) })
                  : ''}
            </div>
            <BracketView b={bracket} />
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              {game && (
                <button className="btn primary fm-go" onClick={() => tipPlayoff(bracket)}>
                  {t('Play the game')}
                </button>
              )}
              <button className="btn" onClick={() => setBracket(null)}>
                {bracket.champion ? t('New playoffs') : t('Leave the playoffs')}
              </button>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
