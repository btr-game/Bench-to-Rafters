import { heightMismatch } from '../../engine/flow';
import type { GameState } from '../../engine/types';
import { ATTRS } from '../../engine/balance';
import { NAMES } from '../../content/strings';
import { ht, fmtMoney } from '../format';
import { health, ovr, repName, roleName, stageLine, team } from '../selectors';
import { Meter, TeamChip } from './bits';

export function AttrRows({ g, compare }: { g: GameState; compare?: Record<string, number> }) {
  const p = g.player;
  return (
    <div className="attrs">
      {ATTRS.map((k) => {
        const v = p.attrs[k];
        const d = compare ? v - compare[k] : 0;
        return (
          <div className="attr" key={k}>
            <span>
              {NAMES.attr[k]}
              {p.focus.includes(k) && (
                <span className="focus-dot" title="Focus stat" aria-label="focus stat">
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
  const t = team(g);
  return (
    <section className="card pc">
      <div className="pc-top">
        <div style={{ minWidth: 0 }}>
          <div className="kicker">
            #{p.number} · {p.pos} · {ht(p.height)}
            {heightMismatch(g) ? (
              <span className="height-warn" title={heightMismatch(g)!.text}>
                {' '}
                SIZE
              </span>
            ) : null}{' '}
            · {p.archetype}
            {p.anomaly && <span className="anomaly-tag" title="A rare player who breaks the mold"> · {p.anomaly}</span>}
          </div>
          <h2 className="pc-name">{p.name}</h2>
          {t && <TeamChip name={t.name} color={t.color} />}
          <div className="muted small">{stageLine(g)}</div>
        </div>
        <div className="ovr" aria-label={`Overall ${Math.round(ovr(g))}`}>
          <b>{Math.round(ovr(g))}</b>
          <small>OVR</small>
        </div>
      </div>
      <dl className="facts">
        <div>
          <dt>Age</dt>
          <dd>{p.age}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{roleName(g)}</dd>
        </div>
        <div>
          <dt>Reputation</dt>
          <dd>{repName(g)}</dd>
        </div>
        <div>
          <dt>Health</dt>
          <dd>{health(g)}</dd>
        </div>
        {!compact && (
          <>
            <div>
              <dt>Scouts</dt>
              <dd>{p.scoutGrade ? `${p.scoutGrade} (${p.scoutRange![0]}–${p.scoutRange![1]})` : 'Not yet'}</dd>
            </div>
            <div>
              <dt>Bank</dt>
              <dd>{fmtMoney(p.bank)}</dd>
            </div>
          </>
        )}
      </dl>
      <div className="meters">
        <Meter label="Morale" value={p.morale} tone={p.morale < 35 ? 'bad' : p.morale > 70 ? 'good' : undefined} />
        <Meter label="Coach trust" value={p.trust} tone={p.trust <= 30 ? 'bad' : p.trust >= 70 ? 'good' : undefined} />
        <Meter label="Reputation" value={p.rep} tone="ink" />
        <Meter label="Body wear" value={p.wear ?? 0} tone={(p.wear ?? 0) >= 50 ? "bad" : (p.wear ?? 0) >= 25 ? "warn" : "good"} />
      </div>
      {!compact && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="sec-title">Ratings</div>
          <AttrRows g={g} compare={g.season?.attrsStart} />
        </div>
      )}
    </section>
  );
}
