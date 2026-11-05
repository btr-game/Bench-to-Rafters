// Round 41: the engine's lines in the player's language (src/i18n/engine.ts). A line by its name, a
// line with values by its template (each value translated in turn when it is a line of its own), a
// paragraph a sentence at a time, and English left alone; the page's string children through the
// same door (translatedProps, jsx-runtime.ts).

import { afterAll, describe, expect, it } from 'vitest';
import { setLang, tableOf } from '../src/i18n';
import { te, translatedProps } from '../src/i18n/engine';
import { hashOf } from '../src/i18n/hash';
import TPL from '../src/i18n/engineTpl.json';

const ko = tableOf('ko');
const was = ko.eng;
const put = (en: string, tr: string) => (ko.eng![hashOf(en)] = tr);
// a template the catalog found, with its values (the fan mail from abroad, round 39)
const tpl = (TPL as string[]).find((s) => /^\{0\} fire \{1\} after a \{2\}–\{3\} season; \{4\} takes over\.$/.test(s));

describe('engine lines in the player language', () => {
  ko.eng = { ...(was ?? {}) };
  put('The closer', '클로저');
  put('Watch it once, with the coach', '코치와 함께 한 번 보기');
  put('He pauses it eleven times.', '그는 영상을 열한 번 멈춰요.');
  if (tpl) put(tpl, '{0}, {2}–{3} 시즌 후 {1} 경질; {4} 부임.');
  afterAll(() => {
    ko.eng = was;
    setLang('en');
  });

  it('leaves everything as it is in English', () => {
    setLang('en');
    expect(te('The closer')).toBe('The closer');
  });

  it('finds a line by its name', () => {
    setLang('ko');
    expect(te('The closer')).toBe('클로저');
    expect(te('  Watch it once, with the coach ')).toBe('  코치와 함께 한 번 보기 ');
  });

  it('fills a template with the values on screen', () => {
    setLang('ko');
    expect(tpl, 'the coaching change template is in engineTpl.json').toBeTruthy();
    expect(te('The Hawks fire Joe Mazzulla after a 30–52 season; Ime Udoka takes over.')).toBe('The Hawks, 30–52 시즌 후 Joe Mazzulla 경질; Ime Udoka 부임.');
  });

  it('translates a value that is a line of its own', () => {
    setLang('ko');
    expect(te('The closer fire The closer after a 1–2 season; Watch it once, with the coach takes over.')).toBe('클로저, 1–2 시즌 후 클로저 경질; 코치와 함께 한 번 보기 부임.');
  });

  it('takes a paragraph a sentence at a time, and keeps the sentences it does not know', () => {
    setLang('ko');
    expect(te('He pauses it eleven times. Ten are about your feet.')).toBe('그는 영상을 열한 번 멈춰요. Ten are about your feet.');
    expect(te('Nothing here is known. Nor here.')).toBe('Nothing here is known. Nor here.');
  });

  it('passes names, numbers and short strings through', () => {
    setLang('ko');
    for (const s of ['Joe Mazzulla', '41–41', 'PTS', '', '12.5']) expect(te(s)).toBe(s);
  });

  it('translates a tag’s string children, and returns the same props when nothing changes', () => {
    setLang('ko');
    const p = { className: 'x', children: 'The closer' };
    expect(translatedProps(p)).toEqual({ className: 'x', children: '클로저' });
    const q = { children: ['Score: ', 'The closer', 3] };
    expect(translatedProps(q)).toEqual({ children: ['Score: ', '클로저', 3] });
    const r = { children: 'Joe Mazzulla' };
    expect(translatedProps(r)).toBe(r);
    setLang('en');
    expect(translatedProps(p)).toBe(p);
  });
});

describe('the catalog', () => {
  it('has every template once, sorted (scripts/engineText.ts --write)', () => {
    const t = TPL as string[];
    expect(t.length).toBeGreaterThan(500);
    expect(new Set(t).size).toBe(t.length);
    expect([...t].sort()).toEqual(t);
    for (const s of t) expect(s).toMatch(/\{0\}/);
  });
});
