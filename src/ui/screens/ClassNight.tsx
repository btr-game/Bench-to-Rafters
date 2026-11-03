// Round 35, the draft class's own pages (owner, from the ideas kept: "watch a friend's career: of
// course"; reactions on a friend's season; "a friends-only board for the daily challenge: oh yeah
// that's a good idea"; and reunion night: "combining them all in reunion night, revealing each of
// them one at a time (class MVP, most career points, most assists, wealth, ..., from least
// important to most, so class MVP should be last)").

import { useEffect, useMemo, useState } from 'react';
import { CardActions } from './CareerLog';
import { Icon } from '../art/Icon';
import { ReunionArt } from '../art/Reunion';
import { sfx } from '../sound';
import { username } from '../names';
import { LEVEL_SHORT, EMOTES, multiplayer, reunionAwards, reunionReady, reunionWon, REUNION_WAIT_DAYS, MP_FAIL, type ClassMember, type DailyRow, type DraftClass, type Emote, type Multiplayer } from '../multiplayer';
import { scoreOf } from '../community';
import { recordMp, recordReunion } from '../achievements';
import { achievementsNow } from '../../store';

// ---------- reactions ----------

/** A season's reactions, small: each kind with its count (his own marked). */
export function ReactCounts({ m, year }: { m: ClassMember; year: number }) {
  const rs = (m.reacts ?? []).filter((r) => r.y === year);
  if (!rs.length) return null;
  return (
    <span className="mp-reacts" aria-label={`Reactions: ${rs.map((r) => `${r.n} ${EMOTES.find((e) => e.k === r.e)?.label}`).join(', ')}`}>
      {rs.map((r) => (
        <span key={r.e} className={r.mine ? 'mine' : undefined}>
          <Icon name={EMOTES.find((e) => e.k === r.e)?.icon ?? 'flame'} size={16} />
          {r.n}
        </span>
      ))}
    </span>
  );
}

/** The four reactions on a classmate's season: tap one (tap it again to take it back). */
function ReactBar({ mp, code, m, year, done }: { mp: Multiplayer; code: string; m: ClassMember; year: number; done: () => void }) {
  const [err, setErr] = useState('');
  const mine = (m.reacts ?? []).find((r) => r.y === year && r.mine)?.e ?? null;
  const pick = async (e: Emote) => {
    const r = await mp.react(code, m.id, year, mine === e ? null : e);
    if (r === 'ok') {
      sfx(mine === e ? 'click' : 'react');
      if (mine !== e && recordMp('react', `${code}:${m.id}:${year}`)) achievementsNow();
      setErr('');
      done();
    } else setErr(r === 'busy' ? 'One at a time.' : MP_FAIL[r]);
  };
  return (
    <span className="mp-react-bar" role="group" aria-label={`React to ${m.name}’s ${year}`}>
      {EMOTES.map((e) => {
        const n = (m.reacts ?? []).find((r) => r.y === year && r.e === e.k)?.n ?? 0;
        return (
          <button key={e.k} className={`chip${mine === e.k ? ' on' : ''}`} aria-pressed={mine === e.k} aria-label={e.label} title={e.label} onClick={() => void pick(e.k)}>
            <Icon name={e.icon} size={18} />
            {n > 0 && <small>{n}</small>}
          </button>
        );
      })}
      {err && <small style={{ color: 'var(--bad)' }}>{err}</small>}
    </span>
  );
}

// ---------- a friend's career, season by season ----------

/** A classmate's career as it goes: his rating each season as a pixel chart, every season's line
 * with its honours (and the reactions), and his card once he has retired. */
