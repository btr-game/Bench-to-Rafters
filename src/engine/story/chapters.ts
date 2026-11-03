// Story mode's chapters (round 38, owner: "the story mode will totally rely on the relationship
// between the three"). Each is one page: the person, a few lines, two or three answers. Answers
// move the friend's drive (how far he goes), the bonds, a few switches later chapters read, and
// sometimes something real (a teammate, an assistant coach, the rival's team). One chapter comes a
// summer at most, the first that fits in the order below; a few open a season instead (meeting the
// rival, the friend's road being decided, draft night). Heavy ones always have a gentler way through
// (owner: "heavy at times, gentle path").

import { STORY_CH } from '../balance';
import { chance, clamp } from '../rng';
import type { Decision, GameState, StoryRole, StoryState } from '../types';
import { adjust, logDecision, pushDecision, teamById, userOvr } from '../career/common';
import { first, storyRng } from './cast';
import { hurtFriend } from './pals';

type Ctx = { s: GameState; st: StoryState };
interface Answer {
  id: string;
  label: string;
  detail?: string;
  /** What it does; returns the line shown after. */
  go: (c: Ctx) => string;
}
interface Chapter {
  id: string;
  who: StoryRole;
  title: string;
  /** 'start': it opens a season (story/pals.ts storySeason) rather than closing a summer. */
  at?: 'start';
  when: (c: Ctx) => boolean;
  lines: (c: Ctx) => string[];
  answers: (c: Ctx) => Answer[];
}

// ---- words ----
const F = (c: Ctx) => first(c.st.names.friend);
const R = (c: Ctx) => first(c.st.names.rival);
const P = (c: Ctx) => first(c.st.names.parent);
const S = (c: Ctx) => first(c.st.names.sibling);
const town = (c: Ctx) => (c.s.player.hometown || 'home').split(',')[0];
const myTeam = (c: Ctx) => (c.s.stage === 'NBA' || c.s.stage === 'NCAA' ? (teamById(c.s.stage === 'NBA' ? c.s.nba : c.s.league, c.s.teamId)?.name ?? null) : null);
const nba = (c: Ctx) => c.s.stage === 'NBA' && !!myTeam(c);

// ---- effects ----
function bond(c: Ctx, who: StoryRole, d: number): void {
  c.st.bond[who] = clamp((c.st.bond[who] ?? 0) + d, -3, 3);
}
const drive = (c: Ctx, d: number) => (c.st.friend.drive = clamp(c.st.friend.drive + d, -2, 8));
const seed = (c: Ctx, d: number) => (c.st.friend.coach = (c.st.friend.coach ?? 0) + d);
const morale = (c: Ctx, d: number) => (c.s.player.morale = adjust(c.s.player.morale, d));
const trust = (c: Ctx, d: number) => (c.s.player.trust = adjust(c.s.player.trust, d));
const rep = (c: Ctx, d: number) => (c.s.player.rep = clamp(c.s.player.rep + d, 0, 100));
const remember = (c: Ctx, who: StoryRole, id: string, text: string) => c.st.mem.push({ id, year: c.s.year, who, text });
const said = (c: Ctx, id: string) => c.st.mem.find((m) => m.id === id);
const did = (c: Ctx, id: string) => c.st.done.includes(id);
const roll = (c: Ctx, tag: string, p: number) => chance(storyRng(c.s, 'ch', tag), p);

