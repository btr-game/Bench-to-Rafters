import { Icon } from '../art/Icon';
import { ICON_FOR } from '../art/icons';
import { PlayerArt, styleLeague } from '../art/Player';
import { heightMismatch } from '../../engine/flow';
import type { GameState } from '../../engine/types';
import { ATTRS } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import { ht, fmtMoney } from '../format';
import { health, ovr, repName, roleName, stageLine, team } from '../selectors';
import { Meter, TeamChip } from './bits';
import { weightOf } from '../../engine/player/weight';
import { t } from '../../i18n';

export function AttrRows({ g, compare }: { g: GameState; compare?: Record<string, number> }) {
  const p = g.player;
  return (
    <div className="attrs">
      {ATTRS.map((k) => {
        const v = p.attrs[k];
        const d = compare ? v - compare[k] : 0;
        return (
          <div className="attr" key={k}>
            <span className="attr-name">
              <Icon name={ICON_FOR[k]} size={20} />
              {NAMES.attr[k]}
              {p.focus.includes(k) && (
                <span className="focus-dot" title={t('Focus stat')} aria-label={t('focus stat')}>
                  {' '}
                  ●
                </span>
              )}
            </span>
            <div className="track" aria-hidden="true">
              <div className="fill ink" style={{ width: `${Math.min(100, v)}%` }} />
            </div>
            <span className="v">{Math.round(v)}</span>
            <span className={`d ${d > 0.05 ? 'up' : d < -0.05 ? 'down' : ''}`}>{Math.abs(d) >= 0.1 ? `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

export function PlayerCard({ g, compact = false }: { g: GameState; compact?: boolean }) {
  const p = g.player;
  const tm = team(g);
  return (
    <section className="card pc">
      <div className="pc-head">
        <PlayerArt name={p.name} number={p.number} pos={p.pos} color={tm?.color} team={tm?.name} abbr={tm?.abbr} league={styleLeague(g.stage)} kit="road" size={92} wear={p.wardrobe?.on} />
        <div className="ovr" aria-label={t('Overall {n}', { n: Math.round(ovr(g)) })}>
          <b>{Math.round(ovr(g))}</b>
          <small>OVR</small>
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="kicker">
          #{p.number} · {p.pos} · {ht(p.height)} · {weightOf(p)} lb
          {heightMismatch(g) ? (
            <span className="height-warn" title={heightMismatch(g)!.text}>
              {' '}
              {t('SIZE')}
            </span>
          ) : null}{' '}
          · {p.archetype}
          {p.anomaly && <span className="anomaly-tag" title={t('A rare player who breaks the mold')}> · {p.anomaly}</span>}
        </div>
        <h2 className="pc-name">{p.name}</h2>
        {p.nickname && <div className="pc-nick">&ldquo;{p.nickname.name}&rdquo;</div>}
        {tm && <TeamChip name={tm.name} color={tm.color} />}
        <div className="muted small">{stageLine(g)}</div>
      </div>
      <dl className="facts">
        <div>
          <dt>{t('Age')}</dt>
          <dd>{p.age}</dd>
        </div>
        <div>
          <dt>{t('Role')}</dt>
          <dd>{roleName(g)}</dd>
        </div>
        <div>
          <dt>Reputation</dt>
          <dd>{repName(g)}</dd>
        </div>
        <div>
          <dt>{t('Health')}</dt>
          <dd>{health(g)}</dd>
        </div>
        {!compact && (
          <>
            <div>
              <dt>{t('Scouts')}</dt>
              <dd>{p.scoutGrade ? `${p.scoutGrade} (${p.scoutRange![0]}–${p.scoutRange![1]})` : t('Not yet')}</dd>
            </div>
            <div>
              <dt>{t('Bank')}</dt>
              <dd>{fmtMoney(p.bank)}</dd>
            </div>
          </>
        )}
      </dl>
      {!compact && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="sec-title">{t('Ratings')}</div>
          <AttrRows g={g} compare={g.season?.attrsStart} />
        </div>
      )}
      <div className="meters">
        <Meter label="Morale" value={p.morale} tone={p.morale < 35 ? 'bad' : p.morale > 70 ? 'good' : undefined} />
        <Meter label="Coach trust" value={p.trust} tone={p.trust <= 30 ? 'bad' : p.trust >= 70 ? 'good' : undefined} />
        <Meter label="Reputation" value={p.rep} tone="ink" />
        <Meter label="Body wear" value={p.wear ?? 0} tone={(p.wear ?? 0) >= 50 ? "bad" : (p.wear ?? 0) >= 25 ? "warn" : "good"} />
      </div>
    </section>
  );
}
