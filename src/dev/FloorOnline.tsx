// The Floor against a friend, in the dev deck (round 39): the room between two tabs of this browser
// (nothing goes online here). Open this card in two tabs, make a room in one and join it in the other.

import { FloorFriend } from '../ui/floor/FloorFriend';

export function FloorOnline() {
  return (
    <main className="cl fl">
      <header>
        <div className="kicker on-dark">Bench to Rafters · dev deck</div>
        <h1>The Floor: a friend online</h1>
        <p className="on-dark">
          Round 39: head to head, one human on each team, the AI on the other eight. In the dev deck the room is a channel between two tabs of this browser: open this card in a
          second tab, make a room here and type its code there. On the website the same room goes through the game’s realtime service.
        </p>
      </header>
      <FloorFriend />
    </main>
  );
}
