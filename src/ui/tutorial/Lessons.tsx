// The tutorial guide on screen (round 33): one lesson at a time over the page. The rest of the page is
// shaded and takes no clicks or keys; a lesson to read waits for Got it (Enter or Space), a lesson
// to do waits for its control. No skipping (owner: "the guide steps are unskippable"); the exit code
// is the only way out. Round 35: its Skip tutorial button sits above the shade, in a corner.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { isDev } from '../../dev/mode';
import { levelOf, LEVEL_NAME } from '../../engine/levels';
import { inTutorial, nextLevel } from '../road';
import { LESSONS, type Lesson, type Where } from './lessons';
import { STOPS } from './closing';
import { SkipButton } from '../components/SkipTutorial';
import { spot } from '../fold';
import { t } from '../../i18n';

type St = ReturnType<typeof useStore.getState>;

/** Which lessons fit the screen: a level (its create page too), a closing-tour stop, or the start page
 * just after graduation. None on the road map or in the mini-games. Round 35: the levels after
 * beginner and the closing tour are played in the full game now, with their lessons. */
function whereNow(st: St): Where | null {
  if (isDev() && st.road.preview !== 'lesson') return null;
  if (st.recommend && !st.game && !st.page && !st.mini) return 'graduated';
  if (st.mini) return null;
  if (st.closing) return 'tour';
  const g = st.game;
  if (g) return g.flags.level ? levelOf(g) : null;
  if (st.creating) return st.creating;
  if (!inTutorial(st.road)) return null;
  return nextLevel(st.road) === 'beginner' ? 'beginner' : null;
}

/** The lessons this screen could show, in order. */
function pool(st: St, where: Where): Lesson[] {
  if (where === 'tour') {
    const stop = st.closing && STOPS.find((s) => s.id === st.closing!.ids[st.closing!.i]);
    return stop ? stop.lessons.map((id) => LESSONS.find((l) => l.id === id)).filter((l): l is Lesson => !!l) : [];
  }
  return LESSONS.filter((l) => l.at === where);
}

const shown = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  // round 37: the top bar's row of tabs keeps its size while the town stands in for it (it is only
  // hidden), so a hidden match never takes the ring from the place in the town
  return r.width > 0 && r.height > 0 && !(el as HTMLButtonElement).disabled && getComputedStyle(el).visibility !== 'hidden';
};

const PAD = 6;

