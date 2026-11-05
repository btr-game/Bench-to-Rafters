// After round 41: the game loads a language's table when it is picked (src/i18n/index.ts); the tests
// read all five from disk at once, so any test can switch to any language straight away.

import { registerLang, type Table } from '../src/i18n';
import ko from '../src/i18n/ko.json';
import zh from '../src/i18n/zh.json';
import ja from '../src/i18n/ja.json';
import es from '../src/i18n/es.json';
import fr from '../src/i18n/fr.json';

for (const [l, tb] of Object.entries({ ko, zh, ja, es, fr })) registerLang(l as 'ko', tb as Table);
