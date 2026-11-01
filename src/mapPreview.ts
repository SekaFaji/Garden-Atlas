import type { Garden, Point } from './model.ts';

export interface ObjectDragPreview {
  id: string;
  point: Point;
  together: boolean;
  many?: readonly string[];
}

/** Pure translation calculation for drag previews. Never writes into saved garden geometry. */
export function objectPreviewTranslation(garden: Garden, preview: ObjectDragPreview | null) {
  if (!preview) return { dx: 0, dy: 0, companions: [] as readonly string[] };
  const anchor = garden.objects.find(item => item.id === preview.id);
  const companions = preview.many ?? (preview.together
    ? garden.objects.filter(item => item.groupId && item.groupId === anchor?.groupId).map(item => item.id)
    : []);
  return {
    dx: anchor?.position ? preview.point.x - anchor.position.x : 0,
    dy: anchor?.position ? preview.point.y - anchor.position.y : 0,
    companions,
  };
}
