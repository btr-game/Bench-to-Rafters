// The locker room (round 32, owner: "make it like a small rpg(?), where the user can use keyboard a,
// d to walk around and talk with the teammates and coach"). A pixel room with his teammates by
// their lockers and the head coach at his office door. Click in (or Tab to it), then A/D or the
// arrow keys walk him, Space or Enter talks to whoever he is next to, 1 to 3 answer, Escape steps
// out. On a phone: the buttons under the room. Who is there and what each talk does:
// engine/career/locker.ts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../../engine/types';
import { LOCKER } from '../../engine/balance';
import { PERSONA, TEMPER, canFireCoach, lockerRoom, talkFor, talked, type Room } from '../../engine/career/locker';
import { useStore } from '../../store';
import { PlayerArt, styleLeague } from '../art/Player';
import { RUN_A, RUN_B } from '../art/sprite';
import { team as teamOf } from '../selectors';
import { sfx } from '../sound';

const W = 1000; // the room's width in its own units
const REACH = 55; // how close he has to be to talk
const SPEED = 0.42; // units a millisecond

interface Spot {
  who: string;
  x: number;
}

/** Where everyone stands: the teammates along the lockers (a feuding pair side by side, with the
 * feud between them), the coach at his door. */
function spotsOf(room: Room): Spot[] {
  const order = [...room.mates];
  if (room.feud) {
    const pair = room.feud.map((id) => order.find((m) => m.id === id)!);
    const rest = order.filter((m) => !pair.includes(m));
    order.splice(0, order.length, ...rest.slice(0, 2), ...pair, ...rest.slice(2));
  }
  const spots: Spot[] = order.map((m, i) => ({ who: String(m.id), x: 110 + i * 118 }));
  if (room.feud) spots.push({ who: 'feud', x: (spots[2].x + spots[3].x) / 2 });
  spots.push({ who: 'coach', x: 905 });
  return spots;
}

/** Who he is next to: the feud first when he stands between the two. */
function nearest(spots: Spot[], x: number): Spot | null {
  const feud = spots.find((s) => s.who === 'feud');
  if (feud && Math.abs(feud.x - x) < REACH * 0.6) return feud;
  const near = spots.filter((s) => s.who !== 'feud').sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  return near && Math.abs(near.x - x) <= REACH ? near : null;
}

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

/** The room in square pixels: the wall in the team's colour, lockers with nameplates, the bench,
 * the coach's door, a wooden floor. */
function RoomArt({ color }: { color: string }) {
  const wall = mix(color, '#15171c', 0.72);
  const rects: [number, number, number, number, string][] = [[0, 0, 250, 46, wall], [0, 0, 250, 2, mix(wall, '#ffffff', 0.25)]];
  for (let i = 0; i < 15; i++) {
    const x = 3 + i * 14;
    rects.push([x, 9, 13, 31, '#4b5260'], [x + 1, 10, 11, 29, '#3d434f'], [x + 3, 13, 7, 1, '#2b3039'], [x + 3, 15, 7, 1, '#2b3039'], [x + 3, 17, 7, 1, '#2b3039'], [x + 10, 25, 1, 3, '#c9cfda'], [x + 3, 7, 7, 2, color]);
  }
  // the coach's door, with its window and plate
  rects.push([216, 5, 28, 41, '#3a2716'], [218, 7, 24, 39, '#6b4a2b'], [222, 10, 16, 8, '#a5d8ff'], [222, 10, 16, 1, '#d0ebff'], [225, 21, 10, 3, color], [238, 28, 2, 2, '#fcc419']);
  // the floor and the bench
  rects.push([0, 46, 250, 19, '#c08a55']);
  for (let y = 48; y < 65; y += 4) rects.push([0, y, 250, 1, '#a87442']);
  for (let y = 46, k = 0; y < 65; y += 4, k++) for (let x = (k % 2) * 20; x < 250; x += 40) rects.push([x, y, 1, 4, '#a87442']);
  rects.push([14, 40, 190, 3, '#8a5a2b'], [14, 40, 190, 1, '#a9743d'], [20, 43, 2, 3, '#5e3a1c'], [108, 43, 2, 3, '#5e3a1c'], [196, 43, 2, 3, '#5e3a1c']);
  return (
    <svg className="lk-bg" viewBox="0 0 250 65" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
      {rects.map(([x, y, w, h, f], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={f} />
      ))}
    </svg>
  );
}

