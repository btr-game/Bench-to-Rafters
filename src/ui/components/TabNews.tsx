// A tab's news, shown where it is (owner: "if there's something new in another tab (orange dot),
// navigate user directly to the new feature... highlight it and put a 'got it' or 'ok' to make
// sure the user sees it"). Opening a tab with a dot takes the page to each change in turn
// (ui/tabNews.ts names them), rings its card and waits for Got it (or Enter).

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { sfx } from '../sound';
import { t } from '../../i18n';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function TabNews() {
  const spots = useStore((s) => s.spots);
  const tab = useStore((s) => s.tab);
  const endSpot = useStore((s) => s.endSpot);
  const gotIt = () => {
    sfx('click');
    endSpot();
  };
  const spot = spots && spots.tab === tab ? spots.list[0] : null;
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [tipH, setTipH] = useState(120);

  // find the card once the tab has drawn; a card that never shows (folded away) is passed over
  useEffect(() => {
    setEl(null);
    setBox(null);
    if (!spot) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const hit = spot.sel.map((s) => document.querySelector<HTMLElement>(s)).find((e): e is HTMLElement => !!e && e.offsetParent !== null);
      if (hit) {
        window.clearInterval(timer);
        const r = hit.getBoundingClientRect();
        // a short card comes to the middle of the screen, a tall one to just under the bars
        const y = r.height < window.innerHeight * 0.6 ? r.top + window.scrollY - (window.innerHeight - r.height) / 2 : r.top + window.scrollY - 150;
        window.scrollTo({ top: Math.max(0, y), behavior: reduced() ? 'auto' : 'smooth' });
        setEl(hit);
        sfx('reveal');
      } else if (++tries > 20) {
        window.clearInterval(timer);
        endSpot();
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [spot, endSpot]);

  // follow the card as the page moves
  useEffect(() => {
    if (!el) return;
    let raf = 0;
    const tick = () => {
      const r = el.getBoundingClientRect();
      setBox((b) => (b && b.x === r.left && b.y === r.top && b.w === r.width && b.h === r.height ? b : { x: r.left, y: r.top, w: r.width, h: r.height }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [el]);

  // Enter or Space means Got it, before the game's own keys or any focused button
  useEffect(() => {
    if (!el) return;
    const key = (e: KeyboardEvent) => {
      if ((e.key !== 'Enter' && e.key !== ' ') || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      sfx('click');
      endSpot();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [el, endSpot]);

  useLayoutEffect(() => {
    if (tip.current && tip.current.offsetHeight !== tipH) setTipH(tip.current.offsetHeight);
  });

  if (!spot || !el || !box || !spots) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(340, vw - 24);
  const left = Math.max(12, Math.min(vw - w - 12, box.x + box.w / 2 - w / 2));
  const below = box.y + box.h + 14;
  const above = box.y - 14 - tipH;
  const top = below + tipH < vh - 8 ? below : above > 8 ? above : Math.max(8, Math.min(vh - tipH - 8, box.y + 12));
  const at = spots.total - spots.list.length + 1;
  return createPortal(
    <>
      <div className="tour-ring" style={{ left: box.x - 6, top: box.y - 6, width: box.w + 12, height: box.h + 12 }} aria-hidden="true" />
      <div className="tour-tip spot-tip" ref={tip} role="alertdialog" aria-label={t('New on this tab')} style={{ left, top, width: w }}>
        <div className="kicker">{t('New on this tab')}{spots.total > 1 ? ` · ${t('{at} of {n}', { at, n: spots.total })}` : ''}</div>
        <p>{spot.text}</p>
        <div className="tour-row">
          <button className="btn small" autoFocus onClick={gotIt}>
            {t('Got it')} <kbd className="tour-key">Enter</kbd>
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
