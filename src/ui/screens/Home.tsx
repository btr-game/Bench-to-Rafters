import type { AttrKey, EventResult, GameState, SeasonRecord } from "../../engine/types";
import { CoachCard } from '../components/CoachCard';
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
  friendTeams,
  oddsWord,
  TRADE_AIM,
  tradeOptions,
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
import { canFarewell, isFarewellSeason } from "../../engine/career/farewell";
import { canChase, chasing, recordWatch } from "../../engine/career/records";
import { useMemo, useState } from "react";
import { ATTRS, LEVELS } from "../../engine/balance";
import { NAMES, UI } from "../../content/strings";
import { canUndo, useStore } from "../../store";
import { sfx } from "../sound";
import { LabCard } from "../components/Lab";
import { PlaybookArt } from "../art/Playbook";
import { RecruitCard } from "../components/Roster";
import { AroundCard } from "../components/Around";
import { MpBoard } from "./Multiplayer";
import { canRecruit, recruitInfo } from "../../engine/career/recruit";
import { STARTERS_RECRUIT } from "../../engine/balance";
import {
  Banners,
  Card,
  Extra,
  FoldBox,
  MilestoneStrip,
  Scoreboard,
  StatStrip,
} from "../components/bits";
import { PlayerCard } from "../components/PlayerCard";
import { ScoutCard } from "../components/ScoutCard";
import { DecisionView, riskText } from "./Decision";
import { fmtMoney, ht, ordinal, pg, seasonLabel, signed } from "../format";
import { team } from "../selectors";
import { TeamArt } from "../art/Crest";
import { styleLeague } from "../art/Player";
import { Icon } from "../art/Icon";
import { leagueIcon, levelIcon } from "../art/careerArt";
import { intLeagueOf } from "../../engine/world/leagues";
import { breakthroughBar } from "../../engine/career/breakthrough";
import { PLAN_TEXT } from "../../engine/career/season";
import { rosterRank, winningEdge } from "../../engine/career/team";
import { ovrOf } from "../../engine/player/ovr";
import { perGame } from "../../engine/sim/statModel";
import { weightOf } from "../../engine/player/weight";
import { ModesCard } from '../components/ModesCard';
import { StrengthCard } from '../components/StrengthCard';
import { CoachTalk } from '../components/CoachTalk';
import { leanLevel } from '../road';
import { t, tx } from '../../i18n';

/** Two (or more) joined with and, or with or. */
const both = (xs: string[]): string => (xs.length === 2 ? t('{a} and {b}', { a: xs[0], b: xs[1] }) : xs.join(" and "));
const either = (xs: string[]): string => (xs.length === 2 ? t('{a} or {b}', { a: xs[0], b: xs[1] }) : xs.join(" or "));
const ODDS: Record<ReturnType<typeof oddsWord>, string> = { High: tx('High odds'), Moderate: tx('Moderate odds'), Low: tx('Low odds') };
const FIT: Record<ReturnType<typeof fitLabel>, string> = { 'Great fit': tx('Great fit'), 'Good fit': tx('Good fit'), Okay: tx('Okay'), 'Poor fit': tx('Poor fit') };

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
              ? t('{n} starts · {mpg} MPG', { n: l.gs, mpg: (l.min / l.gp).toFixed(1) })
              : t("Did not play")}
          </div>
        </div>
      </div>
      <div className="ovr-move num">
        OVR {Math.round(rec.ovrStart)} → {Math.round(rec.ovrEnd)}{" "}
        <span className={delta >= 0 ? "up" : "down"}>
          {delta >= 0 ? "▲" : "▼"} {signed(delta)}
        </span>
      </div>
      <div className="kicker">{t('Regular season')}</div>
      <Scoreboard line={l} />
      {rec.post.gp > 0 && (
        <p className="num small">
          {t('Postseason · {n} games', { n: rec.post.gp })} · {pg(rec.post, "pts")} PTS ·{" "}
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
          <span className="unlock-tag">{t('Breakthrough')}</span>
          <span>
            {rec.breakthrough} {t('Focus change unlocked for this offseason.')}
          </span>
        </div>
      )}
      {rec.newHighs && rec.newHighs.length > 0 && (
        <div className="small">
          <b>{rec.newHighs.length > 1 ? t('New NBA career highs:') : t('New NBA career high:')}</b>{" "}
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
                {r.userRank === 1 ? t("Won") : `${ordinal(r.userRank!)}`}
                {r.userRank !== 1 && r.top[0]
                  ? `. ${t('Winner: {name}, {team}', { name: r.top[0].name, team: r.top[0].team })}`
                  : ""}
              </li>
            ))}
        </ul>
      )}
      {rec.bestGame?.line && (
        <p className="muted small keep">
          {t('Best game: {pts} PTS, {reb} REB, {ast} AST vs {opp} ({res} {us}–{them})', { pts: rec.bestGame.line.pts, reb: rec.bestGame.line.reb, ast: rec.bestGame.line.ast, opp: rec.bestGame.opp, res: rec.bestGame.res, us: rec.bestGame.us, them: rec.bestGame.them })}
        </p>
      )}
      {rec.salary > 0 && (
        <p className="muted small keep">
          {t('Salary this season: {money}', { money: fmtMoney(rec.salary) })}
        </p>
      )}
    </div>
  );
}

