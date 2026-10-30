# Decisions

Choices made where SPEC.md was ambiguous, simplified, or where a starting value had to change
to meet the balance targets in §15. Every tunable number lives in `src/engine/balance.ts`.

## Architecture

- **One state machine.** `src/engine/flow.ts` exposes `newGame`, `prompt`, `choose` and `advance`.
  The UI and the balance harness both drive the game only through these four functions.
- **State is mutated in place by the engine.** The Zustand store clones the state
  (`structuredClone`) before each action; the harness mutates directly for speed. The state is
  plain JSON at every step (a test checks a JSON round trip, and that a game resumed from JSON
  plays out identically).
- **Effects are direct mutations.** §11 describes events returning `Effect[]`; event choices here
  mutate the state directly and return an outcome text. Events are still data (`events/defs.ts`);
  the state only stores the event id. Choices built from a function are rebuilt and matched by label.
- **Decisions are a queue.** `state.pending` holds decisions (`{kind, title, text, choices, data}`).
  Offers, draft previews and the like travel in `data`, so everything stays JSON.
- **A decision with no enabled choice is dropped** by `prompt()` so the game can never soft-lock.
- **Fan reactions use their own hash**, not the game's random stream, so adding reactions never
  changes simulated results.

## World and leagues

- **The NBA world is created at the end of the senior high-school season** and warmed up for two
  simulated seasons, so ages and contracts look settled by the first draft the player can enter.
- **Seasons the player is not in** (while he is in high school, college or overseas) are simulated
  by team strength only, without stat lines. Generated players' reputation then follows their OVR.
- **Generated stat lines are made once per season**, at the end of the regular season, not per
  half. The All-Star "first-half value" for generated players is their season value with ±8% noise.
  Outside the NBA only the top 7 of each roster get lines (enough for awards).
- **NCAA, G League and EuroLeague rosters are regenerated each season** around the team strengths
  in Appendix A; only the NBA world persists between seasons.
- **Team strength in the NBA = weighted top-9 OVR + a coaching factor.** Without a persistent
  team factor the league converged to parity within ten seasons (best and worst records 59/27).
  Each team has a hidden coaching/system factor that drifts slowly (AR(1), see `COACHING`). The
  player is never in a roster array; his team's strength excludes him and his own impact is added
  per game (§9 formula).
- **Level averages.** The stat model's "average rotation player" per level (`LEVELS[x].avg`) is
  about 4 below the mean team strength of that league. The NBA uses the §7 role scale
  (70 end of bench, 72 rotation, 76 starter, 83+ All-Star), which puts mean NBA team strength
  near 77–78. NCAA tier strengths and EuroLeague club strengths are used exactly as listed.
- **EuroLeague has 18 clubs** (the 12 in Appendix A plus Crvena zvezda, Bayern Munich, Olimpia
  Milano, Baskonia, Paris Basketball and LDLC ASVEL) so a 34-game season works.
- **NCAA has 74 programs** (Appendix A plus more major-conference and mid-major programs).
- **March Madness uses a 64-team field** (no First Four) and skips conference tournaments.
- **High school:** the player's school roster has six players per grade. The top 12 make varsity.
  The state league has 24 schools, and the top 16 make a 4-round state playoff. JV has no playoffs.
- **G League playoffs:** top 8, single elimination, best-of-3 final. **EuroLeague:** top 8,
  best-of-5 quarterfinals, then a single-game Final Four.

## Player model and growth

- **The growth table changed shape.** With the §7 starting table (2.4/2.0/1.5/1.1/0.7…) and
  headroom `(cap−stat)/20` capped at 1.2, a potential-87 player peaked around 76: high potentials
  could not reach their ceiling. The tuned table keeps 2.4 per half until 20, then
  2.0 / 1.5 / 0.9 / 0.3 / 0, with headroom `(cap−stat)/25` capped at 1.5. Result: potential 70 peaks at
  about 69 with sensible choices, potential 85 at about 83, and a first season in a real role
  gains about +5.
- **Caps:** `cap = potential + (startingStat − 40) × 0.45` (spec: 0.6). With 0.6, focusing the two
  most heavily weighted stats let players peak 5+ points above potential.
- **Summer programs respect the caps.** Without this, +1 per summer to a focus stat for 15 summers
  bypassed potential entirely.
- **Growth after the playoffs** is not applied (a full half's worth of growth after a few playoff
  games was a bug).
- **Early bloomers:** ×1.15 growth before 18, then use the rate for an age 2 years older (they
  plateau early). The spec's "use the rate for an age 2 years older until 20" would have made
  early bloomers grow *slower* while young, the opposite of the name.
- **Durability:** the trait multiplies injury risk, so a season-ending injury *raises* it by 0.1
  (the spec's "durability −0.1" means "less durable").
- **Scouting** shows a letter grade and a range from age 16 (end of sophomore year).
- **Generated players** grow by closing a share of the gap to their potential each season
  (`GEN_GROWTH.gapRate`) times a hidden development factor drawn at the draft (some reach their
  potential, many bust). This keeps the NBA's talent distribution stable over decades.
- **Draft prospects are drawn like the player:** potential ~ Normal(70, 8), and OVR is the
  expected OVR for that potential and age on the same growth curve, plus noise.

## Careers, contracts, offers

- **Undrafted players cannot be drafted later** (they become free agents).
- **G League and EuroLeague players are draft-eligible from 19** until drafted or undrafted, and
  are automatically entered at 22. They cannot withdraw (only NCAA players can).
- **NBA free agency:** the number of suitors is Poisson-distributed around how far the player is
  above the league's average 11th man, plus minutes and reputation, with a veteran fade. Per-team
  coin flips gave a 72-OVR bench player a dozen offers every summer. The current team's re-sign
  chance depends on role, coach trust and age; captains are almost always re-signed.
- **Exhibit 10:** offered after going undrafted if the player is within 3 OVR of a thin team's
  13th man. Making the roster is a logistic roll against the 13th man's OVR; failing it means a
  G League contract with the affiliate.
- **Recruiting rank** is computed analytically against a normal national-class distribution
  (no 300-player list is generated). 2★ recruits get a Division I offer 60% of the time and 1★
  recruits 25%. With no offer at all the career ends as "Hoops dream".
- **Retirement:** recommended when OVR is 11+ below peak with few minutes (spec), or at 32+ when
  5+ below peak (added to bring retirement ages into range). Overseas and G League interest fades
  with age. Forced at 42.
- **Two-way contracts, assignments as a separate contract type, RFA, rookie extensions, raise and
  trade requests, hold-outs, AI trades, the shop and the CBA option are Phase 3.** Phase 1–2 have
  a simplified G League assignment: an end-of-bench NBA player can ask to be sent down for the
  second half of the season.
- **Free-agency pitches** (approach up to 3 teams) are Phase 3. Phase 2 free agency shows the
  offers that come in.

## Awards and legacy

- **Value score** = PTS + 0.9 REB + 1.4 AST + 2 STL + 2 BLK − TOV + an efficiency term
  `(TS% − 0.565) × TSA × 2 × 0.9`.
- **Defensive score** = 0.3·PER + 0.3·INT + 4·STL/g + 4·BLK/g + 0.06·(W−L).
- **Finals MVP:** the player wins it if his playoff value per game beats the champion's top
  three players' season values (each with ±15% noise).
- **Rivals:** a generated player who wins MVP or Naismith while the player finishes top 10 is
  recorded in `state.rivals`.

## Harness and tests

- **The harness runs on worker threads** (one per core). 2,000 careers take about 35 s on 4 cores
  and about 2 minutes on one core. Results do not depend on the thread count.
- **Smart policy details:** focus on the two most heavily weighted stats for the position;
  Grind until 24 (Recovery when injured), then Balanced; skills camp every summer; takes G League
  assignments; enters the transfer portal when buried; avoids risky event choices; retires when
  advised at 32+. Among offers it prefers the highest level where it is at least Rotation, then
  minutes, then team outlook, then money.
- **"Declared"** counts forced entries (out of eligibility, age 22 overseas) as declarations.
- **Median retirement age** is measured over careers with at least one pro season (otherwise
  "Hoops dream" careers ending at 18 dominate the median).
- **Balance test tolerance:** ±30% of the target range, widened to two binomial standard errors
  for rare outcomes (300 careers cannot resolve ±30% of a 1% target). `KNOWN_GAPS` in
  `tests/balance.test.ts` lists targets still outside ±30%; Phase 5 must empty it.

## UI (Phase 2)

- **No saves yet** (§16 "Later"); refreshing the page ends the career. The state is JSON-safe,
  so adding localStorage saves later is a small change.
- **Theme:** Auto / Dark / Light toggle in the top bar, remembered in localStorage.
- **League tab:** generated players' stat lines are made at the end of the regular season, so
  during the season the tab lists top players by OVR, and scoring leaders once the season is done.
- **Season summary** lists only award races where the player finished top 10.
- **Headlines and comments that quote stats** are used only for seasons of 12+ PPG.

## Playtest round 1 (Oct 2026)

- **Hometown and high school are assigned**, not chosen: `newGame` picks a hometown and one of
  its (fictional) schools from `HOMETOWN_SCHOOLS` with the seeded RNG, and an arrival page
  reveals them.
- **Moments.** `state.moments` is a queue of full-screen story pages (arrival, commitment or
  signing, draft night, training camp result, title game, season honours). They never block the
  flow; the UI shows and dismisses them, and the harness ignores them.
- **Title game animation** is built in the UI from the final's box score (scores, the player's
  makes, opponent baskets) with its own hash, so it never touches the game's random stream.
- **Transitions** (half-season ticker, new-season card, fade-ins) live in the store, outside the
  saved state.
- **Easier road to the NBA, same NBA difficulty.** More D1 offers for 1–2★ recruits, an easier
  recruiting curve, more NBA camp and call-up interest for G League and EuroLeague players, and a
  +4 bonus on the player's own draft-board score. The bonus is applied to the player only, so the
  league's talent pipeline (and with it how hard it is to become an All-Star) does not change.
  The §15 targets for NBA entry, 5+ seasons and undrafted share were raised to match; NBA
  success targets are unchanged.

## Playtest round 2 (Oct 2026)

- **Average peak near OVR 75.** Potential is now Normal(75, 5.5) (was 70, 8). To keep NBA
  stardom meaningful, the league's draft prospects got stronger (`DRAFT.potMean` 70 → 73.5), so
  the league's own stars improved too. With smart choices, about 1 in 3 careers makes an All-Star
  team and about 1 in 8 reaches the Hall of Fame. The §15 targets were replaced (see
  `scripts/harness.ts`), and mean peak OVR is now a tracked target.
- **Randomness.** Each game has a form roll (hot and cold nights) inside a streaky rhythm for
  the half. Each half-season plan rolls an outcome (breakthrough, steady, plateau, setback);
  morale shifts the odds. Morale changes in-game shooting by up to ±8% and growth by ±10–20%.
- **Plans** went from 5 to 9: four targeted training plans (shooting, strength, playmaking,
  defense) speed up some stats and slow the rest. Plans also change shot volume and the team's
  strength in games.
- **Riskier injuries:** a higher base rate, more major and season-ending injuries, morale hits,
  and a 50% chance that a season-ending injury lowers the ceiling of athletic stats. Major
  injuries get their own page.
- **Shop:** 37 items (shoes, gear, training, recovery, lifestyle). Each offseason it shows five
  items picked around the bank balance; up to two purchases a summer.
- **Events:** about 40 in total (was 14), with bigger effects, some shown odds, trades,
  extensions, sneaker deals, slumps and hot streaks. They are far more frequent (most halves
  have one). An event whose situation changed before it was answered (for example the player
  changed leagues) has no effect.
- **Tournaments:** NBA preseason (it can change coach trust and role), the NBA Cup knockout,
  All-Star weekend (selection at midseason, 3-point and dunk contests, the game itself), NCAA
  conference tournaments, a high school national invitational, the McDonald's game, and national
  teams: U17 and U19 World Cups, the FIBA World Cup and the Olympics, by invitation. The
  nation is South Korea for Seoul-born players, otherwise the USA.
- **Pathways:** a post-grad prep year for 1–3★ recruits; overseas leagues beyond the
  EuroLeague (NBL, CBA, B.League, KBL) as destinations, including NBL Next Stars for top
  recruits and big-money CBA offers late in a career.
- **Scouting report:** tier for the current OVR, a projected peak range and odds for the NBA,
  All-Star, All-NBA, Hall of Fame and MVP. The odds curves were fitted to harness data.

## Playtest round 3 (Oct 2026)

Feedback: no visible growth numbers or event percentages; too easy; a wider spread of
careers; choose the dominant hand; full playoffs and tournaments instead of results; players
from other countries; a stricter OVR scale; MVP voting and fictional award winners; slightly
fewer injuries but other risks; more events and purchases; retire any season; bigger text.

- **Hidden numbers:** plan outcomes and shop items are described in words. Event choices show
  a risk level (Low, Medium, High) instead of odds.
- **OVR scale:** 80 is an All-Star, 85 All-NBA 2nd team, 90 All-NBA 1st team, 95 an MVP, 97
  the all-time greats, and 98-99 is beyond them. Attributes may pass 99 (up to the caps) so
  the top of the scale is reachable; OVR itself stops at 99.
