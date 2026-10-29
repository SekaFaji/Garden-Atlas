import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Sprite } from './Sprite';
import {
  KINDS, GROUNDS, WORLD, clampPoint, demoGarden, emptyGarden, info, loadGarden, movePlaced, nextGroupId,
  addBoundaryCorner, moveBoundaryCorner, removeBoundaryCorner, polygonArea, loadRecoveryGarden,
  parseGarden, removeGroup, saveGarden,
  type Garden, type GardenObject, type Kind, type Mode, type Point,
} from './model';

type Drag = { id: string; pointerId: number; together: boolean };
type Tap = { pointerId: number; x: number; y: number };
const SIZE = { width: WORLD.width * WORLD.pixelsPerUnit, height: WORLD.height * WORLD.pixelsPerUnit };

function nextId(kind: Kind, objects: GardenObject[]): string {
  const prefix = kind.toUpperCase() + '-';
  const numbers = objects
    .filter(item => item.id.startsWith(prefix))
    .map(item => Number(item.id.slice(prefix.length)))
    .filter(Number.isInteger);
  let number = Math.max(0, ...numbers) + 1;
  while (objects.some(o => o.id === prefix + String(number).padStart(3, '0'))) number++;
  return prefix + String(number).padStart(3, '0');
}

function PixelIcon({ kind, size = 34 }: { kind: Kind; size?: number }) {
  return <svg className="pixel-icon" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <Sprite kind={kind} />
  </svg>;
}

