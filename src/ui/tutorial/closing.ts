// The closing tour (round 33, owner: "i like the closing tour idea. put press in there as well"):
// after advanced, a star's career already under way, stop by stop, for every system no level has
// (the locker room, the city and its fans, duos, press, the record watch, Love and the next
// generation, the farewell tour, the ring chase, the Records and Extras tabs, undo, Simple text,
// Master mode, Settings). Each stop is a real career, played by the dev deck's player until the
// moment it needs turns up (dev/stage.ts). The tour is also the catch-up: a stop for anything a
// player's own levels never showed (a crunch-time final, a storyline, the offseason's moves),
// skipped when its lessons are already done. Tour careers are kept nowhere (flags.tour).

import { decision, onlyMoment, play, type PlayOpts } from '../../dev/stage';
import type { GameState } from '../../engine/types';
import type { Prompt } from '../../engine/flow';
import { recordWatch } from '../../engine/career/records';
import { canFarewell } from '../../engine/career/farewell';
import { canPlayChild } from '../../engine/nextGen';
import type { Tab } from '../../store';
import type { Decision } from '../../engine/types';
import { SHOP_ITEMS } from '../../content/shop';
import { applyItem } from '../../engine/economy/shop';
import { duoEffect } from '../../engine/career/duo';
import { isFinal, type LiveRequest } from '../../engine/career/live';

export interface Stop {
  id: string;
  title: string;
  lessons: string[];
  tab?: Tab;
  /** The stop is a story page (otherwise the staged career's old pages are cleared). */
  page?: true;
  build: () => GameState | null;
}

const star: PlayOpts = { mode: 'stars', tries: 6 };
/** A star in his NBA prime, between two halves (no decision waiting). */
const prime = () => play((s, p) => p.type === 'advance' && s.stage === 'NBA' && s.player.age >= 26 && s.step === 'midseason', star);
const kind = (k: string, o: PlayOpts = star) => () => play(decision(k), o);
const offseason = (ok: (s: GameState) => boolean) => () => play((s, p: Prompt) => p.type === 'advance' && s.step === 'offseason' && s.stage === 'NBA' && ok(s), star);
/** A player who plays his playoff games (`finals`: only the finals) instead of simulating them. */
const plays = (finals: boolean) => (_: GameState, d: Decision): string | undefined => {
  if (d.kind !== 'live') return undefined;
  const r = d.data?.req as LiveRequest | undefined;
  const has = (id: string) => d.choices.some((c) => c.id === id);
  if (r?.stage === 'game') return !finals || isFinal(r.round) ? 'play' : has('series') ? 'series' : 'sim';
  if (r?.stage === 'quarter') return 'steady';
  return undefined;
};
const liveStage = (stage: string) => (_: GameState, p: Prompt) => p.type === 'decision' && p.decision.kind === 'live' && (p.decision.data?.req as LiveRequest | undefined)?.stage === stage;
/** A star and his best teammate, a duo already (duos grow from recruiting a starter, which the
 * dev deck's player never does). */
const withDuo = () => {
  const s = prime();
  const team = s?.nba?.teams.find((t) => t.id === s.teamId);
  const mate = team?.roster.filter((r) => r.id >= 0).sort((a, b) => b.ovr - a.ovr)[0];
  if (!s || !mate) return s;
  s.bonds = [{ id: mate.id, name: mate.name, pos: mate.pos, spark: 0.8, bond: 100, seasons: 2, formed: s.year - 1 }];
  return duoEffect(s) ? s : null;
};
/** A star with something in his wardrobe (the Player tab's cards all have something to show). */
const dressed = () => {
  const s = prime();
  const acc = SHOP_ITEMS.find((i) => i.wear);
  if (s && acc && !s.player.wardrobe?.owned.length) applyItem(s, acc, 0);
  return s;
};

