// What a player's country changes (playtest round 7). The effects are mild on purpose: the
// country shapes the road, not the destination.
// - USA: the whole recruiting system is built around American high schoolers.
// - Canada: close to US scouts, a small recruiting edge.
// - Europe: clubs pay and play their own; better EuroLeague contracts.
// - Africa: fewer coaches, gyms and resources; slower development until a US prep school.
// - Latin America: academies help, but resources are still thinner.
// - South Korea: about 18 months of military service before 28, served with the Sangmu army
//   team, unless an Asian Games gold or an Olympic medal earns an exemption (as it really does).

import type { Decision, GameState } from '../types';
import { originOf } from '../../content/origins';
import { logDecision, pushMoment, userOvr } from './common';
import { signContract } from './offseason';

export interface CountryEdge {
  recruit: number; // added to the recruiting score
  youthGrowth: number; // growth multiplier at home as a teenager
  euPay: number; // EuroLeague salary multiplier
  euRole: number; // OVR bonus when a European club judges his role
  military: boolean;
  notes: string[]; // shown when choosing a country
}

const BASE: CountryEdge = { recruit: 0, youthGrowth: 1, euPay: 1, euRole: 0, military: false, notes: [] };
const AFRICA = ['Nigeria', 'Senegal', 'Cameroon', 'South Sudan'];
const LATAM = ['Dominican Republic', 'Brazil', 'Mexico'];

export function edgeOf(country: string): CountryEdge {
  const o = originOf(country);
  if (o.country === 'USA') return { ...BASE, recruit: 2.5, notes: ['Easiest road: college recruiting is built around American high schoolers'] };
  if (o.country === 'Canada') return { ...BASE, recruit: 1, notes: ['Close to US scouts, with a path to US prep schools'] };
  if (o.path === 'euro') return { ...BASE, euPay: 1.3, euRole: 3, notes: ['Better EuroLeague contracts and bigger roles at European clubs', 'A pro debut at home is possible as a teenager'] };
  if (AFRICA.includes(o.country)) return { ...BASE, youthGrowth: 0.9, notes: ['Fewer coaches, gyms and resources: slower development at home', 'A US prep school can change that'] };
  if (LATAM.includes(o.country)) return { ...BASE, youthGrowth: 0.95, notes: ['NBA Academy support, but thinner resources at home'] };
  if (o.country === 'South Korea') return { ...BASE, military: true, notes: ['School comes first: the domestic high school league', 'About 18 months of military service by 28, unless an Asian Games gold or Olympic medal exempts you'] };
  if (o.path === 'aus') return { ...BASE, notes: ['The NBA Global Academy and NBL Next Stars'] };
  return { ...BASE, notes: [`The ${o.homeLeague ?? 'domestic'} league at home, or a US college`] };
}

/** Teenage growth at home: slower where resources are thin, until he moves to a US prep school. */
export function youthGrowthMult(s: GameState): number {
  if (s.stage !== 'HS' || s.flags.usPrep) return 1;
  return edgeOf(s.player.country).youthGrowth;
}

const EXEMPT_KEYS = ['OLYGOLD', 'OLYMEDAL', 'ASIANGOLD'];
const DEADLINE = 28;
const FROM_AGE = 23;
const CONTRACT_KINDS = ['offers', 'declare', 'withdraw', 'transfer', 'draft', 'retirePrompt'];

/**
 * South Korea: once he is 23, every offseason in which his contract is up asks whether to
 * serve now; at 28 there is no more waiting. A medal that earns the exemption ends it.
 */
export function pushMilitary(s: GameState): void {
  const p = s.player;
  if (!edgeOf(p.country).military || s.stage === 'RETIRED' || s.flags.served || s.flags.militaryExempt) return;
  if (s.awards.some((a) => EXEMPT_KEYS.includes(a.key))) {
    s.flags.militaryExempt = 1;
    logDecision(s, 'military', 'Exempted from military service by a medal for South Korea.');
    pushMoment(s, { kind: 'event', title: 'Exempted', color: '#CD2E3A', text: 'The medal for your country comes with an exemption from military service. Your career will not have to stop.', lines: ['No military service', 'Four weeks of basic training only'] });
    return;
  }
  if (p.age < FROM_AGE) return;
  const forced = p.age >= DEADLINE;
  const open = s.pending.some((d) => CONTRACT_KINDS.includes(d.kind));
  if (!forced && !open) return;
  s.pending.unshift({
    id: `military-${s.nextId++}`,
    kind: 'military',
    title: forced ? 'Report for duty' : 'Military service',
    text: forced
      ? `You are ${p.age}. Every Korean man serves about 18 months, and you cannot put it off any longer. You will play for the Sangmu army team in the KBL while you serve.`
      : `You are ${p.age} and your contract is up. Every Korean man serves about 18 months before 28. Serve now with the Sangmu army team, or keep playing and hope for an exemption: an Asian Games gold or an Olympic medal.`,
    choices: forced
      ? [{ id: 'enlist', label: 'Enlist with Sangmu', detail: 'A season in the KBL on army pay, then back to your career.' }]
      : [
          { id: 'enlist', label: 'Enlist now with Sangmu', detail: 'A season in the KBL on army pay. Get it done while you are young.', risk: 'Low' },
          { id: 'wait', label: 'Keep playing for now', detail: `It has to happen by ${DEADLINE}, unless a medal exempts you.`, risk: 'Medium' },
        ],
    data: {},
  } as Decision);
}

export function resolveMilitary(s: GameState, id: string): string {
  const p = s.player;
  if (id !== 'enlist') {
    logDecision(s, 'military', `Postponed military service at ${p.age}.`);
    return `Not yet. The clock runs until ${DEADLINE}.`;
  }
  // the army team replaces whatever contract talks were going on
  s.pending = s.pending.filter((d) => !CONTRACT_KINDS.includes(d.kind));
  s.flags.served = 1;
  signContract(s, { teamId: 'INT-KBL-Sangmu Phoenix', kind: 'int', salary: 0.01, years: 1, teamOptionYears: [], signedYear: s.year + 1 }, 'INT');
  p.morale = Math.max(0, p.morale - 8);
  p.growthMultNext *= 0.85;
  p.wear = Math.max(0, (p.wear ?? 0) - 5);
  logDecision(s, 'military', `Enlisted for military service at ${p.age}, playing for the Sangmu army team.`);
  pushMoment(s, { kind: 'commit', title: 'Sangmu Phoenix', teamName: 'Sangmu Phoenix', color: '#4B5320', text: `${p.name} enlists. Basic training, then a season with the army team in the KBL.`, lines: ['About 18 months of service', 'Army pay', `OVR ${Math.round(userOvr(s))} going in; less time to train`] });
  return 'Basic training starts Monday.';
}
