// Built in a lab: spend credits on any rating (engine/career/lab.ts).

import { ATTR_MAX, ATTRS } from '../../engine/balance';
import { labCost } from '../../engine/flow';
import { ovrOf } from '../../engine/player/ovr';
import type { GameState } from '../../engine/types';
import { NAMES } from '../../content/strings';
import { useStore } from '../../store';
import { t } from '../../i18n';

export function LabCard({ g }: { g: GameState }) {
  const spend = useStore((s) => s.labSpend);
  const p = g.player;
  const credits = p.lab?.credits ?? 0;
  const live = g.step !== 'retired';
  return (
    <section className="card stack lab-card">
      <div className="row">
        <div>
          <div className="kicker">Built in a lab</div>
          <div className="sec-title">{t('Credits {n}', { n: credits.toFixed(1) })}</div>
        </div>
        <div className="spacer" />
        <div className="small muted lab-ovr">OVR {Math.round(ovrOf(p.attrs, p.pos))}</div>
      </div>
      <p className="muted small">{t('Training and events pay out credits. One credit buys a point; points cost 1.5 from 80 and 2 from 90.')}</p>
      <div className="lab-rows">
        {ATTRS.map((k) => {
          const v = p.attrs[k];
          const cost = labCost(v);
          const maxed = v >= ATTR_MAX;
          const can = live && !maxed && credits + 1e-9 >= cost;
          return (
            <div className="lab-row" key={k}>
              <span className="lab-name">{NAMES.attr[k]}</span>
              <b className="lab-v">{Math.floor(v)}</b>
              <span className="lab-cost small muted">{maxed ? t('max') : t('{n} cr', { n: cost })}</span>
              <button className="btn small" disabled={!can} onClick={() => spend(k, 1)} aria-label={t('{rating} plus 1', { rating: NAMES.attr[k] })}>
                +1
              </button>
              <button className="btn ghost small" disabled={!can || credits + 1e-9 < cost * 2} onClick={() => spend(k, 5)} aria-label={t('{rating} plus 5', { rating: NAMES.attr[k] })}>
                +5
              </button>
            </div>
          );
        })}
      </div>
      <div className="small muted">{t('Earned {n} credits so far.', { n: (p.lab?.earned ?? 0).toFixed(1) })}</div>
    </section>
  );
}
