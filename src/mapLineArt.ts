import type { Point } from './model';

/** Samples the drawn centerline without modifying saved vertices; a hard cap protects dense maps. */
export function fencePostPoints(points: readonly Point[], spacingM = 1.5, maxPosts = 32): Point[] {
  if (points.length < 2 || !Number.isFinite(spacingM) || spacingM <= 0 || !Number.isInteger(maxPosts) || maxPosts < 2) return [];
  const segments: { start: Point; end: Point; length: number }[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1], end = points[i];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (!Number.isFinite(length)) return [];
    if (length < 1e-8) continue;
    segments.push({ start, end, length });
    total += length;
  }
  if (!segments.length || !Number.isFinite(total)) return [];
  const count = Math.min(maxPosts, Math.max(2, Math.ceil(total / spacingM) + 1));
  const result: Point[] = [];
  let segmentIndex = 0, consumed = 0;
  for (let i = 0; i < count; i++) {
    const distance = i === count - 1 ? total : total * i / (count - 1);
    while (segmentIndex < segments.length - 1 && consumed + segments[segmentIndex].length < distance) {
      consumed += segments[segmentIndex].length;
      segmentIndex++;
    }
    const segment = segments[segmentIndex];
    const t = Math.min(1, Math.max(0, (distance - consumed) / segment.length));
    result.push({ x: segment.start.x + (segment.end.x - segment.start.x) * t,
      y: segment.start.y + (segment.end.y - segment.start.y) * t });
  }
  return result;
}

/** Decorative posts never widen the rail and are omitted for very thin fences. */
export function fencePostSize(widthM: number, pixelsPerMetre: number): number {
  if (widthM < 0.2 || !Number.isFinite(widthM) || !Number.isFinite(pixelsPerMetre) || pixelsPerMetre <= 0) return 0;
  return Math.min(6, widthM * pixelsPerMetre * 0.85);
}
