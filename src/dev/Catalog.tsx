// The catalog (round 25, owner: "the dev deck should have access to all options: a shop card shows
// every shop item, teams every team, injuries every injury; everything in the project summary
// visualized"). Every list the game draws from, read straight from the content and engine modules,
// one searchable grid per category, each entry with the game's own art where it has some.

import { Fragment, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import './catalog.css';
import { AGE_PLANS, ARCH_CEILING, CRUNCH, DIFFICULTIES, FLOOR, HALF_PLANS, INJURY_SEVERITY, INJURY_TOLL, BASE_INJURY, LEVELS, LEAGUE_STRENGTH, MODES, WEAR } from '../engine/balance';
import { DEFENSE, OFFENSE } from '../engine/career/live';
import { FRAME_POSES, type Frame } from '../ui/floor/sprites';
import type { Pose } from '../ui/art/sprite';
import { STORY_CHAPTERS } from '../engine/story/chapters';
import { StoryPortrait } from '../ui/art/StoryArt';
import { COACH_LINES } from '../ui/components/CoachTalk';
import type { AttrKey, GameState, HalfPlan, LevelKey, Pos, StoryRole } from '../engine/types';
import { newGame } from '../engine/flow';
import { INJURY_NAMES } from '../engine/player/injury';
import { ARCHETYPES } from '../engine/player/archetypes';
import { edgeOf } from '../engine/career/nationality';
import { CHASER_ROLES } from '../engine/career/ringChase';
import { FAN_CULTURES } from '../engine/career/fanCulture';
import { CITY_CULTURES } from '../engine/career/cityCulture';
import { TEAM_STYLES } from '../engine/career/identity';
import type { EventDef } from '../engine/events/defs';
import { EVENTS as BASE_EVENTS } from '../engine/events/defs';
import { MORE_EVENTS } from '../engine/events/more';
import { RISK_EVENTS } from '../engine/events/risks';
import { GROWTH_EVENTS } from '../engine/events/growthEvents';
import { SKILL_EVENTS } from '../engine/events/skillEvents';
import { ARC_EVENTS } from '../engine/events/arcs';
import { ROUND9_EVENTS } from '../engine/events/round9';
import { ROUND13_EVENTS } from '../engine/events/round13';
import { ROUND15_EVENTS } from '../engine/events/round15';
import { WEIGHT_EVENTS } from '../engine/events/weightEvents';
import { ROUND21_EVENTS } from '../engine/events/round21';
import { ROUND25_EVENTS } from '../engine/events/round25';
import { ROUND32_EVENTS } from '../engine/events/round32';
import { ROUND33_EVENTS } from '../engine/events/round33';
import { ROUND34_EVENTS } from '../engine/events/round34';
import { ROUND35_EVENTS } from '../engine/events/round35';
import { ROUND35B_EVENTS } from '../engine/events/round35b';
import { FRIEND_EVENTS } from '../engine/events/friends';
import { ROUND35C_EVENTS } from '../engine/events/round35c';
import { ROUND36_EVENTS } from '../engine/events/round36';
import { ROUND37_EVENTS } from '../engine/events/round37';
import { ROUND39_EVENTS } from '../engine/events/round39';
import { ACHIEVEMENTS } from '../engine/achievements';
import { ACH_CATS, achCatOf } from '../engine/achievementCats';
import { CLASS_MAX } from '../ui/multiplayer';
import { BEGINNER_EVENTS, LEVEL_IDS, LEVEL_NAME } from '../engine/levels';
import { DRAFT_NIGHT, FLOOR_MINI, JOIN_FRIEND, ROADMAP, ROAD_GRADES } from '../engine/balance';
import { FLOOR_STRENGTHS, floorRoster } from '../engine/floor/mini';
import { ovrOf } from '../engine/player/ovr';
import { PLAN_TEXT, SIX_PLANS } from '../engine/career/season';
import { LEVEL_COPY } from '../content/roadmap';
import { ROAD_MINIS, ROAD_NEED, UNLOCK_FROM, UNLOCK_NAME, unlockHint, type Unlock } from '../ui/road';
import { PlaceArt } from '../ui/screens/RoadMap';
import { GAMES, miniIcon } from '../ui/mini/MiniGames';
import { LESSONS, type Where } from '../ui/tutorial/lessons';
import { STOPS } from '../ui/tutorial/closing';
import { SHOP_ITEMS, type ShopItem } from '../content/shop';
import { NBA_TEAMS, COLLEGES, EURO_CLUBS, INT_LEAGUES, RIVALS, HOMETOWN_SCHOOLS, HS_SCHOOL_NAMES, HS_COLORS } from '../content/teams';
import { EVENT_THEMES, themeOf } from './eventThemes';
import { TEAM_STYLE } from '../content/teamStyle';
import { ORIGINS } from '../content/origins';
import { AWARD_CATS, AWARD_KEYS, awardLook } from '../content/awards';
import { NICKNAMES, BRANDS } from '../content/nicknames';
import { STAFF } from '../content/staff';
import { LEGENDS } from '../content/legends';
import { FRANCHISE_FIVES } from '../content/franchiseFives';
import { VISITS } from '../content/visits';
import { NAMES } from '../content/strings';
import { fmtMoney, signed } from '../ui/format';
import { TRACKS, parseVoice, type TrackId } from '../ui/tracks';
import { Icon } from '../ui/art/Icon';
import { BrandLogo, SEV_COLOR, SEV_NAME, eventIcon, injuryIcon, leagueIcon, levelIcon } from '../ui/art/careerArt';
import { ICON_FOR, SHIFT_COLOR, shopIcon, shopShift } from '../ui/art/icons';
import { TeamArt } from '../ui/art/Crest';
import { JerseyArt } from '../ui/art/Jersey';
import { HeroArt, archPose } from '../ui/art/Hero';
import { POS_STYLE } from '../ui/art/PositionCard';
import { FlagArt } from '../ui/art/Flag';
import { AwardArt } from '../ui/art/Award';
import { NickLogo } from '../ui/art/NickLogo';
import { LegendBust } from '../ui/art/Legend';
import { PlaybookArt } from '../ui/art/Playbook';
import { StaffScene } from '../ui/art/Scene';
import { CoachArt } from '../ui/art/Coach';
import { TEMPER, TEMPER_FX, coachOf } from '../engine/career/coach';
import { PERSONA, talkFor, type Mate, type Persona, type Room } from '../engine/career/locker';
import { GAME_RECORDS, SCORING_LIST } from '../engine/career/records';
import { FAREWELL_GIFTS } from '../content/farewell';
import type { Team } from '../engine/types';
import { hash } from '../ui/art/color';
import type { KitLeague } from '../content/teamStyle';
import { LOOK_FACES, LOOK_HAIRS, LOOK_STYLES, type ChosenLook } from '../content/looks';
import { FACE_NAME, HAIR_NAME, LookPreview, STYLE_NAME } from '../ui/components/LookPicker';
import { PlayerArt, PlayerStatue, SKIN_COLORS, kitFor, type KitName } from '../ui/art/Player';
import { VENUES, Venue } from '../ui/screens/Intro';
import { houseRecords } from '../ui/house';
import { ENDINGS, ENDING_IDS } from '../ui/endings';
import { EndingArt } from '../ui/art/Endings';
import { TownArt } from '../ui/art/TownArt';
import { NBA_ARENAS } from '../ui/arenas';
import type { Town } from '../ui/town';

interface Entry {
  key: string;
  title: string;
  sub?: string;
  text?: string;
  art?: () => ReactNode;
  facts?: [string, string][];
  lines?: string[];
  /** A colour for the card's edge (round 27: an injury's severity). */
  edge?: string;
  /** The group it is listed under inside its list (round 27, owner: "can you group them a bit?"). */
  group?: string;
}

interface Category {
  key: string;
  name: string;
  icon: string;
  blurb: string;
  entries: () => Entry[];
}

const PAGE = 120;
const KITS: KitName[] = ['home', 'road', 'city'];
const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
// a multiplier as a change: 0.9 reads "−10%"
const mult = (m: number) => `${m >= 1 ? '+' : '−'}${Math.abs((m - 1) * 100).toFixed(1)}%`;
const attrList = (a: Partial<Record<AttrKey, number>> | undefined, digits = 1) => Object.entries(a ?? {}).map(([k, v]) => `${NAMES.attr[k as AttrKey]} ${signed(v as number, digits)}`);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();

/** A sample career, for the events whose text or choices are written for the player at hand. */
let sample: GameState | null = null;
function sampleCareer(): GameState {
  if (!sample) sample = newGame(4242, { name: 'Marcus Vale', number: 23, pos: 'SG', archetype: 0, focus: ['SHT', 'FIN'], mode: 'standard', country: 'USA', hometown: 'Dayton', highSchool: 'Lincoln High' });
  return sample;
}

function Jerseys({ name, abbr, color, league, nba }: { name: string; abbr: string; color: string; league: KitLeague; nba?: boolean }) {
  return (
    <span className="cat-kits">
      {KITS.map((k) => (
        <JerseyArt key={k} kit={nba ? TEAM_STYLE[abbr][k] : kitFor(name, abbr, color, k, league)} number={hash(name) % 50} size={50} label={`${name} ${k} jersey`} />
      ))}
    </span>
  );
}

function teamArt(name: string, abbr: string, color: string, league: KitLeague, nba = false): () => ReactNode {
  return () => (
    <>
      <TeamArt name={name} abbr={abbr} color={color} league={league} size={56} />
      <Jerseys name={name} abbr={abbr} color={color} league={league} nba={nba} />
    </>
  );
}

function itemEffects(i: ShopItem): string[] {
  const out = attrList(i.attrs, 2);
  if (i.focus) out.push(`Focus ratings ${signed(i.focus, 2)}`);
  if (i.range) out.push(`Range ${signed(i.range, 2)}`);
  if (i.offhand) out.push(`Off hand ${signed(i.offhand, 2)}`);
  if (i.touch) out.push(`Free-throw touch ${signed(i.touch, 1)}`);
  if (i.injuryMult) out.push(`Injury risk ${mult(i.injuryMult)}`);
  if (i.declineMult) out.push(`Decline ${mult(i.declineMult)}`);
  if (i.growthMult) out.push(`Growth next season ${mult(i.growthMult)}`);
  if (i.morale) out.push(`Morale ${signed(i.morale, 0)}`);
  if (i.rep) out.push(`Reputation ${signed(i.rep, 0)}`);
  if (i.trust) out.push(`Coach trust ${signed(i.trust, 0)}`);
  if (i.weight) out.push(`Weight ${signed(i.weight, 0)} lb`);
  if (i.toIdeal) out.push(`${pct(i.toIdeal, 0)} of the way to his playing weight`);
  if (i.wear) out.push(`Worn on the ${i.wear.slot}`);
  if (VISITS[i.id]) out.push(`Visit: ${VISITS[i.id].verb}`);
  return out;
}

const EVENT_SETS: [string, EventDef[]][] = [
  ['Turning points', BASE_EVENTS],
  ['More turning points', MORE_EVENTS],
  ['Risks', RISK_EVENTS],
  ['Growth', GROWTH_EVENTS],
  ['Skills', SKILL_EVENTS],
  ['Story arcs', ARC_EVENTS],
  ['Round 9', ROUND9_EVENTS],
  ['Round 13', ROUND13_EVENTS],
  ['Round 15', ROUND15_EVENTS],
  ['Weight', WEIGHT_EVENTS],
  ['Round 21', ROUND21_EVENTS],
  ['Round 25', ROUND25_EVENTS],
  ['Round 32', ROUND32_EVENTS],
  ['Round 33', ROUND33_EVENTS],
  ['Round 34', ROUND34_EVENTS],
  ['Round 35', [...ROUND35_EVENTS, ...ROUND35B_EVENTS, ...FRIEND_EVENTS, ...ROUND35C_EVENTS]],
  ['Round 36', ROUND36_EVENTS],
  ['Round 37', ROUND37_EVENTS],
  ['Round 39', ROUND39_EVENTS],
];

function eventEntry(set: string, e: EventDef): Entry {
  const s = sampleCareer();
  let text = '';
  let choices: string[] = [];
  try {
    text = typeof e.text === 'function' ? e.text(s) : e.text;
  } catch {
    text = '(Written for the career at hand.)';
  }
  try {
    const cs = typeof e.choices === 'function' ? e.choices(s) : e.choices;
    choices = cs.map((c) => `${c.label}${c.detail ? `: ${c.detail}` : ''}${c.shownOdds !== undefined ? ` (${pct(c.shownOdds, 0)})` : ''}`);
  } catch {
    choices = ['(The choices depend on the career at hand.)'];
  }
  return {
    key: `${set}-${e.id}`,
    title: e.title,
    group: themeOf(e.id),
    sub: `${set} · ${e.phase === 'mid' ? 'midseason' : e.phase === 'off' ? 'offseason' : 'any time'}`,
    text,
    art: () => <Icon name={eventIcon(e.id)} size={48} />,
    facts: [
      ['Levels', e.stages.join(', ')],
      ['Weight', String(e.weight)],
      ['Cooldown', `${e.cooldownSeasons} season${e.cooldownSeasons === 1 ? '' : 's'}`],
      ...(e.oncePerCareer ? ([['Once', 'per career']] as [string, string][]) : []),
      ...(e.when ? ([['Condition', 'only when it fits']] as [string, string][]) : []),
    ],
    lines: choices,
  };
}


function tollText(key: string): string {
  const t = INJURY_TOLL[key as keyof typeof INJURY_TOLL];
  if (!t) return 'None';
  const parts = [`athleticism −${t.ath[0]} to −${t.ath[1]}`];
  if ('other' in t) parts.push(`${'others' in t ? `${t.others} other ratings` : 'one other rating'} −${t.other[0]} to −${t.other[1]}`);
  if ('cap' in t) parts.push(`${pct(t.capChance, 0)} chance the ceiling drops ${t.cap[0]}–${t.cap[1]}`);
  return parts.join('; ');
}

const LEGEND_TEAM: Record<string, string> = Object.fromEntries(Object.entries(FRANCHISE_FIVES).flatMap(([abbr, five]) => five.map((p) => [p.name, abbr])));
const FILL = { first: 'Marcus', last: 'Vale', i: 'M', num: '23', town: 'Dayton' };
const fillName = (n: string) => n.replace(/\{(\w+)\}/g, (_, k: string) => FILL[k as keyof typeof FILL] ?? k);
const PERSONA_WHO: Record<Persona, string> = {
  rookie: 'The youngest in the room, if he is 22 or a rookie',
  vet: 'The oldest, if he is 30 or more',
  star: 'The best of the rest, if he is close to you',
  joker: 'One of the others',
  quiet: 'One of the others',
  hothead: 'One of the others; about every other half he starts a feud',
};
const PATH: Record<string, string> = { us: 'High school, then college', euro: 'Club academy', academy: 'Academy abroad', aus: 'Australian pathway', canada: 'Canadian prep', asia: 'Asian league pathway' };

/** Round 38: story mode's cast, as the Catalog lists their chapters (a sample name each). */
const STORY_WHO: Record<StoryRole, [string, string]> = {
  friend: ['His best friend', 'Marcus Bell'],
  rival: ['His rival', 'Dante Vale'],
  parent: ['His parent', 'Carol Carter'],
  sibling: ['His sibling', 'Maya Carter'],
  agent: ['His agent', 'Ray Holt'],
  mentor: ['His mentor', 'Coach Ellis'],
  reporter: ['The reporter', 'Dana Price'],
};

/** Round 39: what each of the Floor's frames is for. */
const FRAME_WORDS: Record<Frame, [string, string]> = {
  stand: ['Standing', 'Off the ball, set, and at the free-throw line.'],
  guard: ['Guarding', 'In a defensive stance on his man.'],
  slide: ['Sliding', 'A defender shuffling sideways with his man.'],
  runA: ['Running (1)', 'The first stride of a run.'],
  runB: ['Running (2)', 'The second stride of a run.'],
  dribble: ['Dribbling', 'The ball handler on the move.'],
  low: ['Low dribble', 'The crossover sweeping the ball low across him.'],
  back: ['His back', 'The middle of a spin, his back to the camera.'],
  gather: ['The gather', 'Low with the ball before the shot rises.'],
  shoot: ['The jumper', 'Up on the release, the ball off his fingertips.'],
  dunk: ['The dunk', 'At the rim, the ball through it.'],
  jump: ['Arms up', 'A block, a contest, or his own basket celebrated.'],
  reach: ['The reach', 'A defender reaching in for the ball.'],
};

const CATEGORIES: Category[] = [
  {
    key: 'shop',
    name: 'Shop items',
    icon: 'bag',
    blurb: 'Everything the shop can stock, with what it does.',
    entries: () =>
      SHOP_ITEMS.map((i) => ({
        key: i.id,
        title: i.name,
        group: i.category,
        sub: `${i.category} · ${fmtMoney(i.price)}${i.klass ? ' · draft class only' : ''}`,
        text: i.blurb,
        art: () => (
          <span className="shop-tile" style={{ ['--tile' as string]: SHIFT_COLOR[shopShift(i.id)] }}>
            <Icon name={shopIcon(i.id, i.name)} shift={shopShift(i.id)} size={40} />
          </span>
        ),
        lines: itemEffects(i),
      })),
  },
  {
    key: 'teams',
    name: 'Teams',
    icon: 'jersey',
    blurb: 'Every NBA franchise, college, EuroLeague club and overseas team, with crests and kits.',
    entries: () => [
      ...NBA_TEAMS.map((t) => {
        const name = `${t.city} ${t.nick}`;
        const rival = RIVALS.find((r) => r.includes(t.abbr))?.find((x) => x !== t.abbr);
        return {
          key: `nba-${t.abbr}`,
          title: name,
          group: 'NBA',
          sub: `NBA · ${t.conf} · ${t.div}`,
          art: teamArt(name, t.abbr, t.color, 'NBA', true),
          facts: [
            ['G League', t.gl],
            ['Fans', FAN_CULTURES[t.abbr]?.name ?? '—'],
            ['City', CITY_CULTURES[t.abbr]?.name ?? '—'],
            ...(rival ? ([['Rival', rival]] as [string, string][]) : []),
          ] as [string, string][],
        };
      }),
      ...COLLEGES.map((c) => ({
        key: `ncaa-${c.name}`,
        title: c.name,
        group: 'College (NCAA)',
        sub: `NCAA · ${c.tier} · ${c.conf}`,
        art: teamArt(c.name, initials(c.name), c.color, 'NCAA'),
      })),
      ...EURO_CLUBS.map((c) => ({
        key: `eu-${c.name}`,
        title: c.name,
        group: 'EuroLeague',
        sub: `EuroLeague · ${c.country}`,
        art: teamArt(c.name, c.short, c.color, 'EU'),
        facts: [['Strength', String(c.strength)]] as [string, string][],
      })),
      // round 27 (owner: "teams can be grouped to highschools, nba, euroleague"): the schools and academies too
      ...HOMETOWN_SCHOOLS.flatMap((h) =>
        h.schools.map((name, i) => ({
          key: `hs-${name}`,
          title: name,
          group: 'High schools (by hometown)',
          sub: h.town,
          art: teamArt(name, initials(name), h.colors[i % h.colors.length], 'HS'),
        })),
      ),
      ...HS_SCHOOL_NAMES.map((name, i) => ({
        key: `hsopp-${name}`,
        title: `${name} High`,
        group: 'High schools (opponents)',
        sub: 'High school league',
        art: teamArt(`${name} High`, initials(name), HS_COLORS[i % HS_COLORS.length], 'HS'),
      })),
      ...ORIGINS.flatMap((o) =>
        o.youth.map((y) => ({
          key: `youth-${o.country}-${y.name}`,
          title: y.name,
          group: 'Youth academies',
          sub: o.country,
          art: teamArt(y.name, initials(y.name), y.color, 'HS'),
        })),
      ),
      ...INT_LEAGUES.flatMap((l) =>
        l.teams.map(([name, color]) => ({
          key: `int-${l.key}-${name}`,
          title: name,
          group: `${l.name} (${l.country})`,
          sub: `${l.name} · ${l.country}`,
          art: teamArt(name, initials(name), color, 'INT'),
          facts: [['League strength', String(l.strength)]] as [string, string][],
        })),
      ),
    ],
  },
  {
    key: 'injuries',
    name: 'Injuries',
    icon: 'health',
    blurb: `Every injury a game can bring. The base chance is ${pct(BASE_INJURY, 2)} a game played, before the plan, minutes, age, height and durability.`,
    entries: () =>
      INJURY_SEVERITY.flatMap((sev) =>
        INJURY_NAMES[sev.key].map((name) => ({
          key: `${sev.key}-${name}`,
          title: name,
          sub: SEV_NAME[sev.key],
          group: SEV_NAME[sev.key],
          // round 27 (owner): each injury its own icon, the severity on the card's edge
          art: () => <Icon name={injuryIcon(name)} size={48} />,
          edge: SEV_COLOR[sev.key],
          facts: [
            ['Out', `${sev.days[0]}–${sev.days[1]} days`],
            ['Share', `${pct(sev.share / INJURY_NAMES[sev.key].length)} of injuries`],
            ['Body wear', `+${WEAR.injury[sev.key]}`],
          ] as [string, string][],
          lines: [`Lasting toll: ${tollText(sev.key)}`],
        })),
      ),
  },
  {
    key: 'events',
    name: 'Events',
    icon: 'news',
    blurb: 'Every turning point, risk, story arc and offer, with its choices (shown for a sample career).',
    // round 27: grouped by what they are about, in the summary's order
    entries: () => {
      const all = EVENT_SETS.flatMap(([set, list]) => list.map((e) => eventEntry(set, e)));
      const order = [...EVENT_THEMES.map(([t]) => t), 'Other'];
      return all.sort((a, b) => order.indexOf(a.group!) - order.indexOf(b.group!));
    },
  },
  {
    key: 'archetypes',
    name: 'Archetypes',
    icon: 'person',
    blurb: 'The starting cards for each position, with the ratings they start from.',
    entries: () =>
      (Object.keys(ARCHETYPES) as Pos[]).flatMap((pos) =>
        ARCHETYPES[pos].map((a) => ({
          key: `${pos}-${a.name}`,
          title: a.name,
          sub: NAMES.pos[pos],
          group: NAMES.pos[pos],
          text: a.blurb,
          art: () => <HeroArt pose={archPose(a.name, pos)} model={a.name} number={(hash(a.name) % 54) + 1} kit={{ base: POS_STYLE[pos].color, ink: '#FFFFFF', trim: '#F4F4F4', word: '' }} size={96} />,
          facts: [
            ...(Object.entries(a.attrs).map(([k, v]) => [NAMES.attr[k as AttrKey], String(v)]) as [string, string][]),
            ['Range', String(a.range)],
            ...(a.height ? ([['Height', `${signed(a.height, 0)} in`]] as [string, string][]) : []),
            // round 28: the potential bonus each archetype is dealt (all but Built in a lab)
            ...(ARCH_CEILING[a.name] ? ([['Ceiling bonus', `+${ARCH_CEILING[a.name]}`]] as [string, string][]) : []),
          ],
        })),
      ),
  },
  {
    key: 'countries',
    name: 'Countries',
    icon: 'globe',
    blurb: 'Where a career can start, how often, and what the road from there looks like.',
    entries: () =>
      ORIGINS.map((o) => {
        const e = edgeOf(o.country);
        return {
          key: o.country,
          title: o.country,
          sub: PATH[o.path] ?? o.path,
          group: PATH[o.path] ?? o.path,
          art: () => <FlagArt country={o.country} size={56} />,
          facts: [
            ['Share', pct(o.weight)],
            ['National team', o.nation],
            ...(o.youthLeague ? ([['Youth league', o.youthLeague]] as [string, string][]) : []),
            ...(o.homeClub ? ([['Home club', o.homeClub]] as [string, string][]) : []),
            ...(o.homeLeague ? ([['Home league', o.homeLeague]] as [string, string][]) : []),
            ['Recruiting', signed(e.recruit)],
            ['Teen growth', `×${e.youthGrowth}`],
            ['EuroLeague pay', `×${e.euPay}`],
            ...(e.military ? ([['Service', 'military service']] as [string, string][]) : []),
          ] as [string, string][],
          lines: [...e.notes, ...(o.youth.length ? [`Youth teams: ${o.youth.map((y) => y.name).join(', ')}`] : [])],
        };
      }),
  },
  {
    key: 'levels',
    name: 'Levels and leagues',
    icon: 'arena',
    blurb: 'Every level he can play at, and every overseas league, with the numbers the season model uses.',
    entries: () => [
      ...(Object.keys(LEVELS) as LevelKey[]).map((k) => {
        const l = LEVELS[k];
        const strength = LEAGUE_STRENGTH[k as keyof typeof LEAGUE_STRENGTH];
        return {
          key: `level-${k}`,
          title: l.name,
          group: 'Levels',
          sub: l.short,
          art: () => <Icon name={levelIcon(k)} size={48} />,
          facts: [
            ['Rotation OVR', String(l.avg)],
            ...(strength ? ([['Team strength', String(strength)]] as [string, string][]) : []),
            ['Games', String(l.games)],
            ['Game', `${l.gameLen} min`],
            ['Season', `${l.seasonDays} days`],
            ['Team FGA', String(l.teamFga)],
          ] as [string, string][],
        };
      }),
      ...INT_LEAGUES.map((l) => ({
        key: `league-${l.key}`,
        title: l.name,
        group: 'Overseas leagues',
        sub: `${l.country}${l.amateur ? ' · university' : ''}`,
        art: () => <Icon name={leagueIcon(l.key)} size={48} />,
        facts: [
          ['Strength', String(l.strength)],
          ['Salary', l.amateur ? 'none' : `${fmtMoney(l.salary[0])}–${fmtMoney(l.salary[1])}`],
          ['Teams', String(l.teams.length)],
          ...(l.homeOnly ? ([['Open to', l.homeOnly.join(', ')]] as [string, string][]) : []),
        ] as [string, string][],
      })),
    ],
  },
  {
    key: 'awards',
    name: 'Awards',
    icon: 'laurel',
    blurb: 'Every award and honour, by family.',
    entries: () =>
      AWARD_KEYS.map((k) => {
        const look = awardLook(k, k);
        return {
          key: k,
          title: look.desc,
          sub: `${AWARD_CATS[look.cat].name} · ${k}`,
          group: AWARD_CATS[look.cat].name,
          art: () => <AwardArt akey={k} label={k} color={look.color} size={48} />,
        };
      }),
  },
  {
    key: 'plans',
    name: 'Plans',
    icon: 'checklist',
    blurb: 'The half-season plans and what each one changes.',
    entries: () =>
      (Object.keys(HALF_PLANS) as HalfPlan[]).map((k) => {
        const p = HALF_PLANS[k];
        return {
          key: k,
          title: PLAN_TEXT[k].label,
          sub: k,
          art: () => <Icon name={ICON_FOR[k] ?? k} size={44} />,
          facts: [
            ['Growth', `×${p.growth}`],
            ['Injury', `×${p.injury}`],
            ['Morale', signed(p.morale, 0)],
            ['Trust', signed(p.trust, 0)],
            ['Usage', `×${p.usage}`],
            ['Team', signed(p.teamBoost)],
            ...(p.rep[1] ? ([['Reputation', `+${p.rep[0]}–${p.rep[1]}`]] as [string, string][]) : []),
            ...(p.chem ? ([['Chemistry', signed(p.chem, 2)]] as [string, string][]) : []),
          ] as [string, string][],
          lines: [
            // round 33: beginner's six, one a season
            ...(SIX_PLANS.includes(k) ? ['One of beginner’s six (one plan a season, at full strength)'] : []),
            // round 28: the plans that suit an age
            ...(AGE_PLANS.young.plans.includes(k) ? [`Young legs (${AGE_PLANS.young.upTo} and under): growth ×${AGE_PLANS.young.growth}, injuries ×${AGE_PLANS.young.injury}, morale +${AGE_PLANS.young.morale}`] : []),
            ...(AGE_PLANS.vet.plans.includes(k) ? [`Veteran (${AGE_PLANS.vet.from} and over): growth ×${AGE_PLANS.vet.growth}, injuries ×${AGE_PLANS.vet.injury}, trust +${AGE_PLANS.vet.trust}${k === 'teamfirst' ? `, team +${AGE_PLANS.vet.teamBoost}` : ''}`] : []),
            ...attrList(p.attrs).map((x) => `${x} a half`),
            ...(p.rangeGain ? [`Range +${p.rangeGain}`] : []),
            ...(p.offhandGain ? [`Off hand +${p.offhandGain}`] : []),
            ...(p.touchGain ? [`Free-throw touch +${p.touchGain} a half`] : []),
            ...(p.swing ? [`A gamble on ${p.swing.attrs.map((a) => NAMES.attr[a]).join(' and ')}: ${signed(p.swing.mean)} on average, give or take ${p.swing.sd}`] : []),
          ],
        };
      }),
  },
  {
    key: 'modes',
    name: 'Difficulties',
    icon: 'dial',
    // the three a career starts at (round 27, owner: Fast break is a switch and Built in a lab a
    // mini-game, so neither is a difficulty)
    blurb: 'The three difficulties a career can start at, and the dials each one sets.',
    entries: () =>
      DIFFICULTIES.map((k): Entry => {
        const m = MODES[k];
        return {
          key: k,
          title: m.name,
          sub: k,
          text: m.blurb,
          art: () => <Icon name={ICON_FOR[k] ?? k} size={44} />,
          facts: [
            ['Potential', `${m.potential.base}+, ${m.potential.min}–${m.potential.max}`],
            ['Growth', `×${m.growth}`],
            ['Injuries', `×${m.injury}`],
            ['Scouts project', `${m.scout.mid} ± ${m.scout.sd}`],
            ...(m.floor ? ([['Floor', `OVR ${m.floor.ovr} by ${m.floor.age}`]] as [string, string][]) : []),
            ...(m.mini !== undefined ? ([['Mini-game pay', `×${m.mini}`]] as [string, string][]) : []),
            ...(m.teamFx !== undefined ? ([['Team factors', `×${m.teamFx}`]] as [string, string][]) : []),
          ] as [string, string][],
        };
      }).concat([
        // the two challenges a difficulty can carry (round 25 Rough Road, round 30 Comet)
        {
          key: 'oath',
          title: 'Rough Road',
          sub: 'with Reality hits hard',
          group: 'Challenges',
          text: 'The road rolls the player; master mode, no Fast break or Sim, for the whole career.',
          art: () => <Icon name="oath" size={44} />,
          facts: [
            ['Locked', 'Master mode on; Fast break and Sim off'],
            ['Mark', 'Rough Road'],
          ] as [string, string][],
        },
        {
          key: 'comet',
          title: 'Comet',
          sub: 'with Shoot for the stars',
          group: 'Challenges',
          text: 'Hyper speed: the game plays the seasons and makes every call but where he plays, the draft, brand deals and retiring. Only the biggest nights get a page; the rest is a list of highlights.',
          art: () => <Icon name="comet" size={44} />,
          facts: [
            ['Locked', 'Fast break and Sim on'],
            ['Playtime (model, 1,000 careers)', 'mean 5.19 min; 80% within 4.32–6.08'],
            ['Mark', 'Comet'],
          ] as [string, string][],
        },
      ]),
  },
  {
    key: 'styles',
    name: 'Team styles',
    icon: 'bracket',
    blurb: 'The team styles, drawn as the coach draws them.',
    entries: () =>
      (Object.keys(TEAM_STYLES) as (keyof typeof TEAM_STYLES)[]).map((k) => {
        const t = TEAM_STYLES[k];
        return {
          key: k,
          title: t.name,
          sub: t.fits,
          text: t.text,
          art: () => <PlaybookArt style={k} size={120} />,
          facts: [
            ['Regular season', signed(t.regular)],
            ['Playoffs', signed(t.playoff)],
            ['His usage', `×${t.usage}`],
          ] as [string, string][],
          // round 28: the talk with the coach that sets it
          lines: [...attrList(t.weights).map((x) => `Weight on ${x}`), ...COACH_LINES[k].map((l, i) => `${i === 1 ? 'Coach' : 'You'}: “${l}”`)],
        };
      }),
  },
  {
    // round 28: the calls of crunch time in a final (engine/career/live.ts)
    key: 'crunch',
    name: 'Crunch-time calls',
    icon: 'clutch',
    blurb: `The plays and defenses of a final's last two minutes: ${CRUNCH.possessions} trips from 2:00, ${CRUNCH.ot} more for each overtime.`,
    entries: () => [
      ...Object.entries(OFFENSE).map(([k, m]) => ({
        key: `o-${k}`,
        title: m.label,
        sub: 'Your ball',
        group: 'Offense',
        text: m.detail,
        art: () => <Icon name="ball" size={44} />,
        facts: [
          ['Points', String(m.pts)],
          ['Base odds', `${Math.round((CRUNCH.base[k] ?? 0) * 100)}%`],
          ['Rating', NAMES.attr[m.attr]],
          ['Per point over the level', `+${CRUNCH.per * 100}%`],
        ] as [string, string][],
      })),
      ...Object.entries(DEFENSE).map(([k, d]) => ({
        key: `d-${k}`,
        title: d.label,
        sub: 'Their ball',
        group: 'Defense',
        text: d.detail,
        art: () => <Icon name="lockdown" size={44} />,
        facts: [
          ['Stop bonus', signed((CRUNCH.stop[k] ?? 0) * 100, 0) + '%'],
          ['Rating', NAMES.attr[d.attr]],
          ['Steal chance', `${Math.round((k === 'gamble' ? CRUNCH.steal.gamble : CRUNCH.steal.other) * 100)}%`],
        ] as [string, string][],
      })),
    ],
  },
  {
    key: 'cultures',
    name: 'Team cultures',
    icon: 'crowd',
    blurb: 'What each NBA city is like to play in, and what its fans are like.',
    entries: () =>
      NBA_TEAMS.map((t) => {
        const c = CITY_CULTURES[t.abbr];
        const f = FAN_CULTURES[t.abbr];
        return {
          key: t.abbr,
          title: `${t.city} ${t.nick}`,
          sub: [c?.name, f?.name].filter(Boolean).join(' · '),
          text: c?.text,
          art: () => (
            <>
              <Icon name={`city${t.abbr}`} size={44} />
              <Icon name={`fan${t.abbr}`} size={44} />
            </>
          ),
          facts: f
            ? ([
                ['Crowd', signed(f.crowd, 2)],
                ['Playoffs', signed(f.playoff, 2)],
                ['Winning', signed(f.win, 0)],
                ['Losing', signed(f.lose, 0)],
              ] as [string, string][])
            : [],
          lines: [...(c ? [`Good: ${c.good}`, `Bad: ${c.bad}`] : []), ...(f ? [`Fans: ${f.text}`] : [])],
        };
      }),
  },
  {
    key: 'nicknames',
    name: 'Nicknames',
    icon: 'mic',
    blurb: 'Every nickname the media can hand out (filled in for a sample player), with its logo.',
    entries: () =>
      NICKNAMES.map((n) => ({
        key: n.id,
        title: fillName(n.name),
        sub: Object.keys(n.fit).join(', '),
        text: `They call you ${fillName(n.name)}, ${n.why}`,
        art: () => <NickLogo id={n.id} name={fillName(n.name)} size={64} />,
      })),
  },
  {
    key: 'brands',
    name: 'Brands',
    icon: 'shoe',
    blurb: 'The brands that offer endorsement deals.',
    entries: () =>
      BRANDS.map((b) => ({
        key: b.name,
        title: b.name,
        sub: b.color,
        art: () => <BrandLogo name={b.name} color={b.color} size={64} />,
      })),
  },
  {
    key: 'staff',
    name: 'Staff',
    icon: 'trust',
    blurb: 'The people he can hire, what they cost and what they do.',
    entries: () =>
      Object.values(STAFF).map((st) => ({
        key: st.role,
        title: st.title,
        sub: `${fmtMoney(st.salary)} a season`,
        text: st.does,
        art: () => <StaffScene name={st.title} role={st.role} place={st.place} title={st.title} />,
        lines: [`The pitch: ${st.pitch}`, ...st.talk.slice(0, 2).map((t) => `Says: ${t}`)],
      })),
  },
  {
    // round 32 (owner: "add coach designs into the devdeck catalog"): every NBA team's head coach
    // as a new game has him, and the man who would replace him, by temperament
    key: 'coaches',
    name: 'Coaches',
    icon: 'whistle',
    blurb: 'The head coaches: each team’s first and the next in line, in their own pixel art, by temperament.',
    entries: () =>
      NBA_TEAMS.flatMap((t) =>
        [0, 1].map((n) => {
          const c = coachOf({ id: t.abbr, coachN: n } as Team);
          return {
            key: `${t.abbr}-${n}`,
            title: c.name,
            sub: `${t.city} ${t.nick} · ${n ? 'next in line' : 'head coach'}`,
            group: TEMPER[c.temper],
            text: TEMPER_FX[c.temper],
            art: () => <CoachArt coach={c} color={t.color} size={72} />,
          };
        }),
      ),
  },
  {
    // round 32: who a teammate can be in the locker room, and what he says when you walk up
    key: 'personas',
    name: 'Locker room',
    icon: 'locker',
    blurb: 'The characters teammates take in the locker room, what each says and what he can say back.',
    entries: () =>
      (Object.keys(PERSONA) as Persona[]).map((k, i) => {
        const mate: Mate = { id: i + 1, name: 'Marcus Vale', pos: (['PG', 'SG', 'SF', 'PF', 'C', 'SF'] as const)[i], age: 27, ovr: 75, persona: k };
        const talk = talkFor({ mates: [mate] } as unknown as Room, String(mate.id));
        return {
          key: k,
          title: PERSONA[k],
          sub: PERSONA_WHO[k],
          text: talk?.line,
          art: () => <PlayerArt name={`${k} Vale`} number={(i * 11) % 49 + 1} pos={mate.pos} size={72} noBall />,
          lines: talk?.options.map((o) => `Answer: ${o.label}`),
        };
      }),
  },
  {
    // round 32: the record watch's targets
    key: 'records',
    name: 'League records',
    icon: 'record',
    blurb: 'The single-game records and the all-time scoring list the record watch counts toward.',
    entries: () => [
      ...Object.entries(GAME_RECORDS).map(([k, r]) => ({
        key: k,
        title: `${r.v} ${r.what}`,
        group: 'Single game',
        art: () => <Icon name="record" size={48} />,
      })),
      ...SCORING_LIST.slice(0, 25).map((l, i) => ({
        key: `list-${l.name}`,
        title: `${i + 1}. ${l.name}`,
        sub: `${l.pts.toLocaleString('en-US')} points`,
        group: 'All-time scoring list',
        art: () => <LegendBust name={l.name} team={LEGEND_TEAM[l.name] ?? ''} size={56} />,
      })),
    ],
  },
  {
    // round 32: what the road arenas can give on a farewell tour
    key: 'gifts',
    name: 'Farewell gifts',
    icon: 'gift',
    blurb: 'What a road arena can give him on a farewell tour; six of them, one each, at its end.',
    entries: () =>
      FAREWELL_GIFTS.map((x, i) => ({
        key: x,
        title: x[0].toUpperCase() + x.slice(1),
        art: () => (
          <span className="shop-tile" style={{ ['--tile' as string]: SHIFT_COLOR[i % SHIFT_COLOR.length] }}>
            <Icon name="gift" shift={i % 6} size={40} />
          </span>
        ),
      })),
  },
  {
    key: 'legends',
    name: 'Legends',
    icon: 'hall',
    blurb: 'The all-time list his career is measured against, with portraits.',
    entries: () =>
      LEGENDS.map((l) => ({
        key: l.name,
        title: `${l.rank}. ${l.name}`,
        sub: `${NAMES.pos[l.pos]} · ${l.seasons} seasons`,
        group: NAMES.pos[l.pos],
        art: () => <LegendBust name={l.name} team={LEGEND_TEAM[l.name] ?? ''} size={64} />,
        facts: [
          ['PPG', l.ppg.toFixed(1)],
          ['RPG', l.rpg.toFixed(1)],
          ['APG', l.apg.toFixed(1)],
          ['Titles', String(l.titles)],
          ['MVPs', String(l.mvp)],
          ['All-Star', String(l.allStar)],
        ] as [string, string][],
      })),
  },
  {
    key: 'roles',
    name: 'Ring-chaser roles',
    icon: 'swap',
    blurb: 'The specialist roles a veteran can take to chase a ring.',
    entries: () =>
      Object.entries(CHASER_ROLES).map(([k, r]) => ({
        key: k,
        title: r.name,
        sub: k,
        text: r.text,
        art: () => <HeroArt pose={archPose(r.name, 'SF')} model={r.name} number={(hash(r.name) % 54) + 1} kit={{ base: '#2A2F36', ink: '#FFFFFF', trim: '#C9CFDA', word: '' }} size={96} />,
        lines: [...attrList(r.up, 0), ...attrList(r.down, 0).map((x) => x.replace('+', '−')), ...(r.range ? [`Range +${r.range}`] : [])],
      })),
  },
  {
    key: 'looks',
    name: 'Looks',
    icon: 'person',
    // round 27 (owner: "use that for the user avatar choice"): the parts every avatar is built from
    blurb: 'The parts every avatar is built from, and that a player picks on the identity step: skin, hair colour, hair and facial hair.',
    entries: () => {
      const base: ChosenLook = { skin: 3, hair: 'k', style: 'short', face: 'none' };
      const one = (key: string, title: string, group: string, look: ChosenLook, sub?: string): Entry => ({
        key,
        title,
        group,
        sub,
        art: () => <LookPreview name={`Catalog look ${key}`} number={7} look={look} jersey="white" size={96} />,
      });
      return [
        ...SKIN_COLORS.map((c, i) => one(`skin-${i}`, `Skin ${i + 1}`, 'Skin', { ...base, skin: i }, c)),
        ...LOOK_HAIRS.map((h) => one(`hair-${h}`, HAIR_NAME[h], 'Hair colour', { ...base, hair: h })),
        ...LOOK_STYLES.map((s) => one(`style-${s}`, STYLE_NAME[s], 'Hair', { ...base, style: s })),
        ...LOOK_FACES.map((f) => one(`face-${f}`, FACE_NAME[f], 'Facial hair', { ...base, face: f })),
      ];
    },
  },
  {
    key: 'courts',
    name: 'Intro courts',
    icon: 'ball',
    blurb: 'The courts behind the intro’s one-on-one, in a career’s order, five seconds each.',
    entries: () =>
      VENUES.map((v, i) => ({
        key: v.cls,
        title: v.where,
        sub: `${i * 5}–${i * 5 + 5} s`,
        art: () => (
          <div className="cat-venue">
            <Venue draw={v.draw} />
          </div>
        ),
      })),
  },
  {
    // round 29: the music, a loop for each part of the game (ui/tracks.ts; play them on the Music tab)
    key: 'music',
    name: 'Music loops',
    icon: 'note',
    blurb: 'A loop for each part of the game: the intro and the curtain call, every level and league, the offseason, each mini-game but Lockdown. Play them on the Music tab.',
    entries: () =>
      (Object.keys(TRACKS) as TrackId[]).map((id) => {
        const t = TRACKS[id];
        const steps = Math.max(...t.voices.map((v) => parseVoice(v.notes).length), t.drums?.length ?? 0);
        return {
          key: id,
          title: t.name,
          sub: t.where,
          group: ['hub', 'floor', 'threes', 'dunk', 'lab', 'street', 'legends'].includes(id) ? 'Mini-games' : ['intro', 'thanks', 'start'].includes(id) ? 'Pages' : 'In a career',
          art: () => <Icon name={t.icon} size={44} />,
          facts: [
            ['Tempo', `${Math.round(30 / t.step)} bpm`],
            ['Loop', `${steps / 8} bars, ${(steps * t.step).toFixed(1)} s`],
            ['Voices', t.voices.map((v) => v.wave).join(', ') + (t.drums ? ', drums' : '')],
          ] as [string, string][],
        };
      }),
  },
  {
    key: 'house',
    name: 'House players',
    icon: 'crowd',
    blurb: 'Small careers the game played itself: at the foot of the leaderboards and in the statue plaza until real careers push them down.',
    entries: () =>
      houseRecords().map((r) => {
        const statue = r.id.startsWith('house-statue');
        return {
          key: r.id,
          title: r.name,
          sub: `${NAMES.pos[r.pos]} · #${r.number}`,
          group: statue ? 'Statues' : MODES[r.mode].name,
          art: () => (statue ? <PlayerStatue name={r.name} number={r.number} pos={r.pos} metal="bronze" size={96} /> : <PlayerArt name={r.name} number={r.number} pos={r.pos} color={r.team?.color ?? '#2A2F36'} size={96} />),
          facts: [
            ['Peak', r.peak.toFixed(1)],
            ['Tier', r.tier],
            ['Index', (r.index?.score ?? 0).toFixed(1)],
          ] as [string, string][],
        };
      }),
  },
  // ---------- round 33: the road map ----------
  {
    key: 'road',
    name: 'Road map levels',
    icon: 'map',
    blurb: 'The tutorial’s three short careers: where each starts, what it adds, how long it runs, and how it is tuned so most make the All-Star goal.',
    entries: () =>
      LEVEL_IDS.map((l) => {
        const c = LEVEL_COPY[l];
        const r = ROADMAP[l];
        return {
          key: l,
          title: `Level ${c.n}: ${LEVEL_NAME[l]}`,
          sub: c.place,
          text: c.lede,
          art: () => <PlaceArt place={l} size={120} />,
          facts: [
            ['NBA seasons', String(r.nbaSeasons)],
            ['Potential', `${r.potential.base} base, ${r.potential.min} at least`],
            ['Growth', `×${r.growth}`],
            ['Floor', `OVR ${r.floor.ovr}, ages ${r.floor.age} to ${r.floor.until}`],
          ] as [string, string][],
          lines: c.adds.map((a) => `Adds: ${a.label}`),
        };
      }),
  },
  {
    key: 'island',
    name: 'The island',
    icon: 'palm',
    blurb: 'Every mini-game once with a C or better, between levels: the mark for each grade.',
    entries: () =>
      ROAD_MINIS.map((m) => {
        const g = GAMES.find((x) => x.id === m);
        const marks = m === 'floor' ? { A: FLOOR_MINI.grade.A, B: 1, C: FLOOR_MINI.grade.C } : (ROAD_GRADES as Record<string, Partial<Record<'A' | 'B' | 'C', number>>>)[m];
        return {
          key: m,
          title: g?.name ?? m,
          sub: `C: ${ROAD_NEED[m]}`,
          art: () => <Icon name={miniIcon(m)} size={44} />,
          facts: marks ? (Object.entries(marks).map(([k, v]) => [k, String(v)]) as [string, string][]) : undefined,
        };
      }),
  },
  {
    key: 'lessons',
    name: 'Tutorial lessons',
    icon: 'guide',
    blurb: 'Every lesson of the tutorial guide in order, by where it shows. A lesson to read waits for Got it; a lesson to do waits for its control.',
    entries: () =>
      LESSONS.map((l) => ({
        key: l.id,
        title: l.id,
        group: WHERE_NAME[l.at],
        sub: l.act ? 'Use the control' : 'Got it',
        text: l.text,
        lines: [`Points at ${l.sel}`, ...(l.after ? [`After ${l.after}`] : [])],
      })),
  },
  {
    key: 'stops',
    name: 'Closing tour stops',
    icon: 'arena',
    blurb: 'The closing tour in order: a star’s career staged for each stop, and the lessons it shows. A stop whose lessons are all done is skipped.',
    entries: () =>
      STOPS.map((st, i) => ({
        key: st.id,
        title: `${i + 1}. ${st.title}`,
        sub: st.tab ? `The ${st.tab[0].toUpperCase()}${st.tab.slice(1)} tab` : 'Home',
        group: i < 9 ? 'What no level has' : i < STOPS.length - 1 ? 'The catch-up' : 'The switches',
        lines: st.lessons.map((id) => LESSONS.find((x) => x.id === id)?.text ?? id),
      })),
  },
  // ---------- round 35 ----------
  {
    key: 'ach-cats',
    name: 'Achievement categories',
    icon: 'laurel',
    blurb: 'The book’s chapters (engine/achievementCats.ts): a short name each, so a category says where to look without giving a riddle away. None holds more than a tenth of the book.',
    entries: () => {
      const n = ACHIEVEMENTS.length;
      return ACH_CATS.map((c) => {
        const k = ACHIEVEMENTS.filter((a) => achCatOf(a.id) === c.key).length;
        return {
          key: c.key,
          title: c.name,
          art: () => <Icon name={c.icon} size={44} />,
          facts: [
            ['Achievements', String(k)],
            ['Share of the book', `${((100 * k) / n).toFixed(1)}%`],
          ] as [string, string][],
        };
      });
    },
  },
  // ---------- round 36 ----------
  {
    key: 'endings',
    name: 'Endings',
    icon: 'cards',
    blurb: 'The twelve endings of a finished career, in the order they are tried, the first that fits winning (ui/endings.ts): the rafters keeps its ceremony, the rest open on a scene of their own (art/Endings.tsx), shown here as the book’s tiles, under a theme of their own.',
    entries: () =>
      ENDING_IDS.map((k, i) => ({
        key: k,
        title: ENDINGS[k].name,
        sub: `${i + 1} of ${ENDING_IDS.length}`,
        text: ENDINGS[k].fits,
        art: () => (
          <div className="end-frame" style={{ width: '100%' }}>
            <EndingArt kind={k} className="end-art" />
          </div>
        ),
        facts: [
          ['Place', ENDINGS[k].place],
          ['Theme', TRACKS[k].name],
        ] as [string, string][],
      })),
  },
  // ---------- round 37 ----------
  // round 39: the Floor, the last six minutes of a game that can end his season
  {
    key: 'floor',
    name: 'The Floor',
    icon: 'clutch',
    blurb: `The game on the court: the frames its players are drawn in, its shots, its moves and its rules. Play runs at ${(FLOOR.tick * FLOOR.ticksPerSec).toFixed(1)} times real speed from the tip to the horn; the Floor's own game runs its clock ${FLOOR.rate} times faster again (a twelve-minute quarter in four real minutes).`,
    entries: () => [
      ...(Object.entries(FRAME_POSES) as [Frame, Pose][]).map(([k, pose]) => ({
        key: `fr-${k}`,
        title: FRAME_WORDS[k][0],
        group: 'Frames',
        text: FRAME_WORDS[k][1],
        art: () => <PlayerArt name="Jordan Vale" number={23} frame={pose} noBall size={64} />,
      })),
      ...(['rim', 'paint', 'mid', 'three'] as const).map((z) => ({
        key: `sh-${z}`,
        title: { rim: 'At the rim', paint: 'In the paint', mid: 'Mid-range', three: 'From three' }[z],
        group: 'Shots',
        text: z === 'rim' ? 'One tap of J lays it in or dunks (a dunk for an athletic finisher). A defender close by may strip it or block it.' : 'Held on J, let go in the green: the meter fills in one real second.',
        art: () => <Icon name={z === 'three' ? 'shoot' : 'ball'} size={44} />,
        facts: [
          ['Base chance', pct(FLOOR.shot[z], 0)],
          ['Per rating point over 70', `+${(FLOOR.shot.perPoint[z] * 100).toFixed(2)}%`],
        ] as [string, string][],
      })),
      {
        key: 'mv-moves',
        title: 'Crossover, spin, step-back',
        group: 'Moves',
        text: 'L with the ball: across him, a spin when moving up or down, a step-back when moving away from the rim.',
        art: () => <Icon name="ball" size={44} />,
        facts: [
          ['Beats his man', `${pct(FLOOR.move.beat, 0)} at equal ratings, ${(FLOOR.move.perPoint * 100).toFixed(1)}% a point of handling over his defending`],
          ['Loses the ball', pct(FLOOR.move.lose, 0)],
        ] as [string, string][],
      },
      {
        key: 'mv-finish',
        title: 'Strips and blocks at the rim',
        group: 'Moves',
        text: 'A defender inside five feet can strip a one-tap layup on the way up or block it; his athleticism takes some of both away.',
        art: () => <Icon name="lockdown" size={44} />,
        facts: [
          ['Strip, right on him', pct(FLOOR.finish.strip, 0)],
          ['Taken away at 99 athleticism', pct(FLOOR.finish.athletic, 0)],
          ['Block reach', `${FLOOR.block.reach} ft`],
        ] as [string, string][],
      },
      {
        key: 'rl-dead',
        title: 'Dead balls, without teleports',
        group: 'Rules',
        text: 'The inbounder walks to the ball and passes it in (never him: the pass comes to him), a free-throw shooter walks to the line, a rebound bounces to the man who wins it. Nobody shoots from behind half court.',
        art: () => <Icon name="clutch" size={44} />,
        facts: [
          ['Longest wait for a walk', `${FLOOR.walk} game seconds`],
          ['Inbound from within', `${FLOOR.inboundReach} ft`],
        ] as [string, string][],
      },
      {
        key: 'rl-career',
        title: 'In a career',
        group: 'Rules',
        text: 'Conference finals and Finals games one loss from going home. Both starting fives are centred on their midpoint and split by the strength gap the season sees.',
        art: () => <Icon name="bracket" size={44} />,
        facts: [['Rating points per point of strength', String(FLOOR.perStrength)]] as [string, string][],
      },
      // round 39: the mini-game in Front Office's place, its strengths and its grades
      ...FLOOR_STRENGTHS.map((k) => {
        const five = floorRoster('U', FLOOR_MINI.strength[k], 7).slice(0, 5);
        return {
          key: `mg-${k}`,
          title: `${k[0].toUpperCase()}${k.slice(1)} teams`,
          group: 'The mini-game',
          text: `Both teams generated at ${FLOOR_MINI.strength[k]}: five starters by position a few points either side, three off the bench ${FLOOR_MINI.roster.bench} below. From the start page; a career off the NBA puts him in his own spot.`,
          art: () => <Icon name="floor" size={44} />,
          facts: [
            ['Starters (a sample)', five.map((p) => `${p.pos} ${Math.round(ovrOf(p.r, p.pos))}`).join(', ')],
            ['Each player', `±${FLOOR_MINI.roster.wobble / 2}`],
          ] as [string, string][],
        };
      }),
      {
        key: 'mg-grades',
        title: 'The grade',
        group: 'The mini-game',
        text: `The margin, with his line's share (a game score at ${FLOOR_MINI.perLine} a point, at most ${FLOOR_MINI.cap} either way). A win is a B, an A at ${FLOOR_MINI.grade.A} or more; a loss is a C at ${FLOOR_MINI.grade.C} or more, a D below. C or better passes the island.`,
        art: () => <Icon name="laurel" size={44} />,
        facts: (['A', 'B', 'C'] as const).map((g) => [`${g}: IQ / playmaking`, `+${FLOOR_MINI.reward[g].IQ} / +${FLOOR_MINI.reward[g].PLY}`]) as [string, string][],
      },
      {
        key: 'mg-start',
        title: 'The start',
        group: 'The mini-game',
        text: `Six minutes left, about ${FLOOR_MINI.start.base} each (${FLOOR_MINI.start.spread} either way), his team up to ${FLOOR_MINI.start.gap} ahead or behind, on the standard difficulty. In an NBA career: his own team and the real rosters, split by the strength gap.`,
        art: () => <Icon name="clutch" size={44} />,
      },
    ],
  },
  // round 38: story mode's chapters, one a summer at most
  {
    key: 'story',
    name: 'Story mode chapters',
    icon: 'book',
    blurb: `The ${STORY_CHAPTERS.length} chapters of a story mode career, each with the person it is with. Their lines are keyed in content/story.ts, so every language tells them.`,
    entries: () =>
      STORY_CHAPTERS.map((ch) => ({
        key: ch.id,
        title: ch.title,
        group: STORY_WHO[ch.who][0],
        sub: ch.id,
        art: () => <StoryPortrait role={ch.who} name={STORY_WHO[ch.who][1]} size={56} />,
      })),
  },
  {
    key: 'arenas',
    name: 'NBA arenas in the town',
    icon: 'arena',
    blurb: 'Each NBA team’s arena on the town’s street (ui/arenas.ts, art/arenaArt.ts): a roof and a skin in the spirit of its building, the team’s emblem over the doors and a landmark of its city beside it. Any other arena, and every high school, is built from its name.',
    entries: () =>
      NBA_TEAMS.map((t) => {
        const a = NBA_ARENAS[t.abbr];
        const town: Town = { look: 'city', name: t.abbr, color: TEAM_STYLE[t.abbr].c1, club: `${t.city} ${t.nick}`, abbr: t.abbr, school: '', house: 'flat', places: [{ id: 'arena', tab: 'season', name: `${`${t.city} ${t.nick}`} arena` }], car: false, hoop: false, statue: false, mural: null, sign: false };
        return {
          key: t.abbr,
          title: `${t.city} ${t.nick}`,
          sub: a.why,
          text: `A ${a.roof} roof over ${a.skin}; beside it, ${a.why.split('; ').pop()}.`,
          art: () => (
            <div className="town cat-town" style={{ width: '100%', height: 'auto' }}>
              <TownArt town={town} here={null} />
            </div>
          ),
          facts: [
            ['Roof', a.roof],
            ['Skin', a.skin],
            ['Landmark', a.mark ?? ''],
            ['Side', a.side === 'l' ? 'left' : 'right'],
          ] as [string, string][],
        };
      }),
  },
  {
    key: 'unlocks',
    name: 'What the road map opens',
    icon: 'unlock',
    blurb: 'Beginner is the tutorial; the rest of the road map opens the rest of the game (ui/road.ts). A device that finished the old tutorial keeps everything.',
    entries: () =>
      (Object.keys(UNLOCK_FROM) as Unlock[]).map((u) => ({
        key: u,
        title: UNLOCK_NAME[u][0].toUpperCase() + UNLOCK_NAME[u].slice(1),
        sub: `From ${UNLOCK_FROM[u] === 'island' ? 'the island' : `the ${UNLOCK_FROM[u]} level`}`,
        text: unlockHint(u),
        art: () => <Icon name="unlock" size={44} />,
      })),
  },
  {
    key: 'friends',
    name: 'Play with friends',
    icon: 'versus',
    blurb: 'The two ways to play with friends (ui/multiplayer.ts), on the game’s database in the online build (supabase/migrations/0004 to 0006), with what friends bring into each other’s careers. Regular guy only; Fast break and Sim locked off.',
    entries: () => [
      {
        key: 'challenge',
        title: 'Challenge a friend',
        text: 'A finished Regular guy career’s start (its seed and start page) with its card; a friend plays the same prospect, with no undo, and every answer is ranked beside it by career index.',
        art: () => <Icon name="versus" size={44} />,
        facts: [
          ['Code', '6 characters, no I, O, 0 or 1'],
          ['Answers', 'one a player, the best counts'],
          ['Quick match', 'the last 30 days, fewest answers first'],
          ['Limits', 'a challenge every 20 s, 30 a day'],
        ] as [string, string][],
      },
      {
        key: 'class',
        title: 'Draft class',
        text: 'Careers on one seed: each season posts a short line, each finished career its card. Standings by best rating so far, then honours; the best of the class each year.',
        art: () => <Icon name="draftclass" size={44} />,
        facts: [
          ['Players', `${CLASS_MAX} at most`],
          ['Season lines', '45 at most, 1.5 KB each'],
          ['Quick match', 'the last 14 days, a seat left'],
          ['Limits', 'a season every 2 s, 600 a day'],
        ] as [string, string][],
      },
      {
        key: 'rivals',
        title: 'Rivals in a class',
        text: 'Each member picks one classmate; two who pick each other are rivals. Once a season their NBA teams meet in a rival night (events/friends.ts), from the classmate’s season line copied into the career.',
        art: () => <Icon name="rival" size={44} />,
        facts: [
          ['Odds', '15% to 85%: team strength, OVR, the call'],
          ['Kept', 'the last 30 meetings'],
          ['Limits', 'a pick every 5 s, 50 a day'],
        ] as [string, string][],
      },
      {
        key: 'friend-duo',
        title: 'Duo of friends',
        text: 'Two classmates on one team in one season form a duo, three a Big Three (career/friends.ts); it counts as the career’s duo or Big Three when it has none of its own.',
        art: () => <Icon name="superteam" size={44} />,
        facts: [['From', 'last season’s line, or this one’s']] as [string, string][],
      },
      {
        key: 'chat',
        title: 'Chat',
        text: 'One for each challenge and each class, under its board, for its people only (a class’s members; a challenge’s maker, takers and answerers).',
        art: () => <Icon name="envelope" size={44} />,
        facts: [
          ['Line', '200 characters, no control characters'],
          ['Kept', 'the latest 200 lines, 50 shown'],
          ['Limits', 'a line every 3 s, 300 a day'],
          ['News', 'drafted, traded, left the NBA, Rookie of the Year, first All-Star, MVP, a title, retired'],
        ] as [string, string][],
      },
      {
        key: 'draft-night',
        title: 'Draft night',
        text: 'A draft class career opens on draft night (engine/career/draftNight.ts): his college’s first option, projected and picked in the first round, the whole class in the same draft.',
        art: () => <Icon name="draftclass" size={44} />,
        facts: [
          ['OVR', `${DRAFT_NIGHT.ovr[0]} to ${DRAFT_NIGHT.ovr[1]}`],
          ['Ages', DRAFT_NIGHT.ages.map(([a, w]) => `${a} (${w})`).join(', ')],
          ['Pick', `1 to ${DRAFT_NIGHT.firstRound}, near the mock`],
        ] as [string, string][],
      },
      {
        key: 'league',
        title: 'Classmates in your league',
        text: 'A classmate on his NBA team this season is in your game log against that team, in the award races (he can win MVP) and on the All-Star teams (engine/career/friendLeague.ts).',
        art: () => <Icon name="crown" size={44} />,
        facts: [['Lift', 'his team a little stronger against you, at most about home court']] as [string, string][],
      },
      {
        key: 'series',
        title: 'Rival series',
        text: 'When his team meets his rival classmate’s in the playoffs, one call for the whole series: guard him, outscore him, or the team game (engine/career/rivalSeries.ts).',
        art: () => <Icon name="bracket" size={44} />,
      },
      {
        key: 'join',
        title: 'Join a friend',
        text: 'A trade request aimed at a classmate’s NBA team, limited by the two salaries together against the cap.',
        art: () => <Icon name="swap" size={44} />,
        facts: [
          ['Off', `over ${Math.round(JOIN_FRIEND.ceiling * 100)}% of the cap together`],
          ['Payroll', `no more than ${JOIN_FRIEND.apron} × the cap with both`],
        ] as [string, string][],
      },
      {
        key: 'reunion',
        title: 'Reunion night',
        text: 'When every career in a class is over (or quiet for two weeks), eleven awards one at a time: most games, most teams, rebounds, assists, earnings, points, highest peak, All-Stars, MVPs, rings, then the class MVP.',
        art: () => <Icon name="laurel" size={44} />,
      },
      {
        key: 'reactions',
        title: 'Reactions and the daily board',
        text: 'Four reactions on a classmate’s season (on fire, royalty, love it, ice cold), one each; and the daily challenge among friends: everyone a player shares a class or a challenge with.',
        art: () => <Icon name="flame" size={44} />,
      },
    ],
  },
  {
    key: 'beginner-events',
    name: 'Beginner’s turning points',
    icon: 'book',
    blurb: 'Beginner’s one turning point a season, in this order (the next that fits when one does not); each teaches one thing.',
    entries: () =>
      BEGINNER_EVENTS.flatMap((id, i) => {
        const e = EVENT_SETS.flatMap(([, list]) => list).find((x) => x.id === id);
        return e ? [{ ...eventEntry('Beginner', e), key: `beg-${id}`, title: `${i + 1}. ${e.title}`, group: undefined }] : [];
      }),
  },
];

const WHERE_NAME: Record<Where, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', tour: 'The closing tour', graduated: 'After graduation' };

/** Each group together, in the order the groups first appear (a stable sort). */
function byGroup(list: Entry[]): Entry[] {
  const order = [...new Set(list.map((e) => e.group ?? ''))];
  return list.map((e, i) => [e, i] as const).sort(([a, i], [b, j]) => order.indexOf(a.group ?? '') - order.indexOf(b.group ?? '') || i - j).map(([e]) => e);
}

function Card({ e, label }: { e: Entry; label?: string }) {
  return (
    <article className={`cat-item${e.edge ? ' edged' : ''}`} style={e.edge ? ({ ['--edge' as string]: e.edge } as CSSProperties) : undefined}>
      {e.art && <div className="cat-art">{e.art()}</div>}
      <div className="cat-body">
        {(label || e.sub) && <div className="cat-sub">{[label, e.sub].filter(Boolean).join(' · ')}</div>}
        <h3 className="cat-title">{e.title}</h3>
        {e.text && <p className="cat-text">{e.text}</p>}
        {e.facts && e.facts.length > 0 && (
          <dl className="cat-facts">
            {e.facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {e.lines && e.lines.length > 0 && (
          <ul className="cat-lines">
            {e.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

const matches = (e: Entry, words: string[]) => {
  const hay = [e.title, e.sub, e.text, ...(e.facts ?? []).flat(), ...(e.lines ?? [])].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
};

export function Catalog() {
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);
  const cache = useMemo(() => new Map<string, Entry[]>(), []);
  const entriesOf = (c: Category) => {
    if (!cache.has(c.key)) cache.set(c.key, c.entries());
    return cache.get(c.key)!;
  };
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const current = CATEGORIES.find((c) => c.key === cat);
  // one category, or (with words to look for) every category at once
  const list: { e: Entry; label?: string }[] = current
    ? byGroup(entriesOf(current).filter((e) => matches(e, words))).map((e) => ({ e }))
    : words.length
      ? CATEGORIES.flatMap((c) =>
          entriesOf(c)
            .filter((e) => matches(e, words))
            .map((e) => ({ e, label: c.name })),
        )
      : [];
  const pick = (k: string) => (setCat(k), setShown(PAGE));

  return (
    <section className="cat" aria-label="Catalog">
      <div className="cat-tools">
        <div className="cat-chips" role="group" aria-label="Categories">
          <button className="cat-chip" aria-pressed={cat === 'all'} onClick={() => pick('all')}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.key} className="cat-chip" aria-pressed={cat === c.key} onClick={() => pick(c.key)}>
              <Icon name={c.icon} size={18} />
              {c.name}
            </button>
          ))}
        </div>
        <input
          className="cat-search"
          type="search"
          value={q}
          placeholder={current ? `Search ${current.name.toLowerCase()}` : 'Search every list'}
          aria-label={current ? `Search ${current.name}` : 'Search every list'}
          onChange={(ev) => (setQ(ev.target.value), setShown(PAGE))}
        />
      </div>
      {current && (
        <p className="cat-blurb">
          <b>{current.name}</b> · {list.length} of {entriesOf(current).length}. {current.blurb}
        </p>
      )}
      {!current && !words.length ? (
        <div className="cat-overview">
          {CATEGORIES.map((c) => (
            <button key={c.key} className="cat-tile" onClick={() => pick(c.key)}>
              <Icon name={c.icon} size={40} />
              <b>{c.name}</b>
              <small>{c.blurb}</small>
            </button>
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="muted">Nothing matches. Try fewer or shorter words.</p>
      ) : (
        <>
          {!current && <p className="cat-blurb">{list.length} matches across every list.</p>}
          <div className="cat-grid">
            {list.slice(0, shown).map(({ e, label }, i, all) => (
              <Fragment key={`${label ?? ''}-${e.key}`}>
                {/* round 27: a heading where a new group starts (only inside one list) */}
                {current && e.group && e.group !== all[i - 1]?.e.group && (
                  <h3 className="cat-group">
                    {e.group} <small>{list.filter((x) => x.e.group === e.group).length}</small>
                  </h3>
                )}
                <Card e={e} label={label} />
              </Fragment>
            ))}
          </div>
          {list.length > shown && (
            <button className="btn ghost cat-more" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({list.length - shown} left)
            </button>
          )}
        </>
      )}
    </section>
  );
}
