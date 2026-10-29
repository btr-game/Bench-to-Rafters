// Legends showdown screens (engine/mini/legends.ts).

import { useMemo, useState } from 'react';
import { legendTeams, newLegends, PLAN_LABEL, playNext, playSeason, scoutNext, seedOf, standings, STYLE_HINT, type LegendsState, type LTeam, type Plan } from '../../engine/mini/legends';
import type { Bracket, League, Moment } from '../../engine/types';
import { TextBracket } from '../components/TextBracket';
import { FinalReel } from '../components/Overlays';

const tierOf = (rank: number) => (rank <= 3 ? 'Favorite' : rank <= 10 ? 'Contender' : rank <= 20 ? 'Dark horse' : 'Long shot');

function Five({ t }: { t: LTeam }) {
  return (
    <div className="five">
      {t.five.map((p) => (
        <div key={p.name} className="five-row">
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
              <button className="legend-head" onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id}>
                <b>{t.name}</b>
                <span className={`tier-chip t-${tierOf(i + 1).replace(' ', '-').toLowerCase()}`}>{tierOf(i + 1)}</span>
                <span className="muted small">{t.five.map((p) => p.name.split(' ').slice(-1)[0]).join(' · ')}</span>
              </button>
              {open === t.id && (
                <>
                  <Five t={t} />
                  <button className="btn" onClick={() => setSt(newLegends(Math.floor(Math.random() * 2 ** 31), t.id))}>
                    Play as the {t.name}
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
        {st.phase !== 'season' && (
          <div className="record">
            {me.w}–{me.l}
            <small>SEASON</small>
          </div>
        )}
      </div>
      {st.phase === 'season' && (
        <section className="card stack">
          <Five t={me} />
          <p className="small muted">29 games: one against every other all-time five. The top eight in each conference make the playoffs.</p>
          <button className="btn block" onClick={() => act(playSeason)}>
            Play the season
          </button>
        </section>
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
      {st.phase !== 'season' && (
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
