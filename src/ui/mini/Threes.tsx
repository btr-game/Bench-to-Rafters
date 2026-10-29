// The three-point contest (engine/mini/threes.ts): stop the sweeping meter in the green.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SHOOTERS } from '../../content/franchiseFives';
import { ballSetup, ballValue, contestRng, LIVELY, simRound, shotResult, THREES, zoneWidth, type RoundScore, type Shooter } from '../../engine/mini/threes';
import { useStore } from '../../store';
import { shuffle } from '../../engine/rng';

type Ball = 'todo' | 'make' | 'miss';

function Round({ shooter, moneyRack, onDone, label }: { shooter: Shooter; moneyRack: number; onDone: (score: number) => void; label: string }) {
  const rng = useMemo(() => contestRng(Math.floor(Math.random() * 2 ** 31)), []);
  const setups = useMemo(() => Array.from({ length: THREES.racks * THREES.balls }, (_, k) => ballSetup(rng, k)), [rng]);
  const [balls, setBalls] = useState<Ball[]>(() => Array(THREES.racks * THREES.balls).fill('todo'));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<string>('');
  const [surging, setSurging] = useState(false);
  const [left, setLeft] = useState(THREES.seconds);
  const [started, setStarted] = useState(false);
  const clock0 = useRef(0);
  const ball0 = useRef(0); // when the current ball came up
  const last = useRef(0);
  const pos = useRef(0.5);
  const dir = useRef(1);
  const lock = useRef(false);
  const iRef = useRef(0);
  const marker = useRef<HTMLDivElement>(null);
  const done = i >= balls.length || left <= 0;
  const onFire = streak >= LIVELY.fireAfter;

  // the meter: its own pace for every ball, sudden surges, and a faster finish
  useEffect(() => {
    if (!started || done) return;
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(50, now - (last.current || now));
      last.current = now;
      const su = setups[iRef.current];
      const since = now - ball0.current;
      const inSurge = !!su?.surge && since >= su.surge.at && since <= su.surge.at + su.surge.len;
      const l = Math.max(0, THREES.seconds - (now - clock0.current) / 1000);
      const speed = (su?.pace ?? 1) * (inSurge ? su!.surge!.mult : 1) * (l <= LIVELY.crunchFrom ? LIVELY.crunch : 1);
      let p = pos.current + (dir.current * speed * dt) / THREES.sweepMs;
      if (p > 1) {
        p = 2 - p;
        dir.current = -1;
      } else if (p < 0) {
        p = -p;
        dir.current = 1;
      }
      pos.current = p;
      if (marker.current) marker.current.style.left = `${p * 100}%`;
      setSurging((x) => (x !== inSurge ? inSurge : x));
      setLeft((x) => (Math.abs(x - l) > 0.09 ? l : x));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, done, setups]);

  useEffect(() => {
    if (done && started) {
      const t = setTimeout(() => onDone(score), 900);
      return () => clearTimeout(t);
    }
  }, [done, started, score, onDone]);

  const zoneFor = (k: number) => {
    const money = ballValue(Math.floor(k / THREES.balls), k % THREES.balls, moneyRack) === THREES.money;
    return zoneWidth(shooter.skill, k) * (onFire ? LIVELY.fireZone : 1) * (money ? LIVELY.moneyZone : 1);
  };

  const shoot = useCallback(() => {
    if (!started) {
      setStarted(true);
      clock0.current = performance.now();
      ball0.current = performance.now();
      return;
    }
    if (done || lock.current) return;
    lock.current = true;
    const su = setups[i];
    const r = shotResult(rng, pos.current, zoneFor(i), su.centre);
    const made = r === 'swish' || r === 'make';
    const rack = Math.floor(i / THREES.balls);
    const v = ballValue(rack, i % THREES.balls, moneyRack);
    setBalls((b) => b.map((x, k) => (k === i ? (made ? 'make' : 'miss') : x)));
    if (made) setScore((s) => s + v);
    const st = made ? streak + 1 : 0;
    setStreak(st);
    setFlash(
      (r === 'swish' ? `Swish! +${v}` : r === 'make' ? `Good +${v}` : r === 'rim' ? 'In and out' : 'Off the mark') +
        (st === LIVELY.fireAfter ? ' · On fire!' : !made && streak >= LIVELY.fireAfter ? ' · Cooled off' : ''),
    );
    setI((x) => x + 1);
    iRef.current = i + 1;
    // a beat to grab the next ball
    setTimeout(() => {
      lock.current = false;
      ball0.current = performance.now();
    }, 260);
  }, [started, done, rng, shooter.skill, i, moneyRack, setups, streak, onFire]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        shoot();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [shoot]);

  const k = Math.min(i, balls.length - 1);
  const zone = zoneFor(k);
  const centre = setups[k].centre;
  return (
    <div className={`stack threes${onFire ? ' on-fire' : ''}`}>
      <div className="row">
        <div>
          <div className="kicker">{label}</div>
          <div className="sec-title">{shooter.name}</div>
        </div>
        <div className="spacer" />
        <div className={`three-score${left <= LIVELY.crunchFrom && started && !done ? ' crunch' : ''}`}>
          {score}
          <small>{Math.ceil(left)}s</small>
        </div>
      </div>
      <div className="racks">
        {Array.from({ length: THREES.racks }, (_, r) => (
          <div key={r} className={`rack${r === moneyRack ? ' money-rack' : ''}${Math.floor(i / THREES.balls) === r && !done ? ' now' : ''}`}>
            {Array.from({ length: THREES.balls }, (_, b) => {
              const kk = r * THREES.balls + b;
              return <span key={b} className={`ball ${balls[kk]}${ballValue(r, b, moneyRack) === 2 ? ' money' : ''}`} />;
            })}
          </div>
        ))}
      </div>
      <div className={`meter${surging ? ' surging' : ''}`} aria-hidden="true">
        <div className="meter-zone" style={{ left: `${(centre - zone / 2) * 100}%`, width: `${zone * 100}%` }} />
        <div className="meter-sweet" style={{ left: `${(centre - zone * 0.09) * 100}%`, width: `${zone * 18}%` }} />
        <div className="meter-mark" ref={marker} />
      </div>
      <div className="three-flash" aria-live="polite">
        {done ? (left <= 0 && i < balls.length ? 'Time!' : 'Round over') : surging ? 'Surge!' : flash || (started ? '' : 'Tap Shoot to start the clock')}
      </div>
      <button className="btn block shoot-btn" onClick={shoot} disabled={done}>
        {started ? 'Shoot' : 'Start'}
      </button>
      <p className="small muted">Stop the marker in the green; the bright middle is a swish. Every ball moves at its own pace and the green moves too. Watch for surges. Three in a row and you are on fire: a wider green until you miss. Money balls (gold) are worth 2 and a little harder.</p>
    </div>
  );
}

