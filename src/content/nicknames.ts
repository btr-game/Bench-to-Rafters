// Nicknames (round 25, the owner: once a player is famous enough the media names him, from how he
// looks, how he plays, his name or his story; famous enough again, and brands put that name on a
// logo). Every nickname lists the traits it suits (career/nickname.ts reads them off the player)
// and its logo: a pixel motif on a badge, in its own colours. All of them are made up for the
// game; none is a real player's nickname.

/** What the picker reads off a player, each from 0 (not at all) to 1 (as much as it gets). */
export type Trait =
  // how he looks
  | 'tall' | 'small' | 'heavy' | 'lean' | 'lefty' | 'afro' | 'bald' | 'braids' | 'flattop' | 'beard' | 'mustache' | 'headband' | 'sleeve' | 'goggles'
  // what he is best at, against the rest of his game
  | 'SHT' | 'FIN' | 'PLY' | 'PER' | 'INT' | 'REB' | 'ATH' | 'IQ' | 'range' | 'offhand' | 'balanced'
  // his numbers (per game, his best season)
  | 'scorer' | 'passer' | 'boards' | 'blocks' | 'steals' | 'threes'
  // where he plays and what he is
  | 'guard' | 'big' | `arch:${string}`
  // his story
  | 'young' | 'veteran' | 'ageless' | 'latebloomer' | 'undrafted' | 'overseas' | 'international' | 'loyal' | 'journeyman' | 'comeback' | 'durable' | 'captain' | 'trust' | 'grind'
  | 'clutch' | 'titles' | 'awards' | 'sixth' | 'rep' | 'icon' | 'winner' | 'hometown' | 'returned'
  // his name and number
  | 'alliteration' | 'karat' | 'num7' | 'num0';

export type LogoShape = 'roundel' | 'shield' | 'octagon' | 'hex' | 'square' | 'banner';

/** A logo's two colours, paper and ink (round 25, the owner: black and white, two colours at most). */
export const LOGO_PALETTES: [string, string][] = [
  ['#FFFFFF', '#141414'], // black on white
  ['#FFFFFF', '#C92A2A'], // red
  ['#FFFFFF', '#1B2A4A'], // navy
  ['#1B2A4A', '#F5C542'], // gold on navy
  ['#FFFFFF', '#2B8A3E'], // green
  ['#FFFFFF', '#5F3DC4'], // purple
  ['#141414', '#F76707'], // orange on black
]

export interface Nickname {
  id: string;
  /** The name; {first}, {last}, {i} (first initial), {num} and {town} are filled in for the player. */
  name: string;
  /** Why the media went with it, finishing "They call you X, ..." */
  why: string;
  fit: Partial<Record<Trait, number>>;
  logo: { motif: string; shape: LogoShape; palette: number; reverse: boolean }; // reverse: the badge in ink, the art in paper
}

const N = (id: string, name: string, why: string, fit: Nickname['fit'], motif: string, shape: LogoShape, palette: number, reverse = false): Nickname => ({ id, name, why, fit, logo: { motif, shape, palette, reverse } });

