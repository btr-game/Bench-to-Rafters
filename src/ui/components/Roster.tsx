import { DuoArt } from '../art/Duo';
import { useState } from 'react';
// Round 9: building the starting five (NBA, first option only) and the league's storylines.

import type { GameState } from '../../engine/types';
import { STARTERS_RECRUIT } from '../../engine/balance';
import { canRecruit, outlookOf, recruitInfo, scoutingBoard, startingFive } from '../../engine/career/recruit';
import { activeDuo, duoEffect, duoLevel } from '../../engine/career/duo';
import { ordinal } from '../format';
import { callQuestion, callsLeft, makeCall, STORY_LABEL } from '../../engine/world/stories';
import { ovrOf } from '../../engine/player/ovr';
import { fmtMoney } from '../../engine/economy/salary';
import { useStore } from '../../store';
import { Icon } from '../art/Icon';
import { STORY_ICON } from '../art/icons';
import { TeamArt } from '../art/Crest';
import { styleLeague } from '../art/Player';
import type { Team } from '../../engine/types';
import type { LeagueStory } from '../../engine/world/stories';

/** A story's banner: the team's crest and the story's mark; a rivalry puts your crest against theirs. */
function StoryArt({ x, t, me, league }: { x: LeagueStory; t?: Team; me?: Team; league?: string }) {
  const crest = (tm: Team, size: number) => <TeamArt name={tm.name} abbr={tm.abbr || tm.short} color={tm.color} league={styleLeague(league)} size={size} />;
  return (
    <div className={`story-art story-art-${x.kind}`} aria-hidden="true">
      {x.kind === 'rival' && me && t ? (
        <>
          {crest(me, 44)}
          <span className="story-vs">
            <Icon name="rival" size={30} />
            <b>VS</b>
          </span>
          {crest(t, 44)}
        </>
      ) : (
        <>
          {t && crest(t, 44)}
          <Icon name={STORY_ICON[x.kind] ?? 'news'} size={38} />
        </>
      )}
    </div>
  );
}

export function RecruitCard({ g }: { g: GameState }) {
  const recruit = useStore((s) => s.recruit);
  const cut = useStore((s) => s.payCut);
  const master = useStore((s) => s.master);
  const [all, setAll] = useState(false);
  if (!canRecruit(g)) return null;
  const info = recruitInfo(g);
  const board = scoutingBoard(g);
  const room = info.cap - info.payroll;
  const left = Math.min(STARTERS_RECRUIT.moves - info.moves, STARTERS_RECRUIT.asks - info.asks);
  const me = g.player;
  const five = startingFive(g);
  const duo = activeDuo(g);
  const slots = (['PG', 'SG', 'SF', 'PF', 'C'] as const).map((slot) => (slot === me.pos ? { slot, mine: true as const } : { slot, mine: false as const, x: five.find((f) => f.slot === slot)?.p }));
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
        {slots.map((r) =>
          r.mine ? (
            <div key={r.slot} className="five-row mine">
              <span>{r.slot}</span>
              <b>{me.name}</b>
              <span>{Math.round(ovrOf(me.attrs, me.pos))}</span>
              <span>{fmtMoney(g.contract?.salary ?? 0)}</span>
            </div>
          ) : r.x ? (
            <div key={r.slot} className="five-row">
              <span>{r.slot}</span>
              <b>
                {r.x.name}
                {r.x.pos !== r.slot && <span className="muted small"> ({r.x.pos})</span>}
                {duo?.id === r.x.id && <span className="duo-tag">Duo</span>}
              </b>
              <span>{Math.round(r.x.ovr)}</span>
              <span>{fmtMoney(r.x.salary)}</span>
            </div>
          ) : null,
        )}
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
      {info.log.length > 0 && (
        <div className="recruit-log">
          <div className="kicker">This summer's calls</div>
          {info.log.map((x, i) => (
            <div key={i} className={`recruit-call ${x.ok ? 'yes' : 'no'}`}>
              <b>{x.ok ? 'Yes' : 'No'}</b> {x.text}
            </div>
          ))}
        </div>
      )}
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
                {t.team.name} · OVR {Math.round(t.p.ovr)} · {fmtMoney(t.p.salary)}
              </span>
              {t.out[0] && (
                <span className="small">
                  Replaces <b>{t.out[0].name}</b> at {t.slot} (OVR {Math.round(t.out[0].ovr)})
                  {t.out.length > 1 ? `; ${t.out.slice(1).map((o) => o.name).join(' and ')} also go${t.out.length > 2 ? '' : 'es'} for the money` : ''}
                </span>
              )}
              {duo && t.out.some((o) => o.id === duo.id) && <span className="small warn-text">Breaks up {duo.nick}</span>}
              <div className="row" style={{ gap: 6 }}>
                <span className={`interest i-${t.label === 'Interested' ? 'hi' : t.label === 'Open to it' ? 'mid' : 'lo'}`}>{t.label}</span>
                {!master && <span className={`scout-rec rec-${t.rec.toLowerCase()}`}>Scouts: {t.rec}</span>}
              </div>
              {!master && <span className="small rec-why prose">{t.why}</span>}
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
          {info.cut > 0 ? `${Math.round(info.cut * 100)}% cut so far. ` : ''}Frees cap room and makes players likelier to come. A new player takes over his position; the starter there goes the other way.{master ? '' : " The scouts' call is a read, not a promise."}
        </span>
      </div>
    </section>
  );
}

