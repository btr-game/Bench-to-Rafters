// The player's look, picked at the start (round 27, owner: "let the user choose the appearance of
// the player at the start of the game, maybe in identity. the avatar shouldn't have any accessories
// to start with and have a blank (the jersey number the user chose, no patterns), white/black
// jersey"). The same parts the game builds every avatar from (content/looks.ts).

import type { ChosenLook } from '../../content/looks';
import { LOOK_FACES, LOOK_HAIRS, LOOK_STYLES, chooseLook } from '../../content/looks';
import type { Kit } from '../../content/teamStyle';
import { HAIR_COLORS, PlayerArt, SKIN_COLORS } from '../art/Player';
import { t, tx } from '../../i18n';

export type Jersey = 'white' | 'black';
/** The plain practice jersey: one colour, the number, nothing else. */
export const PLAIN: Record<Jersey, Kit> = {
  white: { base: '#F4F4F4', ink: '#1B1820', trim: '#F4F4F4', word: '' },
  black: { base: '#1B1820', ink: '#F4F4F4', trim: '#1B1820', word: '' },
};

export const STYLE_NAME: Record<string, string> = { short: tx('Short'), buzz: tx('Buzz'), flattop: tx('Flat-top'), afro: tx('Afro'), bigafro: tx('Big afro'), cornrows: tx('Cornrows'), twists: tx('Twists'), curly: tx('Curly'), parted: tx('Parted'), long: tx('Long'), mop: tx('Mop'), mullet: tx('Mullet'), bald: tx('Bald') };
export const FACE_NAME: Record<string, string> = { none: tx('Clean'), stubble: tx('Stubble'), mustache: tx('Mustache'), goatee: tx('Goatee'), beard: tx('Beard'), bigbeard: tx('Big beard'), sideburns: tx('Sideburns') };
export const HAIR_NAME: Record<string, string> = { k: tx('Black'), b: tx('Brown'), l: tx('Blond'), r: tx('Red'), g: tx('Grey') };

/** A random look from the parts. */
export const randomLook = (): ChosenLook => ({
  skin: Math.floor(Math.random() * 7),
  hair: LOOK_HAIRS[Math.floor(Math.random() * LOOK_HAIRS.length)],
  style: LOOK_STYLES[Math.floor(Math.random() * LOOK_STYLES.length)],
  face: LOOK_FACES[Math.floor(Math.random() * LOOK_FACES.length)],
});

/** The avatar in his plain jersey (the look is registered for his name first). */
export function LookPreview({ name, number, look, jersey, size = 150 }: { name: string; number: number; look: ChosenLook; jersey: Jersey; size?: number }) {
  chooseLook(name, look);
  return <PlayerArt key={JSON.stringify(look)} name={name} number={number} pos="SG" kitData={PLAIN[jersey]} size={size} noBall />;
}

export function LookPicker({ look, setLook, jersey, setJersey }: { look: ChosenLook; setLook: (l: ChosenLook) => void; jersey: Jersey; setJersey: (j: Jersey) => void }) {
  const set = (patch: Partial<ChosenLook>) => setLook({ ...look, ...patch });
  return (
    <div className="look-picker">
      <div className="look-row" role="group" aria-label={t('Skin tone')}>
        <span className="kicker">{t('Skin')}</span>
        <div className="look-swatches">
          {SKIN_COLORS.map((c, i) => (
            <button key={c} className="look-swatch" style={{ background: c }} aria-pressed={look.skin === i} aria-label={t('Skin tone {n} of 7', { n: i + 1 })} onClick={() => set({ skin: i })} />
          ))}
        </div>
      </div>
      <div className="look-row" role="group" aria-label={t('Hair colour')}>
        <span className="kicker">{t('Hair colour')}</span>
        <div className="look-swatches">
          {LOOK_HAIRS.map((h) => (
            <button key={h} className="look-swatch" style={{ background: HAIR_COLORS[h] }} aria-pressed={look.hair === h} aria-label={t(HAIR_NAME[h])} title={t(HAIR_NAME[h])} onClick={() => set({ hair: h })} />
          ))}
        </div>
      </div>
      <div className="look-row" role="group" aria-label={t('Hair')}>
        <span className="kicker">{t('Hair')}</span>
        <div className="seg small-seg look-seg">
          {LOOK_STYLES.map((s) => (
            <button key={s} aria-pressed={look.style === s} onClick={() => set({ style: s })}>
              {t(STYLE_NAME[s])}
            </button>
          ))}
        </div>
      </div>
      <div className="look-row" role="group" aria-label={t('Facial hair')}>
        <span className="kicker">{t('Face')}</span>
        <div className="seg small-seg look-seg">
          {LOOK_FACES.map((f) => (
            <button key={f} aria-pressed={look.face === f} onClick={() => set({ face: f })}>
              {t(FACE_NAME[f])}
            </button>
          ))}
        </div>
      </div>
      <div className="look-row" role="group" aria-label={t('Practice jersey')}>
        <span className="kicker">{t('Jersey')}</span>
        <div className="seg small-seg look-seg">
          {(['white', 'black'] as Jersey[]).map((j) => (
            <button key={j} aria-pressed={jersey === j} onClick={() => setJersey(j)}>
              {j === 'white' ? t('White') : t('Black')}
            </button>
          ))}
          <button onClick={() => setLook(randomLook())}>{t('Random look')}</button>
        </div>
      </div>
    </div>
  );
}