export function FriendCareer({ mp, k, m, back, changed }: { mp: Multiplayer; k: DraftClass; m: ClassMember; back: () => void; changed: () => void }) {
  const me = k.members.find((x) => x.mine);
  const canReact = !!me && !m.mine;
  const ss = m.seasons;
  const last = ss[ss.length - 1];
  const W = Math.max(ss.length, 1);
  useEffect(() => {
    if (!m.mine && recordMp('watched', `${k.code}:${m.id}`)) achievementsNow();
  }, [k.code, m.id, m.mine]);
  return (
    <section className="card stack mp-friend">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <div className="kicker">{m.mine ? 'Your career' : `${m.name}’s career`}</div>
          <div className="sec-title">{m.rec?.name ?? last?.pn ?? m.name}</div>
        </div>
        <button className="btn ghost small" onClick={back}>
          Back to the class
        </button>
      </div>
      <p className="small muted desc">
        {m.rec ? `Retired at ${m.rec.retiredAt}: ${m.rec.tier}, peak ${Math.round(m.rec.peak)}, career index ${Math.round(scoreOf(m.rec))}.` : last ? `Now: ${LEVEL_SHORT[last.lv] ?? last.lv}, ${last.team}, age ${last.age}, rated ${last.ovr}.` : 'Not started yet.'}
      </p>
      {ss.length > 1 && (
        // his rating each season, a bar a year (pixel art: square cells, hard edges)
        <svg className="mp-ovr-chart" viewBox={`0 0 ${W * 6} 40`} shapeRendering="crispEdges" role="img" aria-label={`Rating by season: ${ss.map((s) => `${s.year} ${s.ovr}`).join(', ')}`}>
          {ss.map((s, i) => {
            const h = Math.max(2, Math.round(((s.ovr - 40) / 60) * 36));
            return <rect key={s.year} x={i * 6 + 1} y={40 - h} width={4} height={h} fill={s.aw.length ? 'var(--gold)' : s.color || 'var(--accent)'} />;
          })}
        </svg>
      )}
      <ol className="mp-friend-years">
        {[...ss].reverse().map((s) => (
          <li key={s.year}>
            <span className="mp-friend-year">
              <b>{s.year}</b> <small className="muted">age {s.age}</small>
            </span>
            <span className="mp-cell">
              <span>
                <i className="sw" style={{ background: s.color }} />
                {LEVEL_SHORT[s.lv] ?? s.lv} · {s.team} · {s.w}-{s.l}
              </span>
              <small>
                {s.ovr} OVR · {s.pts} pts {s.reb} reb {s.ast} ast{s.gp ? ` · ${s.gp} games` : ''}
                {s.result ? ` · ${s.result}` : ''}
              </small>
              {s.aw.length > 0 && <small className="mp-aw">{s.aw.join(' · ')}</small>}
            </span>
            {canReact ? <ReactBar mp={mp} code={k.code} m={m} year={s.year} done={changed} /> : <ReactCounts m={m} year={s.year} />}
          </li>
        ))}
      </ol>
      {m.rec && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <CardActions rec={m.rec} />
        </div>
      )}
    </section>
  );
}

// ---------- reunion night ----------

/** The class's last night together: every award revealed one at a time, the least first and the
 * class MVP last. Until every career is over, a line says how many have retired. */
