// Shop items (§12). Prices are in $M (0.00004 = $40). Effects are small and fixed;
// attribute boosts apply right away, injury and decline multipliers apply next season.

import type { AttrKey } from '../engine/types';

export type ShopCategory = 'Shoes' | 'Gear' | 'Training' | 'Recovery' | 'Lifestyle' | 'Accessories';

/** Where an accessory goes on the player (round 25: drawn on his sprite, changed in the wardrobe). */
export type WearSlot = 'head' | 'arm' | 'wrist' | 'legs';

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  price: number;
  blurb: string;
  attrs?: Partial<Record<AttrKey, number>>;
  focus?: number; // added to both focus stats
  range?: number;
  offhand?: number;
  touch?: number; // round 35: free-throw touch (player/touch.ts)
  injuryMult?: number;
  declineMult?: number;
  growthMult?: number; // next season's growth
  morale?: number;
  rep?: number;
  trust?: number;
  weight?: number; // lb on (or off)
  toIdeal?: number; // share of the way to his best playing weight
  wear?: { slot: WearSlot; color: string }; // an accessory: he wears it
  klass?: boolean; // round 35: sold only in a draft-class career (economy/shop.ts stock leaves it out of any other)
}

const K = 0.001; // $1K in $M

// round 25: accessories (the owner: headbands, shooting sleeves, leg warmers in many colours,
// with very little effect, worn on the avatar). Every slot comes in ten colours.
const WEAR_COLORS: [string, string][] = [
  ['Red', '#E03131'],
  ['Royal blue', '#1C7ED6'],
  ['Black', '#2A2D34'],
  ['White', '#F4F4F4'],
  ['Gold', '#FCC419'],
  ['Green', '#2F9E44'],
  ['Purple', '#7048E8'],
  ['Pink', '#F06595'],
  ['Orange', '#F76707'],
  ['Teal', '#12B886'],
];
const WEAR_KINDS: { slot: WearSlot; name: string; price: number; blurb: string; fx: Partial<ShopItem> }[] = [
  { slot: 'head', name: 'headband', price: 0.025 * K, blurb: 'Keeps the sweat out of your eyes, and looks the part.', fx: { morale: 1 } },
  { slot: 'arm', name: 'shooting sleeve', price: 0.04 * K, blurb: 'Warm elbow, same release every time.', fx: { attrs: { SHT: 0.2 } } },
  { slot: 'wrist', name: 'wristbands', price: 0.015 * K, blurb: 'Dry hands on the ball.', fx: { attrs: { PLY: 0.2 } } },
  { slot: 'legs', name: 'leg sleeves', price: 0.06 * K, blurb: 'Warm calves, a little less strain.', fx: { injuryMult: 0.995 } },
];
function accessories(): ShopItem[] {
  return WEAR_KINDS.flatMap((k) =>
    WEAR_COLORS.map(([cname, color]) => ({
      id: `wear-${k.slot}-${cname.toLowerCase().replace(/ /g, '-')}`,
      name: `${cname} ${k.name}`,
      category: 'Accessories' as const,
      price: k.price,
      blurb: k.blurb,
      ...k.fx,
      wear: { slot: k.slot, color },
    })),
  );
}

