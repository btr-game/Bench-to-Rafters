// 3-on-3 streetball (engine/mini/streetball.ts): king of the court at a city park. Pick the play
// on offense (a drive asks for a timing tap to finish), read the other crew on defense.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { GUARDS, MOVES, STREET, newStreet, nextGame, runDefense, runOffense, streetResult, target, type Baller, type Guard, type Move, type Play, type StreetState, type Timing } from '../../engine/mini/streetball';
import { userOvr } from '../../engine/career/common';
import { clamp } from '../../engine/rng';
import { genericKits } from '../../content/teamStyle';
import { PlayerArt } from '../art/Player';
import { MiniBonus } from './MiniBonus';

const CREW_COLOR = ['#E8590C', '#1C7ED6', '#7048E8'];
const US_COLOR = '#2B8A3E';

/** The career player's ratings, or a park regular's in free play. */
function meFrom(game: ReturnType<typeof useStore.getState>['game']): { me: Baller; level: number } {
  if (!game || game.step === 'retired') return { me: { name: 'You', FIN: 72, SHT: 70, PLY: 70, ATH: 72, PER: 68, INT: 64, REB: 66 }, level: 70 };
  const a = game.player.attrs;
  return { me: { name: game.player.name, FIN: a.FIN, SHT: a.SHT, PLY: a.PLY, ATH: a.ATH, PER: a.PER, INT: a.INT, REB: a.REB }, level: clamp(Math.round(userOvr(game)), 55, 92) };
}

/** The finish meter: tap while the marker is in the green. Green grows with finishing. */
function FinishMeter({ fin, round, onTap }: { fin: number; round: number; onTap: (t: Timing) => void }) {
  const zone = clamp(0.1 + fin * 0.0016, 0.14, 0.27);
  const centre = useMemo(() => 0.3 + Math.random() * 0.4, []);
  const pos = useRef(0);
  const dir = useRef(1);
  const bar = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const tap = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const d = Math.abs(pos.current - centre);
    onTap(d <= zone * 0.18 ? 'perfect' : d <= zone / 2 ? 'good' : 'late');
  }, [centre, zone, onTap]);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const speed = 1 / (900 - round * 120); // a full sweep in under a second, faster each game
    const step = (now: number) => {
      const dt = Math.min(40, now - (last || now));
      last = now;
      pos.current += dir.current * dt * speed;
      if (pos.current >= 1) (pos.current = 1), (dir.current = -1);
      if (pos.current <= 0) (pos.current = 0), (dir.current = 1);
      if (bar.current) bar.current.style.left = `${pos.current * 100}%`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', key);
    };
  }, [round, tap]);
  return (
    <div className="sb-meter-wrap">
      <div className="sb-meter" onClick={tap}>
        <span className="sb-green" style={{ left: `${(centre - zone / 2) * 100}%`, width: `${zone * 100}%` }}>
          <i style={{ left: '41%', width: '18%' }} />
        </span>
        <div ref={bar} className="sb-marker" />
      </div>
      <button className="btn" onClick={tap}>
        Finish! <span className="kbd">Space</span>
      </button>
    </div>
  );
}

// spots on the court (percent of width, height): the ball handler up top, two wings
const OFF = [
  [50, 74],
  [18, 50],
  [82, 50],
];
const DEF = [
  [50, 58],
  [27, 40],
  [73, 40],
];

