# Bench to Rafters

A single-player, browser-only basketball career game. Create a 14-year-old freshman and guide him
through high school, college or the pros overseas, the NBA Draft, an NBA career and retirement.
The goal: your jersey in the rafters.

The full design is in [`SPEC.md`](SPEC.md). Choices made where the spec was ambiguous are in
[`DECISIONS.md`](DECISIONS.md).

## Modes

- **Standard**: most careers peak in the 60s and 70s (average in the low 70s); the NBA is
  common, stardom is earned.
- **Reality hits hard**: most careers end short of the NBA (peaks average about 60), and those
  who make it fight for a spot.
- **Shoot for the stars**: every career reaches stardom, centred in the early 90s; the very top
  is within reach but not easy.

Balance reports (Word) are in [`docs/reports/`](docs/reports/).

## Run it

```bash
npm install
npm run dev        # play in the browser (Vite prints the URL)
npm test           # unit tests + balance guard
npm run sim -- --careers 2000 --policy both --seed 1   # balance harness
npm run build      # static build in dist/
```

## Layout

- `src/engine/`: the game, in pure TypeScript with no React. It is deterministic: every random
  number comes from a seeded PRNG stored in the game state.
  - `balance.ts`: every tunable number.
  - `flow.ts`: the state machine (`newGame`, `prompt`, `choose`, `advance`).
- `src/content/`: team data, names, UI strings and reaction templates.
- `src/ui/`: React screens and components.
- `scripts/`: the headless balance harness.
