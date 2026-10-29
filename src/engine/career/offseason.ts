// Offseason: aging, programs, summer program, and every path decision
// (recruiting, draft, contracts, free agency, retirement).

import { homeLeagueOffers, splitLine } from './culture';
import { playShowcase } from './culture';
import { processArcs } from '../events/arcs';
import { reclassify } from '../player/classify';
import { pushMilitary } from './nationality';
import { ATTR_MAX, GROWTH_RATE_AGE, MODES, POSITIONS, WEAR, FA_INTEREST, OVERSEAS_FA, TEAM_FACTORS, OFFSEASON_DAYS, REP, RETIRE, ATTRS, TEAM_OPTION } from '../balance';
import { chance, clamp, int, logistic, range } from '../rng';
import type { Contract, Decision, GameState, Offer, RoleKey } from '../types';
import { applyAging, growHeight, updateHeightProjection } from '../player/growth';
import { healDays } from '../player/injury';
import { updateScouting } from '../player/create';
import { ovrOf } from '../player/ovr';
import { fmtMoney, minSalary, rookieScale } from '../economy/salary';
import { LEVELS, modeDial } from '../balance';
import {
  adjust,
  logDecision,
  milestone,
  note,
  pushDecision,
  pushMoment,
  ROLE_LABEL,
  rankOnRoster,
  teamById,
  userOvr,
} from './common';
import { europeOffers, glOffer, intOffers, nbaFreeAgentOffers, nbaOffer, nbaOffersForProspect, offerChoice, splitOffers } from './offers';
import { previewDraft, runWorldDraft, teamForPick } from './nbaYear';
import { queueOffseasonEvent } from '../events/resolver';
import { pushShop } from '../economy/shop';
import { pushNationalTeam } from '../sim/tournaments';
import { beginSeason, ordinal } from './season';
import { verdictFor } from '../awards/legacy';
import type { Prospect } from '../world/draft';
import { NBA_TEAMS } from '../../content/teams';
import { originOffers, pathOf, pushYouthCrossroads } from './origin';
import { heightMismatch } from './position';
import { rollSwings } from './swings';
import { NAMES } from '../../content/strings';

// ---------- entering the offseason ----------

