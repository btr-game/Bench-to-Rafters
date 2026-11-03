// The main land (round 37, owner: "once the user completes the first tutorial beginner level, they
// can take a plane to the "main land". in the main land, there's buildings/islands/areas/... where
// the user can access the main contents"): the start page's first step, a pixel town along one
// avenue (ui/mainland.ts says where everything stands). As on the road map (round 34), each place
// is a button: click it, or drive the car to it with the arrow keys, and its card pops out beside
// it (under the map on a phone); Enter opens the card where the car is, Escape folds it away. The
// four places that were the start page's row of cards (the library, the trophy museum, the statue
// plaza and the island) open what those cards opened.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useStore } from '../../store';
import { Icon } from '../art/Icon';
import { ICON_FOR } from '../art/icons';
import { MODES, type Mode } from '../../engine/balance';
import { AVENUE, ISLANDS, LAND, LAND_H, LAND_MODE, LAND_W, firstLand, landPlaces, landSide, landState, neighbour, reducedMotion, type LandDir, type LandId, type LandState } from '../mainland';
import { LandCrop, LandMap } from '../art/LandArt';
import { BOAT, CAR, PLANE, PLANE_COLORS, Sprite } from '../art/Sprites';
import { HAIR_COLORS, SKIN_COLORS } from '../art/Player';
import { PixelX } from '../art/PixelX';
import { listSlots } from '../saves';
import { unlockHint } from '../road';
import { seasonLabel } from '../format';
import { sfx } from '../sound';
import { NEWS } from '../../content/whatsNew';
import { MiniGamesCard } from '../mini/MiniGames';
import { CareerLogCard } from './CareerLog';
import { AchievementsCard } from './Achievements';
import { CommunityCard } from './Community';
import { MultiplayerCard } from './Multiplayer';
import { PlaceArt } from './RoadMap';
import { StoryCard } from './StoryStart';
import { t } from '../../i18n';

const KEYS: Record<string, LandDir> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
const DOCK = LAND.find((p) => p.id === 'island')!.stop;
const stopOf = (id: LandId) => LAND.find((p) => p.id === id)!.stop;

/** Round 32 (owner: "move the saved on this device to the career log"): his house keeps a single
 * Continue for the latest career still going; every save lives in the career log. */
function ContinueCard() {
  const resume = useStore((s) => s.resume);
  const setPage = useStore((s) => s.setPage);
  const live = listSlots().find((x) => !x.retired); // read each time: a save written while the page is up shows at once
  const [failed, setFailed] = useState(false);
  if (!live) return null;
  return (
    <section className="card continue-card" data-tour="saves">
      <div style={{ minWidth: 0 }}>
        <div className="kicker">{t('Your career')}</div>
        <b className="resume-name">{live.name}</b>
        <div className="muted small">
          {seasonLabel(live.year)} · {MODES[live.mode as Mode]?.name ?? live.mode}
        </div>
        {failed && <div className="small" style={{ color: 'var(--bad)' }}>{t('That save could not be read.')}</div>}
      </div>
      <div className="row save-actions">
        <button className="btn" onClick={() => void resume(live.id).then((ok) => !ok && setFailed(true))}>
          {t('Continue')}
        </button>
        <button className="btn ghost small" onClick={() => setPage('log')}>
          {t('Open the career log')}
        </button>
      </div>
    </section>
  );
}

/** The airport: back to the road map (round 34's "Back on the road map?", Regular guy's challenge
 * until the map). */
