import type { AttrKey, EventResult, GameState, SeasonRecord } from "../../engine/types";
import { GuideSpotWrap } from "../components/Guide";
import { tourKind } from "../components/GuideTour";
import {
  canSetStyle,
  currentStyle,
  fitLabel,
  setStyle,
  styleEffect,
  styleFit,
  TEAM_STYLES,
  type TeamStyle,
} from "../../engine/career/identity";
import {
  oddsWord,
  TRADE_AIM,
  tradeOptions,
  type TradeAim,
} from "../../engine/career/team";
import {
  canChangeFocus,
  canChangePosition,
  canRequestTrade,
  canRetire,
  heightMismatch,
  positionOptions,
  prompt,
} from "../../engine/flow";
import { useState } from "react";
import { ATTRS, LEVELS } from "../../engine/balance";
import { NAMES, UI } from "../../content/strings";
import { canUndo, useStore } from "../../store";
import { sfx } from "../sound";
import { LabCard } from "../components/Lab";
import { MvpRace } from "../components/MvpRace";
import { PlaybookArt } from "../art/Playbook";
import { DuoCard, RecruitCard, StoriesCard } from "../components/Roster";
import { canRecruit, recruitInfo } from "../../engine/career/recruit";
import { STARTERS_RECRUIT } from "../../engine/balance";
import {
  Banners,
  Extra,
  MilestoneStrip,
  ReactionCard,
  Scoreboard,
  StatStrip,
} from "../components/bits";
import { PlayerCard } from "../components/PlayerCard";
import { ScoutCard } from "../components/ScoutCard";
import { DecisionView } from "./Decision";
import { fmtMoney, ht, ordinal, pg, seasonLabel, signed } from "../format";
import { team } from "../selectors";
import { TeamArt } from "../art/Crest";
import { styleLeague } from "../art/Player";
import { Icon } from "../art/Icon";
import { leagueIcon, levelIcon } from "../art/careerArt";
import { intLeagueOf } from "../../engine/world/leagues";
import { breakthroughBar } from "../../engine/career/breakthrough";
import { rosterRank, winningEdge } from "../../engine/career/team";
import { ovrOf } from "../../engine/player/ovr";
import { perGame } from "../../engine/sim/statModel";
import { weightOf } from "../../engine/player/weight";
import { ModesCard } from '../components/ModesCard';
import { StrengthCard } from '../components/StrengthCard';
import { RivalCard } from '../components/RivalCard';
import { CoachTalk } from '../components/CoachTalk';

function SeasonSummary({ rec }: { rec: SeasonRecord }) {
  const delta = rec.ovrEnd - rec.ovrStart;
  const l = rec.line;
  return (
    <div className="stack">
      <div className="sum-head">
        <div className="rec">
          {rec.w}–{rec.l}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="kicker">
            {seasonLabel(rec.year)} · {rec.teamName} · {LEVELS[rec.level].short}
          </div>
          <b>{rec.result}</b>
          <div className="muted small">
            {NAMES.role[rec.role]} ·{" "}
            {l.gp > 0
              ? `${l.gs} starts · ${(l.min / l.gp).toFixed(1)} MPG`
              : "Did not play"}
          </div>
        </div>
      </div>
      <div className="ovr-move num">
        OVR {Math.round(rec.ovrStart)} → {Math.round(rec.ovrEnd)}{" "}
        <span className={delta >= 0 ? "up" : "down"}>
          {delta >= 0 ? "▲" : "▼"} {signed(delta)}
        </span>
      </div>
      <div className="kicker">Regular season</div>
      <Scoreboard line={l} />
      {rec.post.gp > 0 && (
        <p className="num small">
          Postseason · {rec.post.gp} games · {pg(rec.post, "pts")} PTS ·{" "}
          {pg(rec.post, "reb")} REB · {pg(rec.post, "ast")} AST
        </p>
      )}
      {rec.awards.length > 0 && (
        <Banners
          items={rec.awards.map((a) => ({
            label: a,
            gold: /Champion|MVP|Player of the Year|champion/.test(a),
          }))}
        />
      )}
      {rec.breakthrough && (
        <div className="unlock-banner">
          <span className="unlock-tag">Breakthrough</span>
          <span>
            {rec.breakthrough} Focus change unlocked for this offseason.
          </span>
        </div>
      )}
      {rec.newHighs && rec.newHighs.length > 0 && (
        <div className="small">
          <b>New NBA career high{rec.newHighs.length > 1 ? "s" : ""}:</b>{" "}
          {rec.newHighs.join(", ")}
        </div>
      )}
      {rec.races.some((r) => r.userRank !== null && r.userRank <= 10) && (
        <ul className="small" style={{ paddingLeft: 18 }}>
          {rec.races
            .filter((r) => r.userRank !== null && r.userRank <= 10)
            .map((r) => (
              <li key={r.award}>
                <b>{r.award}:</b>{" "}
                {r.userRank === 1 ? "Won" : `${ordinal(r.userRank!)}`}
                {r.userRank !== 1 && r.top[0]
                  ? `. Winner: ${r.top[0].name}, ${r.top[0].team}`
                  : ""}
              </li>
            ))}
        </ul>
      )}
      {rec.bestGame?.line && (
        <p className="muted small keep">
          Best game: {rec.bestGame.line.pts} PTS, {rec.bestGame.line.reb} REB,{" "}
          {rec.bestGame.line.ast} AST vs {rec.bestGame.opp} ({rec.bestGame.res}{" "}
          {rec.bestGame.us}–{rec.bestGame.them})
        </p>
      )}
      {rec.salary > 0 && (
        <p className="muted small keep">
          Salary this season: {fmtMoney(rec.salary)}
        </p>
      )}
    </div>
  );
}

