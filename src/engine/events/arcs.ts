// Storylines that unfold over several seasons (playtest round 7: "some events can unravel in
// the long term"). An arc starts with an ordinary turning-point event; its later chapters come
// one per offseason (career/offseason.ts), as a story page with what changed, and sometimes
// with another choice. Outcomes are rolled, so the same start can end very differently.

import { ATTR_MAX, GROWTH_RATE } from '../balance';
import { chance, clamp, range, type Rng } from '../rng';
import type { AttrKey, Decision, GameState, Stage } from '../types';
import { adjust, logDecision, pushDecision, pushMoment, userOvr } from '../career/common';
import { changes, snap } from './outcome';
import type { EventDef } from './defs';
import { addPounds } from '../player/weight';

export interface ArcState {
  id: string;
  chapter: number; // chapters already played after the start
  started: number; // season it began
  v: Record<string, number>; // choices and rolls the later chapters depend on
}

interface Chapter {
  title: string;
  text: string;
  done?: boolean;
  ask?: { text: string; choices: { id: string; label: string; detail?: string }[] };
}

interface ArcDef {
  id: string;
  title: string;
  color: string;
  /** Plays the next chapter (effects applied inside); null ends the arc quietly. */
  next: (s: GameState, a: ArcState, rng: Rng) => Chapter | null;
  /** A choice asked inside a chapter. */
  answer?: (s: GameState, a: ArcState, id: string, rng: Rng) => string;
}

const ALL: Stage[] = ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];

const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const ok = (outcome: string, log?: string) => ({ outcome, log });

export function startArc(s: GameState, id: string, v: Record<string, number> = {}): void {
  s.arcs ??= [];
  if (s.arcs.some((a) => a.id === id)) return;
  s.arcs.push({ id, chapter: 0, started: s.year, v });
}

