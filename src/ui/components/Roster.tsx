import { useState } from 'react';
// Round 9: building the starting five (NBA, first option only) and the league's storylines.

import type { GameState } from '../../engine/types';
import { STARTERS_RECRUIT } from '../../engine/balance';
import { canRecruit, outlookOf, recruitInfo, scoutingBoard, starters } from '../../engine/career/recruit';
import { ordinal } from '../format';
import { callQuestion, callsLeft, makeCall, STORY_LABEL } from '../../engine/world/stories';
import { ovrOf } from '../../engine/player/ovr';
import { fmtMoney } from '../../engine/economy/salary';
import { useStore } from '../../store';

export function RecruitCard({ g }: { g: GameState }) {
  const recruit = useStore((s) => s.recruit);
  const cut = useStore((s) => s.payCut);
  if (!canRecruit(g)) return null;
  const info = recruitInfo(g);
  const board = scoutingBoard(g);
  const [all, setAll] = useState(false);
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
      <div className="five-outlook">
        <div>
          <span className="kicker">Your team now</span>
          <b>
            {ordinal(info.rank)} of 30 · {outlookOf(info.rank)}
          </b>
        </div>
        {info.before && (
          <div className={`five-delta${info.strength > info.before.strength ? ' up' : ' down'}`}>
            <span className="kicker">This summer</span>
            <b>
              {ordinal(info.before.rank)} → {ordinal(info.rank)}
            </b>
            <span className="small">
              Team strength {info.before.strength.toFixed(1)} → {info.strength.toFixed(1)} ({info.strength >= info.before.strength ? '+' : ''}
              {(info.strength - info.before.strength).toFixed(1)}){info.joined.length ? ` · new: ${info.joined.join(', ')}` : ''}
            </span>
            {outlookOf(info.before.rank) !== outlookOf(info.rank) && (
              <span className="small">
                {outlookOf(info.before.rank)} → <b>{outlookOf(info.rank)}</b>
              </span>
            )}
          </div>
        )}
      </div>
      <div className={`cap-line${room < 0 ? ' over' : ''}`}>
        Payroll {fmtMoney(info.payroll)} of a {fmtMoney(info.cap)} cap · {room >= 0 ? `${fmtMoney(room)} room` : `${fmtMoney(-room)} over: incoming salary must be within 125% of outgoing`}
      </div>
      <div className="sec-title small-title">Scouting board</div>
      {board.length === 0 && <p className="small muted">Nobody left on the board this summer.</p>}
      <div className="scout-list">
        {(all ? board : board.slice(0, 3)).map((t) => (
          <div key={t.p.id} className="scout-row">
            <div className="scout-main">
              <b>
                {t.p.name} <span className="muted">· {t.p.pos}, {t.p.age}</span>
              </b>
              <span className="small muted">
                {t.team.name} · OVR {Math.round(t.p.ovr)} · {fmtMoney(t.p.salary)} · for {t.out.map((o) => o.name.split(' ').slice(-1)[0]).join(' + ')}
              </span>
              <div className="row" style={{ gap: 6 }}>
                <span className={`interest i-${t.label === 'Interested' ? 'hi' : t.label === 'Open to it' ? 'mid' : 'lo'}`}>{t.label}</span>
                <span className={`scout-rec rec-${t.rec.toLowerCase()}`}>Scouts: {t.rec}</span>
              </div>
              <span className="small rec-why prose">{t.why}</span>
              {t.lineup && <span className="small warn-text">{t.lineup}</span>}
            </div>
            <button className="btn small" disabled={!t.fits || !!t.lineup || left <= 0} onClick={() => recruit(t.p.id)} title={t.lineup ?? ''}>
              {t.lineup ? 'No fit' : t.fits ? 'Recruit' : `Need ${fmtMoney(t.short)}`}
            </button>
          </div>
        ))}
      </div>
      {board.length > 3 && (
        <button className="link-btn" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${board.length}`}
        </button>
      )}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost small" disabled={info.cut >= STARTERS_RECRUIT.maxCut - 1e-9} onClick={cut}>
          Take a 10% pay cut
        </button>
        <span className="small muted">
          {info.cut > 0 ? `${Math.round(info.cut * 100)}% cut so far. ` : ''}Frees cap room and makes players likelier to come. Your weakest starter goes the other way. The scouts' call is a read, not a promise.
        </span>
      </div>
    </section>
  );
}

export function StoriesCard({ g }: { g: GameState }) {
  const mutate = useStore((s) => s.mutate);
  const [more, setMore] = useState(false);
  const st = g.stories ?? [];
  if (st.length === 0) return null;
  const lg = g.stage === 'NBA' ? g.nba : g.league;
  const left = callsLeft(g);
  const order = st.map((x, i) => ({ x, i })).sort((a, b) => (b.x.mine ? 1 : 0) - (a.x.mine ? 1 : 0));
  const shown = more ? order : order.slice(0, 4);
  return (
    <section className="card stack">
      <div className="row">
        <div className="sec-title">Around the league</div>
        <div className="spacer" />
        {left > 0 && <span className="small muted">Call it: {left} left</span>}
      </div>
      <div className="stories">
        {shown.map(({ x, i }) => {
          const t = lg?.teams.find((y) => y.id === x.teamId);
          const q = callQuestion(x);
          return (
            <div key={x.kind + x.teamId} className={`story story-${x.kind}${x.mine ? ' story-mine' : ''}`} style={{ ['--team' as string]: t?.color ?? 'var(--line)' }}>
              <div className="row" style={{ gap: 6 }}>
                <span className="story-tag">{STORY_LABEL[x.kind]}</span>
                <b>{x.title}</b>
              </div>
              <div className={`small${x.result ? '' : ' prose'}`}>{x.result ?? x.text}</div>
              {x.mine && (
                <div className="small story-fx">
                  Team strength {x.mine.regular >= 0 ? '+' : ''}
                  {x.mine.regular} this season, {x.mine.playoff >= 0 ? '+' : ''}
                  {x.mine.playoff} in the playoffs
                </div>
              )}
              {(x.status || (x.kind === 'rival' && x.vs && x.vs.w + x.vs.l > 0)) && (
                <div className="small muted">
                  {x.status ? `${t?.short ?? ''} ${x.status}` : ''}
                  {x.kind === 'rival' && x.vs && x.vs.w + x.vs.l > 0 ? ` · you are ${x.vs.w}–${x.vs.l} against them` : ''}
                </div>
              )}
              {q && x.call === undefined && left > 0 && (
                <div className="story-call">
                  <span className="small">{q}</span>
                  <button className="btn ghost small" onClick={() => mutate((s) => makeCall(s, i, true))}>
                    Yes
                  </button>
                  <button className="btn ghost small" onClick={() => mutate((s) => makeCall(s, i, false))}>
                    No
                  </button>
                </div>
              )}
              {q && x.call !== undefined && (
                <div className={`small story-called${x.called ? ` ${x.called}` : ''}`}>
                  You called it: {x.call ? 'yes' : 'no'}
                  {x.called === 'right' ? ' · right (reputation +2)' : x.called === 'wrong' ? ' · wrong' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {order.length > 4 && (
        <button className="link-btn" onClick={() => setMore(!more)}>
          {more ? 'Show fewer' : `Show all ${order.length} stories`}
        </button>
      )}
    </section>
  );
}
