// Small presentational components shared by the screens.

import { Icon } from '../art/Icon';
import { meterIcon } from '../art/icons';
import type { ReactNode } from 'react';
import type { Reaction, StatLine } from '../../engine/types';
import { MILESTONES, UI } from '../../content/strings';
import { pct, pg } from '../format';
import { useFold } from '../fold';

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
    ['FT%', pct(line.ftm, line.fta)],
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

/** Simple text hides a season's write-up, not its numbers (round 31, owner: "even with simple text,
 * i want to see the season stats... but not in a way that it's visually exhausting"): one quiet line
 * of averages, numbers in bold. */
export function StatStrip({ line, label }: { line: StatLine; label: string }) {
  if (!line.gp) return null;
  const cells: [string, string][] = [
    [pg(line, 'pts'), 'PTS'],
    [pg(line, 'reb'), 'REB'],
    [pg(line, 'ast'), 'AST'],
    [pg(line, 'stl'), 'STL'],
    [pg(line, 'blk'), 'BLK'],
    [pct(line.fgm, line.fga), 'FG%'],
    [pct(line.tpm, line.tpa), '3P%'],
    [pct(line.ftm, line.fta), 'FT%'],
  ];
  return (
    <p className="stat-strip num" aria-label={`${label}: season averages`}>
      <span className="kicker">{label}</span>
      {cells.map(([v, k]) => (
        <span key={k}>
          <b>{v}</b> {k}
        </span>
      ))}
    </p>
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

/** A small pixel chevron: down when the card is open, right when it is folded. */
export function FoldMark({ open }: { open: boolean }) {
  return (
    <svg className="fold-mark" width={14} height={14} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">
      <path d={open ? 'M0 2h7v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1z' : 'M2 0h1v1h1v1h1v1h1v1h-1v1h-1v1h-1v1h-1z'} fill="currentColor" />
    </svg>
  );
}

/** A card with a title (round 34: one that folds from its title, the fold kept on this device;
 * `fold={false}` keeps a card open, `fold="id"` names it when titles repeat). */
export function Card({ title, kicker, children, right, tour, fold }: { title?: string; kicker?: string; children: ReactNode; right?: ReactNode; tour?: string; fold?: string | false }) {
  const id = fold === false || !title ? null : `card:${fold ?? title}`;
  const [shut, toggle] = useFold(id);
  return (
    <section className={`card stack${shut ? ' folded' : ''}`} data-tour={tour}>
      {(title || kicker || right) && (
        <div className="row">
          <div>
            {kicker && <div className="kicker">{kicker}</div>}
            {title && (
              <h2 className="title">
                {id ? (
                  <button className="fold-btn" aria-expanded={!shut} onClick={toggle}>
                    {title}
                    <FoldMark open={!shut} />
                  </button>
                ) : (
                  title
                )}
              </h2>
            )}
          </div>
          <div className="spacer" />
          {!shut && right}
        </div>
      )}
      {!shut && children}
    </section>
  );
}

/** Round 34: a card built by hand, made foldable from outside. Open, it is the card as it was with a
 * small fold tab on its top edge; folded, a one-line strip with its name. A card that has nothing to
 * show (it renders nothing) leaves no strip either. */
export function FoldBox({ id, title, icon, children }: { id: string; title: string; icon?: string; children: ReactNode }) {
  const [shut, toggle] = useFold(`box:${id}`);
  return (
    <div className={`fold-box${shut ? ' shut' : ''}`}>
      {shut && (
        <section className="card fold-strip">
          <h2 className="fold-strip-title">
            <button className="fold-btn" aria-expanded={false} onClick={toggle}>
              {icon && <Icon name={icon} size={20} />}
              {title}
              <FoldMark open={false} />
            </button>
          </h2>
        </section>
      )}
      <div className="fold-body" hidden={shut}>
        {children}
      </div>
      {!shut && (
        <button className="fold-tab" aria-expanded aria-label={`Fold ${title}`} title={`Fold ${title}`} onClick={toggle}>
          <FoldMark open />
        </button>
      )}
    </div>
  );
}

/** A card fast break folds away (round 25: the owner wanted fast break to simplify much more).
 * It takes no room of its own (display: contents), so grids lay out as before. */
export function Extra({ children }: { children: ReactNode }) {
  return <div className="extra">{children}</div>;
}
