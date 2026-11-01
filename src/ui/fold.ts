// Folding cards (round 34, owner: "for round 34, the theme is simplification. we're gonna make most
// in-game cards foldable"). Which cards are folded is kept on this device, by card, so a card stays
// the way it was left from season to season and career to career.

import { useEffect, useReducer } from 'react';
import { sfx } from './sound';

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

/** Whether the card `id` is folded, and the toggle (null: a card that does not fold). */
export function useFold(id: string | null): [boolean, () => void] {
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    subs.add(redraw);
    return () => {
      subs.delete(redraw);
    };
  }, []);
  const toggle = () => {
    if (!id) return;
    if (folded.has(id)) folded.delete(id);
    else folded.add(id);
    sfx('click');
    try {
      localStorage.setItem(KEY, JSON.stringify([...folded]));
    } catch {
      /* the fold lasts for the visit */
    }
    subs.forEach((f) => f());
  };
  return [!!id && folded.has(id), toggle];
}

/** The storage key changed under us (the dev deck's storage switch): read the folds again. */
export function reloadFolds(): void {
  folded = load();
  subs.forEach((f) => f());
}
