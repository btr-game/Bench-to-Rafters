// The top bar's tools (round 14): one settings menu instead of switches scattered over the
// screens, a "next step" button that lets you carry on from any tab, and keyboard shortcuts.

import { Icon } from '../art/Icon';
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../../engine/types';
import { prompt } from '../../engine/flow';
import { canUndo, useStore, type Court, type Tab, type TextSize, type Theme } from '../../store';
import { inTutorial } from '../road';
import { UsernameBox } from './Username';
import { allows } from '../../engine/levels';
import { setMusic, setSfx, setVolume, sfx, soundSettings } from '../sound';
import { announce, announcerOn, setAnnouncer } from '../announcer';
import { LANGS, lang, setLang, t } from '../../i18n';

/** A switch row: label, short note, on/off button. */
/** Round 31 (owner: "volume sliders"): a channel's level, under its switch; arrow keys step it by 5%. */
function Volume({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <label className="set-vol">
      <span>{t('{label} volume', { label })}</span>
      <input type="range" min={0} max={100} step={5} value={Math.round(value * 100)} disabled={disabled} aria-valuetext={t('{n} percent', { n: Math.round(value * 100) })} onChange={(e) => onChange(Number(e.target.value) / 100)} />
      <b>{Math.round(value * 100)}%</b>
    </label>
  );
}

