// The guide (playtest round 7: "some functions are hard to recognize"): every feature, what
// it does and where it lives, one tap from the header.

import { useEffect, useState } from 'react';

const SECTIONS: { title: string; where: string; items: [string, string][] }[] = [
  {
    title: 'Every season',
    where: 'Home',
    items: [
      ['Plans', 'Pick one plan for each half, or two: the first is your main plan and keeps most of its effect, the second is a side plan with a smaller boost. Plans shape growth, minutes and injury risk.'],
      ['Turning points', 'Events ask you to choose. The result is rolled each time: from a breakthrough to a backfire, with green and red chips for what changed.'],
      ['Playoffs', 'Big postseason games pause for your calls at key moments.'],
      ['Storylines', 'Some turning points unfold over several seasons: a family illness, a rebuilt jumper, a nagging ankle, a veteran mentor. Each summer brings the next chapter.'],
      ['Around the league', 'Every season has storylines: a superteam, an underdog, your rival (often whoever knocked you out last year), a dynasty, a tank job. They show on Home with records and, after the postseason, how each one ended.'],
      ['Simple text', 'The switch under Fast break. On: descriptions, flavour text, fan reactions and helper notes are hidden, long texts are cut to their first sentence, and choices show just their names (risk tags stay). It is a display setting kept on this device, not part of your save.'],
      ['MVP race', 'In the NBA, once you are at MVP level (OVR 92+) or in the top five, the race shows beside your player card: the leaders, their numbers and team records, and how close you are. Live during the season, the final voting after it.'],
      ['Mini-games', 'Front Office, the three-point and dunk contests, Built in a lab and the legends showdown (Play a mini-game, on Home). Back to career is always at the top right. With a career in progress, a good showing earns your player a small rating bonus: up to four claims a season, each worth a little less than the one before (100%, 75%, 55%, 40%).'],
      ['To do', 'The box at the top of Home: what the game is waiting for now, plus anything worth a look (a focus change you unlocked, recruits for your starting five, lab credits to spend).'],
      ['Finals', 'Every final you win or lose ends with its last minutes, play by play: lead changes, blocks, buzzer beaters. Skip any time.'],
      ['Fast break', 'The switch next to your record, in any difficulty. Flip it and the game changes at once: one training group a season (General, Weight room, Shooting, Defense or IQ), no shop, no national team, fewer turning points, playoffs simulated and fewer stops, with a little faster growth to make up for it. You still make every real call. Turn it off and everything comes back.'],
      ['Built in a lab', 'A mini-game: design a player (position, height) and build him over ten seasons on one screen each. Every summer pays credits (sometimes with a twist); each tap adds 3 to a rating for 1 credit (1.5 from 80, 2 from 90). Then the season plays itself: numbers, record, awards, and a grade at the end.'],
      ['Dunk contest', 'A mini-game: four dunkers, two dunks each, the top two meet in the final. Build each dunk from a takeoff, one or two moves and a prop; each part is one timing tap. Harder parts have a narrower green, athleticism widens it, and three misses on a dunk get you booed. Five judges score 6 to 10: difficulty, clean timing and moves they have not seen yet.'],
    ],
  },
  {
    title: 'Offseason moves',
    where: 'Home, the "Offseason moves" panel between seasons',
    items: [
      ['Focus stats', 'Two ratings that grow about twice as fast. Changing them is earned: a breakthrough season (a big OVR or single-rating jump for your age) unlocks it for that offseason, and the tile glows.'],
      ['Position', 'Move one spot a summer (two if your height fits). A size warning opens it for you.'],
      ['Starting five', 'NBA only, once you are your team’s first option. A scouting board shows six players who would start next to you, their salary and how interested they are. Recruit up to two a summer: the weakest starter in his position group (guards, forwards or bigs; plus bench salary if needed) goes the other way. A five can have at most three guards, three forwards and two centers. The card shows your team’s rank before and after, and what that means (title contender, playoff team...). Salaries must fit under the cap, or within 125% of what goes out. A 10% pay cut (up to 30%) frees room and makes players likelier to come. The scouts rate each move High, Moderate or Low with a short reason: a read on the fit, not a promise.'],
      ['Jersey number', 'Switch numbers between seasons. The number you retire in is the one that hangs.'],
      ['Retire', 'Hang it up between any two seasons once you are past high school.'],
      ['Shop and summer', 'Purchases and the summer program come up as choices in the offseason. The shop shows six things at random each summer, out of more than 90.'],
    ],
  },
  {
    title: 'Tabs',
    where: 'The bar at the bottom',
    items: [
      ['Season', 'Game log, standings, and the playoff bracket (drawn like the NBA graphic once you are in the league).'],
      ['Player', 'Ratings, health and body wear, scouting report, the scouts’ read on your archetype, contract and money.'],
      ['League', 'Your current league: its scoring leaders and last season\u2019s award voting.'],
      ['Records', 'Season by season, tournaments, the trophy cabinet (tap a banner for details), career highs, the legacy tier list and your decision log.'],
    ],
  },
  {
    title: 'The goal',
    where: 'The end of your career',
    items: [
      ['Legacy', 'Every honour is worth legacy points by tier: S (Hall of Fame, the rafters, MVP, Finals MVP) down to D. The Hall of Fame (more on the first ballot) and the rafters count the most: they happen once. The league leaders in points, assists, rebounds, steals and blocks per game each win a title worth points too. See the tier list in Records.'],
      ['The rafters', 'A team retires your number after 7+ seasons with a strong legacy, or 5+ seasons and a title won as a key player. It is the ultimate honour, and it gets its own page.'],
      ['Championships', 'Titles are won by teams. Your roster\u2019s rank is in the season preview; chemistry builds with every season together, stars attract talent, and the trade deadline or an injury can swing a season. Defenders, floor generals and 3&D players add extra to winning, most of all in the playoffs. Veterans can chase a ring with a contender, and NBA players under contract can request a trade in the offseason.'],
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
      <button className={`icon-btn${fresh ? ' guide-fresh' : ''}`} onClick={show} aria-haspopup="dialog">
        Guide
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