const ARCS: ArcDef[] = [
  {
    id: 'family',
    title: 'Family',
    color: '#5B3A6E',
    next: (s, a, rng) => {
      const near = a.v.near === 1;
      if (a.chapter === 0) {
        morale(s, near ? -4 : -8);
        s.player.growthMultNext *= near ? 0.96 : 0.93;
        return { title: 'A long year', text: near ? 'You flew home every chance you got. The treatments are hard on her, and on you. The game felt far away some nights.' : 'You kept your head down and played. The calls home got shorter. Some nights you could not sleep at all.' };
      }
      if (a.chapter === 1) {
        a.v.recovered = chance(rng, near ? 0.65 : 0.55) ? 1 : 0;
        if (a.v.recovered) {
          morale(s, 14);
          return { title: 'Good news', text: 'The doctors say the word everyone was waiting for: remission. She is in the stands for the first game of the season, wearing your jersey.', done: true };
        }
        morale(s, near ? -12 : -18);
        if (!near) trust(s, -3);
        return { title: 'Saying goodbye', text: near ? 'She passed in the spring with the family around her. You were there. That will matter, later.' : 'She passed in the spring. You were on a road trip. You will carry that for a long time.' };
      }
      // playing for her memory
      morale(s, near ? 10 : 6);
      s.player.growthMultNext *= 1.1;
      bump(s, 'IQ', 1.5);
      return { title: 'Playing for her', text: 'You write her initials on your shoes before every game. Something in you is steadier now, and you work like you have something to prove to someone who is watching.', done: true };
    },
  },
  {
    id: 'jumper',
    title: 'The new jumper',
    color: '#1F5C8A',
    next: (s, a, rng) => {
      if (a.chapter === 0) {
        a.v.clicked = chance(rng, 0.72) ? 1 : 0;
        if (a.v.clicked) {
          bump(s, 'SHT', range(rng, 5, 7.5));
          s.player.range = Math.min(99, s.player.range + 5);
          return { title: 'It clicks', text: 'A year of ugly misses, and then one summer morning the new release just goes in. Again. And again. The higher, quicker shot is yours now.' };
        }
        bump(s, 'SHT', range(rng, 1.5, 2.5));
        return { title: 'Still not right', text: 'The new form is better than last year, but it still does not feel natural under pressure. Your coach says give it one more summer.' };
      }
      bump(s, 'SHT', a.v.clicked ? range(rng, 2, 3.5) : range(rng, 3, 5));
      if (!a.v.clicked) s.player.range = Math.min(99, s.player.range + 3);
      return { title: a.v.clicked ? 'A shooter now' : 'Finally', text: a.v.clicked ? 'Defenders go over every screen now. The old jumper is a memory.' : 'Two years after you tore it down, the new jumper finally holds up in the fourth quarter.', done: true };
    },
  },
  {
    id: 'ankle',
    title: 'The bad ankle',
    color: '#7A3B1F',
    next: (s, a, rng) => {
      if (a.v.fixed) return null;
      if (a.chapter >= 3) {
        s.player.injuryMultNext *= 1.05;
        return { title: 'Living with it', text: 'The ankle never fully recovered. You know how to manage it now: the tape, the ice, the days off.', done: true };
      }
      s.player.injuryMultNext *= 1.15;
      bump(s, 'ATH', -range(rng, 0.8, 1.6));
      s.player.wear = Math.min(100, (s.player.wear ?? 0) + 3);
      return {
        title: a.chapter === 0 ? 'It is still there' : 'Again',
        text: 'The ankle swells after every hard practice. Your first step is not quite what it was. The team doctor brings up surgery again.',
        ask: {
          text: 'Surgery would cost you the start of next season, but it would fix it for good.',
          choices: [
            { id: 'surgery', label: 'Have the surgery', detail: 'Miss about two months. Then it is behind you.' },
            { id: 'manage', label: 'Keep managing it', detail: 'Play now. It will keep nagging.' },
          ],
        },
      };
    },
    answer: (s, a, id) => {
      if (id === 'surgery') {
        a.v.fixed = 1;
        s.player.injury = { key: 'major', name: 'Ankle surgery', daysOut: 60 };
        s.player.injuryMultNext *= 0.9;
        logDecision(s, 'arc', 'Had surgery on the ankle that had bothered him for years.');
        return 'Surgery went well. The surgeon says it will be stronger than before.';
      }
      logDecision(s, 'arc', 'Kept playing through the bad ankle.');
      return 'More tape, more ice. You play on.';
    },
  },
  {
    id: 'veteran',
    title: 'The veteran',
    color: '#2E5B3A',
    next: (s, a) => {
      if (a.chapter < 2) {
        bump(s, 'IQ', 1.2);
        trust(s, 3);
        return { title: a.chapter === 0 ? 'Film at 6 a.m.' : 'Little things', text: a.chapter === 0 ? 'He makes you watch film before practice and tells you what you missed. Most days it is a lot.' : 'He shows you how to rest during a game without anyone noticing, and how to bait a referee into a call.' };
      }
      bump(s, 'IQ', 1);
      s.player.growthRate = Math.min(GROWTH_RATE.max, (s.player.growthRate ?? 1) * 1.03);
      morale(s, 4);
      return { title: 'His last season', text: 'He retires this summer. On his way out he hands you his notebook: twenty years of how to play this game. You read it twice.', done: true };
    },
  },
  {
    id: 'body',
    title: 'The new body',
    color: '#4A4F57',
    next: (s, a, rng) => {
      const bulk = a.v.bulk === 1;
      if (bulk) {
        bump(s, 'ATH', range(rng, 1.5, 3));
        bump(s, 'INT', range(rng, 1, 2));
        bump(s, 'FIN', range(rng, 1, 2));
        return { title: 'Grown into it', text: 'The extra weight is muscle now, and you move like it was always there. Bigger players stop pushing you around.', done: true };
      }
      bump(s, 'ATH', range(rng, 1.5, 2.5));
      bump(s, 'PER', range(rng, 1, 2));
      s.player.wear = Math.max(0, (s.player.wear ?? 0) - 4);
      return { title: 'Lighter and quicker', text: 'The lean year pays off: quicker feet, more energy late in games, and your knees thank you.', done: true };
    },
  },
  {
    // round 32: Love, one step a summer: a proposal, the wedding, then whether to start a family
    // (a "not yet" waits a year; twice at the proposal and it ends). A child leads to Fatherhood
    // and, after his career, to the child's own (career/nextGen.ts).
    id: 'love',
    title: 'Love',
    color: '#C2255C',
    next: (s, a) => {
      const who = a.v.who;
      if (!a.v.stage) {
        if ((a.v.wait ?? 0) >= 2) {
          morale(s, -6);
          s.flags.breakup = 1;
          return { title: 'Separate ways', text: 'You waited too long, and they stopped waiting. It ends quietly, and it hurts more than you let on.', done: true };
        }
        morale(s, 3);
        return {
          title: a.v.wait ? 'Another year together' : 'Two summers together',
          text: who === 2 ? 'Red carpets, courtside seats, a photographer at every corner, and somehow it works.' : who === 1 ? 'Like no time passed. They still laugh at the same bad jokes.' : 'Quiet dinners, long walks, nobody asking about your shooting.',
          ask: { text: 'Is it time?', choices: [{ id: 'propose', label: 'Propose' }, { id: 'wait', label: 'Not yet' }] },
        };
      }
      if (a.v.stage === 1) {
        a.v.stage = 2;
        s.flags.wed = s.year;
        morale(s, 8);
        s.player.bank = Math.max(0, s.player.bank - (s.stage === 'NBA' ? (who === 2 ? 1.5 : 0.4) : 0.02));
        if (who === 2) rep(s, 2);
        return {
          title: 'The wedding',
          text: who === 2 ? 'A wedding the magazines call the event of the year. Your teammates dance badly on the cover.' : who === 1 ? 'Back home, in the gym where you met, with the whole town there.' : 'A small wedding by the water. No cameras. Perfect.',
          ask: { text: 'Start a family?', choices: [{ id: 'family', label: 'Start a family' }, { id: 'later', label: 'Not yet' }] },
        };
      }
      if (a.v.stage === 2) {
        if ((a.v.wait2 ?? 0) >= 3) return { title: 'Just the two of you', text: 'You talk about it every summer, and decide every summer that the two of you are enough.', done: true };
        morale(s, 2);
        return { title: 'Another summer', text: 'Life is good. The house is quiet.', ask: { text: 'Start a family?', choices: [{ id: 'family', label: 'Start a family' }, { id: 'later', label: 'Not yet' }] } };
      }
      // a baby on the way: Fatherhood takes it from here
      s.flags.child = s.year + 1;
      startArc(s, 'baby', { help: s.player.bank >= 1 ? 1 : 0, fresh: 1 });
      morale(s, 6);
      return { title: 'Big news', text: 'You are going to be a parent. The baby is due during next season.', done: true };
    },
    answer: (s, a, id) => {
      if (id === 'propose') {
        a.v.stage = 1;
        morale(s, 4);
        return 'They say yes before you finish the question.';
      }
      if (id === 'wait') {
        a.v.wait = (a.v.wait ?? 0) + 1;
        return 'You say there is no rush. They smile, but it fades a little.';
      }
      if (id === 'family') {
        a.v.stage = 3;
        return 'You both want it. Next summer, maybe, there will be news.';
      }
      a.v.wait2 = (a.v.wait2 ?? 0) + 1;
      return 'Not yet. There is time.';
    },
  },
  {
    id: 'baby',
    title: 'Fatherhood',
    color: '#8A6D1F',
    next: (s, a) => {
      if (a.chapter === 0) {
        morale(s, 10);
        if (!a.v.help) s.player.growthMultNext *= 0.94;
        return { title: 'Born', text: a.v.help ? 'A healthy baby, and help at home so you can still sleep before game days.' : 'A healthy baby. You have never been this tired or this happy. Film sessions happen at 3 a.m. with a bottle in your hand.' };
      }
      morale(s, 6);
      s.player.growthMultNext *= 1.03;
      return { title: 'Something to play for', text: 'Your kid comes to games now, in a tiny jersey with your number. You play a little harder when you see it.', done: true };
    },
  },
  {
    id: 'investment',
    title: 'The investment',
    color: '#3A3F5C',
    next: (s, a, rng) => {
      const stake = a.v.stake ?? 0;
      if (a.chapter === 0) {
        if (chance(rng, 0.38)) {
          s.player.bank += stake * 2.2;
          morale(s, 5);
          return { title: 'It pays off', text: 'Your friend\'s company gets bought. Your stake comes back more than doubled, and you look like a genius.', done: true };
        }
        morale(s, -8);
        return { title: 'Gone', text: 'The company folds. The money is gone, and your friend stops returning calls. Then the lawyers call instead.' };
      }
      rep(s, -3);
      s.player.bank = Math.max(0, s.player.bank - Math.min(s.player.bank * 0.05, stake * 0.3));
      return { title: 'Settled', text: 'The lawsuit settles out of court. It costs you a little more money and a few headlines. Lesson learned.', done: true };
    },
  },
  {
    id: 'homesick',
    title: 'Far from home',
    color: '#5C3A1F',
    next: (s, a) => {
      const abroad = s.stage === 'EU' || s.stage === 'INT';
      if (!abroad) return { title: 'Home again', text: 'You are back closer to home. The homesick years are behind you, and they taught you more than you expected.', done: true };
      if (a.chapter === 0 && !a.v.family) {
        morale(s, -6);
        return { title: 'The second winter', text: 'Long winters, a language you only half speak, and games you watch from home at 4 a.m. Some weeks you count the days to summer.' };
      }
      morale(s, 8);
      bump(s, 'IQ', 1.5);
      return { title: 'Settled in', text: 'You order coffee without pointing now. The local fans sing your name, and the slower, smarter European game has made you a better player.', done: true };
    },
  },
  {
    id: 'rival',
    title: 'The rivalry',
    color: '#7A1F2B',
    next: (s, a, rng) => {
      if (s.stage !== 'NBA') return null;
      const won = chance(rng, clamp(0.35 + (userOvr(s) - 75) * 0.02, 0.2, 0.8));
      a.v.wins = (a.v.wins ?? 0) + (won ? 1 : 0);
      rep(s, won ? 3 : -2);
      morale(s, won ? 5 : -4);
      if (a.chapter >= 2) {
        rep(s, 2);
        return { title: a.v.wins >= 2 ? 'You won the rivalry' : 'He won the rivalry', text: a.v.wins >= 2 ? 'Three years of trash talk and big games, and the head-to-head is yours. At the end of it, you swap jerseys and mean it.' : 'He got the better of you more often than not. Still, the games made you both better, and the league loved every one of them.', done: true };
      }
      return { title: won ? 'Round to you' : 'Round to him', text: won ? 'You dropped a big game on him on national TV and let him hear about it.' : 'He went off against you and the clip went everywhere. You saved it on your phone.' };
    },
  },
  // round 9
  {
    id: 'brand',
    title: 'The shoe deal',
    color: '#1F6E5C',
    next: (s, a, rng) => {
      const startup = a.v.startup === 1;
      if (a.chapter === 0) {
        a.v.hit = chance(rng, startup ? 0.45 : 0.85) ? 1 : 0;
        if (a.v.hit) {
          const pay = startup ? 0.4 + s.player.rep / 60 : 0.2 + s.player.rep / 120;
          s.player.bank += pay;
          s.player.earnings += pay;
          rep(s, startup ? 5 : 3);
          return { title: startup ? 'Your shoe is a hit' : 'A steady check', text: startup ? 'The little brand put everything into your first shoe, and it sold out in every color. Kids at the park are wearing your logo.' : 'The big brand put you in an ad with three other players. The checks clear on time.' };
        }
        morale(s, -3);
        return { title: startup ? 'Nobody bought it' : 'Lost in the crowd', text: startup ? 'The shoe looked great and sold badly. The brand is behind on payments.' : 'You are one of fifty players on their roster. Nobody at the brand returns your calls.' };
      }
      if (a.v.hit && startup) {
        const pay = 1 + s.player.rep / 25;
        s.player.bank += pay;
        s.player.earnings += pay;
        rep(s, 4);
        return { title: 'Signature line', text: 'Shoe number two, a clothing line, a store in your hometown. The brand gives you a share of the company.', done: true };
      }
      return { title: 'Contract up', text: a.v.hit ? 'The deal ran its course. Good money, no headaches.' : 'You let the deal expire and sign somewhere smaller. Lesson learned.', done: true };
    },
  },
  {
    id: 'foundation',
    title: 'The foundation',
    color: '#2E6B3A',
    next: (s, a) => {
      if (a.chapter === 0) {
        morale(s, 5);
        rep(s, 3);
        return { title: 'The first court', text: 'The court back home opens with your name on the backboard. Two hundred kids show up on day one.' };
      }
      if (a.chapter === 1) {
        morale(s, 4);
        trust(s, 3);
        rep(s, 3);
        return { title: 'Summer camps', text: 'The foundation runs free camps in three cities now. You coach a session every summer, and teaching the basics makes you rethink your own.' };
      }
      rep(s, 6);
      morale(s, 6);
      s.awards.push({ year: s.year, level: s.stage === 'NBA' ? 'NBA' : 'NCAA', key: 'COMMUNITY', label: 'Community Assist Award' });
      return { title: 'Community Assist', text: 'The league honours your foundation with its community award. Your mother cries at the ceremony.', done: true };
    },
  },
  {
    id: 'sibling',
    title: 'Little brother',
    color: '#6E4A1F',
    next: (s, a, rng) => {
      if (a.chapter === 0) {
        a.v.good = chance(rng, 0.55) ? 1 : 0;
        morale(s, 3);
        return { title: a.v.good ? 'He can really play' : 'He is trying', text: a.v.good ? 'Your little brother made varsity as a freshman. He has your jumper and a better handle than you had.' : 'Your little brother is working hard, but he is two years behind where you were. He calls you after every game.' };
      }
      if (a.chapter === 1) {
        if (a.v.good) {
          morale(s, 6);
          rep(s, 2);
          return { title: 'Recruited', text: 'Coaches are calling him now. You sit in on every visit and ask the hard questions nobody asked for you.' };
        }
        morale(s, 2);
        return { title: 'A different road', text: 'He decides basketball is not his path and enrolls in engineering. He still beats you at video games.', done: true };
      }
      morale(s, 8);
      return { title: 'Same court', text: a.v.good ? 'He signs to play college ball. On signing day he wears your old jersey number.' : 'He graduates near the top of his class.', done: true };
    },
  },
  {
    id: 'mind',
    title: 'Mind game',
    color: '#3A4E7A',
    next: (s, a, rng) => {
      const talked = a.v.talked === 1;
      if (a.chapter === 0) {
        if (talked) {
          morale(s, 6);
          rep(s, 4);
          return { title: 'Thousands of messages', text: 'After you spoke about anxiety, the messages poured in. Players, fans, kids. You are sleeping better than you have in years.' };
        }
        morale(s, chance(rng, 0.5) ? -6 : -2);
        return { title: 'Bad nights', text: 'You never told anyone. Some nights the walls close in before games. You play through it, mostly.' };
      }
      if (talked || chance(rng, 0.5)) {
        morale(s, 8);
        s.player.growthMultNext *= 1.05;
        return { title: 'Steady', text: 'The work with your therapist shows on the court: calmer in close games, quicker to let a miss go.', done: true };
      }
      morale(s, -4);
      return { title: 'Still carrying it', text: 'You finally tell your coach. It is late, but it is a start.', done: true };
    },
  },
  {
    id: 'coach',
    title: 'The coach who believed',
    color: '#5C1F6E',
    next: (s, a, rng) => {
      if (a.chapter === 0) {
        bump(s, 'IQ', range(rng, 1, 2));
        trust(s, 5);
        s.player.growthMultNext *= 1.04;
        return { title: 'Extra sessions', text: 'Six a.m., every day, just the two of you. He breaks down your game and builds it back better.' };
      }
      a.v.left = chance(rng, 0.5) ? 1 : 0;
      if (a.v.left) {
        morale(s, -4);
        return { title: 'He takes another job', text: 'Your coach gets the head job somewhere else. He calls to say goodbye and gives you a list of things to work on. You keep it in your bag for years.', done: true };
      }
      bump(s, 'IQ', range(rng, 0.8, 1.5));
      morale(s, 5);
      return { title: 'Still in your corner', text: 'He stays, and you keep the six a.m. sessions going. Your feel for the game is the best it has ever been.', done: true };
    },
  },
];

