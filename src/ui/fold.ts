// Folding cards (round 34, owner: "for round 34, the theme is simplification. we're gonna make most
// in-game cards foldable"). Which cards are folded is kept on this device, by card, so a card stays
// the way it was left from season to season and career to career.

import { useEffect, useReducer } from 'react';
import { sfx } from './sound';
import { recordFolds } from './achievements';
import { achievementsNow } from '../store';

const KEY = 'btr-fold-v1';

function load(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

let folded = load();
const subs = new Set<() => void>();

/** A card that starts folded (round 36: the Player tab's Body panel) keeps the opposite instead:
 * `open:<id>` once the viewer has opened it. */
const OPEN = 'open:';

/** Whether the card `id` is folded, and the toggle (null: a card that does not fold). `startShut`:
 * folded until the viewer opens it. */
export function useFold(id: string | null, startShut = false): [boolean, () => void] {
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    subs.add(redraw);
    return () => {
      subs.delete(redraw);
    };
  }, []);
  const key = id && startShut ? OPEN + id : id;
  const toggle = () => {
    if (!key) return;
    if (folded.has(key)) folded.delete(key);
    else folded.add(key);
    sfx('click');
    try {
      localStorage.setItem(KEY, JSON.stringify([...folded]));
    } catch {
      /* the fold lasts for the visit */
    }
    subs.forEach((f) => f());
    // the book keeps the most cards folded at once (Origami, Neatly Pressed, Less Is More): the
    // ones the viewer folded, not the ones he opened
    recordFolds([...folded].filter((x) => !x.startsWith(OPEN)).length);
    achievementsNow();
  };
  return [!!key && folded.has(key) !== startShut, toggle];
}

/** Round 36: the guides (Guide mode's tour, the tutorial's lessons) tell the control they point at,
 * so a folded card opens for a look and a row of tabs shows the tab the step is about. */
export const SPOT = 'btr-spot';
export function spot(el: HTMLElement): void {
  el.dispatchEvent(new Event(SPOT, { bubbles: true }));
}

/** The dev deck: sets exactly these cards folded (none, before each card it deals: then a card that
 * starts folded is folded again, and `open:<id>` opens it). */
export function setFolds(ids: string[]): void {
  folded = new Set(ids);
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* the deck's folds last for the visit */
  }
  subs.forEach((f) => f());
}

/** The storage key changed under us (the dev deck's storage switch): read the folds again. */
export function reloadFolds(): void {
  folded = load();
  subs.forEach((f) => f());
}
