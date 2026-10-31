// The achievement book (round 24) and the banners that announce a new one. Earned ones show how
// they were earned, when and by whom; the rest show only their name, as a riddle.

import { useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENTS, ACH_TIERS, type AchTier } from '../../engine/achievements';
import { useStore } from '../../store';
import { PageTop } from '../components/PageTop';
import { loadAch } from '../achievements';
import { Badge } from '../art/Badge';

const tierOf = (k: AchTier) => ACH_TIERS.find((t) => t.key === k)!;

function Toast({ x, dismiss }: { x: { id: string; name: string; tier: AchTier; more?: number }; dismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => dismiss(x.id), 4500);
    return () => clearTimeout(t);
  }, [x.id, dismiss]);
  return (
    <button className={`ach-toast tier-${x.tier}`} style={{ ['--tier' as string]: tierOf(x.tier).color }} onClick={() => dismiss(x.id)} title="Dismiss">
      <Badge tier={x.tier} size={34} />
      <span>
        <small>Achievement · {tierOf(x.tier).name}</small>
        <b>{x.name}</b>
        {x.more ? <small>and {x.more} more: see the achievement book</small> : null}
      </span>
    </button>
  );
}

/** The banners at the top of the screen: each fades after a few seconds, or on a click. */
export function AchToasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <div className="ach-toasts" aria-live="polite">
      {toasts.map((x) => (
        <Toast key={x.id} x={x} dismiss={dismiss} />
      ))}
    </div>
  );
}

/** The entry on the start page. */
export function AchievementsCard() {
  const setPage = useStore((s) => s.setPage);
  const [got] = useState(() => Object.keys(loadAch().got).length);
  return (
    <section className="card stack">
      <div className="sec-title with-icon">
        <Badge tier="starter" size={26} />
        Achievements
      </div>
      <p className="small muted">
        {got} of {ACHIEVEMENTS.length} earned, over every career on this device. The rest are riddles.
      </p>
      <button className="btn ghost" data-tour="ach" onClick={() => setPage('achievements')}>
        Open the achievement book
      </button>
    </section>
  );
}

type Filter = 'all' | 'got' | 'open' | AchTier;

/** The book: every achievement by tier; the ones not earned yet keep their secret. */
export function AchievementBook() {
  const setPage = useStore((s) => s.setPage);
  const [saved] = useState(loadAch);
  const [filter, setFilter] = useState<Filter>('all');
  const got = saved.got;
  const list = useMemo(
    () => ACHIEVEMENTS.filter((a) => (filter === 'all' ? true : filter === 'got' ? !!got[a.id] : filter === 'open' ? !got[a.id] : a.tier === filter)),
    [filter, got],
  );
  const total = Object.keys(got).length;
  return (
    <div className="wrap">
      <PageTop trail={['Achievement book']} back={() => setPage(null)} />
      <section className="stack stage-in">
        <div>
          <div className="kicker">
            {total} of {ACHIEVEMENTS.length} earned · kept on this device across careers
          </div>
          <h1 className="hub-title with-icon">
            <Badge tier="hof" size={40} />
            Achievement book
          </h1>
          <p className="prose">Every milestone you reach, in any career, stays here for good. Ones you haven’t earned show only their name: work out the riddle.</p>
        </div>
        <div className="achv-tiers">
          {ACH_TIERS.map((t) => {
            const all = ACHIEVEMENTS.filter((a) => a.tier === t.key);
            const have = all.filter((a) => got[a.id]).length;
            return (
              <button key={t.key} className={`achv-tier${filter === t.key ? ' on' : ''}`} style={{ ['--tier' as string]: t.color }} onClick={() => setFilter(filter === t.key ? 'all' : t.key)}>
                <Badge tier={t.key} size={30} />
                <span>
                  <b>{t.name}</b>
                  <small>
                    {have} / {all.length}
                  </small>
                </span>
                <i style={{ width: `${(have / all.length) * 100}%` }} />
              </button>
            );
          })}
        </div>
        <div className="seg">
          {(
            [
              ['all', 'All'],
              ['got', 'Earned'],
              ['open', 'Still a riddle'],
            ] as [Filter, string][]
          ).map(([k, l]) => (
            <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className="ach-grid">
          {list.map((a) => {
            const g = got[a.id];
            const t = tierOf(a.tier);
            return (
              <div key={a.id} className={`ach-card${g ? ' got' : ''}`} style={{ ['--tier' as string]: t.color }}>
                <Badge tier={a.tier} locked={!g} size={38} />
                <div>
                  <b>{a.name}</b>
                  <small className="achv-tier-name">{t.name}</small>
                  {g ? (
                    <p className="small">
                      {a.how}{' '}
                      <span className="muted">
                        {new Date(g.at).toLocaleDateString()}
                        {g.who ? ` · ${g.who}` : ''}
                      </span>
                    </p>
                  ) : (
                    <p className="small muted keep">???</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
