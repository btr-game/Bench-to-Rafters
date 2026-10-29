# Graphics plan (round 14)

Where artwork goes when the graphics pass starts. Every slot already exists in the UI and
draws a simple stand-in, so nothing is blank space; the artwork replaces the stand-in. Slots
in code carry a `data-art` attribute (`src/ui/components/Art.tsx`).

## In place now (stand-in drawn)

| Slot (`data-art`) | Where | Stand-in now | Artwork to make | Size |
|---|---|---|---|---|
| `player-portrait` | Player tab banner, Records banner | Jersey in team colour with his number | Player portrait or avatar (head and shoulders, team jersey), changes with age and team | Square, shown at 56-96 px; draw at 256 px |
| `team-logo` | Season tab banner, Home main card header | Shield in team colour with the short code | Team crest per team (30 NBA, NCAA programs, clubs abroad) | Square, shown at 44-84 px; draw at 128 px, SVG preferred |
| `banner-court` | Behind every page banner (Season, Player, League, Records) | Faint half-court lines in team colour | Arena or court illustration per level (high school gym, college arena, NBA arena, European hall), low contrast | Wide, about 5:2; draw at 1600 x 640 |

## Next candidates (no slot yet)

- **Transitions** (`Overlays.tsx`): the half-season ticker and the new-season card are full
  screens in team colour. A full-bleed arena or team-colour illustration fits behind them.
- **Story pages** (moments: arrival, draft night, title game, rafters): one illustration per
  moment kind, top of the page, about 16:9.
- **Turning points**: a small icon per event category (training, media, family, injury,
  money, team) next to the "Turning point" kicker in the main card, 32-40 px.
- **Trophy cabinet and tier list**: an icon per award category (nine categories already have a
  colour), 24-32 px, replacing the text-only banners' left edge.
- **Mini-games**: court scenes for the three-point contest and dunk contest (the meter sits on
  top), team crests in Legends showdown and Front Office.
- **Retirement page and career card**: the portrait at its largest (career card PNG uses it).

## Rules for the artwork

- Light and dark themes: art sits on `--surface`; avoid pure white backgrounds.
- Team colours come from the data (`team.color`); art should tint, not hard-code, where it can.
- No real NBA logos or real player likenesses: teams and players in the world are fictional or
  generic.