export function beginOffseason(s: GameState): void {
  const p = s.player;
  const last = s.history.filter((h) => h.year === s.year && h.result !== 'G League assignment').pop() ?? null;
  s.step = 'offseason';
  s.pending = [];
  s.notes = [];
  p.age += 1;
  growHeight(p);
  const projChange = updateHeightProjection(s.rng, p);
  const ft = (x: number) => `${Math.floor(x / 12)}′${x % 12}″`;
  if (projChange >= 1) note(s, `Growth spurt: ${ft(p.height)} now, and the doctors think you will reach ${ft(p.heightProj)}.`);
  else if (projChange <= -1) note(s, `Your growth is slowing down. New projection: ${ft(p.heightProj)}.`);
  // a story page when his size stops matching his position (again only if it changes)
  const mm = heightMismatch(s);
  const key = mm ? Math.max(p.height, p.heightProj) * 10 + POSITIONS.indexOf(p.pos) : 0;
  if (mm && s.flags.heightWarned !== key) {
    s.flags.heightWarned = key;
    pushMoment(s, {
      kind: 'event',
      title: 'Height check',
      color: '#0F5C6E',
      text: `${mm.text} Your OVR is weighted for the position you play, so the wrong spot can hold you back.`,
      lines: mm.better.length
        ? [...mm.better.map((o) => `${NAMES.pos[o.pos]} fits your size · OVR ${Math.round(o.ovr)} there`), 'Change position from the Home screen this offseason']
        : ['No position fits perfectly yet; keep an eye on it'],
    });
  }
  const aging = applyAging(s.rng, p);
  // the body recovers a little every summer, and less as he gets older
  p.wear = clamp((p.wear ?? 0) - WEAR.summerRest + Math.max(0, p.age - 25) * WEAR.agePerYear, 0, 100);
  // shoot-for-the-stars mode: never too far behind the path to the floor
  // (only through the prime: after 29 age hits stars as hard as anyone)
  const floor = MODES[s.mode ?? 'standard'].floor;
  if (floor && p.age <= floor.until) {
    const start = ovrOf(p.startAttrs, p.pos);
    const want = start + (floor.ovr - start) * clamp((p.age - 14) / (floor.age - 14), 0, 1);
    const now = userOvr(s);
    if (now < want) for (const k of ATTRS) p.attrs[k] = Math.min(ATTR_MAX, p.attrs[k] + (want - now));
  }
  // once in a while, a summer changes everything
  rollSwings(s);
  // the next chapter of any storyline still unfolding
  processArcs(s);
  // the hidden growth rate fades with age
  if (p.age >= GROWTH_RATE_AGE.decayFrom) p.growthRate = Math.max(0.5, (p.growthRate ?? 1) * GROWTH_RATE_AGE.decay);
  if (aging.sudden) note(s, 'Your body is not bouncing back like it used to. A sudden decline.');
  else if (aging.change < -0.5) note(s, `Age is catching up: OVR ${aging.change.toFixed(1)} this summer.`);
  applyPrograms(s);
  updateScouting(s.rng, p);
  // the scouts re-read what kind of player he has become
  const read = reclassify(p);
  if (read) {
    note(s, read);
    logDecision(s, 'archetype', read);
  }
  p.rep = clamp(p.rep * REP.decay, 0, 100);
  healDays(p, OFFSEASON_DAYS);
  p.injuryMultNext = 1;
  p.morale = Math.round(p.morale + (60 - p.morale) * 0.3);
  p.peakOvr = Math.max(p.peakOvr, userOvr(s));
  if (s.stage === 'HS') {
    const job = range(s.rng, 0.0005, 0.0015);
    p.bank += job;
    p.earnings += job;
  }
  s.retireRecommended = false;

  const lastShare = last && last.line.gp > 0 ? last.line.min / (Math.max(1, last.line.gp) * LEVELS[last.level].gameLen) : 0;

  switch (s.stage) {
    case 'HS':
      // the national showcase of his basketball culture (career/culture.ts)
      playShowcase(s);
      if (s.hsYear < 4) {
        s.hsYear += 1;
        pushYouthCrossroads(s); // 15-17: his culture's fork, a first-team call-up or a US prep school
      } else pushSplit(s); // after senior year, or after a post-grad prep year
      break;
    case 'NCAA':
      s.ncaaYear += 1;
      ncaaOffseason(s, lastShare);
      break;
    case 'GL':
    case 'EU':
    case 'INT':
      proOffseason(s, lastShare);
      break;
    case 'NBA':
      nbaUserOffseason(s, lastShare, last?.role ?? 'deep');
      break;
    default:
      break;
  }
  p.growthMultNext = 1;
  if (s.stage !== 'RETIRED') {
    // South Korea: military service (it goes first, before any contract talks)
    pushMilitary(s);
    // fast break (and the lab) skips the national team: no call-ups, no tournaments
    if (!s.flags.fast) pushNationalTeam(s);
    pushSummer(s);
    pushShop(s);
    queueOffseasonEvent(s);
  }
}

function applyPrograms(s: GameState): void {
  const p = s.player;
  for (const prog of p.programs) {
    const step = prog.steps.shift();
    if (step) {
      if (step.attrs) for (const k of ATTRS) if (step.attrs[k]) p.attrs[k] = clamp(p.attrs[k] + step.attrs[k]!, 15, ATTR_MAX);
      if (step.range) p.range = clamp(p.range + step.range, 0, 99);
      if (step.offhand) p.offhand = clamp(p.offhand + step.offhand, 0, 99);
      note(s, `${prog.name}: season ${prog.seasonsLeft - prog.steps.length} done.`);
    }
    prog.seasonsLeft = prog.steps.length;
  }
  p.programs = p.programs.filter((x) => x.steps.length > 0);
}

// ---------- summer program ----------

function pushSummer(s: GameState): void {
  pushDecision(s, {
    kind: 'summer',
    title: 'Summer program',
    text: 'One focus for the summer.',
    choices: [
      { id: 'skills', label: 'Skills camp', detail: 'Both focus stats up a little.' },
      { id: 'strength', label: 'Strength and conditioning', detail: 'Athleticism, rebounding and finishing.' },
      { id: 'shooting', label: 'Shooting coach', detail: 'Shooting and range.' },
      { id: 'film', label: 'Film room', detail: 'Basketball IQ and playmaking. Coaches notice.' },
      { id: 'rest', label: 'Rest and travel', detail: 'Morale up, fresher body next season, less wear on your body.' },
    ],
  });
}

