// The daily challenge (engine/mini/daily.ts): one prospect a day, the same for everyone, played
// with fast break and simple text. The page before the run, the strip on top during it, and the
// score at the end. Scores stay on this device.

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { dailyInput, dailyScore, todayKey } from '../../engine/mini/daily';
import { ARCHETYPES } from '../../engine/player/archetypes';
import { NAMES } from '../../content/strings';
import type { GameState } from '../../engine/types';
import { PlayerArt } from '../art/Player';
import { FlagArt } from '../art/Flag';
import { Icon } from '../art/Icon';

const KEY = 'btr-daily';
type Best = { points: number; legacy: number; peak: number; runs: number; last?: string; prevBest?: Best };

function loadBests(): Record<string, Best> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Best>;
  } catch {
    return {};
  }
}

/** Keeps a finished run; returns the day's best before and after. */
function recordRun(day: string, s: GameState): { before: Best | null; now: Best } {
  const all = loadBests();
  const sc = dailyScore(s);
  // the same finished run is only counted once (a page shown twice must not count it again)
  const id = `${s.rng.s}:${s.year}`;
  const prev = all[day] ?? null;
  if (prev?.last === id) return { before: prev.prevBest ?? null, now: prev };
  const before = prev;
  const now: Best = before && before.points >= sc.points ? { ...before, runs: before.runs + 1, last: id, prevBest: before } : { ...sc, runs: (before?.runs ?? 0) + 1, last: id, prevBest: before ?? undefined };
  all[day] = { ...now, prevBest: now.prevBest && { ...now.prevBest, prevBest: undefined } };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage can be blocked; the score still shows */
  }
  return { before, now };
}

/** The page in the mini-game hub: today's prospect, the rules, the best run so far. */
export function DailyGame() {
  const start = useStore((s) => s.startDaily);
  const busy = useStore((s) => !!s.game && s.game.step !== 'retired' && !s.daily);
  const day = todayKey();
  const input = useMemo(() => dailyInput(day), [day]);
  const best = loadBests()[day];
  const arch = ARCHETYPES[input.pos][input.archetype];
  const streak = Object.keys(loadBests()).length;
  return (
    <section className="stack stage-in daily">
      <div>
        <div className="kicker">Mini-game · {day}</div>
        <h1 className="hub-title with-icon">
          <Icon name="calendar" size={40} />
          Daily challenge
        </h1>
        <p className="prose">Everyone gets the same prospect today. Take him from high school to retirement in Regular guy, with fast break and simple text on: a few minutes a run. Your score is the legacy he leaves, with his peak OVR breaking ties. Play as often as you like; the best run of the day counts.</p>
      </div>
      <div className="card daily-card">
        <PlayerArt name={input.name} number={input.number} pos={input.pos} size={120} />
        <div className="stack" style={{ gap: 4 }}>
          <div className="kicker">Today’s prospect</div>
          <div className="pc-name">{input.name}</div>
          <div className="with-flag">
            <FlagArt country={input.country!} size={22} />
            {input.country} · #{input.number} · {NAMES.pos[input.pos]}
          </div>
          <div className="small">
            {arch.name}: {arch.blurb.toLowerCase()}. Focus: {input.focus.map((k) => NAMES.attr[k]).join(' and ')}.
          </div>
        </div>
        <div className="daily-best">
          <small>Today’s best</small>
          <b>{best ? best.legacy : '—'}</b>
          <small>{best ? `legacy · peak ${best.peak} · ${best.runs} run${best.runs === 1 ? '' : 's'}` : 'no run yet'}</small>
        </div>
      </div>
      {busy ? (
        <p className="small">A career is in progress. The daily challenge opens from the start page, or once this career is over.</p>
      ) : (
        <button className="btn sb-go" onClick={start}>
          Start today’s run
        </button>
      )}
      {streak > 1 && <p className="small muted">You have played on {streak} days.</p>}
    </section>
  );
}

/** The strip on top of the screen during a run. */
export function DailyStrip({ g }: { g: GameState }) {
  const d = useStore((s) => s.daily);
  const end = useStore((s) => s.endDaily);
  // at the end the score card takes over
  if (!d || g.step === 'retired') return null;
  return (
    <div className="daily-strip">
      <Icon name="calendar" size={22} />
      <b>Daily challenge · {d.day}</b>
      <span className="small">
        {g.player.name}, age {g.player.age}
      </span>
      <span className="spacer" />
      <button className="btn ghost small" onClick={end}>
        Quit the run
      </button>
    </div>
  );
}

/** The score at the end of a run (on the retirement page). */
export function DailyResult({ g }: { g: GameState }) {
  const d = useStore((s) => s.daily);
  const end = useStore((s) => s.endDaily);
  const start = useStore((s) => s.startDaily);
  const [rec, setRec] = useState<ReturnType<typeof recordRun> | null>(null);
  useEffect(() => {
    if (d) setRec(recordRun(d.day, g));
    // once per finished run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!d) return null;
  const sc = dailyScore(g);
  const record = rec && (!rec.before || sc.points > rec.before.points);
  return (
    <section className="card stack daily-result">
      <div className="kicker">Daily challenge · {d.day}</div>
      <div className="row" style={{ gap: 18, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div className="daily-score">
          <b>{sc.legacy}</b>
          <small>legacy points</small>
        </div>
        <div className="daily-score">
          <b>{sc.peak}</b>
          <small>peak OVR</small>
        </div>
        {rec && <div className="small">{record ? (rec.before ? `A new best for today (was ${rec.before.legacy}).` : 'Your first run today.') : `Today’s best stays ${rec.now.legacy} (peak ${rec.now.peak}).`}</div>}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={end}>
          Done
        </button>
        <button className="btn ghost" onClick={start}>
          Run it again
        </button>
      </div>
    </section>
  );
}