export function LockerRoom({ g }: { g: GameState }) {
  const room = useMemo(() => lockerRoom(g), [g]);
  const t = teamOf(g);
  const talkAct = useStore((s) => s.lockerTalk);
  const fire = useStore((s) => s.fireCoach);
  const [x, setX] = useState(40);
  const [dir, setDir] = useState<-1 | 0 | 1>(0);
  const [facing, setFacing] = useState<'l' | 'r'>('r');
  const [stride, setStride] = useState(false);
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [said, setSaid] = useState<Record<string, string>>({});
  const [armed, setArmed] = useState(false);
  const [size, setSize] = useState(84);
  const box = useRef<HTMLDivElement>(null);
  const spots = useMemo(() => (room ? spotsOf(room) : []), [room]);
  const near = nearest(spots, x);
  const talk = room && open ? talkFor(room, open) : null;

  // the sprites follow the room's width
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setSize(Math.max(52, Math.min(92, Math.round(e.contentRect.width / 9.5)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // walking: a step each frame while a direction is held, the stride frame every 140 ms
  useEffect(() => {
    if (!dir) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      setX((v) => Math.max(15, Math.min(W - 15, v + dir * dt * SPEED)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const stepper = window.setInterval(() => setStride((v) => !v), 140);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(stepper);
    };
  }, [dir]);

  const walk = useCallback((d: -1 | 0 | 1) => {
    setDir(d);
    if (d) setFacing(d < 0 ? 'l' : 'r');
  }, []);

  const talkTo = useCallback(
    (who: string | null) => {
      if (!who || !room) return;
      setOpen(who);
      setArmed(false);
      sfx('chime');
      walk(0);
    },
    [room, walk],
  );

  const pick = useCallback(
    (opt: string | undefined) => {
      if (!open || !opt || said[open] || talked(g, open)) return;
      const text = talkAct(open, opt);
      if (text) {
        setSaid((s) => ({ ...s, [open]: text }));
        sfx(/-\d|split|ugly|storms|door/.test(text) ? 'bad' : 'good');
      }
    },
    [open, said, g, talkAct],
  );

  // the keys, only while he is in the room (they win over the game's own shortcuts there)
  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key.toLowerCase();
      let used = true;
      if (open) {
        if (/^[1-3]$/.test(k)) pick(talk?.options[Number(k) - 1]?.id);
        else if (k === 'escape' || ((k === ' ' || k === 'enter') && (said[open] || talked(g, open)))) setOpen(null);
        else if (k === 'a' || k === 'arrowleft' || k === 'd' || k === 'arrowright') {
          setOpen(null);
          walk(k === 'a' || k === 'arrowleft' ? -1 : 1);
        } else used = k.length === 1;
      } else if (k === 'a' || k === 'arrowleft') walk(-1);
      else if (k === 'd' || k === 'arrowright') walk(1);
      else if (k === ' ' || k === 'enter' || k === 'w' || k === 'arrowup') talkTo(near?.who ?? null);
      else if (k === 'escape') {
        setActive(false);
        walk(0);
        box.current?.blur();
      } else used = k.length === 1; // the game's letter shortcuts wait while he is in the room
      if (used) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['a', 'd', 'arrowleft', 'arrowright'].includes(k)) walk(0);
    };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up, true);
    };
  }, [active, open, talk, near, said, g, pick, talkTo, walk]);

  if (!room || !t) {
    return (
      <section className="card stack locker" data-tour="locker">
        <div className="sec-title">Locker room</div>
        <p className="small muted keep">The room is empty between seasons. It opens again with the next one.</p>
      </section>
    );
  }
  const league = styleLeague(g.stage);
  const moving = dir !== 0;
  const cap = LOCKER.cap;
  const built = g.locker && g.locker.year === g.year ? g.locker.chem : 0;
  const done = (who: string) => !!said[who] || talked(g, who);
  const feuders = room.feud ? room.feud.map(String) : [];
  const coachSpot = spots.find((s) => s.who === 'coach')!;
  return (
    <section className="card stack locker" data-tour="locker" style={{ ['--team' as string]: t.color }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="sec-title">Locker room</div>
        <span className="spacer" />
        <span className="small muted keep">
          Chemistry from the room this season: {built > 0 ? '+' : ''}
          {built.toFixed(2)} (at most ±{cap})
        </span>
      </div>
      <div
        ref={box}
        className={`lk-scene${active ? ' on' : ''}`}
        tabIndex={0}
        role="application"
        aria-label="The locker room. A and D or the arrow keys walk, Space talks, Escape steps out."
        onFocus={() => setActive(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setActive(false);
            walk(0);
          }
        }}
      >
        <RoomArt color={t.color} />
        {room.mates.map((m) => {
          const at = spots.find((s) => s.who === String(m.id))!.x;
          const id = String(m.id);
          return (
            <button key={id} className={`lk-who${done(id) ? ' done' : ''}${near?.who === id ? ' near' : ''}`} style={{ left: `${(at / W) * 100}%` }} onClick={() => talkTo(id)} tabIndex={-1} aria-label={`Talk to ${m.name}, ${PERSONA[m.persona]}`}>
              {feuders.includes(id) && !done('feud') && <span className="lk-alert">!!</span>}
              <PlayerArt name={m.name} number={(m.id % 49) + 1} pos={m.pos} color={t.color} team={t.name} abbr={t.abbr} league={league} size={size} noBall mirror={at > x} />
              <span className="lk-tag">
                {m.name.split(' ')[0]}
                <span className="lk-role"> · {PERSONA[m.persona]}</span>
                {done(id) ? ' ✓' : ''}
              </span>
            </button>
          );
        })}
        <button className={`lk-who coach${done('coach') ? ' done' : ''}${near?.who === 'coach' ? ' near' : ''}`} style={{ left: `${(coachSpot.x / W) * 100}%` }} onClick={() => talkTo('coach')} tabIndex={-1} aria-label={`Talk to coach ${room.coach.name}`}>
          <PlayerArt name={room.coach.name} number={0} pos="PG" color="#343A40" team="COACH" league={league} size={size} noBall mirror />
          <span className="lk-tag">
            Coach<span className="lk-role"> · {TEMPER[room.coach.temper]}</span>
            {done('coach') ? ' ✓' : ''}
          </span>
        </button>
        <div className="lk-me" style={{ left: `${(x / W) * 100}%` }} aria-hidden="true">
          <PlayerArt name={g.player.name} number={g.player.number} pos={g.player.pos} color={t.color} team={t.name} abbr={t.abbr} league={league} size={size} noBall frame={moving ? (stride ? RUN_A : RUN_B) : undefined} mirror={facing === 'l'} wear={g.player.wardrobe?.on} />
          <span className="lk-tag you" aria-hidden="true">You</span>
          <span className="lk-you">You</span>
        </div>
        {!active && <div className="lk-hint">Click to walk in · A and D to walk, Space to talk</div>}
        {active && near && !open && <div className="lk-hint">{near.who === 'feud' ? 'Space: step into the argument' : `Space: talk to ${near.who === 'coach' ? 'the coach' : room.mates.find((m) => String(m.id) === near.who)?.name.split(' ')[0]}`}</div>}
      </div>
      <div className="lk-pad" aria-label="Walk and talk">
        <button className="btn ghost small" onPointerDown={() => walk(-1)} onPointerUp={() => walk(0)} onPointerLeave={() => dir === -1 && walk(0)} aria-label="Walk left">
          ◀ A
        </button>
        <button className="btn small" disabled={!near} onClick={() => talkTo(near?.who ?? null)}>
          Talk
        </button>
        <button className="btn ghost small" onPointerDown={() => walk(1)} onPointerUp={() => walk(0)} onPointerLeave={() => dir === 1 && walk(0)} aria-label="Walk right">
          D ▶
        </button>
      </div>
      {talk && (
        <div className="lk-talk" aria-live="polite">
          <div className="kicker">{talk.who === 'coach' ? `${room.coach.name} · ${TEMPER[room.coach.temper]}${room.coach.grade ? ` · ${room.coach.grade}` : ''}` : talk.who === 'feud' ? 'A feud' : talk.name}</div>
          <p className="lk-line">{talk.line}</p>
          {done(talk.who) ? (
            <p className="small">{said[talk.who] ?? 'You have talked this half. Come back after the next stretch of games.'}</p>
          ) : (
            <div className="lk-opts">
              {talk.options.map((o, i) => (
                <button key={o.id} className="btn ghost small" onClick={() => pick(o.id)}>
                  <kbd>{i + 1}</kbd> {o.label}
                </button>
              ))}
            </div>
          )}
          {talk.who === 'coach' && canFireCoach(g) && (
            <button className={`btn small ${armed ? 'danger' : 'ghost'}`} onClick={() => (armed ? (sfx('whistle'), fire(), setArmed(false), setOpen(null)) : setArmed(true))}>
              {armed ? 'Tap again: have him fired' : 'Go to the front office: have him fired'}
            </button>
          )}
          <button className="btn ghost small lk-close" onClick={() => setOpen(null)}>
            Walk away <kbd className="hide-touch">Esc</kbd>
          </button>
        </div>
      )}
    </section>
  );
}
