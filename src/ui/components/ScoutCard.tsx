import type { GameState } from "../../engine/types";
import { scoutReport } from "../../engine/career/scouting";

const ODDS_LABEL: [string, string][] = [
  ["nba", "Play in the NBA"],
  ["allStar", "Make an All-Star team"],
  ["allNba", "Make All-NBA"],
  ["allNba1", "Make All-NBA 1st team"],
  ["hof", "Hall of Fame"],
  ["mvp", "Win an MVP"],
];

const pct = (x: number) =>
  x >= 0.995 ? "✓" : x < 0.01 ? "<1%" : `${Math.round(x * 100)}%`;

export function ScoutCard({
  g,
  compact = false,
}: {
  g: GameState;
  compact?: boolean;
}) {
  const r = scoutReport(g);
  return (
    <section className="card stack scout-card">
      <div className="scout-head">
        <div>
          <div className="kicker">
            Scouting report · {r.confidence} confidence
          </div>
          <h2 className="title">{r.tier}</h2>
        </div>
        <div className="ovr small-ovr">
          <b>{Math.round(r.ovr)}</b>
          <small>NOW</small>
        </div>
      </div>
      <div className="ceiling">
        <span className="kicker">Projected peak</span>
        <b className="num">
          {r.peakLo}–{r.peakHi}
        </b>
        <span className="muted small">{r.peakTier}</span>
      </div>
      {/* round 24 (owner): the odds always show, on Home too */}
      <div className="chances" role="list">
          {ODDS_LABEL.map(([k, label]) => {
            const v = r.odds[k as keyof typeof r.odds];
            return (
              <div className="chance" role="listitem" key={k}>
                <span className="small">{label}</span>
                <div className="track" aria-hidden="true">
                  <div
                    className={`fill ${v >= 0.6 ? "good" : v >= 0.25 ? "" : "ink"}`}
                    style={{ width: `${Math.max(2, v * 100)}%` }}
                  />
                </div>
                <span className="num small chance-v">{pct(v)}</span>
              </div>
            );
          })}
      </div>
      {!compact && (
        <ul className="small muted" style={{ paddingLeft: 18 }}>
          {r.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
