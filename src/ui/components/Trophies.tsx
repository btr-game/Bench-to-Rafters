// The trophy cabinet with details (playtest round 7): tap a banner to see when and with which
// team it was won, what it is, and what it is worth to the legacy.

import { useState } from 'react';
import type { GameState } from '../../engine/types';
import { achievementDetail } from '../../engine/awards/details';
import { TIERS } from '../../engine/awards/tiers';
import { LEVELS } from '../../engine/balance';
import { seasonLabel } from '../format';
import { Banners, Card, type BannerItem } from './bits';
import { championships } from '../../engine/awards/legacy';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE } from '../../content/teamStyle';
import { BannerArt, TrophyIcon } from '../art/Trophy';
import { AwardArt } from '../art/Award';

/** Every honour once, with its count, the ones that matter most to the legacy first. */
export function trophyItems(g: GameState): BannerItem[] {
  const counts = new Map<string, { n: number; key: string; first: number }>();
  for (const a of g.awards) {
    const c = counts.get(a.label);
    if (c) c.n++;
    else counts.set(a.label, { n: 1, key: a.key, first: a.year });
  }
  const weight = (key: string) => TIERS.flatMap((t) => t.items).find((it) => it.key === key)?.pts ?? 0;
  return [...counts.entries()]
    .sort((a, b) => weight(b[1].key) - weight(a[1].key) || a[1].first - b[1].first)
    .map(([label, c]) => {
      return { label, count: c.n, gold: weight(c.key) >= 4 || /Champion|MVP|Player of the Year|champion/.test(label), icon: <AwardArt akey={c.key} label={label} color={g.history[g.history.length - 1]?.teamColor} size={34} /> };
    });
}

function Detail({ g, label, onClose }: { g: GameState; label: string; onClose: () => void }) {
  const d = achievementDetail(g, label);
  if (!d) return null;
  // the same team in a row reads better as one line, and back-to-back seasons as a range:
  // "Cleveland Cavaliers: 2034–35 to 2043–44 (10)"
  const byTeam: { team: string; color: string; runs: { from: number; to: number; level: string }[] }[] = [];
  for (const w of d.wins) {
    const last = byTeam[byTeam.length - 1];
    if (last && last.team === w.teamName) {
      const run = last.runs[last.runs.length - 1];
      if (run.to === w.year - 1 && run.level === w.level) run.to = w.year;
      else last.runs.push({ from: w.year, to: w.year, level: w.level });
    } else byTeam.push({ team: w.teamName, color: w.teamColor, runs: [{ from: w.year, to: w.year, level: w.level }] });
  }
  const runText = (r: { from: number; to: number; level: string }) =>
    `${r.from === r.to ? seasonLabel(r.from) : `${seasonLabel(r.from)} to ${seasonLabel(r.to)} (${r.to - r.from + 1})`}${r.level !== 'NBA' ? ` · ${LEVELS[r.level as keyof typeof LEVELS]?.short ?? r.level}` : ''}`;
  return (
    <div className="ach-detail" style={{ borderTopColor: d.color }} role="region" aria-label={`${d.label} details`}>
      <div className="row">
        <div>
          <div className="kicker">{d.category}</div>
          <div className="ach-title">
            {d.wins.length > 1 ? `${d.wins.length}× ` : ''}
            {d.label}
          </div>
        </div>
        <div className="spacer" />
        {d.tier && (
          <span className="ach-tier" style={{ background: d.tierColor }} title={d.tierName}>
            {d.tier}
          </span>
        )}
      </div>
      <p className="ach-desc">{d.desc}.</p>
      <ul className="ach-wins">
        {byTeam.map((t, i) => (
          <li key={i}>
            <i style={{ background: t.color }} aria-hidden="true" />
            <b>{t.team}</b>
            <span className="muted">{t.runs.map(runText).join(', ')}</span>
          </li>
        ))}
      </ul>
      <p className="ach-legacy">
        <span className="kicker">What it means for your legacy</span>
        <br />
        {d.legacyLine}
      </p>
      {d.tier && d.share > 0 && (
        <div className="ach-bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, d.share * 100)}%`, background: d.tierColor }} />
        </div>
      )}
      <button className="btn ghost small-btn" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

export function TrophyCabinet({ g, title = 'Trophy cabinet' }: { g: GameState; title?: string }) {
  const [sel, setSel] = useState<string | null>(null);
  const items = trophyItems(g);
  return (
    <Card title={title} kicker={items.length ? 'Tap a banner for details' : undefined} tour="trophies">
      {items.length === 0 ? <p className="muted">Empty, for now.</p> : <Banners items={items} selected={sel} onSelect={(l) => setSel(sel === l ? null : l)} />}
      {sel && <Detail g={g} label={sel} onClose={() => setSel(null)} />}
    </Card>
  );
}

/** A club's second colour for a banner's lettering (white for clubs without a style). */
const trimOf = (teamName: string) => {
  const t = NBA_TEAMS.find((x) => teamName.includes(x.nick));
  const st = t && TEAM_STYLE[t.abbr];
  return st && !['#000000', '#FFFFFF'].includes(st.c2.toUpperCase()) ? st.c2 : '#FFFFFF';
};
const BANNER_LEVEL: Record<string, string> = { NBA: 'NBA', NCAA: 'NCAA', EU: 'EURO', INT: 'INTL', GL: 'G LEAGUE', HSV: 'STATE', HSJV: 'JV' };

/** Round 17: every title hangs as a banner; every NBA title also gets a ring. */
export function BannersAndRings({ g, compact = false }: { g: GameState; compact?: boolean }) {
  const titles = championships(g);
  if (titles.length === 0) return null;
  const rings = titles.filter((t) => t.nba);
  return (
    <div className="hang">
      <div className="hang-row">
        {titles.map((t, i) => (
          <div key={i} className="hang-banner" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
            <BannerArt kind="title" color={t.teamColor} trim={trimOf(t.teamName)} lines={t.nba ? ['NBA', 'WORLD', 'CHAMPS', String(t.year + 1)] : [BANNER_LEVEL[t.level] ?? 'TITLE', 'CHAMPS', String(t.year + 1)]} size={compact ? 92 : 120} />
          </div>
        ))}
      </div>
      {rings.length > 0 && (
        <div className="rings" aria-label={`${rings.length} championship ring${rings.length > 1 ? 's' : ''}`}>
          {rings.map((t, i) => (
            <span key={i} title={`${seasonLabel(t.year)} ${t.teamName}`}>
              <TrophyIcon icon="ring" color={t.teamColor} size={compact ? 32 : 40} />
            </span>
          ))}
          <b>
            {rings.length} ring{rings.length > 1 ? 's' : ''}
          </b>
        </div>
      )}
    </div>
  );
}