function SeasonHeader({ g }: { g: GameState }) {
  const tm = team(g);
  const s = g.season;
  const stepName =
    g.step === "preseason"
      ? t("Preseason")
      : g.step === "midseason"
        ? t("Midseason")
        : g.step === "postseason"
          ? t("Postseason")
          : g.step === "summary"
            ? t("Season over")
            : g.step === "offseason"
              ? t("Offseason")
              : "";
  return (
    <div className="turn-head">
      {tm && <TeamArt name={tm.name} abbr={tm.abbr || tm.short} color={tm.color} league={styleLeague(g.stage)} size={56} />}
      {tm && (
        <div className="crest-mark" aria-hidden="true">
          <TeamArt name={tm.name} abbr={tm.abbr || tm.short} color={tm.color} league={styleLeague(g.stage)} size={120} />
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="kicker">
          {seasonLabel(g.year)} · {stepName}
        </div>
        <h2>{tm ? tm.name : t("Offseason")}</h2>
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
        {tm && s && g.step !== "offseason" && (
          <div className="record">
            {tm.w}–{tm.l}
            <small>{t('RECORD')}</small>
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
        {calls.length === 1 ? t("Sim made a call for you") : t('Sim made {n} calls for you', { n: calls.length })}
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
        {t('On the way here')}
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
      <button className="btn ghost small with-icon" data-tour="undo" onClick={() => (sfx("undo"), undoLast())} title={t('Undo (U)')}>
        <Icon name="undo" size={18} /> {t('Undo')}
      </button>
      <span className="small muted">{t('Takes back: {what}', { what: undo.label })}</span>
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
  if (half?.gp) return <StatStrip line={half} label={t('First half')} />;
  const rec = g.step === "summary" ? s?.summary : g.lastSummary;
  if (!rec) return null;
  return <StatStrip line={rec.line} label={`${seasonLabel(rec.year)}${g.step === "summary" ? "" : ` · ${t('last season')}`}`} />;
}

/** Round 32: a record within reach, said quietly; the scoring list can be chased for a season. */
function RecordWatch({ g }: { g: GameState }) {
  const chase = useStore((s) => s.chase);
  const watch = useMemo(() => recordWatch(g), [g]);
  if (!watch.length) return null;
  return (
    <div className="record-watch" data-tour="record-watch">
      <Icon name="record" size={22} />
      <div className="stack" style={{ gap: 4, minWidth: 0 }}>
        <span className="kicker">{t('Record watch')}</span>
        {watch.map((w) => (
          <span key={w.text} className="small">
            {w.text}
          </span>
        ))}
        {chasing(g) ? (
          <span className="small muted keep">{t('Chasing it this season: a few more shots, a little more risk.')}</span>
        ) : canChase(g) ? (
          <button className="btn ghost small" onClick={() => (sfx("clutch"), chase())}>
            {t('Chase it this season')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FastRecap({ g }: { g: GameState }) {
  const r = g.lastSummary;
  if (!r) return null;
  const d = r.ovrEnd - r.ovrStart;
  return (
    <div className="fast-recap">
      <div className="kicker">
        {t('Last season')} · {seasonLabel(r.year)} · {r.teamName}
      </div>
      <div>
        <b>
          {r.w}–{r.l}
        </b>
        , {r.result.toLowerCase()} ·{" "}
        {r.line.gp > 0
          ? `${perGame(r.line, "pts").toFixed(1)} PTS, ${perGame(r.line, "reb").toFixed(1)} REB, ${perGame(r.line, "ast").toFixed(1)} AST`
          : t("did not play")}{" "}
        · OVR {Math.round(r.ovrStart)} → {Math.round(r.ovrEnd)}{" "}
        <span className={d >= 0 ? "up" : "down"}>({signed(d)})</span>
      </div>
      {r.awards.length > 0 && (
        <div className="small">{r.awards.join(" · ")}</div>
      )}
      {r.breakthrough && (
        <div className="small">
          <span className="unlock-tag">{t('Breakthrough')}</span> {r.breakthrough}
        </div>
      )}
      {r.newHighs && r.newHighs.length > 0 && (
        <div className="small">
          {t('New NBA career high: {list}', { list: r.newHighs.join(", ") })}
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
            {o.half === 1 ? t("First half") : t("Second half")} · {t(PLAN_TEXT[o.plan].label)}
            {o.plan2 ? ` + ${t(PLAN_TEXT[o.plan2].label)}` : ""} · {o.outcome}
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
      ? t("title contender")
      : rank <= Math.round(n * 0.3)
        ? t("playoff team")
        : rank <= Math.round(n * 0.6)
          ? t("middle of the pack")
          : t("rebuilding");
  return (
    <div className="small">
      {t('Roster:')}{" "}
      <b>
        {t('{rank} of {n}', { rank: ordinal(rank), n })}
      </b>{" "}
      ({tag})
      {(s.teamNotes ?? []).map((x) => (
        <div key={x} className="muted">
          {x}
        </div>
      ))}
      {edge.traits.length > 0 && (
        <div className="muted">
          {t('Winning player:')}{" "}
          {edge.traits
            .map((x) => (x === "3&D" ? x : x.toLowerCase()))
            .join(", ")}{" "}
          ({t('+{regular} to the team, +{playoff} in the playoffs, at full minutes', { regular: edge.regular.toFixed(1), playoff: edge.playoff.toFixed(1) })})
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
        <div className="kicker">{t('Season preview')}</div>
        <div>
          {t('Projected role:')} <b>{NAMES.role[s.role]}</b> {t('(number {n} on the depth chart).', { n: s.roleRank })}
        </div>
        <TeamOutlook g={g} />
        {s.preReport && <div className="small">{s.preReport}</div>}
        {g.contract && g.stage !== "HS" && g.stage !== "NCAA" && (
          <div className="muted small">
            {g.contract.years === 1
              ? t('Contract: {money} a year, 1 year left.', { money: fmtMoney(g.contract.salary) })
              : t('Contract: {money} a year, {n} years left.', { money: fmtMoney(g.contract.salary), n: g.contract.years })}
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
          <div className="kicker">{t('Half report')}</div>
          {s.midReport.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          {s.preReport && (
            <div className="muted small">{t('Preseason: {report}', { report: s.preReport })}</div>
          )}
          {s.allStarRank !== undefined && (
            <div className="small">
              {s.allStar
                ? t("All-Star selection")
                : t('All-Star voting: {rank} in the conference', { rank: ordinal(s.allStarRank) })}
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
        <StrengthCard g={g} title={t('Why it went this way')} />
      </div>
    );
  if (g.step === "offseason") {
    return (
      <div className="recap">
        <div className="kicker">{t('Offseason · age {n}', { n: g.player.age })}</div>
        {g.notes.length === 0 ? (
          <div className="muted">{t('A quiet summer.')}</div>
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
      ? t(pr.decision.title)
      : pr.type === "advance"
        ? t(pr.label)
        : null;
  const items: { text: string; hot?: boolean; go?: string }[] = [
    ...g.pending.slice(1).map((d) => ({ text: t(d.title) })),
    ...(canChangeFocus(g)
      ? [{ text: t("Pick new focus stats"), hot: true, go: ".o-moves" }]
      : []),
    ...(canRecruit(g) && (g.recruit?.moves ?? 0) < STARTERS_RECRUIT.moves
      ? [{ text: t("Build the starting five"), hot: true, go: ".o-moves" }]
      : []),
    ...(canSetStyle(g) && !currentStyle(g)
      ? [{ text: t("Set your team's style"), hot: true, go: ".o-moves" }]
      : []),
    ...(heightMismatch(g) && canChangePosition(g)
      ? [{ text: t("Size check: think about another position"), hot: true, go: ".o-moves" }]
      : []),
    ...(g.mode === "lab" && (g.player.lab?.credits ?? 0) >= 1
      ? [
          {
            text: t('Spend {n} lab credits', { n: Math.floor(g.player.lab!.credits) }),
            hot: true,
            go: ".lab-card",
          },
        ]
      : []),
    ...g.player.programs.map((p) => ({
      text: p.seasonsLeft === 1 ? t('{name}: 1 season left', { name: p.name }) : t('{name}: {n} seasons left', { name: p.name, n: p.seasonsLeft }),
    })),
  ];
  return (
    <section className="card stack todo">
      <div className="sec-title">{t(UI.hub.todo)}</div>
      {now && (
        <button className="todo-now" onClick={() => jump(".o-main")}>
          <span className="kicker">{t('Now')}</span>
          <b>{now}</b>
        </button>
      )}
      {items.length === 0 ? (
        !now && <p className="muted small keep">{t(UI.hub.nothingPending)}</p>
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
        <span className="unlock-tag">{t('Unlocked')}</span>
        <b>{t('Breakthrough season: pick two new focus stats')}</b>
      </div>
      {b && (
        <p className="small" style={{ margin: 0 }}>
          {b.ovr >= breakthroughBar(p.age).ovr
            ? t('Your OVR jumped {n} this season.', { n: b.ovr })
            : t('Your {rating} jumped {n} this season.', { rating: NAMES.attr[b.key].toLowerCase(), n: b.gain })}{" "}
          {t('Focus stats grow about twice as fast. This chance lasts until next season starts; the next one comes with your next breakthrough.')}
        </p>
      )}
      <div className="row">
        <span className="small muted">
          {t('Now: {focus}', { focus: p.focus.map((k) => NAMES.attr[k]).join(" + ") })}
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
          ? t("Pick two new focus stats")
          : t('Focus on {focus}', { focus: both(pick.map((k) => NAMES.attr[k])) })}
      </button>
    </section>
  );
}

/** Everything he can change between seasons, in one place near the top of the screen. */
type Move = "position" | "number" | "retire" | "trade" | "roster" | "style" | "farewell";

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
      label: t("Focus stats"),
      sub: focusDone
        ? t("Changed this offseason")
        : focusOpen
          ? t("Unlocked by your breakthrough")
          : t('Locked: needs a breakthrough season (OVR +{ovr} or one rating +{attr} at your age)', { ovr: bar.ovr, attr: bar.attr }),
      state: focusOpen ? "hot" : "locked",
      show: g.mode !== "lab",
    },
    {
      id: "position",
      label: t("Position"),
      sub: heightMismatch(g)
        ? t("Size check: another spot fits you")
        : `${NAMES.pos[p.pos]} · ${t('one move a summer')}`,
      state: canChangePosition(g)
        ? heightMismatch(g)
          ? "hot"
          : "ready"
        : "locked",
      show: true,
    },
    {
      id: "number",
      label: t("Jersey number"),
      sub: t('Now #{n}', { n: p.number }),
      state: "ready",
      show: g.stage !== "RETIRED",
    },
    {
      id: "roster",
      label: t("Starting five"),
      sub: canRecruit(g)
        ? STARTERS_RECRUIT.moves - rec.moves === 1
          ? t('Scout and recruit: 1 signing left')
          : t('Scout and recruit: {n} signings left', { n: Math.max(0, STARTERS_RECRUIT.moves - rec.moves) })
        : t("Locked: become your team’s first option"),
      state: canRecruit(g)
        ? rec.moves === 0 && rec.asks === 0
          ? "hot"
          : "ready"
        : "locked",
      show: g.stage === "NBA" && !!g.contract && g.contract.years > 0,
    },
    {
      id: "style",
      label: t("Team style"),
      sub: canSetStyle(g)
        ? style
          ? `${TEAM_STYLES[style].name} · ${t('change it')}`
          : t("Set how your team plays")
        : g.flags.styleYear === g.year
          ? t("Set this summer")
          : t("Locked: start for your NBA team first"),
      state: canSetStyle(g) ? (style ? "ready" : "hot") : "locked",
      show: g.stage === "NBA" && !!g.contract && g.contract.years > 0,
    },
    {
      id: "trade",
      label: t("Request a trade"),
      sub:
        g.tradeResult?.year === g.year
          ? g.tradeResult.ok
            ? t('Traded to the {team}', { team: g.tradeResult.team ?? '' })
            : t("Asked this summer: no deal")
          : g.flags.tradeAsk === g.year
            ? t("Asked this summer")
            : t("Ask out for a better team"),
      state:
        canRequestTrade(g) || g.tradeResult?.year === g.year
          ? "ready"
          : "locked",
      show: g.stage === "NBA" && !!g.contract && g.contract.years > 0,
    },
    {
      id: "retire",
      label: t("Retire"),
      sub: t("Hang it up on your terms"),
      state: "ready",
      show: canRetire(g),
    },
    {
      // round 32: say the next season is the last, and go out on a tour
      id: "farewell",
      label: t("Farewell tour"),
      sub: g.flags.farewell ? t("Announced: next season is your last") : t("Make next season your last"),
      state: canFarewell(g) ? "hot" : "locked",
      show: g.stage === "NBA" && (canFarewell(g) || !!g.flags.farewell),
    },
  ];
  return (
    <section className="card stack moves">
      <div className="row">
        <div className="sec-title">{t('Offseason moves')}</div>
        <div className="spacer" />
        <span className="small muted">{t('Between seasons only')}</span>
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
              {x.state === "hot" && <span className="unlock-tag">{t('New')}</span>}
              {x.state === "locked" && <span className="lock-tag">{t('Locked')}</span>}
              <b>{x.label}</b>
              <small>{x.sub}</small>
            </button>
          ))}
      </div>
      {open === "focus" && focusOpen && <FocusCard g={g} />}
      {open === "position" && canChangePosition(g) && <PositionCard g={g} />}
      {open === "number" && <NumberCard g={g} />}
      {open === "retire" && canRetire(g) && <RetireCard g={g} />}
      {open === "farewell" && canFarewell(g) && <FarewellCard />}
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
        <div className="sec-title">{t('Jersey number')}</div>
        <div className="spacer" />
        <span className="small muted">{t('Now #{n}', { n: g.player.number })}</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input
          aria-label={t('New jersey number')}
          type="number"
          min={0}
          max={99}
          value={n}
          onChange={(e) => setN(e.target.value)}
          style={{ maxWidth: 110 }}
        />
        <button className="btn ghost" disabled={!ok} onClick={() => change(v)}>
          {t('Switch number')}
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
        <div className="sec-title">{t('Position')}</div>
        <div className="spacer" />
        <span className="small muted">
          {NAMES.pos[p.pos]} · {ht(p.height)}
          {p.height < p.heightProj ? ` (${t('projected {h}', { h: ht(p.heightProj) })})` : ""} · {weightOf(p)} lb · {t('{w} wingspan', { w: ht(p.wingspan) })}
        </span>
      </div>
      {mm && (
        <p className="height-warn-text">
          <b>{t('Size check:')}</b> {mm.text}
          {mm.better.length > 0
            ? ` ${t('{pos} would fit.', { pos: either(mm.better.map((o) => NAMES.pos[o.pos])) })}`
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
            {t('One move per offseason. Your OVR is re-weighted for the new spot, and the coach needs time to trust you there.')}
          </p>
        </div>
      ) : (
        <button className="btn ghost" onClick={() => setOpen(true)}>
          {t('Try another position')}
        </button>
      )}
    </section>
  );
}

function TradeCard({ g }: { g: GameState }) {
  const ask = useStore((s) => s.requestTrade);
  const master = useStore((s) => s.master);
  // round 35: an aim and, for a friend's team, the team (several friends can be on several teams)
  const [aim, setAim] = useState<string | null>(null);
  const rank = g.nba && g.teamId ? rosterRank(g.nba, g.teamId) : 0;
  const opts = tradeOptions(g);
  const keyOf = (o: (typeof opts)[number]) => (o.to ? `${o.aim}:${o.to}` : o.aim);
  const pick = opts.find((o) => keyOf(o) === aim);
  // a friend's team the money rules out, and why
  const blocked = friendTeams(g).filter((x) => x.why);
  const res = g.tradeResult?.year === g.year ? g.tradeResult : null;
  if (res)
    return (
      <section
        className={`card stack trade-result ${res.ok ? "ok" : "no"}`}
        style={res.color ? { ["--team" as string]: res.color } : undefined}
      >
        <div className="kicker">{t('Trade request')}</div>
        <div className="trade-result-head">
          {res.ok ? t('You are a member of the {team}', { team: res.team ?? '' }) : t("No deal")}
        </div>
        <p>{res.text}</p>
      </section>
    );
  return (
    <section className="card stack">
      <div className="sec-title">{t('Request a trade')}</div>
      <p className="small muted">
        {t('Your team ranks {rank}. Where do you want to go? If nobody bites, your coach will not forget it. Your reputation makes teams listen: the higher it is, the better your odds.', { rank: ordinal(rank) })}
      </p>
      <div className="stack trade-aims">
        {opts.map((o) => (
          <button
            key={keyOf(o)}
            className={`choice${aim === keyOf(o) ? " selected" : ""}`}
            aria-pressed={aim === keyOf(o)}
            onClick={() => setAim(keyOf(o))}
          >
            <span className="label">
              {o.label ?? TRADE_AIM[o.aim].label}
              {!master && (
                <span
                  className={`scout-rec rec-${oddsWord(o.chance) === "High" ? "high" : oddsWord(o.chance) === "Moderate" ? "moderate" : "low"}`}
                >
                  {t(ODDS[oddsWord(o.chance)])}
                </span>
              )}
              <span
                className={`risk risk-${TRADE_AIM[o.aim].risk.toLowerCase()}`}
              >
                {riskText(TRADE_AIM[o.aim].risk)}
              </span>
            </span>
            <small>
              {o.text ?? TRADE_AIM[o.aim].text}{" "}
              {!o.to && o.teams.length <= 3
                ? `(${o.teams.map((x) => x.short).join(", ")})`
                : ""}
            </small>
          </button>
        ))}
      </div>
      {blocked.map((x) => (
        <p key={x.team.id} className="small muted">
          {t('Join {names} on the {team}: {why}', { names: both(x.friends.map((f) => f.pn)), team: x.team.name, why: x.why ?? '' })}
        </p>
      ))}
      <button
        className="btn"
        disabled={!pick}
        onClick={() => pick && ask(pick.aim, pick.to)}
      >
        {pick
          ? t('Ask for a trade: {aim}', { aim: pick.label ? pick.label.replace(/^Join/, "join") : TRADE_AIM[pick.aim].label.toLowerCase() })
          : t("Pick where you want to go")}
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
        <div className="sec-title">{t('Team style')}</div>
        <div className="spacer" />
        <span className="small muted">
          {now ? t('Now: {style}', { style: TEAM_STYLES[now].name }) : t("Not set")}
        </span>
      </div>
      <p className="small muted">
        {t("You start here, so you have a say in how the team plays. The style moves the team's strength and how well you fit in it. One change a summer.")}
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
                      {t(FIT[fitLabel(f)])}
                    </span>
                    <span className="style-fx">
                      {e.regular >= 0 ? "+" : ""}
                      {e.regular} / {t('playoffs')} {e.playoff >= 0 ? "+" : ""}
                      {e.playoff}
                    </span>
                  </>
                )}
              </span>
              <small>
                {TEAM_STYLES[k].text} {t('Fits {who}.', { who: TEAM_STYLES[k].fits })}
              </small>
            </button>
          ))}
      </div>
    </section>
  );
}

/** Round 32: the farewell tour, said once: the next season is his last. */
function FarewellCard() {
  const farewell = useStore((s) => s.farewell);
  const [armed, setArmed] = useState(false);
  return (
    <section className="card stack">
      <div className="sec-title">{t('Farewell tour')}</div>
      <p className="small muted">
        {t('Tell the world next season is your last. Every arena gets to say goodbye: a lift for your mood and your name now, the team rallying for one last playoff run, a gift from road arenas and a place in your legacy. When it ends, you retire.')}
      </p>
      <button className={`btn ${armed ? "danger" : ""}`} onClick={() => (armed ? (sfx("respect"), farewell()) : setArmed(true))} onBlur={() => setArmed(false)}>
        {armed ? t("Tap again: next season is my last") : t("Announce the farewell tour")}
      </button>
    </section>
  );
}

function RetireCard({ g }: { g: GameState }) {
  const retire = useStore((s) => s.retire);
  const [armed, setArmed] = useState(false);
  return (
    <section className="card stack">
      <div className="sec-title">{t('Your call')}</div>
      <p className="small muted">
        {g.history.filter((h) => h.level === "NBA").length === 1
          ? t('You can hang it up between any two seasons. At {age}, with 1 NBA season behind you.', { age: g.player.age })
          : t('You can hang it up between any two seasons. At {age}, with {n} NBA seasons behind you.', { age: g.player.age, n: g.history.filter((h) => h.level === "NBA").length })}
      </p>
      {armed ? (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn danger" onClick={retire}>
            {t('Yes, retire now')}
          </button>
          <button className="btn ghost" onClick={() => setArmed(false)}>
            {t('Keep playing')}
          </button>
        </div>
      ) : (
        <button className="btn ghost" onClick={() => setArmed(true)}>
          {t('Retire')}
        </button>
      )}
    </section>
  );
}

export function Home({ g }: { g: GameState }) {
  const advance = useStore((s) => s.advance);
  const pr = prompt(g);
  const last = g.lastSummary;
  const lean = leanLevel(g);
  return (
    <div className="home-grid">
      <div className="stack">
        <div className="o-todo">
          <Todo g={g} />
        </div>
        <PlayerCard g={g} />
        <FoldBox id="coach" title={t('Head coach')} icon="whistle">
          <CoachCard g={g} />
        </FoldBox>
        <Extra>
          <FoldBox id="scout" title={t('Scouting report')} icon="scouts">
            <ScoutCard g={g} compact />
          </FoldBox>
          {!lean && (
            <Card title={t('Milestones')} fold="Milestones">
              <MilestoneStrip reached={g.milestones} />
            </Card>
          )}
        </Extra>
      </div>
      <div className="stack home-center">
        <section className="card stack o-main">
          <SeasonHeader g={g} />
          <UndoBar g={g} />
          <RecordWatch g={g} />
          {isFarewellSeason(g) && (
            <div className="farewell-bar with-icon">
              <Icon name="gift" size={22} />
              <span>
                <b>{t('Farewell tour.')}</b> {t('Your last season: every arena is saying goodbye, and the team wants one more run for you.')}
              </span>
            </div>
          )}
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
          <Card title={t('Last season')} fold="Last season">
            <div className="small prose">
              {seasonLabel(last.year)} · {last.teamName}: {last.w}–{last.l},{" "}
              {last.result}. {perGame(last.line, "pts").toFixed(1)} PPG.
            </div>
          </Card>
        )}
      </div>
      <div className="stack home-side">
        {/* round 35: a career with friends keeps its board in sight */}
        {(g.mp?.challenge || g.mp?.klass) && <MpBoard g={g} />}
        <FoldBox id="modes" title={t('How you play')} icon="dial">
          <ModesCard g={g} />
        </FoldBox>
        {/* round 36 (owner: "merge 12"): the MVP race, the duo, the rivalry, the league and the talk in one card */}
        <Extra>
          <FoldBox id="around" title={t('Around you')} icon="globe">
            <AroundCard g={g} />
          </FoldBox>
        </Extra>
      </div>
    </div>
  );
}
