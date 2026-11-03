// Story mode's way in (round 38): the card on the main land's old neighbourhood, and the page that
// names his people before the first chapter (owner: "Player names friend, family, and rival, and
// rest are generated. the player can skip the naming and all are generated"). The hero is written
// (engine/story/cast.ts STORY_HERO); his name may be changed. Each portrait follows the name typed
// into its box, so a name is a face of its own. A one-word name for the parent or the sibling takes
// his surname, as the engine does.

import { useState } from 'react';
import { useStore } from '../../store';
import { Icon } from '../art/Icon';
import { StoryPortrait } from '../art/StoryArt';
import { LookPreview } from '../components/LookPicker';
import { STORY_HERO } from '../../engine/story/cast';
import { storyT } from '../../i18n/story';
import { NAME_MAX, cleanName, isRude, nameProblem } from '../names';
import { sfx } from '../sound';
import type { ChosenLook } from '../../content/looks';
import type { StoryRole } from '../../engine/types';

const NAMED = ['friend', 'parent', 'sibling', 'rival'] as const satisfies readonly StoryRole[];
type Named = (typeof NAMED)[number];

const surname = (name: string) => name.trim().split(/\s+/).slice(-1)[0] ?? '';

/** The old neighbourhood's card on the main land. */
export function StoryCard({ onStory }: { onStory: () => void }) {
  return (
    <div className="stack ml-venue">
      <div className="row ml-venue-title">
        <Icon name="story" size={30} />
        <div className="sec-title">Story mode</div>
      </div>
      <p className="small muted">One career, told as a story. {STORY_HERO.name} grows up in Dayton, Ohio, with his best friend next door, his family in the front row, and a rival he meets in college who is always one small step ahead. Every chapter is a choice, and the people remember it.</p>
      <p className="small muted">A written hero on Regular guy’s road, all in the States. Name his people, or let the game name them.</p>
      <div className="row-end">
        <button className="btn" data-tour="create-next" onClick={() => (sfx('family'), onStory())}>
          Meet his people
        </button>
      </div>
    </div>
  );
}

/** The naming page: the hero, then the four people the player may name. */
export function StoryStart({ onBack }: { onBack: () => void }) {
  const start = useStore((s) => s.start);
  const [hero, setHero] = useState(STORY_HERO.name);
  const [names, setNames] = useState<Record<Named, string>>({ friend: '', parent: '', sibling: '', rival: '' });
  const heroBad = nameProblem(hero);
  const bad = (k: Named) => (names[k].trim() && isRude(names[k]) ? 'That name isn’t allowed. Pick another one.' : '');
  const blocked = !!heroBad || NAMED.some((k) => bad(k));
  // the name each portrait is drawn from: what is typed (family taking his surname), else the role
  const shown = (k: Named) => {
    const t = names[k].trim();
    if (!t) return `${k} of ${hero}`;
    return (k === 'parent' || k === 'sibling') && !t.includes(' ') ? `${t} ${surname(hero)}` : t;
  };
  const begin = (skip: boolean) => {
    if (blocked) return;
    sfx('confirm');
    const story: Partial<Record<Named, string>> = {};
    if (!skip) for (const k of NAMED) if (names[k].trim()) story[k] = names[k].trim();
    start({ ...STORY_HERO, name: hero.trim() || STORY_HERO.name, story });
  };
  return (
    <section className="stack story-start" aria-label="Story mode: his people">
      <div>
        <div className="kicker">Story mode · the old neighbourhood</div>
        <h1 className="ml-title">His people</h1>
        <p className="small muted">Before the first chapter: the people in his life. Name any of them, or leave a box empty and the game names that one. Skip and the game names them all.</p>
      </div>
      <div className="card story-hero">
        <LookPreview name={hero.trim() || STORY_HERO.name} number={STORY_HERO.number} look={STORY_HERO.look as ChosenLook} jersey="white" size={120} />
        <div className="stack" style={{ gap: 6, minWidth: 0 }}>
          <div className="field">
            <label htmlFor="story-hero">His name</label>
            <input id="story-hero" type="text" maxLength={NAME_MAX} value={hero} aria-describedby="story-hero-note" onChange={(e) => setHero(cleanName(e.target.value))} />
            <small id="story-hero-note" className={heroBad ? 'name-note bad' : 'name-note muted'}>
              {heroBad || 'Letters A to Z.'}
            </small>
          </div>
          <p className="small">14 years old, from Dayton, Ohio. Number 3 at Fairview High: a shooting guard, a sharpshooter, working on his shot and his handle.</p>
        </div>
      </div>
      <div className="story-cast">
        {NAMED.map((k) => (
          <div key={k} className="card story-person">
            <StoryPortrait role={k} name={shown(k)} size={76} />
            <div className="stack" style={{ gap: 4, minWidth: 0 }}>
              <label className="sec-title" htmlFor={`story-${k}`}>
                {storyT(`people.${k}`)}
              </label>
              <p className="small muted">{storyT(`people.${k}.about`)}</p>
              <input id={`story-${k}`} type="text" maxLength={NAME_MAX} value={names[k]} placeholder="Empty: the game names him" aria-describedby={`story-${k}-note`} onChange={(e) => setNames((n) => ({ ...n, [k]: cleanName(e.target.value) }))} />
              <small id={`story-${k}-note`} className={bad(k) ? 'name-note bad' : 'name-note muted'}>
                {bad(k) || (names[k].trim() ? `Meet ${shown(k)}.` : 'The game names this one.')}
              </small>
            </div>
          </div>
        ))}
      </div>
      <div className="row story-go">
        <button className="btn ghost small" onClick={onBack}>
          Back to the main land
        </button>
        <span className="spacer" />
        <button className="btn ghost" disabled={!!heroBad} onClick={() => begin(true)}>
          Skip: name them for me
        </button>
        <button className="btn" disabled={blocked} onClick={() => begin(false)}>
          Start the story
        </button>
      </div>
    </section>
  );
}
