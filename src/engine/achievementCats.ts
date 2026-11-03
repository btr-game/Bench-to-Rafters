// Round 35 (owner: "add categories for achievements (very brief so that it doesnt reveal too much
// about it, but right now, there's so much achievements but too hard to look at)"). Every
// achievement in the book is filed under one category. A category names only the area (Scoring,
// Awards, Mini-games...), never the condition, so a riddle stays a riddle.
//
// How an achievement finds its category: an id named outright in a category's list goes there;
// any other id goes to the one category whose pattern fits it (most families share a prefix:
// s-ppg, t-reb, mg-, lk-, own-...). A test keeps every id filed, no id named twice, no name or
// pattern unused and no id fitting the patterns of two categories (tests/round35-achcats.test.ts).

export type AchCat = 'rating' | 'scoring' | 'allround' | 'awards' | 'titles' | 'road' | 'career' | 'team' | 'money' | 'fame' | 'arcade' | 'modes' | 'odd';

/** The categories in the order the book shows them, each with its pixel icon (ui/art/icons.ts). */
export const ACH_CATS: { key: AchCat; name: string; icon: string }[] = [
  { key: 'rating', name: 'Rating & body', icon: 'ovr' },
  { key: 'scoring', name: 'Scoring', icon: 'shoot' },
  { key: 'allround', name: 'All-around', icon: 'rebound' },
  { key: 'awards', name: 'Awards', icon: 'laurel' },
  { key: 'titles', name: 'Titles & playoffs', icon: 'crown' },
  { key: 'road', name: 'Before the NBA', icon: 'cap' },
  { key: 'career', name: 'The long career', icon: 'hall' },
  { key: 'team', name: 'Locker room', icon: 'locker' },
  { key: 'money', name: 'Money & lifestyle', icon: 'bank' },
  { key: 'fame', name: 'Fame & family', icon: 'spotlight' },
  { key: 'arcade', name: 'Mini-games', icon: 'controller' },
  { key: 'modes', name: 'Modes & pages', icon: 'dial' },
  { key: 'odd', name: 'Oddities', icon: 'eye' },
];

