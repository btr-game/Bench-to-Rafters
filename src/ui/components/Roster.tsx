// Round 9: building the starting five (NBA, first option only) and the league's storylines.

import type { GameState } from '../../engine/types';
import { STARTERS_RECRUIT } from '../../engine/balance';
import { canRecruit, recruitInfo, scoutingBoard, starters } from '../../engine/career/recruit';
import { STORY_LABEL } from '../../engine/world/stories';
import { ovrOf } from '../../engine/player/ovr';
import { fmtMoney } from '../../engine/economy/salary';
import { useStore } from '../../store';

export function RecruitCard({ g }: { g: GameState }) {
  const recruit = useStore((s) => s.recruit);
  const cut = useStore((s) => s.payCut);
  if (!canRecruit(g)) return null;
  const info = recruitInfo(g);
  const board = scoutingBoard(g);
  const room = info.cap - info.payroll;
  const left = Math.min(STARTERS_RECRUIT.moves - info.moves, STARTERS_RECRUIT.asks - info.asks);
  const me = g.player;
  const five = starters(g);
  return (
    <section className="card stack recruit">
      <div className="row">
        <div>
          <div className="kicker">You are the first option</div>
          <div className="sec-title">Build the starting five</div>
        </div>
        <div className="spacer" />
        <span className="small muted">
          {Math.max(0, STARTERS_RECRUIT.moves - info.moves)} signing{STARTERS_RECRUIT.moves - info.moves === 1 ? '' : 's'} left
        </span>
      </div>
      <div className="five">
        <div className="five-row mine">
          <span>{me.pos}</span>
          <b>{me.name}</b>
          <span>{Math.round(ovrOf(me.attrs, me.pos))}</span>
          <span>{fmtMoney(g.contract?.salary ?? 0)}</span>
        </div>
        {five.map((p, i) => (
          <div key={p.id} className={`five-row${i === five.length - 1 ? ' weakest' : ''}`}>
            <span>{p.pos}</span>
            <b>{p.name}</b>
            <span>{Math.round(p.ovr)}</span>
            <span>{fmtMoney(p.salary)}</span>
          </div>
        ))}
      </div>
      <div className={`cap-line${room < 0 ? ' over' : ''}`}>
        Payroll {fmtMoney(info.payroll)} of a {fmtMoney(info.cap)} cap · {room >= 0 ? `${fmtMoney(room)} room` : `${fmtMoney(-room)} over: incoming salary must be within 125% of outgoing`}
      </div>
      <div className="sec-title small-title">Scouting board</div>
      {board.length === 0 && <p className="small muted">Nobody left on the board this summer.</p>}
      <div className="scout-list">
        {board.map((t) => (
          <div key={t.p.id} className="scout-row">
            <div className="scout-main">
              <b>
                {t.p.name} <span className="muted">· {t.p.pos}, {t.p.age}</span>
              </b>
              <span className="small muted">
                {t.team.name} · OVR {Math.round(t.p.ovr)} · {fmtMoney(t.p.salary)} · for {t.out.map((o) => o.name.split(' ').slice(-1)[0]).join(' + ')}
              </span>
              <span className={`interest i-${t.label === 'Interested' ? 'hi' : t.label === 'Open to it' ? 'mid' : 'lo'}`}>{t.label}</span>
            </div>
            <button className="btn small" disabled={!t.fits || left <= 0} onClick={() => recruit(t.p.id)}>
              {t.fits ? 'Recruit' : `Need ${fmtMoney(t.short)}`}
            </button>
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost small" disabled={info.cut >= STARTERS_RECRUIT.maxCut - 1e-9} onClick={cut}>
          Take a 10% pay cut
        </button>
        <span className="small muted">
          {info.cut > 0 ? `${Math.round(info.cut * 100)}% cut so far. ` : ''}Frees cap room and makes players likelier to come. Your weakest starter goes the other way.
        </span>
      </div>
    </section>
  );
}

export function StoriesCard({ g }: { g: GameState }) {
  const st = g.stories ?? [];
  if (st.length === 0) return null;
  const lg = g.stage === 'NBA' ? g.nba : g.league;
  return (
    <section className="card stack">
      <div className="sec-title">Around the league</div>
      <div className="stories">
        {st.map((x) => {
          const t = lg?.teams.find((y) => y.id === x.teamId);
          return (
            <div key={x.kind + x.teamId} className={`story story-${x.kind}`} style={{ ['--team' as string]: t?.color ?? 'var(--line)' }}>
              <div className="row" style={{ gap: 6 }}>
                <span className="story-tag">{STORY_LABEL[x.kind]}</span>
                <b>{x.title}</b>
              </div>
              <div className="small">{x.result ?? x.text}</div>
              {(x.status || (x.kind === 'rival' && x.vs && x.vs.w + x.vs.l > 0)) && (
                <div className="small muted">
                  {x.status ? `${t?.short ?? ''} ${x.status}` : ''}
                  {x.kind === 'rival' && x.vs && x.vs.w + x.vs.l > 0 ? ` · you are ${x.vs.w}–${x.vs.l} against them` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
