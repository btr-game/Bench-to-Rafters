// The username box (round 36, owner: "ask the user for a username(changable) after the tutorial.
// this is for the community function (so that users can know who's player it is without having
// constraints on the player name)"). One box for the graduation page, the start page's prompt,
// Settings and Play with friends: the same name everywhere, kept on this device.

import { useState } from 'react';
import { USERNAME_MAX, cleanUsername, isRude, setUsername, username } from '../names';
import { sfx } from '../sound';
import { recordUsername } from '../achievements';
import { achievementsNow } from '../../store';
import { t } from '../../i18n';

export function UsernameBox({ onSet, note, compact }: { onSet?: (name: string) => void; note?: string; compact?: boolean }) {
  const [v, setV] = useState(username());
  const [kept, setKept] = useState(username());
  const rude = isRude(v);
  const same = v.trim() === kept;
  const save = () => {
    if (!v.trim() || rude || same) return;
    setUsername(v);
    // round 36: picking one, and each change, count toward the username's achievements
    recordUsername(kept);
    achievementsNow();
    const now = username();
    setKept(now);
    onSet?.(now);
    sfx('confirm');
  };
  return (
    <div className={`stack username-box${compact ? ' compact' : ''}`} style={{ gap: 6 }}>
      <label className="field">
        <span className="small muted">{t('Your username')}</span>
        <div className="row" style={{ gap: 8 }}>
          <input maxLength={USERNAME_MAX} value={v} placeholder={t('Shown beside your careers')} aria-invalid={rude} onChange={(e) => setV(cleanUsername(e.target.value))} onKeyDown={(e) => e.key === 'Enter' && save()} />
          <button className="btn" disabled={!v.trim() || rude || same} onClick={save}>
            {kept && same ? t('Saved') : t('Save')}
          </button>
        </div>
      </label>
      {rude ? (
        <p className="small name-note bad">{t('That username isn’t allowed. Pick another one.')}</p>
      ) : (
        <p className="small muted desc">{note ?? t('Shown beside your careers on the community boards and to friends, so people know whose player it is; your player keeps his own name. Letters A to Z and numbers. The game keeps no email or login.')}</p>
      )}
    </div>
  );
}
