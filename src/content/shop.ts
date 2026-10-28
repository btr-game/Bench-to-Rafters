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
  { id: 'jump-program', name: 'Jump-training program', category: 'Training', price: 1.5 * K, blurb: 'Eight weeks of plyometrics.', attrs: { ATH: 1.5 } },
  { id: 'shooting-machine', name: 'Shooting machine', category: 'Training', price: 9 * K, blurb: '500 makes a day.', attrs: { SHT: 1.5 }, range: 2 },
  { id: 'skills-trainer', name: 'Summer skills trainer', category: 'Training', price: 25 * K, blurb: 'A pro trainer for the summer.', focus: 1.5 },
  { id: 'home-gym', name: 'Home weight room', category: 'Training', price: 60 * K, blurb: 'No excuses at 6 a.m.', attrs: { REB: 1.5, FIN: 0.5 } },
  { id: 'shot-doctor', name: 'Shot doctor sessions', category: 'Training', price: 150 * K, blurb: 'A famous shooting coach rebuilds your release.', attrs: { SHT: 2 }, range: 4 },
  { id: 'private-coach', name: 'Private skills coach', category: 'Training', price: 500 * K, blurb: 'Year-round, on call.', attrs: { PLY: 2 }, growthMult: 1.05 },
  { id: 'private-gym', name: 'Private gym', category: 'Training', price: 3000 * K, blurb: 'Your own court, your own hours.', focus: 1, growthMult: 1.08 },
  { id: 'biomech-lab', name: 'Biomechanics lab', category: 'Training', price: 15000 * K, blurb: 'Motion capture on every shot.', attrs: { SHT: 2 }, injuryMult: 0.9 },
  { id: 'practice-facility', name: 'Own practice facility', category: 'Training', price: 40000 * K, blurb: 'A building with your name on it.', focus: 2, growthMult: 1.1 },
  // recovery
  { id: 'massage-gun', name: 'Massage gun', category: 'Recovery', price: 0.4 * K, blurb: 'Loosen up after every game.', injuryMult: 0.95 },
  { id: 'cold-tub', name: 'Cold plunge tub', category: 'Recovery', price: 8 * K, blurb: 'Two minutes of misery, nightly.', injuryMult: 0.9 },
  { id: 'sleep-pod', name: 'Sleep pod', category: 'Recovery', price: 35 * K, blurb: 'Nine hours, every night.', morale: 5, injuryMult: 0.95 },
  { id: 'chef', name: 'Personal chef', category: 'Recovery', price: 200 * K, blurb: 'No more drive-thru.', attrs: { ATH: 1 }, injuryMult: 0.9 },
  { id: 'hyperbaric', name: 'Hyperbaric chamber', category: 'Recovery', price: 120 * K, blurb: 'Slows the clock a little.', declineMult: 0.8 },
  { id: 'recovery-suite', name: 'Recovery suite', category: 'Recovery', price: 5000 * K, blurb: 'Cryo, hydrotherapy, a full staff.', injuryMult: 0.8, declineMult: 0.85 },
  // lifestyle
  { id: 'gaming-setup', name: 'Gaming setup', category: 'Lifestyle', price: 1.2 * K, blurb: 'For the road trips.', morale: 6 },
  { id: 'family-seats', name: 'Courtside seats for family', category: 'Lifestyle', price: 50 * K, blurb: 'Your mom never misses a game.', morale: 8 },
  { id: 'backyard-court', name: 'Backyard court', category: 'Lifestyle', price: 150 * K, blurb: 'Lights on until midnight.', attrs: { SHT: 1 }, morale: 5 },
  { id: 'car', name: 'Luxury car', category: 'Lifestyle', price: 250 * K, blurb: 'Parking-lot photos guaranteed.', rep: 3, morale: 5 },
  { id: 'jet', name: 'Private jet hours', category: 'Lifestyle', price: 8000 * K, blurb: 'Show up rested and famous.', rep: 5, injuryMult: 0.95 },
  { id: 'mansion', name: 'Mansion', category: 'Lifestyle', price: 12000 * K, blurb: 'Eleven bathrooms.', morale: 10, rep: 4 },
  { id: 'charity', name: 'Fund a court back home', category: 'Lifestyle', price: 300 * K, blurb: 'Your name on the backboard where it started.', rep: 5, morale: 6, trust: 3 },
];
