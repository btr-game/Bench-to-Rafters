// The Floor against a friend (round 39, owner: "can you make the game multiplayer as well?"; picks:
// online by room code, head to head). Each picks a franchise and the legend he steers (round 42);
// one makes a room and reads its code to the other, who types it in; the host tips off. Both
// fives play at the same overall, the AI plays the other eight, the host's arena. Then the same
// room plays again: the host's Play it again on the final page is the rematch. Round 42 (owner's
// pick): a quick match needs no code. Whoever is looking waits in one lobby, and the first two
// there are given a room of their own.
// After round 42 (owner: "superteam draft against a friend: nice. let's expand friend play in
// general"): the host picks what the room plays, each his franchise or a superteam draft from one pool
// of every legend (DraftBoard.tsx; the rules in engine/floor/friend.ts, the room's messages in
// room.ts), and a series, best of 1, 3 or 5, his Play it again going on with it. Each sets his game
// plan here and it goes to the host with his name, so the setup carries both. This browser keeps each
// friend's record against him.

import { useEffect, useRef, useState } from 'react';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE } from '../../content/teamStyle';
import type { Pos } from '../../engine/types';
import { franchise, legendSetup, type FloorSide } from '../../engine/floor/game';
import { ALL_LEGENDS, legendFive } from '../../engine/floor/legends';
import { BESTS, PICK_SECONDS, lineUp, picksOf, seriesWinner, toWin, type Best } from '../../engine/floor/friend';
import type { FloorPlan, FloorSetup } from '../../engine/floor/sim';
import { username } from '../names';
import { recordFloorFriend, recordFloorSeries } from '../achievements';
import { achievementsNow } from '../../store';
import { SITE } from '../multiplayer';
import { t } from '../../i18n';
import { FloorScreen, type FloorTeamLook } from './FloorScreen';
import { withDirect } from './rtc';
import { LOBBY, NetGame, ME, ROOM_RE, canPlayOnline, cleanRoom, openWire, roomCode, type FloorMsg, type Wire } from './net';
import { FriendRoom, cleanPlan, type RoomMode, type RoomState } from './room';
import { DraftBoard } from './DraftBoard';
import { Ico } from './Ico';
import { sfx } from '../sound';
import { GamePlan, rememberedPlan } from './GamePlan';

const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
/** Both franchise fives play at this overall, whoever they are (a drafted five plays at its own: friend.ts). */
const LEVEL = 90;
const PICK = 'btr-floor-friend';
/** What the host last picked for his room, and each friend's games against him in this browser. */
const ROOM = 'btr-floor-room';
const H2H = 'btr-floor-h2h';