- **Spread:** potential is lognormal (base 45, mu 2.97, sigma 0.6, max 103). Over 1,000
  careers the average peak is 65.9 (random choices) and 69.6 (smart choices), standard
  deviation about 12. About 1 in 20 careers peaks near 50 and about 1 in 20 smart careers
  peaks at 96 or above.
- **NBA world on the new scale:** the draft pool uses the same lognormal shape (mu 2.84,
  sigma 0.46). The league averages about 40 players at 80+, 15-18 at 85+, about 5 at 90+ and
  one at 95+. Free agents no longer flock to strong teams (pull 0.5 to 0.12), which had built
  superteams with 75-win seasons. The world now warms up for 12 seasons so it starts in
  steady state.
- **Box scores at the top:** shot volume flattens above a scoring rating of 78 and shooting
  efficiency above an attribute of 85, so a 95 averages about 29 points, not 38. The league
  scoring leader averages about 32 PPG. Morale now helps or hurts around a neutral 75 (it was
  a free boost for the player), and generated players' weak hand scales with OVR.
- **Scouting report:** new tiers on the scale above, odds refitted to harness data, and a new
  All-NBA 1st team row.
- **Dominant hand:** picked at creation. Lefties get a small finishing edge; the weak-hand
  meter and training plan follow the chosen hand.
- **Postseason:** every series keeps its game scores. The NBA bracket shows the play-in,
  Finals MVP and East and West Finals MVPs (chosen from series lines); other levels get a
  Final Four Most Outstanding Player or finals MVP. A recap page follows every postseason.
  MVP voting shows the top five with OVR and stats. The NBA record book lists each season's
  champion, Finals MVP, MVP, Rookie of the Year, DPOY and scoring champion, including seasons
  before and outside the player's NBA career.
- **Tournaments:** the NBA Cup, national teams, conference tournaments and high school
  nationals record every game, the group table and how the rest of the bracket went.
- **International players (real routes as of 2026):** half of careers start outside the US,
  in 22 countries. Europeans grow up in a club academy (Real Madrid, ASVEL, Žalgiris...), can
  be called up to the first team at 16-17 and declare for the draft from 19 (automatic at 22),
  like Dončić and Wembanyama. NBA Academy Africa and Latin America players, Canadians,
  Australians (NBA Global Academy) and Asian players can move to a US prep school for
  exposure; otherwise they get their home routes: NBL Next Stars, the B.League, KBL or CBA.
  US colleges see less of players who stay home (one star fewer for college offers). Youth
  leagues, opponents and the national team follow the player's country; McDonald's and high
  school nationals are US-only. Over 1,500 careers each path reaches the NBA at 58-68%.
- **Risks and events:** base injury rate 0.0135 to 0.0118 per game. New non-injury risks:
  burnout, illness, a nightclub fight, a betting investigation, failing a class, a crooked
  financial adviser, a feud with the team star, a coach firing, performance anxiety, a car
  accident. Suspensions now cost a number of games. Also new: a poster-dunk moment, a
  foundation, a new baby. A second mid-season event happens half the time (was 40%).
- **Shop:** 58 items (was 37), up to $60M (a stake in a pro club, a private island, a
  longevity clinic, a personal skills staff). Six items in stock, up to three purchases.
- **Retire any season:** after high school, a Retire button (with a confirmation) is
  available between any two seasons.
- **Text:** body text 15 to 16.5px, small text and labels 1.5px larger, and bold text a step
  larger than the text around it.
- **Harness targets** were reset to this design (see `scripts/harness.ts`); every target and
  league calibration check passes.

## Playtest round 4 (Oct 2026)

Feedback: more archetypes (five per position), more varied starting OVR (it was always
about 46), fewer but more costly injuries, more varied heights, and easier position changes.

- **Archetypes:** five per position (25 total), each still totaling 320 and starting
  between 40.5 and 47 OVR on its card. New: Jumbo Playmaker and Speedster (PG), Combo Guard
  and Shot Creator (SG), Scoring Wing and Glue Guy (SF), Two-Way Forward and Playmaking Four
  (PF), Playmaking Big and Lob Threat (C). Some shift the usual height (a Jumbo Playmaker is
  about 4 inches taller). Generated players use all five shapes.
- **Starting level:** the card is a typical player of that type. At tryouts every attribute
  moves by a shared shift ~ N(+1.5, 4.2), partly linked to potential (early and late
  bloomers both exist), plus ±2 per attribute. Starting OVR now runs about 35 to 53 (5th to
  95th percentile). The ceiling still comes from the card, so a head start is not a higher
  ceiling. The first story page shows the starting level and projected height.
- **Height:** full height is normal around the middle of the position's range (sd 2.3
  inches, up to 4 inches outside it): from 5'8" point guards to 7'6" centers. A 14-year-old
  has 1 to 7 inches left to grow. Height against the position's norm shifts the starting
  card (taller: more rebounding and interior defense, less playmaking and athleticism).
- **Injuries:** base rate 0.0118 to 0.0092 per game (about 22% fewer). Each one costs more:
  minor ones can cost a point of athleticism; major ones 2-4 athleticism plus 1-3 of another
  stat and sometimes the athleticism ceiling; season-ending ones 5-9 athleticism, 2-4 of two
  other stats, and usually lower ceilings. The injury page shows the OVR before and after.
- **Positions:** every offseason the player may move one spot along PG-SG-SF-PF-C, or two
  spots when his height fits (within an inch of the new position's range). The options show
  his OVR at each position and whether his size fits. Coach trust drops a little. A coach may
  also ask for a mid-season move to a spot that suits him.
- **Balance:** potential mu 2.97 to 3.01 to make up for the heavier injuries and lower cards.
  Every harness target passes (mean peak 65.6 random, 69.3 smart).

## Playtest round 5 (Oct 2026)

Feedback: make playoff games playable; make height less predictable so position choices
matter; compare finished careers with real players (80+ OVR) using a small model; run a
100-career simulation and show the OVR distribution.

- **Playable postseason:** before each postseason game the player chooses to play it, simulate
  it, simulate the rest of the series, simulate the rest of the postseason, or always
  simulate (a toggle on the Player tab turns playable games back on). A played game asks for
  a tactic each quarter (play your game, take over, get everyone involved, lock in on
  defense) and, in a finish within 3 points, the last possession (pull-up, attack the rim,
  or find the open man). Implementation: the postseason replays deterministically from a
  snapshot taken at the end of the regular season, with the picks made so far, and pauses
  at the first pick it does not have. State stays plain JSON; the postseason code is
  unchanged. Balance over 30 careers per tactic: simulating won 22 titles, neutral play 21,
  skill-matched tactics 26-27. The harness always simulates (replays would slow it 4x).
- **Height:** the doctors' projection at 14 can miss the true adult height by -3 to +4
  inches (normal, mean +0.3, sd 1.7). Players grow until 19, and the projection sharpens
  each year (sd 1.4 at 15 down to 0.5 at 18). Growth spurts and early stops are reported.
  Position fit is judged on the projection while he is still growing.
- **Career analysis:** after retirement, careers that peaked at 80+ are compared with 100
  all-time greats (career averages and honours through 2024-25, approximate; the order
  follows Bleacher Report's July 2025 list where it could be confirmed). Comparables come
  from a weighted nearest-neighbour search; the projected all-time rank comes from a ridge
  regression (lambda 3) on log(rank). Fit: Spearman 0.868 in-sample, 0.842 leave-one-out,
  median leave-one-out error 8.5 places.
- **DPOY:** perimeter and interior defense above 85 count for less in the defense score, and
  each past DPOY costs the player 1.5 points with voters. Defensive careers had won it up to
  13 times; now at most 4 (the real record).
- **Distribution test (report in Word):** over 1,000 careers the mean peak is 65.4 (random)
  and 69.1 (smart). Peaks under 52.5: 15.0% and 8.0%. Peaks of 97+: 1.5% and 4.9%. No
  balance change was made yet; options are in the report.

## Playtest round 6 (Oct 2026)

Feedback: event results should differ each time and be easier to read; no OVR on the start
screens; larger text; distinguishable awards; an unreadable recap page; a wider distribution
with the average in the early 70s; two new modes; a hidden growth factor that can make a
low start surge (shaped by age and raised by choices); starting OVR around 40 with rare
extremes at 20 and 60; two plans at a time; a height warning.

- **Modes:** Standard; Reality hits hard (potential base 40, mu 2.25, sigma 0.6; growth x0.92;
  injuries x1.3; about 5-8% of careers reach the NBA); Shoot for the stars (potential base 86,
  mu 1.9, min 88; growth x1.35; injuries x0.6; a floor keeps him on a straight line from his
  start to OVR 80 at 22, so every career that lasts that long reaches 80+). The league is the
  same in every mode. Picked on the first creation screen; shown on the retirement page.
- **Standard balance:** potential mu 3.36, sigma 0.66. Over 2,000 careers: mean peak 68.5
  (random) and 74.1 (smart). Harness targets were reset to this design.
- **Starting OVR:** Laplace around 40 with scale 20/ln(15), so about 1 in 30 players starts at 20
  or below and 1 in 30 at 60 or above, and half start within ±5 of 40. Every archetype starts
  near the same level (the card is the shape, not a head start). Starting attributes may go
  down to 5.
- **Hidden growth rate:** lognormal around 1 (sd 0.3), a little lower for players who start
  ahead. It multiplies growth, makes breakthroughs likelier, can trigger a "surge" half (2.6x
  growth) for young fast learners, shifts the whole growth curve and the start of decline by
  4 years per +1.0, and fades 2.5% a year from 27. Scouts hint at it. It goes up with choices:
  seven new events (a mentor, 5 a.m. workouts, film sessions, an elite trainer, staying
  hungry, studying the greats, habits that extend a prime) and grind-plan breakthroughs.
- **Growth curve:** fast in the teens, slowing through the twenties, fading out between 30 and
  34. Players who barely play still develop in practice (minutes factor floor 0.5, was 0.25):
  benched teenagers had stopped growing entirely.
- **Two plans:** pick one or two plans per half; with two, each counts at 65% of its effect.
- **Events:** every effect of an event choice is scaled by one random factor (about 0.45x to
  1.8x) each time it happens. The outcome shows as a card with green and red change chips.
- **Awards:** nine categories, each with a colour and icon (championship, MVP, big-game MVP,
  all-league team, defense, breakout, skills, national team, school and youth), and a
  one-line description. The trophy cabinet groups them by category with the seasons won.
- **Height warning:** a story page when his size (or projection) stops fitting his position,
  with the positions that fit and his OVR there; a warning mark on the player card and the
  position card until he moves.
- **Fixes:** the postseason recap's class names collided with an older style (white text on a
  light box); OVR removed from the creation screens and the first story page; text one pixel
  larger again (body 17.5px).
- **Cleanup:** removed code left over from earlier rounds (an old hometown list, unused
  helpers, pennant-banner styles and unused layout utilities).

## Round 7 (playtest feedback)

Feedback: a tougher high school bar (60 OVR = 5-star); no decorative emojis; focus changes
more often; a 99 cap; Finals MVP (it already existed); an easier Reality mode (average ~60);
Stars centred in the early 90s; a shareable final page; the old award banners back; rare
career-changing swings; a separate difficulty page; a season-end archetype read; a legacy
tier list and all-time ranking; injury load that shapes aging; aging that hits hard by 35 in
every mode; more rating events; jersey number changes; an NBA-style bracket; choosable
nationality; event results that really differ; rare mold-breaking players; heights from
5'9" to 7'6"; a few more assists.

- **Recruiting:** a senior-equivalent score (OVR + 3.5 per year left + small potential and
  buzz terms) is ranked against a normal class (mean 41.3, sd 7.7): about 60 OVR as a senior
  is a 5-star. Americans get +2.5 on that score, Canadians +1.
- **Caps:** every rating stops at 99. The starting card shapes the ceilings less (0.2 per
  point). Focus can change once every offseason (from the Home screen) and through events.
- **Event outcomes:** each choice rolls a tier: breakthrough 10%, better 22%, as expected 42%,
  mixed 17%, backfired 9%. The good parts of the result are scaled by one factor and the bad
  parts by another (a backfire keeps 0-25% of the good and 140-200% of the bad), and lucky or
  unlucky twists with their own text (a trick from a teammate, a tweaked hamstring, a viral
  clip) are added. A gamble that already failed cannot become a breakthrough. The result card
  shows the tier as a coloured tag.
- **Rating events:** ten new events that build ratings directly (a shooting camp, post
  footwork, a summer of handles, a defensive guru, plyometrics, the glass, pro runs, a new
  move, fixing the weak spot, film with the coaches).
- **Swings:** the leap (0.5% a year x growth rate, ages 19-28: ceiling +8-16, ratings +5-9,
  faster growth) and the tragedy (0.3% a year x durability x wear, from 21: a torn ACL that
  cuts athleticism and its ceiling for good). About 5-7% of careers see each.
- **Body wear (0-100):** minutes and hard plans add to it, injuries add more, summers and the
  rest program take a little off, health purchases help. Aging is scaled by 0.6 + wear/50, so
  a fresh body ages at about 0.6x and a ground-down one at up to 2.6x. Decline starts at 27-31
  by body type, a little later for fast learners (capped at 2 years). Standard players are
  about 22 points off their peak at 35 (15 with low wear, 25 with high wear).
- **Stars floor:** only through age 29, so aging hits stars too (about 28 points by 35).
- **Bug fix:** fast learners' younger "body clock" pushed a 14-year-old below the start of the
  growth table, so a high hidden growth rate meant no growth at all in the early teens (one
  test player stayed at OVR 34 to 18 with potential 84). The clock now never goes below 14.
- **Modes (100-career sims, smart policy):** Standard potential base 40, mu 3.25, growth
  x0.94: mean peak about 73. Reality base 45, growth x0.9: mean about 60, about 30% play in
  the NBA. Stars base 83, mu 1.8, max 99, growth x1.2: mean about 92, about 5% reach 98.5+.
  The harness's undrafted-of-declared target moved to 0.28-0.45 (the wider spread sends more
  weak seniors into the draft pool).
