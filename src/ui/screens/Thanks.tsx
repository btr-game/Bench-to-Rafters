// Thank you for playing (round 27, owner: "for first starters, let's add a thank you for playing
// page when they start a new career (either because they've retired ... or when they quit and start
// a new career). this should also have a background animation. crowds cheering, and the avatar is
// holding up a trophy"). Round 28 (owner: "make the thank you page appear everytime the user exits a
// career"): every time someone leaves a career, not only the first.

import { useEffect, useMemo } from 'react';
import type { GameState } from '../../engine/types';
import { useStore } from '../../store';
import { CelebrationArt } from '../art/Scene';
import { PixelWord } from '../art/PixelText';
import { AwardArt } from '../art/Award';
import { Icon } from '../art/Icon';
import { hallOfFame, raftersTeams } from '../../engine/awards/legacy';
import { ShareButton } from '../components/Share';

const CONFETTI = ['#F76707', '#FCC419', '#1C7ED6', '#2F9E44', '#E03131', '#7048E8', '#F8F9FA'];
const SKIN = ['#F3D2B8', '#D4A077', '#B67F55', '#8E5B3A', '#6B4029', '#E8BC98'];
const HAIR = ['#231B18', '#5A3A22', '#D9B26A', '#231B18', '#B4532A'];
const SHIRT = ['#E03131', '#1C7ED6', '#F76707', '#2F9E44', '#FCC419', '#7048E8', '#F1F3F5'];

/**
 * A row of fans in pixels (round 27, owner: "for every graphic you make, make them pixelated ...
 * shadow the crowd a little bit as they go further back"): forty fans on a 10 by 11 grid each,
 * every second one with his arms up; `up` draws the other half's arms instead, and the page swaps
 * the two in steps so the row waves.
 */
function CrowdRow({ seed, up }: { seed: number; up: boolean }) {
  const px = useMemo(() => {
    const out: [number, number, number, number, string][] = [];
    for (let i = 0; i < 40; i++) {
      const k = (i * 7 + seed * 13) % 97;
      const x = i * 10;
      const shirt = SHIRT[(k + i) % SHIRT.length];
      out.push([x + 3, 1, 4, 1, HAIR[k % HAIR.length]]);
      out.push([x + 3, 2, 4, 3, SKIN[(k >> 1) % SKIN.length]]);
      out.push([x + 1, 5, 8, 6, shirt]);
      const raised = (i % 2 === 0) !== up;
      if (raised) {
        out.push([x, 1, 1, 4, shirt]);
        out.push([x + 9, 1, 1, 4, shirt]);
        out.push([x, 0, 1, 1, SKIN[(k >> 1) % SKIN.length]]);
        out.push([x + 9, 0, 1, 1, SKIN[(k >> 1) % SKIN.length]]);
      }
    }
    return out;
  }, [seed, up]);
  return (
    <svg viewBox="0 0 400 11" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges">
      {px.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
  );
}

export function Thanks({ g }: { g: GameState }) {
  const end = useStore((s) => s.endThanks);
  useEffect(() => {
    // a pop-up over the page (Share the game) keeps its keys
    const key = (e: KeyboardEvent) => (e.key === 'Enter' || e.key === 'Escape') && !document.querySelector('[role="dialog"]') && end();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [end]);
  // round 27 (owner: "if the user had completed the game, or had broken any records (mvp, mip, ...)
  // make those icons appear in the background"): each honour once, a finished career's laurel first
  const honours = useMemo(() => {
    const seen = new Map<string, string>();
    if (g.step === 'retired') seen.set('DONE', 'Career complete');
    if (hallOfFame(g)) seen.set('HOF', 'Hall of Fame');
    if (raftersTeams(g).length) seen.set('RAFTERS', 'Jersey in the rafters');
    for (const a of g.awards) if (!seen.has(a.key)) seen.set(a.key, a.label);
    return [...seen].slice(0, 18);
  }, [g]);
  // confetti: where each piece falls from, its colour, speed and start (fixed, so it never jumps)
  const bits = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ left: (i * 37 + 5) % 100, c: CONFETTI[i % CONFETTI.length], d: 7 + ((i * 7) % 10) / 3, delay: -((i * 13) % 80) / 10 })), []);
  return (
    <main className="thanks">
      <div className="th-scene" aria-hidden="true">
        {[1, 2, 3].map((r) => (
          <div key={r} className={`th-crowd r${r}`}>
            <span className="th-wave a">
              <CrowdRow seed={r} up={false} />
            </span>
            <span className="th-wave b">
              <CrowdRow seed={r} up />
            </span>
          </div>
        ))}
        {/* one still, stepped spotlight on him */}
        <svg className="th-light" viewBox="0 0 20 40" preserveAspectRatio="none" shapeRendering="crispEdges">
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={9 - i} y={i * 4} width={2 + i * 2} height={4} />
          ))}
        </svg>
        <div className="th-floor" />
        {bits.map((b, i) => (
          <i key={i} className="th-bit" style={{ left: `${b.left}%`, background: b.c, animationDuration: `${b.d}s`, animationDelay: `${b.delay}s` }} />
        ))}
        <div className="th-honours">
          {honours.map(([key, label], i) => {
            // left and right of the title, three across a side, row by row down the wall
            const side = i % 2;
            const col = Math.floor(i / 2) % 3;
            const row = Math.floor(i / 6);
            return (
              <span key={key} className="th-honour" style={{ [side ? 'right' : 'left']: `${3 + col * 8.5}%`, top: `${6 + row * 9}%`, animationDelay: `${-(i % 5) * 0.4}s` }} title={label}>
                {key === 'DONE' ? <Icon name="laurel" size={52} /> : <AwardArt akey={key} label={label} size={56} />}
              </span>
            );
          })}
        </div>
        <div className="th-hero">
          <CelebrationArt g={g} prize="NBA champions" mode="cheer" />
        </div>
      </div>
      <div className="th-front">
        <div className="kicker">{g.player.name}, #{g.player.number}</div>
        <h1 className="th-title">
          <PixelWord text="THANK YOU" color="#F4F1EA" shade="#1B1820" className="th-word" />
          <PixelWord text="FOR PLAYING" color="#FFD43B" shade="#5A4206" className="th-word" />
        </h1>
        <p className="intro-line">Every career is a different road. Ready for the next one?</p>
        <div className="th-go">
          <button className="btn intro-go" onClick={end} autoFocus>
            Play again
          </button>
          {/* round 28 (owner: a share button throughout): the moment someone liked a career most */}
          <ShareButton look="big" />
        </div>
      </div>
    </main>
  );
}
