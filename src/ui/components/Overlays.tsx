// Full-screen interstitials: the half-season ticker, the new-season card, and story
// pages (moments) such as commitments, draft night, awards and the title game.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, Moment } from '../../engine/types';
import { LEVELS } from '../../engine/balance';
import { useStore, type Transition } from '../../store';
import { ordinal } from '../format';
import { stageLine } from '../selectors';

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

function HalfSim({ t, onDone }: { t: Extract<Transition, { kind: 'half' }>; onDone: () => void }) {
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
  useEffect(() => {
    if (!done) return;
    const tm = setTimeout(onDone, reducedMotion() ? 0 : 900);
    return () => clearTimeout(tm);
  }, [done, onDone]);
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
        <button className="btn ghost-dark" onClick={done ? onDone : skip}>
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

function Recap({ m }: { m: Moment }) {
  if (!m.recap || m.recap.length === 0) return null;
  return (
    <div className="recap">
      {m.recap.map((sec, i) => (
        <div key={i} className="recap-sec" style={{ animationDelay: `${0.3 + i * 0.15}s` }}>
          <div className="kicker on-dark">{sec.heading}</div>
          {sec.rows.map((r, k) => (
            <div key={k} className="recap-row">
              {r}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TitleGame({ m, g }: { m: Moment; g: GameState }) {
  const plays = useMemo(() => buildPlays(m, g.player.name), [m, g.player.name]);
  const n = plays.length;
  const [i, skip] = useTicker(n, Math.max(40, Math.min(160, 6500 / Math.max(1, n))));
  const done = i >= n;
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
          <div className="champ-banner">
            <span>Champions</span>
            <b>{m.title}</b>
          </div>
          <Recap m={m} />
        </>
      ) : (
        <button className="btn ghost-dark" onClick={skip}>
          Skip to the final buzzer
        </button>
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
};

function MomentPage({ m, g }: { m: Moment; g: GameState }) {
  const dismiss = useStore((s) => s.dismissMoment);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [m.id]);
  return (
    <div className={`overlay moment ${m.kind}`} style={{ ['--team' as string]: m.color }} role="dialog" aria-modal="true" aria-label={m.title}>
      <div className="overlay-inner" key={m.id}>
        {m.kind === 'title' && m.game ? (
          <TitleGame m={m} g={g} />
        ) : m.kind === 'draft' ? (
          <DraftReveal m={m} />
        ) : (
          <div className="stack reveal" style={{ gap: 12 }}>
            <div className="kicker on-dark">{KICKER[m.kind]}</div>
            <div className="moment-title">{m.title}</div>
            <p className="on-dark lede-dark">{m.text}</p>
            {m.kind === 'awards' ? (
              <div className="banners">
                {m.lines?.map((x, i) => (
                  <div key={i} className="banner gold drop" style={{ animationDelay: `${0.15 + i * 0.18}s` }}>
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
  if (t?.kind === 'half') return <HalfSim t={t} onDone={end} />;
  if (t?.kind === 'season') return <SeasonCard t={t} g={g} onDone={end} />;
  if (g.moments.length > 0) return <MomentPage m={g.moments[0]} g={g} />;
  return null;
}

export { ordinal };
