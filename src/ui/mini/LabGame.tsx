// Built in a lab, the mini-game (engine/mini/labGame.ts): one screen a season.

import { useState } from 'react';
import { keyRatings, LAB_GAME, labBuy, labGrade, labOvr, labPlaySeason, labSpreadSpend, newLabGame, type LabGameState } from '../../engine/mini/labGame';
import { labCost } from '../../engine/career/lab';
import { ATTRS, HEIGHT_RANGE } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import { Icon } from '../art/Icon';
import { ICON_FOR } from '../art/icons';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import type { Pos } from '../../engine/types';
import { ht } from '../format';
import { MiniBonus } from './MiniBonus';
import { EvolutionArt } from '../art/Evolution';

/** The lab's kit: lab-coat white with a blue trim. */
const LAB_KIT = { base: '#1C7ED6', ink: '#FFFFFF', trim: '#F4F4F4', word: 'LAB' };

const POSITIONS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export function LabGame() {
  const [st, setSt] = useState<LabGameState | null>(null);
  const [name, setName] = useState(() => `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`);
  const [pos, setPos] = useState<Pos>('SF');
  const [height, setHeight] = useState(79);
  const act = (fn: (s: LabGameState) => void) => {
    if (!st) return;
    const n = structuredClone(st);
    fn(n);
    setSt(n);
  };

  if (!st) {
    const [lo, hi] = HEIGHT_RANGE[pos];
    return (
      <section className="stack">
        <div className="kicker">Built in a lab</div>
        <h2 className="title">Design a player</h2>
        <p className="small muted">Ten seasons, one screen each: spend the summer's credits on ratings, then play the season and see what he becomes.</p>
        <section className="card stack">
          <div className="field">
            <label htmlFor="lab-name">Name</label>
            <input id="lab-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
          </div>
          <div className="seg">
            {POSITIONS.map((p) => (
              <button
                key={p}
                aria-pressed={p === pos}
                onClick={() => {
                  setPos(p);
                  setHeight(Math.round((HEIGHT_RANGE[p][0] + HEIGHT_RANGE[p][1]) / 2));
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="ht-val">{ht(height)}</div>
          <input type="range" min={lo - 2} max={hi + 2} step={1} value={height} onChange={(e) => setHeight(Number(e.target.value))} aria-label="Height" />
          <p className="small muted">Taller: more rebounding and inside defense, less speed and playmaking.</p>
          <button className="btn" onClick={() => setSt(newLabGame(Math.floor(Math.random() * 1e9), name, pos, height))}>
            Start the experiment
          </button>
        </section>
      </section>
    );
  }

  const ovr = labOvr(st);
  const key = keyRatings(st.pos);
  const last = st.history[st.history.length - 1];
  if (st.over) {
    const g = labGrade(st);
    const shelf = st.history.flatMap((h) => h.awards).reduce<Record<string, number>>((m, a) => ({ ...m, [a]: (m[a] ?? 0) + 1 }), {});
    return (
      <section className="stack">
        <div className="kicker">Built in a lab · results</div>
        <section className="card stack lab-end">
          <div className="lab-grade">{g.letter}</div>
          <EvolutionArt ovr={st.peak} name={st.name} number={23} kit={LAB_KIT} size={170} />
          <h2 className="title">{st.name}</h2>
          <p className="small">
            Peak {Math.round(st.peak)} OVR · {g.text}
          </p>
          <p className="small">{Object.keys(shelf).length ? Object.entries(shelf).map(([a, n]) => (n > 1 ? `${n}× ${a}` : a)).join(' · ') : 'No awards.'}</p>
        </section>
        <section className="card stack">
          <div className="sec-title">Season by season</div>
          {st.history.map((h) => (
            <div key={h.age} className="labg-row">
              <b>{h.age}</b>
              <span>{h.ovr}</span>
              <span className="small">{h.line}</span>
              <span className="small muted">
                {h.record}
                {h.awards.length ? ` · ${h.awards.join(', ')}` : ''}
              </span>
            </div>
          ))}
        </section>
        <MiniBonus result={{ game: 'lab', peak: st.peak }} />
        <button className="btn ghost" onClick={() => setSt(null)}>
          Build another
        </button>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="kicker">
        Built in a lab · season {st.season + 1} of {LAB_GAME.seasons} · age {LAB_GAME.startAge + st.season}
      </div>
      <section className="card stack">
        <div className="lab-top">
          <div>
            <h2 className="title">{st.name}</h2>
            <span className="muted small">
              {st.pos} · {ht(st.height)}
            </span>
          </div>
          <div className="labg-ovr">
            <b>{Math.round(ovr)}</b>
            <span className="small muted">OVR</span>
          </div>
          <div className="labg-credits">
            <b>{st.credits.toFixed(1)}</b>
            <span className="small muted">credits</span>
          </div>
        </div>
        <EvolutionArt ovr={ovr} name={st.name} number={23} kit={LAB_KIT} size={170} />
        {last && (
          <p className="small lab-last">
            Last season: {last.line} · {last.record}
            {last.awards.length ? ` · ${last.awards.join(', ')}` : ''}
          </p>
        )}
        {st.twist && <p className="small lab-twist">{st.twist}</p>}
      </section>
      <section className="card stack">
        <div className="sec-title">Spend the summer</div>
        <p className="small muted">
          Each tap adds {LAB_GAME.step}; the price goes up from 80 and 90. Matters most at {st.pos}: {key.map((k) => NAMES.attr[k]).join(', ')}.
        </p>
        <div className="lab-attrs">
          {ATTRS.map((k) => {
            const c = labCost(st.attrs[k]);
            return (
              <div key={k} className={`lab-attr${key.includes(k) ? ' key' : ''}`}>
                <span className="with-icon">
                  <Icon name={ICON_FOR[k]} size={22} />
                  {NAMES.attr[k]}
                </span>
                <b>{st.attrs[k]}</b>
                <button className="icon-btn" disabled={st.credits + 1e-9 < c || st.attrs[k] >= 99} onClick={() => act((s) => void labBuy(s, k))} aria-label={`Add ${LAB_GAME.step} ${NAMES.attr[k]}`}>
                  {st.attrs[k] >= 99 ? (
                    'Max'
                  ) : (
                    <>
                      +{LAB_GAME.step} <span className="muted">({c})</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>
      {st.credits >= 1 && (
        <button className="btn ghost" onClick={() => act(labSpreadSpend)}>
          Spread it evenly
        </button>
      )}
      <button className="btn" onClick={() => act((s) => void labPlaySeason(s))}>
        {st.credits >= 1 ? `Play the season (${st.credits.toFixed(1)} credits carry over)` : 'Play the season'}
      </button>
    </section>
  );
}