function resolveSummer(s: GameState, id: string): void {
  const p = s.player;
  const k = p.age >= 30 ? 0.5 : 1;
  // summer work cannot push a stat past its potential cap
  const bump = (key: (typeof ATTRS)[number], v: number) =>
    (p.attrs[key] = clamp(p.attrs[key] + v * k * clamp((p.caps[key] - p.attrs[key]) / 10, 0, 1), 15, ATTR_MAX));
  if (id === 'skills') for (const f of p.focus) bump(f, 1.0);
  if (id === 'strength') {
    bump('ATH', 0.8);
    bump('REB', 0.5);
    bump('FIN', 0.5);
  }
  if (id === 'shooting') {
    bump('SHT', 0.9);
    p.range = clamp(p.range + 2 * k, 0, 99);
  }
  if (id === 'film') {
    bump('IQ', 1.0);
    bump('PLY', 0.4);
    p.trust = adjust(p.trust, 3);
  }
  if (id === 'rest') {
    p.morale = adjust(p.morale, 8);
    p.injuryMultNext = 0.9;
    p.wear = Math.max(0, (p.wear ?? 0) - WEAR.restProgram);
    healDays(p, 30);
  }
}

// ---------- high school → the split ----------

function pushSplit(s: GameState): void {
  const offers = originOffers(s, splitOffers(s));
  if (offers.length === 0) {
    pushDecision(s, {
      kind: 'offers',
      title: 'No offers',
      text: `${s.stars}★. No college program, pro team or club made an offer. This is where the road ends.`,
      choices: [{ id: 'retire', label: 'Hang it up', detail: 'Basketball stays a love, not a job.' }],
      data: { offers: [], context: 'split' },
    });
    return;
  }
  const choices = offers.map(offerChoice);
  if (s.hsYear === 4 && (s.stars <= 3 || pathOf(s) !== 'us')) {
    const abroad = pathOf(s) !== 'us';
    choices.push({
      id: 'prep',
      label: abroad ? 'Spend a post-grad year at a US prep school' : 'Take a post-grad prep year',
      detail: abroad ? 'Move to America for one season so college coaches can see you, then get recruited again.' : 'One more season at a national prep academy against better players, then get recruited again.',
    });
  }
  pushDecision(s, {
    kind: 'offers',
    title: 'Where next?',
    text: splitLine(s) ?? `${s.stars}★ recruit${s.recruitRank ? `, ranked ${ordinal(s.recruitRank)} in the national class` : ''}. Pick where you play next season.`,
    choices,
    data: { offers, context: 'split' },
  });
}

// ---------- NCAA ----------

function ncaaOffseason(s: GameState, lastShare: number): void {
  const left = 4 - s.ncaaYear;
  if (left <= 0) {
    s.declared = true;
    pushDraftDecision(s, true);
    return;
  }
  if (lastShare < 0.25 && !s.transferUsed) {
    pushDecision(s, {
      kind: 'transfer',
      title: 'Transfer portal',
      text: 'You barely played. Other programs would give you minutes if you enter the portal. You can only do this once.',
      choices: [
        { id: 'enter', label: 'Enter the portal', detail: 'Offers from programs that would play you.' },
        { id: 'stay', label: 'Stay and fight for minutes', detail: 'Keep your teammates and your coach.' },
      ],
    });
  }
  pushDraftDecision(s, false);
}

function pushDraftDecision(s: GameState, forced: boolean): void {
  if (!s.nba) return;
  const preview = previewDraft(s);
  const mock = preview.mock;
  const mockText = mock ? `Mock drafts have you going ${mock[0]}–${mock[1]}.` : 'Most mock drafts do not have you being picked.';
  const ncaa = s.stage === 'NCAA';
  pushDecision(s, {
    kind: 'declare',
    title: forced ? 'Out of eligibility' : 'NBA Draft',
    text: forced ? `Your college career is over. You enter the draft. ${mockText}` : `${mockText}${ncaa ? ' You can test the waters and withdraw after the combine.' : ''}`,
    choices: forced
      ? [{ id: 'declare', label: 'Enter the draft', meta: { mockLo: mock?.[0] ?? 99, mockHi: mock?.[1] ?? 99 } }]
      : [
          { id: 'declare', label: 'Declare for the draft', detail: mockText, meta: { mockLo: mock?.[0] ?? 99, mockHi: mock?.[1] ?? 99 } },
          { id: 'return', label: ncaa ? 'Return to school' : 'Stay another year', detail: 'Develop and try again next year.' },
        ],
    data: { preview, forced, ncaa },
  });
}

