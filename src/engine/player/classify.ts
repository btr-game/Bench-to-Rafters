// The scouts' read on what kind of player he has become (playtest round 7: "the starting
// archetype doesn't always match the end result"). A small nearest-prototype classifier:
// - Each archetype card for his position is a prototype; so is each rare mold (anomaly.ts)
//   that fits his position, built from the position's average card plus its gift.
// - His ratings and each prototype are turned into a shape (each rating minus the average,
//   over the spread), since a 90-OVR star and a 50-OVR kid can play the same way.
// - A softmax over the negative squared distances gives a confidence for each label.
// Rare molds carry a small penalty, so they only win when the shape clearly calls for them.

import { ATTRS } from '../balance';
import type { Attrs, Pos } from '../types';
import { ARCHETYPES } from './archetypes';
import { ANOMALIES } from './anomaly';

export interface Fit {
  name: string;
  conf: number; // 0-1
  rare: boolean;
}

const TEMP = 0.9;
const RARE_PENALTY = 1.2;

function shape(a: Attrs): number[] {
  const v = ATTRS.map((k) => a[k]);
  const mean = v.reduce((x, y) => x + y, 0) / v.length;
  const sd = Math.sqrt(v.reduce((x, y) => x + (y - mean) ** 2, 0) / v.length) || 1;
  return v.map((x) => (x - mean) / sd);
}

function prototypes(pos: Pos): { name: string; v: number[]; rare: boolean }[] {
  const cards = ARCHETYPES[pos];
  const out = cards.map((c) => ({ name: c.name, v: shape(c.attrs), rare: false }));
  const avg = {} as Attrs;
  for (const k of ATTRS) avg[k] = cards.reduce((t, c) => t + c.attrs[k], 0) / cards.length;
  for (const an of ANOMALIES.filter((x) => x.pos.includes(pos))) {
    const a = { ...avg };
    for (const [k, b] of Object.entries(an.boost)) a[k as keyof Attrs] += b as number;
    out.push({ name: an.name, v: shape(a), rare: true });
  }
  return out;
}

/** Every label for his position, best match first. */
export function classify(attrs: Attrs, pos: Pos): Fit[] {
  const me = shape(attrs);
  const scored = prototypes(pos).map((p) => {
    const d2 = p.v.reduce((t, x, i) => t + (x - me[i]) ** 2, 0) / me.length;
    return { name: p.name, rare: p.rare, logit: -d2 / (TEMP * 0.5) - (p.rare ? RARE_PENALTY : 0) };
  });
  const max = Math.max(...scored.map((x) => x.logit));
  const z = scored.reduce((t, x) => t + Math.exp(x.logit - max), 0);
  return scored.map((x) => ({ name: x.name, rare: x.rare, conf: Math.exp(x.logit - max) / z })).sort((a, b) => b.conf - a.conf);
}

/**
 * End-of-season re-read. Updates the archetype when his game has clearly moved to another
 * one, and names a rare mold when his ratings have grown into one. Returns a line for the
 * offseason notes, or '' when nothing changed.
 */
export function reclassify(p: { attrs: Attrs; pos: Pos; archetype: string; anomaly?: string; fit?: { name: string; conf: number }[] }): string {
  const fits = classify(p.attrs, p.pos);
  p.fit = fits.slice(0, 3).map((f) => ({ name: f.name, conf: Math.round(f.conf * 100) / 100 }));
  const lines: string[] = [];
  const plain = fits.filter((f) => !f.rare);
  const now = plain.find((f) => f.name === p.archetype)?.conf ?? 0;
  const best = plain[0];
  if (best.name !== p.archetype && best.conf >= 0.3 && best.conf - now >= 0.1) {
    lines.push(`The scouts' read on your game has changed: you play like a ${best.name.toLowerCase()} now (${Math.round(best.conf * 100)}% match), not a ${p.archetype.toLowerCase()}.`);
    p.archetype = best.name;
  }
  const rare = fits[0].rare ? fits[0] : null;
  if (rare && !p.anomaly && rare.conf >= 0.35) {
    p.anomaly = rare.name;
    lines.push(`Something unusual: your game has grown into a rare mold. Scouts call you a ${rare.name.toLowerCase()}.`);
  }
  return lines.join(' ');
}
