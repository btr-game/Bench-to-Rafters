// The community pages (round 24): leaderboards by difficulty (today and all time), the Reality 99
// hall, the statue plaza and feedback, plus the live strip (in the spirit of the owner's
// reference: people playing right now, careers since you opened the page, the latest news, today's
// theme). Data comes from ui/community.ts: shared on the claude.ai page, this device elsewhere.

import { useEffect, useRef, useState } from 'react';
import type { CareerRecord } from '../../engine/career/record';
import { MODES, type Mode } from '../../engine/balance';
import { ARCHETYPES } from '../../engine/player/archetypes';
import { dailyInput, todayKey } from '../../engine/mini/daily';
import { NAMES } from '../../content/strings';
import { useStore } from '../../store';
import { PageTop } from '../components/PageTop';
import { SCORE_NOTE, BOARD_SIZE, STATUE, canComment, community, openCommentBox, hall99Ok, scoreOf, statueOk, type Community as Api, type FeedItem, type ScoreRow, type StatueRow, type WriteResult } from '../community';
import { drawCareerCard } from '../share';
import { StatueArt } from '../art/Statue';
import { PlayerArt } from '../art/Player';
import { Icon } from '../art/Icon';
import { Badge } from '../art/Badge';
import { OathMark } from '../components/OathMark';

const OPENED = Date.now();

function useCommunity(): Api | null {
  const [c, setC] = useState<Api | null>(null);
  useEffect(() => {
    let live = true;
    void community().then((x) => live && setC(x));
    return () => {
      live = false;
    };
  }, []);
  return c;
}

/** Today's theme: the daily challenge's prospect, the same for everyone. */
function theme(): string {
  const d = dailyInput(todayKey());
  return `${ARCHETYPES[d.pos][d.archetype].name}s from ${d.country ?? 'everywhere'}`;
}

const ago = (at: number) => {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

/** The live strip: who is here now, what just happened, and today's theme. */
export function LiveStrip() {
  const c = useCommunity();
  const [n, setN] = useState(1);
  const [items, setItems] = useState<FeedItem[]>([]);
  useEffect(() => {
    if (!c) return;
    const a = c.presence(setN);
    const b = c.feed(setItems);
    return () => {
      a();
      b();
    };
  }, [c]);
  const since = items.filter((x) => x.at >= OPENED).length;
  return (
    <section className="live-strip" aria-live="polite">
      <div className="live-nums">
        <Icon name="live" size={40} />
        <div>
          <b>{n}</b>
          <small>{n === 1 ? 'player on the court right now' : 'players on the court right now'}</small>
        </div>
        <div>
          <b>{since}</b>
          <small>careers ended since you opened this page</small>
        </div>
      </div>
      <div className="live-theme">
        <span className="live-chip">Today’s theme</span> <b>{theme()}</b> <span className="muted">· the daily challenge’s prospect</span>
      </div>
      {items[0] && (
        <div className="live-feed">
          <i className="live-dot" />
          <span>{items[0].t}</span>
          <small>{ago(items[0].at)}</small>
        </div>
      )}
    </section>
  );
}

/** The entry on the start page. */
export function CommunityCard() {
  const setPage = useStore((s) => s.setPage);
  return (
    <section className="card stack">
      <div className="sec-title with-icon">
        <Icon name="crowd" size={28} />
        Community
      </div>
      <p className="small muted">Leaderboards for every difficulty, the Reality 99 hall, the statue plaza and a line to the game’s maker.</p>
      <button className="btn ghost" data-tour="community" onClick={() => setPage('community')}>
        Open the community
      </button>
    </section>
  );
}

/** A career card drawn on demand. */
function CardImage({ rec }: { rec: CareerRecord }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    drawCareerCard(rec)
      .then((c) => live && setSrc(c.toDataURL('image/png')))
      .catch(() => live && setSrc(''));
    return () => {
      live = false;
    };
  }, [rec]);
  if (src === null) return <p className="small muted keep">Drawing the card…</p>;
  return src ? <img className="log-card-img" src={src} alt={`Career card of ${rec.name}`} /> : null;
}

