import { SHOP_ITEMS, type WearSlot } from '../../content/shop';
import type { GameState } from '../../engine/types';
import { useStore } from '../../store';
import { PlayerArt, styleLeague, type KitName } from '../art/Player';
import { team as teamOf } from '../selectors';
import { t, tx } from '../../i18n';

// The wardrobe (round 25): every accessory he has bought, by where it goes; pick one to put it on,
// "None" to take that slot off, or "Own look" to go back to how he came. Round 36: a tab of the
// Player tab's Your life card (YourLife.tsx).

const SLOTS: { slot: WearSlot; label: string }[] = [
  { slot: 'head', label: tx('Headband') },
  { slot: 'arm', label: tx('Shooting sleeve') },
  { slot: 'wrist', label: tx('Wristbands') },
  { slot: 'legs', label: tx('Leg sleeves') },
];

export function WardrobePanel({ g, kit }: { g: GameState; kit: KitName }) {
  const wear = useStore((s) => s.wear);
  const w = g.player.wardrobe;
  if (!w || w.owned.length === 0) return null;
  const tm = teamOf(g);
  return (
    <div className="wardrobe">
      <PlayerArt name={g.player.name} number={g.player.number} pos={g.player.pos} color={tm?.color} team={tm?.name} abbr={tm?.abbr} league={styleLeague(g.stage)} kit={kit} size={150} wear={w.on} />
      <div className="ward-slots">
        {SLOTS.map(({ slot, label }) => {
          const mine = SHOP_ITEMS.filter((i) => i.wear?.slot === slot && w.owned.includes(i.id));
          if (mine.length === 0) return null;
          const on = w.on[slot];
          return (
            <div key={slot} className="ward-row">
              <span className="kicker">{t(label)}</span>
              <div className="ward-swatches" role="group" aria-label={t(label)}>
                {mine.map((i) => (
                  <button key={i.id} className={`ward-swatch${on === i.id ? ' on' : ''}`} style={{ ['--sw' as string]: i.wear!.color }} aria-pressed={on === i.id} aria-label={t(i.name)} title={t(i.name)} onClick={() => wear(slot, i.id)}>
                  </button>
                ))}
                <button className={`btn small ghost${on === 'none' ? ' on' : ''}`} aria-pressed={on === 'none'} onClick={() => wear(slot, 'none')}>
                  {t('None')}
                </button>
                {on !== undefined && (
                  <button className="btn small ghost" onClick={() => wear(slot, null)}>
                    {t('Own look')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