const CHAPTERS: Chapter[] = [
  // ---------------- the friend, growing up ----------------
  {
    id: 'f-driveway',
    who: 'friend',
    title: 'The driveway',
    when: () => false, // the career's first page (startStory pushes it)
    lines: (c) => [
      `${F(c)} has been the other half of every game you ever played: same street in ${town(c)}, same driveway hoop, same busted net.`,
      `“Varsity tryouts are next week,” he says, spinning the ball on one finger. “Coach has one spot on the wing. One of us isn't making it.”`,
    ],
    answers: (c) => [
      { id: 'together', label: 'Train every morning until tryouts. Both of us.', go: () => (drive(c, 2), bond(c, 'friend', 1), remember(c, 'friend', 'f-driveway-together', 'Every morning until tryouts. Both of us.'), 'Six in the morning, every day, in the cold. You both get faster.') },
      { id: 'compete', label: 'Then may the best man win.', go: () => (drive(c, 1), remember(c, 'friend', 'f-driveway-compete', 'May the best man win.'), 'You go at each other all week. He hates losing to you, and it shows.') },
      { id: 'step', label: 'Take the spot. I will make it next year.', go: () => (drive(c, 1), bond(c, 'friend', 2), morale(c, -3), remember(c, 'friend', 'f-driveway-step', 'Take the spot.'), `${F(c)} looks at you a long time. “I won't forget that.”`) },
    ],
  },
  {
    id: 'f-summer',
    who: 'friend',
    title: 'Summer league',
    when: (c) => c.st.f.summers === 1 && c.s.stage === 'HS',
    lines: (c) => [`A travel team wants you for the summer circuit: scouts, sneaker money, flights. Just you.`, `${F(c)} has signed the two of you up for the summer league at the rec center, like every year.`],
    answers: (c) => [
      { id: 'together', label: 'Play the rec league with him.', go: () => (drive(c, 1), bond(c, 'friend', 1), remember(c, 'friend', 'f-summer-together', 'We played the rec league together.'), 'You lose every game. It is the best summer either of you will remember.') },
      { id: 'alone', label: 'Take the travel team.', go: () => (bond(c, 'friend', -1), rep(c, 3), remember(c, 'friend', 'f-summer-alone', 'You went to that travel team without me.'), 'The scouts start to know your name. The texts from home slow down.') },
      {
        id: 'bring',
        label: 'Get him a tryout with the travel team.',
        go: () => {
          drive(c, 2);
          if (roll(c, 'travel', STORY_CH.travelMakes)) {
            c.st.f.travel = 1;
            bond(c, 'friend', 1);
            return `${F(c)} makes the team. Two kids from ${town(c)} on every flight.`;
          }
          return `${F(c)} gets cut on the second day. He says he is fine. He trains twice as hard.`;
        },
      },
    ],
  },
  {
    id: 'f-grades',
    who: 'friend',
    title: 'The grades',
    when: (c) => c.st.f.summers === 2 && c.s.stage === 'HS',
    lines: (c) => [`${F(c)} pulls you aside after practice. “If I fail chemistry, no school will look at me. My mom doesn't know yet.”`],
    answers: (c) => [
      { id: 'study', label: 'Study with him every night.', go: () => (drive(c, 1), bond(c, 'friend', 1), (c.s.player.attrs.IQ += 0.4), 'Kitchen table, flash cards, cold pizza. He passes. You learn something too.') },
      { id: 'coach', label: 'Ask Coach to find him a tutor.', go: () => (drive(c, 1), seed(c, 1), 'Coach finds him a tutor, and keeps him after for film. He sees things on tape nobody else does.') },
      { id: 'out', label: 'It is his life. Stay out of it.', go: () => (drive(c, -1), bond(c, 'friend', -1), 'He scrapes a pass. He does not ask you for anything again for a while.') },
    ],
  },
  {
    id: 'p-ride',
    who: 'parent',
    title: 'The car rides',
    when: (c) => c.st.f.summers === 3 && c.s.stage === 'HS',
    lines: (c) => [`${P(c)} has driven you to every gym in the state. Five in the morning, the heater rattling, the radio low.`, `Tonight ${P(c)} says, eyes on the road: “I took the night shift so I could do the mornings. Don't tell anyone.”`],
    answers: (c) => [
      { id: 'thank', label: 'Say thank you. Mean it.', go: () => (bond(c, 'parent', 1), remember(c, 'parent', 'p-ride-thank', 'You said thank you in the car.'), `${P(c)} turns the radio up so you will not see the tears.`) },
      { id: 'promise', label: 'Promise to pay it all back one day.', go: () => (bond(c, 'parent', 1), (c.st.f.promise = 1), remember(c, 'parent', 'p-ride-promise', 'I will pay it all back one day.'), '“Just play,” comes the answer. But it is written down somewhere now.') },
      { id: 'sleep', label: 'Pretend you are asleep.', go: () => (morale(c, 2), 'You keep your eyes shut and listen to the engine. Some things are too big to answer.') },
    ],
  },
  {
    id: 'f-signing',
    who: 'friend',
    title: 'Signing day',
    when: (c) => c.st.f.summers === 4 && c.s.stage === 'HS',
    lines: (c) => [`The big schools want you. ${F(c)} has two offers, both small.`, `“Take me with you,” he says, half joking. Then not joking at all.`],
    answers: (c) => [
      { id: 'with', label: 'Ask your college to take him too.', go: () => ((c.st.f.sameCollege = 1), drive(c, 1), bond(c, 'friend', 1), 'They say yes, as a walk-on. Same team again. He will have to fight for every minute.') },
      { id: 'play', label: 'Tell him to go where he will play.', go: () => (drive(c, 2), remember(c, 'friend', 'f-signing-play', 'Go where you will play.'), `He signs with Valley State. He will start from the first day.`) },
      { id: 'quiet', label: 'Say nothing; let him choose.', go: () => (bond(c, 'friend', -1), 'He picks a school two states away. The drive home is quiet.') },
    ],
  },
  // ---------------- the rival ----------------
  {
    id: 'r-meet',
    who: 'rival',
    title: 'The other side of the bracket',
    at: 'start',
    when: (c) => !!c.st.rival,
    lines: (c) => [
      `${c.st.names.rival} plays for ${c.st.rival?.team || 'the other school'}: the freshman every paper prints next to your name, and always just above it.`,
      `At media day he catches your eye across the room. “Enjoy it while it lasts. March is mine.”`,
    ],
    answers: (c) => [
      { id: 'laugh', label: 'Laugh it off.', go: () => (morale(c, 1), 'You laugh. He does not.') },
      { id: 'answer', label: '“See you in March.”', go: () => (morale(c, 3), bond(c, 'rival', -1), c.st.rival && (c.st.rival.drive += 1), remember(c, 'rival', 'r-meet-answer', 'See you in March.'), 'The room goes quiet, then the cameras find you both. It has started.') },
      { id: 'hand', label: 'Walk over and shake his hand.', go: () => (bond(c, 'rival', 1), remember(c, 'rival', 'r-meet-hand', 'You shook my hand at media day.'), 'He shakes it, surprised. He grips a little too hard.') },
    ],
  },
  {
    id: 'f-minutes',
    who: 'friend',
    title: 'Eleven minutes',
    when: (c) => c.s.stage === 'NCAA' && c.s.ncaaYear >= 1,
    lines: (c) =>
      c.st.f.sameCollege
        ? [`${F(c)} played eleven minutes all season. He laughs about it. He does not laugh about it.`]
        : [`${F(c)} is starting at Valley State and putting up numbers nobody watches. “Twenty a night,” he says. “On a channel my mom can't find.”`],
    answers: (c) => [
      { id: 'stairs', label: 'Run the stadium stairs with him all summer.', go: () => (drive(c, 2), bond(c, 'friend', 1), (c.s.player.wear = Math.min(100, (c.s.player.wear ?? 0) + 4)), 'Every morning, every step, until neither of you can feel your legs.') },
      { id: 'see', label: 'Tell him he sees the game like a coach.', go: () => (seed(c, 2), drive(c, -1), remember(c, 'friend', 'f-minutes-see', 'You see the game like a coach.'), 'He laughs it off. Then he starts drawing plays on napkins.') },
      { id: 'believe', label: '“They will find you. Keep going.”', go: () => (drive(c, 1), bond(c, 'friend', 1), 'He keeps going.') },
    ],
  },
  {
    id: 'r-march',
    who: 'rival',
    title: 'Two points',
    when: (c) => c.s.stage === 'NCAA' && !!c.st.rival && did(c, 'r-meet'),
    lines: (c) => [`${R(c)}'s team beat yours in the conference final. He scored two more points than you did.`, `He always seems to score two more.`],
    answers: (c) => [
      { id: 'tape', label: 'Watch the tape every night until you know his moves.', go: () => ((c.s.player.attrs.IQ += 0.5), c.st.rival && (c.st.rival.drive += 1), 'You learn his left hand, his tell before a spin. He is learning yours.') },
      { id: 'text', label: 'Text him: “Good game.”', go: () => (bond(c, 'rival', 1), `Three dots, for a long time. Then: “You too.”`) },
      { id: 'forget', label: 'Delete the highlights. Move on.', go: () => (morale(c, 2), 'Out of sight. Not out of mind.') },
    ],
  },
  {
    id: 'f-fork',
    who: 'friend',
    title: 'The scouts decide',
    at: 'start',
    when: (c) => !!c.st.friend.track,
    lines: (c) => {
      const f = c.st.friend;
      const early = said(c, 'f-driveway-together') ? ` “Six in the morning, remember? Every morning until tryouts.”` : '';
      if (f.track === 'star') return [`${F(c)} spent the summer in a gym nobody knew about and came back a different player. Scouts who never said his name cannot stop saying it now.${early}`];
      if (f.track === 'pro') return [`${F(c)} gets the call: a roster spot in the league. Not a star's deal. A real one.${early}`];
      return [`The draft came and went. Nobody called ${F(c)}'s name. An end-of-the-bench deal is all there is, for one season.`];
    },
    answers: (c) => {
      const f = c.st.friend;
      if (f.track === 'bust')
        return [
          { id: 'workout', label: 'Get him a workout with your team.', go: () => (bond(c, 'friend', 1), roll(c, 'workout', STORY_CH.workoutSaves) ? ((f.track = 'pro'), 'He kills the workout. A real contract, one more door open.') : 'He works out well. They thank him and keep his number.') },
          { id: 'coach', label: 'Tell him to coach. He was always the smart one.', go: () => (seed(c, 2), remember(c, 'friend', 'f-fork-coach', 'You were always the smart one.'), '“Not yet,” he says. But he keeps the notebook of plays.') },
          { id: 'chase', label: 'Tell him to chase it overseas.', go: () => (drive(c, 1), 'He buys a winter coat and a phrasebook.') },
        ];
      return [
        { id: 'proud', label: 'Tell him he earned every bit of it.', go: () => (bond(c, 'friend', 1), 'He calls his mom on speaker so you can hear her scream.') },
        { id: 'race', label: '“Still better than you.”', go: () => ((c.st.f.friendly = 1), bond(c, 'friend', 1), remember(c, 'friend', 'f-fork-race', 'Still better than you.'), '“We will see,” he grins. It is a promise.') },
        { id: 'train', label: 'Ask to train with him this summer.', go: () => ((c.s.player.growthMultNext = (c.s.player.growthMultNext ?? 1) * STORY_CH.trainGrowth), 'Two gyms became one. You push each other harder than any coach.') },
      ];
    },
  },
  // ---------------- the draft ----------------
  {
    id: 't-draft',
    who: 'rival',
    title: 'Draft night',
    at: 'start',
    when: (c) => nba(c) && c.s.serviceYears === 0 && !!c.st.rival,
    lines: (c) => [
      `${R(c)} goes one pick before you. On the way down the stairs he leans in close: “Story of your life.”`,
      c.st.friend.lv === 'NBA' ? `${F(c)} is in the green room too. Two from ${town(c)}, one night.` : `${F(c)} is watching from the rec center with half of ${town(c)}. You can hear them through the phone.`,
    ],
    answers: (c) => [
      { id: 'friend', label: `Find ${F(c)} first.`, go: () => (bond(c, 'friend', 1), 'Before the cameras, before the cap, you call him. He is crying. So are you.') },
      { id: 'rival', label: `“Long career, ${R(c)}. We will see.”`, go: () => (c.st.rival && (c.st.rival.drive += 1), morale(c, 3), remember(c, 'rival', 't-draft-rival', 'Long career. We will see.'), 'He smiles like he has already won.') },
      { id: 'family', label: `Hug ${P(c)} and do not let go.`, go: () => (bond(c, 'parent', 1), 'For a minute the arena is just the two of you, and the car rides.') },
    ],
  },
  {
    id: 'p-house',
    who: 'parent',
    title: 'The house',
    when: (c) => nba(c) && !!c.s.contract && c.s.serviceYears >= 1,
    lines: (c) => [`The first real cheque clears. ${P(c)} still lives in the house with the driveway hoop.${said(c, 'p-ride-promise') ? ' You remember what you promised in the car.' : ''}`],
    answers: (c) => [
      { id: 'house', label: `Buy ${P(c)} a house.`, go: () => ((c.s.player.bank -= STORY_CH.house), bond(c, 'parent', 2), 'Keys on a ribbon. A porch. The old hoop comes too.') },
      { id: 'debts', label: 'Pay off every debt instead.', go: () => ((c.s.player.bank -= STORY_CH.debts), bond(c, 'parent', 1), 'No more envelopes on the kitchen table.') },
      { id: 'wait', label: 'Wait until the second contract.', go: () => (bond(c, 'parent', -1), '“There is no rush,” ' + P(c) + ' says, a little too quickly.') },
    ],
  },
  // ---------------- the friend, grown up ----------------
  {
    id: 'f-fan',
    who: 'friend',
    title: 'The loudest seat',
    when: (c) => nba(c) && c.st.friend.lv === 'OUT',
    lines: (c) => [`${F(c)} is out of the league. He has a ticket two rows behind your bench and knows every play before you run it.`],
    answers: (c) => [
      { id: 'seats', label: 'Get him floor seats for life.', go: () => (bond(c, 'friend', 1), 'He wears your jersey to every game. He boos the refs louder than anyone.') },
      { id: 'bench', label: 'Tell him the bench could use a voice like his.', go: () => (seed(c, 2), (c.st.friend.lv = 'COACH'), (c.st.friend.team = 'Valley State'), (c.st.friend.since = c.s.year), 'He takes a job at Valley State. The players love him by the second week.') },
      { id: 'film', label: 'Ask him to watch film with you.', go: () => ((c.s.player.attrs.IQ += 0.5), seed(c, 1), 'Tuesday nights, his couch, your film. He sees everything.') },
    ],
  },
  {
    id: 'f-coach',
    who: 'friend',
    title: 'Coach ' + 'on the bench',
    when: (c) => nba(c) && c.st.friend.lv === 'COACH' && c.s.player.age >= STORY_CH.coachAge && !c.st.f.friendCoach,
    lines: (c) => [`${F(c)} has been coaching at ${c.st.friend.team || 'a college'}. An NBA staff called him. Then he says: “It's your team. I won't take it unless you want me there.”`],
    answers: (c) => [
      { id: 'hire', label: 'Tell your coach to hire him.', go: () => ((c.st.f.friendCoach = 1), (c.st.friend.team = myTeam(c) ?? c.st.friend.team), bond(c, 'friend', 1), trust(c, 3), `${F(c)} is an assistant on your bench. Every timeout he finds your eye.`) },
      { id: 'own', label: 'Tell him to take a job that is his own.', go: () => (bond(c, 'friend', 1), 'He takes a job across the league, and calls you after every win.') },
    ],
  },
  {
    id: 'f-join',
    who: 'friend',
    title: 'Same jersey',
    when: (c) => nba(c) && c.st.friend.lv === 'NBA' && c.st.friend.track !== 'bust' && c.st.friend.team !== myTeam(c) && c.s.serviceYears >= 2 && !c.st.f.friendJoined,
    lines: (c) => [`${F(c)}'s contract is up. “Your team called,” he says. “I'll sign if you want me there. Say the word.”`],
    answers: (c) => [
      { id: 'yes', label: '“Get here.”', go: () => ((c.st.f.friendJoined = 1), (c.st.friend.team = myTeam(c) ?? c.st.friend.team), bond(c, 'friend', 1), `Same team, like the driveway. From the next season, ${F(c)} plays beside you.`) },
      { id: 'money', label: 'Tell him to take the bigger offer.', go: () => (bond(c, 'friend', 1), (c.st.f.friendJoined = -1), 'He takes the money and buys his mom a car. Fair.') },
      ...(c.st.rival?.lv === 'NBA' && c.st.rival.team !== myTeam(c)
        ? [{ id: 'rival', label: `“What did ${R(c)}'s team offer?”`, go: () => ((c.st.f.friendJoined = -1), (c.st.f.withRival = 1), (c.st.friend.team = c.st.rival!.team), bond(c, 'friend', -1), `He goes quiet. A week later he signs with ${R(c)}'s team.`) }]
        : []),
    ],
  },
  {
    id: 'f-mvp',
    who: 'friend',
    title: 'Better than you',
    when: (c) => nba(c) && c.st.friend.track === 'star' && c.st.friend.lv === 'NBA' && c.st.friend.ovr >= userOvr(c.s) + STORY_CH.starAhead,
    lines: (c) => [`${F(c)} is the best player in the league now. The kid from your driveway. The papers ask how that feels.`, `He texts before anyone else can: “Still your driveway.”`],
    answers: (c) => [
      { id: 'proud', label: 'Tell him the truth: you are proud of him.', go: () => (bond(c, 'friend', 1), morale(c, 2), 'He sends a photo of the old hoop. Somebody fixed the net.') },
      { id: 'chase', label: '“Not for long.”', go: () => ((c.st.f.friendly = 1), morale(c, 4), remember(c, 'friend', 'f-mvp-chase', 'Not for long.'), 'Game on. The best kind of rivalry: the one you want the other guy to win, nearly.') },
      { id: 'summer', label: 'Ask to train with him this summer.', go: () => ((c.s.player.growthMultNext = (c.s.player.growthMultNext ?? 1) * STORY_CH.trainGrowth), bond(c, 'friend', 1), 'He shows you what he found in that gym nobody knew about.') },
    ],
  },
  // ---------------- the three of them ----------------
  {
    id: 't-together',
    who: 'friend',
    title: 'The same locker room',
    when: (c) => nba(c) && c.st.f.withRival === 1,
    lines: (c) => [`${F(c)} and ${R(c)}, same team, same locker room. ${F(c)} calls before the news breaks: “Don't hate me. They need a guy like me. I need the money.”`],
    answers: (c) => [
      { id: 'fine', label: '“Go get paid.”', go: () => (bond(c, 'friend', 1), 'He breathes out. “Tell me you’ll still kill us when we play you.”') },
      { id: 'hurt', label: 'Hang up.', go: () => (bond(c, 'friend', -2), morale(c, -3), 'He texts four times. You read them all. You answer none.') },
      { id: 'spy', label: `“Tell me how ${R(c)} guards the pick and roll.”`, go: () => (bond(c, 'friend', 1), 'He laughs so hard he has to put the phone down.') },
    ],
  },
  {
    id: 't-hit',
    who: 'rival',
    title: 'The hit',
    when: (c) => nba(c) && c.st.friend.lv === 'NBA' && c.st.rival?.lv === 'NBA' && c.st.friend.team !== c.st.rival.team && c.s.serviceYears >= 2 && roll(c, 'hit', STORY_CH.hit),
    lines: (c) => [`In March, ${R(c)} came down on ${F(c)}'s knee going for a rebound. The replay is all anyone shows: did he mean it?`, `${F(c)} will miss next season, maybe more.`],
    answers: (c) => {
      hurtFriend(c.s, c.st);
      return [
        { id: 'confront', label: `Call ${R(c)} out in front of every camera.`, go: () => (bond(c, 'rival', -2), (c.st.f.feud = 1), rep(c, 2), morale(c, 3), remember(c, 'rival', 't-hit-confront', 'You called me out in front of everyone.'), 'It is personal now. Every game against him is a war.') },
        { id: 'bedside', label: `Sit with ${F(c)} at the hospital.`, go: () => (bond(c, 'friend', 2), 'You miss a flight. You miss a practice. You do not miss the surgery.') },
        { id: 'ask', label: `Call ${R(c)} and ask him straight: on purpose?`, go: () => ((c.st.f.asked = 1), 'A long silence. “No,” he says. You do not know if you believe him.') },
      ];
    },
  },
  {
    id: 't-apology',
    who: 'rival',
    title: 'The apology',
    when: (c) => did(c, 't-hit') && !!c.st.rival && c.st.rival.lv !== 'OUT',
    lines: (c) => [`${R(c)} is at your door. He looks smaller than he does on the court.`, `“I didn't mean it. I need you to believe that. I need ${F(c)} to.”`],
    answers: (c) => [
      { id: 'forgive', label: 'Believe him.', go: () => ((c.st.f.feud = 0), bond(c, 'rival', 2), '“Thank you,” he says, and means it. Something between you changes.') },
      { id: 'friend', label: `“Don't tell me. Tell ${F(c)}.”`, go: () => (bond(c, 'rival', 1), bond(c, 'friend', 1), (c.st.f.feud = 0), `He goes. ${F(c)} tells you later they talked for two hours.`) },
      { id: 'never', label: 'Close the door.', go: () => ((c.st.f.feud = 1), c.st.rival && (c.st.rival.drive += 1), 'Through the door you hear him say your name once more. Then nothing.') },
    ],
  },
  // ---------------- the rival in the league ----------------
  {
    id: 'r-trade',
    who: 'rival',
    title: 'The rumour',
    when: (c) => nba(c) && c.st.rival?.lv === 'NBA' && c.st.rival.team !== myTeam(c) && c.s.serviceYears >= 3 && !c.st.f.feud,
    lines: (c) => [`Your front office calls: they can get ${c.st.names.rival}. The two of you on one team, if you can stand each other.`],
    answers: (c) => {
      const join = () => {
        c.st.rival!.team = myTeam(c) ?? c.st.rival!.team;
        c.st.f.rivalJoined = 1;
      };
      return [
        { id: 'ask', label: 'Tell them to make the call.', go: () => (join(), bond(c, 'rival', 1), `Done. ${R(c)} is your teammate. The first practice is very, very quiet.`) },
        { id: 'against', label: 'Ask them not to.', go: () => (morale(c, 1), 'They let it go. Some rivalries are better from across the court.') },
        { id: 'team', label: 'Let the team decide.', go: () => (roll(c, 'trade', 0.5) ? (join(), trust(c, 2), `The deal goes through. ${R(c)} wears your colours now.`) : (trust(c, 2), 'The deal dies on the last day. Your coach thanks you for trusting him.')) },
      ];
    },
  },
  {
    id: 'r-teammates',
    who: 'rival',
    title: 'One ball',
    when: (c) => nba(c) && c.st.f.rivalJoined === 1 && c.st.rival?.team === myTeam(c),
    lines: () => [`Down one, nine seconds left, a timeout. The play could be drawn for either of you. You both look at the coach.`],
    answers: (c) => [
      { id: 'give', label: `Give ${R(c)} the shot.`, go: () => (bond(c, 'rival', 2), `He makes it. In the pile at centre court he finds you first.`) },
      { id: 'take', label: 'Take it yourself.', go: () => (rep(c, 2), bond(c, 'rival', -1), 'You make it. He claps once, slowly.') },
      { id: 'coach', label: 'Let the coach decide.', go: () => (trust(c, 3), 'The coach draws it for you, and a decoy for him. It works because he sells it.') },
    ],
  },
  {
    id: 'r-allstar',
    who: 'rival',
    title: 'One night on the same side',
    when: (c) => nba(c) && c.st.rival?.lv === 'NBA' && c.s.awards.some((a) => a.key === 'ALLSTAR' && a.year === c.s.year - 1),
    lines: (c) => [`All-Star weekend: same bench, same side for once. ${R(c)} says nothing for a quarter. Then: “You know you're the only one I ever measured myself against?”`],
    answers: (c) => [
      { id: 'same', label: '“Same.”', go: () => (bond(c, 'rival', 2), (c.st.f.feud = 0), 'Ten years of it in one word. He laughs, and you both look away.') },
      { id: 'joke', label: '“And you’re still two points ahead.”', go: () => (bond(c, 'rival', 1), '“Always will be,” he says. It sounds almost fond.') },
      { id: 'quiet', label: 'Say nothing.', go: () => 'You let it sit. Some things are better unanswered.' },
    ],
  },
  {
    id: 's-sibling',
    who: 'sibling',
    title: 'The younger one',
    when: (c) => nba(c) && c.s.serviceYears >= 4,
    lines: (c) => [`${S(c)} is a senior now, and good. Scouts come to watch, and half of them ask about you.`],
    answers: (c) => [
      { id: 'train', label: 'Train with the kid every summer.', go: () => (bond(c, 'sibling', 2), 'The driveway hoop gets a new net. The same busted backboard.') },
      { id: 'agent', label: 'Find the kid a good agent.', go: () => (bond(c, 'sibling', 1), 'A good one. Not a shark.') },
      { id: 'own', label: 'Let the kid find a way alone.', go: () => (bond(c, 'sibling', -1), '“Fine,” and the door closes. It is meant kindly. It does not land that way.') },
    ],
  },
  {
    id: 'r-last',
    who: 'rival',
    title: 'His last season',
    when: (c) => nba(c) && !!c.st.rival?.last && c.st.rival.last === c.s.year + 1,
    lines: (c) => [`${R(c)} is retiring after next season. One step ahead of you to the very end.`],
    answers: (c) => [
      { id: 'go', label: 'Fly to his last game.', go: () => (bond(c, 'rival', 2), 'You sit courtside. When they announce his name he finds you in the crowd.') },
      { id: 'video', label: 'Send a video for the tribute.', go: () => (bond(c, 'rival', 1), 'Thirty seconds. You record it nine times.') },
      { id: 'away', label: 'Stay away.', go: () => 'You watch it at home, alone, with the sound off.' },
    ],
  },
  {
    id: 'f-last',
    who: 'friend',
    title: 'The driveway, again',
    when: (c) => c.s.stage !== 'RETIRED' && (c.s.retireRecommended || c.s.player.age >= STORY_CH.lastAge || c.s.flags.farewell === c.s.year + 1),
    lines: (c) => [`${F(c)} shows up with the old ball from the driveway, the letters worn off it. “One more game to eleven? Before you're too old.”`],
    answers: (c) => [
      { id: 'play', label: 'Play to eleven.', go: () => (bond(c, 'friend', 1), remember(c, 'friend', 'f-last-play', 'One more game to eleven.'), 'He wins. Of course he wins. Neither of you mentions it.') },
      { id: 'ball', label: 'Give him the game ball from tonight.', go: () => (bond(c, 'friend', 1), 'He puts it on a shelf next to the old one.') },
      { id: 'rafters', label: 'Tell him it belongs in the rafters.', go: () => ((c.st.f.rafterBall = 1), 'Wherever your number goes up, that ball goes with it.') },
    ],
  },
];

