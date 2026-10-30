import { Icon } from '../art/Icon';
import { ICON_FOR, archetypeIcon } from '../art/icons';
import { useState } from 'react';
import { ARCHETYPES } from '../../engine/player/archetypes';
import { rerollAttrs } from '../../engine/player/create';
import { makeRng } from '../../engine/rng';
import { ATTRS, DIFFICULTIES, HEIGHT_RANGE, MODES, POSITIONS, type Mode } from '../../engine/balance';
import type { AttrKey, Attrs, Pos } from '../../engine/types';
import { NAMES, UI } from '../../content/strings';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { savedCareer, useStore } from '../../store';
import { ORIGINS } from '../../content/origins';
import { edgeOf } from '../../engine/career/nationality';
import { ht, seasonLabel } from '../format';
import { MiniGamesCard } from '../mini/MiniGames';
import { CareerLogCard } from './CareerLog';
import { GuideButton } from '../components/Guide';
import { AchievementsCard } from './Achievements';
import { CommunityCard, LiveStrip } from './Community';
import { FlagArt } from '../art/Flag';
import { POS_STYLE, PositionCard } from '../art/PositionCard';
import { HeroArt, archPose } from '../art/Hero';
import { hash } from '../art/color';
import { LineupArt } from '../art/Scene';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const uiRng = makeRng(Math.floor(Math.random() * 2 ** 31));

/** Countries shown as big buttons on the identity page; the rest are in a list. */
/** The kind of road each country's players take, in a few words. */
const ROAD: Record<string, string> = { us: 'High school, AAU, college', canada: 'Prep school, then the NCAA', euro: 'Club academy, pro at 16-18', academy: 'Academies and clubs', asia: 'School teams, then college or pro', aus: 'Centre of Excellence' };
const FEATURED = ['USA', 'Canada', 'France', 'Spain', 'Serbia', 'Australia', 'Japan', 'South Korea', 'China', 'Nigeria', 'Brazil', 'Philippines'];


function cards(pos: Pos): Attrs[] {
  return ARCHETYPES[pos].map((a) => ({ ...a.attrs }));
}

