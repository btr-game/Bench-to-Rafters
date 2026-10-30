// The guide (playtest round 7: "some functions are hard to recognize"): every feature, what
// it does and where it lives, one tap from the header.

import { Icon } from '../art/Icon';
import { GUIDE_ICON } from '../art/icons';
import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { canChangeFocus, prompt } from '../../engine/flow';
import { canRecruit } from '../../engine/career/recruit';
import { canSetStyle, currentStyle } from '../../engine/career/identity';
import type { GameState } from '../../engine/types';
import { resetTour } from './GuideTour';

// round 15: the manual is cards under big headers; round 24 (owner: "the guide is too text heavy,
// make them into bullet points, not too many examples"): each card is a few short bullets. The
// first bullet shows on the card; tap it for the rest.
const SECTIONS: { title: string; where: string; items: [string, string[]][] }[] = [
  {
    title: 'Getting around',
    where: 'The top bar',
    items: [
      ['Tabs', ['Home, Season, Player, League and Records.', 'Along the top on a computer, at the bottom on a phone.', 'A dot means something new is there.']],
      ['Next step', ['On any other tab, this button carries the game on.', 'Looking around never stops the game.']],
      ['To do', ['The top of Home: what the game is waiting for now.', 'Also lists anything new worth a look. Tap to jump to it.']],
      ['Saving', ['Your career saves on this device after every move.', 'The start page offers to continue it.', 'Only "New career" (in Settings, two taps) ends it.']],
      ['Settings', ['Theme and court background, then New career.', 'Switches: Fast break, playable playoff games, Simple text, Guide mode, Master mode.']],
      ['Fast break and Simple text', ['Fast break: quick seasons, you still make every real call.', 'Simple text: just the choices, no descriptions.']],
      ['Guide mode', ['Walks you through every button once, step by step.', 'New things get their step the first time they unlock.', 'Then it highlights the next thing to do. Turn it on here, in Settings or with G.']],
      ['Master mode', ['No recommendations anywhere: no scouts’ calls, fit tags, suggested deals or hints.', 'In Settings, or press M.']],
      ['Keyboard', ['Enter: the main button (skips a final to the buzzer first).', '1–9, 0, - and =: pick a choice.', 'H S P L R: tabs. F: Fast break. G: Guide mode. M: Master mode.']],
    ],
  },
  {
    title: 'Starting a career',
    where: 'The start page',
    items: [
      ['Difficulty', ['Regular guy, Reality hits hard or Shoot for the stars.', 'Fixed for the whole career, and always shown by the game’s name.']],
      ['Where you start', ['Pick a country for its road to the pros, or Surprise me.', 'Hometown and first school are revealed when the career starts.']],
      ['Position, hand and archetype', ['Pick each yourself, or tap Random next to it.', 'Random at the top rolls everything at once.', 'Each archetype has its own traced action pose.']],
      ['Focus stats', ['Two ratings that grow almost twice as fast.', 'Changing them later takes a breakthrough season.']],
      ['Continue', ['A saved career shows at the top of the start page.', 'Starting a new one replaces it.']],
      ['Career log', ['The career cards of your last 5 finished careers.', 'A warning at 4; when full, a new career replaces the oldest.', 'Show, download or delete any card.']],
    ],
  },
  {
    title: 'Every season',
    where: 'Home, the main card in the middle',
    items: [
      ['Plans', ['Pick one or two plans for each half. The first is the main plan.', 'One plan alone works a little better.', 'Plans shape growth, minutes, injuries, mood and fame.']],
      ['Turning points', ['Events ask you to choose; the result is rolled each time.', 'Green and red chips show what changed.', 'The risk tag shows how swingy a choice is.']],
      ['Storylines', ['Some events unfold over several seasons, one chapter each summer.']],
      ['Around the league', ['The season’s storylines, in the side column.', 'Before the second half, call how up to three end, for reputation.']],
      ['Weight', ['Every body has a best playing weight (Player tab).', 'Heavier: stronger inside, slower. Lighter: quicker, easier to push around.', 'Plans, injuries, the shop and summers move it.']],
      ['City and fans', ['Every NBA city has a culture that helps or hurts you each half.', 'Its fans add a home and playoff edge and react to wins and losses.', 'Shown on the Season tab and on every NBA offer.']],
      ['Coach trust and reputation', ['Trust steadies or splits the locker room (team strength).', 'Reputation brings better salaries, offers and trade odds.']],
      ['MVP race', ['In the NBA, once you are near the top: the leaders and how close you are.']],
      ['Playoffs and finals', ['Playable games: a tactic each quarter and the last shot of close games.', 'Finals end play by play on the action cam.', 'Switch playable games off in Settings.']],
      ['National team', ['World Cups, the Olympics, the Asian Games: medals and reputation, at the cost of rest.']],
    ],
  },
  {
    title: 'Offseason moves',
    where: 'Home, between seasons (locked tiles say what they need)',
    items: [
      ['Focus stats', ['A breakthrough season unlocks a change for that offseason; the tile glows.']],
      ['Position', ['Move one spot a summer, two if your height fits.']],
      ['Starting five', ['NBA, once you are your team’s first option.', 'Recruit a starter for any position.', 'About one recruit in four clicks: a duo, then a Big Three.']],
      ['Team style', ['NBA starters: pick how the team plays, once a summer.', 'Each style suits some players better than others.']],
      ['Request a trade', ['NBA, under contract: aim for a contender, the champions, your rival...', 'The card says at once where you went, or what it cost you.']],
      ['Jersey number', ['Switch numbers between seasons. The one you retire in is the one that hangs.']],
      ['Retire, or chase a ring', ['Retire between any two seasons.', 'A veteran can first become a specialist for a contender.']],
      ['Shop and summer', ['Six items each summer, from about 130.', 'Then a summer program for next season.']],
    ],
  },
  {
    title: 'Mini-games',
    where: 'The Mini-games card on Home, or the start page',
    items: [
      ['Unlocking them', ['Free from the start page.', 'In a career, each opens when a rating reaches its mark, and stays open.']],
      ['Career bonus', ['A good result gives your player a real rating bonus.', 'Two a season: the second at half value.']],
      ['Front Office', ['Run an NBA franchise for three seasons.', 'Miss the playoffs in seasons two and three and you are fired.']],
      ['Three-point contest', ['Five racks, 60 seconds. Stop the meter in the green.']],
      ['Dunk contest', ['Build each dunk, land it with timing taps, beat the judges.']],
      ['Legends showdown', ['Every franchise’s all-time five. Mind the chemistry, survive the playoffs.']],
      ['Built in a lab', ['Design a player and spend credits on his ratings, season by season.', 'His art evolves as his OVR climbs.']],
      ['3-on-3 streetball', ['Beat three crews in a row. Pick plays, time your finishes.', 'Pays finishing.']],
      ['Daily challenge', ['The same prospect for everyone, every day.', 'Only from the start page, with no career in progress.']],
    ],
  },
  {
    title: 'Tabs',
    where: 'Each opens with a banner of the numbers that matter',
    items: [
      ['Season', ['Your team, record, game log, standings, city and fans, the bracket.']],
      ['Player', ['Ratings (shape and bars), status, kits, scouting.', 'The body map: muscles training built, and every injury.']],
      ['League', ['Both conferences, scoring leaders, award voting, the record book.']],
      ['Records', ['The career timeline and journal, season by season, trophies, totals, highs.']],
    ],
  },
  {
    title: 'The goal',
    where: 'The end of your career',
    items: [
      ['OVR', ['Weighs every part of the game for your position.', 'Defense, rebounding and passing count as much as scoring.']],
      ['Legacy', ['Every honour is worth points, by tier (S down to D).', 'The Hall of Fame takes a long run of honours.']],
      ['The rafters', ['A team retires your number after a long, strong run there (or a title as a key player).']],
      ['Legendary seasons', ['A season that stacks the big honours or numbers earns a gold card.']],
      ['Championships', ['Titles are won by teams, and they are hard.', 'Chemistry, trust, a duo, team style and the crowd all help.']],
      ['All-time rank', ['Your legacy against 100 real legends, on your career card.']],
    ],
  },
];