export const NICKNAMES: Nickname[] = [
  // ---- how he looks ----
  N('skyline', 'The Skyline', 'for standing over everyone in the building', { tall: 1, big: 0.3 }, 'height', 'banner', 2),
  N('pocket-rocket', 'Pocket Rocket', 'for being the smallest and the fastest man on the floor', { small: 1, ATH: 0.6, guard: 0.2 }, 'rocket', 'roundel', 1),
  N('wingspan', 'Wingspan', 'for arms that reach the other end of the court', { tall: 0.6, blocks: 0.6, PER: 0.4 }, 'wings', 'shield', 3),
  N('halo', 'Halo', 'for the hair, and for the way he floats to the rim', { afro: 1, FIN: 0.4 }, 'stars', 'roundel', 5),
  N('chrome', 'Chrome', 'for the shaved head and the shine on his jumper', { bald: 1, SHT: 0.5 }, 'spotlight', 'hex', 0),
  N('band-leader', 'The Band Leader', 'for the headband and the way he runs the show', { headband: 1, PLY: 0.5 }, 'note', 'octagon', 0, true),
  N('lumberjack', 'Lumberjack', 'for the beard and the way he chops down bigger men', { beard: 1, INT: 0.4, heavy: 0.3 }, 'axe', 'shield', 0),
  N('the-twist', 'The Twist', 'for the twists, and the crossover that matches them', { braids: 1, PLY: 0.5 }, 'swap', 'octagon', 0, true),
  N('top-shelf', 'Top Shelf', 'for the flat-top and the shots that only go in from up high', { flattop: 1, SHT: 0.5 }, 'shoot', 'square', 0),
  N('southpaw', 'Southpaw', 'because nobody can guard the left hand', { lefty: 1, FIN: 0.3, SHT: 0.3 }, 'offhand', 'roundel', 0, true),
  N('whiskers', 'Whiskers', 'for the mustache that has its own fan club', { mustache: 1, rep: 0.3 }, 'person', 'hex', 0),
  N('big-bear', 'Big Bear', 'for the size, and the hug he gives the rim', { heavy: 1, INT: 0.5, big: 0.3 }, 'bear', 'roundel', 0, true),
  N('beanpole', 'Beanpole', 'for a frame like a flagpole and a game to match', { tall: 0.6, lean: 1 }, 'height', 'octagon', 4),
  N('vending-machine', 'The Vending Machine', 'for the frame of a fridge and buckets on demand', { heavy: 0.8, scorer: 0.8 }, 'bank', 'square', 1),
  N('sleeves', 'Sleeves', 'for the arm sleeve, and the shots he keeps up it', { sleeve: 1, SHT: 0.4 }, 'jersey', 'shield', 0),
  N('specs', 'Specs', 'for the goggles, and the vision behind them', { goggles: 1, PLY: 0.4, IQ: 0.4 }, 'scouts', 'roundel', 0, true),

  // ---- shooting ----
  N('nightlight', 'Nightlight', 'because the lights stay on when he shoots', { SHT: 1, threes: 0.5 }, 'spotlight', 'roundel', 3),
  N('mountain-rain', 'Mountain Rain', 'for a tall man who shoots like a guard', { tall: 0.7, SHT: 0.8, threes: 0.4 }, 'mountain', 'shield', 0, true),
  N('rainmaker', 'Rainmaker', 'for shots that come down from the clouds', { range: 1, threes: 0.6 }, 'cloud', 'hex', 2),
  N('long-distance', 'Long Distance', 'for pulling up from the logo', { range: 1, PLY: 0.4 }, 'globe', 'roundel', 2),
  N('heat-lamp', 'Heat Lamp', 'for coming off the bench and warming up in seconds', { sixth: 1, scorer: 0.5 }, 'flame', 'square', 6),
  N('the-faucet', 'The Faucet', 'because once he is on, nobody can turn him off', { SHT: 0.8, scorer: 0.6 }, 'drop', 'octagon', 0, true),
  N('metronome', 'Metronome', 'for the same form, the same release, every single time', { SHT: 0.6, IQ: 0.5, durable: 0.4 }, 'dial', 'hex', 0),
  N('feather', 'Feather', 'for the softest touch in the league', { SHT: 0.5, FIN: 0.5, IQ: 0.3 }, 'feather', 'roundel', 0, true),
  N('crows-nest', 'Crow’s Nest', 'for perching in the corner and waiting', { 'arch:Sharpshooter': 1, threes: 0.5 }, 'scouts', 'square', 0),
  N('rubber-band', 'Rubber Band', 'for stretching defenses until they snap', { 'arch:Stretch Four': 1, 'arch:Stretch Big': 1, range: 0.4 }, 'range', 'banner', 0, true),

  // ---- finishing and the athletes ----
  N('bulldozer', 'The Bulldozer', 'for going through people instead of around them', { FIN: 0.7, heavy: 0.7 }, 'strength', 'square', 0),
  N('freight-train', 'Freight Train', 'for the full head of steam on every drive', { FIN: 0.8, ATH: 0.6 }, 'fast', 'banner', 6),
  N('wrecking-ball', 'Wrecking Ball', 'for what happens to the paint when he gets there', { FIN: 0.6, INT: 0.4, heavy: 0.6, big: 0.3 }, 'shoot', 'roundel', 6),
  N('satin', 'Satin', 'for floaters, finger rolls and nothing ever forced', { FIN: 0.8, IQ: 0.6 }, 'motion', 'octagon', 5),
  N('air-traffic', 'Air Traffic', 'for the traffic jam he causes above the rim', { ATH: 1, FIN: 0.6 }, 'jet', 'shield', 2),
  N('launch-code', 'Launch Code', 'for a first step that leaves the floor behind', { ATH: 1, guard: 0.3 }, 'rocket', 'hex', 0, true),
  N('trampoline', 'Trampoline', 'for jumping twice before anyone jumps once', { ATH: 0.8, REB: 0.7 }, 'athletic', 'roundel', 4),
  N('highlight-reel', 'Highlight Reel', 'for the dunks the internet keeps replaying', { ATH: 0.7, FIN: 0.7, rep: 0.4 }, 'camera', 'banner', 1),
  N('afterburner', 'Afterburner', 'for the gear nobody else has in transition', { ATH: 0.7, 'arch:Speedster': 1 }, 'flame', 'octagon', 0),
  N('zoom', 'Zoom', 'for end to end in four seconds', { ATH: 0.6, guard: 0.5, small: 0.3 }, 'pace', 'roundel', 0, true),
  N('elevator', 'Elevator', 'for the ride up to every lob', { 'arch:Lob Threat': 1, ATH: 0.5 }, 'arrow', 'square', 5),
  N('paper-cut', 'Paper Cut', 'for slicing through the smallest gaps', { 'arch:Slasher': 1, FIN: 0.4 }, 'arrow', 'octagon', 1),
  N('second-chance', 'Second Chance', 'for the putbacks that break hearts', { REB: 0.6, FIN: 0.5, 'arch:Rim Runner': 0.5 }, 'recovery', 'octagon', 1),

  // ---- running the show ----
  N('maitre-d', 'The Maître D', 'for finding everyone a seat at the table', { PLY: 0.8, passer: 0.8 }, 'chef', 'roundel', 0, true),
  N('gps', 'GPS', 'for finding the open man before he knows he is open', { PLY: 0.7, IQ: 0.7 }, 'globe', 'square', 0),
  N('conductor', 'The Conductor', 'for running the floor like an orchestra', { PLY: 0.7, IQ: 0.5, 'arch:Floor General': 1 }, 'note', 'shield', 0, true),
  N('yo-yo', 'Yo-Yo', 'for a dribble that always comes back', { PLY: 0.8, offhand: 0.6 }, 'motion', 'hex', 0),
  N('sleight', 'Sleight', 'for passes that disappear and turn up in a teammate’s hands', { PLY: 0.8, IQ: 0.4, passer: 0.5 }, 'cards', 'octagon', 3),
  N('special-delivery', 'Special Delivery', 'for the passes that arrive right on time', { passer: 1 }, 'envelope', 'square', 4),
  N('locksmith', 'The Locksmith', 'for picking every defense open', { PLY: 0.6, IQ: 0.6, scorer: 0.3 }, 'key', 'roundel', 0, true),
  N('swiss-army', 'Swiss Army', 'for doing every job on the floor', { balanced: 1, 'arch:Point Forward': 0.6 }, 'checklist', 'shield', 1),
  N('combo-meal', 'Combo Meal', 'for scoring and passing out of the same bag', { 'arch:Combo Guard': 1, scorer: 0.3, passer: 0.3 }, 'bag', 'roundel', 0, true),
  N('architect', 'The Architect', 'for building a shot out of nothing', { 'arch:Shot Creator': 1, SHT: 0.4, PLY: 0.3 }, 'frame', 'hex', 0),
  N('jumbo-jet', 'Jumbo Jet', 'for a big man’s body with a guard’s handle', { 'arch:Jumbo Playmaker': 1, tall: 0.4, PLY: 0.4 }, 'jet', 'roundel', 3),
  N('lighthouse', 'Lighthouse', 'for a big man who guides everyone home', { 'arch:Playmaking Big': 1, 'arch:Playmaking Four': 0.8, passer: 0.4 }, 'lighthouse', 'shield', 2),

  // ---- the thinkers ----
  N('librarian', 'The Librarian', 'for a quiet game and a long memory', { IQ: 1 }, 'book', 'square', 0, true),
  N('chessboard', 'Chessboard', 'for being three moves ahead', { IQ: 0.9, PLY: 0.3 }, 'knight', 'octagon', 0),
  N('thermostat', 'The Thermostat', 'for setting the temperature of every game', { IQ: 0.7, PLY: 0.5, clutch: 0.4 }, 'dial', 'roundel', 1),
  N('clockwork', 'Clockwork', 'for the right play at the right time, every time', { IQ: 0.6, durable: 0.6 }, 'watch', 'hex', 5),
  N('the-glue', 'The Glue', 'for holding the whole thing together', { 'arch:Glue Guy': 1, trust: 0.6, IQ: 0.4 }, 'teamfirst', 'roundel', 4),

  // ---- defense ----
  N('deadbolt', 'Deadbolt', 'for locking up the other team’s best scorer', { PER: 1 }, 'lock', 'shield', 0),
  N('no-fly-zone', 'No-Fly Zone', 'for closing the airspace over the rim', { INT: 0.7, blocks: 0.9 }, 'block', 'hex', 3),
  N('swat-team', 'Swat Team', 'for blocks that land in the fifth row', { blocks: 1, ATH: 0.3 }, 'block', 'roundel', 6),
  N('pickpocket', 'Pickpocket', 'for taking the ball before they feel it go', { steals: 1, PER: 0.4 }, 'steal', 'square', 0, true),
  N('firewall', 'The Firewall', 'for stopping everything that comes through', { PER: 0.6, INT: 0.6 }, 'lockdown', 'shield', 0),
  N('bouncer', 'The Bouncer', 'for deciding who gets into the paint', { INT: 0.8, heavy: 0.4, 'arch:Rim Protector': 0.5 }, 'door', 'square', 6),
  N('landlord', 'The Landlord', 'for owning the paint and collecting the rent', { INT: 0.7, REB: 0.5, big: 0.4 }, 'house', 'shield', 0),
  N('shadow', 'Shadow', 'for following his man everywhere he goes', { PER: 0.8, 'arch:3&D Guard': 0.5, 'arch:3&D Wing': 0.5 }, 'person', 'octagon', 0, true),
  N('two-way-street', 'Two-Way Street', 'for scoring on one end and stopping it on the other', { SHT: 0.5, PER: 0.6, 'arch:Two-Way Guard': 0.5, 'arch:Two-Way Forward': 0.5 }, 'swap', 'square', 0),
  N('brick-wall', 'Brick Wall', 'for screens that feel like running into a building', { 'arch:Bruiser': 1, heavy: 0.5 }, 'strength', 'shield', 6),

  // ---- the glass and the post ----
  N('glass-cleaner', 'Glass Cleaner', 'for owning both backboards', { REB: 1, boards: 0.6 }, 'rebound', 'roundel', 0),
  N('janitor', 'The Janitor', 'for cleaning up every miss', { REB: 0.7, IQ: 0.5 }, 'rebound', 'square', 0, true),
  N('vacuum', 'Vacuum', 'for leaving nothing loose on the floor', { REB: 0.6, steals: 0.6 }, 'tub', 'hex', 2),
  N('post-office', 'Post Office', 'for delivering on the block every night', { INT: 0.4, FIN: 0.5, 'arch:Post Scorer': 1 }, 'post', 'roundel', 0, true),
  N('sculptor', 'The Sculptor', 'for footwork you could put in a museum', { 'arch:Post Scorer': 0.6, IQ: 0.6, big: 0.4 }, 'statue', 'shield', 0),
  N('hook-line', 'Hook, Line', 'for the hook shot that always lands the catch', { big: 0.6, FIN: 0.5, IQ: 0.4 }, 'hook', 'hex', 0, true),

  // ---- the big moments and fame ----
  N('mr-fourth', 'Mr. Fourth Quarter', 'for saving his best for last', { clutch: 1 }, 'clutch', 'roundel', 3),
  N('closer', 'The Closer', 'for finishing every game he starts', { clutch: 0.8, scorer: 0.4 }, 'clutch', 'square', 0, true),
  N('midnight', 'Midnight', 'for the shots that come when everyone else is tired', { clutch: 0.7, SHT: 0.4 }, 'watch', 'octagon', 3),
  N('ice-water', 'Ice Water', 'for the calm in his veins in the last minute', { clutch: 0.7, IQ: 0.4 }, 'snow', 'hex', 0, true),
  N('spotlight', 'Spotlight', 'for playing his best when everyone is watching', { rep: 1, scorer: 0.4 }, 'reputation', 'banner', 0),
  N('headliner', 'The Headliner', 'for selling out every arena he visits', { rep: 0.8, icon: 1 }, 'crowd', 'shield', 5),

  // ---- his story ----
  N('ring-collector', 'Ring Collector', 'for the jewellery box he needs for the rings', { titles: 1 }, 'laurel', 'roundel', 0),
  N('trophy-case', 'Trophy Case', 'for running out of shelf space', { awards: 1 }, 'podium', 'square', 3),
  N('late-train', 'The Late Train', 'for arriving late and staying for good', { latebloomer: 1 }, 'fast', 'roundel', 0),
  N('lunch-pail', 'Lunch Pail', 'for punching in every night like it was a shift', { undrafted: 1, grind: 0.5 }, 'grind', 'square', 0, true),
  N('passport', 'Passport', 'for the stamps from every league he played in', { overseas: 1, international: 0.6 }, 'globe', 'shield', 4),
  N('diplomat', 'The Diplomat', 'for bringing a whole country along with him', { international: 1, trust: 0.4 }, 'globe', 'hex', 5),
  N('suitcase', 'Suitcase', 'for unpacking in a new city every other year', { journeyman: 1 }, 'bag', 'octagon', 0),
  N('lifer', 'Lifer', 'for one jersey, one city, every season', { loyal: 1 }, 'jersey', 'roundel', 1),
  N('the-mayor', 'The Mayor', 'for the city that would vote for him tomorrow', { loyal: 0.6, rep: 0.6 }, 'arena', 'shield', 3),
  N('comeback-kid', 'Comeback Kid', 'for coming back stronger from every injury', { comeback: 1 }, 'health', 'shield', 0, true),
  N('old-faithful', 'Old Faithful', 'for showing up, on time, every season', { veteran: 0.7, durable: 0.8 }, 'calendar', 'square', 4),
  N('iron-lung', 'Iron Lung', 'for never needing a breather', { durable: 1, ATH: 0.3 }, 'heart', 'hex', 1),
  N('ageless', 'Ageless', 'for playing like it is still his first season', { ageless: 1 }, 'stars', 'octagon', 0),
  N('rookie-card', 'Rookie Card', 'for being famous before he could rent a car', { young: 1, rep: 0.4 }, 'cards', 'roundel', 0, true),
  N('name-effect', 'The {last} Effect', 'for how much better every team gets when he arrives', { winner: 0.6, trust: 0.5 }, 'chart', 'roundel', 5),
  N('captain', 'Captain {last}', 'for the armband he was born to wear', { captain: 1, trust: 0.4 }, 'trust', 'shield', 5),

  // ---- his name, his number, his town ----
  N('double-initial', 'Double {i}', 'for the matching initials', { alliteration: 1 }, 'swap', 'roundel', 0),
  N('buckets', '{first} Buckets', 'for the buckets, plural, every night', { scorer: 1, SHT: 0.3 }, 'shoot', 'roundel', 1),
  N('big-first', 'Big {first}', 'because everything about him is big', { big: 0.7, heavy: 0.5, tall: 0.3 }, 'person', 'banner', 0),
  N('little-first', 'Little {first}', 'for the smallest player with the biggest heart', { small: 1, rep: 0.2 }, 'heart', 'roundel', 0, true),
  N('karat', '{num} Karat', 'for the number on his back and the gold in his game', { karat: 1 }, 'chain', 'octagon', 0),
  N('lucky-seven', 'Lucky Seven', 'for the seven on his back and the luck that follows it', { num7: 1 }, 'stars', 'square', 6),
  N('zero-gravity', 'Zero Gravity', 'for the zero on his jersey and nothing holding him down', { num0: 1, ATH: 0.4 }, 'rocket', 'octagon', 5),
  N('town-kid', 'The {town} Kid', 'because {town} has never had one like him', { young: 0.5, hometown: 0.5 }, 'house', 'roundel', 2),
  N('pride-of', 'Pride of {town}', 'for putting {town} on the map', { hometown: 0.8, loyal: 0.3, rep: 0.3 }, 'podium', 'shield', 0),
  // ---- round 25, a second batch (the owner: more if possible) ----
  N('thunderclap', 'Thunderclap', 'for the dunks you hear from the parking lot', { ATH: 0.6, FIN: 0.6, blocks: 0.3 }, 'bolt', 'roundel', 0),
  N('velvet-hammer', 'Velvet Hammer', 'for a soft touch on a heavy frame', { FIN: 0.6, heavy: 0.4, IQ: 0.4 }, 'hammer', 'square', 0, true),
  N('the-owl', 'The Owl', 'for seeing the play before anyone else wakes up', { IQ: 0.8, PER: 0.3 }, 'owl', 'roundel', 2),
  N('night-shift', 'Night Shift', 'for the dirty work nobody sees on the highlights', { grind: 0.6, REB: 0.5, veteran: 0.3 }, 'watch', 'square', 2),
  N('snake-eyes', 'Snake Eyes', 'for the hands that strike before the pass is thrown', { steals: 0.6, PER: 0.5 }, 'snake', 'hex', 4),
  N('shark-tank', 'Shark Tank', 'for smelling blood in the paint', { INT: 0.5, scorer: 0.4, rep: 0.3 }, 'shark', 'octagon', 2),
  N('the-comet', 'The Comet', 'for streaking across the league before he could vote', { young: 0.6, ATH: 0.6 }, 'comet', 'banner', 0),
  N('anchor', 'Anchor', 'for holding the defense in place, every night', { INT: 0.6, big: 0.5, durable: 0.4 }, 'anchor', 'shield', 2),
  N('lone-wolf', 'Lone Wolf', 'for hunting the ball handler on his own', { PER: 0.6, grind: 0.4, steals: 0.4 }, 'wolf', 'hex', 0, true),
  N('crown-jewel', 'Crown Jewel', 'for being the best thing a franchise ever owned', { icon: 0.8, titles: 0.6 }, 'crown', 'shield', 3),
  N('summit', 'Summit', 'for standing on top of the league', { awards: 0.8, rep: 0.5 }, 'mountain', 'octagon', 0),
  N('snowplow', 'Snowplow', 'for clearing a path through the lane', { FIN: 0.5, heavy: 0.5, REB: 0.4 }, 'snow', 'square', 2),
  N('remote-control', 'Remote Control', 'for playing the other nine men like a video game', { PLY: 0.8, IQ: 0.4, guard: 0.3 }, 'controller', 'roundel', 5),
  N('the-bank', 'The Bank', 'for the bank shots, and for always paying out', { SHT: 0.5, scorer: 0.5, durable: 0.3 }, 'bank', 'hex', 0),
  N('fast-forward', 'Fast Forward', 'for a game that runs at double speed', { ATH: 0.6, guard: 0.4, young: 0.3 }, 'fast', 'square', 0, true),
  N('eagle-eye', 'Eagle Eye', 'for spotting the open man from across the floor', { PLY: 0.6, passer: 0.5, IQ: 0.3 }, 'wings', 'roundel', 0, true),
  N('grizzly', 'Grizzly', 'for the beard and the bad temper in the paint', { heavy: 0.6, beard: 0.6 }, 'bear', 'hex', 0),
  N('stop-sign', 'Stop Sign', 'because nothing gets past him', { PER: 0.7, INT: 0.4 }, 'block', 'octagon', 1),
  N('hot-hand', 'Hot Hand', 'for the nights when every shot falls', { SHT: 0.7, scorer: 0.4 }, 'flame', 'hex', 6),
  N('the-fireman', 'The Fireman', 'for putting out every fire the second unit starts', { sixth: 0.6, clutch: 0.5 }, 'flame', 'shield', 1),
  N('velcro', 'Velcro', 'for sticking to his man for 48 minutes', { PER: 0.8, steals: 0.3 }, 'steal', 'hex', 0),
  N('the-surgeon', 'The Surgeon', 'for cutting defenses open, carefully', { FIN: 0.6, IQ: 0.6 }, 'health', 'roundel', 4),
  N('crossword', 'Crossword', 'for a game you need a pencil to solve', { IQ: 0.6, PLY: 0.5, offhand: 0.3 }, 'book', 'octagon', 0, true),
  N('pogo', 'Pogo', 'for a small man who lives above the rim', { ATH: 0.8, small: 0.4 }, 'athletic', 'square', 0),
  N('box-office', 'Box Office', 'for the tickets he sells every time he plays', { rep: 0.7, scorer: 0.5 }, 'camera', 'octagon', 6),
  N('the-tower', 'The Tower', 'for the shadow he casts over the paint', { tall: 0.8, INT: 0.4 }, 'lighthouse', 'roundel', 0, true),
  N('forklift', 'Forklift', 'for picking up every board and carrying it home', { REB: 0.6, heavy: 0.5, INT: 0.3 }, 'strength', 'octagon', 0),
  N('accountant', 'The Accountant', 'for a game where everything adds up', { IQ: 0.6, durable: 0.5, passer: 0.3 }, 'chart', 'square', 2),
  N('hometown-hero', 'Hometown Hero', 'for staying close to where it all began', { loyal: 0.6, hometown: 0.6 }, 'house', 'shield', 1),
  N('the-pilot', 'The Pilot', 'for flying the whole team wherever it needs to go', { PLY: 0.6, 'arch:Floor General': 0.5 }, 'jet', 'octagon', 2),
  N('boomerang', 'Boomerang', 'for always finding his way back home', { returned: 1 }, 'swap', 'shield', 0, true),
  N('the-encore', 'The Encore', 'for one more great season every time they say he is done', { veteran: 0.6, clutch: 0.4, titles: 0.3 }, 'stars', 'banner', 0, true),
  N('lights-out', 'Lights Out', 'for turning the arena off with one shot', { clutch: 0.6, SHT: 0.6 }, 'spotlight', 'square', 0, true),
];

/** The made-up companies that put a player's logo on their products. */
export const BRANDS: { name: string; color: string }[] = [
  { name: 'Courtline', color: '#1C7ED6' },
  { name: 'Northpaw', color: '#2F9E44' },
  { name: 'Fieldhouse', color: '#E8590C' },
  { name: 'Glasswork', color: '#0B7285' },
  { name: 'Baseline & Co.', color: '#7048E8' },
  { name: 'Hangtime Athletics', color: '#E03131' },
  { name: 'Ninth Floor', color: '#343A40' },
  { name: 'Selvedge Sport', color: '#7C4A23' },
];
