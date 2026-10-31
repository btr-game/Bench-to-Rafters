// The action cam lab (round 24 test page; round 25, owner: no longer its own artifact, a card in the
// dev deck). Pick a play and watch it on the cam the finals use, at game speed or slowed right down,
// with any two NBA teams in any kit; or run the last minutes of a made-up final, play by play.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionCam, type CamSide } from '../ui/art/ActionCam';
import { NBA_TEAMS } from '../content/teams';
import { TEAM_STYLE } from '../content/teamStyle';
import { buildDrama, type DramaPlay, type DramaTag } from '../engine/story/drama';

// slow motion: once the lab opens, every timer and animation the cam starts runs at this speed
// (the page reloads into the game when dev mode ends, so the patch never reaches a career)
let speed = 1;
let patched = false;
function slowMo(): void {
  if (patched) return;
  patched = true;
  const realTimeout = window.setTimeout.bind(window);
  window.setTimeout = ((f: TimerHandler, ms?: number, ...a: unknown[]) => realTimeout(f, (ms ?? 0) / speed, ...a)) as typeof window.setTimeout;
  const realAnimate = Element.prototype.animate;
  Element.prototype.animate = function (frames: Keyframe[] | PropertyIndexedKeyframes | null, o?: number | KeyframeAnimationOptions) {
    const opts = typeof o === 'number' ? { duration: o } : { ...(o ?? {}) };
    if (typeof opts.duration === 'number') opts.duration /= speed;
    if (opts.delay) opts.delay /= speed;
    return realAnimate.call(this, frames, opts);
  };
}

type Side = 'us' | 'them';
type KitKey = 'home' | 'road' | 'city';
interface PlayDef {
  id: string;
  label: string;
  pts: number;
  verb?: string;
  tag?: DramaTag;
}
const PLAYS: PlayDef[] = [
  { id: 'pullup', label: 'Pull-up three', pts: 3, verb: 'pulls up from deep' },
  { id: 'drills', label: 'Three (drills it)', pts: 3, verb: 'drills a three' },
  { id: 'corner', label: 'Corner three', pts: 3, verb: 'buries the corner three' },
  { id: 'stepback', label: 'Step-back three', pts: 3, verb: 'hits a step-back three' },
  { id: 'dunk', label: 'Dunk', pts: 2, verb: 'throws it down' },
  { id: 'putback', label: 'Putback', pts: 2, verb: 'scores on the putback' },
  { id: 'turn', label: 'Turnaround', pts: 2, verb: 'hits the turnaround' },
  { id: 'floater', label: 'Floater', pts: 2, verb: 'hits the floater' },
  { id: 'drive', label: 'Drive and score', pts: 2, verb: 'drives and scores' },
  { id: 'contact', label: 'Through contact', pts: 2, verb: 'finishes through contact' },
  { id: 'block', label: 'Block', pts: 0, tag: 'BLOCK' },
  { id: 'steal', label: 'Steal', pts: 0, tag: 'STEAL' },
  { id: 'miss', label: 'Missed heave', pts: 0, tag: 'MISS' },
  { id: 'run', label: 'The run', pts: 0, tag: 'RUN' },
];
const TAGS: [DramaTag, string][] = [['', 'None'], ['LEAD', 'Takes the lead'], ['TIE', 'Ties it'], ['DAGGER', 'Dagger'], ['BUZZER', 'Buzzer beater']];
const SPEEDS = [1, 0.5, 0.25, 0.1];
const last = (n: string) => n.trim().split(' ').slice(-1)[0] || 'Player';

function camSide(abbr: string, kit: KitKey): CamSide {
  const t = NBA_TEAMS.find((x) => x.abbr === abbr)!;
  return { kit: TEAM_STYLE[abbr][kit], color: t.color };
}

/** One play built the way the game words it (story/drama.ts). */
function makePlay(d: PlayDef, ball: Side, tag: DramaTag, mine: boolean, me: string, rival: string, teamShort: string): { play: DramaPlay; winner: Side } {
  const you = last(me);
  const opp = last(rival);
  if (d.id === 'block') {
    // the stop belongs to the side that does not have the ball
    const stopper: Side = ball === 'us' ? 'them' : 'us';
    const text = stopper === 'us' ? `${mine ? you : 'Ross'} blocks ${opp}'s layup! A game-changing block.` : `${opp} blocks ${mine ? 'your' : "Ross's"} layup! A game-changing block.`;
    return { play: { clock: '0:19', side: 'none', pts: 0, text, tag: 'BLOCK', mine: stopper === 'us' && mine }, winner: stopper };
  }
  if (d.id === 'steal') {
    const stopper: Side = ball === 'us' ? 'them' : 'us';
    const name = stopper === 'us' ? (mine ? you : 'Ross') : opp;
    return { play: { clock: '0:19', side: 'none', pts: 0, text: `${name} jumps the passing lane. Steal!`, tag: 'STEAL', mine: stopper === 'us' && mine }, winner: stopper };
  }
  if (d.id === 'miss') return { play: { clock: '0:00', side: 'none', pts: 0, text: `${you}'s heave at the horn rims out.`, tag: 'MISS', mine: true }, winner: 'them' };
  if (d.id === 'run') return { play: { clock: '11:30', side: 'none', pts: 0, text: `${ball === 'us' ? teamShort : 'They'} come out of the timeout on a mission.`, tag: 'RUN', mine: false }, winner: ball };
  const name = ball === 'us' ? (mine ? you : 'Ross') : opp;
  return { play: { clock: tag === 'BUZZER' ? '0:00.4' : '1:12', side: ball, pts: d.pts, text: `${name} ${d.verb}`, tag, mine: ball === 'us' && mine }, winner: ball };
}

