import { useState } from 'react';
import { STAFF } from '../../content/staff';
import { STAFF_PAY } from '../../engine/balance';
import { staffPay } from '../../engine/career/staff';
import { fmtMoney } from '../../engine/economy/salary';
import type { GameState } from '../../engine/types';
import { useStore } from '../../store';
import { StaffScene } from '../art/Scene';
import { t } from '../../i18n';

// His staff (round 25, the owner): the people hired in events, each paid every season for a very
// small benefit. Stop by once a season, give a raise (more pay, more help), or let him go. Each
// is drawn at work, in the role's uniform (art/Scene.tsx). Round 36: a tab of the Player tab's
// Your life card (YourLife.tsx).

export function StaffPanel({ g }: { g: GameState }) {
  const act = useStore((s) => s.staffAct);
  const [said, setSaid] = useState<{ id: number; text: string } | null>(null);
  const [sure, setSure] = useState<number | null>(null);
  const staff = g.player.staff ?? [];
  if (staff.length === 0) return null;
  const total = staff.reduce((a, m) => a + staffPay(m), 0);
  return (
    <>
      <div className="kicker">{t('{pay} a season on the payroll', { pay: fmtMoney(total) })}</div>
      <div className="staff-list">
        {staff.map((m) => {
          const d = STAFF[m.role];
          const talked = m.talked === g.year;
          return (
            <div key={m.id} className="staff-row">
              <StaffScene name={m.name} role={m.role} place={d.place} title={d.title} />
              <div className="staff-who">
                <span className="kicker">{d.title} · {t('level {n}', { n: m.level })}</span>
                <b>{m.name}</b>
                <span className="small">{d.does}</span>
                <span className="small muted">
                  {t('{pay} a season · since {year} · paid {paid} so far', { pay: fmtMoney(staffPay(m)), year: m.since, paid: fmtMoney(m.paid) })}
                </span>
                {said?.id === m.id && <span className="staff-said">{said.text}</span>}
              </div>
              <div className="row staff-actions">
                <button className="btn small" disabled={talked} onClick={() => {
                  const text = act(m.id, 'talk');
                  if (text) setSaid({ id: m.id, text });
                }}>
                  {talked ? t('Talked this season') : t('Stop by')}
                </button>
                {m.level < STAFF_PAY.pay.length && (
                  <button className="btn small ghost" onClick={() => act(m.id, 'raise')}>
                    {t('Raise to {pay}', { pay: fmtMoney(staffPay({ role: m.role, level: m.level + 1 })) })}
                  </button>
                )}
                {sure === m.id ? (
                  <button className="btn small ghost danger" onClick={() => (act(m.id, 'go'), setSure(null))}>
                    {t('Let him go')}
                  </button>
                ) : (
                  <button className="btn small ghost" onClick={() => setSure(m.id)}>
                    {t('Let go')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
