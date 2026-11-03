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
import { FoldMark } from './bits';
import { styleLeague } from '../art/Player';
import type { League, Team } from '../../engine/types';
import type { LeagueStory } from '../../engine/world/stories';
import { NEWS_EFFECT } from '../../engine/career/news';
import { t } from '../../i18n';

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
  const signings = STARTERS_RECRUIT.moves - info.moves;
  return (
    <section className="card stack recruit">
      <div className="row">
        <div>
          <div className="kicker">{t('You are the first option')}</div>
          <div className="sec-title">{t('Build the starting five')}</div>
        </div>
        <div className="spacer" />
        <span className="small muted">
          {signings === 1 ? t('1 signing left') : t('{n} signings left', { n: Math.max(0, signings) })}
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
                {duo?.id === r.x.id && <span className="duo-tag">{t('Duo')}</span>}
              </b>
              <span>{Math.round(r.x.ovr)}</span>
              <span>{fmtMoney(r.x.salary)}</span>
            </div>
          ) : null,
        )}
      </div>
      <div className="five-outlook">
        <div>
          <span className="kicker">{t('Your team now')}</span>
          <b>
            {t('{rank} of 30', { rank: ordinal(info.rank) })} · {outlookOf(info.rank)}
          </b>
        </div>
        {info.before && (
          <div className={`five-delta${info.strength > info.before.strength ? ' up' : ' down'}`}>
            <span className="kicker">{t('This summer')}</span>
            <b>
              {ordinal(info.before.rank)} → {ordinal(info.rank)}
            </b>
            <span className="small">
              {t('Team strength {from} → {to} ({change})', { from: info.before.strength.toFixed(1), to: info.strength.toFixed(1), change: `${info.strength >= info.before.strength ? '+' : ''}${(info.strength - info.before.strength).toFixed(1)}` })}
              {info.joined.length ? ` · ${t('new: {names}', { names: info.joined.join(', ') })}` : ''}
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
          <div className="kicker">{t("This summer's calls")}</div>
          {info.log.map((x, i) => (
            <div key={i} className={`recruit-call ${x.ok ? 'yes' : 'no'}`}>
              <b>{x.ok ? t('Yes') : t('No')}</b> {x.text}
            </div>
          ))}
        </div>
      )}
      <div className={`cap-line${room < 0 ? ' over' : ''}`}>
        {t('Payroll {pay} of a {cap} cap', { pay: fmtMoney(info.payroll), cap: fmtMoney(info.cap) })} · {room >= 0 ? t('{money} room', { money: fmtMoney(room) }) : t('{money} over: incoming salary must be within 125% of outgoing', { money: fmtMoney(-room) })}
      </div>
      <div className="sec-title small-title">{t('Scouting board')}</div>
      {board.length === 0 && <p className="small muted keep">{t('Nobody left on the board this summer.')}</p>}
      <div className="scout-list">
        {(all ? board : board.slice(0, 3)).map((c) => (
          <div key={c.p.id} className="scout-row">
            <div className="scout-main">
              <b>
                {c.p.name} <span className="muted">· {c.p.pos}, {c.p.age}</span>
              </b>
              <span className="small muted">
                {c.team.name} · OVR {Math.round(c.p.ovr)} · {fmtMoney(c.p.salary)}
              </span>
              {c.out[0] && (
                <span className="small">
                  {t('Replaces')} <b>{c.out[0].name}</b> {t('at {slot} (OVR {ovr})', { slot: c.slot ?? '', ovr: Math.round(c.out[0].ovr) })}
                  {c.out.length > 1 ? `; ${c.out.length > 2 ? t('{names} and {last} also go for the money', { names: c.out.slice(1, -1).map((o) => o.name).join(' and '), last: c.out[c.out.length - 1].name }) : t('{name} also goes for the money', { name: c.out[1].name })}` : ''}
                </span>
              )}
              {duo && c.out.some((o) => o.id === duo.id) && <span className="small warn-text">{t('Breaks up {duo}', { duo: duo.nick ?? '' })}</span>}
              <div className="row" style={{ gap: 6 }}>
                <span className={`interest i-${c.label === 'Interested' ? 'hi' : c.label === 'Open to it' ? 'mid' : 'lo'}`}>{c.label}</span>
                {!master && <span className={`scout-rec rec-${c.rec.toLowerCase()}`}>{t('Scouts: {call}', { call: c.rec })}</span>}
              </div>
              {!master && <span className="small rec-why prose">{c.why}</span>}
              {c.lineup && <span className="small warn-text">{c.lineup}</span>}
            </div>
            <button className="btn small" disabled={!c.fits || !!c.lineup || left <= 0} onClick={() => recruit(c.p.id)} title={c.lineup ?? ''}>
              {c.lineup ? t('No fit') : c.fits ? t('Recruit') : t('Need {money}', { money: fmtMoney(c.short) })}
            </button>
          </div>
        ))}
      </div>
      {board.length > 3 && (
        <button className="link-btn" onClick={() => setAll(!all)}>
          {all ? t('Show fewer') : t('Show all {n}', { n: board.length })}
        </button>
      )}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost small" disabled={info.cut >= STARTERS_RECRUIT.maxCut - 1e-9} onClick={cut}>
          {t('Take a 10% pay cut')}
        </button>
        <span className="small muted">
          {info.cut > 0 ? `${t('{n}% cut so far.', { n: Math.round(info.cut * 100) })} ` : ''}{t('Frees cap room and makes players likelier to come. A new player takes over his position; the starter there goes the other way.')}{master ? '' : ` ${t("The scouts' call is a read, not a promise.")}`}
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
      <div className="kicker">{fx.third ? t('Your Big Three') : t('Your duo')}</div>
      <DuoArt g={g} b={b} third={fx.third} size={112} />
      <p className="small prose">
        {t('You and')} <b>{b.name}</b> ({b.pos}) · {b.seasons === 1 ? t('1 season together') : t('{n} seasons together', { n: b.seasons })}, {years > 0 ? (years === 1 ? t('a duo for 1 season') : t('a duo for {n} seasons', { n: years })) : t('a duo since this summer')}.
        {fx.third && (
          <>
            {' '}
            {t('With')} <b>{fx.third.name}</b> ({fx.third.pos}) {t('it is a Big Three.')}
          </>
        )}
      </p>
      <div className="duo-meter" aria-label={t('Duo strength {n}%', { n: Math.round(level * 100) })}>
        <span style={{ width: `${Math.round(level * 100)}%` }} />
      </div>
      <p className="small muted">
        {level >= 1 ? t('At full strength') : t('Still growing')}: {t('team strength +{n}, and your shooting and assists are up.', { n: fx.team.toFixed(1) })} {fx.third ? t('If one of the three leaves, it is a duo again.') : t('It ends if either of you leaves.')}
      </p>
    </section>
  );
}

