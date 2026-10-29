// The dunk contest (engine/mini/dunk.ts): design a dunk, then land it one timing tap at a time.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bailOut, contestRng, DUNK, DUNKERS, dunkDifficulty, difficultyLabel, dunkName, dunkParts, dunkTaps, freshParts, judge, MOVES, PROPS, simDunk, sweepFor, TAKEOFFS, tapQuality, type DunkDesign, type Dunker, type DunkPart, type DunkScore, type DunkTap } from '../../engine/mini/dunk';
import { shuffle } from '../../engine/rng';
import { useStore } from '../../store';
import { MiniBonus } from './MiniBonus';
import { DunkStage } from './DunkStage';
import { kitFor, styleLeague } from '../art/Player';
import { team as teamOf } from '../selectors';

/** One part of a dunk to pick: its name and difficulty dots; a check mark when chosen. */
function PartChip({ part, on, used, onClick }: { part: DunkPart; on: boolean; used: boolean; onClick: () => void }) {
  return (
    <button className={`dunk-chip${on ? ' on' : ''}${used && part.diff > 0 ? ' used' : ''}`} aria-pressed={on} onClick={onClick}>
      <span>
        {on ? '✓ ' : ''}
        {part.name}
      </span>
      <small>{part.diff ? '●'.repeat(part.diff) : '–'}</small>
    </button>
  );
}

/** The chosen takeoff, moves and prop, spelled out. */
function Recipe({ d }: { d: DunkDesign }) {
  const name = (list: DunkPart[], id: string) => list.find((p) => p.id === id)?.name ?? '';
  return (
    <div className="dunk-recipe">
      <span>
        <i>Takeoff</i>
        {name(TAKEOFFS, d.takeoff)}
      </span>
      <span>
        <i>Moves</i>
        {d.moves.length ? d.moves.map((m) => name(MOVES, m)).join(' + ') : 'Pick one'}
      </span>
      <span>
        <i>Prop</i>
        {name(PROPS, d.prop)}
      </span>
    </div>
  );
}

