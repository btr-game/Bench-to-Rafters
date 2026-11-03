# Working on Bench to Rafters

A browser basketball career game: Vite + React 18 + TypeScript (strict) + Zustand, with a
seeded, deterministic engine in `src/engine/` that the UI and the balance harness both drive
through `newGame`, `prompt`, `choose` and `advance` (`src/engine/flow.ts`). Every tunable number
lives in `src/engine/balance.ts`. Design decisions, round by round, are in `DECISIONS.md`.
Setup commands are in `SETUP.md`. Ideas kept for later are in `ROADMAP.md`.

## Standing rules from the owner

After each request, **clear dead code**: unused functions, exports, imports, CSS rules and
leftovers of replaced features.

**End-of-round checklist** (owner, round 25; it extends the round 21 and 24 rules). During a round,
build features only; everything below waits until the **end of the round**, in this order, and
nothing on it is done feature by feature. Keep a running list of what each item will need (new
functions, systems changed since the last balance run, out-of-date guide sections) and **remind
the owner when the work looks close to the end of the round**.

1. **Graphics**: pixel art in the game's style for every new function: icons, art for new cards,
   pages, items and logos.
2. **Sound**: a sound effect (and music cue, where it fits) for every new function, once the
   sound system exists.
3. **Fast break, sim mode and simple text**: every new screen respects all three (fast break
   skips or auto-resolves it; sim mode makes the routine calls itself and stops only for the
   ones that shape a career; simple text hides its descriptions).
4. **Contrast and keyboard**: new UI readable in both themes and usable with the keyboard; the
   visual check (below) runs clean on every screen, and its diff shows only the changes meant.
5. **Achievements** for the new systems, and more besides: players earn them quickly, so every
   round adds a good batch (owner, round 32: "we might run out of them quickly. add more").
6. **Events, storylines, pathways and shop items** that bring the new features into the game
   (owner, round 32, extending the round 25 rule): new random events, storyline chapters, choices
   or career paths, and shop items that touch the new systems, as events about weight did when
   weight came in. Every round adds some; not every feature needs all four.
7. **Harness**: `smartChoice` in `scripts/harness.ts` handles every new decision kind.
8. **Dead code**: unused functions, exports, imports, CSS rules, leftovers of replaced features.
9. **Tests** for new engine logic, then the full checks below (tsc, vitest, build).
10. **Balance**: measure with the harness (casual mini-game play, smart policy) against the last
    approved numbers (round 22: mean peak 74.4923, NBA 78.3%, All-Star 35.8%, MVP 11.9%,
    Hall of Fame 11.2%, titles 29.2%) and report; the owner decides on any change.
11. **Game guide**: the manual (`SECTIONS` and `QUICK` in `src/ui/components/Guide.tsx`) and
    Guide mode (the tour steps in `src/ui/components/GuideTour.tsx`), so both describe the game
    as it now is.
12. **Dev deck**: a card for every new function or page (`src/dev/cards.ts`), and every new list the
    game draws from in its Catalog (`src/dev/Catalog.tsx`), shown with its art.
13. **Project summary**: the generator's text and data for the new systems, regenerating the dev
    deck's summary chapter (`src/dev/summary.json`). The summary lives in the deck only: no Word
    document (owner, round 26).
14. **DECISIONS.md** for the round (and ROADMAP.md for ideas kept for later).
15. **Publish**: the game artifact (no owner email anywhere), then commit and push. A push to `main`
    also publishes the website (bench-to-rafters.netlify.app; Netlify builds it, `netlify.toml`),
    so push only after the checks pass. The dev deck is
    part of the game (round 26): the Developer door at the foot of the start page, password
    `btrdev`, opens it in dev mode, with storage of its own (`src/dev/mode.ts`, `src/dev/storage.ts`).

Other preferences:

