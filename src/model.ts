/** Shared records with independent Scale and Illustration placements. */
export type Mode = 'scale' | 'illustration';
export type Kind = 'tree' | 'shrub' | 'flower' | 'bed' | 'house';
export interface Point { x: number; y: number }
export interface GardenGroup { id: string; name: string; notes: string }
export interface GardenObject {
  id: string;
  kind: Kind;
  name: string;
  species: string;
  groupId: string | null;
  notes: string;
  diameterM: number;
  placements: Partial<Record<Mode, Point>>;
}
export type Ground = 'grass' | 'soil' | 'gravel' | 'stone';
export const GROUNDS: { value: Ground; label: string }[] = [
  { value: 'grass', label: 'Grass' }, { value: 'soil', label: 'Soil' },
  { value: 'gravel', label: 'Gravel' }, { value: 'stone', label: 'Stone' },
];
export interface MapLayout { boundary: Point[]; ground: Ground }
export interface Garden {
  version: 3;
  name: string;
  groups: GardenGroup[];
  objects: GardenObject[];
  layouts: Record<Mode, MapLayout>;
}
interface GardenV2 extends Omit<Garden, 'version' | 'layouts'> { version: 2 }
interface LegacyObject extends Omit<GardenObject, 'groupId'> { group: string }
interface LegacyGarden { version: 1; name: string; objects: LegacyObject[] }

// Scale map: 1 world unit = 1 metre; Illustration uses independent, freeform coordinates.
export const WORLD = { width: 40, height: 26, pixelsPerUnit: 20 } as const;
export const KINDS: { kind: Kind; label: string; initialName: string; diameterM: number }[] = [
  { kind: 'tree', label: 'Tree', initialName: 'New tree', diameterM: 3.8 },
  { kind: 'shrub', label: 'Shrub', initialName: 'New shrub', diameterM: 2 },
  { kind: 'flower', label: 'Flowers', initialName: 'Flower patch', diameterM: 1.6 },
  { kind: 'bed', label: 'Garden bed', initialName: 'Garden bed', diameterM: 4 },
  { kind: 'house', label: 'Structure', initialName: 'Structure', diameterM: 5 },
];
export const info = (kind: Kind) => KINDS.find(item => item.kind === kind)!;
const STORAGE_V1 = 'garden-atlas:p001:v1';
const STORAGE_V2 = 'garden-atlas:p002:v2';
const STORAGE_V3 = 'garden-atlas:p003:v3';
const STORAGE_RECOVERY = 'garden-atlas:p003:recovery';
const STORAGE_CHECKPOINT = 'garden-atlas:p003:checkpoint-time';

export function demoGarden(): Garden {
  return {
    version: 3, name: 'Sample Garden',
    layouts: defaultLayouts(),
    groups: [
      { id: 'GROUP-001', name: 'Back garden', notes: 'An example garden zone.' },
      { id: 'GROUP-002', name: 'Orchard', notes: '' },
      { id: 'GROUP-003', name: 'Entrance', notes: '' },
      { id: 'GROUP-004', name: 'Front garden', notes: '' },
      { id: 'GROUP-005', name: 'Kitchen garden', notes: '' },
      { id: 'GROUP-006', name: 'Structures', notes: '' },
    ],
    objects: [
      { id: 'TREE-001', kind: 'tree', name: 'Old Oak', species: 'Quercus robur (example)', groupId: 'GROUP-001', notes: 'Example specimen, not a real property survey.', diameterM: 5.4, placements: { scale: { x: 29, y: 7 }, illustration: { x: 31, y: 8 } } },
      { id: 'TREE-002', kind: 'tree', name: 'Apple Tree', species: 'Malus domestica (example)', groupId: 'GROUP-002', notes: '', diameterM: 3.5, placements: { scale: { x: 9, y: 7 }, illustration: { x: 9, y: 6 } } },
      { id: 'SHRUB-001', kind: 'shrub', name: 'Entrance Hedge', species: '', groupId: 'GROUP-003', notes: '', diameterM: 2.3, placements: { scale: { x: 7, y: 19 }, illustration: { x: 5, y: 20 } } },
      { id: 'FLOWER-001', kind: 'flower', name: 'Wildflowers', species: '', groupId: 'GROUP-004', notes: '', diameterM: 2, placements: { scale: { x: 31, y: 19 }, illustration: { x: 32, y: 20 } } },
      { id: 'BED-001', kind: 'bed', name: 'Vegetable Patch', species: '', groupId: 'GROUP-005', notes: '', diameterM: 4, placements: { scale: { x: 15, y: 8 }, illustration: { x: 18, y: 8 } } },
      { id: 'HOUSE-001', kind: 'house', name: 'House (demo)', species: '', groupId: 'GROUP-006', notes: 'Illustrative object; no real address or parcel data.', diameterM: 7, placements: { scale: { x: 20, y: 19 }, illustration: { x: 21, y: 19 } } },
    ],
  };
}

