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

// round 15: the manual is cards under big headers. Each card shows its name and a one-line
// teaser; tap it for the details. `quick` marks the cards the Quick start lists.
const SECTIONS: { title: string; where: string; items: [string, string][] }[] = [
  {
    title: 'Getting around',
    where: 'The top bar',
    items: [
      ['Tabs', 'Home, Season, Player, League and Records: along the top on a computer, at the bottom on a phone. A dot on a tab means something new is there (new games, a rating change, new records).'],
      ['Next step', 'On any tab other than Home, the button by the tabs carries on the game. It plays the next step, or takes you back to the choice waiting at Home, so looking around never stops the game.'],
      ['To do', 'The box at the top of Home shows what the game is waiting for now. It also lists anything worth a look (a focus change you unlocked, recruits for your starting five, a team style to set). Tap an item to jump to it.'],
      ['Saving', 'Your career saves on this device after every move. Close the page any time: the start page offers to continue it. "New career" in Settings ends it (two taps).'],
      ['Settings', 'Top right: theme, court (Classic, Hardwood or Streetball page background), Fast break, playable playoff games, Simple text, Guide mode, Master mode and a new career. Your difficulty is always shown next to the name of the game.'],
      ['Fast break and Simple text', 'The two switches in the top bar. Fast break: quick seasons with one training group, no shop, no national team and simulated playoffs, while you still make every real call. Simple text: descriptions and flavour hidden, just the choices.'],
      ['Guide mode', 'Turn it on here, in Settings or with G. The next thing to do glows on every screen, with a short note on how it works.'],
      ['Master mode', 'For experienced players, in Settings or with M: no recommendations anywhere. No scouts’ calls, no fit tags, no suggested deals, no trade odds, no guide hints. You read the game yourself.'],
      ['Keyboard', 'On a computer: Enter presses the main button (or leaves the shop). While a final plays out (league, NBA Cup or Olympic gold), Enter skips to the final buzzer first, so you never miss the result. 1 to 9, then 0, - and =, pick a choice (the small numbers on the buttons). H, S, P, L and R switch tabs, F toggles Fast break, G Guide mode and M Master mode.'],
    ],
  },
  {
    title: 'Starting a career',
    where: 'The start page',
    items: [
      ['Difficulty', 'Regular guy, Reality hits hard or Shoot for the stars. It cannot change once the career starts, and it is always shown next to the name of the game.'],
      ['Where you start', 'Pick a country for its road to the pros (academies, school leagues, college), or Surprise me for real-world odds. Your hometown and first school are revealed when the career begins.'],
      ['Position, hand and archetype', 'Pick each yourself, or tap Random next to it: Random never repeats the last pick, and the dominant hand rolls real-world odds (about one player in eight is a lefty). Random at the top rolls everything at once.'],
      ['Focus stats', 'Two ratings that grow about twice as fast. You can change them later only after a breakthrough season.'],
      ['Continue', 'A career in progress is saved on this device: the start page offers to continue it.'],
    ],
  },
  {
    title: 'Every season',
    where: 'Home, the main card in the middle',
    items: [
      ['Plans', 'Twelve plans, picked for each half. One plan alone works about 10% better than its listing; with two, the first is your main plan and the second adds a smaller boost. Plans shape growth, minutes and injury risk. Team first gives up shots to lift the whole team in your games.'],
      ['Turning points', 'Events ask you to choose. The result is rolled each time, from a breakthrough to a backfire, with green and red chips for what changed. The risk tag shows how swingy a choice is.'],
      ['Storylines', 'Some turning points unfold over several seasons: a family illness, a rebuilt jumper, a nagging ankle, a veteran mentor, a documentary crew, a youth camp back home. Each summer brings the next chapter.'],
      ['Around the league', 'In the side column; tap the header to unfold it. Each season has storylines (a superteam, an underdog, your rival, a dynasty, a tank job), and some seasons your own team is one, which really moves it. Before the second half, call how up to three stories end for reputation.'],
      ['Coach trust and reputation', 'Coach trust is part of team chemistry: a trusted player steadies the locker room (team strength up), a distrusted one splits it. Reputation pays: higher salaries, more offers and better odds when you ask for a trade.'],
      ['MVP race', 'In the NBA, once you are at MVP level (OVR 92+) or in the top five, the race shows in the side column: the leaders, their numbers and team records, and how close you are.'],
      ['Playoffs and finals', 'Playable postseason games ask for a tactic each quarter and the last possession in a close game (switch them off in Settings). Finals end play by play. Win it all and the confetti flies; lose a final and it stings.'],
      ['National team', 'Called up for World Cups, the Olympics or the Asian Games? Gold is a celebration, silver and bronze hang a medal around your neck, and an early exit is a long flight home.'],
    ],
  },
  {
    title: 'Offseason moves',
    where: 'Home, the "Offseason moves" panel between seasons (locked tiles say what they need)',
    items: [
      ['Focus stats', 'Two ratings that grow about twice as fast. Changing them is earned: a breakthrough season (a big OVR or single-rating jump for your age) unlocks it for that offseason, and the tile glows.'],
      ['Position', 'Move one spot a summer (two if your height fits). A size warning opens it for you.'],
      ['Starting five', 'NBA only, once you are your team’s first option. The five shows one player per position next to you. A scouting board lists six players who would start; recruit up to two a summer, and each takes over his position from the starter there, who goes the other way. Every call is reported: who said yes, who said no, who left. Salaries must fit the cap (a pay cut frees room).'],
      ['Team style', 'NBA, once you start for your team. Pick how the team plays: Run and gun, Defense first, Ball movement, Inside out, or Run it through you. Each moves the team differently in the season and the playoffs, and you fit some better than others. One change a summer.'],
      ['Request a trade', 'NBA, under contract. Choose where: any better team, a contender, the champions, your rival or a team that needs you. The card then tells you straight away where you went, or that nobody bit and what it cost you.'],
      ['Jersey number', 'Switch numbers between seasons. The number you retire in is the one that hangs.'],
      ['Retire, or chase a ring', 'Hang it up between any two seasons. When your agent suggests retiring, a former NBA player can instead become a ring chaser: a specialist role (floor spacer, defensive specialist, veteran playmaker, rebounding big) on a contender. Your best skill sharpens, what the role does not need fades, and your archetype changes for good.'],
      ['Shop and summer', 'Purchases and the summer program come up as choices in the offseason. The shop shows six things at random each summer, out of about 130.'],
    ],
  },
  {
    title: 'Mini-games',
    where: 'The Mini-games card on Home, or the start page',
    items: [
      ['Unlocking them', 'From the start page every game is free. In a career, each opens when your player earns it: Three-point contest at shooting 85, Dunk contest at athleticism 85, Front Office at basketball IQ 85, Built in a lab at OVR 82, Legends showdown at OVR 90. Once open, it stays open.'],
      ['Career bonus', 'A good result earns your player a real rating bonus, twice a season: the first in full, the second at half value. A top result is worth about 1.5 OVR (about 0.8 in Regular guy); ratings of 90+ get a little less. Back to career is the big button at the end of every game.'],
      ['Front Office', 'Run an NBA franchise for three seasons: scout and draft, trade, sign players from abroad and set a game plan. Your front office recommends trades and signings (not in Master mode). Miss the playoffs in seasons two and three and you are fired.'],
      ['Three-point contest', 'Five racks, 60 seconds. Stop the meter in the green; the bright middle is a swish. Money balls are worth 2, and one rack of your choice is all money balls.'],
      ['Dunk contest', 'Two dunks a round, three attempts a dunk, the top two go to the final. Build each dunk from a takeoff, moves and a prop; each part is one timing tap. 9s and 10s take a hard dunk timed cleanly.'],
      ['Legends showdown', 'Every franchise’s all-time five, each with an identity (Showtime, Bad Boys, Grit and grind...). With a career, your own player takes a legend’s place; without, you build a rookie. Chemistry (how you fit the identity, a hole you fill, roles that overlap) moves the team rating. Then the season and four playoff rounds.'],
      ['Built in a lab', 'Design a player and build him over ten seasons, one screen each: spend each summer’s credits on ratings, then watch the season play out. A grade at the end.'],
    ],
  },
  {
    title: 'Tabs',
    where: 'Each opens with a banner of the numbers that matter',
    items: [
      ['Season', 'Your team, record, streak and last ten games; your points game by game; the game log; standings; and the playoff bracket once the postseason starts.'],
      ['Player', 'Your ratings as a shape (dashed: where the season started) and as bars, status and body wear, contract and money, profile and the scouting report.'],
      ['League', 'Both conferences side by side, scoring leaders, last season’s award voting and the record book.'],
      ['Records', 'Your career at a glance, season by season, the trophy cabinet (tap a banner for details), totals and highs, tournaments, the legacy tier list and your decision log.'],
    ],
  },
  {
    title: 'The look',
    where: 'Everywhere: pixel art for your player, your teams and your story',
    items: [
      ['Your player', 'A pixel player with a big head, in your team’s kit. His look (skin, hair, a beard, a headband or an arm sleeve) comes with his name and stays all career; the pose shows his position: the point guard low on the dribble, the two guard bouncing it, the wing on a jumper, the four with the ball on his hip, the five flying in for a dunk.'],
      ['Kits', 'Player tab: every team has a home, road and city jersey. NBA teams wear their own colours and wordmarks; every other team gets a kit in its colours. Tap a kit to dress your player in it.'],
      ['Legends', 'Every legend is drawn with his real look: Iverson’s cornrows and headband, Kareem’s goggles, Dr. J’s afro, Bird’s mop, LeBron’s beard. You meet them in the Legends showdown and the contests.'],
      ['Story scenes', 'Turning points, storyline chapters, draft night and story pages open with a picture of where it happens: the arena, the gym, the city at night, home, the agent’s office, the clinic, the press room, a street court, the locker room, the draft stage, a title night, an awards stage or a medal game.'],
      ['Where you play', 'Each page opens with a banner of your venue: a high school gym, a college arena, a European hall or an NBA arena. Abroad it shows the country: the Eiffel Tower in France, the Sagrada Família in Spain, Mount Fuji and a pagoda in Japan, the Opera House in Sydney, and so on for every country and league region.'],
      ['Team touches', 'The banner carries your team’s colour along its top edge with its second colour under it, and the Home card shows your team’s crest as a faint watermark.'],
      ['Court', 'In Settings: the page background as Classic, a Hardwood floor or Streetball asphalt, in light and dark.'],
      ['Crests, banners and rings', 'Teams carry crests in their colours. Records shows your championship banners and rings, the trophy cabinet has an icon for every honour, and a retired number hangs as a banner in the rafters.'],
      ['Contests', 'The three-point and dunk contests play out in a full arena: the crowd, the LED ribbon, a scoreboard, the shot or the dunk animated, and the judges’ cards.'],
    ],
  },
  {
    title: 'The goal',
    where: 'The end of your career',
    items: [
      ['Difficulty', 'Regular guy: most careers peak in the 60s and 70s; stardom and titles are earned. Reality hits hard: most careers end short of the NBA. Shoot for the stars: every career reaches stardom.'],
      ['OVR', 'Your overall rating weighs every part of the game for your position. Rebounding, playmaking and defense count as much as scoring, so an all-around player is not behind a pure scorer.'],
      ['Legacy', 'Every honour is worth legacy points by tier: S (Hall of Fame, the rafters, MVP, Finals MVP) down to D. The Hall of Fame is hard to reach: it takes a long run of honours. See the tier list in Records.'],
      ['The rafters', 'A team retires your number after 7+ seasons with a strong legacy, or 5+ seasons and a title won as a key player. It gets its own page.'],
      ['Championships', 'Titles are won by teams. Your roster’s rank is in the season preview; chemistry, coach trust, stars and the trade deadline all move it. Defenders, floor generals and 3&D players add extra, most of all in the playoffs.'],
      ['All-time rank', 'Your legacy points are ranked against 100 real legends. Download your career card, in your team’s colours, to keep it.'],
    ],
  },
];

const QUICK: [string, string][] = [
  ['1', 'Pick a plan for each half (or press its number). Your plan, minutes and health decide how you grow.'],
  ['2', 'Answer turning points. Risk tags show how swingy a choice is.'],
  ['3', 'Between seasons, check the Offseason moves panel. Glowing tiles are worth a look.'],
  ['4', 'Grow your ratings to unlock mini-games for a rating bonus.'],
];

const teaser = (t: string) => {
  const first = t.split(/(?<=\.)\s/)[0];
  return first.length > 110 ? `${first.slice(0, 107)}…` : first;
};

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
                  {sec.items.map(([k, v]) => (
                    <details key={k} className="guide-card">
                      <summary>
                        <Icon name={GUIDE_ICON[k] ?? ''} size={30} />
                        <b>{k}</b>
                        <span>{teaser(v)}</span>
                      </summary>
                      <p>{v}</p>
                    </details>
                  ))}
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
  const on = useStore((s) => s.guide && !s.master);
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
