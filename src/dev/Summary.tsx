// The project summary inside the dev deck (round 24, owner: "incorporate the project summary into
// the dev artifact, a separate page that has the chapters, and add a search engine"). The Word
// file's generator also writes this JSON, so the page and the document always say the same thing.

import { useEffect, useMemo, useRef } from 'react';
import doc from './summary.json';
import type { DevCard } from './cards';

type Block = { t: 'h2'; text: string } | { t: 'p'; text: string } | { t: 'ul'; items: string[][] } | { t: 'table'; head: string[]; rows: string[][] };
interface Chapter {
  title: string;
  blocks: Block[];
}
export const SUMMARY = doc as { title: string; date: string; intro: Block[]; chapters: Chapter[] };

const blockText = (b: Block): string => (b.t === 'ul' ? b.items.map((x) => x.join('')).join(' ') : b.t === 'table' ? [b.head.join(' '), ...b.rows.map((r) => r.join(' '))].join(' ') : b.text);

// ---------- the search engine ----------

interface Hit {
  ci: number;
  bi: number;
  section: string;
  text: string;
  score: number;
}

/** Every block of the summary, with the chapter and section it sits in. */
const INDEX = SUMMARY.chapters.flatMap((c, ci) => {
  let section = '';
  return c.blocks.map((b, bi) => {
    if (b.t === 'h2') section = b.text;
    return { ci, bi, section, kind: b.t, text: blockText(b), low: blockText(b).toLowerCase(), head: `${c.title} ${section}`.toLowerCase() };
  });
});

export const tokens = (q: string): string[] => q.toLowerCase().split(/\s+/).filter(Boolean);

export function searchSummary(q: string): Hit[] {
  const ts = tokens(q);
  if (!ts.length) return [];
  return INDEX.filter((x) => ts.every((t) => x.low.includes(t) || x.head.includes(t)))
    .map((x) => ({ ...x, score: ts.reduce((s, t) => s + x.low.split(t).length - 1 + (x.head.includes(t) ? 2 : 0), 0) + (x.kind === 'h2' ? 6 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 60);
}

export function searchCards(q: string, cards: DevCard[]): DevCard[] {
  const ts = tokens(q);
  return ts.length ? cards.filter((c) => ts.every((t) => `${c.title} ${c.blurb} ${c.group}`.toLowerCase().includes(t))) : [];
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The text with the searched words marked. */
export function Marked({ text, q }: { text: string; q: string }) {
  const ts = tokens(q);
  if (!ts.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${ts.map(esc).join('|')})`, 'gi'));
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</>;
}

/** A short piece of the text around the first match. */
export function snippet(text: string, q: string, span = 90): string {
  const ts = tokens(q);
  const low = text.toLowerCase();
  const at = Math.min(...ts.map((t) => low.indexOf(t)).filter((i) => i >= 0), text.length);
  const from = Math.max(0, at - span);
  return `${from > 0 ? '…' : ''}${text.slice(from, at + span * 1.4)}${at + span * 1.4 < text.length ? '…' : ''}`;
}

// ---------- the page ----------

function BlockView({ b, q }: { b: Block; q: string }) {
  if (b.t === 'h2')
    return (
      <h3 className="sm-h2">
        <Marked text={b.text} q={q} />
      </h3>
    );
  if (b.t === 'p')
    return (
      <p className="sm-p">
        <Marked text={b.text} q={q} />
      </p>
    );
  if (b.t === 'ul')
    return (
      <ul className="sm-ul">
        {b.items.map((x, i) => (
          <li key={i}>
            {x.length > 1 ? (
              <>
                <b>
                  <Marked text={x[0]} q={q} />
                </b>
                <Marked text={x[1]} q={q} />
              </>
            ) : (
              <Marked text={x[0]} q={q} />
            )}
          </li>
        ))}
      </ul>
    );
  return (
    <div className="sm-table">
      <table>
        <thead>
          <tr>
            {b.head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, k) => (
                <td key={k}>
                  <Marked text={c} q={q} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One chapter at a time, the chapter list beside it; `focus` scrolls to a block and lights it up. */
export function SummaryPage({ chapter, setChapter, focus, q }: { chapter: number; setChapter: (n: number) => void; focus: number | null; q: string }) {
  const c = SUMMARY.chapters[chapter];
  const main = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = focus === null ? null : main.current?.querySelector<HTMLElement>(`[data-b="${focus}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.classList.add('sm-flash');
      const t = window.setTimeout(() => el.classList.remove('sm-flash'), 1800);
      return () => window.clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [chapter, focus]);
  const sections = useMemo(() => c.blocks.map((b, i) => [b, i] as const).filter(([b]) => b.t === 'h2'), [c]);
  return (
    <div className="sm">
      <nav className="sm-toc" aria-label="Chapters">
        <div className="kicker">{SUMMARY.date} · by function</div>
        <b className="sm-doc">{SUMMARY.title}</b>
        <ol>
          {SUMMARY.chapters.map((x, i) => (
            <li key={x.title}>
              <button aria-current={i === chapter ? 'page' : undefined} onClick={() => setChapter(i)}>
                {x.title}
              </button>
              {i === chapter && sections.length > 0 && (
                <ul>
                  {sections.map(([b, bi]) => (
                    <li key={bi}>
                      <a
                        href={`#sm-${chapter}-${bi}`}
                        onClick={(e) => {
                          e.preventDefault();
                          main.current?.querySelector(`[data-b="${bi}"]`)?.scrollIntoView({ block: 'start' });
                        }}
                      >
                        {(b as { text: string }).text}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <article className="sm-main" ref={main}>
        <h2 className="sm-title">{c.title}</h2>
        {chapter === 0 && SUMMARY.intro.map((b, i) => <BlockView key={`i${i}`} b={b} q={q} />)}
        {c.blocks.map((b, i) => (
          <div key={i} data-b={i}>
            <BlockView b={b} q={q} />
          </div>
        ))}
        <div className="sm-pager">
          <button className="btn ghost" disabled={chapter === 0} onClick={() => setChapter(chapter - 1)}>
            {chapter > 0 ? `Previous: ${SUMMARY.chapters[chapter - 1].title}` : 'Previous'}
          </button>
          <button className="btn ghost" disabled={chapter >= SUMMARY.chapters.length - 1} onClick={() => setChapter(chapter + 1)}>
            {chapter < SUMMARY.chapters.length - 1 ? `Next: ${SUMMARY.chapters[chapter + 1].title}` : 'Next'}
          </button>
        </div>
      </article>
    </div>
  );
}
