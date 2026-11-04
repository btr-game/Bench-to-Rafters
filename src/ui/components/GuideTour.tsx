// Guide mode's tour (round 24, owner: "go through almost every clickable button, but don't repeat;
// everything in the guide, step by step; some things unlock over progress, the guide guides users
// to it"). Each step points at one control (found by a selector) with a short note. A step is
// shown once: "Got it", a click on the control, or a few seconds on screen before it goes away all
// count as seen, and the seen steps are kept on this device. A step waits until its control is on
// screen, so the ones for later features (the starting five, the MVP race, a mini-game) appear
// the first time they unlock. With nothing new on screen, Guide mode's plain "next thing to do"
// highlight (Guide.tsx) takes over.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { inTutorial } from '../road';
import { spot } from '../fold';
import { t, tx } from '../../i18n';

interface Step {
  id: string;
  sel: string;
  text: string;
}

const T = (id: string, sel: string, text: string): Step => ({ id, sel, text });
const D = (id: string) => `[data-tour="${id}"]`;

// in order: the start page, the top bar, Home, the decisions, the offseason, the tabs, the end
// (round 40: each note's English is marked tx() and shown in the player's language with t())
const TOUR: Step[] = [
  T('start-continue', '.continue-card .btn', tx('Your latest career: pick it up where you left it. Every career, in progress or finished, is in the career log.')),
  T('guide-btn', D('guide-btn'), tx('The manual: every feature in a few short points. Guide mode switches on and off there too.')),
  T('intro-btn', D('intro-btn'), tx('Intro plays the opening again.')),
  T('whats-new', D('whats-new'), tx('What’s new: the latest changes to the game. It opens by itself once after each update; this opens it again.')),
  T('share-btn', D('share-btn'), tx('Share gives you the game’s link to send to a friend.')),
  // round 37: the start page is the main land
  T('mainland', D('mainland'), tx('The main land: every part of the game is a place. Click one, or move between them with the arrow keys; Enter opens its card, Escape folds it away.')),
  T('land-venues', D('mode-regular'), tx('Three venues, three difficulties: the gym is Regular guy, the cage Reality hits hard, the dome Shoot for the stars. A difficulty stays for the whole career; a locked one says which road map stop opens it.')),
  T('start-mode', '.modes', tx('How hard the road is. It stays for the whole career. A locked one says which road map stop opens it.')),
  T('comet', '.comet-card', tx('With Shoot for the stars: Comet, the stars at hyper speed. Fast break and Sim for the whole career, about five minutes.')),
  T('oath', '[data-tour="rough-road"]', tx('With Reality hits hard: Rough Road, the hardest way to play. The road picks your player at random, then master mode with no Fast break or Sim, for the whole career, and a mark of honour for it.')),
  T('minis', D('minis'), tx('Mini-games. They open with the island on the road map; then free from the start page, and in a career each one opens with your ratings and pays a rating bonus.')),
  T('levels', D('levels-card'), tx('The airport flies back to the road map. Its stops open Reality hits hard, Shoot for the stars and the mini-games, and every level plays again. Level careers count nowhere.')),
  T('log', D('log'), tx('The career log: the cards of your last ten finished careers. Lock up to five to keep them for good.')),
  T('log-saves', '.save-entry', tx('A career in progress: continue it, or copy its code to send the maker with a bug report. Finished careers below open again with Look back.')),
  T('log-lock', D('log-lock'), tx('Lock a card: a new career never replaces it, and it can’t be deleted until you unlock it. Five at most.')),
  T('log-pick', D('log-pick'), tx('Compare: pick two cards to see them side by side.')),
  T('log-compare', D('log-compare'), tx('Two careers side by side: the better of each row in bold with a ▲.')),
  T('ach', D('ach'), tx('The achievement book: every milestone you reach, kept for good. Unearned ones are riddles.')),
  T('community', D('community'), tx('The community: leaderboards, the Reality 99 hall, the statue plaza and feedback.')),
  T('multi', D('multi'), tx('Play with friends: challenge a friend to beat your career from the same start, or start a draft class together. Regular guy only.')),
  T('page-back', '.back-btn', tx('Back where you came from (Escape works too). Next to it: where you are.')),
  T('achv-tiers', '.achv-tiers', tx('Tap a tier to see only its achievements.')),
  T('achv-cats', '.achv-cats', tx('Categories: tap one to see only its achievements, with a tier or on its own.')),
  T('mp-name', '.username-box', tx('Your username: it goes beside every career you post and everything friends see; your player keeps his own name. Change it any time. No email or login.')),
  T('mp-tabs', D('mp-tabs'), tx('Challenge a friend, or a draft class: each by its code, its link or quick match.')),
  T('mp-code', '.mp-code', tx('The code to send a friend. Copy the link sends them straight to it.')),
  T('comm-tabs', D('comm-tabs'), tx('Leaderboards, the Reality 99 hall, the statue plaza, and a note to the maker.')),
  T('board-tabs', D('board-tabs'), tx('A board for each difficulty, and for Rough Road and Comet careers.')),
  T('hall-seat', 'button.hall-seat', tx('A Reality 99 career. Tap it for the card.')),
  T('respect', '.plaza-spot .btn', tx('Pay your respects to a statue. Tap the statue for its career card.')),
  T('feedback-send', D('feedback-send'), tx('Sends your note to the game’s maker, or opens the page’s comment box when the page does not take posts from you.')),
  T('create-next', D('create-next'), tx('Next: who you are, your archetype, your focus, then a last look.')),
  T('start-name', '#f-name', tx('Your name and number. The number can change between seasons.')),
  T('start-look', '.look-picker', tx('Your look: skin, hair and facial hair, in a plain jersey with your number. Random look rolls one.')),
  T('start-nation', '.nation-grid', tx('Your country sets your road to the pros.')),
  T('start-pos', '.pos-cards', tx('Your position. Each has its own heights and archetypes.')),
  T('start-arch', '.arch-cards', tx('Your archetype: the kind of player you start as.')),
  T('start-focus', '.focus-grid', tx('Two focus stats: they grow almost twice as fast.')),
  T('create-start', D('create-start'), tx('Start the career.')),
  T('town', D('town'), tx('Your town: every page is a place on the street. Click one and you walk to its door; or Tab in, walk with the arrow keys or A and D, and press Enter. H, S, P, R and E still work.')),
  T('tab-home', D('tab-home'), tx('Home, at the gym: the choice waiting for you.')),
  T('todo', '.todo-now', tx('What the game is waiting for now. Tap to jump to it.')),
  T('d-plan', D('d-plan'), tx('Pick one or two plans for this half. The first one you tap is the main plan.')),
  T('main-go', '.main-go', tx('Plays the next step. Enter does the same.')),
  T('undo', D('undo'), tx('Undo: takes back your last choice or step (U on a keyboard). Not in Rough Road, Comet, the daily challenge or a career with friends.')),
  T('stat-strip', '.stat-strip', tx('Simple text keeps the season’s averages, in one line.')),
  T('d-event', D('d-event'), tx('A turning point: pick how you respond. The result is rolled; the risk tag shows how swingy it is.')),
  T('d-road', D('d-road'), tx('Where you play next. Minutes matter most for growth.')),
  T('d-arc', D('d-arc'), tx('A storyline chapter. Your answer shapes the next one.')),
  T('d-draft', D('d-draft'), tx('A draft decision. The scouting report shows where you might go.')),
  T('d-shop', D('d-shop'), tx('The shop: six items this summer. Enter leaves it.')),
  T('d-summer', D('d-summer'), tx('Your summer program shapes next season.')),
  T('d-national', D('d-national'), tx('A national team call: medals and fame, at the cost of rest.')),
  T('d-live', D('d-live'), tx('A playable playoff game: a tactic each quarter, or simulate.')),
  T('live-floor', D('live-floor'), tx('A game that can end your season: play its last six minutes yourself on the Floor, or simulate them. WASD moves, J shoots (one tap at the rim lays it in), K passes, L makes a move, Esc pauses.')),
  T('live-crunch', D('live-crunch'), tx('Crunch time in a final: the last two minutes are yours, trip by trip. Your ball, pick the play; their ball, call the defense. Keys 1 to 5 pick.')),
  T('live-meter', D('live-meter'), tx('The last shot of a close game: stop the meter in the green. A perfect release makes it much likelier to drop.')),
  T('d-press', D('d-press'), tx('A press conference: answer humble, confident or fiery. Each tone does something different.')),
  T('d-brand', D('d-brand'), tx('Brands want your logo: a fixed deal, your own signature line, or not yet.')),
  T('talks', D('talks'), tx('Talk terms: ask for more money, a year or a bigger role. Two asks; push too hard and they pull the offer.')),
  T('d-retire', D('d-retire'), tx('Keep playing, retire, or chase a ring as a veteran specialist.')),
  T('d-chaser', D('d-chaser'), tx('Pick your role for the contender.')),
  T('moment-go', '.moment-btn', tx('A story page. Read it, then carry on (Enter).')),
  T('clutch-play', D('clutch-play'), tx('Play the last minutes yourself: pick a move on each big possession, then stop the meter.')),
  T('clutch-meter', '.clutch-meter', tx('Stop the marker in the green: Space, Enter or a tap. The bright middle is perfect.')),
  T('skip-final', '[data-skip]', tx('Or skip straight to the result.')),
  T('next-step', '.next-step', tx('From any other tab, this carries the game on.')),
  T('modes', D('modes'), tx('How you play: every mode in one place.')),
  // round 34
  T('fold', '.fold-tab, .fold-btn', tx('Cards fold: this tab (or a card’s title) folds a card to one line, and it stays that way on this device. Tap again to open it.')),
  T('look-back', '.look-back-bar .btn', tx('You are looking back at a finished career. Leave takes you back to the career log.')),
  T('feedback-foot', '.feedback-foot > summary', tx('Found a bug or have an idea? Open this, on any tab, to send it with the tab you are on.')),
  T('chip-sim', D('chip-sim'), tx('Sim: the routine calls and the turning points are made for you; it stops only for the big ones. It opens after an All-Star career on every difficulty.')),
  T('sim-calls', D('sim-calls'), tx('The turning points Sim decided for you since your last move, and how each went.')),
  T('comet-reel', D('comet-reel'), tx('A Comet career keeps a page only for the biggest nights; the rest of the story waits here.')),
  T('chip-fast', D('chip-fast'), tx('Fast break: quick seasons, and each tab folds its extra cards. You still make every real call.')),
  T('chip-simple', D('chip-simple'), tx('Simple text: the explanations go, on every tab.')),
  T('chip-guide', D('chip-guide'), tx('Guide mode: this tour.')),
  T('chip-master', D('chip-master'), tx('Master mode: no hints or recommendations anywhere.')),
  T('chip-playoffs', D('chip-playoffs'), tx('Play playoff games yourself, or let them be simulated.')),
  T('fold', '.fold-toggle', tx('Fast break folded some cards away. This brings them back for a look.')),
  T('coach-home', D('coach-home'), tx('Your head coach: his temperament, how much he trusts you, and once a season a knock on his door to ask for a bigger role.')),
  T('record-watch', D('record-watch'), tx('A record within reach this season. Chase it for a few more shots, or let it come.')),
  T('rival', D('rival'), tx('Your rival: who, the head to head, and the race season by season.')),
  T('settings-btn', D('settings-btn'), tx('Settings: look, New career and the switches.')),
  T('set-theme', D('set-theme'), tx('Light, dark, or follow your device.')),
  T('set-court', D('set-court'), tx('The page background.')),
  T('set-text', D('set-text'), tx('Text size: Large and Extra large make every word bigger.')),
  T('set-new', D('set-new'), tx('Leaves this career for a new one (it asks first). The career stays saved in the career log, ready to continue.')),
  T('set-fast', D('set-fast'), tx('Fast break, also here.')),
  T('set-playoffs', D('set-playoffs'), tx('Off: postseason games are simulated.')),
  T('set-simple', D('set-simple'), tx('Simple text, also here.')),
  T('set-guide', D('set-guide'), tx('Guide mode: this tour, then the next thing to do.')),
  T('set-master', D('set-master'), tx('Master mode: no hints or recommendations anywhere.')),
  T('set-sfx', D('set-sfx'), tx('Sound effects on or off, and how loud.')),
  T('set-announcer', D('set-announcer'), tx('The announcer: a deep voice for the big plays. It follows the sound effects.')),
  T('set-music', D('set-music'), tx('Music: a chiptune loop for each part of the game, every level and league, the offseason and each mini-game, with its own volume.')),
  T('around', D('around'), tx('Around you: the MVP race, your duo, the rivalry, the league and the fans’ talk, each a tab. It opens on what matters most right now.')),
  T('stories', '.fold-head', tx('Around the league: this season’s storylines. Call how they end for reputation.')),
  T('tab-season', D('tab-season'), tx('Season, at the arena: your team and the whole league in one, the most worth a look first.')),
  T('season-standings', D('season-standings'), tx('The standings, your conference first. The dashed line is the playoff cut.')),
  T('season-leaders', D('season-leaders'), tx('The league leaders. You are marked when you make the list.')),
  T('season-city', '.city-card', tx('Your city and its fans, and what they do to you.')),
  T('season-games', D('season-games'), tx('Every game you played.')),
  T('locker', D('locker'), tx('The locker room: click in, walk with A and D, talk with Space. Each teammate and the coach once a half: chemistry, mood and trust.')),
  T('strength', D('strength'), tx('Why your team is as good as it is: teammates, you, and every team factor.')),
  T('bracket', '.bracket', tx('The playoff bracket.')),
  T('tab-player', D('tab-player'), tx('Player, at home: ratings, status, kits, scouting and your body. Your home grows with the bank.')),
  T('place-agent', D('place-agent'), tx('The agent’s office (a pro only): your contract and money, on the Player page.')),
  T('kits', '.kits', tx('Tap a kit to dress your player in it.')),
  T('scout', '.scout-card', tx('Where the scouts think you peak, and your odds.')),
  T('bodymap', D('body'), tx('The Body panel: height and where it is headed, weight, the free-throw touch, the weak hand, and the body map (what training built, where you got hurt; hover a muscle).')),
  T('name-card', D('name-card'), tx('Your nickname, and your brand deal. The nickname’s logo is drawn with your first brand deal.')),
  T('staff', D('staff'), tx('Your staff: a talk once a season adds a small edge; give a raise, or let them go.')),
  T('wardrobe', D('wardrobe'), tx('Your accessories: tap a colour to wear it, or None to take it off.')),
  T('collection', D('collection'), tx('Everything you bought. Visit as often as you like; the first visit each season gives a small edge.')),
  T('roster', D('roster'), tx('Your roster: the five, the bench, the team’s system, and how well it all fits (team chemistry).')),
  T('record-book', D('record-book'), tx('Champions and award winners, year by year.')),
  T('tab-records', D('tab-records'), tx('Records, at the hall: your whole career.')),
  T('tab-extras', D('tab-extras'), tx('Extras, at the arcade: the mini-games, the career log, the achievement book and the community, without leaving the career.')),
  T('run-ach', D('run-ach'), tx('How many this career has earned. The book opens on them, at the top.')),
  T('extras-limits', D('extras-limits'), tx('What waits for the start page while a career is on.')),
  T('timeline', '.tl-chart', tx('Your OVR season by season. Tap a season for its story.')),
  T('trophies', D('trophies'), tx('Your trophies. Tap a banner for details.')),
  T('hub', '.hub-grid', tx('Pick a game. Locked ones say what they need.')),
  T('dunk-moves', '.dunk-chips', tx('Build the dunk part by part. Each move can be shown once a contest.')),
  T('sb-moves', '.sb-moves', tx('Pick the play. Drives and pull-ups go to the timing meter and the action cam.')),
  T('ld-keys', '.ld-keys', tx('A blocks, S steals. Press as a note crosses the line, and hold the long ones.')),
  T('mvp', '.mvp-race', tx('The MVP race: the leaders and how close you are.')),
  T('duo', '.duo-card', tx('Your duo or Big Three: chemistry with teammates.')),
  T('move-focus', `${D('move-focus')}:not(:disabled)`, tx('A breakthrough season: pick new focus stats.')),
  T('move-position', `${D('move-position')}:not(:disabled)`, tx('Move one spot on the floor.')),
  T('move-roster', `${D('move-roster')}:not(:disabled)`, tx('Your starting five: recruit a starter for any position.')),
  T('move-style', `${D('move-style')}:not(:disabled)`, tx('Set how your team plays, in a talk with the coach.')),
  T('move-trade', `${D('move-trade')}:not(:disabled)`, tx('Ask for a trade, and aim it.')),
  T('move-number', `${D('move-number')}:not(:disabled)`, tx('Change your number.')),
  T('move-retire', `${D('move-retire')}:not(:disabled)`, tx('Retire, between any two seasons.')),
  T('move-farewell', `${D('move-farewell')}:not(:disabled)`, tx('Announce next season as your last: a farewell tour, gifts on the road, then you retire.')),
  T('card-download', D('card-download'), tx('Download your career card as an image.')),
  T('retire-new', D('retire-new'), tx('Start the next career. This one stays in your log.')),
  T('mp-board', '.mp-board', tx('Your challenge’s or class’s leaderboard, beside every tab, with your career so far. Careers with friends count here, not on the community’s boards.')),
  T('mp-friends', '.mp-friends', tx('Friends in this career: your rival and your record against them, and any classmate on your team (a duo of friends, or a Big Three).')),
  T('mp-chat', '.mp-chat', tx('The chat for this challenge or class: its people only, a line at a time, with the class news.')),
  T('mp-watch', 'td > .link-btn', tx('Tap a friend to watch his career season by season.')),
  T('mp-react', '.mp-react-bar', tx('React to a classmate’s season: one of four, tap it again to take it back.')),
  T('mp-reunion', '.mp-reunion, .mp-reunion-wait', tx('Reunion night: when every career is over, the awards come out one by one, the class MVP last.')),
  T('mp-daily', '.mp-daily', tx('Today’s daily challenge among your friends.')),
  T('mp-challenge', D('mp-challenge'), tx('Challenge a friend: they play this same prospect from the same start, and both cards go side by side.')),
  T('community-note', D('community-note'), tx('What this career qualifies for: the leaderboards, the Reality 99 hall, a statue.')),
  T('next-gen', D('next-gen'), tx('Your son’s career, at Comet speed. A quarter of his legacy points join yours.')),
  T('statue-raise', D('statue-raise'), tx('A Regular guy career with 150+ legacy can raise a statue in the plaza.')),
  T('log-entry', '.log-entry', tx('Show, download or delete any card.')),
];