function MapCanvas({ garden, mode, selectedId, selectedGroupId, tool, zoom, moving, editingBoundary, selectedCorner,
  onPick, onPlace, onMove, onMoveCorner, onCornerPick }: {
  garden: Garden;
  mode: Mode;
  selectedId: string | null;
  selectedGroupId: string | null;
  tool: Kind | null;
  zoom: number;
  moving: { id: string; together: boolean } | null;
  editingBoundary: boolean;
  selectedCorner: number | null;
  onPick: (id: string | null) => void;
  onPlace: (point: Point) => void;
  onMove: (id: string, point: Point, together: boolean) => void;
  onMoveCorner: (index: number, point: Point) => void;
  onCornerPick: (index: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const tapRef = useRef<Tap | null>(null);
  const layout = garden.layouts[mode];
  const toPoint = (event: ReactPointerEvent<SVGSVGElement>): Point | null => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    const local = p.matrixTransform(matrix.inverse());
    const step = mode === 'scale' ? 0.5 : 0.25;
    return clampPoint({
      x: Math.round(local.x / WORLD.pixelsPerUnit / step) * step,
      y: Math.round(local.y / WORLD.pixelsPerUnit / step) * step,
    });
  };
  const pointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    tapRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const pointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    const point = toPoint(event);
    if (point) onMove(dragRef.current.id, point, dragRef.current.together);
  };
  const pointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      tapRef.current = null;
      return;
    }
    const tap = tapRef.current;
    tapRef.current = null;
    // Taps act only after pointer-up; normal touch scrolling cannot accidentally add/move objects.
    if (!tap || tap.pointerId !== event.pointerId || Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 9) return;
    const point = toPoint(event);
    if (!point) return;
    if (editingBoundary) {
      if (selectedCorner !== null) onMoveCorner(selectedCorner, point);
    } else if (tool) onPlace(point);
    else if (moving) onMove(moving.id, point, moving.together);
    else onPick(null);
  };
  const stopPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    tapRef.current = null;
  };
  const grid = Array.from({ length: WORLD.width + 1 }, (_, i) => i);
  const rows = Array.from({ length: WORLD.height + 1 }, (_, i) => i);
  const polygon = layout.boundary.map(p => `${p.x * 20},${p.y * 20}`).join(' ');
  const glints = Array.from({ length: 70 }, (_, i) => ({ x: (i * 137 + 29) % SIZE.width, y: (i * 83 + 17) % SIZE.height }));
  const terrainColors = { grass: '#93bd7e', soil: '#a47d57', gravel: '#aeb3a3', stone: '#b6b9af' };
  const fill = terrainColors[layout.ground];
  return <div className="map-scroll" aria-label={`${mode} garden map`}>
    <svg
      ref={svgRef}
      className={`garden-map ${tool || moving || editingBoundary ? 'placing' : ''}`}
      viewBox={`0 0 ${SIZE.width} ${SIZE.height}`}
      style={{ width: `${zoom}%` }}
      role="group"
      aria-label={`${mode} map; tap a tree to select, use MOVE then tap a new position; use OUTLINE to edit garden corners`}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={stopPointer}
    >
      <defs>
        <pattern id="terrain" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill={fill} />
          <rect x="3" y="7" width="5" height="4" fill={layout.ground === 'grass' ? '#80b171' : '#ffffff'} opacity=".22" />
          <rect x="26" y="28" width="5" height="5" fill="#1f3228" opacity=".12" />
          <rect x="34" y="12" width="3" height="5" fill="#ffffff" opacity=".15" />
        </pattern>
        <clipPath id="garden-plot"><polygon points={polygon}/></clipPath>
      </defs>
      <rect width={SIZE.width} height={SIZE.height} fill="#304238" />
      <polygon points={polygon} fill="url(#terrain)" />
      <g clipPath="url(#garden-plot)" pointerEvents="none">
        {mode === 'illustration' && <>
          <path d="M90 520 L90 380 L115 345 L132 309 L150 276 L163 241" fill="none" stroke="#d4b88c" strokeWidth="46" strokeLinecap="square" strokeLinejoin="bevel" opacity=".8" />
          <path d="M90 520 L90 380 L115 345 L132 309 L150 276 L163 241" fill="none" stroke="#e1cca2" strokeWidth="34" strokeLinecap="square" strokeLinejoin="bevel" />
          {layout.ground === 'grass' && glints.map((p, i) => <rect key={i} x={p.x} y={p.y} width={i % 4 === 0 ? 6 : 3} height="3" fill={i % 3 === 0 ? '#b6d88b' : '#75ac64'} opacity=".7" />)}
        </>}
        {mode === 'scale' && <g aria-hidden="true">
          {grid.map(x => <line key={`x${x}`} x1={x * 20} y1="0" x2={x * 20} y2={SIZE.height} stroke="#35584a" opacity={x % 5 === 0 ? '.6' : '.35'} strokeWidth={x % 5 === 0 ? 1.7 : 1} />)}
          {rows.map(y => <line key={`y${y}`} x1="0" y1={y * 20} x2={SIZE.width} y2={y * 20} stroke="#35584a" opacity={y % 5 === 0 ? '.6' : '.35'} strokeWidth={y % 5 === 0 ? 1.7 : 1} />)}
          {grid.filter(x => x > 0 && x % 5 === 0).map(x => <text key={x} x={x * 20 + 4} y="15" fill="#28483a" fontSize="11" fontFamily="monospace">{x}m</text>)}
        </g>}
      </g>
      <polygon points={polygon} fill="none" stroke="#f3e3a7" strokeWidth="4" strokeDasharray={mode === 'scale' ? '9 5' : undefined} pointerEvents="none" />
      {garden.objects.map(item => {
        const pos = item.placements[mode];
        if (!pos) return null;
        const groupSelected = Boolean(selectedGroupId && item.groupId === selectedGroupId);
        const selected = item.id === selectedId || groupSelected;
        const diameter = item.diameterM * WORLD.pixelsPerUnit * (mode === 'illustration' ? 1.05 : 1);
        return <g key={item.id} className={`map-object ${selected ? 'selected' : ''}`}
          transform={`translate(${pos.x * 20} ${pos.y * 20})`}
          onPointerDown={event => {
            event.stopPropagation();
            tapRef.current = null;
            if (editingBoundary || event.button !== 0) return;
            if (!groupSelected) onPick(item.id);
            // Direct dragging remains for mouse/pen. On touch, choose MOVE and tap the destination.
            if (event.pointerType !== 'touch' && !tool && !moving) {
              dragRef.current = { id: item.id, pointerId: event.pointerId, together: groupSelected };
              svgRef.current?.setPointerCapture(event.pointerId);
            }
          }}
        >
          {selected && <rect x={-diameter / 2 - 8} y={-diameter / 2 - 8} width={diameter + 16} height={diameter + 16} fill="none" stroke="#fff8c8" strokeWidth="3" strokeDasharray="8 5" pointerEvents="none" />}
          <svg x={-diameter / 2} y={-diameter / 2} width={diameter} height={diameter} viewBox="0 0 64 64" style={{ overflow: 'visible' }} pointerEvents="none"><Sprite kind={item.kind} /></svg>
          <rect x={-Math.max(42, diameter / 2)} y={-Math.max(42, diameter / 2)} width={Math.max(84, diameter)} height={Math.max(84, diameter)} fill="transparent" />
          {selected && <g pointerEvents="none">
            <rect x={-Math.min(108, item.name.length * 3.5 + 15)} y={diameter / 2 + 4} width={Math.min(216, item.name.length * 7 + 30)} height="25" fill="#213c33" stroke="#f4d995" strokeWidth="2" />
            <text x="0" y={diameter / 2 + 21} fill="#fff5d9" fontSize="12" textAnchor="middle" fontFamily="monospace">{item.name.slice(0, 27)}</text>
          </g>}
        </g>;
      })}
      {editingBoundary && layout.boundary.map((p, i) => <g key={i}
        transform={`translate(${p.x * 20} ${p.y * 20})`}
        onPointerDown={event => { event.stopPropagation(); tapRef.current = null; onCornerPick(i); }}>
        <rect x="-23" y="-23" width="46" height="46" fill="transparent" />
        <rect x="-11" y="-11" width="22" height="22" fill={selectedCorner === i ? '#ffe49b' : '#233f33'} stroke="#fff2ca" strokeWidth="3" pointerEvents="none" />
        <text x="0" y="4" textAnchor="middle" fontFamily="monospace" fontSize="11" fontWeight="bold" fill={selectedCorner === i ? '#243f33' : '#fff2ca'} pointerEvents="none">{i + 1}</text>
      </g>)}
      {mode === 'scale' && <g transform={`translate(18 ${SIZE.height - 23})`} pointerEvents="none">
        <rect x="-5" y="-24" width="128" height="34" fill="#fff8da" opacity=".92" />
        <path d="M0 0H100M0 -5V5M100 -5V5" stroke="#27493b" strokeWidth="3" />
        <text x="50" y="-9" textAnchor="middle" fill="#27493b" fontSize="12" fontFamily="monospace">5 metres</text>
      </g>}
    </svg>
  </div>;
}

