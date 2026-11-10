// The Floor's box score (round 42, owner's pick: "full box score and line score"): points by
// period, every player's line for both teams, and the player of the game; and the bench, in the
// pause menu, to send a man on for another at the next dead ball.

import { useState } from "react";
import {
  gameScore,
  type FloorResult,
  type FloorState,
} from "../../engine/floor/sim";
import { t } from "../../i18n";

const last = (name: string) => name.split(" ").slice(1).join(" ") || name;
const PERIOD = ["1", "2", "3", "4"];

export function BoxScore({
  r,
  teams,
}: {
  r: FloorResult;
  teams: [string, string];
}) {
  const [team, setTeam] = useState<0 | 1>(0);
  const star = r.box.reduce((a, b) =>
    gameScore(b.box) > gameScore(a.box) ? b : a,
  );
  const cols = r.periods[0].map((_, k) =>
    r.from + k <= 4
      ? PERIOD[r.from + k - 1]
      : r.from + k === 5
        ? t("OT")
        : t("OT{n}", { n: r.from + k - 4 }),
  );
  const began = r.start[0] + r.start[1] > 0;
  const rows = r.box.filter(
    (p) =>
      p.team === team &&
      (p.starter ||
        p.box.pts +
          p.box.reb +
          p.box.ast +
          p.box.fga +
          p.box.pf +
          p.box.stl +
          p.box.blk +
          p.box.tov >
          0),
  );
  return (
    <div className="floor-box">
      <p className="floor-box-star">
        <b>{t("Player of the game")}</b> {star.name} ({teams[star.team]}):{" "}
        {star.box.pts} PTS · {star.box.reb} REB · {star.box.ast} AST
      </p>
      <table className="floor-box-line" aria-label={t("Points by quarter")}>
        <thead>
          <tr>
            <th />
            {began && <th>{t("Start")}</th>}
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th>{t("Final")}</th>
          </tr>
        </thead>
        <tbody>
          {([0, 1] as const).map((k) => (
            <tr key={k}>
              <th>{teams[k]}</th>
              {began && <td>{r.start[k]}</td>}
              {r.periods[k].map((v, i) => (
                <td key={i}>{v}</td>
              ))}
              <td>
                <b>{k === 0 ? r.us : r.them}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <details className="floor-box-more">
        <summary>{t("Box score")}</summary>
        <div className="floor-box-tabs" role="group" aria-label={t("Team")}>
          {([0, 1] as const).map((k) => (
            <button
              key={k}
              className={`chip${team === k ? " on" : ""}`}
              aria-pressed={team === k}
              onClick={() => setTeam(k)}
            >
              {teams[k]}
            </button>
          ))}
          <span className="floor-box-note">
            {t("On the break: {a} – {b}", { a: r.fast[0], b: r.fast[1] })}
          </span>
        </div>
        <div className="floor-box-scroll">
          <table className="floor-box-table">
            <thead>
              <tr>
                <th>{t("Player")}</th>
                {[
                  "PTS",
                  "REB",
                  "AST",
                  "STL",
                  "BLK",
                  "FG",
                  "3P",
                  "FT",
                  "TO",
                  "PF",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr
                  key={i}
                  className={p.user ? "me" : p.starter ? "" : "bench"}
                >
                  <th>
                    {last(p.name)} <span>{p.pos}</span>
                  </th>
                  <td>{p.box.pts}</td>
                  <td>{p.box.reb}</td>
                  <td>{p.box.ast}</td>
                  <td>{p.box.stl}</td>
                  <td>{p.box.blk}</td>
                  <td>
                    {p.box.fgm}/{p.box.fga}
                  </td>
                  <td>
                    {p.box.tpm}/{p.box.tpa}
                  </td>
                  <td>
                    {p.box.ftm}/{p.box.fta}
                  </td>
                  <td>{p.box.tov}</td>
                  <td>{p.box.pf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** The pause menu's bench: pick a man off the bench, then the teammate he comes on for. The coach
 * rests tired legs by himself; this is for when the player wants it his way. */
export function Bench({
  s,
  onSub,
}: {
  s: FloorState;
  onSub: (q: { out: number; in: number }) => void;
}) {
  const [inn, setInn] = useState<number | null>(null);
  const mine = s.players
    .map((p, i) => ({ p, i }))
    .filter((x) => x.p.team === 0);
  const bench = mine.filter((x) => !x.p.on && x.p.fouls < 6);
  const floor = mine.filter((x) => x.p.on && x.i !== s.user);
  if (!bench.length) return null;
  const legs = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <div className="floor-bench">
      <div className="floor-bench-title">
        {inn === null
          ? t("Substitution: who comes on?")
          : t("For whom? (at the next dead ball)")}
      </div>
      <div className="floor-pause-row">
        {(inn === null ? bench : floor).map(({ p, i }) => (
          <button
            key={i}
            className="chip"
            onClick={() =>
              inn === null ? setInn(i) : onSub({ out: i, in: inn })
            }
          >
            {last(p.name)} · {p.pos} · {legs(p.stamina)}
          </button>
        ))}
        {inn !== null && (
          <button className="chip" onClick={() => setInn(null)}>
            {t("Cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
