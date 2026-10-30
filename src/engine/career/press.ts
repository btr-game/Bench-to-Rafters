// Press conferences (round 25, the owner: not one or two a season, one every two or three). After
// a season with a story (a title, a lost final, a big award, a bad injury, a slump, a move, a
// contract year), the summer brings the microphones: three questions, each answered humble,
// confident or fiery. Humble earns the coach's trust and a little chemistry; confident, fame and
// mood; fiery, the most fame, a risk of a fine, and a locker room that either catches fire or
// splits next season. The home crowd has a taste too: a demanding one loves fire, a friendly one
// loves humility.

import { PRESS } from '../balance';
import { FAN_CULTURES } from './fanCulture';
import { chance, clamp, int, pick } from '../rng';
import { adjust, logDecision, pushDecision } from './common';
import { pressFine } from './fines';
import type { Decision, GameState, SeasonRecord } from '../types';

type Tone = 'humble' | 'confident' | 'fiery';

interface Topic {
  id: string;
  title: string;
  happened: (s: GameState, last: SeasonRecord) => boolean;
  questions: [string, [string, string, string]][]; // question, then the humble, confident and fiery answers
}

const won = (k: string) => (s: GameState, last: SeasonRecord) => s.awards.some((a) => a.year === last.year && a.key === k);

const TOPICS: Topic[] = [
  {
    id: 'title',
    title: 'Champions',
    happened: (_, last) => /Champion/i.test(last.result),
    questions: [
      ['What does this title mean to you?', ['Everything. And it belongs to every guy in that locker room.', 'It means we were the best team in the world. Simple as that.', 'It means everyone who doubted us can sit down.']],
      ['Who do you want to thank?', ['My family, my coaches, the trainers nobody sees.', 'My teammates. They trusted me with the big shots.', 'Nobody who wrote us off in November.']],
      ['Can you do it again?', ['We will have to work even harder. Everyone is coming for us.', 'Why not? Same core, more experience.', 'Again? Start printing the shirts.']],
    ],
  },
  {
    id: 'lost-final',
    title: 'So close',
    happened: (_, last) => /Lost (in )?(the )?(NBA )?Finals|Runner-up|lost the final/i.test(last.result),
    questions: [
      ['How does it feel to come this close?', ['It hurts. They were better, and we have to learn from it.', 'We will be back. This group is not done.', 'It feels like the refs had a say in it.']],
      ['What was the difference in the series?', ['Their execution down the stretch. Credit to them.', 'A couple of possessions. That is all.', 'Ask the officials. They had the best view.']],
      ['What changes this summer?', ['Everything I can control: my body, my shot, my voice.', 'Not much. We are right there.', 'Some people in this building need to want it more.']],
    ],
  },
  {
    id: 'award',
    title: 'The award',
    happened: (s, last) => ['MVP', 'DPOY', 'ALLNBA1', 'ROY', 'SIXTH'].some((k) => won(k)(s, last)),
    questions: [
      ['How does it feel to win it?', ['Humbling. A lot of guys deserved it.', 'Earned. I put in the work every single day.', 'About time. I should have won it last year.']],
      ['Who else deserved it?', ['Two or three guys, honestly. I got lucky.', 'It was close. I am glad it went my way.', 'Nobody. It was not close.']],
      ['What is the next goal?', ['Make my teammates better.', 'A ring. Awards are nice; rings are better.', 'All of them. Every award, every year.']],
    ],
  },
  {
    id: 'injury',
    title: 'The comeback',
    happened: (s, last) => (s.player.injuries ?? []).some((x) => (x.year ?? last.year) === last.year && x.days >= 60),
    questions: [
      ['How is the body?', ['Getting there. I listen to the doctors.', 'Better than before. I promise you that.', 'Ask me after I drop forty on opening night.']],
      ['Were you ever worried about your career?', ['Every day. That is the honest answer.', 'For a minute. Then I got to work.', 'Never. People who wrote me off will see.']],
      ['What did you learn in rehab?', ['Patience. And how much I love this game.', 'That I am tougher than I thought.', 'Who my real friends are.']],
    ],
  },
  {
    id: 'slump',
    title: 'Hard questions',
    happened: (_, last) => last.ovrEnd <= last.ovrStart - 3,
    questions: [
      ['What happened this season?', ['I was not good enough. That is on me.', 'Off year. It happens to everyone.', 'Wrong system, wrong role. You saw it.']],
      ['Are you still the player you were?', ['I have to prove it. Words are cheap.', 'Yes. Watch next season.', 'Better. Nobody was using me right.']],
      ['Do you want to stay?', ['I want to earn my place here.', 'This is my team. I am not going anywhere.', 'Ask the front office.']],
    ],
  },
  {
    id: 'moved',
    title: 'A new team',
    happened: (s, last) => s.history.length >= 2 && s.history[s.history.length - 2].teamName !== last.teamName && last.level === s.history[s.history.length - 2].level,
    questions: [
      ['How do you fit in here?', ['I will do whatever the coach asks.', 'I am the piece they were missing.', 'I fit anywhere. That was never the problem.']],
      ['Any message for your old team?', ['Thank you. They gave me my start.', 'Good luck to them. We will see them soon.', 'They made a mistake. Circle the date.']],
      ['What are the goals here?', ['Win games, one at a time.', 'The playoffs, at least.', 'A title. Anything less is a waste of my time.']],
    ],
  },
  {
    id: 'contract-year',
    title: 'Contract year',
    happened: (s) => !!s.contract && s.contract.years <= 1 && ['NBA', 'EU', 'INT'].includes(s.stage),
    questions: [
      ['Is this your last season here?', ['I just want to play. My agent handles the rest.', 'I would love to stay, if it is right for both sides.', 'That depends on whether they pay me.']],
      ['Do you feel underpaid?', ['No. I am lucky to do this for a living.', 'The market will decide. I trust my play.', 'Look at the numbers. You tell me.']],
      ['Will money decide where you play?', ['Winning will.', 'Money and winning. I want both.', 'Respect will. Money is how they show it.']],
    ],
  },
];

