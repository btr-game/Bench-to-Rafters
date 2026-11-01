# Future plans

Ideas the owner has asked to keep for later. Not started unless marked.

## Next (owner, round 26)

- A UI and convenience update, once the round 26 requests are done: under way as round 27 (screen
  polish, navigation, phone layout).

## Action cam

- Done in round 24: finals (league, NBA Cup, Olympic and World Cup golds) open with a choice to
  play the last minutes, watch them or skip to the result, with each event's own floor and kits.
- Still to come: an editing pass on the cam (owner, round 23: "it needs editing, but that can come
  later"), and possibly letting the playable minutes change a final's result (it would mean
  re-running the playoffs after the reel; today the result is settled by the season).

## Languages (owner, round 24)

- Korean, Chinese, French, Spanish and Japanese.
- Roughly 3,500+ English sentences: menus and buttons, the event stories, the guide, and text the
  engine builds from pieces (which needs reworking so sentences can be translated whole).
- Suggested order: the interface first (start page, menus, tabs, buttons, settings, headings),
  then the most-seen prompts, then events and the guide.

## Online community (owner, round 24)

- Built in round 24: leaderboards (today and all time, per difficulty), the Reality 99 hall, the
  statue plaza, the feedback page and the live strip, on the claude.ai page's shared database.
- Still open, for the owner to decide:
  - the ranking metric: decided in round 25 (the career index);
  - hosting: the claude.ai page (only invited Contributors can post) or a website with its own
    database (anyone can post; Supabase or similar, plus a function that emails the feedback).

## Kept for later (round 25)

- Balance, for the owner: the one-per-shelf shop costs about 0.26 peak OVR and 2.9 All-Star
  points (paired run); always stocking a training item would give that back. Titles sit near
  32.4% (round 22 approved 29.2%): a playoff grind of 1.3 or about 1.6 is the option on the table.
- Staff glasses: the psychologist and analyst wear the sprite's goggles; real glasses would need a
  new face gear in the sprite.
- A nickname the player can turn down or change (the event "A nickname you never asked for" only
  changes mood and reputation).
- Brand logos on the player's shoes in the sprite, once a signature shoe is out.
- The magazine tour event needs a mansion, a penthouse, an island or a yacht; the smart harness
  never buys them, so its rate is measured only in real play.


## Kept for later (round 28)

- Balance, for the owner: titles at 40.6% in Regular guy after this round's easier ceiling
  (approved 29.2% in round 22). A playoff grind, or a smaller ceiling bonus for the archetypes that
  already win titles most, are the options on the table.
- Crunch time in the Olympic and World Cup finals too (they are tournament games, outside the
  playable postseason).
- Events about the round's systems: a coach who will not change the style, a teammate who asks to
  be traded away from the Big Three.

## Kept for later (round 29)

- Music: a loop of its own for each overseas league (the NBL, the CBA, the KBL...), which share
  Passport now; a short sting when the loop changes between screens.
- The Extras tab could carry a career's own leaderboard standing (where it would rank if it ended
  today).

## Kept for later (round 30)

- A real stopwatch for the playtime model: time a few people through a Comet career and replace
  the per-screen prices in `scripts/playtime.ts` with what they measure.
- Comet's own banner on the end-of-career page, as No Shortcuts has.

## Kept for later (round 31)

- **Next generation** (owner: "i like this, but let's develop this later. i have plans"): after he
  retires, a new career as his child, with part of his build, the famous surname and more media
  pressure from day one.
- Offered and not picked yet: season goals set by the coach each preseason; trade-deadline
  rumours and a call to stay or go; an adjustment between playoff games; a Hall of Fame speech
  that thanks people and writes the career card's epilogue.
- The undo could keep more than one step, for players who want to walk back a whole summer.
- Compare could take a card from the community boards, not just the log.

## Kept for later (round 32)

- **Next generation**: built this round (the son's career at Comet speed, a share of his legacy on
  his father's card). A son played by hand (not as a Comet), and media pressure from the famous
  surname, are left for later.
- **The coach**: lines in the team style talk that change with his temperament; coaches at high
  school and college with faces of their own (offered this round and not picked); assistant coaches
  in the locker room.
- **The sim's best shooting nights**: the league record for threes in a game (14) fell in 6 of 30
  test careers. A rarer tail for threes in a game would make the record watch and the record
  achievements mean more; the owner decides.
- The locker room could remember: a hothead you calmed twice, a rookie you mentored all season,
  as relationships that carry over between seasons.

## Round 33 (planned): three levels before the full game

Owner, after round 32: "from now on, the users have to play three levels to access the full game
(main homepage)". Beginner, then intermediate, then advanced; the full start page (every
difficulty, the challenges, the mini-games, the career log, the book, the community) opens only
after the third.