function SeasonHeader({ g }: { g: GameState }) {
  const t = team(g);
  const s = g.season;
  const stepName =
    g.step === "preseason"
      ? "Preseason"
      : g.step === "midseason"
        ? "Midseason"
        : g.step === "postseason"
          ? "Postseason"
          : g.step === "summary"
            ? "Season over"
            : g.step === "offseason"
              ? "Offseason"
              : "";
  return (
    <div className="turn-head">
      {t && <TeamArt name={t.name} abbr={t.abbr || t.short} color={t.color} league={styleLeague(g.stage)} size={56} />}
      {t && (
        <div className="crest-mark" aria-hidden="true">
          <TeamArt name={t.name} abbr={t.abbr || t.short} color={t.color} league={styleLeague(g.stage)} size={120} />
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="kicker">
          {seasonLabel(g.year)} · {stepName}
        </div>
        <h2>{t ? t.name : "Offseason"}</h2>
        {g.step === "offseason" ? (
          <div className="muted small">
            {g.stage === "NBA" ||
            g.stage === "GL" ||
            g.stage === "EU" ||
            g.stage === "INT" ||
            g.stage === "NCAA"
              ? LEVELS[g.stage].name
              : g.league?.label
                ? "Youth basketball"
                : "High school"}
          </div>
        ) : (
          s && (
            <div className="muted small lvl-line">
              {/* round 27: the level (or the overseas league) has an icon of its own */}
              <Icon
                name={
                  s.level === "INT" && g.teamId
                    ? leagueIcon(intLeagueOf(g.teamId).key)
                    : levelIcon(s.level)
                }
                size={18}
              />
              {g.league?.label ?? LEVELS[s.level].name}
            </div>
          )
        )}
      </div>
      <div className="turn-side">
        {t && s && g.step !== "offseason" && (
          <div className="record">
            {t.w}–{t.l}
            <small>RECORD</small>
          </div>
        )}
        {g.mode === "lab" && (
          <span className="fast-toggle on lab-badge">Lab</span>
        )}
      </div>
    </div>
  );
}

/** Fast break skips the season summary page; this line keeps the story readable. */
/** Round 30: the turning points sim mode decided on its own since the last move, each like the
 * result card of a call you made yourself. */
function SimCalls({ calls }: { calls: EventResult[] }) {
  return (
    <div className="sim-calls" data-tour="sim-calls">
      <div className="kicker with-icon">
        <Icon name="sim" size={18} />
        {calls.length === 1 ? "Sim made a call for you" : `Sim made ${calls.length} calls for you`}
      </div>
      {calls.map((c, i) => (
        <div key={i} className={`result-card sim-call${c.tierKey ? ` tier-${c.tierKey}` : ""}`}>
          <div className="kicker">
            {c.title} · {c.choice}
          </div>
          {c.tier && <span className="result-tier">{c.tier}</span>}
          <p className="small prose">{c.text}</p>
          {c.changes.length > 0 && (
            <div className="result-chips">
              {c.changes.map((x, j) => (
                <span key={j} className={`result-chip ${x.good ? "up" : "down"}`}>
                  {x.good ? "▲" : "▼"} {x.label} <b>{x.value}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Round 30, Comet: the story since his last move that did not get a page of its own. */
function Reel({ items }: { items: NonNullable<GameState["reel"]> }) {
  return (
    <div className="comet-reel" data-tour="comet-reel">
      <div className="kicker with-icon">
        <Icon name="comet" size={18} />
        On the way here
      </div>
      <ul>
        {items.map((x, i) => (
          <li key={i}>
            <b>{x.title}</b>
            {x.line && <span className="small muted"> · {x.line}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Round 31: one step back, with what it takes back (U on a keyboard). Not in Rough Road,
 * Comet or the daily challenge, and not once the career has ended. */
function UndoBar({ g }: { g: GameState }) {
  const undo = useStore((s) => s.undo);
  const undoLast = useStore((s) => s.undoLast);
  if (!undo || !canUndo(g)) return null;
  return (
    <div className="undo-bar">
      <button className="btn ghost small with-icon" data-tour="undo" onClick={() => (sfx("undo"), undoLast())} title="Undo (U)">
        <Icon name="undo" size={18} /> Undo
      </button>
      <span className="small muted">Takes back: {undo.label}</span>
    </div>
  );
}

/** In simple text the season's write-up is hidden; its averages stay, in one line: the half so far,
 * the season just ended, or the last one (fast break's recap already carries them). */
function SimpleStats({ g }: { g: GameState }) {
  const simple = useStore((s) => s.simple);
  if (!simple) return null;
  const s = g.season;
  const half = g.step === "midseason" ? s?.halfLines[0] : undefined;
  if (half?.gp) return <StatStrip line={half} label="First half" />;
  const rec = g.step === "summary" ? s?.summary : g.lastSummary;
  if (!rec) return null;
  return <StatStrip line={rec.line} label={`${seasonLabel(rec.year)}${g.step === "summary" ? "" : " · last season"}`} />;
}

function FastRecap({ g }: { g: GameState }) {
  const r = g.lastSummary;
  if (!r) return null;
  const d = r.ovrEnd - r.ovrStart;
  return (
    <div className="fast-recap">
      <div className="kicker">
        Last season · {seasonLabel(r.year)} · {r.teamName}
      </div>
      <div>
        <b>
          {r.w}–{r.l}
        </b>
        , {r.result.toLowerCase()} ·{" "}
        {r.line.gp > 0
          ? `${perGame(r.line, "pts").toFixed(1)} PTS, ${perGame(r.line, "reb").toFixed(1)} REB, ${perGame(r.line, "ast").toFixed(1)} AST`
          : "did not play"}{" "}
        · OVR {Math.round(r.ovrStart)} → {Math.round(r.ovrEnd)}{" "}
        <span className={d >= 0 ? "up" : "down"}>({signed(d)})</span>
      </div>
      {r.awards.length > 0 && (
        <div className="small">{r.awards.join(" · ")}</div>
      )}
      {r.breakthrough && (
        <div className="small">
          <span className="unlock-tag">Breakthrough</span> {r.breakthrough}
        </div>
      )}
      {r.newHighs && r.newHighs.length > 0 && (
        <div className="small">
          New NBA career high: {r.newHighs.join(", ")}
        </div>
      )}
    </div>
  );
}

function PlanOutcomes({ g, half }: { g: GameState; half?: number }) {
  const list = (g.season?.outcomes ?? []).filter(
    (o) => half === undefined || o.half === half,
  );
  if (list.length === 0) return null;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {list.map((o, i) => (
        <div
          key={i}
          className={`outcome ${o.outcome.split(" ")[0].toLowerCase()}`}
        >
          <div className="kicker">
            {o.half === 1 ? "First half" : "Second half"} · {NAMES.plan[o.plan]}
            {o.plan2 ? ` + ${NAMES.plan[o.plan2]}` : ""} · {o.outcome}
          </div>
          <div>{o.text}</div>
        </div>
      ))}
    </div>
  );
}

/** How good his team is, and the team factors working for or against it this season. */
function TeamOutlook({ g }: { g: GameState }) {
  const s = g.season;
  const lg = g.stage === "NBA" ? g.nba : g.league;
  if (!s || !lg || !g.teamId || lg.teams.length < 4) return null;
  const rank = rosterRank(lg, g.teamId);
  const n = lg.teams.length;
  const edge = winningEdge(g.player.attrs, ovrOf(g.player.attrs, g.player.pos));
  const tag =
    rank <= Math.max(1, Math.round(n * 0.1))
      ? "title contender"
      : rank <= Math.round(n * 0.3)
        ? "playoff team"
        : rank <= Math.round(n * 0.6)
          ? "middle of the pack"
          : "rebuilding";
  return (
    <div className="small">
      Roster:{" "}
      <b>
        {ordinal(rank)} of {n}
      </b>{" "}
      ({tag})
      {(s.teamNotes ?? []).map((x) => (
        <div key={x} className="muted">
          {x}
        </div>
      ))}
      {edge.traits.length > 0 && (
        <div className="muted">
          Winning player:{" "}
          {edge.traits
            .map((x) => (x === "3&D" ? x : x.toLowerCase()))
            .join(", ")}{" "}
          (+{edge.regular.toFixed(1)} to the team, +{edge.playoff.toFixed(1)} in
          the playoffs, at full minutes)
        </div>
      )}
    </div>
  );
}

function Context({ g }: { g: GameState }) {
  const s = g.season;
  if (g.step === "preseason" && s) {
    return (
      <div className="recap">
        <div className="kicker">Season preview</div>
        <div>
          Projected role: <b>{NAMES.role[s.role]}</b> (number {s.roleRank} on
          the depth chart).
        </div>
        <TeamOutlook g={g} />
        {s.preReport && <div className="small">{s.preReport}</div>}
        {g.contract && g.stage !== "HS" && g.stage !== "NCAA" && (
          <div className="muted small">
            Contract: {fmtMoney(g.contract.salary)} a year, {g.contract.years}{" "}
            year{g.contract.years === 1 ? "" : "s"} left.
          </div>
        )}
      </div>
    );
  }
  if (g.step === "midseason" && s) {
    const half = s.halfLines[0];
    return (
      <div className="stack">
        <div className="recap">
          <div className="kicker">Half report</div>
          {s.midReport.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          {s.preReport && (
            <div className="muted small">Preseason: {s.preReport}</div>
          )}
          {s.allStarRank !== undefined && (
            <div className="small">
              {s.allStar
                ? "All-Star selection"
                : `All-Star voting: ${ordinal(s.allStarRank)} in the conference`}
            </div>
          )}
        </div>
        <PlanOutcomes g={g} half={1} />
        {half && half.gp > 0 && <Scoreboard line={half} />}
      </div>
    );
  }
  if (g.step === "summary" && s?.summary)
    return (
      <div className="stack">
        <SeasonSummary rec={s.summary} />
        <PlanOutcomes g={g} />
        <StrengthCard g={g} title="Why it went this way" />
      </div>
    );
  if (g.step === "offseason") {
    return (
      <div className="recap">
        <div className="kicker">Offseason · age {g.player.age}</div>
        {g.notes.length === 0 ? (
          <div className="muted">A quiet summer.</div>
        ) : (
          g.notes.map((n, i) => <div key={i}>{n}</div>)
        )}
      </div>
    );
  }
  return null;
}

/**
 * What to do, at the side (round 12): the choice in front of him, what is queued after it, and
 * anything worth doing between seasons, so the next step is always obvious.
 */
function Todo({ g }: { g: GameState }) {
  const pr = prompt(g);
  const now =
    pr.type === "decision"
      ? pr.decision.title
      : pr.type === "advance"
        ? pr.label
        : null;
  const items: { text: string; hot?: boolean; go?: string }[] = [
    ...g.pending.slice(1).map((d) => ({ text: d.title })),
    ...(canChangeFocus(g)
      ? [{ text: "Pick new focus stats", hot: true, go: ".o-moves" }]
      : []),
    ...(canRecruit(g) && (g.recruit?.moves ?? 0) < STARTERS_RECRUIT.moves
      ? [{ text: "Build the starting five", hot: true, go: ".o-moves" }]
      : []),
    ...(canSetStyle(g) && !currentStyle(g)
      ? [{ text: "Set your team's style", hot: true, go: ".o-moves" }]
      : []),
    ...(heightMismatch(g) && canChangePosition(g)
      ? [{ text: "Size check: think about another position", hot: true, go: ".o-moves" }]
      : []),
    ...(g.mode === "lab" && (g.player.lab?.credits ?? 0) >= 1
      ? [
          {
            text: `Spend ${Math.floor(g.player.lab!.credits)} lab credits`,
            hot: true,
            go: ".lab-card",
          },
        ]
      : []),
    ...g.player.programs.map((p) => ({
      text: `${p.name}: ${p.seasonsLeft} season${p.seasonsLeft === 1 ? "" : "s"} left`,
    })),
  ];
  return (
    <section className="card stack todo">
      <div className="sec-title">{UI.hub.todo}</div>
      {now && (
        <button className="todo-now" onClick={() => jump(".o-main")}>
          <span className="kicker">Now</span>
          <b>{now}</b>
        </button>
      )}
      {items.length === 0 ? (
        !now && <p className="muted small keep">{UI.hub.nothingPending}</p>
      ) : (
        <ul className="todo-list">
          {items.map((x, i) => (
            <li key={i} className={x.hot ? "hot" : ""}>
              {x.go ? (
                <button className="todo-go" onClick={() => jump(x.go!)}>
                  {x.text} →
                </button>
              ) : (
                x.text
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Scrolls to a part of the page and flashes it, so a to-do leads straight to its spot. */
function jump(sel: string) {
  const el = document.querySelector<HTMLElement>(sel);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
}

function FocusCard({ g }: { g: GameState }) {
  const change = useStore((s) => s.changeFocus);
  const p = g.player;
  const [pick, setPick] = useState<AttrKey[]>(p.focus);
  const toggle = (k: AttrKey) =>
    setPick((f) =>
      f.includes(k)
        ? f.filter((x) => x !== k)
        : f.length >= 2
          ? [f[1], k]
          : [...f, k],
    );
  const same = pick.length === 2 && pick.every((k) => p.focus.includes(k));
  const b = g.breakthrough;
  return (
    <section className="card stack focus-unlocked">
      <div className="unlock-banner">
        <span className="unlock-tag">Unlocked</span>
        <b>Breakthrough season: pick two new focus stats</b>
      </div>
      {b && (
        <p className="small" style={{ margin: 0 }}>
          {b.ovr >= breakthroughBar(p.age).ovr
            ? `Your OVR jumped ${b.ovr} this season.`
            : `Your ${NAMES.attr[b.key].toLowerCase()} jumped ${b.gain} this season.`}{" "}
          Focus stats grow about twice as fast. This chance lasts until next
          season starts; the next one comes with your next breakthrough.
        </p>
      )}
      <div className="row">
        <span className="small muted">
          Now: {p.focus.map((k) => NAMES.attr[k]).join(" + ")}
        </span>
      </div>
      <div className="focus-grid">
        {ATTRS.map((k) => (
          <button
            key={k}
            className={`choice${pick.includes(k) ? " selected" : ""}`}
            aria-pressed={pick.includes(k)}
            onClick={() => toggle(k)}
          >
            <span className="label">
              {NAMES.attr[k]}{" "}
              <span className="muted">{Math.round(p.attrs[k])}</span>
            </span>
          </button>
        ))}
      </div>
      <button
        className="btn"
        disabled={pick.length !== 2 || same}
        onClick={() => change(pick)}
      >
        {same
          ? "Pick two new focus stats"
          : `Focus on ${pick.map((k) => NAMES.attr[k]).join(" and ")}`}
      </button>
    </section>
  );
}

/** Everything he can change between seasons, in one place near the top of the screen. */
type Move = "position" | "number" | "retire" | "trade" | "roster" | "style";

function OffseasonMoves({ g }: { g: GameState }) {
  const focusOpen = canChangeFocus(g);
  // a size problem opens the position card straight away
  const [open, setOpen] = useState<Move | "focus" | null>(
    heightMismatch(g) && canChangePosition(g) ? "position" : null,
  );
  const p = g.player;
  const bar = breakthroughBar(p.age);
  const focusDone = g.flags.focusYear === g.year;
  const rec = recruitInfo(g);
  const style = currentStyle(g);
  // the talk with the coach lives here, not in the style card: setting the style closes the card
  const [talk, setTalk] = useState<TeamStyle | null>(null);
  const tiles: {
    id: "focus" | Move;
    label: string;
    sub: string;
    state: "hot" | "ready" | "locked";
    show: boolean;
  }[] = [
    {
      id: "focus",
      label: "Focus stats",
      sub: focusDone
        ? "Changed this offseason"
        : focusOpen
          ? "Unlocked by your breakthrough"
          : `Locked: needs a breakthrough season (OVR +${bar.ovr} or one rating +${bar.attr} at your age)`,
      state: focusOpen ? "hot" : "locked",
      show: g.mode !== "lab",
    },
    {
      id: "position",
      label: "Position",
      sub: heightMismatch(g)
        ? "Size check: another spot fits you"
        : `${NAMES.pos[p.pos]} · one move a summer`,
      state: canChangePosition(g)
        ? heightMismatch(g)
          ? "hot"
          : "ready"
        : "locked",
      show: true,
    },
    {
      id: "number",
      label: "Jersey number",
      sub: `Now #${p.number}`,
      state: "ready",
      show: g.stage !== "RETIRED",
    },
    {
      id: "roster",
      label: "Starting five",
      sub: canRecruit(g)
        ? `Scout and recruit: ${Math.max(0, STARTERS_RECRUIT.moves - rec.moves)} signing${STARTERS_RECRUIT.moves - rec.moves === 1 ? "" : "s"} left`
        : "Locked: become your team’s first option",
      state: canRecruit(g)
        ? rec.moves === 0 && rec.asks === 0
          ? "hot"
          : "ready"
        : "locked",
      show: g.stage === "NBA" && !!g.contract && g.contract.years > 0,
    },
    {
      id: "style",
      label: "Team style",
      sub: canSetStyle(g)
        ? style
          ? `${TEAM_STYLES[style].name} · change it`
          : "Set how your team plays"
        : g.flags.styleYear === g.year
          ? "Set this summer"
          : "Locked: start for your NBA team first",
      state: canSetStyle(g) ? (style ? "ready" : "hot") : "locked",
      show: g.stage === "NBA" && !!g.contract && g.contract.years > 0,
    },
    {
      id: "trade",
      label: "Request a trade",
      sub:
        g.tradeResult?.year === g.year
          ? g.tradeResult.ok
            ? `Traded to the ${g.tradeResult.team}`
            : "Asked this summer: no deal"
          : g.flags.tradeAsk === g.year
            ? "Asked this summer"
            : "Ask out for a better team",
      state:
        canRequestTrade(g) || g.tradeResult?.year === g.year
          ? "ready"
          : "locked",
      show: g.stage === "NBA" && !!g.contract && g.contract.years > 0,
    },
    {
      id: "retire",
      label: "Retire",
      sub: "Hang it up on your terms",
      state: "ready",
      show: canRetire(g),
    },
  ];
  return (
    <section className="card stack moves">
      <div className="row">
        <div className="sec-title">Offseason moves</div>
        <div className="spacer" />
        <span className="small muted">Between seasons only</span>
      </div>
      <div className="move-tiles">
        {tiles
          .filter((x) => x.show)
          .map((x) => (
            <button
              key={x.id}
              data-tour={`move-${x.id}`}
              className={`move-tile ${x.state}${open === x.id ? " on" : ""}`}
              disabled={x.state === "locked"}
              aria-expanded={open === x.id}
              onClick={() => setOpen(open === x.id ? null : x.id)}
            >
              {x.state === "hot" && <span className="unlock-tag">New</span>}
              {x.state === "locked" && <span className="lock-tag">Locked</span>}
              <b>{x.label}</b>
              <small>{x.sub}</small>
            </button>
          ))}
      </div>
      {open === "focus" && focusOpen && <FocusCard g={g} />}
      {open === "position" && canChangePosition(g) && <PositionCard g={g} />}
      {open === "number" && <NumberCard g={g} />}
      {open === "retire" && canRetire(g) && <RetireCard g={g} />}
      {open === "trade" &&
        (canRequestTrade(g) || g.tradeResult?.year === g.year) && (
          <TradeCard g={g} />
        )}
      {open === "roster" && <RecruitCard g={g} />}
      {open === "style" && canSetStyle(g) && <StyleCard g={g} onTalk={setTalk} />}
      {talk && <CoachTalk g={g} style={talk} onClose={() => setTalk(null)} />}
    </section>
  );
}

function NumberCard({ g }: { g: GameState }) {
  const change = useStore((s) => s.changeNumber);
  const [n, setN] = useState(String(g.player.number));
  const v = Number(n);
  const ok =
    n.trim() !== "" &&
    Number.isInteger(v) &&
    v >= 0 &&
    v <= 99 &&
    v !== g.player.number;
  return (
    <section className="card stack">
      <div className="row">
        <div className="sec-title">Jersey number</div>
        <div className="spacer" />
        <span className="small muted">Now #{g.player.number}</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input
          aria-label="New jersey number"
          type="number"
          min={0}
          max={99}
          value={n}
          onChange={(e) => setN(e.target.value)}
          style={{ maxWidth: 110 }}
        />
        <button className="btn ghost" disabled={!ok} onClick={() => change(v)}>
          Switch number
        </button>
      </div>
    </section>
  );
}

function PositionCard({ g }: { g: GameState }) {
  const change = useStore((s) => s.changePosition);
  const [open, setOpen] = useState(false);
  const p = g.player;
  const opts = positionOptions(g);
  const mm = heightMismatch(g);
  return (
    <section className={`card stack${mm ? " warn-card" : ""}`}>
      <div className="row">
        <div className="sec-title">Position</div>
        <div className="spacer" />
        <span className="small muted">
          {NAMES.pos[p.pos]} · {ht(p.height)}
          {p.height < p.heightProj ? ` (projected ${ht(p.heightProj)})` : ""} · {weightOf(p)} lb · {ht(p.wingspan)} wingspan
        </span>
      </div>
      {mm && (
        <p className="height-warn-text">
          <b>Size check:</b> {mm.text}
          {mm.better.length > 0
            ? ` ${mm.better.map((o) => NAMES.pos[o.pos]).join(" or ")} would fit.`
            : ""}
        </p>
      )}
      {open || mm ? (
        <div className="stack" style={{ gap: 6 }}>
          {opts.map((o) => (
            <button
              key={o.pos}
              className="choice"
              disabled={!o.allowed}
              onClick={() => change(o.pos)}
            >
              <span className="label">
                {NAMES.pos[o.pos]}{" "}
                <span className="muted">· OVR {Math.round(o.ovr)}</span>
              </span>
              <small>{o.fit}</small>
            </button>
          ))}
          <p className="small muted">
            One move per offseason. Your OVR is re-weighted for the new spot,
            and the coach needs time to trust you there.
          </p>
        </div>
      ) : (
        <button className="btn ghost" onClick={() => setOpen(true)}>
          Try another position
        </button>
      )}
    </section>
  );
}

function TradeCard({ g }: { g: GameState }) {
  const ask = useStore((s) => s.requestTrade);
  const master = useStore((s) => s.master);
  const [aim, setAim] = useState<TradeAim | null>(null);
  const rank = g.nba && g.teamId ? rosterRank(g.nba, g.teamId) : 0;
  const opts = tradeOptions(g);
  const pick = opts.find((o) => o.aim === aim);
  const res = g.tradeResult?.year === g.year ? g.tradeResult : null;
  if (res)
    return (
      <section
        className={`card stack trade-result ${res.ok ? "ok" : "no"}`}
        style={res.color ? { ["--team" as string]: res.color } : undefined}
      >
        <div className="kicker">Trade request</div>
        <div className="trade-result-head">
          {res.ok ? `You are a member of the ${res.team}` : "No deal"}
        </div>
        <p>{res.text}</p>
      </section>
    );
  return (
    <section className="card stack">
      <div className="sec-title">Request a trade</div>
      <p className="small muted">
        Your team ranks {ordinal(rank)}. Where do you want to go? If nobody
        bites, your coach will not forget it. Your reputation makes teams
        listen: the higher it is, the better your odds.
      </p>
      <div className="stack trade-aims">
        {opts.map((o) => (
          <button
            key={o.aim}
            className={`choice${aim === o.aim ? " selected" : ""}`}
            aria-pressed={aim === o.aim}
            onClick={() => setAim(o.aim)}
          >
            <span className="label">
              {TRADE_AIM[o.aim].label}
              {!master && (
                <span
                  className={`scout-rec rec-${oddsWord(o.chance) === "High" ? "high" : oddsWord(o.chance) === "Moderate" ? "moderate" : "low"}`}
                >
                  {oddsWord(o.chance)} odds
                </span>
              )}
              <span
                className={`risk risk-${TRADE_AIM[o.aim].risk.toLowerCase()}`}
              >
                {TRADE_AIM[o.aim].risk} risk
              </span>
            </span>
            <small>
              {TRADE_AIM[o.aim].text}{" "}
              {o.teams.length <= 3
                ? `(${o.teams.map((t) => t.short).join(", ")})`
                : ""}
            </small>
          </button>
        ))}
      </div>
      <button
        className="btn"
        disabled={!pick}
        onClick={() => pick && ask(pick.aim)}
      >
        {pick
          ? `Ask for a trade: ${TRADE_AIM[pick.aim].label.toLowerCase()}`
          : "Pick where you want to go"}
      </button>
    </section>
  );
}

function StyleCard({ g, onTalk }: { g: GameState; onTalk: (k: TeamStyle) => void }) {
  const mutate = useStore((s) => s.mutate);
  const master = useStore((s) => s.master);
  const now = currentStyle(g);
  // the new style comes out of a talk with the coach (not in fast break or sim mode)
  const quick = !!g.flags.fast || !!g.flags.sim;
  const choose = (k: TeamStyle) => {
    if (k === now) return;
    mutate((x) => setStyle(x, k));
    if (!quick) onTalk(k);
  };
  return (
    <section className="card stack">
      <div className="row">
        <div className="sec-title">Team style</div>
        <div className="spacer" />
        <span className="small muted">
          {now ? `Now: ${TEAM_STYLES[now].name}` : "Not set"}
        </span>
      </div>
      <p className="small muted">
        You start here, so you have a say in how the team plays. The style moves
        the team's strength and how well you fit in it. One change a summer.
      </p>
      <div className="stack style-list">
        {(Object.keys(TEAM_STYLES) as TeamStyle[])
          .map((k) => ({ k, f: styleFit(g, k), e: styleEffect(g, k) }))
          .sort((a, b) =>
            master ? 0 : b.e.regular + b.e.playoff - (a.e.regular + a.e.playoff),
          )
          .map(({ k, f, e }) => (
            <button
              key={k}
              className={`choice style-choice${now === k ? " selected" : ""}`}
              onClick={() => choose(k)}
            >
              {/* round 24: each style as the coach draws it */}
              <PlaybookArt style={k} size={120} />
              <span className="label">
                {TEAM_STYLES[k].name}
                {!master && (
                  <>
                    <span
                      className={`scout-rec rec-${fitLabel(f) === "Poor fit" ? "low" : fitLabel(f) === "Okay" ? "moderate" : "high"}`}
                    >
                      {fitLabel(f)}
                    </span>
                    <span className="style-fx">
                      {e.regular >= 0 ? "+" : ""}
                      {e.regular} / playoffs {e.playoff >= 0 ? "+" : ""}
                      {e.playoff}
                    </span>
                  </>
                )}
              </span>
              <small>
                {TEAM_STYLES[k].text} Fits {TEAM_STYLES[k].fits}.
              </small>
            </button>
          ))}
      </div>
    </section>
  );
}

function RetireCard({ g }: { g: GameState }) {
  const retire = useStore((s) => s.retire);
  const [armed, setArmed] = useState(false);
  return (
    <section className="card stack">
      <div className="sec-title">Your call</div>
      <p className="small muted">
        You can hang it up between any two seasons. At {g.player.age}, with{" "}
        {g.history.filter((h) => h.level === "NBA").length} NBA season
        {g.history.filter((h) => h.level === "NBA").length === 1
          ? ""
          : "s"}{" "}
        behind you.
      </p>
      {armed ? (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn danger" onClick={retire}>
            Yes, retire now
          </button>
          <button className="btn ghost" onClick={() => setArmed(false)}>
            Keep playing
          </button>
        </div>
      ) : (
        <button className="btn ghost" onClick={() => setArmed(true)}>
          Retire
        </button>
      )}
    </section>
  );
}

export function Home({ g }: { g: GameState }) {
  const advance = useStore((s) => s.advance);
  const pr = prompt(g);
  const last = g.lastSummary;
  return (
    <div className="home-grid">
      <div className="stack">
        <div className="o-todo">
          <Todo g={g} />
        </div>
        <PlayerCard g={g} />
        <Extra>
          <ScoutCard g={g} compact />
          <section className="card stack">
            <div className="sec-title">Milestones</div>
            <MilestoneStrip reached={g.milestones} />
          </section>
        </Extra>
      </div>
      <div className="stack home-center">
        <section className="card stack o-main">
          <SeasonHeader g={g} />
          <UndoBar g={g} />
          {g.result ? (
            <div
              className={`result-card${g.result.tierKey ? ` tier-${g.result.tierKey}` : ""}`}
            >
              <div className="kicker">
                {g.result.title} · {g.result.choice}
              </div>
              {g.result.tier && (
                <span className="result-tier">{g.result.tier}</span>
              )}
              <p className="result-text prose">{g.result.text}</p>
              {g.result.changes.length > 0 && (
                <div className="result-chips">
                  {g.result.changes.map((c, i) => (
                    <span
                      key={i}
                      className={`result-chip ${c.good ? "up" : "down"}`}
                    >
                      {c.good ? "▲" : "▼"} {c.label} <b>{c.value}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            g.toast && <div className="toast">{g.toast}</div>
          )}
          {g.simCalls?.length ? <SimCalls calls={g.simCalls} /> : null}
          {g.reel?.length ? <Reel items={g.reel} /> : null}
          {g.flags.fast ? <FastRecap g={g} /> : <SimpleStats g={g} />}
          <GuideSpotWrap g={g} spot="main">
            <div
              className="stack fade-in"
              data-tour={pr.type === "decision" ? tourKind(pr.decision.kind) : undefined}
              key={
                pr.type === "decision" ? pr.decision.id : `${g.year}-${g.step}`
              }
            >
              {!g.flags.fast && (
                <div className="prose">
                  <Context g={g} />
                </div>
              )}
              {pr.type === "decision" && <DecisionView g={g} d={pr.decision} />}
              {pr.type === "advance" && (
                <button className="btn block main-go" onClick={advance}>
                  {pr.label}
                </button>
              )}
            </div>
          </GuideSpotWrap>
        </section>
        {/* between seasons, the moves come first: right under the main card */}
        {g.step === "offseason" && g.stage !== "RETIRED" && (
          <div className="o-moves">
            <GuideSpotWrap g={g} spot="moves">
              <OffseasonMoves g={g} />
            </GuideSpotWrap>
          </div>
        )}
        {g.mode === "lab" && <LabCard g={g} />}
        {g.step === "summary" && canRetire(g) && <RetireCard g={g} />}
        {last && g.step !== "summary" && !g.flags.fast && (
          <section className="card stack prose">
            <div className="kicker">Last season</div>
            <div className="small">
              {seasonLabel(last.year)} · {last.teamName}: {last.w}–{last.l},{" "}
              {last.result}. {perGame(last.line, "pts").toFixed(1)} PPG.
            </div>
          </section>
        )}
      </div>
      <div className="stack home-side">
        <ModesCard g={g} />
        <Extra>
          <MvpRace g={g} />
          <DuoCard g={g} />
          <RivalCard g={g} />
          <StoriesCard g={g} />
          {g.feed[0] && (
            <section className="card prose">
              <ReactionCard r={g.feed[0]} />
            </section>
          )}
        </Extra>
      </div>
    </div>
  );
}
