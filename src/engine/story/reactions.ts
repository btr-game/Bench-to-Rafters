// Template-driven fan reactions (§13). Uses its own tiny hash so it never
// consumes the game's random stream.

import { COMMENTS, HANDLES, HEADLINES, SOURCES, type Mood } from '../../content/reactions';
import type { GameState, Reaction, SeasonRecord } from '../types';
import { perGame } from '../sim/statModel';

function hash(n: number): () => number {
  let x = (n * 2654435761) >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}

function fill(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
}

export function moodOf(rec: SeasonRecord): Mood {
  if (rec.awards.length > 0 || rec.result.includes('hampion')) return 'great';
  const delta = rec.ovrEnd - rec.ovrStart;
  if (rec.line.gp === 0 || rec.role === 'deep') return delta > 2 ? 'meh' : 'bad';
  if (rec.role === 'key' || rec.role === 'starter') return delta >= 0 ? 'good' : 'meh';
  return delta > 2 ? 'good' : 'meh';
}

export function reactionsForSeason(s: GameState, rec: SeasonRecord): Reaction {
  const r = hash(s.year * 7919 + s.nextId);
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const mood = moodOf(rec);
  const stageKey = rec.level === 'HSJV' || rec.level === 'HSV' ? 'HS' : rec.level;
  const vars = {
    name: s.player.name,
    team: rec.teamName,
    ppg: perGame(rec.line, 'pts').toFixed(1),
    rpg: perGame(rec.line, 'reb').toFixed(1),
    apg: perGame(rec.line, 'ast').toFixed(1),
    result: rec.result,
    award: rec.awards[0] ?? '',
    age: String(s.player.age),
  };
  const pool = [...COMMENTS[mood]];
  const comments: Reaction['comments'] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(r() * pool.length);
    const c = pool.splice(idx, 1)[0];
    comments.push({ user: pick(HANDLES), text: fill(c.text, vars), tone: c.tone, likes: Math.round(5 + r() * (mood === 'great' ? 4000 : 400)), ago: `${1 + Math.floor(r() * 58)} min ago` });
  }
  return { headline: fill(pick(HEADLINES[mood]), vars), source: pick(SOURCES[stageKey as keyof typeof SOURCES]), comments };
}
