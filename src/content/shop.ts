// Shop items (§12). Prices are in $M (0.00004 = $40). Effects are small and fixed;
// attribute boosts apply right away, injury and decline multipliers apply next season.

import type { AttrKey } from '../engine/types';

export type ShopCategory = 'Shoes' | 'Gear' | 'Training' | 'Recovery' | 'Lifestyle';

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
  injuryMult?: number;
  declineMult?: number;
  growthMult?: number; // next season's growth
  morale?: number;
  rep?: number;
  trust?: number;
}

const K = 0.001; // $1K in $M

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
  { id: 'chef', name: 'Personal chef', category: 'Recovery', price: 200 * K, blurb: 'No more drive-thru.', attrs: { ATH: 0.5 }, injuryMult: 0.9 },
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
  { id: 'sports-psych', name: 'Sports psychologist', category: 'Recovery', price: 50 * K, blurb: 'Quiet mind at the free-throw line.', morale: 6, attrs: { SHT: 0.5 } },
  { id: 'meditation', name: 'Meditation app', category: 'Lifestyle', price: 0.07 * K, blurb: 'Ten minutes a day. Breathe.', morale: 3 },
  { id: 'stream-setup', name: 'Streaming setup', category: 'Lifestyle', price: 2 * K, blurb: 'Fans watch you play video games. You gain followers.', rep: 3, morale: 2 },
  { id: 'team-dinner', name: 'Dinner for the whole team', category: 'Lifestyle', price: 4 * K, blurb: 'Steaks on you. The locker room remembers.', trust: 4, morale: 3 },
  { id: 'stylist', name: 'Personal stylist', category: 'Lifestyle', price: 30 * K, blurb: 'Tunnel fits that trend every week.', rep: 3 },
  { id: 'scholarship-fund', name: 'Scholarship fund at your old school', category: 'Lifestyle', price: 100 * K, blurb: 'Ten kids a year go to college on you.', rep: 4, morale: 5, trust: 2 },
  { id: 'sneaker-line', name: 'Your own sneaker colorway', category: 'Shoes', price: 800 * K, blurb: 'Sold out in an hour.', rep: 6, morale: 3 },
  { id: 'trail-shoes', name: 'Trail runners for summer conditioning', category: 'Shoes', price: 0.12 * K, blurb: 'Hill sprints at dawn.', attrs: { ATH: 0.5 }, injuryMult: 0.98 },
];
