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