export function Lessons() {
  const where = useStore(whereNow);
  const done = useStore((s) => s.road.lessons);
  const doneLesson = useStore((s) => s.doneLesson);
  const [cur, setCur] = useState<{ lesson: Lesson; el: HTMLElement } | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [tipH, setTipH] = useState(150);

  // the first lesson not done whose control is on screen (inside an open dialog, if there is one)
  useEffect(() => {
    if (!where) {
      setCur(null);
      return;
    }
    let raf = 0;
    const find = () => {
      raf = 0;
      const st = useStore.getState();
      const seen = st.road.lessons ?? [];
      // round 35: the Skip tutorial pop-up is not a dialog the lesson waits behind
      const modal = [...document.querySelectorAll('[aria-modal="true"]:not([data-lesson-free])')].pop();
      for (const lesson of pool(st, where)) {
        if (seen.includes(lesson.id) || (lesson.after && !seen.includes(lesson.after))) continue;
        const el = [...document.querySelectorAll<HTMLElement>(lesson.sel)].find((e) => shown(e) && (!modal || modal.contains(e)));
        if (el) {
          setCur((c) => (c && c.lesson === lesson && c.el === el ? c : { lesson, el }));
          return;
        }
      }
      setCur(null);
    };
    const later = () => {
      if (!raf) raf = requestAnimationFrame(find);
    };
    find();
    const mo = new MutationObserver(later);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-expanded', 'aria-modal', 'class'] });
    // round 37: the town scrolling in or out swaps which row of tabs shows (html.town-out)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', later);
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', later);
    };
  }, [where, done]);

  // the closing tour's Next stop waits while a lesson is up
  useEffect(() => {
    if (useStore.getState().lessonUp !== !!cur) useStore.setState({ lessonUp: !!cur });
  }, [cur]);

  const finish = useCallback(() => {
    if (cur) doneLesson(cur.lesson.id);
  }, [cur, doneLesson]);

  // follow the control as the page moves; for a lesson to do, using it is the step
  useEffect(() => {
    if (!cur) {
      setBox(null);
      return;
    }
    // round 36: a folded card opens for a look, a tab of a card's tabs shows its own (fold.ts)
    spot(cur.el);
    {
      const r0 = cur.el.getBoundingClientRect();
      if (r0.top < 0 || r0.top > window.innerHeight * 0.6) window.scrollBy({ top: r0.top - window.innerHeight * 0.25, behavior: 'smooth' });
    }
    let raf = 0;
    let scrolled = Date.now();
    const tick = () => {
      const r = cur.el.getBoundingClientRect();
      // the control is out of view, or low on the screen behind the note and a phone's tab bar (the
      // page went back to its top after a choice, or a new tab opened): bring its top up to a quarter
      // of the screen. A player scrolling through a tall control moves its top up, never down here.
      const vh = window.innerHeight;
      if ((r.bottom < 0 || r.top > vh * 0.6) && Date.now() - scrolled > 400) {
        scrolled = Date.now();
        window.scrollBy({ top: r.top - vh * 0.25 });
      }
      setBox((b) => (b && b.x === r.left && b.y === r.top && b.w === r.width && b.h === r.height ? b : { x: r.left, y: r.top, w: r.width, h: r.height }));
      raf = requestAnimationFrame(tick);
    };
    tick();
    // a lesson to do counts a real control used inside it (a button, a field), not a tap on blank space
    const click = (e: MouseEvent) => {
      const hit = (e.target as Element | null)?.closest?.('button, a, input, select, textarea, summary, [role="button"]');
      if (cur.lesson.act && hit && cur.el.contains(hit)) doneLesson(cur.lesson.id);
    };
    document.addEventListener('click', click, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('click', click, true);
    };
  }, [cur, doneLesson]);

  // keys: only what the lesson allows. Reading: Enter or Space for Got it. Doing: keys inside the
  // control. Skip tutorial and its pop-up (round 35) always take theirs.
  useEffect(() => {
    if (!cur) return;
    const key = (e: KeyboardEvent) => {
      const target = e.target as Node;
      if ((e.target as HTMLElement | null)?.closest?.('[data-lesson-free]')) return;
      if (!cur.lesson.act) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) finish();
        return;
      }
      if (cur.el.contains(target) || e.key === 'Tab') return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [cur, finish]);

  useLayoutEffect(() => {
    if (tip.current && tip.current.offsetHeight !== tipH) setTipH(tip.current.offsetHeight);
  });

  if (!cur || !box || !where) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hole = { x: Math.max(0, box.x - PAD), y: Math.max(0, box.y - PAD), w: box.w + PAD * 2, h: box.h + PAD * 2 };
  const w = Math.min(340, vw - 24);
  const left = Math.max(12, Math.min(vw - w - 12, box.x + box.w / 2 - w / 2));
  const below = hole.y + hole.h + 10;
  const above = hole.y - 10 - tipH;
  // a control taller than the room around it (a long list of choices on a phone): the note docks at
  // the foot of the screen, and the page scrolls under it
  // always on screen, whatever the control does
  const top = Math.max(8, Math.min(vh - tipH - 8, below + tipH < vh - 8 ? below : above > 8 ? above : vh - tipH - 8));
  const list = LESSONS.filter((l) => l.at === cur.lesson.at);
  const n = list.indexOf(cur.lesson) + 1;
  const at = cur.lesson.at;
  // the level's name stays as the engine has it
  const kicker = at === 'tour' ? t('Closing tour') : at === 'graduated' ? t('The full game') : t('Tutorial · {level} · {n} of {total}', { level: LEVEL_NAME[at], n, total: list.length });
  return createPortal(
    <div className="lesson-layer" aria-live="polite">
      {/* four shades around the control; with a lesson to read, a fifth over it */}
      <div className="lesson-shade" style={{ left: 0, top: 0, width: vw, height: hole.y }} />
      <div className="lesson-shade" style={{ left: 0, top: hole.y + hole.h, width: vw, height: Math.max(0, vh - hole.y - hole.h) }} />
      <div className="lesson-shade" style={{ left: 0, top: hole.y, width: hole.x, height: hole.h }} />
      <div className="lesson-shade" style={{ left: hole.x + hole.w, top: hole.y, width: Math.max(0, vw - hole.x - hole.w), height: hole.h }} />
      {!cur.lesson.act && <div className="lesson-shade clear" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }} />}
      <div className="tour-ring lesson-ring" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }} aria-hidden="true" />
      {/* round 35: the way out, above the shade; in the top-right corner unless the control is there */}
      <SkipButton float style={hole.y < 64 && hole.x + hole.w > vw - 220 ? { left: 12, right: 'auto' } : undefined} />
      <div className="tour-tip lesson-tip" ref={tip} role="dialog" aria-label={t('Tutorial')} style={{ left, top, width: w }}>
        <div className="kicker">{kicker}</div>
        <p>{t(cur.lesson.text)}</p>
        <div className="tour-row">
          {cur.lesson.act ? (
            <span className="small lesson-turn">{t('Your turn: use the highlighted control.')}</span>
          ) : (
            <button className="btn small" onClick={finish} autoFocus>
              {t('Got it')} <kbd className="tour-key">Enter</kbd>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
