import { CAP, MARKET_AGE_DROP, MARKET_CURVE, MAX_SHARE, MIN_SALARY, ROOKIE_SCALE_30, ROOKIE_SCALE_TOP } from '../balance';
import type { RoleKey } from '../types';

export const BASE_YEAR = 2026;

export const capFor = (year: number): number => CAP.start * Math.pow(1 + CAP.inflation, Math.max(0, year - BASE_YEAR));

function curve(ovr: number): number {
  const c = MARKET_CURVE;
  if (ovr <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) {
    if (ovr <= c[i][0]) {
      const [x0, y0] = c[i - 1];
      const [x1, y1] = c[i];
      return y0 + ((ovr - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return c[c.length - 1][1];
}

const ROLE_BUMP: Record<RoleKey, number> = { key: 1.1, starter: 1.05, sixth: 1, rotation: 0.95, bench: 0.85, deep: 0.8 };

/** Market value in $M per season (§12). */
export function marketValue(year: number, ovr: number, age: number, rep: number, role: RoleKey, service: number): number {
  const cap = capFor(year);
  const share = curve(ovr) * MARKET_AGE_DROP(age) * ROLE_BUMP[role] * (1 + rep / 400);
  const raw = cap * share;
  return Math.round(Math.min(cap * MAX_SHARE(service), Math.max(minSalary(year, service), raw)) * 10) / 10;
}

export const minSalary = (year: number, service: number): number =>
  Math.round(MIN_SALARY(service) * (capFor(year) / CAP.start) * 100) / 100;

export const maxSalary = (year: number, service: number): number => capFor(year) * MAX_SHARE(service);

/** First-round rookie scale, $13M at #1 down to $2.8M at #30 (§12). */
export function rookieScale(year: number, pick: number): number {
  const t = Math.min(1, Math.max(0, (pick - 1) / 29));
  const v = ROOKIE_SCALE_TOP * Math.pow(ROOKIE_SCALE_30 / ROOKIE_SCALE_TOP, t);
  return Math.round(v * (capFor(year) / CAP.start) * 10) / 10;
}

export function fmtMoney(m: number): string {
  // m is in $M
  if (m >= 1) return `$${m.toFixed(m >= 10 ? 1 : 2)}M`;
  if (m >= 0.001) return `$${Math.round(m * 1000)}K`;
  return `$${Math.round(m * 1_000_000)}`;
}
