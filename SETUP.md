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

## 5. Publish on itch.io, with the online community

The itch.io copy keeps its leaderboards, Reality 99 hall, statue plaza, live strip and feedback in
a free Supabase database. (The claude.ai page uses that page's own shared data instead.)

1. **The database, once.** A Supabase project with `supabase/migrations/0001_community.sql` run in
   it (done: project "bench-to-rafters" in Seoul, set up through the Supabase connector; by hand:
   New project, then SQL Editor, paste the file, Run). Its tables are read-only to players; every write goes through the
   checked functions at the foot of that file.
2. **Its address.** Put the project's URL and its publishable (anon) key in `.env.itch`:

   ```
   VITE_SB_URL=https://<project>.supabase.co
   VITE_SB_KEY=<publishable key>
   ```

   Both are public by design (the game sends them to every player); the database's rules are
   what protect it. Never put the secret (service role) key here.
3. **Build and zip.**

   ```bash
   npm run build:itch
   cd dist-itch && zip -r ../bench-to-rafters-itch.zip . && cd ..
   ```

4. **itch.io.** Dashboard, Create new project. Kind of project: HTML. Upload the zip and tick
   "This file will be played in the browser". Viewport 1280 × 800, with the fullscreen button
   and "Mobile friendly" on. Save as a draft, try it, then set it to Public.
5. **Feedback** from players is in the Supabase dashboard: Table Editor, `feedback`.
6. **Pausing.** A free Supabase project pauses after a week with no players. The game then keeps
   to each device until it is restored (Supabase dashboard, Restore project).

## 6. Check the code (optional)

```bash
npm run typecheck  # TypeScript
npm test           # unit tests + balance tests (the balance tests simulate thousands of careers: about 5-10 minutes)
npx vitest run tests/round14.test.ts   # one quick test file
```

## 7. Balance harness (optional, for tuning)

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
