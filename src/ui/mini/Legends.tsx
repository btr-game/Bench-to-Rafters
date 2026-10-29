// Legends showdown screens (engine/mini/legends.ts).

import { useMemo, useState } from 'react';
import { FOCUS_LABEL, growRookie, legendTeams, LEGENDS, newLegends, PLAN_LABEL, playNext, playSeason, rookieTag, scoutNext, seedOf, standings, STYLE_HINT, type Focus, type LegendsState, type LTeam, type Plan } from '../../engine/mini/legends';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import type { Bracket, League, Moment } from '../../engine/types';
import { TextBracket } from '../components/TextBracket';
import { FinalReel } from '../components/Overlays';
import { MiniBonus } from './MiniBonus';

const tierOf = (rank: number) => (rank <= 3 ? 'Favorite' : rank <= 10 ? 'Contender' : rank <= 20 ? 'Dark horse' : 'Long shot');

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

export function LegendsGame() {
  const teams = useMemo(() => legendTeams().sort((a, b) => b.rating - a.rating), []);
  const [st, setSt] = useState<LegendsState | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [rookieName, setRookieName] = useState(() => `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`);
  const [bench, setBench] = useState<string | null>(null);
  const [reel, setReel] = useState(false);
  const act = (fn: (s: LegendsState) => void) => {
    if (!st) return;
    const n = structuredClone(st);
    fn(n);
    setSt(n);
    if (n.phase === 'over' && n.finals) setReel(true);
  };

  if (!st)
    return (
      <section className="stack">
        <div className="kicker">Legends showdown</div>
        <h2 className="title">Pick your franchise</h2>
        <p className="small muted">Every team plays with its all-time starting five, each player on the team where he peaked. Tap a team to see its five.</p>
        <div className="stack" style={{ gap: 8 }}>
          {teams.map((t, i) => (
            <div key={t.id} className="card stack legend-team" style={{ borderLeft: `6px solid ${t.color}` }}>
              <button
                className="legend-head"
                onClick={() => {
                  setOpen(open === t.id ? null : t.id);
                  setBench(null);
                }}
                aria-expanded={open === t.id}
              >
                <b>{t.name}</b>
                <span className={`tier-chip t-${tierOf(i + 1).replace(' ', '-').toLowerCase()}`}>{tierOf(i + 1)}</span>
                <span className="muted small">{t.five.map((p) => p.name.split(' ').slice(-1)[0]).join(' · ')}</span>
              </button>
              {open === t.id && (
                <>
                  <Five t={t} />
                  <div className="field">
                    <label htmlFor="rk-name">Your super-rookie</label>
                    <input id="rk-name" type="text" maxLength={28} value={rookieName} onChange={(e) => setRookieName(e.target.value)} />
                  </div>
                  <div className="small">He takes the place of:</div>
                  <div className="seg">
                    {t.five.map((p) => (
                      <button key={p.name} aria-pressed={bench === p.name} onClick={() => setBench(p.name)}>
                        {p.pos} {p.name.split(' ').slice(-1)[0]}
                      </button>
                    ))}
                  </div>
                  <p className="small muted">Your rookie counts {LEGENDS.rookieWeight === 3 ? 'three times' : 'twice'} as much as any legend, and his form can swing a series. Bench the right legend.</p>
                  <button className="btn" disabled={!bench || !t.five.some((p) => p.name === bench)} onClick={() => setSt(newLegends(Math.floor(Math.random() * 2 ** 31), t.id, rookieName, bench!))}>
                    Draft him and start his development
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    );

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

  return (
    <section className="stack">
      <div className="row">
        <div>
          <div className="kicker">Legends showdown</div>
          <h2 className="title">{me.name}</h2>
        </div>
        <div className="spacer" />
        {st.phase !== 'season' && st.phase !== 'grow' && (
          <div className="record">
            {me.w}–{me.l}
            <small>SEASON</small>
          </div>
        )}
      </div>
      {st.phase === 'grow' && (
        <section className="card stack">
          <div className="kicker">
            Development · year {st.rookie.season + 1} of {LEGENDS.growShare.length}
          </div>
          <div className="sec-title">{st.rookie.name}</div>
          <div className="small">
            {st.rookie.pos}, replacing {st.rookie.replaces} · OVR <b>{Math.round(st.rookie.ovr)}</b> · scouts call him{' '}
            {st.rookie.pot >= 96 ? 'a once-in-a-generation talent' : st.rookie.pot >= 92 ? 'a future MVP' : 'a future All-Star'}
          </div>
          <div className="plans">
            {(Object.keys(FOCUS_LABEL) as Focus[]).map((f) => (
              <button key={f} className="choice" onClick={() => act((s) => growRookie(s, f))}>
                <span className="label">{FOCUS_LABEL[f].name}</span>
                <small>{FOCUS_LABEL[f].text}</small>
              </button>
            ))}
          </div>
          <p className="small muted">What you work on most becomes his identity, and changes what kind of team you are.</p>
        </section>
      )}
      {st.phase === 'season' && (
        <section className="card stack">
          <div className="small">
            {st.rookie.name} is ready: OVR <b>{Math.round(st.rookie.ovr)}</b>, {FOCUS_LABEL[rookieTag(st.rookie)].name.toLowerCase()} type.
          </div>
          <Five t={me} />
          <p className="small muted">29 games: one against every other all-time five. The top eight in each conference make the playoffs.</p>
          <button className="btn block" onClick={() => act(playSeason)}>
            Play the season
          </button>
        </section>
      )}
      {st.phase === 'plan' && sc && (
        <div className="small muted">Your team: {me.five.map((p) => `${p.name.split(' ').slice(-1)[0]} ${p.ovr}`).join(' · ')}</div>
      )}
      {st.phase === 'plan' && sc && (
        <section className="card stack">
          <div className="kicker">
            {st.rounds[st.next!.round].name} · seed {seedOf(st, me.id)} vs seed {seedOf(st, sc.opp.id)}
          </div>
          <div className="sec-title">{sc.opp.name}</div>
          <Five t={sc.opp} />
          <p className="scout-hint">
            <b>Scouting:</b> {STYLE_HINT[sc.opp.style]}
          </p>
          <div className="plans">
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
        <MiniBonus result={{ game: 'legends', reached: st.champion === st.mine ? 'champion' : st.out === 'Finals' ? 'finals' : st.out === 'Conference finals' ? 'semis' : 'out' }} />
      )}
      {st.phase === 'over' && (
        <section className="card stack">
          <div className="sec-title">{st.champion === st.mine ? 'Champions of the legends' : st.out === 'the regular season' ? 'Missed the playoffs' : `Out in the ${st.out?.toLowerCase()}`}</div>
          <p className="small">Champion: {st.teams.find((t) => t.id === st.champion)?.name}</p>
          <div className="row" style={{ gap: 8 }}>
            {st.finals && (
              <button className="btn ghost" onClick={() => setReel(true)}>
                Watch the last game again
              </button>
            )}
            <button className="btn" onClick={() => setSt(null)}>
              Play again
            </button>
          </div>
        </section>
      )}
      {st.log.length > 0 && (
        <section className="card stack">
          <div className="sec-title">Your run</div>
          {st.log.map((l, i) => (
            <div key={i} className="small">
              {l}
            </div>
          ))}
        </section>
      )}
      {b.rounds.length > 0 && (
        <section className="card stack">
          <div className="sec-title">Bracket</div>
          <TextBracket b={b} league={lg} userTeamId={st.mine} />
        </section>
      )}
      {st.phase !== 'season' && st.phase !== 'grow' && (
        <section className="card stack">
          <div className="sec-title">Standings</div>
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
        </section>
      )}
    </section>
  );
}
