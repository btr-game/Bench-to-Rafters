// The achievement book (round 24) and the banners that announce a new one. Earned ones show how
// they were earned, when and by whom; the rest show only their name, as a riddle.

import { FootBar } from '../components/FootBar';
import { useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENTS, ACH_TIERS, type AchTier } from '../../engine/achievements';
import { ACH_CATS, achCatOf, type AchCat } from '../../engine/achievementCats';
import { useStore } from '../../store';
import type { GameState } from '../../engine/types';
import { PageTop } from '../components/PageTop';
import { earnedIn, loadAch, runOf } from '../achievements';
import { Badge } from '../art/Badge';
import { Icon } from '../art/Icon';

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

/** The entry on the start page, and on the Extras tab of a career (with how many that career earned:
 * the book opens on them). */
export function AchievementsCard({ g }: { g?: GameState }) {
  const setPage = useStore((s) => s.setPage);
  const [got] = useState(() => Object.keys(loadAch().got).length);
  const mine = useMemo(() => (g ? earnedIn(g).length : 0), [g]);
  return (
    <section className="card stack" data-tour={g ? 'run-ach' : undefined}>
      <div className="sec-title with-icon">
        <Badge tier="starter" size={26} />
        Achievements
      </div>
      <p className="small muted">
        {got} of {ACHIEVEMENTS.length} earned, over every career on this device. The rest are riddles.
      </p>
      {g && <div className="kicker">{mine ? `This career: ${mine} earned, at the top of the book` : 'This career: none yet'}</div>}
      <button className="btn ghost" data-tour="ach" onClick={() => setPage('achievements')}>
        Open the achievement book
      </button>
    </section>
  );
}

type Show = 'all' | 'got' | 'open';
type Ach = (typeof ACHIEVEMENTS)[number];

// round 35: the categories (engine/achievementCats.ts), worked out once; an id no rule files yet
// (a test fails then) waits under Oddities
const CAT_OF = new Map(ACHIEVEMENTS.map((a) => [a.id, achCatOf(a.id) ?? 'odd']));
const catOf = (id: string): AchCat => CAT_OF.get(id) ?? 'odd';

type Got = ReturnType<typeof loadAch>['got'][string];

