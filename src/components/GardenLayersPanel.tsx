import type { Garden } from '../model';
import type { FeatureSelection } from '../featureEdit';
import { MetricDraftInput } from '../MetricDraftInput';

export type LayerKey = 'objects' | 'regions' | 'lines' | 'boundary';
export type LayerState = Record<LayerKey, boolean>;

interface Props {
  garden: Garden;
  visibility: LayerState;
  locked: LayerState;
  onVisibilityChange: (layer: LayerKey, visible: boolean) => void;
  onToggleLayerLock: (layer: LayerKey) => void;
  onEditFeature: (feature: FeatureSelection) => void;
  onDeleteRegion: (id: string) => void;
  onRenameLine: (id: string, name: string) => void;
  onChangeLineWidth: (id: string, widthM: number) => void;
  onDeleteLine: (id: string) => void;
  onNotice: (message: string) => void;
}

const LAYERS: { key: LayerKey; label: string }[] = [
  { key: 'objects', label: 'Plants & structures' },
  { key: 'regions', label: 'Terrain regions' },
  { key: 'lines', label: 'Paths & fences' },
  { key: 'boundary', label: 'Property outline' },
];

/** Layer display and feature list only; App owns locks, mutations and navigation. */
export function GardenLayersPanel({ garden, visibility, locked, onVisibilityChange, onToggleLayerLock,
  onEditFeature, onDeleteRegion, onRenameLine, onChangeLineWidth, onDeleteLine, onNotice }: Props) {
  return <>
    <div className="section-heading list-heading">04 / LAYERS</div>
    <div className="layer-list">{LAYERS.map(layer => <div className="layer-control" key={layer.key}>
      <label><input type="checkbox" checked={!visibility[layer.key]} onChange={e => onVisibilityChange(layer.key, e.target.checked)}/>{layer.label}</label>
      <button className={`layer-lock ${locked[layer.key] ? 'locked' : ''}`} aria-pressed={locked[layer.key]} aria-label={`${locked[layer.key] ? 'Unlock' : 'Lock'} ${layer.label}`} onClick={() => onToggleLayerLock(layer.key)}>
        {locked[layer.key] ? '🔒 LOCKED' : '🔓 EDIT'}
      </button>
    </div>)}</div>
    <p className="panel-hint">Layer locks prevent changes in this editing session; visibility affects display only. Both views share the same garden.</p>
    <div className="section-heading list-heading">05 / TERRAIN AREAS & LINES</div>
    <div className="terrain-list">{garden.layout.regions.map(region => <div className="terrain-entry" key={region.id}>
      <button className="feature-pick" onClick={() => onEditFeature({kind:'region',id:region.id})}>{region.name} · {region.id} · EDIT POINTS</button>
      <button disabled={locked.regions} title="Delete terrain region" onClick={() => onDeleteRegion(region.id)}>×</button>
    </div>)}</div>
    <div className="terrain-list">{garden.layout.lines.map(line => <div className="line-entry" key={line.id}>
      <button className="feature-pick" onClick={() => onEditFeature({kind:'line',id:line.id})}>✎ EDIT POINTS</button>
      <input disabled={locked.lines} aria-label={`Name of ${line.id}`} maxLength={120} value={line.name} onChange={e => onRenameLine(line.id, e.target.value)}/>
      <label>WIDTH M<MetricDraftInput key={line.id} disabled={locked.lines} label={`${line.name} width in metres`} min={0.2} max={12} value={line.widthM} onCommit={widthM => onChangeLineWidth(line.id, widthM)} onNotice={onNotice}/></label>
      <button disabled={locked.lines} className="btn btn-danger" title="Delete path or fence" onClick={() => onDeleteLine(line.id)}>×</button>
    </div>)}</div>
  </>;
}