const defOf = (id: string) => ARCS.find((d) => d.id === id);

/** Next chapter of every running storyline, once per offseason. */
export function processArcs(s: GameState): void {
  if (!s.arcs?.length || s.stage === 'RETIRED') return;
  for (const a of [...s.arcs]) {
    if (a.started >= s.year && a.chapter === 0 && a.v.fresh) {
      // it started this season: the first chapter comes next summer
      a.v.fresh = 0;
      continue;
    }
    const def = defOf(a.id);
    const before = snap(s);
    const ch = def ? def.next(s, a, s.rng) : null;
    a.chapter++;
    if (!def || !ch) {
      s.arcs = s.arcs.filter((x) => x !== a);
      continue;
    }
    const lines = changes(s, before).map((c) => `${c.label} ${c.value}`);
    pushMoment(s, { kind: 'event', title: `${def.title}: ${ch.title}`, text: ch.text, color: def.color, lines, arc: true });
    logDecision(s, 'arc', `${def.title}: ${ch.title.toLowerCase()}.`);
    if (ch.ask)
      pushDecision(s, { kind: 'arc', title: `${def.title}: ${ch.title}`, text: ch.ask.text, choices: ch.ask.choices, data: { arc: a.id } });
    if (ch.done) s.arcs = s.arcs.filter((x) => x !== a);
  }
}