const ROAD = ['offers', 'commit', 'eu', 'int', 'gl', 'min', 'youth', 'prep', 'promote', 'culture', 'transfer', 'assign'];
/** The tour step for a decision, by its kind. */
export function tourKind(kind: string): string | undefined {
  if (kind === 'info') return undefined;
  if (kind === 'plan' || kind === 'shop' || kind === 'summer' || kind === 'live' || kind === 'national' || kind === 'arc' || kind === 'press' || kind === 'brand') return `d-${kind}`;
  if (kind === 'retirePrompt') return 'd-retire';
  if (kind === 'chaserRole') return 'd-chaser';
  if (ROAD.includes(kind)) return 'd-road';
  if (kind === 'draft' || kind === 'declare' || kind === 'withdraw') return 'd-draft';
  return 'd-event';
}

const KEY = 'btr-tour-seen';
function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
function saveSeen(s: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    // without storage the tour simply starts over next time
  }
}

/** From the guide sheet: every step shows again. */
export function resetTour(): void {
  saveSeen(new Set());
  window.dispatchEvent(new Event('btr-tour-reset'));
}

const shown = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  // round 37: the top bar's row of tabs keeps its size while the town stands in for it (it is only
  // hidden), so a hidden match never takes the ring from the place in the town
  return r.width > 0 && r.height > 0 && !(el as HTMLButtonElement).disabled && getComputedStyle(el).visibility !== 'hidden';
};

