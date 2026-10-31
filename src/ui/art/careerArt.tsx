// Round 27 (owner: "injuries, events, and some of levels and leagues have the exact same icon. i
// dont like that ... make them appear in the game as well"): which pixel icon each of them gets
// (eventIcons*.ts, careerIcons.ts), the injury badge whose edge colour is the severity, and the
// brand logo tile.

import type { CSSProperties } from 'react';
import type { Injury } from '../../engine/types';
import { Icon } from './Icon';

/** Lower case, anything else to single hyphens: "Knee sprain (MCL)" → "knee-sprain-mcl". */
const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const eventIcon = (id: string): string => `ev-${id}`;
export const injuryIcon = (name: string): string => `inj-${slug(name)}`;
export const levelIcon = (key: string): string => `lvl-${key}`;
export const leagueIcon = (key: string): string => `lg-${key}`;
export const brandIcon = (name: string): string => `brand-${slug(name)}`;

/** Severity colours, mild to season-ending (the catalog's old heart colours). */
export const SEV_COLOR: Record<Injury['key'], string> = { dtd: '#2F9E44', minor: '#E0A800', major: '#F76707', season: '#E03131' };
export const SEV_NAME: Record<Injury['key'], string> = { dtd: 'Day-to-day', minor: 'Minor', major: 'Major', season: 'Season-ending' };

/** An injury's icon on a tile whose edge says how bad it is. */
export function InjuryBadge({ name, sev, size = 28 }: { name: string; sev: Injury['key']; size?: number }) {
  return (
    <span className="inj-badge" style={{ ['--sev' as string]: SEV_COLOR[sev], width: size, height: size } as CSSProperties} title={`${name} · ${SEV_NAME[sev]}`}>
      <Icon name={injuryIcon(name)} size={Math.round(size * 0.78)} />
    </span>
  );
}

/** A brand's logo on a tile of its colour. */
export function BrandLogo({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  return (
    <span className="brand-logo" style={{ background: color, width: size, height: size } as CSSProperties} role="img" aria-label={`${name} logo`}>
      <Icon name={brandIcon(name)} size={Math.round(size * 0.8)} />
    </span>
  );
}
