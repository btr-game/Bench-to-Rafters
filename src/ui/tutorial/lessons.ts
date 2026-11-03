// The tutorial guide's lessons (round 33, owner: "in the tutorial, another guide is there. this guide
// covers everything in the original guide (by the end of the tutorial, the user should know every
// function as if they've read through the project summary), and the guide steps are unskippable
// (cant do other actions when guide is telling the user to do smth). i guess the very few things
// that the guide can leave out is achievements, career log, and community").
//
// Each lesson points at one control. While it is up, nothing else on the page responds: a lesson
// to read waits for Got it; a lesson to do (`act`) waits for that control to be used. A lesson shows
// when its control is on screen (and `after` is done), in the order listed, so the ones for later
// systems wait for them to turn up. The closing tour stages a career for whatever a player's own
// levels never showed (tutorial/closing.ts), so every lesson is met by the end.
// Round 40: each lesson's English is marked tx(); Lessons.tsx shows it in the player's language.

import { tx } from '../../i18n';

export type Where = 'beginner' | 'intermediate' | 'advanced' | 'tour' | 'graduated';

export interface Lesson {
  id: string;
  at: Where;
  sel: string;
  text: string;
  /** The player uses the control to go on (otherwise: Got it). */
  act?: true;
  /** Shown only once this lesson is done. */
  after?: string;
}

const D = (id: string) => `[data-tour="${id}"]`;
const L = (at: Where, id: string, sel: string, text: string, o: { act?: true; after?: string } = {}): Lesson => ({ id, at, sel, text, ...o });
const B = (id: string, sel: string, text: string, o?: { act?: true; after?: string }) => L('beginner', id, sel, text, o);
const I = (id: string, sel: string, text: string, o?: { act?: true; after?: string }) => L('intermediate', id, sel, text, o);
const A = (id: string, sel: string, text: string, o?: { act?: true; after?: string }) => L('advanced', id, sel, text, o);
const T = (id: string, sel: string, text: string, o?: { act?: true; after?: string }) => L('tour', id, sel, text, o);

