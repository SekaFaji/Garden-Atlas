import type { Ref } from 'react';
import type { Garden, GardenObject } from '../model';
import { info, polygonArea } from '../model';
import { PRESETS, defaultPreset } from '../catalog';
import { ObjectIcon } from './ObjectIcon';
import { ObjectDimensions } from '../ObjectDimensions';
import { NameDraftInput } from '../NameDraftInput';
import { MetricDraftInput } from '../MetricDraftInput';
import { PlantAtlasPanel } from '../PlantAtlasPanel';

interface Props {
  panelRef: Ref<HTMLElement>;
  active: boolean;
  garden: Garden;
  selected: GardenObject | null;
  selectedGroup: Garden['groups'][number] | null;
  objectsLocked: boolean;
  onMap: () => void;
  onMapSettings: () => void;
  onNotice: (message: string) => void;
  onUpdateObject: (id: string, patch: Partial<GardenObject>, historyKey?: string) => void;
  onResizeObjectAxes: (id: string, axes: { widthM: number; lengthM: number }) => void;
  onPresetChange: (id: string, presetId: string) => void;
  onPlaceCenter: (id: string) => void;
  onDuplicate: () => void;
  onDeleteObject: () => void;
  onAtlasChange: (edit: (current: Garden) => Garden, historyKey?: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onGroupNotes: (id: string, notes: string) => void;
  onSelectObject: (id: string) => void;
  onDeleteGroup: (id: string) => void;
}

/** Inspector presentation only. App owns garden mutations, history and persistence. */
export function GardenInspector({ panelRef, active, garden, selected, selectedGroup, objectsLocked,
  onMap, onMapSettings, onNotice, onUpdateObject, onResizeObjectAxes, onPresetChange,
  onPlaceCenter, onDuplicate, onDeleteObject, onAtlasChange, onRenameGroup, onGroupNotes,
  onSelectObject, onDeleteGroup }: Props) {
  return (
      <aside ref={panelRef} className={`panel details-panel ${active ? 'mobile-active' : ''}`} aria-label="Garden item details">
        <div className="section-heading">06 / INSPECTOR</div>
        {selected?<>
          <div className="inspector-compact-header">
            <div className="inspector-compact-art"><ObjectIcon kind={selected.kind} presetId={selected.presetId} size={56}/></div>
            <div className="inspector-compact-title"><strong>{selected.name}</strong><span>{selected.id} · {info(selected.kind).label}</span></div>
            <button type="button" className="inspector-map-link" onClick={onMap} aria-label="Return to garden map">⌖ MAP</button>
          </div>
          <div className="inspector-core-fields">
            <label className="field inspector-name-field">DISPLAY NAME<NameDraftInput key={selected.id} label="Object name" value={selected.name} maxLength={80} allowEmpty disabled={objectsLocked} onCommit={name=>onUpdateObject(selected.id,{name})} onNotice={onNotice}/></label>
            <label className="field">SPECIES / TYPE<input maxLength={140} value={selected.species} disabled={objectsLocked} placeholder="Optional" onChange={e=>onUpdateObject(selected.id,{species:e.target.value},'species')}/></label>
            <label className="field">GROUP<select value={selected.groupId??''} disabled={objectsLocked} onChange={e=>onUpdateObject(selected.id,{groupId:e.target.value||null})}><option value="">— UNGROUPED —</option>{garden.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          </div>
          <div className="inspector-subheading">SIZE · METRES</div>
          <ObjectDimensions key={selected.id} object={selected} disabled={objectsLocked} onNotice={onNotice} onChange={axes=>onResizeObjectAxes(selected.id,axes)}/>
          <details key={`appearance-${selected.id}`} className="inspector-fold">
            <summary>APPEARANCE & ROTATION</summary>
            <div className="inspector-fold-body">
              <label className="field">PIXEL-ART APPEARANCE
                <select value={selected.presetId??defaultPreset(selected.kind).id} disabled={objectsLocked}
                  onChange={e=>onPresetChange(selected.id,e.target.value)}>
                  {PRESETS.filter(p=>p.kind===selected.kind).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <small>Changes the artwork, not the record or measurements.</small>
              </label>
              <label className="field">ROTATION (DEGREES)<MetricDraftInput key={selected.id} disabled={objectsLocked} label="Rotation in degrees" min={0} max={359} decimals={0} value={selected.rotation??0} onCommit={n=>onUpdateObject(selected.id,{rotation:n})} onNotice={onNotice}/></label>
            </div>
          </details>
          <details key={`notes-${selected.id}`} className="inspector-fold">
            <summary>NOTES & MAP PLACEMENT</summary>
            <div className="inspector-fold-body">
              <label className="field">NOTES<textarea rows={4} maxLength={3000} disabled={objectsLocked} value={selected.notes} onChange={e=>onUpdateObject(selected.id,{notes:e.target.value},'notes')}/></label>
              <div className="placement-box">SHARED POSITION: {selected.position?`${selected.position.x.toFixed(1)} m × ${selected.position.y.toFixed(1)} m`:'Not placed'}
                {!selected.position&&<button disabled={objectsLocked} className="btn btn-highlight" onClick={()=>onPlaceCenter(selected.id)}>PLACE AT CENTER</button>}
                {selected.position&&<button disabled={objectsLocked} className="btn btn-muted" onClick={()=>onUpdateObject(selected.id,{position:undefined})}>REMOVE FROM BOTH MAPS</button>}
              </div>
            </div>
          </details>
          <div className="inspector-actions"><button disabled={objectsLocked} className="btn btn-highlight" onClick={onDuplicate}>DUPLICATE</button><button disabled={objectsLocked} className="btn btn-danger" onClick={onDeleteObject}>DELETE</button></div>
          {(selected.kind==='tree'||selected.kind==='shrub'||selected.kind==='flower')&&<details key={`atlas-${selected.id}`} className="inspector-fold inspector-atlas-fold">
            <summary>PLANT ATLAS · PHOTOS & HISTORY</summary>
            <div className="inspector-fold-body">
              <PlantAtlasPanel garden={garden} objectId={selected.id} disabled={objectsLocked||Boolean(garden.linkMigration&&!garden.linkMigration.confirmed)} onNotice={onNotice}
                onChange={onAtlasChange}/>
            </div>
          </details>}
        </>:selectedGroup?<>
          <div className="inspector-compact-header inspector-group-header"><div className="inspector-group-icon">▦</div>
            <div className="inspector-compact-title"><strong>{selectedGroup.name}</strong><span>{selectedGroup.id} · {garden.objects.filter(x=>x.groupId===selectedGroup.id).length} members</span></div>
            <button type="button" className="inspector-map-link" onClick={onMap}>⌖ MAP</button>
          </div>
          <label className="field">GROUP NAME<NameDraftInput key={selectedGroup.id} label="Group name" value={selectedGroup.name} maxLength={120} onCommit={name=>onRenameGroup(selectedGroup.id,name)} onNotice={onNotice}/></label>
          <label className="field">GROUP NOTES<textarea maxLength={3000} value={selectedGroup.notes} onChange={e=>onGroupNotes(selectedGroup.id,e.target.value)}/></label>
          <p className="panel-hint">Drag any member on the map to move the entire group. Both views remain linked.</p>
          <div className="group-list">{garden.objects.filter(o=>o.groupId===selectedGroup.id).map(o=><button key={o.id} className="group-entry" onClick={()=>onSelectObject(o.id)}><ObjectIcon kind={o.kind} presetId={o.presetId} size={25}/>{o.name}</button>)}</div>
          <button disabled={objectsLocked} className="btn btn-danger" onClick={()=>onDeleteGroup(selectedGroup.id)}>DELETE GROUP · KEEP ITEMS</button>
        </>:<p className="empty-inspector">Tap an item on the map or select one from OBJECTS to edit its shared record.</p>}
        <div className="section-heading list-heading">MAP DIMENSIONS</div>
        <p className="panel-hint">Workspace: {garden.width} × {garden.height} m · Property outline: {polygonArea(garden.layout.boundary).toFixed(1)} m² (approximate).</p>
        <button className="btn btn-muted inspector-map-size-link" onClick={onMapSettings}>OPEN MAP SIZE SETTINGS ↑</button>
      </aside>

  );
}
