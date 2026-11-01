// Full-screen interstitials: the half-season ticker, the new-season card, and story
// pages (moments) such as commitments, draft night, awards and the title game.

import { DuoArt } from '../art/Duo';
import { activeDuo, activeTrio } from '../../engine/career/duo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, Moment } from '../../engine/types';
import { LEVELS } from '../../engine/balance';
import { useStore, type Transition } from '../../store';
import { ordinal } from '../format';
import { league, stageLine, team } from '../selectors';
import { ActionCam, type CamSide, type Venue } from '../art/ActionCam';
import { ClutchPanel, GRADE_NOTE, GRADE_POINTS, calledPlay, clutchMoves, type ClutchMove, type Grade } from './Clutch';
import { Icon } from '../art/Icon';
import { NickLogo } from '../art/NickLogo';
import { PixelWord } from '../art/PixelText';
import { InjuryBadge } from '../art/careerArt';
import { ORIGINS } from '../../content/origins';
import { kitFor, styleLeague } from '../art/Player';
import { genericKits } from '../../content/teamStyle';
import { CelebrationArt, StoryScene } from '../art/Scene';
import { AwardArt, awardKeyOf } from '../art/Award';
import { MedalArt } from '../art/Medal';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Calls `onDone` after `ms`, unless reduced motion is on (then the caller shows the end state). */
function useTicker(total: number, ms: number): [number, () => void] {
  const [i, setI] = useState(reducedMotion() ? total : 0);
  useEffect(() => {
    if (i >= total) return;
    const t = setTimeout(() => setI((x) => x + 1), ms);
    return () => clearTimeout(t);
  }, [i, total, ms]);
  return [i, () => setI(total)];
}

// ---------- half-season ticker ----------

