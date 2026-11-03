import { useState } from 'react';
import { SHOP_ITEMS, type ShopCategory } from '../../content/shop';
import { VISITS } from '../../content/visits';
import type { GameState } from '../../engine/types';
import { useStore } from '../../store';
import { Icon } from '../art/Icon';
import { SHIFT_COLOR, shopIcon, shopShift } from '../art/icons';
import { PlayerArt, styleLeague } from '../art/Player';
import { team as teamOf } from '../selectors';

// Everything he has bought (round 25, the owner: a showcase of the purchases, and a visit to the
// car, the jet, the house...). Accessories live in the wardrobe instead. A thing he can use has a
// button: a short scene of him there, as often as he likes (round 28, owner: "let the user
// revisit"); the first visit of a season gives a small edge. Round 36: a tab of the Player tab's
// Your life card (YourLife.tsx).

const SHELVES: ShopCategory[] = ['Lifestyle', 'Training', 'Recovery', 'Shoes', 'Gear'];

/** The things on his shelves: every purchase but the accessories. */
export function collected(g: GameState) {
  return g.purchases.map((id) => SHOP_ITEMS.find((i) => i.id === id)).filter((i): i is (typeof SHOP_ITEMS)[number] => !!i && !i.wear);
}

export function CollectionPanel({ g }: { g: GameState }) {
  const visit = useStore((s) => s.visit);
  const [scene, setScene] = useState<{ id: string; text: string } | null>(null);
  const items = collected(g);
  if (items.length === 0) return null;
  const t = teamOf(g);
  const go = (id: string) => {
    const text = visit(id);
    if (text) setScene({ id, text });
  };
  const shown = scene && SHOP_ITEMS.find((i) => i.id === scene.id);
  return (
    <>
      {scene && shown && (
        <div className={`visit-scene place-${VISITS[scene.id]?.place ?? 'home'}`} role="status">
          <div className="visit-stage">
            <PlayerArt name={g.player.name} number={g.player.number} pos={g.player.pos} color={t?.color} team={t?.name} abbr={t?.abbr} league={styleLeague(g.stage)} size={110} wear={g.player.wardrobe?.on} />
            <span className="visit-thing">
              <Icon name={shopIcon(shown.id, shown.name)} shift={shopShift(shown.id)} size={88} />
            </span>
          </div>
          <div className="visit-text">
            <b>{shown.name}</b>
            <span>{scene.text}</span>
          </div>
          <button className="btn small ghost" onClick={() => setScene(null)}>
            Back
          </button>
        </div>
      )}
      {SHELVES.map((shelf) => {
        const here = items.filter((i) => i.category === shelf);
        if (here.length === 0) return null;
        return (
          <div key={shelf} className="stack" style={{ gap: 6 }}>
            <span className="kicker">{shelf}</span>
            <div className="collection">
              {here.map((i) => {
                const v = VISITS[i.id];
                const done = g.player.visits?.[i.id] === g.year;
                return (
                  <div key={i.id} className="coll-item">
                    <span className="coll-icon" style={{ background: `${SHIFT_COLOR[shopShift(i.id)]}22` }}>
                      <Icon name={shopIcon(i.id, i.name)} shift={shopShift(i.id)} size={36} />
                    </span>
                    <span className="coll-name">{i.name}</span>
                    {v && (
                      <button className="btn small" title={done ? 'Visited this season: the small edge comes again next season' : 'A small edge, once a season'} onClick={() => go(i.id)}>
                        {done ? 'Go again' : v.verb}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
