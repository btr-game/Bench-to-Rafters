import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../../engine/types';
import { EURO_CLUBS } from '../../content/teams';
import { intLeagueOf } from '../../engine/world/leagues';
import { team as teamOf } from '../selectors';
import { Landmarks, hasPlace } from './places';

// Venues behind the page banners (round 17): the gym, the arena or the hall where he plays this
// year, drawn in one colour (his team's) and faded toward the text. A high school gym with
// bleachers and a wall-mounted hoop, a college arena under an arched roof, an NBA bowl with the
// jumbotron and banners in the rafters, a European hall under roof trusses with flags.

export type VenueKind = 'gym' | 'college' | 'nba' | 'hall';

export function venueOf(g: GameState): VenueKind {
  const s = g.stage;
  if (s === 'HS') return 'gym';
  if (s === 'NCAA' || s === 'GL') return 'college';
  if (s === 'EU' || s === 'INT') return 'hall';
  return 'nba';
}

/** Where he plays when it is not the United States: his country at a youth academy, the club's
 * country in Europe, the league's country (or region) abroad. */
export function placeOf(g: GameState): string | null {
  let place: string | null = null;
  if (g.stage === 'HS') place = g.flags.usPrep ? null : g.flags.spain ? 'Spain' : g.player.country;
  else if (g.stage === 'EU') place = EURO_CLUBS.find((c) => c.name === teamOf(g)?.name)?.country ?? 'Europe';
  else if (g.stage === 'INT' && g.teamId) place = intLeagueOf(g.teamId).country;
  return hasPlace(place) ? place : null;
}

