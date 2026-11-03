// The finale (round 36), in place of Thank you for playing: what plays and for how long is decided
// in ui/finale.ts. The arena, the jersey and the title are pixel art; the act changes on a timer.
// The first time an ending plays on a device it can't be skipped; after that a Skip button jumps
// to the thank-you.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../../engine/types';
import { useStore } from '../../store';
import { PixelWord } from '../art/PixelText';
import { PlayerArt, kitFor } from '../art/Player';
import { JerseyArt } from '../art/Jersey';
import { AwardArt } from '../art/Award';
import { ShareButton } from '../components/Share';
import { sfx } from '../sound';
import { recordFinale } from '../achievements';
import { achievementsNow } from '../../store';
import { MAKERS, creditsOf, finaleKind, finaleSeen, markFinaleSeen, raftersTeam, speechOf, timeline, type Act } from '../finale';

const NIGHT = '#0A0E1C';

/** Rows of empty seats, the rafters' truss and the court, on a 160 by 90 grid; the house lights
 * come up in CSS. The team's colour runs along the stands and its banners hang in the rafters. */
function ArenaNight({ color, banners }: { color: string; banners: number }) {
  const seats = useMemo(() => {
    const out: [number, number][] = [];
    for (let r = 0; r < 9; r++) for (let x = 2 + (r % 2); x < 158; x += 3) if (Math.abs(x - 80) > 6 || r < 2) out.push([x, 27 + r * 3]);
    return out;
  }, []);
  const shown = Math.min(8, banners);
  return (
    <svg className="fn-arena" viewBox="0 0 160 90" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
      <rect width="160" height="90" fill={NIGHT} />
      {/* the truss */}
      <rect x="0" y="3" width="160" height="1" fill="#1F2742" />
      <rect x="0" y="8" width="160" height="1" fill="#1F2742" />
      {Array.from({ length: 32 }, (_, i) => (
        <rect key={i} x={i * 5 + (i % 2 ? 2 : 0)} y={4 + (i % 2) * 2} width="2" height="2" fill="#18203A" />
      ))}
      {/* the house lights, coming on one bank at a time */}
      {[24, 56, 104, 136].map((x, i) => (
        <rect key={x} className={`fn-bank b${i}`} x={x - 4} y="9" width="8" height="2" />
      ))}
      {/* his team's banners in the rafters */}
      {Array.from({ length: shown }, (_, i) => {
        const x = 8 + i * 9;
        return (
          <g key={i}>
            <rect x={x} y="10" width="7" height="9" fill={color} />
            <rect x={x + 1} y="19" width="2" height="1" fill={color} />
            <rect x={x + 4} y="19" width="2" height="1" fill={color} />
            <rect x={x + 2} y="12" width="3" height="3" fill="#F2C94C" />
          </g>
        );
      })}
      {/* the scoreboard over centre court, dark */}
      <rect x="72" y="10" width="16" height="9" fill="#121931" />
      <rect x="73" y="11" width="14" height="7" fill="#0C1226" />
      {/* the stands */}
      <rect x="0" y="25" width="160" height="2" fill={color} opacity="0.55" />
      <g className="fn-seats">
        {seats.map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="2" height="2" />
        ))}
      </g>
      <rect x="0" y="54" width="160" height="2" fill="#1A2140" />
      {/* the court, in planks */}
      {Array.from({ length: 17 }, (_, i) => (
        <rect key={i} x="0" y={56 + i * 2} width="160" height="2" fill={i % 2 ? '#5A3A20' : '#4E321B'} className="fn-plank" />
      ))}
      <rect x="0" y="56" width="160" height="1" fill="#C9B48A" opacity="0.6" />
      {/* the centre circle */}
      <g fill={color} opacity="0.8">
        <rect x="70" y="70" width="20" height="1" />
        <rect x="70" y="82" width="20" height="1" />
        <rect x="66" y="72" width="2" height="9" />
        <rect x="92" y="72" width="2" height="9" />
        <rect x="68" y="71" width="2" height="1" />
        <rect x="90" y="71" width="2" height="1" />
        <rect x="68" y="81" width="2" height="1" />
        <rect x="90" y="81" width="2" height="1" />
      </g>
      {/* one spotlight on him, stepped */}
      <g className="fn-spot">
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={78 - i * 1.5} y={10 + i * 6} width={4 + i * 3} height="6" />
        ))}
      </g>
    </svg>
  );
}

/** One line of the speech at a time, typed out. The whole line is there for a screen reader. */
function Speech({ lines, at }: { lines: string[]; at: number }) {
  const line = lines[Math.min(at, lines.length - 1)] ?? '';
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = window.setInterval(() => setN((k) => (k >= line.length ? k : k + 1)), 32);
    return () => window.clearInterval(id);
  }, [line]);
  return (
    <div className="fn-speech" role="status">
      <span className="sr-only">{line}</span>
      <span aria-hidden="true">
        {line.slice(0, n)}
        <i className="fn-caret" />
      </span>
    </div>
  );
}

