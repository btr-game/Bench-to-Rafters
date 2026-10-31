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
      { icon: 'oath', text: 'No Shortcuts: the road picks your player for you. Simple text is allowed now.' },
      { icon: 'scouts', text: 'The projected peak stays a rough read until college: no early spoilers.' },
      { icon: 'dial', text: 'Settings on the start page; the feedback bar in every mini-game.' },
      { icon: 'roster', text: 'Player tab: staff, wardrobe and collection side by side, and the wardrobe shows the kit you picked.' },
      { icon: 'door', text: 'New career keeps the career you leave in Your careers, to pick up again.' },
      { icon: 'guide', text: 'Guide mode starts on for first-time players.' },
    ],
  },
];