/** Rows of fans as one path: a head and a pair of shoulders each, slightly uneven. */
function crowd(x0: number, x1: number, y0: number, rows: number, gap: number, r: number, seed: number, aisles: number[] = []): string {
  let d = '';
  let k = seed;
  const rnd = () => {
    k = (k * 1103515245 + 12345) & 0x7fffffff;
    return k / 0x7fffffff;
  };
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * r * 4.2;
    for (let x = x0 + (row % 2) * gap * 0.5; x < x1; x += gap) {
      if (rnd() < 0.12) continue; // an empty seat
      if (aisles.some((a) => Math.abs(x - a) < gap)) continue;
      const cx = x + (rnd() - 0.5) * gap * 0.3;
      const cy = y - rnd() * r * 0.6;
      d += `M${(cx - r).toFixed(1)} ${cy.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
      d += `M${(cx - r * 2).toFixed(1)} ${(cy + r * 3.2).toFixed(1)}q${2 * r} ${-3.4 * r} ${4 * r} 0z`;
    }
  }
  return d;
}

const CROWD = {
  nbaUpper: crowd(330, 1200, 112, 4, 15, 3.2, 7),
  nbaLower: crowd(300, 1200, 170, 4, 17, 3.6, 11),
  college: crowd(320, 1200, 120, 6, 16, 3.4, 5, [560, 880]),
  hall: crowd(340, 1200, 132, 5, 18, 3.5, 3),
  gym: crowd(420, 860, 168, 3, 34, 3.6, 9),
  abroad: crowd(340, 1200, 172, 3, 18, 3.4, 13),
};

function Nba() {
  return (
    <g>
      {/* roof and light rig */}
      <path d="M0 12 H1200 M0 22 H1200" stroke="currentColor" strokeWidth="2" opacity=".5" />
      {Array.from({ length: 30 }, (_, i) => (
        <path key={i} d={`M${i * 40} 12 L${i * 40 + 20} 22 L${i * 40 + 40} 12`} fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".45" />
      ))}
      <path d="M560 22 L470 215 L600 215 Z M960 22 L920 215 L1050 215 Z" fill="currentColor" opacity=".07" />
      {/* jumbotron */}
      <path d="M745 22 V34 M805 22 V34" stroke="currentColor" strokeWidth="2" opacity=".6" />
      <rect x="710" y="34" width="130" height="58" rx="5" fill="currentColor" opacity=".55" />
      <rect x="718" y="41" width="114" height="38" rx="2" fill="currentColor" opacity=".45" />
      <rect x="722" y="92" width="106" height="8" rx="2" fill="currentColor" opacity=".5" />
      {/* banners in the rafters: titles and retired jerseys */}
      {[900, 946, 992, 1038, 1084, 1130].map((x, i) => (
        <g key={x} opacity=".55">
          <path d={`M${x} 22 h36 v58 l-18 -9 l-18 9 z`} fill="currentColor" />
          {i % 2 === 1 && <path d={`M${x + 8} 34 h6 l4 4 l4 -4 h6 l4 6 l-5 3 v20 h-18 v-20 l-5 -3 z`} fill="#fff" opacity=".55" />}
        </g>
      ))}
      <path d={CROWD.nbaUpper} fill="currentColor" opacity=".38" />
      <rect x="280" y="152" width="920" height="9" fill="currentColor" opacity=".5" />
      <path d={CROWD.nbaLower} fill="currentColor" opacity=".55" />
      <path d="M0 214 H1200" stroke="currentColor" strokeWidth="3" opacity=".6" />
      <path d="M1040 240 A90 26 0 0 1 1200 222" fill="none" stroke="currentColor" strokeWidth="2" opacity=".5" />
    </g>
  );
}

function College() {
  return (
    <g>
      <path d="M0 58 Q600 -14 1200 58" fill="none" stroke="currentColor" strokeWidth="3" opacity=".5" />
      {Array.from({ length: 16 }, (_, i) => {
        const x = 60 + i * 72;
        const y = 58 - 72 * Math.sin((Math.PI * x) / 1200) * 0.62;
        return <path key={i} d={`M${x} ${y.toFixed(1)} V${(y + 26).toFixed(1)}`} stroke="currentColor" strokeWidth="2" opacity=".4" />;
      })}
      <rect x="700" y="30" width="96" height="44" rx="4" fill="currentColor" opacity=".5" />
      <path d="M712 42 h30 M712 52 h22 M756 42 h28 M756 52 h20" stroke="#fff" strokeWidth="3" opacity=".45" />
      {[900, 950, 1000, 1050, 1100].map((x) => (
        <path key={x} d={`M${x} 46 h32 v40 l-16 -8 l-16 8 z`} fill="currentColor" opacity=".45" />
      ))}
      <path d={CROWD.college} fill="currentColor" opacity=".5" />
      <path d="M0 214 H1200" stroke="currentColor" strokeWidth="3" opacity=".6" />
      <path d="M1080 240 V218 H1200" fill="none" stroke="currentColor" strokeWidth="2" opacity=".5" />
    </g>
  );
}

function Hall() {
  return (
    <g>
      <path d="M0 8 H1200 M0 46 H1200" stroke="currentColor" strokeWidth="2.4" opacity=".5" />
      <path d={Array.from({ length: 31 }, (_, i) => `M${i * 40} 46 L${i * 40 + 20} 8 L${i * 40 + 40} 46`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".45" />
      {[600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140].map((x, i) => (
        <g key={x} opacity=".5">
          <path d={`M${x} 46 V56`} stroke="currentColor" strokeWidth="1.4" />
          <rect x={x - 18} y="56" width="36" height="24" fill="currentColor" opacity={i % 2 ? 0.5 : 0.8} />
          <rect x={x - 18} y={i % 3 === 0 ? 64 : 56} width={i % 3 === 0 ? 36 : 12} height={i % 3 === 0 ? 8 : 24} fill="#fff" opacity=".5" />
        </g>
      ))}
      <path d={CROWD.hall} fill="currentColor" opacity=".45" />
      <rect x="300" y="198" width="900" height="12" fill="currentColor" opacity=".55" />
      <path d="M340 204 h60 M440 204 h40 M520 204 h70 M640 204 h50 M740 204 h60 M850 204 h44 M940 204 h70 M1060 204 h50 M1140 204 h40" stroke="#fff" strokeWidth="3" opacity=".4" />
      <path d="M0 214 H1200" stroke="currentColor" strokeWidth="3" opacity=".6" />
    </g>
  );
}

function Gym() {
  return (
    <g>
      {/* cinder-block wall and high windows */}
      <path d={Array.from({ length: 11 }, (_, i) => `M0 ${20 + i * 14} H1200`).join(' ')} stroke="currentColor" strokeWidth=".8" opacity=".22" />
      {[440, 600, 760, 920].map((x) => (
        <g key={x}>
          {[0, 37, 74].map((o) => (
            <rect key={o} x={x + o} y="10" width="34" height="34" fill="currentColor" opacity=".18" />
          ))}
        </g>
      ))}
      {/* championship pennants on the wall */}
      {[500, 556, 612, 668].map((x) => (
        <path key={x} d={`M${x} 60 h40 l-20 38 z`} fill="currentColor" opacity=".45" />
      ))}
      {/* wall-mounted hoop */}
      <path d="M1088 26 V60 M1088 40 L1120 70" stroke="currentColor" strokeWidth="4" opacity=".5" />
      <rect x="1060" y="62" width="104" height="66" rx="3" fill="none" stroke="currentColor" strokeWidth="4" opacity=".6" />
      <rect x="1093" y="92" width="38" height="28" fill="none" stroke="currentColor" strokeWidth="3" opacity=".6" />
      <ellipse cx="1112" cy="128" rx="20" ry="4" fill="none" stroke="currentColor" strokeWidth="3.4" opacity=".75" />
      <path d="M1094 130 L1100 156 M1104 132 L1106 158 M1120 132 L1118 158 M1130 130 L1124 156 M1100 156 H1124" stroke="currentColor" strokeWidth="1.4" opacity=".5" />
      {/* pull-out bleachers */}
      {Array.from({ length: 4 }, (_, i) => (
        <rect key={i} x={400 + i * 12} y={160 + i * 14} width={470 - i * 24} height="6" fill="currentColor" opacity=".4" />
      ))}
      <path d={CROWD.gym} fill="currentColor" opacity=".45" />
      {/* the wood floor */}
      <path d="M0 214 H1200" stroke="currentColor" strokeWidth="3" opacity=".6" />
      <path d={Array.from({ length: 4 }, (_, i) => `M0 ${222 + i * 6} H1200`).join(' ')} stroke="currentColor" strokeWidth=".8" opacity=".25" />
    </g>
  );
}

/** Abroad: the city's skyline, then the stands and the floor of the gym or hall in front of it. */
function Abroad({ place }: { place: string }) {
  return (
    <g>
      <Landmarks place={place} />
      <path d="M300 156 H1200" stroke="currentColor" strokeWidth="3" opacity=".45" />
      <path d={CROWD.abroad} fill="currentColor" opacity=".42" />
      <path d="M0 214 H1200" stroke="currentColor" strokeWidth="3" opacity=".6" />
    </g>
  );
}

const scene = (kind: VenueKind, place?: string | null) =>
  place ? <Abroad place={place} /> : kind === 'gym' ? <Gym /> : kind === 'college' ? <College /> : kind === 'hall' ? <Hall /> : <Nba />;

// The scene is drawn as a vector once, then sampled down to a coarse grid (4 units a pixel) and
// redrawn as crisp blocks in a few strengths of the team colour: the pixel-art look of the
// sprites, from the same drawing. Faded toward the left so the banner text stays clear.
const PW = 300;
const PH = 60;
const LEVELS = 5;
const cache = new Map<string, string[]>();

async function pixelate(svg: string): Promise<string[]> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = PW;
  c.height = PH;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, PW, PH);
  const px = ctx.getImageData(0, 0, PW, PH).data;
  const paths: string[] = Array(LEVELS + 1).fill('');
  for (let y = 0; y < PH; y++) {
    let run = 0;
    let runAt = 0;
    const flush = (x: number) => {
      if (run) paths[run] += `M${runAt} ${y}h${x - runAt}v1h${runAt - x}z`;
    };
    for (let x = 0; x < PW; x++) {
      const i = (y * PW + x) * 4;
      const ink = (px[i + 3] / 255) * (1 - (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255);
      const fade = Math.min(1, Math.max(0, (x / PW - 0.08) / 0.5));
      const level = Math.round(ink * fade * LEVELS * 1.15);
      const l = Math.min(LEVELS, level);
      if (l !== run) {
        flush(x);
        run = l;
        runAt = x;
      }
    }
    flush(PW);
  }
  return paths;
}

export function VenueArt({ kind, place }: { kind: VenueKind; place?: string | null }) {
  const key = place ? `${kind}:${place}` : kind;
  const [paths, setPaths] = useState(() => cache.get(key) ?? null);
  const src = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (cache.has(key)) return setPaths(cache.get(key)!);
    setPaths(null);
    if (!src.current) return;
    let live = true;
    pixelate(src.current.outerHTML.replace(' visibility="hidden"', ''))
      .then((p) => {
        cache.set(key, p);
        if (live) setPaths(p);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key, paths]);
  return (
    <svg className="art art-venue" data-art="banner-venue" data-venue={kind} data-place={place ?? undefined} viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="xMaxYMax meet" shapeRendering="crispEdges" aria-hidden="true">
      {paths?.map((d, l) => (d ? <path key={l} d={d} fill="currentColor" fillOpacity={l / LEVELS} /> : null))}
      {!paths && (
        // the vector drawing, kept out of sight: it is only read once to make the pixels
        <svg ref={src} xmlns="http://www.w3.org/2000/svg" width="1200" height="240" viewBox="0 0 1200 240" style={{ color: '#000' }} visibility="hidden">
          {scene(kind, place)}
        </svg>
      )}
    </svg>
  );
}
