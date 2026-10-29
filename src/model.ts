/** Shared garden records; layout coordinates are independent in each editor mode. */
export type Mode = 'scale' | 'illustration';
export type Kind = 'tree' | 'shrub' | 'flower' | 'bed' | 'house';
export interface Point { x: number; y: number }
export interface GardenObject {
  id: string;
  kind: Kind;
  name: string;
  species: string;
  group: string;
  notes: string;
  diameterM: number;
  placements: Partial<Record<Mode, Point>>;
}
export interface Garden {
  version: 1;
  name: string;
  objects: GardenObject[];
}

// Scale map: one SVG world unit represents one metre. Illustration uses its own freeform units.
export const WORLD = { width: 40, height: 26, pixelsPerUnit: 20 } as const;
export const KINDS: { kind: Kind; label: string; initialName: string; diameterM: number }[] = [
  { kind: 'tree', label: 'Tree', initialName: 'New tree', diameterM: 3.8 },
  { kind: 'shrub', label: 'Shrub', initialName: 'New shrub', diameterM: 2 },
  { kind: 'flower', label: 'Flowers', initialName: 'Flower patch', diameterM: 1.6 },
  { kind: 'bed', label: 'Garden bed', initialName: 'Garden bed', diameterM: 4 },
  { kind: 'house', label: 'Structure', initialName: 'Structure', diameterM: 5 },
];
export const info = (kind: Kind) => KINDS.find(item => item.kind === kind)!;
const STORAGE_KEY = 'garden-atlas:p001:v1';

export function demoGarden(): Garden {
  return {
    version: 1,
    name: 'Sample Garden',
    objects: [
      { id: 'TREE-001', kind: 'tree', name: 'Old Oak', species: 'Quercus robur (example)', group: 'Back garden', notes: 'Example specimen, not a real property survey.', diameterM: 5.4, placements: { scale: { x: 29, y: 7 }, illustration: { x: 31, y: 8 } } },
      { id: 'TREE-002', kind: 'tree', name: 'Apple Tree', species: 'Malus domestica (example)', group: 'Orchard', notes: '', diameterM: 3.5, placements: { scale: { x: 9, y: 7 }, illustration: { x: 9, y: 6 } } },
      { id: 'SHRUB-001', kind: 'shrub', name: 'Entrance Hedge', species: '', group: 'Entrance', notes: '', diameterM: 2.3, placements: { scale: { x: 7, y: 19 }, illustration: { x: 5, y: 20 } } },
      { id: 'FLOWER-001', kind: 'flower', name: 'Wildflowers', species: '', group: 'Front garden', notes: '', diameterM: 2, placements: { scale: { x: 31, y: 19 }, illustration: { x: 32, y: 20 } } },
      { id: 'BED-001', kind: 'bed', name: 'Vegetable Patch', species: '', group: 'Kitchen garden', notes: '', diameterM: 4, placements: { scale: { x: 15, y: 8 }, illustration: { x: 18, y: 8 } } },
      { id: 'HOUSE-001', kind: 'house', name: 'House (demo)', species: '', group: 'Structures', notes: 'Illustrative object; no real address or parcel data.', diameterM: 7, placements: { scale: { x: 20, y: 19 }, illustration: { x: 21, y: 19 } } },
    ],
  };
}

export function clampPoint(p: Point): Point {
  return {
    x: Math.max(0, Math.min(WORLD.width, p.x)),
    y: Math.max(0, Math.min(WORLD.height, p.y)),
  };
}

const isText = (v: unknown): v is string => typeof v === 'string' && v.length <= 10000;
const isPoint = (v: unknown): v is Point => {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return typeof p.x === 'number' && Number.isFinite(p.x) && p.x >= 0 && p.x <= WORLD.width &&
    typeof p.y === 'number' && Number.isFinite(p.y) && p.y >= 0 && p.y <= WORLD.height;
};

/** Reject invalid imported JSON rather than allowing corrupted records into the editor. */
export function isGarden(value: unknown): value is Garden {
  if (typeof value !== 'object' || value === null) return false;
  const g = value as Record<string, unknown>;
  if (g.version !== 1 || !isText(g.name) || !Array.isArray(g.objects) || g.objects.length > 3000) return false;
  const ids = new Set<string>();
  return g.objects.every((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return false;
    const o = entry as Record<string, unknown>;
    if (!isText(o.id) || !o.id || ids.has(o.id)) return false;
    ids.add(o.id);
    if (!KINDS.some(k => k.kind === o.kind)) return false;
    if (![o.name, o.species, o.group, o.notes].every(isText)) return false;
    if (typeof o.diameterM !== 'number' || !Number.isFinite(o.diameterM) || o.diameterM < 0.5 || o.diameterM > 20) return false;
    if (typeof o.placements !== 'object' || o.placements === null) return false;
    const p = o.placements as Record<string, unknown>;
    return (p.scale === undefined || isPoint(p.scale)) &&
      (p.illustration === undefined || isPoint(p.illustration));
  });
}

export function loadGarden(): Garden {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (isGarden(value)) return value;
    }
  } catch { /* Private mode/storage disabled: continue in memory. */ }
  return demoGarden();
}
export function saveGarden(garden: Garden): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(garden));
    return true;
  } catch { return false; }
}
