import { useState } from 'react';
import { KINDS, type Kind } from '../model';
import { PRESETS, findPresets, defaultPreset } from '../catalog';
import type { Tool } from '../MapView';
import { ObjectIcon } from './ObjectIcon';

const CATEGORY_ICONS = ['✥', '✿', '♣', '▤', '⌂', '◆', '≈', '▣'];

interface Props {
  activeTool: Tool;
  activePresetId: string;
  locked: boolean;
  onActivatePreset: (presetId: string) => void;
}

/** The catalog owns only its filter UI. App still decides which object to place. */
export function ObjectCatalog({ activeTool, activePresetId, locked, onActivatePreset }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Kind | 'all'>('all');
  const matches = findPresets(search, filter);

  return <>
    <div className="section-heading">01 / OBJECT LIBRARY</div>
    <p className="panel-hint">Choose an item, then tap repeatedly to place. Switch to SELECT to drag it.</p>
    <div className="palette-grid">
      {KINDS.map((category, index) => <button
        key={category.kind}
        className={`palette-item ${activeTool === category.kind ? 'active' : ''}`}
        onClick={() => onActivatePreset(defaultPreset(category.kind).id)}
      >
        <ObjectIcon kind={category.kind} presetId={defaultPreset(category.kind).id}/>
        <span>{category.label}</span><small>{CATEGORY_ICONS[index]}</small>
      </button>)}
    </div>
    <div className="section-heading list-heading">PIXEL-ART PRESETS <span className="pill">{PRESETS.length}</span></div>
    <div className="preset-filters">
      <input aria-label="Search garden objects" type="search" placeholder="Search trees, ponds, furniture…"
        value={search} onChange={event => setSearch(event.target.value)}/>
      <select aria-label="Filter object category" value={filter}
        onChange={event => setFilter(event.target.value as Kind | 'all')}>
        <option value="all">ALL CATEGORIES</option>
        {KINDS.map(category => <option key={category.kind} value={category.kind}>{category.label}</option>)}
      </select>
    </div>
    <div className="preset-grid" aria-label="Garden object presets">
      {matches.map(preset => <button
        key={preset.id}
        className={`preset-button ${activeTool === preset.kind && activePresetId === preset.id ? 'active' : ''}`}
        aria-pressed={activeTool === preset.kind && activePresetId === preset.id}
        disabled={locked}
        onClick={() => onActivatePreset(preset.id)}
      >
        <ObjectIcon kind={preset.kind} presetId={preset.id} size={34}/>
        <span>{preset.name}</span><small>{preset.diameterM} m starting size</small>
      </button>)}
      {matches.length === 0 && <p className="panel-hint">No presets match this search.</p>}
    </div>
  </>;
}
