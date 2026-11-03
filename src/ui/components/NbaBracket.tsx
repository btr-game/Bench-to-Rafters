// The NBA playoff bracket drawn like the league's own graphic (playtest round 7): the West on
// the left, the East on the right, each side narrowing round by round toward the Finals in
// the centre, with seeds, team colours, series wins and a champions banner.

import type { Bracket, League, SeriesResult } from '../../engine/types';
import { TeamArt } from '../art/Crest';
import { badge } from '../art/color';
import { t } from '../../i18n';

interface Props {
  bracket: Bracket;
  league: League;
  userTeamId: string | null;
}

function Side({ x, id, wins, seed, league, me }: { x: SeriesResult; id: string; wins: number; seed?: number; league: League; me: boolean }) {
  const t = league.teams.find((tm) => tm.id === id);
  const won = x.winner === id;
  return (
    <div className={`nb-team${won ? ' won' : ' lost'}${me ? ' me' : ''}`} title={t?.name}>
      <span className="nb-seed">{seed ?? ''}</span>
      {t && <TeamArt name={t.name} abbr={t.abbr} color={t.color} league="NBA" size={20} />}
      <span className="nb-mark" style={badge(t?.color ?? '#555555')}>
        {t?.abbr ?? id.slice(0, 3)}
      </span>
      <b className="nb-wins">{wins}</b>
    </div>
  );
}

function Matchup({ x, p, span, start }: { x: SeriesResult; p: Props; span: number; start: number }) {
  const seeds = p.bracket.seeds ?? {};
  return (
    <div className="nb-match" style={{ gridRow: `${start} / span ${span}` }}>
      <div className="nb-box">
        <Side x={x} id={x.a} wins={x.wa} seed={seeds[x.a]} league={p.league} me={x.a === p.userTeamId} />
        <Side x={x} id={x.b} wins={x.wb} seed={seeds[x.b]} league={p.league} me={x.b === p.userTeamId} />
      </div>
    </div>
  );
}

function Column({ series, p, side, round }: { series: SeriesResult[]; p: Props; side: 'west' | 'east'; round: number }) {
  // rounds 1-3 hold 4, 2 and 1 matchups per side, each spanning 8 / n of the 8 grid rows
  const span = 8 / series.length;
  return (
    <div className={`nb-col nb-${side} nb-r${round}`}>
      {series.map((x, i) => (
        <Matchup key={`${x.a}-${x.b}`} x={x} p={p} span={span} start={i * span + 1} />
      ))}
    </div>
  );
}

export function NbaBracket(p: Props) {
  const r = p.bracket.rounds;
  if (r.length < 4) return null;
  // each round lists the East series first, then the West
  const half = (k: number, side: 'east' | 'west') => {
    const s = r[k].series;
    const n = s.length / 2;
    return side === 'east' ? s.slice(0, n) : s.slice(n);
  };
  const fin = r[3].series[0];
  const champ = p.league.teams.find((x) => x.id === p.bracket.champion);
  const loserId = fin.winner === fin.a ? fin.b : fin.a;
  const champW = fin.winner === fin.a ? fin.wa : fin.wb;
  const loserW = fin.winner === fin.a ? fin.wb : fin.wa;
  const loser = p.league.teams.find((x) => x.id === loserId);
  const fmvp = p.bracket.mvps?.find((m) => m.award === 'Finals MVP');
  return (
    <div className="nb-scroll">
      <div className="nb">
        <div className="nb-head nb-west-h">Western Conference</div>
        <div className="nb-head nb-east-h">Eastern Conference</div>
        <Column series={half(0, 'west')} p={p} side="west" round={1} />
        <Column series={half(1, 'west')} p={p} side="west" round={2} />
        <Column series={half(2, 'west')} p={p} side="west" round={3} />
        <div className="nb-final">
          <div className="kicker">NBA Finals</div>
          <div className="nb-final-score">
            <span className="nb-mark big" style={badge(champ?.color ?? '#555555')}>
              {champ?.abbr}
            </span>
            <b>
              {champW}–{loserW}
            </b>
            <span className="nb-mark big dim" style={badge(loser?.color ?? '#555555')}>
              {loser?.abbr}
            </span>
          </div>
          <div className="nb-champ" style={badge(champ?.color ?? '#555555')}>
            {champ && <TeamArt name={champ.name} abbr={champ.abbr} color={champ.color} league="NBA" size={40} />}
            <small>{t('Champions')}</small>
            <b>{champ?.name ?? p.bracket.champion}</b>
          </div>
          {fmvp && (
            <div className="small">
              Finals MVP: <b>{fmvp.name}</b>
            </div>
          )}
        </div>
        <Column series={half(2, 'east')} p={p} side="east" round={3} />
        <Column series={half(1, 'east')} p={p} side="east" round={2} />
        <Column series={half(0, 'east')} p={p} side="east" round={1} />
        <div className="nb-rounds">
          {[t('First round'), t('Conf. semis'), t('Conf. finals'), t('Finals'), t('Conf. finals'), t('Conf. semis'), t('First round')].map((x, i) => (
            <span key={i}>{x}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