export default function App() {
  const [garden, setGarden] = useState<Garden>(loadGarden);
  const [mode, setMode] = useState<Mode>('illustration');
  const [tool, setTool] = useState<Kind | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>('TREE-001');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [zoom, setZoom] = useState(100);
  const [moving, setMoving] = useState<{ id: string; together: boolean } | null>(null);
  const [editingBoundary, setEditingBoundary] = useState(false);
  const [selectedCorner, setSelectedCorner] = useState<number | null>(null);
  const [saved, setSaved] = useState(true);
  const [notice, setNotice] = useState('Sample garden loaded. This is not your actual property.');
  const fileRef = useRef<HTMLInputElement>(null);
  const selected = garden.objects.find(item => item.id === selectedId) ?? null;
  const selectedGroup = garden.groups.find(group => group.id === selectedGroupId) ?? null;
  const selectObject = (id: string | null) => { setSelectedId(id); setSelectedGroupId(null); if (moving && moving.id !== id) setMoving(null); };
  const selectGroup = (id: string) => { setSelectedGroupId(id); setSelectedId(null); setTool(null); setMoving(null); };

  useEffect(() => { setSaved(saveGarden(garden)); }, [garden]);
  const updateObject = (id: string, patch: Partial<GardenObject>) => {
    setGarden(old => ({ ...old, objects: old.objects.map(o => o.id === id ? { ...o, ...patch } : o) }));
  };
  const moveObject = (id: string, point: Point, together = false) => {
    setGarden(old => movePlaced(old, id, mode, point, together));
    if (moving) { setMoving(null); setNotice('Position updated in this map only. Saved automatically.'); }
  };
  const startMove = () => {
    const groupAnchor = selectedGroup && garden.objects.find(o => o.groupId === selectedGroup.id && o.placements[mode]);
    const id = selected?.id ?? groupAnchor?.id;
    if (!id) { setNotice('Select a placed object or a group with placed members first.'); return; }
    setMoving({ id, together: Boolean(selectedGroup) });
    setTool(null);
    setEditingBoundary(false);
    setNotice('MOVE MODE: tap any open spot on the map to reposition. Scroll normally or press Cancel.');
  };
  const setTerrain = (ground: Garden['layouts'][Mode]['ground']) => {
    setGarden(old => ({ ...old, layouts: { ...old.layouts, [mode]: { ...old.layouts[mode], ground } } }));
  };
  const toggleBoundary = () => {
    setEditingBoundary(!editingBoundary);
    setSelectedCorner(null);
    setTool(null);
    setMoving(null);
    setNotice(!editingBoundary ? 'OUTLINE MODE: choose a numbered corner, then tap its new position on the map.' : 'Outline editing closed.');
  };
  const shiftCorner = (index: number, point: Point) => {
    const changed = moveBoundaryCorner(garden, mode, index, point);
    if (!changed) { setNotice('Invalid outline: corners cannot cross, overlap or collapse. Nothing changed.'); return; }
    setGarden(changed);
    setNotice('Corner updated for the active map only.');
  };
  const addCorner = () => {
    const changed = addBoundaryCorner(garden, mode);
    if (!changed) { setNotice('Unable to add another corner.'); return; }
    setGarden(changed);
    setSelectedCorner(null);
    setNotice('New corner added on the longest edge. Select its number to position it.');
  };
  const deleteCorner = () => {
    if (selectedCorner === null) return;
    const changed = removeBoundaryCorner(garden, mode, selectedCorner);
    if (!changed) { setNotice('Keep at least three corners and a valid non-crossing outline.'); return; }
    setGarden(changed);
    setSelectedCorner(null);
    setNotice('Outline corner removed. Your objects are unchanged.');
  };
  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) { setNotice('Enter a group name first.'); return; }
    if (garden.groups.some(g => g.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setNotice('A group with that name already exists.'); return;
    }
    if (garden.groups.length >= 1000) { setNotice('Maximum group count reached.'); return; }
    const id = nextGroupId(garden);
    setGarden(old => ({ ...old, groups: [...old.groups, { id, name, notes: '' }] }));
    selectGroup(id);
    setNewGroupName('');
    setNotice(`Created group “${name}”. Choose objects to assign to it.`);
  };
  const updateGroup = (id: string, patch: { name?: string; notes?: string }) => {
    setGarden(old => ({ ...old, groups: old.groups.map(g => g.id === id ? { ...g, ...patch } : g) }));
  };
  const deleteGroup = () => {
    if (!selectedGroup || !window.confirm(`Delete group “${selectedGroup.name}”? Its members will be ungrouped, not deleted.`)) return;
    setGarden(old => removeGroup(old, selectedGroup.id));
    setSelectedGroupId(null);
    setNotice('Group deleted. All its objects and map placements were preserved.');
  };
  const addObject = (point: Point) => {
    if (!tool) return;
    const kind = info(tool);
    const id = nextId(tool, garden.objects);
    const object: GardenObject = {
      id, kind: tool, name: kind.initialName, diameterM: kind.diameterM,
      groupId: null, species: '', notes: '', placements: { [mode]: point },
    };
    setGarden(old => ({ ...old, objects: [...old.objects, object] }));
    selectObject(id);
    setTool(null);
    setNotice(`${kind.label} placed in ${mode} map. The other map's position remains independent.`);
  };
  const removeObject = () => {
    if (!selected || !window.confirm(`Delete ${selected.name} from both maps and its shared record?`)) return;
    setGarden(old => ({ ...old, objects: old.objects.filter(o => o.id !== selected.id) }));
    setSelectedId(null);
    setNotice('Object deleted from shared records.');
  };
  const newGarden = () => {
    if (!window.confirm("Create an empty garden and replace this browser\'s current project? Export a JSON backup first.")) return;
    setGarden(emptyGarden());
    selectObject(null);
    setTool(null); setMoving(null); setEditingBoundary(false);
    setNotice('Empty garden created. Rename it and draw your own outline.');
  };
  const recover = () => {
    const backup = loadRecoveryGarden();
    if (!backup) { setNotice('No previous local save is available to restore.'); return; }
    if (!window.confirm('Restore the previous local recovery snapshot? This replaces your current garden. Export a backup first.')) return;
    setGarden(backup);
    selectObject(null); setMoving(null); setEditingBoundary(false);
    setNotice('Previous local snapshot restored. Export a new JSON backup for safety.');
  };
  const reset = () => {
    if (!window.confirm('Replace this garden with the sample garden? Export a backup first if needed.')) return;
    setGarden(demoGarden());
    selectObject('TREE-001');
    setTool(null);
    setNotice('Demo restored. Your previous local changes were replaced.');
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(garden, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `garden-atlas-${garden.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 35) || 'garden'}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('JSON backup exported. Keep it somewhere safe.');
  };
  const importJSON = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2_000_000) { setNotice('Import failed: file exceeds 2 MB.'); return; }
    try {
      const imported: unknown = JSON.parse(await file.text());
      const parsed = parseGarden(imported);
      if (!parsed) throw new Error('Unsupported or invalid Garden Atlas file');
      if (!window.confirm('Replace current garden with imported data? Export a backup first if needed.')) return;
      setGarden(parsed);
      selectObject(null);
      setTool(null); setMoving(null); setEditingBoundary(false);
      setNotice('Garden imported and automatically saved in this browser.');
    } catch { setNotice('Import failed: invalid or unsupported Garden Atlas JSON.'); }
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-icon">✿</div><div><div className="brand-name">GARDEN <span>ATLAS</span></div><div className="brand-caption">PIXEL GARDEN EDITOR <span className="version">P003</span></div></div></div>
      <div className="top-actions">
        <span className={`save-status ${saved ? '' : 'danger'}`}><span className="status-dot" /> {saved ? 'LOCAL SAVE' : 'NOT SAVED'}</span>
        <button className="btn btn-muted" onClick={() => fileRef.current?.click()} title="Import a previously exported garden backup">↑ IMPORT</button>
        <button className="btn btn-highlight" onClick={exportJSON} title="Export garden JSON backup">↓ BACKUP</button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importJSON} />
      </div>
    </header>

    <main className="workspace">
      <aside className="panel library-panel">
        <div className="section-heading"><span>01 / TOOLBOX</span><span className="keycap">ADD</span></div>
        <p className="panel-hint">Choose an item, then tap the map to place it. Select an item and choose MOVE to reposition on mobile.</p>
        <div className="palette-grid">
          {KINDS.map(entry => <button key={entry.kind} className={`palette-item ${tool === entry.kind ? 'active' : ''}`} onClick={() => { setTool(old => old === entry.kind ? null : entry.kind); setMoving(null); setEditingBoundary(false); }} aria-pressed={tool === entry.kind}>
            <PixelIcon kind={entry.kind} /><span>{entry.label}</span>
          </button>)}
        </div>
        <div className="section-heading list-heading"><span>02 / GARDEN ITEMS</span><span className="pill">{garden.objects.length}</span></div>
        <div className="item-list">
          {garden.objects.map(o => <button key={o.id} className={`object-entry ${selectedId === o.id ? 'active' : ''}`} onClick={() => { selectObject(o.id); setTool(null); }}>
            <PixelIcon kind={o.kind} size={29} /><span className="object-title">{o.name}<small>{o.id}{o.groupId && <> · {garden.groups.find(g => g.id === o.groupId)?.name}</>}</small></span><span className="presence">{o.placements[mode] ? '●' : '○'}</span>
          </button>)}
        </div>
        <p className="library-footnote">● placed on this map &nbsp; ○ unplaced</p>
        <div className="section-heading list-heading"><span>03 / GROUPS</span><span className="pill">{garden.groups.length}</span></div>
        <p className="panel-hint">Select a group to edit it. Select a group, then press MOVE GROUP above the map. Mouse users can also drag highlighted members.</p>
        <div className="group-create">
          <input aria-label="New group name" maxLength={120} placeholder="New group name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createGroup(); }} />
          <button className="btn btn-highlight" onClick={createGroup} disabled={!newGroupName.trim()}>+ ADD</button>
        </div>
        <div className="group-list">
          {garden.groups.map(group => <button key={group.id} className={`group-entry ${selectedGroupId === group.id ? 'active' : ''}`} onClick={() => selectGroup(group.id)} aria-pressed={selectedGroupId === group.id}>
            <span className="group-symbol">▦</span><span className="group-title">{group.name}<small>{group.id}</small></span>
            <span className="group-count">{garden.objects.filter(o => o.groupId === group.id).length}</span>
          </button>)}
        </div>
      </aside>

      <section className="editor-column">
        <div className="editor-top">
          <div><div className="eyebrow">CURRENT PROJECT</div><input className="garden-name" aria-label="Garden name" maxLength={80} value={garden.name} onChange={e => setGarden(old => ({ ...old, name: e.target.value }))} /></div>
          <div className="mode-switch" role="group" aria-label="Map mode">
            <button className={mode === 'illustration' ? 'on' : ''} onClick={() => { setMode('illustration'); setTool(null); setMoving(null); setEditingBoundary(false); setSelectedCorner(null); }}>✦ ILLUSTRATION</button>
            <button className={mode === 'scale' ? 'on' : ''} onClick={() => { setMode('scale'); setTool(null); setMoving(null); setEditingBoundary(false); setSelectedCorner(null); }}>▦ SCALE</button>
          </div>
        </div>
        <div className="map-frame">
          <div className="map-toolbar"><span><span className="live-dot" /> {mode === 'scale' ? 'SCALE · 40 × 26 M WORKSPACE' : 'ILLUSTRATED MAP · FREEFORM'}</span><span>PIXEL VIEW / TOP DOWN</span></div>
          <div className="map-edit-controls" role="toolbar" aria-label="Map editing tools">
            <button className={`btn btn-muted ${moving ? 'active' : ''}`} onClick={moving ? () => setMoving(null) : startMove} disabled={!moving && !selected && !selectedGroup}> {moving ? '✕ CANCEL MOVE' : selectedGroup ? '↗ MOVE GROUP' : '↗ MOVE SELECTED'} </button>
            <button className={`btn btn-muted ${editingBoundary ? 'active' : ''}`} onClick={toggleBoundary}>▱ {editingBoundary ? 'DONE OUTLINE' : 'EDIT OUTLINE'}</button>
            <label className="terrain-label">GROUND <select aria-label="Garden ground style" value={garden.layouts[mode].ground} onChange={e => setTerrain(e.target.value as Garden['layouts'][Mode]['ground'])}>
              {GROUNDS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select></label>
          </div>
          {editingBoundary && <div className="outline-controls">
            <span>{garden.layouts[mode].boundary.length} corners · {mode === 'scale' ? `${polygonArea(garden.layouts.scale.boundary).toFixed(1)} m² approximate plan area` : 'freeform layout'}</span>
            <button className="btn btn-muted" onClick={addCorner}>+ CORNER</button>
            <button className="btn btn-muted" disabled={selectedCorner === null} onClick={deleteCorner}>− CORNER</button>
          </div>}
          <MapCanvas garden={garden} mode={mode} selectedId={selectedId} selectedGroupId={selectedGroupId}
            tool={tool} zoom={zoom} moving={moving} editingBoundary={editingBoundary} selectedCorner={selectedCorner}
            onPick={selectObject} onPlace={addObject} onMove={moveObject} onMoveCorner={shiftCorner} onCornerPick={setSelectedCorner} />
          <div className="map-bottom"><span>{editingBoundary ? selectedCorner === null ? 'TAP A NUMBERED CORNER TO EDIT' : `CORNER ${selectedCorner + 1} · TAP ITS NEW LOCATION` : moving ? 'TAP MAP TO MOVE · SCROLLING WILL NOT MOVE ITEMS' : tool ? `PLACE ${info(tool).label.toUpperCase()} · TAP MAP` : 'TAP TO SELECT · CHOOSE MOVE TO REPOSITION · MOUSE DRAG SUPPORTED'}</span><div className="zoom-controls"><button aria-label="Zoom out" onClick={() => setZoom(x => Math.max(75, x - 25))}>−</button><span>{zoom}%</span><button aria-label="Zoom in" onClick={() => setZoom(x => Math.min(250, x + 25))}>+</button></div></div>
        </div>
        <div className="status-message" role="status"><span>✦</span> {notice}</div>
        <div className="feature-strip"><span>■ OFFLINE FIRST</span><span>■ SEPARATE MAP POSITIONS</span><span>■ YOUR LOCAL BACKUPS</span></div>
      </section>

      <aside className="panel details-panel">
        <div className="section-heading"><span>04 / INSPECTOR</span><span className="keycap">EDIT</span></div>
        {selected ? <>
          <div className="selected-preview"><div className="preview-art"><PixelIcon kind={selected.kind} size={88} /></div><div className="preview-id">{selected.id}</div><div className="preview-kind">{info(selected.kind).label.toUpperCase()} / SHARED RECORD</div></div>
          <div className="field"><label htmlFor="obj-name">DISPLAY NAME</label><input id="obj-name" maxLength={80} value={selected.name} onChange={e => updateObject(selected.id, { name: e.target.value })} /></div>
          <div className="field"><label htmlFor="obj-species">SPECIES / TYPE</label><input id="obj-species" maxLength={140} placeholder="Unknown / optional" value={selected.species} onChange={e => updateObject(selected.id, { species: e.target.value })} /></div>
          <div className="field"><label htmlFor="obj-group">GROUP</label><select id="obj-group" value={selected.groupId ?? ''} onChange={e => updateObject(selected.id, { groupId: e.target.value || null })}>
            <option value="">— UNGROUPED —</option>
            {garden.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select></div>
          <div className="field"><label htmlFor="obj-size">{mode === 'scale' ? 'DIAMETER / WIDTH (METRES)' : 'OBJECT SIZE (METRES · SHARED)'}</label><input id="obj-size" type="number" min="0.5" max="20" step="0.5" value={selected.diameterM} onChange={e => { const size = Number(e.target.value); if (Number.isFinite(size) && size >= 0.5 && size <= 20) updateObject(selected.id, { diameterM: size }); }} /></div>
          <div className="field"><label htmlFor="obj-notes">NOTES</label><textarea id="obj-notes" rows={3} maxLength={3000} placeholder="Observations, planting notes..." value={selected.notes} onChange={e => updateObject(selected.id, { notes: e.target.value })} /></div>
          <div className="placement-box"><div className="placement-title">{mode.toUpperCase()} PLACEMENT</div>{selected.placements[mode] ? <>
            <span> X: {selected.placements[mode]!.x.toFixed(1)} {mode === 'scale' ? 'm' : 'units'} / Y: {selected.placements[mode]!.y.toFixed(1)} {mode === 'scale' ? 'm' : 'units'}</span>
            <button className="btn btn-highlight" onClick={startMove}>↗ MOVE ON MAP</button>
            <button className="text-button" onClick={() => { const placements = { ...selected.placements }; delete placements[mode]; updateObject(selected.id, { placements }); }}>REMOVE FROM THIS MAP</button>
          </> : <><span>Not placed in this layout.</span><button className="btn btn-highlight place-button" onClick={() => moveObject(selected.id, { x: WORLD.width / 2, y: WORLD.height / 2 })}>PLACE AT CENTRE</button></>}</div>
          <button className="btn btn-danger delete-button" onClick={removeObject}>DELETE SHARED RECORD</button>
        </> : selectedGroup ? <>
          <div className="group-inspector-heading"><span className="group-inspector-icon">▦</span><div><strong>{selectedGroup.id}</strong><p>{garden.objects.filter(o => o.groupId === selectedGroup.id).length} linked object(s)</p></div></div>
          <div className="field"><label htmlFor="group-name">GROUP NAME</label><input id="group-name" maxLength={120} value={selectedGroup.name} onChange={e => { if (e.target.value.trim()) updateGroup(selectedGroup.id, { name: e.target.value }); }} /></div>
          <div className="field"><label htmlFor="group-notes">GROUP NOTES</label><textarea id="group-notes" rows={4} maxLength={3000} value={selectedGroup.notes} placeholder="Common care notes, purpose, location..." onChange={e => updateGroup(selectedGroup.id, { notes: e.target.value })} /></div>
          <div className="placement-box"><div className="placement-title">GROUP MOVEMENT</div><span>Use MOVE GROUP above the map, then tap the destination. The other map stays unchanged.</span></div>
          <div className="group-members"><div className="placement-title">MEMBERS</div>
            {garden.objects.filter(o => o.groupId === selectedGroup.id).map(o => <button key={o.id} className="member-button" onClick={() => selectObject(o.id)}><PixelIcon kind={o.kind} size={26}/><span>{o.name}</span><span>›</span></button>)}
            {!garden.objects.some(o => o.groupId === selectedGroup.id) && <p className="panel-hint">No members yet. Select a garden item and assign it using its GROUP field.</p>}
          </div>
          <button className="btn btn-danger delete-button" onClick={deleteGroup}>DELETE GROUP · KEEP OBJECTS</button>
        </> : <div className="empty-inspector"><div className="empty-art">✦</div><strong>NO ITEM SELECTED</strong><p>Tap a tree, shrub, flower, bed or structure to edit its shared record.</p></div>}
        <div className="side-bottom">
          <div className="garden-file-actions">
            <button className="btn btn-muted" onClick={newGarden}>+ EMPTY GARDEN</button>
            <button className="btn btn-muted" onClick={recover}>↶ RECOVER PREVIOUS</button>
          </div>
          <button className="text-button" onClick={reset}>↺ RESET SAMPLE GARDEN</button>
          <p>Your edits save automatically in this browser. Download JSON backups to transfer gardens between devices or protect against browser data clearing. No accounts or cloud sync.</p>
        </div>
      </aside>
    </main>
    <footer className="footer">GARDEN ATLAS / P003 · PIXEL GARDEN EDITOR <span>FUTURE: DRAW TOOLS · LAYERS · PLANT ENCYCLOPEDIA · PDF BOOK</span></footer>
  </div>;
}
