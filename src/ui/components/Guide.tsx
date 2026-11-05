// The guide (playtest round 7: "some functions are hard to recognize"): every feature, what
// it does and where it lives, one tap from the header.

import { Icon } from '../art/Icon';
import { GUIDE_ICON } from '../art/icons';
import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { canChangeFocus, prompt } from '../../engine/flow';
import { canRecruit } from '../../engine/career/recruit';
import { canSetStyle, currentStyle } from '../../engine/career/identity';
import type { GameState } from '../../engine/types';
import { resetTour } from './GuideTour';
import { t, tx } from '../../i18n';

// round 40: the manual's English is marked with tx() and shown in the player's language with t();
// a heading that is a name (a mini-game, a challenge, a tab, a place, an award, OVR) stays English
// in every language (owner), so it is marked asIs() and shown as it is.
const AS_IS = new Set<string>();
const asIs = (en: string): string => (AS_IS.add(en), en);
const shown = (en: string): string => (AS_IS.has(en) ? en : t(en));

// round 15: the manual is cards under big headers; round 24 (owner: "the guide is too text heavy,
// make them into bullet points, not too many examples"): each card is a few short bullets. The
// first bullet shows on the card; tap it for the rest.
const SECTIONS: { title: string; where: string; items: [string, string[]][] }[] = [
  {
    title: tx('Getting around'),
    where: tx('The top bar'),
    items: [
      [tx('The town'), [tx('In a career the pages are places on a street: the gym is Home, the arena the Season tab, where you live the Player tab, the hall Records and the arcade Extras. As a pro, the agent’s office opens your contract and money.'), tx('Click a place and you walk to its door as it opens. Or Tab into the town, walk with the arrow keys or A and D, and press Enter to go in.'), tx('Your hometown in high school, the campus in college, your team’s city as a pro or a city abroad; night in the dark theme. Your home grows with the bank: an apartment, a house, a mansion.'), tx('Every NBA arena is its own, with its team’s emblem over the doors and a landmark of its city beside it. Title banners, your car, a court at home and, at the very end, your statue show up on the street.'), tx('A ! over a place means something new is there: going in takes you to it, rings it and waits for Got it (Enter or Space).'), tx('Scrolled down, the row of tabs comes back in the top bar; on a phone it stays at the bottom too.')]],
      [tx('Next step'), [tx('On any other tab, this button carries the game on.'), tx('Looking around never stops the game.')]],
      [tx('To do'), [tx('The top of Home: what the game is waiting for now.'), tx('Also lists anything new worth a look. Tap to jump to it.')]],
      [tx('Saving'), [tx('Up to ten careers save on this device, each after every move, and each is a card in the career log.'), tx('In progress: Continue. Finished: Look back. Both have Code and Delete. With all ten taken, a finished one makes room first.'), tx('Code copies a career as text, to send the maker with a bug report: they can open it exactly as it is.'), tx('If a screen ever fails to draw, a card says so in its place and offers a way on (Skip, Undo, Home or Back to the start), with one line to send with your feedback. The rest of the career carries on.')]],
      [tx('Folding cards'), [tx('Most cards fold: tap a card’s title, or the small tab on its top edge, to fold it to one line; tap again to open it.'), tx('Folds stay as you left them on this device, season to season and career to career. Every card starts open.'), tx('The main card, To do, your player card, the offseason moves and the career card never fold.')]],
      [tx('Settings'), [tx('Theme, court background, text size (Normal, Large, Extra large), sound effects and music each with a volume slider, the announcer, your username, then New career (the career you leave stays in the career log; a finished one plays its finale first).'), tx('Switches: Fast break, playable playoff games, Simple text, Guide mode, Master mode.')]],
      [tx('Undo'), [tx('Changed your mind? Undo on Home (or U) takes back your last choice or step, and says which.'), tx('One step back, not more. Off for Rough Road, Comet, the daily challenge and careers with friends, so their boards stay fair, and once a career has ended.')]],
      [tx('How you play'), [tx('A card on Home with every mode as a switch.'), tx('Sim: makes the routine calls (plans, summers, call-ups, press) and the turning points (the first choice that is not high risk), and lists the calls it made on Home. It stops for the big ones: offers, the draft, contracts, brands, storylines, retiring.'), tx('Sim opens once you have played a career to retirement with an NBA All-Star team on every difficulty: Regular guy, Reality hits hard and Shoot for the stars (a Comet does not count). Until then its chip says what is still to go.'), tx('Fast break: quick seasons; each tab folds its extra cards behind "Show everything".'), tx('Simple text: hides the explanations on every tab, but keeps the season’s averages in one line on Home, and every result.')]],
      [tx('Guide mode'), [tx('Walks you through every button once, step by step.'), tx('New things get their step the first time they unlock.'), tx('Then it highlights the next thing to do. Turn it on here, in Settings or on How you play.')]],
      [tx('Master mode'), [tx('No recommendations anywhere: no scouts’ calls, fit tags, suggested deals or hints.'), tx('In Settings or on How you play.')]],
      [tx('Pages'), [tx('The career log, the achievement book, the community, Play with friends and the mini-games open as pages of their own (in a career, from the Extras tab).'), tx('Top left says where Back goes; next to it, where you are. Escape goes back too.')]],
      [tx('Keyboard'), [tx('Enter: the main button (skips a final to the buzzer first).'), tx('1–9, 0, - and =: pick a choice. Space: stop a timing meter.'), tx('H S P R E: the town’s places (the tabs). In the town, the arrow keys or A and D walk and Enter goes in. U: undo the last choice. Esc: back from a page, or close a menu.')]],
      [tx('Sound'), [tx('Chiptune sound effects, and music on from your first click or key (browsers keep sound off until then; the intro has a Play the music button).'), tx('The announcer: the deepest voice your device has, slowed down, with a breath before the big word and the arena’s thump under it, for the big plays on the court (a block, a steal, a dunk, a three, a buzzer beater) and for a title or a breakthrough. It follows the sound effects and has its own switch in Settings.'), tx('A loop for each part of the game: bright ones for the intro and the finale’s thank-you, a theme for each of the finale’s twelve endings, the start page, high school, college, each league, a laid-back one for every offseason, one for the end of a career, one for Play with friends and one for each mini-game (Lockdown keeps its own beat).'), tx('Both switch in Settings, each with its own volume.')]],
      [tx('Loading'), [tx('When a step takes a moment, your player dribbles in the corner until it is ready.')]],
      [tx('Language'), [tx('English, Korean, Chinese, Japanese, Spanish or French, in Settings. The game’s own words change; the names of teams, players, places, awards and modes stay in English, and so does what happens in a career (the turning points, the news, the log).')]],
    ],
  },
  {
    title: asIs('The road map'),
    where: tx('The tutorial, then the main land’s airport'),
    items: [
      [tx('The tutorial'), [tx('Every device starts with the beginner level (high school): a short career at fast break’s pace with one goal, an NBA All-Star team in 5 NBA seasons. Goal or not, the level is passed.'), tx('It keeps to the essentials: Home (plans, turning points, the coach, the scouts) and a Player tab of ratings and status.'), tx('Then graduation, and the full game opens with Regular guy.')]],
      [tx('Lessons'), [tx('The tutorial guide shades the page but for one control and says what it does: Got it (Enter or Space) to read on, or use the control.'), tx('One lesson at a time, none skipped.')]],
      [tx('Opening the rest'), [tx('The road map’s other stops each open a part of the game: intermediate (college, 6 NBA seasons) opens Reality hits hard, advanced (the NBA arena, 7) opens Shoot for the stars, and the island opens the mini-games.'), tx('Click a place, or drive to it with the arrow keys, and its card pops out of the map (Enter opens it, Escape folds it away); each card says what it opens.'), tx('Until then the locked cards on the start page say which stop opens them. A device that finished the old tutorial keeps everything.')]],
      [asIs('The island'), [tx('Every mini-game once, with a C or better in each: the mark to beat is on its card. Built in a lab is one of them.')]],
      [tx('The closing tour'), [tx('A star’s career, stop by stop, for everything no level has (the locker room, duos, the press, love, the farewell tour and more). Any time, from the road map.'), tx('Next stop goes on once a stop’s lessons are done.')]],
      [tx('Graduation'), [tx('The diploma shows the exit code, and the full game opens on this device for good.'), tx('Skip tutorial floats at the top of every tutorial page, lessons included, and takes the code: for another device, or anyone who has played before.')]],
      [tx('Back on the road map'), [tx('In the full game, the main land’s airport flies you back to the road map: play any level again.'), tx('The road map has an airport of its own once beginner is passed: its plane flies you back to the main land.'), tx('Level careers count nowhere: no save slot, career log, achievements or leaderboards.')]],
    ],
  },
  {
    title: tx('Starting a career'),
    where: asIs('The main land'),
    items: [
      [tx('Difficulty'), [tx('Regular guy, Reality hits hard or Shoot for the stars.'), tx('Regular guy is open from the start; the other two open on the road map (their cards say which stop).'), tx('Fixed for the whole career, and always shown by the game’s name.')]],
      [asIs('Rough Road'), [tx('Picking Reality hits hard offers the hardest way to play: the road picks your whole player at random (position, archetype, focus, country, hand, name, number and his look), then master mode with no Fast break, Sim mode or undo, locked for the whole career. Simple text is allowed.'), tx('Such a career carries the mark in the top bar, on the leaderboards, the career log and its own banner when it ends, with achievements of its own.')]],
      [asIs('Comet'), [tx('Picking Shoot for the stars offers Comet: the stars at hyper speed, about five minutes a career.'), tx('Fast break and Sim stay on for the whole career; the game also takes the youth academy\u2019s call and never stops between seasons. You choose where you play, the draft, brand deals and when to retire.'), tx('Draft night, award nights, finals, breakthroughs, storylines and the nickname get a page; the rest is a list of highlights on Home. The career carries the Comet mark, with achievements of its own.')]],
      [tx('Your look'), [tx('On the identity step: skin tone, hair, hair colour and facial hair, shown on your player in a plain white or black jersey with your number; beside him, the back of the jersey with your name and number as you type them.'), tx('No accessories to start: the wardrobe adds what you buy.'), tx('Names keep to letters A to Z (accents become plain letters, as Kovač becomes Kovac); swear words aren’t allowed.')]],
      [tx('Where you start'), [tx('Pick a country for its road to the pros, or Surprise me.'), tx('Hometown and first school are revealed when the career starts.')]],
      [tx('Position, hand and archetype'), [tx('Pick each yourself, or tap Random next to it.'), tx('Each archetype has its own traced action pose.')]],
      [tx('Focus stats'), [tx('Two ratings that grow almost twice as fast.'), tx('Changing them later takes a breakthrough season.')]],
      [asIs('The main land'), [tx('After the beginner level you take the plane to the main land, the start page as a pixel town (the flight plays once on a device; Skip, Enter or Escape lands at once).'), tx('Click a place, or drive between them with the arrow keys, and its card pops out beside it; Enter opens it, Escape closes it.'), tx('The gym is Regular guy, the street court Reality hits hard (with Rough Road), the dome Shoot for the stars (with Comet): each card ends with Make your player.'), tx('His house (while a career is going) continues it; the park is Play with friends; the library the career log; the museum the achievement book; the statue plaza the community; the newsstand What’s new; the cinema the intro; the airport the road map; the dock’s boat the island of mini-games, and, to the north, the old neighbourhood, where story mode starts. Night in the dark theme.')]],
      [asIs('Story mode'), [tx('One career told as a story, from the old neighbourhood on the main land: a written hero, Eli Carter of Dayton, Ohio, a shooting guard on Regular guy’s road, all in the States.'), tx('First name his people (his best friend, a parent, a younger sibling and his rival), or leave a box empty and the game names that one; Skip names them all. A one-word name for the family takes his surname.'), tx('Chapters come at the big moments, about one a summer, each a page with the two of them face to face and two or three answers. The people remember what you said.'), tx('His friend grows with him until the scouts decide: out of the game early, a pro, or a star who passes him, and how far he goes follows your answers. His rival, met in college, is always a small step ahead.'), tx('The People card on the Player tab: where each of them is, how they feel about him, the last thing they remember. They wait for him on his street too, and they are there at the end.')]],
      [tx('Continue'), [tx('His house on the main land, while a career is going, and the career log (the library) open every career, in progress or finished.'), tx('Continue lands on the career’s Home.')]],
      [tx('Intro and What’s new'), [tx('The intro opens every visit: the title over a one-on-one, from a high school gym to the NBA. Intro (top of the main land, or its cinema) plays it again.'), tx('What’s new pops up over the start page once after each update with the latest changes; the What’s new button next to Intro opens it again (a dot means you haven’t opened it yet).')]],
      [tx('Share the game'), [tx('Share (top of every page, at the foot of each tab, and on the finale’s thank-you) gives you the game’s link: copy it, send it with your phone’s share sheet, or post it on X, Reddit, Facebook, WhatsApp or by email.')]],
    ],
  },
  {
    title: tx('Every season'),
    where: tx('Home, the main card in the middle'),
    items: [
      [tx('Plans'), [tx('Pick one or two plans for each half. The first is the main plan.'), tx('One plan alone works a little better.'), tx('Plans shape growth, minutes, injuries, mood and fame.'), tx('Age matters: at 23 or younger, Grind, Spotlight and learning from a vet work better and safer (tagged Young legs); from 30, Recovery and Team first do (tagged Veteran).')]],
      [tx('Turning points'), [tx('Events ask you to choose; the result is rolled each time.'), tx('Green and red chips show what changed.'), tx('The risk tag shows how swingy a choice is.')]],
      [tx('Storylines'), [tx('Some events unfold over several seasons, one chapter each summer.'), tx('Love: a sweetheart, a celebrity or someone outside the game, then a proposal, a wedding and a family (a boy or a girl, half and half). Say not yet at any step.'), tx('Mentor enough rookies in the locker room and one of them may start a storyline of his own.')]],
      [tx('Locker room'), [tx('On the Season tab (under Extras): your starting five, two from the bench and the head coach at his door.'), tx('A and D (or the arrows) walk, Space or Enter talks, 1 to 3 answer, Escape leaves; on a phone, buttons.'), tx('Once a half each. Each teammate has a character (a rookie, a veteran, the star, a joker, a quiet pro, a hothead) and things to say; a hothead may start a feud for you to settle.'), tx('Talks move chemistry (a little, capped each season), mood and coach trust.')]],
      [tx('Head coach'), [tx('Every team has one, with a name, a face and a temperament: a players’ coach (chemistry and mood), a tactician (the postseason) or a hardliner (growth on the grind, bigger swings in trust).'), tx('His card on Home shows how much he trusts you. Once a season you can knock on his door and ask for a bigger role: more likely with more trust, a players’ coach or near the top of the roster. A no costs some trust and mood.'), tx('When his team sinks below .400 he is on the hot seat: back him, stay out of it or, a name in the league, tell the front office. NBA teams under .350 may change coaches in the summer.'), tx('Coach of the Year goes to the coach who beat his roster’s talent by the most. At top reputation in the NBA you can fire your own, from the locker room.')]],
      [tx('Record watch'), [tx('Home warns you when a season could carry you past a legend on the all-time scoring list, or when a career high nears a league record.'), tx('Chase it, once a season: a few more shots, a little more risk, a little less chemistry. Or let it come.')]],
      [tx('Around you'), [tx('One card at Home’s side: the MVP race, your duo, the rivalry, the league’s stories and the fans’ talk, each a tab.'), tx('It opens on what matters most right now (a close MVP race, a new duo or rival, news about you); a tab you pick holds until the season moves on.')]],
      [tx('Around the league'), [tx('The season’s storylines, in Around you, each with what it means for you.'), tx('Before the second half, call how up to three end, for reputation.'), tx('The papers write about you too: trade rumours, MVP buzz, doubts. It moves your next free agency: more or fewer suitors, more or less money.')]],
      [tx('Why it went this way'), [tx('The Season tab breaks your team’s strength down: your teammates, you, and every team factor.'), tx('The season summary shows the same chart.')]],
      [tx('Rival'), [tx('One rival at a time, and it only grows: a draft classmate, then a starter at your position on a rival team, then the player you trade MVP races with.'), tx('Around you, on Home, keeps the head to head.')]],
      [tx('Nickname'), [tx('At Star reputation the media gives you one, from how you look, play and live; the Player tab lights up with it.'), tx('Its two-colour logo is drawn when you sign your first brand deal.')]],
      [tx('Staff'), [tx('Turning points offer a chef, a trainer, a sleep coach and more.'), tx('Each is paid every season for a small edge (Your life, on the Player tab).'), tx('Talk to one once a season for a little more of it (the trainer a touch of athleticism, the chef a fitter body); give a raise or let them go.')]],
      [tx('Fines'), [tx('Pro games can bring a fine: a technical, the referees, a late bus.'), tx('It comes out of the bank, and a page says how much.')]],
      [tx('Weight'), [tx('Every body has a best playing weight (the Body panel, on the Player tab).'), tx('Heavier: stronger inside, slower. Lighter: quicker, easier to push around.'), tx('Plans, injuries, the shop and summers move it.')]],
      [tx('Free throws'), [tx('Your free-throw percentage comes from your shooting and a hidden touch that grows with every season of reps.'), tx('The shooting plan, a shooting summer, a shooting coach, a few turning points and shop items build it faster; the Body panel on the Player tab has its meter.'), tx('FT% shows with your averages on Home, on Records and in the game log.')]],
      [tx('City and fans'), [tx('Every NBA city has a culture that helps or hurts you each half.'), tx('Its fans add a home and playoff edge and react to wins and losses.'), tx('Shown on the Season tab and on every NBA offer.')]],
      [tx('Coach trust and reputation'), [tx('Trust steadies or splits the locker room (team strength).'), tx('Reputation brings better salaries, offers and trade odds.')]],
      [tx('MVP race'), [tx('In the NBA, once you are near the top: the leaders and how close you are.'), tx('The voters want a clear case: you have to be well ahead of the next man, and further ahead for every MVP you have already won.')]],
      [tx('Big swings'), [tx('Rarely, a summer changes a career. The leap (19 to 24) lifts every rating.'), tx('The next step (25 to 33, once, rarer still) lifts them further and raises your ceiling.'), tx('A torn ACL, meniscus and MCL keeps you out one season or two, and you come back a different player: athleticism hit hardest, every ceiling and your potential lower. Very rare.')]],
      [tx('Playoffs and finals'), [tx('When a postseason ends short, its page says it plainly: your team’s finish, then the champion; your series are marked W or L.'), tx('Playable games: a tactic each quarter and the last shot of close games.'), tx('The last shot goes to the timing meter: a perfect release makes it much likelier to drop.'), tx('Switch playable games off in Settings.')]],
      [tx('Crunch time'), [tx('A final within 8 points with two minutes left is yours to finish, trip by trip, on a 3-on-3 court in the arena.'), tx('Your ball: attack the rim, pull up, shoot the three, post up, or draw two and kick it out. Their ball: contest, help at the rim, switch, or gamble for the steal.'), tx('Each trip ends in a big word over the rim. Level at the buzzer: overtime, played the same way. Keys 1 to 5 pick.')]],
      [tx('The last minutes'), [tx('Finals, Olympic and the biggest tournament finals end on the action cam.'), tx('Play them (pick a move, stop the meter in the green), watch them, or skip.'), tx('Good timing earns a clutch rating: a little fame and mood. The result stays as played.')]],
      [asIs('The Floor'), [tx('A conference finals or Finals game that one more loss would end plays its last six minutes on the Floor: a court you steer yourself, both teams in their kits, in the home team’s arena. The first 42 minutes are simulated; then play the six minutes, or simulate them.'), tx('Four real minutes: the clock runs at one and a half times, and a game within six points plays its last minute at real speed.'), tx('Offence: WASD or the arrows move, Shift sprints, J held shoots (let go in the green, one second), one tap of J at the rim lays it in or dunks, K passes (aim with the arrows), L makes a crossover, spin or step-back, Space calls a pick.'), tx('Defence: J steals, K blocks or contests, L switches, Space calls for help. T calls a timeout; Esc pauses, and the pause switches the sound and the announcer.'), tx('Near the rim a defender can strip or block your layup, less often the more athletic you are. Nobody shoots from behind half court. After the ball changes hands the keys rest a moment.'), tx('The result is the game’s: the final score, your line, and the book counts the comebacks, game-winners and late blocks you play yourself. Sim mode stops to ask; Fast break simulates the six minutes.')]],
      [tx('Roster and fit'), [tx('Your team’s five and bench are on the Player tab.'), tx('Chemistry is better when the five is balanced, or peaks where the team’s system wants it.'), tx('A bench better than most helps too.')]],
      [tx('National team'), [tx('World Cups, the Olympics, the Asian Games: medals and reputation, at the cost of rest.')]],
    ],
  },
  {
    title: tx('Offseason moves'),
    where: tx('Home, between seasons (locked tiles say what they need)'),
    items: [
      [tx('Focus stats'), [tx('A breakthrough season unlocks a change for that offseason; the tile glows.')]],
      [tx('Position'), [tx('Move one spot a summer, two if your height fits.')]],
      [tx('Starting five'), [tx('NBA, once you are your team’s first option.'), tx('Recruit a starter for any position. The scouts weigh how he fits the roster.'), tx('About one recruit in four clicks: a duo, then a Big Three.'), tx('A duo or Big Three ends the moment any of you changes teams; whoever stays starts over.')]],
      [tx('Team style'), [tx('NBA starters: pick how the team plays, once a summer, in a talk with your team’s own head coach (speech bubbles, then the new playbook).'), tx('Each style suits some players better than others.'), tx('It becomes the system your roster is measured against.')]],
      [tx('Request a trade'), [tx('NBA, under contract: aim for a contender, the champions, your rival...'), tx('The card says at once where you went, or what it cost you.')]],
      [tx('Jersey number'), [tx('Switch numbers between seasons. The one you retire in is the one that hangs.')]],
      [tx('Retire, or chase a ring'), [tx('Retire between any two seasons.'), tx('A veteran can first become a specialist for a contender.')]],
      [tx('Farewell tour'), [tx('From 32 in the NBA: announce next season as your last.'), tx('Road arenas give you gifts, the playoffs get a one-last-run edge, and it ends with a farewell page and legacy points of its own. Then you retire.')]],
      [tx('Press conferences'), [tx('After a big story, every two or three seasons: one question, two after a title, a lost final or a big award.'), tx('Humble earns trust, confident fame and mood, fiery the most fame and a risk of a fine.'), tx('Some crowds love fire, others humility.')]],
      [tx('Contract talks'), [tx('Under each pro offer: ask for more money, one more year or a bigger role.'), tx('Two asks an offer. Push too hard and they pull it.')]],
      [tx('Brand deals'), [tx('At Superstar reputation, two brands bid each summer.'), tx('A fixed deal, or your own signature line under your logo: an Icon gets a shoe every season.')]],
      [tx('Shop and summer'), [tx('Six items each summer from about 220, priced for what you earn: two or three fit your bank. Buy as many as you can pay for.'), tx('Prices climb with your salary, up to three times the sticker; from about $50M a year, money stops mattering.'), tx('Then a summer program for next season.')]],
      [tx('Accessories'), [tx('Headbands, sleeves, wristbands and leg sleeves in ten colours, each with a tiny effect.'), tx('They go on your player at once; the Wardrobe tab of Your life, on the Player tab, swaps or removes them.')]],
      [tx('Collection'), [tx('Everything you bought, by shelf, in Your life on the Player tab.'), tx('Take the car for a drive, fly the jet, go home, as often as you like.'), tx('The first visit each season gives a small edge: a little mood and rest (and fame for a public place).')]],
    ],
  },
  {
    title: tx('Mini-games'),
    where: tx('The arcade in a career’s town (Extras), or the main land’s island'),
    items: [
      [tx('Unlocking them'), [tx('They open with the island on the road map: each game once there, a C or better in each.'), tx('Then free from the main land’s island; in a career, each opens when a rating reaches its mark, and stays open.')]],
      [tx('Career bonus'), [tx('A good result gives your player a real rating bonus.'), tx('Two a season: the second at half value.')]],
      [asIs('The Floor'), [tx('The last six minutes of a close NBA game, played on the court, with the career’s Floor controls.'), tx('From the start page: both teams from the 30 crests, how good they are (Average, Good or Great) and the starter you steer; the best is picked for you.'), tx('In a career on an NBA team you play yourself on your team, against the team you pick; anywhere else in a career, yourself in your spot on a team at the level picked.'), tx('The grade is the margin, with a little for your line: any win is a B, a big one an A, a close loss a C.'), tx('Opens at basketball IQ 85; pays basketball IQ and a little playmaking.')]],
      [asIs('Three-point contest'), [tx('Five racks, 60 seconds, starting at rack 1. Stop the meter in the green.'), tx('Pick which rack is all money balls.')]],
      [asIs('Dunk contest'), [tx('Build each dunk, land it with timing taps, beat the judges.'), tx('Every move can be shown once a contest: save some for the final.'), tx('The greens are narrow and the judges are strict.')]],
      [asIs('Legends showdown'), [tx('Every franchise’s all-time five. Mind the chemistry, survive the playoffs.')]],
      [asIs('Built in a lab'), [tx('Design a player and spend credits on his ratings, season by season.'), tx('His art evolves as his OVR climbs.')]],
      [asIs('3-on-3 streetball'), [tx('One game to 11 against the crew that holds the court.'), tx('Drives and pull-ups ask for a timing tap and play out on the action cam.'), tx('Pays finishing.')]],
      [asIs('Lockdown'), [tx('A rhythm game on defense: A blocks, S steals, on the beat.'), tx('Every run deals 30 to 60 seconds of their sets in a new order; hold the long notes.'), tx('Pays perimeter and interior defense.')]],
      [asIs('Daily challenge'), [tx('The same prospect for everyone, every day, from the mini-games on the main land’s island (not during a career: it is a career of its own).'), tx('Fast break and simple text stay on, and mini-games are locked, so a run stays quick.'), tx('Friends today: your best run of the day beside your friends’ (everyone you share a draft class or a challenge with), online.')]],
    ],
  },
  {
    title: tx('Tabs'),
    where: tx('Each place in the town opens one, with a banner of the numbers that matter'),
    items: [
      [asIs('Season'), [tx('Your season and the league in one, the most worth a look first.'), tx('The locker room first; then your team’s strength beside its city and fans; then the playoff bracket while there is one (every series folds out below it).'), tx('Standings as win bars with every crest and the playoff line, your conference first.'), tx('The league leaders, your games, last season’s award voting, the champions’ banners and the record book.')]],
      [asIs('Player'), [tx('Ratings (shape and bars), status, kits, scouting (the projected peak stays a rough range until college).'), tx('Your name card (nickname and brand), then Your life: staff, wardrobe and collection as tabs (it opens on the last one you picked).'), tx('The Body panel, folded until you open it: height and where it is headed, weight and your best weight, wingspan, body wear, the free-throw touch and weak hand, and the body map (muscles training built; hover or tap a red spot to see an injury).'), tx('The roster: the five, the bench, the system and how they fit.')]],
      [asIs('Records'), [tx('The career timeline first (OVR season to season, with the big moments), then banners and rings, trophies and totals, career highs and the farewell tour’s gifts.'), tx('The journal and season by season below.')]],
      [asIs('Extras'), [tx('The arcade in the town: the main land’s four big places, inside a career: the mini-games, the career log, the achievement book (with what this career has earned, in gold) and the community.'), tx('A dot when a mini-game opens or this career earns an achievement.'), tx('While a career is on, the start page keeps a few things: the daily challenge, deleting log cards, and starting or continuing another career.')]],
    ],
  },
  {
    title: tx('The goal'),
    where: tx('The end of your career'),
    items: [
      [asIs('OVR'), [tx('Weighs every part of the game for your position.'), tx('Defense, rebounding and passing count as much as scoring.')]],
      [tx('Legacy'), [tx('Every honour is worth points, by tier (S down to D).'), tx('The Hall of Fame takes a long run of honours.')]],
      [asIs('The rafters'), [tx('A team retires your number after a long, strong run there (or a title as a key player).')]],
      [tx('Legendary seasons'), [tx('A season that stacks the big honours or numbers earns a gold card.')]],
      [tx('Championships'), [tx('Titles are won by teams, and they are hard.'), tx('Chemistry, roster fit, trust, a duo, team style and the crowd all help.')]],
      [asIs('All-Star'), [tx('Twelve make each conference’s team, but you make it only from the top six: the five starters and one more.')]],
      [tx('Long careers'), [tx('Aging hits after 30, and body wear makes it hit harder. Every rating fades, shooting too; basketball IQ holds up longest.'), tx('Greatness ages slower: the higher your peak, the slower the fall. A peak of 95 or more stays in the 90s to about 36, in the 80s into the early 40s and the 70s near 50; most players are worn down by their mid 30s.'), tx('Recovery plans, health items and rest summers help any body last. Nobody plays past 50.')]],
      [tx('All-time rank'), [tx('Your legacy against 100 real legends, on your career card.')]],
    ],
  },
  {
    title: tx('Beyond one career'),
    where: asIs('The main land'),
    items: [
      [tx('Career log'), [tx('Every career in one list: in progress first (Continue), then the career cards of your last 10 finished careers (Look back), each with its code.'), tx('A warning at 9; when full, a new career replaces the oldest card that is not locked.'), tx('Lock up to 5 to keep them for good: a locked card is never replaced or deleted until you unlock it.'), tx('Show, download, lock or delete any card (from a career: no deleting).'), tx('Compare: pick two cards to see them side by side, peak to NBA points, the better of each marked ▲.')]],
      [tx('Looking back'), [tx('Look back on a finished career opens it on its Home, with a bar along the top that says whose career it is.'), tx('Leave, on that bar, takes you back to the career log.')]],
      [tx('Career card'), [tx('Download or share it from the end of a career or the career log.'), tx('It shows the difficulty and any challenge (Comet, Rough Road) as badges, the career index, the best ten achievements as medals and the best three by name, and the son, if he played.')]],
      [tx('Achievements'), [tx('More than 800 milestones in five tiers, kept for good across careers, in 13 short categories: tap one (with a tier, or Earned) to see only it.'), tx('Some are for playing with friends and for opening the road map’s modes, some for the free-throw line and a jumper that lasts.'), tx('Some are simple math (your age or your jersey number in points, a points total that reads the same both ways), some for the game’s own pages (folding cards, looking back, coming back day after day).'), tx('Some are for efficiency (a perfect night from the field, 50-40-90 at 25 a game), some for nights so bad they are hard to have (0 for 12, a team that wins 15).'), tx('Mini-games have their own: for the arcade itself, and for what the bonuses did for your career.'), tx('A banner drops in when you earn one; tap it away.'), tx('The Endings page at the top of the book: the twelve endings a career can have, each as its scene once you have seen it, dark until then.'), tx('Ones you haven’t earned show only their name: a riddle.')]],
      [tx('Play with friends'), [tx('On the website and the itch.io download (the claude.ai page can’t reach the game’s server): the park on the main land. Regular guy only, and nobody has to be on at the same time.'), tx('Your username goes beside everything you post. The game keeps no email or login.'), tx('Find a game by its six-letter code, its link, or quick match (others’ open games).'), tx('Careers with friends have turning points of their own: the class group chat, a class workout, the other you in a challenge, a friendly wager at the line.'), tx('While you play one, its leaderboard stays beside every tab (above it on a phone), with your career so far, your rival’s record and the chat. Careers with friends count there, not on the community’s leaderboards.'), tx('Fair play: Fast break and Sim stay off, mini-games pay no rating bonus, a challenge only comes from a career played without Fast break or Sim, and a posted season stands.')]],
      [tx('Challenge a friend'), [tx('At the end of a Regular guy career: Challenge a friend gives a code and a link.'), tx('Your friend plays the same prospect from the same start (the same seed and start page) their own way, with no undo; every answer is ranked beside yours by career index. Play one again and your best counts.')]],
      [tx('Draft class'), [tx('Start a class, name it, make your player and send the code: up to twelve friends start careers on one seed.'), tx('Draft night: each of you was his college’s first option, at OVR 65 to 75, projected and picked in the first round of the same NBA draft. The rest is history.'), tx('Each season posts a short line to the class and each finished career its card: the standings, and every season side by side with the best of the class each year. A seat plays one career.'), tx('Tap a friend in the standings to watch his career season by season, and react to a season (four pixel reactions, one each).'), tx('Reunion night: once every career in the class is over (or a friend has posted nothing for two weeks), eleven awards come out one at a time, the least first and the class MVP last.')]],
      [tx('Friends in your career'), [tx('A draft class’s seasons reach each other’s careers (the game copies them in, so each career still plays out the same from its own choices).'), tx('Rivals: send one classmate a rivalry from the standings; when they send one back (Accept the rivalry), you are rivals. Either of you can take it back.'), tx('Rival nights: once a season, when your NBA teams meet, a turning point of its own: guard your rival yourself, outscore them, or play it like any other night. Your strength, your teams and the call decide it; the record stays on the side board.'), tx('Duos of friends: two classmates on one team for a season form a duo (three, a Big Three of friends), like a duo with a teammate but built on years of knowing each other.'), tx('Join a friend: the trade request can aim at a classmate’s NBA team. Your two salaries limit it: the more of the cap you take together, the lower the odds, and past 60% it is not on offer.'), tx('Rival series: when your team meets your rival’s in the playoffs, pick how you play the whole series (guard him, outscore him, or the team game).'), tx('Classmates in your league: they show in your game log against their teams, in the MVP and award races (they can beat you) and on All-Star teams.'), tx('The chat: every challenge and class has one, under its leaderboard, for its people only. 200 characters a line. Class news (drafted, traded, a first All-Star, an MVP, a title, retired) shows there too.')]],
      [tx('The next generation'), [tx('A career whose first child is a son offers his career, at the foot of the retirement page: Comet speed, your difficulty, your number and hometown. The first child is a boy or a girl, half and half.'), tx('He takes after you, mostly a little shorter and a little less gifted, now and then far better or worse. No third generation.'), tx('He is never logged or ranked on his own: a quarter of his legacy joins yours, and your card shows him.')]],
      [tx('Username'), [tx('Asked after the tutorial, and changed any time in Settings or on Play with friends.'), tx('Shown beside your careers on the leaderboards, in the Reality 99 hall, on the statue plaza and to friends, so people know whose player it is; your player keeps his own name.'), tx('Letters, numbers and _ . - only, and no swear words.')]],
      [tx('The finale'), [tx('When a career ends and you leave it, it gets one of twelve endings, the first that fits: the rafters (a team hangs your jersey), Enshrined (the Hall of Fame), Ring bearer (an NBA title), All-Star (an All-Star or All-NBA team, or an MVP), Legend of Europe (three seasons abroad with a EuroLeague title or its MVP), The long haul (six NBA seasons), Made it (an NBA game), Passport (a career overseas), The grinder (the G League), One shining moment (a college star), Cap and gown (college) and Hoops dream (it ended in high school).'), tx('The rafters: the empty arena at night, your speech, the jersey going up. Every other ending opens on a scene of its own (the Hall of Fame stage, a ring box under a lamp, the jerseys in your garage, flares in a European arena, your last locker, the framed first jersey, a departures board, the team bus at night, the net coming down, graduation day, the driveway hoop at dusk): three lines from your career, then where he is now. A farewell tour opens on the last road ovation first; your family, an Olympic gold or a son’s career show up in it too.'), tx('Then the credits (your teams, titles, legendary seasons, awards and numbers), the title and a thank-you, each ending under a theme of its own. Under two minutes; leaving a career that isn’t over gets none.'), tx('The first time each one plays on a device it can’t be skipped; after that, Skip (or Enter) goes to the thank-you. The achievement book’s Endings page shows which you have seen.'), tx('Hold Space to run the credits four times faster.')]],
      [tx('What it qualifies for'), [tx('The end-of-career page says where the career stands: its place on today’s and the all-time board, the Reality 99 hall, a statue (with the button to raise it) or how much legacy a statue still needs.')]],
      [tx('Leaderboards'), [tx('Today and all time, for each difficulty, plus Rough Road and Comet.'), tx('Rough Road careers rank on Reality’s board too; Comet careers only on their own, so Shoot for the stars keeps careers played by hand.'), tx('The top 100 players, each at their best career. Careers with friends count on their own challenge or class, not here.'), tx('Ranked by career index: every season’s honours plus the best five seasons.'), tx('House players (marked house) keep the boards company until real careers push them down.')]],
      [tx('Reality 99 hall'), [tx('Every Reality hits hard career that reaches 99, seated on the benches of a hall; a bench fills before the next one opens.'), tx('Tap a player for the career card.')]],
      [asIs('Statue plaza'), [tx('Regular guy careers with 150+ legacy can raise a statue: your player cast in bronze, or gold from 220 or a first-ballot Hall of Famer.'), tx('Up to 100 statues, with a few house statues until real ones come. Pay your respects to the others.')]],
      [tx('Send feedback'), [tx('Found a bug or have an idea? The bar at the foot of every tab and every mini-game sends it, with where you were; so does the Community page.'), tx('Online (on itch.io, or the game’s claude.ai page) it goes to the maker; on claude.ai, if the page lets you comment but not post, it opens the page’s comment box instead. Offline it stays on the device.')]],
      [tx('Developer'), [tx('The card at the foot of the main land, and the Developer fold next to the feedback bar on every page, open the maker’s dev deck as a page of the game. It needs a password.'), tx('Back to the game returns to where you were, with the same theme and court.')]],
    ],
  },
];

