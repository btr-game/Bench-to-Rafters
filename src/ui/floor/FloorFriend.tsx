// The Floor against a friend (round 39, owner: "can you make the game multiplayer as well?"; picks:
// online by room code, head to head). Each picks an NBA team and the position he plays; one makes a
// room and reads its code to the other, who types it in; the host tips off. The two teams are as good
// as each other, the AI plays the other eight, the host's arena. Then the same room plays again.

import { useEffect, useRef, useState } from 'react';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE } from '../../content/teamStyle';
import type { Pos } from '../../engine/types';
import { FLOOR } from '../../engine/balance';
import { floorRoster } from '../../engine/floor/mini';
import type { FloorPlayerIn, FloorSetup } from '../../engine/floor/sim';
import { username } from '../names';
import { recordFloorFriend } from '../achievements';
import { achievementsNow } from '../../store';
import { SITE } from '../multiplayer';
import { t } from '../../i18n';
import { FloorScreen, type FloorTeamLook } from './FloorScreen';
import { NetGame, ME, ROOM_RE, canPlayOnline, cleanRoom, openWire, roomCode, type FloorMsg, type Wire } from './net';

const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
/** Both teams as good as each other (the mini-game's "Good" teams). */
const LEVEL = 76;
const PICK = 'btr-floor-friend';

interface Me {
  team: string;
  pos: Pos;
}
interface Peer extends Me {
  id: string;
  name: string;
}

function remembered(): Me {
  try {
    const v = JSON.parse(localStorage.getItem(PICK) ?? 'null') as Me | null;
    if (v && NBA_TEAMS.some((x) => x.abbr === v.team) && POS.includes(v.pos)) return v;
  } catch {
    // nothing kept
  }
  return { team: 'BOS', pos: 'SG' };
}
function remember(m: Me): void {
  try {
    localStorage.setItem(PICK, JSON.stringify(m));
  } catch {
    // storage blocked: picked again next time
  }
}

/** A team of eight at the room's level (the mini-game's builder), his player at his position, named after him. */
const roster = (tag: string, seed: number, me: { name: string; pos: Pos }): FloorPlayerIn[] => floorRoster(tag, LEVEL, seed, { slot: POS.indexOf(me.pos), name: me.name });

const teamOf = (abbr: string) => NBA_TEAMS.find((x) => x.abbr === abbr) ?? NBA_TEAMS[0];
const nameOf = (abbr: string) => `${teamOf(abbr).city} ${teamOf(abbr).nick}`;

/** The game the host tips off: his team at home, the friend's on the road. */
function makeSetup(host: { name: string } & Me, guest: { name: string } & Me, seed: number): FloorSetup {
  const a = teamOf(host.team);
  const b = teamOf(guest.team);
  const close = Math.floor((seed % 7) - 3);
  return {
    seed,
    mode: 'standard',
    us: { name: nameOf(a.abbr), short: a.abbr, color: a.color, players: roster('H', seed + 3, host) },
    them: { name: nameOf(b.abbr), short: b.abbr, color: b.color, players: roster('G', seed + 11, guest) },
    score: [84 + Math.max(0, close), 84 + Math.max(0, -close)],
    clock: FLOOR.quarter,
    rate: FLOOR.rate,
  };
}

type Phase = 'pick' | 'opening' | 'host' | 'guest' | 'play';

