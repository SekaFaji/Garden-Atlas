import type { Ground } from './model.ts';

/** Shared illustration and measured-map colors. No garden record changes. */
export const SURFACE_BASE: Record<Ground, string> = {
  grass: '#83ad72',
  soil: '#9e7956',
  gravel: '#a7aba1',
  stone: '#adb6ad',
  water: '#659cae',
};

/** Each ground uses its own tiled texture, including the default garden ground. */
export const surfacePatternFill = (ground: Ground): string => `url(#map-${ground})`;
