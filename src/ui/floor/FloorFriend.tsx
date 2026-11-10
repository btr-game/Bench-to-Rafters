// The Floor against a friend (round 39, owner: "can you make the game multiplayer as well?"; picks:
// online by room code, head to head). Each picks a franchise and the legend he steers (round 42);
// one makes a room and reads its code to the other, who types it in; the host tips off. Both
// fives play at the same overall, the AI plays the other eight, the host's arena. Then the same
// room plays again: the host's Play it again on the final page is the rematch. Round 42 (owner's
// pick): a quick match needs no code. Whoever is looking waits in one lobby, and the first two
// there are given a room of their own.

import { useEffect, useRef, useState } from 'react';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE } from '../../content/teamStyle';
import type { Pos } from '../../engine/types';
import { franchise, legendSetup } from '../../engine/floor/game';
import { legendFive } from '../../engine/floor/legends';
import type { FloorSetup } from '../../engine/floor/sim';
import { username } from '../names';
import { recordFloorFriend } from '../achievements';
import { achievementsNow } from '../../store';
import { SITE } from '../multiplayer';
import { t } from '../../i18n';
import { FloorScreen, type FloorTeamLook } from './FloorScreen';
import { LOBBY, NetGame, ME, ROOM_RE, canPlayOnline, cleanRoom, openWire, roomCode, type FloorMsg, type Wire } from './net';

const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
/** Both fives play at this overall, whoever they are. */
const LEVEL = 90;
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

const teamOf = (abbr: string) => NBA_TEAMS.find((x) => x.abbr === abbr) ?? NBA_TEAMS[0];
const nameOf = (abbr: string) => `${teamOf(abbr).city} ${teamOf(abbr).nick}`;

/** The game the host tips off: his team at home, the friend's on the road. */
function makeSetup(host: Me, guest: Me, seed: number): FloorSetup {
  const s = legendSetup({ seed, us: franchise(host.team, LEVEL), them: franchise(guest.team, LEVEL), user: POS.indexOf(host.pos), length: 'fourth' });
  s.them.players[POS.indexOf(guest.pos)].user = true;
  // level at the start: neither side is handed a lead
  s.score = [s.score[1], s.score[1]];
  return s;
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
  const peerName = useRef<string | null>(null);
  // round 42, a quick match: the lobby's line while looking, and that this room came from it
  const lobby = useRef<Wire | null>(null);
  const [seeking, setSeeking] = useState(false);
  const quick = useRef(false);
  meRef.current = me;

  // leaving the page: tell the room, and close the line
  useEffect(
    () => () => {
      wire.current?.send({ k: 'bye', id: ME });
      wire.current?.close();
      lobby.current?.close();
    },
    [],
  );

  // a quick match tips off by itself once the other player is in the room
  useEffect(() => {
    if (phase === 'host' && peer && quick.current && !game && !last) tipOff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, peer]);

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
      peerName.current = m.name;
      setPeer((p) => (p && p.id === m.id && p.team === m.team && p.name === m.name && p.pos === pos ? p : { id: m.id, name: m.name, team: m.team, pos }));
      setNote('');
    } else if (m.k === 'bye') {
      if (peerAt.current?.id === m.id) peerAt.current = null;
      setPeer((p) => (p && p.id === m.id ? null : p));
      setNote(t('Your friend left the room.'));
    } else if (m.k === 'start' && !host.current && m.to === ME && wire.current) {
      setGame({ link: new NetGame(wire.current, 1, m.game, m.setup), setup: m.setup, friend: peerName.current ?? t('Your friend') });
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
    if (!peer || !wire.current) return;
    const n = ++games.current;
    const setup = makeSetup(me, peer, 1 + Math.floor(Math.random() * 1e9));
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
    const again = () => {
      game.link.close();
      tipOff();
    };
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
          onAgain={host.current && peer ? again : undefined}
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

  // a quick match (round 42): wait in the lobby; of two who meet there, the one with the lower id
  // makes a room and tells the other, and both go to it
  const stopSeek = () => {
    lobby.current?.close();
    lobby.current = null;
    setSeeking(false);
  };
  const seek = async () => {
    remember(me);
    setNote('');
    setSeeking(true);
    const w = await openWire(LOBBY);
    if (!w) {
      setSeeking(false);
      setNote(t('The room could not be opened. Check the connection and try again.'));
      return;
    }
    lobby.current = w;
    let done = false;
    const go = (c: string, asHost: boolean) => {
      if (done) return;
      done = true;
      clearInterval(beat);
      // the lobby's line stays open a moment longer, so the room's code is sure to have gone out
      lobby.current = null;
      setSeeking(false);
      window.setTimeout(() => w.close(), 2500);
      quick.current = true;
      void open(c, asHost);
    };
    w.listen((m) => {
      if (m.id === ME) return;
      if (m.k === 'seek' && ME < m.id) {
        const c = roomCode();
        w.send({ k: 'pair', id: ME, to: m.id, code: c });
        window.setTimeout(() => w.send({ k: 'pair', id: ME, to: m.id, code: c }), 700);
        go(c, true);
      } else if (m.k === 'pair' && m.to === ME && ROOM_RE.test(m.code)) go(m.code, false);
    });
    const beat = window.setInterval(() => (lobby.current === w ? w.send({ k: 'seek', id: ME }) : clearInterval(beat)), 1000);
    w.send({ k: 'seek', id: ME });
  };
  return (
    <section className="card stack floor-friend">
      <div>
        <div className="sec-title">{t('Play a friend online')}</div>
        <p className="prose small">{t('One of you makes a room and reads out its code; the other types it in, or take a quick match with whoever is waiting. You each steer one legend, head to head, and the AI plays the other eight. Both fives play at {n} overall.', { n: LEVEL })}</p>
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
        <div className="row" role="group" aria-label={t('Who you steer')} style={{ gap: 6, flexWrap: 'wrap' }}>
          {legendFive(me.team).map((l, i) => (
            <button key={l.name} className={`pick-chip${me.pos === POS[i] ? ' on' : ''}`} aria-pressed={me.pos === POS[i]} onClick={() => setMe({ ...me, pos: POS[i] })}>
              {POS[i]} · {l.name}
            </button>
          ))}
        </div>
      </div>
      {phase === 'pick' || phase === 'opening' ? (
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn primary" data-tour="floor-friend" disabled={phase === 'opening' || seeking} onClick={() => ((quick.current = false), void open(roomCode(), true))}>
            {t('Make a room')}
          </button>
          <button className="btn" disabled={phase === 'opening'} onClick={() => (seeking ? stopSeek() : void seek())}>
            {seeking ? t('Looking for a game… (stop)') : t('Quick match')}
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
              {t('{name} is here, with the {team}.', { name: peer.name, team: nameOf(peer.team) })}
            </p>
          ) : (
            <p className="prose muted">{phase === 'host' ? t('Waiting for your friend to type in the code…') : t('Looking for the room…')}</p>
          )}
          {last && <p className="small">{t('Last game: {line}', { line: last })}</p>}
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {phase === 'host' && (
              <button className="btn primary" disabled={!peer} onClick={tipOff}>
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
