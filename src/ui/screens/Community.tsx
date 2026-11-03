// The community pages (round 24): leaderboards by difficulty (today and all time), the Reality 99
// hall, the statue plaza and feedback, plus the live strip (in the spirit of the owner's
// reference: people playing right now, careers since you opened the page, the latest news, today's
// theme). Data comes from ui/community.ts: shared on the claude.ai page, this device elsewhere.

import { chooseLook } from '../../content/looks';
import { DevDoor } from '../components/FootBar';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CareerRecord } from '../../engine/career/record';
import { ARCHETYPES } from '../../engine/player/archetypes';
import { dailyInput, todayKey } from '../../engine/mini/daily';
import { NAMES } from '../../content/strings';
import { useStore } from '../../store';
import { PageTop } from '../components/PageTop';
import { SCORE_NOTE, BOARD_SIZE, STATUE, BOARDS, boardName, canComment, community, homeBoard, openCommentBox, hall99Ok, scoreOf, statueOk, type Board, type Community as Api, type FeedItem, type ScoreRow, type StatueRow, type WriteResult } from '../community';
import { drawCareerCard } from '../share';
import { StatueArt } from '../art/Statue';
import { PlayerArt } from '../art/Player';
import { Icon } from '../art/Icon';
import { PixelX } from '../art/PixelX';
import { CometMark, OathMark } from '../components/OathMark';
import { sfx } from '../sound';
import { houseScores, houseStatues } from '../house';
import { houseEnded, houseOnCourt } from '../houseLive';
import { shownBy, signed } from '../names';
import { t, tx } from '../../i18n';

/** Whose player a card is (round 36): the username it was posted under, when it has one. */
function By({ rec }: { rec: CareerRecord }) {
  const by = shownBy(rec.by);
  return by ? <span className="board-by"> {t('by {name}', { name: by })}</span> : null;
}

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
  const arch = ARCHETYPES[d.pos][d.archetype].name;
  return d.country ? t('{arch}s from {country}', { arch, country: d.country }) : t('{arch}s from everywhere', { arch });
}

const ago = (at: number) => {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000));
  return m < 1 ? t('just now') : m < 60 ? t('{n} min ago', { n: m }) : m < 1440 ? t('{n} h ago', { n: Math.round(m / 60) }) : t('{n} d ago', { n: Math.round(m / 1440) });
};

/** The real numbers behind the strip: who is here now and the careers ended since `opened`. */
function useRealLive(opened: number): { here: number; since: number; items: FeedItem[] } {
  const c = useCommunity();
  const [here, setHere] = useState(1);
  const [items, setItems] = useState<FeedItem[]>([]);
  useEffect(() => {
    if (!c) return;
    const a = c.presence(setHere);
    const b = c.feed(setItems);
    return () => {
      a();
      b();
    };
  }, [c]);
  return { here, since: items.filter((x) => x.at >= opened).length, items };
}

/** The live strip: who is here now, what just happened, and today's theme. Round 32 (owner): the
 * numbers carry the house players (ui/houseLive.ts) and say so in the bottom-right corner; the dev deck has the
 * real ones. */
export function LiveStrip() {
  const { here, since, items } = useRealLive(OPENED);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 4000);
    return () => window.clearInterval(id);
  }, []);
  const n = here + houseOnCourt(now);
  const ended = since + houseEnded(OPENED, now);
  return (
    <section className="live-strip">
      <div className="live-nums">
        <Icon name="live" size={40} />
        <div>
          <b>{n.toLocaleString('en-US')}</b>
          <small>{t('players on the court right now')}</small>
        </div>
        <div>
          <b>{ended.toLocaleString('en-US')}</b>
          <small>{t('careers ended since you opened this page')}</small>
        </div>
      </div>
      <div className="live-theme">
        <span className="live-chip">{t('Today’s theme')}</span> <b>{theme()}</b> <span className="muted">· {t('the daily challenge’s prospect')}</span>
      </div>
      {items[0] && (
        <div className="live-feed" aria-live="polite">
          <i className="live-dot" />
          <span>{items[0].t}</span>
          <small>{ago(items[0].at)}</small>
        </div>
      )}
      <small className="live-house">{t('House players included')}</small>
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
      <p className="small muted">{t('Leaderboards for every difficulty, the Reality 99 hall, the statue plaza and a line to the game’s maker.')}</p>
      <button className="btn ghost" data-tour="community" onClick={() => setPage('community')}>
        {t('Open the community')}
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
  if (src === null) return <p className="small muted keep">{t('Drawing the card…')}</p>;
  return src ? <img className="log-card-img" src={src} alt={t('Career card of {name}', { name: rec.name })} /> : null;
}

