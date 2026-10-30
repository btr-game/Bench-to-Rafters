// Lockdown (engine/mini/rhythm.ts): a rhythm game of defense. Notes fall down two lanes, Block
// (A) and Steal (S); press as they reach the line, hold the long ones to the end. The beat is a
// small drum machine built with the Web Audio API (it starts with the Start button), and its
// clock is the game's clock, so the notes stay on the beat.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { RHYTHM, accuracy, gradeOf, judgeAt, makeChart, PATTERNS, type Chart, type Judge, type Lane, type Note, type Tally } from '../../engine/mini/rhythm';
import { MiniBonus } from './MiniBonus';
import { PlayerArt } from '../art/Player';
import { Icon } from '../art/Icon';

const W = 360;
const H = 540;
const HIT = H - 92; // the hit line
const LEAD = 1.6; // seconds a note is on screen before the line
const SPEED = (HIT - 40) / LEAD;
const LANE_X = [52, 192];
const LANE_W = 116;
const COLOR = [
  { base: '#F08A2C', dark: '#B4531E', light: '#FFC285', name: 'BLOCK', key: 'A' },
  { base: '#4DABF7', dark: '#1971C2', light: '#A5D8FF', name: 'STEAL', key: 'S' },
];
const JUDGE_COLOR: Record<string, string> = { perfect: '#FFD43B', good: '#69DB7C', miss: '#FF6B6B', held: '#FFD43B', dropped: '#FF6B6B' };

interface Live extends Note {
  judged: Judge | null;
  tail: 'held' | 'dropped' | null;
}

// ---------- the beat ----------

function drums(ctx: AudioContext, out: AudioNode, chart: Chart, start: number): void {
  const noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const kick = (t: number, v = 0.9) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.17);
  };
  const hiss = (t: number, len: number, freq: number, v: number, type: BiquadFilterType) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f).connect(g).connect(out);
    s.start(t);
    s.stop(t + len + 0.01);
  };
  const beats = Math.ceil((RHYTHM.countIn * chart.beat + chart.length) / chart.beat) + 2;
  for (let k = 0; k < beats; k++) {
    const t = start + k * chart.beat;
    if (k < RHYTHM.countIn) {
      hiss(t, 0.05, 6000, k === RHYTHM.countIn - 1 ? 0.5 : 0.3, 'highpass'); // the count-in: sticks
      continue;
    }
    const inBar = (k - RHYTHM.countIn) % 4;
    if (inBar === 0 || inBar === 2) kick(t);
    else hiss(t, 0.12, 1800, 0.45, 'bandpass'); // snare on 2 and 4
    hiss(t, 0.03, 8000, 0.12, 'highpass');
    hiss(t + chart.beat / 2, 0.03, 8000, 0.08, 'highpass');
  }
}

// The point of the song coming out of the speakers right now (players press on what they hear):
// the output timestamp, carried forward with the page clock so it moves smoothly between audio
// buffers; until the device reports one, the audio clock less its reported delay.
function heard(ctx: AudioContext): number {
  const o = ctx.getOutputTimestamp?.();
  if (o?.contextTime && o.performanceTime) return o.contextTime + (performance.now() - o.performanceTime) / 1000;
  return ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0);
}

// ---------- the stage ----------

