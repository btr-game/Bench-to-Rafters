// The guide (playtest round 7: "some functions are hard to recognize"): every feature, what
// it does and where it lives, one tap from the header.

import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { canChangeFocus, prompt } from '../../engine/flow';
import { canRecruit } from '../../engine/career/recruit';
import { canSetStyle, currentStyle } from '../../engine/career/identity';
import type { GameState } from '../../engine/types';

const SECTIONS: { title: string; where: string; items: [string, string][] }[] = [
  {
    title: 'Getting around',
    where: 'The top bar',
    items: [
      ['Tabs', 'Home, Season, Player, League and Records: along the top on a computer, at the bottom on a phone. A dot on a tab means something new is there (new games, a rating change, new records).'],
      ['Next step', 'On any tab other than Home, the button by the tabs carries on the game: it plays the next step, or takes you back to the choice waiting at Home. Looking around never stops the game.'],
      ['To do', 'The box at the top of Home: what the game is waiting for now, plus anything worth a look (a focus change you unlocked, recruits for your starting five, a team style to set, lab credits to spend). Tap an item to jump to it.'],
      ['Guide mode', 'Turn it on here or in Settings. The next thing to do glows on every screen, with a short note on how it works.'],
      ['Settings', 'Top right: theme (auto, light, dark), Fast break, playable playoff games, Simple text, guide mode and a new career, all in one place.'],
      ['Saving', 'Your career saves on this device after every move. Close the page any time: the start page offers to continue it. "New career" in Settings ends it (two taps).'],
      ['Keyboard', 'On a computer: Enter presses the main button, 1 to 9 pick a choice (the small numbers on the buttons), and H, S, P, L, R switch tabs.'],
      ['Fast break', 'The switch in the top bar (also in Settings), in any difficulty. Flip it and the game changes at once: one training group a season (General, Weight room, Shooting, Defense or IQ), no shop, no national team, fewer turning points, playoffs simulated and fewer stops, with a little faster growth to make up for it. You still make every real call. Turn it off and everything comes back.'],
      ['Simple text', 'A switch in Settings. On: descriptions, flavour text, fan reactions and helper notes are hidden, long texts are cut to their first sentence, and choices show just their names (risk tags stay). It is a display setting kept on this device, not part of your save.'],
    ],
  },
  {
    title: 'Every season',
    where: 'Home, the main card in the middle',
    items: [
      ['Plans', 'Twelve plans, picked for each half. One plan alone works about 10% better than its listing (focused work); with two, the first is your main plan and keeps most of its effect and the second adds a smaller boost. Plans shape growth, minutes and injury risk. The main button stays at the bottom of the screen while you read.'],
      ['Turning points', 'Events ask you to choose. The result is rolled each time: from a breakthrough to a backfire, with green and red chips for what changed. The risk tag shows how swingy a choice is.'],
      ['Storylines', 'Some turning points unfold over several seasons: a family illness, a rebuilt jumper, a nagging ankle, a veteran mentor, a documentary crew, a youth camp back home. Each summer brings the next chapter.'],
      ['Around the league', 'In the side column. Every season has storylines: a superteam, an underdog, your rival (often whoever knocked you out last year), a dynasty, a tank job. Some seasons your own team is a story (Defense travels, A chip on the shoulder, Seven seconds or less...), and it really moves your team, in the regular season or the playoffs. Before the second half, call how up to three stories end: right calls earn reputation. Knock your rival out of the playoffs for a little more.'],
      ['MVP race', 'In the NBA, once you are at MVP level (OVR 92+) or in the top five, the race shows in the side column: the leaders, their numbers and team records, and how close you are. Live during the season, the final voting after it.'],
      ['Playoffs', 'Playable postseason games ask for a tactic each quarter and the last possession in a close game. You can simulate a game, a series or the rest, or switch playable games off in Settings.'],
      ['Finals', 'Every final you win or lose ends with its last minutes, play by play: lead changes, blocks, buzzer beaters. Skip any time.'],
    ],
  },
  {
    title: 'Offseason moves',
    where: 'Home, the "Offseason moves" panel between seasons (locked tiles say what they need)',
    items: [
      ['Focus stats', 'Two ratings that grow about twice as fast. Changing them is earned: a breakthrough season (a big OVR or single-rating jump for your age) unlocks it for that offseason, and the tile glows.'],
      ['Position', 'Move one spot a summer (two if your height fits). A size warning opens it for you.'],
      ['Starting five', 'NBA only, once you are your team’s first option. A scouting board shows six players who would start next to you, their salary and how interested they are. Recruit up to two a summer: the weakest starter in his position group (guards, forwards or bigs; plus bench salary if needed) goes the other way. A five can have at most three guards, three forwards and two centers. The card shows your team’s rank before and after, and what that means (title contender, playoff team...). Salaries must fit under the cap, or within 125% of what goes out. A 10% pay cut (up to 30%) frees room and makes players likelier to come. The scouts rate each move High, Moderate or Low with a short reason: a read on the fit, not a promise.'],
      ['Team style', 'NBA, once you start for your team. Pick how the team plays: Run and gun, Defense first, Ball movement, Inside out, or Run it through you. Each moves the team in the regular season and the playoffs differently, and you fit some better than others (a two-way forward fits Defense first). One change a summer; it resets if you change teams.'],
      ['Request a trade', 'NBA, under contract. Choose where: any better team, a contender, the champions, your rival or a team that needs you. Each shows its odds and risk: the rival is a long shot with a backlash if it fails; a team that needs you is easy and gives you a bigger role.'],
      ['Jersey number', 'Switch numbers between seasons. The number you retire in is the one that hangs.'],
      ['Retire', 'Hang it up between any two seasons once you are past high school.'],
      ['Shop and summer', 'Purchases and the summer program come up as choices in the offseason. The shop shows six things at random each summer, out of about 130.'],
    ],
  },
  {
    title: 'Tabs',
    where: 'Each opens with a banner of the numbers that matter',
    items: [
      ['Season', 'Your team, record, streak and last ten games; your points game by game; the game log; standings; and the playoff bracket once the postseason starts.'],
      ['Player', 'Your ratings as a shape (dashed: where the season started) and as bars, status and body wear, contract and money, profile and the scouting report.'],
      ['League', 'Both conferences side by side, scoring leaders, last season’s award voting and the record book.'],
      ['Records', 'Your career at a glance, season by season, the trophy cabinet (tap a banner for details), career totals and highs, tournaments, the legacy tier list and your decision log (the latest 12, or all of them).'],
    ],
  },
  {
    title: 'Mini-games',
    where: 'The Mini-games card on Home (side column), or the start page',
    items: [
      ['Career bonus', 'With a career in progress, a good showing earns your player a real rating bonus, twice a season: the first in full, the second at half value. A top result is worth about 1 OVR (about 0.7 in Regular guy). Ratings of 85+ get a smaller bonus, 92+ smaller still. Back to career is always at the top right.'],
      ['Front Office', 'Run an NBA franchise for three seasons: scout and draft (the scouts suggest picks), trade (the best deals for you are listed), sign players from abroad and set a game plan. Miss the playoffs in seasons two and three and you are fired.'],
      ['Three-point contest', 'Five racks, 60 seconds. Stop the meter in the green; the bright middle is a swish. Money balls are worth 2, and one rack of your choice is all money balls. Three in a row sets you on fire.'],
      ['Dunk contest', 'Four dunkers, two dunks each, the top two meet in the final. Build each dunk from a takeoff, one or two moves and a prop; each part is one timing tap. Harder parts have a narrower green, athleticism widens it, and three misses on a dunk get you booed. Five judges score 6 to 10: landing a dunk is the easy part, and 9s and 10s take a hard dunk timed cleanly, plus a little for moves they have not seen yet.'],
      ['Legends showdown', 'Every franchise’s all-time starting five. Pick a team, add your super-rookie in place of a legend, grow him for four years, then play the season and the playoffs, choosing a game plan against each opponent.'],
      ['Built in a lab', 'Design a player (position, height) and build him over ten seasons on one screen each. Every summer pays credits (sometimes with a twist); each tap adds 3 to a rating for 1 credit (1.5 from 80, 2 from 90). Then the season plays itself: numbers, record, awards, and a grade at the end.'],
    ],
  },
  {
    title: 'The goal',
    where: 'The end of your career',
    items: [
      ['Difficulty', 'Regular guy: most careers peak in the 60s and 70s; the NBA is common, stardom and titles are earned. Reality hits hard: most careers end short of the NBA. Shoot for the stars: every career reaches stardom. Picked when you start a career.'],
      ['Legacy', 'Every honour is worth legacy points by tier: S (Hall of Fame, the rafters, MVP, Finals MVP) down to D. The Hall of Fame (more on the first ballot) and the rafters count the most: they happen once. The league leaders in points, assists, rebounds, steals and blocks per game each win a title worth points too. See the tier list in Records.'],
      ['The rafters', 'A team retires your number after 7+ seasons with a strong legacy, or 5+ seasons and a title won as a key player. It is the ultimate honour, and it gets its own page.'],
      ['Championships', 'Titles are won by teams. Your roster’s rank is in the season preview; chemistry builds with every season together, stars attract talent, and the trade deadline or an injury can swing a season. Defenders, floor generals and 3&D players add extra to winning, most of all in the playoffs. Veterans can sometimes chase a ring with a contender, and NBA players under contract can request a trade in the offseason.'],
      ['All-time rank', 'Your legacy points are ranked against 100 real legends. Download your career card to keep it.'],
    ],
  },
];

