// The town (round 37, owner: "a world to walk around instead of menus"): the career's tabs as a
// street he walks along. Click a place (or Tab to it and press Enter) and the page opens at once
// while he walks over to its door; the arrow keys, or A and D, walk him from door to door with the
// town in focus, and Enter goes in. H, S, P, R and E still open the places as they opened the tabs.
// On a narrow screen the street is wider than the screen and follows him. With Fast break on, he
// is at the door the moment it opens. Which places stand where: ui/town.ts; the art: art/TownArt.tsx.

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { GameState } from '../../engine/types';
import { useStore } from '../../store';
import { UI } from '../../content/strings';
import { tabKey, team as teamOf } from '../selectors';
import { STREET, layoutOf, placeFor, townOf, type Place, type PlaceKind } from '../town';
import { TownArt } from '../art/TownArt';
import { lookOf } from '../art/Player';
import { championships, hallOfFame } from '../../engine/awards/legacy';
import { sfx } from '../sound';

/** How big an art pixel is on screen: the street fills a computer's width up to this, and on a
 * narrow screen keeps the smallest size and pans. */
const SCALE = { min: 2, max: 2.5 };
/** The band of street signs under the street, in screen pixels. */
const BAND = 36;
/** How long a walk takes: a little for each art pixel, never more than this. */
const WALK = { perPx: 4, max: 900 };

// ---------- him, on the street's own pixel grid ----------

const TOP = ['..HHH..', '.HHHHH.', '.SSSSS.', '..SSS..', '.JJJJJ.', 'SJJNJJS', 'S.JJJ.S', '..PPP..'];
const LEGS = {
  stand: ['..L.L..', '..L.L..', '.WW.WW.'],
  a: ['.LL.L..', '.L...L.', 'WW...WW'],
  b: ['..LL...', '..L.L..', '..WWW..'],
};

function Walker({ g, color, frame, facing, scale }: { g: GameState; color: string; frame: keyof typeof LEGS; facing: 'l' | 'r'; scale: number }) {
  const look = lookOf(g.player.name, '#F1F3F5', g.player.wardrobe?.on);
  const fill: Record<string, string> = { H: look.hair, S: look.skin, L: look.skin, J: color, P: color, N: '#FFFFFF', W: '#F1F3F5' };
  const rows = [...TOP, ...LEGS[frame]];
  return (
    <svg className="tw-walker" viewBox="0 0 7 11" width={7 * scale} height={11 * scale} shapeRendering="crispEdges" aria-hidden="true" style={facing === 'l' ? { transform: 'scaleX(-1)' } : undefined}>
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill[c]} />)))}
      {/* the shorts a shade darker than the jersey */}
      <rect x={2} y={7} width={3} height={1} fill="#000" opacity={0.18} />
    </svg>
  );
}

/** Bring a card into view and ring it for a moment (the agent's office: the contract). */
function bringUp(sel: string) {
  let tries = 0;
  const timer = window.setInterval(() => {
    const el = document.querySelector<HTMLElement>(sel);
    if (el && el.offsetParent !== null) {
      window.clearInterval(timer);
      const r = el.getBoundingClientRect();
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: Math.max(0, r.top + window.scrollY - 140), behavior: reduce ? 'auto' : 'smooth' });
      el.classList.add('tw-ring');
      window.setTimeout(() => el.classList.remove('tw-ring'), 1600);
    } else if (++tries > 20) window.clearInterval(timer);
  }, 80);
}

