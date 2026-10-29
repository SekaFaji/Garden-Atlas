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
export interface Garden {
  version: 2;
  name: string;
  groups: GardenGroup[];
  objects: GardenObject[];
}
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

export function demoGarden(): Garden {
  return {
    version: 2, name: 'Sample Garden',
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
/** Verify records and group references before accepting an imported/saved garden. */
export function isGarden(value: unknown): value is Garden {
  if (typeof value !== 'object' || value === null) return false;
  const g = value as Record<string, unknown>;
  if (g.version !== 2 || !isText(g.name) || !Array.isArray(g.objects) || g.objects.length > 3000 ||
      !Array.isArray(g.groups) || g.groups.length > 1000) return false;
  const ids = new Set<string>();
  if (!g.groups.every((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return false;
    const gr = entry as Record<string, unknown>;
    if (!isText(gr.id) || !gr.id || ids.has(gr.id) || !isText(gr.name) || !gr.name.trim() || !isText(gr.notes)) return false;
    ids.add(gr.id);
    return true;
  })) return false;
  return validObjects(g.objects, o => (o.groupId === null || typeof o.groupId === 'string' && ids.has(o.groupId)));
}

/** Migrate P001 group labels to durable group IDs without changing any specimen or coordinates. */
export function parseGarden(value: unknown): Garden | null {
  if (isGarden(value)) return value;
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
    // Explicit properties avoid retaining legacy group labels in new backups.
    return { id: o.id, kind: o.kind, name: o.name, species: o.species, groupId,
      notes: o.notes, diameterM: o.diameterM, placements: o.placements };
  });
  const upgraded: Garden = { version: 2, name: value.name, groups, objects };
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

/** Save to a new key; P001 local data remains untouched as a safety backup. */
export function loadGarden(): Garden {
  try {
    const current = localStorage.getItem(STORAGE_V2);
    if (current) {
      const parsed = parseGarden(JSON.parse(current) as unknown);
      if (parsed) return parsed;
    }
    const legacy = localStorage.getItem(STORAGE_V1);
    if (legacy) {
      const parsed = parseGarden(JSON.parse(legacy) as unknown);
      if (parsed) return parsed;
    }
  } catch { /* Private mode or malformed storage: show the example in memory. */ }
  return demoGarden();
}
export function saveGarden(garden: Garden): boolean {
  if (!isGarden(garden)) return false;
  try { localStorage.setItem(STORAGE_V2, JSON.stringify(garden)); return true; }
  catch { return false; }
}
