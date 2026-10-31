// Lockdown (engine/mini/rhythm.ts): a rhythm game of defense. Notes fall down two lanes, Block
// (A) and Steal (S); press as they reach the line, hold the long ones to the end. The beat is a
// small drum machine built with the Web Audio API (it starts with the Start button), and its
// clock is the game's clock, so the notes stay on the beat.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { RHYTHM, accuracy, gradeOf, judgeAt, makeChart, PATTERNS, type Chart, type Judge, type Lane, type Note, type Tally } from '../../engine/mini/rhythm';
import { MiniBonus } from './MiniBonus';
import { PlayerArt, kitFor, styleLeague } from '../art/Player';
import { ballSpot, heroGrid } from '../art/Hero';
import type { HeroPose } from '../art/heroRows';
import { genericKits, type Kit } from '../../content/teamStyle';
import { team as teamOf } from '../selectors';
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

// ---------- the play behind the lanes (round 25, the owner: a player shooting, something like that) ----------

// A side view: the hoop on the right, their ball handler on the left going at it, you between
// him and the rim. He dribbles on the beat; a block, a steal, a bucket or a blow-by plays out
// whenever a note is judged. The sprites are the action cam's traced players.
type Act = 'block' | 'steal' | 'score' | 'blowby';
const ACT_LEN = 0.6; // seconds a reaction plays
const K = 1.55; // sprite scale
const FLOOR = 382; // where the feet are
const OX = 112; // their ball handler
const DX = 226; // you
const RIM: [number, number] = [318, 226];
// poses that face right as drawn (the rest face left, or straight on)
const FACES_RIGHT = new Set<HeroPose>(['drive', 'finish', 'lowdribble', 'push', 'contest', 'facing']);
const NEUTRAL = new Set<HeroPose>(['stance', 'wall', 'reach', 'hesitation', 'spread']);
const BALL_ROWS = ['..OOO..', '.OuBBO.', 'OuBBBbO', 'OBLBBbO', 'OBBLbbO', '.ObbbO.', '..OOO..'];
const BALL_PAL: Record<string, string> = { O: '#1B1820', B: '#E8782A', u: '#F5A15F', b: '#C2571B', L: '#6A3416' };
const THEM: Kit = genericKits('#C92A2A', 'VISITORS').road;

