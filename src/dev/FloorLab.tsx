// The Floor lab (round 39): the playable court, a card in the dev deck before the Floor goes into
// careers. Pick his team and the other one, the difficulty, how good he is and how it starts, then
// play the last six minutes of an elimination game.

import { useMemo, useState } from 'react';
import { NBA_TEAMS } from '../content/teams';
import { TEAM_STYLE } from '../content/teamStyle';
import type { Mode } from '../engine/balance';
import type { FloorSetup } from '../engine/floor/sim';
import { leanRatings } from '../engine/floor/career';
import { floorRoster } from '../engine/floor/mini';
import { FloorScreen, type FloorTeamLook } from '../ui/floor/FloorScreen';

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
      us: { name: `${usT.city} ${usT.nick}`, short: usT.abbr, color: usT.color, players: floorRoster('U', teams, seed + 3, { slot: 1, name: 'Jordan Vale', number: 23, r: leanRatings(level, 'SG') }) },
      them: { name: `${themT.city} ${themT.nick}`, short: themT.abbr, color: themT.color, players: floorRoster('T', teams, seed + 11) },
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
          number 23 (the ring under his feet). Move with WASD or the arrows; J holds and releases the shot, one tap at the rim lays it in or dunks (or steals on defence), K
          passes (or jumps), L makes a move (or switches), Space calls a pick (or help), Esc pauses. A close game's last minute runs at real speed.
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
