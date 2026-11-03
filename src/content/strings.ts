// All UI text lives here so a Korean version is easy later.

import type { AttrKey, HalfPlan, LevelKey, Pos, RoleKey } from '../engine/types';
import { tx } from '../i18n';

export const NAMES = {
  attr: {
    SHT: 'Shooting',
    FIN: 'Finishing',
    PLY: 'Playmaking',
    PER: 'Perimeter D',
    INT: 'Interior D',
    REB: 'Rebounding',
    ATH: 'Athleticism',
    IQ: 'Basketball IQ',
  } as Record<AttrKey, string>,
  attrBlurb: {
    SHT: '3P%, mid-range, free throws',
    FIN: 'Shots at the rim, getting fouled',
    PLY: 'Assists, fewer turnovers',
    PER: 'Steals, guarding the perimeter',
    INT: 'Blocks, protecting the rim',
    REB: 'Rebounds',
    ATH: 'A little of everything, durability',
    IQ: 'Efficiency, coach trust',
  } as Record<AttrKey, string>,
  pos: { PG: 'Point guard', SG: 'Shooting guard', SF: 'Small forward', PF: 'Power forward', C: 'Center' } as Record<Pos, string>,
  role: {
    key: 'Key player',
    starter: 'Starter',
    sixth: 'Sixth man',
    rotation: 'Rotation',
    bench: 'End of bench',
    deep: 'Deep bench',
  } as Record<RoleKey, string>,
  plan: {
    balanced: 'Balanced',
    grind: 'Grind',
    recovery: 'Recovery',
    spotlight: 'Spotlight',
    teamfirst: 'Team first',
    shooting: 'Shooting lab',
    strength: 'Weight room',
    playmaking: 'Film and reads',
    defense: 'Lockdown',
    offhand: 'Off-hand work',
  } as Record<HalfPlan, string>,
  level: {
    HSJV: 'HS JV',
    HSV: 'HS Varsity',
    NCAA: 'NCAA',
    GL: 'G League',
    EU: 'EuroLeague',
    INT: 'Overseas',
    NBA: 'NBA',
  } as Record<LevelKey, string>,
};

export const UI = {
  appName: 'Bench to Rafters',
  tagline: 'From a freshman nobody knows to a jersey in the rafters.',
  tabs: { home: 'Home', season: 'Season', player: 'Player', records: 'Records', extras: 'Extras' },
  // round 40: the interface's words are marked for the catalog; the screens show them with t()
  create: {
    steps: [tx('Difficulty'), tx('Identity'), tx('Archetype'), tx('Focus'), tx('Confirm')],
    random: 'Random',
    name: tx('Name'),
    number: tx('Jersey number'),
    assignedTitle: tx('Hometown and high school'),
    assignedText: tx('You do not pick these. You find out which town you grew up in and which school or academy you play for when the career starts.'),
    position: tx('Position'),
    otherCandidates: tx('See other candidates'),
    focusHelp: tx('Pick two focus stats. They develop much faster than the rest.'),
    start: tx('Start freshman season'),
    next: tx('Next'),
    back: tx('Back'),
    equalNote: tx('Every card totals 320. Talent is hidden: potential, growth curve and durability are rolled when you start.'),
  },
  hub: {
    playFirst: tx('Play first half'),
    playSecond: tx('Play second half'),
    toOffseason: tx('Go to the offseason'),
    nextSeason: (y: number) => `Start the ${y}–${String(y + 1).slice(2)} season`,
    todo: tx('To do'),
    nothingPending: tx('Nothing pending.'),
  },
  fictional: tx('Fictional reactions'),
  newCareer: tx('Start a new career'),
};

export const MILESTONES: { key: string; label: string }[] = [
  { key: 'jv', label: 'JV' },
  { key: 'varsity', label: 'Varsity' },
  { key: 'committed', label: 'Committed' },
  { key: 'drafted', label: 'Drafted' },
  { key: 'debut', label: 'NBA debut' },
  { key: 'thirty', label: '30-point game' },
  { key: 'allstar', label: 'All-Star' },
  { key: 'champion', label: 'Champion' },
  { key: 'mvp', label: 'MVP' },
  { key: 'rafters', label: 'Rafters' },
];