function Court({ st, last, crewColor }: { st: StreetState; last: Play | null; crewColor: string }) {
  const crew = st.crews[st.round];
  const ours = [st.me, ...st.mates];
  const usKit = genericKits(US_COLOR, 'PARK').road;
  const themKit = genericKits(crewColor, crew.name.split(' ').pop()!.toUpperCase().slice(0, 6)).road;
  const usSpots = st.ourBall ? OFF : DEF;
  const themSpots = st.ourBall ? DEF : OFF;
  // the ball: at the hoop after a make, bouncing off the rim after a miss, else with the handler
  const shooterIdx = last ? (last.side === 'us' ? ours : crew.players).findIndex((x) => x.name === last.shooter) : -1;
  const ball = last && last.made ? [50, 14] : last && !last.made && !last.steal ? [58, 22] : OFF[0];
  return (
    <div className="sb-court" aria-label={`${crew.court}: you ${st.us}, ${crew.name} ${st.them}`}>
      <div className="sb-fence" />
      <div className="sb-board">
        <div className="sb-rim" />
      </div>
      <div className="sb-key" />
      <div className="sb-arc" />
      {ours.map((x, i) => (
        <div key={x.name} className={`sb-player us${last?.side === 'us' && shooterIdx === i ? ' act' : ''}`} style={{ left: `${usSpots[i][0]}%`, top: `${usSpots[i][1]}%` }}>
          <PlayerArt name={x.name} number={[1, 7, 23][i]} kitData={usKit} size={64} />
          <span>{x.me ? 'You' : x.name.split(' ').pop()}</span>
        </div>
      ))}
      {crew.players.map((x, i) => (
        <div key={x.name} className={`sb-player them${last?.side === 'them' && shooterIdx === i ? ' act' : ''}`} style={{ left: `${themSpots[i][0]}%`, top: `${themSpots[i][1]}%` }}>
          <PlayerArt name={x.name} number={[3, 11, 32][i]} kitData={themKit} size={64} />
          <span>{x.name.split(' ').pop()}</span>
        </div>
      ))}
      <div key={st.plays.length} className={`sb-ball${last?.made ? ' in' : ''}`} style={{ left: `${ball[0]}%`, top: `${ball[1]}%` }} />
      {last?.highlight && (
        <div key={`h${st.plays.length}`} className="sb-highlight">
          {last.highlight}
        </div>
      )}
    </div>
  );
}