type Preview = ReturnType<typeof previewDraft>;

function resolveDeclare(s: GameState, d: Decision, id: string): void {
  const preview = d.data!.preview as Preview;
  const forced = d.data!.forced as boolean;
  const ncaa = d.data!.ncaa as boolean;
  if (id === 'return') {
    logDecision(s, 'draft', `Chose to ${ncaa ? 'return to school' : 'stay another year'} instead of declaring.`);
    return;
  }
  s.declared = true;
  logDecision(s, 'draft', forced ? 'Entered the NBA Draft.' : `Declared for the NBA Draft (mock range ${preview.mock ? preview.mock.join('–') : 'undrafted'}).`);
  // the combine moves the board a little
  const test = range(s.rng, -2, 2) + (s.player.attrs.ATH - 60) * 0.03;
  preview.user.board += test;
  preview.user.prospect.board += test;
  const ahead = preview.cls.filter((c: Prospect) => c.board > preview.user.board).length + 1;
  const lo = Math.max(1, ahead - int(s.rng, 3, 6));
  const hi = ahead + int(s.rng, 3, 6);
  preview.mock = ahead <= 62 ? [lo, Math.min(60, hi)] : null;
  const combine = test > 0.8 ? 'You tested well at the combine.' : test < -0.8 ? 'The combine did not go well.' : 'An average combine.';
  if (ncaa && !forced) {
    pushDecision(s, {
      kind: 'withdraw',
      title: 'Withdrawal deadline',
      text: `${combine} ${preview.mock ? `Teams now project you ${preview.mock[0]}–${preview.mock[1]}.` : 'Teams tell your family you will likely go undrafted.'} Stay in the draft or go back to school?`,
      choices: [
        { id: 'stay', label: 'Stay in the draft', meta: { mockLo: preview.mock?.[0] ?? 99, mockHi: preview.mock?.[1] ?? 99 } },
        { id: 'withdraw', label: 'Withdraw and return to school' },
      ],
      data: { preview },
    });
    return;
  }
  note(s, combine);
  doDraft(s, preview);
}

function resolveWithdraw(s: GameState, d: Decision, id: string): void {
  const preview = d.data!.preview as Preview;
  if (id === 'withdraw') {
    s.declared = false;
    logDecision(s, 'draft', 'Withdrew from the draft and returned to school.');
    return;
  }
  logDecision(s, 'draft', 'Stayed in the draft after the combine.');
  doDraft(s, preview);
}

function doDraft(s: GameState, preview: Preview): void {
  const pick = runWorldDraft(s, preview);
  s.worldYearDone = s.year;
  if (pick !== null) {
    const teamId = teamForPick(s, pick)!;
    const team = teamById(s.nba, teamId)!;
    s.draftedBy = teamId;
    milestone(s, 'drafted');
    const year = s.year + 1;
    const first = pick <= 30;
    signContract(s, {
      teamId,
      kind: first ? 'rookie' : 'min',
      salary: first ? rookieScale(year, pick) : minSalary(year, 0),
      years: first ? 4 : 2,
      teamOptionYears: first ? [2, 1] : [],
      signedYear: year,
    }, 'NBA');
    logDecision(s, 'drafted', `Drafted ${ordinal(pick)} overall by the ${team.name}.`, teamId);
    pushMoment(s, {
      kind: 'draft',
      title: team.name,
      teamName: team.name,
      color: team.color,
      pick,
      text: `With the ${ordinal(pick)} pick in the ${year} NBA Draft, the ${team.name} select ${s.player.name}.`,
      lines: [first ? `First round · rookie scale ${fmtMoney(rookieScale(year, pick))} a year for up to 4 years` : 'Second round · two-year minimum deal'],
    });
    pushDecision(s, {
      kind: 'info',
      title: 'Draft night',
      text: `With the ${ordinal(pick)} pick, the ${team.name} select ${s.player.name}.${first ? ` Rookie scale: ${fmtMoney(rookieScale(year, pick))} a year.` : ' Second round: a two-year minimum deal.'}`,
      choices: [{ id: 'ok', label: 'Shake the commissioner’s hand' }],
      data: { draft: true },
    });
  } else {
    s.undrafted = true;
    logDecision(s, 'undrafted', 'Went undrafted.');
    pushUndrafted(s);
  }
}

