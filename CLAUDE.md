# Working on Bench to Rafters

A browser basketball career game: Vite + React 18 + TypeScript (strict) + Zustand, with a
seeded, deterministic engine in `src/engine/` that the UI and the balance harness both drive
through `newGame`, `prompt`, `choose` and `advance` (`src/engine/flow.ts`). Every tunable number
lives in `src/engine/balance.ts`. Design decisions, round by round, are in `DECISIONS.md`.
Setup commands are in `SETUP.md`. Ideas kept for later are in `ROADMAP.md`.

## Standing rules from the owner

After each request, **clear dead code**: unused functions, exports, imports, CSS rules and
leftovers of replaced features.

Deferred to the end steps (owner's call, round 21): no project summary or report at the end of
each request any more, and balance checks and guide updates wait too. Keep a running list of
what they will need (systems changed since the last balance run, guide sections that are out of
date) and **remind the owner when the work looks close to the end steps**. Those end steps are:

1. **Balance**: measure with the harness (`scripts/harness.ts`, casual mini-game play, smart
   policy) against the last approved numbers (round 22: mean peak 74.4923, NBA 78.3%,
   All-Star 35.8%, MVP 11.9%, Hall of Fame 11.2%, titles 29.2%).
2. **Update the game guide**: the manual (`SECTIONS` and `QUICK` in
   `src/ui/components/Guide.tsx`: big headers, expandable cards) and Guide mode (`guideStep` in
   the same file), so both describe the game as it now is.
3. **Project summary**: only if the owner asks for it again (the Word document in
   `docs/reports/*-project-summary.docx`).

Other preferences:

- The owner is an IB DP student. Documents for people (reports, summaries) are Word files
  unless asked otherwise.
- Give calculations to at least 6 or 7 significant figures before rounding.
- The game is played mostly on a computer: desktop layout first, phones still supported.
- Never put the owner's email address in the code, the docs or the published page.

## Checks before a commit

```bash
npx tsc --noEmit -p .
npx vitest run          # about 5-10 minutes with the balance tests
npx vite build
```