const BY_ID = new Map(CHAPTERS.map((ch) => [ch.id, ch]));

function toDecision(c: Ctx, ch: Chapter): Omit<Decision, 'id'> {
  const lines = ch.lines(c);
  const answers = ch.answers(c);
  return {
    kind: 'story',
    title: ch.title,
    text: lines.join(' '),
    choices: answers.map((a) => ({ id: a.id, label: a.label, detail: a.detail })),
    data: { ch: ch.id, who: ch.who, name: c.st.names[ch.who], lines },
  };
}

/** The first chapter that fits (`at`: a season's start, or the end of a summer), as a decision. */
export function pushStory(s: GameState, at: 'start' | 'summer'): void {
  const st = s.story;
  if (!st || s.stage === 'RETIRED') return;
  if (at === 'summer') st.f.summers = (st.f.summers ?? 0) + 1;
  const c = { s, st };
  for (const ch of CHAPTERS) {
    if (did(c, ch.id) || (ch.at ?? 'summer') !== at || s.pending.some((d) => d.kind === 'story' && d.data?.ch === ch.id)) continue;
    if (!ch.when(c)) continue;
    pushDecision(s, toDecision(c, ch));
    return;
  }
}

/** The career's first page (flow.ts newGame), ahead of the first season's plan. */
export function openStory(s: GameState): void {
  const st = s.story;
  if (!st) return;
  pushDecision(s, toDecision({ s, st }, BY_ID.get('f-driveway')!));
  s.pending.unshift(s.pending.pop()!);
}

/** An answer: what it does, the chapter marked played, and the line shown after. */
export function resolveStory(s: GameState, d: Decision, id: string): string | null {
  const st = s.story;
  const ch = BY_ID.get(String(d.data?.ch ?? ''));
  if (!st || !ch) return null;
  const c = { s, st };
  const a = ch.answers(c).find((x) => x.id === id) ?? ch.answers(c)[0];
  const out = a.go(c);
  st.done.push(ch.id);
  logDecision(s, 'story', `${ch.title}: ${a.label} ${out}`);
  return out;
}

/** The chapters in play order (the dev deck, the tests). */
export const STORY_CHAPTERS = CHAPTERS.map((ch) => ({ id: ch.id, who: ch.who, title: ch.title }));