const TONES: Tone[] = ['humble', 'confident', 'fiery'];

/** In the offseason: microphones, if the last season had a story and the last presser is long enough ago. */
export function pushPress(s: GameState): void {
  const p = s.player;
  const last = s.history[s.history.length - 1];
  if (!last || !['NCAA', 'GL', 'EU', 'INT', 'NBA'].includes(s.stage)) return;
  if (p.press && s.year < p.press.next) return;
  const topic = TOPICS.find((t) => t.happened(s, last));
  if (!topic) return;
  p.press = { next: s.year + PRESS.gap + int(s.rng, 0, 1), fx: p.press?.fx ?? 0 };
  askPress(s, topic.id, 0);
}

function askPress(s: GameState, topic: string, q: number, last?: Tone): void {
  const t = TOPICS.find((x) => x.id === topic)!;
  const [question, answers] = t.questions[q];
  // fast break: one answer sets the tone, and the other two questions get the same (fast.ts)
  const fast = !!s.flags.fast;
  const d: Omit<Decision, 'id'> = {
    kind: 'press',
    title: fast ? `Press conference · ${t.title}` : `Press conference · ${t.title} (${q + 1} of 3)`,
    text: fast && q === 0 ? `"${question}" Your answer sets the tone for the whole press conference.` : `"${question}"`,
    choices: answers.map((a, i) => ({ id: TONES[i], label: a, detail: TONES[i] === 'humble' ? 'Humble' : TONES[i] === 'confident' ? 'Confident' : 'Fiery', tags: [TONES[i]] })),
    data: { topic, q, last },
  };
  pushDecision(s, d);
}

/** One answer: its effects now, the next question to the front of the line. */
export function resolvePress(s: GameState, d: Decision, tone: string): string | null {
  const p = s.player;
  const t = tone as Tone;
  if (!TONES.includes(t)) return null;
  const notes: string[] = [];
  if (t === 'humble') {
    p.trust = adjust(p.trust, PRESS.humble.trust);
    p.rep = clamp(p.rep + PRESS.humble.rep, 0, 100);
    p.press!.fx += PRESS.humble.chem;
    notes.push('The coach nods along.');
  } else if (t === 'confident') {
    p.rep = clamp(p.rep + PRESS.confident.rep, 0, 100);
    p.morale = adjust(p.morale, PRESS.confident.morale);
    notes.push('The quote leads the evening news.');
  } else {
    p.rep = clamp(p.rep + PRESS.fiery.rep, 0, 100);
    p.trust = adjust(p.trust, PRESS.fiery.trust);
    // the room catches fire, or splits
    p.press!.fx += chance(s.rng, 0.5) ? PRESS.fiery.fire : -PRESS.fiery.fire;
    notes.push(pick(s.rng, ['Every sports show plays it on a loop.', 'Your phone does not stop buzzing.', 'A rival tweets a single emoji.']));
    if (chance(s.rng, PRESS.fineChance)) notes.push(`The league fines you ${pressFine(s, s.rng)}.`);
  }
  // the home crowd's taste (NBA fan cultures): demanding crowds love fire, friendly ones humility
  const abbr = s.stage === 'NBA' ? s.nba?.teams.find((x) => x.id === s.teamId)?.abbr : undefined;
  const fans = abbr ? FAN_CULTURES[abbr] : undefined;
  const taste: Tone | null = fans ? (fans.lose <= -3 ? 'fiery' : fans.lose >= 0 ? 'humble' : 'confident') : null;
  if (taste === t) {
    p.rep = clamp(p.rep + PRESS.fans, 0, 100);
    p.morale = adjust(p.morale, PRESS.fans);
    notes.push(`${fans!.name} love it.`);
  }
  const q = (d.data?.q as number) ?? 0;
  logDecision(s, 'press', `Press conference: answered ${t}.`);
  if (q < 2) {
    askPress(s, d.data?.topic as string, q + 1, t);
    s.pending.unshift(s.pending.pop()!);
  }
  return notes.join(' ');
}

/** Next season: what his summer words did to the locker room (consumed once). */
export function takePressFx(s: GameState): number {
  const fx = s.player.press?.fx ?? 0;
  if (s.player.press) s.player.press.fx = 0;
  return Math.round(fx * 100) / 100;
}