function pushUndrafted(s: GameState): void {
  const ovr = userOvr(s);
  const offers: Offer[] = [];
  // Exhibit 10: a training camp invite from a team with a thin bench
  const nba = s.nba!;
  const thin = [...nba.teams].sort((a, b) => (a.roster[12]?.ovr ?? 60) - (b.roster[12]?.ovr ?? 60)).slice(0, 8);
  const camp = thin[int(s.rng, 0, thin.length - 1)];
  if (ovr >= (camp.roster[12]?.ovr ?? 67) - FA_INTEREST.campOvrGap && chance(s.rng, FA_INTEREST.campChance)) {
    offers.push({
      ...nbaOffer(s, camp, 'deep', minSalary(s.year + 1, 0), 1, 'exhibit10', 'Training camp deal: make the roster or go to the G League'),
    });
  }
  if (ovr >= 54) offers.push(glOffer(s, ovr));
  offers.push(...europeOffers(s, ovr, ovr >= 55 ? 2 : 1));
  offers.push(...intOffers(s, ovr, 2));
  offers.push(...homeLeagueOffers(s).filter((x) => !offers.some((y) => y.teamName === x.teamName)));
  if (offers.length === 0) {
    retireNow(s, 'No team called after the draft.');
    return;
  }
  pushDecision(s, {
    kind: 'offers',
    title: 'Undrafted',
    text: 'Your name was not called. The phone still rings.',
    choices: offers.map(offerChoice),
    data: { offers, context: 'undrafted' },
  });
}

// ---------- G League / Europe ----------

function proOffseason(s: GameState, lastShare: number): void {
  if (s.contract) s.contract.years -= 1;
  // still draft-eligible?
  if (!s.draftedBy && !s.undrafted && s.nba && s.player.age >= 19) {
    pushDraftDecision(s, s.player.age >= 22);
    return;
  }
  if (retireCheck(s, lastShare, 0, 'deep')) return;
  proContractStep(s);
}

function proContractStep(s: GameState): void {
  const c = s.contract;
  const ovr = userOvr(s);
  const offers: Offer[] = s.nba ? nbaOffersForProspect(s) : [];
  const expired = !c || c.years <= 0;
  if (expired) {
    const fade = FA_INTEREST.minorAgeFade(s.player.age);
    if (s.stage === 'GL' && ovr >= 54 && chance(s.rng, fade)) offers.push(glOffer(s, ovr, (s.teamId ?? 'GL-LAL').replace('GL-', '')));
    offers.push(...europeOffers(s, ovr, ovr >= 52 ? 2 : 1));
    if ((s.stage === 'EU' || s.stage === 'INT') && ovr >= 54 && chance(s.rng, fade)) offers.push(glOffer(s, ovr));
    offers.push(...intOffers(s, ovr, 2, { cba: s.player.age >= 29 }));
    offers.push(...homeLeagueOffers(s).filter((x) => !offers.some((y) => y.teamName === x.teamName)));
  }
  if (offers.length === 0) {
    if (expired) retireNow(s, 'No contract offers came.');
    return;
  }
  const choices = offers.map(offerChoice);
  if (!expired) choices.push({ id: 'stay', label: `Stay with ${teamById(s.league, s.teamId)?.name ?? 'your club'}`, detail: `${c!.years} year(s) left on your deal.` });
  pushDecision(s, {
    kind: 'offers',
    title: offers.some((o) => o.level === 'NBA') ? 'NBA teams are calling' : 'New contract',
    text: offers.some((o) => o.level === 'NBA') ? 'Your play got noticed. NBA teams want you in camp.' : 'Your contract is up. Here is what is out there.',
    choices,
    data: { offers, context: 'pro' },
  });
}

// ---------- NBA ----------

function nbaUserOffseason(s: GameState, lastShare: number, lastRole: RoleKey): void {
  // the league moves first: draft and AI free agency
  if (s.worldYearDone !== s.year) {
    runWorldDraft(s, null);
    s.worldYearDone = s.year;
  }
  s.contract!.years -= 1;
  if (retireCheck(s, lastShare, lastShare, lastRole)) return;
  nbaContractStep(s, lastShare, lastRole);
}

