import { ATTRS, OVR_WEIGHTS } from '../balance';
import type { Attrs, Pos } from '../types';
import { ARCHETYPES } from './archetypes';

export function ovrOf(attrs: Attrs, pos: Pos): number {
  const w = OVR_WEIGHTS[pos];
  let s = 0;
  for (const k of ATTRS) s += attrs[k] * w[k];
  return Math.min(99, s);
}

/** Shape OVR of each archetype at its own position. */
const SHAPE_OVR: Record<Pos, number[]> = {
  PG: ARCHETYPES.PG.map((a) => ovrOf(a.attrs, 'PG')),
  SG: ARCHETYPES.SG.map((a) => ovrOf(a.attrs, 'SG')),
  SF: ARCHETYPES.SF.map((a) => ovrOf(a.attrs, 'SF')),
  PF: ARCHETYPES.PF.map((a) => ovrOf(a.attrs, 'PF')),
  C: ARCHETYPES.C.map((a) => ovrOf(a.attrs, 'C')),
};
export const shapeOvr = (pos: Pos, shape: number): number => SHAPE_OVR[pos][shape];

/**
 * Attributes of a generated player: the archetype shape shifted so the OVR matches.
 * OVR weights sum to 1, so adding d to every attribute adds d to OVR.
 */
export function genAttrs(pos: Pos, shape: number, ovr: number): Attrs {
  const base = ARCHETYPES[pos][shape].attrs;
  const d = ovr - shapeOvr(pos, shape);
  const out = {} as Attrs;
  for (const k of ATTRS) out[k] = Math.min(99, base[k] + d);
  return out;
}

export function genRange(pos: Pos, shape: number, ovr: number): number {
  return Math.min(95, ARCHETYPES[pos][shape].range + Math.max(0, ovr - 45) * 0.6);
}

export const fmtOvr = (x: number): number => Math.round(x);
