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
- **The leaderboards rank by a career index** (the owner chose it from the suggested metrics). It
  is built like the JAWS score for real Hall of Fame cases: each season is worth its honours
  (legacy points of that year's awards), its NBA points (1 per 1,500) and a tenth of a point for
  every OVR above 60; the index averages the career total with the best five seasons in a row.
  Over 1,000 harness careers: mean 40.1196, median 17.45, top 10% from 117.82; Hall of Famers
  average 169.468, careers that never reached the NBA 1.9242; correlation with legacy points
  0.991186. Records logged before this keep their legacy points as their score.
- **The shop's top end** (the owner: salaries, negotiation and brand deals need more ways to spend):
  22 new items from $1.2M to $400M: a film room, altitude camp, smart court, a medical team on
  the payroll, a performance headquarters, a sports science institute, a foundation, a museum
  wing, racehorses, a hometown film, an orbital flight, a media company, rebuilding the hometown
  arena, a superyacht, a resort on the island, a minority stake in an NBA team and buying the
  sneaker company. Their effects grow with the price but stay in the old range (morale, profile,
  goodwill, health and aging, a little growth). The stock now favours things costing 1% of the
  bank or more, so a rich player sees rich things. New pixel icons: horse, rocket, arena, heart.
- **Nicknames and brands** (the owner: a nickname from appearance, style, name and story once the
  reputation is high enough; at higher reputation brand deals with the player's own logo; about a
  hundred nicknames with logos for an AI to assign). 136 made-up nicknames
  (content/nicknames.ts), each with the traits it suits and a logo. The picker
  (career/nickname.ts) reads about seventy traits off the player: how he looks (height, weight,
  hair, beard, headband, left hand), what stands out in his ratings, his best per-game numbers,
  his archetype, his story (late bloomer, abroad, loyal, journeyman, comebacks, clutch, rings) and
  his name and number. It scores each nickname by fit (weighted traits over the square root of
  the weights, so a long list is no free win) plus a little luck, and keeps the reasons. Story
  traits many players share stop short of 1 so a skill nobody else has wins. At reputation 55
  (Star) the papers name him; at 70 (Superstar) in a pro league two brands bid each summer: a
  fixed deal (4% of the cap a season, scaled by reputation, 4 seasons) or a signature line
  (1.5% of the cap plus a royalty of up to 6% of it with reputation above 60, 6 seasons, and a
  shoe a season once he is an Icon at 85). Over 600 harness careers: 58.8333% earn a nickname,
  65 different ones come up and the most common takes 8.2153%; 43.1667% sign a brand deal,
  earning $134.5785M on average over the career.
- **Logos** are 32-pixel badges in two colours at most (the owner: black and white preferred):
  six shapes, the motif drawn as line art (outline, shading and the seams between fill colours
  in ink) and the player's initials. 21 new motifs were drawn for them (wings, note, axe, bear,
  mountain, cloud, drop, feather, key, knight, hook, lighthouse, bolt, hammer, owl, snake, shark,
  comet, anchor, wolf, crown). The look traits moved from the sprite code to content/looks.ts so
  the engine can read them.
- **Accessories and the wardrobe** (the owner: headbands, shooting sleeves, leg warmers in many
  colours, very little effect, drawn on the avatar, a wardrobe to switch or take them off, and
  never two things from one shelf in a shop). A new Accessories shelf: headbands (+1 morale),
  shooting sleeves (+0.2 shooting), wristbands (+0.2 playmaking) and leg sleeves (0.5% fewer
  injuries next season), each in ten colours, from $15 to $60. A bought accessory goes into the
  wardrobe and on at once and is never offered again. The Player tab's wardrobe shows him
  dressed, with a swatch per accessory he owns, "None" to take a slot off and "Own look" to go
  back to the look his name gives him. His sprite wears them everywhere he appears. Every shop
  visit now shows at most one item per shelf (six shelves, six items).
- **The collection, and visits** (the owner: a showcase of what was bought, and a way to visit
  or use the car, the jet, the house...). The Player tab lists everything bought, by shelf, with
  its icon (accessories stay in the wardrobe). 34 of the lasting things (content/visits.ts) have
  a button ("Take it for a drive", "Fly somewhere", "Shoot on the roof"...): once a season each,
  a short scene of him there (a backdrop for the road, the sky, the sea, home, a court, a field,
  the city or the night) with one of its lines, +2 morale, and +1 reputation for the public ones
  (the foundation, the restaurant, the arena...). Experiences that are over once bought (a
  vacation, a dinner) have no visit.
- **Ten save slots and career codes** (the owner: ten slots, and an export/import code). Every
  career in progress gets a slot on this device (ui/saves.ts), saved after each move; the start
  page lists them newest first with Continue (or Look back), Code and Delete (a second press
  confirms). Slots are stored compressed (gzip, then base64: a 260 KB career becomes about
  64 KB), so ten long careers fit in the browser's storage; an eleventh career replaces the
  oldest, and the page says which. Code shows the whole career as text (copied to the clipboard
  where the browser allows), and the import box on any other browser turns it back into a
  career in a new slot. The old single save moves into a slot the first time the page opens.
- **Staff** (the owner: when a hire comes up in an event and he says yes, the person joins a
  staff group on the Player tab, gets paid every season for very small benefits, can be talked to
  and given a raise). Nine roles (content/staff.ts): personal chef, nutritionist, strength
  trainer, physiotherapist, shooting coach, skills coach, sports psychologist, video analyst and
  sleep coach, from $80K to $300K a season at level 1. New hire events offer each one in a pro
  league (at most six on the staff, and a bank that can pay four seasons); the old events with a
  nutritionist or a sports psychologist now add them too. Each season, everyone is paid from the
  bank (whoever cannot be paid leaves) and does his small part: +0.3 to a rating, a little range
  or weak hand, a nudge toward the playing weight, a little less injury or aging, a little morale.
  A raise moves him up a level (pay x1.7 and x2.6, help x1.5 and x2). Stopping by once a season
  gets a line from him and +1 morale. Over 400 harness careers: 1.695 hires a career, 82.75% of
  careers hire someone.
- **Fines** (the owner: like an injury, a page saying how much). In a pro league each game he
  plays can bring one (0.22% a game, x1.8 with low morale, x1.4 for a star; at most two a
  season): a technical, a flagrant, criticising the referees, a missed media session, a late bus,
  a uniform violation, the ball into the stands. NBA amounts from $2K to $100K, 15% of that
  abroad. The money comes out of the bank and a "Fined" page shows. Over 400 careers: 2.2625
  fines a career, $51.80K in all on average.
- **Money events, more often** (the owner: family requests, investments and legacy projects,
  more prevalent). The old family emergency, investment pitch and foundation events come up more
  (weights 0.7 to 1.1, 0.8 to 1.2, 0.6 to 0.9; their storylines 0.45 to 0.65). New: a sister's
  tuition, a cousin's car wash, retiring the parents, a loan for an old friend; an apartment
  building, a restaurant chain, a sneaker startup (shown odds); and three legacy projects for a
  big bank (a practice facility for the old school, the national team, a Hall of Fame wing), each
  +3 legacy points, reputation and morale. 22.25% of careers fund one.
- **Sim mode, and every mode in one place** (the owner: a simulation mode; the mode switches above
  Around the league instead of in the top bar). Sim mode is fast break plus the routine calls made
  for him: the season plan (the training group of his first focus stat, recovery when hurt or
  low), the summer program (rest when worn), the national team call-up and the G League
  assignment; it stops only for turning points, offers, the draft, transfers, contracts, brands
  and storylines (a 12-season test career stopped about three times a season). Turning fast
  break off ends it. A "How you play" card above Around the league holds Sim, Fast break, Simple
  text, Guide, Master and Play playoffs as chips, with a line on what each active one does; the
  Fast and Simple chips left the top bar (the settings menu keeps its switches).
