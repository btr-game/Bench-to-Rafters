// The main land's two secrets (ui/eggs.ts): the bottle bobbing in the water, and the note the old
// cheat code brings. Each opens a small pop-up with its code.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../art/Icon';
import { PixelX } from '../art/PixelX';
import { Sprite } from '../art/Sprites';
import { sfx } from '../sound';
import { t } from '../../i18n';
import { bottleCode, deskKey, konamiStep } from '../eggs';

/** The bottle, 3 by 5: the cork, the neck, the glass with the rolled note inside. */
const BOTTLE = ['.c.', '.g.', 'ggg', 'gpg', 'ggg'];
const BOTTLE_COLORS = { c: '#9C6B3C', g: '#7FD1B9', p: '#FFF3BF' };
/** Where it floats on the main land (map units, 224 by 100): open water east of the dock. */
const AT = { x: 212, y: 49 };

/** The bottle on the map (inside the map's SVG); it bobs a pixel at a time. */
export function BottleSprite() {
  return (
    <g className="ml-bottle">
      <Sprite rows={BOTTLE} x={AT.x} y={AT.y} colors={BOTTLE_COLORS} />
    </g>
  );
}

type Egg = 'bottle' | 'desk';

function EggPop({ egg, onClose }: { egg: Egg; onClose: () => void }) {
  const x = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    x.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('keydown', key, true);
      back?.focus?.();
    };
  }, [onClose]);
  const bottle = egg === 'bottle';
  const title = bottle ? t('A message in a bottle') : t('A note from the developer');
  return createPortal(
    <div className="hall-pop share-pop skip-pop" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="share-card">
        <button ref={x} className="pop-x" aria-label={t('Close')} onClick={onClose}>
          <PixelX />
        </button>
        <div className="share-head">
          <Icon name={bottle ? 'note' : 'door'} size={34} />
          <div style={{ minWidth: 0 }}>
            <div className="sec-title">{title}</div>
            <p className="small muted">{bottle ? t('It washed up on the main land, in handwriting you don’t know:') : t('You found the old code. The developer left a key here:')}</p>
          </div>
        </div>
        <code className="egg-code">{bottle ? bottleCode() : deskKey()}</code>
        <p className="small keep">{bottle ? t('The master code. Enter it on any Unlock button and the whole game opens.') : t('It opens the Developer door at the foot of the start page.')}</p>
      </div>
    </div>,
    document.body,
  );
}

/** The main land's secrets: the bottle's hit area over the map, and the cheat code on the keyboard. */
export function Eggs() {
  const [open, setOpen] = useState<Egg | null>(null);
  const at = useRef(0);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return;
      const step = konamiStep(at.current, e.key);
      at.current = step.at;
      if (step.done) {
        sfx('opened');
        setOpen('desk');
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  return (
    <>
      <button
        className="ml-egg"
        style={{ left: `${((AT.x - 3) / 224) * 100}%`, top: `${((AT.y - 2) / 100) * 100}%`, width: `${(9 / 224) * 100}%`, height: `${(9 / 100) * 100}%` }}
        aria-label={t('A bottle in the water')}
        onClick={() => (sfx('opened'), setOpen('bottle'))}
      />
      {open && <EggPop egg={open} onClose={() => setOpen(null)} />}
    </>
  );
}
