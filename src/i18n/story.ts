// Story mode's words on screen, in the player's language (round 40): the keyed English of
// content/story.ts with the language's own `story` table over it.
import { STORY_EN, storyText, type StorySlots } from '../content/story';
import { lang, storyTable } from '.';

let at: { l: string; table: Record<string, string> } | null = null;

/** A story line in the player's language, its slots filled. */
export function storyT(key: string, v: StorySlots = {}): string {
  if (!at || at.l !== lang()) at = { l: lang(), table: storyTable(STORY_EN) };
  return storyText(key, v, at.table);
}