export function StreetballGame() {
  const game = useStore((s) => s.game);
  const { me, level } = useMemo(() => meFrom(game), [game]);
  const [st, setSt] = useState<StreetState | null>(null);
  const [, force] = useState(0);
  const [driving, setDriving] = useState(false);
  const [last, setLast] = useState<Play | null>(null);
  const bump = () => force((n) => n + 1);

  const start = () => {
    setSt(newStreet(Math.floor(Math.random() * 2 ** 31), me, level));
    setLast(null);
  };
  const offense = useCallback(
    (m: Move, t?: Timing) => {
      if (!st) return;
      setLast(runOffense(st, m, t));
      setDriving(false);
      bump();
    },
    [st],
  );
  const defense = useCallback(
    (g: Guard) => {
      if (!st) return;
      setLast(runDefense(st, g));
      bump();
    },
    [st],
  );
  // number keys pick the play
  useEffect(() => {
    if (!st || st.gameOver || driving) return;
    const key = (e: KeyboardEvent) => {
      const n = Number(e.key) - 1;
      if (Number.isNaN(n) || n < 0) return;
      if (st.ourBall && MOVES[n]) MOVES[n].key === 'drive' ? setDriving(true) : offense(MOVES[n].key);
      else if (!st.ourBall && GUARDS[n]) defense(GUARDS[n].key);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  if (!st)
    return (
      <section className="stack stage-in sb-intro">
        <div>
          <div className="kicker">Mini-game · 3-on-3</div>
          <h1 className="hub-title">King of the court</h1>
          <p className="prose">
            Three crews hold the park. Beat them in a row: the first two games to 7, the final to 11. Ones and twos (inside the arc 1, outside 2), and make it take it: score and you keep the ball. On offense pick the play; a drive asks for a timing tap to finish (a perfect one draws the and-one). On defense read the crew: shooters, slashers or bigs. Highlights fire up the crowd, and a full crowd makes your next play better.
          </p>
          <p className="small muted">
            {game && game.step !== 'retired' ? `${me.name} plays with his own ratings (finishing ${Math.round(me.FIN)}, athleticism ${Math.round(me.ATH)}, shooting ${Math.round(me.SHT)}, playmaking ${Math.round(me.PLY)}).` : 'Free play: you are a park regular. With a career, your own player takes the court.'}{' '}
            A good run pays finishing.
          </p>
        </div>
        <div className="sb-ladder">
          {newStreet(1, me, level).crews.map((c, i) => (
            <div key={c.name} className="sb-rung" style={{ borderTopColor: CREW_COLOR[i] }}>
              <small>
                {i === 2 ? 'Final' : `Game ${i + 1}`} · to {STREET.rounds[i]} · {c.court}
              </small>
              <b>{c.name}</b>
              <span className="small muted">{c.style === 'shooters' ? 'Shooters: they live at the arc' : c.style === 'slashers' ? 'Slashers: they attack the rim' : 'Bigs: they post you up'}</span>
            </div>
          ))}
        </div>
        <button className="btn sb-go" onClick={start}>
          Hit the court
        </button>
      </section>
    );

  const crew = st.crews[st.round];
  const color = CREW_COLOR[st.round];
  const reached = streetResult(st);
  return (
    <section className="stack stage-in">
      <div className="sb-head">
        <div>
          <div className="kicker">
            {crew.court} · {st.round === 2 ? 'the final' : `game ${st.round + 1} of 3`} · first to {target(st)}
          </div>
          <h2 className="sb-title">vs {crew.name}</h2>
        </div>
        <div className="sb-score">
          <span className="us">{st.us}</span>
          <span className="dash">–</span>
          <span className="them" style={{ color }}>
            {st.them}
          </span>
        </div>
      </div>
      <div className="sb-grid">
        <Court st={st} last={last} crewColor={color} />
        <div className="stack sb-side">
          <div className="sb-hype" aria-label={`Crowd ${st.hype} of ${STREET.hypeMax}`}>
            <span>Crowd</span>
            {Array.from({ length: STREET.hypeMax }, (_, i) => (
              <i key={i} className={i < st.hype ? 'on' : ''} />
            ))}
            {st.hype >= STREET.hypeMax && <b>On fire: next play is better</b>}
          </div>
          {last && <p className={`sb-play ${last.side}${last.made ? ' made' : ''}`}>{last.text}</p>}
          {st.gameOver ? (
            <div className="card stack sb-over">
              <div className="sec-title">{st.us > st.them ? `You beat ${crew.name}, ${st.us}–${st.them}` : `${crew.name} win it, ${st.them}–${st.us}`}</div>
              {st.over ? (
                <p className="small">{reached === 'king' ? 'Three crews, three wins. You are the king of the court.' : reached === 'out' ? 'Next time. The park remembers.' : `You won ${st.wins} game${st.wins === 1 ? '' : 's'} before the run ended.`}</p>
              ) : (
                <button className="btn" onClick={() => (nextGame(st), setLast(null), bump())}>
                  Next: {st.crews[st.round + 1].name}
                </button>
              )}
            </div>
          ) : st.ourBall ? (
            driving ? (
              <FinishMeter fin={me.FIN} round={st.round} onTap={(t) => offense('drive', t)} />
            ) : (
              <>
                <div className="sec-title">Your ball: pick the play</div>
                <div className="sb-moves">
                  {MOVES.map((m, i) => (
                    <button key={m.key} className="sb-move" onClick={() => (m.key === 'drive' ? setDriving(true) : offense(m.key))}>
                      <b>
                        <span className="kbd">{i + 1}</span> {m.name} <small>{m.pts === 2 ? '2 pts' : '1 pt'}</small>
                      </b>
                      <small>{m.text}</small>
                    </button>
                  ))}
                </div>
              </>
            )
          ) : (
            <>
              <div className="sec-title">Their ball: how do you guard it?</div>
              <div className="sb-moves">
                {GUARDS.map((g, i) => (
                  <button key={g.key} className="sb-move def" onClick={() => defense(g.key)}>
                    <b>
                      <span className="kbd">{i + 1}</span> {g.name}
                    </b>
                    <small>{g.text}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          <ul className="sb-log small">
            {st.plays
              .slice(-6)
              .reverse()
              .map((x, i) => (
                <li key={st.plays.length - i} className={x.side}>
                  {x.made ? `+${x.pts} ` : ''}
                  {x.text}
                </li>
              ))}
          </ul>
        </div>
      </div>
      {st.over && <MiniBonus result={{ game: 'street', reached }} />}
    </section>
  );
}
