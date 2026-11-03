import { Icon } from '../art/Icon';
import { ICON_FOR, archetypeIcon } from '../art/icons';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ARCHETYPES } from '../../engine/player/archetypes';
import { rerollAttrs } from '../../engine/player/create';
import { makeRng } from '../../engine/rng';
import { ATTRS, DIFFICULTIES, DRAFT_NIGHT, HEIGHT_RANGE, MODES, POSITIONS, type Mode } from '../../engine/balance';
import type { AttrKey, Attrs, Pos } from '../../engine/types';
import { NAMES, UI } from '../../content/strings';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { achievementsNow, useStore } from '../../store';
import { ORIGINS } from '../../content/origins';
import { edgeOf } from '../../engine/career/nationality';
import { ht } from '../format';
import { SettingsMenu } from '../components/Settings';
import { WhatsNewButton, WhatsNewPanel } from '../components/WhatsNew';
import { ShareButton } from '../components/Share';
import { GuideButton } from '../components/Guide';
import { LiveStrip } from './Community';
import { MP_FAIL, multiplayer } from '../multiplayer';
import { NAME_MAX, cleanName, nameProblem, username } from '../names';
import { UsernameBox } from '../components/Username';
import { recordMp } from '../achievements';
import { FlagArt } from '../art/Flag';
import { POS_STYLE, PositionCard } from '../art/PositionCard';
import { HeroArt, archPose } from '../art/Hero';
import { hash } from '../art/color';
import { LineupArt } from '../art/Scene';
import { LookPicker, LookPreview, PLAIN, randomLook, type Jersey } from '../components/LookPicker';
import { JerseyArt } from '../art/Jersey';
import type { ChosenLook } from '../../content/looks';
import { enterDev } from '../../dev/devSwitch';
import { sfx } from '../sound';
import type { Level } from '../../engine/levels';
import { LEVEL_COPY, LEVEL_GOAL } from '../../content/roadmap';
import { ROADMAP } from '../../engine/balance';
import { FootBar } from '../components/FootBar';
import { LevelAdds } from '../components/LevelAdds';
import { PlaceArt } from './RoadMap';
import { MainLand } from './MainLand';

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const uiRng = makeRng(Math.floor(Math.random() * 2 ** 31));

/** Countries shown as big buttons on the identity page; the rest are in a list. */
/** The kind of road each country's players take, in a few words. */
const ROAD: Record<string, string> = { us: 'High school, AAU, college', canada: 'Prep school, then the NCAA', euro: 'Club academy, pro at 16-18', academy: 'Academies and clubs', asia: 'School teams, then college or pro', aus: 'Centre of Excellence' };
const FEATURED = ['USA', 'Canada', 'France', 'Spain', 'Serbia', 'Australia', 'Japan', 'South Korea', 'China', 'Nigeria', 'Brazil', 'Philippines'];


