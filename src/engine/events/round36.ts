// Round 36's turning points (the checklist, item 6). The round ended a career in the rafters (the
// finale: the empty arena, his speech, the jersey rising, then the credits), gave the community a
// username apart from the player's name, and gathered Home's side column into one card. Five that
// bring them into a career:
// - the number talk: a long, strong stay, and the team floats retiring his number one day if he
//   finishes there. He can sign on for two more seasons at a hometown discount, so he plays more
//   seasons there, which is what the rafters ask for (awards/legacy.ts raftersTeams);
// - the first draft of the speech, late, once a team would hang his jersey;
// - his JV coach's last game, for a player who started on the JV (a line of the speech);
// - the fan account that has posted every game he ever played (the boards' usernames);
// - his old rival's number going up, once the rival has left the league (another line of it).
// Small effects, like the rest of the book.

import { clamp } from '../rng';
import type { AttrKey, GameState, Stage } from '../types';
import { adjust, teamById, userOvr } from '../career/common';
import { ATTR_MAX } from '../balance';
import { count, legacyScore, raftersTeams } from '../awards/legacy';
import { raftersDetail } from '../awards/details';
import { marketValue } from '../economy/salary';
import type { EventDef } from './defs';

const NBA: Stage[] = ['NBA'];
const PRO: Stage[] = ['GL', 'EU', 'INT', 'NBA'];

const morale = (s: GameState, v: number) => (s.player.morale = adjust(s.player.morale, v));
const trust = (s: GameState, v: number) => (s.player.trust = adjust(s.player.trust, v));
const rep = (s: GameState, v: number) => (s.player.rep = clamp(s.player.rep + v, 0, 100));
const bump = (s: GameState, k: AttrKey, v: number) => (s.player.attrs[k] = clamp(s.player.attrs[k] + v, 15, ATTR_MAX));
const wear = (s: GameState, v: number) => (s.player.wear = clamp((s.player.wear ?? 0) + v, 0, 100));
const spend = (s: GameState, m: number) => (s.player.bank = Math.max(0, s.player.bank - m));
const ok = (outcome: string, log?: string) => ({ outcome, log });

/** The hometown discount on the two seasons he signs on for after the number talk. */
export const NUMBER_TALK = { years: 2, discount: 0.92, minSeasons: 5, ages: [28, 34] as [number, number] };

/** His NBA team now, by name. */
const teamName = (s: GameState): string => teamById(s.nba, s.teamId)?.name ?? 'team';

/**
 * A long, strong stay: five seasons or more with his NBA team, 28 to 34, on a standard deal with
 * it, and an All-Star team or a legacy of 10 behind him.
 */
export function numberTalkFits(s: GameState): boolean {
  const c = s.contract;
  if (s.stage !== 'NBA' || !s.teamId || !c || c.kind !== 'standard' || c.teamId !== s.teamId) return false;
  const [lo, hi] = NUMBER_TALK.ages;
  if (s.player.age < lo || s.player.age > hi || (s.teamSeasons[s.teamId] ?? 0) < NUMBER_TALK.minSeasons) return false;
  return count(s, 'ALLSTAR') >= 1 || legacyScore(s) >= 10;
}

/** The team that would raise his number now: the one he gave the most seasons to (as the finale picks). */
const raftersName = (s: GameState): string => raftersDetail(s).sort((a, b) => b.seasons - a.seasons || b.titles - a.titles)[0]?.name ?? teamName(s);

/** Where his first season was, for the fan account that clipped it. */
function firstPlace(s: GameState): string {
  const lv = s.history[0]?.level;
  return lv === 'HSJV' ? 'his first JV game' : lv === 'HSV' ? 'high school' : lv === 'NCAA' ? 'his first college game' : 'his first game as a pro';
}

/** The fan account's handle, from his name and number (letters and digits, as a username keeps). */
export const fanHandle = (s: GameState): string => `${(s.player.name.split(' ').pop() ?? 'hoops').toLowerCase().replace(/[^a-z]/g, '')}${s.player.number}clips`;

