import { SHOP_ITEMS, type WearSlot } from '../../content/shop';
import type { GameState } from '../../engine/types';
import { useStore } from '../../store';
import { PlayerArt, styleLeague } from '../art/Player';
import { team as teamOf } from '../selectors';
import { Card } from './bits';

// The wardrobe (round 25): every accessory he has bought, by where it goes; pick one to put it on,
// "None" to take that slot off, or "Own look" to go back to how he came.

const SLOTS: { slot: WearSlot; label: string }[] = [
  { slot: 'head', label: 'Headband' },
  { slot: 'arm', label: 'Shooting sleeve' },
  { slot: 'wrist', label: 'Wristbands' },
  { slot: 'legs', label: 'Leg sleeves' },
];

export function WardrobeCard({ g }: { g: GameState }) {
  const wear = useStore((s) => s.wear);
  const w = g.player.wardrobe;
  if (!w || w.owned.length === 0) return null;
  const t = teamOf(g);
  return (
    <Card title="Wardrobe" kicker={`${w.owned.length} accessor${w.owned.length === 1 ? 'y' : 'ies'}`} tour="wardrobe">
      <div className="wardrobe">
        <PlayerArt name={g.player.name} number={g.player.number} pos={g.player.pos} color={t?.color} team={t?.name} abbr={t?.abbr} league={styleLeague(g.stage)} size={150} wear={w.on} />
        <div className="stack" style={{ gap: 10, minWidth: 0 }}>
          {SLOTS.map(({ slot, label }) => {
            const mine = SHOP_ITEMS.filter((i) => i.wear?.slot === slot && w.owned.includes(i.id));
            if (mine.length === 0) return null;
            const on = w.on[slot];
            return (
              <div key={slot} className="ward-row">
                <span className="kicker">{label}</span>
                <div className="ward-swatches" role="group" aria-label={label}>
                  {mine.map((i) => (
                    <button key={i.id} className={`ward-swatch${on === i.id ? ' on' : ''}`} style={{ ['--sw' as string]: i.wear!.color }} aria-pressed={on === i.id} aria-label={i.name} title={i.name} onClick={() => wear(slot, i.id)}>
                    </button>
                  ))}
                  <button className={`btn small ghost${on === 'none' ? ' on' : ''}`} aria-pressed={on === 'none'} onClick={() => wear(slot, 'none')}>
                    None
                  </button>
                  {on !== undefined && (
                    <button className="btn small ghost" onClick={() => wear(slot, null)}>
                      Own look
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