export function rectangleBoundary(): Point[] {
  return [{ x: 1, y: 1 }, { x: 39, y: 1 }, { x: 39, y: 25 }, { x: 1, y: 25 }];
}
export function defaultLayouts(): Record<Mode, MapLayout> {
  return {
    scale: { boundary: rectangleBoundary(), ground: 'grass' },
    illustration: { boundary: rectangleBoundary(), ground: 'grass' },
  };
}
function isBoundaryPoint(p: unknown): p is Point {
  if (!p || typeof p !== 'object') return false;
  const q = p as Record<string, unknown>;
  return typeof q.x === 'number' && Number.isFinite(q.x) && q.x >= 0 && q.x <= WORLD.width &&
    typeof q.y === 'number' && Number.isFinite(q.y) && q.y >= 0 && q.y <= WORLD.height;
}
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  const ab1 = cross(a, b, c), ab2 = cross(a, b, d);
  const cd1 = cross(c, d, a), cd2 = cross(c, d, b);
  const onSegment = (p: Point, q: Point, t: Point): boolean =>
    Math.abs(cross(p, q, t)) < 1e-9 &&
    t.x >= Math.min(p.x, q.x) - 1e-9 && t.x <= Math.max(p.x, q.x) + 1e-9 &&
    t.y >= Math.min(p.y, q.y) - 1e-9 && t.y <= Math.max(p.y, q.y) + 1e-9;
  if (onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b)) return true;
  return (ab1 > 0) !== (ab2 > 0) && (cd1 > 0) !== (cd2 > 0);
}
/** Simple, non-self-intersecting polygon on the current 40 × 26 editor canvas. */
export function validBoundary(value: unknown): value is Point[] {
  if (!Array.isArray(value) || value.length < 3 || value.length > 64 || !value.every(isBoundaryPoint)) return false;
  const points = value as Point[];
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.1) return false;
    twiceArea += a.x * b.y - b.x * a.y;
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      if (crosses(a, b, points[j], points[(j + 1) % points.length])) return false;
    }
  }
  return Math.abs(twiceArea) >= 2;
}
function validLayout(value: unknown): value is MapLayout {
  if (!value || typeof value !== 'object') return false;
  const layout = value as Record<string, unknown>;
  return GROUNDS.some(g => g.value === layout.ground) && validBoundary(layout.boundary);
}
export function polygonArea(points: Point[]): number {
  return Math.abs(points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length];
    return sum + p.x * next.y - next.x * p.y;
  }, 0)) / 2;
}

/** A blank local project; the public demo is never required as a starting point. */
export function emptyGarden(): Garden {
  return { version: 3, name: 'My Garden', groups: [], objects: [], layouts: defaultLayouts() };
}
/** Insert a new midpoint along the longest edge. Corners can then be moved to shape the plot. */
export function addBoundaryCorner(garden: Garden, mode: Mode): Garden | null {
  const boundary = garden.layouts[mode].boundary;
  if (boundary.length >= 32) return null;
  let longest = -1, edge = 0;
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i], b = boundary[(i + 1) % boundary.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length > longest) { longest = length; edge = i; }
  }
  if (longest < 0.2) return null;
  const a = boundary[edge], b = boundary[(edge + 1) % boundary.length];
  const next = [...boundary];
  next.splice(edge + 1, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  return validBoundary(next) ? { ...garden, layouts: { ...garden.layouts, [mode]: { ...garden.layouts[mode], boundary: next } } } : null;
}
/** Reject crossing or degenerate edits; never silently damage the saved outline. */
export function moveBoundaryCorner(garden: Garden, mode: Mode, index: number, point: Point): Garden | null {
  const boundary = garden.layouts[mode].boundary;
  if (!Number.isInteger(index) || index < 0 || index >= boundary.length) return null;
  const next = boundary.map((p, i) => i === index ? clampPoint(point) : p);
  if (!validBoundary(next)) return null;
  return { ...garden, layouts: { ...garden.layouts, [mode]: { ...garden.layouts[mode], boundary: next } } };
}
export function removeBoundaryCorner(garden: Garden, mode: Mode, index: number): Garden | null {
  const boundary = garden.layouts[mode].boundary;
  if (boundary.length <= 3 || !Number.isInteger(index) || index < 0 || index >= boundary.length) return null;
  const next = boundary.filter((_, i) => i !== index);
  if (!validBoundary(next)) return null;
  return { ...garden, layouts: { ...garden.layouts, [mode]: { ...garden.layouts[mode], boundary: next } } };
}

