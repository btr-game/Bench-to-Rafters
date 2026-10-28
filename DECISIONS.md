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
