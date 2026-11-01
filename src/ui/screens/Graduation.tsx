// Graduation (round 33): the end of the tutorial. The bucket list is done; the diploma shows the exit
// code (owner: "at the end of the tutorial, the game reveals the exit password"), and the full game
// opens on the start page, with a Regular guy career suggested (owner: "highly suggested, but not
// necessary").

import { useState } from 'react';
import { useStore } from '../../store';
import { Icon } from '../art/Icon';
import { Roll, Tick } from '../components/Scroll';
import { revealCode } from '../road';
import { FootBar } from '../components/FootBar';
import { ShareButton } from '../components/Share';
import { SettingsMenu } from '../components/Settings';
import { sfx } from '../sound';

export function Graduation() {
  const graduate = useStore((s) => s.graduate);
  const [copied, setCopied] = useState(false);
  const code = revealCode();
  const copy = () => {
    void navigator.clipboard?.writeText(code).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };
  return (
    <div className="wrap no-tabs graduation-page">
      <header className="top">
        <div className="brand">
          Bench to <span>Rafters</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <ShareButton />
          <SettingsMenu g={null} />
        </div>
      </header>
      <section className="hero level-hero">
        <div className="kicker">The road map · done</div>
        <h1>Graduation</h1>
        <p className="lede">You played all three levels, every mini-game and the closing tour. The full game is yours.</p>
      </section>
      <div className="diploma" aria-label="Your diploma">
        <Roll />
        <div className="scroll-paper diploma-paper">
          <div className="bucket-title">Diploma</div>
          <ul className="diploma-list">
            {['Beginner · High school', 'Intermediate · College', 'Advanced · NBA arena', 'The island', 'The closing tour'].map((x) => (
              <li key={x}>
                <Tick on />
                <span>{x}</span>
              </li>
            ))}
          </ul>
          <div className="diploma-code">
            <span>Your exit code</span>
            <b data-tour="exit-code">{code}</b>
            <small>On another device, or if this one forgets you: Skip the tutorial, then this code.</small>
            <button className="btn small ghost" onClick={copy}>
              {copied ? 'Copied' : 'Copy the code'}
            </button>
          </div>
        </div>
        <Roll />
      </div>
      <div className="row-end">
        <button className="btn with-icon" data-tour="graduate" onClick={() => (sfx('title'), graduate())}>
          <Icon name="door" size={22} />
          Open the full game
        </button>
      </div>
      <FootBar where="graduation" />
    </div>
  );
}
