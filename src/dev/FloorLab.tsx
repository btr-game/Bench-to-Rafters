// The Floor lab (round 39): the playable court, a card in the dev deck before the Floor goes into
// careers. Pick his team and the other one, the difficulty, how good he is and how it starts, then
// play the last six minutes of an elimination game.

import { useMemo, useState } from 'react';
import { NBA_TEAMS } from '../content/teams';
import { TEAM_STYLE } from '../content/teamStyle';
import { FIRST_NAMES, LAST_NAMES } from '../content/names';
import type { Mode } from '../engine/balance';
import type { Pos } from '../engine/types';
import type { FloorPlayerIn, FloorRatings, FloorSetup } from '../engine/floor/sim';
import { FloorScreen, type FloorTeamLook } from '../ui/floor/FloorScreen';

const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SF', 'C'];
/** How each position leans from the team's level. */
const LEAN: Record<Pos, Partial<FloorRatings>> = {
  PG: { SHT: 3, PLY: 9, PER: 3, INT: -10, REB: -12, ATH: 2, IQ: 3, FIN: -2 },
  SG: { SHT: 6, PLY: 2, PER: 2, INT: -8, REB: -8, ATH: 2 },
  SF: { SHT: 1, PLY: -2, PER: 2, INT: -2, REB: -2, ATH: 3, FIN: 2 },
  PF: { SHT: -5, PLY: -6, PER: -4, INT: 6, REB: 8, FIN: 4 },
  C: { SHT: -12, PLY: -10, PER: -8, INT: 10, REB: 12, FIN: 6, ATH: -2 },
};
const KEYS: (keyof FloorRatings)[] = ['SHT', 'FIN', 'PLY', 'PER', 'INT', 'REB', 'ATH', 'IQ', 'FT'];

function ratings(level: number, pos: Pos, wobble: number): FloorRatings {
  const r = {} as FloorRatings;
  for (const k of KEYS) r[k] = Math.max(25, Math.min(99, Math.round(level + (LEAN[pos][k === 'FT' ? 'SHT' : k] ?? 0) + wobble)));
  return r;
}

function roster(tag: string, level: number, seed: number, user?: { name: string; level: number }): FloorPlayerIn[] {
  let h = seed;
  const rnd = () => ((h = (Math.imul(h, 1103515245) + 12345) >>> 0) / 2 ** 32);
  return POS.map((pos, i) => {
    const me = user && i === 1;
    const lvl = me ? user.level : level - (i >= 5 ? 6 : 0);
    return {
      id: `${tag}${i}`,
      name: me ? user.name : `${FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rnd() * LAST_NAMES.length)]}`,
      pos,
      number: me ? 23 : [3, 11, 7, 32, 50, 1, 21, 44][i],
      user: !!me,
      r: ratings(lvl, pos, me ? 0 : Math.round((rnd() - 0.5) * 8)),
    };
  });
}

const MODES: [Mode, string][] = [
  ['standard', 'Regular guy'],
  ['reality', 'Reality hits hard'],
  ['stars', 'Shoot for the stars'],
];
const STARTS = [
  { id: 'tied', label: 'Tied, six minutes left', score: [90, 90] as [number, number], clock: undefined },
  { id: 'down', label: 'Down 8, six minutes left', score: [84, 92] as [number, number], clock: undefined },
  { id: 'up', label: 'Up 6, six minutes left', score: [96, 90] as [number, number], clock: undefined },
  { id: 'late', label: 'Last two minutes, down 3', score: [101, 104] as [number, number], clock: 120 },
];

export function FloorLab() {
  const [us, setUs] = useState('MIN');
  const [them, setThem] = useState('BOS');
  const [mode, setMode] = useState<Mode>('standard');
  const [level, setLevel] = useState(82);
  const [teams, setTeams] = useState(76);
  const [start, setStart] = useState('tied');
  // 0 while picking; a game's seed once it tips off
  const [seed, setSeed] = useState(0);
  const tipOff = () => setSeed(1 + Math.floor(Math.random() * 1e9));

  const usT = NBA_TEAMS.find((t) => t.abbr === us)!;
  const themT = NBA_TEAMS.find((t) => t.abbr === them)!;
  const st = STARTS.find((x) => x.id === start)!;
  const setup = useMemo<FloorSetup>(
    () => ({
      seed,
      mode,
      us: { name: `${usT.city} ${usT.nick}`, short: usT.abbr, color: usT.color, players: roster('U', teams, seed + 3, { name: 'Jordan Vale', level }) },
      them: { name: `${themT.city} ${themT.nick}`, short: themT.abbr, color: themT.color, players: roster('T', teams, seed + 11) },
      score: st.score,
      clock: st.clock,
    }),
    [seed, mode, usT, themT, teams, level, st],
  );
  const arena = useMemo(() => ({ c1: TEAM_STYLE[us].c1, c2: TEAM_STYLE[us].c2, c3: TEAM_STYLE[us].c3 }), [us]);
  const looks = useMemo<[FloorTeamLook, FloorTeamLook]>(() => [{ kit: TEAM_STYLE[us].home, which: 'home' }, { kit: TEAM_STYLE[them].road, which: 'road' }], [us, them]);

  if (seed > 0)
    return (
      <main className="cl fl">
        <FloorScreen key={seed} setup={setup} arena={arena} looks={looks} series="3–3" onAgain={tipOff} onDone={() => setSeed(0)} />
      </main>
    );

  const chips = <T,>(list: [T, string][], value: T, set: (v: T) => void) => (
    <div className="cl-chips">
      {list.map(([v, l]) => (
        <button key={String(v)} className={`chip${v === value ? ' on' : ''}`} onClick={() => set(v)}>
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <main className="cl fl">
      <header>
        <div className="kicker on-dark">Bench to Rafters · dev deck</div>
        <h1>The Floor</h1>
        <p className="on-dark">
          Round 39: the last six minutes of a game that could end his team’s series, at one and a half times the clock (four real minutes), on the high three-quarter view, in his own team’s arena. You play
          number 23 (the ring under his feet). Move with WASD or the arrows; J holds and releases the shot (or steals on defence), K passes (or jumps), L makes a move
          (or switches), Space calls a pick (or help), Esc pauses.
        </p>
      </header>
      <section className="cl-panel">
        <h2>Teams</h2>
        <div className="cl-grid">
          <label>
            His team (the arena is theirs)
            <select value={us} onChange={(e) => setUs(e.target.value)}>
              {NBA_TEAMS.map((t) => (
                <option key={t.abbr} value={t.abbr}>
                  {t.city} {t.nick}
                </option>
              ))}
            </select>
          </label>
          <label>
            The other team
            <select value={them} onChange={(e) => setThem(e.target.value)}>
              {NBA_TEAMS.filter((t) => t.abbr !== us).map((t) => (
                <option key={t.abbr} value={t.abbr}>
                  {t.city} {t.nick}
                </option>
              ))}
            </select>
          </label>
        </div>
        <h2>Difficulty</h2>
        {chips(MODES, mode, setMode)}
        <h2>How good he is</h2>
        {chips<number>([[60, 'A 60'], [70, 'A 70'], [82, 'An 82'], [92, 'A 92']], level, setLevel)}
        <h2>The two teams</h2>
        {chips<number>([[70, 'Average (70)'], [76, 'Good (76)'], [82, 'Great (82)']], teams, setTeams)}
        <h2>The start</h2>
        {chips(STARTS.map((x) => [x.id, x.label] as [string, string]), start, setStart)}
        <div className="cl-row">
          <button className="btn primary" onClick={tipOff}>
            Tip it off
          </button>
        </div>
      </section>
    </main>
  );
}