/** What files an achievement under each category: ids named outright, then patterns. */
export const ACH_CAT_RULES: Record<AchCat, (string | RegExp)[]> = {
  // the rating, how it swings, the body and its injuries (round 37: the career changers, a late peak,
  // the summer of work)
  rating: [/^ovr\d+$/, /^o-/, 'teen70', 'young85', 'spurt', 'seven', 'sky', 'small', 'heavy', 'feather', 'hurt1', 'hurt10', 'bubble', 'wingspan', 'c-noinj', 'l-focus3', 'ft-touch', 'ft-up', 'x-tallpg', /^cx-/, 'vt-ovr90', 'vt-latepeak', 'tp-summer'],
  // points, shooting and efficiency, in a game, a season or a career
  scoring: [/^pts\d+k$/, /^g\d+$/, /^ppg\d+$/, /^s-ppg/, /^s-(20|25)x/, /^s-(fg|ft|3p)/, /^t-3pm/, /^e-/, 's-504090', 't10', 't14', 'g-stretch5', 'g-ft450', 'g-ts62', 's-c-3', 'k-ft65', 'g-post', 'g-vet-high', 'g-loss50', 'g-teen20', 'g-old20', 'k-pure', 's-quiet', 'ft-c85', 'ft-s95', 'sa-late3', 'vt-20at40'],
  // rebounds, assists, steals, blocks, minutes and the lines that fill every column
  allround: [/^s-(rpg|apg|spg|bpg)/, /^t-(reb|ast|stl|blk)/, 'r20', 'r25', 'a15', 'a20', 's7', 'b8', 'apg10', 'rpg12', 'rpg15', 'tdavg', 's-min35x5', 's-dd', 's-2010', 's-2010a', 's-25105', 's-5x5', 's-c-ast', 's-pg-reb', 's-pg-blk', 's-sf-all', 's-safe', 's-jack', 't-everything', 'g-r28', 'g-a25', 'g-s10', 'g-b10', 'g-post-reb', 'g-3010', 'g-20105', 'g-3010pr', 'g-stocks', 'g-pointc', 'g-swatguard', 'g-min40', 'g-posttd', 'k-selfless', 'k-grip', 'k-basics'],
  // the league's awards, the All-Star and All-NBA teams, medals for his country (round 35: and the
  // awards of a draft class's reunion night)
  awards: [/^as\d+$/, /^allnba/, /^mvp\d+$/, /^dpoy/, /^a-/, 'roy', 'allrookie', 'sixth', 'mip', 'scoring', 'scoring5', 'astlead', 'reblead', 'stllead', 'blklead', 'fmvp', 'fmvp3', 'twoway', 'haveitall', 'triplecrown', 'dayone', 'lonewolf', 'legend1', 'legend3', 'medal', 'olygold', 'wcgold', 'asiangold', 'olygold3', 'cupmvp', 'y-as21', 'y-mvp24', 'g-lateas', 'tn-silver', 'tn-bronze', 'tn-set', 'dn-roy', 'fl-mvp-beat', 'fl-mvp-friend', 'fl-as-pal', 'mp-rmvp', 'mp-r3', 'mp-rsweep', 'cx-next-as', 'cx-knee', 'vt-as38', 'vt-mvp37', 'bar-mvp3row', 'bar-as10row'],
  // the team's seasons, the playoffs (round 35: a series against his rival classmate), the rings
  // and the cups, crunch time in a final
  titles: [/^w\d+$/, /^w-/, /^ring/, /^p-/, /^r-/, /^clutch/, /^crunch/, 'l60', 'playin', 'sidedoor', 'playoffs', 'round2win', 'conf', 'finals', 'lostfinal', 'threepeat', 'cinderella', 'youngring', 'oldring', 'cup', 'a-rings3teams', 'a-decades', 'a-pick1-ring', 'a-ncaa-nba', 'a-gold-ring', 'a-scoretitle', 'tn-cup3', 'g-2cities', 'k-quiet', 'g-post30', 'c-overseas-ring', /^rs-/, 'fl-ring-pal', 'tw-banners'],
  // high school, college, the leagues abroad and the G League, the draft (round 35: draft night),
  // the way in (round 36: the endings of a dream that ended early and of a legend of Europe)
  road: [/^(hs|ncaa|eu|int|gl|d)-/, 'fivestar', 'topclass', 'state', 'college', 'ncaa', 'naismith', 'euro', 'eutitle', 'abroad', 'gleague', 'callup', 'scenic', 'drafted', 'round2', 'round1', 'lottery', 'top3', 'pick1', 'undrafted', 'debut', 'young', 'c-5levels', 'c-prep', 'c-g-league-mvp', 'y-19', 'y-late', 'tn-mcd', 'tn-youth', 'l-transfer', /^dn-/, 'en-dream', 'en-euro', 'tw-looks4'],
  // the years, the games and seasons, the scoring list, the farewell, the Hall and the rafters
  // (round 36: whose rafters, and how he got there; the endings a career can have; round 37: his
  // statue, and the long careers aging now allows)
  career: [/^age\d+$/, /^gp\d+$/, /^idx/, /^fw-/, /^rc-/, 'vintage', 'finewine', 'methuselah', 'fountain', 'early', 'walkaway', 'lp50', 'hof', 'hof1', 'rafters', 'rafters2', 'top100', 'top25', 'top10', 'goat', 'peak5', 't-min40k', 't-20s', 't-15s', 't-gp1200', 's-gp82', 's-gp82x5', 'c-comeback', 'c-short', 'g-hofnoring', 'ft-c80', 'ft-m3k', 'ft-m6k', 'sa-sht80', 'c-dfig', /^rf-/, /^en-/, 'tw-statue', 'cx-knee-rafters', 'vt-start42', 'vt-span15'],
  // roles, trades, teammates, the coach and the rivals (round 35: friends among them; round 36:
  // the night an old rival's number goes up; round 37: the cities' landmarks seen with his teams)
  team: [/^lk/, /^co-/, /^ro-/, /^rival/, 'starter', 'key', 'sixthrole', 'deep', 'captain', 'traded', 'flyer', 'journey', 'passport', 'oneclub', 'duo', 'trio', 'chaser', 'chaserring', 'chalk', 'l-trade3', 'l-asked', 'l-number', 'l-position', 'l-style', 'c-oneteam12', 'c-5teams', 'c-8teams', 's-best-bench', 'mp-beat1', 'mp-beat5', 'mp-top1', 'mp-top3', 'mp-class-as', 'mp-ans-ring', 'mp-made-hof', 'mp-rn1', 'mp-rn5', 'mp-fduo', 'mp-ftrio', 'fl-join', 'tp-rival', /^ar-mark/],
  // earnings and contracts, the shop and what it sells, the staff (round 37: the agent's office, the
  // home the bank buys, the car and the hoop on the street)
  money: [/^m\d+$/, /^m-/, /^shop\d/, /^staff/, /^talk-/, /^own-/, /^wear/, /^(legacy|invest)-/, 'spree', 'cleanout', 'visit5', 'visit15', 'c-broke', 'c-saver', 'tw-agent1', 'tw-agent50', 'tw-house', 'tw-mansion', 'tw-curb', 'tp-rights', 'tp-loyal', 'tp-move'],
  // nicknames and brands, the press and the fines, love, a family and the next generation (round
  // 36: the username, the speech under the lights, the JV coach and the fan account)
  fame: [/^nick/, /^brand/, /^shoe/, /^fine(\d|-)/, /^press/, /^wed/, /^dad/, /^fam-/, /^gen2/, /^kid/, 'logo', 'military', 'love', 'breakup', 'sons3', 'mp-crown', /^nm-/, /^sp-/, 'tp-jv', 'tp-fan', 'tp-street', 'tp-mural', 'tp-gym', 'tp-knee'],
  // the arcade, and the bonuses in a career
  arcade: [/^mg-/, 'side', 'l-mini10'],
  // the difficulties and challenges (round 35: play with friends, the road map's unlocks), and the
  // game's own pages and habits (kept across careers; round 36: the finale; round 37: the town's doors)
  modes: [/^c\d+$/, /^daily/, /^(lock|mic|card|fold|look)\d/, /^real/, /^star(\d|mvp)/, /^ns-/, /^comet/, /^mp-/, /^un-/, 'titles10', 'mvp10', 'share1', 'mixtape', 'album', 'undo1', 'cmp1', 'resume1', 'road-all', 'visit10', 'visit50', 'visit100', 'regularhof', 'allmodes', 'fastdone', 'masterdone', 'c-sim', /^fn-/, /^tw-door/, 'tw-every'],
  // nights so bad they are hard to have, simple math and the odd shapes of a season or a career
  // (round 36: the credits it rolls; round 37: the miles walked on the street)
  odd: [/^b-/, /^n-/, 's-no3', 's-ft70', 's-volume', 's-tov35', 's-garbage', 'c-num0', 'c-num99', 'c-lefty', 'c-lowpeak-ring', 'g-rookie-high', 'g-hs-high', 'mp-made-low', 'ft-bad', 'x-upside', 'x-flash', 'rs-lost3', /^cr-/, 'tw-mile', 'tw-marathon', 'tp-midnight'],
};

const NAMED = new Map<string, AchCat>();
for (const c of ACH_CATS) for (const r of ACH_CAT_RULES[c.key]) if (typeof r === 'string' && !NAMED.has(r)) NAMED.set(r, c.key);

/** The category an achievement is filed under, or null for an id no rule files yet (a test fails then). */
export function achCatOf(id: string): AchCat | null {
  const named = NAMED.get(id);
  if (named) return named;
  for (const c of ACH_CATS) if (ACH_CAT_RULES[c.key].some((r) => typeof r !== 'string' && r.test(id))) return c.key;
  return null;
}
