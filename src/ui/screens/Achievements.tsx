// The achievement book (round 24) and the banners that announce a new one. Earned ones show how
// they were earned, when and by whom; the rest show only their name, as a riddle.

import { FootBar } from '../components/FootBar';
import { useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENTS, ACH_TIERS, type AchTier } from '../../engine/achievements';
import { MINI_TOTALS_ONLY } from '../../engine/achievementsMini';
import { useStore } from '../../store';
import type { GameState } from '../../engine/types';
import { PageTop } from '../components/PageTop';
import { loadAch, runOf } from '../achievements';
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

/** What one career earned (round 28), newest first. */
export function earnedIn(g: GameState): { id: string; name: string; tier: AchTier }[] {
  const run = runOf(g);
  const got = loadAch().got;
  return ACHIEVEMENTS.filter((a) => got[a.id]?.run === run)
    .sort((a, b) => (got[a.id].at < got[b.id].at ? 1 : -1))
    .map((a) => ({ id: a.id, name: a.name, tier: a.tier }));
}

/** The entry on the start page, and on the Extras tab of a career (with what that career earned; on
 * the Records tab and a top-bar button in round 28). */
export function AchievementsCard({ g }: { g?: GameState }) {
  const setPage = useStore((s) => s.setPage);
  const [got] = useState(() => Object.keys(loadAch().got).length);
  const mine = useMemo(() => (g ? earnedIn(g) : []), [g]);
  return (
    <section className="card stack" data-tour={g ? 'run-ach' : undefined}>
      <div className="sec-title with-icon">
        <Badge tier="starter" size={26} />
        Achievements
      </div>
      <p className="small muted">
        {got} of {ACHIEVEMENTS.length} earned, over every career on this device. The rest are riddles.
      </p>
      {g && (
        <div className="run-ach">
          <div className="kicker">{mine.length ? `This career: ${mine.length} earned` : 'This career: none yet'}</div>
          {mine.length > 0 && (
            <div className="run-ach-list">
              {mine.slice(0, 8).map((a) => (
                <span key={a.id} className="run-ach-chip" style={{ ['--tier' as string]: tierOf(a.tier).color }} title={tierOf(a.tier).name}>
                  <Badge tier={a.tier} size={20} />
                  {a.name}
                </span>
              ))}
              {mine.length > 8 && <span className="small muted">and {mine.length - 8} more</span>}
            </div>
          )}
        </div>
      )}
      <button className="btn ghost" data-tour="ach" onClick={() => setPage('achievements')}>
        Open the achievement book
      </button>
    </section>
  );
}

type Filter = 'all' | 'run' | 'got' | 'open' | 'arcade' | 'minicareer' | AchTier;

// round 27: the mini-game achievements, in the arcade and in a career (engine/achievementsMini.ts)
const ARCADE = new Set(MINI_TOTALS_ONLY);
const isMini = (id: string) => id.startsWith('mg-') || id === 'side';

/** The book: every achievement by tier; the ones not earned yet keep their secret. */
export function AchievementBook() {
  const setPage = useStore((s) => s.setPage);
  const game = useStore((s) => s.game);
  const [saved] = useState(loadAch);
  const got = saved.got;
  // round 28: from a career, the book opens on what this career has earned (when it has earned any)
  const run = game ? runOf(game) : null;
  const ran = run ? ACHIEVEMENTS.filter((a) => got[a.id]?.run === run).length : 0;
  const [filter, setFilter] = useState<Filter>(() => (ran ? 'run' : 'all'));
  const list = useMemo(
    () =>
      ACHIEVEMENTS.filter((a) =>
        filter === 'all'
          ? true
          : filter === 'run'
            ? got[a.id]?.run === run
            : filter === 'got'
              ? !!got[a.id]
              : filter === 'open'
                ? !got[a.id]
                : filter === 'arcade'
                  ? ARCADE.has(a.id)
                  : filter === 'minicareer'
                    ? isMini(a.id) && !ARCADE.has(a.id)
                    : a.tier === filter,
      ),
    [filter, got, run],
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
              ...(run ? ([['run', `This career (${ran})`]] as [Filter, string][]) : []),
              ['all', 'All'],
              ['got', 'Earned'],
              ['open', 'Still a riddle'],
              ['arcade', 'Mini-games'],
              ['minicareer', 'Mini-games in a career'],
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
            const here = !!g && !!run && g.run === run;
            return (
              <div key={a.id} className={`ach-card${g ? ' got' : ''}${here ? ' this-run' : ''}`} style={{ ['--tier' as string]: t.color }}>
                <Badge tier={a.tier} locked={!g} size={38} />
                <div>
                  <b>{a.name}</b>
                  <small className="achv-tier-name">{t.name}</small>
                  {here && <small className="this-run-tag">This career</small>}
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
      <FootBar where="achievement book" />
    </div>
  );
}
