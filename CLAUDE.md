# Working on Bench to Rafters

A browser basketball career game: Vite + React 18 + TypeScript (strict) + Zustand, with a
seeded, deterministic engine in `src/engine/` that the UI and the balance harness both drive
through `newGame`, `prompt`, `choose` and `advance` (`src/engine/flow.ts`). Every tunable number
lives in `src/engine/balance.ts`. Design decisions, round by round, are in `DECISIONS.md`.
Setup commands are in `SETUP.md`.

## Standing rules from the owner

Every request ends with these three steps, in this order:

1. **Update the game guide**: the manual (`SECTIONS` and `QUICK` in
   `src/ui/components/Guide.tsx`: big headers, expandable cards) and Guide mode (`guideStep` in
   the same file), so both describe the game as it now is.
2. **Clear dead code**: unused functions, exports, imports, CSS rules and leftovers of replaced
   features.
3. **Give the updated project summary**: regenerate the Word document in `docs/reports/`
   (`*-project-summary.docx`) with the new round, the progression and unlock tables, and the
   tips and hidden features section, and send it.

Other preferences:

- The owner is an IB DP student. Documents for people (reports, summaries) are Word files
  unless asked otherwise.
- Give calculations to at least 6 or 7 significant figures before rounding.
- The game is played mostly on a computer: desktop layout first, phones still supported.
- Balance changes are measured with the harness (`scripts/harness.ts`, casual mini-game play,
  smart policy) against the last approved numbers before they ship.
- Never put the owner's email address in the code, the docs or the published page.

## Checks before a commit

```bash
npx tsc --noEmit -p .
npx vitest run          # about 5-10 minutes with the balance tests
npx vite build
```
