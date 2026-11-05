// The Floor in a career (round 39, step 5): the last six minutes of a playoff game that can end his
// season, over the whole page. The engine hands over the score and the two teams
// (engine/floor/career.ts); what the Floor comes to goes back as the game's pick. The court is the
// home team's and each side wears its home or road kit. Phones are set aside (owner, round 39), so a
// phone has the engine play the six minutes. The layer is a dialog, so the page's own keys (S for the
// Season tab, the number keys for choices) leave the court's keys alone.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameState, Team } from '../../engine/types';
import type { LiveRequest } from '../../engine/career/live';
import { floorPick, floorSetup } from '../../engine/floor/career';
import { TEAM_STYLE, genericKits } from '../../content/teamStyle';
import { kitFor, type KitName } from '../art/Player';
import { useStore } from '../../store';
import { t } from '../../i18n';
import { FloorScreen, type FloorTeamLook } from './FloorScreen';
import type { ArenaLook } from './view';

/** A screen the Floor cannot be played on: a touch screen, or one too narrow for the court. */
const noKeys = (): boolean => (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) || window.innerWidth < 720;

export function FloorStage({ g, r }: { g: GameState; r: LiveRequest }) {
  const choose = useStore((s) => s.choose);
  const take = r.floor!;
  // fixed when the Floor opens: nothing the page does while it plays restarts the game
  const [phone] = useState(noKeys);
  const [{ setup, arena, looks }] = useState(() => {
    const mine = g.nba?.teams.find((x) => x.id === g.teamId);
    const theirs = g.nba?.teams.find((x) => x.id === take.oppId);
    const home = take.home ? mine : theirs;
    const st = home && TEAM_STYLE[home.abbr];
    const arena: ArenaLook = st ? { c1: st.c1, c2: st.c2, c3: st.c3 } : { c1: home?.color ?? '#1D428A', c2: '#F2F2F2', c3: '#1B1820' };
    const kit = (t: Team | undefined, which: KitName) => (t ? kitFor(t.name, t.abbr, t.color, which, 'NBA') : genericKits('#495057', '')[which]);
    const us: KitName = take.home ? 'home' : 'road';
    const them: KitName = take.home ? 'road' : 'home';
    const looks: [FloorTeamLook, FloorTeamLook] = [
      { kit: kit(mine, us), which: us },
      { kit: kit(theirs, them), which: them },
    ];
    return { setup: floorSetup(g, take), arena, looks };
  });

  useEffect(() => {
    if (phone) choose('auto');
  }, [phone, choose]);
  if (phone) return null;

  return createPortal(
    <div className="floor-layer" role="dialog" aria-modal="true" aria-label={t('The Floor')}>
      <FloorScreen setup={setup} arena={arena} looks={looks} series={r.bestOf > 1 ? `${r.wins}–${r.losses}` : undefined} onDone={(res) => choose(floorPick(res))} />
    </div>,
    document.body,
  );
}
