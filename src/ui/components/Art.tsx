// Graphics slots (round 14). Each component holds the place where real artwork will go later
// (see docs/graphics-plan.md) and draws a simple, useful stand-in until then: a jersey for the
// player portrait, a colored badge for team logos, faint court lines for page banners.
// data-art names the slot so the artwork pass can find every one of them.

const ink = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 165 ? '#111' : '#fff';
};

/** The player's portrait. For now: his jersey, in his team's color, with his number. */
export function PlayerArt({ number, color = '#2A2F36', size = 96 }: { number: number; color?: string; size?: number }) {
  return (
    <svg className="art art-player" data-art="player-portrait" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Jersey number ${number}`}>
      <path d="M30 8 L42 8 Q50 20 58 8 L70 8 L90 22 L82 40 L74 36 L74 94 L26 94 L26 36 L18 40 L10 22 Z" fill={color} stroke="rgba(0,0,0,.25)" strokeWidth="1.5" />
      <path d="M42 8 Q50 20 58 8" fill="none" stroke={ink(color)} strokeOpacity=".5" strokeWidth="2.5" />
      <text x="50" y="72" textAnchor="middle" fontFamily="var(--f-display)" fontWeight="900" fontSize="34" fill={ink(color)}>
        {number}
      </text>
    </svg>
  );
}

/** A team logo. For now: a badge in the team's color with its short code. */
export function TeamArt({ abbr, color = '#2A2F36', size = 44 }: { abbr: string; color?: string; size?: number }) {
  const label = abbr.slice(0, 4).toUpperCase();
  return (
    <svg className="art art-team" data-art="team-logo" width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={abbr}>
      <path d="M24 2 L44 9 L44 26 Q44 40 24 46 Q4 40 4 26 L4 9 Z" fill={color} stroke="rgba(0,0,0,.25)" strokeWidth="1.2" />
      <text x="24" y={label.length > 3 ? 29 : 30} textAnchor="middle" fontFamily="var(--f-display)" fontWeight="900" fontSize={label.length > 3 ? 12 : 15} fill={ink(color)}>
        {label}
      </text>
    </svg>
  );
}

/** Background for page banners. For now: faint half-court lines. */
export function CourtArt() {
  return (
    <svg className="art art-court" data-art="banner-court" viewBox="0 0 400 160" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M400 20 H250 V140 H400" />
        <path d="M400 50 H310 V110 H400" />
        <circle cx="310" cy="80" r="30" />
        <path d="M400 8 H372 A 76 76 0 0 0 372 152 H400" />
        <circle cx="120" cy="80" r="40" />
        <path d="M120 0 V160" />
      </g>
    </svg>
  );
}
