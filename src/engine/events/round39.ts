// Rounds 38 to 40's turning points (the checklist, item 6). Round 38 wrote story mode (his friend
// from the driveway, the rival a small step ahead, his family), round 39 put the last six minutes
// of the biggest playoff games on the Floor and an airport on the road map, round 40 put the game in
// six languages. Eight that bring them into a career:
// - the Floor: the video staff's reel of the last six minutes he played (his touch at the line);
//   "the closer", after a Floor win with a game-winner, a late block or a comeback; and the summer
//   after a season ended on the Floor;
// - story mode (a story career only, and only where it plays, in the States): a call from his
//   parent; his friend in the hometown paper (wherever his road has taken him); his rival on the
//   cover of the preview issue;
// - and two for any career: fan mail from abroad in five languages, and the red-eye home after a
//   loss out west.
// The Floor's marks come from career/live.ts floorFinish, which counts only the games he played
// himself (the harness lets the engine play them, so these never come up there). Small effects,
// like the rest of the book; the story ones move a bond by one at most.

import { clamp } from '../rng';
import type { AttrKey, GameState, Stage, StoryRole } from '../types';
import { adjust } from '../career/common';
import { ATTR_MAX } from '../balance';
import { addTouch } from '../player/touch';
import { first } from '../story/cast';
import type { EventDef } from './defs';

