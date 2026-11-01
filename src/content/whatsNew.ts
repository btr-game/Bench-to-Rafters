// What's new (round 27, owner: "if you want to show new updates, make a what's new popup or card in
// the homepage, showing the changes"; then "make what's new a pop up that covers part of the
// screen"). Newest first; the latest opens by itself once after each update (store.ts) and from
// the button beside Intro (ui/components/WhatsNew.tsx). Changes to how the game plays and looks,
// not bug fixes.

export interface NewsItem {
  icon: string;
  text: string;
}
interface News {
  id: string;
  date: string;
  items: NewsItem[];
}

export const NEWS: News[] = [
  {
    id: '2026-11-01-r31',
    date: '1 November 2026',
    items: [
      { icon: 'undo', text: 'Undo: changed your mind? Undo on Home, or U, takes back your last choice or step. Off for Rough Road, Comet and the daily challenge, so their boards stay fair.' },
      { icon: 'textsize', text: 'Text size (Normal, Large, Extra large) and a volume slider for sound effects and for music, in Settings.' },
      { icon: 'compare', text: 'Compare two careers in the career log: side by side, peak to NBA points, the better of each row marked.' },
      { icon: 'podium', text: 'Two new leaderboards: Rough Road (the new name of No Shortcuts) and Comet. Comet careers leave the Shoot for the stars board to careers played by hand.' },
      { icon: 'bag', text: 'The shop has no limit now: six things a summer, priced for what you earn, so two or three fit your bank. From about $50M a year, money stops mattering.' },
      { icon: 'bracket', text: 'A postseason that ends short says so plainly: your team’s finish and the champion, your series marked W or L. Simple text keeps the season’s averages in one line on Home.' },
      { icon: 'laurel', text: 'The achievement book opens on what this career has earned, and the Extras tab gets a dot when you earn one.' },
    ],
  },
  {
    id: '2026-11-01-r30',
    date: '1 November 2026',
    items: [
      { icon: 'comet', text: 'Comet: pick Shoot for the stars and ride the comet, the stars at hyper speed. Fast break and Sim for the whole career, about five minutes from the first page to the last.' },
      { icon: 'sim', text: 'Sim mode makes the turning-point calls too, and lists each call it made, with how it went, on Home.' },
    ],
  },
  {
    id: '2026-11-01-r29',
    date: '1 November 2026',
    items: [
      { icon: 'calendar', text: 'Season and League are one tab now, with what is worth a look first: your team and form, the bracket in the playoffs, the standings beside your team’s strength, then the leaders and the league’s history.' },
      { icon: 'controller', text: 'A new Extras tab inside every career: the mini-games, the career log, the achievement book and the community, one tap away. The mini-games left Home for it.' },
      { icon: 'lock', text: 'Lock up to five cards in the career log: a locked career is never replaced by a new one, and can’t be deleted until you unlock it.' },
      { icon: 'note', text: 'Music for every part of the game: bright tunes for the intro and the thank-you page, one for high school, college and each league, a laid-back one for the offseason, and one for each mini-game.' },
      { icon: 'chart', text: 'The career timeline’s line runs straight from season to season again.' },
    ],
  },
  {
    id: '2026-10-31-r28',
    date: '31 October 2026',
    items: [
      { icon: 'clutch', text: 'Crunch time: a close final’s last two minutes are yours, trip by trip on a 3-on-3 court in the arena. Pick the play, call the defense, and play overtime if it ends level.' },
      { icon: 'regular', text: 'Regular guy is easier, most of all for the archetypes that used to fall short.' },
      { icon: 'laurel', text: 'The achievement book opens from the top bar in a career, and what this career earned is highlighted.' },
      { icon: 'crown', text: 'Your nickname’s logo is drawn when you sign your first brand deal, and the nickname lights up the Player tab.' },
      { icon: 'chart', text: 'The League tab in pictures: win bars with crests, the leaders and award voting as charts, the champions’ banners.' },
      { icon: 'motion', text: 'Set the team’s style in a talk with the coach.' },
      { icon: 'post', text: '3-on-3: MAKE, MISS, STEAL and the rest in big letters over the rim. The three-point and dunk contests have sound.' },
      { icon: 'grind', text: 'Young players get more from Grind, Spotlight and learning from a vet; veterans from Recovery and Team first.' },
      { icon: 'chef', text: 'A talk with your staff, and a visit to what you own (as often as you like), each give a small edge once a season.' },
      { icon: 'superteam', text: 'Duos and Big Threes end when any of them changes teams, and look like your cute player now.' },
      { icon: 'statue', text: 'The end of a career says what it qualifies for: the leaderboards, the Reality 99 hall, a statue. The thank-you comes every time, and the career log keeps ten.' },
      { icon: 'globe', text: 'Every medal and chart is pixel art now.' },
    ],
  },
  {
    id: '2026-10-31-share',
    date: '31 October 2026',
    items: [{ icon: 'share', text: 'Share the game: a Share button on every page gives you the link to send to a friend, or to post on X, Reddit, Facebook or WhatsApp.' }],
  },
  {
    id: '2026-10-31',
    date: '31 October 2026',
    items: [
      { icon: 'person', text: 'Pick your look at the start: skin, hair, hair colour and facial hair, in a plain jersey with your number, and see your name and number on the back of it.' },
      { icon: 'arrow', text: 'A tab with an orange dot now takes you straight to what is new there, rings it, and waits for Got it.' },
      { icon: 'ball', text: 'A new intro: the title over a one-on-one (runs, steals, blocks and jumpers), from a high school gym to the NBA. Replay it from Intro on the start page.' },
      { icon: 'laurel', text: 'Moving on to your next career? A thank-you first, with the trophy held high.' },
      { icon: 'hall', text: 'The Reality 99 hall is a real hall now: benches of silhouettes. Tap one to see who made it.' },
      { icon: 'crowd', text: 'House players keep the leaderboards and the statue plaza company until real careers push them down.' },
      { icon: 'statue', text: 'Statues are your cute player, cast in bronze or gold.' },
      { icon: 'news', text: 'Every event, injury, level, league and brand has a pixel icon of its own, and brands have logos.' },
      { icon: 'controller', text: 'Mini-game achievements: for the arcade itself, and for what the bonuses do for your career.' },
      { icon: 'post', text: '3-on-3 streetball: a pixel court, bigger, with a play-by-play you can read at a glance.' },
      { icon: 'live', text: 'When a step takes a moment, your player dribbles in the corner while it loads (nine moves).' },
      { icon: 'note', text: 'Fourteen new sounds: tabs, pages, tip-offs, swishes, a new team, your jersey going up.' },
      { icon: 'health', text: 'Body map: hover a red spot to see the injury.' },
      { icon: 'oath', text: 'Rough Road: the road picks your player for you. Simple text is allowed now.' },
      { icon: 'scouts', text: 'The projected peak stays a rough read until college: no early spoilers.' },
      { icon: 'dial', text: 'Settings on the start page; the feedback bar in every mini-game.' },
      { icon: 'roster', text: 'Player tab: staff, wardrobe and collection side by side, and the wardrobe shows the kit you picked.' },
      { icon: 'door', text: 'New career keeps the career you leave in Your careers, to pick up again.' },
      { icon: 'guide', text: 'Guide mode starts on for first-time players.' },
    ],
  },
];
