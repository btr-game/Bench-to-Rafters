// Which games the Floor plays (round 39, owner: "only the biggest moments (like last quarter of
// finals or elimination games"; then, on the ideas document: games that can end a series, "let's go
// from conference finals only. just your own team"): the NBA's conference finals and Finals, the
// games where one more loss sends his team home.

/** The NBA's conference finals and the Finals. */
export const floorRound = (round: string): boolean => /^Conference finals$/i.test(round) || /^NBA Finals$/i.test(round);

/** Whether this game of a series is his team's elimination game (`losses` his team's so far). */
export function floorDue(round: string, losses: number, bestOf: number): boolean {
  return floorRound(round) && bestOf > 1 && losses === Math.ceil(bestOf / 2) - 1;
}
