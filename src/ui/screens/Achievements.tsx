// The achievement book (round 24) and the banners that announce a new one. Earned ones show how
// they were earned, when and by whom; the rest show only their name, as a riddle. Round 36: the
// Endings page, the twelve endings a career can have, each seen one as its scene.

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
import { EndingArt } from '../art/Endings';
import { endingsSeen } from '../../engine/achievements36';
import { ENDINGS, ENDING_IDS, type EndingId, type SceneArt } from '../endings';
import { t, tx } from '../../i18n';

const tierOf = (k: AchTier) => ACH_TIERS.find((t) => t.key === k)!;

function Toast({ x, dismiss }: { x: { id: string; name: string; tier: AchTier; more?: number }; dismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => dismiss(x.id), 4500);
    return () => clearTimeout(t);
  }, [x.id, dismiss]);
  return (
    <button className={`ach-toast tier-${x.tier}`} style={{ ['--tier' as string]: tierOf(x.tier).color }} onClick={() => dismiss(x.id)} title={t('Dismiss')}>
      <Badge tier={x.tier} size={34} />
      <span>
        <small>{t('Achievement · {tier}', { tier: tierOf(x.tier).name })}</small>
        <b>{x.name}</b>
        {x.more ? <small>{t('and {n} more: see the achievement book', { n: x.more })}</small> : null}
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
  // only the achievements the book still has (round 39: Front Office's two, earned before, stay out)
  const [got] = useState(() => {
    const have = loadAch().got;
    return ACHIEVEMENTS.filter((a) => have[a.id]).length;
  });
  const mine = useMemo(() => (g ? earnedIn(g).length : 0), [g]);
  return (
    <section className="card stack" data-tour={g ? 'run-ach' : undefined}>
      <div className="sec-title with-icon">
        <Badge tier="starter" size={26} />
        Achievements
      </div>
      <p className="small muted">
        {t('{got} of {n} earned, over every career on this device. The rest are riddles.', { got, n: ACHIEVEMENTS.length })}
      </p>
      {g && <div className="kicker">{mine ? t('This career: {n} earned, at the top of the book', { n: mine }) : t('This career: none yet')}</div>}
      <button className="btn ghost" data-tour="ach" onClick={() => setPage('achievements')}>
        {t('Open the achievement book')}
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
  const tier = tierOf(a.tier);
  return (
    <div className={`ach-card${g ? ' got' : ''}${here ? ' this-run' : ''}`} style={{ ['--tier' as string]: tier.color }}>
      <Badge tier={a.tier} locked={!g} size={38} />
      <div>
        <b>{a.name}</b>
        <small className="achv-tier-name">{tier.name}</small>
        {g ? (
          <p className="small">
            {t(a.how)}{' '}
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

/** What a tile shows of a scene with no career to read: a sample player's, with a few jerseys and cities. */
const TILE_ART: Partial<Record<EndingId, Partial<SceneArt>>> = {
  allstar: { labels: ['33', '34', '35', '36'], tints: ['#1D428A', '#C8102E', '#1D428A', '#1D428A'] },
  passport: { labels: ['2030 ISTANBUL', '2032 BELGRADE', '2034 SYDNEY', '2036 MADRID'] },
  gown: { color: '#7A1F2B', labels: ['2031'] },
  eurolegend: { color: '#C8102E' },
  ring: { color: '#552583' },
};
const tileArt = (k: EndingId): SceneArt => ({ color: '#1D428A', number: 23, surname: 'HALE', labels: [], tints: [], family: false, gold: false, ...TILE_ART[k] });

/** Round 36 (owner: "An Endings page in the achievement book: '7 of 12 endings seen', unseen ones as
 * silhouettes"): each ending a tile, its scene once seen on this device, a dark shape and ??? until then. */
function Endings({ seen }: { seen: EndingId[] }) {
  return (
    <section className="card stack" aria-label={t('Endings')} data-tour="endings">
      <div className="sec-title with-icon">
        <Icon name="cards" size={26} />
        {t('Endings')}
        <small className="num">
          {t('{n} of {total} endings seen', { n: seen.length, total: ENDING_IDS.length })}
        </small>
      </div>
      <p className="small muted">{t('Every finished career ends on one of twelve endings, the first that fits it. Ones you haven’t seen stay in the dark.')}</p>
      <div className="end-grid">
        {ENDING_IDS.map((k) => {
          const got = seen.includes(k);
          return (
            <figure key={k} className={`end-tile${got ? ' seen' : ''}`}>
              <div className="end-frame" aria-hidden="true">
                <EndingArt kind={k} art={tileArt(k)} className="end-art" />
              </div>
              <figcaption>{got ? ENDINGS[k].name : '???'}</figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

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
  const seen = useMemo(() => endingsSeen(saved.totals), [saved]);
  return (
    <div className="wrap">
      <PageTop trail={[t('Achievement book')]} back={() => setPage(null)} />
      <section className="stack stage-in">
        <div>
          <div className="kicker">
            {t('{got} of {n} earned · kept on this device across careers', { got: total, n: ACHIEVEMENTS.length })}
          </div>
          <h1 className="hub-title with-icon">
            <Badge tier="hof" size={40} />
            {t('Achievement book')}
          </h1>
          <p className="prose">{t('Every milestone you reach, in any career, stays here for good. Ones you haven’t earned show only their name: work out the riddle.')}</p>
        </div>
        {game && (
          <section className="card stack ach-mine" aria-label={t('Earned this career')}>
            <div className="sec-title">{mine.length ? t('Earned this career: {n}', { n: mine.length }) : t('Earned this career: none yet')}</div>
            {mine.length ? (
              <div className="ach-grid">
                {mine.map((a) => (
                  <AchCard key={a.id} a={a} g={got[a.id]} here />
                ))}
              </div>
            ) : (
              <p className="small muted">{t('What {name} earns shows up here first, and in gold in the book below.', { name: game.player.name })}</p>
            )}
          </section>
        )}
        <Endings seen={seen} />
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
        <div className="achv-cats" role="group" aria-label={t('Categories')}>
          {ALL_CATS.map((c) => {
            const { have, n } = catN(c.key ?? 'all');
            return (
              <button key={c.key ?? 'all'} className="achv-cat" aria-pressed={cat === c.key} onClick={() => setCat(cat === c.key ? null : c.key)}>
                <Icon name={c.icon} size={22} />
                <span>{c.key === null ? t('All') : t(c.name)}</span>
                <small className="num">
                  {have}/{n}
                </small>
              </button>
            );
          })}
        </div>
        <p className="small muted">{t('A category names only the area, never what it takes: the riddles stay riddles.')}</p>
        <div className="seg">
          {(
            [
              ['all', tx('All')],
              ['got', tx('Earned')],
              ['open', tx('Still a riddle')],
            ] as [Show, string][]
          ).map(([k, l]) => (
            <button key={k} aria-pressed={show === k} onClick={() => setShow(k)}>
              {t(l)}
            </button>
          ))}
        </div>
        {chapters.map(({ c, items }) => {
          const { have, n } = catN(c.key);
          return (
            <section key={c.key} className="achv-chapter" aria-label={t(c.name)}>
              {!cat && (
                <h2 className="sec-title with-icon achv-cat-head">
                  <Icon name={c.icon} size={26} />
                  {t(c.name)}
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
        {!chapters.length && <p className="small muted keep">{show === 'got' ? t('None earned here yet.') : show === 'open' ? t('Every one here is earned.') : t('None in this tier and category.')}</p>}
      </section>
      <FootBar where="achievement book" />
    </div>
  );
}
