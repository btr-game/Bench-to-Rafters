// The dev deck (round 24, owner: "make a dev version, grant access to everything, a deck of
// cards I can look through, titled with which function they are; when I click on them, a page
// with that function opens"). Flip through the deck (or see it as a grid), open a card, and the
// game itself takes over with that function on screen; the bar at the bottom brings you back.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { setFolds } from '../ui/fold';
import { Dribbler, MOVES } from '../ui/components/Loading';
import { App } from '../ui/App';
import { GuideTour } from '../ui/components/GuideTour';
import { TabNews } from '../ui/components/TabNews';
import { AchToasts } from '../ui/screens/Achievements';
import { Lessons } from '../ui/tutorial/Lessons';
import { Icon } from '../ui/art/Icon';
import { roadView, useStore } from '../store';
import { CARDS, GROUPS, setAchievements, type DevCard, type Group } from './cards';
import { Marked, SUMMARY, SummaryPage, searchCards, searchSummary, snippet } from './Summary';
import { leaveDev } from './devSwitch';
import { SettingsMenu } from '../ui/components/Settings';
import { writeReal } from './storage';
import { ACH_KEY, emptyAch } from '../ui/achievements';
import { todayKey } from '../engine/mini/daily';
import { Catalog } from './Catalog';
import { Inbox } from './Inbox';
import { MusicBoard, SoundBoard } from './SoundBoard';
import { watchReal, type FeedItem, type RealWhere } from '../ui/community';
import { NEWS } from '../content/whatsNew';
import './dev.css';

const groupOf = (g: Group) => GROUPS.find((x) => x.key === g)!;

/** Dev mode starts here (main.tsx): the deck never keeps a career of its own, and every
 * achievement starts earned so none pop up. All of it lands in the deck's own storage. */
export function devSetup(): void {
  try {
    localStorage.setItem('btr-guide-seen', '1');
    localStorage.removeItem('btr-save-v1');
  } catch {
    // storage blocked: the deck still works, the start page just shows its first-visit sheet
  }
  clean();
}

/** Back to a clean slate between cards: no game, no page, no switches left on. */
function clean(): void {
  useStore.setState({ game: null, slot: null, page: null, mini: null, transition: null, daily: null, tab: 'home', toasts: [], guide: false, master: false, simple: false, intro: false, news: false, thanks: null, spots: null, tour: false, lookBack: false, ...roadView() });
  setAchievements(true);
  // round 34: every card the deck deals opens with every card open (round 36: but the Body panel,
  // folded until opened, as a new player sees it; the cards about it open it)
  setFolds([]);
}

/** One card face: the suit strip, the corner indices, the big icon, the function's name. */
function Face({ c, n, size = 'big', onClick, tabIndex }: { c: DevCard; n: number; size?: 'big' | 'small'; onClick?: () => void; tabIndex?: number }) {
  const g = groupOf(c.group);
  return (
    <button className={`dk-card ${size}`} style={{ ['--suit' as string]: g.color }} onClick={onClick} tabIndex={tabIndex} aria-label={`${c.title}: ${c.blurb}`}>
      <span className="dk-strip">{c.group}</span>
      <span className="dk-corner tl">
        <b>{n}</b>
        <Icon name={g.icon} size={16} />
      </span>
      <span className="dk-corner br">
        <b>{n}</b>
        <Icon name={g.icon} size={16} />
      </span>
      <span className="dk-art">
        <Icon name={c.icon} size={size === 'big' ? 96 : 52} />
      </span>
      <span className="dk-title">{c.title}</span>
      {size === 'big' && <span className="dk-blurb">{c.blurb}</span>}
    </button>
  );
}

function press(sel: string): void {
  const el = sel.startsWith('text=') ? [...document.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent?.trim() === sel.slice(5)) : document.querySelector<HTMLElement>(sel);
  if (!el) return;
  el.scrollIntoView({ block: 'center' });
  if (el.tagName === 'BUTTON' || el.tagName === 'SUMMARY') el.click();
}

/**
 * Round 27 (owner: "for devs, can you add reset achievements? totally resets the achievements so
 * that i can start over"). Wipes the game's own book on this device (not the deck's, which always
 * shows everything): every achievement and the totals behind them; daily challenges played before
 * today stop counting. Asked twice, since it cannot be undone. Guide mode comes back on with it.
 */
/** The reset itself, on the game's own keys: an empty book, and the guide on from its first step
 * (round 27, owner: "when i go into dev deck and reset, can you activate the guide automatically"). */
function resetGame(): boolean {
  return writeReal(ACH_KEY, JSON.stringify(emptyAch(todayKey()))) && writeReal('btr-guide-mode', '1') && writeReal('btr-tour-seen', '[]');
}

const DECK_OPENED = Date.now();