const NBA: Stage[] = ['NBA'];
// story careers stay in the States: college, the G League, the NBA
const STATES: Stage[] = ['NCAA', 'GL', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const wear = (s: GameState, v: number) => (s.player.wear = clamp((s.player.wear ?? 0) + v, 0, 100));
const spend = (s: GameState, m: number) => (s.player.bank = Math.max(0, s.player.bank - m));
const ok = (outcome: string, log?: string) => ({ outcome, log });
/** A story person's feeling for him, −3 to +3, as the chapters move it. */
const bond = (s: GameState, who: StoryRole, v: number) => {
  if (s.story) s.story.bond[who] = clamp((s.story.bond[who] ?? 0) + v, -3, 3);
};
/** A story person, by first name. */
const nameOf = (s: GameState, who: StoryRole): string => first(s.story?.names[who] ?? 'him');
const town = (s: GameState): string => s.player.hometown.split(',')[0].trim() || 'your hometown';
const fl = (s: GameState, k: string): number => s.flags[k] ?? 0;

/** The windows of the round's turning points (each tested in tests/round39-events.test.ts). */
export const R39 = {
  call: { age: 18 },
  rival: { serviceYears: 1 },
  mail: { rep: 55 },
};

/** A Floor win of his that people talk about: a comeback from ten down, a game-winner or a late block. */
export const floorDrama = (s: GameState): boolean => fl(s, 'floorBack') + fl(s, 'floorWinner') + fl(s, 'floorStop') > 0;

/** Where the friend's road has taken him, for the hometown paper. */
function friendStory(s: GameState): string {
  const f = s.story!.friend;
  const F = nameOf(s, 'friend');
  if (f.lv === 'NBA') return `a full page on ${F}: the driveway photo from when you were both twelve, and a headline about two kids from the same street making the league`;
  if (f.lv === 'COACH') return `a full page on ${F}, Coach ${f.name.split(' ').pop()} now, with a whistle and a clipboard and the same grin from the driveway`;
  return `a full page on ${F}, who opened a gym for kids on the old street: two hoops, one rule, nobody gets cut`;
}

export const ROUND39_EVENTS: EventDef[] = [
  // ---------------- the Floor ----------------
  {
    id: 'floorFilm',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => fl(s, 'floorPlayed') >= 1,
    weight: 1.2,
    cooldownSeasons: 1,
    title: 'The last six minutes, on film',
    text: 'The video staff has cut every possession you played on the Floor into one reel: twelve minutes, no music. The free throws, the switches, the shot you passed up with four seconds left. The coach leaves the tablet on your chair.',
    choices: [
      {
        label: 'Watch it every morning for a month',
        detail: 'Calmer at the line; a long month',
        resolve: (s) => {
          addTouch(s.player, 2);
          bump(s, 'IQ', 0.2);
          morale(s, -1);
          return ok('By the third week you can call every possession before it happens. The free throws stop surprising you.', 'Watched his last six minutes on the Floor every morning for a month.');
        },
      },
      {
        label: 'Watch it once, with the coach',
        detail: 'His notes, your film',
        resolve: (s) => {
          bump(s, 'IQ', 0.3);
          trust(s, 2);
          return ok('He pauses it eleven times. Ten are about your feet. The last one is a pat on the back.');
        },
      },
      {
        label: 'Shoot free throws on tired legs instead',
        detail: 'Sprints, then two shots, all summer',
        resolve: (s) => {
          addTouch(s.player, 2.5);
          wear(s, 2);
          return ok('Suicide, two shots. Suicide, two shots. By August you make them with your lungs on fire.');
        },
      },
    ],
  },
  {
    id: 'floorCloser',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: floorDrama,
    weight: 1.2,
    cooldownSeasons: 1,
    title: 'The closer',
    text: 'A columnist calls you the coldest man in the league over the last six minutes of a big game. The highlight is everywhere. In the locker room your teammates have started calling you "Six Minutes".',
    choices: [
      {
        label: 'Wear it: hand up in every huddle',
        detail: 'A bigger name; some teammates roll their eyes',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 2);
          trust(s, -1);
          return ok('"Six Minutes" is on a T-shirt by the weekend. You buy the first one.', 'Took the name the papers gave him: the closer.');
        },
      },
      {
        label: 'Hand it to the guys who set the screens',
        detail: 'The locker room remembers',
        resolve: (s) => {
          trust(s, 3);
          morale(s, 1);
          return ok('You name every screen on the last play, in order. The centre who set the last one buys dinner.');
        },
      },
      {
        label: 'Head down: shoot the last shot again',
        detail: 'A steadier jumper',
        resolve: (s) => {
          bump(s, 'SHT', 0.3);
          morale(s, 1);
          return ok('The next morning the gym is empty except for you, a clock set to five seconds, and a rack of balls.');
        },
      },
    ],
  },
  {
    id: 'floorSlump',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    // the summer after a season that ended on the Floor, in a game he played himself
    when: (s) => s.flags.floorLost === s.year,
    weight: 2,
    cooldownSeasons: 1,
    title: 'Six minutes, again',
    text: 'The season ended on the Floor. Every night that week you play the last six minutes again in your head: the turnover, the free throw that rimmed out, the clock running down. Your sleep tracker says four hours.',
    choices: [
      {
        label: 'Talk it through with the team psychologist',
        detail: 'It helps, slowly',
        resolve: (s) => {
          morale(s, 2);
          trust(s, 1);
          return ok('"You will play it again in your head," she says. "Play it to the end, then turn it off." It takes a week. It works.', 'Talked the last six minutes of the season through with the team psychologist.');
        },
      },
      {
        label: 'Back to the gym at midnight',
        detail: 'Steadier at the line; tired and short-tempered',
        resolve: (s) => {
          addTouch(s.player, 1.5);
          morale(s, -2);
          wear(s, 1);
          return ok('Two hundred free throws a night. The security guard starts bringing you coffee.');
        },
      },
      {
        label: 'A week at the lake, no phone',
        detail: 'Rested; the replay fades',
        resolve: (s) => {
          morale(s, 2);
          wear(s, -2);
          return ok('You catch nothing all week. On the drive home you realise you have not thought about the game in three days.');
        },
      },
    ],
  },
  // ---------------- story mode ----------------
  {
    id: 'storyCall',
    stages: STATES,
    phase: 'mid',
    oncePerCareer: true,
    when: (s) => !!s.story && s.player.age >= R39.call.age,
    weight: 1,
    cooldownSeasons: 1,
    title: 'A call from home',
    text: (s) => `${nameOf(s, 'parent')} calls on a Tuesday night, the way ${nameOf(s, 'parent')} always does after a loss. Nothing about basketball for twenty minutes: the neighbours, the old hoop, ${nameOf(s, 'sibling')}'s grades. Then: "You sound tired."`,
    choices: [
      {
        label: 'Stay on the phone for an hour',
        detail: 'A good night’s sleep after',
        resolve: (s) => {
          morale(s, 3);
          wear(s, -1);
          bond(s, 'parent', 1);
          return ok('You fall asleep on the couch with the phone still warm. Best sleep in a month.', `An hour on the phone with ${nameOf(s, 'parent')} after a loss.`);
        },
      },
      {
        label: 'Ask for the kid to come to the phone',
        detail: 'Your younger sibling has questions',
        resolve: (s) => {
          morale(s, 2);
          bond(s, 'sibling', 1);
          return ok(`${nameOf(s, 'sibling')} wants to know how you guard a pick and roll, and whether you have met anyone famous. You answer the first one properly.`);
        },
      },
      {
        label: 'Keep it short: there is film to watch',
        detail: 'Back to work; it lands a little hard',
        resolve: (s) => {
          bump(s, 'IQ', 0.3);
          bond(s, 'parent', -1);
          return ok(`"Of course," ${nameOf(s, 'parent')} says. "Go." It is mostly fine.`);
        },
      },
    ],
  },
  {
    id: 'storyFriend',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => !!s.story && ['NBA', 'COACH', 'OUT'].includes(s.story.friend.lv),
    weight: 1,
    cooldownSeasons: 1,
    title: 'The hometown paper',
    text: (s) => `The paper back in ${town(s)} runs ${friendStory(s)}. Your name is in the third paragraph. ${nameOf(s, 'parent')} mails you three copies.`,
    choices: [
      {
        label: 'Frame a copy and send it to him',
        detail: 'He calls the minute it arrives',
        resolve: (s) => {
          morale(s, 2);
          bond(s, 'friend', 1);
          return ok(`${nameOf(s, 'friend')} hangs it by his front door, crooked, and sends you a photo of it.`, `Framed the hometown paper's page on ${nameOf(s, 'friend')} and sent it to him.`);
        },
      },
      {
        label: 'Call the paper with a story about him',
        detail: 'A follow-up runs; both of you look good',
        resolve: (s) => {
          rep(s, 1);
          bond(s, 'friend', 1);
          return ok('The one about the broken window and the driveway at midnight. It runs on the front page.');
        },
      },
      {
        label: 'Leave it: he hates a fuss',
        detail: 'Quiet',
        resolve: (s) => {
          morale(s, 1);
          return ok('You keep one copy in your locker. He never finds out. Probably.');
        },
      },
    ],
  },
  {
    id: 'storyRival',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => !!s.story?.rival && s.story.rival.lv === 'NBA' && s.serviceYears >= R39.rival.serviceYears,
    weight: 1,
    cooldownSeasons: 1,
    title: 'The cover',
    text: (s) => `${s.story!.names.rival} is on the cover of the league's preview issue: "The best of his class." You are on page forty, beside an advert for a mattress.`,
    choices: [
      {
        label: 'Tape it inside your locker',
        detail: 'Bulletin board material; a hungry summer',
        resolve: (s) => {
          bump(s, s.player.focus[0], 0.4);
          wear(s, 1);
          morale(s, -1);
          return ok('You see his face every morning before practice. You start getting to the gym before the janitor.', `Taped ${nameOf(s, 'rival')}'s magazine cover inside his locker.`);
        },
      },
      {
        label: 'Text him congratulations',
        detail: 'He did not expect that',
        resolve: (s) => {
          morale(s, 1);
          bond(s, 'rival', 1);
          return ok(`Three dots for a long time. Then: "Page forty is a good page." From ${nameOf(s, 'rival')}, that is a hug.`);
        },
      },
      {
        label: 'Throw it out unread',
        detail: 'Calm; nothing changes',
        resolve: (s) => {
          morale(s, 1);
          return ok('Your teammate fishes it out of the bin and reads it aloud on the bus. Every word.');
        },
      },
    ],
  },
  // ---------------- any career ----------------
  {
    id: 'fanMail',
    stages: ['EU', 'INT', 'NBA'],
    phase: 'mid',
    oncePerCareer: true,
    when: (s) => s.player.rep >= R39.mail.rep,
    weight: 0.7,
    cooldownSeasons: 1,
    title: 'Letters from far away',
    text: 'A box of fan mail arrives from the team office, and half of it is in languages you cannot read: Korean, Japanese, Chinese, Spanish, French. One letter has a drawing of you dunking over a dragon.',
    choices: [
      {
        label: 'Hire a translator and answer every one',
        detail: 'It costs a little; the fans abroad notice',
        resolve: (s) => {
          spend(s, s.stage === 'NBA' ? 0.02 : 0.002);
          rep(s, 2);
          morale(s, 2);
          return ok('Four hundred letters, four hundred answers. A girl in Busan posts yours, and it goes round the world twice.', 'Answered every fan letter from abroad, in its own language.');
        },
      },
      {
        label: 'Learn to say thank you in five languages',
        detail: 'A video for the team’s channels',
        resolve: (s) => {
          rep(s, 1);
          morale(s, 2);
          return ok('Gamsahamnida, arigatō, xièxie, gracias, merci. You get two of them right on the first take.');
        },
      },
      {
        label: 'Pin the dragon drawing in your locker',
        detail: 'A good mood for weeks',
        resolve: (s) => {
          morale(s, 3);
          return ok('Your teammates want to know who the dragon is. You tell them it is the other team.');
        },
      },
    ],
  },
  {
    id: 'redEye',
    stages: NBA,
    phase: 'mid',
    oncePerCareer: true,
    weight: 0.7,
    cooldownSeasons: 1,
    title: 'The red-eye',
    text: 'A loss on the West Coast, then the red-eye home: two in the morning, the cabin lights down, a back-to-back tomorrow night. Half the team is asleep before take-off.',
    choices: [
      {
        label: 'Sleep the whole way',
        detail: 'Fresher legs tomorrow',
        resolve: (s) => {
          wear(s, -2);
          morale(s, 1);
          return ok('You wake up on the tarmac with a blanket you do not remember and a sticky note from the rookie: "You snore."');
        },
      },
      {
        label: 'Cards in the back with the rookies',
        detail: 'The young guys open up; tired legs',
        resolve: (s) => {
          trust(s, 2);
          wear(s, 1);
          return ok('You lose forty dollars to a second-round pick. He tells you about his mother. You tell him about yours.', 'Played cards with the rookies on the red-eye home.');
        },
      },
      {
        label: 'Watch the game again on a tablet',
        detail: 'A sharper read; tired legs',
        resolve: (s) => {
          bump(s, 'IQ', 0.3);
          wear(s, 1);
          return ok('Somewhere over Kansas you find the play that beat you. You draw it on a napkin for the coach.');
        },
      },
    ],
  },
];