function HalfSim({ t, g, onDone }: { t: Extract<Transition, { kind: 'half' }>; g: GameState; onDone: () => void }) {
  const n = t.games.length;
  const step = Math.max(28, Math.min(150, 2400 / Math.max(1, n)));
  const [i, skip] = useTicker(n, step);
  const shown = t.games.slice(0, i);
  const reg = shown.filter((g) => !g.post || g.post === 'G League');
  const w = t.w + reg.filter((g) => g.res === 'W').length;
  const l = t.l + reg.filter((g) => g.res === 'L').length;
  const pts = shown.reduce((s, g) => s + (g.line?.pts ?? 0), 0);
  const played = shown.filter((g) => g.line).length;
  const done = i >= n;
  // the results wait for Continue (owner: "some playoff games continue (closes screen) regardless
  // of the user's click"); only Fast break and Sim mode, which are for moving quickly, go on alone
  const quick = !!g.flags.fast || !!g.flags.sim;
  useEffect(() => {
    if (!done || !quick) return;
    const tm = setTimeout(onDone, reducedMotion() ? 0 : 900);
    return () => clearTimeout(tm);
  }, [done, quick, onDone]);
  // once the last result is in, Continue takes the focus, so Enter goes on
  const go = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (done) go.current?.focus({ preventScroll: true });
  }, [done]);
  const recent = shown.slice(-5).reverse();
  return (
    <div className="overlay sim" style={{ ['--team' as string]: t.color }} role="dialog" aria-modal="true" aria-label={`Simulating ${t.label}`}>
      <div className="overlay-inner">
        <div className="kicker on-dark">{t.label}</div>
        <div className="sim-team">{t.teamName}</div>
        <div className="board sim-board">
          <div className="cell">
            <div className="k">Record</div>
            <div className="v">
              {w}–{l}
            </div>
          </div>
          <div className="cell">
            <div className="k">Games</div>
            <div className="v">
              {i}/{n}
            </div>
          </div>
          <div className="cell">
            <div className="k">Your PPG</div>
            <div className="v">{played ? (pts / played).toFixed(1) : '—'}</div>
          </div>
        </div>
        <div className="sim-feed" aria-live="polite">
          {recent.map((g, k) => (
            <div key={`${i}-${k}`} className={`sim-row ${g.res === 'W' ? 'win' : 'loss'}${k === 0 ? ' fresh' : ''}`}>
              <span>
                {g.post && g.post !== 'G League' ? `${g.post} · ` : ''}
                {g.home ? 'vs' : '@'} {g.opp}
              </span>
              <span>
                {g.res} {g.us}–{g.them}
              </span>
              <span className="muted-dark">{g.line ? `${g.line.pts} pts` : 'DNP'}</span>
            </div>
          ))}
        </div>
        <button ref={go} className="btn ghost-dark" onClick={done ? onDone : skip} data-skip={done ? undefined : ''}>
          {done ? 'Continue' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

function SeasonCard({ t, g, onDone }: { t: Extract<Transition, { kind: 'season' }>; g: GameState; onDone: () => void }) {
  useEffect(() => {
    const tm = setTimeout(onDone, reducedMotion() ? 600 : 1700);
    return () => clearTimeout(tm);
  }, [onDone]);
  return (
    <div className="overlay season-card" style={{ ['--team' as string]: t.color }} onClick={onDone} role="dialog" aria-modal="true" aria-label={`${t.label} season`}>
      <div className="overlay-inner center">
        <div className="kicker on-dark">New season</div>
        <div className="season-year">{t.label}</div>
        <div className="sim-team">{t.sub}</div>
        <div className="on-dark small">
          {stageLine(g)} · age {g.player.age}
        </div>
      </div>
    </div>
  );
}

// ---------- title game animation ----------

interface Play {
  us: boolean;
  pts: number;
  mine: boolean;
  text: string;
}

function hashRng(seed: number) {
  let x = (seed * 2654435761) >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function buildPlays(m: Moment, name: string): Play[] {
  const g = m.game!;
  const r = hashRng(m.id + g.us * 7 + g.them);
  const last = name.split(' ').slice(-1)[0];
  const plays: Play[] = [];
  const line = g.line;
  if (line) {
    for (let i = 0; i < line.tpm; i++) plays.push({ us: true, pts: 3, mine: true, text: `${last} buries a three` });
    for (let i = 0; i < line.fgm - line.tpm; i++)
      plays.push({ us: true, pts: 2, mine: true, text: `${last} ${['attacks the rim', 'hits the pull-up', 'scores in the post', 'finishes the lob'][Math.floor(r() * 4)]}` });
    let ft = line.ftm;
    while (ft > 0) {
      const k = Math.min(2, ft);
      plays.push({ us: true, pts: k, mine: true, text: `${last} at the line, ${k} for ${k}` });
      ft -= k;
    }
  }
  let rest = g.us - plays.reduce((s, p) => s + p.pts, 0);
  while (rest > 0) {
    const k = rest >= 3 && r() < 0.3 ? 3 : Math.min(2, rest);
    plays.push({ us: true, pts: k, mine: false, text: k === 3 ? 'Corner three from a teammate' : k === 1 ? 'Free throw' : 'Teammate scores inside' });
    rest -= k;
  }
  let them = g.them;
  while (them > 0) {
    const k = them >= 3 && r() < 0.32 ? 3 : Math.min(2, them);
    plays.push({ us: false, pts: k, mine: false, text: `${g.opp} ${k === 3 ? 'hit a three' : k === 1 ? 'make a free throw' : 'score'}` });
    them -= k;
  }
  for (let i = plays.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [plays[i], plays[j]] = [plays[j], plays[i]];
  }
  // end on a winning bucket for the champions
  const lastUs = plays.map((p) => p.us).lastIndexOf(true);
  if (lastUs >= 0 && lastUs !== plays.length - 1) plays.push(plays.splice(lastUs, 1)[0]);
  return plays;
}

/** How a postseason ended for him, before the tables (round 31, owner: "not exactly sure what the
 * results are here. be more apparent"): his team's finish and the champion, in big type, kept in
 * simple text. */
function Outcome({ o }: { o: NonNullable<Moment['outcome']> }) {
  return (
    <div className="moment-outcome">
      <div className="mo-row mine">
        <span className="mo-tag">Your team · {o.short}</span>
        <b>{o.result}</b>
      </div>
      <div className="mo-row">
        <span className="mo-tag champ">Champion</span>
        <b>{o.champion}</b>
      </div>
    </div>
  );
}

/** One line of a recap table, with the winner in bold and, on a line of his team's, a W or an L. */
function RecapRow({ r, mine }: { r: string; mine?: string }) {
  const has = (x: string) => !!mine && x === mine;
  const series = r.match(/^(.+?) def\. (.+?) (\d+–\d+)$/) ?? r.match(/^(.+?) (\d+–\d+) (.+)$/);
  if (series) {
    const [w, l, score] = r.includes(' def. ') ? [series[1], series[2], series[3]] : [series[1], series[3], series[2]];
    const tag = has(w) ? 'W' : has(l) ? 'L' : null;
    return (
      <div className={`post-recap-row${tag ? ` mine ${tag === 'W' ? 'won' : 'lost'}` : ''}`}>
        {tag && <span className="rr-tag">{tag}</span>}
        <b>{w}</b> beat {l} <span className="rr-score">{score}</span>
      </div>
    );
  }
  const game = r.match(/^Game (\d+): (.+?) (\d+), (.+?) (\d+)$/);
  if (game) {
    const [, n, a, x, b, y] = game;
    const aWon = Number(x) > Number(y);
    return (
      <div className={`post-recap-row game${has(a) || has(b) ? ' mine' : ''}`}>
        <span className="rr-n">Game {n}</span>
        {aWon ? <b>{a} {x}</b> : `${a} ${x}`}, {aWon ? `${b} ${y}` : <b>{b} {y}</b>}
      </div>
    );
  }
  return <div className="post-recap-row">{r}</div>;
}

function Recap({ m }: { m: Moment }) {
  if (!m.recap || m.recap.length === 0) return null;
  return (
    <div className="post-recap">
      {m.recap.map((sec, i) => (
        <div key={i} className="post-recap-sec" style={{ animationDelay: `${0.3 + i * 0.15}s` }}>
          <div className="kicker on-dark">{sec.heading}</div>
          {sec.rows.map((r, k) => (
            <RecapRow key={k} r={r} mine={m.outcome?.short ?? m.game?.teamShort} />
          ))}
        </div>
      ))}
    </div>
  );
}

function TitleGame({ m, g, onDone }: { m: Moment; g: GameState; onDone?: () => void }) {
  const plays = useMemo(() => buildPlays(m, g.player.name), [m, g.player.name]);
  const n = plays.length;
  const [i, skip] = useTicker(n, Math.max(40, Math.min(160, 6500 / Math.max(1, n))));
  const done = i >= n;
  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);
  const shown = plays.slice(0, i);
  const us = shown.filter((p) => p.us).reduce((s, p) => s + p.pts, 0);
  const them = shown.filter((p) => !p.us).reduce((s, p) => s + p.pts, 0);
  const mine = shown.filter((p) => p.mine).reduce((s, p) => s + p.pts, 0);
  const len = LEVELS[m.game!.level].gameLen;
  const qLen = len / 4;
  const elapsed = (i / Math.max(1, n)) * len;
  const q = Math.min(4, Math.floor(elapsed / qLen) + 1);
  const left = Math.max(0, qLen * q - elapsed);
  const clock = `${Math.floor(left)}:${String(Math.floor((left % 1) * 60)).padStart(2, '0')}`;
  const feed = shown.slice(-4).reverse();
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="kicker on-dark">{m.game!.post ?? 'Final'}</div>
      <div className="board title-board">
        <div className="cell">
          <div className="k">{m.game!.teamShort}</div>
          <div className="v big">{us}</div>
        </div>
        <div className="cell clock">
          <div className="k">{done ? 'Final' : `Q${q}`}</div>
          <div className="v">{done ? '—' : clock}</div>
        </div>
        <div className="cell right">
          <div className="k">{m.game!.opp}</div>
          <div className="v big dim">{them}</div>
        </div>
      </div>
      <div className="on-dark small">
        {g.player.name}: {mine} pts
      </div>
      <div className="sim-feed" aria-live="polite">
        {feed.map((p, k) => (
          <div key={`${i}-${k}`} className={`sim-row${p.mine ? ' mine' : ''}${k === 0 ? ' fresh' : ''}`}>
            <span>{p.text}</span>
            <span>+{p.pts}</span>
          </div>
        ))}
      </div>
      {done ? (
        <>
          <CelebrationArt g={g} prize={m.title} />
          <div className="champ-banner">
            <span>Champions</span>
            <b>{m.title}</b>
          </div>
          <Recap m={m} />
        </>
      ) : (
        <button className="btn ghost-dark" onClick={skip} data-skip="">
          Skip to the final buzzer
        </button>
      )}
    </div>
  );
}

// ---------- the last minutes of a final (round 9) ----------

const TAG_LABEL: Record<string, string> = {
  LEAD: 'Takes the lead',
  TIE: 'All tied up',
  BLOCK: 'Block!',
  STEAL: 'Steal!',
  BUZZER: 'Buzzer beater!',
  DAGGER: 'Dagger',
  RUN: 'Here comes the run',
  MISS: 'No good',
  STOP: 'Game over',
};

/** A national final: the moment's title ends in "gold" (Olympics, World Cup, Asian Games). */
const isNational = (m: Moment) => / gold$/.test(m.title);

/** The two teams' kits on the action cam: his team at home, the other side in its road kit (a national final: both countries' colours). */
function camSides(m: Moment, g?: GameState): { us: CamSide; them: CamSide } {
  const game = m.game!;
  if (isNational(m)) {
    const oc = ORIGINS.find((o) => o.nation === game.opp)?.nationColor ?? '#C8102E';
    return { us: { kit: genericKits(m.color, game.teamShort).home, color: m.color }, them: { kit: genericKits(oc, game.opp).road, color: oc } };
  }
  const lv = styleLeague(g?.stage);
  const t = g && team(g);
  const o = g && league(g)?.teams.find((x) => x.short === game.opp);
  return {
    us: t ? { kit: kitFor(t.name, t.abbr, t.color, 'home', lv), color: t.color } : { kit: genericKits('#1D428A', game.teamShort).home, color: '#1D428A' },
    them: o ? { kit: kitFor(o.name, o.abbr, o.color, 'road', lv), color: o.color } : { kit: genericKits('#C8102E', game.opp).road, color: '#C8102E' },
  };
}

/** Which floor the final is played on. */
function venueOf(m: Moment): Venue {
  if (/Olympic/.test(m.title)) return 'olympics';
  if (isNational(m)) return 'fiba';
  if (/NBA Cup/.test(m.title)) return 'cup';
  const lv = m.game?.level;
  return lv === 'NCAA' ? 'college' : lv === 'EU' || lv === 'INT' || lv === 'GL' ? 'euro' : lv === 'HSV' || lv === 'HSJV' ? 'school' : 'nba';
}

type ReelMode = 'ask' | 'play' | 'watch';
type Call = { move: ClutchMove; grade: Grade };

/**
 * Three quarters in a blink, then crunch time one play at a time. Round 24: it starts with a
 * choice: play the last minutes (his team's possessions wait for his call), watch them, or skip
 * to the result.
 */
export function FinalReel({ m, g, onDone }: { m: Moment; g?: GameState; onDone?: () => void }) {
  const d = m.drama!;
  const game = m.game!;
  const mutate = useStore((s) => s.mutate);
  const warm = 10;
  // one step past the last play, so the action cam can play it out before the buzzer
  const n = warm + d.plays.length + 1;
  const winner = game.us > game.them ? 'us' : 'them';
  const [mode, setMode] = useState<ReelMode>(reducedMotion() ? 'watch' : 'ask');
  const [i, setI] = useState(reducedMotion() ? n : 0);
  const [calls, setCalls] = useState<Record<number, Call>>({});
  const [asking, setAsking] = useState<number | null>(null);
  const me = g?.player.name ?? 'You';
  // round 24 (owner): no mini-games in the daily challenge, so its finals are watched or skipped
  const daily = !!g?.flags.daily;
  const plays = useMemo(() => d.plays.map((p, k) => (calls[k] ? calledPlay(p, calls[k].move, me, game.opp) : p)), [d.plays, calls, me, game.opp]);
  useEffect(() => {
    if (mode === 'ask' || i >= n || asking !== null) return;
    const k = i - warm; // the next play to show
    const needs = mode === 'play' && i >= warm && k < plays.length && !!clutchMoves(d.plays[k], winner) && !calls[k];
    const t = setTimeout(() => (needs ? setAsking(k) : setI((x) => x + 1)), i < warm ? 110 : i === warm ? 250 : 1700);
    return () => clearTimeout(t);
  }, [i, n, mode, asking, calls, plays.length, d.plays, winner]);
  const done = i >= n;
  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);
  // the clutch rating, once, when a played final ends: a little fame and mood in a career
  const graded = Object.values(calls);
  const rating = graded.length ? Math.round((100 * graded.reduce((a, c) => a + GRADE_POINTS[c.grade], 0)) / (3 * graded.length)) : null;
  const paid = useRef(false);
  const reward = rating === null ? 0 : Math.floor(rating / 25);
  useEffect(() => {
    if (!done || rating === null || !g || paid.current) return;
    paid.current = true;
    mutate((x) => {
      x.player.rep = Math.min(100, x.player.rep + reward);
      if (rating >= 70) x.player.morale = Math.min(100, x.player.morale + 3);
      x.flags.clutchPlayed = (x.flags.clutchPlayed ?? 0) + 1;
      x.flags.clutchBest = Math.max(x.flags.clutchBest ?? 0, rating);
    });
  }, [done, rating, reward, g, mutate]);
  const shown = plays.slice(0, Math.max(0, i - warm));
  const frac = Math.min(1, i / warm);
  const us = Math.round(d.start.us * frac) + shown.filter((p) => p.side === 'us').reduce((a, p) => a + p.pts, 0);
  const them = Math.round(d.start.them * frac) + shown.filter((p) => p.side === 'them').reduce((a, p) => a + p.pts, 0);
  const cur = shown[shown.length - 1];
  const curCall = calls[shown.length - 1];
  const sides = useMemo(() => camSides(m, g), [m, g]);
  const venue = venueOf(m);
  const clock = i < warm ? `Q${Math.min(4, 1 + Math.floor(frac * 3.99))}` : cur ? `Q4 ${cur.clock}` : 'Q4';
  const skip = () => {
    setAsking(null);
    setI(n);
  };
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="kicker on-dark">{game.post ?? 'Final'}</div>
      <div className="board title-board">
        <div className="cell">
          <div className="k">{game.teamShort}</div>
          <div className={`v big${us < them && done ? ' dim' : ''}`}>{done ? game.us : us}</div>
        </div>
        <div className="cell clock">
          <div className="k">{done ? 'Final' : clock}</div>
          <div className="v">—</div>
        </div>
        <div className="cell right">
          <div className="k">{game.opp}</div>
          <div className={`v big${us > them || !done ? ' dim' : ''}`}>{done ? game.them : them}</div>
        </div>
      </div>
      {mode === 'ask' ? (
        <div className="clutch-ask stack">
          <ActionCam play={null} us={sides.us} them={sides.them} winner={winner} me={g ? { name: g.player.name, number: g.player.number } : null} venue={venue} />
          <p className="on-dark lede-dark">
            {daily ? 'The last minutes of the final. Mini-games are off in the daily challenge: watch them, or go straight to the result.' : 'The last minutes of the final. Take the big possessions yourself, watch them, or go straight to the result.'}
          </p>
          <div className="clutch-moves">
            {!daily && (
              <button className="btn with-icon" data-tour="clutch-play" onClick={() => setMode('play')}>
                <Icon name="clutch" size={22} />
                Play the last minutes
              </button>
            )}
            <button className={`btn${daily ? '' : ' ghost-dark'}`} onClick={() => setMode('watch')}>
              Watch them
            </button>
            <button className="btn ghost-dark" onClick={() => (setMode('watch'), skip())} data-skip="">
              Skip to the result
            </button>
          </div>
        </div>
      ) : (
        <>
          {!done && asking === null && (
            <ActionCam
              key={i < warm ? 'warm' : i}
              play={i < warm ? null : (cur ?? null)}
              us={sides.us}
              them={sides.them}
              winner={winner}
              me={g ? { name: g.player.name, number: g.player.number } : null}
              venue={venue}
              note={curCall ? GRADE_NOTE[curCall.grade] : undefined}
            />
          )}
          {!done && asking !== null && (
            <ClutchPanel
              play={d.plays[asking]}
              moves={clutchMoves(d.plays[asking], winner)!}
              ratings={g?.player.attrs ?? {}}
              onDone={(move, grade) => {
                setCalls((c) => ({ ...c, [asking]: { move, grade } }));
                setAsking(null);
                setI((x) => x + 1);
              }}
            />
          )}
          {i < warm && !done && <div className="on-dark small">Three quarters of a final…</div>}
          <div className="drama-feed" aria-live="polite">
            {(done ? plays : shown)
              .slice()
              .reverse()
              .slice(0, done ? 3 : 4)
              .map((p, k) => (
                <div key={`${p.clock}-${p.text}`} className={`drama-play${p.mine ? ' mine' : ''}${k === 0 && !done ? ' fresh' : ''}${p.side === 'them' ? ' them' : ''}`}>
                  {p.tag && <span className={`drama-tag tag-${p.tag.toLowerCase()}`}>{TAG_LABEL[p.tag]}</span>}
                  <span className="drama-clock">{p.clock}</span>
                  <span className="drama-text">{p.text}</span>
                  {p.pts > 0 && <b>+{p.pts}</b>}
                </div>
              ))}
          </div>
        </>
      )}
      {done ? (
        <>
          {rating !== null && (
            <div className="clutch-score">
              <b>{rating}</b>
              <span>
                Clutch rating · {graded.filter((c) => c.grade === 'perfect').length} perfect of {graded.length}
                {g && reward ? ` · +${reward} reputation` : ''}
              </span>
            </div>
          )}
          {m.lostFinal ? (
            <div className="stack" style={{ gap: 8 }}>
              <div className="moment-title">So close</div>
              <p className="on-dark lede-dark">{m.text}</p>
            </div>
          ) : (
            <>
              {g && <CelebrationArt g={g} prize={m.title} mode={m.kind === 'tournament' ? 'bite' : 'cheer'} />}
              <div className="champ-banner">
                <span>Champions</span>
                <b>{m.title}</b>
              </div>
            </>
          )}
          <Recap m={m} />
        </>
      ) : (
        mode !== 'ask' && (
          <button className="btn ghost-dark" onClick={skip} data-skip="">
            Skip to the final buzzer
          </button>
        )
      )}
    </div>
  );
}

