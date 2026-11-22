// The Floor's newest functions in the dev deck (end of the round that brought game plans, signatures,
// gimmicks, courts and friend play): a legends game that tips off at once with what a card asks for (a
// court, an era, big heads, a close finish for the buzzer-beater replay), and the superteam draft's
// board with both seats picked from this one screen.

import { useMemo, useState } from 'react';
import { TEAM_STYLE } from '../content/teamStyle';
import { franchise, legendSetup } from '../engine/floor/game';
import { legendFive } from '../engine/floor/legends';
import type { FloorEra } from '../engine/floor/gimmicks';
import { PICK_SECONDS, newDraft, pickIn, turnOf, type Draft } from '../engine/floor/friend';
import { FloorScreen, type CourtLook, type FloorTeamLook } from '../ui/floor/FloorScreen';
import { DraftBoard } from '../ui/floor/DraftBoard';

interface Show {
  us: string;
  them: string;
  /** Which of his five he steers (0 the point guard; his best man if not given). */
  steer?: number;
  court?: CourtLook;
  era?: FloorEra;
  bigHeads?: boolean;
  /** Game seconds left and the score, for a close finish (the fourth quarter's whole 12:00 if not given). */
  clock?: number;
  score?: [number, number];
}

/** The best of a franchise's five, the one a quick game steers first. */
const best = (abbr: string): number => legendFive(abbr).reduce((k, l, i, f) => (l.ovr > f[k].ovr ? i : k), 0);

function FloorShow({ o }: { o: Show }) {
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 1e9));
  // fixed for each tip-off: nothing the page does while it plays restarts the game
  const setup = useMemo(() => {
    const base = legendSetup({ seed, us: franchise(o.us), them: franchise(o.them), user: o.steer ?? best(o.us), length: 'fourth', era: o.era });
    return { ...base, ...(o.clock ? { clock: o.clock, ball: 0 as const } : {}), ...(o.score ? { score: o.score } : {}) };
  }, [seed, o]);
  const us = TEAM_STYLE[o.us];
  const looks: [FloorTeamLook, FloorTeamLook] = [
    { kit: us.home, which: 'home' },
    { kit: TEAM_STYLE[o.them].road, which: 'road' },
  ];
  const again = () => setSeed(1 + Math.floor(Math.random() * 1e9));
  return (
    <main className="cl fl">
      <FloorScreen key={seed} setup={setup} arena={{ c1: us.c1, c2: us.c2, c3: us.c3 }} looks={looks} court={o.court ?? 'arena'} bigHeads={o.bigHeads} onAgain={again} onDone={again} />
    </main>
  );
}

/** A card's page: the game it asks for, tipped off at once. */
export const floorShow = (o: Show) => () => <FloorShow o={o} />;

/** The superteam draft (after round 42, owner: "superteam draft against a friend"): the board both
 * friends see, here with whoever's turn it is picked from this screen. */
export function DraftRoom() {
  const [d, setD] = useState<Draft>(() => newDraft(1));
  const me = turnOf(d) ?? 0;
  // the game's own page look (the deck's dark pages restyle a paragraph and a text box)
  return (
    <div className="wrap">
      <section className="stack">
        <div>
          <div className="kicker">Bench to Rafters · dev deck</div>
          <h1 className="hub-title">The superteam draft</h1>
        </div>
        <p className="prose small">
          After round 42: in a room with a friend, the two take turns drafting from every legend (all 180, any position), ten picks in a snake (host, friend, friend, host, host,
          friend, friend, host, host, friend), {PICK_SECONDS} seconds a pick, the best man left taken when the clock runs out. The two fives then play at their own levels. Here
          both seats pick from this screen, whoever’s turn it is, with the clock stopped.
        </p>
        <div className="row">
          <button className="btn" onClick={() => setD(newDraft(d.n + 1))}>
            Draft again
          </button>
        </div>
        <section className="card stack">
          <DraftBoard d={d} me={me} names={['Host', 'Friend']} left={PICK_SECONDS * 1000} onPick={(k) => setD((x) => pickIn(x, turnOf(x) ?? 0, k) ?? x)} />
        </section>
      </section>
    </div>
  );
}