export function GuideTour() {
  // round 27: not over the intro page, nor while a tab's news is up (TabNews)
  // round 33: never in the tutorial, which has its own guide (Guide mode stays for after it)
  const on = useStore((s) => s.guide && !s.master && !s.intro && !s.finale && !s.spots && !inTutorial(s.road) && !s.game?.flags.level);
  const [seen, setSeen] = useState(loadSeen);
  const [cur, setCur] = useState<{ step: Step; el: HTMLElement } | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [tipH, setTipH] = useState(140);

  const done = useCallback((ids: string[]) => {
    setSeen((s) => {
      const n = new Set(s);
      ids.forEach((id) => n.add(id));
      saveSeen(n);
      return n;
    });
  }, []);

  useEffect(() => {
    const reset = () => setSeen(new Set());
    window.addEventListener('btr-tour-reset', reset);
    return () => window.removeEventListener('btr-tour-reset', reset);
  }, []);

  // the first step not seen yet whose control is on screen (inside an open dialog, if there is one)
  useEffect(() => {
    if (!on) {
      setCur(null);
      return;
    }
    let raf = 0;
    const find = () => {
      raf = 0;
      const modal = [...document.querySelectorAll('[aria-modal="true"]')].pop();
      for (const step of TOUR) {
        if (seen.has(step.id)) continue;
        const el = [...document.querySelectorAll<HTMLElement>(step.sel)].find((e) => shown(e) && (!modal || modal.contains(e)));
        if (el) {
          setCur((c) => (c && c.step === step && c.el === el ? c : { step, el }));
          return;
        }
      }
      setCur(null);
    };
    const later = () => {
      if (!raf) raf = requestAnimationFrame(find);
    };
    find();
    const mo = new MutationObserver(later);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-expanded', 'aria-modal'] });
    // round 37: the town scrolling in or out swaps which row of tabs shows (html.town-out)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', later);
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', later);
    };
  }, [on, seen]);

  // the plain next-step highlight waits while a step is up
  useEffect(() => {
    useStore.setState({ tour: !!cur });
  }, [cur]);

  // follow the control as the page moves; a click on it counts as seen, and so does a step that
  // was on screen a few seconds before its control went away (the player moved on with a key)
  useEffect(() => {
    if (!cur) {
      setBox(null);
      return;
    }
    const at = Date.now();
    // round 36: a folded card opens for a look, a tab of a card's tabs shows its own (fold.ts)
    spot(cur.el);
    cur.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    let raf = 0;
    const tick = () => {
      const r = cur.el.getBoundingClientRect();
      setBox((b) => (b && b.x === r.left && b.y === r.top && b.w === r.width && b.h === r.height ? b : { x: r.left, y: r.top, w: r.width, h: r.height }));
      raf = requestAnimationFrame(tick);
    };
    tick();
    const click = (e: MouseEvent) => {
      if (cur.el.contains(e.target as Node)) done([cur.step.id]);
    };
    document.addEventListener('click', click, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('click', click, true);
      if ((!cur.el.isConnected || !shown(cur.el)) && Date.now() - at > 2500) done([cur.step.id]);
    };
  }, [cur, done]);

  // while a step is up, Enter or Space means "Got it" and nothing else (owner: "pressed enter for
  // got it but ended up skipping an event", then "both space and enter, prioritizing them over
  // other actions"): caught before the game's own keys, the meters and any focused button
  useEffect(() => {
    if (!cur) return;
    const key = (e: KeyboardEvent) => {
      if ((e.key !== 'Enter' && e.key !== ' ') || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      done([cur.step.id]);
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [cur, done]);

  useLayoutEffect(() => {
    if (tip.current && tip.current.offsetHeight !== tipH) setTipH(tip.current.offsetHeight);
  });

  if (!cur || !box) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(320, vw - 24);
  const left = Math.max(12, Math.min(vw - w - 12, box.x + box.w / 2 - w / 2));
  const below = box.y + box.h + 14;
  const above = box.y - 14 - tipH;
  const top = below + tipH < vh - 8 ? below : above > 8 ? above : Math.max(8, Math.min(vh - tipH - 8, box.y + 12));
  const n = TOUR.filter((s) => seen.has(s.id)).length + 1;
  return createPortal(
    <>
      <div className="tour-ring" style={{ left: box.x - 6, top: box.y - 6, width: box.w + 12, height: box.h + 12 }} aria-hidden="true" />
      <div className="tour-tip" ref={tip} role="note" style={{ left, top, width: w }}>
        <div className="kicker">{t('Guide · {n} of {total}', { n, total: TOUR.length })}</div>
        <p>{t(cur.step.text)}</p>
        <div className="tour-row">
          <button className="btn small" onClick={() => done([cur.step.id])}>
            {t('Got it')} <kbd className="tour-key">Enter</kbd>
          </button>
          <button className="link-btn" onClick={() => done(TOUR.map((s) => s.id))}>
            {t('Skip the tour')}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