function nbaContractStep(s: GameState, lastShare: number, lastRole: RoleKey): void {
  const c = s.contract!;
  const team = teamById(s.nba, s.teamId)!;
  if (c.years > 0 && c.teamOptionYears.includes(c.years)) {
    const rank = rankOnRoster(team, userOvr(s));
    const T = TEAM_OPTION;
    const keep = rank <= T.keepRank || chance(s.rng, s.player.age <= T.youngAge ? T.youngKeep : T.oldKeep);
    if (keep) {
      note(s, `The ${team.name} picked up your team option.`);
      return;
    }
    note(s, `The ${team.name} declined your team option. You are a free agent.`);
    logDecision(s, 'option', `The ${team.name} declined the team option.`, team.id);
    c.years = 0;
  }
  if (c.years <= 0) pushFreeAgency(s, lastShare, lastRole);
}

function pushFreeAgency(s: GameState, lastShare: number, lastRole: RoleKey): void {
  const offers = nbaFreeAgentOffers(s, s.teamId, lastShare, lastRole);
  // ring chasing: a contender with a spot for a veteran or a role player, at the minimum
  const fa = userOvr(s);
  const benchLast = lastRole === 'bench' || lastRole === 'deep';
  if (s.nba && (s.player.age >= TEAM_FACTORS.ringChaseAge || benchLast) && chance(s.rng, TEAM_FACTORS.ringChaseChance * modeDial(s.mode, 'ringChase'))) {
    const contenders = [...s.nba.teams].sort((a, b) => b.strength - a.strength).slice(0, 4);
    const c = contenders.find((t) => t.id !== s.teamId && !offers.some((o) => o.teamId === t.id) && fa >= (t.roster[11]?.ovr ?? 70) - 2);
    if (c) offers.push(nbaOffer(s, c, fa >= (c.roster[8]?.ovr ?? 75) ? 'rotation' : 'bench', minSalary(s.year + 1, s.serviceYears), 1, 'min', 'Ring chase: a title contender with a spot for you'));
  }
  // the superteam he told he was listening to (events/round9.ts)
  const sup = s.flags.superteamPitch === s.year ? s.stories?.find((x) => x.kind === 'superteam') : undefined;
  const supTeam = sup && s.nba?.teams.find((t) => t.id === sup.teamId);
  if (supTeam && supTeam.id !== s.teamId && !offers.some((o) => o.teamId === supTeam.id))
    offers.push(nbaOffer(s, supTeam, 'sixth', minSalary(s.year + 1, s.serviceYears) * 1.5, 2, 'standard', 'The superteam: sixth man behind three stars'));
  // Europe and Asia call too, unless he is clearly an NBA player: a bigger role, often more money
  const ovr = userOvr(s);
  if (offers.length > 0 && ovr < OVERSEAS_FA.belowOvr) {
    offers.push(...europeOffers(s, ovr, ovr < OVERSEAS_FA.twoBelow ? 2 : 1));
    if (chance(s.rng, OVERSEAS_FA.asiaChance)) offers.push(...intOffers(s, ovr, 1, { cba: s.player.age >= 27 }));
  }
  if (offers.length === 0) {
    pushLastChance(s, 'No NBA team made an offer.');
    return;
  }
  pushDecision(s, {
    kind: 'offers',
    title: 'Free agency',
    text: 'Your contract is up. These teams made offers.',
    choices: offers.map(offerChoice),
    data: { offers, context: 'fa' },
  });
}

function pushLastChance(s: GameState, why: string): void {
  const ovr = userOvr(s);
  if (s.player.age >= RETIRE.forcedAge) {
    retireNow(s, 'Time catches everyone.');
    return;
  }
  const offers: Offer[] = [...europeOffers(s, ovr, ovr >= 52 ? 2 : 1), ...intOffers(s, ovr, 2, { cba: s.player.age >= 29 })];
  offers.push(...homeLeagueOffers(s).filter((x) => !offers.some((y) => y.teamName === x.teamName)));
  if (ovr >= 56 && chance(s.rng, FA_INTEREST.minorAgeFade(s.player.age))) offers.push(glOffer(s, ovr));
  const choices = offers.map(offerChoice);
  choices.push({ id: 'retire', label: 'Retire', detail: 'Hang them up.' });
  pushDecision(s, {
    kind: 'offers',
    title: 'A last chance?',
    text: `${why} Your agent found these options.`,
    choices,
    data: { offers, context: 'last' },
  });
}