/** The page: one play at a time or a whole final, at any speed, with any two teams. */
export function CamLab() {
  slowMo();
  const [usAbbr, setUs] = useState('MIN');
  const [themAbbr, setThem] = useState('BOS');
  const [usKit, setUsKit] = useState<KitKey>('home');
  const [themKit, setThemKit] = useState<KitKey>('road');
  const [me, setMe] = useState('Jordan Vale');
  const [num, setNum] = useState(23);
  const [rival, setRival] = useState('Marcus Brown');
  const [playId, setPlayId] = useState('dunk');
  const [ball, setBall] = useState<Side>('us');
  const [tag, setTag] = useState<DramaTag>('');
  const [mine, setMine] = useState(true);
  const [spd, setSpd] = useState(1);
  const [loop, setLoop] = useState(false);
  const [take, setTake] = useState(0);
  // a whole final, one play after another
  const [reel, setReel] = useState<{ plays: DramaPlay[]; i: number; us: number; them: number; start: { us: number; them: number } } | null>(null);

  speed = spd;
  const us = useMemo(() => camSide(usAbbr, usKit), [usAbbr, usKit]);
  const them = useMemo(() => camSide(themAbbr, themKit), [themAbbr, themKit]);
  const usTeam = NBA_TEAMS.find((t) => t.abbr === usAbbr)!;
  const def = PLAYS.find((p) => p.id === playId)!;
  const single = useMemo(() => makePlay(def, ball, tag, mine, me, rival, usTeam.abbr), [def, ball, tag, mine, me, rival, usTeam.abbr]);
  const replay = useCallback(() => setTake((t) => t + 1), []);

  // loop: play it again after each run
  useEffect(() => {
    if (!loop || reel) return;
    const t = window.setTimeout(replay, 2100);
    return () => clearTimeout(t);
  }, [loop, take, reel, replay]);

  // the full final steps every 1.7 s (the game's pace)
  useEffect(() => {
    if (!reel || reel.i >= reel.plays.length) return;
    const t = window.setTimeout(() => setReel((r) => r && { ...r, i: r.i + 1 }), reel.i < 0 ? 600 : 1700);
    return () => clearTimeout(t);
  }, [reel]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        replay();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [replay]);

  const startFinal = (margin: number) => {
    const win = Math.random() < 0.6;
    const base = 96 + Math.floor(Math.random() * 14);
    const g = win ? { us: base + margin, them: base } : { us: base, them: base + margin };
    const d = buildDrama(g, { me, mates: ['Chris Ross', 'Dee Hart', 'Sam Okoro', 'Tyler Lin'], opps: [rival, 'Jay Smith', 'Kofi Mensah', 'Luis Reyes', 'Ben Cole'], us: usAbbr, them: themAbbr }, (Math.random() * 2 ** 31) >>> 0);
    setReel({ plays: d.plays, i: -1, us: g.us, them: g.them, start: d.start });
  };

  const cur = reel && reel.i >= 0 ? reel.plays[Math.min(reel.i, reel.plays.length - 1)] : null;
  const reelDone = !!reel && reel.i >= reel.plays.length;
  const shown = reel ? reel.plays.slice(0, Math.max(0, reel.i + 1)) : [];
  const sc = reel ? { us: reel.start.us + shown.filter((p) => p.side === 'us').reduce((a, p) => a + p.pts, 0), them: reel.start.them + shown.filter((p) => p.side === 'them').reduce((a, p) => a + p.pts, 0) } : null;

  const teamOpts = NBA_TEAMS.map((t) => (
    <option key={t.abbr} value={t.abbr}>
      {t.city} {t.nick}
    </option>
  ));
  const kitOpts = (['home', 'road', 'city'] as KitKey[]).map((k) => (
    <option key={k} value={k}>
      {k}
    </option>
  ));
  const scoring = def.pts > 0;

  return (
    <main className="cl">
      <header>
        <div className="kicker on-dark">Bench to Rafters · dev deck</div>
        <h1>Action cam lab</h1>
        <p className="on-dark">Pick a play and watch it on the cam. Space (or Replay) plays it again; slow it down to see every frame.</p>
      </header>

      <section className="cl-stage">
        {reel ? (
          <>
            <div className="cl-board">
              <b>{usAbbr}</b>
              <span>{reelDone ? reel.us : sc!.us}</span>
              <small>{reelDone ? 'Final' : cur ? `Q4 ${cur.clock}` : 'Q4'}</small>
              <span>{reelDone ? reel.them : sc!.them}</span>
              <b>{themAbbr}</b>
            </div>
            {!reelDone && <ActionCam key={`reel-${reel.i}`} play={cur} us={us} them={them} winner={reel.us > reel.them ? 'us' : 'them'} me={{ name: me, number: num }} />}
            <ol className="cl-feed">
              {shown
                .slice()
                .reverse()
                .map((p, k) => (
                  <li key={`${p.clock}-${p.text}`} className={k === 0 && !reelDone ? 'fresh' : ''}>
                    <span>{p.clock}</span> {p.text} {p.pts > 0 && <b>+{p.pts}</b>}
                  </li>
                ))}
            </ol>
            <div className="cl-row">
              <button className="btn" onClick={() => setReel(null)}>
                Back to single plays
              </button>
            </div>
          </>
        ) : (
          <>
            <ActionCam key={`one-${take}-${playId}-${ball}-${tag}-${mine}-${usAbbr}-${themAbbr}-${usKit}-${themKit}`} play={single.play} us={us} them={them} winner={single.winner} me={{ name: me, number: num }} />
            <div className="cl-caption">
              <span>{single.play.text}</span>
              <button className="btn" onClick={replay}>
                Replay
              </button>
            </div>
          </>
        )}
      </section>

      {!reel && (
        <section className="cl-panel">
          <h2>Play</h2>
          <div className="cl-chips">
            {PLAYS.map((p) => (
              <button key={p.id} className={`chip${p.id === playId ? ' on' : ''}`} onClick={() => setPlayId(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="cl-grid">
            <label>
              {def.id === 'block' || def.id === 'steal' ? 'Who has the ball (the other side makes the stop)' : def.id === 'run' ? 'Whose run' : 'Who has the ball'}
              <select value={ball} onChange={(e) => setBall(e.target.value as Side)} disabled={def.id === 'miss'}>
                <option value="us">Your team</option>
                <option value="them">The other team</option>
              </select>
            </label>
            <label>
              Moment (scoring plays)
              <select value={tag} onChange={(e) => setTag(e.target.value as DramaTag)} disabled={!scoring}>
                {TAGS.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> It is your player’s play
            </label>
            <label className="check">
              <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop
            </label>
          </div>
        </section>
      )}

      <section className="cl-panel">
        <h2>Speed</h2>
        <div className="cl-chips">
          {SPEEDS.map((s) => (
            <button key={s} className={`chip${s === spd ? ' on' : ''}`} onClick={() => setSpd(s)}>
              {s === 1 ? 'Game speed' : `${s}x`}
            </button>
          ))}
        </div>
        <h2>Teams</h2>
        <div className="cl-grid">
          <label>
            Your team
            <select value={usAbbr} onChange={(e) => setUs(e.target.value)}>
              {teamOpts}
            </select>
          </label>
          <label>
            Its kit
            <select value={usKit} onChange={(e) => setUsKit(e.target.value as KitKey)}>
              {kitOpts}
            </select>
          </label>
          <label>
            The other team
            <select value={themAbbr} onChange={(e) => setThem(e.target.value)}>
              {teamOpts}
            </select>
          </label>
          <label>
            Its kit
            <select value={themKit} onChange={(e) => setThemKit(e.target.value as KitKey)}>
              {kitOpts}
            </select>
          </label>
          <label>
            Your player
            <input value={me} onChange={(e) => setMe(e.target.value)} />
          </label>
          <label>
            His number
            <input type="number" min={0} max={99} value={num} onChange={(e) => setNum(Math.max(0, Math.min(99, Number(e.target.value) || 0)))} />
          </label>
          <label>
            Their star
            <input value={rival} onChange={(e) => setRival(e.target.value)} />
          </label>
        </div>
        <h2>A whole final</h2>
        <p className="on-dark small">The last minutes of a made-up final, play by play at the game’s pace, the way the finals reel tells it.</p>
        <div className="cl-chips">
          <button className="chip" onClick={() => startFinal(2)}>
            Close game
          </button>
          <button className="chip" onClick={() => startFinal(7)}>
            Comeback falls short
          </button>
          <button className="chip" onClick={() => startFinal(16)}>
            Blowout
          </button>
        </div>
      </section>
    </main>
  );
}
