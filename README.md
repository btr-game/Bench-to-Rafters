# Bench to Rafters

A single-player, browser-only basketball career game. Create a 14-year-old freshman and guide him
through high school, college or the pros overseas, the NBA Draft, an NBA career and retirement.
The goal: your jersey in the rafters.

The full design is in [`SPEC.md`](SPEC.md). Choices made where the spec was ambiguous are in
[`DECISIONS.md`](DECISIONS.md).

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
