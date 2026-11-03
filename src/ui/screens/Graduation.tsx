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
import { UsernameBox } from '../components/Username';

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
        <Icon name="cap" size={72} />
        <div className="kicker">The road map · done</div>
        <h1>Graduation</h1>
        <p className="lede">You passed the beginner level: the full game is open, with Regular guy. The road map&rsquo;s other stops open the rest.</p>
      </section>
      <div className="diploma" aria-label="Your diploma">
        <Roll />
        <div className="scroll-paper diploma-paper">
          <div className="bucket-title">Diploma</div>
          <ul className="diploma-list">
            {/* round 35: beginner is the tutorial; each later stop opens a mode */}
            {(
              [
                ['Beginner · High school', 'the full game, with Regular guy', true],
                ['Intermediate · College', 'opens Reality hits hard', false],
                ['Advanced · NBA arena', 'opens Shoot for the stars', false],
                ['The island', 'opens the mini-games', false],
                ['The closing tour', 'any time, for the rest', false],
              ] as const
            ).map(([x, what, on]) => (
              <li key={x}>
                <Tick on={on} />
                <span>
                  {x} <small>· {what}</small>
                </span>
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
      {/* round 36 (owner: "ask the user for a username(changable) after the tutorial") */}
      <section className="card stack grad-username" data-tour="grad-username">
        <div className="sec-title with-icon">
          <Icon name="crowd" size={28} />
          Pick a username
        </div>
        <UsernameBox note="Shown beside your careers on the community boards and to friends, so people know whose player it is; your players keep their own names. Letters A to Z and numbers. You can change it any time in Settings." />
      </section>
      <div className="row-end">
        <button className="btn with-icon" data-tour="graduate" onClick={() => (sfx('graduate'), graduate())}>
          <Icon name="door" size={22} />
          Open the full game
        </button>
      </div>
      <FootBar where="graduation" />
    </div>
  );
}
