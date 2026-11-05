// The page's JSX (round 41): React's own, with the engine's lines translated on the way in (engine.ts).
// Every tag's and fragment's string children pass through `te`, so a line the engine wrote shows in
// the player's language wherever a screen draws it. A component's own props are left as they are
// (its tags translate what it draws). vite.config.ts points the game's files here; the dev deck's
// keep React's JSX as it is, so the deck stays English.

import { Fragment, jsx as rjsx, jsxs as rjsxs } from 'react/jsx-runtime';
import { translatedProps } from './engine';

export { Fragment };

type Jsx = typeof rjsx;
const tag = (type: unknown) => typeof type === 'string' || type === Fragment;

export const jsx: Jsx = (type, props, key) => rjsx(type, tag(type) ? translatedProps(props) : props, key);
export const jsxs: Jsx = (type, props, key) => rjsxs(type, tag(type) ? translatedProps(props) : props, key);