const SEEN = 'btr-guide-seen';
const seen = (): boolean => {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    return true;
  }
};

export function GuideButton() {
  const guideOn = useStore((s) => s.guide);
  const toggleGuide = useStore((s) => s.toggleGuide);
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(() => !seen());
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);
  const show = () => {
    setOpen(true);
    setFresh(false);
    try {
      localStorage.setItem(SEEN, '1');
    } catch {
      // a reminder dot is all that depends on it
    }
  };
  return (
    <>
      <button className={`icon-btn${fresh ? ' guide-fresh' : ''}${guideOn ? ' guide-on' : ''}`} onClick={show} aria-haspopup="dialog">
        {guideOn ? 'Guide: on' : 'Guide'}
      </button>
      {open && (
        <div className="guide-scrim" onClick={() => setOpen(false)}>
          <div className="guide-sheet" role="dialog" aria-modal="true" aria-label="How to play" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <div>
                <div className="kicker">Guide</div>
                <h2 className="title">How everything works</h2>
              </div>
              <div className="spacer" />
              <button className="icon-btn" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className={`guide-mode${guideOn ? ' on' : ''}`}>
              <div>
                <b>Guide mode</b>
                <div className="small muted">Highlights the next thing to do on every screen, with a short note on how it works.</div>
              </div>
              <button className={`btn small${guideOn ? ' ghost' : ''}`} onClick={toggleGuide} aria-pressed={guideOn}>
                {guideOn ? 'Turn off' : 'Turn on'}
              </button>
            </div>
            {SECTIONS.map((s) => (
              <section key={s.title} className="guide-sec">
                <div>
                  <div className="sec-title">{s.title}</div>
                  <div className="guide-where">Where: {s.where}</div>
                </div>
                <dl>
                  {s.items.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ---------- guide mode (round 13) ----------
// "Make the guide into an activatable mode, highlighting all steps the user has to take." With
// guide mode on, the one thing to do next gets a glowing outline and a short note right above it.

export type GuideSpot = 'main' | 'moves';

/** What to do next, and where. */
export function guideStep(g: GameState): { spot: GuideSpot; text: string } {
  const pr = prompt(g);
  if (pr.type === 'decision') {
    const d = pr.decision;
    const HINT: Record<string, string> = {
      plan: 'Pick your training plan for this half. One plan alone works a little better; tap a second to add a side plan. Then confirm (Enter).',
      shop: 'The shop: buy something that helps (ratings, health, fame) or leave it.',
      summer: 'Pick your summer program: it shapes next season\u2019s growth and your body.',
      live: 'A playoff game: pick a tactic for this quarter, or simulate the game, the series or the rest.',
      national: 'A national team call: medals and reputation, at the cost of rest.',
      transfer: 'You can stay or enter the transfer portal for a bigger role.',
      assign: 'Barely playing: a G League assignment gives you real minutes for the second half.',
      retirePrompt: 'Keep playing, or retire now. Your legacy is in Records.',
      arc: 'The next chapter of a storyline: pick how you respond.',
      military: 'Military service: choose when to serve.',
      info: 'Read it, then carry on with the button.',
    };
    const road = ['offers', 'commit', 'eu', 'int', 'gl', 'min', 'youth', 'prep', 'promote', 'culture'];
    const text =
      HINT[d.kind] ??
      (road.includes(d.kind)
        ? 'Choose where you play next. Compare the role, the level and the money: minutes matter most for growth.'
        : d.kind === 'draft' || d.kind === 'declare' || d.kind === 'withdraw'
          ? 'A draft decision. The scouting report shows where you are projected to go.'
          : 'A turning point: pick how you respond. The result is rolled each time; the risk tag shows how swingy it is.');
    return { spot: 'main', text };
  }
  if (g.step === 'offseason' && (canChangeFocus(g) || (canRecruit(g) && !(g.recruit?.moves ?? 0)) || (canSetStyle(g) && !currentStyle(g)))) {
    const what = canChangeFocus(g) ? 'pick new focus stats' : canRecruit(g) && !(g.recruit?.moves ?? 0) ? 'build your starting five' : 'set your team style';
    return { spot: 'moves', text: `Before the next season: ${what} in Offseason moves (the glowing tile). The other tiles are optional.` };
  }
  const text =
    g.step === 'summary'
      ? 'Season over. Check the summary, then head into the offseason.'
      : g.step === 'offseason'
        ? 'Offseason: change your position, number or team style, or ask for a trade if you want (locked tiles say what they need). When you are ready, start the next season.'
        : g.step === 'postseason'
          ? 'The postseason: keep going to play the next round.'
          : 'Play the next half of the season (Enter). Your plan, your role and your health decide how it goes.';
  return { spot: 'main', text };
}

/** Wraps a spot: with guide mode on and this spot next, it glows and shows the note. */
export function GuideSpotWrap({ g, spot, children }: { g: GameState; spot: GuideSpot; children: React.ReactNode }) {
  const on = useStore((s) => s.guide);
  if (!on) return <>{children}</>;
  const step = guideStep(g);
  if (step.spot !== spot) return <>{children}</>;
  return (
    <div className="guide-target">
      <div className="guide-tip" role="note">
        <b>Next</b> {step.text}
      </div>
      {children}
    </div>
  );
}
