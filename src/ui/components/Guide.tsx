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

// round 15: the manual is cards under big headers; round 24 (owner: "the guide is too text heavy,
// make them into bullet points, not too many examples"): each card is a few short bullets. The
// first bullet shows on the card; tap it for the rest.
const SECTIONS: { title: string; where: string; items: [string, string[]][] }[] = [
  {
    title: 'Getting around',
    where: 'The top bar',
    items: [
      ['Tabs', ['Home, Season, Player, Records and Extras.', 'Along the top on a computer, at the bottom on a phone.', 'A dot means something new is there: opening the tab takes you to it, rings it and waits for Got it (Enter or Space).']],
      ['Next step', ['On any other tab, this button carries the game on.', 'Looking around never stops the game.']],
      ['To do', ['The top of Home: what the game is waiting for now.', 'Also lists anything new worth a look. Tap to jump to it.']],
      ['Saving', ['Up to ten careers save on this device, each after every move, and each is a card in the career log.', 'In progress: Continue. Finished: Look back. Both have Code and Delete. With all ten taken, a finished one makes room first.', 'Code copies a career as text, to send the maker with a bug report: they can open it exactly as it is.']],
      ['Folding cards', ['Most cards fold: tap a card’s title, or the small tab on its top edge, to fold it to one line; tap again to open it.', 'Folds stay as you left them on this device, season to season and career to career. Every card starts open.', 'The main card, To do, your player card, the offseason moves and the career card never fold.']],
      ['Settings', ['Theme, court background, text size (Normal, Large, Extra large), sound effects and music each with a volume slider, the announcer, your username, then New career (the career you leave stays in the career log; a finished one plays its finale first).', 'Switches: Fast break, playable playoff games, Simple text, Guide mode, Master mode.']],
      ['Undo', ['Changed your mind? Undo on Home (or U) takes back your last choice or step, and says which.', 'One step back, not more. Off for Rough Road, Comet, the daily challenge and careers with friends, so their boards stay fair, and once a career has ended.']],
      ['How you play', ['A card on Home with every mode as a switch.', 'Sim: makes the routine calls (plans, summers, call-ups, press) and the turning points (the first choice that is not high risk), and lists the calls it made on Home. It stops for the big ones: offers, the draft, contracts, brands, storylines, retiring.', 'Sim opens once you have played a career to retirement with an NBA All-Star team on every difficulty: Regular guy, Reality hits hard and Shoot for the stars (a Comet does not count). Until then its chip says what is still to go.', 'Fast break: quick seasons; each tab folds its extra cards behind "Show everything".', 'Simple text: hides the explanations on every tab, but keeps the season’s averages in one line on Home, and every result.']],
      ['Guide mode', ['Walks you through every button once, step by step.', 'New things get their step the first time they unlock.', 'Then it highlights the next thing to do. Turn it on here, in Settings or on How you play.']],
      ['Master mode', ['No recommendations anywhere: no scouts’ calls, fit tags, suggested deals or hints.', 'In Settings or on How you play.']],
      ['Pages', ['The career log, the achievement book, the community, Play with friends and the mini-games open as pages of their own (in a career, from the Extras tab).', 'Top left says where Back goes; next to it, where you are. Escape goes back too.']],
      ['Keyboard', ['Enter: the main button (skips a final to the buzzer first).', '1–9, 0, - and =: pick a choice. Space: stop a timing meter.', 'H S P R E: tabs. U: undo the last choice. Esc: back from a page, or close a menu.']],
      ['Sound', ['Chiptune sound effects, and music on from your first click or key (browsers keep sound off until then; the intro has a Play the music button).', 'The announcer: the deepest voice your device has, slowed down, with a breath before the big word and the arena’s thump under it, for the big plays on the court (a block, a steal, a dunk, a three, a buzzer beater) and for a title or a breakthrough. It follows the sound effects and has its own switch in Settings.', 'A loop for each part of the game: bright ones for the intro and the finale’s thank-you, a theme for each of the finale’s twelve endings, the start page, high school, college, each league, a laid-back one for every offseason, one for the end of a career, one for Play with friends and one for each mini-game (Lockdown keeps its own beat).', 'Both switch in Settings, each with its own volume.']],
      ['Loading', ['When a step takes a moment, your player dribbles in the corner until it is ready.']],
    ],
  },
  {
    title: 'The road map',
    where: 'The tutorial, then Regular guy’s card on the start page',
    items: [
      ['The tutorial', ['Every device starts with the beginner level (high school): a short career at fast break’s pace with one goal, an NBA All-Star team in 5 NBA seasons. Goal or not, the level is passed.', 'It keeps to the essentials: Home (plans, turning points, the coach, the scouts) and a Player tab of ratings and status.', 'Then graduation, and the full game opens with Regular guy.']],
      ['Lessons', ['The tutorial guide shades the page but for one control and says what it does: Got it (Enter or Space) to read on, or use the control.', 'One lesson at a time, none skipped.']],
      ['Opening the rest', ['The road map’s other stops each open a part of the game: intermediate (college, 6 NBA seasons) opens Reality hits hard, advanced (the NBA arena, 7) opens Shoot for the stars, and the island opens the mini-games.', 'Click a place, or drive to it with the arrow keys, and its card pops out of the map (Enter opens it, Escape folds it away); each card says what it opens.', 'Until then the locked cards on the start page say which stop opens them. A device that finished the old tutorial keeps everything.']],
      ['The island', ['Every mini-game once, with a C or better in each: the mark to beat is on its card. Built in a lab is one of them.']],
      ['The closing tour', ['A star’s career, stop by stop, for everything no level has (the locker room, duos, the press, love, the farewell tour and more). Any time, from the road map.', 'Next stop goes on once a stop’s lessons are done.']],
      ['Graduation', ['The diploma shows the exit code, and the full game opens on this device for good.', 'Skip tutorial floats at the top of every tutorial page, lessons included, and takes the code: for another device, or anyone who has played before.']],
      ['Back on the road map', ['In the full game, picking Regular guy on the start page pops out a card for the road map: play any level again.', 'Level careers count nowhere: no save slot, career log, achievements or leaderboards.']],
    ],
  },
  {
    title: 'Starting a career',
    where: 'The start page',
    items: [
      ['Difficulty', ['Regular guy, Reality hits hard or Shoot for the stars.', 'Regular guy is open from the start; the other two open on the road map (their cards say which stop).', 'Fixed for the whole career, and always shown by the game’s name.']],
      ['Rough Road', ['Picking Reality hits hard offers the hardest way to play: the road picks your whole player at random (position, archetype, focus, country, hand, name, number and his look), then master mode with no Fast break, Sim mode or undo, locked for the whole career. Simple text is allowed.', 'Such a career carries the mark in the top bar, on the leaderboards, the career log and its own banner when it ends, with achievements of its own.']],
      ['Comet', ['Picking Shoot for the stars offers Comet: the stars at hyper speed, about five minutes a career.', 'Fast break and Sim stay on for the whole career; the game also takes the youth academy\u2019s call and never stops between seasons. You choose where you play, the draft, brand deals and when to retire.', 'Draft night, award nights, finals, breakthroughs, storylines and the nickname get a page; the rest is a list of highlights on Home. The career carries the Comet mark, with achievements of its own.']],
      ['Your look', ['On the identity step: skin tone, hair, hair colour and facial hair, shown on your player in a plain white or black jersey with your number; beside him, the back of the jersey with your name and number as you type them.', 'No accessories to start: the wardrobe adds what you buy.', 'Names keep to letters A to Z (accents become plain letters, as Kovač becomes Kovac); swear words aren’t allowed.']],
      ['Where you start', ['Pick a country for its road to the pros, or Surprise me.', 'Hometown and first school are revealed when the career starts.']],
      ['Position, hand and archetype', ['Pick each yourself, or tap Random next to it.', 'Each archetype has its own traced action pose.']],
      ['Focus stats', ['Two ratings that grow almost twice as fast.', 'Changing them later takes a breakthrough season.']],
      ['Continue', ['The career log card on the start page opens every career, in progress or finished.', 'Continue lands on the career’s Home.']],
      ['Intro and What’s new', ['The intro opens every visit: the title over a one-on-one, from a high school gym to the NBA. Intro (top of the start page) plays it again.', 'What’s new pops up over the start page once after each update with the latest changes; the What’s new button next to Intro opens it again (a dot means you haven’t opened it yet).']],
      ['Share the game', ['Share (top of every page, at the foot of each tab, and on the finale’s thank-you) gives you the game’s link: copy it, send it with your phone’s share sheet, or post it on X, Reddit, Facebook, WhatsApp or by email.']],
    ],
  },
  {
    title: 'Every season',
    where: 'Home, the main card in the middle',
    items: [
      ['Plans', ['Pick one or two plans for each half. The first is the main plan.', 'One plan alone works a little better.', 'Plans shape growth, minutes, injuries, mood and fame.', 'Age matters: at 23 or younger, Grind, Spotlight and learning from a vet work better and safer (tagged Young legs); from 30, Recovery and Team first do (tagged Veteran).']],
      ['Turning points', ['Events ask you to choose; the result is rolled each time.', 'Green and red chips show what changed.', 'The risk tag shows how swingy a choice is.']],
      ['Storylines', ['Some events unfold over several seasons, one chapter each summer.', 'Love: a sweetheart, a celebrity or someone outside the game, then a proposal, a wedding and a family (a boy or a girl, half and half). Say not yet at any step.', 'Mentor enough rookies in the locker room and one of them may start a storyline of his own.']],
      ['Locker room', ['On the Season tab (under Extras): your starting five, two from the bench and the head coach at his door.', 'A and D (or the arrows) walk, Space or Enter talks, 1 to 3 answer, Escape leaves; on a phone, buttons.', 'Once a half each. Each teammate has a character (a rookie, a veteran, the star, a joker, a quiet pro, a hothead) and things to say; a hothead may start a feud for you to settle.', 'Talks move chemistry (a little, capped each season), mood and coach trust.']],
      ['Head coach', ['Every team has one, with a name, a face and a temperament: a players’ coach (chemistry and mood), a tactician (the postseason) or a hardliner (growth on the grind, bigger swings in trust).', 'His card on Home shows how much he trusts you. Once a season you can knock on his door and ask for a bigger role: more likely with more trust, a players’ coach or near the top of the roster. A no costs some trust and mood.', 'When his team sinks below .400 he is on the hot seat: back him, stay out of it or, a name in the league, tell the front office. NBA teams under .350 may change coaches in the summer.', 'Coach of the Year goes to the coach who beat his roster’s talent by the most. At top reputation in the NBA you can fire your own, from the locker room.']],
      ['Record watch', ['Home warns you when a season could carry you past a legend on the all-time scoring list, or when a career high nears a league record.', 'Chase it, once a season: a few more shots, a little more risk, a little less chemistry. Or let it come.']],
      ['Around you', ['One card at Home’s side: the MVP race, your duo, the rivalry, the league’s stories and the fans’ talk, each a tab.', 'It opens on what matters most right now (a close MVP race, a new duo or rival, news about you); a tab you pick holds until the season moves on.']],
      ['Around the league', ['The season’s storylines, in Around you, each with what it means for you.', 'Before the second half, call how up to three end, for reputation.', 'The papers write about you too: trade rumours, MVP buzz, doubts. It moves your next free agency: more or fewer suitors, more or less money.']],
      ['Why it went this way', ['The Season tab breaks your team’s strength down: your teammates, you, and every team factor.', 'The season summary shows the same chart.']],
      ['Rival', ['One rival at a time, and it only grows: a draft classmate, then a starter at your position on a rival team, then the player you trade MVP races with.', 'Around you, on Home, keeps the head to head.']],
      ['Nickname', ['At Star reputation the media gives you one, from how you look, play and live; the Player tab lights up with it.', 'Its two-colour logo is drawn when you sign your first brand deal.']],
      ['Staff', ['Turning points offer a chef, a trainer, a sleep coach and more.', 'Each is paid every season for a small edge (Your life, on the Player tab).', 'Talk to one once a season for a little more of it (the trainer a touch of athleticism, the chef a fitter body); give a raise or let them go.']],
      ['Fines', ['Pro games can bring a fine: a technical, the referees, a late bus.', 'It comes out of the bank, and a page says how much.']],
      ['Weight', ['Every body has a best playing weight (the Body panel, on the Player tab).', 'Heavier: stronger inside, slower. Lighter: quicker, easier to push around.', 'Plans, injuries, the shop and summers move it.']],
      ['Free throws', ['Your free-throw percentage comes from your shooting and a hidden touch that grows with every season of reps.', 'The shooting plan, a shooting summer, a shooting coach, a few turning points and shop items build it faster; the Body panel on the Player tab has its meter.', 'FT% shows with your averages on Home, on Records and in the game log.']],
      ['City and fans', ['Every NBA city has a culture that helps or hurts you each half.', 'Its fans add a home and playoff edge and react to wins and losses.', 'Shown on the Season tab and on every NBA offer.']],
      ['Coach trust and reputation', ['Trust steadies or splits the locker room (team strength).', 'Reputation brings better salaries, offers and trade odds.']],
      ['MVP race', ['In the NBA, once you are near the top: the leaders and how close you are.']],
      ['Playoffs and finals', ['When a postseason ends short, its page says it plainly: your team’s finish, then the champion; your series are marked W or L.', 'Playable games: a tactic each quarter and the last shot of close games.', 'The last shot goes to the timing meter: a perfect release makes it much likelier to drop.', 'Switch playable games off in Settings.']],
      ['Crunch time', ['A final within 8 points with two minutes left is yours to finish, trip by trip, on a 3-on-3 court in the arena.', 'Your ball: attack the rim, pull up, shoot the three, post up, or draw two and kick it out. Their ball: contest, help at the rim, switch, or gamble for the steal.', 'Each trip ends in a big word over the rim. Level at the buzzer: overtime, played the same way. Keys 1 to 5 pick.']],
      ['The last minutes', ['Finals, Olympic and the biggest tournament finals end on the action cam.', 'Play them (pick a move, stop the meter in the green), watch them, or skip.', 'Good timing earns a clutch rating: a little fame and mood. The result stays as played.']],
      ['Roster and fit', ['Your team’s five and bench are on the Player tab.', 'Chemistry is better when the five is balanced, or peaks where the team’s system wants it.', 'A bench better than most helps too.']],
      ['National team', ['World Cups, the Olympics, the Asian Games: medals and reputation, at the cost of rest.']],
    ],
  },
  {
    title: 'Offseason moves',
    where: 'Home, between seasons (locked tiles say what they need)',
    items: [
      ['Focus stats', ['A breakthrough season unlocks a change for that offseason; the tile glows.']],
      ['Position', ['Move one spot a summer, two if your height fits.']],
      ['Starting five', ['NBA, once you are your team’s first option.', 'Recruit a starter for any position. The scouts weigh how he fits the roster.', 'About one recruit in four clicks: a duo, then a Big Three.', 'A duo or Big Three ends the moment any of you changes teams; whoever stays starts over.']],
      ['Team style', ['NBA starters: pick how the team plays, once a summer, in a talk with your team’s own head coach (speech bubbles, then the new playbook).', 'Each style suits some players better than others.', 'It becomes the system your roster is measured against.']],
      ['Request a trade', ['NBA, under contract: aim for a contender, the champions, your rival...', 'The card says at once where you went, or what it cost you.']],
      ['Jersey number', ['Switch numbers between seasons. The one you retire in is the one that hangs.']],
      ['Retire, or chase a ring', ['Retire between any two seasons.', 'A veteran can first become a specialist for a contender.']],
      ['Farewell tour', ['From 32 in the NBA: announce next season as your last.', 'Road arenas give you gifts, the playoffs get a one-last-run edge, and it ends with a farewell page and legacy points of its own. Then you retire.']],
      ['Press conferences', ['After a big story, every two or three seasons: one question, two after a title, a lost final or a big award.', 'Humble earns trust, confident fame and mood, fiery the most fame and a risk of a fine.', 'Some crowds love fire, others humility.']],
      ['Contract talks', ['Under each pro offer: ask for more money, one more year or a bigger role.', 'Two asks an offer. Push too hard and they pull it.']],
      ['Brand deals', ['At Superstar reputation, two brands bid each summer.', 'A fixed deal, or your own signature line under your logo: an Icon gets a shoe every season.']],
      ['Shop and summer', ['Six items each summer from about 220, priced for what you earn: two or three fit your bank. Buy as many as you can pay for.', 'Prices climb with your salary, up to three times the sticker; from about $50M a year, money stops mattering.', 'Then a summer program for next season.']],
      ['Accessories', ['Headbands, sleeves, wristbands and leg sleeves in ten colours, each with a tiny effect.', 'They go on your player at once; the Wardrobe tab of Your life, on the Player tab, swaps or removes them.']],
      ['Collection', ['Everything you bought, by shelf, in Your life on the Player tab.', 'Take the car for a drive, fly the jet, go home, as often as you like.', 'The first visit each season gives a small edge: a little mood and rest (and fame for a public place).']],
    ],
  },
  {
    title: 'Mini-games',
    where: 'The Mini-games card on the Extras tab, or the start page',
    items: [
      ['Unlocking them', ['They open with the island on the road map: each game once there, a C or better in each.', 'Then free from the start page; in a career, each opens when a rating reaches its mark, and stays open.']],
      ['Career bonus', ['A good result gives your player a real rating bonus.', 'Two a season: the second at half value.']],
      ['Front Office', ['Run an NBA franchise for three seasons.', 'Miss the playoffs in seasons two and three and you are fired.']],
      ['Three-point contest', ['Five racks, 60 seconds, starting at rack 1. Stop the meter in the green.', 'Pick which rack is all money balls.']],
      ['Dunk contest', ['Build each dunk, land it with timing taps, beat the judges.', 'Every move can be shown once a contest: save some for the final.', 'The greens are narrow and the judges are strict.']],
      ['Legends showdown', ['Every franchise’s all-time five. Mind the chemistry, survive the playoffs.']],
      ['Built in a lab', ['Design a player and spend credits on his ratings, season by season.', 'His art evolves as his OVR climbs.']],
      ['3-on-3 streetball', ['One game to 11 against the crew that holds the court.', 'Drives and pull-ups ask for a timing tap and play out on the action cam.', 'Pays finishing.']],
      ['Lockdown', ['A rhythm game on defense: A blocks, S steals, on the beat.', 'Every run deals 30 to 60 seconds of their sets in a new order; hold the long notes.', 'Pays perimeter and interior defense.']],
      ['Daily challenge', ['The same prospect for everyone, every day, from the start page (not during a career: it is a career of its own).', 'Fast break and simple text stay on, and mini-games are locked, so a run stays quick.', 'Friends today: your best run of the day beside your friends’ (everyone you share a draft class or a challenge with), online.']],
    ],
  },
  {
    title: 'Tabs',
    where: 'Each opens with a banner of the numbers that matter',
    items: [
      ['Season', ['Your season and the league in one, the most worth a look first.', 'The locker room first; then your team’s strength beside its city and fans; then the playoff bracket while there is one (every series folds out below it).', 'Standings as win bars with every crest and the playoff line, your conference first.', 'The league leaders, your games, last season’s award voting, the champions’ banners and the record book.']],
      ['Player', ['Ratings (shape and bars), status, kits, scouting (the projected peak stays a rough range until college).', 'Your name card (nickname and brand), then Your life: staff, wardrobe and collection as tabs (it opens on the last one you picked).', 'The Body panel, folded until you open it: height and where it is headed, weight and your best weight, wingspan, body wear, the free-throw touch and weak hand, and the body map (muscles training built; hover or tap a red spot to see an injury).', 'The roster: the five, the bench, the system and how they fit.']],
      ['Records', ['The career timeline first (OVR season to season, with the big moments), then banners and rings, trophies and totals, career highs and the farewell tour’s gifts.', 'The journal and season by season below.']],
      ['Extras', ['The start page’s four cards, inside a career: the mini-games, the career log, the achievement book (with what this career has earned, in gold) and the community.', 'A dot when a mini-game opens or this career earns an achievement.', 'While a career is on, the start page keeps a few things: the daily challenge, deleting log cards, and starting or continuing another career.']],
    ],
  },
  {
    title: 'The goal',
    where: 'The end of your career',
    items: [
      ['OVR', ['Weighs every part of the game for your position.', 'Defense, rebounding and passing count as much as scoring.']],
      ['Legacy', ['Every honour is worth points, by tier (S down to D).', 'The Hall of Fame takes a long run of honours.']],
      ['The rafters', ['A team retires your number after a long, strong run there (or a title as a key player).']],
      ['Legendary seasons', ['A season that stacks the big honours or numbers earns a gold card.']],
      ['Championships', ['Titles are won by teams, and they are hard.', 'Chemistry, roster fit, trust, a duo, team style and the crowd all help.']],
      ['Long careers', ['Aging hits after 30, and body wear makes it hit harder. Every rating fades, shooting too; basketball IQ holds up longest.', 'Recovery plans, health items and rest summers keep a body good to about 40 (85 at most).', 'Nobody plays past 50.']],
      ['All-time rank', ['Your legacy against 100 real legends, on your career card.']],
    ],
  },
  {
    title: 'Beyond one career',
    where: 'The start page',
    items: [
      ['Career log', ['Every career in one list: in progress first (Continue), then the career cards of your last 10 finished careers (Look back), each with its code.', 'A warning at 9; when full, a new career replaces the oldest card that is not locked.', 'Lock up to 5 to keep them for good: a locked card is never replaced or deleted until you unlock it.', 'Show, download, lock or delete any card (from a career: no deleting).', 'Compare: pick two cards to see them side by side, peak to NBA points, the better of each marked ▲.']],
      ['Looking back', ['Look back on a finished career opens it on its Home, with a bar along the top that says whose career it is.', 'Leave, on that bar, takes you back to the career log.']],
      ['Career card', ['Download or share it from the end of a career or the career log.', 'It shows the difficulty and any challenge (Comet, Rough Road) as badges, the career index, the best ten achievements as medals and the best three by name, and the son, if he played.']],
      ['Achievements', ['More than 800 milestones in five tiers, kept for good across careers, in 13 short categories: tap one (with a tier, or Earned) to see only it.', 'Some are for playing with friends and for opening the road map’s modes, some for the free-throw line and a jumper that lasts.', 'Some are simple math (your age or your jersey number in points, a points total that reads the same both ways), some for the game’s own pages (folding cards, looking back, coming back day after day).', 'Some are for efficiency (a perfect night from the field, 50-40-90 at 25 a game), some for nights so bad they are hard to have (0 for 12, a team that wins 15).', 'Mini-games have their own: for the arcade itself, and for what the bonuses did for your career.', 'A banner drops in when you earn one; tap it away.', 'The Endings page at the top of the book: the twelve endings a career can have, each as its scene once you have seen it, dark until then.', 'Ones you haven’t earned show only their name: a riddle.']],
      ['Play with friends', ['On the website and the itch.io download (the claude.ai page can’t reach the game’s server): a card under the difficulties on the start page. Regular guy only, and nobody has to be on at the same time.', 'Your username goes beside everything you post. The game keeps no email or login.', 'Find a game by its six-letter code, its link, or quick match (others’ open games).', 'Careers with friends have turning points of their own: the class group chat, a class workout, the other you in a challenge, a friendly wager at the line.', 'While you play one, its leaderboard stays beside every tab (above it on a phone), with your career so far, your rival’s record and the chat. Careers with friends count there, not on the community’s leaderboards.', 'Fair play: Fast break and Sim stay off, mini-games pay no rating bonus, a challenge only comes from a career played without Fast break or Sim, and a posted season stands.']],
      ['Challenge a friend', ['At the end of a Regular guy career: Challenge a friend gives a code and a link.', 'Your friend plays the same prospect from the same start (the same seed and start page) their own way, with no undo; every answer is ranked beside yours by career index. Play one again and your best counts.']],
      ['Draft class', ['Start a class, name it, make your player and send the code: up to twelve friends start careers on one seed.', 'Draft night: each of you was his college’s first option, at OVR 65 to 75, projected and picked in the first round of the same NBA draft. The rest is history.', 'Each season posts a short line to the class and each finished career its card: the standings, and every season side by side with the best of the class each year. A seat plays one career.', 'Tap a friend in the standings to watch his career season by season, and react to a season (four pixel reactions, one each).', 'Reunion night: once every career in the class is over (or a friend has posted nothing for two weeks), eleven awards come out one at a time, the least first and the class MVP last.']],
      ['Friends in your career', ['A draft class’s seasons reach each other’s careers (the game copies them in, so each career still plays out the same from its own choices).', 'Rivals: send one classmate a rivalry from the standings; when they send one back (Accept the rivalry), you are rivals. Either of you can take it back.', 'Rival nights: once a season, when your NBA teams meet, a turning point of its own: guard your rival yourself, outscore them, or play it like any other night. Your strength, your teams and the call decide it; the record stays on the side board.', 'Duos of friends: two classmates on one team for a season form a duo (three, a Big Three of friends), like a duo with a teammate but built on years of knowing each other.', 'Join a friend: the trade request can aim at a classmate’s NBA team. Your two salaries limit it: the more of the cap you take together, the lower the odds, and past 60% it is not on offer.', 'Rival series: when your team meets your rival’s in the playoffs, pick how you play the whole series (guard him, outscore him, or the team game).', 'Classmates in your league: they show in your game log against their teams, in the MVP and award races (they can beat you) and on All-Star teams.', 'The chat: every challenge and class has one, under its leaderboard, for its people only. 200 characters a line. Class news (drafted, traded, a first All-Star, an MVP, a title, retired) shows there too.']],
      ['The next generation', ['A career whose first child is a son offers his career, at the foot of the retirement page: Comet speed, your difficulty, your number and hometown. The first child is a boy or a girl, half and half.', 'He takes after you, mostly a little shorter and a little less gifted, now and then far better or worse. No third generation.', 'He is never logged or ranked on his own: a quarter of his legacy joins yours, and your card shows him.']],
      ['Username', ['Asked after the tutorial, and changed any time in Settings or on Play with friends.', 'Shown beside your careers on the leaderboards, in the Reality 99 hall, on the statue plaza and to friends, so people know whose player it is; your player keeps his own name.', 'Letters, numbers and _ . - only, and no swear words.']],
      ['The finale', ['When a career ends and you leave it, it gets one of twelve endings, the first that fits: the rafters (a team hangs your jersey), Enshrined (the Hall of Fame), Ring bearer (an NBA title), All-Star (an All-Star or All-NBA team, or an MVP), Legend of Europe (three seasons abroad with a EuroLeague title or its MVP), The long haul (six NBA seasons), Made it (an NBA game), Passport (a career overseas), The grinder (the G League), One shining moment (a college star), Cap and gown (college) and Hoops dream (it ended in high school).', 'The rafters: the empty arena at night, your speech, the jersey going up. Every other ending opens on a scene of its own (the Hall of Fame stage, a ring box under a lamp, the jerseys in your garage, flares in a European arena, your last locker, the framed first jersey, a departures board, the team bus at night, the net coming down, graduation day, the driveway hoop at dusk): three lines from your career, then where he is now. A farewell tour opens on the last road ovation first; your family, an Olympic gold or a son’s career show up in it too.', 'Then the credits (your teams, titles, legendary seasons, awards and numbers), the title and a thank-you, each ending under a theme of its own. Under two minutes; leaving a career that isn’t over gets none.', 'The first time each one plays on a device it can’t be skipped; after that, Skip (or Enter) goes to the thank-you. The achievement book’s Endings page shows which you have seen.']],
      ['What it qualifies for', ['The end-of-career page says where the career stands: its place on today’s and the all-time board, the Reality 99 hall, a statue (with the button to raise it) or how much legacy a statue still needs.']],
      ['Leaderboards', ['Today and all time, for each difficulty, plus Rough Road and Comet.', 'Rough Road careers rank on Reality’s board too; Comet careers only on their own, so Shoot for the stars keeps careers played by hand.', 'The top 100 players, each at their best career. Careers with friends count on their own challenge or class, not here.', 'Ranked by career index: every season’s honours plus the best five seasons.', 'House players (marked house) keep the boards company until real careers push them down.']],
      ['Reality 99 hall', ['Every Reality hits hard career that reaches 99, seated on the benches of a hall; a bench fills before the next one opens.', 'Tap a player for the career card.']],
      ['Statue plaza', ['Regular guy careers with 150+ legacy can raise a statue: your player cast in bronze, or gold from 220 or a first-ballot Hall of Famer.', 'Up to 100 statues, with a few house statues until real ones come. Pay your respects to the others.']],
      ['Send feedback', ['Found a bug or have an idea? The bar at the foot of every tab and every mini-game sends it, with where you were; so does the Community page.', 'Online (on itch.io, or the game’s claude.ai page) it goes to the maker; on claude.ai, if the page lets you comment but not post, it opens the page’s comment box instead. Offline it stays on the device.']],
      ['Developer', ['The card at the foot of the start page, and the Developer fold next to the feedback bar on every page, open the maker’s dev deck as a page of the game. It needs a password.', 'Back to the game returns to where you were, with the same theme and court.']],
    ],
  },
];

