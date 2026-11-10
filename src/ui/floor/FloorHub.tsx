// The Floor, a game of its own (round 42, owner: "let's take it out of minigames and develop it into
// a larger one"): its page, opened from the arena on the main land (the store's page 'floor').
// Four ways to play: a quick game (the fourth quarter) as any franchise's legends, the playoffs
// (sixteen franchises, one four-minute game a round), a five drafted from all 150 legends, and a
// friend online. Each side's overall is its own to set.

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE } from '../../content/teamStyle';
import type { LegendSpot } from '../../content/franchiseFives';
import type { Pos } from '../../engine/types';
import { ALL_LEGENDS, fiveOvr, legendFive, legendLine } from '../../engine/floor/legends';
import { BRACKET_ROUNDS, finishBracket, franchise, legendSetup, myGame, newBracket, playRound, winnerOf, type Bracket, type FloorSide } from '../../engine/floor/game';
import type { FloorResult, FloorSetup } from '../../engine/floor/sim';
import { useStore } from '../../store';
import { t, tx } from '../../i18n';
import { PageTop } from '../components/PageTop';
import { TeamArt } from '../art/Crest';
import { Icon } from '../art/Icon';
import { sfx } from '../sound';
import { FloorScreen, type FloorTeamLook } from './FloorScreen';
import { FloorFriend } from './FloorFriend';

type Mode = 'quick' | 'playoffs' | 'draft' | 'online';
const MODES: { id: Mode; name: string; text: string }[] = [
  { id: 'quick', name: tx('Quick game'), text: tx('The fourth quarter from a close score, as any franchise’s all-time five. About four minutes.') },
  { id: 'playoffs', name: tx('Playoffs'), text: tx('Sixteen franchises, one game a round, four wins to the title. Each game is all four quarters in about four minutes.') },
  { id: 'draft', name: tx('Draft your five'), text: tx('One legend for each position from all 150, then a quick game against a franchise.') },
  { id: 'online', name: tx('Online'), text: tx('Head to head with a friend by room code, or a quick match with whoever is waiting.') },
];
const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
const ALL = NBA_TEAMS.map((x) => ({ abbr: x.abbr, name: `${x.city} ${x.nick}`, color: x.color }));
const nameOf = (abbr: string) => ALL.find((x) => x.abbr === abbr)?.name ?? abbr;
const ROUND_NAME = [tx('First round'), tx('Quarter-finals'), tx('Semi-finals'), tx('The final')];

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
      <button className={`chip${value === null ? ' on' : ''}`} aria-pressed={value === null} onClick={() => onChange(null)}>
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
function Five({ five, slot, onPick }: { five: LegendSpot[]; slot: number; onPick: (i: number) => void }) {
  return (
    <div className="fm-five fh-five" role="group" aria-label={t('Who you steer')}>
      {five.map((l, i) => (
        <button key={l.name} className={`fm-starter${slot === i ? ' on' : ''}`} aria-pressed={slot === i} onClick={() => onPick(i)}>
          <small>{POS[i]}</small>
          <span>{l.ovr}</span>
          <b>{l.name}</b>
          <i className="fh-line">{lineOf(l.name)}</i>
        </button>
      ))}
    </div>
  );
}

const best = (five: LegendSpot[]): number => five.reduce((k, l, i) => (l.ovr > five[k].ovr ? i : k), 0);

interface Plan {
  setup: FloorSetup;
  kits: [string, string];
  key: number;
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
      <FloorScreen key={plan.key} setup={plan.setup} arena={{ c1: us.c1, c2: us.c2, c3: us.c3 }} looks={looks} onDone={onDone} onAgain={onAgain} lose={t('You lost')} />
    </div>,
    document.body,
  );
}

