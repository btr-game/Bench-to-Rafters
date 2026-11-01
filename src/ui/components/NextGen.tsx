// The next generation (round 32): after a career whose Love storyline ended in a child, his son's
// career, offered on the father's retirement page; once played, summed up there, on the father's
// log card and on his career card (owner: "maybe just peak ovr, highest achievement, and the five
// big ones"). The son's own page says where his legacy went.

import { useMemo } from 'react';
import type { ChildLegacy, GameState } from '../../engine/types';
import { canPlayChild, childGame, childLegacy, childSeed } from '../../engine/nextGen';
import { careerRecord } from '../../engine/career/record';
import { NEXT_GEN } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import { chooseLook } from '../../content/looks';
import { useStore } from '../../store';
import { Card } from './bits';
import { PlayerArt } from '../art/Player';
import { sfx } from '../sound';

const SHARE = Math.round(NEXT_GEN.share * 100);

/** His peak, his biggest honour and the five big numbers. */
function ChildFacts({ kid }: { kid: ChildLegacy }) {
  return (
    <div className="ng-facts">
      <div className="ng-head">
        <b className="ng-name">{kid.name}</b>
        <span className="small muted">{kid.best}</span>
      </div>
      <dl className="ng-nums">
        {(
          [
            ['Peak', kid.peak],
            ['NBA seasons', kid.nbaSeasons],
            ['NBA points', kid.nbaPoints.toLocaleString()],
            ['MVPs', kid.mvps],
            ['Titles', kid.titles],
            ['All-Stars', kid.allStars],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="ng-adds">+{kid.adds} legacy points for his father</div>
    </div>
  );
}

/** On the father's page: play the son's career, or how it went. */
export function NextGen({ g }: { g: GameState }) {
  const play = useStore((s) => s.playChild);
  const simple = useStore((s) => s.simple);
  const son = useMemo(() => (canPlayChild(g) ? childGame(g, childSeed(g), '', 0).player : null), [g]);
  if (g.kid)
    return (
      <Card title="The next generation" kicker={`${g.player.name}'s son`} tour="next-gen">
        <ChildFacts kid={g.kid} />
      </Card>
    );
  if (g.flags.childPlayed && !g.flags.gen2)
    return (
      <Card title="The next generation" kicker="Your son">
        <p className="small">His career is under way in a save of its own (the career log, under Saved on this device). When it ends, {SHARE}% of his legacy points join yours.</p>
      </Card>
    );
  if (!son) return null;
  if (son.look) chooseLook(son.name, son.look);
  const first = son.name.split(' ')[0];
  return (
    <Card title="The next generation" kicker="Your son" tour="next-gen">
      <div className="ng-row">
        <PlayerArt name={son.name} number={son.number} pos={son.pos} size={96} />
        <div className="stack" style={{ gap: 6, minWidth: 0 }}>
          <b className="ng-name">{son.name}</b>
          <span className="small">
            {NAMES.pos[son.pos]} · #{son.number}, like his father · {son.hometown}
          </span>
          {!simple && (
            <p className="small muted">
              His career plays at Comet speed, about five minutes, on your difficulty. {SHARE}% of his legacy points join yours. He won't start a family of his own: the story ends with him.
            </p>
          )}
        </div>
      </div>
      <button className="btn" onClick={() => (sfx('family'), play())}>
        Play {first}'s career
      </button>
    </Card>
  );
}

/** On the son's page: whose son he was, and where his legacy went. */
export function ChildEnd({ g }: { g: GameState }) {
  const resume = useStore((s) => s.resume);
  const kid = useMemo(() => childLegacy(careerRecord(g)), [g]);
  const dad = g.parent;
  if (!dad) return null;
  return (
    <div className="ng-end">
      <b>Son of {dad.name}</b>
      <span className="small">
        +{kid.adds} legacy points ({SHARE}% of his {kid.legacy}) go to his father, on his card in the career log. The family's story ends here.
      </span>
      {dad.slot && (
        <button className="btn small ghost" onClick={() => void resume(dad.slot!)}>
          Back to {dad.name}'s career
        </button>
      )}
    </div>
  );
}