- **Explaining results: the team strength breakdown** (the owner: yes to a breakdown of what
  makes the team good). career/breakdown.ts lays out the numbers the season simulation adds for
  every game: his teammates against an average team in the league, what he adds (his OVR over the
  player he replaces, at his role's minutes, times the impact factor), what a winning player adds
  beyond the box score, and every team factor of the season (chemistry, coach trust, star
  gravity, team style, fans, roster fit, duo, storylines and midseason swings), now kept as
  numbers (season.teamFx) as well as notes. The total puts his team in a rank among the league's
  teams. It shows as a bar chart on the Season tab and as "Why it went this way" on the season
  summary.
- **The playable finals change the result** (the owner: of course). With playable playoffs on,
  the last possession of a close game (within three points) was already his call; now a pull-up
  or a drive goes to the timing meter from streetball (moved to components/TimingMeter.tsx), and
  the timing moves the chance it drops: perfect +35 points (at most 95%), good +12, late -15 (at
  least 5%). The finals are played this way like every other playable playoff game, so his
  timing can win or lose a title. The finals reel after the title stays a replay of what
  happened. A test of 40 careers timing every last shot perfectly against 40 timing them late:
  899 against 769 last possessions (winning more series means more close games), 27 against 29
  titles (one shot rarely swings a series; it decides the game it is in).
- **Contract talks** (the owner: negotiation, kept concise). Under every pro offer that is not on
  a fixed scale (rookie deals, minimums and camp deals are not), three buttons: More money (+15%,
  never above the max), One more year (up to five) or A bigger role (one step). Two asks an offer
  at most; the answer comes at once on the same screen. The team's hidden patience is 0.35, plus
  reputation / 220, plus his OVR above the league average / 45, less 0.2 for each ask before; a
  yes gives the whole ask, a meet-halfway half of it (money only; years and role stay), and an
  out-of-patience team pulls the offer. With an average OVR, a first ask for money is accepted
  33.95% of the time at reputation 30 (35.20% pulled), 47.15% at 60 (27.95% pulled) and 62.05%
  at 90 (20.55% pulled), over 2,000 tries each.
- **Press conferences** (the owner: one every two or three seasons, not one or two a season).
  After a season with a story (a title, a lost final, an MVP, DPOY, first-team All-NBA, Rookie or
  Sixth Man award, an injury of 60 days or more, a slump of three OVR or more, a move to a new
  team, a contract year), the summer brings three questions (career/press.ts), each answered
  humble, confident or fiery. Humble: +2 coach trust, +0.5 reputation, +0.1 team strength next
  season. Confident: +1.5 reputation, +2 morale. Fiery: +2.5 reputation, -2 trust, a 20% chance
  of a league fine, and next season's locker room either catches fire or splits (+/-0.15). An NBA
  crowd has a taste: demanding crowds (the boo birds, the Garden crazies) love fire, friendly
  ones love humility, the rest confidence; a match adds +1 reputation and +1 morale. Next one
  two or three seasons later. Over 200 harness careers: 5.595 a career, one every 3.685 seasons
  (high school included); 99% of careers have at least one. The press-conference effect shows in
  the team strength breakdown.
- **Rivals, in levels** (the owner: not necessarily the same draft class, like Bird and Magic;
  levels: the draft for Rookie of the Year and growth, a starter on a rival team at the same
  position, and at All-NBA to MVP level whoever he competes with in MVP races). One rival at a
  time (career/rivalry.ts), and the rivalry only grows: in his first NBA season, the best rookie
  in his position group; once he starts, the closest player at his position, a real NBA rival
  team first; once he is top five in an MVP race and someone has beaten him for big awards twice,
  that player. Each NBA season adds the head-to-head games between their teams (playoffs too),
  both OVRs and a line on what happened (who won Rookie of the Year, the season's record against
  him); if the rival leaves the league, the rivalry ends. A rival card sits on the Home side
  column, and the career card names him with the head to head. Over 200 harness careers, all 157
  that reached the NBA had a rival: 43 at the draft level, 91 head to head, 23 MVP rivals; 13.22
  games against him on average, 55.35% won.
- **Around the league, tied to his career, and the news AI** (the owner: the suggestions are good;
  an AI whose news changes the options, like trade rumours bringing more offers and more money).
  At the end of every pro season the papers read the season (career/news.ts) and write about
  him: trade rumours (low trust, a losing team or a contract year, 55% of those seasons: more
  suitors and +4% money in the summer's free agency, -2 morale), MVP buzz (top five: +5% money,
  +1 reputation), questions about his body (a long injury or two: fewer suitors, -6%), a
  breakout (+4 OVR: more suitors, +3%), doubts (-3 OVR: -4%), how his old team did without him,
  and where he stands against his rival. NBA free agency adds the suitors and multiplies the
  money. Around the league now opens with "About you" (this season's news and what it does to
  his summer), a power ranking (the top five by record, plus his team), and under each story
  about another team a line on what it means for him (in his way, a likely final opponent, games
  he should win, a seeding fight).
- **Sound** (the owner: chiptune sound effects and music would be great). ui/sound.ts makes
  everything with the Web Audio API, no files: a soft click on every button; sounds for a title
  (a fanfare), a lost final, an award or draft night, an injury, a fine, a nickname, a purchase
  (coins) and an achievement; and a soft four-bar loop (triangle bass, square lead, a little
  noise) while a career is on screen, off in mini-games (they have their own) and on the pages.
  The audio wakes on the first click, as browsers require. The settings menu has a Sound effects
  switch (on by default) and a Music switch (off by default), kept on this device.
- **The achievement book passes 500** (the owner: "all the way up to 500 and beyond... very unique
  ones"). 288 new ones (engine/achievements25.ts) make 516: 56 bench, 96 rotation, 107 starter,
  146 All-Star and 111 Hall of Fame, every name a pun and no name or id repeated. They cover this
  round's systems (nicknames by kind, brands and signature shoes, staff, fines, press conferences,
  rivals, contract talks, the collection, the wardrobe, visits, the career index, legacy
  projects, family and investments), season lines at every level from high school to the NBA,
  single games, draft night, paydays, odd seasons (a guard who rebounds like a centre, a sixth man
  who scores), career totals, award pairs, medals, roles and choices along the way. Thresholds
  follow the sim's own ranges rather than the real NBA's: over 240 test careers the best steals
  season was 1.92 a game, minutes topped out at 35.6, free throws ran from 74% to 90% and the
  best college scorer averaged 22, so five that could never happen (38 minutes a game, a season
  with no threes, straight from high school to the NBA, eight OVR lost inside one season, eight
  seasons without a two-week injury) were replaced and the rest set to what a great season looks like here. Over 400 smart harness
  careers a career earns 80.05 achievements on average; the new ones are earned by 23.0% of
  careers on average at bench tier, 15.3% rotation, 14.0% starter, 11.2% All-Star and 6.0% Hall
  of Fame. The ones the harness never earns are choices it never makes (contract talks, the
  wardrobe, visits, luxury items, fiery answers, trade requests, retiring young). The harness now
  reports each career's achievements, so a broken one shows up as never or always earned.
- **Contrast and keyboard pass** (the owner: "yeah of course"). A scan measured every piece of
  text on all five tabs in both themes against its real background (WCAG: 4.5:1, or 3:1 for
  large text), with a career that has this round's cards. Fixes: the light theme's orange is a
  shade deeper (#b5410f: white text on it 5.63:1, orange text on its tint 4.61:1; it was 4.34
  and 3.55), text on gold and amber tags is dark ink in both themes, gold used as a text colour
  has a darker light-theme token, badge text picks white or ink by contrast ratio (gold badges
  get ink), locked mini-game tiles no longer fade, faded labels lost their opacity, and the
  name card shows the brand in ink beside a colour swatch. After the fixes nothing fails except
  the achievement toasts while they fade in. Tabbing through every tab reaches each control
  with a visible focus ring, nothing clickable is mouse-only, and story pages (a fine, a
  nickname) close with Enter.
- **Fast break and simple text simplify much more** (the owner: "because there's so much
  functions now, fast break and simple text should simplify way more"). Fast break now trims the
  screen as well as the stops: every tab keeps its essentials (Home: the to-do list, the player,
  the main card, the offseason moves and the mode switches; Season: team strength and the
  standings; Player: ratings, status, contract and money; League: the standings; Records: the
  achievements, season by season and career totals) and folds the rest (the scouting report,
  milestones, the MVP race, the duo, the rival, Around the league, mini-games, the feed, the game
  log, the city, kits, the name card, staff, the wardrobe, the collection, the profile, the body
  map, the roster, leaders and voting, the record book, the timeline, banners, trophies, highs,
  tournaments and the tier list) behind one "Show everything" button at the bottom of the tab.
  With the test career, the five tabs go from 41 cards and 6,214 words to 15 cards and 1,366
  words; the Player tab from 7,465 pixels tall to 1,216. A press conference in fast break is one
  answer whose tone carries through any second question, and sim mode answers humbly on its own.
  Simple text now hides explanations on every tab and in every dialog, not only on Home (every
  small grey paragraph, choice details, the mode notes), keeping status lines a player needs
  (claims left, the slots warning, the achievement riddles, empty states) and a press answer's
  tone. With both on, Home has 203 words where it had 503.
- **Fewer clicks: press conferences ask one or two questions** (the owner: bring the clicks this
  round adds down to about 0.5 to 0.7 a season). Measured over the same 160 smart careers against
  the end of round 24: round 24 took 12.818879 clicks a season, this round's first version
  13.893398 (+1.074519: press conferences +0.8464, more shop visits with more to buy +0.1583,
  brand offers +0.0528, contract offers +0.0222). Press conferences now ask two questions after
  the biggest stories (a title, a lost final, a major award) and one after the rest, and each
  answer weighs 3 / questions, so a press conference moves trust, reputation, mood, the locker
  room and the fine risk as much as three answers did. Now 13.368080 clicks a season: this round
  adds 0.549201 (press conferences 0.3448). The engine test's budget stays at 14 a season (the
  test career: 13.59). The press achievements count press conferences, not answers (five humble,
  five confident, five fiery; face the press eight times). Fast break still makes it one answer;
  sim mode answers on its own.
- **End of round 25: the checklist** (the owner's order; nothing on it was done feature by feature).
  - Graphics: staff are drawn at work in their roles' uniforms (a kitchen, a health club, the
    clinic, a practice court, a study, a film room, a bedroom; the chef wears a hat, the
    psychologist and analyst glasses); the fine page shows a league-office letter stamped FINED;
    press conference questions show the press room and brand offers a city billboard; the rival
    card puts the two of them face to face in their teams' kits; 14 new pixel icons (13 for shop
    items that had fallen back to a bag, one for Sim mode).
  - Sound: cameras at a press answer, a deal or a pulled offer in contract talks, a hire, a raise
    or a goodbye on the staff, a chat, a visit, a brand jingle and a perfect release on the timing
    meter, read off the career log and the player.
  - Fast break, sim mode and simple text (the owner added sim mode to this step, and to the
    checklist in CLAUDE.md): the nickname page now shows in fast break (once a career); fine
    pages stay hidden there (the money still goes, and the log keeps it). Over 40 sim careers
    (768 seasons) sim mode stops 2.4323 times a season: press conferences never stop it (it
    answers humbly), fine pages never show, the timing meter never comes up (the postseason is
    simulated), the shop is skipped and the tabs fold as in fast break. Brand offers are the
    only new decision that stops it (0.0195 a season), as designed: they shape a career's money.
    This round's turning points (staff to hire, family requests, investments, the new stories)
    stop it like every other turning point: 81 of 1,212 turning-point stops.
  - Contrast and keyboard: the scan is still clean in both themes with the new art.
  - Events: seven that bring the new systems into the story: a nickname you never asked for,
    your brand in the news, your shoe sells out, your rival on a podcast, someone wants your staff,
    your quote on a T-shirt, a magazine wants a tour. Over 120 careers they come up in 6% to 24%
    of careers (the tour needs a mansion, a penthouse, an island or a yacht, which the harness
    never buys).
  - Harness: press and brand decisions were already handled; `live` only appears in played
    playoffs, which the harness simulates.
  - Dead code: 13 exports only used in their own file lost `export`; the old fast chip's dot
    styles went; hiring now refuses a seventh staff member by itself, not only through the events.
  - Tests: tests/round25.test.ts (17 tests: the book past 500, nicknames and brands, staff,
    fines, press conferences, contract talks, rivals, the news, the strength breakdown, the
    shop's shelves, the wardrobe, save codes). The round 21 events test samples 30 careers instead
    of 12: with this round's events in the pool, 12 careers met 3 of its 12 events (30 meet 5).
  - Balance (1,600 careers, smart player, casual mini-games, against round 22's approved numbers):
    mean peak 73.5644 (74.4923, -2.28 standard errors), NBA 76.1875% (78.3%), All-Star
    32.8125% (35.8%), MVP 11.0625% (11.9%), Hall of Fame 12.9375% (11.2%), titles 32.4375%
    (29.2%). Titles have been near 32-33% since round 24. A paired run on 800 of the same
    careers with round 24's shop stock shows the one-per-shelf shop costs 0.2552 peak OVR
    (+/-0.1776) and 2.8750 All-Star points (+/-1.1888). Left as it is for the owner to decide.
  - Guide: the manual covers ten save slots and codes, sound, How you play, sim, the strength
    breakdown, the rival, the nickname, staff, fines, the news, the last shot's timing, press
    conferences, contract talks, brands, accessories and the collection, 500+ achievements and the
    career index; Guide mode's tour has 99 steps (21 new).
  - Dev deck: 74 cards (15 new, one retired: the single-save Continue card).
  - Project summary: a new chapter 15 for this round, the balance check after round 25, the last
    shot of a playable game, ten save slots; docs/reports/2026-10-31-project-summary.docx and the
    dev deck's summary chapter.


## Round 26 (owner requests, first batch)

- **Scouting report** (owner: a 65 OVR freshman was projected "101–99", with every milestone ticked):
  the freshman projection is refit to the round 26 distribution run (4,000 careers per difficulty).
  Starting OVR at 14 barely predicts the peak: each point ahead of the usual freshman adds 0.279061
  (Regular guy), 0.297141 (Reality) and −0.030577 (Shoot for the stars) to the peak, with SDs of
  12.08279, 8.767987 and 3.814488 around the line. The old 1.2 a point is gone. `MODES[*].scout`
  holds mid, slope and SD; the projection never passes 99 and its range is never upside down. A
  tick now means "already reached"; everything else stops at 99%.
- **Achievements came already earned**, for two reasons. A career earned the OVR rungs and Pterodactyl
  from its starting draw: now nothing is earned before the first season is in, and Pterodactyl
  asks for 3 blocks and steals a game as well as the wingspan. And the old dev deck page, opened
  from a file in Chrome, shared the browser's storage with a downloaded copy of the game and
  wrote its "everything earned" book into it: those entries ("Dev deck") are dropped on load.
- **The last possession** (owner's recording): with guide mode on, picking a shot opened the meter,
  the guide tour put a step on the meter, and the "next" highlight around the play area came off,
  which remounted the screen and threw the shot away. The highlight's wrapper now stays put.
- **No Shortcuts** (owner: the hardest way to play is Reality, master mode, nothing simplified):
  picking Reality offers it; taken, the career keeps master mode on and fast break, simple text
  and sim mode off to the end (`flags.oath`; the engine refuses fast and sim, the store the two
  switches). The career carries the mark in the top bar, on the leaderboards, the Reality 99 hall,
  the career log and the retirement page, with six achievements of its own (522 in all).
- **Feedback**: a sender folded at the foot of every tab in a career, tagged with the tab, the
  difficulty and the age. It goes to the maker's inbox when the viewer may write to the page's
  shared data (the owner and invited contributors); everyone else on claude.ai
  gets the page's own comment box (comments, composer only: no permission asked), which the owner
  sees in the page's comments. A copy opened from a file says plainly that its notes stay on the
  device.
- **New career** (owner: no confirmation text, small and easy to miss): a full-size button, then a
  plain question with "Yes, start over" and "Keep playing". The blank red button came from a
  round 25 style for the saves list (red text on every danger button); it now only touches
  outlined ones, which also brings back the text of the retire and delete buttons.
- **The dev deck moved into the game**, behind a password at the foot of the start page (owner).
  Dev mode reloads the page into the deck with storage of its own, keeps the community on the
  device, and adds a Catalog (every list the game draws from, about 1,060 entries over 17
  categories, with their art) and the Action Cam Lab (formerly its own artifact). The deck and
  cam lab artifacts are retired. Project summaries are no longer sent as Word files; the summary
  lives in the deck.
- Start page: the live strip, the saves and the Developer door sit under Next. The name card is
  compact, with the jersey he will wear. Lockdown's intro has a little court where the pixel
  players run a set. The game's tab icon is drawn from script (the host wraps the page, so a
  static icon link landed in the body), and dev mode shows the deck's own icon.
- **Distribution report**: docs/reports/2026-10-31-peak-ovr-by-difficulty-and-mode.docx, 18,000
  careers (2,000 per difficulty and policy, plus 1,000 seeds each in fast break and sim mode).
- **The inbox moved into the dev deck** (owner: only the devs should see it). It was only ever
  shown to the page's owner, and the page's rules let only the owner and editors read other
  people's messages, but it now lives in the deck (Inbox, beside Catalog), not on the Community
  page. It reads the shared feedback on the claude.ai page, or the notes kept on this device in a
  copy opened from a file (past the deck's own storage prefix, read-only). `…#community` opens the
  Community page; `…#inbox` opens the dev door on the start page, and the password lands on the
  deck's Inbox.

## Round 27: the UI round (screen polish, navigation, phone layout)

The owner's scope: screen-by-screen polish, navigation and the phone layout (convenience in the
sense of fewer clicks was left out), with round 26's end-of-round checklist folded into this one.
Owner: "this round may cause a lot of visual bugs, so keep thinking of ways to prevent that and check
multiple times."

- **The visual check** (`scripts/visual.cjs`, `scripts/visual-diff.py`): every dev deck card (74) at
  1440x900 and 390x844, light and dark, with the same random draws and clock each run. Checks:
  sideways scrolling, off screen, clipped, spill, overlap (glyph bands, same layer, what a scroller
  lets through), contrast (WCAG AA), tap targets, script errors, broken images, a buried main card
  and content under the bars at a phone's foot. The first run flagged several hundred problems; most were the
  checker learning (a modal hides what is under it, scrollers clip, badges sit on edges on purpose);
  the rest were real and are fixed. Each new check was proven by putting its bug back and seeing it
  flagged. `tests/tokens.test.ts` keeps the light and dark tokens in step.
- **Real bugs it found**: on phones the Home tab showed the folded extras (scouting report,
  milestones, Around the league, mini-games) above the season's main card, four cards down (round
  25's Extra wrapper is display: contents, so the phone order missed its cards); the Records tab was
  442px wide on a 390px phone (the timeline's filters would not wrap); the lab panel in a career and
  the lab mini-game shared `.lab-row` and `.lab-ovr`, so the mini-game's rule broke the panel's rows;
  the lab's name box had no type and went unstyled; an effect returned the promise newer browsers give
  back from scrollTo and took the whole page down (caught by the smoke test before it shipped).
- **Contrast**: gold text (Stars badge, anomaly tag, legends tiers) uses `--gold-text`; good and warn
  are darker in light mode (#18703e, #8a5d0c); the mini-game bands and their Unlocked chips are the
  game's colour at 72%; scout badges use the surface colour as ink (white failed on dark mode's light
  badges); the dunk rule tiles are a scoreboard; the Reality 99 hall's purple has a text token;
  legacy tier counts pick their ink by contrast.
- **Phones**: every control at least 36px to tap (folds, to-do links, swatches, switches); small
  segmented controls wrap.
- **Navigation**: one page top for the career log, the achievement book, the community and the
  mini-games: the way back on the left says where it goes ("Back to the career", "All mini-games"),
  a you-are-here trail, the game's name; Escape goes back. Tabs open at their top; the browser tab
  names the page.
- **Polish**: team strength rows share one grid (bars line up; the playoff value sits under the
  value); plan cards line up their titles; the Player tab's peak is never below the OVR (the peak is
  kept at a season's end); "your 3th season together" says 3rd (`ordinal` moved to career/common).
- **End of rounds 26 and 27** (the owner chose which steps): art: No Shortcuts has its own banner on
  the retirement page (iron and red, the shield sewn on). Sound: a resolute vow for taking No
  Shortcuts and a paper-plane send for feedback (19 effects on the dev deck's board). Fast break, sim
  and simple text: No Shortcuts locks them; simple text hides the offer's and the honour's
  descriptions. The manual has No Shortcuts, pages and Escape, the feedback bar and the Developer
  card; Guide mode has 102 steps (three new: the offer, the way back, the feedback bar). The dev deck
  has four new cards (the offer, a No Shortcuts career, its banner, the feedback bar) and a chapter
  16 in its summary. Skipped at the owner's word: achievements, events and the balance run.

## After round 27: the owner's batch (fixes and additions, no balance change)

- **Lockdown beat** ("the beat loops and I can't stop it; are there multiple beats?"): there is one
  beat (four sticks to count in, kick on 1 and 3, snare on 2 and 4, hats on the half beats) at seven
  tempos, 100 to 124 bpm in steps of 4 (`TEMPOS`, rhythm.ts); the fourteen sets are notes on top of
  it and make no sound. The sound board loops one tempo at a time, each tap-to-stop, with Stop
  everything; leaving the board stops it.
- **Catalog difficulties**: only the three a career starts at (Fast break is a switch, Built in a
  lab a mini-game).
- **Loading pop-out** ("small lags here and there"): the steps that run the engine or swap a page
  wait one frame (`later`, store.ts) so the pop-out is up first; it fades in after 0.2 s and keeps
  moving while the page is busy (transform and opacity only, run off the main thread). Your own
  player in your kit, nine moves (dribble, crossover, through the legs, behind the back, finger spin,
  two-ball drill, pound dribble, around the world, free-throw routine). Dev deck card "Loading
  pop-out" shows all nine and can make the page lag on purpose.
- **The dev deck keeps out of the game's achievements**: checked by dealing every card and comparing
  the game's own storage before and after (`scripts/dev-apart.cjs`). The deck's **Reset
  achievements** empties the game's real book on purpose (asked twice), counts daily challenges
  again from today and turns Guide mode back on with its tour from the first step.
- **Ending a career keeps it**: New career leaves it in Your careers to pick up again; only Delete
  removes a save.
- **An icon of its own** (owner: "injuries, events, and some of levels and leagues have the exact
  same icon"): 213 new pixel icons, one per event (167), injury (17), level (7), overseas league
  (14) and brand (8 logos); a test keeps every one present and no two alike. In the catalog an
  injury card's edge is its severity (green, yellow, orange, red). In the game: an event's icon by
  its title, the injury on the body map's list and on a big injury's page (severity on the edge),
  the level or league by the season line on Home, the brand's logo on the name card and on its
  offer.
- **Mini-game achievements**, two kinds (26): the arcade (results kept on this device, any run,
  career or not: firsts, scores, wins, every game, 25 and 100 runs, top marks in all) and the career
  (what claimed bonuses did: three games or all seven in one career, ten claims, 2 OVR gained, range
  from the contest, five straight summers, a title in a bonus season). `GameState.miniLog` records
  each claim. The book filters both.
- **Community**: house players (36 small careers the game played itself, career index 1 to 15,
  peaks in the 60s, always marked "house") sit at the foot of the boards and in the plaza as bronze
  statues, never posted. Statues are the cute sprite cast in bronze or gold. The **Reality 99 hall**
  is a pixel hall (stone, columns, banners, a 99 banner, a carpet) with benches of seated
  silhouettes, five a bench (three on a phone), a new bench once the one above is full; a tap lights
  a seat and pops up the player's card.
- **3-on-3**: a pixel court (dither, chain-link fence, stepped arc, pixel rim and net), the court
  about a quarter bigger, and the play-by-play under it in a few words (+2 Novak · pull-up two),
  the last play big.
- **More sound** (14 new effects, 33 in all): tabs, pages, event results good and bad, tip-off,
  new season, a new team, OVR up, retirement, 3-on-3 swish, rim and block, the hall's reveal, paying
  respects.
- **Body map**: hovering a red spot shows its injuries (icon, severity, age, time out).
- **No Shortcuts**: the road picks the player (position, archetype, focus, hand, country by real
  odds, name) with no reroll; Simple text is allowed now.
- **Projected peak before college** (owner: "it either overestimates or spoils the potential"): in
  high school and youth academies the scouts' read of his ceiling counts for half and what he shows
  on the court for the other half, the range is never narrower than 8 points either side, it shows
  in fives with the tiers it spans, and the odds are words (long shot, possible, real chance,
  likely). Measured on 150 smart careers at ages 16 to 18: the old range was 9 to 11 points wide yet
  held the real peak only 48 to 57% of the time (mean miss 5.3 to 5.9); the new one is about 15 to
  16 wide, holds it 80 to 84% of the time and misses by 4.5 to 5.0 on average, with no bias (within
  0.8 of the real peak). Ages 14 and 15 are unchanged (no scout read yet). Display only: no career
  plays differently.
- **Guide mode** starts on for a first-time player (nothing saved, logged or earned on the device,
  no say on the switch yet), not in the dev deck. Its tip over the settings menu no longer closes
  the menu.
- **Settings** on the start page and in the dev deck; the theme and court now apply to the deck's
  own pages too (`components/Look.tsx`).
- **The project summary goes by function** (owner: "dont go by rounds, but in functions ... bug
  fixes dont have to be in the project summary"): 17 chapters, each about one part of the game; the
  round-by-round chapters were split into them, no heading or line names a round, the events are
  grouped by theme (all 167, rebuilt from the game's own data) and new features go into their
  chapter. New changes for players are listed in **What's new** (a card on the start page,
  `content/whatsNew.ts`).
- **Catalog groups**: each list in groups with a heading (shop by type, teams by league with high
  schools and youth academies added, events by theme, injuries by severity, and so on).
- **The intro** (owner, after the first try: "the title card is large and pixelated ... the pickup
  game with pixel art, but the players can be large ... go from high school, college, streetball
  (easter egg), other league, nba"): the title in a 5 by 7 pixel font on a plate, over a one-on-one
  with players about a quarter of the screen tall, the court changing every five seconds through a
  career. Once for a first visit, and from the Intro button. Then (owner: "the rims should be
  sideways and align with the orientation, and the avatars should have motion ... 2~3 frames per
  action"): side-on pixel hoops, and each player a stack of frames shown one at a time in steps
  (two running frames, a jump shot, a block, a low reach for a steal, a stand), the two always
  facing each other over two trips of 14 s; a player drawn facing left gets his number painted
  back to front so it still reads (`mirror` on the sprite). The ball (owner: "make the ball even
  larger ... the lines are too thin to match the avatar's vibes") is drawn on the players' own
  pixel grid, 11 of their pixels across (about nine tenths of a head), with their dark outline and
  seams a whole pixel thick.
- **Legendary seasons**: the band's text takes dark or white ink from the team colour (white on a
  light orange band was 2.56:1).
- **What's new as a pop-up** (owner: "make what's new a pop up that covers part of the screen? and
  when the user closes it, they can still access it next to a button on intro"): the start-page card
  is gone; a panel slides in down the right of the start page (a sheet from the foot on a phone)
  once after each update, for someone who has played here before, and the What's new button beside
  Intro opens it again. A first-time player is marked as on the current version (the intro and the
  guide come first). Not automatic in the dev deck, which has a card for it.
- **Each create step opens at the top** (owner: "when i move from the home page to identity, make the
  screen start at the top"): the browser's scroll anchoring kept the Next button in place, so the
  identity step opened at its foot; every step change now scrolls to the top.
- **Position cards** (the visual check, once the dev deck had a card for the identity step): the
  letters take the position colour mixed toward the text colour, and the picked card's band and its
  Selected tag a darker shade of it, so all pass contrast in both themes (they were 2.7 to 3.5:1).
- **Thank you for playing**: the first time someone leaves a career for a new one; the player with
  the trophy under one spotlight, three dim rows of pixel fans (owner: "a little overwhelming" on
  the first pass, so the crowd is darker, only the front row waves, the confetti is sparse and the
  lights are still). Then (owner: "make the player much larger ... if the user had completed the
  game, or had broken any records (mvp, mip, ...) make those icons appear in the background"): the
  player about half the screen tall, and the career's honours as icons either side of the title.
- **Every graphic is pixel art** (owner): now a standing rule in CLAUDE.md.
- **Your look**: skin, hair, hair colour and facial hair at the start, the same parts every avatar
  is built from (`content/looks.ts`), in a plain white or black jersey with the number, with no
  accessories until bought; kept with the career and its card.
- **The foot of every page**: the feedback bar now also in every mini-game, the career log and the
  achievement book, with the Developer fold beside it on every page.
- **Player tab**: staff, wardrobe and collection sit side by side under the three columns (they
  used to stack in the middle column with the sides empty); the wardrobe shows the kit picked on
  the Kits card; long visit buttons in the collection wrap instead of spilling (the luxury car's).
- **The dev deck's theme**: the theme and court are applied at the root (`components/Look.tsx`), so
  the deck keeps its own instead of keeping whatever the last card had set.

## Publishing: itch.io, with the community online

- **Where** (owner: "let's go with 2 [itch.io]. i do want to get community features activated
  tho"): the game goes on itch.io as a zip of the static build (`npm run build:itch`); the claude.ai
  page stays as it is.
- **The database: Supabase** (owner: "you can suggest connectors as well"). It has a connector, so
  the project, tables and rules can be set up from here; Firebase was the other candidate but has
  none. `supabase/migrations/0001_community.sql`: each player's best career per difficulty (all
  time and today), the Reality 99 hall, statues with one respect per player, the live feed and
  feedback. Players read everything a career card shows; nobody writes to a table: four checked
  functions (post a career, raise a statue, pay respects, send feedback) validate what comes in
  and limit how often. Feedback is readable only by the owner.
- **Anonymous players**: each copy keeps a random secret and the database stores only its SHA-256,
  so a row's owner cannot be impersonated from what the boards show, and no account is needed.
- **The live strip's player count** uses Supabase Realtime presence; the feed is read every 30
  seconds.
- **Three homes, one interface** (`ui/community.ts`): claude.ai's shared data, the Supabase
  database in the itch.io build, or the device alone when neither can be reached. The Supabase code
  is loaded only by the itch.io build, so the claude.ai page stays one file.
- **Unofficial fan game**: a line at the foot of the start page says it is not affiliated with or
  endorsed by the NBA, its teams or its players (it uses real teams and legends).
- Checked against a real Postgres 16 (the migration, every function's checks and the read-only
  tables) and with a stand-in client (`tests/online.test.ts`).
- **The back of the jersey** on the identity card (owner: "can you show the back jersey so that users
  can see number and name change?"): beside the player, the jersey laid flat from the back (a
  higher neckline), the last name in capitals across the shoulders (accents dropped, straight: an
  arch steps unevenly at this size) and the number big below, both following what is typed. A
  name longer than nine letters keeps its letters and shrinks to fit.
- **What a tab's dot was about** (owner: "if there's something new in another tab (orange dot),
  navigate user directly to the new feature... highlight it and put a 'got it' or 'ok'"): opening
  a tab with a dot reads its old key against the game now (`ui/tabNews.ts`) and takes the page to
  each change in turn, ringing its card with a note and Got it (`components/TabNews.tsx`): the OVR
  on the Player tab, new games or a new season on Season, a finished NBA season in the League tab's
  record book, new awards, tournaments or seasons on Records. The guide's tour waits while one is up.
- **Enter and Space in the guide** (owner: "pressed enter for got it but ended up skipping an event",
  then "make the got it of the guide disappear with both space and enter, prioritizing them over
  other actions"): while a guide step or a tab's note is up, Enter or Space presses its Got it and
  nothing else (caught before the game's own keys, the timing meters and any focused button); the
  button shows the key on a computer.
- **The half-season results wait** (owner: "some playoff games continue (closes screen) regardless of
  the user's click"): the ticker of games (playoffs included) used to close itself 0.9 s after the
  last result; now Continue takes the focus and the screen waits for it, except with Fast break or
  Sim mode on.
- **Plan cards** (owner: "letters overlap"): the title keeps clear of the number tag in the corner,
  and a picked plan's Main or Side tag wraps the title onto the next line instead of past the edge.
- **Music from the start** (owner: "the background music should be playing from the very start of
  the game"): the music switch is on to start (a player who turned it off keeps it off) and the
  loop plays everywhere but the mini-games, the intro and the start page included. Browsers keep
  sound off until the page is touched, so it begins with the first click or key. The dev deck
  starts quiet.
- **The database is live**: Supabase project "bench-to-rafters" in Seoul (owner's pick), made through
  the connector; the migration applied and checked on it as an anonymous player (writes through the
  four functions only, direct writes refused, feedback and rate limits unreadable). The advisor's two
  notes are by design: the four functions are the public write API, and the feedback and limits
  tables have no read rule. `.env.itch` holds its address and publishable key (both public).
- **Statue plaza cards** (owner: "make the player card much larger? make it popup in the middle of the
  screen, and exit when pressing space/enter (or a x mark on the corner)"): a tapped statue's career
  card opens large in the middle of the screen; Space, Enter, Escape, a pixel X in the corner or a
  click beside it closes it. The Reality 99 hall uses the same pop-up.
- **Pop-ups on a phone**: the sections' fade-in kept an identity transform after it ended (fill mode
  both), which pins a fixed layer inside the section: on a phone the plaza's pop-up backdrop covered
  only part of the page. The fade-in now fills backwards only, the pop-up is drawn on the page body,
  and the visual check flags any fixed layer inside a moving parent ("trapped").
- **Red letters on red** (owner: "again, red letter is invisible. try to look for similar bugs"): the
  "Delete for good" button took .btn.danger's red fill under .btn.ghost.danger's red text. Fixed, and
  `scripts/class-contrast.cjs` now draws every button, tag and chip class combination in the code in
  both themes: it also found the Main and Side plan tags (2.8 and 2.6:1 in the dark theme) and the
  red danger button's white letters in the dark theme (3.0:1), all fixed (`--bad-ink`).
- **The website: Netlify** (owner: "are there other ways to make game domains other than itch.io? i
  dont like it", then "let's go with netlify"): bench-to-rafters.netlify.app, made public through the
  connector (new Netlify sites start behind a team login). It builds from the GitHub repository on
  every push (`netlify.toml`), so updates need no uploads. The sandbox cannot reach Netlify, so the
  repository is linked from Netlify's own dashboard.
- **Community check on the website** (owner: "can you look through every community function and update
  it if it doesnt work? the send feedback option isnt really runnin"). Every database write was run
  with 240 real careers (80 per difficulty) on a local copy of the database, and the live functions
  were checked to be the same: boards, the Reality 99 hall, statues (bronze, gold, refused), respects
  and feedback all work. Feedback did arrive; nothing showed it. Fixed:
  - **The inbox reads the website's feedback**: the dev deck's Inbox asks for an inbox key once per
    device and reads the notes through `read_feedback` (`0002_inbox.sql`); the database keeps only
    the key's SHA-256, and players can read neither the notes nor the keys.
  - **A career the database put off is posted again**: it takes one career per player every 15
    seconds, and sim mode can end two sooner; the game tries again (and after a dropped
    connection), three times in all.
  - **Failed respects and statues say so plainly** off claude.ai (the "needs an invitation" line is
    a claude.ai matter).
- **On the court for the whole visit** (owner: "when the user enters the game, they are no longer
  treated as being 'on the court', so the number reduces"): the website left the live count when
  the strip left the screen. Every copy now joins the count when the game opens and stays until the
  page closes; two tabs in one browser are one player.
- **The dev deck in a tab of its own** (owner: "when i enter the dev deck, the tab reloads ... can we
  fix this?"): dev mode is read once when a page loads, so that the deck's storage never mixes with
  the game's, so the deck needs a fresh page. On the website it now opens in a new tab and the
  game's tab stays as it was; Back to the game closes the deck's tab. Inside the claude.ai page (a
  frame, which cannot rely on opening tabs) it still reloads.

- **Share the game** (owner: "can you add a share button throughout? as in share the link of the game,
  not the player card or anything"): a Share button in the top bar of the career and of the start
  page, at the top of the side pages (community, career log, achievements, mini-games), at the foot
  of every tab beside the feedback, and on the thank-you page. One pop-up: the website's link to
  copy (selected for a manual copy where copying is blocked), the phone's share sheet where the
  browser has one, and links that open a post on X, Reddit, Facebook, WhatsApp or an email. Plain
  text labels for the sites, no copies of their logos. The link is the website on every copy,
  claude.ai's included (`GAME_URL` in components/Share.tsx). Pixel icon (an arrow out of a box),
  the "sent" sound, Escape and a tap beside it close it, focus goes back to the button; the
  thank-you page's Enter (Play again) waits while it is open. Word of Mouth (Bench) for the first
  link sent; a guide card, a tour step, a dev deck card and a What's new entry.

## Round 28 (owner requests, with screenshots)

- **Regular guy too difficult** (owner: "analyze based on position, archetype"): 25 archetypes ×
  60 careers (smart policy, `scripts/archetypes.ts`). Positions were level; archetypes were not
  (mean peak 72.7 to 78.1), and the cause was careers running into their potential, not the
  starting cards (all within ±0.45 OVR of each other). A growth multiplier per archetype did
  nothing for that reason and was taken out. Instead each archetype adds a potential bonus at
  creation (`ARCH_CEILING`, 0.1 to 3.0; none in Built in a lab) and standard growth goes from
  0.94 to 0.97. The same grid after: mean peak 74.8546 → 76.1443, NBA 79.93% → 83.67%, All-Star
  37.87% → 41.80%, MVP 12.87% → 13.33%, Hall of Fame 15.00% → 16.13%, titles 36.80% → 39.93%,
  the spread between archetypes (SD of their means) 1.6835 → 1.1038. Random policy: 70.3335 →
  71.9285, NBA 73.53% → 77.47%, MVP 5.27% → 7.13%.
- **Start page:** the Random button at the top is gone (each field keeps its own; No Shortcuts
  still rolls everything).
- **Achievements in a career:** an Achievements button in the top bar opens the book from a career,
  with the count this career has earned; the book's "This career" filter puts those first, in gold.
  Each earned entry remembers its career (`seed-name`).
- **Nickname, then logo:** the nickname moment shows the name alone, in the pixel font (now the
  whole alphabet, digits and punctuation); the name card keeps a locked spot; the first brand deal
  draws the logo in a moment of its own. The nickname is news on the Player tab.
- **League tab in pictures:** standings as win bars of pixel cells with crests and a playoff line,
  leaders in points, rebounds and assists as bar charts with icons, award voting as bars, the last
  eight champions as their banners. The old leaders table is gone.
- **Team style:** set in a talk with the coach (both as the cute sprites, three speech bubbles, then
  the playbook). Enter or Space skips ahead, Escape closes; fast break and sim skip it.
- **3-on-3:** a big pixel word over the rim after each play. **Mini-game sound:** ten new sounds
  for the three-point contest (all net, in off the rim, off the rim, a brick, a money ball, on
  fire, the last five seconds, the buzzer) and the dunk contest (the slam, the judges).
- **Pixel art everywhere** (owner: "the bronze medal for olympics is not pixelated. any graphic that
  isnt pixels, change them"): the medal is a 16 × 25 pixel grid, the tab icons 12 × 12 grids, the
  timeline's marks and OVR line stepped, the radar built from cells (`polyCells`), 29 smooth
  gradients turned into hard bands, the last round dots squared. Duo and Big Three art use the
  cute sprites.
- **Duos and Big Threes end** when any of them changes teams: one moment says so; the teammate who
  stays starts over (bond up to 60); the one who left is dropped.
- **Small edges:** a talk with a staff member adds 35% of the member's yearly edge, once a season;
  a lifestyle item can be visited as often as he likes, and the first visit each season gives 3
  morale, 1 less wear and reputation for a public place.
- **Age and plans:** at 23 or younger, Grind, Spotlight and learning from a vet grow 8% more,
  injure 10% less, +1 morale; from 30, Recovery and Team first grow 8% more, injure 12% less, +2
  trust (Team first +0.2 team). The plan cards say "Young legs" or "Veteran".
- **Crunch time in a final** (owner: "let the user contribute ... on the last minutes of the final
  quarter (or overtime) ... basically play the 3v3 game but in the finals"): a final within 8 with
  two minutes left is played trip by trip: 8 trips of 15 seconds from his ball, then 6 for each
  overtime (up to three). Five plays on offense, four calls on defense, odds from his ratings,
  morale and the team gap (`CRUNCH` in balance.ts). A pixel arena court, 3 against 3, the clock,
  and a word over the rim after each trip; the Q4 column and the score count up together.
  Conference finals keep the old last shot. Fast break and sim simulate the postseason as before.
  The career counts crunch times played, won, won from behind and won in overtime.
- **Career log keeps ten** (like the saved careers), warning at nine. **Thank you for playing**
  comes every time a career is left. **What the career qualifies for** shows on the retirement page:
  the boards (rank today and all time, against real and house rows), the Reality 99 hall, a statue.
- **Number keys** pick a veteran role card.
- **The dev deck is a page of the game** (owner: "just like how the minigame page appears"): it
  opens in place, no new tab, no reload. Dev mode is a switch now (`mode.ts`); the storage prefix
  follows it (`storage.ts`), with the theme and the court shared (owner: "theme and court of dev
  deck should always be the same with the main game"). On the way in the game's last move is saved
  and its screen set aside; on the way out what the deck left waiting is dropped and the game comes
  back as it was (`devSwitch.ts`). The community, sound and achievements read the switch live.
  `scripts/dev-apart.cjs` now plays it as a player would: a career under way, the door, every card,
  Back to the game; the career comes back and no key of the game's changes.
- **End of round:**
  - Graphics: the finals court (`FinalsCourt.tsx`), the coach's office, the medal, the League
    charts, the nickname word; all pixel art.
  - Sound: a sound for each crunch-time trip (the clutch sting to start, the buzzer for overtime,
    swish, rim, block), the coach talk's chimes, the community note's award.
  - Fast break, sim and simple text: crunch time only comes with playable playoffs on; the coach
    talk is skipped in both; simple text hides the playbook's description.
  - Contrast and keyboard: the "You" tag on the finals court was 4.37:1 and is now dark; keys 1 to 5
    pick in crunch time.
  - Achievements: seven (Two-Minute Drill, Closing Time, Down but Not Out, Bonus Basketball, Ice
    Water, Brand New Look, Chalk Talk), 556 in all.
  - Events: none new; the round's systems already reach the story through moments (the logo, a
    group's end, crunch time).
  - Harness: `smartChoice` answers a crunch-time pick with the first call (the harness simulates
    the postseason, so it never meets one); the dev deck's crunch card plays to a final itself.
  - A duo that ends no longer re-forms with the one who stayed in the same season (found by the
    dev deck card): he starts over at a bond of 60 and grows from next season.
  - Dead code: 109 exports used only in their own file lost `export`; `.vote-list` CSS (the old
    award list) went.
  - Tests: tests/round28.test.ts (15 tests: age edges, staff and visits, Big Three breaks, the logo,
    the log, crunch time, the new achievements); tests/devtab.test.ts rewritten for the in-place
    switch.
  - Balance (1,600 careers, smart player, casual mini-games, against round 22's approved numbers):
    mean peak 75.3438 (74.4923, +3.03 standard errors), NBA 81.2500% (78.3%), All-Star 39.6250%
    (35.8%), MVP 13.6875% (11.9%), Hall of Fame 16.0625% (11.2%), titles 40.6250% (29.2%). Every
    number rose, as asked; titles rose the most. For the owner to decide. The balance test's band
    for undrafted-of-declared (smart policy) moves from 28–45% to 18–40%: 17.5% are undrafted now
    that more of them are good enough (it is the one band the easier ceiling pushed out).
  - Guide: the manual (crunch time, achievements in a career, the logo, staff talks, visits, age
    edges, duos ending, the coach, the League tab, the log of ten, the thank-you, what a career
    qualifies for, the dev deck in place); the tour has 109 steps (3 new).
  - Dev deck: 82 cards (crunch time, achievements in a career, a Big Three ends); the Catalog has
    the crunch-time calls, the coach's lines for each style, the age edges on plans and each
    archetype's ceiling bonus.

## Round 29 (owner requests)

- **Season and League in one tab** (owner: "not much incentive to using the season tab and league
  tab. combine them. just make sure the ones that are actually worth noticing are towards the
  top"). The order, most worth a look first: the team banner (place, record, streak, his numbers,
  the last ten as a form strip); the playoff bracket while there is one, with every series folded
  under it so the standings stay near the top; the standings as round 28's win bars, his
  conference first, beside the team's strength and its city and fans; the league leaders; his
  games; then last season's award voting, the champions' banners and the record book. The two old
  standings tables and the Season/Postseason switch are gone. The tab's dot also moves for a new
  NBA champion. Showing the bracket on the tab itself brought the visual check to its team marks:
  white letters on mid reds, oranges and silver read 1.6–4.3:1, so the marks and the champions'
  banner now take `badge()` (art/color.ts), the readable ink with the team colour nudged just enough
  for 4.5:1; the form strip's letters take a per-theme ink (`--good-ink`).
- **Extras tab** (owner: "let them view the four additional cards in the homepage (minigames,
  career logs, achievements, community). try to limit access to some (such as going into career
  log and continuing a career mid-career) to prevent bugs. this also means getting rid of
  minigames in home tab"). A fifth tab (key E) with the start page's four cards, under a banner of
  the mini-games open, what this career earned, and the log's cards and locks. Each page opens as it
  does from the start page and Back returns to the career. Kept for the start page while a career
  is on, and said so on the tab: the daily challenge (already shut in a career: it is a career of
  its own), deleting log cards (the log is for looking, downloading and locking from a career), and
  starting, continuing or importing another career (only the start page has Your careers). A dot on
  the tab when a mini-game opens, and the unlock note says to play it from there. The Mini-games
  card left Home; round 28's Achievements button in the top bar gave way to the tab (its card lists
  what this career earned), and so did the Records tab's copy of that card.
- **Career timeline:** round 28's pixel pass had drawn the OVR line as steps (across to each
  season, then up or down), and the owner liked the old line better. It runs straight from season
  to season again, drawn in fine square pixels (2 units, a 2-by-2 brush, as thick as the old 3-unit
  stroke) so it stays pixel art without the staircase (`lineCells` in art/pixel.ts).
- **Career log locks** (owner: "let him lock it so that we exclude that career from getting
  deleted. however, limit the number of locks to 5"): a locked card is never pushed out by a new
  career (the oldest unlocked one goes) and can't be deleted until unlocked. Five at most, so ten
  cards always leave five a new career can replace. The full-log warning names the card that would
  go. A padlock sound locks and unlocks.
- **Music** (owner, mid-round: "add more loop music to the game. especially for intro and thank
  you page, i want bright, cheerful music. minigames can each have one (except for lockdown), the
  offseason could have a different one from mid-season, high school, college, and each league can
  have one too"): 18 loops written note by note (`ui/tracks.ts`), played on pulse waves (a quarter
  and an eighth of the cycle, the old consoles' sound), triangle and sawtooth, with a kick, snare and
  hat, scheduled a little ahead of the audio clock so the beat stays even. Intro: Tip-off (C major,
  160 bpm); thank-you page: Curtain call (G major, 140); the start page keeps the round 25 loop
  (Locker room); high school, college (a fight song), the G League, Europe (a waltz), the leagues
  around the world (pentatonic) and the NBA each have one; Summer league plays in every offseason
  and in free agency at any level; Jersey night at the end of a career; the hub and the daily
  challenge's page share Arcade, and each mini-game but Lockdown has its own. Pages of their own
  (the log, the book, the community) keep the loop under them. Browsers stay quiet until the first
  click, so the intro has a Play the music button. The dev deck has a Music tab of its own, every
  loop with the icon of where it plays (owner: "add some icons to the music tab as well for
  distinction"), and the Catalog lists them with tempo, length and voices.
- **End of the round:** pixel icons for the Extras tab, its banner and the lock tag; the lock and
  unlock sounds and the loops; simple text hides the Extras tab's note; four achievements (Under
  Lock and Key, The Vault, Mixtape, Full Album; 560 in all); no new decision kinds for the harness
  and no new events (the round is screens and sound); the guide, Guide mode (113 steps: Extras,
  this career's achievements, the start page's keepers, the log's lock, the standings and
  leaders), What's new, the dev deck (84 cards: Extras, the log from a career, the Season tab in
  the playoffs) and the project summary.
- **Balance:** no engine change this round beyond the unlock note's wording, so the numbers stand
  as round 28 measured them (the balance tests run in the full check).

## Round 30 (owner requests)

- **Sim mode makes the turning-point calls** (owner: "for sim mode, can we even skip turning
  points?"). It takes the first choice that is not high risk. Four ways of choosing were played
  over 300 Shoot-for-the-stars sim careers each (the harness's smart player, the safest choice,
  the first not high risk, the first listed): mean peak 70.4337, 69.9237, 70.3369 and 70.2118,
  all within noise (SD about 11, standard error about 0.65); the one picked is the closest to the
  smart player. A sim career averages about 33 turning points it no longer stops for. Home lists
  each call since the last move, with how it went, in the result card's style; the player's own
  outcome keeps the main card. The list clears with the next move.
- **Comet** (owner: "for stars, can you make a hyper-fast mode (let's call it comet)? this
  employs fastbreak and sim ... 5~10 minutes, more towards the 5 minute bound", then "make
  balance changes or additional features to fastbreak and sim to achieve the 5 minute goal"):
  offered with Shoot for the stars, like No Shortcuts with Reality. Fast break and Sim locked on.
  A playtime model (`scripts/playtime.ts`) plays careers the way the game does and prices what
  reaches the screen: creating the player 75 s; team offers 12 s, the draft 8 s, a brand deal 6 s,
  retiring 6 s, any other decision 8 s; a stop between seasons 8 s; a story page 6 s; a list on
  Home 4 s; the end of the career 30 s. Plain sim on Shoot for the stars came to 7.8585 minutes
  (offseason stops 7.92, offers 4.68, brand deals 2.20 and 25.68 story pages a career). The steps
  tried, each over 200 to 1,000 careers:
  - auto brand deals, no stops between seasons, only intro, draft, finals and MVP pages: 3.7175
    minutes, too short;
  - plus award nights, breakthroughs and the logo as pages: 4.3714;
  - plus the brand deal back to the player and a stop for new focus stats: 6.6423 (a breakthrough
    opens new focus stats in 5.7 summers a career), too long;
  - without that stop: 4.9262;
  - plus storyline chapters as pages: **5.1875 minutes over 1,000 careers (SD 0.6977, median
    5.1167, 80% between 4.3167 and 6.0833)**, kept.
  So a Comet stops for where he plays (4.77 a career), the draft (about 1), brand deals (2.16) and
  retiring (1); the game takes the youth academy's call and never stops between seasons; draft
  night, award nights, finals, breakthrough seasons, storyline chapters, the nickname and its logo
  keep a page (14.37 a career); college commitments, tournaments and injuries go into a list of
  highlights on Home. Mean peak 87.9397, the same as plain sim's 88.2213. The career carries the
  Comet mark (top bar, career log, leaderboards), with four achievements: Shooting Star, Light
  Speed, Tail of Fire, Hall of Comets (564 in all).
- **End of the round:** the comet icon on the offer, the mark, the badge and the highlights; a
  comet sound for taking it; the guide (Sim, Comet, the quick-start line), Guide mode (Comet's
  offer, Sim's calls, the highlights; the No Shortcuts step no longer matches Comet's card), What's
  new, the dev deck (87 cards: Comet offered, a Comet career, Sim made the call; its fixtures can
  play as sim or as a Comet), the Catalog's challenges, the project summary. Settings' keyboard
  line said L for a tab that left in round 29; it says E now. No new decision kinds for the
  harness; the balance tests do not play sim, so their numbers stand.

## Round 31 (owner requests)

- **Text size and volume** (owner: "accessibility: do text size, volume sliders"): Normal, Large
  and Extra large in Settings. Every font size in the stylesheet (335 of them, px, rem, clamp or a
  variable) is written as `calc(size * var(--ts))`, and `--ts` is 1, 1.15 or 1.3 on
  `:root[data-text]`; sizes in em follow their parent. Sound effects and music each have a volume
  slider (0–100 in steps of 5) under their switch: each goes through a gain of its own on the way
  to the master gain, stored as `btr-sfx-vol` and `btr-music-vol`; Lockdown's beat follows the
  music's. Text size and volumes are shared with the dev deck. A screen reader pass was explained
  (labels for pixel words and icons, announcements, focus in pop-ups, charts as text, timing
  options, a run with VoiceOver and NVDA); the owner did not want it.
- **Undo** (owner: "undo last choice is great. It would be off for No Shortcuts and Comet so
  leaderboards stay fair"): every choice and step on Home and the offseason moves keep the game as
  it was; Undo on Home (or U) puts it back and says what it takes back. One step, and never for
  Rough Road, Comet, the daily challenge or an ended career (`canUndo`). Undoing keeps the count
  of achievements the career has earned (they can't be taken back). Take Two for the first.
- **Compare two careers** (owner: "comparing two careers looks good"): Compare on two career log
  cards sets them side by side (`ui/compare.ts`): the difficulty and tier, then peak, index,
  legacy, all-time rank (lower is better), Hall of Fame, titles, MVPs, All-Stars, NBA seasons and
  points, and retiring age (a fact, not a score). The better of each row is in bold with a ▲, so
  colour is not the only sign. Tale of the Tape for the first.
- **The summary by function** (owner: "you're still putting some things in the project summary by
  round. fix that. for example, comet isnt in settings at start"): every "Round N" heading folded
  into the chapter its function belongs to (Comet and Rough Road under the challenges at the
  start, and so on); the summary has no round headings now.
- **Rough Road** (owner: "can you name it rough road instead of no shortcuts?" and "rough road
  should also warn the user that their avatar is also completely random"): the name everywhere a
  player reads it (the offer, the mark, the banner, achievements, the guide, the summary); the
  flag stays `flags.oath`. The offer and the last step say the road picks his look too.
- **Leaderboards for Rough Road and Comet** (owner: "in community, add some more tabs for the
  comet and [rough] road"): five boards. A Rough Road career ranks on Reality's board and its own;
  a Comet only on its own, leaving the Shoot for the stars board to careers played by hand.
  Locally and on the shared page the boards are filters on the career's marks; online,
  `supabase/migrations/0003_challenge_boards.sql` lets `best_all` and `best_day` hold the two
  boards and has `post_career` file each career on its boards (and refuse a Comet that isn't
  Stars or a Rough Road that isn't Reality). It keeps the function's signature, so the website
  already out keeps working. Tested inside a block that rolls back: a Comet went to `comet`, a
  Rough Road to `reality` and `rough`, a plain Stars career to `stars`, mismatched marks were
  refused, nothing stayed. The house players were played again: ten for each of the five boards
  and six statues (`scripts/house.ts`).
- **The Extras tab** (owner: "i dont like the gap here. make the achievements visible when the
  user opens the book", then "also put the orange dot for new features (unlocked achievement,
  unlocked minigame)"): the Achievements card keeps only how many this career earned, so the four
  cards line up; the book, opened from a career, starts with what that career earned. The tab's
  dot now also comes for an achievement the career earns, naming up to three (the game keeps the
  count, `achN`).
- **The coach talk** (owner: "was this added? i cant seem to access it"): it was, but picking a
  style closed the style card at once (it can be set once a summer), and the talk was drawn inside
  that card, so it closed with it before anyone saw it. The talk lives with the offseason moves
  now and plays in full.
- **Simple text keeps the numbers** (owner: "even with simple text, i want to see the season stats
  ... but not in a way that it's visually exhausting"): simple text hid the whole season
  write-up, its stat board with it. One quiet line of averages stays above Home's main card: the
  half so far, the season just ended, or the last one.
- **A postseason said plainly** (owner, of the playoffs page: "not exactly sure what the results
  are here. be more apparent"): the line that said who won was the one Simple text hides. The page
  now leads with his team and its finish, then the champion, in big type and kept in Simple text;
  series read "winner beat loser 4–2" with the winner in bold and his marked W or L. The arena's
  ribbon read GOLD MEDAL GAME on every tournament page: PLAYOFFS for a postseason, TOURNAMENT for
  the others, MEDAL ROUND for the national team, with confetti only for a title or a medal.
- **The shop** (owner: "prices of shopping items should be way more inflated as the player's
  salary gets higher ... get rid of the limit, extend the number of items in the shop to 6, and
  just make them expensive enough for the user to barely purchase 2~3. but dont inflate prices
  too much. if the player is getting like 50 or above million a year, price of items shouldnt be
  a problem anymore"): prices are the sticker up to $1M a year of income (salary and brand deal),
  rising on a log scale to three times it at $50M (×2.177184 at $10M), rounded to two figures.
  The six are drawn around 42% of the bank each, so two or three fit; from $20M a year that
  share falls to 3% at $50M, where they all fit. No limit on buying. One from each shelf while
  shelves have something near his price (the round 25 rule), a second otherwise; an accessory is
  one of the six on 40% of visits, as they cost next to nothing. Tried at 30% of the bank first:
  3.5–3.8 fit, too many. Measured over 120 careers (`scripts/shopcheck.ts`): under $20M a year
  2.70–2.85 of the real items fit at once (two or three on 87–94% of visits); at $50M and above
  all six fit on 92.2%. Shopping Spree (four in a visit) and Cleaned Out (six).
- **End of the round:** pixel icons for undo, compare and text size (on the Undo button, the
  comparison and the Settings row); the undo and compare sounds; the stat line shows only in
  Simple text and Fast break's own recap carries the same numbers; Comet and Rough Road have no
  undo. Achievements: Take Two, Tale of the Tape, Shopping Spree, Cleaned Out (568 in all). No new
  decision kinds for the harness (it buys as long as a training, recovery or shoe item fits).
  Dead code: the Achievements card's chip list and its styles, the shop's three-purchase limit and
  its old stock, the book's "This career" filter (the section at the top replaces it). Tests:
  `tests/round31.test.ts` (undo and its limits, the boards, the shop's prices, stock and no limit,
  Compare, the Extras key, a postseason's outcome, the achievements and icons). Guide: Settings,
  Undo, Keyboard (U), Rough Road, Extras, the career log's Compare, the leaderboards, Simple text,
  a postseason's page, the shop; the tour has 122 steps (6 new). Dev deck: 91 cards (Compare two
  careers, the Rough Road and Comet boards, a playoffs exit); a card's press can be a list of
  controls now. The project summary, by function. What's new.
- Balance (1,600 careers, seeds 100003–101602, smart player, casual mini-games, against round 22's
  approved numbers): mean peak 74.8305 (74.4923, +1.16 standard errors), NBA 79.0625% (78.3%),
  All-Star 39.6875% (35.8%), MVP 13.6250% (11.9%), Hall of Fame 17.3750% (11.2%), titles 39.5625%
  (29.2%). The same careers with last round's shop: 75.0008, 80.6250%, 41.1875%, 12.9375%,
  15.4375%, 40.0625%; career by career the new shop moves peak by −0.1704 (−1.40 standard
  errors), the NBA −1.5625 points, All-Stars −1.5000, MVPs +0.6875, the Hall of Fame +1.9375
  (+2.80) and titles −0.5000. The rise against the approved numbers is last round's easier
  ceilings, not the shop. For the owner to decide.

## Round 32 (owner requests)

- **The locker room** (owner: "make it like a small rpg(?), where the user can use keyboard a, d to
  walk around and talk with the teammates and coach"): a pixel room on the Season tab (in Extras,
  so fast break folds it away), the starting five, two from the bench and the head coach at his
  door (`career/locker.ts`, `ui/components/LockerRoom.tsx`). A/D or the arrows walk, Space, Enter or
  W talks, 1–3 answer, Escape leaves; on a phone, buttons. The keys work only while the room has
  focus, so they never reach the rest of the page. Each teammate has a character from the roster
  (the youngest a rookie, the oldest a veteran, the best a star, the rest a joker, a quiet pro or a
  hothead) and two or three things to say; about half the halves a hothead starts a feud to settle.
  Once a half each. Talks move chemistry (capped at ±0.6 a season), mood, coach trust, now and then
  a rating or reputation.
- **The head coach** (owner: "make avatars of them, be able to fire them if the player reaches some
  amount of reputation"; then "can we give the coach a slightly bigger role?", picking temperament,
  Home and a role talk, the hot seat and coaching changes, with "fix or edit the original coach
  fired event", the avatars in the team style talk and the designs in the dev deck): every team's
  coach has a name and a temperament from the team and how many coaches it has had
  (`career/coach.ts`), and pixel art of his own (`ui/art/Coach.tsx`): a pose for each temperament
  (the hardliner folds his arms, the tactician holds a clipboard, the players' coach has his hands
  together), a suit with a tie in the team colour or a team tracksuit, grey hair or glasses on some.
  He stands in the locker room, the team style talk and a Home card (his trust in words; the player
  card keeps the number).
  - Temperament (`COACH.temper`): a players' coach +0.1 chemistry, a point of morale a half, trust
    swings ×0.8; a tactician +0.15 in the postseason; a hardliner growth ×1.05 in a half on the
    grind, trust swings ×1.25, a point of morale less. Listed with the season's team factors.
  - The role talk, once a season: yes lifts trust to the step where the role moves up; the chance
    is 0.3 + 0.012 a point of trust over 50, +0.15 for a players' coach or −0.1 for a hardliner,
    +0.15 near the top of the roster, between 0.05 and 0.9 (41.6% yes over 387 asks in 30 test
    careers). No costs trust (6 with a hardliner) and morale.
  - The old "Coach fired" event is the hot seat: only with his team under .400 after 12 games, the
    coach by name, and a firing is real (a new name and face; in the NBA a new coaching factor and
    team strength). Back him (he keeps the job with a chance of 0.25 + 0.005 a point of reputation,
    and trust +8 if he does), stay out of it (fired 60% of the time), or at reputation 60, tell the
    front office (trust starts at 55, chemistry −0.1, reputation −1).
  - NBA teams under .350 may fire their coach in the offseason (45%), before records reset; a new
    coach starts trust at 50. Coach of the Year: the team that beat its talent by the most (rank by
    wins against rank by strength); his own coach winning it is +3 trust, and a bigger club may try
    to hire him away (an event).
  - Firing him from the locker room (reputation 90, NBA, once a season): the new man is a little
    better than an average hire, trust 60, chemistry −0.4, morale +6, reputation −2.
- **The farewell tour** (`career/farewell.ts`): from 32 in the NBA, an offseason move announces
  next season as the last: morale +10, reputation +2, +0.5 in its postseason, six road arenas'
  gifts, the FAREWELL honour (2 legacy points) and a page, then he retires. The Records tab lists
  the gifts.
- **Record chases** (owner: "this could work as a simple warning system ... dont make it influence
  the game too much"; `career/records.ts`): Home warns when a season could carry him past a legend
  on the all-time scoring list (ppg × seasons × 72 games) or a career high nears a league
  single-game record. Chase it, once a season: usage ×1.05, injury minutes ×1.1, chemistry −0.1.
- **The announcer** (owner: "a person with a booming voice shouting breakthrough, block, 3 point,
  buzzer beater"): the browser's speech, pitched low and slowed down (`ui/announcer.ts`), for
  steals, blocks, stops, dunks, and-ones, threes, buzzer beaters, alley-oops and posters on the
  court, a title and a breakthrough on their pages. It follows the sound effects (off with them, at
  their volume) and has its own switch in Settings.
- **Love and the next generation** (owner: "dating (highschool crush/celebrity/...) to wedding to
  having a child ... the child is going to have similar attributes to the father ... never let the
  child have another generation ... a mini-addon to the father's player card ... their legacy
  points count towards the father's legacy points, but not fully"):
  - Love replaces the old baby event as a storyline (weight 1.1, a little above the others): a
    sweetheart, a celebrity or someone outside the game, then a proposal, the wedding (on a pixel
    garden scene) and a family, each step declinable (twice "not yet" at the proposal and it ends).
    Measured over 400 Regular guy careers each: saying yes at every step, 19.5% end with a child
    (Love starts in 22.5%, a wedding in 21.5%); answering at random, 8.25% (an early 40-career
    check had said about 30%). Then (owner: "make the first child half-half boy and girl, so it
    reduces the chances"): the first child is a girl half the time (`NEXT_GEN.girl`), and only a
    son plays a career of his own: a son's career now comes in 10.5% (42 of 400) of the
    yes-every-time careers and 3.75% (15 of 400) of the random ones. The birth says which.
  - After that career, the retirement page offers the son's career (`engine/nextGen.ts`): Comet
    speed, the father's difficulty (a lab father's son plays standard), number, hometown and
    country, his look with a haircut of his own. Height: the father's ±1.2 in, 6% of the time 3–6 in
    more or less. Potential: the father's −3 ±3.5, 6% of the time 7–12 off (up 35% of the time). In
    40 test careers, the 12 sons came out 0.33 in shorter and 2.5 potential lower on average, worse
    9 times and better 3 times. No third generation.
  - The son's career is never logged or posted on its own: 25% of his legacy points join his
    father's, on the father's log card (`attachChild`) and in his save (`kid`, counted in
    `legacyIndex`). The online boards rank by career index and keep the father's post as it was.
    The father's page, log card and career card show the son: peak, biggest honour, NBA seasons,
    points, MVPs, titles, All-Stars, and what he added.
- **The career card** (owner: "put the difficulty and challenge more deliberately, put in the icons
  of achievements"): the difficulty and the challenge as badges, the career index, the career's
  best ten achievements as medals in their tiers' colours, the best three by name, and the son.
- **The Records tab** (owner): the timeline first, then banners and rings, trophies and totals,
  career highs, the farewell gifts; season by season and the journal lower.
- **Saved careers in the career log** (owner: "i think they're pretty much the same function"):
  continue, look back, the career code, import and export moved from the start page to the career
  log; the start page keeps a Continue card for the latest career.
- **The Day one page could not scroll** (owner: "i cant scroll in the day one screen"): a moment's
  kind was a bare class, and the Day one moment ("intro") picked up the intro page's `.intro` rule
  (fixed, overflow hidden); Guide mode then scrolled it to its Continue button, out of reach of the
  title. Kinds are classes of their own now (`mo-intro`). Shipped on its own, ahead of the round.
  The visual check gained two checks: `stuck` (a full-screen layer that can't scroll with content
  past its edge) and pop-ups shot at screen size (in a full-page shot a moment's page was missed:
  none of them had been in the sheets).
- **Undo for every move** (round 31's bug): every remember() sat in `choose`, so the offseason
  moves had no undo; each move keeps its own now, with its label.
- **Achievements and more** (owner: "we might run out of them quickly. add more", and the
  checklist's items 5 and 6 as extended): 84 achievements (the book holds 652), counters for the
  round's systems in `flags` and device totals for the announcer, career cards, farewell tours and
  sons; nine events (a prank war, dinner at the coach's, a club after your Coach of the Year, the
  record watch, two farewell moments, an anniversary, a child's first game, a thank-you on TV), The
  protégé storyline after mentoring rookies, seven shop items, each event with a pixel icon.
- **Breaking a league record**: the sim's best shooting nights run hot. The threes record (14) fell
  in 6 of 30 test careers, so Record Breaker counts points, rebounds, assists, steals and blocks,
  and the threes record has its own achievement a tier lower. The sim was left as it is; the owner
  decides.
- **Smooth gradient backgrounds again** (owner: "for gradient backgrounds (for example, the
  marraige page background) they can be left unpixelated. it's actually one of the things i
  enjoyed before the game"): the 26 backgrounds round 28 had cut into hard bands are smooth again,
  as they were: the moment pages, the retirement stage, the position, archetype and lab stages,
  the story and duo art glows, the legend cards, the Hall's pop-up, the statue plaza, the place
  backdrops, the lifestyle visit and the thank-you page's text backing. The art on them stays pixel
  art, and so do the meters (duo chemistry, the streetball shot meter) and objects drawn in CSS
  (the Hall's plank, the statue plinth, the courts' horizons). CLAUDE.md's pixel rule names the
  exception.
- **A second child, not a stray baby:** the old "A new baby" event still came up for any player
  from 23, partner or not, beside the new Love storyline. It is now a married player's second
  child (a daughter), once a career, two years or more after the first.
- **End of round** (the checklist):
  - The coach events crashed the balance run: an event asked while he had a team is answered
    after he has moved on, and its choices are worked out again then (`resolveEvent`), with no
    team. Dinner at the coach's, the club after his Coach of the Year and the hot seat now answer
    plainly when he is between teams (a test plays each one that way).
  - Graphics: a pixel garden for the wedding; icons for the coach card, the locker room, the
    record watch and the family; the coach in the team style talk. Sound: a knock on the coach's
    door, a family chime. Fast break folds the locker room away; sim never stops for it; simple
    text hides the coach's temperament line and the son's description.
  - Guide: the locker room, the head coach, the record watch, Love, the farewell tour, the career
    card, the next generation, the announcer, the Records tab's order, saved careers in the career
    log, more than 650 achievements. Guide mode: steps for the locker room, the coach card, the
    record watch, the farewell move, the son's offer, the announcer switch and the saved careers;
    the start page's Continue step points at its new card.
  - Dev deck: 13 new cards (109 in all); the Catalog lists the locker room's characters, the
    league records and the all-time scoring list, and the farewell gifts beside the coaches (26
    lists). The project summary has the round's systems in their chapters; its events chapter is
    built again from the code (177 events) with the knock-on list.
  - Tests: the round's engine logic (the coach, the role talk, the hot seat, coaching changes,
    Coach of the Year, the locker room's cap, the farewell tour, record chases, every new event on
    a real NBA season, the book's ids and names). Two old problems: the recruit test read a
    scouting board from before an earlier recruit (it now reads the board as it is), and three
    long tests held the worker for minutes, so vitest's own messages timed out and the run failed
    with every test green (they now pause every few careers).
- **The live strip carries house players** (owner: "i want the game to be more popular. to do that,
  i want to make it seem popular"; asked for real visitors plus a random number, with the real
  values in the dev deck): simulated players are added to the two numbers, the way the boards and
  the plaza already carry house players, and the strip says "House players included" in its
  bottom-right corner (owner's placement). A label-free version was declined: it would show every
  visitor a count that is mostly made up. The court follows the clock (`ui/houseLive.ts`), the same
  for everyone at a moment: about 300 to 1,500 over a day, lowest around 10:00 UTC and highest around
  22:00, moving every four seconds. Careers ended since the page opened rise toward 0.6 of the court
  then, never above 299, over about forty minutes (7 after a minute, 35 after five, about 230 after
  an hour), so they never go down and always stay below the court. The dev deck's header shows the
  real numbers: on the court now, careers ended since the deck opened, and the last 24 hours.
- **The locker room's hint on a phone**: the visual check found "Click to walk in · A and D to
  walk, Space to talk" cut off on a phone with extra-large text. A touch screen has no keys there,
  so it now reads "Tap to walk in, then use the buttons", and the hint wraps when it must.
- **The dev deck would not open** once the summary had been rebuilt: the knock-on list's items were
  written as plain strings where the deck expects label-and-text pairs. Fixed, with a test on the
  summary's shape.
- **Balance** (1,600 careers, seeds 100003 to 101602, the smart player with casual mini-game play,
  after every change above but the first child's sex, which adds one random draw to careers that
  reach a baby and so moves them only by chance): the round moved nothing that can be told from
  noise.

  | Measure | Round 22 (approved) | Round 31 | Round 32 | Against round 22 |
  |---|---|---|---|---|
  | Mean peak OVR | 74.4923 | 74.8305 | 74.7118974 | +0.2196 (+0.75 SE) |
  | Reached the NBA | 78.3% | 79.0625% | 78.5625000% | +0.2625 pts (+0.26) |
  | All-Star | 35.8% | 39.6875% | 40.6250000% | +4.8250 pts (+3.93) |
  | MVP | 11.9% | 13.6250% | 13.3125000% | +1.4125 pts (+1.66) |
  | Hall of Fame | 11.2% | 17.3750% | 17.9375000% | +6.7375 pts (+7.02) |
  | Won a title | 29.2% | 39.5625% | 41.6250000% | +12.4250 pts (+10.08) |

  Against round 31 every line is within about one standard error (titles +2.0625 points, +1.18).
  The second child's change alone, career by career against the run before it: peak −0.0366
  (−0.82 SE), titles +1.0625 points (+1.04). The gap to the approved numbers is the earlier
  rounds', as reported in round 31; the owner decides.


## Round 33 (owner requests)

- **New career says the career is kept** (owner: "on new career, can you add that the user can
  continue that career in career log? i think users might be hesitant to leave if they arent
  aware"): under the New career button in Settings, before any tap, "This career stays saved in the
  career log: continue it there any time"; the confirmation says the same (it still pointed to "Your
  careers on the start page", which round 32 moved into the career log). A daily challenge, which is
  never saved, says so instead. Guide mode's step for the button says it too.
- **What's new in the dev deck** (owner: "make the what's new accessible in the dev deck"): a
  section of its own beside the Inbox, with every update players have been shown, newest first
  (the start page shows only the latest), and a button that opens the pop-up as players see it.
- **The announcer on the sound board** (owner: "the sounds from the announcer ... add that"): all
  twelve lines, each with when he says it. The deck plays him even with the game's sound off, and
  does not count those calls toward the device's total (the deck never touches the game's own
  storage; scripts/dev-apart.cjs checked).
- **The son's career, a heads-up** (owner: "give a quick warning that it will be played in sim &
  fast break mode"): beside Play his career, shown in simple text too: Sim and Fast break locked
  on; the game makes the routine calls and the turning points; he still picks where his son plays,
  the draft and when he retires.
- **The Season tab's order** (owner: "move up the locker room to the top ... the team strength and
  team culture+fan culture side-by-side ... right below the locker room, and then the standings"):
  the locker room, then team strength beside the city and its fans (one column on a phone or when
  there is no city), then the playoff bracket while there is one, then the standings.
- **The level engine** (engine/levels.ts, ROADMAP in balance.ts). One flag on the career says which
  level it is; `allows` is asked wherever a system starts, so a career of the full game is
  unchanged.
  - Every level starts on the first page of a high school senior season (the first three years are
    played for him with plain, safe calls) and ends after its NBA seasons: 5 in beginner, 6 in
    intermediate, 7 in advanced.
  - Below advanced, the player is American and only colleges and NBA teams call. If nobody else
    calls, the G League; if not even that, anyone, so a career is never stuck.
  - Every level plays at fast break's pace, but keeps its own season plans, its shop and, from
    intermediate on, its playable playoff games. Without that pace, intermediate took about 15
    minutes and advanced about 20.
  - Contract talks: none in beginner; intermediate, its first NBA deal past the rookie scale;
    advanced, every deal.
  - Beginner's one playable moment: the last possession of the first NBA playoff game he plays, down
    one with the ball if the game was not already close. 39 of 40 test careers got it; the other
    never made the playoffs.
  - Measured with the playtime model and the harness's smart player, 200 careers a level:

    | Level | NBA seasons | Play time (mean, 10th–90th) | NBA All-Star | Mean peak |
    |---|---|---|---|---|
    | Beginner | 5 | 6.0510 min (5.7167–6.4167) | 85.5% | 83.5444 |
    | Intermediate | 6 | 10.2490 min (9.6500–10.8500) | 87.0% | 85.8237 |
    | Advanced | 7 | 13.0310 min (11.9500–14.0833) | 88.0% | 84.0029 |

    Advanced leaves about two minutes of its fifteen for the tutorial guide.
- **The way out** (owner, during the round): every device starts in the tutorial whatever it has
  saved. A Skip button in a corner of the tutorial asks for the exit code (the owner changed it so
  it does not hint at the dev password). The graduation page shows the code, so a graduate can
  skip on another device. The check is against a hash; the code is in the game too, lightly
  encoded, because the game has to show it.
- **The tutorial's pages.** Every device opens on the beginner career (old saves wait). Then the
  road map: a pixel map of high school, college, the NBA arena and an island across the sea, the
  player's car driving to the next stop, a boat to the island, and the bucket list as a chunky
  pixel scroll in the top-right corner (owner: "a more paper vibe ... more roughly pixellated").
  Each level's start page has fewer steps, and intermediate and advanced show what they add as
  big pixel icons with a word or two (owner: "use a lot of icons and little text"). A level's end
  page: the goal reached or missed (the sad ending plays "So close"), then the thank-you page.
- **The island.** Every mini-game once at C or better. The marks follow each game's career-bonus
  tiers (C is the first score that earns a bonus): three-point contest 13 points, dunk contest a 35
  dunk, the lab a peak of 80, Legends the conference finals, 3-on-3 a loss by 3 or less, Lockdown
  its own C, Front Office one playoff trip (owner). Approved by the owner at the end of the round
  ("yup"), with the device staying free for good once the tutorial is finished or the code entered.
- **The tutorial guide** (tutorial/lessons.ts, 104 lessons): one control at a time, the rest of
  the page shaded and deaf; a lesson to read waits for Got it, a lesson to do waits for its control;
  no skipping, only the exit code. Guide mode stays as it was, for after the tutorial, and keeps out
  of the tutorial.
- **The closing tour** (tutorial/closing.ts): after advanced, careers staged by the dev deck's
  player for every system no level has, and a catch-up for whatever the player's own levels never
  showed; stops whose lessons are all done are skipped. Tour careers are kept nowhere. It ends on
  the graduation page (the diploma shows the exit code), then the full start page with a Regular
  guy career marked as recommended.
- **The Levels card** on the full start page opens the road map to play a level again.
- **Full Album** stays at 18 loops: the tutorial's two (Road trip, So close) are left out.
- **End of round 33** (the checklist, in its order):
  1. Graphics: each level's place cropped from the road map (its school, the college, the arena,
     the island) on the level's start page, its stop on the map and its end card; a mortarboard for
     graduation; five event icons and five shop icons.
  2. Sound: the car's engine and horn, the boat's horn and the sea, a pencil tick for a lesson
     done, a graduation fanfare; the exit code plays the unlock sound, a level's end card the award
     or the loss.
  3. Fast break, sim and simple text: the levels already play at fast break's pace and switch
     Simple text off; outside the tutorial, Simple text hides the road map's explanations and keeps
     what is locked.
  4. Contrast and the visual check: every class combination passes AA in both themes (the bucket
     list's tag got a paper background of its own). The visual check had a bug of its own: on a
     computer it left the page scrolled to its foot before the shot, so a tall page's sticky header
     sat across its middle. It now scrolls back first; round 32 was shot again the same way as the
     baseline (110 screens in each of four set-ups, clean). The full run of round 33 (127 screens in
     each) found one real fault and one of its own: a legendary season's band left white letters on
     a mid red (Atlanta, Portland: 4.34:1), now darkened just enough the way the bracket's team marks
     are; and the lesson layer's shade counted as a bar at the foot of the screen, now left out of
     that check. The re-shot screens are clean. The screens that changed against round 32 are the
     new ones, the start page (the Levels card), What's new, and careers that played out
     differently with the new turning points. The storage check (dev-apart) now starts from a
     device that has finished the tutorial, as an old player's would have: clean.
  5. Achievements: 28 more (680 in all), on the owner's word: efficiency (a perfect night from the
     field at 10, 13 and 15 shots, 15 free throws without a miss, 8 and 10 threes without a miss, 50
     points on 20 shots or fewer, a triple-double without a miss, 50-40-90 at 25 a game, 70% and
     74% true shooting, 50% from three on seven a game, 65% from the field) and nights so bad they
     are hard to have (0 for 10, 12 and 15; 0 for 12 from three; 0 for 5 at the line; 12 and 13
     turnovers; 35 minutes without a point; a season under 40% on ten shots a game; a team that
     wins 15 or 10; an OVR of 25 or 18; retiring at a peak of 40 or lower; drafted and gone without
     an NBA point). The book now keeps each career's single-game extremes (career/marks.ts). Every
     mark was measured over 750 careers of the smart player first. Some ideas never happened in any
     of them and stayed out: a 60-50-90 season, a season under 30% from the field, 95% from the
     line, and 10 OVR (the owner's example; the lowest seen was 16.6).
  6. Events and shop items: five turning points (a 1-for-14 night, the ball from a perfect night,
     an underhand free-throw routine, the analytics report on his shot chart, a front office that
     wants him to sit) and five items (a shot chart poster, a free-throw specialist, a
     ball-security camp, a framed box score, a gold-painted brick).
  7. Harness: no new kind of decision; the levels reuse the full game's.
  8. Dead code: an unused lesson lookup, an unused ink colour and four exports nothing else used.
  9. Tests for the marks, the new achievements, events and shop items; then the full checks.
  10. Balance (1,600 careers, seeds 100003 to 101602, the smart player with casual mini-game
      play):

      | Measure | Round 22 (approved) | Round 32 | Round 33 | Against round 22 |
      |---|---|---|---|---|
      | Mean peak OVR | 74.4923 | 74.7118974 | 74.6172649 | +0.1249649 (+0.43 SE) |
      | Reached the NBA | 78.3% | 78.5625% | 78.0625000% | −0.2375 pts (−0.23) |
      | All-Star | 35.8% | 40.6250% | 40.0000000% | +4.2000 pts (+3.43) |
      | MVP | 11.9% | 13.3125% | 13.0000000% | +1.1000 pts (+1.31) |
      | Hall of Fame | 11.2% | 17.9375% | 16.2500000% | +5.0500 pts (+5.48) |
      | Won a title | 29.2% | 41.6250% | 39.6875000% | +10.4875 pts (+8.57) |

      Against round 32 every line is within about one standard error and every one moved a little
      toward the approved numbers; career by career (the same seeds), the Hall of Fame moved most,
      −1.6875 points (−2.38 SE), as the new turning points take turns from older ones. The gap to
      the approved numbers is the earlier rounds'. The owner's call: no balance change (“dont think
      balance is needed. we can publish now”).
  11. The manual has a chapter on the road map (the levels, lessons, the island, the closing tour,
      graduation and the exit code, the Levels card), the achievement count and the new kinds, and
      the shop's 208 items; Guide mode has a step for the Levels card.
  12. Dev deck: a Tutorial suit of 17 cards (127 in all). The deck can now show the tutorial: a
      card puts a road of the deck's own on screen, never saved, and three of them show the lessons
      (the deck mounts the lesson layer, and its own bar stays above it). The Catalog has five more
      lists (31): the road map's levels, the island's marks, every lesson, the closing tour's stops
      and beginner's turning points; its events now include rounds 32 and 33.
  13. The project summary has a new chapter 2 for the road map; the balance check, the turning
      points (182), the shop, the achievements (with the marks and how often each happens), what a
      device keeps and the dev deck are brought up to date.


## Round 34 (owner requests): simplification

- **The intro on every visit** (owner: "the intro page should always appear before anything"): it
  plays before the start page or the road map on every visit, not only the first; Start, Enter or
  Escape goes on, and the Intro button still plays it again. The dev deck skips it.
- **Skip tutorial at the top** (owner: "put the skip the tutorial door on the top next to share
  instead of the bottom. i want it the same as before (feedback-share-dev)"): a Skip tutorial
  button beside Share in every top bar while the tutorial is on, opening a small pop-up for the
  exit code; the foot of every page is feedback, share and the dev door again.
- **The road map's cards pop out** (owner: "instead of putting the cards bellow the map, make it so
  that when the user clicks on the buildings, or use the arrow keys to move around, the cards pop
  out"): the map opens clear, a pixel pin on every place (done, next, open, locked; the next one
  hops). Clicking a place or driving there with the arrow keys pops its card out beside it; Enter
  opens the card where the car is, Escape folds it away; the focus follows the car. The closing
  tour has a place of its own on the map, a stage. On a phone the card sits under the map.
- **One career log** (owner: "integrate the saved career system into the career log and get rid of
  it"): the separate saved-careers panel is gone. Every save is a card: in progress first
  (Continue, Code, Delete), then the finished careers' cards (Look back while the save is still on
  the device, Code). A career's card keeps the slot of its save, so the two are one entry; older
  saves are matched by name and difficulty. Deleting a card deletes its save. With all ten slots
  taken, a finished career's save makes room before one still going.
- **Regular guy's challenge** (owner: "put the levels (tutorial) card on the main page as a pop out
  challenge for regular instead of putting it next to minigames and career log"): picking Regular
  guy on the start page pops out "Back on the road map?", which opens the road map; the Levels card
  among the start page's four is gone.
- **Continue and Look back land on Home** (owner: "when i look back or continue from the career log,
  it doesnt instantly direct me to the career's homepage ... if i am looking back, i should have
  easier access to leave that career"): both open the career on its Home tab, wherever they were
  pressed; a career looked back on carries a bar along the top ("Looking back", whose career, and
  Leave: back to the career log).
- **A bigger announcer** (owner: "i dont really like the announcer voice. can you find a much more
  booming one?"): the deepest English voice on the device, the natural (neural) male voices first;
  a natural voice keeps its depth (pitch 0.55, rate 0.8), any other goes to the floor (pitch 0.1,
  rate 0.78); a breath before the big word ("From... downtown!"); and under every call the arena
  (sound.ts 'boom': two sine sweeps from 92 Hz down to 38 Hz, the second an echo at 0.32 s, and a
  crowd swell). A recorded voice was the bigger step: a free speech engine (Kokoro, Apache) with deep
  male voices, downloaded once to make the clips. This session's safety check refused the download,
  so it waits for the owner's permission (ROADMAP).
- **Cards that fold** (owner, round 33: "for round 34, the theme is simplification. we're gonna make
  most in-game cards foldable"; round 34: "keep them all open by default, folds stick per device").
  A card with a title folds from it (a button with a pixel chevron); a card built by hand (the
  coach, the scouting report, How you play, the MVP race, the duo, the rivalry, the fan talk, the
  locker room, the city and fans) has a small tab astride its top edge, placed in the card's padding
  so it never covers what the card shows, and folds to a strip with its icon and name. A card that
  has nothing to show leaves no strip. Always open: the main card, To do, the player card, the
  offseason moves, the career card. Folds are one list on the device (`btr-fold-v1`); the dev deck
  keeps its own and deals every card open. Around the league keeps its own fold (round 15), with
  the same pixel chevron. The levels and the tutorial follow the same folding; a lesson whose
  control is in a folded card waits until it is opened (ROADMAP).
- **End of the round** (owner: "i think round 34 could end with this. do the end of round list.
  because there arent any changes in game, dont run the balance check"; then "go all the way to
  publishing"):
  1. Graphics: pixel icons for the five new turning points (a chalkboard of four plays, a VHS tape,
     the announcer's microphone, a taped box, a target), a rewind for Look back (its bar and the
     manual), a folded card for the manual's folding section; the five shop items use existing
     icons (a book, finishing, the grind, the microphone, the locker). The closing tour's stage on
     the road map was drawn during the round.
  2. Sound: the fold is a click, the road map's places a tick, the arena under the announcer
     ('boom', on the sound board); Leave and Skip tutorial turn a page.
  3. Fast break, sim mode and simple text: no new career screens; simple text hides the
     explanations on the career log and Regular guy's road map card.
  5. Achievements: 30 (710 in all). Twenty for a career (simple math: your age or your jersey
     number in points, exactly 20.0 or 10.0, the same average twice, a palindrome or a round
     career total, a 41–41 team, three seasons up or down; the fundamentals: Pure Scorer,
     Selfless, Sure Grip, Line Dancer, Quiet Ring, Back to Basics), measured over 300 careers of
     the smart player; the first tries for four of them never happened and were set again from the
     spread of 1,332 NBA seasons. Ten for the round's pages (folds, Look back, Continue, every
     stop on the road map after the tutorial, visits), from new totals the device keeps.
  6. Five turning points (Four plays, The old tape, Your own call, Too much stuff, One move) and
     five shop items (a career scrapbook, a one-move coach, fundamentals camp, dinner with the
     arena announcer, a minimalist locker).
  7. Harness: no new decision kind (the turning points are events, which smartChoice already
     handles).
  8. Dead code: the saved-careers row styles and a page-grid rule unused since round 33's Season
     tab; two exports used only in their own files.
  9. Tests: tests/round34.test.ts (the book's ids and names unique, the pages achievements from
     the totals alone, simple math on a real NBA career, a palindrome and a round career total,
     every new turning point offered and resolved, the shop items with icons, and the project
     summary's blocks in the shape the dev deck reads: a list item written as plain text instead of a
     label and its text stopped the whole deck from loading during this round's visual check).
  10. Balance: not run, at the owner's word (no change to how careers play).
  11. The manual: Saving, Folding cards (new), the road map's pop-out cards, Continue, the intro on
      every visit, the announcer, the career log, Looking back (new), the book's size, and an
      eighth quick tip; Guide mode has steps for the fold tab and the Look back bar.
  12. Dev deck: a card for Home with cards folded, one for Look back (round 34, during the round);
      the road map's cards press the next place; the Catalog lists round 34's events by theme.
  13. The project summary: the road map's pop-out cards and the stage, the turning points (187),
      the shop (213), the career log, the achievements (with how often each happens), cards that
      fold, the announcer, the intro, what a device keeps and the dev deck (129 cards).

## Round 35 (owner requests): multiplayer

- **The dev deck's real numbers** (owner: "real numbers of user in the dev deck doesnt seem to
  work (not sure) just verify it works"): they did not. The deck's community is its own (this
  device's, so it never posts to or reads the real one), and the Real numbers line read that, so it
  only ever counted the deck. It now reads the real community, read only (community.ts watchReal):
  on the website, the presence channel watched without joining it (so the deck is never counted and
  never uses the player's identity) and the feed; on the claude.ai page, the room's visits that
  joined the court and the shared feed; a copy with neither says there is nothing real to count.
  The website's feed held 11 careers, 3 in the last 24 hours, when checked.
- **Skip tutorial mid-tutorial** (owner: "the skip button of the tutorial doesnt appear. let users
  skip mid tutorial if possible"): the lessons shade the whole page but one control, top bar
  included, so the button was dimmed and could not be pressed for almost the whole tutorial. The
  lesson layer now has its own Skip tutorial, fixed to the top-right corner above the shade (the
  top-left when the control is in that corner); its pop-up opens above the lesson and takes its
  keys. The exit code is still what skips (the owner's round 33 design). The note's own "Have the
  exit code?" link went, so there is one way out.
- **The career code, explained** (owner: "how the import/export code works? is it that a code line
  is added when the user makes a choice"): no. Code packs the whole career as it stands (gzip, then
  base64, after BTR1.); 12 finished careers measured 149,803 to 192,599 characters. The project
  summary has a section on it.
- **Import for devs only** (owner: "let's put the import function exclusive to devs. i dont want
  people abusing the export codes"): a code has no signature, so an edited one could carry made-up
  ratings or honours to the boards. The import box shows only in the dev deck, and the store refuses
  an import anywhere else. Players keep Code, to send the maker with a bug report.
- **The tutorial is the beginner level** (owner: "make only the beginner level of tutorial
  necessary. once the user graduates from it, they get the key and gain access to the main game.
  but, can you lock the other difficulties ... also lock minigame"). Graduation follows beginner;
  the full game opens with Regular guy. The owner's answers: one mode per stop (intermediate opens
  Reality hits hard, advanced Shoot for the stars, the island the mini-games, Built in a lab with
  them since it is one); the exit code opens what beginner does; a device that finished the old
  tutorial keeps everything (the road's first load sets a version and `all`). Locked cards on the
  start page say which stop opens them; the road map's cards and a level's last page say what
  they open. In the dev deck everything is open unless a card previews the tutorial.
- **Multiplayer: Play with friends** (owner's picks: Draft class with friends, Challenge a friend;
  an invite code or link and quick match; "i want the multiplayer under regular guy"). Both are
  asynchronous. A career now keeps its start (seed and start page; `GameState.start`) and what it
  is to friends (`GameState.mp`).
  - Challenge a friend: from the last page of a finished Regular guy career, a six-letter code (no
    I, O, 0 or 1) and a link (`#challenge-CODE`). A friend plays the same prospect from the same
    seed, with no undo; every answer is ranked beside the career that set it by career index, a
    player's best counting. Quick match lists others' challenges of the last 30 days, the least
    answered first.
  - Draft class: up to 8 friends start Regular guy careers on one seed. The class is made or joined
    as the player starts (its seed is his career's). Each finished season sends a short line, each
    finished career its card: standings (best rating so far, then honours), every season side by
    side, the best of the class each year. Quick match lists classes of the last 14 days with a
    seat left.
  - Players pick a name for friends; the game keeps no email or login (the anonymous secret of the
    online community). A prospect from another player is checked before it is played (only what
    the start page can pick, a rerolled card within reach of its archetype's, Regular guy), so a
    challenge cannot carry a made-up player onto the leaderboards. Posts wait on the device until
    the server takes them.
  - Where: the website and itch.io, on the game's database (supabase/migrations/0004: four tables
    no player can read or write directly, twelve checked, rate-limited functions). The claude.ai
    page cannot reach that database, so it points to the website. The dev deck plays on a stand-in
    on the device, with house players.
  - Measured on the dev server: a challenge started on its prospect's seed (108) with no undo; a
    class made, its seed given to the career (849007920), the first season's line in the class.
- **A board beside a career with friends, and off the community's** (owner: "for the multiplayer, a
  leaderboard should always appear on the side. the career played in multiplayer wont be counted
  towards the real leaderboards in community"). A challenge or draft-class career shows its board
  on every tab: at the top of Home's side column, and beside the other tabs and the career's last
  page (sticky on a computer; above the tab on a phone). It never folds. It holds this career as it
  stands now (its index so far for a challenge; its seasons so far for a class, ahead of the
  server's copy), and refreshes after each season and every minute. Such a career is never posted
  to the community (boards, feed, statues, the hall), and its last page shows its own board instead
  of what it qualifies for there.
- **Achievement categories** (owner: "add catagories for achievments (very brief so that it doesnt
  reveal too much about it ... right now, there's so much achievements but too hard to look at)"):
  13 categories, a short name and an icon each, none over a tenth of the book; chips under the
  tiers (each with what is earned of it), combining with a tier and Earned or Still a riddle; the
  full book reads in chapters, one a category.
- **Free-throw percentage** (owner: "add free throw percentage to the game, with events and other
  stuff that helps it. this is mostly for the 50-40-90 achievemnet"): a hidden free-throw touch (it
  starts from his shooting, grows with every season of reps, and faster with the shooting plan, a
  shooting summer, a shooting coach, three turning points at the line and shop items) adds to the
  FT% his shooting gives. FT% shows on Home, Records, the game log and the season tables; the touch
  has a meter on the Player tab. Over 600 smart careers the mean FT% stayed 0.8004567 to 0.8006348
  and 50-40-90 seasons went from 1.0% to 3.0% of careers; a shooter who builds his touch on purpose
  reached it in 37% (100 careers): the lever is the shooting plan's touch, for the owner.
- **Shooting ages** (owner: "the shooting barely gets affected by age ... make shooting drop as well.
  just level it to similar levels of other stats, no balance check needed"): shooting declined at
  half the rate of the other ratings; now at the same rate (basketball IQ keeps its slower one).
  Over the six-year decline table a small forward's shooting now loses 19.21569 points, not
  10.37037; the OVR he loses is the same.
- **Shop prices up 30%** (owner: "increase shop item prices up a bit again (about +20~40%?)"): every
  price, and the price the six are drawn around, times 1.3, so the same things come up and each costs
  more against his bank. Over 400 visits: at $4M a year and a $6M bank, 2.727500 items fit, now
  2.375000 (the mean item 20.3% dearer); at $12M and $30M, 3.295000 now 2.630000 (29.1%); at $60M
  nothing he can afford changes.
- **Friends in each other's careers** (owner: "can you add multiplayer specific features? for
  example, each user can send a rivalry to one other, and if they accept, they become draft rivals.
  their dynamics when they meet should be more deliberate. if two users join the same team, they can
  form duos (or a big three if three are in the same team) try to make a chat below the leaderboard
  so that the users can communicate"). Each friend's career is played on their own device, so
  before each season the side board copies the class's season lines into the career
  (`GameState.mp.friends`, with the rival pick in `mp.rival`), and the engine reads only that copy:
  the same copy gives the same career. A friend is where their line for this year says, or a season
  behind, where last year's says.
  - **Rivals**: each member of a class picks one classmate from the standings (Send a rivalry; Sent,
    take back; Accept the rivalry when one has picked you); two who pick each other are rivals.
  - **Rival nights**: once a season, when the two are in the NBA on different teams, their meeting is
    a turning point that is never left to chance (it is queued before the season's random ones):
    guard them yourself, outscore them, or play it like any other night. The odds start at a half,
    move 3 points for each point of team strength and 1.2 for each point of OVR between the two, plus
    1 or 2 for the call, between 15% and 85%; both players' points come from their season so far.
    The record (the last 30 meetings) is on the side board and in the career.
  - **Duos and Big Threes of friends**: a classmate on his NBA team for a season is a duo, two are a
    Big Three, formed the first season of their run together. A friend counts only when the career
    has no duo or Big Three of its own (or as the third of its own duo), with the duo's usual edge,
    and a moment marks the season it forms.
  - **The chat**: one for each challenge and each class, under its board (on the Play with friends
    page and beside the career), for its people only: a class's members; a challenge's maker, the
    friends who have started it and those who have answered it. 200 characters a line, a line every
    3 seconds and 300 a day; a room keeps its latest 200 lines and shows 50. New functions in
    `supabase/migrations/0005_multiplayer_friends.sql` (tested on a local Postgres with two players
    and a stranger, who reads nothing and posts nothing); the dev deck's stand-in has a classmate who
    has already picked you and a chat with a few lines.
  - Five achievements (Grudge Match, Bad Blood, Friends on the Floor, The Old Gang, Chirp), the rival
    night's pixel icon (two jerseys and a bolt), Catalog entries, the manual and Guide mode.
- **End of round** (owner: "go til here. dont publish yet": the list up to the summary and this
  file). Pixel icons for a challenge (two players squared up), a draft class (classmates on a bench
  under the class banner) and the unlock (the padlock, open); sound for a challenge, a seat taken in
  a class and a mode opening, and a loop of its own for Play with friends (Call and answer); simple
  text keeps the notes a player needs on the new pages; the manual and Guide mode; the dev deck's
  cards and Catalog lists; the tutorial's end-to-end check now plays beginner alone and checks the
  locks hold. Balance was not run (the owner's list stopped short of it). Not published.
  The full checks after the friends features: 316 tests in 29 files, the build, the visual check on
  all 142 cards in four looks (diffed against round 34: the new screens, pages a little longer for
  FT% and the new cards, and two cards whose made-up careers now end differently), class contrast,
  dev-apart (the deck writes only its own keys, the friends stand-in among them). The visual check
  found one bug: a risk tag on the highlighted (first) choice of a decision, green, amber or red on
  the accent at 1.09:1; it now takes the button's ink. class-contrast.cjs missed it, so it now also
  draws every tag the code puts inside a choice button in each state of the button, and fills in a
  class built as prefix-${...} (risk-${level}) from the stylesheets: 223 combinations, none under AA.
- **The draft class, and fair play with friends** (owner: "for equality purposes, i think sim and
  fastbreak should be locked in multiplayer. think of other ways to balance", and "here's the story
  line. the 12 of you (max) were the first options of your colleges. you're going for the nba
  draft, and all of you are predicted to be entering as a 1st round pick (1~30th). ovr starts at a
  65~75 range. the rest is history").
  - **Fair play**: in a challenge or class career Fast break and Sim are locked off (the engine
    refuses them, as for Rough Road; the chips and Settings say why). Other balance, ours: a career
    that ever ran Fast break or Sim is marked and cannot be sent as a challenge (the friend answers
    at full pace); mini-games pay no rating bonus with friends (they still play, for fun); a season
    once posted to a class stands (a career played again from an older save cannot replace it); and
    a seat holds one career (its first line names its run; another run's lines and card are
    refused, and the start page says so before a second career starts).
  - **Draft night** (engine/career/draftNight.ts, a helper agent's work): a class career skips high
    school and college. He was his college's first option (mostly the big programs), at OVR 65 to
    75 drawn evenly, projected in the first round with a mock range, and picked there (1 to 30;
    the 30th team takes him if he is still on the board). Age, OVR, college and projection come
    from a stream of his own (seed and picks), the league and the draft from the seed alone, so the
    whole class goes into the same draft. The intro page is on the draft stage, headed Draft night.
    Classes seat 12. Careers outside a class are unchanged (60 careers' full states hashed the same).
  - **Stars as often as a first-round pick** (owner: "potential so stars come up about as often as
    for a normal first-round pick? yes"). Entering at 21 or 22, the first draft-night careers
    peaked at 77.89626 on average with 0.6666667% MVPs and 2.000000% Hall of Famers, against the
    first-round picks of Regular guy careers played from high school (80.60136, 9.876543%,
    23.45679%). A lift to the potential alone raised the mean but not the stars (MVPs come from the
    top tail, the Hall of Fame from long, strong careers), so three things changed: the class is a
    freshman one-and-done to a senior (19 to 22, the younger twice as often), his potential is
    spread (sd 10, lifted -3, never under his OVR plus 2), and his hidden growth rate is raised by
    0.3 (a first-round pick is one who grew fast). Over 200 smart careers: mean peak 82.40946,
    All-Star 69.0%, MVP 9.5%, Hall of Fame 19.5% (titles 61.5%), 13.75 NBA seasons.
  - **Join a friend** (career/team.ts): a trade aim at a classmate's NBA team. The two salaries
    against next season's cap set the odds (fit = 1 - 1.5 x (share - 0.10), at least 0.25; the
    usual trade odds x 1.1 x fit, 5% to 85%); not offered past 60% of the cap together, or with the
    team's payroll and both deals over 1.3 x the cap. Measured: about 66% for a cheap friend, 20%
    when he takes half the cap.
  - **Rival series** (career/rivalSeries.ts): when his team meets his rival classmate's in the NBA
    playoffs, one call for the series (guard him +0.6 strength; outscore him, a hot hand; the team
    game +0.3 and the coach's trust), asked whether the games are played or simulated. On a
    coin-flip series, guarding makes it 57.24871% and the team game 53.64044%. Recorded with the
    rival nights, counted apart on the side board.
  - **Classmates in your league** (career/friendLeague.ts): a classmate on his NBA team that season
    shows in the game log against that team (his line drawn around his averages, on a stream of its
    own), in the award races (he can win MVP), and on the All-Star teams; his team is a little
    stronger against you (+0.1 for each OVR point over 75, at most +1.0).
  - **Reunion night**: once every career in the class is over (a friend quiet for 14 days counts as
    he stands), eleven awards revealed one at a time, the least first: Iron Man (games), Journeyman
    (teams), Glass Cleaner, Floor General, Moneybags (earnings), Bucket Getter, Highest Peak,
    All-Star Regular, Hardware (MVPs), Ring Leader, then the Class MVP (career index when every card
    is in). A pixel banquet over it (the class at a long table, the lights coming on, the trophy
    raised); a toast for each award and the championship sound for the class MVP.
  - **Watch a friend's career**: tap a name in the standings: his rating each season as a pixel
    chart, every season's line and honours, his card once he retires. **Reactions**: on fire,
    royalty, love it, ice cold, one each on a classmate's season (a pop when given).
    **Class news**: the server writes a line to the class chat when a season changes something
    (drafted, a move, leaving the NBA, Rookie of the Year, a first All-Star, an MVP, a title) or a
    career ends. **Friends today**: the daily challenge among the players one shares a class or a
    challenge with, on the daily pages.
  - The server: supabase/migrations/0006_multiplayer_class.sql (12 seats; the first line stands;
    the run; class news; reactions; the daily board), tested on a local Postgres with two players
    and a stranger.
  - **Achievements** (25 more, the book at 776, a helper agent's work): for draft night (First
    Chair, Honor Roll, Chip on the Shoulder, Believe the Hype, Thirty for Thirty, Pick of the
    Litter), the rival series (Best of Enemies, Rent Free, Revenge Tour, Final Word, Brooms Out, Home
    and Away, Same Time Next Year), classmates in the league (Head of the Class, Green with Envy,
    All-Star Alumni, Phone a Friend, Friendship Ring), and the class pages (Homecoming King,
    Superlatives, The Whole Yearbook, Hype Man, Heavy Is the Head, King of the Hill, Binge Watcher).
    Tiers from measured rates (300 draft nights and careers: first overall 1.333333%, top five
    16.66667%).
  - **Turning points** (events/round35c.ts, class careers only): the rookie dinner, a classmate on
    the trade block, the bracket math (both teams in their conference's top six), a classmate's MVP,
    the reunion invitation (32 or older), each with a pixel icon. **Shop**: three things only a class
    career is offered (framed art of the class's jerseys, a trainer shared with a classmate, a suit
    for reunion night), kept out of every other career's draws, each with its own pixel icon.
  - **A crash fixed on the way**: the duo-extension turning point read a duo of friends as a
    teammate on the roster and threw in any class career with a classmate on his team.
  - Sound: a toast for each reunion award (the championship sound for the class MVP) and a pop for a
    reaction. Art: the banquet, the draft stage for draft night's intro, three shop icons.
- **The 50-40-90 Club** (owner: "add 50-40-90 season to a legendary season"): a legendary season card
  for half the shots from the field, 40% from three and 90% at the line over a full NBA season (50
  games), on the same line as the Fifty-Forty-Ninety achievement (two threes and two free throws
  tried a game at least). It ranks just below the Triple-Double Season, so a rarer card the same
  year still wins. Measured on 150 careers (Standard, smart policy): 6 careers (4.000000%) had one,
  8 of 773 full NBA seasons (1.034929%).
- **A leaner tutorial** (owner: "i think there are still too much features accessible in the tutorial
  mode"; the owner picked what goes): the beginner level drops the milestones strip and the fan talk
  (the paper's headline and the made-up posts) from Home, and its Player tab keeps only the ratings
  and the status meters (no kits, contract and money, nickname and brand, profile, second scouting
  report, body map, staff, wardrobe, collection or roster). The coach card, the scouting report and
  the whole Settings menu stay. One rule (`leanLevel` in src/ui/road.ts) for both screens; the
  lessons follow: the milestones and fan-talk lessons are gone, the Player tab teaches the ratings
  and the status, and the scouts' lesson moves to Home. Intermediate and advanced are unchanged.
- **Sim mode opens with the Grand Tour** (owner: "i think sim mode should be unlocked once the user
  completes one full round (until retirement) of each difficulty"): Sim switches on only once this
  device has a career finished at Regular guy, Reality hits hard and Shoot for the stars, the same
  rule as the Grand Tour achievement (`grandTour`, `DIFFICULTIES` in src/engine/achievements.ts;
  `simOpen`, `difficultiesLeft` in src/ui/achievements.ts). A Comet (a son's career is one) no longer
  counts for its difficulty, since Sim plays it. Until then the Sim chip is grey with the
  difficulties still to go; a career saved with Sim on can still switch it off. Comet keeps Sim on
  by itself; the advanced practice level and the closing tour keep their own Sim, since they teach
  it; the dev deck has it open (a card shows it shut). The rule lives on the device, not in the
  engine, so careers and the harness play exactly as before.
- **What's new for round 35**: play with friends, the class's league, reunion night, fair play, the
  Sim unlock, free throws and aging shooting, the 50-40-90 Club, the shorter tutorial, the
  achievement categories (776) and the shop prices.
