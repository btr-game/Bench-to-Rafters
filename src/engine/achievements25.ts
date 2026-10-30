// Round 25: the achievement book past 500 (the owner: "add more achievements... all the way up to
// 500 and beyond, very unique ones"). Same rules as round 24 (achievements.ts): cosmetic, pun
// names, the conditions stay hidden until earned. These cover the round 25 systems (nicknames,
// brands, staff, fines, press conferences, rivals, contract talks, the collection, the wardrobe,
// the career index, legacy projects), season lines at every level, career totals, rare award
// combinations and odd shapes of a career.

import type { GameState, SeasonRecord } from './types';
import type { AchTier } from './achievements';
import { careerIndex } from './awards/legacy';
import { NICKNAMES } from '../content/nicknames';

/** What the round 25 checks read: the career, its NBA seasons and the awards by year. */
export interface Facts25 {
  g: GameState;
  nba: SeasonRecord[];
  awardsByYear: Map<number, Set<string>>;
  peak: number;
}

interface Ach25 {
  id: string;
  name: string;
  tier: AchTier;
  how: string;
  test: (f: Facts25) => boolean;
}

const A = (id: string, name: string, tier: AchTier, how: string, test: (f: Facts25) => boolean): Ach25 => ({ id, name, tier, how, test });

type K = 'pts' | 'reb' | 'ast' | 'stl' | 'blk' | 'tpm' | 'min';
const pg = (h: SeasonRecord, k: K) => (h.line.gp ? h.line[k] / h.line.gp : 0);
const ppg = (h: SeasonRecord, k: K) => (h.post.gp ? h.post[k] / h.post.gp : 0);
const pct = (m: number, a: number) => (a > 0 ? m / a : 0);
/** A season at a level, with enough games to count. */
const season = (f: Facts25, test: (h: SeasonRecord) => boolean, level = 'NBA', gp = 40) => f.g.history.some((h) => h.level === level && h.line.gp >= gp && test(h));
const seasons = (f: Facts25, test: (h: SeasonRecord) => boolean, level = 'NBA', gp = 40) => f.g.history.filter((h) => h.level === level && h.line.gp >= gp && test(h)).length;
const tot = (f: Facts25, k: K) => f.nba.reduce((a, h) => a + h.line[k] + h.post[k], 0);
const won = (f: Facts25, k: string) => f.g.awards.filter((a) => a.key === k).length;
const has = (f: Facts25, ids: string[]) => ids.some((id) => f.g.purchases.includes(id));
const logs = (f: Facts25, kind: string, re?: RegExp) => f.g.log.filter((x) => x.kind === kind && (!re || re.test(x.text))).length;
const nickIn = (f: Facts25, ids: string[]) => !!f.g.player.nickname && ids.includes(f.g.player.nickname.id);
const yearWith = (f: Facts25, ...keys: string[]) => [...f.awardsByYear.values()].some((s) => keys.every((k) => s.has(k)));
const hi = (f: Facts25, k: 'pts' | 'reb' | 'ast' | 'stl' | 'blk') => f.g.highs?.nba?.[k];
const ageIn = (f: Facts25, year: number) => f.g.history.find((h) => h.year === year)?.age ?? 99;
const pick = (f: Facts25) => f.g.draft?.userPick ?? 0;
const titleYears = (f: Facts25) => [...f.awardsByYear.entries()].filter(([, s]) => s.has('TITLE') || s.has('TITLEKEY')).map(([y]) => y);