// ---------- moment pages ----------

function DraftReveal({ m }: { m: Moment }) {
  const [shown, setShown] = useState(reducedMotion());
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 1600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="stack center" style={{ gap: 12 }}>
      <div className="kicker on-dark">NBA Draft · pick {m.pick}</div>
      {!shown ? (
        <div className="pick-wait">
          <div className="season-year">#{m.pick}</div>
          <div className="on-dark">The pick is in…</div>
        </div>
      ) : (
        <div className="reveal stack center" style={{ gap: 10 }}>
          <div className="moment-title">{m.teamName}</div>
          <p className="on-dark lede-dark">{m.text}</p>
          {m.lines?.map((x, i) => (
            <div key={i} className="moment-line">
              {x}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const KICKER: Record<Moment['kind'], string> = {
  intro: 'Day one',
  commit: 'Decision made',
  draft: 'Draft night',
  title: 'Championship',
  awards: 'Honours',
  camp: 'Training camp',
  injury: 'Injury',
  event: 'Turning point',
  tournament: 'Tournament',
  fine: 'Fined',
};

const CONFETTI = ['#F5C542', '#FFFFFF', '#E8590C', '#2F9E44', '#1C7ED6', '#C2255C'];

/**
 * Round 15: titles and medals celebrate, early exits and lost finals hurt. Confetti for a title
 * or gold, a medal swinging in for silver and bronze, a grey-out and a stamp when it ends badly.
 * Purely visual (CSS animations; nothing moves with reduced motion).
 */
function MoodFx({ mood, color }: { mood: NonNullable<Moment['mood']>; color: string }) {
  if (mood === 'champion' || mood === 'gold')
    return (
      <div className="fx-layer" aria-hidden="true">
        <div className="fx-confetti">
          {Array.from({ length: 70 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37 + 11) % 100}%`,
                background: i % 4 === 0 ? color : CONFETTI[i % CONFETTI.length],
                animationDelay: `${(i % 14) * 0.09}s`,
                animationDuration: `${2.6 + (i % 6) * 0.35}s`,
                width: `${6 + (i % 3) * 3}px`,
                height: `${10 + (i % 4) * 3}px`,
              }}
            />
          ))}
        </div>
        <div className={`fx-stamp win`}>{mood === 'gold' ? 'Gold' : 'Champions'}</div>
      </div>
    );
  if (mood === 'silver' || mood === 'bronze')
    return (
      <div className="fx-layer" aria-hidden="true">
        <div className={`fx-medal ${mood}`}>
          {/* round 28: a pixel medal (it was a smooth CSS disc) */}
          <MedalArt metal={mood} place={mood === 'silver' ? 2 : 3} ribbon="currentColor" size={150} />
        </div>
      </div>
    );
  return (
    <div className="fx-layer" aria-hidden="true">
      <div className={`fx-stamp lose`}>{mood === 'heartbreak' ? 'So close' : 'Eliminated'}</div>
    </div>
  );
}

function MomentPage({ m, g }: { m: Moment; g: GameState }) {
  const dismiss = useStore((s) => s.dismissMoment);
  const ref = useRef<HTMLButtonElement>(null);
  // a reel plays first; the celebration (or the heartbreak) lands when it ends
  const reel = !!m.game && (!!m.drama || m.kind === 'title');
  const [ended, setEnded] = useState(!reel);
  useEffect(() => setEnded(!reel), [m.id, reel]);
  // Continue takes focus only once the buzzer sounds, so Enter can't skip past the reel
  useEffect(() => {
    if (ended) ref.current?.focus({ preventScroll: true });
  }, [m.id, ended]);
  const end = useCallback(() => setEnded(true), []);
  // the kind as mo-<kind>: a bare "intro" picked up the intro page's .intro rule (overflow hidden), and the Day one page stopped scrolling
  return (
    <div className={`overlay moment mo-${m.kind}${m.mood && ended ? ` mood-${m.mood}` : ''}`} style={{ ['--team' as string]: m.color }} role="dialog" aria-modal="true" aria-label={m.title}>
      {m.mood && ended && <MoodFx key={`fx-${m.id}`} mood={m.mood} color={m.color} />}
      <div className="overlay-inner" key={m.id}>
        {m.drama && m.game ? (
          <FinalReel m={m} g={g} onDone={end} />
        ) : m.kind === 'title' && m.game ? (
          <TitleGame m={m} g={g} onDone={end} />
        ) : m.kind === 'draft' ? (
          <DraftReveal m={m} />
        ) : (
          <div className="stack reveal" style={{ gap: 12 }}>
            {m.logo ? (
              <NickLogo id={m.logo} name={g.player.name} size={160} />
            ) : m.nick ? (
              <div className="nick-reveal">
                <PixelWord text={m.nick} color="#FFD43B" shade="#5A4206" className="nick-word" />
              </div>
            ) : m.duo && activeDuo(g) ? <DuoArt g={g} b={activeDuo(g)!} third={activeTrio(g)} size={170} /> : <StoryScene g={g} title={m.title} kind={m.kind === 'tournament' && (m.mood === 'silver' || m.mood === 'bronze' || m.mood === 'out') ? 'medal' : m.kind} prize={m.kind === 'awards' ? m.lines?.[0] : m.kind === 'title' ? m.title : m.kind === 'tournament' ? `${m.title}. ${m.text}` : undefined} />}
            <div className="kicker on-dark">{KICKER[m.kind]}</div>
            {m.kind === 'injury' ? (
              <div className="title-with-icon">
                <InjuryBadge name={m.title} sev={/^Season over/.test(m.text) ? 'season' : 'major'} size={56} />
                <div className="moment-title">{m.title}</div>
              </div>
            ) : (
              <div className="moment-title">{m.title}</div>
            )}
            {/* round 31: a tournament's line is its result, so simple text keeps it */}
            {m.outcome ? <Outcome o={m.outcome} /> : <p className={`on-dark lede-dark${m.kind === 'tournament' ? '' : ' prose'}`}>{m.text}</p>}
            {m.kind === 'awards' ? (
              <div className="banners">
                {m.lines?.map((x, i) => (
                  <div key={i} className="banner gold drop with-award" style={{ animationDelay: `${0.15 + i * 0.18}s` }}>
                    <AwardArt akey={awardKeyOf(x)} label={x} size={40} />
                    <span>{x}</span>
                  </div>
                ))}
              </div>
            ) : (
              m.lines?.map((x, i) => (
                <div key={i} className="moment-line" style={{ animationDelay: `${0.2 + i * 0.12}s` }}>
                  {x}
                </div>
              ))
            )}
            <Recap m={m} />
          </div>
        )}
        <button ref={ref} className="btn moment-btn" onClick={dismiss}>
          Continue
        </button>
      </div>
    </div>
  );
}

export function Overlays({ g }: { g: GameState }) {
  const t = useStore((s) => s.transition);
  const end = useStore((s) => s.endTransition);
  if (t?.kind === 'half') return <HalfSim t={t} g={g} onDone={end} />;
  if (t?.kind === 'season') return <SeasonCard t={t} g={g} onDone={end} />;
  if (g.moments.length > 0) return <MomentPage m={g.moments[0]} g={g} />;
  return null;
}

export { ordinal };
