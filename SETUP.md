# Setup: from zero to playing

## 1. Requirements

- **Node.js 18 or newer** (tested with Node 22.22 and npm 10.9). Check with:

  ```bash
  node --version
  npm --version
  ```

  If Node is missing, install the LTS version from https://nodejs.org.
- No database, server, API key or account is needed. Environment variables are optional
  (see `.env.example`; you can ignore it to play).

## 2. Install

Unzip the project, open a terminal in the unzipped folder, then:

```bash
npm ci
```

(`npm ci` installs the exact versions in `package-lock.json`. `npm install` also works.)

## 3. Play

```bash
npm run dev
```

Vite prints a local address (usually http://localhost:5173). Open it in a browser. Your career
saves automatically in that browser; the start page offers "Continue" next time.

## 4. Build a static copy (optional)

```bash
npm run build
npm run preview    # serves the built copy locally to check it
```

The playable site is in `dist/`. It is plain static files (relative paths), so it can be put on
any static host or opened through a local web server.

## 5. Check the code (optional)

```bash
npm run typecheck  # TypeScript
npm test           # unit tests + balance tests (the balance tests simulate thousands of careers: about 5-10 minutes)
npx vitest run tests/round14.test.ts   # one quick test file
```

## 6. Balance harness (optional, for tuning)

```bash
npm run sim -- --careers 2000 --policy both --seed 1
```

Plays thousands of simulated careers and prints the outcome rates (average peak OVR, NBA, All-Star,
MVP, titles...). Every tunable number is in `src/engine/balance.ts`.

## Where things are

- `src/engine/`: the game rules (pure TypeScript, deterministic, seeded).
- `src/ui/`: React screens and components; `src/content/`: teams, names, text.
- `tests/`, `scripts/`: tests and the balance harness.
- `README.md`: overview. `SPEC.md`: original design. `DECISIONS.md`: every design and balance
  decision, round by round. `docs/`: the build spec, balance reports and the graphics plan.