export function clampPoint(p: Point): Point {
  return { x: Math.max(0, Math.min(WORLD.width, p.x)), y: Math.max(0, Math.min(WORLD.height, p.y)) };
}
const isText = (v: unknown): v is string => typeof v === 'string' && v.length <= 10000;
const isPoint = (v: unknown): v is Point => {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return typeof p.x === 'number' && Number.isFinite(p.x) && p.x >= 0 && p.x <= WORLD.width &&
    typeof p.y === 'number' && Number.isFinite(p.y) && p.y >= 0 && p.y <= WORLD.height;
};
const validBaseObject = (o: Record<string, unknown>): boolean => {
  if (!isText(o.id) || !o.id || !KINDS.some(k => k.kind === o.kind)) return false;
  if (![o.name, o.species, o.notes].every(isText)) return false;
  if (typeof o.diameterM !== 'number' || !Number.isFinite(o.diameterM) || o.diameterM < 0.5 || o.diameterM > 20) return false;
  if (typeof o.placements !== 'object' || o.placements === null || Array.isArray(o.placements)) return false;
  const p = o.placements as Record<string, unknown>;
  return (p.scale === undefined || isPoint(p.scale)) && (p.illustration === undefined || isPoint(p.illustration));
};
function validObjects(items: unknown[], validate: (o: Record<string, unknown>) => boolean): boolean {
  const ids = new Set<string>();
  return items.every(entry => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return false;
    const o = entry as Record<string, unknown>;
    if (!validBaseObject(o) || ids.has(o.id as string) || !validate(o)) return false;
    ids.add(o.id as string);
    return true;
  });
}
function isLegacyGarden(value: unknown): value is LegacyGarden {
  if (typeof value !== 'object' || value === null) return false;
  const g = value as Record<string, unknown>;
  return g.version === 1 && isText(g.name) && Array.isArray(g.objects) && g.objects.length <= 3000 &&
    validObjects(g.objects, o => isText(o.group));
}
/** Verify existing shared records and groups in both P002 and P003 files. */
function validShared(value: Record<string, unknown>): boolean {
  if (!isText(value.name) || !Array.isArray(value.objects) || value.objects.length > 3000 ||
      !Array.isArray(value.groups) || value.groups.length > 1000) return false;
  const ids = new Set<string>();
  if (!value.groups.every((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return false;
    const gr = entry as Record<string, unknown>;
    if (!isText(gr.id) || !gr.id || ids.has(gr.id) || !isText(gr.name) || !gr.name.trim() || !isText(gr.notes)) return false;
    ids.add(gr.id);
    return true;
  })) return false;
  return validObjects(value.objects, o => o.groupId === null || typeof o.groupId === 'string' && ids.has(o.groupId));
}
function isGardenV2(value: unknown): value is GardenV2 {
  return !!value && typeof value === 'object' && (value as GardenV2).version === 2 &&
    validShared(value as Record<string, unknown>);
}
export function isGarden(value: unknown): value is Garden {
  if (!value || typeof value !== 'object') return false;
  const g = value as Record<string, unknown>;
  if (g.version !== 3 || !validShared(g) || !g.layouts || typeof g.layouts !== 'object') return false;
  const layouts = g.layouts as Record<string, unknown>;
  return validLayout(layouts.scale) && validLayout(layouts.illustration);
}
/** P001/P002 backups migrate forward without changing object IDs, groups or positions. */
export function parseGarden(value: unknown): Garden | null {
  if (isGarden(value)) return value;
  if (isGardenV2(value)) return { ...value, version: 3, layouts: defaultLayouts() };
  if (!isLegacyGarden(value)) return null;
  const groups: GardenGroup[] = [];
  const byName = new Map<string, string>();
  const objects: GardenObject[] = value.objects.map(o => {
    const trimmed = o.group.trim();
    const key = trimmed.toLocaleLowerCase();
    let groupId = trimmed ? (byName.get(key) ?? null) : null;
    if (trimmed && !groupId) {
      groupId = 'GROUP-' + String(groups.length + 1).padStart(3, '0');
      byName.set(key, groupId);
      groups.push({ id: groupId, name: trimmed, notes: '' });
    }
    return { id: o.id, kind: o.kind, name: o.name, species: o.species, groupId,
      notes: o.notes, diameterM: o.diameterM, placements: o.placements };
  });
  const upgraded: Garden = { version: 3, name: value.name, groups, objects, layouts: defaultLayouts() };
  return isGarden(upgraded) ? upgraded : null;
}
export function nextGroupId(garden: Garden): string {
  let n = 1;
  const existing = new Set(garden.groups.map(g => g.id));
  while (existing.has('GROUP-' + String(n).padStart(3, '0'))) n++;
  return 'GROUP-' + String(n).padStart(3, '0');
}
export function removeGroup(garden: Garden, id: string): Garden {
  return { ...garden, groups: garden.groups.filter(g => g.id !== id),
    objects: garden.objects.map(o => o.groupId === id ? { ...o, groupId: null } : o) };
}