**Everyone** (owner: "every device from now on have to do it, since there were users who already
accessed the game but didnt properly play it"): devices that played before go through the levels
too; their saves, log and achievements stay on the device and are there when the full game opens.

**The way out**: an escape code beside the Developer door, for anyone who should skip the levels
(owner's code; like the dev password, only a hash of it in the shipped code, and scripts take it
from an environment variable). The Developer door and the feedback channel stay on every page,
in the levels too.

**The levels count nowhere in the community**: no boards, no feed, no live count of careers ended,
no statue or hall.

**Beginner** (decided):
- After the intro, the beginner career starts: no start page, no difficulty choice.
- The player picks a name, number, position and appearance; the rest is set (an archetype for the
  position, two focus ratings, USA).
- A difficulty a little easier than Regular guy, not as easy as Shoot for the stars; potential
  high enough that every beginner reaches the NBA.
- One high school season, one college season, draft night, then several NBA seasons (as many as
  fit in 5 to 10 minutes), then a graduation page.
- One plan a season (not a half), from six: Balanced, Grind, Shooting lab, Weight room, Film and
  reads, Lockdown.
- One hand-picked turning point a season, each teaching one thing (the risk tag, morale, coach
  trust, fame).
- The shop, cut down: three items a summer, one purchase.
- One playable last shot in his first NBA playoffs (the timing meter); the rest is simulated.
- Left out: staff, brands, press, nickname, rival, duos, team style, trades, the locker room, the
  coach's role talk, the farewell tour, the record watch, Love, mini-games, the Extras tab,
  community, Fast break, Sim and Master mode. Tabs: Home and Player. Settings: theme, sound, music,
  text size.
- No quitting: no New career, no Back to start, no Retire before the graduation page; a reload
  goes back into it.
- The graduation page leads to the levels page (intermediate and advanced), not the full start
  page.

**Revised after round 32** (owner):
- Intermediate is simpler than first proposed, and advanced only a step beyond it ("slightly more
  complicated than intermediate"). After the levels, the guide leads the player to a Regular guy
  career: highly suggested, not required.
- **The goal of every level is an NBA All-Star team.** The levels' difficulty is set so that at
  least 80% of careers make one (measured with the harness). A career that misses ends on a card of
  its own with sad music, and still the thank-you page.
- **Mini-games are not in the levels**, but passing the tutorial needs every mini-game played at
  least once with a C or better. Lockdown and Front Office already grade A to D; the others get a
  scale of their own.
- **The tutorial guide**: separate from Guide mode, which stays as it is for players who forget
  something. It covers everything the manual does except the achievements, the career log and the
  community, so that by the end the player knows every function as if they had read the project
  summary. Its steps cannot be skipped: while it asks for something, nothing else on the page
  responds.
- **What each level holds** (owner's final call):

  | | Beginner (5–10 min) | Intermediate (~10 min) | Advanced (~15 min) |
  |---|---|---|---|
  | Creation | name, number, position, look | + archetype, focus | + country (its road), hand |
  | Path | 1 high school, 1 college, draft, several NBA seasons | + a college from offers | + G League and overseas offers |
  | Plans | 1 a season, from 6 | 1 or 2 a season, all 12 | 1 or 2 a half (the full system) |
  | Turning points | 1 hand-picked a season | 1 a season, from the full pool | the full pool, and storylines |
  | Shop | 3 items, 1 purchase | the normal shop | + staff, wardrobe, collection |
  | Contracts | set for him | contract talks on the first NBA deal | every deal, and trade requests |
  | Season | results | standings, leaders, the bracket | + the coach card (role talk, hot seat), team style |
  | Playoffs | one last shot | playable games | + crunch time and the action cam |
  | NBA life | none | nickname, brands, rival (few choices each) | + starting five, body and weight |
  | Modes | none | Fast break | + Sim |
  | Goal | an All-Star team | an All-Star team | an All-Star team |

- **The closing tour**, after advanced, on a prepared star career, each step asking the player to
  do the thing: the locker room, Around the league with city and fans, duos and the Big Three, press
  conferences, the record watch, the farewell tour, the ring-chaser role, Love and the next
  generation, the Records and Extras tabs, undo, Simple text, Master mode and Settings. It ends on
  the full start page with "Start a Regular guy career (recommended)" lit up.
- **Missing the All-Star goal still passes the level** (the sad ending card, then on to the next).
- **Mini-games**: played from the levels page at any time after beginner, in any order; Front
  Office's C is making the playoffs once; the C marks for the three-point contest, the dunk contest,
  3-on-3, Legends and the lab come from test runs, for the owner to approve.
- **No stuck steps**: no emergency skip; instead every tutorial step is checked by a test that plays
  all three levels and the closing tour start to finish, on a computer and a phone, before release.
- **The levels page is a road map** (owner: "i like the word road map a lot ... make a map"): a
  pixel map with the high school (beginner), a college campus (intermediate) and an NBA arena
  (advanced) on the land, joined by a road, and the mini-games as an overseas league on an island
  across the water. His avatar drives a car between the places and takes a boat to the island. A
  checklist in the top-right corner, like a bucket list, ticks each goal as it is done (the three
  levels, then each mini-game at C or better).
- **No achievements** in the levels; **advanced counts nowhere** in the community either; a saved
  career from before waits until the full game opens; the full start page keeps a **Levels** card to
  replay any level.