/** Round 25: what a story about another team means for his team. */
function forYou(them: Team | undefined, me: Team | undefined): string | null {
  if (!them || !me || them.id === me.id) return null;
  const same = them.conf === me.conf;
  if (them.strength >= me.strength + 1) return same ? t('For you: in your way, a likely playoff opponent') : t('For you: a possible opponent in the final');
  if (them.strength <= me.strength - 3) return t('For you: games you should win');
  return same ? t('For you: a team you will fight for seeding') : null;
}

/** Round 25: the league's top five by record (strength breaks ties), and where his team stands. */
function PowerRanking({ lg, myId }: { lg: League; myId: string | null }) {
  const ranked = [...lg.teams].sort((a, b) => b.w / Math.max(1, b.w + b.l) - a.w / Math.max(1, a.w + a.l) || b.strength - a.strength);
  const mine = ranked.findIndex((t) => t.id === myId);
  const rows = ranked.slice(0, 5).map((t, i) => ({ t, i }));
  if (mine >= 5) rows.push({ t: ranked[mine], i: mine });
  return (
    <ol className="power-rank">
      {rows.map(({ t, i }) => (
        <li key={t.id} className={t.id === myId ? 'mine' : ''} value={i + 1}>
          <span>{t.name}</span>
          <span className="muted">
            {t.w}–{t.l}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Round 25: the papers on him this season, and what it does to his summer (career/news.ts). */
function AboutYou({ g }: { g: GameState }) {
  const now = (g.news ?? []).filter((n) => n.year === g.year);
  if (now.length === 0) return null;
  return (
    <div className="stack about-you" style={{ gap: 4 }}>
      <span className="kicker">{t('About you')}</span>
      {now.map((n) => (
        <div key={n.kind} className="small">
          {n.text}
          {NEWS_EFFECT[n.kind] && <span className="story-fx"> · {NEWS_EFFECT[n.kind]}</span>}
        </div>
      ))}
    </div>
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
        <span className="sec-title">{t('Around the league')}</span>
        <span className="spacer" />
        {left > 0 && <span className="small muted">{t('Call it: {n} left', { n: left })}</span>}
        <FoldMark open={open} />
      </button>
      <AboutYou g={g} />
      {open && lg && lg.teams.length >= 6 && (
        <div className="stack" style={{ gap: 4 }}>
          <span className="kicker">{t('Power ranking')}</span>
          <PowerRanking lg={lg} myId={g.stage === 'NBA' ? g.teamId : lg.userTeamId} />
        </div>
      )}
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
          const tm = lg?.teams.find((y) => y.id === x.teamId);
          const q = callQuestion(x);
          return (
            <div key={x.kind + x.teamId} className={`story story-${x.kind}${x.mine ? ' story-mine' : ''}`} style={{ ['--team' as string]: tm?.color ?? 'var(--line)' }}>
              <StoryArt x={x} t={tm} me={lg?.teams.find((y) => y.id === g.teamId)} league={lg?.level} />
              <div className="row" style={{ gap: 6 }}>
                <span className="story-tag">{STORY_LABEL[x.kind]}</span>
                <b>{x.title}</b>
              </div>
              <div className={`small${x.result ? '' : ' prose'}`}>{x.result ?? x.text}</div>
              {!x.mine && forYou(tm, lg?.teams.find((y) => y.id === (g.stage === 'NBA' ? g.teamId : lg?.userTeamId))) && <div className="small story-fx">{forYou(tm, lg?.teams.find((y) => y.id === (g.stage === 'NBA' ? g.teamId : lg?.userTeamId)))}</div>}
              {x.mine && (
                <div className="small story-fx">
                  {t('Team strength {regular} this season, {playoff} in the playoffs', { regular: `${x.mine.regular >= 0 ? '+' : ''}${x.mine.regular}`, playoff: `${x.mine.playoff >= 0 ? '+' : ''}${x.mine.playoff}` })}
                </div>
              )}
              {(x.status || (x.kind === 'rival' && x.vs && x.vs.w + x.vs.l > 0)) && (
                <div className="small muted">
                  {x.status ? `${tm?.short ?? ''} ${x.status}` : ''}
                  {x.kind === 'rival' && x.vs && x.vs.w + x.vs.l > 0 ? ` · ${t('you are {w}–{l} against them', { w: x.vs.w, l: x.vs.l })}` : ''}
                </div>
              )}
              {q && x.call === undefined && left > 0 && (
                <div className="story-call">
                  <span className="small">{q}</span>
                  <button className="btn ghost small" onClick={() => mutate((s) => makeCall(s, i, true))}>
                    {t('Yes')}
                  </button>
                  <button className="btn ghost small" onClick={() => mutate((s) => makeCall(s, i, false))}>
                    {t('No')}
                  </button>
                </div>
              )}
              {q && x.call !== undefined && (
                <div className={`small story-called${x.called ? ` ${x.called}` : ''}`}>
                  {x.call ? t('You called it: yes') : t('You called it: no')}
                  {x.called === 'right' ? ` · ${t('right (reputation +2)')}` : x.called === 'wrong' ? ` · ${t('wrong')}` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
      {open && order.length > 4 && (
        <button className="link-btn" onClick={() => setMore(!more)}>
          {more ? t('Show fewer') : t('Show all {n} stories', { n: order.length })}
        </button>
      )}
    </section>
  );
}