const QUICK: [string, string][] = [
  ['1', 'Pick a plan for each half.'],
  ['2', 'Answer turning points.'],
  ['3', 'Between seasons, check Offseason moves.'],
  ['4', 'Raise ratings to unlock mini-games (on the Extras tab).'],
  ['5', 'Want it quicker? Fast break or Sim, on How you play; or a five-minute Comet career with Shoot for the stars.'],
  ['6', 'Changed your mind? Undo (U) takes back the last choice.'],
  ['7', 'Want the basics again? Pick Regular guy: its card opens the road map.'],
  ['8', 'Too much on screen? Fold a card from its title.'],
  ['9', 'With friends? Play with friends, under the difficulties on the start page: a challenge or a draft class, with a rival, a chat and a board of its own.'],
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
        {guideOn ? 'Guide: on' : 'Guide'}
      </button>
      {open && (
        <div className="guide-scrim" onClick={() => setOpen(false)}>
          <div className="guide-sheet" role="dialog" aria-modal="true" aria-label="How to play" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <div>
                <div className="kicker">Guide</div>
                <h2 className="title">How everything works</h2>
              </div>
              <div className="spacer" />
              <button className="icon-btn" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className={`guide-mode${guideOn ? ' on' : ''}`}>
              <div>
                <b>Guide mode</b>
                <div className="small muted">Walks you through every button once, step by step, then highlights the next thing to do.</div>
                <button className="link-btn" onClick={resetTour}>
                  Start the tour again
                </button>
              </div>
              <button className={`btn small${guideOn ? ' ghost' : ''}`} onClick={toggleGuide} aria-pressed={guideOn}>
                {guideOn ? 'Turn off' : 'Turn on'}
              </button>
            </div>
            <section className="guide-sec">
              <h3 className="guide-h">Quick start</h3>
              <ol className="guide-quick">
                {QUICK.map(([n, t]) => (
                  <li key={n}>
                    <b>{n}</b>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </section>
            {SECTIONS.map((sec) => (
              <section key={sec.title} className="guide-sec">
                <h3 className="guide-h">{sec.title}</h3>
                <div className="guide-where">{sec.where}</div>
                <div className="guide-cards">
                  {sec.items.map(([k, [first, ...more]]) =>
                    more.length ? (
                      <details key={k} className="guide-card">
                        <summary>
                          <Icon name={GUIDE_ICON[k] ?? ''} size={30} />
                          <b>{k}</b>
                          <span>{first}</span>
                        </summary>
                        <ul>
                          {more.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <div key={k} className="guide-card">
                        <div className="guide-one">
                          <Icon name={GUIDE_ICON[k] ?? ''} size={30} />
                          <b>{k}</b>
                          <span>{first}</span>
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
      plan: 'Pick your training plan for this half. One plan alone works a little better; tap a second to add a side plan. Then confirm (Enter).',
      shop: 'The shop: buy something that helps (ratings, health, fame), then press Enter (or Leave the shop) to move on.',
      summer: 'Pick your summer program: it shapes next season\u2019s growth and your body.',
      live: 'A playoff game: pick a tactic for this quarter, or simulate the game, the series or the rest.',
      national: 'A national team call: medals and reputation, at the cost of rest.',
      transfer: 'You can stay or enter the transfer portal for a bigger role.',
      assign: 'Barely playing: a G League assignment gives you real minutes for the second half.',
      retirePrompt: 'Keep playing, or retire now. Your legacy is in Records.',
      arc: 'The next chapter of a storyline: pick how you respond.',
      military: 'Military service: choose when to serve.',
      info: 'Read it, then carry on with the button.',
    };
    const road = ['offers', 'commit', 'eu', 'int', 'gl', 'min', 'youth', 'prep', 'promote', 'culture'];
    const text =
      HINT[d.kind] ??
      (road.includes(d.kind)
        ? 'Choose where you play next. Compare the role, the level and the money: minutes matter most for growth.'
        : d.kind === 'draft' || d.kind === 'declare' || d.kind === 'withdraw'
          ? 'A draft decision. The scouting report shows where you are projected to go.'
          : 'A turning point (the picture shows where it happens): pick how you respond. The result is rolled each time; the risk tag shows how swingy it is.');
    return { spot: 'main', text };
  }
  if (g.step === 'offseason' && (canChangeFocus(g) || (canRecruit(g) && !(g.recruit?.moves ?? 0)) || (canSetStyle(g) && !currentStyle(g)))) {
    const what = canChangeFocus(g) ? 'pick new focus stats' : canRecruit(g) && !(g.recruit?.moves ?? 0) ? 'build your starting five' : 'set your team style';
    return { spot: 'moves', text: `Before the next season: ${what} in Offseason moves (the glowing tile). The other tiles are optional.` };
  }
  const text =
    g.step === 'summary'
      ? 'Season over. Check the summary, then head into the offseason.'
      : g.step === 'offseason'
        ? 'Offseason: change your position, number or team style, or ask for a trade if you want (locked tiles say what they need). When you are ready, start the next season.'
        : g.step === 'postseason'
          ? 'The postseason: keep going to play the next round.'
          : 'Play the next half of the season (Enter). Your plan, your role and your health decide how it goes.';
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
          <b>Next</b> {step.text}
        </div>
      )}
      {children}
    </div>
  );
}
