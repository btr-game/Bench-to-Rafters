// Share the game (owner: "can you add a share button throughout? as in share the link of the game,
// not the player card or anything"). A Share button in the top bar of the career and of the start
// page, at the top of the side pages (community, career log, achievements, mini-games), at the foot
// of every tab and on the thank-you page. It opens one small pop-up: the link to copy, the phone's
// own share sheet where there is one, and links that open a post on the big sites.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../art/Icon';
import { PixelX } from '../art/PixelX';
import { sfx } from '../sound';
import { recordShare } from '../achievements';
import { achievementsNow } from '../../store';
import { SkipButton } from './SkipTutorial';

/** The game's address on the web (Netlify). Change it here if the game moves to a domain of its own. */
export const GAME_URL = 'https://bench-to-rafters.netlify.app/';
const TITLE = 'Bench to Rafters';
const PITCH = 'A basketball career game: from the bench to the rafters. Free, in your browser.';

const enc = encodeURIComponent;
const SITES: { name: string; href: string }[] = [
  { name: 'X', href: `https://twitter.com/intent/tweet?text=${enc(PITCH)}&url=${enc(GAME_URL)}` },
  { name: 'Reddit', href: `https://www.reddit.com/submit?url=${enc(GAME_URL)}&title=${enc(`${TITLE}: ${PITCH}`)}` },
  { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(GAME_URL)}` },
  { name: 'WhatsApp', href: `https://wa.me/?text=${enc(`${PITCH} ${GAME_URL}`)}` },
  { name: 'Email', href: `mailto:?subject=${enc(TITLE)}&body=${enc(`${PITCH}\n\n${GAME_URL}`)}` },
];

/** Counted once it leaves: the link copied, the share sheet used, or a site opened (the achievement). */
function shared(): void {
  recordShare();
  achievementsNow();
}

function SharePanel({ onClose }: { onClose: () => void }) {
  const [said, setSaid] = useState<'copied' | 'select' | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    first.current?.focus();
    // Escape closes it before the page's own Escape (back, or the settings)
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
  // where copying is refused, the link is selected for the player's own copy
  const pick = () => {
    field.current?.focus();
    field.current?.select();
    setSaid('select');
  };
  const copy = () => {
    try {
      if (!navigator.clipboard) return pick();
      navigator.clipboard.writeText(GAME_URL).then(() => {
        setSaid('copied');
        sfx('sent');
        shared();
      }, pick);
    } catch {
      pick();
    }
  };
  const native = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = () => {
    navigator.share({ title: TITLE, text: PITCH, url: GAME_URL }).then(shared, (e: unknown) => {
      // closed by the player: nothing to do; refused here: the link to copy instead
      if ((e as { name?: string })?.name !== 'AbortError') copy();
    });
  };
  return createPortal(
    <div className="hall-pop share-pop" role="dialog" aria-modal="true" aria-label="Share the game" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="share-card">
        <button className="pop-x" aria-label="Close" onClick={onClose}>
          <PixelX />
        </button>
        <div className="share-head">
          <Icon name="share" size={34} />
          <div style={{ minWidth: 0 }}>
            <div className="sec-title">Share the game</div>
            <p className="small muted">Send Bench to Rafters to a friend. It is free and plays in the browser.</p>
          </div>
        </div>
        <div className="share-link">
          <input ref={field} readOnly value={GAME_URL} aria-label="The game's link" onFocus={(e) => e.currentTarget.select()} />
          <button ref={first} className="btn small with-icon" onClick={copy}>
            Copy link
          </button>
        </div>
        <p className="small keep share-said" aria-live="polite">
          {said === 'copied' ? 'Link copied. Paste it anywhere.' : said === 'select' ? 'Copying is blocked here: the link is selected, so copy it with Ctrl+C (Cmd+C on a Mac).' : ' '}
        </p>
        {native && (
          <button className="btn ghost with-icon share-native" onClick={share}>
            <Icon name="share" size={20} />
            Share to an app…
          </button>
        )}
        <div className="share-sites" aria-label="Post it on">
          {SITES.map((s) => (
            <a key={s.name} className="btn small ghost" href={s.href} target="_blank" rel="noopener noreferrer" onClick={shared}>
              {s.name}
            </a>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The button that opens it: `top` in a top bar (the word hides on a phone), `foot` beside the
 * feedback at the foot of a page, `big` on its own (the thank-you page). */
export function ShareButton({ look = 'top' }: { look?: 'top' | 'foot' | 'big' }) {
  const [open, setOpen] = useState(false);
  const show = () => {
    sfx('page');
    setOpen(true);
  };
  const cls = look === 'foot' ? 'card share-foot with-icon' : look === 'big' ? 'btn ghost with-icon share-big' : 'icon-btn share-btn';
  return (
    <>
      {/* round 34: in a top bar, the tutorial's Skip button comes just before Share */}
      {look === 'top' && <SkipButton />}
      <button className={cls} data-tour={look === 'top' ? 'share-btn' : undefined} aria-haspopup="dialog" aria-expanded={open} aria-label="Share the game" onClick={show}>
        <Icon name="share" size={look === 'top' ? 18 : 22} />
        <span className="share-word">{look === 'top' ? 'Share' : 'Share the game'}</span>
      </button>
      {open && <SharePanel onClose={() => setOpen(false)} />}
    </>
  );
}
