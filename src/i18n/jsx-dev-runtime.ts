// jsx-runtime.ts for the dev server (React's development JSX, with the same translation).

import { Fragment, jsxDEV as rjsxDEV } from 'react/jsx-dev-runtime';
import { translatedProps } from './engine';

export { Fragment };

const tag = (type: unknown) => typeof type === 'string' || type === Fragment;

export const jsxDEV: typeof rjsxDEV = (type, props, key, isStatic, source, self) => rjsxDEV(type, tag(type) ? translatedProps(props) : props, key, isStatic, source, self);