function retireCheck(s: GameState, lastShare: number, share: number, role: RoleKey): boolean {
  const p = s.player;
  const ovr = userOvr(s);
  if (p.age >= RETIRE.forcedAge) {
    retireNow(s, 'At 42, the body has the final say.');
    return true;
  }
  const declining = ovr <= p.peakOvr - RETIRE.ovrBelowPeak && lastShare < 0.3;
  const veteran = p.age >= RETIRE.vetAge && ovr <= p.peakOvr - RETIRE.vetBelowPeak;
  if (declining || veteran) {
    s.retireRecommended = true;
    pushDecision(s, {
      kind: 'retirePrompt',
      title: 'Time to think about it',
      text: `You are ${Math.round(p.peakOvr - ovr)} points off your peak and the minutes have dried up. Your agent thinks it might be time.`,
      choices: [
        { id: 'go', label: 'Find a last chance', detail: 'Keep playing wherever someone will have you.' },
        { id: 'retire', label: 'Retire', detail: 'Go out on your own terms.' },
      ],
      data: { share, role },
    });
    return true;
  }
  return false;
}

// ---------- signing ----------

export function signContract(s: GameState, c: Contract, stage: GameState['stage']): void {
  const changedTeam = s.teamId !== c.teamId;
  s.contract = c;
  s.teamId = c.teamId;
  s.stage = stage;
  if (changedTeam) {
    s.player.trust = 50;
    s.player.captain = false;
  }
}

export function signOffer(s: GameState, o: Offer, context: string, others: Offer[]): void {
  const year = s.year + 1;
  const stage: GameState['stage'] = o.level === 'NCAA' ? 'NCAA' : o.level === 'GL' ? 'GL' : o.level === 'EU' ? 'EU' : o.level === 'INT' ? 'INT' : 'NBA';
  if (o.kind === 'exhibit10') {
    const team = teamById(s.nba, o.teamId)!;
    const cut = team.roster[12]?.ovr ?? 67;
    const made = chance(s.rng, logistic((userOvr(s) - cut) / FA_INTEREST.campCutScale));
    if (made) {
      note(s, `You made the ${team.name} roster out of training camp.`);
      logDecision(s, 'camp', `Made the ${team.name} roster on a camp deal.`, team.id);
      pushMoment(s, { kind: 'camp', title: 'You made the team', teamName: team.name, color: team.color, text: `Undrafted, overlooked, and now on an NBA roster. The ${team.name} keep you after training camp.`, lines: ['One-year minimum contract'] });
      signContract(s, { teamId: o.teamId, kind: 'min', salary: o.salary, years: 1, teamOptionYears: [], signedYear: year }, 'NBA');
    } else {
      const abbr = NBA_TEAMS.find((t) => `${t.city} ${t.nick}` === team.name)?.abbr ?? 'LAL';
      note(s, `Waived by the ${team.name} after camp. You report to their G League team.`);
      logDecision(s, 'camp', `Cut by the ${team.name} in camp and sent to the G League.`, team.id);
      pushMoment(s, { kind: 'camp', title: 'Waived', teamName: team.name, color: '#2A2F36', text: `The ${team.name} cut you on the last day of camp. You report to their G League affiliate and keep grinding.`, lines: [] });
      const gl = glOffer(s, userOvr(s), abbr);
      signContract(s, { teamId: gl.teamId, kind: 'gl', salary: gl.salary, years: 1, teamOptionYears: [], signedYear: year }, 'GL');
    }
    return;
  }
  if (o.level === 'NCAA') {
    s.ncaaYear = context === 'transfer' ? s.ncaaYear : 0;
    milestone(s, 'committed');
  }
  if (o.level === 'GL' || o.level === 'EU' || o.level === 'INT') milestone(s, 'committed');
  signContract(
    s,
    {
      teamId: o.teamId,
      kind: o.kind,
      salary: o.salary,
      years: o.years,
      teamOptionYears: o.teamOptionYears ?? [],
      signedYear: year,
    },
    stage,
  );
  const declined = others.filter((x) => x.id !== o.id).map((x) => x.teamName);
  const verb = o.level === 'NCAA' ? 'Committed to' : 'Signed with';
  logDecision(
    s,
    context,
    `${verb} ${o.teamName}${o.level !== 'NCAA' ? ` (${fmtMoney(o.salary)} × ${o.years})` : ''}${declined.length ? `, turning down ${declined.slice(0, 3).join(', ')}` : ''}.`,
    o.teamId,
  );
  if (stage === 'NBA') milestone(s, 'nbaContract');
  const deal = o.level === 'NCAA' ? (o.kind === 'walkon' ? 'Walk-on' : 'Full scholarship') : `${fmtMoney(o.salary)} a year for ${o.years} year${o.years === 1 ? '' : 's'}`;
  pushMoment(s, {
    kind: 'commit',
    title: o.teamName,
    teamName: o.teamName,
    color: o.teamColor,
    text: o.level === 'NCAA' ? `${s.player.name} commits to ${o.teamName}.` : `${s.player.name} signs with ${o.teamName}.`,
    lines: [LEVELS[o.level].name, `Projected role: ${ROLE_LABEL[o.role]}`, deal, ...(declined.length ? [`Turned down ${declined.slice(0, 3).join(', ')}`] : [])],
  });
}

