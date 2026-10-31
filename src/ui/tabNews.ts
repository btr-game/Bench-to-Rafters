// What a tab's "new" dot was about (owner: "if there's something new in another tab (orange dot),
// navigate user directly to the new feature... highlight it and put a 'got it' or 'ok' to make
// sure the user sees it"). The dot comes from a tab's key moving on (selectors.ts, tabKey); this
// reads the old key against the game now and names each change, with the card that shows it.

import type { GameState } from '../engine/types';
import { NAMES } from '../content/strings';
import { seasonLabel } from './format';
import { tabKey } from './selectors';

type NewsTab = 'home' | 'season' | 'player' | 'league' | 'records';

/** One change on a tab: the card to take the player to (the first that is on the page) and a line about it. */
export interface Spot {
  sel: string[];
  text: string;
}

const D = (id: string) => `[data-tour="${id}"]`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The changes on `tab` since its key was `before`; none when nothing moved (or the tab is new to this career). */
export function tabNews(g: GameState, tab: NewsTab, before: string | undefined): Spot[] {
  const now = tabKey(g, tab);
  if (before === undefined || before === now) return [];
  const was = before.split(':');
  const is = now.split(':');
  const out: Spot[] = [];
  switch (tab) {
    case 'season': {
      const s = g.season;
      if (was[0] !== is[0]) {
        out.push({ sel: [D('season-games'), '.page .card'], text: `A new season: ${seasonLabel(g.year)}. Its games and standings are here.` });
        break;
      }
      const n = Number(is[1]) - Number(was[1]);
      if (n > 0 && s) {
        const post = s.postGames.length > 0 && s.postGames.length >= n;
        const recent = [...(s.preGames ?? []), ...s.games, ...(s.cupGames ?? []), ...s.postGames].slice(-n);
        const w = recent.filter((x) => x.res === 'W').length;
        out.push({
          sel: post ? [D('season-post'), D('season-games')] : [D('season-games'), '.page .card'],
          text: `${plural(n, 'new game')} since you last looked: ${w}–${n - w}.`,
        });
      }
      break;
    }
    case 'player': {
      const [a, b] = [Number(was[0]), Number(is[0])];
      if (a !== b) out.push({ sel: [D('ratings'), '.page .card'], text: `Your OVR went ${b > a ? 'up' : 'down'} from ${a} to ${b}. The ratings show where it moved.` });
      if (was[1] !== is[1]) out.push({ sel: [D('ratings'), '.page .card'], text: `You play ${NAMES.pos[g.player.pos as keyof typeof NAMES.pos] ?? g.player.pos} now.` });
      // round 28 (owner: "getting the nickname should also count as a new feature"): keys from before
      // round 28 have no nickname part, and say nothing about it
      const nick = g.player.nickname;
      if (was.length > 2 && nick && was[2] !== is[2]) out.push({ sel: [D('name-card'), '.page .card'], text: `The media has a name for you: “${nick.name}”. It is on your name card.` });
      else if (was.length > 3 && nick && was[3] === '0' && is[3] === '1') out.push({ sel: [D('name-card'), '.page .card'], text: `Your logo is out, with your first brand deal: see it on your name card.` });
      break;
    }
    case 'league': {
      const fresh = g.nbaHistory.slice(Number(was[0]) || 0);
      const last = fresh[fresh.length - 1];
      if (last) out.push({ sel: [D('record-book'), '.page .card'], text: `${seasonLabel(last.year)} is in the books: the ${last.champion} won the title${last.finals ? ` (${last.finals})` : ''}.` });
      break;
    }
    case 'records': {
      const [h0, a0, t0] = was.map(Number);
      const newAwards = g.awards.slice(a0 || 0);
      if (newAwards.length) out.push({ sel: [D('trophies'), '.page .card'], text: `New in the trophy cabinet: ${newAwards.map((x) => x.label).slice(-3).join(', ')}.` });
      const newTourneys = g.tournaments.slice(t0 || 0);
      const lastT = newTourneys[newTourneys.length - 1];
      if (lastT) out.push({ sel: [D('tournaments'), '.page .card'], text: `${lastT.name}: ${lastT.result}.` });
      if (g.history.length > (h0 || 0)) {
        const lastH = g.history[g.history.length - 1];
        out.push({ sel: [D('season-log'), '.page .card'], text: `Your ${seasonLabel(lastH.year)} season is in the book.` });
      }
      break;
    }
    default:
      break;
  }
  return out;
}
