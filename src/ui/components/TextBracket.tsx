// A bracket drawn with text only (round 9): one column per round, each matchup centred between
// the two it came from, so any level's postseason reads as a tree. Works for series (wins) and
// single games (the score). Big fields start at the last 16.

import type { Bracket, League, SeriesResult } from '../../engine/types';

/** Rounds in tree order: each pair of matchups feeds the one next to it in the next round. */
function treeOrder(b: Bracket, from: number): SeriesResult[][] {
  const rounds = b.rounds.slice(from).map((r) => r.series);
  const out: SeriesResult[][] = rounds.map(() => []);
  const last = rounds.length - 1;
  if (last < 0) return out;
  out[last] = [...rounds[last]];
  for (let r = last - 1; r >= 0; r--) {
    const used = new Set<SeriesResult>();
    for (const parent of out[r + 1]) {
      for (const id of [parent.a, parent.b]) {
        const s = rounds[r].find((x) => !used.has(x) && x.winner === id);
        if (s) {
          used.add(s);
          out[r].push(s);
        }
      }
    }
    // anything the tree could not place goes at the end
    out[r].push(...rounds[r].filter((x) => !used.has(x)));
  }
  return out;
}

export function TextBracket({ b, league, userTeamId }: { b: Bracket; league: League; userTeamId: string | null }) {
  const from = Math.max(0, b.rounds.findIndex((r) => r.series.length <= 8));
  const cols = treeOrder(b, from);
  const names = b.rounds.slice(from).map((r) => r.name);
  const short = (id: string) => league.teams.find((t) => t.id === id)?.short ?? id;
  const seed = (id: string) => b.seeds?.[id];
  const champ = short(b.champion);
  return (
    <div className="tb-scroll">
      <div className="tb" style={{ gridTemplateColumns: `repeat(${cols.length + 1}, minmax(118px, 1fr))` }}>
        {cols.map((col, ci) => (
          <div className="tb-col" key={ci}>
            <div className="tb-head">{names[ci]}</div>
            <div className="tb-games">
              {col.map((x, i) => {
                const one = (x.games?.length ?? 0) === 1;
                const sc = (side: 'a' | 'b') => (one ? x.games![0][side === 'a' ? 0 : 1] : side === 'a' ? x.wa : x.wb);
                return (
                  <div key={i} className={`tb-match${x.a === userTeamId || x.b === userTeamId ? ' me' : ''}`}>
                    {(['a', 'b'] as const).map((side) => {
                      const id = x[side];
                      return (
                        <div key={side} className={`tb-team${x.winner === id ? ' won' : ''}${id === userTeamId ? ' mine' : ''}`}>
                          <span className="tb-seed">{seed(id) ?? ''}</span>
                          <span className="tb-name">{short(id)}</span>
                          <span className="tb-score">{sc(side)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="tb-col">
          <div className="tb-head">Champion</div>
          <div className="tb-games">
            <div className={`tb-champ${b.champion === userTeamId ? ' mine' : ''}`}>{champ}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
