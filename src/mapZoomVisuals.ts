/** Presentation-only zoom compensation. All values are SVG world pixels. */
const safeZoom = (zoom: number) => Number.isFinite(zoom) && zoom > 0 ? Math.max(0.06, zoom) : 1;

/** Keep selected outlines and their dash rhythm readable across phone/desktop zooms. */
export function selectionZoomPaint(zoom: number) {
  const z = safeZoom(zoom);
  return {
    offset: Math.min(25, 6 / z),
    strokeWidth: Math.min(20, 2.5 / z),
    groupDash: `${5 / z} ${5 / z}`,
    multipleDash: `${3 / z} ${3 / z}`,
    focusedDash: `${7 / z} ${4 / z}`,
    labelScale: 1 / z,
    // At overview zoom a label cannot be read; the existing selection bar remains available.
    showLabel: z >= 0.45,
  };
}

/** A dashed hairline is an *indicator*, not an enlargement of the measured line stroke. */
export function narrowLineGuide(widthM: number, pixelsPerMetre: number, zoom: number) {
  const z = safeZoom(zoom);
  if (!Number.isFinite(widthM) || widthM <= 0 || !Number.isFinite(pixelsPerMetre) || pixelsPerMetre <= 0) return null;
  return widthM * pixelsPerMetre * z < 1.25 ? {
    strokeWidth: 1.25 / z,
    dash: `${4 / z} ${5 / z}`,
  } : null;
}
