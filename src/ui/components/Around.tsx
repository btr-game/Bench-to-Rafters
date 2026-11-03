// "Around you" (round 36, owner: "merge 12"): the MVP race, the duo, the rivalry, the league's
// stories and the fans' talk in one card at Home's side. It opens on the part that matters most
// right now (ui/around.ts); a pick holds until the season moves on. With the tutorial or Guide
// mode on, every part shows, one under another, so each lesson finds the part it points at.

import { useState } from 'react';
import type { GameState } from '../../engine/types';
import { useStore } from '../../store';
import { inTutorial, leanLevel } from '../road';
import { PANE_NAME, aroundPanes, type Pane } from '../around';
import { Icon } from '../art/Icon';
import { ReactionCard } from './bits';
import { MvpRace } from './MvpRace';
import { RivalCard } from './RivalCard';
import { DuoCard, StoriesCard } from './Roster';
import { t } from '../../i18n';

const ICON: Record<Pane, string> = { mvp: 'spotlight', rival: 'rival', duo: 'teamfirst', league: 'globe', talk: 'news' };

function Part({ g, pane }: { g: GameState; pane: Pane }) {
  if (pane === 'mvp') return <MvpRace g={g} />;
  if (pane === 'rival') return <RivalCard g={g} />;
  if (pane === 'duo') return <DuoCard g={g} />;
  if (pane === 'league') return <StoriesCard g={g} />;
  return g.feed[0] ? (
    <section className="card prose">
      <ReactionCard r={g.feed[0]} />
    </section>
  ) : null;
}

export function AroundCard({ g }: { g: GameState }) {
  const panes = aroundPanes(g, leanLevel(g));
  const teach = useStore((s) => s.guide || !!s.closing || inTutorial(s.road));
  const moment = `${g.year}-${g.step}-${g.season?.half ?? 0}`;
  const [pick, setPick] = useState<{ at: string; pane: Pane } | null>(null);
  if (panes.length === 0) return null;
  const cur = pick && pick.at === moment && panes.includes(pick.pane) ? pick.pane : panes[0];
  return (
    <section className="card stack around" data-tour="around">
      <h2 className="title">{t('Around you')}</h2>
      {teach ? (
        panes.map((p) => (
          <div key={p} className="around-part">
            <Part g={g} pane={p} />
          </div>
        ))
      ) : (
        <>
          {panes.length > 1 && (
            <div className="seg around-tabs" aria-label={t('Around you')}>
              {panes.map((p) => (
                <button key={p} data-pane={p} aria-pressed={p === cur} onClick={() => setPick({ at: moment, pane: p })}>
                  <Icon name={ICON[p]} size={18} />
                  {t(PANE_NAME[p])}
                </button>
              ))}
            </div>
          )}
          <div className="around-part">
            <Part g={g} pane={cur} />
          </div>
        </>
      )}
    </section>
  );
}
