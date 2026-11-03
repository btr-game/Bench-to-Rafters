import type { GameState } from "../../engine/types";
import { scoutReport } from "../../engine/career/scouting";
import { t, tx } from "../../i18n";

const ODDS_LABEL: [string, string][] = [
  ["nba", tx("Play in the NBA")],
  ["allStar", tx("Make an All-Star team")],
  ["allNba", tx("Make All-NBA")],
  ["allNba1", tx("Make All-NBA 1st team")],
  ["hof", "Hall of Fame"],
  ["mvp", tx("Win an MVP")],
];

// a tick only for a milestone already reached (the report caps everything else at 99%)
const pct = (x: number) =>
  x >= 1 ? "✓" : x < 0.01 ? "<1%" : `${Math.min(99, Math.round(x * 100))}%`;
// round 27: before college or a pro career, chances in words and a range in fives (no spoilers)
const WORDS: [number, string, number][] = [
  [0.6, tx("Likely"), 0.8],
  [0.3, tx("Real chance"), 0.45],
  [0.1, tx("Possible"), 0.2],
  [0, tx("Long shot"), 0.06],
];
const word = (x: number): [string, number] => {
  if (x >= 1) return ["✓", 1];
  const [, say, bar] = WORDS.find(([at]) => x >= at)!;
  return [t(say), bar];
};

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
            {r.confidence === "high" ? t("Scouting report · high confidence") : r.confidence === "medium" ? t("Scouting report · medium confidence") : t("Scouting report · low confidence")}
          </div>
          <h2 className="title">{r.tier}</h2>
        </div>
        <div className="ovr small-ovr">
          <b>{Math.round(r.ovr)}</b>
          <small>{t("NOW")}</small>
        </div>
      </div>
      <div className="ceiling">
        <span className="kicker">{r.early ? t("Projected peak · too early to tell") : t("Projected peak")}</span>
        <b className="num">
          {r.early
            ? `${Math.floor(r.peakLo / 5) * 5}–${Math.min(99, Math.ceil(r.peakHi / 5) * 5)}`
            : `${r.peakLo}–${r.peakHi}`}
        </b>
        <span className="muted small">{r.early ? r.peakSpan : r.peakTier}</span>
      </div>
      {/* round 24 (owner): the odds always show, on Home too */}
      <div className="chances" role="list">
          {ODDS_LABEL.map(([k, label]) => {
            const v = r.odds[k as keyof typeof r.odds];
            const [say, bar]: [string, number] = r.early ? word(v) : [pct(v), v];
            return (
              <div className="chance" role="listitem" key={k}>
                <span className="small">{t(label)}</span>
                <div className="track" aria-hidden="true">
                  <div
                    className={`fill ${bar >= 0.6 ? "good" : bar >= 0.25 ? "" : "ink"}`}
                    style={{ width: `${Math.max(2, bar * 100)}%` }}
                  />
                </div>
                <span className={`num small chance-v${r.early ? " words" : ""}`}>{say}</span>
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