function BracketView({ b }: { b: Bracket }) {
  return (
    <div className="fh-bracket" aria-label={t('The bracket')}>
      {Array.from({ length: BRACKET_ROUNDS }, (_, r) => (
        <div key={r} className="fh-round">
          <div className="fh-round-name">{t(ROUND_NAME[r])}</div>
          {(b.rounds[r] ?? []).map((g, k) => {
            const w = winnerOf(g);
            return (
              <div key={k} className={`fh-tie${g.a === b.me || g.b === b.me ? ' mine' : ''}`}>
                {[g.a, g.b].map((a, i) => (
                  <div key={a} className={`fh-team${w === a ? ' won' : w ? ' lost' : ''}`}>
                    <TeamArt name={nameOf(a)} abbr={a} color={ALL.find((x) => x.abbr === a)!.color} league="NBA" size={22} />
                    <span>{a}</span>
                    <b>{g.score ? g.score[i] : ''}</b>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function FloorPage() {
  const setPage = useStore((s) => s.setPage);
  const [mode, setMode] = useState<Mode>('quick');
  const [us, setUs] = useState('CHI');
  const [them, setThem] = useState('LAL');
  const [slot, setSlot] = useState<number | null>(null);
  const [myOvr, setMyOvr] = useState<number | null>(null);
  const [oppOvr, setOppOvr] = useState<number | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [last, setLast] = useState<FloorResult | null>(null);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  // the draft: one legend for each position
  const [draft, setDraft] = useState<string[]>(() => POS.map((p) => ALL_LEGENDS.filter((x) => x.spot.pos === p).sort((a, b) => b.spot.ovr - a.spot.ovr)[0].spot.name));
  const pool = useMemo(() => POS.map((p) => ALL_LEGENDS.filter((x) => x.spot.pos === p).sort((a, b) => b.spot.ovr - a.spot.ovr || (a.spot.name < b.spot.name ? -1 : 1))), []);

  const drafted: LegendSpot[] = draft.map((n) => ALL_LEGENDS.find((x) => x.spot.name === n)!.spot);
  const five = mode === 'draft' ? drafted : legendFive(us);
  const steer = slot !== null && slot < five.length ? slot : best(five);
  const mine: FloorSide = mode === 'draft' ? { ...franchise(us, myOvr ?? undefined), name: t('Your five'), five: drafted } : franchise(us, myOvr ?? undefined);

  const pickUs = (a: string) => {
    if (a === them) setThem(us);
    setUs(a);
    setSlot(null);
  };
  const pickThem = (a: string) => {
    if (a === us) setUs(them);
    setThem(a);
  };
  const seed = () => 1 + Math.floor(Math.random() * 1e9);
  const tip = () => {
    sfx('opened');
    setLast(null);
    setPlan({ setup: legendSetup({ seed: seed(), us: mine, them: franchise(them, oppOvr ?? undefined), user: steer, length: 'fourth' }), kits: [us, them], key: Date.now() });
  };
  const tipPlayoff = (b: Bracket) => {
    const g = myGame(b);
    if (!g) return;
    const opp = g.home ? g.game.b : g.game.a;
    setPlan({ setup: legendSetup({ seed: b.seed + b.rounds.length * 7919, us: mine, them: franchise(opp, oppOvr ?? undefined), user: steer, length: 'full' }), kits: [us, opp], key: Date.now() });
  };

  if (plan)
    return (
      <Court
        plan={plan}
        onAgain={mode === 'playoffs' ? undefined : tip}
        onDone={(r) => {
          setPlan(null);
          setLast(r);
          if (mode === 'playoffs' && bracket) {
            const b = playRound(bracket, [r.us, r.them], oppOvr ?? undefined);
            setBracket(b.out !== null && !b.champion ? finishBracket(b, oppOvr ?? undefined) : b);
          }
        }}
      />
    );

  const game = bracket ? myGame(bracket) : null;
  return (
    <div className="wrap">
      <PageTop trail={[t('The Floor')]} back={() => setPage(null)} />
      <section className="stack stage-in fh">
        <div>
          <div className="kicker">{t('Five on five')}</div>
          <h1 className="hub-title with-icon">
            <Icon name="floor" size={40} />
            {t('The Floor')}
          </h1>
        </div>
        <div className="fh-modes" role="tablist" aria-label={t('How to play')}>
          {MODES.map((m) => (
            <button key={m.id} role="tab" aria-selected={mode === m.id} className={`fh-mode${mode === m.id ? ' on' : ''}`} onClick={() => (setMode(m.id), setLast(null))}>
              <b>{t(m.name)}</b>
              <span className="prose small">{t(m.text)}</span>
            </button>
          ))}
        </div>

        {mode === 'online' && <FloorFriend />}

        {mode !== 'online' && !(mode === 'playoffs' && bracket) && (
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
                  {POS.map((p, i) => (
                    <label key={p} className="small">
                      {p}{' '}
                      <select value={draft[i]} onChange={(e) => setDraft(draft.map((n, k) => (k === i ? e.target.value : n)))}>
                        {pool[i].map((x) => (
                          <option key={x.spot.name} value={x.spot.name}>
                            {x.spot.name} · {x.spot.ovr} · {x.team}
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
              <Five five={five} slot={steer} onPick={setSlot} />
            </div>
            <div className="fm-row fh-ovrs">
              <OvrPick label={t('Your team’s overall')} real={fiveOvr(five)} value={myOvr} onChange={setMyOvr} />
              <OvrPick label={mode === 'playoffs' ? t('Every opponent’s overall') : t('Opponent’s overall')} real={mode === 'playoffs' ? 90 : fiveOvr(legendFive(them))} value={oppOvr} onChange={setOppOvr} />
            </div>
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
