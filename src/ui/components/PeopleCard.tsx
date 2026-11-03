// Story mode's People card on the Player tab (round 38): the four people he named (or the game did),
// each with a portrait, where they are now, how they feel about him (seven squares, cold to family)
// and the last thing he said that they remember. The friend and the rival show their OVR: one rises
// or falls with his choices, the other always a small step ahead.

import type { GameState, StoryPal, StoryRole } from '../../engine/types';
import { STORY_CHAPTERS } from '../../engine/story/chapters';
import { storyT } from '../../i18n/story';
import { t } from '../../i18n';
import { StoryPortrait } from '../art/StoryArt';
import { team as teamOf } from '../selectors';
import { Card } from './bits';
import { useStore } from '../../store';

const ROLES: StoryRole[] = ['friend', 'rival', 'parent', 'sibling'];

/** Where the friend or the rival is this season, in words. */
function whereOf(g: GameState, who: StoryRole, pal: StoryPal | null): string {
  const town = (g.player.hometown || 'Dayton').split(',')[0];
  if (who === 'parent' || who === 'sibling') return storyT('people.where.home', { town });
  if (!pal) return storyT('people.where.unmet');
  const mine = teamOf(g)?.name;
  if (pal.hurt) return storyT('people.where.hurt');
  if (who === 'rival' && pal.lv === 'OUT') return storyT('people.where.retired');
  if (pal.lv === 'COACH' && g.story?.f.friendCoach && pal.team === mine) return storyT('people.where.bench');
  if (pal.lv === 'NBA' && pal.team === mine) return storyT('people.where.mine');
  return storyT(`people.where.${pal.lv}`, { team: pal.team || '' });
}

function Bond({ value }: { value: number }) {
  const v = Math.max(-3, Math.min(3, Math.round(value)));
  return (
    <span className="bond" aria-hidden="true">
      {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
        <i key={k} className={k === 0 ? 'mid' : (k < 0 ? k >= v : k <= v) ? (k < 0 ? 'cold' : 'warm') : undefined} />
      ))}
    </span>
  );
}

export function PeopleCard({ g }: { g: GameState }) {
  const st = g.story;
  const simple = useStore((s) => s.simple);
  if (!st) return null;
  return (
    <Card title={t('His people')} fold="people" kicker={`Story mode · ${t('{done} of {total} chapters', { done: st.done.length, total: STORY_CHAPTERS.length })}`} tour="people">
      <ul className="people">
        {ROLES.map((who) => {
          const pal = who === 'friend' ? st.friend : who === 'rival' ? st.rival : null;
          const met = who !== 'rival' || !!pal;
          const bond = st.bond[who] ?? 0;
          const mem = [...st.mem].reverse().find((m) => m.who === who);
          const name = met ? st.names[who] : '?';
          return (
            <li key={who} className="person">
              <StoryPortrait role={who} name={met ? st.names[who] : `${who} of ${g.player.name}`} team={pal?.lv === 'NBA' ? pal.team : ''} size={56} />
              <div className="stack" style={{ gap: 2, minWidth: 0 }}>
                <span className="kicker">{storyT(`people.${who}`)}</span>
                <b>
                  {name}
                  {pal && met && pal.lv !== 'OUT' && pal.lv !== 'COACH' ? <span className="muted small"> · OVR {Math.round(pal.ovr)}</span> : null}
                </b>
                <span className="small">{whereOf(g, who, pal)}</span>
                {met && (
                  <span className="small bond-line">
                    <Bond value={bond} /> {storyT(`people.bond.${Math.max(-3, Math.min(3, Math.round(bond)))}`)}
                  </span>
                )}
                {mem && !simple && <q className="small muted">{storyT(`mem.${mem.id}`)}</q>}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
