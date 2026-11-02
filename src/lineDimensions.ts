/** Garden path and fence widths are measured, not visual stroke presets. */
export const MIN_LINE_WIDTH_M = 0.05;
export const MAX_LINE_WIDTH_M = 12;
export const MIN_LINE_LENGTH_M = 0.05;
export const LINE_WIDTH_PRESETS_M = [0.1, 0.25, 0.5, 1, 2] as const;

/** Thin lines need a small relative outline, not an additional fixed 4px border. */
export function lineRenderWidths(widthM: number, pixelsPerMetre: number) {
  const interior = widthM * pixelsPerMetre;
  return { interior, outline: interior + Math.min(4, Math.max(1, interior)) };
}