- **Nationality:** chosen at creation or left to the game. USA and Canada: recruiting edge.
  Europe: EuroLeague contracts pay 1.3x and judge his role 3 OVR higher. Africa: 0.9x growth
  at home as a teenager until a US prep school; Latin America 0.95x. South Korea: about 18
  months of military service with the Sangmu army team (a KBL season on army pay) between 23
  and 28, offered when his contract is up and forced at 28, unless an Asian Games gold or an
  Olympic medal exempts him. Asian nations now play the Asian Games.
- **Rare players:** 5% of careers start with a mold-breaking gift (point center, rebounding
  guard, shot-blocking guard, point forward, shooting big, switchable big, post-up guard): a
  big boost in one skill with a ceiling to match.
- **Archetype AI:** each offseason a nearest-prototype classifier (rating shapes, softmax over
  distances) re-reads his game; the label changes when another archetype clearly fits better,
  and a rare mold can be recognised later in a career. The Player tab shows the top three.
- **Legacy tier list:** S (Hall of Fame, a jersey in the rafters, MVP, Finals MVP) down to D.
  Legacy points = the legacy score + 10 for the Hall (14 on the first ballot) + 6 per team
  that hangs his jersey (up to 3). The same weights score the 100 legends, and his rank among
  them is the headline on the final page; the style model now only finds the closest careers.
- **Share:** the final page draws a career card (PNG) that can be downloaded or sent through
  the phone's share sheet.
- **Bracket:** the NBA postseason is drawn like the league's graphic: West left, East right,
  seeds, team marks and series wins converging on the Finals and a champions banner.
- **Heights:** 5'9" to 7'6". About 98% land between 6'0" and 7'3" (redrawn, not clamped). The
  rare outliers pay for it: very small players lose finishing, interior defense and
  rebounding; very tall ones lose athleticism and perimeter defense, get hurt 12% more often
  and wear 10% faster per inch over 7'3".
- **Assists:** per-36 assists base 3.5 (was 3.2), +0.23 per playmaking point over the level
  (was 0.2), cap 13. The best playmakers now post 8-9 a game.
