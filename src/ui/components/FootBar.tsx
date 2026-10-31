// The foot of every page (round 27, owner: "make me be able to access the dev deck in any page. put
// it next to the feedback on the bottom", and "the feedback card should also appear in all of the
// minigames as well"): Report a bug or send feedback, Share the game (round 28), and the Developer
// door (password).

import { useState } from 'react';
import { FeedbackFoot } from '../screens/Community';
import { isDev } from '../../dev/mode';
import { enterDev } from '../../dev/devSwitch';
import { Icon } from '../art/Icon';
import { ShareButton } from './Share';

/** The dev deck's door, folded: the password, then the deck. Not shown inside the deck itself. */
export function DevDoor() {
  const [pw, setPw] = useState('');
  const [wrong, setWrong] = useState(false);
  if (isDev()) return null;
  return (
    <details className="card dev-door">
      <summary className="with-icon">
        <Icon name="cards" size={20} />
        Developer
      </summary>
      <form
        className="row"
        style={{ gap: 8, flexWrap: 'wrap' }}
        onSubmit={(e) => {
          e.preventDefault();
          const ok = enterDev(pw);
          setWrong(!ok);
          // the deck opens in place; the password is not kept for the way back
          if (ok) setPw('');
        }}
      >
        <input type="password" aria-label="Developer password" placeholder="Password" value={pw} onChange={(e) => (setPw(e.target.value), setWrong(false))} autoComplete="off" />
        <button className="btn small" disabled={!pw}>
          Open the dev deck
        </button>
        {wrong && <span className="small" style={{ color: 'var(--bad)' }}>That is not it.</span>}
      </form>
    </details>
  );
}

/** `where` tags a feedback note with the page it came from. */
export function FootBar({ where }: { where: string }) {
  return (
    <div className="foot-bar">
      <FeedbackFoot where={where} />
      <ShareButton look="foot" />
      <DevDoor />
    </div>
  );
}