export const SHOP_ITEMS: ShopItem[] = [
  // shoes
  { id: 'court-shoes', name: 'Outlet court shoes', category: 'Shoes', price: 0.06 * K, blurb: 'Better grip than your old pair.', attrs: { ATH: 0.5 } },
  { id: 'retro-kicks', name: 'Retro signature kicks', category: 'Shoes', price: 0.25 * K, blurb: 'Feel faster, play faster.', attrs: { FIN: 1 }, morale: 2 },
  { id: 'custom-insoles', name: 'Custom insoles', category: 'Shoes', price: 0.4 * K, blurb: 'Your feet and knees thank you.', injuryMult: 0.94 },
  { id: 'lockdown-lows', name: 'Lockdown low-tops', category: 'Shoes', price: 0.18 * K, blurb: 'Built for sliding with guards.', attrs: { PER: 1 } },
  { id: 'pe-shoes', name: 'Player-edition shoes', category: 'Shoes', price: 3 * K, blurb: 'Your colors, your number.', attrs: { FIN: 1, ATH: 0.5 }, rep: 2 },
  { id: 'lab-shoes', name: 'Lab-fitted performance shoes', category: 'Shoes', price: 40 * K, blurb: 'Scanned, molded, built for your stride.', attrs: { ATH: 1 }, injuryMult: 0.92 },
  // gear and accessories
  { id: 'sleeve', name: 'Shooting sleeve', category: 'Gear', price: 0.04 * K, blurb: 'Pure placebo. Probably.', attrs: { SHT: 1 } },
  { id: 'grip', name: 'Grip trainer', category: 'Gear', price: 0.025 * K, blurb: 'Stronger hands, tighter handle.', attrs: { PLY: 1 } },
  { id: 'bands', name: 'Resistance bands', category: 'Gear', price: 0.06 * K, blurb: 'Hip work every night.', attrs: { ATH: 1 } },
  { id: 'goggles', name: 'Dribble goggles', category: 'Gear', price: 0.03 * K, blurb: 'Eyes up.', attrs: { PLY: 0.5, IQ: 0.5 } },
  { id: 'off-hand-ball', name: 'Weighted off-hand ball', category: 'Gear', price: 0.05 * K, blurb: 'Left, left, left.', offhand: 4 },
  { id: 'headband', name: 'Lucky headband', category: 'Gear', price: 0.015 * K, blurb: 'You played well the last time you wore it.', morale: 4 },
  { id: 'chain', name: 'Gold chain', category: 'Gear', price: 12 * K, blurb: 'Pregame fit check.', rep: 3, morale: 4 },
  { id: 'watch', name: 'Luxury watch', category: 'Gear', price: 60 * K, blurb: 'The tunnel walk is a runway now.', rep: 4, morale: 3 },
  // training
  { id: 'film-tablet', name: 'Film tablet', category: 'Training', price: 0.6 * K, blurb: 'Watch every possession twice.', attrs: { IQ: 1 } },
  { id: 'jump-program', name: 'Jump-training program', category: 'Training', price: 1.5 * K, blurb: 'Eight weeks of plyometrics.', attrs: { ATH: 1 } },
  { id: 'shooting-machine', name: 'Shooting machine', category: 'Training', price: 9 * K, blurb: '500 makes a day.', attrs: { SHT: 1.5 }, range: 2 },
  { id: 'skills-trainer', name: 'Summer skills trainer', category: 'Training', price: 25 * K, blurb: 'A pro trainer for the summer.', focus: 1.5 },
  { id: 'home-gym', name: 'Home weight room', category: 'Training', price: 60 * K, blurb: 'No excuses at 6 a.m.', attrs: { REB: 1.5, FIN: 0.5 } },
  { id: 'shot-doctor', name: 'Shot doctor sessions', category: 'Training', price: 150 * K, blurb: 'A famous shooting coach rebuilds your release.', attrs: { SHT: 2 }, range: 4 },
  { id: 'private-coach', name: 'Private skills coach', category: 'Training', price: 500 * K, blurb: 'Year-round, on call.', attrs: { PLY: 2 }, growthMult: 1.05 },
  { id: 'passing-machine', name: 'Passing machine', category: 'Training', price: 4 * K, blurb: 'Hit the moving target, a thousand times a night.', attrs: { PLY: 1.5 } },
  { id: 'contact-pads', name: 'Contact pads and a big-man coach', category: 'Training', price: 25 * K, blurb: 'Finish through the hit, every rep.', attrs: { FIN: 1.5, INT: 0.5 } },
  { id: 'private-gym', name: 'Private gym', category: 'Training', price: 3000 * K, blurb: 'Your own court, your own hours.', focus: 1, growthMult: 1.08 },
  { id: 'biomech-lab', name: 'Biomechanics lab', category: 'Training', price: 15000 * K, blurb: 'Motion capture on every move.', attrs: { SHT: 1, FIN: 1.5 }, injuryMult: 0.9 },
  { id: 'practice-facility', name: 'Own practice facility', category: 'Training', price: 40000 * K, blurb: 'A building with your name on it.', focus: 2, growthMult: 1.1 },
  // recovery
  { id: 'massage-gun', name: 'Massage gun', category: 'Recovery', price: 0.4 * K, blurb: 'Loosen up after every game.', injuryMult: 0.95 },
  { id: 'cold-tub', name: 'Cold plunge tub', category: 'Recovery', price: 8 * K, blurb: 'Two minutes of misery, nightly.', injuryMult: 0.9 },
  { id: 'sleep-pod', name: 'Sleep pod', category: 'Recovery', price: 35 * K, blurb: 'Nine hours, every night.', morale: 5, injuryMult: 0.95 },
  { id: 'chef', name: 'Personal chef', category: 'Recovery', price: 200 * K, blurb: 'No more drive-thru.', injuryMult: 0.9, toIdeal: 0.5 },
  { id: 'meal-plan', name: 'Nutritionist meal plan', category: 'Recovery', price: 2.5 * K, blurb: 'Every meal weighed and counted.', toIdeal: 0.35 },
  { id: 'smart-scale', name: 'Smart scale', category: 'Gear', price: 0.08 * K, blurb: 'It knows. It always knows.', toIdeal: 0.15 },
  { id: 'mass-gainer', name: 'Mass-gainer shakes', category: 'Training', price: 0.12 * K, blurb: 'Five thousand calories a day.', weight: 7, attrs: { REB: 0.5 } },
  { id: 'air-bike', name: 'Air bike', category: 'Training', price: 1.2 * K, blurb: 'Twenty minutes, every morning, no mercy.', weight: -6, attrs: { ATH: 0.5 } },
  { id: 'hyperbaric', name: 'Hyperbaric chamber', category: 'Recovery', price: 120 * K, blurb: 'Slows the clock a little.', declineMult: 0.8 },
  { id: 'recovery-suite', name: 'Recovery suite', category: 'Recovery', price: 5000 * K, blurb: 'Cryo, hydrotherapy, a full staff.', injuryMult: 0.8, declineMult: 0.85 },
  // lifestyle
  { id: 'gaming-setup', name: 'Gaming setup', category: 'Lifestyle', price: 1.2 * K, blurb: 'For the road trips.', morale: 6 },
  { id: 'family-seats', name: 'Courtside seats for family', category: 'Lifestyle', price: 50 * K, blurb: 'Your mom never misses a game.', morale: 8 },
  { id: 'backyard-court', name: 'Backyard court', category: 'Lifestyle', price: 150 * K, blurb: 'Lights on until midnight.', attrs: { SHT: 0.5, FIN: 0.5 }, morale: 5 },
  { id: 'car', name: 'Luxury car', category: 'Lifestyle', price: 250 * K, blurb: 'Parking-lot photos guaranteed.', rep: 3, morale: 5 },
  { id: 'jet', name: 'Private jet hours', category: 'Lifestyle', price: 8000 * K, blurb: 'Show up rested and famous.', rep: 5, injuryMult: 0.95 },
  { id: 'mansion', name: 'Mansion', category: 'Lifestyle', price: 12000 * K, blurb: 'Eleven bathrooms.', morale: 10, rep: 4 },
  { id: 'charity', name: 'Fund a court back home', category: 'Lifestyle', price: 300 * K, blurb: 'Your name on the backboard where it started.', rep: 5, morale: 6, trust: 3 },
  // more for big contracts (playtest round 3)
  { id: 'altitude', name: 'Altitude camp in Colorado', category: 'Training', price: 90 * K, blurb: 'Thin air, big lungs: you can guard full court all night.', attrs: { ATH: 0.5, PER: 1 }, growthMult: 1.03 },
  { id: 'offhand-coach', name: 'Weak-hand specialist', category: 'Training', price: 150 * K, blurb: 'A summer of left-hand-only (or right-hand-only) everything.', offhand: 6 },
  { id: 'film-analyst', name: 'Film analyst on payroll', category: 'Training', price: 400 * K, blurb: 'Every opponent tendency on your phone.', attrs: { IQ: 1.5 } },
  { id: 'shot-coach', name: 'Full-time shooting coach', category: 'Training', price: 600 * K, blurb: 'Ten thousand reps, every one charted.', focus: 0.5, range: 4, attrs: { SHT: 1 } },
  { id: 'skills-staff', name: 'Personal skills staff', category: 'Training', price: 2500 * K, blurb: 'A trainer, a rebounder and an analyst, all yours.', growthMult: 1.08, focus: 1 },
  { id: 'sc-staff', name: 'Strength and conditioning staff', category: 'Training', price: 3000 * K, blurb: 'Your own performance team.', attrs: { ATH: 0.5, INT: 1 }, injuryMult: 0.9 },
  { id: 'island-camp', name: 'Private training camp abroad', category: 'Training', price: 9000 * K, blurb: 'Six weeks, the best coaches money can fly in.', growthMult: 1.1, focus: 1.5, declineMult: 0.97 },
  { id: 'cryo', name: 'Cryotherapy chamber', category: 'Recovery', price: 300 * K, blurb: 'Three minutes at minus 110 degrees.', injuryMult: 0.95 },
  { id: 'sleep-sci', name: 'Sleep scientist', category: 'Recovery', price: 250 * K, blurb: 'Blackout curtains and a schedule that works.', injuryMult: 0.96, morale: 4 },
  { id: 'physio', name: 'Full-time physiotherapist', category: 'Recovery', price: 900 * K, blurb: 'Treatment twice a day, home and away.', injuryMult: 0.9, declineMult: 0.98 },
  { id: 'longevity', name: 'Longevity clinic program', category: 'Recovery', price: 20000 * K, blurb: 'Bloodwork, scans and a plan to play until 40.', declineMult: 0.85, injuryMult: 0.9 },
  { id: 'watches', name: 'Watch collection', category: 'Lifestyle', price: 500 * K, blurb: 'Tunnel-walk content for a year.', rep: 2, morale: 3 },
  { id: 'youth-camp', name: 'Your own youth camp', category: 'Lifestyle', price: 1000 * K, blurb: 'Three hundred kids in your jersey.', rep: 4, trust: 2, morale: 4 },
  { id: 'doc-crew', name: 'Documentary crew', category: 'Lifestyle', price: 1500 * K, blurb: 'Cameras everywhere. Fans love it; teammates less so.', rep: 6, morale: -2, trust: -2 },
  { id: 'parents-home', name: 'A house for your parents', category: 'Lifestyle', price: 2000 * K, blurb: 'You hand your mom the keys.', morale: 12 },
  { id: 'art', name: 'Art collection', category: 'Lifestyle', price: 5000 * K, blurb: 'A gallery in the hallway.', morale: 4, rep: 2 },
  { id: 'esports', name: 'Buy an esports team', category: 'Lifestyle', price: 10000 * K, blurb: 'Owner at 25.', rep: 5, morale: 3 },
  { id: 'vineyard', name: 'Vineyard', category: 'Lifestyle', price: 25000 * K, blurb: 'Your name on a label.', morale: 8, rep: 3 },
  { id: 'yacht', name: 'Yacht', category: 'Lifestyle', price: 30000 * K, blurb: 'Summers on the water.', morale: 10, rep: 4, injuryMult: 0.97 },
  { id: 'island', name: 'Private island retreat', category: 'Lifestyle', price: 45000 * K, blurb: 'The quietest offseason in the league.', morale: 12, declineMult: 0.97 },
  { id: 'club-stake', name: 'Stake in a pro club back home', category: 'Lifestyle', price: 60000 * K, blurb: 'Part-owner of the team you grew up watching.', rep: 10, morale: 6 },
  // round 8: a bigger catalog; each shop shows about six of these at random
  { id: 'jump-rope', name: 'Speed rope', category: 'Gear', price: 0.012 * K, blurb: 'Ten minutes of double-unders before school.', attrs: { ATH: 0.5 }, morale: 1 },
  { id: 'cones', name: 'Agility cones and a ladder', category: 'Gear', price: 0.02 * K, blurb: 'Driveway footwork, every night.', attrs: { PER: 0.5, ATH: 0.5 } },
  { id: 'rebounder-net', name: 'Return net', category: 'Gear', price: 0.15 * K, blurb: 'The ball comes back to you. Shoot all day.', attrs: { SHT: 1 } },
  { id: 'heavy-ball', name: 'Heavy basketball', category: 'Gear', price: 0.035 * K, blurb: 'Feels like a feather on game night.', attrs: { PLY: 0.5, FIN: 0.5 } },
  { id: 'tipping-stick', name: 'Rebounding tip trainer', category: 'Gear', price: 0.09 * K, blurb: 'Tap, tap, tap at the top of the jump.', attrs: { REB: 1 } },
  { id: 'block-pad', name: 'Block-out pads', category: 'Gear', price: 0.08 * K, blurb: 'A teammate swings, you hold your ground.', attrs: { INT: 0.5, REB: 0.5 } },
  { id: 'notebook', name: 'Scouting notebook', category: 'Gear', price: 0.005 * K, blurb: 'Write down every coverage you see.', attrs: { IQ: 0.5 } },
  { id: 'headphones', name: 'Noise-cancelling headphones', category: 'Gear', price: 0.3 * K, blurb: 'Your pregame bubble.', morale: 4 },
  { id: 'wrist-weights', name: 'Wrist weights', category: 'Gear', price: 0.03 * K, blurb: 'Stronger wrists, quicker hands in the passing lane.', attrs: { PER: 0.5, PLY: 0.5 } },
  { id: 'mouthguard', name: 'Custom mouthguard', category: 'Gear', price: 0.2 * K, blurb: 'Go up through contact without thinking twice.', attrs: { FIN: 0.5 }, injuryMult: 0.98 },
  { id: 'vr-trainer', name: 'VR reads trainer', category: 'Training', price: 2.5 * K, blurb: 'A thousand pick-and-rolls a week, in a headset.', attrs: { IQ: 1, PLY: 0.5 } },
  { id: 'camp-ticket', name: 'Elite summer camp', category: 'Training', price: 1.2 * K, blurb: 'A week against the best kids in the region.', focus: 0.5, rep: 2 },
  { id: 'pool-pass', name: 'Pool training pass', category: 'Training', price: 0.5 * K, blurb: 'Explosiveness without pounding your knees.', attrs: { ATH: 0.5 }, injuryMult: 0.97 },
  { id: 'boxing', name: 'Boxing classes', category: 'Training', price: 0.8 * K, blurb: 'Footwork, hands and a mean streak.', attrs: { PER: 1 }, morale: 1 },
  { id: 'yoga', name: 'Yoga and mobility coach', category: 'Recovery', price: 3 * K, blurb: 'Hips that open, hamstrings that do not pull.', injuryMult: 0.93, declineMult: 0.99 },
  { id: 'post-coach', name: 'Retired big man as a post coach', category: 'Training', price: 20 * K, blurb: 'Drop step, up and under, the whole old-school bag.', attrs: { FIN: 1, INT: 1 } },
  { id: 'rebound-coach', name: 'Rebounding specialist', category: 'Training', price: 35 * K, blurb: 'Angles, timing, and where misses land.', attrs: { REB: 1.5 } },
  { id: 'defense-coach', name: 'Defensive coordinator for hire', category: 'Training', price: 75 * K, blurb: 'Slides, closeouts and help rotations, all summer.', attrs: { PER: 1.5, IQ: 0.5 } },
  { id: 'pg-mentor', name: 'Summer with a retired point guard', category: 'Training', price: 120 * K, blurb: 'He sees the floor two passes ahead. Now you do too.', attrs: { PLY: 1.5, IQ: 1 } },
  { id: 'track-coach', name: 'Sprint coach', category: 'Training', price: 45 * K, blurb: 'First-step speed from a track coach.', attrs: { ATH: 1 } },
  { id: 'sleep-tracker', name: 'Sleep and recovery tracker', category: 'Recovery', price: 0.25 * K, blurb: 'Your ring knows when you need a day off.', injuryMult: 0.97 },
  { id: 'physio-visits', name: 'Weekly physio visits', category: 'Recovery', price: 2 * K, blurb: 'Catch the small things before they turn big.', injuryMult: 0.93 },
  { id: 'nutritionist', name: 'Sports nutritionist', category: 'Recovery', price: 15 * K, blurb: 'Real food, on a plan.', attrs: { ATH: 0.5 }, injuryMult: 0.95, declineMult: 0.98 },
  { id: 'altitude-tent', name: 'Altitude sleeping tent', category: 'Recovery', price: 6 * K, blurb: 'Sleep at 9,000 feet, play at sea level.', attrs: { ATH: 0.5 }, morale: -1 },
  { id: 'sports-psych', name: 'Sports psychologist', category: 'Recovery', price: 50 * K, blurb: 'Quiet mind at the free-throw line.', morale: 6, attrs: { SHT: 0.5 }, touch: 1.5 },
  { id: 'meditation', name: 'Meditation app', category: 'Lifestyle', price: 0.07 * K, blurb: 'Ten minutes a day. Breathe.', morale: 3 },
  { id: 'stream-setup', name: 'Streaming setup', category: 'Lifestyle', price: 2 * K, blurb: 'Fans watch you play video games. You gain followers.', rep: 3, morale: 2 },
  { id: 'team-dinner', name: 'Dinner for the whole team', category: 'Lifestyle', price: 4 * K, blurb: 'Steaks on you. The locker room remembers.', trust: 4, morale: 3 },
  // round 35: free-throw touch (the round's theme: the line, and the 50-40-90)
  { id: 'ft-line-tape', name: 'A free-throw line taped on the garage floor', category: 'Gear', price: 0.03 * K, blurb: 'Fifteen feet from the door, measured twice. A hundred makes before dinner.', touch: 2.5 },
  { id: 'ft-shot-machine', name: 'A free-throw rebounding machine', category: 'Training', price: 9 * K, blurb: 'It catches every make and sends it back. It never gets tired; you do.', touch: 4, attrs: { SHT: 0.3 } },
  // round 35, end of the round: friends (a draft class, a friend's challenge) and the jumper that ages
  { id: 'gym-key', name: 'A gym key for Sunday runs with friends', category: 'Lifestyle', price: 2 * K, blurb: 'Your old high school gym, every Sunday at ten. Whoever shows up plays.', attrs: { FIN: 0.3, PER: 0.3 }, morale: 3 },
  { id: 'rival-film', name: 'Film on every rival your age', category: 'Training', price: 15 * K, blurb: 'Every player from your draft class, every tendency, on one hard drive.', attrs: { IQ: 0.5, PER: 0.5 } },
  { id: 'game-night', name: 'A game-night table for the old crew', category: 'Lifestyle', price: 0.8 * K, blurb: 'Cards on Thursdays, the same five friends since the eighth grade.', morale: 4 },
  { id: 'friends-cabin', name: 'A lake cabin for the summer crew', category: 'Lifestyle', price: 350 * K, blurb: 'Bunk beds for eight, a dock, and a hoop nailed to the boathouse.', morale: 8, rep: 1 },
  { id: 'release-coach', name: 'A shooting coach for older legs', category: 'Training', price: 80 * K, blurb: 'Less dip, less leg, the ball out a beat sooner. The jumper that ages well.', attrs: { SHT: 0.5 }, declineMult: 0.97 },
  // round 35, later: only in a draft-class career, for the class itself (so no other career's shop draws change)
  { id: 'class-jersey-art', name: 'Framed art of your draft class’s jerseys', category: 'Lifestyle', price: 15 * K, blurb: 'Your whole draft class in its college colors, one draft night, on one wall.', morale: 3, rep: 1, klass: true },
  { id: 'class-trainer', name: 'A trainer you share with a classmate', category: 'Training', price: 20 * K, blurb: 'Two first-round picks, one trainer, every rep a race.', focus: 1, morale: 2, klass: true },
  { id: 'reunion-suit', name: 'A stylist’s suit for reunion night', category: 'Lifestyle', price: 6 * K, blurb: 'Cut now, worn the night every career in the class is over.', rep: 2, morale: 2, klass: true },
  // round 36: the rafters finale, the speech and the body (the round's systems: the jersey that goes
  // up, the speech under the lights, the Player tab's Body panel); kept in the Your life collection
  { id: 'framed-jersey', name: 'Your first jersey, framed', category: 'Lifestyle', price: 0.5 * K, blurb: 'The one from your first team, number and all, behind glass in the hallway.', morale: 3, rep: 1 },
  { id: 'rafters-banner', name: 'A replica rafters banner for the garage', category: 'Lifestyle', price: 2.5 * K, blurb: 'Your name and number on a banner, hung from the garage beams. Practice for the real one.', morale: 4 },
  { id: 'speech-coach', name: 'A public-speaking coach', category: 'Lifestyle', price: 8 * K, blurb: 'For press conferences now, and one long speech later. Slow down, look up, breathe.', rep: 2, morale: 1, trust: 1 },
  { id: 'body-scan', name: 'A yearly full-body scan', category: 'Recovery', price: 12 * K, blurb: 'Every joint and tendon, measured each August. The small things get caught while they are small.', injuryMult: 0.95, declineMult: 0.99 },
  // round 37: the town and its arenas, the knee and the long career (the round's systems: the street
  // he walks, an arena for every city, round 36's career-altering injury and aging that diverges)
  { id: 'arena-prints', name: 'Framed prints of every arena in the league', category: 'Lifestyle', price: 1.2 * K, blurb: 'Thirty arenas and their skylines, in a row down the hallway. You have played in most of them.', morale: 3 },
  { id: 'city-bike', name: 'A city bike for getting around town', category: 'Lifestyle', price: 0.9 * K, blurb: 'Gym, arena, home, no traffic. The doorman at the arena keeps a spot for it by the loading dock.', morale: 2, attrs: { ATH: 0.2 } },
  { id: 'knee-brace', name: 'A custom-fitted knee brace', category: 'Gear', price: 1.5 * K, blurb: 'Carbon and foam, cast from your own knee. It clicks on, and you stop thinking about it.', injuryMult: 0.97 },
  { id: 'longevity-clinic', name: 'A summer at a longevity clinic', category: 'Recovery', price: 90 * K, blurb: 'Cold plunges, blood work and sleep studies every August, with the doctor half the league quietly sees.', declineMult: 0.985, injuryMult: 0.98 },
  // round 34: simplification (the round's theme: fewer, better things)
  { id: 'career-scrapbook', name: 'A career scrapbook', category: 'Lifestyle', price: 0.3 * K, blurb: 'Every clipping since high school, in one fat binder.', morale: 3, rep: 1 },
  { id: 'one-move-coach', name: 'A one-move coach', category: 'Training', price: 3 * K, blurb: 'One move, a thousand times a day, until it is yours.', attrs: { FIN: 0.5 }, morale: 1 },
  { id: 'fundamentals-camp', name: 'Fundamentals camp', category: 'Training', price: 5 * K, blurb: 'Pivots, footwork, bank shots. The boring things that win.', attrs: { IQ: 0.5, PER: 0.3 } },
  { id: 'announcer-dinner', name: 'Dinner with the arena announcer', category: 'Lifestyle', price: 1 * K, blurb: 'He teaches you to say your own name the way he does.', rep: 2, morale: 2 },
  { id: 'minimal-locker', name: 'A minimalist locker', category: 'Lifestyle', price: 0.5 * K, blurb: 'One hook, one shelf, one pair of shoes. The room follows.', morale: 2, trust: 1 },
  // round 33: efficiency, and the nights that go wrong (the round's achievements)
  { id: 'shot-chart-wall', name: 'Your shot chart, poster size', category: 'Training', price: 0.15 * K, blurb: 'Green where you make them. Red where you should stop.', attrs: { IQ: 0.5 } },
  { id: 'ft-routine-coach', name: 'Free-throw routine specialist', category: 'Training', price: 4 * K, blurb: 'Same breath, same dribbles, same spin. Underhand, if you dare.', attrs: { SHT: 0.5 }, touch: 4, morale: 1 },
  { id: 'ball-security', name: 'Ball-security camp with a retired point guard', category: 'Training', price: 6 * K, blurb: 'Two hands in traffic. Fewer giveaways.', attrs: { PLY: 0.5, IQ: 0.5 } },
  { id: 'box-score-frame', name: 'Your best box score, framed', category: 'Lifestyle', price: 0.4 * K, blurb: 'Every number from your best night, behind glass.', rep: 1, morale: 3 },
  { id: 'gold-brick', name: 'A gold-painted brick', category: 'Lifestyle', price: 0.05 * K, blurb: 'For the night nothing went in. You can laugh about it now.', morale: 4 },
  // round 32: the locker room, the coach, the farewell tour, record chases, love and a family
  { id: 'locker-speaker', name: 'Locker room sound system', category: 'Lifestyle', price: 1.5 * K, blurb: 'Pregame playlists the whole room argues about.', morale: 3, trust: 1 },
  { id: 'hof-whistle', name: 'A Hall of Fame coach\u2019s whistle', category: 'Lifestyle', price: 3 * K, blurb: 'A gift for your coach. He hangs it in his office.', trust: 4, morale: 1 },
  { id: 'coach-film-room', name: 'New film room for the coaches', category: 'Training', price: 25 * K, blurb: 'Your coaches get the screens; you get the reads.', attrs: { IQ: 0.5 }, trust: 5 },
  { id: 'farewell-jacket', name: 'Farewell tour jacket', category: 'Lifestyle', price: 6 * K, blurb: 'Your number, and every city you have played in.', rep: 3, morale: 3 },
  { id: 'record-case', name: 'Display case for your milestone balls', category: 'Lifestyle', price: 12 * K, blurb: 'Every big night, under glass.', rep: 2, morale: 3 },
  { id: 'engagement-ring', name: 'A ring that is not a championship ring', category: 'Lifestyle', price: 25 * K, blurb: 'For the one who puts up with the road trips.', morale: 6 },
  { id: 'family-home', name: 'A family home with a hoop out back', category: 'Lifestyle', price: 2000 * K, blurb: 'Room to grow, and a court for the next one in the family.', morale: 8, rep: 2 },
  { id: 'stylist', name: 'Personal stylist', category: 'Lifestyle', price: 30 * K, blurb: 'Tunnel fits that trend every week.', rep: 3 },
  { id: 'scholarship-fund', name: 'Scholarship fund at your old school', category: 'Lifestyle', price: 100 * K, blurb: 'Ten kids a year go to college on you.', rep: 4, morale: 5, trust: 2 },
  { id: 'sneaker-line', name: 'Your own sneaker colorway', category: 'Shoes', price: 800 * K, blurb: 'Sold out in an hour.', rep: 6, morale: 3 },
  { id: 'trail-shoes', name: 'Trail runners for summer conditioning', category: 'Shoes', price: 0.12 * K, blurb: 'Hill sprints at dawn.', attrs: { ATH: 0.5 }, injuryMult: 0.98 },
  // round 9
  { id: 'chalk-ball', name: 'Indoor composite ball', category: 'Gear', price: 0.07 * K, blurb: 'Same ball they use in the league.', attrs: { SHT: 0.5, PLY: 0.5 } },
  { id: 'vertical-shoes', name: 'Plyometric jump shoes', category: 'Shoes', price: 0.14 * K, blurb: 'Ugly, heavy and they work.', attrs: { ATH: 0.5, REB: 0.5 } },
  { id: 'shooting-gloves', name: 'Shooting-form gloves', category: 'Gear', price: 0.025 * K, blurb: 'Two fingers, the right way.', attrs: { SHT: 0.5 } },
  { id: 'smart-ball', name: 'Smart ball with an app', category: 'Gear', price: 0.2 * K, blurb: 'Counts every dribble and every arc.', attrs: { PLY: 0.5, SHT: 0.5 } },
  { id: 'foam-roller', name: 'Foam roller kit', category: 'Recovery', price: 0.04 * K, blurb: 'Painful. Useful.', injuryMult: 0.98 },
  { id: 'compression', name: 'Compression boots', category: 'Recovery', price: 1.5 * K, blurb: 'Legs like new after back-to-backs.', injuryMult: 0.94 },
  { id: 'reaction-lights', name: 'Reaction light system', category: 'Training', price: 1.8 * K, blurb: 'Hit the light before it goes out.', attrs: { PER: 0.5, IQ: 0.5 } },
  { id: 'hoop-cam', name: 'Hoop camera and tracking app', category: 'Training', price: 0.9 * K, blurb: 'Every shot you take, charted.', attrs: { SHT: 1 } },
  { id: 'big-man-camp', name: 'Big-man camp', category: 'Training', price: 5 * K, blurb: 'Post moves from a Hall of Fame center.', attrs: { FIN: 1, REB: 0.5, INT: 0.5 } },
  { id: 'guard-academy', name: 'Guard skills academy', category: 'Training', price: 5 * K, blurb: 'Two weeks of ball screens and pull-ups.', attrs: { PLY: 1, SHT: 0.5 } },
  { id: 'wing-camp', name: 'Two-way wing camp', category: 'Training', price: 7 * K, blurb: 'Close out, slide, sprint, shoot.', attrs: { PER: 1, SHT: 0.5 } },
  { id: 'chess-coach', name: 'Chess coach', category: 'Training', price: 2 * K, blurb: 'See three moves ahead, on and off the court.', attrs: { IQ: 1 } },
  { id: 'martial-arts', name: 'Martial arts training', category: 'Training', price: 12 * K, blurb: 'Balance, hips and a low center of gravity.', attrs: { INT: 1, PER: 0.5 } },
  { id: 'eye-training', name: 'Vision training', category: 'Training', price: 18 * K, blurb: 'Peripheral vision drills from a sports optometrist.', attrs: { PLY: 1, IQ: 0.5 } },
  { id: 'legend-workout', name: 'A week with a retired legend', category: 'Training', price: 250 * K, blurb: 'He shows you the moves that made him famous.', focus: 1, rep: 2 },
  { id: 'analytics-team', name: 'Personal analytics team', category: 'Training', price: 700 * K, blurb: 'They tell you which shots to stop taking.', attrs: { IQ: 1, SHT: 1 } },
  { id: 'blood-flow', name: 'Blood-flow restriction training', category: 'Recovery', price: 40 * K, blurb: 'Strength without heavy weights.', attrs: { ATH: 0.5 }, injuryMult: 0.95 },
  { id: 'dentist', name: 'A long-overdue dentist visit', category: 'Recovery', price: 0.3 * K, blurb: 'Turns out that headache was your tooth.', morale: 3 },
  { id: 'chef-team', name: 'Team chef for road trips', category: 'Recovery', price: 350 * K, blurb: 'Same food at home and on the road.', injuryMult: 0.93, declineMult: 0.98 },
  { id: 'gaming-chair', name: 'Very expensive gaming chair', category: 'Lifestyle', price: 0.6 * K, blurb: 'Lumbar support for the long nights.', morale: 3 },
  { id: 'pet-dog', name: 'A dog', category: 'Lifestyle', price: 1 * K, blurb: 'He does not care if you went 2 for 14.', morale: 7 },
  { id: 'vacation', name: 'Two weeks somewhere warm', category: 'Lifestyle', price: 15 * K, blurb: 'Phone off. Feet in the sand.', morale: 8, injuryMult: 0.97 },
  { id: 'podcast-studio', name: 'Podcast studio', category: 'Lifestyle', price: 80 * K, blurb: 'Your takes, every Tuesday.', rep: 4, trust: -1 },
  { id: 'restaurant', name: 'Open a restaurant', category: 'Lifestyle', price: 3500 * K, blurb: 'Your grandmother’s recipes, your name on the door.', rep: 3, morale: 6 },
  // round 13
  { id: 'clip-library', name: 'Film tablet with clip library', category: 'Training', price: 0.6 * K, blurb: 'Every possession you played, cut and tagged.', attrs: { IQ: 1 } },
  { id: 'agility-ladder', name: 'Agility ladder and cones', category: 'Gear', price: 0.03 * K, blurb: 'Quick feet, every morning.', attrs: { ATH: 0.5, PER: 0.5 } },
  { id: 'weighted-vest', name: 'Weighted vest', category: 'Gear', price: 0.09 * K, blurb: 'Take it off and you fly.', attrs: { ATH: 0.5, REB: 0.5 }, injuryMult: 1.02 },
  { id: 'ball-machine', name: 'Rebounding ball machine', category: 'Training', price: 8 * K, blurb: 'Five hundred shots an hour, no rebounder needed.', attrs: { SHT: 1 }, range: 1 },
  { id: 'floater-coach', name: 'Floater specialist', category: 'Training', price: 25 * K, blurb: 'The teardrop over the big man, from every angle.', attrs: { FIN: 1, SHT: 0.5 } },
  { id: 'handle-coach', name: 'Ball-handling guru', category: 'Training', price: 30 * K, blurb: 'The one all the stars post videos with.', attrs: { PLY: 1.5 }, rep: 1 },
  { id: 'cryo-sessions', name: 'Cryotherapy sessions', category: 'Recovery', price: 4 * K, blurb: 'Three minutes at minus 110. Bring a hat.', injuryMult: 0.95, declineMult: 0.99 },
  { id: 'private-chef', name: 'Private chef', category: 'Recovery', price: 90 * K, blurb: 'No more drive-throughs.', injuryMult: 0.94, declineMult: 0.97, toIdeal: 0.4 },
  { id: 'home-court', name: 'Home gym with a full court', category: 'Training', price: 600 * K, blurb: 'Midnight workouts whenever you want.', focus: 1, growthMult: 1.03 },
  { id: 'vision-drills', name: 'Sports vision training', category: 'Training', price: 3 * K, blurb: 'See the passing lane a beat sooner.', attrs: { PLY: 0.5, PER: 0.5 } },
  { id: 'charity-game', name: 'Host a charity game', category: 'Lifestyle', price: 10 * K, blurb: 'Your friends, a packed gym, money for a good cause.', rep: 3, morale: 3, trust: 1 },
  { id: 'podcast', name: 'Start a podcast', category: 'Lifestyle', price: 1 * K, blurb: 'Weekly episodes. What could go wrong?', rep: 2, morale: 1, trust: -1 },
  { id: 'mentor-dinner', name: 'Dinner with a Hall of Famer', category: 'Lifestyle', price: 6 * K, blurb: 'Three hours of stories and one piece of advice.', attrs: { IQ: 0.5 }, morale: 4 },
  { id: 'sleep-coach', name: 'Sleep coach', category: 'Recovery', price: 8 * K, blurb: 'Nine hours, every night, no phone.', injuryMult: 0.96, morale: 2 },
  // round 25: the top end, for the money a max contract, brand deals and a signature line bring
  // in (the owner: expensive things follow a higher salary)
  { id: 'film-suite', name: 'Film room and a video coordinator', category: 'Training', price: 1200 * K, blurb: 'Every possession you played, cut and waiting by morning.', attrs: { IQ: 1.5 } },
  { id: 'altitude-camp', name: 'Altitude training camp', category: 'Training', price: 1800 * K, blurb: 'Six weeks at 2,400 metres. Sea level feels like cheating.', attrs: { ATH: 1 }, declineMult: 0.98 },
  { id: 'smart-court', name: 'Smart court at home', category: 'Gear', price: 2200 * K, blurb: 'Every shot tracked: arc, depth, left or right.', attrs: { SHT: 1 }, range: 1 },
  { id: 'sleep-lab', name: 'Sleep lab bedroom', category: 'Recovery', price: 3500 * K, blurb: 'Temperature, light and air, tuned to you.', declineMult: 0.97, morale: 2 },
  { id: 'legend-summer', name: 'A summer with three legends', category: 'Training', price: 6000 * K, blurb: 'Their moves, their secrets, their trash talk.', attrs: { IQ: 1 }, focus: 1, morale: 3 },
  { id: 'car-collection', name: 'Classic car collection', category: 'Lifestyle', price: 18000 * K, blurb: 'Forty cars, one garage, no time to drive them.', morale: 7, rep: 2 },
  { id: 'medical-staff', name: 'Medical team on your payroll', category: 'Recovery', price: 18000 * K, blurb: 'A doctor, two physios and a chef who travel with you.', injuryMult: 0.88, declineMult: 0.96 },
  { id: 'penthouse', name: 'Penthouse over the river', category: 'Lifestyle', price: 22000 * K, blurb: 'Three floors and a half court on the roof.', morale: 6, rep: 3 },
  { id: 'art-wing', name: 'A wing of the city art museum', category: 'Lifestyle', price: 30000 * K, blurb: 'Free entry for kids, your name over the door.', rep: 6, morale: 4, trust: 1 },
  { id: 'racehorses', name: 'Racehorse stable', category: 'Lifestyle', price: 35000 * K, blurb: 'Named the fastest one after your crossover.', morale: 6, rep: 5 },
  { id: 'hometown-film', name: 'Produce a film about your hometown', category: 'Lifestyle', price: 40000 * K, blurb: 'Shot on the court where you learned the game.', rep: 7, morale: 5 },
  { id: 'foundation', name: 'Endow your own foundation', category: 'Lifestyle', price: 50000 * K, blurb: 'Gyms, scholarships and coaches for kids back home.', rep: 10, morale: 5, trust: 3 },
  { id: 'regen-program', name: 'Regeneration program', category: 'Recovery', price: 50000 * K, blurb: 'The kind of science the league has not caught up with.', declineMult: 0.88, injuryMult: 0.95 },
  { id: 'orbit-seat', name: 'A seat on an orbital flight', category: 'Lifestyle', price: 55000 * K, blurb: 'Three days around the planet. The first player in space.', rep: 8, morale: 10 },
  { id: 'media-company', name: 'Start a media company', category: 'Lifestyle', price: 80000 * K, blurb: 'Your stories, your shows, your voice.', rep: 10, morale: 4 },
  { id: 'performance-hq', name: 'Performance headquarters', category: 'Training', price: 85000 * K, blurb: 'Three courts, a pool, a lab and a staff of forty.', focus: 2, growthMult: 1.08, injuryMult: 0.94 },
  { id: 'hometown-arena', name: 'Rebuild your hometown arena', category: 'Lifestyle', price: 100000 * K, blurb: 'Eight thousand seats where the old gym stood.', rep: 12, morale: 8, trust: 3 },
  { id: 'science-institute', name: 'Your own sports science institute', category: 'Training', price: 120000 * K, blurb: 'Researchers who study one athlete: you.', focus: 2, growthMult: 1.06, declineMult: 0.94, injuryMult: 0.92 },
  { id: 'superyacht', name: 'Superyacht', category: 'Lifestyle', price: 150000 * K, blurb: 'A helipad, a crew of thirty, and a hoop on the top deck.', morale: 14, rep: 6 },
  { id: 'island-resort', name: 'A resort on your own island', category: 'Lifestyle', price: 200000 * K, blurb: 'The whole team spends the summer there. Chemistry follows.', morale: 15, rep: 6, trust: 4 },
  { id: 'nba-stake', name: 'Minority stake in an NBA team', category: 'Lifestyle', price: 300000 * K, blurb: 'A seat in the owners\u2019 meetings while you still play.', rep: 15, morale: 6 },
  { id: 'sneaker-buyout', name: 'Buy your sneaker company', category: 'Lifestyle', price: 400000 * K, blurb: 'The logo, the factories, the lot.', rep: 18, morale: 8 },
  ...accessories(),
];
