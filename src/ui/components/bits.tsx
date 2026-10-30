// Small presentational components shared by the screens.

import { Icon } from '../art/Icon';
import { meterIcon } from '../art/icons';
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
  icon?: ReactNode;
  count?: number;
  gold?: boolean;
  accent?: boolean;
}

export function Banners({ items, onSelect, selected }: { items: BannerItem[]; onSelect?: (label: string) => void; selected?: string | null }) {
  if (items.length === 0) return null;
  return (
    <div className="banners">
      {items.map((b, i) => {
        const cls = `banner${b.gold ? ' gold' : b.accent ? ' accent' : ''}${onSelect ? ' tappable' : ''}${selected === b.label ? ' on' : ''}`;
        const inner = (
          <>
            {b.icon}
            {b.count && b.count > 1 ? <b>×{b.count}</b> : null}
            <span>{b.label}</span>
          </>
        );
        return onSelect ? (
          <button key={i} className={cls} aria-pressed={selected === b.label} onClick={() => onSelect(b.label)}>
            {inner}
          </button>
        ) : (
          <div key={i} className={cls}>
            {inner}
          </div>
        );
      })}
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
        <span className="with-icon">
          <Icon name={meterIcon(label)} size={20} />
          {label}
        </span>
        <span>{v}</span>
      </div>
      <div className="track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
        <div className={`fill ${tone ?? ''}`} style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
      </div>
    </div>
  );
}

/** The road from JV to the rafters: a compact ladder that wraps, never scrolls. */
export function MilestoneStrip({ reached }: { reached: string[] }) {
  const done = MILESTONES.filter((m) => reached.includes(m.key)).length;
  const next = MILESTONES.find((m) => !reached.includes(m.key));
  return (
    <div className="ms-wrap">
      <div className="ms-head">
        <span>
          {done}/{MILESTONES.length}
        </span>
        <span className="muted">{next ? `Next: ${next.label}` : 'Every milestone reached'}</span>
      </div>
      <div className="milestones" aria-label="Milestones">
        {MILESTONES.map((m) => (
          <div key={m.key} className={`ms${reached.includes(m.key) ? ' on' : ''}${m.key === next?.key ? ' next' : ''}`} aria-label={`${m.label}${reached.includes(m.key) ? ' (reached)' : ''}`}>
            {m.label}
          </div>
        ))}
      </div>
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

export function Card({ title, kicker, children, right, tour }: { title?: string; kicker?: string; children: ReactNode; right?: ReactNode; tour?: string }) {
  return (
    <section className="card stack" data-tour={tour}>
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

/** A card fast break folds away (round 25: the owner wanted fast break to simplify much more).
 * It takes no room of its own (display: contents), so grids lay out as before. */
export function Extra({ children }: { children: ReactNode }) {
  return <div className="extra">{children}</div>;
}