export function resolveArc(s: GameState, d: Decision, id: string): string {
  const a = s.arcs?.find((x) => x.id === d.data?.arc);
  const def = a && defOf(a.id);
  if (!a || !def?.answer) return '';
  const before = snap(s);
  const text = def.answer(s, a, id, s.rng);
  s.result = { title: d.title, choice: d.choices.find((c) => c.id === id)?.label ?? '', text, changes: changes(s, before) };
  return text;
}

/** The turning points that start a storyline. */
export const ARC_EVENTS: EventDef[] = [
  {
    id: 'arc-family',
    stages: ALL,
    phase: 'both',
    when: (s) => s.player.age >= 16,
    weight: 0.65,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'A call from home',
    text: 'Your mother is sick. The doctors are hopeful but it will be a long fight, probably more than one season.',
    choices: [
      {
        label: 'Be there as much as you can',
        detail: 'Missed practices, long flights. Family first.',
        resolve: (s) => {
          morale(s, -4);
          trust(s, -3);
          startArc(s, 'family', { near: 1, fresh: 1 });
          return ok('You book the first flight home. The coach understands, mostly.', 'Put family first when his mother fell ill.');
        },
      },
      {
        label: 'Bury yourself in the game',
        detail: 'Basketball is the one thing you can control.',
        resolve: (s) => {
          morale(s, -2);
          bump(s, 'IQ', 1);
          startArc(s, 'family', { near: 0, fresh: 1 });
          return ok('You stay, and you work. Every night you call home.', 'Threw himself into basketball while his mother was sick.');
        },
      },
    ],
  },
  {
    id: 'arc-jumper',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.age <= 28 && s.player.attrs.SHT < 85,
    weight: 0.6,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'Tear down your jumper?',
    text: 'A shooting coach says your release is too low and too slow to hold up at the next level. Rebuilding it means a bad year first.',
    choices: [
      {
        label: 'Tear it down and rebuild it',
        detail: 'Worse this season, much better after. Probably.',
        resolve: (s) => {
          bump(s, 'SHT', -3.5);
          startArc(s, 'jumper', { fresh: 1 });
          return ok('The first week, you miss twenty in a row from the free-throw line. This will take a while.', 'Started rebuilding his jump shot from scratch.');
        },
      },
      {
        label: 'Just tweak the follow-through',
        resolve: (s) => {
          bump(s, 'SHT', 1);
          return ok('A small fix. A little better, nothing dramatic.');
        },
      },
    ],
  },
  {
    id: 'arc-ankle',
    stages: ALL,
    phase: 'mid',
    when: (s) => !s.player.injury && s.player.age >= 17,
    weight: 0.4,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'Rolled ankle',
    text: 'You land on a defender\'s foot and the ankle rolls badly. The X-rays are clean, but the ligaments are a mess.',
    choices: [
      {
        label: 'Sit out and let it heal properly',
        detail: 'Miss a month now.',
        resolve: (s) => {
          s.player.injury = { key: 'minor', name: 'Sprained ankle', daysOut: 30 };
          return ok('A month of rehab. It heals clean.', 'Let a bad ankle sprain heal fully.');
        },
      },
      {
        label: 'Tape it and keep playing',
        detail: 'It might nag you for years.',
        resolve: (s) => {
          trust(s, 4);
          startArc(s, 'ankle', { fresh: 1 });
          return ok('You play the next night on one good leg. The coach loves it. The ankle does not.', 'Played through a bad ankle sprain.');
        },
      },
    ],
  },
  {
    id: 'arc-veteran',
    stages: PRO,
    phase: 'both',
    when: (s) => s.player.age <= 26,
    weight: 0.5,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'The old pro',
    text: 'A 35-year-old veteran on your team, near the end of a long career, says he sees a lot of himself in you.',
    choices: [
      {
        label: 'Ask him to teach you everything',
        resolve: (s) => {
          bump(s, 'IQ', 1);
          startArc(s, 'veteran', { fresh: 1 });
          return ok('He laughs, then tells you to be at the gym at six.', 'Became the protégé of a veteran teammate.');
        },
      },
      {
        label: 'Thank him and do your own thing',
        resolve: (s) => {
          morale(s, 2);
          return ok('He shrugs. Plenty of young players say that.');
        },
      },
    ],
  },
  {
    id: 'arc-body',
    stages: ALL,
    phase: 'off',
    when: (s) => s.player.age >= 17 && s.player.age <= 27,
    weight: 0.5,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'Reshape your body',
    text: 'The strength coach has a two-year plan for your body. The first year will feel worse before it feels better.',
    choices: [
      {
        label: 'Add 15 pounds of muscle',
        detail: 'Slower this season, stronger after',
        resolve: (s) => {
          addPounds(s.player, 15, 0.6);
          startArc(s, 'body', { bulk: 1, fresh: 1 });
          return ok('You eat six meals a day. Your jeans stop fitting. Your first step feels heavy.', 'Started a two-year plan to add muscle.');
        },
      },
      {
        label: 'Get lean and quick',
        detail: 'Lighter this season, quicker after',
        resolve: (s) => {
          addPounds(s.player, -12, 0.6);
          startArc(s, 'body', { bulk: 0, fresh: 1 });
          return ok('Bigger players push you around for a while.', 'Started a two-year plan to get leaner.');
        },
      },
      { label: 'Keep your body as it is', resolve: () => ok('No changes. It got you this far.') },
    ],
  },
  {
    // round 32 (owner: "dating (highschool crush/celebrity/...) to wedding to having a child ... the
    // user should have a choice to deny it"): the start of Love, more often than other storylines
    id: 'arc-love',
    stages: ['NCAA', 'GL', 'EU', 'INT', 'NBA'],
    phase: 'off',
    when: (s) => s.player.age >= 20 && s.player.age <= 33 && !s.flags.gen2 && !s.flags.child && !s.arcs?.some((a) => a.id === 'love' || a.id === 'baby'),
    weight: 1.1,
    cooldownSeasons: 3,
    title: 'Someone special',
    text: 'There is someone you can’t stop thinking about.',
    choices: [
      {
        label: 'Your high school sweetheart',
        detail: 'They knew you before any of this',
        resolve: (s) => {
          startArc(s, 'love', { who: 1, fresh: 1 });
          s.flags.love = 1;
          morale(s, 4);
          return ok('You call after all these years. They pick up on the first ring.', 'Started dating his high school sweetheart.');
        },
      },
      {
        label: 'A celebrity you met at a gala',
        detail: 'Cameras everywhere you go',
        resolve: (s) => {
          startArc(s, 'love', { who: 2, fresh: 1 });
          s.flags.love = 2;
          morale(s, 3);
          rep(s, 2);
          return ok('Your first dinner is on every gossip site by morning.', 'Started dating a celebrity.');
        },
      },
      {
        label: 'Someone outside the game',
        detail: 'A quiet life away from the arena',
        resolve: (s) => {
          startArc(s, 'love', { who: 3, fresh: 1 });
          s.flags.love = 3;
          morale(s, 5);
          return ok('Nobody at the coffee shop knows who you are. You like that.', 'Started dating someone outside the game.');
        },
      },
      { label: 'Not now: basketball first', resolve: () => ok('You keep your mind on the game. Maybe another time.') },
    ],
  },
  {
    id: 'arc-investment',
    stages: PRO,
    phase: 'off',
    when: (s) => s.player.bank > 0.3,
    weight: 0.65,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'A friend\'s pitch',
    text: 'Your childhood friend is starting a company and wants you as the first big investor.',
    choices: [
      {
        label: 'Invest a fifth of your savings',
        detail: 'High risk',
        resolve: (s) => {
          const stake = s.player.bank * 0.2;
          s.player.bank -= stake;
          startArc(s, 'investment', { stake, fresh: 1 });
          return ok('You sign the papers at his kitchen table.', 'Invested in a friend\'s company.');
        },
      },
      {
        label: 'Politely say no',
        resolve: (s) => {
          morale(s, -3);
          return ok('He says he understands. Things are a little awkward after that.');
        },
      },
    ],
  },
  {
    id: 'arc-homesick',
    stages: ['EU', 'INT'],
    phase: 'mid',
    weight: 0.6,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'Homesick',
    text: 'It is your first winter abroad. The food, the language, the time difference: everything is harder than you expected.',
    choices: [
      {
        label: 'Fly your family over for a while',
        detail: 'Costs money',
        resolve: (s) => {
          s.player.bank = Math.max(0, s.player.bank - 0.02);
          morale(s, 6);
          startArc(s, 'homesick', { family: 1, fresh: 1 });
          return ok('Your mom cooks dinner in your tiny apartment. It feels like home for a week.', 'Brought his family over while playing abroad.');
        },
      },
      {
        label: 'Tough it out',
        resolve: (s) => {
          morale(s, -4);
          startArc(s, 'homesick', { family: 0, fresh: 1 });
          return ok('You sign up for language classes and eat a lot of takeout.', 'Toughed out a hard first winter abroad.');
        },
      },
    ],
  },
  {
    id: 'arc-rival',
    stages: ['NBA'],
    phase: 'mid',
    weight: 0.45,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'Called out',
    text: 'A young star on another team says on a podcast that you are overrated and that he would cook you one on one.',
    choices: [
      {
        label: 'Answer him on the court',
        resolve: (s, rng: Rng) => {
          const won = chance(rng, 0.5);
          rep(s, won ? 3 : -1);
          startArc(s, 'rival', { wins: won ? 1 : 0, fresh: 1 });
          return ok(won ? 'You drop 35 on him the next time you meet. The rivalry is on.' : 'He backs it up the first time. The rivalry is on.', 'A rivalry began with a young star.');
        },
      },
      {
        label: 'Ignore it',
        resolve: (s) => {
          trust(s, 2);
          return ok('No comment. The coach likes that.');
        },
      },
    ],
  },
  // round 9
  {
    id: 'arc-brand',
    stages: ['NCAA', 'GL', 'EU', 'INT', 'NBA'],
    phase: 'off',
    when: (s) => s.player.rep >= 25,
    weight: 0.5,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'Two shoe companies',
    text: 'A giant brand offers you a small deal. A young brand offers to build its whole line around you.',
    choices: [
      {
        label: 'Bet on the young brand',
        detail: 'Risky: a big payday if it works',
        resolve: (s) => {
          startArc(s, 'brand', { startup: 1, fresh: 1 });
          return ok('You sign with the startup. Your face is on their website by the weekend.', 'Signed a shoe deal with a young brand.');
        },
      },
      {
        label: 'Take the safe deal',
        resolve: (s) => {
          startArc(s, 'brand', { startup: 0, fresh: 1 });
          return ok('You sign with the giant. Free shoes for life.', 'Signed a shoe deal with a big brand.');
        },
      },
    ],
  },
  {
    id: 'arc-foundation',
    stages: ['GL', 'EU', 'INT', 'NBA'],
    phase: 'off',
    when: (s) => s.player.bank >= 0.5,
    weight: 0.65,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'Give something back',
    text: 'The park where you learned to play is falling apart. Your old coach asks if you could help.',
    choices: [
      {
        label: 'Start a foundation',
        resolve: (s) => {
          s.player.bank = Math.max(0, s.player.bank - Math.min(2, s.player.bank * 0.1));
          startArc(s, 'foundation', { fresh: 1 });
          return ok('You put up the money for a new court, and then some.', 'Started a foundation back home.');
        },
      },
      { label: 'Send a check', resolve: (s) => ((s.player.bank = Math.max(0, s.player.bank - 0.05)), rep(s, 1), ok('Your old coach thanks you.')) },
    ],
  },
  {
    id: 'arc-sibling',
    stages: ['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'],
    phase: 'both',
    when: (s) => s.player.age >= 17 && s.player.age <= 27,
    weight: 0.45,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'Little brother wants in',
    text: 'Your little brother, 13 now, asks if you will train him this summer.',
    choices: [
      {
        label: 'Train him every day',
        resolve: (s) => {
          startArc(s, 'sibling', { fresh: 1 });
          bump(s, 'PLY', 0.5);
          return ok('Teaching him the basics sharpens yours.', 'Started training his little brother.');
        },
      },
      { label: 'Find him a coach', resolve: (s) => (startArc(s, 'sibling', { fresh: 1 }), ok('You pay for a good youth coach.')) },
    ],
  },
  {
    id: 'arc-mind',
    stages: ['NCAA', 'GL', 'EU', 'INT', 'NBA'],
    phase: 'mid',
    weight: 0.4,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'Before the game',
    text: 'For weeks your heart races in the tunnel before tip-off. Last night you could not breathe in the locker room.',
    choices: [
      {
        label: 'Talk about it publicly',
        resolve: (s) => {
          startArc(s, 'mind', { talked: 1, fresh: 1 });
          return ok('You post a long message about anxiety. Your phone does not stop buzzing.', 'Spoke publicly about his mental health.');
        },
      },
      {
        label: 'Keep it to yourself',
        resolve: (s) => {
          startArc(s, 'mind', { talked: 0, fresh: 1 });
          morale(s, -3);
          return ok('You tape your ankles, put your headphones on, and say nothing.');
        },
      },
    ],
  },
  {
    id: 'arc-coach',
    stages: ['HS', 'NCAA', 'GL', 'EU', 'INT'],
    phase: 'off',
    when: (s) => s.player.age <= 24,
    weight: 0.5,
    cooldownSeasons: 99,
    oncePerCareer: true,
    title: 'An assistant coach notices',
    text: 'An assistant coach stops you after practice: he sees something in you and wants to work with you before sunrise, every day.',
    choices: [
      {
        label: 'Set the alarm',
        resolve: (s) => {
          startArc(s, 'coach', { fresh: 1 });
          return ok('Five-thirty alarms. You show up every day.', 'Started early-morning sessions with an assistant coach.');
        },
      },
      { label: 'You need your sleep', resolve: () => ok('He shrugs. The offer stands.') },
    ],
  },
];

