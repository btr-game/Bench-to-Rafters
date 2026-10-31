// The catalog (round 25, owner: "the dev deck should have access to all options: a shop card shows
// every shop item, teams every team, injuries every injury; everything in the project summary
// visualized"). Every list the game draws from, read straight from the content and engine modules,
// one searchable grid per category, each entry with the game's own art where it has some.

import { useMemo, useState, type ReactNode } from 'react';
import './catalog.css';
import { HALF_PLANS, INJURY_SEVERITY, INJURY_TOLL, BASE_INJURY, LEVELS, LEAGUE_STRENGTH, MODES, WEAR, type Mode } from '../engine/balance';
import type { AttrKey, GameState, HalfPlan, LevelKey, Pos } from '../engine/types';
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
import { SHOP_ITEMS, type ShopItem } from '../content/shop';
import { NBA_TEAMS, COLLEGES, EURO_CLUBS, INT_LEAGUES, RIVALS } from '../content/teams';
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
import { Icon } from '../ui/art/Icon';
import { ICON_FOR, SHIFT_COLOR, shopIcon, shopShift } from '../ui/art/icons';
import { TeamArt } from '../ui/art/Crest';
import { JerseyArt } from '../ui/art/Jersey';
import { kitFor, type KitName } from '../ui/art/Player';
import { HeroArt, archPose } from '../ui/art/Hero';
import { POS_STYLE } from '../ui/art/PositionCard';
import { FlagArt } from '../ui/art/Flag';
import { AwardArt } from '../ui/art/Award';
import { NickLogo } from '../ui/art/NickLogo';
import { LegendBust } from '../ui/art/Legend';
import { PlaybookArt } from '../ui/art/Playbook';
import { StaffScene } from '../ui/art/Scene';
import { hash } from '../ui/art/color';
import type { KitLeague } from '../content/teamStyle';

interface Entry {
  key: string;
  title: string;
  sub?: string;
  text?: string;
  art?: () => ReactNode;
  facts?: [string, string][];
  lines?: string[];
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
    sub: `${set} · ${e.phase === 'mid' ? 'midseason' : e.phase === 'off' ? 'offseason' : 'any time'}`,
    text,
    art: () => <Icon name="news" size={40} />,
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

const SEVERITY: Record<string, string> = { dtd: 'Day-to-day', minor: 'Minor', major: 'Major', season: 'Season-ending' };
const SEV_SHIFT: Record<string, number> = { dtd: 3, minor: 2, major: 1, season: 0 };

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
const PATH: Record<string, string> = { us: 'High school, then college', euro: 'Club academy', academy: 'Academy abroad', aus: 'Australian pathway', canada: 'Canadian prep', asia: 'Asian league pathway' };

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
        sub: `${i.category} · ${fmtMoney(i.price)}`,
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
        sub: `NCAA · ${c.tier} · ${c.conf}`,
        art: teamArt(c.name, initials(c.name), c.color, 'NCAA'),
      })),
      ...EURO_CLUBS.map((c) => ({
        key: `eu-${c.name}`,
        title: c.name,
        sub: `EuroLeague · ${c.country}`,
        art: teamArt(c.name, c.short, c.color, 'EU'),
        facts: [['Strength', String(c.strength)]] as [string, string][],
      })),
      ...INT_LEAGUES.flatMap((l) =>
        l.teams.map(([name, color]) => ({
          key: `int-${l.key}-${name}`,
          title: name,
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
          sub: SEVERITY[sev.key],
          art: () => <Icon name="health" shift={SEV_SHIFT[sev.key]} size={44} />,
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
    entries: () => EVENT_SETS.flatMap(([set, list]) => list.map((e) => eventEntry(set, e))),
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
          text: a.blurb,
          art: () => <HeroArt pose={archPose(a.name, pos)} model={a.name} number={(hash(a.name) % 54) + 1} kit={{ base: POS_STYLE[pos].color, ink: '#FFFFFF', trim: '#F4F4F4', word: '' }} size={96} />,
          facts: [
            ...(Object.entries(a.attrs).map(([k, v]) => [NAMES.attr[k as AttrKey], String(v)]) as [string, string][]),
            ['Range', String(a.range)],
            ...(a.height ? ([['Height', `${signed(a.height, 0)} in`]] as [string, string][]) : []),
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
          sub: l.short,
          art: () => <Icon name="arena" size={44} />,
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
        sub: `${l.country}${l.amateur ? ' · university' : ''}`,
        art: () => <FlagArt country={l.country} size={44} />,
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
          title: NAMES.plan[k] ?? k,
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
            ...attrList(p.attrs).map((x) => `${x} a half`),
            ...(p.rangeGain ? [`Range +${p.rangeGain}`] : []),
            ...(p.offhandGain ? [`Off hand +${p.offhandGain}`] : []),
            ...(p.swing ? [`A gamble on ${p.swing.attrs.map((a) => NAMES.attr[a]).join(' and ')}: ${signed(p.swing.mean)} on average, give or take ${p.swing.sd}`] : []),
          ],
        };
      }),
  },
  {
    key: 'modes',
    name: 'Difficulties',
    icon: 'dial',
    blurb: 'The difficulty modes and the dials each one sets.',
    entries: () =>
      (Object.keys(MODES) as Mode[]).map((k) => {
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
      }),
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
          lines: attrList(t.weights).map((x) => `Weight on ${x}`),
        };
      }),
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
        art: () => (
          <span className="cat-swatch" style={{ background: b.color }}>
            {initials(b.name)}
          </span>
        ),
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
    key: 'legends',
    name: 'Legends',
    icon: 'hall',
    blurb: 'The all-time list his career is measured against, with portraits.',
    entries: () =>
      LEGENDS.map((l) => ({
        key: l.name,
        title: `${l.rank}. ${l.name}`,
        sub: `${NAMES.pos[l.pos]} · ${l.seasons} seasons`,
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
];

function Card({ e, label }: { e: Entry; label?: string }) {
  return (
    <article className="cat-item">
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
    ? entriesOf(current)
        .filter((e) => matches(e, words))
        .map((e) => ({ e }))
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
            {list.slice(0, shown).map(({ e, label }) => (
              <Card key={`${label ?? ''}-${e.key}`} e={e} label={label} />
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
