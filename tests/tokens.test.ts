// Round 27: the colour tokens stay in step. Every token the dark theme sets (from the system setting
// and from the switch) is set by both, and every one also has a light value, so no colour exists in
// one theme only.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

const css = readFileSync(new URL('../src/ui/styles/tokens.css', import.meta.url), 'utf8');
const tokensIn = (block: string) => new Set([...block.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const blockAfter = (head: RegExp) => {
  const at = css.search(head);
  const open = css.indexOf('{', css.indexOf('{', at) === -1 ? at : at);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(open, i);
  }
  return '';
};

describe('colour tokens', () => {
  const light = tokensIn(blockAfter(/^:root\s*\{/m));
  const darkSystem = tokensIn(blockAfter(/:root:not\(\[data-theme='light'\]\)/));
  const darkSwitch = tokensIn(blockAfter(/^:root\[data-theme='dark'\]/m));

  it('sets the same tokens in both dark blocks', () => {
    expect([...darkSystem].sort()).toEqual([...darkSwitch].sort());
  });

  it('has a light value for every dark token', () => {
    for (const t of darkSystem) expect(light.has(t), t).toBe(true);
  });
});