export function Town({ g, fast }: { g: GameState; fast: boolean }) {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const seen = useStore((s) => s.seen);
  const simple = useStore((s) => s.simple);
  const town = useMemo(() => townOf(g), [g]);
  const base = useMemo(() => layoutOf(town).w, [town]);
  const [last, setLast] = useState<PlaceKind | null>(null);
  const [focused, setFocused] = useState<PlaceKind | null>(null);
  const here = placeFor(town, tab, last);
  // the arena hangs a banner for each title he won with the team he plays for now
  const tm = teamOf(g);
  const banners = useMemo(() => (town.look === 'city' && tm ? championships(g).filter((c) => c.teamName === tm.name).length : 0), [g, town.look, tm]);
  const hof = g.stage === 'RETIRED' && !!hallOfFame(g);

  // the street's size follows the box; a narrow screen keeps the smallest size and pans
  const box = useRef<HTMLElement>(null);
  const [boxW, setBoxW] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setBoxW(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = boxW ? Math.max(SCALE.min, Math.min(SCALE.max, boxW / base)) : SCALE.min;
  // a screen wider than the street at its biggest: the road and the skyline run on to the edges
  const pad = boxW ? Math.max(0, Math.ceil((boxW / scale - base) / 2)) : 0;
  const { w: W, slots } = useMemo(() => layoutOf(town, pad), [town, pad]);

  // where he stands: at the door of the place in focus, or of the page that is open
  const target = slots.find((s) => s.place.id === (focused ?? here?.id)) ?? slots[0];
  const x = target?.door ?? STREET.margin;
  const [from, setFrom] = useState(x);
  const [walking, setWalking] = useState(false);
  const [stride, setStride] = useState(false);
  // the top bar shows the places in small once the town has scrolled out of view
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => document.documentElement.classList.toggle('town-out', !e.isIntersecting), { rootMargin: '-60px 0px 0px 0px' });
    io.observe(el);
    return () => {
      io.disconnect();
      document.documentElement.classList.remove('town-out');
    };
  }, []);
  const facing = x < from ? 'l' : 'r';
  const dist = Math.abs(x - from);
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ms = fast || reduce ? 0 : Math.min(WALK.max, dist * WALK.perPx);
  useEffect(() => {
    if (x === from) return;
    if (!ms) {
      setFrom(x);
      return;
    }
    setWalking(true);
    const step = window.setInterval(() => setStride((v) => !v), 120);
    const done = window.setTimeout(() => {
      setWalking(false);
      setFrom(x);
      window.clearInterval(step);
    }, ms);
    return () => {
      window.clearInterval(step);
      window.clearTimeout(done);
    };
  }, [x, from, ms]);

  // the camera: the whole street when it fits, else centred on him and kept inside the street
  const streetW = W * scale;
  const off = streetW <= boxW ? (boxW - streetW) / 2 : Math.max(boxW - streetW, Math.min(0, boxW / 2 - x * scale));
  const timing = ms ? { transitionDuration: `${ms}ms`, transitionTimingFunction: `steps(${Math.max(2, Math.round(dist / 3))})` } : { transitionDuration: '0ms' };

  const go = (p: Place) => {
    setLast(p.id);
    setFocused(null);
    if (p.tab === tab) sfx('tab');
    setTab(p.tab);
    if (p.spot) bringUp(`[data-tour="${p.spot}"]`);
  };
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const k = e.key.toLowerCase();
    const d = k === 'arrowleft' || k === 'a' ? -1 : k === 'arrowright' || k === 'd' ? 1 : 0;
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    buttons.current[(i + d + slots.length) % slots.length]?.focus();
  };

  return (
    <nav ref={box} className={`town look-${town.look}`} aria-label="Main: the town" data-tour="town" style={{ height: STREET.h * scale + BAND }}>
      <div className="tw-street" style={{ width: streetW, height: STREET.h * scale + BAND, transform: `translateX(${off}px)`, ...timing }}>
        <div className="tw-art-wrap" style={{ width: streetW, height: STREET.h * scale }}>
          <TownArt town={town} here={here?.id ?? null} pad={pad} banners={banners} hof={hof} />
        </div>
        {slots.map((s, i) => {
          const t = s.place.tab;
          const on = here?.id === s.place.id;
          // a dot on a tab with something new (the agent's office shares the Player tab's)
          const fresh = !on && t !== tab && seen[t] !== undefined && seen[t] !== tabKey(g, t) && !s.place.spot;
          return (
            <button
              key={s.place.id}
              ref={(el) => (buttons.current[i] = el)}
              className={`tw-place${on ? ' here' : ''}`}
              data-place={s.place.id}
              data-tour={s.place.spot ? `place-${s.place.id}` : `tab-${t}`}
              aria-current={on ? 'page' : undefined}
              title={`${s.place.id === 'arena' && town.look === 'hometown' ? g.player.highSchool : s.place.name}: ${s.place.spot ? 'your contract and money' : `the ${UI.tabs[t]} page`} (${t[0].toUpperCase()})`}
              style={{ left: s.x * scale, width: s.w * scale, height: STREET.h * scale + BAND }}
              onClick={() => go(s.place)}
              onFocus={() => setFocused(s.place.id)}
              onBlur={() => setFocused(null)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {fresh && (
                <span className="tw-new" aria-label="new">
                  !
                </span>
              )}
              <span className="tw-sign">
                <span className="tw-name">{simple ? (s.place.spot ? 'Agent' : UI.tabs[t]) : s.place.name}</span>
                {!simple && <span className="tw-tab">{s.place.spot ? 'Contract' : UI.tabs[t]}</span>}
              </span>
            </button>
          );
        })}
        <div className={`tw-me${walking ? ' walking' : ''}`} style={{ left: (x - 3.5) * scale, top: (STREET.ground - 9) * scale, ...timing }} aria-hidden="true">
          <Walker g={g} color={town.color} frame={walking ? (stride ? 'a' : 'b') : 'stand'} facing={facing} scale={scale} />
        </div>
      </div>
      <span className="tw-street-name" aria-hidden="true">
        {town.name}
      </span>
    </nav>
  );
}