function Board({ c }: { c: Api }) {
  const [mode, setMode] = useState<Mode>('standard');
  const [scope, setScope] = useState<'day' | 'all'>('day');
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    setRows(null);
    void c.scores(mode, scope).then(setRows, () => setRows([]));
  }, [c, mode, scope]);
  return (
    <div className="stack">
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <div className="seg">
          {(['standard', 'reality', 'stars'] as Mode[]).map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {MODES[m].name}
            </button>
          ))}
        </div>
        <div className="seg">
          <button aria-pressed={scope === 'day'} onClick={() => setScope('day')}>
            Today
          </button>
          <button aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
            All time
          </button>
        </div>
      </div>
      <p className="small muted">
        {c.kind === 'shared' ? `The top ${BOARD_SIZE} players, each at their best career.` : 'Offline: your own best careers on this device.'} {SCORE_NOTE}
      </p>
      {rows === null ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">{scope === 'day' ? 'Nobody has finished a career here today. Be the first.' : 'No careers on this board yet.'}</p>
      ) : (
        <ol className="board-list">
          {rows.map((r, i) => (
            <li key={r.id} className={r.mine ? 'mine' : ''}>
              <button className="board-row" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>
                <span className="board-rank">{i + 1}</span>
                <PlayerArt name={r.rec.name} number={r.rec.number} pos={r.rec.pos} color={r.rec.team?.color} team={r.rec.team?.name ?? ''} size={44} />
                <span className="board-who">
                  <b>
                    {r.rec.name}
                    {r.mine ? <span className="you"> you</span> : null}
                    {r.rec.oath ? <OathMark size={16} /> : null}
                  </b>
                  <small>
                    {NAMES.pos[r.rec.pos]} · {r.rec.tier} · peak {Math.round(r.rec.peak)} · {r.rec.titles} title{r.rec.titles === 1 ? '' : 's'}
                  </small>
                </span>
                <span className="board-score">{r.score.toFixed(1)}</span>
              </button>
              {open === r.id && <CardImage rec={r.rec} />}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Hall({ c }: { c: Api }) {
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  useEffect(() => {
    void c.hall().then(setRows, () => setRows([]));
  }, [c]);
  return (
    <div className="stack">
      <p className="prose">Reality hits hard is built so almost nobody gets there. Every career that reaches a 99 there is enshrined here, for good.</p>
      {rows === null ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted with-icon">
          <Icon name="hall" size={34} />
          The hall is empty. About one Reality career in a thousand gets there.
        </p>
      ) : (
        <div className="hall-grid">
          {rows.map((r) => (
            <div key={r.id} className="hall-card">
              <Badge tier="hof" size={40} />
              <div>
                <b>
                  {r.rec.name}
                  {r.rec.oath ? <OathMark size={16} /> : null}
                </b>
                <small>
                  {r.rec.country} · {NAMES.pos[r.rec.pos]} · {r.rec.tier}
                </small>
              </div>
              <span className="hall-99">99</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Plaza({ c }: { c: Api }) {
  const [rows, setRows] = useState<StatueRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const load = () => void c.statues().then(setRows, () => setRows([]));
  useEffect(load, [c]);
  const pay = async (id: string) => {
    const r = await c.respect(id);
    setMsg(r === 'ok' ? '' : 'Paying respects needs an invitation to post here.');
    load();
  };
  return (
    <div className="stack">
      <p className="prose">
        Regular guy careers with {STATUE.minLegacy}+ legacy points can raise a statue (gold from {STATUE.gold}, or a first-ballot Hall of Famer). The plaza holds {STATUE.max}: {rows?.length ?? '…'} stand
        today. Tap a statue for its career card, and pay your respects.
      </p>
      {msg && <p className="small" style={{ color: 'var(--bad)' }}>{msg}</p>}
      {rows && rows.length === 0 && (
        <p className="muted with-icon">
          <Icon name="statue" size={34} />
          No statues yet. The first one is waiting for a great career.
        </p>
      )}
      <div className="plaza">
        {rows?.map((s) => (
          <div key={s.id} className="plaza-spot">
            <button className="plaza-statue" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
              <StatueArt rec={s.rec} metal={s.metal} size={130} />
            </button>
            <small>
              {s.rec.legacy} legacy · {s.respects} respect{s.respects === 1 ? '' : 's'}
            </small>
            <button className="btn small ghost with-icon" disabled={s.paid} onClick={() => pay(s.id)}>
              <Icon name="respect" size={18} />
              {s.paid ? 'Respects paid' : 'Pay respects'}
            </button>
            {open === s.id && <CardImage rec={s.rec} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** `where` (the in-game sender) tags the message with the tab and the point in the career. Three
 * roads (round 25): the maker's inbox (read in the dev deck) for those who may post there, the page's
 * comment box for everyone else on claude.ai, and this device only for a copy opened from a file. */
function Feedback({ c, where }: { c: Api; where?: string }) {
  const g = useStore((s) => s.game);
  const [text, setText] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<WriteResult | 'sending' | null>(null);
  const [commentable, setCommentable] = useState<boolean | null>(null); // null while asking
  const [boxGone, setBoxGone] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    void canComment().then((ok) => live && setCommentable(ok));
    return () => {
      live = false;
    };
  }, []);
  const inbox = c.kind === 'local' || c.canWrite;
  const send = async () => {
    setState('sending');
    const body = (where ? `[${where}] ` : '') + text.trim();
    setState(await c.sendFeedback(body.slice(0, 2000), contact.trim().slice(0, 200), g?.player.name ?? ''));
    setText('');
  };
  const comment = async () => setBoxGone(!(box.current && (await openCommentBox(box.current))));
  const viaComment = !!commentable && !boxGone && (!inbox || state === 'denied');
  return (
    <div className="stack" ref={box}>
      {inbox && state !== 'denied' ? (
        <>
          <p className="prose">
            Found a bug, have an idea, or just want to say something?{' '}
            {c.kind === 'local' ? 'This copy of the game is not connected to its page on claude.ai, so the message stays on this device: to reach the maker, play on the game’s claude.ai page.' : 'It goes straight to the maker’s inbox and nobody else can read it.'}
            {where ? ' The tab you are on is sent with it.' : ''}
          </p>
          <label className="field">
            <span className="small muted">Your message</span>
            <textarea rows={where ? 4 : 6} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="What should the maker know?" />
          </label>
          <label className="field">
            <span className="small muted">How to reach you (optional)</span>
            <input maxLength={200} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Only if you want an answer" />
          </label>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <button className="btn with-icon" data-tour="feedback-send" disabled={!text.trim() || state === 'sending'} onClick={send}>
              <Icon name="envelope" size={22} />
              {c.kind === 'local' ? 'Keep the note' : 'Send feedback'}
            </button>
            {state === 'ok' && <span className="small">{c.kind === 'local' ? 'Kept on this device.' : 'Sent to the maker. Thank you!'}</span>}
            {state === 'error' && <span className="small" style={{ color: 'var(--bad)' }}>It did not go through. Try again in a moment.</span>}
          </div>
        </>
      ) : (
        <p className="prose">Found a bug, have an idea, or just want to say something? Leave it as a comment on the game’s page: the maker reads every one.</p>
      )}
      {viaComment && (
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <button className="btn with-icon" data-tour="feedback-send" onClick={() => void comment()}>
            <Icon name="envelope" size={22} />
            Write a comment
          </button>
          <span className="small muted">Opens the page’s comment box right here.</span>
        </div>
      )}
      {!inbox && (commentable === false || boxGone) && <p className="small muted">Comments are off for you on this page. Ask the maker for an invitation to send feedback from the game.</p>}
    </div>
  );
}

/** Round 25 (owner): the same sender at the foot of every tab in a career, folded to one line. */
export function FeedbackFoot({ where }: { where: string }) {
  const c = useCommunity();
  if (!c) return null;
  return (
    <details className="card feedback-foot">
      <summary className="with-icon">
        <Icon name="envelope" size={20} />
        Report a bug or send feedback
      </summary>
      <Feedback c={c} where={where} />
    </details>
  );
}

type Tab = 'boards' | 'hall' | 'plaza' | 'feedback';

export function CommunityPage() {
  const setPage = useStore((s) => s.setPage);
  const c = useCommunity();
  const [tab, setTab] = useState<Tab>('boards');
  const tabs: [Tab, string, string][] = [
    ['boards', 'Leaderboards', 'podium'],
    ['hall', 'Reality 99 hall', 'hall'],
    ['plaza', 'Statue plaza', 'statue'],
    ['feedback', 'Send feedback', 'envelope'],
  ];
  return (
    <div className="wrap">
      <PageTop trail={['Community']} back={() => setPage(null)} />
      <section className="stack stage-in">
        <div>
          <div className="kicker">{c?.kind === 'shared' ? 'Shared with everyone on this page' : 'Offline: this device only'}</div>
          <h1 className="hub-title with-icon">
            <Icon name="crowd" size={40} />
            Community
          </h1>
          {c && c.kind === 'shared' && !c.canWrite && <p className="small muted">You can look around. Posting scores, statues and feedback needs an invitation to the game as a Contributor.</p>}
          {c?.kind === 'local' && <p className="small muted">This copy of the game is not connected, so the boards and the plaza only hold careers from this device.</p>}
        </div>
        <LiveStrip />
        <div className="seg" data-tour="comm-tabs">
          {tabs.map(([k, l, icon]) => (
            <button key={k} className="with-icon" aria-pressed={tab === k} onClick={() => setTab(k)}>
              <Icon name={icon} size={20} />
              {l}
            </button>
          ))}
        </div>
        {!c ? (
          <p className="muted">Connecting…</p>
        ) : tab === 'boards' ? (
          <Board c={c} />
        ) : tab === 'hall' ? (
          <Hall c={c} />
        ) : tab === 'plaza' ? (
          <Plaza c={c} />
        ) : (
          <Feedback c={c} />
        )}
      </section>
    </div>
  );
}

/** On the retirement page: the boards it went to, the hall, and a statue to raise. */
export function CommunityNote({ rec }: { rec: CareerRecord }) {
  const c = useCommunity();
  const setPage = useStore((s) => s.setPage);
  const [built, setBuilt] = useState<WriteResult | 'busy' | null>(null);
  if (!c) return null;
  const build = async () => {
    setBuilt('busy');
    setBuilt(await c.buildStatue(rec));
  };
  return (
    <div className="log-note community-note">
      <Icon name="podium" size={22} />
      <span>
        Career index {scoreOf(rec).toFixed(1)}{rec.index ? ` (career ${rec.index.total.toFixed(1)}, best five seasons ${rec.index.best.toFixed(1)})` : ''} on the {MODES[rec.mode].name} boards.
        {hall99Ok(rec) ? ' A 99 in Reality hits hard: you are in the Reality 99 hall.' : ''}
        {statueOk(rec) && built !== 'ok' ? ` ${rec.legacy} legacy points: this career can have a statue in the plaza.` : ''}
        {built === 'ok' ? ' Your statue stands in the plaza.' : built === 'full' ? ' The plaza is full (100 statues).' : built === 'denied' ? ' Raising a statue needs an invitation to post here.' : built === 'error' ? ' The statue could not be raised. Try again.' : ''}
      </span>
      {statueOk(rec) && built !== 'ok' && (
        <button className="btn small" data-tour="statue-raise" disabled={built === 'busy'} onClick={build}>
          Raise a statue
        </button>
      )}
      <button className="btn ghost small" onClick={() => setPage('community')}>
        Community
      </button>
    </div>
  );
}
