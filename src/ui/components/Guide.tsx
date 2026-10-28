// The guide (playtest round 7: "some functions are hard to recognize"): every feature, what
// it does and where it lives, one tap from the header.

import { useEffect, useState } from 'react';

const SECTIONS: { title: string; where: string; items: [string, string][] }[] = [
  {
    title: 'Every season',
    where: 'Home',
    items: [
      ['Plans', 'Pick one plan for each half, or two at a time at reduced strength. Plans shape growth, minutes and injury risk.'],
      ['Turning points', 'Events ask you to choose. The result is rolled each time: from a breakthrough to a backfire, with green and red chips for what changed.'],
      ['Playoffs', 'Big postseason games pause for your calls at key moments.'],
      ['Storylines', 'Some turning points unfold over several seasons: a family illness, a rebuilt jumper, a nagging ankle, a veteran mentor. Each summer brings the next chapter.'],
      ['Fast break', 'The switch next to your record. One plan a season, playoffs simulated, no shop and fewer stops; you still make every real call. Turn it on or off any time.'],
    ],
  },
  {
    title: 'Offseason moves',
    where: 'Home, the "Offseason moves" panel between seasons',
    items: [
      ['Focus stats', 'Two ratings that grow about twice as fast. Changing them is earned: a breakthrough season (a big OVR or single-rating jump for your age) unlocks it for that offseason, and the tile glows.'],
      ['Position', 'Move one spot a summer (two if your height fits). A size warning opens it for you.'],
      ['Jersey number', 'Switch numbers between seasons. The number you retire in is the one that hangs.'],
      ['Retire', 'Hang it up between any two seasons once you are past high school.'],
      ['Shop and summer', 'Purchases and the summer program come up as choices in the offseason.'],
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
      ['Legacy', 'Every honour is worth legacy points by tier: S (Hall of Fame, the rafters, MVP, Finals MVP) down to D. See the tier list in Records.'],
      ['The rafters', 'A team retires your number after 7+ seasons with a strong legacy, or 5+ seasons and a title won as a key player. It is the ultimate honour, and it gets its own page.'],
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