- **Every graphic is pixel art** (owner, after round 27: "for every graphic you make, make them
  pixelated. this includes the intro and thank you page"): drawn on a pixel grid with square pixels
  (`shapeRendering="crispEdges"`, hard colour stops), never smooth gradients, curves or blurs for
  the art itself; animations move in steps where it helps the look. The one exception is a
  **gradient background** behind the art, such as a moment page's (owner, round 32: "for gradient
  backgrounds (for example, the marraige page background) they can be left unpixelated. it's
  actually one of the things i enjoyed before the game"): those stay smooth. Meters, bars and
  objects drawn in CSS (a plank, a plinth, a court's horizon) stay banded.

- The owner is an IB DP student. Documents for people (reports, summaries) are Word files
  unless asked otherwise.
- Give calculations to at least 6 or 7 significant figures before rounding.
- The game is played on a computer: desktop layout first; phones are set aside for now (below).
- **Four cards at most** in the start page's row of cards (mini-games, career log, achievements,
  community; owner, round 36: "never put more that 4 cards here"). Anything new goes elsewhere (Play
  with friends sits under the difficulties); the grid itself never makes a fifth column.
- Never put the owner's email address in the code, the docs or the published page.

## Lighter checks (owner, round 35)

Owner: "let's go with lighter checks". During a round: `npx tsc --noEmit -p .` and the test files
the change touches; the visual check only on the screens a change touches, on the desktop only
(`--only <ids> --configs desktop-light`); calibration runs of about 150 careers. The full set
below runs once, at the end of the round: the whole test suite, the visual check on every card in
two looks (`--configs desktop-light,desktop-dark`) with its diff, class contrast,
dev-apart, and the tutorial end to end only when the tutorial changed.

Phones (owner, round 37: "let's rest on the phone ui ... i just dont want this to take too long,
but also, i dont want to go back and fix the browser ui because the phone ui doesnt work at the
end"): no phone polish and no phone checks during a round. The end-of-round check keeps one phone
look so breakage is caught the round it happens; fix only what makes a phone screen unusable
(sideways scrolling, content off screen, text over a button, a tap target that cannot be hit),
with rules inside the phone media queries so the desktop layout never moves. Then (owner, the round
39 ideas document: "im starting to think phone mode could be scrapped for now. this game's interface
was never really meant for phones"): phones are set aside for now. No phone checks at all, the end
of the round included (its visual check runs `desktop-light,desktop-dark`); the phone rules already
in the CSS stay as they are, and nothing new is built for phones (the Floor simulates on one).
Balance only when how careers play changed, and the owner may still skip it.
Big rounds may be split across parallel helper agents in worktrees (owner, round 35: "sure").

## Checks before a commit

```bash
npx tsc --noEmit -p .
npx vitest run          # about 5-10 minutes with the balance tests
npx vite build
```

For any change to what is on screen (round 27, owner: "keep thinking of ways to prevent visual bugs
and check multiple times"), with the dev server running (`npx vite --port 5179`):

```bash
node scripts/visual.cjs <out dir>                     # every dev deck card, desktop and phone, light and dark
python3 scripts/visual-diff.py <last out dir> <out dir>  # the screens that changed, most first
python3 scripts/visual-diff.py --sheet <out dir>         # contact sheets to look through
```

It flags sideways scrolling, content off screen, clipped or spilling text, overlapping text, text
slid under a button it isn't part of,
contrast below WCAG AA, tap targets under 32px on a phone, script errors, a buried main card,
content left under the bars fixed to a phone's foot, and a layer fixed to the screen trapped inside
a moving parent (a pop-up that then covers only part of the page). For states no screen shows on
its own (a confirm button, a picked card), `node scripts/class-contrast.cjs` draws every button,
tag and chip class combination in the code in both themes and lists any under WCAG AA. Run it before and after, look at the diff, and
add a check whenever a new kind of visual bug turns up.

After any change to the dev deck or to what the game stores, `node scripts/dev-apart.cjs` deals every
card and checks the game's own storage (achievements, saves, the log) is exactly as it was.