function Stage({ chart, audio, muted, onDone }: { chart: Chart; audio: AudioContext | null; muted: boolean; onDone: (t: Tally) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const gain = useRef<GainNode | null>(null);
  const st = useRef({
    notes: chart.notes.map((n) => ({ ...n, judged: null, tail: null })) as Live[],
    tally: { perfect: 0, good: 0, miss: 0, held: 0, dropped: 0, maxCombo: 0 } as Tally,
    combo: 0,
    down: [false, false],
    flash: [-9, -9],
    holding: [null, null] as (Live | null)[],
    judge: { text: '', kind: '', at: -9 },
    start: 0,
    perf0: 0,
    done: false,
  });
  // the song starts a moment after the stage does; the audio clock is the game clock
  const now = useCallback(() => (audio ? heard(audio) - st.current.start : performance.now() / 1000 - st.current.perf0) - RHYTHM.countIn * chart.beat, [audio, chart.beat]);

  useEffect(() => {
    if (gain.current) gain.current.gain.value = muted ? 0 : 0.7;
  }, [muted]);

  useEffect(() => {
    const s = st.current;
    if (audio) {
      const g = audio.createGain();
      g.gain.value = muted ? 0 : 0.7;
      g.connect(audio.destination);
      gain.current = g;
      s.start = audio.currentTime + 0.35;
      drums(audio, g, chart, s.start);
    } else s.perf0 = performance.now() / 1000 + 0.35;
    const last = Math.max(...chart.notes.map((n) => n.t + n.len));
    const say = (text: string, kind: string, t: number) => (s.judge = { text, kind, at: t });
    const hit = (kind: Judge | 'held' | 'dropped', t: number) => {
      if (kind === 'miss' || kind === 'dropped') s.combo = 0;
      else s.combo += 1;
      s.tally.maxCombo = Math.max(s.tally.maxCombo, s.combo);
      s.tally[kind] += 1;
      say(kind === 'held' ? 'HELD' : kind === 'dropped' ? 'LET GO' : kind.toUpperCase(), kind, t);
    };
    const press = (lane: Lane) => {
      const t = now();
      s.down[lane] = true;
      s.flash[lane] = t;
      const n = s.notes.find((x) => x.lane === lane && !x.judged && judgeAt(t - x.t) !== null);
      if (!n) return;
      const j = judgeAt(t - n.t)!;
      n.judged = j;
      hit(j, t);
      if (j !== 'miss' && n.len > 0) s.holding[lane] = n;
    };
    const release = (lane: Lane) => {
      const t = now();
      s.down[lane] = false;
      const n = s.holding[lane];
      if (!n) return;
      s.holding[lane] = null;
      n.tail = t >= n.t + n.len - RHYTHM.holdGrace ? 'held' : 'dropped';
      hit(n.tail, t);
    };
    const laneOf = (e: KeyboardEvent): Lane | null => (e.code === 'KeyA' ? 0 : e.code === 'KeyS' ? 1 : null);
    const kd = (e: KeyboardEvent) => {
      const l = laneOf(e);
      if (l === null) return;
      e.preventDefault();
      if (!e.repeat) press(l);
    };
    const ku = (e: KeyboardEvent) => {
      const l = laneOf(e);
      if (l !== null) release(l);
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    // the on-screen pads
    const pads = [...document.querySelectorAll<HTMLButtonElement>('.ld-pad')];
    const offs = pads.map((b, i) => {
      const dn = (e: PointerEvent) => (e.preventDefault(), press(i as Lane));
      const up = () => s.down[i] && release(i as Lane);
      b.addEventListener('pointerdown', dn);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('pointercancel', up);
      return () => {
        b.removeEventListener('pointerdown', dn);
        b.removeEventListener('pointerup', up);
        b.removeEventListener('pointerleave', up);
        b.removeEventListener('pointercancel', up);
      };
    });

    const cv = canvas.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr;
    cv.height = H * dpr;
    const c = cv.getContext('2d')!;
    c.scale(dpr, dpr);
    let raf = 0;
    const frame = () => {
      const t = now();
      // missed notes, and long notes held all the way
      for (const n of s.notes) if (!n.judged && t - n.t > RHYTHM.good) (n.judged = 'miss'), hit('miss', t);
      for (const l of [0, 1] as Lane[]) {
        const n = s.holding[l];
        if (n && t >= n.t + n.len) {
          s.holding[l] = null;
          n.tail = 'held';
          hit('held', t);
        }
      }
      draw(c, t);
      if (!s.done && t > last + 0.9) {
        s.done = true;
        onDone({ ...s.tally });
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    const draw = (c: CanvasRenderingContext2D, t: number) => {
      c.fillStyle = '#15171D';
      c.fillRect(0, 0, W, H);
      // the lanes: a strip of hardwood each, the paint at the bottom
      for (const l of [0, 1] as Lane[]) {
        const x = LANE_X[l];
        c.fillStyle = '#20242D';
        c.fillRect(x, 0, LANE_W, H);
        c.fillStyle = '#262B35';
        for (let y = ((t * SPEED) % 24) - 24; y < H; y += 24) c.fillRect(x, Math.round(y), LANE_W, 2);
        if (t - s.flash[l] < 0.12 || s.down[l]) {
          c.fillStyle = COLOR[l].base + '22';
          c.fillRect(x, 0, LANE_W, HIT);
        }
      }
      // the notes
      for (const n of s.notes) {
        const y = HIT - (n.t - t) * SPEED;
        if (y < -400 || (n.len === 0 && y > H + 20)) continue;
        const col = COLOR[n.lane];
        const x = LANE_X[n.lane] + 8;
        const w = LANE_W - 16;
        const gone = n.judged === 'perfect' || n.judged === 'good';
        if (n.len > 0) {
          const top = HIT - (n.t + n.len - t) * SPEED;
          const bottom = s.holding[n.lane] === n ? HIT : y;
          if (n.tail || (gone && s.holding[n.lane] !== n)) continue;
          if (bottom > top) {
            c.fillStyle = n.judged === 'miss' ? '#3A3F4A' : col.base + '88';
            c.fillRect(x + 18, top, w - 36, bottom - top);
            c.fillStyle = n.judged === 'miss' ? '#4A505C' : col.light;
            c.fillRect(x + 18, top, w - 36, 4);
          }
          if (s.holding[n.lane] === n) continue;
        } else if (gone) continue;
        c.fillStyle = n.judged === 'miss' ? '#4A505C' : col.dark;
        c.fillRect(x, y - 10, w, 20);
        c.fillStyle = n.judged === 'miss' ? '#5C6370' : col.base;
        c.fillRect(x + 2, y - 8, w - 4, 16);
        c.fillStyle = n.judged === 'miss' ? '#6B7280' : col.light;
        c.fillRect(x + 2, y - 8, w - 4, 4);
      }
      // the line and the pads at the bottom of the lanes
      for (const l of [0, 1] as Lane[]) {
        const x = LANE_X[l];
        const on = s.down[l] || t - s.flash[l] < 0.08;
        c.fillStyle = on ? COLOR[l].base : '#2E3440';
        c.fillRect(x + 4, HIT - 12, LANE_W - 8, 24);
        c.strokeStyle = COLOR[l].base;
        c.lineWidth = 2;
        c.strokeRect(x + 4, HIT - 12, LANE_W - 8, 24);
        c.fillStyle = on ? '#15171D' : COLOR[l].light;
        c.font = '800 15px "Big Shoulders Display", system-ui, sans-serif';
        c.textAlign = 'center';
        c.fillText(`${COLOR[l].key} · ${COLOR[l].name}`, x + LANE_W / 2, HIT + 5);
        c.fillStyle = '#8A93A3';
        c.font = '600 12px "IBM Plex Mono", monospace';
        c.fillText(l === 0 ? 'contest the shot' : 'jump the lane', x + LANE_W / 2, HIT + 40);
      }
      // the count-in, the set they are running, the combo and the call
      c.textAlign = 'center';
      if (t < 0) {
        const k = Math.ceil(-t / chart.beat);
        c.fillStyle = '#F1F3F5';
        c.font = '900 64px "Big Shoulders Display", system-ui, sans-serif';
        c.fillText(k <= RHYTHM.countIn ? String(k) : '', W / 2, H / 2 - 40);
      }
      const set = [...chart.sets].reverse().find((x) => x.t - RHYTHM.countIn * chart.beat <= t + LEAD * 0.6);
      c.fillStyle = '#8A93A3';
      c.font = '600 12px "IBM Plex Mono", monospace';
      c.textAlign = 'left';
      c.fillText('THEIR SET', 12, 22);
      c.fillStyle = '#F1F3F5';
      c.font = '800 20px "Big Shoulders Display", system-ui, sans-serif';
      c.fillText(set ? set.name.toUpperCase() : '—', 12, 44);
      c.textAlign = 'right';
      if (s.combo >= 3) {
        c.fillStyle = '#FFD43B';
        c.font = '900 30px "Big Shoulders Display", system-ui, sans-serif';
        c.fillText(String(s.combo), W - 12, 40);
        c.fillStyle = '#8A93A3';
        c.font = '600 12px "IBM Plex Mono", monospace';
        c.fillText('COMBO', W - 12, 56);
      }
      const age = t - s.judge.at;
      if (age < 0.45 && s.judge.text) {
        c.globalAlpha = 1 - age / 0.45;
        c.fillStyle = JUDGE_COLOR[s.judge.kind] ?? '#fff';
        c.font = '900 34px "Big Shoulders Display", system-ui, sans-serif';
        c.textAlign = 'center';
        c.fillText(s.judge.text, W / 2, HIT - 70 - age * 30);
        c.globalAlpha = 1;
      }
      // how far into the run
      c.fillStyle = '#2E3440';
      c.fillRect(0, H - 6, W, 6);
      c.fillStyle = '#FFD43B';
      c.fillRect(0, H - 6, Math.max(0, Math.min(1, t / chart.length)) * W, 6);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      offs.forEach((f) => f());
      gain.current?.disconnect();
    };
    // once per run: the stage is mounted again for the next one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ld-stage">
      <canvas ref={canvas} className="ld-canvas" style={{ aspectRatio: `${W} / ${H}` }} aria-label="Lockdown: notes falling toward the line" />
      <div className="ld-pads">
        {[0, 1].map((l) => (
          <button key={l} className="ld-pad" style={{ ['--lane' as string]: COLOR[l].base }}>
            <Icon name={l === 0 ? 'block' : 'steal'} size={26} />
            {COLOR[l].name} <span className="kbd">{COLOR[l].key}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- the game ----------

export function LockdownGame() {
  const game = useStore((s) => s.game);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const chart = useMemo(() => makeChart(seed), [seed]);
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [audio, setAudio] = useState<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const [tally, setTally] = useState<Tally | null>(null);
  const me = game && game.step !== 'retired' ? game.player : null;

  const start = () => {
    // the beat needs a click to start (browsers keep pages quiet until then)
    let ctx = audio;
    try {
      ctx = ctx ?? new AudioContext();
      void ctx.resume();
    } catch {
      ctx = null;
    }
    setAudio(ctx);
    setPhase('play');
  };
  useEffect(() => () => void audio?.close(), [audio]);

  if (phase === 'intro')
    return (
      <section className="stack stage-in ld-intro">
        <div>
          <div className="kicker">Mini-game · rhythm</div>
          <h1 className="hub-title with-icon">
            <Icon name="lockdown" size={44} />
            Lockdown
          </h1>
          <p className="prose">
            The offense runs its sets to the beat. Notes fall down two lanes: <b>Block</b> on the left (A) and <b>Steal</b> on the right (S). Press as each one reaches the line; hold a long note until it ends. Perfect timing is worth the most, a clean hold counts again, and a miss breaks your combo.
          </p>
          <p className="small muted">
            This run: {chart.bpm} beats a minute, about {Math.round(chart.length)} seconds, {chart.notes.length} notes ({chart.notes.filter((n) => n.len).length} long), {new Set(chart.sets.map((x) => x.name)).size} of the {PATTERNS.length} sets they run. {me ? `${me.name}'s grade pays perimeter and interior defense.` : 'With a career, your grade pays perimeter and interior defense.'}
          </p>
        </div>
        <div className="ld-intro-row">
          {me && <PlayerArt name={me.name} number={me.number} pos="PG" size={96} noBall />}
          <div className="ld-keys">
            <span>
              <span className="kbd">A</span> Block
            </span>
            <span>
              <span className="kbd">S</span> Steal
            </span>
            <span className="muted small">or tap the pads under the lanes</span>
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn sb-go" onClick={start}>
            Start
          </button>
          <button className="btn ghost" aria-pressed={muted} onClick={() => setMuted(!muted)}>
            {muted ? 'Sound off' : 'Sound on'}
          </button>
        </div>
      </section>
    );

  if (phase === 'play' || !tally)
    return (
      <section className="stack stage-in">
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <div className="kicker">Lockdown · {chart.bpm} BPM</div>
          <div className="spacer" />
          <button className="btn small ghost" onClick={() => setMuted(!muted)}>
            {muted ? 'Sound off' : 'Sound on'}
          </button>
        </div>
        <Stage chart={chart} audio={audio} muted={muted} onDone={(t) => (setTally(t), setPhase('done'))} />
      </section>
    );

  const acc = accuracy(tally);
  const grade = gradeOf(acc);
  return (
    <section className="stack stage-in">
      <div className="ld-result">
        <span className={`ld-grade g-${grade}`}>{grade}</span>
        <div className="stack" style={{ gap: 4 }}>
          <div className="kicker">Lockdown · final</div>
          <h2 className="title">{grade === 'S' ? 'Nobody scored on you' : grade === 'A' ? 'Lockdown defense' : grade === 'B' ? 'Solid on the ball' : grade === 'C' ? 'A step slow' : 'They got buckets'}</h2>
          <p className="small">
            {(acc * 100).toFixed(1)}% · {tally.perfect} perfect, {tally.good} good, {tally.miss} missed · long notes {tally.held} held, {tally.dropped} let go · best combo {tally.maxCombo}
          </p>
        </div>
      </div>
      <MiniBonus result={{ game: 'rhythm', grade }} />
      <button className="btn ghost" onClick={() => (setSeed(Math.floor(Math.random() * 2 ** 31)), setTally(null), setPhase('intro'))}>
        Run it back (new sets)
      </button>
    </section>
  );
}
