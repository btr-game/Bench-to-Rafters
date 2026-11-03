// The rafters (playtest round 7): the ultimate goal of a career gets its own page. Each team
// that retires his number hangs a banner from the arena's catwalk; the page says why.

import type { GameState } from '../../engine/types';
import { raftersDetail, raftersNearMiss, RAFTERS_POINTS } from '../../engine/awards/details';
import { Card } from './bits';
import { BannerArt } from '../art/Trophy';
import { t } from '../../i18n';

const yrs = (a: number, b: number) => (a === b ? String(a + 1) : `${a}–${b + 1}`);
// on the banner itself: '38-47'
const short = (y: string) => y.replace(/\d\d(\d\d)/g, '$1').replace('–', '-');

function Banner({ name, number, color, years, team, i, size = 250 }: { name: string; number: number; color: string; years: string; team: string; i: number; size?: number }) {
  const last = name.split(' ').pop() ?? name;
  return (
    <div className="rf-banner" style={{ animationDelay: `${0.25 + i * 0.35}s` }} title={team}>
      <div className="rf-cloth-art">
        <BannerArt kind="retired" color={color} lines={[last, short(years)]} number={number} size={size} />
      </div>
    </div>
  );
}

/** The full ceremony page, shown first when a retired player's jersey hangs somewhere. */
export function RaftersPage({ g, onContinue }: { g: GameState; onContinue: () => void }) {
  const teams = raftersDetail(g);
  const p = g.player;
  return (
    <section className="rf-stage" aria-label="The rafters">
      <div className="rf-beam" aria-hidden="true" />
      <div className="rf-hang">
        {teams.map((t, i) => (
          <Banner key={t.id} i={i} name={p.name} number={p.number} color={t.color} years={yrs(t.first, t.last)} team={t.name} />
        ))}
      </div>
      <div className="rf-text">
        <div className="kicker">The rafters</div>
        <h1>Number {p.number} hangs forever</h1>
        {teams.map((t) => (
          <p key={t.id}>
            The <b>{t.name}</b> retire number {p.number}. {t.why}.
          </p>
        ))}
        <p className="rf-meaning">
          The highest honour a team can give: nobody on the {teams[0]?.name ?? 'team'} will wear {p.number} again. On the legacy tier list it sits in the
          S tier with the Hall of Fame and MVP, worth {RAFTERS_POINTS} legacy points for each team that hangs it.
        </p>
        <button className="btn" onClick={onContinue}>
          {t('See the whole career')}
        </button>
      </div>
    </section>
  );
}

/** On the career page: the banners small, or how close he came when nobody hung one. */
export function RaftersSummary({ g, onOpen }: { g: GameState; onOpen: () => void }) {
  const teams = raftersDetail(g);
  if (teams.length) {
    return (
      <section className="rf-mini" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
        <div className="rf-mini-hang">
          {teams.map((t, i) => (
            <Banner key={t.id} i={i} name={g.player.name} number={g.player.number} color={t.color} years={yrs(t.first, t.last)} team={t.name} size={96} />
          ))}
        </div>
        <div>
          <div className="kicker">The rafters</div>
          <div className="rf-mini-title">
            {teams.map((t) => t.name).join(' and ')} retire number {g.player.number}
          </div>
          <div className="small">{t('Tap to open the ceremony')}</div>
        </div>
      </section>
    );
  }
  const miss = raftersNearMiss(g);
  return (
    <Card title="The rafters" kicker="The ultimate honour">
      <p style={{ margin: 0 }}>No team hangs your jersey.</p>
      {miss && (
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          {miss.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