- **Championships:** the final page lists every title with the team, season and level (and
  the MVP of the final); the career card names the teams he won NBA titles with. Title awards
  get one clean label per level (an NCAA title no longer reads "conference tournament
  champion. National champion").
- **Trophy details:** the trophy cabinet sorts by legacy weight; tapping a banner shows what
  it is, the teams and seasons it was won with (back-to-back seasons as a range), its tier
  and legacy points, and its share of the legacy.
- **The rafters page:** when a team retires his number, retirement opens on its own page: the
  arena catwalk with a banner per team (team colour, number, name, years) and the case for
  each. The career page keeps a small version that reopens it; without one, it shows the team
  he came closest with and what was missing.
- **Focus changes are earned:** a breakthrough season (OVR or any single rating up at least
  5.5/10.5 by 17, 2.6/6.2 by 21, 1.2/3.6 by 25, 0.7/2.6 after; about the top quarter of
  seasons at every age) unlocks a focus change for that offseason only. About one season in
  four qualifies, instead of every offseason, which had made the game too easy.
- **Offseason moves:** focus, position, jersey number and retirement sit together in one
  panel right under the main card between seasons; an unlocked focus change glows and opens
  by itself, and a locked one says what it takes.
- **Career highs:** best single game in points, rebounds, assists, steals, blocks and threes,
  in the NBA and at any level (opponent, season, playoff round). New NBA highs show in the
  season summary.
- **Guide:** a header button explains every feature and where it lives (a dot marks it until
  first opened).
- **Fast break:** a fourth mode on the difficulty page: the standard game at a quick pace.
  One plan a season (the second half repeats it), the postseason simulated, no shop, at most
  one turning point at a time, single-button notices closed automatically, and the offseason
  only stops when there is a move worth making (an unlocked focus change, a size problem or
  age 30+). Only the big story pages show, and a one-line recap replaces the season summary.
  About 5.6 clicks a season instead of 15.3. Because the quick pace means fewer events and no
  shop, its head start was set by simulation (potential base 48): peaks average about 3 OVR
  above Standard. A switch next to the record turns the quick pace on or off in any mode.
- **Storylines:** nine turning points now unfold over several seasons, one chapter each
  offseason, with rolled outcomes: a family illness (morale over two or three years, ending
  in recovery or loss), a rebuilt jumper (worse for a season, then better), a nagging ankle
  (surgery or keep managing it), a veteran mentor, a two-year body change, fatherhood, a
  friend's investment, homesickness abroad and an NBA rivalry.
- **Standard:** potential mu back to 3.33 (the storylines had pulled the average peak down
  about 2 points).
- **Assists:** the efficiency knee (meant for shooting) had been flattening playmaking above
  85, so even a 99 passer averaged about 7. Assists now use the raw rating, plus basketball IQ
  and a little extra above 80 playmaking: about 6 a game at 80, 8 at 88, 9-10 at 92 with high
  IQ and 11.5 at the top (34 minutes).
- **Rating balance:** measured two ways: random play over 150 careers, and dedicated builds
  (focus on one rating plus the plan that trains it most, 50-60 careers each). Before: IQ
  and shooting were the easiest to max (44% and 38% of dedicated builds reached 99) and the
  shop sold 8.5 points of shooting and 7.5 of athleticism but 3.5 playmaking, 2.5 finishing
  and nothing for interior defense. Changes: plans (shooting 2.4x to 2.05x; playmaking PLY
  2.2x to 2.3x and IQ 2.0x to 1.5x; strength FIN 1.9x to 2.1x and REB 1.9x to 2.15x; defense
  PER 2.2x to 2.6x; off hand FIN 1.3x to 1.5x), shop items retargeted from shooting and
  athleticism toward finishing and defense, two new items (passing machine, contact pads),
  IQ trimmed in a few events, and three new events (pick-and-roll lab, touch around the rim,
  study the great passers). After: shooting, finishing, playmaking and IQ reach 99 in about
  37-43% of dedicated builds, the defensive ratings and rebounding about 28-30%.
  Athleticism stays the hardest (about 22%): it is mostly natural and it ages fastest.
- **Event director:** events are now weighted by fit (events/director.ts). It learns each
  event's effect on ratings by playing every choice on a throwaway copy with a neutral player,
  scores what the player needs (focus, archetype signature, position weights, weak spots,
  less for ratings near the cap), and multiplies the event's weight by 0.55x-2.2x, plus 1.35x
  for events tied to his road (abroad, college). Fitting events say why ("Fits your game ·
  Builds playmaking: your focus"). A playmaking point guard sees the pick-and-roll lab 6.9%
  of the time, a center 2.8%.
- **Peaks:** Standard about 73, Fast break about 76.
- **Basketball cultures** (career/culture.ts): every country belongs to one of eleven cultures
  that shape the years up to university or the pros, each with its own youth label, yearly
  national showcase, crossroads at 15-17 and doors at 18:
  - Europe: club academy, NextGen EuroLeague, first-team call-up, a EuroCup club or a loan
    to a second division (LEB Oro, Pro B, ABA League 2), or the NCAA.
  - France: INSEP in Paris at 15-16 (faster development), the Espoirs, then pro clubs.
  - Japan: high school with the Inter-High and Winter Cup, an optional B.League U18 team,
    then a Kanto university or a B.League contract (special designated player).
  - Korea: basketball high schools and the national championships, then Korea University /
    Yonsei or the KBL draft straight out of high school; military service by 28.
  - China: provincial sports school, the CBA club youth team at 15+, then the CBA or the
    CUBA university league.
  - Philippines: UAAP juniors, UAAP college, then the PBA or the Asian quota abroad.
  - Australia: state teams, the Centre of Excellence in Canberra, NBL Next Stars or college.
  - Canada: OSBA prep league, US prep schools, the NCAA or U SPORTS.
  - Africa: Basketball Without Borders, NBA Academy Africa, a US prep school or the BAL.
  - Latin America: club youth teams or NBA Academy Latin America; Spanish academies recruit
    the best Argentines and Brazilians at 15-16; the Liga Nacional, NBB or LNBP at home.
  US colleges see players who stay home in Asia much less (two stars off), and AAU, elite
  camps and prep-powerhouse transfers are only on the American road. Home-road offers are
  listed first. Sources: FIBA, EuroLeague, NBA, Basketball Australia, the CEBL and national
  press reports (see the conversation of round 7).
- **New leagues:** EuroCup, European second divisions, the Basketball Africa League, Latin
  American leagues and the PBA (pro), and five university leagues (Korea, Kanto, UAAP, CUBA,
  U SPORTS: no salary, still NBA-draft eligible). Youth and university leagues show their own
  names on the player card.
- **More overseas offers:** European clubs call from 9 OVR below their level (was 7) and more
  often; out-of-contract pros, undrafted players and "last chance" players always see at least
  one European offer plus their home league; NBA free agents below OVR 82 also hear from Europe
  (two offers below 76) and often Asia. Nearly every simulated career now sees a European offer.
- **Main and side plans:** with two plans in a half, the first counts 80% and the second 45%
  (both were 65%).
- **Team factors** (career/team.ts). Measured first: titles were already decided mostly by the
  roster (a top-3 roster won 21.6% of seasons, a bottom-half one 0.3%, and even a 92+ player
  only 2.7%), but most NBA seasons were spent on bottom-half rosters with no way out. Added:
  chemistry (+0.25 a season in a row with a team, up to +0.8), star gravity (NBA, OVR 84+, up
  to +1.0), one midseason swing in about a third of seasons (trade deadline, a teammate's
  injury, a team that clicks, a split locker room, a coaching change; about ±0.4-1.6),
  ring-chasing minimum offers from a top-4 contender for veterans (30+) and bench players
  (half the time), and trade requests for NBA players under contract (succeeds 10-60%, by OVR
  and reputation; failure costs coach trust). The season preview shows the roster's rank
  and the factors at work. A first version was far too strong (titles in 9.8% of seasons
  without trying, 41% when chasing); tuned to about 6% of seasons for a player who plays it
  out (about a quarter of careers win a ring) and about 20% for one who chases rings and
  requests trades.
- **Winning players:** defenders, floor generals and 3&D players add team strength beyond
  their OVR: ratings behind each trait that stand out above his own OVR count (0.10-0.14 per
  point, scaled by level, capped at +2.5, 1.6x in the playoffs, scaled by minutes). On
  top-8 rosters (110 careers per build): rim protector 33.1% titles a season vs post scorer
  25.3%, floor general 28.4% vs scoring guard 24.9%, 3&D wing 27.0% vs scoring wing 20.7%, at
  the same average peak.

## Round 8 (playtest feedback)

- **Milestones:** the strip no longer scrolls sideways. It wraps into pills, with a count
  (4/10) and the next milestone outlined.
- **Fast break, simpler:** one plan a season from five training groups (General = balanced,
  Weight room = strength, Shooting, Defense, IQ = film and reads); a tap picks it. No
  national team in fast break: no call-ups, no Olympics, World Cups or Asian Games (a Korean
  player in fast break can only serve through Sangmu, not be exempted). Losing grind and the
  second plan made fast break slower than Regular guy (72.7 against 75.1), so its potential
  was raised (base 48 to 54) and growth to 1.12: mean peak 76.4 against 73.6 for Regular guy
  (300 smart careers each, same seeds), about +3 as before.
- **Shop:** 32 new items (92 in all), cheap ones especially, so a teenager's shop varies. Each
  summer shows six: five he can afford, drawn at random (items under 0.2% of his bank and items
  he already bought are weighted down), and one to save up for. Before, the stock was mostly
  the three priciest affordable items, so the same list came back every summer.
- **Draft night:** the commissioner's-handshake button sits above the draft board.
- **Built in a lab (new mode):** fast break, but the player builds the ratings. Each half's
  growth is computed as usual, but with one headroom for the whole player (his OVR against his
  potential, so leaving a rating low earns nothing extra) and no focus stats, and it is paid out
  as credits (LAB.rate 0.85). Anything an event, storyline or item would have raised is paid out
  as credits too; minuses still land where the event says, and aging, injuries and setbacks
  take ratings away as everywhere else. A point costs 1 credit, 1.5 from 80 and 2 from 90. The
  player picks his full-grown height (5'9" to 7'6"; outside 6'0"-7'3" the usual penalties
  apply). Plans are about effort (Steady, Grind, Recovery, Spotlight, Team first) since the
  ratings are his to choose. Spending well is worth a lot, so its potential is a little below
  fast break's (base 51): an OVR-minded build peaks at 77.6 on average.
- **Names:** the first creation page is "Mode", not "Difficulty", and Standard is now
  "Regular guy" (the internal key stays `standard`, so saved games still load).

## Round 9 (playtest feedback)

- **Starting five (NBA, first option only):** once nobody on his roster is better than him (or
  he was the key player last season), he can recruit up to two starters a summer (three asks)
  from a six-player scouting board of players on other teams. His weakest starter goes the
  other way, plus bench salary when needed. Salaries follow the cap (`STARTERS_RECRUIT`):
  under it a team absorbs salary outright; over it, incoming salary must be within 125% of
  outgoing, as in a real NBA trade. Generated payrolls run 40-97% of the cap, so contenders are
  usually capped out. A 10% pay cut (up to 30%, lasting the contract) frees room and adds 7
  points of interest per step. Interest: 0.45 + 0.35 x (how much better his roster is) + 0.03
  per OVR over 80, +0.10 for players 30+, -0.15 for anyone better than him. A first option on a
  bad team can still sell the vision; replacing a 74 starter with an 86 adds about 1.9 team
  strength (top-five weights are 1 each, sum 6.2).
- **League storylines (every level):** a superteam (NBA, 55% of seasons: two stars from
  bottom-half teams really move to a contender), an underdog (+2 strength for the season), his
  rival (whoever ended his last season, else the best team in his conference; head-to-head kept),
  a dynasty (the defending champion), a last dance (an old contender) and a tank job (-1.5).
  Midseason records, and a verdict after the postseason. A "superteam calls" event can bring
  a sixth-man offer from it in free agency.
- **Finals drama:** every title game and every lost final ends with its last minutes play by
  play, built to land exactly on the real score: a close game (3 or fewer) trades the lead and
  ends at the buzzer, a middle margin has a comeback that falls short and a dagger, a blowout
  gets its run. Blocks and steals in crunch time. Skip any time. Postseason games now come down
  to 1-4 points 40% of the time (cosmetic: the winner does not change).
- **Text bracket:** every non-NBA postseason (college, Europe, G League, high school, leagues
  abroad) gets a bracket laid out as a tree in plain text, from the last 16 on.
- **Content:** 14 new events (rival games, the superteam's call, summer league, pro-am,
  mentoring a rookie, betting on yourself, grades, the no-call, a new diet and more), 5 new
  storylines (shoe deal, foundation, little brother, anxiety, the coach who believed) and 24
  more shop items (116 in all).
- **Scouts' call on each move:** High, Moderate or Low with one vague line (round 9 follow-up),
  so the player knows a good move from a bad one without seeing numbers. It scores the real
  change in team strength after the swap (depth included), minus 0.45 for a player 32+, plus 0.2
  for 25 or younger, minus 0.35 if the five would have no big, minus 0.25 for three at one
  position, minus 0.3 for a player paid over 28% of the cap who adds little. High from 1.9,
  Moderate from 0.85: over 216 board entries in 12 star careers, 35% High, 29% Moderate,
  37% Low (each board has two stars, who are usually High but Unlikely to come).

## Round 10: mini-games

Reached from the start page and from the bottom of Home (a career in progress is untouched).

- **Front Office:** six seasons running a franchise in the career's simulated NBA (same world
  code). Draft: 100-prospect class, the other 29 teams pick off the consensus board; 8 scouting
  points a draft narrow the ranges (current level sd 6/3.5/2/1, ceiling sd 9/5.5/3/1.5) and
  reveal strengths and weaknesses, work ethic (the real hidden development factor) and medicals
  (8% red flags really develop at 60% speed and lose 4 points of ceiling). Market: three trade
  offers a summer (value = (OVR - 66 + upside)^2 x an age factor; salaries fit the cap or 125%),
  overseas signings (EuroLeague and leagues abroad, OVR around 70-72 with an occasional find,
  fuzzy until scouted) by cap room, the mid-level exception (7% of the cap, once a season) or the
  minimum; releases leave dead money. Game plan: four identities with a fit read from the roster
  (up to +1.6 team strength, down to -1). Two seasons of grace, then two missed postseasons in a
  row gets you fired. A plain bot (no smart trades) won no titles in 6 runs; a careful player can.
- **Three-point contest:** five racks, 60 seconds, money balls worth 2, a money-ball rack of your
  choice (34 max). Stop a sweeping meter in the green zone (width 0.07 + 0.0011 x skill of the
  meter, narrowing 12% by the last ball); the bright middle is a swish, the edge can rim out. Your
  career player can shoot (skill from shooting and range) or pick a famous shooter. Simulated
  shooters average 21.5-23 points; top three go to the final.
- **Legends showdown:** every franchise with its all-time starting five (150 different players,
  each on the team of his peak; LeBron is a Cavalier). Ratings are the five's average plus
  balance, squeezed toward 90 by 0.65 so the gaps are not absolute. A 29-game season (everyone
  plays everyone once), eight a conference, four best-of-seven rounds. Before each series the
  scouts describe the opponent's style; the right plan is worth +2.2, the wrong one -0.8. Title
  odds in 300 runs with the right plans: Lakers 58%, Celtics 37%, Bulls 6%, Heat 5%, Grizzlies
  under 1%. Franchises are labeled Favorite, Contender, Dark horse and Long shot.
- Fixed in passing: the scouts' recommendation badge reused the `.rec` class, which also styles
  the season-summary record, so the big win-loss number had gone white on white.

## Round 11

- **Difficulty is back on the first page:** Regular guy, Reality hits hard, Shoot for the stars.
  Fast break is no longer a mode but a switch in the game, in any difficulty; flipping it
  rebuilds a plan decision already on screen (five groups and one tap, or the two-plan picker),
  and the shop, national team and extra turning points follow the switch. To keep its small head
  start it grows the player 1.3x while it is on (Regular guy, 200 smart careers: 74.1 without;
  75.9 at 1.2x and 77.9 at 1.35x, so 1.3x is about +3). Old saves in the fast mode load as Regular
  guy with the switch on.
- **Built in a lab** moved to the mini-games: the same career, started from the hub (it ends a
  career in progress, after a second tap).
- **Three-point contest, livelier:** every ball has its own pace (0.8-1.35x) and its own sweet
  spot (anywhere from 32% to 68% of the meter); 22% of balls get a sudden surge (1.8-2.5x for a
  quarter to half a second); three makes in a row sets you on fire (a 35% wider green until a
  miss); money balls have a 15% narrower green; the last ten seconds run 18% faster.
- **Front Office trades, easier and readable:** a team now takes a deal worth 88% of what it
  gives up (was 102%), stars (88+) cost 35% more. Tapping any player opens his eight ratings (his
  archetype's shape shifted to his OVR) and an outlook. Each target has a suggested offer: the
  cheapest one-to-three-player package that works (over six test runs, 40 of 48 targets had one
  and most suggested offers were accepted). The market is three tabs (trades, abroad, roster) of
  one-line rows that open into a card.
- **Legends showdown, with your super-rookie:** pick a franchise, name a rookie and choose the
  legend he replaces; four development years (Shooting lab, Go get buckets, Film and reads,
  Weight room, Lockdown; the most-used becomes his identity) take him from about 72 toward a
  ceiling of 88-99 (median 92; breakthrough and setback years). He counts three times in the team
  rating and brings his own form (sd 2) to every series; his series line is shown and he can be
  series MVP. Title odds with the right plans and a scorer rookie in place of the weakest legend
  (300 runs): Lakers 40%, Celtics 25%, Bulls 15%, Heat 8%, Grizzlies and Clippers about 1%.
- **Mini-game bonuses for the career:** with a career in progress, a finished mini-game can be
  turned into a small boost for the career player, once per mini-game per career season (so at
  most about 3.5 rating points a season across all three). Three-point contest: shooting +0.3 /
  0.6 / 1 / 1.5 for 13 / 18 / 23 / 27+ points, range +1 from 23, reputation +3 for the winner;
  half when shooting as a legend instead of your own player. Legends showdown: basketball IQ +1
  for the title, +0.7 for the Finals, +0.4 for the conference finals, +0.15 otherwise. Front
  Office: IQ up to +1 from titles and playoff runs, playmaking +0.4 with a title; nothing if fired.
  A lab career gets the same amount as credits.
- **Simple text:** a switch next to Fast break. It hides descriptions, flavour, fan reactions,
  helper notes and choice details, and cuts decision texts to their first sentence; choices keep
  their names and risk tags, results keep their chips. A display preference stored in the browser
  (not the save). On a midseason screen with an event the page got about 20% shorter.
- **MVP race:** in the NBA, once the player is at MVP level (OVR 92+) or in the top five, Home
  shows the race in the side column: the top five (and his place if lower) with stat lines,
  team records and a bar for how close each is, plus a word on his chances (neck and neck within
  1 point of voting score, within reach within 3, a long way back within 6). During the season it
  is live: the same score the voters use (value per game plus team record) on the season so far,
  with the other players' lines projected from the stat model for the games their team has played
  (no random draws, so it does not change the season). Between seasons it shows the final voting.

## Round 12 (playtest feedback)

- **Front Office season reel:** the season no longer jumps straight to the result. The record
  counts up game by game (a seeded order of the final wins and losses, 35 ms a game) with a
  streak strip of the last 12, a line at the All-Star break, then each playoff series one at a
  time. Skip any time.
- **Starting five, clearer and easier:** the recruit card shows where the team stands ("Your team
  now: 9th of 30, playoff team") and, after a move, the change this summer (rank and team
  strength before and after, who joined, and the new outlook). Interest is about 5 points higher
  at every level, so a first option on a decent team usually has a willing target.
- **Positions in the five:** a recruit replaces the weakest starter in his position group (guards
  PG/SG, forwards SF/PF, bigs C) when there is one, otherwise the weakest starter. The new five may
  have at most three guards, three forwards and two centers; a move that breaks that shows "No fit"
  and the reason ("Too many forwards in the five"). Swaps across groups still work while the five
  stays within those limits.
- **End page:** a "NBA teams" section lists every NBA team he played for, with years, seasons,
  points, rebounds and assists per game and any titles there.
- **Mini-games exit:** "Back to career" (or "Exit" with no career) sits at the top right of every
  mini-game screen; "All games" goes back to the list.
- **Built in a lab, the mini-game:** no longer a career. Pick a position, a height and a name, then
  ten seasons (ages 19-28) on one screen each: the summer pays credits (12 at 19 down to 3 at 28,
  plus or minus 15%), and 45% of summers have a twist (a breakthrough summer, an injury, a mentor,
  a bad summer, an elite camp). Each tap adds 3 to a rating for the career lab's price (1 credit,
  1.5 from 80, 2 from 90); "Spread it evenly" is the lazy option. The season plays from OVR: a stat
  line, a record and awards (All-Star from about 79, All-NBA from 86, MVP from 90 on a 50-win
  team, titles, Defensive Player of the Year), then a grade. Peaks over 300 runs per position:
  best-value spending 86-89, random taps 83-84, spread evenly 80-85. The old lab career mode is
  kept for existing saves.
- **Dunk contest (new mini-game):** four dunkers (you and three of twelve greats), two dunks each,
  the top two go to a two-dunk final. Each dunk is built from a takeoff (standing, running, from the
  free-throw line), one or two moves (two-hand, tomahawk, reverse, windmill, 360, between the legs,
  behind the back) and a prop (off the glass, a lob, over a teammate); difficulty is the sum of the
  parts (0-13). Every part with difficulty is one timing tap, plus the finish. The green is
  0.30 wide, +0.006 per point of athleticism above 80, -0.035 per point of the part's difficulty
  (at least 0.08), and the marker sweeps faster for harder dunks. A missed tap fails the attempt;
  three attempts, -2.5 for each failed one, three misses score about 30. Judges: 30 + 1.6 per
  difficulty point + up to 7 for clean timing + 0.6 per part not shown yet (up to 2), split over
  five judges with a little noise, 6-10 each. The others are simulated around their skill (43.5-48
  a dunk, sd 2.6, 6% chance of a miss-filled 30). With a career, you dunk as your player and his
  athleticism sets the green. Ideas for later: a dunker card (height, hops, flair), a crowd meter
  that adds to the judges' score, celebrity props, an alley-oop partner chosen from your career
  teammates.
- **Mini-game claims:** up to four claims a season across all mini-games (was one per game), each
  worth less than the last: 100%, 75%, 55%, 40%. At most about 4 rating points a season, the same
  ballpark as before with five games instead of three. Dunk contest: athleticism +0.3 / 0.6 / 1 /
  1.5 for a best dunk of 35 / 40 / 44 / 48+ (as of round 12b), finishing half that, reputation +3 for the winner.
  Built in a lab: basketball IQ +0.15 / 0.4 / 0.7 / 1 for a peak under 85 / 85 / 90 / 95.
- **Legacy:** the Hall of Fame (28 points on the first ballot, 20 otherwise) and the rafters
  (12 a team, up to three) are worth twice as much: they happen once. New league titles (tier C,
  1.5 points each): assists, rebounds, steals and blocks per game, decided like the scoring title
  among qualified NBA players; each adds a little reputation and shows as a race in the season's
  award voting.
- **To do:** a box at the top of Home's left column: "Now" (the decision waiting, or the next
  step), then queued decisions and anything worth a look (a focus change unlocked, starting-five
  recruits, a height mismatch, lab credits, programs). Body text is a size larger (18.5 px).
