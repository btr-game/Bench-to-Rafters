// The browser tab's icon (round 25, the owner): drawn from a 16 x 16 pixel grid when the page
// starts, as a PNG. It is set from script because the published page is wrapped in the host's own
// document, where a <link> written in our <head> lands in the body and the browser ignores it.

const PAL: Record<string, string> = { O: '#18141C', K: '#6B7280', b: '#1F5FAD', N: '#F07A1A', Y: '#F5C542', W: '#FFFFFF', P: '#7048E8' };

/** The game: a championship banner hanging from a rafter beam, a basketball on it. */
export const GAME_LOGO = [
  'KKKKKKKKKKKKKKKK',
  '...O........O...',
  '..OOOOOOOOOOOO..',
  '..ObbbbbbbbbbO..',
  '..ObbbOOOObbbO..',
  '..ObbONNONObbO..',
  '..ObONNNONNObO..',
  '..ObOOOOOOOObO..',
  '..ObONNNONNObO..',
  '..ObbONNONObbO..',
  '..ObbbOOOObbbO..',
  '..ObbbbbbbbbbO..',
  '..OYYYYYYYYYYO..',
  '..ObbbbOObbbbO..',
  '..ObbbO..ObbbO..',
  '..OOOO....OOOO..',
];

/** The dev deck: two fanned cards, a basketball on the front one. */
export const DECK_LOGO = [
  '................',
  '.....OOOOOOOOOO.',
  '.....OPPPPPPPPO.',
  '.OOOOOOOOOOPPPO.',
  '.OYWWWWWWWOPPPO.',
  '.OWWOOOOWWOPPPO.',
  '.OWONNONOWOPPPO.',
  '.OWOOOOOOWOPPPO.',
  '.OWONNONOWOPPPO.',
  '.OWWOOOOWWOPPPO.',
  '.OWWWWWWWWOPPPO.',
  '.OWWWWWWWYOPPPO.',
  '.OWWWWWWWWOOOOO.',
  '.OOOOOOOOOO.....',
  '................',
  '................',
];

/** Puts a logo in the tab (any icon the page already has is replaced). */
export function setFavicon(rows: string[]): void {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d');
    if (!x) return;
    rows.forEach((row, y) =>
      [...row].forEach((ch, i) => {
        if (!PAL[ch]) return;
        x.fillStyle = PAL[ch];
        x.fillRect(i * 2, y * 2, 2, 2);
      }),
    );
    document.querySelectorAll('link[rel~="icon"]').forEach((l) => l.remove());
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = c.toDataURL('image/png');
    document.head.appendChild(link);
  } catch {
    // the tab keeps the browser's default icon
  }
}
