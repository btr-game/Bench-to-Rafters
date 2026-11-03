// A story mode chapter on screen (round 38): the two of them face to face in pixel busts (the hero in
// his kit, the person in theirs), on a backdrop for who it is (the driveway at sunset for the friend,
// the arena for the rival, home for the family), the chapter's lines and his answers. The words come
// by key (content/story.ts) with the names that fill them, so round 40's languages show here.

import { useEffect } from 'react';
import type { Decision, GameState, StoryRole } from '../../engine/types';
import { useStore } from '../../store';
import type { StorySlots } from '../../content/story';
import { storyT } from '../../i18n/story';
import { t } from '../../i18n';
import { genericKits } from '../../content/teamStyle';
import { BustArt } from '../art/Bust';
import { StoryPortrait } from '../art/StoryArt';
import { kitFor, styleLeague } from '../art/Player';
import { team as teamOf } from '../selectors';
import { sfx } from '../sound';

/** Who stands opposite him, and the team the friend or the rival wears. */
function across(g: GameState, who: StoryRole): string {
  const st = g.story;
  const pal = who === 'friend' ? st?.friend : who === 'rival' ? st?.rival : null;
  return pal && pal.lv === 'NBA' ? pal.team : '';
}

export function StoryPage({ g, d }: { g: GameState; d: Decision }) {
  const choose = useStore((s) => s.choose);
  const simple = useStore((s) => s.simple);
  // a chapter opens like a page turning; the family's with the family's chime
  useEffect(() => sfx(d.data?.who === 'parent' || d.data?.who === 'sibling' ? 'family' : 'page'), [d.id]);
  const who = (d.data?.who as StoryRole | undefined) ?? 'friend';
  const ch = String(d.data?.ch ?? '');
  const v = (d.data?.v as StorySlots | undefined) ?? {};
  const lines = (d.data?.lines as string[] | undefined) ?? [];
  const name = String(d.data?.name ?? '');
  const tm = teamOf(g);
  const kit = tm ? kitFor(tm.name, tm.abbr, tm.color, 'home', styleLeague(g.stage)) : genericKits('#1D428A', '').home;
  const n = (g.story?.done.length ?? 0) + 1;
  return (
    <div className="stack story-page" data-who={who}>
      <div className="story-stage" aria-hidden="true">
        <figure>
          <BustArt name={g.player.name} kit={kit} number={g.player.number} size={112} />
        </figure>
        <figure>
          <StoryPortrait role={who} name={name} team={across(g, who)} size={112} />
        </figure>
      </div>
      <div>
        <div className="kicker">
          Story mode · {t('chapter {n}', { n })} · {storyT(`people.${who}`)}: {name}
        </div>
        <h2 className="title story-title">{storyT(`${ch}.title`)}</h2>
      </div>
      <div className="stack story-lines">
        {/* simple text keeps the line the choice answers (the last) */}
        {(simple ? lines.slice(-1) : lines).map((k) => (
          <p key={k}>{storyT(k, v)}</p>
        ))}
      </div>
      <div className="choices">
        {d.choices.map((c) => (
          <button key={c.id} className="choice" onClick={() => choose(c.id)}>
            <span className="label">{storyT(`${ch}.a.${c.id}`, v)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
