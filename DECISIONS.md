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
