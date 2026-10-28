import { AWARD_CATS, awardLook, type AwardCat } from '../../content/awards';
// Small presentational components shared by the screens.

import type { ReactNode } from 'react';
import type { Reaction, StatLine } from '../../engine/types';
import { MILESTONES, UI } from '../../content/strings';
import { pct, pg } from '../format';

export function Scoreboard({ line, showGp = true }: { line: StatLine; showGp?: boolean }) {
  const has = line.gp > 0;
  const cells: [string, string][] = [
    ['PTS', pg(line, 'pts')],
    ['REB', pg(line, 'reb')],
    ['AST', pg(line, 'ast')],
    ['STL', pg(line, 'stl')],
    ['BLK', pg(line, 'blk')],
    ['FG%', pct(line.fgm, line.fga)],
    ['3P%', pct(line.tpm, line.tpa)],
    ['MIN', pg(line, 'min')],
  ];
  if (showGp) cells.push(['GP', String(line.gp)]);
  return (
    <div className="board" role="group" aria-label="Season averages">
      {cells.map(([k, v]) => (
        <div className="cell" key={k}>
          <div className="k">{k}</div>
          <div className={`v${has ? '' : ' dim'}`}>{has ? v : '—'}</div>
        </div>
      ))}
    </div>
  );
}

export interface BannerItem {
  label: string;
  key?: string;
  count?: number;
  years?: number[];
  gold?: boolean;
  accent?: boolean;
}

/** Awards as coloured tiles: category colour and icon, the name, how often, and what it means. */
export function Banners({ items, grouped = false }: { items: BannerItem[]; grouped?: boolean }) {
  if (items.length === 0) return null;
  const looks = items.map((b) => ({ b, look: awardLook(b.key ?? null, b.label) }));
  const tile = ({ b, look }: (typeof looks)[number], i: number) => (
    <div key={i} className="award" style={{ ['--award' as string]: look.color }}>
      <span className="award-icon" aria-hidden="true">
        {look.icon}
      </span>
      <div className="award-body">
        <div className="award-name">
          {b.label}
          {b.count && b.count > 1 ? <span className="award-count">×{b.count}</span> : null}
        </div>
        {look.desc && <div className="award-desc">{look.desc}</div>}
        {b.years && b.years.length > 0 && <div className="award-years">{b.years.map((y) => `${y}–${String(y + 1).slice(2)}`).join(' · ')}</div>}
      </div>
    </div>
  );
  if (!grouped) return <div className="awards">{looks.map(tile)}</div>;
  const order = Object.keys(AWARD_CATS) as AwardCat[];
  return (
    <div className="stack" style={{ gap: 14 }}>
      {order
        .filter((c) => looks.some((x) => x.look.cat === c))
        .map((c) => (
          <div key={c} className="stack" style={{ gap: 6 }}>
            <div className="award-cat" style={{ color: AWARD_CATS[c].color }}>
              {AWARD_CATS[c].icon} {AWARD_CATS[c].name}
            </div>
            <div className="awards">{looks.filter((x) => x.look.cat === c).map(tile)}</div>
          </div>
        ))}
    </div>
  );
}

export function TeamChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="chip">
      <i style={{ background: color }} aria-hidden="true" />
      {name}
    </span>
  );
}

export function Meter({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'warn' | 'bad' | 'ink' }) {
  const v = Math.round(value);
  return (
    <div className="meter">
      <div className="lab">
        <span>{label}</span>
        <span>{v}</span>
      </div>
      <div className="track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
        <div className={`fill ${tone ?? ''}`} style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
      </div>
    </div>
  );
}

export function MilestoneStrip({ reached }: { reached: string[] }) {
  return (
    <div className="milestones" aria-label="Milestones">
      {MILESTONES.map((m) => (
        <div key={m.key} className={`ms${reached.includes(m.key) ? ' on' : ''}`} aria-label={`${m.label}${reached.includes(m.key) ? ' (reached)' : ''}`}>
          {m.label}
        </div>
      ))}
    </div>
  );
}

export function ReactionCard({ r }: { r: Reaction }) {
  return (
    <div className="reaction">
      <div className="kicker">{r.source}</div>
      <div className="headline">{r.headline}</div>
      {r.comments.map((c, i) => (
        <div key={i} className={`comment ${c.tone}`}>
          <div>{c.text}</div>
          <div className="meta">
            <span>@{c.user}</span>
            <span>♥ {c.likes.toLocaleString()}</span>
            <span>{c.ago}</span>
            <span>{c.tone}</span>
          </div>
        </div>
      ))}
      <div className="kicker">{UI.fictional}</div>
    </div>
  );
}

export function Card({ title, kicker, children, right }: { title?: string; kicker?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="card stack">
      {(title || kicker || right) && (
        <div className="row">
          <div>
            {kicker && <div className="kicker">{kicker}</div>}
            {title && <h2 className="title">{title}</h2>}
          </div>
          <div className="spacer" />
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