export const ACHIEVEMENTS_25: Ach25[] = [
  // ---- nicknames and brands ----
  A('nick', 'Say My Name', 'rotation', 'Earn a nickname.', (f) => !!f.g.player.nickname),
  A('nick-look', 'Looks the Part', 'rotation', 'Earn a nickname for how you look.', (f) => nickIn(f, ['skyline', 'pocket-rocket', 'wingspan', 'halo', 'chrome', 'band-leader', 'lumberjack', 'the-twist', 'top-shelf', 'whiskers', 'big-bear', 'beanpole', 'vending-machine', 'sleeves', 'specs', 'grizzly', 'the-tower'])),
  A('nick-hair', 'Hair Apparent', 'starter', 'Earn a nickname for your hair.', (f) => nickIn(f, ['halo', 'chrome', 'the-twist', 'top-shelf'])),
  A('nick-zoo', 'Animal Kingdom', 'starter', 'Earn a nickname named for an animal.', (f) => nickIn(f, ['big-bear', 'grizzly', 'the-owl', 'snake-eyes', 'shark-tank', 'lone-wolf', 'eagle-eye', 'crows-nest'])),
  A('nick-sky', 'Weather Report', 'starter', 'Earn a nickname from the weather.', (f) => nickIn(f, ['rainmaker', 'mountain-rain', 'thunderclap', 'ice-water', 'snowplow', 'midnight'])),
  A('nick-name', 'Name Game', 'starter', 'Earn a nickname made from your name, number or town.', (f) => nickIn(f, ['double-initial', 'buckets', 'big-first', 'little-first', 'karat', 'lucky-seven', 'zero-gravity', 'town-kid', 'pride-of', 'name-effect', 'captain'])),
  A('nick-def', 'Defensive Moniker', 'starter', 'Earn a nickname for your defense.', (f) => nickIn(f, ['deadbolt', 'no-fly-zone', 'swat-team', 'pickpocket', 'firewall', 'bouncer', 'shadow', 'velcro', 'stop-sign', 'lone-wolf', 'snake-eyes'])),
  A('nick-clutch', 'Called Shot', 'allstar', 'Earn a nickname for the big moments.', (f) => nickIn(f, ['mr-fourth', 'closer', 'midnight', 'ice-water', 'lights-out', 'the-fireman'])),
  A('nick-young', 'Nicknamed in Diapers', 'starter', 'Earn a nickname before you turn 20.', (f) => !!f.g.player.nickname && f.g.player.age - (f.g.year - f.g.player.nickname.year) < 20),
  A('nick-rare', 'One of a Kind', 'allstar', 'Earn a nickname whose logo has a crown, a comet or a lighthouse.', (f) => !!f.g.player.nickname && ['crown', 'comet', 'lighthouse'].includes(NICKNAMES.find((n) => n.id === f.g.player.nickname!.id)?.logo.motif ?? '')),
  A('brand', 'Brand New', 'starter', 'Sign a brand deal.', (f) => !!f.g.player.brand),
  A('brand-line', 'Logo Motion', 'allstar', 'Get your own signature line.', (f) => f.g.player.brand?.kind === 'line'),
  A('shoe1', 'Sole Proprietor', 'allstar', 'Release a signature shoe.', (f) => (f.g.player.brand?.shoe ?? 0) >= 1),
  A('shoe5', 'Shoe-In', 'allstar', 'Release five signature shoes.', (f) => (f.g.player.brand?.shoe ?? 0) >= 5),
  A('shoe10', 'Sneakerhead Hall', 'hof', 'Release ten signature shoes.', (f) => (f.g.player.brand?.shoe ?? 0) >= 10),
  A('brand50', 'Endorsement Deal-ightful', 'allstar', 'Earn $50 million from your brand.', (f) => (f.g.player.brand?.earned ?? 0) >= 50),
  A('brand200', 'The Logo Is the Point', 'hof', 'Earn $200 million from your brand.', (f) => (f.g.player.brand?.earned ?? 0) >= 200),
  A('brand-icon', 'Icon Status', 'allstar', 'Have a signature line while you are an Icon.', (f) => f.g.player.brand?.kind === 'line' && f.g.player.rep >= 85),

  // ---- staff ----
  A('staff1', 'Hired Help', 'bench', 'Hire someone for your staff.', (f) => logs(f, 'staff', /^Hired/) >= 1),
  A('staff4', 'Entourage', 'starter', 'Have four people on your staff at once.', (f) => (f.g.player.staff?.length ?? 0) >= 4),
  A('staff6', 'Full Payroll', 'allstar', 'Have six people on your staff at once.', (f) => (f.g.player.staff?.length ?? 0) >= 6),
  A('staff-raise', 'Raise the Roof', 'rotation', 'Give someone on your staff a raise.', (f) => logs(f, 'staff', /raise/) >= 1),
  A('staff-max', 'Top of the Pay Scale', 'starter', 'Raise someone on your staff to the top level.', (f) => !!f.g.player.staff?.some((m) => m.level >= 3)),
  A('staff-chef', 'Chef’s Kiss', 'rotation', 'Hire a personal chef.', (f) => logs(f, 'staff', /chef/) >= 1),
  A('staff-sleep', 'Sleeping Beauty', 'rotation', 'Hire a sleep coach.', (f) => logs(f, 'staff', /sleep coach/) >= 1),
  A('staff-mind', 'Mind Games', 'rotation', 'Hire a sports psychologist.', (f) => logs(f, 'staff', /psychologist/) >= 1),
  A('staff-film', 'Film Buff', 'rotation', 'Hire a video analyst.', (f) => logs(f, 'staff', /video analyst/) >= 1),
  A('staff-gone', 'You’re Fired', 'rotation', 'Let someone on your staff go.', (f) => logs(f, 'staff', /^Let /) >= 1),
  A('staff-loyal', 'Ride or Die', 'allstar', 'Keep the same staff member for ten seasons.', (f) => !!f.g.player.staff?.some((m) => f.g.year - m.since >= 10)),
  A('staff-paid', 'Payroll Department', 'allstar', 'Pay your staff $5 million in all.', (f) => (f.g.player.staff ?? []).reduce((a, m) => a + m.paid, 0) >= 5),

  // ---- fines ----
  A('fine1', 'Pay the Piper', 'bench', 'Get fined.', (f) => logs(f, 'fine') >= 1),
  A('fine5', 'Repeat Offender', 'rotation', 'Get fined five times.', (f) => logs(f, 'fine') >= 5),
  A('fine8', 'Season Ticket to the League Office', 'allstar', 'Get fined eight times.', (f) => logs(f, 'fine') >= 8),
  A('fine-tech', 'Tech Support', 'bench', 'Get fined for technical fouls.', (f) => logs(f, 'fine', /technical/) >= 1),
  A('fine-refs', 'Ref Herring', 'rotation', 'Get fined for criticising the referees.', (f) => logs(f, 'fine', /referees/) >= 1),
  A('fine-media', 'No Comment', 'rotation', 'Get fined for skipping media day.', (f) => logs(f, 'fine', /media/) >= 1),
  A('fine-press', 'Quote, Unquote', 'rotation', 'Get fined for what you said at a press conference.', (f) => logs(f, 'fine', /press conference/) >= 1),
  A('fine-none', 'Model Citizen', 'allstar', 'Play ten NBA seasons without a fine.', (f) => f.nba.length >= 10 && logs(f, 'fine') === 0),

  // ---- press conferences ----
  A('press1', 'Mic Check', 'bench', 'Face the press.', (f) => logs(f, 'press') >= 1),
  A('press-fiery', 'Mic Drop', 'rotation', 'Give a fiery answer at a press conference.', (f) => logs(f, 'press', /fiery/) >= 1),
  A('press-humble', 'Humble Pie', 'rotation', 'Give nine humble answers.', (f) => logs(f, 'press', /humble/) >= 9),
  A('press-conf', 'Confidence Man', 'rotation', 'Give nine confident answers.', (f) => logs(f, 'press', /confident/) >= 9),
  A('press-fire9', 'Bulletin Board Material', 'starter', 'Give nine fiery answers.', (f) => logs(f, 'press', /fiery/) >= 9),
  A('press18', 'Quote Machine', 'starter', 'Answer eighteen questions at press conferences.', (f) => logs(f, 'press') >= 18),

  // ---- rivals ----
  A('rival', 'Frenemies', 'bench', 'Have a rival.', (f) => !!f.g.rivalry),
  A('rival-h2h', 'Head-to-Head Case', 'starter', 'Play twenty games against your rival’s team.', (f) => (f.g.rivalry?.w ?? 0) + (f.g.rivalry?.l ?? 0) >= 20),
  A('rival-own', 'Owning the Rivalry', 'allstar', 'Beat your rival’s team fifteen more times than they beat you.', (f) => (f.g.rivalry?.w ?? 0) - (f.g.rivalry?.l ?? 0) >= 15),
  A('rival-mvp', 'Bird, Meet Magic', 'allstar', 'Have an MVP rival.', (f) => f.g.rivalry?.level === 'mvp'),
  A('rival-ahead', 'Upper Hand', 'starter', 'Finish five seasons with a higher OVR than your rival.', (f) => (f.g.rivalry?.seasons ?? []).filter((x) => x.me > x.him).length >= 5),
  A('rival-out', 'Outlasted', 'starter', 'Play on after your rival leaves the league.', (f) => !!f.g.rivalry?.ended),
  A('rival-roy', 'Rookie Rumble', 'starter', 'Beat your draft-class rival for Rookie of the Year.', (f) => !!f.g.rivalry?.notes.some((n) => /^You beat .* for Rookie of the Year/.test(n))),

  // ---- contract talks ----
  A('talk-yes', 'The Art of the Deal', 'rotation', 'Get a team to agree to what you asked for.', (f) => logs(f, 'talks', /They agree/) >= 1),
  A('talk-half', 'Meet Me in the Middle', 'bench', 'Get a team to meet you halfway.', (f) => logs(f, 'talks', /halfway/) >= 1),
  A('talk-pulled', 'Overplayed Your Hand', 'bench', 'Ask for too much and lose an offer.', (f) => logs(f, 'talks', /pull the offer/) >= 1),
  A('talk-5', 'Super Agent', 'starter', 'Win five asks in contract talks.', (f) => logs(f, 'talks', /They agree/) >= 5),

  // ---- the collection, visits and the wardrobe ----
  A('own-car', 'Four Wheels Good', 'bench', 'Own a car.', (f) => has(f, ['car', 'car-collection'])),
  A('own-garage', 'Garage Sale Not Included', 'allstar', 'Own a luxury car and a classic car collection.', (f) => has(f, ['car']) && has(f, ['car-collection'])),
  A('own-jet', 'Jet Setter', 'starter', 'Fly private.', (f) => has(f, ['jet'])),
  A('own-boat', 'Yacht Rock', 'allstar', 'Own a yacht or a superyacht.', (f) => has(f, ['yacht', 'superyacht'])),
  A('own-island', 'Island Time', 'allstar', 'Own a private island.', (f) => has(f, ['island', 'island-resort'])),
  A('own-team', 'Owner’s Box', 'hof', 'Buy a stake in an NBA team.', (f) => has(f, ['nba-stake'])),
  A('own-brand', 'Buy the Swoosh', 'hof', 'Buy your sneaker company.', (f) => has(f, ['sneaker-buyout'])),
  A('own-space', 'Space Jammin’', 'hof', 'Take a seat on an orbital flight.', (f) => has(f, ['orbit-seat'])),
  A('own-art', 'Patron of the Arts', 'allstar', 'Own an art collection and a museum wing.', (f) => has(f, ['art']) && has(f, ['art-wing'])),
  A('own-horse', 'Horse Sense', 'allstar', 'Own a racehorse stable.', (f) => has(f, ['racehorses'])),
  A('own-good', 'Good Samaritan', 'starter', 'Fund a court, a scholarship or a foundation.', (f) => has(f, ['charity', 'scholarship-fund', 'foundation'])),
  A('own-dog', 'Good Boy', 'bench', 'Get a dog.', (f) => has(f, ['pet-dog'])),
  A('own-arena', 'Home Court', 'hof', 'Rebuild your hometown arena.', (f) => has(f, ['hometown-arena'])),
  A('own-media', 'Mogul', 'allstar', 'Start a media company.', (f) => has(f, ['media-company'])),
  A('own-food', 'Restaurateur', 'starter', 'Open a restaurant.', (f) => has(f, ['restaurant'])),
  A('own-vine', 'Grape Expectations', 'allstar', 'Own a vineyard.', (f) => has(f, ['vineyard'])),
  A('own-house', 'Moving On Up', 'starter', 'Buy a mansion or a penthouse.', (f) => has(f, ['mansion', 'penthouse'])),
  A('own-parents', 'Momma’s Boy', 'rotation', 'Buy your parents a house.', (f) => has(f, ['parents-home'])),
  A('own-30', 'Collector’s Edition', 'starter', 'Buy thirty different things.', (f) => f.g.purchases.length >= 30),
  A('own-50', 'Everything Must Go', 'allstar', 'Buy fifty different things.', (f) => f.g.purchases.length >= 50),
  A('visit5', 'Tour Guide', 'rotation', 'Visit five things you own.', (f) => Object.keys(f.g.player.visits ?? {}).length >= 5),
  A('visit15', 'Home Is Where You Park It', 'allstar', 'Visit fifteen things you own.', (f) => Object.keys(f.g.player.visits ?? {}).length >= 15),
  A('wear1', 'Dress Code', 'bench', 'Wear an accessory you bought.', (f) => Object.values(f.g.player.wardrobe?.on ?? {}).some((x) => x && x !== 'none')),
  A('wear4', 'Fully Accessorised', 'rotation', 'Wear something in all four accessory slots.', (f) => ['head', 'arm', 'wrist', 'legs'].every((k) => { const v = f.g.player.wardrobe?.on[k as 'head']; return !!v && v !== 'none'; })),
  A('wear10', 'Closet Space', 'starter', 'Own ten accessories.', (f) => (f.g.player.wardrobe?.owned.length ?? 0) >= 10),
  A('wear-rainbow', 'Rainbow Connection', 'allstar', 'Own the headband in all ten colours.', (f) => (f.g.player.wardrobe?.owned ?? []).filter((x) => x.startsWith('wear-head-')).length >= 10),
  A('wear-match', 'Matching Set', 'rotation', 'Wear four accessories of the same colour.', (f) => { const on = Object.values(f.g.player.wardrobe?.on ?? {}).filter((x): x is string => !!x && x !== 'none'); const c = on.map((x) => x.split('-').slice(2).join('-')); return on.length >= 4 && new Set(c).size === 1; }),

  // ---- the career index and legacy projects ----
  A('idx25', 'Index Finger', 'rotation', 'Reach a career index of 25.', (f) => careerIndex(f.g).score >= 25),
  A('idx75', 'Index Fund', 'starter', 'Reach a career index of 75.', (f) => careerIndex(f.g).score >= 75),
  A('idx150', 'Off the Index', 'allstar', 'Reach a career index of 150.', (f) => careerIndex(f.g).score >= 150),
  A('idx250', 'Hall Monitor', 'hof', 'Reach a career index of 250.', (f) => careerIndex(f.g).score >= 250),
  A('peak5', 'Peak Performance', 'allstar', 'Score 80 points of career index in your best five seasons.', (f) => careerIndex(f.g).best >= 80),
  A('legacy-proj', 'Philanthropist', 'starter', 'Fund a legacy project.', (f) => (f.g.player.legacyBonus ?? 0) > 0),
  A('legacy-all', 'Building a Legacy', 'hof', 'Fund all three legacy projects.', (f) => (f.g.player.legacyBonus ?? 0) >= 9),
  A('fam-parents', 'Mom and Pop Retirement Plan', 'starter', 'Retire your parents.', (f) => logs(f, 'event', /Retired your parents/) >= 1),
  A('fam-tuition', 'Big Sibling Energy', 'rotation', 'Pay your sister’s tuition.', (f) => logs(f, 'event', /tuition/) >= 1),
  A('fam-carwash', 'Car Wash Kingpin', 'starter', 'Back your cousin’s car wash and see it work.', (f) => logs(f, 'event', /car wash\. It works/) >= 1),
  A('invest-win', 'Angel Investor', 'starter', 'Make money on an investment.', (f) => logs(f, 'event', /paid off|Hit big/) >= 1),
  A('invest-lose', 'Expensive Lesson', 'bench', 'Lose money on an investment.', (f) => logs(f, 'event', /money is gone|Lost money/) >= 1),

  // ---- NBA seasons: scoring ----
  A('s-ppg15', 'Fifteen Minutes of Frame', 'bench', 'Average 15 points in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 15)),
  A('s-ppg18', 'Eighteen and Life', 'rotation', 'Average 18 points in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 18)),
  A('s-ppg22', 'Catch-22', 'rotation', 'Average 22 points in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 22)),
  A('s-ppg28', 'Twenty-Great', 'starter', 'Average 28 points in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 28)),
  A('s-ppg32', 'Thirty-Two Flavours', 'allstar', 'Average 32 points in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 32)),
  A('s-ppg38', 'Scoring Machine Learning', 'hof', 'Average 38 points in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 38)),
  A('s-20x5', 'Twenty Twenty Twenty Twenty Twenty', 'allstar', 'Average 20 points in five NBA seasons.', (f) => seasons(f, (h) => pg(h, 'pts') >= 20) >= 5),
  A('s-20x10', 'A Decade of Twenty', 'hof', 'Average 20 points in ten NBA seasons.', (f) => seasons(f, (h) => pg(h, 'pts') >= 20) >= 10),
  A('s-25x5', 'Quarter Pounder', 'hof', 'Average 25 points in five NBA seasons.', (f) => seasons(f, (h) => pg(h, 'pts') >= 25) >= 5),
  A('s-fg55', 'Efficiency Expert', 'starter', 'Shoot 55% from the field in an NBA season (8+ shots a game).', (f) => season(f, (h) => h.line.fga / h.line.gp >= 8 && pct(h.line.fgm, h.line.fga) >= 0.55)),
  A('s-fg62', 'Layup Line', 'allstar', 'Shoot 62% from the field in an NBA season (8+ shots a game).', (f) => season(f, (h) => h.line.fga / h.line.gp >= 8 && pct(h.line.fgm, h.line.fga) >= 0.62)),
  A('s-ft86', 'Charity Case', 'starter', 'Make 86% of your free throws in an NBA season (100 tries or more).', (f) => season(f, (h) => h.line.fta >= 100 && pct(h.line.ftm, h.line.fta) >= 0.86)),
  A('s-ft88', 'Free Money', 'allstar', 'Make 88% of your free throws in an NBA season (100 tries or more).', (f) => season(f, (h) => h.line.fta >= 100 && pct(h.line.ftm, h.line.fta) >= 0.88)),
  A('s-3p42', 'Forty-Two Percent Solution', 'starter', 'Make 42% of your threes in an NBA season (4+ a game).', (f) => season(f, (h) => h.line.tpa / h.line.gp >= 4 && pct(h.line.tpm, h.line.tpa) >= 0.42)),
  A('s-504090', 'Fifty-Forty-Ninety', 'hof', 'Shoot 50% from the field, 40% from three and 90% at the line in an NBA season.', (f) => season(f, (h) => h.line.tpa / h.line.gp >= 2 && h.line.fta / h.line.gp >= 2 && pct(h.line.fgm, h.line.fga) >= 0.5 && pct(h.line.tpm, h.line.tpa) >= 0.4 && pct(h.line.ftm, h.line.fta) >= 0.9)),
  A('s-3pm2', 'Two-Bit Shooter', 'rotation', 'Make 2 threes a game in an NBA season.', (f) => season(f, (h) => pg(h, 'tpm') >= 2)),
  A('s-3pm3', 'Triple Threat', 'starter', 'Make 3 threes a game in an NBA season.', (f) => season(f, (h) => pg(h, 'tpm') >= 3)),
  A('s-3pm4', 'Four Corners', 'allstar', 'Make 4 threes a game in an NBA season.', (f) => season(f, (h) => pg(h, 'tpm') >= 4)),
  A('s-3pm5', 'Five-Alarm Fire', 'hof', 'Make 5 threes a game in an NBA season.', (f) => season(f, (h) => pg(h, 'tpm') >= 5)),

  // ---- NBA seasons: the rest of the box score ----
  A('s-rpg8', 'Glass Half Full', 'rotation', 'Average 8 rebounds in an NBA season.', (f) => season(f, (h) => pg(h, 'reb') >= 8)),
  A('s-rpg10', 'Ten Boards Wide', 'starter', 'Average 10 rebounds in an NBA season.', (f) => season(f, (h) => pg(h, 'reb') >= 10)),
  A('s-rpg12', 'Board Game', 'allstar', 'Average 12.5 rebounds in an NBA season.', (f) => season(f, (h) => pg(h, 'reb') >= 12.5)),
  A('s-apg6', 'Six Pack of Dimes', 'rotation', 'Average 6 assists in an NBA season.', (f) => season(f, (h) => pg(h, 'ast') >= 6)),
  A('s-apg8', 'Eight Is Enough', 'starter', 'Average 8 assists in an NBA season.', (f) => season(f, (h) => pg(h, 'ast') >= 8)),
  A('s-apg12', 'Dime a Dozen', 'hof', 'Average 12 assists in an NBA season.', (f) => season(f, (h) => pg(h, 'ast') >= 12)),
  A('s-spg15', 'Light Fingers', 'rotation', 'Average 1.5 steals in an NBA season.', (f) => season(f, (h) => pg(h, 'stl') >= 1.5)),
  A('s-spg175', 'Five-Finger Discount', 'starter', 'Average 1.75 steals in an NBA season.', (f) => season(f, (h) => pg(h, 'stl') >= 1.75)),
  A('s-spg185', 'Grand Theft Basketball', 'hof', 'Average 1.85 steals in an NBA season.', (f) => season(f, (h) => pg(h, 'stl') >= 1.85)),
  A('s-bpg15', 'Rejection Letter', 'rotation', 'Average 1.5 blocks in an NBA season.', (f) => season(f, (h) => pg(h, 'blk') >= 1.5)),
  A('s-bpg25', 'Not in My House', 'starter', 'Average 2.5 blocks in an NBA season.', (f) => season(f, (h) => pg(h, 'blk') >= 2.5)),
  A('s-bpg26', 'Block Party', 'hof', 'Average 2.6 blocks in an NBA season.', (f) => season(f, (h) => pg(h, 'blk') >= 2.6)),
  A('s-min35x5', 'Heavy Lifting', 'starter', 'Average 35 minutes in five NBA seasons.', (f) => seasons(f, (h) => pg(h, 'min') >= 35) >= 5),
  A('s-gp82', 'Never Sat Down', 'bench', 'Play all 82 games of an NBA season.', (f) => season(f, (h) => h.line.gp >= 82, 'NBA', 82)),
  A('s-gp82x5', 'Ironclad', 'allstar', 'Play all 82 games in five NBA seasons.', (f) => seasons(f, (h) => h.line.gp >= 82, 'NBA', 82) >= 5),
  A('s-dd', 'Double Trouble', 'rotation', 'Average a double-double in an NBA season.', (f) => season(f, (h) => [pg(h, 'pts'), pg(h, 'reb'), pg(h, 'ast')].filter((x) => x >= 10).length >= 2)),
  A('s-2010', 'Twenty-Ten Vision', 'allstar', 'Average 20 points and 10 rebounds in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 20 && pg(h, 'reb') >= 10)),
  A('s-2010a', 'Twenty Dimes Twenty', 'allstar', 'Average 20 points and 10 assists in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 20 && pg(h, 'ast') >= 10)),
  A('s-25105', 'Stat Sheet Stuffer', 'hof', 'Average 25 points, 10 rebounds and 5 assists in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 25 && pg(h, 'reb') >= 10 && pg(h, 'ast') >= 5)),
  A('s-5x5', 'Five by Five', 'allstar', 'Average 5 points, 5 rebounds, 5 assists, 1.5 steals and 1.5 blocks in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 5 && pg(h, 'reb') >= 5 && pg(h, 'ast') >= 5 && pg(h, 'stl') >= 1.5 && pg(h, 'blk') >= 1.5)),
  A('s-c-ast', 'Point Centre', 'allstar', 'Average 6 assists in an NBA season as a center.', (f) => f.g.player.pos === 'C' && season(f, (h) => pg(h, 'ast') >= 6)),
  A('s-c-3', 'Stretch Armstrong', 'starter', 'Make 1.5 threes a game in an NBA season as a center.', (f) => f.g.player.pos === 'C' && season(f, (h) => pg(h, 'tpm') >= 1.5)),
  A('s-pg-reb', 'Rebounding Point Guard', 'starter', 'Average 7 rebounds in an NBA season as a point guard.', (f) => f.g.player.pos === 'PG' && season(f, (h) => pg(h, 'reb') >= 7)),
  A('s-pg-blk', 'Point Guard, Point Blocker', 'allstar', 'Average a block a game in an NBA season as a point guard.', (f) => f.g.player.pos === 'PG' && season(f, (h) => pg(h, 'blk') >= 1)),
  A('s-sf-all', 'Swiss Army Wing', 'allstar', 'Average 18 points, 6 rebounds and 6 assists in an NBA season as a small forward.', (f) => f.g.player.pos === 'SF' && season(f, (h) => pg(h, 'pts') >= 18 && pg(h, 'reb') >= 6 && pg(h, 'ast') >= 6)),

  // ---- the playoffs ----
  A('p-ppg25', 'Playoff Mode', 'starter', 'Average 25 points in a postseason (8+ games).', (f) => f.nba.some((h) => h.post.gp >= 8 && ppg(h, 'pts') >= 25)),
  A('p-ppg32', 'Spring Fever', 'allstar', 'Average 32 points in a postseason (8+ games).', (f) => f.nba.some((h) => h.post.gp >= 8 && ppg(h, 'pts') >= 32)),
  A('p-rpg12', 'Playoff Plumber', 'starter', 'Average 12 rebounds in a postseason (8+ games).', (f) => f.nba.some((h) => h.post.gp >= 8 && ppg(h, 'reb') >= 12)),
  A('p-apg9', 'Postseason Postman', 'starter', 'Average 9 assists in a postseason (8+ games).', (f) => f.nba.some((h) => h.post.gp >= 8 && ppg(h, 'ast') >= 9)),
  A('p-gp100', 'Spring Regular', 'allstar', 'Play 100 playoff games.', (f) => f.nba.reduce((a, h) => a + h.post.gp, 0) >= 100),
  A('p-gp200', 'Born in June', 'hof', 'Play 200 playoff games.', (f) => f.nba.reduce((a, h) => a + h.post.gp, 0) >= 200),
  A('p-pts1k', 'Grand in the Spring', 'starter', 'Score 1,000 playoff points.', (f) => f.nba.reduce((a, h) => a + h.post.pts, 0) >= 1000),
  A('p-pts5k', 'Postseason Royalty', 'hof', 'Score 5,000 playoff points.', (f) => f.nba.reduce((a, h) => a + h.post.pts, 0) >= 5000),
  A('p-sweep', 'Clean Sweep', 'starter', 'Win a title in a postseason with 16 or fewer games.', (f) => f.nba.some((h) => /Champion/i.test(h.result) && h.post.gp > 0 && h.post.gp <= 16)),

  // ---- career totals ----
  A('t-reb5k', 'Five Thousand Boards', 'starter', 'Grab 5,000 NBA rebounds.', (f) => tot(f, 'reb') >= 5000),
  A('t-reb10k', 'Ten Thousand Boards', 'allstar', 'Grab 10,000 NBA rebounds.', (f) => tot(f, 'reb') >= 10000),
  A('t-reb15k', 'Glass Ceiling', 'hof', 'Grab 15,000 NBA rebounds.', (f) => tot(f, 'reb') >= 15000),
  A('t-ast3k', 'Three Thousand Gifts', 'starter', 'Hand out 3,000 NBA assists.', (f) => tot(f, 'ast') >= 3000),
  A('t-ast6k', 'Santa Claws', 'allstar', 'Hand out 6,000 NBA assists.', (f) => tot(f, 'ast') >= 6000),
  A('t-ast10k', 'The Great Distributor', 'hof', 'Hand out 10,000 NBA assists.', (f) => tot(f, 'ast') >= 10000),
  A('t-stl1k', 'Thousand-Hand Thief', 'allstar', 'Get 1,000 NBA steals.', (f) => tot(f, 'stl') >= 1000),
  A('t-stl2k', 'Heist Movie', 'hof', 'Get 2,000 NBA steals.', (f) => tot(f, 'stl') >= 2000),
  A('t-blk1k', 'Thousand Rejections', 'allstar', 'Block 1,000 NBA shots.', (f) => tot(f, 'blk') >= 1000),
  A('t-blk3k', 'Swat Valley', 'hof', 'Block 3,000 NBA shots.', (f) => tot(f, 'blk') >= 3000),
  A('t-3pm1k', 'Thousand Splashes', 'allstar', 'Make 1,000 NBA threes.', (f) => tot(f, 'tpm') >= 1000),
  A('t-3pm2k', 'Splash Two Thousand', 'hof', 'Make 2,000 NBA threes.', (f) => tot(f, 'tpm') >= 2000),
  A('t-3pm3k', 'Three-Thousand Point Two', 'hof', 'Make 3,000 NBA threes.', (f) => tot(f, 'tpm') >= 3000),
  A('t-min40k', 'Forty Thousand Minutes', 'hof', 'Play 40,000 NBA minutes.', (f) => tot(f, 'min') >= 40000),
  A('t-20s', 'Twenty Seasons', 'hof', 'Play twenty NBA seasons.', (f) => f.nba.length >= 20),
  A('t-15s', 'Fifteen Minutes Is a Long Time', 'allstar', 'Play fifteen NBA seasons.', (f) => f.nba.length >= 15),
  A('t-gp1200', 'Twelve Hundred Nights', 'hof', 'Play 1,200 NBA games.', (f) => f.g.nbaGames >= 1200),
  A('t-everything', 'Everything Bagel', 'hof', 'Reach 20,000 points, 8,000 rebounds and 5,000 assists in the NBA.', (f) => tot(f, 'pts') >= 20000 && tot(f, 'reb') >= 8000 && tot(f, 'ast') >= 5000),

  // ---- awards that rarely go together ----
  A('a-roymvp', 'From Rookie to Royalty', 'allstar', 'Win Rookie of the Year and MVP in one career.', (f) => won(f, 'ROY') > 0 && won(f, 'MVP') > 0),
  A('a-dpoymvp', 'Both Ends of the Floor', 'hof', 'Win MVP and Defensive Player of the Year in the same season.', (f) => yearWith(f, 'MVP', 'DPOY')),
  A('a-sixthmvp', 'Bench to Throne', 'hof', 'Win Sixth Man of the Year and, later, MVP.', (f) => won(f, 'SIXTH') > 0 && won(f, 'MVP') > 0),
  A('a-fmvpnomvp', 'Big Game Hunter', 'allstar', 'Win Finals MVP without ever winning MVP.', (f) => f.g.step === 'retired' && won(f, 'FMVP') > 0 && won(f, 'MVP') === 0),
  A('a-scoretitle', 'Scoring Title, Title Scored', 'hof', 'Win the scoring title and the championship in the same season.', (f) => yearWith(f, 'SCORING', 'TITLE') || yearWith(f, 'SCORING', 'TITLEKEY')),
  A('a-mvp-old', 'Ageless Wonder', 'hof', 'Win MVP at 34 or older.', (f) => f.g.awards.some((a) => a.key === 'MVP' && f.g.player.age - (f.g.year - a.year) >= 34)),
  A('a-allnba37', 'Old Man Game', 'hof', 'Make an All-NBA team at 37 or older.', (f) => f.g.awards.some((a) => /^ALLNBA/.test(a.key) && f.g.player.age - (f.g.year - a.year) >= 37)),
  A('a-as-teams3', 'All-Star Tour', 'allstar', 'Be an All-Star with three different teams.', (f) => new Set(f.nba.filter((h) => h.awards.some((x) => /All-Star/i.test(x))).map((h) => h.teamId)).size >= 3),
  A('a-rings3teams', 'Have Rings, Will Travel', 'hof', 'Win titles with three different teams.', (f) => new Set(f.nba.filter((h) => /Champion/i.test(h.result)).map((h) => h.teamId)).size >= 3),
  A('a-decades', 'Across the Decades', 'hof', 'Win titles ten or more years apart.', (f) => { const y = titleYears(f); return y.length >= 2 && Math.max(...y) - Math.min(...y) >= 10; }),
  A('a-b2bmvp', 'Back-to-Back Value', 'hof', 'Win MVP in back-to-back seasons.', (f) => { const y = f.g.awards.filter((a) => a.key === 'MVP').map((a) => a.year); return y.some((x) => y.includes(x + 1)); }),
  A('a-dpoy-guard', 'Small Wall', 'hof', 'Win Defensive Player of the Year as a guard.', (f) => (f.g.player.pos === 'PG' || f.g.player.pos === 'SG') && won(f, 'DPOY') > 0),
  A('a-lefty-mvp', 'Left Is Right', 'allstar', 'Win MVP as a lefty.', (f) => f.g.player.hand === 'L' && won(f, 'MVP') > 0),
  A('a-intl-mvp', 'World’s Best', 'allstar', 'Win MVP as a player from outside the USA.', (f) => f.g.player.country !== 'USA' && won(f, 'MVP') > 0),
  A('a-undrafted-as', 'Undrafted All-Star', 'allstar', 'Make an All-Star team after going undrafted.', (f) => f.g.undrafted && won(f, 'ALLSTAR') > 0),
  A('a-undrafted-mvp', 'Nobody Picked Me', 'hof', 'Win MVP after going undrafted.', (f) => f.g.undrafted && won(f, 'MVP') > 0),
  A('a-second-round-as', 'Second-Round Steal', 'allstar', 'Make an All-Star team as a second-round pick.', (f) => (f.g.draft?.userPick ?? 0) > 30 && won(f, 'ALLSTAR') > 0),
  A('a-pick1-ring', 'Franchise Saviour', 'allstar', 'Win a title as the first pick of your draft.', (f) => f.g.draft?.userPick === 1 && titleYears(f).length > 0),
  A('a-euro-mvp', 'Two Continents', 'hof', 'Win EuroLeague MVP and NBA MVP.', (f) => won(f, 'EUMVP') > 0 && won(f, 'MVP') > 0),
  A('a-ncaa-nba', 'College to Pros, Champion Both', 'allstar', 'Win an NCAA title and an NBA title.', (f) => won(f, 'NCAATITLE') > 0 && titleYears(f).length > 0),
  A('a-gold-ring', 'Gold and a Ring', 'allstar', 'Win Olympic gold and an NBA title.', (f) => won(f, 'OLYGOLD') > 0 && titleYears(f).length > 0),
  A('a-everything-year', 'The Perfect Year', 'hof', 'Win MVP, a title and Finals MVP in the same season.', (f) => yearWith(f, 'MVP', 'FMVP')),

  // ---- the shape of a career ----
  A('c-num0', 'Zero to Hero', 'rotation', 'Make an All-Star team wearing number 0.', (f) => f.g.player.number === 0 && won(f, 'ALLSTAR') > 0),
  A('c-num99', 'Ninety-Nine Jerseys', 'rotation', 'Play an NBA season wearing number 99.', (f) => f.g.player.number === 99 && f.nba.length > 0),
  A('c-lefty', 'Southpaw Society', 'bench', 'Play an NBA season as a lefty.', (f) => f.g.player.hand === 'L' && f.nba.length > 0),
  A('c-5levels', 'Five Leagues Deep', 'allstar', 'Play in five different leagues.', (f) => new Set(f.g.history.filter((h) => h.line.gp > 0).map((h) => h.level)).size >= 5),
  A('c-prep', 'Prep School Pipeline', 'rotation', 'Reach the NBA after a prep year.', (f) => f.nba.length > 0 && logs(f, 'prep') >= 1),
  A('c-oneteam12', 'Lifer', 'hof', 'Play twelve NBA seasons with one team and nowhere else.', (f) => f.nba.length >= 12 && new Set(f.nba.map((h) => h.teamId)).size === 1),
  A('c-5teams', 'Have Jersey, Will Travel', 'starter', 'Play for five NBA teams.', (f) => new Set(f.nba.map((h) => h.teamId)).size >= 5),
  A('c-8teams', 'Every Locker Room in the League', 'allstar', 'Play for eight NBA teams.', (f) => new Set(f.nba.map((h) => h.teamId)).size >= 8),
  A('c-comeback', 'Phoenix Rising', 'allstar', 'Make an All-Star team after a season-ending injury.', (f) => { const out = (f.g.player.injuries ?? []).find((x) => x.key === 'season'); return !!out && f.g.awards.some((a) => a.key === 'ALLSTAR' && a.year > (out.year ?? 0)); }),
  A('c-short', 'Short and Sweet', 'rotation', 'Retire before 28 with a peak OVR of 80 or more.', (f) => f.g.step === 'retired' && f.g.player.age < 28 && f.peak >= 80),
  A('c-lowpeak-ring', 'Along for the Ride', 'rotation', 'Win a title with a peak OVR under 70.', (f) => titleYears(f).length > 0 && f.peak < 70),
  A('c-noinj', 'Bubble-Wrapped', 'starter', 'Play six NBA seasons in a row, missing five games or fewer in each.', (f) => { let run = 0; return f.nba.some((h) => (run = h.line.gp >= 77 ? run + 1 : 0) >= 6); }),
  A('c-broke', 'Living on the Edge', 'bench', 'Finish a career with less than $100K in the bank.', (f) => f.g.step === 'retired' && f.g.player.bank < 0.1 && f.g.player.earnings > 1),
  A('c-saver', 'Rainy Day Fund', 'allstar', 'Retire with $200 million in the bank.', (f) => f.g.step === 'retired' && f.g.player.bank >= 200),
  A('c-sim', 'Autopilot', 'bench', 'Play a season in Sim mode.', (f) => !!f.g.flags.sim),
  A('c-g-league-mvp', 'From the Bus to the Bigs', 'allstar', 'Make an All-Star team after a season in the G League.', (f) => f.g.history.some((h) => h.level === 'GL' && h.line.gp > 0) && won(f, 'ALLSTAR') > 0),
  A('c-overseas-ring', 'World Tour Champion', 'allstar', 'Win titles in Europe and in the NBA.', (f) => won(f, 'EUTITLE') > 0 && titleYears(f).length > 0),

  // ---- before the NBA ----
  A('hs-ppg30', 'Gym Rat Royalty', 'rotation', 'Average 30 points in a high school season.', (f) => f.g.history.some((h) => (h.level === 'HSV' || h.level === 'HSJV') && h.line.gp >= 10 && pg(h, 'pts') >= 30)),
  A('hs-ppg35', 'Varsity Blues, Varsity Bruise', 'allstar', 'Average 35 points in a high school season.', (f) => f.g.history.some((h) => (h.level === 'HSV' || h.level === 'HSJV') && h.line.gp >= 10 && pg(h, 'pts') >= 35)),
  A('hs-rpg10', 'Prom King of the Paint', 'starter', 'Average 10 rebounds in a high school season.', (f) => f.g.history.some((h) => (h.level === 'HSV' || h.level === 'HSJV') && h.line.gp >= 10 && pg(h, 'reb') >= 10)),
  A('ncaa-ppg12', 'Big Man on Campus', 'rotation', 'Average 12 points in a college season.', (f) => season(f, (h) => pg(h, 'pts') >= 12, 'NCAA', 20)),
  A('ncaa-ppg15', 'Dean’s List', 'allstar', 'Average 15 points in a college season.', (f) => season(f, (h) => pg(h, 'pts') >= 15, 'NCAA', 20)),
  A('ncaa-apg45', 'Class President', 'starter', 'Average 4.5 assists in a college season.', (f) => season(f, (h) => pg(h, 'ast') >= 4.5, 'NCAA', 20)),
  A('ncaa-rpg75', 'Campus Custodian', 'starter', 'Average 7.5 rebounds in a college season.', (f) => season(f, (h) => pg(h, 'reb') >= 7.5, 'NCAA', 20)),
  A('ncaa-4', 'Senior Citizen', 'bench', 'Play four college seasons.', (f) => f.g.history.filter((h) => h.level === 'NCAA' && h.line.gp > 0).length >= 4),
  A('ncaa-1', 'One and Done', 'rotation', 'Leave college for the NBA after one season.', (f) => f.g.history.filter((h) => h.level === 'NCAA' && h.line.gp > 0).length === 1 && f.nba.length > 0),
  A('eu-ppg20', 'Euro Bucket', 'rotation', 'Average 20 points in a European season.', (f) => season(f, (h) => pg(h, 'pts') >= 20, 'EU', 15)),
  A('int-ppg25', 'Overseas Overlord', 'rotation', 'Average 25 points in a season in a league abroad.', (f) => season(f, (h) => pg(h, 'pts') >= 25, 'INT', 15)),
  A('gl-ppg25', 'G Whiz', 'rotation', 'Average 25 points in a G League season.', (f) => season(f, (h) => pg(h, 'pts') >= 25, 'GL', 15)),

  // ---- single NBA games ----
  A('g-r28', 'Twenty-Eight Boards Later', 'hof', 'Grab 28 rebounds in an NBA game.', (f) => (hi(f, 'reb')?.v ?? 0) >= 28),
  A('g-a25', 'Assist-ance Required', 'hof', 'Hand out 25 assists in an NBA game.', (f) => (hi(f, 'ast')?.v ?? 0) >= 25),
  A('g-s10', 'Ten-Finger Discount', 'hof', 'Record 10 steals in an NBA game.', (f) => (hi(f, 'stl')?.v ?? 0) >= 10),
  A('g-b10', 'Ten-Block Radius', 'hof', 'Block 10 shots in an NBA game.', (f) => (hi(f, 'blk')?.v ?? 0) >= 10),
  A('g-post', 'Saved the Best for Spring', 'starter', 'Score your NBA career high in a playoff game.', (f) => !!hi(f, 'pts')?.post),
  A('g-post-reb', 'Spring Cleaning', 'starter', 'Grab your NBA career high in rebounds in a playoff game.', (f) => !!hi(f, 'reb')?.post),
  A('g-rookie-high', 'Peaked as a Rookie', 'rotation', 'Play ten NBA seasons and never beat the scoring high of your rookie year.', (f) => f.nba.length >= 10 && hi(f, 'pts')?.year === f.nba[0].year),
  A('g-vet-high', 'Old Dog, New High', 'allstar', 'Set your NBA scoring high at 34 or older.', (f) => { const h = hi(f, 'pts'); return !!h && ageIn(f, h.year) >= 34; }),
  A('g-3010', 'Thirty-Ten-Ten', 'allstar', 'Have a 30-point triple-double as your best NBA game of a season.', (f) => f.nba.some((h) => !!h.bestGame?.line && h.bestGame.line.pts >= 30 && h.bestGame.line.reb >= 10 && h.bestGame.line.ast >= 10)),
  A('g-hs-high', 'Peaked in High School', 'bench', 'Reach the NBA and never top the points you scored in one high school game.', (f) => f.nba.length > 0 && ['HSJV', 'HSV'].includes(f.g.highs?.all?.pts?.level ?? '')),
  A('g-loss50', 'Fifty in a Loss', 'starter', 'Score 50 in an NBA game your team still lost.', (f) => f.nba.some((h) => !!h.bestGame?.line && h.bestGame.line.pts >= 50 && h.bestGame.res === 'L')),

  // ---- draft night ----
  A('d-last', 'Mr. Irrelevant', 'rotation', 'Go with the last pick of the draft.', (f) => !!f.g.draft && pick(f) > 0 && pick(f) === f.g.draft.picks.length),
  A('d-2', 'Second Fiddle', 'starter', 'Go second overall.', (f) => pick(f) === 2),
  A('d-14', 'Last Ticket Punched', 'rotation', 'Go 14th, the last pick of the lottery.', (f) => pick(f) === 14),
  A('d-30', 'Bottom of the First', 'rotation', 'Go 30th, the last pick of the first round.', (f) => pick(f) === 30),
  A('d-beat-mock', 'Mock the Mocks', 'rotation', 'Go higher than any mock draft had you.', (f) => !!f.g.draft?.mockRange && pick(f) > 0 && pick(f) < f.g.draft.mockRange[0]),
  A('d-slide', 'Draft-Night Slide', 'bench', 'Fall past every mock draft’s range.', (f) => !!f.g.draft?.mockRange && pick(f) > f.g.draft.mockRange[1]),
  A('d-late-mvp', 'Steal of the Century', 'hof', 'Win MVP after going 20th or later.', (f) => pick(f) >= 20 && won(f, 'MVP') > 0),
  A('d-1-bust', 'Weight of the Number One', 'bench', 'Go first overall and never make an All-Star team.', (f) => f.g.step === 'retired' && pick(f) === 1 && won(f, 'ALLSTAR') === 0),

  // ---- paydays ----
  A('m-sal30', 'Thirty Million Reasons', 'starter', 'Earn $30 million in one NBA season.', (f) => f.nba.some((h) => h.salary >= 30)),
  A('m-sal50', 'Supermax Me', 'allstar', 'Earn $50 million in one NBA season.', (f) => f.nba.some((h) => h.salary >= 50)),
  A('m-bargain', 'Bargain Bin', 'starter', 'Make an All-Star team on a salary under $3 million.', (f) => f.nba.some((h) => h.salary < 3 && !!f.awardsByYear.get(h.year)?.has('ALLSTAR'))),
  A('m-billion', 'Billion-Dollar Smile', 'hof', 'Earn $1 billion in a career.', (f) => f.g.player.earnings >= 1000),
  A('m-holdout', 'Hold the Phone', 'rotation', 'Hold out for a better contract.', (f) => f.g.history.some((h) => !!h.holdout)),
  A('m-paycut', 'Taking One for the Team', 'rotation', 'Take a pay cut to help your team.', (f) => logs(f, 'paycut') >= 1),

  // ---- odd NBA seasons ----
  A('s-no3', 'Allergic to the Arc', 'rotation', 'Play 60 games of an NBA season with fewer than one three a game tried.', (f) => season(f, (h) => h.line.tpa / h.line.gp < 1, 'NBA', 60)),
  A('s-3pa10', 'Launch Codes', 'allstar', 'Attempt 10 threes a game in an NBA season.', (f) => season(f, (h) => h.line.tpa / h.line.gp >= 10)),
  A('s-ft70', 'Bricklayers’ Union', 'bench', 'Shoot under 70% from the line in an NBA season (100 tries or more).', (f) => season(f, (h) => h.line.fta >= 100 && pct(h.line.ftm, h.line.fta) < 0.7)),
  A('s-volume', 'Volume Dealer', 'allstar', 'Average 20 points while shooting under 48% in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 20 && pct(h.line.fgm, h.line.fga) < 0.48)),
  A('s-tov35', 'Generous to a Fault', 'rotation', 'Average 3.5 turnovers a game in an NBA season.', (f) => season(f, (h) => h.line.tov / h.line.gp >= 3.5)),
  A('s-safe', 'Safe Hands', 'allstar', 'Average 6 assists and 3.5 assists for every turnover in an NBA season.', (f) => season(f, (h) => pg(h, 'ast') >= 6 && h.line.tov > 0 && h.line.ast / h.line.tov >= 3.5)),
  A('s-garbage', 'Garbage Time Hero', 'bench', 'Average under 10 minutes over 40 games of an NBA season.', (f) => season(f, (h) => pg(h, 'min') < 10)),
  A('s-quiet', 'Quiet Efficiency', 'starter', 'Average 15 points on fewer than 12 shots a game.', (f) => season(f, (h) => pg(h, 'pts') >= 15 && h.line.fga / h.line.gp < 12)),
  A('s-fta55', 'Living at the Line', 'allstar', 'Attempt 5.5 free throws a game in an NBA season.', (f) => season(f, (h) => h.line.fta / h.line.gp >= 5.5)),
  A('s-jack', 'Jack of All Trades', 'starter', 'Average 10 points, 4 rebounds, 4 assists and one each of steals, blocks and threes in an NBA season.', (f) => season(f, (h) => pg(h, 'pts') >= 10 && pg(h, 'reb') >= 4 && pg(h, 'ast') >= 4 && pg(h, 'stl') >= 1 && pg(h, 'blk') >= 1 && pg(h, 'tpm') >= 1)),
  A('s-best-bench', 'Best Seat, Best Stats', 'starter', 'Average 11 points in an NBA season as a sixth man.', (f) => season(f, (h) => h.role === 'sixth' && pg(h, 'pts') >= 11)),

  // ---- swings ----
  A('o-leap10', 'Quantum Leap', 'allstar', 'Gain 10 OVR in a single season.', (f) => f.g.history.some((h) => h.ovrEnd - h.ovrStart >= 10)),
  A('o-drop', 'Freefall', 'bench', 'Lose 5 OVR from one season to the next.', (f) => f.g.history.some((h, i) => i > 0 && f.g.history[i - 1].ovrStart - h.ovrStart >= 5)),
  A('o-steady', 'Steady as She Goes', 'rotation', 'Finish five NBA seasons in a row within a point of where each began.', (f) => { let run = 0; return f.nba.some((h) => (run = Math.abs(h.ovrEnd - h.ovrStart) <= 1 ? run + 1 : 0) >= 5); }),
  A('o-ground', 'From the Ground Up', 'allstar', 'Reach OVR 80 after starting a career under 40.', (f) => (f.g.history[0]?.ovrStart ?? 99) < 40 && f.peak >= 80),

  // ---- ages ----
  A('y-19', 'Teenage Dream', 'rotation', 'Play in the NBA at 19.', (f) => f.nba.some((h) => h.age <= 19 && h.line.gp > 0)),
  A('y-late', 'Late Bloomer', 'starter', 'Play your first NBA season at 25 or older.', (f) => (f.nba[0]?.age ?? 0) >= 25),
  A('y-as21', 'Too Young to Rent a Car', 'allstar', 'Make an All-Star team at 21 or younger.', (f) => f.g.awards.some((a) => a.key === 'ALLSTAR' && ageIn(f, a.year) <= 21)),
  A('y-mvp24', 'Precocious', 'hof', 'Win MVP at 23 or younger.', (f) => f.g.awards.some((a) => a.key === 'MVP' && ageIn(f, a.year) <= 23)),

  // ---- medals and tournaments ----
  A('tn-silver', 'Silver Lining', 'rotation', 'Win a silver medal for your country.', (f) => f.g.tournaments.some((t) => t.medal === 'silver')),
  A('tn-bronze', 'Bronze Age', 'rotation', 'Win a bronze medal for your country.', (f) => f.g.tournaments.some((t) => t.medal === 'bronze')),
  A('tn-set', 'Full Medal Jacket', 'allstar', 'Win gold, silver and bronze medals.', (f) => ['gold', 'silver', 'bronze'].every((m) => f.g.tournaments.some((t) => t.medal === m))),
  A('tn-cup3', 'Cup Collector', 'allstar', 'Win the NBA Cup three times.', (f) => f.g.tournaments.filter((t) => t.name === 'NBA Cup' && t.result === 'Champion').length >= 3),
  A('tn-mcd', 'All-American Menu', 'rotation', 'Play in the high school All-American game.', (f) => f.g.tournaments.some((t) => /All-American Game/.test(t.name))),
  A('tn-youth', 'Junior Ambassador', 'rotation', 'Play in an under-17 or under-19 World Cup.', (f) => f.g.tournaments.some((t) => /U1[79] World Cup/.test(t.name))),

  // ---- the postseason road ----
  A('r-first5', 'First-Round Exit Strategy', 'bench', 'Lose in the first round of the NBA playoffs five times.', (f) => f.nba.filter((h) => /first round/i.test(h.result)).length >= 5),
  A('r-sneaky', 'Sneaky Good', 'allstar', 'Win a title with a team that won fewer than 48 games.', (f) => f.nba.some((h) => /Champion/i.test(h.result) && h.w < 48)),
  A('r-60-noring', 'Regular-Season Royalty', 'rotation', 'Win 60 games and still miss the Finals.', (f) => f.nba.some((h) => h.w >= 60 && !/Champion|Finals/i.test(h.result))),

  // ---- roles ----
  A('ro-sixth-as', 'From the Pine to the Stars', 'allstar', 'Win Sixth Man of the Year and later make an All-Star team.', (f) => { const six = f.g.awards.find((a) => a.key === 'SIXTH'); return !!six && f.g.awards.some((a) => a.key === 'ALLSTAR' && a.year > six.year); }),
  A('ro-sixth5', 'Instant Offense', 'allstar', 'Play five NBA seasons as a sixth man.', (f) => f.nba.filter((h) => h.role === 'sixth').length >= 5),
  A('ro-key10', 'Franchise Tag', 'hof', 'Play ten NBA seasons as your team’s first option.', (f) => f.nba.filter((h) => h.role === 'key').length >= 10),
  A('ro-deep', 'End of the Bench, Start of the Story', 'rotation', 'Go from the end of an NBA bench to first option.', (f) => { const i = f.nba.findIndex((h) => h.role === 'deep'); return i >= 0 && f.nba.slice(i).some((h) => h.role === 'key'); }),

  // ---- choices along the way ----
  A('l-trade3', 'Trade Bait', 'rotation', 'Be traded three times.', (f) => logs(f, 'trade', /^Traded/) >= 3),
  A('l-asked', 'Nobody Bit', 'bench', 'Ask for a trade and get no takers.', (f) => logs(f, 'trade', /Nobody bit/) >= 1),
  A('l-number', 'New Number, Who Dis', 'bench', 'Change your jersey number.', (f) => logs(f, 'number') >= 1),
  A('l-position', 'Positionless', 'rotation', 'Change your position.', (f) => logs(f, 'position') >= 1),
  A('l-transfer', 'Transfer Portal', 'rotation', 'Transfer to another college.', (f) => f.g.transferUsed || logs(f, 'transfer') >= 1),
  A('l-focus3', 'Change of Heart', 'bench', 'Change your training focus three times.', (f) => logs(f, 'focus') >= 3),
  A('l-style', 'Playbook Author', 'bench', 'Set a style for your NBA team.', (f) => logs(f, 'style') >= 1),
  A('l-mini10', 'Arcade Regular', 'starter', 'Earn ten mini-game bonuses in one career.', (f) => logs(f, 'minigame') >= 10),

  // ---- team seasons ----
  A('w-20', 'Rock Bottom', 'bench', 'Win fewer than 20 games in an NBA season you played.', (f) => f.nba.some((h) => h.w + h.l >= 70 && h.w < 20)),
  A('w-flip', 'Worst to First', 'allstar', 'Go from fewer than 30 wins to 55 or more the next season.', (f) => f.nba.some((h, i) => i > 0 && f.nba[i - 1].w < 30 && h.w >= 55)),
  A('w-55x5', 'Model Franchise', 'hof', 'Win 55 games in five NBA seasons.', (f) => f.nba.filter((h) => h.w >= 55).length >= 5),
  A('w-500', 'Five Hundred Wins', 'allstar', 'Win 500 NBA regular-season games.', (f) => f.nba.reduce((a, h) => a + h.w, 0) >= 500),
  A('w-900', 'Win Machine', 'hof', 'Win 900 NBA regular-season games.', (f) => f.nba.reduce((a, h) => a + h.w, 0) >= 900),
  A('w-finals5', 'June Is Busy', 'hof', 'Reach the NBA Finals five times.', (f) => f.nba.filter((h) => /Champion|Finals/i.test(h.result)).length >= 5),
  A('w-lose3f', 'Always the Bridesmaid', 'allstar', 'Lose three NBA Finals.', (f) => f.nba.filter((h) => /Lost (in )?(the )?(NBA )?Finals/i.test(h.result)).length >= 3),
];
