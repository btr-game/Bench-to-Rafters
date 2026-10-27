// Headline and comment templates. Variables: {name} {team} {ppg} {rpg} {apg} {result} {award} {age}
// All reactions are fictional.

export type Tone = 'hyped' | 'disappointed' | 'heartwarming' | 'salty';
export type Mood = 'great' | 'good' | 'meh' | 'bad';

export const SOURCES = {
  HS: ['The Hometown Ledger', 'Prep Hoops Forum', 'County Sports Weekly'],
  NCAA: ['Campus Daily', 'Hoops Message Board', 'College Hoops Insider'],
  GL: ['G League Watch', 'Two-Way Tracker', 'Minor League Hoops'],
  EU: ['EuroHoops Forum', 'Basket Europa', 'Overseas Ballers'],
  NBA: ['r/nba', 'NBA Twitter', 'The Ringer-style blog', 'Hoops Hype Wire'],
};

export const HEADLINES: Record<Mood, string[]> = {
  great: [
    '{name} is the real deal: {ppg} a night for {team}',
    '{award}! {name} caps a monster season',
    '{name} carries {team}: {result}',
    'Is anyone stopping {name}? {ppg}/{rpg}/{apg} and counting',
  ],
  good: [
    '{name} quietly turning into a problem for opponents',
    'Solid year for {name} at {team}',
    '{name} takes a step forward: {ppg} PPG',
    '{team} found something in {name}',
  ],
  meh: [
    'Up-and-down season for {name}',
    '{name} still searching for a role at {team}',
    'Is this the year {name} breaks out? Not yet.',
    '{team} finishes it out: {result}',
  ],
  bad: [
    'Rough year for {name} at {team}',
    '{name} glued to the bench as {team} struggles',
    'Where did it go wrong for {name}?',
    '{name} needs a change of scenery, sources say',
  ],
};

export const COMMENTS: Record<Mood, { text: string; tone: Tone }[]> = {
  great: [
    { text: 'Told y’all about {name} two years ago. Receipts.', tone: 'hyped' },
    { text: '{ppg} a game?? this kid is HIM', tone: 'hyped' },
    { text: 'His mom crying in the stands after the last game got me', tone: 'heartwarming' },
    { text: 'Overrated. Let’s see him do it against real competition.', tone: 'salty' },
    { text: 'Jersey in the rafters one day. Calling it now.', tone: 'hyped' },
  ],
  good: [
    { text: 'Nice to see the work paying off for {name}.', tone: 'heartwarming' },
    { text: 'Give him more minutes and watch.', tone: 'hyped' },
    { text: 'Decent. Not a star though, chill.', tone: 'salty' },
    { text: 'Love how hard he plays every possession.', tone: 'heartwarming' },
  ],
  meh: [
    { text: 'Still waiting on that breakout…', tone: 'disappointed' },
    { text: 'The coach doesn’t know how to use him.', tone: 'salty' },
    { text: 'He’s {age}. Relax, he’s got time.', tone: 'heartwarming' },
    { text: 'Meh. Next.', tone: 'disappointed' },
  ],
  bad: [
    { text: 'Bust alert.', tone: 'salty' },
    { text: 'Rooting for him to figure it out. Tough year.', tone: 'heartwarming' },
    { text: 'Trade him for a bag of balls tbh', tone: 'salty' },
    { text: 'Man… I really thought this was his year.', tone: 'disappointed' },
  ],
};

export const HANDLES = [
  'hoopsdad44', 'buckets_only', 'film_room_fred', 'courtside_kim', 'nbatakes', 'prep_scout_99', 'zone_buster',
  'rimrocker', 'glass_cleaner', 'euro_step_ed', 'stat_padder', 'midrange_maven', 'bench_mob', 'the_real_coach',
];