interface Sprite {
  cv: HTMLCanvasElement;
  w: number;
  h: number;
  ball: [number, number]; // the ball in his hands, from his feet in the middle
}
function makeSprite(pose: HeroPose, kit: Kit, model: string, number: number, noBall: boolean, toRight: boolean): Sprite {
  const flip = !NEUTRAL.has(pose) && FACES_RIGHT.has(pose) !== toRight;
  const g = heroGrid(pose, kit, model, number, noBall, flip);
  const h = g.length;
  const w = g[0].length;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  g.forEach((row, y) => row.forEach((col, x) => {
    if (!col) return;
    c.fillStyle = col;
    c.fillRect(flip ? w - 1 - x : x, y, 1, 1);
  }));
  const [fx, fy] = ballSpot(pose);
  return { cv, w, h, ball: [((flip ? 1 - fx : fx) - 0.5) * w * K, -(1 - fy) * h * K] };
}
function ballSprite(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 7;
  cv.height = 7;
  const c = cv.getContext('2d')!;
  BALL_ROWS.forEach((r, y) => [...r].forEach((ch, x) => {
    if (!BALL_PAL[ch]) return;
    c.fillStyle = BALL_PAL[ch];
    c.fillRect(x, y, 1, 1);
  }));
  return cv;
}
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - (1 - x) * (1 - x));
const lerp = (a: [number, number], b: [number, number], k: number): [number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

function makeScene(me: { name: string; number: number } | null, myKit: Kit) {
  const cache = new Map<string, Sprite>();
  const sprite = (who: 'them' | 'me', pose: HeroPose, noBall: boolean): Sprite => {
    const key = `${who}|${pose}|${noBall}`;
    let s = cache.get(key);
    if (!s) {
      s = who === 'them' ? makeSprite(pose, THEM, 'Their guard', 3, noBall, true) : makeSprite(pose, myKit, me?.name ?? 'Lockdown', me?.number ?? 7, noBall, false);
      cache.set(key, s);
    }
    return s;
  };
  const ball = ballSprite();
  const put = (c: CanvasRenderingContext2D, s: Sprite, x: number, up: number) => {
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(x - 22, FLOOR - 2, 44, 4);
    c.drawImage(s.cv, Math.round(x - (s.w * K) / 2), Math.round(FLOOR - s.h * K - up), s.w * K, s.h * K);
  };
  const putBall = (c: CanvasRenderingContext2D, [x, y]: [number, number]) => c.drawImage(ball, Math.round(x - 7), Math.round(y - 7), 14, 14);
  const hand = (s: Sprite, x: number, up: number): [number, number] => [x + s.ball[0], FLOOR + s.ball[1] - up];

  /** The court, the hoop and the play at time t: `act` is the latest reaction, `hold` a long note being held. */
  return (c: CanvasRenderingContext2D, t: number, beat: number, act: { kind: Act | null; at: number }, hold: [boolean, boolean]) => {
    // the arena: dark stands with a few lights, the floor, the paint under the rim
    c.fillStyle = '#1A1D24';
    c.fillRect(0, 0, W, FLOOR - 40);
    c.fillStyle = '#232733';
    for (let y = 70; y < FLOOR - 60; y += 14) for (let x = (y / 14) % 2 ? 4 : 11; x < W; x += 14) c.fillRect(x, y, 4, 4);
    c.fillStyle = '#5A3E28';
    c.fillRect(0, FLOOR - 40, W, H - FLOOR + 40);
    c.fillStyle = '#4E3522';
    for (let y = FLOOR - 36; y < H; y += 10) c.fillRect(0, y, W, 2);
    c.fillStyle = '#6E2F27';
    c.fillRect(256, FLOOR - 40, W - 256, 52);
    c.fillStyle = '#E9ECEF';
    c.fillRect(256, FLOOR - 40, 2, 52);
    // the hoop: pole, backboard, rim and net
    c.fillStyle = '#495057';
    c.fillRect(350, 150, 6, FLOOR - 150);
    c.fillStyle = '#DEE2E6';
    c.fillRect(338, 170, 6, 70);
    c.fillStyle = '#E8590C';
    c.fillRect(300, RIM[1] - 2, 38, 4);
    c.fillStyle = 'rgba(241,243,245,0.75)';
    for (let i = 0; i < 5; i++) c.fillRect(302 + i * 8, RIM[1] + 2, 2, 18 - i);

    const age = act.kind ? t - act.at : 9;
    const on = act.kind && age >= 0 && age < ACT_LEN ? act.kind : null;
    const k = on ? age / ACT_LEN : 0;
    const shuffle = Math.sin((t / (beat * 2)) * Math.PI * 2) * 6;
    let them: Sprite;
    let tx = OX + shuffle * 0.6;
    let tUp = 0;
    let you: Sprite;
    let yx = DX + shuffle;
    let yUp = 0;
    let b: [number, number] | null = null; // the ball, when it is not in a sprite's hands
    const jump = (start: number, len: number, hgt: number) => (k < start || k > start + len ? 0 : Math.sin(((k - start) / len) * Math.PI) * hgt);
    if (on === 'block') {
      them = sprite('them', 'jumper', k > 0.25);
      tUp = jump(0, 0.75, 26);
      you = sprite('me', 'contest', true);
      yUp = jump(0.08, 0.75, 34);
      yx = DX - 24 * ease(k * 3);
      if (k > 0.25) {
        const from = hand(sprite('them', 'jumper', false), tx, jump(0, 0.75, 26) || 20);
        b = lerp(from, [-30, from[1] - 150], ease((k - 0.25) / 0.6));
      }
    } else if (on === 'steal') {
      them = sprite('them', 'lowdribble', true);
      you = sprite('me', 'steal', true);
      yx = DX - 34 * ease(k * 2.5);
      const from = hand(sprite('them', 'lowdribble', false), tx, 0);
      b = lerp(from, [yx + 40, FLOOR - 14], ease(k * 2));
    } else if (on === 'score') {
      them = sprite('them', 'jumper', k > 0.3);
      tUp = jump(0, 0.7, 26);
      you = sprite('me', 'stance', true);
      if (k > 0.3) {
        const from = hand(sprite('them', 'jumper', false), tx, 24);
        const q = Math.min(1, (k - 0.3) / 0.5);
        const p = lerp(from, [RIM[0] + 2, RIM[1] - 6], q);
        b = q < 1 ? [p[0], p[1] - Math.sin(q * Math.PI) * 70] : [RIM[0] + 2, RIM[1] + 10 + (k - 0.8) * 120];
      }
    } else if (on === 'blowby') {
      them = sprite('them', 'drive', false);
      tx = OX + 120 * ease(k * 1.4) - (k > 0.75 ? 120 * ((k - 0.75) / 0.25) : 0);
      you = sprite('me', 'reach', true);
    } else if (hold[0]) {
      // a long block note: he backs you down, you wall up
      them = sprite('them', 'post', false);
      tx = OX + 30;
      you = sprite('me', 'wall', true);
      yx = DX - 8;
    } else if (hold[1]) {
      // a long steal note: you slide with him, hand on the ball
      them = sprite('them', 'handle', false);
      tx = OX + Math.sin(t * 5) * 18;
      you = sprite('me', 'stance', true);
      yx = DX + Math.sin(t * 5) * 18;
    } else {
      // the dribble: the ball hits the floor on the beat
      them = sprite('them', 'lowdribble', true);
      you = sprite('me', 'stance', true);
      const h = hand(sprite('them', 'lowdribble', false), tx, 0);
      const ph = (((t % beat) + beat) % beat) / beat;
      b = [h[0], FLOOR - 6 - (FLOOR - 6 - h[1]) * Math.sin(ph * Math.PI)];
    }
    put(c, them, tx, tUp);
    put(c, you, yx, yUp);
    if (b) putBall(c, b);
    // dim it all so the notes stay easy to read
    c.fillStyle = 'rgba(21,23,29,0.42)';
    c.fillRect(0, 0, W, H);
  };
}

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
  const game = useStore((s) => s.game);
  // you defend in your team's home kit (anyone else in a blue one)
  const scene = useMemo(() => {
    const t = game ? teamOf(game) : null;
    const me = game && game.step !== 'retired' ? game.player : null;
    return makeScene(me, t ? kitFor(t.name, t.abbr, t.color, 'home', styleLeague(game?.stage)) : genericKits('#1D428A', 'LOCKDOWN').home);
    // the kit is set when the run starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const gain = useRef<GainNode | null>(null);
  const st = useRef({
    notes: chart.notes.map((n) => ({ ...n, judged: null, tail: null })) as Live[],
    tally: { perfect: 0, good: 0, miss: 0, held: 0, dropped: 0, maxCombo: 0 } as Tally,
    combo: 0,
    down: [false, false],
    flash: [-9, -9],
    holding: [null, null] as (Live | null)[],
    judge: { text: '', kind: '', at: -9 },
    act: { kind: null as Act | null, at: -9 },
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
    const hit = (kind: Judge | 'held' | 'dropped', t: number, lane: Lane) => {
      if (kind !== 'held') s.act = { kind: kind === 'miss' || kind === 'dropped' ? (lane === 0 ? 'score' : 'blowby') : lane === 0 ? 'block' : 'steal', at: t };
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
      hit(j, t, lane);
      if (j !== 'miss' && n.len > 0) s.holding[lane] = n;
    };
    const release = (lane: Lane) => {
      const t = now();
      s.down[lane] = false;
      const n = s.holding[lane];
      if (!n) return;
      s.holding[lane] = null;
      n.tail = t >= n.t + n.len - RHYTHM.holdGrace ? 'held' : 'dropped';
      hit(n.tail, t, lane);
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
      for (const n of s.notes) if (!n.judged && t - n.t > RHYTHM.good) (n.judged = 'miss'), hit('miss', t, n.lane);
      for (const l of [0, 1] as Lane[]) {
        const n = s.holding[l];
        if (n && t >= n.t + n.len) {
          s.holding[l] = null;
          n.tail = 'held';
          hit('held', t, l);
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
      scene(c, t, chart.beat, s.act, [!!s.holding[0], !!s.holding[1]]);
      // the lanes: a see-through strip each, over the play
      for (const l of [0, 1] as Lane[]) {
        const x = LANE_X[l];
        c.fillStyle = 'rgba(21,23,29,0.5)';
        c.fillRect(x, 0, LANE_W, H);
        c.fillStyle = 'rgba(255,255,255,0.04)';
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

// the hoop on the intro court, in pixels: backboard, square, rim and net
const HOOP = [
  'wwwwwwwwwwwwww',
  'wKKKKKKKKKKKKw',
  'wKwwwwwwwwwwKw',
  'wKwwwRRRRwwwKw',
  'wKwwwRwwRwwwKw',
  'wKKKKKKKKKKKKw',
  'wwwwwwwwwwwwww',
  '....NNNNNN....',
  '....wNwwNw....',
  '.....wNNw.....',
  '.....w..w.....',
  '......ww......',
];
const HOOP_PAL: Record<string, string> = { w: '#F4F1EA', K: '#3A3D46', R: '#E03131', N: '#F76707' };

/** Round 25 (owner: "the Lockdown page is too blank"): a little court behind the intro where the
 * pixel players run a set: one dribbles, one shuffles on defense, one pulls up, one jumps the lane. */
function LockdownCourt() {
  const hoop = useMemo(
    () =>
      HOOP.flatMap((row, y) =>
        [...row].map((ch, x) => (HOOP_PAL[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={HOOP_PAL[ch]} /> : null)),
      ),
    [],
  );
  return (
    <div className="ld-court" aria-hidden="true">
      <div className="ld-notes">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <i key={i} className={i % 2 ? 'steal' : 'block'} style={{ left: `${8 + i * 15}%`, animationDelay: `${i * 0.7}s` }} />
        ))}
      </div>
      <svg className="ld-hoop" viewBox="0 0 14 12" shapeRendering="crispEdges">
        {hoop}
      </svg>
      <div className="ld-p ld-dribble">
        <PlayerArt name="Kai Moreno" number={3} pos="PG" color="#E8590C" size={92} noBall />
        <span className="ld-ball bounce">
          <Icon name="ball" size={18} />
        </span>
      </div>
      <div className="ld-p ld-guard">
        <PlayerArt name="Theo Banks" number={24} pos="SG" color="#1C7ED6" size={96} noBall />
      </div>
      <div className="ld-p ld-shooter">
        <PlayerArt name="Remy Okafor" number={11} pos="SF" color="#E8590C" size={100} noBall />
      </div>
      <span className="ld-arc">
        <span className="ld-ball">
          <Icon name="ball" size={18} />
        </span>
      </span>
      <div className="ld-p ld-swipe">
        <PlayerArt name="Jun Park" number={8} pos="PF" color="#1C7ED6" size={98} noBall />
      </div>
    </div>
  );
}

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
          {me && <PlayerArt name={me.name} number={me.number} pos="PG" size={96} noBall wear={me.wardrobe?.on} />}
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
        <LockdownCourt />
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
