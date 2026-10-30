import { WORLD, type Mode } from './model.ts';

/** Visual-only sizing: measured dimensions are never modified or rounded for drawing. */
export function mapObjectVisualSize(
  axes: {widthM:number;lengthM:number},
  mode: Mode,
  zoom: number,
): {width:number;length:number;hitWidth:number;hitLength:number} {
  const scale = WORLD.pixelsPerUnit * (mode === 'illustration' ? 1.08 : 1);
  const width = Math.max(.5, axes.widthM) * scale;
  const length = Math.max(.5, axes.lengthM) * scale;
  return {
    width, length,
    hitWidth: Math.max(width, 48 / Math.max(.06, zoom)),
    hitLength: Math.max(length, 48 / Math.max(.06, zoom)),
  };
}
