// Legends showdown screens (engine/mini/legends.ts). Round 12b: a tighter layout (teams by tier
// in one-line rows, setup as its own step, the matchup side by side, run / bracket / standings
// in tabs) and a soft transition between every step.

import { useMemo, useState } from 'react';
import { FOCUS_LABEL, growRookie, legendTeams, LEGENDS, newLegends, PLAN_LABEL, playNext, playSeason, rookieTag, scoutNext, seedOf, standings, STYLE_HINT, type Focus, type LegendsState, type LTeam, type Plan } from '../../engine/mini/legends';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import type { Bracket, League, Moment } from '../../engine/types';
import { TextBracket } from '../components/TextBracket';
import { FinalReel } from '../components/Overlays';
import { MiniBonus } from './MiniBonus';

const TIERS = ['Favorite', 'Contender', 'Dark horse', 'Long shot'] as const;
const tierOf = (rank: number) => (rank <= 3 ? TIERS[0] : rank <= 10 ? TIERS[1] : rank <= 20 ? TIERS[2] : TIERS[3]);
const TIER_PLURAL: Record<(typeof TIERS)[number], string> = { Favorite: 'Favorites', Contender: 'Contenders', 'Dark horse': 'Dark horses', 'Long shot': 'Long shots' };
const last = (name: string) => name.split(' ').slice(-1)[0];

function Five({ t }: { t: LTeam }) {
  return (
    <div className="five">
      {t.five.map((p) => (
        <div key={p.name} className={`five-row${p.rookie ? ' mine' : ''}`}>
          <span>{p.pos}</span>
          <b>{p.name}</b>
          <span>{p.ovr}</span>
          <span className="muted small">{p.peak}</span>
        </div>
      ))}
    </div>
  );
}

function asLeague(st: LegendsState): { b: Bracket; lg: League } {
  const seeds: Record<string, number> = {};
  for (const t of st.teams) seeds[t.id] = seedOf(st, t.id);
  const b: Bracket = {
    rounds: st.rounds.map((r) => ({ name: r.name, series: r.series.filter((s) => s.winner).map((s) => ({ a: s.a, b: s.b, wa: s.wa, wb: s.wb, winner: s.winner, games: s.games })) })).filter((r) => r.series.length > 0),
    champion: st.champion ?? '',
    seeds,
  };
  const lg = { level: 'NBA', year: 0, teams: st.teams.map((t) => ({ id: t.id, name: t.name, short: t.id, abbr: t.id, color: t.color, conf: t.conf, strength: t.rating, w: t.w, l: t.l, roster: [] })), userTeamId: st.mine, round: 0, rounds: 0, bracket: b } as League;
  return { b, lg };
}

/** Step 1: every franchise in one line, grouped by tier. */
function Picker({ teams, onPick }: { teams: LTeam[]; onPick: (id: string) => void }) {
  return (
    <section className="stack stage-in">
      <div className="kicker">Legends showdown</div>
      <h2 className="title">Pick your franchise</h2>
      <p className="small muted">Every team plays with its all-time starting five. You add one super-rookie.</p>
      {TIERS.map((tier) => {
        const list = teams.filter((_, i) => tierOf(i + 1) === tier);
        return (
          <div key={tier} className="stack lg-tier">
            <div className={`lg-tier-head t-${tier.replace(' ', '-').toLowerCase()}`}>
              {TIER_PLURAL[tier]} <span className="muted">{list.length}</span>
            </div>
            {list.map((t) => (
              <button key={t.id} className="lg-row" style={{ ['--team' as string]: t.color }} onClick={() => onPick(t.id)}>
                <b>{t.name}</b>
                <span className="muted small">{t.five.map((p) => last(p.name)).join(' · ')}</span>
                <span className="lg-rating">{t.rating.toFixed(1)}</span>
              </button>
            ))}
          </div>
        );
      })}
    </section>
  );
}