export function ReunionNight({ k }: { k: DraftClass }) {
  const ready = reunionReady(k);
  const awards = useMemo(() => reunionAwards(k), [k]);
  const [at, setAt] = useState(-1);
  if (!ready.ready)
    return (
      <section className="card stack mp-reunion-wait">
        <div className="sec-title with-icon">
          <Icon name="laurel" size={24} />
          Reunion night
        </div>
        <ReunionArt seats={Math.max(2, ready.total)} />
        <p className="small muted desc">
          When every career in the class is over, the class meets one last time and the awards come out one by one, the class MVP last. {ready.done} of {ready.total || 'its'} careers are over; a friend who posts nothing for {REUNION_WAIT_DAYS} days counts as he stands.
        </p>
      </section>
    );
  const next = () => {
    const n = at + 1;
    setAt(n);
    // the class MVP gets the championship sound; every other award a toast
    sfx(n === awards.length - 1 ? 'title' : 'toast');
    const won = reunionWon(awards);
    if (n === awards.length - 1 && recordReunion(k.code, won.length, awards.length, won.includes('mvp'))) achievementsNow();
  };
  const shown = awards.slice(0, at + 1);
  const cur = at >= 0 ? awards[at] : null;
  const lastOne = at === awards.length - 1;
  return (
    <section className="card stack mp-reunion">
      <div className="kicker">{k.name} · reunion night</div>
      <div className="sec-title with-icon">
        <Icon name="laurel" size={28} />
        Reunion night
      </div>
      <ReunionArt seats={awards[0]?.rows.length ?? 6} lit={at >= 0} />
      {at < 0 ? (
        <p className="prose">Every career in the class is over. {awards.length} awards tonight, one at a time, from the smallest to the one that matters most: the class MVP.</p>
      ) : (
        cur && (
          <div className={`mp-award${lastOne ? ' mvp' : ''}`} key={cur.key} aria-live="polite">
            <Icon name={cur.icon} size={lastOne ? 56 : 44} />
            <div className="stack" style={{ gap: 4 }}>
              <small className="kicker">
                Award {at + 1} of {awards.length} · {cur.what}
              </small>
              <div className="mp-award-title">{cur.title}</div>
              <div className="mp-award-win">
                {cur.rows[0]?.m.mine ? 'You' : cur.rows[0]?.m.name} <span className="muted">· {cur.rows[0]?.m.rec?.name ?? cur.rows[0]?.m.seasons.at(-1)?.pn}</span> · <b>{cur.rows[0]?.text}</b>
              </div>
              <ol className="mp-award-rest" start={2}>
                {cur.rows.slice(1).map((r) => (
                  <li key={r.m.id} className={r.m.mine ? 'me' : undefined}>
                    {r.m.mine ? 'You' : r.m.name}: {r.text}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )
      )}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {!lastOne ? (
          <button className="btn" onClick={next}>
            {at < 0 ? 'Start the night' : `Next award (${at + 2} of ${awards.length})`}
          </button>
        ) : (
          <button className="btn ghost" onClick={() => setAt(-1)}>
            See the night again
          </button>
        )}
      </div>
      {shown.length > 1 && (
        <ul className="mp-award-list" aria-label="Awards so far">
          {shown.slice(0, -1).map((a) => (
            <li key={a.key}>
              <Icon name={a.icon} size={18} /> <b>{a.title}</b>: {a.rows[0]?.m.mine ? 'You' : a.rows[0]?.m.name} ({a.rows[0]?.text})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- the daily challenge, among friends ----------

/** Today's daily challenge board of his friends: the people he shares a class or a challenge with
 * (the server decides who). Online only; posts his best run of the day first, when there is one. */
export function DailyFriends({ day, best }: { day: string; best: { points: number; legacy: number; peak: number } | null }) {
  const [rows, setRows] = useState<DailyRow[] | 'error' | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void (async () => {
      const mp = await multiplayer();
      if (!mp) return live && setRows(null);
      if (best && username()) await mp.dailyPost(day, username(), best.points, best.legacy, best.peak);
      const r = await mp.dailyFriends(day);
      if (live) setRows(r);
      if (r !== 'error' && r.length >= 2 && r[0].mine && recordMp('dailyTop', day)) achievementsNow();
    })();
    return () => {
      live = false;
    };
    // a better run of the day posts again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, best?.points]);
  if (rows === null) return null;
  return (
    <section className="card stack mp-daily">
      <div className="sec-title with-icon">
        <Icon name="versus" size={24} />
        Friends today
      </div>
      <p className="small muted desc">Today’s daily challenge among your friends: everyone you share a draft class or a challenge with.{!username() ? ' Pick a username (in Settings) to put your run on it.' : ''}</p>
      {rows === undefined ? (
        <p className="small muted">Loading…</p>
      ) : rows === 'error' ? (
        <p className="small muted">{MP_FAIL.error}</p>
      ) : rows.length === 0 ? (
        <p className="small muted keep">No friend has played today’s yet.</p>
      ) : (
        <ol className="mp-board-list">
          {rows.map((r, i) => (
            <li key={`${r.name}-${i}`} className={r.mine ? 'me' : undefined}>
              <b>{i + 1}</b>
              <span>{r.mine ? 'You' : r.name}</span>
              <small>
                {r.legacy} legacy · peak {r.peak}
              </small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
