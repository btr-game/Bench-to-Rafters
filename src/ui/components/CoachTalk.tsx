// The team style, set in a talk with the coach (round 28, owner: "make the team style choice more
// dramatic. maybe a short animation of the avatar talking to the team coach? with their speech
// bubble showing the new game plan"). Both as the cute pixel players in the locker room, the
// bubbles one after another, then the coach's playbook for the new style. Enter, Space or Escape
// skips ahead, then closes. Fast break and sim mode skip the talk (the style is set either way).

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TEAM_STYLES, type TeamStyle } from '../../engine/career/identity';
import type { GameState } from '../../engine/types';
import { team as teamOf } from '../selectors';
import { coachOf } from '../../engine/career/coach';
import { PlayerArt, styleLeague } from '../art/Player';
import { CoachArt } from '../art/Coach';
import { PlaybookArt } from '../art/Playbook';
import { PixelX } from '../art/PixelX';
import { sfx } from '../sound';
import { t } from '../../i18n';

export const COACH_LINES: Record<TeamStyle, [string, string, string]> = {
  pace: ['Coach, let’s run. Push it up the floor, shoot early.', 'A track meet, then. We outrun everybody until May.', 'And in May we keep running.'],
  defense: ['Coach, we win this with defense.', 'Switch everything, protect the rim. Ugly wins count the same.', 'Nobody scores easy on us.'],
  motion: ['Coach, nobody holds the ball. We share it.', 'Five passers on the floor. Steady, all year.', 'The open man gets it. Every time.'],
  inside: ['Coach, let’s pound it inside.', 'Feed the post, crash the glass, kick it out. Bully ball.', 'They will feel us on every possession.'],
  star: ['Coach, run it through me.', 'Your team, your ball. Do not make me regret it.', 'You won’t.'],
};

/** The talk, then the playbook. `onClose` when it is over. */
export function CoachTalk({ g, style, onClose }: { g: GameState; style: TeamStyle; onClose: () => void }) {
  const [step, setStep] = useState(0); // 0..3 the bubbles, 4 the playbook
  const club = teamOf(g);
  const coach = club ? coachOf(club) : null; // round 32: the team's own head coach, his name and face
  const color = club?.color ?? '#1F5FBF';
  const lines = COACH_LINES[style];
  useEffect(() => {
    if (step >= 4) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 450 : 1300);
    return () => window.clearTimeout(id);
  }, [step]);
  useEffect(() => {
    if (step > 0 && step < 4) sfx('chime');
    if (step === 4) sfx('confirm');
  }, [step]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (step < 4 && e.key !== 'Escape') setStep(4);
      else onClose();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [step, onClose]);
  return createPortal(
    <div className="hall-pop coach-pop" role="dialog" aria-modal="true" aria-label={t('A talk with the coach: {style}', { style: TEAM_STYLES[style].name })} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="coach-card" style={{ ['--team' as string]: color }}>
        <button className="pop-x" aria-label={t('Close')} onClick={onClose}>
          <PixelX />
        </button>
        <div className="kicker">{t('The coach’s office · a new game plan')}</div>
        <div className="coach-stage">
          <div className="coach-who me">
            <PlayerArt name={g.player.name} number={g.player.number} pos={g.player.pos} color={color} team={club?.name} abbr={club?.abbr} league={styleLeague(g.stage)} size={118} noBall wear={g.player.wardrobe?.on} />
            <span>{t('You')}</span>
          </div>
          <div className="coach-bubbles" aria-live="polite">
            {step >= 1 && <p className="bubble me">{lines[0]}</p>}
            {step >= 2 && <p className="bubble coach">{lines[1]}</p>}
            {step >= 3 && <p className="bubble me">{lines[2]}</p>}
          </div>
          <div className="coach-who coach">
            <CoachArt coach={coach ?? { name: 'Head Coach', temper: 'tactician' }} color={color} size={118} mirror />
            <span>{coach ? t('Coach {name}', { name: coach.name.split(' ').slice(-1)[0] }) : t('Coach')}</span>
          </div>
        </div>
        {step >= 4 && (
          <div className="coach-plan">
            <PlaybookArt style={style} size={150} />
            <div className="stack" style={{ gap: 6, minWidth: 0 }}>
              <b className="coach-plan-name">{t('New game plan: {style}', { style: TEAM_STYLES[style].name })}</b>
              <span className="small prose">{TEAM_STYLES[style].text}</span>
              <button className="btn small" onClick={onClose} autoFocus>
                {t('Let’s go')}
              </button>
            </div>
          </div>
        )}
        {step < 4 && <p className="small muted keep pop-hint">{t('Enter or Space to skip ahead')}</p>}
      </div>
    </div>,
    document.body,
  );
}