export function retireNow(s: GameState, why: string): void {
  s.pending = [];
  s.stage = 'RETIRED';
  s.step = 'retired';
  s.retiredAt = s.player.age;
  const v = verdictFor(s);
  s.verdict = v.tier;
  logDecision(s, 'retire', `Retired at ${s.player.age}. ${why}`);
}

// ---------- resolvers ----------

export function resolveOffseasonDecision(s: GameState, d: Decision, id: string): boolean {
  switch (d.kind) {
    case 'summer':
      resolveSummer(s, id);
      return true;
    case 'declare':
      resolveDeclare(s, d, id);
      return true;
    case 'withdraw':
      resolveWithdraw(s, d, id);
      return true;
    case 'transfer':
      if (id === 'enter') {
        s.transferUsed = true;
        const offers = transferOffers(s);
        logDecision(s, 'transfer', 'Entered the transfer portal.');
        pushDecisionFront(s, {
          kind: 'offers',
          title: 'Transfer portal',
          text: offers.length ? 'Programs that would give you minutes.' : 'Nobody called. You can still go back to your team.',
          choices: [...offers.map(offerChoice), { id: 'stay', label: 'Stay at your school', detail: 'Pull your name out of the portal.' }],
          data: { offers, context: 'transfer' },
        });
      }
      return true;
    case 'retirePrompt':
      if (id === 'retire') retireNow(s, 'Went out on his own terms.');
      else {
        logDecision(s, 'lastchance', 'Ignored the advice to retire and kept playing.');
        // continue the normal contract flow for the current stage
        if (s.stage === 'NBA') nbaContractStep(s, (d.data?.share as number) ?? 0, (d.data?.role as RoleKey) ?? 'deep');
        else proContractStep(s);
      }
      return true;
    case 'offers': {
      const ctx = (d.data?.context as string) ?? '';
      const offers = (d.data?.offers as Offer[]) ?? [];
      if (id === 'retire') {
        retireNow(s, 'Chose to walk away.');
        return true;
      }
      if (id === 'prep') {
        s.hsYear = 5;
        s.flags.usPrep = 1;
        logDecision(s, 'prep', `Turned down ${offers.length} offer${offers.length === 1 ? '' : 's'} for a post-grad prep year.`);
        pushMoment(s, { kind: 'commit', title: 'Northfield Prep', teamName: 'Northfield Prep', color: '#0B3D2E', text: 'One more year. A national prep schedule, better teammates, and every college coach watching.', lines: ['Post-grad season', 'Recruited again next summer'] });
        return true;
      }
      if (id === 'stay') {
        logDecision(s, 'stay', `Turned down ${offers.map((o) => o.teamName).slice(0, 3).join(', ')} to stay.`);
        return true;
      }
      const o = offers.find((x) => x.id === id);
      if (o) signOffer(s, o, ctx, offers);
      return true;
    }
    case 'info':
      return true;
  }
  return false;
}

function pushDecisionFront(s: GameState, d: Omit<Decision, 'id'>): void {
  s.pending.unshift({ ...d, id: `${d.kind}-${s.nextId++}` });
}

function transferOffers(s: GameState): Offer[] {
  const stars = s.stars;
  s.stars = Math.max(2, Math.min(4, stars));
  const all = splitOffers(s);
  s.stars = stars;
  return all.filter((o) => o.level === 'NCAA' && o.teamId !== s.teamId).slice(0, 3);
}

export { ovrOf, beginSeason };