- **Identity page:** three cards: who you are (name, number), where you start (a grid of twelve
  countries with each one's road to the pros, "Surprise me", the rest in a list, and the country's
  notes), and on the court (position, hand).
- **Regular guy balance (the top end was too easy to reach):** diagnostics on 400 careers per
  play style (seeds 960000+) showed that high-potential careers nearly always reach their
  ceiling: careers with potential 85-90 peaked at 87.9 on average, so the top end was set almost
  entirely by how many players rolled a high potential. Two changes:
  1. Potential is narrower: base 37, mu 3.44, sigma 0.40 (was base 40, mu 3.33, sigma 0.66). The
     median is about the same (68 vs 68), the 90th percentile drops from about 95 to 89.
  2. The elite climb: above OVR 85 each half's growth shrinks by 7% per point (0.65x at 90, at
     least 0.4x), Regular guy only. The last steps to the top take real seasons.
  Smart play, before → after: mean peak 75.2 → 74.5; peak 90+ 19.0% → 11.5%; 95+ 10.5% → 3.3%;
  98+ 3.5% → 0.3%; seasons at 90+ per career 1.68 → 0.84; MVP 14.8% → 7.0%; Hall of Fame
  25.5% → 18.8%; All-Star 37.5% → 32.3%; reached the NBA 71.8% → 76.8%; title 37.8% → 33.5%.
  Random play: mean 70.2 → 69.3; 90+ 11.5% → 5.5%; MVP 11.3% → 4.8%; HOF 20.0% → 12.8%.
  Trials on the way: sigma 0.52 alone gave 90+ 14.5%; sigma 0.44 13.8%; plus a 5% elite climb
  12.8%; sigma 0.40 with a 7% climb 11.5% but 84.5% reached the NBA (too few busts), fixed by the
  lower base. Harness targets moved with it (smart MVP 4-11%, HOF 13-25%, All-Star 26-40%).
- **Dunk contest, round 12b ("a little too hard; instead make the boundaries high for a 9 and
  10"):** landing is easier: the green is 0.38 wide (was 0.30), -0.03 per difficulty point (was
  -0.035), at least 0.16 (was 0.08), and the marker sweeps 1300 ms (-30 per difficulty point).
  The judges are stricter at the top: each card comes from the dunk's raw score plus the judge's
  own taste (sd 1.6), with 7 from 34, 8 from 40, 9 from 46 and 10 from 52. Raw score: 30 + 1.2
  per difficulty point (was 1.6) + up to 10 for clean timing (was 7) + freshness, so a 10 needs a
  hard dunk landed cleanly. Average totals at athleticism 85 (timing quality 0.5 / 0.7 / 0.9):
  a standing two-hand slam 34.9 / 36.1 / 38.4; a running windmill 37.2 / 39.4 / 40.3; a running
  360 windmill off a lob 41.7 / 44.1 / 45.1; the same from the free-throw line 44.4 / 45.4 /
  47.4; free-throw line, 360 between the legs over a teammate 46.7 / 49.0 / 49.9. The others'
  skill moved to the same raw scale (46-50.5): Vince Carter averages 45.2 a dunk. The career
  bonus thresholds moved with it (athleticism +1.5 for a best dunk of 48+, +1 for 44+). The pick
  buttons now show what is chosen (a filled tile with a check mark), and a "Your dunk" card spells
  out the takeoff, moves and prop, on the build screen and while dunking.
- **Round 12b, playtest follow-ups:**
  - Mini-game claims: two a season (was four), the first in full and the second at half value.
  - Dunk contest: the pick buttons showed no selection (they set a class the segmented control
    does not style); every part is now a tile that fills in with a check mark, and a "Your dunk"
    card spells out takeoff, moves and prop. The other dunkers are 1 point lower (45-49.5 raw).
  - Built in a lab: the rating rows overlapped on wide screens (a 200 px card was too narrow for
    "Rebounding" plus the number and the button); cards are at least 290 px, names truncate
    instead of overlapping, and a maxed rating says Max.
  - Legends showdown, neater: teams in one-line rows under their tier, setup as its own step
    (tap the legend your rookie replaces), development with a growth meter and year dots, the
    playoff matchup side by side with the opponent's five folded away, and run / bracket /
    standings in tabs. Every step fades in (0.32 s); folds and meters animate; all of it is off
    with reduced motion.
  - Front Office: four seasons (was six); fired after two missed postseasons in a row from the
    third season. Grades rescaled (B from 5 points, C from 2.5). Trade suggestions are now ranked
    by what they do to your team (team strength, shown as league rank), never include a player
    better than the one you get, and only offer deals the other side is sure to take (worth at
    least accept / 0.9 = 0.978 of him, so the day-to-day mood cannot sink it). A "Best deals for
    you" list shows up to three that move you up the league; each target row says "out of reach"
    when nothing works. Over 48 test franchises: 34 had at least one, jumps of 1-5 places, mostly
    two-player packages, and all 34 top deals were accepted. The game plan screen puts the plans
    first (best fit first) and folds the roster into a rotation strip.
- **Round 12c, stronger mini-game rewards** ("they take time, so players won't do them often"):
  about three times the round 10 amounts, spread over two ratings. Top results: three-point
  contest (27+) shooting +4, IQ +1, range +3, reputation +5 for the winner; dunk contest (48+)
  athleticism +4, finishing +2, reputation +5; legends title IQ +3, playmaking +1.5; Front
  Office (title) IQ up to +3, playmaking +1.5; Built in a lab (peak 95) IQ +3, perimeter D +1.5.
  For a PF or C the playmaking part goes to interior D and the perimeter part to rebounding.
  In OVR, a top result is worth: threes SG 1.17 / PG 0.88 / C 0.29; dunk 0.68-0.90 at every
  position; a legends title PG 0.87 / C 0.63 with the big-man swap. Still two claims a season
  (100%, 50%), so at most about 1.5-1.8 OVR a season from mini-games. To keep them from being a
  road to 99, a rating of 85+ gets 60% of the bonus and 92+ gets 35%. Lab careers get the full
  amount as credits.
- **Round 12d:** Front Office is three seasons (was four). Missing the playoffs in seasons 2 and 3
  means fired (an F). Grades: two titles A+, one title A, B from 4 points, C from 2.

## Round 13

- **Cleanup first:** removed the old lab-career entry on the create page (nothing opened it
  since the lab became a mini-game; the engine mode stays for old saves), six unused helpers and
  twelve unused CSS rules (about 90 lines). The store got one generic `mutate` action so new
  features do not each need a copy-pasted store action.
- **Offseason moves bug:** in fast break the game ran straight through the offseason unless a
  focus change, a recruit board, a size problem or age 30+ made it stop, so position, number,
  trade and retire were out of reach in most summers. It now stops once in every offseason after
  high school. Locked tiles are striped, greyed and tagged "Locked", with the reason; every card
  opens from its tile (only a size warning opens by itself).
- **Plans:** Speed and agility (athleticism 2.3x, perimeter D 1.5x, finishing 1.2x, injury 1.1x)
  and Learn from a vet (basketball IQ 2.2x, perimeter D 1.2x, shooting 1.1x, injury 0.9x, trust
  and morale +2) make twelve. A single plan moves every effect 10% further from neutral and grows
  3% faster (focused work); two plans blend as before (main 80%, side 45%).
- **Team style** (NBA, once he started for the team last season; one change a summer, reset on a
  team change): Run and gun (+1.0 regular season, -0.3 playoffs), Defense first (+0.3 / +1.1),
  Ball movement (+0.6 / +0.5), Inside out (+0.6 / +0.4), Run it through you (by his OVR: +0.15
  per point above 82, up to ±1.8, usage x1.12). Fit = the style's ratings against his OVR,
  -1 to +1: it adds up to ±0.5 team strength, ±5% to his shooting and ±6% to his usage.
- **Around the league, more impact:** 40% of seasons his own team is a story: Defense travels
  (+0.3 / playoffs +1.2), A chip on the shoulder (after being knocked out; +0.8 / +0.6, morale
  +4), Seven seconds or less (+1.2 / -0.3), Brotherhood (2+ seasons together; +0.9 / +0.6),
  Showtime (NBA, OVR 85+; +0.6 / +0.2, reputation +3 with a playoff berth). Call it: before the
  second half, up to three yes-or-no calls on how stories end; right calls are worth reputation +2.
  Knocking the rival out of the playoffs: reputation +3, morale +5.
- **Trade requests with a choice:** any better team (the old odds), a contender (top five, x0.85),
  the champions (x0.6), the rival (x0.55; on failure trust -16 and morale -7; on success
  reputation +4) or a team that needs you (weaker roster, would make him its first option,
  x1.35, trust 60). Each shows its odds (High from 45%, Moderate from 25%) and risk.
- **Guide mode:** a switch in the guide. The next thing to do (the decision or button, or the
  offseason moves when something there is waiting) gets a glowing outline and a short note.
- **Front Office draft advice:** the scouts' top three among available prospects, from what the
  reports show: 35% current level, 65% ceiling, +2 if the roster lacks a 76+ player at his
  position, gym rat +1.5, coasting -2, a red flag -4, unscouted -1, with the reasons listed.
- **Content:** ten events (the team style questioned, the media chasing your team's story, the
  tape of the game that ended your season, rest nights, mentoring a rookie, the last shot, and
  two storylines over two summers: a documentary crew, a youth camp back home) and fourteen shop
  items (film tablet, ball machine, cryotherapy, a private chef, a home gym, a podcast...).
- **Less scrolling on phones:** the two columns become one list in this order: to do, the main
  card, offseason moves, then the player card and the rest. On an offseason screen the main
  card moved from about 1,700 px down to 467 px, and the page from 8,024 px to 4,843 px. The
  recruit board and the storylines show the first three or four with a "show all".
- **Future plan (parked): a feedback page.** A published page cannot send email itself, and the
  owner's address must not be in the page or the repository. The workable design: the page
  stores each note in the artifact's private database (each player writes only their own
  document, only the owner reads them all, with an inbox for the owner), and a scheduled task
  on the owner's side reads new notes and forwards them by email. Note: viewers with view-only
  access cannot write to the database, so they would need Contributor access to send feedback.

## Round 14

- **Tabs on a computer:** the five tabs moved into the top bar (sticky), the phone keeps its
  bottom bar. A dot marks a tab whose content moved on since it was last opened (new games,
  a rating change, new records; `tabKey` in `ui/selectors.ts`).
- **Next step from any tab:** a button by the tabs plays the next step (or goes back to the
  choice waiting at Home), so the other pages never block the game.
- **Page banners:** every tab opens with a banner in team colours with its key numbers. Season:
  record, streak, last ten, a points-per-game chart, the log and standings side by side. Player:
  a ratings shape with the season's start dashed behind it, status, contract, profile, scouting.
  League: both conferences side by side, leaders, voting, record book. Records: a career
  headline, then the tables; the decision log shows the latest 12.
- **Settings in one menu:** theme, Fast break, playable playoff games (it was a button deep in
  the Player tab), Simple text, guide mode, New career. Fast break also stays one tap away in the
  top bar.
- **Autosave:** the career saves to the browser after every change (half a second later), one
  slot, a few hundred KB; the start page offers to continue it. "New career" in Settings clears it.
- **Keyboard:** Enter presses the main button (or an overlay's), 1-9 press the choices in the main
  card (numbered tags show on computers), H/S/P/L/R switch tabs.
- **Convenience:** the main button sticks to the bottom of the screen while a long card scrolls;
  to-do items jump to their spot and flash it; Home's centre column is just the game (mini-games
  and fan reactions moved to the side column, milestones under the player card).
- **Graphics slots:** `components/Art.tsx` (player portrait, team logo, banner court) with simple
  stand-ins; `docs/graphics-plan.md` lists the rest.