/** A pixel X for the close button. */
/** A career card large in the middle of the screen (owner, the statue plaza: "make the player card
 * much larger? make it popup in the middle of the screen, and exit when pressing space/enter (or a
 * x mark on the corner is fine)"); the Reality 99 hall uses it too. Space, Enter, Escape, the X or a
 * click beside it closes it, before the game's own keys. */
function CardPop({ rec, label, tone, head, onClose }: { rec: CareerRecord; label: string; tone: 'hall' | 'bronze' | 'gold'; head: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose]);
  // drawn on the page itself, so a moving parent (the phone's page slide) cannot pin it inside the page
  return createPortal(
    <div className="hall-pop" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`hall-pop-card card-pop ${tone}`}>
        <button className="pop-x" aria-label={t('Close')} onClick={onClose} autoFocus>
          <PixelX />
        </button>
        <div className="hall-pop-head">{head}</div>
        <CardImage rec={rec} />
        <p className="small muted keep pop-hint">{t('Space, Enter or Esc to close')}</p>
      </div>
    </div>,
    document.body,
  );
}

/** What each challenge board holds, under its tabs. */
const BOARD_NOTE: Partial<Record<Board, string>> = {
  reality: tx('Rough Road careers rank here too, marked: they are Reality careers played the hard way.'),
  rough: tx('Rough Road careers only: Reality hits hard in master mode, the whole player picked at random, nothing simplified, no undo. They rank on the Reality board too.'),
  comet: tx('Comet careers only: Shoot for the stars at hyper speed, with fast break and sim for the whole career. They rank here and not on the Shoot for the stars board, which keeps careers played by hand.'),
};

