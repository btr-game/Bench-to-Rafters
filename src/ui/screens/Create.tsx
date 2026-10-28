import { useState } from 'react';
import { ARCHETYPES } from '../../engine/player/archetypes';
import { rerollAttrs } from '../../engine/player/create';
import { makeRng } from '../../engine/rng';
import { ATTRS, HEIGHT_RANGE, MODES, POSITIONS, type Mode } from '../../engine/balance';
import type { AttrKey, Attrs, Pos } from '../../engine/types';
import { NAMES, UI } from '../../content/strings';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { useStore } from '../../store';
import { ORIGINS } from '../../content/origins';
import { edgeOf } from '../../engine/career/nationality';
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
  const [hand, setHand] = useState<'R' | 'L'>('R');
  const [mode, setMode] = useState<Mode>('standard');
  const [country, setCountry] = useState(''); // '' = the game decides, by real-world odds

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
    setArch(Math.floor(Math.random() * ARCHETYPES[p].length));
    setHand(Math.random() < 0.12 ? 'L' : 'R');
    const shuffled = [...ATTRS].sort(() => Math.random() - 0.5);
    setFocus(shuffled.slice(0, 2));
  };
  const toggleFocus = (k: AttrKey) =>
    setFocus((f) => (f.includes(k) ? f.filter((x) => x !== k) : f.length >= 2 ? [f[1], k] : [...f, k]));

  const attrs = cands[arch];
  const archetype = ARCHETYPES[pos][arch];
  const [hMin, hMax] = HEIGHT_RANGE[pos];
  const canNext = step === 1 ? name.trim().length > 0 : step === 3 ? focus.length === 2 : true;

  const begin = () =>
    start({
      name: name.trim() || 'Rookie',
      number: Math.max(0, Math.min(99, Number(number) || 0)),
      pos,
      archetype: arch,
      attrs,
      focus,
      hand,
      mode,
      country: country || undefined,
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
          Start at 14, in an American high school or a club academy somewhere in the world. Find your road to the NBA through college, Europe or
          the G League, get drafted, and find out whether your jersey ends up hanging in the rafters.
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
        <section className="stack">
          <div className="kicker">Choose how hard the road is</div>
          <div className="modes">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button key={m} className={`choice mode-card${mode === m ? ' selected' : ''}`} aria-pressed={mode === m} onClick={() => setMode(m)}>
                <span className="label">{MODES[m].name}</span>
                <small>{MODES[m].blurb}</small>
              </button>
            ))}
          </div>
          <p className="muted small">The league is the same in every mode. What changes is your potential, how fast you grow and how often you get hurt.</p>
        </section>
      )}

      {step === 1 && (
        <section className="card form">
          <div className="field">
            <label htmlFor="f-name">{UI.create.name}</label>
            <input id="f-name" type="text" maxLength={28} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-num">{UI.create.number}</label>
            <input id="f-num" type="number" min={0} max={99} value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <fieldset>
            <legend>Dominant hand</legend>
            <div className="seg">
              <button aria-pressed={hand === 'R'} onClick={() => setHand('R')}>
                Right
              </button>
              <button aria-pressed={hand === 'L'} onClick={() => setHand('L')}>
                Left
              </button>
            </div>
            <p className="muted small">Lefties are rarer, so defenders see them less. Either way, your weak hand starts raw; you can train it later.</p>
          </fieldset>
          <div className="field">
            <label htmlFor="f-country">Nationality</label>
            <select id="f-country" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Let the game decide</option>
              {[...ORIGINS].sort((a, b) => a.country.localeCompare(b.country)).map((o) => (
                <option key={o.country} value={o.country}>
                  {o.country}
                </option>
              ))}
            </select>
            {country ? (
              <ul className="country-notes small">
                {edgeOf(country).notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Half of all careers start in the United States; the rest begin in academies and clubs around the world.</p>
            )}
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

      {step === 2 && (
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
                <h3>{a.name}</h3>
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

      {step === 3 && (
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

      {step === 4 && (
        <section className="card stack">
          <div className="row">
            <div style={{ minWidth: 0 }}>
              <div className="kicker">Freshman · age 14</div>
              <div className="pc-name">{name || 'Rookie'}</div>
              <div className="muted">
                #{number} · {NAMES.pos[pos]} · {archetype.name}
                {country ? ` · ${country}` : ''}
              </div>
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
            Focus: {focus.map((k) => NAMES.attr[k]).join(' and ')}. Height: still growing, most end up {ht(hMin + (archetype.height ?? 0))}–{ht(hMax + (archetype.height ?? 0))}, some well outside it. This card is a typical {archetype.name.toLowerCase()}; your real starting level is set at tryouts. {UI.create.assignedText}
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
        {step < 4 ? (
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
