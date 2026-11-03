// Round 36 (from the owner's simplification list, "i dont really want to cut anything"): staff, the
// wardrobe and the collection in one card on the Player tab, a tab each, every button kept. A tab
// with nothing in it is left out, and the card with none. It opens on the viewer's last pick (kept
// on this device), else the first tab with something in it.

import { useEffect, useState } from 'react';
import type { GameState } from '../../engine/types';
import { Icon } from '../art/Icon';
import type { KitName } from '../art/Player';
import { SPOT } from '../fold';
import { Card } from './bits';
import { CollectionPanel, collected } from './Collection';
import { StaffPanel } from './StaffCard';
import { WardrobePanel } from './Wardrobe';

type Life = 'staff' | 'wardrobe' | 'collection';
const TABS: { k: Life; label: string; icon: string }[] = [
  { k: 'staff', label: 'Staff', icon: 'chef' },
  { k: 'wardrobe', label: 'Wardrobe', icon: 'hanger' },
  { k: 'collection', label: 'Collection', icon: 'car' },
];
const KEY = 'btr-life-tab';

function lastPick(): Life | null {
  try {
    const v = localStorage.getItem(KEY);
    return TABS.find((t) => t.k === v)?.k ?? null;
  } catch {
    return null;
  }
}

export function LifeCard({ g, kit }: { g: GameState; kit: KitName }) {
  const [pick, setPick] = useState<Life | null>(lastPick);
  // a guide step about one of the tabs (the Guide mode tour, the tutorial) shows it, for this visit
  useEffect(() => {
    const look = (e: Event) => {
      const k = ((e.target as Element).closest?.('[data-life]') as HTMLElement | null)?.dataset.life as Life | undefined;
      if (k) setPick(k);
    };
    document.addEventListener(SPOT, look);
    return () => document.removeEventListener(SPOT, look);
  }, []);
  const count: Record<Life, number> = { staff: g.player.staff?.length ?? 0, wardrobe: g.player.wardrobe?.owned.length ?? 0, collection: collected(g).length };
  const tabs = TABS.filter((t) => count[t.k] > 0);
  if (tabs.length === 0) return null;
  const on = tabs.find((t) => t.k === pick)?.k ?? tabs[0].k;
  const choose = (k: Life) => {
    setPick(k);
    try {
      localStorage.setItem(KEY, k);
    } catch {
      /* the pick lasts for the visit */
    }
  };
  // the guides find a tab by its name: on its button, or on what it shows once it is picked
  return (
    <Card title="Your life" kicker="Off the court">
      <div className="seg life-tabs" role="group" aria-label="Your life">
        {tabs.map((t) => (
          <button key={t.k} data-life={t.k} data-tour={t.k === on ? undefined : t.k} aria-pressed={t.k === on} onClick={() => choose(t.k)}>
            <span className="life-icon">
              <Icon name={t.icon} size={20} />
            </span>
            <span className="life-label">{t.label}</span>
            <span className="life-count num">{count[t.k]}</span>
          </button>
        ))}
      </div>
      <div className="life-panel stack" data-tour={on}>
        {on === 'staff' ? <StaffPanel g={g} /> : on === 'wardrobe' ? <WardrobePanel g={g} kit={kit} /> : <CollectionPanel g={g} />}
      </div>
    </Card>
  );
}