function Boards({ c }: { c: Api }) {
  const [board, setBoard] = useState<Board>('standard');
  const [scope, setScope] = useState<'day' | 'all'>('day');
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  rows?.forEach((r) => chooseLook(r.rec.name, r.rec.look)); // round 27: each career in the look he chose
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    setRows(null);
    // round 27: the house players keep the boards from looking empty; real careers rank among them
    const withHouse = (real: ScoreRow[]) => setRows([...real, ...houseScores(board, scope)].sort((a, b) => b.score - a.score).slice(0, BOARD_SIZE));
    void c.scores(board, scope).then(withHouse, () => withHouse([]));
  }, [c, board, scope]);
  return (
    <div className="stack">
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <div className="seg board-tabs" data-tour="board-tabs">
          {BOARDS.map((b) => (
            <button key={b} data-board={b} aria-pressed={board === b} onClick={() => setBoard(b)}>
              {b === 'rough' || b === 'comet' ? <Icon name={b === 'rough' ? 'oath' : 'comet'} size={18} /> : null}
              {boardName(b)}
            </button>
          ))}
        </div>
        <div className="seg">
          <button aria-pressed={scope === 'day'} onClick={() => setScope('day')}>
            {t('Today')}
          </button>
          <button aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
            {t('All time')}
          </button>
        </div>
      </div>
      <p className="small muted">
        {c.kind === 'shared' ? t('The top {n} players, each at their best career.', { n: BOARD_SIZE }) : t('Offline: your own best careers on this device.')} {t(SCORE_NOTE)}
      </p>
      {BOARD_NOTE[board] && <p className="small">{t(BOARD_NOTE[board]!)}</p>}
      <p className="small muted">{t('House players (marked) are careers the game played itself, here to keep the boards warm until real ones push them down.')}</p>
      {rows === null ? (
        <p className="muted">{t('Loading…')}</p>
      ) : rows.length === 0 ? (
        <p className="muted">{scope === 'day' ? t('Nobody has finished a career here today. Be the first.') : t('No careers on this board yet.')}</p>
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
                    <By rec={r.rec} />
                    {r.mine ? <span className="you"> {t('you')}</span> : null}
                    {r.house ? <HouseTag /> : null}
                    {r.rec.oath ? <OathMark size={16} /> : null}
                    {r.rec.comet ? <CometMark size={16} /> : null}
                  </b>
                  <small>
                    {NAMES.pos[r.rec.pos]} · {r.rec.tier} · {t('peak {n}', { n: Math.round(r.rec.peak) })} · {r.rec.titles === 1 ? t('1 title') : t('{n} titles', { n: r.rec.titles })}
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

/** Marks one of the game's own careers (house.ts). */
function HouseTag() {
  return (
    <span className="house-tag" title={t('A house player: a career the game played itself')}>
      {t('house')}
    </span>
  );
}

/** Seats on a bench: five, three on a phone. */
function usePerBench(): number {
  const q = typeof matchMedia === 'undefined' ? null : matchMedia('(max-width: 640px)');
  const [narrow, setNarrow] = useState(!!q?.matches);
  useEffect(() => {
    if (!q) return;
    const on = () => setNarrow(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, [q]);
  return narrow ? 3 : 5;
}

/**
 * The hall itself, in pixels: a stone wall with columns, purple banners between them and a carpet
 * down the middle (round 27, owner: "make the background like an
 * actual hall").
 */
function HallBackdrop() {
  const px = useMemo(() => {
    const out: [number, number, number, number, string][] = [];
    const r = (x: number, y: number, w: number, h: number, c: string) => out.push([x, y, w, h, c]);
    // the wall, in blocks
    r(0, 0, 160, 64, '#2b1f46');
    for (let y = 8; y < 62; y += 6) {
      r(0, y, 160, 1, '#221836');
      for (let x = (y / 6) % 2 ? 0 : 8; x < 160; x += 16) r(x, y + 1, 1, 5, '#221836');
    }
    // the ceiling and its gold rail
    r(0, 0, 160, 7, '#1a1229');
    r(0, 7, 160, 1, '#c9a227');
    // banners between the columns, a gold star on each
    for (const x of [21, 53, 99, 131]) {
      r(x, 10, 10, 20, '#6a3fd0');
      r(x, 10, 1, 20, '#4c2aa6');
      r(x, 10, 10, 1, '#c9a227');
      for (let k = 0; k < 4; k++) r(x + k, 30 + k, 10 - 2 * k, 1, '#6a3fd0');
      r(x + 4, 16, 2, 6, '#f2c94c');
      r(x + 2, 18, 6, 2, '#f2c94c');
      r(x + 3, 23, 4, 1, '#f2c94c');
    }
    // the big banner in the middle: 99
    r(68, 9, 24, 30, '#7a4ae6');
    r(68, 9, 24, 1, '#c9a227');
    r(68, 38, 24, 1, '#c9a227');
    const digit = (x0: number) => {
      r(x0, 15, 6, 2, '#ffe08a');
      r(x0, 15, 2, 9, '#ffe08a');
      r(x0 + 4, 15, 2, 18, '#ffe08a');
      r(x0, 22, 6, 2, '#ffe08a');
      r(x0, 31, 6, 2, '#ffe08a');
    };
    digit(72);
    digit(82);
    // the columns
    for (const x of [6, 38, 114, 146]) {
      r(x - 2, 8, 12, 3, '#d9d1e6');
      r(x, 11, 8, 50, '#b9b0c9');
      r(x, 11, 2, 50, '#9a90ad');
      r(x + 6, 11, 1, 50, '#e2dbee');
      r(x + 3, 11, 1, 50, '#a79dba');
      r(x - 2, 61, 12, 3, '#d9d1e6');
    }
    // the floor, the carpet and the lamps' pools of light
    r(0, 64, 160, 26, '#3a2b57');
    for (let y = 68; y < 90; y += 5) r(0, y, 160, 1, '#33264d');
    r(60, 64, 40, 26, '#5b2a86');
    r(60, 64, 1, 26, '#c9a227');
    r(99, 64, 1, 26, '#c9a227');
    return out;
  }, []);
  return (
    <svg className="hall-back" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" aria-hidden="true">
      {px.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
  );
}

/**
 * The Reality 99 hall (round 27, owner: "rows of benches, and the cute avatar of the user is sitting
 * on it, 3~5 per row. they are shadowed, silhouetted. similar to the choose position page, when the
 * user clicks it, they are highlighted, and their story (player card) appears ... fill the first row
 * with shadows that are locked (rows should be added when the upper row is filled)", then "make the
 * background like an actual hall ... the benches and players are too small. they should be
 * dominating the scene ... i want the cards to pop up").
 */
function Hall({ c }: { c: Api }) {
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  rows?.forEach((r) => chooseLook(r.rec.name, r.rec.look)); // round 27: each career in the look he chose
  const [pick, setPick] = useState<string | null>(null);
  const per = usePerBench();
  useEffect(() => {
    void c.hall().then(setRows, () => setRows([]));
  }, [c]);
  const unpick = useCallback(() => setPick(null), []);
  const seated = rows ?? [];
  // every full bench, and one more with its empty seats locked
  const benches = Array.from({ length: Math.floor(seated.length / per) + 1 }, (_, b) => Array.from({ length: per }, (_, i) => seated[b * per + i] ?? null));
  const picked = seated.find((r) => r.id === pick) ?? null;
  return (
    <div className="stack">
      <p className="prose">
        {t('Reality hits hard is built so almost nobody gets there. Every career that reaches a 99 there takes a seat in this hall, for good.')}{' '}
        {seated.length ? t('Tap a silhouette to see who it is.') : t('Nobody has made it yet: about one Reality career in a thousand does.')}
      </p>
      {rows === null ? (
        <p className="muted">{t('Loading…')}</p>
      ) : (
        <div className="hall-room">
          <HallBackdrop />
          <div className="hall-sign">
            <Icon name="hall" size={30} />
            Reality 99 hall · {t('{n} seated', { n: seated.length })}
          </div>
          {benches.map((bench, b) => (
            <div key={b} className="hall-bench">
              <div className="hall-seats">
                {bench.map((r, i) =>
                  r ? (
                    <button key={r.id} className={`hall-seat${pick === r.id ? ' on' : ''}`} aria-pressed={pick === r.id} aria-label={t('Seat {n}: who is it?', { n: b * per + i + 1 })} onClick={() => (sfx('reveal'), setPick(r.id))}>
                      <span className="hall-sit">
                        <PlayerArt name={r.rec.name} number={r.rec.number} pos="SG" color={r.rec.team?.color} team={r.rec.team?.name ?? ''} size={200} noBall />
                      </span>
                    </button>
                  ) : (
                    <span key={`empty-${i}`} className="hall-seat locked" role="img" aria-label={t('An empty seat, locked')}>
                      <span className="hall-sit">
                        <PlayerArt name={['Empty Seat', 'Open Chair', 'Waiting Spot', 'Vacant Place', 'Free Bench'][i % 5]} number={0} pos="SG" size={200} noBall />
                      </span>
                      <span className="hall-lock">
                        <Icon name="lock" size={30} />
                      </span>
                    </span>
                  ),
                )}
              </div>
              <div className="hall-plank" aria-hidden="true" />
            </div>
          ))}
        </div>
      )}
      {picked && (
        <CardPop
          rec={picked.rec}
          label={`${picked.rec.name}, Reality 99 hall`}
          tone="hall"
          onClose={unpick}
          head={
            <>
              <span className="hall-pop-art">
                <PlayerArt name={picked.rec.name} number={picked.rec.number} pos={picked.rec.pos} color={picked.rec.team?.color} team={picked.rec.team?.name ?? ''} size={150} />
              </span>
              <div style={{ minWidth: 0 }}>
                <span className="hall-99">99</span>
                <b className="hall-story-name">
                  {picked.rec.name}
                  <By rec={picked.rec} />
                  {picked.rec.oath ? <OathMark size={16} /> : null}
                  {picked.rec.comet ? <CometMark size={16} /> : null}
                </b>
                <div className="small muted">
                  {picked.rec.country} · {NAMES.pos[picked.rec.pos]} · {picked.rec.tier}
                  {picked.rec.nickname ? ` · “${picked.rec.nickname.name}”` : ''}
                </div>
              </div>
            </>
          }
        />
      )}
    </div>
  );
}

function Plaza({ c }: { c: Api }) {
  const [rows, setRows] = useState<StatueRow[] | null>(null);
  rows?.forEach((r) => chooseLook(r.rec.name, r.rec.look)); // round 27: each career in the look he chose
  const [open, setOpen] = useState<string | null>(null);
  const shut = useCallback(() => setOpen(null), []);
  const shown = rows?.find((s) => s.id === open) ?? null;
  const [msg, setMsg] = useState('');
  // round 27: house statues stand behind the real ones
  const load = () => void c.statues().then((real) => setRows([...real, ...houseStatues()]), () => setRows(houseStatues()));
  useEffect(load, [c]);
  const pay = async (id: string) => {
    const r = await c.respect(id);
    if (r === 'ok') sfx('respect');
    // an invitation is a claude.ai matter; anywhere players can write, a failed respect just did not get through
    setMsg(r === 'ok' ? '' : c.canWrite ? tx('That did not go through. Try again in a moment.') : tx('Paying respects needs an invitation to post here.'));
    load();
  };
  return (
    <div className="stack">
      <p className="prose">
        {t('Regular guy careers with {min}+ legacy points can raise a statue (gold from {gold}, or a first-ballot Hall of Famer). The plaza holds {max}: {n} stand today. Tap a statue for its career card, and pay your respects.', { min: STATUE.minLegacy, gold: STATUE.gold, max: STATUE.max, n: rows?.length ?? '…' })}
      </p>
      {msg && <p className="small" style={{ color: 'var(--bad)' }}>{t(msg)}</p>}
      {rows && rows.length === 0 && (
        <p className="muted with-icon">
          <Icon name="statue" size={34} />
          {t('No statues yet. The first one is waiting for a great career.')}
        </p>
      )}
      <div className="plaza">
        {rows?.map((s) => (
          <div key={s.id} className="plaza-spot">
            <button className="plaza-statue" onClick={() => (sfx('reveal'), setOpen(s.id))} aria-haspopup="dialog" aria-label={t('The statue of {name}: see the career card', { name: s.rec.name })}>
              <StatueArt rec={s.rec} metal={s.metal} size={130} />
            </button>
            <small>
              {s.respects === 1 ? t('{legacy} legacy · 1 respect', { legacy: s.rec.legacy }) : t('{legacy} legacy · {n} respects', { legacy: s.rec.legacy, n: s.respects })}
            </small>
            {s.house ? (
              <HouseTag />
            ) : (
              <button className="btn small ghost with-icon" disabled={s.paid} onClick={() => pay(s.id)}>
                <Icon name="respect" size={18} />
                {s.paid ? t('Respects paid') : t('Pay respects')}
              </button>
            )}
          </div>
        ))}
      </div>
      {shown && (
        <CardPop
          rec={shown.rec}
          label={`${shown.rec.name}, statue plaza`}
          tone={shown.metal}
          onClose={shut}
          head={
            <>
              <span className="hall-pop-art">
                <StatueArt rec={shown.rec} metal={shown.metal} size={150} />
              </span>
              <div style={{ minWidth: 0 }}>
                <b className="hall-story-name">
                  {shown.rec.name}
                  <By rec={shown.rec} />
                </b>
                <div className="small muted">
                  {shown.metal === 'gold' ? t('Gold statue') : t('Bronze statue')} · {shown.respects === 1 ? t('{legacy} legacy · 1 respect', { legacy: shown.rec.legacy }) : t('{legacy} legacy · {n} respects', { legacy: shown.rec.legacy, n: shown.respects })}
                </div>
                <div className="small muted">
                  {shown.rec.country} · {NAMES.pos[shown.rec.pos]} · {shown.rec.tier}
                </div>
                {shown.house && <HouseTag />}
              </div>
            </>
          }
        />
      )}
    </div>
  );
}

/** `where` (the in-game sender) tags the message with the tab and the point in the career. Four
 * roads: the maker's inbox (read in the dev deck) for those who may post there, the page's comment
 * box for everyone else on claude.ai, the game's own database on the website (read in the dev
 * deck's inbox with the inbox key), and this device only when no database can be reached. */
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
    const sent = await c.sendFeedback(body.slice(0, 2000), contact.trim().slice(0, 200), g?.player.name ?? '');
    if (sent === 'ok') sfx('sent');
    setState(sent);
    setText('');
  };
  const comment = async () => setBoxGone(!(box.current && (await openCommentBox(box.current))));
  const viaComment = !!commentable && !boxGone && (!inbox || state === 'denied');
  return (
    <div className="stack" ref={box}>
      {inbox && state !== 'denied' ? (
        <>
          <p className="prose">
            {t('Found a bug, have an idea, or just want to say something?')}{' '}
            {c.kind === 'local' ? t('This copy of the game is not online right now, so the message stays on this device.') : t('It goes straight to the maker’s inbox and nobody else can read it.')}
            {where ? ` ${t('The tab you are on is sent with it.')}` : ''}
          </p>
          <label className="field">
            <span className="small muted">{t('Your message')}</span>
            <textarea rows={where ? 4 : 6} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('What should the maker know?')} />
          </label>
          <label className="field">
            <span className="small muted">{t('How to reach you (optional)')}</span>
            <input maxLength={200} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t('Only if you want an answer')} />
          </label>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <button className="btn with-icon" data-tour="feedback-send" disabled={!text.trim() || state === 'sending'} onClick={send}>
              <Icon name="envelope" size={22} />
              {c.kind === 'local' ? t('Keep the note') : t('Send feedback')}
            </button>
            {state === 'ok' && <span className="small">{c.kind === 'local' ? t('Kept on this device.') : t('Sent to the maker. Thank you!')}</span>}
            {state === 'error' && <span className="small" style={{ color: 'var(--bad)' }}>{t('It did not go through. Try again in a moment.')}</span>}
          </div>
        </>
      ) : (
        <p className="prose">{t('Found a bug, have an idea, or just want to say something? Leave it as a comment on the game’s page: the maker reads every one.')}</p>
      )}
      {viaComment && (
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <button className="btn with-icon" data-tour="feedback-send" onClick={() => void comment()}>
            <Icon name="envelope" size={22} />
            {t('Write a comment')}
          </button>
          <span className="small muted">{t('Opens the page’s comment box right here.')}</span>
        </div>
      )}
      {!inbox && (commentable === false || boxGone) && <p className="small muted">{t('Comments are off for you on this page. Ask the maker for an invitation to send feedback from the game.')}</p>}
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
        {t('Report a bug or send feedback')}
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
    ['boards', t('Leaderboards'), 'podium'],
    ['hall', 'Reality 99 hall', 'hall'],
    ['plaza', 'Statue plaza', 'statue'],
    ['feedback', t('Send feedback'), 'envelope'],
  ];
  return (
    <div className="wrap">
      <PageTop trail={['Community']} back={() => setPage(null)} />
      <section className="stack stage-in">
        <div>
          <div className="kicker">{c?.kind === 'shared' ? t('Shared with everyone on this page') : t('Offline: this device only')}</div>
          <h1 className="hub-title with-icon">
            <Icon name="crowd" size={40} />
            Community
          </h1>
          {c && c.kind === 'shared' && !c.canWrite && <p className="small muted">{t('You can look around. Posting scores, statues and feedback needs an invitation to the game as a Contributor.')}</p>}
          {c?.kind === 'local' && <p className="small muted">{t('This copy of the game is not connected, so the boards and the plaza only hold careers from this device.')}</p>}
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
          <p className="muted">{t('Connecting…')}</p>
        ) : tab === 'boards' ? (
          <Boards c={c} />
        ) : tab === 'hall' ? (
          <Hall c={c} />
        ) : tab === 'plaza' ? (
          <Plaza c={c} />
        ) : (
          <Feedback c={c} />
        )}
      </section>
      {/* round 27: the Developer door at the foot of every page (feedback has its own tab here) */}
      <DevDoor />
    </div>
  );
}

