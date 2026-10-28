import { useMemo, useState } from 'react';
import { ARCHETYPES } from '../../engine/player/archetypes';
import { ovrOf } from '../../engine/player/ovr';
import { rerollAttrs } from '../../engine/player/create';
import { makeRng } from '../../engine/rng';
import { ATTRS, HEIGHT_RANGE, POSITIONS } from '../../engine/balance';
import type { AttrKey, Attrs, Pos } from '../../engine/types';
import { NAMES, UI } from '../../content/strings';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { useStore } from '../../store';
import { ht } from '../format';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const uiRng = makeRng(Math.floor(Math.random() * 2 ** 31));

function cards(pos: Pos): Attrs[] {
  return ARCHETYPES[pos].map((a) => ({ ...a.attrs }));
}

export function Create() {
  const start = useStore((s) => s.start);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(`${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`);
  const [number, setNumber] = useState(String(Math.floor(Math.random() * 35)));
  const [pos, setPos] = useState<Pos>('SG');
  const [arch, setArch] = useState(0);
  const [cands, setCands] = useState<Attrs[]>(() => cards('SG'));
  const [focus, setFocus] = useState<AttrKey[]>([]);

  const choosePos = (p: Pos) => {
    setPos(p);
    setCands(cards(p));
    setArch(0);
    setFocus([]);
  };
  const reroll = () => setCands(ARCHETYPES[pos].map((a) => rerollAttrs(uiRng, a.attrs)));
  const randomAll = () => {
    const p = pick(POSITIONS);
    setName(`${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`);
    setNumber(String(Math.floor(Math.random() * 35)));
    setPos(p);
    setCands(cards(p));
    setArch(Math.floor(Math.random() * 3));
    const shuffled = [...ATTRS].sort(() => Math.random() - 0.5);
    setFocus(shuffled.slice(0, 2));
  };
  const toggleFocus = (k: AttrKey) =>
    setFocus((f) => (f.includes(k) ? f.filter((x) => x !== k) : f.length >= 2 ? [f[1], k] : [...f, k]));

  const attrs = cands[arch];
  const startOvr = useMemo(() => ovrOf(attrs, pos), [attrs, pos]);
  const archetype = ARCHETYPES[pos][arch];
  const [hMin, hMax] = HEIGHT_RANGE[pos];
  const canNext = step === 0 ? name.trim().length > 0 : step === 2 ? focus.length === 2 : true;

  const begin = () =>
    start({
      name: name.trim() || 'Rookie',
      number: Math.max(0, Math.min(99, Number(number) || 0)),
      pos,
      archetype: arch,
      attrs,
      focus,
    });

  return (
    <div className="wrap no-tabs">
      <header className="top">
        <div className="brand">
          Bench to <span>Rafters</span>
        </div>
        <button className="icon-btn" onClick={randomAll}>
          {UI.create.random}
        </button>
      </header>
      <section className="hero">
        <div className="kicker">A basketball career game</div>
        <h1>
          Bench<span>to Rafters</span>
        </h1>
        <p className="lede">
          Start as a 14-year-old freshman fighting for JV minutes. Choose college, the G League or Europe after senior year, get drafted, and find
          out whether your jersey ends up hanging in the rafters.
        </p>
      </section>
      <div className="stepper" aria-label="Steps">
        {UI.create.steps.map((s, i) => (
          <span key={s} className={i === step ? 'on' : ''} aria-current={i === step ? 'step' : undefined}>
            {i + 1}. {s}
          </span>
        ))}
      </div>
      <div style={{ height: 12 }} />

      {step === 0 && (
        <section className="card form">
          <div className="field">
            <label htmlFor="f-name">{UI.create.name}</label>
            <input id="f-name" type="text" maxLength={28} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-num">{UI.create.number}</label>
            <input id="f-num" type="number" min={0} max={99} value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div className="assigned">
            <div className="kicker">{UI.create.assignedTitle}</div>
            <div className="small">{UI.create.assignedText}</div>
          </div>
          <fieldset>
            <legend>{UI.create.position}</legend>
            <div className="seg">
              {POSITIONS.map((p) => (
                <button key={p} aria-pressed={p === pos} onClick={() => choosePos(p)} title={NAMES.pos[p]}>
                  {p}
                </button>
              ))}
            </div>
            <p className="muted small">
              {NAMES.pos[pos]} · grows to {ht(hMin)}–{ht(hMax)}
            </p>
          </fieldset>
        </section>
      )}

      {step === 1 && (
        <section className="stack">
          <div className="row">
            <div className="kicker">{NAMES.pos[pos]} · pick an archetype</div>
            <div className="spacer" />
            <button className="btn ghost small" onClick={reroll}>
              {UI.create.otherCandidates}
            </button>
          </div>
          <div className="arch-cards">
            {ARCHETYPES[pos].map((a, i) => (
              <button key={a.name} className="arch" aria-pressed={i === arch} onClick={() => setArch(i)}>
                <div className="row">
                  <h3>{a.name}</h3>
                  <div className="spacer" />
                  <span className="kicker">OVR {ovrOf(cands[i], pos).toFixed(1)}</span>
                </div>
                <div className="muted small">{a.blurb}</div>
                <div className="mini-attrs">
                  {ATTRS.map((k) => (
                    <span key={k}>
                      {k} <b>{cands[i][k]}</b>
                    </span>
                  ))}
                </div>
                <div className="muted small">Range {a.range}</div>
              </button>
            ))}
          </div>
          <p className="muted small">{UI.create.equalNote}</p>
        </section>
      )}

      {step === 2 && (
        <section className="card stack">
          <div className="sec-title">Focus stats</div>
          <p className="muted small">{UI.create.focusHelp}</p>
          <div className="focus-grid">
            {ATTRS.map((k) => (
              <button key={k} className={`choice${focus.includes(k) ? ' selected' : ''}`} aria-pressed={focus.includes(k)} onClick={() => toggleFocus(k)}>
                <span className="label">
                  {NAMES.attr[k]} <span className="muted">{attrs[k]}</span>
                </span>
                <small>{NAMES.attrBlurb[k]}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card stack">
          <div className="row">
            <div style={{ minWidth: 0 }}>
              <div className="kicker">Freshman · age 14</div>
              <div className="pc-name">{name || 'Rookie'}</div>
              <div className="muted">
                #{number} · {NAMES.pos[pos]} · {archetype.name}
              </div>
            </div>
            <div className="spacer" />
            <div className="ovr">
              <b>{Math.round(startOvr)}</b>
              <small>OVR</small>
            </div>
          </div>
          <div className="board">
            {ATTRS.map((k) => (
              <div className="cell" key={k}>
                <div className="k">
                  {k}
                  {focus.includes(k) ? ' ●' : ''}
                </div>
                <div className="v">{attrs[k]}</div>
              </div>
            ))}
          </div>
          <p className="muted small">
            Focus: {focus.map((k) => NAMES.attr[k]).join(' and ')}. Height: still growing, will end up {ht(hMin)}–{ht(hMax)}. {UI.create.assignedText}
          </p>
        </section>
      )}

      <div style={{ height: 14 }} />
      <div className="row-end">
        {step > 0 && (
          <button className="btn ghost" onClick={() => setStep(step - 1)}>
            {UI.create.back}
          </button>
        )}
        {step < 3 ? (
          <button className="btn" disabled={!canNext} onClick={() => setStep(step + 1)}>
            {UI.create.next}
          </button>
        ) : (
          <button className="btn" onClick={begin}>
            {UI.create.start}
          </button>
        )}
      </div>
    </div>
  );
}