function Roll({ g, secs }: { g: GameState; secs: number }) {
  const blocks = useMemo(() => creditsOf(g), [g]);
  // the honours as icons, once each, at the head of the roll
  const icons = useMemo(() => {
    const seen = new Map<string, string>();
    for (const a of g.awards) if (!seen.has(a.key)) seen.set(a.key, a.label);
    return [...seen].slice(0, 10);
  }, [g]);
  return (
    <div className="fn-roll" aria-label="Credits">
      <div className="fn-roll-in" data-roll style={{ animationDuration: `${secs}s` }}>
        {icons.length > 0 && (
          <div className="fn-icons" aria-hidden="true">
            {icons.map(([key, label]) => (
              <AwardArt key={key} akey={key} label={label} size={40} />
            ))}
          </div>
        )}
        {blocks.map((b) => (
          <section key={b.head} className="fn-block">
            <h3>{b.head}</h3>
            {b.rows.map((r, i) => (
              <p key={i}>{r}</p>
            ))}
          </section>
        ))}
        <section className="fn-block fn-makers">
          {MAKERS.map((m) => (
            <div key={m.role}>
              <h3>{m.role}</h3>
              <p className="fn-maker">{m.name}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export function Finale({ g, from }: { g: GameState; from?: Act }) {
  const end = useStore((s) => s.endFinale);
  const kind = finaleKind(g) ?? 'credits';
  const plan = useMemo(() => timeline(g, kind), [g, kind]);
  const lines = useMemo(() => speechOf(g), [g]);
  // decided once, when it starts: the first time through it plays to the end
  const [skippable] = useState(() => finaleSeen(kind));
  // fast break skips an ending already seen on this device, straight to the thank-you
  const [i, setI] = useState(() => (!from && skippable && (g.flags.fast || g.flags.sim) ? plan.length - 1 : Math.max(0, plan.findIndex((x) => x.act === from))));
  const [line, setLine] = useState(0);
  const act = plan[i]?.act ?? 'thanks';
  const team = raftersTeam(g);
  const p = g.player;
  const thanksBtn = useRef<HTMLButtonElement>(null);
  // for the finale's achievements: whether it was skipped to the end (or opened past its start)
  const skipped = useRef(!!from || i > 0);

  useEffect(() => {
    const secs = plan[i]?.secs ?? 0;
    if (!secs) {
      markFinaleSeen(kind);
      if (recordFinale(g, kind, { skippable, skipped: skipped.current })) achievementsNow();
      thanksBtn.current?.focus();
      return;
    }
    const t = window.setTimeout(() => setI((k) => Math.min(plan.length - 1, k + 1)), secs * 1000);
    return () => window.clearTimeout(t);
  }, [i, plan, kind, g, skippable]);

  // the music follows the act (tracks.ts), and each act has its sounds: the house lights coming
  // up bank by bank, the jersey going up and reaching the rafters, the title, the thank-you
  useEffect(() => {
    useStore.setState((s) => (s.finale && s.finale.act !== act ? { finale: { ...s.finale, act } } : {}));
    const at: [number, Parameters<typeof sfx>[0]][] = act === 'arena' ? [800, 1600, 2400, 3200].map((ms) => [ms, 'tick']) : act === 'jersey' ? [[1000, 'rise'], [10000, 'boom']] : act === 'title' ? [[200, 'reveal']] : act === 'thanks' ? [[100, 'chime']] : [];
    const ids = at.map(([ms, name]) => window.setTimeout(() => sfx(name), ms));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [act]);

  // the speech: a line every few seconds
  useEffect(() => {
    if (act !== 'speech') return;
    setLine(0);
    const id = window.setInterval(() => setLine((k) => k + 1), 5500);
    return () => window.clearInterval(id);
  }, [act]);

  const skip = () => {
    skipped.current = true;
    setI(plan.length - 1);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key !== 'Enter' && e.key !== 'Escape') return;
      if (act === 'thanks') end();
      else if (skippable) skip();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const color = team?.color ?? '#C8102E';
  const ceremony = act === 'arena' || act === 'speech' || act === 'jersey';
  const kit = team ? kitFor(team.name, team.id, team.color, 'home', 'NBA') : null;
  return (
    <main className={`finale act-${act}`}>
      {ceremony && (
        <div className="fn-stage">
          <ArenaNight color={color} banners={team?.titles ?? 0} />
          {act === 'jersey' && kit && (
            <div className="fn-rise">
              <span className="fn-rope" />
              <JerseyArt kit={kit} number={p.number} size={150} label={`${team!.name} jersey, number ${p.number}`} back={p.name.split(' ').slice(-1)[0].toUpperCase()} />
            </div>
          )}
          <div className="fn-him">
            <PlayerArt name={p.name} number={p.number} pos={p.pos} color={team?.color} team={team?.name} abbr={team?.id} league="NBA" size={170} noBall wear={p.wardrobe?.on} />
          </div>
          {act === 'arena' && (
            <div className="fn-caption">
              <span>{team?.name}</span>
              <b>{p.name} · #{p.number}</b>
            </div>
          )}
          {act === 'speech' && <Speech lines={lines} at={line} />}
          {act === 'jersey' && team && (
            <div className="fn-caption fn-late">
              <span>
                {team.first}–{team.last}
              </span>
              <b>
                #{p.number} · {p.name}
              </b>
            </div>
          )}
        </div>
      )}
      {act === 'roll' && <Roll g={g} secs={plan[i].secs} />}
      {act === 'title' && (
        <div className="fn-title" aria-label="Bench to Rafters">
          <PixelWord text="BENCH TO" color="#F4F1EA" shade="#1B1820" className="fn-word" />
          <PixelWord text="RAFTERS" color="#FFD43B" shade="#5A4206" className="fn-word big" />
        </div>
      )}
      {act === 'thanks' && (
        <div className="fn-thanks">
          <PixelWord text="THANK YOU" color="#F4F1EA" shade="#1B1820" className="fn-word" />
          <p className="fn-line">for playing, and for every season of {p.name}.</p>
          <div className="fn-go">
            <button ref={thanksBtn} className="btn intro-go" onClick={end}>
              Play again
            </button>
            <ShareButton look="big" />
          </div>
        </div>
      )}
      {skippable && act !== 'thanks' && (
        <button className="btn ghost-dark fn-skip" onClick={skip}>
          Skip
        </button>
      )}
    </main>
  );
}