export const STOPS: Stop[] = [
  // the systems no level has
  { id: 'prime', title: 'A star in his prime', lessons: ['t-season', 't-locker', 't-city', 't-home', 't-stories', 't-record', 'i-mvp', 'i-rival', 'b-coach'], build: prime },
  { id: 'duo', title: 'A duo', lessons: ['t-duo'], build: withDuo },
  { id: 'press', title: 'A press conference', lessons: ['t-press', 't-undo'], build: kind('press') },
  { id: 'record', title: 'Record watch', lessons: ['t-record'], build: () => play((s, p) => p.type === 'advance' && s.stage === 'NBA' && recordWatch(s).length > 0, star) },
  { id: 'national', title: 'The national team', lessons: ['t-national'], build: kind('national') },
  { id: 'love', title: 'Love', lessons: ['t-love'], build: () => play((_, p) => p.type === 'decision' && p.decision.kind === 'arc' && p.decision.data?.arc === 'love', star) },
  { id: 'farewell', title: 'A farewell tour', lessons: ['t-farewell'], build: offseason(canFarewell) },
  { id: 'ring', title: 'Chasing a ring', lessons: ['t-retire'], build: () => play((_, p) => p.type === 'decision' && p.decision.kind === 'retirePrompt' && p.decision.choices.some((c) => c.id === 'ringchase'), star) },
  { id: 'son', title: 'The next generation', lessons: ['t-son', 't-card'], build: () => play((s) => canPlayChild(s), { ...star, tries: 10 }) },
  // the catch-up: whatever the levels never showed
  { id: 'moves', title: 'The offseason’s moves', lessons: ['a-focus', 'a-position', 'a-number', 'a-style', 'a-trade', 'a-five'], build: offseason(() => true) },
  { id: 'player', title: 'The Player tab', lessons: ['a-body', 'a-kits', 'a-roster', 'a-staff', 'a-wardrobe', 'a-collection', 'i-name'], tab: 'player', build: dressed },
  { id: 'season', title: 'The Season tab', lessons: ['i-strength', 'i-standings', 'i-games'], tab: 'season', build: prime },
  { id: 'bracket', title: 'The playoffs and the leaders', lessons: ['i-bracket', 'i-leaders'], tab: 'season', build: () => play((s, p) => p.type === 'advance' && s.step === 'summary' && s.stage === 'NBA', star) },
  { id: 'offers', title: 'Offers', lessons: ['i-offers', 'a-road', 'i-talks'], build: kind('offers') },
  { id: 'arc', title: 'A storyline', lessons: ['a-arc'], build: kind('arc') },
  { id: 'brand', title: 'A brand deal', lessons: ['i-brand'], build: kind('brand') },
  { id: 'summer', title: 'The summer program', lessons: ['i-summer'], build: kind('summer') },
  { id: 'event', title: 'A turning point', lessons: ['b-risk', 'b-event', 'b-result'], build: kind('event') },
  { id: 'live', title: 'A playoff game', lessons: ['i-live'], build: kind('live', { ...star, live: true }) },
  { id: 'crunch', title: 'Crunch time', lessons: ['a-crunch'], build: () => play(liveStage('crunch'), { ...star, live: true, tries: 12, pick: plays(true) }) },
  { id: 'meter', title: 'The last shot', lessons: ['b-meter'], build: () => play(liveStage('clutch'), { ...star, live: true, pick: plays(false) }) },
  { id: 'reel', title: 'The last minutes of a final', lessons: ['a-clutch'], page: true, build: () => {
      const s = play((g) => g.stage === 'NBA' && g.moments.some((m) => !!m.drama), { ...star, tries: 10 });
      return s && onlyMoment(s, (m) => !!m.drama);
    } },
  { id: 'sim', title: 'Sim mode', lessons: ['a-sim', 'a-sim-calls'], build: () => play((s, p) => p.type !== 'retired' && !!s.simCalls?.length && s.stage === 'NBA', { ...star, quick: 'sim' }) },
  // last: the tabs and the switches, on a star's career
  { id: 'wrap', title: 'Records, Extras and the switches', lessons: ['t-records', 't-timeline', 't-trophies', 't-extras', 't-back', 't-modes', 't-simple', 't-master', 't-guide', 't-manual', 't-settings', 't-new'], build: prime },
];

/** The stops a player still needs: any with a lesson not done yet. */
export const stopsLeft = (done: string[]): Stop[] => STOPS.filter((s) => s.lessons.some((l) => !done.includes(l)));