function AirportCard({ onFly }: { onFly: () => void }) {
  return (
    <div className="card oath-card levels-card" role="group" aria-label="The road map">
      <PlaceArt place="advanced" size={96} />
      <div className="stack" style={{ gap: 6 }}>
        <div className="sec-title">{t('Back on the road map?')}</div>
        <p className="small muted">{t('The tutorial’s levels and the island: intermediate opens Reality hits hard, advanced Shoot for the stars, the island the mini-games. Short careers at fast break’s pace with one goal, an NBA All-Star team; they count nowhere (no save, career log, achievements or leaderboards).')}</p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn small ghost" data-tour="levels-card" onClick={onFly}>
            {t('Fly to the road map')}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewsCard() {
  const showNews = useStore((s) => s.showNews);
  return (
    <section className="card stack">
      <div className="sec-title with-icon">
        <Icon name="news" size={28} />
        What’s new
      </div>
      <p className="small muted">{t('The latest changes to the game ({date}). They open by themselves once after each update, and here any time.', { date: NEWS[0].date })}</p>
      <button className="btn ghost" onClick={() => (sfx('page'), showNews())}>
        {t('Read what’s new')}
      </button>
    </section>
  );
}

function CinemaCard() {
  const showIntro = useStore((s) => s.showIntro);
  return (
    <section className="card stack">
      <div className="sec-title with-icon">
        <Icon name="camera" size={28} />
        {t('The intro')}
      </div>
      <p className="small muted">{t('The opening again: the title over a one-on-one, from a high school gym to the NBA.')}</p>
      <button className="btn ghost" onClick={showIntro}>
        {t('Play the intro')}
      </button>
    </section>
  );
}

interface Challenges {
  oath: boolean;
  setOath: (on: boolean) => void;
  comet: boolean;
  setComet: (on: boolean) => void;
}

/** A difficulty's venue: what it is, its challenge (Rough Road with Reality, Comet with the stars,
 * as on the old start page's cards) and the way on to making the player; or its lock. */
function Venue({ mode, state, ch, onStart, onFly }: { mode: Mode; state: LandState; ch: Challenges; onStart: (m: Mode) => void; onFly: () => void }) {
  const { oath, setOath, comet, setComet } = ch;
  const shut = state === 'locked';
  return (
    <div className="stack ml-venue">
      <div className="row ml-venue-title">
        <Icon name={shut ? 'lock' : ICON_FOR[mode]} size={30} />
        <div className="sec-title">{MODES[mode].name}</div>
        {state === 'next' && <span className="tag good">{t('Recommended')}</span>}
      </div>
      {shut ? (
        <>
          <p className="small keep">{unlockHint(mode === 'reality' ? 'reality' : 'stars')}</p>
          <div className="row-end">
            <button className="btn ghost small" onClick={onFly}>
              {t('Fly to the road map')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="small muted">{MODES[mode].blurb}</p>
          {/* round 25 (owner): Reality, played the hardest way, asks once and is honoured for it */}
          {mode === 'reality' && (
            <div className={`card oath-card${oath ? ' on' : ''}`} role="group" aria-label={t('The Rough Road challenge')}>
              <div className="stack" style={{ gap: 6 }}>
                <div className="sec-title with-icon">
                  <Icon name="oath" size={28} />
                  {t('Take the rough road?')}
                </div>
                <p className="small muted">
                  {t('The road picks your whole player at random, with no reroll: position, archetype, focus stats, country, hand, name, number')} <b>{t('and his look')}</b>
                  {t(', so you don’t choose how your avatar looks (skin, hair and face are rolled too). Then master mode, with no recommendations anywhere, and no Fast break or Sim mode, locked for the whole career (Simple text is allowed). Take it and the career carries the Rough Road mark on its card, the leaderboards and the career log, with achievements of its own.')}
                </p>
                <div className="row" style={{ gap: 8 }}>
                  <button className={`btn small${oath ? '' : ' ghost'}`} aria-pressed={oath} onClick={() => (oath || sfx('oath'), setOath(true))}>
                    {oath ? t('Challenge accepted') : t('Accept the challenge')}
                  </button>
                  <button className="btn small ghost" aria-pressed={!oath} onClick={() => setOath(false)}>
                    {t('Just Reality')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* round 30 (owner): Shoot for the stars at hyper speed, about five minutes a career */}
          {mode === 'stars' && (
            <div className={`card oath-card comet-card${comet ? ' on' : ''}`} role="group" aria-label={t('The Comet challenge')}>
              <div className="stack" style={{ gap: 6 }}>
                <div className="sec-title with-icon">
                  <Icon name="comet" size={28} />
                  {t('Ride the comet? About five minutes a career')}
                </div>
                <p className="small muted">{t('Comet is Shoot for the stars at hyper speed: Fast break and Sim stay on for the whole career. The seasons play themselves and the game makes the routine calls and the turning points; you choose where you play, the draft, your brand deals and when to retire, and the biggest nights (draft night, awards, finals, breakthroughs) get a page of their own. The rest waits for you in a list of highlights. The career carries the Comet mark.')}</p>
                <div className="row" style={{ gap: 8 }}>
                  <button className={`btn small${comet ? '' : ' ghost'}`} aria-pressed={comet} onClick={() => (comet || sfx('comet'), setComet(true))}>
                    {comet ? t('Comet away') : t('Ride the comet')}
                  </button>
                  <button className="btn small ghost" aria-pressed={!comet} onClick={() => setComet(false)}>
                    {t('Just the stars')}
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="row-end">
            <button className="btn" data-tour="create-next" onClick={() => onStart(mode)}>
              {mode === 'reality' && oath ? t('Roll the rough road') : t('Make your player')}
            </button>
          </div>
          <p className="small muted">{t('The league is the same at every difficulty. What changes is your potential, how fast you grow and how often you get hurt. Want it quicker? Flip the Fast break switch inside the game, any time.')}</p>
        </>
      )}
    </div>
  );
}

/** What each place's card holds. */
function PlaceCard({ id, state, ch, onStart, onFly, onStory }: { id: LandId; state: LandState; ch: Challenges; onStart: (m: Mode) => void; onFly: () => void; onStory: () => void }) {
  const mode = LAND_MODE[id];
  if (mode) return <Venue mode={mode} state={state} ch={ch} onStart={onStart} onFly={onFly} />;
  switch (id) {
    case 'airport':
      return <AirportCard onFly={onFly} />;
    case 'cinema':
      return <CinemaCard />;
    case 'house':
      return <ContinueCard />;
    case 'park':
      return <MultiplayerCard />;
    case 'library':
      return <CareerLogCard />;
    case 'news':
      return <NewsCard />;
    case 'plaza':
      return <CommunityCard />;
    case 'museum':
      return <AchievementsCard />;
    case 'story':
      return <StoryCard onStory={onStory} />;
    default:
      return <MiniGamesCard />;
  }
}

/** The main land: the map with its places, the car on the avenue, and the card of the place picked;
 * `children` (the username prompt) sit between the title and the map. `onStory` opens story mode's
 * naming page (round 38). */
export function MainLand({ ch, onStart, onStory, children }: { ch: Challenges; onStart: (m: Mode) => void; onStory: () => void; children?: ReactNode }) {
  const road = useStore((s) => s.road);
  const recommend = useStore((s) => s.recommend);
  const setPage = useStore((s) => s.setPage);
  // read each time (a small index): a save written while the page is up builds his house at once
  const career = listSlots().some((x) => !x.retired);
  const places = landPlaces(career);
  const [sel, setSel] = useState<LandId>(() => firstLand(career, recommend));
  // the map opens clear, the suggested place's plate hopping; a card pops out when a place is picked
  const [open, setOpen] = useState(false);
  const pop = useRef<HTMLDivElement>(null);
  const place = places.find((p) => p.id === sel) ?? places[0];

  // the car drives along the avenue a few pixels at a time; the boat takes him across to an island
  // (south to the mini-games, north to the old neighbourhood: `sail` counts its steps, minus north)
  const [carX, setCarX] = useState(() => stopOf(place.id));
  const [facing, setFacing] = useState<1 | -1>(1);
  const [sail, setSail] = useState(0);
  const isle = ISLANDS[place.id] ?? 0;
  const goal = isle ? DOCK : place.stop;
  useEffect(() => {
    if (carX === goal || (sail !== 0 && !isle)) return;
    setFacing(goal < carX ? -1 : 1);
    if (reducedMotion()) return setCarX(goal);
    const t = setTimeout(() => setCarX((x) => (x < goal ? Math.min(goal, x + 3) : Math.max(goal, x - 3))), 30);
    return () => clearTimeout(t);
  }, [carX, goal, sail, isle]);
  const across = isle && carX === DOCK ? 8 * isle : 0;
  useEffect(() => {
    if (sail === across) return;
    if (reducedMotion()) return setSail(across);
    const t = setTimeout(() => setSail((k) => k + Math.sign(across - k)), 110);
    return () => clearTimeout(t);
  }, [sail, across]);

  // the airport: the plane takes off, then the road map
  const [flight, setFlight] = useState(-1);
  const fly = () => {
    if (flight >= 0) return;
    sfx('takeoff');
    if (reducedMotion()) return setPage('road');
    setFlight(0);
  };
  useEffect(() => {
    if (flight < 0) return;
    if (flight >= 12) {
      setPage('road');
      return;
    }
    const t = setTimeout(() => setFlight((f) => f + 1), 70);
    return () => clearTimeout(t);
  }, [flight, setPage]);

  const go = (id: LandId, keys = false) => {
    if (id !== sel) sfx('tick');
    setSel(id);
    setOpen(true);
    // from the keyboard, the focus follows the car: the card's main button (a venue's way on to
    // making the player, else its first), or the place itself
    if (keys)
      requestAnimationFrame(() => (pop.current?.querySelector<HTMLElement>('[data-tour="create-next"]') ?? pop.current?.querySelector<HTMLElement>('.btn:not(:disabled)') ?? document.querySelector<HTMLElement>(`.ml-spot[data-place="${id}"]`))?.focus({ preventScroll: true }));
  };
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`.ml-spot[data-place="${sel}"]`)?.focus({ preventScroll: true }));
  };
  // the arrow keys move between the places; Escape folds the card away; Enter opens the one the car is at
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || document.querySelector('[aria-modal="true"], .set-menu')) return;
      const dir = KEYS[e.key];
      if (dir) {
        e.preventDefault();
        const next = neighbour(places, place.id, dir);
        if (next) go(next, true);
      } else if (e.key === 'Escape' && open) close();
      else if (e.key === 'Enter' && !open && !t.closest('button, a')) {
        e.preventDefault();
        go(place.id, true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const look = road.look;
  const kin = { h: look ? HAIR_COLORS[look.hair] : '#231B18', s: SKIN_COLORS[look?.skin ?? 2], g: '#BFE3FF', R: '#E03131', Y: '#FFF3BF', O: '#18141C', S: '#F8F9FA', T: '#8B5A2B' };
  const [bx, by, bw, bh] = place.box;
  const side = landSide(place);
  // beside the place; a card from the row above the avenue hangs from the map's top (the venues'
  // challenges can run past its foot), one from the row below sits level with its place
  const cy = ((by + bh / 2) / LAND_H) * 100;
  const popAt: CSSProperties = { [side === 'right' ? 'left' : 'right']: `${(side === 'right' ? (bx + bw) / LAND_W : (LAND_W - bx) / LAND_W) * 100 + 1}%`, ...(place.row === 'top' ? { top: '1%' } : { top: `${cy}%`, transform: `translateY(-${cy}%)` }) };
  const state = landState(road, place.id, recommend);
  const plane = flight < 0 ? { x: 9, y: 14 } : { x: 9 + flight * 3, y: 14 - Math.max(0, flight - 3) * 3 };
  return (
    <>
      <section className="ml-hero">
        <div className="kicker">{t('A basketball career game')} · the main land</div>
        <h1 className="ml-title">The main land</h1>
        <p className="small muted road-hint">
          {t('Click a place on the map')}
          <span className="hide-touch">{t(', or move between them with the arrow keys (Enter opens a place, Escape closes its card)')}</span>.
        </p>
      </section>
      {children}
      <div className="ml-stage" data-tour="mainland">
        <LandMap career={career} label={t('The main land: a gym, the cage and the dome for the three difficulties, the airport, the cinema, the park, the library, the newsstand, the statue plaza, the trophy museum, his house while a career is going, the island of mini-games across the water, and the old neighbourhood to the north, where story mode starts')}>
          <Sprite rows={PLANE} x={plane.x} y={plane.y} colors={PLANE_COLORS} />
          <Sprite rows={BOAT} x={186 + Math.abs(sail)} y={51 + Math.round(sail * (sail > 0 ? 1.1 : 1.25))} colors={sail ? kin : { ...kin, h: '', s: '' }} />
          {!sail && <Sprite rows={CAR} x={carX - 4} y={AVENUE - 4} colors={kin} flip={facing < 0} />}
          {!sail && <rect className="ml-night" x={facing > 0 ? carX + 5 : carX - 7} y={AVENUE - 1} width={3} height={1} fill="#FFF3BF" />}
        </LandMap>
        <div className="ml-spots">
          {places.map((p) => {
            const st = landState(road, p.id, recommend);
            const [x, y, w, h] = p.box;
            const on = p.id === sel && open;
            return (
              <button
                key={p.id}
                className={`ml-spot ml-${p.row} ${st}${on ? ' on' : ''}`}
                data-place={p.id}
                data-state={st}
                data-tour={p.id === 'gym' ? 'mode-regular' : undefined}
                style={{ left: `${(x / LAND_W) * 100}%`, top: `${(y / LAND_H) * 100}%`, width: `${(w / LAND_W) * 100}%`, height: `${(h / LAND_H) * 100}%` }}
                aria-label={st === 'locked' ? t('{place}: {plate}, locked', { place: p.name, plate: p.plate }) : st === 'next' ? t('{place}: {plate}, recommended', { place: p.name, plate: p.plate }) : `${p.name}: ${p.plate}`}
                aria-pressed={on}
                onClick={(e) => go(p.id, e.detail === 0)}
              >
                <span className="ml-plate" aria-hidden="true">
                  <Icon name={st === 'locked' ? 'lock' : p.icon} size={18} />
                  <span className="ml-name">{p.plate}</span>
                </span>
              </button>
            );
          })}
        </div>
        {open && (
          <div className={`road-pop ml-pop ml-${place.row} ${side}`} style={popAt} ref={pop} key={place.id}>
            <button className="pop-x road-pop-x" aria-label={t('Close')} onClick={close}>
              <PixelX />
            </button>
            <section className="card stack ml-card" aria-label={place.name}>
              <div className="row ml-head">
                <LandCrop place={place.id} career={career} size={64} />
                <div className="kicker">{place.name}</div>
              </div>
              <PlaceCard id={place.id} state={state} ch={ch} onStart={onStart} onFly={fly} onStory={onStory} />
            </section>
          </div>
        )}
      </div>
    </>
  );
}
