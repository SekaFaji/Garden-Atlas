import type { Garden } from '../model';
import { ObjectIcon } from './ObjectIcon';

export type Alignment = 'left' | 'right' | 'top' | 'bottom' | 'horizontal' | 'vertical';

interface Props {
  garden: Garden;
  selectedId: string | null;
  selectedGroupId: string | null;
  checkedIds: string[];
  multiSelect: boolean;
  newGroupName: string;
  onSelectObject: (id: string) => void;
  onCheckObject: (id: string, checked: boolean) => void;
  onToggleMultiSelect: () => void;
  onSelectAllPlaced: () => void;
  onClearSelection: () => void;
  onAlign: (direction: Alignment) => void;
  onDeleteSelected: () => void;
  onNewGroupName: (name: string) => void;
  onCreateGroup: () => void;
  onAssignGroup: (groupId: string | null) => void;
  onSelectGroup: (id: string) => void;
}

const ALIGNMENTS: { id: Alignment; name: string }[] = [
  { id: 'left', name: '◧ LEFT' }, { id: 'right', name: '◨ RIGHT' },
  { id: 'top', name: '▔ TOP' }, { id: 'bottom', name: '▁ BOTTOM' },
  { id: 'horizontal', name: '↔ SPACE X' }, { id: 'vertical', name: '↕ SPACE Y' },
];

/** Existing object list, batch actions, and group controls. App owns every edit. */
export function GardenObjectList({ garden, selectedId, selectedGroupId, checkedIds, multiSelect,
  newGroupName, onSelectObject, onCheckObject, onToggleMultiSelect, onSelectAllPlaced,
  onClearSelection, onAlign, onDeleteSelected, onNewGroupName, onCreateGroup,
  onAssignGroup, onSelectGroup }: Props) {
  return <>
    <div className="section-heading list-heading">02 / GARDEN ITEMS <span className="pill">{garden.objects.length}</span></div>
    <div className="item-list">{garden.objects.map(object => <div key={object.id} className="object-row">
      <button className={`object-entry ${selectedId === object.id ? 'active' : ''}`} onClick={() => onSelectObject(object.id)}>
        <ObjectIcon kind={object.kind} presetId={object.presetId} size={28}/>
        <span>{object.name}<small>{object.id} {object.position ? '●' : '○'}</small></span>
      </button>
      <label title={`Select ${object.name} for grouping`} className="batch-check">
        <input type="checkbox" aria-label={`Batch-select ${object.name}`} checked={checkedIds.includes(object.id)} onChange={e => onCheckObject(object.id, e.target.checked)}/>
      </label>
    </div>)}</div>
    <div className="batch-editor" aria-label="Multi-object editor">
      <button className={`btn ${multiSelect ? 'btn-highlight' : 'btn-muted'}`} aria-pressed={multiSelect} onClick={onToggleMultiSelect}>◩ {multiSelect ? 'MULTI SELECT ON' : 'MULTI SELECT'}</button>
      <button className="btn btn-muted" onClick={onSelectAllPlaced}>SELECT ALL PLACED</button>
      <button className="btn btn-muted" onClick={onClearSelection} disabled={!checkedIds.length}>CLEAR</button>
      {checkedIds.length > 0 && <>
        <span>{checkedIds.length} selected · drag any selected item to move the set</span>
        <div className="alignment-grid">{ALIGNMENTS.map(action => <button key={action.id} className="btn btn-muted" onClick={() => onAlign(action.id)}>{action.name}</button>)}</div>
        <button className="btn btn-danger" onClick={onDeleteSelected}>DELETE SELECTED</button>
      </>}
    </div>
    <div className="section-heading list-heading">03 / GROUPS <span className="pill">{garden.groups.length}</span></div>
    <div className="group-create"><input aria-label="New group name" value={newGroupName} onChange={e => onNewGroupName(e.target.value)} maxLength={120} placeholder="Group name" onKeyDown={e => { if (e.key === 'Enter') onCreateGroup(); }}/><button className="btn btn-highlight" onClick={onCreateGroup}>+</button></div>
    {checkedIds.length > 0 && <div className="batch-actions">
      <span>{checkedIds.length} selected</span>
      <select aria-label="Assign selected items to group" defaultValue="choose" onChange={e => { if (e.target.value !== 'choose') onAssignGroup(e.target.value === 'none' ? null : e.target.value); }}>
        <option value="choose">ASSIGN TO...</option><option value="none">UNGROUP</option>
        {garden.groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
      </select>
      <button className="btn btn-muted" onClick={onClearSelection}>CLEAR</button>
    </div>}
    <div className="group-list">{garden.groups.map(group => <button className={`group-entry ${selectedGroupId === group.id ? 'active' : ''}`} key={group.id} onClick={() => onSelectGroup(group.id)}>
      <span>▦</span><span>{group.name}<small>{garden.objects.filter(object => object.groupId === group.id).length} members</small></span>
    </button>)}</div>
  </>;
}
