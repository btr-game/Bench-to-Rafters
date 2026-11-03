// Round 35's turning points for the draft class's new systems (the checklist, item 6): the class
// starts on draft night, classmates play in his league (box scores, award races, All-Star teams),
// his rival classmate can meet him in a playoff series, and the class ends with a reunion night.
// Five, and only in a draft-class career (each `when` asks for the class first, so a career
// without friends never gets past it and draws exactly as before):
// - the rookie dinner, the first All-Star break after draft night;
// - a classmate on the block at the trade deadline;
// - the bracket math, when he and his rival classmate are both bound for the playoffs (the
//   series itself is asked inside the postseason, career/rivalSeries.ts);
// - a classmate's MVP in his league, the summer after it;
// - the reunion invitation, late in his career.
// A classmate lives here only through the career's copy of the class's lines (career/friends.ts),
// so these change nothing of his: small effects on this player, like the rest of the book.

import { clamp } from '../rng';
import type { AttrKey, GameState, Stage, Team } from '../types';
import { adjust, ordinal, teamById } from '../career/common';
import { friendName, friendNow, rivalTeam } from '../career/friends';
import { standings } from '../sim/leagueSim';
import { ATTR_MAX } from '../balance';
import type { EventChoice, EventDef } from './defs';

const NBA: Stage[] = ['NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const wear = (s: GameState, v: number) => (s.player.wear = clamp((s.player.wear ?? 0) + v, 0, 100));
const ok = (outcome: string, log?: string) => ({ outcome, log });

/** A draft-class career (as in events/round35b.ts): Regular guy with a class. */
const inClass = (s: GameState): boolean => s.mode === 'standard' && !!s.mp?.klass;
/** One that opened on draft night (career/draftNight.ts). */
const fromDraftNight = (s: GameState): boolean => s.start?.input.start === 'draft';

/** The best-rated classmate in the NBA this season on a team that is not his. */
function classmateElsewhere(s: GameState): { who: string; pn: string; team: string } | null {
  const mine = teamById(s.nba, s.teamId)?.name;
  let best: { who: string; pn: string; team: string; ovr: number } | null = null;
  for (const f of s.mp?.friends ?? []) {
    const line = friendNow(f, s.year);
    if (line && line.lv === 'NBA' && line.team !== mine && (!best || line.ovr > best.ovr)) best = { who: friendName(f), pn: f.pn, team: line.team, ovr: line.ovr };
  }
  return best;
}

/** Among the top six of its conference, by the standings so far. */
const topSix = (s: GameState, t: Team): boolean => standings((s.nba?.teams ?? []).filter((x) => x.conf === t.conf)).indexOf(t) < 6;

/** His team and his rival classmate's, both bound for the playoffs (and where they would meet). */
function bracket(s: GameState): { pn: string; team: string; finals: boolean } | null {
  const r = rivalTeam(s);
  const mine = teamById(s.nba, s.teamId);
  if (!r || !mine || !topSix(s, mine) || !topSix(s, r.team)) return null;
  return { pn: r.f.pn, team: r.team.name, finals: mine.conf !== r.team.conf };
}

/** This season's MVP in his league, when the class has him: the name, and his line. */
function palMvp(s: GameState): { name: string; line: string } | null {
  const year = s.nbaHistory[s.nbaHistory.length - 1];
  if (!year || year.year !== s.year) return null;
  const mvp = year.awards.find((a) => a.award === 'MVP');
  const names = new Set((s.mp?.friends ?? []).map(friendName));
  return mvp && names.has(mvp.name) ? { name: mvp.name, line: mvp.line } : null;
}

/** Where he finished in this season's MVP voting, when it was in the top ten. */
function myMvpRank(s: GameState): number | null {
  const h = [...s.history].reverse().find((x) => x.year === s.year && x.level === 'NBA');
  const rank = h?.races.find((r) => r.award === 'MVP')?.userRank ?? null;
  return rank !== null && rank <= 10 ? rank : null;
}

const dinnerChoices = (s: GameState): EventChoice[] => {
  const first = s.draft?.userPick === 1;
  return [
    {
      label: 'Pick up the check',
      detail: 'A rookie’s money, a class’s goodwill; a little more fame',
      resolve: (t) => {
        t.player.bank = Math.max(0, t.player.bank - 0.03);
        rep(t, 1);
        morale(t, 3);
        return ok('A steak for everyone and far too much dessert. Nobody forgets who paid, and the class chat names you its treasurer.', 'Picked up the check at his draft class’s rookie dinner.');
      },
    },
    {
      label: 'Ask who has the rookie wall figured out',
      detail: 'A little wiser, a little fresher',
      resolve: (t) => {
        bump(t, 'IQ', 0.5);
        wear(t, -1);
        morale(t, 1);
        return ok('One classmate swears by naps, another by film at six in the morning. You write it all down on a napkin and keep it in your locker.');
      },
    },
    {
      label: first ? 'Take the head of the table' : 'Sit across from a classmate picked ahead of you',
      detail: 'Your focus skills sharpen; a long night',
      resolve: (t) => {
        for (const k of t.player.focus) bump(t, k, 0.4);
        morale(t, -1);
        return ok(first ? 'First pick, first chair. Every joke at the table is about you, and you are in the gym at seven the next morning to earn the chair.' : 'Neither of you says a word about the draft all night. You both know. You are in the gym at seven the next morning.');
      },
    },
  ];
};

export const ROUND35C_EVENTS: EventDef[] = [
  {
    id: 'rookieDinner',
    stages: NBA,
    phase: 'mid',
    // one window, the first half of his rookie year: weighted up like the other one-season follow-ups
    when: (s) => inClass(s) && fromDraftNight(s) && !s.history.some((h) => h.level === 'NBA'),
    weight: 5,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'The rookie dinner',
    text: (s) =>
      `All-Star break. Your draft class takes over the back room of a steakhouse: every one of them his college’s first option, every one a first-round pick, all of them rookies now. ${s.draft?.userPick ? `You went No. ${s.draft.userPick}. ` : ''}Everyone at the table knows exactly where everyone else went.`,
    choices: dinnerChoices,
  },
  {
    id: 'classmateBlock',
    stages: NBA,
    phase: 'mid',
    when: (s) => inClass(s) && !!classmateElsewhere(s),
    weight: 1,
    cooldownSeasons: 3,
    title: 'A classmate on the block',
    text: (s) => {
      const x = classmateElsewhere(s)!;
      return `The trade deadline is a week away, and the papers say the ${x.team} are shopping ${x.who}, your classmate from the draft class. Your general manager has read the same papers.`;
    },
    choices: (s) => {
      const pn = classmateElsewhere(s)?.pn ?? 'him';
      return [
        {
          label: `Tell your GM to go get ${pn}`,
          detail: 'Happier at the thought; the front office does not like being told',
          resolve: (t) => {
            trust(t, -2);
            morale(t, 3);
            return ok('Your GM makes the call, listens, and hangs up with nothing. The deal never happens, but he knows what you want now, and so does your classmate.', `Asked his GM to trade for ${pn}, a classmate on the block.`);
          },
        },
        {
          label: 'Text him: keep your head up',
          detail: 'A good friend; a little more fame when he says so',
          resolve: (t) => {
            morale(t, 2);
            rep(t, 1);
            return ok('He posts your text with no caption, and the whole class chat answers it. Whatever happens at the deadline, he knows who called first.');
          },
        },
        {
          label: 'Stay out of it: your team first',
          detail: 'The coach notices',
          resolve: (t) => {
            trust(t, 3);
            return ok('You say nothing to anyone. At practice the coach gives you the last shot of the drill, which is how he says thank you.');
          },
        },
      ];
    },
  },
  {
    id: 'rivalBracket',
    stages: NBA,
    phase: 'mid',
    when: (s) => inClass(s) && !!bracket(s),
    weight: 3,
    cooldownSeasons: 2,
    title: 'The bracket math',
    text: (s) => {
      const b = bracket(s)!;
      return `Halfway through the season, your team and the ${b.team} are both in the top six. Somebody in the class chat has already drawn the bracket: you and ${b.pn}, your rival from the draft class, ${b.finals ? 'in the NBA Finals, the only place two teams from different conferences meet' : 'in the conference playoffs, if the standings hold'}.`;
    },
    choices: (s) => {
      const pn = bracket(s)?.pn ?? 'your rival';
      return [
        {
          label: `Start on ${pn}’s tape now`,
          detail: 'A little sharper on defense and in the head; longer nights',
          resolve: (t) => {
            bump(t, 'IQ', 0.4);
            bump(t, 'PER', 0.3);
            wear(t, 0.5);
            return ok('Every one of his games since the draft, at double speed. By March you know which way he spins before he does.', `Studied ${pn}'s tape at midseason, in case of a rival series.`);
          },
        },
        {
          label: 'Call him and set the stakes',
          detail: 'Fun, and the class loves it; a little more fame',
          resolve: (t) => {
            morale(t, 3);
            rep(t, 1);
            return ok('The loser pays for the reunion. He says yes before you finish the sentence, and the class chat holds you both to it.');
          },
        },
        {
          label: 'One game at a time',
          detail: 'The coach likes the answer',
          resolve: (t) => {
            trust(t, 2);
            return ok('You tell the reporters the standings are a long way off. Your coach reads it in the morning paper and nods.');
          },
        },
      ];
    },
  },
  {
    id: 'classmateMvp',
    stages: NBA,
    phase: 'off',
    // the summer after a classmate's MVP: weighted up, since it has one window
    when: (s) => inClass(s) && !!palMvp(s),
    weight: 5,
    cooldownSeasons: 1,
    title: 'A classmate’s MVP',
    text: (s) => {
      const m = palMvp(s)!;
      const rank = myMvpRank(s);
      return `${m.name} is the MVP of your league this season${m.line ? `: ${m.line}` : ''}. ${rank ? `You finished ${ordinal(rank)} in the voting.` : 'You were nowhere near the top of the voting.'} The draft class chat has not stopped since.`;
    },
    choices: [
      {
        label: 'Congratulate him, and mean it',
        detail: 'Good for the mood; a little more fame',
        resolve: (s) => {
          morale(s, 2);
          rep(s, 1);
          return ok('A long text, no jokes in it. He calls you back that night and you talk until two.', 'Congratulated a classmate on his MVP.');
        },
      },
      {
        label: 'Make his trophy photo your lock screen',
        detail: 'Your focus skills sharpen; a hard summer',
        resolve: (s) => {
          for (const k of s.player.focus) bump(s, k, 0.5);
          wear(s, 1);
          morale(s, -1);
          return ok('His trophy, on your phone, every morning before the gym. It is not healthy. It works.');
        },
      },
      {
        label: 'Ask him what changed',
        detail: 'A little wiser',
        resolve: (s) => {
          bump(s, 'IQ', 0.6);
          return ok('He talks for an hour: his summer, his film, the one move he added. You keep two of the three.');
        },
      },
    ],
  },
  {
    id: 'reunionInvite',
    stages: PRO,
    phase: 'off',
    oncePerCareer: true,
    // late in a career, once: weighted up like the other late-career ones
    when: (s) => inClass(s) && s.player.age >= 32,
    weight: 2.5,
    cooldownSeasons: 1,
    title: 'The reunion invitation',
    text: (s) => `A card comes in the mail from your draft class: a reunion, the night every career in the class is over. Eleven awards, one at a time, the Class MVP last. You are ${s.player.age}, and everyone in the class is already counting.`,
    choices: [
      {
        label: 'One more big season for the résumé',
        detail: 'Aging slows a little next season; a hard summer',
        resolve: (s) => {
          s.player.declineMultNext *= 0.97;
          wear(s, 2);
          morale(s, 1);
          return ok('Two workouts a day at an age when most of the class is golfing. The numbers on that night are the numbers you leave them.', 'Got the draft class reunion invitation, and trained for one more big season.');
        },
      },
      {
        label: 'Start the speech now',
        detail: 'Good for the mood; a little more fame',
        resolve: (s) => {
          morale(s, 3);
          rep(s, 1);
          return ok('The first line is about draft night. You cross it out. The second is about the friends at the table. You keep that one.');
        },
      },
      {
        label: 'Call the classmate you lost touch with',
        detail: 'The best mood of the summer',
        resolve: (s) => {
          morale(s, 4);
          trust(s, 1);
          return ok('He picks up on the second ring. You talk for two hours and basketball comes up once.');
        },
      },
    ],
  },
];