- **Fix:** the League tab showed the season the NBA world was built in, not the current one.
- **Regular guy balance** ("everything is a little inflated apart from Stars; Reality is fine; for
  Regular aim for -3 to -5 average peak, -5 to -7 points of MVP, -25 points of titles; casual can
  be the standard"). Measured with casual mini-game play (one claim a season), smart play:
  - Per-mode dials in `MODES` (missing = 1, so Reality and Stars are untouched): `mini` scales the
    rating part of a mini-game claim (Regular 0.7; reputation unchanged), `teamFx` scales the team
    factors around him (chemistry, star gravity, team style, his team's storyline; Regular 0.3),
    `ringChase` scales a contender's minimum-deal offer (Regular 0.25).
  - Potential base 37 to 33.
  - Before → after (400 careers, seeds 960000+): mean peak 79.18 → 75.11; MVP 16.0% → 10.0%;
    titles 49.6% → 26.5%; All-Star 53.2% → 36.3%; reached the NBA 92.4% → 78.8%; HOF 29.6% → 18.3%.
  - Without mini-games (250): mean 71.6 smart / 67.2 random, titles 23.6% / 9.6%, MVP 6.8% / 2.8%.
    Grinders (two top claims a season): mean 78.0, titles 40.0%, MVP 10.8%.
  - Titles barely moved with the potential alone (38-41%) or with the player's own impact on
    winning scaled down (no change); about half came as a non-key player and the most from 30+, so
    the team-factor and ring-chase dials do the work. Harness targets moved with it.

## Round 15

- **Controls and layout:** keys 0, - and = pick choices 10-12 (twelve plans fit the number row);
  F toggles Fast break, G toggles Guide mode; Enter leaves the shop (the leave button carries
  `data-enter`). Simple text sits next to Fast break in the top bar. The difficulty is always in
  view beside the game's name (a short form below 1280 px). Wide screens keep more margin (max
  1380-1440 px, 40 px gutters). Ratings sit above the status meters on the player card. Around
  the league folds to one line a story (remembered on the device). New career sits next to the
  card download at the top of the end page.
- **Master mode** (Settings, stored on the device): no recommendations anywhere: scouts' calls on
  recruits, the "Fits your game" tag on events, team-style fit labels and the best-first order,
  trade odds, Front Office draft advice and the recommendations panel, and Guide mode. Risk tags
  stay: they describe a choice, they do not recommend one.
- **OVR weights:** weight moved from shooting, finishing and athleticism to rebounding,
  playmaking and defense at every position (scoring now 0.36-0.47 of OVR, was 0.40-0.53). Per-rating
  growth: defense and rebounding x1.08, athleticism x1.1, shooting and IQ x0.95 (round 7 had
  measured these as the hardest and easiest to max). Award voting: rebounds 0.9 to 1.05, assists
  1.4 to 1.55, steals and blocks 2 to 2.3 next to points.
- **Coach trust and reputation:** trust adds to team chemistry ((trust - 55) x 0.015, within
  ±0.4, scaled by the mode's team dial, at least half), shown in the season preview. Reputation:
  salaries x(1 + rep/250) (was /400), trade odds +rep/140 (was /200), free-agent suitors +0.03
  per point (was 0.02). Team first lifts the team 0.7 in his games (was 0.6), and its text says so.
- **Starting five:** one player per position (the best teammate at each of the other four, then
  the best of the same group, then anyone). A recruit replaces the starter at his position;
  players at his own position are not on the board. Every ask is logged on the card (yes or no,
  who replaced whom, who left, team strength before and after). Fixed a hook-order bug in the card.
- **Trade requests:** the answer stays on the card (`tradeResult`): the new team and its roster
  rank, or no deal and its cost. The tile says "Traded to ..." or "no deal".
- **Ring chaser** (career/ringChase.ts): at the retirement prompt or the last-chance offers, a
  former NBA player (OVR 66+, 38 or younger) can take a specialist role on a contender: floor
  spacer (shooting +6, IQ +1, range +8; finishing, playmaking, rebounding down), defensive
  specialist (perimeter D +5, interior D +4, athleticism +1; shooting, finishing, playmaking
  down), veteran playmaker (playmaking +5, IQ +5; finishing, rebounding, athleticism down) or
  rebounding big. The best matching rating picks the role. The archetype becomes the role and
  stays (the summer re-read skips him); two contenders from the top six offer a minimum deal.
- **Drama:** title, gold, silver, bronze, lost-final and early-exit moments carry a `mood`. Once
  any game reel ends: confetti and a "Champions"/"Gold" stamp, a silver or bronze medal swinging
  in, or the screen draining of colour under a red "So close"/"Eliminated" stamp. Olympic and
  World Cup results get their own titles and lines. Nothing moves with reduced motion.
- **Mini-games in a career unlock by rating** and stay open (`miniOpen`): three-point contest at
  shooting 85, dunk contest at athleticism 85, Front Office at basketball IQ 85, Built in a lab at
  OVR 82, Legends showdown at OVR 90. A toast announces each. Rewards x1.6; the taper starts at
  90 (0.7) and 95 (0.45) instead of 85/92. From the start page every game is free. New lobby
  (cards with progress bars) and a common end panel with a big Back to career button.
- **Legends showdown:** harder (right plan +1.4, was +2.2; wrong plan -1.0, was -0.8; your player
  counts twice, was three times; form sd 2.5). Every franchise has an identity
  (content/franchiseIdentity.ts) and the roles it wants. Chemistry (within ±1.5 team rating): +0.8 for a wanted
  role, +0.5 for a role nobody else fills, -0.7 when two others already play it, -0.5 out of
  position, -0.4 next to a 97+ scorer or creator when he is one too. With a career at OVR 90
  his own player joins (his role read from his ratings); without one, the rookie as before.
- **Dunk contest:** rule tiles (2 dunks a round, 3 attempts a dunk, top 2 to the final) and a
  status strip with dunk and attempt pips.
- **Built in a lab (mini-game), easier:** start 60 (was 58), credits 14 down to 4 (was 12 to 3),
  lower award bars (All-Star 77, All-NBA 84, MVP 89 on 48 wins) and grades (A+ 26, A 15, B 7, C 2).
  Peaks over 300 runs: best value 90.7 (was 86-89), random taps 88.2 (83-84), spread 87.7 (80-85).
- **Front Office:** the first draft recommendation had the class `top`, which is also the page
  header's: it took the header's sticky position, background and negative margins and covered
  the "Scouts' board" label. Renamed. A "Your front office recommends" panel lists the best
  trades and up to two signings (cap-legal, from the middle of the scouted range, with reasons).
- **Content:** ten events (players-only meeting, the agent's raise, a court with your name, the
  new teammate, twelve minutes a night for a ring chaser, body choice, boxing, the glass, the
  passing clinic, everyone's best shot). The career card wears his main team's colour, draws his
  jersey and number, and adds tiles for NBA seasons, points, titles, MVPs and All-Star picks.
- **Manual:** cards under large headers (tap to expand), a quick start, and Guide mode hints for
  each kind of decision. `CLAUDE.md` records the owner's standing rules (guide, dead code,
  project summary at the end of every request).
- **Balance** ("the balance is good, base on this"; Hall of Fame harder). Re-tuned after the
  changes above, casual mini-game play, smart choices:
  - Regular guy: potential base 37 (was 33), mini-game dial 0.4, ring-chase dial 0.1. 400
    careers: mean peak 74.72 (approved 75.11), NBA 80.0% (78.8%), All-Star 37.3% (36.3%), MVP 13.3%
    (10.0%), titles 33.0% (26.5%), Hall of Fame 14.0% (18.3%). Titles and MVPs stay above the
    approved numbers: with no mini-games at all they are 31.0% and 9.8%, and the team dials,
    the trust bonus, the winning-player edge and ring chasing each moved titles by 1-3 points at
    most. The cause is structural (rebounding, playmaking and defense now count for more, and
    those are the ratings behind the winning-player edge); left for the owner to decide.
  - Reality hits hard: potential base 51 (was 45), since the unlocks took away most of its
    mini-game bonus. 250 careers: mean 67.9 (approved 68.8), NBA 60.0% (54.4%).
  - Shoot for the stars: unchanged. 200 careers: mean 93.1 (93.5), MVP 78.5% (84.4%), Hall of
    Fame 79.0% (98.0%).
  - Hall of Fame: legacy 100 (was 45), first ballot 160 (was 80). The legacy score is very
    spread (Regular: median 7, 80th percentile about 45-50, 88th about 105).
  - Scouting odds refit to 450 careers: NBA 64.6/1.8, All-Star 77.7/1.65, All-NBA 83.1/1.35,
    All-NBA 1st 87.0/2.05, Hall of Fame 90.1/1.15, MVP 90.5/1.15 (logistic centre/scale on the
    peak).

## Round 16

- **Random picks on the start page:** a Random button next to position and dominant hand, and
  one on the archetype step. Each picks at once and says so ("picked at random", or "Rolled:
  left-handed"). Position and archetype never repeat the last pick, so a tap always changes
  something; the hand rolls real-world odds (12% left, the same as the Random button at the top,
  which now marks all three as random). Choosing by hand clears the mark.
- **Shop:** Enter always leaves the shop, even when an item's button still has focus after a
  purchase (the browser would otherwise press that button again). The leave button shows the key
  and takes no number tag.
- **Manual:** a Starting a career section.
- **Master mode overflow:** the long difficulty label (plus " · Master") pushed the top bar past
  the window, so the page scrolled sideways. The top bar shows short labels below 1600px, puts
  the tabs on a second row at 900–1339px and wraps below 900px (tablets used to keep one row).
  Checked at 12 widths from 360 to 1920px, Master on and off.
- **M** toggles Master mode, like F and G.
- **Enter during a final reel** presses "Skip to the final buzzer" (marked `data-skip`; the half
  simulation's Skip too) instead of Continue, and Continue only takes focus once the reel has
  ended. A second Enter continues, so an early Enter never skips the result.

## Round 17: graphics

- **The version without graphics** is kept on the `pre-graphics` branch and its own published
  page.
- **Logos:** the real logos are trademarks, so each NBA team gets its own crest: a motif in its
  real colours (a shamrock, a bridge, a bull's horns...), not a copy. Jerseys follow the real
  home, road and city colours and wordmarks. Other leagues get simpler kits and crests made from
  the team colour.
- **Players:** the first two sprites (a lit skeleton, then a 1.5x version) did not come close to
  the owner's hand-drawn references, and a generator that has to draw any player in any kit and
  pose cannot match pixels placed by an artist. The owner's fallback was "go cute like the last
  one" (the Tiny Hoopers style), so the players are drawn that way: a big head on a small body,
  flat colours with one shade, a dark outline. The five poses (PG low dribble, SG dribble, SF
  jumper follow-through, PF ball on the hip, C one-hand dunk), a portrait crop, the face, 13 hair
  styles, 7 facial hair styles and the gear (headband, goggles, unibrow, sleeve, wristband) are
  pixel maps drawn by hand, one letter per pixel, and painted in the kit. The sprite and the
  portrait share one look, so a legend is the same person everywhere.
- **Looks:** legends take theirs from `content/legendLooks.ts` (about 155, from each player's
  well-known look at his peak with that franchise). Everyone else gets one from a hash of the
  name, so a career keeps its face.
- **Story scenes:** events carry no category, so the scene is picked from the title by keyword
  (nine places plus draft, title, award and medal nights); story pages use their kind. On a
  court the player plays his position's pose, off it he stands, and on a title or medal night he
  throws a fist up.
- **Contests:** scenes that animate the ball themselves use the pose with its ball taken out
  (`noBall`), so there is never a second ball in the player's hand.
- **Country backgrounds:** outside the United States the page banner shows where he plays: his
  country at a youth academy (Spain once he joins a Spanish academy, nothing once he moves to a
  US prep school), the club's country in Europe, the league's country abroad, or a region for
  the mixed leagues (an old town for the EuroCup, a savannah for the BAL, palms and mountains for
  the Americas). 25 countries and 3 regions, each a landmark and a landscape in silhouette,
  pixelated like the venues. It replaces the venue's roof and back wall but keeps the stands and
  the floor, so it still reads as a game in that city.
- **Team touches:** the banner's top edge has the team colour with the kit's trim colour under
  it, and the Home card carries the team crest as a faint watermark (hidden on phones, where it
  would sit under the text).
- **Court setting:** Classic, Hardwood or Streetball, in Settings, saved on the device. Only the
  page background changes (planks or speckled asphalt, light and dark versions); cards keep
  their surfaces, so every text contrast stays as it was.
- **Balance:** no engine change this round, so no harness run.

## Round 18

- **Position and archetype art:** the owner wanted the start page in the detailed style of the
  hand-drawn references (real proportions, about 30 by 45 pixels, shaded by hand). The game's own
  sprites stay cute, since they must be generated for any player in any kit; the start page only
  needs a fixed set, so it has ten hand-drawn players (`art/Hero.tsx`), one letter per pixel with
  four skin tones and four jersey tones: low dribble, drive, jumper, ball on the hip, dunk, pass,
  defensive stance, rebound, block and hook. Each position card shows one, and each archetype the
  action it is known for, never the same twice within a position. Cards show a dark silhouette
  (a CSS brightness filter) until picked, then the player steps into colour.
- **Numbers:** every position card used the player's own number (so all showed 24); each now has
  its model player's number (PG 3, SG 11, SF 23, PF 34, C 50, the same five as the start-page
  lineup), and archetypes a number from their name.
- **Difficulty icons:** a cap for Regular guy, a cracked brick wall for Reality hits hard, a
  shooting star for Shoot for the stars, on the cards and the difficulty badge.
- **Front Office:** team crests on the franchise list, the header, trade offers, playoff series
  and the bracket (the bracket is shared, so the career's bracket has them too); an icon for each
  game plan (pace, defense, the star, depth as a substitution).
- **Three-point contest:** the shooter stood on or inside the arc. He now stands outside it at
  every rack: 14% beyond the arc's ellipse, a step to the side of the rack (toward the baseline on
  the wings and up top, down the sideline in the corners).
- **Built in a lab:** the rating icons on every stat.
- **Shop:** items that share an icon looked the same. Each item has a colourway from its id (the
  icon's colour families rotate round a ring of six) and a tile in that colour.

## Round 19

- **Team stories:** each kind of story has a pixel mark (a crown for a dynasty, stars for a
  superteam, a rising arrow for an underdog, a bolt for a rival, a sinking arrow for a tank job,
  a sunset for a last dance, laurels for the favourite; your own team's stories reuse the plan
  and style icons). Folded, the mark leads each line; unfolded, each story opens with a banner of
  the team's crest and the mark, and a rivalry puts your crest against theirs.
- **Rim cam:** the owner asked for the ball, not the player: a buzzer beater with the clock
  behind, the rim and the glass, the ball swishing in. `art/PlayCam.tsx` is a close shot of the
  glass (game clock in LED digits above it, the crowd dimmed behind) where the ball does what
  the play-by-play says, read from its tag and words: a three arcing in, a jumper, a layup off
  the glass, a dunk that shakes the rim and whips the net, a free throw, a rim-out, a block
  swatted away by a hand, a steal poked loose, and on a buzzer beater the clock running out to
  0.0 as the ball drops while the glass's LED strip flashes red. It plays in the finals' crunch
  time (one play at a time) and in title games (his own buckets; plays that come faster than the
  animation wait, and only the latest is shown).
- **Last shot in playable games:** the clutch possession now leaves a line in the game's recent
  list ("Last shot: your drive is blocked at the rim!"), which the next screen replays on the rim
  cam. It is written from the outcome the engine already rolled, so no result changes.
- **Rim cam taken out (for now):** the owner did not like the game animations and will give
  detailed instructions before they come back. The camera (`art/PlayCam.tsx`, last in commit
  fbea573) is removed from the finals reel, title games and playable games; the "Last shot" line
  in a playable game's recap stays, as text.
- **A trophy for every award:** `art/Award.tsx` paints each award (about 60 keys, every level)
  as its own object, metal, colours and an engraved plate: a tall trophy with a ball on top for
  an NBA title, a player statue for MVPs (gold NBA, gold-orange EuroLeague, silver G League,
  bronze abroad and Naismith), a ball on a pedestal for series MVPs, a blocking hand for DPOY, a
  sneaker for ROY (Rookie of the Year already existed, with the All-Rookie Team), a big 6, a
  rising arrow, crowns in five colours for the stat titles, a winged ball, a ball rack with a
  money ball, a heart, a bust, a cut-down net on the NCAA trophy, shields numbered for All-NBA
  and All-American, plaques for conference honours, a jersey for the high school All-American
  game, a sports bottle for the national high school player of the year (no brand marks), and
  medals on their competition's ribbon. Screens that only have an award's words find its key
  with `awardKeyOf`.
- **Celebrations:** award and title story pages show the player (the cute sprite, two new
  poses) holding the trophy over his head, bouncing, the trophy wiggling, sparkles round it; a
  medal story shows him biting the medal. Won title games and finals end on the same
  celebration. All of it stops for reduced motion.

## Round 20

- **Weight** (`player/weight.ts`, `WEIGHT` in balance.ts). Every player has a weight in pounds
  next to his height, and a best playing weight for his height and age: 220 lb at 6'7", 6.5 lb
  per inch either way, scaled down for teenagers (78% at 14, full at 21). A hidden natural
  frame (normal, sd 8 lb, at most ±22) sets where his body wants to be.
  - **Ratings:** distance from the ideal is counted in units of 10 lb at adult size (a
    teenager's pounds count for more), at most ±4. Heavy, per unit: athleticism −1.1,
    perimeter defense −0.6, and up to 2.5 units rebounding +0.8, rim protection +0.6,
    finishing +0.4. Light: rebounding −0.7, rim protection −0.5, finishing −0.3 per unit;
    athleticism +0.7 and perimeter defense +0.35 per unit for the first 15 lb, then
    athleticism −0.8 per unit beyond (too skinny). Over 15 lb heavy adds 8% body wear per unit.
  - **How it moves:** the effect lives in the ratings. `frame` remembers what the current
    weight adds, and `syncWeight` moves the ratings by the difference whenever weight, height or
    age changes, so nothing counts twice. Each summer the body fills out with any growth, then
    drifts 45% of the way to its natural weight (sd 3 lb), plus 1.6 lb a year after 28. Plans
    per half: Weight room +2.5 lb, Speed and agility −1.5, Recovery +1 (two plans share it as
    usual). A half spent mostly injured adds 3 lb.
  - **Events:** eight new (the strength coach's plan, the summer weigh-in, getting pushed
    around, holiday break, reporting to camp heavy, a plant-based diet, a burger deal, weeks on
    the couch), and "Reshape your body" and "Body choice" now really change the weight. The
    pounds are rolled like every other effect (toward the ideal is the good kind), then the
    ratings follow; the result card shows "Weight +12 lb".
  - **Shop:** the personal and private chefs move him halfway (40% for the private chef) to his
    best weight; new: a nutritionist meal plan, a smart scale, mass-gainer shakes and an air
    bike, with a scale icon. Five items shared an id with another item (chef, cryotherapy,
    film tablet, home gym, vision training), so buying the second gave the first one's
    effects: renamed.
  - **Display:** height, weight and wingspan on Home's position card, the Player banner and the
    career card; the Player tab's profile shows the weight with a word for it (heavy, solid,
    ideal, lean, skinny) and the best weight, the wingspan against the height, and what the
    weight is doing to the ratings. Careers saved before this round get a weight at the ideal
    when they load.
  - **Balance** (casual mini-games, smart policy, the same 1,600 careers before and after):
    mean peak 74.3362 against 74.5060 (difference −0.1698, standard error 0.4055), NBA 77.2%
    (78.2%), All-Star 35.3% (36.2%), MVP 10.8% (11.4%), Hall of Fame 11.4% (12.1%), titles
    33.3% (34.5%). The first version cost more (−0.2174 and NBA −2.1 points): being light hurt
    more than it helped, and the Grind took weight off, which the smart policy plays until 22.
    The light side was softened and the Grind no longer changes weight.
- **Duos** (`career/duo.ts`, `DUO` in balance.ts): hidden chemistry with the teammates he
  recruits into the starting five. Each recruit gets a hidden spark: a quarter really click
  (0.65–1), the rest 0.05–0.3, plus 0.1 when they play in different position groups. Each
  season together adds spark × 55, (win% − 0.5) × 30 and (trust − 50) × 0.2 (noise sd 8) to
  the bond; at 100 they become a named duo (Lob City, the Twin Towers, the Splash Pair...), a
  story page says so and the partner signs on for at least three more seasons. The only clues
  before that are lines in the summer notes. A duo starts at 60% strength and grows 15% a season:
  at full strength team strength +1.2, his efficiency ×1.035, assists ×1.12 and shots ×1.04.
  One duo at a time; it ends (with a story page) when either of them leaves the team. Home shows
  a duo card, the five tags the partner, and the scouting board warns when a move would send him
  away. The balance harness never recruits, so its numbers are untouched; with 80 simulated
  stars who recruit (Shoot for the stars), titles per career 3.05 with duos against 2.925
  without, MVPs 1.5625 against 1.375.
- **Position art from real photos:** the owner sent a Word file of reference photos (42 images,
  mostly agency and media-day pictures). The five position poses are traced from them at 80 rows
  (the round 18 drawings were 38): a low crossover (point guard), a one-hand lay-up (two guard),
  a studio jump shot (wing), the ball at the hip (four) and a flying one-hand dunk (five). The
  photos are only a reference: the outline and each part (jersey, shorts, ball, socks, shoes,
  hair) are traced over the photo, the light and shade come from it, and the kit, skin and hair
  are painted in the game's colours, so nobody in them can be recognised. Colour clustering alone
  worked on the two plain-background studio shots but not on game photos (white kits under warm
  light match skin; dark kits melt into dark crowds), so those three were traced part by part.
  The ball is shaded as a sphere with its seams, the jersey gets piping where it meets skin and a
  waistband over the shorts, shoes get white soles, and the number sits on the chest wherever a
  7×5 block of jersey fits. The five archetype-only actions (pass, defense, rebound, block, hook)
  keep the round 18 drawings until the owner has checked these.
- **Plans** (owner's request): Team first now cuts injury risk (×0.85, was ×1.0), grows
  basketball IQ a little faster (×1.4 on IQ) and adds +0.15 team strength (chemistry) for the
  rest of the season after each half. Spotlight is roughly the opposite: injury risk ×1.2 (was
  ×1.05), IQ grows at ×0.6, −0.15 chemistry a half, and it gambles on shooting and finishing:
  each half both roll normal(+0.6, sd 1.3) points, so about a third of rolls lose points. It
  carries a High risk tag, and the half's result says what the gamble did. Speed and agility is
  the weight-loss plan: −5 lb a half (was −1.5). Balance, same 1,600 careers: mean peak 74.3719
  (74.3362 before), NBA 77.1% (77.2%), All-Star 35.2% (35.3%), MVP 10.8% (10.8%), Hall of Fame
  11.4% (11.4%), titles 34.8% (33.3%). The first try at +0.25 chemistry a half gave titles 35.8%,
  more than "a little", so it was cut to 0.15.
- **An action for every archetype** (owner: "one detailed art for each archetype"): all 25
  archetypes now have their own pose traced from the reference photos, none shared (the five
  position poses are among them). Photos cut off at the knees or crowded by other players were
  swapped for full-length ones. Where a photo stops at the shins, the legs, socks and shoes are
  finished below it. Overlapping skin (an arm across the face) gets a thin shadow line so it
  reads. The art lives in `art/heroRows.ts`, run-length encoded (about 55 KB for 31 poses); the
  round 18 hand drawings are gone.
- **Ring chaser role cards:** choosing to chase a ring now opens role cards: the three of six
  roles that suit his ratings best, each with the player in the role's own action. Two roles are
  new and are not among the 25 archetypes: Bench scorer (shooting +3, finishing +4; perimeter
  defense −3, rebounding −2, rim protection −2) and Veteran leader (basketball IQ +7, playmaking
  +2; athleticism −3, finishing −2, rebounding −2). The balance harness never chases a ring, so
  its numbers are unchanged.
- **Built in a lab: the player evolves** (`art/Evolution.tsx`). First take: five stages from the
  cute sprite to the detailed art; the owner did not like it. Second take ("increase the amount
  of pixels every time"): the same traced player at every level, drawn the same size, with more
  pixels each level: high school 14 rows tall, university 20 (OVR 65+), a lower league 28 (70+),
  NBA 40 (75+), All-Star 56 (80+), MVP the full 80 in a gold glow (89+). The small versions are
  shrunk from the 80-row art (each pixel takes its block's most common colour; thin parts like
  arms survive at the small sizes) and outlined again, and the jersey number appears once a 7x5
  block of jersey fits. Owner's follow-up: he stands like on media day with the ball on his hip (the
  traced media-day pose) at every level. Third take ("the first version can be the cute one,
  don't use the same image five times"): high school is the cute sprite, and each later level is
  a different media-day photo traced into pixels (`spin`, `carry`, `chest`, `hip`, `mediaday`;
  three of them new, traced with their legs finished below the photo's edge), still with more
  pixels each level. The same art shows in the mini-game and in a Built in a lab career (the
  Player tab's banner and an Evolution card). A track shows every level, the art flashes when he
  moves up.

## Round 21: the event renovation

- **Audit first.** Every choice of all 129 events was played on sampled careers and the changes
  counted. About 35 events outside the multi-step storylines moved one or two numbers, and many
  "no" choices did nothing. Two pairs of events shared an id (`mentor`, `grades`), so the second
  of each always resolved as the first; they are now `legendCalls` and `classGrades`, and a test
  keeps ids unique.
- **Ripples** (`events/ripples.ts`). Instead of rewriting each event, a table adds what else a
  choice sets in motion, by event id and choice label: weight, body wear, injury risk, team
  chemistry, development next season, money, and quietly the bond with recruited teammates
  (`nudgeBonds` in `career/duo.ts`, capped below a duo so only seasons together form one). The
  resolver runs the ripple straight after the choice, so the roll for how it turned out scales
  both. "No" choices got a small upside (rest, mood). Team chemistry now shows on the result card
  and is scaled by the roll like everything else.
- **New events** (`events/round21.ts`, 12): the combine weigh-in, a growth spurt, coming back
  lighter after a long injury, a veteran's body, the team chef, long arms, a late-night
  shootaround with a recruited teammate, the duo's last shot, keeping the duo together at
  contract time, grumbling while on Spotlight, the coach noticing Team first, and a young star
  asking a ring chaser for help.

## Round 22

- **Career timeline and journal** (`career/timeline.ts`, `components/Timeline.tsx`): OVR at the end
  of every season with the big moments drawn on it (titles, honours, legendary seasons, injuries,
  team moves, duos), and a journal under it that replaces the decision log: every entry, season
  by season, with how each turning point turned out. On the Records tab and the end-of-career page.
- **Body map** (`player/body.ts`, `components/BodyMap.tsx`): every half, the ratings he gained are
  shared out over the muscles that carry them (athleticism to the legs, shooting to the shoulders
  and arms...), plus the Weight room and Speed plans' own work; every injury is kept and placed on
  the body by its name; height and weight are kept per season. Front and back views on the Player tab.
- **Legendary seasons** (`awards/legendary.ts`): one gold card per season that stacked the big
  honours (MVP and DPOY, MVP and Finals MVP, MVP and the title, ...) or the numbers (a triple-double
  average, thirty a night), the rarest combination first. On the end-of-career page.
- **Duo art and the Big Three** (`art/Duo.tsx`, `career/duo.ts`): the duo page and card show the
  two of them; a second recruit whose bond fills while the duo stands joins it (DUO.trio: more
  team chemistry, a little more efficiency and assists, a few fewer shots).
- **Mini-games:** 3-on-3 streetball (`mini/streetball.ts`; king of the court, three crews, a timing
  tap to finish drives; unlocks at finishing 82 and pays finishing) and the daily challenge
  (`mini/daily.ts`; one prospect a day from the date, fast break and simple text on, scored by
  legacy; the career on the device is stashed and never overwritten by the run).
- **NBA city and fan cultures** (`career/cityCulture.ts`, `career/fanCulture.ts`): every city does
  something to him each half (Denver's altitude slows a weak athlete in his first season and then
  builds his athleticism; party cities can pull him out of the gym; San Antonio slows aging;
  Golden State builds shooters...). Its fans add a home-crowd edge, a playoff edge, and their own
  reaction to winning and losing. On the Season tab and on NBA offers.
- **Per-team arenas:** the NBA banner shows each franchise's real number of title banners, its
  roof, its motif over centre court and its name on the stands.
- **Fixes:** rating rows share one grid (bars no longer run over the names on narrow cards); the
  banner's numbers sit on a soft panel; dark-mode streetball background and court; a former star
  (peak 85+) can become a veteran specialist down to OVR 56 and sees it first; no G League offers
  from age 30.
- **Harder titles** (owner: "I still want harder titles"). Ring-chase calls come from teams ranked
  2-8 at random (not the two best), free-agency ring-chase offers from teams 2-7, and in NBA
  playoff games his team gives up 1.0 strength (`TEAM_FACTORS.playoffGrind`: every opponent raises
  its game). Lowering the chemistry cap and the playoff winning-player edge moved titles by
  nothing measurable, so they stay. 1,600 careers (casual mini-games, smart policy) against the
  round 21 numbers: mean peak 74.4923 (74.4785), NBA 78.3% (78.4%), All-Star 35.8% (34.6%), MVP
  11.9% (11.3%), Hall of Fame 11.2% (11.3%), titles 29.2% (36.1%). A grind of 1.5 gave 21.3%.
- **City cultures, second pass** (owner: "are any other city cultures the same? be as unique as
  possible"). The five party cities had shared one effect; several other cities shared costs
  (slow fame in small markets, faster growth for the young, altitude, a better mood). Every city
  now has its own main effect and its own cost, and the party cities each cost something
  different: New York (tabloids: mood and trust), Atlanta (legs: wear and athleticism), Miami
  (fines), Los Angeles (paid gigs: missed reps), New Orleans (pounds). The daily challenge only
  opens without a career in progress. 1,600 careers: mean peak 74.5516 (74.4923), All-Star 37.0%
  (35.8%), MVP 12.2% (11.9%), Hall of Fame 11.6% (11.2%), titles 29.1% (29.2%), within the noise.

## Round 23

- **Action cam** (owner: "start working on the animations, look back at the photos"). In a final's
  last minutes each play is acted out from the sideline by the photo-traced players
  (`ui/art/ActionCam.tsx`): the man with the ball comes in and goes up, his defender slides over,
  and the ball flies through the net, gets swatted, poked loose or rims out. The play's own words
  pick the moves ("throws it down" is a dunk, "pulls up from deep" a pull-up three, "hits the
  turnaround" a fadeaway). The scorer's team attacks the hoop in its kit; blocks and steals belong
  to the winners. The buzzer-beater lights the backboard red. The reel now waits one more beat
  after the last play so it can finish. It is the finals reel only for now, waiting on the owner's
  verdict before it goes anywhere else.
- **Casual colours** (owner: "the pixel players don't need too much gradation, use less colours").
  On the cam each part of a player is one colour and one shade (`flat` in `Hero.tsx`); a player
  drawn facing the other way has his number painted mirrored so it reads right. The start page and
  the cards keep the full shading.
- **A 99 in Reality hits hard** (owner: "a 99 OVR should be possible, no matter how hard"). It is
  possible: 2 of 2,000 smart careers with casual mini-games peaked at 98.5634 and 98.9649, shown
  as 99 (0.1%); Regular guy shows a 99 in 3 of 1,600 (about 0.19%). A shown 99 needs nearly every
  rating at its 99 cap. Tested and dropped: Reality's potential capped at 103 instead of 99 (no
  change), a wider potential spread (0.2%, but NBA 53.3% to 48.2%), and a 2% generational draw
  (no more 99s, MVP 1.95% to 3.75%). Owner: the odds are fine; any later fix keeps them under 2%
  for Regular guy and 0.5% for Reality. No change.

## Round 24

- **Continue fixed** (owner: "the continue function doesn't work that well"). Ending a daily
  challenge started from the start page wrote an empty game over the saved career, so Continue
  vanished. The autosave now only ever writes a career; only "New career" clears the save. The last
  move is written straight away when the tab closes, and the Continue card says that starting a
  new career replaces the saved one.
- **Career log.** Every finished career leaves its career card in a log on this device (daily runs
  and lab players don't). Five at most: from four the page warns, and a sixth pushes out the oldest;
  any card can be deleted. The log keeps a compact career record (`engine/career/record.ts`, about
  2 KB) rather than the whole save, and the card is now drawn from that record.
- **Deep bench minutes** (owner: "increase minutes to 0~3 minutes"). A deep-bench player now gets
  0-3 minutes every game (it was 1-5 minutes in about one game in five, 0.66 a game on average;
  now 1.5). Needs the next balance check.
- **Surge** (owner asked why it showed 0%). Not a bug: the table showed a placeholder weight. The
  surge chance is worked out per player: only at 25 or younger with a hidden growth rate above 1.1,
  weight (rate - 1.1) x 0.25, from 2.32% a half at rate 1.2 to 16.8% at 2.2 (normal mood). The game
  reference now spells this out.
- **Translations** (Korean, Chinese, French, Spanish, Japanese) were dropped for now at the owner's
  call and kept in `ROADMAP.md`.
- **"How the game decides"** went into the project summary: titles, MVP, the draft and growth in
  plain words, with the series and title odds worked out (a 60% team wins a series 71.02% of the
  time and the title 25.44%).
- **UI fixes.** No HIGH RISK chip on Spotlight (it was only a label); focus names no longer break
  mid-word; plan icons stay beside their names; the scouting report's blank header is gone; the
  pixel body map moved up beside the ratings; New career sits right under Court in Settings.
- **The guide** became short bullets under the same headers, and **Guide mode** became a tour of
  every control, each shown once (80 steps), including ones that unlock later. Turned back on, it
  starts over.
- **Achievements** (owner: "hundreds, some extremely hard, puns, tiers, permanent"). 228 in five
  tiers (bench, rotation, starter, All-Star, Hall of Fame), checked as a career goes, kept on the
  device across careers. A banner drops in for each new one (three at most at once, each fading
  after 4.5 s or on a click); the book on the start page shows the unearned ones by name only.
- **Long careers** (owner: "LeBron is still playing well; 85 max at 40; 50 the hard limit"). Every
  Recovery plan, health item, rest summer and low-wear season adds to a hidden longevity score that
  slows aging and sudden declines; above 37 the ratings meet a ceiling that falls to 85 at 40.
  Measured: a body kept that way averages 83.36 at 40. Nobody plays past 50 (an achievement).
- **Plan strips.** Plans carry a thin colour strip like shop items.
- **Playable finals** (owner: "a mini-game, skippable: play, watch or skip"). NBA, Olympic, World
  Cup and other big finals open on a choice. Playing them stops before each of his team's big
  possessions: pick a move, stop the meter (its green widens with the rating the move uses). The
  result was settled by the season (titles, awards and the bracket depend on it), so the plays
  score as written; the timing earns a clutch rating (reputation, mood, achievements). Each kind
  of final has its own floor and the opponent wears its own colours.
- **Community.** Leaderboards (today and all time, per difficulty), a Reality 99 hall, a statue
  plaza (Regular guy, 150+ legacy, gold from 220 or a first-ballot Hall of Famer, 100 at most,
  pay respects), a feedback page that only the owner can read, and a live strip after the owner's
  reference image (players now, careers since you came, today's theme, the latest news). It runs
  on the claude.ai page's shared database, falls back to this device elsewhere, and needs no
  address anywhere (the owner's email is never in the code). The score is provisional (legacy
  plus peak OVR above 60) until the owner picks one; hosting (claude.ai or a website) is open.
- **Daily challenge** (owner: "lock minigames entirely"). No mini-game card or hub, no playable
  finals (watch or skip), and fast break and simulated playoffs stay on.
- **Three-point contest.** The setup drew the shooter at the chosen money rack, but every round
  starts at rack 1 (the owner's bug report). The preview starts him there and the buttons say
  "Money rack".
- **Dunk contest** (owner: "too easy", "no overlaps in moves"). Narrower greens, a faster sweep,
  cards one point stricter, more for clean timing, rivals two points stronger. A move he lands is
  gone for the rest of the contest (takeoffs and props can repeat; the rivals follow the rule
  too), with three new moves so four dunks still have a choice. A modelled player going for hard
  dunks now wins 59-69% with sharp timing (35 ms error) and 19-43% with average timing (55 ms);
  before it was 96.5-99.8%.
- **3-on-3 streetball** (owner: "every player has a ball", "the ball moves randomly", "one game",
  "important shots play the finals animation"). One game to 11 against the crew holding the court.
  The six sprites hold no ball and stand by role; the one ball follows the play's own path. Drives
  and pull-ups ask for a timing tap and play out on the action cam in a new park setting.
  Results: rout, win, close loss, out, paid as before. A modelled casual player wins 40.8%.
- **Roster and fit** (owner: "show a roster; the randoms determine team chemistry a bit"). Roster
  players get ratings from their archetype around their OVR. Every team has a system (its coach's,
  or the style he set). A Roster fit line joins the team factors: the better of a balanced profile
  and one that peaks where the system wants it, plus the bench against the league's usual bench,
  the five counting three times the bench. Calibrated on 1,100 measured seasons so the average
  roster adds nothing (mean +0.025, p10 -0.72, p90 +0.76 at full strength; Regular guy halves
  it). The recruiting scouts weigh the fit too. The Player tab shows the roster.
- **Dev deck** (owner: "a dev version, a deck of cards, each opens that function"). A separate
  page (`dev.html`, `npm run build:dev`) with 60 cards in seven suits; cards that need a career
  play one with the harness's smart player until the state shows up, then the game opens on it.
  It surfaced three fixes: the five builder's names were cut to two letters, career records kept
  legacy points unrounded, and the harness read `process.env` (not there in a browser).
- **Graphic-less version removed** (owner's call): its artifact was deleted.
- **Team style graphics** (owner): each style is a coach's chalkboard play in pixel art (the
  three lanes of Run and gun, the shell of Defense first, the passing ring of Ball movement, the
  post feed and kick-outs of Inside out, the clear-out of Run it through you), in the style
  picker and on the roster card.
- **Leaderboards** (owner: "whoever has the highest score; list the top 100"). The shared page
  ranks players, each once at their best career, top 100. The metric stays provisional; hosting
  is left for later.
- **The summary in the dev deck** (owner): a chapter-by-chapter page from the same source as the
  Word file (its generator writes `src/dev/summary.json`), and one search box over the cards and
  the summary, whatever suit is picked.
- **Small fixes**: the body map's time out no longer wraps and counts days under two weeks; the
  scouting report always shows its odds; the dev deck's pressed "All" chip was light text on a
  light chip in dark mode.
- **Graphics** (the owner's new standing rule): pixel icons for the career log, feedback, statues,
  the 99 hall, the live strip, paying respects ("press F"), the inbox, the community, the timing
  meter and the roster; medals for every achievement tier; bronze and gold statues; a floor per
  kind of final; the park for streetball.
- **Lockdown, the rhythm mini-game** (the owner: two buttons, block on A and steal on S, at least
  ten patterns dealt at random, 30 seconds to a minute, a press at least every 3 seconds, long
  notes allowed, pays defense). Each run deals four-beat sets from 14 named plays, easier ones
  early, never the same twice in a row, often mirrored, and adds a note wherever 2.8 seconds would
  pass without one; runs last 38 to 52 seconds. The beat is a small drum machine in the Web Audio
  API, started by the Start button. The game clock is the sound reaching the speakers (the output
  timestamp, carried forward with the page clock), so presses line up with what the player hears;
  a scripted player pressing on the beat scores 100%. Grades S to D pay perimeter and interior
  defense; it opens in a career when either defense reaches 82.

## Round 25

- **Keyboard shortcuts**: F (fast break), G (guide mode) and M (master mode) are gone (the owner);
  those switches stay in the settings menu. Enter, the number row and the tab letters remain.
- **Lockdown gets a play behind the lanes** (the owner: "a player shooting the ball, something
  like that"). A side view of a half court: their ball handler dribbles on the beat, you guard him,
  and each judged note plays out with the action cam's traced players: a block (he rises, you
  swat it away), a steal (you poke it loose), a missed block note is a jumper that drops, a missed
  steal note a blow-by; holding a long note shows you walling up a post-up or sliding with his
  handle. The scene is dimmed and the lanes see-through, so the notes stay easy to read.