export function FloorFriend() {
  const [me, setMe] = useState<Me>(remembered);
  const [hosting, setHosting] = useState(false);
  // his name on the other screen: his username, else which seat he has
  const name = username() || (hosting ? t('Player 1') : t('Player 2'));
  const [phase, setPhase] = useState<Phase>('pick');
  const [code, setCode] = useState('');
  const [typed, setTyped] = useState('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [note, setNote] = useState('');
  const [game, setGame] = useState<{ link: NetGame; setup: FloorSetup; friend: string } | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const wire = useRef<Wire | null>(null);
  const host = useRef(false);
  const games = useRef(0);
  const meRef = useRef(me);
  // the friend in the room, and when he was last heard (a third screen with the code waits its turn)
  const peerAt = useRef<{ id: string; at: number } | null>(null);
  meRef.current = me;

  // leaving the page: tell the room, and close the line
  useEffect(
    () => () => {
      wire.current?.send({ k: 'bye', id: ME });
      wire.current?.close();
    },
    [],
  );

  // while in a room: say who is here every so often, so whoever comes later sees it
  useEffect(() => {
    if (phase !== 'host' && phase !== 'guest') return;
    const hi = () => wire.current?.send({ k: 'hi', id: ME, host: host.current, name, team: meRef.current.team, pos: meRef.current.pos });
    hi();
    const id = window.setInterval(hi, 1500);
    return () => clearInterval(id);
  }, [phase, name]);

  const hear = (m: FloorMsg) => {
    if (m.id === ME) return;
    if (m.k === 'hi' && m.host !== host.current) {
      const now = Date.now();
      if (peerAt.current && peerAt.current.id !== m.id && now - peerAt.current.at < 5000) return;
      peerAt.current = { id: m.id, at: now };
      const pos = POS.includes(m.pos as Pos) ? (m.pos as Pos) : 'SG';
      setPeer((p) => (p && p.id === m.id && p.team === m.team && p.name === m.name && p.pos === pos ? p : { id: m.id, name: m.name, team: m.team, pos }));
      setNote('');
    } else if (m.k === 'bye') {
      if (peerAt.current?.id === m.id) peerAt.current = null;
      setPeer((p) => (p && p.id === m.id ? null : p));
      setNote(t('Your friend left the room.'));
    } else if (m.k === 'start' && !host.current && m.to === ME && wire.current) {
      setGame({ link: new NetGame(wire.current, 1, m.game, m.setup), setup: m.setup, friend: nameFromSetup(m.setup, 0) });
      setPhase('play');
    }
  };

  const open = async (c: string, asHost: boolean) => {
    remember(me);
    setPhase('opening');
    setNote('');
    const w = await openWire(c);
    if (!w) {
      setPhase('pick');
      setNote(t('The room could not be opened. Check the connection and try again.'));
      return;
    }
    wire.current = w;
    host.current = asHost;
    setHosting(asHost);
    setCode(c);
    w.listen(hear);
    setPhase(asHost ? 'host' : 'guest');
  };

  const leaveRoom = () => {
    wire.current?.send({ k: 'bye', id: ME });
    wire.current?.close();
    wire.current = null;
    setPeer(null);
    setCode('');
    setGame(null);
    setPhase('pick');
  };

  const tipOff = () => {
    if (!peer || !wire.current || peer.team === me.team) return;
    const n = ++games.current;
    const setup = makeSetup({ name, ...me }, peer, 1 + Math.floor(Math.random() * 1e9));
    const link = new NetGame(wire.current, 0, n, setup);
    wire.current.send({ k: 'start', id: ME, to: peer.id, game: n, setup });
    setGame({ link, setup, friend: peer.name });
    setPhase('play');
  };

  if (phase === 'play' && game) {
    const us = TEAM_STYLE[game.setup.us.short];
    const them = TEAM_STYLE[game.setup.them.short];
    const looks: [FloorTeamLook, FloorTeamLook] = [
      { kit: us.home, which: 'home' },
      { kit: them.road, which: 'road' },
    ];
    const done = (summary: string | null) => {
      if (summary === null) game.link.quit();
      else game.link.close();
      setLast(summary);
      setGame(null);
      setPhase(host.current ? 'host' : 'guest');
    };
    return (
      <div className="floor-layer" role="dialog" aria-modal="true" aria-label={t('The Floor against {name}', { name: game.friend })}>
        <FloorScreen
          key={game.link.game}
          setup={game.setup}
          arena={{ c1: us.c1, c2: us.c2, c3: us.c3 }}
          looks={looks}
          onDone={(r) => {
            // a game played to its end counts in the book (one left early does not)
            if (recordFloorFriend(r.win, r.us - r.them, r.line.pts)) achievementsNow();
            done(t('{us} – {them}, {result}', { us: r.us, them: r.them, result: r.win ? t('you won') : t('you lost') }));
          }}
          net={{ link: game.link, friend: game.friend, onLeave: () => done(null) }}
        />
      </div>
    );
  }

  if (!canPlayOnline())
    return (
      <section className="card stack floor-friend">
        <div className="sec-title">{t('Play a friend online')}</div>
        <p className="prose">{t('Two players, one on each team, live: this copy of the game cannot go online. Play it on the website.')}</p>
        <p className="mono small">{SITE}</p>
      </section>
    );

  const same = !!peer && peer.team === me.team;
  return (
    <section className="card stack floor-friend">
      <div>
        <div className="sec-title">{t('Play a friend online')}</div>
        <p className="prose small">{t('One of you makes a room and reads out its code; the other types it in. You each play one player, head to head, and the AI plays the other eight. Both teams are equally good.')}</p>
      </div>
      <div className="row floor-friend-pick" style={{ gap: 12, flexWrap: 'wrap' }}>
        <label className="small">
          {t('Your team')}{' '}
          <select value={me.team} onChange={(e) => setMe({ ...me, team: e.target.value })}>
            {NBA_TEAMS.map((x) => (
              <option key={x.abbr} value={x.abbr}>
                {x.city} {x.nick}
              </option>
            ))}
          </select>
        </label>
        <div className="row" role="group" aria-label={t('You play')} style={{ gap: 6 }}>
          {POS.map((p) => (
            <button key={p} className={`pick-chip${me.pos === p ? ' on' : ''}`} aria-pressed={me.pos === p} onClick={() => setMe({ ...me, pos: p })}>
              {p}
            </button>
          ))}
        </div>
      </div>
      {phase === 'pick' || phase === 'opening' ? (
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn primary" data-tour="floor-friend" disabled={phase === 'opening'} onClick={() => void open(roomCode(), true)}>
            {t('Make a room')}
          </button>
          <div className="row mp-code-entry" style={{ gap: 8 }}>
            <input
              aria-label={t('Room code')}
              placeholder={t('Room code')}
              value={typed}
              onChange={(e) => setTyped(cleanRoom(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && ROOM_RE.test(typed) && void open(typed, false)}
            />
            <button className="btn" disabled={!ROOM_RE.test(typed) || phase === 'opening'} onClick={() => void open(typed, false)}>
              {t('Join')}
            </button>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="small muted">{t('Room code')}</span>
            <span className="mp-code" aria-label={t('Code {code}', { code: code.split('').join(' ') })}>
              {code}
            </span>
          </div>
          {peer ? (
            <p className="prose">
              {t('{name} is here, with the {team}.', { name: peer.name, team: nameOf(peer.team) })} {same && <b>{t('Pick different teams to tip off.')}</b>}
            </p>
          ) : (
            <p className="prose muted">{phase === 'host' ? t('Waiting for your friend to type in the code…') : t('Looking for the room…')}</p>
          )}
          {last && <p className="small">{t('Last game: {line}', { line: last })}</p>}
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {phase === 'host' && (
              <button className="btn primary" disabled={!peer || same} onClick={tipOff}>
                {last ? t('Play again') : t('Tip off')}
              </button>
            )}
            {phase === 'guest' && peer && <span className="small muted">{t('{name} tips off when ready.', { name: peer.name })}</span>}
            <button className="btn ghost" onClick={leaveRoom}>
              {t('Leave the room')}
            </button>
          </div>
        </div>
      )}
      {note && (
        <p className="small" role="status">
          {note}
        </p>
      )}
    </section>
  );
}

/** The name of the human on a team, from the setup (his player carries it). */
function nameFromSetup(s: FloorSetup, team: 0 | 1): string {
  return (team === 0 ? s.us : s.them).players.find((p) => p.user)?.name ?? t('Your friend');
}
