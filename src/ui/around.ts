// Round 36 (owner: "merge 12"): Home's side column (the MVP race, the duo, the rivalry, the
// league's stories, the fans' talk) is one "Around you" card. It opens on whatever matters most
// right now; this file decides that, so the card itself only draws.

import { tx } from '../i18n';
import type { GameState } from '../engine/types';
import { liveMvpRace } from '../engine/career/mvpRace';
import { duoEffect } from '../engine/career/duo';
import { callsLeft } from '../engine/world/stories';

export type Pane = 'mvp' | 'rival' | 'duo' | 'league' | 'talk';

export const PANE_NAME: Record<Pane, string> = { mvp: tx('MVP race'), rival: tx('Rivalry'), duo: tx('Duo'), league: tx('The league'), talk: tx('The talk') };

/** The parts with something to show, the one that matters most first (ties keep this order). */
export function aroundPanes(g: GameState, lean: boolean): Pane[] {
  const out: { pane: Pane; score: number }[] = [];
  const race = liveMvpRace(g);
  if (race && race.rows.length) {
    const r = race.userRank;
    // leading it or close to the top, the race is the story of the season
    const score = r === 1 || (r !== null && race.gap <= 3) ? 90 : r !== null && race.gap <= 6 ? 60 : race.final ? 35 : 25;
    out.push({ pane: 'mvp', score });
  }
  const fx = duoEffect(g);
  if (fx) {
    const fresh = (fx.b.formed ?? 0) >= g.year || (fx.third && (fx.third.formed ?? 0) >= g.year);
    out.push({ pane: 'duo', score: fresh ? 85 : 30 });
  }
  const rv = g.rivalry;
  if (rv) {
    const now = rv.seasons[rv.seasons.length - 1];
    out.push({ pane: 'rival', score: rv.ended ? 15 : rv.since >= g.year ? 80 : now?.year === g.year ? 55 : 30 });
  }
  if ((g.stories ?? []).length) {
    const aboutYou = (g.news ?? []).some((n) => n.year === g.year);
    out.push({ pane: 'league', score: aboutYou ? 75 : callsLeft(g) > 0 ? 65 : 40 });
  }
  if (g.feed[0] && !lean) out.push({ pane: 'talk', score: 20 });
  const order: Pane[] = ['mvp', 'rival', 'duo', 'league', 'talk'];
  return out.sort((a, b) => b.score - a.score || order.indexOf(a.pane) - order.indexOf(b.pane)).map((x) => x.pane);
}
