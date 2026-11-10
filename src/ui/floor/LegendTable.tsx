// A table of legends with their real career numbers and what the Floor makes of them (round 42,
// owner: "can i look at each legend's stats?"): on the Floor's page for the five picked, and in
// the dev deck for all 150.

import type { LegendSpot } from '../../content/franchiseFives';
import { legendLine, legendRatings, legendStyle } from '../../engine/floor/legends';
import { t } from '../../i18n';

const n1 = (v: number | null) => (v === null ? '–' : v.toFixed(1));

export function LegendTable({ rows, wide = false }: { rows: { team: string; spot: LegendSpot }[]; wide?: boolean }) {
  return (
    <div className="lg-scroll">
      <table className="lg-table">
        <thead>
          <tr>
            <th>{t('Player')}</th>
            {['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', '3P%', '3PA', 'FT%'].map((h) => (
              <th key={h}>{h}</th>
            ))}
            <th className="lg-gap">OVR</th>
            {['SHT', 'FIN', 'PLY', 'PER', 'INT', 'REB', 'ATH', 'IQ', 'FT'].map((h, i) => (
              <th key={i}>{h}</th>
            ))}
            {wide && ['Shots', 'Threes', 'Drive', 'Post', 'Pass'].map((h) => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ team, spot }) => {
            const row = legendLine(spot.name);
            const r = legendRatings(spot);
            const st = legendStyle(spot);
            return (
              <tr key={spot.name}>
                <th>
                  {spot.name} <span>{team} · {spot.pos} · {spot.peak}</span>
                </th>
                {row ? [row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8]].map((v, i) => <td key={i}>{n1(v)}</td>) : <td colSpan={9}>–</td>}
                <td className="lg-gap">
                  <b>{spot.ovr}</b>
                </td>
                {[r.SHT, r.FIN, r.PLY, r.PER, r.INT, r.REB, r.ATH, r.IQ, r.FT].map((v, i) => (
                  <td key={i}>{Math.round(v)}</td>
                ))}
                {wide && [st.use, st.three, st.drive, st.post, st.pass].map((v, i) => <td key={i}>x{v.toFixed(2)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
