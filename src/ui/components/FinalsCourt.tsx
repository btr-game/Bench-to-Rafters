// Crunch time in a final (round 28, owner: "on the last minutes of the final quarter (or overtime),
// the user can choose moves and basically play the 3v3 game but in the finals"): the arena floor in
// pixels, him and two teammates against three of theirs, spread for whoever has the ball, and the
// last trip in one big word over the rim, gold when it went his way and red when it did not.

import { useMemo } from 'react';
import { PlayerArt, styleLeague } from '../art/Player';
import { PixelWord } from '../art/PixelText';
import { Icon } from '../art/Icon';
import { t } from '../../i18n';

type Pt = [number, number];
// the side with the ball spreads out, its handler up top; the defense sits between them and the rim
const OFF: Pt[] = [
  [50, 80],
  [18, 58],
  [82, 58],
];
const DEF: Pt[] = [
  [50, 58],
  [28, 45],
  [72, 45],
];
const hand = ([x, y]: Pt): Pt => [x + 2.6, y - 5];

/** An arena floor on a 100 x 80 grid: the crowd, the baseline, hardwood planks, the paint in the home colour, the arc, the rim. */
function ArenaPixels({ paint }: { paint: string }) {
  const px = useMemo(() => {
    const out: [number, number, number, number, string][] = [];
    const r = (x: number, y: number, w: number, h: number, c: string) => out.push([x, y, w, h, c]);
    // the crowd, in rows of heads under the lights
    r(0, 0, 100, 11, '#1b1e26');
    const heads = ['#e9c39b', '#a86b45', '#6d4128', '#f1d7b8', '#8a5636'];
    for (let y = 1; y < 10; y += 3) for (let x = (y % 2) * 2; x < 100; x += 4) r(x, y, 2, 2, heads[(x * 7 + y * 3) % heads.length]);
    r(0, 11, 100, 1, '#c92a2a');
    r(0, 12, 100, 1, '#f1f3f5');
    // the planks, in two tones, offset row by row
    for (let y = 13; y < 80; y += 3) for (let x = (y % 6) * 3; x < 100; x += 18) r(x, y, 9, 3, '#c98e52');
    // the paint and its lines
    r(36, 13, 28, 26, paint);
    r(35, 13, 1, 27, '#f8f9fa');
    r(64, 13, 1, 27, '#f8f9fa');
    r(35, 39, 30, 1, '#f8f9fa');
    // the arc, stepped
    for (let x = 6; x <= 94; x++) {
      const u = (x - 50) / 44;
      r(x, Math.round(13 + 41 * Math.sqrt(Math.max(0, 1 - u * u))), 1, 1, '#f8f9fa');
    }
    // the backboard, the rim and the net
    r(41, 3, 18, 8, '#18141c');
    r(42, 4, 16, 6, '#e9ecef');
    r(47, 6, 6, 1, '#c92a2a');
    r(47, 6, 1, 4, '#c92a2a');
    r(52, 6, 1, 4, '#c92a2a');
    r(49, 11, 2, 2, '#495057');
    r(46, 13, 8, 1, '#e8590c');
    r(45, 14, 1, 1, '#e8590c');
    r(54, 14, 1, 1, '#e8590c');
    r(46, 15, 8, 1, '#c2410c');
    for (let i = 0; i < 4; i++) r(46 + i * 2, 16 + (i % 2), 1, 2, '#f1f3f5');
    r(47, 18, 6, 1, '#f1f3f5');
    return out;
  }, [paint]);
  return (
    <svg className="sb-px" viewBox="0 0 100 80" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="0" y="0" width="100" height="80" fill="#b67a41" />
      {px.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
  );
}

interface CourtSide {
  name: string;
  color: string;
  team?: string;
  abbr?: string;
}

/** The floor for one trip: whose ball, the score in words, and the last trip's word. */
export function FinalsCourt({ me, number, us, them, level, side, last, home, wear }: { me: string; number: number; us: CourtSide; them: CourtSide; level: string; side: 'off' | 'def'; last: { word: string; good: boolean; text: string } | null | undefined; home: boolean; wear?: Parameters<typeof PlayerArt>[0]['wear'] }) {
  const lg = styleLeague(level);
  const ourSpots = side === 'off' ? OFF : DEF;
  const theirSpots = side === 'off' ? DEF : OFF;
  const ball = hand(OFF[0]); // the handler up top has it, whichever side
  const mates = [
    { key: 'me', name: me, number, label: t('You') },
    { key: 'm1', name: `${us.team ?? 'Team'} wing`, number: 7, label: '' },
    { key: 'm2', name: `${us.team ?? 'Team'} big`, number: 33, label: '' },
  ];
  return (
    <div className="sb-court fc-court" aria-label={`${side === 'off' ? t('Your ball') : t('Their ball')}. ${last ? last.text : t('Crunch time.')}`}>
      <ArenaPixels paint={home ? us.color : them.color} />
      {mates.map((x, i) => (
        <div key={x.key} className={`sb-player us${x.key === 'me' ? ' act' : ''}`} style={{ left: `${ourSpots[i][0]}%`, top: `${ourSpots[i][1]}%` }}>
          <PlayerArt name={x.name} number={x.number} pos={side === 'off' ? (i === 0 ? 'SG' : 'PF') : 'PG'} color={us.color} team={us.team} abbr={us.abbr} league={lg} kit={home ? 'home' : 'road'} size={64} noBall wear={x.key === 'me' ? wear : undefined} />
          {x.label && <span>{x.label}</span>}
        </div>
      ))}
      {[0, 1, 2].map((i) => (
        <div key={`t${i}`} className="sb-player them" style={{ left: `${theirSpots[i][0]}%`, top: `${theirSpots[i][1]}%` }}>
          <PlayerArt name={`${them.name} ${i}`} number={[3, 11, 32][i]} pos={side === 'def' ? (i === 0 ? 'SG' : 'PF') : 'PG'} color={them.color} team={them.team} abbr={them.abbr} league={lg} kit={home ? 'road' : 'home'} size={64} noBall mirror />
        </div>
      ))}
      <div className="sb-ball" style={{ left: `${ball[0]}%`, top: `${ball[1]}%` }}>
        <Icon name="ball" size={18} />
      </div>
      {last && (
        <div key={last.text} className={`sb-call ${last.good ? 'good' : 'bad'}`} aria-hidden="true">
          <PixelWord text={last.word} color={last.good ? '#FFD43B' : '#FF8787'} shade={last.good ? '#5A4206' : '#5C1A1A'} className="sb-call-word" />
        </div>
      )}
    </div>
  );
}
