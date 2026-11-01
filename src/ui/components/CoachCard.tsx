// The head coach on Home (round 32, owner: "Coach on Home + role talk"): his face, his
// temperament and what it does, how much he trusts you, and once a season the chance to ask him
// for a bigger role.

import type { GameState } from '../../engine/types';
import { TEMPER, TEMPER_FX, canAskRole, myTeam, coachOf, roleOdds, trustWord } from '../../engine/career/coach';
import { useStore } from '../../store';
import { CoachArt } from '../art/Coach';
import { sfx } from '../sound';
import { Icon } from '../art/Icon';

export function CoachCard({ g }: { g: GameState }) {
  const ask = useStore((s) => s.askRole);
  const simple = useStore((s) => s.simple);
  const master = useStore((s) => s.master);
  const t = myTeam(g);
  if (!t || g.step === 'retired') return null;
  const c = coachOf(t);
  const trust = g.player.trust;
  return (
    <section className="card coach-home" data-tour="coach-home" style={{ ['--team' as string]: t.color }}>
      <div className="coach-home-art">
        <CoachArt coach={c} color={t.color} size={76} />
      </div>
      <div className="stack" style={{ gap: 6, minWidth: 0 }}>
        <div className="kicker">Head coach · {t.short || t.name}</div>
        <b className="coach-home-name">{c.name}</b>
        <div className="coach-home-tags">
          <span className={`coach-tag ${c.temper}`}>{TEMPER[c.temper]}</span>
          {c.grade && <span className="coach-tag">{c.grade}</span>}
        </div>
        {/* his trust in numbers is on the player card just above; here, in his words */}
        <span className={`coach-trust with-icon${trust >= 70 ? ' good' : trust <= 30 ? ' bad' : ''}`}>
          <Icon name="trust" size={18} />
          {trustWord(trust)}
        </span>
        {!simple && <span className="small muted">{TEMPER_FX[c.temper]}</span>}
        {canAskRole(g) ? (
          <button className="btn ghost small" onClick={() => (sfx('knock'), ask())}>
            Ask for a bigger role{master ? '' : ` · ${roleOdds(g).toLowerCase()}`}
          </button>
        ) : g.season && g.flags.roleAsk === g.year ? (
          <span className="small muted keep">You have asked him about your role this season.</span>
        ) : null}
      </div>
    </section>
  );
}