/** Round 20: his duo, once the hidden chemistry with a recruit has grown into one. */
export function DuoCard({ g }: { g: GameState }) {
  const fx = duoEffect(g);
  if (!fx) return null;
  const b = fx.b;
  const level = duoLevel(g, b);
  const years = g.year - (b.formed ?? g.year);
  return (
    <section className="card stack duo-card">
      <div className="kicker">Your duo</div>
      <DuoArt g={g} b={b} size={112} />
      <p className="small prose">
        You and <b>{b.name}</b> ({b.pos}) · {b.seasons} season{b.seasons === 1 ? '' : 's'} together{years > 0 ? `, a duo for ${years} season${years === 1 ? '' : 's'}` : ', a duo since this summer'}.
      </p>
      <div className="duo-meter" aria-label={`Duo strength ${Math.round(level * 100)}%`}>
        <span style={{ width: `${Math.round(level * 100)}%` }} />
      </div>
      <p className="small muted">
        {level >= 1 ? 'At full strength' : 'Still growing'}: team strength +{fx.team.toFixed(1)}, and your shooting, assists and touches are up. It ends if either of you leaves.
      </p>
    </section>
  );
}

export function StoriesCard({ g }: { g: GameState }) {
  const mutate = useStore((s) => s.mutate);
  const [more, setMore] = useState(false);
  // round 15: folds to one line a story; the choice is remembered on this device
  const [open, setOpenState] = useState(() => {
    try {
      return localStorage.getItem('btr-stories-open') === '1';
    } catch {
      return false;
    }
  });
  const setOpen = (v: boolean) => {
    setOpenState(v);
    try {
      localStorage.setItem('btr-stories-open', v ? '1' : '0');
    } catch {
      /* the fold still works for this visit */
    }
  };
  const st = g.stories ?? [];
  if (st.length === 0) return null;
  const lg = g.stage === 'NBA' ? g.nba : g.league;
  const left = callsLeft(g);
  const order = st.map((x, i) => ({ x, i })).sort((a, b) => (b.x.mine ? 1 : 0) - (a.x.mine ? 1 : 0));
  const shown = more ? order : order.slice(0, 4);
  return (
    <section className="card stack">
      <button className="row fold-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="sec-title">Around the league</span>
        <span className="spacer" />
        {left > 0 && <span className="small muted">Call it: {left} left</span>}
        <span className="fold-arrow" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {!open && (
        <ul className="story-lines">
          {order.map(({ x }) => (
            <li key={x.kind + x.teamId} className={x.mine ? 'mine' : ''}>
              <Icon name={STORY_ICON[x.kind] ?? 'news'} size={16} />
              <span className="story-tag">{STORY_LABEL[x.kind]}</span> {x.title}
            </li>
          ))}
        </ul>
      )}
      {open && (
      <div className="stories">
        {shown.map(({ x, i }) => {
          const t = lg?.teams.find((y) => y.id === x.teamId);
          const q = callQuestion(x);
          return (
            <div key={x.kind + x.teamId} className={`story story-${x.kind}${x.mine ? ' story-mine' : ''}`} style={{ ['--team' as string]: t?.color ?? 'var(--line)' }}>
              <StoryArt x={x} t={t} me={lg?.teams.find((y) => y.id === g.teamId)} league={lg?.level} />
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
      )}
      {open && order.length > 4 && (
        <button className="link-btn" onClick={() => setMore(!more)}>
          {more ? 'Show fewer' : `Show all ${order.length} stories`}
        </button>
      )}
    </section>
  );
}