export function ThreesGame() {
  const game = useStore((s) => s.game);
  const mine: Shooter | null = game
    ? { name: game.player.name, skill: Math.round(Math.max(30, Math.min(99, game.player.attrs.SHT * 0.75 + game.player.range * 0.25))), team: 'You', me: true }
    : null;
  const pool: Shooter[] = [...(mine ? [mine] : []), ...SHOOTERS.map((x) => ({ ...x }))];
  const [me, setMe] = useState<Shooter | null>(null);
  const [money, setMoney] = useState(4);
  const [stage, setStage] = useState<'setup' | 'r1' | 'board' | 'final' | 'done'>('setup');
  const [field, setField] = useState<Shooter[]>([]);
  const [r1, setR1] = useState<RoundScore[]>([]);
  const [fin, setFin] = useState<RoundScore[]>([]);

  const start = (s: Shooter) => {
    setMe(s);
    setField(shuffle(contestRng(Math.floor(Math.random() * 1e9)), SHOOTERS.filter((x) => x.name !== s.name)).slice(0, 7));
  };
  const sim = (list: Shooter[]): RoundScore[] => {
    const r = contestRng(Math.floor(Math.random() * 2 ** 31));
    return list.map((x) => ({ name: x.name, score: simRound(r, x.skill) }));
  };
  const finishR1 = useCallback(
    (score: number) => {
      const all: RoundScore[] = [{ name: me!.name, score, me: true }, ...sim(field)].sort((a: RoundScore, b: RoundScore) => b.score - a.score || (a.me ? -1 : 1));
      setR1(all);
      setStage('board');
    },
    [me, field],
  );
  const finishFinal = useCallback(
    (score: number) => {
      const others = r1.filter((x) => !x.me).slice(0, 2);
      const all: RoundScore[] = [{ name: me!.name, score, me: true }, ...sim(field.filter((f) => others.some((o) => o.name === f.name)))].sort((a: RoundScore, b: RoundScore) => b.score - a.score || (a.me ? -1 : 1));
      setFin(all);
      setStage('done');
    },
    [me, r1, field],
  );

  if (stage === 'setup')
    return (
      <section className="stack">
        <div className="kicker">Three-point contest</div>
        <h2 className="title">{me ? 'Your money-ball rack' : 'Pick your shooter'}</h2>
        {!me ? (
          <div className="plans">
            {pool.map((s) => (
              <button key={s.name} className="choice" onClick={() => start(s)}>
                <span className="label">{s.me ? `${s.name} (your player)` : s.name}</span>
                <small>{s.skill >= 95 ? 'Elite stroke: a wide green zone' : s.skill >= 90 ? 'Pure shooter' : s.skill >= 80 ? 'Good shooter' : 'Streaky: a narrow green zone'}</small>
              </button>
            ))}
          </div>
        ) : (
          <>
            <p className="small muted">One rack is all money balls (2 points each). Most shooters put it last, where the corner is; tired arms say otherwise.</p>
            <div className="seg">
              {[0, 1, 2, 3, 4].map((r) => (
                <button key={r} aria-pressed={money === r} onClick={() => setMoney(r)}>
                  Rack {r + 1}
                </button>
              ))}
            </div>
            <p className="small">
              Field: {field.map((f) => f.name).join(', ')}. Top three go to the final.
            </p>
            <button className="btn" onClick={() => setStage('r1')}>
              Step to the line
            </button>
          </>
        )}
      </section>
    );

  if (stage === 'r1') return <Round shooter={me!} moneyRack={money} onDone={finishR1} label="First round" />;
  if (stage === 'final') return <Round shooter={me!} moneyRack={money} onDone={finishFinal} label="Final round" />;

  const board = stage === 'board' ? r1 : fin;
  const place = board.findIndex((x) => x.me) + 1;
  return (
    <section className="stack">
      <div className="kicker">{stage === 'board' ? 'First round' : 'Final'}</div>
      <h2 className="title">{stage === 'done' ? (place === 1 ? 'Three-point champion!' : `You finished ${place === 2 ? 'second' : 'third'}`) : place <= 3 ? 'Into the final' : 'Out in the first round'}</h2>
      <div className="five">
        {board.map((x, k) => (
          <div key={x.name} className={`five-row${x.me ? ' mine' : ''}`}>
            <span>{k + 1}</span>
            <b>{x.name}</b>
            <span>{x.score}</span>
            <span />
          </div>
        ))}
      </div>
      {stage === 'board' && place <= 3 ? (
        <button className="btn" onClick={() => setStage('final')}>
          Shoot the final
        </button>
      ) : (
        <button
          className="btn"
          onClick={() => {
            setMe(null);
            setStage('setup');
          }}
        >
          Play again
        </button>
      )}
    </section>
  );
}