export const ROUND36_EVENTS: EventDef[] = [
  {
    id: 'numberTalk',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: numberTalkFits,
    // a narrow window (a long stay, late, once): weighted up well past the other late-career ones
    weight: 5,
    cooldownSeasons: 1,
    title: 'The number talk',
    text: (s) => `Lunch in the owner’s box with the ${teamName(s)} president. ${s.teamSeasons[s.teamId!]} seasons here, and he gets to it over coffee, pointing at the rafters: "We would like to see number ${s.player.number} up there one day. Finish your career here."`,
    choices: [
      {
        label: 'Sign on to finish here',
        detail: 'Two more seasons on your deal, at a hometown discount',
        resolve: (s) => {
          const c = s.contract!;
          const v = marketValue(s.year + 1, userOvr(s), s.player.age, s.player.rep, s.season?.role ?? 'rotation', s.serviceYears);
          c.years += NUMBER_TALK.years;
          c.salary = Math.round(Math.min(c.salary, v) * NUMBER_TALK.discount * 10) / 10;
          c.teamOptionYears = [];
          morale(s, 3);
          trust(s, 3);
          s.flags.pledge = s.year;
          return ok(`You sign on the napkin first, then on the contract: through ${s.year + c.years}. The president keeps the napkin.`, `Promised the ${teamName(s)} he would finish his career there, and signed on for two more seasons.`);
        },
      },
      {
        label: 'Win one here first, then we talk',
        detail: 'The room likes the answer',
        resolve: (s) => {
          morale(s, 2);
          trust(s, 1);
          rep(s, 1);
          return ok('"Deal," he says, and picks up the check. The quote is on the back page by morning.');
        },
      },
      {
        label: 'Ask if the rafters can take the weight',
        detail: 'The fans laugh; the coach less so',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 2);
          trust(s, -1);
          return ok('The clip of the joke runs on the arena screen at the next home game. The coach does not laugh until the third time.');
        },
      },
    ],
  },
  {
    id: 'speechDraft',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => s.player.age >= 32 && raftersTeams(s).length > 0,
    weight: 2,
    cooldownSeasons: 1,
    title: 'The first draft',
    text: (s) => `A reporter asks what you will say the night the ${raftersName(s)} raise your number. You laugh it off. That night you find an old notebook from ${s.player.highSchool || 'high school'} and open it to a clean page.`,
    choices: [
      {
        label: 'Write it now, while you remember all of it',
        detail: 'A long night with the notebook; a good one',
        resolve: (s) => {
          morale(s, 3);
          s.flags.speech = s.year;
          return ok('Four pages, then one. The city, the gym, the people, the number. You read it out loud once and put it in a drawer.', 'Wrote the first draft of the speech for the night his number goes up.');
        },
      },
      {
        label: 'Call your high school coach first',
        detail: 'He remembers things you forgot',
        resolve: (s) => {
          morale(s, 2);
          rep(s, 1);
          return ok('He talks for an hour about a game you lost by thirty. You had forgotten it. He never did.');
        },
      },
      {
        label: 'Leave the page blank: it isn’t over yet',
        detail: 'Back to the gym; aging slows a little next season',
        resolve: (s) => {
          s.player.declineMultNext *= 0.98;
          morale(s, -1);
          return ok('You close the notebook and go for a run instead. There is a season to play first.');
        },
      },
    ],
  },
  {
    id: 'jvCoach',
    stages: PRO,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => s.player.age >= 24 && s.history.some((h) => h.level === 'HSJV'),
    weight: 0.7,
    cooldownSeasons: 1,
    title: 'The JV coach',
    text: (s) => `Your JV coach at ${s.player.highSchool || 'your high school'} is retiring after thirty-one years of six a.m. practices. He kept you on the team the year you could not make a layup with your left hand. The school asks if you would say a few words at his last game.`,
    choices: [
      {
        label: 'Fly home and say them',
        detail: 'A long weekend; a good one',
        resolve: (s) => {
          morale(s, 4);
          rep(s, 1);
          wear(s, 1);
          return ok('The gym is packed. You tell the story about the left-handed layups. He pretends he does not remember it, then corrects one detail.', 'Flew home to speak at his JV coach’s last game.');
        },
      },
      {
        label: 'Send a signed jersey and a video',
        detail: 'He plays it twice',
        resolve: (s) => {
          morale(s, 1);
          rep(s, 1);
          return ok('The video plays on the scoreboard at halftime. The JV team asks him to play it again.');
        },
      },
      {
        label: 'Pay for a new gym floor in his name',
        detail: 'It costs a little; the town remembers',
        resolve: (s) => {
          spend(s, s.stage === 'NBA' ? 0.12 : 0.003);
          rep(s, 2);
          morale(s, 2);
          return ok('His name goes on the floor at center court. He stands on it for a long time before anyone is allowed to dribble.');
        },
      },
    ],
  },
  {
    id: 'fanAccount',
    stages: ['NCAA', ...PRO],
    phase: 'mid',
    oncePerCareer: true,
    when: (s) => s.player.rep >= 45 && s.history.length >= 5,
    weight: 0.7,
    cooldownSeasons: 1,
    title: 'The fan account',
    text: (s) => `@${fanHandle(s)} has posted a clip of every game you have played since ${firstPlace(s)}. Nobody knows who runs it. Tonight it passed a million followers, and it tagged you.`,
    choices: [
      {
        label: 'Follow back and send a signed ball',
        detail: 'The fans love it',
        resolve: (s) => {
          rep(s, 2);
          morale(s, 2);
          return ok('The account posts the ball, then the box it came in, then the box again from a better angle.', `Followed back @${fanHandle(s)}, the fan account that clipped every game.`);
        },
      },
      {
        label: 'Ask who runs it',
        detail: 'A good story; a little more famous',
        resolve: (s) => {
          rep(s, 3);
          morale(s, 1);
          return ok('It is a retired bus driver from your hometown who drove the team to away games. He has not missed one since.');
        },
      },
      {
        label: 'Mute it until the season is over',
        detail: 'Eyes on the next game',
        resolve: (s) => {
          trust(s, 2);
          bump(s, 'IQ', 0.3);
          return ok('Phone in the locker, film on the tablet. The coach notices before the fans do.');
        },
      },
    ],
  },
  {
    id: 'rivalJersey',
    stages: NBA,
    phase: 'off',
    oncePerCareer: true,
    when: (s) => !!s.rivalry?.ended && s.rivalry.level !== 'draft' && s.player.age >= 28,
    weight: 1.5,
    cooldownSeasons: 1,
    title: 'His number goes up',
    text: (s) => `${s.rivalry!.name} has left the league, and this winter the ${s.rivalry!.team} hang his number. His family asks if you would say something. ${s.rivalry!.w}–${s.rivalry!.l} between your teams, and he never once said hello first.`,
    choices: [
      {
        label: 'Speak, and tell the truth: he made you better',
        detail: 'The league sees another side of you',
        resolve: (s) => {
          rep(s, 3);
          morale(s, 2);
          return ok('You tell them about the night he held you to nine points. His mother laughs the loudest.', `Spoke the night ${s.rivalry!.name}’s number went up.`);
        },
      },
      {
        label: 'Sit in the second row and clap',
        detail: 'Quiet respect',
        resolve: (s) => {
          morale(s, 2);
          trust(s, 1);
          return ok('The camera finds you when the banner goes up. You clap until it stops moving.');
        },
      },
      {
        label: 'Stay home and watch his film',
        detail: 'You still owe him one; a little smarter',
        resolve: (s) => {
          bump(s, 'IQ', 0.4);
          rep(s, -1);
          return ok('Every possession he guarded you, one more time. You find the move he never let you make.');
        },
      },
    ],
  },
];