/** The new-career page. */
/** A career saved on this device: one tap picks it up (round 14). */
function ResumeCard() {
  const resume = useStore((s) => s.resume);
  const [save] = useState(savedCareer);
  const [failed, setFailed] = useState(false);
  if (!save) return null;
  return (
    <section className="card resume-card">
      <div style={{ minWidth: 0 }}>
        <div className="kicker">{save.retired ? 'Finished career' : 'Career in progress'}</div>
        <b className="resume-name">{save.name}</b>
        <div className="muted small">
          {seasonLabel(save.year)}
          {save.ovr ? ` · peak OVR ${save.ovr}` : ''}
        </div>
        {!save.retired && !failed && <div className="muted small">Starting a new career below replaces this one.</div>}
        {failed && <div className="small" style={{ color: 'var(--bad)' }}>That save could not be read. Start a new career below.</div>}
      </div>
      <button className="btn" onClick={() => setFailed(!resume())}>
        {save.retired ? 'Look back' : 'Continue'}
      </button>
    </section>
  );
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

  // round 16: random picks, shown as picked (the same one never comes up twice in a row)
  const [rolled, setRolled] = useState<{ pos?: boolean; hand?: boolean; arch?: boolean }>({});
  const other = <T,>(list: readonly T[], now: T): T => {
    const rest = list.filter((x) => x !== now);
    return rest[Math.floor(Math.random() * rest.length)];
  };
  const randomPos = () => {
    choosePos(other(POSITIONS, pos));
    setRolled((r) => ({ ...r, pos: true, arch: false }));
  };
  const randomHand = () => {
    setHand(Math.random() < 0.12 ? 'L' : 'R'); // about one player in eight is left-handed
    setRolled((r) => ({ ...r, hand: true }));
  };
  const randomArch = () => {
    setArch(other(ARCHETYPES[pos].map((_, i) => i), arch));
    setRolled((r) => ({ ...r, arch: true }));
  };
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
    setRolled({ pos: true, hand: true, arch: true });
    const shuffled = [...ATTRS].sort(() => Math.random() - 0.5);
    setFocus(shuffled.slice(0, 2));
  };
  const toggleFocus = (k: AttrKey) =>
    setFocus((f) => (f.includes(k) ? f.filter((x) => x !== k) : f.length >= 2 ? [f[1], k] : [...f, k]));

  const attrs = cands[arch];
  const archetype = ARCHETYPES[pos][arch];
  const [hMin, hMax] = HEIGHT_RANGE[pos];
  const canNext = step === 1 ? name.trim().length > 0 : step === 3 ? focus.length === 2 : true;
  const steps = UI.create.steps;

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
        <div className="row" style={{ gap: 8 }}>
          <GuideButton />
          <button className="icon-btn" data-tour="random" onClick={randomAll}>
            {UI.create.random}
          </button>
        </div>
      </header>
      <LiveStrip />
      <ResumeCard />
      <section className="hero with-lineup">
        <LineupArt />
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
        {steps.map((s, i) => (
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
            {DIFFICULTIES.map((m) => (
              <button key={m} className={`choice mode-card${mode === m ? ' selected' : ''}`} aria-pressed={mode === m} onClick={() => setMode(m)}>
                <span className="label with-icon">
                  <Icon name={ICON_FOR[m]} size={32} />
                  {MODES[m].name}
                </span>
                <small>{MODES[m].blurb}</small>
              </button>
            ))}
          </div>
          <p className="muted small">The league is the same at every difficulty. What changes is your potential, how fast you grow and how often you get hurt. Want it quicker? Flip the Fast break switch inside the game, any time.</p>
          <div className="start-cards">
            <MiniGamesCard />
            <CareerLogCard />
            <AchievementsCard />
            <CommunityCard />
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="stack identity">
          <div className="card stack">
            <div className="sec-title">Who are you?</div>
            <div className="id-row">
              <div className="field">
                <label htmlFor="f-name">{UI.create.name}</label>
                <input id="f-name" type="text" maxLength={28} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field id-num">
                <label htmlFor="f-num">{UI.create.number}</label>
                <input id="f-num" type="number" min={0} max={99} value={number} onChange={(e) => setNumber(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card stack nation-card">
            <div className="sec-title">Where do you start?</div>
            <p className="small muted">Your country sets your road until college or the pros: the youth system, the showcases, and who calls first.</p>
            <div className="nation-grid">
              <button className={`nation${country === '' ? ' on' : ''}`} aria-pressed={country === ''} onClick={() => setCountry('')}>
                <b>Surprise me</b>
                <small>By real-world odds</small>
              </button>
              {FEATURED.map((c) => (
                <button key={c} className={`nation${country === c ? ' on' : ''}`} aria-pressed={country === c} onClick={() => setCountry(c)}>
                  <FlagArt country={c} size={36} />
                  <b>{c === 'USA' ? 'United States' : c}</b>
                  <small>{ROAD[ORIGINS.find((o) => o.country === c)?.path ?? 'us']}</small>
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="f-country">More countries</label>
              <select id="f-country" value={FEATURED.includes(country) ? '' : country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Choose…</option>
                {[...ORIGINS]
                  .filter((o) => !FEATURED.includes(o.country))
                  .sort((a, b) => a.country.localeCompare(b.country))
                  .map((o) => (
                    <option key={o.country} value={o.country}>
                      {o.country}
                    </option>
                  ))}
              </select>
            </div>
            <div className="nation-notes">
              <div className="kicker with-flag">
                {country && <FlagArt country={country} size={30} />}
                {country ? `Your road from ${country === 'USA' ? 'the United States' : country}` : 'Your road'}
              </div>
              {country ? (
                <ul>
                  {edgeOf(country).notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              ) : (
                <p className="small">Half of all careers start in the United States; the rest begin in academies and clubs around the world.</p>
              )}
            </div>
          </div>

          <div className="card stack">
            <div className="sec-title">On the court</div>
            <fieldset>
              <legend>{UI.create.position}</legend>
              <div className="pos-cards">
                {POSITIONS.map((p, i) => (
                  <PositionCard
                    key={p}
                    pos={p}
                    name={p}
                    full={NAMES.pos[p]}
                    height={`${ht(HEIGHT_RANGE[p][0])}–${ht(HEIGHT_RANGE[p][1])}`}
                    on={p === pos}
                    scale={1 + i * 0.07}
                    onPick={() => {
                      choosePos(p);
                      setRolled((r) => ({ ...r, pos: false, arch: false }));
                    }}
                  />
                ))}
              </div>
              <div className="seg">
                <button className="seg-random" onClick={randomPos} title="Pick a position at random">
                  Random position
                </button>
              </div>
              <p className="muted small">
                {NAMES.pos[pos]} · grows to {ht(hMin)}–{ht(hMax)}
                {rolled.pos && <span className="rolled"> · picked at random</span>}
              </p>
            </fieldset>
            <fieldset>
              <legend>Dominant hand</legend>
              <div className="seg">
                <button
                  aria-pressed={hand === 'R'}
                  onClick={() => {
                    setHand('R');
                    setRolled((r) => ({ ...r, hand: false }));
                  }}
                >
                  Right
                </button>
                <button
                  aria-pressed={hand === 'L'}
                  onClick={() => {
                    setHand('L');
                    setRolled((r) => ({ ...r, hand: false }));
                  }}
                >
                  Left
                </button>
                <button className="seg-random" onClick={randomHand} title="Real-world odds: about one in eight is left-handed">
                  Random
                </button>
              </div>
              <p className="muted small">
                {rolled.hand && <span className="rolled">Rolled: {hand === 'L' ? 'left' : 'right'}-handed (about one player in eight is a lefty). </span>}
                Lefties are rarer, so defenders see them less. Either way, your weak hand starts raw.
              </p>
            </fieldset>
            <div className="assigned">
              <div className="kicker">{UI.create.assignedTitle}</div>
              <div className="small">{UI.create.assignedText}</div>
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="stack">
          <div className="row">
            <div className="kicker">
              {NAMES.pos[pos]} · pick an archetype{rolled.arch && <span className="rolled"> · {ARCHETYPES[pos][arch].name} picked at random</span>}
            </div>
            <div className="spacer" />
            <button className="btn ghost small" onClick={randomArch}>
              Random
            </button>
            <button className="btn ghost small" onClick={reroll}>
              {UI.create.otherCandidates}
            </button>
          </div>
          <div className="arch-cards">
            {ARCHETYPES[pos].map((a, i) => (
              <button
                key={a.name}
                className="arch"
                aria-pressed={i === arch}
                onClick={() => {
                  setArch(i);
                  setRolled((r) => ({ ...r, arch: false }));
                }}
              >
                <span className="arch-stage" style={{ ['--pos' as string]: POS_STYLE[pos].color }}>
                  <span className="pos-player">
                    <HeroArt pose={archPose(a.name, pos)} model={a.name} number={(hash(a.name) % 54) + 1} kit={{ base: POS_STYLE[pos].color, ink: '#FFFFFF', trim: '#F4F4F4', word: '' }} size={132} />
                  </span>
                </span>
                <h3 className="with-icon">
                  <Icon name={archetypeIcon(a.name)} size={30} />
                  {a.name}
                </h3>
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
                <span className="label focus-label">
                  <Icon name={ICON_FOR[k]} size={26} />
                  <span>{NAMES.attr[k]}</span>
                  <b className="muted">{attrs[k]}</b>
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
          <button className="btn" data-tour="create-next" disabled={!canNext} onClick={() => setStep(step + 1)}>
            {UI.create.next}
          </button>
        ) : (
          <button className="btn" data-tour="create-start" onClick={begin}>
            {UI.create.start}
          </button>
        )}
      </div>
    </div>
  );
}
