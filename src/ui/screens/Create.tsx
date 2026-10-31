import { Icon } from '../art/Icon';
import { ICON_FOR, archetypeIcon } from '../art/icons';
import { useLayoutEffect, useRef, useState } from 'react';
import { ARCHETYPES } from '../../engine/player/archetypes';
import { rerollAttrs } from '../../engine/player/create';
import { makeRng } from '../../engine/rng';
import { ATTRS, DIFFICULTIES, HEIGHT_RANGE, MODES, POSITIONS, type Mode } from '../../engine/balance';
import type { AttrKey, Attrs, Pos } from '../../engine/types';
import { NAMES, UI } from '../../content/strings';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { useStore } from '../../store';
import { MAX_SLOTS, deleteSlot, exportCode, listSlots, readSlot } from '../saves';
import { ORIGINS } from '../../content/origins';
import { edgeOf } from '../../engine/career/nationality';
import { ht, seasonLabel } from '../format';
import { MiniGamesCard } from '../mini/MiniGames';
import { CareerLogCard } from './CareerLog';
import { SettingsMenu } from '../components/Settings';
import { WhatsNewButton, WhatsNewPanel } from '../components/WhatsNew';
import { ShareButton } from '../components/Share';
import { GuideButton } from '../components/Guide';
import { AchievementsCard } from './Achievements';
import { CommunityCard, LiveStrip } from './Community';
import { FlagArt } from '../art/Flag';
import { POS_STYLE, PositionCard } from '../art/PositionCard';
import { HeroArt, archPose } from '../art/Hero';
import { hash } from '../art/color';
import { LineupArt } from '../art/Scene';
import { LookPicker, LookPreview, PLAIN, randomLook, type Jersey } from '../components/LookPicker';
import { JerseyArt } from '../art/Jersey';
import type { ChosenLook } from '../../content/looks';
import { enterDev } from '../../dev/mode';
import { sfx } from '../sound';

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
/** The careers saved on this device (round 14; round 25: ten slots, with codes to move one). */
function SavesCard() {
  const resume = useStore((s) => s.resume);
  const importCareer = useStore((s) => s.importCareer);
  const [slots, setSlots] = useState(listSlots);
  const [failed, setFailed] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [code, setCode] = useState<{ id: string; text: string } | null>(null);
  const [paste, setPaste] = useState('');
  const [bad, setBad] = useState(false);
  const share = async (id: string) => {
    const g = await readSlot(id);
    if (!g) return setFailed(id);
    const text = await exportCode(g);
    setCode({ id, text });
    navigator.clipboard?.writeText(text).catch(() => undefined);
  };
  const remove = (id: string) => {
    deleteSlot(id);
    setSlots(listSlots());
    setSure(null);
  };
  return (
    <section className="card stack saves-card" data-tour="saves">
      <div className="row">
        <div>
          <div className="kicker">Saved on this device · {slots.length} of {MAX_SLOTS}</div>
          <h2 className="title">Your careers</h2>
        </div>
      </div>
      {slots.length === 0 && <p className="small muted keep">No careers saved yet. Every career is saved here after each move.</p>}
      {slots.map((x) => (
        <div key={x.id} className="save-row">
          <div style={{ minWidth: 0 }}>
            <b className="resume-name">{x.name}</b>
            <div className="muted small">
              {x.retired ? 'Finished' : 'In progress'} · {seasonLabel(x.year)}
              {x.ovr ? ` · peak OVR ${x.ovr}` : ''} · {MODES[x.mode as Mode]?.name ?? x.mode}
            </div>
            {failed === x.id && <div className="small" style={{ color: 'var(--bad)' }}>That save could not be read.</div>}
          </div>
          <div className="row save-actions">
            <button className="btn" onClick={() => void resume(x.id).then((ok) => !ok && setFailed(x.id))}>
              {x.retired ? 'Look back' : 'Continue'}
            </button>
            <button className="btn ghost small" onClick={() => void share(x.id)}>
              Code
            </button>
            {sure === x.id ? (
              <button className="btn ghost small danger" onClick={() => remove(x.id)}>
                Delete for good
              </button>
            ) : (
              <button className="btn ghost small" onClick={() => setSure(x.id)}>
                Delete
              </button>
            )}
          </div>
          {code?.id === x.id && (
            <div className="stack" style={{ gap: 4, gridColumn: '1 / -1' }}>
              <span className="small muted">This code is the whole career. Copied if your browser allows it; otherwise select it and copy. Paste it into another browser's import box below.</span>
              <textarea className="save-code" readOnly value={code.text} rows={3} onFocus={(e) => e.currentTarget.select()} />
            </div>
          )}
        </div>
      ))}
      {slots.length >= MAX_SLOTS && <p className="small muted keep">All {MAX_SLOTS} slots are in use: a new career replaces the oldest ({slots[slots.length - 1].name}).</p>}
      <details className="save-import">
        <summary>Import a career from a code</summary>
        <textarea className="save-code" rows={3} value={paste} placeholder="BTR1..." onChange={(e) => (setPaste(e.target.value), setBad(false))} />
        <button className="btn small" disabled={!paste.trim()} onClick={() => void importCareer(paste).then((ok) => setBad(!ok))}>
          Import and play
        </button>
        {bad && <span className="small" style={{ color: 'var(--bad)' }}>That code could not be read. Check that it was copied whole.</span>}
      </details>
    </section>
  );
}