interface Me {
  team: string;
  pos: Pos;
}
interface Peer extends Me {
  id: string;
  name: string;
  plan?: FloorPlan;
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

function keptRoom(): { mode: RoomMode; best: Best } {
  try {
    const v = JSON.parse(localStorage.getItem(ROOM) ?? 'null') as { mode: RoomMode; best: Best } | null;
    if (v && (v.mode === 'franchise' || v.mode === 'draft') && BESTS.includes(v.best)) return v;
  } catch {
    // nothing kept
  }
  return { mode: 'franchise', best: 1 };
}
function keepRoom(r: { mode: RoomMode; best: Best }): void {
  try {
    localStorage.setItem(ROOM, JSON.stringify({ mode: r.mode, best: r.best }));
  } catch {
    // storage blocked: picked again next time
  }
}

/** His wins and losses against a friend (by the friend's name), in this browser. */
function h2hOf(name: string): [number, number] {
  try {
    const v = (JSON.parse(localStorage.getItem(H2H) ?? '{}') as Record<string, [number, number]>)[name];
    if (Array.isArray(v) && v.length === 2) return [Number(v[0]) || 0, Number(v[1]) || 0];
  } catch {
    // nothing kept
  }
  return [0, 0];
}
function h2hAdd(name: string, win: boolean): void {
  try {
    const all = JSON.parse(localStorage.getItem(H2H) ?? '{}') as Record<string, [number, number]>;
    const [w, l] = h2hOf(name);
    all[name] = win ? [w + 1, l] : [w, l + 1];
    localStorage.setItem(H2H, JSON.stringify(all));
  } catch {
    // storage blocked: not kept
  }
}

const teamOf = (abbr: string) => NBA_TEAMS.find((x) => x.abbr === abbr) ?? NBA_TEAMS[0];
const nameOf = (abbr: string) => `${teamOf(abbr).city} ${teamOf(abbr).nick}`;

/** A side's five in the room: his franchise's, or the five he drafted (once he has five), each at the slot he plays. */
function fiveIn(room: RoomState | null, side: 0 | 1, team: string) {
  if (room?.mode !== 'draft') return legendFive(team);
  return room.draft && picksOf(room.draft, side).length === 5 ? lineUp(picksOf(room.draft, side)) : [];
}

/** The game the host tips off: his team at home, the friend's on the road, each with his game plan.
 * In a draft each side is the five he drafted at its own level, in the colours of the franchise he picked. */
function makeSetup(room: RoomState, host: Me & { name: string; plan: FloorPlan }, guest: Peer, seed: number): FloorSetup {
  const side = (who: 0 | 1, p: Me, name: string): FloorSide => (room.mode === 'draft' ? { name, short: p.team, color: teamOf(p.team).color, five: fiveIn(room, who, p.team) } : franchise(p.team, LEVEL));
  const s = legendSetup({ seed, us: side(0, host, host.name), them: side(1, guest, guest.name), user: POS.indexOf(host.pos), length: 'fourth', plan: host.plan });
  s.them.plan = guest.plan;
  s.them.players[POS.indexOf(guest.pos)].user = true;
  // level at the start: neither side is handed a lead
  s.score = [s.score[1], s.score[1]];
  return s;
}

/** The series as the score bug and the final page show it, his wins first: none for a single game. */
function seriesLine(room: RoomState | null, side: 0 | 1, friend: string): string | undefined {
  if (!room || room.best === 1) return undefined;
  const score = `${room.wins[side]}–${room.wins[1 - side]}`;
  const won = seriesWinner(room.best, room.wins);
  return won === null ? score : `${score} · ${won === side ? t('you take it') : t('{name} takes it', { name: friend })}`;
}

type Phase = 'pick' | 'opening' | 'host' | 'guest' | 'play';

export function FloorFriend() {
  const [me, setMe] = useState<Me>(remembered);
  const [plan, setPlan] = useState<FloorPlan>(rememberedPlan);
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
  // the room as the host keeps it (what it plays, the series, the draft), and a beat for the pick clock
  const [rs, setRs] = useState<RoomState | null>(null);
  const [, setNow] = useState(0);
  const room = useRef<FriendRoom | null>(null);
  // games whose result is in (the series, the record against him), by their tip-off's number
  const settled = useRef(new Set<number>());
  const wire = useRef<Wire | null>(null);
  const host = useRef(false);
  const games = useRef(0);
  const meRef = useRef(me);
  const planRef = useRef(plan);
  // the friend in the room, and when he was last heard (a third screen with the code waits its turn)
  const peerAt = useRef<{ id: string; at: number } | null>(null);
  const peerName = useRef<string | null>(null);
  const peerRef = useRef<Peer | null>(null);
  // round 42, a quick match: the lobby's line while looking, and that this room came from it
  const lobby = useRef<Wire | null>(null);
  const [seeking, setSeeking] = useState(false);
  const quick = useRef(false);
  meRef.current = me;
  planRef.current = plan;
  peerRef.current = peer;

  // leaving the page: tell the room, and close the line
  useEffect(
    () => () => {
      wire.current?.send({ k: 'bye', id: ME });
      wire.current?.close();
      lobby.current?.close();
      room.current?.close();
    },
    [],
  );

  // (after round 42) a series decided counts in the book once: won, swept, with drafted fives
  const seriesDone = useRef(false);
  useEffect(() => {
    const won = rs ? seriesWinner(rs.best, rs.wins) : null;
    if (won === null || !rs) {
      seriesDone.current = false;
      return;
    }
    if (seriesDone.current || !settled.current.size) return;
    seriesDone.current = true;
    const side: 0 | 1 = host.current ? 0 : 1;
    if (recordFloorSeries({ won: won === side, best: rs.best, sweep: rs.wins[1 - won] === 0, draft: rs.mode === 'draft' })) achievementsNow();
  }, [rs]);

  // a quick match tips off by itself once the other player is in the room
  useEffect(() => {
    if (phase === 'host' && peer && quick.current && !game && !last) tipOff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, peer]);

  // while in a room: say who is here every so often, so whoever comes later sees it (and at once when
  // his team, his man or his plan changes); the host sends the room with it
  useEffect(() => {
    if (phase !== 'host' && phase !== 'guest') return;
    const hi = () => {
      wire.current?.send({ k: 'hi', id: ME, host: host.current, name, team: meRef.current.team, pos: meRef.current.pos, plan: planRef.current });
      room.current?.announce();
    };
    hi();
    const id = window.setInterval(hi, 1500);
    return () => clearInterval(id);
  }, [phase, name, me, plan]);

  // the draft's clock: the host makes the pick for whoever runs out of time; the board counts down
  useEffect(() => {
    if (phase !== 'host' && phase !== 'guest') return;
    const id = window.setInterval(() => {
      room.current?.tick(!!peerRef.current);
      if (room.current?.left() !== null) setNow(Date.now());
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  // a game played to its end counts in the series (the host counts, room.ts) and in the record against him, once
  // (whether it ends with Continue or with the host's Play it again)
  const settle = (g: NetGame | undefined) => {
    if (!g || !g.over || settled.current.has(g.game)) return;
    settled.current.add(g.game);
    const winner: 0 | 1 = g.conf.score[0] > g.conf.score[1] ? 0 : 1;
    room.current?.result(g.game, winner);
    if (peerName.current) h2hAdd(peerName.current, winner === g.side);
  };
  const gameRef = useRef(game);
  gameRef.current = game;
  useEffect(() => {
    if (!game) return;
    const id = window.setInterval(() => settle(game.link), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // a series decided: his fanfare when it is his, the sad notes when it is his friend's
  const decided = rs && rs.best > 1 ? seriesWinner(rs.best, rs.wins) : null;
  const decidedRef = useRef(decided);
  useEffect(() => {
    if (decided !== null && decidedRef.current === null) sfx(decided === (hosting ? 0 : 1) ? 'series' : 'lose');
    decidedRef.current = decided;
  }, [decided, hosting]);

  const hear = (m: FloorMsg) => {
    if (m.id === ME) return;
    if (m.k === 'hi' && m.host !== host.current) {
      const now = Date.now();
      if (peerAt.current && peerAt.current.id !== m.id && now - peerAt.current.at < 5000) return;
      peerAt.current = { id: m.id, at: now };
      const pos = POS.includes(m.pos as Pos) ? (m.pos as Pos) : 'SG';
      const plan = cleanPlan(m.plan);
      peerName.current = m.name;
      setPeer((p) => (p && p.id === m.id && p.team === m.team && p.name === m.name && p.pos === pos && JSON.stringify(p.plan) === JSON.stringify(plan) ? p : { id: m.id, name: m.name, team: m.team, pos, plan }));
      setNote('');
    } else if (m.k === 'bye') {
      if (peerAt.current?.id === m.id) peerAt.current = null;
      setPeer((p) => (p && p.id === m.id ? null : p));
      setNote(t('Your friend left the room.'));
    } else if (m.k === 'start' && !host.current && m.to === ME && wire.current) {
      // the host's rematch: the game before it counts first
      settle(gameRef.current?.link);
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
    // a room joined by code gets a direct line between the two browsers as well; a quick match with
    // a stranger does not (it would show each his network address: rtc.ts)
    wire.current = quick.current ? w : withDirect(w, asHost);
    host.current = asHost;
    setHosting(asHost);
    setCode(c);
    wire.current.listen(hear);
    // a quick match starts as one game between franchises; a room by code as the host last had it
    room.current?.close();
    const r = new FriendRoom(wire.current, asHost, quick.current ? { mode: 'franchise', best: 1 } : keptRoom());
    r.onChange(() => setRs({ ...r.state }));
    room.current = r;
    settled.current.clear();
    setRs({ ...r.state });
    setLast(null);
    setPhase(asHost ? 'host' : 'guest');
  };

  const leaveRoom = () => {
    wire.current?.send({ k: 'bye', id: ME });
    wire.current?.close();
    wire.current = null;
    room.current?.close();
    room.current = null;
    setRs(null);
    setPeer(null);
    setCode('');
    setGame(null);
    setPhase('pick');
  };

  const tipOff = () => {
    const r = room.current;
    if (!peer || !wire.current || !r || (r.state.mode === 'draft' && !r.drafted)) return;
    // a series already decided makes way for a new one
    r.nextGame();
    const n = ++games.current;
    const setup = makeSetup(r.state, { ...me, name, plan }, peer, 1 + Math.floor(Math.random() * 1e9));
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
      settle(game.link);
      game.link.close();
      tipOff();
    };
    const done = (summary: string | null) => {
      if (summary === null) game.link.quit();
      else {
        settle(game.link);
        game.link.close();
      }
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
          series={seriesLine(rs, game.link.side, game.friend)}
          onDone={(r) => {
            // a game played to its end counts in the book (one left early does not)
            if (recordFloorFriend(r.win, r.us - r.them, r.line.pts, { draft: rs?.mode === 'draft', friend: game.friend })) achievementsNow();
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

  const inRoom = phase === 'host' || phase === 'guest';
  const draft = inRoom && rs?.mode === 'draft';
  const side: 0 | 1 = hosting ? 0 : 1;
  const five = fiveIn(inRoom ? rs : null, side, me.team);
  const friend = peer?.name ?? t('Your friend');
  const setRoom = (mode: RoomMode, best: Best) => {
    keepRoom({ mode, best });
    room.current?.setMode(mode);
    room.current?.setBest(best);
  };
  const won = rs ? seriesWinner(rs.best, rs.wins) : null;
  const record = peer ? h2hOf(peer.name) : [0, 0];
  return (
    <section className="card stack floor-friend">
      <div>
        <div className="sec-title">{t('Play a friend online')}</div>
        <p className="prose small">{t('One of you makes a room and reads out its code; the other types it in, or take a quick match with whoever is waiting. You each steer one legend, head to head, and the AI plays the other eight. Both fives play at {n} overall.', { n: LEVEL })}</p>
      </div>
      <div className="row floor-friend-pick" style={{ gap: 12, flexWrap: 'wrap' }}>
        <label className="small">
          {draft ? t('Your colours') : t('Your team')}{' '}
          <select value={me.team} onChange={(e) => setMe({ ...me, team: e.target.value })}>
            {NBA_TEAMS.map((x) => (
              <option key={x.abbr} value={x.abbr}>
                {x.city} {x.nick}
              </option>
            ))}
          </select>
        </label>
        {five.length === 5 && (
          <div className="row" role="group" aria-label={t('Who you steer')} style={{ gap: 6, flexWrap: 'wrap' }}>
            {five.map((l, i) => (
              <button key={l.name} className={`pick-chip${me.pos === POS[i] ? ' on' : ''}`} aria-pressed={me.pos === POS[i]} onClick={() => setMe({ ...me, pos: POS[i] })}>
                {POS[i]} · {l.name}
              </button>
            ))}
          </div>
        )}
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
              {draft ? t('{name} is here.', { name: peer.name }) : t('{name} is here, with the {team}.', { name: peer.name, team: nameOf(peer.team) })}
              {record[0] + record[1] > 0 && <span className="small muted"> {t('You against {name} in this browser: {w} wins, {l} losses.', { name: peer.name, w: record[0], l: record[1] })}</span>}
            </p>
          ) : (
            <p className="prose muted">{phase === 'host' ? t('Waiting for your friend to type in the code…') : t('Looking for the room…')}</p>
          )}
          {rs && (
            <div className="ff-room stack" style={{ gap: 8 }}>
              {hosting ? (
                <>
                  <div className="row" role="group" aria-label={t('What you play')} style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="small muted">{t('Play')}</span>
                    {(['franchise', 'draft'] as RoomMode[]).map((m) => (
                      <button key={m} className={`pick-chip${rs.mode === m ? ' on' : ''}`} aria-pressed={rs.mode === m} onClick={() => setRoom(m, rs.best)}>
                        {m === 'franchise' ? t('Your franchises') : t('Superteam draft')}
                      </button>
                    ))}
                  </div>
                  <div className="row" role="group" aria-label={t('Series')} style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="small muted">{t('Series')}</span>
                    {BESTS.map((b) => (
                      <button key={b} className={`pick-chip${rs.best === b ? ' on' : ''}`} aria-pressed={rs.best === b} onClick={() => setRoom(rs.mode, b)}>
                        {b === 1 ? t('One game') : t('Best of {n}', { n: b })}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="small">
                  {rs.mode === 'draft' ? t('Superteam draft') : t('Your franchises')} · {rs.best === 1 ? t('One game') : t('Best of {n}', { n: rs.best })}
                </p>
              )}
              {rs.mode === 'draft' && (
                <p className="small muted">
                  {t('Take turns picking legends from one pool of all {n}, any position, until each has five: {first} first, then two each way. {s} seconds a pick. The two fives play at their own level.', { n: ALL_LEGENDS.length, first: hosting ? t('you') : friend, s: PICK_SECONDS })}
                </p>
              )}
              {rs.best > 1 && (
                <p className="ff-series" role="status">
                  <Ico name="fl-series" />
                  {won === null
                    ? t('Series, first to {n}: you {a}, {name} {b}.', { n: toWin(rs.best), a: rs.wins[side], b: rs.wins[1 - side], name: friend })
                    : won === side
                      ? t('You won the series {a}–{b}. The next tip-off starts a new one.', { a: rs.wins[side], b: rs.wins[1 - side] })
                      : t('{name} won the series {a}–{b}. The next tip-off starts a new one.', { name: friend, a: rs.wins[1 - side], b: rs.wins[side] })}
                </p>
              )}
            </div>
          )}
          {draft && rs?.draft && <DraftBoard d={rs.draft} me={side} names={hosting ? [name, friend] : [friend, name]} left={room.current?.left() ?? null} onPick={(k) => room.current?.pick(k)} />}
          {inRoom && five.length === 5 && (
            <details className="ff-plan">
              <summary>{t('Your game plan')}</summary>
              <GamePlan plan={plan} onChange={setPlan} names={Object.fromEntries(five.map((l, i) => [POS[i], l.name]))} />
            </details>
          )}
          {last && <p className="small">{t('Last game: {line}', { line: last })}</p>}
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {phase === 'host' && draft && (!rs?.draft || room.current?.drafted) && (
              <button className={`btn${rs?.draft ? '' : ' primary'}`} disabled={!peer} onClick={() => room.current?.startDraft()}>
                {rs?.draft ? t('Draft again') : t('Start the draft')}
              </button>
            )}
            {phase === 'host' && (!draft || room.current?.drafted) && (
              <button className="btn primary" disabled={!peer} onClick={tipOff}>
                {last ? t('Play again') : t('Tip off')}
              </button>
            )}
            {phase === 'guest' && peer && (draft && !rs?.draft ? <span className="small muted">{t('{name} starts the draft when ready.', { name: peer.name })}</span> : (!draft || room.current?.drafted) && <span className="small muted">{t('{name} tips off when ready.', { name: peer.name })}</span>)}
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