/** Round 33 (owner: "make the what's new accessible in the dev deck"): every update players have
 * been shown, newest first; the pop-up itself opens from here as they see it. */
function NewsHistory({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="stack dk-news" aria-label="What’s new, every update">
      <div className="dk-sound-head">
        <div>
          <h2 className="sec-title with-icon">
            <Icon name="news" size={30} />
            What’s new
          </h2>
          <p className="small muted">Every update players have been shown, newest first. On the start page they see only the latest, once after each update.</p>
        </div>
        <button className="btn small" onClick={onOpen}>
          Open it as players see it
        </button>
      </div>
      {NEWS.map((n, i) => (
        <article key={n.id} className="card stack dk-news-entry">
          <div className="kicker">
            {n.date}
            {i === 0 ? ' · the latest' : ''}
          </div>
          <ul className="news-list">
            {n.items.map((it) => (
              <li key={it.text}>
                <Icon name={it.icon} size={26} />
                <span>{it.text}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

/** Round 32 (owner: "to track the real amount of people, put the real values in the dev deck so
 * that only the devs can see it"): the live strip's numbers without the house players. Round 35
 * (owner: "real numbers of user in the dev deck doesnt seem to work"): they came from the deck's own
 * community, which is this device's, so they only ever counted the deck. They are read from the
 * real one now (community.ts watchReal), without the deck joining the count. */
function RealLive() {
  const [here, setHere] = useState<number | null>(null);
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [where, setWhere] = useState<RealWhere | null>(null);
  useEffect(() => {
    let stop = () => {};
    let gone = false;
    void watchReal(setHere, setItems).then((w) => {
      if (gone) w.stop();
      else {
        stop = w.stop;
        setWhere(w.where);
      }
    });
    return () => {
      gone = true;
      stop();
    };
  }, []);
  const since = items?.filter((x) => x.at >= DECK_OPENED).length ?? 0;
  const day = items?.filter((x) => x.at >= Date.now() - 86_400_000).length ?? 0;
  return (
    <p className="dk-real small" aria-label="Real live numbers">
      <Icon name="live" size={20} />
      {where === 'none' ? (
        <span>Real numbers: this copy has no online community (the website and the claude.ai page do), so there is nothing real to count here.</span>
      ) : (
        <span>
          Real numbers {where === 'online' ? 'from the website' : where === 'shared' ? 'from this page' : ''} (the strip players see adds the house players; the deck is never counted): <b>{here ?? '…'}</b> on the court right now · <b>{items ? since : '…'}</b> {since === 1 ? 'career' : 'careers'} ended since this deck opened · <b>{items ? day : '…'}</b> in the last 24 hours (the feed keeps the latest 30).
        </span>
      )}
    </p>
  );
}

function ResetAch() {
  const [step, setStep] = useState<'idle' | 'sure' | 'done' | 'failed'>('idle');
  if (step === 'sure')
    return (
      <span className="dk-reset" role="group" aria-label="Reset achievements">
        <small>Wipe every achievement in the game on this device?</small>
        <button className="btn small danger" onClick={() => setStep(resetGame() ? 'done' : 'failed')} autoFocus>
          Wipe them
        </button>
        <button className="btn small ghost" onClick={() => setStep('idle')}>
          Keep them
        </button>
      </span>
    );
  return (
    <span className="dk-reset">
      {step === 'done' && <small role="status">Done: the book is empty and counts again from today; Guide mode is on, its tour from the first step.</small>}
      {step === 'failed' && <small role="status">This browser blocked the reset (no storage).</small>}
      <button className="btn small ghost" onClick={() => setStep('sure')}>
        Reset achievements
      </button>
    </span>
  );
}

export function DevDeck() {
  const [group, setGroup] = useState<Group | 'all'>('all');
  const [q, setQ] = useState('');
  const [results, setResults] = useState(false);
  const [section, setSection] = useState<'cards' | 'catalog' | 'sounds' | 'music' | 'summary' | 'inbox' | 'news'>(() => (location.hash === '#inbox' ? 'inbox' : 'cards'));
  const [chapter, setChapter] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);
  const [view, setView] = useState<'deck' | 'grid'>('deck');
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState<DevCard | null>(null);
  const [busy, setBusy] = useState<DevCard | null>(null);
  const [miss, setMiss] = useState<string | null>(null);
  const list = useMemo(() => CARDS.filter((c) => group === 'all' || c.group === group), [group]);
  const hits = useMemo(() => (results ? { cards: searchCards(q, CARDS), summary: searchSummary(q) } : null), [q, results]);
  const openChapter = (ci: number, bi: number | null = null) => {
    setSection('summary');
    setChapter(ci);
    setFocus(bi);
    setResults(false);
  };
  const cur = Math.min(at, Math.max(0, list.length - 1));
  const numberOf = (c: DevCard) => CARDS.indexOf(c) + 1;

  const deal = useCallback((c: DevCard) => {
    setBusy(c);
    setMiss(null);
    // let "Dealing" paint before the engine plays a career or two
    window.setTimeout(() => {
      clean();
      let ok: boolean | void = false;
      try {
        ok = c.open();
      } catch (e) {
        console.error(e);
        ok = false;
      }
      setBusy(null);
      if (ok === false) {
        setMiss(`No test career reached "${c.title}" this time.`);
        clean();
        return;
      }
      setOpen(c);
      window.scrollTo(0, 0);
      // a list of controls is pressed one after another
      if (c.press) [c.press].flat().forEach((sel, i) => window.setTimeout(() => press(sel), 450 + i * 200));
    }, 40);
  }, []);
  const back = () => {
    clean();
    setOpen(null);
  };

  // the visual check (scripts/visual.cjs, round 27) deals every card by id
  useEffect(() => {
    (window as unknown as { __deck?: unknown }).__deck = {
      ids: CARDS.map((c) => c.id),
      open: (id: string) => {
        const c = CARDS.find((x) => x.id === id);
        if (c) deal(c);
      },
      back: () => (clean(), setOpen(null)),
      // round 35: the game's own store, for end-to-end scripts (an import from the page can load a
      // second copy of the module after a hot update)
      store: useStore,
    };
  }, [deal]);

  // arrows flip the deck, Enter opens the card on top
  useEffect(() => {
    if (open || view !== 'deck' || section !== 'cards' || results) return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') setAt((i) => Math.min(list.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setAt((i) => Math.max(0, i - 1));
      else if (e.key === 'Enter' && list[cur]) deal(list[cur]);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, view, list, cur, deal, section, results]);

  if (open)
    return (
      <>
        {open.page ? (
          <open.page />
        ) : (
          <>
            <App />
            <GuideTour />
            <TabNews />
            <AchToasts />
            <Lessons />
          </>
        )}
        <div className="dk-bar" role="toolbar" aria-label="Dev deck">
          <button className="btn small" onClick={back}>
            Back to the deck
          </button>
          <span>
            <small>Card {numberOf(open)}</small>
            <b>{open.title}</b>
          </span>
          <button className="btn small ghost" onClick={() => deal(open)}>
            Deal it again
          </button>
        </div>
      </>
    );

  return (
    <div className="dk">
      <header className="dk-head">
        <div>
          <div className="dk-top">
            <div className="kicker">Bench to Rafters · dev mode</div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <ResetAch />
              {/* round 27 (owner): the theme and the court (the game's own, round 28), and the rest of the settings */}
              <SettingsMenu g={null} />
              <button className="btn small ghost" onClick={leaveDev}>
                Back to the game
              </button>
            </div>
          </div>
          <h1 className="hub-title">The dev deck</h1>
          <p className="prose">
            Every function in the game, one card each ({CARDS.length} in all): open one and the game itself takes over with that function on screen, everything unlocked (cards that need a career play one first, so a few take a second or two). The Catalog shows everything the game draws from, Sounds plays every sound, and the project summary and the feedback Inbox are here too.
          </p>
          <RealLive />
        </div>
        <div className="dk-tools">
          <div className="seg dk-sections">
            <button aria-pressed={section === 'cards' && !results} onClick={() => (setSection('cards'), setResults(false))}>
              Cards
            </button>
            <button aria-pressed={section === 'catalog' && !results} onClick={() => (setSection('catalog'), setResults(false))}>
              Catalog
            </button>
            <button aria-pressed={section === 'sounds' && !results} onClick={() => (setSection('sounds'), setResults(false))}>
              Sounds
            </button>
            <button aria-pressed={section === 'music' && !results} onClick={() => (setSection('music'), setResults(false))}>
              Music
            </button>
            <button aria-pressed={section === 'summary' && !results} onClick={() => openChapter(chapter)}>
              Project summary
            </button>
            <button aria-pressed={section === 'inbox' && !results} onClick={() => (setSection('inbox'), setResults(false))}>
              Inbox
            </button>
            <button aria-pressed={section === 'news' && !results} onClick={() => (setSection('news'), setResults(false))}>
              What’s new
            </button>
          </div>
          <div className="dk-searchbox">
            <input
              id="dk-search"
              className="dk-search"
              type="search"
              placeholder="Search functions and the summary"
              value={q}
              onChange={(e) => (setQ(e.target.value), setResults(!!e.target.value.trim()))}
              onFocus={() => q.trim() && setResults(true)}
              aria-label="Search functions and the summary"
            />
          </div>
        </div>
      </header>
      {hits ? (
        <section className="dk-results" aria-label="Search results">
          <div className="dk-results-head">
            <b>
              {hits.cards.length + hits.summary.length} results for “{q.trim()}”
            </b>
            <button className="btn small ghost" onClick={() => (setQ(''), setResults(false))}>
              Clear
            </button>
          </div>
          {hits.cards.length > 0 && (
            <div className="stack">
              <div className="kicker">Functions · open the card</div>
              <div className="dk-hit-cards">
                {hits.cards.map((c) => (
                  <button key={c.id} className="dk-hit-card" style={{ ['--suit' as string]: groupOf(c.group).color }} onClick={() => deal(c)}>
                    <Icon name={c.icon} size={30} />
                    <span>
                      <b>
                        <Marked text={c.title} q={q} />
                      </b>
                      <small>
                        <Marked text={c.blurb} q={q} />
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {hits.summary.length > 0 && (
            <div className="stack">
              <div className="kicker">Project summary · go to the passage</div>
              {hits.summary.map((h) => (
                <button key={`${h.ci}-${h.bi}`} className="dk-hit" onClick={() => openChapter(h.ci, h.bi)}>
                  <small>
                    {SUMMARY.chapters[h.ci].title}
                    {h.section ? ` › ${h.section}` : ''}
                  </small>
                  <span>
                    <Marked text={snippet(h.text, q)} q={q} />
                  </span>
                </button>
              ))}
            </div>
          )}
          {hits.cards.length + hits.summary.length === 0 && <p className="muted">Nothing matches. Try fewer or shorter words.</p>}
        </section>
      ) : section === 'catalog' ? (
        <Catalog />
      ) : section === 'inbox' ? (
        <Inbox />
      ) : section === 'news' ? (
        <NewsHistory onOpen={() => deal(CARDS.find((c) => c.id === 'whats-new')!)} />
      ) : section === 'sounds' ? (
        <SoundBoard />
      ) : section === 'music' ? (
        <MusicBoard />
      ) : section === 'summary' ? (
        <SummaryPage chapter={chapter} setChapter={(n) => (setChapter(n), setFocus(null))} focus={focus} q={q} />
      ) : (
      <>
      <div className="dk-suits">
        <button className="dk-suit all" aria-pressed={group === 'all'} onClick={() => (setGroup('all'), setAt(0))}>
          All <small>{CARDS.length}</small>
        </button>
        {GROUPS.map((g) => (
          <button key={g.key} className="dk-suit" style={{ ['--suit' as string]: g.color }} aria-pressed={group === g.key} onClick={() => (setGroup(g.key), setAt(0))}>
            <Icon name={g.icon} size={18} />
            {g.key} <small>{CARDS.filter((c) => c.group === g.key).length}</small>
          </button>
        ))}
      </div>
      {miss && <p className="dk-miss">{miss}</p>}
      {list.length === 0 ? (
        <p className="muted">No card matches.</p>
      ) : (
        <div className="seg dk-views">
          {(['deck', 'grid'] as const).map((v) => (
            <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
              {v === 'deck' ? 'Deck' : 'Grid'}
            </button>
          ))}
        </div>
      )}
      {list.length === 0 ? null : view === 'deck' ? (
        <section className="dk-table">
          <div className="dk-fan">
            {list.map((c, i) => {
              const d = i - cur;
              if (Math.abs(d) > 3) return null;
              return (
                <div key={c.id} className={`dk-slot${d === 0 ? ' front' : ''}`} style={{ ['--d' as string]: d, zIndex: 10 - Math.abs(d) }}>
                  <Face c={c} n={numberOf(c)} onClick={() => (d === 0 ? deal(c) : setAt(i))} tabIndex={d === 0 ? 0 : -1} />
                </div>
              );
            })}
          </div>
          <div className="dk-nav">
            <button className="btn ghost" disabled={cur === 0} onClick={() => setAt(cur - 1)}>
              Previous
            </button>
            <span className="dk-count">
              {cur + 1} / {list.length}
            </span>
            <button className="btn ghost" disabled={cur >= list.length - 1} onClick={() => setAt(cur + 1)}>
              Next
            </button>
            <button className="btn" onClick={() => deal(list[cur])}>
              Open this card
            </button>
          </div>
          <div className="dk-index">
            {list.map((c, i) => (
              <button key={c.id} className={i === cur ? 'on' : ''} style={{ ['--suit' as string]: groupOf(c.group).color }} onClick={() => setAt(i)}>
                {c.title}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="dk-grid">
          {list.map((c) => (
            <Face key={c.id} c={c} n={numberOf(c)} size="small" onClick={() => deal(c)} />
          ))}
        </section>
      )}
      </>
      )}
      {busy && (
        <div className="dk-dealing" role="status">
          <div className="dk-dealing-card" style={{ ['--suit' as string]: groupOf(busy.group).color }}>
            <Dribbler move={MOVES[CARDS.indexOf(busy) % MOVES.length]} />
            <b>Dealing {busy.title}</b>
            <small>Playing a career to get there…</small>
          </div>
        </div>
      )}
    </div>
  );
}