/** Round 25 (owner): the dev deck, inside the game, behind a password, at the foot of the start page. */
function DevGate() {
  const [pw, setPw] = useState('');
  const [wrong, setWrong] = useState(false);
  // round 26 (owner: the link was too small to notice): a small card of its own
  return (
    <section className="card dev-gate" aria-label="Developer">
      <Icon name="cards" size={40} />
      <div className="stack" style={{ gap: 6 }}>
        <div className="sec-title">Developer</div>
        <p className="small muted">The dev deck: every function, the catalog, the sounds and the feedback inbox. Needs the password.</p>
        <form
          className="row"
          style={{ gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            const ok = enterDev(pw);
            setWrong(!ok);
            // the deck opens in a tab of its own: this one goes on as it was
            if (ok) setPw('');
          }}
        >
          <input type="password" aria-label="Developer password" placeholder="Password" value={pw} onChange={(e) => (setPw(e.target.value), setWrong(false))} autoComplete="off" autoFocus={location.hash === '#inbox'} />
          <button className="btn small" disabled={!pw}>
            Open the dev deck
          </button>
          {wrong && <span className="small" style={{ color: 'var(--bad)' }}>That is not it.</span>}
        </form>
      </div>
    </section>
  );
}


/** The name on the back of the jersey: the last name, in capitals, without accents. */
function backName(name: string): string {
  const words = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/).filter(Boolean);
  return (words[words.length - 1] ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function Create() {
  const start = useStore((s) => s.start);
  const showIntro = useStore((s) => s.showIntro);
  const [step, setStep] = useState(0);
  // each step opens at the top (owner: "when i move from the home page to identity, make the screen
  // start at the top"; the browser kept the Next button in place, so the page opened at its foot)
  const firstStep = useRef(true);
  useLayoutEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [step]);
  const [name, setName] = useState(`${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`);
  const [number, setNumber] = useState(String(Math.floor(Math.random() * 35)));
  const [pos, setPos] = useState<Pos>('SG');
  const [arch, setArch] = useState(0);
  const [cands, setCands] = useState<Attrs[]>(() => cards('SG'));
  const [focus, setFocus] = useState<AttrKey[]>([]);
  const [hand, setHand] = useState<'R' | 'L'>('R');
  const [mode, setMode] = useState<Mode>('standard');
  const [country, setCountry] = useState(''); // '' = the game decides, by real-world odds
  const [oath, setOath] = useState(false); // round 25: No Shortcuts, offered with Reality
  // round 27: his look (the parts every avatar is built from) and a plain practice jersey
  const [look, setLook] = useState<ChosenLook>(() => randomLook());
  const [jersey, setJersey] = useState<Jersey>('white');

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
    setLook(randomLook());
  };
  // round 27 (owner: "for harder road of reality, make the position, country, archetype, focus
  // stats, basically the whole intro random"): No Shortcuts skips the picking. The road rolls the
  // player, country by real-world odds, and shows him on the last step, with no reroll.
  const road = mode === 'reality' && oath;
  const rollRoad = () => {
    randomAll();
    let x = Math.random() * ORIGINS.reduce((t, o) => t + o.weight, 0);
    setCountry((ORIGINS.find((o) => (x -= o.weight) <= 0) ?? ORIGINS[0]).country);
    setStep(4);
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
      oath: mode === 'reality' && oath,
      look,
    });

  return (
    <div className="wrap no-tabs">
      <header className="top">
        <div className="brand">
          Bench to <span>Rafters</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {/* round 27 (owner: "the homepage itself doesn't allow settings. put it in"; the intro "should
              be accessible to players if they want") */}
          <button className="icon-btn" data-tour="intro-btn" onClick={showIntro}>
            Intro
          </button>
          <WhatsNewButton />
          <ShareButton />
          <SettingsMenu g={null} />
          <GuideButton />
          <button className="icon-btn" data-tour="random" onClick={randomAll} disabled={road && step === 4} title={road && step === 4 ? 'No Shortcuts: no rerolls' : undefined}>
            {UI.create.random}
          </button>
        </div>
      </header>
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
          {/* round 25 (owner): Reality, played the hardest way, asks once and is honoured for it */}
          {mode === 'reality' && (
            <div className={`card oath-card${oath ? ' on' : ''}`} role="group" aria-label="The No Shortcuts challenge">
              <Icon name="oath" size={48} />
              <div className="stack" style={{ gap: 6 }}>
                <div className="sec-title">Take the harder road? No Shortcuts</div>
                <p className="small muted">The road picks your player at random: position, archetype, focus, country, hand and name, with no reroll. Then master mode, with no recommendations anywhere, and no Fast break or Sim mode, locked for the whole career (Simple text is allowed). Take it and the career carries the No Shortcuts mark on its card, the leaderboards and the career log, with achievements of its own.</p>
                <div className="row" style={{ gap: 8 }}>
                  <button className={`btn small${oath ? '' : ' ghost'}`} aria-pressed={oath} onClick={() => (oath || sfx('oath'), setOath(true))}>
                    {oath ? 'Challenge accepted' : 'Accept the challenge'}
                  </button>
                  <button className="btn small ghost" aria-pressed={!oath} onClick={() => setOath(false)}>
                    Just Reality
                  </button>
                </div>
              </div>
            </div>
          )}
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
          {/* round 25 (owner: too much empty space): a compact card, with the jersey he will wear */}
          <div className="card id-card">
            {/* round 27 (owner): the player himself, in a plain jersey with his number, as he looks; and
                the back of it (owner: "show the back jersey so that users can see number and name change") */}
            <span className="id-avatar">
              <span className="id-fig">
                <LookPreview name={name.trim() || 'Rookie'} number={Number(number) || 0} look={look} jersey={jersey} size={132} />
                <span className="kicker">Front</span>
              </span>
              <span className="id-fig">
                <JerseyArt kit={PLAIN[jersey]} number={Number(number) || 0} back={backName(name)} size={118} label={`The back of your jersey: ${backName(name) || 'no name'}, number ${Number(number) || 0}`} />
                <span className="kicker">Back</span>
              </span>
            </span>
            <div className="stack id-fields">
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
                <button className="btn ghost small id-dice" onClick={() => setName(`${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`)} title="Pick a random name">
                  New name
                </button>
              </div>
            </div>
            <LookPicker look={look} setLook={setLook} jersey={jersey} setJersey={setJersey} />
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
            {road && (
              <span className="oath-rolled with-icon">
                <Icon name="oath" size={18} />
                No Shortcuts: the road picked all of this for you. No rerolls.{' '}
              </span>
            )}
            Focus: {focus.map((k) => NAMES.attr[k]).join(' and ')}. Height: still growing, most end up {ht(hMin + (archetype.height ?? 0))}–{ht(hMax + (archetype.height ?? 0))}, some well outside it. This card is a typical {archetype.name.toLowerCase()}; your real starting level is set at tryouts. {UI.create.assignedText}
          </p>
        </section>
      )}

      <div style={{ height: 14 }} />
      <div className="row-end">
        {step > 0 && (
          <button className="btn ghost" onClick={() => setStep(road && step === 4 ? 0 : step - 1)}>
            {UI.create.back}
          </button>
        )}
        {step < 4 ? (
          <button className="btn" data-tour="create-next" disabled={!canNext} onClick={() => (step === 0 && road ? rollRoad() : setStep(step + 1))}>
            {UI.create.next}
          </button>
        ) : (
          <button className="btn" data-tour="create-start" onClick={begin}>
            {UI.create.start}
          </button>
        )}
      </div>
      {/* round 25 (owner): the live strip and the saves sit under the hero and the cards (and under
          Next, so starting a career is no further away), the dev deck's door last */}
      {step === 0 && (
        <section className="stack start-foot">
          <LiveStrip />
          <SavesCard />
          <DevGate />
          {/* the game uses real teams and legends: it says plainly that it is not official */}
          <p className="small muted keep fan-note">Bench to Rafters is an unofficial fan game. It is not affiliated with or endorsed by the NBA, its teams or its players.</p>
        </section>
      )}
      <WhatsNewPanel />
    </div>
  );
}