function Toggle({ icon, label, note, on, onClick, tour, locked, why = t('Locked for this career’s challenge') }: { icon: string; label: string; note: string; on: boolean; onClick: () => void; tour: string; locked?: boolean; why?: string }) {
  return (
    <div className="set-row" data-tour={tour}>
      <Icon name={icon} size={26} />
      <div>
        <b>{label}</b>
        <small>{note}</small>
      </div>
      <button className={`switch${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={onClick} disabled={locked} title={locked ? why : undefined}>
        <span />
      </button>
    </div>
  );
}

/** Round 27: the menu opens under its button; where that would leave the screen (the start page's
 * button sits at the left on a phone), it slides back in, 16px from the edge. */
const keepOnScreen = (el: HTMLDivElement | null) => {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const over = r.left < 16 ? 16 - r.left : r.right > innerWidth - 16 ? innerWidth - 16 - r.right : 0;
  if (over) el.style.transform = `translateX(${over}px)`;
};

export function SettingsMenu({ g }: { g: GameState | null }) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const [snd, setSnd] = useState(soundSettings);
  const [voiceOn, setVoiceOn] = useState(announcerOn);
  const box = useRef<HTMLDivElement>(null);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const court = useStore((s) => s.court);
  const setCourt = useStore((s) => s.setCourt);
  const text = useStore((s) => s.text);
  const setText = useStore((s) => s.setText);
  const simple = useStore((s) => s.simple);
  const toggleSimple = useStore((s) => s.toggleSimple);
  const guide = useStore((s) => s.guide);
  const toggleGuide = useStore((s) => s.toggleGuide);
  const toggleMaster = useStore((s) => s.toggleMaster);
  const toggleFast = useStore((s) => s.toggleFast);
  const togglePlayoffs = useStore((s) => s.togglePlayoffs);
  const reset = useStore((s) => s.reset);
  const saving = useStore((s) => s.saving);
  const master = useStore((s) => s.master);
  // round 33: in the tutorial and inside a level, only what the level has (owner: beginner's
  // settings are "theme/sound/music/text size"); Simple text, Guide and Master mode come in the
  // closing tour, and a level is played to its end
  const tut = useStore((s) => inTutorial(s.road));
  const level = !!g?.flags.level;
  const lite = tut || level;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      // round 27 (owner: "in guide mode i click Got it but the settings bar closes"): the guide's
      // tip over the menu is part of it, not a click outside
      if (!(e instanceof KeyboardEvent) && (e.target as Element | null)?.closest?.('.tour-tip, .tour-ring, .guide-tip')) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) {
        setOpen(false);
        setArmed(false);
      }
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [open]);

  const retired = g?.step === 'retired';
  // round 33: where the career goes when he leaves it (every career is saved but a daily challenge)
  const keepNote = g?.flags.daily ? t('Today’s challenge is not saved: leaving ends this run.') : t('This career stays saved in the career log: continue it there any time.');
  return (
    <div className="set-wrap" ref={box}>
      <button className="icon-btn" data-tour="settings-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        {/* round 28: two sliders on a 12x12 pixel grid */}
        <svg viewBox="-1 -1 14 14" width="18" height="18" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
          {['............', '.......##...', '.##########.', '.......##...', '............', '............', '............', '...##.......', '.##########.', '...##.......', '............', '............'].flatMap((row, y) =>
            [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)),
          )}
        </svg>
        <span className="hide-narrow">{t('Settings')}</span>
      </button>
      {open && (
        <div className="set-menu" role="menu" ref={keepOnScreen}>
          <div className="set-row" data-tour="set-theme">
            <b>{t('Theme')}</b>
            <div className="seg small-seg">
              {(['auto', 'light', 'dark'] as Theme[]).map((x) => (
                <button key={x} aria-pressed={theme === x} onClick={() => setTheme(x)}>
                  {x === 'auto' ? t('Auto') : x === 'light' ? t('Light') : t('Dark')}
                </button>
              ))}
            </div>
          </div>
          {g?.flags.level !== 1 && (
          <div className="set-row" data-tour="set-court">
            <b>{t('Court')}</b>
            <div className="seg small-seg">
              {(['classic', 'hardwood', 'street'] as Court[]).map((c) => (
                <button key={c} aria-pressed={court === c} onClick={() => setCourt(c)}>
                  {c === 'classic' ? t('Classic') : c === 'hardwood' ? t('Hardwood') : t('Streetball')}
                </button>
              ))}
            </div>
          </div>
          )}
          <div className="set-row" data-tour="set-text">
            <b className="with-icon">
              <Icon name="textsize" size={18} />
              {t('Text size')}
            </b>
            <div className="seg small-seg">
              {(['m', 'l', 'xl'] as TextSize[]).map((x) => (
                <button key={x} aria-pressed={text === x} onClick={() => setText(x)}>
                  {x === 'm' ? t('Normal') : x === 'l' ? t('Large') : t('Extra large')}
                </button>
              ))}
            </div>
          </div>
          {/* round 40: the game's languages, each by its own name */}
          <div className="set-row" data-tour="set-lang">
            <b className="with-icon">
              <Icon name="globe" size={18} />
              {t('Language')}
            </b>
            <div className="seg small-seg set-langs">
              {LANGS.map((l) => (
                <button key={l.id} lang={l.id} aria-pressed={lang() === l.id} onClick={() => setLang(l.id)}>
                  {l.name}
                </button>
              ))}
            </div>
          </div>
          {/* round 36 (owner: a username "changable"): the same one the graduation page asked for */}
          {!tut && !level && (
            <div className="set-row set-user" data-tour="set-username">
              <UsernameBox compact note={t('Shown beside your careers on the community boards and to friends.')} />
            </div>
          )}
          {/* round 24 (owner): New career sits right under the court, not at the bottom of the menu */}
          {/* round 25 (owner: no confirmation text, small and easy to miss): a full-size button, then
              a plain question with its answer spelled out */}
          {g && !level && (
            <div className="set-new" data-tour="set-new">
              {armed && !retired ? (
                <div className="set-confirm" role="group" aria-label={t('Start a new career?')}>
                  <b>{t('Leave this career and start a new one?')}</b>
                  <small>{keepNote}</small>
                  <div className="set-confirm-row">
                    <button className="btn" onClick={() => (reset(), setOpen(false), setArmed(false))} autoFocus>
                      {t('Yes, new career')}
                    </button>
                    <button className="btn ghost" onClick={() => setArmed(false)}>
                      {t('Keep playing')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button className="btn block with-icon set-new-btn" onClick={() => (retired ? (reset(), setOpen(false)) : setArmed(true))}>
                    <Icon name="door" size={24} />
                    {t('New career')}
                  </button>
                  {/* round 33 (owner: "users might be hesitant to leave if they arent aware"): said before the tap, not only after */}
                  {!retired && <small className="set-new-note">{keepNote}</small>}
                </>
              )}
            </div>
          )}
          {g && !retired && !g.flags.daily && (
            <>
              {allows(g, 'fast') && <Toggle icon="fast" label={t('Fast break')} note={t('Quick seasons; you still make every real call.')} on={!!g.flags.fast} onClick={toggleFast} tour="set-fast" locked={!!g.flags.oath || !!g.flags.comet || !!g.flags.friends} />}
              {!level && <Toggle icon="bracket" label={t('Playable playoff games')} note={t('Off: postseason games are simulated.')} on={!g.flags.simPostseason} onClick={togglePlayoffs} tour="set-playoffs" />}
            </>
          )}
          <Toggle icon="live" label={t('Sound effects')} note={t('Chiptune sounds for clicks, wins, titles and the rest.')} on={snd.sfx} onClick={() => (setSfx(!snd.sfx), setSnd(soundSettings()))} tour="set-sfx" />
          <Volume label={t('Effects')} value={snd.sfxVol} disabled={!snd.sfx} onChange={(v) => (setVolume('sfx', v), setSnd(soundSettings()))} />
          {/* round 32: the booming voice for the big plays (with the effects, at their volume) */}
          <Toggle icon="mic" label={t('Announcer')} note={t('A booming voice for the big plays: blocks, dunks, threes, buzzer beaters, titles.')} on={voiceOn && snd.sfx} locked={!snd.sfx} why={t('On with the sound effects')} onClick={() => (setAnnouncer(!voiceOn), setVoiceOn(!voiceOn), !voiceOn && announce('Let’s go!'))} tour="set-announcer" />
          <Toggle icon="live" label={t('Music')} note={t('A loop for each part of the game: every level and league, the offseason, the mini-games.')} on={snd.music} onClick={() => (setMusic(!snd.music), setSnd(soundSettings()))} tour="set-music" />
          <Volume label={t('Music')} value={snd.musicVol} disabled={!snd.music} onChange={(v) => (setVolume('music', v), setSnd(soundSettings()))} />
          {!lite && (
            <>
              <Toggle icon="simple" label={t('Simple text')} note={t('Hide descriptions, keep the choices.')} on={simple} onClick={toggleSimple} tour="set-simple" />
              <Toggle icon="guide" label={t('Guide mode')} note={master ? t('Off while Master mode is on.') : t('Highlights the next thing to do.')} on={guide && !master} onClick={toggleGuide} tour="set-guide" />
              <Toggle icon="master" label={t('Master mode')} note={t('No recommendations: no scouts’ calls, fit tags, suggested deals or guide hints. You read the game yourself.')} on={master} onClick={toggleMaster} tour="set-master" locked={!!g?.flags.oath} />
            </>
          )}
          <div className="set-keys hide-touch">
            <b>{t('Keyboard')}</b>
            <span>
              <kbd>Enter</kbd> {t('continue, leave the shop or skip a final to the buzzer')} · <kbd>1</kbd>–<kbd>9</kbd> <kbd>0</kbd> <kbd>-</kbd> <kbd>=</kbd> {t('pick a choice')} · <kbd>H</kbd> <kbd>S</kbd> <kbd>P</kbd> <kbd>R</kbd> <kbd>E</kbd> {t('tabs')} · <kbd>U</kbd> {t('undo the last choice')} · <kbd>Esc</kbd> {t('back from a page, close a menu')}
            </span>
          </div>
          <div className="set-foot">
            <small className="muted">{saving === 'ok' ? t('Saved on this device after every move.') : t('This browser is not letting the game save.')}</small>
          </div>
        </div>
      )}
    </div>
  );
}

/** Carry on from any tab: back to the choice waiting at Home, or play on straight away. */
export function NextStep({ g }: { g: GameState }) {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const advance = useStore((s) => s.advance);
  if (tab === 'home') return null;
  const pr = prompt(g);
  if (pr.type === 'retired') return null;
  return pr.type === 'decision' ? (
    <button className="next-step" onClick={() => setTab('home')}>
      <small>{t('Waiting at Home')}</small>
      <b>{pr.decision.title}</b>
    </button>
  ) : (
    <button className="next-step go" onClick={advance}>
      <small>{t('Next')}</small>
      <b>{pr.label}</b>
    </button>
  );
}

const TAB_KEYS: Record<string, Tab> = { h: 'home', s: 'season', p: 'player', r: 'records', e: 'extras' };
// choices 1-9, then 0, - and = for the 10th to 12th (twelve plans fit on the number row)
const CHOICE_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

/**
 * Keyboard play on a computer: Enter presses the main button, number keys pick choices (the
 * buttons get small number tags), letters switch tabs. Overlays take Enter first.
 */
export function useKeys(active: boolean) {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const game = useStore((s) => s.game);

  // number the choices in the main card
  useEffect(() => {
    document.querySelectorAll('[data-n]').forEach((el) => el.removeAttribute('data-n'));
    if (!active || tab !== 'home') return;
    choices().forEach((el, i) => el.setAttribute('data-n', CHOICE_KEYS[i]));
  });

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (e.key === 'Enter') {
        // the shop: Enter always leaves, even with an item's button still focused after a purchase
        const leave = !dialog && tab === 'home' ? document.querySelector<HTMLElement>('.o-main [data-enter]') : null;
        if (leave) {
          e.preventDefault();
          leave.click();
          return;
        }
        // a game reel is running: Enter jumps to the final buzzer, never past the result
        const skip = dialog?.querySelector<HTMLElement>('[data-skip]');
        if (skip) {
          e.preventDefault();
          skip.click();
          return;
        }
        if (t.tagName === 'BUTTON') return; // the browser presses a focused button itself
        const target = dialog ? (dialog.querySelector<HTMLElement>('.btn:not(:disabled)') ?? dialog) : tab === 'home' ? document.querySelector<HTMLElement>('.o-main .btn.block:not(:disabled)') : null;
        if (target) {
          e.preventDefault();
          target.click();
        }
        return;
      }
      if (dialog || document.querySelector('.set-menu')) return;
      if (CHOICE_KEYS.includes(e.key) && tab === 'home') {
        const el = choices()[CHOICE_KEYS.indexOf(e.key)];
        if (el) {
          e.preventDefault();
          el.click();
        }
        return;
      }
      // round 31: U takes back the last choice (where a career allows it)
      if (e.key.toLowerCase() === 'u' && game) {
        const st = useStore.getState();
        if (st.undo && canUndo(game)) {
          e.preventDefault();
          sfx('undo');
          st.undoLast();
        }
        return;
      }
      const to = TAB_KEYS[e.key.toLowerCase()];
      if (to && game) setTab(to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, tab, setTab, game]);
}

function choices(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('.o-main button.choice:not(:disabled):not([data-enter]), .o-main button.offer, .o-main button.item:not(:disabled), .o-main button.role-card')].slice(0, CHOICE_KEYS.length);
}