/** Step 2: name the rookie and tap the legend he replaces. */
function Setup({ t, onBack, onStart }: { t: LTeam; onBack: () => void; onStart: (name: string, bench: string) => void }) {
  const [name, setName] = useState(() => `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`);
  const [bench, setBench] = useState<string | null>(null);
  return (
    <section className="stack stage-in">
      <button className="link-btn" onClick={onBack}>
        ← All teams
      </button>
      <section className="card stack lg-setup" style={{ ['--team' as string]: t.color }}>
        <div className="kicker">Your franchise</div>
        <h2 className="title">{t.name}</h2>
        <div className="field">
          <label htmlFor="rk-name">Your super-rookie</label>
          <input id="rk-name" type="text" maxLength={28} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="small">Tap the legend he replaces:</div>
        <div className="stack lg-bench">
          {t.five.map((p) => {
            const on = bench === p.name;
            return (
              <button key={p.name} className={`lg-bench-row${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setBench(p.name)}>
                <span className="lg-pos">{p.pos}</span>
                <span className="lg-who">
                  <s>{p.name}</s>
                  <b>{name.trim() || 'The Rookie'}</b>
                </span>
                <span className="lg-ovr">{on ? 'rookie' : p.ovr}</span>
              </button>
            );
          })}
        </div>
        <p className="small muted">The rookie counts {LEGENDS.rookieWeight === 3 ? 'three times' : 'twice'} as much as a legend, and his form can swing a series.</p>
        <button className="btn" disabled={!bench} onClick={() => onStart(name, bench!)}>
          Draft him
        </button>
      </section>
    </section>
  );
}

export function LegendsGame() {
  const teams = useMemo(() => legendTeams().sort((a, b) => b.rating - a.rating), []);
  const [st, setSt] = useState<LegendsState | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [reel, setReel] = useState(false);
  const [note, setNote] = useState('');
  const [tab, setTab] = useState<'run' | 'bracket' | 'table'>('run');
  const [scout, setScout] = useState(false);
  const act = (fn: (s: LegendsState) => string | void) => {
    if (!st) return;
    const n = structuredClone(st);
    const out = fn(n);
    setNote(typeof out === 'string' ? out : '');
    setScout(false);
    setSt(n);
    if (n.phase === 'over' && n.finals) setReel(true);
  };

  if (!st) {
    const t = teams.find((x) => x.id === pick);
    return t ? (
      <Setup key={t.id} t={t} onBack={() => setPick(null)} onStart={(name, bench) => setSt(newLegends(Math.floor(Math.random() * 2 ** 31), t.id, name, bench))} />
    ) : (
      <Picker teams={teams} onPick={setPick} />
    );
  }

  const me = st.teams.find((t) => t.id === st.mine)!;
  const sc = scoutNext(st);
  const { b, lg } = asLeague(st);

  if (reel && st.finals) {
    const f = st.finals;
    const opp = st.teams.find((t) => t.id === f.opp)!;
    const m: Moment = {
      id: 1,
      kind: f.won ? 'title' : 'tournament',
      title: `${me.name}`,
      text: f.won ? 'Champions of the legends.' : `The ${opp.name} end your run in the ${f.round.toLowerCase()}.`,
      color: me.color,
      game: { n: 1, opp: opp.id, home: true, res: f.won ? 'W' : 'L', us: f.us, them: f.them, line: null, post: `${f.round}, last game`, level: 'NBA', teamShort: me.id },
      drama: f.drama,
      lostFinal: !f.won,
    };
    return (
      <div className="overlay moment title" style={{ ['--team' as string]: me.color }}>
        <div className="overlay-inner">
          <FinalReel m={m} />
          <button className="btn moment-btn" onClick={() => setReel(false)}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  const r = st.rookie;
  const years = LEGENDS.growShare.length;
  const started = st.phase === 'plan' || st.phase === 'over';
  // the stage key changes with every step, so each one fades in
  const stage = `${st.phase}-${r.season}-${st.next?.round ?? ''}-${st.next?.opp ?? ''}`;
  const champ = st.champion === st.mine;

  return (
    <section className="stack">
      <div className="row lg-top" style={{ ['--team' as string]: me.color }}>
        <div>
          <div className="kicker">Legends showdown</div>
          <h2 className="title">{me.name}</h2>
        </div>
        <div className="spacer" />
        {started && (
          <div className="record">
            {me.w}–{me.l}
            <small>SEASON</small>
          </div>
        )}
      </div>

      <div key={stage} className="stack stage-in">
        {st.phase === 'grow' && (
          <section className="card stack">
            <div className="row">
              <div className="kicker">
                Development · year {r.season + 1} of {years}
              </div>
              <div className="spacer" />
              <div className="lg-dots" aria-hidden="true">
                {Array.from({ length: years }, (_, k) => (
                  <i key={k} className={k < r.season ? 'done' : k === r.season ? 'now' : ''} />
                ))}
              </div>
            </div>
            <div className="lg-rookie">
              <div>
                <div className="sec-title">{r.name}</div>
                <div className="small muted">
                  {r.pos} · replacing {last(r.replaces)} · {r.pot >= 96 ? 'a once-in-a-generation talent' : r.pot >= 92 ? 'a future MVP' : 'a future All-Star'}
                </div>
              </div>
              <div className="lg-big">{Math.round(r.ovr)}</div>
            </div>
            <div className="lg-meter" aria-hidden="true">
              <div style={{ width: `${Math.max(0, Math.min(100, ((r.ovr - 60) / 39) * 100))}%` }} />
            </div>
            {note && <p className="small lg-note">{note}</p>}
            <div className="plans compact">
              {(Object.keys(FOCUS_LABEL) as Focus[]).map((f) => (
                <button key={f} className="choice" onClick={() => act((s) => growRookie(s, f))}>
                  <span className="label">{FOCUS_LABEL[f].name}</span>
                  <small>{FOCUS_LABEL[f].text}</small>
                </button>
              ))}
            </div>
            <p className="small muted">What he works on most becomes his identity, and changes what kind of team you are.</p>
          </section>
        )}

        {st.phase === 'season' && (
          <section className="card stack">
            <div className="lg-rookie">
              <div>
                <div className="kicker">Ready</div>
                <div className="sec-title">{r.name}</div>
                <div className="small muted">{FOCUS_LABEL[rookieTag(r)].name} type</div>
              </div>
              <div className="lg-big">{Math.round(r.ovr)}</div>
            </div>
            {note && <p className="small lg-note">{note}</p>}
            <Five t={me} />
            <p className="small muted">29 games, one against every other all-time five. The top eight in each conference make the playoffs.</p>
            <button className="btn block" onClick={() => act(playSeason)}>
              Play the season
            </button>
          </section>
        )}

        {st.phase === 'plan' && sc && (
          <section className="card stack">
            <div className="kicker">{st.rounds[st.next!.round].name}</div>
            <div className="lg-match">
              <div className="lg-side" style={{ ['--team' as string]: me.color }}>
                <span className="small muted">Seed {seedOf(st, me.id)}</span>
                <b>{me.name}</b>
                <span className="lg-rating">{me.rating.toFixed(1)}</span>
              </div>
              <div className="lg-vs">vs</div>
              <div className="lg-side" style={{ ['--team' as string]: sc.opp.color }}>
                <span className="small muted">Seed {seedOf(st, sc.opp.id)}</span>
                <b>{sc.opp.name}</b>
                <span className="lg-rating">{sc.opp.rating.toFixed(1)}</span>
              </div>
            </div>
            <p className="scout-hint">
              <b>Scouting:</b> {STYLE_HINT[sc.opp.style]}
            </p>
            <button className="link-btn" aria-expanded={scout} onClick={() => setScout(!scout)}>
              {scout ? 'Hide' : 'See'} their five
            </button>
            <div className={`lg-fold${scout ? ' open' : ''}`}>
              <div>
                <Five t={sc.opp} />
              </div>
            </div>
            <div className="plans compact">
              {(Object.keys(PLAN_LABEL) as Plan[]).map((p) => (
                <button key={p} className="choice" onClick={() => act((s) => playNext(s, p))}>
                  <span className="label">{PLAN_LABEL[p].name}</span>
                  <small>{PLAN_LABEL[p].text}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        {st.phase === 'over' && (
          <section className={`card stack lg-over${champ ? ' won' : ''}`} style={{ ['--team' as string]: me.color }}>
            <div className="kicker">{champ ? 'Champions' : 'Season over'}</div>
            <h2 className="title">{champ ? 'Champions of the legends' : st.out === 'the regular season' ? 'Missed the playoffs' : `Out in the ${st.out?.toLowerCase()}`}</h2>
            {!champ && <p className="small">Champion: {st.teams.find((t) => t.id === st.champion)?.name}</p>}
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {st.finals && (
                <button className="btn ghost" onClick={() => setReel(true)}>
                  Watch the last game
                </button>
              )}
              <button
                className="btn"
                onClick={() => {
                  setSt(null);
                  setPick(null);
                  setNote('');
                  setTab('run');
                }}
              >
                Play again
              </button>
            </div>
          </section>
        )}
        {st.phase === 'over' && <MiniBonus result={{ game: 'legends', reached: champ ? 'champion' : st.out === 'Finals' ? 'finals' : st.out === 'Conference finals' ? 'semis' : 'out' }} />}
      </div>

      {started && (
        <section className="card stack">
          <div className="seg lg-tabs" role="tablist">
            {(
              [
                ['run', 'Your run'],
                ['bracket', 'Bracket'],
                ['table', 'Standings'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </div>
          <div key={tab} className="stage-in">
            {tab === 'run' && (
              <div className="stack lg-log">
                {st.log.map((l, i) => (
                  <div key={i} className="small">
                    {l}
                  </div>
                ))}
              </div>
            )}
            {tab === 'bracket' && (b.rounds.length > 0 ? <TextBracket b={b} league={lg} userTeamId={st.mine} /> : <p className="small muted">The playoffs have not started.</p>)}
            {tab === 'table' && (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="l">Team</th>
                      <th>W</th>
                      <th>L</th>
                      <th>Seed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings(st).map((t) => (
                      <tr key={t.id} className={t.id === st.mine ? 'me' : ''}>
                        <td className="l">{t.name}</td>
                        <td>{t.w}</td>
                        <td>{t.l}</td>
                        <td>
                          {seedOf(st, t.id)} {t.conf}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