export const LESSONS: Lesson[] = [
  // ---------- beginner: the essence of a career ----------
  B('b-name', '#f-name', tx('Your name and jersey number. The number can change between seasons, and the one you retire in is the one that hangs.')),
  B('b-look', '.look-picker', tx('Your look: skin, hair and face. He looks like this everywhere in the game.')),
  B('b-pos', '.pos-cards', tx('Your position. Each has its own heights and kinds of player.')),
  B('b-next', D('create-next'), tx('Next: a last look at him.'), { act: true }),
  B('b-start', D('create-start'), tx('Start his senior year.'), { act: true }),
  B('b-moment', '.moment-btn', tx('A story page: the big days get one. Read it, then carry on (Enter works too).'), { act: true }),
  B('b-todo', '.todo-now', tx('To do: what the game is waiting for now. Tap it to jump there.')),
  B('b-ovr', '.pc-head', tx('OVR: how good he is overall, out of 99. An NBA All-Star is about 80.')),
  B('b-facts', '.pc .facts', tx('Who he is now: age, role on the team, reputation, health, the scouts’ grade and his bank.')),
  B('b-meters', '.pc .meters', tx('Morale, coach trust, reputation and body wear. They move with how the season goes and with what you choose.')),
  B('b-plan', D('d-plan'), tx('Pick a plan for the season: it decides which ratings grow, and what it costs his body.'), { act: true }),
  B('b-go', '.main-go', tx('Play on: the next step of the season. Enter does the same.'), { act: true, after: 'b-plan' }),
  B('b-risk', `${D('d-event')} .risk`, tx('A risk tag: how swingy a choice is. Low is steady; high can go very well or very badly.')),
  B('b-event', D('d-event'), tx('A turning point. Pick how he responds; the result is rolled every time.'), { act: true, after: 'b-risk' }),
  B('b-result', '.result-card', tx('How it went, and what it changed.')),
  B('b-shop', D('d-shop'), tx('The shop: three things this summer, and you can buy one. Or leave with the money (Enter).'), { act: true }),
  B('b-tab-player', D('tab-player'), tx('The Player tab: everything about him.'), { act: true, after: 'b-go' }),
  B('b-next-step', '.next-step', tx('From any other tab, this carries the game on.'), { after: 'b-tab-player' }),
  B('b-ratings', D('ratings'), tx('His eight ratings: together they make his OVR. The dashed shape is where the season started.'), { after: 'b-tab-player' }),
  B('b-status', D('status'), tx('Morale, coach trust, reputation and body wear, with what moves them.'), { after: 'b-ratings' }),
  B('b-tab-home', D('tab-home'), tx('Back to Home.'), { act: true, after: 'b-status' }),
  B('b-scout', '.scout-card', tx('The scouts: where they think he peaks, and his odds of the big things.'), { after: 'b-tab-home' }),
  B('b-coach', D('coach-home'), tx('His head coach: a name, a face and a temperament that changes his season.'), { after: 'b-tab-home' }),
  B('b-meter', D('live-meter'), tx('His first NBA playoffs, and the last shot. Stop the meter in the green: a perfect release makes it much likelier to drop.')),
  B('b-settings', D('settings-btn'), tx('Settings.'), { act: true, after: 'b-coach' }),
  B('b-theme', D('set-theme'), tx('Light, dark, or follow your device.'), { after: 'b-settings' }),
  B('b-text', D('set-text'), tx('Text size: Large and Extra large make every word bigger.'), { after: 'b-theme' }),
  B('b-sound', D('set-sfx'), tx('Sound effects, and how loud.'), { after: 'b-text' }),
  B('b-music', D('set-music'), tx('Music: a loop for each part of the game, with its own volume.'), { after: 'b-sound' }),
  B('b-feedback', '.feedback-foot > summary', tx('Found a bug or have an idea? Open this on any page to send it.'), { after: 'b-music' }),
  B('b-end', D('level-end'), tx('The end of the level: the goal, and a few numbers.')),

  // ---------- intermediate: more of the game ----------
  I('i-adds', D('level-adds'), tx('What this level adds.')),
  I('i-arch', '.arch-cards', tx('Archetype: the kind of player he starts as, each with its own ratings.')),
  I('i-focus', '.focus-grid', tx('Pick two focus stats: they grow almost twice as fast.')),
  I('i-offers', D('d-road'), tx('His offers. Pick where he plays: minutes matter most for growth.'), { act: true }),
  I('i-plan', D('d-plan'), tx('One or two plans a season, from all twelve. The first you tap is the main plan; a second adds a smaller boost.'), { act: true }),
  I('i-summer', D('d-summer'), tx('The summer program: one focus for the offseason.'), { act: true }),
  I('i-modes', D('modes'), tx('How you play: the switches this level has.')),
  I('i-fast', D('chip-fast'), tx('Fast break: quick seasons, and you still make every real call. Switch it off to see every step.'), { after: 'i-modes' }),
  I('i-tab-season', D('tab-season'), tx('The Season tab: your team and the whole league.'), { act: true, after: 'i-plan' }),
  I('i-strength', D('strength'), tx('Why the team is as good as it is: teammates, him, and every team factor.'), { after: 'i-tab-season' }),
  I('i-standings', D('season-standings'), tx('The standings. The dashed line is the playoff cut.'), { after: 'i-tab-season' }),
  I('i-leaders', D('season-leaders'), tx('The league leaders. He is marked when he makes the list.'), { after: 'i-tab-season' }),
  I('i-games', D('season-games'), tx('Every game he played.'), { after: 'i-tab-season' }),
  I('i-bracket', '.bracket', tx('The playoff bracket.'), { after: 'i-tab-season' }),
  I('i-home', D('tab-home'), tx('Back to Home.'), { act: true, after: 'i-standings' }),
  I('i-live', D('d-live'), tx('A playoff game. Play it, picking a tactic each quarter, or simulate it.'), { act: true }),
  I('i-talks', D('talks'), tx('Contract talks: ask for more money, a year or a bigger role. Two asks; push too hard and they pull the offer.')),
  I('i-brand', D('d-brand'), tx('A brand wants him: a fixed deal, his own signature line, or not yet.'), { act: true }),
  I('i-name', D('name-card'), tx('His nickname, and his brand. The logo is drawn with his first brand deal.')),
  I('i-rival', D('rival'), tx('His rival: who, the head to head, and the race season by season.')),
  I('i-mvp', '.mvp-race', tx('The MVP race: the leaders, and how close he is.')),

  // ---------- advanced: nearly all the rest ----------
  A('a-adds', D('level-adds'), tx('What this level adds.')),
  A('a-nation', '.nation-grid', tx('His country sets his road to the pros; below it, his hand (lefties are rarer, so defenders see them less).')),
  A('a-road', D('d-road'), tx('Every road to the pros: college, the G League, clubs abroad.'), { act: true }),
  A('a-plan', D('d-plan'), tx('Plans for each half now: one or two, then again at midseason.'), { act: true }),
  A('a-arc', D('d-arc'), tx('A storyline: a chapter each summer, and your answer shapes the next.'), { act: true }),
  A('a-tab-player', D('tab-player'), tx('The Player tab.'), { act: true, after: 'a-plan' }),
  A('a-body', D('body'), tx('His body: what training built and where he got hurt (hover a spot). Every body has a best playing weight.'), { after: 'a-tab-player' }),
  A('a-kits', '.kits', tx('Tap a kit to dress him in it.'), { after: 'a-tab-player' }),
  A('a-roster', D('roster'), tx('His team: the five, the bench, the system, and how well it all fits.'), { after: 'a-tab-player' }),
  A('a-staff', D('staff'), tx('His staff: a talk once a season adds a small edge; give a raise, or let them go.'), { after: 'a-tab-player' }),
  A('a-wardrobe', D('wardrobe'), tx('Accessories from the shop: tap one to wear it.'), { after: 'a-tab-player' }),
  A('a-collection', D('collection'), tx('Everything he bought. The first visit each season gives a small edge.'), { after: 'a-tab-player' }),
  A('a-home', D('tab-home'), tx('Back to Home.'), { act: true, after: 'a-roster' }),
  A('a-coach', D('coach-home'), tx('Once a season, knock on the coach’s door to ask for a bigger role.'), { after: 'a-home' }),
  A('a-sim', D('chip-sim'), tx('Sim: the season plays itself, turning points included; it stops for the big calls (offers, the draft, contracts).'), { after: 'a-home' }),
  A('a-sim-calls', D('sim-calls'), tx('The calls Sim made for him, and how each went.')),
  A('a-focus', `${D('move-focus')}:not(:disabled)`, tx('A breakthrough season: he may pick new focus stats this summer.')),
  A('a-position', `${D('move-position')}:not(:disabled)`, tx('Move one spot on the floor (two if his height fits).')),
  A('a-number', `${D('move-number')}:not(:disabled)`, tx('Change his number.')),
  A('a-style', `${D('move-style')}:not(:disabled)`, tx('NBA starters: set how the team plays, in a talk with the coach.')),
  A('a-trade', `${D('move-trade')}:not(:disabled)`, tx('Ask for a trade, and aim it: a contender, the champions, his rival.')),
  A('a-five', `${D('move-roster')}:not(:disabled)`, tx('His team’s first option: recruit a starter for any position.')),
  A('a-crunch', D('live-crunch'), tx('Crunch time in a close final: the last two minutes are his, trip by trip. His ball: pick the play. Theirs: call the defense.')),
  A('a-clutch', D('clutch-play'), tx('The biggest finals end on the action cam: pick a move on each big possession, then stop the meter.')),

  // ---------- the closing tour: the systems no level has ----------
  T('t-season', D('tab-season'), tx('A star’s career, already under way. The Season tab.'), { act: true }),
  T('t-locker', D('locker'), tx('The locker room: click in, walk with A and D, talk with Space. Each teammate and the coach once a half: chemistry, mood and trust.'), { after: 't-season' }),
  T('t-city', '.city-card', tx('Every NBA city has a culture, and its fans: they help or hurt him each half.'), { after: 't-season' }),
  T('t-home', D('tab-home'), tx('Back to Home.'), { act: true, after: 't-locker' }),
  T('t-stories', '.fold-head', tx('Around the league: this season’s storylines. Call how they end for reputation.'), { after: 't-home' }),
  T('t-duo', '.duo-card', tx('A duo or a Big Three: chemistry with the teammates he plays best with.'), { after: 't-home' }),
  T('t-record', D('record-watch'), tx('Record watch: a legend on the scoring list, or a league record, within reach. Chase it if you like.')),
  T('t-press', D('d-press'), tx('A press conference: humble, confident or fiery. Each tone does something different.'), { act: true }),
  T('t-undo', D('undo'), tx('Undo: takes back his last choice or step (U on a keyboard).')),
  T('t-national', D('d-national'), tx('A national team call: medals and fame, at the cost of rest.'), { act: true }),
  T('t-love', D('d-arc'), tx('Love: a sweetheart, then maybe a wedding and a family. Retire with a son and you can play his career.'), { act: true }),
  T('t-farewell', `${D('move-farewell')}:not(:disabled)`, tx('From 32: announce next season as his last. Arenas say goodbye, then he retires.')),
  T('t-retire', D('d-retire'), tx('Keep playing, retire, or chase a ring as a veteran specialist on a contender.')),
  T('t-records', D('tab-records'), tx('The Records tab: his whole career.'), { act: true }),
  T('t-timeline', '.tl-chart', tx('His OVR season by season. Tap a season for its story.'), { after: 't-records' }),
  T('t-trophies', D('trophies'), tx('Banners, rings and trophies. Tap one for the details.'), { after: 't-records' }),
  T('t-extras', D('tab-extras'), tx('The Extras tab: the mini-games (and, once the full game is open, the career log, the achievement book and the community), without leaving the career.'), { act: true, after: 't-timeline' }),
  T('t-back', D('tab-home'), tx('Back to Home.'), { act: true, after: 't-extras' }),
  T('t-modes', D('modes'), tx('How you play, every switch in one place.'), { after: 't-back' }),
  T('t-simple', D('chip-simple'), tx('Simple text: the explanations go, on every tab.'), { after: 't-modes' }),
  T('t-master', D('chip-master'), tx('Master mode: no hints or recommendations anywhere. You read the game yourself.'), { after: 't-simple' }),
  T('t-guide', D('chip-guide'), tx('Guide mode: after the tutorial, it points out the next thing to do, if you ever need it.'), { after: 't-master' }),
  T('t-manual', D('guide-btn'), tx('The manual: every feature in a few short points.'), { after: 't-guide' }),
  T('t-settings', D('settings-btn'), tx('Settings, once more.'), { act: true, after: 't-manual' }),
  T('t-new', D('set-new'), tx('New career: leaves this one for a new one. The career stays saved, ready to continue.'), { after: 't-settings' }),
  T('t-son', D('next-gen'), tx('His son’s career, at Comet speed. A share of the son’s legacy joins his father’s.')),
  T('t-card', D('card-download'), tx('The career card: save it as an image.')),

  // ---------- after graduation ----------
  // round 37: the start page is the main land, a flight from the road map
  L('graduated', 'g-land', D('mainland'), tx('The main land: the full game, a place for each part of it. Click a place, or move between them with the arrow keys; Enter opens its card.')),
  L('graduated', 'g-regular', D('mode-regular'), tx('The gym is Regular guy, the full game. Start your first career here: recommended.')),
];