/** Translate a whole group without changing relative spacing or the other map. */
export function movePlaced(garden: Garden, id: string, mode: Mode, requested: Point, together: boolean): Garden {
  const dragged = garden.objects.find(o => o.id === id);
  if (!dragged?.placements[mode]) {
    // Explicit first placement of an unplaced record only moves that one object.
    if (!dragged) return garden;
    return { ...garden, objects: garden.objects.map(o => o.id === id
      ? { ...o, placements: { ...o.placements, [mode]: clampPoint(requested) } } : o) };
  }
  const start = dragged.placements[mode];
  const members = together && dragged.groupId
    ? garden.objects.filter(o => o.groupId === dragged.groupId && o.placements[mode])
    : [dragged];
  const points = members.map(o => o.placements[mode]!);
  const bound = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const dx = bound(requested.x - start.x, -Math.min(...points.map(p => p.x)), WORLD.width - Math.max(...points.map(p => p.x)));
  const dy = bound(requested.y - start.y, -Math.min(...points.map(p => p.y)), WORLD.height - Math.max(...points.map(p => p.y)));
  const ids = new Set(members.map(o => o.id));
  return { ...garden, objects: garden.objects.map(o => {
    if (!ids.has(o.id)) return o;
    const p = o.placements[mode]!;
    return { ...o, placements: { ...o.placements, [mode]: { x: p.x + dx, y: p.y + dy } } };
  }) };
}

/** Each browser keeps its own garden. V1/V2 are retained for safe migration. */
export function loadGarden(): Garden {
  try {
    for (const key of [STORAGE_V3, STORAGE_RECOVERY, STORAGE_V2, STORAGE_V1]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = parseGarden(JSON.parse(raw) as unknown);
        if (parsed) return parsed;
      } catch { /* Try the next recovery source when an individual key is corrupt. */ }
    }
  } catch { /* Private mode or disabled storage: show the example in memory. */ }
  return demoGarden();
}
/** Keep a previous valid snapshot in the same browser as a limited recovery copy. */
export function saveGarden(garden: Garden): boolean {
  if (!isGarden(garden)) return false;
  try {
    const next = JSON.stringify(garden);
    const previous = localStorage.getItem(STORAGE_V3);
    if (previous && previous !== next) {
      try {
        const last = Number(localStorage.getItem(STORAGE_CHECKPOINT) || 0);
        if (Date.now() - last >= 60_000 && parseGarden(JSON.parse(previous) as unknown)) {
          localStorage.setItem(STORAGE_RECOVERY, previous);
          localStorage.setItem(STORAGE_CHECKPOINT, String(Date.now()));
        }
      } catch { /* A failed recovery copy must not prevent saving the current garden. */ }
    }
    localStorage.setItem(STORAGE_V3, next);
    return true;
  } catch { return false; }
}

/** Limited second local copy; it is not a substitute for user-downloaded backups. */
export function loadRecoveryGarden(): Garden | null {
  try {
    const raw = localStorage.getItem(STORAGE_RECOVERY);
    return raw ? parseGarden(JSON.parse(raw) as unknown) : null;
  } catch { return null; }
}
