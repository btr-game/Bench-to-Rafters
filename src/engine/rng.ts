// Seeded PRNG (mulberry32). The state lives inside GameState as a plain object,
// so a saved game resumes the exact same random stream.

export interface Rng {
  s: number;
}

export function makeRng(seed: number): Rng {
  return { s: seed >>> 0 };
}

export function next(r: Rng): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const range = (r: Rng, a: number, b: number): number => a + next(r) * (b - a);
export const int = (r: Rng, a: number, b: number): number => Math.floor(range(r, a, b + 1));
export const chance = (r: Rng, p: number): boolean => next(r) < p;

export function normal(r: Rng, mean = 0, sd = 1): number {
  let u = 0;
  while (u === 0) u = next(r);
  const v = next(r);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function poisson(r: Rng, lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.max(0, Math.round(normal(r, lambda, Math.sqrt(lambda))));
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= next(r);
  } while (p > L);
  return k - 1;
}

export function binomial(r: Rng, n: number, p: number): number {
  if (n <= 0 || p <= 0) return 0;
  if (p >= 1) return n;
  if (n > 40) {
    const m = n * p;
    const sd = Math.sqrt(n * p * (1 - p));
    return Math.max(0, Math.min(n, Math.round(normal(r, m, sd))));
  }
  let k = 0;
  for (let i = 0; i < n; i++) if (next(r) < p) k++;
  return k;
}

export function pick<T>(r: Rng, arr: readonly T[]): T {
  return arr[Math.floor(next(r) * arr.length)];
}

export function shuffle<T>(r: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next(r) * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/** Pick an index with probability proportional to its weight. */
export function weightedIndex(r: Rng, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) return Math.floor(next(r) * weights.length);
  let x = next(r) * total;
  for (let i = 0; i < weights.length; i++) {
    x -= Math.max(0, weights[i]);
    if (x <= 0) return i;
  }
  return weights.length - 1;
}

export const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
export const logistic = (x: number): number => 1 / (1 + Math.exp(-x));