const QUICK: [string, string][] = [
  ['1', tx('Pick a plan for each half.')],
  ['2', tx('Answer turning points.')],
  ['3', tx('Between seasons, check Offseason moves.')],
  ['4', tx('Raise ratings to unlock mini-games (on the Extras tab).')],
  ['5', tx('Want it quicker? Fast break or Sim, on How you play; or a five-minute Comet career with Shoot for the stars.')],
  ['6', tx('Changed your mind? Undo (U) takes back the last choice.')],
  ['7', tx('Want the basics again? Pick Regular guy: its card opens the road map.')],
  ['8', tx('Too much on screen? Fold a card from its title.')],
  ['9', tx('With friends? Play with friends, at the park on the main land: a challenge or a draft class, with a rival, a chat and a board of its own.')],
  ['10', tx('A playoff game on the line? Play its last six minutes yourself on the Floor.')],
];

const SEEN = 'btr-guide-seen';
const seen = (): boolean => {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    return true;
  }
};

export function GuideButton() {
  const guideOn = useStore((s) => s.guide);
  const toggleGuide = useStore((s) => s.toggleGuide);
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(() => !seen());
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);
  const show = () => {
    setOpen(true);
    setFresh(false);
    try {
      localStorage.setItem(SEEN, '1');
    } catch {
      // a reminder dot is all that depends on it
    }
  };
  return (
    <>
      <button data-tour="guide-btn" className={`icon-btn${fresh ? ' guide-fresh' : ''}${guideOn ? ' guide-on' : ''}`} onClick={show} aria-haspopup="dialog">
        {guideOn ? t('Guide: on') : t('Guide')}
      </button>
      {open && (
        <div className="guide-scrim" onClick={() => setOpen(false)}>
          <div className="guide-sheet" role="dialog" aria-modal="true" aria-label={t('How to play')} onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <div>
                <div className="kicker">{t('Guide')}</div>
                <h2 className="title">{t('How everything works')}</h2>
              </div>
              <div className="spacer" />
              <button className="icon-btn" onClick={() => setOpen(false)}>
                {t('Close')}
              </button>
            </div>
            <div className={`guide-mode${guideOn ? ' on' : ''}`}>
              <div>
                <b>{t('Guide mode')}</b>
                <div className="small muted">{t('Walks you through every button once, step by step, then highlights the next thing to do.')}</div>
                <button className="link-btn" onClick={resetTour}>
                  {t('Start the tour again')}
                </button>
              </div>
              <button className={`btn small${guideOn ? ' ghost' : ''}`} onClick={toggleGuide} aria-pressed={guideOn}>
                {guideOn ? t('Turn off') : t('Turn on')}
              </button>
            </div>
            <section className="guide-sec">
              <h3 className="guide-h">{t('Quick start')}</h3>
              <ol className="guide-quick">
                {QUICK.map(([n, line]) => (
                  <li key={n}>
                    <b>{n}</b>
                    <span>{t(line)}</span>
                  </li>
                ))}
              </ol>
            </section>
            {SECTIONS.map((sec) => (
              <section key={sec.title} className="guide-sec">
                <h3 className="guide-h">{shown(sec.title)}</h3>
                <div className="guide-where">{shown(sec.where)}</div>
                <div className="guide-cards">
                  {sec.items.map(([k, [first, ...more]]) =>
                    more.length ? (
                      <details key={k} className="guide-card">
                        <summary>
                          <Icon name={GUIDE_ICON[k] ?? ''} size={30} />
                          <b>{shown(k)}</b>
                          <span>{t(first)}</span>
                        </summary>
                        <ul>
                          {more.map((x) => (
                            <li key={x}>{t(x)}</li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <div key={k} className="guide-card">
                        <div className="guide-one">
                          <Icon name={GUIDE_ICON[k] ?? ''} size={30} />
                          <b>{shown(k)}</b>
                          <span>{t(first)}</span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ---------- guide mode (round 13) ----------
// "Make the guide into an activatable mode, highlighting all steps the user has to take." With
// guide mode on, the one thing to do next gets a glowing outline and a short note right above it.

type GuideSpot = 'main' | 'moves';

/** What to do next, and where. */
function guideStep(g: GameState): { spot: GuideSpot; text: string } {
  const pr = prompt(g);
  if (pr.type === 'decision') {
    const d = pr.decision;
    const HINT: Record<string, string> = {
      plan: t('Pick your training plan for this half. One plan alone works a little better; tap a second to add a side plan. Then confirm (Enter).'),
      shop: t('The shop: buy something that helps (ratings, health, fame), then press Enter (or Leave the shop) to move on.'),
      summer: t('Pick your summer program: it shapes next season\u2019s growth and your body.'),
      live: t('A playoff game: pick a tactic for this quarter, or simulate the game, the series or the rest.'),
      national: t('A national team call: medals and reputation, at the cost of rest.'),
      transfer: t('You can stay or enter the transfer portal for a bigger role.'),
      assign: t('Barely playing: a G League assignment gives you real minutes for the second half.'),
      retirePrompt: t('Keep playing, or retire now. Your legacy is in Records.'),
      arc: t('The next chapter of a storyline: pick how you respond.'),
      military: t('Military service: choose when to serve.'),
      info: t('Read it, then carry on with the button.'),
    };
    const road = ['offers', 'commit', 'eu', 'int', 'gl', 'min', 'youth', 'prep', 'promote', 'culture'];
    const text =
      HINT[d.kind] ??
      (road.includes(d.kind)
        ? t('Choose where you play next. Compare the role, the level and the money: minutes matter most for growth.')
        : d.kind === 'draft' || d.kind === 'declare' || d.kind === 'withdraw'
          ? t('A draft decision. The scouting report shows where you are projected to go.')
          : t('A turning point (the picture shows where it happens): pick how you respond. The result is rolled each time; the risk tag shows how swingy it is.'));
    return { spot: 'main', text };
  }
  if (g.step === 'offseason' && (canChangeFocus(g) || (canRecruit(g) && !(g.recruit?.moves ?? 0)) || (canSetStyle(g) && !currentStyle(g)))) {
    // round 40: each a whole sentence, for the translators
    const text = canChangeFocus(g)
      ? t('Before the next season: pick new focus stats in Offseason moves (the glowing tile). The other tiles are optional.')
      : canRecruit(g) && !(g.recruit?.moves ?? 0)
        ? t('Before the next season: build your starting five in Offseason moves (the glowing tile). The other tiles are optional.')
        : t('Before the next season: set your team style in Offseason moves (the glowing tile). The other tiles are optional.');
    return { spot: 'moves', text };
  }
  const text =
    g.step === 'summary'
      ? t('Season over. Check the summary, then head into the offseason.')
      : g.step === 'offseason'
        ? t('Offseason: change your position, number or team style, or ask for a trade if you want (locked tiles say what they need). When you are ready, start the next season.')
        : g.step === 'postseason'
          ? t('The postseason: keep going to play the next round.')
          : t('Play the next half of the season (Enter). Your plan, your role and your health decide how it goes.');
  return { spot: 'main', text };
}

/** Wraps a spot: with guide mode on and this spot next, it glows and shows the note. The wrapper
 * is always there (round 25): adding and dropping it remounted what it holds, so a guide-tour step
 * opening on the last-possession meter threw the shot away and showed the choices again. */
export function GuideSpotWrap({ g, spot, children }: { g: GameState; spot: GuideSpot; children: React.ReactNode }) {
  const on = useStore((s) => s.guide && !s.master && !s.tour);
  const step = on ? guideStep(g) : null;
  const lit = step?.spot === spot;
  return (
    <div className={lit ? 'guide-target' : 'guide-off'}>
      {lit && (
        <div className="guide-tip" role="note">
          <b>{t('Next')}</b> {step.text}
        </div>
      )}
      {children}
    </div>
  );
}
