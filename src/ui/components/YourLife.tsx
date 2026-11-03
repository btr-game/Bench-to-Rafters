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
import { t, tx } from '../../i18n';

type Life = 'staff' | 'wardrobe' | 'collection';
const TABS: { k: Life; label: string; icon: string }[] = [
  { k: 'staff', label: tx('Staff'), icon: 'chef' },
  { k: 'wardrobe', label: tx('Wardrobe'), icon: 'hanger' },
  { k: 'collection', label: tx('Collection'), icon: 'car' },
];
const KEY = 'btr-life-tab';

function lastPick(): Life | null {
  try {
    const v = localStorage.getItem(KEY);
    return TABS.find((x) => x.k === v)?.k ?? null;
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
  const tabs = TABS.filter((x) => count[x.k] > 0);
  if (tabs.length === 0) return null;
  const on = tabs.find((x) => x.k === pick)?.k ?? tabs[0].k;
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
    <Card title={t('Your life')} kicker={t('Off the court')}>
      <div className="seg life-tabs" role="group" aria-label={t('Your life')}>
        {tabs.map((x) => (
          <button key={x.k} data-life={x.k} data-tour={x.k === on ? undefined : x.k} aria-pressed={x.k === on} onClick={() => choose(x.k)}>
            <span className="life-icon">
              <Icon name={x.icon} size={20} />
            </span>
            <span className="life-label">{t(x.label)}</span>
            <span className="life-count num">{count[x.k]}</span>
          </button>
        ))}
      </div>
      <div className="life-panel stack" data-tour={on}>
        {on === 'staff' ? <StaffPanel g={g} /> : on === 'wardrobe' ? <WardrobePanel g={g} kit={kit} /> : <CollectionPanel g={g} />}
      </div>
    </Card>
  );
}