/** The timing taps for one attempt. Reports every tap's quality, or the tap that missed. */
function Taps({ taps, sweep, onDone, onTap }: { taps: DunkTap[]; sweep: number; onDone: (q: number[], missedAt: number | null) => void; onTap?: (n: number) => void }) {
  const [i, setI] = useState(0);
  const [q, setQ] = useState<number[]>([]);
  const [flash, setFlash] = useState('');
  const pos = useRef(0);
  const dir = useRef(1);
  const last = useRef(0);
  const lock = useRef(false);
  const marker = useRef<HTMLDivElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(50, now - (last.current || now));
      last.current = now;
      let p = pos.current + (dir.current * dt) / sweep;
      if (p > 1) {
        p = 2 - p;
        dir.current = -1;
      } else if (p < 0) {
        p = -p;
        dir.current = 1;
      }
      pos.current = p;
      if (marker.current) marker.current.style.left = `${p * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sweep]);

  const tap = useCallback(() => {
    if (lock.current || finished.current) return;
    const t = taps[i];
    const v = tapQuality(pos.current, t);
    if (v === null) {
      finished.current = true;
      setFlash(`Missed the ${t.label.toLowerCase()}!`);
      setTimeout(() => onDone(q, i), 700);
      return;
    }
    const nq = [...q, v];
    setQ(nq);
    onTap?.(nq.length);
    setFlash(v > 0.8 ? 'Perfect' : v > 0.4 ? 'Good' : 'Just in');
    if (i + 1 >= taps.length) {
      finished.current = true;
      setTimeout(() => onDone(nq, null), 500);
      return;
    }
    lock.current = true;
    setTimeout(() => {
      lock.current = false;
      pos.current = 0;
      dir.current = 1;
      setI(i + 1);
    }, 300);
  }, [i, q, taps, onDone, onTap]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [tap]);

  const t = taps[Math.min(i, taps.length - 1)];
  return (
    <div className="stack">
      <div className="dunk-steps">
        {taps.map((x, k) => (
          <span key={k} className={k < q.length ? 'done' : k === i ? 'now' : ''}>
            {x.label}
          </span>
        ))}
      </div>
      <div className="meter" aria-hidden="true">
        <div className="meter-zone" style={{ left: `${(t.centre - t.zone / 2) * 100}%`, width: `${t.zone * 100}%` }} />
        <div className="meter-sweet" style={{ left: `${(t.centre - t.zone * 0.1) * 100}%`, width: `${t.zone * 20}%` }} />
        <div className="meter-mark" ref={marker} />
      </div>
      <div className="three-flash" aria-live="polite">
        {flash || t.label}
      </div>
      <button className="btn block shoot-btn" onClick={tap}>
        {t.label}
      </button>
    </div>
  );
}

function Cards({ s }: { s: DunkScore }) {
  return (
    <div className="stack dunk-score">
      <div className="judges">
        {s.judges.map((j, k) => (
          <span key={k} className={j === 10 ? 'ten' : ''}>
            {j}
          </span>
        ))}
      </div>
      <div className="dunk-total">
        <b>{s.total}</b> <span className="muted small">{s.name}</span>
      </div>
    </div>
  );
}

interface Entry {
  d: Dunker;
  scores: DunkScore[];
}

const sum = (e: Entry) => e.scores.reduce((a, s) => a + s.total, 0);

function Board({ list, title }: { list: Entry[]; title: string }) {
  return (
    <section className="card stack">
      <div className="sec-title">{title}</div>
      {list.map((e, k) => (
        <div key={e.d.name} className={`dunk-row${e.d.me ? ' mine' : ''}`}>
          <b>
            {k + 1}. {e.d.name}
          </b>
          <span className="muted small">{e.scores.map((s) => s.total).join(' + ')}</span>
          <b>{sum(e)}</b>
        </div>
      ))}
    </section>
  );
}

export function DunkGame() {
  const game = useStore((s) => s.game);
  // the stage: the dunker in his team's road kit, and how far through the taps he is
  const myTeam = game ? teamOf(game) : null;
  const kit = kitFor(myTeam?.name ?? '', myTeam?.abbr ?? '', myTeam?.color ?? '#1D428A', 'road', styleLeague(game?.stage));
  const [tapsDone, setTapsDone] = useState(0);
  const me: Dunker = { name: game ? game.player.name : 'You', skill: 0, me: true };
  const ath = game ? Math.round(Math.max(40, Math.min(99, game.player.attrs.ATH))) : 85;
  const rng = useMemo(() => contestRng(Math.floor(Math.random() * 2 ** 31)), []);
  const [stage, setStage] = useState<'setup' | 'build' | 'tap' | 'scored' | 'board' | 'done'>('setup');
  const [field, setField] = useState<Dunker[]>([]);
  const [round, setRound] = useState<1 | 2>(1);
  const [mine, setMine] = useState<DunkScore[][]>([[], []]);
  const [others, setOthers] = useState<Entry[][]>([[], []]);
  const [design, setDesign] = useState<DunkDesign>({ takeoff: 'run', moves: ['windmill'], prop: 'none' });
  const [attempt, setAttempt] = useState(1);
  const [used, setUsed] = useState<string[]>([]);
  const [missed, setMissed] = useState<string | null>(null);
  const [taps, setTaps] = useState<DunkTap[]>([]);
  const [tryKey, setTryKey] = useState(0);

  const diff = dunkDifficulty(design);
  const go = () => {
    setTaps(dunkTaps(rng, design, ath));
    setMissed(null);
    setTryKey((k) => k + 1);
    setTapsDone(0);
    setStage('tap');
  };
  const land = (s: DunkScore) => {
    setMine((m) => m.map((r, k) => (k === round - 1 ? [...r, s] : r)));
    setUsed((u) => [...u, ...dunkParts(design).map((p) => p.id)]);
    setAttempt(1);
    setMissed(null);
    setStage('scored');
  };
  const onDone = (q: number[], missedAt: number | null) => {
    if (missedAt === null) return land(judge(rng, design, q, attempt, used));
    if (attempt >= DUNK.attempts) return land(bailOut(rng));
    setAttempt(attempt + 1);
    setMissed(taps[missedAt].label);
    setStage('build');
  };
  const myEntry = (r: number): Entry => ({ d: me, scores: mine[r] });
  const closeRound = () => {
    const rivals = round === 1 ? field : [ranked(0).find((e) => !e.d.me)!.d];
    const sims = rivals.map((d) => ({ d, scores: [simDunk(rng, d), simDunk(rng, d)] }));
    setOthers((o) => o.map((x, k) => (k === round - 1 ? sims : x)));
    setStage(round === 1 ? 'board' : 'done');
  };
  const ranked = (r: number): Entry[] => [myEntry(r), ...others[r]].sort((a, b) => sum(b) - sum(a) || (a.d.me ? -1 : 1));

  if (stage === 'setup')
    return (
      <section className="stack">
        <div className="kicker">Dunk contest</div>
        <h2 className="title">All-Star Saturday night</h2>
        <div className="rule-tiles">
          <div className="rule-tile">
            <b>2</b>
            <span>dunks a round</span>
          </div>
          <div className="rule-tile">
            <b>3</b>
            <span>attempts a dunk</span>
          </div>
          <div className="rule-tile">
            <b>Top 2</b>
            <span>go to the final</span>
          </div>
        </div>
        <section className="card stack">
          <p className="small">
            Four dunkers, two dunks each. The top two go to the final for two more. Design every dunk: a takeoff, one or two moves and maybe a prop. Each part is one timing tap; miss one and the attempt fails. Three attempts a dunk.
          </p>
          <p className="small">Five judges score 6 to 10 each. Landing a dunk is the easy part; 9s and 10s take a hard dunk with clean timing (hit the bright middle of each green). Moves you haven't shown yet score a little extra, and a dunk landed on a later try loses a little.</p>
          <p className="small muted">
            {me.name}'s bounce: Athleticism {ath}
            {game ? '' : ' (start a career to dunk as your own player)'}. More athleticism means a wider green.
          </p>
          <button
            className="btn"
            onClick={() => {
              setField(shuffle(rng, DUNKERS).slice(0, 3));
              setStage('build');
            }}
          >
            Meet the field
          </button>
        </section>
      </section>
    );

  const dunkNo = mine[round - 1].length + 1;
  // round 15: the rules stay in view while you play
  const header = (
    <div className="dunk-status">
      <span className="kicker">Dunk contest · {round === 1 ? 'first round' : 'final'}</span>
      <span className="dunk-pips" aria-label={`Dunk ${Math.min(2, dunkNo)} of 2`}>
        Dunk
        {[1, 2].map((k) => (
          <i key={k} className={k < dunkNo ? 'done' : k === dunkNo ? 'now' : ''} />
        ))}
      </span>
      {(stage === 'build' || stage === 'tap') && (
        <span className="dunk-pips attempts" aria-label={`Attempt ${attempt} of ${DUNK.attempts}`}>
          Attempt
          {Array.from({ length: DUNK.attempts }, (_, k) => (
            <i key={k} className={k + 1 < attempt ? 'miss' : k + 1 === attempt ? 'now' : ''} />
          ))}
        </span>
      )}
    </div>
  );

  if (stage === 'build') {
    const toggle = (id: string) =>
      setDesign((d) => ({ ...d, moves: d.moves.includes(id) ? d.moves.filter((m) => m !== id) : d.moves.length >= DUNK.maxMoves ? [d.moves[1], id] : [...d.moves, id] }));
    const fresh = freshParts(design, used);
    return (
      <section className="stack">
        {header}
        {round === 1 && dunkNo === 1 && attempt === 1 && <p className="small muted">Up against {field.map((f) => f.name).join(', ')}.</p>}
        <DunkStage kit={kit} name={me.name} design={design} phase="idle" />
        {missed && <p className="small warn">Missed the {missed.toLowerCase()}. Go again, or change the dunk.</p>}
        <section className="card stack">
          <div className="sec-title">Takeoff</div>
          <div className="dunk-chips">
            {TAKEOFFS.map((t) => (
              <PartChip key={t.id} part={t} on={design.takeoff === t.id} used={used.includes(t.id)} onClick={() => setDesign({ ...design, takeoff: t.id })} />
            ))}
          </div>
          <div className="sec-title">Moves (one or two)</div>
          <div className="dunk-chips">
            {MOVES.map((m) => (
              <PartChip key={m.id} part={m} on={design.moves.includes(m.id)} used={used.includes(m.id)} onClick={() => toggle(m.id)} />
            ))}
          </div>
          <div className="sec-title">Prop</div>
          <div className="dunk-chips">
            {PROPS.map((p) => (
              <PartChip key={p.id} part={p} on={design.prop === p.id} used={used.includes(p.id)} onClick={() => setDesign({ ...design, prop: p.id })} />
            ))}
          </div>
        </section>
        <section className="card stack dunk-preview">
          <div className="sec-title">Your dunk</div>
          <Recipe d={design} />
          <span className="small">
            Difficulty {diff} · {difficultyLabel(diff)} · {dunkTaps(contestRng(1), design, ath).length} taps
            {fresh ? ` · ${fresh} new for the judges` : ' · the judges have seen all of it'}
          </span>
        </section>
        <button className="btn" disabled={!design.moves.length} onClick={go}>
          {missed ? 'Try again' : 'Go for it'}
        </button>
      </section>
    );
  }

  if (stage === 'tap')
    return (
      <section className="stack">
        {header}
        <div className="sec-title">{dunkName(design)}</div>
        <Recipe d={design} />
        <DunkStage kit={kit} name={me.name} design={design} phase="taps" progress={tapsDone / Math.max(1, taps.length)} />
        <Taps key={tryKey} taps={taps} sweep={sweepFor(design)} onDone={onDone} onTap={setTapsDone} />
      </section>
    );

  if (stage === 'scored') {
    const last = mine[round - 1][mine[round - 1].length - 1];
    const roundDone = mine[round - 1].length >= 2;
    return (
      <section className="stack">
        {header}
        <section className="card stack">
          <DunkStage kit={kit} name={me.name} design={design} phase="replay" made={last.made} judges={last.made ? last.judges : undefined} />
          <div className="sec-title">{last.made ? (last.total >= 50 ? 'Fifty! The building erupts' : last.total >= 45 ? 'The crowd is up' : 'The judges have it') : 'Three misses'}</div>
          <Cards s={last} />
        </section>
        <button className="btn" onClick={roundDone ? closeRound : () => setStage('build')}>
          {roundDone ? 'See how the others did' : 'Next dunk'}
        </button>
      </section>
    );
  }

  if (stage === 'board') {
    const list = ranked(0);
    const through = list.slice(0, 2).some((e) => e.d.me);
    return (
      <section className="stack">
        <div className="kicker">Dunk contest · first round</div>
        <Board list={list} title="First round" />
        <section className="card stack">
          {list
            .filter((e) => !e.d.me)
            .map((e) => (
              <p key={e.d.name} className="small">
                <b>{e.d.name}</b>: {e.scores.map((s) => `${s.name} (${s.total})`).join('; ')}
              </p>
            ))}
        </section>
        {through ? (
          <button
            className="btn"
            onClick={() => {
              setRound(2);
              setStage('build');
            }}
          >
            On to the final
          </button>
        ) : (
          <button className="btn" onClick={() => setStage('done')}>
            Out in the first round
          </button>
        )}
      </section>
    );
  }

  // done
  const inFinal = mine[1].length > 0;
  const final = inFinal ? ranked(1) : [];
  const won = inFinal && final[0].d.me === true;
  const best = Math.max(...mine.flat().map((s) => s.total));
  return (
    <section className="stack">
      <div className="kicker">Dunk contest · results</div>
      <section className="card stack">
        <h2 className="title">{won ? (game ? `${me.name} wins the dunk contest!` : 'You win the dunk contest!') : inFinal ? `${final[0].d.name} takes the trophy` : 'Out in the first round'}</h2>
        <p className="small">Best dunk: {best}.</p>
      </section>
      {inFinal && <Board list={final} title="Final" />}
      <Board list={ranked(0)} title="First round" />
      <MiniBonus result={{ game: 'dunk', best, won }} />
      <button
        className="btn ghost"
        onClick={() => {
          setStage('setup');
          setRound(1);
          setMine([[], []]);
          setOthers([[], []]);
          setUsed([]);
          setAttempt(1);
        }}
      >
        Enter again
      </button>
    </section>
  );
}