/** One page of the book: how it was earned, when and by whom, or its name alone as a riddle. */
function AchCard({ a, g, here }: { a: Ach; g?: Got; here: boolean }) {
  const t = tierOf(a.tier);
  return (
    <div className={`ach-card${g ? ' got' : ''}${here ? ' this-run' : ''}`} style={{ ['--tier' as string]: t.color }}>
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
}

/** Earned and in all, by key (and for 'all'), over the achievements kept. */
function tally(got: Record<string, Got>, keep: (a: Ach) => boolean, key: (a: Ach) => string) {
  const m = new Map<string, { have: number; n: number }>();
  for (const a of ACHIEVEMENTS) {
    if (!keep(a)) continue;
    for (const k of ['all', key(a)]) {
      const x = m.get(k) ?? { have: 0, n: 0 };
      x.n += 1;
      if (got[a.id]) x.have += 1;
      m.set(k, x);
    }
  }
  return (k: string) => m.get(k) ?? { have: 0, n: 0 };
}

const ALL_CATS = [{ key: null, name: 'All', icon: 'book' }, ...ACH_CATS];

/** The book: every achievement by category and tier; the ones not earned yet keep their secret. */
export function AchievementBook() {
  const setPage = useStore((s) => s.setPage);
  const game = useStore((s) => s.game);
  const [saved] = useState(loadAch);
  const got = saved.got;
  // from a career, the book opens on what this career has earned, newest first, above the rest
  const run = game ? runOf(game) : null;
  const mine = useMemo(() => (run ? ACHIEVEMENTS.filter((a) => got[a.id]?.run === run).sort((a, b) => (got[a.id].at < got[b.id].at ? 1 : -1)) : []), [got, run]);
  // round 35: a tier, a category and earned or not, together; each row counts within the other's pick
  const [tier, setTier] = useState<AchTier | null>(null);
  const [cat, setCat] = useState<AchCat | null>(null);
  const [show, setShow] = useState<Show>('all');
  const tierN = useMemo(() => tally(got, (a) => !cat || catOf(a.id) === cat, (a) => a.tier), [got, cat]);
  const catN = useMemo(() => tally(got, (a) => !tier || a.tier === tier, (a) => catOf(a.id)), [got, tier]);
  // the whole book reads in chapters, one per category; a category picked shows it alone
  const chapters = useMemo(() => {
    const list = ACHIEVEMENTS.filter((a) => (!tier || a.tier === tier) && (!cat || catOf(a.id) === cat) && (show === 'all' || !!got[a.id] === (show === 'got')));
    return ACH_CATS.filter((c) => !cat || c.key === cat)
      .map((c) => ({ c, items: list.filter((a) => catOf(a.id) === c.key) }))
      .filter((x) => x.items.length);
  }, [tier, cat, show, got]);
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
        {game && (
          <section className="card stack ach-mine" aria-label="Earned this career">
            <div className="sec-title">{mine.length ? `Earned this career: ${mine.length}` : 'Earned this career: none yet'}</div>
            {mine.length ? (
              <div className="ach-grid">
                {mine.map((a) => (
                  <AchCard key={a.id} a={a} g={got[a.id]} here />
                ))}
              </div>
            ) : (
              <p className="small muted">What {game.player.name} earns shows up here first, and in gold in the book below.</p>
            )}
          </section>
        )}
        <div className="achv-tiers">
          {ACH_TIERS.map((t) => {
            const { have, n } = tierN(t.key);
            return (
              <button key={t.key} className={`achv-tier${tier === t.key ? ' on' : ''}`} aria-pressed={tier === t.key} style={{ ['--tier' as string]: t.color }} onClick={() => setTier(tier === t.key ? null : t.key)}>
                <Badge tier={t.key} size={30} />
                <span>
                  <b>{t.name}</b>
                  <small>
                    {have} / {n}
                  </small>
                </span>
                <i style={{ width: `${n ? (have / n) * 100 : 0}%` }} />
              </button>
            );
          })}
        </div>
        <div className="achv-cats" role="group" aria-label="Categories">
          {ALL_CATS.map((c) => {
            const { have, n } = catN(c.key ?? 'all');
            return (
              <button key={c.key ?? 'all'} className="achv-cat" aria-pressed={cat === c.key} onClick={() => setCat(cat === c.key ? null : c.key)}>
                <Icon name={c.icon} size={22} />
                <span>{c.name}</span>
                <small className="num">
                  {have}/{n}
                </small>
              </button>
            );
          })}
        </div>
        <p className="small muted">A category names only the area, never what it takes: the riddles stay riddles.</p>
        <div className="seg">
          {(
            [
              ['all', 'All'],
              ['got', 'Earned'],
              ['open', 'Still a riddle'],
            ] as [Show, string][]
          ).map(([k, l]) => (
            <button key={k} aria-pressed={show === k} onClick={() => setShow(k)}>
              {l}
            </button>
          ))}
        </div>
        {chapters.map(({ c, items }) => {
          const { have, n } = catN(c.key);
          return (
            <section key={c.key} className="achv-chapter" aria-label={c.name}>
              {!cat && (
                <h2 className="sec-title with-icon achv-cat-head">
                  <Icon name={c.icon} size={26} />
                  {c.name}
                  <small className="num">
                    {have}/{n}
                  </small>
                </h2>
              )}
              <div className="ach-grid">
                {items.map((a) => (
                  <AchCard key={a.id} a={a} g={got[a.id]} here={!!run && got[a.id]?.run === run} />
                ))}
              </div>
            </section>
          );
        })}
        {!chapters.length && <p className="small muted keep">{show === 'got' ? 'None earned here yet.' : show === 'open' ? 'Every one here is earned.' : 'None in this tier and category.'}</p>}
      </section>
      <FootBar where="achievement book" />
    </div>
  );
}
