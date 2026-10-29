// The top bar's tools (round 14): one settings menu instead of switches scattered over the
// screens, a "next step" button that lets you carry on from any tab, and keyboard shortcuts.

import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../../engine/types';
import { prompt } from '../../engine/flow';
import { useStore, type Tab, type Theme } from '../../store';

/** A switch row: label, short note, on/off button. */
function Toggle({ label, note, on, onClick }: { label: string; note: string; on: boolean; onClick: () => void }) {
  return (
    <div className="set-row">
      <div>
        <b>{label}</b>
        <small>{note}</small>
      </div>
      <button className={`switch${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={onClick}>
        <span />
      </button>
    </div>
  );
}

export function SettingsMenu({ g }: { g: GameState | null }) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const simple = useStore((s) => s.simple);
  const toggleSimple = useStore((s) => s.toggleSimple);
  const guide = useStore((s) => s.guide);
  const toggleGuide = useStore((s) => s.toggleGuide);
  const toggleFast = useStore((s) => s.toggleFast);
  const togglePlayoffs = useStore((s) => s.togglePlayoffs);
  const reset = useStore((s) => s.reset);
  const saving = useStore((s) => s.saving);
  const master = useStore((s) => s.master);
  const toggleMaster = useStore((s) => s.toggleMaster);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
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
  return (
    <div className="set-wrap" ref={box}>
      <button className="icon-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
        <span className="hide-narrow">Settings</span>
      </button>
      {open && (
        <div className="set-menu" role="menu">
          <div className="set-row">
            <b>Theme</b>
            <div className="seg small-seg">
              {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
                <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>
                  {t === 'auto' ? 'Auto' : t === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
          </div>
          {g && !retired && (
            <>
              <Toggle label="Fast break" note="Quick seasons; you still make every real call." on={!!g.flags.fast} onClick={toggleFast} />
              <Toggle label="Playable playoff games" note="Off: postseason games are simulated." on={!g.flags.simPostseason} onClick={togglePlayoffs} />
            </>
          )}
          <Toggle label="Simple text" note="Hide descriptions, keep the choices." on={simple} onClick={toggleSimple} />
          <Toggle label="Guide mode" note={master ? 'Off while Master mode is on.' : 'Highlights the next thing to do.'} on={guide && !master} onClick={toggleGuide} />
          <Toggle label="Master mode" note="No recommendations: no scouts' calls, fit tags, suggested deals or guide hints. You read the game yourself." on={master} onClick={toggleMaster} />
          <div className="set-keys hide-touch">
            <b>Keyboard</b>
            <span>
              <kbd>Enter</kbd> continue (or leave the shop) · <kbd>1</kbd>–<kbd>9</kbd> <kbd>0</kbd> <kbd>-</kbd> <kbd>=</kbd> pick a choice · <kbd>H</kbd> <kbd>S</kbd> <kbd>P</kbd> <kbd>L</kbd> <kbd>R</kbd> tabs · <kbd>F</kbd> fast break · <kbd>G</kbd> guide mode
            </span>
          </div>
          <div className="set-foot">
            <small className="muted">{saving === 'ok' ? 'Saved on this device after every move.' : 'This browser is not letting the game save.'}</small>
            {g && (
              <button className={`btn small ${armed || retired ? 'danger' : 'ghost'}`} onClick={() => (armed || retired ? (reset(), setOpen(false)) : setArmed(true))}>
                {armed ? 'Tap again: end this career' : 'New career'}
              </button>
            )}
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
      <small>Waiting at Home</small>
      <b>{pr.decision.title}</b>
    </button>
  ) : (
    <button className="next-step go" onClick={advance}>
      <small>Next</small>
      <b>{pr.label}</b>
    </button>
  );
}

const TAB_KEYS: Record<string, Tab> = { h: 'home', s: 'season', p: 'player', l: 'league', r: 'records' };
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
  const toggleFast = useStore((s) => s.toggleFast);
  const toggleGuide = useStore((s) => s.toggleGuide);

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
      const k = e.key.toLowerCase();
      if (k === 'f' && game && game.mode !== 'lab' && game.step !== 'retired') return toggleFast();
      if (k === 'g') return toggleGuide();
      const to = TAB_KEYS[k];
      if (to && game) setTab(to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, tab, setTab, game, toggleFast, toggleGuide]);
}

function choices(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('.o-main button.choice:not(:disabled):not([data-enter]), .o-main button.offer, .o-main button.item:not(:disabled)')].slice(0, CHOICE_KEYS.length);
}