/** Where a score would rank on one board: real players' bests and the house players, this career
 * and this player's own entries aside. */
async function rankOn(c: Api, rec: CareerRecord, scope: 'day' | 'all'): Promise<number> {
  const s = scoreOf(rec);
  const b = homeBoard(rec);
  const rows = [...(await c.scores(b, scope).catch(() => [] as ScoreRow[])), ...houseScores(b, scope)];
  return rows.filter((r) => !r.mine && r.rec.id !== rec.id && r.score > s).length + 1;
}

/** On the retirement page (round 28, owner: "if the user's player is eligible for leaderboard or any
 * other community sharing thing, they should be notified when the career ends"): a card at the top
 * that says where the career ranks today and all time, whether it is in the Reality 99 hall, and
 * whether it can raise a statue (with the button), or how far it was from one. */
export function CommunityNote({ rec }: { rec: CareerRecord }) {
  const c = useCommunity();
  const setPage = useStore((s) => s.setPage);
  const [built, setBuilt] = useState<WriteResult | 'busy' | null>(null);
  const [rank, setRank] = useState<{ day: number; all: number } | null>(null);
  useEffect(() => {
    if (!c) return;
    let live = true;
    // the post goes up as the career ends: give it a moment before reading the boards back
    const t = window.setTimeout(() => {
      void Promise.all([rankOn(c, rec, 'day'), rankOn(c, rec, 'all')]).then(([day, all]) => {
        if (!live) return;
        setRank({ day, all });
        if (day <= BOARD_SIZE || all <= BOARD_SIZE || hall99Ok(rec) || statueOk(rec)) sfx('award');
      });
    }, 1200);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [c, rec]);
  if (!c) return null;
  const build = async () => {
    setBuilt('busy');
    setBuilt(await c.buildStatue(signed(rec)));
  };
  const mode = boardName(homeBoard(rec));
  const ranked = (n: number) => n <= BOARD_SIZE;
  return (
    <section className="card community-note stack" data-tour="community-note" aria-live="polite">
      <div className="sec-title with-icon">
        <Icon name="podium" size={26} />
        {t('This career and the community')}
      </div>
      <div className="cn-row">
        <Icon name="podium" size={30} />
        <div>
          <b>
            {!rank
              ? t('Career index {index}: checking the {mode} boards…', { index: scoreOf(rec).toFixed(1), mode })
              : ranked(rank.day) || ranked(rank.all)
                ? t('On the {mode} leaderboard: {places}', { mode, places: [ranked(rank.day) ? t('#{n} today', { n: rank.day }) : '', ranked(rank.all) ? t('#{n} all time', { n: rank.all }) : ''].filter(Boolean).join(', ') })
                : t('Career index {index}: outside the {mode} top {n} this time', { index: scoreOf(rec).toFixed(1), mode, n: BOARD_SIZE })}
          </b>
          <small className="muted">
            {rec.index ? t('Career index {index} (career {total}, best five seasons {best}).', { index: scoreOf(rec).toFixed(1), total: rec.index.total.toFixed(1), best: rec.index.best.toFixed(1) }) : t('Career index {index}.', { index: scoreOf(rec).toFixed(1) })}{' '}
            {c.kind === 'local' ? t('The boards keep each player’s best career, on this device.') : t('The boards keep each player’s best career.')}
          </small>
        </div>
      </div>
      {hall99Ok(rec) && (
        <div className="cn-row">
          <Icon name="hall" size={30} />
          <div>
            <b>{t('In the Reality 99 hall')}</b>
            <small className="muted">{t('A 99 in Reality hits hard: your seat in the hall is lit.')}</small>
          </div>
        </div>
      )}
      {rec.mode === 'standard' && (
        <div className="cn-row">
          <Icon name="statue" size={30} />
          <div>
            {statueOk(rec) ? (
              <>
                <b>{built === 'ok' ? t('Your statue stands in the plaza') : rec.legacy >= STATUE.gold || rec.hof === 'first' ? t('This career can raise a statue (gold)') : t('This career can raise a statue (bronze)')}</b>
                <small className="muted">
                  {built === 'full'
                    ? t('The plaza is full (100 statues).')
                    : built === 'denied' && !c.canWrite
                      ? t('Raising a statue needs an invitation to post here.')
                      : built === 'error' || built === 'denied'
                        ? t('The statue could not be raised. Try again.')
                        : t('{n} legacy points: {min} raise a statue, {gold} or a first-ballot Hall of Famer make it gold.', { n: rec.legacy, min: STATUE.minLegacy, gold: STATUE.gold })}
                </small>
              </>
            ) : (
              <>
                <b>{t('No statue this time')}</b>
                <small className="muted">
                  {t('{n} legacy points; a statue takes {min} on Regular guy.', { n: rec.legacy, min: STATUE.minLegacy })}
                </small>
              </>
            )}
          </div>
          {statueOk(rec) && built !== 'ok' && (
            <button className="btn small" data-tour="statue-raise" disabled={built === 'busy'} onClick={build}>
              {t('Raise a statue')}
            </button>
          )}
        </div>
      )}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost small" onClick={() => setPage('community')}>
          {t('See the community')}
        </button>
      </div>
    </section>
  );
}