function cards(pos: Pos): Attrs[] {
  return ARCHETYPES[pos].map((a) => ({ ...a.attrs }));
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
            // the deck opens in place; the password is not kept for the way back
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

/** Round 35: what a draft class's player finds out when his career starts (it opens on draft night). */
const DRAFT_ASSIGNED = 'You do not pick these. You find out which town you grew up in and which college you led when the career starts.';

/** The new-career page; with `level`, a career on the road map (round 33): fewer steps, no difficulty. */
export function Create({ level }: { level?: Level } = {}) {
  const start = useStore((s) => s.start);
  const showIntro = useStore((s) => s.showIntro);
  const setCreating = useStore((s) => s.setCreating);
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
  const [name, setName] = useState(cleanName(`${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`));
  const [number, setNumber] = useState(String(Math.floor(Math.random() * 35)));
  const [pos, setPos] = useState<Pos>('SG');
  const [arch, setArch] = useState(0);
  const [cands, setCands] = useState<Attrs[]>(() => cards('SG'));
  const [focus, setFocus] = useState<AttrKey[]>([]);
  const [hand, setHand] = useState<'R' | 'L'>('R');
  const [mode, setMode] = useState<Mode>('standard');
  // round 35: a draft class waiting for this player (Regular guy only); made or joined on Start
  const draft = useStore((s) => (level ? null : s.draft));
  const setDraft = useStore((s) => s.setDraft);
  const [seatErr, setSeatErr] = useState('');
  const [seating, setSeating] = useState(false);
  useEffect(() => {
    if (draft) setMode('standard');
  }, [draft]);
  const [country, setCountry] = useState(''); // '' = the game decides, by real-world odds
  const [oath, setOath] = useState(false); // round 25: Rough Road, offered with Reality
  const [comet, setComet] = useState(false); // round 30: Comet, offered with Shoot for the stars
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
  // rolls every pick at once: the rough road (round 28, owner: the button at the top went,
  // "when there's already randomizers" beside each pick)
  const randomAll = () => {
    const p = pick(POSITIONS);
    setName(cleanName(`${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`));
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
  // stats, basically the whole intro random"): Rough Road skips the picking. The road rolls the
  // player, country by real-world odds, and shows him on the last step, with no reroll.
  const rough = !level && mode === 'reality' && oath;
  const steps = level ? LEVEL_COPY[level].steps : UI.create.steps;
  const cur = steps[step];
  const last = steps.length - 1;
  // round 33: country and hand belong to advanced (below it he is American and right-handed)
  const roads = !level || level === 'advanced';
  const rollRoad = () => {
    randomAll();
    let x = Math.random() * ORIGINS.reduce((t, o) => t + o.weight, 0);
    setCountry((ORIGINS.find((o) => (x -= o.weight) <= 0) ?? ORIGINS[0]).country);
    setStep(steps.indexOf('Confirm'));
  };
  // round 37: a venue on the main land starts its difficulty (Rough Road rolls the player at once)
  const startAt = (m: Mode) => {
    setMode(m);
    if (m === 'reality' && oath) rollRoad();
    else setStep(1);
  };
  const toggleFocus = (k: AttrKey) =>
    setFocus((f) => (f.includes(k) ? f.filter((x) => x !== k) : f.length >= 2 ? [f[1], k] : [...f, k]));

  const attrs = cands[arch];
  const archetype = ARCHETYPES[pos][arch];
  const [hMin, hMax] = HEIGHT_RANGE[pos];
  // round 36 (owner: "filter out curse words or non english characters in the player name")
  const badName = nameProblem(name);
  const canNext = cur === 'Identity' ? !badName : cur === 'Focus' ? focus.length === 2 : true;
  // beginner picks no focus: his archetype's two best ratings
  const autoFocus = [...ATTRS].sort((a, b) => attrs[b] - attrs[a]).slice(0, 2);

  const begin = () =>
    level
      ? start({
          name: name.trim() || 'Rookie',
          number: Math.max(0, Math.min(99, Number(number) || 0)),
          pos,
          archetype: arch,
          attrs,
          focus: level === 'beginner' ? autoFocus : focus,
          hand: roads ? hand : 'R',
          country: roads ? country || undefined : undefined,
          look,
          level,
        })
      : draft
        ? void takeSeat()
        : start({
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
      comet: mode === 'stars' && comet,
      look,
    });

  // round 35: the class is made (or joined) as he starts, and its seed is his career's
  const takeSeat = async () => {
    if (!draft || seating) return;
    const mp = await multiplayer();
    if (!mp) return setSeatErr(MP_FAIL.error);
    setSeating(true);
    setSeatErr('');
    const who = username() || 'A friend';
    // round 35: a seat plays one career; one already under way (or done) is not started again
    if (draft.code) {
      const k = await mp.draftClass(draft.code);
      const me = k && k !== 'error' ? k.members.find((m) => m.mine) : null;
      if (me && (me.seasons.length > 0 || me.rec)) {
        setSeating(false);
        return setSeatErr(MP_FAIL.taken);
      }
    }
    const seat = draft.code ? await mp.joinClass(draft.code, who) : await mp.makeClass(draft.name, who);
    setSeating(false);
    if (typeof seat === 'string') return setSeatErr(MP_FAIL[seat]);
    sfx('roll');
    if (recordMp('joined', seat.code)) achievementsNow();
    start({ name: name.trim() || 'Rookie', number: Math.max(0, Math.min(99, Number(number) || 0)), pos, archetype: arch, attrs, focus, hand, mode: 'standard', country: country || undefined, look }, seat.seed, { klass: seat.code });
  };

  const copy = level ? LEVEL_COPY[level] : null;
  // round 37: the first step, with no level and no draft class, is the main land
  const land = cur === 'Difficulty' && !level && !draft;
  return (
    <div className="wrap no-tabs">
      <header className="top">
        <div className="brand">
          Bench to <span>Rafters</span>
        </div>
        {copy ? (
          <div className="row" style={{ gap: 8 }}>
            <ShareButton />
            <SettingsMenu g={null} />
          </div>
        ) : (
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
        </div>
        )}
      </header>
      {copy && level ? (
        <section className="hero level-hero">
          <PlaceArt place={level} size={176} />
          <div className="kicker">
            Level {copy.n} of 3 · {copy.place}
          </div>
          <h1>{level === 'beginner' ? 'Beginner' : level === 'intermediate' ? 'Intermediate' : 'Advanced'}</h1>
          <p className="lede">{copy.lede}</p>
          <p className="level-goal with-icon">
            <Icon name="laurel" size={22} />
            <span>
              <b>The goal:</b> {LEVEL_GOAL} in {ROADMAP[level].nbaSeasons} NBA seasons.
            </span>
          </p>
          {level !== 'beginner' && step === 0 && <LevelAdds level={level} />}
        </section>
      ) : land ? null : (
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
      )}
      {!land && (
        <>
          <div className="stepper" aria-label="Steps">
            {steps.map((s, i) => (
              <span key={s} className={i === step ? 'on' : ''} aria-current={i === step ? 'step' : undefined}>
                {i + 1}. {s}
              </span>
            ))}
          </div>
          <div style={{ height: 12 }} />
        </>
      )}
      {draft && (
        <section className="card mp-draft row" role="group" aria-label="Draft class">
          <Icon name="draftclass" size={32} />
          <span className="mp-draft-text">
            <b>Draft class: {draft.name}</b>
            <small className="muted">{draft.code ? `Code ${draft.code}. ` : 'A new class: its code comes when you start. '}Regular guy, on the class’s seed. The class starts on draft night. Make your player and start.</small>
          </span>
          <button className="btn ghost small" onClick={() => setDraft(null)}>
            Leave the class
          </button>
        </section>
      )}

      {land && (
        <MainLand ch={{ oath, setOath, comet, setComet }} onStart={startAt}>
          <UsernamePrompt />
        </MainLand>
      )}
      {/* a draft class plays Regular guy: the difficulties as they were, the other two shut */}
      {cur === 'Difficulty' && draft && (
        <section className="stack">
          <div className="kicker">Choose how hard the road is</div>
          <div className="modes">
            {DIFFICULTIES.map((m) => {
              const shut = m !== 'standard';
              return (
                <button key={m} className={`choice mode-card${mode === m ? ' selected' : ''}${shut ? ' mode-locked' : ''}`} aria-pressed={mode === m} disabled={shut} onClick={() => setMode(m)}>
                  <span className="label with-icon">
                    <Icon name={shut ? 'lock' : ICON_FOR[m]} size={32} />
                    {MODES[m].name}
                  </span>
                  <small className={shut ? 'keep' : undefined}>{shut ? 'A draft class plays Regular guy.' : MODES[m].blurb}</small>
                </button>
              );
            })}
          </div>
          <p className="muted small">The league is the same at every difficulty. What changes is your potential, how fast you grow and how often you get hurt. Want it quicker? Flip the Fast break switch inside the game, any time.</p>
        </section>
      )}

      {cur === 'Identity' && (
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
                  <input id="f-name" type="text" maxLength={NAME_MAX} value={name} aria-describedby="f-name-note" onChange={(e) => setName(cleanName(e.target.value))} />
                  <small id="f-name-note" className={badName ? 'name-note bad' : 'name-note muted'}>{badName || 'Letters A to Z.'}</small>
                </div>
                <div className="field id-num">
                  <label htmlFor="f-num">{UI.create.number}</label>
                  <input id="f-num" type="number" min={0} max={99} value={number} onChange={(e) => setNumber(e.target.value)} />
                </div>
                <button className="btn ghost small id-dice" onClick={() => setName(cleanName(`${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`))} title="Pick a random name">
                  New name
                </button>
              </div>
            </div>
            <LookPicker look={look} setLook={setLook} jersey={jersey} setJersey={setJersey} />
          </div>

          {roads && (
          <div className="card stack nation-card">
            <div className="sec-title">Where do you start?</div>
            {/* round 35: a draft class starts on draft night, so the youth road is behind him */}
            <p className="small muted">{draft ? 'Where he grew up, and the national team he can play for.' : 'Your country sets your road until college or the pros: the youth system, the showcases, and who calls first.'}</p>
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
            {!draft && <div className="nation-notes">
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
            </div>}
          </div>
          )}

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
            {roads && (
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
            )}
            <div className="assigned">
              <div className="kicker">{draft ? 'Hometown and college' : UI.create.assignedTitle}</div>
              <div className="small">{draft ? DRAFT_ASSIGNED : UI.create.assignedText}{level === 'beginner' ? ' So are your archetype and your two focus ratings: the ones a ' + NAMES.pos[pos].toLowerCase() + ' like you is best at.' : ''}</div>
            </div>
          </div>
        </section>
      )}

      {cur === 'Archetype' && (
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

      {cur === 'Focus' && (
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

      {cur === 'Confirm' && (
        <section className="card stack">
          <div className="row">
            <div style={{ minWidth: 0 }}>
              <div className="kicker">{level ? 'High school senior · age 17' : draft ? 'Draft night · a college junior or senior' : 'Freshman · age 14'}</div>
              <div className="pc-name">{name || 'Rookie'}</div>
              <div className="muted">
                #{number} · {NAMES.pos[pos]} · {archetype.name}
                {country ? ` · ${country}` : ''}
              </div>
            </div>

          </div>
          {!level && (
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
          )}
          {level ? (
            <p className="muted small">
              Three high school seasons are behind him: you start on the first day of his senior year. Focus: {(level === 'beginner' ? autoFocus : focus).map((k) => NAMES.attr[k]).join(' and ')}. The goal: {LEVEL_GOAL} in {ROADMAP[level].nbaSeasons} NBA seasons.
            </p>
          ) : (
          <p className="muted small">
            {rough && (
              <span className="oath-rolled with-icon">
                <Icon name="oath" size={18} />
                Rough Road: the road picked all of this for you, his look included. No rerolls.{' '}
              </span>
            )}
            Focus: {focus.map((k) => NAMES.attr[k]).join(' and ')}.{' '}
            {draft
              ? `The class starts on draft night: his college’s first option, done growing (most end up ${ht(hMin + (archetype.height ?? 0))}–${ht(hMax + (archetype.height ?? 0))}), OVR ${DRAFT_NIGHT.ovr[0]} to ${DRAFT_NIGHT.ovr[1]} and projected in the first round. This card is a typical ${archetype.name.toLowerCase()}; his college years shaped it. ${DRAFT_ASSIGNED}`
              : `Height: still growing, most end up ${ht(hMin + (archetype.height ?? 0))}–${ht(hMax + (archetype.height ?? 0))}, some well outside it. This card is a typical ${archetype.name.toLowerCase()}; your real starting level is set at tryouts. ${UI.create.assignedText}`}
          </p>
          )}
        </section>
      )}

      {!land && <div style={{ height: 14 }} />}
      {!land && (
      <div className="row-end">
        {step === 0 && level && level !== 'beginner' && (
          <button className="btn ghost" onClick={() => setCreating(null)}>
            Back to the road map
          </button>
        )}
        {step > 0 && (
          <button className="btn ghost" onClick={() => setStep(rough && step === last ? 0 : step - 1)}>
            {UI.create.back}
          </button>
        )}
        {step < last ? (
          <button className="btn" data-tour="create-next" disabled={!canNext} onClick={() => (step === 0 && rough ? rollRoad() : setStep(step + 1))}>
            {UI.create.next}
          </button>
        ) : (
          <button className="btn" data-tour="create-start" disabled={seating} onClick={begin}>
            {seating ? 'Taking your seat…' : UI.create.start}
          </button>
        )}
      </div>
      )}
      {/* round 25 (owner): the live strip and the saves sit under the hero and the cards (and under
          Next, so starting a career is no further away), the dev deck's door last */}
      {seatErr && <p className="small row-end" style={{ color: 'var(--bad)' }}>{seatErr}</p>}
      {land && (
        <section className="stack start-foot">
          <LiveStrip />
          <DevGate />
          {/* the game uses real teams and legends: it says plainly that it is not official */}
          <p className="small muted keep fan-note">Bench to Rafters is an unofficial fan game. It is not affiliated with or endorsed by the NBA, its teams or its players.</p>
        </section>
      )}
      {level ? <FootBar where={`level ${level}, create, ${cur.toLowerCase()}`} /> : <WhatsNewPanel />}
    </div>
  );
}

// round 36: the username, asked once on the start page of a device that has none yet (it skipped the
// tutorial with the exit code, or graduated before usernames came in); Not now hides it for good
const LATER = 'btr-username-later';
function UsernamePrompt() {
  const [hidden, setHidden] = useState(() => {
    try {
      return !!username() || !!localStorage.getItem(LATER);
    } catch {
      return true;
    }
  });
  if (hidden) return null;
  const later = () => {
    try {
      localStorage.setItem(LATER, '1');
    } catch {
      // storage blocked: asked again next visit
    }
    setHidden(true);
  };
  return (
    <section className="card oath-card username-prompt" role="group" aria-label="Pick a username" data-tour="username-prompt">
      <Icon name="crowd" size={48} />
      <div className="stack" style={{ gap: 6 }}>
        <div className="sec-title">Pick a username?</div>
        <UsernameBox onSet={() => setHidden(true)} note="Shown beside your careers on the community boards and to friends, so people know whose player it is. Letters A to Z and numbers; change it any time in Settings." />
        <div className="row" style={{ gap: 8 }}>
          <button className="btn small ghost" onClick={later}>
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