const QUICK: [string, string][] = [
  ['1', 'Pick a plan for each half.'],
  ['2', 'Answer turning points.'],
  ['3', 'Between seasons, check Offseason moves.'],
  ['4', 'Raise ratings to unlock mini-games.'],
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
      <button data-tour="guide-btn" className={`icon-btn${fresh ? ' guide-fresh' : ''}${guideOn ? ' guide-on' : ''}`} onClick={show} aria-haspopup="dialog">
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
                <div className="small muted">Walks you through every button once, step by step, then highlights the next thing to do.</div>
                <button className="link-btn" onClick={resetTour}>
                  Start the tour again
                </button>
              </div>
              <button className={`btn small${guideOn ? ' ghost' : ''}`} onClick={toggleGuide} aria-pressed={guideOn}>
                {guideOn ? 'Turn off' : 'Turn on'}
              </button>
            </div>
            <section className="guide-sec">
              <h3 className="guide-h">Quick start</h3>
              <ol className="guide-quick">
                {QUICK.map(([n, t]) => (
                  <li key={n}>
                    <b>{n}</b>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </section>
            {SECTIONS.map((sec) => (
              <section key={sec.title} className="guide-sec">
                <h3 className="guide-h">{sec.title}</h3>
                <div className="guide-where">{sec.where}</div>
                <div className="guide-cards">
                  {sec.items.map(([k, [first, ...more]]) =>
                    more.length ? (
                      <details key={k} className="guide-card">
                        <summary>
                          <Icon name={GUIDE_ICON[k] ?? ''} size={30} />
                          <b>{k}</b>
                          <span>{first}</span>
                        </summary>
                        <ul>
                          {more.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <div key={k} className="guide-card">
                        <div className="guide-one">
                          <Icon name={GUIDE_ICON[k] ?? ''} size={30} />
                          <b>{k}</b>
                          <span>{first}</span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
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
      shop: 'The shop: buy something that helps (ratings, health, fame), then press Enter (or Leave the shop) to move on.',
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
          : 'A turning point (the picture shows where it happens): pick how you respond. The result is rolled each time; the risk tag shows how swingy it is.');
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
  const on = useStore((s) => s.guide && !s.master && !s.tour);
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
